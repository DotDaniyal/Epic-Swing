import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { ARENA_BACKGROUNDS, getTableThemeConfig } from '@/config/catalog';
import {
  COLORS,
  CORNER_RADIUS,
  GOAL_DEPTH,
  GOAL_HALF_WIDTH,
  GOAL_WIDTH,
  HALF_LENGTH,
  HALF_WIDTH,
  PUCK_HEIGHT,
  PUCK_RADIUS,
  RAIL_HEIGHT,
  RAIL_THICKNESS,
  SURFACE_Y,
  TABLE_LENGTH,
  TABLE_WIDTH,
} from '@/game/constants/arena';
import { buildCustomStriker, type BuiltStrikerInstance } from '@/game/objects/strikerFactory';
import {
  createProceduralTextures,
  drawPuckTopToCanvas,
  drawTableSurfaceToCanvas,
  type TableTextureSet,
} from '@/game/renderer/textures';
import type {
  ArenaBgId,
  PuckSkinId,
  StrikerColorId,
  StrikerStyleId,
  TableThemeId,
} from '@/types/game';

export interface BuiltSceneObjects {
  tableGroup: THREE.Group;
  puckGroup: THREE.Group;
  puckGlowMat: THREE.MeshStandardMaterial;
  paddle1Group: THREE.Group;
  paddle2Group: THREE.Group;
  goalLightP1: THREE.PointLight;
  goalLightP2: THREE.PointLight;
  goalStripP1Mat: THREE.MeshStandardMaterial;
  goalStripP2Mat: THREE.MeshStandardMaterial;
  textures: TableTextureSet;
  setStrikerAppearance: (
    player: 1 | 2,
    styleId: StrikerStyleId,
    colorId: StrikerColorId,
    customColorHex: string
  ) => void;
  setTableTheme: (themeId: TableThemeId) => void;
  setPuckSkin: (skinId: PuckSkinId) => void;
  setArenaBackground: (bgId: ArenaBgId) => void;
  updateCosmetics: (elapsed: number, dt: number) => void;
  dispose: () => void;
}

function createRoundedRectShape(
  halfW: number,
  halfL: number,
  radius: number
): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(-halfW + radius, -halfL);
  s.lineTo(halfW - radius, -halfL);
  s.absarc(halfW - radius, -halfL + radius, radius, -Math.PI / 2, 0, false);
  s.lineTo(halfW, halfL - radius);
  s.absarc(halfW - radius, halfL - radius, radius, 0, Math.PI / 2, false);
  s.lineTo(-halfW + radius, halfL);
  s.absarc(-halfW + radius, halfL - radius, radius, Math.PI / 2, Math.PI, false);
  s.lineTo(-halfW, -halfL + radius);
  s.absarc(
    -halfW + radius,
    -halfL + radius,
    radius,
    Math.PI,
    (Math.PI * 3) / 2,
    false
  );
  return s;
}

function createRoundedRectPath(
  halfW: number,
  halfL: number,
  radius: number
): THREE.Path {
  const p = new THREE.Path();
  p.moveTo(-halfW + radius, -halfL);
  p.lineTo(halfW - radius, -halfL);
  p.absarc(halfW - radius, -halfL + radius, radius, -Math.PI / 2, 0, false);
  p.lineTo(halfW, halfL - radius);
  p.absarc(halfW - radius, halfL - radius, radius, 0, Math.PI / 2, false);
  p.lineTo(-halfW + radius, halfL);
  p.absarc(-halfW + radius, halfL - radius, radius, Math.PI / 2, Math.PI, false);
  p.lineTo(-halfW, -halfL + radius);
  p.absarc(
    -halfW + radius,
    -halfL + radius,
    radius,
    Math.PI,
    (Math.PI * 3) / 2,
    false
  );
  return p;
}

export function buildArenaScene(
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
  isSoftwareGl: boolean
): BuiltSceneObjects {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
  scene.environment = envRT.texture;
  scene.environmentIntensity = 0.72;
  pmrem.dispose();

  scene.background = new THREE.Color(COLORS.midnightBg);
  scene.fog = new THREE.FogExp2(COLORS.midnightBg, 0.05);

  const textures = createProceduralTextures(
    renderer.capabilities.getMaxAnisotropy()
  );

  // === Balanced Arcade 3-Point Studio Lighting ===
  const hemi = new THREE.HemisphereLight(0x93c5fd, 0x05070c, 0.78);
  scene.add(hemi);

  const keyLight = new THREE.DirectionalLight(0xfff6eb, 1.85);
  keyLight.position.set(1.5, 4.8, 1.3);
  keyLight.castShadow = !isSoftwareGl;
  keyLight.shadow.mapSize.set(1024, 1024);
  keyLight.shadow.camera.near = 1.0;
  keyLight.shadow.camera.far = 9.0;
  keyLight.shadow.camera.left = -2.2;
  keyLight.shadow.camera.right = 2.2;
  keyLight.shadow.camera.top = 2.6;
  keyLight.shadow.camera.bottom = -2.6;
  keyLight.shadow.bias = -0.0005;
  keyLight.shadow.normalBias = 0.02;
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.95);
  rimLight.position.set(-2.2, 2.7, -2.5);
  scene.add(rimLight);

  let overheadSoftbox: THREE.RectAreaLight | null = null;
  if (!isSoftwareGl) {
    RectAreaLightUniformsLib.init();
    overheadSoftbox = new THREE.RectAreaLight(0xdbeafe, 1.15, 1.1, 2.2);
    overheadSoftbox.position.set(0, SURFACE_Y + 2.4, 0);
    overheadSoftbox.lookAt(0, SURFACE_Y, 0);
    scene.add(overheadSoftbox);
  }

  const goalLightP1 = new THREE.PointLight(COLORS.p1CyanBright, 0, 1.8, 2);
  goalLightP1.position.set(0, SURFACE_Y + 0.18, HALF_LENGTH + 0.04);
  scene.add(goalLightP1);

  const goalLightP2 = new THREE.PointLight(COLORS.p2OrangeBright, 0, 1.8, 2);
  goalLightP2.position.set(0, SURFACE_Y + 0.18, -(HALF_LENGTH + 0.04));
  scene.add(goalLightP2);

  // === Arena Floor & Spotlight Halo ===
  const floorGeo = new THREE.PlaneGeometry(24, 24);
  const floorMat = new THREE.MeshStandardMaterial({
    color: COLORS.arenaFloor,
    roughness: 0.85,
    metalness: 0.14,
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  floor.receiveShadow = true;
  scene.add(floor);

  const floorGlowGeo = new THREE.RingGeometry(0.92, 1.88, 64);
  const floorGlowMat = new THREE.MeshBasicMaterial({
    color: 0x0e2a55,
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
  });
  const floorGlow = new THREE.Mesh(floorGlowGeo, floorGlowMat);
  floorGlow.rotation.x = -Math.PI / 2;
  floorGlow.position.y = 0.005;
  floorGlow.scale.set(1.0, 1.65, 1.0);
  scene.add(floorGlow);

  // === Composite Multi-Part Arcade Air Hockey Table ===
  const tableGroup = new THREE.Group();
  scene.add(tableGroup);

  // 1. Playing Surface
  const playShape = createRoundedRectShape(HALF_WIDTH, HALF_LENGTH, CORNER_RADIUS);
  const playGeo = new THREE.ShapeGeometry(playShape, 24);
  const posAttr = playGeo.attributes.position;
  const uvArr = new Float32Array(posAttr.count * 2);
  for (let i = 0; i < posAttr.count; i++) {
    const px = posAttr.getX(i);
    const py = posAttr.getY(i);
    uvArr[i * 2] = (px + HALF_WIDTH) / TABLE_WIDTH;
    uvArr[i * 2 + 1] = 1 - (py + HALF_LENGTH) / TABLE_LENGTH;
  }
  playGeo.setAttribute('uv', new THREE.BufferAttribute(uvArr, 2));

  const playMat = new THREE.MeshPhysicalMaterial({
    map: textures.surfaceColor,
    roughnessMap: textures.surfaceRoughness,
    bumpMap: textures.surfaceBump,
    bumpScale: 0.0008,
    roughness: 0.28,
    metalness: 0.08,
    clearcoat: 0.72,
    clearcoatRoughness: 0.16,
    reflectivity: 0.65,
  });
  const playMesh = new THREE.Mesh(playGeo, playMat);
  playMesh.rotation.x = -Math.PI / 2;
  playMesh.position.y = SURFACE_Y;
  playMesh.receiveShadow = true;
  tableGroup.add(playMesh);

  // 2. Outer Brushed Gunmetal Rail Surround
  const outerHalfW = HALF_WIDTH + RAIL_THICKNESS;
  const outerHalfL = HALF_LENGTH + RAIL_THICKNESS + 0.05;
  const outerShape = createRoundedRectShape(
    outerHalfW,
    outerHalfL,
    CORNER_RADIUS + RAIL_THICKNESS
  );
  const innerHole = createRoundedRectPath(HALF_WIDTH, HALF_LENGTH, CORNER_RADIUS);
  outerShape.holes.push(innerHole);

  const railExtrudeGeo = new THREE.ExtrudeGeometry(outerShape, {
    depth: RAIL_HEIGHT + 0.095,
    bevelEnabled: true,
    bevelThickness: 0.011,
    bevelSize: 0.011,
    bevelSegments: 3,
    curveSegments: 24,
  });
  railExtrudeGeo.rotateX(Math.PI / 2);

  const railDarkMat = new THREE.MeshStandardMaterial({
    color: COLORS.tableRailDark,
    map: textures.brushedMetal,
    roughness: 0.3,
    metalness: 0.76,
  });
  const railFrame = new THREE.Mesh(railExtrudeGeo, railDarkMat);
  railFrame.position.y = SURFACE_Y + RAIL_HEIGHT;
  railFrame.castShadow = true;
  railFrame.receiveShadow = true;
  tableGroup.add(railFrame);

  // 3. Inner Rebound Cushions + Side LED Accent Strips
  const cushionMat = new THREE.MeshStandardMaterial({
    color: 0x3b4d6b,
    roughness: 0.36,
    metalness: 0.65,
  });
  const sideWallLen = TABLE_LENGTH - CORNER_RADIUS * 2;
  const sideCushionGeo = new THREE.BoxGeometry(0.014, 0.032, sideWallLen);
  const leftCushion = new THREE.Mesh(sideCushionGeo, cushionMat);
  leftCushion.position.set(-HALF_WIDTH - 0.005, SURFACE_Y + 0.016, 0);
  const rightCushion = new THREE.Mesh(sideCushionGeo, cushionMat);
  rightCushion.position.set(HALF_WIDTH + 0.005, SURFACE_Y + 0.016, 0);
  tableGroup.add(leftCushion, rightCushion);

  const halfNeonLen = HALF_LENGTH - CORNER_RADIUS - 0.04;
  const neonBarGeo = new THREE.BoxGeometry(0.005, 0.006, halfNeonLen);
  const p1NeonMat = new THREE.MeshStandardMaterial({
    color: COLORS.p1CyanBright,
    emissive: COLORS.p1Cyan,
    emissiveIntensity: 1.1,
  });
  const p2NeonMat = new THREE.MeshStandardMaterial({
    color: COLORS.p2OrangeBright,
    emissive: COLORS.p2Orange,
    emissiveIntensity: 1.1,
  });

  const p1LeftLed = new THREE.Mesh(neonBarGeo, p1NeonMat);
  p1LeftLed.position.set(-HALF_WIDTH - 0.002, SURFACE_Y + 0.036, halfNeonLen / 2 + 0.02);
  const p1RightLed = new THREE.Mesh(neonBarGeo, p1NeonMat);
  p1RightLed.position.set(HALF_WIDTH + 0.002, SURFACE_Y + 0.036, halfNeonLen / 2 + 0.02);

  const p2LeftLed = new THREE.Mesh(neonBarGeo, p2NeonMat);
  p2LeftLed.position.set(-HALF_WIDTH - 0.002, SURFACE_Y + 0.036, -(halfNeonLen / 2 + 0.02));
  const p2RightLed = new THREE.Mesh(neonBarGeo, p2NeonMat);
  p2RightLed.position.set(HALF_WIDTH + 0.002, SURFACE_Y + 0.036, -(halfNeonLen / 2 + 0.02));
  tableGroup.add(p1LeftLed, p1RightLed, p2LeftLed, p2RightLed);

  // 4. Brushed Metallic Silver Top Perimeter Border Trim
  const trimOuter = createRoundedRectShape(
    outerHalfW - 0.022,
    outerHalfL - 0.022,
    CORNER_RADIUS + RAIL_THICKNESS - 0.022
  );
  const trimInner = createRoundedRectPath(
    outerHalfW - 0.036,
    outerHalfL - 0.036,
    CORNER_RADIUS + RAIL_THICKNESS - 0.036
  );
  trimOuter.holes.push(trimInner);
  const trimGeo = new THREE.ExtrudeGeometry(trimOuter, {
    depth: 0.005,
    bevelEnabled: false,
    curveSegments: 24,
  });
  trimGeo.rotateX(Math.PI / 2);
  const trimMat = new THREE.MeshStandardMaterial({
    color: 0xdbe4f0,
    roughness: 0.22,
    metalness: 0.9,
  });
  const trimMesh = new THREE.Mesh(trimGeo, trimMat);
  trimMesh.position.y = SURFACE_Y + RAIL_HEIGHT + 0.012;
  tableGroup.add(trimMesh);

  // 5. Recessed Goal Pockets & Luminous Goal Line Sensors
  const goalBoxMat = new THREE.MeshStandardMaterial({
    color: 0x03050a,
    roughness: 0.9,
    metalness: 0.1,
  });
  const goalPocketGeo = new THREE.BoxGeometry(GOAL_WIDTH, RAIL_HEIGHT + 0.045, GOAL_DEPTH);
  const topGoalPocket = new THREE.Mesh(goalPocketGeo, goalBoxMat);
  topGoalPocket.position.set(0, SURFACE_Y + 0.012, -(HALF_LENGTH + GOAL_DEPTH / 2));
  const botGoalPocket = new THREE.Mesh(goalPocketGeo, goalBoxMat);
  botGoalPocket.position.set(0, SURFACE_Y + 0.012, HALF_LENGTH + GOAL_DEPTH / 2);
  tableGroup.add(topGoalPocket, botGoalPocket);

  const goalStripGeo = new THREE.BoxGeometry(GOAL_WIDTH - 0.01, 0.006, 0.016);
  const goalStripP2Mat = new THREE.MeshStandardMaterial({
    color: COLORS.p2OrangeBright,
    emissive: COLORS.p2Orange,
    emissiveIntensity: 1.85,
    roughness: 0.2,
  });
  const goalStripP2 = new THREE.Mesh(goalStripGeo, goalStripP2Mat);
  goalStripP2.position.set(0, SURFACE_Y + 0.003, -HALF_LENGTH + 0.005);

  const goalStripP1Mat = new THREE.MeshStandardMaterial({
    color: COLORS.p1CyanBright,
    emissive: COLORS.p1Cyan,
    emissiveIntensity: 1.85,
    roughness: 0.2,
  });
  const goalStripP1 = new THREE.Mesh(goalStripGeo, goalStripP1Mat);
  goalStripP1.position.set(0, SURFACE_Y + 0.003, HALF_LENGTH - 0.005);
  tableGroup.add(goalStripP2, goalStripP1);

  // Goal posts
  const postGeo = new THREE.CylinderGeometry(0.013, 0.013, RAIL_HEIGHT + 0.014, 18);
  const postPositions = [
    [-GOAL_HALF_WIDTH, -HALF_LENGTH],
    [GOAL_HALF_WIDTH, -HALF_LENGTH],
    [-GOAL_HALF_WIDTH, HALF_LENGTH],
    [GOAL_HALF_WIDTH, HALF_LENGTH],
  ];
  for (const [px, pz] of postPositions) {
    const post = new THREE.Mesh(postGeo, trimMat);
    post.position.set(px, SURFACE_Y + (RAIL_HEIGHT + 0.014) / 2, pz);
    post.castShadow = true;
    tableGroup.add(post);
  }

  // Goal bridge arches
  const archGeo = new THREE.BoxGeometry(GOAL_WIDTH + 0.06, 0.02, 0.052);
  const topArch = new THREE.Mesh(archGeo, railDarkMat);
  topArch.position.set(0, SURFACE_Y + RAIL_HEIGHT + 0.01, -(HALF_LENGTH + GOAL_DEPTH * 0.65));
  const botArch = new THREE.Mesh(archGeo, railDarkMat);
  botArch.position.set(0, SURFACE_Y + RAIL_HEIGHT + 0.01, HALF_LENGTH + GOAL_DEPTH * 0.65);
  tableGroup.add(topArch, botArch);

  const archGlowGeo = new THREE.BoxGeometry(GOAL_WIDTH - 0.02, 0.005, 0.012);
  const topArchGlow = new THREE.Mesh(archGlowGeo, goalStripP2Mat);
  topArchGlow.position.set(0, SURFACE_Y + RAIL_HEIGHT + 0.021, -(HALF_LENGTH + GOAL_DEPTH * 0.65));
  const botArchGlow = new THREE.Mesh(archGlowGeo, goalStripP1Mat);
  botArchGlow.position.set(0, SURFACE_Y + RAIL_HEIGHT + 0.021, HALF_LENGTH + GOAL_DEPTH * 0.65);
  tableGroup.add(topArchGlow, botArchGlow);

  // 6. Instanced Perimeter Hex Bolts
  const boltGeo = new THREE.CylinderGeometry(0.0085, 0.0085, 0.005, 6);
  const boltMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.2,
    metalness: 0.95,
  });
  const boltCoords: Array<[number, number]> = [];
  for (let i = -3; i <= 3; i++) {
    const z = i * 0.34;
    boltCoords.push([-(HALF_WIDTH + RAIL_THICKNESS * 0.52), z]);
    boltCoords.push([HALF_WIDTH + RAIL_THICKNESS * 0.52, z]);
  }
  for (let i = -2; i <= 2; i++) {
    if (i === 0) continue;
    const x = i * 0.24;
    boltCoords.push([x, -(HALF_LENGTH + RAIL_THICKNESS * 0.52)]);
    boltCoords.push([x, HALF_LENGTH + RAIL_THICKNESS * 0.52]);
  }
  const boltsMesh = new THREE.InstancedMesh(boltGeo, boltMat, boltCoords.length);
  const dummy = new THREE.Object3D();
  boltCoords.forEach(([bx, bz], idx) => {
    dummy.position.set(bx, SURFACE_Y + RAIL_HEIGHT + 0.013, bz);
    dummy.updateMatrix();
    boltsMesh.setMatrixAt(idx, dummy.matrix);
  });
  boltsMesh.instanceMatrix.needsUpdate = true;
  boltsMesh.computeBoundingSphere();
  tableGroup.add(boltsMesh);

  // 7. Cabinet Apron & Tapered Steel Legs
  const cabinetMat = new THREE.MeshStandardMaterial({
    color: 0x0b1222,
    roughness: 0.52,
    metalness: 0.52,
  });
  const apron = new THREE.Mesh(
    new THREE.BoxGeometry(TABLE_WIDTH + 0.08, 0.22, TABLE_LENGTH + 0.16),
    cabinetMat
  );
  apron.position.y = SURFACE_Y - 0.13;
  apron.castShadow = true;
  tableGroup.add(apron);

  const skirtBelt = new THREE.Mesh(
    new THREE.BoxGeometry(TABLE_WIDTH + 0.088, 0.014, TABLE_LENGTH + 0.168),
    trimMat
  );
  skirtBelt.position.y = SURFACE_Y - 0.22;
  tableGroup.add(skirtBelt);

  const legGeo = new THREE.CylinderGeometry(0.058, 0.038, SURFACE_Y - 0.14, 16);
  const legOffsets: Array<[number, number]> = [
    [-HALF_WIDTH + 0.08, -HALF_LENGTH + 0.14],
    [HALF_WIDTH - 0.08, -HALF_LENGTH + 0.14],
    [-HALF_WIDTH + 0.08, HALF_LENGTH - 0.14],
    [HALF_WIDTH - 0.08, HALF_LENGTH - 0.14],
  ];
  for (const [lx, lz] of legOffsets) {
    const leg = new THREE.Mesh(legGeo, railDarkMat);
    leg.position.set(lx, (SURFACE_Y - 0.14) / 2, lz);
    leg.castShadow = true;
    tableGroup.add(leg);
  }

  // === High-Contrast Tournament Puck ===
  const puckGroup = new THREE.Group();
  puckGroup.position.set(0, SURFACE_Y, 0);
  scene.add(puckGroup);

  const puckShadow = new THREE.Mesh(
    new THREE.PlaneGeometry(PUCK_RADIUS * 2.55, PUCK_RADIUS * 2.55),
    new THREE.MeshBasicMaterial({
      map: textures.contactShadow,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    })
  );
  puckShadow.rotation.x = -Math.PI / 2;
  puckShadow.position.y = 0.0006;
  puckGroup.add(puckShadow);

  const puckSideMat = new THREE.MeshStandardMaterial({
    color: COLORS.puckBody,
    roughness: 0.32,
    metalness: 0.45,
  });
  const puckBody = new THREE.Mesh(
    new THREE.CylinderGeometry(PUCK_RADIUS, PUCK_RADIUS, PUCK_HEIGHT, 40),
    puckSideMat
  );
  puckBody.position.y = PUCK_HEIGHT / 2 + 0.001;
  puckBody.castShadow = true;
  puckBody.receiveShadow = true;
  puckGroup.add(puckBody);

  const puckTopMat = new THREE.MeshStandardMaterial({
    map: textures.puckTop,
    color: 0xffffff,
    emissive: 0xe2e8f0,
    emissiveIntensity: 0.22,
    roughness: 0.22,
    metalness: 0.15,
  });
  const puckTopCap = new THREE.Mesh(
    new THREE.CircleGeometry(PUCK_RADIUS * 0.94, 36),
    puckTopMat
  );
  puckTopCap.rotation.x = -Math.PI / 2;
  puckTopCap.position.y = PUCK_HEIGHT + 0.0014;
  puckGroup.add(puckTopCap);

  const puckGlowMat = new THREE.MeshStandardMaterial({
    color: COLORS.puckCore,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.75,
    roughness: 0.2,
    metalness: 0.35,
  });
  const puckRing = new THREE.Mesh(
    new THREE.TorusGeometry(PUCK_RADIUS * 0.56, 0.0032, 12, 36),
    puckGlowMat
  );
  puckRing.rotation.x = Math.PI / 2;
  puckRing.position.y = PUCK_HEIGHT + 0.0018;
  puckGroup.add(puckRing);

  const puckCore = new THREE.Mesh(
    new THREE.CylinderGeometry(PUCK_RADIUS * 0.25, PUCK_RADIUS * 0.25, 0.0025, 24),
    trimMat
  );
  puckCore.position.y = PUCK_HEIGHT + 0.0018;
  puckGroup.add(puckCore);

  // === Customizable Striker Containers ===
  const paddle1Group = new THREE.Group();
  paddle1Group.position.set(0, SURFACE_Y, HALF_LENGTH - 0.34);
  scene.add(paddle1Group);

  const paddle2Group = new THREE.Group();
  paddle2Group.position.set(0, SURFACE_Y, -(HALF_LENGTH - 0.34));
  scene.add(paddle2Group);

  let striker1: BuiltStrikerInstance | null = null;
  let striker2: BuiltStrikerInstance | null = null;

  const setStrikerAppearance = (
    player: 1 | 2,
    styleId: StrikerStyleId,
    colorId: StrikerColorId,
    customColorHex: string
  ) => {
    const targetParent = player === 1 ? paddle1Group : paddle2Group;
    const prev = player === 1 ? striker1 : striker2;
    if (prev) {
      targetParent.remove(prev.group);
      prev.dispose();
    }
    const built = buildCustomStriker(
      styleId,
      colorId,
      customColorHex,
      textures.brushedMetal,
      textures.carbonWeave,
      textures.contactShadow,
      true
    );
    targetParent.add(built.group);
    if (player === 1) striker1 = built;
    else striker2 = built;
  };

  setStrikerAppearance(1, 'neon_cyan', 'cyan', '#00D8F6');
  setStrikerAppearance(2, 'fiery_orange', 'orange', '#FF6B1A');

  const setTableTheme = (themeId: TableThemeId) => {
    const theme = getTableThemeConfig(themeId);
    const canvas = textures.surfaceColor.image as HTMLCanvasElement;
    drawTableSurfaceToCanvas(canvas, themeId);
    textures.surfaceColor.needsUpdate = true;

    railDarkMat.color.set(theme.railHex);
    trimMat.color.set(theme.trimHex);
    p1NeonMat.color.set(theme.lineAccentP1);
    p1NeonMat.emissive.set(theme.lineAccentP1);
    p2NeonMat.color.set(theme.lineAccentP2);
    p2NeonMat.emissive.set(theme.lineAccentP2);

    goalStripP1Mat.color.set(theme.lineAccentP1);
    goalStripP1Mat.emissive.set(theme.lineAccentP1);
    goalStripP2Mat.color.set(theme.lineAccentP2);
    goalStripP2Mat.emissive.set(theme.lineAccentP2);

    goalLightP1.color.set(theme.lineAccentP1);
    goalLightP2.color.set(theme.lineAccentP2);

    rimLight.color.set(theme.rimLightHex);
    if (overheadSoftbox) {
      overheadSoftbox.color.set(theme.softboxHex);
    }

    floorMat.color.set(theme.floorHex);
    floorGlowMat.color.set(theme.floorRingHex);
    scene.background = new THREE.Color(theme.bgHex);
    scene.fog = new THREE.FogExp2(theme.bgHex, 0.05);
  };

  const setPuckSkin = (skinId: PuckSkinId) => {
    const canvas = textures.puckTop.image as HTMLCanvasElement;
    drawPuckTopToCanvas(canvas, skinId);
    textures.puckTop.needsUpdate = true;

    if (skinId === 'neon_core') {
      puckGlowMat.color.set(0x00e5ff);
      puckGlowMat.emissive.set(0x00d8f6);
    } else if (skinId === 'magma_disc') {
      puckGlowMat.color.set(0xff6b1a);
      puckGlowMat.emissive.set(0xea580c);
    } else if (skinId === 'glacier_core') {
      puckGlowMat.color.set(0x38bdf8);
      puckGlowMat.emissive.set(0x0284c7);
    } else if (skinId === 'bullion_gold') {
      puckGlowMat.color.set(0xfde047);
      puckGlowMat.emissive.set(0xf59e0b);
    } else {
      puckGlowMat.color.set(COLORS.puckCore);
      puckGlowMat.emissive.set(0xf59e0b);
    }
  };

  const setArenaBackground = (bgId: ArenaBgId) => {
    const found = ARENA_BACKGROUNDS.find((b) => b.id === bgId);
    if (!found) return;
    scene.background = new THREE.Color(found.previewHex);
    scene.fog = new THREE.FogExp2(found.previewHex, 0.05);
    if (found.accentHex) {
      floorGlowMat.color.set(found.accentHex);
    }
  };

  const updateCosmetics = (elapsed: number, dt: number) => {
    striker1?.update(elapsed, dt);
    striker2?.update(elapsed, dt);
  };

  const dispose = () => {
    striker1?.dispose();
    striker2?.dispose();
    envRT.dispose();
    textures.dispose();
    scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.geometry?.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => m.dispose());
        } else {
          mesh.material?.dispose();
        }
      }
    });
  };

  return {
    tableGroup,
    puckGroup,
    puckGlowMat,
    paddle1Group,
    paddle2Group,
    goalLightP1,
    goalLightP2,
    goalStripP1Mat,
    goalStripP2Mat,
    textures,
    setStrikerAppearance,
    setTableTheme,
    setPuckSkin,
    setArenaBackground,
    updateCosmetics,
    dispose,
  };
}
