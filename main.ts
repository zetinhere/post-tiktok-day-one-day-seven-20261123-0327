// DOT DASH — "Day one, day seven" entry for make.fun
// (post-tiktok-day-one-day-seven-20261123-0327, Node 22, standard library only).
//
// The entry is the video itself: a short TikTok clip about the same tiny
// agent-built game on the day it was made and after a week of daily updates,
// ending with make.fun's referral end card. The video lives on TikTok; this
// program only hands the house its address. It copies VIDEO.json from the
// repository root to /output/VIDEO.json, where the gate reads it. Nothing
// this program writes about the video is scored — the house reads the video
// and its counts from TikTok directly.
//
// Run it the way the grader does:
//   mkdir -p out && MAKEFUN_BOT_DIR=. MAKEFUN_OUTPUT_DIR=out node main.ts
// (VIDEO.json must hold the posted video's full address first:
// {"url": "https://www.tiktok.com/@<handle>/video/<id>"})

import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const BOT_DIR = process.env.MAKEFUN_BOT_DIR ?? '/bot';
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const src = join(BOT_DIR, 'VIDEO.json');
const dst = join(OUTPUT_DIR, 'VIDEO.json');

if (!existsSync(src)) {
  console.error(`VIDEO.json not found in ${BOT_DIR}`);
  process.exit(1);
}

// Refuse a placeholder instead of silently copying it: the gate would score
// it 0, and a loud failure here is cheaper than a quiet one there. The
// placeholder this repository ships with uses an all-zero video id, which no
// real TikTok video has.
const parsed = JSON.parse(readFileSync(src, 'utf8'));
const url = parsed?.url;
const match = typeof url === 'string'
  ? url.match(/^https:\/\/(www\.|m\.)?tiktok\.com\/@[^/]+\/video\/(\d+)$/)
  : null;
if (!match || /^0+$/.test(match[2])) {
  console.error(`VIDEO.json does not hold a posted TikTok video address yet: ${JSON.stringify(url)}`);
  process.exit(1);
}

mkdirSync(OUTPUT_DIR, { recursive: true });
copyFileSync(src, dst);
console.log(`copied VIDEO.json -> ${dst}`);
