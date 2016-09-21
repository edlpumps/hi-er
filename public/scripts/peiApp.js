"use strict";

var app = angular.module('PEIApp', []);


var service = app.factory('service', function($http) {
   return {
     
   };
});

var PEIController = function($scope, $location, service) {
  var vm = this;
  vm.pump = {};
  

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


  vm.go2Configuration = function() {
      vm.step = "configuration";

      console.log(vm.pump);
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

      console.log(vm.pump);
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
      console.log(vm.pump.configuration.value);
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
      console.log("Section selected -> " + vm.pump.section);
      console.log("Going to options -> " + pass);

      if (pass) vm.step = "options";

      console.log(vm.pump);
  }

  vm.go2Data = function() {
      vm.step = "data";
      console.log(vm.pump);
  }

  vm.go2Results = function() {
      vm.step = "results";
      console.log(vm.pump);
  }


  vm.setup = function(pump) {
      if ( pump ) {
          vm.pump = pump;
          vm.pump.configuration = vm.configurations.filter(function(c) { return c.value == pump.configuration})[0];
          vm.pump.diameter = parseFloat(pump.diameter);
          vm.go2MotorMethod();
          console.log("Initialized with a pump");
          console.log(vm.pump);
          if (vm.participant) {
              vm.pump.participant = vm.participant.name;
              console.log(vm.participant);
          }
      }
      else {
          console.log("Initialized without a pump");
      }
  }

  vm.submitListing = function() {
      
      // DEMO PURPOSES
      console.log("DEMONSTRATION VALUES FOR PEI AND ENERGY RATINGS")
      var e = angular.element( document.querySelector( '#pump_pei' ) );
      e.val(42);
      e = angular.element( document.querySelector( '#pump_energy_rating' ) );
      e.val(109);

      e = angular.element( document.querySelector( '#pump_energy_savings' ) );
      e.val(150);

      e = angular.element( document.querySelector( '#pump_id' ) );
      e.val(vm.pump._id);

      e = angular.element( document.querySelector( '#pump_section' ) );
      e.val(vm.pump.section);
      


      new_pump_pei.submit();
  }
  
  vm.go2Configuration();
}



app.controller('PEIController', PEIController);