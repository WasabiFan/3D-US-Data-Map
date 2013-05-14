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

var geoInit = function () {// Loads the basic census data
    if (currentGeoType == geoType.county) {// Check if geoType is county
        $.ajax({// Request the names of all th counties
            url: "http://api.census.gov/data/2010/acs5?key=2b9ee0ef86f98ab8a8d16451067b23081acb2bfa&get=NAME&for=county:*",
            dataType: 'json',
            async: false,
            success: function (data) {// Load the response data into loadedGeographies

                var i = 0;
                // Iterate through each object in the census API response
                $.each(data, function (key, val) {// Loop through all of the returned data
                    if (i == 0) {// Ignore the first object in the file
                        i++;
                        return;
                    }

                    // Add a new object to loadedGeographies with the name of the current county
                    loadedGeographies[val[1] + val[2]] = { name: val[0], geotype:'county' };
                });
            }
        });

        d3.tsv("Data/CountyData.txt", function (error, countyData) {// Use D3 to load the county area data from a tab seperated values file
            for (var i in countyData) {// Iterate through each row in countyData
                //Set the water area property of the county to the water area from countyData
                loadedGeographies[countyData[i]['GEOID']]['waterArea'] = countyData[i]['AWATER'];
                //Set the land area property of the county to the land area obtained in countyData
                loadedGeographies[countyData[i]['GEOID']]['landArea'] = countyData[i]['ALAND'];
            }
            //Note that we have loaded land and water area
            loadedDatasets.push('waterArea', 'landArea');
        });
    }
    else {// If the geoType is state, load the basic state info
        $.ajax({// Get the names of all the states
            url: "http://api.census.gov/data/2010/acs5?key=2b9ee0ef86f98ab8a8d16451067b23081acb2bfa&get=NAME&for=state:*",
            dataType: 'json',
            async: false,
            success: function (data) {// When the ajax finishes, load the response data into loadedGeographies
                var i = 0;
                $.each(data, function (key, val) {//Iterate through all of the returned data
                    if (i == 0) {// Ignore the first line
                        i++;
                        return;
                    }

                    // Add the new object to the array
                    loadedGeographies[val[1]] = { name: val[0], geotype: 'state' };
                });
            }
        });
    }
};

// Initialize the basic data for all of the geographies
geoInit();

var loadData = function (property) {// Function to load the census data for the specified property and add the result to allobjects in loadedGeographies
    // Define two basic variables that correspond to the census dataset and the _loadCensusData response respectively
    var dataSet, dataGetOut;

    if (property.indexOf('}') != -1 && property.indexOf('{') != -1) {// If property is a variable linkage, get the data and apply the link
        // Get the new variable name for the parameter from property
        var newVarName = property.toUpperCase().substring(property.indexOf('{') + 1, property.indexOf('}'));
        // Get the raw census variable name for the requested parameter
        var censusName = property.substring(0, property.indexOf('{'));

        switch (censusName.toUpperCase()[0]) {// Decide which dataset the property is in to construct the request
            case 'B':// If the census variable name starts with B, set dataSet to American Community Survey 5(acs5)
                dataSet = 'acs';
                break;
            case 'P':// If the variable name starts with P, data set is summary file 1(sf1)
                dataSet = 'sf1';
                break;
            default:// If the census variable name doesn't start either B or P, exit the loadData function
                return;
        }

        // Load the data from the census and store the result
        dataGetOut = _loadCensusData(censusName, newVarName, dataSet);

        if (dataGetOut == -1)// If the _loadCensusData API call failed, exit the loadData function
            return;

        // If the load succeeded, add the new variable to loadedDatasets, establishing the link
        loadedDatasets.push(newVarName);
    }

    else {// If property is a regular variable name, get the data from the census API and add it to loadedGeographies

        //Property is a variable name
        var rawCensusProperty = false;

        var upperPropertyValue = property.toUpperCase();
        if (censusVariables[property] == undefined && ((property.length == 11 && upperPropertyValue.indexOf('B') == 0) || (property.length == 8 && upperPropertyValue.indexOf('P') == 0))) {// If property is a raw census variable, set rawCensusVariable to true
            rawCensusProperty = true;
        }
        else if (censusVariables[property] == undefined)// If property isn't a rawCensusProperty and the variable doesn't exist in censusVariables, exit
            return;

        if (rawCensusProperty) {// Switch on the raw census variable to find it's dataset
            switch (property.toUpperCase()[0]) {// Decide which dataset the property is in to construct the request
                case 'B':// If the census variable name starts with B, set dataSet to American Community Survey 5(acs5)
                    dataSet = 'acs';
                    break;
                case 'P':// If the variable name starts with P, data set is summary file 1(sf1)
                    dataSet = 'sf1';
                    break;
                default:// If the census variable name doesn't start either B or P, exit the loadData function
                    return;
            }

            // Load the census data from the census API and set the error output to dataGetOut
            dataGetOut = _loadCensusData(property, property, dataSet);
        }
        else {
            switch (censusVariables[property].toUpperCase()[0]) {// Decide which dataset the property is in to construct the request
                case 'B':// If the census variable name starts with B, set dataSet to American Community Survey 5(acs5)
                    dataSet = 'acs';
                    break;
                case 'P':// If the variable name starts with P, data set is summary file 1(sf1)
                    dataSet = 'sf1';
                    break;
                default:// If the census variable name doesn't start either B or P, exit the loadData function
                    return;
            }

            // Load the census data from the census API and set the error output to dataGetOut
            dataGetOut = _loadCensusData(censusVariables[property], property, dataSet);
        }

        if (dataGetOut == -1)// If the _loadCensusData API call failed, exit the loadData function
            return;
        // If the load worked, add the new variable to loadedDatasets
        loadedDatasets.push(property);
    }
};

var _loadCensusData = function (censusName, friendlyName, dataSet) {// Internal function to load the census data

    //Make sure that the census name is all capitalized, as their servers are case-sensitive
    censusName = censusName.toUpperCase();

    if (currentGeoType == geoType.county) {// If the current geoType is set to county, get the census API data for each county
        $.ajax({// Get the data for the property from the census api
            url: "http://api.census.gov/data/2010/" + dataSet + "?key=2b9ee0ef86f98ab8a8d16451067b23081acb2bfa&get=NAME," + censusName + "&for=county:*",
            dataType: 'json',
            async: false,
            success: function (data) {// When the ajax request finishes, add the response data to loadedGeographies

                var i = 0;
                $.each(data, function (key, val) { //Loop through all of the returned data
                    if (i == 0) {//Don't evaluate the header
                        i++;
                        return;
                    }

                    // Add the ajax response data to loadedGeographies
                    loadedGeographies[val[2] + val[3]][friendlyName] = val[1];
                });
            },
            error: function (message) {//Check for errors and return an error code if there were any
                return -1;
            }
        });
    }
    else {// The data type is state
        $.ajax({// Do a request to find the variable to load
            url: "http://api.census.gov/data/2010/" + dataSet + "?key=2b9ee0ef86f98ab8a8d16451067b23081acb2bfa&get=NAME," + censusName + "&for=state:*",
            dataType: 'json',
            async: false,
            success: function (data) {// When the ajax finishes, add the response data into loadedGeometries

                var i = 0;
                $.each(data, function (key, val) { //Loop through all of the returned data
                    if (i == 0) {// Dont evaluate the first line
                        i++;
                        return;
                    }

                    // Add the response data to loadedGeographies
                    loadedGeographies[val[2]][friendlyName] = val[1];
                });
            },
            error: function (message) {//Return -1 on error
                return -1;
            }
        });
    }
};

var getGEOID = function (SVGID) {// Function to get the GEOID associated with an ID
    return SVGID;
};