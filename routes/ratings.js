"use strict";

const express = require('express');
const router = express.Router();
const default_search_operators = require('../search').params;
const aw = require('./async_wrap');
const lang = require('../utils/language');

router.use('/certificates', require('./certificates'));

router.get("/glossary", function (req, res) {
    var help = require('../public/resources/help.json')
    res.render("ratings/glossary", {
        help: help
    });
});





router.get('/search', function (req, res) {
    var operators = default_search_operators(undefined, true);
    var search_params = req.session.search;
    const invalid = search_params && !search_params.cl && !search_params.vl && !search_params.esfm && !search_params.il && !search_params.rsv && !search_params.st;
    if (!search_params || invalid) {
        search_params = {
            min_er: 0,
            max_er: 100,
            cl: true,
            vl: true,
            esfm: true,
            escc: true,
            il: true,
            rsv: true,
            st: true
        };
        search_params.fresh = true;
    }




    res.render("ratings/search", {
        search: search_params
    });
});
router.get('/api/participants', function (req, res) {
    req.Participants.find({
        $and: [{
            active: true,
            'subscription.status': 'Active'
        }]
    }, function (err, docs) {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
            participants: docs.filter(p => p.active).map(p => p.name)
        }));
    });
});

router.get('/api/brands', aw(async (req, res) => {
    var name = req.query.name;
    var query = {};

    if (name) {
        const participant = await req.Participants.findOne({
            name: name
        }).exec();
        if (participant) {
            query['participant'] = participant._id;
        }
    }
    const brands = await req.Pumps.distinct('brand', query);
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
        brands: brands
    }));
}));

router.get('/home', function (req, res) {
    res.render("ratings/home", {});
});

router.get('/utilities', function (req, res) {
    var operators = default_search_operators(undefined, false);
    var search_params = req.session.search;
    if (!search_params) {
        search_params = {};
        search_params.cl = true;
        search_params.vl = true;
        search_params.min_er = 0;
        search_params.max_er = 100;

        search_params.esfm = true;
        search_params.escc = true;
        search_params.il = true;
        search_params.rsv = true;
        search_params.st = true;

        search_params.min_er = 10;
        search_params.max_er = 100;
        search_params.fresh = true;
    }



    res.render("ratings/utilities", {
        search: search_params
    });
});

router.get("/:id", aw(async (req, res) => {
    const pump = await req.Pumps.findOne({
        rating_id: req.params.id
    }).populate('participant').exec();

    if (!pump || !pump.participant.active || pump.pending || !pump.active_admin || pump.participant.subscription.status != 'Active') {
        req.flash("errorTitle", "Not Available");
        req.flash("errorMessage", "No pump corresponding to this ID is listed in the Hydraulic Institute Energy Ratings Program");
        res.redirect("/error");
        return;
    }
    //Set page language to the label language
    lang.set_page_language(req, res, lang.get_label_language());
    res.render("ratings/r_pump", {
        pump: pump,
        participant: pump.participant,
        pump_drawing: pump.doe ? pump.doe.toLowerCase() + ".png" : ""
    });
}));



router.post("/count", function (req, res) {
    req.session.search = req.body.search;

    req.session.search.fresh = false;

    // limit search parameters
    var search_params = {
        esfm: req.session.search.esfm,
        escc: req.session.search.escc,
        il: req.session.search.il,
        rsv: req.session.search.rsv,
        st: req.session.search.st,
        cl: req.session.search.cl,
        vl: req.session.search.vl,
        max_er: req.session.search.max_er,
        min_er: req.session.search.min_er
    }

    var operators = default_search_operators(search_params, false);

    operators.push({
        $count: 'count'
    });
    req.Pumps.aggregate(operators).exec(function (err, docs) {
        if (err) {
            console.log(err);
        }
        let count = 0;
        if (docs.length) {
            count = docs[0].count;
        }
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
            pumps: count
        }));
    });
});

router.post("/search", function (req, res) {
    req.session.search = req.body.search;
    req.session.csearch = req.body.search;
    // Per HI request, you cannot search unless participant, basic_model or rating_id is specified.
    if (!req.session.search.rating_id && !req.session.search.participant && !req.session.search.basic_model && !req.session.search.brand) {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
            pumps: []
        }));
        return;
    }

    req.session.search.fresh = false;

    //prevent any other search parameters from being applied.
    var search_params = {
        rating_id: req.session.search.rating_id,
        participant: req.session.search.participant,
        basic_model: req.session.search.basic_model,
        brand: req.session.search.brand,
        cl: req.session.search.cl,
        vl: req.session.search.vl
    }

    var operators = default_search_operators(search_params, true);
    operators.push({
        $sort: {
            pei: 1,
            basic_model: 1,
            individual_model: 1
        }
    })
    operators.push({
        $project: {
            rating_id: 1,
            brand: 1,
            individual_model: 1,
            'joined_participant.name': 1,
            doe: 1,
            configuration: 1,
            diameter: 1,
            speed: 1,
            stages: 1,
            energy_rating: 1,
            pei: 1
        }
    })
    //console.log(operators);
    req.Pumps.aggregate(operators).exec(function (err, docs) {
        res.json({
            pumps: docs
        });
    });
});





module.exports = router;