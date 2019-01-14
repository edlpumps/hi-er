const Excel = require('exceljs');
const UOM = require('../utils/uom');
const calculator = require('../circulator-calculator');

const NO_SPEED_CONTROL = {
    label: 'no-speed-control',
    input: 'No Speed Control',
    column: 'H',
    number: 1
};
const PRESSURE_CONTROL = {
    label: 'pressure-control',
    input: 'Pressure Control',
    column: 'I',
    number: 2
};
const TEMPERATURE_CONTROL = {
    label: 'temperature-control',
    input: 'Temperature Control',
    column: 'J',
    number: 3
};
const EXTERNAL_CONTROL = {
    label: 'external-control',
    input: 'External Input Signal Only Control',
    column: 'K',
    number: 4
};
const EXTERNAL_AND_OTHER_CONTROL = {
    label: 'external-other-control',
    input: 'External Input Signal and Other Controls',
    column: 'L',
    number: 5
};
const MANUAL_CONTROL = {
    label: 'manual-control',
    input: 'Manual Speed Controls',
    column: 'M',
    number: 6
};
const control_methods = [
    NO_SPEED_CONTROL, PRESSURE_CONTROL,
    TEMPERATURE_CONTROL, EXTERNAL_CONTROL,
    EXTERNAL_AND_OTHER_CONTROL, MANUAL_CONTROL
]
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
        row.lc_control_method = lc.label;
        row.lc_pressure_curve = readCell(sheet, "P", rowNumber);
    } else {
        row.failure = 'No control methods specified';
        return row;
    }

    const mc = resolve_control_method(sheet, MC_CONTROL_METHOD_COLUMN, rowNumber);
    if (mc) {
        row.mc_control_method = mc.label;
        row.mc_pressure_curve = readCell(sheet, "Q", rowNumber);
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
    row.lc_pei = readNumeric(sheet, "AI", rowNumber);

    if (row.head.length != 4) {
        row.failure = 'Four head data points are required';
        return row;
    }
    if (isNaN(row.flow)) {
        row.failure = 'Flow Rate is required';
        return row;
    }
    if (isNaN(row.lc_pei)) {
        row.failure = 'PEI for least consumptive method is required';
        return row;
    }

    if (lc.number <= 4) {
        row.lc_input_power = readNumericArray(sheet, ["R", "S", "T", "U"], rowNumber);
        if (row.lc_input_power.length !== 4) {
            row.failure = 'Least consumptive method specified requires four power inputs';
            return row;
        }
    } else {
        row.lc_input_power = readNumericArray(sheet, ["V", "W"], rowNumber);
        if (row.lc_input_power.length !== 2) {
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
            row.mc_input_power = readNumericArray(sheet, ["X", "Y", "Z", "AA"], rowNumber);
            if (row.mc_input_power.length !== 4) {
                row.failure = 'Most consumptive method specified requires four power inputs';
                return row;
            }
        } else {
            row.mc_input_power = readNumericArray(sheet, ["AB", "AC"], rowNumber);
            if (row.mc_input_power.length !== 2) {
                row.failure = 'Most consumptive method specified requires max/reduced power inputs';
                return row;
            }
        }
        row.mc_pei = readNumeric(sheet, "AJ", rowNumber);

        if (isNaN(row.mc_pei)) {
            row.failure = 'PEI for most consumptive method is required';
            return row;
        }
    }


    // calculate the energy rating for the pump (lc and mc)
    const least = {
            type: row.type,
            input_power: row.lc_input_power,
            head: row.head,
            flow: row.flow,
            pei_input: row.lc_pei
    }
    let results = calculator.calculate_energy_rating(row.lc_control_method, least);
    
    row.lc_energy_rating = results.least.energy_rating
    if ( mc ) {
        const most = {
            type: row.type,
            input_power: row.mc_input_power,
            head: row.head,
            flow: row.flow,
            pei_input: row.mc_pei
        }
        results = calculator.calculate_energy_rating(row.mc_control_method, most);
        row.mc_energy_rating = results.most.energy_rating
    }
    
    return row;
}




const apply_units = (pump, units) => {
    if (units == UOM.US) return;

    pump.lc_input_power = pump.lc_input_power.map(p => p / UOM.factors.power);
    if (pump.mc_input_power) {
        pump.mc_input_power = pump.mc_input_power.map(p => p / UOM.factors.power);
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









exports.load_file = load_file;