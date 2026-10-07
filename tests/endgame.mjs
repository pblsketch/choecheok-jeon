// 끝부분·학습 장치 점검: cd tests && node endgame.mjs
//  휴대폰 가로(844×390, 터치)와 PC(1366×860)에서
//   1차시 끝(이어 하기 글자 6자, 1막 완료 표시) → 새 브라우저에 글자 넣기(1막 상태로 막간부터) · 틀린 글자 거절 · 덮어쓰기 확인
//   안남을 떠날 때 1차시 끝 단계가 없으면 끝 화면이 저절로 뜬다
//   원작 결말 → 김영철전 → 결과 화면(단계 종류로, 그리고 이야기의 끝 걸이로)
//   결과 화면 여섯 항목 · 깊이 읽기만 디브리핑 5번·김영철전 물음 하나 더 · '7+' · ?act=2의 '1막 기록 없음'
//   이미지로 저장 → 내려받기 · 이야기 수첩(카드·조각·신표·퉁소 대신 단소 연주·선생님 안내) · 만든 사람·출처
//  거점 파일이 아직 비어 있어도 되게 규칙 점검용 거점 자료(fixtures/places.js)를 얹어서 돈다.
//  사진은 tests/shots/endgame/에 남는다(저장소에는 올리지 않는다).
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { base } from './serve.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SHOTS = path.join(HERE, 'shots', 'endgame');
fs.rmSync(SHOTS, { recursive: true, force: true });
fs.mkdirSync(SHOTS, { recursive: true });
const BASE = await base();
const FIXTURE = fs.readFileSync(path.join(HERE, 'fixtures', 'places.js'), 'utf8') + '\n;for (const k in PLACES) if (PLACES[k]) PLACES[k].id = k;';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const problems = [];
let checks = 0;
const ok = (cond, msg) => { checks++; if (!cond) problems.push(msg); console.log((cond ? '  ✓ ' : '  ✗ ') + msg); };

const VIEWS = [
  { name: 'phone', width: 844, height: 390, isMobile: true, hasTouch: true, dpr: 2 },
  { name: 'desktop', width: 1366, height: 860, dpr: 1 },
];
// 1막을 이렇게 걸었다고 치고(되풀이로 만든 상태)
const SEL = {
  mode: 'deep',
  choices: { 'd-namwon-flee': 'sinpyo', 'd-nanggoya-news': 'ask', 'd-nanggoya-ship': 'board' },
  know: { 'h-namwon-war': true, 'h-nanggoya-donwoo': true, 'h-annam-trade': true, 'k-japanese': true },
  puzzle: { groped: 2, fixes: 9, traps: ['A', 'C'] },
};

async function open(vp) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: !!vp.isMobile, hasTouch: !!vp.hasTouch, deviceScaleFactor: vp.dpr || 1, acceptDownloads: true });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  // 배경음 파일을 받다가 곡이 바뀌어 끊긴 것(ERR_ABORTED)은 오류가 아니다(화면을 빨리 옮길 때 생긴다)
  page.on('requestfailed', (r) => { const why = (r.failure() || {}).errorText || ''; if (/^blob:/.test(r.url()) || (/\/assets\/bgm\//.test(r.url()) && /ABORTED/.test(why))) return; errs.push('requestfailed: ' + r.url() + ' ' + why); });
  page.on('response', (r) => { if (r.status() >= 400) errs.push('http ' + r.status() + ': ' + r.url()); });
  const shot = async (n, el) => {
    await page.waitForFunction(() => !document.querySelector('.gettoast, .stampfx, .toast'), null, { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(450);
    const file = path.join(SHOTS, vp.name + '_' + n + '.png');
    if (el) await page.locator(el).first().screenshot({ path: file }); else await page.screenshot({ path: file });
  };
  const boot = async (clear) => {
    await page.goto(BASE);
    if (clear) { await page.evaluate(() => localStorage.clear()); await page.reload(); }
    await page.waitForSelector('.title-screen h1', { timeout: 10000 });
    await page.addScriptTag({ content: FIXTURE });
    await page.evaluate(() => document.fonts.ready);
  };
  return { ctx, page, errs, shot, boot };
}
const visible = (page, sel) => page.locator(sel).first().isVisible().catch(() => false);
const text = (page, sel) => page.locator(sel).first().textContent().catch(() => '');
const clickNext = (page) => page.click('.ev-tray .btn.primary');

for (const vp of VIEWS) {
  console.log(`\n${vp.name} ${vp.width}×${vp.height}`);
  // ───────── 1) 1차시 끝 ─────────
  const A = await open(vp);
  let page = A.page;
  await A.boot(true);
  ok(await page.evaluate(() => ['act1End', 'origEnding', 'kimyc', 'result'].every((t) => G.steps.has(t))), '단계 종류 act1End·origEnding·kimyc·result가 등록되어 있다');
  ok(await page.evaluate(() => ['notebook', 'codeEntry', 'credits', 'finish'].every((k) => typeof G.app.hooks[k] === 'function')), '걸이 notebook·codeEntry·credits·finish가 등록되어 있다');
  await page.evaluate((sel) => {
    const st = G.code.replay(sel);
    st.act1Done = false; st.done = {}; st.place = 'annam';
    Object.assign(G.save.state, st);
    G.save.write();
    window.__a1 = null;
    G.app.runSteps({ id: 'annam', steps: [{ id: 's-end', type: 'act1End' }] }).then((r) => (window.__a1 = r));
  }, SEL);
  await page.waitForSelector('.act1end');
  const a1 = await page.evaluate(() => ({
    code: document.querySelector('.act1end').dataset.code,
    chars: [...document.querySelectorAll('.a1-ch')].map((x) => x.textContent).join(''),
    done: G.save.state.act1Done, saved: G.save.state.resumeCode,
    title: document.querySelector('.a1-title').textContent, write: document.querySelector('.a1-write').textContent,
    enc: G.code.encode(G.save.state),
    annamTrail: G.save.state.trail.some((t) => t.place === 'annam'),
  }));
  ok(a1.chars.length === 6 && /^[A-Z2-9]{6}$/.test(a1.chars) && a1.chars === a1.code, `1차시 끝: 이어 하기 글자 6자를 크게 (${a1.chars})`);
  ok(a1.done === true && a1.annamTrail, 'finishAct1: 1막 완료 표시 + 안남 기록');
  ok(a1.code === a1.enc && a1.saved === a1.code, '글자는 지금 상태를 담고, 수첩에서 다시 볼 수 있게 저장된다');
  ok(a1.title.includes('1차시는 여기까지') && a1.write.includes('받아 적어 두세요'), '"1차시는 여기까지" + "받아 적어 두세요"');
  await A.shot('01_act1end');
  const parsed = await page.evaluate((c) => G.code.parse(c), a1.code);
  ok(parsed.mode === 'deep' && parsed.choices['d-nanggoya-news'] === 'ask' && parsed.puzzle.fixes === 8 && parsed.puzzle.traps.join() === 'A,C', '글자를 풀면 방식·선택·시구 기록이 그대로(고친 횟수 9 → 8로 담김)');
  await clickNext(page); // 막간으로 이어 가기
  await page.waitForFunction(() => window.__a1 === true);
  ok(true, '"막간으로 이어 가기"를 누르면 거점 진행이 이어진다');
  await A.ctx.close();

  // ───────── 2) 새 브라우저에 글자 넣기 ─────────
  const B = await open(vp);
  page = B.page;
  await B.boot(true);
  await page.click('button:has-text("이어 하기 글자 넣기")');
  await page.waitForSelector('.code-sheet .code-input');
  await B.shot('02_code_entry');
  const wrong = a1.code.slice(0, 5) + (a1.code[5] === 'A' ? 'B' : 'A');
  await page.fill('.code-input', wrong);
  await page.click('.code-sheet .btn.primary');
  await page.waitForTimeout(250);
  ok((await text(page, '.code-err')).includes('글자를 다시 확인해 주세요') && await visible(page, '.code-sheet'), `틀린 글자(${wrong})는 거절: "글자를 다시 확인해 주세요"`);
  await B.shot('03_code_wrong');
  await page.fill('.code-input', 'ab0');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(200);
  ok((await text(page, '.code-err')).includes('글자를 다시 확인해 주세요'), '짧거나 쓰지 않는 글자도 거절');
  const typed = (a1.code.slice(0, 3) + ' - ' + a1.code.slice(3)).toLowerCase();
  await page.fill('.code-input', typed);
  ok((await page.inputValue('.code-input')) !== '' , '입력 칸');
  await page.click('.code-sheet .btn.primary');
  await page.waitForFunction(() => G.save.state.place === 'interlude' && !!document.querySelector('.place-card'), null, { timeout: 8000 });
  const rs = await page.evaluate(() => { const s = G.save.state; return { mode: s.mode, ch: s.choices, know: Object.keys(s.know).sort(), pz: s.puzzle, a1: s.act1Done, trail: s.trail.map((t) => t.place), card: document.querySelector('.place-card').textContent, sheet: !!document.querySelector('.overwrite-sheet') }; });
  ok(!rs.sheet, '이 브라우저에 진행이 없으면 덮어쓰기를 묻지 않는다');
  ok(rs.a1 && rs.mode === 'deep' && rs.ch['d-namwon-flee'] === 'sinpyo' && rs.ch['d-nanggoya-news'] === 'ask' && rs.ch['d-nanggoya-ship'] === 'board', `글자(소문자·띄어쓰기·붙임표 "${typed}")로 1막 상태가 되살아난다(방식·선택)`);
  ok(rs.know.join() === ['h-annam-trade', 'h-namwon-war', 'h-nanggoya-donwoo', 'k-japanese'].join() && rs.pz.groped === 2 && rs.pz.fixes === 8 && rs.pz.traps.join() === 'A,C', '지식·시구 맞추기 기록도 되살아난다');
  ok(['start', 'namwon', 'nanggoya', 'annam'].every((p) => rs.trail.includes(p)), '거점별 기록(그래프용)도 다시 계산된다');
  ok(rs.card.includes('막간'), '막간부터 이어 간다');
  await B.shot('04_restored_interlude');
  // 덮어쓰기 확인(이제 진행이 있다)
  await page.evaluate(() => G.app.title());
  await page.waitForSelector('.title-screen h1');
  await page.evaluate(() => { G.save.state.yeon = 9; G.save.write(); });
  await page.click('button:has-text("이어 하기 글자 넣기")');
  await page.fill('.code-input', a1.code);
  await page.click('.code-sheet .btn.primary');
  await page.waitForSelector('.overwrite-sheet');
  ok((await text(page, '.overwrite-sheet')).includes('덮어쓸까요'), '진행이 있으면 덮어쓸지 한 번 묻는다');
  await B.shot('05_overwrite');
  await page.click('.overwrite-sheet .btn:not(.primary)');
  await page.waitForTimeout(200);
  ok(await page.evaluate(() => G.save.state.yeon === 9 && !!document.querySelector('.title-screen')), '그만두면 진행이 그대로');
  await page.click('button:has-text("이어 하기 글자 넣기")');
  await page.fill('.code-input', a1.code);
  await page.click('.code-sheet .btn.primary');
  await page.waitForSelector('.overwrite-sheet');
  await page.click('.overwrite-sheet .btn.primary');
  await page.waitForFunction(() => G.save.state.place === 'interlude' && G.save.state.act1Done && G.save.state.yeon !== 9, null, { timeout: 8000 });
  ok(true, '덮어쓰기를 고르면 글자의 1막 상태로 바뀐다');
  // 안남에 1차시 끝 단계가 없을 때: 안남을 떠나면 끝 화면이 저절로 → 타이틀로 → 이어 하기는 막간부터
  await page.evaluate(() => { G.save.reset(); const st = G.save.state; st.mode = 'basic'; st.place = 'annam'; st.done['p:annam'] = true; G.save.write(); G.app.next('annam'); });
  await page.waitForSelector('.act1end');
  ok(await page.evaluate(() => G.save.state.act1Done === true), '안남을 떠날 때 1차시 끝 화면이 저절로 뜬다(1막 완료 표시)');
  await page.click('.ev-tray .btn:has-text("타이틀로")');
  await page.waitForSelector('.title-screen h1');
  await page.click('button:has-text("이어 하기")');
  await page.waitForFunction(() => G.save.state.place === 'interlude' && !!document.querySelector('.place-card'), null, { timeout: 8000 });
  ok(true, '타이틀의 "이어 하기"는 막간부터');
  B.errs.forEach((e) => problems.push(`[${vp.name}] ${e}`));
  A.errs.forEach((e) => problems.push(`[${vp.name}] ${e}`));
  ok(A.errs.length + B.errs.length === 0, '오류·실패한 요청 없음(1차시 끝·글자 넣기)' + (A.errs.length + B.errs.length ? ': ' + A.errs.concat(B.errs).join(' | ') : ''));
  await B.ctx.close();

  // ───────── 3) 원작 결말 → 김영철전 → 결과 화면(깊이 읽기, 단계 종류로) ─────────
  const C = await open(vp);
  page = C.page;
  await C.boot(true);
  await page.evaluate((sel) => {
    const st = G.code.replay(sel);
    Object.assign(G.save.state, st);
    const s = G.save.state;
    s.teacher = false; s.name = '';
    s.choices['d-hangzhou-wait'] = 'leave'; s.choices['d-hangzhou-prep'] = 'prep'; s.choices['d-sea-route'] = 'coast'; s.choices['d-island-signal'] = 'signal';
    s.trail.push({ place: 'hangzhou', label: '항주', yeon: 7, saeng: 6 }, { place: 'sea', label: '바다', yeon: 8, saeng: 3 });
    G.rules.test.set({ yeon: 8, saeng: 4, jangyuk: 9, ending: null, tokens: [{ id: 'sinpyo', name: '옥가락지', desc: '남원에서 챙긴 신표' }], frags: { 1: '王子吹簫月欲低', 2: '碧天如海露凄凄', 4: '蓬島煙霞路不迷' } });
    s.place = 'namwon_final'; s.flags = {};
    for (const p of ['interlude', 'hangzhou', 'sea']) s.done['p:' + p] = true;
    G.save.write();
    G.app.runSteps({ id: 'namwon_final', steps: [{ id: 'e1', type: 'origEnding' }, { id: 'e2', type: 'kimyc' }, { id: 'e3', type: 'result' }] });
  }, SEL);
  await page.waitForSelector('.orig-end');
  const oe = await page.evaluate(() => ({ mine: document.querySelector('.oe-mine').textContent, orig: document.querySelector('.oe-orig').textContent, chips: [...document.querySelectorAll('.oe-orig .rchip')].map((x) => x.textContent), ending: G.save.state.ending }));
  ok(oe.ending === 'weary' && oe.mine.includes('지친 귀향'), `결말이 정해지고(연 8·생 4 → ${oe.ending}) 내 결말이 보인다`);
  ok(oe.orig.includes('潔齋修享') && oe.orig.includes('장육불') && oe.chips.includes('원문') && oe.chips.includes('풀이') && oe.chips.includes('이본 노트'), '원작 결말: 긴 원문(潔齋修享) + 풀이 + 이본 노트(깊이 읽기)');
  await C.shot('06_orig_ending');
  await clickNext(page);
  await page.waitForSelector('.ky-read');
  const ky1 = await text(page, '.ky-read');
  ok(ky1.includes('首丘') && ky1.includes('한국고전종합DB') && ky1.includes('짐승도 죽을 때는'), '김영철전: 원문 + 자체 풀이 + 출처 줄');
  await C.shot('07_kimyc_read');
  await clickNext(page);
  await page.waitForSelector('.ky-find');
  await page.click('.ky-item[data-id="war"]');
  await page.click('.ky-item[data-id="home"]');
  ok(await page.evaluate(() => document.querySelectorAll('.ky-item.on').length === 2 && G.save.state.kimyc.join() === 'war,home' && !document.querySelector('.ky-find .feedback')), '찾기 활동: 여러 개 고를 수 있고 채점하지 않는다');
  await C.shot('08_kimyc_find');
  await clickNext(page);
  await page.waitForSelector('.ky-deep');
  ok((await text(page, '.ky-deep')).includes('妻子無負於我'), '깊이 읽기: 김영철전 물음 하나 더');
  await C.shot('09_kimyc_deep');
  await clickNext(page);
  await page.waitForSelector('.rs-sheet');
  const res = await page.evaluate(() => ({
    items: [...document.querySelectorAll('.rs-sec[data-item]')].map((x) => x.dataset.item).join(),
    charts: document.querySelectorAll('.rs-chart').length,
    origLines: document.querySelectorAll('.rs-chart polyline[stroke="#7a4a9c"]').length,
    dashed: document.querySelectorAll('.rs-chart polyline[stroke="#7a4a9c"][stroke-dasharray]').length,
    interp: [...document.querySelectorAll('.rs-chart text')].some((t) => t.textContent === '해석'),
    rows: document.querySelectorAll('.rs-table tbody tr').length,
    route: (document.querySelector('.rs-table tr[data-dilemma="d-sea-route"] .og') || {}).textContent || '',
    inv: (document.querySelector('.rs-table tr[data-dilemma="d-namwon-flee"] .og') || {}).textContent || '',
    ship: (document.querySelector('.rs-table tr[data-dilemma="d-nanggoya-ship"]') || {}).textContent || '',
    ending: document.querySelector('.rs-sec.ending').textContent,
    dream: document.querySelector('.rs-dream b').textContent,
    fixes: document.querySelector('.rs-count[data-count="fixes"] b').textContent,
    groped: document.querySelector('.rs-count[data-count="groped"] b').textContent,
    traps: [...document.querySelectorAll('.rs-trap.placed')].map((x) => x.dataset.trap).join(),
    debrief: document.querySelectorAll('.rs-debrief li').length,
    answer: document.querySelectorAll('.rs-debrief textarea, .rs-debrief input').length,
    name: !!document.querySelector('.rs-name-in'),
    save: !!document.querySelector('.rs-save-btn'), keys: document.querySelectorAll('.rs-keys li').length,
    done: G.save.state.done['p:namwon_final'] && !!G.save.state.finishedAt,
    trailFinal: G.save.state.trail.some((t) => t.place === 'namwon_final'),
  }));
  ok(res.items === '1,2,3,4,5,6', `결과 화면 여섯 항목(${res.items})`);
  ok(res.charts === 2 && res.origLines > 0 && res.dashed > 0 && res.interp, '1) 연·생 그래프 + 원작 궤적(원작에 없는 장면은 점선, \'해석\' 표시)');
  ok(res.trailFinal, '남원 재회 구간이 기록된다');
  ok(res.ending.includes('지친 귀향') && res.ending.includes('장육불께 공양'), '2) 내 결말 + 원작 결말 한 줄');
  ok(res.dream === '7+', `3) 장육불 꿈 횟수(9번 → "${res.dream}")`);
  ok(res.rows === 7 && res.inv.includes('원작에 없는 장면') && res.route.includes('곧장 바다를 건넜다') && res.ship.includes('배에 오른다') && res.ship.includes('같음'), '4) 선택 비교표: 딜레마 일곱, 원작에 없는 장면·항로 덧붙임·같음/다름');
  ok(res.traps === 'A,C' && res.fixes === '7+' && res.groped === '2', `5) 시구 맞추기 기록: 함정 ${res.traps}, 고친 횟수 "${res.fixes}", 더듬어 찾기 ${res.groped}`);
  ok(res.save && res.keys === 4 && res.name, '6) 이미지로 저장 + 기기별 캡처 안내 + 이름 칸');
  ok(res.debrief === 5 && res.answer === 0, '깊이 읽기: 디브리핑 질문 5개(답 칸 없음)');
  ok(res.done, '이야기 끝 표시(거점 끝·끝낸 때)');
  await page.fill('.rs-name-in', '2학년 3반 12번 김지은');
  await page.waitForTimeout(1800); // 完 도장이 사라질 때까지
  await C.shot('10_result');
  await page.evaluate(() => document.querySelector('.rs-debrief').scrollIntoView());
  await C.shot('12_result_debrief');
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 15000 }), page.click('.rs-save-btn')]);
  const fname = dl.suggestedFilename();
  const out = path.join(SHOTS, vp.name + '_13_saved.png');
  await dl.saveAs(out);
  const size = fs.statSync(out).size;
  const head = fs.readFileSync(out).subarray(0, 8).toString('hex');
  ok(/^두개의항로_.*김지은.*\.png$/.test(fname) && head === '89504e470d0a1a0a' && size > 50000, `이미지로 저장 → 내려받기(${fname}, ${Math.round(size / 1024)}KB)`);
  ok(await page.evaluate(() => G.save.state.name === '2학년 3반 12번 김지은'), '적은 이름이 저장된다');
  // 이어 하기 → 결과 화면으로 바로
  await page.evaluate(() => G.app.title());
  await page.waitForSelector('.title-screen h1');
  await page.click('button:has-text("이어 하기")');
  await page.waitForSelector('.rs-sheet', { timeout: 8000 });
  ok(await page.evaluate(() => !document.querySelector('.orig-end')), '끝낸 뒤 "이어 하기"는 결과 화면으로(본 화면은 다시 보이지 않는다)');

  // ───────── 4) 이야기 수첩 ─────────
  await page.evaluate(() => {
    const st = G.save.state;
    st.cards = [{ id: 'd-namwon-flee', kind: 'fiction', place: 'namwon', step: 's-flee' }, { id: 'd-nanggoya-ship', kind: 'orig', place: 'nanggoya', step: 's-ship' }, { id: 'h-namwon-war', kind: 'history', place: 'namwon', step: 's-war' }, { id: 'h-nanggoya-donwoo', kind: 'history', place: 'nanggoya', step: 's-donwoo' }];
    G.save.write();
    Object.defineProperty(G.audio.tongso, 'instrument', { get: () => '단소', configurable: true });
    G.app.openHook('notebook');
  });
  await page.waitForSelector('.notebook-sheet .pocket-view');
  const nb = await page.evaluate(() => ({ t: document.querySelector('.notebook-sheet').textContent, frags: document.querySelectorAll('.notebook-sheet .frag.got').length, tok: document.querySelectorAll('.notebook-sheet .token').length }));
  ok(nb.tok === 1 && nb.t.includes('옥가락지') && nb.frags === 3, '수첩: 챙긴 신표와 얻은 시구 조각');
  ok(nb.t.includes('퉁소 대신 단소 연주'), '수첩: 퉁소 대신 다른 악기면 "퉁소 대신 단소 연주"라고 밝힌다');
  await C.shot('14_notebook_pocket');
  await page.click('.nb-tab[data-tab="orig"]');
  const nbo = await page.evaluate(() => ({ n: document.querySelectorAll('.nb-item').length, open: document.querySelectorAll('.nb-item:not(.locked)').length, detail: document.querySelector('.nb-detail').textContent }));
  ok(nbo.n === 7 && nbo.open === 2 && nbo.detail.includes('원작에는 없는 장면'), `수첩: 원작 대조 카드(모은 ${nbo.open}장 / 일곱 자리, 원작·게임 창작 구분)`);
  await page.click('.nb-item.orig');
  ok((await text(page, '.nb-detail')).includes('원작의 옥영'), '수첩: 카드를 고르면 펼친다(내 선택과 원작의 선택)');
  await C.shot('15_notebook_orig');
  await page.click('.nb-tab[data-tab="history"]');
  const nbh = await page.evaluate(() => ({ n: document.querySelectorAll('.nb-item').length, open: document.querySelectorAll('.nb-item:not(.locked)').length, d: document.querySelector('.nb-detail').textContent }));
  ok(nbh.n === 7 && nbh.open === 2 && nbh.d.includes('[12문학01-04] 연결') && !nbh.d.includes('선생님 검수'), '수첩: 역사 카드 일곱 자리, [12문학01-04] 연결 줄(학생에게 검수 표시는 숨김)');
  await C.shot('16_notebook_history');
  await page.click('.nb-tab[data-tab="fiction"]');
  ok(await page.evaluate(() => document.querySelectorAll('.nb-fic').length >= 5), '수첩: 게임 설정 카드');
  await C.shot('17_notebook_fiction');
  await page.click('.nb-tab[data-tab="marks"]');
  ok(await page.evaluate(() => ['원문', '풀이', '게임 설정', '이본 노트', '해석'].every((k) => [...document.querySelectorAll('.nb-mark .rchip')].some((x) => x.textContent === k))), '수첩: 표기 체계 다섯 구분');
  ok(!(await visible(page, '.nb-tab[data-tab="teacher"]')), '학생에게는 선생님 안내 탭이 없다');
  await page.click('.notebook-sheet .actions .btn.primary');
  await page.evaluate(() => { G.save.state.teacher = true; G.save.write(); G.app.applySettings(); G.app.openHook('notebook', 'history'); });
  await page.waitForSelector('.notebook-sheet .nb-item');
  const nbt = await page.evaluate(() => ({ locked: document.querySelectorAll('.nb-item.locked').length, review: !!document.querySelector('.nb-review'), tab: !!document.querySelector('.nb-tab[data-tab="teacher"]') }));
  ok(nbt.locked === 0 && nbt.review && nbt.tab, '선생님용: 모든 카드가 열리고, 역사 카드에 ⚠ 검수 거리, 선생님 안내 탭');
  await C.shot('18_notebook_teacher_history');
  await page.click('.nb-tab[data-tab="teacher"]');
  const tn = await text(page, '.nb-body');
  ok(tn.includes('1차시') && tn.includes('2차시') && tn.includes('디브리핑') && tn.includes('오디세이아'), '선생님 안내: 수업 시점·시간·디브리핑 질문');
  await C.shot('19_notebook_teacher');
  await page.click('.notebook-sheet .actions .btn.primary');
  await page.evaluate(() => { G.app.openHook('credits'); });
  await page.waitForSelector('.credits-sheet');
  ok((await text(page, '.credits-sheet')).includes('만든이 박준일'), '만든 사람·출처: 출처 목록이 비어 있어도 만든이 줄과 원문 출처');
  await C.shot('20_credits');
  await page.click('.credits-sheet .actions .btn.primary');
  C.errs.forEach((e) => problems.push(`[${vp.name}] ${e}`));
  ok(C.errs.length === 0, '오류·실패한 요청 없음(끝부분·수첩)' + (C.errs.length ? ': ' + C.errs.join(' | ') : ''));
  await C.ctx.close();

  // ───────── 5) 처음 배우기 + ?act=2, 이야기의 끝 걸이로 ─────────
  const D = await open(vp);
  page = D.page;
  await page.goto(BASE + '?act=2');
  await page.waitForSelector('.place-card', { timeout: 10000 });
  await page.addScriptTag({ content: FIXTURE });
  await page.evaluate(() => {
    const s = G.save.state;
    s.mode = 'basic';
    s.choices['d-hangzhou-wait'] = 'wait'; s.choices['d-hangzhou-prep'] = 'rush';
    s.trail.push({ place: 'hangzhou', label: '항주', yeon: 3, saeng: 7 }, { place: 'sea', label: '바다', yeon: 4, saeng: 7 });
    G.rules.test.set({ yeon: 4, saeng: 7, jangyuk: 0 });
    s.place = 'namwon_final';
    for (const p of ['interlude', 'hangzhou', 'sea', 'namwon_final']) s.done['p:' + p] = true;
    G.save.write();
    G.app.finish();
  });
  await page.waitForSelector('.orig-end');
  const oeb = await page.evaluate(() => ({ t: document.querySelector('.oe-orig').textContent, e: G.save.state.ending }));
  ok(oeb.e === 'strange' && !oeb.t.includes('吾等之得有今日') && oeb.t.includes('한 길 여섯 자'), '이야기의 끝 걸이: 원작 결말(처음 배우기: 짧은 원문 + 풀이 덧붙임)');
  await D.shot('21_orig_ending_basic');
  await clickNext(page);
  await page.waitForSelector('.ky-read');
  await clickNext(page);
  await page.waitForSelector('.ky-find');
  ok((await text(page, '.ev-tray .btn.primary')).includes('결과 보기'), '처음 배우기: 김영철전 물음 하나 더는 없다');
  await clickNext(page);
  await page.waitForSelector('.rs-sheet');
  const rb = await page.evaluate(() => ({
    debrief: document.querySelectorAll('.rs-debrief li').length,
    none: [...document.querySelectorAll('.rs-chart text')].some((t) => t.textContent === '1막 기록 없음'),
    pz: (document.querySelector('.rs-sec.puzzle') || {}).textContent || '',
    flee: (document.querySelector('.rs-table tr[data-dilemma="d-namwon-flee"] .my') || {}).textContent || '',
    prep: (document.querySelector('.rs-table tr[data-dilemma="d-hangzhou-prep"]') || {}).textContent || '',
    mineDots: document.querySelectorAll('.rs-chart.yeon g.pt circle').length,
  }));
  ok(rb.debrief === 4, '처음 배우기: 디브리핑 질문 1~4(5번은 깊이 읽기만)');
  ok(rb.none && rb.pz.includes('1막 기록 없음') && rb.flee.includes('1막 기록 없음'), "?act=2: 그래프·시구 기록·1막 선택에 '1막 기록 없음'");
  ok(rb.mineDots === 3 && rb.prep.includes('준비 없이 서두른다') && rb.prep.includes('다름'), '?act=2: 내 궤적은 항주부터, 선택이 원작과 다르면 "다름"');
  await D.shot('22_result_act2_basic');
  const [dl2] = await Promise.all([page.waitForEvent('download', { timeout: 15000 }), page.click('.rs-save-btn')]);
  await dl2.saveAs(path.join(SHOTS, vp.name + '_23_saved_act2.png'));
  ok(/\.png$/.test(dl2.suggestedFilename()), '이름이 없어도 저장된다(' + dl2.suggestedFilename() + ')');
  D.errs.forEach((e) => problems.push(`[${vp.name}] ${e}`));
  ok(D.errs.length === 0, '오류·실패한 요청 없음(처음 배우기·?act=2)' + (D.errs.length ? ': ' + D.errs.join(' | ') : ''));
  await D.ctx.close();
}

await browser.close();
console.log(`\n점검 ${checks}개 · 문제 ${problems.length}개 · 화면 사진: tests/shots/endgame/`);
for (const p of problems) console.log(' - ' + p);
process.exit(problems.length ? 1 : 0);
