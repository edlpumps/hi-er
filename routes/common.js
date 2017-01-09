"use strict";
var units = require('../utils/uom');
var mailer = require('../utils/mailer');

exports.deleteUser = function(req, res) {
    req.Users.findOne({_id: req.params.id}, function(err, user){
        if ( err ) {
            req.log.debug("Error getting user to delete");
            req.log.debug(err);
            res.status(500).send({error:err});
        }
        else if (!user ) {
            res.status(200).send("User doesn't exist");
        }
        else if (!req.user.admin && !user.participant.equals(req.participant._id)) {
            req.log.info("Deletion attempt on user from another participating org");
            req.log.info(req.participant._id);
            req.log.info(user.participant);
            res.status(403).send("Cannot delete user from another participating organization");
        }
        else if (req.user.admin && !user.admin) {
            req.log.info("Deletion attempt by administrator on participant user");
            res.status(403).send("Cannot delete user from a participating organization");
        }
        else if (!req.user.admin && !req.user.participant_admin) {
            req.log.info("Deletion attempt by unauthorized user");
            res.status(403).send("Cannot delete user unless you are a HI or Participant administrator");
        }
        else {
            req.Users.remove({_id:req.params.id}, function(err) {
                if ( err ) {
                    req.log.debug("Error removing user");
                    req.log.debug(err);
                    res.status(500).send({error:err});
                }
                else {
                    mailer.sendDeletionNotification(user, req.user);

                    res.status(200).send("User removed");
                }
            })
        }
    });
};

exports.addUser = function(req, res) {

    if ( !req.user.admin && !req.user.participant_admin) {
        req.log.info("Add user attempted by unauthorized user");
        res.status(403).send("Cannot add user unless you are a HI or Participant administrator");
        return;
    }
    // New user only needs name and email address.  
    // An activation link will be generated and will be in the response.
    var uuid = require('uuid');
    var user = new req.Users();
    user.name = req.body.user.name;
    user.email = req.body.user.email;
    user.participant = req.participant ? req.participant._id : undefined;
    user.needsActivation = true;
    user.admin = req.user.admin;
    if (!user.admin) {
        user.participant_admin = req.body.user.participant_admin;
        user.participant_edit = req.body.user.participant_edit;
        user.participant_view = req.body.user.participant_view;
    }
    user.activationKey = uuid.v1();
    
    if ( !user.name || !user.name.first || !user.name.last) {
        res.status(400).send("User must have first and last name");
        return;
    }
    
    var validator = require("email-validator");
    if (!user.email || !validator.validate(user.email)) {
        res.status(400).send("User must have valid email address");
        return;
    }

    req.Users.find({email: user.email}, function(err, users){
        if ( users && users.length > 0) {
            res.status(400).send("User already exists");
            return;
        }
        user.save(function(err, saved) {
            if ( err) {
                res.status(500).send({error:err});
            }
            else {
                mailer.sendAuthenticationEmail(req.base_url, user, req.user);
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ user: saved}));
            }
        });
    })
};


exports.saveUser = function(req, res) {
    if ( !req.user.admin && !req.user.participant_admin) {
        req.log.info("Save user attempted by unauthorized user");
        res.status(403).send("Cannot save user unless you are a HI or Participant administrator");
        return;
    }
    var user = req.body.user;
    req.Users.update({email: user.email}, 
        {$set : {name : user.name, participant_admin:user.participant_admin, participant_edit:user.participant_edit}},
        function(err, users){
            if ( err) {
            res.status(500).send({error:err});
            }
            else {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ user: user}));
            }
        });
}
exports.labs = function(req, res) {
    req.Labs.find(
        {}, 
        function(err, labs){
            if ( err ) {
                res.status(500).send({ error: err });
            }
            else {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ labs: labs}));
            }
        }
    )
}

exports.map_boolean_input = function(input) {
    if (input) {
        var entered = input.toLowerCase();
        // yes, y, true, T
        if ( entered.indexOf("y") >= 0 || entered.indexOf("t") >= 0) return true;
    }
    return false;
}
exports.map_boolean_output = function(value) {
    return value ? "Yes" : "No";
}
exports.map_config_input = function(input) {
    /*
    Bare pump
    Bare pump + motor
    Bare pump + motor + continuous control
    Bare pump + motor + non-continuous control
    */
    var result = "bare";
    if ( input.toLowerCase().indexOf("non") >= 0) {
        result = "pump_motor_nc";
    }
    else if (input.toLowerCase().indexOf("contin") >= 0) {
        result = "pump_motor_cc";
    }
    else if (input.toLowerCase().indexOf("motor") >= 0) {
        result = "pump_motor";
    }
    return result;
}
exports.map_config_output = function(value) {
    if (value == "bare") return "Bare pump";
    else if (value == "pump_motor") return "Bare pump + motor";
    else if (value == "pump_motor_cc") return "Bare pump + motor + continuous control";
    else if (value == "pump_motor_nc") return "Bare pump + motor + non-continuous control";
    else return null;
}

exports.build_pump_spreadsheet = function(pump, unit_set, callback) {
    const _ = require('lodash');
    const template = require('./template_map.json');
    const path = require('path');
    const tmp = require('tmp');
    const fs = require('fs');
    const Excel = require('exceljs');

    var workbook = new Excel.Workbook();
    workbook.xlsx.readFile(path.join(__dirname, template.config.filename))
        .then(function() {
            var pumps = [];
            if (pump instanceof Array) {
                pumps = pump;
            }
            else {
                pumps.push(pump);
            }

            var r = template.config.first_row;
            var worksheet = workbook.getWorksheet(1);

            var unit_row = template.config.unit_row;
            for ( var mapping in template.mappings ) {
                var prop = template.mappings[mapping];
                if ( prop.unit ) {
                    var address = prop.column + unit_row;
                    var cell = worksheet.getCell(address);
                    cell.value = units.labels[prop.unit][unit_set];
                }
            }
            
            pumps.forEach(function(p) {
                if ( unit_set == units.METRIC) {
                    // pumps are stored internally in US units.
                    p = units.convert_to_metric(p);
                }
                for ( var mapping in template.mappings ) {
                    var prop = template.mappings[mapping];
                    var enabled = true;
                    var value = _.get(p, prop.path);
                    if ( prop.bep120 ) {
                        // this property is dependent on whether the pump is tested @120BEP
                        if ( prop.bep120 == "no" && p.load120) {
                            enabled = false;
                        }
                        else if (prop.bep120 == "yes" && !p.load120){
                            enabled = false;
                        }
                    }
                    if ( prop.path2 && !p.load120) {
                        // this property gets pulled from an alternative path if pump is tested @ 120 BEP
                        value = _.get(p, prop.path2);
                    }
                    if (mapping =="configuration") {
                        value = exports.map_config_output(value);
                    }
                    if ( prop.boolean) {
                        value = exports.map_boolean_output(value);
                    }
                    
                    if ( prop.sections ) {
                        enabled = enabled && prop.sections.indexOf(p.section) >= 0;
                    } 
                    
                    if ( enabled && value) {
                        var address = prop.column + r;
                        var cell = worksheet.getCell(address);
                        if ("format" in prop){
                            cell.numFmt= prop.format
                            var v = parseFloat(value);
                            if ( !isNaN(v) ) {
                                value = v;
                            }
                            cell.value = value;
                        }
                        else {
                            cell.value = value;
                        }
                        
                    }
                }
                r++;
            });

            tmp.file(function(err, path, fd, cleanupCallback) {
                if (err) throw err;
                workbook.xlsx.writeFile(path).then(function() {
                    callback(null, path, cleanupCallback);
                    
                });
            }, {postfix:".xlsx"});




        });



   

    

    

    

    /*
    var toxl = require('jsonexcel');


    // Cleanup the pump schema
    if (pump.configuration === "bare"){
        pump.motor_regulated = undefined;
    }

    var filter = function(key) {
        return  !( key == "_id" 
            || key == "active_admin" 
            || key == "listed"
            || key == "load120"
            || key.startsWith("results")) 
    }

    var headers = {
        "section" : "Calculation Section", 
        "energy_rating" : "Energy Rating",
        "energy_savings" : "Energy Savings", 
        "participant" : "Participant",
        "configuration" : "Configuration", 
        "basic_model" : "Basic Model Designation", 
        "diameter" : "Impeller Diameters (inches)", 
        "speed" : "Nominal Speed of Rotation (rpm)", 
        "stages" : "Stages", 
        "laboratory": "HI Approved testing laboratory", 
        "doe" : "Department of Energy Category", 
        "pei" : "Pump Energy Index", 

        "bowl_diameter" : "Pump Bowl Diameter",
        "motor_regulated" : "Is Motor Regulated under 10 CFR?",
        "motor_power_rated" : "Motor Power or  Nameplate Rated Motor Power",
        "motor_efficiency" : "Nominal Motor Efficiency",

        "head.bep75": "Head @ 75% BEP Flow (feet)",
        "head.bep100": "Head @ 100% BEP Flow (feet)",
        "head.bep110": "Head @ 110% BEP Flow (feet)",
        "flow.bep75": "Flow @ 75% BEP Flow (gpm)",
        "flow.bep100": "Flow @ 100% BEP Flow (gpm)",
        "flow.bep110": "Flow @ 110% BEP Flow (gpm)",

        "pump_input_power.bep75": "Pump input power @ 75% BEP flow rate",
        "pump_input_power.bep100": "Pump input power @ 100% BEP flow rate",
        "pump_input_power.bep110": "Pump input power @ 110% BEP flow rate",
        "pump_input_power.bep120": "Pump input power @ 120% BEP flow rate",
        
        "driver_input_power.bep75": "Driver input power @ 75% BEP flow rate",
        "driver_input_power.bep100": "Driver input power @ 100% BEP flow rate",
        "driver_input_power.bep110": "Driver input power @ 110% BEP flow rate",
        "driver_input_power.bep120": "Driver input power @ 120% BEP flow rate",
        
        "control_power_input.bep25": "Control input power @ 25% BEP flow rate",
        "control_power_input.bep50": "Control input power @ 50% BEP flow rate",
        "control_power_input.bep75": "Control input power @ 75% BEP flow rate",
        "control_power_input.bep100": "Control input power @ 100% BEP flow rate",
        
        "measured_control_power_input.bep25": "Measured control input power @ 25% BEP flow rate",
        "measured_control_power_input.bep50": "Measured control input power @ 50% BEP flow rate",
        "measured_control_power_input.bep75": "Measured control input power @ 75% BEP flow rate",
        "measured_control_power_input.bep100": "Measured control input power @ 100% BEP flow rate",

        "measured_control_flow_input.bep25": "Measured control flow @ 25% BEP flow rate",
        "measured_control_flow_input.bep50": "Measured control flow @ 50% BEP flow rate",
        "measured_control_flow_input.bep75": "Measured control flow @ 75% BEP flow rate",
        "measured_control_flow_input.bep100": "Measured control flow @ 100% BEP flow rate",
        
        "measured_control_head_input.bep25": "Measured control head @ 25% BEP flow rate",
        "measured_control_head_input.bep50": "Measured control head @ 50% BEP flow rate",
        "measured_control_head_input.bep75": "Measured control head @ 75% BEP flow rate",
        "measured_control_head_input.bep100": "Measured control head @ 100% BEP flow rate",

    }

    var opts = {
        sheetname : "Pump Energy Ratings",
        pivot:true, 
        filter : filter,
        headings : headers
    }
    var buffer = toxl(pump, opts);
    return buffer;
    */
    return null;
}

exports.section_label = function(section) {
      if (!section) return undefined;
      switch(section) {
          case "3":
            return "Section III";
          case "4":
            return "Section IV";
          case "5":
            return "Section V";
          case "6a":
            return "Section VI-a";
          case "6b":
            return "Section VI-b";
          case "7":
            return "Section VII";
          default:
            return undefined;
      }
  }

