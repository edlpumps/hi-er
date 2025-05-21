const circulatorExport = require('./circulator-export');
const certificateExport = require('./certificate-export');
const params = require('./search').params;
const schemas = require('./schemas');
const moment = require('moment');
const common = require('./utils/export_common')

exports.create = async () => {
    console.log("Building circulator excel file");
    const circulators = await circulatorExport.getCirculators();
    const circulator_rows = circulatorExport.getExportable(circulators);
    const circulator_excel_full = common.toXLSX(circulator_rows,
        {'headers': common.circulator_full_headers,'type': 'circulators'});
    const circulator_excel_qpl = common.toXLSX(circulator_rows, 
        {'headers': common.circulator_qpl_headers,'type': 'circulators'});
    
    console.log("Building c&i excel file");
    const pumps = await getPumps();
    const pump_rows = getExportable(pumps);
    const pumps_excel_full = common.toXLSX(pump_rows, 
        {'headers': common.pump_full_headers,'type': 'pumps'});
    const pumps_excel_qpl = common.toXLSX(pump_rows, 
        {'headers': common.pump_qpl_headers,'type': 'pumps'});

    console.log("Building certificate excel file");
    const certificates = await certificateExport.getCertificates();
    const certificates_rows = certificateExport.getExportable(certificates);
    const certificates_excel_full = common.toXLSX(certificates_rows, 
        {'headers': common.certificate_headers,'type': 'certificates'});
    const certificates_excel_qpl = null;

    return {
        pumps: {
            qpl: pumps_excel_qpl,
            full: pumps_excel_full
        },
        circulators: {
            qpl: circulator_excel_qpl,
            full: circulator_excel_full
        },
        certificates: {
            qpl: certificates_excel_qpl,
            full: certificates_excel_full
        }
    }
};

const getPumps = async () => {
    const operators = params();
    const pumps = await schemas.Pumps.aggregate(operators).exec();
    return pumps;
}

const getExportable = (pumps) => {
    for (const pump of pumps) {
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
    }
    return pumps;
}