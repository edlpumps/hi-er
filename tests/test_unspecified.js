"use strict";

var assert = require("chai").assert;
var expect = require("chai").expect;
var calculator = require('../calculator');

describe('Underspecified pumps - section 3 - manual', function() {
    var pumpA;
    beforeEach(function() {
      pumpA = {
        doe: "RSV",
        speed : 3600,
        section: "3",
        diameter:10,
        motor_power_rated : 60,
        bowl_diameter : 20,
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
      let result = calculator.manual()
      assert.isNotTrue(result.success, "result was true");;
    });
    it('should return error w/ missing speed', function() {
      delete pumpA.speed;
      let result = calculator.manual(pumpA)
      assert.isNotTrue(result.success, "result was true");;
    });
    it('should return error w/ missing doe', function() {
      delete pumpA.doe;
      let result = calculator.manual(pumpA)
      assert.isNotTrue(result.success, "result was true");;
    });
    it('should return error w/ missing rated motor power', function() {
      delete pumpA.motor_power_rated;
      let result = calculator.manual(pumpA)
      assert.isNotTrue(result.success, "result was true");;
    });
    it('should return error w/ missing flow', function() {
      delete pumpA.flow;
      let result = calculator.manual(pumpA)
      assert.isNotTrue(result.success, "result was true");;
    });
    it('should return error w/ missing head', function() {
      delete pumpA.head;
      let result = calculator.manual(pumpA)
      assert.isNotTrue(result.success, "result was true");;
    });
    it('should return error w/ missing flow 75 BEP', function() {
      delete pumpA.flow.bep75;
      let result = calculator.manual(pumpA)
      assert.isNotTrue(result.success, "result was true");;
    });
    it('should return error w/ missing head 75 BEP', function() {
      delete pumpA.head.bep75;
      let result = calculator.manual(pumpA)
      assert.isNotTrue(result.success, "result was true");;
    });
    it('should return error w/ missing flow 100 BEP', function() {
      delete pumpA.flow.bep100;
      let result = calculator.manual(pumpA)
      assert.isNotTrue(result.success, "result was true");;
    });
    it('should return error w/ missing head 100 BEP', function() {
      delete pumpA.head.bep100
      let result = calculator.manual(pumpA)
      assert.isNotTrue(result.success, "result was true");;
    });
    it('should return error w/ missing flow 110 BEP', function() {
      delete pumpA.flow.bep110;
      let result = calculator.manual(pumpA)
      assert.isNotTrue(result.success, "result was true");;
    });
    it('should return error w/ missing head 110 BEP', function() {
      delete pumpA.head.bep110;
      let result = calculator.manual(pumpA)
      assert.isNotTrue(result.success, "result was true");;
    });
    it('should return error w/ missing impeller diameter', function() {
      delete pumpA.diameter;
      let result = calculator.manual(pumpA)
      assert.isNotTrue(result.success, "result was true");;
    });

    it('should return error w/ missing bowl diameter', function() {
      delete pumpA.bowl_diameter;
      pumpA.doe = "ST";
      let result = calculator.manual(pumpA)
      assert.isNotTrue(result.success, "result was true");;
    });
    it('should return no error w/ missing bowl diameter for non-ST', function() {
      delete pumpA.bowl_diameter;
      let result = calculator.manual(pumpA)
      assert.isTrue(result.success, "result was true");;
    });
    
    it('should return error w/ missing stages', function() {
      delete pumpA.stages;
      let result = calculator.manual(pumpA)
      assert.isNotTrue(result.success, "result was true");;
    });

    it('should return error w/ missing pei', function() {
      delete pumpA.pei;
      let result = calculator.manual(pumpA)
      assert.isNotTrue(result.success, "result was true");;
    });

    it('should return error w/ missing driver input power', function() {
      delete pumpA.driver_input_power;
      let result = calculator.manual(pumpA)
      assert.isNotTrue(result.success, "result was true");;
    });
    it('should return error w/ missing driver input power @ 75% BEP', function() {
      delete pumpA.driver_input_power.bep75;
      let result = calculator.manual(pumpA)
      assert.isNotTrue(result.success, "result was true");;
    });
    it('should return error w/ missing driver input power @ 100% BEP', function() {
      delete pumpA.driver_input_power.bep100;
      let result = calculator.manual(pumpA)
      assert.isNotTrue(result.success, "result was true");;
    });
    it('should return error w/ missing driver input power @ 110% BEP', function() {
      delete pumpA.driver_input_power.bep110;
      let result = calculator.manual(pumpA)
      assert.isNotTrue(result.success, "result was true");;
    });
  })


  describe('Underspecified pumps - section 3 - auto', function() {
    var pumpA;
    beforeEach(function() {
      pumpA = {
        doe: "RSV",
        speed : 3600,
        section: "3",
        diameter:10,
        bowl_diameter : 20,
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
        pump_input_power :{
          bep75:52.812, 
          bep100:55.203,
          bep110:55.620,
          bep120:55.90
        },
        stages : 9, 
        pei : 0.97
      };
      
    }); 
    it('should return error w/ missing pump', function() {
      let result = calculator.auto()
      assert.isNotTrue(result.success, "result was true");;
    });
    it('should return error w/ missing pump_input_power', function() {
      delete pumpA.pump_input_power;
      let result = calculator.auto(pumpA)
      assert.isNotTrue(result.success, "result was true");
    });
    it('should return error w/ missing pump input power @ 75% BEP', function() {
      delete pumpA.pump_input_power.bep75;
      let result = calculator.auto(pumpA)
      assert.isNotTrue(result.success, "result was true");;
    });
    it('should return error w/ missing pump input power @ 100% BEP', function() {
      delete pumpA.pump_input_power.bep100;
      let result = calculator.auto(pumpA)
      assert.isNotTrue(result.success, "result was true");;
    });
    it('should return error w/ missing pump input power @ 110% BEP', function() {
      delete pumpA.pump_input_power.bep110;
      let result = calculator.auto(pumpA)
      assert.isNotTrue(result.success, "result was true");;
    });
    it('should return error w/ missing pump input power @ 120% BEP', function() {
      delete pumpA.pump_input_power.bep120;
      let result = calculator.auto(pumpA)
      assert.isNotTrue(result.success, "result was true");;
    });
    
  });
