const express = require('express');
const passport = require('passport');
const router = express.Router();

router.get('/portal', function(req, res) {
    // Check if a user is logged in, if so, redirect to the correct landing page - 
    // either participant portal or admin portal.
    // If not logged in, the landing page is the signin/signup page.
    if ( req.user && req.user.participant ) {
        req.log.debug("Participant logged in, redirecting to portal home");
        res.redirect("/participant");
    }
    else if ( req.user && req.user.admin) {
        req.log.debug("Admin logged in, redirecting to admin portal home");
        res.redirect("/admin");
    }
    else {
        req.log.debug("No user is logged in, rendering landing page");
        var email = req.cookies.email;
        res.render("landing", {
            email: email
        });
    }
});

router.get('/', function(req, res) {
    if ( req.user && req.user.participant ) {
        req.log.debug("Participant logged in, redirecting to portal home");
        res.redirect("/participant");
    }
    else if ( req.user && req.user.admin) {
        req.log.debug("Admin logged in, redirecting to admin portal home");
        res.redirect("/admin");
    }
    else {
        req.log.debug("No user is logged in, rendering landing page");
        res.redirect("/ratings/home");
    }
});


router.get("/activate/:key", function(req, res) {
    var user = null;
    req.Users.findOne({"$and": [{activationKey:req.params.key}, {needsActivation:true}]}, function(err, user) {
        if ( err ) {
            req.log.error(err);
            req.flash("errorTitle", "Internal application error");
            req.flash("errorMessage", "Database lookup (activation) failed.");
            res.redirect("/error");
            return;
        }
        else if ( user ) {
            req.Participants.findOne({_id:user.participant}, function(err, participant) {
                    res.render("registration/activate", {
                        user : user, 
                        participant : participant
                    })
            });
        }
        else {
            req.flash("errorTitle", "Account activation error");
            req.flash("errorMessage", "This activation key is expired, or has already been used.");
            res.redirect("/error");
        }
    })
});

router.post("/activate/:key", function(req, res) {
    req.Users.findOne({"$and": [{activationKey:req.params.key}, {needsActivation:true}]}, function(err, toActivate) {
        if ( err ) {
            req.log.error(err);
            req.flash("errorTitle", "Internal application error");
            req.flash("errorMessage", "Database lookup (activation) failed.");
            res.redirect("/error");
            return;
        }
        if ( !toActivate || !toActivate.needsActivation) {
            req.flash("errorTitle", "Account activation error");
            req.flash("errorMessage", "This activation key is expired, or has already been used.");
            res.redirect("/error");
            return;
        }
        var user = req.body.user;
        var participant = req.body.participant;

        var missing = missing_reg(user);
        var invalid = invalid_reg(user, req, true);
        
        if ( missing.length > 0 || invalid.length > 0 ) {
            var message = "Registration data is incomplete.  ";
            if ( missing.length ) {
                message += "You must enter " + missing.join(", ") + ".  ";
            }
            if (invalid.length) {
                message += invalid.join(", ");
            }
            req.flash('activationMessage', message);
            req.Participants.findOne({_id:toActivate.participant}, function(err, participant) {
                    res.render("registration/activate", {
                        user : toActivate, 
                        participant : participant
                    })
            });
            
            return;
        }

        toActivate.name = user.name;
        toActivate.email = user.email;
        toActivate.needsActivation = false;
        var pswd = require("../utils/password");
        var secured = pswd.saltHashPassword(user.password);
        toActivate.password = secured.hash;
        toActivate.salt = secured.salt;
        toActivate.save(function(err, savedUser) {
            req.logOut() ;
            req.body.email = req.body.user.email;
            req.body.password = req.body.user.password;
            req.app.locals.passport.authenticate('local', { failureRedirect: '/' })(req, res, function () {
                res.redirect('/portal');
            })
        })
    });
})


var missing_reg = function(user) {
    var missing = [];
    if ( !user.name || !user.name.first || !user.name.last) missing.push("Name");
    if ( !user.email ) missing.push("Email address");
    if ( !user.password) missing.push("Password");
    return missing;
}

var missing_participant = function(participant) {
    var missing = [];
    if ( !participant || !participant.name) missing.push("Organization name");
    return missing;
}

var invalid_reg = function(user, req, check_password) {
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
            if ( sim >= 0.9 && sim < 1) {
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
    var missing = missing_reg(user);
    var invalid = invalid_reg(user, req, false);
    var missing_p = missing_participant(participant);
    missing = missing.concat(missing_p);

    if ( missing.length || invalid.length ) {
        req.log.debug("Invalid registration request");
        req.log.debug("Missing:  " + missing.join());
        req.log.debug("Invalid:  " + invalid.join());
        req.flash("errorTitle", "Registration error");
        req.flash("errorMessage", "Invalid registration request.");
        res.redirect("/error");
        return;
    }

    check_similar_orgs(req, user, participant, function(err, result) {
        if ( err ) {
            req.log.error(err);
            req.flash("errorTitle", "Internal application error");
            req.flash("errorMessage", "Database lookup (participants) failed.");
            res.redirect("/error");
            return;
        }
        if ( result.stop ) {
            req.log.error("Duplicate participant registration");
            req.flash("errorTitle", "Registration error");
            req.flash("errorMessage", "You cannot register this organization, it has already been registered in the program.");
            res.redirect("/error");
            return;
        }
        if ( result.user_exists ) {
            req.log.error("Duplicate user registration");
            req.flash("errorTitle", "Registration error");
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
        newParticipant.contact = user;
        newParticipant.save(function(err, saved) {
            req.log.debug("Saved participant = " +saved._id);
            var newUser = new db.Users(user);
            var pswd = require("../utils/password");
            var secured = pswd.saltHashPassword(user.password);
            newUser.password = secured.hash;
            newUser.salt = secured.salt;
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

    var missing = missing_reg(user);
    var invalid = invalid_reg(user, req, true);
    var missing_p = missing_participant(participant);
    missing = missing.concat(missing_p);

    if ( missing.length > 0 || invalid.length > 0 ) {
        var message = "Registration data is incomplete.  ";
        if ( missing.length ) {
            message += "You must enter " + missing.join(", ") + ".  ";
        }
        if (invalid.length) {
            message += invalid.join(", ");
        }
        req.flash('registrationMessage', message)
        req.log.debug("Registration cannot be completed - missing/invalid information");
        res.render("landing", {
            user : user, 
            participant: participant, 
            target : "register"
        })
        return;
    }

    check_similar_orgs(req, user, participant, function(err, result) {
        if ( err ) {
            req.log.error(err);
            req.flash("errorTitle", "Internal application error");
            req.flash("errorMessage", "Database lookup (participants) failed.");
            res.redirect("/error");
            return;
        }
        if ( result.user_exists ) {
            req.log.debug("User already exists, cannot register");
            req.flash("registrationMessage", "A user with this email address has already registered for this program");
            res.render("landing", {
                user : req.body.user,
                participant: req.body.participant, 
                target : "register"
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