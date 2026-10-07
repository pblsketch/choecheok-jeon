// 완주 점검들이 함께 쓰는 손잡이(e2e·hard·original·resume·code·file·maps).
//  - open(): 크롬 맥락 + 오류 모으기(콘솔 오류·페이지 오류·실패한 요청·400 이상 응답).
//    시험은 사람보다 훨씬 빨리 장면을 넘겨 배경음을 잇달아 바꾸므로, 받다 만 배경음 mp3를 끊는 ERR_ABORTED와
//    결과 그림 내려받기(blob:)만 허용한다(다른 점검과 같은 기준).
//  - play(): 지금 화면에서 결과 화면(또는 stop 조건)까지 실제 화면을 눌러 간다.
//    맵 목표만 시험 손잡이(G.world.test.complete)로 이루고, 딜레마·뱃길·별·시구 맞추기·1차시 끝·원작 결말·김영철전은
//    모두 화면의 실제 단추를 누른다. 고를 길은 plan.choices(딜레마 id → 선택지 id)와 plan.route로 정한다.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(HERE, '..');
export const VIEWS = {
  phone: { name: 'phone', label: '휴대폰 가로 844×390', width: 844, height: 390, isMobile: true, hasTouch: true, dpr: 2 },
  desktop: { name: 'desktop', label: 'PC 1366×860', width: 1366, height: 860, dpr: 1 },
};
export const MODE_LABEL = { basic: '처음 배우기', deep: '깊이 읽기' };

export function checker() {
  const c = { problems: [], checks: 0 };
  c.ok = (cond, msg) => { c.checks++; if (!cond) c.problems.push(msg); console.log((cond ? '  ✓ ' : '  ✗ ') + msg); return !!cond; };
  c.finish = (shots) => {
    console.log(`\n점검 ${c.checks}개 · 문제 ${c.problems.length}개` + (shots ? ' · 화면 사진: ' + shots : ''));
    for (const p of c.problems) console.log(' - ' + p);
    process.exit(c.problems.length ? 1 : 0);
  };
  return c;
}
export const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
export function shotsDir(name) {
  const d = path.join(HERE, 'shots', name);
  fs.rmSync(d, { recursive: true, force: true });
  fs.mkdirSync(d, { recursive: true });
  return d;
}
export const launch = (args = []) => chromium.launch({ channel: 'chrome', headless: true, args });

// 크롬 맥락 하나 + 오류 모으기
export async function open(browser, vp, o = {}) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: !!vp.isMobile, hasTouch: !!vp.hasTouch, deviceScaleFactor: vp.dpr || 1, acceptDownloads: true });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  page.on('requestfailed', (r) => {
    const why = (r.failure() || {}).errorText || '';
    if (/^blob:/.test(r.url())) return;
    if (/\/assets\/bgm\/[a-z_]+\.mp3$/.test(r.url()) && /ERR_ABORTED/.test(why)) return;
    errs.push('requestfailed: ' + r.url() + ' ' + why);
  });
  page.on('response', (r) => { if (r.status() >= 400) errs.push('http ' + r.status() + ': ' + r.url()); });
  let n = 0;
  const shot = async (label) => {
    if (!o.shots) return null;
    await page.waitForFunction(() => !document.querySelector('.gettoast'), null, { timeout: 9000 }).catch(() => {});
    await page.waitForTimeout(260);
    const f = path.join(o.shots, `${o.prefix || vp.name}_${String(++n).padStart(3, '0')}_${label.replace(/[^\w가-힣-]+/g, '_')}.png`);
    await page.screenshot({ path: f });
    return f;
  };
  return { ctx, page, errs, shot };
}

// 타이틀까지(저장을 지우고)
export async function fresh(page, url) {
  await page.goto(url);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector('.title-screen h1');
  await page.evaluate(() => { G.oldmap.fast = true; });
}
// 타이틀 → 이야기 시작 → 방식 고르기
export async function startGame(page, mode) {
  await page.click('button:has-text("이야기 시작")');
  await page.click(`.sheet button:has-text("${MODE_LABEL[mode]}")`);
}
// 새로고침(또는 같은 주소로 다시 열기) → 타이틀 '이어 하기'
export async function reloadContinue(page) {
  await page.reload();
  await page.waitForSelector('.title-screen h1');
  await page.evaluate(() => { G.oldmap.fast = true; });
  await page.click('button:has-text("이어 하기")');
}

export const state = (page) => page.evaluate(() => JSON.parse(JSON.stringify(G.save.state)));
export const gauges = (st) => ({ yeon: st.yeon, saeng: st.saeng });
// 새로고침해도 두 번 반영되면 안 되는 값들
export const tally = (st) => ({
  yeon: st.yeon, saeng: st.saeng, jangyuk: st.jangyuk, dreamSeen: st.dreamSeen,
  frags: Object.keys(st.frags || {}).sort().join(','), tokens: (st.tokens || []).map((t) => t.id || t).join(','),
  know: Object.keys(st.know || {}).filter((k) => st.know[k]).sort().join(','), cards: (st.cards || []).length,
  puzzle: st.puzzle, choices: st.choices, wisdomUsed: st.wisdomUsed, prep: st.prep, route: st.route,
});

// 사람·자리 곁으로 옮겨 E로 말을 건다(실제 탐색 경로). 대화창을 끝까지 넘기고, 펼친 글을 돌려준다
export async function talkTo(page, id) {
  await page.evaluate((id) => G.world.test.teleport(id), id);
  await page.waitForTimeout(160);
  const near = await page.evaluate(() => G.world.test.near());
  // 대화창이 막 닫힌 직후(목표 앞 말·맵 옮기기)에는 E가 잠깐 먹지 않는다 — 창이 안 뜨면 조금 뒤 다시 누른다
  for (let k = 0; k < 4; k++) {
    await page.keyboard.press('KeyE');
    if (await page.waitForSelector('.dlg', { timeout: 1200 }).then(() => true, () => false)) break;
    await page.waitForTimeout(300);
  }
  let text = '';
  for (let i = 0; i < 40; i++) {
    if (!(await page.locator('.dlg').count())) break;
    text = (await page.textContent('.dlg').catch(() => null)) || text;
    const sheet = page.locator('.sheet-back .sheet .actions .btn.primary');
    if (await sheet.count()) await sheet.first().click().catch(() => {});
    const b = page.locator('.dlg .dlg-tray .btn.primary');
    if (await b.count()) await b.first().click().catch(() => {});
    await page.waitForTimeout(110);
  }
  await page.waitForTimeout(380); // 닫은 직후 E가 먹지 않는 짧은 틈
  return { near, text };
}
// 1막 거점의 탐색: 역사 카드(두 번 말 걸기)·일본말(장꾼 흥정에 귀 기울이기)
export const LEARN = {
  war: ['hut', 'escapee', 2], ming: ['hut', 'father', 2],
  captives: ['porter', 'elder', 2], donwoo: ['porter', 'donwoo', 2], japanese: ['porter', 'market', 1],
};
export function learner(keys) {
  return async (goal, map, page, log) => {
    for (const k of keys) {
      const [at, who, n] = LEARN[k];
      if (!goal.targets.includes(at) || (log.learned || []).includes(k)) continue;
      (log.learned = log.learned || []).push(k);
      for (let i = 0; i < n; i++) await talkTo(page, who);
    }
  };
}

// 안남 시구 맞추기 풀기: o.trap이면 함정 하나를 먼저 놓았다가 고치고, 가진 조각을 놓고, 없는 행은 더듬어 찾는다
//  (생이 0이면 '퉁소 가락에 기대기' → 꿈 없이 퉁소가 다시 울리고 남은 정답이 떠오른다)
export function solvePoem(o = {}) {
  return async (page, log) => {
    await page.waitForSelector('.pz .pz-strip');
    await page.waitForTimeout(300);
    if (o.before) await o.before(page, log);
    let s = await page.evaluate(() => G.poem.test.state());
    if (o.trap && !log.trapped) {
      log.trapped = true;
      const t = s.pool.find((id) => !/^L/.test(id));
      const row = [1, 2, 3, 4].find((n) => !s.rows[n].strip);
      if (t && row) {
        await page.click(`.pz-pool .pz-strip[data-id="${t}"]`);
        await page.click(`.pz-row[data-row="${row}"] .pz-slot`);
        await page.waitForTimeout(200);
        await page.click(`.pz-row[data-row="${row}"] .pz-slot`); // 빼기(고침)
        await page.waitForTimeout(200);
      }
    }
    s = await page.evaluate(() => G.poem.test.state());
    for (const id of s.pool) if (/^L\d$/.test(id)) { await page.click(`.pz-pool .pz-strip[data-id="${id}"]`); await page.click(`.pz-row[data-row="${id[1]}"] .pz-slot`); await page.waitForTimeout(120); }
    for (const n of [1, 2, 3, 4]) {
      s = await page.evaluate(() => G.poem.test.state());
      if (s.rows[n].strip || s.finished) continue;
      if (o.onGrope) await o.onGrope(page, log, n);
      await page.click(`.pz-row[data-row="${n}"] .pz-grope`);
      await page.waitForSelector('.pz-sheet .pz-cand, .pz-ex', { timeout: 5000 });
      if (await page.locator('.pz-ex').count()) {
        log.poemException = (log.poemException || 0) + 1;
        log.exceptionSeen = await page.evaluate(() => ({ dream: !!document.querySelector('.rdream, .dream-sheet'), saeng: G.save.state.saeng, jangyuk: G.save.state.jangyuk }));
        if (o.onException) await o.onException(page, log);
        await page.click('.pz-ex .btn.primary');
        await page.waitForFunction(() => [1, 2, 3, 4].every((n) => G.poem.test.state().rows[n].strip), null, { timeout: 8000 }).catch(() => {});
        break;
      }
      await page.click(`.pz-cand[data-id="L${n}"]`);
      await page.waitForTimeout(250);
      if (o.afterGrope && (await o.afterGrope(page, log, n)) === 'abort') return; // 새로고침 등으로 화면이 바뀌었다
    }
    await page.waitForSelector('.pz.done', { timeout: 10000 }).catch(() => {});
  };
}

// 별과 지남철(바다길): 북두칠성 차례로 → 북극성 → 뱃머리를 북동쪽으로
async function solveStars(page, s) {
  if (s.stars.phase === 'ph-dipper') { if (s.stars.lit < 7) await page.click('.star.dipper.next', { timeout: 3000 }).catch(() => {}); }
  else if (s.stars.phase === 'ph-pole') { await page.waitForTimeout(700); await page.click('.star.polaris', { timeout: 3000 }).catch(() => {}); await page.waitForTimeout(700); }
  else if (s.stars.phase === 'ph-helm') { await page.click('.helm-r', { timeout: 3000 }).catch(() => {}); await page.waitForTimeout(200); }
  await page.waitForTimeout(120);
}

// 지금 화면
const LOOK = () => {
  if (window.G && G.oldmap) G.oldmap.fast = true;
  const vis = (e) => !!e && e.offsetParent !== null && getComputedStyle(e).visibility !== 'hidden';
  const q = (sel) => [...document.querySelectorAll(sel)].filter(vis);
  const st = G.save.state;
  const w = G.world && G.world.test ? G.world.test.state() : {};
  const goal = G.world && G.world.goal ? G.world.goal() : null;
  const snap = Object.keys(st.snap || {});
  let dilemma = null;
  for (const k of snap) {
    const [, pid, ...rest] = k.split(':');
    const s = ((window.PLACES[pid] || {}).steps || []).find((x) => x.id === rest.join(':'));
    if (s && s.type === 'dilemma') dilemma = { place: pid, step: s.id, d: s.dilemma, options: s.options.map((o) => o.id) };
  }
  const optEls = q('.ev-tray .options .opt, .dlg-tray .options .opt');
  return {
    place: st.place, yeon: st.yeon, saeng: st.saeng, snap, dilemma,
    title: !!q('.title-screen').length,
    rs: !!document.querySelector('.rs-sheet'),
    act1end: !!document.querySelector('.act1end[data-code]') && !!q('.ev-tray .btn.primary').length,
    pzEx: !!q('.pz-ex .btn.primary').length,
    pz: !!document.querySelector('.pz') && !document.querySelector('.pz.done'),
    pzDone: !!q('.pz.done .pz-next').length,
    stars: G.sea && G.sea.test.stars(),
    route: q('.sea-route .om-tray .opt').map((b) => ({ t: (b.querySelector('.ot') || b).textContent.trim(), dis: b.disabled })),
    opts: optEls.map((b) => ({ t: (b.querySelector('.ot') || b).textContent.trim(), dis: b.disabled, cls: b.className, all: b.textContent.replace(/\s+/g, ' ').trim() })),
    sheet: !!q('.sheet-back .sheet .actions .btn.primary').length,
    next: !!q('.ev-tray .actions .btn.primary, .dlg-tray .actions .btn.primary').length,
    om: !!q('.oldmap').length, omBtn: !!q('.om-tray .btn.primary').length,
    kyFind: !!document.querySelector('.ky-find') && !document.querySelector('.ky-item.on'),
    goal: goal && !G.world.busy && !document.querySelector('.event.on, .dlg') ? { text: goal.text, targets: goal.targets } : null,
    map: w.map || null,
    card: (q('.event.on .place-card .pc-name')[0] || {}).textContent || null,
    rcard: (document.querySelector('.ev-main .rcard') || {}).className || null,
    dream: (document.querySelector('.ev-main .rdream, .dlg .rdream, .sheet .rdream') || {}).className || null,
    sig: [st.place, Object.keys(st.done).length, snap.join(','), goal && goal.text, optEls.length, (document.querySelector('.ev-main, .dlg') || {}).textContent ? document.querySelector('.ev-main, .dlg').textContent.length : 0, document.querySelectorAll('.pz-row .pz-strip').length].join('|'),
  };
};

// 지금 화면에서 결과 화면(또는 plan.stop)까지 놀아 간다
//  plan: { choices:{딜레마: 선택지 | (log, s) => 선택지}, route:'coast'|'sea', poem:solvePoem(), act1:'go'|'reload'|'stop'
//          onGoal(goal, map, page, log), beforeChoice(d, page, log, s), afterChoice(d, page, log), onAct1End(page, log),
//          onButton(s, page, log), stop(s, page, log) }
//  돌려줌: log = { ok, why, dil:{ d:{ before, opts, after, card } }, dreams:[…], routeSeen, code, goals:[…], places:[…] }
export async function play(page, plan, o = {}) {
  const log = { ok: false, dil: {}, dreams: [], goals: [], places: [], seen: new Set() };
  const shot = o.shot || (async () => null);
  const once = async (key, fn) => { if (log.seen.has(key)) return false; log.seen.add(key); if (fn) await fn(); return true; };
  let last = '', still = 0;
  for (let it = 0; it < (o.max || 3000); it++) {
    let s;
    try { s = await page.evaluate(LOOK); } catch (e) { await page.waitForTimeout(300); if (it > 5 && /Execution context|navigat/.test(e.message)) continue; log.why = '화면 읽기 오류: ' + e.message; return log; }
    if (s.sig === last) { if (++still > (o.stuck || 260)) { await shot('STUCK'); log.why = '진행이 멈춤: ' + JSON.stringify({ place: s.place, goal: s.goal, snap: s.snap, opts: s.opts.length }); return log; } } else { still = 0; last = s.sig; }
    if (plan.stop && (await plan.stop(s, page, log))) { log.ok = true; log.last = s; return log; }
    if (s.place && !log.places.includes(s.place)) log.places.push(s.place);
    if (s.rs) { await shot('result'); log.ok = true; log.last = s; return log; }
    if (s.card) await once('card:' + s.card, () => shot('card_' + (s.place || '')));
    // 장육불 꿈·떠올리는 글(쓰러짐)
    if (s.dream && (await once('dream:' + s.snap.join(',') + ':' + s.dream, null))) {
      log.dreams.push({ cls: s.dream, place: s.place, step: (s.snap[0] || '').split(':').slice(2).join(':'), st: await state(page) });
      await shot('dream_' + s.place);
    }
    // 1차시 끝: 화면에 크게 보인 글자를 읽는다
    if (s.act1end) {
      if (!log.code) {
        log.code = await page.evaluate(() => [...document.querySelectorAll('.a1-ch')].map((x) => x.textContent).join(''));
        log.codeAttr = await page.getAttribute('.act1end', 'data-code');
        log.act1 = await state(page);
        await shot('act1end');
        if (plan.onAct1End) await plan.onAct1End(page, log);
      }
      const how = plan.act1 || 'reload';
      if (how === 'stop') { log.ok = true; log.last = s; return log; }
      if (how === 'go') { await page.click('.ev-tray .btn.primary'); await page.waitForTimeout(200); continue; }
      // 2차시: 타이틀로 나갔다가 같은 브라우저에서 다시 열고 '이어 하기'
      await page.click('.ev-tray .btn:has-text("타이틀로")');
      await page.waitForSelector('.title-screen h1');
      await reloadContinue(page);
      log.resumedAct2 = true;
      continue;
    }
    if (s.pzEx) { await page.click('.pz-ex .btn.primary').catch(() => {}); await page.waitForTimeout(200); continue; }
    if (s.pz) { await once('poem', () => shot('poem')); log.poemBefore = log.poemBefore || (await state(page)); await (plan.poem || solvePoem())(page, log); log.poemAfter = await state(page); await shot('poem_done'); continue; }
    if (s.pzDone) { await page.click('.pz.done .pz-next').catch(() => {}); await page.waitForTimeout(200); continue; }
    if (s.stars && s.stars.phase !== 'intro' && s.stars.phase !== 'ph-done') { await once('stars', () => shot('stars')); log.starsDone = true; await solveStars(page, s); continue; }
    if (s.route.length) {
      if (!log.routeSeen) { log.routeSeen = { yeon: s.yeon, saeng: s.saeng, route: s.route }; await shot('route'); }
      const want = { coast: '연안길', sea: '바다길' }[plan.route || 'coast'];
      const b = s.route.find((r) => r.t === want);
      if (!b || b.dis) { log.why = `뱃길 ${want}을(를) 고를 수 없음(생 ${s.saeng})`; return log; }
      await page.click(`.sea-route .om-tray .opt:has-text("${want}")`);
      await page.waitForTimeout(300);
      continue;
    }
    const live = s.opts.filter((x) => !x.dis);
    if (live.length && s.dilemma) {
      const d = s.dilemma.d;
      if (!log.dil[d]) {
        log.dil[d] = { before: await state(page), opts: s.opts, place: s.dilemma.place };
        if (plan.beforeChoice) await plan.beforeChoice(d, page, log, s);
        await shot('dilemma_' + d);
      }
      if (plan.onDilemma && (await plan.onDilemma(d, page, log, s)) === 'reloaded') continue;
      const c = plan.choices && plan.choices[d];
      const want = typeof c === 'function' ? await c(log, s) : c;
      const idx = want ? s.dilemma.options.indexOf(want) : s.opts.findIndex((x) => !x.dis);
      if (idx < 0 || !s.opts[idx] || s.opts[idx].dis) { log.why = `딜레마 ${d}: ${want}을(를) 고를 수 없음 — ` + s.opts.map((x) => x.all).join(' / '); return log; }
      log.dil[d].pick = s.dilemma.options[idx];
      await page.locator('.ev-tray .options .opt, .dlg-tray .options .opt').nth(idx).click();
      await page.waitForTimeout(150);
      if (plan.afterChoice) await plan.afterChoice(d, page, log);
      continue;
    }
    // 딜레마 뒤 원작 대조 카드
    if (s.rcard && s.dilemma && !(log.dil[s.dilemma.d] || {}).card) {
      log.dil[s.dilemma.d] = log.dil[s.dilemma.d] || { place: s.dilemma.place, preset: true };
      log.dil[s.dilemma.d].card = { cls: s.rcard, text: await page.textContent('.ev-main .rcard') };
      log.dil[s.dilemma.d].after = await state(page);
      await shot('compare_' + s.dilemma.d);
    }
    if (s.sheet) { await page.locator('.sheet-back .sheet .actions .btn.primary').first().click().catch(() => {}); await page.waitForTimeout(150); continue; }
    if (s.kyFind) { const it = page.locator('.ky-item'); const n = await it.count(); for (let i = 0; i < Math.min(2, n); i++) await it.nth(i).click(); log.kimyc = true; await shot('kimyc'); continue; }
    if (s.next) {
      if (plan.onButton && (await plan.onButton(s, page, log)) === 'reloaded') continue;
      await page.locator('.ev-tray .actions .btn.primary:visible, .dlg-tray .actions .btn.primary:visible').first().click({ timeout: 3000 }).catch(() => {});
      await page.waitForTimeout(70);
      continue;
    }
    if (s.omBtn) { await once('om:' + s.place, () => shot('oldmap_' + s.place)); await page.click('.om-tray .btn.primary').catch(() => {}); await page.waitForTimeout(200); continue; }
    if (s.title && !s.rs) {
      if (plan.onTitle) { const r = await plan.onTitle(page, log); if (r === 'stop') { log.ok = true; return log; } continue; }
      await page.click('button:has-text("이어 하기")').catch(() => {});
      await page.waitForTimeout(300);
      continue;
    }
    if (s.goal) {
      const key = s.map + ':' + s.goal.text;
      if (await once('goal:' + key, null)) {
        log.goals.push({ place: s.place, map: s.map, text: s.goal.text, targets: s.goal.targets });
        if (o.mapShots) { await page.waitForTimeout(500); await shot('map_' + s.map); }
        if (plan.onGoal) await plan.onGoal(s.goal, s.map, page, log);
        continue; // 탐색 뒤 다시 본다(대화로 화면이 바뀌었을 수 있다)
      }
      await page.evaluate(() => G.world.test.complete());
      await page.waitForTimeout(150);
      continue;
    }
    await page.waitForTimeout(110);
  }
  log.why = '단계 수 초과';
  return log;
}

// 결과 화면: 이름을 적고 '이미지로 저장' → 내려받은 그림을 확인한다
export async function saveResult(page, dir, file, name) {
  await page.waitForSelector('.rs-sheet .rs-save-btn');
  if (name != null) await page.fill('.rs-name-in', name);
  await page.waitForTimeout(1800); // 完 도장이 사라질 때까지
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 20000 }), page.click('.rs-save-btn')]);
  const out = path.join(dir, file);
  await dl.saveAs(out);
  const buf = fs.readFileSync(out);
  return { name: dl.suggestedFilename(), size: buf.length, png: buf.subarray(0, 8).toString('hex') === '89504e470d0a1a0a', w: buf.readUInt32BE(16), h: buf.readUInt32BE(20), file: out };
}
// 결과 화면에서 읽을 것
export const readResult = (page) => page.evaluate(() => ({
  items: [...document.querySelectorAll('.rs-sec[data-item]')].map((x) => x.dataset.item).join(),
  rows: [...document.querySelectorAll('.rs-table tbody tr')].map((tr) => ({ d: tr.dataset.dilemma, my: (tr.querySelector('.my') || {}).textContent || '', og: (tr.querySelector('.og') || {}).textContent || '', t: tr.textContent })),
  ending: (document.querySelector('.rs-sec.ending') || {}).textContent || '',
  dream: (document.querySelector('.rs-dream b') || {}).textContent || '',
  traps: [...document.querySelectorAll('.rs-trap.placed')].map((x) => x.dataset.trap).join(),
  fixes: (document.querySelector('.rs-count[data-count="fixes"] b') || {}).textContent || '',
  groped: (document.querySelector('.rs-count[data-count="groped"] b') || {}).textContent || '',
  none: [...document.querySelectorAll('.rs-chart text')].some((t) => t.textContent === '1막 기록 없음'),
  dots: document.querySelectorAll('.rs-chart.yeon g.pt circle').length,
  debrief: document.querySelectorAll('.rs-debrief li').length,
}));
