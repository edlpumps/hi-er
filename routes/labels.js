const express = require('express');
const router = express.Router();
const fs = require('fs')
const path = require('path');


var getSVG = function(pump, label, callback) {
    console.log("SVG 1");
    var pm = pump.configuration =="bare"  ? "- Bare Pump" : "- Motor";
    var config = 
        pump.configuration =="bare" || pump.configuration=="pump_motor"  
        ? "" 
        : (pump.configuration=="pump_motor_cc" 
            ? "- Drive &amp; Continuous Controls" 
            : "- Drive &amp; Non-Continuous Controls")
    console.log("SVG 2");
    var load = pump.configuration =="bare" || pump.configuration=="pump_motor" ? "CONSTANT LOAD" : "VARIABLE LOAD";
    var datetime = label.date;
    var locale = "en-us";

    var er = Math.min(pump.energy_rating, label.max);
    var date = datetime.toLocaleString(locale, { month: "short" });
    var span = label.max - label.min;
    var distance = (er - label.min)/span;
    var pos = Math.round(distance*450 + 75) ;
    date += " " + datetime.getFullYear()
    console.log("SVG 3");
    var filename = path.join(__dirname, "label.template.svg");
    console.log("Getting svg template from " + filename);
    fs.readFile(filename, 'utf8', (err, data) => {
        console.log("Replacing tags for SVG");
        data = data.replace("%%DOE%%", pump.doe);
        data = data.replace("%%PM%%", pm);
        data = data.replace("%%CONFIG%%", config);
        data = data.replace("%%PARTICIPANT%%", pump.participant);
        data = data.replace("%%MODEL%%", pump.basic_model);
        data = data.replace("%%SPEED%%", pump.speed);
        data = data.replace("%%LOAD%%", load);
        data = data.replace("%%ER%%", pump.energy_rating);
        data = data.replace("%%DATE%%", date);
        data = data.replace("%%RID%%", pump.rating_id);

        data = data.replace("%%ERPOS%%", pos);
        data = data.replace("%%CPOS%%", pos);
        data = data.replace("%%LPOS%%", pos-5);
        data = data.replace("%%RPOS%%", pos+5);
        callback(err, data);
    });
}




var getit = function(req,res, callback){
    req.Participants.findById(req.params.participant_id, function(err, participant) {
        if ( err ) {
            re.log.error(err);
            res.status(500).send({ error: err });
        }
        else if (!participant) {
            res.status(401).send({ error: err });
        }
        else {
            var pump = participant.pumps.id(req.params.id);
            if ( !pump) {
                res.status(401).send({ error: err });
            }
            else {
                var load = pump.configuration =="bare" || pump.configuration=="pump_motor" ? "CL" : "VL";
                req.Labels.findOne().and([
                    {speed : pump.speed}, 
                    {doe : pump.doe}, 
                    {load: load}
                ]).exec(function(err, label) {
                    console.log(label);
                    console.log("Calling svg template");
                        getSVG(pump, label, function(err, svg) {
                            console.log("getSvg returned");
                            console.log(err);
                            console.log(svg);
                            callback(svg);
                        })
                });
            }
        }
    });
}

router.get('/:participant_id/:id/svg', function(req, res) {
   getit(req, res, function(svg){
        res.setHeader('Content-Type', 'image/svg+xml');
        res.send(svg);
   });
});


router.get('/:participant_id/:id/qr', function(req, res) {
    var port = req.app.settings.port || cfg.port;
    var base = req.protocol + '://' + req.host;

    req.Participants.findById(req.params.participant_id, function(err, participant) {
        if ( err ) {
            re.log.error(err);
            res.status(500).send({ error: err });
        }
        else if (!participant) {
            res.status(401).send({ error: err });
        }
        else {
            var pump = participant.pumps.id(req.params.id);
            if ( !pump) {
                res.status(401).send({ error: err });
            }
            else {
                var url = base + "/ratings/" + pump.rating_id;

                var qr = require('qr-image');  
                var code = qr.image(url, { type: 'png' });

                res.type('png');
                code.pipe(res);

            }
        }
    });


    
})



module.exports = router;