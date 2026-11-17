import * as THREE from 'three';
import { resolveStrikerHex } from '@/config/catalog';
import { PADDLE_BASE_HEIGHT, PADDLE_RADIUS } from '@/game/constants/arena';
import type { StrikerColorId, StrikerStyleId } from '@/types/game';

export interface BuiltStrikerInstance {
  group: THREE.Group;
  update: (elapsed: number, dt: number) => void;
  dispose: () => void;
}

export function buildCustomStriker(
  styleId: StrikerStyleId,
  colorId: StrikerColorId,
  customColorHex: string,
  brushedTex: THREE.Texture,
  carbonTex: THREE.Texture,
  contactShadowTex: THREE.Texture,
  includeShadow = true
): BuiltStrikerInstance {
  const group = new THREE.Group();
  const disposables: Array<{ dispose: () => void }> = [];

  const { hex, brightHex } = resolveStrikerHex(colorId, customColorHex);
  const mainColor = new THREE.Color(hex);
  const brightColor = new THREE.Color(brightHex);

  // Per-style accent tuning while honoring chosen player color
  let rimColorHex = 0x0b101b;
  let rimMetalness = 0.85;
  let rimRoughness = 0.28;
  let deckMetalness = 0.16;
  let deckRoughness = 0.24;
  let deckClearcoat = 0.65;
  let emissiveBoost = 0.16;
  let ringColorHex = 0xe2e8f0;

  if (styleId === 'classic') {
    rimColorHex = 0xcbd5e1;
    rimMetalness = 0.92;
    rimRoughness = 0.18;
    deckMetalness = 0.22;
    deckRoughness = 0.22;
    emissiveBoost = 0.08;
  } else if (styleId === 'red_metallic') {
    rimColorHex = 0x1e293b;
    deckMetalness = 0.82;
    deckRoughness = 0.18;
    deckClearcoat = 0.9;
    ringColorHex = 0xf8fafc;
  } else if (styleId === 'golden_premium') {
    rimColorHex = 0x141008;
    ringColorHex = 0xfde047;
    deckMetalness = 0.92;
    deckRoughness = 0.16;
    deckClearcoat = 1.0;
    emissiveBoost = 0.18;
  } else if (styleId === 'ice_crystal') {
    rimColorHex = 0xe0f2fe;
    rimMetalness = 0.35;
    rimRoughness = 0.12;
    deckMetalness = 0.1;
    deckRoughness = 0.08;
    deckClearcoat = 1.0;
    ringColorHex = 0xffffff;
    emissiveBoost = 0.28;
  } else if (styleId === 'carbon_fiber') {
    rimColorHex = 0x334155;
    rimMetalness = 0.78;
    deckMetalness = 0.35;
    deckRoughness = 0.32;
    ringColorHex = 0x94a3b8;
    emissiveBoost = 0.05;
  } else if (styleId === 'holographic') {
    rimColorHex = 0x0f172a;
    deckMetalness = 0.65;
    deckRoughness = 0.12;
    deckClearcoat = 1.0;
    emissiveBoost = 0.25;
  } else if (styleId === 'legendary_animated') {
    rimColorHex = 0x090d16;
    ringColorHex = 0xfacc15;
    deckMetalness = 0.72;
    deckRoughness = 0.14;
    deckClearcoat = 1.0;
    emissiveBoost = 0.34;
  }

  // 1. Contact shadow beneath striker
  if (includeShadow) {
    const shadowGeo = new THREE.PlaneGeometry(PADDLE_RADIUS * 2.45, PADDLE_RADIUS * 2.45);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: contactShadowTex,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
    });
    const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = 0.0008;
    group.add(shadowPlane);
    disposables.push(shadowGeo, shadowMat);
  }

  // 2. Outer impact bumper collar (matches exact physics PADDLE_RADIUS)
  const rimSegs = styleId === 'ice_crystal' ? 12 : 48;
  const outerRimGeo = new THREE.CylinderGeometry(
    PADDLE_RADIUS * 0.985,
    PADDLE_RADIUS,
    0.012,
    rimSegs
  );
  const outerRimMat = new THREE.MeshStandardMaterial({
    color: rimColorHex,
    map: styleId === 'classic' || styleId === 'red_metallic' ? brushedTex : null,
    roughness: rimRoughness,
    metalness: rimMetalness,
  });
  const outerRim = new THREE.Mesh(outerRimGeo, outerRimMat);
  outerRim.position.y = 0.0065;
  outerRim.castShadow = true;
  outerRim.receiveShadow = true;
  group.add(outerRim);
  disposables.push(outerRimGeo, outerRimMat);

  // 3. Signature Neon/Energy edge ring
  const neonRingGeo = new THREE.TorusGeometry(PADDLE_RADIUS * 0.96, 0.0026, 12, 44);
  const neonRingMat = new THREE.MeshStandardMaterial({
    color: brightColor,
    emissive: mainColor,
    emissiveIntensity:
      styleId === 'neon_cyan' || styleId === 'purple_electric' || styleId === 'legendary_animated'
        ? 1.45
        : 0.85,
    roughness: 0.2,
    metalness: 0.2,
  });
  const neonRing = new THREE.Mesh(neonRingGeo, neonRingMat);
  neonRing.rotation.x = Math.PI / 2;
  neonRing.position.y = 0.0115;
  group.add(neonRing);
  disposables.push(neonRingGeo, neonRingMat);

  // 4. Main sculpted deck (LatheGeometry)
  const deckProfile = [
    new THREE.Vector2(0.0, 0.011),
    new THREE.Vector2(PADDLE_RADIUS * 0.95, 0.011),
    new THREE.Vector2(PADDLE_RADIUS * 0.9, PADDLE_BASE_HEIGHT - 0.002),
    new THREE.Vector2(PADDLE_RADIUS * 0.72, PADDLE_BASE_HEIGHT + 0.003),
    new THREE.Vector2(0.0, PADDLE_BASE_HEIGHT + 0.003),
  ];
  const deckSegs = styleId === 'ice_crystal' ? 12 : 44;
  const deckGeo = new THREE.LatheGeometry(deckProfile, deckSegs);

  const deckMatParams: THREE.MeshPhysicalMaterialParameters = {
    color: styleId === 'carbon_fiber' ? 0xffffff : mainColor,
    map: styleId === 'carbon_fiber' ? carbonTex : null,
    emissive: mainColor,
    emissiveIntensity: emissiveBoost,
    roughness: deckRoughness,
    metalness: deckMetalness,
    clearcoat: deckClearcoat,
    clearcoatRoughness: 0.14,
  };

  if (styleId === 'holographic') {
    deckMatParams.iridescence = 1.0;
    deckMatParams.iridescenceIOR = 1.8;
    deckMatParams.iridescenceThicknessRange = [180, 620];
  }

  const deckMat = new THREE.MeshPhysicalMaterial(deckMatParams);
  const deck = new THREE.Mesh(deckGeo, deckMat);
  deck.castShadow = true;
  deck.receiveShadow = true;
  group.add(deck);
  disposables.push(deckGeo, deckMat);

  // 5. Inner concentric ring
  const innerRingGeo = new THREE.TorusGeometry(PADDLE_RADIUS * 0.56, 0.0034, 12, 40);
  const innerRingMat = new THREE.MeshStandardMaterial({
    color: styleId === 'carbon_fiber' ? mainColor : ringColorHex,
    emissive: styleId === 'carbon_fiber' ? mainColor : 0x000000,
    emissiveIntensity: styleId === 'carbon_fiber' ? 0.5 : 0,
    roughness: 0.2,
    metalness: 0.88,
  });
  const innerRing = new THREE.Mesh(innerRingGeo, innerRingMat);
  innerRing.rotation.x = Math.PI / 2;
  innerRing.position.y = PADDLE_BASE_HEIGHT + 0.0025;
  group.add(innerRing);
  disposables.push(innerRingGeo, innerRingMat);

  // 6. Style-specific decorative fins / turbine rings
  const animatedParts: Array<{ obj: THREE.Object3D; speed: number }> = [];

  if (styleId === 'fiery_orange' || styleId === 'purple_electric' || styleId === 'legendary_animated') {
    const finCount = styleId === 'legendary_animated' ? 6 : 4;
    const finGeo = new THREE.BoxGeometry(0.007, 0.006, 0.016);
    const finMat = new THREE.MeshStandardMaterial({
      color: brightColor,
      emissive: mainColor,
      emissiveIntensity: 1.1,
      roughness: 0.22,
      metalness: 0.45,
    });
    const finHolder = new THREE.Group();
    finHolder.position.y = PADDLE_BASE_HEIGHT + 0.003;
    for (let i = 0; i < finCount; i++) {
      const angle = (i / finCount) * Math.PI * 2;
      const fin = new THREE.Mesh(finGeo, finMat);
      fin.position.set(
        Math.cos(angle) * PADDLE_RADIUS * 0.72,
        0,
        Math.sin(angle) * PADDLE_RADIUS * 0.72
      );
      fin.rotation.y = -angle;
      finHolder.add(fin);
    }
    group.add(finHolder);
    disposables.push(finGeo, finMat);
    if (styleId === 'legendary_animated') {
      animatedParts.push({ obj: finHolder, speed: 2.2 });
    }
  }

  if (styleId === 'legendary_animated') {
    const haloGeo = new THREE.TorusGeometry(PADDLE_RADIUS * 0.42, 0.0025, 10, 32);
    const haloMat = new THREE.MeshStandardMaterial({
      color: 0xfde047,
      emissive: 0xf59e0b,
      emissiveIntensity: 1.6,
      roughness: 0.18,
      metalness: 0.6,
    });
    const halo = new THREE.Mesh(haloGeo, haloMat);
    halo.rotation.x = Math.PI / 2;
    halo.position.y = PADDLE_BASE_HEIGHT + 0.014;
    group.add(halo);
    disposables.push(haloGeo, haloMat);
    animatedParts.push({ obj: halo, speed: -3.2 });
  }

  // 7. Ergonomic grip knob (scaled proportionally to larger finger-friendly deck)
  const knobScale = PADDLE_RADIUS / 0.068;
  const knobProfile = [
    new THREE.Vector2(0.0, PADDLE_BASE_HEIGHT + 0.002),
    new THREE.Vector2(0.023 * knobScale, PADDLE_BASE_HEIGHT + 0.002),
    new THREE.Vector2(0.017 * knobScale, PADDLE_BASE_HEIGHT + 0.022),
    new THREE.Vector2(0.027 * knobScale, PADDLE_BASE_HEIGHT + 0.042),
    new THREE.Vector2(0.025 * knobScale, PADDLE_BASE_HEIGHT + 0.052),
    new THREE.Vector2(0.0, PADDLE_BASE_HEIGHT + 0.056),
  ];
  const knobGeo = new THREE.LatheGeometry(knobProfile, 32);
  const knobMat = new THREE.MeshStandardMaterial({
    color: styleId === 'golden_premium' ? 0x1c1506 : 0x0f172a,
    roughness: 0.42,
    metalness: 0.48,
  });
  const knob = new THREE.Mesh(knobGeo, knobMat);
  knob.castShadow = true;
  group.add(knob);
  disposables.push(knobGeo, knobMat);

  // 8. Top emblem cap
  const capGeo =
    styleId === 'ice_crystal'
      ? new THREE.CylinderGeometry(0.02 * knobScale, 0.022 * knobScale, 0.006, 6)
      : new THREE.CylinderGeometry(0.02 * knobScale, 0.022 * knobScale, 0.005, 32);
  const capMat = new THREE.MeshStandardMaterial({
    color: brightColor,
    emissive: mainColor,
    emissiveIntensity: 0.72,
    roughness: 0.18,
    metalness: 0.35,
  });
  const cap = new THREE.Mesh(capGeo, capMat);
  cap.position.y = PADDLE_BASE_HEIGHT + 0.0555;
  group.add(cap);
  disposables.push(capGeo, capMat);

  const update = (elapsed: number, dt: number) => {
    for (const part of animatedParts) {
      part.obj.rotation.y += part.speed * dt;
    }
    if (styleId === 'legendary_animated') {
      capMat.emissiveIntensity = 0.65 + Math.sin(elapsed * 4.5) * 0.45;
      neonRingMat.emissiveIntensity = 1.2 + Math.cos(elapsed * 4.5) * 0.5;
    } else if (styleId === 'holographic') {
      const hueShift = (elapsed * 0.18) % 1;
      neonRingMat.emissive.setHSL(hueShift, 0.9, 0.55);
    }
  };

  const dispose = () => {
    disposables.forEach((d) => d.dispose());
  };

  return { group, update, dispose };
}
