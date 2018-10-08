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
const cases3_5 = new Map();
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
    section5.constant_load_energy_index = row.val('BB');
    section5.energy_rating = row.val('BD');
    pump.certificate_5 = section5;
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