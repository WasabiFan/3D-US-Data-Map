var WIDTH, HEIGHT, mapWidth, mapHeight; //Size variables
var controls; //Orbit controls

var camera, $container, scene, renderer, light, secondaryLight, camLight, projector = new THREE.Projector(); //Scene objects

var loadedGeographies = {};
var mapObject = new THREE.Object3D(); //Object to encompass all of the geographies
var censusQueryCompleted = false;

var loadedDatasets = []; //Variable to store what datasets have been loaded from the census api for easy access

var allAnimationsComplete = false;
var mapLoaded = false;

var mapOffset = new THREE.Vector2(0, -500); //Vector to offset all of the points in the map (0,0 in the svg is in the upper left corner)

var geoType = { county: 'county', state: 'state' }; //Quick access to the different settings; not actually functionally useful 

var currentGeoType = geoType.county; //Variable to store the currently selected map type

var svgIndex = { county: 'Data/USCounties.svg', state: 'Data/USStates.svg' }; //The paths to the two svgs

var geoTypeToSelectedIndex = function(type){ //Converter between text and the index of the two settings
    switch(type){
        case 'county':
        case 'counties':
            return 0;
            break;
        case 'state':
        case 'states':
            return 1;
            break;
    }
};

var selectedIndexToGeoType = function (index) { //Converter between an index and the text of a setting
    switch (index) {
        case 0:
            return 'county';
            break;
        case 1:
            return 'state';
            break;
    }
};

function getQuerystring(key) { //Function to parse the URL and obtain a query string based on the given key
    key = key.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
    var regex = new RegExp("[\\?&]" + key + "=([^&#]*)");
    var qs = regex.exec(window.location.href.toLowerCase());
    if (qs == null)
        return '';
    else
        return qs[1];
}