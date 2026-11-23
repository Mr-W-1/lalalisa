// PC-Quality Yaowarat Night Market + Side Bangkok Canal Alley + Corridor-Following Camera
import * as THREE from 'three';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

export const VENUE_POS = new THREE.Vector3(0, 0, -24.5);
export const GATE_Z = -10.4;

// Walkable corridors: [minX, maxX, minZ, maxZ] (Yaowarat + East Bangkok Canal + West Bangkok City!)
export const CORRIDORS = [
  { name: 'YAOWARAT NIGHT MARKET', minX: -4.25, maxX: 4.25, minZ: -23.8, maxZ: 15.5, axisYaw: 0.0 },
  { name: 'BANGKOK CANAL ALLEY',   minX:  2.80, maxX: 21.5, minZ: -6.8,  maxZ: 5.8,  axisYaw: -Math.PI * 0.5 },
  { name: 'WEST BANGKOK DISTRICT', minX: -14.5, maxX: -2.8, minZ: -4.2,  maxZ: 3.4,  axisYaw:  Math.PI * 0.5 },
];

export function clampWalkPosition(x, z) {
  // Check if point is inside any corridor; if not, project to nearest corridor
  for (const c of CORRIDORS) {
    if (x >= c.minX && x <= c.maxX && z >= c.minZ && z <= c.maxZ) {
      return { x, z, area: c.name };
    }
  }
  let best = { x, z, dist: 1e9, area: CORRIDORS[0].name };
  for (const c of CORRIDORS) {
    const cx = Math.max(c.minX, Math.min(c.maxX, x));
    const cz = Math.max(c.minZ, Math.min(c.maxZ, z));
    const d = Math.hypot(x - cx, z - cz);
    if (d < best.dist) best = { x: cx, z: cz, dist: d, area: c.name };
  }
  return best;
}

export function isCameraClear(x, z) {
  const margin = 0.35;
  for (const c of CORRIDORS) {
    if (x >= c.minX + margin && x <= c.maxX - margin && z >= c.minZ + margin && z <= c.maxZ - margin) {
      return true;
    }
  }
  return false;
}

function makeNeonSignTexture(text, fg, bg, accent, vertical = false) {
  const canvas = document.createElement('canvas');
  canvas.width = vertical ? 256 : 512;
  canvas.height = vertical ? 512 : 160;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Outer glowing neon border
  ctx.strokeStyle = accent;
  ctx.lineWidth = 10;
  ctx.shadowColor = accent;
  ctx.shadowBlur = 18;
  ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

  ctx.fillStyle = fg;
  ctx.shadowColor = accent;
  ctx.shadowBlur = 14;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (vertical) {
    const chars = [...text];
    const step = (canvas.height - 64) / Math.max(1, chars.length);
    ctx.font = '800 58px -apple-system, "PingFang TC", "Hiragino Sans", sans-serif';
    chars.forEach((ch, idx) => {
      ctx.fillText(ch, canvas.width * 0.5, 44 + step * (idx + 0.5));
    });
  } else {
    ctx.font = '800 52px -apple-system, "SF Pro Display", sans-serif';
    ctx.fillText(text, canvas.width * 0.5, canvas.height * 0.5);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function makeWetAsphaltTexture() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 512;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#4a4a4a';
  ctx.fillRect(0, 0, 512, 512);
  // Dark smooth wet puddles (low roughness) mixed with rougher damp asphalt
  for (let i = 0; i < 42; i++) {
    const x = (i * 137) % 512;
    const y = (i * 223) % 512;
    const rx = 28 + (i % 5) * 18;
    const ry = 22 + (i % 4) * 16;
    const g = ctx.createRadialGradient(x, y, 4, x, y, rx);
    g.addColorStop(0, '#0a0a0a');
    g.addColorStop(0.65, '#1c1c1c');
    g.addColorStop(1, 'rgba(74,74,74,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, (i % 7) * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 14);
  return tex;
}

function addNeonSign(parent, pos, w, h, text, fg, bg, accent, rotY = 0, vertical = false) {
  const tex = makeNeonSignTexture(text, fg, bg, accent, vertical);
  const mat = new THREE.MeshStandardMaterial({
    map: tex, emissive: new THREE.Color('#ffffff'), emissiveMap: tex,
    emissiveIntensity: 1.35, roughness: 0.25, metalness: 0.1, side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  mesh.position.copy(pos);
  mesh.rotation.y = rotY;
  parent.add(mesh);
  return mesh;
}

function addLisaSpeaker(parent, pos, rotY, accentHex, woofers, speakerPositions) {
  const g = new THREE.Group();
  g.position.copy(pos);
  g.rotation.y = rotY;
  parent.add(g);
  speakerPositions.push(pos.clone());

  const cabMat = new THREE.MeshStandardMaterial({ color: 0x121118, roughness: 0.30, metalness: 0.62 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xe8c374, roughness: 0.22, metalness: 0.90 });
  const glowMat = new THREE.MeshStandardMaterial({
    color: accentHex, emissive: accentHex, emissiveIntensity: 3.0, roughness: 0.2,
  });
  const altHex = accentHex === 0xff3ea5 ? 0x36e8ff : 0xff3ea5;
  const altMat = new THREE.MeshStandardMaterial({
    color: altHex, emissive: altHex, emissiveIntensity: 2.6, roughness: 0.2,
  });

  const base = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.92, 0.58), cabMat);
  base.position.y = 0.46; g.add(base);
  const top = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.64, 0.50), cabMat);
  top.position.y = 1.24; g.add(top);

  for (const sx of [-0.365, 0.365]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.035, 1.56, 0.045), goldMat);
    rail.position.set(sx, 0.78, 0.28); g.add(rail);
  }
  const strip1 = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.032, 0.03), glowMat);
  strip1.position.set(0, 0.93, 0.29); g.add(strip1);

  for (const [wy, r, m] of [[0.46, 0.23, glowMat], [1.24, 0.17, altMat]]) {
    const wn = new THREE.Group();
    wn.position.set(0, wy, wy < 0.8 ? 0.30 : 0.26);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, r * 0.14, 12, 32), m);
    wn.add(ring);
    g.add(wn);
    woofers.push(wn);
  }

  const light = new THREE.PointLight(accentHex, 4.2, 9.5, 1.6);
  light.position.set(0, 1.2, 0.7);
  g.add(light);
}

export async function buildYaowaratStreet(loader, onProgress) {
  const root = new THREE.Group();
  root.name = 'Yaowarat';
  const woofers = [];
  const speakerPositions = [];
  const mixers = [];
  const bystanders = [];
  const solidMeshes = [];
  const walkableMeshes = [];
  const propColliders = []; // { x, z, r } circular ground obstacles (stalls, tuk-tuks, speakers, bystanders)
  const wallBoxes = [];     // { minX, maxX, minY, maxY, minZ, maxZ } fast analytical AABBs for Lisa & Camera!

  // 1. Glossy wet-asphalt street + sidewalks + dashed centerline
  const roughTex = makeWetAsphaltTexture();
  const roadMat = new THREE.MeshStandardMaterial({
    color: 0x161222, roughness: 0.48, roughnessMap: roughTex, metalness: 0.30,
  });
  const road = new THREE.Mesh(new THREE.PlaneGeometry(11.5, 48), roadMat);
  road.rotation.x = -Math.PI * 0.5;
  road.position.set(0, 0, -4.5);
  root.add(road);
  walkableMeshes.push(road);

  // Side canal alley floor branching East (+X) + West Bangkok City Plaza (-X)
  const alleyRoad = new THREE.Mesh(new THREE.PlaneGeometry(24, 15.0), roadMat);
  alleyRoad.rotation.x = -Math.PI * 0.5;
  alleyRoad.position.set(13.5, 0.002, -0.5);
  root.add(alleyRoad);
  walkableMeshes.push(alleyRoad);

  const westRoad = new THREE.Mesh(new THREE.PlaneGeometry(22, 14.0), roadMat);
  westRoad.rotation.x = -Math.PI * 0.5;
  westRoad.position.set(-13.5, 0.002, -0.5);
  root.add(westRoad);
  walkableMeshes.push(westRoad);

  // Dashed road centerline
  const dashMat = new THREE.MeshStandardMaterial({ color: 0xb8a8c4, roughness: 0.65 });
  for (let z = 14; z >= -22; z -= 2.6) {
    const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 1.25), dashMat);
    dash.rotation.x = -Math.PI * 0.5;
    dash.position.set(0, 0.006, z);
    root.add(dash);
  }

  // Raised curbs on both sides (leaving wide open gaps for BOTH East Canal Alley AND West Bangkok District!)
  const curbMat = new THREE.MeshStandardMaterial({ color: 0x241d30, roughness: 0.72, metalness: 0.12 });
  const leftCurbNorth = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.14, 21), curbMat);
  leftCurbNorth.position.set(-5.2, 0.07, -15.5); root.add(leftCurbNorth);
  const leftCurbSouth = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.14, 14), curbMat);
  leftCurbSouth.position.set(-5.2, 0.07, 10.8); root.add(leftCurbSouth);
  const rightCurbNorth = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.14, 21), curbMat);
  rightCurbNorth.position.set(5.2, 0.07, -15.5); root.add(rightCurbNorth);
  const rightCurbSouth = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.14, 14), curbMat);
  rightCurbSouth.position.set(5.2, 0.07, 10.8); root.add(rightCurbSouth);
  walkableMeshes.push(leftCurbNorth, leftCurbSouth, rightCurbNorth, rightCurbSouth);
  solidMeshes.push(leftCurbNorth, leftCurbSouth, rightCurbNorth, rightCurbSouth);

  // 2. Yaowarat Shopfront Buildings lining both sides (wide open entrances for BOTH East River/Canal AND West Bangkok!)
  const bldgColors = [0x22172c, 0x2c1a2a, 0x1b1d32, 0x2b1d28];
  const winGlowPink = new THREE.MeshStandardMaterial({ color: 0xffd0ea, emissive: 0xff5aa8, emissiveIntensity: 1.5 });
  const winGlowWarm = new THREE.MeshStandardMaterial({ color: 0xffe8c2, emissive: 0xffa64d, emissiveIntensity: 1.3 });
  const winGlowCyan = new THREE.MeshStandardMaterial({ color: 0xc8f6ff, emissive: 0x3ae2ff, emissiveIntensity: 1.4 });
  const winMats = [winGlowWarm, winGlowPink, winGlowCyan];

  for (const side of [-1, 1]) {
    for (let i = 0; i < 9; i++) {
      const z = 14.5 - i * 4.6;
      if (z > -5.4 && z < 4.2) continue; // Keep BOTH East River/Canal AND West Bangkok entrances 100% open!
      const h = 9.5 + ((i * 3 + (side > 0 ? 1 : 0)) % 4) * 2.4;
      const bmat = new THREE.MeshStandardMaterial({
        color: bldgColors[(i + (side > 0 ? 2 : 0)) % bldgColors.length],
        roughness: 0.78, metalness: 0.15,
      });
      const bldg = new THREE.Mesh(new THREE.BoxGeometry(4.4, h, 4.4), bmat);
      bldg.position.set(side * 7.8, h * 0.5, z);
      root.add(bldg);
      solidMeshes.push(bldg);
      wallBoxes.push({
        minX: side * 7.8 - 2.25, maxX: side * 7.8 + 2.25,
        minY: 0, maxY: h,
        minZ: z - 2.25, maxZ: z + 2.25,
      });
      // Illuminated upper windows
      for (let fl = 1; fl <= 2; fl++) {
        const w = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.3), winMats[(i + fl) % 3]);
        w.position.set(side * 5.58, 2.4 + fl * 2.7, z);
        w.rotation.y = side > 0 ? -Math.PI * 0.5 : Math.PI * 0.5;
        root.add(w);
      }
    }
  }

  // 3. Glowing Yaowarat Thai / Chinese Vertical & Shopfront Fascia Neon Signs
  const signs = [
    [new THREE.Vector3(-5.15, 5.4, 9.2),  1.15, 3.3, '泰式茶', '#fff4d6', '#33121b', '#ff5498', Math.PI * 0.5, true],
    [new THREE.Vector3(-5.05, 4.9, 2.8),  1.10, 3.1, '海鮮燒', '#e8fcff', '#112233', '#36e8ff', Math.PI * 0.5, true],
    [new THREE.Vector3( 5.15, 5.8, 8.6),  1.20, 3.6, '耀華力', '#fff1c4', '#2e1018', '#ff9838', -Math.PI * 0.5, true],
    [new THREE.Vector3( 5.10, 5.2, -7.2), 1.15, 3.2, '大金行', '#ffe4f2', '#261028', '#ff4ca2', -Math.PI * 0.5, true],
    [new THREE.Vector3(-5.05, 4.8, -14.8),1.15, 3.1, '老字號', '#fff4d6', '#281416', '#ffbe42', Math.PI * 0.5, true],
    [new THREE.Vector3(-5.25, 3.35, 6.4), 3.4,  0.68, 'ตลาดเก่า · YAOWARAT', '#fff0d0', '#3a1410', '#ff8c3a', Math.PI * 0.5, false],
    [new THREE.Vector3(-5.25, 3.35, -4.6),3.2,  0.68, 'อาหารทะเล · SEAFOOD', '#e6fcff', '#102430', '#3ce8ff', Math.PI * 0.5, false],
    [new THREE.Vector3( 5.25, 3.35, 11.2),3.2,  0.68, 'ก๋วยเตี๋ยว · NOODLES', '#ffe4f2', '#2c1024', '#ff54a8', -Math.PI * 0.5, false],
    [new THREE.Vector3( 0.0,  5.0, GATE_Z + 0.35), 4.6, 0.95, 'ถนนเยาวราช', '#ffe6b8', '#420f18', '#ff7840', 0, false],
    [new THREE.Vector3( 0.0,  3.75, VENUE_POS.z + 0.32), 6.2, 0.85, 'S O U N D S T A G E', '#ffb2dc', '#240f22', '#ff4996', 0, false],
    [new THREE.Vector3( 5.6,  3.9, -0.5), 3.6, 0.85, 'BANGKOK CANAL →', '#d8fcff', '#102436', '#36e8ff', -Math.PI * 0.5, false],
    [new THREE.Vector3(-5.6,  3.9, -0.5), 3.6, 0.85, '← WEST BANGKOK', '#ffe8d6', '#2e1222', '#ff64aa',  Math.PI * 0.5, false],
  ];
  for (const s of signs) addNeonSign(root, ...s);

  // Soundstage back wall
  const stageBack = new THREE.Mesh(
    new THREE.BoxGeometry(11.6, 8.2, 0.6),
    new THREE.MeshStandardMaterial({ color: 0x261622, roughness: 0.82 })
  );
  stageBack.position.set(0, 4.1, VENUE_POS.z - 0.3);
  root.add(stageBack);
  solidMeshes.push(stageBack);
  wallBoxes.push({ minX: -6.0, maxX: 6.0, minY: 0, maxY: 8.4, minZ: VENUE_POS.z - 0.8, maxZ: VENUE_POS.z + 0.15 });

  // Vibrant Neo-Bangkok Storefronts & Posters lining the Left Wall (7-Eleven, Vending, Thai Travel, Neon Art!)
  const texLoader = new THREE.TextureLoader();
  const addBillboard = (url, x, y, z, w, h, ry, emissiveStr = 0.65) => {
    const tex = texLoader.load(url);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.MeshStandardMaterial({
      map: tex, emissive: new THREE.Color('#ffffff'), emissiveMap: tex,
      emissiveIntensity: emissiveStr, roughness: 0.38, metalness: 0.08,
    });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    m.position.set(x, y, z);
    m.rotation.y = ry;
    root.add(m);
  };
  addBillboard('./assets/yaowarat/neo_bangkok_7-11.jpg',       -5.52, 2.25,  10.8, 3.6, 2.4, Math.PI * 0.5, 0.72);
  addBillboard('./assets/yaowarat/neo_bangkok_vendrink.jpg',   -5.52, 1.55,   6.2, 1.9, 2.4, Math.PI * 0.5, 0.68);
  addBillboard('./assets/yaowarat/neo_bangkok_thaiposter.jpg', -5.52, 2.15, -13.6, 2.4, 2.8, Math.PI * 0.5, 0.62);
  addBillboard('./assets/yaowarat/neo_bangkok_MotionPink.png', -5.52, 2.45,  -8.4, 3.4, 2.6, Math.PI * 0.5, 0.78);
  addBillboard('./assets/yaowarat/neo_bangkok_thaitravel.jpg', -5.52, 2.15, -18.2, 3.2, 2.4, Math.PI * 0.5, 0.62);
  addBillboard('./assets/yaowarat/neo_bangkok_vendrink.jpg',    5.52, 1.55, -10.8, 1.9, 2.4, -Math.PI * 0.5, 0.65);

  // 4. Key Neon Street Point Lights (cleanly spaced so WebGL stays super fast!)
  const streetLights = [
    [new THREE.Vector3(0, 4.8, 10.5), 0xff52a8, 12, 16],
    [new THREE.Vector3(-2.6, 3.6, 4.5), 0x3ce6ff, 10, 14],
    [new THREE.Vector3(2.8, 3.8, -2.5), 0xff629c, 11, 15],
    [new THREE.Vector3(0, 4.8, GATE_Z), 0xff8446, 13, 16],
    [new THREE.Vector3(0, 4.2, -18.5), 0xc878ff, 11, 15],
    [new THREE.Vector3(0, 3.8, VENUE_POS.z + 2.2), 0xff4996, 16, 14],
    [new THREE.Vector3(9.5, 4.2, -0.5), 0xffaa52, 14, 18],
    [new THREE.Vector3(-9.5, 4.6, -0.5), 0xff88b8, 16, 20],
  ];
  for (const [p, col, inten, dist] of streetLights) {
    const l = new THREE.PointLight(col, inten, dist, 1.5);
    l.position.copy(p);
    root.add(l);
  }

  // 5. Glowing Lisa-Vibe PA Speakers pumping atmospheric Rockstar!
  addLisaSpeaker(root, new THREE.Vector3(-3.85, 0, 6.2), 0.72, 0xff3ea5, woofers, speakerPositions);
  addLisaSpeaker(root, new THREE.Vector3( 3.85, 0, -6.2), -0.78, 0x36e8ff, woofers, speakerPositions);
  addLisaSpeaker(root, new THREE.Vector3(-3.85, 0, -16.8), 0.65, 0xff3ea5, woofers, speakerPositions);
  for (const sp of speakerPositions) propColliders.push({ x: sp.x, z: sp.z, r: 0.62 });

  // 6. Load real PC 3D models in parallel (district-assets + facades + street props + East Canal + West Bangkok City + bystanders!)
  const safeLoad = (url) => loader.loadAsync(url).catch(() => null);
  onProgress?.('Loading Yaowarat 3D props…', 0.35);
  const [gateG, lanternG, stallG, tukG, shutterG, canalG, westCityG, girlG, rowoonG, grillG, parasolG, produceG, carG, lampG, stoolG, manholeG, crateG, trashG, aptG, facG] = await Promise.all([
    safeLoad('./assets/yaowarat/gate.glb'),
    safeLoad('./assets/yaowarat/lantern.glb'),
    safeLoad('./assets/yaowarat/stall.glb'),
    safeLoad('./assets/city/street_food_tuk.glb'),
    safeLoad('./assets/city/rollershutter_door/rollershutter_door.gltf'),
    safeLoad('./assets/city/bangkok_street.glb'),
    safeLoad('./assets/city/west_bangkok/west_bangkok.glb'),
    safeLoad('./assets/cast/korean_girl.glb'),
    safeLoad('./assets/cast/rowoon.glb'),
    safeLoad('./assets/yaowarat/grill.glb'),
    safeLoad('./assets/yaowarat/parasol.glb'),
    safeLoad('./assets/yaowarat/produce.glb'),
    safeLoad('./assets/city/covered_car/covered_car.gltf'),
    safeLoad('./assets/city/street_lamp_01/street_lamp_01.gltf'),
    safeLoad('./assets/city/chinese_stool/chinese_stool.gltf'),
    safeLoad('./assets/city/water_manhole_cover/water_manhole_cover.gltf'),
    safeLoad('./assets/city/plastic_crate_01/plastic_crate_01.gltf'),
    safeLoad('./assets/city/metal_trash_can/metal_trash_can.gltf'),
    safeLoad('./assets/city/modular_urban_apartments_facade/modular_urban_apartments_facade.gltf'),
    safeLoad('./assets/city/modular_factory_facade/modular_factory_facade.gltf'),
  ]);

  if (gateG) {
    const gate = gateG.scene;
    gate.position.set(0, 0.95, GATE_Z);
    gate.scale.set(0.96, 0.72, 0.42);
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xe0a84b, roughness: 0.32, metalness: 0.75 });
    const redMat = new THREE.MeshStandardMaterial({ color: 0x9e1b2c, roughness: 0.45, metalness: 0.25 });
    gate.traverse((o) => {
      if (!o.isMesh) return;
      if (/gate-tower_[023]|bell|drum/i.test(o.name)) { o.visible = false; return; }
      if (/gate-tower_[56]/i.test(o.name)) o.material = goldMat;
      else if (/gate-tower_4/i.test(o.name)) o.material = redMat;
    });
    root.add(gate);
  }

  if (shutterG) {
    const sh = shutterG.scene;
    sh.position.set(0, 0, VENUE_POS.z + 0.08);
    sh.scale.set(2.55, 1.38, 1.0);
    root.add(sh);
  }

  if (lanternG) {
    const warmMat = new THREE.MeshStandardMaterial({
      color: 0xd9303e, emissive: 0xff6238, emissiveIntensity: 1.9, roughness: 0.65,
    });
    for (const z of [7.2, -1.2, -15.5]) {
      for (let i = -3; i <= 3; i++) {
        const l = lanternG.scene.clone(true);
        const x = i * 1.42;
        l.position.set(x, 5.2 + 0.022 * x * x, z);
        l.scale.setScalar(0.70);
        l.traverse((o) => { if (o.isMesh && /paper/i.test(o.name)) o.material = warmMat; });
        root.add(l);
      }
    }
  }

  if (stallG) {
    for (const [pos, ry] of [
      [new THREE.Vector3(-4.45, 0,  6.2), Math.PI * 0.5],
      [new THREE.Vector3(-4.45, 0, -6.4), Math.PI * 0.5],
      [new THREE.Vector3(-4.45, 0,-15.2), Math.PI * 0.5],
      [new THREE.Vector3( 4.45, 0,  9.2), -Math.PI * 0.5],
      [new THREE.Vector3( 4.45, 0,-13.5), -Math.PI * 0.5],
    ]) {
      const st = stallG.scene.clone(true);
      st.position.copy(pos); st.rotation.y = ry; st.scale.setScalar(0.92);
      root.add(st);
      propColliders.push({ x: pos.x, z: pos.z, r: 1.02 });
    }
  }

  if (tukG) {
    for (const [pos, ry] of [
      [new THREE.Vector3(4.2, 0, 6.2), -0.65],
      [new THREE.Vector3(-4.1, 0, -12.6), 0.52],
    ]) {
      const tk = tukG.scene.clone(true);
      tk.position.copy(pos); tk.rotation.y = ry;
      root.add(tk);
      propColliders.push({ x: pos.x, z: pos.z, r: 1.15 });
    }
  }

  // Cool Left-Side Bangkok Street Food Grills, Parasols, Produce Crates, Covered Car & Street Lamps!
  if (grillG) {
    for (const [pos, ry] of [
      [new THREE.Vector3(-4.25, 0, 8.8), Math.PI * 0.5],
      [new THREE.Vector3(-4.25, 0, -8.8), Math.PI * 0.5],
    ]) {
      const gr = grillG.scene.clone(true);
      gr.position.copy(pos); gr.rotation.y = ry; gr.scale.setScalar(0.95);
      root.add(gr);
      propColliders.push({ x: pos.x, z: pos.z, r: 0.72 });
    }
  }
  if (parasolG) {
    for (const [pos, ry] of [
      [new THREE.Vector3(-4.35, 0, 4.4), 0.3],
      [new THREE.Vector3(-4.35, 0, -9.8), -0.4],
      [new THREE.Vector3( 4.35, 0, -16.8), 0.5],
    ]) {
      const pa = parasolG.scene.clone(true);
      pa.position.copy(pos); pa.rotation.y = ry; pa.scale.setScalar(0.95);
      root.add(pa);
    }
  }
  if (produceG) {
    for (const [pos, ry] of [
      [new THREE.Vector3(-4.2, 0, 4.8), Math.PI * 0.5],
      [new THREE.Vector3(-4.2, 0, -10.8), Math.PI * 0.5],
    ]) {
      const pr = produceG.scene.clone(true);
      pr.position.copy(pos); pr.rotation.y = ry; pr.scale.setScalar(0.92);
      root.add(pr);
      propColliders.push({ x: pos.x, z: pos.z, r: 0.78 });
    }
  }
  if (carG) {
    const car = carG.scene;
    car.position.set(-4.35, 0, 12.6);
    car.rotation.y = 0.08;
    car.scale.setScalar(0.95);
    root.add(car);
    propColliders.push({ x: -4.35, z: 12.6, r: 1.45 });
  }
  if (lampG) {
    for (const [x, z, ry] of [[-4.75, 7.6, Math.PI * 0.5], [-4.75, -5.2, Math.PI * 0.5], [4.75, -8.6, -Math.PI * 0.5], [-4.75, -18.5, Math.PI * 0.5]]) {
      const lp = lampG.scene.clone(true);
      lp.position.set(x, 0, z); lp.rotation.y = ry; lp.scale.setScalar(0.95);
      root.add(lp);
    }
  }
  // Authentic Yaowarat Ground Details: Stools, Manhole Covers, Crates, Trash Cans & Textured Urban Facades!
  if (stoolG) {
    for (const [x, z] of [[-3.4, 5.4], [-3.4, 0.4], [-3.4, -5.6], [3.5, 8.2], [3.5, -12.6]]) {
      const s = stoolG.scene.clone(true);
      s.position.set(x, 0, z); s.scale.setScalar(0.95);
      root.add(s);
    }
  }
  if (manholeG) {
    for (const [x, z] of [[-1.4, 4.2], [1.6, -3.5], [-0.9, -14.0]]) {
      const mh = manholeG.scene.clone(true);
      mh.position.set(x, 0.015, z); mh.scale.setScalar(0.95);
      root.add(mh);
    }
  }
  if (crateG) {
    for (const [x, z, ry] of [[-4.0, 4.8, 0.2], [-4.0, -7.2, -0.3], [4.0, 10.6, 0.4]]) {
      const cr = crateG.scene.clone(true);
      cr.position.set(x, 0, z); cr.rotation.y = ry; cr.scale.setScalar(0.9);
      root.add(cr);
    }
  }
  if (trashG) {
    for (const [x, z] of [[-4.2, -0.8], [4.2, -9.8]]) {
      const tr = trashG.scene.clone(true);
      tr.position.set(x, 0, z); tr.scale.setScalar(0.95);
      root.add(tr);
    }
  }
  if (aptG) {
    // Real textured Bangkok urban apartment facades — trimmed to ~10m width cleanly outside BOTH side-street openings
    // so the East River/Canal Building AND West Bangkok City District are 100% open & unobstructed!
    for (const [x, z, ry] of [
      [-5.55,  10.8,  Math.PI * 0.5],
      [-5.55, -14.8,  Math.PI * 0.5],
      [ 5.55,  10.8, -Math.PI * 0.5],
      [ 5.55, -14.8, -Math.PI * 0.5],
    ]) {
      const f = aptG.scene.clone(true);
      f.position.set(x, 0, z); f.rotation.y = ry; f.scale.set(0.36, 0.85, 0.72);
      root.add(f);
    }
  }
  if (westCityG) {
    // Full authentic 3D West Bangkok City District (Cityscene Bangkok) opening off the Left Side of Yaowarat!
    const wc = westCityG.scene;
    wc.position.set(-16.5, 0.25, -0.8);
    wc.rotation.y = Math.PI * 0.5;
    wc.scale.setScalar(0.0078);
    root.add(wc);
  }
  // West Bangkok alley side walls for camera collision
  wallBoxes.push({ minX: -16.0, maxX: -4.6, minY: 0, maxY: 9.0, minZ: -5.6, maxZ: -4.4 });
  wallBoxes.push({ minX: -16.0, maxX: -4.6, minY: 0, maxY: 9.0, minZ:  3.6, maxZ:  4.8 });
  wallBoxes.push({ minX: -16.2, maxX: -14.8, minY: 0, maxY: 9.0, minZ: -5.0, maxZ: 4.2 });
  if (facG) {
    const f = facG.scene;
    f.position.set(0, 0, VENUE_POS.z + 0.02);
    f.scale.set(1.08, 0.95, 0.85);
    root.add(f);
  }

  // Real 3D Bangkok Canal Street in the East Side Alley
  // Precompute a fast O(1) 44x30 stair/floor heightmap ONCE at boot so gameplay has ZERO per-frame mesh raycasting!
  const canalWalkMeshes = [];
  if (canalG) {
    const canal = canalG.scene;
    canal.position.set(14.5, 0.25, -0.5);
    canal.rotation.y = -Math.PI * 0.5;
    canal.scale.setScalar(0.0085);
    canal.traverse((o) => {
      if (!o.isMesh) return;
      if (/holdout/i.test(o.name)) { o.visible = false; return; }
      if (!/water|vegetation|fabric|trash/i.test(o.name)) {
        canalWalkMeshes.push(o);
      }
    });
    root.add(canal);
    canal.updateMatrixWorld(true);
  }
  // Outer alley walls for camera collision
  wallBoxes.push({ minX: 4.5, maxX: 23.0, minY: 0, maxY: 9.0, minZ: -8.2, maxZ: -6.9 });
  wallBoxes.push({ minX: 4.5, maxX: 23.0, minY: 0, maxY: 9.0, minZ:  5.9, maxZ:  7.2 });
  wallBoxes.push({ minX: 21.6, maxX: 23.2, minY: 0, maxY: 9.0, minZ: -7.5, maxZ: 6.5 });

  // Animated Bystanders lining both sides of Yaowarat Night Market!
  const castSpecs = [
    [girlG,   new THREE.Vector3(-3.3, 0,  9.8),  1.15, 'Groove'],
    [girlG,   new THREE.Vector3(-3.2, 0,  5.2),  1.45, 'Idle'],
    [rowoonG, new THREE.Vector3( 3.2, 0,  8.6), -1.25, 'Groove'],
    [girlG,   new THREE.Vector3(-3.2, 0, -3.5),  1.35, 'Groove'],
    [rowoonG, new THREE.Vector3(-3.1, 0,-11.5),  1.20, 'Idle'],
    [rowoonG, new THREE.Vector3( 3.3, 0,-17.5), -1.10, 'Groove'],
    [girlG,   new THREE.Vector3( 8.2, 0,  1.4),  2.80, 'Groove'],
  ];
  for (let i = 0; i < castSpecs.length; i++) {
    const [gltf, pos, ry, pref] = castSpecs[i];
    if (!gltf) continue;
    const actor = SkeletonUtils.clone(gltf.scene);
    actor.position.copy(pos);
    actor.rotation.y = ry;
    root.add(actor);
    const mixer = new THREE.AnimationMixer(actor);
    const clip = gltf.animations.find((a) => a.name.includes(pref)) || gltf.animations[0];
    if (clip) {
      const act = mixer.clipAction(clip);
      act.play();
      mixer.setTime(i * 0.7);
    }
    mixers.push(mixer);
    bystanders.push({ node: actor, baseYaw: ry, phase: i * 1.3 });
    propColliders.push({ x: pos.x, z: pos.z, r: 0.48 });
  }

  // Bake O(1) 44x30 stair/floor heightmap of Bangkok Canal Street ONCE at boot!
  const HM_NX = 44, HM_NZ = 30;
  const HM_MIN_X = 4.5, HM_MAX_X = 22.0;
  const HM_MIN_Z = -7.0, HM_MAX_Z = 6.0;
  const heightMap = new Float32Array(HM_NX * HM_NZ);
  if (canalWalkMeshes.length > 0) {
    const bakeRay = new THREE.Raycaster();
    const downDir = new THREE.Vector3(0, -1, 0);
    const orig = new THREE.Vector3();
    for (let iz = 0; iz < HM_NZ; iz++) {
      const gz = HM_MIN_Z + (iz / (HM_NZ - 1)) * (HM_MAX_Z - HM_MIN_Z);
      for (let ix = 0; ix < HM_NX; ix++) {
        const gx = HM_MIN_X + (ix / (HM_NX - 1)) * (HM_MAX_X - HM_MIN_X);
        orig.set(gx, 4.5, gz);
        bakeRay.set(orig, downDir);
        bakeRay.near = 0.01;
        bakeRay.far = 5.0;
        const hits = bakeRay.intersectObjects(canalWalkMeshes, false);
        let bestY = 0;
        for (const h of hits) {
          const ny = h.face ? h.face.normal.clone().transformDirection(h.object.matrixWorld).y : 1;
          if (ny > 0.45 && h.point.y >= 0 && h.point.y <= 3.2 && h.point.y > bestY) {
            bestY = h.point.y;
          }
        }
        heightMap[iz * HM_NX + ix] = bestY;
      }
    }
  }

  // O(1) bilinear stair/floor height lookup (0.001ms per frame!)
  function sampleFloorY(x, z, curY) {
    if (x < HM_MIN_X || x > HM_MAX_X || z < HM_MIN_Z || z > HM_MAX_Z) {
      // Raised curbs on Yaowarat sides
      if (Math.abs(x) > 3.9 && !(x > 3.9 && z > -4.6 && z < 3.6)) return 0.14;
      return 0;
    }
    const fx = ((x - HM_MIN_X) / (HM_MAX_X - HM_MIN_X)) * (HM_NX - 1);
    const fz = ((z - HM_MIN_Z) / (HM_MAX_Z - HM_MIN_Z)) * (HM_NZ - 1);
    const ix = Math.max(0, Math.min(HM_NX - 2, Math.floor(fx)));
    const iz = Math.max(0, Math.min(HM_NZ - 2, Math.floor(fz)));
    const tx = fx - ix, tz = fz - iz;
    const h00 = heightMap[iz * HM_NX + ix];
    const h10 = heightMap[iz * HM_NX + ix + 1];
    const h01 = heightMap[(iz + 1) * HM_NX + ix];
    const h11 = heightMap[(iz + 1) * HM_NX + ix + 1];
    const h = (h00 * (1 - tx) + h10 * tx) * (1 - tz) + (h01 * (1 - tx) + h11 * tx) * tz;
    // Allow smooth stair step-up (<= 0.62m); block sheer walls!
    if (h - curY > 0.62) return null;
    return Math.max(0, h);
  }

  function pushOutProps(x, z, radius = 0.34) {
    for (const p of propColliders) {
      const dx = x - p.x, dz = z - p.z;
      const d = Math.hypot(dx, dz);
      const minD = p.r + radius;
      if (d < minD) {
        if (d < 1e-4) { x += minD; }
        else { x = p.x + (dx / d) * minD; z = p.z + (dz / d) * minD; }
      }
    }
    return { x, z };
  }

  function hitsWallBox(x, z, r = 0.36) {
    for (const b of wallBoxes) {
      if (x + r > b.minX && x - r < b.maxX && z + r > b.minZ && z - r < b.maxZ) return true;
    }
    return false;
  }

  // Fast analytical ray-vs-AABB slab intersection (0.002ms per frame — ZERO mesh raycasting!)
  function rayHitBox(ox, oy, oz, dx, dy, dz, maxT, b) {
    let tmin = 0, tmax = maxT;
    const invX = Math.abs(dx) > 1e-6 ? 1 / dx : 1e9;
    let t1 = (b.minX - ox) * invX, t2 = (b.maxX - ox) * invX;
    if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
    tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
    if (tmin > tmax) return maxT;

    const invY = Math.abs(dy) > 1e-6 ? 1 / dy : 1e9;
    t1 = (b.minY - oy) * invY; t2 = (b.maxY - oy) * invY;
    if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
    tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
    if (tmin > tmax) return maxT;

    const invZ = Math.abs(dz) > 1e-6 ? 1 / dz : 1e9;
    t1 = (b.minZ - oz) * invZ; t2 = (b.maxZ - oz) * invZ;
    if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
    tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
    return tmin <= tmax && tmin > 0.05 ? tmin : maxT;
  }

  function resolveMove(curPos, desiredX, desiredZ) {
    let c = clampWalkPosition(desiredX, desiredZ);
    let p = pushOutProps(c.x, c.z, 0.34);
    let nx = p.x, nz = p.z;

    // Wall box + steep-ledge blocking with smooth X/Z sliding
    const canStand = (tx, tz) => !hitsWallBox(tx, tz, 0.36) && sampleFloorY(tx, tz, curPos.y) !== null;
    if (!canStand(nx, nz)) {
      if (canStand(nx, curPos.z)) nz = curPos.z;
      else if (canStand(curPos.x, nz)) nx = curPos.x;
      else { nx = curPos.x; nz = curPos.z; }
    }
    p = pushOutProps(nx, nz, 0.34);
    nx = p.x; nz = p.z;

    const sampledY = sampleFloorY(nx, nz, curPos.y);
    const ny = sampledY !== null ? sampledY : curPos.y;
    const finalArea = nx > 3.2 ? 'BANGKOK CANAL ALLEY' : (nx < -3.2 ? 'WEST BANGKOK DISTRICT' : 'YAOWARAT NIGHT MARKET');
    return { x: nx, y: ny, z: nz, area: finalArea };
  }

  function resolveCamera(origin, desiredPos) {
    const dir = desiredPos.clone().sub(origin);
    const fullDist = dir.length();
    if (fullDist < 0.05) return desiredPos.clone();
    dir.divideScalar(fullDist);

    let safeDist = fullDist;
    for (const b of wallBoxes) {
      const hitT = rayHitBox(origin.x, origin.y, origin.z, dir.x, dir.y, dir.z, safeDist, b);
      if (hitT < safeDist) safeDist = Math.max(0.85, hitT - 0.32);
    }
    const out = origin.clone().addScaledVector(dir, safeDist);
    // Keep camera above floor/stairs!
    const fy = sampleFloorY(out.x, out.z, Math.max(0, origin.y - 1.2));
    out.y = Math.max((fy !== null ? fy : 0) + 0.38, out.y);
    return out;
  }

  return {
    root,
    woofers,
    speakerPositions,
    solidMeshes,
    resolveMove,
    resolveCamera,
    tick(delta, elapsed, lisaPos) {
      for (const m of mixers) m.update(delta);
      const bass = 1.0 + 0.14 * Math.pow(Math.max(0, Math.sin(elapsed * (126 / 60) * Math.PI)), 4);
      for (const w of woofers) w.scale.set(bass, bass, 1.0 + (bass - 1.0) * 1.8);
      for (const b of bystanders) {
        let targetYaw = b.baseYaw + Math.sin(elapsed * 0.85 + b.phase) * 0.16;
        if (b.node.position.distanceTo(lisaPos) < 5.0) {
          const lookYaw = Math.atan2(lisaPos.x - b.node.position.x, lisaPos.z - b.node.position.z);
          targetYaw = lookYaw;
        }
        const diff = Math.atan2(Math.sin(targetYaw - b.node.rotation.y), Math.cos(targetYaw - b.node.rotation.y));
        b.node.rotation.y += diff * (1 - Math.exp(-delta * 4.5));
      }
    },
  };
}
