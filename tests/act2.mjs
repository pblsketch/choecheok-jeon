// 2막 점검(T9): cd tests && npm install && node act2.mjs
//  - ?act=2로 시작해 막간 → 항주 → 바다(뱃길·별·해적·섬·조선 배) → 남원 재회까지 실제 화면을 눌러 가며 끝까지 간다
//  - 원작대로(일본말을 알고 떠남·준비) 걸으면 뱃길을 고를 때 생 6, 바다길이 열린다 / 생이 모자라면 바다길이 잠긴다
//  - 연안길·바다길 모두 남원 재회에 닿는다 / 준비 여부에 따라 조선 배 장면과 게이지가 달라진다
//  - 항주의 두 번째 이별은 쓰러짐으로 세지 않는다 / 섬에서 생이 0이 되면 장육불 꿈 → 생 3
//  - 결말 넷(whole·weary·strange·barely)이 게이지에 따라 나온다 / 원작 궤적이 뱃길 앞에서 생 6
//  - 콘솔 오류·실패한 요청이 하나도 없어야 한다(곡을 빨리 바꿔 끊긴 배경음 받기만 허용). 화면 사진: tests/shots/T9/
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { base } from './serve.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SHOTS = path.join(HERE, 'shots', 'T9');
fs.rmSync(SHOTS, { recursive: true, force: true });
fs.mkdirSync(SHOTS, { recursive: true });
const BASE = await base();
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const problems = [];
let checks = 0;
const ok = (cond, msg) => { checks++; if (!cond) problems.push(msg); console.log((cond ? '  ✓ ' : '  ✗ ') + msg); };

const PHONE = { width: 844, height: 390, isMobile: true, hasTouch: true, dpr: 2 };
const DESK = { width: 1366, height: 860 };

async function open(name, vp, query = '') {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: !!vp.isMobile, hasTouch: !!vp.hasTouch, deviceScaleFactor: vp.dpr || 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  // 곡을 빨리 바꾸면(시험은 장면을 아주 빨리 넘긴다) 배경음 mp3 받기를 끊은 ERR_ABORTED가 생긴다 — tests/audio.mjs처럼 그것만 허용
  page.on('requestfailed', (r) => { const t = 'requestfailed: ' + r.url() + ' ' + ((r.failure() || {}).errorText || ''); if (!/\/assets\/bgm\/[a-z_]+\.mp3 net::ERR_ABORTED$/.test(t)) errs.push(t); });
  page.on('response', (r) => { if (r.status() >= 400) errs.push('http ' + r.status() + ': ' + r.url()); });
  await page.goto(BASE);
  await page.evaluate(() => localStorage.clear());
  await page.goto(BASE + query);
  await page.evaluate(() => { G.oldmap.fast = true; });
  const shot = (n) => page.screenshot({ path: path.join(SHOTS, name + '_' + n + '.png') });
  return { ctx, page, errs, shot };
}

// 지금 화면 상태
const look = (page) => page.evaluate(() => {
  const vis = (e) => e && e.offsetParent !== null && getComputedStyle(e).visibility !== 'hidden';
  const q = (sel) => [...document.querySelectorAll(sel)].filter(vis);
  const st = G.save.state;
  const goal = G.world && G.world.goal && G.world.goal();
  return {
    place: st.place, yeon: st.yeon, saeng: st.saeng,
    stars: G.sea && G.sea.test.stars(),
    route: q('.sea-route .om-tray .opt').map((b) => ({ t: b.querySelector('.ot').textContent, dis: b.disabled, lock: ((b.querySelector('.od.lock') || {}).textContent) || '' })),
    opts: q('.ev-tray .opt, .dlg-tray .opt').map((b) => ({ t: b.querySelector('.ot').textContent, dis: b.disabled, locked: b.classList.contains('locked') })),
    btn: q('.ev-tray .btn.primary, .dlg-tray .btn.primary, .om-tray .btn.primary, .sheet .btn.primary').length > 0,
    goal: goal && !G.world.busy && !document.querySelector('.event.on') ? goal.targets[0] : null,
    title: (q('.ev-main .stitle')[0] || {}).textContent || null,
    dream: q('.rdream').length > 0,
    map: G.world.test.state().map,
  };
});

// 끝까지 눌러 가기. plan: { wait:'leave'|'wait', prep:'prep'|'none', route:'coast'|'sea', island:'signal'|'endure', before:{ 목표 id: 게이지 }, on:{…} }
const LABEL = {
  wait: { wait: '항주에서 기다린다', leave: '조선으로 떠난다' },
  prep: { prep: '두 나라 옷을 짓고 말을 가르친다', none: '준비 없이 서두른다' },
  route: { coast: '연안길', sea: '바다길' },
  island: { signal: '신호불을 피운다', endure: '아끼며 버틴다' },
};
async function drive(page, plan, stop, o = {}) {
  const log = { titles: [], dreams: 0, routeSeen: null, shots: {}, goals: [], overflow: [] };
  const firstShot = async (key, fn) => { if (!log.shots[key] && o.shot) { log.shots[key] = true; await page.waitForTimeout(fn || 450); await o.shot(key); } };
  let prevS = null;
  for (let i = 0; i < 1500; i++) {
    let s;
    try { s = await look(page); } catch (e) { return Object.assign(log, { ok: false, why: '화면 오류: ' + e.message, last: prevS }); }
    prevS = s;
    if (process.env.DEBUG) console.error(i, s.place, s.map, JSON.stringify(s.stars), s.goal, s.btn, s.opts.length, s.route.length);
    if (await stop(s, page)) return Object.assign(log, { ok: true, last: s });
    if (s.title && !log.titles.includes(s.title)) log.titles.push(s.title);
    if (s.dream) { if (!log.inDream) { log.dreams++; log.inDream = true; await firstShot('dream'); } } else log.inDream = false;
    // 별 읽기
    if (s.stars && s.stars.phase !== 'intro' && s.stars.phase !== 'ph-done') {
      if (s.stars.phase === 'ph-dipper' && log.starsHit == null) {
        // 별마다 가운데를 누르면 그 별이 눌리는가(단추가 서로 덮지 않는가)
        log.starsHit = await page.evaluate(() => [...document.querySelectorAll('.star')].every((b) => { const r = b.getBoundingClientRect(); const t = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return t && t.closest('.star') === b; }));
        await firstShot('stars_start', 600);
      }
      if (s.stars.phase === 'ph-dipper') { if (s.stars.lit === 3) await firstShot('stars_dipper', 300); if (s.stars.lit < 7) await page.click('.star.dipper.next', { timeout: 3000 }).catch(() => {}); }
      else if (s.stars.phase === 'ph-pole') { await page.waitForTimeout(900); await firstShot('stars_pole', 100); await page.click('.star.polaris', { timeout: 3000 }).catch(() => {}); await page.waitForTimeout(900); }
      else if (s.stars.phase === 'ph-helm') { await firstShot('stars_helm', 300); await page.click('.helm-r', { timeout: 3000 }).catch(() => {}); await page.waitForTimeout(200); }
      await page.waitForTimeout(120);
      continue;
    }
    // 뱃길 고르기(고지도)
    if (s.route.length) {
      if (!log.routeSeen) { log.routeSeen = { saeng: s.saeng, yeon: s.yeon, route: s.route }; await firstShot('route', 900); if (o.onRoute) await o.onRoute(s); }
      const want = LABEL.route[plan.route];
      const b = s.route.find((r) => r.t === want && !r.dis);
      if (!b) return Object.assign(log, { ok: false, why: '뱃길 ' + want + ' 을(를) 고를 수 없음', last: s });
      await page.click(`.sea-route .om-tray .opt:has-text("${want}")`);
      await page.waitForTimeout(300);
      continue;
    }
    // 딜레마 선택지
    const open = s.opts.filter((x) => !x.dis);
    if (open.length) {
      let want = null;
      for (const k of ['wait', 'prep', 'route', 'island']) {
        if (s.opts.some((x) => Object.values(LABEL[k]).includes(x.t))) { want = LABEL[k][plan[k]]; if (o.onDilemma) await o.onDilemma(k, s); await firstShot('dilemma_' + k, 400); }
      }
      if (!want) return Object.assign(log, { ok: false, why: '모르는 선택지: ' + s.opts.map((x) => x.t).join('/'), last: s });
      const b = open.find((x) => x.t === want);
      if (!b) return Object.assign(log, { ok: false, why: '고를 수 없는 선택지: ' + want, last: s });
      await page.click(`.ev-tray .opt:has-text("${want}"), .dlg-tray .opt:has-text("${want}")`);
      await page.waitForTimeout(150);
      continue;
    }
    if (s.btn) {
      // 글이 칸 밖으로 넘치지 않는가: 카드 한 장(카드 모습)은 스크롤 없이 다 보이고, 글 칸은 마지막 줄이 보인다
      await page.waitForTimeout(260);
      const fit = await page.evaluate(() => {
        const ev = document.querySelector('.event.on');
        const sc = ev && ev.querySelector('.ev-scroll');
        if (!sc || !sc.offsetParent) return null;
        if (ev.classList.contains('rcardmode')) {
          const t = (sc.querySelector('h3') || {}).textContent || '';
          return sc.scrollHeight - sc.clientHeight > 4 ? '카드 넘침: ' + t + ' (' + (sc.scrollHeight - sc.clientHeight) + 'px)' : null;
        }
        const says = [...sc.querySelectorAll('.says')].pop();
        const last = says && says.lastElementChild;
        if (!last) return null;
        const over = last.getBoundingClientRect().bottom - sc.getBoundingClientRect().bottom;
        return over > 2 ? '마지막 줄 가림(' + Math.round(over) + 'px): ' + last.textContent.slice(0, 24) : null;
      });
      if (fit && !log.overflow.includes(fit)) log.overflow.push(fit);
      if (o.shot) {
        const k = await page.evaluate(() => ['.rcard.fiction', '.rcard.orig', '.rcard.history', '.rcard.letter', '.para.wonmun', '.ev-main .say'].find((c) => document.querySelector('.event.on ' + c)) || null);
        if (k) await firstShot('ui_' + k.replace(/[^a-z]+/g, '_').replace(/^_|_$/g, '') + '_' + s.place, 350);
      }
      if (o.onButton) await o.onButton(s, firstShot);
      await page.locator('.ev-tray .btn.primary:visible, .dlg-tray .btn.primary:visible, .om-tray .btn.primary:visible, .sheet .btn.primary:visible').first().click({ timeout: 3000 }).catch(() => {});
      await page.waitForTimeout(90);
      continue;
    }
    if (s.goal) {
      log.goals.push(s.place + ':' + s.goal);
      if (o.onGoal) await o.onGoal(s, firstShot);
      const g = (plan.before || {})[s.goal];
      if (g) await page.evaluate((v) => G.rules.test.set(v), g);
      await page.evaluate(() => G.world.test.complete());
      await page.waitForTimeout(150);
      continue;
    }
    await page.waitForTimeout(100);
  }
  return Object.assign(log, { ok: false, why: '시간 초과', last: await look(page) });
}
// 남원 재회에서 결말 후일담을 지나 원작 결말 단계(T10)에 닿으면 멈춘다
const reachedEnd = async (s, page) => s.place === 'namwon_final' && page.evaluate(() => ['whole', 'weary', 'strange', 'barely'].some((e) => G.save.state.done['s:namwon_final:n-end-' + e]));

const ONLY = process.env.ONLY || '12345';
// ───────── 1) 휴대폰 가로: 원작대로(일본말 → 떠남 · 준비) → 바다길 → 버티기 ─────────
if (ONLY.includes('1')) {
  console.log('휴대폰 가로 844×390 — 원작대로 걷기(떠남·준비·바다길)');
  const { ctx, page, errs, shot } = await open('phone', PHONE, '?act=2');
  await page.waitForSelector('.place-card');
  ok((await page.textContent('.place-card')).includes('막간'), '?act=2 → 막간부터');
  ok(await page.evaluate(() => G.save.state.saeng === 5 && G.save.state.yeon === 5), '막간: 연 5·생 5');
  await page.evaluate(() => G.rules.test.set({ know: ['k-japanese'] }));
  await shot('01_interlude_card');
  let hzCollapse = null;
  const r = await drive(page, { wait: 'leave', prep: 'prep', route: 'sea', island: 'endure' }, reachedEnd, {
    shot,
    onGoal: async (s, fs) => {
      if (s.place === 'hangzhou' && s.goal === 'mongseon' && hzCollapse == null) hzCollapse = await page.evaluate(() => G.save.state.jangyuk);
      if (s.place === 'hangzhou' && s.goal === 'cheok') await fs('hangzhou_map', 900);
      if (s.place === 'sea' && s.goal === 'cave') await fs('island_map', 3200);
      if (s.place === 'sea' && s.goal === 'hill' && s.map === 'island_ship') { await page.evaluate(() => G.world.test.look(22, 12, 'right')); await fs('island_ship_map', 1200); }
      if (s.place === 'namwon_final' && s.goal === 'cheok') await fs('namwon_map', 1200);
    },
    onButton: async (s, fs) => {
      if (s.place === 'hangzhou' && await page.evaluate(() => !!document.querySelector('.rcard.letter'))) await fs('letter', 400);
      if (s.place === 'sea' && await page.evaluate(() => !!document.querySelector('.rcard.variant'))) await fs('variant_note', 400);
      if (s.title) await fs('ending', 500);
    },
  });
  ok(r.ok, '원작대로: 남원 재회 결말까지 간다' + (r.ok ? '' : ' — ' + r.why + ' ' + JSON.stringify(r.last)));
  ok(r.overflow.length === 0, '휴대폰 가로: 카드가 칸을 넘치지 않고, 글 칸의 마지막 줄이 가려지지 않는다' + (r.overflow.length ? ' — ' + r.overflow.join(' / ') : ''));
  ok(r.routeSeen && r.routeSeen.saeng === 6, `뱃길을 고를 때 생 6 (${r.routeSeen && r.routeSeen.saeng})`);
  const sea = r.routeSeen && r.routeSeen.route.find((x) => x.t === '바다길');
  ok(sea && !sea.dis, '생 6이면 바다길이 열려 있다');
  ok(hzCollapse === 0, '항주의 두 번째 이별·장육불 꿈은 쓰러짐으로 세지 않는다(장육불 횟수 0)');
  const st = await page.evaluate(() => ({ route: G.save.state.route, prep: G.save.state.prep, choices: G.save.state.choices, done: G.save.state.done, jangyuk: G.save.state.jangyuk, ending: G.save.state.ending, yeon: G.save.state.yeon, saeng: G.save.state.saeng, trail: G.save.state.trail }));
  ok(st.route === 'sea' && st.prep === true, '저장: route=sea, prep=true');
  ok(st.done['s:sea:s-stars'] && !st.done['s:sea:s-coast-patrol'], '바다길: 별 읽기(순찰선 장면 없음)');
  ok(r.starsHit === true, '별 읽기: 별 단추가 서로 덮지 않는다(휴대폰 가로)');
  ok(st.done['s:sea:s-ship-prep'] && !st.done['s:sea:s-ship-late'], '준비했으면 조선 배가 바로 구조(준비한 쪽 장면)');
  const tr = Object.fromEntries(st.trail.map((t) => [t.place, t]));
  ok(tr.hangzhou && tr.hangzhou.saeng === 6, '항주를 떠날 때 생 6');
  // 바다: 6 → 바다길(−2) 4 → 해적(−2) 2 → 버티기(+2) 4 → 조선 배(준비: 생 0, 연 +1)
  ok(tr.sea && tr.sea.saeng === 4 && tr.sea.yeon === Math.min(10, tr.hangzhou.yeon + 1 - 2 + 1), `바다를 떠날 때 생 4·연 ${tr.sea && tr.sea.yeon}(바다길 −2/+1, 해적 −2, 버티기 +2/−2, 조선 배 연 +1)`);
  ok(st.jangyuk === 0, '쓰러지지 않으면 장육불 횟수 0');
  ok(!!st.ending && r.titles.length >= 1, `결말 ${st.ending} 후일담: ${r.titles.join(', ')}`);
  // 원작 궤적: 뱃길 앞에서 생 6
  const orig = await page.evaluate(() => { const o = G.rules.originalRun(); return { before: o.before['d-sea-route'], choices: o.choices, trail: o.trail.map((t) => ({ place: t.place, yeon: t.yeon, saeng: t.saeng })) }; });
  ok(orig.before && orig.before.saeng === 6, `원작 궤적: 뱃길을 고를 때 생 6 (${orig.before && orig.before.saeng})`);
  const ot = Object.fromEntries(orig.trail.map((t) => [t.place, t]));
  ok(ot.hangzhou && ot.hangzhou.saeng === 6 && ot.sea && ot.sea.saeng === 2, `원작 궤적: 항주 생 6 → 바다 생 2(바다길 −2, 해적 −2, 섬 창작 딜레마는 변화 없음, 조선 배는 준비한 쪽) — ${JSON.stringify(ot.sea)}`);
  ok(orig.choices['d-sea-route'] && orig.choices['d-sea-route'].orig === null && orig.choices['d-sea-route'].nearest === 'sea', '원작 궤적: 뱃길은 원작에 없는 장면, 가까운 쪽은 바다길');
  ok(await page.evaluate(() => JSON.stringify(G.rules.originalTrail()) === JSON.stringify(G.rules.originalRun().trail)), 'originalTrail() = originalRun().trail');
  errs.forEach((e) => problems.push('[휴대폰] ' + e));
  ok(errs.length === 0, '오류·실패한 요청 없음' + (errs.length ? ': ' + errs.slice(0, 5).join(' | ') : ''));
  await ctx.close();
}

// ───────── 2) PC: 일본말 없이(준비 잠김) → 생 5 → 바다길 잠김 → 연안길 → 섬에서 쓰러짐 ─────────
if (ONLY.includes('2')) {
  console.log('PC 1366×860 — 준비 없이, 연안길, 섬에서 쓰러짐');
  const { ctx, page, errs, shot } = await open('desktop', DESK, '?act=2');
  await page.waitForSelector('.place-card');
  let prepLocked = null, collapseSeen = null;
  const r = await drive(page, { wait: 'leave', prep: 'none', route: 'coast', island: 'signal', before: { signal: { saeng: 2 } } }, reachedEnd, {
    shot,
    onDilemma: async (k, s) => {
      if (k === 'prep' && prepLocked == null) { const p = s.opts.find((x) => x.t === LABEL.prep.prep); prepLocked = !!(p && p.dis && p.locked); await shot('prep_locked'); }
    },
    onButton: async (s, fs) => {
      if (s.dream && s.place === 'sea' && collapseSeen == null) { collapseSeen = await page.evaluate(() => ({ saeng: G.save.state.saeng, jangyuk: G.save.state.jangyuk, text: document.querySelector('.rdream').textContent })); await fs('island_collapse', 400); }
      if (s.place === 'sea' && s.map === 'island_night') await fs('island_night', 300);
    },
    onGoal: async (s, fs) => {
      if (s.place === 'sea' && s.map === 'island_night') await fs('island_night_map', 1400);
    },
  });
  ok(r.ok, '연안길로도 남원 재회까지 간다' + (r.ok ? '' : ' — ' + r.why + ' ' + JSON.stringify(r.last)));
  ok(r.overflow.length === 0, 'PC: 카드가 칸을 넘치지 않고, 글 칸의 마지막 줄이 가려지지 않는다' + (r.overflow.length ? ' — ' + r.overflow.join(' / ') : ''));
  ok(prepLocked === true, '일본말을 모르면 "두 나라 옷과 말"(지혜의 길)이 잠긴다');
  ok(r.routeSeen && r.routeSeen.saeng === 5, `준비 없이 떠나면 뱃길을 고를 때 생 5 (${r.routeSeen && r.routeSeen.saeng})`);
  const sea = r.routeSeen && r.routeSeen.route.find((x) => x.t === '바다길');
  ok(sea && sea.dis && sea.lock.length > 0, `생이 모자라면 바다길이 잠기고 실마리가 보인다("${sea && sea.lock}")`);
  ok(collapseSeen && collapseSeen.saeng === 3 && collapseSeen.jangyuk === 1 && collapseSeen.text.includes('장육불'), `섬에서 생 0 → 장육불 꿈 → 생 3 (${JSON.stringify(collapseSeen && { saeng: collapseSeen.saeng, jangyuk: collapseSeen.jangyuk })})`);
  const st = await page.evaluate(() => ({ route: G.save.state.route, prep: G.save.state.prep, done: G.save.state.done, trail: G.save.state.trail, ending: G.save.state.ending }));
  ok(st.route === 'coast' && st.prep === false, '저장: route=coast, prep=false');
  ok(st.done['s:sea:s-coast-patrol'] && !st.done['s:sea:s-stars'], '연안길: 명나라 순찰선 장면(별 읽기 없음)');
  ok(st.done['s:sea:s-ship-late'] && !st.done['s:sea:s-ship-prep'], '준비하지 않았으면 조선 배가 늦게 구조(생 −1 쪽 장면)');
  const tr = Object.fromEntries(st.trail.map((t) => [t.place, t]));
  // 섬: 생 2에서 신호불(−2) → 0 → 쓰러짐 3 → 조선 배 늦게(−1) → 2
  ok(tr.sea && tr.sea.saeng === 2, `바다를 떠날 때 생 2(쓰러진 뒤 3, 늦은 구조 −1) — ${tr.sea && tr.sea.saeng}`);
  errs.forEach((e) => problems.push('[PC] ' + e));
  ok(errs.length === 0, '오류·실패한 요청 없음' + (errs.length ? ': ' + errs.slice(0, 5).join(' | ') : ''));
  await ctx.close();
}

// ───────── 3) 결말 넷: 남원 재회만 따로, 게이지를 정해 두고 ─────────
const r_shot = {};
for (const [vp, vpName] of ONLY.includes('3') ? [[PHONE, 'phone'], [DESK, 'desktop']] : []) {
  console.log('결말 넷 — ' + vpName);
  const { ctx, page, errs, shot } = await open('end_' + vpName, vp);
  for (const k in r_shot) delete r_shot[k];
  await page.waitForSelector('.title-screen h1');
  const want = { whole: [8, 8, '남원의 봄'], weary: [8, 3, '회복의 시간'], strange: [3, 8, '다시 쌓는 기억'], barely: [3, 3, '살아 돌아온 것만으로'] };
  for (const [end, [yeon, saeng, title]] of Object.entries(want)) {
    await page.evaluate(([y, s, tok]) => { G.save.reset(); G.save.state.mode = 'basic'; G.rules.test.set({ yeon: y, saeng: s, tokens: tok ? [{ id: 'sinpyo', name: '옥가락지' }] : [] }); G.app.play('namwon_final'); }, [yeon, saeng, end === 'whole' || end === 'strange']);
    const r = await drive(page, {}, reachedEnd, {
      onButton: async (s) => { if (s.title === title && !r_shot[end]) { r_shot[end] = true; await page.waitForTimeout(400); await shot(end); } },
    });
    const got = await page.evaluate(() => G.save.state.ending);
    ok(r.ok && got === end && r.titles.includes(title) && r.titles.length === 1, `연 ${yeon}·생 ${saeng} → ${end} 「${title}」 (${got}, ${r.titles.join('/')})`);
    ok(await page.evaluate((e) => !!G.save.state.done['s:namwon_final:n-know-' + e] && Object.keys(G.save.state.done).filter((k) => k.startsWith('s:namwon_final:n-know-')).length === 1, end), `${end}: 알아보는 장면도 하나만`);
  }
  errs.forEach((e) => problems.push('[결말 ' + vpName + '] ' + e));
  ok(errs.length === 0, '오류·실패한 요청 없음' + (errs.length ? ': ' + errs.slice(0, 5).join(' | ') : ''));
  await ctx.close();
}

// ───────── 4) PC 화면 사진: 별 읽기 세 단계 · 항주·섬·남원 맵 ─────────
if (ONLY.includes('4')) {
  console.log('PC 1366×860 — 별 읽기와 맵 화면');
  const { ctx, page, errs, shot } = await open('desk', DESK);
  await page.waitForSelector('.title-screen h1');
  await page.evaluate(() => { G.save.reset(); G.save.state.mode = 'basic'; G.rules.test.set({ yeon: 7, saeng: 6, route: 'sea' }); G.save.state.place = 'sea'; G.app.explore(G.app.placeInfo('sea')); G.app.runSteps(PLACES.sea, ['s-stars']); });
  await page.waitForSelector('.sea-stars');
  await page.click('.ev-tray .btn.primary'); await page.click('.ev-tray .btn.primary');
  await page.waitForSelector('.sea-stars.ph-dipper .star.dipper.next');
  const hit = await page.evaluate(() => [...document.querySelectorAll('.star')].every((b) => { const r = b.getBoundingClientRect(); const t = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return t && t.closest('.star') === b; }));
  ok(hit, '별 읽기: 별 단추가 서로 덮지 않는다(PC)');
  // 차례가 아닌 별을 눌러도 잃는 것 없이 안내만
  const g0 = await page.evaluate(() => ({ y: G.save.state.yeon, s: G.save.state.saeng }));
  await page.click('.star.dipper[data-star="4"]');
  ok(await page.evaluate((g) => G.save.state.yeon === g.y && G.save.state.saeng === g.s && !!document.querySelector('.sg-nudge') && G.sea.test.stars().lit === 0, g0), '차례가 아닌 별을 눌러도 잃는 것 없이 안내만 뜬다');
  for (let i = 0; i < 4; i++) await page.click('.star.dipper.next');
  await page.waitForTimeout(400); await shot('stars_dipper');
  for (let i = 0; i < 3; i++) await page.click('.star.dipper.next');
  await page.waitForSelector('.sea-stars.ph-pole'); await page.waitForTimeout(1800); await shot('stars_pole');
  await page.click('.star.polaris');
  await page.waitForSelector('.sea-stars.ph-helm'); await page.waitForTimeout(600);
  await page.click('.helm-r'); await page.waitForTimeout(500); await shot('stars_helm');
  await page.click('.helm-r'); await page.click('.helm-r');
  await page.waitForSelector('.sea-stars.ph-done'); await page.waitForSelector('.ev-tray .btn.primary');
  await page.waitForTimeout(400); await shot('stars_done');
  ok(await page.evaluate(() => G.sea.test.stars().phase === 'ph-done' && document.querySelector('.helm').classList.contains('aligned')), '지남철: 뱃머리를 북동쪽(조선)에 맞추면 끝');
  while (await page.locator('.ev-tray .btn.primary').count()) { await page.click('.ev-tray .btn.primary'); await page.waitForTimeout(80); }
  ok(!(await page.evaluate(() => !!document.querySelector('.sea-stars'))), '별 단계가 끝나면 별하늘을 거둔다');
  // 맵 화면(맵 없이 펼치는 첫 목표는 건너뛴다)
  for (const [pid, mapShot, look] of [['hangzhou', 'map_hangzhou', null], ['sea', 'map_island', [14, 12, 'up']], ['namwon_final', 'map_namwon', [21, 13, 'right']]]) {
    await page.evaluate((p) => { G.save.reset(); G.save.state.mode = 'basic'; for (const b of PLACES[p].beats || []) if (b.auto) G.save.state.done['b:' + p + ':' + b.id] = true; G.app.play(p); }, pid);
    await page.waitForSelector('.place-card'); await page.waitForTimeout(500); await shot(mapShot + '_card');
    await page.click('.ev-tray .btn.primary');
    await page.waitForFunction(() => G.world.goal && G.world.goal() && !document.querySelector('.event.on, .dlg'), null, { timeout: 15000 }).catch(() => {});
    while (await page.locator('.dlg-tray .btn.primary').count()) { await page.click('.dlg-tray .btn.primary'); await page.waitForTimeout(120); }
    if (look) await page.evaluate((l) => G.world.test.look(...l), look);
    await page.waitForTimeout(3300); await shot(mapShot);
  }
  errs.forEach((e) => problems.push('[PC 화면] ' + e));
  ok(errs.length === 0, '오류·실패한 요청 없음' + (errs.length ? ': ' + errs.slice(0, 5).join(' | ') : ''));
  await ctx.close();
}

// ───────── 5) 카드 한 장이 스크롤 없이 다 보이는가(휴대폰 가로·PC × 처음 배우기·깊이 읽기) ─────────
if (ONLY.includes('5')) {
  for (const [vp, vpName] of [[PHONE, '휴대폰 가로'], [DESK, 'PC']]) {
    const { ctx, page, errs } = await open('cards', vp);
    await page.waitForSelector('.title-screen h1');
    for (const mode of ['basic', 'deep']) {
      const over = await page.evaluate(async (mode) => {
        G.save.reset(); G.save.state.mode = mode;
        G.app.explore({ name: '카드' });
        const res = [];
        for (const pid of ['interlude', 'hangzhou', 'sea', 'namwon_final']) {
          for (const st of PLACES[pid].steps) {
            let el = null;
            if (st.type === 'dilemma') el = G.steps.compareCard(st, st.options[0].id);
            else if (st.type === 'card') el = G.steps.infoCard(st.history ? G.rules.cardOf({ kind: 'history', id: st.history, place: pid, step: st.id }) : st.card, st.history ? 'history' : 'note');
            else if (st.type === 'dream') el = G.steps.dreamView({ kind: 'dream', lines: st.lines || null }, { zero: false, quote: st.quote });
            else continue;
            const c = G.app.openEvent({});
            c.el.classList.add('cardmode', 'rcardmode');
            c.main.appendChild(el);
            c.tray(G.util.h('div.actions', G.util.h('button.btn.primary', '다음 ▶')));
            await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
            const sc = c.el.querySelector('.ev-scroll');
            if (sc.scrollHeight - sc.clientHeight > 4) res.push(pid + '/' + st.id + ' +' + (sc.scrollHeight - sc.clientHeight) + 'px');
            c.close();
          }
        }
        return res;
      }, mode);
      ok(over.length === 0, `${vpName} · ${mode === 'deep' ? '깊이 읽기' : '처음 배우기'}: 2막 카드가 모두 스크롤 없이 한 장에 보인다` + (over.length ? ' — ' + over.join(', ') : ''));
    }
    errs.forEach((e) => problems.push('[카드 ' + vpName + '] ' + e));
    await ctx.close();
  }
}

await browser.close();
console.log(`\n점검 ${checks}개 · 문제 ${problems.length}개 · 화면 사진: tests/shots/T9/`); // END
for (const p of problems) console.log(' - ' + p);
process.exit(problems.length ? 1 : 0);
