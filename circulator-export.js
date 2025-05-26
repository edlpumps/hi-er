const schemas = require("./schemas");
const toxl = require('jsonexcel');
const moment = require('moment');
const _ = require('lodash');
const common = require('./utils/export_common')


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
    }).lean().exec();

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
    row[`${prefix}_energy_rating`] = listing[prefix].energy_rating ? parseFloat(listing[prefix].energy_rating).toFixed(0) : "";
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

const prep_for_export = (listings, participants) => {
    const calculator = require('./calculator');
    const rows = [];

    for (const listing of listings) {
        if (listing.participant) {
            listing.participant = participants.find(p => p._id.toString() === listing.participant._id.toString());
        }
        const row = {
            rating_id: listing.rating_id,
            participant: listing.participant ? listing.participant.name : "ID",
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
        let retval = calculator.calculate_circ_watts_calc_group_and_tier(row);
        row.watts_group = retval.watts_group;
        row.watts_calc = retval.watts_calc;
        row.cee_tier = retval.cee_tier;

        rows.push(row);
    }
    return rows;
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
        if (!bin) {
            console.log("No bin found for most_input_power_100: ", most_input_power_100);
        }
        let label=null;
        try {
         label = `${bin[0].toLocaleString(undefined, { minimumIntegerDigits: 1, minimumFractionDigits: 3})}-${bin[1].toLocaleString(undefined, { minimumIntegerDigits: 1, minimumFractionDigits: 3})}`;
        } catch (e) {
            console.log("Error! ", e);
            label = "5.501+";
        }
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
        "Most Efficient Control Method",
        "Size Bin",
        "Least Efficient load point driver or control input power at 100% of BEP",
        "Least Efficient Circulator Energy Index on nameplate",
        "Most Efficient Circulator Energy Index on nameplate",
        "Most Efficient Energy Rating",
        "Least Efficient Energy Rating"
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
        "Most Efficient Control Method",
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
exports.getCirculatorDatabaseSummaryCsv = getCirculatorDatabaseSummaryCsv;