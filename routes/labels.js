const express = require('express');
const router = express.Router();
const fs = require('fs')
const path = require('path');
const svg_builder = require('../utils/label_builder.js');

  
                




var render_svg = function(req,res, svg_maker, callback){
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
                        callback(svg_maker(req, participant, pump, label), pump);
                });
            }
        }
    });
}



router.get('/:participant_id/:id/svg', function(req, res) {
   render_svg(req, res, svg_builder.make_label, function(svg, pump){
        if (req.query.download) {
            res.setHeader('Content-disposition', 'attachment; filename=Energy Rating Label - '+pump.rating_id+'.svg');
        }
        res.setHeader('Content-Type', 'image/svg+xml');
        res.send(svg);
   });
});

router.get('/:participant_id/:id/qr', function(req, res) {
    render_svg(req, res, svg_builder.make_qr, function(svg, pump){
        if (req.query.download) {
            res.setHeader('Content-disposition', 'attachment; filename=Energy Rating QR -'+pump.rating_id+'.svg');
        }
        res.setHeader('Content-Type', 'image/svg+xml');
        res.send(svg);
   });
});





module.exports = router;