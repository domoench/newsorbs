import * as THREE from "three";
import { room } from "./constants";

// State:
//   - Stream URL
//   - Position (x,y,z)
//   - Destination (x, y, z)
//   - Mass, Velocity, Acceleration?
//
//   - Color base
//   - group <THREE.Group>
//
//  Methods
//   - constructor: Initializes the group (inits Geometry, adds multiple transforme Points, add to scene)
//   - animate: Updates orb position, and three.js stuff (bufferGeometry attributes,
//     translates + rotates group)
//   - setDestination

// Orb Class
// Manages the following
// - Orb 'physical' properties: position, destination, etc
// - Orb's WebAudio audio state
// - Orb's Three.js state
// Mainly to update them all in sync on each animation tick.

// TODO move some of these to a constants/config file
const numParticles = 100;
const particleSize = 0.025;

export default class Orb {
  // params object looks like:
  // {
  //   position: <THREE.Vector3>
  //   audioSelector: <String>
  //   audioContext: <WebAudioAPI AudioContext instance>
  //   baseColor: <hexidecimal>
  // }
  // TODO: Typescript?
  constructor(params) {
    // 'PHYSICAL' STATE
    this.position = params.position;

    this.destination = new THREE.Vector3();
    this.setRandomDestination();

    // THREE.JS STATE
    // Initialize BufferGeometry and Points
    this.bufferGeom = new THREE.BufferGeometry();
    const positions = [];
    const colors = [];
    const sizes = [];
    const color = new THREE.Color(params.baseColor);
    for (let i = 0; i < numParticles; i++) {
      const x = i * particleSize;
      const y = 0;
      const z = 0;
      positions.push(x, y, z);
      colors.push(color.r, color.g, color.b);
      sizes.push(0.001);
    }
    this.bufferGeom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    this.bufferGeom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    this.bufferGeom.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
    this.pointsMaterial = new THREE.PointsMaterial( { size: particleSize, vertexColors: true } );

    this.group = new THREE.Group();
    const numHairs = 720;
    const numSlices = 48;
    const numHairsPerSlice = numHairs / numSlices;
    for (let i = 0; i < numSlices; i++) {
      // Slices rotate around the y-axis
      const yRotDeg = (360.0 / numSlices) * i;
      for (let j = 0; j < numHairsPerSlice; j++) {
        const points = new THREE.Points(this.bufferGeom, this.pointsMaterial);
        const zRotDeg = (360.0 / numHairsPerSlice) * j;
        points.rotation.y = THREE.MathUtils.degToRad(yRotDeg);
        points.rotation.z = THREE.MathUtils.degToRad(zRotDeg);
        this.group.add(points);
      }
    }

    // WEBAUDIO API STATE
    this.audioElement = document.querySelector(params.audioSelector);
    const track = params.audioContext.createMediaElementSource(this.audioElement);

    // Orb's sound position in space
    const pannerModel = 'HRTF';
    const distanceModel = 'exponential';
    const maxDistance = 100;
    const refDistance = 1;
    const rollOff = 1.5;
    const orbOrientation = { x: 0, y: 0, z: -1 };
    this.pannerNode = new PannerNode(params.audioContext, {
      panningModel: pannerModel,
      distanceModel: distanceModel,
      positionX: this.position.x,
      positionY: this.position.y,
      positionZ: this.position.z,
      orientationX: orbOrientation.x,
      orientationY: orbOrientation.y,
      orientationZ: orbOrientation.z,
      refDistance: refDistance,
      maxDistance: maxDistance,
      rolloffFactor: rollOff,
    });

    // Analysis
    this.analyser = params.audioContext.createAnalyser();
    this.analyser.smoothingTimeConstant = 0.8;
    this.analyser.fftSize = 256;
    const bufferLength = this.analyser.frequencyBinCount;
    this.freqDataArray = new Uint8Array(bufferLength);

    // Connnect our audio graph
    track
      .connect(this.analyser)
      .connect(this.pannerNode)
      .connect(params.audioContext.destination);
  }

  // Add this orb's THREE.Group to the given scene
  addToScene(scene) {
    scene.add(this.group);
  }

  // Set a new random destination within the space
  setRandomDestination() {
    const rangeX = room.maxX - room.minX;
    const rangeY = room.maxY - room.minY;
    const rangeZ = room.maxZ - room.minZ;
    this.destination.x = (Math.random() * rangeX) - rangeX / 2; // TODO (THREE.MathUtils.randFloat)
    this.destination.y = (Math.random() * rangeY) - rangeY / 2;
    this.destination.z = (Math.random() * rangeZ) - rangeZ / 2;
    console.log('randomDestination', this.destination);
  }

  // Update the position according to destination and velocity
  updatePosition() {
    const velocity = 0.1;
    const displacement = new THREE.Vector3().subVectors(this.destination, this.position);
    // unit vector towards destination
    const unitV = displacement.clone().normalize();
    // Scale to desired velocity magnitude
    const v = unitV.multiplyScalar(velocity);
    this.position.add(v);

    // If we are 'close' to our destination, set a new one
    if (displacement.length() < 0.1) {
      this.setRandomDestination();
    }
  }

  // Update the orbs properties for 1 animation tick
  animate() { // TODO dt arg?
    this.updatePosition();

    // Update sound position
    this.pannerNode.positionX.value = this.position.x;

    // Update the BufferGeometry
    this.analyser.getByteFrequencyData(this.freqDataArray);
    const [low, mid, high] = [this.freqDataArray[0], this.freqDataArray[20], this.freqDataArray[60]];

    // Animate the particles
    const positions = this.bufferGeom.attributes.position.array;

    // 1. Shift everything right
    // TODO: This is conceptually easier, but not efficient. Should
    // do a circular buffer where we track end position, and then just
    // do +1 to x coord (no need to shift verticies in the array)
    let prevPoint = [positions[0], positions[1], positions[2]];
    let currPoint = [0,0,0];
    for (let particleIdx = 1; particleIdx < numParticles; particleIdx++) {
      const i = particleIdx * 3;
      currPoint = [positions[i+0], positions[i+1], positions[i+2]];

      // Overwrite this point
      positions[i + 0] = prevPoint[0] + particleSize; // x (shifted right)
      positions[i + 1] = prevPoint[1] * 1.001; // y with expansion
      positions[i + 2] = prevPoint[2] * 0.999; // z with contraction

      // Save for next iteration overwrite
      prevPoint[0] = currPoint[0]; // x
      prevPoint[1] = currPoint[1]; // y
      prevPoint[2] = currPoint[2]; // z
    }
    // 2. Set new first point Y position
    positions[0] = low * 0.005;
    positions[1] = mid * 0.005;
    positions[2] = high * 0.005;
    this.bufferGeom.attributes.position.needsUpdate = true;
    // TODO: Perhaps need to recompute boundingBox or Sphere? https://threejs.org/docs/#manual/en/introduction/How-to-update-things

    // Update the Group
    this.group.position.x = this.position.x;
    this.group.position.y = this.position.y;
    this.group.position.z = this.position.z;
    this.group.rotation.x += 0.005;
    this.group.rotation.y += 0.01;

  }
}
