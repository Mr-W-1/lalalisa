// PC-Quality Diva Soundstage: Real HD VideoTexture Screen, 10 Lasers, Pyro/Bokeh,
// 6 Beaming-In Male Backup Dancers, and Compact 2.75m Rising Chrome Tuk-Tuk Turntable
import * as THREE from 'three';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

export const PODIUM_CENTER = new THREE.Vector3(0, 1.78, 2.75);

function smoothstep(x) {
  const t = Math.max(0, Math.min(1, x));
  return t * t * (3 - 2 * t);
}

function makeGlowSprite() {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,250,235,1)');
  g.addColorStop(0.35, 'rgba(255,150,205,0.72)');
  g.addColorStop(1, 'rgba(255,60,150,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

export async function buildDivaStage(loader, videoEl, onProgress) {
  const root = new THREE.Group();
  root.name = 'DivaSoundstage';
  root.visible = false;

  const safeLoad = (url) => loader.loadAsync(url).catch(() => null);
  onProgress?.('Loading Diva Soundstage & Crew…', 0.65);

  const [stageG, dancerG, tuktukG, crowdManG, crowdWomanG] = await Promise.all([
    safeLoad('./assets/cast/stage.glb'),
    safeLoad('./assets/cast/backup_dancer.glb'),
    safeLoad('./assets/mobile/stage_tuktuk.glb'),
    safeLoad('./assets/cast/crowd_man.glb'),
    safeLoad('./assets/cast/crowd_woman.glb'),
  ]);

  // 1. Stage.glb (airplane fuselage & studio backdrop)
  if (stageG) {
    const set = stageG.scene;
    set.traverse((o) => {
      if (o.isMesh) {
        if (/path1/i.test(o.name)) { o.visible = false; return; }
        if (o.material) {
          o.material = o.material.clone();
          o.material.roughness = Math.max(o.material.roughness ?? 0.4, 0.28);
          o.material.metalness = /plane/i.test(o.name) ? 0.58 : 0.28;
          if (o.material.color) o.material.color.multiply(new THREE.Color('#966f8a'));
        }
      }
    });
    root.add(set);
  }

  // Glossy dark concert stage deck + arena floor (balanced sheen, no glare blowout)
  const deckMat = new THREE.MeshStandardMaterial({ color: 0x151120, roughness: 0.26, metalness: 0.32 });
  const deck = new THREE.Mesh(new THREE.PlaneGeometry(7.6, 8.2), deckMat);
  deck.rotation.x = -Math.PI * 0.5;
  deck.position.set(0, 1.775, 2.5);
  root.add(deck);

  const arenaFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(34, 34),
    new THREE.MeshStandardMaterial({ color: 0x141020, roughness: 0.36, metalness: 0.25 })
  );
  arenaFloor.rotation.x = -Math.PI * 0.5;
  arenaFloor.position.set(0, -0.01, 4);
  root.add(arenaFloor);

  // Side arena walls
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x26182c, roughness: 0.78, metalness: 0.15 });
  for (const side of [-1, 1]) {
    const w = new THREE.Mesh(new THREE.BoxGeometry(0.4, 9.5, 18), wallMat);
    w.position.set(side * 6.9, 4.75, 3.0);
    root.add(w);
  }

  // 2. Giant Framed K-Pop Concert Video Screen playing REAL HD vidback_web.mp4!
  const videoTex = new THREE.VideoTexture(videoEl);
  videoTex.colorSpace = THREE.SRGBColorSpace;
  videoTex.minFilter = THREE.LinearFilter;
  videoTex.magFilter = THREE.LinearFilter;
  const screenMat = new THREE.MeshBasicMaterial({ map: videoTex });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(13.2, 6.2), screenMat);
  screen.position.set(0, 4.95, -3.52);
  root.add(screen);

  // Matte-black concert screen bezel + overhead truss
  const trussMat = new THREE.MeshStandardMaterial({ color: 0x110e18, roughness: 0.30, metalness: 0.85 });
  const topBar = new THREE.Mesh(new THREE.BoxGeometry(13.7, 0.28, 0.28), trussMat);
  topBar.position.set(0, 8.12, -3.48); root.add(topBar);
  const botBar = new THREE.Mesh(new THREE.BoxGeometry(13.7, 0.26, 0.26), trussMat);
  botBar.position.set(0, 1.82, -3.48); root.add(botBar);
  for (const sx of [-6.72, 6.72]) {
    const col = new THREE.Mesh(new THREE.BoxGeometry(0.28, 6.4, 0.28), trussMat);
    col.position.set(sx, 4.95, -3.48); root.add(col);
  }

  // 3. 10 Sweeping Additive Volumetric Concert Lasers
  const lasers = [];
  const laserColors = [0xff3a98, 0x3ce6ff, 0xffbe4f, 0xff3a98, 0xb866ff, 0x3ce6ff, 0xff3a98, 0xffbe4f, 0x3ce6ff, 0xff5cb8];
  const coneGeo = new THREE.CylinderGeometry(0.025, 0.30, 12.2, 10, 1, true);
  coneGeo.translate(0, -6.1, 0);
  for (let i = 0; i < 10; i++) {
    const pivot = new THREE.Group();
    if (i < 6) pivot.position.set(-4.5 + i * 1.8, 7.3, -2.2);
    else pivot.position.set((i % 2 === 0 ? -1 : 1) * 5.2, 6.4, i < 8 ? 0.5 : 3.8);
    const lmat = new THREE.MeshBasicMaterial({
      color: laserColors[i], transparent: true, opacity: 0.24,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    });
    pivot.add(new THREE.Mesh(coneGeo, lmat));
    root.add(pivot);
    lasers.push(pivot);
  }

  // 4. Concert Stage Lights (balanced broadcast key + 2 color movers + crowd backlight — no front-stage halation)
  const keySpot = new THREE.SpotLight(0xffe6dc, 18, 22, Math.PI * 0.25, 0.65, 1.3);
  keySpot.position.set(-1.2, 7.2, 9.2);
  keySpot.target.position.set(0, 2.5, 3.2);
  root.add(keySpot, keySpot.target);

  const stageSpots = [];
  for (const side of [-1, 1]) {
    const sp = new THREE.SpotLight(side < 0 ? 0xc878ff : 0xff4ea6, 15, 20, Math.PI * 0.26, 0.65, 1.3);
    sp.position.set(side * 4.1, 6.8, 1.2);
    sp.target.position.set(side * 0.5, 2.0, 3.4);
    root.add(sp, sp.target);
    stageSpots.push(sp);
  }
  const backRim = new THREE.PointLight(0x46e8ff, 9, 14, 1.5);
  backRim.position.set(0, 4.6, -1.2);
  root.add(backRim);

  // 5. Beat-Reactive Dual Floor LED Halo Ring under Lisa
  const halo = new THREE.Group();
  halo.position.set(0, 1.795, 4.4);
  const haloMats = [];
  for (const [r, col] of [[1.15, 0xff46a6], [1.65, 0x3ce8ff]]) {
    const hm = new THREE.MeshBasicMaterial({
      color: col, transparent: true, opacity: 0.48, blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.04, 10, 48), hm);
    ring.rotation.x = Math.PI * 0.5;
    halo.add(ring);
    haloMats.push(hm);
  }
  root.add(halo);

  // 6. Compact 2.75m Center Brushed-Chrome Hydraulic Turntable Disc + Inner Lift carrying Lisa's Neon-Pink Tuk-Tuk!
  const podium = new THREE.Group();
  podium.position.copy(PODIUM_CENTER);
  root.add(podium);

  const chromeMat = new THREE.MeshStandardMaterial({ color: 0x9aa4b8, roughness: 0.22, metalness: 0.82 });
  const skirtMat = new THREE.MeshStandardMaterial({ color: 0x181326, roughness: 0.35, metalness: 0.80 });
  const discTop = new THREE.Mesh(new THREE.CylinderGeometry(2.75, 2.78, 0.14, 48), chromeMat);
  discTop.position.y = -0.07; podium.add(discTop);
  const discSkirt = new THREE.Mesh(new THREE.CylinderGeometry(2.66, 2.72, 1.55, 48), skirtMat);
  discSkirt.position.y = -0.90; podium.add(discSkirt);

  for (const [r, y, hex] of [[2.74, 0.01, 0xe8b84b], [2.78, -0.24, 0xe83692], [2.72, -0.54, 0x2ccae0]]) {
    const rm = new THREE.MeshBasicMaterial({ color: hex });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.044, 10, 56), rm);
    ring.rotation.x = Math.PI * 0.5;
    ring.position.y = y;
    podium.add(ring);
  }

  const tukLift = new THREE.Group();
  tukLift.position.y = -2.2;
  tukLift.visible = false;
  podium.add(tukLift);

  if (tuktukG) {
    const tk = tuktukG.scene;
    tk.position.y = 0.06;
    tk.rotation.y = Math.PI * 0.5;
    tk.scale.setScalar(0.72);
    tk.traverse((o) => { if (o.isMesh) o.frustumCulled = false; });
    tukLift.add(tk);
  }
  const tukLight = new THREE.PointLight(0xff62be, 4.5, 8.5, 1.6);
  tukLight.position.set(0, 2.0, 0.3);
  tukLift.add(tukLight);

  // 7. Floating Concert Bokeh Embers + Pooled Pyro Sparks
  const glowTex = makeGlowSprite();
  const emberCount = 90;
  const emberPos = new Float32Array(emberCount * 3);
  for (let i = 0; i < emberCount; i++) {
    emberPos[i * 3] = (Math.random() - 0.5) * 10.5;
    emberPos[i * 3 + 1] = 1.9 + Math.random() * 5.2;
    emberPos[i * 3 + 2] = -1.2 + Math.random() * 8.0;
  }
  const emberGeo = new THREE.BufferGeometry();
  emberGeo.setAttribute('position', new THREE.BufferAttribute(emberPos, 3));
  const embers = new THREE.Points(emberGeo, new THREE.PointsMaterial({
    map: glowTex, color: 0xff82c4, size: 0.26, transparent: true, opacity: 0.72,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  root.add(embers);

  // Pyro fountain particles
  const pyroCount = 120;
  const pyroPos = new Float32Array(pyroCount * 3);
  const pyroVel = [];
  for (let i = 0; i < pyroCount; i++) {
    pyroPos[i * 3 + 1] = -99;
    pyroVel.push(new THREE.Vector3());
  }
  const pyroGeo = new THREE.BufferGeometry();
  pyroGeo.setAttribute('position', new THREE.BufferAttribute(pyroPos, 3));
  const pyroPts = new THREE.Points(pyroGeo, new THREE.PointsMaterial({
    map: glowTex, color: 0xffc668, size: 0.34, transparent: true, opacity: 0.95,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  root.add(pyroPts);
  let pyroTimer = 0;

  function triggerPyro() {
    pyroTimer = 1.4;
    const jets = [-2.5, -1.1, 1.1, 2.5];
    for (let i = 0; i < pyroCount; i++) {
      const jx = jets[i % jets.length];
      pyroPos[i * 3] = jx + (Math.random() - 0.5) * 0.25;
      pyroPos[i * 3 + 1] = 1.85;
      pyroPos[i * 3 + 2] = 5.65 + (Math.random() - 0.5) * 0.2;
      pyroVel[i].set((Math.random() - 0.5) * 1.4, 3.8 + Math.random() * 4.2, (Math.random() - 0.5) * 1.0);
    }
    pyroGeo.attributes.position.needsUpdate = true;
  }

  // 8. 6 Male K-Pop Backup Dancers (inside the yellow ring!) + Glowing Teleport Pillars
  const stageOffsets = [
    new THREE.Vector3(-1.48, 0,  0.92), new THREE.Vector3( 1.48, 0,  0.92),
    new THREE.Vector3(-2.05, 0, -0.22), new THREE.Vector3( 2.05, 0, -0.22),
    new THREE.Vector3(-1.35, 0, -1.32), new THREE.Vector3( 1.35, 0, -1.32),
  ];
  const podiumOffsets = [
    new THREE.Vector3(-1.42, 0,  1.02), new THREE.Vector3( 1.42, 0,  1.02),
    new THREE.Vector3(-1.82, 0, -0.14), new THREE.Vector3( 1.82, 0, -0.14),
    new THREE.Vector3(-1.24, 0, -1.34), new THREE.Vector3( 1.24, 0, -1.34),
  ];
  const canonOffsets = [0.0, 0.34, 0.68, 1.05, 0.48, 1.38];
  const freestyleClips = ['Diva_Break', 'Diva_Verse', 'Diva', 'Diva_Break', 'Diva_Verse', 'Diva_Break'];
  const speedVars = [1.0, 0.94, 1.07, 0.96, 1.05, 0.92];
  const dancers = [];
  const beamGeo = new THREE.CylinderGeometry(0.42, 0.52, 6.4, 16, 1, true);

  if (dancerG) {
    for (let i = 0; i < 6; i++) {
      const node = SkeletonUtils.clone(dancerG.scene);
      node.traverse((o) => { if (o.isMesh) o.frustumCulled = false; });
      node.visible = false;
      root.add(node);
      const mixer = new THREE.AnimationMixer(node);
      const actions = {};
      for (const clip of dancerG.animations) {
        actions[clip.name] = mixer.clipAction(clip);
      }
      const bmat = new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? 0xff46a6 : 0x36ecff, transparent: true, opacity: 0.65,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
      });
      const beam = new THREE.Mesh(beamGeo, bmat);
      beam.frustumCulled = false;
      beam.visible = false;
      root.add(beam);
      dancers.push({
        node, mixer, actions, activeClip: '', beam, bmat,
        stageOff: stageOffsets[i], podOff: podiumOffsets[i],
        offset: canonOffsets[i], altClip: freestyleClips[i], speed: speedVars[i],
      });
    }
  }

  // 9. Real Animated Textured Concert Audience (crowd_man + crowd_woman) + Waving Neon Lightsticks!
  const crowdFans = [];
  const fanGroup = new THREE.Group();
  root.add(fanGroup);
  const crowdTotal = 20;
  const outfitTints = [0xff5eb4, 0x52d4ff, 0xf2c864, 0xb87cff, 0xffffff, 0xff8098, 0x76e8c8, 0xd8a8ff];
  for (let i = 0; i < crowdTotal; i++) {
    const useWoman = (i % 2 === 1);
    const src = (useWoman && crowdWomanG) ? crowdWomanG : (crowdManG || crowdWomanG);
    if (!src) continue;
    const fan = SkeletonUtils.clone(src.scene);
    const row = Math.floor(i / 10);
    const col = (i % 10) - 4.5;
    const fx = col * 1.08 + Math.sin(i * 3.1) * 0.22;
    const fz = 9.45 + row * 1.10 + Math.cos(i * 2.3) * 0.14;
    const sc = 0.40 + (i % 4) * 0.015; // Realistic ~1.6m fans standing on y=0 arena floor below 1.78m stage!
    fan.position.set(fx, 0.0, fz);
    fan.scale.setScalar(sc);
    fan.rotation.y = Math.PI + Math.sin(i * 1.9) * 0.22; // Face the stage!
    const tint = new THREE.Color(outfitTints[i % outfitTints.length]);
    let matIdx = 0;
    fan.traverse((o) => {
      if (o.isMesh && o.material) {
        o.material = o.material.clone();
        // Tint jacket/shirt/hoodie materials subtly for lively concert crowd variety
        if (matIdx === 1 || matIdx === 2) {
          o.material.color.lerp(tint, 0.38);
        }
        o.material.roughness = Math.max(o.material.roughness ?? 0.6, 0.55);
        matIdx++;
      }
    });
    fanGroup.add(fan);
    const mixer = new THREE.AnimationMixer(fan);
    const clapClip = src.animations.find((c) => /clapping/i.test(c.name)) || src.animations[0];
    if (clapClip) {
      const a = mixer.clipAction(clapClip);
      a.timeScale = 0.92 + (i % 5) * 0.05;
      a.play();
      mixer.setTime((i * 0.37) % Math.max(0.5, clapClip.duration));
    }
    crowdFans.push({ node: fan, mixer, baseY: 0, phase: i * 0.73 });
  }

  // 40 Waving Neon Pink & Cyan Concert Lightsticks (1 InstancedMesh draw call!)
  const stickCount = 40;
  const stickGeo = new THREE.CylinderGeometry(0.024, 0.024, 0.36, 6);
  const stickMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const sticks = new THREE.InstancedMesh(stickGeo, stickMat, stickCount);
  const stickBases = [];
  const stickDummy = new THREE.Object3D();
  const pinkCol = new THREE.Color(0xff52b8);
  const cyanCol = new THREE.Color(0x3ce8ff);
  const goldCol = new THREE.Color(0xffcf5c);
  for (let i = 0; i < stickCount; i++) {
    const row = Math.floor(i / 10);
    const col = (i % 10) - 4.5;
    const fx = col * 1.06 + Math.sin(i * 2.7) * 0.26 + (i % 2 === 0 ? 0.22 : -0.22);
    const fz = 9.35 + row * 0.72 + Math.cos(i * 1.9) * 0.14;
    const fy = 1.56 + (row * 0.04) + (i % 3) * 0.05;
    stickBases.push({ x: fx, y: fy, z: fz, phase: i * 0.61 });
    stickDummy.position.set(fx, fy, fz);
    stickDummy.rotation.set(0, 0, Math.sin(i * 1.7) * 0.35);
    stickDummy.updateMatrix();
    sticks.setMatrixAt(i, stickDummy.matrix);
    sticks.setColorAt(i, i % 5 === 0 ? goldCol : (i % 2 === 0 ? pinkCol : cyanCol));
  }
  sticks.instanceMatrix.needsUpdate = true;
  if (sticks.instanceColor) sticks.instanceColor.needsUpdate = true;
  root.add(sticks);

  // Turntable & Crew state
  let podiumLiftY = 0;
  let podiumSpin = 0;
  let podiumGather = 0;
  let beamed = false;
  let tukRisen = false;

  function setPrewarmVisible(on) {
    if (on) {
      root.visible = true;
      tukLift.visible = true;
      tukLift.position.y = 0;
      pyroPts.material.opacity = 1.0;
      for (let i = 0; i < dancers.length; i++) {
        const d = dancers[i];
        d.node.visible = true;
        d.node.position.set(PODIUM_CENTER.x + d.stageOff.x, PODIUM_CENTER.y, PODIUM_CENTER.z + d.stageOff.z);
        d.node.scale.set(1, 1, 1);
        d.beam.visible = true;
        d.beam.position.set(d.node.position.x, d.node.position.y + 3.2, d.node.position.z);
        const firstAct = d.actions['Diva'] || Object.values(d.actions)[0];
        if (firstAct) {
          firstAct.reset().play();
          d.mixer.setTime(0.1);
          d.activeClip = 'Diva';
        }
      }
      for (const cf of crowdFans) cf.mixer.update(0.016);
    } else {
      resetShow();
      root.visible = false;
    }
  }

  function resetShow() {
    podiumLiftY = 0; podiumSpin = 0; podiumGather = 0;
    beamed = false; tukRisen = false; pyroTimer = 0;
    podium.position.copy(PODIUM_CENTER);
    podium.rotation.y = 0;
    tukLift.visible = false;
    tukLift.position.y = -2.2;
    for (const d of dancers) { d.node.visible = false; d.beam.visible = false; }
  }

  function getLisaState() {
    const zOff = 1.65 + (1.82 - 1.65) * podiumGather;
    const v = new THREE.Vector3(0, 0, zOff).applyAxisAngle(new THREE.Vector3(0, 1, 0), podiumSpin);
    return {
      pos: new THREE.Vector3(PODIUM_CENTER.x + v.x, PODIUM_CENTER.y + podiumLiftY, PODIUM_CENTER.z + v.z),
      yaw: podiumSpin,
      liftY: podiumLiftY,
    };
  }

  function updateShow(delta, takeTime, fullSong, lisaClip, lisaLocalT, pulse, intensity) {
    // 1. 20-second Center Hydraulic Turntable Showpiece (113.5s -> 133.5s Full Song; 11.0s -> 17.5s Quick Take)
    const ttStart = fullSong ? 113.5 : 11.0;
    const ttEnd = fullSong ? 133.5 : 17.5;
    const gIn = Math.max(0, Math.min(1, (takeTime - (ttStart - 3.0)) / 2.8));
    const gOut = Math.max(0, Math.min(1, (takeTime - (ttEnd + 1.8)) / 2.8));
    podiumGather = smoothstep(Math.max(0, Math.min(1, gIn - gOut)));

    if (takeTime >= ttStart && takeTime < ttEnd + 2.6) {
      if (!tukRisen && takeTime < ttEnd) { tukRisen = true; triggerPyro(); }
      const el = takeTime - ttStart;
      const riseU = Math.max(0, Math.min(1, el / 2.2));
      const descU = Math.max(0, Math.min(1, (takeTime - ttEnd) / 2.4));
      podiumLiftY = smoothstep(riseU * (1 - descU)) * 0.82;
      const actSpin = Math.min(el, ttEnd - ttStart) * 0.72; // Fast, dramatic K-pop concert turntable spin!
      const targetRest = Math.round(actSpin / (Math.PI * 2)) * (Math.PI * 2);
      podiumSpin = actSpin + (targetRest - actSpin) * smoothstep(descU);
      podium.position.set(PODIUM_CENTER.x, PODIUM_CENTER.y + podiumLiftY, PODIUM_CENTER.z);
      podium.rotation.y = podiumSpin;

      const tkIn = Math.max(0, Math.min(1, el / 1.7));
      const tkOut = Math.max(0, Math.min(1, (takeTime - (ttEnd - 0.4)) / 1.9));
      const tkEnv = tkIn * (1 - tkOut);
      tukLift.visible = tkEnv > 0.01;
      tukLift.position.y = -2.2 + 2.2 * smoothstep(tkEnv);
    } else {
      podiumLiftY = 0; podiumSpin = 0;
      if (takeTime < ttStart) tukRisen = false;
      podium.position.copy(PODIUM_CENTER);
      podium.rotation.y = 0;
      tukLift.visible = false;
      tukLift.position.y = -2.2;
    }

    const lisaSt = getLisaState();
    halo.position.set(lisaSt.pos.x, lisaSt.pos.y + 0.015, lisaSt.pos.z);
    const hs = 1.0 + pulse * 0.14;
    halo.scale.set(hs, 1, hs);
    halo.rotation.y = takeTime * 0.65;
    for (const hm of haloMats) hm.opacity = Math.min(0.62, 0.28 + pulse * 0.32);

    // 2. 6 Male Backup Dancers (beam in at 32s Full Song / 6.0s Quick Take)
    const beamStart = fullSong ? 32.0 : 6.0;
    if (takeTime >= beamStart) {
      if (!beamed) { beamed = true; triggerPyro(); }
      const el = takeTime - beamStart;
      const inSync = fullSong
        ? (takeTime < 56.0 || (takeTime >= 88.0 && takeTime < 104.0) || takeTime >= 152.0)
        : (takeTime < 12.0);
      const up = new THREE.Vector3(0, 1, 0);
      for (let i = 0; i < dancers.length; i++) {
        const d = dancers[i];
        const lb = el - i * 0.06;
        if (lb < 0) { d.node.visible = false; d.beam.visible = false; continue; }
        d.node.visible = true;
        const off = d.stageOff.clone().lerp(d.podOff, podiumGather).applyAxisAngle(up, podiumSpin);
        d.node.position.set(PODIUM_CENTER.x + off.x, PODIUM_CENTER.y + podiumLiftY, PODIUM_CENTER.z + off.z);
        d.beam.position.set(d.node.position.x, d.node.position.y + 3.2, d.node.position.z);

        if (lb < 1.35) {
          d.beam.visible = true;
          const u = lb / 1.35;
          d.beam.scale.set(1.15 - u * 0.85, 1, 1.15 - u * 0.85);
          d.bmat.opacity = Math.sin(u * Math.PI) * 0.85;
          const mu = smoothstep(lb / 0.55);
          d.node.scale.set(0.08 + 0.92 * mu, 1.45 - 0.45 * mu, 0.08 + 0.92 * mu);
        } else {
          d.beam.visible = false;
          d.node.scale.set(1, 1, 1);
        }

        const want = inSync ? lisaClip : d.altClip;
        const act = d.actions[want] || d.actions['Diva'] || Object.values(d.actions)[0];
        if (act) {
          if (d.activeClip !== want) {
            for (const a of Object.values(d.actions)) a.stop();
            act.reset().play();
            d.activeClip = want;
          }
          const len = Math.max(1.0, act.getClip().duration - 0.05);
          const seekT = inSync ? (lisaLocalT % len) : ((lisaLocalT * d.speed + d.offset) % len);
          d.mixer.setTime(Math.max(0, seekT));
        }
        const freestyle = inSync ? 0 : Math.sin(takeTime * 0.9 + i * 1.3) * 0.28;
        d.node.rotation.y = podiumSpin + freestyle;
      }
    } else {
      for (const d of dancers) { d.node.visible = false; d.beam.visible = false; }
    }

    // 3. Lasers, Lights, Cheering Audience, Bokeh Embers & Pyro
    for (let i = 0; i < lasers.length; i++) {
      lasers[i].rotation.z = Math.sin(takeTime * (2.1 + 0.35 * (i % 3)) + i * 1.1) * 0.62;
      lasers[i].rotation.x = 0.28 + Math.cos(takeTime * 1.5 + i * 0.8) * 0.28;
    }
    for (let i = 0; i < stageSpots.length; i++) {
      stageSpots[i].intensity = (12 + pulse * 11) * (0.78 + 0.28 * intensity);
      stageSpots[i].target.position.set(Math.sin(takeTime * 0.9 + i) * 2.2, 2.0, 3.0 + Math.cos(takeTime * 0.7 + i) * 2.0);
    }

    // Animate real clapping concert audience + waving neon lightsticks!
    const beatWave = takeTime * (93.96 / 60) * Math.PI;
    for (let i = 0; i < crowdFans.length; i++) {
      const cf = crowdFans[i];
      cf.mixer.update(delta);
      cf.node.position.y = cf.baseY + Math.abs(Math.sin(beatWave + cf.phase)) * 0.07;
    }
    for (let i = 0; i < stickBases.length; i++) {
      const sb = stickBases[i];
      const sway = Math.sin(beatWave + sb.phase) * 0.48;
      stickDummy.position.set(sb.x + sway * 0.14, sb.y + Math.abs(Math.sin(beatWave + sb.phase)) * 0.10, sb.z);
      stickDummy.rotation.set(0, 0, sway);
      stickDummy.updateMatrix();
      sticks.setMatrixAt(i, stickDummy.matrix);
    }
    sticks.instanceMatrix.needsUpdate = true;

    // Drift embers upward
    const ep = emberGeo.attributes.position.array;
    for (let i = 0; i < emberCount; i++) {
      ep[i * 3 + 1] += delta * (0.55 + (i % 4) * 0.18);
      if (ep[i * 3 + 1] > 7.4) ep[i * 3 + 1] = 1.9;
    }
    emberGeo.attributes.position.needsUpdate = true;

    // Step pyro sparks
    if (pyroTimer > 0) {
      pyroTimer = Math.max(0, pyroTimer - delta);
      const pp = pyroGeo.attributes.position.array;
      for (let i = 0; i < pyroCount; i++) {
        pyroVel[i].y -= 7.4 * delta;
        pp[i * 3] += pyroVel[i].x * delta;
        pp[i * 3 + 1] += pyroVel[i].y * delta;
        pp[i * 3 + 2] += pyroVel[i].z * delta;
      }
      pyroGeo.attributes.position.needsUpdate = true;
      pyroPts.material.opacity = Math.min(1, pyroTimer);
    } else {
      pyroPts.material.opacity = 0;
    }
  }

  return { root, resetShow, setPrewarmVisible, getLisaState, updateShow, triggerPyro };
}
