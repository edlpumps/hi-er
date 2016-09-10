var Schema = require('mongoose').Schema;

exports.init = function init(mongoose) {
  var users = mongoose.model('users', {
    name: {
        first: String, 
        last:  String
    },
    username: String, 
    password: String,
    email:String,
    confirmed:Boolean,
    admin : Boolean, 
    participant : Schema.Types.ObjectId,
  }, "users");

  exports.Users = users;


  var participants = mongoose.model('participants',  {
      name : String,
      active: Boolean,
      pumpLimit : Number,
      primaryUser : Schema.Types.ObjectId
  }, "participants");

  exports.Participants = participants;
}