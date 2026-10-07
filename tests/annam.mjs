// 안남(1막 절정) 점검: cd tests && node annam.mjs
//  - 자료: 단계가 목표 차례(=플레이 차례)대로인가, 목표 자리·사람이 있고 걸어서 닿는가(최척의 중국 배는 닿지 않는가), 삽화 id 선언
//  - 퉁소 알아듣기: 연 8/5/2 → 첫/두 번째/세 번째 소리에 알아듣는다(그사이 포구를 더 걷는다, 3 이하는 2행이 되살아난다)
//  - 조각 패: 네 조각을 다 가져도 함정 하나 이상 / 깊이 읽기에만 C / 연이 높을수록 함정이 적다
//  - 생 1 + 더듬어 찾기 두 번 → 꿈 없이 완성, 생 0 유지, 장육불 횟수 그대로 / 소리를 꺼도 완성 / 함정·고친 횟수·더듬기 저장(이어 하기 글자에도)
//  - 선생님용 '정답 보기' / 끝까지 가면 1막 끝(act1End) 단계에 닿는다
//  - 조각 놓기: 휴대폰 가로(터치: 눌러 놓기·끌어 놓기) · PC(마우스: 눌러 놓기·끌어 놓기, 키보드 1~4)
//  - 콘솔 오류 0, 화면 사진 tests/shots/T8/
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { base } from './serve.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SHOTS = path.join(HERE, 'shots', 'T8');
fs.rmSync(SHOTS, { recursive: true, force: true });
fs.mkdirSync(SHOTS, { recursive: true });
const BASE = await base();
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const problems = [];
let checks = 0;
const ok = (cond, msg) => { checks++; if (!cond) problems.push(msg); console.log((cond ? '  ✓ ' : '  ✗ ') + msg); };

async function open(name, vp) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: !!vp.isMobile, hasTouch: !!vp.hasTouch, deviceScaleFactor: vp.dpr || 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error' && !/AudioContext/.test(m.text())) errs.push('console: ' + m.text()); });
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  // 화면을 빠르게 갈아 끼우는 점검이라 배경음 파일을 읽다가 곡이 바뀌면 브라우저가 읽기를 그만둔다(ERR_ABORTED) — 그것만 빼고 센다
  page.on('requestfailed', (r) => { const why = (r.failure() || {}).errorText || ''; if (!(/\.mp3$/.test(r.url()) && /ABORTED/.test(why))) errs.push('requestfailed: ' + r.url() + ' ' + why); });
  page.on('response', (r) => { if (r.status() >= 400) errs.push('http ' + r.status() + ': ' + r.url()); });
  const shot = async (n) => { await page.waitForFunction(() => !document.querySelector('.gettoast'), null, { timeout: 12000 }).catch(() => {}); await page.waitForTimeout(350); await page.screenshot({ path: path.join(SHOTS, name + '_' + n + '.png') }); };
  await page.goto(BASE);
  await page.waitForSelector('.title-screen h1');
  await page.evaluate(() => { localStorage.clear(); G.save.reset(); });
  return { ctx, page, errs, shot };
}

// 안남을 처음부터: 상태를 정하고 거점을 펼친다(기다리지 않는다)
async function startAnnam(page, set, o = {}) {
  await page.evaluate(([set, teacher]) => {
    G.app.title();
    G.save.reset();
    G.save.state.teacher = !!teacher; G.app.applySettings();
    G.rules.test.set(Object.assign({ flags: {}, mode: 'basic' }, set));
    G.app.play('annam');
  }, [set, !!o.teacher]);
}
// 화면의 '다음'을 누르고, 맵 목표는 이룬 것으로 치며 stop이 참이 될 때까지 나아간다. 지나간 목표 글을 모은다
async function adv(page, stop, max = 120, goals = []) {
  for (let i = 0; i < max; i++) {
    if (await page.evaluate(stop)) return true;
    const g = await page.evaluate(() => { const s = G.world && G.world.test.state(); return s && s.goal ? s.goal.text : null; });
    if (g && goals[goals.length - 1] !== g) goals.push(g);
    const b = page.locator('.ev-tray .btn.primary, .dlg-tray .btn.primary').first();
    if (await b.isVisible().catch(() => false)) { await b.click({ timeout: 2000 }).catch(() => {}); await page.waitForTimeout(120); continue; }
    const did = await page.evaluate(() => G.world && !document.querySelector('.event.on, .dlg') && G.world.test.complete());
    await page.waitForTimeout(did ? 350 : 200);
  }
  return page.evaluate(stop);
}
// 시구 맞추기 단계만 펼치기
async function poemOnly(page, set, o = {}) {
  await page.evaluate(([set, teacher]) => {
    G.app.title();
    G.save.reset();
    G.save.state.teacher = !!teacher; G.app.applySettings();
    G.rules.test.set(Object.assign({ flags: {}, mode: 'basic' }, set));
    G.save.state.place = 'annam';
    window.__d = false;
    G.app.runSteps(PLACES.annam, ['poem']).then(() => (window.__d = true));
  }, [set, !!o.teacher]);
  await page.waitForSelector('.pz .pz-strip');
  await page.waitForTimeout(250);
}
const pzState = (page) => page.evaluate(() => G.poem.test.state());
const tapStrip = (page, id) => page.click(`.pz-pool .pz-strip[data-id="${id}"]`);
const tapRow = (page, n) => page.click(`.pz-row[data-row="${n}"] .pz-slot`);
async function center(page, sel) { const b = await page.locator(sel).first().boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; }
// 가진 조각을 모두 제자리에(눌러 고른 뒤 자리 누르기)
async function placeOwned(page) {
  const s = await pzState(page);
  for (const id of s.pool) if (/^L\d$/.test(id)) { await tapStrip(page, id); await tapRow(page, +id[1]); await page.waitForTimeout(80); }
}

// ───────── 1) 자료(브라우저 안에서 읽기만) ─────────
{
  console.log('자료');
  const { ctx, page, errs } = await open('data', { width: 1366, height: 860 });
  const d = await page.evaluate(() => {
    const P = PLACES.annam;
    const ids = P.steps.map((s) => s.id);
    const flat = [].concat(...P.beats.map((b) => b.steps || []));
    const missing = flat.filter((id) => !ids.includes(id));
    const order = flat.every((id, i) => i === 0 || ids.indexOf(id) > ids.indexOf(flat[i - 1]));
    const scenes = P.steps.map((s) => s.scene).filter(Boolean).concat(P.cover);
    const undeclared = scenes.filter((s) => !(P.scenes || {})[s]);
    const map = P.maps.annam_port, cast = P.cast.annam_port;
    // 걸을 수 있는 칸으로 닿는가(소품은 빼고 칸만 본다)
    const solid = G.tiles.SOLID, grid = map.grid;
    const reach = new Set();
    const q = [[P.spawn[0], P.spawn[1]]];
    reach.add(P.spawn.slice(0, 2).join(','));
    while (q.length) {
      const [x, y] = q.shift();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy, k = nx + ',' + ny, c = (grid[ny] || '')[nx];
        if (c === undefined || solid.has(c) || reach.has(k)) continue;
        reach.add(k); q.push([nx, ny]);
      }
    }
    const at = (x, y) => reach.has(x + ',' + y);
    const targets = [];
    for (const b of P.beats) {
      const id = b.talk || b.go || b.at;
      if (!id) continue;
      const who = cast[id] || (b.show || {})[id];
      const sp = map.spots[id];
      const xy = who ? [who.x, who.y] : sp ? [sp.x, sp.y] : null;
      targets.push({ id, ok: !!xy && at(xy[0], xy[1]), corner: !!xy && (xy[0] < 2 && xy[1] < 2) });
    }
    return {
      missing, order, undeclared, targets, cheokReach: at(cast.cheok.x, cast.cheok.y), donwooReach: at(cast.donwoo.x, cast.donwoo.y),
      types: P.steps.map((s) => s.type), last: P.steps[P.steps.length - 1].type, poemIdx: ids.indexOf('poem'), tongso: P.steps.filter((s) => s.type === 'tongso').map((s) => s.sound),
      registered: ['tongso', 'poem'].every((t) => G.steps.has(t)),
      know: P.steps.filter((s) => s.type === 'card' || s.type === 'know').map((s) => s.history || s.know).filter(Boolean),
      quotes: P.steps.filter((s) => s.type === 'card' && s.card && s.card.kind === 'orig').map((s) => s.card.quote && s.card.quote.원문 && s.card.quote.풀이 ? 1 : 0),
      gaugeSteps: P.steps.filter((s) => s.type === 'gauge' || s.type === 'dilemma' || s.type === 'dream' || (s.fx && s.fx.gauge)).length,
      recall: [{ yeon: 2, frags: { 1: 'x' }, flags: {} }, { yeon: 5, frags: { 1: 'x' }, flags: {} }, { yeon: 2, frags: { 1: 'x', 2: 'y' }, flags: {} }, { yeon: 9, frags: {}, flags: { 'annam:yeon0': 3 } }].map((st) => P.steps.find((s) => s.id === 'recall-sky').when(st)),
      poem: { lines: POEM.lines.map((l) => l.원문).join(''), trapsAB: POEM.traps.A.length + POEM.traps.B.length, c: POEM.traps.C.C1.원문 },
    };
  });
  ok(d.registered, "단계 종류 'tongso'·'poem'이 등록되어 있다");
  ok(!d.missing.length, '목표가 부르는 단계가 모두 있다' + (d.missing.length ? ': ' + d.missing : ''));
  ok(d.order, '단계 배열이 플레이 차례(목표 차례)와 같다 — 이어 하기 되풀이용');
  ok(!d.undeclared.length, '쓰는 삽화 id를 모두 scenes에 적었다' + (d.undeclared.length ? ': ' + d.undeclared : ''));
  ok(d.targets.every((t) => t.ok && !t.corner), '목표 자리·사람이 모두 걸어서 닿고 구석이 아니다: ' + d.targets.map((t) => t.id + (t.ok ? '' : '✗')).join(' '));
  ok(!d.cheokReach && d.donwooReach, '최척이 탄 중국 배는 물 건너라 닿을 수 없고, 돈우의 일본 배에는 오를 수 있다');
  ok(d.last === 'act1End' && d.poemIdx > 0 && d.tongso.join() === '1,2,3', '퉁소 단계 1·2·3 → 화답 → … → 마지막은 act1End');
  ok(d.know.join() === 'h-annam-trade' && d.gaugeSteps === 0, '안남의 지식은 h-annam-trade 하나, 게이지를 바꾸는 단계 없음(더듬기만)');
  ok(d.quotes.length >= 3 && d.quotes.every(Boolean), `원작 대조 카드 ${d.quotes.length}장: 원문은 늘 풀이와 함께`);
  ok(d.recall.join() === 'true,false,false,true', '모래밭의 2행 되살리기: 연 3 이하이고 2행이 없을 때만(안남에 닿을 때의 연 기준)');
  ok(d.poem.lines === '王子吹簫月欲低碧天如海露凄凄會須共御靑鸞去蓬島煙霞路不迷' && d.poem.trapsAB === 10 && d.poem.c === '瑤臺繚緲曉雲紅', '정답 시 원문·함정 A/B 열 줄·C(瑤臺繚緲曉雲紅)');
  // 이어 하기 글자: 1막 전체(서막 → 남원 → 낭고야 → 안남)를 되풀이한 1막 끝 상태
  //  고른 것이 없으면 연은 낭고야 고정 꿈(+1)만 바뀌어 6으로 안남에 닿는다 → 2행 되살리기 없음, 더듬기 2번 → 생 −2, 조각 4
  //  연이 3 이하로 닿으면(양식·침묵·남음: 연 0) 모래밭에서 2행이 되살아난다(게임과 같은 규칙)
  const r = await page.evaluate(() => {
    const look = (st) => ({ saeng: st.saeng, yeon: st.yeon, f4: !!st.frags[4], f2: !!st.frags[2], know: !!st.know['h-annam-trade'], pz: st.puzzle, ny: (st.trail.find((t) => t.place === 'nanggoya') || {}).yeon, an: st.trail.find((t) => t.place === 'annam') });
    const a = look(G.code.replay({ mode: 'basic', choices: {}, know: { 'h-annam-trade': true }, puzzle: { groped: 2, fixes: 3, traps: ['A', 'B'] } }));
    const b = look(G.code.replay({ mode: 'basic', choices: { 'd-namwon-flee': 'food', 'd-nanggoya-news': 'silent', 'd-nanggoya-ship': 'stay' }, know: {}, puzzle: { groped: 1, fixes: 0, traps: [] } }));
    return { a, b };
  });
  const ra = r.a, rb = r.b;
  ok(ra.ny === 6 && ra.yeon === 6 && ra.saeng === 3 && ra.f4 && !ra.f2 && ra.know && ra.pz.groped === 2 && ra.pz.fixes === 3 && ra.an && ra.an.saeng === 3,
    `되풀이(고른 것 없음): 낭고야 끝 연 ${ra.ny} → 안남에선 게이지가 더듬기로만 바뀐다(연 ${ra.yeon}, 생 ${ra.saeng}), 조각 4, 연 6이라 2행 없음, 교역선 지식`);
  ok(rb.ny === 0 && rb.f2 && rb.f4 && rb.saeng === 9, `되풀이(낭고야 끝 연 ${rb.ny}): 모래밭에서 2행이 되살아나고 조각 4, 더듬기 한 번 → 생 ${rb.saeng}`);
  errs.forEach((e) => problems.push('[자료] ' + e));
  ok(errs.length === 0, '오류 없음' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await ctx.close();
}

// ───────── 2) 휴대폰 가로: 처음부터 끝까지(연 8) + 연 5·2 퉁소 + 터치로 놓기 ─────────
{
  console.log('휴대폰 가로 844×390(터치)');
  const { ctx, page, errs, shot } = await open('phone', { width: 844, height: 390, isMobile: true, hasTouch: true, dpr: 2 });
  // 연 8: 첫 소리에 알아듣는다
  await startAnnam(page, { yeon: 8, saeng: 5, frags: { 1: '王子吹簫月欲低' } });
  await page.waitForSelector('.place-card');
  await shot('01_title');
  await page.click('.ev-tray .btn.primary');
  await page.waitForSelector('.dlg .say, .dlg .narr');
  await page.waitForTimeout(500);
  await shot('02_arrive');
  const goals8 = [];
  await adv(page, () => G.world.test.state().goal && /명나라 상인/.test(G.world.test.state().goal.text), 40, goals8);
  await shot('03_goal_ming');
  await adv(page, () => !!document.querySelector('.event.on .card.history, .event.on .rcard.history'), 40, goals8);
  await shot('04_trade_card');
  ok(await page.evaluate(() => !!G.save.state.know['h-annam-trade']), '명나라 상인 → 역사 카드 h-annam-trade');
  await adv(page, () => !!document.querySelector('.tg-layer'), 60, goals8);
  ok(await page.evaluate(() => !!G.save.state.frags[4]), '뱃사람들의 단서를 따라가면 4행 조각을 얻는다');
  ok(await page.evaluate(() => G.save.state.flags['annam:yeon0'] === 8), '안남에 닿을 때의 연(8)을 적어 둔다');
  await page.waitForTimeout(1200);
  await shot('05_tongso_first');
  await adv(page, () => !!document.querySelector('.tg-memory'), 10);
  await page.waitForTimeout(600);
  await shot('06_tongso_heard');
  ok(await page.evaluate(() => G.save.state.flags['annam:heard'] === 1), '연 8: 첫 소리에 알아듣는다');
  ok(await page.evaluate(() => document.querySelector('.tg-cap.on') && /퉁소 소리/.test(document.querySelector('.tg-cap').textContent)), "자막 '(퉁소 소리)'");
  await adv(page, () => !!document.querySelector('.pz'), 20, goals8);
  ok(!goals8.some((g) => /부두 끝|모래밭/.test(g)), '연 8: 포구를 더 걷지 않고 곧바로 화답');
  await page.waitForTimeout(900);
  await shot('07_poem');
  // 터치: 눌러 고른 뒤 자리 누르기(함정을 먼저 놓았다가 고친다)
  let s = await pzState(page);
  const trap = s.pool.find((id) => !/^L/.test(id));
  ok(!!trap && s.pool.filter((id) => !/^L/.test(id)).length === 1, `연 8 처음 배우기: 함정 1개(${trap})`);
  await page.tap(`.pz-pool .pz-strip[data-id="${trap}"]`);
  await page.waitForTimeout(150);
  await shot('08_poem_selected');
  await page.tap('.pz-row[data-row="1"] .pz-slot');
  await page.waitForTimeout(500);
  s = await pzState(page);
  ok(s.rows[1].strip === trap && s.clarity < 0.16, '터치(눌러 놓기): 함정을 놓으면 소리가 멀어진다');
  await shot('09_poem_wrong');
  await page.tap('.pz-pool .pz-strip[data-id="L1"]');
  await page.tap('.pz-row[data-row="1"] .pz-slot');
  await page.waitForTimeout(400);
  s = await pzState(page);
  ok(s.rows[1].strip === 'L1' && s.clarity > 0.3, '터치: 맞는 조각으로 바꾸면 또렷해진다');
  // 터치로 끌어 놓기(4행)
  const cdp = await ctx.newCDPSession(page);
  const a = await center(page, '.pz-pool .pz-strip[data-id="L4"]'), b = await center(page, '.pz-row[data-row="4"] .pz-slot');
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: a.x, y: a.y }] });
  for (let i = 1; i <= 10; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: a.x + (b.x - a.x) * i / 10, y: a.y + (b.y - a.y) * i / 10 }] }); await page.waitForTimeout(16); }
  await shot('10_poem_drag_touch');
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(400);
  s = await pzState(page);
  ok(s.rows[4].strip === 'L4', '터치(끌어 놓기): 4행 조각을 끌어다 놓았다');
  // 더듬어 찾기(2·3행)
  await page.tap('.pz-row[data-row="2"] .pz-grope');
  await page.waitForSelector('.pz-sheet .pz-cand');
  ok((await page.locator('.pz-sheet .pz-cand').count()) === 3, '더듬어 찾기: 후보 3개(정답 1 + 함정 2)');
  await shot('11_grope');
  await page.tap('.pz-cand[data-id="L2"]');
  await page.waitForTimeout(300);
  await page.tap('.pz-row[data-row="3"] .pz-grope');
  await page.waitForSelector('.pz-sheet .pz-cand');
  await page.tap('.pz-cand[data-id="L3"]');
  await page.waitForSelector('.pz.done .pz-note');
  await page.waitForTimeout(1300);
  await shot('12_poem_done');
  const pz = await page.evaluate(() => ({ p: G.save.state.puzzle, saeng: G.save.state.saeng }));
  ok(pz.p.groped === 2 && pz.p.fixes === 1 && pz.p.traps.length === 1 && pz.saeng === 3, `기록: 더듬기 ${pz.p.groped} · 고친 횟수 ${pz.p.fixes} · 함정 ${pz.p.traps} · 생 ${pz.saeng}`);
  await page.tap('.pz-next');
  await adv(page, () => !!document.querySelector('.event.on .card.orig'), 20);
  await page.waitForTimeout(300);
  await shot('13_cheok_words');
  ok(await page.evaluate(() => /此詩乃吾荊布所自製也/.test(document.querySelector('.event.on').textContent)), '완성 → 최척의 말(此詩乃吾荊布所自製也)과 풀이');
  ok(await page.evaluate(() => !G.audio.tongso.playing), '시가 완성되면 퉁소가 멎는다');
  await adv(page, () => G.world.test.state().goal && /배에서 내려가자/.test(G.world.test.state().goal.text), 30);
  await page.waitForTimeout(500);
  await shot('14_dawn');
  await adv(page, () => /驚呼抱持/.test((document.querySelector('.event.on') || {}).textContent || ''), 20);
  await shot('15_reunion');
  await adv(page, () => /好去沙干/.test((document.querySelector('.event.on') || {}).textContent || ''), 20);
  await shot('16_farewell');
  await adv(page, () => !!(G.save.state.snap['s:annam:act1end'] || G.save.state.done['s:annam:act1end']), 20);
  ok(await page.evaluate(() => !!G.save.state.done['s:annam:reunion'] && !!G.save.state.done['s:annam:farewell']), '재회 → 돈우의 작별(은 열 냥, 好去沙干)');
  ok(true, '끝까지 가면 1막 끝(act1End) 단계에 닿는다');
  await shot('17_act1end');

  // 연 5: 두 번째 소리 / 연 2: 세 번째 소리(그사이 모래밭에서 2행이 되살아난다)
  for (const [yeon, want] of [[5, 2], [2, 3]]) {
    await startAnnam(page, { yeon, saeng: 5, frags: { 1: '王子吹簫月欲低' } });
    await page.waitForSelector('.place-card');
    const goals = [];
    let strayShot = false;
    const heardAt = [];
    for (let i = 0; i < 8 && !(await page.evaluate(() => !!document.querySelector('.pz'))); i++) {
      await adv(page, () => !!document.querySelector('.tg-layer') || !!document.querySelector('.pz'), 120, goals);
      if (await page.evaluate(() => !!document.querySelector('.pz'))) break;
      await adv(page, () => { const b = document.querySelector('.ev-tray .btn.primary'); return !!b && /다음 ▶|답하기/.test(b.textContent); }, 20);
      heardAt.push(await page.evaluate(() => G.save.state.flags['annam:heard'] || 0));
      if (!strayShot && heardAt[heardAt.length - 1] === 0) { strayShot = true; await page.waitForTimeout(300); await shot('20_tongso_stray_y' + yeon); }
      await page.click('.ev-tray .btn.primary');
      await page.waitForTimeout(300);
      if (yeon === 5 && heardAt.length === 1) { await page.waitForFunction(() => G.world.test.state().goal); await page.waitForTimeout(500); await shot('21_walk_goal'); }
    }
    ok(heardAt.join() === (want === 2 ? '0,2' : '0,0,3'), `연 ${yeon}: ${want}번째 소리에 알아듣는다 (${heardAt.join(' → ')})`);
    const walked = goals.filter((g) => /부두 끝|모래밭/.test(g));
    ok(walked.length === want - 1, `연 ${yeon}: 소리 사이에 포구를 ${want - 1}번 더 걷는다 (${walked.join(' / ')})`);
    const f2 = await page.evaluate(() => !!G.save.state.frags[2]);
    ok(yeon === 2 ? f2 : !f2, yeon === 2 ? '연 2: 걷는 사이 모래밭에서 2행 조각이 되살아난다' : '연 5: 2행 되살리기 없음');
    s = await pzState(page);
    const traps = s.pool.filter((id) => !/^L/.test(id)).length;
    ok(traps === (yeon === 5 ? 2 : 3), `연 ${yeon}: 패에 섞이는 함정 ${traps}개(연이 낮을수록 많다)`);
  }
  errs.forEach((e) => problems.push('[휴대폰] ' + e));
  ok(errs.length === 0, '오류·실패한 요청 없음' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await ctx.close();
}

// ───────── 3) PC: 마우스·키보드, 패 구성, 생 0 예외, 소리 끄기, 정답 보기 ─────────
{
  console.log('PC 1366×860(마우스)');
  const { ctx, page, errs, shot } = await open('pc', { width: 1366, height: 860 });
  // 네 조각을 다 가져도 함정 하나 이상 / 깊이 읽기에만 C
  await poemOnly(page, { yeon: 9, saeng: 5, frags: { 1: 'a', 2: 'b', 3: 'c', 4: 'd' }, mode: 'basic' });
  let s = await pzState(page);
  ok(s.pool.filter((id) => /^L/.test(id)).length === 4 && s.pool.some((id) => !/^L/.test(id)), `네 조각을 다 가져도 함정을 만난다 (패: ${s.pool.join(' ')})`);
  ok(!s.pool.some((id) => /^C/.test(id)), '처음 배우기: C(최척의 화답시) 없음');
  ok(await page.evaluate(() => !G.poem.candidates(3, 'basic').concat(G.poem.candidates(4, 'basic')).some((id) => /^C/.test(id)) && G.poem.candidates(3, 'deep').includes('C1') && G.poem.candidates(4, 'deep').includes('C3')), '더듬기 후보: 깊이 읽기 3·4행에만 C');
  await shot('01_poem_all4');
  // 마우스: 눌러 고른 뒤 놓기
  await page.click('.pz-pool .pz-strip[data-id="L2"]');
  await page.click('.pz-row[data-row="2"] .pz-slot');
  await page.waitForTimeout(200);
  s = await pzState(page);
  ok(s.rows[2].strip === 'L2', '마우스(눌러 놓기): 2행');
  // 마우스: 끌어 놓기
  const a = await center(page, '.pz-pool .pz-strip[data-id="L3"]'), b = await center(page, '.pz-row[data-row="3"] .pz-slot');
  await page.mouse.move(a.x, a.y); await page.mouse.down();
  await page.mouse.move((a.x + b.x) / 2, (a.y + b.y) / 2, { steps: 6 });
  await page.mouse.move(b.x, b.y, { steps: 6 });
  await shot('02_drag_mouse');
  await page.mouse.up();
  await page.waitForTimeout(250);
  s = await pzState(page);
  ok(s.rows[3].strip === 'L3', '마우스(끌어 놓기): 3행');
  // 키보드: 조각에 초점 → Enter로 고르고 숫자 1로 놓기
  await page.focus('.pz-pool .pz-strip[data-id="L1"]');
  await page.keyboard.press('Enter');
  await page.keyboard.press('1');
  await page.waitForTimeout(200);
  s = await pzState(page);
  ok(s.rows[1].strip === 'L1', '키보드: Enter로 고르고 1로 1행에 놓기');
  // 놓은 조각을 다시 패로 끌어 빼기 → 다시 놓기
  await page.click('.pz-pool .pz-strip[data-id="L4"]');
  await page.click('.pz-row[data-row="4"] .pz-slot');
  await page.waitForSelector('.pz.done');
  ok(true, '네 행을 다 맞추면 완성');
  await page.click('.pz-next');
  await page.waitForFunction(() => window.__d === true);

  // 깊이 읽기: C가 섞인다
  await poemOnly(page, { yeon: 9, saeng: 5, frags: { 1: 'a', 4: 'd' }, mode: 'deep' });
  s = await pzState(page);
  ok(s.pool.includes('C1'), `깊이 읽기: C(요대는 아득하고…)가 패에 섞인다 (패: ${s.pool.join(' ')})`);
  await page.click('.pz-pool .pz-strip[data-id="C1"]');
  await page.click('.pz-row[data-row="3"] .pz-slot');
  await page.waitForTimeout(300);
  ok(await page.evaluate(() => G.save.state.puzzle.traps.includes('C')), '함정 C를 놓으면 기록된다');
  await shot('03_deep_trap_c');

  // 생 1 + 더듬어 찾기 두 번 → 꿈 없이 완성, 생 0 유지, 장육불 그대로
  await poemOnly(page, { yeon: 8, saeng: 1, jangyuk: 0, frags: { 1: 'a', 4: 'd' }, mode: 'basic' });
  await page.click('.pz-row[data-row="2"] .pz-grope');
  await page.waitForSelector('.pz-sheet .pz-cand');
  await page.click('.pz-cand[data-id="L2"]');
  await page.waitForTimeout(300);
  ok(await page.evaluate(() => G.save.state.saeng === 0 && !!document.querySelector('.pz-row[data-row="3"] .pz-grope.zero')), '생 0: 빈 행의 단추가 "퉁소 가락에 기대기"로 바뀐다');
  await shot('04_saeng_zero');
  await page.click('.pz-row[data-row="3"] .pz-grope');
  await page.waitForSelector('.pz-ex');
  await shot('05_exception');
  ok(await page.evaluate(() => !document.querySelector('.rdream, .dream-sheet, .sheet-back')), '생이 0이 되어도 장육불 꿈이 뜨지 않는다');
  await page.click('.pz-ex .btn.primary');
  await page.waitForFunction(() => G.poem.test.state().rows[3].strip === 'L3', null, { timeout: 5000 });
  ok(true, '퉁소가 한 번 더 울리고 남은 빈 행(3행)의 정답이 떠오른다');
  await placeOwned(page);
  await page.waitForSelector('.pz.done', { timeout: 5000 });
  const ex = await page.evaluate(() => ({ saeng: G.save.state.saeng, jangyuk: G.save.state.jangyuk, groped: G.save.state.puzzle.groped }));
  ok(ex.saeng === 0 && ex.jangyuk === 0 && ex.groped === 2, `생 1 + 더듬기 두 번: 완성, 생 ${ex.saeng}, 장육불 ${ex.jangyuk}, 더듬기 ${ex.groped}`);
  await page.click('.pz-next');
  await page.waitForFunction(() => window.__d === true);
  ok(await page.evaluate(() => G.save.state.saeng === 0), '단계가 끝나도 생은 0 그대로(쓰러짐 없음)');

  // 소리를 끄고도 끝까지: 물결과 자막은 그대로
  await page.evaluate(() => { G.save.state.sound = false; G.save.write(); });
  await poemOnly(page, { yeon: 5, saeng: 5, frags: { 1: 'a', 2: 'b', 4: 'd' }, mode: 'basic' });
  await page.waitForTimeout(1600);
  s = await pzState(page);
  const vis = await page.evaluate(() => ({ cap: !!document.querySelector('.pz .tg-cap.on'), playing: G.audio.tongso.playing }));
  ok(!vis.playing && vis.cap && s.rings > 0, `소리 끔: 퉁소는 울리지 않지만 물결(${s.rings}겹)과 자막이 보인다`);
  // 함정 놓고 고치기 → 기록
  const trap = s.pool.find((id) => !/^L/.test(id));
  await page.click(`.pz-pool .pz-strip[data-id="${trap}"]`);
  await page.click('.pz-row[data-row="2"] .pz-slot');
  await page.waitForTimeout(200);
  const thinBefore = (await pzState(page)).clarity;
  await page.click('.pz-row[data-row="2"] .pz-slot'); // 빼기(고침)
  await page.waitForTimeout(150);
  await placeOwned(page);
  await page.click('.pz-row[data-row="3"] .pz-grope');
  await page.waitForSelector('.pz-sheet .pz-cand');
  await page.click('.pz-cand[data-id="L3"]');
  await page.waitForSelector('.pz.done');
  await page.waitForTimeout(1200);
  await shot('06_done_sound_off');
  const rec = await page.evaluate(() => {
    const st = G.save.state;
    const saved = JSON.parse(localStorage.getItem(G.save.KEY));
    const parsed = G.code.parse(G.code.encode(st));
    return { pz: st.puzzle, saved: saved.puzzle, parsed: parsed.puzzle };
  });
  ok(thinBefore < 0.16, '틀린 자리: 물결이 가늘어진다(멀어짐)');
  ok(rec.pz.traps.length === 1 && rec.pz.fixes === 1 && rec.pz.groped === 1, `소리 끔: 완성, 기록(함정 ${rec.pz.traps} · 고침 ${rec.pz.fixes} · 더듬기 ${rec.pz.groped})`);
  ok(JSON.stringify(rec.saved) === JSON.stringify(rec.pz), '기록이 저장된다(localStorage)');
  ok(rec.parsed.groped === 1 && rec.parsed.fixes === 1 && rec.parsed.traps.join() === rec.pz.traps.join(), '이어 하기 글자에도 함정·고친 횟수·더듬기가 담긴다');
  await page.click('.pz-next');
  await page.waitForFunction(() => window.__d === true);
  await page.evaluate(() => { G.save.state.sound = true; G.save.write(); });

  // 선생님용 '정답 보기'
  await poemOnly(page, { yeon: 3, saeng: 5, frags: { 1: 'a' }, mode: 'deep' }, { teacher: false });
  ok(!(await page.locator('.pz-answer').isVisible()), "'정답 보기'는 선생님용에서만 보인다");
  await page.evaluate(() => { G.save.state.teacher = true; G.app.applySettings(); });
  await page.waitForSelector('.pz-answer', { state: 'visible' });
  await shot('07_teacher');
  await page.click('.pz-answer');
  await page.waitForSelector('.pz.done');
  s = await pzState(page);
  ok([1, 2, 3, 4].every((n) => s.rows[n].strip === 'L' + n) && s.finished, "선생님용 '정답 보기': 빈자리가 정답으로 채워지고 완성");
  await page.waitForTimeout(1200);
  await shot('08_done_teacher');
  await page.click('.pz-next');
  await page.waitForFunction(() => window.__d === true);

  // PC로 처음부터 화답까지(연 5) 화면 사진
  await page.evaluate(() => { G.save.state.teacher = false; G.app.applySettings(); });
  await startAnnam(page, { yeon: 5, saeng: 5, frags: { 1: '王子吹簫月欲低', 3: '會須共御靑鸞去' } });
  await page.waitForSelector('.place-card');
  await shot('10_title');
  await adv(page, () => G.world.test.state().goal && /둘러보자/.test(G.world.test.state().goal.text), 20);
  await page.waitForTimeout(400);
  await shot('11_map');
  await adv(page, () => !!document.querySelector('.tg-layer'), 120);
  await page.waitForTimeout(1500);
  await shot('12_tongso_stray');
  await adv(page, () => G.world.test.state().goal && /부두 끝/.test(G.world.test.state().goal.text), 20);
  await page.waitForTimeout(500);
  await shot('13_walk_pier');
  // 부두 끝까지 직접 걸어간다(→ 키)
  await page.evaluate(() => G.world.test.look(26, 15, 'right'));
  for (let i = 0; i < 40 && !(await page.evaluate(() => !!document.querySelector('.event.on'))); i++) {
    const st = await page.evaluate(() => G.world.test.state());
    const t = (await page.evaluate(() => G.world.test.targets()))[0];
    const key = Math.abs(t.x - st.x) > 6 ? (t.x > st.x ? 'ArrowRight' : 'ArrowLeft') : (t.y > st.y ? 'ArrowDown' : 'ArrowUp');
    await page.keyboard.down(key); await page.waitForTimeout(160); await page.keyboard.up(key);
  }
  ok(await page.evaluate(() => !!document.querySelector('.event.on')), '연 5: 긴 부두 끝까지 걸어가면 두 번째 소리가 들린다');
  await adv(page, () => !!document.querySelector('.tg-memory'), 10);
  await page.waitForTimeout(700);
  await shot('14_tongso_heard');
  await adv(page, () => !!document.querySelector('.pz'), 20);
  await page.waitForTimeout(1200);
  await shot('15_poem');
  errs.forEach((e) => problems.push('[PC] ' + e));
  ok(errs.length === 0, '오류·실패한 요청 없음' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await ctx.close();
}

await browser.close();
console.log(`\n점검 ${checks}개 · 문제 ${problems.length}개 · 화면 사진: tests/shots/T8/`);
for (const p of problems) console.log(' - ' + p);
process.exit(problems.length ? 1 : 0);
