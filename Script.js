/// <reference path="http://code.jquery.com/jquery-1.9.1.min.js" />
/// <reference path="http://code.jquery.com/ui/1.10.3/jquery-ui.js" />
/// <reference path="Global.js" />
/// <reference path="https://rawgithub.com/mrdoob/three.js/master/build/three.js" />
/// <reference path="http://github.com/DmitryBaranovskiy/raphael/raw/master/raphael.js" />
/// <reference path="OrbitControls.js" />
/// <reference path="3DScene.js" />
/// <reference path="http://d3js.org/d3.v3.min.js" />
/// <reference path="http://d3js.org/topojson.v0.min.js" />

var switchGeoType = function (type) { //Function to reload the map and associated data to change the map type (counties/states)
    loadedGeographies = {}; //Clear the loaded objects
    loadedDatasets = []; //Clear the list of data that has been loaded from the census api

    if(scene && (scene.children.indexOf(mapObject) > -1))
        scene.remove(mapObject); //Remove the map from the scene

    mapObject = new THREE.Object3D();//Re-initialize the map object
    currentGeoType = type; //Set the loaded map type
    $('#geoType').val(type); //Set the selectbox in case it is different
    geoInit(); //Load the required census data
    loadMap(); //Load the map
};

var mathSubmitClicked = function () { //Callback for the refresh map data button
    $('#loadingDialog').dialog('open'); //Display the loading dialog
    var geoType = $('#geoType').val();
    if (geoType != currentGeoType) { //The user has selected a new map type
        setTimeout(function () { //Give the dialog time to open before doing time-consuming operations
            switchGeoType(geoType);
        }, 20);
    }
    else { //The user did not select a new map type
        setTimeout(function () { //Let the dialog open
            scene.remove(mapObject); //Remove the map object from the scene
            mapObject = new THREE.Object3D(); loadMap(); //Reset and load the map
        }, 20);
    }
};

var geographyEquation;

//Function to evaluate a geography's value based on the user's formula
//NOTE: Must call loadEquationFromInput first
var processGeographyValue = function (geo) {

    if (geographyEquation)
        //Return the final value
        return eval(geographyEquation);
    else
        return -1;
};

var loadEquationFromInput = function () {
    var error = false;

    //Get the user input
    var input = $('#mathBox').attr('value');

    input = input.replace(/\s/g, '');
    var resultValue = input.replace(new RegExp("[\$]?[A-Za-z_][A-Za-z0-9_.]*", "igm"), function (match, i) { //Find variables and accessor strings (find groups of letters, underscores and periods)
        if (match.indexOf('Math.') == 0) //No error checking here, no support for aggregate functions
            return match;

        if (input[i + match.length] == '(') { //If the string is trying to compute something, don't evaluate it as a census variable
            //delay resolving the function until eval time
            return "math_function(\"" + match + "\")";
        }

        if (loadedDatasets.indexOf(match ) == -1)
            if (loadData(match.replace('$', '')) == false) {
                error = true;
                return;
            }

        if (match.indexOf('$') == 0) {
            var values = [];
            $.each(loadedGeographies, function (index, value) {
                values.push(value[match.replace('$', '')]);
            });

            return '[' + values.toString() + ']';
        }

        return '(geo["' + match + '"])';
    });
    console.log("equation = " + String(resultValue));

    if (error)
        geographyEquation = undefined;
    else
        geographyEquation = resultValue;
}

var isLoadingMap = false;
var mapLoadErrors = [];

//Function to load the map
var loadMap = function () {
    if (isLoadingMap) //If the loadMap function is already running, 
        return;

    mapLoadErrors = [];

    console.log('Loading map...');
    //Sets the variable indicating that the loadMap function is running to true
    isLoadingMap = true;

    //Find the min and max values in the map
    var min = Infinity, max = 0;

    loadEquationFromInput();

    for (var i in loadedGeographies) { //Loop through all of the loaded geographies, even if they are just data
        var processedGeographyValue = processGeographyValue(loadedGeographies[i]); //Get the value of the geography based on  the user's formula
        if (processedGeographyValue != -1) { //The formula evaluated successfully
            min = Math.min(min, processedGeographyValue); //Evaluate min value
            max = Math.max(max, processedGeographyValue); //Evaluate max value
        }
    }

    $.ajax({ //Get the svg
        type: "GET",
        url: svgIndex[currentGeoType],
        dataType: "xml",
        async:true,
        success: function (xml) {

            //Get the svg element in the xml
            var svg = $(xml).find('svg');

            //Find the width and height of the svg
            mapHeight = svg.attr('height').replace('px', '');
            mapWidth = svg.attr('width').replace('px', '');

            //Find the total number of paths in the SVG
            var totalPaths = $(xml).find('svg path').length;

            $(xml).find('svg path').each(function (index, value) { //Loop through each path
                //Get the id for the path
                var id = $(this).attr('id');

                //Handle ids that start with a 0
                if ((currentGeoType == geoType.county && id.length == 4) || (currentGeoType == geoType.state && id.length == 1))
                    id = '0' + id.toString();

                if (id != undefined && ((currentGeoType == geoType.county && id.length == 5) || (currentGeoType == geoType.state && id.length == 2)) && loadedGeographies[id] != undefined) { //Make sure that the path has an id
                    id = getGEOID(id);

                    //Get the path
                    var pathStr = $(this).attr('d');

                    //Convert the path to absolute coordinates and then split the path in to individual parts
                    var path = Raphael.parsePathString(Raphael._pathToAbsolute(pathStr));

                    //Create the shape to draw in to

                    var shapes = [];

                    var shapeIndex = -1;

                    //Loop through the path and draw it
                    for (var i = 0; i < path.length; i++) {
                                                
                        switch (path[i][0]) {
                            case 'M': //Move to
                                shapes.push(new THREE.Shape());
                                shapeIndex++;
                                shapes[shapeIndex].moveTo(path[i][1] + mapOffset.x, path[i][2] + mapOffset.y);
                                break;

                            case 'C': //Absolute curve
                                shapes[shapeIndex].bezierCurveTo(path[i][1] + mapOffset.x, path[i][2] + mapOffset.y, path[i][3] + mapOffset.x, path[i][4] + mapOffset.y, path[i][5] + mapOffset.x, path[i][6] + mapOffset.y);
                                break;

                            case 'L': //Absolute line
                                shapes[shapeIndex].lineTo(path[i][1] + mapOffset.x, path[i][2] + mapOffset.y);
                                break;

                            case 'Z': //Close path
                            case 'z':
                                shapes[shapeIndex].closePath();
                                break;
                        }
                    }

                    //Get a value for the geography
                    var processedGeographyValue = processGeographyValue(loadedGeographies[id]);
                    var extrude;
                    if (processedGeographyValue == -1 || processedGeographyValue == undefined) { //Make sure that the value evaluated successfully
                        extrude = 0;
                        mapLoadErrors.push(errorStrings.evalError.replace('{geographyName}', loadedGeographies[id].name));
                    }
                    else //Calculate the amount to extrude based on the user's formula
                        extrude = scale(processedGeographyValue, min, max, 20, 750);

                    //Calculate a color for the geography based on the user's formula
                    var color = new THREE.Color(0xffffff);
                    color.setHSL(0.7 - scale(processedGeographyValue, min, max, 0, 0.7), 0.5, 0.5);

                    //Set the mesh
                    loadedGeographies[id].mesh = new THREE.Object3D();

                    //Set the target extrusion for the animation
                    loadedGeographies[id].targetExtrusion = extrude;

                    //Set the current extrusion to be used for the animation
                    loadedGeographies[id].currentExtrusion = 0;

                    for (var i in shapes) {//Iterate through the generated shapes
                        if (shapes[i].actions.length > 1) {
                            try{
                                //Create a mesh with a geometry and a material
                                loadedGeographies[id].mesh.add(new THREE.Mesh(new THREE.ExtrudeGeometry(shapes[i], { amount: extrude, bevelEnabled: false }), new THREE.MeshLambertMaterial({ color: color })));
                            }
                            catch (e) {
                                console.log(e);
                            }
                        }
                    }

                    //Store data about the shape in the object's userData
                    loadedGeographies[id].mesh.userData['geographyName'] = loadedGeographies[id].name;
                    loadedGeographies[id].mesh.userData['value'] = processedGeographyValue;                    
                    loadedGeographies[id].mesh.userData['geoType'] = loadedGeographies[id].geotype;
                    

                    //Add the geography to the map object
                    mapObject.add(loadedGeographies[id].mesh);
                }
                else
                    console.log('ID: ' + id + ' Geography:' + loadedGeographies[id]);
                
            });

            //Set the rotation and scale of the map
            mapObject.rotation.set(degToRad(90), 0, 0);
            mapObject.scale.set(0.1, 0.1, 0.1);

            //Add the map to the scene
            scene.add(mapObject);

            //Close the loading dialog
            $('#loadingDialog').dialog('close');

            mapLoaded = true;

            initiateAnimations()

            //Unlocks everything by flagging that we have completed the load
            isLoadingMap = false;

            if (mapLoadErrors.length > 0) {
                if (mapLoadErrors.length > 5) {
                    var len = mapLoadErrors.length;
                    mapLoadErrors.splice(4);
                    mapLoadErrors.push('...and ' + (len - 4) + ' more');
                }

                logError('Errors occurred. See below for details.\n' + mapLoadErrors.join('\n\t'));
            }
        },
        error: function (XHR, textStatus, errorThrown) {
            logError(errorStrings.shapeDefError);
        }
    })
};

//Degrees to Radians Conversion
var degToRad = function (value) {
    return value * degToRadRatio;
}

//Radians to degrees conversion
var radToDeg = function (value) {
    return value * radToDegRatio;
}

Object.size = function (obj) { //Object size
    var size = 0, key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) size++;
    }
    return size;
};

var initiateAnimations = function () {
    for (var i in loadedGeographies) {
        new TWEEN.Tween(loadedGeographies[i].mesh.position)
            .to({ z: -loadedGeographies[i].targetExtrusion }, 1500)
            .easing(TWEEN.Easing.Quadratic.Out)
            .start();
    }
}

var helpResize = function () {
    $('#helpDialog').height(window.innerHeight * 0.65);
    $('my-selector').dialog('option', 'position', 'center');
    $("#helpAccordion").accordion("refresh");    
};

$(document).ready(function () { //Document is ready
    //Get the desired geography type from URL or fallback to the selectbox
    var geoType = getQuerystring('geoType') || $('#geoType').val();

    //Set the height of the container to the full window height
    $('#container').height(window.innerHeight - 10);

    //Create the help dialog
    $('#helpDialog').dialog({
        autoOpen: false,
        resize: helpResize,
        open: function () {
            pauseRender();
            helpResize();
        },

        close: resumeRender,
        title: 'Math Box Help',
        width: '60%', height: 500
    });

    //Create the help accordion
    $('#helpAccordion').accordion({ heightStyle: "fill" });

    //Create and display the loading dialog
    $('#loadingDialog').dialog({ title: 'Loading...', dialogClass: 'no-close', modal: true });

    //Use Deferred to ensure properties are loaded before they are accessed
    //Associate properties with dataSets
    $.when(uscbPropertyInit())
    .then(function () {
        console.log('Completed parsing properties.');
        //Set internal machinery to use the desired geography type.
        switchGeoType(geoType);

        //Load the scene
        loadScene();
        
    });

});
