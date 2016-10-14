"use strict";

var configurations = [
       { value: "bare", label: "Bare Pump"}, 
       { value: "pump_motor", label: "Pump + Motor"}, 
       { value: "pump_motor_cc", label: "Pump + Motor w/ Continuous Controls"}, 
       { value: "pump_motor_nc", label: "Pump + Motor w/ Non-continuous Controls"}
  ];

var app = angular.module('ERParticipantApp', []);


var service = app.factory('service', function($http) {
   return {
     getUsers : function () {
       return $http.get('/participant/api/users', {})
           .then(function(docs) {
                return docs.data;
           });
     },
     getPumps : function () {
       return $http.get('/participant/api/pumps', {})
           .then(function(docs) {
                return docs.data;
           });
     },
     saveNewUser : function (user) {
        return $http.post('/participant/api/users/add', {user:user})
            .success(function(docs) { return docs.data; })
            .error(function(data, status) {
                return data;
            });
     },
     deleteUser : function (user) {
        return $http.post('/participant/api/users/delete/'+user._id, {})
            .success(function(docs) { return docs.data; })
            .error(function(data, status) {
                return data;
            });
     }, 
     deletePump : function (pump) {
        return $http.post('/participant/api/pumps/delete/'+pump._id, {})
            .success(function(docs) { return docs.data; })
            .error(function(data, status) {
                return data;
            });
     }, 
     saveSettings : function (participant) {
       return $http.post('/participant/api/settings', {participant:participant})
           .then(function(docs) {
                return docs.data;
           });
     }

   };
});

var ERParticipantController = function($scope, $location, service) {
  var vm = this;
  
  vm.base_url = make_base_url($location);
  vm.settings_readonly = true;

  vm.refreshUsers = function(callback) {
      service.getUsers().then(function(results) {
        vm.users = results.users;
        vm.users_error = false;
        if ( callback ) {
          callback();
        }
      }).catch(function(error) {
        vm.users_error = true;
        console.error(error);
      });
  }

  vm.refreshPumps = function(callback) {
      service.getPumps().then(function(results) {
        vm.participant.pumps = results.pumps;
        vm.pumps_error = false;
        if ( callback ) {
          callback();
        }
      }).catch(function(error) {
        vm.pumps_error = true;
        console.error(error);
      });
  }

  vm.addUser = function() {
      service.saveNewUser(vm.new_user).then(function(saved) {
        vm.new_user_error = false;
        vm.refreshUsers(function() {
            var u = vm.users.filter(function(u_){return u_.email ==  vm.new_user.email});
            vm.activateInfo(u[0])
            vm.new_user = null;
        });
        $('#add').modal('hide');

       
      }).catch(function(error) {
        if (error.status == 403) {
          window.location="/";
        }
        else {
          vm.new_user_error = error.data;
        }
     })
  }

  vm.activateInfo = function(user) {
    vm.activate_user = user;
    $('#activation').modal('show')
  }

  vm.showAddUser = function() {
      vm.new_user = {
          email : ""
      };
      $('#add').modal('show')
  }

  vm.removeUser = function(user) {
      service.deleteUser(user).then(function(saved) {
        vm.refreshUsers();
      }).catch(function(error) {
        if (error.status == 403) {
          window.location="/";
        }
        else {
          console.log(error);
        }
     })
  }

  vm.removePump = function(pump) {
      service.deletePump(pump).then(function(saved) {
        vm.refreshPumps();
      }).catch(function(error) {
        if (error.status == 403) {
          window.location="/";
        }
        else {
          console.log(error);
        }
     })
  }

  vm.reload = function() {
    $route.reload();
  }




  vm.saveParticipant = function(isValid) {
    if (isValid) {
      service.saveSettings(vm.participant).then(function(saved) {
        window.location = "/participant";
      })
    }
    

  };



  vm.getConfigLabel = function(config) {
    var retval = configurations.filter(function(c){
      return config == c.value;
    }).map(function (c){
      return c.label;
    })
    return retval.length ? retval[0] : "Unknown";
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


  vm.refreshUsers();


}


app.controller('ERParticipantController', ERParticipantController);


var ERNewPumpController = function($scope, $location, service) {
  var vm = this;

  vm.configurations = configurations;

  
  vm.manual = function(){
    var myEl = angular.element( document.querySelector( '#pei_type' ) );
    myEl.val('manual');
    new_pump.submit()
  }

  vm.calculate = function(){
    var myEl = angular.element( document.querySelector( '#pei_type' ) );
    myEl.val('calculate');
     
    new_pump.submit()
  }

  vm.new_missing = function (){
    if (!vm.pump) return true;
    if (!vm.pump.configuration || !vm.pump.configuration.value ) return true;
    if (!vm.pump.basic_model) return true;
    if (!vm.pump.diameter) return true;
    if (!vm.pump.speed) return true;
    if (!vm.pump.stages) return true;
    if (!vm.pump.laboratory) return true;
    if (!vm.basic_model_valid()) return true;
    return false;
  }

  vm.basic_model_valid  = function() {
    if (!vm.pump) return false;
    if (!vm.pump.basic_model) return false;
    var tokens = vm.pump.basic_model.split(".");
    if ( tokens.length != 3) return false;
    if ( tokens[0].length != 3) return false;
    if ( tokens[1].length != 3) return false;
    if ( tokens[2].length != 2) return false;
    return true;
  }
}


app.controller('ERNewPumpController', ERNewPumpController);



var ERNewManualPumpController = function($scope, $location, service) {
  var vm = this;

  vm.configurations = [
       { value: "bare", label: "Bare Pump"}, 
       { value: "pump_motor", label: "Pump + Motor"}, 
       { value: "pump_motor_cc", label: "Pump + Motor w/ Continuous Controls"}, 
       { value: "pump_motor_nc", label: "Pump + Motor w/ Non-continuous Controls"}
  ];


  
}


app.controller('ERNewManualPumpController', ERNewManualPumpController);