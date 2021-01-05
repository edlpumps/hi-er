const schemas = require("./schemas");
const toxl = require('jsonexcel');
const moment = require('moment');

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
    row[`${prefix}_pressure_curve`] = listing[prefix].pressure_curve;
    row[`${prefix}_pei`] = listing[prefix].pei ? listing[prefix].pei.toFixed(2) : "";
    row[`${prefix}_energy_rating`] = listing[prefix].energy_rating ? listing[prefix].energy_rating.toFixed(0) : "";
    if (has4(listing[prefix].control_method)) {
        row[`${prefix}_input_power_25`] = listing[prefix].input_power[0] ? listing[prefix].input_power[0].toFixed(1) : "";
        row[`${prefix}_input_power_50`] = listing[prefix].input_power[1] ? listing[prefix].input_power[1].toFixed(1) : "";
        row[`${prefix}_input_power_75`] = listing[prefix].input_power[2] ? listing[prefix].input_power[2].toFixed(1) : "";
        row[`${prefix}_input_power_100`] = listing[prefix].input_power[3] ? listing[prefix].input_power[3].toFixed(1) : "";

    } else {
        row[`${prefix}_input_power_max`] = listing[prefix].input_power[0] ? listing[prefix].input_power[0].toFixed(1) : "";
        row[`${prefix}_input_power_reduced`] = listing[prefix].input_power[1] ? listing[prefix].input_power[1].toFixed(1) : "";
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
        row.head_25 = listing.head[0].toFixed(2);
        row.head_50 = listing.head[1].toFixed(2);
        row.head_75 = listing.head[2].toFixed(2);
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
        'least_pressure_curve',

        'least_input_power_25',
        'least_input_power_50',
        'least_input_power_75',
        'least_input_power_100',
        'least_input_power_max',
        'least_input_power_reduced',

        'most_control_method',
        'most_pressure_curve',
        'most_input_power_25',
        'most_input_power_50',
        'most_input_power_75',
        'most_input_power_100',
        'most_input_power_max',
        'most_input_power_reduced',

        'head_25',
        'head_50',
        'head_75',
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


        'least_control_method': "Rated Consumptive Control Method",
        'least_pressure_curve': "Rated Pressure Curve",

        'least_input_power_25': "Rated load point driver or control input power at 25% of BEP",
        'least_input_power_50': "Rated load point driver or control input power at 50% of BEP",
        'least_input_power_75': "Rated load point driver or control input power at 75% of BEP",
        'least_input_power_100': "Rated load point driver or control input power at 100% of BEP",
        'least_input_power_max': "Rated load point weighted average input power at maximum rotating speed",
        'least_input_power_reduced': "Rated load point weighted average input power at maximum rotating speed",

        'most_control_method': "Most Consumptive Control Method",
        'most_pressure_curve': "Most Consumptive Pressure Curve",
        'most_input_power_25': "Most Consumptive load point driver or control input power at 25% of BEP",
        'most_input_power_50': "Most Consumptive load point driver or control input power at 50% of BEP",
        'most_input_power_75': "Most Consumptive load point driver or control input power at 75% of BEP",
        'most_input_power_100': "Most Consumptive load point driver or control input power at 100% of BEP",
        'most_input_power_max': "Most Consumptive load point weighted average input power at maximum rotating speed",
        'most_input_power_reduced': "Most Consumptive load point weighted average input power at maximum rotating speed",

        'head_25': "Load point head at 25% of BEP at max speed ",
        'head_50': "Load point head at 50% of BEP at max speed",
        'head_75': "Load point head at 75% of BEP at max speed",
        'head_100': "Load point head at 100% of BEP at max speed",
        'flow': "Load point flow rate at 100% of BEP",

        'least_pei': "Least Consumptive Pump Energy Index on nameplate",
        'most_pei': "Least Consumptive Pump Energy Index on nameplate",
        'least_energy_rating': "Rated (Least consumptive) HI Energy Rating",

        'most_energy_rating': "Most consumptive HI Energy Rating",

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

exports.getCirculators = get_listed;
exports.getExportable = prep_for_export;
exports.toXLXS = toXLXS;