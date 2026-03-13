exports.US = "US";
exports.METRIC = "METRIC";

exports.factors = {
    flow: 0.227124707,
    head: 0.3048,
    power: 0.745699872,
    diameter: 25.4
}
exports.labels = {
    flow: {
        US: "gpm",
        METRIC: "m3/hr"
    },
    head: {
        US: "ft",
        METRIC: "m"
    },
    diameter: {
        US: "inches",
        METRIC: "mm"
    },
    power: {
        US: "hp",
        METRIC: "kW"
    }
}

var factors = exports.factors;

exports.convert_to_us = function (pump) {
    if (pump.unit_set == "US") return pump;
    else return convert(pump, -1, true);
}
exports.convert_to_metric = function (pump) {
    if (pump.unit_set == "METRIC") return pump;
    else return convert(pump, 1);
}

exports.convert_circulator_to_us = function (pump) {
    if (pump.unit_set == "US") return pump;
    else return convert_circulator(pump, -1, true);
}
exports.convert_circulator_to_metric = function (pump) {
    if (pump.unit_set == "METRIC") return pump;
    else return convert_circulator(pump, 1);
}

exports.make_units = function (unit_set) {
    return {
        active: unit_set,
        flow: {
            label: exports.labels.flow[unit_set],
            factor: unit_set == exports.US ? 1 : exports.factors.flow
        },
        head: {
            label: exports.labels.head[unit_set],
            factor: unit_set == exports.US ? 1 : exports.factors.head
        },
        power: {
            label: exports.labels.power[unit_set],
            factor: unit_set == exports.US ? 1 : exports.factors.power
        },
        diameter: {
            label: exports.labels.diameter[unit_set],
            factor: unit_set == exports.US ? 1 : exports.factors.diameter
        }
    }
}

exports.convert_motor_rated_power_result = function (motor_rated_power) {
    return motor_rated_power * exports.factors.power;
}
var convert_circulator = function (pump, flip, round) {
    const retval = JSON.parse(JSON.stringify(pump));

    if (retval.flow) {
        retval.flow *= Math.pow(factors.flow, flip);
    }
    if (retval.head) {
        for (let i = 0; i < retval.head.length; i++) {
            retval.head[i] *= Math.pow(factors.head, flip);
        }
    }
    if (retval.least && retval.least.input_power) {
        for (let i = 0; i < retval.least.input_power.length; i++) {
            retval.least.input_power[i] *= Math.pow(factors.power, flip);
        }
    }
    if (retval.most && retval.most.input_power) {
        for (let i = 0; i < retval.most.input_power.length; i++) {
            retval.most.input_power[i] *= Math.pow(factors.power, flip);
        }
    }
    if (retval.least && retval.least.output_power) {
        for (let i = 0; i < retval.least.output_power.length; i++) {
            retval.least.output_power[i] *= Math.pow(factors.power, flip);
        }
    }
    if (retval.most && retval.most.output_power) {
        for (let i = 0; i < retval.most.output_power.length; i++) {
            retval.most.output_power[i] *= Math.pow(factors.power, flip);
        }
    }
    return retval;

}
var convert = function (pump, flip, round) {
    var retval = JSON.parse(JSON.stringify(pump));

    if (retval.diameter) {
        retval.diameter *= Math.pow(factors.diameter, flip);
    }

    if (retval.bowl_diameter) {
        retval.bowl_diameter *= Math.pow(factors.diameter, flip);
        if (round) retval.bowl_diameter = Math.round(retval.bowl_diameter);
    }

    if (retval.motor_power_rated) {
        retval.motor_power_rated *= Math.pow(factors.power, flip);
        if (round) retval.motor_power_rated = Math.round(retval.motor_power_rated);
    }

    if (retval.flow) {
        retval.flow.bep75 *= Math.pow(factors.flow, flip);
        retval.flow.bep100 *= Math.pow(factors.flow, flip);
        retval.flow.bep110 *= Math.pow(factors.flow, flip);
    }
    if (retval.head) {
        retval.head.bep75 *= Math.pow(factors.head, flip);
        retval.head.bep100 *= Math.pow(factors.head, flip);
        retval.head.bep110 *= Math.pow(factors.head, flip);
    }

    if (retval.pump_input_power) {
        retval.pump_input_power.bep75 *= Math.pow(factors.power, flip);
        retval.pump_input_power.bep100 *= Math.pow(factors.power, flip);
        retval.pump_input_power.bep110 *= Math.pow(factors.power, flip);
        if (retval.pump_input_power.bep120) retval.pump_input_power.bep120 *= Math.pow(factors.power, flip);
    }
    if (retval.driver_input_power) {
        retval.driver_input_power.bep75 *= Math.pow(factors.power, flip);
        retval.driver_input_power.bep100 *= Math.pow(factors.power, flip);
        retval.driver_input_power.bep110 *= Math.pow(factors.power, flip);
    }
    if (retval.control_power_input) {
        retval.control_power_input.bep25 *= Math.pow(factors.power, flip);
        retval.control_power_input.bep50 *= Math.pow(factors.power, flip);
        retval.control_power_input.bep75 *= Math.pow(factors.power, flip);
        retval.control_power_input.bep100 *= Math.pow(factors.power, flip);
    }
    if (retval.measured_control_power_input) {
        retval.measured_control_power_input.bep25 *= Math.pow(factors.power, flip);
        retval.measured_control_power_input.bep50 *= Math.pow(factors.power, flip);
        retval.measured_control_power_input.bep75 *= Math.pow(factors.power, flip);
        retval.measured_control_power_input.bep100 *= Math.pow(factors.power, flip);
    }
    if (retval.measured_control_flow_input) {
        retval.measured_control_flow_input.bep25 *= Math.pow(factors.flow, flip);
        retval.measured_control_flow_input.bep50 *= Math.pow(factors.flow, flip);
        retval.measured_control_flow_input.bep75 *= Math.pow(factors.flow, flip);
        retval.measured_control_flow_input.bep100 *= Math.pow(factors.flow, flip);
    }
    if (retval.measured_control_head_input) {
        retval.measured_control_head_input.bep25 *= Math.pow(factors.head, flip);
        retval.measured_control_head_input.bep50 *= Math.pow(factors.head, flip);
        retval.measured_control_head_input.bep75 *= Math.pow(factors.head, flip);
        retval.measured_control_head_input.bep100 *= Math.pow(factors.head, flip);
    }
    return retval;
}