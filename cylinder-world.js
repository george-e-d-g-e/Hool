// import three.js
var THREE 			= require('three');
// import modules
var GLTFLoader 			= require('three-gltf-loader');
var OrbitControls 		= require('three-orbitcontrols');
//var TrackballControls 	= require('three-trackballcontrols');
var TWEEN = require('@tweenjs/tween.js');

var camera, scene, controls, renderer, raycaster;

var canvas =  document.getElementById("pot");
var fsButton =  document.getElementById("fs-btn");
var desc = document.get
var mouse = new THREE.Vector2(), INTERSECTED;
var mousePressed = false;
var mouseMoving = false;
var timer = 0; 


var selectedBox = "Click & hold on a box";
var fastTraveling = false;

var theFont = "";
var info = "";

var history = {};
var products = []; // array for quick animation

var mobile = true;
var mobileWidth = window.matchMedia("(max-width: 700px)");
checkMedia(mobileWidth); // Call listener function at run time


function checkMedia(x) {
  if (x.matches) { // If media query matches
    mobile = false;
  } else {
    mobile = true;
  }
}

init();
animate();

function init() {

	// CAMERA
	camera = new THREE.PerspectiveCamera( 65, window.innerWidth/window.innerHeight, 1, 1000 );
	camera.position.set( 0, 10, -20);

	// ORBIT CONTROLS
	/*
	controls = new OrbitControls( camera, canvas);
	controls.target.set( 0, 0, 0 );
	controls.update();
	*/

	// TRACKBALL CONTROLS
	//controls = new TrackballControls( camera );
	controls = new OrbitControls( camera );
	controls.target.set( 0, 5, 1 );
	controls.rotateSpeed = 1;
	controls.zoomSpeed = 1.2;
	controls.panSpeed = 0.8;
	controls.enableZoom = true;
	controls.enablePan = false;
	controls.enableDamping  = true;
	controls.dampingFactor = 0.3;
	controls.keys = [ 65, 83, 68 ];
	controls.addEventListener( 'change', render );

	// SCENE 
	scene = new THREE.Scene();
	scene.background = new THREE.Color( 0x000000 ); 

	// Product Geomotrys
	var box = new THREE.BoxBufferGeometry( 5, 5, 3 );
	var icosahedron = new THREE.IcosahedronBufferGeometry(5, 0);
	var cone = new THREE.ConeBufferGeometry( 5, 3, 3 );

	// List of products attributes
	var productGeometrys = [ box, icosahedron, cone ];
	var productTypes = [ "Pot", "Print", "Mug", "Jewellerey" ]; 
	
	
	// ADD GEOMETRY
	var columnGeometry = new THREE.CylinderBufferGeometry( 5, 5, 30, 32, 10);
	for ( var i = 0; i < 8; i ++ ) {

		// Generate Varibles

		var pos = new THREE.Vector3( Math.random() * 50 - 25, -30, Math.random() * 150);
		var height = 1 + (Math.random() * 2);

		// COLUMN

		var column = new THREE.Mesh( columnGeometry, new THREE.MeshLambertMaterial( { 
			color: 0x666666
			//emissive: 0xffffff
		 } ) );
		column.position.x = pos.x;
		column.position.y = pos.y;
		column.position.z = pos.z;
		column.scale.y = height;

		column.castShadow = true;
		column.receiveShadow = true;

		// scene.add(column);

		// PRODUCT
		
		var p = createRandomProduct(productTypes, productGeometrys);

		var product = new THREE.Mesh( p.geometry, new THREE.MeshPhongMaterial( { 
			color:   	 0xd3d3d3,
			emissive:  	0x000000,
			specular:  	Math.random() * 0xffffff,
    		shininess:  80
		 } ) );
		product.productPrice = p.price;
		product.productType = p.type;

		product.rotation.x = Math.random() * 2 * Math.PI;
		product.rotation.y = Math.random() * 2 * Math.PI;
		product.rotation.z = Math.random() * 2 * Math.PI;

		product.position.x = pos.x;
		product.position.y = pos.y + (15 * height) + 5; // raise above collum
		product.position.z = pos.z;

		product.startPositionY = pos.y + (15 * height) + 5;

		product.castShadow = true;
		product.receiveShadow = true;

		// scene.add(product);
		products.push( product ); // Add to array for animating

		// ADD as a group
		var group = new THREE.Group();
		group.add( column );
		group.add( product );

		scene.add( group );
		
	}

	// TEXT

	var loader = new THREE.FontLoader();
	loader.load( '/assets/fonts/Montserrat_Bold.json', function ( font ) {
		theFont = font;
		var message = "Hool\ntext tests";
		var shapes = font.generateShapes( message,0);

		var geometry = new THREE.ShapeBufferGeometry( shapes );
		var matDark = new THREE.MeshLambertMaterial( {
			color: 0xffffff,
			emissive: 0xffffff
			// side: THREE.DoubleSide
		} );
		geometry.computeBoundingBox();
		// center
		var xMid = - 0.5 * ( geometry.boundingBox.max.x - geometry.boundingBox.min.x );
		geometry.translate( xMid, 0, 0 );
		info = new THREE.Mesh( geometry, matDark );

		info.name = 'text'; // for identifing with raycaster

		info.position.z = 0;
		info.visible = false;
		// Animation vars
		info.acc = new THREE.Vector3();
		info.vel = new THREE.Vector3();
		scene.add( info );
		//console.log(scene);

	} );


	// LIGHTS
	scene.add( new THREE.HemisphereLight(  0x0f050f, 0x000000, 1));
	//var light = new THREE.DirectionalLight( 0xffffff, 2 );
	// light.position.set( 1, 1, -1 ).normalize();
	// scene.add( light );
	scene.add( new THREE.AmbientLight( 0xffffff ,0.75));

	// Light from above
	directionalLight = new THREE.DirectionalLight(  0x9f959f, 1);
	directionalLight.position.set(20, 20, 0);
	directionalLight.target.position.set(0, 0, 0);
 
	directionalLight.castShadow = true;
	 
	directionalLight.shadow.camera.near = 0;
	directionalLight.shadow.camera.far = 150;
	 
	directionalLight.shadow.camera.left = -150;
	directionalLight.shadow.camera.right = 0;
	directionalLight.shadow.camera.top = 50;
	directionalLight.shadow.camera.bottom = -150;

	directionalLight.shadow.mapSize.width = 1024; // default is 512
	directionalLight.shadow.mapSize.height = 1024; // default is 512

	//var helper = new THREE.CameraHelper( directionalLight.shadow.camera );
	//scene.add( helper );

	scene.add( directionalLight );

	// RAYCASTER 
	raycaster = new THREE.Raycaster();

	// RENDERER
	renderer = new THREE.WebGLRenderer( { antialias: true } );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	// renderer.gammaInput = true;
	// renderer.gammaOutput = true;

	// renderer.shadowMap.enabled = true;
	// renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap

	// var helper = new THREE.CameraHelper( light.shadow.camera );
	// scene.add( helper );

	canvas.appendChild( renderer.domElement );

	// EVENT LISTENERS 
	document.addEventListener( 'mousedown',  onDocumentMouseDown, false );
	document.addEventListener( 'mouseup', 	 onDocumentMouseUp, false );
	document.addEventListener( 'mousemove', onDocumentMouseMove, false );

	document.body.addEventListener( 'touchstart', onDocumentTouchStart, {capture: true, passive: true});
 	document.body.addEventListener( 'touchend' ,  onDocumentTouchEnd, {capture: true, passive: true});
 	document.body.addEventListener( 'touchmove',  onDocumentTouchMove, {capture: true, passive: true});

	window.addEventListener( 'resize', onWindowResize, false );

	render();

	console.log(scene);
}

var delta = 0;

function animate() {

	
	delta += 0.001;
	
	for (var i = products.length - 1; i >= 0; i--) {
		products[i].rotation.x += 0.001 * Math.PI;
		products[i].rotation.y += 0.0001 * Math.PI;
		products[i].rotation.z += 0.0005 * Math.PI;
		products[i].position.y = products[i].startPositionY +  1 + (Math.sin( delta + i ) * 1.4);
	}
	
	
	TWEEN.update();
	controls.update();
	animateText();
	render();

	requestAnimationFrame( animate );

}

function render() {

	// find intersections
	findIntersection();
	// HOVER TIMER
	if(mousePressed){
		if (INTERSECTED) {
			timer += 0.05;
			
			// Make glow
			var c = new THREE.Color( 0x999999 );
			INTERSECTED.children[0].material.emissive.lerp(c,timer); // Column
			INTERSECTED.children[1].material.emissive.lerp(c,timer); // Product


			if(timer > 1){
				mouseDown = false;
				timer = 0;
				// Animate Target Change
				// If not tweening camera
				if (fastTraveling === false){
					var cylinderHeight = 15 * INTERSECTED.children[0].scale.y; // Column Scale

					// Point Camera
					var targetTween = new TWEEN.Tween(controls.target);
					var camTargetPos = INTERSECTED.children[0].position.clone(); // Column Position
					camTargetPos.y +=  cylinderHeight + 3;
					targetTween.to(camTargetPos,1500);
					targetTween.easing(TWEEN.Easing.Quartic.InOut);
					targetTween.onComplete(function() {

						// Show text
						info.visible = true;
						
						// Update text
						//document.getElementById("button-text").innerHTML = "Type: "+selectedBox.productType+" £"+selectedBox.productPrice;
						// Update info
						var message = ""+selectedBox.productType+"\n£"+selectedBox.productPrice;
						var shapes = theFont.generateShapes( message, 1 );
						var geometry = new THREE.ShapeBufferGeometry( shapes );
						//geometry.computeBoundingBox();
						//var xMid = - 0.5 * ( geometry.boundingBox.max.x - geometry.boundingBox.min.x ); // center
						var xMid = -1; // left
						var zMid =  10 ;
						geometry.translate( xMid, -5, zMid );
						// change it
						info.geometry = geometry;
						fastTraveling = false;
						// var offset = new THREE.Vector3();
						// offset.copy(controls.target);
						// offset.normalize();
						info.position.copy(camera.position);
					});
					targetTween.start();

					// Camera Position
					var posTween = new TWEEN.Tween(camera.position);
					var distance = camera.position.clone();
					var target = INTERSECTED.children[0].position.clone(); // Column
				
					target.y += cylinderHeight + 2;

					distance.sub(target);
					distance.normalize();
					distance.multiplyScalar(-30);
					
					target.sub(distance);

					posTween.to(target,2000);
					posTween.easing(TWEEN.Easing.Quartic.InOut);
					posTween.start();

					// make sure dont repeat tweens while holding down.
					fastTraveling = true;
					selectedBox = INTERSECTED.children[1]; // Product

					// Add selected box to history
					var message = selectedBox.productType+" - £"+selectedBox.productPrice;
					//logHistory(message);
					// document.getElementById("button-text").innerHTML = "Type: "+selectedBox.productType+" £"+selectedBox.productPrice;
					
				}
			}
		}
	}
	else {
		// reset timer
		//INTERSECTED.material.emissive.setHex(INTERSECTED.currentHex);
		timer = 0;
	}
	

	renderer.render( scene, camera );
}

function animateText(){
	// TO DO: make universal function
	if (info){
		// add animation class
		if (fastTraveling === false){

			// Get desired position
			info.acc = controls.target.clone();
			// Get desired force
			info.acc.sub(info.position); // differece
			info.acc.sub(info.vel);
			info.acc.clampLength(0,1); // limit maxForce	
			// Update Vel
			info.vel.add(info.acc);
			info.vel.multiplyScalar(0.9); // Add risistance
			info.vel.clampLength(0,5); // limit max speed
			// Update Position
			info.lookAt(camera.position);
			info.position.add(info.vel);
			
			//info.position.copy(controls.target);
			//info.position.lerp(camera.position, 0.5); // becuase camera goes to fixed distance this works
		}
	}
}

function findIntersection() {
	raycaster.setFromCamera( mouse, camera );
	var intersects = raycaster.intersectObjects( scene.children, true ); // recursive : true to sift through groups

	if ( intersects.length > 0 ) {
		if ( INTERSECTED != intersects[ 0 ].object.parent ) { // check not the same
			
			if (intersects[ 0 ].object.name != 'text'){  // check not text

				// Reset emmisive 
				if ( INTERSECTED ) { 
					// Reset Colour
					for (var i = INTERSECTED.children.length - 1; i >= 0; i--) {
						INTERSECTED.children[i].material.emissive.setHex( INTERSECTED.children[i].currentHex );
					}
				}
				
				// Set INTERSECTED
				INTERSECTED = intersects[ 0 ].object.parent; 
				
				// Change emissive value
				for (var i = INTERSECTED.children.length - 1; i >= 0; i--) {
					INTERSECTED.children[i].currentHex = INTERSECTED.children[i].material.emissive.getHex();
					INTERSECTED.children[i].material.emissive.setHex( 0x333333 );
				}	

			}

		}
	} else {

		if ( INTERSECTED ) { 
			// Reset  emmisive
			for (var i = INTERSECTED.children.length - 1; i >= 0; i--) {
				INTERSECTED.children[i].material.emissive.setHex( INTERSECTED.children[i].currentHex );
			}
		}

		INTERSECTED = null;

	}
}

function createRandomProduct(types, geometrys){

	// Creates random product from arrays of possible values

	function pickRandom(array) {
		var i = Math.floor(Math.random() * array.length);
		return array[i];
	}
	
	var type = pickRandom(types);
	var geometry = pickRandom(geometrys);
	var price = Math.floor(Math.random() * 200);

	var product = {
		type : type,
		geometry : geometry,
		price : price
	}
	
	return product;
}

function onDocumentMouseDown( event ) {
	event.preventDefault();
	mousePressed = true;
	// mobLog(mouse.x);

}

function onDocumentMouseUp( event ) {
	event.preventDefault();
	mousePressed = false;
}

function onDocumentMouseMove( event ) {
	event.preventDefault();
	mousePressed = false;
	mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
	mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
}

function onDocumentTouchStart( event ) {
	//event.preventDefault();
	mouse.x = ( event.touches[0].pageX / window.innerWidth ) * 2 - 1;
	mouse.y = - ( event.touches[0].pageY / window.innerHeight ) * 2 + 1;
	mousePressed = true;
	console.log('START');
}

function onDocumentTouchEnd( event ) {
	//event.preventDefault();
	mousePressed = false;
	console.log('END');
}

function onDocumentTouchMove( event ){
	//event.preventDefault();
	// TO:DO count 6 pixels to count as move
	mousePressed = false;
	console.log('MOVE');
}

function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	renderer.setSize( window.innerWidth, window.innerHeight );
}

function logHistory(string){
	var node = document.createTextNode(string);
	var para = document.createElement("a");
	para.appendChild(node);
	document.getElementById("history").appendChild(para);
}



