import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import * as THREE from 'three';

export interface MotionBlurCanvasHandle {
  triggerBlur: (direction?: 'forward' | 'left' | 'right') => void;
}

interface MotionBlurCanvasProps {
  isTriggered?: boolean;
  onAnimationComplete?: () => void;
}

export const MotionBlurCanvas = forwardRef<MotionBlurCanvasHandle, MotionBlurCanvasProps>(
  ({ onAnimationComplete }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const animRef = useRef<number | null>(null);
    const isRunningRef = useRef<boolean>(false);
    const triggerRef = useRef<((direction?: 'forward' | 'left' | 'right') => void) | null>(null);

    useImperativeHandle(ref, () => ({
      triggerBlur: (dir = 'forward') => {
        if (triggerRef.current) {
          triggerRef.current(dir);
        }
      },
    }));

    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      const width = window.innerWidth;
      const height = window.innerHeight;

      // 1. Three.js Scene & Camera
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(70, width / height, 0.1, 1000);
      camera.position.z = 100;

      // 2. WebGL Renderer
      const renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance',
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.domElement.style.position = 'fixed';
      renderer.domElement.style.top = '0';
      renderer.domElement.style.left = '0';
      renderer.domElement.style.width = '100vw';
      renderer.domElement.style.height = '100vh';
      renderer.domElement.style.pointerEvents = 'none';
      renderer.domElement.style.zIndex = '35';
      renderer.domElement.style.opacity = '0';
      renderer.domElement.style.transition = 'opacity 0.15s ease-out';
      container.appendChild(renderer.domElement);

      // 3. Motion Blur Streaks (LineSegments)
      const STREAK_COUNT = 900;
      const positions = new Float32Array(STREAK_COUNT * 6); // 2 vertices per line (x, y, z)
      const colors = new Float32Array(STREAK_COUNT * 6); // RGB per vertex
      const origins: { x: number; y: number; z: number; speed: number; baseLen: number }[] = [];

      // Color palette: Cyan, Emerald, White
      const palette = [
        new THREE.Color(0x38bdf8), // Cyan
        new THREE.Color(0x34d399), // Emerald
        new THREE.Color(0xffffff), // White
        new THREE.Color(0x818cf8), // Indigo
      ];

      for (let i = 0; i < STREAK_COUNT; i++) {
        // Distribute radially around camera
        const radius = THREE.MathUtils.randFloat(15, 220);
        const theta = THREE.MathUtils.randFloat(0, Math.PI * 2);
        const x = Math.cos(theta) * radius;
        const y = Math.sin(theta) * radius;
        const z = THREE.MathUtils.randFloat(-200, 150);

        origins.push({
          x,
          y,
          z,
          speed: THREE.MathUtils.randFloat(1.2, 3.5),
          baseLen: THREE.MathUtils.randFloat(4, 16),
        });

        const color = palette[Math.floor(Math.random() * palette.length)];
        const idx = i * 6;

        // Start vertex
        positions[idx] = x;
        positions[idx + 1] = y;
        positions[idx + 2] = z;
        colors[idx] = color.r;
        colors[idx + 1] = color.g;
        colors[idx + 2] = color.b;

        // End vertex
        positions[idx + 3] = x;
        positions[idx + 4] = y;
        positions[idx + 5] = z + 10;
        colors[idx + 3] = color.r * 1.5;
        colors[idx + 4] = color.g * 1.5;
        colors[idx + 5] = color.b * 1.5;
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      const material = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });

      const lineSegments = new THREE.LineSegments(geometry, material);
      scene.add(lineSegments);

      // 4. Subtle Radial Blur Flash Overlay
      const flashGeo = new THREE.PlaneGeometry(300, 200);
      const flashMat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: {
          uIntensity: { value: 0 },
          uColor: { value: new THREE.Color(0x38bdf8) },
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform float uIntensity;
          uniform vec3 uColor;
          varying vec2 vUv;
          void main() {
            float dist = distance(vUv, vec2(0.5));
            float vignette = smoothstep(0.8, 0.2, dist);
            float alpha = uIntensity * vignette * 0.25;
            gl_FragColor = vec4(uColor, alpha);
          }
        `,
      });
      const flashMesh = new THREE.Mesh(flashGeo, flashMat);
      flashMesh.position.z = 20;
      scene.add(flashMesh);

      // 5. Animation Dynamics State
      let progress = 1; // 0 (start) to 1 (done)
      let duration = 600; // ms
      let startTime = 0;
      let motionDir: 'forward' | 'left' | 'right' = 'forward';

      const trigger = (dir: 'forward' | 'left' | 'right' = 'forward') => {
        motionDir = dir;
        progress = 0;
        startTime = performance.now();
        renderer.domElement.style.opacity = '1';

        if (!isRunningRef.current) {
          isRunningRef.current = true;
          loop();
        }
      };

      triggerRef.current = trigger;

      // 6. Render Loop
      const loop = () => {
        const now = performance.now();
        const elapsed = now - startTime;
        progress = Math.min(elapsed / duration, 1);

        // Velocity curve: rapid acceleration spike then smooth exponential decay
        let velocity = 0;
        if (progress < 0.25) {
          // Spike up
          velocity = progress / 0.25;
        } else {
          // Decelerate out
          const t = (progress - 0.25) / 0.75;
          velocity = Math.pow(1 - t, 2.2);
        }

        // Adjust line opacity and flash
        material.opacity = velocity * 0.92;
        flashMat.uniforms.uIntensity.value = velocity * 0.5;

        // Stretch and advance streaks
        const posAttr = geometry.attributes.position as THREE.BufferAttribute;
        const array = posAttr.array as Float32Array;

        const stretchMultiplier = velocity * 55;
        const speedMultiplier = velocity * 22;

        for (let i = 0; i < STREAK_COUNT; i++) {
          const orig = origins[i];
          const idx = i * 6;

          if (motionDir === 'forward') {
            orig.z += orig.speed * speedMultiplier;
            if (orig.z > 140) {
              orig.z = -220;
            }

            const tailLength = orig.baseLen + stretchMultiplier * orig.speed;

            array[idx] = orig.x;
            array[idx + 1] = orig.y;
            array[idx + 2] = orig.z;

            array[idx + 3] = orig.x;
            array[idx + 4] = orig.y;
            array[idx + 5] = orig.z - tailLength;
          } else {
            // Horizontal skew motion blur
            const xOffset = motionDir === 'right' ? -1 : 1;
            orig.x += xOffset * orig.speed * speedMultiplier * 0.7;
            if (Math.abs(orig.x) > 240) {
              orig.x = -xOffset * 240;
            }

            const tailLength = orig.baseLen + stretchMultiplier * orig.speed * 0.8;

            array[idx] = orig.x;
            array[idx + 1] = orig.y;
            array[idx + 2] = orig.z;

            array[idx + 3] = orig.x - xOffset * tailLength;
            array[idx + 4] = orig.y;
            array[idx + 5] = orig.z;
          }
        }

        posAttr.needsUpdate = true;
        renderer.render(scene, camera);

        if (progress < 1) {
          animRef.current = requestAnimationFrame(loop);
        } else {
          renderer.domElement.style.opacity = '0';
          isRunningRef.current = false;
          if (onAnimationComplete) {
            onAnimationComplete();
          }
        }
      };

      const handleResize = () => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      };

      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        if (animRef.current) cancelAnimationFrame(animRef.current);
        geometry.dispose();
        material.dispose();
        flashGeo.dispose();
        flashMat.dispose();
        renderer.dispose();
        if (renderer.domElement.parentElement) {
          renderer.domElement.parentElement.removeChild(renderer.domElement);
        }
      };
    }, [onAnimationComplete]);

    return <div ref={containerRef} className="fixed inset-0 pointer-events-none z-30 overflow-hidden" />;
  }
);

MotionBlurCanvas.displayName = 'MotionBlurCanvas';
