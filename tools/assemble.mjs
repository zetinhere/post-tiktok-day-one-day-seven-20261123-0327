// Joins the rendered segments into the final TikTok video and ends it with
// make.fun's referral end card from the press pack.
// Usage: node tools/assemble.mjs <segmentsDir> <assetsDir> <outFile> [--code jc69fpy6]
// Steps: (1) concat the segments, (2) add a small synthesized chiptune loop,
// (3) lay the transparent 9:16 end card over the last 2.5 s and type the
// referral code into its field, exactly as https://make.fun/press/llms.txt
// prescribes (blur sigma 28, saturation 0.35 fading in over 0.8 s, code in
// JetBrains Mono Bold, ink #191419, once the field has come to rest).
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const [SEG_DIR, ASSETS, OUT] = process.argv.slice(2);
const codeIdx = process.argv.indexOf('--code');
const CODE = codeIdx >= 0 ? process.argv[codeIdx + 1] : 'jc69fpy6';
if (!SEG_DIR || !ASSETS || !OUT) {
  console.error('usage: node tools/assemble.mjs <segmentsDir> <assetsDir> <outFile> [--code <referral>]');
  process.exit(1);
}
mkdirSync(dirname(OUT), { recursive: true });

const CARD = join(ASSETS, 'card-9x16.webm');
const FONT = join(ASSETS, 'JetBrainsMono-Bold.ttf');
for (const f of [CARD, FONT]) {
  if (!existsSync(f)) { console.error('missing asset:', f); process.exit(1); }
}

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ['ignore', 'inherit', 'inherit'], ...opts });
    p.on('error', reject);
    p.on('close', (c) => (c === 0 ? resolve() : reject(new Error(`${cmd} exit ${c}: ${args.join(' ')}`))));
  });
}

// ---------------------------------------------------------------------------
// 1. Synthesized chiptune: a bouncy 8-step loop, 30 s, 22050 Hz mono.
//    Written as a WAV by hand (no dependency). Quiet on purpose.
// ---------------------------------------------------------------------------
function writeWav(path, seconds) {
  const SR = 22050;
  const n = Math.floor(seconds * SR);
  const data = new Int16Array(n);
  // A-minor-ish arpeggio, one note per 8th at 140 bpm (0.214 s).
  const lead = [440, 523.25, 659.25, 880, 659.25, 523.25, 587.33, 698.46];
  const bass = [110, 110, 130.81, 98];
  const stepDur = 60 / 140 / 2;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const step = Math.floor(t / stepDur);
    const lt = t - step * stepDur;
    const f = lead[step % lead.length];
    const bf = bass[Math.floor(step / 2) % bass.length];
    // Square-ish lead with fast decay, soft sine bass.
    const leadWave = Math.sign(Math.sin(2 * Math.PI * f * lt)) * Math.exp(-lt * 9);
    const bassWave = Math.sin(2 * Math.PI * bf * t) * 0.5;
    // A little sparkle an octave up on every fourth step.
    const spark = step % 4 === 0
      ? Math.sin(2 * Math.PI * f * 2 * lt) * Math.exp(-lt * 14) * 0.4 : 0;
    const v = (leadWave * 0.30 + bassWave * 0.35 + spark) * 0.5;
    data[i] = Math.max(-32767, Math.min(32767, Math.round(v * 32767)));
  }
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + n * 2, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(SR, 24);
  header.writeUInt32LE(SR * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(n * 2, 40);
  writeFileSync(path, Buffer.concat([header, Buffer.from(data.buffer)]));
  console.log('audio:', path, seconds, 's');
}

// ---------------------------------------------------------------------------
// 2. Concat the segments and add the audio.
// ---------------------------------------------------------------------------
const segs = readdirSync(SEG_DIR).filter((f) => f.startsWith('seg-') && f.endsWith('.mp4')).sort();
if (segs.length !== 8) throw new Error(`expected 8 segments, found ${segs.length}: ${segs.join(', ')}`);
const listPath = join(SEG_DIR, 'concat.txt');
writeFileSync(listPath, segs.map((f) => `file '${join(SEG_DIR, f)}'`).join('\n') + '\n');

const tmpDir = join(dirname(OUT), 'tmp-assemble');
mkdirSync(tmpDir, { recursive: true });
const audioPath = join(tmpDir, 'audio.wav');
const basePath = join(tmpDir, 'base.mp4');
writeWav(audioPath, 30);

await run('ffmpeg', [
  '-y', '-v', 'error',
  '-f', 'concat', '-safe', '0', '-i', listPath,
  '-i', audioPath,
  '-map', '0:v', '-map', '1:a',
  '-c:v', 'copy', '-c:a', 'aac', '-b:a', '128k',
  '-shortest', basePath,
]);
console.log('base:', basePath);

// ---------------------------------------------------------------------------
// 3. Referral end card over the last 2.5 s (press-pack recipe).
// ---------------------------------------------------------------------------
const LEN = 2.5;
const REST = 1.433;
const T = 30 - LEN; // card starts at 27.5 s
const filter = [
  '[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,fps=60,',
  'fade=t=in:st=0:d=0.4,tpad=stop_mode=clone:stop_duration=0,format=yuva420p,split[clip][soft];',
  `[soft]gblur=sigma=28,eq=saturation=0.35,fade=t=in:st=${T}:d=0.8:alpha=1[soft];`,
  '[clip][soft]overlay[bg];',
  `[1:v]format=yuva420p,setpts=PTS-STARTPTS+${T}/TB[card];`,
  '[bg][card]overlay=eof_action=pass,',
  `drawbox=x=208:y=1230:w=9:h=82:color=white:t=fill:enable='gte(t,${T + REST})',`,
  `drawtext=fontfile=${FONT}:text=${CODE}:fontsize=62:fontcolor=0x191419:x=210:y=1271-(ascent-descent)/2:enable='gte(t,${T + REST})'[v]`,
].join('');

await run('ffmpeg', [
  '-y', '-v', 'error',
  '-i', basePath,
  '-c:v', 'libvpx-vp9', '-i', CARD,
  '-filter_complex', filter,
  '-map', '[v]', '-map', '0:a?',
  '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18',
  '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart',
  OUT,
]);
console.log('final video:', OUT);

// ---------------------------------------------------------------------------
// 4. Verify: duration/size plus frames to eyeball.
// ---------------------------------------------------------------------------
await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration,size',
  '-show_entries', 'stream=codec_name,width,height,r_frame_rate', '-of', 'default=nw=1', OUT]);
for (const [at, name] of [[1.5, 'f-hook'], [6, 'f-day1'], [13, 'f-day7'], [21, 'f-cut'], [29.9, 'f-endcard']]) {
  await run('ffmpeg', ['-y', '-v', 'error', '-ss', String(at), '-i', OUT,
    '-frames:v', '1', join(dirname(OUT), `${name}.png`)]);
}
console.log('frames written to', dirname(OUT));
