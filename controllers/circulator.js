const Excel = require('exceljs');
const UOM = require('../utils/uom');
const calculator = require('../circulator-calculator');
const path = require('path');
const tmp = require('tmp');
const fs = require('fs');


const NO_SPEED_CONTROL = {
    label: 'no-speed-control',
    input: 'No Speed Control',
    display: "Full Speed",
    column: 'H',
    number: 1
};
const PRESSURE_CONTROL = {
    label: 'pressure-control',
    input: 'Pressure Control',
    display: "Pressure",
    column: 'I',
    number: 2
};
const TEMPERATURE_CONTROL = {
    label: 'temperature-control',
    input: 'Temperature Control',
    display: "Temperature",
    column: 'J',
    number: 3
};
const EXTERNAL_CONTROL = {
    label: 'external-control',
    input: 'External Input Signal Only Control',
    display: "External Input Signal",
    column: 'K',
    number: 4
};
const EXTERNAL_AND_OTHER_CONTROL = {
    label: 'external-other-control',
    input: 'External Input Signal and Other Controls',
    display: "Adaptive Pressure",
    column: 'L',
    number: 5
};
const MANUAL_CONTROL = {
    label: 'manual-control',
    input: 'Manual Speed Controls',
    display: "Manual Speed",
    column: 'M',
    number: 6
};
const control_methods = [
    NO_SPEED_CONTROL, MANUAL_CONTROL, EXTERNAL_CONTROL, PRESSURE_CONTROL,
    EXTERNAL_AND_OTHER_CONTROL, TEMPERATURE_CONTROL,
]

exports.control_methods = control_methods;
const FIRST_PUMP_ROW = 5;
const PARTICIPANT_COLUMN = "A";
const BRAND_COLUMN = "B"
const BASIC_MODEL_COLUMN = "C";
const MANUFACTURER_MODEL_COLUMN = "D";
const ALTERNATIVE_PART_NUMBER_COLUMN = "E";
const PUMP_TYPE_COLUMN = "F";
const LABORATORY_COLUMN = "G";
const LC_CONTROL_METHOD_COLUMN = 'N';
const MC_CONTROL_METHOD_COLUMN = 'O';




const findLab = function (imported, labs) {
    if (!imported) return undefined;
    var found = labs.filter(function (lab) {
        return lab.code == imported || lab.name == imported;
    });
    if (found.length > 0) return found[0];
    else return undefined;
}



const readCell = (sheet, column, row) => {
    const cell = sheet.getCell(`${column}${row}`)
    if (cell && cell.value) {
        return cell.value.trim ? cell.value.trim() : cell.value.toString();
    }
}
const readNumeric = (sheet, column, row) => {
    const cell = sheet.getCell(`${column}${row}`)
    if (cell && cell.value) {
        return parseFloat(cell.value);
    }
}
const readNumericArray = (sheet, columns, row) => {
    return columns.map((c) => {
        return readNumeric(sheet, c, row)
    }).filter(n => !isNaN(n));
}
const readYesNoCell = (sheet, column, row) => {
    const cell = sheet.getCell(`${column}${row}`)
    if (cell && cell.value) {
        return cell.value.toUpperCase().indexOf('Y') >= 0;
    }
}
const resolve_control_method = (sheet, column, row) => {
    const text = readCell(sheet, column, row);
    if (!text) return;
    for (const control_method of control_methods) {
        if (control_method.input.toUpperCase() == text.toUpperCase()) {
            return control_method;
        }
    }
}



const extract_row = (sheet, rowNumber, labs) => {
    const row = {}
    row.template_row = rowNumber;
    row.participant = readCell(sheet, PARTICIPANT_COLUMN, rowNumber);
    if (!row.participant) return;

    row.brand = readCell(sheet, BRAND_COLUMN, rowNumber);
    row.basic_model = readCell(sheet, BASIC_MODEL_COLUMN, rowNumber);
    row.manufacturer_model = readCell(sheet, MANUFACTURER_MODEL_COLUMN, rowNumber);
    row.alternative_part_number = readCell(sheet, ALTERNATIVE_PART_NUMBER_COLUMN, rowNumber);
    row.type = readCell(sheet, PUMP_TYPE_COLUMN, rowNumber);
    row.laboratory = findLab(readCell(sheet, LABORATORY_COLUMN, rowNumber), labs);
    const lc = resolve_control_method(sheet, LC_CONTROL_METHOD_COLUMN, rowNumber);
    if (lc) {
        row.least = {
            control_method: lc.label,
            pressure_curve: readCell(sheet, "P", rowNumber)
        }
    } else {
        row.failure = 'No control methods specified';
        return row;
    }

    const mc = resolve_control_method(sheet, MC_CONTROL_METHOD_COLUMN, rowNumber);
    if (mc) {
        row.most = {
            control_method: mc.label,
            pressure_curve: readCell(sheet, "Q", rowNumber)
        }
    }

    row.control_methods = [];
    for (const control_method of control_methods) {
        if (readYesNoCell(sheet, control_method.column, rowNumber)) {
            row.control_methods.push(control_method.label);
        }
    }
    if (row.control_methods.length < 1) {
        row.failure = 'No control methods specified';
        return row;
    }
    if (row.control_methods.indexOf(lc.label) < 0) {
        row.failure = 'Control method conflict';
        return row;
    }

    const pump_types = ['CP1', 'CP2', 'CP3'];
    for (const t of pump_types) {
        if (row.type.indexOf(t) >= 0) {
            row.type = t;
        }
    }

    row.head = readNumericArray(sheet, ["AD", "AE", "AF", "AG"], rowNumber);
    row.flow = readNumeric(sheet, "AH", rowNumber);
    row.least.pei = readNumeric(sheet, "AI", rowNumber);

    if (row.head.length != 4) {
        row.failure = 'Four head data points are required';
        return row;
    }
    if (isNaN(row.flow)) {
        row.failure = 'Flow Rate is required';
        return row;
    }
    if (isNaN(row.least.pei)) {
        row.failure = 'PEI for least consumptive method is required';
        return row;
    }

    if (lc.number <= 4) {
        row.least.input_power = readNumericArray(sheet, ["R", "S", "T", "U"], rowNumber);
        if (row.least.input_power.length !== 4) {
            row.failure = 'Least consumptive method specified requires four power inputs';
            return row;
        }
    } else {
        row.least.input_power = readNumericArray(sheet, ["V", "W"], rowNumber);
        if (row.least.input_power.length !== 2) {
            row.failure = 'Least consumptive method specified requires max/reduced power inputs';
            return row;
        }
    }



    if (mc) {
        if (row.control_methods.indexOf(mc.label) < 0) {
            row.failure = 'Control method conflict';
            return row;
        }
        if (mc.number <= 4) {
            row.most.input_power = readNumericArray(sheet, ["X", "Y", "Z", "AA"], rowNumber);
            if (row.most.input_power.length !== 4) {
                row.failure = 'Most consumptive method specified requires four power inputs';
                return row;
            }
        } else {
            row.most.input_power = readNumericArray(sheet, ["AB", "AC"], rowNumber);
            if (row.most.input_power.length !== 2) {
                row.failure = 'Most consumptive method specified requires max/reduced power inputs';
                return row;
            }
        }
        row.most.pei = readNumeric(sheet, "AJ", rowNumber);

        if (isNaN(row.most.pei)) {
            row.failure = 'PEI for most consumptive method is required';
            return row;
        }
    }


    // calculate the energy rating for the pump (lc and mc)
    const least = {
        type: row.type,
        input_power: row.least.input_power,
        head: row.head,
        flow: row.flow,
        pei_input: row.least.pei
    }
    let results = calculator.calculate_energy_rating(row.least.control_method, least);
    row.least.energy_rating = results.energy_rating;
    row.least.output_power = results.output_power;
    row.least.water_to_wire_efficiency = results.water_to_wire_efficiency;
    row.least.pei_validity = results.pei_validity;
    if (row.least.pei_validity == 'RE-TEST') {
        const v = mc ? '(least consumptive)' : '';
        row.failure = `PEI Input is too low ${v}.  Please re-test`;
        return row;
    }
    if (mc) {
        const most = {
            type: row.type,
            input_power: row.most.input_power,
            head: row.head,
            flow: row.flow,
            pei_input: row.most.pei
        }
        results = calculator.calculate_energy_rating(row.most.control_method, most);
        row.most.energy_rating = results.energy_rating;
        row.most.output_power = results.output_power;
        row.most.water_to_wire_efficiency = results.water_to_wire_efficiency;
        row.most.pei_validity = results.pei_validity;
        if (row.most.pei_validity == 'RE-TEST') {
            row.failure = 'PEI Input is too low (most consumptive).  Please re-test';
            return row;
        }
    }

    return row;
}

exports.calculate_assembled_circulator = (circulator) => {
    const least = {
        type: circulator.type,
        input_power: circulator.least.input_power,
        head: circulator.head,
        flow: circulator.flow,
        pei_input: circulator.least.pei
    }
    let results = calculator.calculate_energy_rating(circulator.least.control_method, least);
    circulator.least.energy_rating = results.energy_rating;
    circulator.least.output_power = results.output_power;
    circulator.least.water_to_wire_efficiency = results.water_to_wire_efficiency;
    circulator.least.pei_validity = results.pei_validity;
    if (circulator.most && circulator.most.control_method) {
        const most = {
            type: circulator.type,
            input_power: circulator.most.input_power,
            head: circulator.head,
            flow: circulator.flow,
            pei_input: circulator.most.pei
        }
        results = calculator.calculate_energy_rating(circulator.most.control_method, most);
        circulator.most.energy_rating = results.energy_rating;
        circulator.most.output_power = results.output_power;
        circulator.most.water_to_wire_efficiency = results.water_to_wire_efficiency;
        circulator.most.pei_validity = results.pei_validity;
    }
    return circulator;
}



const apply_units = (pump, units) => {
    if (units == UOM.US) return;

    pump.least.input_power = pump.least.input_power.map(p => p / UOM.factors.power);
    if (pump.most) {
        pump.most.input_power = pump.most.input_power.map(p => p / UOM.factors.power);
    }
    pump.head = pump.head.map(p => p / UOM.factors.head);
    pump.flow = pump.flow / UOM.factors.flow;

}

// Returns in US units.
const load_file = async (participant, labs, unit_set, filename) => {
    try {
        const result = {
            ready: [],
            failed: []
        }
        const workbook = new Excel.Workbook();
        await workbook.xlsx.readFile(filename);
        const worksheet = workbook.getWorksheet(1);

        let row = FIRST_PUMP_ROW;
        let input = undefined;
        while (input = extract_row(worksheet, row, labs)) {
            // The first colum was the participant, but this
            // isn't honored - the logged in user is associated
            // with a participant account, and this is the only
            // participant the pumps can be listed under.
            input.participant = participant;

            if (input.failure) {
                result.failed.push(input);
            } else {
                apply_units(input, unit_set);
                result.ready.push(input);
            }
            row++;
        }

        return result;
    } catch (ex) {
        console.error("-------------------------------------------------------------------")
        console.error(`Exception while reading excel file for circulator pump import`);
        console.error("File:  " + filename);
        console.error(ex);
        console.error("-------------------------------------------------------------------")
        return undefined;
    }
}

const write_cell = (worksheet, column, row, value) => {
    let cell = worksheet.getCell(`${column}${row}`);
    cell.value = value;
}

const control_method_yn = (pump, method) => {
    if (pump.control_methods.indexOf(method) >= 0) return 'Yes';
    return '';
}

const export_pump = (worksheet, row, _pump, units) => {
    let pump = _pump;
    if (units == units.METRIC) {
        // pumps are stored internally in US units, switch to US to do calcs.
        pump = units.convert_circulator_to_metric(_pump);
    }

    write_cell(worksheet, 'A', row, pump.rating_id);
    write_cell(worksheet, 'B', row, pump.brand);
    write_cell(worksheet, 'C', row, pump.basic_model);
    write_cell(worksheet, 'D', row, pump.manufacturer_model);
    write_cell(worksheet, 'E', row, pump.alternative_part_number);
    write_cell(worksheet, 'F', row, pump.type);
    write_cell(worksheet, 'G', row, pump.laboratory ? pump.laboratory.name : '')
    write_cell(worksheet, 'H', row, control_method_yn(pump, 'no-speed-control'));
    write_cell(worksheet, 'I', row, control_method_yn(pump, 'pressure-control'));
    write_cell(worksheet, 'J', row, control_method_yn(pump, 'temperature-control'));
    write_cell(worksheet, 'K', row, control_method_yn(pump, 'external-control'));
    write_cell(worksheet, 'L', row, control_method_yn(pump, 'external-other-control'));
    write_cell(worksheet, 'M', row, control_method_yn(pump, 'manual-control'));
    write_cell(worksheet, 'AD', row, pump.head[0].toFixed(2));
    write_cell(worksheet, 'AE', row, pump.head[1].toFixed(2));
    write_cell(worksheet, 'AF', row, pump.head[2].toFixed(2));
    write_cell(worksheet, 'AG', row, pump.head[3].toFixed(2));
    write_cell(worksheet, 'AH', row, pump.flow.toFixed(2));

    // Least Consumptive exports    
    write_cell(worksheet, 'N', row, control_methods.filter(cm => cm.label == pump.least.control_method)[0].input);
    write_cell(worksheet, 'P', row, pump.least.pressure_curve);
    write_cell(worksheet, 'AI', row, pump.least.pei.toFixed(2));
    write_cell(worksheet, 'AK', row, pump.least.energy_rating.toFixed(0));
    if (pump.least.input_power.length == 4) {
        write_cell(worksheet, 'R', row, pump.least.input_power[0].toFixed(2))
        write_cell(worksheet, 'S', row, pump.least.input_power[1].toFixed(2))
        write_cell(worksheet, 'T', row, pump.least.input_power[2].toFixed(2))
        write_cell(worksheet, 'U', row, pump.least.input_power[3].toFixed(2))
    } else {
        write_cell(worksheet, 'V', row, pump.least.input_power[0].toFixed(2))
        write_cell(worksheet, 'W', row, pump.least.input_power[1].toFixed(2))
    }

    // Most Consumptive exports
    if (pump.most && pump.most.control_method) {
        write_cell(worksheet, 'O', row, control_methods.filter(cm => cm.label == pump.most.control_method)[0].input);
        write_cell(worksheet, 'Q', row, pump.most.pressure_curve);
        write_cell(worksheet, 'AJ', row, pump.most.pei.toFixed(2));
        write_cell(worksheet, 'AL', row, pump.most.energy_rating.toFixed(0));

        if (pump.most.input_power.length == 4) {
            write_cell(worksheet, 'X', row, pump.most.input_power[0].toFixed(2))
            write_cell(worksheet, 'Y', row, pump.most.input_power[1].toFixed(2))
            write_cell(worksheet, 'Z', row, pump.most.input_power[2].toFixed(2))
            write_cell(worksheet, 'AA', row, pump.most.input_power[3].toFixed(2))
        } else {
            write_cell(worksheet, 'AB', row, pump.most.input_power[0].toFixed(2))
            write_cell(worksheet, 'AC', row, pump.most.input_power[1].toFixed(2))
        }
    }





}
exports.export = async (pumps, units) => {
    const workbook = new Excel.Workbook();
    const template_path = path.join(__dirname, 'Attachment 1 - Circulator ER Template.xlsx');
    await workbook.xlsx.readFile(template_path);
    const worksheet = workbook.getWorksheet(1);
    let row = 5;
    for (const pump of pumps) {
        export_pump(worksheet, row++, pump, units);
    }
    const file_path = tmp.fileSync();

    return new Promise((resolve, reject) => {
        workbook.xlsx.writeFile(file_path.name).then((err) => {
            if (err) {
                console.error(err);
                reject(err);
            } else {
                resolve(file_path.name)
            }
        });
    });
}





exports.load_file = load_file;

const er_match = (e1, e2) => {
    if (!e1 && !e2) return true;
    return Math.abs(e1 - e2) < 1;
}

const conflict = (e, i) => {
    const model_conflict = e.basic_model == i.basic_model && e.manufacturer_model == i.manufacturer_model;
    if (model_conflict) return true;
    if (e.basic_model == i.basic_model) {
        let least_conflict = !e.least && !i.least;
        let most_conflict = !e.most && !i.most;
        if (e.least && i.least) {
            if (er_match(e.least.energy_rating, i.least.energy_rating)) least_conflict = true;
        }
        if (e.most && i.most) {
            if (er_match(e.most.energy_rating, i.most.energy_rating)) most_conflict = true;
        }
        return least_conflict && most_conflict;
    } else {
        return false;
    }

}
exports.check_import = (importing, existing) => {
    const active_exist = existing.filter(e => e.listed);

    for (let i = 0; i < importing.length; i++) {
        const _import = importing[i];
        const conflicts = active_exist.filter((e) => {
            return conflict(e, _import)
        });
        if (conflicts.length > 0) {
            _import.failure = "Manufacturer number or energy rating conflicts with another active pump under the same basic model number"
            continue;
        }
        for (let k = 0; k < i; k++) {
            if (conflict(_import, importing[k])) {
                _import.failure = "Manufactuer number or energy rating conflicts with a pump already being imported"
            }
        }
    }
    return importing;
}