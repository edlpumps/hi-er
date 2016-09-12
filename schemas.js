var Schema = require('mongoose').Schema;

exports.init = function init(mongoose) {
  var users = mongoose.model('users', {
    name: {
        first: String, 
        last:  String
    },
    email:String,
    password: String,
    salt: String,
    activationKey:String,
    needsActivation:{type:Boolean, default:false},
    admin : Boolean, 
    participant : Schema.Types.ObjectId,
  }, "users");

  exports.Users = users;

  var participants = mongoose.model('participants',  {
      name : String,
      active: Boolean,
      pumpLimit : Number
  }, "participants");

  exports.Participants = participants;
}