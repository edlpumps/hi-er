const express = require('express');
const router = express.Router();
const aw = require('./async_wrap');
const template = require('./circulator_template_map.json');
const path = require('path');
const fs = require('fs');
const Circulator = require('../controllers/circulator');
const units = require('../utils/uom');

router.use(async (req, res, next) => {
    const labs = await req.Labs.find({
        _id: {
            $in: req.participant.labs
        }
    }).exec();
    req.labs = labs;
    next();
})

router.get('/', aw(async (req, res) => {
    req.log.debug("Rendering participant portal (circulator pumps)");
    /*const pumps = await req.Pumps.find({
        participant: req.participant._id
    }).sort({
        basic_model: 1,
        individual_model: 1
    }).lean().exec();
    const published = pumps.filter(p => p.listed);*/
    res.render("participant/p_circulators", {
        user: req.user,
        participant: req.participant,
        //section_label: common.section_label,
        subscription_limit: false, //published.length >= req.participant.subscription.pumps,
        subscription_missing: false, //req.participant.subscription.status != 'Active',
        pump_search_query: req.session.pump_search_query
    });
}));

router.get('/template', function (req, res) {
    const filePath = path.join(__dirname, template.config.filename);
    const stat = fs.statSync(filePath);

    res.writeHead(200, {
        'Content-Type': 'application/vnd.openxmlformats',
        'Content-Disposition': "attachment; filename=" + "Circulator Pump Energy Ratings.xlsx",
        'Content-Length': stat.size
    });
    var readStream = fs.createReadStream(filePath);
    readStream.pipe(res);
})

router.get("/upload", function (req, res) {
    req.log.debug("Rendering participant circulator pump upload");
    res.render("participant/upload_circulator", {
        user: req.user,
        participant: req.participant,
        template: {
            version: template.config.version,
            revision_date: template.config.revision_date
        }
    });
});

router.post("/upload", aw(async (req, res) => {
    if (!req.files || !req.files.template) {
        res.send('No files were uploaded.');
        return;
    }

    const result = await Circulator.load_file(req.participant, req.labs, units.US, req.files.template.file);

    res.render("participant/circulator_upload_confirm", {
        user: req.user,
        participant: req.participant,
        succeeded: result.ready,
        failed: result.failed
    });
}));


router.post('/upload', aw(async (req, res) => {


}));



module.exports = router;