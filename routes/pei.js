const express = require('express');
const router = express.Router();

router.get('/', function(req, res) {
    req.log.debug("Rendering PEI calculator in standalone mode");
    res.render("pei/standalone", {
    });
});


router.post('/api/calculate', function(req, res){
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ 
        pei: 23,
        energy_rating: 24, 
        energy_savings: 25
    }));
})

module.exports = router;