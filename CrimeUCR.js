//http://ucrdatatool.gov/offenses.cfm
var crimeAPIVariables = {
    1: { varName: "violentCrimeTotal", description: "Violent crime total" },
    2: { varName: "murder", description: "Murder and nonnegligent manslaughter" },
    3: { varName: "forcibleRape", description: "Forcible rape" },
    4: { varName: "robbery", description: "Robbery" },
    5: { varName: "aggravatedAssault", description: "Aggravated assault" },
    6: { varName: "propertyCrimeTotal", description: "Property crime total" },
    7: { varName: "burglary", description: "Burglary" },
    8: { varName: "larcenyTheft", description: "Larceny-theft" },
    9: { varName: "motorVehicleTheft", description: "Motor vehicle theft" },
    10: { varName: "violentCrimeRate", description: "Violent crime rate" },
    11: { varName: "murderRate", description: "Murder rate" },
    12: { varName: "forcibleRapeRate", description: "Forcible rape rate" },
    13: { varName: "robberyRate", description: "Robbery rate" },
    14: { varName: "aggravatedAssaultRate", description: "Aggravated assault rate" },
    15: { varName: "propertyCrimeRate", description: "Property crime rate" },
    16: { varName: "burglaryRate", description: "Burglary rate" },
    17: { varName: "larcenyTheftRate", description: "Larceny-theft rate" },
    18: { varName: "motorVehicleTheftRate", description: "Motor vehicle theft rate" }
}

var crimeAPIGeoNames = {
    52: "United States-Total",
    1: "Alabama",
    2: "Alaska",
    3: "Arizona",
    4: "Arkansas",
    5: "California",
    6: "Colorado",
    7: "Connecticut",
    8: "Delaware",
    9: "District of Columbia",
    10: "Florida",
    11: "Georgia",
    12: "Hawaii",
    13: "Idaho",
    14: "Illinois",
    15: "Indiana",
    16: "Iowa",
    17: "Kansas",
    18: "Kentucky",
    19: "Louisiana",
    20: "Maine",
    21: "Maryland",
    22: "Massachusetts",
    23: "Michigan",
    24: "Minnesota",
    25: "Mississippi",
    26: "Missouri",
    27: "Montana",
    28: "Nebraska",
    29: "Nevada",
    30: "New Hampshire",
    31: "New Jersey",
    32: "New Mexico",
    33: "New York",
    34: "North Carolina",
    35: "North Dakota",
    36: "Ohio",
    37: "Oklahoma",
    38: "Oregon",
    39: "Pennsylvania",
    40: "Rhode Island",
    41: "South Carolina",
    42: "South Dakota",
    43: "Tennessee",
    44: "Texas",
    45: "Utah",
    46: "Vermont",
    47: "Virginia",
    48: "Washington",
    49: "West Virginia",
    50: "Wisconsin",
    51: "Wyoming",
}
var crimeData = {};

var setupCrimePlugin = function () {
    //Indexes properties in object to scheck

    $.ajax('Data/UCR2012.csv', {
        async: false
    }).done(function (data) {
        var csv = d3.csv.parse(data);
        var index = 0;
        for (var i in csv) {
            if (index != 0) {
                crimeData[csv[i]["State"]] = csv[i];
            }

            index++;
        }
    });
}

var initCrimePlugin = function () {

}

var validateCrimePluginProperty = function (propertyName) {
    if (currentGeoType == geoType.state) {
        for (var i in crimeAPIVariables) {
            if (crimeAPIVariables[i].varName == propertyName)
                return true;
        }
    }

    return false;
}

var loadCrimeDataset = function (dataset) {
    //var stateIDs;
    var index = -1;
    //for (var i in crimeAPIGeoNames) {
    //    stateIDs += i.toString();
    //}

    if (currentGeoType == geoType.state) {
        for (var i in crimeAPIVariables) {
            if (crimeAPIVariables[i].varName == dataset)
                index = i;
        }
    }

    if (index == -1)
        return false;

    for (var i in loadedGeographies) {
        if (crimeData.hasOwnProperty(loadedGeographies[i].name))
            loadedGeographies[i][dataset] = crimeData[loadedGeographies[i].name][index];
        else
            logError('No data for property ' + dataset + ' in geography ' + loadedGeographies[i].name, false);
    }

    //var index = 
    //if (currentGeoType == geoType.state) {
    //    for (var i in crimeAPIVariables) {
    //        if (crimeAPIVariables[i].varName == dataset)
    //            return true;
    //    }
    //}
}