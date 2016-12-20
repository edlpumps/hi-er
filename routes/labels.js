const express = require('express');
const router = express.Router();
const fs = require('fs')
const path = require('path');
const svg_builder = require('../utils/label_builder.js');


  
var render_svg = function(req,res, svg_maker, callback){
    req.Participants.findById(req.params.participant_id, function(err, participant) {
        if ( err ) {
            return callback(err);
        }
        else if (!participant) {
            return callback("Unknown participant");
        }
        else {
            var pump = participant.pumps.id(req.params.id);
            if ( !pump) {
                return callback("Unknown pump");
            }
            else {
                var load = pump.configuration =="bare" || pump.configuration=="pump_motor" ? "CL" : "VL";
                req.Labels.findOne().and([
                    {speed : pump.speed}, 
                    {doe : pump.doe}, 
                    {load: load}
                ]).exec(function(err, label) {
                    if ( err ) return callback(err);
                    else return callback(null, svg_maker(req, participant, pump, label), pump);
                });
            }
        }
    });
}



router.get('/:participant_id/:id/svg', function(req, res) {
   render_svg(req, res, svg_builder.make_label, function(err, svg, pump){
        if ( err ) {
            res.status(500).send(err);
            return;
        }
        if (req.query.download) {
            res.setHeader('Content-disposition', 'attachment; filename=Energy Rating Label - '+pump.rating_id+'.svg');
        }
        res.setHeader('Content-Type', 'image/svg+xml');
        res.send(svg);
   });
});

router.get('/:participant_id/:id/qr', function(req, res) {
    render_svg(req, res, svg_builder.make_qr, function(err, svg, pump){
        if ( err ) {
            res.status(500).send(err);
            return;
        }
        if (req.query.download) {
            res.setHeader('Content-disposition', 'attachment; filename=Energy Rating QR -'+pump.rating_id+'.svg');
        }
        res.setHeader('Content-Type', 'image/svg+xml');
        res.send(svg);
   });
});


router.get('/sample/svg', function(req, res) {
    var file = fs.readFileSync(path.join(__dirname, "label.svg"), "utf8");
    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(file);
});

router.get('/sample/png', function(req, res) {
    var file = fs.readFileSync(path.join(__dirname, "label.svg"));
    const svg2png = require("svg2png");
    svg2png(file, {  })
    .then(function(png_buffer) {
        res.writeHead(200, {
            'Content-Type': "image/png",
            'Content-Length': png_buffer.length
        });
        res.end(png_buffer);
    } )
    .catch(e => console.error(e));
    
})



module.exports = router;