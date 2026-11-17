import * as THREE from 'three';
import { getTableThemeConfig } from '@/config/catalog';
import type { PuckSkinId, TableThemeId } from '@/types/game';

export interface TableTextureSet {
  surfaceColor: THREE.CanvasTexture;
  surfaceRoughness: THREE.CanvasTexture;
  surfaceBump: THREE.CanvasTexture;
  brushedMetal: THREE.CanvasTexture;
  carbonWeave: THREE.CanvasTexture;
  puckTop: THREE.CanvasTexture;
  contactShadow: THREE.CanvasTexture;
  dispose: () => void;
}

export function drawTableSurfaceToCanvas(
  canvas: HTMLCanvasElement,
  themeId: TableThemeId
): void {
  const theme = getTableThemeConfig(themeId);
  const ctx = canvas.getContext('2d')!;
  const w = canvas.width;
  const h = canvas.height;

  const grad = ctx.createRadialGradient(w / 2, h / 2, 100, w / 2, h / 2, h * 0.65);
  grad.addColorStop(0, theme.surfaceTop);
  grad.addColorStop(0.55, theme.surfaceMid);
  grad.addColorStop(1, theme.surfaceEdge);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Subtle side speed lanes
  ctx.fillStyle = `${theme.lineAccentP1}10`;
  ctx.fillRect(42, 0, 110, h);
  ctx.fillRect(w - 152, 0, 110, h);

  // Optional Cyber/Neon precision grid overlay
  if (theme.gridOverlay) {
    ctx.strokeStyle = `${theme.lineAccentP1}1A`;
    ctx.lineWidth = 2;
    for (let x = 64; x < w; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x, 20);
      ctx.lineTo(x, h - 20);
      ctx.stroke();
    }
    for (let y = 64; y < h; y += 64) {
      ctx.beginPath();
      ctx.moveTo(20, y);
      ctx.lineTo(w - 20, y);
      ctx.stroke();
    }
  }

  // Air-jet micro-perforation dot matrix
  ctx.fillStyle = `${theme.linePrimary}24`;
  for (let y = 32; y < h; y += 32) {
    for (let x = 32; x < w; x += 32) {
      ctx.beginPath();
      ctx.arc(x, y, 1.35, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Crisp inner perimeter boundary frame
  ctx.strokeStyle = `${theme.linePrimary}B8`;
  ctx.lineWidth = 8;
  ctx.strokeRect(20, 20, w - 40, h - 40);

  // Center Line (triple-band high-visibility)
  ctx.fillStyle = theme.lineAccentP1;
  ctx.fillRect(20, h / 2 + 6, w - 40, 5);
  ctx.fillStyle = theme.lineAccentP2;
  ctx.fillRect(20, h / 2 - 11, w - 40, 5);
  ctx.fillStyle = theme.linePrimary;
  ctx.fillRect(20, h / 2 - 5, w - 40, 10);

  // Zone lines
  ctx.fillStyle = `${theme.lineAccentP2}58`;
  ctx.fillRect(20, Math.round(h * 0.3125), w - 40, 6);
  ctx.fillStyle = `${theme.lineAccentP1}58`;
  ctx.fillRect(20, Math.round(h * 0.6845), w - 40, 6);

  // Center Face-off Circle
  ctx.fillStyle = `${theme.lineAccentP1}16`;
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, 174, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = theme.linePrimary;
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, 174, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = theme.lineAccentP1;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, 154, 0, Math.PI * 2);
  ctx.stroke();

  // Center emblem
  ctx.fillStyle = theme.surfaceEdge;
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, 42, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = theme.linePrimary;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, 42, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = theme.lineAccentP1;
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, 16, 0, Math.PI * 2);
  ctx.fill();

  // Four Corner Faceoff Circles
  const faceoffDots = [
    [256, 480],
    [768, 480],
    [256, 1568],
    [768, 1568],
  ];
  for (const [fx, fy] of faceoffDots) {
    const isTop = fy < h / 2;
    const dotCol = isTop ? theme.lineAccentP2 : theme.lineAccentP1;
    ctx.strokeStyle = `${dotCol}A8`;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(fx, fy, 76, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = dotCol;
    ctx.beginPath();
    ctx.arc(fx, fy, 9, 0, Math.PI * 2);
    ctx.fill();
  }

  // Top Goal Crease (P2)
  ctx.fillStyle = `${theme.lineAccentP2}2D`;
  ctx.strokeStyle = theme.lineAccentP2;
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(w / 2, 0, 224, 0, Math.PI);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = theme.linePrimary;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(w / 2, 0, 200, 0, Math.PI);
  ctx.stroke();

  // Bottom Goal Crease (P1)
  ctx.fillStyle = `${theme.lineAccentP1}2D`;
  ctx.strokeStyle = theme.lineAccentP1;
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(w / 2, h, 224, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = theme.linePrimary;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(w / 2, h, 200, Math.PI, Math.PI * 2);
  ctx.stroke();
}

export function drawPuckTopToCanvas(
  canvas: HTMLCanvasElement,
  skinId: PuckSkinId
): void {
  const pctx = canvas.getContext('2d')!;
  const size = canvas.width;
  const c = size / 2;

  let baseColor = '#FFFFFF';
  let outerRing = '#090D16';
  let innerRing = '#FACC15';
  let notchColor = '#0F172A';

  if (skinId === 'neon_core') {
    baseColor = '#E0F2FE';
    outerRing = '#08101E';
    innerRing = '#00E5FF';
    notchColor = '#0284C7';
  } else if (skinId === 'magma_disc') {
    baseColor = '#FFF7ED';
    outerRing = '#1C110D';
    innerRing = '#FF6B1A';
    notchColor = '#DC2626';
  } else if (skinId === 'glacier_core') {
    baseColor = '#F0F9FF';
    outerRing = '#0C2D48';
    innerRing = '#38BDF8';
    notchColor = '#0369A1';
  } else if (skinId === 'bullion_gold') {
    baseColor = '#FEF08A';
    outerRing = '#110E07';
    innerRing = '#F59E0B';
    notchColor = '#78350F';
  }

  pctx.fillStyle = baseColor;
  pctx.fillRect(0, 0, size, size);

  pctx.strokeStyle = outerRing;
  pctx.lineWidth = 24;
  pctx.beginPath();
  pctx.arc(c, c, 114, 0, Math.PI * 2);
  pctx.stroke();

  pctx.strokeStyle = innerRing;
  pctx.lineWidth = 10;
  pctx.beginPath();
  pctx.arc(c, c, 60, 0, Math.PI * 2);
  pctx.stroke();

  pctx.fillStyle = notchColor;
  pctx.fillRect(c - 6, 22, 12, 36);
  pctx.fillRect(c - 6, size - 58, 12, 36);
  pctx.fillRect(22, c - 6, 36, 12);
  pctx.fillRect(size - 58, c - 6, 36, 12);
}

export function createCarbonWeaveTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(0, 0, 128, 128);
  for (let y = 0; y < 128; y += 8) {
    for (let x = 0; x < 128; x += 8) {
      const parity = ((x + y) / 8) % 2 === 0;
      ctx.fillStyle = parity ? '#1E293B' : '#090D16';
      ctx.fillRect(x, y, 7, 7);
      ctx.fillStyle = parity ? '#334155' : '#111827';
      ctx.fillRect(x + 1, y + 1, 3, 5);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  tex.anisotropy = Math.min(8, Math.max(1, maxAnisotropy));
  return tex;
}

export function createBrushedMetalTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const metalCanvas = document.createElement('canvas');
  metalCanvas.width = 256;
  metalCanvas.height = 256;
  const mctx = metalCanvas.getContext('2d')!;
  mctx.fillStyle = '#1E293B';
  mctx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 2) {
    const shade = 28 + Math.floor(Math.random() * 24);
    mctx.fillStyle = `rgb(${shade}, ${shade + 10}, ${shade + 26})`;
    mctx.fillRect(0, y, 256, 1);
  }
  const brushedMetal = new THREE.CanvasTexture(metalCanvas);
  brushedMetal.colorSpace = THREE.SRGBColorSpace;
  brushedMetal.wrapS = THREE.RepeatWrapping;
  brushedMetal.wrapT = THREE.RepeatWrapping;
  brushedMetal.repeat.set(4, 4);
  brushedMetal.anisotropy = Math.min(8, Math.max(1, maxAnisotropy));
  return brushedMetal;
}

export function createContactShadowTexture(): THREE.CanvasTexture {
  const shadCanvas = document.createElement('canvas');
  shadCanvas.width = 128;
  shadCanvas.height = 128;
  const sctx = shadCanvas.getContext('2d')!;
  const sg = sctx.createRadialGradient(64, 64, 14, 64, 64, 62);
  sg.addColorStop(0, 'rgba(0, 0, 0, 0.88)');
  sg.addColorStop(0.58, 'rgba(0, 0, 0, 0.48)');
  sg.addColorStop(1, 'rgba(0, 0, 0, 0)');
  sctx.fillStyle = sg;
  sctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(shadCanvas);
}

export function createProceduralTextures(
  maxAnisotropy: number,
  initialTheme: TableThemeId = 'classic_arcade',
  initialPuckSkin: PuckSkinId = 'tournament_pro'
): TableTextureSet {
  const aniso = Math.min(8, Math.max(1, maxAnisotropy));

  // 1. Playing Surface Canvas Texture
  const surfCanvas = document.createElement('canvas');
  surfCanvas.width = 1024;
  surfCanvas.height = 2048;
  drawTableSurfaceToCanvas(surfCanvas, initialTheme);

  const surfaceColor = new THREE.CanvasTexture(surfCanvas);
  surfaceColor.colorSpace = THREE.SRGBColorSpace;
  surfaceColor.anisotropy = aniso;

  // 2. Surface Roughness & Micro-Perforation Bump
  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = 512;
  roughCanvas.height = 1024;
  const rctx = roughCanvas.getContext('2d')!;
  rctx.fillStyle = '#484848';
  rctx.fillRect(0, 0, 512, 1024);
  const wearGrad = rctx.createRadialGradient(256, 512, 40, 256, 512, 420);
  wearGrad.addColorStop(0, 'rgba(30, 30, 30, 0.6)');
  wearGrad.addColorStop(1, 'rgba(68, 68, 68, 0)');
  rctx.fillStyle = wearGrad;
  rctx.fillRect(0, 0, 512, 1024);

  const surfaceRoughness = new THREE.CanvasTexture(roughCanvas);
  surfaceRoughness.anisotropy = aniso;

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = 512;
  bumpCanvas.height = 1024;
  const bctx = bumpCanvas.getContext('2d')!;
  bctx.fillStyle = '#E8E8E8';
  bctx.fillRect(0, 0, 512, 1024);
  bctx.fillStyle = '#404040';
  for (let y = 16; y < 1024; y += 16) {
    for (let x = 16; x < 512; x += 16) {
      bctx.beginPath();
      bctx.arc(x, y, 0.9, 0, Math.PI * 2);
      bctx.fill();
    }
  }
  const surfaceBump = new THREE.CanvasTexture(bumpCanvas);
  surfaceBump.anisotropy = aniso;

  // 3. Brushed Anodized Gunmetal Texture for Rails & Strikers
  const brushedMetal = createBrushedMetalTexture(aniso);

  // 4. Carbon Fiber Weave Texture
  const carbonWeave = createCarbonWeaveTexture(aniso);

  // 5. Puck Top Graphic
  const puckCanvas = document.createElement('canvas');
  puckCanvas.width = 256;
  puckCanvas.height = 256;
  drawPuckTopToCanvas(puckCanvas, initialPuckSkin);

  const puckTop = new THREE.CanvasTexture(puckCanvas);
  puckTop.colorSpace = THREE.SRGBColorSpace;
  puckTop.anisotropy = aniso;

  // 6. Soft Radial Contact Shadow Texture
  const contactShadow = createContactShadowTexture();

  return {
    surfaceColor,
    surfaceRoughness,
    surfaceBump,
    brushedMetal,
    carbonWeave,
    puckTop,
    contactShadow,
    dispose: () => {
      surfaceColor.dispose();
      surfaceRoughness.dispose();
      surfaceBump.dispose();
      brushedMetal.dispose();
      carbonWeave.dispose();
      puckTop.dispose();
      contactShadow.dispose();
    },
  };
}
