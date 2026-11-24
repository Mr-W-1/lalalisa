import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';

const REFLECTION_LAYER = 2;

export function reflectInStreet(object) {
  object.traverse((child) => child.layers.enable(REFLECTION_LAYER));
  return object;
}

function surfaceTexture(width, height, paint, tiled = false) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  paint(canvas.getContext('2d'));
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  if (tiled) texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

function atlasTiles(image) {
  const half = Math.floor(image.width * 0.5);
  return (column, row, tiled = false) => surfaceTexture(512, 512, (ctx) => {
    // The neighboring texels belong to a different material.
    ctx.drawImage(image, column * half + 3, row * half + 3, half - 6, half - 6, 0, 0, 512, 512);
  }, tiled);
}

function illuminatedAreas(image, tiled = false, strength = 1) {
  const width = 512, height = Math.max(1, Math.round(image.height / image.width * width));
  return surfaceTexture(width, height, (ctx) => {
    ctx.drawImage(image, 0, 0, width, height);
    const mask = ctx.getImageData(0, 0, width, height);
    const pixels = mask.data;
    for (let i = 0; i < pixels.length; i += 4) {
      const red = pixels[i], green = pixels[i + 1], blue = pixels[i + 2];
      const amber = Math.min((red - 100) / 125, (red - blue - 40) / 95, (green - 39) / 120);
      const pink = Math.min((red - 165) / 90, (blue - 65) / 145, (red - green - 30) / 105);
      const light = Math.max(0, Math.min(1, Math.max(amber, pink) * strength));
      pixels[i] = red * light;
      pixels[i + 1] = green * light;
      pixels[i + 2] = blue * light;
    }
    ctx.putImageData(mask, 0, 0);
  }, tiled);
}

export async function loadNightSurfaces(loader) {
  const asset = './assets/bangkok/district/';
  const [atlas, shophouses, theatre, jennie] = await Promise.all([
    loader.loadAsync(asset + 'night-surfaces.webp'),
    loader.loadAsync(asset + 'night-shophouses.webp').catch(() => null),
    loader.loadAsync(asset + 'lisa-theatre.webp').catch(() => null),
    loader.loadAsync(asset + 'jennie-theatre.webp').catch(() => null),
  ]);
  const tile = atlasTiles(atlas.image);
  const windows = tile(1, 1, true);
  const shops = shophouses ? atlasTiles(shophouses.image) : null;
  function theatreMaterials(map) {
    if (!map) return null;
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 4;
    return { map, emit: illuminatedAreas(map.image, false, 1.4) };
  }
  return {
    asphalt: tile(0, 0, true),
    plaster: tile(1, 0, true),
    storefront: tile(0, 1),
    windows,
    windowsLit: illuminatedAreas(windows.image, true, 1.31),
    facades: shops ? [shops(0, 0), shops(1, 0), shops(0, 1), shops(1, 1)].map((map) => ({
      map, emit: illuminatedAreas(map.image, false, 1.15),
    })) : [],
    theatre: theatreMaterials(theatre),
    jennie: theatreMaterials(jennie),
  };
}

export function buildWetRoad(parent, asphalt) {
  const reflector = new Reflector(new THREE.PlaneGeometry(188, 188), {
    textureWidth: 340,
    textureHeight: 280,
    multisample: 0,
    clipBias: 0.0005,
    shader: {
      name: 'Wet asphalt',
      uniforms: {
        color: { value: null },
        tDiffuse: { value: null },
        textureMatrix: { value: null },
        grit: { value: null },
      },
      vertexShader: `
        uniform mat4 textureMatrix;
        varying vec4 vReflected;
        varying vec3 vWorld;
        void main() {
          vReflected = textureMatrix * vec4(position, 1.0);
          vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform sampler2D grit;
        varying vec4 vReflected;
        varying vec3 vWorld;
        void main() {
          vec2 street = vWorld.xz;
          float stone = texture2D(grit, street * 0.85).g;
          float large = sin(street.x * 1.44 + sin(street.y * 0.69)) *
                        cos(street.y * 1.30 - sin(street.x * 1.7));
          float wash = texture2D(grit, street * 1.93 + vec2(0.36, 0.54)).g;
          float ripples = sin(street.y * 38.0 + wash * 10.0) * 0.5 + 0.5;
          float wetness = smoothstep(0.01, 0.7, large + (stone - 0.28) * 1.42);
          vec2 uv = vReflected.xy / vReflected.w;
          float jitter = (stone - 0.33) * 0.013;
          vec2 offset = vec2(jitter * (0.65 + ripples), (ripples * wash - 0.12) * 0.019);
          vec3 reflected = texture2D(tDiffuse, uv + offset).rgb * 0.68;
          reflected += texture2D(tDiffuse, uv - offset * 0.9).rgb * 0.32;
          float grazing = 1.0 - max(0.0, normalize(cameraPosition - vWorld).y);
          float fade = 1.0 - smoothstep(52.0, 82.0, distance(cameraPosition, vWorld));
          float brightness = clamp(max(reflected.r, max(reflected.g, reflected.b)), 0.0, 1.0);
          float opacity = (0.10 + wetness * 0.49) * (0.24 + grazing * 0.76);
          gl_FragColor = vec4(reflected * 1.14, opacity * fade * (0.53 + brightness * 0.47));
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    },
  });

  reflector.name = 'Wet road reflection';
  reflector.rotation.x = -Math.PI * 0.5;
  reflector.position.y = 0.006;
  reflector.material.uniforms.grit.value = asphalt;
  reflector.material.transparent = true;
  reflector.material.depthWrite = false;
  reflector.camera.layers.set(REFLECTION_LAYER);

  const updateReflection = reflector.onBeforeRender;
  const lastView = new THREE.Matrix4();
  const lastProjection = new THREE.Matrix4();
  let lastUpdate = -Infinity;
  let checkedCapabilities = false;
  reflector.onBeforeRender = function (renderer, scene, camera) {
    if (!checkedCapabilities) {
      if (!renderer.extensions.has('EXT_color_buffer_float')
        && !renderer.extensions.has('EXT_color_buffer_half_float')) {
        reflector.getRenderTarget().texture.type = THREE.UnsignedByteType;
      }
      checkedCapabilities = true;
    }
    const now = performance.now();
    const viewChanged = camera.matrixWorld.elements.some((n, i) => Math.abs(n - lastView.elements[i]) > 0.032);
    const projectionChanged = !lastProjection.equals(camera.projectionMatrix);
    if (now - lastUpdate < 65 || (!viewChanged && !projectionChanged)) return;
    updateReflection.call(this, renderer, scene, camera);
    lastView.copy(camera.matrixWorld);
    lastProjection.copy(camera.projectionMatrix);
    lastUpdate = now;
  };
  parent.add(reflector);
}

export function skinSkyline(source, surfaces) {
  source.updateMatrixWorld(true);
  const wall = new THREE.MeshStandardMaterial({
    color: 0xa9b3cb, map: surfaces.windows,
    emissive: 0xffe5cb, emissiveMap: surfaces.windowsLit, emissiveIntensity: 0.87, roughness: 0.88,
  });
  const roofs = new THREE.MeshStandardMaterial({ color: 0x61708a, map: surfaces.plaster, roughness: 0.89 });
  const position = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const matrix = new THREE.Matrix3();
  const discard = [];
  source.traverse((object) => {
    if (!object.isMesh) return;
    const bounds = new THREE.Box3().setFromObject(object, true);
    if (bounds.max.y < 1.0) {
      discard.push(object);
      return;
    }

    const materialName = object.material.name;
    const isStructure = ['Meshpart7Mtl', 'Meshpart8Mtl', 'Meshpart13Mtl', 'Meshpart14Mtl',
      'Meshpart15Mtl', 'Meshpart16Mtl', 'Meshpart23Mtl', 'Meshpart26Mtl', 'Meshpart28Mtl'].includes(materialName);
    if (!isStructure) {
      if (object.material.emissive?.getHex() === 0) {
        object.material.color.multiplyScalar(0.55);
        object.material.roughness = 0.85;
      }
      return;
    }

    const geometry = object.geometry.clone().toNonIndexed();
    const { position: vertices, normal: normals } = geometry.attributes;
    const uv = new Float32Array(vertices.count * 2);
    matrix.getNormalMatrix(object.matrixWorld);
    for (let i = 0; i < vertices.count; i += 3) {
      normal.fromBufferAttribute(normals, i).applyNormalMatrix(matrix);
      const roof = Math.abs(normal.y) > 0.64;
      geometry.addGroup(i, 3, roof ? 1 : 0);
      for (let j = i; j < i + 3; j++) {
        position.fromBufferAttribute(vertices, j).applyMatrix4(object.matrixWorld);
        uv[j * 2] = (Math.abs(normal.x) > Math.abs(normal.z) ? position.z : position.x) / 0.80;
        uv[j * 2 + 1] = (roof ? position.z : position.y) / 1.13;
      }
    }
    geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));

    // Keep roofs and façades in two draw calls per model part.
    const side = [], top = [];
    for (const group of geometry.groups) {
      (group.materialIndex ? top : side).push(group.start, group.start + 1, group.start + 2);
    }
    geometry.clearGroups();
    geometry.setIndex([...side, ...top]);
    geometry.addGroup(0, side.length, 0);
    geometry.addGroup(side.length, top.length, 1);
    object.geometry = geometry;
    object.material = [wall, roofs];
  });
  for (const object of discard) object.removeFromParent();
}

const unitBox = new THREE.BoxGeometry(1, 1, 1);

function box(parent, material, dimensions, position) {
  const materialsPerFace = Array.isArray(material);
  const mesh = new THREE.Mesh(materialsPerFace ? new THREE.BoxGeometry(...dimensions) : unitBox, material);
  if (!materialsPerFace) mesh.scale.set(...dimensions);
  mesh.position.set(...position);
  parent.add(mesh);
  return mesh;
}

const signTextures = new Map();

function signFace(lines, background, outline, portrait) {
  const key = JSON.stringify([lines, background, outline, Boolean(portrait)]);
  const cached = signTextures.get(key);
  if (cached) return cached;
  const texture = surfaceTexture(portrait ? 256 : 512, portrait ? 512 : 160, (ctx) => {
    const { width, height } = ctx.canvas;
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = outline;
    ctx.lineWidth = 7;
    ctx.shadowColor = outline;
    ctx.shadowBlur = 14;
    ctx.strokeRect(13, 13, width - 26, height - 26);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    lines.forEach(([line, color, size], index) => {
      ctx.fillStyle = color;
      ctx.font = `700 ${size}px system-ui, sans-serif`;
      ctx.fillText(line, width / 2, (index + 1) * height / (lines.length + 1), width - 52);
    });
  });
  signTextures.set(key, texture);
  return texture;
}

function projectingSign(parent, lines, background, accent, x = 1.02, y = 3.58) {
  const sign = new THREE.Group();
  sign.position.set(x, y, -0.38);
  const steel = new THREE.MeshStandardMaterial({ color: 0x38252b, roughness: 0.65 });
  box(sign, steel, [0.10, 1.77, 0.81], [0, 0, 0.28]);
  for (const level of [-0.58, 0.58]) {
    box(sign, steel, [0.06, 0.065, 0.66], [0, level, -0.17]);
  }
  const map = signFace(lines, background, accent, true);
  const front = new THREE.MeshBasicMaterial({ map, color: new THREE.Color(0xffffff).multiplyScalar(1.72) });
  for (const side of [-1, 1]) {
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.76, 1.71), front);
    face.rotation.y = side * Math.PI / 2;
    face.position.set(side * 0.053, 0, 0.28);
    sign.add(face);
  }
  parent.add(sign);
}

const tallSignStyles = [
  { text: ['เยาวราช', '茶樓'], background: '#c43c15', ink: '#fff1be', trim: '#ffb641', format: 'wide' },
  { text: ['金', '記', '茶', '室'], background: '#edaa30', ink: '#77261a', trim: '#ffe78a', format: 'stack' },
  { text: ['กลางคืน', 'NIGHT MARKET'], background: '#a51b29', ink: '#fff0e3', trim: '#ff5345', format: 'blade' },
  { text: ['ร้านชา', 'TEA ROOM'], background: '#126d8e', ink: '#f2fcf4', trim: '#8ae6ff', format: 'wide' },
  { text: ['ขนมหวาน', '甜品'], background: '#a0362b', ink: '#fff2c2', trim: '#ff754c', format: 'wide' },
  { text: ['夜', '市'], background: '#c98819', ink: '#6a2717', trim: '#ffe171', format: 'stack' },
  { text: ['แผ่นเสียง', 'RECORDS'], background: '#ad284f', ink: '#fff1f7', trim: '#ff76a2', format: 'blade' },
  { text: ['บะหมี่', 'NOODLES'], background: '#9c352b', ink: '#fff2c8', trim: '#ffd05c', format: 'wide' },
];

function cabinetSign(parent, steel, style, x, y, depth, height) {
  const position = 0.19 + depth / 2;
  const boxSign = box(parent, steel, [0.123, height, depth], [x, y, position]);
  boxSign.name = 'Projecting commercial sign';
  for (const offset of [-0.31, 0.31]) {
    box(parent, steel, [0.044, 0.049, depth * 0.69 + 0.91], [x, y + height * offset, depth * 0.19 - 0.32]);
  }
  const portrait = style.format !== 'wide';
  const key = `cabinet-${style.text.join('-')}`;
  let map = signTextures.get(key);
  if (!map) {
    map = surfaceTexture(portrait ? 192 : 384, portrait ? 448 : 160, (ctx) => {
      const { width, height: h } = ctx.canvas;
      ctx.fillStyle = style.background;
      ctx.fillRect(0, 0, width, h);
      const glow = ctx.createRadialGradient(width * 0.48, h * 0.40, 9, width * 0.48, h * 0.49, h * 0.66);
      glow.addColorStop(0, '#fff1bf69');
      glow.addColorStop(0.6, '#ffde9220');
      glow.addColorStop(1, '#180d162f');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, h);
      ctx.strokeStyle = style.trim;
      ctx.lineWidth = 7;
      ctx.strokeRect(7, 7, width - 14, h - 14);
      ctx.strokeStyle = '#310a2269';
      ctx.lineWidth = 2;
      ctx.strokeRect(18, 18, width - 36, h - 36);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      style.text.forEach((line, i) => {
        const y = h * (i + 0.52) / style.text.length;
        if (i > 0 && style.format === 'stack') {
          ctx.fillStyle = '#5b311b';
          ctx.fillRect(8, h * i / style.text.length - 3, width - 16, 6);
        }
        ctx.fillStyle = style.ink;
        const size = style.format === 'stack' ? 73 : (i ? 34 : 61);
        ctx.font = `800 ${size}px system-ui, sans-serif`;
        ctx.fillText(line, width * 0.5, y, width - 35);
      });
    });
    signTextures.set(key, map);
  }
  const mat = new THREE.MeshBasicMaterial({ map, color: new THREE.Color(0xffffff).multiplyScalar(1.6) });
  const geometry = new THREE.PlaneGeometry(depth - 0.06, height - 0.04);
  for (const side of [-1, 1]) {
    const face = new THREE.Mesh(geometry, mat);
    face.position.set(x + side * 0.064, y, position);
    face.rotation.y = side * Math.PI / 2;
    parent.add(face);
  }
}

function shutterTexture() {
  return surfaceTexture(256, 256, (ctx) => {
    ctx.fillStyle = '#3a2930';
    ctx.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 9) {
      ctx.fillStyle = '#7b645a';
      ctx.fillRect(0, y, 256, 1);
      ctx.fillStyle = '#19121b';
      ctx.fillRect(0, y + 5, 256, 3);
    }
    for (let i = 0; i < 230; i++) {
      ctx.fillStyle = i % 3 ? '#c2997440' : '#16101e70';
      ctx.fillRect((i * 103) % 256, (i * 173) % 256, 1 + i % 4, 1 + i % 3);
    }
  });
}

function clothTexture(color) {
  return surfaceTexture(192, 192, (ctx) => {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 192, 192);
    for (let i = 0; i < 192; i += 3) {
      ctx.fillStyle = i % 9 === 0 ? '#eab08732' : '#200c1f35';
      ctx.fillRect(i, 0, 1, 192);
      ctx.fillRect(0, i, 192, 1);
    }
    for (let i = 12; i < 192; i += 35) {
      ctx.fillStyle = '#f1bd8d3d';
      ctx.fillRect(i, 0, 1, 192);
    }
  }, true);
}

function awning(parent, canvasColor, width) {
  const fabric = new THREE.MeshStandardMaterial({
    map: clothTexture(canvasColor), roughness: 0.83, side: THREE.DoubleSide,
  });
  const roof = new THREE.Mesh(new THREE.PlaneGeometry(width, 1.84), fabric);
  roof.rotation.x = -Math.PI * 0.5 + 0.23;
  roof.position.set(0, 2.62, 0.15);
  parent.add(roof);
  const folds = new THREE.Shape();
  folds.moveTo(-width / 2, 0);
  folds.lineTo(width / 2, 0);
  for (let i = 0; i < 9; i++) {
    const edge = width / 2 - i * width / 9;
    folds.lineTo(edge, -0.18);
    folds.quadraticCurveTo(edge - width / 18, -0.32, edge - width / 9, -0.181);
  }
  folds.closePath();
  const valance = new THREE.Mesh(new THREE.ShapeGeometry(folds), fabric);
  valance.position.set(0, 2.41, 1.05);
  parent.add(valance);
}

const MARKET = [
  {
    id: 'noodle-stall', title: 'Noodle stall', x: -4.85, z: 9.7, yaw: Math.PI / 2,
    canvas: '#852629', body: 0x803e2c, sign: '#2e0c14', neon: '#ff4946', light: 0xff9e55,
    text: ['ก๋วยเตี๋ยว', 'NOODLES'], blade: '麵',
  },
  {
    id: 'tea-house', title: 'Tea house', x: 4.91, z: 7.8, yaw: -Math.PI / 2,
    canvas: '#245846', body: 0x2c5655, sign: '#0b252a', neon: '#4df5ce', light: 0xffb76a,
    text: ['ชาร้อน', 'HOT TEA'], blade: '茶',
  },
  {
    id: 'late-kitchen', title: 'Late kitchen', x: -4.89, z: -13.05, yaw: Math.PI / 2,
    canvas: '#66353b', body: 0x7b483a, sign: '#280c14', neon: '#ff5679', light: 0xffad68,
    text: ['ข้าวต้ม', 'RICE SOUP'], blade: '粥',
  },
  {
    id: 'yaowarat-grill', title: 'Yaowarat grill', x: 4.92, z: -22.5, yaw: -Math.PI / 2,
    canvas: '#694331', body: 0x6a493f, sign: '#2b1712', neon: '#ffb145', light: 0xffaf68,
    text: ['เยาวราช', 'YAOWARAT GRILL'], blade: '夜市',
  },
  {
    id: 'west-cafe', title: 'West branch café', x: -14.3, z: -8.95, yaw: 0,
    canvas: '#6d242a', body: 0x623332, sign: '#280c1a', neon: '#ff5949', light: 0xffa65c,
    text: ['อาหารตามสั่ง', 'NIGHT KITCHEN'], blade: '開',
  },
  {
    id: 'moonlight-counter', title: 'Moonlight counter', x: 12.15, z: 1.80, yaw: Math.PI,
    canvas: '#453160', body: 0x4d4061, sign: '#20142b', neon: '#cd74ff', light: 0xffa6b9,
    text: ['ชาร้อน', 'MOONLIGHT TEA'], blade: '茶',
  },
];

export function buildStreetMarket(parent, surfaces, streetHeight, lightPool) {
  const metal = new THREE.MeshStandardMaterial({ color: 0x94918b, metalness: 0.64, roughness: 0.41 });
  const bowl = new THREE.CylinderGeometry(0.15, 0.095, 0.115, 12, 1, true);
  const lid = new THREE.CylinderGeometry(0.157, 0.14, 0.025, 12);
  const bottle = new THREE.CylinderGeometry(0.029, 0.038, 0.15, 8);
  const plaster = surfaces.plaster;
  const wornWood = new THREE.MeshStandardMaterial({ color: 0x7b4e3f, map: plaster, roughness: 0.76 });
  const warm = new THREE.MeshStandardMaterial({
    color: 0xffc597, emissive: 0xffab67, emissiveIntensity: 2.8, roughness: 0.32,
  });
  const fixtures = [];
  for (const [index, spec] of MARKET.entries()) {
    const kiosk = new THREE.Group();
    kiosk.name = spec.title;
    kiosk.position.set(spec.x, streetHeight(spec.x, spec.z), spec.z);
    kiosk.rotation.y = spec.yaw;
    parent.add(kiosk);

    const wall = new THREE.MeshStandardMaterial({
      map: plaster, color: spec.body, roughness: 0.82,
    });
    const shopPhoto = new THREE.MeshStandardMaterial({
      map: surfaces.storefront, color: 0xf4d9c7, roughness: 0.77,
      emissive: 0xffc08a, emissiveMap: surfaces.storefront, emissiveIntensity: 0.52,
    });
    box(kiosk, wall, [2.67, 2.72, 0.44], [0, 1.36, -0.55]);
    const photo = new THREE.Mesh(new THREE.PlaneGeometry(2.49, 2.52), shopPhoto);
    photo.position.set(0, 1.35, -0.325);
    kiosk.add(photo);

    for (const x of [-1.29, 1.29]) box(kiosk, wornWood, [0.075, 2.63, 0.08], [x, 1.35, 0.88]);
    awning(kiosk, spec.canvas, 2.81);
    box(kiosk, wall, [2.42, 0.8, 0.54], [0, 0.42, 0.46]);
    box(kiosk, metal, [2.54, 0.064, 0.67], [0, 0.86, 0.48]);
    for (const x of [-0.82, -0.47, -0.1]) {
      const pot = new THREE.Mesh(bowl, metal);
      pot.position.set(x, 0.94, 0.53);
      kiosk.add(pot);
      if (x < -0.5) {
        const cover = new THREE.Mesh(lid, metal);
        cover.position.set(x, 1.006, 0.53);
        kiosk.add(cover);
      }
    }
    for (let j = 0; j < 4; j++) {
      const material = new THREE.MeshStandardMaterial({
        color: [0x9a3f21, 0x694318, 0xdfaf68, 0x2b443a][j],
        roughness: 0.42,
      });
      const sauce = new THREE.Mesh(bottle, material);
      sauce.position.set(0.51 + j * 0.106, 0.966, 0.59 - (j % 2) * 0.12);
      kiosk.add(sauce);
    }

    const banner = signFace([
      [spec.text[0], '#fff1c2', 48],
      [spec.text[1], '#ffedcf', 25],
    ], spec.sign, spec.neon, false);
    box(kiosk, wornWood, [2.57, 0.57, 0.12], [0, 2.82, -0.13]);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.51, 0.54), new THREE.MeshBasicMaterial({
      map: banner, color: new THREE.Color(0xffffff).multiplyScalar(1.8),
    }));
    sign.position.set(0, 2.82, -0.064);
    kiosk.add(sign);
    projectingSign(kiosk, [[spec.blade, '#fff6c6', 110], [spec.text[1], '#fff3cb', 32]], spec.sign, spec.neon);
    reflectInStreet(kiosk);

    box(kiosk, warm, [1.88, 0.036, 0.045], [0, 2.31, 0.38]).layers.enable(REFLECTION_LAYER);

    if (index % 2 === 0) {
      const lamp = new THREE.PointLight(spec.light, 14.0, 9.5, 2.0);
      lamp.position.set(0, 2.30, 1.03);
      kiosk.add(lamp);
    }
    const onStreet = new THREE.Vector3(0, 0, 1.54).applyAxisAngle(new THREE.Vector3(0, 1, 0), spec.yaw);
    lightPool(spec.x + onStreet.x, spec.z + onStreet.z, 4.6, 5.1, spec.light, 0.46);
    if (index % 2 === 0) {
      const smallSign = signFace([['เปิด', '#ffdda8', 87]], '#351015', '#ff426f', false);
      const board = new THREE.Mesh(new THREE.PlaneGeometry(0.54, 0.17), new THREE.MeshBasicMaterial({
        map: smallSign, color: new THREE.Color(0xffffff).multiplyScalar(2.1),
      }));
      board.position.set(0.82, 1.87, -0.18);
      kiosk.add(board);
      reflectInStreet(board);
    }
    fixtures.push({ id: spec.id, label: spec.title, node: kiosk });
  }
  return fixtures;
}

const CABLES = [
  [-4.97, 5.01, 14.6, 5.42, 0.94],
  [-5.01, 5.01, 3.75, 5.96, 1.04],
  [-5.04, 5.04, -11.0, 5.55, 0.92],
  [-5.03, 5.03, -21.2, 5.84, 1.12],
  [-5.09, 5.09, -29.55, 6.33, 0.89],
];

export function buildStreetFestoons(parent, streetHeight, lightPool) {
  const arch = new THREE.Group();
  arch.name = 'String lights and mounting posts';
  parent.add(arch);

  const steel = new THREE.MeshStandardMaterial({ color: 0x3f332f, roughness: 0.66 });
  const warm = new THREE.MeshStandardMaterial({
    color: 0xffe5bd, emissive: 0xffad5c, emissiveIntensity: 3.3, roughness: 0.30,
  });
  const sockets = [];
  const bulbs = [];
  const strand = (from, to, dip, count) => {
    const middle = from.clone().lerp(to, 0.5);
    middle.y -= dip * 2;
    const curve = new THREE.QuadraticBezierCurve3(from, middle, to);
    arch.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.016, 4, false), steel));
    for (let i = 1; i <= count; i++) {
      const p = curve.getPoint(i / (count + 1));
      sockets.push(p.clone().add(new THREE.Vector3(0, -0.056, 0)));
      bulbs.push(p.clone().add(new THREE.Vector3(0, -0.144, 0)));
    }
  };

  for (const [left, right, z, h, dip] of CABLES) {
    for (const x of [left, right]) {
      const base = streetHeight(x, z);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.08, h - base, 8), steel);
      pole.position.set(x, (h + base) * 0.5, z);
      arch.add(pole);
      box(arch, steel, [0.18, 0.2, 0.16], [x, h - 0.1, z]);
    }
    strand(new THREE.Vector3(left, h, z), new THREE.Vector3(right, h - 0.16, z), dip, 8);
    lightPool(0, z - 0.45, 6.4, 5.5, 0xffa85a, 0.14);
  }

  for (const [x, accent] of [[-17.1, 0xff6051], [17.1, 0xca75ff]]) {
    const front = -8.0, back = 1.18, h = 4.8;
    for (const z of [front, back]) {
      const base = streetHeight(x, z);
      const support = new THREE.Mesh(new THREE.CylinderGeometry(0.047, 0.068, h - base, 8), steel);
      support.position.set(x, (h + base) / 2, z);
      arch.add(support);
    }
    strand(new THREE.Vector3(x, h, front), new THREE.Vector3(x, h, back), 0.75, 7);
    lightPool(x, -3.55, 5.5, 6.2, accent, 0.20);
  }

  function batch(geometry, material, positions) {
    const pieces = new THREE.InstancedMesh(geometry, material, positions.length);
    const transform = new THREE.Matrix4();
    positions.forEach((p, i) => pieces.setMatrixAt(i, transform.makeTranslation(p.x, p.y, p.z)));
    arch.add(pieces);
  }
  batch(new THREE.CylinderGeometry(0.036, 0.042, 0.112, 6), steel, sockets);
  batch(new THREE.SphereGeometry(0.076, 10, 7).scale(0.75, 1.25, 0.75), warm, bulbs);
  reflectInStreet(arch);
}

function mappedPatch(parent, material, x0, x1, y0, y1, bottomDepth, topDepth, u0, u1, v0, v1) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([
    x0, y0, bottomDepth, x1, y0, bottomDepth, x0, y1, topDepth, x1, y1, topDepth,
  ], 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute([u0, v0, u1, v0, u0, v1, u1, v1], 2));
  geometry.setIndex([0, 1, 2, 2, 1, 3]);
  geometry.computeVertexNormals();
  parent.add(new THREE.Mesh(geometry, material));
}

const NEON_NAMES = [
  [['ก๋วยเตี๋ยว', 'บะหมี่', 'ข้าวต้ม', 'เกี๊ยวน้ำ'], '麵', '#ff583a', '#401719'],
  [['ชาร้อน', 'ชาจีน', 'ชาเย็น', 'ชาดอกไม้'], '茶', '#59efbc', '#12291f'],
  [['ดนตรีสด', 'แผ่นเสียง', 'ห้องฟังเพลง', 'คาราโอเกะ'], '音樂', '#ff4f9b', '#30142a'],
  [['เยาวราช', 'บัวลอย', 'ขนมหวาน', 'ขนมปัง'], '夜市', '#ffbd4c', '#372017'],
];

export function buildShophouseFrontages(parent, surfaces, lightPool) {
  if (surfaces.facades.length === 0) return [];
  const buildings = [];
  const wall = new THREE.MeshStandardMaterial({ map: surfaces.plaster, color: 0xe0a389, roughness: 0.87 });
  const steel = new THREE.MeshStandardMaterial({ color: 0x453023, metalness: 0.38, roughness: 0.62 });
  const closedShop = new THREE.MeshStandardMaterial({
    map: shutterTexture(), roughness: 0.67, metalness: 0.21,
  });
  const lanternGlass = new THREE.MeshStandardMaterial({
    color: 0xad1e20, emissive: 0xe63228, emissiveIntensity: 1.02, roughness: 0.50,
  });
  const lanternForm = new THREE.SphereGeometry(0.14, 10, 8).scale(1.0, 0.94, 1.0);
  const upperWindows = new THREE.MeshStandardMaterial({
    map: surfaces.windows, color: 0xd3a294, emissiveMap: surfaces.windowsLit,
    emissive: 0xffbd89, emissiveIntensity: 0.72, roughness: 0.90,
  });
  const facadeMats = surfaces.facades.map(({ map, emit }) => new THREE.MeshStandardMaterial({
    map, color: 0xedc1a7, emissiveMap: emit, emissive: 0xffdbc4, emissiveIntensity: 1.26, roughness: 0.83,
  }));

  const sections = [
    // x, z, size along street, yaw, façade, blade sign
    [-5.20, 21.0, 5.0, Math.PI / 2, 2, true],
    [-5.20, 16.0, 5.0, Math.PI / 2, 0, true],
    [-5.20, 11.0, 5.0, Math.PI / 2, 3, false],
    [-5.20, 6.0, 5.0, Math.PI / 2, 1, true],
    [5.20, 22.1, 5.4, -Math.PI / 2, 0, false],
    [5.20, 16.75, 5.25, -Math.PI / 2, 1, true],
    [5.20, 11.6, 5.05, -Math.PI / 2, 2, false],
    [5.20, 6.50, 5.2, -Math.PI / 2, 3, true],
    [-5.20, -10.65, 5.25, Math.PI / 2, 3, true],
    [-5.20, -16.0, 5.45, Math.PI / 2, 0, false],
    [-5.20, -21.35, 5.25, Math.PI / 2, 2, true],
    [-5.20, -26.6, 5.25, Math.PI / 2, 1, true],
    [5.20, -10.65, 5.25, -Math.PI / 2, 0, true],
    [5.20, -16.0, 5.45, -Math.PI / 2, 2, true],
    [5.20, -21.35, 5.25, -Math.PI / 2, 1, false],
    [5.20, -26.6, 5.25, -Math.PI / 2, 3, true],
    [-11.1, -9.35, 6.3, 0, 0, true],
    [-17.45, -9.35, 6.4, 0, 1, true],
    [11.0, -9.55, 6.25, 0, 2, true],
    [17.45, -9.55, 6.6, 0, 3, true],
    [-13.5, 2.78, 6.8, Math.PI, 2, true],
    [15.6, 2.78, 6.4, Math.PI, 3, true],
    [21.2, 2.79, 4.70, Math.PI, 1, true],
    [22.07, -9.55, 2.57, 0, 2, false],
    [-21.2, 2.79, 4.82, Math.PI, 1, true],
    [-21.95, -9.35, 2.58, 0, 3, false],
  ];

  for (const [i, [x, z, width, yaw, style, blade]] of sections.entries()) {
    const shop = new THREE.Group();
    shop.name = 'Yaowarat Shophouse';
    shop.position.set(x, 0.092, z);
    shop.rotation.y = yaw;
    parent.add(shop);
    const h = [5.20, 6.7, 6.18, 6.53][(i + style) % 4];
    const lo = -width / 2, hi = width / 2;
    const front = facadeMats[style];
    const structure = box(shop, wall, [width, h, 2.07], [0, h / 2, -1.041]);
    box(shop, wall, [width + 0.085, 0.13, 2.19], [0, h - 0.036, -1.029]);
    const upperStorey = [1, 3, 5, 6, 8, 10, 12, 13, 15, 17, 19, 21].includes(i);
    if (upperStorey) {
      const upperWidth = width * (0.80 + i % 3 * 0.07);
      const upperHeight = 2.11 + (i % 3) * 0.27;
      const zFront = -0.22 - (i % 3) * 0.09;
      box(shop, wall, [upperWidth, upperHeight, 1.49], [0, h + upperHeight / 2, zFront - 0.755]);
      const band = 0.25 * (i % 4);
      mappedPatch(shop, upperWindows, -upperWidth * 0.5, upperWidth * 0.5, h + 0.04,
        h + upperHeight - 0.01, zFront, zFront, 0, 1, band, band + 0.25);
      box(shop, steel, [upperWidth + 0.17, 0.10, 1.58], [0, h + upperHeight, zFront - 0.73]);
    }
    if ([3, 7, 8, 12, 16, 20, 21, 23, 25].includes(i)) {
      for (const side of [-1, 1]) {
        const returnWall = new THREE.Group();
        returnWall.position.set(side * (width * 0.5 + 0.01), 0, -1.04);
        returnWall.rotation.y = side * Math.PI / 2;
        shop.add(returnWall);
        mappedPatch(returnWall, front, -1.025, 1.025, 0, h, 0.003, 0.003, 0.066, 0.31, 0, 1);
        box(returnWall, steel, [2.05, 0.07, 0.11], [0, h * 0.666, 0.065]);
      }
    }
    mappedPatch(shop, front, lo, hi, 0, h * 0.415, 0.022, 0.022, 0, 1, 0, 0.415);
    mappedPatch(shop, front, lo, hi, h * 0.415, h * 0.517, 0.71, 0.027, 0, 1, 0.415, 0.517);
    mappedPatch(shop, front, lo, hi, h * 0.517, h, 0.022, 0.022, 0, 1, 0.517, 1);
    box(shop, steel, [width - 0.11, 0.075, 0.68], [0, h * 0.414, 0.37]);
    box(shop, steel, [width * 0.72, 0.075, 0.31], [width * 0.015, h * 0.67, 0.176]);

    // The visible awning and balcony project from the façade and stay detailed at oblique angles.
    for (const side of [-1, 1]) {
      const support = box(shop, steel, [0.041, 0.72, 0.043], [side * (width / 2 - 0.22), h * 0.427, 0.344]);
      support.rotation.x = -0.96;
    }
    const [names, character, neon, background] = NEON_NAMES[style];
    const label = names[Math.floor((i + style * 2) / 3) % names.length];
    const sign = signFace([[label, '#fff1c4', 80]], background, neon, false);
    const signMesh = new THREE.Mesh(new THREE.PlaneGeometry(width * 0.55, h * 0.085), new THREE.MeshBasicMaterial({
      map: sign, color: new THREE.Color(0xffffff).multiplyScalar(1.65),
    }));
    signMesh.position.set(width * 0.055, h * 0.56, 0.055);
    shop.add(signMesh);
    if (blade) {
      const signBase = new THREE.Group();
      signBase.position.set(0, 0.29, 0.28);
      shop.add(signBase);
      projectingSign(signBase, [[character, '#fff1bc', 105], [label, '#ffecbb', 39]],
        background, neon, (i % 2 ? -1 : 1) * width * 0.31, h * 0.66);
    }
    if (i % 4 !== 2 || i < 16) {
      const accent = tallSignStyles[(i * 3 + style + (i > 3 ? 1 : 0)) % tallSignStyles.length];
      const signX = width * (i % 2 ? -0.31 : 0.29);
      const long = accent.format !== 'wide';
      const poleHeight = upperStorey ? h + 0.19 : h * (long ? 0.78 : 0.86);
      cabinetSign(shop, steel, accent, signX, poleHeight,
        long ? 0.80 + (i % 3) * 0.09 : 1.22 + (i % 3) * 0.16,
        long ? 1.59 + (i % 3) * 0.29 : 0.54 + (i % 3) * 0.1);
      if ([1, 5, 7, 10, 12, 15, 18, 20].includes(i)) {
        const partner = tallSignStyles[(i + 3) % tallSignStyles.length];
        cabinetSign(shop, steel, partner, signX + (i % 2 ? 0.76 : -0.72), h * 0.66, 0.85,
          partner.format === 'wide' ? 0.50 : 1.24);
      }
    }
    if ([2, 9, 14, 24].includes(i)) {
      const shutter = new THREE.Mesh(new THREE.PlaneGeometry(width * 0.55, h * 0.376), closedShop);
      shutter.position.set(-width * 0.075, h * 0.195, 0.044);
      shop.add(shutter);
      for (const side of [-1, 1]) {
        box(shop, steel, [0.045, h * 0.39, 0.047], [side * width * 0.275 - width * 0.075, h * 0.193, 0.062]);
      }
    }
    if (i % 4 === 0 || i % 4 === 3) {
      for (const direction of [-1, 1]) {
        const lantern = new THREE.Mesh(lanternForm, lanternGlass);
        lantern.position.set(direction * width * 0.31, h * 0.415 - 0.25, 0.64);
        shop.add(lantern);
        box(shop, steel, [0.021, 0.18, 0.021], [lantern.position.x, lantern.position.y + 0.21, 0.64]);
        box(shop, lanternGlass, [0.043, 0.14, 0.043], [lantern.position.x, lantern.position.y - 0.16, 0.64]);
      }
    }
    if (Math.abs(z) < 23) reflectInStreet(shop);
    if (i % 3 === 0) {
      const stamp = new THREE.Vector3(0, 0, 2.0).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
      lightPool(x + stamp.x, z + stamp.z, 3.05, 4.42, new THREE.Color(neon), 0.16);
    }
    buildings.push({ id: `shophouse_${i + 1}`, node: shop, structure });
  }
  return buildings;
}

export function buildHighRiseLayer(parent, surfaces) {
  const concrete = new THREE.MeshStandardMaterial({ color: 0x8591a7, map: surfaces.plaster, roughness: 0.88 });
  const facade = [0xc4b6ab, 0x91acc7, 0xa6aab8].map((color, i) => new THREE.MeshStandardMaterial({
    map: surfaces.windows, color, emissiveMap: surfaces.windowsLit,
    emissive: i === 1 ? 0xa6d0fb : 0xffdaae, emissiveIntensity: 0.78 + i * 0.13, roughness: 0.77,
  }));
  const mast = new THREE.MeshBasicMaterial({ color: 0xe94761 });
  const sites = [
    [-28, -64, 12.2, 10.3, 37, 0.16, 0],
    [-17, -72, 8.7, 8.0, 43, -0.21, 1],
    [-4, -79, 9.9, 11.3, 31, 0.08, 2],
    [8.5, -75, 9.6, 8.1, 41, 0.18, 0],
    [21.8, -64, 8.7, 12.5, 31, -0.29, 1],
    [34.1, -71, 13.0, 10.4, 36, 0.02, 2],
    [52, -23, 12, 15.6, 35, 0.19, 2],
    [60, -3, 11.3, 8.7, 40, -0.11, 1],
    [51, 13, 10.5, 9.0, 29, -0.33, 0],
    [-54, -18, 11.0, 10.8, 34, 0.21, 1],
    [-59, 0, 7.7, 9.7, 41, -0.12, 2],
    [-52, 13, 12.7, 10.1, 32, 0.36, 0],
    [-16, 55, 11.9, 12.0, 32, -0.18, 1],
    [4, 58, 9.2, 9.0, 41, 0.10, 2],
    [20, 54, 10.3, 12.8, 29, -0.05, 0],
  ];
  function storeys(tower, width, depth, height, y, material, offset) {
    const mesh = box(tower, [material, material, concrete, concrete, material, material],
      [width, height, depth], [0, y + height / 2, 0]);
    const uv = mesh.geometry.attributes.uv;
    for (let i = 0; i < uv.count; i++) {
      if (i >= 8 && i < 16) continue;
      const span = i < 8 ? depth : width;
      uv.setXY(i, uv.getX(i) * span / 7.2 + offset, uv.getY(i) * height / 10.3 + offset * 0.83);
    }
  }

  for (const [i, [x, z, w, d, h, yaw, kind]] of sites.entries()) {
    const tower = new THREE.Group();
    tower.name = 'City tower';
    tower.position.set(x, 0, z);
    tower.rotation.y = yaw;
    parent.add(tower);
    const podium = h * 0.23;
    const upper = h * (0.65 + (i % 3) * 0.025);
    storeys(tower, w, d, podium, 0, facade[kind], i * 0.31);
    box(tower, concrete, [w + 0.38, 0.36, d + 0.38], [0, podium, 0]);
    storeys(tower, w * 0.84, d * 0.83, upper, podium, facade[kind], i * 0.27);
    box(tower, concrete, [w * 0.86, 0.48, d * 0.87], [0, podium + upper, 0]);
    storeys(tower, w * (i % 2 ? 0.52 : 0.65), d * 0.58, h - upper - podium, podium + upper, facade[(kind + 1) % 3], i);
    box(tower, concrete, [w * 0.46, 0.86, d * 0.42], [0.8, h + 0.42, -0.57]);
    if (i % 3 === 1) {
      box(tower, concrete, [0.10, 2.45, 0.10], [0.8, h + 1.95, -0.57]);
      box(tower, mast, [0.16, 0.18, 0.16], [0.8, h + 3.19, -0.57]);
    }
  }
}

export function buildDiningFurniture(parent, streetHeight) {
  const steel = new THREE.MeshStandardMaterial({ color: 0x959189, roughness: 0.41, metalness: 0.48 });
  const paint = new THREE.MeshStandardMaterial({ color: 0x9c2d2c, roughness: 0.66 });
  const ceramic = new THREE.MeshStandardMaterial({ color: 0xdfcfad, roughness: 0.39 });
  const groups = [];
  for (const [x, z, yaw] of [[-4.50, 14.35, Math.PI / 2], [4.49, 5.61, -Math.PI / 2], [-19.25, 0.54, 0]]) {
    const table = new THREE.Group();
    table.name = 'Street dining table';
    table.position.set(x, streetHeight(x, z), z);
    table.rotation.y = yaw;
    parent.add(table);
    box(table, steel, [1.20, 0.055, 0.68], [0, 0.77, 0]);
    for (const side of [-1, 1]) {
      for (const depth of [-1, 1]) {
        box(table, steel, [0.042, 0.74, 0.045], [side * 0.50, 0.37, depth * 0.27]);
      }
      const seat = side * 0.88;
      box(table, paint, [0.35, 0.065, 0.35], [seat, 0.43, 0.03]);
      for (const leg of [-1, 1]) {
        for (const depth of [-1, 1]) {
          const tube = box(table, paint, [0.044, 0.42, 0.047], [seat + leg * 0.122, 0.218, depth * 0.124 + 0.03]);
          tube.rotation.z = leg * 0.098;
        }
      }
    }
    for (const side of [-1, 1]) {
      const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.074, 0.053, 12), ceramic);
      dish.position.set(side * 0.30, 0.823, 0.035);
      table.add(dish);
    }
    reflectInStreet(table);
    groups.push(table);
  }
  return groups;
}

export function balanceNeoStorefront(source) {
  const remove = new Set(['MotionPink', 'Women', 'lase', 'Cylinder__0', 'Banner']);
  const meshes = [];
  source.updateMatrixWorld(true);
  source.traverse((object) => {
    if (!object.isMesh) return;
    const name = object.material.name;
    if (remove.has(name)) {
      meshes.push(object);
    } else if (name === 'Black' || name === 'ArcadeG') {
      const bounds = new THREE.Box3().setFromObject(object, true);
      const width = bounds.max.x - bounds.min.x;
      const height = bounds.max.y - bounds.min.y;
      if (bounds.min.y > 0.5 && height > 0.62 && (name === 'ArcadeG' || width > 1.8)) meshes.push(object);
    }
  });
  for (const mesh of meshes) mesh.removeFromParent();
}

export function buildNeoMarquee(parent, streetHeight, lightPool) {
  const shop = new THREE.Group();
  shop.name = 'Neo Bangkok Marquee';
  shop.position.set(-23.99, streetHeight(-23.99, -3.3), -3.3);
  shop.rotation.y = Math.PI / 2;
  parent.add(shop);
  const arm = new THREE.MeshStandardMaterial({ color: 0x57342c, roughness: 0.74 });
  const glow = new THREE.MeshStandardMaterial({
    color: 0xffa585, emissive: 0xff5c36, emissiveIntensity: 2.8, roughness: 0.5,
  });
  box(shop, arm, [6.55, 0.84, 0.153], [0, 2.63, 0.235]);
  for (const side of [-1, 1]) {
    box(shop, arm, [0.11, 2.45, 0.13], [side * 3.17, 1.23, 0.235]);
    box(shop, glow, [0.021, 1.62, 0.022], [side * 3.17, 1.52, 0.312]);
  }
  const face = signFace([['NEO BANGKOK', '#ffdba3', 67]], '#311519', '#ff553b', false);
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(6.39, 0.74), new THREE.MeshBasicMaterial({
    map: face, color: new THREE.Color(0xffffff).multiplyScalar(1.85),
  }));
  panel.position.set(0, 2.62, 0.318);
  shop.add(panel);
  const lamp = new THREE.PointLight(0xff8450, 22, 10, 2);
  lamp.position.set(0, 2.43, 1.05);
  shop.add(lamp);
  lightPool(-21.65, -3.3, 4.8, 7.4, 0xff7948, 0.36);
  return reflectInStreet(shop);
}

export function buildStreetUtilityLines(parent) {
  const material = new THREE.MeshStandardMaterial({ color: 0x463329, metalness: 0.17, roughness: 0.87 });
  for (const side of [-1, 1]) {
    for (const run of [[22.3, 3.92], [-8.16, -28.5]]) {
      for (let i = 0; i < 3; i++) {
        const height = 3.88 + i * 0.18;
        const points = [];
        for (let j = 0; j <= 12; j++) {
          const fraction = j / 12;
          const bow = Math.sin(fraction * 7 * Math.PI) * (0.09 + i * 0.038);
          points.push(new THREE.Vector3(side * (5.10 - i * 0.036 + bow * 0.2),
            height - bow, THREE.MathUtils.lerp(run[0], run[1], fraction)));
        }
        const route = new THREE.CatmullRomCurve3(points);
        parent.add(new THREE.Mesh(new THREE.TubeGeometry(route, 42, 0.010 + i * 0.002, 4, false), material));
      }
      for (let j = 0; j < 4; j++) {
        const z = THREE.MathUtils.lerp(run[0], run[1], j / 3);
        box(parent, material, [0.26, 0.061, 0.061], [side * 5.12, 4.10, z]);
      }
    }
  }
}

export function buildCurbsideCrates(parent, plaster, streetHeight) {
  const timber = new THREE.MeshStandardMaterial({ color: 0xa27650, map: plaster, roughness: 0.84 });
  const stained = new THREE.MeshStandardMaterial({ color: 0x613d2b, map: plaster, roughness: 0.84 });
  const red = new THREE.MeshStandardMaterial({ color: 0x682725, roughness: 0.77 });
  const groups = [];
  for (const [i, [x, z, angle]] of [
    [-4.62, 20.3, 0.07], [4.55, 18.35, -0.24], [-4.50, 3.67, 0.29],
    [4.55, -18.69, 0.04], [-4.62, -24.71, 0.13], [13.89, -7.8, 0.00],
  ].entries()) {
    const pile = new THREE.Group();
    pile.name = 'Curbside crates';
    pile.position.set(x, streetHeight(x, z), z);
    pile.rotation.y = angle;
    parent.add(pile);
    for (let j = 0; j < (i % 2 ? 2 : 3); j++) {
      const crate = new THREE.Group();
      crate.position.set((j % 2) * 0.13, 0.148 + j * 0.26, (j % 2) * -0.041);
      crate.rotation.y = (0.11 + i * 0.016) * (j % 2 ? -1 : 1);
      pile.add(crate);
      box(crate, stained, [0.48, 0.245, 0.55], [0, 0, 0]);
      for (const y of [-0.081, 0.003, 0.085]) {
        box(crate, timber, [0.52, 0.048, 0.56], [0, y, 0]);
      }
      for (const offset of [-0.20, 0.20]) {
        box(crate, stained, [0.048, 0.26, 0.564], [offset, 0, 0]);
      }
    }
    const bucket = new THREE.Mesh(new THREE.CylinderGeometry(0.165, 0.125, 0.31, 12), red);
    bucket.position.set(0.29, 0.155, 0.31);
    pile.add(bucket);
    reflectInStreet(pile);
    groups.push(pile);
  }
  return groups;
}
