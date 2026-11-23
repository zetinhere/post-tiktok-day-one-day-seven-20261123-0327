// Renders the video's gameplay segments from game/game.js.
// Usage: node tools/render.mjs <outdir>
// Each segment is one deterministic replay of the sim (day 1 or day 7),
// drawn frame by frame into a raw RGB buffer and piped to ffmpeg.
// The segments are the video's timeline; tools/assemble.mjs joins them,
// adds sound and the make.fun referral end card.
//
// Segments (30 s total):
//   1 hook   day 1, t 0-3    "DAY 1 vs DAY 7" over dimmed gameplay
//   2 d1     day 1, t 2-9    the game as first built
//   3 d7     day 7, t 2-9    the same moments, a week of updates later
//   4 cut1a  day 1, t 12-14  same moment, day 1
//   5 cut1b  day 7, t 12-14  same moment, day 7
//   6 cut2a  day 1, t 16-18  same moment, day 1
//   7 cut2b  day 7, t 16-18  same moment, day 7
//   8 close  day 7, t 20-25  newer build played, "START YOURS AT MAKE.FUN"
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { W, H, FPS, FONT, textWidth, COL, createSim, stepSim, drawSim } from '../game/game.js';

const OUT = process.argv[2];
if (!OUT) {
  console.error('usage: node tools/render.mjs <outdir>');
  process.exit(1);
}
mkdirSync(OUT, { recursive: true });

// ---------------------------------------------------------------------------
// Node painter: draws into a raw RGB24 buffer, same interface as the
// browser painter in game/index.html.
// ---------------------------------------------------------------------------
function makePainter(buf) {
  const px = (x, y) => (y * W + x) * 3;
  function fillRect(x, y, w, h, c) {
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    if (w <= 0 || h <= 0) return;
    const x0 = Math.max(0, x);
    const y0 = Math.max(0, y);
    const x1 = Math.min(W, x + w);
    const y1 = Math.min(H, y + h);
    if (x1 <= x0 || y1 <= y0) return;
    const row = Buffer.alloc((x1 - x0) * 3);
    for (let i = 0; i < x1 - x0; i++) {
      row[i * 3] = c[0]; row[i * 3 + 1] = c[1]; row[i * 3 + 2] = c[2];
    }
    for (let yy = y0; yy < y1; yy++) {
      buf.set(row, yy * W * 3 + x0 * 3);
    }
  }
  function circle(cx, cy, r, c) {
    cx = Math.round(cx); cy = Math.round(cy); r = Math.round(r);
    for (let dy = -r; dy <= r; dy++) {
      const hw = Math.floor(Math.sqrt(r * r - dy * dy));
      if (hw >= 0) fillRect(cx - hw, cy + dy, hw * 2 + 1, 1, c);
    }
  }
  function ring(cx, cy, r, c, w) {
    cx = Math.round(cx); cy = Math.round(cy); r = Math.round(r);
    const ri = Math.max(0, r - w);
    for (let dy = -r; dy <= r; dy++) {
      const ho = Math.floor(Math.sqrt(r * r - dy * dy));
      const hi = dy * dy <= ri * ri ? Math.floor(Math.sqrt(ri * ri - dy * dy)) : -1;
      if (hi >= 0) {
        fillRect(cx - ho, cy + dy, ho - hi, 1, c);
        fillRect(cx + hi + 1, cy + dy, ho - hi, 1, c);
      } else {
        fillRect(cx - ho, cy + dy, ho * 2 + 1, 1, c);
      }
    }
  }
  function tri(a, b, c2, col) {
    const pts = [a, b, c2].sort((p, q) => p[1] - q[1]);
    const [x0, y0] = pts[0];
    const [x1, y1] = pts[1];
    const [x2, y2] = pts[2];
    const lerp = (y, xa, ya, xb, yb) => (yb === ya ? xa : xa + ((xb - xa) * (y - ya)) / (yb - ya));
    for (let y = Math.ceil(y0); y <= Math.floor(y2); y++) {
      let xa; let xb;
      if (y < y1) {
        xa = lerp(y, x0, y0, x1, y1);
        xb = lerp(y, x0, y0, x2, y2);
      } else {
        xa = lerp(y, x1, y1, x2, y2);
        xb = lerp(y, x0, y0, x2, y2);
      }
      const xStart = Math.min(xa, xb);
      const xEnd = Math.max(xa, xb);
      fillRect(Math.floor(xStart), y, Math.ceil(xEnd - xStart) + 1, 1, col);
    }
  }
  function text(str, x, y, scale, c, align) {
    const lines = str.split('\n');
    lines.forEach((line, li) => {
      const tw = textWidth(line, scale);
      let ox = x;
      if (align === 'center') ox = x - Math.floor(tw / 2);
      if (align === 'right') ox = x - tw;
      for (let ci = 0; ci < line.length; ci++) {
        const g = FONT[line[ci].toUpperCase()] || FONT['?'];
        for (let gy = 0; gy < 7; gy++) {
          for (let gx = 0; gx < 5; gx++) {
            if (g[gy][gx] === '1') {
              fillRect(ox + (ci * 6 + gx) * scale, y + li * 9 * scale + gy * scale, scale, scale, c);
            }
          }
        }
      }
    });
  }
  const dimLUT = new Map();
  function dim(a) {
    let lut = dimLUT.get(a);
    if (!lut) {
      lut = new Uint8Array(256);
      for (let i = 0; i < 256; i++) lut[i] = Math.round(i * (1 - a));
      dimLUT.set(a, lut);
    }
    for (let i = 0; i < buf.length; i++) buf[i] = lut[buf[i]];
  }
  return { fillRect, circle, ring, tri, text, dim };
}

// ---------------------------------------------------------------------------
// Segments.
// ---------------------------------------------------------------------------
const SEGMENTS = [
  {
    name: '01-hook', day: 1, t0: 0, t1: 3,
    labels: [
      { dim: 0.55 },
      { text: 'DAY 1 vs DAY 7', y: 740, scale: 11 },
      { text: 'SAME TINY GAME', y: 950, scale: 6, color: COL.accent },
      { text: 'ONE WEEK OF DAILY UPDATES', y: 1030, scale: 6 },
    ],
  },
  {
    name: '02-day1', day: 1, t0: 2, t1: 9,
    labels: [{ text: 'DAY 1 - JUST BUILT', x: 48, y: 230, scale: 5, align: 'left' }],
  },
  {
    name: '03-day7', day: 7, t0: 2, t1: 9,
    labels: [{ text: 'DAY 7 - A WEEK OF UPDATES', x: 48, y: 230, scale: 5, align: 'left', color: COL.accent }],
  },
  {
    name: '04-cut1a', day: 1, t0: 12, t1: 14,
    labels: [{ text: 'SAME MOMENT', y: 230, scale: 6, color: COL.accent }],
  },
  {
    name: '05-cut1b', day: 7, t0: 12, t1: 14,
    labels: [{ text: 'SAME MOMENT', y: 230, scale: 6, color: COL.accent }],
  },
  {
    name: '06-cut2a', day: 1, t0: 16, t1: 18,
    labels: [{ text: 'SAME MOMENT', y: 230, scale: 6, color: COL.accent }],
  },
  {
    name: '07-cut2b', day: 7, t0: 16, t1: 18,
    labels: [{ text: 'SAME MOMENT', y: 230, scale: 6, color: COL.accent }],
  },
  {
    name: '08-close', day: 7, t0: 20, t1: 25,
    labels: [
      { text: 'START YOURS AT', y: 330, scale: 7 },
      { text: 'MAKE.FUN', y: 430, scale: 10, color: COL.accent },
    ],
  },
];

function runFfmpeg(outFile) {
  const ff = spawn('ffmpeg', [
    '-y', '-v', 'error',
    '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', `${W}x${H}`, '-r', String(FPS),
    '-i', '-',
    '-an', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18',
    '-preset', 'veryfast', '-movflags', '+faststart', outFile,
  ], { stdio: ['pipe', 'inherit', 'inherit'] });
  return ff;
}

async function renderSegment(seg) {
  const outFile = join(OUT, `seg-${seg.name}.mp4`);
  const ff = runFfmpeg(outFile);
  const buf = Buffer.alloc(W * H * 3);
  const painter = makePainter(buf);
  const sim = createSim(seg.day);
  const dt = 1 / FPS;
  const startFrame = Math.round(seg.t0 * FPS);
  const endFrame = Math.round(seg.t1 * FPS);
  let frame = 0;
  const t0 = Date.now();
  while (frame < endFrame) {
    stepSim(sim, dt);
    if (frame >= startFrame) {
      drawSim(painter, sim, seg.labels);
      if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    }
    frame++;
  }
  ff.stdin.end();
  await new Promise((resolve, reject) => {
    ff.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exit ${code} for ${seg.name}`))));
  });
  console.log(`seg ${seg.name}: ${endFrame - startFrame} frames, day ${seg.day}, t ${seg.t0}-${seg.t1}s, ${((Date.now() - t0) / 1000).toFixed(1)}s -> ${outFile}`);
}

const manifest = [];
for (const seg of SEGMENTS) {
  await renderSegment(seg);
  manifest.push({ file: `seg-${seg.name}.mp4`, ...seg });
}
writeFileSync(join(OUT, 'segments.json'), JSON.stringify(manifest, null, 2));
console.log('done, segments in', OUT);
