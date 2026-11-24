import * as THREE from 'three';

export const WALK_AREAS = [
  { name: 'YAOWARAT MAIN ALLEY', minX: -4.85, maxX: 4.85, minZ: -35.0, maxZ: 23.0 },
  { name: 'JENNIE · COMING SOON', minX: 4.10, maxX: 20.4, minZ: -8.4, maxZ: 0.8 },
  { name: 'NEO BANGKOK', minX: -23.4, maxX: -4.10, minZ: -8.4, maxZ: 0.8 },
  { name: 'JENNIE · COMING SOON', minX: 14.8, maxX: 22.4, minZ: -10.4, maxZ: 2.8 },
  { name: 'NEO BANGKOK', minX: -23.4, maxX: -17.4, minZ: -10.4, maxZ: 2.8 },
];

const ROAD_EDGE = 2.95;
const JUNCTION_NORTH = -6.65;
const JUNCTION_SOUTH = -0.86;
const PAVING_HEIGHT = 0.095;

const footways = [
  [-7.5, -ROAD_EDGE, JUNCTION_SOUTH, 25],
  [ROAD_EDGE, 7.5, JUNCTION_SOUTH, 25],
  [-8.0, -ROAD_EDGE, -37.5, JUNCTION_NORTH],
  [ROAD_EDGE, 8.0, -37.5, JUNCTION_NORTH],
  [-26.5, -7.5, JUNCTION_SOUTH, 4.0],
  [7.5, 28.5, JUNCTION_SOUTH, 4.0],
  [-26.5, -8.0, -11.8, JUNCTION_NORTH],
  [8.0, 28.5, -11.8, JUNCTION_NORTH],
  [-26.5, -19.2, JUNCTION_NORTH, JUNCTION_SOUTH],
  [17.3, 28.5, JUNCTION_NORTH, JUNCTION_SOUTH],
];

export function containsWalkPoint(x, z) {
  return WALK_AREAS.some((area) => x >= area.minX && x <= area.maxX && z >= area.minZ && z <= area.maxZ);
}

export function walkAreaName(x, z) {
  if (z < -25 && Math.abs(x) < WALK_AREAS[0].maxX) return 'LISA · LIVE STAGE';
  return WALK_AREAS.find((area) => x >= area.minX && x <= area.maxX && z >= area.minZ && z <= area.maxZ)?.name
    ?? WALK_AREAS[0].name;
}

export function streetHeight(x, z) {
  return footways.some(([left, right, top, bottom]) =>
    x >= left && x <= right && z >= top && z <= bottom) ? PAVING_HEIGHT : 0;
}

function randomSequence(seed) {
  return () => {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function canvasTexture(width, height, paint, repeats = false) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  paint(canvas.getContext('2d'));
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  if (repeats) {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = 4;
  }
  return texture;
}

function makeAsphalt() {
  return canvasTexture(512, 512, (ctx) => {
    const rand = randomSequence(6843);
    const pixels = ctx.createImageData(512, 512);
    for (let z = 0; z < 512; z++) {
      for (let x = 0; x < 512; x++) {
        const i = (z * 512 + x) * 4;
        const patch = 4 * Math.sin(x * Math.PI / 64) * Math.cos(z * Math.PI / 128)
          + 3 * Math.cos((x + z) * Math.PI / 128);
        const grit = Math.pow(rand(), 3) * 41 - rand() * 13;
        const grey = 59 + patch + grit;
        pixels.data.set([grey, grey + 2, grey + 5, 255], i);
      }
    }
    ctx.putImageData(pixels, 0, 0);
  }, true);
}

function makePavers() {
  return canvasTexture(384, 384, (ctx) => {
    const rand = randomSequence(198);
    ctx.fillStyle = '#303038';
    ctx.fillRect(0, 0, 384, 384);
    for (let row = 0; row < 12; row++) {
      for (let col = -1; col < 6; col++) {
        const x = col * 64 + (row % 2) * 32;
        const y = row * 32;
        const grey = 79 + Math.floor(rand() * 17);
        ctx.fillStyle = `rgb(${grey + 5},${grey + 3},${grey})`;
        ctx.fillRect(x + 1, y + 1, 62, 30);
        ctx.fillStyle = 'rgba(214,208,198,0.19)';
        ctx.fillRect(x + 2, y + 1, 60, 1);
        for (let i = 0; i < 55; i++) {
          ctx.fillStyle = rand() > 0.5 ? '#ddd2be22' : '#261b1b22';
          ctx.fillRect(x + 2 + rand() * 59, y + 2 + rand() * 27, 1 + rand() * 2, 1);
        }
      }
    }
  }, true);
}

function horizontalSurface(parent, material, left, right, top, bottom, y, period) {
  const geometry = new THREE.PlaneGeometry(right - left, bottom - top);
  geometry.rotateX(-Math.PI / 2);
  geometry.translate((right + left) / 2, y, (top + bottom) / 2);
  const uv = geometry.attributes.uv;
  const pos = geometry.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / period, -pos.getZ(i) / period);
  const mesh = new THREE.Mesh(geometry, material);
  parent.add(mesh);
  return mesh;
}

function batchPlanes(parent, mat, pieces) {
  const planes = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), mat, pieces.length);
  const stamp = new THREE.Object3D();
  stamp.rotation.x = -Math.PI / 2;
  pieces.forEach(([x, z, w, d, y], index) => {
    stamp.position.set(x, y, z);
    stamp.scale.set(w, d, 1);
    stamp.updateMatrix();
    planes.setMatrixAt(index, stamp.matrix);
  });
  parent.add(planes);
}

export function buildStreetGround(parent, diffuse = makeAsphalt()) {
  const asphalt = new THREE.MeshStandardMaterial({
    map: diffuse, bumpMap: diffuse, bumpScale: 0.034, color: 0x9e9aa2, roughness: 0.69, metalness: 0.02,
  });
  horizontalSurface(parent, asphalt, -95, 95, -95, 95, 0, 4.45);
  const paverMap = makePavers();
  const pavers = new THREE.MeshStandardMaterial({ map: paverMap, roughness: 0.82 });
  const curbMat = new THREE.MeshStandardMaterial({ map: paverMap, color: 0xc5bcb0, roughness: 0.88 });
  for (const [left, right, top, bottom] of footways) {
    horizontalSurface(parent, pavers, left, right, top, bottom, PAVING_HEIGHT, 3.0);
    const curb = new THREE.Mesh(new THREE.BoxGeometry(right - left, PAVING_HEIGHT - 0.003, bottom - top), curbMat);
    curb.position.set((left + right) / 2, PAVING_HEIGHT / 2 - 0.002, (top + bottom) / 2);
    parent.add(curb);
  }

  const yellow = [];
  for (let z = 22; z > -28; z -= 3.65) {
    if (z > -11.8 && z < 2.3) continue;
    yellow.push([0, z, 0.107, 1.48, 0.009]);
  }
  for (const x of [-16.9, -13.2, -9.5, 9.5, 13.2, 16]) yellow.push([x, -3.78, 1.48, 0.107, 0.009]);
  batchPlanes(parent, new THREE.MeshStandardMaterial({ color: 0x967340, roughness: 0.95 }), yellow);

  const white = [];
  for (const z of [0.29, -7.7, -24.8]) {
    for (let x = -2.30; x <= 2.31; x += 0.92) white.push([x, z, 0.41, 1.06, 0.011]);
  }
  for (const x of [-3.97, 3.97]) {
    for (let z = -6.25; z <= -1.2; z += 0.82) white.push([x, z, 1.28, 0.46, 0.011]);
  }
  batchPlanes(parent, new THREE.MeshStandardMaterial({ color: 0x9a9291, roughness: 0.95 }), white);

  const drains = canvasTexture(128, 64, (ctx) => {
    ctx.fillStyle = '#534943';
    ctx.fillRect(0, 0, 128, 64);
    ctx.strokeStyle = '#9b8675';
    ctx.strokeRect(4, 4, 120, 56);
    ctx.fillStyle = '#22202a';
    for (let n = 10; n < 118; n += 9) ctx.fillRect(n, 10, 4, 44);
  });
  const covers = [];
  for (const x of [-2.79, 2.79]) {
    for (const z of [18, 9.3, 2.7, -10.6, -20.5, -28.4]) covers.push([x, z, 0.31, 0.62, 0.012]);
  }
  batchPlanes(parent, new THREE.MeshStandardMaterial({ map: drains, roughness: 0.7 }), covers);
  return diffuse;
}

export function buildNightSky(parent) {
  const map = canvasTexture(1024, 512, (ctx) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    for (const [at, color] of [[0, '#050a1c'], [0.30, '#142043'], [0.49, '#364365'], [0.58, '#352c46'], [0.74, '#140d22'], [1, '#140d22']]) {
      gradient.addColorStop(at, color);
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1024, 512);
    const rand = randomSequence(250);
    // Overlapping, low-contrast clouds break up the twilight above the buildings.
    for (let i = 0; i < 46; i++) {
      const x = rand() * 1024, y = 124 + rand() * 143;
      const width = 52 + rand() * 132, height = 9 + rand() * 20;
      for (const wrap of [-1024, 0, 1024]) {
        ctx.save();
        ctx.translate(x + wrap, y);
        ctx.scale(width, height);
        const shadow = ctx.createRadialGradient(0, 0, 0.20, 0, 0, 1);
        shadow.addColorStop(0, '#070b1c57');
        shadow.addColorStop(0.55, '#0a0d2444');
        shadow.addColorStop(1, '#0a0d2400');
        ctx.fillStyle = shadow;
        ctx.fillRect(-1, -1, 2, 2);
        ctx.restore();
      }
    }
    for (let i = 0; i < 68; i++) {
      const x = rand() * 1022, y = 18 + rand() * 172;
      ctx.fillStyle = `rgba(225,231,255,${rand() * 0.29})`;
      ctx.fillRect(x, y, 1, 1);
    }
    const moonX = 257, moonY = 189;
    const glow = ctx.createRadialGradient(moonX, moonY, 2, moonX, moonY, 54);
    glow.addColorStop(0, '#d0c9fa66');
    glow.addColorStop(1, '#d0c9fa00');
    ctx.fillStyle = glow;
    ctx.fillRect(moonX - 54, moonY - 54, 108, 108);
    ctx.fillStyle = '#cbc7df';
    ctx.beginPath();
    ctx.arc(moonX, moonY, 3.7, 0, Math.PI * 2);
    ctx.fill();
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(102, 48, 24), new THREE.MeshBasicMaterial({
    map, side: THREE.BackSide, fog: false, depthWrite: false, toneMapped: false,
  }));
  sky.position.z = -7;
  sky.renderOrder = -1;
  parent.add(sky);
  return sky;
}

export function makeStreetLighting(parent) {
  const poolMap = canvasTexture(64, 64, (ctx) => {
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 31);
    gradient.addColorStop(0, '#ffffffa0');
    gradient.addColorStop(0.35, '#ffffff4a');
    gradient.addColorStop(0.7, '#ffffff16');
    gradient.addColorStop(1, '#ffffff00');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
  });
  function stamp(x, z, width, depth, material) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, streetHeight(x, z) + 0.012, z);
    parent.add(mesh);
    return mesh;
  }

  return {
    lightPool(x, z, width, depth, color, opacity = 0.32) {
      return stamp(x, z, width, depth, new THREE.MeshBasicMaterial({
        map: poolMap, color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending,
      }));
    },
    contactShadow(x, z, width, depth, opacity) {
      const shadow = stamp(x, z, width, depth, new THREE.MeshBasicMaterial({
        map: poolMap, color: 0x000000, transparent: true, opacity, depthWrite: false,
      }));
      shadow.position.y += 0.004;
      shadow.renderOrder = 1;
      return shadow;
    },
  };
}
