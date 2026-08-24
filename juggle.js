// 삐에로 저글링 — 어도비 여섯 개를 손바닥으로 튕겨 올린다.
//
// 하나라도 떨어뜨리면 전부 강제 종료되고 처음부터 다시 시작한다.
// 배경은 인물만 오려내 별밭 위에 세운다.
//
// 계산과 그리기는 화면 좌표(미러 해제)에서 한다. 아이콘의 두 글자가 뒤집히면
// 무슨 프로그램인지 알 수 없기 때문이다. 손·얼굴 좌표는 들여올 때 한 번만 뒤집는다.

import { ac, fxOut } from "./audio.js";
import { sx, sy, len, base } from "./view.js";

const FONT = `"Pretendard Variable", "Pretendard", -apple-system, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif`;

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

// 고깔 — 파란 별밭에서 묻히지 않게 따뜻한 쪽으로 잡는다.
// 몸통이 밝고 챙이 그보다 진하며, 점과 방울만 밝게 튄다.
const HAT_BODY = "#ffd45e";
const HAT_TRIM = "#e0392b";
const HAT_DOT = "#fff6e2";

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

/* ── 얼굴 → 고깔 자리 ────────────────────────────────── */

/** 고깔이 앉을 자리와 얼굴 기울기 (화면 좌표) */
function hatOf(faceResult, W, H) {
  const lm = faceResult?.faceLandmarks?.[0];
  if (!lm) return null;
  const P = (i) => ({ x: sx(lm[i].x * W, W), y: sy(lm[i].y * H, H) });

  const top = P(10), chin = P(152), a = P(234), b = P(454);
  const width = Math.hypot(b.x - a.x, b.y - a.y);
  if (!width) return null;

  // 이마에서 턱으로 내려가는 방향을 뒤집어 얼굴이 향한 위쪽을 얻는다.
  // 고개를 기울이면 고깔도 함께 기운다.
  const ang = Math.atan2(top.y - chin.y, top.x - chin.x) + Math.PI / 2;

  // 고깔이 앉을 자리 — 턱에서 이마로 이어지는 얼굴 축을 그대로 위로 늘린다.
  //
  // 이마 점(10)은 머리카락 아래라 그 자리에 얹으면(1.0배) 모자가 이마를 덮는다.
  // 그렇다고 정수리까지 올리면(1.36배 이상) 머리 위에 떠 보인다. 챙 아랫단이
  // 머리카락에 조금 파묻히는 자리를 눈으로 맞춘 값이다.
  //
  // 축을 쓰면 고개를 돌려 이마 점이 한쪽으로 밀려도 모자가 머리 가운데에 남는다.
  const crown = {
    x: chin.x + (top.x - chin.x) * 1.2,
    y: chin.y + (top.y - chin.y) * 1.2,
  };

  return { crown, width, ang };
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

/** 어도비 아이콘 — 동그란 공에 두 글자.
 *
 *  한 바퀴 돌리지 않고 좌우로만 흔들린다. 뒤집히면 무슨 프로그램인지 읽을 수
 *  없고, 그것을 읽는 것이 이 작품의 전부다. */
function drawIcon(ctx, b, t, alpha = 1) {
  const app = APPS[b.app];
  const r = b.r;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(b.x, b.y);
  ctx.rotate(Math.sin(t / 420 + b.phase) * 0.42);

  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = r * 0.36;
  ctx.shadowOffsetY = r * 0.12;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = app.bg;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  ctx.fillStyle = app.fg;
  ctx.font = `600 ${r * 0.78}px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(app.id, 0, r * 0.05);
  ctx.restore();
}

/** 원을 여러 개 이어 한 덩어리로 채운다 — 구름 모양 챙과 꽃 방울에 쓴다.
 *
 *  arc를 잇달아 부르면 앞 도형의 끝점에서 선이 이어져 버린다. 원마다
 *  시작점을 옮겨 놓아야 겹친 자리에 금이 가지 않는다. */
function blobPath(ctx, circles) {
  ctx.beginPath();
  for (const [cx, cy, r] of circles) {
    ctx.moveTo(cx + r, cy);
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
  }
}

/** 고깔 — 챙을 머리 폭에 맞춘다. 얼굴 폭(광대~광대)은 머리카락까지 친
 *  머리 폭의 3분의 2쯤이라, 그대로 쓰면 모자가 머리에 얹히지 않고 올라앉는다. */
function drawHat(ctx, f) {
  const w = f.width;
  ctx.save();
  ctx.translate(f.crown.x, f.crown.y);
  ctx.rotate(f.ang);

  const brimW = w * 1.36;
  const bw = brimW * 0.8, bh = w * 1.05, foot = 0;
  const brimR = brimW / 9;

  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = w * 0.06;
  ctx.shadowOffsetY = w * 0.02;

  // 원뿔
  ctx.beginPath();
  ctx.moveTo(-bw / 2, foot);
  ctx.lineTo(bw / 2, foot);
  ctx.lineTo(0, foot - bh);
  ctx.closePath();
  ctx.fillStyle = HAT_BODY;
  ctx.fill();

  // 구름처럼 봉우리진 챙 — 밑동보다 아래로 걸쳐야 머리에 얹힌 것으로 보인다
  const bandY = foot - brimR * 0.25;
  blobPath(ctx, [
    ...[0, 1, 2, 3].map((i) => [-brimW / 2 + (brimW / 4) * (i + 0.5), bandY, brimR]),
  ]);
  ctx.fillStyle = HAT_TRIM;
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, bandY, brimW / 2, brimR * 0.95, 0, 0, Math.PI);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // 몸통의 점 두 개와 꼭대기의 꽃 방울
  // 점 둘은 서로 떨어져 있어야 한다. 붙으면 땅콩 하나로 보인다.
  const dr = bw * 0.085;
  ctx.fillStyle = HAT_DOT;
  blobPath(ctx, [[0, foot - bh * 0.34, dr], [0, foot - bh * 0.6, dr]]);
  ctx.fill();

  const fr = bw * 0.17;
  const fy = foot - bh - fr * 0.35;
  blobPath(ctx, [
    [0, fy, fr * 0.66],
    ...[[0, -1], [1, 0], [0, 1], [-1, 0]].map(([dx, dy]) =>
      [dx * fr * 0.6, fy + dy * fr * 0.6, fr * 0.6]),
  ]);
  ctx.fill();
  ctx.restore();
}

/** 강제 종료 알림 — 안에서 도는 것이 어도비여도 알림 자체는 macOS 얼굴이다 */
function drawAlert(ctx, W, H, a, t) {
  const k = clamp((t - a.at) / 180, 0, 1);
  const w = Math.min(W * 0.5, H * 0.95);
  const h = w * 0.52;
  const x = (W - w) / 2, y = (H - h) / 2;

  ctx.save();
  ctx.globalAlpha = k;

  // 별밭 위에 그대로 얹으면 글자가 읽히지 않는다. 뒤를 흐린 뒤 창을 올린다.
  // 캔버스를 조금 키워 그려야 흐림이 가장자리 바깥의 빈자리를 물어 오지 않는다.
  const over = H * 0.03;
  ctx.filter = `blur(${Math.round(H * 0.022)}px)`;
  ctx.drawImage(ctx.canvas, -over, -over, W + over * 2, H + over * 2);
  ctx.filter = "none";

  ctx.translate(W / 2, H / 2);
  ctx.scale(0.96 + 0.04 * k, 0.96 + 0.04 * k);
  ctx.translate(-W / 2, -H / 2);

  ctx.shadowColor = "rgba(0,0,0,0.4)";
  ctx.shadowBlur = h * 0.16;
  ctx.shadowOffsetY = h * 0.05;
  roundRect(ctx, x, y, w, h, h * 0.085);
  ctx.fillStyle = "#f5f5f5";
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // 종료된 프로그램의 아이콘이 가운데 위에 놓이고, 글도 모두 가운데로 선다
  drawIcon(ctx, { app: a.app, x: x + w / 2, y: y + h * 0.225, r: h * 0.145, phase: 0 }, 0, k);

  const maxW = w - h * 0.2;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#1d1d1f";
  fitText(ctx, `'${APPS[a.app].name}'이(가) 예기치 않게 종료되었습니다.`,
    x + w / 2, y + h * 0.5, maxW, h * 0.082, "600");
  ctx.fillStyle = "#86868b";
  fitText(ctx, "저장하지 않은 변경사항은 복구할 수 없습니다.",
    x + w / 2, y + h * 0.61, maxW, h * 0.062, "400");

  // 단추 줄을 가르는 선
  ctx.fillStyle = "rgba(0,0,0,0.09)";
  ctx.fillRect(x, y + h * 0.7, w, Math.max(1, h * 0.003));

  // 확인하는 단추가 오른쪽, 파란 기본값이다
  const bh = h * 0.135, by = y + h * 0.85 - bh / 2;
  const labels = ["무시", "리포트…", "다시 열기"];
  const fs = h * 0.062, gap = h * 0.05;
  ctx.font = `500 ${fs}px ${FONT}`;
  const bws = labels.map((l) => Math.max(ctx.measureText(l).width + fs * 2.4, h * 0.34));

  let bx = x + (w - bws.reduce((s, v) => s + v, 0) - gap * (labels.length - 1)) / 2;
  ctx.textBaseline = "middle";
  labels.forEach((label, i) => {
    const on = i === labels.length - 1;
    roundRect(ctx, bx, by, bws[i], bh, bh * 0.22);
    ctx.fillStyle = on ? "#007aff" : "#ffffff";
    ctx.fill();
    if (!on) {
      ctx.strokeStyle = "rgba(0,0,0,0.12)";
      ctx.lineWidth = Math.max(1, h * 0.004);
      ctx.stroke();
    }
    ctx.fillStyle = on ? "#ffffff" : "#1d1d1f";
    ctx.fillText(label, bx + bws[i] / 2, by + bh / 2);
    bx += bws[i] + gap;
  });

  ctx.restore();
}

/* ── 작품 ────────────────────────────────────────────── */

const GRAV = 0.45;          // 중력 (화면 높이의 몇 배인가 / 초²)
const APEX = 0.5;           // 튕겼을 때 올라가는 높이 (화면 높이 배수)
const HIT_MS = 260;         // 같은 아이콘을 다시 튕기기까지
const ADD_EVERY = 3;        // 띄운 프로그램 하나당 몇 번 튕겨야 다음이 실행되는가
const ALERT_MS = 2400;      // 알림이 떠 있는 시간 = 처음부터 다시 시작하기까지

export class JuggleShow {
  constructor() {
    this.reset();
  }

  reset() {
    this.balls = [];
    this.opened = 0;     // 지금까지 실행한 프로그램 수
    this.toNext = 0;     // 다음 프로그램까지 남은 횟수 (첫 실행 때 채워진다)
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
    // 다음까지 필요한 횟수를 띄운 개수에 비례해 둔다. 공이 늘면 그만큼 자주
    // 튕기게 되므로, 이래야 어느 단계든 "각 공을 세 번씩 받아내면 하나 는다"가
    // 되고 걸리는 시간도 비슷해진다. 합계로 세면 첫 하나가 유독 길어진다.
    this.toNext = ADD_EVERY * this.opened;
    launch();
  }

  /** 하나라도 놓치면 전부 강제 종료되고 처음부터 다시 시작한다 */
  quit(app, t) {
    // 배열을 갈아 끼우지 않고 비운다. 부딪힘을 훑던 반복문이 같은 배열을 보고 있다.
    this.balls.length = 0;
    this.opened = 0;
    this.toNext = 0;
    this.alert = { app, at: t };
    crash();
  }

  update(dt, W, H, t) {
    const sec = dt / 1000;
    const g = GRAV * H;
    const v0 = Math.sqrt(2 * g * APEX * H);
    const vmax = Math.sqrt(2 * g * 0.72 * H);

    // 첫 프로그램은 카메라가 켜지면 알아서 실행된다.
    // 놓쳐서 다시 시작하는 길이면 알림이 닫히기를 기다린다.
    if (!this.opened && !this.alert) this.launchNext(W, H, t);

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
            b.vx * 0.3 + ((b.x - p.x) / p.r) * W * 0.12 + p.vx * 0.18,
            -W * 0.22, W * 0.22
          );
          b.hitAt = t;
          pop(APPS[b.app].note);
          if (this.toNext > 0 && --this.toNext === 0) this.launchNext(W, H, t);
          break;
        }
      }

      if (b.y - b.r > H) {
        this.quit(b.app, t);
        break;   // 전부 치웠으므로 남은 공을 볼 것도 없다
      }
    }

    if (this.alert && t - this.alert.at > ALERT_MS) this.alert = null;
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

    // 얼굴을 한두 프레임 놓쳐도 고깔이 깜빡이지 않게 붙잡아 둔다
    const face = hatOf(faceResult, W, H);
    if (face) {
      this.face = face;
      this.faceAt = t;
    } else if (t - this.faceAt > 500) {
      this.face = null;
    }

    if (this.face) drawHat(ctx, this.face);
    for (const b of this.balls) drawIcon(ctx, b, t);
    if (this.alert) drawAlert(ctx, W, H, this.alert, t);
  }
}
