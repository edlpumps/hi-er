require('dotenv').config({silent: true});

const path = require('path');
const http = require('http');
const express = require('express');
const app = express();

const session = require('express-session');
const favicon = require('serve-favicon');
const cookieParser = require('cookie-parser');
const busboy = require('express-busboy');
const helmet = require('helmet');
const bunyan = require('bunyan');

const mongoose = require("mongoose");
const schemas = require("./schemas");
const MongoStore = require('connect-mongo')(session);
const port = process.env.PORT || 3000;
const session_connection_str = process.env.MONGO_CONNECTION_SESSIONS;
const data_connection_str = process.env.MONGO_CONNECTION_DATA;

const passport = require('passport');
const Strategy = require('passport-local').Strategy;

////////////////////////////////////////////////////
// Basic express configuration
////////////////////////////////////////////////////
app.set('port', port);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');

app.use(favicon(__dirname + '/public/images/favicon.ico'));
app.use(require('less-middleware')(__dirname + '/public'));
app.use(express.static(__dirname + '/public'));
app.use(cookieParser());
app.use(session({
    secret: 'intelliquip',
    store: new MongoStore({ url: session_connection_str }),
    resave: true,
    saveUninitialized: true
}));
busboy.extend(app);

app.use(helmet());

////////////////////////////////////////////////////
// Logging configuration, main log added to each
// request object.
////////////////////////////////////////////////////
var mainlog = bunyan.createLogger({name: 'hi', level:process.env.LOG_LEVEL});
app.use(function (req, res, next) {
  req.log = mainlog;
  next();
});

////////////////////////////////////////////////////
// Database configuration
////////////////////////////////////////////////////
var conn = mongoose.connect(data_connection_str, {auto_reconnect:true}, function(err, res) {
  if (err) {
    mainlog.fatal("Could not connect to mongo database at %s", data_connection_str)
  }
  else {
    mainlog.info("Connected to mongo database at %s", data_connection_str);
    schemas.init(mongoose);
    app.locals.db = {
      Users: schemas.Users,
      Participants: schemas.Participants
    };
    // Startup the http server once the database is connected.
    startup();
  }
});


////////////////////////////////////////////////////
// Authentication
////////////////////////////////////////////////////
passport.use(new Strategy (  
    function (username, password, done) {
        app.locals.db.Users.findOne({username:username}, function(err, user) {
            if ( err ) {
                mainlog.info("Authentication of " + username + " failed (error)");
                mainlog.error(err);
                return done(err);
            }
            if (user) {
                if (password != "password") {
                    mainlog.info("Authentication of " + username + " failed (password)");
                    return done(null, false);
                }
                mainlog.info("Authenticated " + username + " successfully");
                return done(null, user);
            }
            else {
                mainlog.info("Authentication of " + username + " failed (user unknown)");
                return done(null, false);
            }
        })
    }
));

passport.serializeUser(function(user, cb) {
    cb(null, user._id);
});

passport.deserializeUser(function(id, cb) {
    app.locals.db.Users.findById(id, function(err, user) {
        if ( err ) return cb(err);
        return cb(null, user);
    });
});

app.use(passport.initialize());
app.use(passport.session());

////////////////////////////////////////////////////
// Route configuration
////////////////////////////////////////////////////
var registration = require("./routes/registration");
app.use("/", registration);
registration.post('/login', 
  passport.authenticate('local', { failureRedirect: '/login' }),
  function(req, res) {
    req.log.info("User authenticated, redirecting to landing page");
    res.redirect('/');
});

////////////////////////////////////////////////////
// Startup
////////////////////////////////////////////////////
var startup = function(){
    mainlog.info("HI Energy Rating application startup -- %s", process.env.NODE_ENV);
    http.createServer(app).listen(port);
}