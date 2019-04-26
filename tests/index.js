const assert = require("chai").assert;
const expect = require("chai").expect;
const fs = require('fs');
const path = require('path');
const certcalc = require('../certificate_calculator');

const N4ZXMQ = require('./certificate-testcases/3_57/N4ZXMQ.json');
const Y4PPD4 = require('./certificate-testcases/3_57/Y4PPD4.json');
const NQ693Q = require('./certificate-testcases/3_57/NQ693Q.json');
const X4KK74 = require('./certificate-testcases/3_57/X4KK74.json');
const N59774 = require('./certificate-testcases/3_57/N59774.json');
const _85WXD4 = require('./certificate-testcases/3_57/85WXD4.json');
const W4MLD5 = require('./certificate-testcases/3_57/W4MLD5.json');
const _2QYWJ5 = require('./certificate-testcases/3_57/2QYWJ5.json');
const XQK274 = require('./certificate-testcases/3_57/XQK274.json');
const _84861Q = require('./certificate-testcases/3_57/84861Q.json');
const B4XZL5 = require('./certificate-testcases/3_57/B4XZL5.json');
const Y5PG85 = require('./certificate-testcases/3_57/Y5PG85.json');
const _85WZM5 = require('./certificate-testcases/3_57/85WZM5.json');
const N4Z914 = require('./certificate-testcases/3_57/N4Z914.json');
const B47K95 = require('./certificate-testcases/45_7/B47K95.json');
const N43EE4 = require('./certificate-testcases/45_7/N43EE4.json');
const BQXVW5 = require('./certificate-testcases/45_7/BQXVW5.json');
const X4KLXQ = require('./certificate-testcases/45_7/X4KLXQ.json');
const _742ZYQ = require('./certificate-testcases/45_7/742ZYQ.json');
const cases_3_to_5 = [N59774, _85WXD4, W4MLD5, _2QYWJ5, XQK274, _84861Q, B4XZL5, Y5PG85, _85WZM5, X4KK74, N4Z914];
const cases_3_to_7 = [N4Z914, X4KK74, W4MLD5, XQK274, _84861Q, _85WZM5, N59774, _2QYWJ5, _85WXD4, Y5PG85, B4XZL5];
const cases_45_to_7 = [B47K95, BQXVW5, X4KLXQ, N43EE4, N4ZXMQ, Y4PPD4, _742ZYQ, NQ693Q];


const INPUT = false;
const THREE_TO_FIVE = false;
const THREE_TO_SEVEN = false;
const FOUR_AND_FIVE_TO_SEVEN = false;
const CIRCULATOR = true;

const assert_precision = (value, target, tolerance) => {
    const t = tolerance || 0.001;
    const diff = Math.abs(target - value);
    assert.isBelow(diff, t, `Expected ${target} got ${value}`);
}
if (INPUT) {
    describe('Input checks', function () {
        it('N4ZXMQ', function (done) {
            assert.equal(N4ZXMQ.doe, 'RSV');
            assert.equal(N4ZXMQ.pei, 0.92);
            assert.equal(N4ZXMQ.results.per_std, 59.2694347826087);
            assert.equal(N4ZXMQ.pei_baseline, 1);
            assert.equal(N4ZXMQ.speed, 1800);
            assert.equal(N4ZXMQ.driver_input_power.bep100, 55.2);
            assert.equal(N4ZXMQ.flow.bep100, 349.830508474576);
            assert.equal(N4ZXMQ.motor_power_rated, 75);
            assert.equal(N4ZXMQ.motor_regulated, 1);
            assert.equal(N4ZXMQ.results.default_motor_efficiency, 95);
            done();
        });

        it('Y4PPD4', function (done) {
            assert.equal(Y4PPD4.doe, 'ST');
            assert.equal(Y4PPD4.pei, 0.81);
            assert.equal(Y4PPD4.results.per_std, 67.3183703703704);
            assert.equal(Y4PPD4.pei_baseline, 1.0557627684026);
            assert.equal(Y4PPD4.speed, 3600);
            assert.equal(Y4PPD4.driver_input_power.bep100, 55.2);
            assert.equal(Y4PPD4.flow.bep100, 349.830508474576);
            assert.equal(Y4PPD4.motor_power_rated, 75);
            assert.equal(Y4PPD4.motor_regulated, undefined);
            assert.equal(Y4PPD4.results.default_motor_efficiency, 81.5);
            done();
        });
        it('NQ693Q', function (done) {
            assert.equal(NQ693Q.doe, 'IL');
            assert.equal(NQ693Q.pei, 0.92);
            assert.equal(NQ693Q.results.per_std, 41.100599673913);
            assert.equal(NQ693Q.pei_baseline, 1.14896043469693);
            assert.equal(NQ693Q.speed, 3600);
            assert.equal(NQ693Q.driver_input_power.bep100, 39.9458);
            assert.equal(NQ693Q.driver_input_power.bep110, 44.2452);
            assert.equal(NQ693Q.flow.bep100, 374.62);
            assert.equal(NQ693Q.flow.bep110, 249.4900);
            assert.equal(NQ693Q.motor_power_rated, 50);
            assert.equal(NQ693Q.motor_regulated, undefined);
            assert.equal(NQ693Q.results.default_motor_efficiency, 93);
            done();
        });
        it('B47K95', function (done) {
            assert.equal(B47K95.doe, 'RSV');
            assert.equal(B47K95.pei, 0.92);
            assert.equal(B47K95.results.per_std, 60.3562826086956);
            assert.equal(B47K95.pei_baseline, 1);
            assert.equal(B47K95.speed, 1800);
            assert.equal(B47K95.driver_input_power.bep100, 56.2);
            assert.equal(B47K95.flow.bep100, 349.830508474576);
            assert.equal(B47K95.motor_power_rated, 75);
            assert.equal(B47K95.motor_regulated, 1);
            assert.equal(B47K95.results.default_motor_efficiency, 95);
            done();
        });
        it('N43EE4', function (done) {
            assert.equal(N43EE4.doe, 'IL');
            assert.equal(N43EE4.pei, 0.92);
            assert.equal(N43EE4.results.per_std, 41.102012576087);
            assert.equal(N43EE4.pei_baseline, 1.14896043469693);
            assert.equal(N43EE4.speed, 3600);
            assert.equal(N43EE4.driver_input_power.bep100, 39.947);
            assert.equal(N43EE4.driver_input_power.bep110, 44.2496);
            assert.equal(N43EE4.flow.bep100, 374.62);
            assert.equal(N43EE4.flow.bep110, 249.49);
            assert.equal(N43EE4.motor_power_rated, 50);
            assert.equal(N43EE4.motor_regulated, 0);
            assert.equal(N43EE4.results.default_motor_efficiency, 93);
            done();
        });
        it('X4KK74', function (done) {
            assert.equal(X4KK74.doe, 'ESFM');
            assert.equal(X4KK74.pei, 0.95);
            assert.equal(X4KK74.results.per_std, 104.165021052632);
            assert.equal(X4KK74.pei_baseline, 1.07904337594123);
            assert.equal(X4KK74.speed, 1800);
            assert.equal(X4KK74.driver_input_power.bep100, 102);
            assert.equal(X4KK74.flow.bep100, 1986);
            assert.equal(X4KK74.motor_power_rated, 125);
            assert.equal(X4KK74.results.default_motor_efficiency, 95.4);
            assert.equal(X4KK74.certificate_7.motor.motor_type, 'enclosed');
            done();
        });
        it('N59774', function (done) {
            assert.equal(N59774.doe, 'ESFM');
            assert.equal(N59774.pei, 0.89);
            assert.equal(N59774.results.per_std, 1.23208651685393);
            assert.equal(N59774.pei_baseline, 1.17473318792345);
            assert.equal(N59774.speed, 1800);
            assert.equal(N59774.driver_input_power.bep100, 1.12);
            assert.equal(N59774.flow.bep100, 35.2);
            assert.equal(N59774.motor_power_rated, 1.5);
            assert.equal(N59774.results.default_motor_efficiency, 86.5);
            assert.equal(N59774.certificate_5.motor.motor_type, 'open');
            done();
        });
    });
}

if (FOUR_AND_FIVE_TO_SEVEN) {
    describe('Section 4-5 -> 7', function () {
        const tests = cases_45_to_7;
        for (const pump of tests) {
            describe(pump.rating_id, function (done) {
                let c;
                before(function (done) {
                    c = certcalc.calculate_4_5_to_7(pump)
                    done();
                });
                /**** CHANGE NAME ONLY 4/5*/
                it('Full load nameplate motor losses', function () {
                    assert_precision(c.full_load_nameplate_motor_losses, pump.certificate_7.full_load_nameplate_motor_losses)
                });
                /**********  */
                it('Standard pump input to motor power ratio at 100% BEP flow', function () {
                    assert_precision(c.std_pump_input_to_motor_at_100_bep_flow, pump.certificate_7.std_pump_input_to_motor_at_100_bep_flow)
                });
                it('Standard motor part load loss factor at 100% BEP', function () {
                    assert_precision(c.std_motor_part_load_loss_factor_at_100_bep, pump.certificate_7.std_motor_part_load_loss_factor_at_100_bep)
                });
                /**** CHANGE NAME ONLY 4/5*/
                it('Nameplate motor part load losses at 100% BEP', function () {
                    assert_precision(c.nameplate_motor_part_load_losses_at_100_bep, pump.certificate_7.nameplate_motor_part_load_losses_at_100_bep)
                });
                /**********  */
                it('Pump input power at 100% BEP', function () {
                    assert_precision(c.pump_input_power_at_100_bep, pump.certificate_7.pump_input_power_at_100_bep)
                });
                it('Variable load pump input power at 25% BEP', function () {
                    assert_precision(c.variable_load_pump_input_power_at_25_bep, pump.certificate_7.variable_load_pump_input_power_at_25_bep)
                })
                it('Variable load pump input power at 50% BEP', function () {
                    assert_precision(c.variable_load_pump_input_power_at_50_bep, pump.certificate_7.variable_load_pump_input_power_at_50_bep)
                })
                it('Variable load pump input power at 75% BEP', function () {
                    assert_precision(c.variable_load_pump_input_power_at_75_bep, pump.certificate_7.variable_load_pump_input_power_at_75_bep)
                })
                /**** CHANGE NAME ONLY 4/5*/
                it('Motor power ratio at 25% BEP', function () {
                    assert_precision(c.motor_power_ratio_at_25_bep, pump.certificate_7.motor_power_ratio_at_25_bep)
                })
                it('Motor power ratio at 50% BEP', function () {
                    assert_precision(c.motor_power_ratio_at_50_bep, pump.certificate_7.motor_power_ratio_at_50_bep)
                })
                it('Motor power ratio at 75% BEP', function () {
                    assert_precision(c.motor_power_ratio_at_75_bep, pump.certificate_7.motor_power_ratio_at_75_bep)
                });
                it('Motor power ratio at 100% BEP', function () {
                    assert_precision(c.motor_power_ratio_at_100_bep, pump.certificate_7.motor_power_ratio_at_100_bep)
                });
                /**********  */
                it('Coefficient A', function () {
                    assert_precision(c.coeff_A, pump.certificate_7.coeff_A)
                })
                it('Coefficient B', function () {
                    assert_precision(c.coeff_B, pump.certificate_7.coeff_B)
                })
                it('Coefficient C', function () {
                    assert_precision(c.coeff_C, pump.certificate_7.coeff_C)
                })
                it('Motor and control part load loss factor at 25% BEP', function () {
                    assert_precision(c.motor_and_control_part_load_loss_factor_at_25_bep, pump.certificate_7.motor_and_control_part_load_loss_factor_at_25_bep)
                });
                it('Motor and control part load loss factor at 50% BEP', function () {
                    assert_precision(c.motor_and_control_part_load_loss_factor_at_50_bep, pump.certificate_7.motor_and_control_part_load_loss_factor_at_50_bep)
                });
                it('Motor and control part load loss factor at 75% BEP', function () {
                    assert_precision(c.motor_and_control_part_load_loss_factor_at_75_bep, pump.certificate_7.motor_and_control_part_load_loss_factor_at_75_bep)
                });
                it('Motor and control part load loss factor at 100% BEP', function () {
                    assert_precision(c.motor_and_control_part_load_loss_factor_at_100_bep, pump.certificate_7.motor_and_control_part_load_loss_factor_at_100_bep)
                });

                it('Motor and control default part load loss at 25% BEP', function () {
                    assert_precision(c.motor_and_control_default_part_load_loss_at_25_bep, pump.certificate_7.motor_and_control_default_part_load_loss_at_25_bep)
                });
                it('Motor and control default part load loss at 50% BEP', function () {
                    assert_precision(c.motor_and_control_default_part_load_loss_at_50_bep, pump.certificate_7.motor_and_control_default_part_load_loss_at_50_bep)
                });
                it('Motor and control default part load loss at 75% BEP', function () {
                    assert_precision(c.motor_and_control_default_part_load_loss_at_75_bep, pump.certificate_7.motor_and_control_default_part_load_loss_at_75_bep)
                });
                it('Motor and control default part load loss at 100% BEP', function () {
                    assert_precision(c.motor_and_control_default_part_load_loss_at_100_bep, pump.certificate_7.motor_and_control_default_part_load_loss_at_100_bep)
                });

                it('Driver power input to motor at 25% BEP', function () {
                    assert_precision(c.driver_power_input_to_motor_at_25_bep, pump.certificate_7.driver_power_input_to_motor_at_25_bep)
                });
                it('Driver power input to motor at 50% BEP', function () {
                    assert_precision(c.driver_power_input_to_motor_at_50_bep, pump.certificate_7.driver_power_input_to_motor_at_50_bep)
                });
                it('Driver power input to motor at 75% BEP', function () {
                    assert_precision(c.driver_power_input_to_motor_at_75_bep, pump.certificate_7.driver_power_input_to_motor_at_75_bep)
                });
                it('Driver power input to motor at 100% BEP', function () {
                    assert_precision(c.driver_power_input_to_motor_at_100_bep, pump.certificate_7.driver_power_input_to_motor_at_100_bep)
                });

                it('Variable load Pump Energy Rating', function () {
                    assert_precision(c.variable_load_energy_rating, pump.certificate_7.variable_load_energy_rating)
                });

                it('Variable load Pump Energy Index', function () {
                    assert_precision(c.variable_load_energy_index, pump.certificate_7.variable_load_energy_index)
                });

                it('Energy Rating', function () {
                    assert_precision(c.energy_rating, pump.certificate_7.energy_rating)
                });



            });
        }
    });
}
if (THREE_TO_FIVE) {
    describe('Section 3 -> 5', function () {
        const tests = cases_3_to_5;
        for (const pump of tests) {
            describe(pump.rating_id, function (done) {
                let c;
                before(function (done) {
                    c = certcalc.calculate_3_to_5(pump, {
                        motor: pump.certificate_5.motor
                    })
                    done();
                });
                it('minimum_efficiency_extended', function () {
                    assert_precision(c.minimum_efficiency_extended, pump.certificate_5.minimum_efficiency_extended)
                });
                it('minimum_efficiency_extended_check', function () {
                    assert(c.minimum_efficiency_extended_check === pump.certificate_5.minimum_efficiency_extended_check)
                });
                it('default_efficiency_bands', function () {
                    assert_precision(c.default_efficiency_bands, pump.certificate_5.default_efficiency_bands)
                });

                it('motor_efficiency_equivalent_bands', function () {
                    assert_precision(c.motor_efficiency_equivalent_bands, pump.certificate_5.motor_efficiency_equivalent_bands)
                });

                it('full_load_default_motor_losses', function () {
                    assert_precision(c.full_load_default_motor_losses, pump.certificate_5.full_load_default_motor_losses);
                });

                it('Standard pump input to motor power ratio at 100% BEP flow', function () {
                    assert_precision(c.std_pump_input_to_motor_at_100_bep_flow, pump.certificate_5.std_pump_input_to_motor_at_100_bep_flow)
                });

                it('Standard motor part load loss factor at 100% BEP', function () {
                    assert_precision(c.std_motor_part_load_loss_factor_at_100_bep, pump.certificate_5.std_motor_part_load_loss_factor_at_100_bep)
                });

                it('Standard motor part load loss factor at 100% BEP', function () {
                    assert_precision(c.std_motor_part_load_loss_factor_at_100_bep, pump.certificate_5.std_motor_part_load_loss_factor_at_100_bep)
                });


                it('Nameplate motor part load losses at 75% BEP', function () {
                    assert_precision(c.std_motor_part_load_loss_at_75_bep, pump.certificate_5.std_motor_part_load_loss_at_75_bep)
                });
                it('Nameplate motor part load losses at 100 % BEP', function () {
                    assert_precision(c.std_motor_part_load_loss_at_100_bep, pump.certificate_5.std_motor_part_load_loss_at_100_bep)
                });
                it('Nameplate motor part load losses at 110% BEP', function () {
                    assert_precision(c.std_motor_part_load_loss_at_110_bep, pump.certificate_5.std_motor_part_load_loss_at_110_bep)
                });

                it('Pump input power at 100% BEP', function () {
                    assert_precision(c.pump_input_power_at_100_bep, pump.certificate_5.pump_input_power_at_100_bep)
                });

                it('Full load extended motor losses, equivalent bands above normal', function () {
                    assert_precision(c.full_load_motor_losses_equivelant_bands_above_normal, pump.certificate_5.full_load_motor_losses_equivelant_bands_above_normal)
                });


                it('Pump input to motor power ratio at 75 BEP', function () {
                    assert_precision(c.pump_input_to_motor_power_ratio_at_75_bep, pump.certificate_5.pump_input_to_motor_power_ratio_at_75_bep)
                });
                it('Pump input to motor power ratio at 100 BEP', function () {
                    assert_precision(c.pump_input_to_motor_power_ratio_at_100_bep, pump.certificate_5.pump_input_to_motor_power_ratio_at_100_bep)
                });
                it('Pump input to motor power ratio at 110 BEP', function () {
                    assert_precision(c.pump_input_to_motor_power_ratio_at_110_bep, pump.certificate_5.pump_input_to_motor_power_ratio_at_110_bep)
                });

                it('Extended motor part load loss factor at 75% BEP', function () {
                    assert_precision(c.motor_part_load_loss_factor_at_75_bep, pump.certificate_5.motor_part_load_loss_factor_at_75_bep)
                });
                it('Extended motor part load loss factor at 100% BEP', function () {
                    assert_precision(c.motor_part_load_loss_factor_at_100_bep, pump.certificate_5.motor_part_load_loss_factor_at_100_bep)
                });
                it('Extended motor part load loss factor at 110% BEP', function () {
                    assert_precision(c.motor_part_load_loss_factor_at_110_bep, pump.certificate_5.motor_part_load_loss_factor_at_110_bep)
                });


                it('Nameplate motor part load losses at 75% BEP', function () {
                    assert_precision(c.nameplate_motor_part_load_losses_at_75_bep, pump.certificate_5.nameplate_motor_part_load_losses_at_75_bep)
                });
                it('Nameplate motor part load losses at 100% BEP', function () {
                    assert_precision(c.nameplate_motor_part_load_losses_at_100_bep, pump.certificate_5.nameplate_motor_part_load_losses_at_100_bep)
                });
                it('Nameplate motor part load losses at 110% BEP', function () {
                    assert_precision(c.nameplate_motor_part_load_losses_at_110_bep, pump.certificate_5.nameplate_motor_part_load_losses_at_110_bep)
                });

                it('Driver power input to motor at 75% BEP', function () {
                    assert_precision(c.driver_power_input_to_motor_at_75_bep, pump.certificate_5.driver_power_input_to_motor_at_75_bep)
                });
                it('Driver power input to motor at 100% BEP', function () {
                    assert_precision(c.driver_power_input_to_motor_at_100_bep, pump.certificate_5.driver_power_input_to_motor_at_100_bep)
                });

                it('Driver power input to motor at 110% BEP', function () {
                    assert_precision(c.driver_power_input_to_motor_at_110_bep, pump.certificate_5.driver_power_input_to_motor_at_110_bep)
                });

                it('Constant load Pump Energy Rating', function () {
                    assert_precision(c.constant_load_energy_rating, pump.certificate_5.constant_load_energy_rating)
                });

                it('Constant load Pump Energy Index', function () {
                    assert_precision(c.constant_load_energy_index, pump.certificate_5.constant_load_energy_index)
                });

                it('Energy Rating', function () {
                    assert_precision(c.energy_rating, pump.certificate_5.energy_rating)
                });

            });
        }
    });
}
if (THREE_TO_SEVEN) {
    describe('Section 3 -> 7', function () {
        const tests = cases_3_to_7;
        for (let pump of tests) {
            describe(pump.rating_id, function (done) {
                let c;
                let invalid = false;
                before(function (done) {
                    try {

                        if (pump.certificate_7.doe) {
                            pump = JSON.parse(JSON.stringify(pump));
                            pump.doe = pump.certificate_7.doe;
                            pump.results.default_motor_efficiency = pump.certificate_7.default_motor_efficiency;
                        }
                        c = certcalc.calculate_3_to_7(pump, {
                            motor: pump.certificate_7.motor
                        })

                        if (c.minimum_efficiency_extended_check === pump.certificate_7.minimum_efficiency_extended_check && !c.minimum_efficiency_extended_check) {
                            invalid = true;
                        }
                        done();
                    } catch (e) {
                        console.log(e);
                        throw e;
                    }
                });
                it('minimum_efficiency_extended', function () {
                    if (pump.certificate_7.minimum_efficiency_extended == '-') {
                        assert(c.minimum_efficiency_extended === '-')
                    } else {
                        assert_precision(c.minimum_efficiency_extended, pump.certificate_7.minimum_efficiency_extended)
                    }
                });
                it('minimum_efficiency_extended_check', function () {
                    assert(c.minimum_efficiency_extended_check === pump.certificate_7.minimum_efficiency_extended_check)
                });

                it('default_efficiency_bands', function () {
                    if (invalid) return;
                    if (pump.certificate_7.default_efficiency_bands == '-') {
                        assert(c.default_efficiency_bands === '-')
                    } else {
                        assert_precision(c.default_efficiency_bands, pump.certificate_7.default_efficiency_bands)
                    }
                });

                it('motor_efficiency_equivalent_bands', function () {
                    if (invalid) return;
                    assert_precision(c.motor_efficiency_equivalent_bands, pump.certificate_7.motor_efficiency_equivalent_bands)
                });

                it('full_load_default_motor_losses', function () {
                    if (invalid) return;
                    assert_precision(c.full_load_default_motor_losses, pump.certificate_7.full_load_default_motor_losses);
                });

                it('Standard pump input to motor power ratio at 100% BEP flow', function () {
                    if (invalid) return;
                    assert_precision(c.std_pump_input_to_motor_at_100_bep_flow, pump.certificate_7.std_pump_input_to_motor_at_100_bep_flow)
                });

                it('Standard motor part load loss factor at 100% BEP', function () {
                    if (invalid) return;
                    assert_precision(c.std_motor_part_load_loss_factor_at_100_bep, pump.certificate_7.std_motor_part_load_loss_factor_at_100_bep)
                });

                it('Nameplate motor part load losses at 100% BEP', function () {
                    if (invalid) return;
                    assert_precision(c.nameplate_motor_part_load_losses_at_100_bep, pump.certificate_7.std_motor_part_load_loss_at_100_bep)
                });

                it('Pump input power at 100% BEP', function () {
                    if (invalid) return;
                    assert_precision(c.pump_input_power_at_100_bep, pump.certificate_7.pump_input_power_at_100_bep)
                });

                it('Variable load pump input power at 25% BEP', function () {
                    if (invalid) return;
                    assert_precision(c.variable_load_pump_input_power_at_25_bep, pump.certificate_7.variable_load_pump_input_power_at_25_bep)
                })
                it('Variable load pump input power at 50% BEP', function () {
                    if (invalid) return;
                    assert_precision(c.variable_load_pump_input_power_at_50_bep, pump.certificate_7.variable_load_pump_input_power_at_50_bep)
                })
                it('Variable load pump input power at 75% BEP', function () {
                    if (invalid) return;
                    assert_precision(c.variable_load_pump_input_power_at_75_bep, pump.certificate_7.variable_load_pump_input_power_at_75_bep)
                })


                it('Motor power ratio at 25% BEP', function () {
                    if (invalid) return;
                    assert_precision(c.motor_power_ratio_at_25_bep, pump.certificate_7.motor_power_ratio_at_25_bep)
                })
                it('Motor power ratio at 50% BEP', function () {
                    if (invalid) return;
                    assert_precision(c.motor_power_ratio_at_50_bep, pump.certificate_7.motor_power_ratio_at_50_bep)
                })
                it('Motor power ratio at 75% BEP', function () {
                    if (invalid) return;
                    assert_precision(c.motor_power_ratio_at_75_bep, pump.certificate_7.motor_power_ratio_at_75_bep)
                });
                it('Motor power ratio at 100% BEP', function () {
                    if (invalid) return;
                    assert_precision(c.motor_power_ratio_at_100_bep, pump.certificate_7.motor_power_ratio_at_100_bep)
                });


                it('Coefficient A', function () {
                    if (invalid) return;
                    assert_precision(c.coeff_A, pump.certificate_7.coeff_A)
                })
                it('Coefficient B', function () {
                    if (invalid) return;
                    assert_precision(c.coeff_B, pump.certificate_7.coeff_B)
                })
                it('Coefficient C', function () {
                    if (invalid) return;
                    assert_precision(c.coeff_C, pump.certificate_7.coeff_C)
                });


                it('Motor and control part load loss factor at 25% BEP', function () {
                    if (invalid) return;
                    assert_precision(c.motor_and_control_part_load_loss_factor_at_25_bep, pump.certificate_7.motor_and_control_part_load_loss_factor_at_25_bep)
                });
                it('Motor and control part load loss factor at 50% BEP', function () {
                    if (invalid) return;
                    assert_precision(c.motor_and_control_part_load_loss_factor_at_50_bep, pump.certificate_7.motor_and_control_part_load_loss_factor_at_50_bep)
                });
                it('Motor and control part load loss factor at 75% BEP', function () {
                    if (invalid) return;
                    assert_precision(c.motor_and_control_part_load_loss_factor_at_75_bep, pump.certificate_7.motor_and_control_part_load_loss_factor_at_75_bep)
                });
                it('Motor and control part load loss factor at 100% BEP', function () {
                    if (invalid) return;
                    assert_precision(c.motor_and_control_part_load_loss_factor_at_100_bep, pump.certificate_7.motor_and_control_part_load_loss_factor_at_100_bep)
                });

                it('Full load nameplate motor losses', function () {
                    if (invalid) return;
                    assert_precision(c.full_load_nameplate_motor_losses, pump.certificate_7.full_load_nameplate_motor_losses)
                });

                it('Motor and control default part load loss at 25% BEP', function () {
                    if (invalid) return;
                    assert_precision(c.motor_and_control_default_part_load_loss_at_25_bep, pump.certificate_7.motor_and_control_default_part_load_loss_at_25_bep)
                });
                it('Motor and control default part load loss at 50% BEP', function () {
                    if (invalid) return;
                    assert_precision(c.motor_and_control_default_part_load_loss_at_50_bep, pump.certificate_7.motor_and_control_default_part_load_loss_at_50_bep)
                });
                it('Motor and control default part load loss at 75% BEP', function () {
                    if (invalid) return;
                    assert_precision(c.motor_and_control_default_part_load_loss_at_75_bep, pump.certificate_7.motor_and_control_default_part_load_loss_at_75_bep)
                });
                it('Motor and control default part load loss at 100% BEP', function () {
                    if (invalid) return;
                    assert_precision(c.motor_and_control_default_part_load_loss_at_100_bep, pump.certificate_7.motor_and_control_default_part_load_loss_at_100_bep)
                });

                it('Driver power input to motor at 25% BEP', function () {
                    if (invalid) return;
                    assert_precision(c.driver_power_input_to_motor_at_25_bep, pump.certificate_7.driver_power_input_to_motor_at_25_bep)
                });
                it('Driver power input to motor at 50% BEP', function () {
                    if (invalid) return;
                    assert_precision(c.driver_power_input_to_motor_at_50_bep, pump.certificate_7.driver_power_input_to_motor_at_50_bep)
                });
                it('Driver power input to motor at 75% BEP', function () {
                    if (invalid) return;
                    assert_precision(c.driver_power_input_to_motor_at_75_bep, pump.certificate_7.driver_power_input_to_motor_at_75_bep)
                });
                it('Driver power input to motor at 100% BEP', function () {
                    if (invalid) return;
                    assert_precision(c.driver_power_input_to_motor_at_100_bep, pump.certificate_7.driver_power_input_to_motor_at_100_bep)
                });


                it('Variable load Pump Energy Rating', function () {
                    if (invalid) return;
                    assert_precision(c.variable_load_energy_rating, pump.certificate_7.variable_load_energy_rating)
                });

                it('Variable load Pump Energy Index', function () {
                    if (invalid) return;
                    assert_precision(c.variable_load_energy_index, pump.certificate_7.variable_load_energy_index)
                });

                it('Energy Rating', function () {
                    if (invalid) return;
                    assert_precision(c.energy_rating, pump.certificate_7.energy_rating)
                });




            });
        }
    });
}

if (CIRCULATOR) {

    require('./circulator-tests')
}