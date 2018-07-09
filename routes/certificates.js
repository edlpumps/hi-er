const express = require('express');
const router = express.Router();
const default_search_operators = require('../search').params;
const aw = require('./async_wrap');
const debug = require('debug')('certificates');


router.get('/', aw(async (req, res) => {
    res.render("ratings/certificates/index", {});
}))

router.get('/create', aw(async (req, res) => {
    const participants = await req.Participants.find({}, 'name').exec();
    res.render("ratings/certificates/create", {
        participants: participants.map(p => p.name),
        search: req.session.csearch ? req.session.csearch : {}
    });
}))

router.get('/search', aw(async (req, res) => {
    res.render("ratings/certificates/search", {});
}))

router.get('/create/:id', aw(async (req, res) => {
    const pump = await req.Pumps.findOne({
        rating_id: req.params.id
    }).populate('participant').exec();
    console.log(req.session.active_certificate)
    res.render("ratings/certificates/create_start", {
        pump: pump,
        participant: pump.participant,
        pump_drawing: pump.doe ? pump.doe.toLowerCase() + ".png" : "",
        certificate: req.session.active_certificate ? req.session.active_certificate : {
            packager: {},
            installation_site: {
                address: {}
            },
            motor: {
                manufacturer: '',
                model: '',
                efficiency: 0,
                power: 0
            },
            vfd: {
                manufacturer: '',
                model: '',
                power: 0
            }
        }
    });
}));


const get_calculation_type = (certificate, pump, motor, vfd) => {
    debug(`Mapping calculation type:`);
    debug(`\tSection ${pump.section}`)
    debug(`\tDOE ${pump.doe}`)
    debug(`\t+ Motor ${motor}`)
    debug(`\t+ VFD ${vfd}`)
    if (pump.section == '3') {
        if (motor && !vfd) {
            if (pump.doe == 'ST') {
                certificate.invalid = true;
                certificate.invalid_reason = 'This calculation is not applicable because only default motor efficiency values can be used for ST pumps.  No change to the ER will result'
                return;
            }
            debug('Setting calculation type to be 3-5')
            certificate.calculation_type = '3-to-5'
        } else if (motor && vfd) {
            debug('Setting calculation type to be 3-7')
            certificate.calculation_type = '3-to-7'
        } else {
            certificate.invalid = true;
            certificate.invalid_reason = 'You must add a motor to a bare pump if also adding a variable frequency drive.'
        }
    } else if (pump.section == '4') {
        if (vfd) {
            debug('Setting calculation type to be 4-7')
            certificate.calculation_type = '4-to-7';
        } else {
            certificate.invalid = true;
            certificate.invalid_reason = 'For pumps with motors, certificates can only be created when adding variable frequency drives.'
        }
    } else if (pump.section == '5') {
        if (vfd) {
            debug('Setting calculation type to be 5-7')
            certificate.calculation_type = '5-to-7';
        } else {
            certificate.invalid = true;
            certificate.invalid_reason = 'For pumps with motors, certificates can only be created when adding variable frequency drives.'
        }
    } else {
        certificate.invalid = true;
        certificate.invalid_reason = 'You cannot create an ER certificate for this pump.'
    }
}

router.post('/input/:id', aw(async (req, res) => {
    const pump = await req.Pumps.findOne({
        rating_id: req.params.id
    }).populate('participant').exec();
    const certificate = req.body;
    certificate.pump = req.params.id;

    if (!certificate.poles && !certificate.driver) {
        certificate.invalid = true;
        certificate.invaild_reason = 'You must add a motor or VFD, or both.'
    } else {

        get_calculation_type(certificate, pump, certificate.poles !== undefined, certificate.vfd !== undefined);
    }
    certificate.motor = {};
    certificate.driver = {};
    req.session.active_certificate = certificate

    res.render("ratings/certificates/create_input", {
        pump: pump,
        participant: pump.participant,
        certificate: certificate
    });
}));

router.post('/calculate/:id', aw(async (req, res) => {
    const pump = await req.Pumps.findOne({
        rating_id: req.params.id
    }).populate('participant').exec();
    const certificate = req.session.active_certificate
    certificate.motor = req.body.certificate.motor
    certificate.driver = req.body.certificate.driver

    // Do calculations here
    certificate.pei = .94;
    certificate.energy_rating = 56;

    req.session.active_certificate = certificate
    res.render("ratings/certificates/create_calculated", {
        pump: pump,
        participant: pump.participant,
        certificate: certificate
    });
}));

router.post('/purchase/:id', aw(async (req, res) => {
    const pump = await req.Pumps.findOne({
        rating_id: req.params.id
    }).populate('participant').exec();
    const certificate = req.session.active_certificate
    certificate.quantity = req.body.certificate.quantity
    req.session.active_certificate = certificate

    if (!req.session.certificate_cart) {
        req.session.certificate_cart = [];
    }
    req.session.certificate_cart.push(JSON.parse(JSON.stringify(certificate)));
    res.redirect('/ratings/certificates/cart');
}));

router.get("/cart", aw(async (req, res) => {
    res.render("ratings/certificates/cart", {
        cart: req.session.certificate_cart
    });
}));

router.get("/er-pump/:id", aw(async (req, res) => {
    const pump = await req.Pumps.findOne({
        rating_id: req.params.id
    }).populate('participant').exec();

    if (!pump || !pump.participant.active || pump.pending || !pump.active_admin || pump.participant.subscription.status != 'Active') {
        req.flash("errorTitle", "Not Available");
        req.flash("errorMessage", "No pump corresponding to this ID is listed in the Hydraulic Institute Energy Ratings Program");
        res.redirect("/error");
        return;
    }
    res.render("ratings/certificates/c_pump", {
        pump: pump,
        participant: pump.participant,
        pump_drawing: pump.doe ? pump.doe.toLowerCase() + ".png" : ""
    });
}));

module.exports = router;