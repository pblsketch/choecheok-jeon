// 이어 하기 글자(spec §13-6·§7-2): cd tests && node code.mjs
//  1막을 실제로 끝까지 논다 → '1차시는 여기까지' 화면에 크게 보인 글자를 화면에서 읽는다 →
//  저장이 없는 새 브라우저 맥락에서 타이틀 '이어 하기 글자 넣기'에 그 글자를 넣는다 →
//  §7-2의 1막 항목이 모두 똑같이 되살아나고 막간부터 이어진다. 한 글자만 틀린 글자는 거절된다.
//  갈래 둘:
//   A 휴대폰 가로 · 처음 배우기: 양식 → 직접 묻기 → 배에 오름, 역사 카드 둘(정유재란·포로)과 일본말,
//     시구 맞추기에서 함정을 놓았다 고치고(고친 횟수 1) 2행을 더듬어 찾음 → 글자로 되살린 뒤 2막을 결과 화면까지
//   B PC · 깊이 읽기: 신표 → 직접 묻기 → 배에 오름(낭고야에서 쓰러짐: 장육불 1, 지혜의 길 닫힘), 돈우 카드·명군 카드
//  되살려 견주는 것: 방식, 연·생, 1막 딜레마 셋, 시구 조각, 신표, 지식(역사 카드·NPC 탐색), 장육불 횟수·꿈 기록·지혜의 길 기록,
//   시구 맞추기 기록(놓았던 함정·고친 횟수·더듬기), 거점별 연·생 기록(출발·남원·낭고야·안남), 수첩 카드, 1막 완료
import path from 'node:path';
import { base } from './serve.mjs';
import { VIEWS, checker, launch, open, fresh, startGame, play, solvePoem, learner, saveResult, readResult, state, eq, shotsDir } from './lib.mjs';

const C = checker();
const { ok } = C;
const BASE = await base();
const OUT = shotsDir('code');
const browser = await launch();

const PATHS = {
  A: { vp: VIEWS.phone, mode: 'basic', choices: { 'd-namwon-flee': 'food', 'd-nanggoya-news': 'ask', 'd-nanggoya-ship': 'board' }, learn: ['war', 'captives', 'japanese'], trap: true, act2: true },
  B: { vp: VIEWS.desktop, mode: 'deep', choices: { 'd-namwon-flee': 'sinpyo', 'd-nanggoya-news': 'ask', 'd-nanggoya-ship': 'board' }, learn: ['donwoo', 'ming'], trap: false, act2: false },
};
// §7-2 되살릴 것
const ITEMS = (s) => ({
  방식: s.mode, 연: s.yeon, 선택: s.choices,
  조각: s.frags, 신표: (s.tokens || []).map((t) => t.id || t),
  지식: Object.keys(s.know || {}).filter((k) => s.know[k]).sort(),
  장육불: s.jangyuk, 꿈: !!s.dreamSeen, 지혜의길: s.wisdomUsed,
  시구기록: { traps: (s.puzzle.traps || []).slice().sort(), fixes: Math.min(8, s.puzzle.fixes || 0), groped: s.puzzle.groped || 0 },
  거점기록: (s.trail || []).map((t) => [t.place, t.yeon, t.saeng]),
  수첩카드: (s.cards || []).map((c) => c.id).sort(),
  일막완료: !!s.act1Done,
});

for (const [name, P] of Object.entries(PATHS)) {
  console.log(`\n${name}) ${P.vp.label} · ${P.mode === 'deep' ? '깊이 읽기' : '처음 배우기'}`);
  // ── 1막을 실제로 논다(첫 브라우저 맥락) ──
  const A = await open(browser, P.vp, { shots: OUT, prefix: name + '_act1' });
  await fresh(A.page, BASE);
  await startGame(A.page, P.mode);
  const log = await play(A.page, { choices: P.choices, act1: 'stop', poem: solvePoem({ trap: P.trap }), onGoal: learner(P.learn) }, { shot: A.shot });
  ok(log.ok && !!log.code, `${name}: 서막부터 안남 재회까지 놀아 '1차시는 여기까지'에 닿는다` + (log.ok ? '' : ' — ' + log.why));
  const shown = log.code || '';
  const big = await A.page.evaluate(() => ({ title: (document.querySelector('.a1-title') || {}).textContent || '', fs: parseFloat(getComputedStyle(document.querySelector('.a1-ch')).fontSize), write: (document.querySelector('.a1-write') || {}).textContent || '' }));
  ok(/^[A-HJ-NP-Z2-9]{6}$/.test(shown) && !/[01OIl]/.test(shown) && big.fs >= 24 && big.title.includes('1차시는 여기까지') && big.write.includes('받아 적어'), `${name}: 화면의 글자 ${shown}(6자, 0·O·1·I·l 없음, ${big.fs}px로 크게, "받아 적어 두세요")`);
  const orig = await state(A.page);
  await A.page.screenshot({ path: path.join(OUT, `${name}_act1end.png`) });
  ok(A.errs.length === 0, `${name}: 1막 콘솔 오류 0건` + (A.errs.length ? ': ' + A.errs.slice(0, 4).join(' | ') : ''));
  await A.ctx.close();

  // ── 저장이 없는 새 맥락에서 글자 넣기 ──
  const B = await open(browser, P.vp, { shots: OUT, prefix: name + '_act2' });
  await fresh(B.page, BASE);
  ok(await B.page.evaluate(() => localStorage.length === 0 && !G.save.started()), `${name}: 새 브라우저 맥락에는 저장이 없다`);
  await B.page.click('button:has-text("이어 하기 글자 넣기")');
  await B.page.waitForSelector('.code-sheet .code-input');
  // 한 글자만 틀린 글자: 자리마다 하나씩 화면에 넣어 본다
  const ALPHA = await B.page.evaluate(() => G.code.ALPHA);
  const wrongs = [...shown].map((ch, i) => shown.slice(0, i) + ALPHA[(ALPHA.indexOf(ch) + 7 + i) % ALPHA.length] + shown.slice(i + 1));
  const refused = [];
  for (const w of wrongs) {
    await B.page.fill('.code-input', w);
    await B.page.click('.code-sheet .btn.primary');
    await B.page.waitForTimeout(150);
    const r = await B.page.evaluate(() => ({ err: (document.querySelector('.code-err') || {}).textContent || '', open: !!document.querySelector('.code-sheet'), started: G.save.started() }));
    if (r.open && r.err.includes('글자를 다시 확인해 주세요') && !r.started) refused.push(w);
  }
  ok(refused.length === 6, `${name}: 한 글자만 틀린 글자 여섯(자리마다 하나)을 모두 거절 — "글자를 다시 확인해 주세요" (${refused.join(' ')})`);
  await B.page.screenshot({ path: path.join(OUT, `${name}_code_wrong.png`) });
  // 어느 자리를 어느 글자로 바꿔도(6 × 31가지) 거절되는가
  const allBad = await B.page.evaluate((c) => { let n = 0, bad = []; for (let i = 0; i < 6; i++) for (const ch of G.code.ALPHA) { if (ch === c[i]) continue; n++; const w = c.slice(0, i) + ch + c.slice(i + 1); if (!G.code.parse(w).error) bad.push(w); } return { n, bad }; }, shown);
  ok(allBad.n === 186 && allBad.bad.length === 0, `${name}: 한 글자를 바꾼 ${allBad.n}가지가 모두 거절된다` + (allBad.bad.length ? ': ' + allBad.bad.join(' ') : ''));
  // 맞는 글자(손으로 적은 것처럼 소문자·띄어쓰기·붙임표)
  const typed = (shown.slice(0, 3) + ' - ' + shown.slice(3)).toLowerCase();
  await B.page.fill('.code-input', typed);
  await B.shot('code_typed');
  await B.page.click('.code-sheet .btn.primary');
  const restored = await B.page.waitForFunction(() => G.save.state.place === 'interlude' && !!document.querySelector('.place-card'), null, { timeout: 10000 }).then(() => true, () => false);
  ok(restored && (await B.page.textContent('.place-card')).includes('막간'), `${name}: "${typed}"를 넣으면 막간부터 이어 간다`);
  const back = await state(B.page);
  const a = ITEMS(orig), b = ITEMS(back);
  for (const k of Object.keys(a)) ok(eq(a[k], b[k]), `${name}: 되살린 ${k} = 실제로 논 ${k} (${JSON.stringify(a[k])})` + (eq(a[k], b[k]) ? '' : ' ≠ ' + JSON.stringify(b[k])));
  // 생은 막간에 들어서며 5로 돌아온다(spec §4-5). 1막 끝의 생은 거점 기록(안남)으로 되살아난다
  ok(back.saeng === 5 && (back.trail.find((t) => t.place === 'annam') || {}).saeng === orig.saeng, `${name}: 막간에서 생은 5로, 1막 끝 생 ${orig.saeng}은 안남 기록으로 남는다`);
  ok(back.resumeCode === shown, `${name}: 되살린 저장에 글자 ${back.resumeCode}가 남아 수첩에서 다시 볼 수 있다`);
  if (P.act2) {
    // 되살린 상태로 2막을 결과 화면까지
    const log2 = await play(B.page, { choices: { 'd-hangzhou-wait': 'leave', 'd-hangzhou-prep': 'prep', 'd-island-signal': 'endure' }, route: 'sea' }, { shot: B.shot });
    ok(log2.ok && log2.places[0] === 'interlude', `${name}: 되살린 1막 상태로 막간 → 항주 → 바다 → 남원 → 결과 화면` + (log2.ok ? '' : ' — ' + log2.why));
    const prepOpen = log2.dil['d-hangzhou-prep'] && log2.dil['d-hangzhou-prep'].opts.some((x) => /t-wisdom/.test(x.cls) && !x.dis);
    ok(prepOpen, `${name}: 1막에서 익힌 일본말이 되살아나 항주의 "두 나라 옷과 말"이 열린다`);
    if (log2.ok) {
      const rs = await readResult(B.page);
      const flee = (rs.rows.find((r) => r.d === 'd-namwon-flee') || {}).my || '';
      ok(!rs.none && rs.dots === 7 && flee && !flee.includes('1막 기록 없음') && rs.traps === orig.puzzle.traps.slice().sort().join() && rs.groped === String(orig.puzzle.groped), `${name}: 결과 화면에 1막 기록(궤적 일곱 점, 피란 선택 "${flee.trim()}", 함정 ${rs.traps || '없음'}, 더듬기 ${rs.groped})`);
      const dl = await saveResult(B.page, OUT, `${name}_result.png`, name);
      ok(dl.png && dl.size > 50000, `${name}: 결과 그림 저장`);
    }
  }
  ok(B.errs.length === 0, `${name}: 글자 넣기·2막 콘솔 오류 0건` + (B.errs.length ? ': ' + B.errs.slice(0, 4).join(' | ') : ''));
  await B.ctx.close();
}
await browser.close();
C.finish('tests/shots/code/');
