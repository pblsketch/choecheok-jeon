// 1막 내용 점검(서막·남원·낭고야): cd tests && node act1.mjs
//  타이틀에서 이야기를 시작해 서막 → 남원 → 낭고야를 실제 화면으로 끝까지 놀아 본다(목표는 시험 손잡이로 이룬다).
//  여러 갈래로 놀고 매번 확인한다:
//   A 처음 배우기: 역사 카드 둘·포로 카드·일본말을 읽고, 신표 → 직접 묻기 → 배에 오름(생 0 → 쓰러짐: 떠올리는 글)
//   B 처음 배우기: 양식 → 침묵 → 남음(아무것도 읽지 않음)
//   C 처음 배우기: 돈우에게 두 번 말을 걸어 돈우 카드를 읽고, 신표 → 지혜의 길 → 배에 오름
//   D 깊이 읽기: 돈우 카드 없이 → 지혜의 길이 잠긴다(실마리 한 줄) · 생 1로 맞춘 뒤 직접 묻기 → 쓰러짐 · 대조 카드에 긴 원문
//  - 딜레마마다 게이지·조각·신표·지식이 맞게 바뀌는가 / 고정 장육불 꿈은 한 번만 / 딜레마 뒤 대조 카드(창작은 '원작에는 없는 장면')
//  - 낭고야 다음 거점은 안남 / 실제로 논 상태의 이어 하기 글자가 왕복한다(encode → decode → 같은 값, 다시 encode → 같은 글자)
//  - 장면마다 화면 사진: tests/shots/t7/(휴대폰 가로 844×390, PC 1366×860) · 콘솔 오류 0
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { base } from './serve.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SHOTS = path.join(HERE, 'shots', 't7');
fs.rmSync(SHOTS, { recursive: true, force: true });
fs.mkdirSync(SHOTS, { recursive: true });
const BASE = await base();
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const problems = [];
let checks = 0;
const ok = (cond, msg) => { checks++; if (!cond) problems.push(msg); console.log((cond ? '  ✓ ' : '  ✗ ') + msg); };
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const VIEWS = {
  phone: { width: 844, height: 390, isMobile: true, hasTouch: true, dpr: 2 },
  desktop: { width: 1366, height: 860, dpr: 1 },
};

async function open(vpName) {
  const vp = VIEWS[vpName];
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: !!vp.isMobile, hasTouch: !!vp.hasTouch, deviceScaleFactor: vp.dpr || 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  // 시험은 사람보다 훨씬 빨리 장면을 넘겨 배경음을 잇달아 바꾼다. 그때 브라우저가 받다 만 배경음 mp3를 끊는 ERR_ABORTED만은 허용한다(audio.mjs와 같은 기준)
  page.on('requestfailed', (r) => { const e = (r.failure() || {}).errorText || ''; if (/\/assets\/bgm\/[a-z_]+\.mp3$/.test(r.url()) && e === 'net::ERR_ABORTED') return; errs.push('requestfailed: ' + r.url() + ' ' + e); });
  page.on('response', (r) => { if (r.status() >= 400) errs.push('http ' + r.status() + ': ' + r.url()); });
  await page.goto(BASE);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector('.title-screen h1');
  await page.evaluate(() => { G.oldmap.fast = true; });
  return { ctx, page, errs };
}

const state = (page) => page.evaluate(() => JSON.parse(JSON.stringify(G.save.state)));

// 대화창(맵 위 작은 창)을 끝까지 넘긴다
async function closeDlg(page) {
  for (let i = 0; i < 30; i++) {
    const b = page.locator('.dlg .dlg-tray .btn.primary');
    if (!(await b.count())) break;
    await b.first().click().catch(() => {});
    await page.waitForTimeout(90);
  }
  await page.waitForTimeout(360); // 닫은 직후 E가 먹지 않는 짧은 틈
}
// 사람·자리 곁으로 옮겨 E로 말을 건다(실제 탐색 경로). 대화창을 끝까지 넘기고, 펼친 글을 돌려준다
async function talkTo(page, id, shot) {
  await page.evaluate((id) => G.world.test.teleport(id), id);
  await page.waitForTimeout(160);
  const near = await page.evaluate(() => G.world.test.near());
  await page.keyboard.press('KeyE');
  await page.waitForSelector('.dlg', { timeout: 4000 }).catch(() => {});
  let text = '';
  for (let i = 0; i < 30; i++) {
    const has = await page.locator('.dlg').count();
    if (!has) break;
    text = await page.textContent('.dlg').catch(() => text);
    if (shot && (await page.locator('.dlg .rcard').count())) { await shot(); shot = null; }
    const b = page.locator('.dlg .dlg-tray .btn.primary');
    if (await b.count()) await b.first().click().catch(() => {});
    await page.waitForTimeout(110);
  }
  await page.waitForTimeout(380);
  return { near, text };
}

// 한 갈래를 끝까지 논다. plan: { vp, mode, choices:{딜레마: 선택지}, onGoal(goal, map), beforeChoice(딜레마, page), shoot:true }
async function play(name, plan) {
  console.log(`\n${name} (${plan.vp}, ${plan.mode === 'deep' ? '깊이 읽기' : '처음 배우기'})`);
  const { ctx, page, errs } = await open(plan.vp);
  const seen = new Set();
  const out = { dil: {}, cards: {}, dream: [], collapse: {}, goals: [], cardsText: {}, shots: [] };
  let n = 0;
  const shot = async (label) => {
    if (!plan.shoot || seen.has('shot:' + label)) return;
    seen.add('shot:' + label);
    // 알림(신표·조각·지식)이 걷힌 뒤에 찍는다(시험은 사람보다 빨리 넘겨 알림이 쌓인다)
    await page.waitForFunction(() => !document.querySelector('.gettoast'), null, { timeout: 9000 }).catch(() => {});
    await page.waitForTimeout(260);
    const f = `${plan.vp}_${name}_${String(++n).padStart(2, '0')}_${label}.png`;
    await page.screenshot({ path: path.join(SHOTS, f) });
    out.shots.push(f);
  };
  await shot('title');
  await page.click('button:has-text("이야기 시작")');
  await page.click(`.sheet button:has-text("${plan.mode === 'deep' ? '깊이 읽기' : '처음 배우기'}")`);
  const t0 = Date.now();
  for (let it = 0; it < 900; it++) {
    const s = await page.evaluate(() => {
      const st = G.save.state;
      const q = (sel) => document.querySelector(sel);
      const g = G.world && G.world.goal ? G.world.goal() : null;
      const opts = [...document.querySelectorAll('.ev-tray .options .opt, .dlg-tray .options .opt')];
      return {
        place: st.place, done: Object.keys(st.done).filter((k) => k.startsWith('p:')),
        card: !!q('.event.on .place-card'), cardName: (q('.event.on .place-card .pc-name') || {}).textContent || '',
        notready: !!q('.place-card.notready'),
        opts: opts.length, optsLive: opts.some((b) => !b.disabled),
        next: !!q('.ev-tray .actions .btn.primary, .dlg-tray .actions .btn.primary'),
        om: !!q('.oldmap'), omBtn: !!q('.om-tray .btn.primary'),
        rcard: q('.ev-main .rcard') ? q('.ev-main .rcard').className : null,
        dream: q('.ev-main .rdream') ? q('.ev-main .rdream').className : null,
        goal: g ? { text: g.text, targets: g.targets } : null, busy: G.world ? G.world.busy : 0,
        map: G.world && G.world.test ? G.world.test.state().map : null,
        snap: Object.keys(st.snap || {})[0] || null,
        lineCard: !!q('.ev-main .says .card'),
      };
    });
    if (s.place === 'annam' && s.done.includes('p:nanggoya')) { out.reachedAnnam = true; break; }
    const stepId = s.snap ? s.snap.split(':').slice(2).join(':') : null;
    const placeId = s.snap ? s.snap.split(':')[1] : null;
    const step = stepId ? await page.evaluate(([p, id]) => { const x = (PLACES[p].steps || []).find((y) => y.id === id); return x ? { type: x.type, dilemma: x.dilemma || null, options: (x.options || []).map((o) => o.id) } : null; }, [placeId, stepId]) : null;
    if (s.card && !seen.has('card:' + s.cardName)) { seen.add('card:' + s.cardName); await shot('card_' + (s.place || 'x')); }
    if (s.opts && s.optsLive && step && step.type === 'dilemma') {
      const d = step.dilemma;
      if (!seen.has('dil:' + d)) {
        seen.add('dil:' + d);
        out.dil[d] = { before: await state(page) };
        if (plan.beforeChoice) await plan.beforeChoice(d, page, out);
        await shot('dilemma_' + d);
      }
      const want = plan.choices[d];
      const idx = step.options.indexOf(want);
      await page.locator('.ev-tray .options .opt').nth(idx).click();
      await page.waitForTimeout(150);
      continue;
    }
    if (s.dream && !seen.has('dream:' + s.snap)) {
      seen.add('dream:' + s.snap);
      out.dream.push({ cls: s.dream, step: stepId, st: await state(page), text: await page.textContent('.ev-main .rdream') });
      await shot('dream_' + (s.dream.includes('recall') ? 'recall' : 'dream'));
    }
    if (s.rcard && step && step.type === 'dilemma' && !seen.has('cmp:' + step.dilemma)) {
      seen.add('cmp:' + step.dilemma);
      out.cards[step.dilemma] = { cls: s.rcard, text: await page.textContent('.ev-main .rcard'), after: await state(page) };
      await shot('compare_' + step.dilemma);
    }
    if (s.next) {
      if (s.snap && !seen.has('step:' + s.snap)) { seen.add('step:' + s.snap); await shot('step_' + stepId); }
      if (s.snap && s.lineCard && !seen.has('linecard:' + s.snap)) { seen.add('linecard:' + s.snap); await shot('linecard_' + stepId); }
      await page.locator('.ev-tray .actions .btn.primary, .dlg-tray .actions .btn.primary').first().click().catch(() => {});
      await page.waitForTimeout(70);
      continue;
    }
    if (s.omBtn) { await shot('oldmap_' + s.place); await page.click('.om-tray .btn.primary').catch(() => {}); await page.waitForTimeout(200); continue; }
    if (s.goal && !s.busy && !s.om) {
      const key = s.map + ':' + s.goal.text;
      if (!seen.has('goal:' + key)) {
        seen.add('goal:' + key);
        out.goals.push({ map: s.map, text: s.goal.text, targets: s.goal.targets });
        await page.waitForTimeout(500);
        await shot('map_' + s.map + '_' + s.goal.targets.join('-'));
        if (plan.onGoal) await plan.onGoal(s.goal, s.map, page, out, (l) => shot(l));
      }
      await page.evaluate(() => G.world.test.complete());
      await page.waitForTimeout(150);
      continue;
    }
    await page.waitForTimeout(120);
  }
  out.final = await state(page);
  out.secs = Math.round((Date.now() - t0) / 1000);
  // 이어 하기 글자 왕복(실제로 논 상태)
  out.code = await page.evaluate(() => {
    const st = G.save.state;
    const code = G.code.encode(st);
    const dec = G.code.decode(code);
    return { code, again: dec.error ? null : G.code.encode(dec), dec: JSON.parse(JSON.stringify(dec)) };
  });
  if (plan.after) await plan.after(page, out, (l) => shot(l));
  errs.forEach((e) => problems.push(`[${name}] ${e}`));
  ok(errs.length === 0, `${name}: 콘솔 오류·실패한 요청 없음` + (errs.length ? ': ' + errs.slice(0, 4).join(' | ') : ''));
  await ctx.close();
  return out;
}

const g = (st) => ({ y: st.yeon, s: st.saeng });
const fragKeys = (st) => Object.keys(st.frags || {}).sort().join(',');
const tok = (st) => (st.tokens || []).map((t) => t.id || t);
function common(name, out) {
  ok(out.reachedAnnam, `${name}: 서막 → 남원 → 낭고야를 끝까지 지나 다음 거점이 안남이다 (${out.secs}초)`);
  ok(out.dream.filter((d) => d.step === 'g-dream').length <= 1, `${name}: 고정 장육불 꿈은 한 번만 펼쳐진다`);
  for (const d of ['d-namwon-flee', 'd-nanggoya-news']) {
    const c = out.cards[d];
    ok(c && /fiction/.test(c.cls) && c.text.includes('원작에는 없는 장면'), `${name}: ${d} 뒤 대조 카드(게임 창작 — "원작에는 없는 장면")`);
  }
  const c = out.cards['d-nanggoya-ship'];
  ok(c && /orig/.test(c.cls) && c.text.includes('原作') && c.text.includes('사간'), `${name}: d-nanggoya-ship 뒤 대조 카드(원작 — 돈우가 \'사간\'을 배에 태운다)`);
  ok(eq(out.goals.map((x) => x.map).filter((v, i, a) => a.indexOf(v) === i), ['home', 'yeongok', 'house', 'pier']), `${name}: 맵 차례 남원 옛집 → 연곡 → 돈우의 집 → 포구`);
}
function roundTrip(name, out) {
  const st = out.final, d = out.code.dec;
  const act1Know = ['h-namwon-war', 'h-namwon-ming', 'h-nanggoya-captives', 'h-nanggoya-donwoo', 'h-annam-trade', 'k-japanese'];
  const kn = (x) => act1Know.filter((k) => (x.know || {})[k]);
  const tr = (x) => (x.trail || []).filter((t) => ['start', 'namwon', 'nanggoya'].includes(t.place)).map((t) => [t.place, t.yeon, t.saeng]);
  ok(out.code.code && out.code.code.length === 6 && out.code.again === out.code.code, `${name}: 이어 하기 글자 ${out.code.code} → 되살려 다시 담으면 같은 글자`);
  ok(d.yeon === st.yeon && d.saeng === st.saeng, `${name}: 되살린 연·생이 실제로 논 값과 같다 (${st.yeon}/${st.saeng} ↔ ${d.yeon}/${d.saeng})`);
  ok(eq(d.choices, st.choices) && eq(kn(d), kn(st)), `${name}: 되살린 선택·지식이 같다`);
  ok(eq(d.frags, st.frags) && eq(tok(d), tok(st)), `${name}: 되살린 시구 조각·신표가 같다`);
  ok(d.jangyuk === st.jangyuk && d.dreamSeen === st.dreamSeen, `${name}: 되살린 장육불 횟수·꿈 기록이 같다 (${st.jangyuk})`);
  ok(eq(tr(d), tr(st)), `${name}: 되살린 거점 기록(출발·남원·낭고야)이 같다`);
}

// ───────── A ─────────
{
  const out = await play('A', {
    vp: 'phone', mode: 'basic', shoot: true,
    choices: { 'd-namwon-flee': 'sinpyo', 'd-nanggoya-news': 'ask', 'd-nanggoya-ship': 'board' },
    async onGoal(goal, map, page, o, shot) {
      if (goal.targets.includes('hut')) {
        const a = await talkTo(page, 'escapee');
        const b = await talkTo(page, 'escapee', () => shot('history_dialog_war'));
        o.war = { a, b, st: await state(page) };
        await talkTo(page, 'father');
        await talkTo(page, 'father');
        o.ming = await state(page);
      }
      if (goal.targets.includes('porter')) {
        await talkTo(page, 'elder');
        await talkTo(page, 'elder');
        o.japanese = await talkTo(page, 'market', () => shot('know_japanese'));
        await shot('know_japanese_after');
        o.afterExplore = await state(page);
      }
    },
  });
  common('A', out);
  ok(out.war && out.war.a.near && out.war.a.near.id === 'escapee' && !out.war.a.text.includes('정유재란'), 'A: 처음 말을 걸면 이야기를 미끼로만 건넨다(카드 없음)');
  ok(out.war && out.war.b.text.includes('정유재란') && out.war.st.know['h-namwon-war'] && out.war.st.cards.some((c) => c.id === 'h-namwon-war'), 'A: 한 번 더 말을 걸면 역사 카드(정유재란과 남원성 함락) → 지식 + 수첩');
  ok(out.ming && out.ming.know['h-namwon-ming'], 'A: 최숙에게 두 번 말을 걸면 명군 카드(h-namwon-ming)');
  const f = out.dil['d-namwon-flee'], fa = out.cards['d-namwon-flee'].after;
  ok(eq(g(f.before), { y: 5, s: 5 }) && eq(g(fa), { y: 7, s: 3 }), `A: 신표 → 연 +2·생 −2 (${f.before.yeon}/${f.before.saeng} → ${fa.yeon}/${fa.saeng})`);
  ok(fragKeys(fa) === '1,2' && tok(fa).includes('sinpyo') && fa.flags.tongsoMemory, 'A: 회상에서 조각 1·퉁소 가락, 신표로 조각 2와 신표');
  const dr = out.dream.find((d) => d.step === 'g-dream');
  ok(dr && dr.st.yeon === 8 && dr.st.saeng === 3 && dr.text.includes('愼無死') && dr.st.dreamSeen, 'A: 낭고야 고정 장육불 꿈 연 +1(장육불의 말이 가운데)');
  ok(out.afterExplore && out.afterExplore.know['h-nanggoya-captives'] && out.afterExplore.know['k-japanese'] && out.japanese.text.includes('일본말'), 'A: 포구 탐색 — 포로 카드, 장꾼들 흥정에 귀 기울여 일본말(k-japanese)');
  const na = out.cards['d-nanggoya-news'].after;
  ok(eq(g(na), { y: 10, s: 1 }) && fragKeys(na) === '1,2,3', `A: 직접 묻기 → 연 +2·생 −2, 조각 3 (${na.yeon}/${na.saeng})`);
  const rec = out.dream.find((d) => /recall/.test(d.cls));
  ok(rec && rec.st.saeng === 3 && rec.st.jangyuk === 1 && rec.st.wisdomUsed.nanggoya === 'lost', 'A: 배에 오름(생 −2)으로 생 0 → 쓰러짐(꿈을 이미 봤으니 떠올리는 글), 생 3, 지혜의 길 닫힘');
  ok(out.final.yeon === 10 && out.final.saeng === 3 && out.final.choices['d-nanggoya-ship'] === 'board', `A: 낭고야 끝 연 10·생 3 (${out.final.yeon}/${out.final.saeng})`);
  ok(out.dream.filter((d) => d.step === 'g-dream').length === 1, 'A: 고정 꿈은 쓰러짐과 따로 한 번만');
  roundTrip('A', out);
}

// ───────── B ─────────
{
  const out = await play('B', { vp: 'desktop', mode: 'basic', shoot: true, choices: { 'd-namwon-flee': 'food', 'd-nanggoya-news': 'silent', 'd-nanggoya-ship': 'stay' } });
  common('B', out);
  const fa = out.cards['d-namwon-flee'].after;
  ok(eq(g(fa), { y: 3, s: 7 }) && fragKeys(fa) === '1' && !tok(fa).includes('sinpyo'), `B: 양식 → 연 −2·생 +2, 신표·조각 2 없음 (${fa.yeon}/${fa.saeng})`);
  const na = out.cards['d-nanggoya-news'].after;
  ok(eq(g(na), { y: 2, s: 9 }) && !na.frags[3], `B: 꿈(+1) 뒤 침묵 → 연 −2·생 +2, 조각 3 없음 (${na.yeon}/${na.saeng})`);
  ok(out.final.yeon === 0 && out.final.saeng === 10 && out.final.jangyuk === 0, `B: 남음 → 연 0·생 10(잘림), 쓰러짐 없음 (${out.final.yeon}/${out.final.saeng})`);
  ok(Object.keys(out.final.know || {}).length === 0, 'B: 아무것도 읽지 않으면 지식 없음');
  ok(out.cards['d-nanggoya-ship'].text.includes('사간') && out.final.choices['d-nanggoya-ship'] === 'stay', 'B: 남아도 원작 대조 카드(배에 오른 원작)를 본다');
  roundTrip('B', out);
}

// ───────── C ─────────
{
  const out = await play('C', {
    vp: 'desktop', mode: 'basic', shoot: true,
    choices: { 'd-namwon-flee': 'sinpyo', 'd-nanggoya-news': 'wisdom', 'd-nanggoya-ship': 'board' },
    async onGoal(goal, map, page, o, shot) {
      if (goal.targets.includes('porter')) {
        o.d1 = await talkTo(page, 'donwoo');
        o.d2 = await talkTo(page, 'donwoo', () => shot('history_dialog_donwoo'));
        o.afterDon = await state(page);
      }
    },
    async beforeChoice(d, page, o) {
      if (d === 'd-nanggoya-news') o.newsOpts = await page.evaluate(() => [...document.querySelectorAll('.ev-tray .options .opt')].map((b) => ({ cls: b.className, dis: b.disabled, t: b.textContent })));
    },
  });
  common('C', out);
  ok(out.d1 && out.d1.near && out.d1.near.id === 'donwoo' && !out.afterDon.know['h-nanggoya-captives'], 'C: 포구의 돈우에게 말을 건다');
  ok(out.d2.text.includes('不殺生') && out.afterDon.know['h-nanggoya-donwoo'], 'C: 두 번째 말에 돈우 카드(頓于老倭本不殺生) → 지식');
  const w = (out.newsOpts || []).find((x) => /t-wisdom/.test(x.cls));
  ok(w && !w.dis && !/locked/.test(w.cls) && w.t.includes('지혜의 길'), 'C: 돈우 카드를 읽었으니 지혜의 길이 열려 있다');
  const na = out.cards['d-nanggoya-news'].after;
  ok(eq(g(na), { y: 9, s: 4 }) && fragKeys(na) === '1,2,3' && na.wisdomUsed.nanggoya === 'd-nanggoya-news', `C: 지혜의 길 → 연 +1·생 +1, 조각 3 (${na.yeon}/${na.saeng})`);
  ok(out.final.yeon === 10 && out.final.saeng === 2 && out.final.jangyuk === 0, `C: 배에 오름 → 연 10·생 2, 쓰러짐 없음 (${out.final.yeon}/${out.final.saeng})`);
  roundTrip('C', out);
}

// ───────── D ─────────
{
  const out = await play('D', {
    vp: 'phone', mode: 'deep', shoot: true,
    choices: { 'd-namwon-flee': 'food', 'd-nanggoya-news': 'ask', 'd-nanggoya-ship': 'stay' },
    async beforeChoice(d, page, o) {
      if (d === 'd-nanggoya-news') {
        o.newsOpts = await page.evaluate(() => [...document.querySelectorAll('.ev-tray .options .opt')].map((b) => ({ cls: b.className, dis: b.disabled, t: b.textContent })));
        await page.evaluate(() => G.rules.test.set({ saeng: 1 }));
      }
    },
  });
  common('D', out);
  const w = (out.newsOpts || []).find((x) => /t-wisdom/.test(x.cls));
  ok(w && w.dis && /locked/.test(w.cls) && w.t.includes('돈우가 무엇을 믿고'), `D: 돈우 카드 없이 지혜의 길은 잠기고 실마리 한 줄 ("${w ? w.t.replace(/\s+/g, ' ').slice(0, 60) : ''}")`);
  ok(out.cards['d-namwon-flee'].text.includes('行到求禮'), 'D: 깊이 읽기 — 피란 대조 카드에 긴 원문(quoteLong)');
  ok(out.cards['d-nanggoya-ship'].text.includes('閩浙') && out.cards['d-nanggoya-ship'].text.includes('占星候潮'), 'D: 깊이 읽기 — 장삿배 대조 카드에 긴 원문');
  ok(!out.cards['d-namwon-flee'].text.includes('굶주림이 최척을'), 'D: 깊이 읽기에서는 처음 배우기용 풀이 덧붙임(extraGloss)이 빠진다');
  const rec = out.dream.find((d) => /recall/.test(d.cls));
  ok(rec && rec.st.saeng === 3 && rec.st.jangyuk === 1, 'D: 생 1에서 직접 묻기(생 −2) → 쓰러짐(떠올리는 글), 생 3으로');
  const na = out.cards['d-nanggoya-news'].after;
  ok(na.yeon === 6 && na.saeng === 3 && na.frags[3], `D: 쓰러져도 고른 길(연 +2, 조각 3)은 남는다 (${na.yeon}/${na.saeng})`);
  ok(out.final.yeon === 4 && out.final.saeng === 5, `D: 남음 → 연 4·생 5 (${out.final.yeon}/${out.final.saeng})`);
  ok(out.dream.filter((d) => d.step === 'g-dream').length === 1, 'D: 고정 꿈은 한 번만');
}

await browser.close();
console.log(`\n점검 ${checks}개 · 문제 ${problems.length}개 · 화면 사진: tests/shots/t7/`);
if (problems.length) { console.log('\n문제:'); problems.forEach((p) => console.log(' - ' + p)); process.exit(1); }
