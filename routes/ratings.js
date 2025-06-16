"use strict";

const express = require('express');
const router = express.Router();
const default_search_operators = require('../search').params;
const aw = require('./async_wrap');
const lang = require('../utils/language');
const calculator = require('../calculator');

router.use('/certificates', require('./certificates'));

router.get("/glossary", function (req, res) {
    var help = require('../public/resources/help.json')
    res.render("ratings/glossary", {
        help: help
    });
});





router.get('/search', function (req, res) {
    //Search params are stored in local storage or are initialized in the page or view.
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
            st: true,
            tier1: false,
            tier2: false,
            tier3: false,
            tiernone: false
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
    //Search params are stored in local storage or are initialized in the page or view.
    res.render("ratings/utilities");
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
    pump.cee_tier = calculator.calculate_pump_hp_group_and_tier(pump).cee_tier;
    pump.cee_tier = pump.cee_tier == "None"? "": pump.cee_tier;
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
            pei: 1,
            motor_power_rated: 1
        }
    })
    //console.log(operators);
    req.Pumps.aggregate(operators).exec(function (err, docs) {
        let new_docs = docs;
        // Now filter the results based on the tiers
        new_docs = calculator.filter_pumps_by_cee_tiers(docs, req.session.search, 'pumps');
        res.json({
            pumps: new_docs
        });
    });
});

//TESTING Exports

// const exporter = require('../exporter');
// const mailer = require('../utils/mailer');
// const fs = require('fs');
// const common = require('./common');


// async function qplbackendhandler(which, req, res) {
//     const exports = await exporter.create('all',req.user);
//     if (common.validateEmail(which)) {
//         const recipient = which;
//         console.log("Sending QPL email to " + recipient);
//         mailer.sendListings(recipient, exports.pumps.qpl, exports.circulators.qpl, exports.certificates.qpl, "qpl");
//         mailer.sendListings(recipient, exports.pumps.full, exports.circulators.full, exports.certificates.full, "full");
//         return res.status(200).send("Email sent to " + recipient);
//     }
//     else {
//         if (process.env.NODE_ENV == 'development') {
//             console.log("Downloading QPL files");
//             let file_list = [];
//             for (var list of Object.keys(exports)) {
//                 for (var key of Object.keys(exports[list])) {
//                     if (exports[list][key] == null) continue;
//                     let filename = "./export-"+list+"-"+key+".xlsx";
//                     fs.writeFileSync(filename,exports[list][key]);
//                     file_list.push(filename);
//                 }
//             }
//             return res.status(200).send('Files downloaded successfully: '+ file_list);
//         }
//         else {
//             return res.status(400).send('Please provide an emailaddress to send the files to.');
//         }
//     }
// }

// router.get('/ceetest/:which', aw(async (req, res) => {
//     if (process.env.NODE_ENV && ['development','beta'].includes(process.env.NODE_ENV)) {
//         let which = req.params.which;
//         console.log("CEE Test: " + which);
//         try {
//             await qplbackendhandler(which, req, res);
//         } catch (err) {
//             console.error(err);
//             res.status(500).send("CEE Test Error: " + err.message);
//         }
//     }
//     else {
//         res.status(403).send("This endpoint is not available in production mode.");
//     }
// }));

//END 



module.exports = router;