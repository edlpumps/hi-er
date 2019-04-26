const express = require('express');
const router = express.Router();
const fs = require('fs')
const path = require('path');
const svg_builder = require('../utils/label_builder.js');
const svg2png = require("svg2png");


const render_svg = async (req, res, svg_maker, callback) => {
    try {
        const participant = await req.Participants.findById(req.params.participant_id).exec();
        const pump = await req.Pumps.findById(req.params.id).exec();
        if (!participant || !pump) {
            return callback("Unknown participant");
        }
        var load = pump.configuration == "bare" || pump.configuration == "pump_motor" ? "CL" : "VL";
        req.Labels.findOne().and([{
            speed: pump.speed
        },
        {
            doe: pump.doe
        },
        {
            load: load
        }
        ]).exec(function (err, label) {
            if (err) return callback(err);
            else return callback(null, svg_maker(req, participant, pump, label), pump);
        });

    } catch (ex) {
        return callback(ex);
    }
}



router.get('/:participant_id/:id/svg', function (req, res) {
    render_svg(req, res, svg_builder.make_label, function (err, svg, pump) {
        if (err) {
            res.status(500).send(err);
            return;
        }
        if (req.query.download) {
            res.setHeader('Content-disposition', 'attachment; filename=Energy Rating Label - ' + pump.rating_id + '.svg');
        }
        res.setHeader('Content-Type', 'image/svg+xml');
        res.send(svg);
    });
});

router.get('/:participant_id/:id/svg-sm', function (req, res) {
    render_svg(req, res, svg_builder.make_sm_label, function (err, svg, pump) {
        if (err) {
            res.status(500).send(err);
            return;
        }
        if (req.query.download) {
            res.setHeader('Content-disposition', 'attachment; filename=Energy Rating Label - ' + pump.rating_id + '.svg');
        }
        res.setHeader('Content-Type', 'image/svg+xml');
        res.send(svg);
    });
});




router.get('/:participant_id/:id/png', function (req, res) {
    render_svg(req, res, svg_builder.make_label, function (err, svg, pump) {
        if (err) {
            res.status(500).send(err);
            return;
        }

        svg2png(svg, {})
            .then(function (png_buffer) {
                if (req.query.download) {
                    res.setHeader('Content-disposition', 'attachment; filename=Energy Rating Label - ' + pump.rating_id + '.png');
                }
                res.setHeader('Content-Type', 'image/png');
                res.setHeader('Content-Length', png_buffer.length);
                res.status(200).send(png_buffer);
            })
            .catch(e => res.status(500).send(e));
    });
});

router.get('/:participant_id/:id/png-sm', function (req, res) {
    render_svg(req, res, svg_builder.make_sm_label, function (err, svg, pump) {
        if (err) {
            res.status(500).send(err);
            return;
        }

        svg2png(svg, {})
            .then(function (png_buffer) {
                if (req.query.download) {
                    res.setHeader('Content-disposition', 'attachment; filename=Energy Rating Label - ' + pump.rating_id + '.png');
                }
                res.setHeader('Content-Type', 'image/png');
                res.setHeader('Content-Length', png_buffer.length);
                res.status(200).send(png_buffer);
            })
            .catch(e => res.status(500).send(e));
    });
});

router.get('/:participant_id/:id/qr', function (req, res) {
    render_svg(req, res, svg_builder.make_qr, function (err, svg, pump) {
        if (err) {
            res.status(500).send(err);
            return;
        }
        if (req.query.download) {
            res.setHeader('Content-disposition', 'attachment; filename=Energy Rating QR -' + pump.rating_id + '.svg');
        }
        res.setHeader('Content-Type', 'image/svg+xml');
        res.send(svg);
    });
});

router.get('/:participant_id/:id/qr/png', function (req, res) {
    render_svg(req, res, svg_builder.make_qr, function (err, svg, pump) {
        if (err) {
            res.status(500).send(err);
            return;
        }

        svg2png(svg, {})
            .then(function (png_buffer) {
                if (req.query.download) {
                    res.setHeader('Content-disposition', 'attachment; filename=Energy Rating QR - ' + pump.rating_id + '.png');
                }
                res.setHeader('Content-Type', 'image/png');
                res.setHeader('Content-Length', png_buffer.length);
                res.status(200).send(png_buffer);
            })
            .catch(e => res.status(500).send(e));
    });
});

module.exports = router;