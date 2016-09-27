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
            res.status(403).send("Cannot delete user from another participating organization");
        }
        else {
            req.Users.remove({_id:req.params.id}, function(err) {
                if ( err ) {
                    req.log.debug("Error removing user");
                    req.log.debug(err);
                    res.status(500).send({error:err});
                }
                else {
                    res.status(200).send("User removed");
                }
            })
        }
    });
};

exports.addUser = function(req, res) {
    // New user only needs name and email address.  
    // An activation link will be generated and will be in the response.
    var uuid = require('uuid');
    var user = new req.Users();
    user.name = req.body.user.name;
    user.email = req.body.user.email;
    user.participant = req.participant ? req.participant._id : undefined;
    user.needsActivation = true;
    user.admin = req.user.admin;
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
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ user: saved}));
            }
        });
    })
};

exports.build_pump_spreadsheet = function(pump) {
    var toxl = require('jsonexcel');

    var filter = function(key) {
        return  !( key == "_id" 
            || key == "active_admin" 
            || key == "listed"
            || key == "load120") 
    }

    var headers = {
        "section" : "Calculation Section", 
        "energy_rating" : "Energy Rating",
        "energy_savings" : "Energy Savings", 
        "participant" : "Organization",
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

