import * as THREE from "three";
import { room } from "./constants";
import CircularBufferIndex from "./utils/CircularBufferIndex";

// Orb Class
// Manages the following
// - Orb 'physical' properties: position, destination, etc
// - Orb's WebAudio audio state
// - Orb's Three.js state
// Mainly to update them all in sync on each animation tick.

// TODO Audio Changes
// - Possible to normalize the gain of the tracks?
// - Calibrate the distance model params so that when the orb
//   is 'far' you don't hear it, and it's loud when close.
// - Add reverb

// TODO move some of these to a constants/config file
const numParticles = 100;
const particleSize = 0.025;

export default class Orb {
  // params object looks like:
  // {
  //   position: <THREE.Vector3>
  //   audioSelector: <String>
  //   audioContext: <WebAudioAPI AudioContext instance>
  //   colorGradient: <[hexidecimal, hexidecimal]>
  // }
  // TODO: Typescript?
  constructor(params) {
    // 'PHYSICAL' STATE
    this.position = params.position;

    this.destination = new THREE.Vector3();
    this.setRandomDestination();

    this.colorGradient = [
      new THREE.Color(params.colorGradient[0]),
      new THREE.Color(params.colorGradient[1]),
    ];

    // Manage BufferGeometry attribute buffers as circular buffers for animation
    this.circularBufferIndex = new CircularBufferIndex(numParticles-1, numParticles);

    // THREE.JS STATE
    // Initialize BufferGeometry and Points
    // TODO Consider interleaved BufferGeometry
    // TODO learn how to animate particle sizes: https://github.com/mrdoob/three.js/blob/master/examples/webgl_buffergeometry_custom_attributes_particles.html
    this.bufferGeom = new THREE.BufferGeometry();
    const positions = [];
    const colors = [];
    for (let i = 0; i < numParticles; i++) {
      const x = i * particleSize;
      const y = 0;
      const z = 0;
      positions.push(x, y, z);
      colors.push(this.colorGradient[1].r, this.colorGradient[1].g, this.colorGradient[1].b);
    }
    this.bufferGeom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    this.bufferGeom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
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
    const velocity = 0.0; // TODO restore after debugging
    const displacement = new THREE.Vector3().subVectors(this.destination, this.position);
    // unit vector towards destination
    const unitV = displacement.clone().normalize();
    // Scale to desired velocity magnitude
    const v = unitV.multiplyScalar(velocity);
    this.position.add(v);

    // If we are 'close' to our destination, set a new one
    if (displacement.length() < velocity) {
      this.setRandomDestination();
    }
  }

  // Update the orbs properties for 1 animation tick
  animate() { // TODO dt arg?
    this.updatePosition();

    // Update sound position
    this.pannerNode.positionX.value = this.position.x;

    this.analyser.getByteFrequencyData(this.freqDataArray);
    const [low, mid, high] = [
      this.freqDataArray[0],
      this.freqDataArray[20],
      this.freqDataArray[60]
    ];

    // Update the BufferGeometry
    // Animate the particles
    const positions = this.bufferGeom.attributes.position.array;
    const colors = this.bufferGeom.attributes.color.array;

    // 1. Update all existing particles
    for (let particleIdx = 0; particleIdx < numParticles; particleIdx++) {
      const i = particleIdx * 3;
      // Position: Shift rightwards in X axis over time
      positions[i + 0] += particleSize; // Increment x position

      // Color: Darken over time (poor-man's fade)
      colors[i + 0] *= 0.995; // r
      colors[i + 1] *= 0.995; // g
      colors[i + 2] *= 0.995; // b
    }

    // 2. Replace point at end of circular buffer with new point.
    //    This new points characteristics are a function of the current
    //    frequency readings.
    const cbIdx = this.circularBufferIndex.get();
    const i = cbIdx * 3;
    // Position
    positions[i + 0] = low * 0.0035;  // x
    positions[i + 1] = mid * 0.004;  // y
    positions[i + 2] = high * 0.0006; // z
    // Color
    const normalizeFreq = (f) => f / 255.0;
    const newColor = new THREE.Color().lerpColors(
      this.colorGradient[0],
      this.colorGradient[1],
      normalizeFreq(low),
    );
    colors[i + 0] = newColor.r;
    colors[i + 1] = newColor.g;
    colors[i + 2] = newColor.b;
    // TODO Size
    // TODO Fade opacity as the particles stream outwards
    this.circularBufferIndex.decrement();

    this.bufferGeom.attributes.position.needsUpdate = true;
    this.bufferGeom.attributes.color.needsUpdate = true;
    // TODO: Perhaps need to recompute boundingBox or Sphere? https://threejs.org/docs/#manual/en/introduction/How-to-update-things

    // Update the Group
    this.group.position.x = this.position.x;
    this.group.position.y = this.position.y;
    this.group.position.z = this.position.z;
    this.group.rotation.x += 0.005;
    this.group.rotation.y += 0.001;
    this.group.rotation.z -= 0.001;
  }
}
