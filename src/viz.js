import React, { useEffect, useRef } from "react";
import * as THREE from "three";

import Orb from "./Orb";
import { room } from "./constants";
// import response from "./impulse-response.wav"; // TODO

const Viz = () => {
  const canvasRef = useRef(null);
  const cameraPosition = new THREE.Vector3(0,0,room.maxZ);

  useEffect(() => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();

    // Spatialization
    // Listener is our position in space
    const listener = audioContext.listener;
    listener.positionX.value = cameraPosition.x; // TODO this doesn't work in firefox: https://developer.mozilla.org/en-US/docs/Web/API/AudioListener#Methods
    listener.positionY.value = cameraPosition.y;
    listener.positionZ.value = cameraPosition.z;
    listener.forwardX.value = 0;
    listener.forwardY.value = 0;
    listener.forwardZ.value = -1;
    listener.upX.value = 0;
    listener.upY.value = 1;
    listener.upZ.value = 0;

    const orb = new Orb({
      // position: new THREE.Vector3(-15, 0, 0), TODO
      position: new THREE.Vector3(cameraPosition.x, cameraPosition.y, cameraPosition.z - 5),
      audioSelector: 'audio#npr',
      audioContext: audioContext,
      baseColor: 0xff0000,
      colorGradient: [0xff4b1f, 0x1fddff],
    });
    // const orb2 = new Orb({
      // position: new THREE.Vector3(10, 0, 0),
      // audioSelector: 'audio#random',
      // audioContext: audioContext,
      // baseColor: 0x00ff00,
    // });

    document.querySelector('button#continue').addEventListener('click', () => {
      audioContext.resume().then(async () => {
        console.log('Playback resumed successfully');
        orb.audioElement.play();
        // orb2.audioElement.play();
      });
    });

    // VISUALS
    const canvas = canvasRef.current;
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = cameraPosition.z;

    const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    const roomBoxGeom = new THREE.BoxGeometry(room.maxX - room.minX, room.maxY - room.minY, room.maxZ - room.minZ);
    const roomBoxMaterial = new THREE.MeshBasicMaterial({
      color: 0x0000ff,
      wireframe: true,
    });
    const roomMesh = new THREE.Mesh(roomBoxGeom, roomBoxMaterial);
    scene.add(roomMesh);

    orb.addToScene(scene);
    // orb2.addToScene(scene);

    const animate = () => {
      requestAnimationFrame(animate);

      orb.animate();
      // orb2.animate();

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
