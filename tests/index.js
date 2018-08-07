const assert = require("chai").assert;
const expect = require("chai").expect;
const fs = require('fs');
const path = require('path');
const certcalc = require('../certificate_calculator');
const N4ZXMQ = require('./certificate-testcases/N4ZXMQ.json');

const assert_precision = (target, value, tolerance) => {
    const t = tolerance || 0.001;
    const diff = Math.abs(target - value);
    assert.isBelow(diff, t);
}

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
});

describe('Section 5 -> 7', function () {
    describe('N4ZXMQ', function (done) {
        let c;
        before(function (done) {
            c = certcalc.calculate_5_to_7(N4ZXMQ)
            done();
        });
        it('Full load nameplate motor losses', function () {
            assert_precision(c.full_load_nameplate_motor_losses, 3.9474)
        });
        it('Standard pump input to motor power ratio at 100% BEP flow', function () {
            assert_precision(c.std_pump_input_to_motor_at_100_bep_flow, 0.6992)
        });
        it('Standard motor part load loss factor at 100% BEP', function () {
            assert_precision(c.std_motor_part_load_loss_factor_at_100_bep, 0.7923)
        });
        it('Nameplate motor part load losses at 100% BEP', function () {
            assert_precision(c.nameplate_motor_part_load_losses_at_100_bep, 3.12767)
        });
        it('Pump input power at 100% BEP', function () {
            assert_precision(c.pump_input_power_at_100_bep, 52.07233)
        });
        it('Variable load pump input power at 25% BEP', function () {
            assert_precision(c.variable_load_pump_input_power_at_25_bep, 3.25452)
        })
        it('Variable load pump input power at 50% BEP', function () {
            assert_precision(c.variable_load_pump_input_power_at_50_bep, 10.41447)
        })
        it('Variable load pump input power at 75% BEP', function () {
            assert_precision(c.variable_load_pump_input_power_at_75_bep, 25.38526)
        })

        it('Motor power ratio at 25% BEP', function () {
            assert_precision(c.motor_power_ratio_at_25_bep, 0.04339)
        })
        it('Motor power ratio at 50% BEP', function () {
            assert_precision(c.motor_power_ratio_at_50_bep, 0.13886)
        })
        it('Motor power ratio at 75% BEP', function () {
            assert_precision(c.motor_power_ratio_at_75_bep, 0.33847)
        });
        it('Motor power ratio at 100% BEP', function () {
            assert_precision(c.motor_power_ratio_at_100_bep, 0.69430)
        });

        it('Coefficient A', function () {
            assert_precision(c.coeff_A, -0.8914)
        })
        it('Coefficient B', function () {
            assert_precision(c.coeff_B, 2.8846)
        })
        it('Coefficient C', function () {
            assert_precision(c.coeff_C, 0.2625)
        })
        it('Motor and control part load loss factor at 25% BEP', function () {
            assert_precision(c.motor_and_control_part_load_loss_factor_at_25_bep, 0.38599)
        });
        it('Motor and control part load loss factor at 50% BEP', function () {
            assert_precision(c.motor_and_control_part_load_loss_factor_at_50_bep, 0.64587)
        });
        it('Motor and control part load loss factor at 75% BEP', function () {
            assert_precision(c.motor_and_control_part_load_loss_factor_at_75_bep, 1.13673)
        });
        it('Motor and control part load loss factor at 100% BEP', function () {
            assert_precision(c.motor_and_control_part_load_loss_factor_at_100_bep, 1.83557)
        });

        it('Motor and control default part load loss at 25% BEP', function () {
            assert_precision(c.motor_and_control_default_part_load_loss_at_25_bep, 1.5237)
        });
        it('Motor and control default part load loss at 50% BEP', function () {
            assert_precision(c.motor_and_control_default_part_load_loss_at_50_bep, 2.5495)
        });
        it('Motor and control default part load loss at 75% BEP', function () {
            assert_precision(c.motor_and_control_default_part_load_loss_at_75_bep, 4.4871)
        });
        it('Motor and control default part load loss at 100% BEP', function () {
            assert_precision(c.motor_and_control_default_part_load_loss_at_100_bep, 7.2457)
        });

        it('Driver power input to motor at 25% BEP', function () {
            assert_precision(c.driver_power_input_to_motor_at_25_bep, 4.7782)
        });
        it('Driver power input to motor at 50% BEP', function () {
            assert_precision(c.driver_power_input_to_motor_at_50_bep, 12.9639)
        });
        it('Driver power input to motor at 75% BEP', function () {
            assert_precision(c.driver_power_input_to_motor_at_75_bep, 29.8724)
        });
        it('Driver power input to motor at 100% BEP', function () {
            assert_precision(c.driver_power_input_to_motor_at_100_bep, 59.3180)
        });

        it('Variable load Pump Energy Rating', function () {
            assert_precision(c.variable_load_energy_rating, 26.733)
        });

        it('Variable load Pump Energy Index', function () {
            assert_precision(c.variable_load_energy_index, 0.45)
        });

        it('Energy Rating', function () {
            assert_precision(c.energy_rating, 55)
        });



    });
});