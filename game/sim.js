(function (root) {
  'use strict';
  const DT = 1 / 60;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
  const route = [
    [-350, 65, 100, 'Departure'],
    [-470, 80, 780, 'Saltwater curve'],
    [-40, 145, 1370, 'River mouth'],
    [720, 260, 1470, 'Beacon saddle'],
    [1240, 215, 650, 'Orchard turn'],
    [960, 150, -420, 'South headland'],
    [80, 95, -1160, 'Homeward'],
  ].map((p, i, a) => {
    const prev = i ? a[i - 1] : [-350, 6, -650];
    const dx = p[0] - prev[0], dz = p[2] - prev[2], n = Math.hypot(dx, dz);
    return { x: p[0], y: p[1], z: p[2], name: p[3], nx: dx / n, nz: dz / n, radius: 100 };
  });
  function ground(x, z) {
    if (Math.abs(x + 350) < 65 && z > -820 && z < 610) return 5;
    const edge = Math.sqrt(((x - 350) / 1650) ** 2 + ((z - 220) / 2150) ** 2);
    const coast = -760 + 110 * Math.sin(z / 410) + 65 * Math.cos(z / 730);
    if (x < coast || edge > 1) return -3;
    const ridge = 165 * Math.exp(-(((x - 920) / 520) ** 2) - ((z - 1320) / 620) ** 2);
    const hill = 98 * Math.exp(-(((x - 1380) / 550) ** 2) - ((z + 130) / 850) ** 2);
    const ripples = 9 * (Math.sin(x / 190) * Math.cos(z / 240) + 1);
    const inland = clamp((x + 400) / 550, 0, 1);
    return 5 + inland * (ridge + hill + ripples);
  }
  function create(seed = 17) {
    return { seed, tick: 0, x: -350, y: 6.6, z: -650, heading: 0, pitch: 0, bank: 0,
      speed: 24, throttle: .82, vy: 0, gate: 0, score: 0, combo: 0, phase: 'takeoff',
      event: 'COASTAL RALLY · CLEARED FOR TAKEOFF', eventTick: 0, events: [], lowPass: false,
      approach: 0, landed: false, contact: false, missed: false };
  }
  function announce(s, type, text, points = 0) {
    s.event = text; s.eventTick = s.tick;
    s.events.push({ tick: s.tick, type, points, gate: s.gate, score: s.score });
  }
  function target(s) {
    if (s.gate < route.length) return route[s.gate];
    const approach = [[-350, 75, -1660], [-350, 48, -1110], [-350, 7, 650]];
    const p = approach[Math.min(s.approach, 2)];
    return { x: p[0], y: p[1], z: p[2], name: s.approach < 2 ? 'Join final' : 'Runway 36', radius: 70 };
  }
  function step(s, input = {}) {
    if (input.restart) return create(s.seed);
    if (s.phase === 'crashed' || s.phase === 'complete') return s;
    s.tick++;
    const old = { x: s.x, y: s.y, z: s.z };
    if (Number.isFinite(input.throttle)) s.throttle = clamp(input.throttle, .1, 1);
    s.throttle = clamp(s.throttle + (input.power || 0) * DT * .22, .1, 1);
    s.bank += (clamp(input.roll || 0, -1, 1) * .88 - s.bank) * DT * 2.7;
    s.pitch += (clamp(input.pitch || 0, -1, 1) * .32 - s.pitch) * DT * 2.2;
    s.heading = wrap(s.heading + (Math.tan(s.bank) * .38 + (input.yaw || 0) * .19) * DT);
    const desiredSpeed = 29 + s.throttle * 53 - Math.max(0, s.pitch) * 35;
    s.speed += (desiredSpeed - s.speed) * DT * .48;
    const sink = Math.max(0, 43 - s.speed) * .38;
    const lift = Math.max(0, s.speed - 46) * .025;
    s.vy += (s.speed * Math.sin(s.pitch) + lift - sink - s.vy) * DT * 2.2;
    s.x += Math.sin(s.heading) * s.speed * Math.cos(s.pitch) * DT;
    s.z += Math.cos(s.heading) * s.speed * Math.cos(s.pitch) * DT;
    s.y += s.vy * DT;
    const onRunway = Math.abs(s.x + 350) < 24 && s.z > -760 && s.z < 550;
    const floor = ground(s.x, s.z) + 1.6;
    if (s.phase === 'takeoff' && s.y > 14) { s.phase = 'course'; announce(s, 'takeoff', 'AIRBORNE · FOLLOW THE AMBER BEACONS'); }
    if (s.y < floor) {
      if (onRunway && s.phase === 'takeoff') { s.y = floor; s.vy = Math.max(0, s.vy); }
      else if (onRunway && s.gate === route.length && Math.abs(wrap(s.heading)) < .16 && Math.abs(s.vy) < 4.5 && s.speed < 60 && Math.abs(s.bank) < .16) {
        const bonus = Math.round(2400 + (4.5 - Math.abs(s.vy)) * 180 + (1 - Math.abs(s.x + 350) / 24) * 450);
        s.y = floor; s.score += bonus; s.landed = true; s.phase = 'complete';
        announce(s, 'landing', `COAST COMPLETE · +${bonus} LANDING`, bonus);
      } else {
        s.y = floor; s.score = Math.max(0, s.score - 500); s.combo = 0; s.phase = 'crashed';
        announce(s, 'collision', 'GROUND CONTACT · −500 · PRESS R TO RETRY', -500);
      }
    }
    if (s.phase === 'crashed' || s.phase === 'complete') return s;
    const g = route[s.gate];
    if (g) {
      const a = (old.x - g.x) * g.nx + (old.z - g.z) * g.nz;
      const b = (s.x - g.x) * g.nx + (s.z - g.z) * g.nz;
      if (a < 0 && b >= 0) {
        const f = -a / (b - a);
        const dx = old.x + (s.x - old.x) * f - g.x;
        const dy = old.y + (s.y - old.y) * f - g.y;
        const dz = old.z + (s.z - old.z) * f - g.z;
        const error = Math.hypot(dx, dy, dz);
        if (error < g.radius - 7) {
          const points = 1000 + Math.round((1 - error / g.radius) * 600) + s.combo * 120;
          s.score += points; s.combo++; s.gate++; s.missed = false;
          announce(s, 'gate', `BEACON ${s.gate} CLEARED · +${points}`, points);
          if (s.gate === route.length) { s.phase = 'return'; announce(s, 'return', 'SEVEN BEACONS · RETURN TO RUNWAY 36'); }
        } else if (!s.missed) {
          s.missed = true; s.score = Math.max(0, s.score - 200); s.combo = 0;
          announce(s, 'miss', 'MISSED BEACON · −200 · CIRCLE BACK', -200);
        }
      }
    } else {
      const t = target(s);
      if (s.approach < 2 && Math.hypot(s.x - t.x, s.z - t.z) < 90) s.approach++;
      if (s.approach === 2) s.phase = 'landing';
    }
    if (!s.lowPass && s.gate >= 1 && s.gate < 3 && s.y - ground(s.x, s.z) < 100) {
      s.lowPass = true; s.score += 350; announce(s, 'lowpass', 'SHORELINE LOW PASS · +350', 350);
    }
    return s;
  }
  function pilot(s) {
    const t = target(s), dx = t.x - s.x, dz = t.z - s.z;
    const distance = Math.hypot(dx, dz);
    const error = wrap(Math.atan2(dx, dz) - s.heading);
    let desiredPitch = clamp(Math.atan2(t.y - s.y, Math.max(80, distance)) * 1.6, -.25, .28);
    if (s.phase === 'takeoff') desiredPitch = s.speed > 40 ? .17 : 0;
    let throttle = .77;
    if (s.gate === route.length) throttle = s.approach === 2 ? .38 : .63;
    if (s.phase === 'landing') desiredPitch = clamp((6.0 - s.y) / Math.max(120, -460 - s.z) * 1.05, -.11, -.025);
    return { roll: Math.round(clamp(error * 2.6, -1, 1) * 1000) / 1000,
      pitch: Math.round(clamp(desiredPitch / .32, -1, 1) * 1000) / 1000, throttle };
  }
  function makeTape(seed = 17, limit = 18000) {
    let s = create(seed); const tape = [], marks = {};
    for (let i = 0; i < limit && s.phase !== 'complete' && s.phase !== 'crashed'; i++) {
      const a = pilot(s); tape.push(a); s = step(s, a);
      if (!marks.takeoff && s.z > -290 && s.gate === 0) marks.takeoff = s.tick;
      if (!marks.coast && s.gate === 1 && Math.hypot(s.x - route[1].x, s.z - route[1].z) < 420) marks.coast = s.tick;
      if (!marks.ridge && s.gate === 3 && Math.hypot(s.x - route[3].x, s.z - route[3].z) < 440) marks.ridge = s.tick;
      if (!marks.landing && s.phase === 'landing' && s.z > -900) marks.landing = s.tick;
    }
    return { seed, tape, marks, final: s };
  }
  const api = { DT, route, ground, create, step, pilot, makeTape, target, clamp, wrap };
  if (typeof module !== 'undefined') module.exports = api;
  else root.CoastSim = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
