import React, { useEffect } from "react";

const Viz = () => {
  useEffect(() => {
    const audioContext = new AudioContext();
    const audioElement = document.querySelector('audio');
    const track = audioContext.createMediaElementSource(audioElement);
    track.connect(audioContext.destination);

    document.querySelector('button').addEventListener('click', function() {
      audioContext.resume().then(() => {
        console.log('Playback resumed successfully');
        audioElement.play();
      });
    });
  });

  return (
    <>
      <audio src="https://npr-ice.streamguys1.com/live.mp3?ck=1608315112307" crossOrigin="anonymous"></audio>
      <button type="button">Continue</button>
    </>
  );
};

export default Viz;
