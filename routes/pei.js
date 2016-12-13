const express = require('express');
const router = express.Router();
const units = require('../utils/uom');


router.get('/', function(req, res) {
    var help = require("../public/resources/help.json");
    req.log.debug("Rendering PEI calculator in standalone mode");
    res.render("ratings/standalone", {
        help:help
    });
});

router.post('/api/calculate', function(req, res){
    var pump = req.body.pump;
    pump.doe = pump.doe.value;
    pump = units.convert_to_us(pump);

    var calculator = require("../calculator");
    var results = calculator.calculate(pump);
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(results));
})



module.exports = router;