// Crisp Native-DPR 2D HUD: Transparent Rounded Magic-Piano Touch Points + Sparkles + Virtual Thumbstick

const JEWEL = ['#ff62b0', '#b88aff', '#48e4ff', '#ffd06b'];
const PINK = '#ff72bc';
const IVORY = '#fff3f8';
const MUTED = '#d8bfd8';

function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function drawStar(ctx, x, y, r, color, alpha = 1) {
  const w = r * 0.34;
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.lineTo(x + w, y - w);
  ctx.lineTo(x + r, y);
  ctx.lineTo(x + w, y + w);
  ctx.lineTo(x, y + r);
  ctx.lineTo(x - w, y + w);
  ctx.lineTo(x - r, y);
  ctx.lineTo(x - w, y - w);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export class GameHUD {
  constructor(canvas, game) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.game = game;
    this.buttons = [];
    this.laneTargets = [null, null, null, null];
    this.stickCenter = { x: 82, y: 600 };
    this.stickId = -1;
    this.touchMove = { x: 0, y: 0 };
    this.camDragId = -1;
    this.camLast = { x: 0, y: 0 };
    this.camDrag = { dx: 0, dy: 0 };
    this.laneTouches = new Map();
    this.touchPulse = [0, 0, 0, 0];

    this._bindEvents();
  }

  consumeCamDrag() {
    const out = { dx: this.camDrag.dx, dy: this.camDrag.dy };
    this.camDrag.dx = 0;
    this.camDrag.dy = 0;
    return out;
  }

  _safeInsets() {
    const el = document.getElementById('safe');
    const cs = el ? getComputedStyle(el) : null;
    return {
      top: parseFloat(cs?.paddingTop || '0') || 0,
      right: parseFloat(cs?.paddingRight || '0') || 0,
      bottom: parseFloat(cs?.paddingBottom || '0') || 0,
      left: parseFloat(cs?.paddingLeft || '0') || 0,
    };
  }

  _bindEvents() {
    const c = this.canvas;
    const hitButton = (x, y) => {
      for (const b of this.buttons) {
        if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
          this.game.handleAction(b.id);
          return true;
        }
      }
      return false;
    };

    const hitLane = (x, y) => {
      for (let i = 0; i < 4; i++) {
        const t = this.laneTargets[i];
        if (t && x >= t.x && x <= t.x + t.w && y >= t.y && y <= t.y + t.h) return i;
      }
      return -1;
    };

    c.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.game.sound.unlock();
      const x = e.clientX, y = e.clientY;
      if (hitButton(x, y)) return;

      if (this.game.mode === 'dance' && !this.game.watchOnly) {
        const lane = hitLane(x, y);
        if (lane >= 0) {
          this.laneTouches.set(e.pointerId, lane);
          this.touchPulse[lane] = 1.0;
          this.game.hitLane(lane);
          return;
        }
      }
      if (this.game.mode === 'explore') {
        const dx = x - this.stickCenter.x;
        const dy = y - this.stickCenter.y;
        if (this.stickId < 0 && (Math.hypot(dx, dy) < 92 || (x < window.innerWidth * 0.40 && y > window.innerHeight * 0.45))) {
          this.stickId = e.pointerId;
          this._updateStick(x, y);
          c.setPointerCapture?.(e.pointerId);
        } else if (this.camDragId < 0) {
          this.camDragId = e.pointerId;
          this.camLast.x = x;
          this.camLast.y = y;
          c.setPointerCapture?.(e.pointerId);
        }
      }
    }, { passive: false });

    c.addEventListener('pointermove', (e) => {
      if (e.pointerId === this.stickId && this.game.mode === 'explore') {
        this._updateStick(e.clientX, e.clientY);
      } else if (e.pointerId === this.camDragId && this.game.mode === 'explore') {
        this.camDrag.dx += e.clientX - this.camLast.x;
        this.camDrag.dy += e.clientY - this.camLast.y;
        this.camLast.x = e.clientX;
        this.camLast.y = e.clientY;
      }
    });

    const release = (e) => {
      if (e.pointerId === this.stickId) {
        this.stickId = -1;
        this.touchMove.x = 0;
        this.touchMove.y = 0;
      }
      if (e.pointerId === this.camDragId) {
        this.camDragId = -1;
      }
      if (this.laneTouches.has(e.pointerId)) {
        const lane = this.laneTouches.get(e.pointerId);
        this.laneTouches.delete(e.pointerId);
        this.game.releaseLane?.(lane);
      }
    };
    c.addEventListener('pointerup', release);
    c.addEventListener('pointercancel', release);
  }

  _updateStick(x, y) {
    const dx = x - this.stickCenter.x;
    const dy = y - this.stickCenter.y;
    const maxR = 44;
    const d = Math.hypot(dx, dy);
    const scale = d > maxR ? maxR / d : 1;
    this.touchMove.x = (dx * scale) / maxR;
    this.touchMove.y = (dy * scale) / maxR;
  }

  _btn(id, label, x, y, w, h, primary = false) {
    const ctx = this.ctx;
    this.buttons.push({ id, x, y, w, h });
    ctx.save();
    rrect(ctx, x, y, w, h, primary ? 999 : 11);
    ctx.fillStyle = primary ? PINK : 'rgba(22, 11, 30, 0.72)';
    ctx.fill();
    ctx.strokeStyle = primary ? '#ffd8ec' : 'rgba(255, 160, 215, 0.45)';
    ctx.lineWidth = 1.25;
    ctx.stroke();
    ctx.fillStyle = primary ? '#1b0b22' : IVORY;
    ctx.font = `700 ${primary ? 14 : 12}px -apple-system, BlinkMacSystemFont, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + w * 0.5, y + h * 0.5 + 0.5);
    ctx.restore();
  }

  _panel(x, y, w, h, r = 10, fill = 'rgba(18, 9, 26, 0.68)', stroke = 'rgba(255, 155, 210, 0.30)') {
    const ctx = this.ctx;
    ctx.save();
    rrect(ctx, x, y, w, h, r);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.1;
    ctx.stroke();
    ctx.restore();
  }

  draw(delta) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (this.canvas.width !== Math.round(vw * dpr) || this.canvas.height !== Math.round(vh * dpr)) {
      this.canvas.width = Math.round(vw * dpr);
      this.canvas.height = Math.round(vh * dpr);
    }
    const ctx = this.ctx;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, vw, vh);
    this.buttons = [];
    for (let i = 0; i < 4; i++) this.touchPulse[i] = Math.max(0, this.touchPulse[i] - delta * 5.0);

    const safe = this._safeInsets();
    const portrait = vw < vh * 0.92;
    const g = this.game;

    if (g.mode === 'title') this._drawTitle(vw, vh, safe, portrait);
    else if (g.mode === 'explore') this._drawExplore(vw, vh, safe, portrait);
    else if (g.mode === 'dance') this._drawDance(vw, vh, safe, portrait);
    else if (g.mode === 'result') this._drawResult(vw, vh, safe, portrait);

    // Sleek pink transition wipe
    if (g.wipe > 0.001) {
      const amt = Math.min(g.wipe, 2.0 - g.wipe);
      const x0 = g.wipe <= 1.0 ? 0 : vw * (1.0 - amt);
      ctx.fillStyle = PINK;
      ctx.fillRect(x0, 0, vw * amt, vh);
      if (amt > 0.82 && g.slate) {
        ctx.fillStyle = '#180a20';
        ctx.font = `800 ${portrait ? 42 : 68}px -apple-system, BlinkMacSystemFont, system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(g.slate, vw * 0.5, vh * 0.5);
      }
    }
  }

  _drawTitle(vw, vh, safe, portrait) {
    const ctx = this.ctx;
    const grad = ctx.createLinearGradient(0, vh * 0.45, 0, vh);
    grad.addColorStop(0, 'rgba(18, 9, 26, 0)');
    grad.addColorStop(1, 'rgba(18, 9, 26, 0.92)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, vh * 0.45, vw, vh * 0.55);

    this._btn('sound', this.game.sound.muted ? 'SOUND OFF' : 'SOUND ON', vw - safe.right - 116, safe.top + 14, 102, 42);
    const x = safe.left + (portrait ? 22 : 64);
    const foot = vh - safe.bottom - (portrait ? 34 : 52);

    ctx.fillStyle = '#ffc5de';
    ctx.font = '700 12px -apple-system, system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('B A N G K O K   A F T E R   D A R K', x + 2, foot - 168);

    const sz = portrait ? 64 : 84;
    ctx.font = `800 ${sz}px -apple-system, system-ui, sans-serif`;
    ctx.fillStyle = IVORY;
    ctx.fillText('LaLa', x, foot - 102);
    const w1 = ctx.measureText('LaLa').width;
    ctx.fillStyle = PINK;
    ctx.fillText('Lisa', x + w1 - 2, foot - 102);

    ctx.fillStyle = '#e7d5e6';
    ctx.font = '500 16px -apple-system, system-ui, sans-serif';
    ctx.fillText('Find your stage in Yaowarat.', x + 2, foot - 68);
    this._btn('play', 'ENTER BANGKOK', x, foot - 48, 196, 48, true);
  }

  _drawExplore(vw, vh, safe, portrait) {
    const ctx = this.ctx;
    const g = this.game;
    const m = 14;
    const tlx = safe.left + m;
    const tly = safe.top + 12;

    this._panel(tlx, tly, 186, 76, 12);
    ctx.textAlign = 'left';
    ctx.fillStyle = PINK;
    ctx.font = '700 11px -apple-system, system-ui, sans-serif';
    ctx.fillText(g.areaName, tlx + 12, tly + 22);
    ctx.fillStyle = IVORY;
    ctx.font = '700 15px -apple-system, system-ui, sans-serif';
    ctx.fillText('Diva Soundstage', tlx + 12, tly + 44);
    ctx.fillStyle = MUTED;
    ctx.font = '500 12px -apple-system, system-ui, sans-serif';
    ctx.fillText(g.near ? 'Stage entrance ready!' : `${Math.ceil(g.distance)} m north`, tlx + 12, tly + 64);

    this._btn('sound', g.sound.muted ? 'SOUND OFF' : 'SOUND ON', vw - safe.right - m - 102, tly, 102, 42);
    this._btn('song_len', g.fullSong ? 'FULL SONG · 3:04' : 'QUICK TAKE · 0:21', vw - safe.right - m - 148, tly + 48, 148, 38);
    this._btn('watch_only', g.watchOnly ? 'WATCH ONLY · ON' : 'WATCH SHOW', vw - safe.right - m - 148, tly + 92, 148, 36, g.watchOnly);

    // Virtual Thumbstick
    const bottom = vh - safe.bottom - m;
    this.stickCenter = { x: tlx + 56, y: bottom - 56 };
    const active = this.stickId >= 0;
    ctx.save();
    ctx.beginPath();
    ctx.arc(this.stickCenter.x, this.stickCenter.y, 46, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(20, 10, 30, 0.58)';
    ctx.fill();
    ctx.strokeStyle = active ? PINK : 'rgba(215, 175, 225, 0.55)';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    const kx = this.stickCenter.x + this.touchMove.x * 32;
    const ky = this.stickCenter.y + this.touchMove.y * 32;
    ctx.beginPath();
    ctx.arc(kx, ky, 19, 0, Math.PI * 2);
    ctx.fillStyle = active ? 'rgba(255, 114, 188, 0.55)' : 'rgba(215, 175, 225, 0.34)';
    ctx.fill();
    ctx.strokeStyle = active ? '#ffd8ec' : 'rgba(255, 230, 245, 0.65)';
    ctx.lineWidth = 1.3;
    ctx.stroke();
    ctx.restore();

    if (g.near) {
      this._btn('play', 'START SHOW', vw - safe.right - m - 156, bottom - 54, 156, 50, true);
    }
  }

  _drawDance(vw, vh, safe, portrait) {
    const ctx = this.ctx;
    const g = this.game;
    const m = 14;
    const tlx = safe.left + m;
    const tly = safe.top + 10;
    const rx = vw - safe.right - m;

    // Top HUD pills
    this._panel(tlx, tly, 154, 60, 10);
    ctx.textAlign = 'left';
    ctx.fillStyle = PINK;
    ctx.font = '700 11px -apple-system, system-ui, sans-serif';
    ctx.fillText(`● REC · ${g.sectionName}`, tlx + 12, tly + 20);
    ctx.fillStyle = IVORY;
    ctx.font = '800 22px -apple-system, system-ui, sans-serif';
    ctx.fillText(g.watchOnly ? 'LIVE SHOW' : 'DIVA', tlx + 12, tly + 46);

    if (!g.watchOnly) {
      this._panel(rx - 138, tly, 138, 66, 10);
      ctx.textAlign = 'right';
      ctx.fillStyle = IVORY;
      ctx.font = '800 21px -apple-system, system-ui, sans-serif';
      ctx.fillText(String(g.score).padStart(5, '0'), rx - 12, tly + 24);
      ctx.fillStyle = g.combo >= 15 ? JEWEL[3] : PINK;
      ctx.font = '700 11px -apple-system, system-ui, sans-serif';
      ctx.fillText(`${g.combo}× COMBO`, rx - 12, tly + 40);
      // 5-Miss Life Hearts (lose 1 per miss; 5 misses = Show Stopped!)
      const livesLeft = Math.max(0, g.maxMisses - g.misses);
      for (let h = 0; h < g.maxMisses; h++) {
        const alive = h < livesLeft;
        ctx.fillStyle = alive ? '#ff5498' : 'rgba(255, 220, 240, 0.18)';
        ctx.font = '700 12px -apple-system, system-ui, sans-serif';
        ctx.fillText('♥', rx - 12 - (g.maxMisses - 1 - h) * 15, tly + 57);
      }
    }

    this._btn('return', 'EXIT', tlx, tly + 66, 56, 38);
    this._btn('watch_only', g.watchOnly ? 'PLAY MODE' : 'WATCH ONLY', tlx + 62, tly + 66, 98, 38, g.watchOnly);
    const camLbl = g.shot < 0 ? 'TUK CAM' : `CAM ${String(g.shot + 1).padStart(2, '0')}`;
    this._btn('camera', camLbl, rx - 78, tly + (g.watchOnly ? 10 : 72), 78, 38);

    // Watch-Only Mode: clean full-screen broadcast with just thin progress bar!
    if (g.watchOnly) {
      const width = Math.min(vw - safe.left - safe.right - m * 2, 420);
      const x0 = (vw - width) * 0.5;
      const prog = Math.max(0, Math.min(1, g.takeTime / Math.max(1, g.takeEnd)));
      const by = vh - safe.bottom - 18;
      ctx.fillStyle = 'rgba(255, 220, 240, 0.22)';
      ctx.fillRect(x0, by, width, 3);
      ctx.fillStyle = PINK;
      ctx.fillRect(x0, by, width * prog, 3);
      return;
    }

    // Transparent Rounded Magic-Piano Touch Points + Glowing Starlight Hit Line + Sparkles!
    // Raised a smidge higher off the bottom edge for comfortable thumb tapping & holding!
    const width = Math.min(vw - safe.left - safe.right - m * 2, 420);
    const gap = 10;
    const spacing = (width + gap) / 4;
    const x0 = (vw - width) * 0.5;
    const radius = portrait ? 31 : 26;
    const bottom = vh - safe.bottom - (portrait ? 56 : 30);
    const lineY = bottom - radius;
    const railH = Math.min(portrait ? 168 : 112, vh * 0.28);
    const railTop = lineY - railH;
    const lookahead = 1.52;
    const tNow = g.appTime;

    // Ultra-light bottom gradient so Lisa, Tuk-Tuk & chrome podium shine right through
    const bgGrad = ctx.createLinearGradient(0, railTop - 10, 0, vh);
    bgGrad.addColorStop(0, 'rgba(16, 8, 24, 0)');
    bgGrad.addColorStop(1, 'rgba(16, 8, 24, 0.28)');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, railTop - 10, vw, vh - railTop + 10);

    // Glowing Magic-Piano horizon line + twinkling starlight glints
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 114, 188, 0.24)';
    ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(x0 + 6, lineY); ctx.lineTo(x0 + width - 6, lineY); ctx.stroke();
    ctx.strokeStyle = 'rgba(255, 232, 246, 0.68)';
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(x0 + 6, lineY); ctx.lineTo(x0 + width - 6, lineY); ctx.stroke();
    ctx.restore();

    for (let s = 0; s < 9; s++) {
      const u = (s + 0.5) / 9;
      const tw = 0.25 + 0.75 * Math.pow(0.5 + 0.5 * Math.sin(tNow * (3.2 + (s % 3) * 1.1) + s * 1.7), 3);
      drawStar(ctx, x0 + 6 + (width - 12) * u, lineY + Math.sin(tNow * 2.0 + s) * 2.4, 2.4 + tw * 2.6, '#fff8fc', tw * 0.78);
    }

    // 4 Transparent Rounded Circular Touch Points
    for (let lane = 0; lane < 4; lane++) {
      const cx = x0 + lane * spacing + (spacing - gap) * 0.5;
      const cy = lineY;
      const ink = JEWEL[lane];
      let touched = false;
      for (const l of this.laneTouches.values()) if (l === lane) touched = true;
      const glow = Math.max(g.flash[lane], touched ? 0.9 : this.touchPulse[lane] * 0.8);

      // Shimmering vertical guide thread
      ctx.save();
      ctx.strokeStyle = ink;
      ctx.globalAlpha = 0.16;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(cx, railTop + 8); ctx.lineTo(cx, cy - radius - 2); ctx.stroke();

      // Transparent crystal glass circle fill
      ctx.globalAlpha = 0.08 + glow * 0.24;
      ctx.fillStyle = ink;
      ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.fill();

      // Soft outer halo ring
      ctx.globalAlpha = 0.16 + glow * 0.36;
      ctx.strokeStyle = ink;
      ctx.lineWidth = 3.2;
      ctx.beginPath(); ctx.arc(cx, cy, radius + 3, 0, Math.PI * 2); ctx.stroke();

      // Crisp luminous border ring
      ctx.globalAlpha = 0.58 + glow * 0.42;
      ctx.strokeStyle = glow > 0.5 ? '#fff2fa' : ink;
      ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.stroke();

      // Delicate inner crystal ring
      ctx.globalAlpha = 0.24 + glow * 0.52;
      ctx.strokeStyle = '#fff5fc';
      ctx.lineWidth = 1.0;
      ctx.beginPath(); ctx.arc(cx, cy, radius - 6, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();

      const coreR = 4.6 + glow * 3.6 + Math.sin(tNow * 4.0 + lane * 1.4) * 0.8;
      drawStar(ctx, cx, cy, coreR, '#fff4fb', 0.58 + glow * 0.42);
      this.laneTargets[lane] = { x: cx - radius - 8, y: cy - radius - 14, w: (radius + 8) * 2, h: (radius + 14) * 2 };
    }

    // Falling Translucent Magic-Piano Starlight Orbs + Synced Press-and-Hold Sustain Ribbons!
    for (const note of g.notes) {
      if (note.done) continue;
      const holdDur = note.hold || 0;
      const headRemain = note.time - g.takeTime;
      const tailRemain = (note.time + holdDur) - g.takeTime;
      if (headRemain > lookahead || tailRemain < -0.185) continue;
      const lane = note.lane;
      const ink = JEWEL[lane];
      const cx = x0 + lane * spacing + (spacing - gap) * 0.5;
      const headU = note.holding ? 0 : Math.max(0, Math.min(1, headRemain / lookahead));
      const cy = lineY - headU * railH;
      const fade = Math.max(0, Math.min(1, (lookahead - headRemain) * 5.5));
      const orbR = portrait ? 18 : 15;

      // Translucent glowing Hold Ribbon for Press-and-Hold beats!
      if (holdDur > 0) {
        const tailU = Math.max(0, Math.min(1, tailRemain / lookahead));
        const tailY = lineY - tailU * railH;
        const barW = portrait ? 18 : 14;
        if (cy - tailY > 4) {
          ctx.save();
          ctx.globalAlpha = fade * (note.holding ? 0.55 : 0.30);
          ctx.fillStyle = ink;
          rrect(ctx, cx - barW * 0.5, tailY, barW, cy - tailY, barW * 0.5);
          ctx.fill();
          ctx.globalAlpha = fade * (note.holding ? 0.95 : 0.72);
          ctx.strokeStyle = '#fff3fb';
          ctx.lineWidth = note.holding ? 2.2 : 1.4;
          rrect(ctx, cx - barW * 0.5, tailY, barW, cy - tailY, barW * 0.5);
          ctx.stroke();
          // Glowing top end-cap orb
          ctx.fillStyle = '#fff9fd';
          ctx.beginPath(); ctx.arc(cx, tailY, barW * 0.36, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        }
      }

      ctx.save();
      ctx.globalAlpha = fade * (note.holding ? 0.36 : 0.18);
      ctx.fillStyle = ink;
      ctx.beginPath(); ctx.arc(cx, cy, orbR + (note.holding ? 10 : 6), 0, Math.PI * 2); ctx.fill();

      ctx.globalAlpha = fade * (note.holding ? 0.68 : 0.44);
      ctx.fillStyle = ink;
      ctx.beginPath(); ctx.arc(cx, cy, orbR, 0, Math.PI * 2); ctx.fill();

      ctx.globalAlpha = fade * 0.94;
      ctx.strokeStyle = '#fff3fb';
      ctx.lineWidth = note.holding ? 2.6 : 1.8;
      ctx.beginPath(); ctx.arc(cx, cy, orbR, 0, Math.PI * 2); ctx.stroke();

      ctx.globalAlpha = fade * 0.85;
      ctx.fillStyle = '#fff9fd';
      ctx.beginPath(); ctx.arc(cx, cy, orbR * 0.46, 0, Math.PI * 2); ctx.fill();
      ctx.restore();

      drawStar(ctx, cx, cy, note.holding ? 9.5 : 6.2, '#ffffff', fade * 0.95);
    }

    // 360-degree Starlight Sparkle Bursts on Hit!
    for (let lane = 0; lane < 4; lane++) {
      const sp = g.flash[lane];
      if (sp > 0.08) {
        const cx = x0 + lane * spacing + (spacing - gap) * 0.5;
        const p = 1 - sp;
        ctx.save();
        ctx.globalAlpha = sp * 0.72;
        ctx.strokeStyle = JEWEL[lane];
        ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.arc(cx, lineY, 24 + p * 34, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = sp * 0.65;
        ctx.strokeStyle = '#fff6fc';
        ctx.lineWidth = 1.1;
        ctx.beginPath(); ctx.arc(cx, lineY, 16 + p * 22, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
        for (let i = 0; i < 10; i++) {
          const ang = (i / 10) * Math.PI * 2 + p * 0.45;
          const dist = 18 + (i % 3) * 8 + p * 38;
          const sr = sp * (3.2 + (i % 3) * 1.4);
          if (sr > 0.8) {
            drawStar(ctx, cx + Math.cos(ang) * dist, lineY + Math.sin(ang) * dist, sr, i % 2 === 0 ? '#fff8fc' : JEWEL[lane], sp);
          }
        }
      }
    }

    // Countdown or PERFECT/GOOD badge
    if (g.count > 0) {
      ctx.fillStyle = IVORY;
      ctx.font = '800 54px -apple-system, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(String(Math.ceil(g.count)), vw * 0.5, railTop - 20);
    } else if (g.feedbackAge < 0.55 && g.feedback) {
      const col = g.feedback === 'PERFECT' ? JEWEL[3] : IVORY;
      this._panel((vw - 112) * 0.5, railTop - 32, 112, 26, 13, 'rgba(18, 9, 26, 0.56)', col);
      ctx.fillStyle = col;
      ctx.font = '800 13px -apple-system, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(g.feedback, vw * 0.5, railTop - 15);
    }

    // Thin song progress bar
    const prog = Math.max(0, Math.min(1, g.takeTime / Math.max(1, g.takeEnd)));
    ctx.fillStyle = 'rgba(255, 220, 240, 0.22)';
    ctx.fillRect(x0, bottom + 8, width, 2);
    ctx.fillStyle = PINK;
    ctx.fillRect(x0, bottom + 8, width * prog, 2);
  }

  _drawResult(vw, vh, safe, portrait) {
    const ctx = this.ctx;
    const g = this.game;
    const grad = ctx.createLinearGradient(0, vh * 0.35, 0, vh);
    grad.addColorStop(0, 'rgba(18, 9, 26, 0)');
    grad.addColorStop(1, 'rgba(18, 9, 26, 0.94)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, vh * 0.35, vw, vh * 0.65);

    const x = safe.left + (portrait ? 22 : 68);
    const y = vh - safe.bottom - (portrait ? 225 : 210);
    const acc = g.hits / Math.max(1, g.notes.length);
    const title = g.failed
      ? 'Show Stopped'
      : g.watchOnly
        ? 'Encore Complete'
        : (acc >= 0.9 ? 'Showstopper' : acc >= 0.65 ? 'Crowd favorite' : 'One more take');

    ctx.textAlign = 'left';
    ctx.fillStyle = g.failed ? '#ff4a6e' : PINK;
    ctx.font = '700 12px -apple-system, system-ui, sans-serif';
    ctx.fillText(g.failed ? 'DIVA  /  5 MISSED BEATS' : (g.watchOnly ? 'DIVA  /  LIVE PERFORMANCE' : 'DIVA  /  TAKE COMPLETE'), x, y);
    ctx.fillStyle = IVORY;
    ctx.font = `800 ${portrait ? 38 : 56}px -apple-system, system-ui, sans-serif`;
    ctx.fillText(title, x, y + 46);
    ctx.font = '600 17px -apple-system, system-ui, sans-serif';
    ctx.fillText(g.watchOnly ? 'Hands-free K-pop broadcast mode' : `${g.score} points  ·  ${g.hits} of ${g.notes.length} cues`, x, y + 78);
    ctx.fillStyle = MUTED;
    ctx.font = '500 14px -apple-system, system-ui, sans-serif';
    ctx.fillText(g.failed ? `Missed ${g.misses} beats  ·  Best combo ${g.best}×` : `${g.perfect} perfect  ·  Best combo ${g.best}×`, x, y + 102);

    this._btn('play', g.failed ? 'TRY AGAIN' : 'SHOOT AGAIN', x, y + 122, 136, 46, true);
    this._btn('watch_only', 'WATCH ONLY', x + 144, y + 122, 126, 46);
    this._btn('return', 'BACK TO BANGKOK', x, y + 176, 174, 42);
  }
}
