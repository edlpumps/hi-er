const debug = require('debug')('circ-calc');
const assert = require('assert');

const PT_025 = 0;
const PT_050 = 1;
const PT_075 = 2;
const PT_100 = 3;

const VALID = 'VALID';
const RETEST = 'RE-TEST';
const CHECKSIGN = 'CHECK SIGN';
const CONSERVATIVE_PEI = 'CONSERVATIVE PEI';
const ERROR = 'ERROR';

const CP1 = 'CP1';
const CP2 = 'CP2';
const CP3 = 'CP3';

const input_to_number = (input) => {
    const v = parseFloat(input);
    if (isNaN(v)) return undefined;
    return v;
}

const input_to_pump_type = (input) => {
    const v = input.toLowerCase().trim();
    switch (v) {
        case 'cp1':
            return CP1;
        case 'cp2':
            return CP2;
        case 'cp3':
            return CP3;
        default:
            return undefined;
    }
}

const average = (numbers) => {
    let sum = 0;
    for (let i = 0; i < numbers.length; i++) sum += numbers[i];
    return sum / numbers.length;
}

const apply_coeffs = (points, coeffs) => {
    let sum = 0;
    for (let i = 0; i < points.length; i++) {
        sum += coeffs[i] * points[i];
    }
    return sum;
}

const check_pei = (input, calculated) => {
    const pei_diff = Math.abs(calculated - input);
    let pei_validity = VALID;
    if (pei_diff > 0.02) {
        if (input < calculated) {
            pei_validity = RETEST;
        } else {
            pei_validity = CONSERVATIVE_PEI;
        }
    }
    return pei_validity;
}
const calculate_per_ref = (_type, /*_power, */ _head, _flow /*, _pei*/) => {
    ///////////////////////////////////////////////////////////////////
    // Input Checks
    ///////////////////////////////////////////////////////////////////
    const type = input_to_pump_type(_type);
    assert(type, 'PER-ref Violation:  Pump type must be valid (CP1/2/3) - was given [' + _type + ']');

    assert(_head, 'Must provide head');
    assert(_head.length == 4, 'PER-ref Violation:  Must provide head points at 25, 50, 75, 100% BEP');

    const head = _head.map(input_to_number);
    const flow100 = input_to_number(_flow);

    assert(head[PT_025] !== undefined, 'PER-ref Violation:  Head @25% BEP not specified or is NaN');
    assert(head[PT_050] !== undefined, 'PER-ref Violation:  Head @50% BEP not specified or is NaN');
    assert(head[PT_075] !== undefined, 'PER-ref Violation:  Head @75% BEP not specified or is NaN');
    assert(head[PT_100] !== undefined, 'PER-ref Violation:  Head @100% BEP not specified or is NaN');

    assert(flow100, 'PER-ref Violation:  Must provide flow BEP');

    ///////////////////////////////////////////////////////////////////
    // Load Point Flow rate
    ///////////////////////////////////////////////////////////////////
    const flow = [
        0.25 * flow100,
        0.5 * flow100,
        0.75 * flow100,
        flow100
    ];

    ///////////////////////////////////////////////////////////////////
    // Hydraulic Output Powers
    ///////////////////////////////////////////////////////////////////
    const DEN = 3956;
    const output_power = [0, 0, 0, 0];
    for (let i = 0; i < 4; i++) {
        output_power[i] = flow[i] * head[i] / DEN;
    }

    let output_power_validity = VALID;
    if (type == CP2 && output_power[PT_100] > 5) {
        output_power_validity = RETEST;
        debug(`Output power @100 BEP requires RE-TEST`);
        return {
            output_power_validity
        }
    }

    ///////////////////////////////////////////////////////////////////
    // Refrence Water to Wire Overall Efficiency at BEP
    ///////////////////////////////////////////////////////////////////
    let w2wEfficiency_ref;
    if (output_power[PT_100] < 0) {
        output_power_validity = CHECKSIGN;
    } else if (output_power[PT_100] < 1) {
        w2wEfficiency_ref = 10 * Math.log(output_power[PT_100] + 0.001141) + 67.78;
    } else if (output_power[PT_100] >= 1) {
        w2wEfficiency_ref = 67.79;
    }

    ///////////////////////////////////////////////////////////////////
    // Refrence Input Powers
    ///////////////////////////////////////////////////////////////////
    const reference_input_power = [0, 0, 0, 0];
    const IP_COEFF = [0.4843, 0.7736, 0.9417, 1];
    for (let i = 0; i < 4; i++) {
        reference_input_power[i] = output_power[i] / (IP_COEFF[i] * (w2wEfficiency_ref / 100));
    }

    ///////////////////////////////////////////////////////////////////
    // PER Ref
    ///////////////////////////////////////////////////////////////////
    const per_ref = average(reference_input_power);
    return {
        reference_input_power,
        output_power,
        w2wEfficiency_ref,
        output_power_validity,
        per_ref
    }
}

const calculate_baseline_pei = (_type, _head, _flow) => {
    const {
        output_power,
        per_ref,
        w2wEfficiency_ref,
    } = calculate_per_ref(_type, _head, _flow);

    let output_power_validity_baseline = VALID;
    let w2wEfficiency_baseline = 0;
    if (output_power[PT_100] < 0) {
        output_power_validity_baseline = CHECKSIGN;
    } else if (output_power[PT_100] < 1) {
        w2wEfficiency_baseline = 7.065 * Math.log(output_power[PT_100] + 0.003958) + 39.08;
    } else if (output_power[PT_100] >= 1) {
        w2wEfficiency_baseline = 39.11;
    }

    const baseline_input_power = [0, 0, 0, 0];
    const IP_COEFF = [0.4671, 0.7674, 0.9425, 1];
    for (let i = 0; i < 4; i++) {
        baseline_input_power[i] = output_power[i] / (IP_COEFF[i] * (w2wEfficiency_baseline / 100));
    }

    const per_baseline = average(baseline_input_power);
    const pei_baseline = per_baseline / per_ref;
    return {
        output_power_validity_baseline,
        baseline_input_power,
        output_power,
        w2wEfficiency_baseline,
        per_ref,
        per_baseline,
        pei_baseline,
        w2wEfficiency_ref
    }
}

const calculate_energy_rating = (pump, power, coefficients) => {
    const type = input_to_pump_type(pump.circulator.type);

    const head = pump.circulator.head.map(input_to_number);
    const flow = input_to_number(pump.circulator.flow);
    const pei_input = input_to_number(pump.circulator.pei_input);

    const per = apply_coeffs(power, coefficients);

    const result = calc_pei_and_validity(type, per, head, flow, pei_input);
    const {
        pei_baseline,
        output_power,
        w2wEfficiency_ref,
        per_ref,
    } = calculate_baseline_pei(type, head, flow);

    console.log("--------------------------");
    console.log(output_power);
    console.log("--------------------------");

    if (result.pei_validity != RETEST) {
        result.energy_rating = (pei_baseline - pei_input) * 100;
    }
    result.waip = per_ref;
    result.output_power = result.output_power;
    result.water_to_wire_efficiency = w2wEfficiency_ref;
    return result;
}

const noControl = (pump) => {
    const type = input_to_pump_type(pump.circulator.type);
    const power = pump.circulator.input_power.map(input_to_number);
    const head = pump.circulator.head.map(input_to_number);
    const flow = input_to_number(pump.circulator.flow);
    const pei_input = input_to_number(pump.circulator.pei_input);

    const {
        per_ref,
        output_power,
        w2wEfficiency_ref,
    } = calculate_per_ref(type, head, flow);

    const per_input = average(power);
    const pei = per_input / per_ref;

    const pei_diff = Math.abs(pei - pei_input);
    const pei_validity = check_pei(pei_input, pei);
    const {
        per_baseline,
        pei_baseline
    } = calculate_baseline_pei(type, head, flow);

    const energy_rating = (pei_baseline - pei_input) * 100;
    const water_to_wire_efficiency = w2wEfficiency_ref
    return {
        per_ref,
        pei_input,
        per_baseline,
        pei_baseline,
        per_input,
        pei_diff,
        pei_validity,
        energy_rating,
        pei,
        output_power,
        water_to_wire_efficiency,
    }
}

const calc_pei_and_validity = (type, per, head, flow, pei_input) => {
    const {
        per_ref,
        output_power,
        w2wEfficiency_ref,
    } = calculate_per_ref(type, head, flow);

    const pei = per / per_ref;
    const pei_validity = check_pei(pei_input, pei);
    return {
        pei,
        per_ref,
        pei_validity,
        output_power,
        w2wEfficiency_ref,
    }
}

const calc_with_controls = (pump, coeffs) => {

    const power = pump.circulator.input_power.map(input_to_number);
    return calculate_energy_rating(
        pump,
        power,
        coeffs
    )
}

const commonControl = (pump) => {
    return calc_with_controls(pump, [0.05, 0.4, 0.4, 0.15])
}

const externalInput = (pump) => {
    // Change requested 1/4/2021 - swap 0.7/0.3
    return calc_with_controls(pump, [0.3, 0.7])
}

const manualControl = (pump) => {
    return calc_with_controls(pump, [0.75, 0.25])
}





exports.noControl = noControl;
exports.pressureControl = commonControl;
exports.temperatureControl = commonControl;
exports.externalControl = commonControl;
exports.externalInput = externalInput;
exports.manualControl = manualControl;
exports.commonControl = commonControl;
exports.calculate_per_ref = calculate_per_ref;
exports.calculate_baseline_pei = calculate_baseline_pei;


exports.calculate_energy_rating = (control_method, input) => {
    const params = {
        circulator: input
    };
    switch (control_method) {
        case 'no-speed-control':
            return noControl(params);
        case 'manual-control':
            return manualControl(params);
        case 'pressure-control':
        case 'temperature-control':
        case 'external-control':
            return commonControl(params);
        case 'external-other-control':
            return externalInput(params);
        default:
            return undefined;
    }
}