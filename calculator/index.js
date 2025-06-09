"use strict";

/////////////////////////////////////////////////////////////////////
// Tabular data (should be moved to DB)
/////////////////////////////////////////////////////////////////////
var standard_c_values = {
    "ESCC-1800": 128.47,
    "ESCC-3600": 130.42,
    "ESFM-1800": 128.85,
    "ESFM-3600": 130.99,
    "IL-1800": 129.3,
    "IL-3600": 133.84,
    "RSV-1800": 129.63,
    "RSV-3600": 133.2,
    "ST-1800": 138.78,
    "ST-3600": 134.85
}

var baseline_c_values = {
    "ESCC-1800": 134.43,
    "ESCC-3600": 135.94,
    "ESFM-1800": 134.99,
    "ESFM-3600": 136.59,
    "IL-1800": 135.92,
    "IL-3600": 141.01,
    "RSV-1800": 129.63,
    "RSV-3600": 133.2,
    "ST-1800": 138.78,
    "ST-3600": 138.78
}

var default_motors_powers = [1, 1.5, 2, 3, 5, 7.5, 10, 15, 20, 25, 30, 40, 50, 60, 75, 100, 125, 150, 200, 250];

var motor_control_losses = [{
        min: 0,
        max: 5,
        a: -0.4658,
        b: 1.4965,
        c: 0.5303
    },
    {
        min: 5,
        max: 20,
        a: -1.3198,
        b: 2.9551,
        c: 0.1052
    },
    {
        min: 20,
        max: 50,
        a: -1.5122,
        b: 3.0777,
        c: 0.1847
    },
    {
        min: 50,
        max: Infinity,
        a: -0.8914,
        b: 2.8846,
        c: 0.2625
    },
]


/////////////////////////////////////////////////////////////////////
var lookup_motor_control_losses = function (pump) {
    return motor_control_losses.filter(
        cat => cat.min < pump.motor_power_rated && cat.max >= pump.motor_power_rated)[0];

}
var lookup_standard_c_value = function (pump) {
    var doe = String(pump.doe);
    var label = doe.toUpperCase() + "-" + pump.speed;
    return standard_c_values[label];
}
var lookup_baseline_c_value = function (pump) {
    var doe = String(pump.doe);
    var label = doe.toUpperCase() + "-" + pump.speed;
    return baseline_c_values[label];
}
var lookup_default_motor_efficiency = function (pump, power) {
    var doe = String(pump.doe).trim();
    var power_normalized;
    var fix = (power % 1 === 0) ? 0 : 1;
    if (typeof power === 'string' || power instanceof String) {
        power_normalized = parseFloat(power).toFixed(fix);
    } else {
        power_normalized = power.toFixed(fix);
    }
    var label = doe.toUpperCase() + "-" + power_normalized + "-" + pump.speed;
    var table = require("./default_motor_efficiencies.json");
    var retval = table[label];
    return retval;
}

var poly3 = function (c, x) {
    return c.a * Math.pow(x, 2) + c.b * x + c.c;
}

var build_error = function (error, pump) {
    return {
        success: false,
        reasons: error.constructor == Array ? error : [error],
        pump: pump
    }
}

var calculate_efficiency = function (pump, result, c, coefficients) {
    var flow = flow100(pump);
    var LN = Math.log;
    var terms = [
        coefficients[0] * Math.pow(LN(flow), 2),
        coefficients[1] * LN(result.ns) * LN(flow),
        coefficients[2] * Math.pow(LN(result.ns), 2),
        coefficients[3] * LN(flow),
        coefficients[4] * LN(result.ns), -(coefficients[5] + c)
    ]
    return terms.reduce(function (a, b) {
        return a + b;
    }, 0);
}

var part_load_loss = function (ratio) {
    return -0.4508 * Math.pow(ratio, 3) + 1.2399 * Math.pow(ratio, 2) - 0.4301 * ratio + 0.641;
}

var flow100 = function (pump) {
    var retval = pump.flow.bep100;
    if (pump.load120 === false || pump.load120 == 'false' || !pump.load120) {
        // The 100% point is actually in the 110 slot
        retval = pump.flow.bep110;
    }
    return retval;
}
var head100 = function (pump) {
    var retval = pump.head.bep100;
    if (pump.load120 === false || pump.load120 == 'false' || !pump.load120) {
        // The 100% point is actually in the 110 slot
        retval = pump.head.bep110;
    }
    return retval;
}

var calc_ns = function (pump) {
    var flow = pump.flow.bep100;
    var head = pump.head.bep100;

    if (pump.load120 === false || pump.load120 == 'false' || !pump.load120) {
        // The 100% point is actually in the 110 slot
        flow = pump.flow.bep110;
        head = pump.head.bep110;
    }
    return (pump.speed * Math.sqrt(flow) / Math.pow(head / pump.stages, 0.75));
}

var calc_full_load_motor_losses = function (pump, result) {
    return pump.motor_power_rated / (result.default_motor_efficiency / 100) - pump.motor_power_rated;
}

var section345_standard_common = function (pump, result) {
    result.standard_c_value = lookup_standard_c_value(pump);
    result.std_pump_efficiency = calculate_efficiency(pump, result, result.standard_c_value, [-0.85, -0.38, -11.48, 17.8, 179.8, 555.6]);

    result.hyd_power_bep75 = pump.flow.bep75 * pump.head.bep75 / 3956;
    result.hyd_power_bep100 = pump.flow.bep100 * pump.head.bep100 / 3956;
    result.hyd_power_bep110 = pump.flow.bep110 * pump.head.bep110 / 3956;

    result.std_pump_power_input_bep75 = result.hyd_power_bep75 / ((result.std_pump_efficiency / 100) * 0.947);
    result.std_pump_power_input_bep100 = result.hyd_power_bep100 / (result.std_pump_efficiency / 100);
    result.std_pump_power_input_bep110 = result.hyd_power_bep110 / ((result.std_pump_efficiency / 100) * 0.985);

    result.std_motor_power_ratio_bep75 = Math.min(1, result.std_pump_power_input_bep75 / pump.motor_power_rated)
    result.std_motor_power_ratio_bep100 = Math.min(1, result.std_pump_power_input_bep100 / pump.motor_power_rated)
    result.std_motor_power_ratio_bep110 = Math.min(1, result.std_pump_power_input_bep110 / pump.motor_power_rated)

    result.std_part_load_loss_factor_bep75 = part_load_loss(result.std_motor_power_ratio_bep75)
    result.std_part_load_loss_factor_bep100 = part_load_loss(result.std_motor_power_ratio_bep100)
    result.std_part_load_loss_factor_bep110 = part_load_loss(result.std_motor_power_ratio_bep110)

    result.std_part_load_loss_bep75 = result.std_part_load_loss_factor_bep75 * result.full_load_motor_losses;
    result.std_part_load_loss_bep100 = result.std_part_load_loss_factor_bep100 * result.full_load_motor_losses;
    result.std_part_load_loss_bep110 = result.std_part_load_loss_factor_bep110 * result.full_load_motor_losses;

    result.std_driver_power_input_bep75 = result.std_part_load_loss_bep75 + result.std_pump_power_input_bep75;
    result.std_driver_power_input_bep100 = result.std_part_load_loss_bep100 + result.std_pump_power_input_bep100;
    result.std_driver_power_input_bep110 = result.std_part_load_loss_bep110 + result.std_pump_power_input_bep110;

    // See DOE explanation above... they really want 0.3333 instead of 1/3 ¯\_(ツ)_/¯
    result.per_std_calculated = (result.std_driver_power_input_bep75 +
        result.std_driver_power_input_bep100 +
        result.std_driver_power_input_bep110) * 0.3333;

}

var section345_baseline_common = function (pump, result) {
    result.baseline_c_value = lookup_baseline_c_value(pump);
    result.baseline_pump_efficiency = calculate_efficiency(pump, result, result.baseline_c_value, [-0.85, -0.38, -11.48, 17.8, 179.8, 555.6]);

    result.baseline_pump_power_input_bep75 = result.hyd_power_bep75 / ((result.baseline_pump_efficiency / 100) * 0.947);
    result.baseline_pump_power_input_bep100 = result.hyd_power_bep100 / (result.baseline_pump_efficiency / 100);
    result.baseline_pump_power_input_bep110 = result.hyd_power_bep110 / ((result.baseline_pump_efficiency / 100) * 0.985);

    result.baseline_motor_power_ratio_bep75 = Math.min(1, result.baseline_pump_power_input_bep75 / pump.motor_power_rated)
    result.baseline_motor_power_ratio_bep100 = Math.min(1, result.baseline_pump_power_input_bep100 / pump.motor_power_rated)
    result.baseline_motor_power_ratio_bep110 = Math.min(1, result.baseline_pump_power_input_bep110 / pump.motor_power_rated)

    result.baseline_part_load_loss_factor_bep75 = part_load_loss(result.baseline_motor_power_ratio_bep75)
    result.baseline_part_load_loss_factor_bep100 = part_load_loss(result.baseline_motor_power_ratio_bep100)
    result.baseline_part_load_loss_factor_bep110 = part_load_loss(result.baseline_motor_power_ratio_bep110)

    result.baseline_part_load_loss_bep75 = result.baseline_part_load_loss_factor_bep75 * result.full_load_motor_losses;
    result.baseline_part_load_loss_bep100 = result.baseline_part_load_loss_factor_bep100 * result.full_load_motor_losses;
    result.baseline_part_load_loss_bep110 = result.baseline_part_load_loss_factor_bep110 * result.full_load_motor_losses;

    result.baseline_driver_power_input_bep75 = result.baseline_part_load_loss_bep75 + result.baseline_pump_power_input_bep75;
    result.baseline_driver_power_input_bep100 = result.baseline_part_load_loss_bep100 + result.baseline_pump_power_input_bep100;
    result.baseline_driver_power_input_bep110 = result.baseline_part_load_loss_bep110 + result.baseline_pump_power_input_bep110;

    // See DOE explanation above... they really want 0.3333 instead of 1/3 ¯\_(ツ)_/¯
    result.per_baseline_calculated = (result.baseline_driver_power_input_bep75 +
        result.baseline_driver_power_input_bep100 +
        result.baseline_driver_power_input_bep110) * 0.3333;

    // Change requested by HI - 12/21/2018.
    // Instead of using pei_baseline, always use 1.    
    result.pei_baseline = 1; /*result.per_baseline_calculated / result.per_std_calculated*/ ;

}

var calc_energy_rating = function (pump, result) {
    // Change requested by HI - 12/21/2018.
    // Instead of using pei_baseline, always use 1.
    // result.energy_rating = Math.round((result.pei_baseline - pump.pei) * 100);
    result.energy_rating = Math.round((1 /*result.pei_baseline*/ - pump.pei) * 100);
    result.energy_savings = (result.energy_rating / 100 * pump.motor_power_rated).toFixed(0);
}

var calc_driver_input_powers = function (pump, result) {
    result.pump_power_input_motor_power_ratio_bep75 = Math.min(1, pump.pump_input_power.bep75 / pump.motor_power_rated);
    result.pump_power_input_motor_power_ratio_bep100 = Math.min(1, pump.pump_input_power.bep100 / pump.motor_power_rated);
    result.pump_power_input_motor_power_ratio_bep110 = Math.min(1, pump.pump_input_power.bep110 / pump.motor_power_rated);

    result.part_load_loss_factor_bep75 = part_load_loss(result.pump_power_input_motor_power_ratio_bep75)
    result.part_load_loss_factor_bep100 = part_load_loss(result.pump_power_input_motor_power_ratio_bep100)
    result.part_load_loss_factor_bep110 = part_load_loss(result.pump_power_input_motor_power_ratio_bep110)

    var loss = result.nameplate_full_load_motor_losses === undefined ? result.full_load_motor_losses : result.nameplate_full_load_motor_losses;
    result.part_load_loss_bep75 = result.part_load_loss_factor_bep75 * loss;
    result.part_load_loss_bep100 = result.part_load_loss_factor_bep100 * loss;
    result.part_load_loss_bep110 = result.part_load_loss_factor_bep110 * loss;

    pump.driver_input_power = {
        bep75: pump.pump_input_power.bep75 + result.part_load_loss_bep75,
        bep100: pump.pump_input_power.bep100 + result.part_load_loss_bep100,
        bep110: pump.pump_input_power.bep110 + result.part_load_loss_bep110
    };
    result.driver_input_power_bep75 = pump.driver_input_power.bep75;
    result.driver_input_power_bep100 = pump.driver_input_power.bep100;
    result.driver_input_power_bep110 = pump.driver_input_power.bep110;
}

var calc_motor_powers = function (pump, result) {
    var den = pump.doe == "ST" ? 1.15 : 1.0;
    result.motor_power = pump.pump_input_power.bep120 / den;

    pump.motor_power_rated = default_motors_powers[default_motors_powers.length - 1];
    for (let i = 0; i < default_motors_powers.length; i++) {
        if (default_motors_powers[i] > result.motor_power) {
            pump.motor_power_rated = default_motors_powers[i];
            break;
        }
    }
    result.motor_power_rated = pump.motor_power_rated;
}

var calc_per_cl = function (pump) {
    console.log("----- PER CL Check ------");
    if (pump.control_power_input && pump.control_power_input.bep25) {
        console.log("Case 1:  ", pump.control_power_input);
        console.log(pump.control_power_input.bep25);
        console.log(pump.control_power_input.bep50);
        console.log(pump.control_power_input.bep75);
        console.log(pump.control_power_input.bep100);
        return (pump.control_power_input.bep25 +
            pump.control_power_input.bep50 +
            pump.control_power_input.bep75 +
            pump.control_power_input.bep100) / 4;
    } else {
        console.log("Case 1:  ", pump.control_power_input);
        console.log(pump.driver_input_power.bep75);
        console.log(pump.driver_input_power.bep100);
        console.log(pump.driver_input_power.bep110);

        // Department of Energy standard specifies 0.3333 instead of full precision 1/3.
        // The calculator must comply, even though this seems sub-optimal.
        return (pump.driver_input_power.bep75 +
            pump.driver_input_power.bep100 +
            pump.driver_input_power.bep110) * 0.3333;
    }

}
exports.calc_per_cl = calc_per_cl;

var section3_auto = function (pump) {
    var result = {
        section: "3",
        success: true
    };

    calc_motor_powers(pump, result);

    result.ns = calc_ns(pump);
    result.default_motor_efficiency = lookup_default_motor_efficiency(pump, pump.motor_power_rated);
    result.full_load_motor_losses = calc_full_load_motor_losses(pump, result);
    // In auto mode, user enters pump input power, we must back-calculate the driver input power values
    calc_driver_input_powers(pump, result);

    result.per_cl = calc_per_cl(pump);
    section345_standard_common(pump, result);
    section345_baseline_common(pump, result)

    result.pei = pump.pei = result.per_cl / result.per_std_calculated;
    calc_energy_rating(pump, result);

    return result;
}

var section4_auto = function (pump) {
    var result = {
        section: "4",
        success: true
    };

    result.ns = calc_ns(pump);
    result.default_motor_efficiency = lookup_default_motor_efficiency(pump, pump.motor_power_rated);
    result.full_load_motor_losses = calc_full_load_motor_losses(pump, result);

    result.per_cl = calc_per_cl(pump);
    section345_standard_common(pump, result);
    section345_baseline_common(pump, result);

    result.pei = pump.pei = result.per_cl / result.per_std_calculated;

    calc_energy_rating(pump, result);
    return result;
}

var section5_auto = function (pump) {
    var result = {
        section: "5",
        success: true
    };

    result.ns = calc_ns(pump);
    result.default_motor_efficiency = lookup_default_motor_efficiency(pump, pump.motor_power_rated);
    result.full_load_motor_losses = calc_full_load_motor_losses(pump, result);

    if (parseFloat(pump.motor_efficiency)) {
        result.nameplate_full_load_motor_losses = pump.motor_power_rated / (pump.motor_efficiency / 100) - pump.motor_power_rated;
    }

    calc_driver_input_powers(pump, result);

    result.standard_c_value = lookup_standard_c_value(pump);
    result.per_cl = calc_per_cl(pump);
    section345_standard_common(pump, result);
    section345_baseline_common(pump, result);

    result.pei = pump.pei = result.per_cl / result.per_std_calculated;

    calc_energy_rating(pump, result);

    return result;
}

var section6a_auto = function (pump) {
    var result = {
        section: "6a",
        success: true
    };

    result.ns = calc_ns(pump);
    result.default_motor_efficiency = lookup_default_motor_efficiency(pump, pump.motor_power_rated);
    result.full_load_motor_losses = calc_full_load_motor_losses(pump, result);

    result.standard_c_value = lookup_standard_c_value(pump);

    section345_standard_common(pump, result);
    section345_baseline_common(pump, result);

    var targets = calc_target_inputs(pump);

    result.control_power_input_bep25 = (targets.head_25 / pump.measured_control_head_input.bep25) * (targets.flow_25 / pump.measured_control_flow_input.bep25) * pump.measured_control_power_input.bep25;
    result.control_power_input_bep50 = (targets.head_50 / pump.measured_control_head_input.bep50) * (targets.flow_50 / pump.measured_control_flow_input.bep50) * pump.measured_control_power_input.bep50;
    result.control_power_input_bep75 = (targets.head_75 / pump.measured_control_head_input.bep75) * (targets.flow_75 / pump.measured_control_flow_input.bep75) * pump.measured_control_power_input.bep75;
    result.control_power_input_bep100 = pump.measured_control_power_input.bep100;

    result.per_vl = (result.control_power_input_bep25 +
        result.control_power_input_bep50 +
        result.control_power_input_bep75 +
        result.control_power_input_bep100) / 4.0

    result.pei = pump.pei = result.per_vl / result.per_std_calculated;
    calc_energy_rating(pump, result);
    return result;
}

var section6b_auto = function (pump) {
    var result = {
        section: "6b",
        success: true
    };

    result.ns = calc_ns(pump);
    result.default_motor_efficiency = lookup_default_motor_efficiency(pump, pump.motor_power_rated);
    result.full_load_motor_losses = calc_full_load_motor_losses(pump, result);

    result.standard_c_value = lookup_standard_c_value(pump);

    section345_standard_common(pump, result);
    section345_baseline_common(pump, result);

    var targets = calc_target_inputs(pump);
    //,IF(W6>0,(1*(S6/R6)*X6),(V6/U6)*(S6/R6)*X6)))
    if (pump.measured_control_head_input.bep25 - targets.head_25 > 0) {
        result.control_power_input_bep25 = (targets.flow_25 / pump.measured_control_flow_input.bep25) * pump.measured_control_power_input.bep25;
    } else {
        result.control_power_input_bep25 = (targets.head_25 / pump.measured_control_head_input.bep25) * (targets.flow_25 / pump.measured_control_flow_input.bep25) * pump.measured_control_power_input.bep25;
    }

    if (pump.measured_control_head_input.bep50 - targets.head_50 > 0) {
        result.control_power_input_bep50 = (targets.flow_50 / pump.measured_control_flow_input.bep50) * pump.measured_control_power_input.bep50;
    } else {
        result.control_power_input_bep50 = (targets.head_50 / pump.measured_control_head_input.bep50) * (targets.flow_50 / pump.measured_control_flow_input.bep50) * pump.measured_control_power_input.bep50;
    }
    //,IF(AK6>0,(1*(AG6/AF6)*AL6),   (AJ6/AI6)*(AG6/AF6)*AL6)))
    if (pump.measured_control_head_input.bep75 - targets.head_75 > 0) {
        result.control_power_input_bep75 = (targets.flow_75 / pump.measured_control_flow_input.bep75) * pump.measured_control_power_input.bep75;
    } else {
        result.control_power_input_bep75 = (targets.head_75 / pump.measured_control_head_input.bep75) * (targets.flow_75 / pump.measured_control_flow_input.bep75) * pump.measured_control_power_input.bep75;
    }
    result.control_power_input_bep100 = pump.measured_control_power_input.bep100;

    result.per_vl = (result.control_power_input_bep25 +
        result.control_power_input_bep50 +
        result.control_power_input_bep75 +
        result.control_power_input_bep100) / 4.0

    result.pei = pump.pei = result.per_vl / result.per_std_calculated;
    calc_energy_rating(pump, result);
    return result;
}


var powerInput100 = function (pump) {
    var retval = pump.pump_input_power.bep100;
    if (pump.load120 === false || pump.load120 == 'false' || !pump.load120) {
        // The 100% point is actually in the 110 slot
        retval = pump.pump_input_power.bep110;
        console.log(`@ ${retval}`)
    }
    return retval;
}

var pump_power_input_motor_power_ratio = function (pump, result) {
    var retval = result.pump_power_input_motor_power_ratio_bep100;
    if (pump.load120 === false || pump.load120 == 'false' || !pump.load120) {
        // The 100% point is actually in the 110 slot
        retval = result.pump_power_input_motor_power_ratio_bep110;
        console.log(retval);
    }
    console.log(retval);
    return retval;

}

var section7_auto = function (pump) {
    var result = {
        section: "7",
        success: true
    };

    result.ns = calc_ns(pump);
    result.default_motor_efficiency = lookup_default_motor_efficiency(pump, pump.motor_power_rated);
    result.full_load_motor_losses = calc_full_load_motor_losses(pump, result);

    if (parseFloat(pump.motor_efficiency)) {
        result.nameplate_full_load_motor_losses = pump.motor_power_rated / (pump.motor_efficiency / 100) - pump.motor_power_rated;
    }

    calc_driver_input_powers(pump, result);

    /////////////////////////////////////////////////////////
    // variable load pump input power calculations
    /////////////////////////////////////////////////////////
    let flow = flow100(pump);
    let power = powerInput100(pump);
    let ppi = function (_flow, _power, p) {
        return (0.8 * (Math.pow(p * _flow, 3)) / (Math.pow(_flow, 3)) + 0.2 * ((p * _flow) / _flow)) * _power
    }

    result.vl_pump_power_input_bep25 = ppi(flow, power, 0.25);
    result.vl_pump_power_input_bep50 = ppi(flow, power, 0.50);
    result.vl_pump_power_input_bep75 = ppi(flow, power, 0.75);
    result.vl_pump_power_input_bep100 = power;
    /////////////////////////////////////////////////////////

    /////////////////////////////////////////////////////////
    // pump power input to motor power ratio
    /////////////////////////////////////////////////////////
    result.vl_pump_power_input_motor_power_ratio_bep25 = Math.min(1, result.vl_pump_power_input_bep25 / pump.motor_power_rated);
    result.vl_pump_power_input_motor_power_ratio_bep50 = Math.min(1, result.vl_pump_power_input_bep50 / pump.motor_power_rated);
    result.vl_pump_power_input_motor_power_ratio_bep75 = Math.min(1, result.vl_pump_power_input_bep75 / pump.motor_power_rated);
    /////////////////////////////////////////////////////////

    /////////////////////////////////////////////////////////
    // Motor & Control Loss Coefficients
    /////////////////////////////////////////////////////////
    var loss_coeffs = lookup_motor_control_losses(pump);
    result.mc_loss_coef_a = loss_coeffs.a;
    result.mc_loss_coef_b = loss_coeffs.b;
    result.mc_loss_coef_c = loss_coeffs.c;
    /////////////////////////////////////////////////////////


    result.mc_part_load_loss_factor_bep25 = poly3(loss_coeffs, result.vl_pump_power_input_motor_power_ratio_bep25);
    result.mc_part_load_loss_factor_bep50 = poly3(loss_coeffs, result.vl_pump_power_input_motor_power_ratio_bep50);
    result.mc_part_load_loss_factor_bep75 = poly3(loss_coeffs, result.vl_pump_power_input_motor_power_ratio_bep75);
    result.mc_part_load_loss_factor_bep100 = poly3(loss_coeffs, pump_power_input_motor_power_ratio(pump, result));

    var loss = result.full_load_motor_losses;
    if (parseFloat(pump.motor_efficiency)) {
        loss = result.nameplate_full_load_motor_losses;
    }

    result.mc_part_load_loss_bep25 = result.mc_part_load_loss_factor_bep25 * loss;
    result.mc_part_load_loss_bep50 = result.mc_part_load_loss_factor_bep50 * loss;
    result.mc_part_load_loss_bep75 = result.mc_part_load_loss_factor_bep75 * loss;
    result.mc_part_load_loss_bep100 = result.mc_part_load_loss_factor_bep100 * loss;

    result.control_power_input_bep25 = result.mc_part_load_loss_bep25 + result.vl_pump_power_input_bep25;
    result.control_power_input_bep50 = result.mc_part_load_loss_bep50 + result.vl_pump_power_input_bep50;
    result.control_power_input_bep75 = result.mc_part_load_loss_bep75 + result.vl_pump_power_input_bep75;
    result.control_power_input_bep100 = result.mc_part_load_loss_bep100 + result.vl_pump_power_input_bep100;

    result.standard_c_value = lookup_standard_c_value(pump);
    section345_standard_common(pump, result);
    section345_baseline_common(pump, result);


    result.per_vl = (result.control_power_input_bep25 +
        result.control_power_input_bep50 +
        result.control_power_input_bep75 +
        result.control_power_input_bep100) / 4.0

    result.pei = pump.pei = result.per_vl / result.per_std_calculated;





    calc_energy_rating(pump, result);

    //console.log(JSON.stringify(result, null, 2));

    return result;
}


var manual_calculation = function (pump, set_point_threshold) {
    var spt = set_point_threshold || 0.01;

    var result = {
        section: pump.section,
        success: true
    };

    result.ns = calc_ns(pump);
    result.default_motor_efficiency = lookup_default_motor_efficiency(pump, pump.motor_power_rated);
    if (!result.default_motor_efficiency) {
        result.success = false;
        result.reasons = [];
        result.reasons.push("Error, the provided rated motor power of " + pump.motor_power_rated + " is not one of the allowable powers in the ER program.  Please check your data, and the units of measure you are using to add this pump")
        result.pump = pump;
        return result;
    }
    result.full_load_motor_losses = calc_full_load_motor_losses(pump, result);

    result.per_cl = calc_per_cl(pump);
    result.per_std = result.per_cl / pump.pei;
    result.pei = pump.pei; // was given by the user

    section345_standard_common(pump, result);
    section345_baseline_common(pump, result);

    var per_diff = result.per_std / result.per_std_calculated;
    console.log("--------- PEI CHECK ----------");
    console.log(result.per_cl);
    console.log(result.per_std_calculated);
    var target_pei = result.per_cl / result.per_std_calculated;
    result.pei_check = {
        std_percent_difference: per_diff,
        expected_pei: target_pei
    }
    result.warnings = [];

    if (process.env.PEI_CHECKS_ENABLED) {
        var pei_diff = target_pei - result.pei;
        if (pei_diff <= -0.02) {
            // may be too conservative
            result.warnings.push("The calculated representative curve PEI (" + target_pei.toFixed(4) + ") is more than 0.02 less than the listed PEI.  If you are listing the pump with a conservative PEI relative to the representative curve, proceed with your listing.  If this is not your intention, verify your listing data prior to proceeding.");
        } else if (pei_diff >= 0.02 && pei_diff <= 0.03) {
            // may be too high
            result.warnings.push("The calculated representative curve PEI (" + target_pei.toFixed(4) + ") is more than 0.02 greater than the listed PEI, please verify your representative curve data is correct before proceeding.");
        } else if (pei_diff > 0.03) {
            result.success = false;
            result.reasons = [];
            result.reasons.push("The calculated representative curve PEI (" + target_pei.toFixed(4) + ") is more than 0.03 greater than the listed PEI.  The pump cannot be listed under this condition.  Please review your representative curve data and listed PEI.  Contact the HI Program Manager if you have questions.")
            result.pump = pump;
            return result;
        }
    }
    calc_energy_rating(pump, result);

    return result;
}

exports.calculate_with_er_check = function (pump, range) {
    var retval = exports.calculator(pump);
    if (retval.result.success) {
        retval.result.success = false;
        retval.result.reasons = [];
        retval.result.reasons.push("The energy rating range for this load/speed/category of pump is between " + range.min + " and " + range.max + ".  Your calculated energy rating of " + pump.energy_rating + " cannot be listed.  Please contact the HI Program Administrator if you believe this pump should be listed");
    }
    return result;
}

exports.calculate = function (pump, labels) {
    var retval = undefined;
    if (!pump) {
        return build_error("Pump object must be specified");
    }
    if (!pump.doe) {
        return build_error("Pump DOE designation must be present");
    }
    pump.doe = pump.doe.trim()
    if (pump.auto) {
        retval = auto_calculators[pump.section](pump);
    } else {
        if (!manual_calculators[pump.section]) {
            console.log("Failed to locate calculator for section " + pump.section);
            console.log(manual_calculators);
            return build_error(`No calculation procedure for given C&I Pump Section [${pump.section}], make sure you are uploading the correct type of pump.`);
        }
        retval = manual_calculators[pump.section](pump);
    }

    if (!labels) return retval;

    var configuration = pump.configuration.value || pump.configuration;
    var load = configuration == "bare" || configuration.value == "pump_motor" ? "CL" : "VL";
    var range = labels.filter(function (label) {
        return label.doe == pump.doe && label.speed == pump.speed && label.load == load;
    })[0];

    if (retval && retval.success) {
        var message = "The energy rating range for this load/speed/category of pump is between " + range.min + " and " + range.max + ". ";
        var underMinMessage = message + "Your calculated energy rating of " + retval.energy_rating + " is below the current min scale value and cannot be listed.  Please contact the HI Program Administrator if you believe this pump should be listed";
        var overMaxMessage = message + "Your calculated energy rating of " + retval.energy_rating + " exceeds the current max scale value. Once added, this pump listing will automatically be disabled. Please contact the HI Program Administrator to enable this pump listing.";
        if (retval.energy_rating < range.min) {
            retval.success = false;
            retval.reasons = [];
            retval.reasons.push(underMinMessage);
        }
        else if (retval.energy_rating > range.max) {
            retval.success = true; // set to true and then disable the pump to allow admin to enable if ok.
            retval.warnings = [overMaxMessage]; 
            retval.active_admin = false;
            retval.note_admin = overMaxMessage;
        }
    }
    return retval;
}

var common_checks = function (pump, manual) {
    var missing = [];
    if (!pump.brand) missing.push("Pump brand name must be specified");
    if (!pump.basic_model) missing.push("Pump basic model number must be specified");
    if (!pump.individual_model) missing.push("Pump individual model number must be specified");
    if (!pump.doe) missing.push("Pump DOE designation must be specified");
    if (!pump.speed) missing.push("Pump speed must be specified");
    if (!pump.flow) missing.push("Pump BEP flow must be specified at 75%, 100%, and 110% BEP");
    if (pump.flow) {
        if (!pump.flow.bep75) missing.push("Pump flow @ 75% BEP must be specified");
        if (!pump.flow.bep100) missing.push("Pump flow @ 100% BEP must be specified");
        if (!pump.flow.bep110) missing.push("Pump flow @ 110% BEP must be specified");
    }
    if (!pump.head) missing.push("Pump BEP head must be specified at 75%, 100%, and 110% BEP");
    if (pump.head) {
        if (!pump.head.bep75) missing.push("Pump head @ 75% BEP must be specified");
        if (!pump.head.bep100) missing.push("Pump head @ 100% BEP must be specified");
        if (!pump.head.bep110) missing.push("Pump head @ 110% BEP must be specified");
    }
    if (!pump.stages || pump.stages < 1) {
        if (pump.doe == "ST" || pump.doe == "RSV") {
            missing.push("Pump stages must be specified");
        } else {
            pump.stages = 1
        }
    }
    if (pump.doe && pump.doe != "ST" && pump.doe != "RSV") {
        if (pump.stages != 1) {
            missing.push("Only ST and RSV pumps supports more than one stage");
        }
    }
    if (!pump.diameter) missing.push("Pump impeller diameter must be specified");
    if (!pump.bowl_diameter && pump.doe == "ST") missing.push("Pump bowl diameter must be specified");
    // --------------------

    // Manual only, but otherwise common
    // --------------------
    if (manual && !("pei" in pump)) missing.push("Pump PEI must be specified, use automatic calculator if PEI is unknown");
    // --------------------

    return missing
}


var check_control_power_input = function (pump, missing) {
    if (!pump.control_power_input) missing.push("Control input power @ 25%, 50%, 75%, and 100% BEP must be specified.");
    if (pump.control_power_input) {
        if (!pump.control_power_input.bep25) missing.push("Control input power @ 25% BEP must be specified");
        if (!pump.control_power_input.bep50) missing.push("Control input power @ 50% BEP must be specified");
        if (!pump.control_power_input.bep75) missing.push("Control input power @ 75% BEP must be specified");
        if (!pump.control_power_input.bep100) missing.push("Control input power @ 100% BEP must be specified");
    }
}
var check_driver_input_power = function (pump, missing) {
    if (!pump.driver_input_power) missing.push("Driver input power @ 75%, 100%, and 110% BEP must be specified.");
    if (pump.driver_input_power) {
        if (!pump.driver_input_power.bep75) missing.push("Driver input power @ 75% BEP must be specified");
        if (!pump.driver_input_power.bep100) missing.push("Driver input power @ 100% BEP must be specified");
        if (!pump.driver_input_power.bep110) missing.push("Driver input power @ 110% BEP must be specified");
    }
}

var check_pump_input_power = function (pump, missing, test_120) {
    if (!pump.pump_input_power) missing.push("Pump input power @ 75%, 100%, 110%, and 120% BEP must be specified.");
    if (pump.pump_input_power) {
        if (!pump.pump_input_power.bep75) missing.push("Pump input power @ 75% BEP must be specified");
        if (!pump.pump_input_power.bep100) missing.push("Pump input power @ 100% BEP must be specified");
        if (!pump.pump_input_power.bep110) missing.push("Pump input power @ 110% BEP must be specified");
        if (test_120 && !pump.pump_input_power.bep120) missing.push("Pump input power @ 120% BEP must be specified");
    }
}



var calc_target_inputs = function (pump) {
    var flow = flow100(pump);
    var head = head100(pump);
    return {
        flow_25: flow * 0.25,
        flow_50: flow * 0.50,
        flow_75: flow * 0.75,
        head_25: (0.8 * Math.pow(flow * 0.25, 2) / Math.pow(flow, 2) + 0.2) * head,
        head_50: (0.8 * Math.pow(flow * 0.50, 2) / Math.pow(flow, 2) + 0.2) * head,
        head_75: (0.8 * Math.pow(flow * 0.75, 2) / Math.pow(flow, 2) + 0.2) * head
    }
}
var check_measured_inputs = function (pump, missing) {
    if (!pump.measured_control_power_input) missing.push("Measured control power input @ 25%, 50%, 75%, and 100% BEP must be specified.");
    if (pump.measured_control_power_input) {
        if (!pump.measured_control_power_input.bep25) missing.push("Measured control power input @ 25% BEP must be specified");
        if (!pump.measured_control_power_input.bep50) missing.push("Measured control power input @ 50% BEP must be specified");
        if (!pump.measured_control_power_input.bep75) missing.push("Measured control power input @ 75%BEP must be specified");
        if (!pump.measured_control_power_input.bep100) missing.push("Measured control power input @ 100%BEP must be specified");
    }

    if (!pump.measured_control_flow_input) missing.push("Measured control flow input @ 25%, 50%, 75%, and 100% BEP must be specified.");
    if (pump.measured_control_flow_input) {
        if (!pump.measured_control_flow_input.bep25) missing.push("Measured control flow input @ 25% BEP must be specified");
        if (!pump.measured_control_flow_input.bep50) missing.push("Measured control flow input @ 50% BEP must be specified");
        if (!pump.measured_control_flow_input.bep75) missing.push("Measured control flow input @ 75%BEP must be specified");
        if (!pump.measured_control_flow_input.bep100) missing.push("Measured control flow input @ 100%BEP must be specified");
    }

    if (!pump.measured_control_head_input) missing.push("Measured control head input @ 25%, 50%, 75%, and 100% BEP must be specified.");
    if (pump.measured_control_head_input) {
        if (!pump.measured_control_head_input.bep25) missing.push("Measured control head input @ 25% BEP must be specified");
        if (!pump.measured_control_head_input.bep50) missing.push("Measured control head input @ 50% BEP must be specified");
        if (!pump.measured_control_head_input.bep75) missing.push("Measured control head input @ 75%BEP must be specified");
        if (!pump.measured_control_head_input.bep100) missing.push("Measured control head input @ 100%BEP must be specified");
    }

    if (missing.length > 0) return;

    var checks = [];
    var targets = calc_target_inputs(pump);
    checks.push({
        target: targets.flow_25,
        value: pump.measured_control_flow_input.bep25,
        message: pump.section == "6a" || pump.section == "6" ?
            "Measured flow @25% must be within 10% of calculated target" : "Measured flow @25% must be within 10% of calculated target"
    });
    checks.push({
        target: targets.flow_50,
        value: pump.measured_control_flow_input.bep50,
        message: pump.section == "6a" || pump.section == "6" ?
            "Measured flow @50% must be within 10% of calculated target" : "Measured flow @50% must be within 10% of calculated target"
    });
    checks.push({
        target: targets.flow_75,
        value: pump.measured_control_flow_input.bep75,
        message: pump.section == "6a" || pump.section == "6" ?
            "Measured flow @75% must be within 10% of calculated target" : "Measured flow @75% must be within 10% of calculated target"
    });

    //////////////////////////////////////////
    checks.push({
        target: targets.head_25,
        value: pump.measured_control_head_input.bep25,
        message: pump.section == "6a" || pump.section == "6" ?
            "Measured head @25% must be within 10% of calculated target" : "Measured head @25% cannot be more than 10% below calculated target"
    });
    checks.push({
        target: targets.head_50,
        value: pump.measured_control_head_input.bep50,
        message: pump.section == "6a" || pump.section == "6" ?
            "Measured head @50% must be within 10% of calculated target" : "Measured head @50% cannot be more than 10% below calculated target"
    });
    checks.push({
        target: targets.head_75,
        value: pump.measured_control_head_input.bep75,
        message: pump.section == "6a" || pump.section == "6" ?
            "Measured head @75% must be within 10% of calculated target" : "Measured head @75% cannot be more than 10% below calculated target"
    });


    if (pump.section == "6a") {
        checks.forEach(function (check) {
            if (Math.abs(check.value - check.target) / check.target > 0.1) {
                missing.push(check.message);
                return checks;
            }
        });
    } else if (pump.section == "6b") {
        checks.forEach(function (check) {
            if ((check.value - check.target) / check.target < -0.1) {
                missing.push(check.message);
                return checks;
            }
        });
    }


}

var check_regulated_motor = function (pump, missing) {
    if (pump.doe == "ST") {
        pump.motor_regulated = undefined;
        return;
    }
    if (pump.motor_regulated === undefined) {
        missing.push("Pump specification must include true/false if motor is regulated.")
    }
    if (pump.motor_regulated) {
        if (!parseFloat(pump.motor_efficiency)) {
            missing.push("Pumps with regulated motors must contain Nominal Motor Efficiency in their specifications")
        }
    }
}

var section_6_manual_entry = function (pump) {
    var missing = common_checks(pump, true);

    if (!pump.motor_power_rated) missing.push("Pump rated motor power / nameplate rated motor power must be specified")
    check_control_power_input(pump, missing);
    check_regulated_motor(pump, missing);

    if (missing.length > 0) {
        return build_error(missing, pump);
    }

    return manual_calculation(pump, 0.02);
}

var manual_calculators = {
    "3": function (pump) {
        var missing = common_checks(pump, true);

        if (!pump.motor_power_rated) missing.push("Pump rated motor power / nameplate rated motor power must be specified")
        check_driver_input_power(pump, missing);

        if (missing.length > 0) {
            return build_error(missing, pump);
        }

        return manual_calculation(pump);
    },
    "4": function (pump) {
        var missing = common_checks(pump, true);

        if (!pump.motor_power_rated) missing.push("Pump rated motor power / nameplate rated motor power must be specified")
        check_driver_input_power(pump, missing);
        check_regulated_motor(pump, missing);

        if (missing.length > 0) {
            return build_error(missing, pump);
        }

        return manual_calculation(pump);
    },
    "5": function (pump) {
        var missing = common_checks(pump, true);

        if (!pump.motor_power_rated) missing.push("Pump rated motor power / nameplate rated motor power must be specified")
        check_driver_input_power(pump, missing);
        check_regulated_motor(pump, missing);

        if (missing.length > 0) {
            return build_error(missing, pump);
        }

        return manual_calculation(pump);
    },
    "6": section_6_manual_entry,
    "6a": section_6_manual_entry,
    "6b": section_6_manual_entry,
    "7": function (pump) {
        var missing = common_checks(pump, true);

        if (!pump.motor_power_rated) missing.push("Pump rated motor power / nameplate rated motor power must be specified")
        check_control_power_input(pump, missing);
        check_regulated_motor(pump, missing);

        if (missing.length > 0) {
            return build_error(missing, pump);
        }

        return manual_calculation(pump, 0.02);
    }
}




var auto_calculators = {
    "3": function (pump) {
        var missing = common_checks(pump);

        check_pump_input_power(pump, missing, true);

        if (missing.length > 0) {
            return build_error(missing, pump);
        }

        return section3_auto(pump);
    },
    "4": function (pump) {
        var missing = common_checks(pump);

        check_driver_input_power(pump, missing)
        if (missing.length > 0) {
            return build_error(missing, pump);
        }

        return section4_auto(pump);
    },
    "5": function (pump) {
        var missing = common_checks(pump);

        check_pump_input_power(pump, missing, false);

        if (missing.length > 0) {
            return build_error(missing, pump);
        }

        return section5_auto(pump);
    },
    "6a": function (pump) {
        var missing = common_checks(pump);

        check_measured_inputs(pump, missing, false);

        if (missing.length > 0) {
            return build_error(missing, pump);
        }

        return section6a_auto(pump);
    },
    "6b": function (pump) {
        var missing = common_checks(pump);

        check_measured_inputs(pump, missing, false);

        if (missing.length > 0) {
            return build_error(missing, pump);
        }

        return section6b_auto(pump);
    },
    "7": function (pump) {
        var missing = common_checks(pump);

        check_pump_input_power(pump, missing, false);

        if (missing.length > 0) {
            return build_error(missing, pump);
        }

        return section7_auto(pump);
    },
}

var calculate_pump_hp_group_and_tier = function(pump) {
    let hp_group = "Unknown";
    let tier = "Unknown";
    try {
        let pei = parseFloat(pump.pei.toString());
        let motor_power_rated = parseInt(pump.motor_power_rated.toString());
        let energy_rating = parseFloat(pump.energy_rating.toString());
        //console.log(`Pump: ${pump.rating_id}, PEI: ${pei}, Motor Power Rated: ${motor_power_rated}, Energy Rating: ${energy_rating}`);
        // if (pump.rating_id == "4JNP6Q") {
        //     console.log("Here");
        // }
        hp_group = motor_power_rated < 10 ? "1" : "2";
        if (pei <= 0.48 && energy_rating >= 52) tier = "3";
        else if (pei <= 0.69 && energy_rating >= 31) tier = "2";
        else if ((pei <= 0.88 && energy_rating >= 12 && hp_group == "2") ||
            (pei <= 0.91 && energy_rating >= 9 && hp_group == "1")) {
            tier = "1";
        }
        else tier = "None";
    } catch (e) {
        console.error("Error calculating pump HP group and tier. Pump ["+pump.rating_id+"]", e);
    }
    return {'hp_group': hp_group, 'cee_tier': tier};
}

exports.calculate_pump_hp_group_and_tier = calculate_pump_hp_group_and_tier;

var calculate_circ_watts_calc_group_and_tier = function(pump) {
    let watts_calc = "Unknown";
    let watts_group = "Unknown";
    let tier = "Unknown";
    try {
        if (!pump.most_input_power_100) {
            if (pump.control_methods) {
                pump.most_input_power_100 = pump.most.input_power[3].toFixed(3);
            }
            else {
                console.log("Pump ["+pump.rating.id+"] does not have most_input_power_100 or control_method");
                return {'watts_group': watts_group, 'cee_tier': tier, 'watts_calc': watts_calc};
            }
        }
        watts_calc = parseFloat(pump.most_input_power_100.toString()) * 745.7;
        watts_group = watts_calc < 350 ? "1" : watts_calc < 500 ? "2" : "3";
        // Most efficient CEI is least_pei

        let least_pei = pump.least_pei ? parseFloat(pump.least_pei.toString()) : parseFloat(pump.least.pei.toString());
        if ( watts_group == "1") {
            tier = least_pei < 0.701 ? "2" : least_pei < 1.01 ? "1" : "None";
        }
        else if ( watts_group == "2") {
            tier = least_pei < 0.701 ? "2" : least_pei < 1.101 ? "1" : "None";
        }
        else if ( watts_group == "3") {
            tier = least_pei < 0.751 ? "2" : least_pei < 1.101 ? "1" : "None";
        }
        else tier="None";
        //No trailing zeros for watts_calc
        watts_calc = watts_calc.toFixed(4);
        watts_calc = parseFloat(watts_calc).toString();
    } catch (e) {
        console.error("Error calculating Circ Watts group and tier: ", e);
    }
    return {'watts_group': watts_group, 'cee_tier': tier, 'watts_calc': watts_calc};
}

exports.calculate_circ_watts_calc_group_and_tier = calculate_circ_watts_calc_group_and_tier;

var filter_pumps_by_cee_tiers = function(pumps, tiers_obj, type) {
    //console.log('CEE Tiers Match: ' + tiers_list);
    //Create a list of strings from the tiers_obj to match against the pumps tiers
    let do_filter = false;
    let tiers_list = ["1","2","3","None"];
    if ("tier1" in tiers_obj || "tier2" in tiers_obj || "tier3" in tiers_obj || "tiernone" in tiers_obj) {
        do_filter=true;
        tiers_list = [tiers_obj.tier1?"1":"",
            tiers_obj.tier2?"2":"", 
            tiers_obj.tier3?"3":"",
            tiers_obj.tiernone?"None":"",];
    }
    //Remove empty strings from the tiers_list
    tiers_list = tiers_list.filter(str => str !== "");
    if (!tiers_list.length) {
        tiers_list.push("None");
    }
    let new_pumps = [];
    try {
        for (const idx in pumps) {
            let pump = pumps[idx];
            if (type == 'pumps') {
                pump.cee_tier = exports.calculate_pump_hp_group_and_tier(pump).cee_tier;
            }
            else if (type == 'circulators') {
                pump = pump._doc;
                pump.cee_tier = exports.calculate_circ_watts_calc_group_and_tier(pump).cee_tier;
            }
            if (pump.cee_tier && tiers_list.includes(pump.cee_tier)) {
                //console.log('pump ['+pump.rating_id+'] Pump Tier: ' + pump.cee_tier);
                pump.cee_tier = pump.cee_tier == "None" ? "" : pump.cee_tier; 
                new_pumps.push(pumps[idx]);
            }
        }
    } catch (e) {
        console.error("Error filtering pumps by CEE tiers: ", e);
        new_pumps = pumps;
    }
    return new_pumps;
}

exports.filter_pumps_by_cee_tiers = filter_pumps_by_cee_tiers;