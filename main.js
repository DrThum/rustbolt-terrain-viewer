import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const response = await fetch('/Azeroth_32_32.terrain');
response.blob().then(function (content) {
  let reader = new FileReader();

  reader.addEventListener("loadend", function () {
    const buffer = reader.result;
    console.log(buffer);

    const view = new Uint32Array(buffer.slice(0, 8));
    const textDecoder = new TextDecoder('utf-8');
    console.log('magic as u32: ', view[0]);
    console.log('magic: ', textDecoder.decode(buffer.slice(0, 4)));
    console.log('version: ', view[1]);
    const debug_name = textDecoder.decode(buffer.slice(8, -1)).split('\0').shift();
    console.log('block name: ', debug_name);

    const dataView = new DataView(buffer.slice(4 + 4 + debug_name.length + 1));

    const row = dataView.getUint32(0, true);
    const col = dataView.getUint32(4, true);
    const areaId = dataView.getUint32(8, true);
    const baseHeight = dataView.getFloat32(12, true);
    const holes = dataView.getUint32(16, true);

    console.log('row ', row, ' col ', col, ' area ', areaId, ' base height ', baseHeight, ' holes ', holes);

    const heightMapView = new Float32Array(buffer.slice(4 + 4 + debug_name.length + 1 + 20, 4 + 4 + debug_name.length + 1 + 20 + 145 * 4));
    const heightMap = Array.from(heightMapView);

    console.log('heightMap ', heightMap);
  });

  reader.readAsArrayBuffer(content);
});

const renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

const camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 500 );
camera.position.set( 0, 0, 20 );
camera.lookAt( 0, 0, 0 );

const scene = new THREE.Scene();

const geometry = new THREE.BufferGeometry();

const vertices = new Float32Array([
   0.0, 0.0,  0.0,
	 1.0, -1.0,  1.0,
	 1.0,  1.0,  1.0,

   1.0,  1.0,  1.0,
	-1.0,  1.0,  1.0,
	-1.0, -1.0,  1.0
]);

geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
const mesh = new THREE.Mesh(geometry, material);

scene.add(mesh);

const controls = new OrbitControls( camera, renderer.domElement );

const axesHelper = new THREE.AxesHelper( 5 );
scene.add( axesHelper );

function animate() {
	requestAnimationFrame( animate );

	controls.update();

	renderer.render( scene, camera );
}

animate();
