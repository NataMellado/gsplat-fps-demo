import * as THREE from "three";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
import { SplatMesh } from "@sparkjsdev/spark";

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0.6, 0, 0.6);

const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const splatURL = "splat_980k_cubo.splat"; 
const miSplat = new SplatMesh({ url: splatURL });
miSplat.rotation.z = Math.PI; 
scene.add(miSplat);

const floorGeo = new THREE.PlaneGeometry(50, 50);
const floorMat = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true, visible: false });
const floorMesh = new THREE.Mesh(floorGeo, floorMat);
floorMesh.rotation.x = -Math.PI / 2;
floorMesh.position.y = -1.5;
scene.add(floorMesh);

const controls = new PointerLockControls(camera, document.body);
document.addEventListener('click', () => { if(!isMobile()) controls.lock(); });

// Variables de estado
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
let lookJoystick = { x: 0, y: 0 };

function isMobile() {
    return /Android|iPhone|iPad/i.test(navigator.userAgent);
}

// Joystick Izquierdo
const managerLeft = nipplejs.create({
    zone: document.getElementById('joystick-left'),
    mode: 'static',
    position: { left: '60px', bottom: '60px' },
    color: 'white'
});

managerLeft.on('move', (evt, data) => {
    const forward = data.vector.y;
    const turn = data.vector.x;
    moveForward = forward > 0.2;
    moveBackward = forward < -0.2;
    moveLeft = turn < -0.2;
    moveRight = turn > 0.2;
});

managerLeft.on('end', () => {
    moveForward = moveBackward = moveLeft = moveRight = false;
});

// Joystick Derecho
const managerRight = nipplejs.create({
    zone: document.getElementById('joystick-right'),
    mode: 'static',
    position: { right: '60px', bottom: '60px' },
    color: 'white'
});

managerRight.on('move', (evt, data) => {
    lookJoystick.x = data.vector.x;
    lookJoystick.y = data.vector.y;
});

managerRight.on('end', () => {
    lookJoystick.x = 0;
    lookJoystick.y = 0;
});

// Teclado
document.addEventListener('keydown', (e) => {
    switch (e.code) {
        case 'KeyW': moveForward = true; break;
        case 'KeyA': moveLeft = true; break;
        case 'KeyS': moveBackward = true; break;
        case 'KeyD': moveRight = true; break;
    }
});
document.addEventListener('keyup', (e) => {
    switch (e.code) {
        case 'KeyW': moveForward = false; break;
        case 'KeyA': moveLeft = false; break;
        case 'KeyS': moveBackward = false; break;
        case 'KeyD': moveRight = false; break;
    }
});

const clock = new THREE.Clock();
const euler = new THREE.Euler(0, 0, 0, 'YXZ');
euler.y = 1;
camera.quaternion.setFromEuler(euler);

const FRICTION = 5.0;
const ACCELERATION = 1;
const MAX_SPEED = 0.4;
const DEADZONE = 0.001;

function animate() {
    requestAnimationFrame(animate);
    let delta = clock.getDelta();
    if (delta > 0.1) delta = 0.1;

    // Rotación con joystick derecho
    if (Math.abs(lookJoystick.x) > 0.05 || Math.abs(lookJoystick.y) > 0.05) {
        euler.setFromQuaternion(camera.quaternion);
        euler.y -= lookJoystick.x * 3 * delta;
        euler.x += lookJoystick.y * 3 * delta;
        euler.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, euler.x));
        camera.quaternion.setFromEuler(euler);
    }

    // Movimiento
    velocity.x -= velocity.x * FRICTION * delta;
    velocity.z -= velocity.z * FRICTION * delta;

    if (Math.abs(velocity.x) < DEADZONE) velocity.x = 0;
    if (Math.abs(velocity.z) < DEADZONE) velocity.z = 0;

    direction.z = Number(moveForward) - Number(moveBackward);
    direction.x = Number(moveRight) - Number(moveLeft);
    direction.normalize();

    if (moveForward || moveBackward) velocity.z -= direction.z * ACCELERATION * delta;
    if (moveLeft || moveRight) velocity.x -= direction.x * ACCELERATION * delta;

    if (velocity.length() > MAX_SPEED) {
        velocity.setLength(MAX_SPEED);
    }

    const camDir = new THREE.Vector3();
    camera.getWorldDirection(camDir);
    camDir.y = 0; 
    camDir.normalize();
    
    const camSide = new THREE.Vector3().crossVectors(camera.up, camDir).normalize();

    camera.position.addScaledVector(camDir, -velocity.z * delta);
    camera.position.addScaledVector(camSide, velocity.x * delta);

    camera.position.y = floorMesh.position.y + 1.58;

    renderer.render(scene, camera);
}

animate();

// Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
