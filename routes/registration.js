var express = require('express');

var router = express.Router();

router.get('/', function(req, res) {
    // Check if a user is logged in, if so, redirect to the correct landing page - 
    // either participant portal or admin portal.
    // If not logged in, the landing page is the signin/signup page.
	res.render("landing", {
	  
    });
});


module.exports = router;