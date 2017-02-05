'use strict';

angular.module('myApp.parc', ['ngRoute'])

  .config(['$routeProvider', function ($routeProvider) {
    $routeProvider.when('/parc/:parcId', {
      templateUrl: 'views/parc/parc.html',
      controller: 'parcCtrl'
    });
  }])

  .controller('parcCtrl', ['$scope', '$routeParams', function ($scope, $routeParams) {
    $scope.loaded = false; 
    $scope.parc = {}; 
    $.getJSON("data/allparcs.geojson", function(json) { 
      $scope.parc = json.features.filter(function(feat){return feat.id === $routeParams.parcId})[0].properties; 
      $scope.loaded = true; 
      $scope.$apply(); 
    }); 
  }]);