require('dotenv').config({
    silent: true
});

const path = require('path');
const http = require('http');
const express = require('express');
const app = express();
const busboy = require('express-busboy');
const session = require('express-session');
const favicon = require('serve-favicon');
const cookieParser = require('cookie-parser');
const flash = require('express-flash')
const helmet = require('helmet');
const bunyan = require('bunyan');
const moment = require('moment');
const mongoose = require("mongoose");
const schemas = require("./schemas");
const units = require('./utils/uom');
const MongoStore = require('connect-mongo')(session);
var session_store = null;
const port = process.env.PORT || 3003;
const data_connection_str = process.env.MONGO_CONNECTION_DATA;

const passport = require('passport');
const Strategy = require('passport-local').Strategy;
var mainlog = bunyan.createLogger({
    name: 'hi',
    level: process.env.LOG_LEVEL
});


////////////////////////////////////////////////////
// Basic express configuration
////////////////////////////////////////////////////
app.set('port', port);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');


var configure = function() {
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
        upload: true
    });

    ////////////////////////////////////////////////////
    // Logging configuration, main log added to each
    // request object.
    ////////////////////////////////////////////////////
    app.use(function(req, res, next) {
        req.log = mainlog;
        next();
    });

    app.use(passport.initialize());
    app.use(passport.session());
    app.locals.passport = passport;


    ////////////////////////////////////////////////////
    // Route configuration
    ////////////////////////////////////////////////////
    app.use(function(req, res, next) {
        req.Participants = req.app.locals.db.Participants;
        req.Users = req.app.locals.db.Users;
        req.Labels = req.app.locals.db.Labels;
        req.Labs = req.app.locals.db.Labs;
        req.Subscribers = req.app.locals.db.Subscribers;
        req.nextRatingsId = req.app.locals.db.nextRatingsId;
        req.PasswordResets = req.app.locals.db.PasswordResets;
        req.base_url = req.protocol + '://' + req.get('Host');
        next();
    })

    app.use(function(req, res, next) {
        if (!req.session.unit_set) {
            req.session.unit_set = units.US;
        }
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
    app.use("/", root);
    app.use("/participant", participant);
    app.use("/admin", admin);
    app.use("/pei", pei);
    app.use("/labels", labels);
    app.use("/ratings", ratings);

    root.post('/login',
        passport.authenticate('local', {
            failureRedirect: '/portal'
        }),
        function(req, res) {
            res.cookie('email', req.body.email);
            req.log.debug("User authenticated, redirecting to landing page");
            res.redirect('/');
        });

    root.get('/logout', function(req, res) {
        req.logOut();
        res.redirect('/portal')
    });

    root.post('/units', function(req, res) {
        var unit_set = req.body.unit_set;
        if (unit_set == units.US || unit_set == units.METRIC) {
            req.session.unit_set = unit_set;
        }
        res.status(200).send();
    });


    app.use("/error", function(req, res) {
        res.render("error", {});
    })
    app.use("/disabled", function(req, res) {
        res.render("disabled", {});
    })
    app.use("/unauthorized", function(req, res) {
        res.render("unauthorized", {});
    })
}



////////////////////////////////////////////////////
// Database configuration
////////////////////////////////////////////////////
var conn = mongoose.connect(data_connection_str, {
    auto_reconnect: true
}, function(err, res) {
    if (err) {
        mainlog.fatal("Could not connect to mongo database at %s", data_connection_str)
    } else {
        mainlog.info("Connected to mongo database at %s", data_connection_str);
        schemas.init(mongoose);
        app.locals.db = {
            Users: schemas.Users,
            Participants: schemas.Participants,
            Labels: schemas.Labels,
            Labs: schemas.Labs,
            Subscribers: schemas.Subscribers,
            nextRatingsId: schemas.nextRatingsId,
            PasswordResets: schemas.PasswordResets
        };

        session_store = new MongoStore({
            db: mongoose.connection.db
        });
        configure();
        startup();


        push_emails();
    }
});


////////////////////////////////////////////////////
// Authentication
////////////////////////////////////////////////////
passport.use(new Strategy({
        usernameField: 'email',
        passReqToCallback: true
    },
    function(req, email, password, done) {
        var regex = new RegExp("^" + email + "$", "i");
        console.log(regex);
        app.locals.db.Users.findOne({
            email: regex
        }, function(err, user) {
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

passport.serializeUser(function(user, cb) {
    cb(null, user._id);
});

passport.deserializeUser(function(id, cb) {
    app.locals.db.Users.findById(id, function(err, user) {
        if (err) return cb(err);
        return cb(null, user);
    });
});



////////////////////////////////////////////////////
// Startup
////////////////////////////////////////////////////
var startup = function() {
    mainlog.info("HI Energy Rating application startup -- %s, port %s", process.env.NODE_ENV, port);
    http.createServer(app).listen(port);
}

var push_daily = function() {
    push_emails(1);
}
var push_weekly = function() {
    push_emails(7);
}
var push_twice_a_month = function() {
    push_emails(15);
}
var push_emails = function(interval) {
    let params = require('./search').params;
    var operators = params();
    let headers = [
        'rating_id',
        'data',
        'participant',
        'basic_model',
        'individual_model',
        'brand',
        'lab',
        'configuration',
        'doe',
        'diameter',
        'speed',
        'stages',
        'flow_bep',
        'head_bep',
        'driver_input_power_bep',
        'control_power_input_bep',
        'control_power_input_bep',
        'pei',
        'energy_rating'
    ]
    let filter = function(key) {
        return headers.indexOf(key) >= 0;
    }
    let sorter = function(a, b) {
        let i = headers.indexOf(a.value);
        let j = headers.indexOf(b.value);
        return i - j;
    }
    let headings = {
        rating_id: "Rating ID",
        participant: "Participant",
        configuration: "Configuration",
        basic_model: "Basic model designation",
        individual_model: "Manufacturer's model designation",
        brand: 'Brand',
        diameter: 'Full impeller diameter',
        speed: 'Nominal Speed',
        lab: 'HI Approved laboratory',
        stages: 'Stages',
        doe: 'DOE product category',
        energy_rating: 'Pump Energy Rating',
        flow_bep: 'BEP Flow rate',
        head_bep: 'BEP Head',
        driver_input_power_bep: 'BEP Driver input power',
        control_power_input_bep: 'BEP Control input power',
        motor_power_rated: 'Rated motor power',
        pei: 'Pump Energy Index',
        date: 'Date listed'
    }
    app.locals.db.Participants.aggregate(operators).exec(function(err, docs) {
        docs.forEach(function(pump) {
            pump.flow_bep = pump.load120 ? pump.flow.bep100 : pump.flow.bep110;
            pump.head_bep = pump.load120 ? pump.head.bep100 : pump.head.bep110;
            if (pump.driver_input_power) {
                pump.driver_input_power_bep =
                    pump.load120 ? pump.driver_input_power.bep100 : pump.driver_input_power.bep110;
                if (pump.driver_input_power_bep) {
                    pump.driver_input_power_bep = pump.driver_input_power_bep.toFixed(2);
                }
            }
            if (pump.control_power_input) {
                pump.control_power_input_bep = pump.control_power_input.bep100;
                if (pump.control_power_input_bep) {
                    pump.control_power_input_bep = pump.control_power_input_bep.toFixed(2);
                }
            }
            pump.motor_power_rated = pump.motor_power_rated ? pump.motor_power_rated : pump.motor_power_rated_results
            pump.date = moment(pump.date).format("DD MMM YYYY")
            pump.lab = pump.laboratory.name + " - " + pump.laboratory.code;

            pump.diameter = pump.diameter.toFixed(3);
            pump.flow_bep = pump.flow_bep.toFixed(2);
            pump.head_bep = pump.head_bep.toFixed(2);
            pump.motor_power_rated = pump.motor_power_rated.toFixed(2);

        })
        let toxl = require('jsonexcel');
        let fs = require('fs');
        let buffer = toxl(docs, { sort: sorter, headings: headings, filter: filter });


        app.locals.db.Subscribers.find({ interval_days: interval }, function(err, subs) {
            let recips = [];
            if (subs) {
                subs.forEach(function(s) {
                    recips = recips.concat(s.recipients);
                })
            }
            recips.forEach(function(recip) {
                mailer.sendListings(recip, buffer);
            })

            /*fs.writeFile("example.xlsx", buffer, "binary", function(err) {
                 if (err) {
                     console.log(err);
                 } else {
                     console.log("Saved excel file to example.xlsx");
                 }
             });*/
        })


    });
}

var mailer = require('./utils/mailer');
var sched = require('node-schedule');
var daily = new sched.RecurrenceRule();
//daily.hour = ;
daily.minute = 5;

var weekly = new sched.RecurrenceRule();
weekly.dayOfWeek = 1;
weekly.hour = 10;
weekly.minute = 00;

var twiceAMonth = "0 11 1,15 * *"

sched.scheduleJob(daily, push_daily);
sched.scheduleJob(weekly, push_weekly);
sched.scheduleJob(twiceAMonth, push_twice_a_month);