const debug = require('debug')('cert-calc');
const minimum_motors = require('./minimum_motor');
const bands = require('./bands');
const MINIMUM_EFFICIENCY_ERROR = "This configuration does not meet the minimum extended efficiency for this pump.";
const UNSUPPORTED_EFFICIENCY_POWER_ERROR = "This motor power / efficiency is not supported";
assign_coefficient = (N, C) => {
    if (N <= 5) return C[0];
    else if (N <= 20) return C[1];
    else if (N <= 50) return C[2];
    else
        return C[3]
}
const band = (efficiency) => {
    let result = -1;
    for (const b of bands) {
        if (b.key <= efficiency) {
            result = b.band
        } else {
            break;
        }
    }
    return result;
}
const band_number = (efficiency) => {
    let result = -1;
    let band_number = 0;
    for (const b of bands) {
        if (b.key <= efficiency) {
            result = band_number
        } else {
            break;
        }
        band_number++;
    }
    return result;
}
const band_by_number = (number) => {
    return bands[number];
}

const COEFF_A = [-0.4658, -1.3198, -1.5122, -0.8914];
const COEFF_B = [1.4965, 2.9551, 3.0777, 2.8846];
const COEFF_C = [0.5303, 0.1052, 0.1847, 0.2625];

exports.motor_powers = () => {
    const map = new Map();
    const powers = [];
    for (const key in minimum_motors) {
        const tokens = key.split("-");
        const power = tokens[1];
        if (powers.indexOf(power) < 0) {
            powers.push(power);
        }
    }
    return powers;
}


exports.calculate_3_to_5 = (pump, certificate) => {
    debug(`Begin 3-5 certificate calculation on pump ${pump.rating_id}`);
    certificate.error = undefined;
    certificate.error_details = undefined;
    const motor_lookup = `${certificate.motor.motor_type.toLowerCase()}${pump.doe.toUpperCase()}-${certificate.motor.power}-${pump.speed}`;
    const L = pump.driver_input_power.bep75;
    const M = pump.driver_input_power.bep100;
    const N = pump.driver_input_power.bep110;
    const O = pump.motor_power_rated;
    const P = pump.results.default_motor_efficiency;
    const T = minimum_motors[motor_lookup];
    const U = T < certificate.motor.efficiency;

    const min_band = band(T);
    const actual_band = band(certificate.motor.efficiency);
    const V = actual_band - min_band;

    const default_band_number = band_number(pump.results.default_motor_efficiency);
    const bands = band_by_number(default_band_number + V);
    if (!bands) {
        certificate.error = UNSUPPORTED_EFFICIENCY_POWER_ERROR;
        debug(certificate.error);
        return certificate;
    }
    const Z = bands.key;

    const AA = (O / (P / 100)) - O;
    const AB = Math.min(1, L / (O + AA));
    const AC = Math.min(1, M / (O + AA));
    const AD = Math.min(1, N / (O + AA));
    const AE = (-0.4508 * (AB * AB * AB)) + (1.2399 * (AB * AB)) - (0.4301 * AB) + 0.641;
    const AF = (-0.4508 * (AC * AC * AC)) + (1.2399 * (AC * AC)) - (0.4301 * AC) + 0.641;
    const AG = (-0.4508 * (AD * AD * AD)) + (1.2399 * (AD * AD)) - (0.4301 * AD) + 0.641;
    const AH = AA * AE;
    const AI = AA * AF;
    const AJ = AA * AG;
    const AK = L - AH;
    const AL = M - AI;
    const AM = N - AJ;
    const AN = (O / (Z / 100)) - O;
    const AO = Math.min(1, AK / O);
    const AP = Math.min(1, AL / O);
    const AQ = Math.min(1, AM / O);
    const AR = (-0.4508 * (AO * AO * AO)) + (1.2399 * (AO * AO)) - (0.4301 * AO) + 0.641;
    const AS = (-0.4508 * (AP * AP * AP)) + (1.2399 * (AP * AP)) - (0.4301 * AP) + 0.641;
    const AT = (-0.4508 * (AQ * AQ * AQ)) + (1.2399 * (AQ * AQ)) - (0.4301 * AQ) + 0.641;
    const AU = AR * AN;
    const AV = AS * AN;
    const AW = AT * AN;
    const AX = AK + AU;
    const AY = AL + AV;
    const AZ = AM + AW;

    const BA = 0.3333 * AX + 0.3333 * AY + 0.3333 * AZ;
    const pei = BA / pump.results.per_std;
    const BB = Math.round(pei * 100) / 100;

    const BD = Math.round((pump.results.pei_baseline - pei) * 100);

    certificate.minimum_efficiency_extended = T;
    certificate.minimum_efficiency_extended_check = U;
    certificate.default_efficiency_bands = V;
    certificate.motor_efficiency_equivalent_bands = Z;
    certificate.full_load_default_motor_losses = AA;
    certificate.std_pump_input_to_motor_at_75_bep_flow = AB;
    certificate.std_pump_input_to_motor_at_100_bep_flow = AC;
    certificate.std_pump_input_to_motor_at_110_bep_flow = AD;
    certificate.std_motor_part_load_loss_factor_at_75_bep = AE;
    certificate.std_motor_part_load_loss_factor_at_100_bep = AF;
    certificate.std_motor_part_load_loss_factor_at_110_bep = AG;

    certificate.std_motor_part_load_loss_at_75_bep = AH;
    certificate.std_motor_part_load_loss_at_100_bep = AI;
    certificate.std_motor_part_load_loss_at_110_bep = AJ;

    certificate.pump_input_power_at_75_bep = AK;
    certificate.pump_input_power_at_100_bep = AL;
    certificate.pump_input_power_at_110_bep = AM;

    certificate.full_load_motor_losses_equivelant_bands_above_normal = AN;

    certificate.pump_input_to_motor_power_ratio_at_75_bep = AO;
    certificate.pump_input_to_motor_power_ratio_at_100_bep = AP;
    certificate.pump_input_to_motor_power_ratio_at_110_bep = AQ;

    certificate.motor_part_load_loss_factor_at_75_bep = AR;
    certificate.motor_part_load_loss_factor_at_100_bep = AS;
    certificate.motor_part_load_loss_factor_at_110_bep = AT;
    certificate.nameplate_motor_part_load_losses_at_75_bep = AU;
    certificate.nameplate_motor_part_load_losses_at_100_bep = AV;
    certificate.nameplate_motor_part_load_losses_at_110_bep = AW;

    certificate.driver_power_input_to_motor_at_75_bep = AX;
    certificate.driver_power_input_to_motor_at_100_bep = AY;
    certificate.driver_power_input_to_motor_at_110_bep = AZ;

    certificate.constant_load_energy_rating = BA;
    certificate.constant_load_energy_index = BB;
    certificate.pei = certificate.constant_load_energy_index
    certificate.energy_rating = BD;
    return certificate;
}
exports.calculate_3_to_7 = (pump, certificate) => {
    debug(`Begin 3-7 certificate calculation on pump ${pump.rating_id}`)
    certificate.error = undefined;
    certificate.error_details = undefined;
    const motor_lookup = `${certificate.motor.motor_type}${pump.doe.toUpperCase()}-${certificate.motor.power}-${pump.speed}`;
    certificate.minimum_efficiency_extended = minimum_motors[motor_lookup];
    if (pump.doe.toLowerCase() === 'st') {
        certificate.minimum_efficiency_extended_check = true;
        certificate.minimum_efficiency_extended = '-';
    } else {
        certificate.minimum_efficiency_extended_check = certificate.minimum_efficiency_extended <= certificate.motor.efficiency;
    }

    if (!certificate.minimum_efficiency_extended_check) {
        certificate.error = MINIMUM_EFFICIENCY_ERROR;
        certificate.error_details = `Minimum extended efficiency based of this motor, based on ${certificate.motor.power}hp, is ${certificate.minimum_efficiency_extended}%`;
        debug(certificate.error);
        debug(certificate.error_details);
        return certificate;
    }
    const P = pump.load120 ? pump.driver_input_power.bep100 : pump.driver_input_power.bep110;
    const Q = pump.flow.bep100;
    const R = pump.motor_power_rated;
    const S = pump.results.default_motor_efficiency;
    const min_band = band(certificate.minimum_efficiency_extended);
    const actual_band = band(certificate.motor.efficiency);
    certificate.default_efficiency_bands = actual_band - min_band;
    if (pump.doe.toLowerCase() === 'st') {
        certificate.default_efficiency_bands = '-';
        certificate.motor_efficiency_equivalent_bands = pump.results.default_motor_efficiency;
    } else {
        const default_band_number = band_number(pump.results.default_motor_efficiency);
        certificate.motor_efficiency_equivalent_bands = band_by_number(default_band_number + certificate.default_efficiency_bands).key;
    }

    const X = certificate.motor_efficiency_equivalent_bands;
    const Y = (R / (S / 100)) - R;
    let Z = P / (R + Y);
    if (Z > 1) Z = 1;

    const AA = (-0.4508 * (Z * Z * Z)) + (1.2399 * (Z * Z)) - (0.4301 * Z) + 0.641;
    const AB = AA * Y;
    const AC = P - AB;
    const AD = ((0.8 * Math.pow(0.25 * Q, 3) / Math.pow(Q, 3)) + (0.2 * 0.25 * Q / Q)) * AC;
    const AE = ((0.8 * Math.pow(0.50 * Q, 3) / Math.pow(Q, 3)) + (0.2 * 0.50 * Q / Q)) * AC;
    const AF = ((0.8 * Math.pow(0.75 * Q, 3) / Math.pow(Q, 3)) + (0.2 * 0.75 * Q / Q)) * AC;
    let AG = Math.min(AD / R, 1);
    let AH = Math.min(AE / R, 1);
    let AI = Math.min(AF / R, 1);
    let AJ = Math.min(AC / R, 1);

    const AK = certificate.coeff_A = assign_coefficient(R, COEFF_A);
    const AL = certificate.coeff_B = assign_coefficient(R, COEFF_B);
    const AM = certificate.coeff_C = assign_coefficient(R, COEFF_C);

    const AN = (AK * AG * AG) + AL * AG + AM;
    const AO = (AK * AH * AH) + AL * AH + AM;

    const AP = (AK * AI * AI) + AL * AI + AM;
    const AQ = (AK * AJ * AJ) + AL * AJ + AM;

    const AR = (R / (X / 100)) - R;

    certificate.full_load_default_motor_losses = Y;
    certificate.std_pump_input_to_motor_at_100_bep_flow = Z;
    certificate.std_motor_part_load_loss_factor_at_100_bep = AA;

    certificate.nameplate_motor_part_load_losses_at_100_bep = AB;
    certificate.pump_input_power_at_100_bep = AC;
    certificate.variable_load_pump_input_power_at_25_bep = AD;
    certificate.variable_load_pump_input_power_at_50_bep = AE;
    certificate.variable_load_pump_input_power_at_75_bep = AF;
    certificate.motor_power_ratio_at_25_bep = AG;
    certificate.motor_power_ratio_at_50_bep = AH;
    certificate.motor_power_ratio_at_75_bep = AI;
    certificate.motor_power_ratio_at_100_bep = AJ;

    certificate.motor_and_control_part_load_loss_factor_at_25_bep = AN;
    certificate.motor_and_control_part_load_loss_factor_at_50_bep = AO;
    certificate.motor_and_control_part_load_loss_factor_at_75_bep = AP;
    certificate.motor_and_control_part_load_loss_factor_at_100_bep = AQ;

    certificate.full_load_nameplate_motor_losses = AR;
    const AS = certificate.motor_and_control_default_part_load_loss_at_25_bep = AN * AR;
    const AT = certificate.motor_and_control_default_part_load_loss_at_50_bep = AO * AR;
    const AU = certificate.motor_and_control_default_part_load_loss_at_75_bep = AP * AR;
    const AV = certificate.motor_and_control_default_part_load_loss_at_100_bep = AQ * AR;

    const AW = certificate.driver_power_input_to_motor_at_25_bep = AD + AS;
    const AX = certificate.driver_power_input_to_motor_at_50_bep = AE + AT;
    const AY = certificate.driver_power_input_to_motor_at_75_bep = AF + AU;
    const AZ = certificate.driver_power_input_to_motor_at_100_bep = AC + AV;

    certificate.variable_load_energy_rating = (0.25 * AW) +
        (0.25 * AX) +
        (0.25 * AY) +
        (0.25 * AZ);

    const vlei = certificate.variable_load_energy_rating / pump.results.per_std;
    certificate.variable_load_energy_index = Math.round(vlei * 100) / 100;
    certificate.pei = certificate.variable_load_energy_index;
    certificate.energy_rating = Math.round((pump.pei_baseline - vlei) * 100);

    return certificate;
}
exports.calculate_4_5_to_7 = (pump) => {
    const certificate = {}
    debug(`Begin 4/5-7 certificate calculation on pump ${pump.rating_id}`)
    //Full load nameplate motor losses
    const me = pump.motor_regulated ? pump.motor_efficiency : pump.results.default_motor_efficiency;
    certificate.full_load_nameplate_motor_losses = (pump.motor_power_rated / (me / 100) - pump.motor_power_rated);
    certificate.full_load_default_motor_losses = (pump.motor_power_rated / (me / 100) - pump.motor_power_rated);
    debug(`Full load nameplate motor losses = ${certificate.full_load_nameplate_motor_losses}`);
    // Standard pump input to motor power ratio at 100% BEP flow
    // =IF(L6/(N6+Q6)>=1,1,L6/(N6+Q6))
    const load120 = (pump.load120 != 0);
    const L = load120 ? pump.driver_input_power.bep100 : pump.driver_input_power.bep110;
    const N = pump.motor_power_rated;
    const Q = certificate.full_load_nameplate_motor_losses
    const v = L / (N + Q);
    debug(`Standard pump input to motor power ratio at 100% BEP flow [descriminate] = ${v}`)
    certificate.std_pump_input_to_motor_at_100_bep_flow = v >= 1 ? 1 : v;

    // Standard motor part load loss factor at 100% BEP
    // =(-0.4508*R^3)+(1.2399*R^2)-(0.4301*R)+0.641
    const R = certificate.std_pump_input_to_motor_at_100_bep_flow;
    const R3 = R * R * R;
    const R2 = R * R;
    certificate.std_motor_part_load_loss_factor_at_100_bep = (-0.4508 * R3) + (1.2399 * R2) - (0.4301 * R) + 0.641;

    // Nameplate motor part load losses at 100% BEP
    // S*Q
    const S = certificate.std_motor_part_load_loss_factor_at_100_bep;
    certificate.nameplate_motor_part_load_losses_at_100_bep = S * Q;

    // Pump input power at 100 % BEP
    // L6-T6
    const T = certificate.nameplate_motor_part_load_losses_at_100_bep;
    certificate.pump_input_power_at_100_bep = L - T;

    // Variable load pump input power at 25%, 50%, and 75% BEP
    // ((0.8*(0.25*$M6)^3/($M6)^3)+(0.2*0.25*$M6/$M6))*$U6
    const M = pump.flow.bep100;
    const U = certificate.pump_input_power_at_100_bep;
    const V = ((0.8 * (0.25 * M) ** 3 / (M) ** 3) + (0.2 * 0.25 * M / M)) * U;
    const W = ((0.8 * (0.50 * M) ** 3 / (M) ** 3) + (0.2 * 0.50 * M / M)) * U;
    const X = ((0.8 * (0.75 * M) ** 3 / (M) ** 3) + (0.2 * 0.75 * M / M)) * U;

    certificate.variable_load_pump_input_power_at_25_bep = V;
    certificate.variable_load_pump_input_power_at_50_bep = W;
    certificate.variable_load_pump_input_power_at_75_bep = X;

    // Motor power ratio at 25, 50, and 75% BEP
    const Y = V / N >= 1 ? 1 : V / N;
    const Z = W / N >= 1 ? 1 : W / N;
    const AA = X / N >= 1 ? 1 : X / N;
    certificate.motor_power_ratio_at_25_bep = Y;
    certificate.motor_power_ratio_at_50_bep = Z;
    certificate.motor_power_ratio_at_75_bep = AA;
    certificate.motor_power_ratio_at_100_bep = U / N >= 1 ? 1 : U / N;


    // Coefficient A, B, and C
    // =IF($N6<=5, -0.4658, IF($N6<=20,-1.3198, IF($N6<=50,-1.5122, IF($N6>50,-0.8914))))

    certificate.coeff_A = assign_coefficient(N, COEFF_A);
    certificate.coeff_B = assign_coefficient(N, COEFF_B);
    certificate.coeff_C = assign_coefficient(N, COEFF_C);

    // Motor and control part load loss factor at 25% BEP
    certificate.motor_and_control_part_load_loss_factor_at_25_bep = (certificate.coeff_A * Y ** 2) + (certificate.coeff_B * Y) + certificate.coeff_C
    certificate.motor_and_control_part_load_loss_factor_at_50_bep = (certificate.coeff_A * Z ** 2) + (certificate.coeff_B * Z) + certificate.coeff_C
    certificate.motor_and_control_part_load_loss_factor_at_75_bep = (certificate.coeff_A * AA ** 2) + (certificate.coeff_B * AA) + certificate.coeff_C
    certificate.motor_and_control_part_load_loss_factor_at_100_bep = (certificate.coeff_A * certificate.motor_power_ratio_at_100_bep ** 2) + (certificate.coeff_B * certificate.motor_power_ratio_at_100_bep) + certificate.coeff_C;

    // Motor and control default part load loss at 25% BEP
    certificate.motor_and_control_default_part_load_loss_at_25_bep = certificate.motor_and_control_part_load_loss_factor_at_25_bep * Q
    certificate.motor_and_control_default_part_load_loss_at_50_bep = certificate.motor_and_control_part_load_loss_factor_at_50_bep * Q
    certificate.motor_and_control_default_part_load_loss_at_75_bep = certificate.motor_and_control_part_load_loss_factor_at_75_bep * Q
    certificate.motor_and_control_default_part_load_loss_at_100_bep = certificate.motor_and_control_part_load_loss_factor_at_100_bep * Q

    // Driver power input to motor at 25% BEP
    certificate.driver_power_input_to_motor_at_25_bep = V + certificate.motor_and_control_default_part_load_loss_at_25_bep;
    certificate.driver_power_input_to_motor_at_50_bep = W + certificate.motor_and_control_default_part_load_loss_at_50_bep;
    certificate.driver_power_input_to_motor_at_75_bep = X + certificate.motor_and_control_default_part_load_loss_at_75_bep;
    certificate.driver_power_input_to_motor_at_100_bep = U + certificate.motor_and_control_default_part_load_loss_at_100_bep;

    // Variable load Pump Energy Rating
    certificate.variable_load_energy_rating = (0.25 * certificate.driver_power_input_to_motor_at_25_bep) +
        (0.25 * certificate.driver_power_input_to_motor_at_50_bep) +
        (0.25 * certificate.driver_power_input_to_motor_at_75_bep) +
        (0.25 * certificate.driver_power_input_to_motor_at_100_bep);

    const vlei = certificate.variable_load_energy_rating / pump.results.per_std;
    certificate.variable_load_energy_index = Math.round(vlei * 100) / 100;
    certificate.pei = certificate.variable_load_energy_index
    certificate.energy_rating = Math.round((pump.pei_baseline - vlei) * 100);
    return certificate;
}