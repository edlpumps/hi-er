

var standard_c_values = {
    "ESCC-1800" : 128.47,
    "ESCC-3600" : 130.48,
    "ESFM-1800" : 128.85,
    "ESFM-3600" : 130.99,
    "IL-1800" : 129.3,
    "IL-3600" : 133.84,
    "RSV-1800" : 129.63,
    "RSV-3600" : 133.2,
    "ST-1800" : 138.78,
    "ST-3600" : 134.85
}

var baseline_c_values = {
    "ESCC-1800" :  134.43,
    "ESCC-3600": 135.94,
    "ESFM-1800" : 134.99,
    "ESFM-3600" : 136.59,
    "IL-1800" : 135.92,
    "IL-3600" : 141.01,
    "RSV-1800" : 129.63,
    "RSV-3600" : 133.2,
    "ST-1800" : 138.78,
    "ST-3600" : 138.78
}






var lookup_standard_c_value = function(pump) {
    var label = pump.doe.toUpperCase() + "-" + pump.speed;
    return standard_c_values[label];
}
var lookup_baseline_c_value = function(pump) {
    var label = pump.doe.toUpperCase() + "-" + pump.speed;
    return baseline_c_values[label];
}
var lookup_default_motor_efficiency = function(pump) {
    var label = pump.doe.toUpperCase() + "-" + pump.motor_power_rated + "-" + pump.speed;
    var table = require("./default_motor_efficiencies.json");
    return table[label];
}


var build_error = function(error, pump) {
    return {
        success : false,
        reasons : error.constructor == Array ? error : [error],
        pump : pump
    }
}

var calculate_efficiency = function(pump, result, c, coefficients) {
    var LN = Math.log;
    var terms = [
        coefficients[0] * Math.pow(LN(pump.flow.bep100), 2),
        coefficients[1] * LN(result.ns) * LN(pump.flow.bep100),
        coefficients[2] * Math.pow(LN(result.ns), 2),
        coefficients[3] * LN(pump.flow.bep100),
        coefficients[4] * LN(result.ns),
        -(coefficients[5] + c)
    ] 
    return terms.reduce(function (a, b) { return a + b; }, 0);
}

var part_load_loss = function(ratio) {
        return -0.4508 * Math.pow(ratio, 3) + 1.2399 * Math.pow(ratio, 2) - 0.4301 * ratio + 0.641;
    }

var section3_manual = function(pump) {
    var result = {success:true};

    // Department of Energy standard specifies 0.3333 instead of full precision 1/3.
    // The calculator must comply, even though this seems sub-optimal.
    result.per_cl = ( pump.driver_input_power.bep75 
                    + pump.driver_input_power.bep100        
                    + pump.driver_input_power.bep110 ) * 0.3333;

    result.per_std = result.per_cl / pump.pei;

    result.ns = (pump.speed*Math.sqrt(pump.flow.bep100)/Math.pow(pump.head.bep100/pump.stages, 0.75));

    result.standard_c_value = lookup_standard_c_value(pump);
    result.default_motor_efficiency = lookup_default_motor_efficiency(pump);
    result.full_load_motor_losses = pump.motor_power_rated / (result.default_motor_efficiency/100) - pump.motor_power_rated;
    result.std_pump_efficiency = calculate_efficiency(pump, result, result.standard_c_value, [-0.85, -0.38, -11.48, 17.8, 179.8, 555.6]);
    
    result.hyd_power_bep75 =  pump.flow.bep75   * pump.head.bep75  /3956;
    result.hyd_power_bep100 = pump.flow.bep100  * pump.head.bep100 /3956;
    result.hyd_power_bep110 = pump.flow.bep110  * pump.head.bep110 /3956;

    result.std_pump_power_input_bep75 = result.hyd_power_bep75 / ((result.std_pump_efficiency/100) * 0.947);
    result.std_pump_power_input_bep100 = result.hyd_power_bep100 / (result.std_pump_efficiency/100);
    result.std_pump_power_input_bep110 = result.hyd_power_bep110 / ((result.std_pump_efficiency/100) * 0.985);
    
    result.std_motor_power_ratio_bep75 = Math.min(1, result.std_pump_power_input_bep75/pump.motor_power_rated)
    result.std_motor_power_ratio_bep100 = Math.min(1, result.std_pump_power_input_bep100/pump.motor_power_rated)
    result.std_motor_power_ratio_bep110 = Math.min(1, result.std_pump_power_input_bep110/pump.motor_power_rated)
    
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
    result.per_std_calculated = (   result.std_driver_power_input_bep75
                                 +  result.std_driver_power_input_bep100 
                                 +  result.std_driver_power_input_bep110 ) * 0.3333;

    result.baseline_c_value = lookup_baseline_c_value(pump);
    result.baseline_pump_efficiency = calculate_efficiency(pump, result, result.baseline_c_value, [-0.85, -0.38, -11.48, 17.8, 179.8, 555.6]);
    
    result.baseline_pump_power_input_bep75 = result.hyd_power_bep75 / ((result.baseline_pump_efficiency/100) * 0.947);
    result.baseline_pump_power_input_bep100 = result.hyd_power_bep100 / (result.baseline_pump_efficiency/100);
    result.baseline_pump_power_input_bep110 = result.hyd_power_bep110 / ((result.baseline_pump_efficiency/100) * 0.985);
    
    result.baseline_motor_power_ratio_bep75 = Math.min(1, result.baseline_pump_power_input_bep75/pump.motor_power_rated)
    result.baseline_motor_power_ratio_bep100 = Math.min(1, result.baseline_pump_power_input_bep100/pump.motor_power_rated)
    result.baseline_motor_power_ratio_bep110 = Math.min(1, result.baseline_pump_power_input_bep110/pump.motor_power_rated)
    
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
    result.per_baseline_calculated = (   result.baseline_driver_power_input_bep75
                                 +  result.baseline_driver_power_input_bep100 
                                 +  result.baseline_driver_power_input_bep110 ) * 0.3333;
    
    result.pei_baseline = result.per_baseline_calculated / result.per_std_calculated;

    var per_diff = result.per_std /result.per_std_calculated;
    if ( per_diff > 1.01 || per_diff < 0.99){
        result.success = false;
        result.reasons = [];
        result.reasons.push("Error, the difference between PER standard and PER standard calculated must be within 1%");
        result.pump = pump;
    }
    else {
        result.er = Math.round((result.pei_baseline - pump.pei) * 100);
    }
    return result;
}

exports.manual = {
    section3 : function(pump) {
        var missing = [];

        // likely common
        // --------------------
        if ( !pump ) {
            return build_error("Pump object must be specified");
        }
        if (!pump.doe) missing.push("Pump DOE designation must be specified");
        if (!pump.speed) missing.push("Pump speed must be specified");
        if (!pump.motor_power_rated) missing.push("Pump rated motor power / nameplate rated motor power must be specified")
        if (!pump.flow ) missing.push("Pump BEP flow must be specified at 75%, 100%, and 110% BEP");
        if ( pump.flow ) {
            if (!pump.flow.bep75 ) missing.push("Pump flow @ 75% BEP must be specified");
            if (!pump.flow.bep100 ) missing.push("Pump flow @ 100% BEP must be specified");
            if (!pump.flow.bep110 ) missing.push("Pump flow @ 110% BEP must be specified");
        }
        if (!pump.head ) missing.push("Pump BEP head must be specified at 75%, 100%, and 110% BEP");
        if ( pump.head ) {
            if (!pump.head.bep75 ) missing.push("Pump head @ 75% BEP must be specified");
            if (!pump.head.bep100 ) missing.push("Pump head @ 100% BEP must be specified");
            if (!pump.head.bep110 ) missing.push("Pump head @ 110% BEP must be specified");
        }
        if (!pump.stages ) missing.push("Pump stages must be specified");
        // --------------------
        
        // Manual only, but otherwise common
        // --------------------
        if (!("pei" in pump) ) missing.push("Pump PEI must be specified, use automatic calculator if PEI is unknown");
        // --------------------


        // Specific to section 3
        // --------------------
        if (!pump.driver_input_power) missing.push("Driver input power @ 75%, 100%, and 110% BEP must be specified for Section 3 calculations");
        if ( pump.driver_input_power ) {
            if (!pump.driver_input_power.bep75 ) missing.push("Driver input power @ 75% BEP must be specified");
            if (!pump.driver_input_power.bep100 ) missing.push("Driver input power @ 100% BEP must be specified");
            if (!pump.driver_input_power.bep110 ) missing.push("Driver input power @ 110% BEP must be specified");
        }

        // --------------------

        if ( missing.length > 0 ) {
            return build_error(missing, pump);
        }

        return section3_manual(pump);
    }
}