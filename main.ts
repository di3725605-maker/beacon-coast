import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { buildDossier } from './vendor/makefun-game.ts';

const root = fileURLToPath(new URL('.', import.meta.url));
const destination = path.resolve(process.env.MAKEFUN_OUTPUT_DIR || '/output');
const caps = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};
const encode = (value) => JSON.stringify(value, null, 2) + '\n';
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');

for (const protectedPath of [root, path.join(root, 'game'), path.join(root, 'screenshots'), path.join(root, 'vendor')]) {
  const relative = path.relative(destination, protectedPath);
  if (!relative || (!relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative))) {
    throw new Error('Output must not contain the repository or its source directories');
  }
}
for (const sourceFolder of ['game', 'screenshots', 'vendor']) {
  const relative = path.relative(path.join(root, sourceFolder), destination);
  if (!relative || (!relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative))) {
    throw new Error('Output must not be inside a source directory');
  }
}
fs.mkdirSync(destination, { recursive: true });
for (const folder of ['game', 'screenshots']) {
  const target = path.join(destination, folder);
  fs.rmSync(target, { recursive: true, force: true });
  fs.cpSync(path.join(root, folder), target, { recursive: true });
}

const sim = createRequire(import.meta.url)('./game/sim.js');
const replay = sim.makeTape(17);
let verified = sim.create(replay.seed);
for (const action of replay.tape) verified = sim.step(verified, action);
if (encode(verified) !== encode(replay.final) || verified.phase !== 'complete' || verified.gate !== 7) {
  throw new Error('Deterministic replay did not complete all seven beacons and land');
}
const actions = encode({ schema: 'beacon-coast/actions/v1', seed: replay.seed, dt: sim.DT, actions: replay.tape });
fs.writeFileSync(path.join(destination, 'action-log.json'), actions);
const dossier = buildDossier(destination, caps);
const screenshotHashes = Object.fromEntries(fs.readdirSync(path.join(destination, 'screenshots')).sort().map(name =>
  [name, hash(fs.readFileSync(path.join(destination, 'screenshots', name))) ]));
fs.writeFileSync(path.join(destination, 'dossier.json'), dossier);
fs.writeFileSync(path.join(destination, 'evidence.json'), encode({
  schema: 'beacon-coast/evidence/v1',
  actionLogSha256: hash(actions),
  dossierSha256: hash(dossier),
  screenshotHashes,
  inputTapeSha256: hash(JSON.stringify(replay.tape)),
  eventLogSha256: hash(JSON.stringify(replay.final.events)),
  marks: replay.marks,
  events: replay.final.events,
  final: replay.final,
}));
process.stdout.write(encode({ status: 'ok', ticks: replay.tape.length, score: replay.final.score, actionLogSha256: hash(actions), dossierSha256: hash(dossier) }));
