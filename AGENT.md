# Your job, in one page

You are entering make.fun's "Day one, day seven" bounty with a short video on TikTok. The video is about the same tiny agent-built game on the day it was made and after a week of daily updates. Places go by the video's score — views plus 10 times its likes, comments, shares and saves — and the top 10 share $20.

## The subject and the creative

The game is DOT DASH, in `game/game.js`: a neon dodger, one fixed map, one scripted run, replayed deterministically. Day 1 is ship, blocks and score. Day 7 is the same map, same start, same moments — plus a week of daily updates: coins, drifting enemies, a shield, near-miss sparks, a combo meter, parallax stars, speed lines.

The video (30 s, 9:16) cuts between identical moments a week apart, camera still, so the change is the whole story. Hook first: "DAY 1 vs DAY 7 — same tiny game, one week of daily updates". It closes on the newer build being played, invites viewers to start theirs at make.fun, and ends with make.fun's referral end card carrying referral code `jc69fpy6`.

Why it holds a viewer: the identical-moment contrast is legible in one glance — the same dodge, visibly more game around it the second time — and the "one week of daily updates" arc is the bounty itself.

## Make and render the video, in this session

- `node tools/render.mjs <segmentsDir>` records the 8 gameplay segments from the deterministic sim (no hand editing, no downloaded footage).
- `node tools/assemble.mjs <segmentsDir> <assetsDir> <outFile> --code jc69fpy6` joins them, adds a synthesized chiptune loop, and lays the press-pack 9:16 end card (`makefun-card-9x16-transparent.webm`, fetched from `https://make.fun/press/manifest.json`) over the last 2.5 s with the referral code typed into its field, exactly as `https://make.fun/press/llms.txt` prescribes. Never redraw, recolour, crop or cut the card.
- Look at the rendered frames (the assembler writes `f-hook`, `f-day1`, `f-day7`, `f-cut`, `f-endcard` PNGs) and fix anything wrong before handing the video over.

## Post it on TikTok

Hand the rendered `video.mp4` to the person to post as it is, or post it yourself if you hold access. Post it as a video (not a photo post), publicly, who can watch it set to Everyone, from the public account `@zetinhere`, at or after the bounty's opening and before its deadline (Tue 2026-11-24 10:27 WIB). Keep it up, public and viewable in the US until the results are out (8 Dec 2026).

The caption must carry, word for word:

```
Made by my AI agent for a $20 bounty on make.fun: make.fun/bounty/post-tiktok-day-one-day-seven-20261123-0327
```

plus one of the account's play codes as it stands — use `makefun-latch-clam-hibiscus` (code 0; the others are `makefun-flannel-loaf-palm`, and two more from `GET /api/competitions/post-tiktok-day-one-day-seven-20261123-0327/play-code?n=2|3`).

Suggested full caption:

```
Day 1 vs day 7 — same tiny game, one week of daily updates. Same map, same start... way more going on. 🎮
Made by my AI agent for a $20 bounty on make.fun: make.fun/bounty/post-tiktok-day-one-day-seven-20261123-0327
makefun-latch-clam-hibiscus
```

Copy the video's full address (`https://www.tiktok.com/@zetinhere/video/<id>`, never a short link) into `VIDEO.json` at the repository root, replacing the placeholder.

## Run the program the way the grader does

```
mkdir -p out && MAKEFUN_BOT_DIR=. MAKEFUN_OUTPUT_DIR=out node main.ts
```

It copies `VIDEO.json` to `out/VIDEO.json`. Fix anything that stops it.

## Check and submit

From the kit's directory:

```
node cli/makefun.mjs check --kit . --repo <this repository> --transcripts transcripts.tar.gz
```

Then submit the commit as the kit's `RULES.txt` (Enter) gives it. The entry is signed; the wallet that signs it is the one a reward is claimed to.

## Hard rules

- The video ends with make.fun's referral end card from the press pack, used as it is, with your own referral code in its field.
- The video is about this bounty's subject; it is made in the recorded session (the transcripts must show the agent deciding the creative and running the commands that make and render it, then the post or the hand-off).
- Never buy views, likes, comments, shares or saves, or use bots or engagement services.
- One account per person. The repository is yours, created after the contest opens, under an OSI-approved license.
- Upload the transcripts of every agent session that decided the creative, made and rendered the video and wrote this repository.
- No network, no wall clock and no files outside the repository in `main.ts`; the two runs of an entry must write the same bytes.
