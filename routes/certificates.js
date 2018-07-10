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

const load_certificate = async (req, pumpId) => {
    const blank = {
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
    const pump = await req.Pumps.findOne({
        rating_id: req.params.id
    }).populate('participant').exec();
    if (!pump) return blank;
    if (req.session.active_certificate && req.session.active_certificate.pump == pumpId) {
        return req.session.active_certificate;
    }
    if (req.certificate_cart && req.certificate_cart.length) {
        const matches = req.certificate_cart.filter(c => c.pump == pumpId);
        if (matches.length) {
            return matches[0];
        }
    }
    return blank;
}
router.get('/create/:id', aw(async (req, res) => {
    const pump = await req.Pumps.findOne({
        rating_id: req.params.id
    }).populate('participant').exec();
    res.render("ratings/certificates/create_start", {
        pump: pump,
        participant: pump.participant,
        pump_drawing: pump.doe ? pump.doe.toLowerCase() + ".png" : "",
        certificate: await load_certificate(req, req.params.id)
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


router.get('/input/:id', aw(async (req, res) => {
    const certificate = await load_certificate(req, req.params.id)
    if (req.params.id != certificate.pump) {
        return res.redirect(`/ratings/certificates/create/${req.params.id}`)
    }

    const pump = await req.Pumps.findOne({
        rating_id: req.params.id
    }).populate('participant').exec();


    res.render("ratings/certificates/create_input", {
        pump: pump,
        participant: pump.participant,
        certificate: certificate
    });
}));
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
    certificate.pump_record = pump;
    req.session.active_certificate = certificate

    if (!req.session.certificate_cart) {
        req.session.certificate_cart = [];
    }
    certificate.number = await req.getNextCertificateOrderNumber();
    req.session.certificate_cart.push(JSON.parse(JSON.stringify(certificate)));
    console.log(req.session.certificate_cart);
    res.redirect('/ratings/certificates/cart');
}));

router.get('/cart/delete/:number', aw(async (req, res) => {
    if (!req.session.certificate_cart) {
        req.session.certificate_cart = [];
    }
    req.session.certificate_cart = req.session.certificate_cart.filter(c => c.number != req.params.number);
    res.redirect('/ratings/certificates/cart');
}))

router.get("/cart", aw(async (req, res) => {
    console.log(req.session.certificate_cart);
    res.render("ratings/certificates/cart", {
        cart: req.session.certificate_cart
    });
}));


router.get("/checkout", aw(async (req, res) => {
    console.log(req.session.certificate_cart);
    res.render("ratings/certificates/estore-standin", {
        cart: req.session.certificate_cart
    });
}));


router.get("/purchased", aw(async (req, res) => {
    console.log(req.session.certificate_cart);
    res.render("ratings/certificates/purchased", {
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