const express = require('express');
const router = express.Router();

router.get('/', function(req, res) {
    req.log.debug("Rendering PEI calculator in standalone mode");
    res.render("pei/standalone", {
    });
});

module.exports = router;