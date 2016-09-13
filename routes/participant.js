const express = require('express');
const passport = require('passport');
const router = express.Router();

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
        participant : req.participant
    });
});

router.get('/purchase', function(req, res) {
    req.log.debug("Rendering participant portal (purchase)");
    res.render("participant/purchase", {
        user : req.user,
        participant : req.participant
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

const common = require('./common');
router.post("/api/users/delete/:id", common.deleteUser);
router.post("/api/users/add", common.addUser)

module.exports = router;