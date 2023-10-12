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

var motor_types = [{
  value: "single_induction",
  label: "Single-Phase Induction Motor"
},
{
  value: "inverter_electric",
  label: "Inverter Only Synchronous Electric Motor"
},
{
  value: "poly_electric",
  label: "Polyphase Electric Motor"
}
];


var app = angular.module('ERParticipantApp', []).directive('bootstrapSwitch', [
  function () {
    return {
      restrict: 'A',
      require: '?ngModel',
      link: function (scope, element, attrs, ngModel) {
        element.bootstrapSwitch();

        element.on('switchChange.bootstrapSwitch', function (event, state) {
          if (ngModel) {
            scope.$apply(function () {
              ngModel.$setViewValue(state);
            });
          }
        });

        scope.$watch(attrs.ngModel, function (newValue, oldValue) {
          if (newValue) {
            element.bootstrapSwitch('state', true, true);
          } else {
            element.bootstrapSwitch('state', false, true);
          }
        });
      }
    };
  }
]);;

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
    getUsers: function () {
      return $http.get('/participant/api/users', {})
        .then(function (docs) {
          return docs.data;
        });
    },
    getPumps: function (params) {
      return $http.get('/participant/api/pumps', {
          params: params
        })
        .then(function (docs) {
          return docs.data;
        });
    },
    getLabs: function () {
      return $http.get('/participant/api/labs', {})
        .then(function (docs) {
          return docs.data;
        });
    },
    getActiveLabs: function () {
      return $http.get('/participant/api/active_labs', {})
        .then(function (docs) {
          return docs.data;
        });
    },
    updateLab: function (id, available) {
      return $http.post('/participant/api/labs/' + id, {
          available: available
        })
        .success(function (docs) {
          return docs.data;
        })
        .error(function (data, status) {
          return data;
        });
    },
    saveNewUser: function (user) {
      return $http.post('/participant/api/users/add', {
          user: user
        })
        .success(function (docs) {
          return docs.data;
        })
        .error(function (data, status) {
          return data;
        });
    },
    saveUser: function (user) {
      return $http.post('/participant/api/users/save', {
          user: user
        })
        .success(function (docs) {
          return docs.data;
        })
        .error(function (data, status) {
          return data;
        });
    },
    deleteUser: function (user) {
      return $http.post('/participant/api/users/delete/' + user._id, {})
        .success(function (docs) {
          return docs.data;
        })
        .error(function (data, status) {
          return data;
        });
    },
    deletePump: function (pump) {
      return $http.post('/participant/api/pumps/delete/' + pump._id, {})
        .success(function (docs) {
          return docs.data;
        })
        .error(function (data, status) {
          return data;
        });
    },
    saveSettings: function (participant) {
      return $http.post('/participant/api/settings', {
          participant: participant
        })
        .then(function (docs) {
          return docs.data;
        });
    },
    saveSearchQuery: function (q) {
      return $http.post('/participant/api/search', {
          pump_search_query: q
        })
        .then(function (docs) {
          return docs.data;
        });
    }

  };
});

var ERParticipantController = function ($scope, $location, service) {
  var vm = this;

  vm.base_url = make_base_url($location);
  vm.settings_readonly = true;
  vm.count = 0;
  vm.skip = 0;
  vm.limit = 10;


  vm.post_search_query = function () {
    service.saveSearchQuery(vm.pump_search_query);
  }

  vm.pump_search_results = function () {
    return vm.pumps;
    /*
    var needle = vm.pump_search_query.toLowerCase();
    return vm.pumps.filter(function (pump) {
      var haystacks = [
        pump.rating_id.toLowerCase(),
        pump.basic_model.toLowerCase(),
        pump.individual_model.toLowerCase()
      ];
      var hits = haystacks.filter(function (haystack) {
        return haystack.indexOf(needle) >= 0;
      }).length;
      return hits > 0;
    });
    */
  }

  vm.refreshUsers = function (callback) {
    service.getUsers().then(function (results) {
      vm.users = results.users;
      vm.users_error = false;
      if (callback) {
        callback();
      }
    }).catch(function (error) {
      vm.users_error = true;
      console.error(error);
    });
  }

  vm.refreshLabs = function (callback) {
    service.getLabs().then(function (results) {
      vm.labs = results.labs;
      vm.labs_error = false;
      if (callback) {
        callback();
      }
    }).catch(function (error) {
      vm.labs_error = true;
      console.error(error);
    });
  }


  vm.listed = function () {
    if (vm.pumps) {
      return vm.pumps.filter(function (p) {
        return p.listed;
      }).length;
    }
    return 0;
  }

  vm.refreshPumps = function (callback) {
    vm.searching_pumps = true;
    service.getPumps({
      search: vm.pump_search_query,
      skip: vm.skip,
      limit: vm.limit
    }).then(function (results) {
      vm.pumps = results.pumps;
      vm.count = results.count;
      console.log(results);
      vm.pumps_error = false;
      vm.searching_pumps = false;
      if (callback) {
        callback();
      }
    }).catch(function (error) {
      vm.pumps_error = true;
      vm.searching_pumps = false;
      console.error(error);
    });
  }

  vm.addUser = function () {
    service.saveNewUser(vm.new_user).then(function (saved) {
      vm.new_user_error = false;
      vm.refreshUsers(function () {
        var u = vm.users.filter(function (u_) {
          return u_.email == vm.new_user.email
        });
        vm.activateInfo(u[0])
        vm.new_user = null;
      });
      $('#add').modal('hide');


    }).catch(function (error) {
      if (error.status == 403) {
        window.location = "/";
      } else {
        vm.new_user_error = error.data;
      }
    })
  }

  vm.saveUser = function () {
    service.saveUser(vm.edit_user).then(function (saved) {
      vm.edit_user_error = false;
      $('#edit').modal('hide');
      vm.refreshUsers();
    }).catch(function (error) {
      if (error.status == 403) {
        window.location = "/";
      } else {
        vm.edit_user_error = error.data;
      }
    })
  }

  vm.activateInfo = function (user) {
    vm.activate_user = user;
    $('#activation').modal('show')
  }

  vm.showAddUser = function () {
    vm.new_user = {
      email: "",
      participant_view: true
    };
    $('#add').modal('show')
  }
  vm.editUser = function (user) {
    vm.edit_user = JSON.parse(JSON.stringify(user));
    $('#edit').modal('show')
  }
  vm.confirmDeleteUser = function (user) {
    vm.user_to_delete = user
    $('#delete').modal('show');
  }


  vm.removeUser = function (user) {
    service.deleteUser(user).then(function (saved) {
      vm.refreshUsers();
    }).catch(function (error) {
      if (error.status == 403) {
        window.location = "/";
      } else {
        console.log(error);
      }
    })
  }

  vm.confirmDeletePump = function (pump) {
    vm.pump_to_delete = pump
    $('#delete').modal('show');
  }


  vm.removePump = function (pump) {
    service.deletePump(pump).then(function (saved) {
      vm.refreshPumps();
    }).catch(function (error) {
      if (error.status == 403) {
        window.location = "/";
      } else {
        console.log(error);
      }
    })
  }

  vm.reload = function () {
    $route.reload();
  }




  vm.saveParticipant = function (isValid) {
    if (isValid) {
      service.saveSettings(vm.participant).then(function (saved) {
        window.location = "/participant";
      })
    }


  };



  vm.getConfigLabel = function (config) {
    var retval = configurations.filter(function (c) {
      return config == c.value;
    }).map(function (c) {
      return c.label;
    })
    return retval.length ? retval[0] : "Unknown";
  }

  vm.getMotorTypeLabel = function (motor_type) {
    var retval = motor_types.filter(function (c) {
      return config == c.value;
    }).map(function (c) {
      return c.label;
    })
    return retval.length ? retval[0] : "Unknown";
  }

  vm.section_label = function () {
    if (!vm.pump.section) return undefined;
    switch (vm.pump.section) {
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

  vm.sync_labs = function () {
    if (vm.labs && vm.participant) {
      vm.lab_models = {}
      vm.labs.forEach(function (lab) {
        vm.lab_models[lab._id] = vm.participant.labs.indexOf(lab._id) >= 0;
      })
    }
  }

  vm.sync_available_labs = function (id) {
    service.updateLab(id, vm.lab_models[id]).then(function (result) {
      vm.participant.labs = result.data.labs;
    }).catch(function (error) {
      if (error.status == 403) {
        window.location = "/";
      } else {
        console.log(error);
      }
    })
  }

  vm.refreshUsers();
  vm.refreshLabs(vm.sync_labs);
  vm.refreshPumps();

}


app.controller('ERParticipantController', ERParticipantController);


var ERNewPumpController = function ($scope, $location, service) {
  var vm = this;

  vm.configurations = configurations;
  vm.motor_types = motor_types;

  vm.refreshActiveLabs = function (callback) {
    service.getActiveLabs().then(function (results) {
      vm.active_labs = results.labs;
      vm.labs_error = false;
      if (callback) {
        callback();
      }
    }).catch(function (error) {
      vm.labs_error = true;
      console.error(error);
    });
  }

  vm.manual = function () {
    var myEl = angular.element(document.querySelector('#pei_type'));
    myEl.val('manual');
    new_pump.submit()
  }

  vm.calculate = function () {
    var myEl = angular.element(document.querySelector('#pei_type'));
    myEl.val('calculate');

    new_pump.submit()
  }

  vm.new_missing = function () {
    if (!vm.pump) return true;
    if (!vm.pump.configuration || !vm.pump.configuration.value) return true;
    if (!vm.pump.brand) return true;
    if (!vm.pump.individual_model) return true;
    if (!vm.pump.basic_model) return true;
    if (!vm.pump.diameter) return true;
    if (!vm.pump.speed) return true;
    if (!vm.pump.stages) return true;
    if (!vm.pump.laboratory) return true;
    if (!vm.basic_model_valid()) return true;
    return false;
  }

  vm.basic_model_valid = function () {
    if (!vm.pump) return false;
    if (!vm.pump.basic_model) return false;
    return true;
  }

  vm.refreshActiveLabs();
}





app.controller('ERNewPumpController', ERNewPumpController);



var ERNewManualPumpController = function ($scope, $location, service) {
  var vm = this;

  vm.configurations = configurations;

  vm.motor_types = motor_types;
}


app.controller('ERNewManualPumpController', ERNewManualPumpController);