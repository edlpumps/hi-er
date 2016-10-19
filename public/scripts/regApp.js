"use strict";


var app = angular.module('RegistrationApp',[]);



var RegistrationController = function($scope, $location) {
  var vm = this;
  vm.confirm1 = vm.confirm2 = vm.confirm3 = false;
}


app.controller('RegistrationController', RegistrationController);