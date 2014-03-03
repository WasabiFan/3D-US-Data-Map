﻿var loadStateData = function (callback, error) {
    if (typeof preloadedStateData != 'undefined') {
        console.log('Using cached state data');
        callback(preloadedStateData);
    }
    else {
        console.log('Loading state data');
        return $.ajax({
            url: 'Data/StateData.csv',
            dataType: 'text',
            async: false,
            success: callback,
            error: error
        });
    }
}

var loadCountyData = function (callback, error) {
    if (typeof preloadedCountyData != 'undefined')
        callback(preloadedCountyeData);
    else {
        return $.ajax({
            url: "Data/CountyData.txt",
            dataType: 'text',
            async: false,
            success: callback,
            error: error
        });
    }
}

var loadInitProperties = function (data, callback) {    

    if (typeof preloadedInitProps != 'undefined' && typeof preloadedInitProps[data] != 'undefined') {
        var deferred = $.Deferred();
        deferred.resolve(preloadedInitProps[data]);
        callback(preloadedInitProps[data]);
        return deferred.promise();
    }
    else
        return $.getJSON(data, callback);
}

var preloadedStateData = "";