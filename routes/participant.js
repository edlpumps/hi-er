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

router.get("/api/users", function(req, res) {
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

router.post("/api/users/delete/:id", function(req, res) {
    req.Users.findOne({_id: req.params.id}, function(err, user){
        if ( err ) {
            req.log.debug("Error getting user to delete");
            req.log.debug(err);
            res.status(500).send({error:err});
        }
        else if (!user ) {
            res.status(200).send("User doesn't exist");
        }
        else if (!user.participant.equals(req.participant._id)) {
            req.log.info("Deletion attempt on user from another participating org");
            req.log.info(req.participant._id);
            req.log.info(user.participant);
            res.status(403).send("Cannot delete user from another participating organization");
        }
        else {
            req.Users.remove({_id:req.params.id}, function(err) {
                if ( err ) {
                    req.log.debug("Error removing user");
                    req.log.debug(err);
                    res.status(500).send({error:err});
                }
                else {
                    res.status(200).send("User removed");
                }
            })
        }
    });
});

router.post("/api/users/add", function(req, res) {
    // New user only needs name and email address.  
    // An activation link will be generated and will be in the response.
    var uuid = require('uuid');
    var user = new req.Users();
    user.name = req.body.user.name;
    user.email = req.body.user.email;
    user.participant = req.participant._id;
    user.needsActivation = true;
    user.activationKey = uuid.v1();
    
    if ( !user.name || !user.name.first || !user.name.last) {
        res.status(400).send("User must have first and last name");
        return;
    }
    
    var validator = require("email-validator");
    if (!user.email || !validator.validate(user.email)) {
        res.status(400).send("User must have valid email address");
        return;
    }

    req.Users.find({email: user.email}, function(err, users){
        if ( users && users.length > 0) {
            res.status(400).send("User already exists");
            return;
        }
        user.save(function(err, saved) {
            if ( err) {
                res.status(500).send({error:err});
            }
            else {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ user: saved}));
            }
        });
    })
})

module.exports = router;