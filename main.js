// LaLaLisa · Bangkok After Dark — Native Three.js High-Performance Web Engine (PC Quality)
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import { SoundEngine } from './audio.js';
import { buildYaowaratStreet, clampWalkPosition, isCameraClear, VENUE_POS } from './street.js';
import { buildDivaStage, PODIUM_CENTER } from './stage.js';
import { GameHUD } from './hud.js?v=2';

const BEAT = 60.0 / 93.96;
const FIRST_CUE = 0.624 + BEAT * 4.0;
const FULL_SONG_END = 184.5;
const QUICK_SONG_END = 21.16;

const SECTIONS = [
  { name: 'INTRO',              start:   0.0, clip: 'Diva_Intro',  intensity: 0.60 },
  { name: 'VERSE 1',            start:  16.0, clip: 'Diva_Verse',  intensity: 0.75 },
  { name: 'CHORUS 1 · CREW IN', start:  32.0, clip: 'Diva',        intensity: 1.08 },
  { name: 'VERSE 2',            start:  56.0, clip: 'Diva_Verse',  intensity: 0.82 },
  { name: 'CHORUS 2',           start:  88.0, clip: 'Diva',        intensity: 1.12 },
  { name: 'DANCE BREAK',        start: 104.0, clip: 'Diva_Break',  intensity: 1.25 },
  { name: 'BRIDGE',             start: 128.0, clip: 'Diva_Bridge', intensity: 0.70 },
  { name: 'FINAL CHORUS',       start: 152.0, clip: 'Diva_Break',  intensity: 1.30 },
];

// 24 High-Budget K-Pop Broadcast Shots (22 strictly stage-focused + 2 Fan-POV crowd shots)
// [pos, fov, targetY, dutchDeg, orbitRad, pushZ, kind]
const DIFFICULTY = {
  easy: { label: 'EASY', good: 0.28, perfect: 0.14, miss: 0.38, scale: 1 },
  normal: { label: 'NORMAL', good: 0.22, perfect: 0.11, miss: 0.30, scale: 1.5 },
  hard: { label: 'HARD', good: 0.16, perfect: 0.075, miss: 0.22, scale: 2 },
};
export { DIFFICULTY };

const SHOTS = [
  [[ 0.00, 2.15,  8.60], 42, 1.25,  0.0,  0.14, -1.20, 'low_push'],
  [[ 3.45, 2.85,  7.65], 40, 1.12, -5.5,  0.34, -0.55, 'whip'],
  [[-0.45, 3.10,  7.90], 46, 1.22,  0.0,  0.10, -0.85, 'crash'],
  [[-3.35, 4.35,  9.65], 45, 1.05,  6.2,  0.28, -0.90, 'jib'],
  [[ 2.25, 2.20,  7.80], 39, 1.18, -7.5, -0.24, -0.65, 'twist'],
  [[-2.65, 2.95,  7.45], 38, 1.16,  4.5,  0.38, -0.45, 'gimbal'],
  [[ 0.00, 4.75, 11.40], 48, 1.02,  0.0,  0.16, -1.05, 'jib'],
  [[ 1.55, 2.08,  7.45], 39, 1.24, -4.5,  0.20, -0.80, 'shake'],
  [[-3.85, 3.25,  7.85], 41, 1.10,  5.5, -0.34, -0.60, 'whip'],
  [[ 0.65, 3.05,  7.75], 45, 1.24, -2.5, -0.12, -0.80, 'crash'],
  [[ 3.75, 4.65,  9.85], 45, 1.04, -6.0, -0.26, -1.00, 'jib'],
  [[-2.10, 2.25,  7.70], 39, 1.18,  7.5,  0.24, -0.65, 'twist'],
  [[ 2.85, 3.15,  7.35], 38, 1.15, -3.8, -0.40, -0.45, 'gimbal'],
  [[-1.35, 2.12,  8.20], 40, 1.22,  3.5,  0.18, -1.10, 'low_push'],
  [[-2.15, 2.05, 11.75], 48, 1.25,  1.8,  0.14, -0.45, 'fan_pov'],
  [[-3.20, 2.65,  8.40], 41, 1.12,  6.5,  0.30, -0.65, 'shake'],
  [[ 1.85, 3.20,  7.55], 38, 1.18, -3.0,  0.16, -0.65, 'hero'],
  [[-0.35, 2.35,  8.95], 43, 1.16,  4.5, -0.32, -0.90, 'whip'],
  [[ 3.15, 3.75,  8.75], 42, 1.08, -5.0, -0.28, -0.75, 'gimbal'],
  [[-1.65, 3.15,  7.60], 38, 1.18,  3.0, -0.16, -0.65, 'hero'],
  [[ 0.35, 2.18,  7.65], 46, 1.26,  2.5,  0.14, -0.85, 'crash'],
  [[ 2.25, 2.05, 11.85], 48, 1.25, -1.8, -0.14, -0.45, 'fan_pov'],
  [[ 2.45, 2.60,  8.15], 40, 1.14, -6.5, -0.28, -0.65, 'twist'],
  [[ 0.00, 3.45,  9.85], 44, 1.08,  0.0,  0.22, -1.10, 'low_push'],
];

const QUICK_PATTERNS = [[0,2,3,1],[3,3,0,2],[1,0,2,3],[0,1,3,2],[2,0,1,3],[3,2,0,1],[0,3,2,1]];

function lerpAngle(a, b, t) {
  const diff = Math.atan2(Math.sin(b - a), Math.cos(b - a));
  return a + diff * t;
}

class LaLaLisaGame {
  constructor() {
    this.mode = 'title';
    this.fullSong = true;
    this.takeEnd = FULL_SONG_END;
    this.takeTime = -3.0;
    this.count = 3.0;
    this.appTime = 0;
    this.score = 0;
    this.combo = 0;
    this.best = 0;
    this.hits = 0;
    this.perfect = 0;
    this.misses = 0;
    this.difficulty = 'normal';
    this.burstQueue = [];
    this.failed = false;
    this.watchOnly = false;
    this.activeHolds = [null, null, null, null];
    this.notes = [];
    this.chartData = null;
    this.flash = [0, 0, 0, 0];
    this.feedback = '';
    this.feedbackAge = 99;
    this.sectionName = 'INTRO';
    this.currentSection = 0;
    this.shot = 0;
    this.manualShot = -1;
    this.camShake = 0;
    this.areaName = 'YAOWARAT NIGHT MARKET';
    this.distance = 32;
    this.near = false;
    this.wipe = 0;
    this.slate = '';
    this.transitioning = false;

    // Street walk & reinstated free-orbit city camera with full 3D collision
    this.camYaw = 0;
    this.camPitch = 0.24;
    this.camManualTimer = 0;
    this.camPos = new THREE.Vector3(0, 1.9, 13.4);
    this.motion = new THREE.Vector3();
    this.keys = new Set();

    // Blink / facial BlendShape state
    this.blinkTimer = 2.6;
    this.blinkPhase = 0;
    this.lisaMesh = null;
    this.morphMap = {};

    this.sound = new SoundEngine();
    this.videoEl = document.getElementById('stage-video');
    this.glCanvas = document.getElementById('gl');
    this.hudCanvas = document.getElementById('hud');
    this.hud = new GameHUD(this.hudCanvas, this);

    this._initRenderer();
    this._bindKeyboard();
  }

  _initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.glCanvas, antialias: true, powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2.0));
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.04;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x140d22);
    this.scene.fog = new THREE.FogExp2(0x140d22, 0.014);

    this.camera = new THREE.PerspectiveCamera(49, window.innerWidth / window.innerHeight, 0.08, 120);

    // Rich hemisphere + moonlight ambiance matching PC Forward+
    const hemi = new THREE.HemisphereLight(0xb8c8ff, 0x2b1634, 0.95);
    this.scene.add(hemi);
    const moon = new THREE.DirectionalLight(0xc8d8ff, 0.65);
    moon.position.set(12, 22, 14);
    this.scene.add(moon);

    // Post-processing with crisp, restrained UnrealBloomPass (neon glow without white halation!)
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.20, // strength (crisp neon glow, zero white blowout)
      0.38, // radius
      0.96  // threshold
    );
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());

    window.addEventListener('resize', () => {
      const w = window.innerWidth, h = window.innerHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2.0));
      this.renderer.setSize(w, h, false);
      this.composer.setSize(w, h);
    });
  }

  _bindKeyboard() {
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.keys.add(e.code);
      if (e.code === 'KeyM') this.handleAction('sound');
      else if (e.code === 'Escape') this.handleAction('return');
      else if (e.code === 'Enter' || e.code === 'Space' || e.code === 'KeyE') this.handleAction('play');
      else if (e.code === 'KeyC' && this.mode === 'dance') this.handleAction('camera');
      else if (this.mode === 'dance' && !this.watchOnly) {
        const lanes = ['ArrowLeft', 'ArrowDown', 'ArrowUp', 'ArrowRight'];
        const idx = lanes.indexOf(e.code);
        if (idx >= 0) this.hitLane(idx);
      }
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
      if (this.mode === 'dance' && !this.watchOnly) {
        const lanes = ['ArrowLeft', 'ArrowDown', 'ArrowUp', 'ArrowRight'];
        const idx = lanes.indexOf(e.code);
        if (idx >= 0) this.releaseLane(idx);
      }
    });
  }

  async boot() {
    const bar = document.getElementById('boot-bar');
    const status = document.getElementById('boot-status');
    const btn = document.getElementById('boot-btn');
    const screen = document.getElementById('boot-screen');
    const setProg = (msg, pct) => {
      if (status) status.textContent = msg;
      if (bar) bar.style.width = `${Math.round(pct * 100)}%`;
    };

    const loader = new GLTFLoader();
    setProg('Loading full-res PC Lisa…', 0.15);

    // Load full-res PC Lisa + beat chart + Yaowarat street + Diva Soundstage
    const [lisaG, chartResp, streetObj, stageObj] = await Promise.all([
      loader.loadAsync('./assets/cast/lisa.glb'),
      fetch('./assets/sound/diva_chart.json').then((r) => r.json()).catch(() => null),
      buildYaowaratStreet(loader, setProg),
      buildDivaStage(loader, this.videoEl, setProg),
    ]);

    this.chartData = chartResp;
    this.street = streetObj;
    this.stage = stageObj;
    this.scene.add(this.street.root, this.stage.root);

    // Setup full-res PC Lisa with animations & 5 facial BlendShapes!
    this.lisa = lisaG.scene;
    this.lisa.position.set(1.35, 0, 8.6);
    this.lisa.rotation.y = 0.12;
    this.lisaBones = {};
    this.lisa.traverse((o) => {
      if (o.isBone && /^(Left|Right)(Arm|ForeArm|Shoulder)$/.test(o.name)) {
        this.lisaBones[o.name] = o;
      }
      if (o.isMesh && o.morphTargetDictionary && Object.keys(o.morphTargetDictionary).length > 0) {
        this.lisaMesh = o;
        this.morphMap = o.morphTargetDictionary;
      }
    });
    // Balanced 2-point hero follow lighting on Lisa (crisp detail without blowing out front of stage)
    const heroKey = new THREE.PointLight(0xfff1e6, 1.35, 4.8, 1.8);
    heroKey.position.set(0.65, 1.85, 1.35);
    this.lisa.add(heroKey);
    const heroRim = new THREE.PointLight(0xff62b0, 1.85, 4.8, 1.8);
    heroRim.position.set(-0.85, 1.78, -1.25);
    this.lisa.add(heroRim);
    this.scene.add(this.lisa);

    this.lisaMixer = new THREE.AnimationMixer(this.lisa);
    this.lisaActions = {};
    for (const clip of lisaG.animations) {
      this.lisaActions[clip.name] = this.lisaMixer.clipAction(clip);
    }
    this.currentLisaClip = '';
    this._playLisa('Idle', 0);

    // FULL GPU PRE-WARM: upload & compile ALL shaders, VBOs, textures, Tuk-Tuk, 6 dancers, beams & crowd!
    // Prevents ANY 1-frame hitch when backup dancers beam in or Tuk-Tuk rises!
    setProg('Pre-warming GPU shaders & cast…', 0.92);
    this.street.root.visible = false;
    this.stage.setPrewarmVisible(true);
    this.camera.position.set(0, 3.1, 12.2);
    this.camera.lookAt(0, 2.4, 2.75);
    this.camera.updateMatrixWorld();
    this.renderer.compile(this.scene, this.camera);
    this.composer.render();
    this.composer.render();
    this.stage.setPrewarmVisible(false);

    // Warm up street shaders & buffers too
    this.street.root.visible = true;
    this.camera.position.set(1.6, 1.85, 13.1);
    this.camera.lookAt(0.9, 1.15, 6.2);
    this.camera.updateMatrixWorld();
    this.renderer.compile(this.scene, this.camera);
    this.composer.render();

    setProg('Ready — Bangkok After Dark', 1.0);
    btn.hidden = false;
    btn.onclick = () => {
      this.sound.unlock();
      this.sound.startCity();
      screen.classList.add('hidden');
      this.mode = 'title';
    };

    // Expose test hook for Playwright benchmark & visual QA
    window.LaLaLisaWeb = this;

    this._lastTime = performance.now();
    requestAnimationFrame((t) => this._loop(t));
  }

  _relaxIdleArms() {
    if (this.currentLisaClip !== 'Idle' || !this.lisaBones) return;
    // Gently bring Idle arms forward from behind her back so they hang naturally at her sides!
    const la = this.lisaBones.LeftArm;
    const ra = this.lisaBones.RightArm;
    const lf = this.lisaBones.LeftForeArm;
    const rf = this.lisaBones.RightForeArm;
    if (la) { la.rotation.x -= 0.44; la.rotation.z += 0.08; }
    if (ra) { ra.rotation.x -= 0.48; ra.rotation.z -= 0.04; }
    if (lf) { lf.rotation.x -= 0.24; }
    if (rf) { rf.rotation.x -= 0.24; }
  }

  _playLisa(name, fade = 0.18) {
    if (this.currentLisaClip === name) return;
    const next = this.lisaActions[name] || this.lisaActions['Idle'];
    if (!next) return;
    const prev = this.lisaActions[this.currentLisaClip];
    next.reset().play();
    if (prev && fade > 0) next.crossFadeFrom(prev, fade, false);
    else if (prev) prev.stop();
    this.currentLisaClip = name;
  }

  _transition(label, action) {
    if (this.transitioning) return;
    this.transitioning = true;
    this.slate = label;
    const t0 = performance.now();
    let fired = false;
    const step = () => {
      const el = (performance.now() - t0) / 1000;
      if (el < 0.30) {
        this.wipe = el / 0.30;
      } else {
        if (!fired) { fired = true; action(); }
        this.wipe = 1.0 + Math.min(1.0, (el - 0.30) / 0.38);
      }
      if (el < 0.68) requestAnimationFrame(step);
      else { this.wipe = 0; this.transitioning = false; }
    };
    requestAnimationFrame(step);
  }

  handleAction(id) {
    if (id === 'difficulty') {
      const order = ['easy', 'normal', 'hard'];
      this.difficulty = order[(order.indexOf(this.difficulty) + 1) % order.length];
    } else if (id === 'sound') {
      this.sound.setMuted(!this.sound.muted);
    } else if (id === 'song_len') {
      this.fullSong = !this.fullSong;
      this.takeEnd = this.fullSong ? FULL_SONG_END : QUICK_SONG_END;
    } else if (id === 'watch_only') {
      if (this.mode === 'explore' || this.mode === 'result') {
        this.watchOnly = true;
        this._transition('LIVE SHOW', () => this._enterStage());
      } else if (this.mode === 'dance') {
        this.watchOnly = !this.watchOnly;
        this.misses = 0;
        this.failed = false;
        this.activeHolds.fill(null);
      }
    } else if (id === 'camera' && this.mode === 'dance') {
      this.manualShot = (this.manualShot + 1) % SHOTS.length;
    } else if (id === 'return' && (this.mode === 'dance' || this.mode === 'result')) {
      this._transition('YAOWARAT', () => this._enterStreet(true));
    } else if (id === 'song' && this.mode === 'title') {
      this.watchOnly = false;
      this._transition('ON SET', () => this._enterStage());
    } else if (id === 'play') {
      if (this.mode === 'title') {
        this.sound.startCity();
        this._enterStreet(false);
      } else if ((this.mode === 'explore' && this.near) || this.mode === 'result') {
        this.watchOnly = false;
        this._transition('ON SET', () => this._enterStage());
      }
    }
  }

  _enterStreet(fromStage) {
    this.mode = 'explore';
    this.stage.root.visible = false;
    this.street.root.visible = true;
    this.scene.fog.density = 0.015;
    this.sound.stopStage();
    this.videoEl.pause();
    this.sound.startCity();
    this.lisa.position.set(0, 0, fromStage ? VENUE_POS.z + 4.8 : 9.4);
    this.lisa.rotation.y = Math.PI;
    this.camYaw = 0;
    this.motion.set(0, 0, 0);
    this._playLisa('Idle', 0.14);
  }

  _enterStage() {
    this.mode = 'dance';
    this.takeEnd = this.fullSong ? FULL_SONG_END : QUICK_SONG_END;
    this.street.root.visible = false;
    this.stage.root.visible = true;
    this.scene.fog.density = 0.008;
    this.stage.resetShow();
    this.sound.prepareStage();
    this.sound.playCheer();
    try { this.videoEl.currentTime = 0; } catch {}
    this.videoEl.play().catch(() => {});

    this.takeTime = -3.0;
    this.count = 3.0;
    this.score = 0; this.combo = 0; this.best = 0; this.hits = 0; this.perfect = 0;
    this.misses = 0; this.failed = false;
    this.activeHolds.fill(null);
    this.feedback = ''; this.feedbackAge = 99;
    this.flash.fill(0);
    this.shot = 0; this.manualShot = -1; this.currentSection = 0;
    this.sectionName = this.fullSong ? 'INTRO' : 'DIVA';

    // Build beat-locked notes + synced Press-and-Hold sustain beats!
    this.notes = [];
    if (this.fullSong && this.chartData?.cues) {
      for (const c of this.chartData.cues) {
        if (c.time < this.takeEnd - 0.8) this.notes.push({ lane: c.lane, time: c.time, hold: 0, holding: false, done: false });
      }
    } else {
      for (let bar = 0; bar < QUICK_PATTERNS.length; bar++) {
        for (let step = 0; step < 4; step++) {
          const lane = QUICK_PATTERNS[bar][step];
          const at = FIRST_CUE + (bar * 4 + step) * BEAT;
          this.notes.push({ lane, time: at, hold: 0, holding: false, done: false });
          if (bar >= 3 && step === 2) this.notes.push({ lane: (lane + 2) % 4, time: at + BEAT * 0.5, hold: 0, holding: false, done: false });
        }
      }
    }
    // Automatically convert well-spaced musical sustain beats into Press-and-Hold ribbons!
    let eligibleCount = 0;
    for (let i = 0; i < this.notes.length; i++) {
      const n = this.notes[i];
      let nextSame = 999;
      for (let j = i + 1; j < this.notes.length; j++) {
        if (this.notes[j].lane === n.lane) { nextSame = this.notes[j].time - n.time; break; }
      }
      if (nextSame >= 1.15 && n.time + BEAT * 1.5 < this.takeEnd - 1.0) {
        eligibleCount++;
        if (eligibleCount % 4 === 2) {
          n.hold = Math.min(nextSame - 0.38, BEAT * 1.75);
        }
      }
    }

    const st = this.stage.getLisaState();
    this.lisa.position.copy(st.pos);
    this.lisa.rotation.y = st.yaw;
    this._playLisa(this.fullSong ? 'Diva_Intro' : 'Diva', 0);
  }

  hitLane(lane) {
    if (this.mode !== 'dance' || this.count > 0 || this.watchOnly) return;
    const D = DIFFICULTY[this.difficulty];
    let bestNote = null, bestErr = D.good;
    for (const n of this.notes) {
      if (n.lane === lane && !n.done && !n.holding) {
        const err = Math.abs(n.time - this.takeTime);
        if (err < bestErr) { bestErr = err; bestNote = n; }
      }
    }
    if (!bestNote) return;
    const exact = bestErr < D.perfect;
    if (bestNote.hold > 0) {
      // Press-and-Hold beat started!
      bestNote.holding = true;
      bestNote.exactStart = exact;
      this.activeHolds[lane] = bestNote;
      this.flash[lane] = 1.0;
      this.camShake = Math.max(this.camShake, 0.22);
      this.feedback = 'HOLD';
      this.feedbackAge = 0;
      return;
    }
    bestNote.done = true;
    this.hits++;
    this.combo++;
    this.best = Math.max(this.best, this.combo);
    if (exact) this.perfect++;
    this.score += this._points(exact ? 1000 : 600);
    this.flash[lane] = 1.0;
    this.camShake = Math.max(this.camShake, exact ? 0.34 : 0.16);
    this.feedback = exact ? 'PERFECT' : 'GOOD';
    this.feedbackAge = 0;
    this._celebrate(lane, exact ? 'perfect' : 'good');
    if (this.combo % 7 === 0) this.sound.playCheer();
    if (this.combo % 10 === 0) {
      this._celebrate(lane, 'combo'); this.camShake = Math.max(this.camShake, 0.62); this.stage.triggerPyro(); }
  }

  releaseLane(lane) {
    const note = this.activeHolds[lane];
    if (!note || note.done) return;
    this.activeHolds[lane] = null;
    note.holding = false;
    note.done = true;
    const endT = note.time + note.hold;
    const remain = endT - this.takeTime;
    const progress = (this.takeTime - note.time) / Math.max(0.1, note.hold);
    if (remain <= 0.26 || progress >= 0.78) {
      this.hits++;
      this.combo++;
      this.best = Math.max(this.best, this.combo);
      if (note.exactStart) this.perfect++;
      this.score += this._points(1500);
      this.flash[lane] = 1.0;
      this.feedback = 'PERFECT';
      this._celebrate(lane, 'perfect');
      this.feedbackAge = 0;
    } else if (progress >= 0.42) {
      this.hits++;
      this.combo++;
      this.best = Math.max(this.best, this.combo);
      this.score += this._points(800);
      this.feedback = 'GOOD';
      this._celebrate(lane, 'good');
      this.feedbackAge = 0;
    } else {
      this._registerMiss();
    }
  }

  // Combo multiplier grows x1 -> x4 every 10 hits, scaled by difficulty.
  _points(base) {
    return Math.round(base * this.multiplier() * DIFFICULTY[this.difficulty].scale);
  }

  multiplier() {
    return Math.min(4, 1 + Math.floor(this.combo / 10));
  }

  _celebrate(lane, kind) {
    if (this.burstQueue.length < 12) this.burstQueue.push({ lane, kind });
    const pattern = kind === 'combo' ? [20, 40, 20, 40, 40] : kind === 'perfect' ? 14 : kind === 'good' ? 8 : 0;
    if (pattern) navigator.vibrate?.(pattern);
  }

  _registerMiss() {
    if (this.watchOnly || this.mode !== 'dance') return;
    this.combo = 0;
    this.misses++;
    this.feedback = 'MISS';
    this.feedbackAge = 0;
    navigator.vibrate?.(35);
    // Like Magic Piano: misses only break the combo; the song always plays through.
  }

  _updateExplore(delta) {
    const kbX = (this.keys.has('KeyD') || this.keys.has('ArrowRight') ? 1 : 0) - (this.keys.has('KeyA') || this.keys.has('ArrowLeft') ? 1 : 0);
    const kbY = (this.keys.has('KeyS') || this.keys.has('ArrowDown') ? 1 : 0) - (this.keys.has('KeyW') || this.keys.has('ArrowUp') ? 1 : 0);
    let ix = kbX + this.hud.touchMove.x;
    let iy = kbY + this.hud.touchMove.y;
    const len = Math.hypot(ix, iy);
    if (len > 1) { ix /= len; iy /= len; }

    const running = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') || len > 0.85;
    const topSpeed = running ? 3.65 : 2.25;
    const desiredVel = new THREE.Vector3(ix, 0, iy).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.camYaw).multiplyScalar(len > 0.08 ? topSpeed : 0);
    this.motion.lerp(desiredVel, 1 - Math.exp(-delta * 12));

    // Full 3D wall/building/prop collision + Bangkok building stair climbing!
    const moved = this.street.resolveMove(
      this.lisa.position,
      this.lisa.position.x + this.motion.x * delta,
      this.lisa.position.z + this.motion.z * delta
    );
    this.lisa.position.x = moved.x;
    this.lisa.position.z = moved.z;
    this.lisa.position.y += (moved.y - this.lisa.position.y) * (1 - Math.exp(-delta * 16));
    this.areaName = moved.area;

    const spd = Math.hypot(this.motion.x, this.motion.z);
    if (spd > 0.16) {
      const targetRot = Math.atan2(this.motion.x, this.motion.z);
      this.lisa.rotation.y = lerpAngle(this.lisa.rotation.y, targetRot, 1 - Math.exp(-delta * 13));
      this._playLisa(spd > 2.75 ? 'Run' : 'Walk', 0.16);
    } else {
      this._playLisa('Idle', 0.20);
    }
    this.lisaMixer.update(delta);
    this._relaxIdleArms();

    this.distance = Math.hypot(this.lisa.position.x - VENUE_POS.x, this.lisa.position.z - VENUE_POS.z);
    this.near = this.distance < 3.1;

    // REINSTATED FREE-ORBIT CITY CAMERA WITH FULL 3D BUILDING/WALL/STAIR COLLISION!
    const drag = this.hud.consumeCamDrag();
    if (Math.abs(drag.dx) > 0.01 || Math.abs(drag.dy) > 0.01) {
      this.camYaw -= drag.dx * 0.0075;
      this.camPitch = Math.max(0.08, Math.min(0.62, this.camPitch + drag.dy * 0.0055));
      this.camManualTimer = 2.6;
    } else if (this.camManualTimer > 0) {
      this.camManualTimer = Math.max(0, this.camManualTimer - delta);
    }
    // Keyboard Q/E camera orbit fallback on desktop
    if (this.keys.has('KeyQ')) { this.camYaw += delta * 2.0; this.camManualTimer = 2.0; }
    if (this.keys.has('KeyE') && !this.near) { this.camYaw -= delta * 2.0; this.camManualTimer = 2.0; }

    const portrait = window.innerWidth < window.innerHeight * 0.92;
    const dist = portrait ? 3.55 : 4.05;
    const horizDist = Math.cos(this.camPitch) * dist;
    const vertHeight = 1.15 + Math.sin(this.camPitch) * dist;
    const arm = new THREE.Vector3(0, vertHeight, horizDist).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.camYaw);
    const camOrigin = new THREE.Vector3(this.lisa.position.x, this.lisa.position.y + 1.32, this.lisa.position.z);
    const rawDesired = new THREE.Vector3(this.lisa.position.x + arm.x, this.lisa.position.y + arm.y, this.lisa.position.z + arm.z);

    // Real 3D Raycast camera collision against ALL buildings, walls, stairs, stalls & tuk-tuks!
    const safeCam = this.street.resolveCamera(camOrigin, rawDesired);
    this.camera.position.lerp(safeCam, 1 - Math.exp(-delta * 12.0));
    this.camera.fov = portrait ? 54 : 49;
    this.camera.updateProjectionMatrix();
    const lookAhead = new THREE.Vector3(0, 1.25, -0.55).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.camYaw);
    this.camera.lookAt(this.lisa.position.clone().add(lookAhead));

    this.street.tick(delta, this.appTime, this.lisa.position);
    this.sound.updateCitySpatial(this.lisa.position, this.street.speakerPositions);
  }

  _updateDance(delta) {
    if (this.mode === 'dance') {
      if (this.count > 0) {
        this.count = Math.max(0, this.count - delta);
        this.takeTime = -this.count;
        if (this.count === 0) {
          this.sound.playStage();
          try { this.videoEl.currentTime = 0; } catch {}
          this.videoEl.play().catch(() => {});
        }
      } else {
        const audioT = this.sound.trackPlaying ? this.sound.trackTime : (this.takeTime + delta);
        this.takeTime = Math.max(this.takeTime, Math.min(this.takeTime + 0.05, audioT));
        // Keep HD stage video locked tightly to song time
        if (!this.videoEl.paused && Math.abs(this.videoEl.currentTime - this.takeTime) > 0.35) {
          try { this.videoEl.currentTime = this.takeTime % Math.max(1, this.videoEl.duration || 186); } catch {}
        }
        // Tick active Press-and-Hold sustain beats + check missed notes
        if (!this.watchOnly) {
          for (let lane = 0; lane < 4; lane++) {
            const hn = this.activeHolds[lane];
            if (hn && !hn.done) {
              this.flash[lane] = Math.max(this.flash[lane], 0.72);
              if (this.takeTime >= hn.time + hn.hold) {
                hn.holding = false;
                hn.done = true;
                this.activeHolds[lane] = null;
                this.hits++;
                this.combo++;
                this.best = Math.max(this.best, this.combo);
                this.perfect++;
                this.score += this._points(1600);
                this.flash[lane] = 1.0;
                this.camShake = Math.max(this.camShake, 0.36);
                this.feedback = 'PERFECT';
                this._celebrate(lane, 'perfect');
                this.feedbackAge = 0;
              }
            }
          }
          for (const n of this.notes) {
            if (!n.done && !n.holding && this.takeTime - n.time > DIFFICULTY[this.difficulty].miss) {
              n.done = true;
              this._registerMiss();
              if (this.failed) break;
            }
          }
        }
        if (this.mode === 'dance' && this.takeTime >= this.takeEnd) {
          this.sound.stopStage();
          this.sound.playCheer();
          this.mode = 'result';
        }
      }
    }

    // Select active K-pop choreography section
    let secIdx = 0;
    if (this.fullSong) {
      for (let i = SECTIONS.length - 1; i >= 0; i--) {
        if (this.takeTime >= SECTIONS[i].start) { secIdx = i; break; }
      }
    }
    const sec = SECTIONS[secIdx];
    this.sectionName = this.fullSong ? sec.name : 'DIVA';
    const wantClip = this.fullSong ? sec.clip : 'Diva';
    if (secIdx !== this.currentSection) {
      this.currentSection = secIdx;
      if (sec.intensity >= 1.0) this.stage.triggerPyro();
    }
    this._playLisa(wantClip, 0);
    const act = this.lisaActions[this.currentLisaClip];
    const clipLen = Math.max(1.0, (act?.getClip()?.duration || 15) - 0.05);
    const localT = this.fullSong
      ? Math.max(0, this.takeTime - sec.start) % clipLen
      : Math.max(0, this.takeTime - 0.624) % clipLen;
    this.lisaMixer.setTime(localT);

    const secInt = this.fullSong ? sec.intensity : 1.05;
    const beatPunch = Math.pow(Math.max(0, Math.cos(Math.max(0, this.takeTime - FIRST_CUE) / BEAT * Math.PI)), 4) * secInt;
    const hitPulse = this.feedback !== 'MISS' ? Math.max(0, 1 - this.feedbackAge * 5) : 0;

    this.stage.updateShow(delta, Math.max(0, this.takeTime), this.fullSong, wantClip, localT, Math.max(hitPulse, beatPunch * 0.72), secInt);
    const st = this.stage.getLisaState();
    this.lisa.position.copy(st.pos);
    this.lisa.rotation.y = st.yaw;

    // 24 High-Budget K-Pop Broadcast Cameras + Smooth Continuous Tuk-Tuk Concert Orbit + 2 Fan-POV Crowd Shots!
    const beatsPerCut = secInt >= 1.0 ? 2.0 : 4.0;
    const beatIdx = Math.max(0, (this.takeTime - FIRST_CUE) / BEAT) / beatsPerCut;
    let index = this.mode === 'result' ? 6 : Math.floor(beatIdx) % SHOTS.length;
    const beamStart = this.fullSong ? 32.0 : 6.0;
    const ttStart = this.fullSong ? 113.5 : 11.0;
    const ttEnd = this.fullSong ? 133.5 : 17.5;
    const portrait = window.innerWidth < window.innerHeight * 0.92;

    this.camShake = Math.max(0, this.camShake - delta * 3.6);

    // DYNAMIC 6-ANGLE TUK-TUK CONCERT CUTS:
    // Overhead Crane Down -> Hero on Lisa -> High Diagonal Wide -> Fan-POV Crowd -> Opposite Hero -> Pull-Out Wide!
    const inTukShow = this.mode === 'dance' && this.manualShot < 0 &&
      this.takeTime >= ttStart - 0.3 && this.takeTime < ttEnd + 2.2;

    if (inTukShow) {
      const el = Math.max(0, this.takeTime - ttStart);
      const total = (ttEnd + 2.2) - ttStart;
      const phaseDur = total / 6.0;
      const phase = Math.min(5, Math.floor(el / phaseDur));
      const pf = Math.max(0, Math.min(1, (el - phase * phaseDur) / phaseDur));
      const smoothPf = pf * pf * (3 - 2 * pf);

      let pos, target, targetFov, dutch = 0;
      const podCenter = new THREE.Vector3(PODIUM_CENTER.x, PODIUM_CENTER.y + st.liftY + 1.05, PODIUM_CENTER.z);
      const lisaHero = new THREE.Vector3(st.pos.x, st.pos.y + 1.18, st.pos.z);

      if (phase === 0) {
        // 1. High Overhead / Bird's-Eye Crane Down onto rising fast-spinning Tuk-Tuk + disc
        pos = new THREE.Vector3(Math.sin(pf * 1.1) * 1.8, 6.25 - smoothPf * 1.25, 6.45 + smoothPf * 1.15);
        target = podCenter.clone();
        targetFov = (portrait ? 58 : 46) - smoothPf * 3;
      } else if (phase === 1) {
        // 2. Hero Medium-Wide on Lisa (safe distance so never too close to dancers!)
        pos = new THREE.Vector3(-2.35 + smoothPf * 1.8, 2.75 + st.liftY * 0.85, 8.65 - smoothPf * 0.45);
        target = lisaHero.clone().lerp(podCenter, 0.25);
        targetFov = portrait ? 50 : 39;
        dutch = -2.5;
      } else if (phase === 2) {
        // 3. Sweeping High Diagonal Wide showing whole spinning disc, dancers inside yellow ring & video screen
        pos = new THREE.Vector3(3.85 - smoothPf * 1.4, 4.45 + st.liftY * 0.65, 9.75 - smoothPf * 0.55);
        target = podCenter.clone();
        targetFov = portrait ? 56 : 44;
        dutch = 3.5;
      } else if (phase === 3) {
        // 4. Fan-POV Crowd Shot looking right over cheering fans & waving lightsticks up at spinning Tuk-Tuk!
        pos = new THREE.Vector3(-2.10 + smoothPf * 1.3, 2.08, 11.75);
        target = podCenter.clone().add(new THREE.Vector3(0, 0.25, 0));
        targetFov = portrait ? 58 : 47;
        dutch = 1.5;
      } else if (phase === 4) {
        // 5. Opposite Hero Tracking on Lisa as turntable whips around
        pos = new THREE.Vector3(2.45 - smoothPf * 1.6, 2.85 + st.liftY * 0.85, 8.85 - smoothPf * 0.45);
        target = lisaHero.clone().lerp(podCenter, 0.25);
        targetFov = portrait ? 50 : 39;
        dutch = 2.5;
      } else {
        // 6. Grand Arena Pull-Out Wide as turntable descends back into stage!
        pos = new THREE.Vector3(0.0, 3.65 + smoothPf * 0.95, 9.40 + smoothPf * 2.45);
        target = podCenter.clone();
        targetFov = (portrait ? 56 : 44) + smoothPf * 4;
      }

      pos.x = Math.max(-4.85, Math.min(4.85, pos.x));
      pos.y = Math.max(phase === 3 ? 1.95 : 2.10, Math.min(6.45, pos.y));
      pos.z = Math.max(5.45, pos.z);

      const smag = (this.camShake * 0.03 + beatPunch * 0.018);
      const svec = new THREE.Vector3(
        Math.sin(this.appTime * 29) * Math.cos(this.appTime * 15),
        Math.cos(this.appTime * 25) * Math.sin(this.appTime * 17),
        0
      ).multiplyScalar(smag);

      const shotId = -10 - phase;
      if (this.shot !== shotId) {
        this.shot = shotId;
        this.camera.position.copy(pos).add(svec);
        this.camera.fov = targetFov - beatPunch * 1.6;
      } else {
        this.camera.position.lerp(pos, 1 - Math.exp(-delta * 9.5)).add(svec);
        this.camera.fov += ((targetFov - beatPunch * 1.6) - this.camera.fov) * (1 - Math.exp(-delta * 12));
      }
      this.camera.updateProjectionMatrix();
      this.camera.lookAt(target);
      this.camera.rotateZ(THREE.MathUtils.degToRad(dutch));
      return;
    }

    if (this.mode === 'dance' && this.manualShot < 0 && this.takeTime >= beamStart - 0.25 && this.takeTime < beamStart + 2.8) {
      index = 6;
    } else if (this.mode === 'dance' && this.manualShot >= 0) {
      index = this.manualShot;
    }

    const cut = SHOTS[index];
    const kind = cut[6];
    const frac = beatIdx - Math.floor(beatIdx);
    // Expressive K-pop broadcast speed-ramp curve (fast explosive entry -> silky locked glide!)
    const ramp = 1 - Math.pow(1 - frac, 2.6);
    const easedDrift = ramp - 0.5;
    // Keep Lisa cleanly framed across ALL cuts (bias target toward Lisa's actual stage position!)
    const lisaCenter = st.pos.clone().add(new THREE.Vector3(0, cut[2], 0));
    const stageCenter = new THREE.Vector3(0, 1.78 + st.liftY + cut[2], 2.75);
    const target = (kind === 'hero' || kind === 'crash' || kind === 'low_push')
      ? lisaCenter
      : stageCenter.lerp(lisaCenter, kind === 'fan_pov' ? 0.45 : 0.72);

    const basePos = new THREE.Vector3(cut[0][0], cut[0][1] + st.liftY * 0.85, cut[0][2]);
    const offset = basePos.clone().sub(target);
    const orbitMult = (kind === 'jib' || kind === 'gimbal') ? 1.55 : 1.32;
    offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), easedDrift * cut[4] * orbitMult);
    if (kind === 'whip') {
      const whipEase = Math.pow(Math.max(0, 1 - frac * 3.8), 2.5);
      offset.x += whipEase * (cut[4] > 0 ? 2.6 : -2.6);
      offset.y += whipEase * 0.35;
    } else if (kind === 'jib') {
      offset.y += Math.sin(frac * Math.PI) * 0.52;
    } else if (kind === 'gimbal') {
      offset.y += Math.sin(frac * Math.PI * 2.0) * 0.22;
    } else if (kind === 'low_push') {
      offset.y += easedDrift * 0.42;
    } else {
      offset.y += easedDrift * 0.24;
    }
    const pushMult = (kind === 'low_push' || kind === 'crash') ? 1.38 : 1.18;
    const pos = target.clone().add(offset).addScaledVector(offset.clone().normalize(), easedDrift * cut[5] * pushMult);

    // Strict front-arena safe clamp
    pos.x = Math.max(-4.85, Math.min(4.85, pos.x));
    pos.y = Math.max(kind === 'fan_pov' ? 1.42 : 1.92, Math.min(6.35, pos.y));
    pos.z = Math.max(5.15, pos.z);

    const bassMult = kind === 'shake' ? 0.24 : (secInt >= 1.0 ? 0.07 : 0.025);
    const smag = this.mode === 'dance' ? (this.camShake * 0.04 + beatPunch * bassMult * 0.05) : 0;
    const svec = new THREE.Vector3(
      Math.sin(this.appTime * 31) * Math.cos(this.appTime * 15),
      Math.cos(this.appTime * 27) * Math.sin(this.appTime * 19),
      0
    ).multiplyScalar(smag);

    let fov = cut[1];
    if (portrait) fov += 12; // Portrait vertical framing headroom
    if (kind === 'crash') {
      const zu = Math.min(1, frac * 2.6);
      fov -= 14 * (zu * zu * (3 - 2 * zu));
    } else if (kind === 'whip') {
      fov += Math.pow(Math.max(0, 1 - frac * 3.8), 2.2) * 7.5;
    }
    const targetFov = fov - beatPunch * (kind === 'shake' ? 3.2 : 2.2) - this.camShake * 0.8;

    let dutch = cut[3];
    if (kind === 'twist') dutch = dutch + (-dutch * 1.75) * ramp;
    else if (kind === 'whip') dutch += Math.pow(Math.max(0, 1 - frac * 3.8), 2.2) * (cut[4] > 0 ? -7.5 : 7.5);
    const targetRoll = THREE.MathUtils.degToRad(dutch);

    if (this.shot !== index) {
      this.shot = index;
      this.camera.position.copy(pos).add(svec);
      this.camera.fov = targetFov;
    } else {
      this.camera.position.lerp(pos, 1 - Math.exp(-delta * 11.5)).add(svec);
      this.camera.fov += (targetFov - this.camera.fov) * (1 - Math.exp(-delta * 16));
    }
    this.camera.updateProjectionMatrix();
    this.camera.lookAt(target);
    this.camera.rotateZ(targetRoll);
  }

  _updateFace(delta) {
    if (!this.lisaMesh || !this.lisaMesh.morphTargetInfluences) return;
    const inf = this.lisaMesh.morphTargetInfluences;
    this.blinkTimer -= delta;
    if (this.blinkTimer <= 0) {
      this.blinkPhase = 0.16;
      this.blinkTimer = 2.8 + ((this.appTime * 1.37) % 1.8);
    }
    let blink = 0;
    if (this.blinkPhase > 0) {
      this.blinkPhase = Math.max(0, this.blinkPhase - delta);
      blink = Math.sin((this.blinkPhase / 0.16) * Math.PI);
    }
    let smile = 0.34 + 0.12 * Math.sin(this.appTime * 0.9);
    let singA = 0, singO = 0, brow = 0.12;
    if (this.mode === 'dance' && this.takeTime >= 0) {
      const bp = this.takeTime * (93.96 / 60) * Math.PI * 2;
      const env = 0.5 + 0.5 * Math.sin(bp * 0.5) * Math.cos(bp * 0.25 + 0.6);
      singA = Math.min(0.92, Math.pow(Math.max(0, Math.sin(bp + 0.4)), 2) * (0.35 + 0.55 * env));
      singO = Math.min(0.75, Math.pow(Math.max(0, Math.cos(bp * 0.5 - 0.3)), 2) * 0.55 * (1 - singA * 0.5));
      smile = Math.min(1, 0.38 + Math.min(0.5, this.combo / 14) - singA * 0.25);
      brow = Math.min(1, 0.22 + 0.18 * Math.max(0, Math.sin(bp)));
    }
    if ('Blink' in this.morphMap) inf[this.morphMap.Blink] = blink;
    if ('Smile' in this.morphMap) inf[this.morphMap.Smile] = smile;
    if ('Sing_A' in this.morphMap) inf[this.morphMap.Sing_A] = singA;
    if ('Sing_O' in this.morphMap) inf[this.morphMap.Sing_O] = singO;
    if ('BrowLift' in this.morphMap) inf[this.morphMap.BrowLift] = brow;
  }

  _loop(now) {
    const delta = Math.min(0.05, Math.max(0.001, (now - this._lastTime) / 1000));
    this._lastTime = now;
    this.appTime += delta;
    this.feedbackAge += delta;
    for (let i = 0; i < 4; i++) this.flash[i] = Math.max(0, this.flash[i] - delta * 5.0);

    if (this.mode === 'title') {
      const portrait = window.innerWidth < window.innerHeight * 0.92;
      this.camera.fov = portrait ? 52 : 49;
      this.camera.updateProjectionMatrix();
      this.camera.position.set(1.6 + Math.sin(this.appTime * 0.38) * 0.38, 1.85, 13.1);
      this.camera.lookAt(portrait ? new THREE.Vector3(0.9, 1.15, 6.2) : new THREE.Vector3(-0.6, 1.35, 0.0));
      this.lisaMixer.update(delta);
    this._relaxIdleArms();
      this.street.tick(delta, this.appTime, this.lisa.position);
    } else if (this.mode === 'explore') {
      this._updateExplore(delta);
    } else {
      this._updateDance(delta);
    }

    this._updateFace(delta);
    this.composer.render();
    this.hud.draw(delta);
    requestAnimationFrame((t) => this._loop(t));
  }
}

const game = new LaLaLisaGame();
game.boot();
