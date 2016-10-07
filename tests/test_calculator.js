"use strict";

var assert = require("chai").assert;
var expect = require("chai").expect;
var calculator = require('../calculator');

 
describe('Section 3 - Manual tests', function() {
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

 

  
  describe('Energy Rating calculations', function() {
    var result;
    beforeEach(function() {
      result = calculator.manual.section3(pumpA);
    })
    it('should calculate PER_cl (using 0.3333)', function() {
      expect(result.per_cl).to.be.closeTo(54.540, 0.001);
    });

    it('should calculate PER_std', function() {
      expect(result.per_std).to.be.closeTo(56.226, 0.001);
    });

    it('should calculate specific speed', function() {
      expect(result.ns).to.be.closeTo(3741.61, 0.01, " value is " + result.ns);
    });

    it('should lookup standard c-value', function() {
      expect(result.standard_c_value).to.be.closeTo(133.2, 0.1, " value is " + result.standard_c_value);
    });

    it('should lookup default motor efficiency', function() {
      expect(result.default_motor_efficiency).to.be.closeTo(93.6, 0.1, " value is " + result.default_motor_efficiency);
    });

    it('should calculate standard full load motor losses', function() {
      expect(result.full_load_motor_losses).to.be.closeTo(4.10, 0.1, " value is " + result.full_load_motor_losses);
    });
    
    it('should calculate standard pump efficiency', function() {
      expect(result.std_pump_efficiency).to.be.closeTo(70.19, 0.01, " value is " + result.std_pump_efficiency);
    });

    it('should calculate hyd_power_bep75', function() {
      expect(result.hyd_power_bep75).to.be.closeTo(33.09, 0.01, " value is " + result.hyd_power_bep75);
    });

    it('should calculate hyd_power_bep100', function() {
      expect(result.hyd_power_bep100).to.be.closeTo(37.53, 0.01, " value is " + result.hyd_power_bep100);
    });

    it('should calculate hyd_power_bep110', function() {
      expect(result.hyd_power_bep110).to.be.closeTo(37.30, 0.01, " value is " + result.hyd_power_bep110);
    });

    it('should calculate std_pump_power_input_bep100', function() {
      expect(result.std_pump_power_input_bep100).to.be.closeTo(53.47, 0.01, " value is " + result.std_pump_power_input_bep100);
    });

    it('should calculate std_pump_power_input_bep75', function() {
      expect(result.std_pump_power_input_bep75).to.be.closeTo(49.78, 0.01, " value is " + result.std_pump_power_input_bep75);
    });

    it('should calculate std_pump_power_input_bep110', function() {
      expect(result.std_pump_power_input_bep110).to.be.closeTo(53.95, 0.01, " value is " + result.std_pump_power_input_bep110);
    });


    it('should calculate std_motor_power_ratio_bep100', function() {
      expect(result.std_motor_power_ratio_bep100).to.be.closeTo(0.89, 0.01, " value is " + result.std_motor_power_ratio_bep100);
    });

    it('should calculate std_motor_power_ratio_bep75', function() {
      expect(result.std_motor_power_ratio_bep75).to.be.closeTo(0.83, 0.01, " value is " + result.std_motor_power_ratio_bep75);
    });

    it('should calculate std_motor_power_ratio_bep110', function() {
      expect(result.std_motor_power_ratio_bep110).to.be.closeTo(0.90, 0.01, " value is " + result.std_motor_power_ratio_bep110);
    });

    it('should calculate std_part_load_loss_factor_bep75', function() {
      expect(result.std_part_load_loss_factor_bep75).to.be.closeTo(0.88, 0.01, " value is " + result.std_part_load_loss_factor_bep75);
    });
    it('should calculate std_part_load_loss_factor_bep100', function() {
      expect(result.std_part_load_loss_factor_bep100).to.be.closeTo(0.92, 0.01, " value is " + result.std_part_load_loss_factor_bep100);
    });
    it('should calculate std_part_load_loss_factor_bep110', function() {
      expect(result.std_part_load_loss_factor_bep110).to.be.closeTo(0.93, 0.01, " value is " + result.std_part_load_loss_factor_bep110);
    });

    it('should calculate std_part_load_loss_bep75', function() {
      expect(result.std_part_load_loss_bep75).to.be.closeTo(3.61, 0.01, " value is " + result.std_part_load_loss_bep75);
    });
    it('should calculate std_part_load_loss_bep100', function() {
      expect(result.std_part_load_loss_bep100).to.be.closeTo(3.79, 0.01, " value is " + result.std_part_load_loss_bep100);
    });
    it('should calculate std_part_load_loss_bep110', function() {
      expect(result.std_part_load_loss_bep110).to.be.closeTo(3.81, 0.01, " value is " + result.std_part_load_loss_bep110);
    });

    it('should calculate std_driver_power_input_bep75', function() {
      expect(result.std_driver_power_input_bep75).to.be.closeTo(53.39, 0.01, " value is " + result.std_driver_power_input_bep75);
    });
    it('should calculate std_driver_power_input_bep100', function() {
      expect(result.std_driver_power_input_bep100).to.be.closeTo(57.26, 0.01, " value is " + result.std_driver_power_input_bep100);
    });
    it('should calculate std_driver_power_input_bep110', function() {
      expect(result.std_driver_power_input_bep110).to.be.closeTo(57.76, 0.01, " value is " + result.std_driver_power_input_bep110);
    });


    it('should calculate PER standard (using 0.3333)', function() {
      expect(result.per_std_calculated).to.be.closeTo(56.13, 0.01, " value is " + result.per_std_calculated);
    });



    it('should lookup baseline c-value', function() {
      expect(result.baseline_c_value).to.be.closeTo(133.2, 0.1, " value is " + result.baseline_c_value);
    });



    it('should lookup baseline pump efficiency', function() {
      expect(result.baseline_pump_efficiency).to.be.closeTo(70.19, 0.01, " value is " + result.baseline_pump_efficiency);
    });



    it('should calculate baseline_pump_power_input_bep100', function() {
      expect(result.baseline_pump_power_input_bep100).to.be.closeTo(53.47, 0.01, " value is " + result.baseline_pump_power_input_bep100);
    });

    it('should calculate baseline_pump_power_input_bep75', function() {
      expect(result.baseline_pump_power_input_bep75).to.be.closeTo(49.78, 0.01, " value is " + result.baseline_pump_power_input_bep75);
    });

    it('should calculate baseline_pump_power_input_bep110', function() {
      expect(result.baseline_pump_power_input_bep110).to.be.closeTo(53.95, 0.01, " value is " + result.baseline_pump_power_input_bep110);
    });
    


    it('should calculate baseline_motor_power_ratio_bep100', function() {
      expect(result.baseline_motor_power_ratio_bep100).to.be.closeTo(0.89, 0.01, " value is " + result.baseline_motor_power_ratio_bep100);
    });

    it('should calculate baseline_motor_power_ratio_bep75', function() {
      expect(result.baseline_motor_power_ratio_bep75).to.be.closeTo(0.83, 0.01, " value is " + result.baseline_motor_power_ratio_bep75);
    });

    it('should calculate baseline_motor_power_ratio_bep110', function() {
      expect(result.baseline_motor_power_ratio_bep110).to.be.closeTo(0.90, 0.01, " value is " + result.baseline_motor_power_ratio_bep110);
    });



    it('should calculate baseline part load loss factor @ 100% BEP', function() {
      expect(result.baseline_part_load_loss_factor_bep100).to.be.closeTo(0.92, 0.01, " value is " + result.baseline_part_load_loss_factor_bep100);
    });

    it('should calculate baseline part load loss factor @ 75% BEP', function() {
      expect(result.baseline_part_load_loss_factor_bep75).to.be.closeTo(0.88, 0.01, " value is " + result.baseline_part_load_loss_factor_bep75);
    });

    it('should calculate baseline part load loss factor @ 110% BEP', function() {
      expect(result.baseline_part_load_loss_factor_bep110).to.be.closeTo(0.9390, 0.01, " value is " + result.baseline_part_load_loss_factor_bep110);
    });



    it('should calculate baseline_part_load_loss_bep75', function() {
      expect(result.baseline_part_load_loss_bep75).to.be.closeTo(3.61, 0.01, " value is " + result.baseline_part_load_loss_bep75);
    });
    it('should calculate baseline_part_load_loss_bep100', function() {
      expect(result.baseline_part_load_loss_bep100).to.be.closeTo(3.79, 0.01, " value is " + result.baseline_part_load_loss_bep100);
    });
    it('should calculate baseline_part_load_loss_bep110', function() {
      expect(result.baseline_part_load_loss_bep110).to.be.closeTo(3.81, 0.01, " value is " + result.baseline_part_load_loss_bep110);
    });


    it('should calculate baseline_driver_power_input_bep75', function() {
      expect(result.baseline_driver_power_input_bep75).to.be.closeTo(53.39, 0.01, " value is " + result.baseline_driver_power_input_bep75);
    });
    it('should calculate std_driver_power_input_bep100', function() {
      expect(result.baseline_driver_power_input_bep100).to.be.closeTo(57.26, 0.01, " value is " + result.baseline_driver_power_input_bep100);
    });
    it('should calculate std_driver_power_input_bep110', function() {
      expect(result.baseline_driver_power_input_bep110).to.be.closeTo(57.76, 0.01, " value is " + result.baseline_driver_power_input_bep110);
    });


    it('should calculate PER baseline (using 0.3333)', function() {
      expect(result.per_baseline_calculated).to.be.closeTo(56.13, 0.01, " value is " + result.per_baseline_calculated);
    });

    
    it('should calculate PEI Baseline', function() {
      expect(result.pei_baseline).to.be.closeTo(1.00, 0.01, " value is " + result.pei_baseline);
    });


    it('should calculate ER', function() {
      expect(result.er).to.be.closeTo(3, 0.01, " value is " + result.er);
    });



  });

  describe('Underspecified pumps', function() {
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
})