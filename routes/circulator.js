const express = require('express');
const router = express.Router();
const aw = require('./async_wrap');
const template = require('./circulator_template_map.json');
const path = require('path');
const fs = require('fs');
const Circulator = require('../controllers/circulator');
const units = require('../utils/uom');
const Hashids = require('hashids');
const hashids = new Hashids("hydraulic institute", 6, 'ABCDEFGHIJKLMNPQRSTUVWXYZ123456789');
const svg_builder = require('../utils/label_builder.js');
const { Resvg } = require('@resvg/resvg-js');

const svg_opts = {
    font: {
        fontFiles: [path.join(__dirname, '../utils/fonts/Arimo-Regular.ttf'), 
            path.join(__dirname, '../utils/fonts/Arimo-Bold.ttf'), 
        ], // font files to use
        defaultFontFamily: 'Arimo' // font name to use
    }
}

const model_check = async (req, pump) => {
    return {
        ok: true,
        subscription_limit: false
    };
}


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
    let result = await Circulator.load_file(req.participant, req.labs, units.US, req.files.template.file);
    const existing = await req.Circulators.find({}, 'basic_model manufacturer_model listed least.energy_rating most.energy_rating');
    result.ready = Circulator.check_import(result.ready, existing);
    for (const f of result.ready.filter(r => r.failure)) {
        result.failed.push(f);
    }
    result.ready = result.ready.filter(r => !r.failure);

    res.render("participant/circulator_upload_confirm", {
        user: req.user,
        participant: req.participant,
        succeeded: result.ready,
        failed: result.failed
    });
}));


router.post("/save_upload", aw(async (req, res) => {
    if (!req.user.participant_edit) {
        req.log.info("Submit pump attempted by unauthorized user");
        req.log.info(req.user);
        res.redirect("/unauthorized");
        return;
    }
    const pumps = JSON.parse(req.body.pumps);
    for (const pump of pumps) {
        let list_now = req.body.list_pumps ? true : false;
        console.warn("------------------------------------------------------------");
        console.warn("Unimplemented:  Published pump conflict (list activation)");
        console.warn("------------------------------------------------------------");
        /*
        const check = await model_check(req, pump, req.participant, pumps);
        // list_now could be true, based on user request, but we
        // may need to override that choice, based on subscription or 
        // model number collision.
        if (!check.ok) {
            list_now = false;
        }
        */

        pump.date = new Date();
        pump.pending = !list_now;
        pump.listed = list_now;
        pump.participant = req.participant._id;
        // Ignore what's in the spreadsheet - the participant name attached to the pump
        // must always be the currently logged in participant.

        const toSave = new req.Circulators(pump);
        toSave.revisions.push({
            date: new Date(),
            note: "Pump created.",
            correct: false
        })
        const nextId = await req.getNextRatingsId();
        toSave.rating_id = hashids.encode(nextId.value.seq);
        req.log.info(toSave.rating_id + " saved");

        await toSave.save();
    }
    res.redirect("/participant/circulators");

}));


router.get('/download', aw(async (req, res) => {
    const pumps = await req.Circulators.find({
        participant: req.participant
    }).exec();

    const file = await Circulator.export(pumps, req.session.unit_set);
    res.download(file, 'Pump Listings.xlsx', function (err) {
        if (err) console.error(err);
        else fs.unlink(file, function () {
            console.log('Removed template');
        });
    });
}));

router.get("/search", aw(async (req, res) => {
    console.log(req.query.q);

    const pumps = await req.Circulators.find({
        participant: req.participant._id
    }).sort({
        basic_model: 1,
        manufacturer_model: 1
    }).lean().exec();

    /* Doing an in-code filter for search, low load in circulators */
    const query = (pump) => {
        if (!req.query.q) return true;
        const keys = ['basic_model', 'manufacturer_model', 'type', 'rating_id'];
        for (const key of keys) {
            if (pump[key].toLowerCase().indexOf(req.query.q.toLowerCase()) >= 0) return true;
        }
        return false;
    }

    res.setHeader('Content-Type', 'application/json');

    res.end(JSON.stringify({
        pumps: pumps.filter(query)
    }));
}));

router.get("/:id/revise", aw(async (req, res) => {
    if (!req.user.participant_edit) {
        req.log.info("Revise pump attempted by unauthorized user");
        req.log.info(req.user);
        res.redirect("/unauthorized");
        return;
    }
    let pump = await req.Circulators.findById(req.params.id).exec();
    if (!pump) {
        return res.sendStatus(404);
    }

    if (req.session.unit_set == units.METRIC) {
        // pumps are stored internally in US units.
        pump = units.convert_circulator_to_metric(pump);
    }
    var help = require("../public/resources/help.json");
    res.render("participant/p_circulator_revise", {
        user: req.user,
        participant: req.participant,
        pump: pump,
        help: help,
        revision: true
    });
}));

router.post("/:id/revise", aw(async (req, res) => {
    if (!req.user.participant_edit) {
        req.log.info("Revise pump attempted by unauthorized user");
        req.log.info(req.user);
        res.redirect("/unauthorized");
        return;
    }
    let pump = await req.Circulators.findById(req.params.id).exec();
    if (!pump) {
        return res.sendStatus(404);
    }
    let revision = req.body.pump;
    if (req.session.unit_set == units.METRIC) {
        // pumps are stored internally in US units, switch to US to do calcs.
        revision = units.convert_circulator_to_us(revision);
    }

    const results = Circulator.calculate_assembled_circulator(revision);
    res.json(results);
}));

// This route actually applies / saves the revision itself.
router.put("/:id/revise", aw(async (req, res) => {
    if (!req.user.participant_edit) {
        req.log.info("Revise pump attempted by unauthorized user");
        req.log.info(req.user);
        res.redirect("/unauthorized");
        return;
    }
    let pump = await req.Circulators.findById(req.params.id).exec();
    if (!pump) {
        return res.sendStatus(404);
    }
    let revision = req.body.pump;
    if (req.session.unit_set == units.METRIC) {
        // pumps are stored internally in US units, switch to US to do calcs.
        revision = units.convert_circulator_to_us(revision);
    }
    const results = Circulator.calculate_assembled_circulator(revision);
    pump = Object.assign(pump, results);
    pump.revisions.push({
        data: new Date(),
        note: req.body.revision_note,
        correction: true
    });
    await pump.save();
    res.sendStatus(200);
}));

router.get('/:id', aw(async (req, res) => {
    req.log.debug("Rendering participant portal (circulator pump page)");
    const pump = await req.Circulators.findById(req.params.id).exec();
    if (!pump) {
        return res.sendStatus(404);
    }

    const check = await model_check(req, pump);
    res.render("participant/p_circulator", {
        user: req.user,
        participant: req.participant,
        pump: pump,
        can_activate: check,
        subscription_limit: check.subscription_limit,
    });
}));



router.post('/:id', aw(async (req, res) => {
    if (!req.user.participant_edit) {
        req.log.info("Save pump attempted by unauthorized user");
        req.log.info(req.user);
        res.redirect("/unauthorized");
        return;
    }
    const pump = await req.Circulators.findById(req.params.id).exec();
    if (pump) {
        pump.listed = req.body.listed;
        const check = await model_check(req, pump, req.participant);
        if (pump.listed && !check.ok) {
            pump.listed = false;
        }
        if (pump.listed) pump.pending = false;
    }
    pump.save(function (err) {
        if (err) {
            req.log.error(err);
        }
        res.redirect("/participant/circulators");
    })

}));

router.get('/:id/export', aw(async (req, res) => {
    const pump = await req.Circulators.findById(req.params.id).exec();
    if (!pump) {
        return res.sendStatus(404);
    }
    const file = await Circulator.export([pump], req.session.unit_set);
    res.download(file, 'Pump Listings.xlsx', function (err) {
        if (err) console.error(err);
        else fs.unlink(file, function () {
            console.log('Removed template');
        });
    });
}));

router.delete('/:id', aw(async (req, res) => {
    // Ensure this pump is owned by the participant of the route.'
    const pump = await req.Circulators.findById(req.params.id).populate('participant').exec();
    if (!pump) {
        return res.sendStatus(404);
    } else if (req.participant._id.toString() !== pump.participant._id.toString()) {
        return res.sendStatus(401);
    }
    await req.Circulators.remove({
        _id: req.params.id
    });
    res.sendStatus(200)
}));


router.get('/:id/svg/label', aw(async (req, res) => {
    const pump = await req.Circulators.findById(req.params.id).populate('participant').exec();
    const svg = svg_builder.make_circulator_label(req, pump.participant, pump);
    if (req.query.download) {
        res.setHeader('Content-disposition', 'attachment; filename=Energy Rating Label - ' + pump.rating_id + '.svg');
    }
    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(svg);
}));
router.get('/:id/png/label', aw(async (req, res) => {
    const pump = await req.Circulators.findById(req.params.id).populate('participant').exec();
    const svg = svg_builder.make_circulator_label(req, pump.participant, pump);
    const resvg = new Resvg(svg,svg_opts);
    const png_data = resvg.render();
    const png_buffer = png_data.asPng();
    if (req.query.download) {
        res.setHeader('Content-disposition', 'attachment; filename=Energy Rating QR - ' + pump.rating_id + '.png');
    }
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Length', png_buffer.length);
    res.status(200).send(png_buffer);
}));

router.get('/:id/svg/sm-label', aw(async (req, res) => {
    const pump = await req.Circulators.findById(req.params.id).populate('participant').exec();
    const svg = svg_builder.make_circulator_label_small(req, pump.participant, pump);
    if (req.query.download) {
        res.setHeader('Content-disposition', 'attachment; filename=Energy Rating Label - ' + pump.rating_id + '.svg');
    }
    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(svg);
}));
router.get('/:id/png/sm-label', aw(async (req, res) => {
    const pump = await req.Circulators.findById(req.params.id).populate('participant').exec();
    const svg = svg_builder.make_circulator_label_small(req, pump.participant, pump);
    const resvg = new Resvg(svg,svg_opts);
    const png_data = resvg.render();
    const png_buffer = png_data.asPng();
    if (req.query.download) {
        res.setHeader('Content-disposition', 'attachment; filename=Energy Rating Label (sm)  - ' + pump.rating_id + '.png');
    }
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Length', png_buffer.length);
    res.status(200).send(png_buffer);
}));
router.get('/:id/svg/qr', aw(async (req, res) => {
    const pump = await req.Circulators.findById(req.params.id).populate('participant').exec();
    const svg = svg_builder.make_circulator_qr(req, pump.participant, pump);
    if (req.query.download) {
        res.setHeader('Content-disposition', 'attachment; filename=Energy Rating QR - ' + pump.rating_id + '.svg');
    }
    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(svg)
}));
router.get('/:id/png/qr', aw(async (req, res) => {
    const pump = await req.Circulators.findById(req.params.id).populate('participant').exec();
    const svg = svg_builder.make_circulator_qr(req, pump.participant, pump);
    const resvg = new Resvg(svg,svg_opts);
    const png_data = resvg.render();
    const png_buffer = png_data.asPng();
    if (req.query.download) {
        res.setHeader('Content-disposition', 'attachment; filename=Energy Rating QR - ' + pump.rating_id + '.png');
    }
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Length', png_buffer.length);
    res.status(200).send(png_buffer);
}));




module.exports = router;