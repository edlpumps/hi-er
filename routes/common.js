"use strict";
var units = require('../utils/uom');
var mailer = require('../utils/mailer');
const moment = require('moment');



exports.deleteUser = function (req, res) {
    req.Users.findOne({
        _id: req.params.id
    }, function (err, user) {
        if (err) {
            req.log.debug("Error getting user to delete");
            req.log.debug(err);
            res.status(500).send({
                error: err
            });
        } else if (!user) {
            res.status(200).send("User doesn't exist");
        } else if (!req.user.admin && !user.participant.equals(req.participant._id)) {
            req.log.info("Deletion attempt on user from another participating org");
            req.log.info(req.participant._id);
            req.log.info(user.participant);
            res.status(403).send("Cannot delete user from another participating organization");
        } else if (req.user.admin && !user.admin) {
            req.log.info("Deletion attempt by administrator on participant user");
            res.status(403).send("Cannot delete user from a participating organization");
        } else if (!req.user.admin && !req.user.participant_admin) {
            req.log.info("Deletion attempt by unauthorized user");
            res.status(403).send("Cannot delete user unless you are a HI or Participant administrator");
        } else {
            req.Users.remove({
                _id: req.params.id
            }, function (err) {
                if (err) {
                    req.log.debug("Error removing user");
                    req.log.debug(err);
                    res.status(500).send({
                        error: err
                    });
                } else {
                    mailer.sendDeletionNotification(user, req.user);

                    res.status(200).send("User removed");
                }
            })
        }
    });
};

exports.addUser = function (req, res) {

    if (!req.user.admin && !req.user.participant_admin) {
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

    if (!user.name || !user.name.first || !user.name.last) {
        res.status(400).send("User must have first and last name");
        return;
    }

    var validator = require("email-validator");
    if (!user.email || !validator.validate(user.email)) {
        res.status(400).send("User must have valid email address");
        return;
    }
    var regex = new RegExp("^" + user.email + "$", "i");
    req.Users.find({
        email: regex
    }, function (err, users) {
        if (users && users.length > 0) {
            res.status(400).send("User already exists");
            return;
        }
        user.save(function (err, saved) {
            if (err) {
                res.status(500).send({
                    error: err
                });
            } else {
                mailer.sendAuthenticationEmail(req.base_url, user, req.user);
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({
                    user: saved
                }));
            }
        });
    })
};


exports.saveUser = function (req, res) {
    if (!req.user.admin && !req.user.participant_admin) {
        req.log.info("Save user attempted by unauthorized user");
        res.status(403).send("Cannot save user unless you are a HI or Participant administrator");
        return;
    }
    var user = req.body.user;
    var regex = new RegExp("^" + user.email + "$", "i");
    req.Users.update({
            email: regex
        }, {
            $set: {
                name: user.name,
                participant_admin: user.participant_admin,
                participant_edit: user.participant_edit
            }
        },
        function (err, users) {
            if (err) {
                res.status(500).send({
                    error: err
                });
            } else {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({
                    user: user
                }));
            }
        });
}
exports.labs = function (req, res) {
    req.Labs.find({},
        function (err, labs) {
            if (err) {
                res.status(500).send({
                    error: err
                });
            } else {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({
                    labs: labs
                }));
            }
        }
    )
}

function energy_savings_const(is_pump) {
    let retval= 7.457 * (is_pump ? parseFloat(process.env.LABELS_PUMP_ANNUAL_RUN_HRS) : parseFloat(process.env.LABELS_CIRC_ANNUAL_RUN_HRS)) / 1000;
    return retval;
}

exports.calculate_energy_savings = function (er, hp_waip, is_pump=true) {
    let e_const = energy_savings_const(is_pump);
    var e_savings = parseFloat(er * hp_waip * e_const);
    e_savings = Math.round(e_savings);
    var e_string = exports.add_commas(e_savings);
    return {value: e_savings, string: e_string}
}

exports.calculate_cost_savings = function (er, hp_waip,is_pump=true) {
    let e_const = energy_savings_const(is_pump);
    let c_savings = parseFloat((er * hp_waip * e_const * parseFloat(process.env.LABELS_COST_PER_KWH)).toFixed(2));
    let c_string = "";
    if (is_pump) {
        c_savings = Math.round(c_savings);
        c_string = exports.add_commas(c_savings);
    }
    else {
        // round to 2 decimal places
        c_string = c_savings.toString();
        // Get commas for the first part of the string
        c_string = c_string.split(".");
        c_string[0] = exports.add_commas(c_string[0]);
        c_string = c_string.join(".");
    }
    return {value: c_savings, string: c_string}
}

exports.add_commas = function (value) {
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

exports.map_boolean_input = function (input) {
    if (input) {
        var entered = input.toLowerCase();
        // yes, y, true, T
        if (entered.indexOf("y") >= 0 || entered.indexOf("t") >= 0) return true;
    }
    return false;
}
exports.map_boolean_output = function (value) {
    return value ? "Yes" : "No";
}
exports.map_config_input = function (input) {
    /*
    Bare pump
    Bare pump + motor
    Bare pump + motor + continuous control
    Bare pump + motor + non-continuous control
    */
    var result = "bare";
    if (input.toLowerCase().indexOf("non") >= 0) {
        result = "pump_motor_nc";
    } else if (input.toLowerCase().indexOf("contin") >= 0) {
        result = "pump_motor_cc";
    } else if (input.toLowerCase().indexOf("motor") >= 0) {
        result = "pump_motor";
    }
    return result;
}
exports.map_config_output = function (value) {
    if (value == "bare") return "Bare pump";
    else if (value == "pump_motor") return "Bare pump + motor";
    else if (value == "pump_motor_cc") return "Bare pump + motor + continuous control";
    else if (value == "pump_motor_nc") return "Bare pump + motor + non-continuous control";
    else return null;
}

exports.map_type_input = function (input) {
    /*
    Polyphase Electric Motor
    Single-Phase Induction Motor
    Inverter Only Synchronous Electric Motor
    */
    var result = null;
    if (!input) { return null; }
    if (input.toLowerCase().indexOf("single") >= 0) {
        result = "single_induction";
    } else if (input.toLowerCase().indexOf("inverter") >= 0) {
        result = "inverter_electric";
    } else if (input.toLowerCase().indexOf("poly") >= 0) {
        result = "poly_electric";
    }
    return result;
}
exports.map_type_output = function (value) {
    if (value == "poly_electric") return "Polyphase Electric Motor";
    else if (value == "single_induction") return "Single-Phase Induction Motor";
    else if (value == "inverter_electric") return "Inverter Only Synchronous Electric Motor";
    else return null;
}

exports.build_pump_spreadsheet = function (pump, unit_set, callback) {
    const _ = require('lodash');
    const template = require('./template_map.json');
    const path = require('path');
    const tmp = require('tmp');
    const fs = require('fs');
    const Excel = require('exceljs');
    var workbook = new Excel.Workbook();
    workbook.xlsx.readFile(path.join(__dirname, template.config.filename))
        .then(function () {
            var pumps = [];
            if (pump instanceof Array) {
                pumps = pump;
            } else {
                pumps.push(pump);
            }

            var r = template.config.first_row;
            var worksheet = workbook.getWorksheet(1);

            var unit_row = template.config.unit_row;
            for (var mapping in template.mappings) {
                var prop = template.mappings[mapping];
                if (prop.unit) {
                    var address = prop.column + unit_row;
                    var cell = worksheet.getCell(address);
                    try {
                        cell.value = units.labels[prop.unit][unit_set];
                    } catch (ex) {
                        cell.value = prop.unit;
                    }
                }
            }

            pumps.forEach(function (p) {
                if (unit_set == units.METRIC) {
                    // pumps are stored internally in US units.
                    p = units.convert_to_metric(p);
                }
                for (var mapping in template.mappings) {
                    var prop = template.mappings[mapping];
                    var enabled = true;
                    var value = _.get(p, prop.path);

                    var use_result_path = p.calculator && (p.section == '3' || p.section == '5' || p.section == '7');

                    if (use_result_path && prop.calc_path) {
                        value = _.get(p, prop.calc_path);
                    }
                    var load120 = false;
                    if (p.load120) {
                        load120 = p.load120 === true || p.load120 == 'true';
                    }
                    if (prop.bep120) {
                        // this property is dependent on whether the pump is tested @120BEP
                        if (prop.bep120 == "no" && load120) {
                            enabled = false;
                        } else if (prop.bep120 == "yes" && !load120) {
                            enabled = false;
                        }
                    }
                    if ((prop.path2 || use_result_path && prop.calc_path2) && !p.load120) {
                        // this property gets pulled from an alternative path if pump is tested @ 120 BEP
                        value = _.get(p, prop.path2);
                        if (use_result_path && prop.calc_path2) {

                            value = _.get(p, prop.calc_path2);
                        }
                    }
                    if (mapping == "configuration") {
                        value = exports.map_config_output(value);
                    }

                    if (mapping == "listing_date") {
                        value = moment(value).format("MMM D, YYYY")
                    }

                    if (mapping == "listing_status") {
                        value = p.listed ? "Active" : (p.pending ? "Pending" : "Inactive");
                    }

                    if (mapping == "motor_type") {
                        value = exports.map_type_output(value);
                    }

                    if (mapping == "annual_energy_savings") {
                        let savings = exports.calculate_energy_savings(p.energy_rating, p.motor_power_rated);
                        value = savings.string;
                    }
                    if (mapping == "annual_cost_savings"){
                        let savings = exports.calculate_cost_savings(p.energy_rating, p.motor_power_rated);
                        value = "$" + savings.string;
                    }

                    if (prop.boolean) {
                        value = exports.map_boolean_output(value);
                    }

                    if (prop.sections) {
                        enabled = enabled && prop.sections.indexOf(p.section) >= 0;
                    }

                    if (enabled && value) {
                        var address = prop.column + r;
                        var cell = worksheet.getCell(address);
                        if ("format" in prop) {
                            cell.numFmt = prop.format
                            var v = parseFloat(value);
                            if (!isNaN(v)) {
                                value = v;
                            }
                            cell.value = value;
                        } else if ("text" in prop) {
                            cell.numFmt = "@";
                            cell.value = value;
                        } else {
                            cell.value = value;
                        }
                        if ("align" in prop) {
                            cell.alignment = {
                                horizontal: prop.align
                            }
                        }   
                    }
                }
                r++;
            });

            tmp.file(function (err, path, fd, cleanupCallback) {
                if (err) throw err;
                workbook.xlsx.writeFile(path).then(function () {
                    callback(null, path, cleanupCallback);

                });
            }, {
                postfix: ".xlsx"
            });

        });
    return null;
}

exports.section_label = function (section) {
    if (!section) return undefined;
    switch (section) {
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