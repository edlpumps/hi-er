require('dotenv').config({silent: true});
const data_connection_str = "mongodb://iq-admin:ieq4valley^78sf@candidate.60.mongolayer.com:11395,candidate.15.mongolayer.com:11279/app61915427";//process.env.MONGO_CONNECTION_DATA;
const mongoose = require("mongoose");
const schemas = require("./schemas");

var participant_id = "";
var rating_id = "";

var conn = mongoose.connect(data_connection_str, {auto_reconnect:true}, function(err, res) {
  if (err) {
   console.log("Could not connect to mongo database at " + data_connection_str)
  }
  else {
    schemas.init(mongoose);
    schemas.Participants.find({_id:participant_id}, function(err, docs) {
        console.log(docs.length);
        if ( docs.length > 0 ) {
            var pumps = docs[0].pumps.filter(function(p){
                return p.rating_id == rating_id;
            });
            if ( pumps.length > 0 ) {
                pumps[0].remove();
            }
        }
        docs[0].save(function(){
            mongoose.connection.close()
        })
        
    })
    
  }
});