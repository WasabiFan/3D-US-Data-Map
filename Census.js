/// <reference path="http://code.jquery.com/jquery-1.9.1.min.js" />
/// <reference path="http://code.jquery.com/ui/1.10.3/jquery-ui.js" />
/// <reference path="Global.js" />
/// <reference path="https://rawgithub.com/mrdoob/three.js/master/build/three.js" />
/// <reference path="http://github.com/DmitryBaranovskiy/raphael/raw/master/raphael.js" />
/// <reference path="OrbitControls.js" />
/// <reference path="http://d3js.org/d3.v3.min.js" />
/// <reference path="http://d3js.org/topojson.v0.min.js" />

var censusVariables = {// A JSON object to store the basic API variables
    totalPopulation: 'P0010001',
    malePopulation: 'P0120002',
    femalePopulation: 'P0120026',
    whitePopulation: 'P0030002',
    blackPopulation: 'P0030003',
    americanIndianPopulation: 'P0030004',
    asianPopulation: 'P0030005',
    pacificIslanderPopulation: 'P0030006',
    nonDefinedRacePopulation: 'P0030007',
    multipleRacePopulation: 'P0030008',
    under18Population: 'B09001_001E',
    medianYearlyEarnings: 'B08521_001E',
    commuteTime: 'B08536_001E',
    medianAnnualHouseholdIncome: 'B19013_001E',
    medianNumberOfRooms: 'B25018_001E',
    monthlyHousingCost: 'B25105_001E',
    medianAgeMale: 'B01002_002E',
    medianAgeFemale: 'B01002_003M',
    nativePopulation: 'B05012_002E',
    foreignPopulation: 'B05012_003E',
    medianPublicTransportationToWorkAge: 'B08103_004E',
    onePersonHouseholds: 'B08201_007E',
    twoPersonHouseholds: 'B08201_013E',
    threePersonHouseholds: 'B08201_019E',
    fourOrMorePersonHouseholds: 'B08201_025E',
    familyHouseholds: 'B11001_002E',
    nonFamilyHouseholds: 'B11001_007E',
    medianAgeAtFirstMarriageMale: 'B12007_001E',
    medianAgeAtFirstMarriageFemale: 'B12007_002E',
    povertyInLast12Months: 'B16009_001E',
    medianHouseholdIncome: 'B19013_001E',
    annualPerCapitaIncome: 'B19301_001E',
    mobileHomePopulation: 'B25024_010E',
    homelessPopulation: 'B25024_011E',
    aggregateNumberOfVehiclesAvailible: 'B25046_001E',
};

var stateIDTable = {};

var censusPropURL = function (year, dataSet) {
    // Seems like CORS is broken for this call
    //return "http://api.census.gov/data/" + year + "/" + dataSet + "/variables.json"
    // Use a cached copy instead
    return "Data/Variables" + year + dataSet + ".js";
}

var censusURL = function (year, dataSet, getFor, censusName) {
    // Constructs the API URL given a subset of parameters the URL may take.
    // censusName is optional.
    if (arguments.length == 3) {
        // No censusName
        censusName = '';
    } else {
        // censusName needs to be modified a little
        censusName = ',' + censusName;
    }
    return "https://api.census.gov/data/" + year + "/" + dataSet + "?key=" + APIKey + "&get=NAME" + censusName + "&for=" + getFor + ":*";
}

var censusGeoInit = function () {// Loads the basic census data
    $.ajax({// Request the names of all th counties
        url: censusURL(USCB.YEAR, USCB.ACS, currentGeoType == geoType.county ? USCB.COUNTY : USCB.STATE),
        dataType: 'json',
        async: false,
        success: function (data) {// Load the response data into loadedGeographies
            // Iterate through each object in the census API response (strip header)
            $.each(data.slice(1), function (key, val) {
                if (currentGeoType == geoType.county)// Add a new object to loadedGeographies with the name of the current item
                    loadedGeographies[val[1] + val[2]] = { name: val[0], geotype: 'county' };
                else {
                    loadedGeographies[val[1]] = { name: val[0], geotype: 'state' };
                    stateIDTable[val[0]] = val[1];
                }
            });
        },
        error: function (XHR, textStatus, errorThrown) {
            logError(errorStrings.censusError);
        }
    });

    if (currentGeoType == geoType.county) {// Check if geoType is county
        loadCountyData(function (data) {
            var countyData = d3.tsv.parse(data);
            for (var i in countyData) {// Iterate through each row in countyData
                //Set the water area property of the county to the water area from countyData
                loadedGeographies[countyData[i]['GEOID']]['waterArea'] = countyData[i]['AWATER'];
                //Set the land area property of the county to the land area obtained in countyData
                loadedGeographies[countyData[i]['GEOID']]['landArea'] = countyData[i]['ALAND'];
                loadedGeographies[countyData[i]['GEOID']]['totalArea'] = parseInt(countyData[i]['ALAND']) + parseInt(countyData[i]['AWATER']);
            }
            //Note that we have loaded land and water area
            loadedDatasets.push('landArea', 'waterArea', 'totalArea');
        },
            function (XHR, textStatus, errorThrown) {
                logError(errorStrings.areaLoadingError);
            }
        );
    }
    else {// If the geoType is state, load the basic state info
        loadStateData(function (data) {
            $.each(data, function (key, val) {
                $.extend(loadedGeographies[stateIDTable[key]], val);
            });
            loadedDatasets.push('landArea', 'waterArea', 'totalArea');
        },
        function (XHR, textStatus, errorThrown) {
            logError(errorStrings.areaLoadingError);
        });
    }
};

// Find and associate variables with datasets
var uscbPropertyInit = function () {
    var deferred = $.Deferred();
    // Parse available datasets
    var deferreds = $([USCB.ACS, USCB.SF1]).map(function (i,dataSet) {
        return loadInitProperties(censusPropURL(USCB.YEAR, dataSet), function (d) {
            // this would be nicer with .each if that could be done?
            console.log('Parsing properties for ' + dataSet);
            for (key in d.variables)
                // skip geographical keys
                if (d.variables[key] && d.variables[key].concept && d.variables[key].concept.toUpperCase().substring(0,10) !== 'GEOGRAPHIC ') USCB.PROPS[key.toUpperCase()] = dataSet;
            console.log('Done parsing properties for ' + dataSet);
        });
    });
    // This function is complete when its sub commands are complete.
    //http://stackoverflow.com/a/6162959/1867779
    $.when.apply(null, deferreds).then(function () {deferred.resolve();});
    return deferred.promise();
}

var loadCensusData = function (censusName, friendlyName) {
    // Determines which dataset to call from and updates loadedDatasets.
    // Also evaluates for some common errors.
    console.log("Loading Census dataset for (" + censusName + "," + friendlyName + ")");

    // Define two basic variables that correspond to the census dataset and the _loadCensusData response respectively
    var dataSet, dataGetOut;

    var upperPropertyValue = censusName.toUpperCase();
    if (upperPropertyValue in USCB.PROPS) dataSet = USCB.PROPS[upperPropertyValue];
    else {// Bail if dataSet couldn't be found
        logError("Cannot determine what data set to draw from given the property called (" + upperPropertyValue + ")", false);
        return;
    }

    // Retrieve the data.
    dataGetOut = _loadCensusData(censusName, friendlyName, dataSet);

    // If _loadCensusData API call failed, go home empty handed.
    if (dataGetOut == -1) {
        logError("Failed to load census data given censusName (" + censusName + "), friendlyName (" + friendlyName + ") and dataSet (" + dataSet +")", false);
        return;
    }

    // Add the new variable to loadedDatasets, establishing the link
    loadedDatasets.push(friendlyName);
}

var loadCensusDataProperty = function (property) {// Function to load the census data for the specified property and add the result to allobjects in loadedGeographies

    if (property.indexOf('}') != -1 && property.indexOf('{') != -1) {// If property is a variable linkage, get the data and apply the link
        // Get the new variable name for the parameter from property
        var newVarName = property.toUpperCase().substring(property.indexOf('{') + 1, property.indexOf('}'));
        // Get the raw census variable name for the requested parameter
        var censusName = property.substring(0, property.indexOf('{'));

        loadCensusData(censusName, newVarName);
    }
    else {// If property is a regular variable name, get the data from the census API and add it to loadedGeographies

        //Property is a variable name
        var rawCensusProperty = false;

        var upperPropertyValue = property.toUpperCase();
        if (censusVariables[property] == undefined && (upperPropertyValue in USCB.PROPS)) {// If property is a raw census variable, set rawCensusVariable to true
            rawCensusProperty = true;
        }
        else if (censusVariables[property] == undefined) {// If property isn't a rawCensusProperty and the variable doesn't exist in censusVariables, exit
            logError("Invalid rawCensusProperty: " + property);
            return false;
        }

        if (rawCensusProperty) {// Switch on the raw census variable to find it's dataset
            loadCensusData(property, property);
        }
        else {
            loadCensusData(censusVariables[property], property);
        }
    }
};

var _loadCensusData = function (censusName, friendlyName, dataSet) {// Internal function to load the census data

    //Make sure that the census name is all capitalized, as their servers are case-sensitive
    censusName = censusName.toUpperCase();

    $.ajax({// Get the data for the property from the census api
        url: censusURL(USCB.YEAR, dataSet, currentGeoType == geoType.county? USCB.COUNTY : USCB.STATE, censusName),
        dataType: 'json',
        async: false,
        success: function (data) {// When the ajax request finishes, add the response data to loadedGeographies

            var i = 0;
            $.each(data, function (key, val) { //Loop through all of the returned data
                if (i == 0) {//Don't evaluate the header
                    i++;
                    return;
                }

                if (currentGeoType == geoType.county) // Add the ajax response data to loadedGeographies
                    loadedGeographies[val[2] + val[3]][friendlyName] = val[1];
                else
                    loadedGeographies[val[2]         ][friendlyName] = val[1];
            });
        },
        error: function (message) {//Report any AJAX errors
            logError(errorStrings.censusError)
        }
    });
};

var validateCensusProperty = function (propertyName) {
    return propertyName in censusVariables || propertyName in USCB.PROPS;
}

var getGEOID = function (SVGID) {// Function to get the GEOID associated with an ID
    return SVGID;
};
