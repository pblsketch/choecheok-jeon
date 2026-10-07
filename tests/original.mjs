// 원작대로 걷기(spec §13-4·§4-6 불변식): cd tests && node original.mjs
//  처음부터(타이틀 → 이야기 시작) 원작 옥영과 같은 선택으로 결과 화면까지 간다(휴대폰 가로, 처음 배우기).
//   - 원작에 있는 딜레마는 원작의 선택: 돈우의 장삿배에 오른다 · 조선으로 떠난다 · 두 나라 옷과 말을 준비한다
//   - 그 준비에 쓰는 '일본말'은 낭고야 포구에서 장꾼들의 흥정에 직접 귀 기울여 얻는다(k-japanese)
//   - 원작에 없는 딜레마(피란 짐·조선 소식·섬)는 게임이 지어낸 장면이라 아무쪽이나: 신표 · 침묵 · 버티기
//  → 뱃길을 고를 때 생이 6 이상이고 바다길이 열려 있다 → 바다길(원작에 가까운 쪽)로 건넌다.
//  결과 화면의 원작 궤적도 뱃길 앞에서 생 6이고, 원작 딜레마 줄은 '같음'으로 보인다. 콘솔 오류 0.
import { base } from './serve.mjs';
import { VIEWS, checker, launch, open, fresh, startGame, play, solvePoem, learner, saveResult, readResult, state, shotsDir } from './lib.mjs';

const C = checker();
const { ok } = C;
const BASE = await base();
const OUT = shotsDir('original');
const browser = await launch();
const { ctx, page, errs, shot } = await open(browser, VIEWS.phone, { shots: OUT, prefix: 'original' });
await fresh(page, BASE);
// 원작 딜레마의 원작 선택은 거점 자료(orig)에서 읽는다
const ORIG = await page.evaluate(() => { const o = {}; for (const p of FLOW.order) for (const s of PLACES[p].steps || []) if (s.type === 'dilemma') o[s.dilemma] = { orig: s.orig, nearest: s.origNearest || null }; return o; });
ok(ORIG['d-nanggoya-ship'].orig === 'board' && ORIG['d-hangzhou-wait'].orig === 'leave' && ORIG['d-hangzhou-prep'].orig === 'prep' && ORIG['d-sea-route'].nearest === 'sea',
  '거점 자료의 원작 선택: 장삿배에 오름 · 떠남 · 준비, 뱃길은 원작에 없는 장면(가까운 쪽 바다길)');
const choices = { 'd-namwon-flee': 'sinpyo', 'd-nanggoya-news': 'silent', 'd-island-signal': 'endure' };
for (const [d, o] of Object.entries(ORIG)) if (o.orig) choices[d] = o.orig;
const t0 = Date.now();
await startGame(page, 'basic');
const log = await play(page, { choices, route: 'sea', act1: 'reload', poem: solvePoem(), onGoal: learner(['japanese']) }, { shot });
ok(log.ok, `처음부터 결과 화면까지 원작대로 (${Math.round((Date.now() - t0) / 1000)}초)` + (log.ok ? '' : ' — ' + log.why));
const st = await state(page);
const kj = log.dil['d-hangzhou-prep'];
ok(st.know['k-japanese'] && (log.learned || []).includes('japanese'), '낭고야 포구에서 장꾼들 흥정에 귀 기울여 일본말(k-japanese)을 익혔다');
ok(kj && kj.opts.some((x) => /t-wisdom/.test(x.cls) && !x.dis), '항주: 일본말을 알아 "두 나라 옷과 말"(지혜의 길)이 열려 있다');
ok(Object.entries(ORIG).filter(([, o]) => o.orig).every(([d, o]) => st.choices[d] === o.orig), '원작에 있는 딜레마는 모두 원작 옥영과 같은 선택: ' + Object.entries(ORIG).filter(([, o]) => o.orig).map(([d]) => d + '=' + st.choices[d]).join(' '));
ok(log.routeSeen && log.routeSeen.saeng >= 6, `뱃길을 고를 때 생 ${log.routeSeen && log.routeSeen.saeng} (6 이상)`);
ok(log.routeSeen && log.routeSeen.route.some((r) => r.t === '바다길' && !r.dis), '바다길이 열려 있다(잠김 없음)');
ok(st.route === 'sea' && st.done['s:sea:s-stars'] && st.prep && st.done['s:sea:s-ship-prep'], '바다길로 별과 지남철을 따라 건너고, 준비했으니 조선 배가 바로 구조한다');
const hz = st.trail.find((t) => t.place === 'hangzhou') || {};
const orig = await page.evaluate(() => { const o = G.rules.originalRun(); return { before: o.before['d-sea-route'], hz: o.trail.find((t) => t.place === 'hangzhou') }; });
ok(hz.saeng === orig.hz.saeng && orig.before.saeng === log.routeSeen.saeng, `원작 궤적과 같은 생으로 항주를 떠난다(내 생 ${hz.saeng} · 원작 궤적 ${orig.hz.saeng}, 뱃길 앞 원작 궤적 생 ${orig.before.saeng})`);
if (log.ok) {
  const rs = await readResult(page);
  const rows = Object.fromEntries(rs.rows.map((r) => [r.d, r.t]));
  ok(['d-nanggoya-ship', 'd-hangzhou-wait', 'd-hangzhou-prep'].every((d) => /같음/.test(rows[d] || '')), '결과 화면 선택 비교표: 원작 딜레마 세 줄이 "같음"');
  ok(/곧장 바다를 건넜다/.test(rows['d-sea-route'] || '') && /원작에 없는 장면/.test(rows['d-namwon-flee'] || ''), '뱃길 줄은 "원작에 없는 장면 — 원작의 옥영은 곧장 바다를 건넜다"');
  const dl = await saveResult(page, OUT, 'original_result.png', '원작대로');
  ok(dl.png && dl.size > 50000, `결과 그림 저장(${Math.round(dl.size / 1024)}KB)`);
}
ok(errs.length === 0, '콘솔 오류·실패한 요청 0건' + (errs.length ? ': ' + errs.slice(0, 5).join(' | ') : ''));
await ctx.close();
await browser.close();
C.finish('tests/shots/original/');
