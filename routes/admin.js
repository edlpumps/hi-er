const express = require('express');
const passport = require('passport');
const router = express.Router();

module.exports = router;

// All resources served from here are restricted to administrators.
router.use(function(req, res, next){
    if ( req.user && req.user.admin) {
        next();
    }
    else {
        req.flash("loginMessage", "You must be logged in as an HI Administrator to access this resource");
        res.redirect("/");
    }
});

router.get('/', function(req, res) {
    req.log.debug("Rendering administration portal");
    res.render("admin/a_home", {
        user : req.user,
    });
});

router.get('/participant/:id', function(req, res) {
    req.log.debug("Rendering participant info page for administrative portal");
    req.Participants.findById(req.params.id, function(err, participant){
        if ( err ) {
            req.log.error(err);
            req.flash("errorTitle", "Internal application error");
            req.flash("errorMessage", "Database lookup (participant) failed.");
            res.redirect("/error");
            return;
        }
        if ( participant) {
            req.log.debug("Lookup of participant succeeded - " + participant.name);
            res.render("admin/a_participant", {
                user : req.user,
                participant : participant
            });
        }
        else {
            req.log.error(err);
            req.flash("errorTitle", "Not found");
            req.flash("errorMessage", "This participant does not exist.");
            res.redirect("/error");
            return;
        }
        
    })
})

router.get('/participant/:id/pumps', function(req, res) {
    req.log.debug("Rendering participant pumps page for administrative portal");
    res.render("admin/a_pumps", {
        user : req.user
    });
})

router.post("/participant/:id", function(req, res) {
    req.log.debug("Saving participant info administrative portal");
    req.Participants.findById(req.params.id, function(err, participant){
        if ( err ) {
            req.log.error(err);
            req.flash("errorTitle", "Internal application error");
            req.flash("errorMessage", "Database lookup (participant) failed.");
            res.redirect("/error");
            return;
        }
        if ( participant) {
            req.log.debug("Lookup of participant succeeded - saving data for" + participant.name);
            participant.pumpLimit = req.body.participant.pumpLimit;
            participant.active = req.body.participant.active;
            console.log(req.body);
            participant.save(function(err, participant) {
                res.redirect("/");
            })
            
            return;
        }
        else {
            req.log.error(err);
            req.flash("errorTitle", "Not found");
            req.flash("errorMessage", "This participant does not exist.");
            res.redirect("/error");
            return;
        }
        
    })
})


router.get("/api/users", function(req, res) {
    req.log.debug("Returning user listings");
    req.Users.find(
        {admin:true}, 
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

router.get("/api/participants", function(req, res) {
    req.log.debug("Returning participant listings");
    req.Participants.find(
        {}, 
        function(err, participants){
            if ( err ) {
                res.status(500).send({ error: err });
            }
            else {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ participants: participants}));
            }
        }
    )
});


const common = require('./common');
router.post("/api/users/delete/:id", common.deleteUser);
router.post("/api/users/add", common.addUser)