'use strict';

angular.module('myApp.parc', ['ngRoute'])

  .config(['$routeProvider', function ($routeProvider) {
    $routeProvider.when('/parc/:parcId', {
      templateUrl: 'views/parc/parc.html',
      controller: 'parcCtrl'
    });
  }])

  .controller('parcCtrl', ['$scope', '$routeParams', function ($scope, $routeParams) {
    console.log($routeParams);
  }]);