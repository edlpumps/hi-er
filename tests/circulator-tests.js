const assert = require("chai").assert;
const circulator = require('../circulator-calculator');
const expect = require("chai").expect;
const Circulator = require('../controllers/circulator');
const path = require('path');
const UOM = require('../utils/uom');

const assert_precision = (value, target, tolerance) => {
    const t = tolerance || 0.001;
    const diff = Math.abs(target - value);
    assert.isBelow(diff, t, `Expected ${target} got ${value}`);
}

describe('Excel import tests', function () {
    const participant = {
        name: 'Hydraulic Institute'
    }
    const labs = [{
            code: '8',
            name: 'Houston'
        },
        {
            code: '9',
            name: 'Dallas'
        }
    ]
    const bad = path.join(__dirname, 'index.js');
    const empty = path.join(__dirname, 'circulator-import-test-0.xlsx');
    const test = path.join(__dirname, 'circulator-import-test.xlsx');
    const metric = path.join(__dirname, 'circulator-import-test-metric.xlsx');
    it('Returns undefined if file is corrupted/missing', async () => {
        const result = await Circulator.load_file(participant, labs, UOM.US, bad);
        expect(result).to.equal(undefined);
    });
    it('Reports no pumps if excel sheet is empty', async () => {
        const result = await Circulator.load_file(participant, labs, UOM.US, empty);
        expect(result).to.not.equal(undefined);
        expect(result.ready).to.not.equal(undefined);
        expect(result.failed).to.not.equal(undefined);
        expect(result.ready.length).to.equal(0);
        expect(result.failed.length).to.equal(0);
    });



    describe('Reports pumps accurately :)', async () => {
        let result;
        before(async () => {
            result = await Circulator.load_file(participant, labs, UOM.US, test);
        });

        it(`Reads entire input sheet`, () => {
            expect(result).to.not.equal(undefined);
            expect(result.ready).to.not.equal(undefined);
            expect(result.failed).to.not.equal(undefined);
            expect(result.ready.length).to.equal(4);
            expect(result.failed.length).to.equal(13);
        });

        it(`Fails rows with no data`, () => {
            const pump = result.failed[0];
            expect(pump.template_row).to.equal(9);
            expect(pump.participant).to.not.equal(undefined);
            expect(pump.participant.name).to.equal(participant.name);
            expect(pump.brand).to.equal('IQ')
            expect(pump.basic_model).to.equal('FAIL 1');
            expect(pump.failure).to.equal('No control methods specified');
        })
        it(`Fails rows with no data control methods`, () => {
            const pump = result.failed[1];
            expect(pump.template_row).to.equal(10);
            expect(pump.participant).to.not.equal(undefined);
            expect(pump.participant.name).to.equal(participant.name);
            expect(pump.brand).to.equal('IQ')
            expect(pump.basic_model).to.equal('FAIL 2');
            expect(pump.failure).to.equal('No control methods specified');
        })
        it(`Fails rows with control method conflict (lc)`, () => {
            const pump = result.failed[2];
            expect(pump.template_row).to.equal(11);
            expect(pump.participant).to.not.equal(undefined);
            expect(pump.participant.name).to.equal(participant.name);
            expect(pump.brand).to.equal('IQ')
            expect(pump.basic_model).to.equal('FAIL 3');
            expect(pump.failure).to.equal('Control method conflict');
        });
        it(`Fails rows with control method conflict (mc)`, () => {
            const pump = result.failed[3];
            expect(pump.template_row).to.equal(12);
            expect(pump.participant).to.not.equal(undefined);
            expect(pump.participant.name).to.equal(participant.name);
            expect(pump.brand).to.equal('IQ')
            expect(pump.basic_model).to.equal('FAIL 4');
            expect(pump.failure).to.equal('Control method conflict');
        });
        it(`Fails rows with missing head column`, () => {
            const pump = result.failed[4];
            expect(pump.template_row).to.equal(13);
            expect(pump.participant).to.not.equal(undefined);
            expect(pump.participant.name).to.equal(participant.name);
            expect(pump.brand).to.equal('IQ')
            expect(pump.basic_model).to.equal('FAIL 5');
            expect(pump.failure).to.equal('Four head data points are required');
        });
        it(`Fails rows with invalid head column`, () => {
            const pump = result.failed[5];
            expect(pump.template_row).to.equal(14);
            expect(pump.participant).to.not.equal(undefined);
            expect(pump.participant.name).to.equal(participant.name);
            expect(pump.brand).to.equal('IQ')
            expect(pump.basic_model).to.equal('FAIL 6');
            expect(pump.failure).to.equal('Four head data points are required');
        });
        it(`Fails rows with invalid flow column`, () => {
            const pump = result.failed[6];
            expect(pump.template_row).to.equal(15);
            expect(pump.participant).to.not.equal(undefined);
            expect(pump.participant.name).to.equal(participant.name);
            expect(pump.brand).to.equal('IQ')
            expect(pump.basic_model).to.equal('FAIL 7');
            expect(pump.failure).to.equal('Flow Rate is required');
        });
        it(`Fails rows with invalid flow column`, () => {
            const pump = result.failed[7];
            expect(pump.template_row).to.equal(16);
            expect(pump.participant).to.not.equal(undefined);
            expect(pump.participant.name).to.equal(participant.name);
            expect(pump.brand).to.equal('IQ')
            expect(pump.basic_model).to.equal('FAIL 8');
            expect(pump.failure).to.equal('PEI for least consumptive method is required');
        });
        it(`Fails rows with missing pei (mc)`, () => {
            const pump = result.failed[8];
            expect(pump.template_row).to.equal(17);
            expect(pump.participant).to.not.equal(undefined);
            expect(pump.participant.name).to.equal(participant.name);
            expect(pump.brand).to.equal('IQ')
            expect(pump.basic_model).to.equal('FAIL 9');
            expect(pump.failure).to.equal('PEI for most consumptive method is required');
        });
        it(`Fails rows with method / input power mismatch`, () => {
            const pump = result.failed[9];
            expect(pump.template_row).to.equal(18);
            expect(pump.participant).to.not.equal(undefined);
            expect(pump.participant.name).to.equal(participant.name);
            expect(pump.brand).to.equal('IQ')
            expect(pump.basic_model).to.equal('FAIL 10');
            expect(pump.failure).to.equal('Least consumptive method specified requires four power inputs');
        });
        it(`Fails rows with method / input power mismatch`, () => {
            const pump = result.failed[10];
            expect(pump.template_row).to.equal(19);
            expect(pump.participant).to.not.equal(undefined);
            expect(pump.participant.name).to.equal(participant.name);
            expect(pump.brand).to.equal('IQ')
            expect(pump.basic_model).to.equal('FAIL 11');
            expect(pump.failure).to.equal('Least consumptive method specified requires max/reduced power inputs');
        });
        it(`Fails rows with method / input power mismatch`, () => {
            const pump = result.failed[11];
            expect(pump.template_row).to.equal(20);
            expect(pump.participant).to.not.equal(undefined);
            expect(pump.participant.name).to.equal(participant.name);
            expect(pump.brand).to.equal('IQ')
            expect(pump.basic_model).to.equal('FAIL 12');
            expect(pump.failure).to.equal('Most consumptive method specified requires four power inputs');
        });
        it(`Fails rows with method / input power mismatch`, () => {
            const pump = result.failed[12];
            expect(pump.template_row).to.equal(21);
            expect(pump.participant).to.not.equal(undefined);
            expect(pump.participant.name).to.equal(participant.name);
            expect(pump.brand).to.equal('IQ')
            expect(pump.basic_model).to.equal('FAIL 13');
            expect(pump.failure).to.equal('Most consumptive method specified requires max/reduced power inputs');
        });

        it(`Import CP3 No Control`, () => {
            const pump = result.ready[0];
            expect(pump.template_row).to.equal(5);
            expect(pump.participant).to.not.equal(undefined);
            expect(pump.participant.name).to.equal(participant.name);
            expect(pump.brand).to.equal('IQ')
            expect(pump.basic_model).to.equal('NO-CONTROL-CP3');
            expect(pump.manufacturer_model).to.equal('ABC-DEF-GHI');
            expect(pump.alternative_part_number).to.equal('42');
            expect(pump.type).to.equal('CP3');
            expect(pump.laboratory).to.not.equal(undefined);
            expect(pump.laboratory.name).to.equal('Houston');
            expect(pump.least.control_method).to.equal('no-speed-control');
            expect(pump.most).to.equal(undefined);

            expect(pump.control_methods.filter(c => c == 'no-speed-control').length).to.equal(1);
            expect(pump.control_methods.filter(c => c == 'pressure-control').length).to.equal(1);
            expect(pump.control_methods.filter(c => c == 'temperature-control').length).to.equal(1);
            expect(pump.control_methods.filter(c => c == 'external-control').length).to.equal(0);
            expect(pump.control_methods.filter(c => c == 'external-other-control').length).to.equal(0);
            expect(pump.control_methods.filter(c => c == 'manual-control').length).to.equal(0);

            expect(pump.head).to.not.equal(undefined);
            expect(pump.head.length).to.equal(4);
            assert_precision(pump.head[0], 17);
            assert_precision(pump.head[1], 23);
            assert_precision(pump.head[2], 33);
            assert_precision(pump.head[3], 40);

            assert_precision(pump.flow, 150);
            assert_precision(pump.least.pei, 1.2);

            expect(pump.least.input_power).to.not.equal(undefined);
            expect(pump.least.input_power.length).to.equal(4);
            assert_precision(pump.least.input_power[0], 0.4);
            assert_precision(pump.least.input_power[1], 1.2);
            assert_precision(pump.least.input_power[2], 1.9);
            assert_precision(pump.least.input_power[3], 2.5);

            assert_precision(pump.least.energy_rating, 54.143);

        });

        it(`Import CP2 Pressure / Temperature Control`, () => {
            const pump = result.ready[1];
            expect(pump.template_row).to.equal(6);
            expect(pump.participant).to.not.equal(undefined);
            expect(pump.participant.name).to.equal(participant.name);
            expect(pump.brand).to.equal('IQ')
            expect(pump.basic_model).to.equal('PRESSURE_CONTROL-CP2');
            expect(pump.manufacturer_model).to.equal('000-000-001');
            expect(pump.alternative_part_number).to.equal('43');
            expect(pump.type).to.equal('CP2');
            expect(pump.laboratory).to.not.equal(undefined);
            expect(pump.laboratory.name).to.equal('Houston');
            expect(pump.least.control_method).to.equal('pressure-control');
            expect(pump.most.control_method).to.equal('temperature-control');

            expect(pump.least.pressure_curve).to.equal('mx+b');
            expect(pump.most.pressure_curve).to.equal('a^2+bx+c');

            expect(pump.control_methods.filter(c => c == 'no-speed-control').length).to.equal(0);
            expect(pump.control_methods.filter(c => c == 'pressure-control').length).to.equal(1);
            expect(pump.control_methods.filter(c => c == 'temperature-control').length).to.equal(1);
            expect(pump.control_methods.filter(c => c == 'external-control').length).to.equal(0);
            expect(pump.control_methods.filter(c => c == 'external-other-control').length).to.equal(1);
            expect(pump.control_methods.filter(c => c == 'manual-control').length).to.equal(0);

            expect(pump.head).to.not.equal(undefined);
            expect(pump.head.length).to.equal(4);
            assert_precision(pump.head[0], 17);
            assert_precision(pump.head[1], 23);
            assert_precision(pump.head[2], 33);
            assert_precision(pump.head[3], 40);

            assert_precision(pump.flow, 150);
            assert_precision(pump.least.pei, 1.3);
            assert_precision(pump.most.pei, 1.7);

            expect(pump.least.input_power).to.not.equal(undefined);
            expect(pump.least.input_power.length).to.equal(4);
            assert_precision(pump.least.input_power[0], 0.4);
            assert_precision(pump.least.input_power[1], 1.2);
            assert_precision(pump.least.input_power[2], 1.9);
            assert_precision(pump.least.input_power[3], 2.5);

            expect(pump.most.input_power).to.not.equal(undefined);
            expect(pump.most.input_power.length).to.equal(4);
            assert_precision(pump.most.input_power[0], 0.65);
            assert_precision(pump.most.input_power[1], 1.4);
            assert_precision(pump.most.input_power[2], 2.6);
            assert_precision(pump.most.input_power[3], 3.2);

        })


        it(`Import CP1 Pressure / Manual Control`, () => {
            const pump = result.ready[2];
            expect(pump.template_row).to.equal(7);
            expect(pump.participant).to.not.equal(undefined);
            expect(pump.participant.name).to.equal(participant.name);
            expect(pump.brand).to.equal('IQ')
            expect(pump.basic_model).to.equal('PRESSURE_Manual-CP2');
            expect(pump.manufacturer_model).to.equal('000-000-002');
            expect(pump.alternative_part_number).to.equal('44');
            expect(pump.type).to.equal('CP1');
            expect(pump.laboratory).to.not.equal(undefined);
            expect(pump.laboratory.name).to.equal('Houston');
            expect(pump.least.control_method).to.equal('pressure-control');
            expect(pump.most.control_method).to.equal('manual-control');

            expect(pump.control_methods.filter(c => c == 'no-speed-control').length).to.equal(0);
            expect(pump.control_methods.filter(c => c == 'pressure-control').length).to.equal(1);
            expect(pump.control_methods.filter(c => c == 'temperature-control').length).to.equal(0);
            expect(pump.control_methods.filter(c => c == 'external-control').length).to.equal(0);
            expect(pump.control_methods.filter(c => c == 'external-other-control').length).to.equal(0);
            expect(pump.control_methods.filter(c => c == 'manual-control').length).to.equal(1);

            expect(pump.head).to.not.equal(undefined);
            expect(pump.head.length).to.equal(4);
            assert_precision(pump.head[0], 17);
            assert_precision(pump.head[1], 23);
            assert_precision(pump.head[2], 33);
            assert_precision(pump.head[3], 40);

            assert_precision(pump.flow, 150);
            assert_precision(pump.least.pei, 1.3);
            assert_precision(pump.most.pei, 1.74);

            expect(pump.least.input_power).to.not.equal(undefined);
            expect(pump.least.input_power.length).to.equal(4);
            assert_precision(pump.least.input_power[0], 0.4);
            assert_precision(pump.least.input_power[1], 1.2);
            assert_precision(pump.least.input_power[2], 1.9);
            assert_precision(pump.least.input_power[3], 2.5);

            expect(pump.most.input_power).to.not.equal(undefined);
            expect(pump.most.input_power.length).to.equal(2);
            assert_precision(pump.most.input_power[0], 1.8);
            assert_precision(pump.most.input_power[1], 1.4);
        });

        it(`Import CP1 Manual / Pressure Control`, () => {
            const pump = result.ready[3];
            expect(pump.template_row).to.equal(8);
            expect(pump.participant).to.not.equal(undefined);
            expect(pump.participant.name).to.equal(participant.name);
            expect(pump.brand).to.equal('IQ')
            expect(pump.basic_model).to.equal('MANUAL_PRESSURE-CP2');
            expect(pump.manufacturer_model).to.equal('000-000-003');
            expect(pump.alternative_part_number).to.equal('45');
            expect(pump.type).to.equal('CP1');
            expect(pump.laboratory).to.not.equal(undefined);
            expect(pump.laboratory.name).to.equal('Houston');
            expect(pump.least.control_method).to.equal('manual-control');
            expect(pump.most.control_method).to.equal('pressure-control');

            expect(pump.control_methods.filter(c => c == 'no-speed-control').length).to.equal(0);
            expect(pump.control_methods.filter(c => c == 'pressure-control').length).to.equal(1);
            expect(pump.control_methods.filter(c => c == 'temperature-control').length).to.equal(0);
            expect(pump.control_methods.filter(c => c == 'external-control').length).to.equal(1);
            expect(pump.control_methods.filter(c => c == 'external-other-control').length).to.equal(0);
            expect(pump.control_methods.filter(c => c == 'manual-control').length).to.equal(1);

            expect(pump.head).to.not.equal(undefined);
            expect(pump.head.length).to.equal(4);
            assert_precision(pump.head[0], 17);
            assert_precision(pump.head[1], 23);
            assert_precision(pump.head[2], 33);
            assert_precision(pump.head[3], 40);

            assert_precision(pump.flow, 150);
            assert_precision(pump.least.pei, 1.15);
            assert_precision(pump.most.pei, 1.7);

            expect(pump.most.input_power).to.not.equal(undefined);
            expect(pump.most.input_power.length).to.equal(4);
            assert_precision(pump.most.input_power[0], 0.65);
            assert_precision(pump.most.input_power[1], 1.4);
            assert_precision(pump.most.input_power[2], 2.6);
            assert_precision(pump.most.input_power[3], 3.2);

            expect(pump.least.input_power).to.not.equal(undefined);
            expect(pump.least.input_power.length).to.equal(2);
            assert_precision(pump.least.input_power[0], 1.5);
            assert_precision(pump.least.input_power[1], 1.3);
        });

    });

    describe('Imports as metric', async () => {
        let result;
        before(async () => {
            result = await Circulator.load_file(participant, labs, UOM.METRIC, metric);
        });

        it(`Reads entire input sheet`, () => {
            expect(result).to.not.equal(undefined);
            expect(result.ready).to.not.equal(undefined);
            expect(result.failed).to.not.equal(undefined);
            expect(result.ready.length).to.equal(2);
            expect(result.failed.length).to.equal(0);
        });

        it(`Converts LC Input Power (4)`, () => {
            const pump = result.ready[0]; // pressure / manual
            assert_precision(pump.least.input_power[0], 0.4);
        });
        it(`Converts LC Input Power (2)`, () => {
            const pump = result.ready[1]; // manual / pressure
            assert_precision(pump.least.input_power[0], 1.5);
        });
        it(`Converts MC Input Power (4)`, () => {
            const pump = result.ready[1]; // manual / pressure
            assert_precision(pump.most.input_power[0], 0.65);
        });
        it(`Converts MC Input Power (2)`, () => {
            const pump = result.ready[0]; // pressure / manual
            assert_precision(pump.most.input_power[0], 1.8);
        });
        it(`Converts Head`, () => {
            const pump = result.ready[0]; // pressure / manual
            assert_precision(pump.head[0], 17);
        });
        it(`Converts Flow`, () => {
            const pump = result.ready[0]; // pressure / manual
            assert_precision(pump.flow, 150);
        });
    });

})

describe('Calculation Tests', function () {
    it('Calculates PER/REF CP3 No Controls', () => {
        const results = circulator.calculate_per_ref('cp3 ', [17, 23, 33, 40], 150);
        assert_precision(results.per_ref, 1.25742454091735);
        assert_precision(results.w2wEfficiency_ref, 67.79);
        assert_precision(results.output_power[3], 1.51668351870576);
    });

    it('CP3 No Controls PEI and Energy Rating', () => {
        const pump = {
            circulator: {
                type: 'cp3',
                input_power: [0.4, 1.2, 1.9, 2.5],
                head: [17, 23, 33, 40],
                flow: 150,
                pei_input: 1.2
            }
        }

        const results = circulator.noControl(pump);
        assert_precision(results.per_input, 1.5);
        assert_precision(results.pei_input, 1.2);
        assert_precision(results.pei, 1.19291452583364);
        assert_precision(results.pei_baseline, 1.74143002121381);
        assert_precision(results.energy_rating, 54.1430021213805);
    });

    it('CP2 Pressure / Temperature / External PEI and Energy Rating (least)', () => {
        const pump = {
            circulator: {
                type: 'cp3',
                input_power: [0.4, 1.2, 1.9, 2.5],
                head: [17, 23, 33, 40],
                flow: 150,
                pei_input: 1.3
            }
        }
        const results = circulator.commonControl(pump);
        assert_precision(results.energy_rating, 44.1430021213805);

    });
    it('CP2 Pressure / Temperature / External PEI and Energy Rating (most)', () => {
        const pump = {
            circulator: {
                type: 'cp3',
                input_power: [0.65, 1.4, 2.6, 3.2],
                head: [17, 23, 33, 40],
                flow: 150,
                pei_input: 1.7
            }
        }

        const results = circulator.commonControl(pump);
        assert_precision(results.energy_rating, 4.14300212138055);
    });

    it('CP1 External Input PEI and Energy Rating (least)', () => {
        const pump = {
            circulator: {
                type: 'cp3',
                input_power: [1.5, 1.3],
                head: [17, 23, 33, 40],
                flow: 150,
                pei_input: 1.13,
            }
        }

        const results = circulator.externalInput(pump);
        assert_precision(results.energy_rating, 61.1430021213806);
    });
    it('CP1 External Input PEI and Energy Rating (most)', () => {
        const pump = {
            circulator: {
                type: 'cp3',
                input_power: [1.8, 1.4],
                head: [17, 23, 33, 40],
                flow: 150,
                pei_input: 1.35
            }
        }

        const results = circulator.externalInput(pump);

        assert_precision(results.energy_rating, 39.1430021213805);
    });

    it('CP1 Manual Controls PEI and Energy Rating (least)', () => {
        const pump = {
            circulator: {
                type: 'cp3',
                input_power: [1.5, 1.3],
                head: [17, 23, 33, 40],
                flow: 150,
                pei_input: 1.14,
                most_pei_input: 1.35
            }
        }

        const results = circulator.manualControl(pump);
        assert_precision(results.energy_rating, 60.1430021213806);
    });
    it('CP1 Manual Controls PEI and Energy Rating (most)', () => {
        const pump = {
            circulator: {
                type: 'cp3',
                input_power: [1.8, 1.4],
                head: [17, 23, 33, 40],
                flow: 150,
                pei_input: 1.35
            }
        }

        const results = circulator.manualControl(pump);
        assert_precision(results.energy_rating, 39.1430021213805);
    });

});