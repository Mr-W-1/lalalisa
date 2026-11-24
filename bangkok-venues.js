import * as THREE from 'three';

function panelTexture(width, height, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d'));
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function finishes() {
  const stone = panelTexture(256, 256, (ctx) => {
    const base = ctx.createLinearGradient(0, 10, 250, 200);
    base.addColorStop(0, '#3f303d');
    base.addColorStop(0.55, '#261e2c');
    base.addColorStop(1, '#47323c');
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, 256, 256);
    for (let y = 2; y < 256; y += 3) {
      const opacity = (1 + Math.sin(y * 7.69)) * 0.045;
      ctx.strokeStyle = `rgba(207,167,155,${opacity})`;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(70, y - 16, 184, y + 14, 256, y - 4);
      ctx.stroke();
    }
    ctx.strokeStyle = '#171521';
    ctx.strokeRect(1, 1, 254, 254);
  });
  const brass = panelTexture(128, 256, (ctx) => {
    const base = ctx.createLinearGradient(0, 0, 128, 0);
    base.addColorStop(0, '#5c3d31');
    base.addColorStop(0.36, '#b28b64');
    base.addColorStop(0.7, '#7f5c4c');
    base.addColorStop(1, '#493333');
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, 128, 256);
    for (let x = 0; x < 128; x += 2) {
      ctx.fillStyle = `rgba(211,188,170,${(1 + Math.sin(x * 2.2)) * 0.07})`;
      ctx.fillRect(x, 0, 1, 256);
    }
  });
  return {
    stone: new THREE.MeshStandardMaterial({ map: stone, roughness: 0.71 }),
    brass: new THREE.MeshStandardMaterial({ map: brass, roughness: 0.42, metalness: 0.36 }),
    amber: new THREE.MeshStandardMaterial({
      color: 0xffe9c6, emissive: 0xffa859, emissiveIntensity: 3.65, roughness: 0.5,
    }),
    pink: new THREE.MeshStandardMaterial({
      color: 0xff8fba, emissive: 0xff3889, emissiveIntensity: 3.15, roughness: 0.45,
    }),
    glass: new THREE.MeshStandardMaterial({ color: 0x594144, emissive: 0x6e2b11, emissiveIntensity: 0.53, roughness: 0.38 }),
  };
}

function solid(parent, material, width, height, depth, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

function panel(parent, map, width, height, x, y, z) {
  const material = new THREE.MeshBasicMaterial({ map, color: new THREE.Color(0xffffff).multiplyScalar(1.55) });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
  mesh.position.set(x, y, z);
  parent.add(mesh);
}

function lisaMarquee() {
  return panelTexture(1024, 192, (ctx) => {
    const base = ctx.createLinearGradient(0, 0, 0, 192);
    base.addColorStop(0, '#251927');
    base.addColorStop(1, '#100e1b');
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, 1024, 192);
    ctx.strokeStyle = '#d39486';
    ctx.lineWidth = 3;
    ctx.strokeRect(14, 14, 996, 164);
    ctx.fillStyle = '#fff1bf';
    ctx.shadowColor = '#ff6518';
    ctx.shadowBlur = 24;
    ctx.textAlign = 'center';
    ctx.font = 'bold 106px Georgia, serif';
    ctx.fillText('L I S A', 512, 101);
    ctx.shadowBlur = 4;
    ctx.fillStyle = '#f4abc9';
    ctx.font = '600 27px system-ui, sans-serif';
    ctx.fillText('L I V E   S T A G E', 512, 146);
  });
}

function buildTheatre(parent, art, upcoming) {
  const room = new THREE.Group();
  room.name = upcoming ? 'Jennie Theatre' : 'LISA Theatre';
  parent.add(room);
  const { stone, brass, amber, pink, glass } = finishes();
  const width = 13.5;
  const height = 11.45;
  const facing = art ? new THREE.MeshStandardMaterial({
    map: art.map, emissiveMap: art.emit, emissive: 0xffe7d6,
    emissiveIntensity: upcoming ? 1.16 : 1.40, color: upcoming ? 0xd8bfd9 : 0xf3c8af, roughness: 0.77,
  }) : glass;

  function elevation(x0, x1, y0, y1, z) {
    const plane = new THREE.PlaneGeometry(x1 - x0, y1 - y0);
    const uv = plane.attributes.uv;
    const position = plane.attributes.position;
    for (let i = 0; i < uv.count; i++) {
      uv.setXY(i, (position.getX(i) + (x0 + x1) * 0.5) / width + 0.5,
        (position.getY(i) + (y0 + y1) * 0.5) / height);
    }
    const mesh = new THREE.Mesh(plane, facing);
    mesh.position.set((x0 + x1) / 2, (y0 + y1) / 2, z);
    room.add(mesh);
  }

  const wings = 4.72;
  const marqueeBottom = upcoming ? 5.02 : 4.10;
  const marqueeTop = upcoming ? 6.22 : 5.69;
  solid(room, stone, 13.5, 0.10, 3.70, 0, -0.036, 0.88);
  solid(room, stone, 13.5, 9.63, 2.42, 0, 4.815, -1.76);
  solid(room, stone, 9.63, 0.87, 1.70, 0, 10.06, -1.38);
  solid(room, stone, 5.14, 1.14, 1.42, 0, 10.87, -1.07);
  solid(room, brass, 4.97, 0.08, 1.42, 0, 11.43, -1.08);
  for (const side of [-1, 1]) {
    const x = side * 5.72;
    solid(room, stone, 2.07, 9.65, 0.69, x, 4.825, 0.137);
    elevation(Math.min(side * wings, side * 6.75), Math.max(side * wings, side * 6.75), 0, 9.65, 0.486);
    solid(room, stone, 0.13, 4.14, 1.03, side * (wings - 0.07), 2.065, 0.1);
    solid(room, pink, 0.031, 3.72, 0.031, side * (wings - 0.114), 1.985, 0.62);
    solid(room, brass, 0.12, 9.56, 0.097, side * 6.66, 4.78, 0.516);
  }

  elevation(-wings, wings, 0, marqueeBottom, -0.532);
  elevation(-wings, wings, marqueeTop, 10.47, -0.506);
  elevation(-2.54, 2.54, 10.47, height, -0.34);

  // The marquee projects in front of the upper relief and covers a recessed entrance.
  solid(room, brass, 9.44, marqueeTop - marqueeBottom, 2.78, 0, (marqueeBottom + marqueeTop) / 2, 0.86);
  elevation(-wings, wings, marqueeBottom, marqueeTop, 2.26);
  solid(room, pink, 9.27, 0.038, 0.06, 0, marqueeTop - 0.05, 2.29);
  solid(room, brass, 9.43, 0.044, 0.1, 0, marqueeBottom + 0.04, 2.28);
  if (!art) panel(room, upcoming ? jennieMarquee() : lisaMarquee(), 6.5, 1.28, 0, marqueeTop + 1.04, -0.46);

  const bulbs = [];
  for (let x = -4.35; x <= 4.35; x += 0.24) {
    for (const z of [-0.19, 0.28, 0.75, 1.22, 1.69, 2.16]) bulbs.push([x, marqueeBottom - 0.027, z]);
  }
  const band = new THREE.InstancedMesh(new THREE.SphereGeometry(0.038, 7, 5), amber, bulbs.length);
  const transform = new THREE.Matrix4();
  bulbs.forEach(([x, y, z], i) => band.setMatrixAt(i, transform.makeTranslation(x, y, z)));
  room.add(band);

  for (const x of [-3.17, -1.06, 1.05, 3.17]) {
    solid(room, brass, 0.052, 3.69, 0.059, x, 1.86, -0.47);
  }
  for (const x of [-2.19, -2.01, -0.09, 0.09, 2.02, 2.20]) {
    solid(room, brass, 0.039, 0.30, 0.065, x, 1.17, -0.435);
  }

  const canopyLight = new THREE.PointLight(upcoming ? 0xffb078 : 0xffa75e, upcoming ? 17 : 33, upcoming ? 10 : 16, 2);
  canopyLight.position.set(0, marqueeBottom - 0.18, 2.30);
  room.add(canopyLight);
  const entranceLight = new THREE.PointLight(upcoming ? 0xb365f1 : 0xff4778, upcoming ? 7 : 12, 9, 2);
  entranceLight.position.set(0, 1.42, 0.58);
  room.add(entranceLight);
  return room;
}

function jennieMarquee() {
  return panelTexture(768, 224, (ctx) => {
    ctx.fillStyle = '#1e1327';
    ctx.fillRect(0, 0, 768, 224);
    ctx.strokeStyle = '#d28aeb';
    ctx.lineWidth = 4;
    ctx.strokeRect(10, 10, 748, 204);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fae3ff';
    ctx.font = 'bold 79px Georgia, serif';
    ctx.fillText('JENNIE', 384, 109);
    ctx.fillStyle = '#ff9d5c';
    ctx.font = '600 24px system-ui, sans-serif';
    ctx.fillText('L I K E   J E N N I E  ·  L I V E', 384, 163);
  });
}

export function buildLisaEntrance(parent, venueZ, art) {
  const theatre = buildTheatre(parent, art, false);
  theatre.position.z = venueZ;
  return theatre;
}

export function buildJennieEntrance(parent, x, z, art) {
  const theatre = buildTheatre(parent, art, true);
  theatre.position.set(x, 0.095, z);
  theatre.rotation.y = -Math.PI / 2;
  theatre.scale.set(9.24 / 13.5, 7.95 / 11.45, 0.56);
  return theatre;
}
