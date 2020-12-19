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
    listener.positionZ.value = 0;
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

    // Connnect our audio graph
    track.connect(orbPannerNode).connect(audioContext.destination);

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
    const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
    const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    renderer.setSize( window.innerWidth, window.innerHeight );

    const geometry = new THREE.BoxGeometry();
    const material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
    const cube = new THREE.Mesh( geometry, material );
    scene.add( cube );

    camera.position.z = 5;

    const animate = () => {
      requestAnimationFrame(animate);

      if (orbPannerNode.positionX.value >= orbMaxX) {
        orbPosition.X *= -1;
      }
      orbPosition.X += 0.1;
      orbPannerNode.positionX.value = orbPosition.X;
      console.log(`Orb Position: x:${orbPannerNode.positionX.value}. y:${orbPannerNode.positionY.value}.`);

      cube.position.x = orbPosition.X;

      cube.rotation.x += 0.01;
      cube.rotation.y += 0.01;

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

export default Viz;
