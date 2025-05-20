const circulatorExport = require('./circulator-export');
const certificateExport = require('./certificate-export');
const params = require('./search').params;
const schemas = require('./schemas');
const toxl = require('jsonexcel');
const moment = require('moment');

exports.create = async () => {
    console.log("Building circulator excel file");
    const circulators = await circulatorExport.getCirculators();
    console.log(circulators)
    const circulator_rows = circulatorExport.getExportable(circulators);
    const circulator_excel_full = circulatorExport.toXLXS(circulator_rows,true);
    const circulator_excel_qpl = circulatorExport.toXLXS(circulator_rows,false);

    console.log("Building c&i excel file");
    //This returns a buffer xlsx file
    const pumps_excel_full = await get_pump_export_excel(true);
    const pumps_excel_qpl = await get_pump_export_excel(false);

    console.log("Building certificate excel file");
    //HERE
    const certificates = await certificateExport.getCertificates();
    const certificates_rows = certificateExport.getExportable(certificates);
    const certificates_excel = certificateExport.toXLXS(certificates_rows);

    return {
        pumps: {
            qpl: pumps_excel_qpl,
            full: pumps_excel_full
        },
        circulators: {
            qpl: circulator_excel_qpl,
            full: circulator_excel_full
        },
        certificates: certificates_excel
    }
};

const get_pump_export_excel = async (is_full) => {
    const operators = params();
    const full_headers = [
        'rating_id',
        'participant',
        'basic_model',
        'individual_model',
        'motor_type',
        'brand',
        'lab',
        'section',
        'configuration',
        'doe',
        'diameter',
        'speed',
        'stages',
        'flow_bep',
        'head_bep',
        'driver_input_power_bep',
        'control_power_input_bep',
        'control_power_input_bep',
        'motor_power_rated',
        'pei',
        'energy_rating',
        'date',
        'revision'
    ]
    const qpl_headers = [
        'rating_id'
    ]

    if (is_full) {
        headers = full_headers;
    }
    else {
        headers = qpl_headers;
    }

    let filter = function (key) {
        return headers.indexOf(key) >= 0;
    }
    let sorter = function (a, b) {
        let i = headers.indexOf(a.value);
        let j = headers.indexOf(b.value);
        return i - j;
    }
    let full_headings = {
        rating_id: "Rating ID",
        participant: "Participant",
        configuration: "Configuration",
        basic_model: "Basic model designation",
        individual_model: "Manufacturer's model designation",
        motor_type: "Motor Type",
        brand: 'Brand',
        diameter: 'Full impeller diameter',
        speed: 'Nominal Speed',
        lab: 'HI Approved laboratory',
        section: 'Section',
        stages: 'Stages',
        doe: 'DOE product category',
        energy_rating: 'Pump Energy Rating',
        flow_bep: 'BEP Flow rate',
        head_bep: 'BEP Head',
        driver_input_power_bep: 'BEP Driver input power',
        control_power_input_bep: 'BEP Control input power',
        motor_power_rated: 'Rated motor power',
        pei: 'Pump Energy Index',
        date: 'Date listed',
        revision: 'Date updated'
    }
    let qpl_headings = {
        rating_id: "Rating ID"
    }
    if (is_full) {
        headings = full_headings;
    }
    else {
        headings = qpl_headings;
    }

    const docs = await schemas.Pumps.aggregate(operators).exec();
    console.log("Aggregation (subscribers)");
    console.log(docs.length + ' pumps to export and email');

    for (const pump of docs) {
        pump.flow_bep = pump.load120 ? pump.flow.bep100 : pump.flow.bep110;
        pump.head_bep = pump.load120 ? pump.head.bep100 : pump.head.bep110;
        if (pump.driver_input_power) {
            pump.driver_input_power_bep =
                pump.load120 ? pump.driver_input_power.bep100 : pump.driver_input_power.bep110;
            if (pump.driver_input_power_bep) {
                pump.driver_input_power_bep = pump.driver_input_power_bep.toFixed(2);
            }
        }
        if (pump.control_power_input) {
            pump.control_power_input_bep = pump.control_power_input.bep100;
            if (pump.control_power_input_bep) {
                pump.control_power_input_bep = pump.control_power_input_bep.toFixed(2);
            }
        }
        pump.pei = pump.pei.toFixed(2);
        pump.motor_power_rated = pump.motor_power_rated ? pump.motor_power_rated : pump.motor_power_rated_results
        pump.date = moment(pump.date).format("DD MMM YYYY")
        if (pump.revisions.length > 0) {
            pump.date = moment(pump.revisions[0].date).format("DD MM YYYY");
        }
        if (pump.revisions.length > 1) {
            pump.revision = moment(pump.revisions[pump.revisions.length - 1].date).format("DD MM YYYY");
        } else {
            pump.revision = "-";
        }
        pump.lab = pump.laboratory.name + " - " + pump.laboratory.code;

        pump.diameter = pump.diameter.toFixed(3);
        pump.flow_bep = pump.flow_bep.toFixed(2);
        pump.head_bep = pump.head_bep.toFixed(2);
        pump.motor_power_rated = pump.motor_power_rated.toFixed(2);

        pump.motor_type = pump.motor_type ? pump.motor_type:null;

    };
    console.log("Create excel export sheet");

    const buffer = toxl(docs, {
        sort: sorter,
        headings: headings,
        filter: filter
    });
    return buffer
}