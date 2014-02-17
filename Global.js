////
// US Census Bureau Configuration
var APIKey = '2b9ee0ef86f98ab8a8d16451067b23081acb2bfa'; // US Census API key

// various US Census Bureau constants scoped into an object.
// (in case the API changes any of these values, it'll be easier to fix here)
var USCB = Object();
USCB.ACS = 'acs5'; // American Community Survey
USCB.SF1 = 'sf1'; // Summary File 1
USCB.COUNTY = 'county'; // County selector
USCB.STATE = 'state'; // State selector
USCB.YEAR = '2010'; // coded here for now, move to user selection later?

////
// Three.js Configuration
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

var currentGeoType = geoType.state //Variable to store the currently selected map type

var svgIndex = { county: 'Data/USCounties.svg', state: 'Data/USStates.svg' }; //The paths to the two svgs

function getQuerystring(key) { //Function to parse the URL and obtain a query string based on the given key
    key = key.toLowerCase();
    key = key.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
    var regex = new RegExp("[\\?&]" + key + "=([^&#]*)");
    var qs = regex.exec(window.location.href.toLowerCase());
    if (qs == null)
        return '';
    else
        return qs[1];
}
