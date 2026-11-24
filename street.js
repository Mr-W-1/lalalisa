import * as THREE from 'three';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import {
  buildNightSky, buildStreetGround, containsWalkPoint, makeStreetLighting, streetHeight, walkAreaName,
} from './bangkok-ground.js';
import { buildJennieEntrance, buildLisaEntrance } from './bangkok-venues.js';
import {
  balanceNeoStorefront, buildCurbsideCrates, buildDiningFurniture, buildHighRiseLayer, buildNeoMarquee, buildShophouseFrontages,
  buildStreetFestoons, buildStreetMarket, buildStreetUtilityLines, buildWetRoad, loadNightSurfaces, reflectInStreet, skinSkyline,
} from './bangkok-night.js?v=8';

export const VENUE_POS = new THREE.Vector3(0, 0, -35.1);
export const JENNIE_VENUE_POS = new THREE.Vector3(21.4, 0, -3.52);
export const STREET_SPAWN_Z = 17.8;
export const STREET_LAYOUT_VERSION = 5;
export const STREET_DRAFT_KEY = `lalalisa_bangkok_layout_v${STREET_LAYOUT_VERSION}`;

function makeNeonSignTexture(text, fg, bg, accent, vertical = false) {
  const canvas = document.createElement('canvas');
  canvas.width = vertical ? 256 : 512;
  canvas.height = vertical ? 512 : 160;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

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
  ctx.font = '800 44px -apple-system, "SF Pro Display", sans-serif';
  ctx.fillText(text, canvas.width * 0.5, canvas.height * 0.5);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function addNeonSign(parent, pos, w, h, text, fg, bg, accent, rotY = 0) {
  const g = new THREE.Group();
  g.position.copy(pos);
  g.rotation.y = rotY;
  const tex = makeNeonSignTexture(text, fg, bg, accent, false);
  const mat = new THREE.MeshStandardMaterial({
    map: tex, emissive: new THREE.Color('#ffffff'), emissiveMap: tex,
    emissiveIntensity: 1.3, roughness: 0.25, metalness: 0.1, side: THREE.DoubleSide,
  });
  g.add(new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat));
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(w + 0.12, h + 0.12, 0.08),
    new THREE.MeshStandardMaterial({ color: 0x15101d, roughness: 0.5, metalness: 0.7 })
  );
  frame.position.z = -0.05;
  g.add(frame);
  parent.add(g);
  return g;
}

function addLisaSpeaker(parent, pos, rotY, accentHex, woofers, speakerPositions) {
  const g = new THREE.Group();
  g.position.copy(pos);
  g.rotation.y = rotY;
  const cabMat = new THREE.MeshStandardMaterial({ color: 0x161120, roughness: 0.36, metalness: 0.58 });
  const trimMat = new THREE.MeshStandardMaterial({
    color: accentHex, emissive: accentHex, emissiveIntensity: 1.9, roughness: 0.2,
  });
  const coneMat = new THREE.MeshStandardMaterial({ color: 0x241d34, roughness: 0.45, metalness: 0.35 });
  const ringMat = new THREE.MeshStandardMaterial({
    color: 0xffd2ec, emissive: accentHex, emissiveIntensity: 1.5, roughness: 0.22,
  });

  const base = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.92, 0.54), cabMat);
  base.position.y = 0.46; g.add(base);
  const top = new THREE.Mesh(new THREE.BoxGeometry(0.60, 0.62, 0.48), cabMat);
  top.position.y = 1.24; g.add(top);

  for (const sx of [-0.33, 0.33]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.035, 1.52, 0.035), trimMat);
    rail.position.set(sx, 0.78, 0.28); g.add(rail);
  }
  const strip1 = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.035, 0.035), trimMat);
  strip1.position.set(0, 0.93, 0.29); g.add(strip1);

  for (const [wy, r] of [[0.46, 0.24], [1.24, 0.18]]) {
    const wn = new THREE.Group();
    wn.position.set(0, wy, wy < 0.8 ? 0.30 : 0.26);
    wn.add(new THREE.Mesh(new THREE.TorusGeometry(r, 0.022, 10, 24), ringMat));
    wn.add(new THREE.Mesh(new THREE.CircleGeometry(r * 0.88, 22), coneMat));
    g.add(wn);
    woofers.push(wn);
  }

  parent.add(g);
  speakerPositions.push(g.position);
  return g;
}

function addVendingMachine(parent, texLoader, pos, rotY, accentHex) {
  const g = new THREE.Group();
  g.position.copy(pos);
  g.rotation.y = rotY;

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1.18, 2.18, 0.82),
    new THREE.MeshStandardMaterial({ color: 0x3c3038, roughness: 0.60, metalness: 0.20 })
  );
  body.position.y = 1.09;
  g.add(body);

  const tex = texLoader.load('./assets/yaowarat/neo_bangkok_vendrink.jpg');
  tex.colorSpace = THREE.SRGBColorSpace;
  const front = new THREE.Mesh(
    new THREE.PlaneGeometry(1.06, 1.98),
    new THREE.MeshStandardMaterial({
      map: tex, emissive: new THREE.Color('#ffffff'), emissiveMap: tex,
      emissiveIntensity: 0.78, roughness: 0.25, metalness: 0.08,
    })
  );
  front.position.set(0, 1.1, 0.42);
  g.add(front);

  const canopy = new THREE.Mesh(
    new THREE.BoxGeometry(1.22, 0.08, 0.90),
    new THREE.MeshStandardMaterial({ color: accentHex, emissive: accentHex, emissiveIntensity: 1.2 })
  );
  canopy.position.set(0, 2.2, 0.02);
  g.add(canopy);

  parent.add(g);
  return g;
}

function assetTemplate(source, label, scale, floor = 0) {
  const bounds = new THREE.Box3().setFromObject(source, true);
  const center = bounds.getCenter(new THREE.Vector3());
  const scene = new THREE.Group();
  scene.add(source);
  source.position.sub(new THREE.Vector3(center.x, floor, center.z));
  return { scene, label, defaultScale: [scale, scale, scale] };
}

function boxFromLimits(x1, y1, z1, x2, y2, z2) {
  return new THREE.Box3(new THREE.Vector3(x1, y1, z1), new THREE.Vector3(x2, y2, z2));
}

function textureCutawayWalls(model, texture) {
  model.updateMatrixWorld(true);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  const plaster = new THREE.MeshStandardMaterial({ map: texture, color: 0xc1b2a5, roughness: 0.88, side: THREE.DoubleSide });
  const vertex = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const normalMatrix = new THREE.Matrix3();
  model.traverse((object) => {
    if (!object.isMesh || !/Cut_?off/i.test(object.material.name)) return;
    const geometry = object.geometry.clone();
    const { position, normal: normals } = geometry.attributes;
    const tileUV = new Float32Array(position.count * 2);
    normalMatrix.getNormalMatrix(object.matrixWorld);
    for (let i = 0; i < position.count; i++) {
      vertex.fromBufferAttribute(position, i).applyMatrix4(object.matrixWorld);
      normal.fromBufferAttribute(normals, i).applyNormalMatrix(normalMatrix);
      const alongWall = Math.abs(normal.x) > Math.abs(normal.z) ? vertex.z : vertex.x;
      tileUV[2 * i] = alongWall / 340;
      tileUV[2 * i + 1] = vertex.y / 330;
    }
    geometry.setAttribute('uv', new THREE.BufferAttribute(tileUV, 2));
    object.geometry = geometry;
    object.material = plaster;
  });
}

function extractStreetProp(source, name) {
  source.updateMatrixWorld(true);
  const mesh = source.getObjectByName(name);
  if (!mesh) return null;
  const prop = mesh.clone();
  mesh.matrixWorld.decompose(prop.position, prop.quaternion, prop.scale);
  const model = new THREE.Group();
  model.add(prop);
  return model;
}

export async function buildYaowaratStreet(loader, onProgress) {
  const root = new THREE.Group();
  root.name = 'Yaowarat';
  const woofers = [];
  const speakerPositions = [];
  const actors = [];
  const pedestrians = [];
  const blockers = [];
  const editables = [];
  const templates = {};
  const registerEditable = (id, label, kind, node, collider = null, added = false) => {
    node.userData.editableId = id;
    const item = { id, label, kind, node, collider, added };
    if (collider) blockers.push(collider);
    editables.push(item);
    return item;
  };

  const boxCollider = (node, shape = node) => {
    shape.updateWorldMatrix(true, false);
    return { node, shape, box: new THREE.Box3().setFromObject(shape, true) };
  };
  const solidLimits = (...limits) => blockers.push({ box: boxFromLimits(...limits) });
  const registerProp = (id, label, kind, node, radius, height) =>
    registerEditable(id, label, kind, node, { node, radius, height });

  reflectInStreet(buildNightSky(root));
  const { lightPool, contactShadow } = makeStreetLighting(root);
  const playerShadow = contactShadow(0, 0, 1.1, 0.72, 0.7);
  const skyFill = new THREE.HemisphereLight(0x97a6db, 0x896357, 0.20);
  root.add(reflectInStreet(skyFill));
  const frontageLight = new THREE.DirectionalLight(0xffc093, 0.42);
  frontageLight.position.set(-13, 12, 22);
  root.add(reflectInStreet(frontageLight));

  solidLimits(-6.75, 0, -38.1, 6.75, 11.45, -35.63);
  solidLimits(-6.75, 0, -35.64, -4.57, 9.65, -34.60);
  solidLimits(4.57, 0, -35.64, 6.75, 9.65, -34.60);
  solidLimits(-4.72, 4.10, -35.63, 4.72, 5.69, -32.82);
  lightPool(0, -33.0, 5.8, 8.5, 0xffa981, 0.46);
  lightPool(0, -27.9, 5.5, 9.5, 0xff4e8a, 0.34);

  const jennieX = 23.4;
  const jennieZ = -3.52;
  solidLimits(jennieX - 0.65, 0, jennieZ - 4.52, jennieX + 2.4, 8.5, jennieZ + 4.52);
  lightPool(19.7, -3.4, 5.4, 6.9, 0xb66eff, 0.53);

  const mountMat = new THREE.MeshStandardMaterial({ color: 0x35323e, roughness: 0.65 });
  for (const side of [-1, 1]) {
    const east = side > 0;
    const label = east ? 'JENNIE STAGE →' : '← NEO BANGKOK';
    const color = east ? '#e798cf' : '#66d8dc';
    const z = 0.3;
    const sign = addNeonSign(root, new THREE.Vector3(side * 4.24, 2.78, z), 2.75, 0.6, label,
      east ? '#ffecf7' : '#dbffff', '#211b2b', color);
    const support = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.077, 2.98, 8), mountMat);
    support.position.set(side * 5.53, 1.57, z - 0.1);
    root.add(support);
    reflectInStreet(sign);
    registerEditable(east ? 'sign_arrow_east' : 'sign_arrow_west', label, 'sign', sign);
  }

  const texLoader = new THREE.TextureLoader();
  for (const [id, x, z, yaw, color] of [
    ['vending_L', -4.57, 12.55, Math.PI / 2, 0x70e5e3],
    ['vending_R', 4.59, -16.45, -Math.PI / 2, 0xff95bd],
  ]) {
    const vend = addVendingMachine(root, texLoader, new THREE.Vector3(x, streetHeight(x, z), z), yaw, color);
    reflectInStreet(vend);
    registerProp(id, 'Vending Machine', 'vending', vend, 0.57, 2.25);
  }

  for (const [id, x, z, yaw, color] of [
    ['speaker_mid_L', -4.33, 7.25, 0.84, 0xf975b7],
    ['speaker_mid_R', 4.30, -13.7, -0.88, 0x6fdddd],
    ['speaker_entrance_L', -3.78, -32.26, 0.22, 0xff78b2],
    ['speaker_entrance_R', 3.78, -32.26, -0.22, 0xff9a88],
  ]) {
    const speaker = addLisaSpeaker(root, new THREE.Vector3(x, streetHeight(x, z), z), yaw, color, woofers, speakerPositions);
    reflectInStreet(speaker);
    registerProp(id, 'Lisa PA Speaker', 'speaker', speaker, 0.43, 1.62);
  }

  const load = async (url) => {
    try {
      return await loader.loadAsync(url);
    } catch (error) {
      console.warn(`Bangkok asset failed to load: ${url}`, error);
      return null;
    }
  };

  onProgress?.('Loading Bangkok street and venues…', 0.35);
  const district = './assets/bangkok/district/';
  const [
    apartments, shophouses, neo, corner, tukTuk, lamp, girl, rowoon, plaster,
    canalHouses, skyline, surfaces,
  ] = await Promise.all([
    load(`${district}apartments.glb`),
    load(`${district}shophouses.glb`),
    load(`${district}neo-storefront.glb`),
    load(`${district}corner-shops.glb`),
    load(`${district}tuk-tuk.glb`),
    load('./assets/city/street_lamp_01/street_lamp_01.gltf'),
    load('./assets/cast/korean_girl.glb'),
    load('./assets/cast/rowoon.glb'),
    texLoader.loadAsync('./assets/city/west_bangkok/textures/wall_tileable2_house2.png').catch(() => null),
    load(`${district}canal-houses.glb`),
    load('./assets/bangkok/cyberpunk_city.glb'),
    loadNightSurfaces(texLoader).catch((error) => {
      console.warn('Night market surfaces failed to load', error);
      return null;
    }),
  ]);
  const lisaEntrance = reflectInStreet(buildLisaEntrance(root, VENUE_POS.z, surfaces?.theatre));
  registerEditable('lisa_theatre', 'LISA Theatre', 'entrance', lisaEntrance);
  const jennieEntrance = reflectInStreet(buildJennieEntrance(root, jennieX, jennieZ, surfaces?.jennie));
  registerEditable('jennie_theatre', 'Jennie Theatre', 'entrance', jennieEntrance);
  const asphalt = buildStreetGround(root, surfaces?.asphalt);
  buildWetRoad(root, asphalt);
  buildStreetFestoons(root, streetHeight, lightPool);
  if (surfaces) {
    buildStreetUtilityLines(root);
    for (const [i, node] of buildCurbsideCrates(root, surfaces.plaster, streetHeight).entries()) {
      registerEditable(`crate_pile_${i + 1}`, 'Curbside crates', 'furniture', node, boxCollider(node));
    }
    for (const { id, node, structure } of buildShophouseFrontages(root, surfaces, lightPool)) {
      registerEditable(id, 'Yaowarat Shophouse', 'frontage', node, boxCollider(node, structure));
    }
    for (const { id, label, node } of buildStreetMarket(root, surfaces, streetHeight, lightPool)) {
      registerEditable(id, label, 'market', node, boxCollider(node));
    }
  }
  if (corner && (surfaces?.plaster || plaster)) textureCutawayWalls(corner.scene, surfaces?.plaster || plaster);
  if (skyline && surfaces) skinSkyline(skyline.scene, surfaces);
  if (surfaces) buildHighRiseLayer(root, surfaces);
  if (neo) balanceNeoStorefront(neo.scene);
  for (const [gltf, grade] of [[apartments, 0xb7a49e], [canalHouses, 0xc2a99a]]) {
    gltf?.scene.traverse((object) => {
      if (!object.isMesh) return;
      for (const material of [object.material].flat()) {
        if (!material.userData.nightGrade && material.color) {
          material.color.multiply(new THREE.Color(grade));
          material.userData.nightGrade = true;
        }
      }
    });
  }
  for (const [index, node] of buildDiningFurniture(root, streetHeight).entries()) {
    registerEditable(`dining_${index + 1}`, 'Street Dining Table', 'furniture', node, boxCollider(node));
  }

  if (lamp) {
    lamp.scene.traverse((object) => {
      if (!object.isMesh) return;
      if (object.material.name.endsWith('_bulb')) {
        object.material.emissive.setHex(0xffbd83);
        object.material.emissiveIntensity = 2.3;
      } else if (object.material.name.endsWith('_glass')) {
        object.material.opacity = 0.41;
        object.material.depthWrite = false;
      }
    });
  }

  if (shophouses) {
    const scooter = extractStreetProp(shophouses.scene, 'Scooter_Material_#477_0');
    if (scooter) {
      const floor = new THREE.Box3().setFromObject(scooter, true).min.y;
      templates.scooter = assetTemplate(scooter, 'Parked Scooter', 0.0078, floor);
    }
  }

  for (const [key, gltf, label, scale, floor] of [
    ['cityBlock', apartments, 'Apartment Blocks', 0.91, 0],
    ['canalHouses', canalHouses, 'Bangkok Canal Buildings', 0.008, 125],
    ['skyline', skyline, 'High-Rise Skyline', 9.0, 0],
    ['citysceneBkk', shophouses, 'Bangkok Shophouses', 0.0072, 0],
    ['neoBangkok', neo, 'Neo Bangkok Storefront', 3.45, -0.083],
    ['citysceneThai', corner, 'Thai Corner Shops', 0.0093, -25],
    ['tukTuk', tukTuk, 'Thai Tuk-Tuk', 1, 0.005],
    ['lamp', lamp, 'Street Lamp', 1, 0],
  ]) {
    if (gltf) templates[key] = assetTemplate(gltf.scene, label, scale, floor);
  }

  function place(kind, id, label, x, z, yaw, { scale, y = 0, align, collides = false, visibleInReflection = false } = {}) {
    const template = templates[kind];
    if (!template) return null;
    const node = template.scene.clone(true);
    node.scale.setScalar(scale ?? template.defaultScale[0]);
    node.rotation.y = yaw;
    node.position.set(x, y, z);
    if (align) {
      const [side, axis] = align;
      const bounds = new THREE.Box3().setFromObject(node, true);
      node.position[axis] += node.position[axis] - bounds[side][axis];
    }
    root.add(node);
    if (visibleInReflection) reflectInStreet(node);
    registerEditable(id, label, kind, node, collides ? boxCollider(node) : null);
    return node;
  }

  // Set the near edge of each building from its transformed bounds. The same setbacks
  // leave room for the walks, their corner crossings, and a full orbit around Lisa.
  place('citysceneBkk', 'shops_southwest', 'Southwest Shophouses', -9.4, 13.05, Math.PI / 2,
    { align: ['max', 'x'], collides: true, visibleInReflection: true });
  place('citysceneThai', 'shops_southeast', 'Southeast Corner Shops', 9.5, 13.28, Math.PI / 2,
    { align: ['min', 'x'], collides: true, visibleInReflection: true });
  place('citysceneThai', 'shops_northwest', 'Northwest Corner Shops', -10.0, -20.15, -Math.PI / 2,
    { align: ['max', 'x'], collides: true, scale: 0.0089 });
  place('citysceneBkk', 'shops_northeast', 'Northeast Shophouses', 9.55, -21.0, -Math.PI / 2,
    { align: ['min', 'x'], collides: true });
  place('citysceneBkk', 'shops_west_branch', 'West Branch Shophouses', -17.85, -11.4, 0,
    { align: ['max', 'z'], scale: 0.0058, collides: true });
  place('neoBangkok', 'neo_bangkok_west', 'Neo Bangkok Storefront', -24.05, -3.28, Math.PI / 2,
    { align: ['max', 'x'], collides: true, visibleInReflection: true });
  buildNeoMarquee(root, streetHeight, lightPool);
  place('citysceneThai', 'shops_east_branch', 'East Branch Shops', 19.25, 5.1, Math.PI,
    { align: ['min', 'z'], scale: 0.0088, collides: true });

  place('cityBlock', 'apartments_north', 'North Apartment Backdrop', 13.2, -47.0, Math.PI / 2,
    { align: ['max', 'z'], scale: 0.75 });
  place('cityBlock', 'apartments_east', 'East Apartment Backdrop', 28.8, -9.2, Math.PI,
    { align: ['min', 'x'] });
  place('cityBlock', 'apartments_west', 'West Apartment Backdrop', -27.5, -1.75, 0,
    { align: ['max', 'x'], scale: 0.79 });
  place('cityBlock', 'apartments_south', 'South Apartment Backdrop', -1.25, 28.5, -Math.PI / 2,
    { align: ['min', 'z'], scale: 0.72 });

  place('canalHouses', 'canal_buildings_nw', 'Northwest Canal Buildings', -23.8, -38.5, Math.PI * 0.14,
    { scale: 0.0083 });
  place('canalHouses', 'canal_buildings_ne', 'Northeast Canal Buildings', 27.5, -39.9, Math.PI * 0.79,
    { scale: 0.0078 });
  place('canalHouses', 'canal_buildings_sw', 'Southwest Canal Buildings', -25.4, 20.8, Math.PI * 0.55,
    { scale: 0.0073 });

  place('skyline', 'skyline_north', 'North High-Rise Skyline', -5.1, -51, Math.PI * 0.18,
    { scale: 10.8, align: ['max', 'z'] });
  place('skyline', 'skyline_east', 'East High-Rise Skyline', 42.5, -6.5, -Math.PI * 0.49,
    { scale: 8.5, align: ['min', 'x'] });
  place('skyline', 'skyline_west', 'West High-Rise Skyline', -41.2, -3.7, Math.PI * 0.62,
    { scale: 9.1, align: ['max', 'x'] });
  place('skyline', 'skyline_south', 'South High-Rise Skyline', 11, 44, Math.PI * 0.83,
    { scale: 8.65, align: ['min', 'z'] });

  if (tukTuk) {
    tukTuk.scene.traverse((object) => {
      if (!object.isMesh) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) {
        if (material.metalness > 0.7) material.metalness *= 0.72;
        if (material.name.toLowerCase() === 'headlight interior') {
          material.emissive.setHex(0xffb568);
          material.emissiveIntensity = 0.85;
        }
      }
    });
    place('tukTuk', 'tuk_tuk_arrivals', 'Tuk-Tuk at Arrivals', 2.25, 13.17, Math.PI / 2 - 0.23,
      { collides: true, visibleInReflection: true });
    contactShadow(2.25, 13.17, 2.12, 4.03, 0.66);
    lightPool(2.23, 13.32, 1.8, 5.2, 0xffb58d, 0.25);
  }

  for (const [id, x, z, yaw] of [
    ['scooter_alley', -4.16, 16.65, -0.2],
    ['scooter_west', -14.52, -7.92, Math.PI / 2 + 0.2],
  ]) {
    const scooter = place('scooter', id, 'Parked Scooter', x, z, yaw,
      { y: streetHeight(x, z), collides: true });
    if (scooter) contactShadow(x, z, 1.35, 1.8, 0.56);
  }

  for (const [index, [x, z, color]] of [
    [-3.32, 19.3, 0xffbd83], [3.35, 10.7, 0xffc59e], [-3.31, 3.05, 0xffbc86],
    [3.35, -10.14, 0xf4b594], [-3.31, -17.35, 0xffc59d], [3.35, -26.3, 0xffb183],
    [-15.8, -7.55, 0xf0b285], [15.22, 0.05, 0xe1b2d6],
  ].entries()) {
    const pole = place('lamp', `lamp_${index + 1}`, 'Street Lamp', x, z, 0, { y: streetHeight(x, z), visibleInReflection: true });
    if (pole) {
      const item = editables[editables.length - 1];
      item.collider = { node: pole, radius: 0.16, height: 3.8 };
      blockers.push(item.collider);
    }
    lightPool(x * 0.88, z, 4.3, 5.7, color, 0.24);
  }

  for (const [index, [gltf, x, z, yaw]] of [
    [girl, 3.91, 15.14, -1.3], [rowoon, -3.63, 11.4, 1.37],
    [girl, -20.9, -5.92, 0.55], [rowoon, 16.35, -5.85, -1.28],
    [girl, 4.28, -29.8, -0.95],
    [rowoon, -4.87, 9.65, 1.51],
  ].entries()) {
    if (!gltf) continue;
    const actor = SkeletonUtils.clone(gltf.scene);
    actor.position.set(x, streetHeight(x, z), z);
    actor.rotation.y = yaw;
    root.add(actor);
    const mixer = new THREE.AnimationMixer(actor);
    const clip = gltf.animations.find((animation) => /idle/i.test(animation.name)) ?? gltf.animations[0];
    if (clip) {
      mixer.clipAction(clip).play();
      mixer.setTime(index * 0.77);
    }
    actors.push({ node: actor, mixer, yaw, shadow: contactShadow(x, z, 0.93, 0.68, 0.63) });
    registerProp(`bystander_${index + 1}`, 'Bystander', 'bystander', actor, 0.37, 1.7);
  }

  for (const [gltf, from, to, phase] of [
    [girl, [3.72, 1.73], [3.72, 4.31], 0.31],
    [rowoon, [-3.73, -19.2], [-3.73, -24.8], 0.48],
    [girl, [-10.2, -0.18], [-16.9, -0.18], 0.22],
  ]) {
    const walk = gltf?.animations.find((clip) => clip.name === 'Walk');
    const idle = gltf?.animations.find((clip) => clip.name === 'Idle');
    if (!walk || !idle) continue;
    const node = SkeletonUtils.clone(gltf.scene);
    const start = new THREE.Vector3(from[0], 0, from[1]);
    const end = new THREE.Vector3(to[0], 0, to[1]);
    const heading = Math.atan2(end.x - start.x, end.z - start.z);
    const speed = 0.81 / start.distanceTo(end);
    root.add(node);
    node.position.copy(start).lerp(end, phase);
    node.position.y = streetHeight(node.position.x, node.position.z);
    node.rotation.y = heading;
    const mixer = new THREE.AnimationMixer(node);
    const walkAction = mixer.clipAction(walk).play();
    const idleAction = mixer.clipAction(idle).play().setEffectiveWeight(0);
    mixer.setTime(phase * 2.0);
    const shadow = contactShadow(node.position.x, node.position.z, 0.9, 0.66, 0.65);
    pedestrians.push({ node, start, end, heading, speed, mixer, walkAction, idleAction, shadow, phase, direction: 1, pace: 1 });
  }

  function canStand(x, z) {
    if (!containsWalkPoint(x, z)) return false;
    const radius = 0.32;
    for (const blocker of blockers) {
      if (blocker.node && !blocker.node.visible) continue;
      if (blocker.box) {
        const { min, max } = blocker.box;
        if (min.y > 2) continue;
        if (x + radius > min.x && x - radius < max.x && z + radius > min.z && z - radius < max.z) return false;
      } else {
        const p = blocker.node.position;
        if (Math.hypot(x - p.x, z - p.z) < radius + blocker.radius) return false;
      }
    }
    return true;
  }

  function resolveMove(current, desiredX, desiredZ) {
    let x = current.x;
    let z = current.z;
    // Keep collision reliable when the player has a slow frame or hits a corner diagonally.
    const dx = desiredX - x, dz = desiredZ - z;
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.24));
    for (let i = 0; i < steps; i++) {
      if (canStand(x + dx / steps, z)) x += dx / steps;
      if (canStand(x, z + dz / steps)) z += dz / steps;
    }
    return { x, y: streetHeight(x, z), z, area: walkAreaName(x, z) };
  }

  const ray = new THREE.Ray();
  const hit = new THREE.Vector3();
  const probe = new THREE.Box3();
  function resolveCamera(origin, desired) {
    ray.origin.copy(origin);
    ray.direction.copy(desired).sub(origin);
    let distance = ray.direction.length();
    if (distance < 0.01) return desired.clone();
    ray.direction.divideScalar(distance);

    for (const blocker of blockers) {
      if (blocker.node && !blocker.node.visible) continue;
      if (blocker.box) {
        probe.copy(blocker.box);
      } else {
        const p = blocker.node.position;
        const { radius, height } = blocker;
        probe.min.set(p.x - radius, p.y, p.z - radius);
        probe.max.set(p.x + radius, p.y + height, p.z + radius);
      }
      // An avatar's eyes may be level with a bystander. Only shorten against a surface ahead.
      if (probe.containsPoint(origin)) continue;
      if (ray.intersectBox(probe, hit)) {
        const blocked = hit.distanceTo(origin);
        if (blocked < distance) distance = Math.max(0.32, blocked - 0.24);
      }
    }
    const out = ray.at(distance, new THREE.Vector3());
    out.y = Math.max(streetHeight(out.x, out.z) + 0.38, out.y);
    return out;
  }

  function syncCollider(item) {
    const collider = item?.collider;
    if (!collider?.box) return;
    collider.shape.updateWorldMatrix(true, false);
    collider.box.setFromObject(collider.shape, true);
  }

  let addedSeq = 1;
  function spawnEditable(kind, pos = [0, 0, 0], rot = [0, 0, 0], scale = null, customId = null) {
    const template = templates[kind];
    if (!template) return null;
    const node = template.scene.clone(true);
    node.position.fromArray(pos);
    node.rotation.fromArray(rot);
    node.scale.fromArray(scale ?? template.defaultScale);
    root.add(node);
    const id = customId || `added_${kind}_${addedSeq++}_${Date.now().toString(36).slice(-4)}`;
    return registerEditable(id, `${template.label} (Added)`, kind, node, boxCollider(node), true);
  }

  function spawnCustomScene(node, url, label, pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1], customId = null) {
    node.position.fromArray(pos);
    node.rotation.fromArray(rot);
    node.scale.fromArray(scale);
    root.add(node);
    const id = customId || `custom_${addedSeq++}_${Date.now().toString(36).slice(-4)}`;
    const item = registerEditable(id, label || 'Custom Model', 'custom', node, null, true);
    item.customUrl = url;
    return item;
  }

  async function applyLayout(layout) {
    if (layout?.version !== STREET_LAYOUT_VERSION) return;
    const byId = new Map(editables.map((item) => [item.id, item]));
    for (const [id, transform] of Object.entries(layout.items ?? {})) {
      const item = byId.get(id);
      if (!item || !transform) continue;
      if (Array.isArray(transform.pos)) item.node.position.fromArray(transform.pos);
      if (Array.isArray(transform.rot)) item.node.rotation.fromArray(transform.rot);
      if (Array.isArray(transform.scale)) item.node.scale.fromArray(transform.scale);
      if (typeof transform.hidden === 'boolean') item.node.visible = !transform.hidden;
      syncCollider(item);
    }
    for (const spec of Array.isArray(layout.added) ? layout.added : []) {
      if (!spec || byId.has(spec.id)) continue;
      let item;
      if (spec.kind === 'custom' && spec.url) {
        const gltf = await load(spec.url);
        if (gltf) item = spawnCustomScene(gltf.scene, spec.url, spec.label, spec.pos, spec.rot, spec.scale, spec.id);
      } else {
        item = spawnEditable(spec.kind, spec.pos, spec.rot, spec.scale, spec.id);
      }
      if (item) {
        byId.set(item.id, item);
        if (spec.hidden) item.node.visible = false;
      }
    }
  }

  function exportLayout() {
    const round = (value) => Math.round(value * 100000) / 100000;
    const items = {};
    const added = [];
    for (const item of editables) {
      const { node } = item;
      const data = {
        pos: node.position.toArray().map(round),
        rot: [node.rotation.x, node.rotation.y, node.rotation.z].map(round),
        scale: node.scale.toArray().map(round),
      };
      if (!node.visible) data.hidden = true;
      if (item.added) {
        added.push({ id: item.id, kind: item.kind, ...data, url: item.customUrl, label: item.label });
      } else {
        items[item.id] = data;
      }
    }
    return { version: STREET_LAYOUT_VERSION, items, added };
  }

  const repoLayout = await fetch('./bangkok-layout.json')
    .then((response) => response.ok ? response.json() : null)
    .catch(() => null);
  if (repoLayout) await applyLayout(repoLayout);
  const isLocal = /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])$/.test(window.location.hostname);
  if (isLocal && new URLSearchParams(window.location.search).has('edit')) {
    try {
      const draft = localStorage.getItem(STREET_DRAFT_KEY);
      if (draft) await applyLayout(JSON.parse(draft));
    } catch {
      // A malformed local draft should still allow the built-in street to load.
    }
  }

  // Freeze world matrices on all static street meshes (cuts per-frame CPU traversal ~70% with zero visual change!)
  // NEVER toggle PointLight.visible dynamically (that triggers WebGL shader recompilation stalls!).
  const dynamicSet = new Set([playerShadow, ...woofers]);
  for (const p of pedestrians) {
    dynamicSet.add(p.node);
    dynamicSet.add(p.shadow);
    p.node.traverse((o) => dynamicSet.add(o));
  }
  for (const a of actors) {
    dynamicSet.add(a.node);
    dynamicSet.add(a.shadow);
    a.node.traverse((o) => dynamicSet.add(o));
  }
  const isEditorUrl = new URLSearchParams(window.location.search).has('edit');
  if (!isEditorUrl) {
    root.updateMatrixWorld(true);
    root.traverse((o) => {
      if (o !== root && !dynamicSet.has(o) && !o.isCamera) {
        o.matrixAutoUpdate = false;
      }
    });
  }

  return {
    root,
    speakerPositions,
    editables,
    templates,
    spawnEditable,
    spawnCustomScene,
    syncCollider,
    exportLayout,
    resolveMove,
    resolveCamera,
    tick(delta, elapsed, lisaPos) {
      playerShadow.position.set(lisaPos.x, streetHeight(lisaPos.x, lisaPos.z) + 0.016, lisaPos.z);
      for (const person of pedestrians) {
        const d2 = person.node.position.distanceToSquared(lisaPos);
        const walking = d2 > 1.17;
        person.pace = THREE.MathUtils.damp(person.pace, walking ? 1 : 0, 8, delta);
        person.phase = THREE.MathUtils.clamp(person.phase + person.direction * person.speed * person.pace * delta, 0, 1);
        if (person.phase === 1) person.direction = -1;
        else if (person.phase === 0) person.direction = 1;
        person.node.position.copy(person.start).lerp(person.end, person.phase);
        person.node.position.y = streetHeight(person.node.position.x, person.node.position.z);
        const desiredYaw = person.heading + (person.direction < 0 ? Math.PI : 0);
        const turn = desiredYaw - person.node.rotation.y;
        person.node.rotation.y += Math.atan2(Math.sin(turn), Math.cos(turn)) * (1 - Math.exp(-delta * 5));
        if (d2 < 900) {
          person.idleAction.setEffectiveWeight(1 - person.pace);
          person.walkAction.setEffectiveWeight(person.pace);
          person.mixer.update(delta);
        }
        person.shadow.position.copy(person.node.position);
        person.shadow.position.y += 0.016;
      }
      const bass = 1.0 + 0.14 * Math.pow(Math.max(0, Math.sin(elapsed * (126 / 60) * Math.PI)), 4);
      for (const woofer of woofers) woofer.scale.set(bass, bass, 1.0 + (bass - 1.0) * 1.8);
      for (const { node, mixer, yaw, shadow } of actors) {
        shadow.position.set(node.position.x, streetHeight(node.position.x, node.position.z) + 0.016, node.position.z);
        shadow.visible = node.visible;
        const d2 = node.position.distanceToSquared(lisaPos);
        if (d2 < 900) mixer.update(delta);
        const target = d2 < 10.56
          ? Math.atan2(lisaPos.x - node.position.x, lisaPos.z - node.position.z) : yaw;
        const turn = target - node.rotation.y;
        node.rotation.y += Math.atan2(Math.sin(turn), Math.cos(turn)) * (1 - Math.exp(-delta * 4.5));
      }
    },
  };
}
