require('dotenv').config({
    silent: true
});
const fs = require('fs');
const path = require('path');
const http = require('http');
// https://mishkaorakzai.medium.com/how-to-redirect-your-node-js-app-hosted-on-heroku-from-http-to-https-50ef80130bff
const sslRedirect = require('heroku-ssl-redirect');
const express = require('express');
const app = express();
const busboy = require('express-busboy');
const session = require('express-session');
const favicon = require('serve-favicon');
const cookieParser = require('cookie-parser');
const flash = require('express-flash')
const helmet = require('helmet');
const bunyan = require('bunyan');

const mongoose = require("mongoose");
const schemas = require("./schemas");
const units = require('./utils/uom');
const lang = require('./utils/language');
const MongoStore = require('connect-mongo')(session);
const passport = require('passport');
const Strategy = require('passport-local').Strategy;
const port = process.env.PORT || 3003;
const data_connection_str = process.env.MONGO_CONNECTION_DATA;
const exporter = require('./exporter');

let session_store = null;
let mainlog = bunyan.createLogger({
    name: 'hi',
    level: process.env.LOG_LEVEL
});

//////////////////////////////////////////////////
////   Language Configuration using i18next library
//////////////////////////////////////////////////
const i18next = require('i18next');
const i18nextMiddleware = require('i18next-http-middleware');
const i18nextBackend = require('i18next-fs-backend');

async function initializeI18next() {
    await i18next.use(i18nextBackend).use(i18nextMiddleware.LanguageDetector)
    .init({
        lng: 'en',
        fallbackLng: 'en',
        preload: ['en', 'fr'],
        ns: ['translation'],
        defaultNS: 'translation',
        backend: {
            loadPath: path.join(__dirname, 'locales/{{lng}}/translation.json'),
        }
    });
}

////////////////////////////////////////////////////
// Basic express configuration
////////////////////////////////////////////////////
app.set('port', port);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');

var configure = function () {
    app.use(i18nextMiddleware.handle(i18next));
    app.use(sslRedirect());
    app.use(favicon(__dirname + '/public/images/favicon.ico'));
    app.use(require('less-middleware')(__dirname + '/public'));
    app.use(express.static(__dirname + '/public'));
    app.use(cookieParser());
    app.use(session({
        secret: 'intelliquip',
        store: session_store,
        resave: true,
        saveUninitialized: true
    }));

    app.use(helmet());
    app.use(flash());
    busboy.extend(app, {
        upload: true,
        limits: {
            fieldSize: 1024 * 1024 * 1024,

        }
    });

    ////////////////////////////////////////////////////
    // Logging configuration, main log added to each
    // request object.
    ////////////////////////////////////////////////////
    app.use(function (req, res, next) {
        req.log = mainlog;
        next();
    });

    app.use(passport.initialize());
    app.use(passport.session());
    app.locals.passport = passport;


    ////////////////////////////////////////////////////
    // Route configuration
    ////////////////////////////////////////////////////
    app.use(function (req, res, next) {
        req.Participants = req.app.locals.db.Participants;
        req.Pumps = req.app.locals.db.Pumps;
        req.Circulators = req.app.locals.db.Circulators;
        req.Users = req.app.locals.db.Users;
        req.Labels = req.app.locals.db.Labels;
        req.Labs = req.app.locals.db.Labs;
        req.Subscribers = req.app.locals.db.Subscribers;
        req.Certificates = req.app.locals.db.Certificates;
        req.CertificateTransactions = req.app.locals.db.CertificateTransactions
        req.getNextRatingsId = req.app.locals.db.getNextRatingsId;
        req.getNextCertificateOrderNumber = req.app.locals.db.getNextCertificateOrderNumber;
        req.getNextCertificateNumber = req.app.locals.db.getNextCertificateNumber;
        req.PasswordResets = req.app.locals.db.PasswordResets;
        req.base_url = req.protocol + '://' + req.get('Host');
        next();
    })

    app.use(function (req, res, next) {
        if (!req.session.unit_set) {
            req.session.unit_set = units.US;
        }
        if (!req.session.lang_set) {
            req.session.lang_set = 'en';
            lang.set_language(req, res, 'en');
        }
        res.locals.certificate_cart_exists = req.session.certificate_cart ? req.session.certificate_cart.length > 0 : false;
        res.locals.unit_set = req.session.unit_set;
        res.locals.ESTORE_ADMIN_EMAIL = process.env.ESTORE_ADMIN_EMAIL;
        res.locals.units = units.make_units(res.locals.unit_set);
        res.locals.lang_set = req.session.lang_set;
        res.locals.label_lang = lang.get_label_language();
        res.locals.page_lang = lang.get_page_language();

        res.locals.moment = require('moment');
        next();
    });

    const root = require("./routes/registration");
    const participant = require("./routes/participant");
    const admin = require("./routes/admin");
    const pei = require("./routes/pei");
    const labels = require("./routes/labels");
    const ratings = require("./routes/ratings");
    const circulator_ratings = require("./routes/circulator-ratings");
    const downloads = require("./routes/downloads");

    app.use("/", root);
    app.use("/participant", participant);
    app.use("/admin", admin);
    app.use("/pei", pei);
    app.use("/labels", labels);
    app.use("/ratings", ratings);
    app.use("/circulator/ratings", circulator_ratings);
    app.use("/downloads", downloads);

    root.get("/lcc", async (req, res) => {
        res.redirect("/downloads/lcc.csv");
    });

    root.get("/circulator-ratings-summary", (req, res) => {
        res.redirect("/downloads/circulator-ratings/summary.csv");
    })

    root.get("/circulator-ratings-summary-details", (req, res) => {
        res.redirect("/downloads/circulator-ratings/summary-details.csv");
    })

    root.post('/login',
        passport.authenticate('local', {
            failureRedirect: '/portal'
        }),
        function (req, res) {
            res.cookie('email', req.body.email);
            req.log.debug("User authenticated, redirecting to landing page");
            res.redirect('/');
        });

    root.get('/logout', function (req, res) {
        req.logOut();
        res.redirect('/portal')
    });

    root.post('/units', function (req, res) {
        var unit_set = req.body.unit_set;
        if (unit_set == units.US || unit_set == units.METRIC) {
            req.session.unit_set = unit_set;
        }
        res.status(200).send();
    });

    root.post('/language', function (req, res) {
        var lang_set = req.body.lang_set;
        if (lang_set.includes('en') || lang_set.includes('fr')) {
            lang.set_language(req, res, lang_set);
        }
        res.status(200).send();
    });

    app.use("/error", function (req, res) {
        res.render("error", {});
    })
    app.use("/disabled", function (req, res) {
        res.render("disabled", {});
    })
    app.use("/unauthorized", function (req, res) {
        res.render("unauthorized", {});
    })
}



////////////////////////////////////////////////////
// Database configuration
////////////////////////////////////////////////////
// Per deprecation warning
mongoose.set('strictQuery', false);

var conn = mongoose.connect(data_connection_str, {
}, function (err, res) {
    if (err) {
        mainlog.fatal("Could not connect to mongo database at %s", data_connection_str);
    } else {
        mainlog.info("Connected to mongo database at %s", data_connection_str);
        schemas.init(mongoose);
        app.locals.db = {
            Users: schemas.Users,
            Participants: schemas.Participants,
            Circulators: schemas.Circulators,
            Pumps: schemas.Pumps,
            Labels: schemas.Labels,
            Labs: schemas.Labs,
            Subscribers: schemas.Subscribers,
            Certificates: schemas.Certificates,
            CertificateTransactions: schemas.CertificateTransactions,
            getNextRatingsId: schemas.getNextRatingsId,
            getNextCertificateOrderNumber: schemas.getNextCertificateOrderNumber,
            getNextCertificateNumber: schemas.getNextCertificateNumber,
            PasswordResets: schemas.PasswordResets
        };

        initializeI18next().then(() => {
            configure();
            startup();
        }).catch((err) => {
            mainlog.fatal("Error initializing i18next");
            mainlog.fatal(err);
        });

        //push_emails(1, "higladetech@gmail.com");
    }
});


////////////////////////////////////////////////////
// Authentication
////////////////////////////////////////////////////
passport.use(new Strategy({
    usernameField: 'email',
    passReqToCallback: true
},
    function (req, email, password, done) {
        var regex = new RegExp("^" + email + "$", "i");

        app.locals.db.Users.findOne({
            email: regex
        }, function (err, user) {
            if (err) {
                mainlog.info("Authentication of " + email + " failed (error)");
                mainlog.error(err);
                return done(err);
            }
            if (user) {
                var pswd = require("./utils/password");

                if (!pswd.checkPassword(password, user.password, user.salt)) {
                    mainlog.info("Authentication of " + email + " failed (password)");
                    return done(null, false, req.flash('loginMessage', "Authentication failed"));
                }
                mainlog.info("Authenticated " + email + " successfully");
                return done(null, user);
            } else {
                mainlog.info("Authentication of " + email + " failed (user unknown)");
                return done(null, false, req.flash('loginMessage', "Authentication failed"));
            }
        })
    }
));

passport.serializeUser(function (user, cb) {
    cb(null, user._id);
});

passport.deserializeUser(function (id, cb) {
    app.locals.db.Users.findById(id, function (err, user) {
        if (err) return cb(err);
        return cb(null, user);
    });
});



////////////////////////////////////////////////////
// Startup
////////////////////////////////////////////////////
var startup = function () {
    mainlog.info("HI Energy Rating application startup -- %s, port %s", process.env.NODE_ENV, port);
    http.createServer(app).listen(port);
}

var push_daily = async function () {
    await push_emails(1);
}
var push_weekly = async function () {
    await push_emails(7);
}
var push_twice_a_month = async function () {
    await push_emails(15);
}
var push_once_a_month = async function () {
    await push_emails(30);
}





const push_emails = async function (interval, override) {
    if (process.env.NODE_ENV && ['development', 'beta'].includes(process.env.NODE_ENV)) {
        console.log("Skipping email push interval["+interval+"] in development/beta mode");
        return;
    }
    try {
        const {pumps, circulators, certificates} = await exporter.create('all', {'admin': false});

        const subs_full = await app.locals.db.Subscribers.find({
            interval_days: interval,
            type_of_data: "full"
        }).exec()


        const subs_qpl = await app.locals.db.Subscribers.find({
            interval_days: interval,
            type_of_data: "qpl"
        }).exec()

        let recips = {qpl: [], full: []};
        if (override !== undefined) {
            recips.full = [override]
        } else {
            for (const subscriber of subs_full) {
                recips.full = recips.full.concat(subscriber.recipients);
            }
            for (const subscriber of subs_qpl) {
                recips.qpl = recips.qpl.concat(subscriber.recipients);
            }
        }
        mailer.sendListings(recips.qpl, pumps.qpl, circulators.qpl, certificates.qpl, 'qpl');
        mailer.sendListings(recips.full, pumps.full, circulators.full, certificates.full, 'full');
    } catch (ex) {
        console.error(ex);
    }
}

const mailer = require('./utils/mailer');
const sched = require('node-schedule');
const daily = new sched.RecurrenceRule();
daily.hour = 11;
daily.minute = 25;

const weekly = new sched.RecurrenceRule();
weekly.dayOfWeek = 1;
weekly.hour = 13;
weekly.minute = 10;

const twiceAMonth = "0 11 1,15 * *"
const onceAMonth = "0 11 1 * *"

//sched.scheduleJob("5,10,15,20,25,30,35,40,45,50,55 * * * *", push_once_a_month);
sched.scheduleJob(daily, push_daily);
sched.scheduleJob(weekly, push_weekly);
sched.scheduleJob(twiceAMonth, push_twice_a_month);
sched.scheduleJob(onceAMonth, push_once_a_month);