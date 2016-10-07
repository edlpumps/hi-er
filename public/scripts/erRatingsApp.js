"use strict";

var configurations = [
       { value: "bare", label: "Bare Pump"}, 
       { value: "pump_motor", label: "Pump + Motor"}, 
       { value: "pump_motor_cc", label: "Pump + Motor w/ Continuous Controls"}, 
       { value: "pump_motor_nc", label: "Pump + Motor w/ Non-continuous Controls"}
  ];

var app = angular.module('ERRatingsApp', ['rzModule']);


var service = app.factory('service', function($http) {
   return {
     search : function (params) {
        return $http.post('/ratings/search', {search:params})
            .success(function(docs) { return docs.data; })
            .error(function(data, status) {
                return data;
            });
     }

   };
});

var ERRatingsController = function($scope, $location, service) {
  var vm = this;
  

  vm.erSlider = {
    options: {
      floor: 0,
      ceil: 100,
      step: 1
    }
  };
  vm.getPumps = function() {
      console.log(vm.search);
      service.search(vm.search).then(function(results) {
        vm.pumps = results.data.pumps;
        vm.pumps_error = false;
        console.log(vm.pumps);
      }).catch(function(error) {
        vm.pumps_error = true;
        console.error(error);
      });
  }

  vm.load_search = function() {
      if (!vm.search.fresh) {
          vm.getPumps();
      }
  }

  vm.getConfigLabel = function(config) {
    var retval = configurations.filter(function(c){
      return config == c.value;
    }).map(function (c){
      return c.label;
    })
    return retval.length ? retval[0] : "Unknown";
  }
  
}


app.controller('ERRatingsController', ERRatingsController);