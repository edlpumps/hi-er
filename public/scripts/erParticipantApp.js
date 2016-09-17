"use strict";


var app = angular.module('ERParticipantApp', []);


var service = app.factory('service', function($http) {
   return {
     getUsers : function () {
       return $http.get('/participant/api/users', {})
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






  vm.refreshUsers();


}



app.controller('ERParticipantController', ERParticipantController);