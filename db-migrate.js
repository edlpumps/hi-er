require('dotenv').config({
    silent: true
});
const data_connection_str = process.env.MONGO_CONNECTION_DATA;
const mongoose = require("mongoose");
const schemas = require("./schemas");

const copy = async () => {
    await new Promise((r, j) => {
        var conn = mongoose.connect(data_connection_str, {
            auto_reconnect: true
        }, r);
    });

    schemas.init(mongoose);
    const participants = await schemas.Participants.find().lean().exec();
    for (const participant of participants) {
        console.log(`Migrating ${participant.name}`)
        for (const pump of participant.pumps) {
            console.log(`  -  Inserting pump from ${participant.name} as ${pump.individual_model} - ${pump._id}`);
            pump.participant = participant._id;
            pump._id = mongoose.Types.ObjectId();
            console.log(pump._id);
            await schemas.Pumps.create(pump);

        }
    }
    mongoose.connection.close()
}

const verify = async () => {
    await new Promise((r, j) => {
        var conn = mongoose.connect(data_connection_str, {
            auto_reconnect: true
        }, r);
    });

    schemas.init(mongoose);
    const participants = await schemas.Participants.find().lean().exec();
    for (const participant of participants) {
        const pcount = await schemas.Pumps.count({
            participant: participant._id
        });
        if (participant.pumps.length == pcount) {
            console.log(`Verified ${participant.name} has ${pcount} pumps.`)
        } else {
            console.log(`XXXXXXXXXX  Participant ${participant.name} mismatch ${participant.pumps.length} <> ${pcount}`);
        }

    }
    mongoose.connection.close()
}

const clean = async () => {
    await new Promise((r, j) => {
        var conn = mongoose.connect(data_connection_str, {
            auto_reconnect: true
        }, r);
    });

    schemas.init(mongoose);
    const result = await schemas.Participants.update({}, {
        $set: {
            pumps: undefined
        }
    }, {
        multi: true
    });
    console.log("Gone.")
    console.log(result);
    mongoose.connection.close()
}

const fix = async () => {
    await new Promise((r, j) => {
        var conn = mongoose.connect(data_connection_str, {
            auto_reconnect: true
        }, r);
    });

    schemas.init(mongoose);
    const pumps = await schemas.Pumps.find().exec();
    for (const pump of pumps) {
        //const p = await schemas.Participants.findById(pump.participant).exec();
        pump.participant = pump.p // mongoose.Types.ObjectId(pump.participant);
        //pump.p = mongoose.Types.ObjectId(pump.participant);
        console.log(pump.participant)
        await pump.save();

    }
    console.log("Fixed");
    mongoose.connection.close()
}


//copy();
//verify();
clean();
//fix();