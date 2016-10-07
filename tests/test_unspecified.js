"use strict";

var assert = require("chai").assert;
var expect = require("chai").expect;
var calculator = require('../calculator');

describe('Underspecified pumps', function() {
    var pumpA;
    beforeEach(function() {
      pumpA = {
        doe: "RSV",
        speed : 3600,
        motor_power_rated : 60,
        flow : {
          bep75: 262.372881355932,
          bep100: 349.830508474576,
          bep110: 384.813559322034
        }, 
        head : {
          bep75:498.891123240448, 
          bep100:424.429761562769,
          bep110:383.476012640046
        },
        driver_input_power :{
          bep75:52.812, 
          bep100:55.203,
          bep110:55.620
        },
        stages : 9, 
        pei : 0.97
      };
      
    }); 
    it('should return error w/ missing pump', function() {
      let result = calculator.manual.section3();
      assert.isNotTrue(result.success, "result was true");;
    });
    it('should return error w/ missing speed', function() {
      delete pumpA.speed;
      let result = calculator.manual.section3(pumpA);
      assert.isNotTrue(result.success, "result was true");;
    });
    it('should return error w/ missing doe', function() {
      delete pumpA.doe;
      let result = calculator.manual.section3(pumpA);
      assert.isNotTrue(result.success, "result was true");;
    });
    it('should return error w/ missing rated motor power', function() {
      delete pumpA.motor_power_rated;
      let result = calculator.manual.section3(pumpA);
      assert.isNotTrue(result.success, "result was true");;
    });
    it('should return error w/ missing flow', function() {
      delete pumpA.flow;
      let result = calculator.manual.section3(pumpA);
      assert.isNotTrue(result.success, "result was true");;
    });
    it('should return error w/ missing head', function() {
      delete pumpA.head;
      let result = calculator.manual.section3(pumpA);
      assert.isNotTrue(result.success, "result was true");;
    });
    it('should return error w/ missing flow 75 BEP', function() {
      delete pumpA.flow.bep75;
      let result = calculator.manual.section3(pumpA);
      assert.isNotTrue(result.success, "result was true");;
    });
    it('should return error w/ missing head 75 BEP', function() {
      delete pumpA.head.bep75;
      let result = calculator.manual.section3(pumpA);
      assert.isNotTrue(result.success, "result was true");;
    });
    it('should return error w/ missing flow 100 BEP', function() {
      delete pumpA.flow.bep100;
      let result = calculator.manual.section3(pumpA);
      assert.isNotTrue(result.success, "result was true");;
    });
    it('should return error w/ missing head 100 BEP', function() {
      delete pumpA.head.bep100
      let result = calculator.manual.section3(pumpA);
      assert.isNotTrue(result.success, "result was true");;
    });
    it('should return error w/ missing flow 110 BEP', function() {
      delete pumpA.flow.bep110;
      let result = calculator.manual.section3(pumpA);
      assert.isNotTrue(result.success, "result was true");;
    });
    it('should return error w/ missing head 110 BEP', function() {
      delete pumpA.head.bep110;
      let result = calculator.manual.section3(pumpA);
      assert.isNotTrue(result.success, "result was true");;
    });

    it('should return error w/ missing stages', function() {
      delete pumpA.stages;
      let result = calculator.manual.section3(pumpA);
      assert.isNotTrue(result.success, "result was true");;
    });

    it('should return error w/ missing pei', function() {
      delete pumpA.pei;
      let result = calculator.manual.section3(pumpA);
      assert.isNotTrue(result.success, "result was true");;
    });

    it('should return error w/ missing driver input power', function() {
      delete pumpA.driver_input_power;
      let result = calculator.manual.section3(pumpA);
      assert.isNotTrue(result.success, "result was true");;
    });
    it('should return error w/ missing driver input power @ 75% BEP', function() {
      delete pumpA.driver_input_power.bep75;
      let result = calculator.manual.section3(pumpA);
      assert.isNotTrue(result.success, "result was true");;
    });
    it('should return error w/ missing driver input power @ 100% BEP', function() {
      delete pumpA.driver_input_power.bep100;
      let result = calculator.manual.section3(pumpA);
      assert.isNotTrue(result.success, "result was true");;
    });
    it('should return error w/ missing driver input power @ 110% BEP', function() {
      delete pumpA.driver_input_power.bep110;
      let result = calculator.manual.section3(pumpA);
      assert.isNotTrue(result.success, "result was true");;
    });
  })
