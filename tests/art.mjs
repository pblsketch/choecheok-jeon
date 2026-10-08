// 장면 삽화·대화 초상 점검(엔진 없이): node art.mjs
// 1) 게임이 부르는 장면 id(거점 scenes·ORIGINAL.scenes·KIMYC.scenes·sc_act1_end)마다 assets/sc/<id>.webp가 있고
//    그림 목록(window.ART.sc)에 그 경로가 적혀 있는가
// 2) 인물(PEOPLE)의 초상 id와 대사 who가 가리키는 인물마다 assets/pt/<id>.webp가 있고 ART.pt에 적혀 있는가
// 3) 목록(ART)이 없는 파일을 가리키지 않는가 / assets/sc·assets/pt의 파일마다 credits/art.tsv에 한 줄이 있는가
// 4) 그림 크기(장면 ≤ 250KB, 초상 ≤ 80KB)
// 5) 모든 그림을 한 장에 늘어놓아 tests/shots/art/gallery.png로 쓴다
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const fails = [];
const fail = (m) => { fails.push(m); console.log('FAIL', m); };

// 데이터 파일을 엔진 없이 읽는다(G.world 등은 아무것도 하지 않는 대리 객체)
const deep = () => new Proxy(function () {}, { get: (t, k) => (k === Symbol.toPrimitive ? () => '' : deep()), apply: () => deep() });
const sandbox = { G: new Proxy({}, { get: () => deep() }), console };
sandbox.window = sandbox;
vm.createContext(sandbox);
const run = (rel) => {
  try { vm.runInContext(fs.readFileSync(path.join(root, rel), 'utf8'), sandbox, { filename: rel }); } catch (e) { fail(`${rel}: ${e.message}`); }
};
run('js/data/people.js');
run('js/data/original.js');
run('js/data/kimyc.js');
const placeFiles = fs.readdirSync(path.join(root, 'js/data/places')).filter((f) => f.endsWith('.js'));
for (const f of placeFiles) run('js/data/places/' + f);

const ART = sandbox.ART || {};
const PEOPLE = sandbox.PEOPLE || {};
const PLACES = sandbox.PLACES || {};

// 장면 id
const scIds = new Set(['sc_act1_end']);
for (const p of Object.values(PLACES)) for (const id of Object.keys((p && p.scenes) || {})) scIds.add(id);
for (const id of Object.keys((sandbox.ORIGINAL && sandbox.ORIGINAL.scenes) || {})) scIds.add(id);
for (const id of Object.keys((sandbox.KIMYC && sandbox.KIMYC.scenes) || {})) scIds.add(id);
// 거점 파일 글 속의 scene:'sc_x' 참조도 모은다(scenes에 선언하지 않은 것이 있으면 잡힌다)
for (const f of placeFiles) {
  const src = fs.readFileSync(path.join(root, 'js/data/places', f), 'utf8');
  for (const m of src.matchAll(/scene:\s*'(sc_[a-z0-9_]+)'/g)) scIds.add(m[1]);
}

// 초상 id: 인물 목록 + 대사·배치의 who
const ptIds = new Set();
for (const [id, p] of Object.entries(PEOPLE)) {
  ptIds.add(p.pt || 'pt_' + id);
  // 모습이 여러 벌인 인물(옥영)의 모습별 초상도 모두 있어야 한다
  for (const [sp, pt] of Object.entries(p.looks || {})) {
    ptIds.add(pt);
    if (!/^sp_/.test(sp)) fail(`PEOPLE.${id}.looks: '${sp}' is not a sprite id`);
  }
}
for (const f of placeFiles) {
  const src = fs.readFileSync(path.join(root, 'js/data/places', f), 'utf8');
  for (const m of src.matchAll(/who:\s*'([a-z_]+)'/g)) {
    const p = PEOPLE[m[1]];
    if (!p) fail(`${f}: who '${m[1]}' is not in PEOPLE`);
    else ptIds.add(p.pt || 'pt_' + m[1]);
  }
}

// credits
const credits = new Set(fs.readFileSync(path.join(root, 'credits/art.tsv'), 'utf8').split(/\r?\n/).slice(1).filter(Boolean).map((r) => r.split('\t')[0]));

const check = (kind, ids, maxKB) => {
  for (const id of ids) {
    const rel = `assets/${kind}/${id}.webp`;
    if (!fs.existsSync(path.join(root, rel))) { fail(`${id}: missing file ${rel}`); continue; }
    const reg = (ART[kind] || {})[id] || null;
    if (reg !== rel) fail(`${id}: ART.${kind} entry is ${reg}, expected ${rel}`);
    const kb = fs.statSync(path.join(root, rel)).size / 1024;
    if (kb > maxKB) fail(`${rel}: ${kb.toFixed(0)}KB > ${maxKB}KB`);
  }
  for (const [id, rel] of Object.entries(ART[kind] || {})) if (!fs.existsSync(path.join(root, rel))) fail(`ART.${kind}.${id} -> missing ${rel}`);
  const files = fs.readdirSync(path.join(root, 'assets', kind)).filter((f) => f.endsWith('.webp'));
  for (const f of files) {
    if (!credits.has(`assets/${kind}/${f}`)) fail(`assets/${kind}/${f}: no row in credits/art.tsv`);
    if (!ids.has(f.replace(/\.webp$/, ''))) console.log(`note: assets/${kind}/${f} is not referenced by the game`);
  }
  for (const c of credits) if (c.startsWith(`assets/${kind}/`) && !fs.existsSync(path.join(root, c))) fail(`credits/art.tsv: ${c} does not exist`);
  return files.map((f) => f.replace(/\.webp$/, '')).sort();
};
const scFiles = check('sc', scIds, 250);
const ptFiles = check('pt', ptIds, 80);
console.log(`scenes referenced ${scIds.size}, files ${scFiles.length} · portraits referenced ${ptIds.size}, files ${ptFiles.length}`);

// 한 장으로 늘어놓기
const uri = (kind, id) => 'data:image/webp;base64,' + fs.readFileSync(path.join(root, `assets/${kind}/${id}.webp`)).toString('base64');
const cell = (kind, id, w, round) => `<figure><img src="${uri(kind, id)}" style="width:${w}px;${round ? `height:${w}px;border-radius:50%;object-fit:cover;` : ''}"><figcaption>${id}</figcaption></figure>`;
const html = `<!doctype html><meta charset="utf-8"><style>
body{margin:0;padding:16px;background:#1c2646;font:12px sans-serif;color:#f4ead3}
h2{margin:8px 0;font-size:16px;color:#f2a541}.grid{display:flex;flex-wrap:wrap;gap:10px}
figure{margin:0;text-align:center}figcaption{margin-top:3px}img{display:block;border:2px solid #2f2840;background:#f4ead3}
</style><h2>portraits (${ptFiles.length})</h2><div class="grid">${ptFiles.map((id) => cell('pt', id, 110, false) + cell('pt', id, 56, true)).join('')}</div>
<h2>scenes (${scFiles.length})</h2><div class="grid">${scFiles.map((id) => cell('sc', id, 300, false)).join('')}</div>`;
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
await page.setContent(html);
await page.waitForFunction(() => [...document.images].every((i) => i.complete));
const broken = await page.evaluate(() => [...document.images].filter((i) => !i.naturalWidth).map((i) => i.nextSibling && i.nextSibling.textContent));
broken.forEach((b) => fail(`image does not decode: ${b}`));
fs.mkdirSync(path.join(here, 'shots/art'), { recursive: true });
await page.screenshot({ path: path.join(here, 'shots/art/gallery.png'), fullPage: true });
await browser.close();
console.log('-> tests/shots/art/gallery.png');
if (fails.length) { console.log(`${fails.length} failure(s)`); process.exit(1); }
console.log('OK');
