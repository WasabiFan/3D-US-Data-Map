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

    if(scene && scene.children.contains(mapObject))
        scene.remove(mapObject); //Remove the map from the scene

    mapObject = new THREE.Object3D();//Re-initialize the map object
    currentGeoType = type; //Set the loaded map type
    geoInit(); //Load the required census data
    loadMap(); //Load the map
};

var mathSubmitClicked = function () { //Callback for the refresh map data button
    $('#loadingDialog').dialog('open'); //Display the loading dialog
    if ($('#geoSelect')[0].selectedIndex != geoTypeToSelectedIndex(currentGeoType)) { //The user has selected a new map type
        setTimeout(function () { //Give the dialog time to open before doing time-consuming operations
            switchGeoType(selectedIndexToGeoType($('#geoSelect')[0].selectedIndex));
        }, 20);
    }
    else { //The user did not select a new map type
        setTimeout(function () { //Let the dialog open
            scene.remove(mapObject); //Remove the map object from the scene
            mapObject = new THREE.Object3D(); loadMap(); //Reset and load the map
        }, 20);
    }
};

//Function to scale a number from a source scale to a destination scale
var scale = function (value, oldMin, oldMax, newMin, newMax) {
    value -= oldMin;
    value /= oldMax - oldMin;
    value *= newMax - newMin;
    value += newMin;
    return value;
}

//Function to evaluate a geography's value based on the user's formula
var processGeographyValue = function (geo) {

    //Get the user input
    var input = $('#mathBox').attr('value');

    ////Create a regular expression to find the limits of the variable name in a string
    //var regexVarName = new RegExp('[^A-Za-z0-9_{}]*$');

    ////Split the user input
    //var inputParts = input.split('geo.');

    ////Remove the first index, because that cannot contain an identifier that we need to process
    //inputParts.splice(0, 1);

    //for (var x in inputParts) {//Iterate through the user's split input

    //    //Get the identifier 
    //    var prop = inputParts[x].substring(0, regexVarName.exec(inputParts[x]).index);

    //    if (loadedDatasets.indexOf(prop) == -1) //Check if the data has been loaded previously
    //        loadData(prop); //Load the new data

    //    if(prop.indexOf('{') != -1 || prop.indexOf('}') != -1) //Check if the identifier contains braces. meaning that the user specified a new identifier to use
    //        prop = prop.substring(property.indexOf('{') + 1,property.indexOf('}')); //Remove everything accept the identifier

    //    if (geo == undefined || geo[prop] == undefined || geo[prop] == null) //Make sure that everything worked
    //        return -1;
    //}

    var resultValue = input.replace(new RegExp("[A-Za-z_][A-Za-z0-9_]*", "igm"), function (match, v) {
        
        if (loadedDatasets.indexOf(match) == -1)
            loadData(match);

        return '(' + (geo[match] || match) + ')';
    });

    //Return the final value
    return eval(resultValue);
};

var isLoadingMap = false;

//Function to load the map
var loadMap = function () {
    if (isLoadingMap) //If the loadMap function is already running, 
        return;
    console.log('Loading map...');
    //Sets the variable indicating that the loadMap function is running to true
    isLoadingMap = true;

    //Find the min and max values in the map
    var min = Infinity, max = 0;

    for (var i in loadedGeographies) { //Loop through all of the loaded geographies, even if they are just data
        var processedGeographyValue = processGeographyValue(loadedGeographies[i]); //Get the value of the geography based on  the user's formula
        if (processedGeographyValue != -1) { //The formula evaluated successfully
            min = Math.min(min, processGeographyValue(loadedGeographies[i])); //Evaluate min value
            max = Math.max(max, processGeographyValue(loadedGeographies[i])); //Evaluate max value
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
                    if (processedGeographyValue == -1) { //Make sure that the value evaluated successfully
                        extrude = 0;
                        console.log('Warning: A property used in the eval formula does not exist.');
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

                if (index == totalPaths - 1) {
                    //Set the rotation and scale of the map
                    mapObject.rotation.set(degToRad(90), 0, 0);
                    mapObject.scale.set(0.1,0.1,0.1);

                    //Add the map to the scene
                    scene.add(mapObject);

                    //Close the loading dialog
                    $('#loadingDialog').dialog('close');

                    mapLoaded = true;
                    allAnimationsComplete = false;

                    //Start the animate loop
                    animateLoop();
                }
                //Sets the variable indicating that the loadMap function is in progress to false
                isLoadingMap = false;
            });
        }
    })
};

//Degrees to Radians Conversion
var degToRadRatio = 0.0174532925199432957692369076848861271344287188854172545609719144017100911460344944368224156963450948221230449250737905924838546922752810123984742189340471173191682450150107695616975535812386053051687886912711720870329635896026424901877043509181733439396980475940192241589469684813789632978181124952292984699278144795310454160084495609046069671761964687105143908889518362808267803695632452608441195089412947626131431088441838454784298996256210728062141559692354442374975963993652929160623774343500663840546315186802258702393667855274799734707621705676658941316820585512065349620930688037489914870522507333364895952514642268210320630153210533842979843262303802272290275190563697199187280599571093847717974556664228451612331159113023231100757209709517220028817067297222222131832113886169985096267560906588612469969741494905702362350458519149168625662843787278333507657708493699307400465634478732092730405755458527246041970485064420159104575210421875108765658765585120623711478500107104256177550512023344385449736511170304770182159218675187879331568350108446405658498277542979033300771736095654182415507306420825402358563927552823862950936762658660504172132319702081385517736392244495983426174389436045778492131200197983758894706121219053088677719264879858302680854431929269283558196369233780371347726082849628537612721619561375120114275890225446563899639514076801668643757791527581847995233292922459440155376797487868667185651202289995810350835015899054141983708324361416366032607055316162622822083850164184509185832622375331124248925861062215657488764087020544857030140436808434356531926271720987377433337869281112008069399565178734154019452302331864919342297842075141785193096769414913251295772633007963030431245381251054642749197894401067899126252791903160426210583033425192600277145957377321449210243545998220926747450052993543686719482225790284733617632943605338007138257052533568998071390122814510350374682145668844163613729095210386719798020662071525986925420775689660603657369221989632804334866116636986893275070526022130699761656990145584582744873706637681582366748721716813340910802080850281566860902913986077758412857211621703291718734538692306428325465967255438108876276416607231208551581563237149103830154119777325329180330775523947220695815602554848535816436036324263123479227729144891735771355025069118697209043377650871746444316673867560524538603808658244797412337345879360480453247557139223157929969570414871049736229917919441925929323554803144228686382568365414249890866313031565240228473059781637747283144227445846048872827396981618714846041607808894527961589884926717826375606545829921611650828315332514520308321216284988045649055497151258822492086889681693197507354424525084652568575807936580266403659323391730075263096640172968175894563109418679524608471385399283896986966866126663022430111517254363281233243747100471027204628969206326041774639246123247399502693389187256371148606626566177663330670078870190486357813541395762121787777688389773308989704174593957763830050399249679553420441400449730363901401755771218341227431229880886479940988171279948321782074817899031255536750078972392668802651919400144745259218066749857936151806592555674024116010595027018429702758414105877570475611417117036599833231309707576891809525505716503563339498400348913279986639759842094467796548329778179475486843131078992951397062251829343990343673659295643288800824934953581700531959483095671764261759571727676060640445408370626381017904843528940855365139561575439729832678285801167041724081506128562595063166159213979990638998342508398250952431431213064202826939443881110132630307129535305980439918660734788082757340718504992059122481958837273082300919436636757621126165666350551360497642849049477351295894294428449135198514749410132844069985909262810200230156326835113236057643880690968983495182031211632074689059485940062232850112946556653450561669162740084226902471442431499105290482487951308481;
var degToRad = function (value) {
    return value * degToRadRatio;
}

//Radians to degrees conversion
var radToDegRatio = 57.295779513082320876798154814105170332405472466564321549160243861202847148321552632440968995851110944186223381632864893281448264601248315036068267863411942122526388097467267926307988702893110767938261442638263158209610460487020506444259656841120171912057738566280431284962624203376187937297623870790340315980719624089522045186205459923396314841906966220115126609691801514787637366923164107126774038514690165499594192515711986479435210661624389035202306756177796757113315683506205731313360156501348898018788709917776439181159316920013902979768260829323055339702618166049092959328208315499579803195596700711825205846643923179985845671916843991775413165295995305640627904496724872253434072473833065185879008820107193548552060485006842647349075605874388567532932178246602124233132734272129445308916676167146720232313749578448798177290672690849780135188662743955055918580693033438067368971726946398338854651991326756774825764934169233811138243323053208224198516454139597947256714009404178469615156053582157920460213545201901074162102935129261609789844003532238204473276282720909209180171145108905646530208200979123059094023542240418735583708743755384573586329102199472789559821891579523806600517990464578282704945450774576147586229973787943091750642774039848329080615313745597942275155601788148491851894045960939513997198453064355562698180269696033647840185484538981726986038648245358469739466928493874410348419338670826807976466071601804527844317125267416517826117277993857283514535275841382648354898368971954748747942507185719709447566116440117720726362127222472988677461927657595804933383101587608878870095550372645766455563368979539087275993407638846395723135987079792261365385929945673182976018543449376236493162885372501652480562709083094605665945625107099403161908559287259204759085113744496282219561728074051789812133099369970324357691395511633716219273108331509936077800662768516345100374220246196814323220495858888640986043914983747723652484574010381605176839073750058601371498405359642507492781644644190121732551044420397732774741320232751262156675842396231194621847549485685478987579571126983889948718308133490835157019238930664640940596818013843960173669083410375261878587938980076436281892960841778275647074485954160680355133364287619561679420056757716493862578546227081881795684966308392742344713351978118135839374608910272310085338584830102463755620872552970631825281319312337365283290599842519062236556912719990312424402507421309437789027520997038979061332289935044221797356600093343521601891581555584587964656688117715862427044927286062981382067193161017863158253947123135104153039915542996143494810231621952631198538198082143167177922061432944306758841812979138068828858121444512279416007879516138974880659146247947922820706911174048413758621322393219472473052451007496346226959172219846537259723358667499909535079121975390196501172036056581358429972904107985289467826308237392025105394229635882961542482252345622657240377279916049230825460830054057186290990752852667238667620694932212016599084814321691343080601050679642924710758514156768352724363749884404310516155751495092862112800909039697964915993603942411327579094756322456222304583338544424263364008422882518116632048516264956985679353143222949107710215113055633652382003514094439116845895120113434414107638130916146242969144711310519229195679684502418858044391418192652992595780079018527631932581437181452787622968919599977783130636643687190850726980757129323209636572185536948599218784526538307155643930571274643094269840822675092174964370541197821549917747163347415986605665899424997907532508624674001222485690135901101882760684975301175002511367947090662189745921024990427965466094295057965461358464876420719211578544788260854033850092352196897777549978283293857094706622041399100756319508046624955790623793874641296262002365729375623004180362001938688528549279054526808385121808280498314618933705056559784850825675063381118790;
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

var animateLoop = function () {//Second loop to animate the geographies in to place

    //Make sure that the animation is not complete
    if (allAnimationsComplete)
        return;

    var complete = 0; //Store the number of complete animations

    for (var x in loadedGeographies) { //Loop through all of the loaded geographies

        //If the geography does not have a mesh, meaning that only data was loaded for it, just increment the counter
        if (loadedGeographies[x].mesh == undefined)
            complete++;
        else {
            if (loadedGeographies[x].currentExtrusion < loadedGeographies[x].targetExtrusion) { //The animation is still in progress
                var increment = (loadedGeographies[x].targetExtrusion - loadedGeographies[x].mesh.position.z) / 10; //Calculate the amount to increment the position
                loadedGeographies[x].mesh.position.z -= increment; //Increment both the physical position and the logical extrusion
                loadedGeographies[x].currentExtrusion += increment;
            }

            if (loadedGeographies[x].currentExtrusion >= loadedGeographies[x].targetExtrusion - 2) { //Animation for the current geographies is complete
                complete++; //Increment the counter
                loadedGeographies[x].mesh.position.z = -loadedGeographies[x].targetExtrusion; //Move the geography
                loadedGeographies[x].currentExtrusion = loadedGeographies[x].targetExtrusion; //Set currentExtrusion to targetExtrusion because the animation is complete
            }
        }
    }

    if (complete >= Object.size(loadedGeographies)) //Check if all of the geographies are done
        allAnimationsComplete = true;


    if (!allAnimationsComplete)//If the animations are still in progress, continue the loop
        requestAnimationFrame(animateLoop);
    else
        console.log('Animation complete');//Otherwise, exit

}

$(document).ready(function () { //Document is ready
    //Get the query string of the url and set it to selected
    var selected = getQuerystring('geotype') || $('#geoSelect').find(':selected').text();
    
    if (selected != '') {
        var geoType = geoTypeToSelectedIndex(selected);
        $('#geoSelect')[0].selectedIndex = geoType;
        
        switchGeoType(selectedIndexToGeoType(geoType));
    }
    //Set the height of the container to the full window height
    $('#container').height(window.innerHeight - 10);

    //Create the help dialog
    $('#helpDialog').dialog({ autoOpen: false, title: 'Available Properties for Each Geography', width: 900, height: 750 });

    //Create and display the loading dialog
    $('#loadingDialog').dialog({ title: 'Loading...', dialogClass: 'no-close', modal: true });

    //Load the scene
    loadScene();
});