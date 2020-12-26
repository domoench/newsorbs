import React, { useEffect, useRef } from "react";
import * as THREE from "three";

import Orb from "./Orb";

const Viz = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const audioContext = new AudioContext();

    // Spatialization
    // Listener is our position in space
    const listener = audioContext.listener;
    listener.positionX.value = 0; // TODO this doesn't work in firefox: https://developer.mozilla.org/en-US/docs/Web/API/AudioListener#Methods
    listener.positionY.value = 0;
    listener.positionZ.value = 30;
    listener.forwardX.value = 0;
    listener.forwardY.value = 0;
    listener.forwardZ.value = -1;
    listener.upX.value = 0;
    listener.upY.value = 1;
    listener.upZ.value = 0;

    const orb = new Orb({
      position: new THREE.Vector3(-15, 0, 0),
      audioSelector: 'audio#npr',
      audioContext: audioContext,
      baseColor: 0xff0000,
    });
    const orb2 = new Orb({
      position: new THREE.Vector3(10, 0, 0),
      audioSelector: 'audio#random',
      audioContext: audioContext,
      baseColor: 0x00ff00,
    });

    document.querySelector('button#continue').addEventListener('click', () => {
      audioContext.resume().then(async () => {
        console.log('Playback resumed successfully');
        orb.audioElement.play();
        orb2.audioElement.play();
      });
    });

    // VISUALS

    // buildRenderer: https://github.com/PierfrancescoSoffritti/pierfrancescosoffritti.com/blob/master/src/components/home/header/threejs/SceneManager.js#L32
    const canvas = canvasRef.current;
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 30; // TODO need to keep camera position and listener position in sync

    const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    orb.addToScene(scene);
    orb2.addToScene(scene);

    const animate = () => {
      requestAnimationFrame(animate);

      orb.animate();
      orb2.animate();

      renderer.render(scene, camera);
    };

    animate();
  });

  return (
    <>
      <audio id="npr" src="https://npr-ice.streamguys1.com/live.mp3?ck=1608315112307" crossOrigin="anonymous"></audio>
      <audio id="random" src="http://149.56.147.197:7000/stream" crossOrigin="anonymous"></audio>
      <button type="button" id="continue">Continue</button>
      <canvas ref={canvasRef}></canvas>
    </>
  );
};

export default Viz;
