/// <reference path="http://code.jquery.com/jquery-1.9.1.min.js" />
/// <reference path="https://rawgithub.com/mrdoob/three.js/master/build/three.js" />
/// <reference path="OrbitControls.js" />
/// <reference path="Census.js" />

var framesInLastSecond = 0; //Variable to store fps
setInterval(function () {//Update the fps counter each second

    if (!shouldRender) {
        $('#fps').html('');
        return;
    }


	$('#fps').html(framesInLastSecond);
	framesInLastSecond = 0;
}, 1000);

var loadScene = function () { //Function to load the basic scene
	
	//Load the map
	//loadMap();

	//Get the container
	$container = $('#container');
	
	// Scene size
	WIDTH = $container.width();
	HEIGHT = $container.height();

	// Camera settings
	var VIEW_ANGLE = 45,
		ASPECT = WIDTH / HEIGHT,
		NEAR = 0.1,
		FAR = 10000;

    // Create a renderer and camera

	if (Detector.webgl)
	    renderer = new THREE.WebGLRenderer({ canvas: document.getElementById("displayCanvas") });
	else {
	    showWarningBox('Your browser doesn\'t support WebGL. <a href="http://get.webgl.org/">Learn more</a>');
	    renderer = new THREE.CanvasRenderer({ canvas: document.getElementById("displayCanvas") });
	}

	camera = new THREE.PerspectiveCamera(VIEW_ANGLE,
									ASPECT,
									NEAR,
									FAR);

	//Create the scene
	scene = new THREE.Scene();

	//Set the camera's initial position
	camera.position.set(0, 700, 500);

	//Add the camera to the scene
	scene.add(camera);

    //Resizes the container when you resize the window
	$(window).resize(handleResize);
	handleResize();
    
	//Add the renderer dom element to the page
	//$container.append(renderer.domElement);

	//Create a white light and point it at the map
	light = new THREE.DirectionalLight(0xffffff);
	light.position.y = 300;
	light.lookAt(mapObject);

	//Create a directional light to illuminate the user's view
	camLight = new THREE.DirectionalLight(0xffffff, 1);

	//Add the lights to the scene
	scene.add(light);
	scene.add(camLight);

	//Setup the orbit controls and give it the camera
	controls = new THREE.OrbitAndPanControls(camera, document.getElementById('container'));

	//var cube = new THREE.Mesh(new THREE.CubeGeometry(100, 100, 100), new THREE.MeshNormalMaterial());
	//scene.add(cube);

	console.log('Starting render loop');
	
	//Initiate the render loop
	render();
};

var shouldRender = true;
var render = function () { //Render loop
    if (!shouldRender)
        return;

	//Update the orbit
	controls.update();

	//Point the camera towards the map
	camera.lookAt(new THREE.Vector3(0, 0, 0));

	//Move the camera light to the position of the 
	camLight.position = camera.position;

	//Point the camera light towards the scene
	camLight.lookAt(new THREE.Vector3(0, 0, 0));

	//Render the scene
	renderer.render(scene, camera);

	//Register for the next frame
	requestAnimationFrame(render);

	//Increment the frame counter
	framesInLastSecond++;
};

var pauseRender = function () { //Function to pause the render loop to save CPU
    shouldRender = false;
}

var resumeRender = function () { //Function to resume render
    shouldRender = true;

    //Register for the next frame
    requestAnimationFrame(render);
}