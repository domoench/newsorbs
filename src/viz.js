import React, { useEffect } from "react";

const Viz = () => {

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
    const pannerModel = 'HRTF';
    const distanceModel = 'inverse';
    const maxDistance = 100;
    const refDistance = 1;
    const rollOff = 1;
    const orbPosition = {
      positionX: -40,
      positionY: 0,
      positionZ: 0,
      orientationX: 0,
      orientationY: 0,
      orientationZ: -1,
    };

    const orbPannerNode = new PannerNode(audioContext, {
      panningModel: pannerModel,
      distanceModel: distanceModel,
      positionX: orbPosition.positionX,
      positionY: orbPosition.positionY,
      positionZ: orbPosition.positionZ,
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

        while (orbPannerNode.positionX.value < 40) {
          orbPannerNode.positionX.value += 0.1;
          await new Promise(r => setTimeout(r, 10));
          console.log(`Orb Position: x:${orbPannerNode.positionX.value}. y:${orbPannerNode.positionY.value}.`);
        }
      });
    });

    document.querySelector('button#right').addEventListener('click', function() {
      orbPannerNode.positionX.value += 0.5;
      console.log(`Orb Position: x:${orbPannerNode.positionX.value}. y:${orbPannerNode.positionY.value}.`);
    });
  });

  return (
    <>
      <audio src="https://npr-ice.streamguys1.com/live.mp3?ck=1608315112307" crossOrigin="anonymous"></audio>
      <button type="button" id="continue">Continue</button>
      <button type="button" id="right">Right</button>
    </>
  );
};

export default Viz;
