require('dotenv').config({silent: true});

const path = require('path');
const http = require('http');
const express = require('express');
const app = express();

const session = require('express-session');
const favicon = require('serve-favicon');
const cookieParser = require('cookie-parser');
const busboy = require('express-busboy');
const flash = require('express-flash')
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
app.use(flash());

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
      Participants: schemas.Participants,
      Labels : schemas.Labels, 
      nextRatingsId : schemas.nextRatingsId
    };
    // Startup the http server once the database is connected.
    startup();
  }
});


////////////////////////////////////////////////////
// Authentication
////////////////////////////////////////////////////
passport.use(new Strategy (
    {
        usernameField: 'email',
        passReqToCallback : true 
    },  
    function (req, email, password, done) {
        app.locals.db.Users.findOne({email:email}, function(err, user) {
            if ( err ) {
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
            }
            else {
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
        if ( err ) return cb(err);
        return cb(null, user);
    });
});

app.use(passport.initialize());
app.use(passport.session());
app.locals.passport = passport;


////////////////////////////////////////////////////
// Route configuration
////////////////////////////////////////////////////
app.use(function(req, res, next){
    req.Participants = req.app.locals.db.Participants;
    req.Users = req.app.locals.db.Users;
    req.Labels = req.app.locals.db.Labels;
    req.nextRatingsId = req.app.locals.db.nextRatingsId;
    next();
})

const registration = require("./routes/registration");
const participant = require("./routes/participant");
const admin = require("./routes/admin");
const pei = require("./routes/pei");
const labels = require("./routes/labels");
app.use("/", registration);
app.use("/participant", participant);
app.use("/admin", admin);
app.use("/pei", pei);
app.use("/labels", labels);

registration.post('/login', 
  passport.authenticate('local', { failureRedirect: '/' }),
  function(req, res) {
    res.cookie('email', req.body.email);
    req.log.debug("User authenticated, redirecting to landing page");
    res.redirect('/');
});
registration.get('/logout', function (req, res){
  req.logOut() ;
  res.redirect('/')
});

app.use("/error", function(req, res) {
    res.render("error", {});
})




////////////////////////////////////////////////////
// Startup
////////////////////////////////////////////////////
var startup = function(){
    mainlog.info("HI Energy Rating application startup -- %s", process.env.NODE_ENV);
    http.createServer(app).listen(port);
}