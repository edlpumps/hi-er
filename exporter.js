const circulatorExport = require('./circulator-export');
const certificateExport = require('./certificate-export');
const params = require('./search').params;
const schemas = require('./schemas');
const moment = require('moment');
const common = require('./utils/export_common')

var gParticipants = null;

exports.create = async (which="all") => {
    let retval = {
        pumps: {
            qpl: null,
            full: null
        },
        circulators: {
            qpl: null,
            full: null
        },
        certificates: {
            qpl: null,
            full: null
        }
    }
    gParticipants = await schemas.Participants.find({active: true}, '_id name').lean().exec();
    
    if (which == "circulators" || which == "all") {
        console.log("Building circulator excel file");
        const circulators = await circulatorExport.getCirculators();
        const circulator_rows = circulatorExport.getExportable(circulators,gParticipants);
        retval['circulators']['full'] = await common.toXLSX(circulator_rows,
            {'headers': common.circulator_full_headers,'type': 'circulators', 'type_of_data': 'full'});
        retval['circulators']['qpl'] = await common.toXLSX(circulator_rows, 
            {'headers': common.circulator_qpl_headers,'type': 'circulators', 'type_of_data': 'qpl'});
    }
    if (which == "pumps" || which == "all") {
        console.log("Building c&i excel file");
        const pumps = await getPumps();
        const pump_rows = getExportable(pumps);
        retval['pumps']['full'] = await common.toXLSX(pump_rows, 
            {'headers': common.pump_full_headers,'type': 'pumps', 'type_of_data': 'full'});
        retval['pumps']['qpl'] = await common.toXLSX(pump_rows, 
            {'headers': common.pump_qpl_headers,'type': 'pumps', 'type_of_data': 'qpl'});
    }
    if (which == "certificates" || which == "all") {
        console.log("Building certificate excel file");
        const certificates = await certificateExport.getCertificates();
        const certificates_rows = certificateExport.getExportable(certificates);
        retval['certificates']['full'] = await common.toXLSX(certificates_rows, 
            {'headers': common.certificate_headers,'type': 'certificates', 'type_of_data': 'full'});
        retval['certificates']['qpl'] = await common.toXLSX(certificates_rows, 
            {'headers': common.certificate_headers,'type': 'certificates', 'type_of_data': 'full'});
    }

    return retval;
};

const getPumps = async () => {
    const operators = params();
    const pumps = await schemas.Pumps.aggregate(operators).exec();
    return pumps;
}

const getExportable = (pumps) => {
    const calculator = require('./calculator');
    for (const pump of pumps) {
        if (pump.participant) {
            //Find the pump id in the gParticipants array
            pump.participant = gParticipants.find(p => p._id.toString() === pump.participant._id.toString());
            pump.participant = pump.participant ? pump.participant.name : "ID";
        }
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
        pump.laboratory = pump.laboratory ? pump.laboratory.name + " - " + pump.laboratory.code : "N/A";

        //Get HP and Tier
        retval = calculator.calculate_pump_hp_group_and_tier(pump);
        pump.hp_group = retval.hp_group;
        pump.cee_tier = retval.cee_tier;

        pump.pei = pump.pei.toFixed(2);
        pump.diameter = pump.diameter.toFixed(3);
        pump.flow_bep = pump.flow_bep.toFixed(2);
        pump.head_bep = pump.head_bep.toFixed(2);
        pump.motor_power_rated = pump.motor_power_rated.toFixed(2);

        pump.motor_type = pump.motor_type ? pump.motor_type:null;

        
    }
    return pumps;
}