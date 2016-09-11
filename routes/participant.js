const express = require('express');
const passport = require('passport');
const router = express.Router();

// All resources served from here are restricted to participants.
router.use(function(req, res, next){
    if ( req.user && req.user.participant) {
        req.log.debug("Attaching participant");
        req.app.locals.db.Participants.findById(req.user.participant, function(err, participant) {
            req.participant = participant;
            if ( err ) {
                req.log.debug("Error adding participant");
                req.log.debug(err);
                res.redirect("/");
            }
            else {
                req.log.debug("Added participant successfully");
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
    req.log.debug("Rendering participant portal");
    res.render("participant/p_home", {
        user : req.user,
        participant : req.participant
    });
});

module.exports = router;