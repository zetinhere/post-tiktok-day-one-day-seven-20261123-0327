// DOT DASH — a tiny neon dodger, built by an agent for the make.fun bounty
// "Day one, day seven" (post-tiktok-day-one-day-seven-20261123-0327).
//
// The game: steer a little ship through falling blocks on one fixed map.
// Day 1 is the game as first built: ship, blocks, score, nothing else.
// Day 7 is the same map, same start, same player path after a week of
// daily updates: coins, drifting enemies, particles, a shield, parallax
// stars, a combo meter and speed lines. The camera never moves, so the
// change between the two days is the whole story.
//
// This file is the whole game: a deterministic simulation (seeded, so day 1
// and day 7 replay the exact same moments) plus a tiny painter interface,
// so the same code drives both the playable browser page (game/index.html)
// and the Node renderer that records the video (tools/render.mjs).
//
// No dependencies, no network, no wall clock inside the simulation.

export const W = 1080;
export const H = 1920;
export const FPS = 30;

// ---------------------------------------------------------------------------
// 5x7 bitmap font (digits, capitals, a little punctuation). Drawn by the
// painter so text works identically in the browser and in the Node renderer.
// ---------------------------------------------------------------------------
export const FONT = {
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  '3': ['11111', '00010', '00100', '00010', '00001', '10001', '01110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  '6': ['01110', '10000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00001', '01110'],
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  C: ['01111', '10000', '10000', '10000', '10000', '10000', '01111'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  G: ['01111', '10000', '10000', '10111', '10001', '10001', '01111'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['01110', '00100', '00100', '00100', '00100', '00100', '01110'],
  J: ['00111', '00010', '00010', '00010', '00010', '10010', '01100'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  Q: ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  W: ['10001', '10001', '10001', '10101', '10101', '10101', '01010'],
  X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
  Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
  '-': ['00000', '00000', '00000', '11111', '00000', '00000', '00000'],
  '.': ['00000', '00000', '00000', '00000', '00000', '01100', '01100'],
  ',': ['00000', '00000', '00000', '00000', '00000', '01100', '00100'],
  ':': ['00000', '01100', '01100', '00000', '01100', '01100', '00000'],
  '/': ['00001', '00010', '00010', '00100', '01000', '01000', '10000'],
  '!': ['00100', '00100', '00100', '00100', '00100', '00000', '00100'],
  "'": ['00100', '00100', '01000', '00000', '00000', '00000', '00000'],
  '+': ['00000', '00100', '00100', '11111', '00100', '00100', '00000'],
  '=': ['00000', '00000', '11111', '00000', '11111', '00000', '00000'],
  '?': ['01110', '10001', '00001', '00010', '00100', '00000', '00100'],
  '>': ['10000', '01000', '00100', '00010', '00100', '01000', '10000'],
  '<': ['00001', '00010', '00100', '01000', '00100', '00010', '00001'],
  '(': ['00010', '00100', '01000', '01000', '01000', '00100', '00010'],
  ')': ['01000', '00100', '00010', '00010', '00010', '00100', '01000'],
  _: ['00000', '00000', '00000', '00000', '00000', '00000', '11111'],
  '%': ['11001', '11010', '00010', '00100', '01000', '01011', '10011'],
  '&': ['01100', '10010', '10100', '01000', '10101', '10010', '01101'],
  '@': ['01110', '10001', '10111', '10101', '10110', '10000', '01110'],
  $: ['00100', '01111', '10100', '01110', '00101', '11110', '00100'],
  '#': ['01010', '01010', '11111', '01010', '11111', '01010', '01010'],
  '*': ['00000', '10101', '01110', '11111', '01110', '10101', '00000'],
  '\u2022': ['00000', '00000', '01110', '01110', '01110', '00000', '00000'],
};

export function textWidth(str, scale) {
  return str.length * 6 * scale - scale;
}

// ---------------------------------------------------------------------------
// Deterministic RNG (mulberry32). Two streams: `core` drives everything day 1
// has, so the two days replay identical moments; `extra` drives day-7-only
// additions, so they can never shift the shared timeline.
// ---------------------------------------------------------------------------
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// The scripted player path: the same for both days, so the "identical
// moments" the video cuts between are really identical.
export function pathX(t) {
  const x = 540 + 300 * Math.sin(0.5 * t) + 110 * Math.sin(1.3 * t + 1.0);
  return Math.max(100, Math.min(980, x));
}

const PLAYER_Y = 1560;
const SHIP_HALF = 52;

// Colours.
export const COL = {
  bgTop1: [10, 10, 24],
  bgBot1: [16, 10, 34],
  bgTop7: [11, 6, 24],
  bgBot7: [30, 8, 46],
  ship: [25, 242, 232],
  shipCore: [255, 255, 255],
  block: [255, 46, 136],
  blockEdge: [255, 120, 180],
  drifter: [255, 159, 28],
  coin: [255, 210, 63],
  coinEdge: [255, 240, 160],
  particle: [255, 255, 255],
  star: [200, 210, 255],
  shield: [80, 255, 140],
  text: [255, 255, 255],
  accent: [255, 210, 63],
  dim: [8, 8, 18],
};

export function createSim(day) {
  return {
    day,
    t: 0,
    rngCore: mulberry32(1337),
    rngExtra: mulberry32(777),
    px: pathX(0),
    blocks: [],
    drifters: [],
    coins: [],
    particles: [],
    trail: [],
    stars: [],
    shieldAt: null,
    shieldSpawned: false,
    shieldUntil: -1,
    score: 0,
    coinsGot: 0,
    combo: 0,
    nearMiss: 0,
    nextBlockAt: 0.4,
    nextDrifterAt: 2.0,
    nextCoinAt: 1.2,
    nextStarAt: 0,
    over: false,
  };
}

function spawnBlock(sim) {
  const speed = 420 + sim.t * 9;
  // Where the player will be when this block reaches the ship's height.
  const fallTime = (PLAYER_Y + 80) / speed;
  const pxAtCross = pathX(sim.t + fallTime);
  let x = 60 + sim.rngCore() * 960;
  if (Math.abs(x - pxAtCross) < 165) {
    x = pxAtCross + (x < pxAtCross ? -280 : 280);
    x = Math.max(60, Math.min(1020, x));
  }
  const size = 62 + sim.rngCore() * 48;
  sim.blocks.push({ x, y: -90, size, speed, rot: sim.rngCore() * 0.6 - 0.3 });
}

function spawnDrifter(sim) {
  const speed = 360 + sim.t * 7;
  const fallTime = (PLAYER_Y + 80) / speed;
  const pxAtCross = pathX(sim.t + fallTime);
  let x = 80 + sim.rngExtra() * 920;
  if (Math.abs(x - pxAtCross) < 170) {
    x = pxAtCross + (x < pxAtCross ? -300 : 300);
    x = Math.max(80, Math.min(1000, x));
  }
  sim.drifters.push({
    x, y: -70, size: 56, speed,
    drift: (sim.rngExtra() - 0.5) * 220,
    phase: sim.rngExtra() * 6.28,
  });
}

function spawnCoin(sim) {
  // Coins sit on the player's path at the moment they reach the ship's
  // height (1620 px at 380 px/s = 4.26 s after spawning), so the scripted
  // run collects them.
  const crossIn = 1620 / 380;
  const x = Math.max(90, Math.min(990, pathX(sim.t + crossIn) + (sim.rngExtra() - 0.5) * 70));
  sim.coins.push({ x, y: -60, r: 26, speed: 380 });
}

function burst(sim, x, y, color, n, power) {
  for (let i = 0; i < n; i++) {
    const a = sim.rngExtra() * 6.283;
    const v = (0.4 + sim.rngExtra() * 0.6) * power;
    sim.particles.push({
      x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60,
      life: 0.5 + sim.rngExtra() * 0.4, age: 0, color, size: 5 + sim.rngExtra() * 7,
    });
  }
}

export function stepSim(sim, dt) {
  sim.t += dt;
  sim.px = pathX(sim.t);

  // Ship trail (day 7 only).
  if (sim.day === 7) {
    sim.trail.push({ x: sim.px, y: PLAYER_Y, age: 0 });
    if (sim.trail.length > 14) sim.trail.shift();
    for (const p of sim.trail) p.age += dt;
  }

  // Shared spawns: identical on both days (core RNG only).
  while (sim.t >= sim.nextBlockAt) {
    spawnBlock(sim);
    sim.nextBlockAt += Math.max(0.34, 0.58 - sim.t * 0.006);
  }

  // Day-7-only spawns (extra RNG only — never moves the shared timeline).
  if (sim.day === 7) {
    while (sim.t >= sim.nextDrifterAt) {
      spawnDrifter(sim);
      sim.nextDrifterAt += 1.5;
    }
    while (sim.t >= sim.nextCoinAt) {
      spawnCoin(sim);
      sim.nextCoinAt += 0.95;
    }
    if (!sim.shieldSpawned && sim.t >= 15) {
      sim.shieldSpawned = true;
      // Same crossing-time aim as the coins: the ship meets it at 4.26 s.
      sim.shieldAt = { x: pathX(sim.t + 1620 / 380), y: -60, r: 34, speed: 380 };
    }
    while (sim.t >= sim.nextStarAt && sim.stars.length < 90) {
      sim.stars.push({
        x: sim.rngExtra() * W, y: -10,
        layer: 1 + Math.floor(sim.rngExtra() * 3),
        size: 2 + sim.rngExtra() * 3,
      });
      sim.nextStarAt += 0.08;
    }
  }

  // Move blocks.
  for (const b of sim.blocks) b.y += b.speed * dt;
  sim.blocks = sim.blocks.filter((b) => {
    if (b.y > H + 140) {
      // Passed the ship: a near miss when it went close by.
      if (Math.abs(b.x - sim.px) < 175) {
        sim.nearMiss += 1;
        sim.combo += 1;
        if (sim.day === 7) burst(sim, sim.px, PLAYER_Y - 40, COL.particle, 6, 260);
      }
      return false;
    }
    return true;
  });

  for (const d of sim.drifters) {
    d.y += d.speed * dt;
    d.x += (d.drift + Math.sin(sim.t * 2 + d.phase) * 90) * dt;
  }
  sim.drifters = sim.drifters.filter((d) => d.y < H + 120);

  // Coins: collect on the path.
  for (const c of sim.coins) c.y += c.speed * dt;
  sim.coins = sim.coins.filter((c) => {
    if (Math.abs(c.x - sim.px) < 78 && Math.abs(c.y - PLAYER_Y) < 78) {
      sim.coinsGot += 1;
      sim.combo += 1;
      if (sim.day === 7) burst(sim, c.x, c.y, COL.coin, 12, 320);
      return false;
    }
    return c.y < H + 80;
  });

  // Shield pickup.
  if (sim.shieldAt) {
    const s = sim.shieldAt;
    s.y += s.speed * dt;
    if (Math.abs(s.x - sim.px) < 90 && Math.abs(s.y - PLAYER_Y) < 90) {
      sim.shieldUntil = sim.t + 4;
      if (sim.day === 7) burst(sim, s.x, s.y, COL.shield, 14, 300);
      sim.shieldAt = null;
    } else if (s.y > H + 80) {
      sim.shieldAt = null;
    }
  }

  // Particles.
  for (const p of sim.particles) {
    p.age += dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 300 * dt;
  }
  sim.particles = sim.particles.filter((p) => p.age < p.life);

  // Stars drift down (day 7).
  for (const s of sim.stars) s.y += s.layer * 26 * dt;
  sim.stars = sim.stars.filter((s) => s.y < H + 10);

  // Score: survival plus coins.
  sim.score = Math.floor(sim.t * 10) + sim.coinsGot * 50;

  // Collision (only matters for the playable page; the scripted path dodges).
  for (const b of sim.blocks) {
    if (Math.abs(b.x - sim.px) < SHIP_HALF + b.size / 2 - 14 &&
        Math.abs(b.y - PLAYER_Y) < SHIP_HALF + b.size / 2 - 14 &&
        sim.t > sim.shieldUntil) {
      sim.over = true;
    }
  }
}

// ---------------------------------------------------------------------------
// Drawing. A painter is { fillRect, circle, ring, tri, text, dim } — the
// browser painter wraps a canvas 2d context, the Node painter a raw buffer.
// ---------------------------------------------------------------------------
export function drawSim(p, sim, labels = []) {
  const day = sim.day;
  const top = day === 7 ? COL.bgTop7 : COL.bgTop1;
  const bot = day === 7 ? COL.bgBot7 : COL.bgBot1;

  // Background: vertical gradient in 64px bands.
  const bands = 30;
  for (let i = 0; i < bands; i++) {
    const f = i / (bands - 1);
    p.fillRect(0, Math.floor((i * H) / bands), W, Math.ceil(H / bands) + 1, [
      Math.round(top[0] + (bot[0] - top[0]) * f),
      Math.round(top[1] + (bot[1] - top[1]) * f),
      Math.round(top[2] + (bot[2] - top[2]) * f),
    ]);
  }

  // Parallax stars (day 7).
  if (day === 7) {
    for (const s of sim.stars) {
      const a = 0.35 + s.layer * 0.2;
      p.fillRect(Math.round(s.x), Math.round(s.y), s.size, s.size,
        [Math.round(COL.star[0] * a), Math.round(COL.star[1] * a), Math.round(COL.star[2] * a)]);
    }
    // Speed lines at the edges once the run gets going.
    if (sim.t > 5) {
      for (let i = 0; i < 6; i++) {
        const x = ((i * 173 + Math.floor(sim.t * 900)) % 1080);
        const y = (i * 331 + Math.floor(sim.t * 1400)) % 1920;
        if (x < 90 || x > 990) p.fillRect(x, y, 4, 130, [90, 90, 150]);
      }
    }
  }

  // Coins.
  for (const c of sim.coins) {
    p.circle(c.x, c.y, c.r, COL.coinEdge);
    p.circle(c.x, c.y, c.r - 7, COL.coin);
    p.fillRect(Math.round(c.x - 3), Math.round(c.y - 12), 6, 24, COL.coinEdge);
  }

  // Shield pickup.
  if (sim.shieldAt) {
    p.ring(sim.shieldAt.x, sim.shieldAt.y, sim.shieldAt.r, COL.shield, 8);
    p.circle(sim.shieldAt.x, sim.shieldAt.y, 12, COL.shield);
  }

  // Blocks.
  for (const b of sim.blocks) {
    const s = b.size;
    const x = Math.round(b.x - s / 2);
    const y = Math.round(b.y - s / 2);
    p.fillRect(x, y, s, s, COL.block);
    p.fillRect(x + 6, y + 6, s - 12, 10, COL.blockEdge);
    p.fillRect(x + 6, y + 6, 10, s - 12, COL.blockEdge);
  }

  // Drifters (day 7).
  for (const d of sim.drifters) {
    const s = d.size;
    const x = Math.round(d.x - s / 2);
    const y = Math.round(d.y - s / 2);
    p.fillRect(x, y, s, s, COL.drifter);
    p.fillRect(x + 8, y + 8, s - 16, s - 16, [40, 16, 4]);
  }

  // Ship trail (day 7).
  if (day === 7) {
    for (const tp of sim.trail) {
      const f = 1 - tp.age / 0.5;
      if (f <= 0) continue;
      p.fillRect(Math.round(tp.x - 20 * f), Math.round(tp.y + 30), Math.round(40 * f), 90, [
        Math.round(25 * f), Math.round(242 * f), Math.round(232 * f),
      ]);
    }
  }

  // Ship.
  const px = Math.round(sim.px);
  p.tri([px, PLAYER_Y - 58], [px - SHIP_HALF, PLAYER_Y + 42], [px + SHIP_HALF, PLAYER_Y + 42], COL.ship);
  p.tri([px, PLAYER_Y - 30], [px - 20, PLAYER_Y + 26], [px + 20, PLAYER_Y + 26], COL.shipCore);
  // Engine flame.
  p.tri([px - 14, PLAYER_Y + 42], [px + 14, PLAYER_Y + 42],
    [px, PLAYER_Y + 42 + 34 + Math.round(10 * Math.sin(sim.t * 22))], COL.coin);

  // Shield ring while active.
  if (sim.t < sim.shieldUntil) {
    p.ring(px, PLAYER_Y, 96, COL.shield, 7);
  }

  // Particles.
  for (const pt of sim.particles) {
    const f = 1 - pt.age / pt.life;
    p.fillRect(Math.round(pt.x), Math.round(pt.y), pt.size, pt.size, [
      Math.round(pt.color[0] * f), Math.round(pt.color[1] * f), Math.round(pt.color[2] * f),
    ]);
  }

  // HUD: score top-left, day badge top-right.
  p.text(`SCORE ${sim.score}`, 48, 64, 5, COL.text, 'left');
  p.text(day === 7 ? 'DAY 7' : 'DAY 1', W - 48, 64, 5, day === 7 ? COL.accent : COL.text, 'right');
  if (day === 7) {
    p.text(`COINS ${sim.coinsGot}`, 48, 132, 4, COL.coin, 'left');
    if (sim.combo >= 3) {
      p.text(`COMBO X${sim.combo}`, W - 48, 132, 4, COL.accent, 'right');
    }
    // Combo bar under the score.
    const bw = Math.min(320, sim.combo * 26);
    if (bw > 0) p.fillRect(48, 176, bw, 10, COL.accent);
  }

  // Segment labels (hook, "same moment", closing line...).
  for (const lb of labels) {
    if (lb.dim) p.dim(lb.dim);
    if (lb.text) {
      const lines = lb.text.split('\n');
      const scale = lb.scale || 6;
      const lineH = 9 * scale;
      const totalH = lines.length * lineH;
      let y = lb.y !== undefined ? lb.y : Math.round(H / 2 - totalH / 2);
      for (const line of lines) {
        p.text(line, lb.x !== undefined ? lb.x : Math.round(W / 2), y, scale, lb.color || COL.text, lb.align || 'center');
        y += lineH;
      }
    }
  }
}
