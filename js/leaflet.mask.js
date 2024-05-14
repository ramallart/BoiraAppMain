(function (factory, window) {
    // define an AMD module that relies on 'leaflet'
    if (typeof define === "function" && define.amd) {
        define(["leaflet"], factory);

        // define a Common JS module that relies on 'leaflet'
    } else if (typeof exports === "object") {
        module.exports = factory(require("leaflet"));
    }

    // attach your plugin to the global 'L' variable
    if (typeof window !== "undefined" && window.L) {
        factory(L);
    }
})(function (L) {
    L.Mask = L.LayerGroup.extend({
        options: {
            color: "#3388FF",
            weight: 2,
            fillColor: "#FFFFFF",
            fillOpacity: 1,
            interactive: false,
            fitBounds: true,
            restrictBounds: true,
        },

        initialize: function (geojson, options) {
            L.Util.setOptions(this, options);
            this._layers = {};
            this._bounds = new L.LatLngBounds();
            this._maskPolygonCoords = [
                [
                    [-360, -90],
                    [-360, 90],
                    [360, 90],
                    [360, -90],
                ],
            ];

            if (geojson) {
                if (typeof geojson === "string") {
                    var _that = this;
                    this.request(geojson, function (json) {
                        _that.addData(json);
                    });
                } else {
                    this.addData(geojson);
                }
            }
        },

        addData: function (geojson) {
            this.addObject(geojson);
            this.addMaskLayer();
        },

        addObject: function (json) {
            var i, len;
            if (L.Util.isArray(json)) {
                for (i = 0, len = json.length; i < len; i++) {
                    this.addObject(json[i]);
                }
            } else {
                switch (json.type) {
                    case "FeatureCollection":
                        var features = json.features;
                        for (i = 0, len = features.length; i < len; i++) {
                            this.addObject(features[i]);
                        }
                        return;
                    case "Feature":
                        this.addObject(json.geometry);
                        return;
                    case "GeometryCollection":
                        var geometries = json.geometries;
                        for (i = 0, len = geometries.length; i < len; i++) {
                            this.addObject(geometries[i]);
                        }
                        return;
                    case "Polygon":
                        this.addRemovalPolygonCoordinates(json.coordinates);
                        return;
                    case "MultiPolygon":
                        this.addRemovalMultiPolygonCoordinates(json.coordinates);
                        return;
                    default:
                        return;
                }
            }
        },

        addRemovalPolygonCoordinates: function (coords) {
            for (var i = 0, len = coords.length; i < len; i++) {
                this._maskPolygonCoords.push(coords[i]);
                this.updateBounds(coords[i]);
            }
        },

        addRemovalMultiPolygonCoordinates: function (coords) {
            for (var i = 0, len = coords.length; i < len; i++) {
                this.addRemovalPolygonCoordinates(coords[i]);
            }
        },

        updateBounds: function (coords) {
            for (var i = 0, len = coords.length; i < len; i++) {
                var coords2 = coords[i];
                for (var j = 0, lenJ = coords2.length; j < lenJ; j++) {
                    this._bounds.extend(new L.latLng(coords2[1], coords2[0], coords2[2]));
                }
            }
        },

        addMaskLayer: function () {
            var latlngs = this.coordsToLatLngs(this._maskPolygonCoords);
            var layer = new L.Polygon(latlngs, this.options);
            this.addLayer(layer);
            if (this.options.fitBounds) {
                this._map.fitBounds(this._bounds);
            }
            if (this.options.restrictBounds) {
                this._map.setMaxBounds(this._bounds);
            }
        },

        dimension: function (arr) {
            var j = 1;
            for (var i in arr) {
                if (arr[i] instanceof Array) {
                    if (1 + this.dimension(arr[i]) > j) {
                        j = j + this.dimension(arr[i]);
                    }
                }
            }
            return j;
        },

        coordsToLatLng: function (coords) {
            return new L.LatLng(coords[1], coords[0], coords[2]);
        },

        coordsToLatLngs: function (coords) {
            var latlngs = [];
            var dimensions = this.dimension(coords);
            for (var i = 0, len = coords.length, latlng; i < len; i++) {
                if (dimensions > 2) {
                    latlng = this.coordsToLatLngs(coords[i]);
                } else {
                    latlng = this.coordsToLatLng(coords[i]);
                }
                latlngs.push(latlng);
            }

            return latlngs;
        },

        request: function (url, success, error) {
            var xhr = new XMLHttpRequest();
            xhr.responseType = "json";
            xhr.onreadystatechange = function () {
                if (xhr.readyState === 4) {
                    if (xhr.status === 200) {
                        if (success && typeof success === "function") {
                            success(xhr.response);
                        }
                    } else {
                        if (error && typeof error === "function") {
                            error();
                        }
                    }
                }
            };
            xhr.open("GET", url, true);
            xhr.send(null);
        },
    });

    L.mask = function (geojson, options) {
        return new L.Mask(geojson, options);
    };

    // Afegir funció per mostrar la ubicació de l'usuari
    L.Map.include({
        showUserLocation: function () {
            var map = this;
            map.locate({ setView: true, maxZoom: 16 });
        }
    });

    // Afegir funció per esborrar la màscara pels llocs on passi l'usuari
    L.Mask.include({
        removeMaskAtUserLocation: function () {
            var mask = this;
            mask._map.on('locationfound', function (e) {
                mask.eachLayer(function (layer) {
                    if (layer instanceof L.Polygon) {
                        if (layer.getBounds().contains(e.latlng)) {
                            mask.removeLayer(layer);
                        }
                    }
                });
            });
        }
    });

    // Afegir funció per centrar el mapa a la ubicació de l'usuari
    L.Map.include({
        centerMapToUserLocation: function () {
            var map = this;
            map.on('locationfound', function (e) {
                map.setView(e.latlng);
            });
        }
    });

    // Afegir funció per limitar el zoom màxim i mínim del mapa
    L.Map.include({
        setMaxMinZoom: function () {
            var map = this;
            map.setMinZoom(5); // Estableix el zoom mínim a 5
            map.setMaxZoom(18); // Estableix el zoom màxim a 18
        }
    });

    // Afegir funció per afegir els comandaments estàndards de manipulació del mapa
    L.Map.include({
        addStandardControls: function () {
            var map = this;
            L.control.zoom({ position: 'topright' }).addTo(map); // Afegir control de zoom a la cantonada superior dreta
            L.control.scale().addTo(map); // Afegir escala al mapa
        }
    });

    L.Map.include({
        showUserLocation: function () {
            var map = this;
            map.locate({ setView: true, maxZoom: 16 });
    
            function onLocationFound(e) {
                var radius = e.accuracy / 2;
    
                L.marker(e.latlng).addTo(map)
                    .bindPopup("You are within " + radius + " meters from this point").openPopup();
    
                L.circle(e.latlng, radius).addTo(map);
            }
    
            map.on('locationfound', onLocationFound);
        }
    });

    L.Map.include({
        showMarkers: function() {
            // Definir les coordenades del marcador
            var markerCoords = [41.615, 0.625];

            // Crear el marcador
            var marker = L.marker(markerCoords).addTo(map);

            // Opcionalment, afegir un popup al marcador
            marker.bindPopup("<b>Hello world!</b><br>I am a popup.", {
                className: 'custom-popup'
            });
        }
    });

}, window);
