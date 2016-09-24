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
    motor_efficiency : Number,
    load120 : {type:Boolean, default:true}, 

    pei : Number,
    pei_method : String, // calculated or manual
    energy_rating : Number, 
    energy_savings: Number,

    flow : {
      bep75: Number,
      bep100: Number,
      bep110: Number
    }, 
    head : {
      bep75:Number, 
      bep100:Number,
      bep110:Number
    },
    pump_input_power : {
      bep75:Number, 
      bep100:Number,
      bep110:Number,
      bep120:Number
    },
    driver_input_power :{
      bep75:Number, 
      bep100:Number,
      bep110:Number
    },
    control_power_input : {
      bep25:Number,
      bep50:Number, 
      bep75:Number,
      bep100:Number
    },
    measured_control_power_input : {
      bep25:Number,
      bep50:Number, 
      bep75:Number,
      bep100:Number
    },
    measured_control_flow_input : {
      bep25:Number,
      bep50:Number, 
      bep75:Number,
      bep100:Number
    },
    measured_control_head_input : {
      bep25:Number,
      bep50:Number, 
      bep75:Number,
      bep100:Number
    },



    listed : Boolean,
    active_admin : {type:Boolean, default:true},
    note_admin : String
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