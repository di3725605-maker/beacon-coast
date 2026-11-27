(function () {
  'use strict';
  const T = THREE, S = CoastSim;
  const scene = new T.Scene();
  scene.background = new T.Color('#91c5d8');
  scene.fog = new T.Fog('#a4c8ce', 3000, 10000);
  const camera = new T.PerspectiveCamera(62, innerWidth / innerHeight, .4, 11000);
  const renderer = new T.WebGLRenderer({ canvas: document.getElementById('world'), antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.04;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  scene.add(new T.HemisphereLight('#d8efff', '#727149', 1.65));
  const sun = new T.DirectionalLight('#ffdfaa', 3.6);
  sun.position.set(-450, 820, -360);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -520, right: 520, top: 520, bottom: -520, near: 10, far: 2200 });
  sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.bias = -.0004; sun.shadow.normalBias = .6; sun.shadow.radius = 3;
  scene.add(sun);
  const mats = {};
  function material(color, extra = {}) {
    if (Object.keys(extra).length) return new T.MeshStandardMaterial({ color, roughness: .85, ...extra });
    return mats[color] || (mats[color] = new T.MeshStandardMaterial({ color, roughness: .88, flatShading: true }));
  }
  function mesh(geometry, color, parent = scene, extra) {
    const m = new T.Mesh(geometry, typeof color === 'string' ? material(color, extra) : color);
    m.castShadow = geometry.type !== 'PlaneGeometry' && geometry.type !== 'BufferGeometry';
    m.receiveShadow = true;
    parent.add(m); return m;
  }
  function box(w, h, d, color, x, y, z, parent = scene) {
    const m = mesh(new T.BoxGeometry(w, h, d), color, parent); m.position.set(x, y, z); return m;
  }
  let rng = 1771;
  function random() { rng = (Math.imul(rng, 1664525) + 1013904223) >>> 0; return rng / 4294967296; }
  const ocean = mesh(new T.PlaneGeometry(24000, 24000), '#176e86');
  ocean.rotation.x = -Math.PI / 2; ocean.position.y = -3.5;
  const terrainGeo = new T.PlaneGeometry(3900, 4800, 100, 120);
  terrainGeo.rotateX(-Math.PI / 2); terrainGeo.translate(300, 0, 180);
  const positions = terrainGeo.attributes.position, colors = [];
  const landColors = ['#718348', '#7d8e50', '#879152', '#637a48', '#93985b'];
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), z = positions.getZ(i), y = S.ground(x, z);
    positions.setY(i, y);
    const nearSea = S.ground(x - 42, z) < 0 || S.ground(x + 42, z) < 0 || S.ground(x, z + 45) < 0 || S.ground(x, z - 45) < 0;
    const c = new T.Color(y < 0 ? '#2d989d' : nearSea ? '#dfca91' : y > 130 ? '#7b8865' : landColors[Math.floor(random() * landColors.length)]);
    colors.push(c.r, c.g, c.b);
  }
  terrainGeo.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
  terrainGeo.computeVertexNormals();
  mesh(terrainGeo, new T.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true }));
  function ribbon(points, width, color, height = .6) {
    const vertices = [], indices = [];
    for (let i = 0; i < points.length; i++) {
      const p = points[i], a = points[Math.max(0, i - 1)], b = points[Math.min(points.length - 1, i + 1)];
      const dx = b[0] - a[0], dz = b[1] - a[1], n = Math.hypot(dx, dz) || 1;
      for (const sign of [-1, 1]) {
        const x = p[0] + dz / n * width * sign / 2, z = p[1] - dx / n * width * sign / 2;
        vertices.push(x, Math.max(-2.7, S.ground(x, z) + height), z);
      }
      if (i) { const j = i * 2; indices.push(j - 2, j, j - 1, j, j + 1, j - 1); }
    }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(vertices, 3));
    g.setIndex(indices); g.computeVertexNormals(); return mesh(g, material(color, { side: T.DoubleSide }));
  }
  const river = [];
  for (let i = 0; i <= 80; i++) { const x = -850 + i * 21; river.push([x, 1140 + 130 * Math.sin(x / 210)]); }
  ribbon(river, 38, '#3b97a8', 1.3);
  const road = [];
  for (let i = 0; i < 65; i++) { const z = -1300 + i * 36; road.push([-35 + 95 * Math.sin(z / 410), z]); }
  ribbon(road, 10, '#a8a181', 1.1);
  ribbon([[-190, -170], [-45, -160], [70, -110]], 13, '#b3a582', 1.5);
  const apron = box(160, .5, 230, '#858d7c', -180, 5.5, -190);
  box(52, .65, 1300, '#303f43', -350, 5.5, -100);
  box(3, .1, 1300, '#d4cba7', -377.5, 5.9, -100);
  box(3, .1, 1300, '#d4cba7', -322.5, 5.9, -100);
  for (let z = -620; z < 510; z += 85) box(1.8, .15, 35, '#f2e6c8', -350, 6, z);
  for (const z of [-675, 495]) for (let i = -3; i <= 3; i++) if (i) box(3.8, .15, 32, '#f4e8c8', -350 + i * 6, 6, z);
  for (const z of [-520, -380, 270, 130]) for (const side of [-1, 1]) {
    box(5, .16, 38, '#fff1d0', -350 + side * 15, 6.02, z);
  }
  for (const z of [-727, 527]) {
    box(48, .18, 3.4, '#edffe9', -350, 6.05, z);
    for (let x = -372; x <= -328; x += 5.5) {
      const light = mesh(new T.SphereGeometry(1.1, 6, 4), material('#b6ffe7', { emissive: '#54e8b7', emissiveIntensity: 2.2 }));
      light.position.set(x, 6.9, z);
    }
  }
  for (let z = -730; z <= 550; z += 50) for (const x of [-381, -319]) {
    box(1.8, 1.4, 1.8, '#e6c184', x, 6, z);
    mesh(new T.SphereGeometry(.8, 5, 3), material('#ffdfa0', { emissive: '#ffca6d', emissiveIntensity: 2 })).position.set(x, 7, z);
  }
  for (let z = -1050; z < -760; z += 40) {
    box(15, .7, 1.3, '#e9c999', -350, 5.5, z);
    for (const x of [-355, -350, -345]) {
      const lamp = mesh(new T.SphereGeometry(1.25, 6, 4), material('#fff0cf', { emissive: '#ffe0a1', emissiveIntensity: 2 }));
      lamp.position.set(x, 6.5, z);
    }
  }
  box(86, .7, 1.5, '#e9c999', -350, 5.5, -1010);
  for (let x = -390; x <= -310; x += 8) {
    const lamp = mesh(new T.SphereGeometry(1.25, 6, 4), material('#fff0cf', { emissive: '#ffe0a1', emissiveIntensity: 2 }));
    lamp.position.set(x, 6.5, -1010);
  }
  function groundText(text, x, z, w, d) {
    const c = document.createElement('canvas'); c.width = 256; c.height = 256;
    const q = c.getContext('2d'); q.fillStyle = '#f2e7c7'; q.textAlign = 'center'; q.font = 'bold 160px Arial'; q.fillText(text, 128, 185);
    const tex = new T.CanvasTexture(c); tex.colorSpace = T.SRGBColorSpace;
    const m = mesh(new T.PlaneGeometry(w, d), new T.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.rotation.z = Math.PI; m.position.set(x, 6.08, z);
  }
  groundText('36', -350, -605, 31, 52);
  groundText('18', -350, 420, 31, 52);
  function building(x, z, w, h, d, color, roofColor = '#9a6550') {
    const y = S.ground(x, z);
    box(w, h, d, color, x, y + h / 2, z);
    const roof = mesh(new T.ConeGeometry(1, 1, 4), roofColor);
    roof.scale.set(w * .8, h * .5, d * .8); roof.rotation.y = Math.PI / 4; roof.position.set(x, y + h + h * .25, z);
    box(w * .62, h * .3, .25, '#3c6266', x, y + h * .54, z - d / 2 - .2);
  }
  for (let i = 0; i < 3; i++) {
    const z = -260 + i * 80;
    building(-165, z, 56, 20, 53, '#ddd6b5', '#6f8b87');
    box(37, 15, .5, '#456369', -165, 12.8, z - 27);
  }
  building(-110, -390, 24, 38, 26, '#e9d7b0', '#c18057');
  box(31, 12, 32, '#4f7e80', -110, 42, -390);
  box(34, 2, 35, '#eee2c0', -110, 49, -390);
  for (let i = 0; i < 32; i++) {
    const x = 40 + random() * 320, z = -650 + random() * 650;
    building(x, z, 15 + random() * 14, 9 + random() * 10, 18 + random() * 16, i % 3 ? '#e4cfaa' : '#b9c4aa');
  }
  for (let i = 0; i < 16; i++) {
    const x = 150 + (i % 4) * 190, z = -850 + Math.floor(i / 4) * 220;
    const field = mesh(new T.PlaneGeometry(155, 175, 5, 5), ['#aaa46a', '#b6ae73', '#8f9c67'][i % 3]);
    field.rotation.x = -Math.PI / 2;
    const a = field.geometry.attributes.position;
    for (let j = 0; j < a.count; j++) { const wx = x + a.getX(j), wz = z - a.getY(j); a.setZ(j, S.ground(wx, wz) + .5); }
    field.geometry.computeVertexNormals(); field.position.set(x, 0, z);
    for (let k = 0; k < 5; k++) ribbon([[x - 70 + k * 32, z - 75], [x - 70 + k * 32, z + 75]], 1.2, '#d3bd83', 1);
  }
  const treeCount = 850, treeGeo = new T.ConeGeometry(1, 1, 6), trunkGeo = new T.CylinderGeometry(.9, 1.4, 8, 5);
  const trees = new T.InstancedMesh(treeGeo, material('#3d6654'), treeCount);
  const trunks = new T.InstancedMesh(trunkGeo, material('#796f50'), treeCount);
  const dummy = new T.Object3D(); let planted = 0;
  for (let i = 0; i < 9000 && planted < treeCount; i++) {
    const x = -660 + random() * 2450, z = -1700 + random() * 3550, h = S.ground(x, z);
    if (h < 6 || (x < -80 && Math.abs(x + 350) < 160 && z < 700 && z > -1100) || (x > 0 && x < 850 && z < 100 && z > -1000)) continue;
    if (Math.abs(z - 1140 - 130 * Math.sin(x / 210)) < 40) continue;
    const size = 12 + random() * 17;
    dummy.position.set(x, h + size * .68, z); dummy.scale.set(size * .43, size, size * .43); dummy.rotation.y = random() * Math.PI;
    dummy.updateMatrix(); trees.setMatrixAt(planted, dummy.matrix);
    dummy.position.y = h + 3; dummy.scale.set(1, 1, 1); dummy.updateMatrix(); trunks.setMatrixAt(planted, dummy.matrix); planted++;
  }
  trees.count = planted; trunks.count = planted; scene.add(trees, trunks);
  trees.castShadow = true; trees.receiveShadow = true; trunks.castShadow = true;
  const lighthouse = new T.Group(); scene.add(lighthouse);
  const lx = -650, lz = 410, ly = S.ground(lx, lz);
  lighthouse.position.set(lx, ly, lz);
  const tower = mesh(new T.CylinderGeometry(5, 8, 38, 10), '#f0dfb5', lighthouse); tower.position.y = 19;
  const band = mesh(new T.CylinderGeometry(5.6, 6.3, 8, 10), '#b86d44', lighthouse); band.position.y = 26;
  box(13, 7, 13, '#466c6d', 0, 42, 0, lighthouse);
  const cap = mesh(new T.ConeGeometry(10, 7, 8), '#bb754c', lighthouse); cap.position.y = 49;
  for (let i = 0; i < 18; i++) {
    const angle = i * .45, radius = 3900 + random() * 1400;
    const g = new T.ConeGeometry(500 + random() * 600, 650 + random() * 600, 5);
    const mountain = mesh(g, i % 2 ? '#849f9e' : '#91aaa4');
    mountain.position.set(350 + Math.sin(angle) * radius, 150, Math.cos(angle) * radius); mountain.rotation.y = random();
  }
  const cloudGeo = new T.IcosahedronGeometry(1, 1);
  for (let i = 0; i < 15; i++) {
    const x = -3000 + random() * 6500, z = -3000 + random() * 6500;
    for (let j = 0; j < 3; j++) {
      const cloud = mesh(cloudGeo, '#e9e7cf'); cloud.scale.set(100 + j * 22, 27 + random() * 20, 60);
      cloud.position.set(x + j * 88, 780 + i % 3 * 110, z);
    }
  }
  const gateObjects = S.route.map((g, index) => {
    const group = new T.Group(); group.position.set(g.x, g.y, g.z); group.rotation.y = Math.atan2(g.nx, g.nz);
    // The bright guide sits inside the unchanged, forgiving scoring envelope.
    const visualRadius = g.radius * .8;
    const rim = mesh(new T.TorusGeometry(visualRadius, 2.8, 8, 72), material('#93f9ff', { emissive: '#27ccdf', emissiveIntensity: .8 }), group);
    const inner = mesh(new T.TorusGeometry(visualRadius - 5, .65, 4, 64), new T.MeshBasicMaterial({ color: '#f0ffff', toneMapped: false }), group);
    const accent = mesh(new T.TorusGeometry(visualRadius + 1, 3.2, 6, 16, Math.PI / 3), new T.MeshBasicMaterial({ color: '#ffc778', toneMapped: false }), group);
    accent.rotation.z = Math.PI / 3;
    for (let i = 0; i < 12; i++) {
      const a = i * Math.PI / 6;
      const tick = mesh(new T.BoxGeometry(3.2, 9, 2.6), new T.MeshBasicMaterial({ color: '#eaffff', toneMapped: false }), group);
      tick.position.set(Math.sin(a) * visualRadius, Math.cos(a) * visualRadius, 0);
      tick.rotation.z = -a;
    }
    group.traverse(o => { o.castShadow = false; o.receiveShadow = false; });
    scene.add(group); return { group, rim, inner, accent };
  });
  const plane = new T.Group(); scene.add(plane);
  sun.target = plane;
  const cream = '#f4e5be', orange = '#d96a32', ink = '#254a53';
  const body = mesh(new T.CylinderGeometry(.65, 1.05, 6.3, 10), cream, plane);
  body.rotation.x = Math.PI / 2; body.position.z = -.4;
  const nose = mesh(new T.ConeGeometry(1.02, 1.2, 10), orange, plane); nose.rotation.x = Math.PI / 2; nose.position.z = 3.2;
  const cabin = mesh(new T.SphereGeometry(1, 10, 6), material(ink, { metalness: .2, roughness: .25 }), plane);
  cabin.scale.set(.81, .8, 1.6); cabin.position.set(0, .72, .1);
  box(.12, .8, 2.4, cream, 0, 1.05, -.1, plane);
  const wing = box(15.6, .2, 2.3, cream, 0, .1, .35, plane);
  wing.rotation.x = -.035;
  for (const side of [-1, 1]) {
    box(1.85, .24, 2.3, orange, side * 6.9, .11, .35, plane);
    box(.25, .27, 2.35, ink, side * 5.9, .11, .35, plane);
    box(3.6, .09, .13, '#ceba8e', side * 3.4, .24, -.62, plane);
    const strut = box(.09, 1.5, .1, ink, side * 2.5, -.5, .25, plane); strut.rotation.z = side * -.8;
    const wheel = mesh(new T.CylinderGeometry(.31, .31, .24, 8), '#293d40', plane);
    wheel.rotation.z = Math.PI / 2; wheel.position.set(side * 1.15, -1.25, 1.2);
  }
  box(5.5, .16, 1.25, cream, 0, .25, -3.1, plane);
  box(1.0, .19, 1.25, orange, -2.25, .25, -3.1, plane);
  box(1.0, .19, 1.25, orange, 2.25, .25, -3.1, plane);
  const tail = box(.16, 1.9, 1.4, orange, 0, 1.05, -3.1, plane); tail.rotation.x = -.18;
  box(.17, .3, .9, cream, 0, 1.75, -3.15, plane);
  const prop = new T.Group(); prop.position.z = 3.84; plane.add(prop);
  box(.13, 3.5, .09, '#344e50', 0, 0, 0, prop); box(3.5, .13, .09, '#344e50', 0, 0, 0, prop);
  const blur = mesh(new T.CircleGeometry(1.75, 32), material('#efe5c6', { transparent: true, opacity: .11, side: T.DoubleSide, depthWrite: false }), prop);
  const shadowCanvas = document.createElement('canvas'); shadowCanvas.width = shadowCanvas.height = 128;
  const shadowContext = shadowCanvas.getContext('2d');
  const fade = shadowContext.createRadialGradient(64, 64, 8, 64, 64, 64);
  fade.addColorStop(0, 'rgba(12,35,35,.6)'); fade.addColorStop(.45, 'rgba(12,35,35,.25)'); fade.addColorStop(1, 'rgba(12,35,35,0)');
  shadowContext.fillStyle = fade; shadowContext.fillRect(0, 0, 128, 128);
  const shadow = mesh(new T.CircleGeometry(12, 32), new T.MeshBasicMaterial({ map: new T.CanvasTexture(shadowCanvas), transparent: true, opacity: .5, depthWrite: false }));
  shadow.castShadow = false; shadow.receiveShadow = false;
  shadow.rotation.x = -Math.PI / 2; shadow.scale.y = .46;
  // Batch only immutable scenery. Aircraft, beacons, mapped signs and tree instances stay native.
  scene.updateMatrixWorld(true);
  const batches = new Map();
  scene.traverse(object => {
    if (!object.isMesh || object.isInstancedMesh || object.material.transparent || object.material.map || object.material.vertexColors) return;
    for (let parent = object; parent; parent = parent.parent) {
      if (parent === plane || gateObjects.some(gate => gate.group === parent)) return;
    }
    const m = object.material, attributes = Object.keys(object.geometry.attributes).sort();
    const key = [m.type, m.color.getHexString(), m.emissive?.getHexString(), m.emissiveIntensity,
      m.roughness, m.metalness, m.flatShading, m.side, object.castShadow, object.receiveShadow, attributes.join(',')].join('/');
    if (!batches.has(key)) batches.set(key, []);
    batches.get(key).push(object);
  });
  for (const objects of batches.values()) {
    if (objects.length < 2) continue;
    const parts = objects.map(object => {
      const geometry = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone();
      return geometry.applyMatrix4(object.matrixWorld);
    });
    const geometry = new T.BufferGeometry();
    for (const name of Object.keys(parts[0].attributes)) {
      const size = parts[0].attributes[name].itemSize;
      const values = new Float32Array(parts.reduce((total, part) => total + part.attributes[name].array.length, 0));
      let offset = 0;
      for (const part of parts) { values.set(part.attributes[name].array, offset); offset += part.attributes[name].array.length; }
      geometry.setAttribute(name, new T.BufferAttribute(values, size));
    }
    const combined = new T.Mesh(geometry, objects[0].material);
    combined.name = 'Static coastal scenery'; combined.castShadow = objects[0].castShadow; combined.receiveShadow = objects[0].receiveShadow;
    scene.add(combined);
    objects.forEach(object => object.parent.remove(object)); parts.forEach(part => part.dispose());
  }
  const forward = new T.Vector3(), desired = new T.Vector3(), look = new T.Vector3();
  let initialized = false;
  function draw(s, snap = false) {
    plane.position.set(s.x, s.y, s.z);
    plane.rotation.order = 'YXZ'; plane.rotation.set(-s.pitch, s.heading, -s.bank, 'YXZ');
    sun.position.set(s.x - 450, s.y + 820, s.z - 360);
    prop.rotation.z = s.tick * .91;
    shadow.position.set(s.x + 8, S.ground(s.x, s.z) + .3, s.z + 4);
    shadow.material.opacity = .5 * Math.max(0, 1 - (s.y - S.ground(s.x, s.z)) / 230);
    forward.set(Math.sin(s.heading), 0, Math.cos(s.heading));
    // At 16:9 this holds the full aircraft at 27% width, above the lower instrument strip.
    desired.set(s.x - forward.x * 27, s.y + 8.2, s.z - forward.z * 27);
    if (!initialized || snap) camera.position.copy(desired); else camera.position.lerp(desired, .13);
    initialized = true;
    look.set(s.x + forward.x * 100, s.y - 8.7, s.z + forward.z * 100);
    camera.up.set(Math.sin(s.bank) * .045, 1, 0); camera.lookAt(look);
    gateObjects.forEach((o, i) => {
      o.group.visible = i >= s.gate && i <= s.gate + 1;
      const active = i === s.gate;
      o.rim.material.color.set(active ? '#93f9ff' : '#638b8e');
      o.rim.material.emissiveIntensity = active ? .65 + .15 * Math.sin(s.tick / 18) : .04;
      o.inner.visible = active;
      o.accent.visible = active;
      o.group.children.slice(3).forEach(tick => tick.visible = active);
      o.group.scale.setScalar(1);
    });
    renderer.render(scene, camera);
  }
  function project(t) { return new T.Vector3(t.x, t.y, t.z).project(camera); }
  addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
  window.CoastWorld = { draw, project, renderer, camera, scene, plane };
})();
