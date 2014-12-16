/// <reference path="http://code.jquery.com/jquery-1.9.1.js" />
/// <reference path="http://code.jquery.com/ui/1.10.3/jquery-ui.js" />
/// <reference path="Global.js" />
/// <reference path="DataPlugins.js" />
/// <reference path="https://rawgithub.com/mrdoob/three.js/master/build/three.js" />
/// <reference path="http://github.com/DmitryBaranovskiy/raphael/raw/master/raphael.js" />
/// <reference path="OrbitControls.js" />
/// <reference path="3DScene.js" />
/// <reference path="http://d3js.org/d3.v3.min.js" />
/// <reference path="http://d3js.org/topojson.v0.min.js" />

var switchGeoType = function (type) { //Function to reload the map and associated data to change the map type (counties/states)
    loadedGeographies = {}; //Clear the loaded objects
    loadedDatasets = []; //Clear the list of data that has been loaded from the census api

    if (scene && (scene.children.indexOf(mapObject) > -1))
        scene.remove(mapObject); //Remove the map from the scene

    mapObject = new THREE.Object3D();//Re-initialize the map object

    if (type == geoType.county)
        showWarningBox('County view way render extremely slowly on less-capable hardware.');
    else if(currentGeoType == geoType.county && type == geoType.state)
        hideWarningBox(true);

    currentGeoType = type; //Set the loaded map type
    $('#geoType').val(type); //Set the selectbox in case it is different
    initDataPlugins().then(function () {//Load the required census data
        loadMap(); //Load the map
    });
};

var mathSubmitClicked = function () { //Callback for the refresh map data button
    var geoType = $('#geoType').val();
    if (geoType == currentGeoType) // If the geoType has changed, show the loading dialog
        reloadMap(false);
    else
        reloadMap(true);

};

var reloadMap = function (displayLoadingDialog) {
    if (displayLoadingDialog)
        $('#loadingDialog').dialog('open'); //Display the loading dialog

    setTimeout(function () { //Give the dialog time to open before doing time-consuming operations

        var geoType = $('#geoType').val();
        if (geoType != currentGeoType) { //The user has selected a new map type
            switchGeoType(geoType);
        }
        else { //The user did not select a new map type
            loadEquationGeoData();
            initiateAnimations();
        }
        console.timeEnd('timer');
        if (displayLoadingDialog)
            $('#loadingDialog').dialog('close');//Close the loading dialog
    }, 20);
}

//Global variable to store current equation after it's parsed
var geographyEquation;

//Function to evaluate a geography's value based on the user's formula
//NOTE: Must call loadEquationFromInput first
var processGeographyValue = function (geo) {

    if (geographyEquation)
        //Return the final value
        return eval(geographyEquation);
    else
        //Error
        return -1;
};

//Function to load and parse the user's formula to validate it
var loadEquationFromInput = function () {
    var error = false;

    //Get the user input
    var input = $('#mathBox').attr('value');

    //Remove whitespace
    input = input.replace(/\s/g, '');
    var resultValue = input.replace(new RegExp("[\$]?[A-Za-z_][A-Za-z0-9_.]*", "igm"), function (match, i) { //Find variables and accessor strings (find groups of letters, underscores and periods)
        if (match.indexOf('Math.') == 0) //basic math functions without any modifications or additions
            return match;

        if (input[i + match.length] == '(') { //If the string is trying to compute something, don't evaluate it as a census variable
            //delay resolving the function until eval time
            return "math_function(\"" + match + "\")";
        }

        if (loadedDatasets.indexOf(match) == -1) //Assume it's a dataset, load it if it isn't already
            if (loadDataPluginDataset(match.replace('$', '')) == false) {
                error = true;
                return;
            }

        if (match.indexOf('$') == 0) { //Embed it as an array if it's an aggregate variable (starts with a '$')
            var values = [];
            $.each(loadedGeographies, function (index, value) {
                values.push(value[match.replace('$', '')]);
            });

            return '[' + values.toString() + ']';
        }

        return '(Number(geo["' + match + '"]))'; //Return the processed string to load the property at eval time; also converts it to a number
    });
    console.log("equation = " + String(resultValue));

    if (error) //There was an error, reset the value
        geographyEquation = undefined;
    else { //Everything worked, save the result and add the equation to the hash
        geographyEquation = resultValue;
        window.location.hash = encodeURIComponent($('#mathBox').attr('value'));
    }
}

var isLoadingMap = false;
var mapLoadErrors = [];

var loadEquationGeoData = function () {
    //Find the min and max values in the map
    var min = Infinity, max = 0, numberValidGeographies = 0;

    loadEquationFromInput();

    for (var i in loadedGeographies) { //Loop through all of the loaded geographies, even if they are just data
        var processedGeographyValue = processGeographyValue(loadedGeographies[i]); //Get the value of the geography based on  the user's formula
        if (processedGeographyValue != -1 && !isNaN(processedGeographyValue)) { //The formula evaluated successfully
            min = Math.min(min, processedGeographyValue); //Evaluate min value
            max = Math.max(max, processedGeographyValue); //Evaluate max value
            numberValidGeographies++;
        }
    }

    for (var id in loadedGeographies) {
        if (loadedGeographies[id].mesh == undefined)
            continue;

        var isValid = true;

        //Get a value for the geography
        var processedGeographyValue = processGeographyValue(loadedGeographies[id]);

        var extrudeLength;
        if (processedGeographyValue == -1 || processedGeographyValue == undefined || isNaN(processedGeographyValue) || numberValidGeographies <= 0) { //Make sure that the value evaluated successfully
            extrudeLength = 0;
            processedGeographyValue = scale(0.5, 0, 1, min, max);
            isValid = false;
            mapLoadErrors.push(errorStrings.evalError.replace('{geographyName}', loadedGeographies[id].name));
        }
        else //Calculate the amount to extrude based on the user's formula
            extrudeLength = scale(processedGeographyValue, min, max, 20, 750);

        //Calculate a color for the geography based on the user's formula
        var color = new THREE.Color(0xffffff);
        color.setHSL(0.7 - scale(processedGeographyValue, min, max, 0, 0.7), 0.5, 0.5);

        //$(loadedGeographies[id].mesh.children).each(function (key, value) { value.material.color = color });

        loadedGeographies[id].mesh.userData['value'] = processedGeographyValue;
        loadedGeographies[id].mesh.userData['calculatedColor'] = color;
        loadedGeographies[id].mesh.userData['isValid'] = isValid;
        //Set the target extrusion for the animation
        loadedGeographies[id].targetExtrusion = extrudeLength;
    }
}

//Function to load the map
var loadMap = function () {
    if (isLoadingMap) //If the loadMap function is already running, we don't need to do it twice
        return;

    mapLoadErrors = [];

    console.log('Loading map...');
    //Figuratively lock the function so that we can make sure we aren't loading twice
    isLoadingMap = true;

    //Stop rendering, because the user can't see it
    pauseRender();

    $.ajax({ //Load the svg
        type: "GET",
        url: svgIndex[currentGeoType],
        dataType: "xml",
        accepts: "image/svg+xml",
        async: false,
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

                if (id != undefined
                        && ((currentGeoType == geoType.county && id.length == 5)
                            || (currentGeoType == geoType.state && id.length == 2))
                        && loadedGeographies[id] != undefined) { //Make sure that the path has an id

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
					
					//Removes duplicates from shapes array
					for(var i = 0; i < shapes.length; i++){
						for(var j = 0; j < shapes[i].actions.length; j++){
							if(j > 0){
								//Check if the point on the action is the same as the last point
								if(Math.sqrt(Math.pow(shapes[i].actions[j].args[0] - shapes[i].actions[j - 1].args[0],2)+Math.pow(shapes[i].actions[j].args[1] - shapes[i].actions[j - 1].args[1],2))==0){
									//remove the action from the shape
									var rest = shapes[i].actions.slice(j + 1 || shapes[i].actions.length);
									shapes[i].actions.length = j < 0 ? shapes[i].actions.length + j : j;
									shapes[i].actions.push.apply(shapes[i].actions, rest);
									j--;
								}
							}
						}
					}

                    //Set the mesh
                    loadedGeographies[id].mesh = new THREE.Object3D();

                    //Set the current extrusion to be used for the animation
                    loadedGeographies[id].currentExtrusion = 0;

                    for (var i in shapes) {//Iterate through the generated shapes
                        if (shapes[i].actions.length > 1) {
                            try {
                                //Create a mesh with a geometry and a material
                                loadedGeographies[id].mesh.add(new THREE.Mesh(new THREE.ExtrudeGeometry(shapes[i], { amount: 1, bevelEnabled: false }), new THREE.MeshLambertMaterial({ color: new THREE.Color(0xffffff) })));
                            }
                            catch (e) {
                                logError(e);
                            }
                        }
                    }

                    //Store data about the shape in the object's userData
                    loadedGeographies[id].mesh.userData['geographyName'] = loadedGeographies[id].name;
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

            loadEquationGeoData();

            //Add the map to the scene
            scene.add(mapObject);

            //Resume rendering now that there's something to see
            resumeRender();

            //Close the loading dialog
            $('#loadingDialog').dialog('close');

            //Indicate that we loaded the map
            mapLoaded = true;

            initiateAnimations()

            //Unlock by flagging that we have completed the load
            isLoadingMap = false;

            if (mapLoadErrors.length > 0) { //Concatenate and display any load errors
                if (mapLoadErrors.length > 5) {
                    var len = mapLoadErrors.length;
                    mapLoadErrors.splice(4);
                    mapLoadErrors.push('...and ' + (len - 4) + ' more');
                }

                logError('Errors occurred. See below for details.\n' + mapLoadErrors.join('\n\t'));
            }
        },
        error: function (XHR, textStatus, errorThrown) { //Politely handle errors
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

//Function to animate the shapes
var initiateAnimations = function () {
    for (var i in loadedGeographies) {
        //Workaround for mesh load error
        if (loadedGeographies[i].mesh == undefined)
            continue;

        var extrusion = loadedGeographies[i].targetExtrusion;
        var r = loadedGeographies[i].mesh.userData.calculatedColor.r,
            g = loadedGeographies[i].mesh.userData.calculatedColor.g,
            b = loadedGeographies[i].mesh.userData.calculatedColor.b

        if (!loadedGeographies[i].mesh.userData.isValid) {
            extrusion = 1;
        }
        $(loadedGeographies[i].mesh.scale).animate({ z: extrusion }, { duration: 1500 });
        $(loadedGeographies[i].mesh.position).animate({ z: -extrusion }, { duration: 1500 });

        for (var j in loadedGeographies[i].mesh.children) {
            $(loadedGeographies[i].mesh.children[j].material.color).animate({
                r: r,
                g: g,
                b: b
            }, { duration: 1500 });
        }
    }
}

//Function callback to handle resizing the help dialog
var helpResize = function () {
    $('#helpDialog').dialog('option', 'position', 'center');
    $("#helpAccordion").accordion("refresh");
};

$(document).ready(function () { //Document is ready
    if (document.cookie.indexOf("prevVisit") == -1) {
        showWarningBox("Welcome! Check out the help button to the right to get started.", 'info');
        setTimeout(function () {
            console.log("hiding");
            hideWarningBox(true);
        }, 10000);
        document.cookie = "prevVisit=true";
    }

    //Get the desired geography type from URL or fallback to the selectbox
    var geoType = getQuerystring('geoType') || $('#geoType').val();

    handleResize();

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

    $('.equationLink').each(function (key, linkDiv) {
        var content = $(linkDiv).html();
        var $linkAnchor = $('<a></a>');

        $linkAnchor.attr('href', 'javascript:loadEquationLink("' + content + '")');
        $linkAnchor.html(content);

        $(linkDiv).empty();
        $(linkDiv).append($linkAnchor);
    });

    //Create and display the loading dialog
    $('#loadingDialog').dialog({ title: 'Loading...', dialogClass: 'no-close', modal: true });

    if (window.location.hash && window.location.hash.replace('#', '').length > 0)
        $('#mathBox').attr('value', decodeURIComponent(window.location.hash.replace('#', '')));

    registerGlobalPlugins();

    //Use Deferred to ensure properties are loaded before they are accessed
    //Associate properties with dataSets
    $.when(setupDataPlugins())
        .then(function () {
            $.when(initDataPlugins()).then(function () {
                console.log('Completed parsing properties.');
                //Load the scene
                loadScene();

                //Set internal machinery to use the desired geography type.
                switchGeoType(geoType);

                handleResize();
            })
        });
});

var loadEquationLink = function (equation) {
    //Close the loading dialog
    $('#helpDialog').dialog('close');

    $('#mathBox').attr('value', equation);
    reloadMap(false);
}

//Function to load all data source plugins
var registerGlobalPlugins = function () {
    registerDataPlugin('US Census', {
        setup: uscbPropertyInit,
        init: censusGeoInit,
        validateProperty: validateCensusProperty,
        loadDataset: loadCensusDataProperty
    });

    registerDataPlugin('UCR Crime Database', {
        setup: setupCrimePlugin,
        init: initCrimePlugin,
        validateProperty: validateCrimePluginProperty,
        loadDataset: loadCrimeDataset
    });
}