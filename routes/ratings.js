const express = require('express');
const passport = require('passport');
const router = express.Router();


var default_search_operators = function (search_parameters) {
    var search = search_parameters || {};
    var operators = [];
    operators.push({"$unwind" : "$pumps"});
    
    console.log(search);
    operators.push(
     { $group : { 
        _id : "$pumps._id",  
        rating_id : {$first: "$pumps.rating_id"},
        participant_id : {$first: "$_id"},
        participant : {$first: "$pumps.participant"},
        configuration : {$first: "$pumps.configuration"},
        basic_model : {$first: "$pumps.basic_model"},
        diameter : {$first: "$pumps.diameter"},
        speed : {$first: "$pumps.speed"},
        laboratory : {$first: "$pumps.laboratory"},
        stages : {$first: "$pumps.stages"},
        doe : {$first: "$pumps.doe"},
        pei : {$first: "$pumps.pei"},
        energy_rating : {$first: "$pumps.energy_rating"},
        energy_savings : {$first: "$pumps.energy_savings"},
        listed : {$first: "$pumps.listed"},
        active_admin : {$first: "$pumps.active_admin"}, 
     } 
    });
    operators.push(
        { $match : {
            $and : [
                {doe : {$ne: null}},
                {rating_id: {$ne:null}},
                {participant: {$ne:null}},
                {configuration: {$ne:null}},
                {basic_model: {$ne:null}},
                {diameter: {$ne:null}},
                {speed: {$ne:null}},
                {laboratory: {$ne:null}},
                {stages: {$ne:null}},
                {doe: {$ne:null}},
                {pei: {$ne:null}},
                {energy_rating: {$ne:null}},
                {energy_savings: {$ne:null}},
                {listed: {$eq:true}},
                {active_admin: {$eq:true}}, 
            ]
        }}
    );
    if ( search.rating_id) {
        console.log("Filtering for ratings ID = " + search.rating_id);
        operators.push({ $match : {rating_id : search.rating_id}});
    }
    if ( search.participant) {
        operators.push({ $match : {participant : search.participant}});
    }
    if ( search.basic_model) {
        console.log("Filtering for basic model = " + search.basic_model);
        operators.push({ $match : {basic_model : search.basic_model}});
    }
    if ( search ) {
        var configs = [];
        if ( search.cl ) {
            console.log("Searching for CL");
            configs.push({configuration : "bare"});
            configs.push({configuration : "pump_motor"});
        }
        if ( search.vl ) {
            console.log("Searching for VL");
            configs.push({configuration : "pump_motor_cc"});
            configs.push({configuration : "pump_motor_nc"});
        }
        if ( search.bare ) {
            console.log("Searching for bare");
            configs.push({configuration : "bare"});
        }
        if ( search.pump_motor ) {
            configs.push({configuration : "pump_motor"});
        }
        if ( search.pump_motor_cc) {
            configs.push({configuration : "pump_motor_cc"});
        }
        if (search.pump_motor_nc) {
            configs.push({configuration : "pump_motor_nc"});
        }
        if ( configs.length > 0 ) {
            console.log("Searching for " + JSON.stringify(configs));
            operators.push({$match: {$or : configs}});
        }

        var does = [];
        if ( search.esfm ) {
            does.push({doe : "ESFM"});
        }
        if ( search.escc ) {
            does.push({doe : "ESCC"});
        }
        if ( search.il) {
            does.push({doe : "IL"});
        }
        if (search.rsv) {
            does.push({doe : "RSV"});
        }
        if (search.st) {
            does.push({doe : "ST"});
        }
        if ( does.length > 0 ) {
            console.log("Searching for " + JSON.stringify(does));
            operators.push({$match: {$or : does}});
        }

        var min_er = search.min_er || 0;
        var max_er = search.max_er || 100;
        operators.push({$match : { energy_rating: { $gte: min_er, $lte: max_er } }});
    }
    return operators;
}
router.get('/search', function(req, res) {
    var operators = default_search_operators();
    var search_params = req.session.search;
    if (!search_params ) {
        search_params = {};
        search_params.fresh = true;
    }
    search_params.bare = true;
    search_params.pump_motor = true;
    search_params.pump_motor_cc = true;
    search_params.pump_motor_nc = true;
    search_params.min_er = 0;
    search_params.max_er = 100;

    search_params.esfm = true;
    search_params.escc = true;
    search_params.il = true;
    search_params.rsv = true;
    search_params.st = true;
    search_params.min_er = 10;
    search_params.max_er = 100;
    search_params.cl = false;
    search_params.vl = false;
   
    res.render("ratings/index", {
        search : search_params
    });
});

router.get('/utilities', function(req, res) {
    var operators = default_search_operators();

    var search_params = req.session.search;
    if (!search_params ) {
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
    search_params.bare = false;
    search_params.pump_motor = false;
    search_params.pump_motor_cc = false;
    search_params.pump_motor_nc = false;

   

    res.render("ratings/utilities", {
        search : search_params
    });
});

router.get("/:id", function(req, res) {
    req.Participants.findOne({pumps : {$elemMatch: {'rating_id': req.params.id}}}, function(err, participant) {
        if ( !err && participant ) {

            var pump = participant.pumps.filter(p => p.rating_id == req.params.id)[0];
            console.log(pump);
            if (!pump || !participant.active || !pump.listed || !pump.active_admin) {
                req.flash("errorTitle", "Not Available");
                req.flash("errorMessage", "This pump is no longer listed in the Hydraulic Institute Energy Ratings Program");
                res.redirect("/error");
                return;
            }
            res.render("ratings/r_pump", {
                pump : pump, 
                participant : participant,
                pump_drawing : pump.doe? pump.doe.toLowerCase() +  ".png" : ""
            });
        }
        else {
            req.flash("errorTitle", "Not found");
            req.flash("errorMessage", err ? err : "This pump does not exist.");
            res.redirect("/error");
        }
    })
   
});



router.post("/count", function(req, res) {
    req.session.search = req.body.search;
    req.session.search.fresh = false;
    var operators = default_search_operators(req.session.search);
    req.Participants.aggregate(operators).exec(function(err, docs) {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ pumps: docs.length}));
    });
});

router.post("/search", function(req, res) {
    req.session.search = req.body.search;
    
    // Per HI request, you cannot search unless participant, basic_model or rating_id is specified.
    if ( !req.session.search.rating_id && !req.session.search.participant && !req.session.search.basic_model) {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ pumps: []}));
        return;
    }
   
    req.session.search.fresh = false;

    //prevent any other search parameters from being applied.
    var search_params = {
        rating_id : req.session.search.rating_id, 
        participant : req.session.search.participant, 
        basic_model : req.session.search.basic_model
    }
    
    var operators = default_search_operators(search_params);
    req.Participants.aggregate(operators).exec(function(err, docs) {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ pumps: docs}));
    });
});


module.exports = router;