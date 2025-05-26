"use strict";

var configurations = [{
    value: "bare",
    label: "Bare Pump"
  },
  {
    value: "pump_motor",
    label: "Pump + Motor"
  },
  {
    value: "pump_motor_cc",
    label: "Pump + Motor w/ Continuous Controls"
  },
  {
    value: "pump_motor_nc",
    label: "Pump + Motor w/ Non-continuous Controls"
  }
];

var app = angular.module('ERRatingsApp', ['rzModule']);
app.config(['$httpProvider', function ($httpProvider) {
  $httpProvider.defaults.cache = false;
  if (!$httpProvider.defaults.headers.get) {
    $httpProvider.defaults.headers.get = {};
  }
  // disable IE ajax request caching
  $httpProvider.defaults.headers.get['If-Modified-Since'] = '0';
}]);

var service = app.factory('service', function ($http) {
  return {
    search: function (params) {
      return $http.post('/ratings/search', {
          search: params
        })
        .success(function (docs) {
          return docs.data;
        })
        .error(function (data, status) {
          return data;
        });
    },
    count: function (params) {
      return $http.post('/ratings/count', {
          search: params
        })
        .success(function (docs) {
          return docs.data;
        })
        .error(function (data, status) {
          return data;
        });
    },
    participants: function (params) {
      return $http.get('/ratings/api/participants', {})
        .success(function (docs) {
          return docs.data;
        })
        .error(function (data, status) {
          return data;
        });
    }

  };
});


var ERRatingsController = function ($scope, $location, service, $http) {
  var vm = this;

  service.participants().then(function (results) {
    vm.participants = results.data.participants;
  })

  vm.getPumps = function () {
    if (!vm.search.rating_id && !vm.search.participant && !vm.search.basic_model) {
      vm.pumps = [];
      vm.pumps_error = "You must enter at least one of the following:  Rating ID, Basic Model Number, Brand, or Participant";
      return;
    }
    if (!vm.search.participant) {
      vm.search.brand = "";
    }
    if (!vm.search.cl && !vm.search.vl) {
      vm.search_error = "At least one load type must be specified (CL, VL, or both)";
      return;
    }

    vm.pumps_error = false;
    vm.searching = true;
    console.log('C&I Search Parameters: '+JSON.stringify(vm.search,null,2));
    service.search(vm.search).then(function (results) {
      vm.searching = false;
      vm.pumps = results.data.pumps;
      vm.pumps_error = false;
    }).catch(function (error) {
      vm.pumps_error = true;
      vm.searching = false;
      console.error(error);
    });
  }

  vm.getBrands = function () {
    var p = {};
    if (vm.search.participant) {
      p.name = vm.search.participant;
    }
    $http.get('/ratings/api/brands', {
        params: p
      })
      .success(function (docs) {
        console.log(docs);
        vm.brands = docs.brands;
      });
  }

  vm.countPumps = function () {
    vm.search_error = "";
    console.log(vm.search);
    if (!vm.search) {
      vm.search = {
        min_er: 0,
        max_er: 100,
        cl: true,
        vl: true,
        esfm: true,
        escc: true,
        il: true,
        rsv: true,
        st: true,
        tier1: true,
        tier2: true,
        tier3: true
      }
    }

    if (!vm.search.min_er) {
      vm.search.min_er = 0;
    }
    if (vm.search.max_er === undefined) {
      vm.search.max_er = 100;
    }
    if (!vm.search.cl && !vm.search.vl) {
      vm.search_error = "At least one load type must be specified (CL, VL, or both)";
      return;
    }
    if (!vm.search.esfm && !vm.search.escc && !vm.search.il && !vm.search.rsv && !vm.search.st) {
      vm.search_error = "At least one DOE designation must be specified";
      return;
    }

    vm.counting = true;
    service.count(vm.search).then(function (results) {
      vm.counting = false;
      vm.num_pumps = results.data.pumps;
    }).catch(function (error) {
      vm.pumps_error = true;
      vm.counting = false;
      console.error(error);
    });
  }

  vm.load_search = function () {

    if (vm.search && !vm.search.fresh) {
      vm.getPumps();
      vm.getBrands();
    }
  }
  vm.load_count = function () {
    vm.countPumps();
  }

  vm.getConfigLabel = function (config) {
    var retval = configurations.filter(function (c) {
      return config == c.value;
    }).map(function (c) {
      return c.label;
    })
    return retval.length ? retval[0] : "Unknown";
  }


  vm.erSlider = {
    options: {
      floor: 0,
      ceil: 100,
      step: 1,
      onEnd: function () {
        vm.countPumps();
      }
    }
  };
}


app.controller('ERRatingsController', ERRatingsController);