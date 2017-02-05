'use strict';

angular.module('myApp.parc', ['ngRoute'])

  .config(['$routeProvider', function ($routeProvider) {
    $routeProvider.when('/parc/:parcId', {
      templateUrl: 'views/parc/parc.html',
      controller: 'parcCtrl'
    });
  }])

  .controller('parcCtrl', ['$scope', '$routeParams','$document', function ($scope, $routeParams,$document) {
    $scope.loaded = false;
    $scope.parc = {};



    function init() {
      var endpoint = "http://sample-env.nwt3za9ckd.us-west-2.elasticbeanstalk.com";
      $.getJSON("data/allparcs.geojson", function (json) {
        $scope.parc = json.features.filter(function (feat) { return feat.id === $routeParams.parcId })[0].properties;
        $scope.loaded = true;

        $.getJSON(endpoint + "/twitter/feedbycontent/" + window.encodeURIComponent($scope.parc.name), function (data) {
          $scope.$apply(function () {
            console.log(data);
            $scope.parc.twitter = data.statuses;
          });
        });
        var parc = $scope.parc;
        $scope.parc.averageRating = ((Number(parc.ratingActivity) + Number(parc.ratingPopularity) + Number(parc.ratingClean))/3.0).toFixed(2);

        $.getJSON(endpoint + "/facebook/eventsFrom/" + window.encodeURIComponent($scope.parc.fbid), function (data) {
          $scope.$apply(function () {
            $scope.parc.events = data.filter(function (event) {
              return new Date(event.start_time) > new Date()
            }).sort(function (o1, o2) {
              var date1 = new Date(o1.start_time);
              var date2 = new Date(o2.start_time);
              return date1 < date2 ? -1 : date1 > date2 ? 1 : 0;
            });;
          });
        });

        var chartData = {
          labels: ["Propreté", "February", "March"],
          datasets: [
            {
              label: "My First dataset",
              pointHitRadius: 10,
              data: [65, 59, 80, 81, 56, 55, 40],
              spanGaps: false,
            }
          ]
        }
         setTimeout(function () {
          var ctx = $("#chart");
          var rating = new Chart(ctx, {
            type: 'line',
            data: {
              labels: ["24 dec. 2016", "30 dec. 2016", "6 jan 2017 ", "13 jan. 2017",  "20 jan. 2017", "27 jan. 2017", "3 fev. 2017"],
              datasets: [{
                label: 'Propreté',
                data: [12, 19, 3, 17, 6, 3, 7],
                borderColor: "#64b5f6"
              }, {
                label: 'Popularité',
                data: [2, 29, 5, 5, 2, 3, 10],
                borderColor: "#66bb6a"
              }, {
                label: 'Acitivtés',
                data: [3, 4, 2, 0, 1, 3, 5],
                borderColor: "#f57c00"
              }]
            }
          });
        }, 1000)

      });
    }

    init();
  }]);