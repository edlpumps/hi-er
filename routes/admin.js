const express = require('express');
const router = express.Router();
const request = require('request');
const common = require('./common');
const mailer = require('../utils/mailer');
const aw = require('./async_wrap');
const svg_builder = require('../utils/label_builder.js');
const fs = require('fs');
const Circulator = require('../controllers/circulator');
const lang = require('../utils/language');
module.exports = router;

// All resources served from here are restricted to administrators.
router.use(function (req, res, next) {
    if (req.user && req.user.admin) {
        next();
    } else {
        req.flash("loginMessage", "You must be logged in as an HI Administrator to access this resource");
        res.redirect("/");
    }
});


router.get('/', function (req, res) {
    res.render("admin/a_home", {
        user: req.user
    });
});



router.get('/labels', function (req, res) {
    req.Labels.find({}, function (err, labels) {
        res.render("admin/a_labels", {
            user: req.user,
            labels: labels
        });
    });

});

router.get('/participants', function (req, res) {
    req.log.debug("Rendering administration portal - participants page");
    res.render("admin/a_participants", {
        user: req.user,
    });
});
router.get('/labs', function (req, res) {
    req.log.debug("Rendering administration portal - labs page");
    res.render("admin/a_labs", {
        user: req.user,
    });
});

router.get('/participant/:id', aw(async (req, res) => {
    req.log.debug("Rendering participant info page for administrative portal");
    const participant = await req.Participants.findById(req.params.id).exec();
    if (!participant) {
        req.log.error(err);
        req.flash("errorTitle", "Not found");
        req.flash("errorMessage", "This participant does not exist.");
        res.redirect("/error");
        return;
    }
    req.log.debug("Lookup of participant succeeded - " + participant.name);
    const users = await req.Users.find({
        participant: req.params.id
    }).exec();
    res.render("admin/a_participant", {
        user: req.user,
        participant: participant,
        users: users
    });

    /*
    const response_handler = async () => {
        const users = await req.Users.find({
            participant: req.params.id
        }).exec();
        res.render("admin/a_participant", {
            user: req.user,
            participant: participant,
            users: users
        });
    }

    if (process.env.ESTORE_OVERRIDE) {
        participant.subscription.status = 'Active';
        participant.subscription.pumps = 10000;
        participant.subscription.circulator = {
            status: "Active"
        }
        await participant.save();
        return response_handler();
    }
    // refresh estore status
    const options = {
        url: process.env.ESTORE_URL + "/" + participant._id,
        headers: {
            authorization: 'Bearer ' + process.env.ESTORE_AUTH_KEY
        }
    };

    const callback = async (error, response, body) => {
        var subscription = {
            status: "No Account",
            pumps: 0
        }
        if (!error) {
            var info = JSON.parse(body);
            subscription.status = info.status || "No Account";
            subscription.pumps = info.pumps || "0";
            participant.subscription = subscription;
        }
        await participant.save();
        response_handler();
    }
    request(options, callback);
    */

}));




router.get('/participant/:id/delete', function (req, res) {
    req.Participants.findById(req.params.id, function (err, participant) {
        if (err) {
            req.log.error(err);
            req.flash("errorTitle", "Internal application error");
            req.flash("errorMessage", "Database lookup (participant) failed.");
            res.redirect("/error");
            return;
        }
        if (participant) {
            req.log.debug("Lookup of participant succeeded - " + participant.name);
            res.render("admin/a_participant_delete", {
                user: req.user,
                participant: participant
            });
        } else {
            req.log.error(err);
            req.flash("errorTitle", "Not found");
            req.flash("errorMessage", "This participant does not exist.");
            res.redirect("/error");
            return;
        }
    })
})

router.post('/participant/:id/delete', function (req, res) {
    if (req.body.confirm !== "DELETE COMPLETELY") {
        req.flash("errorTitle", "Cannot delete this participant as requested");
        req.flash("errorMessage", "You may have entered the text challenge incorrectly - please use your browser's back button to try again.");
        res.redirect("/error");
        return;
    }
    req.Participants.findByIdAndRemove(req.params.id, function (err) {
        if (err) {
            req.log.error(err);
            req.flash("errorTitle", "Cannot delete this participant as requested");
            req.flash("errorMessage", "Cannot delete this participant as requested.");
            res.redirect("/error");
            return;
        }

        req.Users.remove({
            participant: req.params.id
        }, function (err) {
            if (err) {
                req.log.error(err);
                req.flash("errorTitle", "Cannot delete this participant as requested");
                req.flash("errorMessage", "Cannot delete this participant as requested.");
                res.redirect("/error");
                return;
            }
            res.redirect("/admin/participants")
        })

    })
})

router.get('/participant/:id/pumps', aw(async (req, res) => {

    const participant = await req.Participants.findById(req.params.id).exec();
    const skip = parseInt(req.query.skip || 0);
    const limit = (req.query.limit ? Math.min(parseInt(req.query.limit), common.pump_query_limit) : common.pump_query_limit);
    const response = await req.Pumps.search(participant, req.query.search, parseInt(skip), parseInt(limit));

    //Set page language to english
    lang.set_page_language(req, res, 'en');
    req.log.debug("Rendering participant pumps page for administrative portal");
    res.render("admin/a_pumps", {
        user: req.user,
        pumps: response.pumps,
        participant: participant,
        pagination: {
            search: req.query.search,
            count: response.count,
            back: skip > 0 ? skip - limit : undefined,
            next: skip + limit < response.count ? skip + limit : undefined,
            range: {
                min: Math.min(skip + 1, response.count),
                max: Math.min(skip + limit, response.count)
            }
        },
        getConfigLabel: function (config) {
            switch (config) {
                case "bare":
                    return "Bare Pump";
                case "pump_motor":
                    return "Pump + Motor";
                case "pump_motor_cc":
                    return "Pump + Motor w/ Continuous Controls";
                case "pump_motor_nc":
                    return "Pump + Motor w/ Non-continuous Controls";
                default:
                    "N/A";
            }
        }
    });
}));


router.get('/participant/:id/circulators', aw(async (req, res) => {
    const participant = await req.Participants.findById(req.params.id).exec();
    const circulators = await req.Circulators.find({
        participant: req.params.id
    }).sort({
        basic_model: 1,
        manufacturer_model: 1
    }).lean().exec();

    //Set the page lang to english
    lang.set_page_language(req, res, 'en');
    res.render("admin/a_circulators", {
        user: req.user,
        circulators: circulators,
        participant: participant
    });
}));


router.get('/participant/:id/pumps/:pump_id', aw(async (req, res) => {
    const calculator = require('../calculator');
    const participant = await req.Participants.findById(req.params.id).exec();
    const pump = await req.Pumps.findById(req.params.pump_id).lean().exec();
    pump.cee_tier = calculator.calculate_pump_hp_group_and_tier(pump).cee_tier;
    pump.cee_tier = pump.cee_tier == "None" ? "" : pump.cee_tier;
    //Set page language to english
    lang.set_page_language(req, res, 'en');
    res.render("admin/a_pump", {
        user: req.user,
        participant: participant,
        pump: pump,
        pump_drawing: pump.doe ? pump.doe.toLowerCase() + ".png" : "",
        section_label: common.section_label
    });
}));
router.get('/participant/:id/circulators/:circulator_id', aw(async (req, res) => {
    const participant = await req.Participants.findById(req.params.id).exec();
    const circulator = await req.Circulators.findById(req.params.circulator_id).lean().exec();
    //Set page language to english
    lang.set_page_language(req, res, 'en');
    const calculator = require('../calculator');
    circulator.cee_tier = calculator.calculate_circ_watts_calc_group_and_tier(circulator).cee_tier;
    circulator.cee_tier = circulator.cee_tier == "None" ? "" : circulator.cee_tier;
    res.render("admin/a_circulator", {
        user: req.user,
        participant: participant,
        pump: circulator
        /*,
                pump_drawing: pump.doe ? pump.doe.toLowerCase() + ".png" : "",
                section_label: common.section_label*/
    });
}));

router.get('/participant/:id/circulators/:circulator_id/svg/label', aw(async (req, res) => {
    const pump = await req.Circulators.findById(req.params.circulator_id).populate('participant').exec();
    const svg = svg_builder.make_circulator_label(req, pump.participant, pump);
    res.setHeader('Content-disposition', 'attachment; filename=Energy Rating Label-' + pump.rating_id + '-('+lang.get_label_language()+').svg');
    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(svg);
}));
router.get('/participant/:id/circulators/:circulator_id/png/label', aw(async (req, res) => {
    const pump = await req.Circulators.findById(req.params.circulator_id).populate('participant').exec();
    const svg = svg_builder.make_circulator_label(req, pump.participant, pump);
    const png_buffer = svg_builder.svg_to_png(svg);
    res.setHeader('Content-disposition', 'attachment; filename=Energy Rating Label-' + pump.rating_id + '-('+lang.get_label_language()+').png');
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Length', png_buffer.length);
    res.status(200).send(png_buffer);
}));
router.get('/participant/:id/circulators/:circulator_id/svg/sm-label', aw(async (req, res) => {
    const pump = await req.Circulators.findById(req.params.circulator_id).populate('participant').exec();
    const svg = svg_builder.make_circulator_label_small(req, pump.participant, pump);
    res.setHeader('Content-disposition', 'attachment; filename=Energy Rating Label (sm) - ' + pump.rating_id + '.svg');
    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(svg);
}));
router.get('/participant/:id/circulators/:circulator_id/png/sm-label', aw(async (req, res) => {
    const pump = await req.Circulators.findById(req.params.circulator_id).populate('participant').exec();
    const svg = svg_builder.make_circulator_label_small(req, pump.participant, pump);
    const png_buffer = svg_builder.svg_to_png(svg);
    res.setHeader('Content-disposition', 'attachment; filename=Energy Rating Label (sm) - ' + pump.rating_id + '.png');
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Length', png_buffer.length);
    res.status(200).send(png_buffer);
}));
router.get('/participant/:id/circulators/:circulator_id/svg/qr', aw(async (req, res) => {
    const pump = await req.Circulators.findById(req.params.circulator_id).populate('participant').exec();
    const svg = svg_builder.make_circulator_qr(req, pump.participant, pump);
    res.setHeader('Content-disposition', 'attachment; filename=Energy Rating QR - ' + pump.rating_id + '.svg');
    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(svg)
}));
router.get('/participant/:id/circulators/:circulator_id/png/qr', aw(async (req, res) => {
    const pump = await req.Circulators.findById(req.params.circulator_id).populate('participant').exec();
    const svg = svg_builder.make_circulator_qr(req, pump.participant, pump);
    const png_buffer = svg_builder.svg_to_png(svg);
    res.setHeader('Content-disposition', 'attachment; filename=Energy Rating QR - ' + pump.rating_id + '.png');
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Length', png_buffer.length);
    res.status(200).send(png_buffer);
}));

router.get('/participant/:id/circulators/:circulator_id/export', aw(async (req, res) => {
    const pump = await req.Circulators.findById(req.params.circulator_id).exec();
    if (!pump) {
        return res.sendStatus(404);
    }
    const file = await Circulator.export([pump], req.session.unit_set);
    res.download(file, 'Circulator Pump Listings.xlsx', function (err) {
        if (err) console.error(err);
        else fs.unlink(file, function () {
            console.log('Removed template');
        });
    });
}));


router.get('/participant/:id/pumps/:pump_id/download', aw(async (req, res) => {
    const pump = await req.Pumps.findById(req.params.pump_id).populate('participant').exec();
    const p = JSON.parse(JSON.stringify(pump));
    common.build_pump_spreadsheet(p, req.session.unit_set, function (error, file, cleanup) {
        res.download(file, 'Pump Listings.xlsx', function (err) {
            cleanup();
        });
    });
}));


router.post('/participant/:id/:type/:pump_id', aw(async (req, res) => {
    const participant = await req.Participants.findById(req.params.id).exec();
    const collection = req.params.type == 'pumps' ? req.Pumps : req.Circulators;
    const view = req.params.type == 'pumps' ? "admin/a_pump" : "admin/a_circulator";
    //Set page language to english
    lang.set_page_language(req, res, 'en');
    const pump = await collection.findById(req.params.pump_id).exec();
    pump.active_admin = req.body.active_admin ? true : false;
    pump.note_admin = req.body.note_admin;
    await pump.save();
    res.render(view, {
        user: req.user,
        participant: participant,
        pump: pump,
        pump_drawing: pump.doe ? pump.doe.toLowerCase() + ".png" : "",
        section_label: common.section_label
    });
}));


router.post("/participant/:id", function (req, res) {
    req.log.debug("Saving participant info administrative portal");
    req.Participants.findById(req.params.id, function (err, participant) {
        if (err) {
            req.log.error(err);
            req.flash("errorTitle", "Internal application error");
            req.flash("errorMessage", "Database lookup (participant) failed.");
            res.redirect("/error");
            return;
        }
        if (participant) {
            req.log.debug("Lookup of participant succeeded - saving data for" + participant.name);
            if (!req.body || !req.body.participant || !req.body.participant.active) {
                participant.active = false;
            } else {
                participant.active = true;
            }
            console.log(req.body);
            if (!req.body || !req.body.participant || !req.body.participant.status) {
                participant.subscription.status = "No Account";
            } else {
                participant.subscription.status = "Active";
            }

            if (!req.body || !req.body.participant || req.body.participant.pumps) {
                participant.subscription.pumps = req.body.participant.pumps;
            }

            if (!req.body || !req.body.participant || !req.body.participant.circ_status) {
                participant.subscription.circulator.status = "No Account";
            } else {
                participant.subscription.circulator.status = "Active";
            }

            console.log(JSON.stringify(participant.subscription, null, 2))
            participant.save(function (err, participant) {
                res.redirect("/admin/participants");
            })

            return;
        } else {
            req.log.error(err);
            req.flash("errorTitle", "Not found");
            req.flash("errorMessage", "This participant does not exist.");
            res.redirect("/error");
            return;
        }

    })
})

router.get("/sendactivation/:id", function (req, res) {
    req.Users.findOne({
        _id: req.params.id
    }, function (err, user) {
        mailer.sendAuthenticationEmail(req.base_url, user, req.user);
        res.render("admin/activation_sent", {
            user: req.user
        });
    });
})


router.get("/subscriber", function (req, res) {
    res.render("admin/a_subscribers", {
        user: req.user,
    });
})

router.get("/api/subscriber", function (req, res) {
    req.Subscribers.find({}, function (err, subs) {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
            subscribers: subs
        }));
    });
})

// add
router.put("/api/subscriber", function (req, res) {
    var sub = new req.Subscribers(req.body);

    sub.save(function (err) {
        if (err) {
            console.log(err);
            res.status(500).send();
        } else {
            res.status(200).send();
        }
    })
})
// edit
router.post("/api/subscriber", function (req, res) {
    var sub = req.body;

    req.Subscribers.update({
        _id: sub._id
    }, {
        $set: sub
    }, function (err, result) {
        if (err) {
            console.log(err);
            res.status(500).send();
        } else {
            console.log("Saved subscriber");
            console.log(sub);
            console.log(result)
            res.status(200).send();
        }
    })
})
router.delete("/api/subscriber/:id", function (req, res) {
    req.Subscribers.remove({
        _id: req.params.id
    }, function (err) {
        if (err) {
            console.log(err);
            res.status(500).send();
        } else {

            res.status(200).send();
        }
    });
})

router.post("/api/labels/", function (req, res) {
    req.log.debug("Saving labels - administrative portal");
    req.body.labels.filter(l => l.modified).forEach(function (label) {
        label.date = Date.now();
    })
    req.Labels.remove({}, function () {
        req.Labels.insertMany(req.body.labels, function (err, documents) {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
                labels: documents
            }));
        });

    });
})


router.get("/api/users", function (req, res) {
    req.log.debug("Returning user listings");
    req.Users.find({
        admin: true
    }, {
        name: true,
        email: true,
        _id: true,
        needsActivation: true,
        activationKey: true
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

router.get("/api/labs", common.labs);

router.get("/api/participants", aw(async (req, res) => {
    req.log.debug("Returning participant listings");
    let participants = await req.Participants.find({}).sort({
        name: 1
    }).lean().exec();
    participants = await req.Pumps.countsByParticipant(true, participants);
    participants = await req.Circulators.countsByParticipant(true, participants);
    res.json({
        participants: participants
    });
}));

router.post("/api/labs/add", function (req, res) {

    var newLab = req.body.lab;
    if (!newLab.code || !newLab.name) {
        req.log.info("Add lab attempted without code or name");
        res.status(403).send("Labs must have a lab number and name");
        return;
    }

    req.Labs.find({
        code: newLab.code
    }, function (err, labs) {
        if (labs && labs.length > 0) {
            res.status(400).send("Lab already exists");
            return;
        }
        var lab = new req.Labs(newLab);
        lab.save(function (err, saved) {
            if (err) {
                res.status(500).send({
                    error: err
                });
            } else {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({
                    lab: saved
                }));
            }
        });
    })
});

router.post("/api/labs/save", function (req, res) {
    var lab = req.body.lab;
    req.Labs.update({
        code: lab.code
    }, {
        $set: {
            name: lab.name,
            address: lab.address
        }
    },
        function (err, labs) {
            if (err) {
                res.status(500).send({
                    error: err
                });
            } else {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({
                    lab: lab
                }));
            }
        });
});

router.post("/api/labs/delete/:id", function (req, res) {
    req.Labs.findOne({
        _id: req.params.id
    }, function (err, lab) {
        if (err) {
            req.log.debug("Error getting lab to delete");
            req.log.debug(err);
            res.status(500).send({
                error: err
            });
        } else if (!lab) {
            res.status(200).send("Lab doesn't exist");
        } else {
            req.Labs.remove({
                _id: req.params.id
            }, function (err) {
                if (err) {
                    req.log.debug("Error removing lab");
                    req.log.debug(err);
                    res.status(500).send({
                        error: err
                    });
                } else {
                    res.status(200).send("Lab removed");
                }
            })
        }
    });
});

router.post("/api/users/delete/:id", common.deleteUser);
router.post("/api/users/add", common.addUser)

// // EXPORTS Testing
// // This was used to test the emailing of the Full & QPL spreadsheets
// // Files can be downloaded in the Available Downloads section of the Admin page.
// async function exportAsyncEmailHandler(req, res) {
//     var recipient = req.params.recipient;
//     let user = {admin: true};// Force admin for email export
//     if (!recipient) {
//         recipient = req.user.email;
//         user = { admin: false }; 
//     }
//     const exports = await exporter.create('all',user);
//     mailer.sendListings(recipient, exports.pumps.qpl, exports.circulators.qpl, exports.certificates.qpl, "qpl");
//     mailer.sendListings(recipient, exports.pumps.full, exports.circulators.full, exports.certificates.full, "full");
//     res.status(200).send("Email sent");
// };

// async function exportAsyncHandler(req, res) {
//     let type = "full";
//     // Find the endpoint
//     let which = req.path.split('/')[2];
//     if (req.params.type) {
//         type = req.params.type.toString();
//     }
//     const exports = await exporter.create(which,req.user);
//     res.setHeader('Content-disposition', 'attachment; filename='+which+'-'+type+'.xlsx');
//     res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
//     console.log('done');
//     return res.send(exports[which][type]);
// }

// router.get("/export/pumps/:type", exportAsyncHandler);
// router.get("/export/pumps", exportAsyncHandler);
// router.get("/export/circulators/:type", exportAsyncHandler);
// router.get("/export/circulators", exportAsyncHandler);
// router.get("/export/certificates/:type", exportAsyncHandler);
// router.get("/export/certificates", exportAsyncHandler);
// router.get("/export/email", exportAsyncEmailHandler);
// router.get("/export/email/:recipient", exportAsyncEmailHandler);
