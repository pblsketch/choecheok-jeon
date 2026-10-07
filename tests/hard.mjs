// 어려운 길 완주(spec §13-3): cd tests && node hard.mjs [1|2|3]
//  셋 다 처음부터 결과 화면까지 실제 화면을 눌러 간다(맵 목표만 시험 손잡이).
//  1) 연이 낮은 길: 양식 → 침묵 → 남음(연 0으로 안남에 닿음) → 퉁소를 세 번째 소리에 알아듣는다. 그사이 포구를 두 번 더 걷고,
//     모래밭에서 2행 조각이 되살아난다(연 3 이하) → 1차시 끝 → 2막 끝까지
//  2) 더듬어 찾기로 생이 0: 빈 행이 둘(2·3행)인 채 안남에 닿아 생 1에서 더듬기 → 생 0 → 남은 행은 '퉁소 가락에 기대기' →
//     장육불 꿈 없이 퉁소가 다시 울리고 정답이 떠올라 시가 완성된다(생 0 그대로, 장육불 횟수 그대로) → 막간에서 생 5로 → 끝까지
//     ※ 1막의 어떤 선택으로도 안남 시구 맞추기 때 생이 '빈 행 수' 이하가 되지 않는다(가장 낮아도 더듬기 한 번 뒤 생 2).
//        그래서 이 길만 시구 맞추기를 펼친 직후 생을 1로 맞춘다(G.rules.test.set) — 나머지는 모두 실제 선택이다.
//  3) 다른 거점에서 생이 0: 신표 → 직접 묻기 → 배에 오름(낭고야: 고정 꿈을 본 뒤라 '떠올리는 글', 생 3) →
//     2막 떠남 · 준비 없이 · 연안길 · 섬에서 신호불(생 2 → 0) → 장육불 꿈(愼無死) → 생 3, 장육불 2번, 섬의 지혜의 길 닫힘 → 결과 화면 '2'
//  콘솔 오류 0. 화면 사진: tests/shots/hard/
import { base } from './serve.mjs';
import { VIEWS, checker, launch, open, fresh, startGame, play, solvePoem, saveResult, readResult, state, shotsDir } from './lib.mjs';

const C = checker();
const { ok } = C;
const BASE = await base();
const OUT = shotsDir('hard');
const ONLY = process.argv[2] || '123';
const browser = await launch();

async function run(name, vp, mode, choices, route, o = {}) {
  const { ctx, page, errs, shot } = await open(browser, vp, { shots: OUT, prefix: name });
  const t0 = Date.now();
  await fresh(page, BASE);
  await startGame(page, mode);
  const log = await play(page, Object.assign({ choices, route, act1: 'reload' }, o.plan || {}), { shot });
  ok(log.ok, `${name}: 처음부터 결과 화면까지 (${Math.round((Date.now() - t0) / 1000)}초)` + (log.ok ? '' : ' — ' + log.why));
  const st = await state(page);
  const rs = log.ok ? await readResult(page) : null;
  if (log.ok) {
    const dl = await saveResult(page, OUT, name + '_result.png', name);
    ok(dl.png && dl.size > 50000, `${name}: 결과 그림 저장(${Math.round(dl.size / 1024)}KB)`);
  }
  return { page, ctx, errs, log, st, rs };
}
const trailOf = (st, p) => st.trail.find((t) => t.place === p) || {};

// ───────── 1) 연이 낮은 길 ─────────
if (ONLY.includes('1')) {
  console.log('\n1) 연이 낮은 길 — PC, 처음 배우기');
  const r = await run('low_yeon', VIEWS.desktop, 'basic',
    { 'd-namwon-flee': 'food', 'd-nanggoya-news': 'silent', 'd-nanggoya-ship': 'stay', 'd-hangzhou-wait': 'leave', 'd-hangzhou-prep': 'none', 'd-island-signal': 'endure' }, 'coast');
  const { st, log } = r;
  ok(trailOf(st, 'nanggoya').yeon === 0, `낭고야를 떠날 때 연 ${trailOf(st, 'nanggoya').yeon}(양식 −2, 고정 꿈 +1, 침묵 −2, 남음 −2)`);
  ok(st.flags['annam:yeon0'] === 0 && st.flags['annam:heard'] === 3, `안남에 연 ${st.flags['annam:yeon0']}로 닿아 퉁소를 ${st.flags['annam:heard']}번째 소리에 알아듣는다`);
  ok(['tongso-1', 'tongso-2', 'tongso-3', 'recall-sky'].every((k) => st.done['s:annam:' + k]) && st.done['b:annam:b-walk2'] && st.done['b:annam:b-walk3'], '두 번 스쳐 간 소리 사이에 포구를 두 번 더 걷는다(부두 끝 → 모래밭)');
  const walked = log.goals.filter((g) => g.place === 'annam').map((g) => g.text);
  ok(walked.some((t) => /부두 끝/.test(t)) && walked.some((t) => /모래밭/.test(t)), `걷는 목표가 화면에 뜬다: ${walked.join(' / ')}`);
  ok(log.poemBefore && log.poemBefore.frags[2] && !log.poemBefore.frags[3], '모래밭에서 2행 조각이 되살아나 시구 맞추기 때 조각 1·2·4(3행만 더듬기)');
  ok(st.puzzle.groped === 1 && log.poemAfter.saeng === log.poemBefore.saeng - 1, `더듬기 한 번, 생 ${log.poemBefore.saeng} → ${log.poemAfter.saeng}`);
  ok(r.rs && r.rs.rows.length === 7 && r.rs.dream === '0', '결과 화면: 선택 일곱 줄, 장육불 0');
  ok(r.errs.length === 0, '콘솔 오류·실패한 요청 0건' + (r.errs.length ? ': ' + r.errs.slice(0, 5).join(' | ') : ''));
  await r.ctx.close();
}

// ───────── 2) 더듬어 찾기로 생 0 ─────────
if (ONLY.includes('2')) {
  console.log('\n2) 더듬어 찾기로 생이 0 — 휴대폰 가로, 깊이 읽기');
  let zeroBtn = null, beforeJ = null;
  const r = await run('grope_zero', VIEWS.phone, 'deep',
    { 'd-namwon-flee': 'food', 'd-nanggoya-news': 'silent', 'd-nanggoya-ship': 'board', 'd-hangzhou-wait': 'wait', 'd-hangzhou-prep': 'none', 'd-island-signal': 'endure' }, 'coast', {
      plan: {
        poem: solvePoem({
          before: async (page, log) => {
            log.arrive = await state(page);
            beforeJ = log.arrive.jangyuk;
            await page.evaluate(() => G.rules.test.set({ saeng: 1 })); // 자연스러운 1막 선택으로는 닿지 않는 값(머리말 ※)
          },
          afterGrope: async (page, log, n) => {
            if (zeroBtn == null) zeroBtn = await page.evaluate(() => ({ saeng: G.save.state.saeng, zero: [...document.querySelectorAll('.pz-grope.zero')].map((b) => b.dataset.row), label: (document.querySelector('.pz-grope.zero') || {}).textContent || '' }));
          },
        }),
      },
    });
  const { st, log } = r;
  ok(log.arrive && !log.arrive.frags[2] && !log.arrive.frags[3] && log.arrive.frags[1] && log.arrive.frags[4], '시구 맞추기 때 2·3행이 비어 있다(양식·침묵)');
  ok(zeroBtn && zeroBtn.saeng === 0 && zeroBtn.zero.includes('3') && /퉁소 가락에 기대기/.test(zeroBtn.label), `생 1에서 2행을 더듬어 생 0 → 3행 단추가 "퉁소 가락에 기대기"로 (${JSON.stringify(zeroBtn)})`);
  ok(log.poemException === 1 && log.exceptionSeen && !log.exceptionSeen.dream && log.exceptionSeen.saeng === 0 && log.exceptionSeen.jangyuk === beforeJ, '생 0에서 더듬으면 장육불 꿈 없이 퉁소가 다시 울린다(안남 예외)');
  ok(log.poemAfter && log.poemAfter.saeng === 0 && log.poemAfter.jangyuk === beforeJ && log.poemAfter.puzzle.groped === 2, `정답이 떠올라 시가 완성된다 — 생 ${log.poemAfter && log.poemAfter.saeng}, 장육불 ${log.poemAfter && log.poemAfter.jangyuk}(그대로), 더듬기 ${log.poemAfter && log.poemAfter.puzzle.groped}`);
  ok(!log.dreams.some((d) => d.place === 'annam'), '안남에서는 꿈 장면이 한 번도 뜨지 않는다');
  ok(trailOf(st, 'annam').saeng === 0 && st.jangyuk === beforeJ, `1막 끝까지 생 0 그대로(안남 기록 생 ${trailOf(st, 'annam').saeng}), 쓰러짐으로 세지 않음`);
  ok(trailOf(st, 'hangzhou').saeng === 9 && st.choices['d-hangzhou-wait'] === 'wait', `막간에서 생 5로 돌아온 뒤 기다림(+2)·배와 양식(+2) → 항주를 떠날 때 생 ${trailOf(st, 'hangzhou').saeng}`);
  ok(r.rs && r.rs.groped === '2' && r.rs.dream === String(beforeJ), `결과 화면: 더듬어 찾기 ${r.rs && r.rs.groped}, 장육불 ${r.rs && r.rs.dream}`);
  ok(r.errs.length === 0, '콘솔 오류·실패한 요청 0건' + (r.errs.length ? ': ' + r.errs.slice(0, 5).join(' | ') : ''));
  await r.ctx.close();
}

// ───────── 3) 다른 거점에서 생 0 ─────────
if (ONLY.includes('3')) {
  console.log('\n3) 다른 거점에서 생이 0 — PC, 처음 배우기');
  const r = await run('collapse', VIEWS.desktop, 'basic',
    { 'd-namwon-flee': 'sinpyo', 'd-nanggoya-news': 'ask', 'd-nanggoya-ship': 'board', 'd-hangzhou-wait': 'leave', 'd-hangzhou-prep': 'none', 'd-island-signal': 'signal' }, 'coast');
  const { st, log } = r;
  const ng = log.dreams.find((d) => d.place === 'nanggoya' && /recall/.test(d.cls));
  ok(ng && ng.st.saeng === 3 && ng.st.jangyuk === 1 && ng.st.wisdomUsed.nanggoya === 'lost', '낭고야: 배에 오르다 생 0 → 고정 꿈을 본 뒤라 떠올리는 글, 생 3, 장육불 1, 지혜의 길 닫힘');
  const sea = log.dil['d-island-signal'];
  ok(sea && sea.before.saeng === 2, `섬의 딜레마 앞 생 ${sea && sea.before.saeng}(막간 5 → 떠남 −2 → 배와 양식 +2 → 연안길 −1 → 해적 −2)`);
  const dr = log.dreams.find((d) => d.place === 'sea');
  const txt = dr ? dr.cls : '';
  ok(dr && /rdream/.test(txt) && !/recall/.test(txt) && dr.st.saeng === 3 && dr.st.jangyuk === 2 && dr.st.wisdomUsed.sea === 'lost', `섬: 신호불(생 −2)로 생 0 → 장육불 꿈 → 생 ${dr && dr.st.saeng}, 장육불 ${dr && dr.st.jangyuk}, 섬의 지혜의 길 닫힘`);
  ok(sea && sea.card && sea.after && sea.after.saeng === 3 && sea.after.yeon === Math.min(10, sea.before.yeon + 2), '꿈 뒤에도 고른 길(신호불 연 +2)은 남고 대조 카드가 뜬다');
  ok(trailOf(st, 'sea').saeng === 2 && st.jangyuk === 2, `바다를 떠날 때 생 ${trailOf(st, 'sea').saeng}(늦은 구조 −1), 장육불 꿈 ${st.jangyuk}번`);
  ok(r.rs && r.rs.dream === '2', `결과 화면: 장육불 꿈 횟수 "${r.rs && r.rs.dream}"`);
  ok(r.errs.length === 0, '콘솔 오류·실패한 요청 0건' + (r.errs.length ? ': ' + r.errs.slice(0, 5).join(' | ') : ''));
  await r.ctx.close();
}

await browser.close();
C.finish('tests/shots/hard/');
