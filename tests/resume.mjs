// 새로고침 이어 하기(spec §13-5·§7-2): cd tests && node resume.mjs
//  같은 길을 두 번 처음부터 결과 화면까지 논다(PC, 처음 배우기).
//   기준 판: 한 번도 새로고침하지 않는다.
//   새로고침 판: 두 막에 걸쳐 여러 자리에서 새로고침 → 타이틀 '이어 하기'로 잇는다.
//    ① 딜레마 보상 직후(남원 피란: 신표 +2/−2·신표·2행 조각을 받고 대답을 읽는 중)
//    ② 조각을 받은 직후(남원 회상 '퉁소의 밤'의 1행 조각 단계)
//    ③ 말 속 역사 카드를 받은 직후(연곡의 피란민에게 두 번 말을 걸어 정유재란 카드)
//    ④ 더듬어 찾기 직후(안남 시구 맞추기: 생 −1, 더듬기 +1)
//    ⑤ 선택 도중(항주 '기다릴 것인가' 선택지가 떠 있을 때)
//    ⑥ 고정 사건 직후(항주 '배와 양식 마련' 생 +2)
//    ⑦ 쓰러짐 직후(섬: 신호불로 생 0 → 장육불 꿈이 떠 있을 때)
//   자리마다: 다시 열면 그 단계를 시작할 때 값으로 되돌아가 있고, 다시 하면 처음 받았을 때와 같은 값(두 번 반영 없음),
//   끝에는 게이지·조각·신표·지식·수첩 카드·장육불 횟수·시구 기록·선택·거점 기록이 기준 판과 똑같다. 콘솔 오류 0.
import { base } from './serve.mjs';
import { VIEWS, checker, launch, open, fresh, startGame, play, solvePoem, learner, reloadContinue, talkTo, state, tally, eq, shotsDir, saveResult } from './lib.mjs';

const C = checker();
const { ok } = C;
const BASE = await base();
const OUT = shotsDir('resume');
const browser = await launch();
const CHOICES = { 'd-namwon-flee': 'sinpyo', 'd-nanggoya-news': 'silent', 'd-nanggoya-ship': 'board', 'd-hangzhou-wait': 'leave', 'd-hangzhou-prep': 'none', 'd-island-signal': 'signal' };
const KEYS = ['yeon', 'saeng', 'jangyuk', 'frags', 'tokens', 'know', 'cards', 'puzzle', 'choices', 'wisdomUsed', 'dreamSeen'];
const pickT = (t) => Object.fromEntries(KEYS.map((k) => [k, t[k]]));

async function game(name, hooks) {
  const { ctx, page, errs, shot } = await open(browser, VIEWS.desktop, { shots: OUT, prefix: name });
  const t0 = Date.now();
  await fresh(page, BASE);
  await startGame(page, 'basic');
  const learn = learner(['war']);
  const extra = Object.assign({}, hooks.plan || {});
  const userGoal = extra.onGoal;
  delete extra.onGoal;
  const plan = Object.assign({
    choices: CHOICES, route: 'coast', act1: 'reload',
    poem: solvePoem(hooks.poem || {}),
    // 먼저 1막 탐색(정유재란 카드)을 하고, 그다음 이 판의 손잡이
    onGoal: async (goal, map, page, log) => { await learn(goal, map, page, log); if (userGoal) await userGoal(goal, map, page, log); },
  }, extra);
  const log = await play(page, plan, { shot });
  ok(log.ok, `${name}: 처음부터 결과 화면까지 (${Math.round((Date.now() - t0) / 1000)}초)` + (log.ok ? '' : ' — ' + log.why));
  const st = await state(page);
  if (log.ok) { const dl = await saveResult(page, OUT, name + '.png', name); ok(dl.png, `${name}: 결과 그림 저장`); }
  ok(errs.length === 0, `${name}: 콘솔 오류·실패한 요청 0건` + (errs.length ? ': ' + errs.slice(0, 5).join(' | ') : ''));
  await ctx.close();
  return { log, st };
}

// ───────── 기준 판 ─────────
console.log('\n기준 판(새로고침 없음)');
const ref = await game('reference', {});

// ───────── 새로고침 판 ─────────
console.log('\n새로고침 판');
const R = {}; // 자리마다 { first(처음 받은 직후), again(다시 열었을 때), redo(다시 한 뒤), start(단계를 시작할 때 값) }
const stepKey = (s, id) => s.snap.find((k) => k.endsWith(':' + id));
async function reloadAt(page, tag, key) {
  const st = await state(page);
  R[tag] = { first: tally(st), start: key && st.snap[key] ? JSON.parse(JSON.stringify(st.snap[key])) : null, key };
  await page.screenshot({ path: `${OUT}/reload_${tag}_before.png` });
  await reloadContinue(page);
  return 'reloaded';
}
// 다시 열었을 때(새로고침 뒤 그 딜레마 선택지가 다시 뜰 때)의 값 · 다시 한 뒤(처음과 같은 때)의 값
async function seeAgain(page, tag) { if (R[tag] && !R[tag].again) R[tag].again = tally(await state(page)); }
async function seeRedo(page, tag) { if (R[tag] && !R[tag].redo) R[tag].redo = tally(await state(page)); }

const res = await game('reloaded', {
  plan: {
    async onDilemma(d, page, log, s) {
      if (d === 'd-namwon-flee' && R.dilemma) await seeAgain(page, 'dilemma');
      if (d === 'd-island-signal' && R.collapse) await seeAgain(page, 'collapse');
      if (d === 'd-hangzhou-wait') {
        if (!R.choosing) { R.choosing = { first: tally(await state(page)) }; await reloadContinue(page); return 'reloaded'; }
        if (!R.choosing.again) R.choosing.again = tally(await state(page));
      }
    },
    async afterChoice(d, page, log) {
      if (d === 'd-namwon-flee') {
        // 보상(연·생·신표·조각)이 들어간 뒤, 대답을 읽는 도중에
        await page.waitForFunction(() => G.save.state.choices['d-namwon-flee'] === 'sinpyo' && G.save.state.frags[2], null, { timeout: 5000 });
        await page.waitForTimeout(400);
        if (!R.dilemma) { const keys = await page.evaluate(() => Object.keys(G.save.state.snap)); return reloadAt(page, 'dilemma', keys.find((k) => k.endsWith(':n-flee'))); }
        await seeRedo(page, 'dilemma');
      }
      if (d === 'd-hangzhou-wait' && R.choosing && !R.choosing.redo) {
        await page.waitForFunction(() => !!G.save.state.choices['d-hangzhou-wait'], null, { timeout: 5000 });
        R.choosing.redo = tally(await state(page));
      }
    },
    async onButton(s, page, log) {
      const k = (id) => stepKey(s, id);
      // ② 1행 조각 단계(조각을 받은 직후)
      if (k('n-frag1')) {
        await page.waitForFunction(() => G.save.state.frags[1], null, { timeout: 5000 });
        if (!R.frag) return reloadAt(page, 'frag', k('n-frag1'));
        await seeRedo(page, 'frag');
      }
      // ⑥ 고정 사건: 배와 양식 마련(생 +2를 받은 직후)
      if (k('h-boat')) {
        await page.waitForFunction(() => !!G.save.state.applied['s:hangzhou:h-boat'], null, { timeout: 5000 });
        if (!R.fixed) return reloadAt(page, 'fixed', k('h-boat'));
        await seeRedo(page, 'fixed');
      }
      // ⑦ 쓰러짐: 섬의 장육불 꿈이 떠 있을 때
      if (k('s-island') && s.dream && !/recall/.test(s.dream)) {
        if (!R.collapse) return reloadAt(page, 'collapse', k('s-island'));
        await seeRedo(page, 'collapse');
      }
    },
    async onGoal(goal, map, page, log) {
      // ③ 말 속 역사 카드를 받은 뒤 새로고침 → 이어 하기 → 같은 사람에게 다시 두 번 말을 걸어도 한 번만
      if (goal.targets.includes('hut') && !R.talk) {
        R.talk = { first: tally(await state(page)) };
        await reloadContinue(page);
        await page.waitForSelector('.place-card');
        await page.click('.ev-tray .btn.primary');
        await page.waitForFunction(() => G.world.goal() && !document.querySelector('.event.on, .dlg'), null, { timeout: 15000 });
        await page.waitForTimeout(400);
        R.talk.again = tally(await state(page));
        for (let i = 0; i < 2; i++) await talkTo(page, 'escapee');
        R.talk.redo = tally(await state(page));
      }
    },
  },
  poem: {
    async afterGrope(page, log, n) {
      if (!R.grope) {
        const st = await state(page);
        const key = Object.keys(st.snap).find((k) => k.endsWith(':poem'));
        await reloadAt(page, 'grope', key);
        return 'abort';
      }
    },
  },
});
// 시구 맞추기를 다시 열었을 때·다 한 뒤
const st = res.st;
const pz = (t) => t.puzzle;
console.log('');
const startOf = (r) => ({ yeon: r.start.yeon, saeng: r.start.saeng, jangyuk: r.start.jangyuk, frags: Object.keys(r.start.frags || {}).sort().join(','), tokens: (r.start.tokens || []).map((t) => t.id || t).join(',') });
for (const [tag, label, choice] of [['dilemma', '① 딜레마 보상 직후', true], ['frag', '② 조각을 받은 직후'], ['fixed', '⑥ 고정 사건 직후'], ['collapse', '⑦ 쓰러짐 직후', true]]) {
  const r = R[tag] || {};
  ok(!!r.first && !!r.redo && (!choice || !!r.again), `${label}: 새로고침 → 이어 하기 → 그 단계를 다시 한다`);
  if (!r.first || !r.redo) continue;
  if (choice && r.again && r.start) {
    const a = r.again, b = startOf(r);
    ok(a.yeon === b.yeon && a.saeng === b.saeng && a.jangyuk === b.jangyuk && a.frags === b.frags && a.tokens === b.tokens,
      `${label}: 선택지가 다시 뜰 때 그 단계를 시작할 때 값으로 되돌아가 있다(연 ${a.yeon}·생 ${a.saeng}·장육불 ${a.jangyuk}·조각 ${a.frags || '-'}·신표 ${a.tokens || '-'})`);
  }
  ok(eq(pickT(r.redo), pickT(r.first)), `${label}: 다시 해도 처음 받았을 때와 같다(연 ${r.first.yeon}·생 ${r.first.saeng}·장육불 ${r.first.jangyuk}·조각 ${r.first.frags}·카드 ${r.first.cards}장)` + (eq(pickT(r.redo), pickT(r.first)) ? '' : ' — ' + JSON.stringify(pickT(r.redo)) + ' ≠ ' + JSON.stringify(pickT(r.first))));
}
{
  const r = R.grope || {};
  ok(!!r.first && r.first.puzzle.groped === 1 && r.start && r.first.saeng === r.start.saeng - 1, `④ 더듬어 찾기 직후 새로고침(생 ${r.start && r.start.saeng} → ${r.first && r.first.saeng}, 더듬기 1)`);
  ok(res.log.poemBefore && res.log.poemAfter && st.puzzle.groped === 1 && ref.st.puzzle.groped === 1, `④ 다시 열어 다시 맞춰도 더듬기 ${st.puzzle.groped}번(기준 판 ${ref.st.puzzle.groped})`);
  const an = (x) => (x.trail.find((t) => t.place === 'annam') || {});
  ok(an(st).saeng === an(ref.st).saeng, `④ 안남을 떠날 때 생 ${an(st).saeng}(기준 판 ${an(ref.st).saeng}) — 생이 두 번 줄지 않았다`);
}
{
  const r = R.talk || {};
  ok(!!r.first && r.first.know.includes('h-namwon-war'), '③ 말 속 역사 카드(정유재란)를 받은 뒤 새로고침');
  ok(!!r.again && !!r.redo && eq(pickT(r.again), pickT(r.first)) && eq(pickT(r.redo), pickT(r.first)), `③ 이어 하기 뒤 같은 사람에게 다시 두 번 말을 걸어도 지식·카드·게이지가 그대로(카드 ${r.redo && r.redo.cards}장)`);
  const n = st.cards.filter((c) => c.id === 'h-namwon-war').length;
  ok(n === 1 && st.know['h-namwon-war'], `③ 끝까지 정유재란 카드는 한 장(${n}장)`);
}
{
  const r = R.choosing || {};
  ok(!!r.first && !!r.again && !!r.redo && eq(pickT(r.again), pickT(r.first)) && r.redo.saeng === r.first.saeng - 2 && r.redo.yeon === Math.min(10, r.first.yeon + 2), `⑤ 선택지가 떠 있을 때 새로고침 → 아무것도 바뀌지 않고, 고르면 한 번만(생 ${r.first && r.first.saeng} → ${r.redo && r.redo.saeng})`);
}
// 끝: 기준 판과 똑같은가
const T = (x) => Object.assign(pickT(tally(x)), { trail: x.trail.map((t) => [t.place, t.yeon, t.saeng]), ending: x.ending, route: x.route, prep: x.prep, cardIds: x.cards.map((c) => c.id).sort() });
const a = T(st), b = T(ref.st);
const diff = Object.keys(b).filter((k) => !eq(a[k], b[k]));
ok(diff.length === 0, `끝: 새로고침 판 = 기준 판 (연 ${a.yeon}·생 ${a.saeng}·장육불 ${a.jangyuk}·조각 ${a.frags}·신표 ${a.tokens}·카드 ${a.cards}장·결말 ${a.ending}; 거점 기록 ${a.trail.map((t) => t.slice(1).join('/')).join(' → ')})` + (diff.length ? ' — 다른 곳: ' + diff.map((k) => `${k}: ${JSON.stringify(a[k])} ≠ ${JSON.stringify(b[k])}`).join(' | ') : ''));
ok(res.st.jangyuk === 1 && ref.st.jangyuk === 1, `쓰러짐은 한 번만 센다(장육불 ${res.st.jangyuk})`);
await browser.close();
C.finish('tests/shots/resume/');
