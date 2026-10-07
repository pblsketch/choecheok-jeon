// 맵 화면 사진(눈으로 보는 점검): cd tests && node maps.mjs
//  거점의 탑다운 맵 열 장을 휴대폰 가로(844×390, 터치)와 PC(1366×860)에서, 그 맵의 첫 목표 자리에 사람들(cast)을 세운 채
//  옥영이 걷는 도중에 찍는다 → tests/shots/maps/<화면>_<거점>_<맵>.png
//  확인하는 것: 맵이 그 거점의 실제 놀이 흐름(앞 목표를 끝낸 이어 하기)으로 열리는가, 맵이 화면 전체를 채우는가,
//  사람이 서 있는가, 옥영이 방향키로 실제로 걷는가, 목표가 HUD에 뜨는가, 콘솔 오류 0
import { base } from './serve.mjs';
import { VIEWS, checker, launch, open, fresh, shotsDir } from './lib.mjs';
import path from 'node:path';

const C = checker();
const { ok } = C;
const BASE = await base();
const OUT = shotsDir('maps');
const browser = await launch();

for (const vp of [VIEWS.phone, VIEWS.desktop]) {
  console.log('\n' + vp.label);
  const { ctx, page, errs } = await open(browser, vp);
  await fresh(page, BASE);
  // 맵마다: 그 맵에서 처음 할 일이 있는 목표 앞까지 끝낸 것으로 두고 거점을 펼친다
  const plan = await page.evaluate(() => {
    const out = [];
    for (const pid of FLOW.order) {
      const P = PLACES[pid];
      if (!P || !P.map) continue;
      let map = P.map;
      const seen = new Set();
      P.beats.forEach((b, i) => {
        if (b.map) map = b.map;
        if (seen.has(map) || !(b.talk || b.at || b.go || b.pick)) return;
        seen.add(map);
        out.push({ pid, map, i, beat: b.id });
      });
    }
    return out;
  });
  ok(plan.length === 10, `탑다운 맵 ${plan.length}장: ${plan.map((p) => p.pid + '/' + p.map).join(' ')}`);
  for (const p of plan) {
    await page.evaluate(({ pid, i, map }) => {
      G.app.title();
      G.save.reset();
      const st = G.save.state;
      st.mode = 'basic';
      // 섬의 밤(신호불 쪽)처럼 갈래가 있는 목표는 그 갈래를 고른 것으로
      if (map === 'island_night') st.choices['d-island-signal'] = 'signal';
      if (pid === 'sea') st.route = 'sea';
      if (pid === 'namwon_final' || pid === 'sea') st.tokens = [{ id: 'sinpyo', name: '옥가락지' }];
      const P = PLACES[pid];
      for (let k = 0; k < i; k++) { const b = P.beats[k]; st.done['b:' + pid + ':' + b.id] = true; for (const s of b.steps || []) st.done['s:' + pid + ':' + s] = true; }
      G.save.write();
      G.app.play(pid);
    }, p);
    await page.waitForSelector('.place-card');
    await page.click('.ev-tray .btn.primary');
    // 목표 앞 말(대화창)이 있으면 넘기며 목표가 뜰 때까지
    let got = false;
    for (let k = 0; k < 120 && !got; k++) {
      if (await page.locator('.dlg-tray .btn.primary').count()) await page.click('.dlg-tray .btn.primary').catch(() => {});
      got = await page.evaluate(() => !!(G.world.goal() && !document.querySelector('.event.on, .dlg') && G.world.test.state().map));
      if (!got) await page.waitForTimeout(150);
    }
    const info = await page.evaluate(() => {
      const s = G.world.test.state();
      const r = document.querySelector('.mapwrap').getBoundingClientRect();
      return { map: s.map, npcs: G.world.test.npcs().length, goal: (document.querySelector('.mission .pl-goal') || {}).textContent || '', full: r.width >= innerWidth - 1 && r.height >= innerHeight - 1, x: s.x, y: s.y };
    });
    await page.waitForTimeout(2600); // 맵 이름 띠가 걷힌 뒤
    // 걸을 수 있는 쪽으로 걷는 도중에 찍는다
    let walked = 0;
    for (const key of ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp']) {
      const a = await page.evaluate(() => G.world.test.state());
      await page.keyboard.down(key);
      await page.waitForTimeout(520);
      const b = await page.evaluate(() => G.world.test.state());
      walked = Math.abs(b.x - a.x) + Math.abs(b.y - a.y);
      if (walked > 12) { await page.screenshot({ path: path.join(OUT, `${vp.name}_${p.pid}_${p.map}.png`) }); await page.keyboard.up(key); break; }
      await page.keyboard.up(key);
    }
    ok(got && info.map === p.map && info.full && info.npcs > 0 && info.goal && walked > 12,
      `${p.pid}/${p.map}: 맵이 화면을 채우고 사람 ${info.npcs}명, 목표 "${info.goal}", 옥영이 걷는다(${Math.round(walked)}px)`);
  }
  ok(errs.length === 0, `${vp.label}: 콘솔 오류·실패한 요청 0건` + (errs.length ? ': ' + errs.slice(0, 5).join(' | ') : ''));
  await ctx.close();
}
await browser.close();
C.finish('tests/shots/maps/');
