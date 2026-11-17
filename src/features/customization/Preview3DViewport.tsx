import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { getTableThemeConfig } from '@/config/catalog';
import { PUCK_HEIGHT, PUCK_RADIUS } from '@/game/constants/arena';
import {
  buildCustomStriker,
  type BuiltStrikerInstance,
} from '@/game/objects/strikerFactory';
import {
  createBrushedMetalTexture,
  createCarbonWeaveTexture,
  createContactShadowTexture,
  drawPuckTopToCanvas,
  drawTableSurfaceToCanvas,
} from '@/game/renderer/textures';
import type {
  PuckSkinId,
  StrikerColorId,
  StrikerStyleId,
  TableThemeId,
} from '@/types/game';
import { detectSoftwareWebGL, scheduleAfterDraw } from '@/utils/webgl';

export type PreviewMode = 'striker' | 'theme' | 'puck';

interface Preview3DViewportProps {
  mode: PreviewMode;
  strikerStyle?: StrikerStyleId;
  strikerColor?: StrikerColorId;
  customColorHex?: string;
  tableTheme?: TableThemeId;
  puckSkin?: PuckSkinId;
  className?: string;
}

export const Preview3DViewport: React.FC<Preview3DViewportProps> = ({
  mode,
  strikerStyle = 'neon_cyan',
  strikerColor = 'cyan',
  customColorHex = '#00E5FF',
  tableTheme = 'classic_arcade',
  puckSkin = 'tournament_pro',
  className = '',
}) => {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const stateRef = useRef({
    mode,
    strikerStyle,
    strikerColor,
    customColorHex,
    tableTheme,
    puckSkin,
  });
  stateRef.current = {
    mode,
    strikerStyle,
    strikerColor,
    customColorHex,
    tableTheme,
    puckSkin,
  };

  const rebuildFnRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    rebuildFnRef.current?.();
  }, [mode, strikerStyle, strikerColor, customColorHex, tableTheme, puckSkin]);

  useEffect(() => {
    const container = hostRef.current;
    if (!container) return;

    const softGl = detectSoftwareWebGL();
    const renderer = new THREE.WebGLRenderer({
      antialias: !softGl,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.setPixelRatio(softGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));

    const canvas = renderer.domElement;
    canvas.className = 'block w-full h-full cursor-grab active:cursor-grabbing touch-none';
    container.appendChild(canvas);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envRT.texture;
    scene.environmentIntensity = 0.85;
    pmrem.dispose();

    const rect = container.getBoundingClientRect();
    const camera = new THREE.PerspectiveCamera(
      34,
      Math.max(1, rect.width) / Math.max(1, rect.height),
      0.05,
      15
    );
    camera.position.set(0, 0.24, 0.34);
    camera.lookAt(0, 0.02, 0);

    const hemi = new THREE.HemisphereLight(0x93c5fd, 0x05070c, 0.9);
    scene.add(hemi);
    const key = new THREE.DirectionalLight(0xfff8ef, 2.0);
    key.position.set(1.2, 2.0, 1.4);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x38bdf8, 1.1);
    rim.position.set(-1.2, 1.0, -1.2);
    scene.add(rim);

    // Shared procedural textures reused from renderer/textures
    const aniso = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    const brushedTex = createBrushedMetalTexture(aniso);
    const carbonTex = createCarbonWeaveTexture(aniso);
    const shadowTex = createContactShadowTexture();

    const holder = new THREE.Group();
    scene.add(holder);

    let activeStriker: BuiltStrikerInstance | null = null;
    const tempDisposables: Array<{ dispose: () => void }> = [];

    const clearHolder = () => {
      if (activeStriker) {
        holder.remove(activeStriker.group);
        activeStriker.dispose();
        activeStriker = null;
      }
      while (holder.children.length > 0) {
        holder.remove(holder.children[0]);
      }
      tempDisposables.forEach((d) => d.dispose());
      tempDisposables.length = 0;
    };

    const rebuild = () => {
      clearHolder();
      const s = stateRef.current;

      if (s.mode === 'striker') {
        camera.position.set(0, 0.16, 0.24);
        camera.lookAt(0, 0.025, 0);
        activeStriker = buildCustomStriker(
          s.strikerStyle,
          s.strikerColor,
          s.customColorHex,
          brushedTex,
          carbonTex,
          shadowTex,
          true
        );
        holder.add(activeStriker.group);
      } else if (s.mode === 'puck') {
        camera.position.set(0, 0.13, 0.19);
        camera.lookAt(0, 0.008, 0);

        const puckCanvas = document.createElement('canvas');
        puckCanvas.width = 256;
        puckCanvas.height = 256;
        drawPuckTopToCanvas(puckCanvas, s.puckSkin);
        const topTex = new THREE.CanvasTexture(puckCanvas);
        topTex.colorSpace = THREE.SRGBColorSpace;
        topTex.anisotropy = aniso;

        const bodyGeo = new THREE.CylinderGeometry(PUCK_RADIUS, PUCK_RADIUS, PUCK_HEIGHT, 40);
        const bodyMat = new THREE.MeshStandardMaterial({
          color: 0x0b101b,
          roughness: 0.3,
          metalness: 0.5,
        });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = PUCK_HEIGHT / 2;

        const capGeo = new THREE.CircleGeometry(PUCK_RADIUS * 0.94, 36);
        const capMat = new THREE.MeshStandardMaterial({
          map: topTex,
          roughness: 0.22,
          metalness: 0.15,
        });
        const cap = new THREE.Mesh(capGeo, capMat);
        cap.rotation.x = -Math.PI / 2;
        cap.position.y = PUCK_HEIGHT + 0.0005;

        holder.add(body, cap);
        tempDisposables.push(topTex, bodyGeo, bodyMat, capGeo, capMat);
      } else if (s.mode === 'theme') {
        camera.position.set(0, 0.36, 0.48);
        camera.lookAt(0, 0.0, 0);

        const theme = getTableThemeConfig(s.tableTheme);
        const surfCanvas = document.createElement('canvas');
        surfCanvas.width = 512;
        surfCanvas.height = 1024;
        drawTableSurfaceToCanvas(surfCanvas, s.tableTheme);
        const surfTex = new THREE.CanvasTexture(surfCanvas);
        surfTex.colorSpace = THREE.SRGBColorSpace;
        surfTex.anisotropy = aniso;

        const deckGeo = new THREE.BoxGeometry(0.24, 0.01, 0.44);
        const deckMat = new THREE.MeshPhysicalMaterial({
          map: surfTex,
          roughness: 0.25,
          clearcoat: 0.75,
        });
        const deck = new THREE.Mesh(deckGeo, deckMat);

        const railGeo = new THREE.BoxGeometry(0.275, 0.024, 0.475);
        const railMat = new THREE.MeshStandardMaterial({
          color: theme.railHex,
          roughness: 0.32,
          metalness: 0.75,
        });
        const rail = new THREE.Mesh(railGeo, railMat);
        rail.position.y = -0.008;

        const stripGeo = new THREE.BoxGeometry(0.004, 0.004, 0.18);
        const p1StripMat = new THREE.MeshStandardMaterial({
          color: theme.lineAccentP1,
          emissive: theme.lineAccentP1,
          emissiveIntensity: 1.4,
        });
        const p2StripMat = new THREE.MeshStandardMaterial({
          color: theme.lineAccentP2,
          emissive: theme.lineAccentP2,
          emissiveIntensity: 1.4,
        });
        const s1L = new THREE.Mesh(stripGeo, p1StripMat);
        s1L.position.set(-0.122, 0.007, 0.11);
        const s1R = new THREE.Mesh(stripGeo, p1StripMat);
        s1R.position.set(0.122, 0.007, 0.11);
        const s2L = new THREE.Mesh(stripGeo, p2StripMat);
        s2L.position.set(-0.122, 0.007, -0.11);
        const s2R = new THREE.Mesh(stripGeo, p2StripMat);
        s2R.position.set(0.122, 0.007, -0.11);

        holder.add(rail, deck, s1L, s1R, s2L, s2R);
        tempDisposables.push(
          surfTex,
          deckGeo,
          deckMat,
          railGeo,
          railMat,
          stripGeo,
          p1StripMat,
          p2StripMat
        );
      }
    };

    rebuildFnRef.current = rebuild;
    rebuild();

    // Pointer drag to rotate 3D preview
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let rotY = 0.45;
    let rotX = 0.12;

    const onDown = (e: PointerEvent) => {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      canvas.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      rotY += dx * 0.012;
      rotX = THREE.MathUtils.clamp(rotX + dy * 0.008, -0.35, 0.65);
    };
    const onUp = (e: PointerEvent) => {
      dragging = false;
      if (canvas.hasPointerCapture(e.pointerId)) {
        canvas.releasePointerCapture(e.pointerId);
      }
    };

    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);

    const updateSize = () => {
      const r = container.getBoundingClientRect();
      const w = Math.max(1, r.width);
      const h = Math.max(1, r.height);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(container);

    const clock = new THREE.Clock();
    let frameId = 0;
    let disposed = false;
    let elapsed = 0;

    const tick = () => {
      if (disposed) return;
      const dt = Math.min(clock.getDelta(), 0.05);
      elapsed += dt;
      if (!dragging) {
        rotY += dt * 0.55;
      }
      holder.rotation.y = rotY;
      holder.rotation.x = rotX;
      activeStriker?.update(elapsed, dt);
      renderer.render(scene, camera);

      if (softGl) {
        scheduleAfterDraw(
          renderer.getContext() as WebGL2RenderingContext | null,
          () => disposed,
          (id) => {
            frameId = id;
          },
          tick
        );
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    if (softGl) {
      scheduleAfterDraw(
        renderer.getContext() as WebGL2RenderingContext | null,
        () => disposed,
        (id) => {
          frameId = id;
        },
        tick
      );
    } else {
      frameId = requestAnimationFrame(tick);
    }

    return () => {
      disposed = true;
      rebuildFnRef.current = null;
      cancelAnimationFrame(frameId);
      window.clearTimeout(frameId);
      ro.disconnect();
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
      clearHolder();
      brushedTex.dispose();
      carbonTex.dispose();
      shadowTex.dispose();
      envRT.dispose();
      renderer.dispose();
      if (canvas.parentNode === container) {
        container.removeChild(canvas);
      }
    };
  }, []);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <div ref={hostRef} className="w-full h-full" />
      <div className="pointer-events-none absolute bottom-2 right-2.5 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
        Drag to Rotate 3D
      </div>
    </div>
  );
};
