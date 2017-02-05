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
    var endpoint = "http://sample-env.nwt3za9ckd.us-west-2.elasticbeanstalk.com";
    $.getJSON("data/allparcs.geojson", function (json) {
      $scope.parc = json.features.filter(function (feat) { return feat.id === $routeParams.parcId })[0].properties;
      $scope.loaded = true;
      ;

      $.getJSON(endpoint + "/twitter/feedbycontent/" + window.encodeURIComponent($scope.parc.name), function (data) {
        $scope.$apply(function () { $scope.parc.twitter = data.statuses; });
      });

      $.getJSON(endpoint + "/facebook/eventsFrom/" + window.encodeURIComponent($scope.parc.fbid), function (data) {
        $scope.$apply(function () {
          console.log(data);
          $scope.parc.events = data.filter(function (event) {
            return new Date(event.start_time) > new Date()
          }).sort(function (o1, o2) {
            var date1 = new Date(o1.start_time);
            var date2 = new Date(o2.start_time);
            return date1 < date2  ? -1 : date1 > date2 ? 1 : 0;
          });;
        });
      });

    });
  }]);