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
    listener.positionX.value = 0;
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
    let dataArray = new Uint8Array(bufferLength);
    console.log('dataArray', dataArray);

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
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);

    const geometry = new THREE.BoxGeometry();
    const material = new THREE.MeshPhongMaterial({color: '#F00'});
    const cube = new THREE.Mesh( geometry, material );
    scene.add( cube );

    const color = 0xFFFFFF;
    const intensity = 1;
    const light = new THREE.DirectionalLight(color, intensity);
    light.position.set(0, 10, 0);
    light.target.position.set(-5, 0, 0);
    scene.add(light);
    scene.add(light.target);

    camera.position.z = 5;

    const animate = () => {
      requestAnimationFrame(animate);

      if (orbPannerNode.positionX.value >= orbMaxX) {
        orbPosition.X *= -1;
      }
      orbPosition.X += 0.02;
      orbPannerNode.positionX.value = orbPosition.X;

      cube.position.x = orbPosition.X;

      cube.rotation.x += 0.01;
      cube.rotation.y += 0.01;

      // Scale the cube based on real time frequency data
      analyser.getByteFrequencyData(dataArray);
      const [low, mid, high] = [dataArray[0], dataArray[20], dataArray[60]];
      const scale = (x) => (x / 200) * 3.0 + 0.5;
      cube.scale.x = scale(low);
      cube.scale.y = scale(mid);
      cube.scale.z = scale(high);

      renderer.render( scene, camera );
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
