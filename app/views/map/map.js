'use strict';

angular.module('myApp.map', ['ngRoute'])
  .config(['$routeProvider', function ($routeProvider) {
    $routeProvider.when('/map', {
      templateUrl: 'views/map/map.html',
      controller: 'mapCtrl'
    });
  }])

  .controller('mapCtrl', ["$scope", "$compile", function ($scope, $compile) {
    $scope.parcs = {
      favs: [],
      selectedPark: {},
      selectedFeature: {}
    }
    $scope.ids = 0;

    var map;
    // called by google maps script
    var lastinfowindow;
    var lastClickedFeature;


    function initMap() {
      map = new google.maps.Map(document.getElementById('map'), {
        zoom: 11,
        center: {
          lat: 45.501709456413984,
          lng: -73.71938522905111
        },
        zoom: 14,
        styles: mapStyle,
        disableDefaultUI: true
      });

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function (position) {
          var pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          map.setCenter(pos);

          var marker = new google.maps.Marker({
            position: pos,
            map: map,
            title: 'Je suis ici!'
          });
        });
      }

      google.maps.event.addListener(map, 'zoom_changed', function (event) {
        if (this.getZoom() > 16) {
          // Change max/min zoom here
          this.setZoom(16);
        }
        if (this.getZoom() < 12) {
          this.setZoom(12);
        }
      });

      map.data.loadGeoJson("data/allparcs.geojson");
      map.data.addListener('click', mapClickListener);
      initMapStyles();
    }

    $scope.addPark = function (park) {
      $scope.parcs.selectedFeature.setProperty("subscribed", true);
      $scope.parcs.selectedPark.subscribed = true;
      $scope.parcs.favs.push($scope.parcs.selectedPark);
    }

    $scope.removePark = function (id) {
      $scope.parcs.selectedFeature.setProperty("subscribed", false);
      $scope.parcs.selectedPark.subscribed = false;
      $scope.parcs.favs = $scope.parcs.favs.filter(function (item) { return item.id !== id });
    }

    function mapClickListener(event) {

      //cleanup
      if (lastinfowindow !== undefined) lastinfowindow.close();
      if (lastClickedFeature != undefined) lastClickedFeature.setProperty("clicked", false);

      //open new infowindow
      $scope.parcs.selectedPark = event.feature.f;
      $scope.parcs.selectedFeature = event.feature;

      var infowindow = new google.maps.InfoWindow({
        content: "<park-detail park='parcs.selectedPark' on-subscribe='addPark(park)' on-unsubscribe='removePark(id)' />",
        position: event.latLng
      });
      infowindow.open(map);

      google.maps.event.addListener(infowindow, 'domready', function () {
        $scope.$apply(function () { $compile($("#map-container").contents())($scope) });
      });


      google.maps.event.addListener(infowindow, 'closeclick', function () {
        event.feature.setProperty("clicked", false);
      });
      event.feature.setProperty("clicked", true);

      //remember currently opened infowindow for cleanup
      lastClickedFeature = event.feature;
      lastinfowindow = infowindow;
    }


    function initMapStyles() {

      map.data.setStyle(function (feature) {
        //todo vary color by scrore
        var color = feature.getProperty("subscribed") ? "green" : "#a3bab3";
        return ({
          fillColor: color,
          strokeWeight: 0,
          fillOpacity: 0.7,
          strokeColor: "white",
          strokeWeight: 2
        });
      });


      map.data.addListener('mouseover', function (event) {
        if(!event.feature.getProperty("subscribed")){
          map.data.overrideStyle(event.feature, { fillColor: '#89afa4' });
        }
      });

      map.data.addListener('mouseout', function (event) {
        map.data.revertStyle();
      });
    }

    initMap();
  }]).component('parkDetail', {
    templateUrl: 'views/map/parkDetail.html',
    controller: function () {
      var ctrl = this;

      ctrl.subscribe = function () {
        ctrl.onSubscribe({ park: ctrl.park });
      };

      ctrl.unsubscribe = function () {
        ctrl.onUnsubscribe({ id: this.park.id });
      };

    },
    bindings: {
      park: '<',
      onSubscribe: '&',
      onUnsubscribe: '&'
    }
  });;


var mapStyle = [
  {
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#f5f5f5"
      }
    ]
  },
  {
    "elementType": "labels",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "elementType": "labels.icon",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#616161"
      }
    ]
  },
  {
    "elementType": "labels.text.stroke",
    "stylers": [
      {
        "color": "#f5f5f5"
      }
    ]
  },
  {
    "featureType": "administrative.land_parcel",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "featureType": "administrative.land_parcel",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#bdbdbd"
      }
    ]
  },
  {
    "featureType": "administrative.neighborhood",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "featureType": "poi",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#eeeeee"
      }
    ]
  },
  {
    "featureType": "poi",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#757575"
      }
    ]
  },
  {
    "featureType": "poi.park",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#e5e5e5"
      }
    ]
  },
  {
    "featureType": "poi.park",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#9e9e9e"
      }
    ]
  },
  {
    "featureType": "road",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#ffffff"
      }
    ]
  },
  {
    "featureType": "road.arterial",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#757575"
      }
    ]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#dadada"
      }
    ]
  },
  {
    "featureType": "road.highway",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#616161"
      }
    ]
  },
  {
    "featureType": "road.local",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#9e9e9e"
      }
    ]
  },
  {
    "featureType": "transit.line",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#e5e5e5"
      }
    ]
  },
  {
    "featureType": "transit.station",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#eeeeee"
      }
    ]
  },
  {
    "featureType": "water",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#9eb9c7"
      }
    ]
  },
  {
    "featureType": "water",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#9e9e9e"
      }
    ]
  }
];