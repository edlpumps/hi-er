const express = require('express');
const router = express.Router();
const aw = require('./async_wrap');
const debug = require('debug')('certificates');
const debug_estore = require('debug')('cert-estore');
const Hashids = require('hashids');
const hashids = new Hashids("hydraulic institute", 10, 'ABCDEFGHIJKLMNPQRSTUVWXYZ123456789');
const path = require('path');
const pdf = require('html-pdf');
const pug = require('pug');
const archiver = require('archiver');
const certcalc = require('../certificate_calculator');
const moment = require('moment');
const calculator = require('../calculator');
const cert_exports = require('../certificate-export');

router.get('/', aw(async (req, res) => {
    res.render("ratings/certificates/index", {});
}))

router.get('/create', aw(async (req, res) => {
    const participants = await req.Participants.find({
        $and: [{
            active: true,
            'subscription.status': 'Active'
        }]
    }, 'name').exec();
    res.render("ratings/certificates/create", {
        participants: participants.map(p => p.name),
        search: req.session.csearch ? req.session.csearch : {}
    });
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
        poles: true,
        vfd: false,
        driver: {
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
        powers: certcalc.motor_powers(),
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

    if (!certificate.poles && !certificate.vfd) {
        certificate.invalid = true;
        certificate.invalid_reason = 'You must add a motor or VFD, or both.'
        res.render("ratings/certificates/create_input", {
            pump: pump,
            powers: certcalc.motor_powers(),

            participant: pump.participant,
            certificate: certificate
        });
        return;
    } else {

        get_calculation_type(certificate, pump, certificate.poles !== undefined, certificate.vfd !== undefined);
    }
    certificate.motor = {};
    certificate.driver = {};
    req.session.active_certificate = certificate

    res.render("ratings/certificates/create_input", {
        pump: pump,
        powers: certcalc.motor_powers(),

        participant: pump.participant,
        certificate: certificate
    });
}));

router.post('/calculate/:id', aw(async (req, res) => {
    const pump = await req.Pumps.findOne({
        rating_id: req.params.id
    }).populate('participant').exec();
    let certificate = req.session.active_certificate
    certificate.motor = req.body.certificate.motor
    certificate.driver = req.body.certificate.driver

    // Do calculations here
    certcalc.prepare_pump(pump);
    switch (certificate.calculation_type) {
        case '3-to-5':
            certificate = certcalc.calculate_3_to_5(pump, certificate);
            break;
        case '3-to-7':
            certificate = certcalc.calculate_3_to_7(pump, certificate)
            break;
        case '4-to-7':
        case '5-to-7':
            certificate = certcalc.calculate_4_5_to_7(pump, certificate);
            break;
        default:
            console.log("INVALID certificate calculation type = " + certificate.calculation_type);
            return res.sendStatus(406);

    }

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
    res.render("ratings/certificates/cart", {
        cart: req.session.certificate_cart
    });
}));


router.get("/checkout", aw(async (req, res) => {
    //This has been modified to skip the EStore so it handles the 'pending' and 'completed' states
    //of the checkout process
    let quantity = 0;
    for (const c of req.session.certificate_cart) {
        quantity += parseInt(c.quantity);
    }

    const ct = await req.CertificateTransactions.create({
        date: new Date(),
        state: 'pending',
        cart: req.session.certificate_cart,
        quantity: quantity
    });


    if (!req.session.certificate_transactions) {
        req.session.certificate_transactions = [];
    }
    req.session.certificate_transactions.push(ct);

    const d = new Date();
    const purchased = [];
    for (const c of ct.cart) {
        for (let i = 0; i < c.quantity; i++) {
            var nextId;
            var cnumber;
            var exists;
            console.log('==============Certificate: '+(i+1)+' of '+ c.quantity+' for Pump: '+c.pump_record._id+'=================');
            do {
                nextId = await req.getNextCertificateNumber();
                console.log("Next Cert ID: "+nextId);
                cnumber = hashids.encode(nextId);
                console.log("CertNumber: "+cnumber);
                //Does it already exist?
                exists = await req.Certificates.findOne({
                    certificate_number: cnumber
                }).populate('pump').exec();
                console.log('---------------------')
            } while (exists)
            console.log('==========================================================')
            const certificate = await req.Certificates.create({
                packager: c.packager,
                installation_site: c.installation_site,
                pump: c.pump_record._id,
                motor: c.motor,
                vfd: c.driver,
                pei: c.pei,
                energy_rating: c.energy_rating,
                certificate_number: cnumber,
                date: d,
                transaction: ct._id
            });
            purchased.push(certificate);
        }
    }
    ct.state = 'completed';

    await ct.save();
   
    req.session.purchased = await req.Certificates.find({
        transaction: ct._id
    }).populate('pump').exec();
    req.session.certificate_cart = [];

    res.render("ratings/certificates/purchased", {
        purchased: req.session.purchased,
        transaction: ct
    });
    //Enable this for EStore and modify code above to use estore redirect
    //Look for EStore removal around 10/15/2023
    /*const estore = `${process.env.ESTORE_CERTIFICATE_URL}?TID=${ct._id}&qty=${quantity}`;

    //res.redirect(estore);

    res.render("ratings/certificates/estore-standin", {
        cart: req.session.certificate_cart,
        transaction: ct
    });*/
}));

//Only used by EStore
const authorize_confirmation = (req, transactionId) => {
    const crypto = require('crypto');
    debug_estore(`Checking confirmation of transaction ${transactionId}`)
    if (!process.env.ESTORE_CONFIRMATION_SECRET) {
        debug_estore(`No check performed, no estore secret defined in environment`);
        return true;
    }

    const auth = req.headers.authorization;
    debug_estore(`Authorization Header:  ${auth}`);
    if (auth && auth.split(' ').length == 2) {
        const hash = auth.split(' ')[1].trim();
        const check = crypto.createHmac('sha512', process.env.ESTORE_CONFIRMATION_SECRET)
            .update(transactionId)
            .digest('base64');

        debug_estore(`Check hash:  ${check}`);
        debug_estore(`Hash in request:  ${hash}`);
        return hash === check;
    } else {
        debug_estore(`No Authorization header on request, cannot authorize.`);
        return false;
    }
}

//Only used by EStore
router.post("/confirmed/:transactionId", aw(async (req, res) => {
    const ct = await req.CertificateTransactions.findById(req.params.transactionId).exec();
    if (!ct) {
        res.sendStatus(404, 'Transaction not found');
        return;
    }
    if (!authorize_confirmation(req, req.params.transactionId)) {
        debug_estore(`Authorization failed for certificate transaction confirmation.  Returning 401 to sender`);
        res.sendStatus(401);
        return;
    }
    const d = new Date();
    const purchased = [];
    for (const c of ct.cart) {
        for (let i = 0; i < c.quantity; i++) {
            const nextId = await req.getNextCertificateNumber();
            const cnumber = hashids.encode(nextId);

            const certificate = await req.Certificates.create({
                packager: c.packager,
                installation_site: c.installation_site,
                pump: c.pump_record._id,
                motor: c.motor,
                vfd: c.driver,
                pei: c.pei,
                energy_rating: c.energy_rating,
                certificate_number: cnumber,
                date: d,
                transaction: ct._id
            });
            purchased.push(certificate);
        }
    }
    ct.state = 'completed';


    await ct.save();
    res.sendStatus(200);
    
    res.redirect(`/ratings/certificates/purchased/${ct._id}`)
    
}))

router.get("/purchased/:transactionId", aw(async (req, res) => {
    const ct = await req.CertificateTransactions.findById(req.params.transactionId).exec();
    if (!ct || ct.state != 'completed') {
        res.sendStatus(404, 'Transaction not found');
        return;
    }
    req.session.purchased = await req.Certificates.find({
        transaction: ct._id
    }).populate('pump').exec();
    req.session.certificate_cart = [];

    res.render("ratings/certificates/purchased", {
        purchased: req.session.purchased,
        transaction: ct
    });
}));

const make_pdf = async (certificate) => {
    const template = pug.compileFile(path.join(__dirname, '../views/ratings/certificates/certificate-pdf.jade'))
    const html = template({
        certificate: certificate,
        moment: moment
    })

    const options = {
        format: 'Letter',
        header: {
            height: '20px',
        },
        footer: {
            height: '1in',
        },
    };
    return new Promise((resolve, reject) => {
        pdf.create(html, options).toStream(function (err, stream) {
            if (err) reject(err);
            else resolve(stream)
        });
    });

}
const add_to_zip = async (archive, certificate) => {
    const pdf_stream = await make_pdf(certificate);
    archive.append(pdf_stream, {
        name: `${certificate.certificate_number}.pdf`
    });
}

router.get("/purchased/:transactionId/zip", aw(async (req, res) => {
    var archive = archiver('zip', {
        zlib: {
            level: 9
        }
    });
    const ct = await req.CertificateTransactions.findById(req.params.transactionId).exec();
    if (!ct || ct.state != 'completed') {
        res.sendStatus(404, 'Transaction not found');
        return;
    }
    const certificates = await req.Certificates.find({
        transaction: ct._id
    }).populate('pump').exec();

    for (const certificate of certificates) {
        await add_to_zip(archive, certificate);
    }
    archive.finalize();
    res.writeHead(200, {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename=${req.params.transactionId}.zip`
    });
    archive.pipe(res);
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
    
    pump.cee_tier = calculator.calculate_pump_hp_group_and_tier(pump).cee_tier;
    pump.cee_tier = pump.cee_tier == "None"? "": pump.cee_tier;
    res.render("ratings/certificates/c_pump", {
        pump: pump,
        participant: pump.participant,
        pump_drawing: pump.doe ? pump.doe.toLowerCase() + ".png" : ""
    });
}));

router.get("/certificate/:cnumber", aw(async (req, res) => {
    const ct = await req.Certificates.findOne({
        certificate_number: req.params.cnumber
    }).populate('pump').exec();
    if (!ct) {
        return res.sendStatus(404, 'Certificate not found');
    }
    if (!ct.pump) {
        return res.sendStatus(404, 'Pump not found for this certificate');
    }
    res.render("ratings/certificates/certificate", {
        certificate: ct
    });
}));




router.get('/search', aw(async (req, res) => {
    const packagers = await req.Certificates.aggregate([{
        $group: {
            _id: '$packager.company'
        }
    }]);
    let filtered = cert_exports.filterCertificates(packagers, req.user);
    const companies = filtered.map(p => p._id);
    res.render("ratings/certificates/search", {
        companies: companies,
        search: req.session.csearch
    });
}))


router.post("/search/:skip/:limit", aw(async (req, res) => {
    const search = req.body.search;
    req.session.csearch = search;
    const skip = parseInt(req.params.skip);
    const limit = parseInt(req.params.limit);

    const q = {

    }
    if (search.company) {
        q['packager.company'] = search.company;
    }
    if (search.cnumber) {
        q.certificate_number = search.cnumber
    }
    const certificates = await req.Certificates.find(q).skip(skip).limit(limit).populate('pump').populate('pump.participant').exec();
    let count = await req.Certificates.count(q);
    let filtered = cert_exports.filterCertificates(certificates, req.user);
    // Reduce the count by the number of items we filtered out
    count = count - (certificates.length - filtered.length);
    let rows = [];
    for (var row of filtered) {
        let retval = calculator.calculate_certificate_hp_group_and_tier(row);
        row._doc.hp_group = retval.hp_group;
        row._doc.cee_tier = retval.cee_tier == "None"? "": retval.cee_tier;
        rows.push(row);
    }
    res.json({
        certificates: rows,
        total: count
    });
}));

module.exports = router;