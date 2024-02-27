"use strict";
const express = require('express');
const passport = require('passport');
const router = express.Router();
const common = require('./common');
const units = require('../utils/uom');
const Hashids = require('hashids');
const hashids = new Hashids("hydraulic institute", 6, 'ABCDEFGHIJKLMNPQRSTUVWXYZ123456789');
const ObjectId = require('mongodb').ObjectID;
const Excel = require('exceljs');
const tmp = require('tmp');
const _ = require('lodash');
const async = require('async');
const request = require('request');
const aw = require('./async_wrap');

// All resources served from here are restricted to participants.
router.use(function (req, res, next) {
    if (req.user && req.user.participant) {
        req.app.locals.db.Participants.findById(req.user.participant).exec(function (err, participant) {
            req.participant = participant;
            if (err) {
                req.log.debug("Error adding participant");
                req.log.debug(err);
                res.redirect("/");
            } else {
                if (participant.active) {
                    next();
                } else {
                    req.logout();
                    res.redirect("/disabled");
                }
            }
        });
    } else {
        req.flash("loginMessage", "You must be logged in as an HI Participant to access this resource");
        res.redirect("/");
    }
});


router.get('/', aw(async (req, res) => {
    var no_store = function () {
        req.log.error("ESTORE_URL or ESTORE_AUTH_KEY is missing in the environment variables - cannot poll estore!");
        req.flash("errorTitle", "E-Store unavailable");
        req.flash("errorMessage", "The Hydraulic Institute E-Store is currently down, your subscription cannot be validated.  Please check back again soon, we are very sorry for the inconvenience");
        res.redirect("/error");
        req.logout();
    }


    const listed = await req.Pumps.count({
        participant: req.participant._id,
        // listed: true
    }).exec()

    res.render("participant/p_home", {
        user: req.user,
        participant: req.participant,
        listed: listed
    });
    console.log("Skipped E-store consultation");
    /*
    const response_handler = () => {
        res.render("participant/p_home", {
            user: req.user,
            participant: req.participant,
            listed: listed
        });
    }

    if (process.env.ESTORE_OVERRIDE) {
        req.participant.subscription.status = 'Active';
        req.participant.subscription.pumps = 10000;
        req.participant.subscription.circulator = {
            status: "Active"
        }
        await req.participant.save();
        return response_handler();
    }

    if (!process.env.ESTORE_URL || !process.env.ESTORE_AUTH_KEY) {
        no_store();
        return;
    }

    const options = {
        url: process.env.ESTORE_URL + "/" + req.participant._id,
        headers: {
            authorization: 'Bearer ' + process.env.ESTORE_AUTH_KEY
        }
    };

    console.log("Contacting ESTORE")
    console.log(JSON.stringify(options, null, 2));



    function callback(error, response, body) {
        const subscription = {
            status: "No Account",
            pumps: 0,
            circulator: {
                status: "No Account"
            }
        }
        if (!error) {
            const info = JSON.parse(body);
            console.log("-----------------------------------------");
            console.log("---  E-Store Response -------------------");
            console.log(JSON.stringify(info, null, 2));
            console.log("-----------------------------------------");
            if (info.circulator) {
                subscription.circulator.status = info.circulator.status || "No Account";
            }
            subscription.status = info.status || "No Account";
            subscription.pumps = info.pumps || "0";
        } else {
            console.log(error);
            no_store();
            return;
        }
        req.participant.subscription = subscription;
        req.participant.save();
        // save the new subscription information in the participant
        response_handler();

    }

    request(options, callback);
    */

}));


router.get('/template', function (req, res) {
    const template = require('./template_map.json');
    var path = require('path');
    var fs = require('fs');
    var filePath = path.join(__dirname, template.config.filename);
    var stat = fs.statSync(filePath);

    res.writeHead(200, {
        'Content-Type': 'application/vnd.openxmlformats',
        'Content-Disposition': "attachment; filename=" + "Pump Energy Ratings.xlsx",
        'Content-Length': stat.size
    });
    var readStream = fs.createReadStream(filePath);
    readStream.pipe(res);
})


router.get('/users', function (req, res) {
    if (!req.user.participant_admin) {
        req.log.info("View Users attempted by unauthorized user");
        req.log.info(req.user);
        res.redirect("/unauthorized");
        return;
    }
    req.log.debug("Rendering participant portal (users)");
    res.render("participant/p_users", {
        user: req.user,
        participant: req.participant
    });
});

router.get('/labs', function (req, res) {
    if (!req.user.participant_admin) {
        req.log.info("View Labs attempted by unauthorized user");
        req.log.info(req.user);
        res.redirect("/unauthorized");
        return;
    }
    req.log.debug("Rendering participant portal (labs)");
    res.render("participant/p_labs", {
        user: req.user,
        participant: req.participant
    });
});



router.get('/pumps', aw(async (req, res) => {
    req.log.debug("Rendering participant portal (pumps)");
    const published = await req.Pumps.count({
        participant: req.participant._id,
        limit: true
    });

    res.render("participant/p_pumps", {
        user: req.user,
        participant: req.participant,
        section_label: common.section_label,
        subscription_limit: published >= req.participant.subscription.pumps,
        subscription_missing: req.participant.subscription.status != 'Active',
        pump_search_query: req.session.pump_search_query
    });
}));



router.get("/pumps/new", aw(async (req, res) => {
    if (!req.user.participant_edit) {
        req.log.info("New pump attempted by unauthorized user");
        req.log.info(req.user);
        res.redirect("/unauthorized");
        return;
    }
    const published = await req.Pumps.count({
        participant: req.participant._id,
        listed: true
    }).exec();
    if (published >= req.participant.subscription.pumps) {
        req.flash("errorTitle", "Subscription limit");
        req.flash("errorMessage", "You cannot list additional pumps until you've updated your subscription level.");
        res.redirect("/error");
        return;
    }
    var pump = {
        load120: true,
        speed: 3600,
        stages: 1
    }


    pump.configuration = {
        value: "bare"
    };

    pump.motor_type = {
        value: "single_induction"
    };


    var help = require("../public/resources/help.json");
    res.render("participant/new_pump", {
        user: req.user,
        participant: req.participant,
        pump: pump,
        help: help
    });
}));

router.get("/pumps/:id/revise", aw(async (req, res) => {
    if (!req.user.participant_edit) {
        req.log.info("Revise pump attempted by unauthorized user");
        req.log.info(req.user);
        res.redirect("/unauthorized");
        return;
    }
    let pump = await req.Pumps.findById(req.params.id).exec();
    pump = JSON.parse(JSON.stringify(pump));
    if (req.session.unit_set == units.METRIC) {
        // pumps are stored internally in US units.
        pump = units.convert_to_metric(pump);
    }
    pump.configuration = {
        value: pump.configuration
    };
    pump.motor_type = {
        value: pump.motor_type
    };
    var help = require("../public/resources/help.json");
    res.render("participant/new_pump", {
        user: req.user,
        participant: req.participant,
        pump: pump,
        help: help,
        revision: true
    });
}));

router.post("/pumps/:id/revise", aw(async (req, res) => {
    if (!req.user.participant_edit) {
        req.log.info("Create pump attempted by unauthorized user");
        req.log.info(req.user);
        res.redirect("/unauthorized");
        return;
    }
    let pump = req.body;
    if (!pump) {
        req.flash("errorTitle", "Internal application error");
        req.flash("errorMessage", "Pump cannot be created - required information is missing.");
        res.redirect("/error");
        return;
    }
    if (req.session.unit_set == units.METRIC) {
        pump = units.convert_to_us(pump);
    }
    const lab = await req.Labs.findOne({
        _id: pump.laboratory
    }).exec();
    if (!lab) {
        req.flash("errorTitle", "Internal application error");
        req.flash("errorMessage", "Pump cannot be created - invalid laboratory.");
        res.redirect("/error");
        return;
    }
    pump.laboratory = lab;
    delete pump._id;

    const original = await req.Pumps.findById(req.params.id).lean().exec();



    pump = Object.assign(original, pump);
    if (req.session.unit_set == units.METRIC) {
        // pumps are stored internally in US units.
        pump = units.convert_to_metric(pump);
    }
    var view = pump.pei_input_type == 'calculate' ? "participant/calculate_pump" : "participant/manual_pump";
    var help = require("../public/resources/help.json");
    res.render(view, {
        user: req.user,
        participant: req.participant,
        pump: pump,
        help: help,
        revision: true
    });

}));


router.post("/pumps/new", aw(async (req, res) => {
    if (!req.user.participant_edit) {
        req.log.info("Create pump attempted by unauthorized user");
        req.log.info(req.user);
        res.redirect("/unauthorized");
        return;
    }

    var pump = req.body;
    if (!pump) {
        req.flash("errorTitle", "Internal application error");
        req.flash("errorMessage", "Pump cannot be created - required information is missing.");
        res.redirect("/error");
        return;
    }
    const lab = await req.Labs.findOne({
        _id: pump.laboratory
    }).exec();

    if (!lab) {
        req.flash("errorTitle", "Internal application error");
        req.flash("errorMessage", "Pump cannot be created - invalid laboratory.");
        res.redirect("/error");
        return;
    }
    const nextId = await req.getNextRatingsId();
    pump.laboratory = lab;
    pump.participant = req.participant._id;
    pump.rating_id = hashids.encode(nextId.value.seq);
    pump.motor_type_name = common.map_type_output(pump.motor_type);
    const view = pump.pei_input_type == 'calculate' ? "participant/calculate_pump" : "participant/manual_pump";
    const help = require("../public/resources/help.json");
    res.render(view, {
        user: req.user,
        participant: req.participant,
        pump: pump,
        help: help
    });
}));

router.get("/pumps/upload", function (req, res) {
    const template = require('./template_map.json');
    req.log.debug("Rendering participant pump upload");
    res.render("participant/upload", {
        user: req.user,
        participant: req.participant,
        template: {
            version: template.config.version,
            revision_date: template.config.revision_date
        }
    });
})

router.post("/pumps/save_upload", aw(async (req, res) => {
    if (!req.user.participant_edit) {
        req.log.info("Submit pump attempted by unauthorized user");
        req.log.info(req.user);
        res.redirect("/unauthorized");
        return;
    }
    var pumps = JSON.parse(req.body.pumps);
    for (const pump of pumps) {
        let list_now = req.body.list_pumps ? true : false;
        const check = await model_check(req, pump, req.participant, pumps);
        // list_now could be true, based on user request, but we
        // may need to override that choice, based on subscription or 
        // model number collision.
        if (!check.ok) {
            list_now = false;
        }
        pump.date = new Date();
        pump.pending = !list_now;
        pump.listed = list_now;
        pump.participant = req.participant._id;
        if (pump.brand) pump.brand = pump.brand.trim();
        if (pump.basic_model) pump.basic_model = pump.basic_model.trim();
        if (pump.individual_model) pump.individual_model = pump.individual_model.trim();
        // Ignore what's in the spreadsheet - the participant name attached to the pump
        // must always be the currently logged in participant.

        const toSave = new req.Pumps(pump);
        toSave.revisions.push({
            date: new Date(),
            note: "Pump created.",
            correct: false
        })
        const nextId = await req.getNextRatingsId();
        toSave.rating_id = hashids.encode(nextId.value.seq);
        req.log.info(toSave.rating_id + " saved");

        await toSave.save();
    }
    res.redirect("/participant/pumps");

}));


var find_lab = function (imported, labs) {
    console.log(imported, labs.map(l => l.code));
    if (!imported || !imported.code) return undefined;
    var found = labs.filter(function (lab) {
        return lab.code == imported.code || lab.name == imported.code;
    });
    if (found.length > 0) return found[0];
    else return undefined;
}

var map_doe = function (input) {
    if (!input) return undefined;
    input = String(input);
    var does = ["ESCC", "ESFM", "IL", "RSV", "ST"];
    var index = does.indexOf(input.toUpperCase());
    if (index >= 0) return does[index];
    else return undefined;
}

var get_labels = function (req, res, next) {
    req.Labels.find({}, function (err, labels) {
        req.current_labels = labels;
        next();
    });
}

router.post("/pumps/upload", get_labels, aw(async (req, res) => {
    if (!req.files || !req.files.template) {
        res.send('No files were uploaded.');
        return;
    }
    var workbook = new Excel.Workbook();

    // Load all the laboratories for this participant
    const labs = await req.Labs.find({
        _id: {
            $in: req.participant.labs
        }
    }).exec();
    await workbook.xlsx.readFile(req.files.template.file);
    const pumps_succeeded = [];
    const pumps_failed = [];
    const template = require('./template_map.json');
    var r = template.config.first_row;
    var worksheet = workbook.getWorksheet(1);
    var first_cell = null;
    var done = false;
    while (!done) {
        first_cell = worksheet.getCell(template.mappings.basic_model.column + r)

        if (first_cell.value) {
            var pump = {}
            pump.row = r;
            var load120Cell = worksheet.getCell(template.mappings.bep120.column + r);
            var load120 = common.map_boolean_input(load120Cell.value);

            for (var mapping in template.mappings) {
                var prop = template.mappings[mapping];
                var cell = worksheet.getCell(prop.column + r);
                var value = cell.value;
                if (value && value.trim) value = value.trim();
                var enabled = true;
                if (mapping == "configuration") {
                    value = common.map_config_input(cell.value);
                }
                if (mapping == "motor_type") {
                    value = common.map_type_input(cell.value);
                }
                if (prop.boolean) {
                    value = common.map_boolean_input(cell.value);
                }
                if (prop.bep120) {
                    if (prop.bep120 == "no" && load120) {
                        enabled = false;
                    } else if (prop.bep120 == "yes" && !load120) {
                        enabled = false;
                    }
                }
                if (enabled && !prop.output_only) {
                    if (prop.path2 && !load120) {
                        // this property gets pulled from an alternative path if pump is tested @ 120 BEP
                        _.set(pump, prop.path2, value);
                    } else {
                        _.set(pump, prop.path, value);
                    }
                }
            }

            // strip out driver/control if not used.
            if (!pump.driver_input_power.bep100) {
                delete pump.driver_input_power;
            }
            if (!pump.control_power_input.bep100) {
                delete pump.control_power_input;
            }
            if (pump.flow && load120) {
                pump.flow.bep75 = pump.flow.bep100 * 0.75;
                pump.flow.bep110 = pump.flow.bep100 * 1.1;
            } else if (pump.flow && !load120) {
                pump.flow.bep75 = pump.flow.bep110 * 0.65;
                pump.flow.bep100 = pump.flow.bep110 * 0.9;
            }


            pump.unit_set = req.session.unit_set;
            pump = units.convert_to_us(pump);

            var calculator = require("../calculator");
            var results = calculator.calculate(pump, req.current_labels);
            pump.results = results;

            pump.active_admin = results.active_admin;
            pump.note_admin = results.note_admin;

            pump.energy_rating = pump.results.energy_rating;
            pump.energy_savings = pump.results.energy_savings;
            // Change requested by HI - 12/21/2018.
            // Instead of using pei_baseline, always use 1.
            pump.pei_baseline = 1 /*pump.results.pei_baseline*/;
            delete pump.results.pump;

            pump.laboratory = find_lab(pump.laboratory, labs);
            pump.doe = map_doe(pump.doe.trim());
            pump.participant = req.participant._id;
            if (pump.results.success && !pump.doe) {
                pump.results.success = false;
                if (!pump.results.reasons) pump.results.reasons = [];
                pump.results.reasons.push("The pump must have a recognized DOE category.")
            }

            if (pump.results.success && !pump.laboratory) {
                pump.results.success = false;
                if (!pump.results.reasons) pump.results.reasons = [];
                pump.results.reasons.push("The laboratory specified for this pump is not one of your organization's active HI Laboratories.")
            }

            if (pump.results.success) {
                const mcheck = await model_check(req, pump, req.participant, pumps_succeeded);
                if (!mcheck.ok && !pump.pending_reasons) pump.pending_reasons = [];
                if (mcheck.individual_collide) {
                    pump.pending_reasons.push("This pump cannot be listed because there is already a pump listed with individual model number " + pump.individual_model)
                }
                if (mcheck.basic_collide) {
                    pump.pending_reasons.push("This pump cannot be listed because there are already pump(s) listed under this basic model (" + pump.basic_model + ") with a conflicting Energy Rating value")
                }
            }

            if (pump.results.success) {
                pumps_succeeded.push(pump);
            } else {
                pumps_failed.push(pump)
            }
            r++;
            console.log(pump);
        } else {
            done = true;
        }
    }
    res.render("participant/upload_confirm", {
        user: req.user,
        participant: req.participant,
        succeeded: pumps_succeeded,
        failed: pumps_failed
    });



}));

router.get('/pumps/download', aw(async (req, res) => {
    const pumps = await req.Pumps.find({
        participant: req.participant._id
    }).populate('participant').lean().exec();

    common.build_pump_spreadsheet(pumps, req.session.unit_set, function (error, file, cleanup) {
        res.download(file, 'Pump Listings.xlsx', function (err) {
            cleanup();
        });
    });

}));

router.get('/pumps/:id', aw(async (req, res) => {
    req.log.debug("Rendering participant portal (pump id = " + req.params.id);

    var bd = req.params.id.slice(-3) == '-bd';
    if (bd) {
        req.params.id = req.params.id.slice(0,-3)
    }
    const pump = await req.Pumps.findOne({
        _id: req.params.id
    }).exec();
    const published = await req.Pumps.count({
        participant: req.participant._id,
        listed: true
    });

    var svg_builder = require('../utils/label_builder');
    var load = pump.configuration == "bare" || pump.configuration == "pump_motor" ? "CL" : "VL";

    const label = await req.Labels.findOne().and([{
        speed: pump.speed
    },
    {
        doe: pump.doe
    },
    {
        load: load
    }
    ]).exec();
    var qr_svg = svg_builder.make_qr(req, req.participant, pump, label);
    var label_svg = svg_builder.make_label(req, req.participant, pump, label);
    res.render("participant/p_pump", {
        user: req.user,
        backdoor: bd,
        subscription_limit: published >= req.participant.subscription.pumps,
        participant: req.participant,
        pump: pump,
        pump_drawing: pump.doe ? pump.doe.toLowerCase() + ".png" : "",
        section_label: common.section_label,
        can_activate: await model_check(req, pump, req.participant),
        label_svg: label_svg,
        qr_svg: qr_svg
    });

}));


router.get('/pumps/:id/download', aw(async (req, res) => {
    let pump = await req.Pumps.findById(req.params.id).populate('participant').lean().exec();
    pump = JSON.parse(JSON.stringify(pump));
    common.build_pump_spreadsheet(pump, req.session.unit_set, function (error, file, cleanup) {
        res.download(file, 'Pump Listings.xlsx', function (err) {
            cleanup();
        });
    });


}));





router.get('/purchase', function (req, res) {
    req.log.debug("Rendering participant portal (purchase)");
    res.render("participant/purchase", {
        user: req.user,
        participant: req.participant
    });
});





router.post("/pumps/submit", aw(async (req, res) => {
    if (!req.user.participant_edit) {
        req.log.info("Submit pump attempted by unauthorized user");
        req.log.info(req.user);
        res.redirect("/unauthorized");
        return;
    }
    var pump = req.body.pump;

    if (pump.results) {
        pump.results = JSON.parse(pump.results);
    }
    pump.laboratory = JSON.parse(pump.laboratory);
    pump = units.convert_to_us(pump);
    pump.date = new Date();
    pump.participant = req.participant._id;
    pump.pending = pump.listed;

    try {
        delete pump._id;
        const toSave = await req.Pumps.create(pump);
        toSave.revisions.push({
            date: new Date(),
            note: "Pump created",
            correction: false
        })

        toSave.pending = !toSave.listed;
        await toSave.save();
    } catch (ex) {
        console.log("Saving");
        console.log(JSON.stringify(ex, null, 2));
    }
    res.redirect("/participant/pumps");
}));
router.post("/pumps/:id/submitRevision", aw(async (req, res) => {
    if (!req.user.participant_edit) {
        req.log.info("Submit Revision pump attempted by unauthorized user");
        req.log.info(req.user);
        res.redirect("/unauthorized");
        return;
    }
    const old = await req.Pumps.findById(req.params.id).exec();
    let pump = req.body.pump;

    if (pump.results) {
        pump.results = JSON.parse(pump.results);
    }
    pump.laboratory = JSON.parse(pump.laboratory);
    pump = units.convert_to_us(pump);
    pump.date = new Date();

    // will retain the listed/pending status
    delete pump.listed;
    delete pump.pending;
    pump = Object.assign(old, pump);
    pump.date = new Date();
    pump.participant = req.participant._id;
    pump.revisions.push({
        note: req.body.revision_note,
        date: new Date()
    })

    const check = await model_check(req, pump, req.participant);
    if (!check.ok) {
        pump.listed = false;
    }
    delete pump._id;
    await req.Pumps.update({
        _id: req.params.id
    }, pump);
    res.redirect("/participant/pumps");
}));



router.post('/pumps/:id', aw(async (req, res) => {
    if (!req.user.participant_edit) {
        req.log.info("Save pump attempted by unauthorized user");
        req.log.info(req.user);
        res.redirect("/unauthorized");
        return;
    }
    const pump = await req.Pumps.findById(req.params.id).exec();
    if (pump) {
        pump.listed = req.body.listed_state == 'true'
        const check = await model_check(req, pump, req.participant);
        if (req.body.listed && !check.ok) {
            pump.listed = false;
        }
        if (pump.listed) pump.pending = false;
    }
    pump.save(function (err) {
        if (err) {
            req.log.error(err);
        }
        res.redirect("/participant/pumps");
    })
}));

const model_check = async (req, pump, participant, additional_pumps) => {
    // Cannot be above the subscription limit.

    let published = await req.Pumps.count({
        participant: participant._id,
        listed: true
    });
    if (additional_pumps) published += additional_pumps.length

    if (published >= participant.subscription.pumps) {
        return {
            subscription_limit: true,
            ok: false
        };
    }

    // Cannot share an individual model number with another active pump.
    let inds = await req.Pumps.count({
        participant: participant._id,
        individual_model: pump.individual_model,
        listed: true,
        rating_id: {
            $ne: pump.rating_id
        }
    });

    if (additional_pumps) {
        inds += additional_pumps.filter(
            p => p.individual_model == pump.individual_model &&
                p.listed &&
                p.rating_id != pump.rating_id).length;
    }

    if (inds > 0) {
        return {
            individual_collide: true,
            ok: false
        };
    }

    // Among all active pumps with the same basic model, there must be none that do not have the same er.
    let ers = await req.Pumps.count({
        participant: participant._id,
        basic_model: pump.basic_model,
        listed: true,
        energy_rating: {
            $ne: pump.energy_rating
        },
        rating_id: {
            $ne: pump.rating_id
        }
    });

    if (additional_pumps) {
        ers += additional_pumps.filter(
            p => p.basic_model == pump.basic_model &&
                p.listed &&
                p.energy_rating != pump.energy_rating &&
                p.rating_id != pump.rating_id).length;
    }

    if (ers > 0) {
        return {
            basic_collide: true,
            ok: false
        };
    }
    return {
        ok: true
    };
}

router.post("/api/model_check", function (req, res) {
    var newPump = req.body.pump;
    res.status(200).send(JSON.stringify(model_check(req, newPump, req.participant)));
});


router.get("/api/pumps", aw(async (req, res) => {
    const skip = req.query.skip || 0;
    const limit = req.query.limit && req.query.limit < 100 ? req.query.limit : 10;
    const response = await req.Pumps.search(req.participant, req.query.search, parseInt(skip), parseInt(limit));
    res.json(response);
}));

router.post("/api/pumps/delete/:id", aw(async (req, res) => {
    if (!req.user.participant_edit) {
        req.log.info("Delete pump attempted by unauthorized user");
        req.log.info(req.user);
        res.status(403).send("Cannot delete pump without edit role");
        return;
    }

    await req.Pumps.remove({
        _id: req.params.id,
        pending: true
    });
    res.status(200).send("Pump removed");
}));


router.post('/api/search', function (req, res) {
    req.session.pump_search_query = req.body.pump_search_query;
    res.status(200).send();
})

router.post('/api/settings', function (req, res) {
    req.log.debug("Saving participant settings");
    if (!req.user.participant_admin) {
        req.log.info("Save settings attempted by unauthorized user");
        req.log.info(req.user);
        res.status(403).send("Cannot set organization settings without admin role");
        return;
    }
    req.Participants.findById(req.participant._id, function (err, participant) {
        if (err) {
            re.log.error(err);
            res.status(500).send({
                error: err
            });
            return;
        } else if (participant) {
            participant.name = req.body.participant.name;
            participant.address = req.body.participant.address;
            participant.contact = req.body.participant.contact;
            participant.save(function (err) {
                if (err) {
                    re.log.error(err);
                    res.status(500).send({
                        error: err
                    });
                    return;
                } else {
                    req.log.debug("Saved participant settings successfully");
                    res.status(200).send("ok");
                }
            })
        } else {
            req.log.debug("Saved participant settings failed - couldn't find participant with ID " + req.participant._id);
            res.status(401).send({
                error: err
            });
            return;
        }
    });
});

router.post('/api/labs/:id', function (req, res) {
    if (!req.user.participant_admin) {
        req.log.info("Change Labs attempted by unauthorized user");
        req.log.info(req.user);
        res.status(403).send("Cannot set lab status without admin role");
        return;
    }
    var lab = req.params.id;
    var available = req.body.available;
    var existing = req.participant.labs.indexOf(lab);
    var changed = false;
    if (existing >= 0 && !available) {
        req.participant.labs.splice(existing, 1);
        changed = true;
    } else if (existing < 0 && available) {
        req.participant.labs.push(lab);
        changed = true;
    }

    var respond = function (err) {
        if (err) {
            console.log(err);
            res.status(500).send({
                error: err
            });
        } else {
            req.log.debug("Saved lab state successfully");
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
                labs: req.participant.labs
            }));
        }
    }

    changed ? req.participant.save(respond) : respond();
})

router.get("/api/active_labs", function (req, res) {
    req.log.debug("Returning participant labs");
    var list = req.participant.labs.map(lab => ObjectId(lab));
    req.Labs.find({
        '_id': {
            $in: list
        }
    }, function (err, docs) {
        if (err) {
            res.status(500).send({
                error: err
            });
        } else {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
                labs: docs
            }));
        }
    });
});

router.get("/api/users", function (req, res) {
    req.log.debug("Returning user listings for participating organization");
    req.Users.find({
        participant: req.participant._id
    }, {
        name: true,
        email: true,
        _id: true,
        needsActivation: true,
        activationKey: true,
        participant_admin: true,
        participant_edit: true,
        participant_view: true
    },
        function (err, users) {
            if (err) {
                res.status(500).send({
                    error: err
                });
            } else {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({
                    users: users
                }));
            }
        }
    )
});



const circulators = require("./circulator");
router.use('/circulators', circulators)
router.post("/api/users/delete/:id", common.deleteUser);
router.post("/api/users/add", common.addUser)
router.post("/api/users/save", common.saveUser)
router.get("/api/labs", common.labs);



module.exports = router;