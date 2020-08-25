const mongoose = require("mongoose");
const schemas = require("./schemas");
const POWERS = [1, 1.5, 2, 3, 5, 7.5, 10, 15, 20, 25, 30, 40, 50, 60, 75, 100, 125, 150, 200, 250];
const DOE = ["ESCC", "ESFM", "IL", "RSV", "ST"];
const FLOW_BINS = [50, 100, 150, 200, 300, 800, Number.MAX_VALUE];
const HEAD_BINS = [50, 100, Number.MAX_VALUE];
const CONFIGS = ['bare', 'pump_motor', 'pump_motor_cc', 'pump_motor_nc'];
const VARIABLE_SPEED = 'pump_motor_cc';
const fs = require('fs');


require('dotenv').config({
    silent: true
});

const connect = async () => {
    return new Promise((resolve, reject) => {
        mongoose.connect(process.env.LLC_MONGO_CONNECTION_DATA, {
            auto_reconnect: true
        }, function (err, res) {
            if (err) {
                console.log("Could not connect to mongo database at " + process.env.LLC_MONGO_CONNECTION_DATA)
                reject(err);
            } else {
                schemas.init(mongoose);
                resolve(res);
            }
        });
    });
}

const generate_power_er_table = async (doe, rated_motor_power, q) => {
    q.motor_power_rated = {
        $gte: rated_motor_power - 0.1,
        $lte: rated_motor_power + 0.1
    };
    q.doe = doe;
    //console.log(q)
    const ers = await schemas.Pumps.find(q, {
        energy_rating: 1,
        _id: 0
    });
    return ers.map(e => parseFloat(e.energy_rating.toString()));
}

const categorize = (pump, bins) => {
    const _bins = bins.filter((bin) => {
        return pump.configuration === bin.config &&
            pump.doe === bin.doe &&
            pump.flow_bep >= bin.min_flow && pump.flow_bep < bin.max_flow &&
            pump.head_bep >= bin.min_head && pump.head_bep < bin.max_head
    });
    if (_bins.length !== 1) {
        throw 'bins!';
    }
    const bin = _bins[0];
    bin.ratings.push(pump.energy_rating);
}
const generate_bin_table = async () => {
    const ers = await schemas.Pumps.find({}, {
        energy_rating: 1,
        load120: 1,
        flow: 1,
        head: 1,
        doe: 1,
        configuration: 1
    });
    for (const pump of ers) {
        pump.flow_bep = pump.load120 ? pump.flow.bep100 : pump.flow.bep110;
        pump.head_bep = pump.load120 ? pump.head.bep100 : pump.head.bep110;
    }
    const bins = [];
    for (const config of CONFIGS) {
        for (const doe of DOE) {
            let f = 0;
            for (const flow of FLOW_BINS) {
                let h = 0;
                for (const head of HEAD_BINS) {
                    bins.push({
                        config: config,
                        doe: doe,
                        max_flow: flow,
                        min_flow: f === 0 ? 0 : FLOW_BINS[f - 1],
                        max_head: head,
                        min_head: h === 0 ? 0 : HEAD_BINS[h - 1],
                        ratings: []
                    })
                    h++;
                }
                f++;
            }
        }
    }
    ers.forEach((pump) => {
        categorize(pump, bins)
    });

    const avg = (values) => {
        let sum = 0;
        for (const val of values) sum += val;
        return sum / values.length;
    }

    const csv = []
    const heads = ['configuration', 'doe', 'flow', 'head', 'min er', 'avg er', 'max er'];
    csv.push(heads);
    for (const bin of bins) {
        const flow_label = `${bin.min_flow}` + (bin.max_flow === Number.MAX_VALUE ? '+' : `-${bin.max_flow}`);
        const head_label = `${bin.min_head}` + (bin.max_head === Number.MAX_VALUE ? '+' : `-${bin.max_head}`);
        const max_er = bin.ratings.length ? Math.max(...bin.ratings) : '-';
        const min_er = bin.ratings.length ? Math.min(...bin.ratings) : '-';
        const avg_er = bin.ratings.length ? avg(bin.ratings) : '-';
        csv.push([bin.config, bin.doe, flow_label, head_label, min_er, avg_er.toFixed ? avg_er.toFixed(0) : avg_er, max_er]);
        //console.log(`${bin.config}\t${bin.doe}\t${flow_label}\t${head_label}\t${bin.ratings.length}\t${min_er}\t${avg_er}\t${max_er}`)
    }
    return (csv);
}


const generate = async () => {
    //await connect();
    const modes = [{
        configuration: {
            $ne: VARIABLE_SPEED
        }
    }, {
        configuration: {
            $eq: VARIABLE_SPEED
        }
    }]
    const cells = []
    let i = 0;
    for (const mode of modes) {
        for (const power of POWERS) {
            for (const doe of DOE) {
                const ers = await generate_power_er_table(doe, power, mode);
                const max = Math.max.apply(Math, ers);
                cells.push({
                    mode: i === 0 ? "constant" : "variable",
                    doe: doe,
                    power: power,
                    max_er: ers.length === 0 ? "-" : max,
                    num: ers.length
                });
            }
        }
        i++;
    }
    const csv = []
    const heads = ['speed', 'rated motor power', 'doe', 'max er']
    csv.push(heads);
    for (const cell of cells) {
        csv.push([cell.mode, cell.power, cell.doe, cell.max_er])
        console.log(`${cell.mode}\t${cell.power}\t${cell.doe}\t${cell.max_er}\t${cell.num}`)
    }


    const bin_csv = await generate_bin_table();

    const all = csv.concat(bin_csv);



    //console.log(all);

    const text = all.map(l => l.join(",")).join("\n");
    return text;
    /*fs.writeFile('llc.csv', text, (err) => {
        // throws an error, you could also catch it here
        if (err) throw err;

        // success case, the file was saved
        console.log(' saved!');
        process.exit();
    });*/


}

exports.generate = generate;