import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, extend, useThree, createPortal } from '@react-three/fiber';
import { OrbitControls, shaderMaterial, useFBO } from '@react-three/drei';
import * as THREE from 'three';
import { vertexShader, fragmentShader, postVertexShader, postFragmentShader } from '../utils/shaders';
import { useStore } from '../store';

// --- Custom Shader Material ---
const DepthMaterial = shaderMaterial(
  {
    uTime: 0,
    uColorTexture: null,
    uDepthTexture: null,
    uNormalTexture: null,
    uMouse: new THREE.Vector2(),
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
    uAudioLow: 0.0,
    uAudioMid: 0.0,
    uAudioHigh: 0.0,
    uAudioGain: 1.0,
    uTimeFreeze: 0,
    uBandGeo: 1,
    uBandAction: 2,
    uBandDetail: 3,
    // New shader uniforms
    uWaveDistort: 0.0,
    uBarrelDistort: 0.0,
    uKaleidoscope: 0,
    uMirrorGlitch: 0.0,
    uColorBleed: 0.0,
    uDatamosh: 0.0,
    uColorShift: 0.0,
  },
  vertexShader,
  fragmentShader
);

const PostMaterial = shaderMaterial(
    {
        tDiffuse: null,
        uTime: 0,
        uRGBShift: 0,
        uPixelate: 0,
        uScanline: 0,
        uVignette: 0,
        uFilmGrain: 0,
        uGlitchStrength: 0,
        uCRT: 0,
        uBrightness: 0,
        uContrast: 1,
        uSaturation: 1,
        uHue: 0,
        uInvert: 0
    },
    postVertexShader,
    postFragmentShader
);

extend({ DepthMaterial, PostMaterial });

// --- Helper: Default Textures ---
const createNoiseTexture = (type = 'color') => {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, size, size);
    for(let i = 0; i < 60; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const r = Math.random() * 100 + 20;
        if (type === 'depth') {
            const val = Math.floor(Math.random() * 255);
            const g = ctx.createRadialGradient(x, y, 0, x, y, r);
            g.addColorStop(0, `rgba(${val},${val},${val},1)`);
            g.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = g;
        } else {
            const hue = Math.floor(Math.random() * 360);
            const g = ctx.createRadialGradient(x, y, 0, x, y, r);
            g.addColorStop(0, `hsla(${hue}, 80%, 50%, 1)`);
            g.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = g;
        }
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    }
    return new THREE.CanvasTexture(canvas);
};

const createFlatNormalTexture = () => {
    const size = 32;
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#8080ff'; 
    ctx.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(canvas);
};

// --- Post Processing Component ---
const Effects = () => {
    const { gl, scene, camera, size } = useThree();
    const fbo = useFBO();
    const postMaterial = useRef();
    const params = useStore((state) => state.params);
    
    // Create a separate scene for the full-screen quad
    const postScene = useMemo(() => new THREE.Scene(), []);
    const postCamera = useMemo(() => new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), []);

    useFrame((state) => {
        // 1. Render the original scene to the FBO
        gl.setRenderTarget(fbo);
        gl.render(scene, camera);
        
        // 2. Update Post Material Uniforms
        if (postMaterial.current) {
            postMaterial.current.tDiffuse = fbo.texture;
            postMaterial.current.uTime = state.clock.elapsedTime;
            
            // Map params
            postMaterial.current.uRGBShift = Math.max(params.uRGBShift, params.uChromaticAberration * 0.01);
            postMaterial.current.uPixelate = params.uPixelate;
            postMaterial.current.uScanline = params.uScanlineStrength;
            postMaterial.current.uVignette = params.uVignetteStrength;
            postMaterial.current.uFilmGrain = params.uFilmGrain;
            postMaterial.current.uGlitchStrength = params.uGlitchStrength;
            postMaterial.current.uCRT = params.uCRT;
            postMaterial.current.uBrightness = params.uBrightness;
            postMaterial.current.uContrast = params.uContrast;
            postMaterial.current.uSaturation = params.uSaturation;
            postMaterial.current.uHue = params.uHue;
            postMaterial.current.uInvert = params.uInvert;
        }

        // 3. Render the Post Scene to the Screen
        gl.setRenderTarget(null);
        gl.render(postScene, postCamera);
    }, 1); // Priority 1 ensures this runs after standard renders

    return createPortal(
        <mesh>
            <planeGeometry args={[2, 2]} />
            <postMaterial ref={postMaterial} />
        </mesh>,
        postScene
    );
};

// --- Scene Component ---
const Scene = () => {
  const materialRef = useRef();
  const params = useStore((state) => state.params);
  const textures = useStore((state) => state.textures);
  const audioData = useStore((state) => state.audioData);

  // Memoize default textures so they don't recreate on render
  const defaultTextures = useMemo(() => ({
    color: createNoiseTexture('color'),
    depth: createNoiseTexture('depth'),
    normal: createFlatNormalTexture()
  }), []);

  useEffect(() => {
    console.log('Textures updated in Scene:', textures);
  }, [textures]);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uTime = state.clock.elapsedTime;
      materialRef.current.uAudioLow = audioData.low;
      materialRef.current.uAudioMid = audioData.mid;
      materialRef.current.uAudioHigh = audioData.high;
    }
  });

  return (
    <>
      <mesh>
        <planeGeometry args={[2, 2, 256, 256]} />
        <depthMaterial
          ref={materialRef}
          side={THREE.DoubleSide}
          uColorTexture={textures.color || defaultTextures.color}
          uDepthTexture={textures.depth || defaultTextures.depth}
          uNormalTexture={textures.normal || defaultTextures.normal}
          // Geometry Effects
          uDepthStrength={params.uDepthStrength}
          uNoiseSpeed={params.uNoiseSpeed}
          uTwistStrength={params.uTwistStrength}
          uRippleStrength={params.uRippleStrength}
          uRippleFreq={params.uRippleFreq}
          uFoldStrength={params.uFoldStrength}
          uBulgeStrength={params.uBulgeStrength}
          uSpikeStrength={params.uSpikeStrength}
          uExplode={params.uExplode}
          uMelt={params.uMelt}
          uLFO={params.uLFO}
          uJitter={params.uJitter}
          uTiles={params.uTiles}
          uMirrorX={params.uMirrorX}
          uMirrorY={params.uMirrorY}
          uPointSize={params.uPointSize}
          uAudioGain={params.uAudioGain}
          uTimeFreeze={params.uTimeFreeze}
          uBandGeo={params.uBandGeo}
          uBandAction={params.uBandAction}
          uBandDetail={params.uBandDetail}
          // Shader-based Effects
          uWaveDistort={params.uWaveDistort}
          uBarrelDistort={params.uBarrelDistort}
          uKaleidoscope={params.uKaleidoscope}
          uMirrorGlitch={params.uMirrorGlitch}
          uColorBleed={params.uColorBleed}
          uDatamosh={params.uDatamosh}
          uColorShift={params.uColorShift}
        />
      </mesh>
      <Effects />
    </>
  );
};

const Visualizer = () => {
  return (
    <div className="absolute top-0 left-0 w-full h-full z-0">
      <Canvas camera={{ position: [0, 0, 2], fov: 75 }} dpr={[1, 2]}>
        <Scene />
        <OrbitControls enableDamping />
      </Canvas>
    </div>
  );
};

export default Visualizer;
