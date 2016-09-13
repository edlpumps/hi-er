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
     }
   };
});

const ERParticipantController = function($scope, $location, service) {
  var vm = this;
  console.log("Initializing participant portal");

  vm.base_url = $location.protocol() + "://" + $location.host();
  if ( $location.port() != 80 && $location.port()!= 443 ) vm.base_url += ":" + $location.port();
   
  console.log("Base url = " + vm.base_url);
    
  vm.refreshUsers = function(callback) {
      service.getUsers().then(function(results) {
        vm.users = results.users;
        vm.users_error = false;
        console.log(results.users);
        console.log("Retrieved " + results.users.length + " users");
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
            var u = vm.users.filter(u_ => u_.email == vm.new_user.email);
            if ( u.length > 0 ) {
              vm.activateInfo(u[0])
            }
            else {
              console.log("Problem...");
            }
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

  vm.refreshUsers();
}



app.controller('ERParticipantController', ERParticipantController);