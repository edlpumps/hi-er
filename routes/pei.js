const express = require('express');
const router = express.Router();

router.get('/', function(req, res) {
    req.log.debug("Rendering PEI calculator in standalone mode");
    res.render("pei/standalone", {
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
    res.setHeader('Content-Type', 'application/json');
    console.log(req.body.pump);
    var pei = req.body.pump.pei || 1.23;
    var baseline = pei_baselines[req.body.pump.doe.value][req.body.pump.speed/1800-1];
    console.log("BASELINE = " + baseline);
    var er = ((pei - baseline) * 100);
    console.log("RAW ER" + er);
    var power = req.body.pump.motor_power_rated || 200;
    var es = (er / 100 * power).toFixed(0);
    er = er.toFixed(0);


    res.end(JSON.stringify({ 
        pei: pei,
        energy_rating: er, 
        energy_savings: es, 
        pei_baseline : baseline
    }));
})

module.exports = router;