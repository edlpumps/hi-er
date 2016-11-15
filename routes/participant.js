const express = require('express');
const passport = require('passport');
const router = express.Router();
const common = require('./common');
const units = require('../utils/uom');
var Hashids = require('hashids');
var hashids = new Hashids("hydraulic institute", 6, 'ABCDEFGHIJKLMNPQRSTUVWXYZ123456789');

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
    res.render("participant/p_pumps", {
        user : req.user,
        participant : req.participant, 
        section_label :common.section_label, 
        subcription_limit :req.participant.pumps.length >= req.participant.pumpLimit
    });
});

router.get("/pumps/new", function(req, res){
    if ( req.participant.pumps.length >= req.participant.pumpLimit){
        req.flash("errorTitle", "Subscription limit");
        req.flash("errorMessage", "You cannot list additional pumps until you've updated your subscription level.");
        res.redirect("/error");
        return;
    }
    var pump = {
        load120 : true, 
        speed : 3600,
        stages : 1
    }

    
    pump.configuration = {value:"bare"};
    pump.laboratory = "TEST LAB"
    pump.basic_model = "PRE.SET.00";
    pump.doe = {value:"RSV"};
    pump.flow = {
            "bep75": 262.3,//72881355932,
            "bep100": 349.8,//30508474576,
            "bep110": 384.8,//13559322034
    }
    pump.head = {
       "bep75":498.8,//91123240448, 
       "bep100":424.4,//29761562769,
       "bep110":383.4//76012640046
    }
    pump.driver_input_power ={
            "bep75":52.8,//12, 
            "bep100":55.2,//03,
            "bep110":55.6,//20
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
    toSave.rating_id = req.nextRatingsId(function(err, doc) {
        toSave.rating_id = hashids.encode(doc.value.seq);
        res.render(view, {
                user : req.user,
                participant : req.participant, 
                pump:toSave
            });
    });
});

router.get("/pumps/upload", function(req, res){
    req.log.debug("Rendering participant pump upload");
    res.render("participant/upload", {
        user : req.user,
        participant : req.participant
    });
})
router.get('/pumps/download', function(req, res) {
    var pumps= JSON.parse(JSON.stringify(req.participant.pumps));

    var buffer = common.build_pump_spreadsheet(pumps);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats');
    res.setHeader("Content-Disposition", "attachment; filename=" + "Pump Energy Ratings - All.xlsx");
    res.setHeader('Content-Length', buffer.length);
    res.end(buffer);
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
    var buffer = common.build_pump_spreadsheet(pump);
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
    var pump = req.body.pump;
    if (pump.results ) {
        pump.results = JSON.parse(pump.results);
    }
    pump = units.convert_to_us(pump);
    pump.date = new Date();
    var toSave = req.participant.pumps.create(pump);
    req.participant.pumps.push(toSave);
    req.participant.save(function(err) {
        res.redirect("/participant/pumps");
    })
});



router.post('/pumps/:id', function(req, res) {
    var pump = req.participant.pumps.id(req.params.id);
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
    var pump = req.participant.pumps.id(req.params.id);
    if (pump) pump.remove();
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