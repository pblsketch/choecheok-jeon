// 내용 데이터·납품 조건 점검(브라우저 없이): cd tests && node content.mjs
//  게임 스크립트를 index.html 차례대로 Node 상자에 그대로 싣는다(화면 없이 규칙·자료만 쓴다). spec §13-1·§13-10
//  1) 단계: 거점마다 단계·목표 id 중복 없음, 모든 단계 종류가 등록되어 있음('준비 중' 없음),
//     모든 이야기 단계가 맵 목표(beat)에 묶여 있음(목표가 없는 거점은 차례대로 펼침, 말 속 learnStep·뱃길 route.for로 부르는 단계도 묶인 것),
//     목표 차례 = 단계 배열 차례(이어 하기 글자 되풀이가 실제 놀이와 같은 차례로 돈다)
//  2) 참조: 인물(who)·초상·스프라이트·소품·맵·목표 자리(걸어서 닿는가)·장면 삽화·배경음·역사 카드·지식·조각·고지도 거점·
//     index.html·css가 부르는 파일이 실제로 있음
//  3) 표기 체계 구분값이 정해진 다섯 가지(원문·풀이·게임 설정·이본 노트·해석) 안에 있음(카드 종류 이름 포함), 원문 구절은 늘 풀이와 짝
//  4) 글: 괄호·따옴표 짝, 모르는 글 속 자리({…})
//  5) 모든 거점에서 결말까지 갈 수 있음: 모든 선택 조합(지식 있음/없음) × 거점마다 게이지 극값에서 시작해도 막힌 딜레마 없이
//     결말 넷 가운데 하나에 닿고, 알아보는 장면·후일담이 하나씩만 맞는다. 원작대로(떠남·준비) 걸으면 뱃길 앞에서 생 6 이상
//  6) 원작 대조 카드가 모든 딜레마에 있음(원작 장면이면 원문+풀이, 처음 배우기 extraGloss·깊이 읽기 quoteLong), 선택지 갈래 값이 규칙 표와 같음, 결과 표 문안이 딜레마마다 있음
//  7) 납품 조건: assets/ 아래 모든 파일(raw·raw_audio 빼고)이 credits/*.tsv에 한 줄씩 있고 이용 조건이 허용 목록 안,
//     크레딧 줄의 파일이 실제로 있음, 「영웅의 길」 소재 파일을 그대로 가져온 것이 없음(디지털 이음 공공누리 제1유형 배경음과
//     SIL OFL 글꼴만 예외. 「영웅의 길」 폴더가 없는 기기에서는 이 대조만 건너뛴다)
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
// 「영웅의 길」 폴더: 이 저장소의 위쪽 폴더들에서 찾는다(작업 폴더가 깊어도 된다). HERO_ASSETS로 정할 수도 있다
const HERO = process.env.HERO_ASSETS || (() => { for (let d = ROOT; d !== path.dirname(d); d = path.dirname(d)) { const p = path.join(path.dirname(d), '영웅소설', 'assets'); if (fs.existsSync(p)) return p; } return path.resolve(ROOT, '..', '영웅소설', 'assets'); })();
const problems = [];
let checks = 0;
const ok = (cond, msg) => { checks++; if (!cond) problems.push(msg); console.log((cond ? '  ✓ ' : '  ✗ ') + msg); };
const list = (a, n = 8) => (a.length > n ? a.slice(0, n).join(' / ') + ` … (+${a.length - n})` : a.join(' / '));
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));

// ───────── 게임 스크립트를 상자에 싣는다(main.js만 빼고: 화면을 띄우지 않는다) ─────────
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const SCRIPTS = [...html.matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]);
const LINKS = [...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map((m) => m[1]);
const store = {};
const box = {
  console, setTimeout, clearTimeout, requestAnimationFrame: () => 0,
  localStorage: { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } },
  location: { search: '', protocol: 'file:' }, navigator: { userAgent: 'node' },
};
box.window = box;
vm.createContext(box);
const loadErr = [];
for (const s of SCRIPTS.filter((x) => !/main\.js$/.test(x))) {
  try { vm.runInContext(fs.readFileSync(path.join(ROOT, s), 'utf8'), box, { filename: s }); } catch (e) { loadErr.push(s + ': ' + e.message); }
}
console.log('스크립트 싣기');
ok(loadErr.length === 0, `index.html의 스크립트 ${SCRIPTS.length - 1}개가 오류 없이 실린다` + (loadErr.length ? ': ' + loadErr.join(' | ') : ''));
ok(SCRIPTS.concat(LINKS).every(exists), 'index.html이 부르는 스크립트·스타일 파일이 모두 있다' + list(SCRIPTS.concat(LINKS).filter((f) => !exists(f))));
const { G, PLACES, PEOPLE, SPRITES, BGM, TEXTS, POEM, HISTORY, ORIGINAL, KIMYC, NOTES, FLOW, OLDMAP, ART } = box;
const R = G.rules, RU = TEXTS.RULES;
const ORDER = FLOW.order;

// ───────── 1) 단계 ─────────
console.log('\n1) 단계 id·종류·목표에 묶임');
const KNOWN_TYPES = Object.keys(G.steps.types);
{
  const dup = [], badType = [], unbound = [], twice = [], missing = [], order = [], learnBad = [], routeBad = [];
  const learnRefs = (pid) => {
    const out = [];
    const walk = (x) => {
      if (!x || typeof x !== 'object') return;
      if (Array.isArray(x)) return x.forEach(walk);
      if (typeof x.learnStep === 'string') out.push(x.learnStep);
      for (const k in x) walk(x[k]);
    };
    walk(PLACES[pid]);
    return out;
  };
  for (const pid of ORDER) {
    const P = PLACES[pid];
    if (!P) { missing.push(pid + '(거점 없음)'); continue; }
    const ids = (P.steps || []).map((s) => s.id);
    ids.forEach((id, i) => { if (ids.indexOf(id) !== i) dup.push(pid + '/' + id); });
    (P.beats || []).map((b) => b.id).forEach((id, i, a) => { if (a.indexOf(id) !== i) dup.push(pid + '/목표 ' + id); });
    for (const s of P.steps || []) if (!KNOWN_TYPES.includes(s.type)) badType.push(`${pid}/${s.id}(${s.type})`);
    const learn = learnRefs(pid);
    for (const id of learn) { const s = (P.steps || []).find((x) => x.id === id); if (!s || !['card', 'know'].includes(s.type)) learnBad.push(pid + '/' + id); }
    const routeFor = (P.steps || []).filter((s) => s.type === 'route').map((s) => s.for);
    for (const id of routeFor) { const s = (P.steps || []).find((x) => x.id === id); if (!s || s.type !== 'dilemma') routeBad.push(pid + '/' + id); }
    if (!(P.beats || []).length) continue; // 목표 없는 거점: 단계를 차례대로 펼친다
    const flat = [].concat(...P.beats.map((b) => b.steps || []));
    for (const id of flat) if (!ids.includes(id)) missing.push(pid + '/' + id);
    flat.forEach((id, i) => { if (flat.indexOf(id) !== i) twice.push(pid + '/' + id); });
    for (const id of ids) if (!flat.includes(id) && !learn.includes(id)) unbound.push(pid + '/' + id);
    for (let i = 1; i < flat.length; i++) if (ids.indexOf(flat[i]) < ids.indexOf(flat[i - 1])) order.push(`${pid}: ${flat[i - 1]} → ${flat[i]}`);
  }
  const all = [];
  for (const pid of ORDER) for (const s of (PLACES[pid] || {}).steps || []) all.push(s.id);
  const gdup = all.filter((id, i) => all.indexOf(id) !== i);
  ok(missing.length === 0, 'FLOW.order의 거점과 목표가 부르는 단계가 모두 있다' + (missing.length ? ': ' + list(missing) : ''));
  ok(dup.length === 0, '거점마다 단계 id·목표 id 중복 없음' + (dup.length ? ': ' + list(dup) : ''));
  ok(gdup.length === 0, `모든 거점을 통틀어 단계 id 중복 없음(${all.length}개)` + (gdup.length ? ': ' + list(gdup) : ''));
  ok(badType.length === 0, `모든 단계 종류가 등록되어 있다(${[...new Set(ORDER.flatMap((p) => (PLACES[p].steps || []).map((s) => s.type)))].join('·')})` + (badType.length ? ': ' + list(badType) : ''));
  ok(unbound.length === 0, '모든 이야기 단계가 맵 목표에 묶여 있다(말 속 learnStep으로 펼치는 역사 카드·지식 단계 포함)' + (unbound.length ? ': ' + list(unbound) : ''));
  ok(twice.length === 0, '한 단계를 두 목표가 부르지 않는다' + (twice.length ? ': ' + list(twice) : ''));
  ok(order.length === 0, '목표 차례 = 단계 배열 차례(이어 하기 글자 되풀이가 놀이 차례와 같다)' + (order.length ? ': ' + list(order) : ''));
  ok(learnBad.length === 0 && routeBad.length === 0, '말 속 learnStep은 카드·지식 단계를, 뱃길 route.for는 딜레마를 가리킨다' + list(learnBad.concat(routeBad)));
  const rules = RU.act1.concat(RU.act2);
  ok(JSON.stringify(rules) === JSON.stringify(ORDER) && RU.trail.every((t) => ORDER.includes(t.place)), '규칙 표의 1막·2막 거점 = FLOW.order, 거점 기록 자리도 그 안에');
}

// ───────── 2) 참조 ─────────
console.log('\n2) 인물·카드·맵·그림·소리 참조');
const walkAll = (x, fn, at = '') => {
  if (x == null) return;
  if (typeof x === 'string') return fn(x, at, null);
  if (typeof x !== 'object') return;
  if (Array.isArray(x)) return x.forEach((v, i) => walkAll(v, fn, at + '[' + i + ']'));
  fn(null, at, x);
  for (const k in x) walkAll(x[k], fn, at ? at + '.' + k : k);
};
const DATA = { PLACES, NOTES, TEXTS, HISTORY, ORIGINAL, KIMYC, POEM, PEOPLE, FLOW };
{
  // 대사의 who → 인물 · 초상 파일
  const badWho = new Set(), badPt = [], badSp = [];
  for (const [name, d] of Object.entries(DATA)) walkAll(d, (s, at, o) => { if (o && typeof o.who === 'string' && ('t' in o || 'x' in o || 'sp' in o) && !PEOPLE[o.who]) badWho.add(name + '.' + at + ' → ' + o.who); });
  for (const [id, p] of Object.entries(PEOPLE)) {
    const pt = p.pt || 'pt_' + id;
    if (!ART.pt || ART.pt[pt] !== `assets/pt/${pt}.webp` || !exists(`assets/pt/${pt}.webp`)) badPt.push(id + '→' + pt);
    if (p.sp && !SPRITES[p.sp]) badSp.push(id + '→' + p.sp);
  }
  ok(badWho.size === 0, '대사·배치의 인물(who)이 모두 PEOPLE에 있다' + (badWho.size ? ': ' + list([...badWho]) : ''));
  ok(badPt.length === 0, `인물 ${Object.keys(PEOPLE).length}명의 초상 파일이 있고 그림 목록(ART.pt)에 적혀 있다` + (badPt.length ? ': ' + list(badPt) : ''));
  ok(badSp.length === 0, '인물의 스프라이트가 SPRITES에 있다' + (badSp.length ? ': ' + list(badSp) : ''));
  const badImg = Object.entries(SPRITES).filter(([, m]) => !m.img || !exists(m.img)).map(([k]) => k);
  ok(badImg.length === 0, `스프라이트·소품 ${Object.keys(SPRITES).length}개의 그림 파일이 있다` + (badImg.length ? ': ' + list(badImg) : ''));
}
{
  // 맵: 격자·사람·소품·목표 자리(걸어서 닿는가)
  const bad = [];
  const SOLID = G.tiles.SOLID;
  const reach = (grid, sx, sy) => {
    const seen = new Set();
    const k = (x, y) => x + ',' + y;
    const q = [[sx, sy]];
    if ((grid[sy] || '')[sx] === undefined || SOLID.has(grid[sy][sx])) return seen;
    seen.add(k(sx, sy));
    while (q.length) {
      const [x, y] = q.shift();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy, c = (grid[ny] || '')[nx];
        if (c === undefined || SOLID.has(c) || seen.has(k(nx, ny))) continue;
        seen.add(k(nx, ny)); q.push([nx, ny]);
      }
    }
    return seen;
  };
  const near = (seen, x0, y0, w = 1, h = 1) => { for (let y = Math.floor(y0) - 1; y <= Math.ceil(y0 + h); y++) for (let x = Math.floor(x0) - 1; x <= Math.ceil(x0 + w); x++) if (seen.has(x + ',' + y)) return true; return false; };
  let nMaps = 0, nTargets = 0;
  for (const pid of ORDER) {
    const P = PLACES[pid];
    if (!P.map) continue;
    for (const [mid, M] of Object.entries(P.maps || {})) {
      nMaps++;
      const w = M.grid[0].length;
      M.grid.forEach((r, y) => { if (r.length !== w) bad.push(`${pid}/${mid}: ${y}번째 줄 길이 ${r.length} ≠ ${w}`); });
      for (const p of M.props || []) if (!SPRITES[p[0]]) bad.push(`${pid}/${mid}: 없는 소품 ${p[0]}`);
      if (M.music && !BGM.tracks[M.music] && !G.audio.TRACKS[M.music]) bad.push(`${pid}/${mid}: 없는 곡 ${M.music}`);
      for (const [id, c] of Object.entries((P.cast || {})[mid] || {})) {
        if (c.who && !PEOPLE[c.who]) bad.push(`${pid}/${mid}/${id}: 없는 인물 ${c.who}`);
        const sp = c.sp || (PEOPLE[c.who] || {}).sp;
        if (!sp || !SPRITES[sp]) bad.push(`${pid}/${mid}/${id}: 스프라이트 없음 ${sp}`);
      }
    }
    // 목표를 차례로 따라가며 그 맵에서 할 일이 걸어서 닿는가
    let mid = P.map, spawn = P.spawn || P.maps[P.map].spawn;
    const shown = {};
    for (const b of P.beats || []) {
      if (b.map && b.map !== mid) { mid = b.map; spawn = b.spawn || P.maps[mid].spawn; for (const k in shown) delete shown[k]; }
      else if (b.spawn) spawn = b.spawn;
      Object.assign(shown, b.show || {});
      const M = P.maps[mid];
      if (!M) { bad.push(`${pid}/${b.id}: 없는 맵 ${mid}`); continue; }
      if (!spawn) { bad.push(`${pid}/${mid}: 시작 자리 없음`); continue; }
      const seen = reach(M.grid, Math.floor(spawn[0]), Math.floor(spawn[1]));
      if (!seen.size) bad.push(`${pid}/${mid}: 시작 자리(${spawn})가 막힌 칸`);
      const targets = b.pick ? Object.keys(b.pick) : [b.talk || b.at || b.go].filter(Boolean);
      for (const t of targets) {
        nTargets++;
        const who = shown[t] || ((P.cast || {})[mid] || {})[t];
        const spot = (M.spots || {})[t];
        if (who) { if (!near(seen, who.x, who.y)) bad.push(`${pid}/${b.id}: ${t}에게 걸어서 닿지 않음(${who.x},${who.y})`); }
        else if (spot) { if (!near(seen, spot.x, spot.y, spot.w || 1, spot.h || 1)) bad.push(`${pid}/${b.id}: 자리 ${t}에 걸어서 닿지 않음`); }
        else bad.push(`${pid}/${b.id}: 목표 대상 ${t}가 맵 ${mid}에 없음`);
      }
      if (b.then && b.then.show) Object.assign(shown, b.then.show);
      for (const id of [].concat((b.then || {}).hide || [], b.hide || [])) delete shown[id];
    }
  }
  ok(bad.length === 0, `맵 ${nMaps}장: 격자 줄 길이·소품·사람 스프라이트·곡이 맞고, 목표 ${nTargets}개의 대상이 그 맵에 있으며 시작 자리에서 걸어서 닿는다` + (bad.length ? ': ' + list(bad, 12) : ''));
}
{
  // 장면 삽화: 단계·줄·거점 표지·꿈·원작 결말·김영철전·1차시 끝
  const ids = new Map();
  const add = (id, at) => { if (typeof id === 'string' && id) ids.set(id, at); };
  for (const [name, d] of Object.entries(DATA)) walkAll(d, (s, at, o) => { if (o) { if (typeof o.scene === 'string') add(o.scene, name + '.' + at); if (typeof o.cover === 'string') add(o.cover, name + '.' + at); } });
  for (const pid of ORDER) for (const id of Object.keys(PLACES[pid].scenes || {})) add(id, pid + '.scenes');
  add((TEXTS.DREAM || {}).scene, 'TEXTS.DREAM'); add('sc_act1_end', 'act1End');
  const bad = [...ids].filter(([id]) => !(ART.sc && ART.sc[id] === `assets/sc/${id}.webp` && exists(`assets/sc/${id}.webp`))).map(([id, at]) => id + '@' + at);
  ok(bad.length === 0, `장면 삽화 ${ids.size}장이 모두 파일로 있고 그림 목록(ART.sc)에 적혀 있다` + (bad.length ? ': ' + list(bad) : ''));
  // 거점이 쓰는 삽화는 그 거점의 scenes에 설명이 있다(그림이 없을 때 빈 종이 판 설명)
  const undecl = [];
  for (const pid of ORDER) { const P = PLACES[pid]; walkAll(P.steps, (s, at, o) => { if (o && typeof o.scene === 'string' && !(P.scenes || {})[o.scene]) undecl.push(pid + '/' + o.scene); }); }
  ok(undecl.length === 0, '거점 단계가 쓰는 삽화마다 그 거점 scenes에 설명이 있다' + (undecl.length ? ': ' + list([...new Set(undecl)]) : ''));
}
{
  // 배경음: 곡 이름 · 파일 · 대신 틀 합성 곡
  const bad = [];
  for (const [name, d] of Object.entries(DATA)) walkAll(d, (s, at, o) => { if (o && typeof o.music === 'string' && !BGM.tracks[o.music] && !G.audio.TRACKS[o.music]) bad.push(name + '.' + at + ' → ' + o.music); });
  for (const [id, t] of Object.entries(BGM.tracks)) { if (!exists(t.src)) bad.push(`BGM.tracks.${id}: 파일 없음 ${t.src}`); if (!G.audio.TRACKS[t.synth]) bad.push(`BGM.tracks.${id}: 없는 합성 곡 ${t.synth}`); }
  if (BGM.tongso) { if (!exists(BGM.tongso.src) || (BGM.tongso.js && !exists(BGM.tongso.js))) bad.push('BGM.tongso 파일 없음'); }
  ok(bad.length === 0, `배경음 이름이 모두 있는 곡이고(파일 ${Object.keys(BGM.tracks).length}곡 + 합성 곡), 곡마다 대신 틀 합성 곡이 있다` + (bad.length ? ': ' + list(bad) : ''));
  ok(exists(G.app.TITLE_ART) && exists('assets/ui/hud_okyoung.webp') && exists('assets/ui/oldmap.webp'), '타이틀 그림·HUD 초상·고지도 그림 파일이 있다');
  const cssBad = [];
  for (const f of LINKS) for (const m of fs.readFileSync(path.join(ROOT, f), 'utf8').matchAll(/url\(['"]?(\.\.\/[^'")]+)['"]?\)/g)) if (!fs.existsSync(path.resolve(ROOT, path.dirname(f), m[1]))) cssBad.push(f + ' → ' + m[1]);
  ok(cssBad.length === 0, 'css가 부르는 글꼴·그림 파일이 있다' + (cssBad.length ? ': ' + list(cssBad) : ''));
}
// 지식: 얻는 곳이 있는 지식만 조건으로 쓴다
const KNOW_SRC = {};
for (const pid of ORDER) for (const s of PLACES[pid].steps || []) for (const k of [].concat(s.history || [], s.type === 'know' || s.type === 'card' ? s.know || [] : [])) (KNOW_SRC[k] = KNOW_SRC[k] || []).push(pid);
{
  const hist = HISTORY.map((x) => x.id);
  const badH = [], badNeed = [], badFrag = [], badNode = [];
  for (const pid of ORDER) for (const s of PLACES[pid].steps || []) {
    if (s.history && !hist.includes(s.history)) badH.push(pid + '/' + s.id + ' → ' + s.history);
    for (const o of s.options || []) for (const k of [].concat(o.need || [])) {
      const from = KNOW_SRC[k] || [];
      if (!from.length || !from.some((p) => ORDER.indexOf(p) <= ORDER.indexOf(pid))) badNeed.push(`${pid}/${s.id}/${o.id} → ${k}`);
    }
    // 조각은 행 번호로만 적는다(frag 단계의 n, 선택지 fx.frag: 2 · [2, 3]). 글은 늘 정답 시의 그 행(원문 + 풀이)에서 찾는다
    const frags = [];
    if (s.type === 'frag') { frags.push(s.n); if ('text' in s) badFrag.push(`${pid}/${s.id}: 조각 글(text)을 따로 적음`); }
    for (const o of s.options || []) {
      const v = (o.fx || {}).frag ?? o.frag;
      if (v == null) continue;
      if (typeof v === 'object' && !Array.isArray(v)) badFrag.push(`${pid}/${s.id}/${o.id}: 조각을 행 번호가 아닌 꼴로 적음`);
      frags.push(...(typeof v === 'object' && !Array.isArray(v) ? Object.keys(v) : [].concat(v)));
    }
    for (const n0 of frags) { const n = Number(n0), line = POEM.lines[n - 1]; if (!(n >= 1 && n <= 4) || !line || !line.원문 || !line.풀이) badFrag.push(`${pid}/${s.id}: ${n0}행`); }
  }
  for (const pid of ORDER) { const nd = G.app.placeInfo(pid).node; if (!nd || !OLDMAP.nodes[nd]) badNode.push(pid + '→' + nd); }
  ok(HISTORY.length === 7 && badH.length === 0 && hist.every((id) => KNOW_SRC[id]), `역사 카드 일곱 장이 모두 거점 단계에서 펼쳐진다(${hist.join(' ')})` + list(badH));
  ok(badNeed.length === 0, '지혜의 길 조건(need) 지식마다 그 거점이나 앞 거점에 얻는 곳이 있다' + list(badNeed));
  ok(G.code.LAYOUT.know.every((k) => KNOW_SRC[k] && KNOW_SRC[k].every((p) => RU.act1.includes(p))) && Object.keys(KNOW_SRC).filter((k) => KNOW_SRC[k].some((p) => RU.act1.includes(p))).every((k) => G.code.LAYOUT.know.includes(k)), '이어 하기 글자가 1막 지식을 빠짐없이 담는다: ' + G.code.LAYOUT.know.join(' '));
  ok(badFrag.length === 0, '시구 조각은 행 번호(1~4)로만 적혀 있고, 정답 시의 그 행에 원문과 풀이가 함께 있다' + list(badFrag));
  ok(badNode.length === 0, '거점마다 고지도 자리가 있다' + list(badNode));
}

// ───────── 3) 표기 체계 ─────────
console.log('\n3) 표기 체계(원문·풀이·게임 설정·이본 노트·해석)');
const FIVE = ['원문', '풀이', '게임 설정', '이본 노트', '해석'];
{
  ok(JSON.stringify(Object.keys(NOTES.marks)) === JSON.stringify(FIVE) && JSON.stringify(Object.keys(TEXTS.MARKS)) === JSON.stringify(FIVE), '표기 표(NOTES.marks·TEXTS.MARKS)가 정확히 다섯 구분');
  const used = new Map();
  for (const f of fs.readdirSync(path.join(ROOT, 'js', 'game')).concat(fs.readdirSync(path.join(ROOT, 'js', 'core')).map((x) => '../core/' + x))) {
    const src = fs.readFileSync(path.join(ROOT, 'js', 'game', f), 'utf8');
    for (const m of src.matchAll(/\b(?:mark|chip)\(\s*(['"])([^'"]*)\1\s*\)/g)) used.set(m[2], f);
    if (/\b(?:mark|chip)\(\s*[^'")\s]/.test(src.replace(/function (mark|chip)|const (mark|chip) =|steps\.mark = function|\(k\) => G\.steps\.mark\(k\)|G\.steps\.mark\(k\)/g, ''))) used.set('(변수)', f);
  }
  const off = [...used.keys()].filter((k) => !FIVE.includes(k));
  ok(off.length === 0 && used.size > 0, `화면이 붙이는 표기 칩 값이 모두 다섯 구분 안에 있다(${[...used.keys()].join('·')})` + (off.length ? ': ' + off.map((k) => k + '@' + used.get(k)).join(', ') : ''));
  // 원문 구절은 늘 풀이와 함께: quote·quoteLong·wonmun·afterword 객체
  const badQ = [];
  let nQ = 0;
  for (const [name, d] of Object.entries(DATA)) walkAll(d, (s, at, o) => {
    if (!o) return;
    for (const k of ['quote', 'quoteLong', 'wonmun', 'afterword']) {
      const q = o[k];
      if (!q || typeof q !== 'object') continue;
      nQ++;
      const extra = Object.keys(q).filter((x) => !['원문', '풀이', 'note', 'src'].includes(x));
      if (!q.원문 || !q.풀이 || extra.length) badQ.push(`${name}.${at}.${k}` + (extra.length ? '(' + extra + ')' : ''));
    }
  });
  ok(badQ.length === 0, `원문 구절 ${nQ}곳이 모두 원문+풀이 짝이고 다른 구분값을 섞지 않는다` + (badQ.length ? ': ' + list(badQ) : ''));
  const KINDS = new Set(Object.keys(G.ui.KIND).concat(['letter', 'variant']));
  const badK = [];
  for (const pid of ORDER) walkAll(PLACES[pid].steps, (s, at, o) => { if (o && o.card && typeof o.card === 'object' && o.card.kind && !KINDS.has(o.card.kind)) badK.push(pid + '.' + at + ' → ' + o.card.kind); });
  ok(badK.length === 0, `카드 종류가 정해진 것 안에 있다(${[...KINDS].join('·')})` + list(badK));
  // 카드에 붙는 종류 이름(ui.KIND 값·TEXTS.CARD의 종류 이름·거점 카드의 kindLabel): 표기 구분 다섯 가운데 하나이거나
  //  정해 둔 카드 갈래 이름이어야 한다. 편지 카드(kind 'letter')만 이름을 자유롭게 붙인다(옥영이 모르는 소식 ①…)
  const CATEGORY = ['원작 대조', '역사 카드', '게임 창작', '알아 두기'];
  const labelOk = (t) => FIVE.includes(t) || CATEGORY.includes(t);
  const labels = Object.entries(G.ui.KIND).map(([k, v]) => ['ui.KIND.' + k, v])
    .concat(['origKind', 'fictionKind', 'historyKind'].map((k) => ['TEXTS.CARD.' + k, (TEXTS.CARD || {})[k]]));
  for (const pid of ORDER) walkAll(PLACES[pid].steps, (s, at, o) => { if (o && o.card && typeof o.card === 'object' && o.card.kindLabel && o.card.kind !== 'letter') labels.push([pid + '.' + at, o.card.kindLabel]); });
  const badL = labels.filter(([, v]) => !labelOk(v)).map(([at, v]) => at + ' → ' + v);
  ok(badL.length === 0, `카드 종류 이름 ${labels.length}곳이 표기 다섯 구분이나 정해 둔 갈래(${CATEGORY.join('·')}) 안에 있다` + list(badL));
  const css = fs.readFileSync(path.join(ROOT, 'css', 'style.css'), 'utf8') + LINKS.map((f) => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n');
  ok(['letter', 'variant'].every((k) => new RegExp('\\.rcard\\.' + k + '\\b').test(css)), '편지·이본 노트 카드에 모습(css)이 있다');
}

// ───────── 4) 글 ─────────
console.log('\n4) 괄호·따옴표 짝, 글 속 자리');
{
  const PAIRS = [['(', ')'], ['「', '」'], ['『', '』'], ['〈', '〉'], ['《', '》'], ['“', '”'], ['‘', '’'], ['[', ']']];
  const bad = [], badVar = [];
  let n = 0;
  const VARS = new Set(Object.keys(G.util.vars));
  for (const [name, d] of Object.entries(DATA)) walkAll(d, (s, at) => {
    if (s == null) return;
    n++;
    const t = s.replace(/^\s*\d+\)\s/, ''); // "1) …" 같은 번호
    for (const [a, b] of PAIRS) {
      let depth = 0, broken = false;
      for (const ch of t) { if (ch === a) depth++; else if (ch === b) { depth--; if (depth < 0) broken = true; } }
      if (depth !== 0 || broken) bad.push(`${name}.${at}: ${a}${b} — ${s.slice(0, 36)}`);
    }
    if (((t.match(/\*\*/g) || []).length) % 2) bad.push(`${name}.${at}: ** — ${s.slice(0, 36)}`);
    if (((t.match(/"/g) || []).length) % 2) bad.push(`${name}.${at}: " — ${s.slice(0, 36)}`);
    if (name === 'PLACES') for (const m of s.matchAll(/\{([가-힣A-Za-z_]+)(?::[^}]+)?\}/g)) if (!VARS.has(m[1])) badVar.push(`${at}: {${m[1]}}`);
  });
  ok(bad.length === 0, `글 ${n}줄의 괄호·따옴표·굵게(**) 짝이 맞는다` + (bad.length ? ': ' + list(bad, 10) : ''));
  ok(badVar.length === 0, `거점 글 속 자리({…})가 모두 채울 수 있는 자리다(${[...VARS].join('·')})` + list(badVar));
}

// ───────── 5) 모든 거점에서 결말까지 ─────────
console.log('\n5) 모든 거점에서 결말까지');
const clone = (o) => JSON.parse(JSON.stringify(o));
// 거점 하나의 놀이 차례(목표 차례, 목표가 없으면 단계 배열 차례)
function playOrder(pid, st) {
  const P = PLACES[pid];
  if (!(P.beats || []).length) return (P.steps || []).slice();
  const out = [];
  for (const b of P.beats) { if (b.when && !R.ok(b.when, st)) continue; for (const id of b.steps || []) out.push(P.steps.find((s) => s.id === id)); }
  return out;
}
const learnable = (pid) => (PLACES[pid].steps || []).filter((s) => (s.type === 'card' && s.history) || s.type === 'know');
const ENDS = ['whole', 'weary', 'strange', 'barely'];
const stats = { leaves: 0, endings: {}, blocked: [], noEnd: [], knowEnd: [], seaShut: [], coastShut: [], collapses: 0, maxJangyuk: 0 };
// 시작 상태 st로 거점 차례 from부터 끝까지, 딜레마마다 열린 선택지를 모두 갈래 친다(know: 거점에 들어설 때 그 거점 지식을 모두 얻는가)
function explore(st, from, know, path, log) {
  for (let i = from; i < ORDER.length; i++) {
    const pid = ORDER[i];
    if (st.__resume !== pid) R.enterPlaceOn(st, pid);
    const steps = playOrder(pid, st);
    let j = st.__resume === pid ? st.__j : 0;
    delete st.__resume; delete st.__j;
    if (j === 0 && know) for (const s of learnable(pid)) R.stepOn(st, s, pid, null, { places: PLACES });
    for (; j < steps.length; j++) {
      const s = steps[j];
      if (!s || (s.when && !R.ok(s.when, st))) continue;
      if (s.type === 'dilemma') {
        const open = s.options.filter((o) => R.optionState(s, o, st, pid).open);
        if (s.dilemma === RU.routeDilemma) {
          if (!open.some((o) => o.id === 'coast')) stats.coastShut.push(path.join(' '));
          if (st.choices['d-hangzhou-wait'] === 'leave' && st.choices['d-hangzhou-prep'] === 'prep' && !open.some((o) => o.id === 'sea')) stats.seaShut.push(path.join(' ') + ` (생 ${st.saeng})`);
        }
        if (!open.length) { stats.blocked.push(`${s.dilemma} @ ${path.join(' ')}`); return; }
        for (const o of open) {
          const st2 = clone(st);
          const r = R.stepOn(st2, s, pid, o.id, { places: PLACES });
          if (r.collapse) stats.collapses++;
          st2.__resume = pid; st2.__j = j + 1;
          explore(st2, i, know, path.concat(o.id), log);
        }
        return;
      }
      if (s.type === 'poem') { const groped = [1, 2, 3, 4].filter((n) => !(st.frags || {})[n]).length; R.stepOn(st, s, pid, { groped, fixes: 0, traps: [] }, { places: PLACES }); continue; }
      if (s.type === 'act1End') { st.act1Done = true; continue; }
      R.stepOn(st, s, pid, null, { places: PLACES });
    }
    if (pid === 'namwon_final') {
      const kn = (PLACES[pid].steps || []).filter((s) => /^n-know-/.test(s.id) && (!s.when || R.ok(s.when, st))).length;
      const en = (PLACES[pid].steps || []).filter((s) => /^n-end-/.test(s.id) && (!s.when || R.ok(s.when, st))).length;
      if (kn !== 1 || en !== 1) stats.knowEnd.push(`${path.join(' ')}: 알아보는 장면 ${kn}·후일담 ${en}`);
    }
    R.leavePlaceOn(st, pid);
  }
  const e = R.ending(st);
  if (!ENDS.includes(e)) { stats.noEnd.push(path.join(' ')); return; }
  stats.leaves++;
  stats.endings[e] = (stats.endings[e] || 0) + 1;
  stats.maxJangyuk = Math.max(stats.maxJangyuk, st.jangyuk || 0);
  if (log) log.push({ path, st });
}
{
  // 처음부터: 모든 선택 조합 × 지식(없음 / 거점마다 모두)
  for (const know of [false, true]) { const st = R.blank('basic'); st.trail = []; explore(st, 0, know, [know ? '지식' : '무지식']); }
  const fromStart = stats.leaves;
  ok(stats.blocked.length === 0, `처음부터 모든 선택 조합(${fromStart}갈래, 지식 있음/없음)에서 딜레마마다 열린 선택지가 있다` + (stats.blocked.length ? ': ' + list(stats.blocked) : ''));
  ok(stats.noEnd.length === 0 && fromStart > 0, `처음부터 모든 갈래가 결말에 닿는다 — ${Object.entries(stats.endings).map(([k, v]) => k + ' ' + v).join(', ')}`);
  ok(ENDS.every((e) => stats.endings[e] > 0), '결말 넷이 모두 어떤 갈래에서 나온다');
  ok(stats.knowEnd.length === 0, '남원 재회에서 알아보는 장면과 후일담이 하나씩만 맞는다' + (stats.knowEnd.length ? ': ' + list(stats.knowEnd) : ''));
  ok(stats.coastShut.length === 0, '연안길은 늘 열려 있다');
  ok(stats.seaShut.length === 0, '막간 뒤 떠남·준비를 고르면 1막이 어땠든 뱃길 앞에서 바다길이 열린다(생 6 이상)' + (stats.seaShut.length ? ': ' + list(stats.seaShut) : ''));
  ok(stats.collapses > 0 && stats.maxJangyuk >= 1, `쓰러짐이 있는 갈래도 끝까지 간다(쓰러짐 ${stats.collapses}번, 한 갈래 최대 장육불 ${stats.maxJangyuk})`);
  // 거점마다 게이지 극값에서 시작
  const before = stats.leaves;
  const bad0 = stats.blocked.length + stats.noEnd.length + stats.knowEnd.length;
  const G0 = [0, 1, 3, 6, 10];
  for (let i = 1; i < ORDER.length; i++) for (const y of G0) for (const s of G0) {
    const st = R.blank('deep');
    st.trail = []; st.yeon = y; st.saeng = s;
    if (i >= RU.act1.length) { st.act1Done = true; for (const p of RU.act1) st.done['p:' + p] = true; }
    explore(st, i, (y + s) % 2 === 0, [ORDER[i], `연${y}`, `생${s}`]);
  }
  ok(stats.blocked.length + stats.noEnd.length + stats.knowEnd.length === bad0 && stats.leaves > before, `거점 ${ORDER.length - 1}곳 × 게이지 극값 ${G0.length * G0.length}가지에서 시작해도 막힘 없이 결말에 닿는다(${stats.leaves - before}갈래)` + (stats.blocked.length + stats.noEnd.length + stats.knowEnd.length > bad0 ? ': ' + list(stats.blocked.concat(stats.noEnd, stats.knowEnd).slice(-6)) : ''));
  // 원작대로(원작 궤적): 뱃길 앞에서 생 6 이상, 그 궤적도 결말에 닿는다
  const orig = R.originalRun();
  ok(orig.before[RU.routeDilemma] && orig.before[RU.routeDilemma].saeng >= 6, `원작 궤적: 뱃길을 고를 때 생 ${orig.before[RU.routeDilemma] && orig.before[RU.routeDilemma].saeng}(6 이상, spec §4-6 불변식)`);
  ok(orig.trail.length === 1 + RU.trail.length && orig.trail.every((t) => t.yeon >= 0 && t.yeon <= 10 && t.saeng >= 0 && t.saeng <= 10), '원작 궤적이 출발과 거점 기록 자리마다 값을 낸다: ' + orig.trail.map((t) => `${t.label} ${t.yeon}/${t.saeng}`).join(' → '));
}

// ───────── 6) 딜레마마다 원작 대조 카드 ─────────
console.log('\n6) 딜레마와 원작 대조 카드');
{
  const dil = [];
  for (const pid of ORDER) for (const s of PLACES[pid].steps || []) if (s.type === 'dilemma') dil.push([pid, s]);
  const badCard = [], badOpt = [], badDelta = [], badNotes = [], badMode = [], wisdomPer = {};
  for (const [pid, s] of dil) {
    const c = s.card || {};
    const ids = s.options.map((o) => o.id);
    if (!('orig' in s) || (s.orig !== null && !ids.includes(s.orig)) || (s.origNearest && !ids.includes(s.origNearest))) badCard.push(`${s.dilemma}: orig/origNearest`);
    if (!c.title || !c.summary) badCard.push(`${s.dilemma}: 카드 제목·요약 없음`);
    if (s.orig != null && !(c.quote && c.quote.원문 && c.quote.풀이)) badCard.push(`${s.dilemma}: 원작 장면인데 원문+풀이 없음`);
    if (!s.dilemma || !/^d-/.test(s.dilemma)) badCard.push(`${pid}/${s.id}: 딜레마 id`);
    // 방식에 따른 차이(spec §7-4): 처음 배우기는 풀이 덧붙임(extraGloss), 깊이 읽기는 긴 원문(quoteLong).
    //  원문이 없는 창작 딜레마만 긴 원문 대신 그 까닭(noQuoteLong)을 적을 수 있다(원문을 지어내지 않는다)
    if (!c.extraGloss || !String(c.extraGloss).trim()) badMode.push(`${s.dilemma}: 처음 배우기 풀이 덧붙임(extraGloss) 없음`);
    if (!(c.quoteLong && c.quoteLong.원문 && c.quoteLong.풀이) && !(s.orig === null && c.noQuoteLong)) badMode.push(`${s.dilemma}: 깊이 읽기 긴 원문(quoteLong) 없음` + (s.orig === null ? '(창작 딜레마면 noQuoteLong에 까닭)' : ''));
    if (s.options.length < 2 || s.options.length > 3) badOpt.push(`${s.dilemma}: 선택지 ${s.options.length}개`);
    for (const o of s.options) {
      if (!['yeon', 'saeng', 'wisdom', 'none'].includes(o.type) || !o.label) badOpt.push(`${s.dilemma}/${o.id}: 갈래·글`);
      if (o.type === 'wisdom') { wisdomPer[pid] = (wisdomPer[pid] || 0) + 1; if (!o.need && s.dilemma !== RU.prepDilemma) badOpt.push(`${s.dilemma}/${o.id}: 지혜의 길에 조건 없음`); if (!o.lockHint && !(TEXTS.LOCK || {}).need) badOpt.push(`${s.dilemma}/${o.id}: 잠긴 실마리 없음`); }
      const d = R.choiceDelta(o);
      const want = { yeon: { yeon: 2, saeng: -2 }, saeng: { yeon: -2, saeng: 2 }, wisdom: { yeon: 1, saeng: 1 } }[o.type];
      if (want && (d.yeon !== want.yeon || d.saeng !== want.saeng)) badDelta.push(`${s.dilemma}/${o.id} ${JSON.stringify(d)}`);
    }
    if (!(NOTES.dilemmas || []).some((x) => x.id === s.dilemma)) badNotes.push(s.dilemma);
  }
  ok(dil.length === 7, `딜레마 일곱(${dil.map(([, s]) => s.dilemma).join(' ')})`);
  ok(badCard.length === 0, '딜레마마다 원작 대조 카드(제목·요약, 원작 장면이면 원문+풀이, 원작 선택 표시)가 있다' + list(badCard));
  ok(badMode.length === 0, '딜레마 카드마다 처음 배우기 풀이 덧붙임(extraGloss)과 깊이 읽기 긴 원문(quoteLong, 원문 없는 창작 딜레마는 그 까닭)이 있다' + list(badMode));
  ok(badOpt.length === 0 && Object.values(wisdomPer).every((n) => n <= 1), '선택지 2~3개, 갈래는 연·생·지혜·변동 없음, 지혜의 길은 거점마다 하나·조건과 실마리' + list(badOpt));
  ok(badDelta.length === 0, '선택지 게이지 값이 갈래 표와 같다(연 +2/−2 · 생 −2/+2 · 지혜 +1/+1)' + list(badDelta));
  const prep = dil.find(([, s]) => s.dilemma === RU.prepDilemma)[1];
  ok(prep.options.length === 2 && prep.options.some((o) => o.type === 'wisdom' && o.need === 'k-japanese') && prep.options.some((o) => o.type === 'none' && !R.choiceDelta(o).yeon && !R.choiceDelta(o).saeng), "예외: 항주 준비는 '준비하기'(지혜, 일본말) / '준비 없이 서두르기'(변동 없음) 두 갈래");
  const route = dil.find(([, s]) => s.dilemma === RU.routeDilemma)[1];
  const co = route.options.find((o) => o.id === 'coast'), se = route.options.find((o) => o.id === 'sea');
  ok(co && !co.when && R.choiceDelta(co).saeng < 0 && se && se.when && se.when.min && se.when.min.saeng === 6 && R.choiceDelta(se).saeng < R.choiceDelta(co).saeng && R.choiceDelta(se).yeon > 0 && route.origNearest === 'sea',
    `뱃길: 연안길 늘 열림(${JSON.stringify(R.choiceDelta(co))}) · 바다길 생 6 이상(${JSON.stringify(R.choiceDelta(se))}), 원작에 가까운 쪽은 바다길`);
  ok(badNotes.length === 0, '결과 화면 선택 비교표 문안(NOTES.dilemmas)이 딜레마마다 있다' + list(badNotes));
}

// ───────── 7) 납품 조건 ─────────
console.log('\n7) 납품 조건: 크레딧·이용 조건·「영웅의 길」 소재');
{
  const ALLOWED = /자체 (생성물|제작|합성)|공공누리 제1유형|^CC0|CC BY(?![-\s]*(NC|ND))|SIL Open Font License|퍼블릭 도메인|Public Domain|^PD\b/;
  const FORBIDDEN = /비상업|\bNC\b|\bND\b|변경 ?금지|불분명|제[2-4]유형|CC BY-NC|CC BY-ND/;
  const rows = {};
  const badHead = [];
  for (const f of fs.readdirSync(path.join(ROOT, 'credits')).filter((x) => x.endsWith('.tsv'))) {
    const lines = fs.readFileSync(path.join(ROOT, 'credits', f), 'utf8').split(/\r?\n/).filter((l) => l.trim() && !l.startsWith('#'));
    if (lines[0].split('\t').join('|') !== '파일|출처|이용 조건|고친 내용') badHead.push(f);
    for (const l of lines.slice(1)) { const c = l.split('\t'); rows[c[0]] = { file: f, src: c[1] || '', lic: c[2] || '', mod: c[3] || '' }; }
  }
  ok(badHead.length === 0, 'credits/*.tsv 머리줄: 파일·출처·이용 조건·고친 내용' + list(badHead));
  // assets/ 아래 모든 폴더(저장소에 올리지 않는 생성 원본 raw·내려받은 원음 raw_audio만 뺀다)
  const SKIP = ['raw', 'raw_audio'];
  const DIRS = fs.readdirSync(path.join(ROOT, 'assets'), { withFileTypes: true }).filter((e) => e.isDirectory() && !SKIP.includes(e.name) && !e.name.startsWith('.')).map((e) => e.name).sort();
  const loose = fs.readdirSync(path.join(ROOT, 'assets'), { withFileTypes: true }).filter((e) => e.isFile() && !e.name.startsWith('.')).map((e) => 'assets/' + e.name);
  const files = [];
  for (const d of DIRS) {
    const dir = path.join(ROOT, 'assets', d);
    if (!fs.existsSync(dir)) continue;
    const rec = (p) => { for (const e of fs.readdirSync(p, { withFileTypes: true })) { if (e.name.startsWith('.')) continue; const q = path.join(p, e.name); if (e.isDirectory()) rec(q); else files.push(path.relative(ROOT, q).split(path.sep).join('/')); } };
    rec(dir);
  }
  files.push(...loose);
  const noRow = files.filter((f) => !rows[f]);
  const badLic = files.filter((f) => rows[f] && (!ALLOWED.test(rows[f].lic) || FORBIDDEN.test(rows[f].lic.replace(/상업적 이용·변경 가능/g, ''))));
  const emptySrc = files.filter((f) => rows[f] && (!rows[f].src.trim() || !rows[f].mod.trim()));
  const ghost = Object.keys(rows).filter((f) => !exists(f));
  ok(files.length > 100, `납품 소재 파일 ${files.length}개(${DIRS.map((d) => d + ' ' + files.filter((f) => f.startsWith('assets/' + d + '/')).length).join(', ')})`);
  ok(noRow.length === 0, '모든 소재 파일이 크레딧에 한 줄씩 있다' + (noRow.length ? ': ' + list(noRow) : ''));
  ok(badLic.length === 0, '이용 조건이 모두 허용 목록 안(자체 생성물 · 공공누리 제1유형 · CC0 · CC BY · SIL OFL · 퍼블릭 도메인)' + (badLic.length ? ': ' + list(badLic.map((f) => f + ' = ' + rows[f].lic)) : ''));
  ok(emptySrc.length === 0, '크레딧 줄마다 출처와 고친 내용이 적혀 있다' + list(emptySrc));
  ok(ghost.length === 0, `크레딧 ${Object.keys(rows).length}줄의 파일이 모두 있다` + list(ghost));
  const lics = {};
  for (const f of files) { const k = rows[f] ? rows[f].lic.split(/[(—]/)[0].trim() : '?'; lics[k] = (lics[k] || 0) + 1; }
  console.log('    이용 조건: ' + Object.entries(lics).map(([k, v]) => `${k} ${v}`).join(' · '));
  // 「영웅의 길」 소재를 그대로 가져온 파일이 없는가(같은 크기 → 해시 비교)
  // 형제 폴더가 없는 기기(배포 묶음만 받은 곳 등)에서는 대조를 건너뛴다(통과로 세고 까닭을 남긴다)
  if (!fs.existsSync(HERO)) ok(true, '「영웅의 길」 소재 폴더가 이 기기에 없어 같은 파일 대조를 건너뜀(HERO_ASSETS로 정할 수 있음): ' + HERO);
  else {
    const mine = new Map();
    for (const f of files) mine.set(f, fs.statSync(path.join(ROOT, f)).size);
    const sizes = new Set(mine.values());
    const hash = (p) => crypto.createHash('sha1').update(fs.readFileSync(p)).digest('hex');
    const heroHash = new Map();
    let nHero = 0;
    const rec = (p) => { for (const e of fs.readdirSync(p, { withFileTypes: true })) { const q = path.join(p, e.name); if (e.isDirectory()) rec(q); else { nHero++; const sz = fs.statSync(q).size; if (sizes.has(sz)) heroHash.set(hash(q), path.relative(HERO, q).split(path.sep).join('/')); } } };
    rec(HERO);
    const same = [], allowed = [];
    for (const [f, sz] of mine) {
      if (!heroHash.size) break;
      const hh = hash(path.join(ROOT, f));
      if (!heroHash.has(hh)) continue;
      const r = rows[f] || { lic: '', src: '' };
      const ok1 = (f.startsWith('assets/bgm/') && /디지털 이음/.test(r.src) && /공공누리 제1유형/.test(r.lic)) || (f.startsWith('assets/fonts/') && /SIL Open Font License/.test(r.lic));
      (ok1 ? allowed : same).push(f + ' = 영웅소설/assets/' + heroHash.get(hh));
    }
    ok(same.length === 0, `「영웅의 길」 소재 ${nHero}개와 같은 파일이 없다(예외: 디지털 이음 공공누리 제1유형 배경음·SIL OFL 글꼴 ${allowed.length}개)` + (same.length ? ': ' + list(same) : ''));
    if (allowed.length) console.log('    같은 원음·글꼴(허용): ' + allowed.join(' / '));
  }
}

console.log(`\n점검 ${checks}개 · 문제 ${problems.length}개`);
for (const p of problems) console.log(' - ' + p);
process.exit(problems.length ? 1 : 0);
