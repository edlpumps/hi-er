var app = angular.module('PEIApp', []);


var service = app.factory('service', function($http) {
   return {
     
   };
});

const PEIController = function($scope, $location, service) {
  var vm = this;

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
  }

  vm.motor_method_required = function() {
      if ( !vm.configuration) return false;
      return vm.configuration.value != "bare" && vm.configuration.value != "pump_motor_nc";
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
      if (!vm.section) return undefined;
      switch(vm.section) {
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
      console.log(vm.configuration.value);
      if ( vm.configuration.value == "bare") {
          vm.section = "3";
          pass = true;
      }
      else if (vm.configuration.value == "pump_motor_nc") {
          vm.section = "6b";
          pass = true;
      } 
      else if (vm.configuration.value == "pump_motor") {
          if (vm.motor_method == "tested") vm.section="4";
          else vm.section = "5"
          pass = vm.motor_method;
      }
      else if (vm.configuration.value == "pump_motor_cc") {
          if (vm.motor_method == "tested") vm.section="6a";
          else vm.section = "7";
          pass = vm.motor_method;;
      }
      else {
          vm.go2Configuration();
      }
      console.log("Section selected -> " + vm.section);
      console.log("Going to options -> " + pass);

      if (pass) vm.step = "options";;
  }

  vm.go2Data = function() {
      vm.step = "data";
  }

  vm.go2Results = function() {
      vm.step = "results";
  }

  vm.go2Configuration();
}



app.controller('PEIController', PEIController);