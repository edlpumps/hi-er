///////////////////////////////////////////////////
// This script updates brands for pumps by rating id
// The rating id's are taken from a rebrand.txt
// file, where one rating id is found per line.
// 
// The target database is defined in MAINTENANCE_DB
// environment variable - which is NOT a variable
// used by any other aspects of the ER application.
//
// The rebrand value is taken from MAINTENANCE_REBRAND
// environment variable.
//
// As a safety precaution, pumps are rebranded only
// from participant that is identified by the 
// MAINTENANCE_PARTICIPANT _id value.
///////////////////////////////////////////////////
require('dotenv').config({
    silent: true
});
const data_connection_str = process.env.MAINTENANCE_DB;
const participant = process.env.MAINTENANCE_PARTICIPANT;
const mongoose = require("mongoose");
const schemas = require("./schemas");
const ObjectId = mongoose.Types.ObjectId;
const assert = require('assert');
const prompt = require('prompt');
const fs = require('fs');
const connect = async () => {
    assert(data_connection_str, "You must specify a MAINTENANCE_DB connection string in environment.");
    assert(participant, "You must specify a MAINTENANCE_PARTICIPANT connection string in environment.");
    return new Promise((resolve, reject) => {
        mongoose.connect(data_connection_str, {
            auto_reconnect: true
        }, function (err, res) {
            if (err) {
                console.log("Could not connect to mongo database at " + data_connection_str)
                reject(err);
            } else {
                schemas.init(mongoose);
                resolve(res);
            }
        });
    });
}

const load_pumps_to_rebrand = () => {
    const contents = fs.readFileSync("./rebrand.txt", 'utf-8');
    const ratingIds = contents.split("\n").map(r => r.trim()).filter(r => r);
    return ratingIds;
}

const confirm = async (p, num) => {
    prompt.start();
    return new Promise((resolve, reject) => {
        prompt.get([{
            name: 'confirm',
            message: `Enter 'REBRAND' to confirm rebranding of ${num} from ${p.name}`
        }], function (err, results) {
            resolve(results.confirm === 'REBRAND');
        })
    });
}

const perform_maintenance = async () => {
    try {
        await connect();
        const new_brand = process.env.MAINTENANCE_REBRAND;
        const pumps = load_pumps_to_rebrand();
        const p = ObjectId(participant);
        const p_ = await schemas.Participants.findOne({
            _id: p
        });
        const confirmed = await confirm(p_, pumps.length);
        if (!confirmed) {
            console.log("Cancelling operation, confirmation false.");
        } else {
            for (const pump of pumps) {
                const query = {
                    participant: p,
                    rating_id: pump
                };

                const result = await schemas.Pumps.updateOne(query, {
                    $set: {
                        brand: new_brand
                    }
                });
                const succeeded = result && result.n === 1;
                const message = succeeded ? "success" : "failed";

                console.log(` - Rebranded pump with Rating ID = ${pump} ... ${message}`);

                if (!succeeded) {
                    console.error(`Halting, error rebranding pump`);
                    console.log(JSON.stringify(result, null, 2));
                    break;
                }


            }
        }
    } catch (ex) {
        console.error(ex);
    }
    mongoose.connection.close();
}

perform_maintenance();