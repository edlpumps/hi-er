const assert = require("chai").assert;
const expect = require("chai").expect;
const Circulator = require('../controllers/circulator');


describe('Circulator model conflicts', function () {
    let results = null;
    const existing = [{
            basic_model: "A",
            manufacturer_model: "1",
            listed: true
        },
        {
            basic_model: "A",
            manufacturer_model: "2",
            listed: false
        },
        {
            basic_model: "B",
            manufacturer_model: "1",
            listed: true
        },
        {
            basic_model: "B",
            manufacturer_model: "2",
            listed: true
        },
        {
            basic_model: "B",
            manufacturer_model: "3",
            listed: true
        },
    ];
    const importing = [{
            basic_model: "A",
            manufacturer_model: "1"
        }, // Conflicts with existing on manufacturer
        {
            basic_model: "A",
            manufacturer_model: "2"
        }, // Conflicts with existing on manufacturer, but it is not active - so OK
        {
            basic_model: "C",
            manufacturer_model: "2"
        }, // Should be OK - different basic model
        {
            basic_model: "B",
            manufacturer_model: "4"
        }, // Should be OK - different manufactuer model
        {
            basic_model: "C",
            manufacturer_model: "2",
            least: {
                energy_rating: 50
            },
        }, // Should fail because it is part of an import with a conflict.
        { // Should fail, the least consumptive should always have a higher energy rating.
            basic_model: "X",
            manufacturer_model: "1",
            least: {
                energy_rating: 50
            },
            most: {
                energy_rating: 90
            }
        },
    ]
    before(() => {
        results = Circulator.check_import(importing, existing);
    })
    it('Returns correct number of results', async () => {
        expect(results.length).to.equal(6);
    });
    it('Conflicts with existing on manufacturer', async () => {
        expect(results[0].failure).to.equal("Manufacturer number or energy rating conflicts with another active pump under the same basic model number");
    });
    it('Allows conflict with existing pump if the existing pump is not active', async () => {
        expect(results[1].failure).to.equal(undefined);
    });
    it('Allows import when no conflict', async () => {
        expect(results[2].failure).to.equal(undefined);
    });
    it('Allows import when different basic model number', async () => {
        expect(results[3].failure).to.equal(undefined);
    });
    it('Conflicts when importing pumps contain conflict', async () => {
        expect(results[4].failure).to.equal("Manufactuer number or energy rating conflicts with a pump already being imported");
    });
    it('Least consumptive must have higher energy rating', async () => {
        expect(results[5].failure).to.equal("Least consumptive measure must have higher energy rating than most consumptive.");
    });

});