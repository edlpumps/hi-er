const express = require('express');
const passport = require('passport');
const router = express.Router();
const common = require('./common');

// All resources served from here are restricted to participants.
router.use(function(req, res, next){
    if ( req.user && req.user.participant) {
        req.app.locals.db.Participants.findById(req.user.participant, function(err, participant) {
            req.participant = participant;
            if ( err ) {
                req.log.debug("Error adding participant");
                req.log.debug(err);
                res.redirect("/");
            }
            else {
                next();
            }
        });
    }
    else {
        req.flash("loginMessage", "You must be logged in as an HI Participant to access this resource");
        res.redirect("/");
    }
});


router.get('/', function(req, res) {
    req.log.debug("Rendering participant portal home");
    res.render("participant/p_home", {
        user : req.user,
        participant : req.participant
    });
});





router.get('/users', function(req, res) {
    req.log.debug("Rendering participant portal (users)");
    res.render("participant/p_users", {
        user : req.user,
        participant : req.participant
    });
});

router.get('/pumps', function(req, res) {
    req.log.debug("Rendering participant portal (pumps)");
    console.log(req.participant.pumps.map(function(p) {return p.listed}));
    res.render("participant/p_pumps", {
        user : req.user,
        participant : req.participant, 
        section_label :common.section_label
    });
});

router.get("/pumps/new", function(req, res){
    req.log.debug("Rendering participant new pump page");
    var pump = {
        load120 : true, 
        speed : 3600,
        stages : 1
    }
    res.render("participant/new_pump", {
        user : req.user,
        participant : req.participant, 
        pump : pump
    });
});

router.post("/pumps/new", function(req, res){
    var pump = req.body;
    if ( !pump ) {
        req.flash("errorTitle", "Internal application error");
        req.flash("errorMessage", "Pump cannot be created - required information is missing.");
        res.redirect("/error");
        return;
    }
    var view = pump.pei_input_type == 'calculate'  ? "participant/calculate_pump" : "participant/manual_pump";

    var toSave = req.participant.pumps.create(pump);
    req.participant.pumps.push(toSave);
    req.participant.save(function(err) {
        res.render(view, {
            user : req.user,
            participant : req.participant, 
            pump:toSave
        });
        console.log(toSave);
    })
});

router.get('/pumps/:id', function(req, res) {
    req.log.debug("Rendering participant portal (pump id = " + req.params.id);
    var pump = req.participant.pumps.id(req.params.id);
    res.render("participant/p_pump", {
        user : req.user,
        participant : req.participant, 
        pump : pump, 
        pump_drawing : pump.doe? pump.doe.toLowerCase() +  ".png" : ""   , 
        section_label : common.section_label
    });
});


router.get('/pumps/:id/download', function(req, res) {
    var pump = req.participant.pumps.id(req.params.id);
    pump= JSON.parse(JSON.stringify(pump));
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
        "pump_input_power.bep75": "Pump input power @ 75% BEP flow rate",
        "pump_input_power.bep100": "Pump input power @ 100% BEP flow rate",
        "pump_input_power.bep110": "Pump input power @ 110% BEP flow rate",
        "pump_input_power.bep120": "Pump input power @ 120% BEP flow rate",
        "head.bep75": "Head @ 75% BEP Flow (feet)",
        "head.bep100": "Head @ 100% BEP Flow (feet)",
        "head.bep110": "Head @ 110% BEP Flow (feet)",
        "flow.bep75": "Flow @ 75% BEP Flow (gpm)",
        "flow.bep100": "Flow @ 100% BEP Flow (gpm)",
        "flow.bep110": "Flow @ 110% BEP Flow (gpm)"
    }

    var opts = {
        sheetname : "Pump Energy Ratings",
        pivot:true, 
        filter : filter,
        headings : headers
    }
    var buffer = toxl(pump, opts);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats');
    res.setHeader("Content-Disposition", "attachment; filename=" + "Pump Energy Ratings.xlsx");
    res.setHeader('Content-Length', buffer.length);
    res.end(buffer);
});



router.get('/purchase', function(req, res) {
    req.log.debug("Rendering participant portal (purchase)");
    res.render("participant/purchase", {
        user : req.user,
        participant : req.participant
    });
});





router.post("/pumps/submit", function(req, res){
    console.log("Raw Body\n---------------------------");
    console.log(req.body);
    console.log("---------------------------");
    var pump = req.body.pump;
    console.log("Submitted pump\n---------------------------");
    console.log(pump._id);
    console.log(pump);
    console.log("---------------------------");
   
    // automatically set to listed - user can change this later.
    pump.listed = true;
   
    var saved = req.participant.pumps.id(pump._id);
    if (!saved) {
        req.flash("errorTitle", "Internal application error");
        req.flash("errorMessage", "Pump cannot be updated - it does not exist.");
        res.redirect("/error");
        return;
    }

    // remove the one that is there, add this one back...
    req.participant.pumps.id(pump._id).remove();
    var toSave = req.participant.pumps.create(pump);
    req.participant.pumps.push(toSave);
    req.participant.save(function(err) {
        res.redirect("/participant/pumps");
        console.log(toSave);
    })

    
});



router.post('/pumps/:id', function(req, res) {
    var pump = req.participant.pumps.id(req.params.id);
    console.log(pump);
    if ( pump ) {
        pump.listed = req.body.listed ? true : false;
    }
    req.participant.save(function(err){
        if ( err ) {
            req.log.error(err);
        }
        res.render("participant/p_pump", {
            user : req.user,
            participant : req.participant, 
            pump : pump, 
            pump_drawing : pump.doe? pump.doe.toLowerCase() +  ".png" : ""   , 
            section_label : common.section_label
        });
    })
    
});

router.get("/api/pumps", function(req, res) {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ pumps: req.participant.pumps}));
});

router.post("/api/pumps/delete/:id", function(req, res) {
    req.participant.pumps.id(req.params.id).remove();
    req.participant.save(function(err) {
        if ( err ) {
            req.log.debug("Error getting user to delete");
            req.log.debug(err);
            res.status(500).send({error:err});
        }
        else {
            res.status(200).send("Pump removed");
        }
    });
});

router.get("/pumps/upload", function(req, res){
    req.log.debug("Rendering participant pump upload");
    res.render("participant/upload", {
        user : req.user,
        participant : req.participant
    });
})


router.post('/api/settings', function(req, res) {
    req.log.debug("Saving participant settings");
    req.Participants.findById(req.participant._id, function(err, participant) {
        if ( err ) {
            re.log.error(err);
            res.status(500).send({ error: err });
            return;
        }
        else if ( participant) {
            participant.name = req.body.participant.name;
            participant.address = req.body.participant.address;
            participant.contact = req.body.participant.contact;
            participant.save(function(err) {
                if ( err ) {
                    re.log.error(err);
                    res.status(500).send({ error: err });
                    return;
                }
                else {
                    req.log.debug("Saved participant settings successfully");
                    res.status(200).send("ok");
                }
            })
        }
        else {
            req.log.debug("Saved participant settings failed - couldn't find participant with ID " + req.participant._id);
            res.status(401).send({ error: err });
            return;
        }
    });
});

router.get("/api/users", function(req, res) {
    req.log.debug("Returning user listings for participating organization");
    req.Users.find(
        {participant:req.participant._id}, 
        {name:true,email:true, _id:true, needsActivation:true, activationKey:true}, 
        function(err, users){
            if ( err ) {
                res.status(500).send({ error: err });
            }
            else {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ users: users}));
            }
        }
    )
});


router.post("/api/users/delete/:id", common.deleteUser);
router.post("/api/users/add", common.addUser)




module.exports = router;