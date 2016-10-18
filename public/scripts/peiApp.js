"use strict";

var app = angular.module('PEIApp', []);


var service = app.factory('service', function($http) {
   return {
     calculate : function (pump) {
       return $http.post('/pei/api/calculate', {pump:pump})
           .then(function(docs) {
                return docs.data;
           });
     },
   };
});

var PEIController = function($scope, $location, service) {
  var vm = this;
  vm.pump = {};
  
  vm.missing_options = function() {
      if (!vm.pump || !vm.pump.doe ) return true;
      if (!vm.pump.doe.value) return true;
      if (vm.pump.doe.value=='ST' && !vm.pump.bowl_diameter) return true;
      if (vm.show_motor_regulated() && (vm.pump.motor_regulated === undefined || vm.pump.motor_regulated === "")) {
          return true;
      }
      if (vm.show_motor_power() && !vm.pump.motor_power_rated) return true;
      if (vm.show_motor_efficiency() && !vm.pump.motor_efficiency) return true;
      return false;
  }

  vm.data_missing = function() {
      if (!vm.pump ) return true;
      if (!vm.pump.flow) return true;
      if (!vm.pump.flow.bep100) return true;
      if (!vm.pump.head) return true;
      if (!vm.pump.head.bep75) return true;
      if (!vm.pump.head.bep100) return true;
      if (!vm.pump.head.bep110) return true;
      if ( vm.pump_power_visible() ) {
          if (!vm.pump.pump_input_power) return true;
          if (!vm.pump.pump_input_power.bep75) return true;
          if (!vm.pump.pump_input_power.bep100) return true;
          if (!vm.pump.pump_input_power.bep110) return true;
          if (vm.bep120_visible() && !vm.pump.pump_input_power.bep120) return true;
      }
      if (vm.driver_input_visible()) {
          if (!vm.pump.driver_input_power) return true;
          if (!vm.pump.driver_input_power.bep75) return true;
          if (!vm.pump.driver_input_power.bep100) return true;
          if (!vm.pump.driver_input_power.bep110) return true;
      }
      if (vm.control_power_visible()) {
          if (!vm.pump.control_power_input) return true;
          if (!vm.pump.control_power_input.bep25) return true;
          if (!vm.pump.control_power_input.bep50) return true;
          if (!vm.pump.control_power_input.bep75) return true;
          if (!vm.pump.control_power_input.bep100) return true;
      }
      if (vm.measured_visible()){
          if (!vm.pump.measured_control_flow_input) return true;
          if (!vm.pump.measured_control_head_input) return true;
          if (!vm.pump.measured_control_power_input) return true;

          if (!vm.pump.measured_control_flow_input.bep25) return true;
          if (!vm.pump.measured_control_flow_input.bep50) return true;
          if (!vm.pump.measured_control_flow_input.bep75) return true;
          if (!vm.pump.measured_control_flow_input.bep100) return true;

          if (!vm.pump.measured_control_head_input.bep25) return true;
          if (!vm.pump.measured_control_head_input.bep50) return true;
          if (!vm.pump.measured_control_head_input.bep75) return true;
          if (!vm.pump.measured_control_head_input.bep100) return true;

          if (!vm.pump.measured_control_power_input.bep25) return true;
          if (!vm.pump.measured_control_power_input.bep50) return true;
          if (!vm.pump.measured_control_power_input.bep75) return true;
          if (!vm.pump.measured_control_power_input.bep100) return true;
      }
      if (!vm.pump.auto && !vm.pump.pei) return true;
  }

  vm.show_motor_regulated = function() {
      if ( !vm.pump || !vm.pump.configuration || !vm.pump.doe ) return false;
      return vm.pump.configuration.value != 'bare' && vm.pump.doe.value != 'ST';
  }

  vm.show_motor_power = function() {
      if (!vm.pump ) return false;
      if (!vm.pump.configuration) return false;
      return vm.pump.configuration.value != 'bare' || !vm.pump.auto;
  }

  vm.show_motor_efficiency = function() {
      if (!vm.pump || !vm.pump.doe ) return false;
      return vm.pump.doe.value != 'ST' && vm.show_motor_regulated() && (vm.pump.motor_regulated =='true' || vm.pump.motor_regulated === true);
  }

  vm.configurations = [
       { value: "bare", label: "Bare Pump"}, 
       { value: "pump_motor", label: "Pump + Motor"}, 
       { value: "pump_motor_cc", label: "Pump + Motor w/ Continuous Controls"}, 
       { value: "pump_motor_nc", label: "Pump + Motor w/ Non-continuous Controls"}
  ];
 
  vm.doe_opts = [
      {value: "ESCC", label:"ESCC"},
      {value: "ESFM", label:"ESFM"},
      {value: "IL", label:"IL"},
      {value: "RSV", label:"RSV"},
      {value: "ST", label:"ST"}
  ];


  vm.powers = [250, 200, 150, 125, 100, 75, 60, 50, 40, 30, 25, 20, 15, 10, 7.5, 5, 3, 2, 1.5, 1];


  vm.go2Configuration = function() {
      vm.step = "configuration";
  }

  vm.motor_method_required = function() {
      if ( !vm.pump.configuration) return false;
      return vm.pump.configuration.value != "bare" && vm.pump.configuration.value != "pump_motor_nc";
  }

  vm.go2MotorMethod = function(back) {
      if ( !vm.motor_method_required() ) {
          if ( back ) vm.go2Configuration();
          else vm.go2Options();
      }
      else {
        vm.step = "motor_method";
      }
  }

  vm.section_label = function() {
      if (!vm.pump.section) return undefined;
      switch(vm.pump.section) {
          case "3":
            return "Section III";
          case "4":
            return "Section IV";
          case "5":
            return "Section V";
          case "6a":
            return "Section VI-a";
          case "6b":
            return "Section VI-b";
          case "7":
            return "Section VII";
          default:
            return undefined;
      }
  }

  vm.go2Options = function() {
      let pass = false;
      if ( vm.pump.configuration.value == "bare") {
          vm.pump.section = "3";
          pass = true;
      }
      else if (vm.pump.configuration.value == "pump_motor_nc") {
          vm.pump.section = "6b";
          pass = true;
      } 
      else if (vm.pump.configuration.value == "pump_motor") {
          if (vm.pump.motor_method == "tested") vm.pump.section="4";
          else vm.pump.section = "5"
          pass = vm.pump.motor_method;
      }
      else if (vm.pump.configuration.value == "pump_motor_cc") {
          if (vm.pump.motor_method == "tested") vm.pump.section="6a";
          else vm.pump.section = "7";
          pass = vm.pump.motor_method;;
      }
      else {
          vm.go2Configuration();
      }

      if (pass) vm.step = "options";
  }

  vm.go2Data = function() {
      vm.step = "data";
  }

  
  vm.measured_visible = function() {
      if (!vm.pump) return false;
      if (vm.pump.section =='6a' || vm.pump.section=='6b') {
          return vm.mode == "calculator";
      }
  }
  vm.driver_input_visible = function() {
      if (!vm.pump) return false;
      if ( vm.mode == "calculator"){
          return vm.pump.section=='4';
      }
      else {
          return vm.pump.section == '3' || vm.pump.section == '4' || vm.pump.section == '5';
      }
  }
  vm.control_power_visible = function() {
      if (!vm.pump) return false;
      if ( vm.mode == "manual" ) {
          return vm.pump.section =='6a' || vm.pump.section=='6b' || vm.pump.section=='7';
      }
      else return false;// never visible in calculator mode
  }

  vm.pump_power_visible = function() {
      if (!vm.pump) return false;
      if ( vm.mode == "calculator" ) {
          return vm.pump.section =='3' || vm.pump.section=='5' || vm.pump.section=='7';
      }
      else return false;// never visible in manual mode
  }
  vm.bep120_visible = function() {
      if (!vm.pump) return false;
      return vm.pump_power_visible() && vm.pump.section =='3';
  }

  vm.calculatorText = function() {
      if ( vm.mode == "calculator") {
          if ( vm.standalone) {
              return "PEI & Energy Ratings"
          }
          else {
              return "PEI & Energy Ratings";
          }
      }
      else {
          if ( vm.standalone) {
              return "ERROR - Cannot use manual entry mode in standalone"
          }
          else {
              return "Energy Ratings";
          }
      }
  }



  vm.setup = function(er, pump, mode) {
      if ( pump ) {
          vm.pump = pump;
          vm.pump.auto = mode == "calculator";
          vm.pump.configuration = vm.configurations.filter(function(c) { return c.value == pump.configuration})[0];
          vm.pump.diameter = parseFloat(pump.diameter);

          vm.go2MotorMethod();
          if ( vm.pump.motor_regulated === undefined ) vm.pump.motor_regulated = true;
          if (vm.participant) {
              vm.pump.participant = vm.participant.name;
          }
      }
      else {
          vm.pump.motor_regulated = true;
          vm.pump.auto = true;
      }

      vm.pump.load120 = true; 
      vm.pump.speed = 3600;
      vm.pump.doe = {value:"RSV"};
      vm.pump.stages = 9
      vm.pump.flow = {
        "bep75": 262.372881355932,
        "bep100": 349.830508474576,
        "bep110": 384.813559322034
      }
      vm.pump.head = {
        "bep75":498.891123240448, 
        "bep100":424.429761562769,
        "bep110":383.476012640046
      }
      vm.pump.driver_input_power ={
        "bep75":52.812, 
        "bep100":55.203,
        "bep110":55.620
      }
      vm.pump.pump_input_power ={
        "bep75":49.2013, 
        "bep100":51.41435215,
        "bep110":51.8084,
        "bep120":53.00
      }

      vm.standalone = !er;
      vm.mode = mode;
      vm.pump.pei_method = mode;

  }


  vm.go2Results = function() {
     vm.calc_errors = null;
     service.calculate(vm.pump).then(function(result) {
            vm.step = "results";
            vm.pump.pei = result.pei;
            vm.pump.energy_rating = result.energy_rating;
            vm.pump.energy_savings = result.energy_savings;
            vm.pump.pei_baseline = result.pei_baseline;
            vm.pump.results = JSON.stringify(result);
            if (!result.success) {
                vm.calc_errors = result.reasons;
            }
     }).catch(function(error) {
            if (error.status == 403) {
                window.location="/";
            }
            else {
                console.log(error);
            }
     })
  }

  vm.submitListing = function() {
      new_pump_pei.submit();
  }
  
  vm.go2Configuration();
}



app.controller('PEIController', PEIController);