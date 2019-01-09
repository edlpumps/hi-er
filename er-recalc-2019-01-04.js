require('dotenv').config({
    silent: true
});
const fs = require('fs');
const data_connection_str = process.env.MONGO_CONNECTION_DATA; //"mongodb://iq-admin:ieq4valley^78sf@candidate.60.mongolayer.com:11395,candidate.15.mongolayer.com:11279/app61915427"; //
const mongoose = require("mongoose");
const schemas = require("./schemas");
const calculator = require('./calculator');

const db = mongoose.connect(data_connection_str, {
    auto_reconnect: true
}, async function (err, res) {
    if (err) {
        console.log("Could not connect to mongo database at " + data_connection_str)
    } else {
        schemas.init(mongoose);
        const labels = await schemas.Labels.find({}).exec();

        const pumps = await schemas.Pumps.find().exec();


        const records = [];
        for (const pump of pumps) {
            const er_old = pump.energy_rating;
            const baseline = pump.pei_baseline;
            const pei = pump.pei;
            const results = calculator.calculate(pump, labels);
            pump.results = results;
            pump.energy_rating = pump.results.energy_rating;
            pump.energy_savings = pump.results.energy_savings;
            pump.pei_baseline = pump.results.pei_baseline;
            await pump.save();
            records.push(`${pump.rating_id}, ${baseline}, ${pei},  ${er_old}, ${pump.energy_rating}`)
        }

        fs.writeFile("./calc-results.csv", records.join("\r\n"), function (err) {
            if (err) {
                return console.log(err);
            }

            console.log("The file was saved!");
            db.disconnect();
        });

    }
});