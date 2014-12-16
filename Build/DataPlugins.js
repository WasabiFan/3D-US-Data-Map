//Object to store the loaded plugins
var loadedDataPlugins = {};

//Registers a data plugin
/*Options:
    setup: one-time function or functions to be called when the page loads
    init: function or functions to be called when geographies are loaded
    validateProperty: function to take a property name and determine if the plugin has data for it (returns true or false)
    loadDataset: function to load a property in to all geographies
*/
var registerDataPlugin = function (pluginName, options) {

    loadedDataPlugins[pluginName] = options;
}

//Calls all functions registered to the loaded plugins under a specified name, while respecting jQuery promises
var callCommonPluginFunction = function (funcName) {
    var deferred = $.Deferred();
    var deferreds = [];

    //Function to save the promise if a function returns one
    var handleDeferred = function (func) {
        var result = func();
        if (result && typeof result.then === 'function') {
            deferreds.push(result);
        }
    }

    //Loop through all the plugins
    for (var i in loadedDataPlugins) {

        //Call an individual function
        if (loadedDataPlugins[i][funcName] instanceof Function)
            handleDeferred(loadedDataPlugins[i][funcName]);

            //Call each function in an array
        else if (loadedDataPlugins[i][funcName] instanceof Array) {
            for (var func in loadedDataPlugins[i][funcName])
                handleDeferred(loadedDataPlugins[i][funcName][func]);
        }
    }

    if (deferreds.length > 0) {
        $.when.apply(null, deferreds).then(function () {
            deferred.resolve();
        });
    }
    else
        deferred.resolve();

    return deferred.promise();
}

//Function to call setup for all plugins
var setupDataPlugins = function () {
    return callCommonPluginFunction('setup');
}

//Function to call init for all plugins
var initDataPlugins = function () {
    return callCommonPluginFunction('init');
}

//Function to load a dataset from a name
var loadDataPluginDataset = function (datasetName) {
    for (var i in loadedDataPlugins) {
        if (loadedDataPlugins[i].validateProperty(datasetName))
            return loadedDataPlugins[i].loadDataset(datasetName);
    }
    logError('Unable to find candidate plugin for property ' + datasetName);
    return false;
}