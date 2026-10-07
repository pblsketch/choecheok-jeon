// 화면 틀 점검: cd tests && npm install && node smoke.mjs
//  - 휴대폰 가로(844×390, 터치) · PC(1366×860) · 휴대폰 세로(390×844) · 파일로 열기(file://)
//  - 타이틀이 뜨는가 / 세로면 "가로로 돌려 주세요" / 시험 맵에서 옥영이 걷는가(키보드·조이스틱)
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
async function walk(page, key, ms) {
  const a = await page.evaluate(() => G.world.test.state());
  await page.keyboard.down(key); await page.waitForTimeout(ms); await page.keyboard.up(key);
  await page.waitForTimeout(80);
  const b = await page.evaluate(() => G.world.test.state());
  return { a, b };
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
  // 수첩: 아직 등록 안 됨 → 준비 중
  await page.click('button:has-text("이야기 수첩")');
  ok(await visible(page, '.sheet:has-text("준비 중")'), '이야기 수첩(미등록) → 준비 중 판');
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
  const lay = await page.evaluate(() => { const m = document.querySelector('.mapwrap').getBoundingClientRect(), p = document.querySelector('.panel').getBoundingClientRect(), t = document.querySelector('.pad').getBoundingClientRect(); return { mw: m.width, pw: p.width, mapRight: m.right, panelLeft: p.left, padRight: t.right }; });
  ok(Math.abs(lay.mw / (lay.mw + lay.pw) - 2 / 3) < 0.03, `맵 자리가 왼쪽 2/3 (${Math.round(lay.mw)} : ${Math.round(lay.pw)})`);
  ok(lay.padRight <= lay.mapRight + 0.5, '말 걸기 단추가 게이지 패널과 겹치지 않는다');
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
  const spriteFallback = await page.evaluate(() => G.world.test.npcs().every((n) => n.spriteMissing));
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

  // 이야기 시작 → 방식 고르기 → 빈 거점(준비 중) → 다음 거점 → 고지도
  await page.evaluate(() => { G.save.reset(); G.app.title(); });
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
  ok((await page.textContent('.pl-goal')).includes('몽선에게 말을 걸자'), '패널에 지금 할 일');
  ok(await page.evaluate(() => G.world.test.state().sp === 'sp_okyoung_f'), '거점이 정한 옥영의 모습(sp_okyoung_f)');
  await shot('04_demo_map');
  await page.evaluate(() => G.world.test.complete());
  await page.waitForSelector('.event.on .say');
  await page.click('.ev-tray .btn.primary');
  await page.waitForFunction(() => G.world.goal() && G.world.goal().targets[0] === 'gate');
  ok(await page.evaluate(() => G.save.state.yeon === 6 && !!G.save.state.done['s:__demo:s1'] && !!G.save.state.done['b:__demo:b1']), '목표 → 단계 → 단계 fx(게이지) → 저장');
  // 문까지 직접 걸어가 밟기(→ 오른쪽, ↓ 아래)
  for (let i = 0; i < 30 && !(await page.evaluate(() => !!document.querySelector('.event.on'))); i++) {
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

await browser.close();
console.log(`\n점검 ${checks}개 · 문제 ${problems.length}개 · 화면 사진: tests/shots/smoke/`);
for (const p of problems) console.log(' - ' + p);
process.exit(problems.length ? 1 : 0);
