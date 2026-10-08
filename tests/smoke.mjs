// 화면 틀 점검: cd tests && npm install && node smoke.mjs
//  - 휴대폰 가로(844×390, 터치) · PC(1366×860) · 휴대폰 세로(390×844) · 파일로 열기(file://)
//  - 타이틀이 뜨는가(그림) / 세로면 "가로로 돌려 주세요" / 시험 맵에서 옥영이 걷는가(키보드·조이스틱)
//  - 탐색 화면: 맵이 화면 전체 + 구석 HUD(초상·게이지 / 미션 / 수첩·지도·전체 화면·설정 / 조이스틱 / 행동 단추)가 서로 겹치지 않는가
//  - 전체 화면 단추(타이틀·HUD·설정): 누르면 requestFullscreen(점검에서는 가짜로 바꿔 끼움), fullscreenchange마다 그림·이름이 바뀜,
//    지원하지 않는 브라우저에서는 단추가 없고 설정에 '홈 화면에 추가' 안내
//  - 테마 견본 맵 다섯(마을·포구·밤 항구·정원·섬)이 오류 없이 그려지는가 / 신표·시구 조각 알림
//  - 고지도: 그림 위 거점이 실제 지리 차례(서쪽 안남·항주 → 조선 → 일본)인가, 2막 뱃길 고르기
//  - 사건 모드(게이지 띠·선택지·등록 안 된 단계의 '준비 중') / 빈 거점 '준비 중' → 고지도로 다음 거점
//  - 콘솔 오류·페이지 오류·실패한 요청이 하나도 없어야 한다
// 게임 폴더는 테스트가 스스로 서빙한다(serve.mjs). 이미 설치된 크롬을 쓴다.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { base } from './serve.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SHOTS = path.join(HERE, 'shots', 'smoke');
fs.rmSync(SHOTS, { recursive: true, force: true });
fs.mkdirSync(SHOTS, { recursive: true });
const BASE = await base();
const FILE_URL = pathToFileURL(path.resolve(HERE, '..', 'index.html')).href;

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const problems = [];
let checks = 0;
const ok = (cond, msg) => { checks++; if (!cond) problems.push(msg); console.log((cond ? '  ✓ ' : '  ✗ ') + msg); };

async function open(name, vp, url = BASE) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: !!vp.isMobile, hasTouch: !!vp.hasTouch, deviceScaleFactor: vp.dpr || 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  page.on('requestfailed', (r) => errs.push('requestfailed: ' + r.url() + ' ' + ((r.failure() || {}).errorText || '')));
  page.on('response', (r) => { if (r.status() >= 400) errs.push('http ' + r.status() + ': ' + r.url()); });
  const shot = (n) => page.screenshot({ path: path.join(SHOTS, name + '_' + n + '.png') });
  await page.goto(url);
  await page.evaluate(() => localStorage.clear());
  return { ctx, page, errs, shot };
}
const visible = (page, sel) => page.locator(sel).first().isVisible().catch(() => false);
//  맵이 멈춘 동안(판·사건 화면·대화창)에는 키를 받지 않으므로 멈춤이 풀린 뒤 누른다. 짐이 많은 기계에서는 프레임이 드물게 와
//  정한 시간 안에 덜 걸을 수 있어, 거의 움직이지 않았으면 조금 더 누르고 있는다(최대 정한 시간의 4배)
async function walk(page, key, ms) {
  await page.waitForFunction(() => G.world.test.state().x != null && !G.world.test.state().paused, null, { timeout: 8000 }).catch(() => {});
  const a = await page.evaluate(() => G.world.test.state());
  await page.keyboard.down(key);
  await page.waitForTimeout(ms);
  await page.waitForFunction(([a, ms]) => { const b = G.world.test.state(); return Math.abs(b.x - a.x) + Math.abs(b.y - a.y) > 24; }, [a, ms], { timeout: ms * 3 }).catch(() => {});
  await page.keyboard.up(key);
  await page.waitForTimeout(80);
  const b = await page.evaluate(() => G.world.test.state());
  return { a, b };
}

// 맵 네 구석 끝에 사람을 세우고, 옥영을 그 곁에 데려가 카메라가 맞춘 뒤 사람(이름표 자리 포함)이 HUD와 겹치는지 본다
async function hudClear(page) {
  await page.evaluate(() => {
    PLACES.__hud = { maps: { hud_edges: { name: '구석 점검', grid: G.world.mk(40, 24, '.', [['border', 'h']]), npcs: {
      tl: { sp: 'sp_merchant_ming', name: '왼쪽 위', x: 1, y: 1, talk: [['…']] }, tr: { sp: 'sp_merchant_ming', name: '오른쪽 위', x: 38, y: 1, talk: [['…']] },
      bl: { sp: 'sp_merchant_ming', name: '왼쪽 아래', x: 1, y: 22, talk: [['…']] }, br: { sp: 'sp_merchant_ming', name: '오른쪽 아래', x: 38, y: 22, talk: [['…']] },
      tc: { sp: 'sp_merchant_ming', name: '가운데 위', x: 20, y: 1, talk: [['…']] } } } } };
  });
  await page.evaluate(() => G.world.test.enter('hud_edges', { name: '구석 점검', mission: '최척을 다시 만나라.' }));
  await page.waitForTimeout(300);
  const bad = [];
  for (const [id, tx, ty] of [['tl', 2, 2], ['tr', 37, 2], ['bl', 2, 21], ['br', 37, 21], ['tc', 20, 2]]) {
    await page.evaluate(([tx, ty]) => G.world.test.look(tx, ty), [tx, ty]);
    await page.waitForTimeout(700);
    const hit = await page.evaluate((id) => {
      const n = G.world.test.screenOf(id);
      const over = (a, b) => !(a.r <= b.left || b.right <= a.l || a.b <= b.top || b.bottom <= a.t);
      return ['.hud-tl', '.mission', '.hud-tr', '.hud-tr .fs-toggle', '.pad .pbtn', '.joy-rest'].filter((s) => { const e = document.querySelector(s); return e && e.offsetParent !== null && over(n, e.getBoundingClientRect()); });
    }, id);
    if (hit.length) bad.push(id + '↔' + hit.join(','));
  }
  if (bad.length) console.log('    겹침: ' + bad.join(' / '));
  return bad.length === 0;
}

// 오른쪽 위 아이콘 묶음(수첩·지도·전체 화면·설정, 선생님용이면 목표 건너뛰기까지)이 화면 안에 있고 다른 HUD와 겹치지 않는가
async function hudLayout(page) {
  return page.evaluate(() => {
    const r = (s) => { const e = document.querySelector(s); if (!e || e.offsetParent === null) return null; const b = e.getBoundingClientRect(); return { l: b.left, t: b.top, r: b.right, b: b.bottom }; };
    const L = { vw: innerWidth, vh: innerHeight, tl: r('.hud-tl'), mi: r('.mission'), tr: r('.hud-tr'), fs: r('.hud-tr .fs-toggle'), pad: r('.pad .pbtn') };
    const apart = (a, b) => !a || !b || a.r <= b.l || b.r <= a.l || a.b <= b.t || b.b <= a.t;
    const inside = (a) => !!a && a.l >= 0 && a.t >= 0 && a.r <= L.vw + 0.5 && a.b <= L.vh + 0.5;
    L.ok = !!L.fs && inside(L.fs) && inside(L.tr) && apart(L.fs, L.mi) && apart(L.fs, L.tl) && apart(L.tr, L.mi) && apart(L.tr, L.tl) && apart(L.fs, L.pad);
    return L;
  });
}

// ───────── 1) 휴대폰 가로 ─────────
{
  console.log('휴대폰 가로 844×390');
  const { ctx, page, errs, shot } = await open('phone', { width: 844, height: 390, isMobile: true, hasTouch: true, dpr: 2 });
  await page.reload();
  await page.waitForSelector('.title-screen h1');
  ok((await page.textContent('.title-screen h1')).includes('두 개의 항로'), '타이틀 "두 개의 항로"가 뜬다');
  ok(!(await visible(page, '#rotate')), '가로 화면에서는 세로 안내가 숨어 있다');
  ok(await visible(page, 'button:has-text("이야기 시작")'), '"이야기 시작" 단추');
  ok(await visible(page, 'text=이어폰을 끼면 더 잘 들려요'), '"이어폰을 끼면 더 잘 들려요" 안내');
  for (const t of ['이어 하기 글자 넣기', '이야기 수첩', '만든 사람·출처']) ok(await visible(page, `button:has-text("${t}")`), `"${t}" 단추`);
  await shot('01_title');
  ok(await page.evaluate(() => { const im = document.querySelector('.title-art img'); return !!im && im.complete && im.naturalWidth > 0; }), '타이틀 그림이 뜬다');
  ok(await visible(page, '.title-tools .fs-toggle'), '타이틀 오른쪽 위: 전체 화면 단추(배경음·설정 곁)');
  // 수첩: 아직 등록 안 됨 → 신표·시구 조각만 보이는 얇은 수첩
  await page.click('button:has-text("이야기 수첩")');
  ok(await visible(page, '.sheet .pocket-view'), '이야기 수첩(미등록) → 신표·시구 조각 판');
  await page.click('.sheet .actions .btn.primary');
  // 설정
  await page.click('.title-tools [aria-label="설정"]');
  for (const t of ['글자 크기', '소리(효과음)', '배경음', '선생님용']) ok(await visible(page, `.sheet .seg-l:has-text("${t}")`), `설정: ${t}`);
  await shot('02_settings');
  await page.click('.sheet .actions .btn.primary');

  // 시험 맵: 키보드로 걷기
  await page.evaluate(() => G.world.test.enter());
  await page.waitForSelector('canvas.wcv');
  await page.waitForTimeout(300);
  const lay = await page.evaluate(() => {
    const r = (s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return { l: b.left, t: b.top, r: b.right, b: b.bottom, w: b.width, h: b.height }; };
    return { vw: innerWidth, vh: innerHeight, map: r('.mapwrap'), tl: r('.hud-tl'), mi: r('.mission'), tr: r('.hud-tr'), pad: r('.pad .pbtn'), joy: r('.joy-zone'), face: r('.hud-face img') };
  });
  const apart = (a, b) => a.r <= b.l || b.r <= a.l || a.b <= b.t || b.b <= a.t;
  ok(lay.map.w >= lay.vw - 1 && lay.map.h >= lay.vh - 1, `맵이 화면 전체를 채운다 (${Math.round(lay.map.w)}×${Math.round(lay.map.h)})`);
  ok(lay.tl.l < lay.vw * 0.1 && lay.tl.t < lay.vh * 0.1, '왼쪽 위: 초상·게이지');
  ok(Math.abs((lay.mi.l + lay.mi.r) / 2 - lay.vw / 2) < 4 && lay.mi.t < lay.vh * 0.1, '가운데 위: 한 문장 미션');
  ok(lay.tr.r > lay.vw * 0.9 && lay.tr.t < lay.vh * 0.1, '오른쪽 위: 수첩·지도·설정');
  ok(lay.pad.r > lay.vw * 0.85 && lay.pad.b > lay.vh * 0.8, '오른쪽 아래: 행동 단추');
  ok(lay.joy.l === 0 && lay.joy.b >= lay.vh - 1, '왼쪽 아래: 조이스틱 자리');
  ok(apart(lay.tl, lay.mi) && apart(lay.mi, lay.tr) && apart(lay.tl, lay.tr) && apart(lay.pad, lay.tr) && apart(lay.pad, lay.mi), 'HUD 부품이 서로 겹치지 않는다');
  ok(await page.evaluate(() => { const im = document.querySelector('.hud-face img'); return im.complete && im.naturalWidth > 0; }), '옥영의 작은 초상이 뜬다');
  ok(await visible(page, '.joy-rest'), '터치 화면: 쉬고 있는 조이스틱이 보인다');
  ok((await page.textContent('.mission .mi-text')).includes('최척을 다시 만나라'), '미션 "최척을 다시 만나라."');
  let w = await walk(page, 'ArrowRight', 600);
  ok(w.b.x > w.a.x + 20, `방향키로 오른쪽으로 걷는다 (${Math.round(w.a.x)} → ${Math.round(w.b.x)})`);
  w = await walk(page, 'KeyS', 400);
  ok(w.b.y > w.a.y + 10, `S 키로 아래로 걷는다 (${Math.round(w.a.y)} → ${Math.round(w.b.y)})`);
  // 조이스틱(맵 왼쪽 아래를 눌러 끌기)
  const z = await page.locator('.joy-zone').boundingBox();
  const before = await page.evaluate(() => G.world.test.state());
  await page.mouse.move(z.x + 80, z.y + z.height - 70);
  await page.mouse.down();
  await page.mouse.move(z.x + 80, z.y + z.height - 130, { steps: 4 });
  await page.waitForTimeout(500);
  const mid = await page.evaluate(() => G.world.test.state());
  await page.mouse.up();
  ok(mid.y < before.y - 10, `조이스틱으로 위로 걷는다 (${Math.round(before.y)} → ${Math.round(mid.y)})`);
  const spriteFallback = await page.evaluate(() => { const ns = G.world.test.npcs(); return ns.some((n) => n.spriteMissing) && ns.every((n) => n.spriteMissing === !SPRITES[n.sp]); });
  ok(spriteFallback, '스프라이트가 없는 사람도 오류 없이 그린다(단색 사람 모양)');
  // 말 걸기: 시험 상인에게 데려가서 E
  await page.evaluate(() => { const n = G.world.test.npcs()[0]; G.world.test.teleport(n.id); });
  await page.evaluate(() => { const n = G.world.test.npcs()[0]; const s = G.world.test.state(); return [n, s]; });
  await page.keyboard.press('ArrowUp');
  await page.waitForTimeout(200);
  await shot('03_map');
  await page.keyboard.press('KeyE');
  await page.waitForTimeout(200);
  if (await visible(page, '.dlg')) { ok(true, '말 걸기 대화창이 뜬다'); await shot('04_talk'); await page.click('.dlg-tray .btn.primary'); }
  else ok(!!(await page.evaluate(() => G.world.test.near())) === false, '(가까운 사람이 없어 대화창 없음 — 위치 확인)');

  // 사건 모드: 시험 거점 단계(say · choice(게이지) · 등록 안 된 단계)
  await page.evaluate(() => {
    window.__ran = G.app.runSteps({ id: '__smoke', steps: [
      { id: 'a', type: 'say', scene: 'sc_none', lines: ['남원성에 불길이 치솟았다.', { who: 'choecheok', t: '이 옷을 입으시오.' }] },
      { id: 'b', type: 'choice', q: '무엇을 들고 갈까?', options: [{ t: '신표를 챙긴다', gauge: { yeon: 2, saeng: -1 }, token: { id: 'tok', name: '신표' } }, { t: '양식을 챙긴다', gauge: { saeng: 2, yeon: -1 } }, { t: '둘 다 조금씩', gauge: { yeon: 1, saeng: 1 } }] },
      { id: 'c', type: 'dilemma' },
    ] }, null).then(() => (window.__ranDone = true));
  });
  await page.waitForSelector('.event.on');
  await page.waitForTimeout(400);
  ok(await visible(page, '.gstrip'), '사건 모드: 위쪽 게이지 띠가 보인다');
  ok(!(await visible(page, '.panel')) || (await page.evaluate(() => getComputedStyle(document.querySelector('.gstrip')).display)) === 'flex', '사건 모드: 패널이 띠로 접힌다');
  ok(await visible(page, '.ev-art .blank-paper'), '삽화 파일이 없으면 빈 종이 판');
  await page.click('.ev-tray .btn.primary'); // 첫 줄
  await page.waitForTimeout(150);
  await page.click('.ev-tray .btn.primary'); // 둘째 줄
  await page.waitForSelector('.ev-tray .opt');
  const optBox = await page.locator('.ev-tray .opt').first().boundingBox();
  ok(optBox.y > 390 * 0.55 && optBox.height >= 44, `선택지가 아래 엄지 자리에 넉넉하게 (y=${Math.round(optBox.y)}, h=${Math.round(optBox.height)})`);
  ok((await page.locator('.ev-tray .opt').count()) === 3, '선택지 3개가 나란히');
  await shot('05_event_choice');
  await page.click('.ev-tray .opt >> nth=0');
  await page.waitForTimeout(300);
  ok(await visible(page, '.gettoast.token:has-text("신표")'), '신표를 얻으면 화면 가운데에 크게 알린다');
  await shot('06_event_gauge');
  const g1 = await page.evaluate(() => ({ y: G.save.state.yeon, s: G.save.state.saeng, t: G.save.state.tokens.length, num: document.querySelector('.gstrip .gnum').textContent }));
  ok(g1.y === 7 && g1.s === 4 && g1.t === 1, `선택 뒤 게이지가 바뀐다(연 ${g1.y}, 생 ${g1.s}, 신표 ${g1.t})`);
  ok(g1.num === '', '학생 화면에서는 게이지 숫자가 안 보인다');
  await page.click('.ev-tray .btn.primary');
  await page.waitForSelector('.card.notready');
  ok(true, '등록 안 된 단계(dilemma)는 오류 없이 "준비 중"');
  await shot('07_notready_step');
  await page.click('.ev-tray .btn.primary');
  await page.waitForFunction(() => window.__ranDone === true);
  ok(!(await visible(page, '.event.on')), '단계가 끝나면 사건 화면이 닫힌다');

  // 테마 견본 맵 다섯: 오류 없이 그려지고 테마가 맞는가
  for (const id of ['demo_village', 'demo_port', 'demo_harbor_night', 'demo_garden', 'demo_island']) {
    await page.evaluate((id) => G.world.test.enter(id, { name: '견본', mission: '최척을 다시 만나라.' }), id);
    await page.waitForTimeout(250);
    const st = await page.evaluate(() => ({ id: G.world.test.map().id, night: G.world.test.map().night }));
    ok(st.id === id && (id !== 'demo_harbor_night' || st.night), `테마 견본 맵 ${id}${st.night ? '(밤)' : ''}`);
  }
  await shot('07b_theme_island');
  // HUD 안전 여백: 맵 네 구석 끝에 선 사람과 이름표가 HUD(초상·미션·아이콘·조이스틱·행동 단추) 밑에 숨지 않는다
  ok(await hudClear(page), 'HUD 밑에 숨는 사람·이름표가 없다(휴대폰 가로)');
  {
    let L = await hudLayout(page);
    ok(L.ok, `오른쪽 위 전체 화면 단추가 화면 안에 있고 미션·초상과 겹치지 않는다(휴대폰 가로, 단추 ${L.fs ? Math.round(L.fs.l) + '~' + Math.round(L.fs.r) : '없음'})`);
    await page.evaluate(() => { G.save.state.teacher = true; G.app.applySettings(); });
    await page.waitForTimeout(100);
    L = await hudLayout(page);
    ok(L.ok, `선생님용(목표 건너뛰기까지 다섯 단추)이어도 오른쪽 위 묶음이 미션과 겹치지 않는다(휴대폰 가로, 미션 오른쪽 ${L.mi ? Math.round(L.mi.r) : '-'} · 묶음 왼쪽 ${L.tr ? Math.round(L.tr.l) : '-'})`);
    await shot('03b_hud_teacher');
    await page.evaluate(() => { G.save.state.teacher = false; G.app.applySettings(); });
  }
  // 시구 조각 알림
  await page.evaluate(() => { delete G.save.state.frags[1]; G.hud.setFrag(1, true); });
  await page.waitForTimeout(200);
  ok(await visible(page, '.gettoast.frag:has-text("王子吹簫月欲低"):has-text("왕자진이 퉁소 부는 밤")'), '시구 조각을 얻으면 원문과 풀이를 함께 크게 알린다');
  await page.waitForFunction(() => !document.querySelector('.gettoast'), null, { timeout: 8000 });
  // 오른쪽 위 '지도': 고지도를 겹쳐 본다
  await page.click('.hud-tr [aria-label="지도"]');
  await page.waitForSelector('.om-peek .oldmap');
  ok(await page.evaluate(() => G.world.test.state().paused), '지도를 겹쳐 보는 동안 맵이 멈춘다');
  await page.click('.om-peek .om-close');
  ok(!(await visible(page, '.om-peek')), '지도 닫기');
  // 고지도: 실제 지리 차례와 2막 뱃길 고르기
  const geo = await page.evaluate(() => { const n = OLDMAP.nodes; return n.annam.x < n.hangzhou.x && n.hangzhou.x < n.namwon.x && n.namwon.x < n.nanggoya.x && n.annam.y > n.hangzhou.y && n.hangzhou.y > n.namwon.y; });
  ok(geo, '고지도 거점이 실제 지리 차례(서쪽 안남·항주 → 조선 → 일본, 안남이 가장 남쪽)');
  await page.evaluate(() => { G.oldmap.fast = true; window.__route = null; G.oldmap.show({ from: 'hangzhou', pick: true, paths: OLDMAP.routes.act2, title: '뱃길' }).then((r) => (window.__route = r)); });
  await page.waitForSelector('.om-tray .opt');
  await page.waitForFunction(() => { const im = document.querySelector('.om-img'); return im && im.complete && im.naturalWidth > 0; }, null, { timeout: 10000 }).catch(() => {});
  ok(await page.evaluate(() => { const im = document.querySelector('.om-img'); return im.complete && im.naturalWidth > 0; }), '고지도 그림이 뜬다');
  ok((await page.locator('.om-tray .opt').count()) === 2 && (await page.textContent('.om-tray')).includes('연안길') && (await page.textContent('.om-tray')).includes('바다길'), '2막 뱃길: 연안길 / 바다길');
  await page.click('.om-tray .opt:has-text("바다길")');
  await page.waitForFunction(() => window.__route === 'sea');
  ok(await page.evaluate(() => G.oldmap.state().at === 'suncheon'), '바다길을 고르면 배가 순천에 닿는다');
  await page.evaluate(() => { G.oldmap.fast = false; });

  // 이야기 시작 → 방식 고르기 → 빈 거점(준비 중) → 다음 거점 → 고지도
  // 엔진 점검: 내용이 채워진 거점을 비워 '준비 중' 흐름만 본다(내용은 act1/act2 점검이 맡음)
  await page.evaluate(() => { for (const id of ['prologue','namwon','nanggoya','annam','interlude','hangzhou','sea','namwon_final']) PLACES[id] = null; G.save.reset(); G.app.title(); });
  await page.click('button:has-text("이야기 시작")');
  ok(await visible(page, '.sheet button:has-text("처음 배우기")') && await visible(page, '.sheet button:has-text("깊이 읽기")'), '방식 고르기: 처음 배우기 / 깊이 읽기');
  await page.click('.sheet button:has-text("처음 배우기")');
  await page.waitForSelector('.place-card.notready');
  await page.waitForTimeout(400);
  ok((await page.textContent('.place-card')).includes('서막'), '빈 거점(서막)은 "준비 중"');
  ok((await page.textContent('.mission, .st-mission')).length >= 0 && (await page.textContent('.st-mission')).includes('최척을 다시 만나라'), '한 문장 미션 "최척을 다시 만나라."');
  await shot('08_place_notready');
  await page.click('.ev-tray button:has-text("다음 거점")'); // 서막 → 남원(같은 자리라 고지도 없이)
  await page.waitForSelector('.place-card.notready:has-text("남원")');
  await page.click('.ev-tray button:has-text("다음 거점")'); // 남원 → 낭고야: 고지도
  await page.waitForSelector('.oldmap');
  ok(true, '거점 사이를 고지도로 옮겨 간다');
  await page.waitForSelector('.om-tray .btn.primary', { timeout: 8000 });
  await shot('09_oldmap');
  const om = await page.evaluate(() => G.oldmap.state());
  ok(om && om.at === 'nanggoya', '배가 낭고야에 닿는다');
  await page.click('.om-tray .btn.primary');
  await page.waitForSelector('.place-card.notready:has-text("낭고야")');
  ok(await page.evaluate(() => G.save.state.place === 'nanggoya'), '지금 거점이 저장된다(이어 하기)');
  // 처음부터: 진행·이름은 지우고 설정은 남긴다
  await page.evaluate(() => { G.save.state.name = '1-1 홍길동'; G.save.state.font = 1.15; G.save.write(); G.app.title(); });
  ok(await visible(page, 'button:has-text("이어 하기")'), '진행이 있으면 "이어 하기"');
  await page.click('button:has-text("처음부터")');
  await page.click('.sheet button:has-text("처음부터")');
  const rs = await page.evaluate(() => ({ name: G.save.state.name, place: G.save.state.place, font: G.save.state.font, done: Object.keys(G.save.state.done).length }));
  ok(rs.name === '' && rs.place === null && rs.font === 1.15, '처음부터: 진행·이름은 지우고 설정은 남긴다');
  ok(await visible(page, 'button:has-text("이야기 시작")'), '처음부터 뒤 타이틀에 "이야기 시작"');
  errs.forEach((e) => problems.push('[휴대폰 가로] ' + e));
  ok(errs.length === 0, '오류·실패한 요청 없음' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await ctx.close();
}

// ───────── 2) PC ─────────
{
  console.log('PC 1366×860');
  const { ctx, page, errs, shot } = await open('desktop', { width: 1366, height: 860 });
  await page.goto(BASE + '?teacher=1');
  await page.waitForSelector('.title-screen h1');
  ok((await page.textContent('.title-screen h1')).includes('두 개의 항로'), '타이틀이 뜬다');
  ok(await page.evaluate(() => G.save.state.teacher === true), '?teacher=1 → 선생님용');
  await shot('01_title');
  await page.evaluate(() => G.world.test.enter());
  await page.waitForSelector('canvas.wcv');
  await page.waitForTimeout(300);
  let w = await walk(page, 'KeyD', 500);
  ok(w.b.x > w.a.x + 20, `D 키로 걷는다 (${Math.round(w.a.x)} → ${Math.round(w.b.x)})`);
  w = await walk(page, 'ArrowLeft', 500);
  ok(w.b.x < w.a.x - 20, `← 키로 걷는다 (${Math.round(w.a.x)} → ${Math.round(w.b.x)})`);
  ok((await page.textContent('.panel .gauge.yeon .gnum')) === '5', '선생님용: 게이지에 숫자');
  ok(await hudClear(page), 'HUD 밑에 숨는 사람·이름표가 없다(PC)');
  {
    const L = await hudLayout(page);
    ok(L.ok, '오른쪽 위 묶음(목표 건너뛰기·수첩·지도·전체 화면·설정)이 화면 안에 있고 미션·초상과 겹치지 않는다(PC)');
  }
  await page.evaluate(() => G.world.test.enter());
  await page.waitForTimeout(200);
  await shot('02_map');
  // 사건 모드 + 선생님용 장면 건너뛰기
  await page.evaluate(() => { window.__d = false; G.app.runSteps({ id: '__t', steps: [{ id: 'x', type: 'say', lines: ['첫 줄', '둘째 줄', '셋째 줄'] }, { id: 'y', type: 'route' }] }, null).then(() => (window.__d = true)); });
  await page.waitForSelector('.event.on');
  await page.waitForTimeout(400);
  ok(await visible(page, '.gstrip .skip-scene'), '선생님용: 장면 건너뛰기 단추');
  await shot('03_event');
  await page.click('.gstrip .skip-scene');
  await page.waitForSelector('.card.notready');
  await page.click('.gstrip .skip-scene');
  await page.waitForFunction(() => window.__d === true);
  ok(true, '장면 건너뛰기로 단계를 넘긴다');
  // 맵이 있는 거점: 사람(cast) · 목표(beats) · 단계(steps)가 이어지는가
  await page.evaluate(() => {
    G.save.state.teacher = false; G.app.applySettings();
    for (const id of ['prologue','namwon','nanggoya','annam','interlude','hangzhou','sea','namwon_final']) PLACES[id] = null;
    PLACES.__demo = {
      name: '점검 거점', act: 2, map: 'demo_yard', avatar: 'sp_okyoung_f', intro: '점검용 거점이에요.',
      maps: { demo_yard: { name: '점검 마당', spawn: [3, 3, 'down'], grid: G.world.mk(10, 8, '.', [['border', 'h'], ['rect', 6, 5, 2, 2, ':']]), spots: { gate: { x: 6, y: 5, w: 2, h: 2, name: '문' } } } },
      cast: { demo_yard: { mong: { who: 'mongseon', x: 6, y: 2, dir: 'left' } } },
      beats: [
        { id: 'b1', goal: '몽선에게 말을 걸자', talk: 'mong', steps: ['s1'] },
        { id: 'b2', goal: '문으로 가자', go: 'gate', steps: ['s2'], then: { hide: ['mong'] } },
      ],
      steps: [
        { id: 's1', type: 'say', lines: [{ who: 'mongseon', t: '어머니, 떠나요.' }], fx: { gauge: { yeon: 1 } } },
        { id: 's2', type: 'choice', q: '어느 쪽?', options: [{ t: '바다', gauge: { saeng: -1 } }, { t: '뭍', gauge: { saeng: 1 } }] },
      ],
    };
    G.app.play('__demo');
  });
  await page.waitForSelector('.place-card:has-text("점검 거점")');
  ok((await page.textContent('.place-card')).includes('가족이 있는 곳으로 돌아가라'), '2막 거점: 미션 "가족이 있는 곳으로 돌아가라."');
  await page.click('.ev-tray .btn.primary');
  await page.waitForFunction(() => G.world.goal() && G.world.goal().targets[0] === 'mong');
  ok((await page.textContent('.mission .pl-goal')).includes('몽선에게 말을 걸자'), '미션 아래에 지금 할 일');
  ok(await page.evaluate(() => G.world.test.state().sp === 'sp_okyoung_f'), '거점이 정한 옥영의 모습(sp_okyoung_f)');
  await shot('04_demo_map');
  await page.evaluate(() => G.world.test.complete());
  await page.waitForSelector('.event.on .say');
  await page.click('.ev-tray .btn.primary');
  await page.waitForFunction(() => G.world.goal() && G.world.goal().targets[0] === 'gate');
  ok(await page.evaluate(() => G.save.state.yeon === 6 && !!G.save.state.done['s:__demo:s1'] && !!G.save.state.done['b:__demo:b1']), '목표 → 단계 → 단계 fx(게이지) → 저장');
  // 문까지 직접 걸어가 밟기(→ 오른쪽, ↓ 아래)
  for (const t0 = Date.now(); Date.now() - t0 < 20000 && !(await page.evaluate(() => !!document.querySelector('.event.on'))); ) {
    const s = await page.evaluate(() => G.world.test.state());
    const t = (await page.evaluate(() => G.world.test.targets()))[0];
    const key = Math.abs(t.x - s.x) > 6 ? (t.x > s.x ? 'ArrowRight' : 'ArrowLeft') : (t.y > s.y ? 'ArrowDown' : 'ArrowUp');
    await page.keyboard.down(key); await page.waitForTimeout(150); await page.keyboard.up(key);
  }
  await page.waitForSelector('.event.on .opt');
  ok(true, '자리를 밟으면 그 목표의 단계가 펼쳐진다');
  await page.click('.ev-tray .opt >> nth=1');
  await page.click('.ev-tray .btn.primary');
  await page.waitForSelector('.place-card.notready');
  ok(await page.evaluate(() => !!G.save.state.done['p:__demo'] && G.save.state.saeng === 6), '거점을 끝내면 다음 거점으로(끝 표시 저장)');
  errs.forEach((e) => problems.push('[PC] ' + e));
  ok(errs.length === 0, '오류·실패한 요청 없음' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await ctx.close();
}

// ───────── 3) 휴대폰 세로 ─────────
{
  console.log('휴대폰 세로 390×844');
  const { ctx, page, errs, shot } = await open('portrait', { width: 390, height: 844, isMobile: true, hasTouch: true, dpr: 2 });
  await page.reload();
  await page.waitForSelector('#rotate', { state: 'visible' });
  ok((await page.textContent('#rotate')).includes('가로로 돌려 주세요'), '세로 화면: "가로로 돌려 주세요"');
  ok(!(await visible(page, '.title-screen h1')), '세로 화면에서는 게임이 보이지 않는다');
  ok(await page.evaluate(() => G.app.portrait === true), '세로 화면: 게임이 멈춘 상태');
  await shot('01_rotate');
  errs.forEach((e) => problems.push('[세로] ' + e));
  ok(errs.length === 0, '오류·실패한 요청 없음' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await ctx.close();
}

// ───────── 4) 파일로 열기 ─────────
{
  console.log('파일로 열기(file://)');
  const { ctx, page, errs, shot } = await open('file', { width: 1024, height: 600 }, FILE_URL);
  await page.reload();
  await page.waitForSelector('.title-screen h1');
  ok((await page.textContent('.title-screen h1')).includes('두 개의 항로'), 'file://로 열어도 타이틀이 뜬다');
  const saved = await page.evaluate(() => { G.save.state.name = 'x'; G.save.write(); return !!localStorage.getItem('choecheok-jeon-v1'); });
  ok(saved, 'file://에서도 저장된다');
  await page.evaluate(() => G.world.test.enter());
  await page.waitForSelector('canvas.wcv');
  const w = await walk(page, 'ArrowRight', 400);
  ok(w.b.x > w.a.x + 10, 'file://에서도 걷는다');
  await shot('01_title_file');
  errs.forEach((e) => problems.push('[file://] ' + e));
  ok(errs.length === 0, '오류 없음' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await ctx.close();
}

// ───────── 5) 전체 화면 단추 ─────────
//  점검 브라우저에서는 진짜 전체 화면으로 들어가지 않도록 requestFullscreen·exitFullscreen·fullscreenElement를 가짜로 바꿔 끼운다
{
  console.log('전체 화면 단추');
  const stub = () => {
    window.__fs = { req: 0, exit: 0, lock: 0, el: null };
    const fire = () => document.dispatchEvent(new Event('fullscreenchange'));
    Object.defineProperty(Document.prototype, 'fullscreenEnabled', { configurable: true, get: () => true });
    Object.defineProperty(Document.prototype, 'fullscreenElement', { configurable: true, get: () => window.__fs.el });
    Element.prototype.requestFullscreen = function () { window.__fs.req++; window.__fs.el = this; setTimeout(fire, 0); return Promise.resolve(); };
    Document.prototype.exitFullscreen = function () { window.__fs.exit++; window.__fs.el = null; setTimeout(fire, 0); return Promise.resolve(); };
    // 바깥에서 전체 화면이 풀림(Esc 등)
    window.__fsDrop = () => { window.__fs.el = null; fire(); };
    if (screen.orientation) { try { screen.orientation.lock = () => { window.__fs.lock++; return Promise.reject(new Error('점검: 고정 안 됨')); }; } catch (e) { /* 바꿀 수 없으면 둔다 */ } }
  };
  const fsState = (page) => page.evaluate(() => [...document.querySelectorAll('.fs-toggle')].map((b) => ({ label: b.getAttribute('aria-label'), exitIcon: b.innerHTML.includes('M9 4v5H4'), on: b.classList.contains('on') })));
  for (const vp of [{ name: 'fs_phone', width: 844, height: 390, isMobile: true, hasTouch: true, dpr: 2 }, { name: 'fs_desktop', width: 1366, height: 860 }]) {
    const { ctx, page, errs, shot } = await open(vp.name, vp);
    await ctx.addInitScript(stub);
    await page.reload();
    await page.waitForSelector('.title-screen h1');
    const tag = vp.isMobile ? '휴대폰 가로' : 'PC';
    let st = await fsState(page);
    ok(st.length === 1 && st[0].label === '전체 화면' && !st[0].exitIcon, `[${tag}] 타이틀에 전체 화면 단추 하나(이름 "전체 화면", 들어가기 그림)`);
    await page.click('.title-tools .fs-toggle');
    await page.waitForTimeout(150);
    st = await fsState(page);
    ok(await page.evaluate(() => window.__fs.req === 1 && window.__fs.el === document.documentElement), `[${tag}] 누르면 문서 전체(document.documentElement)에 requestFullscreen을 부른다`);
    ok(st[0].label === '전체 화면 끝내기' && st[0].exitIcon && st[0].on && await page.evaluate(() => document.documentElement.classList.contains('is-fullscreen')), `[${tag}] fullscreenchange 뒤 단추가 "전체 화면 끝내기" 그림·이름으로 바뀐다`);
    if (vp.isMobile) ok(await page.evaluate(() => window.__fs.lock >= 1), `[${tag}] 휴대폰에서는 전체 화면에 들어간 뒤 가로 고정을 시도한다(실패해도 오류 없음)`);
    else ok(await page.evaluate(() => window.__fs.lock === 0), `[${tag}] PC에서는 가로 고정을 시도하지 않는다`);
    await shot('01_title_fullscreen');
    await page.click('.title-tools .fs-toggle');
    await page.waitForTimeout(150);
    st = await fsState(page);
    ok(await page.evaluate(() => window.__fs.exit === 1) && st[0].label === '전체 화면' && !st[0].exitIcon, `[${tag}] 다시 누르면 exitFullscreen, 단추가 들어가기 그림으로 돌아온다`);
    // 놀이 화면 HUD 오른쪽 위
    await page.evaluate(() => G.world.test.enter());
    await page.waitForSelector('canvas.wcv');
    ok(await visible(page, '.hud-tr .fs-toggle'), `[${tag}] 놀이 화면 오른쪽 위에 전체 화면 단추`);
    ok(await page.evaluate(() => [...document.querySelectorAll('.hud-tr .icon-btn')].map((b) => b.getAttribute('aria-label')).join('·')) === '이야기 수첩·지도·전체 화면·설정', `[${tag}] 오른쪽 위 차례: 수첩·지도·전체 화면·설정`);
    await page.click('.hud-tr .fs-toggle');
    await page.waitForTimeout(150);
    ok(await page.evaluate(() => window.__fs.req === 2 && document.querySelector('.hud-tr .fs-toggle').getAttribute('aria-label') === '전체 화면 끝내기'), `[${tag}] HUD 단추로도 전체 화면에 들어간다`);
    await shot('02_hud_fullscreen');
    await page.evaluate(() => window.__fsDrop());
    await page.waitForTimeout(80);
    ok(await page.evaluate(() => document.querySelector('.hud-tr .fs-toggle').getAttribute('aria-label') === '전체 화면' && !document.documentElement.classList.contains('is-fullscreen')), `[${tag}] 바깥에서 풀려도(Esc) 단추가 따라 바뀐다`);
    // 설정의 켜기·끄기
    await page.click('.hud-tr [aria-label="설정"]');
    await page.waitForSelector('.sheet .fs-seg');
    ok(await page.evaluate(() => document.querySelector('.fs-seg [data-fs="off"]').classList.contains('primary')), `[${tag}] 설정: 전체 화면 줄(지금은 '끄기')`);
    await page.click('.fs-seg [data-fs="on"]');
    await page.waitForTimeout(150);
    ok(await page.evaluate(() => window.__fs.req === 3 && document.querySelector('.fs-seg [data-fs="on"]').classList.contains('primary')), `[${tag}] 설정에서 '켜기' → 전체 화면, 단추 상태가 바뀐다`);
    await shot('03_settings_fullscreen');
    await page.click('.fs-seg [data-fs="off"]');
    await page.waitForTimeout(150);
    ok(await page.evaluate(() => window.__fs.exit === 2 && !document.querySelector('.sheet .fs-hint')), `[${tag}] 설정에서 '끄기' → 전체 화면 끝내기(지원하는 브라우저에는 안내 글이 없다)`);
    await page.click('.sheet .actions .btn.primary');
    errs.forEach((e) => problems.push(`[전체 화면 ${tag}] ` + e));
    ok(errs.length === 0, `[${tag}] 오류 없음` + (errs.length ? ': ' + errs.join(' | ') : ''));
    await ctx.close();
  }
  // 지원하지 않는 브라우저(아이폰 사파리처럼 문서 전체 화면이 없음)
  {
    const { ctx, page, errs, shot } = await open('fs_none', { width: 844, height: 390, isMobile: true, hasTouch: true, dpr: 2 });
    await ctx.addInitScript(() => {
      Object.defineProperty(Document.prototype, 'fullscreenEnabled', { configurable: true, get: () => false });
      Object.defineProperty(Document.prototype, 'webkitFullscreenEnabled', { configurable: true, get: () => false });
      delete Element.prototype.requestFullscreen; delete Element.prototype.webkitRequestFullscreen;
    });
    await page.reload();
    await page.waitForSelector('.title-screen h1');
    ok(await page.evaluate(() => !G.app.fs.supported() && !document.querySelector('.fs-toggle')), '[지원 안 함] 타이틀에 전체 화면 단추가 없다');
    await page.evaluate(() => G.world.test.enter());
    await page.waitForSelector('canvas.wcv');
    ok(await page.evaluate(() => !document.querySelector('.fs-toggle') && document.querySelectorAll('.hud-tr .icon-btn').length === 3), '[지원 안 함] 놀이 화면 오른쪽 위에도 없다(수첩·지도·설정 셋)');
    await page.click('.hud-tr [aria-label="설정"]');
    await page.waitForSelector('.sheet .set-notes');
    ok(await page.evaluate(() => !document.querySelector('.fs-seg') && /홈 화면에 추가/.test((document.querySelector('.sheet .fs-hint') || {}).textContent || '')), "[지원 안 함] 설정에는 전체 화면 줄 대신 '홈 화면에 추가' 안내");
    await shot('01_settings_hint');
    await page.click('.sheet .actions .btn.primary');
    errs.forEach((e) => problems.push('[전체 화면 지원 안 함] ' + e));
    ok(errs.length === 0, '[지원 안 함] 오류 없음' + (errs.length ? ': ' + errs.join(' | ') : ''));
    await ctx.close();
  }
}

await browser.close();
console.log(`\n점검 ${checks}개 · 문제 ${problems.length}개 · 화면 사진: tests/shots/smoke/`);
for (const p of problems) console.log(' - ' + p);
process.exit(problems.length ? 1 : 0);
