const express = require('express');
const router = express.Router();
const request = require('request');
const common = require('./common');
const mailer = require('../utils/mailer');
const aw = require('./async_wrap');
const svg_builder = require('../utils/label_builder.js');
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
    const pumps = await req.Pumps.find({
        participant: req.params.id
    }).sort({
        basic_model: 1,
        individual_model: 1
    }).lean().exec();

    req.log.debug("Rendering participant pumps page for administrative portal");
    res.render("admin/a_pumps", {
        user: req.user,
        pumps: pumps,
        participant: participant,
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

    res.render("admin/a_circulators", {
        user: req.user,
        circulators: circulators,
        participant: participant
    });
}));


router.get('/participant/:id/pumps/:pump_id', aw(async (req, res) => {
    const participant = await req.Participants.findById(req.params.id).exec();
    const pump = await req.Pumps.findById(req.params.pump_id).lean().exec();
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
    if (req.query.download) {
        res.setHeader('Content-disposition', 'attachment; filename=Energy Rating Label - ' + pump.rating_id + '.svg');
    }
    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(svg);
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