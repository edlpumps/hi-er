const express = require('express');
const router = express.Router();

router.get('/', function(req, res) {
    req.log.debug("Rendering PEI calculator in standalone mode");
    res.render("ratings/standalone", {
    });
});

var pei_baselines = {
    ESCC : [1.09, 1.09],
    ESFM : [1.10, 1.09],
    IL: [1.11, 1.12],
    RSV: [1.00, 1.00],
    ST :[1.06, 1.09],
}

router.post('/api/calculate', function(req, res){
    var pump = req.body.pump;
    pump.doe = pump.doe.value;
    if ( pump.flow ) {
        if ( pump.load120) {
            pump.flow.bep75 = pump.flow.bep100 * 0.75;
            pump.flow.bep110 = pump.flow.bep100 * 1.1;
        }
        else {
            pump.flow.bep75 = pump.flow.bep100 /0.9 * 0.6;
            pump.flow.bep110 = pump.flow.bep100 /0.9;
        }
    }

    
      
    var calculator = require("../calculator");
    var results = calculator.calculate(pump);
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(results));
    console.log(JSON.stringify(pump, null, '\t'));
    console.log(results);
})

module.exports = router;