const express = require('express');
const passport = require('passport');
const router = express.Router();

router.get('/', function(req, res) {
    // Check if a user is logged in, if so, redirect to the correct landing page - 
    // either participant portal or admin portal.
    // If not logged in, the landing page is the signin/signup page.
    req.log.debug("Serving landing page");
    if ( req.user && req.user.participant ) {
        req.log.debug("Participant is already logged in, redirecting to portal home");
        res.redirect("/participant");
    }
    else if ( req.user && req.user.admin) {
        req.log.debug("Admin is already logged in, redirecting to admin portal home");
        res.redirect("/admin");
    }
    else {
        res.render("landing", {});
    }
});


var missing_reg = function(user, participant, password) {
    var missing = [];
    if ( !user.name || !user.name.first || !user.name.last) missing.push("Name");
    if ( !user.email ) missing.push("Email address");
    if ( !user.password) missing.push("Password");
    if ( !participant || !participant.name) missing.push("Organization name");
    return missing;
}

var invalid_reg = function(user, participant, req, check_password) {
    var invalid = [];
    if ( check_password && (user.password != req.body.pswdconfirm)) {
        invalid.push("Passwords entered do not match");
    }
    return invalid
}

var check_similar_orgs = function(req, user, participant, callback) {
    var similar = [];
    var exact = [];
    var distance = require('jaro-winkler');
    req.app.locals.db.Participants.find({}, function(err, participants) {
        if ( err ) {
            callback(err);
            return;
        }
        participants.forEach(function(p){
            var sim = distance(participant.name.trim(), p.name, { caseSensitive: false });
            if ( sim >= 0.8 && sim < 1) {
                similar.push(p.name);
                req.log.debug("Similarity between " + participant.name + " and existing [" + p.name + "] score = " + sim);
            }
            if ( sim >= 1 ) {
                exact.push(p.name);
                req.log.debug("Exact match for " + participant.name);
            }
        });

        var user_exists = false;
        req.app.locals.db.Users.find({email: user.email}, function(err, users){
            if ( users && users.length > 0) {
                user_exists = true;
            }
            callback(null, {
                warn : similar.length > 0, 
                stop : exact.length > 0,
                similar : similar, 
                user_exists : user_exists
            })
        })
    })
}

router.post("/registration_confirm", function(req, res) {
    var user = req.body.user;
    var participant = req.body.participant;
    var db = req.app.locals.db;
    var missing = missing_reg(user, participant);
    var invalid = invalid_reg(user, participant, req, false);

    if ( missing.length || invalid.length) {
        req.log.debug("Invalid registration request");
        req.log.debug("Missing:  " + missing.join());
        req.log.debug("Invalid:  " + invalid.join());
        req.flash("errorMessage", "Invalid registration request.");
        res.redirect("/error");
        return;
    }

    check_similar_orgs(req, user, participant, function(err, result) {
        if ( err ) {
            req.log.error(err);
            req.flash("errorMessage", "Database lookup (participants) failed.");
            res.redirect("/error");
            return;
        }
        if ( result.stop ) {
            req.log.error("Duplicate participant registration");
            req.flash("errorMessage", "You cannot register this organization, it has already been registered in the program.");
            res.redirect("/error");
            return;
        }
        if ( result.user_exists ) {
            req.log.error("Duplicate user registration");
            req.flash("errorMessage", "You cannot register this email address, it's already in use.");
            res.redirect("/error");
            return;
        }

        // Save the participant data
        var Schema = require('mongoose').Schema;
        var newParticipant = new db.Participants();
        newParticipant.name = participant.name.trim();
        newParticipant.active = true;
        newParticipant.pumpLimit = 0;
        newParticipant.save(function(err, saved) {
            req.log.debug(saved, "Saved participant = " +saved._id);
            var newUser = new db.Users(user);
            newUser.participant = saved._id;
            newUser.save(function(err, savedUser) {
                // Log the user in
                req.body.email = user.email;
                req.body.password = user.password;
                req.app.locals.passport.authenticate('local', { failureRedirect: '/' })(req, res, function () {
                    res.redirect('/participant');
                })
            })
        });
    })
});



router.post("/register", function(req, res) {
    var user = req.body.user;
    var participant = req.body.participant;

    var missing = missing_reg(user, participant);
    var invalid = invalid_reg(user, participant, req, true);

    if ( missing.length > 0 || invalid.length > 0 ) {
        var message = "Registration data is incomplete.  ";
        if ( missing.length ) {
            message += "You must enter " + missing.join() + ".  ";
        }
        if (invalid.length) {
            message += invalid.join();
        }
        req.flash('registrationMessage', message)
        res.render("landing", {
            user : user, 
            participant: participant
        })
        return;
    }

    check_similar_orgs(req, user, participant, function(err, result) {
        if ( err ) {
            req.log.error(err);
            req.flash("errorMessage", "Database lookup (participants) failed.");
            res.redirect("/error");
            return;
        }
        if ( result.user_exists ) {
            req.log.debug("User already exists, cannot register");
            req.flash("registrationMessage", "A user with this email address has already registered for this program");
            res.render("landing", {
                user : req.body.user,
                participant: req.body.participant
            })
            return;
        }
        res.render("registration/confirm", {
            user : req.body.user,
            participant: req.body.participant,
            warn : result.warn, 
            stop : result.stop,
            similar : result.similar
        })
    })
})

module.exports = router;