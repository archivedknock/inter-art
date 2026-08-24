// 삐에로 저글링 — 어도비 여섯 개를 손바닥으로 튕겨 올린다.
//
// 떨어뜨린 프로그램은 강제 종료된다. 잠시 뒤 다시 실행되므로 끝은 없다.
// 배경은 인물만 오려내 별밭 위에 세운다.
//
// 계산과 그리기는 화면 좌표(미러 해제)에서 한다. 아이콘의 두 글자가 뒤집히면
// 무슨 프로그램인지 알 수 없기 때문이다. 손·얼굴 좌표는 들여올 때 한 번만 뒤집는다.

import { ac, fxOut } from "./audio.js";
import { sx, sy, len, base } from "./view.js";

const FONT = `"Pretendard Variable", "Pretendard", -apple-system, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif`;
const MONO = `"SF Mono", "Menlo", "Consolas", "Courier New", monospace`;

const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

/** 자리마다 늘 같은 값을 내는 난수 — 화면 크기가 바뀌어도 별밭이 뒤바뀌지 않는다 */
const frac = (n) => {
  const v = Math.sin(n) * 43758.5453;
  return v - Math.floor(v);
};

/* ── 어도비 ──────────────────────────────────────────── */

// 실제 CC 아이콘 색. 튕길 때 나는 음도 함께 둔다 — 프로그램마다 소리가 달라야
// 무엇이 살아 있는지 아이콘을 보지 않고도 안다.
const APPS = [
  { id: "Ps", name: "Adobe Photoshop",     bg: "#001e36", fg: "#31a8ff", note: 523.25 },
  { id: "Ai", name: "Adobe Illustrator",   bg: "#330000", fg: "#ff9a00", note: 587.33 },
  { id: "Ae", name: "Adobe After Effects", bg: "#00005b", fg: "#9999ff", note: 659.25 },
  { id: "Pr", name: "Adobe Premiere Pro",  bg: "#00005b", fg: "#9999ff", note: 698.46 },
  { id: "Id", name: "Adobe InDesign",      bg: "#49021f", fg: "#ff3366", note: 783.99 },
  { id: "Lr", name: "Adobe Lightroom",     bg: "#001e36", fg: "#31a8ff", note: 880.00 },
];

const SKY = "#2a3ddb";
const STAR = "#efe6d4";
const CREAM = "#f2ece0";
const RED = "#e02b20";

/* ── 소리 ────────────────────────────────────────────── */

/** 아이콘을 튕겨 올릴 때의 짧은 톡 */
function pop(freq) {
  try {
    const a = ac();
    const t = a.currentTime;
    const osc = a.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.7, t + 0.09);
    const gain = a.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.2, t + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    osc.connect(gain).connect(fxOut());
    osc.start(t);
    osc.stop(t + 0.14);
  } catch { /* 소리는 실패해도 진행에 영향 없음 */ }
}

/** 프로그램이 하나 더 실행될 때 — 짧게 올라가는 두 음 */
function launch() {
  try {
    const a = ac();
    const t = a.currentTime;
    [[440, 0], [660, 0.08]].forEach(([f, at]) => {
      const osc = a.createOscillator();
      osc.type = "sine";
      osc.frequency.value = f;
      const gain = a.createGain();
      gain.gain.setValueAtTime(0.0001, t + at);
      gain.gain.exponentialRampToValueAtTime(0.18, t + at + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + at + 0.34);
      osc.connect(gain).connect(fxOut());
      osc.start(t + at);
      osc.stop(t + at + 0.38);
    });
  } catch { /* 무시 */ }
}

/** 강제 종료 — 낮게 깨지는 소리 */
function crash() {
  try {
    const a = ac();
    const t = a.currentTime;

    const dur = 0.4;
    const buf = a.createBuffer(1, a.sampleRate * dur, a.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < ch.length; i++) {
      ch[i] = (Math.random() * 2 - 1) * (1 - i / ch.length) ** 2;
    }
    const src = a.createBufferSource();
    src.buffer = buf;
    const filter = a.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 800;
    const ng = a.createGain();
    ng.gain.value = 0.26;
    src.connect(filter).connect(ng).connect(fxOut());
    src.start(t);

    const osc = a.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(48, t + 0.45);
    const gain = a.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
    osc.connect(gain).connect(fxOut());
    osc.start(t);
    osc.stop(t + 0.6);
  } catch { /* 무시 */ }
}

/* ── 손바닥 ──────────────────────────────────────────── */

const PALM = [0, 5, 9, 13, 17];

/** 손바닥 자리와 크기 (화면 좌표) */
function palmsOf(handResult, W, H) {
  const out = [];
  for (const lm of (handResult?.landmarks ?? []).slice(0, 2)) {
    let cx = 0, cy = 0;
    for (const i of PALM) { cx += sx(lm[i].x * W, W); cy += sy(lm[i].y * H, H); }
    const size = len(Math.hypot((lm[9].x - lm[0].x) * W, (lm[9].y - lm[0].y) * H));
    out.push({ x: cx / PALM.length, y: cy / PALM.length, r: size * 0.75, vx: 0, vy: 0 });
  }
  return out;
}

/* ── 얼굴 → 분장 자리 ────────────────────────────────── */

/** 코·볼·이마와 얼굴 기울기 (화면 좌표) */
function clownOf(faceResult, W, H) {
  const lm = faceResult?.faceLandmarks?.[0];
  if (!lm) return null;
  const P = (i) => ({ x: sx(lm[i].x * W, W), y: sy(lm[i].y * H, H) });

  const top = P(10), chin = P(152), a = P(234), b = P(454);
  const width = Math.hypot(b.x - a.x, b.y - a.y);
  if (!width) return null;

  // 이마에서 턱으로 내려가는 방향을 뒤집어 얼굴이 향한 위쪽을 얻는다.
  // 고개를 기울이면 고깔도 함께 기운다.
  const ang = Math.atan2(top.y - chin.y, top.x - chin.x) + Math.PI / 2;

  return { nose: P(1), cheeks: [P(50), P(280)], top, width, ang };
}

/* ── 그리기 ──────────────────────────────────────────── */

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** 자리에 맞춰 글자를 그린다 — 넘치면 글자 크기를 줄인다 */
function fitText(ctx, text, x, y, maxW, size, weight) {
  let s = size;
  ctx.font = `${weight} ${s}px ${FONT}`;
  const w = ctx.measureText(text).width;
  if (w > maxW) {
    s = Math.max(size * 0.6, (s * maxW) / w);
    ctx.font = `${weight} ${s}px ${FONT}`;
  }
  ctx.fillText(text, x, y);
}

function starPath(ctx, x, y, r, rot) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = rot - Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  }
  ctx.closePath();
}

/** 어도비 아이콘 — 둥근 사각형에 두 글자.
 *
 *  한 바퀴 돌리지 않고 좌우로만 흔들린다. 뒤집히면 무슨 프로그램인지 읽을 수
 *  없고, 그것을 읽는 것이 이 작품의 전부다. */
function drawIcon(ctx, b, t, alpha = 1) {
  const app = APPS[b.app];
  const s = b.r * 1.8;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(b.x, b.y);
  ctx.rotate(Math.sin(t / 280 + b.phase) * 0.42);

  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = s * 0.2;
  ctx.shadowOffsetY = s * 0.06;
  roundRect(ctx, -s / 2, -s / 2, s, s, s * 0.235);
  ctx.fillStyle = app.bg;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  ctx.fillStyle = app.fg;
  ctx.font = `600 ${s * 0.46}px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(app.id, 0, s * 0.03);
  ctx.restore();
}

/** 빨간 코, 볼터치, 줄무늬 고깔 */
function drawClown(ctx, f) {
  const w = f.width;
  ctx.save();

  ctx.fillStyle = "rgba(255,92,110,0.4)";
  for (const c of f.cheeks) {
    ctx.beginPath();
    ctx.ellipse(c.x, c.y, w * 0.11, w * 0.085, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // 고깔 — 삼각형으로 오려낸 자리에 줄무늬를 채운다
  ctx.save();
  ctx.translate(f.top.x, f.top.y);
  ctx.rotate(f.ang);
  const bw = w * 0.66, bh = w * 0.88, foot = -w * 0.04;

  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = w * 0.06;
  ctx.beginPath();
  ctx.moveTo(-bw / 2, foot);
  ctx.lineTo(bw / 2, foot);
  ctx.lineTo(0, foot - bh);
  ctx.closePath();
  ctx.fillStyle = CREAM;
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.save();
  ctx.clip();
  ctx.fillStyle = RED;
  const band = bh / 5;
  for (let i = 0; i < 5; i++) {
    ctx.fillRect(-bw, foot - band * (i + 0.9), bw * 2, band * 0.45);
  }
  ctx.restore();

  ctx.fillStyle = CREAM;
  ctx.beginPath();
  ctx.arc(0, foot - bh, w * 0.085, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 빨간 코
  const nr = w * 0.1;
  const g = ctx.createRadialGradient(
    f.nose.x - nr * 0.3, f.nose.y - nr * 0.35, nr * 0.1,
    f.nose.x, f.nose.y, nr
  );
  g.addColorStop(0, "#ff7d6d");
  g.addColorStop(0.55, "#e8291b");
  g.addColorStop(1, "#a8140c");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(f.nose.x, f.nose.y, nr, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.beginPath();
  ctx.ellipse(f.nose.x - nr * 0.3, f.nose.y - nr * 0.38, nr * 0.26, nr * 0.19, -0.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/** 강제 종료 알림 — 아래 패널이 어도비인 것과 달리 이쪽은 macOS 얼굴이다 */
function drawAlert(ctx, W, H, a, t) {
  const k = clamp((t - a.at) / 180, 0, 1);
  const w = Math.min(W * 0.46, H * 0.88);
  const h = w * 0.44;
  const x = (W - w) / 2, y = (H - h) / 2;

  ctx.save();
  ctx.globalAlpha = k;
  ctx.translate(W / 2, H / 2);
  ctx.scale(0.94 + 0.06 * k, 0.94 + 0.06 * k);
  ctx.translate(-W / 2, -H / 2);

  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = h * 0.24;
  ctx.shadowOffsetY = h * 0.06;
  roundRect(ctx, x, y, w, h, h * 0.075);
  ctx.fillStyle = "#f2f2f2";
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  const pad = h * 0.13;
  const is = h * 0.34;

  // 종료된 프로그램의 아이콘이 알림 왼쪽 위에 붙는다
  drawIcon(ctx, { app: a.app, x: x + pad + is / 2, y: y + pad + is / 2, r: is / 1.8, phase: 0 }, 0);

  const tx = x + pad + is + h * 0.1;
  const maxW = x + w - pad - tx;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#1d1d1f";
  fitText(ctx, `'${APPS[a.app].name}'이(가) 예기치 않게 종료되었습니다.`,
    tx, y + pad + h * 0.15, maxW, h * 0.125, "600");
  ctx.fillStyle = "#6b6b70";
  fitText(ctx, "저장하지 않은 변경 사항은 복구할 수 없습니다.",
    tx, y + pad + h * 0.32, maxW, h * 0.105, "400");

  // 확인하는 단추가 오른쪽, 파란 기본값이다
  const bh = h * 0.2, by = y + h - pad - bh;
  const labels = ["무시", "리포트…", "다시 열기"];
  const fs = h * 0.105;
  ctx.font = `500 ${fs}px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  let bx = x + w - pad;
  for (let i = labels.length - 1; i >= 0; i--) {
    const bw = Math.max(ctx.measureText(labels[i]).width + fs * 1.9, h * 0.34);
    bx -= bw;
    const on = i === labels.length - 1;
    roundRect(ctx, bx, by, bw, bh, bh * 0.28);
    ctx.fillStyle = on ? "#007aff" : "#fdfdfd";
    ctx.fill();
    if (!on) {
      ctx.strokeStyle = "rgba(0,0,0,0.14)";
      ctx.lineWidth = Math.max(1, h * 0.006);
      ctx.stroke();
    }
    ctx.fillStyle = on ? "#ffffff" : "#1d1d1f";
    ctx.fillText(labels[i], bx + bw / 2, by + bh / 2);
    bx -= h * 0.05;
  }

  ctx.restore();
}

/* ── 작품 ────────────────────────────────────────────── */

const GRAV = 1.15;          // 중력 (화면 높이의 몇 배인가 / 초²)
const APEX = 0.5;           // 튕겼을 때 올라가는 높이 (화면 높이 배수)
const HIT_MS = 260;         // 같은 아이콘을 다시 튕기기까지
const ADD_EVERY = 8;        // 몇 번 튕기면 다음 프로그램이 실행되는가
const RELAUNCH_MS = 2400;   // 알림이 떠 있는 시간 = 다시 실행되기까지

export class JuggleShow {
  constructor() {
    this.reset();
  }

  reset() {
    this.balls = [];
    this.down = [];      // 종료돼 다시 실행되기를 기다리는 프로그램
    this.opened = 0;     // 지금까지 실행한 프로그램 수
    this.hits = 0;
    this.alert = null;
    this.palms = [];
    this.face = null;
    this.faceAt = 0;
    this.last = 0;
  }

  /** 프로그램 하나를 아래에서 띄워 올린다 */
  spawn(app, W, H, t) {
    this.balls.push({
      app,
      x: rnd(W * 0.3, W * 0.7),
      y: H + Math.min(W, H) * 0.08,
      vx: rnd(-0.05, 0.05) * W,
      vy: -Math.sqrt(2 * GRAV * H * H * 0.62),
      r: Math.min(W, H) * 0.08,
      phase: rnd(0, Math.PI * 2),
      hitAt: t,
    });
  }

  launchNext(W, H, t) {
    if (this.opened >= APPS.length) return;
    this.spawn(this.opened, W, H, t);
    this.opened++;
    launch();
  }

  quit(app, t) {
    this.down.push({ app, at: t });
    this.alert = { app, at: t };
    crash();
  }

  update(dt, W, H, t) {
    const sec = dt / 1000;
    const g = GRAV * H;
    const v0 = Math.sqrt(2 * g * APEX * H);
    const vmax = Math.sqrt(2 * g * 0.72 * H);

    // 첫 프로그램은 카메라가 켜지면 알아서 실행된다
    if (!this.opened) this.launchNext(W, H, t);

    for (let i = this.balls.length - 1; i >= 0; i--) {
      const b = this.balls[i];
      b.vy += g * sec;
      b.x += b.vx * sec;
      b.y += b.vy * sec;

      // 좌우 벽에서 튕긴다 — 화면 밖으로 나가면 손이 닿지 않는다
      if (b.x < b.r) { b.x = b.r; b.vx = Math.abs(b.vx) * 0.7; }
      if (b.x > W - b.r) { b.x = W - b.r; b.vx = -Math.abs(b.vx) * 0.7; }

      // 떨어지는 중일 때만 친다. 올라가는 것도 치면 손을 대고 있는 것만으로
      // 계속 떠 있게 되어 저글링이 되지 않는다.
      if (b.vy > 0 && t - b.hitAt > HIT_MS) {
        for (const p of this.palms) {
          if (Math.hypot(b.x - p.x, b.y - p.y) > p.r + b.r) continue;
          // 손을 위로 채면 조금 더 뜬다. 다만 화면 밖으로 나갈 만큼은 아니다.
          const boost = clamp(-p.vy / H, 0, 1);
          b.vy = -Math.min(v0 * (1 + boost * 0.3), vmax);
          b.vx = clamp(
            b.vx * 0.3 + ((b.x - p.x) / p.r) * W * 0.16 + p.vx * 0.25,
            -W * 0.35, W * 0.35
          );
          b.hitAt = t;
          this.hits++;
          pop(APPS[b.app].note);
          if (this.hits % ADD_EVERY === 0) this.launchNext(W, H, t);
          break;
        }
      }

      if (b.y - b.r > H) {
        this.balls.splice(i, 1);
        this.quit(b.app, t);
      }
    }

    // 종료된 프로그램은 알림이 닫히면 다시 실행된다
    for (let i = this.down.length - 1; i >= 0; i--) {
      if (t - this.down[i].at < RELAUNCH_MS) continue;
      this.spawn(this.down.splice(i, 1)[0].app, W, H, t);
    }

    if (this.alert && t - this.alert.at > RELAUNCH_MS) this.alert = null;
  }

  /** 별밭 — 움직이지 않으므로 한 번만 그려 두고 그림째 붙인다 */
  sky(W, H) {
    if (this.skyCv?.width === W && this.skyCv?.height === H) return this.skyCv;

    const cv = document.createElement("canvas");
    cv.width = W;
    cv.height = H;
    const c = cv.getContext("2d");
    c.fillStyle = SKY;
    c.fillRect(0, 0, W, H);
    c.fillStyle = STAR;

    const r = Math.min(W, H) * 0.045;
    const gx = r * 3.5, gy = r * 3.2;
    this.twinkles = [];
    for (let row = -1; row * gy < H + gy; row++) {
      for (let col = -1; col * gx < W + gx; col++) {
        const j = frac(col * 12.9898 + row * 78.233);
        const x = col * gx + (row % 2 ? gx / 2 : 0) + (j - 0.5) * r * 0.5;
        const y = row * gy + (frac(j * 7.13) - 0.5) * r * 0.4;
        const rr = r * (0.82 + j * 0.3);
        starPath(c, x, y, rr, (j - 0.5) * 0.9);
        c.fill();
        if (j > 0.93) this.twinkles.push({ x, y, r: rr, phase: j * 40 });
      }
    }

    this.skyCv = cv;
    return cv;
  }

  /** 영상에서 사람만 오려낸다 — 마스크는 작은 흑백 그림 한 장이다 */
  person(video, W, H, mask) {
    if (!mask?.data) return null;

    if (this.maskCv?.width !== mask.w || this.maskCv?.height !== mask.h) {
      this.maskCv = document.createElement("canvas");
      this.maskCv.width = mask.w;
      this.maskCv.height = mask.h;
      this.maskCtx = this.maskCv.getContext("2d");
      this.maskImg = this.maskCtx.createImageData(mask.w, mask.h);
    }

    // 이 모델은 갈래 이름을 selfie 하나만 두고, 사람을 0으로 배경을 255로 내놓는다.
    // 헷갈리기 쉬운 자리다 — 뒤집으면 사람이 지워지고 배경만 남는다.
    const px = this.maskImg.data;
    for (let i = 0, j = 3; i < mask.data.length; i++, j += 4) {
      px[j] = mask.data[i] ? 0 : 255;
    }
    this.maskCtx.putImageData(this.maskImg, 0, 0);

    if (this.cutCv?.width !== W || this.cutCv?.height !== H) {
      this.cutCv = document.createElement("canvas");
      this.cutCv.width = W;
      this.cutCv.height = H;
      this.cutCtx = this.cutCv.getContext("2d");
    }

    const c = this.cutCtx;
    c.clearRect(0, 0, W, H);
    c.drawImage(video, 0, 0, W, H);
    // 마스크가 작아 그대로 키우면 가장자리가 각진다. 한 번 풀어 준다.
    c.globalCompositeOperation = "destination-in";
    c.filter = `blur(${Math.max(1, W / 260)}px)`;
    c.drawImage(this.maskCv, 0, 0, W, H);
    c.filter = "none";
    c.globalCompositeOperation = "source-over";
    return this.cutCv;
  }

  draw(ctx, video, W, H, handResult, faceResult, mask, t) {
    const dt = Math.min(64, this.last ? t - this.last : 16);
    this.last = t;

    const cut = this.person(video, W, H, mask);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (cut) {
      ctx.drawImage(this.sky(W, H), 0, 0);
      for (const s of this.twinkles) {
        ctx.fillStyle = `rgba(255,255,255,${0.25 + 0.35 * Math.sin(t / 700 + s.phase) ** 2})`;
        starPath(ctx, s.x, s.y, s.r * 0.5, t / 3000 + s.phase);
        ctx.fill();
      }
    }

    // 오려낸 사람은 영상과 같은 자리에 놓이므로 미러를 도로 걸고 얹는다.
    // 마스크가 아직 없으면(모델을 부르는 중) 영상을 그대로 둔다.
    base(ctx, W, H);
    ctx.drawImage(cut ?? video, 0, 0, W, H);
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // 손 순서는 프레임마다 바뀔 수 있다. 가까운 쪽끼리 이어 붙여야 속도가 튀지 않는다.
    const palms = palmsOf(handResult, W, H);
    for (const p of palms) {
      let near = null, best = p.r * 2.5;
      for (const q of this.palms) {
        const d = Math.hypot(p.x - q.x, p.y - q.y);
        if (d < best) { best = d; near = q; }
      }
      if (near && dt > 0) {
        p.vx = ((p.x - near.x) * 1000) / dt;
        p.vy = ((p.y - near.y) * 1000) / dt;
      }
    }
    this.palms = palms;

    this.update(dt, W, H, t);

    // 얼굴을 한두 프레임 놓쳐도 분장이 깜빡이지 않게 붙잡아 둔다
    const face = clownOf(faceResult, W, H);
    if (face) {
      this.face = face;
      this.faceAt = t;
    } else if (t - this.faceAt > 500) {
      this.face = null;
    }

    if (this.face) drawClown(ctx, this.face);
    for (const b of this.balls) drawIcon(ctx, b, t);
    this.drawPanel(ctx, W, H);
    if (this.alert) drawAlert(ctx, W, H, this.alert, t);
  }

  /** 상단 패널 — 안에서 도는 것이 어도비이므로 어도비 얼굴을 한다 */
  drawPanel(ctx, W, H) {
    const h = Math.round(H * 0.082);
    const w = Math.min(W * 0.5, H * 0.9);
    const x = Math.round((W - w) / 2), y = Math.round(H * 0.035);
    const pad = h * 0.22;
    const full = this.balls.length >= APPS.length;

    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.35)";
    ctx.shadowBlur = h * 0.3;
    ctx.shadowOffsetY = h * 0.08;
    roundRect(ctx, x, y, w, h, h * 0.17);
    ctx.fillStyle = "#1e1e1e";
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // 실행한 프로그램 — 지금 떠 있는 것만 제 색이고, 종료된 것은 꺼져 있다
    const running = new Set(this.balls.map((b) => b.app));
    const cs = h * 0.56, gap = cs * 0.26;
    APPS.forEach((app, i) => {
      const cx = x + pad + cs / 2 + i * (cs + gap);
      const cy = y + h / 2;
      if (i >= this.opened) {
        roundRect(ctx, cx - cs / 2, cy - cs / 2, cs, cs, cs * 0.235);
        ctx.fillStyle = "rgba(255,255,255,0.06)";
        ctx.fill();
        return;
      }
      drawIcon(ctx, { app: i, x: cx, y: cy, r: cs / 1.8, phase: 0 }, 0,
        running.has(i) ? 1 : 0.22);
    });

    // 메모리 — 여섯 개가 다 떠 있으면 붉어진다
    const bw = w * 0.22, bh = h * 0.16;
    const bx = x + w - pad - bw, by = y + h * 0.58;
    ctx.font = `500 ${h * 0.2}px ${FONT}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = full ? "#e5484d" : "#a0a0a0";
    ctx.fillText(full ? "메모리 부족" : "메모리", bx, y + h * 0.42);

    roundRect(ctx, bx, by, bw, bh, bh / 2);
    ctx.fillStyle = "#3a3a3a";
    ctx.fill();
    const k = this.balls.length / APPS.length;
    if (k > 0) {
      roundRect(ctx, bx, by, Math.max(bh, bw * k), bh, bh / 2);
      ctx.fillStyle = full ? "#e5484d" : k > 0.6 ? "#d99a2b" : "#3a9c5a";
      ctx.fill();
    }

    ctx.font = `500 ${h * 0.26}px ${MONO}`;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#e8e8e8";
    ctx.fillText(String(this.hits).padStart(3, "0"), bx - h * 0.28, y + h / 2);
    ctx.restore();
  }
}
