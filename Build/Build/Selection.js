/// <reference path="http://code.jquery.com/jquery-1.9.1.min.js" />
/// <reference path="http://code.jquery.com/ui/1.10.3/jquery-ui.js" />
/// <reference path="Global.js" />
/// <reference path="https://rawgithub.com/mrdoob/three.js/master/build/three.js" />

var hovered = []; //Array to store the list of geographies that are being hovered over
var prevselected, selected; //The currently selected and previously selected geographies

$(document).mousemove(function (e) {

    //Get the mouse position, using magical math from the three.js example
    var vector = new THREE.Vector3((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1, 0.5);

    //Translate the point(I think)
    projector.unprojectVector(vector, camera);

    //Create a raycaster (using more magic) to help find things in the way of the mouse
    var raycaster = new THREE.Raycaster(camera.position, vector.sub(camera.position).normalize());

    //Use the raycaster to find everything that is in the way of the mouse
    var intersects = raycaster.intersectObjects(mapObject.children,true);
    
    //Look through all of the previously-found geographies
    for (var x in hovered) {

        //Check if the mouse was over this geography before
        var contains = false;
        for(var y in intersects)
            contains = contains || x == y.parent;

        //Un-Highlight the object if it wasn't found this time and is not selected
        if (!contains && hovered[x] != selected)
            $(hovered[x].children).each(function (key, value) { value.material.color = hovered[x].userData['color'] });
    }

    //Reset the array
    hovered = [];

    if (intersects.length > 0) { //If the raycaster found objects, iterate through all of the geographies in the hovered state
        for (var x in intersects[0].object.parent.children) {

            if (intersects[0].object.parent.children[x].parent != selected) { //Make sure that this one isn't already selected
                intersects[0].object.parent.userData['color'] = intersects[0].object.parent.children[x].material.color; //Set the overall color to the curret path's color
                intersects[0].object.parent.children[x].material.color = intersects[0].object.parent.children[x].material.color.clone().add(new THREE.Color(0x111111));//Highlight the shape

                if (hovered.indexOf(intersects[0].object.parent) == -1) //Add the current shape to the list of highlighted shapes
                    hovered.push(intersects[0].object.parent);
            }
        }
    }
});

var colorObject3D = function(object,color) {//Function to color all of the meshes in an Object3D
    $(object.children).each(function (key, value) { value.material.color = color });
}

$(document).ready(function () {

    //Register for click
    $('#container').click(function (e) {
        $('#mathBox').blur();

        if (selected != undefined) { //Reset the currently selected shape
            colorObject3D(selected, selected.userData['color']);
        }

        if (hovered.length > 0) {

            if (selected == undefined) {//Show the properties window  
                //$('#dataBox').fadeIn({ duration: 50, queue: false });
                //$('#dataBox').addClass('dataBox-extended', { easing: 'easeOutExpo', duration: 550, queue: false/*duration: 400, easing: 'swing', queue: false*/ });
                $('#dataBox').animate({
                    height: 140,
                    borderBottomWidth: 0,
                    borderTopWidth: 0,
                    borderRightWidth: 150
                }, { easing: 'easeOutExpo', duration: 550, queue: false/*duration: 400, easing: 'swing', queue: false*/ });

                $('#dataBox-inner').fadeIn({ duration: 550, queue: false });
                //$('#dataBox').animate({ 'bottom': '10px' }, { duration: 100, easing: 'swing', queue:false} );
            }

            prevselected = selected;
            selected = hovered[0]; //Shift the selected shapes to their new variables

            $('#selectedName').html(selected.userData['geographyName']); //Set the text in the box
            $('#selectedInfo').html(selected.userData['value'].toLocaleString());


            if (selected != undefined) { //Color the newly selected shape
                colorObject3D(selected, selected.userData['color'].clone().offsetHSL(0, 0, -0.3));
            }
        }
        else {
            //The mouse is not over any geography, reset
            selected = undefined;
            $('#dataBox-inner').fadeOut({ duration: 300 });

            //A bit ugly code-wise, but it works
            $('#dataBox').animate({ 'marginRight': '-150px' }, {
                easing: 'easeOutExpo', duration: 400, complete: function () {
                    document.getElementById('dataBox').removeAttribute('style');
                }
            });


        }
    });
});
