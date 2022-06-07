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
const MongoStore = require('connect-mongo')(session);
const passport = require('passport');
const Strategy = require('passport-local').Strategy;
const lcc = require('./lcc');
const port = process.env.PORT || 3003;
const data_connection_str = process.env.MONGO_CONNECTION_DATA;
const NodeCache = require("node-cache");
const cache = new NodeCache({ stdTTL: 60 * 60 * 24, checkperiod: 600 });  // one day ttl, check every 10 minutes
const exporter = require('./exporter');
const circulatorExport = require("./circulator-export");

let session_store = null;
let mainlog = bunyan.createLogger({
    name: 'hi',
    level: process.env.LOG_LEVEL
});


////////////////////////////////////////////////////
// Basic express configuration
////////////////////////////////////////////////////
app.set('port', port);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');


var configure = function () {
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
        res.locals.certificate_cart_exists = req.session.certificate_cart ? req.session.certificate_cart.length > 0 : false;
        res.locals.unit_set = req.session.unit_set;
        res.locals.ESTORE_ADMIN_EMAIL = process.env.ESTORE_ADMIN_EMAIL;
        res.locals.units = units.make_units(res.locals.unit_set);
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

    app.use("/", root);
    app.use("/participant", participant);
    app.use("/admin", admin);
    app.use("/pei", pei);
    app.use("/labels", labels);
    app.use("/ratings", ratings);
    app.use("/circulator/ratings", circulator_ratings);

    root.get("/circulator-ratings-summary", async (req, res) => {
        res.header("Content-Type", "text/csv");

        const csv = await circulatorExport.getCirculatorDatabaseSummaryCsv();

        res.send(csv);
    });

    root.get("/lcc", async (req, res) => {
        let csv = cache.get("lcc")
        if (!csv) {
            console.log("LCC request rebuild")
            csv = await lcc.generate();
            cache.set("lcc", csv);
        } else {
            console.log("LCC cached");
        }

        res.header('Content-Type', 'text/csv');
        return res.send(csv);
    });

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
var conn = mongoose.connect(data_connection_str, {
    useMongoClient: true
}, function (err, res) {
    if (err) {
        mainlog.fatal("Could not connect to mongo database at %s", data_connection_str)
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

        session_store = new MongoStore({
            db: mongoose.connection.db
        });
        configure();
        startup();

        //console.log("STOP PUSHING EMAILS ON STARTUP")
        push_emails(1, "scott@freesconsulting.com");

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






const push_emails = async function (interval, override) {
    try {
        const { pumps, circulators, certificates } = await exporter.create();

        const subs = await app.locals.db.Subscribers.find({
            interval_days: interval
        }).exec()


        let recips = [];
        if (override !== undefined) {
            recips = [override]
        } else {
            for (const subscriber of subs) {
                recips = recips.concat(subscriber.recipients);
            }
        }

        mailer.sendListings(recips, pumps, circulators, certificates);
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

sched.scheduleJob(daily, push_daily);
sched.scheduleJob(weekly, push_weekly);
sched.scheduleJob(twiceAMonth, push_twice_a_month);