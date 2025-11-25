export const vertexShader = `
    uniform float uTime;
    
    uniform float uDepthStrength;
    uniform sampler2D uDepthTexture;
    uniform vec2 uMouse;
    uniform float uNoiseSpeed;
    uniform float uTwistStrength;
    uniform float uRippleStrength;
    uniform float uRippleFreq;
    uniform float uFoldStrength;
    uniform float uBulgeStrength; 
    uniform float uSpikeStrength;
    uniform float uExplode; 
    uniform float uMelt; 
    uniform float uLFO; 
    uniform float uJitter; 

    // Space / Tiling
    uniform float uTiles;
    uniform float uMirrorX; 
    uniform float uMirrorY; 

    uniform float uPointSize;

    uniform float uAudioLow;
    uniform float uAudioMid;
    uniform float uAudioHigh;
    uniform float uAudioGain; 
    uniform float uTimeFreeze;
    
    uniform int uBandGeo;    
    uniform int uBandAction; 
    uniform int uBandDetail; 

    varying vec2 vUv;
    varying float vElevation;

    vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
    float snoise(vec2 v){
        const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
        vec2 i  = floor(v + dot(v, C.yy) );
        vec2 x0 = v -   i + dot(i, C.xx);
        vec2 i1;
        i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
        vec4 x12 = x0.xyxy + C.xxzz;
        x12.xy -= i1;
        i = mod(i, 289.0);
        vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
        vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
        m = m*m ;
        m = m*m ;
        vec3 x = 2.0 * fract(p * C.www) - 1.0;
        vec3 h = abs(x) - 0.5;
        vec3 ox = floor(x + 0.5);
        vec3 a0 = x - ox;
        m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
        vec3 g;
        g.x  = a0.x  * x0.x  + h.x  * x0.y;
        g.yz = a0.yz * x12.xz + h.yz * x12.yw;
        return 130.0 * dot(m, g);
    }

    float getAudioLevel(int band) {
        if (band == 1) return uAudioLow;
        if (band == 2) return uAudioMid;
        if (band == 3) return uAudioHigh;
        return 0.0;
    }

    void main() {
        vec2 tUv = uv * uTiles;
        if (uMirrorX > 0.5) tUv.x = abs(fract(tUv.x) * 2.0 - 1.0); else tUv.x = fract(tUv.x);
        if (uMirrorY > 0.5) tUv.y = abs(fract(tUv.y) * 2.0 - 1.0); else tUv.y = fract(tUv.y);
        vUv = tUv;
        
        float geoAudio = getAudioLevel(uBandGeo) * uAudioGain;
        float actionAudio = getAudioLevel(uBandAction) * uAudioGain;
        float detailAudio = getAudioLevel(uBandDetail) * uAudioGain;
        
        float activeTime = uTime;
        if (uTimeFreeze > 0.5 && detailAudio > 0.8) {
             activeTime = floor(uTime * 4.0) / 4.0;
        }

        if (uMelt > 0.0) {
            float drop = snoise(vec2(vUv.x * 10.0, activeTime * 0.2)) * uMelt;
            vUv.y -= drop * 0.5; 
        }

        vec3 pos = position;
        
        if (uJitter > 0.0) {
            float shake = (snoise(vec2(activeTime * 50.0, pos.y)) - 0.5) * uJitter * detailAudio; 
            pos.x += shake;
            pos.y += shake;
        }

        if (uFoldStrength > 0.01) {
            float foldMod = 1.0 + (actionAudio * 0.5);
            pos.x = abs(pos.x) - (0.5 * uFoldStrength * foldMod); 
        }
        
        vec3 norm = vec3(0.0, 0.0, 1.0); // Default normal

        if (uExplode > 0.0) {
            pos += norm * uExplode * geoAudio * 0.5;
        }

        float distCenter = distance(pos.xy, vec2(0.0));
        float bulge = uBulgeStrength * geoAudio * 3.0;
        pos.z += sin(distCenter * 3.0 - activeTime) * bulge;

        vec4 depthMap = texture2D(uDepthTexture, vUv);
        float depthValue = depthMap.r; 

        float noiseVal = snoise(uv * 3.0 + activeTime * (uNoiseSpeed + actionAudio));

        float twistAmount = uTwistStrength + (actionAudio * 0.5);
        
        float distUV = distance(uv, vec2(0.5));
        float ripple = sin(distUV * uRippleFreq - activeTime * 2.0) * uRippleStrength * geoAudio;

        float elevation = depthValue * (uDepthStrength + uLFO * 0.5);
        elevation += noiseVal * 0.1; 
        elevation += geoAudio * 1.5 * depthValue; 
        elevation += ripple;

        // Twist
        float angle = twistAmount * distCenter * sin(activeTime);
        float s = sin(angle);
        float c = cos(angle);
        mat2 rotation = mat2(c, -s, s, c);
        pos.xy = rotation * pos.xy;

        pos.z += elevation;
        
        if (uSpikeStrength > 0.0) {
            pos.z += pow(depthValue, 4.0) * uSpikeStrength * detailAudio * 2.0;
        }

        vElevation = pos.z;

        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        gl_PointSize = uPointSize * (1.0 + detailAudio);
    }
`;

export const fragmentShader = `
    uniform sampler2D uColorTexture;
    uniform sampler2D uNormalTexture;
    uniform float uTime;
    uniform float uColorShift;
    uniform float uAudioLow;
    uniform float uAudioMid;
    uniform float uAudioHigh;
    uniform float uAudioGain;
    
    // Advanced Effects
    uniform float uWaveDistort;
    uniform float uBarrelDistort;
    uniform int uKaleidoscope;
    uniform float uMirrorGlitch;
    uniform float uColorBleed;
    uniform float uDatamosh;

    varying vec2 vUv;
    varying float vElevation;

    // Noise functions
    float rand(vec2 co){
        return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
    }
    
    vec2 rand2(vec2 p) {
        return fract(sin(vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))))*43758.5453);
    }
    
    float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float a = rand(i);
        float b = rand(i + vec2(1.0, 0.0));
        float c = rand(i + vec2(0.0, 1.0));
        float d = rand(i + vec2(1.0, 1.0));
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }

    // Barrel Distortion
    vec2 barrelDistort(vec2 uv, float strength) {
        vec2 center = uv - 0.5;
        float dist = length(center);
        float distPow = pow(dist, 2.0);
        vec2 distorted = uv + center * distPow * strength;
        return distorted;
    }
    
    // Wave Distortion
    vec2 waveDistort(vec2 uv, float time, float strength) {
        uv.x += sin(uv.y * 20.0 + time * 2.0) * strength * 0.02;
        uv.y += cos(uv.x * 15.0 + time * 1.5) * strength * 0.02;
        return uv;
    }
    
    // Kaleidoscope
    vec2 kaleidoscope(vec2 uv, int segments) {
        if (segments <= 0) return uv;
        vec2 center = uv - 0.5;
        float angle = atan(center.y, center.x);
        float radius = length(center);
        float segmentAngle = 3.14159 * 2.0 / float(segments);
        angle = mod(angle, segmentAngle);
        angle = abs(angle - segmentAngle * 0.5);
        return vec2(cos(angle), sin(angle)) * radius + 0.5;
    }
    
    // Color Bleed / Ghosting
    vec3 colorBleed(sampler2D tex, vec2 uv, float strength) {
        vec3 col = texture2D(tex, uv).rgb;
        col.r = texture2D(tex, uv + vec2(strength * 0.01, 0.0)).r;
        col.b = texture2D(tex, uv - vec2(strength * 0.01, 0.0)).b;
        return col;
    }

    void main() {
        vec2 uv = vUv;
        
        // Apply Barrel Distortion
        if (uBarrelDistort > 0.0) {
            uv = barrelDistort(uv, uBarrelDistort);
        }
        
        // Apply Wave Distortion
        if (uWaveDistort > 0.0) {
            uv = waveDistort(uv, uTime, uWaveDistort * (1.0 + uAudioMid));
        }
        
        // Apply Kaleidoscope
        if (uKaleidoscope > 0) {
            uv = kaleidoscope(uv, uKaleidoscope);
        }
        
        // Mirror Glitch
        if (uMirrorGlitch > 0.0 && rand(vec2(floor(uTime * 10.0), 0.0)) < uMirrorGlitch) {
            float glitchY = rand(vec2(uTime, 1.0));
            if (abs(uv.y - glitchY) < 0.1) {
                uv.x = 1.0 - uv.x;
            }
        }
        
        // Datamosh effect (offset based on previous frame simulation)
        if (uDatamosh > 0.0) {
            float blockSize = 0.05 + uDatamosh * 0.1;
            vec2 block = floor(uv / blockSize) * blockSize;
            float rnd = rand(block + floor(uTime * 5.0));
            if (rnd < uDatamosh * 0.3) {
                uv += (rand2(block) - 0.5) * uDatamosh * 0.2;
            }
        }
        
        // Clamp UV after distortions
        uv = clamp(uv, 0.0, 1.0);
        
        // Color Sampling with optional bleed
        vec3 color;
        if (uColorBleed > 0.0) {
            color = colorBleed(uColorTexture, uv, uColorBleed * (1.0 + uAudioLow));
        } else {
            color = texture2D(uColorTexture, uv).rgb;
        }

        // Normal Map Influence (Fake Lighting)
        vec3 normalColor = texture2D(uNormalTexture, uv).rgb;
        vec3 normal = normalize(normalColor * 2.0 - 1.0);
        vec3 lightDir = normalize(vec3(sin(uTime), cos(uTime), 1.0));
        float light = max(dot(normal, lightDir), 0.0);
        color *= (0.5 + light * 0.5);
        
        // Color Shift based on time
        if (uColorShift > 0.0) {
            float shift = uColorShift * uTime * 0.1;
            color.rgb = vec3(
                color.r * cos(shift) - color.g * sin(shift),
                color.r * sin(shift) + color.g * cos(shift),
                color.b
            );
        }

        // Depth Color Tint
        color += vec3(0.0, 1.0, 0.8) * vElevation * 0.2;

        gl_FragColor = vec4(color, 1.0);
    }
`;

export const postVertexShader = `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

export const postFragmentShader = `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    
    // Effects
    uniform float uRGBShift;
    uniform float uPixelate;
    uniform float uScanline;
    uniform float uVignette;
    uniform float uFilmGrain;
    uniform float uGlitchStrength;
    uniform float uCRT;
    
    // Color Grading
    uniform float uBrightness;
    uniform float uContrast;
    uniform float uSaturation;
    uniform float uHue;
    uniform float uInvert;
    
    varying vec2 vUv;

    // Helper functions
    float random(vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
    }

    vec3 rgb2hsv(vec3 c) {
        vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
        vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
        vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
        float d = q.x - min(q.w, q.y);
        float e = 1.0e-10;
        return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
    }

    vec3 hsv2rgb(vec3 c) {
        vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
        vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
        return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
    }

    void main() {
        vec2 uv = vUv;
        
        // 1. Pixelation
        if (uPixelate > 0.0) {
            float pixels = 2000.0 * (1.0 - uPixelate * 0.95);
            uv = floor(uv * pixels) / pixels;
        }

        // 2. Glitch (Displacement)
        if (uGlitchStrength > 0.0) {
            float time = floor(uTime * 20.0);
            vec2 noise = vec2(random(vec2(time, uv.y)), random(vec2(time, uv.x)));
            if (random(vec2(time, 0.0)) < uGlitchStrength) {
                uv += (noise - 0.5) * uGlitchStrength * 0.1;
            }
        }

        // 3. RGB Shift (Chromatic Aberration)
        vec4 color;
        if (uRGBShift > 0.0 || uGlitchStrength > 0.0) {
            float shift = uRGBShift + (uGlitchStrength * 0.02);
            float r = texture2D(tDiffuse, uv + vec2(shift, 0.0)).r;
            float g = texture2D(tDiffuse, uv).g;
            float b = texture2D(tDiffuse, uv - vec2(shift, 0.0)).b;
            color = vec4(r, g, b, 1.0);
        } else {
            color = texture2D(tDiffuse, uv);
        }

        // 4. Scanlines
        if (uScanline > 0.0) {
            float scan = sin(uv.y * 800.0) * 0.5 + 0.5;
            color.rgb *= 1.0 - (scan * uScanline * 0.5);
        }

        // 5. CRT / Dot Screen
        if (uCRT > 0.0) {
            vec2 center = vec2(0.5);
            float dist = distance(uv, center);
            float dotSize = 300.0 * (1.0 - uCRT * 0.5);
            float pattern = sin(uv.x * dotSize) * sin(uv.y * dotSize);
            color.rgb *= 1.0 - (pattern * uCRT * 0.2);
        }

        // 6. Vignette
        if (uVignette > 0.0) {
            float dist = distance(uv, vec2(0.5));
            color.rgb *= smoothstep(0.8, 0.8 - (uVignette * 0.5), dist * (1.0 + uVignette));
        }

        // 7. Film Grain
        if (uFilmGrain > 0.0) {
            float grain = random(uv + uTime);
            color.rgb += (grain - 0.5) * uFilmGrain * 0.3;
        }

        // 8. Color Grading
        // Brightness
        color.rgb += uBrightness;
        
        // Contrast
        color.rgb = (color.rgb - 0.5) * (1.0 + uContrast) + 0.5;
        
        // Saturation & Hue
        vec3 hsv = rgb2hsv(color.rgb);
        hsv.y *= uSaturation;
        hsv.x += uHue;
        color.rgb = hsv2rgb(hsv);

        // Invert
        if (uInvert > 0.5) {
            color.rgb = 1.0 - color.rgb;
        }

        gl_FragColor = color;
    }
`;
