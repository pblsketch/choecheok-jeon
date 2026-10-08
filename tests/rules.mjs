// 게임 규칙 점검: cd tests && node rules.mjs
//  1부(브라우저 없이): 게이지 자르기, 세 갈래 선택, 지혜의 길 조건과 거점당 한 번, 쓰러짐 세 경우, 막간 회복,
//   같은 단계 두 번 → 한 번만, 이어 하기 글자 왕복(무작위 200개)·한 글자 바꾸면 거절·'7+', 원작 궤적(항로 고르기 때 생 6),
//   결말 기준, ?act=2 시작값, 두 방식 조건, 1막 끝 저장
//  2부(크롬): 딜레마 화면(잠긴 지혜의 길·대조 카드·표기 칩·깊이 읽기 긴 원문), 단계 도중 새로고침해도 한 번만 반영, ?act=2
//  규칙 점검용 거점 자료는 tests/fixtures/places.js(실제 거점 파일은 내용 작업이 채운다)
import vm from 'node:vm';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const FIXTURE = path.join(HERE, 'fixtures', 'places.js');
const problems = [];
let checks = 0;
const ok = (cond, msg) => { checks++; if (!cond) problems.push(msg); console.log((cond ? '  ✓ ' : '  ✗ ') + msg); };
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// ───────── 브라우저 없이 스크립트를 싣는 상자 ─────────
function sandbox() {
  const store = {};
  const ctx = {
    console,
    localStorage: { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } },
    location: { search: '' },
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  for (const f of ['js/core/util.js', 'js/core/save.js', 'js/data/texts.js', 'js/game/rules.js', 'js/game/code.js']) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
  }
  vm.runInContext(fs.readFileSync(FIXTURE, 'utf8'), ctx, { filename: 'fixtures/places.js' });
  ctx.__store = store;
  return ctx;
}
const fresh = () => { const w = sandbox(); return { w, G: w.G, R: w.G.rules, C: w.G.code, S: () => w.G.save.state, P: w.PLACES }; };
const stepOf = (P, place, id) => P[place].steps.find((s) => s.id === id);
const dil = (P, d) => { for (const k in P) for (const s of (P[k] && P[k].steps) || []) if (s.dilemma === d) return { place: k, step: s }; return null; };

console.log('1부: 규칙(브라우저 없이)');
{
  const { R, S, G } = fresh();
  // 게이지 자르기
  R.test.set({ yeon: 9, saeng: 9 });
  R.gauge({ yeon: 5, saeng: 5 });
  ok(S().yeon === 10 && S().saeng === 10, '게이지는 10을 넘지 않는다');
  R.gauge({ yeon: -30 });
  ok(S().yeon === 0, '게이지는 0 밑으로 내려가지 않는다');
  ok(R.clamp(11) === 10 && R.clamp(-1) === 0 && R.clamp(4.6) === 5, 'clamp: 0~10 정수');
  // 세 갈래 값은 표에서 온다
  ok(eq(R.choiceDelta({ type: 'yeon' }), { yeon: 2, saeng: -2 }) && eq(R.choiceDelta({ type: 'saeng' }), { yeon: -2, saeng: 2 })
    && eq(R.choiceDelta({ type: 'wisdom' }), { yeon: 1, saeng: 1 }) && eq(R.choiceDelta({ type: 'none' }), { yeon: 0, saeng: 0 }), '세 갈래(+변동 없음) 기본값: ±2 / ±2 / +1+1 / 0');
  G.save.state; // eslint
  const T = fresh();
  T.w.TEXTS.RULES.choice.yeon = { yeon: 3, saeng: -1 };
  ok(eq(T.R.choiceDelta({ type: 'yeon' }), { yeon: 3, saeng: -1 }), '선택 값은 texts.js의 RULES 표를 고치면 바뀐다');
}

{
  console.log(' 지혜의 길');
  const { R, S, P } = fresh();
  const news = stepOf(P, 'nanggoya', 's-news');
  const wis = news.options.find((o) => o.type === 'wisdom');
  R.test.set({ yeon: 5, saeng: 5, know: [] });
  let os = R.optionState(news, wis, S(), 'nanggoya');
  ok(!os.open && os.why === 'need' && /돈우/.test(os.hint), `지식이 없으면 잠기고 실마리 한 줄 ("${os.hint}")`);
  R.test.set({ know: ['h-nanggoya-donwoo'] });
  os = R.optionState(news, wis, S(), 'nanggoya');
  ok(os.open, '지식(돈우 카드)이 있으면 열린다');
  ok(R.optionState(news, news.options[0], S(), 'nanggoya').open, '연의 길·살아남는 길은 늘 열려 있다');
  const r = R.applyStep(news, { place: 'nanggoya', key: 's:nanggoya:s-news', decision: 'wisdom' });
  ok(S().yeon === 6 && S().saeng === 6 && S().frags[3] && S().choices['d-nanggoya-news'] === 'wisdom', '지혜의 길: 연 +1·생 +1, 3행 조각, 선택 기록');
  ok(r && r.delta && r.delta.yeon === 1, 'applyStep이 바뀐 만큼을 돌려준다');
  // 같은 거점의 다른 딜레마에 지혜의 길이 있으면 이제 잠긴다
  const fake = { id: 's-x', type: 'dilemma', dilemma: 'd-x', options: [{ id: 'a', type: 'yeon' }, { id: 'w', type: 'wisdom', need: 'h-nanggoya-donwoo' }], orig: null };
  os = R.optionState(fake, fake.options[1], S(), 'nanggoya');
  ok(!os.open && os.why === 'used', '지혜의 길은 거점마다 한 번만');
  ok(R.optionState(fake, fake.options[1], S(), 'hangzhou').open, '다른 거점에서는 다시 열린다');
  // 잠긴 선택지는 골라도 반영되지 않는다
  const y0 = S().yeon;
  const bad = R.applyStep(fake, { place: 'nanggoya', key: 's:nanggoya:s-x', decision: 'w' });
  ok(S().yeon === y0 && bad && bad.error, '잠긴 지혜의 길을 억지로 골라도 반영되지 않는다');
  // d-hangzhou-prep: 지혜(준비)/변동 없음, prep 저장
  const prep = stepOf(P, 'hangzhou', 's-prep');
  R.test.set({ yeon: 5, saeng: 5, know: ['k-japanese'] });
  R.applyStep(prep, { place: 'hangzhou', key: 's:hangzhou:s-prep', decision: 'prep' });
  ok(S().yeon === 6 && S().saeng === 6 && S().prep === true, '항주 준비하기: 지혜(+1·+1), prep = true');
  const T2 = fresh();
  T2.R.test.set({ yeon: 5, saeng: 5, know: [] });
  ok(!T2.R.optionState(prep, prep.options[0], T2.S(), 'hangzhou').open, '일본말을 모르면 준비하기가 잠긴다');
  T2.R.applyStep(prep, { place: 'hangzhou', key: 's:hangzhou:s-prep', decision: 'rush' });
  ok(T2.S().yeon === 5 && T2.S().saeng === 5 && T2.S().prep === false, '준비 없이 서두르기: 변동 없음, prep = false');
}

{
  console.log(' 쓰러짐(생 0)');
  // 기본: 남원에서 생 0 → 장육불 꿈, 생 3, 지혜의 길 잠김, 횟수 +1
  let { R, S, P } = fresh();
  R.test.set({ yeon: 5, saeng: 2, know: [] });
  let r = R.applyStep(stepOf(P, 'namwon', 's-flee'), { place: 'namwon', key: 's:namwon:s-flee', decision: 'sinpyo' });
  ok(r.collapse && r.collapse.kind === 'dream', '기본: 생 0 → 장육불 꿈');
  ok(S().saeng === 3 && S().yeon === 7 && S().jangyuk === 1, `기본: 생 3, 연 그대로(+2), 장육불 횟수 1 (연 ${S().yeon}, 생 ${S().saeng}, 횟수 ${S().jangyuk})`);
  ok(S().wisdomUsed.namwon === 'lost', '기본: 그 거점의 지혜의 길이 잠긴다');
  const fake = { id: 's-y', dilemma: 'd-y', type: 'dilemma', options: [{ id: 'w', type: 'wisdom', need: 'h-namwon-war' }] };
  R.test.set({ know: ['h-namwon-war'] });
  const os = R.optionState(fake, fake.options[0], S(), 'namwon');
  ok(!os.open && os.why === 'lost', `쓰러진 거점의 지혜의 길은 지식이 있어도 닫혀 있다 ("${os.hint}")`);
  // 이미 지혜의 길을 쓴 거점은 used 그대로
  ({ R, S, P } = fresh());
  R.test.set({ yeon: 5, saeng: 1, know: ['h-nanggoya-donwoo'] });
  R.applyStep(stepOf(P, 'nanggoya', 's-dream'), { place: 'nanggoya', key: 's:nanggoya:s-dream' });
  R.applyStep(stepOf(P, 'nanggoya', 's-news'), { place: 'nanggoya', key: 's:nanggoya:s-news', decision: 'wisdom' });
  r = R.spendSaeng(2, { place: 'nanggoya' });
  ok(r.collapse && S().wisdomUsed.nanggoya === 'd-nanggoya-news', '지혜의 길을 이미 쓴 거점에서 쓰러지면 기록은 그대로');

  // 낭고야: 고정 꿈을 보기 전에 생 0 → 고정 꿈이 쓰러짐을 겸한다(생 3, 연 +1, 횟수 +1)
  ({ R, S, P } = fresh());
  R.test.set({ yeon: 5, saeng: 2 });
  r = R.applyStep(stepOf(P, 'nanggoya', 's-ship'), { place: 'nanggoya', key: 's:nanggoya:s-ship', decision: 'board' });
  ok(r.collapse && r.collapse.kind === 'fixedDream', '낭고야(고정 꿈 전): 고정 꿈이 쓰러짐을 겸한다');
  ok(S().saeng === 3 && S().yeon === 8 && S().jangyuk === 1 && S().dreamSeen === true, `낭고야(고정 꿈 전): 생 3, 연 +2+1, 횟수 1, 꿈 본 것으로 (연 ${S().yeon})`);
  const y1 = S().yeon;
  r = R.applyStep(stepOf(P, 'nanggoya', 's-dream'), { place: 'nanggoya', key: 's:nanggoya:s-dream' });
  ok(S().yeon === y1 && r.skipped, '겸한 뒤에는 고정 꿈 단계가 다시 연을 올리지 않는다');

  // 낭고야: 고정 꿈을 본 뒤 생 0 → 꿈 없이 떠올리는 글(생 3, 횟수 +1, 연 그대로)
  ({ R, S, P } = fresh());
  R.test.set({ yeon: 5, saeng: 2 });
  r = R.applyStep(stepOf(P, 'nanggoya', 's-dream'), { place: 'nanggoya', key: 's:nanggoya:s-dream' });
  ok(S().yeon === 6 && S().dreamSeen && S().jangyuk === 0, '낭고야 고정 꿈: 연 +1, 횟수는 세지 않는다');
  r = R.applyStep(stepOf(P, 'nanggoya', 's-ship'), { place: 'nanggoya', key: 's:nanggoya:s-ship', decision: 'board' });
  ok(r.collapse && r.collapse.kind === 'recall', '낭고야(고정 꿈 뒤): 꿈을 다시 보이지 않고 떠올린다');
  ok(S().saeng === 3 && S().yeon === 8 && S().jangyuk === 1, `낭고야(고정 꿈 뒤): 생 3, 연은 선택만큼(+2), 횟수 1 (연 ${S().yeon})`);

  // 안남 시구 맞추기 도중: 더듬어 찾기로 생 0 → 꿈 없음, 생 0 유지, 횟수 그대로
  ({ R, S, P } = fresh());
  R.test.set({ yeon: 5, saeng: 1 });
  r = R.grope();
  ok(r.zero && r.exception && !r.collapse && S().saeng === 0 && S().jangyuk === 0, '안남 예외: 생 0, 꿈 없음, 횟수 그대로');
  r = R.grope();
  ok(r.exception && S().saeng === 0 && S().puzzle.groped === 1 && S().jangyuk === 0, '안남 예외: 생 0에서 다시 눌러도 생 0, 장육불 횟수 그대로, 더듬기는 생을 쓴 1번만 기록');
  r = R.spendSaeng(1, { inPuzzle: true });
  ok(r.exception && S().saeng === 0, 'spendSaeng(n, { inPuzzle: true })도 같은 예외');
  // 시구 맞추기 밖에서 spendSaeng → 기본 쓰러짐
  ({ R, S, P } = fresh());
  R.test.set({ yeon: 5, saeng: 1 });
  r = R.spendSaeng(1, { place: 'sea' });
  ok(r.collapse && r.collapse.kind === 'dream' && S().saeng === 3 && S().jangyuk === 1, '퍼즐 밖 spendSaeng으로 생 0 → 장육불 꿈, 생 3');
}

{
  console.log(' 막간·거점 기록');
  const { R, S, w } = fresh();
  R.enterPlace('namwon');
  ok(S().trail.length === 1 && S().trail[0].label === '출발' && S().trail[0].yeon === 5 && S().trail[0].saeng === 5, '처음 들어설 때 출발(5, 5)을 기록한다');
  R.test.set({ yeon: 7, saeng: 3 });
  ok(S().trail.length === 1, '들어설 때는 거점을 기록하지 않는다');
  R.leavePlace('namwon');
  ok(S().trail.length === 2 && S().trail[1].place === 'namwon' && S().trail[1].yeon === 7 && S().trail[1].saeng === 3, '거점을 떠날 때 연·생을 기록한다');
  R.leavePlace('prologue');
  ok(S().trail.length === 2, '서막·막간은 기록하지 않는다');
  R.test.set({ yeon: 8, saeng: 2 });
  R.enterPlace('interlude');
  ok(S().saeng === 5 && S().yeon === 8, '막간: 생 5로, 연은 그대로');
  R.gauge({ saeng: -2 });
  R.enterPlace('interlude');
  ok(S().saeng === 3, '막간 회복은 한 번만(다시 들어와도 또 채우지 않는다)');
  S().place = 'annam';
  R.finishAct1();
  const saved = JSON.parse(w.__store['choecheok-jeon-v1'] || '{}');
  ok(S().act1Done === true && S().trail.some((t) => t.place === 'annam') && saved.act1Done === true, '1막 끝: act1Done, 안남 기록, 저장');
}

{
  console.log(' 한 번만 반영');
  const { R, S, P } = fresh();
  R.test.set({ yeon: 5, saeng: 5 });
  const flee = stepOf(P, 'namwon', 's-flee');
  R.applyStep(flee, { place: 'namwon', key: 's:namwon:s-flee', decision: 'sinpyo' });
  R.applyStep(flee, { place: 'namwon', key: 's:namwon:s-flee', decision: 'sinpyo' });
  R.applyStep(flee, { place: 'namwon', key: 's:namwon:s-flee', decision: 'food' });
  ok(S().yeon === 7 && S().saeng === 3 && S().tokens.length === 1 && S().choices['d-namwon-flee'] === 'sinpyo', '같은 딜레마를 세 번 실행해도 한 번만(첫 선택 그대로)');
  const frag = stepOf(P, 'namwon', 's-tongso');
  R.applyStep(frag, { place: 'namwon', key: 's:namwon:s-tongso' });
  S().frags[1] = '바뀜';
  R.applyStep(frag, { place: 'namwon', key: 's:namwon:s-tongso' });
  ok(S().frags[1] === '바뀜', '조각 단계도 한 번만');
  const boat = stepOf(P, 'hangzhou', 's-boat');
  R.applyStep(boat, { place: 'hangzhou', key: 's:hangzhou:s-boat' });
  R.applyStep(boat, { place: 'hangzhou', key: 's:hangzhou:s-boat' });
  ok(S().saeng === 5, '고정 사건(배와 양식 +2)도 한 번만');
  const know = stepOf(P, 'nanggoya', 's-japanese');
  R.applyStep(know, { place: 'nanggoya', key: 's:nanggoya:s-japanese' });
  ok(S().know['k-japanese'] === true, '지식 단계: 지식을 얻는다');
  const card = stepOf(P, 'namwon', 's-war');
  R.applyStep(card, { place: 'namwon', key: 's:namwon:s-war' });
  R.applyStep(card, { place: 'namwon', key: 's:namwon:s-war' });
  ok(S().know['h-namwon-war'] && S().cards.filter((c) => c.id === 'h-namwon-war').length === 1, '역사 카드: 지식 + 수첩에 한 장만');
  ok(S().cards.some((c) => c.id === 'd-namwon-flee' && c.kind === 'fiction'), '딜레마를 지나면 대조 카드가 수첩에 들어간다(원작에 없는 장면 → 게임 창작)');
  // 장육불 횟수도 한 번만
  const T = fresh();
  T.R.test.set({ yeon: 5, saeng: 1 });
  const flee2 = stepOf(T.P, 'namwon', 's-flee');
  T.R.applyStep(flee2, { place: 'namwon', key: 'k1', decision: 'sinpyo' });
  T.R.applyStep(flee2, { place: 'namwon', key: 'k1', decision: 'sinpyo' });
  ok(T.S().jangyuk === 1 && T.S().saeng === 3, '쓰러짐 횟수도 한 번만');
  // 저장 칸: 단계 하다 말고 껐을 때 되돌릴 칸에 규칙 칸이 들어 있다
  const keys = T.G.save.snapKeys;
  ok(['yeon', 'saeng', 'frags', 'tokens', 'know', 'choices', 'wisdomUsed', 'jangyuk', 'dreamSeen', 'puzzle', 'cards', 'applied', 'prep', 'route'].every((k) => keys.includes(k)), '새로고침 때 되돌릴 칸(snapKeys)에 규칙 칸이 모두 있다');
  ok(['mode', 'yeon', 'saeng', 'place', 'done', 'choices', 'frags', 'know', 'wisdomUsed', 'jangyuk', 'dreamSeen', 'puzzle', 'trail', 'route', 'prep', 'ending', 'name', 'teacher', 'act1Done', 'cards'].every((k) => k in T.G.save.fresh()), '저장 구조에 spec의 칸이 모두 있다');
}

{
  console.log(' 두 방식');
  const { R, S } = fresh();
  R.test.set({ mode: 'deep' });
  ok(R.ok({ mode: 'deep' }, S()) && !R.ok({ mode: 'basic' }, S()), "when: { mode: 'deep' }");
  R.test.set({ mode: 'basic' });
  ok(R.ok({ mode: 'basic' }, S()) && !R.ok({ mode: 'deep' }, S()), "when: { mode: 'basic' }");
  R.test.set({ know: ['k-japanese'] });
  ok(R.ok({ know: 'k-japanese' }, S()) && !R.ok({ know: 'h-sea-pirates' }, S()) && R.ok({ not: { know: 'h-sea-pirates' } }, S()), 'when: { know }');
}

{
  console.log(' 결말');
  const { R, w } = fresh();
  const e = (yeon, saeng) => R.ending({ yeon, saeng });
  ok(e(6, 6) === 'whole' && e(10, 10) === 'whole', '연·생 6 이상 → whole');
  ok(e(6, 5) === 'weary' && e(10, 0) === 'weary', '연 높음·생 낮음 → weary');
  ok(e(5, 6) === 'strange' && e(0, 10) === 'strange', '연 낮음·생 높음 → strange');
  ok(e(5, 5) === 'barely' && e(0, 0) === 'barely', '둘 다 낮음 → barely');
  w.TEXTS.RULES.high = 5;
  ok(e(5, 5) === 'whole', '기준(RULES.high)을 고치면 결말 기준이 바뀐다');
  ok(R.ending({ yeon: 5, saeng: 5 }, 7) === 'barely' && R.ending({ yeon: 7, saeng: 7 }, 7) === 'whole', '기준을 인자로 줄 수도 있다');
}

{
  console.log(' 원작 궤적');
  const { R } = fresh();
  const run = R.originalRun();
  const t = run.trail;
  const at = (p) => t.find((x) => x.place === p);
  ok(t[0].label === '출발' && t[0].yeon === 5 && t[0].saeng === 5, '원작 궤적도 출발(5, 5)부터');
  ok(at('namwon').yeon === 5 && at('namwon').saeng === 5 && at('namwon').invented, '원작에 없는 장면(피란 딜레마)에서는 변하지 않는다(점선 표시)');
  ok(at('nanggoya').yeon === 8 && at('nanggoya').saeng === 3, `낭고야: 고정 꿈 +1, 장삿배(원작: 오름) 연의 길 (연 ${at('nanggoya').yeon}, 생 ${at('nanggoya').saeng})`);
  ok(run.before['d-sea-route'] && run.before['d-sea-route'].saeng === 6, `원작대로 걸으면 항로 고르기 때 생 6 (${JSON.stringify(run.before['d-sea-route'])})`);
  ok(at('hangzhou').saeng === 6, '항주를 떠날 때 생 6(막간 5 → 떠남 −2 → 준비 +1 → 배와 양식 +2)');
  ok(run.choices['d-sea-route'].nearest === 'sea', '항로는 원작에 가까운 바다길로 계산한다');
  ok(at('sea').saeng === 2 && at('sea').yeon === 10, `바다: 바다길(생 −2·연 +1) → 해적(−2) → 섬(창작, 변화 없음) → 조선 배(준비, 연 +1) (연 ${at('sea').yeon}, 생 ${at('sea').saeng})`);
  ok(eq(R.originalTrail().map((x) => x.place), ['start', 'namwon', 'nanggoya', 'annam', 'hangzhou', 'sea', 'namwon_final']), '거점 기록: 출발 → 남원 → 낭고야 → 안남 → 항주 → 바다 → 남원 재회');
  // 학생이 원작대로 걸어도 같은 값
  const { R: R2, S: S2, P: P2 } = fresh();
  R2.test.set({ know: ['k-japanese'] });
  R2.enterPlace('interlude');
  R2.applyStep(stepOf(P2, 'hangzhou', 's-wait'), { place: 'hangzhou', key: 'a', decision: 'leave' });
  R2.applyStep(stepOf(P2, 'hangzhou', 's-prep'), { place: 'hangzhou', key: 'b', decision: 'prep' });
  R2.applyStep(stepOf(P2, 'hangzhou', 's-boat'), { place: 'hangzhou', key: 'c' });
  ok(S2().saeng === 6, `학생이 원작대로(떠남·준비) 걸으면 항로 고르기 때 생 6 (${S2().saeng})`);
  const route = stepOf(P2, 'sea', 's-route');
  ok(R2.optionState(route, route.options[1], S2(), 'sea').open, '생 6이면 바다길이 열린다');
  R2.test.set({ saeng: 5 });
  ok(!R2.optionState(route, route.options[1], S2(), 'sea').open, '생 5면 바다길이 잠긴다');
}

{
  console.log(' ?act=2');
  const { R, S } = fresh();
  R.test.set({ yeon: 9, saeng: 1, know: ['k-japanese'], frags: { 1: 'x' } });
  R.startAct2();
  ok(S().yeon === 5 && S().saeng === 5 && Object.keys(S().know).length === 0 && Object.keys(S().frags).length === 0, '?act=2: 연 5·생 5, 지식·조각 없음');
  ok(S().place === 'interlude' && S().act2Only === true, '?act=2: 막간부터');
  const one = S().trail.filter((t) => t.none);
  ok(one.length >= 1 && one.every((t) => t.label === '1막 기록 없음') && !S().trail.some((t) => !t.none && ['namwon', 'nanggoya', 'annam'].includes(t.place)), "?act=2: 1막 구간은 '1막 기록 없음'");
}

// ───────── 이어 하기 글자 ─────────
const ALPHA = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789L'.split('');
function rnd(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
// 1막을 '실제로' 걸은 상태: 거점 자료의 단계를 차례로 실행(지식 카드·탐색은 고르면), 시구 맞추기는 grope/trap/fix
function play1(seed) {
  const r = rnd(seed);
  const pick = (a) => a[Math.floor(r() * a.length)];
  const env = fresh();
  const { R, S, P } = env;
  R.test.set({ mode: r() < 0.5 ? 'basic' : 'deep' });
  const learn = {};
  for (const id of ['h-namwon-war', 'h-namwon-ming', 'h-nanggoya-captives', 'h-nanggoya-donwoo', 'h-annam-trade', 'k-japanese']) learn[id] = r() < 0.5;
  const groped = Math.floor(r() * 12), fixes = Math.floor(r() * 11);
  const traps = ['A', 'B', 'C'].filter(() => r() < 0.5);
  for (const pid of ['prologue', 'namwon', 'nanggoya', 'annam']) {
    R.enterPlace(pid);
    for (const s of P[pid].steps) {
      const key = 's:' + pid + ':' + s.id;
      if (s.type === 'card' || s.type === 'know') { const id = s.history || s.know; if (learn[id]) R.applyStep(s, { place: pid, key }); continue; }
      if (s.type === 'dilemma') {
        const open = s.options.filter((o) => R.optionState(s, o, S(), pid).open);
        R.applyStep(s, { place: pid, key, decision: pick(open).id });
        continue;
      }
      if (s.type === 'poem') {
        for (let i = 0; i < groped; i++) R.grope();
        for (let i = 0; i < fixes; i++) R.puzzleFix();
        for (const t of traps) R.puzzleTrap(t);
        continue;
      }
      R.applyStep(s, { place: pid, key });
    }
    if (pid === 'annam') R.finishAct1(); else R.leavePlace(pid);
  }
  return env;
}
const pickState = (st) => ({
  mode: st.mode, yeon: st.yeon, saeng: st.saeng, frags: st.frags, tokens: (st.tokens || []).map((t) => t.id), know: Object.keys(st.know).filter((k) => st.know[k]).sort(),
  choices: st.choices, jangyuk: st.jangyuk, dreamSeen: st.dreamSeen, wisdomUsed: st.wisdomUsed,
  puzzle: { traps: st.puzzle.traps.slice().sort(), fixes: Math.min(8, st.puzzle.fixes), groped: Math.min(10, st.puzzle.groped) },
  trail: st.trail.map((t) => [t.place, t.yeon, t.saeng]), cards: (st.cards || []).map((c) => c.id).sort(), act1Done: st.act1Done,
});
{
  console.log(' 이어 하기 글자');
  let allLen = true, allAlpha = true, allSame = true, allReject = true, firstBad = null, cases = 0, jang = 0, capped = 0;
  const seen = new Set();
  for (let i = 0; i < 200; i++) {
    const env = play1(1000 + i * 7919);
    const st = env.S();
    if (st.jangyuk) jang++;
    if (st.puzzle.groped >= 8) capped++;
    const code = env.C.encode(st);
    seen.add(code);
    if (!(code.length >= 4 && code.length <= 6)) allLen = false;
    if (!code.split('').every((c) => ALPHA.includes(c))) allAlpha = false;
    const fresh2 = sandbox(); // 새 기기
    const d = fresh2.G.code.decode(code);
    if (d.error || !eq(pickState(d), pickState(st))) { allSame = false; if (!firstBad) firstBad = { code, want: pickState(st), got: d.error || pickState(d) }; }
    // 한 글자씩 바꿔 보기(모든 자리 × 다른 31글자)
    for (let p = 0; p < code.length; p++) for (const ch of ALPHA) {
      if (ch === code[p]) continue;
      const bad = code.slice(0, p) + ch + code.slice(p + 1);
      cases++;
      if (!fresh2.G.code.decode(bad).error) { allReject = false; if (!firstBad) firstBad = { flip: bad, from: code }; }
    }
  }
  ok(allLen, '글자는 4~6자');
  ok(allAlpha, '헷갈리는 글자(0, O, 1, I, l)를 쓰지 않는다');
  ok(allSame, '무작위 1막 상태 200개가 새 기기에서 똑같이 되살아난다' + (firstBad && !firstBad.flip ? ' — ' + JSON.stringify(firstBad).slice(0, 600) : ''));
  ok(allReject, `한 글자만 바꾼 글자는 모두 거절된다(${cases}가지)` + (firstBad && firstBad.flip ? ' — ' + JSON.stringify(firstBad) : ''));
  ok(jang > 0 && capped > 0, `무작위 상태에 쓰러짐(${jang})과 8번 넘는 더듬어 찾기(${capped})가 섞여 있다`);
  ok(seen.size > 150, `서로 다른 글자가 나온다(${seen.size}가지)`);
  const { C, R, S } = play1(42);
  const code = C.encode(S());
  const spaced = code.slice(0, 3).toLowerCase() + ' - ' + code.slice(3);
  ok(!C.decode(spaced).error, `소문자·띄어쓰기·붙임표는 무시한다 ("${spaced}")`);
  ok(!!C.decode('').error && !!C.decode('ABC').error && !!C.decode(code + 'A').error && !!C.decode(code.slice(0, 5) + '0').error && !!C.decode(code.slice(0, 5) + 'O').error, '빈 글자·짧은 글자·긴 글자·없는 글자는 거절한다');
  ok(typeof C.decode('ZZZZZZ').error === 'string', '거절할 때 까닭(글)을 돌려준다');
  // '7+'
  const e2 = play1(42);
  e2.S().puzzle.groped = 9; e2.S().puzzle.fixes = 12;
  const d2 = sandbox().G.code.decode(e2.C.encode(e2.S()));
  const w3 = sandbox();
  Object.assign(w3.G.save.state, d2);
  ok(w3.G.rules.countLabel('groped') === '7+' && w3.G.rules.countLabel('fixes') === '7+', `횟수 8 이상은 되살린 뒤 '7+'로 보인다 (더듬어 ${d2.puzzle.groped}, 고침 ${d2.puzzle.fixes})`);
  ok(d2.puzzle.fixes === 8 && e2.C.encode(Object.assign({}, e2.S(), { puzzle: Object.assign({}, e2.S().puzzle, { fixes: 30 }) })) === e2.C.encode(e2.S()), "고친 횟수 8 이상은 한 값('8 이상')으로 담긴다");
  const e3 = play1(43); e3.S().puzzle.groped = 7; e3.S().puzzle.fixes = 7;
  const d3 = sandbox().G.code.decode(e3.C.encode(e3.S()));
  const w4 = sandbox(); Object.assign(w4.G.save.state, d3);
  ok(w4.G.rules.countLabel('groped') === '7' && w4.G.rules.countLabel('fixes') === '7', '7까지는 그대로 보인다');
  const e4 = fresh(); e4.S().puzzle.groped = 8;
  ok(e4.R.countLabel('groped') === '7+', "게임 중에도 8 이상은 '7+'");
  // 손으로 따져 본 한 경우: 신표·직접 묻기·배에 오름 → 낭고야에서 생 0(고정 꿈 뒤) → 떠올리는 글, 생 3
  const h = fresh();
  const sel = { mode: 'deep', choices: { 'd-namwon-flee': 'sinpyo', 'd-nanggoya-news': 'ask', 'd-nanggoya-ship': 'board' }, know: {}, puzzle: { groped: 2, fixes: 1, traps: ['B'] } };
  const rep = h.C.replay(sel);
  ok(rep.yeon === 10 && rep.saeng === 1 && rep.jangyuk === 1 && rep.frags[2] && rep.frags[3] && rep.frags[4] && rep.frags[1], `되풀이 계산: 연 10, 생 3 − 더듬어 2 = 1, 장육불 1, 조각 넷 (연 ${rep.yeon}, 생 ${rep.saeng}, 횟수 ${rep.jangyuk})`);
  ok(rep.place === 'interlude' && rep.act1Done === true && rep.done['p:annam'] && rep.done['p:prologue'], '되살린 상태는 막간에서 이어진다');
  // restore: 이 브라우저 저장에 넣고 설정은 남긴다
  const g = fresh();
  g.S().font = 1.3; g.S().teacher = true; g.S().name = '2-3 김';
  const res = g.C.restore(code);
  ok(res.ok && g.S().act1Done && g.S().place === 'interlude' && g.S().font === 1.3 && g.S().teacher === true && JSON.parse(g.w.__store['choecheok-jeon-v1']).act1Done, 'restore: 저장에 넣고 설정(글자 크기·선생님용)은 남긴다');
  ok(!!g.C.restore('ABCDEF').error || !!g.C.restore('AAAAAA').error, 'restore: 틀린 글자는 저장을 건드리지 않고 거절한다');
}

// ───────── 2부: 크롬 ─────────
console.log('2부: 화면(크롬)');
const { chromium } = await import('playwright');
const { base } = await import('./serve.mjs');
const BASE = await base();
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const fixtureSrc = fs.readFileSync(FIXTURE, 'utf8') + '\n;for (const k in PLACES) if (PLACES[k]) PLACES[k].id = k;';
const SHOTS = path.join(HERE, 'shots', 'rules');
fs.rmSync(SHOTS, { recursive: true, force: true });
fs.mkdirSync(SHOTS, { recursive: true });
try {
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  page.on('requestfailed', (r) => errs.push('requestfailed: ' + r.url()));
  const shot = async (n) => { await page.waitForFunction(() => !document.querySelector('.gettoast'), null, { timeout: 12000 }).catch(() => {}); await page.waitForTimeout(400); await page.screenshot({ path: path.join(SHOTS, n + '.png') }); };
  const boot = async (url = BASE) => { await page.goto(url); await page.waitForSelector('.title-screen h1, .event.on, .place-card', { timeout: 10000 }); await page.addScriptTag({ content: fixtureSrc }); };
  await boot();
  await page.evaluate(() => { localStorage.clear(); G.save.reset(); });
  ok(await page.evaluate(() => typeof G.rules === 'object' && typeof G.code === 'object' && ['dilemma', 'gauge', 'know', 'frag', 'dream', 'card'].every((t) => G.steps.has(t))), '단계 종류 dilemma·gauge·know·frag·dream·card가 등록되어 있다');

  // 잠긴 지혜의 길 + 원작 대조 카드(처음 배우기: 풀이 더)
  await page.evaluate(() => { G.rules.test.set({ yeon: 5, saeng: 5, know: [], mode: 'basic' }); G.save.state.place = 'nanggoya'; window.__d = false; G.app.runSteps(PLACES.nanggoya, ['s-news']).then(() => (window.__d = true)); });
  await page.waitForSelector('.ev-tray .opt');
  const locked = await page.evaluate(() => { const b = [...document.querySelectorAll('.ev-tray .opt')]; const w = b[2]; return { n: b.length, dis: w.disabled, cls: w.className, hint: (w.querySelector('.od.lock') || {}).textContent || '' }; });
  ok(locked.n === 3 && locked.dis && /돈우/.test(locked.hint), `지혜의 길이 잠긴 모습 + 실마리 한 줄 ("${locked.hint}")`);
  await shot('01_dilemma_locked');
  await page.click('.ev-tray .opt >> nth=0');
  await page.waitForSelector('.rcard');
  const card1 = await page.evaluate(() => { const c = document.querySelector('.rcard'); return { text: c.textContent, chips: [...c.querySelectorAll('.rchip')].map((x) => x.textContent), fiction: c.classList.contains('fiction') }; });
  ok(card1.fiction && card1.text.includes('원작에는 없는 장면입니다') && card1.text.includes('원작의 옥영이라면'), '원작에 없는 장면: 틀 글 + 게임 창작 카드');
  ok(card1.chips.includes('원문') && card1.chips.includes('풀이') && card1.chips.includes('게임 설정'), `표기 칩(원문·풀이·게임 설정): ${card1.chips.join(',')}`);
  const g1 = await page.evaluate(() => ({ y: G.save.state.yeon, s: G.save.state.saeng, f3: !!G.save.state.frags[3] }));
  ok(g1.y === 7 && g1.s === 3 && g1.f3, '직접 묻기: 연 +2·생 −2, 3행 조각');
  await shot('02_card_fiction');

  // 단계 도중 새로고침 → 다시 해도 한 번만 반영
  await page.waitForTimeout(300);
  await boot();
  const afterReload = await page.evaluate(() => ({ y: G.save.state.yeon, s: G.save.state.saeng, snap: !!G.save.state.snap['s:nanggoya:s-news'], done: !!G.save.state.done['s:nanggoya:s-news'] }));
  ok(afterReload.snap && !afterReload.done, '새로고침: 끝나지 않은 단계로 남아 있다');
  await page.evaluate(() => { window.__d = false; G.app.runSteps(PLACES.nanggoya, ['s-news']).then(() => (window.__d = true)); });
  await page.waitForSelector('.ev-tray .opt');
  const restored = await page.evaluate(() => ({ y: G.save.state.yeon, s: G.save.state.saeng, f3: !!G.save.state.frags[3], ch: G.save.state.choices['d-nanggoya-news'] || null }));
  ok(restored.y === 5 && restored.s === 5 && !restored.f3 && !restored.ch, '다시 열면 그 단계를 시작할 때 값으로 되돌린다');
  await page.click('.ev-tray .opt >> nth=0');
  await page.waitForSelector('.rcard');
  await page.click('.ev-tray .btn.primary');
  await page.waitForFunction(() => window.__d === true);
  const once = await page.evaluate(() => ({ y: G.save.state.yeon, s: G.save.state.saeng, n: G.save.state.cards.filter((c) => c.id === 'd-nanggoya-news').length, done: !!G.save.state.done['s:nanggoya:s-news'] }));
  ok(once.y === 7 && once.s === 3 && once.n === 1 && once.done, `새로고침 뒤 다시 해도 한 번만 반영(연 ${once.y}, 생 ${once.s}, 카드 ${once.n}장)`);
  await page.evaluate(() => { window.__d = false; G.app.runSteps(PLACES.nanggoya, ['s-news']).then(() => (window.__d = true)); });
  await page.waitForFunction(() => window.__d === true);
  ok(await page.evaluate(() => G.save.state.yeon === 7 && G.save.state.saeng === 3), '끝낸 단계는 다시 펼치지 않는다');

  // 원작 대조 카드(깊이 읽기: 긴 원문) + 쓰러짐(고정 꿈 뒤 → 떠올리는 글)
  await page.evaluate(() => { G.rules.test.set({ yeon: 5, saeng: 2, mode: 'deep' }); G.save.state.dreamSeen = true; window.__d = false; G.app.runSteps(PLACES.nanggoya, ['s-ship']).then(() => (window.__d = true)); });
  await page.waitForSelector('.ev-tray .opt');
  await page.click('.ev-tray .opt >> nth=0');
  await page.waitForSelector('.rdream');
  const recall = await page.evaluate(() => ({ t: document.querySelector('.ev-main').textContent, s: G.save.state.saeng, j: G.save.state.jangyuk }));
  ok(recall.t.includes('떠올렸다') && recall.s === 3 && recall.j === 1, '낭고야 고정 꿈 뒤 생 0 → 떠올리는 글, 생 3, 횟수 1');
  await shot('03_collapse_recall');
  await page.click('.ev-tray .btn.primary');
  await page.waitForSelector('.rcard');
  const card2 = await page.evaluate(() => { const c = document.querySelector('.rcard'); return { orig: c.classList.contains('orig'), text: c.textContent }; });
  ok(card2.orig && card2.text.includes('頓于每與同舟') && !card2.text.includes('장삿배는 물건을'), '깊이 읽기: 원작 대조 카드에 긴 원문(풀이 덧붙임은 없음)');
  ok(card2.text.includes('원작의 옥영') && card2.text.includes('배에 오른다'), '대조 카드에 내 선택과 원작의 선택');
  await shot('04_card_orig_deep');
  await page.click('.ev-tray .btn.primary');
  await page.waitForFunction(() => window.__d === true);

  // 처음 배우기: 풀이 덧붙임
  await page.evaluate(() => { delete G.save.state.done['s:nanggoya:s-ship']; delete G.save.state.applied['s:nanggoya:s-ship']; G.rules.test.set({ yeon: 5, saeng: 5, mode: 'basic' }); window.__d = false; G.app.runSteps(PLACES.nanggoya, ['s-ship']).then(() => (window.__d = true)); });
  await page.waitForSelector('.ev-tray .opt');
  await page.click('.ev-tray .opt >> nth=1');
  await page.waitForSelector('.rcard');
  const card3 = await page.evaluate(() => document.querySelector('.rcard').textContent);
  ok(card3.includes('장삿배는 물건을') && card3.includes('每與同舟') && !card3.includes('頓于每與同舟'), '처음 배우기: 짧은 원문 + 풀이 덧붙임');
  await page.click('.ev-tray .btn.primary');
  await page.waitForFunction(() => window.__d === true);

  // 장육불 꿈(기본 쓰러짐)과 고정 사건·지식·조각·카드 단계
  await page.evaluate(() => { G.rules.test.set({ yeon: 5, saeng: 1 }); window.__d = false; G.app.runSteps({ id: 'sea', steps: [{ id: 'p', type: 'gauge', fixed: true, gauge: { saeng: -2 }, lines: ['해적이 배를 빼앗았다.'] }] }).then(() => (window.__d = true)); });
  await page.waitForSelector('.ev-tray .btn.primary');
  await page.click('.ev-tray .btn.primary');
  await page.waitForSelector('.rdream');
  const dream = await page.evaluate(() => ({ t: document.querySelector('.ev-main').textContent, s: G.save.state.saeng }));
  ok(dream.t.includes('愼無死') && dream.t.includes('부디 죽지 마라') && dream.s === 3, '고정 사건으로 생 0 → 장육불 꿈(원문+풀이), 생 3');
  await shot('05_dream');
  await page.click('.ev-tray .btn.primary');
  await page.waitForFunction(() => window.__d === true);
  await page.evaluate(() => { window.__d = false; G.app.runSteps(PLACES.namwon, ['s-war']).then(() => (window.__d = true)); });
  await page.waitForSelector('.rcard.history');
  await shot('06_history_card');
  await page.click('.ev-tray .btn.primary');
  await page.waitForFunction(() => window.__d === true);
  ok(await page.evaluate(() => !!G.save.state.know['h-namwon-war'] && G.save.state.cards.some((c) => c.id === 'h-namwon-war')), '역사 카드 단계: 지식 + 수첩');

  // ?act=2: 하던 이야기가 있으면 지우기 전에 한 번 묻는다 → 그만두면 그대로, 시작을 누르면 막간부터
  await page.goto(BASE + '?act=2');
  await page.waitForSelector('.act2-sheet', { timeout: 10000 });
  ok(await page.evaluate(() => !!G.save.state.know['h-namwon-war'] && G.save.state.place !== 'interlude'), '?act=2: 하던 이야기가 있으면 묻는 판이 뜨고, 그 전에는 진행이 그대로');
  await page.click('.act2-sheet .actions .btn:not(.primary)');
  await page.waitForSelector('.title-screen', { timeout: 5000 });
  ok(await page.evaluate(() => !document.querySelector('.act2-sheet') && !!G.save.state.know['h-namwon-war']), '?act=2: 그만두면 타이틀에 남고 진행이 지워지지 않는다');
  await page.goto(BASE + '?act=2');
  await page.waitForSelector('.act2-sheet', { timeout: 10000 });
  await page.click('.act2-sheet .actions .btn.primary');
  await page.waitForSelector('.place-card, .event.on', { timeout: 10000 });
  const a2 = await page.evaluate(() => ({ p: G.save.state.place, y: G.save.state.yeon, s: G.save.state.saeng, k: Object.keys(G.save.state.know).length, f: Object.keys(G.save.state.frags).length, t: G.save.state.trail }));
  ok(a2.p === 'interlude' && a2.y === 5 && a2.s === 5 && a2.k === 0 && a2.f === 0, '?act=2: 막간부터 연 5·생 5, 지식·조각 없음');
  ok(a2.t.some((x) => x.none && x.label === '1막 기록 없음'), "?act=2: 거점 기록에 '1막 기록 없음'");
  await shot('07_act2');
  errs.forEach((e) => problems.push('[크롬] ' + e));
  ok(errs.length === 0, '오류·실패한 요청 없음' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await ctx.close();
} finally {
  await browser.close();
}

console.log(`\n점검 ${checks}개 · 문제 ${problems.length}개`);
for (const p of problems) console.log(' - ' + p);
process.exit(problems.length ? 1 : 0);
