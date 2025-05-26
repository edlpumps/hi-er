require('dotenv').config({
    silent: true
});
const fs = require('fs');
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
const cache = new NodeCache({ stdTTL: 60 * 60 * 24, checkperiod: 600 });
const exporter = require('./exporter');


const go = async function (interval, override) {
    var conn = mongoose.connect(process.env.MONGO_CONNECTION_DATA, {
        useNewUrlParser: true
    }, async function (err, res) {
        if (err) {
            console.log("Could not connect to mongo database at %s", data_connection_str)
        } else {
            console.log("Connected to mongo database at %s", data_connection_str);
            schemas.init(mongoose);

            try {
                const { pumps, circulators, certificates } = await exporter.create();
                for (var list of [pumps, circulators, certificates]) {
                    let list_str = list == pumps ? "pumps" : list == circulators ? "circulators" : "certificates";
                    for (var key of Object.keys(list)) {
                        if (list[key] == null) continue;
                        fs.writeFileSync("./export-"+list_str+"-"+key+".xlsx", list[key]);
                    }
                }
            } catch (ex) {
                console.error(ex);
            }

        }
    });



}
go()