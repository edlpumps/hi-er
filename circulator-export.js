const schemas = require("./schemas");
const toxl = require('jsonexcel');
const moment = require('moment');
const _ = require('lodash');


const has4 = (control) => {
    switch (control) {
        case 'no-speed-control':
        case 'pressure-control':
        case 'temperature-control':
        case 'external-control':
            return 4;
        case 'external-other-control':
        case 'manual-control':
            return 2;
    }
}
const get_listed = async () => {
    const circulators = await schemas.Circulators.find({
        listed: true,
        active_admin: true,
    }).populate('participant').exec();

    return circulators;
}

const fill_control_method_bools = (listing, row) => {
    const c = require('./controllers/circulator');
    const methods = c.control_methods;
    for (method of methods) {
        const prop = `control_methods_${method.label}`;
        if (listing.control_methods.indexOf(method.label) >= 0) {
            row[prop] = "Yes"
        } else {
            row[prop] = "No"
        }
    }
    return;
}

const fill_data = (listing, row, prefix) => {
    row[`${prefix}_control_method`] = listing[prefix].control_method;
    if (row[`${prefix}_control_method`] == "no-speed-control") {
        row[`${prefix}_control_method`] = "full-speed"
    }
    //row[`${prefix}_pressure_curve`] = listing[prefix].pressure_curve;
    row[`${prefix}_pei`] = listing[prefix].pei ? listing[prefix].pei.toFixed(2) : "";
    row[`${prefix}_energy_rating`] = listing[prefix].energy_rating ? listing[prefix].energy_rating.toFixed(0) : "";
    if (has4(listing[prefix].control_method)) {
        /*row[`${prefix}_input_power_25`] = listing[prefix].input_power[0] ? listing[prefix].input_power[0].toFixed(1) : "";
        row[`${prefix}_input_power_50`] = listing[prefix].input_power[1] ? listing[prefix].input_power[1].toFixed(1) : "";
        row[`${prefix}_input_power_75`] = listing[prefix].input_power[2] ? listing[prefix].input_power[2].toFixed(1) : "";*/
        row[`${prefix}_input_power_100`] = listing[prefix].input_power[3] ? listing[prefix].input_power[3].toFixed(3) : "";

    } else {
        row[`${prefix}_input_power_max`] = listing[prefix].input_power[0] ? listing[prefix].input_power[0].toFixed(3) : "";
        row[`${prefix}_input_power_reduced`] = listing[prefix].input_power[1] ? listing[prefix].input_power[1].toFixed(3) : "";
    }
}

const prep_for_export = (listings) => {
    const rows = [];

    for (const listing of listings) {
        const row = {
            rating_id: listing.rating_id,
            participant: listing.participant._id ? listing.participant.name : "ID",
            brand: listing.brand,
            basic_model: listing.basic_model,
            manufacturer_model: listing.manufacturer_model,
            alternative_part_number: listing.alternative_part_number,
            type: listing.type,
            laboratory: listing.laboratory ? listing.laboratory.code : "N/A",
        }

        fill_control_method_bools(listing, row);
        /*row.head_25 = listing.head[0].toFixed(2);
        row.head_50 = listing.head[1].toFixed(2);
        row.head_75 = listing.head[2].toFixed(2);*/
        row.head_100 = listing.head[3].toFixed(2);
        row.flow = listing.flow.toFixed(2);
        if (listing.least) {
            fill_data(listing, row, 'least');
        }
        if (listing.most) {
            fill_data(listing, row, 'most');
        }

        row.date = moment(listing.date).format("DD MMM YYYY")
        if (listing.revisions.length > 0) {
            row.date = moment(listing.revisions[0].date).format("DD MM YYYY");
        }
        if (row.revisions && row.revisions.length > 1) {
            row.revision = moment(listing.revisions[listing.revisions.length - 1].date).format("DD MM YYYY");
        } else {
            row.revision = "-";
        }

        rows.push(row);
    }
    return rows;
}

const toXLXS = (rows) => {
    const headers = [
        'rating_id',
        'participant',
        'brand',
        'basic_model',
        'manufacturer_model',
        'alternative_part_number',
        'type',
        'laboratory',

        'control_methods_no-speed-control',
        'control_methods_pressure-control',
        'control_methods_temperature-control',
        'control_methods_external-control',
        'control_methods_external-other-control',
        'control_methods_manual-control',

        'least_control_method',
        /*'least_pressure_curve',*/

        /*'least_input_power_25',
        'least_input_power_50',
        'least_input_power_75',*/
        'least_input_power_100',
        'least_input_power_max',
        'least_input_power_reduced',

        'most_control_method',
        /*'most_pressure_curve',*/
        /*'most_input_power_25',
        'most_input_power_50',
        'most_input_power_75',*/
        'most_input_power_100',
        'most_input_power_max',
        'most_input_power_reduced',

        /*'head_25',
        'head_50',
        'head_75',*/
        'head_100',
        'flow',

        'least_pei',
        'least_energy_rating',

        'most_pei',
        'most_energy_rating',

        'date',
        'revision'
    ];

    let sorter = function (a, b) {
        let i = headers.indexOf(a.value);
        let j = headers.indexOf(b.value);
        return i - j;
    }

    const headings = {
        'rating_id': 'Rating ID',
        'participant': "Participant",
        'brand': "Brand",
        'basic_model': "Basic Model Number",
        'manufacturer_model': "Manufacturer Model Number",
        'alternative_part_number': "Alternative Part Number",
        'type': "Pump Type",
        'laboratory': "HI Laboratory Number",

        'control_methods_no-speed-control': "Full Speed",
        'control_methods_pressure-control': "Pressure Control",
        'control_methods_temperature-control': "Temperature Control ",
        'control_methods_manual-control': "Manual Speed Control",
        'control_methods_external-control': "External Input Speed Control",
        'control_methods_external-other-control': "External Input Speed and Other Controls",


        'least_control_method': "Least Consumptive Control Method",
        /*'least_pressure_curve': "Rated Pressure Curve",*/

        /*'least_input_power_25': "Rated load point driver or control input power at 25% of BEP",
        'least_input_power_50': "Rated load point driver or control input power at 50% of BEP",
        'least_input_power_75': "Rated load point driver or control input power at 75% of BEP",*/
        'least_input_power_100': "Rated BEP input power",
        'least_input_power_max': "Rated load point weighted average input power at maximum rotating speed",
        'least_input_power_reduced': "Rated load point weighted average input power at maximum rotating speed",

        'most_control_method': "Most Consumptive Control Method",
        /*'most_pressure_curve': "Most Consumptive Pressure Curve",*/
        /*'most_input_power_25': "Most Consumptive load point driver or control input power at 25% of BEP",
        'most_input_power_50': "Most Consumptive load point driver or control input power at 50% of BEP",
        'most_input_power_75': "Most Consumptive load point driver or control input power at 75% of BEP",*/
        'most_input_power_100': "Most Consumptive BEP input power",
        'most_input_power_max': "Most Consumptive load point weighted average input power at maximum rotating speed",
        'most_input_power_reduced': "Most Consumptive load point weighted average input power at maximum rotating speed",

        /*'head_25': "Load point head at 25% of BEP at max speed ",
        'head_50': "Load point head at 50% of BEP at max speed",
        'head_75': "Load point head at 75% of BEP at max speed",*/
        'head_100': "BEP head at max speed",
        'flow': "BEP flow rate",

        'least_pei': "Least Consumptive CEI",
        'most_pei': "Most Consumptive Circulator CEI",
        'least_energy_rating': "Least Consumptive ER",

        'most_energy_rating': "Most Consumptive ER",

        date: 'Date listed',
        revision: 'Date updated'
    };
    console.log("MAKING CIRCULATOR EXCEL");
    console.log(JSON.stringify(rows, null, 2));
    const buffer = toxl(rows, {
        sort: sorter,
        headings: headings
    });
    console.log("RETURNING CIRCULATOR EXCEL");
    return buffer;
}

const summarySizeBins = [
    [0, .033],
    [.034, .063],
    [.064, .125],
    [.126, .167],
    [.168, .250],
    [.251, .500],
    [.501, .750],
    [.751, 1.250],
    [1.251, 1.750],
    [1.751, 2.500],
    [2.501, 3.500],
    [3.501, 4.500],
    [4.501, 5.500]
];

const getLCCMGroups = (details) => {
    const groups = details.reduce((group, detail) => {
        const { least_control_method, most_input_power_100 } = detail;
        group[least_control_method] = group[least_control_method] || {};

        const bin = summarySizeBins.find(b => most_input_power_100 >= b[0] && most_input_power_100 <= b[1]);
        const label = `${bin[0].toLocaleString(undefined, { minimumIntegerDigits: 1, minimumFractionDigits: 3})}-${bin[1].toLocaleString(undefined, { minimumIntegerDigits: 1, minimumFractionDigits: 3})}`;

        group[least_control_method][label] = group[least_control_method][label] || []
        group[least_control_method][label].push(detail);

        return group;
    }, {});

    return groups;
}

const calcCirculatorDatabaseSummary = (groups) => {
    const stats = Object.keys(groups).map(lcm => {
        const binStats = Object.keys(groups[lcm]).map(bin => {
            const count = groups[lcm][bin].length;
            const binValues = groups[lcm][bin];
            const reduction = binValues.reduce((sums, detail) => {
                sums.mostBep += parseFloat(detail.most_input_power_100);
                sums.mostPei += parseFloat(detail.most_pei);
                sums.leastPei += parseFloat(detail.least_pei);
                sums.leastMin += parseFloat(detail.least_energy_rating);
                sums.leastMax += parseFloat(detail.most_energy_rating);
                return sums;
            }, {
                mostBep: 0,
                mostPei: 0,
                leastPei: 0,
                leastMin: 0,
                leastMax: 0,
                details: groups[lcm][bin].map(g => ({
                    rating_id: g.rating_id,
                    most_input_power_100: g.most_input_power_100,
                    most_pei: g.most_pei,
                    least_pei: g.least_pei,
                    least_energy_rating: g.least_energy_rating,
                    most_energy_rating: g.most_energy_rating
                }))
            })

            reduction.mostBep /= count;
            reduction.mostPei /= count;
            reduction.leastPei /= count;
            reduction.leastMin /= count;
            reduction.leastMax /= count;
            reduction.lcm = lcm;
            reduction.bin = bin;

            return reduction;
        })

        return binStats;
    });

    return _.flatten(stats);
}

const generateCirculatorRatingsSummaryCsv = (summaries) => {
    const heading = [
        "Least Consumptive Control Method",
        "Size Bin",
        "Most Consumptive load point driver or control input power at 100% of BEP",
        "Most Consumptive Circulator Energy Index on nameplate",
        "Least Consumptive Circulator Energy Index on nameplate",
        "Least Consumptive Energy Rating",
        "Most Consumptive Energy Rating"
    ];

    const csv = [];
    csv.push(heading);
    summaries.forEach(s => {
        csv.push([s.lcm,s.bin,s.mostBep,s.mostPei,s.leastPei,s.leastMin,s.leastMax]);
    })

    const text = csv.map(l => l.join(",")).join("\n");

    return text;
}

const generateCirculatorRatingsSummaryDetailsCsv = (summaries) => {
    const heading = [
        "Least Consumptive Control Method",
        "Size Bin",
        "rating_id",
        "most_input_power_100",
        "most_pei",
        "least_pei",
        "least_energy_rating",
        "most_energy_rating"
    ];

    const csv = [];
    csv.push(heading);
    summaries.forEach(s => {
        const details = s.details.map(d => [s.lcm, s.bin, d.rating_id, d.most_input_power_100, d.most_pei, d.least_pei, d.least_energy_rating, d.most_energy_rating]);
        csv.push(...details);
    })

    const text = csv.map(l => l.join(",")).join("\n");

    return text;
}

const getCirculatorDatabaseSummaryCsv = async (showDetails) => {
    try {
        const circulators = await get_listed();
        const detailData = await prep_for_export(circulators);

        const lccmGroups = getLCCMGroups(detailData);

        const summaries = calcCirculatorDatabaseSummary(lccmGroups);

        if (showDetails) {
            return generateCirculatorRatingsSummaryDetailsCsv(summaries);
        }
        else {
            return generateCirculatorRatingsSummaryCsv(summaries);
        }
    }
    catch(error) {
        console.log(error);
    }
}

exports.getCirculators = get_listed;
exports.getExportable = prep_for_export;
exports.toXLXS = toXLXS;
exports.getCirculatorDatabaseSummaryCsv = getCirculatorDatabaseSummaryCsv;