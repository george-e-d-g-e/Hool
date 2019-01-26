// import three.js
var THREE 			= require('three');
// import modules
var GLTFLoader 		= require('three-gltf-loader');
var OrbitControls 	= require('three-orbitcontrols');
//var gravity = require('./gravity');

var canvas =  document.getElementById("pot");
var slider =  document.getElementById("slider-frame");

var sliderValue = slider.value;
var currentPos = 0;
var delta = 0;
var setTime = false;

var morph;

slider.oninput = function() {
    sliderValue =  this.value;	
   
}

var loader, mixer, clock;
var camera, controls, renderer, scene;
var light1, light2, light3, lightHelper;
var floor, mesh;

init();
render();
animate();

//---------

function init() {

	camera = new THREE.PerspectiveCamera( 45, window.innerWidth/window.innerHeight, 0.01, 5 );
	camera.position.set( 0, 0, 0.4 );

	scene = new THREE.Scene();
	scene.background = new THREE.Color( 0x9a9a9a );

	controls = new OrbitControls( camera, canvas);
	controls.target.set( 0, 0, 0 );
	controls.update();

	clock = new THREE.Clock();

	// LIGHTS

    //scene.add( new THREE.AmbientLight( 0x9aa0ae ,0.2));
   	// scene.add(new THREE.HemisphereLight( 0x9a9a9a , 0x0F0F0F, 0.1) );
    
    // Main spot Light
    light1 = new THREE.SpotLight( 0xdae3f0, 2);
	light1.position.set( -0.6, 0.5, 0.1 );
	light1.castShadow = true;
	light1.angle = 0.99;
	light1.penumbra = 0.2;
	light1.decay = 0.1;
	light1.distance = 2;
	light1.shadow.camera.near = 0.5;
	light1.shadow.camera.far = 1.5;
	light1.shadow.mapSize.width = 2048; // default is 512
	light1.shadow.mapSize.height = 2048; // default is 512
	light1.shadow.bias = - 0.005; // reduces self-shadowing on double-sided objects
	
	// Back light
	light2 = new THREE.SpotLight( 0xf6f3db, 0.5);
	light2.position.set( -0.3  , 0.2, -0.5 );
	light2.angle = 0.5;
	light2.penumbra = 1;
	light2.decay = 0.1;
	light2.distance = 2;	

	// Light from above
	light3 = new THREE.DirectionalLight( 0xf6f3db, 0.5);
	light3.position.set( 0 ,1, 0 );

	// Floor reflection
	var light4 = new THREE.DirectionalLight( 0x9a9a9a, 0.2);
	light4.position.set( 0 ,-0.5, 0 );
	//light2.castShadow = true;	

	scene.add(light1);
	scene.add(light2);
	scene.add(light3);
	scene.add(light4);

	/*
		// Light Helper
		var helper = new THREE.CameraHelper( light1.shadow.camera );
		lightHelper = new THREE.SpotLightHelper( light1 );
		scene.add( helper );
		scene.add(lightHelper);
	*/

	// FLOOR
	var geometry = new THREE.PlaneGeometry( 1, 1 );
	var material = new THREE.ShadowMaterial();
	material.opacity = 0.3; // Shadow opacity

	floor = new THREE.Mesh( geometry, material );
	floor.position.set( 0, -0.093, 0);
	floor.rotation.x = - Math.PI / 2;
	floor.scale.multiplyScalar( 1 );
	floor.castShadow = false;
	floor.receiveShadow = true;
	scene.add( floor );

	floor.visible = true;

	// LOADER

	loader = new GLTFLoader();
	loader.load("/assets/Gravity_anim_V03.gltf", function (gltf) {
		mesh = gltf.scene;  // found the vars was a mesh
		mesh.animations = gltf.animations; // add in animations

		// Create Model
		createScene(mesh, 1);	
	});

	
	// RENDERER

	renderer = new THREE.WebGLRenderer( { canvas: pot, antialias: true } );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight *0.75 );
	renderer.gammaInput = true;
	renderer.gammaOutput = true;

	renderer.shadowMap.enabled = true;

	//Overwrite shadowmap code
	var shader = THREE.ShaderChunk.shadowmap_pars_fragment;
	shader = shader.replace(
		'#ifdef USE_SHADOWMAP',
		'#ifdef USE_SHADOWMAP' +
		document.getElementById( 'PCSS' ).textContent
	);
	shader = shader.replace(
		'#if defined( SHADOWMAP_TYPE_PCF )',
		document.getElementById( 'PCSSGetShadow' ).textContent +
		'#if defined( SHADOWMAP_TYPE_PCF )'
	);
	THREE.ShaderChunk.shadowmap_pars_fragment = shader;

	//renderer.shadowMap.type = THREE.PCFSoftShadowMap; 
	// Shadow Map options are THREE.BasicShadowMap | THREE.PCFShadowMap | THREE.PCFSoftShadowMap
}

function createScene( model, scale) {
	
	// Load Texture
	var textureLoader = new THREE.TextureLoader();
	var mapSpecular = textureLoader.load('/assets/surface-noise.jpg');
	mapSpecular.anisotropy = 4;
	mapSpecular.wrapS = mapSpecular.wrapT = THREE.RepeatWrapping;
	mapSpecular.format = THREE.RGBFormat;

	// Change scale
	model.scale.set(scale,scale,scale);

	// Adjust material
	var m = model.children[ 0 ].material; 
	m.metalness = 0.01;
	m.roughness  = 1;
	m.roughnessMap = mapSpecular;
	m.bumpScale = 0.0001;
	m.bumpMap = mapSpecular;

	// Shadows
	model.children[ 0 ].castShadow = true;
	//model.children[ 0 ].receiveShadow = true;

	// Create values for position animation
	model.children[ 0 ].acc = new THREE.Vector3(0,0,0);
	model.children[ 0 ].vel = new THREE.Vector3(0,0,0);

	// Create values for position animation
	model.children[ 0 ].morphAcc = 0;
	model.children[ 0 ].morphVel = 0;
	model.children[ 0 ].morphPos = 0;

	scene.add( model );

	// Setup Mixer
	mixer = new THREE.AnimationMixer( model );
	var clip = THREE.AnimationClip.findByName( model.animations, 'Tall_Vase_W_Blend_Key|Take 001|BaseLayer' );
	var action = mixer.clipAction( clip );
	action.play();
}

function animate() {
	
	if (mesh){

		var model = mesh.children[ 0 ];  // Select Pot

		// GRAVITY
			// Negative Gravity 
			if(sliderValue > 90){
				//TODO: map acc to slider value
				model.acc = new THREE.Vector3( 0, 0.00001, 0 );
				model.vel.add(model.acc);
				model.position.add(model.vel);
			}
			// Positive Gravity 
			else if((sliderValue < 90) && (model.position.y > -0.09)){
				//TODO: map acc to slider value
				model.acc = new THREE.Vector3( 0, -0.0001, 0 );
				model.vel.add(model.acc);
				model.position.add(model.vel);
			}

			// Stay Still
			else{
				// Translate falling velocity to morph
				if(model.vel.y < 0){
					model.morphVel = model.vel.y * 30;
				}
				//console.log("Stay Still");
				model.acc = new THREE.Vector3( 0, 0, 0 );
				model.vel = new THREE.Vector3( 0, 0, 0 );
			}

		// MORPH

			// Speed Paramaters 
			var maxForce = 0.2; 
			var maxSpeed = 0.5;
			var length = 5.125; // Animation Length
			var target = ((100-sliderValue)  * 0.01  ) * length; // Map Slider Value

			// Check not floating
			if (model.position.y >= -0.09) {
				target = 0; // Map Slider Value; 
			}
			
			// Get desired force
			var difference = target - model.morphPos;
			var desired = difference - model.morphVel;

			// Update Forces
			model.morpAcc 	= value_limit(desired, -maxForce, maxForce);	
			model.morphVel += model.morpAcc;
			model.morphVel *= 0.99; // Add risistance
			model.morphVel = value_limit(model.morphVel, -maxSpeed, maxSpeed);
			
			// Check Edge of animation
			if ((model.morphPos + model.morphVel > length) || (model.morphPos + model.morphVel < 0)){
				model.morphVel *= -1; // Reverses Velocity
			}	

			// Update Mixer
			if (mixer != undefined){
				mixer.update( model.morphVel );
				model.morphPos += model.morphVel; // Keep track of position

				 // console.log("time = " + mixer.time);
				 // console.log("position =" + model.morphPos);
			}
		

	}

	renderer.render( scene, camera );
	requestAnimationFrame( animate );
}

function render() {
	// Put it all in animation not sure that is correct		
}

// Math functions 

function map(value, start1, stop1, start2, stop2) {
    return start2 + (stop2 - start2) * ((value - start1) / (stop1 - start1));
}

function value_limit(val, min, max) {
  return val < min ? min : (val > max ? max : val);
}

