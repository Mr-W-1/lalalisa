// JENNIE · LIKE JENNIE (Coachella Night Stage)
// Dark festival stage with massive center + mirrored side LED walls, real-time IMAG live-camera cuts,
// 6 shirtless male + 6 mid-show female backup dancers, rolling stage smoke + CO2 jets,
// glowing amber riser steps, and huge dark crowd waving real 3D BLACKPINK Light Sticks + glowing phones!
import * as THREE from 'three';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

export const JENNIE_STAGE_Y = 1.78;
export const JENNIE_CENTER = new THREE.Vector3(0, JENNIE_STAGE_Y, 2.75);

function smoothstep(x) {
  const t = Math.max(0, Math.min(1, x));
  return t * t * (3 - 2 * t);
}

function makeSmokeTexture() {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 6, 64, 64, 62);
  g.addColorStop(0, 'rgba(255, 220, 200, 0.52)');
  g.addColorStop(0.45, 'rgba(220, 120, 95, 0.24)');
  g.addColorStop(0.78, 'rgba(120, 40, 35, 0.08)');
  g.addColorStop(1, 'rgba(40, 10, 12, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeGlowSprite() {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 32);
  g.addColorStop(0, 'rgba(255, 240, 200, 1)');
  g.addColorStop(0.4, 'rgba(255, 110, 45, 0.72)');
  g.addColorStop(1, 'rgba(220, 30, 20, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

function styleLightstickClone(srcScene, scale = 0.095) {
  const stick = srcScene.clone(true);
  stick.scale.setScalar(scale);
  stick.traverse((o) => {
    if (o.isMesh) {
      o.frustumCulled = false;
      if (o.material) {
        o.material = o.material.clone();
        // Make the pink heart hammer head glow vividly in the dark crowd!
        if (/Material\.001/i.test(o.name) || /Material\.001/i.test(o.material.name || '')) {
          o.material.color.setHex(0xff5eb8);
          o.material.emissive = new THREE.Color(0xff2e98);
          o.material.emissiveIntensity = 2.4;
          o.material.roughness = 0.25;
        }
      }
    }
  });
  return stick;
}

export async function buildJennieStage(loader, videoEl, onProgress) {
  const root = new THREE.Group();
  root.name = 'JennieCoachellaStage';
  root.visible = false;

  const safeLoad = (url) => loader.loadAsync(url).catch(() => null);
  onProgress?.('Loading JENNIE Coachella Stage & Crew…', 0.78);

  const [jennieG, maleDancerG, femaleDancerG, stickG, crowdManG, crowdWomanG] = await Promise.all([
    safeLoad('./assets/cast/jennie.glb?v=5'),
    safeLoad('./assets/cast/shirtless_dancer.glb?v=5'),
    safeLoad('./assets/cast/female_dancer.glb?v=5'),
    safeLoad('./assets/cast/bp_lightstick.glb?v=5'),
    safeLoad('./assets/cast/crowd_man.glb'),
    safeLoad('./assets/cast/crowd_woman.glb'),
  ]);

  // 1. Dark Coachella Festival Stage Architecture (NO Live Aid branding!)
  const trussMat = new THREE.MeshStandardMaterial({ color: 0x0c090e, roughness: 0.42, metalness: 0.82 });
  const darkDeckMat = new THREE.MeshStandardMaterial({ color: 0x110b10, roughness: 0.24, metalness: 0.36 });
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x070408, roughness: 0.88, metalness: 0.08 });
  const redBarMat = new THREE.MeshBasicMaterial({ color: 0xff2e1c });
  const amberStripMat = new THREE.MeshBasicMaterial({ color: 0xffa828 });

  // Vast dark festival ground
  const arenaFloor = new THREE.Mesh(new THREE.PlaneGeometry(110, 110), groundMat);
  arenaFloor.rotation.x = -Math.PI * 0.5;
  arenaFloor.position.set(0, -0.01, 18);
  root.add(arenaFloor);

  // Main raised stage deck + dark skirt
  const stageDeck = new THREE.Mesh(new THREE.BoxGeometry(16.4, 0.22, 10.6), darkDeckMat);
  stageDeck.position.set(0, JENNIE_STAGE_Y - 0.11, 2.2);
  root.add(stageDeck);

  const stageSkirt = new THREE.Mesh(
    new THREE.BoxGeometry(16.6, JENNIE_STAGE_Y - 0.15, 10.4),
    new THREE.MeshStandardMaterial({ color: 0x09060a, roughness: 0.72, metalness: 0.2 })
  );
  stageSkirt.position.set(0, (JENNIE_STAGE_Y - 0.15) * 0.5, 2.15);
  root.add(stageSkirt);

  // Glowing horizontal amber/orange LED riser strips along the front stage steps
  for (let s = 0; s < 3; s++) {
    const sy = JENNIE_STAGE_Y - 0.04 - s * 0.34;
    const sz = 7.46 + s * 0.22;
    const riserStep = new THREE.Mesh(new THREE.BoxGeometry(15.8, 0.22, 0.28), trussMat);
    riserStep.position.set(0, sy - 0.12, sz);
    root.add(riserStep);

    const strip = new THREE.Mesh(new THREE.BoxGeometry(15.4, 0.055, 0.06), amberStripMat);
    strip.position.set(0, sy - 0.03, sz + 0.15);
    root.add(strip);
  }
  const backRiser = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.32, 2.6), darkDeckMat);
  backRiser.position.set(0, JENNIE_STAGE_Y + 0.16, -1.5);
  root.add(backRiser);
  const backRiserGlow = new THREE.Mesh(new THREE.BoxGeometry(9.4, 0.06, 0.05), amberStripMat);
  backRiserGlow.position.set(0, JENNIE_STAGE_Y + 0.30, -0.19);
  root.add(backRiserGlow);

  // Massive Dark Coachella Roof Canopy & Truss Rig
  const roof = new THREE.Mesh(new THREE.BoxGeometry(18.6, 0.55, 12.2), trussMat);
  roof.position.set(0, 11.4, 1.4);
  root.add(roof);
  for (let rx = -7.5; rx <= 7.5; rx += 3.0) {
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.32, 11.6), trussMat);
    rib.position.set(rx, 10.95, 1.4);
    root.add(rib);
  }
  const topLightBarMat = new THREE.MeshBasicMaterial({ color: 0xffd088 });
  for (let lx = -6.0; lx <= 6.0; lx += 1.0) {
    const can = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.14, 0.18), topLightBarMat);
    can.position.set(lx, 9.05, -2.5);
    root.add(can);
  }

  for (const side of [-1, 1]) {
    const colFront = new THREE.Mesh(new THREE.BoxGeometry(0.55, 11.6, 0.55), trussMat);
    colFront.position.set(side * 8.6, 5.8, 6.2);
    root.add(colFront);
    const colBack = new THREE.Mesh(new THREE.BoxGeometry(0.55, 11.6, 0.55), trussMat);
    colBack.position.set(side * 8.6, 5.8, -3.5);
    root.add(colBack);

    const paStack = new THREE.Mesh(new THREE.BoxGeometry(0.82, 4.4, 0.95), trussMat);
    paStack.position.set(side * 8.1, 6.4, 1.6);
    root.add(paStack);

    for (let r = 0; r < 6; r++) {
      const rBar = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.09, 0.12), redBarMat);
      rBar.position.set(side * 7.25, 3.2 + r * 0.72, -3.15);
      root.add(rBar);
    }
  }

  // 2. THREE MASSIVE LED SCREENS: Center + Mirrored Left & Right + Real-Time IMAG Live Camera!
  const videoTex = new THREE.VideoTexture(videoEl);
  videoTex.colorSpace = THREE.SRGBColorSpace;
  videoTex.minFilter = THREE.LinearFilter;
  videoTex.magFilter = THREE.LinearFilter;
  videoTex.wrapS = THREE.RepeatWrapping;
  videoTex.wrapT = THREE.ClampToEdgeWrapping;

  const liveRT = new THREE.WebGLRenderTarget(384, 216, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
  });
  liveRT.texture.colorSpace = THREE.SRGBColorSpace;
  const liveCam = new THREE.PerspectiveCamera(32, 16 / 9, 0.25, 55);

  const centerScreenMat = new THREE.MeshBasicMaterial({ map: videoTex, color: new THREE.Color(0xffffff) });
  const leftScreenMat = new THREE.MeshBasicMaterial({ map: videoTex, color: new THREE.Color(0xffffff) });
  const rightScreenMat = new THREE.MeshBasicMaterial({ map: videoTex, color: new THREE.Color(0xffffff) });

  const centerScreen = new THREE.Mesh(new THREE.PlaneGeometry(13.0, 6.6), centerScreenMat);
  centerScreen.position.set(0, 5.25, -3.55);
  root.add(centerScreen);

  const leftWing = new THREE.Group();
  leftWing.position.set(-14.2, 5.35, -2.55);
  leftWing.rotation.y = 0.14;
  const leftScreen = new THREE.Mesh(new THREE.PlaneGeometry(10.8, 6.2), leftScreenMat);
  leftWing.add(leftScreen);
  const leftBezel = new THREE.Mesh(new THREE.BoxGeometry(11.2, 6.6, 0.35), trussMat);
  leftBezel.position.z = -0.22;
  leftWing.add(leftBezel);
  root.add(leftWing);

  const rightWing = new THREE.Group();
  rightWing.position.set(14.2, 5.35, -2.55);
  rightWing.rotation.y = -0.14;
  const rightGeo = new THREE.PlaneGeometry(10.8, 6.2);
  const ruv = rightGeo.attributes.uv;
  for (let i = 0; i < ruv.count; i++) ruv.setX(i, 1.0 - ruv.getX(i)); // Mirrored horizontally!
  const rightScreen = new THREE.Mesh(rightGeo, rightScreenMat);
  rightWing.add(rightScreen);
  const rightBezel = new THREE.Mesh(new THREE.BoxGeometry(11.2, 6.6, 0.35), trussMat);
  rightBezel.position.z = -0.22;
  rightWing.add(rightBezel);
  root.add(rightWing);

  const centerBezel = new THREE.Mesh(new THREE.BoxGeometry(13.5, 7.0, 0.35), trussMat);
  centerBezel.position.set(0, 5.25, -3.78);
  root.add(centerBezel);

  const allScreens = [centerScreen, leftScreen, rightScreen];

  // 3. Fiery Crimson / Scarlet / Amber Coachella Stage Lighting & Volumetric Beams
  const keySpot = new THREE.SpotLight(0xffdec4, 22, 26, Math.PI * 0.26, 0.62, 1.25);
  keySpot.position.set(-1.4, 8.2, 9.6);
  keySpot.target.position.set(0, 2.7, 3.2);
  root.add(keySpot, keySpot.target);

  const stageSpots = [];
  for (const [side, col] of [[-1, 0xff2d16], [1, 0xff6e1a]]) {
    const sp = new THREE.SpotLight(col, 24, 24, Math.PI * 0.30, 0.65, 1.2);
    sp.position.set(side * 5.2, 8.6, 1.2);
    sp.target.position.set(side * 0.6, 2.0, 3.4);
    root.add(sp, sp.target);
    stageSpots.push(sp);
  }
  const backWash = new THREE.PointLight(0xff3c14, 18, 18, 1.4);
  backWash.position.set(0, 5.0, -1.2);
  root.add(backWash);

  const beams = [];
  const beamColors = [0xff2414, 0xff6e1a, 0xffa828, 0xff1e24, 0xff4c12, 0xff9a22, 0xff2414, 0xff6e1a, 0xffb838, 0xff2a18];
  const coneGeo = new THREE.CylinderGeometry(0.03, 0.42, 14.0, 10, 1, true);
  coneGeo.translate(0, -7.0, 0);
  for (let i = 0; i < 10; i++) {
    const pivot = new THREE.Group();
    if (i < 6) pivot.position.set(-5.8 + i * 2.32, 10.6, -1.6);
    else pivot.position.set((i % 2 === 0 ? -1 : 1) * 6.8, 8.8, i < 8 ? 1.0 : 4.2);
    const lmat = new THREE.MeshBasicMaterial({
      color: beamColors[i], transparent: true, opacity: 0.20,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    });
    pivot.add(new THREE.Mesh(coneGeo, lmat));
    root.add(pivot);
    beams.push(pivot);
  }

  // 4. JENNIE Hero Character (clean outfit — zero hair-bone distortion!)
  let jennieNode = null;
  let jennieMixer = null;
  const jennieActions = {};
  let activeJennieClip = '';

  if (jennieG) {
    jennieNode = jennieG.scene;
    jennieNode.position.set(0, JENNIE_STAGE_Y, 4.35);
    jennieNode.traverse((o) => {
      if (o.isMesh) {
        o.frustumCulled = false;
        if (o.material) o.material.roughness = Math.max(o.material.roughness ?? 0.5, 0.35);
      }
    });
    const jKey = new THREE.PointLight(0xffe8d2, 2.2, 5.8, 1.6);
    jKey.position.set(0.65, 1.95, 1.45);
    jennieNode.add(jKey);
    const jRim = new THREE.PointLight(0xff4218, 2.8, 5.8, 1.6);
    jRim.position.set(-0.9, 1.85, -1.25);
    jennieNode.add(jRim);

    root.add(jennieNode);
    jennieMixer = new THREE.AnimationMixer(jennieNode);
    for (const clip of jennieG.animations) {
      jennieActions[clip.name] = jennieMixer.clipAction(clip);
    }
  }

  // 5. 6 Shirtless Male Backup Dancers (pocket-to-arm mesh bridge surgically cleaned!)
  const maleOffsets = [
    new THREE.Vector3(-1.55, 0, 4.05), new THREE.Vector3( 1.55, 0, 4.05),
    new THREE.Vector3(-3.00, 0, 2.75), new THREE.Vector3( 3.00, 0, 2.75),
    new THREE.Vector3(-1.95, 0, 1.45), new THREE.Vector3( 1.95, 0, 1.45),
  ];
  const maleDancers = [];
  if (maleDancerG) {
    for (let i = 0; i < 6; i++) {
      const node = SkeletonUtils.clone(maleDancerG.scene);
      node.position.set(maleOffsets[i].x, JENNIE_STAGE_Y, maleOffsets[i].z);
      node.traverse((o) => {
        if (o.isMesh) {
          o.frustumCulled = false;
          if (o.material) {
            o.material = o.material.clone();
            o.material.roughness = 0.58;
            o.material.metalness = 0.08;
            if (o.material.emissive) o.material.emissive.setHex(0x140604);
          }
        }
      });
      root.add(node);
      const mixer = new THREE.AnimationMixer(node);
      const actions = {};
      for (const clip of maleDancerG.animations) actions[clip.name] = mixer.clipAction(clip);
      maleDancers.push({
        node, mixer, actions, activeClip: '',
        basePos: maleOffsets[i], offset: [0.0, 0.22, 0.44, 0.66, 0.30, 0.82][i],
      });
    }
  }

  // 6. 6 Female Backup Dancers entering mid-show (at 36s heavy bass drop / 9s quick take!)
  const femaleOffsets = [
    new THREE.Vector3(-2.45, 0, 4.55), new THREE.Vector3( 2.45, 0, 4.55),
    new THREE.Vector3(-4.15, 0, 3.35), new THREE.Vector3( 4.15, 0, 3.35),
    new THREE.Vector3(-0.95, 0, 2.25), new THREE.Vector3( 0.95, 0, 2.25),
  ];
  const femaleDancers = [];
  const beamGeo = new THREE.CylinderGeometry(0.40, 0.52, 6.8, 16, 1, true);
  let femaleCrewBeamed = false;

  if (femaleDancerG) {
    const outfitTints = [0x8c1420, 0x380c14, 0xa82028, 0x260910, 0x9c1824, 0x421018];
    for (let i = 0; i < 6; i++) {
      const node = SkeletonUtils.clone(femaleDancerG.scene);
      node.position.set(femaleOffsets[i].x, JENNIE_STAGE_Y, femaleOffsets[i].z);
      node.visible = false;
      const tint = new THREE.Color(outfitTints[i % outfitTints.length]);
      node.traverse((o) => {
        if (o.isMesh) {
          o.frustumCulled = false;
          if (o.material) {
            o.material = o.material.clone();
            if (/Outfit/i.test(o.name)) {
              o.material.color.lerp(tint, 0.72);
              o.material.roughness = 0.38;
              o.material.metalness = 0.22;
            } else {
              o.material.roughness = 0.55;
            }
          }
        }
      });
      root.add(node);
      const mixer = new THREE.AnimationMixer(node);
      const actions = {};
      for (const clip of femaleDancerG.animations) actions[clip.name] = mixer.clipAction(clip);

      const bmat = new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? 0xff2c1a : 0xff9828, transparent: true, opacity: 0.70,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
      });
      const beam = new THREE.Mesh(beamGeo, bmat);
      beam.frustumCulled = false;
      beam.visible = false;
      root.add(beam);

      femaleDancers.push({
        node, mixer, actions, activeClip: '', beam, bmat,
        basePos: femaleOffsets[i], offset: [0.10, 0.32, 0.54, 0.76, 0.18, 0.62][i],
      });
    }
  }

  // 7. Atmospheric Rolling Stage Smoke + Beat-Reactive CO2 Plumes!
  const smokeTex = makeSmokeTexture();
  const smokeSprites = [];
  for (let i = 0; i < 38; i++) {
    const smMat = new THREE.SpriteMaterial({
      map: smokeTex,
      color: i % 3 === 0 ? 0xff7642 : (i % 3 === 1 ? 0xd8442a : 0xffaa68),
      transparent: true,
      opacity: 0.24 + (i % 4) * 0.05,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });
    const sp = new THREE.Sprite(smMat);
    const sx = (Math.random() - 0.5) * 18.0;
    const sy = JENNIE_STAGE_Y + 0.35 + Math.random() * 1.4;
    const sz = -2.2 + Math.random() * 10.2;
    const sc = 3.2 + Math.random() * 3.4;
    sp.position.set(sx, sy, sz);
    sp.scale.set(sc * 1.4, sc * 0.72, 1);
    root.add(sp);
    smokeSprites.push({
      sp, baseX: sx, baseY: sy, baseZ: sz,
      speed: 0.35 + Math.random() * 0.55,
      phase: Math.random() * Math.PI * 2,
      baseOp: smMat.opacity,
    });
  }

  const jetCount = 96;
  const jetPos = new Float32Array(jetCount * 3);
  const jetVel = [];
  for (let i = 0; i < jetCount; i++) {
    jetPos[i * 3 + 1] = -99;
    jetVel.push(new THREE.Vector3());
  }
  const jetGeo = new THREE.BufferGeometry();
  jetGeo.setAttribute('position', new THREE.BufferAttribute(jetPos, 3));
  const jetPts = new THREE.Points(jetGeo, new THREE.PointsMaterial({
    map: smokeTex, color: 0xffb88c, size: 2.4, transparent: true, opacity: 0.0,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  root.add(jetPts);
  let smokeJetTimer = 0;

  const glowTex = makeGlowSprite();
  const emberCount = 100;
  const emberPos = new Float32Array(emberCount * 3);
  for (let i = 0; i < emberCount; i++) {
    emberPos[i * 3] = (Math.random() - 0.5) * 16.0;
    emberPos[i * 3 + 1] = 1.8 + Math.random() * 7.2;
    emberPos[i * 3 + 2] = -2.5 + Math.random() * 10.0;
  }
  const emberGeo = new THREE.BufferGeometry();
  emberGeo.setAttribute('position', new THREE.BufferAttribute(emberPos, 3));
  const embers = new THREE.Points(emberGeo, new THREE.PointsMaterial({
    map: glowTex, color: 0xff6e28, size: 0.24, transparent: true, opacity: 0.78,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  root.add(embers);

  function triggerPyro() {
    smokeJetTimer = 1.85;
    const jets = [-5.4, -3.2, -1.2, 1.2, 3.2, 5.4];
    for (let i = 0; i < jetCount; i++) {
      const jx = jets[i % jets.length];
      jetPos[i * 3] = jx + (Math.random() - 0.5) * 0.55;
      jetPos[i * 3 + 1] = JENNIE_STAGE_Y + 0.15;
      jetPos[i * 3 + 2] = 6.8 + (Math.random() - 0.5) * 0.4;
      jetVel[i].set((Math.random() - 0.5) * 1.6, 2.8 + Math.random() * 3.8, (Math.random() - 0.5) * 1.4);
    }
    jetGeo.attributes.position.needsUpdate = true;
  }

  // 8. Massive Dark Festival Audience + Real 3D BLACKPINK Light Sticks Attached to Hands + Sea of Lightsticks & Phones!
  const crowdFans = [];
  const fanGroup = new THREE.Group();
  root.add(fanGroup);
  for (let i = 0; i < 28; i++) {
    const src = (i % 2 === 1 && crowdWomanG) ? crowdWomanG : (crowdManG || crowdWomanG);
    if (!src) continue;
    const fan = SkeletonUtils.clone(src.scene);
    const row = Math.floor(i / 14);
    const col = (i % 14) - 6.5;
    const fx = col * 1.28 + Math.sin(i * 2.9) * 0.24;
    const fz = 9.5 + row * 1.35 + Math.cos(i * 2.1) * 0.2;
    fan.position.set(fx, 0, fz);
    fan.scale.setScalar(0.41 + (i % 4) * 0.014);
    fan.rotation.y = Math.PI + Math.sin(i * 1.7) * 0.22;
    let rightHandBone = null;
    fan.traverse((o) => {
      if (o.isBone && /MiddleHand\.R/i.test(o.name)) rightHandBone = o;
      if (o.isMesh && o.material) {
        o.material = o.material.clone();
        if (o.material.color) o.material.color.multiplyScalar(0.50);
        o.material.roughness = 0.85;
      }
    });
    // Attach real 3D BLACKPINK Light Stick directly into the fan's raised right hand!
    if (stickG && rightHandBone) {
      const heldStick = styleLightstickClone(stickG.scene, 0.24);
      heldStick.position.set(0.0, 0.08, 0.02);
      heldStick.rotation.set(0.15, 0.3, -0.15);
      rightHandBone.add(heldStick);
    }
    fanGroup.add(fan);
    const mixer = new THREE.AnimationMixer(fan);
    const clapClip = src.animations.find((c) => /clapping/i.test(c.name)) || src.animations[0];
    if (clapClip) {
      const a = mixer.clipAction(clapClip);
      a.timeScale = 0.95 + (i % 5) * 0.06;
      a.play();
      mixer.setTime((i * 0.41) % Math.max(0.5, clapClip.duration));
    }
    crowdFans.push({ node: fan, mixer, baseY: 0, phase: i * 0.71 });
  }

  // Deeper crowd silhouette field (260 dark festival attendees extending back to z=32 for drone fly-overs!)
  const headGeo = new THREE.CapsuleGeometry(0.18, 0.56, 4, 6);
  const headMat = new THREE.MeshStandardMaterial({ color: 0x0b060c, roughness: 0.9 });
  const crowdSil = new THREE.InstancedMesh(headGeo, headMat, 260);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 260; i++) {
    const row = Math.floor(i / 26);
    const col = (i % 26) - 12.5;
    dummy.position.set(col * 1.40 + Math.sin(i * 4.3) * 0.45, 1.32 + (i % 3) * 0.06, 12.2 + row * 1.75 + Math.cos(i * 2.7) * 0.40);
    dummy.rotation.set(0, Math.sin(i) * 0.4, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    crowdSil.setMatrixAt(i, dummy.matrix);
  }
  crowdSil.instanceMatrix.needsUpdate = true;
  root.add(crowdSil);

  // 160 Waving 3D BLACKPINK Light Sticks across the entire festival crowd (3 InstancedMesh draw calls!)
  const stickInstCount = 160;
  const stickBases = [];
  const stickInstances = [];
  if (stickG) {
    stickG.scene.updateMatrixWorld(true);
    const parts = [];
    stickG.scene.traverse((o) => {
      if (o.isMesh) {
        const g = o.geometry.clone();
        g.applyMatrix4(o.matrixWorld);
        const m = o.material.clone();
        if (/Material\.001/i.test(o.name) || /Material\.001/i.test(m.name || '')) {
          m.color.setHex(0xff5eb8);
          m.emissive = new THREE.Color(0xff2e98);
          m.emissiveIntensity = 2.6;
        }
        parts.push({ geo: g, mat: m });
      }
    });
    for (let i = 0; i < stickInstCount; i++) {
      const row = Math.floor(i / 20);
      const col = (i % 20) - 9.5;
      stickBases.push({
        x: col * 1.48 + Math.sin(i * 3.3) * 0.45,
        y: 1.72 + (i % 4) * 0.08,
        z: 10.6 + row * 2.15 + Math.cos(i * 2.1) * 0.45,
        phase: i * 0.67,
        sc: 0.095 + (i % 3) * 0.008,
      });
    }
    for (const part of parts) {
      const im = new THREE.InstancedMesh(part.geo, part.mat, stickInstCount);
      im.frustumCulled = false;
      for (let i = 0; i < stickInstCount; i++) {
        const sb = stickBases[i];
        dummy.position.set(sb.x, sb.y, sb.z);
        dummy.rotation.set(0, Math.sin(sb.phase) * 0.6, 0);
        dummy.scale.setScalar(sb.sc);
        dummy.updateMatrix();
        im.setMatrixAt(i, dummy.matrix);
      }
      im.instanceMatrix.needsUpdate = true;
      root.add(im);
      stickInstances.push(im);
    }
  }

  // 200 Glowing Raised Smartphone Screens mixed in with the BP Light Sticks!
  const phoneCount = 200;
  const phoneGeo = new THREE.PlaneGeometry(0.11, 0.19);
  const phoneMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
  const phones = new THREE.InstancedMesh(phoneGeo, phoneMat, phoneCount);
  const phoneBases = [];
  const pWarm = new THREE.Color(0xffc994);
  const pOrange = new THREE.Color(0xff8c52);
  const pBright = new THREE.Color(0xfff1dc);
  for (let i = 0; i < phoneCount; i++) {
    const row = Math.floor(i / 20);
    const col = (i % 20) - 9.5;
    const fx = col * 1.52 + Math.sin(i * 3.7) * 0.50;
    const fz = 9.8 + row * 1.85 + Math.cos(i * 2.3) * 0.42;
    const fy = 1.66 + (i % 5) * 0.07;
    phoneBases.push({ x: fx, y: fy, z: fz, phase: i * 0.53 });
    dummy.position.set(fx, fy, fz);
    dummy.rotation.set(-0.18, Math.sin(i * 1.9) * 0.25, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    phones.setMatrixAt(i, dummy.matrix);
    phones.setColorAt(i, i % 3 === 0 ? pBright : (i % 3 === 1 ? pWarm : pOrange));
  }
  phones.instanceMatrix.needsUpdate = true;
  if (phones.instanceColor) phones.instanceColor.needsUpdate = true;
  root.add(phones);

  // Live Camera IMAG cut state
  let liveFrameTick = 0;
  let crowdTick = 0;

  function renderLiveCamera(renderer, scene, takeTime) {
    if (!root.visible || !jennieNode) return;
    // During slow intro (0-14s), show visualizer + dramatic live close-up on wings; faster cuts after drop!
    const phase = takeTime < 14.0
      ? (takeTime < 6.0 ? 0 : 1)
      : (Math.floor(Math.max(0, takeTime - 14.0) / 4.5) % 3);

    const liveColor = new THREE.Color(0xffa470);
    const visColor = new THREE.Color(0xffffff);

    if (phase === 0) {
      centerScreenMat.map = videoTex; centerScreenMat.color.copy(visColor);
      leftScreenMat.map = videoTex; leftScreenMat.color.copy(visColor);
      rightScreenMat.map = videoTex; rightScreenMat.color.copy(visColor);
      return;
    }

    liveFrameTick++;
    if (liveFrameTick % 3 !== 0) return;

    const jPos = jennieNode.position;
    const sweep = Math.sin(takeTime * 0.85) * 0.95;
    const tight = phase === 2;
    liveCam.position.set(jPos.x + sweep, jPos.y + (tight ? 1.48 : 1.38), jPos.z + (tight ? 2.15 : 2.95));
    liveCam.lookAt(jPos.x, jPos.y + (tight ? 1.45 : 1.28), jPos.z);
    liveCam.updateMatrixWorld();

    // Hide screens + behind-camera crowd during IMAG close-up pass for big GPU savings!
    for (const s of allScreens) s.visible = false;
    fanGroup.visible = false;
    crowdSil.visible = false;
    phones.visible = false;
    for (const im of stickInstances) im.visible = false;

    const prevTarget = renderer.getRenderTarget();
    renderer.setRenderTarget(liveRT);
    renderer.clear();
    renderer.render(scene, liveCam);
    renderer.setRenderTarget(prevTarget);

    for (const s of allScreens) s.visible = true;
    fanGroup.visible = true;
    crowdSil.visible = true;
    phones.visible = true;
    for (const im of stickInstances) im.visible = true;

    if (phase === 1) {
      centerScreenMat.map = videoTex; centerScreenMat.color.copy(visColor);
      leftScreenMat.map = liveRT.texture; leftScreenMat.color.copy(liveColor);
      rightScreenMat.map = liveRT.texture; rightScreenMat.color.copy(liveColor);
    } else {
      centerScreenMat.map = liveRT.texture; centerScreenMat.color.copy(liveColor);
      leftScreenMat.map = liveRT.texture; leftScreenMat.color.copy(liveColor);
      rightScreenMat.map = liveRT.texture; rightScreenMat.color.copy(liveColor);
    }
  }

  function resetShow() {
    smokeJetTimer = 0;
    femaleCrewBeamed = false;
    activeJennieClip = '';
    if (jennieNode) {
      jennieNode.position.set(0, JENNIE_STAGE_Y, 4.35);
      jennieNode.rotation.y = 0;
    }
    for (const d of maleDancers) {
      d.node.visible = true;
      d.node.position.set(d.basePos.x, JENNIE_STAGE_Y, d.basePos.z);
      d.node.rotation.y = 0;
    }
    for (const d of femaleDancers) {
      d.node.visible = false;
      d.beam.visible = false;
      d.node.position.set(d.basePos.x, JENNIE_STAGE_Y, d.basePos.z);
      d.node.rotation.y = 0;
    }
  }

  function setPrewarmVisible(on) {
    root.visible = on;
    if (on) {
      resetShow();
      if (jennieMixer) {
        const a = jennieActions['Jennie_Chorus'] || Object.values(jennieActions)[0];
        if (a) { a.reset().play(); jennieMixer.setTime(0.1); }
      }
      for (const d of [...maleDancers, ...femaleDancers]) {
        d.node.visible = true;
        if (d.beam) d.beam.visible = true;
        const a = d.actions['Jennie_Chorus'] || Object.values(d.actions)[0];
        if (a) { a.reset().play(); d.mixer.setTime(0.1); }
      }
      for (const cf of crowdFans) cf.mixer.update(0.016);
    } else {
      resetShow();
    }
  }

  function getHeroState() {
    return {
      pos: jennieNode ? jennieNode.position.clone() : new THREE.Vector3(0, JENNIE_STAGE_Y, 4.35),
      yaw: jennieNode ? jennieNode.rotation.y : 0,
      liftY: 0,
    };
  }

  function stepCrewMember(d, clipName, localT, inSync, takeTime, idx, spread) {
    const act = d.actions[clipName] || d.actions['Jennie_Chorus'] || Object.values(d.actions)[0];
    if (act) {
      if (d.activeClip !== clipName) {
        for (const a of Object.values(d.actions)) a.stop();
        act.reset().play();
        d.activeClip = clipName;
      }
      const len = Math.max(1.0, act.getClip().duration - 0.05);
      const seekT = inSync ? (localT % len) : ((localT + d.offset) % len);
      d.mixer.setTime(Math.max(0, seekT));
    }
    d.node.position.set(d.basePos.x * spread, JENNIE_STAGE_Y, d.basePos.z);
    d.node.rotation.y = inSync ? 0 : Math.sin(takeTime * 0.9 + idx * 1.4) * 0.22;
  }

  function updateShow(delta, takeTime, fullSong, clipName, localT, pulse, intensity) {
    // 1. Update Jennie animation (slow diva presence in intro/outro, explosive swagger on drops!)
    if (jennieMixer && jennieNode) {
      const act = jennieActions[clipName] || jennieActions['Jennie_Chorus'] || Object.values(jennieActions)[0];
      if (act) {
        if (activeJennieClip !== clipName) {
          for (const a of Object.values(jennieActions)) a.stop();
          act.reset().play();
          activeJennieClip = clipName;
        }
        const len = Math.max(1.0, act.getClip().duration - 0.05);
        jennieMixer.setTime(Math.max(0, localT % len));
      }
      const moveAmp = intensity < 0.65 ? 0.12 : 0.36;
      const swaggerX = Math.sin(takeTime * 0.42) * moveAmp;
      jennieNode.position.set(swaggerX, JENNIE_STAGE_Y, 4.35 + Math.cos(takeTime * 0.35) * moveAmp * 0.7);
      jennieNode.rotation.y = Math.sin(takeTime * 0.38) * (intensity < 0.65 ? 0.06 : 0.14);
      jennieNode.updateMatrixWorld(true);
    }

    const inSync = (intensity >= 1.10 || clipName === 'Jennie_Intro' || clipName === 'Jennie_Outro');
    const spread = 1.0 + Math.max(0, intensity - 0.85) * 0.15;

    // 2. Update 6 Shirtless Male Backup Dancers
    for (let i = 0; i < maleDancers.length; i++) {
      maleDancers[i].node.visible = true;
      stepCrewMember(maleDancers[i], clipName, localT, inSync, takeTime, i, spread);
    }

    // 3. Female Backup Dancers enter mid-show (at 36.0s bass groove drop / 8.5s quick take!)
    const femaleStart = fullSong ? 36.0 : 8.5;
    if (takeTime >= femaleStart) {
      if (!femaleCrewBeamed) { femaleCrewBeamed = true; triggerPyro(); }
      const el = takeTime - femaleStart;
      for (let i = 0; i < femaleDancers.length; i++) {
        const d = femaleDancers[i];
        const lb = el - i * 0.08;
        if (lb < 0) { d.node.visible = false; d.beam.visible = false; continue; }
        d.node.visible = true;
        stepCrewMember(d, clipName, localT, inSync, takeTime, i + 6, spread);
        d.beam.position.set(d.node.position.x, d.node.position.y + 3.4, d.node.position.z);
        if (lb < 1.35) {
          d.beam.visible = true;
          const u = lb / 1.35;
          d.beam.scale.set(1.15 - u * 0.85, 1, 1.15 - u * 0.85);
          d.bmat.opacity = Math.sin(u * Math.PI) * 0.88;
          const mu = smoothstep(lb / 0.55);
          d.node.scale.set(0.08 + 0.92 * mu, 1.42 - 0.42 * mu, 0.08 + 0.92 * mu);
        } else {
          d.beam.visible = false;
          d.node.scale.set(1, 1, 1);
        }
      }
    } else {
      for (const d of femaleDancers) { d.node.visible = false; d.beam.visible = false; }
    }

    // 4. Sweeping Fiery Stage Beams & Lights
    const beamSpd = intensity < 0.65 ? 0.55 : 1.15;
    for (let i = 0; i < beams.length; i++) {
      beams[i].rotation.z = Math.sin(takeTime * beamSpd * (2.1 + 0.3 * (i % 3)) + i * 1.05) * 0.58;
      beams[i].rotation.x = 0.24 + Math.cos(takeTime * beamSpd * 1.5 + i * 0.9) * 0.26;
    }
    for (let i = 0; i < stageSpots.length; i++) {
      stageSpots[i].intensity = (16 + pulse * 20) * (0.65 + 0.40 * intensity);
      stageSpots[i].target.position.set(Math.sin(takeTime * 1.1 + i * 2) * 3.0, 2.2, 3.2 + Math.cos(takeTime * 0.8 + i) * 1.8);
    }
    backWash.intensity = 12 + pulse * 18;

    // 5. Rolling Stage Smoke & CO2 Haze Jets!
    for (let i = 0; i < smokeSprites.length; i++) {
      const s = smokeSprites[i];
      s.sp.position.x = s.baseX + Math.sin(takeTime * s.speed + s.phase) * 1.8;
      s.sp.position.y = s.baseY + Math.cos(takeTime * s.speed * 0.7 + s.phase) * 0.28;
      s.sp.material.opacity = s.baseOp * (0.72 + pulse * 0.55);
    }
    if (smokeJetTimer > 0) {
      smokeJetTimer = Math.max(0, smokeJetTimer - delta);
      const jp = jetGeo.attributes.position.array;
      for (let i = 0; i < jetCount; i++) {
        jetVel[i].y *= Math.exp(-delta * 1.1);
        jp[i * 3] += jetVel[i].x * delta;
        jp[i * 3 + 1] += jetVel[i].y * delta;
        jp[i * 3 + 2] += jetVel[i].z * delta;
      }
      jetGeo.attributes.position.needsUpdate = true;
      jetPts.material.opacity = Math.min(0.68, smokeJetTimer * 0.45);
    } else {
      jetPts.material.opacity = 0;
    }

    const ep = emberGeo.attributes.position.array;
    for (let i = 0; i < emberCount; i++) {
      ep[i * 3 + 1] += delta * (0.65 + (i % 4) * 0.22);
      if (ep[i * 3 + 1] > 9.0) ep[i * 3 + 1] = 1.8;
    }
    emberGeo.attributes.position.needsUpdate = true;

    // 6. Cheering Crowd + Waving 3D BLACKPINK Light Sticks + Glowing Phones (30 Hz update for smooth 60 FPS!)
    crowdTick = (crowdTick + 1) & 1;
    if (crowdTick === 0) {
      const dt2 = delta * 2;
      const beatWave = takeTime * (130.88 / 60) * Math.PI;
      for (let i = 0; i < crowdFans.length; i++) {
        const cf = crowdFans[i];
        cf.mixer.update(dt2);
        cf.node.position.y = cf.baseY + Math.abs(Math.sin(beatWave + cf.phase)) * 0.08;
      }
      if (stickInstances.length > 0) {
        for (let i = 0; i < stickBases.length; i++) {
          const sb = stickBases[i];
          const sway = Math.sin(beatWave + sb.phase) * 0.42;
          dummy.position.set(sb.x + sway * 0.16, sb.y + Math.abs(Math.sin(beatWave + sb.phase)) * 0.14, sb.z);
          dummy.rotation.set(0.12 * Math.cos(beatWave + sb.phase), Math.sin(sb.phase) * 0.5, sway);
          dummy.scale.setScalar(sb.sc);
          dummy.updateMatrix();
          for (let p = 0; p < stickInstances.length; p++) {
            stickInstances[p].setMatrixAt(i, dummy.matrix);
          }
        }
        for (let p = 0; p < stickInstances.length; p++) {
          stickInstances[p].instanceMatrix.needsUpdate = true;
        }
      }
      for (let i = 0; i < phoneBases.length; i++) {
        const pb = phoneBases[i];
        const bob = Math.sin(beatWave * 0.5 + pb.phase) * 0.08;
        dummy.position.set(pb.x + bob * 0.5, pb.y + Math.abs(bob), pb.z);
        dummy.rotation.set(-0.18, Math.sin(pb.phase) * 0.2, bob * 1.2);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        phones.setMatrixAt(i, dummy.matrix);
      }
      phones.instanceMatrix.needsUpdate = true;
    }
  }

  return {
    root,
    resetShow,
    setPrewarmVisible,
    getHeroState,
    updateShow,
    triggerPyro,
    renderLiveCamera,
  };
}
