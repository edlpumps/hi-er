var Schema = require('mongoose').Schema;

exports.init = function init(mongoose) {

  var counters = mongoose.model('counters', {
    name : String,
    seq : Number
  }, "counters");

  exports.Counters = counters;

  exports.nextRatingsId = function(callback) {
    var ret = counters.collection.findAndModify(
          { name: "ratings" },
          {},
          {$inc: { seq: 1 } }, 
          {},
          callback
    );
  }


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
    participant_admin : {type:Boolean, default:false},
    participant_edit : {type:Boolean, default:false},
    participant_view : {type:Boolean, default:true},
    participant : Schema.Types.ObjectId,
  }, "users");

  exports.Users = users;

  var lab_schema = new Schema({
    name: String,
    code : String,
    address: {
      street : String,
      street2 : String,
      city : String,
      state : String,
      postal : String,
      country : String
    }
  } )
  var labs = mongoose.model('labs', lab_schema, "labs");

  exports.Labs = labs;


  var pumpSchema = new Schema({
    date : Date, 
    auto : Boolean,
    rating_id : String,
    participant: String,
    configuration : String,
    brand : String,
    basic_model : String,
    individual_model : {type:String, default:"N/A"},
    diameter: Number,
    speed : Number,
    laboratory : {
      _id : String,
      name: String,
      code : String,
      address: {
        street : String,
        street2 : String,
        city : String,
        state : String,
        postal : String,
        country : String
      }
    },
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
    pei_baseline : Number,
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
    note_admin : String,

    results : Schema.Types.Mixed
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
      pumps : [pumpSchema],
      labs : [Schema.Types.ObjectId]

  }, "participants");

  exports.Participants = participants;


  var label = mongoose.model('labels', {
    load:String,
    speed : Number,
    doe : String,
    max : Number, 
    min : Number,
    date : Date
  }, "labels");

  exports.Labels = label;

  counters.count({}, function(err, count) {
    if ( count == 0  ){
      var counter = new counters();
      counter.name = "ratings";
      counter.seq = 0;
      counter.save();
      console.log("Bootstrapping counters");
    }
  })

  label.count({}, function(err, count) {
    if (count == 0 ) {
      console.log("Bootstrapping labels...");
      var loads = ["CL", "VL"];
      var does = ["ESCC", "ESFM", "IL", "RSV", "ST"];
      var speeds = [1800, 3600];
      loads.forEach(function(load){
        does.forEach(function(doe){
          speeds.forEach(function(speed){
            var lab = new label();
            lab.load = load;
            lab.doe = doe;
            lab.speed = speed;
            lab.max = 100;
            lab.min = 0;
            lab.date = new Date(2016, 8);
            lab.save();
          })
        })
      })
    }

  })
}