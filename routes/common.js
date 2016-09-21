exports.deleteUser = function(req, res) {
    req.Users.findOne({_id: req.params.id}, function(err, user){
        if ( err ) {
            req.log.debug("Error getting user to delete");
            req.log.debug(err);
            res.status(500).send({error:err});
        }
        else if (!user ) {
            res.status(200).send("User doesn't exist");
        }
        else if (!req.user.admin && !user.participant.equals(req.participant._id)) {
            req.log.info("Deletion attempt on user from another participating org");
            req.log.info(req.participant._id);
            req.log.info(user.participant);
            res.status(403).send("Cannot delete user from another participating organization");
        }
        else if (req.user.admin && !user.admin) {
            req.log.info("Deletion attempt by administrator on participant user");
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
};

exports.addUser = function(req, res) {
    // New user only needs name and email address.  
    // An activation link will be generated and will be in the response.
    var uuid = require('uuid');
    var user = new req.Users();
    user.name = req.body.user.name;
    user.email = req.body.user.email;
    user.participant = req.participant ? req.participant._id : undefined;
    user.needsActivation = true;
    user.admin = req.user.admin;
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
};

exports.section_label = function(section) {
      if (!section) return undefined;
      switch(section) {
          case "3":
            return "Section III";
          case "4":
            return "Section IV";
          case "5":
            return "Section V";
          case "6a":
            return "Section VI-a";
          case "6b":
            return "Section VI-b";
          case "7":
            return "Section VII";
          default:
            return undefined;
      }
  }

