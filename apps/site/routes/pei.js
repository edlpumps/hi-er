const express = require('express');
const router = express.Router();
const units = require('../utils/uom');
const common = require('./common');

router.get('/', function(req, res) {
    var help = require("../public/resources/help.json");
    //PEI Calculator Enabled code
    if (false) {
    req.log.debug("Rendering PEI calculator in standalone mode");
    res.render("ratings/standalone", {
        help:help
    });
    res.render()
    }

    //PEI Calculator Disabled Code
    //Disabled 02/21/2024
    req.log.debug("PEI Calculator DISABLED");
    req.flash("errorTitle", "Pump Energy Index Calculator");
    req.flash("errorMessage", "We apologize, but the PEI Calculator is disabled until the updated regulatory rules are published and available.  Please check back again later. (Posted: 02/21/2024)");
    res.redirect("/error");
});

var get_labels = function(req, res, next) {
    req.Labels.find({}, function(err, labels) {
        req.current_labels = labels;
        next();
    });
}

router.post('/api/calculate', get_labels, function(req, res){
    var pump = req.body.pump;
    pump.doe = pump.doe.value;
    pump = units.convert_to_us(pump);

    var calculator = require("../calculator");
    // do not do label checks if using public calculator (auto=true)
    var results = calculator.calculate(pump, pump.auto ? undefined : req.current_labels);
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(results));
})

router.post('/download', function(req, res) {
    var pump = req.body.pump;
    pump.results = JSON.parse(pump.results);
    if ( pump.section == "3" ) {
        pump.motor_power_rated = pump.results.motor_power_rated;
        if ( req.session.unit_set == units.METRIC) {
            pump.motor_power_rated = units.convert_motor_rated_power_result(pump.motor_power_rated)
        }
    }
    pump.calculator = true;
    common.build_pump_spreadsheet(pump, req.session.unit_set, function(error, file, cleanup) {
        res.download(file, 'Pump Listings.xlsx', function(err){
            cleanup();
        });
    });
})


module.exports = router;