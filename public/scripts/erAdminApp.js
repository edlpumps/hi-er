"use strict";

var app = angular.module('ERAdminApp', []);

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
            return $http.get('/admin/api/users', {})
                .then(function (docs) {
                    return docs.data;
                });
        },
        getLabs: function () {
            return $http.get('/admin/api/labs', {})
                .then(function (docs) {
                    return docs.data;
                });
        },
        saveLab: function (lab) {
            return $http.post('/admin/api/labs/save', {
                    lab: lab
                })
                .success(function (docs) {
                    return docs.data;
                })
                .error(function (data, status) {
                    return data;
                });
        },
        getParticipants: function () {
            return $http.get('/admin/api/participants', {})
                .then(function (docs) {
                    return docs.data;
                });
        },
        saveNewUser: function (user) {
            return $http.post('/admin/api/users/add', {
                    user: user
                })
                .success(function (docs) {
                    return docs.data;
                })
                .error(function (data, status) {
                    return data;
                });
        },
        saveNewLab: function (lab) {
            return $http.post('/admin/api/labs/add', {
                    lab: lab
                })
                .success(function (docs) {
                    return docs.data;
                })
                .error(function (data, status) {
                    return data;
                });
        },

        deleteUser: function (user) {
            return $http.post('/admin/api/users/delete/' + user._id, {})
                .success(function (docs) {
                    return docs.data;
                })
                .error(function (data, status) {
                    return data;
                });
        },
        deleteLab: function (lab) {
            return $http.post('/admin/api/labs/delete/' + lab._id, {})
                .success(function (docs) {
                    return docs.data;
                })
                .error(function (data, status) {
                    return data;
                });
        },
        saveLabels: function (labels) {
            return $http.post('/admin/api/labels', {
                    labels: labels
                })
                .success(function (docs) {
                    return docs.data;
                })
                .error(function (data, status) {
                    return data;
                });
        }
    };
});


var ERSubscriberController = function ($scope, $location, $http) {
    var app = this;

    app.base_url = make_base_url($location);
    app.subscribers = [];

    app.getSubscribers = function (callback) {
        $http.get('/admin/api/subscriber', {})
            .then(function (docs) {
                app.subscribers = docs.data.subscribers;
                console.log(app.subscribers);
                if (callback) callback();
            });
    }

    app.showAddSubscriber = function () {
        app.active_subscriber = {}

        $('#add').modal('show');
    }
    app.showEditSubscriber = function (sub) {
        app.active_subscriber = sub
        if (!app.active_subscriber.type_of_data) {
            app.active_subscriber.type_of_data = "full";
        }
        // Convert to string
        app.active_subscriber.interval_days=app.active_subscriber.interval_days.toString();

        $('#add').modal('show');
    }
    app.addSubscriber = function () {
        var verb = 'put';
        if (app.active_subscriber._id) {
            verb = 'post'
        }
        $http[verb]('/admin/api/subscriber/', app.active_subscriber)
            .success(function (docs) {
                app.reload();
            })
            .error(function (data, status) {
                console.log(data);
                console.log("Error saving subscriber")
            });

    }

    app.removeSubscriber = function (sub) {
        $http.delete('/admin/api/subscriber/' + sub._id, {})
            .success(function (docs) {
                app.reload();
            })
            .error(function (data, status) {
                console.log(data);
                console.log("Error deleting subscriber")
            });
    }
    app.addRecipient = function () {
        console.log("Adding recipient");
        if (!app.active_subscriber.recipients) {
            app.active_subscriber.recipients = []
        }
        console.log(app.active_subscriber.recipients);
        if (app.active_subscriber.recipients.indexOf(app.new_recipient) < 0) {
            app.active_subscriber.recipients.push(app.new_recipient);
        }
        app.new_recipient = '';
    }
    app.removeRecipient = function (index) {
        app.active_subscriber.recipients.splice(index, 1);
    }
    app.getSubscribers();

    app.reload = function () {
        $('#add').modal('hide');
        app.getSubscribers();
    }
}

app.controller('ERSubscriberController', ERSubscriberController);


var ERAdminController = function ($scope, $location, service) {
    var vm = this;

    vm.base_url = make_base_url($location);

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

    vm.confirmDeleteUser = function (user) {
        vm.user_to_delete = user
        $('#delete').modal('show');
    }


    vm.refreshParticipants = function (callback) {
        service.getParticipants().then(function (results) {
            vm.participants = results.participants;
            vm.participants_error = false;
            if (callback) {
                callback();
            }
        }).catch(function (error) {
            vm.participants_error = true;
            console.error(error);
        });
    }
    vm.refreshLabs = function () {
        service.getLabs().then(function (results) {
            vm.labs = results.labs;
            vm.labs_error = false;
        }).catch(function (error) {
            vm.labs_error = true;
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

    vm.addLab = function () {
        service.saveNewLab(vm.new_lab).then(function (saved) {
            vm.new_lab_error = false;
            vm.refreshLabs();
            $('#add').modal('hide');


        }).catch(function (error) {
            if (error.status == 403) {
                window.location = "/";
            } else {
                vm.new_lab_error = error.data;
            }
        })
    }

    vm.saveLab = function () {
        service.saveLab(vm.edit_lab).then(function (saved) {
            vm.edit_lab_error = false;
            $('#edit').modal('hide');
            vm.refreshLabs();
        }).catch(function (error) {
            if (error.status == 403) {
                window.location = "/";
            } else {
                vm.edit_lab_error = error.data;
            }
        })
    }

    vm.removeLab = function (lab) {
        service.deleteLab(lab).then(function (saved) {
            vm.refreshLabs();
        }).catch(function (error) {
            if (error.status == 403) {
                window.location = "/";
            } else {
                console.log(error);
            }
        })
    }

    vm.activateInfo = function (user) {
        vm.activate_user = user;
        $('#activation').modal('show')
    }

    vm.showAddUser = function () {
        vm.new_user = {
            email: ""
        };

        $('#add').modal('show')
    }



    vm.showAddLab = function () {
        vm.new_lab = {
            address: {
                country: "United States"
            }
        };

        $('#add').modal('show')
    }

    vm.showEditLab = function (lab) {
        vm.edit_lab = JSON.parse(JSON.stringify(lab));
        $('#edit').modal('show')
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



    vm.save_labels = function () {
        service.saveLabels(vm.labels).then(function (result) {
            vm.labels_changed = false;
            vm.labels_editing = false;
            vm.original_labels = JSON.parse(JSON.stringify(result.data.labels));
            vm.labels = result.data.labels;
            result.data.labels.forEach(function (label) {
                label.modified = false;
            });
        }).catch(function (error) {
            if (error.status == 403) {
                window.location = "/";
            } else {

            }
        });

    }

    vm.refreshUsers();
    vm.refreshParticipants();
    vm.refreshLabs();
}


app.controller('ERAdminController', ERAdminController);