(function () {
  'use strict';
  const S = CoastSim, W = CoastWorld, $ = id => document.getElementById(id);
  const query = new URLSearchParams(location.search);
  const replay = S.makeTape(17);
  let state = S.create(17), tour = query.get('tour') === '1', paused = false, showHelp = false;
  const keys = new Set(), mouse = { active: false, x: 0, y: 0, startX: 0, startY: 0 };
  let accumulator = 0, lastFrame;
  const dials = Object.fromEntries(['speed', 'altitude', 'heading'].map(name => {
    const canvas = $(`${name}-dial`);
    return [name, { canvas, q: canvas.getContext('2d') }];
  }));
  function face(q) {
    q.setTransform(2, 0, 0, 2, 0, 0); q.clearRect(0, 0, 96, 96);
    q.beginPath(); q.arc(48, 48, 44, 0, Math.PI * 2);
    q.fillStyle = '#091e29'; q.fill(); q.lineWidth = 2; q.strokeStyle = '#6d999e'; q.stroke();
    q.textAlign = 'center'; q.textBaseline = 'middle'; q.lineCap = 'round';
  }
  function needle(q, angle, length, color, width = 2) {
    q.save(); q.translate(48, 48); q.rotate(angle);
    q.beginPath(); q.moveTo(-6, 0); q.lineTo(length, 0);
    q.lineWidth = width; q.strokeStyle = color; q.stroke(); q.restore();
  }
  function hub(q) {
    q.beginPath(); q.arc(48, 48, 3.2, 0, Math.PI * 2); q.fillStyle = '#ffcf88'; q.fill();
  }
  function gauge(name, value, maximum, divisions, unit, circular = false) {
    const { canvas, q } = dials[name];
    face(q);
    const start = circular ? -Math.PI / 2 : Math.PI * .75;
    const sweep = circular ? Math.PI * 2 : Math.PI * 1.5;
    for (let i = 0; i <= divisions; i++) {
      if (circular && i === divisions) continue;
      const a = start + i / divisions * sweep, major = i % 2 === 0;
      q.beginPath(); q.moveTo(48 + Math.cos(a) * (major ? 32 : 36), 48 + Math.sin(a) * (major ? 32 : 36));
      q.lineTo(48 + Math.cos(a) * 39, 48 + Math.sin(a) * 39);
      q.lineWidth = major ? 1.6 : .8; q.strokeStyle = major ? '#e4f7ec' : '#6d999e'; q.stroke();
      if (major) {
        q.font = 'bold 8px Arial'; q.fillStyle = '#e4f7ec';
        q.fillText(String(circular ? i / 2 : i / divisions * maximum), 48 + Math.cos(a) * 25, 48 + Math.sin(a) * 25);
      }
    }
    if (!circular) {
      q.beginPath(); q.arc(48, 48, 41, Math.PI * .75 + 85 / maximum * Math.PI * 1.5, Math.PI * .75 + 155 / maximum * Math.PI * 1.5);
      q.lineWidth = 2; q.strokeStyle = '#73c5a6'; q.stroke();
    }
    q.font = 'bold 7px Arial'; q.fillStyle = '#7cb8bf'; q.fillText(unit, 48, circular ? 69 : 67);
    if (circular) needle(q, start + (value % 10000) / 10000 * sweep, 18, '#ffcf88', 3);
    needle(q, start + (circular ? value % maximum : S.clamp(value, 0, maximum)) / maximum * sweep, 32, '#d5ffff');
    hub(q); canvas.dataset.value = String(value); canvas.dataset.unit = name === 'speed' ? 'KT' : 'FT MSL';
    canvas.setAttribute('aria-label', `${name === 'speed' ? 'Airspeed' : 'Altitude'} ${value} ${canvas.dataset.unit}`);
  }
  function compassRose(value) {
    const { canvas, q } = dials.heading; face(q);
    q.save(); q.translate(48, 48); q.rotate(-value * Math.PI / 180);
    for (let i = 0; i < 16; i++) {
      const a = i * Math.PI / 8 - Math.PI / 2;
      q.beginPath(); q.moveTo(Math.cos(a) * 32, Math.sin(a) * 32); q.lineTo(Math.cos(a) * 39, Math.sin(a) * 39);
      q.lineWidth = i % 4 ? 1 : 2; q.strokeStyle = '#83bfc4'; q.stroke();
      if (i % 4 === 0) {
        q.save(); q.translate(Math.cos(a) * 24, Math.sin(a) * 24); q.rotate(value * Math.PI / 180);
        q.font = 'bold 10px Arial'; q.fillStyle = i === 0 ? '#ffcf88' : '#d5ffff'; q.fillText(['N', 'E', 'S', 'W'][i / 4], 0, 0); q.restore();
      }
    }
    q.restore();
    q.beginPath(); q.moveTo(43, 8); q.lineTo(53, 8); q.lineTo(48, 15); q.closePath(); q.fillStyle = '#ffcf88'; q.fill();
    q.beginPath(); q.moveTo(48, 34); q.lineTo(48, 60); q.moveTo(35, 47); q.lineTo(61, 47); q.moveTo(42, 57); q.lineTo(54, 57);
    q.lineWidth = 2; q.strokeStyle = '#d5ffff'; q.stroke();
    canvas.dataset.value = String(value); canvas.dataset.unit = 'DEG'; canvas.setAttribute('aria-label', `Heading ${String(value).padStart(3, '0')} degrees`);
  }
  $('progress').innerHTML = S.route.map(() => '<i></i>').join('');
  function restart() { state = S.create(17); tour = false; paused = false; keys.clear(); mouse.active = false; $('result').hidden = true; $('world').focus(); }
  addEventListener('keydown', e => {
    const key = e.key.toLowerCase();
    if (['w', 'a', 's', 'd', 'q', 'e', 'shift', 'control', ' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) e.preventDefault();
    keys.add(key);
    if (e.repeat) return;
    if (key === 'r') restart();
    if (key === 'h') showHelp = !showHelp;
    if (key === 'p') tour = !tour;
  });
  addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
  addEventListener('blur', () => { keys.clear(); mouse.active = false; });
  const canvas = $('world');
  canvas.addEventListener('pointerdown', e => { mouse.active = true; mouse.startX = e.clientX; mouse.startY = e.clientY; mouse.x = 0; mouse.y = 0; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', e => { if (mouse.active) { mouse.x = S.clamp((e.clientX - mouse.startX) / 180, -1, 1); mouse.y = S.clamp((e.clientY - mouse.startY) / 180, -1, 1); } });
  canvas.addEventListener('pointerup', () => mouse.active = false);
  canvas.addEventListener('pointercancel', () => mouse.active = false);
  $('restart').onclick = restart;
  function input() {
    if (tour) return replay.tape[state.tick] || {};
    const roll = Number(keys.has('d') || keys.has('arrowright')) - Number(keys.has('a') || keys.has('arrowleft'));
    const pitch = Number(keys.has('s') || keys.has('arrowdown')) - Number(keys.has('w') || keys.has('arrowup'));
    return { roll: roll || (mouse.active ? mouse.x : 0), pitch: pitch || (mouse.active ? -mouse.y : 0),
      yaw: Number(keys.has('e')) - Number(keys.has('q')), power: Number(keys.has('shift')) - Number(keys.has('control')) };
  }
  function hud() {
    const s = state, t = S.target(s), distance = Math.hypot(t.x - s.x, t.y - s.y, t.z - s.z);
    const speed = Math.round(s.speed * 1.94384), altitude = Math.round(s.y * 3.28084);
    const heading = Math.round((s.heading * 180 / Math.PI + 360) % 360) % 360;
    $('speed').textContent = String(speed).padStart(3, '0');
    $('altitude').textContent = String(altitude).padStart(3, '0');
    $('heading').textContent = String(heading).padStart(3, '0');
    gauge('speed', speed, 180, 18, 'KT'); gauge('altitude', altitude, 1000, 20, 'FT ×100', true); compassRose(heading);
    $('clearance').textContent = String(Math.round(Math.max(0, s.y - S.ground(s.x, s.z)) * 3.28084)).padStart(3, '0');
    const compass = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const ci = Math.round(heading / 45) % 8;
    $('compass').textContent = `${compass[(ci + 7) % 8]} · · ▾ ${compass[ci]} ▾ · · ${compass[(ci + 1) % 8]}`;
    $('objective').textContent = t.name;
    $('stage').textContent = s.gate < 7 ? `BEACON ${String(s.gate + 1).padStart(2, '0')} / 07` : 'RETURN / RUNWAY 36';
    $('distance').textContent = String(Math.round(distance));
    $('task').textContent = s.gate < 7 ? 'CYAN BEACON' : 'ALIGN · SLOW · DESCEND';
    $('score').textContent = String(s.score).padStart(6, '0');
    $('combo').textContent = `×${Math.max(1, s.combo)}`;
    $('throttle').textContent = `${Math.round(s.throttle * 100)}%`;
    $('power').style.width = `${s.throttle * 100}%`;
    $('horizon').style.transform = `translateY(${s.pitch * 45}px) rotate(${-s.bank * 180 / Math.PI}deg)`;
    $('pitch').textContent = `${s.pitch >= 0 ? '+' : '−'}${String(Math.abs(Math.round(s.pitch * 180 / Math.PI))).padStart(2, '0')}°`;
    $('phase').textContent = { takeoff: '01 / DEPARTURE', course: '02 / COASTAL CIRCUIT', return: '03 / JOIN FINAL', landing: '04 / LANDING CLEARANCE', complete: 'RALLY COMPLETE', crashed: 'FLIGHT ENDED' }[s.phase];
    $('timer').textContent = `${String(Math.floor(s.tick / 3600)).padStart(2, '0')}:${(s.tick / 60 % 60).toFixed(1).padStart(4, '0')}`;
    [...$('progress').children].forEach((p, i) => p.className = i < s.gate ? 'done' : i === s.gate ? 'active' : '');
    $('toast').textContent = s.tick - s.eventTick < 210 && s.tick > 20 ? s.event : '';
    $('hint').hidden = s.tick > 300 && !showHelp;
    $('tour').hidden = !tour || !!query.get('shot');
    const projected = W.project(t), behind = Math.cos(S.wrap(Math.atan2(t.x - s.x, t.z - s.z) - s.heading)) < 0;
    $('pointer').hidden = !behind && Math.abs(projected.x) < .9 && Math.abs(projected.y) < .9;
    $('pointer').textContent = `${S.wrap(Math.atan2(t.x - s.x, t.z - s.z) - s.heading) < 0 ? '◀' : '▶'} ${s.gate < 7 ? 'BEACON' : 'RUNWAY'} ${Math.round(distance)} M`;
    if (s.phase === 'complete' || s.phase === 'crashed') {
      $('result').hidden = false;
      $('result-title').textContent = s.landed ? 'Coast complete.' : 'A fresh departure.';
      $('result-copy').textContent = s.landed ? `${s.score.toLocaleString('en-US')} points · 7 beacons · ${Math.floor(s.tick / 60)} seconds. Precision flying, all the way home.` : `Ground contact ended this flight. ${s.gate}/7 beacons cleared. Bank gently and keep your airspeed above 85 KT.`;
    }
  }
  function render(snap = false) { W.draw(state, snap); hud(); }
  function seek(tick) {
    state = S.create(replay.seed);
    for (let i = 0; i < Math.min(tick, replay.tape.length); i++) state = S.step(state, replay.tape[i]);
    render(true); return state;
  }
  const shot = query.get('shot');
  if (shot) { seek(replay.marks[shot] || replay.marks.takeoff); paused = true; }
  function frame(time) {
    if (lastFrame === undefined) lastFrame = time;
    accumulator += Math.min(.1, (time - lastFrame) / 1000); lastFrame = time;
    while (accumulator >= S.DT) { if (!paused) state = S.step(state, input()); accumulator -= S.DT; }
    render(); requestAnimationFrame(frame);
  }
  window.Beacon = { get state() { return state; }, replay, seek, restart, get paused() { return paused; }, set paused(value) { paused = value; }, render,
    step(action) { state = S.step(state, action); render(); return state; } };
  render(true); requestAnimationFrame(frame);
})();
