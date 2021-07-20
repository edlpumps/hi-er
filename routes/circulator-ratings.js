"use strict";

const express = require('express');
const router = express.Router();
const default_search_operators = require('../search').params;
const aw = require('./async_wrap');
const svg_builder = require('../utils/label_builder.js');

// Route to search (public search)
router.post('/', aw(async function (req, res) {
    const q = {};
    let valid = false;
    if (req.body.participant) {
        q.participant = req.body.participant;
        valid = true;
    }
    if (req.body.rating_id) {
        q.rating_id = req.body.rating_id;
        valid = true;
    }
    if (req.body.basic_model) {
        q.basic_model = req.body.basic_model;
        valid = true;
    }
    if (req.body.brand) {
        q.brand = req.body.brand;
        valid = true;
    }
    q.pending = { $ne: true };
    if (!valid) {
        return res.json([]);
    }

    const results = await req.Circulators.find(q).populate('participant').exec();

    res.json(results)
}));


/// Serves the public search page
router.get('/', aw(async function (req, res) {
    const lookup = {
        $lookup: {
            from: 'participants',
            localField: 'participant',
            foreignField: '_id',
            as: 'p'
        }
    }
    const filter = {
        $match: {
            $and: [{
                listed: true
            }, {
                pending: { $ne: true }
            }
            ]
        }
    };
    const group = {
        $group: {
            _id: {
                id: "$participant",
                name: "$p.name"
            },
            brands: {
                $addToSet: "$brand"
            }
        }
    };
    const ps = await req.Circulators.aggregate([lookup, filter, group]);
    const participants = ps.map(p => ({
        _id: p._id.id,
        name: p._id.name[0],
        brands: p.brands
    }));
    console.log(JSON.stringify(participants, null, 2));

    res.render("ratings/circulator_search", {
        participants: participants
    });
}));


/// Servies the utilities search page (count)
router.get('/utilities', function (req, res) {
    res.render("ratings/circulator_utilities", {

    });
});

// Serves public version of circulator page
router.get("/:id", aw(async (req, res) => {
    const pump = await req.Circulators.findOne({
        rating_id: req.params.id
    }).populate('participant').exec();

    if (!pump || !pump.participant.active ||
        pump.pending || !pump.active_admin ||
        pump.participant.subscription.circulator.status != 'Active') {
        let error_code;
        if (!pump) error_code = "1";
        else if (!pump.participant.active) error_code = "2";
        else if (pump.pending) error_code = "3";
        else if (!pump.active_admin) error_code = "4";
        else if (pump.participant.subscription.circulator.status != 'Active') error_code = "5-" + pump.participant.subscription.circulator.status;
        req.flash("errorTitle", "Not Available");
        req.flash("errorMessage",
            `No pump corresponding to this ID is listed in the Hydraulic Institute Energy Ratings Program. [${error_code}]`);
        res.redirect("/error");
        return;
    }
    res.render("ratings/circulator", {
        pump: pump,
        participant: pump.participant
    });
}));

router.get('/:id/svg/label', aw(async (req, res) => {
    const pump = await req.Circulators.findById(req.params.id).populate('participant').exec();
    const svg = svg_builder.make_circulator_label(req, pump.participant, pump);
    if (req.query.download) {
        res.setHeader('Content-disposition', 'attachment; filename=Energy Rating Label - ' + pump.rating_id + '.svg');
    }
    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(svg);
}));

// Counts based on min/max er
router.post('/utilities', aw(async function (req, res) {
    const min = req.body.min || 0;
    const max = Math.min(req.body.max || 335);
    const count = await req.Circulators.count({
        'least.energy_rating': {
            $gte: min,
            $lt: max + 1
        }
    });
    res.json({
        count: count
    });
}));



module.exports = router;