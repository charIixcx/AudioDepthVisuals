import { create } from 'zustand';

export const useStore = create((set) => ({
  // Audio Data
  audioData: { low: 0, mid: 0, high: 0 },
  setAudioData: (data) => set({ audioData: data }),
  
  // Visual Params (Uniforms)
  params: {
    // Geometry Effects
    uDepthStrength: 0.5,
    uNoiseSpeed: 0.2,
    uTwistStrength: 0.0,
    uRippleStrength: 0.0,
    uRippleFreq: 10.0,
    uFoldStrength: 0.0,
    uBulgeStrength: 0.0,
    uSpikeStrength: 0.0,
    uExplode: 0.0,
    uMelt: 0.0,
    uLFO: 0.0,
    uJitter: 0.0,
    uTiles: 1.0,
    uMirrorX: 0,
    uMirrorY: 0,
    uPointSize: 2.0,
    uAudioGain: 1.0,
    uTimeFreeze: 0,
    uBandGeo: 1,
    uBandAction: 2,
    uBandDetail: 3,
    
    // Post-Processing Effects
    uColorShift: 0.0,
    uRGBShift: 0.0,
    uGlitchStrength: 0.0,
    uScanlineStrength: 0.0,
    uVignetteStrength: 0.5,
    uBrightness: 0.0,
    uContrast: 1.0,
    uSaturation: 1.0,
    uHue: 0.0,
    uInvert: 0,
    uPixelate: 0.0,
    uBandColor: 1,
    
    // Advanced Glitch Effects
    uDatamosh: 0.0,
    uWaveDistort: 0.0,
    uBarrelDistort: 0.0,
    uKaleidoscope: 0,
    uMirrorGlitch: 0.0,
    uColorBleed: 0.0,
    uNoiseOverlay: 0.0,
    uCRT: 0.0,
    uVHS: 0.0,
    
    // Bloom & Glow
    uBloomIntensity: 0.5,
    uBloomThreshold: 0.2,
    
    // Chromatic Aberration
    uChromaticAberration: 0.0,
    
    // Depth of Field
    uDOF: 0.0,
    uFocusDistance: 0.5,
    
    // Film Grain
    uFilmGrain: 0.0,
    
    // God Rays
    uGodRays: 0.0,
  },
  setParam: (key, value) => set((state) => ({ params: { ...state.params, [key]: value } })),
  
  // Assets
  textures: {
    color: null,
    depth: null,
    normal: null,
  },
  setTexture: (type, texture) => set((state) => ({ textures: { ...state.textures, [type]: texture } })),
  
  // System
  isPlaying: false,
  setIsPlaying: (isPlaying) => set({ isPlaying }),
}));
