"use strict";


var app = angular.module('RegistrationApp',[]);

app.config(['$httpProvider', function($httpProvider) {
    $httpProvider.defaults.cache = false;
    if (!$httpProvider.defaults.headers.get) {
      $httpProvider.defaults.headers.get = {};
    }
    // disable IE ajax request caching
    $httpProvider.defaults.headers.get['If-Modified-Since'] = '0';
}]);

var RegistrationController = function($scope, $location) {
  var vm = this;
  vm.confirm1 = vm.confirm2 = vm.confirm3 = false;
}


app.controller('RegistrationController', RegistrationController);