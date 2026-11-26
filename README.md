# Beacon Coast

[![make.fun competition](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)
[![Live rank](https://make.fun/badge/best-flight-game-20261126-0057/di3725605-maker/beacon-coast/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)
[![Live reward](https://make.fun/badge/best-flight-game-20261126-0057/di3725605-maker/beacon-coast/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)

An original coastal air rally: take off from a seaside airfield, thread seven ordered beacons along the shore and over the ridge, then return for a scored landing on Runway 36. Precision, a shoreline low pass and a clean landing build your score; missed gates and ground contact cost points.

Built for [Make the best flight game](https://make.fun/bounty/best-flight-game-20261126-0057). Explore the platform with the [make.fun referral link](https://make.fun/?ref=97tpff5r).

## Play offline

Open `game/index.html` in a desktop browser with WebGL support. All scripts, terrain and aircraft geometry are local; gameplay needs no installation, build step, account or network connection.

- W/S: nose down/up; A/D: bank left/right; Q/E: yaw left/right.
- Shift/Ctrl: increase/decrease throttle.
- Drag the mouse over the flight view to steer.
- P: toggle the assisted tour; R: restart; H: show/hide control hints.
- For a reproducible full tour, restart and then press P, or open `game/index.html?tour=1`.

The tour uses the same fixed-step simulation, gate checks, scoring, collisions and landing checks as manual flight.

## Grader adapter

Use Node 22.18 or newer with native TypeScript support, from the repository root:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Without the environment override, output goes to `/output`. The adapter copies `game/` and `screenshots/`, calls the unchanged kit `buildDossier` with the competition caps, and writes `dossier.json`, `action-log.json` and `evidence.json`. The evidence records the seeded input tape hash, replay events, screenshot hashes and final simulation state. No timestamps or random values enter those files. Re-running replaces the generated game and screenshot copies, so use a dedicated output directory.

The kit requires genuine screenshots before it will create a dossier. Four were captured from the game in headless Chrome at 1280 × 720 (takeoff, coastal low pass, ridge approach, final approach), each a JPEG at or below 262,144 bytes, and each inspected at 640 × 360: the aircraft, the active beacon ring and the HUD (ALT/SPD/HDG) are legible in all four. Two adapter runs with the screenshots in place both exited 0 in under 0.5 seconds and produced byte-identical dossier.json and evidence.json. The local runtime tested was Node v24.22.1; Node 22 was not available here.

## Screenshot plan

`shots.json` lists four deterministic replay views. Render `game/index.html` with each query at 1280 × 720 and save the named JPEG in `screenshots/`. The first filename is the cover. Keep every image at or below 262,144 bytes and inspect it at 640 × 360.

The four intended views are takeoff, coastal low pass, ridge approach and final approach. Screenshots must be actual game renders.

## Credits and license

Original game code and procedural visuals: MIT, see `LICENSE`. Three.js r160 is vendored unchanged as `game/three.min.js` under its upstream MIT license; published artifact: https://unpkg.com/three@0.160.0/build/three.min.js.

Three.js SHA-256: `170c6789f43217c96b3170f4b42fafe135de7f7cd48497a4218f9757ee1d49fa`.
