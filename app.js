var map = L.map('map').setView([51.505, -0.09], 13);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

var fogLayer = L.maskCanvas().addTo(map);

var routeLayer = L.geoJSON().addTo(map);

function updateRoute(newCoords) {
    routeLayer.clearLayers();
    L.geoJSON(newCoords).addTo(routeLayer);
}

function simulateMovement() {
    var lat = 51.505;
    var lng = -0.09;

    setInterval(function() {
        lat += 0.01;
        lng += 0.01;
        var newCoords = {
            "type": "LineString",
            "coordinates": [
                [-0.09, 51.505],
                [lng, lat]
            ]
        };
        updateRoute(newCoords);
    }, 1000);
}

simulateMovement();