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

var defaults = {
  brand: null,
  participant: null,
  min_er: 0,
  max_er: 100,
  cl: true,
  vl: true,
  esfm: true,
  escc: true,
  il: true,
  rsv: true,
  st: true,
  tier1: false,
  tier2: false,
  tier3: false,
  tiernone: false
};

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

  //This is called when the page loads.  the page is shared by utilities and search
  vm.load_search_variables = function (id) {
    vm.id = id; // This is the id of the page, either 'search' or 'utilities'
    const saved = localStorage.getItem(vm.id+'_ratings_search');
    if (saved) {
      vm.search = JSON.parse(saved);
      console.log("Loading Saved Search");
      }
    else {
      vm.search = JSON.parse(JSON.stringify(defaults));
    }
    vm.search.fresh = false;
    vm.searching = false;
    vm.is_valid_search_variables();
    console.log("Search Initialized: ", vm.search);
    return vm.search;
  }

  vm.save_search_variables = function () {
    if (vm.id) {
      localStorage.setItem(vm.id+'_ratings_search', JSON.stringify(vm.search));
    }
  }

  vm.is_valid_search_variables = function () {
    vm.search_error = "";
    let search_sep = "";
    vm.pumps_error = "";
    if ((vm.id == 'search') && !vm.search.rating_id && !vm.search.participant && !vm.search.basic_model) {
      vm.pumps = [];
      vm.pumps_error = "You must enter at least one of the following:  Rating ID, Basic Model Number, Brand, or Participant";
    }
    if (!vm.search.cl && !vm.search.vl) {
      vm.search_error += search_sep+"At least one load type must be specified (CL, VL, or both)";
      search_sep="\n";
    }
    if (!vm.search.cl && !vm.search.vl) {
      vm.search_error += search_sep+"At least one load type must be specified (CL, VL, or both)";
      search_sep="\n";
    }
    if (!vm.search.esfm && !vm.search.escc && !vm.search.il && !vm.search.rsv && !vm.search.st) {
      vm.search_error += search_sep+"At least one DOE designation must be specified";
      search_sep="\n";
    }
    if (vm.search_error || vm.pumps_error) {
      console.log("Search Error: "+vm.search_error);
      console.log("Pumps Error: "+vm.pumps_error);
      vm.search.fresh = false;
      return false;
    }
    return true;
  }

  vm.getPumps = function () {
    vm.search.fresh = false;

    if (!vm.is_valid_search_variables()) 
      return;

    if (!vm.search.participant) {
      vm.search.brand = "";
    }

    vm.pumps_error = false;
    vm.searching = true;
    console.log('C&I Search Parameters: '+JSON.stringify(vm.search,null,2));
    service.search(vm.search).then(function (results) {
      vm.searching = false;
      vm.pumps = results.data.pumps;
      vm.pumps_error = false;
      vm.search.fresh = true;
      vm.save_search_variables();
    }).catch(function (error) {
      vm.pumps_error = true;
      vm.searching = false;
      console.error(error);
    });
  }

  vm.getBrands = function () {
    if (!vm.is_valid_search_variables() && vm.pumps_error) {
      return;
    }

    if (!vm.search) {
      vm.load_search_variables();
    }
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
        vm.save_search_variables();
      });
  }

  vm.countPumps = function () {
    vm.search_error = "";
    console.log(vm.search);
    if (!vm.search) {
      vm.load_search_variables();
    }

    if (!vm.search.min_er) {
      vm.search.min_er = 0;
    }
    if (vm.search.max_er === undefined) {
      vm.search.max_er = 100;
    }
    if (!vm.is_valid_search_variables()) 
      return;

    vm.counting = true;
    service.count(vm.search).then(function (results) {
      vm.counting = false;
      vm.num_pumps = results.data.pumps;
      vm.save_search_variables();
    }).catch(function (error) {
      vm.pumps_error = true;
      vm.counting = false;
      console.error(error);
    });
  }

  vm.load_search = function () {
    if (!vm.search) {
      vm.load_search_variables();
    }
    if (vm.is_valid_search_variables() && !vm.search.fresh) {
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

  vm.clickLoad = function () {
    if (!vm.search.cl && !vm.search.vl) {
      vm.search_error = "At least one load type must be specified (CL, VL, or both)";
      return;
    }
    if (vm.search_error) {
      vm.search_error = "";
    }
    return;
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