const xlsx = require('xlsx');
const unflatten = require('flat').unflatten;
const sheets = xlsx.readFile('./data.xlsx');
const fs = require('fs');

class RowAdapter {
    constructor(sheet, row) {
        this.sheet = sheet;
        this.row = row;
    }
    val(col) {
        const cell = this.sheet[`${col}${this.row}`];
        if (cell) return cell.v;
        return undefined;
    }
}

const db3 = sheets.Sheets['III Database Fields'];
const columns3 = ['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

const Section3 = new Map();
for (const column of columns3) {
    const ratingId = db3[`${column}38`].v;
    let pump = {};
    for (let row = 1; row <= 93; row++) {
        const key = db3[`A${row}`].v;
        const cell = db3[`${column}${row}`]
        if (cell) {
            pump[key] = cell.v;
        }
    }
    pump = unflatten(pump);
    Section3.set(ratingId, pump);
}

const calc3_5 = sheets.Sheets['III_V'];
const calc3_7 = sheets.Sheets['III_VII'];

for (let r = 6; r <= 16; r++) {
    const row = new RowAdapter(calc3_5, r);
    const rating = row.val('A');
    const pump = Section3.get(rating);
    const section5 = {}; //certificate_5
    section5.motor = {
        motor_type: row.val('G'),
        efficiency: row.val('F'),
        power: row.val('H')
    }
    section5.minimum_efficiency_extended = row.val('T');
    section5.minimum_efficiency_extended_check = row.val('U') == 'Proceed';
    section5.default_efficiency_bands = row.val('V');
    section5.motor_efficiency_equivalent_bands = row.val('Z');
    section5.full_load_default_motor_losses = row.val('AA');
    section5.std_pump_input_to_motor_at_75_bep_flow = row.val('AB');
    section5.std_pump_input_to_motor_at_100_bep_flow = row.val('AC');
    section5.std_pump_input_to_motor_at_110_bep_flow = row.val('AD');
    section5.std_motor_part_load_loss_factor_at_75_bep = row.val('AE');
    section5.std_motor_part_load_loss_factor_at_100_bep = row.val('AF');
    section5.std_motor_part_load_loss_factor_at_110_bep = row.val('AG');
    section5.std_motor_part_load_loss_at_75_bep = row.val('AH');
    section5.std_motor_part_load_loss_at_100_bep = row.val('AI');
    section5.std_motor_part_load_loss_at_110_bep = row.val('AJ');
    section5.pump_input_power_at_75_bep = row.val('AK');
    section5.pump_input_power_at_100_bep = row.val('AL');
    section5.pump_input_power_at_110_bep = row.val('AM');
    section5.full_load_motor_losses_equivelant_bands_above_normal = row.val('AN');
    section5.pump_input_to_motor_power_ratio_at_75_bep = row.val('AO');
    section5.pump_input_to_motor_power_ratio_at_100_bep = row.val('AP');
    section5.pump_input_to_motor_power_ratio_at_110_bep = row.val('AQ');
    section5.motor_part_load_loss_factor_at_75_bep = row.val('AR');
    section5.motor_part_load_loss_factor_at_100_bep = row.val('AS');
    section5.motor_part_load_loss_factor_at_110_bep = row.val('AT');
    section5.nameplate_motor_part_load_losses_at_75_bep = row.val('AU');
    section5.nameplate_motor_part_load_losses_at_100_bep = row.val('AV');
    section5.nameplate_motor_part_load_losses_at_110_bep = row.val('AW');
    section5.driver_power_input_to_motor_at_75_bep = row.val('AX');
    section5.driver_power_input_to_motor_at_100_bep = row.val('AY');
    section5.driver_power_input_to_motor_at_110_bep = row.val('AZ');
    section5.constant_load_energy_rating = row.val('BA');
    section5.constant_load_energy_index = Math.round(row.val('BB') * 100) / 100;
    section5.energy_rating = Math.round(row.val('BD'));
    pump.certificate_5 = section5;
}

for (let r = 6; r <= 16; r++) {
    const row = new RowAdapter(calc3_7, r);
    const rating = row.val('A');
    const pump = Section3.get(rating);
    const section7 = {}; //certificate_5
    section7.motor = {
        motor_type: row.val('G'),
        efficiency: row.val('H'),
        power: row.val('F')
    }
    section7.minimum_efficiency_extended = row.val('U');
    section7.minimum_efficiency_extended_check = row.val('V') == 'Proceed';
    section7.default_efficiency_bands = row.val('W');
    section7.motor_efficiency_equivalent_bands = row.val('X');
    section7.full_load_default_motor_losses = row.val('Y');
    section7.std_pump_input_to_motor_at_100_bep_flow = row.val('Z')
    section7.std_motor_part_load_loss_factor_at_100_bep = row.val('AA');
    section7.std_motor_part_load_loss_at_100_bep = row.val('AB');
    section7.pump_input_power_at_100_bep = row.val('AC');
    section7.variable_load_pump_input_power_at_25_bep = row.val('AD');
    section7.variable_load_pump_input_power_at_50_bep = row.val('AE');
    section7.variable_load_pump_input_power_at_75_bep = row.val('AF');
    section7.motor_power_ratio_at_25_bep = row.val('AG');
    section7.motor_power_ratio_at_50_bep = row.val('AH');
    section7.motor_power_ratio_at_75_bep = row.val('AI');
    section7.motor_power_ratio_at_100_bep = row.val('AJ');
    section7.coeff_A = row.val('AK');
    section7.coeff_B = row.val('AL');
    section7.coeff_C = row.val('AM');
    section7.motor_and_control_part_load_loss_factor_at_25_bep = row.val('AN');
    section7.motor_and_control_part_load_loss_factor_at_50_bep = row.val('AO');
    section7.motor_and_control_part_load_loss_factor_at_75_bep = row.val('AP');
    section7.motor_and_control_part_load_loss_factor_at_100_bep = row.val('AQ');
    section7.full_load_nameplate_motor_losses = row.val('AR');
    section7.motor_and_control_default_part_load_loss_at_25_bep = row.val('AS');
    section7.motor_and_control_default_part_load_loss_at_50_bep = row.val('AT');
    section7.motor_and_control_default_part_load_loss_at_75_bep = row.val('AU');
    section7.motor_and_control_default_part_load_loss_at_100_bep = row.val('AV');
    section7.driver_power_input_to_motor_at_25_bep = row.val('AW');
    section7.driver_power_input_to_motor_at_50_bep = row.val('AX');
    section7.driver_power_input_to_motor_at_75_bep = row.val('AY');
    section7.driver_power_input_to_motor_at_100_bep = row.val('AZ');
    section7.variable_load_energy_rating = row.val('BA');
    section7.variable_load_energy_index = Math.round(row.val('BB') * 100) / 100;
    section7.energy_rating = Math.round(row.val('BC'));
    pump.certificate_7 = section7;
}

for (const pump of Section3.values()) {
    const filename = `./_${pump.rating_id}.json`;
    fs.writeFile(filename, JSON.stringify(pump, null, 2), function (err, result) {
        if (err) {
            console.log(`Failed to write ${filename}`);
        } else {
            console.log(`Saved test case to ${filename}`)
        }
    })
}