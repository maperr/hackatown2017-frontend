'use strict';

angular.module('myApp.map', ['ngRoute'])
    .config(['$routeProvider', function($routeProvider) {
        $routeProvider.when('/map', {
            templateUrl: 'views/map/map.html',
            controller: 'mapCtrl'
        });
    }])

.controller('mapCtrl', ["$scope", "$compile", "pollingFactory", "checkAlertTweets", function($scope, $compile, pollingFactory, checkAlertTweets) {
    var favs = localStorage.getItem("favParcs");
    if (favs) {
        favs = JSON.parse(favs);
    }

    $scope.parcs = {
        favs: favs || [],
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
            navigator.geolocation.getCurrentPosition(function(position) {
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

        google.maps.event.addListener(map, 'zoom_changed', function(event) {
            if (this.getZoom() > 16) {
                // Change max/min zoom here
                this.setZoom(16);
            }
            if (this.getZoom() < 12) {
                this.setZoom(12);
            }
        });

        map.data.loadGeoJson("data/allparcs.geojson");

        var favIds = $scope.parcs.favs.map(function(item) {
            return item.id
        });
        map.data.addListener('addfeature', function(event) {
            if (favIds.indexOf(event.feature.f.id) !== -1) {
                event.feature.setProperty("subscribed", true);
            }
        });
        map.data.addListener('click', mapClickListener);
        initMapStyles();
    }

    $scope.addPark = function(park) {
        $scope.parcs.selectedFeature.setProperty("subscribed", true);
        $scope.parcs.selectedPark.subscribed = true;
        $scope.parcs.favs.push($scope.parcs.selectedPark);
        localStorage.setItem("favParcs", JSON.stringify($scope.parcs.favs));
      }

    $scope.removePark = function(id) {
        $scope.parcs.selectedFeature.setProperty("subscribed", false);
        $scope.parcs.selectedPark.subscribed = false;
        $scope.parcs.favs = $scope.parcs.favs.filter(function(item) {
            return item.id !== id
        });

        localStorage.setItem("favParcs", JSON.stringify($scope.parcs.favs));
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

        google.maps.event.addListener(infowindow, 'domready', function() {
            $scope.$apply(function() { $compile($("#map-container").contents())($scope) });
        });


        google.maps.event.addListener(infowindow, 'closeclick', function() {
            event.feature.setProperty("clicked", false);
        });
        event.feature.setProperty("clicked", true);

        //remember currently opened infowindow for cleanup
        lastClickedFeature = event.feature;
        lastinfowindow = infowindow;
    }

    function initMapStyles() {

        map.data.setStyle(function(feature) {
            //todo vary color by scrore
            var color = feature.getProperty("alerted") ? "red" : feature.getProperty("subscribed") ? "green" : "#a3bab3";
            return ({
                fillColor: color,
                strokeWeight: 0,
                fillOpacity: 0.7,
                strokeColor: "white",
                strokeWeight: 2
            });
        });


        map.data.addListener('mouseover', function(event) {
            if (!event.feature.getProperty("subscribed") && !event.feature.getProperty("alerted")) {
                map.data.overrideStyle(event.feature, { fillColor: '#89afa4' });
            }
        });

        map.data.addListener('mouseout', function(event) {
            map.data.revertStyle();
        });
    }

    function notifyMe() {
      // Let's check if the browser supports notifications
      if (!("Notification" in window)) {
        alert("This browser does not support desktop notification");
      }

      // Let's check whether notification permissions have already been granted
      else if (Notification.permission === "granted") {
        // If it's okay let's create a notification
        var notification = new Notification("Alerte de propreté au parc Jean-Drapeau, à vos ballets!!");
      }

      // Otherwise, we need to ask the user for permission
      else if (Notification.permission !== 'denied') {
        Notification.requestPermission(function (permission) {
          // If the user accepts, let's create a notification
          if (permission === "granted") {
            var notification = new Notification("Alerte de propreté au parc Jean-Drapeau, à vos ballets!!");
          }
        });
      }

      // At last, if the user has denied notifications, and you 
      // want to be respectful there is no need to bother them any more.
    }Notification.requestPermission().then(function(result) {
      console.log(result);
    });function spawnNotification(theBody,theIcon,theTitle) {
      var options = {
          body: theBody,
          icon: theIcon
      }
      var n = new Notification(theTitle,options);
    }

    pollingFactory.callFnOnInterval(function() {
        var favNames = $scope.parcs.favs.map(function(item) {
            return item.name
        });
        var alertedParcs = [];
        for (var i in $scope.parcs.favs) {
            var parcName = $scope.parcs.favs[i].name;
            if (checkAlertTweets.callServer(parcName)) {
                alertedParcs.push($scope.parcs.favs[i]);
            }
        }
        map.data.forEach(function(feature) {
            for (var i in alertedParcs) {
                if (feature.id === alertedParcs[i].id) {
                    feature.setProperty('alerted');
                }
            }
        })
    });

    initMap();
}])

.factory("pollingFactory", function($timeout) {
    var timeIntervalInSec = 10;

    function callFnOnInterval(fn, timeIntervalfn) {
        var promise = $timeout(fn, 1000 * timeIntervalInSec);

        return promise.then(function() {
            callFnOnInterval(fn, timeIntervalfn);
        });
    }
    return {
        callFnOnInterval: callFnOnInterval
    };
})

.factory("checkAlertTweets", function() {

    function callServer(parcName) {
        var endpoint = "http://sample-env.nwt3za9ckd.us-west-2.elasticbeanstalk.com";

        var date = new Date().getTime();
        var parcs = [];
        for(var i in $scope.parcs.favs) {
          parcs.push($scope.parcs.favs[i].name);
        }

        var data = new twitter({
          date: date,
          parcs: parcs
        });

        $.getJSON(endpoint + "/twitter/negativeparcs/", function(data) {
            for (var i in data.statuses) {
                var dateTweet = new Date(data.statuses[i].created_at).getTime();
                if (Math.floor((dateTweet - dateNow) / _MS_PER_DAY) < 300000) {
                    return true;
                    notifyMe();
                }
            }
            return false;
        });
    }

    return {
        callServer: callServer
    };
})

.component('parkDetail', {
    templateUrl: 'views/map/parkDetail.html',
    controller: function($scope) {
        var ctrl = this;

        ctrl.subscribe = function() {
            ctrl.onSubscribe({ park: ctrl.park });
        };

        ctrl.unsubscribe = function() {
            ctrl.onUnsubscribe({ id: this.park.id });
        };

        $scope.load = function() {
            var elemActivity = angular.element(document.querySelector('#myBarActivity'));
            var elemPopularity = angular.element(document.querySelector('#myBarPopularity'));
            var elemClean = angular.element(document.querySelector('#myBarClean'));

            var id = setInterval(frame, 15);
            var widthActivity = 0;
            var widthPopularity = 0;
            var widthClean = 0;

            var percentageActivity = ctrl.park.ratingActivity;
            var percentagePopularity = ctrl.park.ratingPopularity;
            var percentageClean = ctrl.park.ratingClean;

            function frame() {
                if (widthPopularity >= percentagePopularity && widthActivity >= percentageActivity && widthClean >= percentageClean) {
                    clearInterval(id);
                }

                if (widthPopularity < percentagePopularity) {
                    widthPopularity++;

                    elemPopularity[0].style.width = widthPopularity + '%';

                    document.getElementById("demoPopularity").innerHTML = widthPopularity * 1 + '%';

                    if (widthPopularity == 33) {
                        document.getElementById("myBarPopularity").className = "w3-progressbar w3-yellow";
                    } else if (widthPopularity == 66) {
                        document.getElementById("myBarPopularity").className = "w3-progressbar w3-green";
                    }
                }

                if (widthActivity < percentageActivity) {
                    widthActivity++;

                    elemActivity[0].style.width = widthActivity + '%';

                    document.getElementById("demoActivity").innerHTML = widthActivity * 1 + '%';

                    if (widthActivity == 33) {
                        document.getElementById("myBarActivity").className = "w3-progressbar w3-yellow";
                    } else if (widthActivity == 66) {
                        document.getElementById("myBarActivity").className = "w3-progressbar w3-green";
                    }
                }

                if (widthClean < percentageClean) {
                    widthClean++;

                    elemClean[0].style.width = widthClean + '%';

                    document.getElementById("demoClean").innerHTML = widthClean * 1 + '%';

                    if (widthClean == 33) {
                        document.getElementById("myBarClean").className = "w3-progressbar w3-yellow";
                    } else if (widthClean == 66) {
                        document.getElementById("myBarClean").className = "w3-progressbar w3-green";
                    }
                }
            }
        }
    },
    bindings: {
        park: '<',
        onSubscribe: '&',
        onUnsubscribe: '&'
    }
});;


var mapStyle = [{
    "elementType": "geometry",
    "stylers": [{
        "color": "#f5f5f5"
    }]
}, {
    "elementType": "labels",
    "stylers": [{
        "visibility": "off"
    }]
}, {
    "elementType": "labels.icon",
    "stylers": [{
        "visibility": "off"
    }]
}, {
    "elementType": "labels.text.fill",
    "stylers": [{
        "color": "#616161"
    }]
}, {
    "elementType": "labels.text.stroke",
    "stylers": [{
        "color": "#f5f5f5"
    }]
}, {
    "featureType": "administrative.land_parcel",
    "stylers": [{
        "visibility": "off"
    }]
}, {
    "featureType": "administrative.land_parcel",
    "elementType": "labels.text.fill",
    "stylers": [{
        "color": "#bdbdbd"
    }]
}, {
    "featureType": "administrative.neighborhood",
    "stylers": [{
        "visibility": "off"
    }]
}, {
    "featureType": "poi",
    "elementType": "geometry",
    "stylers": [{
        "color": "#eeeeee"
    }]
}, {
    "featureType": "poi",
    "elementType": "labels.text.fill",
    "stylers": [{
        "color": "#757575"
    }]
}, {
    "featureType": "poi.park",
    "elementType": "geometry",
    "stylers": [{
        "color": "#e5e5e5"
    }]
}, {
    "featureType": "poi.park",
    "elementType": "labels.text.fill",
    "stylers": [{
        "color": "#9e9e9e"
    }]
}, {
    "featureType": "road",
    "elementType": "geometry",
    "stylers": [{
        "color": "#ffffff"
    }]
}, {
    "featureType": "road.arterial",
    "elementType": "labels.text.fill",
    "stylers": [{
        "color": "#757575"
    }]
}, {
    "featureType": "road.highway",
    "elementType": "geometry",
    "stylers": [{
        "color": "#dadada"
    }]
}, {
    "featureType": "road.highway",
    "elementType": "labels.text.fill",
    "stylers": [{
        "color": "#616161"
    }]
}, {
    "featureType": "road.local",
    "elementType": "labels.text.fill",
    "stylers": [{
        "color": "#9e9e9e"
    }]
}, {
    "featureType": "transit.line",
    "elementType": "geometry",
    "stylers": [{
        "color": "#e5e5e5"
    }]
}, {
    "featureType": "transit.station",
    "elementType": "geometry",
    "stylers": [{
        "color": "#eeeeee"
    }]
}, {
    "featureType": "water",
    "elementType": "geometry",
    "stylers": [{
        "color": "#9eb9c7"
    }]
}, {
    "featureType": "water",
    "elementType": "labels.text.fill",
    "stylers": [{
        "color": "#9e9e9e"
    }]
}];
