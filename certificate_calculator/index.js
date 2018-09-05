const debug = require('debug')('cert-calc');
const minimum_motors = require('./minimum_motor');
const bands = require('./bands');
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
exports.calculate_3_to_7 = (pump, certificate) => {
    debug(`Begin 3-7 certificate calculation on pump ${pump.rating_id}`)
    const motor_lookup = `${certificate.motor.motor_type}${pump.doe.toUpperCase()}-${pump.motor_power_rated}-${pump.speed}`;
    certificate.minimum_efficiency_extended = minimum_motors[motor_lookup];
    if (pump.doe === 'st') {
        certificate.minimum_efficiency_extended_check = true;
    } else {
        certificate.minimum_efficiency_extended_check = certificate.minimum_efficiency_extended <= certificate.motor.efficiency;
    }
    if (!certificate.minimum_efficiency_extended_check) {
        return certificate;
    }

    const min_band = band(certificate.minimum_efficiency_extended);
    const actual_band = band(certificate.motor.efficiency);
    certificate.default_efficiency_bands = actual_band - min_band;
    return certificate;
}
exports.calculate_4_5_to_7 = (pump) => {
    const certificate = {}
    debug(`Begin 4/5-7 certificate calculation on pump ${pump.rating_id}`)
    //Full load nameplate motor losses
    certificate.full_load_nameplate_motor_losses = (pump.motor_power_rated / (pump.results.default_motor_efficiency / 100) - pump.motor_power_rated);
    certificate.full_load_default_motor_losses = (pump.motor_power_rated / (pump.results.default_motor_efficiency / 100) - pump.motor_power_rated);
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
    const A = [-0.4658, -1.3198, -1.5122, -0.8914];
    const B = [1.4965, 2.9551, 3.0777, 2.8846];
    const C = [0.5303, 0.1052, 0.1847, 0.2625];
    certificate.coeff_A = assign_coefficient(N, A);
    certificate.coeff_B = assign_coefficient(N, B);
    certificate.coeff_C = assign_coefficient(N, C);

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

    certificate.variable_load_energy_index = (certificate.variable_load_energy_rating / pump.results.per_std * 100) / 100;

    certificate.energy_rating = Math.round((pump.pei_baseline - certificate.variable_load_energy_index) * 100);
    return certificate;
}