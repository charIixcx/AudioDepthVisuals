import React, { useRef, useState } from 'react';
import { useStore } from '../store';
import { initAudio, resumeAudioContext } from '../utils/audio';
import * as THREE from 'three';

// Slider Component
const Slider = ({ label, value, onChange, min = 0, max = 1, step = 0.01, color = 'neon-cyan' }) => (
  <div className="mb-2">
    <div className="flex justify-between text-xs text-gray-400 mb-1">
      <span>{label}</span>
      <span className="text-neon-cyan">{typeof value === 'number' ? value.toFixed(2) : value}</span>
    </div>
    <input 
      type="range" 
      min={min} 
      max={max} 
      step={step} 
      value={value} 
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className={`w-full accent-${color} h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer`}
    />
  </div>
);

// Section Header
const Section = ({ title, color = '#00ffcc', children }) => (
  <div className="mb-4">
    <h2 className="text-xs font-bold uppercase tracking-wider mb-3 pb-1 border-b border-gray-700" style={{ color }}>{title}</h2>
    {children}
  </div>
);

const UI = ({ onToggleNodeEditor, onHideUI }) => {
  const audioRef = useRef(null);
  const [audioSrc, setAudioSrc] = useState(null);
  const [activeTab, setActiveTab] = useState('geometry');
  const setTexture = useStore((state) => state.setTexture);
  const setParam = useStore((state) => state.setParam);
  const params = useStore((state) => state.params);
  const audioData = useStore((state) => state.audioData);

  const handleFileUpload = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    // Reset input so same file can be selected again
    e.target.value = '';

    if (window.showToast) window.showToast(`Loading ${type}...`);

    const url = URL.createObjectURL(file);
    
    if (type === 'audio') {
      setAudioSrc(url);
      setTimeout(() => {
          if (audioRef.current) {
              initAudio(audioRef.current);
              audioRef.current.play();
              if (window.showToast) window.showToast('Audio loaded!');
          }
      }, 100);
    } else {
      console.log(`Loading texture for ${type}...`);
      const loader = new THREE.TextureLoader();
      loader.load(
        url, 
        (texture) => {
          console.log(`Texture loaded for ${type}:`, texture);
          texture.needsUpdate = true;
          // Ensure wrapping is correct for tiling
          texture.wrapS = THREE.RepeatWrapping;
          texture.wrapT = THREE.RepeatWrapping;
          setTexture(type, texture);
          if (window.showToast) window.showToast(`${type} texture loaded!`);
        },
        undefined,
        (err) => {
            console.error(`Error loading texture ${type}:`, err);
            if (window.showToast) window.showToast(`Error loading ${type}`);
        }
      );
    }
  };

  const tabs = [
    { id: 'geometry', label: '⬡ Geo' },
    { id: 'glitch', label: '⚡ Glitch' },
    { id: 'color', label: '🎨 Color' },
    { id: 'post', label: '✨ Post' },
  ];

  return (
    <div className="absolute top-5 left-5 z-10 bg-panel-bg p-4 rounded-lg border border-[#333] w-[320px] max-h-[90vh] overflow-y-auto backdrop-blur-xl shadow-[0_0_40px_rgba(0,255,204,0.15)] text-white font-mono">
      <h1 className="text-sm m-0 mb-3 uppercase tracking-[3px] text-neon-cyan border-b border-[#333] pb-2 flex items-center gap-2">
        <span className="text-lg">◈</span> Depth FX Pro
      </h1>

      {/* Assets */}
      <Section title="Assets" color="#888">
        <div className="grid grid-cols-3 gap-1 mb-2">
          <div className="relative">
            <button className="btn text-[9px] py-1.5">Color</button>
            <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleFileUpload(e, 'color')} />
          </div>
          <div className="relative">
            <button className="btn text-[9px] py-1.5">Depth</button>
            <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleFileUpload(e, 'depth')} />
          </div>
          <div className="relative">
            <button className="btn text-[9px] py-1.5 border-[#8080ff] text-[#8080ff]">Normal</button>
            <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleFileUpload(e, 'normal')} />
          </div>
        </div>
        <div className="relative">
          <button className="btn text-[10px]" onClick={resumeAudioContext}>🎵 Upload Audio</button>
          <input type="file" accept="audio/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleFileUpload(e, 'audio')} />
        </div>
        {/* Audio Meters */}
        <div className="flex gap-1 mt-2 h-2">
          <div className="flex-1 bg-[#111] rounded overflow-hidden" title="Low">
            <div className="h-full bg-gradient-to-r from-red-500 to-orange-500 transition-all" style={{ width: `${audioData.low * 100}%` }} />
          </div>
          <div className="flex-1 bg-[#111] rounded overflow-hidden" title="Mid">
            <div className="h-full bg-gradient-to-r from-green-500 to-yellow-500 transition-all" style={{ width: `${audioData.mid * 100}%` }} />
          </div>
          <div className="flex-1 bg-[#111] rounded overflow-hidden" title="High">
            <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all" style={{ width: `${audioData.high * 100}%` }} />
          </div>
        </div>
        <audio ref={audioRef} src={audioSrc} controls className="w-full mt-2 h-7" />
      </Section>

      {/* Tab Navigation */}
      <div className="flex gap-1 mb-3">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-1.5 text-[9px] uppercase tracking-wide rounded transition-all ${
              activeTab === tab.id 
                ? 'bg-neon-cyan text-black font-bold' 
                : 'bg-[#1a1a1a] text-gray-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Geometry Tab */}
      {activeTab === 'geometry' && (
        <Section title="Geometry FX" color="#00ffcc">
          <Slider label="Depth Strength" value={params.uDepthStrength} onChange={(v) => setParam('uDepthStrength', v)} max={2} />
          <Slider label="Noise Speed" value={params.uNoiseSpeed} onChange={(v) => setParam('uNoiseSpeed', v)} max={2} />
          <Slider label="Twist" value={params.uTwistStrength} onChange={(v) => setParam('uTwistStrength', v)} max={2} />
          <Slider label="Ripple" value={params.uRippleStrength} onChange={(v) => setParam('uRippleStrength', v)} max={1} />
          <Slider label="Bulge" value={params.uBulgeStrength} onChange={(v) => setParam('uBulgeStrength', v)} max={1} />
          <Slider label="Spike" value={params.uSpikeStrength} onChange={(v) => setParam('uSpikeStrength', v)} max={2} />
          <Slider label="Explode" value={params.uExplode} onChange={(v) => setParam('uExplode', v)} max={2} />
          <Slider label="Melt" value={params.uMelt} onChange={(v) => setParam('uMelt', v)} max={1} />
          <Slider label="Jitter" value={params.uJitter} onChange={(v) => setParam('uJitter', v)} max={0.5} />
          <Slider label="Fold" value={params.uFoldStrength} onChange={(v) => setParam('uFoldStrength', v)} max={1} />
          <Slider label="Tiles" value={params.uTiles} onChange={(v) => setParam('uTiles', v)} min={1} max={8} step={1} />
          <div className="flex gap-2 mt-2">
            <button 
              onClick={() => setParam('uMirrorX', params.uMirrorX ? 0 : 1)}
              className={`flex-1 py-1 text-[10px] rounded ${params.uMirrorX ? 'bg-neon-cyan text-black' : 'bg-[#222] text-gray-400'}`}
            >
              Mirror X
            </button>
            <button 
              onClick={() => setParam('uMirrorY', params.uMirrorY ? 0 : 1)}
              className={`flex-1 py-1 text-[10px] rounded ${params.uMirrorY ? 'bg-neon-cyan text-black' : 'bg-[#222] text-gray-400'}`}
            >
              Mirror Y
            </button>
          </div>
          <Slider label="Audio Gain" value={params.uAudioGain} onChange={(v) => setParam('uAudioGain', v)} max={3} />
        </Section>
      )}

      {/* Glitch Tab */}
      {activeTab === 'glitch' && (
        <Section title="Glitch Art" color="#ff0055">
          <Slider label="Glitch Intensity" value={params.uGlitchStrength} onChange={(v) => setParam('uGlitchStrength', v)} max={1} />
          <Slider label="Datamosh" value={params.uDatamosh} onChange={(v) => setParam('uDatamosh', v)} max={1} />
          <Slider label="Wave Distort" value={params.uWaveDistort} onChange={(v) => setParam('uWaveDistort', v)} max={2} />
          <Slider label="Barrel Distort" value={params.uBarrelDistort} onChange={(v) => setParam('uBarrelDistort', v)} min={-1} max={1} />
          <Slider label="Mirror Glitch" value={params.uMirrorGlitch} onChange={(v) => setParam('uMirrorGlitch', v)} max={1} />
          <Slider label="Color Bleed" value={params.uColorBleed} onChange={(v) => setParam('uColorBleed', v)} max={2} />
          <Slider label="Kaleidoscope" value={params.uKaleidoscope} onChange={(v) => setParam('uKaleidoscope', v)} max={12} step={1} />
          <Slider label="Pixelate" value={params.uPixelate} onChange={(v) => setParam('uPixelate', v)} max={1} />
          <Slider label="RGB Shift" value={params.uRGBShift} onChange={(v) => setParam('uRGBShift', v)} max={0.1} step={0.001} />
        </Section>
      )}

      {/* Color Tab */}
      {activeTab === 'color' && (
        <Section title="Color Grading" color="#d08aff">
          <Slider label="Hue Shift" value={params.uHue} onChange={(v) => setParam('uHue', v)} min={-1} max={1} />
          <Slider label="Saturation" value={params.uSaturation} onChange={(v) => setParam('uSaturation', v)} max={2} />
          <Slider label="Brightness" value={params.uBrightness} onChange={(v) => setParam('uBrightness', v)} min={-1} max={1} />
          <Slider label="Contrast" value={params.uContrast} onChange={(v) => setParam('uContrast', v)} max={2} />
          <Slider label="Color Shift (Time)" value={params.uColorShift} onChange={(v) => setParam('uColorShift', v)} max={1} />
          <button 
            onClick={() => setParam('uInvert', params.uInvert ? 0 : 1)}
            className={`w-full py-1.5 text-[10px] rounded mt-2 ${params.uInvert ? 'bg-white text-black' : 'bg-[#222] text-gray-400'}`}
          >
            Invert Colors
          </button>
        </Section>
      )}

      {/* Post-Processing Tab */}
      {activeTab === 'post' && (
        <Section title="Post Processing" color="#00aaff">
          <Slider label="Bloom Intensity" value={params.uBloomIntensity} onChange={(v) => setParam('uBloomIntensity', v)} max={2} />
          <Slider label="Bloom Threshold" value={params.uBloomThreshold} onChange={(v) => setParam('uBloomThreshold', v)} max={1} />
          <Slider label="Chromatic Aberration" value={params.uChromaticAberration} onChange={(v) => setParam('uChromaticAberration', v)} max={1} />
          <Slider label="Vignette" value={params.uVignetteStrength} onChange={(v) => setParam('uVignetteStrength', v)} max={1.5} />
          <Slider label="Scanlines" value={params.uScanlineStrength} onChange={(v) => setParam('uScanlineStrength', v)} max={1} />
          <Slider label="Film Grain" value={params.uFilmGrain} onChange={(v) => setParam('uFilmGrain', v)} max={0.5} />
          <Slider label="CRT Effect" value={params.uCRT} onChange={(v) => setParam('uCRT', v)} max={1} />
        </Section>
      )}

      <div className="h-px bg-gradient-to-r from-transparent via-[#333] to-transparent my-3"></div>

      {/* Tools */}
      <div className="flex gap-2">
        <button className="flex-1 btn text-[10px] py-2" onClick={onHideUI}>Hide (H)</button>
        <button className="flex-1 btn text-[10px] py-2 border-neon-cyan text-neon-cyan" onClick={onToggleNodeEditor}>Node Editor</button>
      </div>
    </div>
  );
};

export default UI;
