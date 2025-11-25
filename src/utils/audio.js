import { useStore } from '../store';

let audioContext;
let analyser;
let dataArray;
let source;
let animationId;

export const initAudio = (audioElement) => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  
  if (source) {
    source.disconnect();
  }

  analyser = audioContext.createAnalyser();
  analyser.fftSize = 512;
  dataArray = new Uint8Array(analyser.frequencyBinCount);

  source = audioContext.createMediaElementSource(audioElement);
  source.connect(analyser);
  analyser.connect(audioContext.destination);

  const updateAudioData = () => {
    analyser.getByteFrequencyData(dataArray);
    
    // Calculate bands
    const bufferLength = analyser.frequencyBinCount;
    const lowBound = Math.floor(bufferLength * 0.1);
    const midBound = Math.floor(bufferLength * 0.5);
    
    let lowSum = 0, midSum = 0, highSum = 0;
    
    for(let i = 0; i < lowBound; i++) lowSum += dataArray[i];
    for(let i = lowBound; i < midBound; i++) midSum += dataArray[i];
    for(let i = midBound; i < bufferLength; i++) highSum += dataArray[i];
    
    const low = lowSum / lowBound / 255;
    const mid = midSum / (midBound - lowBound) / 255;
    const high = highSum / (bufferLength - midBound) / 255;
    
    useStore.getState().setAudioData({ low, mid, high });
    
    animationId = requestAnimationFrame(updateAudioData);
  };
  
  updateAudioData();
  
  return () => {
    cancelAnimationFrame(animationId);
    if (audioContext && audioContext.state !== 'closed') {
        // audioContext.close(); // Don't close context as we might reuse it
    }
  };
};

export const resumeAudioContext = () => {
    if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume();
    }
}
