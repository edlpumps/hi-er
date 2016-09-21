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


  var pumpSchema = new Schema({ 
    participant: String,
    configuration : String,
    basic_model : String,
    diameter: Number,
    speed : Number,
    laboratory : String,
    motor_method : String,
    section : String,
    stages : Number,
    doe : String,
    bowl_diameter : Number,
    motor_regulated : Boolean,
    motor_power_rated : Number,
    load120 : Boolean, 

    pei : Number,
    energy_rating : Number, 
    energy_savings: Number,

    listed : Boolean,
    active_admin : {type:Boolean, default:true},
    node_admin : String
  });
  

  var participants = mongoose.model('participants',  {
      name : String,
      address : {
        street : String,
        street2 : String,
        city : String,
        state : String,
        zip: String, 
        country:String
      },
      contact : {
        name : {
          first : String,
          last: String
        },
        phone : String,
        email:String
      },
      active: Boolean,
      pumpLimit : Number, 
      pumps : [pumpSchema]
  }, "participants");

  exports.Participants = participants;
}