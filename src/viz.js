import React, { useEffect, useRef } from "react";
import * as THREE from "three";

const Viz = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const audioContext = new AudioContext();
    const audioElement = document.querySelector('audio');
    const track = audioContext.createMediaElementSource(audioElement);

    // Spatialization
    // Listener is our position in space
    const listener = audioContext.listener;
    listener.positionX.value = 0; // TODO this doesn't work in firefox: https://developer.mozilla.org/en-US/docs/Web/API/AudioListener#Methods
    listener.positionY.value = 0;
    listener.positionZ.value = 2;
    listener.forwardX.value = 0;
    listener.forwardY.value = 0;
    listener.forwardZ.value = -1;
    listener.upX.value = 0;
    listener.upY.value = 1;
    listener.upZ.value = 0;

    // Sound source position in space
    const orbMaxX = 15;
    const pannerModel = 'HRTF';
    const distanceModel = 'exponential';
    const maxDistance = 100;
    const refDistance = 1;
    const rollOff = 1;
    const orbPosition = {
      X: -1 * orbMaxX,
      Y: 0,
      Z: 0,
      orientationX: 0,
      orientationY: 0,
      orientationZ: -1,
    };

    const orbPannerNode = new PannerNode(audioContext, {
      panningModel: pannerModel,
      distanceModel: distanceModel,
      positionX: orbPosition.X,
      positionY: orbPosition.Y,
      positionZ: orbPosition.Z,
      orientationX: orbPosition.orientationX,
      orientationY: orbPosition.orientationY,
      orientationZ: orbPosition.orientationZ,
      refDistance: refDistance,
      maxDistance: maxDistance,
      rolloffFactor: rollOff,
    });

    // Analysis
    const analyser = audioContext.createAnalyser();
    analyser.smoothingTimeConstant = 0.8;
    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    let freqDataArray = new Uint8Array(bufferLength);

    // Connnect our audio graph
    track
      .connect(analyser)
      .connect(orbPannerNode)
      .connect(audioContext.destination);

    document.querySelector('button#continue').addEventListener('click', () => {
      audioContext.resume().then(async () => {
        console.log('Playback resumed successfully');
        audioElement.play();
      });
    });

    // VISUALS

    // buildRenderer: https://github.com/PierfrancescoSoffritti/pierfrancescosoffritti.com/blob/master/src/components/home/header/threejs/SceneManager.js#L32
    const canvas = canvasRef.current;
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 10;

    const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    // Lights
    const intensity = 1;
    const redLight = new THREE.DirectionalLight(0xFF0000, intensity);
    redLight.position.set(5, 10, -5);
    redLight.target.position.set(0, 0, 0);
    scene.add(redLight);
    scene.add(redLight.target);
    const blueLight = new THREE.DirectionalLight(0x0000FF, intensity);
    blueLight.position.set(-5, -10, -2);
    blueLight.target.position.set(0, 0, 0);
    scene.add(blueLight);
    scene.add(blueLight.target);

    // Points
    const numParticles = 100;
    const bufferGeom = new THREE.BufferGeometry();
    const positions = [];
    const colors = [];
    const sizes = [];
    const color = new THREE.Color();
    const particleSize = 0.025;
    color.setRGB(1.0, 0, 0);
    for (let i = 0; i < numParticles; i++) {
      const x = i * particleSize;
      const y = 0;
      const z = 0;
      positions.push(x, y, z);
      colors.push(color.r, color.g, color.b);
      sizes.push(0.001);
    }
    bufferGeom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    bufferGeom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    bufferGeom.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
    const pointsMaterial = new THREE.PointsMaterial( { size: particleSize, vertexColors: true } );

    const orbGroup = new THREE.Group();
    const numHairs = 720;
    const numSlices = 48;
    const numHairsPerSlice = numHairs / numSlices;
    for (let i = 0; i < numSlices; i++) {
      // Slices rotate around the y-axis
      const yRotDeg = (360.0 / numSlices) * i;
      for (let j = 0; j < numHairsPerSlice; j++) {
        const points = new THREE.Points( bufferGeom, pointsMaterial );
        const zRotDeg = (360.0 / numHairsPerSlice) * j;
        points.rotation.y = THREE.MathUtils.degToRad(yRotDeg);
        points.rotation.z = THREE.MathUtils.degToRad(zRotDeg);
        orbGroup.add(points);
      }
    }
    scene.add(orbGroup);

    const animateBufferGeom = (bufferGeom, freqDataArray) => {
      const [low, mid, high] = [freqDataArray[0], freqDataArray[20], freqDataArray[60]];

      // Animate the particles
      const positions = bufferGeom.attributes.position.array;

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
      bufferGeom.attributes.position.needsUpdate = true;
      // TODO: Perhaps need to recompute boundingBox or Sphere? https://threejs.org/docs/#manual/en/introduction/How-to-update-things
    }

    const animate = () => {
      requestAnimationFrame(animate);

      if (orbPosition.X >= orbMaxX) {
        orbPosition.X *= -1;
      }
      orbPosition.X += 0.05;
      orbPannerNode.positionX.value = orbPosition.X;

      // TODO is pointing the lights at the orb working?
      redLight.target.position.set(orbPosition.X, orbPosition.Y, orbPosition.Z);
      blueLight.target.position.set(orbPosition.X, orbPosition.Y, orbPosition.Z);

      analyser.getByteFrequencyData(freqDataArray);
      animateBufferGeom(bufferGeom, freqDataArray);

      orbGroup.position.x = orbPosition.X;
      orbGroup.rotation.x += 0.005;
      orbGroup.rotation.y += 0.01;

      renderer.render(scene, camera);
    };

    animate();
  });

  return (
    <>
      <audio src="https://npr-ice.streamguys1.com/live.mp3?ck=1608315112307" crossOrigin="anonymous"></audio>
      <button type="button" id="continue">Continue</button>
      <canvas ref={canvasRef}></canvas>
    </>
  );
};
// https://emp.bbci.co.uk/emp/media/blank.mp3 // TODO BBC

export default Viz;
