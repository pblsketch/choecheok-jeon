// 화면 디자인 사진: cd tests && node ui_shots.mjs
//  휴대폰 가로(844×390, 터치)와 PC(1366×860)에서 타이틀 · 테마별 견본 맵(옥영+사람) · 거점 첫 장 · 사건 화면(선택지)
//  · 대화창 · 신표/시구 조각 알림 · 고지도(뱃길 고르기·옮겨 가기·겹쳐 보기) · 설정 · 세로 안내를 찍는다.
//  사진은 tests/shots/ui/에 남는다(저장소에는 올리지 않는다). 오류가 있으면 끝에 알린다.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { base } from './serve.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, 'shots', 'ui');
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
const BASE = await base();
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const problems = [];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const VIEWS = [
  { name: 'phone', width: 844, height: 390, isMobile: true, hasTouch: true, dpr: 2 },
  { name: 'desktop', width: 1366, height: 860, dpr: 1 },
];
// 테마 견본 맵: [맵 id, 거점 이름, 막, 옥영을 세울 칸]
const DEMOS = [
  ['demo_village', '남원', 1, [11, 10, 'left']],
  ['demo_port', '낭고야', 1, [12, 9, 'right']],
  ['demo_harbor_night', '안남', 1, [16, 10, 'right']],
  ['demo_garden', '항주', 2, [12, 9, 'down']],
  ['demo_island', '바다', 2, [14, 10, 'down']],
];

for (const vp of VIEWS) {
  console.log(vp.name, vp.width + '×' + vp.height);
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: !!vp.isMobile, hasTouch: !!vp.hasTouch, deviceScaleFactor: vp.dpr });
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error') problems.push(`[${vp.name}] console: ${m.text()}`); });
  page.on('pageerror', (e) => problems.push(`[${vp.name}] pageerror: ${e.message}`));
  page.on('response', (r) => { if (r.status() >= 400) problems.push(`[${vp.name}] http ${r.status()}: ${r.url()}`); });
  const shot = (n) => page.screenshot({ path: path.join(OUT, `${vp.name}_${n}.png`) });
  await page.goto(BASE);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector('.title-screen h1');
  await page.evaluate(() => document.fonts.ready);
  await wait(1900);
  await shot('01_title');

  // 설정
  await page.click('.title-tools [aria-label="설정"]');
  await wait(400);
  await shot('02_settings');
  await page.click('.sheet .actions .btn.primary');

  // 거점 첫 장 → 목표가 있는 마을 맵(남원 견본)
  await page.evaluate(() => {
    PLACES.__ui = {
      name: '남원', act: 1, map: 'demo_village', avatar: 'sp_okyoung_joseon', intro: '정유년(1597) 가을, 남원 고을. 왜군이 성 가까이 몰려온다는 소문이 돈다.',
      beats: [{ id: 'b1', goal: '어머니에게 피란 이야기를 꺼내자', talk: 'mom', steps: ['s1'] }],
      steps: [{ id: 's1', type: 'say', lines: ['…'] }],
    };
    G.app.play('__ui');
  });
  await page.waitForSelector('.place-card');
  await wait(700);
  await shot('03_place_card');
  await page.click('.ev-tray .btn.primary');
  await page.waitForFunction(() => G.world.goal() && G.world.goal().targets[0] === 'mom');
  await page.evaluate(() => G.world.test.look(11, 10, 'left'));
  await wait(900);
  await shot('04_map_village_goal');

  // 대화창
  await page.evaluate(() => { G.world.test.teleport('cheok'); });
  await page.keyboard.press('ArrowLeft');
  await wait(250);
  await page.evaluate(() => { const n = G.world.test.near(); if (n) return; });
  await page.keyboard.press('KeyE');
  await wait(450);
  if (await page.locator('.dlg').count()) await shot('05_dialogue');
  else problems.push(`[${vp.name}] 대화창이 뜨지 않음`);
  if (await page.locator('.dlg-tray .btn.primary').count()) await page.click('.dlg-tray .btn.primary');

  // 테마 견본 맵들
  for (const [id, nm, act, at] of DEMOS) {
    await page.evaluate(([id, nm, act]) => {
      const A = FLOW.acts[act];
      return G.world.test.enter(id, { name: nm, actName: A.name, mission: A.mission });
    }, [id, nm, act]);
    await page.waitForSelector('canvas.wcv');
    await page.evaluate((at) => G.world.test.look(at[0], at[1], at[2]), at);
    await wait(id === 'demo_port' ? 3200 : 3000);
    await shot('10_' + id);
  }

  // 시구 조각 알림(맵 위)
  await page.evaluate(() => G.hud.setFrag(2, '月白風淸夜'));
  await wait(700);
  await shot('11_frag_toast');
  await wait(2600);

  // 사건 화면: 삽화 + 글 + 선택지
  await page.evaluate(() => {
    ART.sc = ART.sc || {}; ART.sc.sc_ui_demo = 'design/style-samples/style_picturebook.png';
    G.save.state.yeon = 5; G.save.state.saeng = 5; G.save.state.tokens = []; G.save.write(); G.hud.refresh(true);
    window.__ev = G.app.runSteps({ id: '__uiev', steps: [
      { id: 'a', type: 'say', scene: 'sc_ui_demo', lines: ['안남의 포구, 달이 밝은 밤. 건너편 명나라 배에서 퉁소 소리가 물 위로 번져 온다.', { who: 'okyoung', t: '저 가락은… 남원 집에서 그이가 불던 그 곡조야.' }] },
      { id: 'b', type: 'choice', scene: 'sc_ui_demo', q: '퉁소 소리에 어떻게 답할까?', options: [
        { t: '조선 시구를 소리 내어 읊는다', d: '목소리가 닿으면 알아볼지도 모른다', gauge: { yeon: 2, saeng: -1 }, token: { id: 'tongso', name: '퉁소 가락', desc: '안남의 밤, 물 위로 건너온 그이의 곡조.' } },
        { t: '돈우에게 먼저 사정을 말한다', d: '배 주인의 허락이 있어야 움직일 수 있다', gauge: { saeng: 1 } },
        { t: '아침이 될 때까지 기다린다', d: '날이 밝으면 배가 떠날지도 모른다', gauge: { yeon: -1 } }] },
    ] }, null);
  });
  await page.waitForSelector('.event.on');
  await wait(600);
  await page.click('.ev-tray .btn.primary');
  await wait(450);
  await shot('20_event_say');
  await page.click('.ev-tray .btn.primary');
  await page.waitForSelector('.ev-tray .opt');
  await wait(500);
  await shot('21_event_choice');
  await page.click('.ev-tray .opt >> nth=0');
  await wait(650);
  await shot('22_token_toast');
  await wait(2800);
  await page.evaluate(() => G.app._skip && G.app._skip());
  await wait(2200);
  // 삽화 파일이 아직 없는 사건 화면(코드로 그린 밤바다 + 그림 설명)
  await page.evaluate(() => {
    PLACES.__cap = { scenes: { sc_ui_nofile: { caption: '정유년 가을, 불길에 휩싸인 남원성' } } };
    window.__ev2 = G.app.runSteps({ id: '__uiev2', steps: [
      { id: 'a', type: 'say', scene: 'sc_ui_nofile', lines: [{ who: 'choecheok', t: '이 옷을 입으시오. 남자 옷을 입으면 눈에 덜 띌 것이오.' }, '옥영은 떨리는 손으로 남편이 건넨 옷을 받았다.'] },
    ] }, null);
  });
  await page.waitForSelector('.event.on .say');
  await wait(600);
  await shot('23_event_noart');
  await page.evaluate(() => G.app._skip && G.app._skip());
  await wait(400);

  // 고지도: 2막 뱃길 고르기
  await page.evaluate(() => {
    G.app.explore({ name: '항주', actName: '2막', mission: FLOW.acts[2].mission });
    window.__om = G.oldmap.show({ from: 'hangzhou', pick: true, paths: OLDMAP.routes.act2, title: '조선으로 돌아가는 뱃길', note: '어느 길로 **조선**에 닿을까?' });
  });
  await page.waitForSelector('.om-tray .opt');
  await wait(1200);
  await page.hover('.om-tray .opt >> nth=1');
  await wait(500);
  await shot('30_oldmap_pick');
  // 옮겨 가기(낭고야 → 안남): 배가 가는 중간
  await page.evaluate(() => { window.__om2 = G.oldmap.show({ from: 'nanggoya', to: 'annam', title: '안남으로 가는 길' }); });
  await wait(1700);
  await shot('31_oldmap_sail');
  await page.waitForSelector('.om-tray .btn.primary', { timeout: 8000 });
  await wait(300);
  await shot('32_oldmap_arrive');
  // 지도 겹쳐 보기(오른쪽 위 지도 아이콘)
  await page.evaluate(() => G.world.test.enter('demo_garden', { name: '항주', actName: '2막', mission: FLOW.acts[2].mission, node: 'hangzhou' }));
  await page.waitForSelector('canvas.wcv');
  await wait(400);
  await page.click('.hud-tr [aria-label="지도"]');
  await wait(1300);
  await shot('33_oldmap_peek');
  await page.click('.om-peek .om-close');

  // 이야기 수첩(등록 전: 신표·시구 조각만)
  await page.click('.hud-tr [aria-label="이야기 수첩"]');
  await wait(400);
  await shot('40_notebook_mini');
  await page.click('.sheet .actions .btn.primary');
  await ctx.close();
}

// 세로 안내
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto(BASE);
  await page.waitForSelector('#rotate', { state: 'visible' });
  await page.evaluate(() => document.fonts.ready);
  await wait(500);
  await page.screenshot({ path: path.join(OUT, 'portrait_01_rotate.png') });
  await ctx.close();
}

await browser.close();
console.log('사진: tests/shots/ui/ ' + fs.readdirSync(OUT).length + '장');
for (const p of problems) console.log(' - ' + p);
process.exit(problems.length ? 1 : 0);
