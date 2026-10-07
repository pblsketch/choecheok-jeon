// 소리 점검: cd tests && npm install && node audio.mjs
//  1) 파일 점검(Node): assets/bgm·assets/sfx의 모든 파일이 credits/audio.tsv에 있고 이용 조건이 상업 납품 가능한가,
//     BGM.tracks의 파일이 모두 있는가, 배경음이 모두 10MB 이하인가
//  2) 웹(serve.mjs): 장면 id마다 그 파일 배경음이 흐르는가 / 파일을 못 읽으면 합성 곡으로 바뀌는가
//     퉁소: 파일이 없을 때 합성 퉁소음, clarity 0→1에서 소리 크기(level)가 커지는가, 실제 파일(시험용)도 풀어 트는가,
//     못 읽는 파일·없는 파일이면 합성음으로 오류 없이 바뀌는가 / 소리를 끄면 아무 일도 하지 않는가 / 새 효과음
//  3) AudioContext가 없는 브라우저에서도 오류 없이 지나가는가
//  4) 파일로 열기(file://): 시작되고 배경음 파일이 흐르며, 퉁소가 합성음·base64 파일로 울리는가
// 콘솔 오류·페이지 오류·실패한 요청이 없어야 한다(일부러 없는 파일을 부르는 단계만 그 주소의 404를,
//  곡을 빨리 바꾸는 단계만 배경음 mp3 받기를 끊은 ERR_ABORTED를 허용).
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { base } from './serve.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const problems = [];
let checks = 0;
const ok = (cond, msg) => { checks++; if (!cond) problems.push(msg); console.log((cond ? '  ✓ ' : '  ✗ ') + msg); };

// ───────── 1) 파일 점검 ─────────
console.log('파일·크레딧');
const ALLOWED = /공공누리 제1유형|CC0|CC BY(?![-\s]*(NC|ND|SA-NC))|퍼블릭 도메인|Public Domain|자체 (제작|생성|합성)/;
const FORBIDDEN = /비상업|NC|ND|변경 ?금지|불분명|제[2-4]유형/;
const tsv = fs.readFileSync(path.join(ROOT, 'credits', 'audio.tsv'), 'utf8').split(/\r?\n/).filter((l) => l.trim() && !l.startsWith('#'));
const head = tsv[0].split('\t');
ok(head.join('|') === '파일|출처|이용 조건|고친 내용', 'credits/audio.tsv 머리줄: 파일·출처·이용 조건·고친 내용');
const rows = Object.fromEntries(tsv.slice(1).map((l) => { const c = l.split('\t'); return [c[0], c]; }));
const listFiles = (dir) => (fs.existsSync(path.join(ROOT, dir)) ? fs.readdirSync(path.join(ROOT, dir)).filter((f) => !f.startsWith('.') && !f.startsWith('_')).map((f) => dir + '/' + f) : []);
const files = [...listFiles('assets/bgm'), ...listFiles('assets/sfx')];
ok(files.length > 0, `소리 파일 ${files.length}개`);
for (const f of files) {
  const r = rows[f];
  ok(!!r && r.length >= 4 && r[1].trim() && r[3].trim() && /https?:\/\//.test(r[1]), `${f}: 크레딧 줄(출처 주소·고친 내용)`);
  if (r) ok(ALLOWED.test(r[2]) && !FORBIDDEN.test(r[2].replace(/상업적 이용·변경 가능/g, '')), `${f}: 이용 조건 납품 가능(${r[2].split('—')[0].trim()})`);
}
for (const f of Object.keys(rows)) ok(fs.existsSync(path.join(ROOT, f)), `크레딧의 ${f} 파일이 있음`);
const bgmBytes = listFiles('assets/bgm').reduce((s, f) => s + fs.statSync(path.join(ROOT, f)).size, 0);
ok(bgmBytes <= 10 * 1024 * 1024, `배경음 모두 ${(bgmBytes / 1048576).toFixed(2)}MB ≤ 10MB`);
const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'js', 'data', 'bgm.js'), 'utf8'), sandbox);
const BGM = sandbox.window.BGM;
const SCENES = ['namwon_memory', 'flight', 'nanggoya', 'annam_night', 'hangzhou', 'sea', 'island', 'reunion', 'result'];
for (const id of SCENES) ok(BGM.tracks[id] && fs.existsSync(path.join(ROOT, BGM.tracks[id].src)) && BGM.tracks[id].synth, `BGM.tracks.${id}: 파일과 대신 틀 합성 곡`);
if (BGM.tongso) {
  ok(fs.existsSync(path.join(ROOT, BGM.tongso.src)) && fs.existsSync(path.join(ROOT, BGM.tongso.js)), 'BGM.tongso: mp3·js 파일이 있음');
  ok(!!BGM.tongso.instrument, `BGM.tongso.instrument = ${BGM.tongso.instrument}(퉁소가 아니면 수첩·크레딧에 밝힘)`);
} else console.log('  · BGM.tongso = null → 퉁소는 합성음으로 운다(실제 연주 파일을 받으면 tools/make_tongso.py)');

// 시험용 퉁소 파일: 배경음 mp3 하나를 퉁소 자리에 넣어 '파일을 풀어 트는 길'(fetch·base64 js)을 점검한다
const FIX = path.join(HERE, 'shots', 'audio');
fs.rmSync(FIX, { recursive: true, force: true });
fs.mkdirSync(FIX, { recursive: true });
fs.copyFileSync(path.join(ROOT, 'assets', 'bgm', 'flight.mp3'), path.join(FIX, 'tongso_fixture.mp3'));
fs.writeFileSync(path.join(FIX, 'tongso_fixture.js'), 'window.TONGSO_DATA = ' + JSON.stringify({ instrument: '시험', b64: fs.readFileSync(path.join(FIX, 'tongso_fixture.mp3')).toString('base64') }) + ';\n');
const FIXSPEC = { src: 'tests/shots/audio/tongso_fixture.mp3', js: 'tests/shots/audio/tongso_fixture.js', instrument: '시험 악기' };

// ───────── 브라우저 ─────────
const BASEURL = await base();
const FILE_URL = pathToFileURL(path.join(ROOT, 'index.html')).href;
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });

async function open(url, init) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text() + ' @' + ((m.location() || {}).url || '')); });
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  page.on('requestfailed', (r) => errs.push('requestfailed: ' + r.url() + ' ' + ((r.failure() || {}).errorText || '')));
  page.on('response', (r) => { if (r.status() >= 400) errs.push('http ' + r.status() + ': ' + r.url()); });
  if (init) await page.addInitScript(init);
  await page.goto(url);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector('.title-screen h1');
  await page.mouse.click(4, 4); // 첫 손댐 → G.audio.unlock()
  await page.waitForTimeout(200);
  return { ctx, page, errs };
}
const take = (errs) => errs.splice(0, errs.length);
const allowOnly = (list, re) => list.filter((e) => !re.test(e));
// level()을 ms 동안 여러 번 재어 가장 큰 값
const peak = (page, ms = 1200) => page.evaluate(async (ms) => { let m = 0; const t0 = performance.now(); while (performance.now() - t0 < ms) { m = Math.max(m, G.audio.tongso.level()); await new Promise((r) => setTimeout(r, 40)); } return m; }, ms);
const waitFor = (page, fn, arg, ms = 8000) => page.waitForFunction(fn, arg, { timeout: ms }).then(() => true, () => false);

async function clarityCheck(page, label) {
  await page.evaluate(() => G.audio.tongso.set({ clarity: 0 }));
  await page.waitForTimeout(1500);
  const lo = await peak(page);
  await page.evaluate(() => G.audio.tongso.set({ clarity: 1, pan: 0.5 }));
  await page.waitForTimeout(1500);
  const hi = await peak(page);
  ok(hi > 0.05 && hi > lo * 2.5, `${label}: clarity 0→1에서 소리 크기 ${lo.toFixed(3)} → ${hi.toFixed(3)}`);
}

// ───────── 2) 웹 ─────────
{
  console.log('웹(http)');
  const { ctx, page, errs } = await open(BASEURL);
  ok(await page.evaluate(() => !!G.audio.ctx && G.audio.ctx.state === 'running'), '첫 손댐 뒤 AudioContext가 돈다');
  for (const id of SCENES) {
    await page.evaluate((id) => G.audio.play(id), id);
    const good = await waitFor(page, (id) => { const f = G.audio.nowFile(); return f && f.name === id && f.src.endsWith('assets/bgm/' + id + '.mp3') && !f.paused && f.t > 0.2; }, id);
    ok(good, `장면 ${id}: assets/bgm/${id}.mp3가 흐름`);
  }
  // 파일을 못 읽으면 합성 곡으로
  await page.route('**/assets/bgm/broken_scene.mp3', (r) => r.fulfill({ status: 200, contentType: 'audio/mpeg', body: Buffer.from('이건 mp3가 아니에요'.repeat(40)) }));
  await page.evaluate(() => { BGM.tracks.broken_scene = { src: 'assets/bgm/broken_scene.mp3', synth: 'sorrow' }; G.audio.play('broken_scene'); });
  ok(await waitFor(page, () => { const s = G.audio.nowSynth(); return s && s.name === 'broken_scene' && s.synth === 'sorrow'; }), '못 읽는 배경음 파일 → 합성 곡(sorrow)으로 바뀜');
  await page.evaluate(() => { G.audio.synthOnly = true; G.audio.play('island'); });
  ok(await waitFor(page, () => { const s = G.audio.nowSynth(); return s && s.name === 'island' && s.synth === 'dream'; }), '합성음만 쓸 때 장면 island → 합성 곡 dream');
  await page.evaluate(() => { G.audio.synthOnly = false; G.audio.play('annam_night'); });
  ok(await waitFor(page, () => { const f = G.audio.nowFile(); return f && f.name === 'annam_night'; }), '다시 파일 배경음(annam_night)');

  // 퉁소: 파일 없음(BGM.tongso = null) → 합성음
  await page.evaluate(() => { G.audio.tongso._reset(); BGM.tongso = null; });
  const r1 = await page.evaluate(() => G.audio.tongso.play({ clarity: 0.5, pan: -0.3 }));
  ok(r1 === true, 'tongso.play()가 true를 돌려줌');
  ok(await waitFor(page, () => G.audio.tongso.playing && G.audio.tongso.source === 'synth'), '퉁소 파일이 없으면 합성 퉁소음');
  ok(await page.evaluate(() => G.audio.tongso.instrument === null), '합성음이면 instrument = null');
  await clarityCheck(page, '합성 퉁소');
  await page.evaluate(() => G.audio.tongso.stop());
  await page.waitForTimeout(1500);
  ok(await page.evaluate(() => !G.audio.tongso.playing && G.audio.tongso.level() === 0), 'tongso.stop() 뒤 멎고 level 0');

  // 퉁소: 실제 파일(시험용 mp3를 fetch로 받아 풂)
  await page.evaluate((spec) => { G.audio.tongso._reset(); BGM.tongso = spec; G.audio.tongso.play({ clarity: 0.5 }); }, FIXSPEC);
  ok(await waitFor(page, () => G.audio.tongso.source === 'file'), '퉁소 파일이 있으면 파일을 풀어 튼다(fetch)');
  ok(await page.evaluate(() => G.audio.tongso.instrument === '시험 악기'), 'instrument가 BGM.tongso.instrument를 돌려줌');
  await clarityCheck(page, '파일 퉁소');
  await page.evaluate(() => G.audio.tongso.stop(true));
  await page.waitForTimeout(500);
  // 곡을 빨리 바꾸면 audio 요소가 받던 mp3를 끊는다(src를 비움) — 오류가 아니라 정상 동작이라 그 줄만 뺀다
  const e1 = allowOnly(take(errs), /^requestfailed: \S+\/assets\/bgm\/[a-z_]+\.mp3 net::ERR_ABORTED$/);
  ok(e1.length === 0, '여기까지 콘솔 오류·실패한 요청 없음' + (e1.length ? ' — ' + e1.join(' / ') : ''));

  // 못 읽는 파일 → 합성음(오류 없이)
  await page.route('**/assets/sfx/broken_tongso.mp3', (r) => r.fulfill({ status: 200, contentType: 'audio/mpeg', body: Buffer.from('퉁소가 아님'.repeat(60)) }));
  await page.evaluate(() => { G.audio.tongso._reset(); BGM.tongso = { src: 'assets/sfx/broken_tongso.mp3', instrument: '퉁소' }; G.audio.tongso.play({ clarity: 1 }); });
  ok(await waitFor(page, () => G.audio.tongso.source === 'synth'), '못 읽는 퉁소 파일 → 합성 퉁소음');
  ok(await page.evaluate(() => G.audio.tongso.instrument === null), '못 읽었으면 instrument = null(합성음)');
  ok(await page.evaluate(async () => { await new Promise((r) => setTimeout(r, 800)); return G.audio.tongso.level() > 0.02; }), '합성 퉁소음이 실제로 울림');
  await page.evaluate(() => G.audio.tongso.stop(true));
  const e2 = take(errs);
  ok(e2.length === 0, '못 읽는 파일: 콘솔 오류 없음' + (e2.length ? ' — ' + e2.join(' / ') : ''));

  // 없는 파일(404) → 합성음. 그 주소의 404 말고는 오류가 없어야 한다
  await page.evaluate(() => { G.audio.tongso._reset(); BGM.tongso = { src: 'assets/sfx/missing_tongso.mp3', js: 'assets/sfx/missing_tongso_data.js', instrument: '퉁소' }; G.audio.tongso.play({ clarity: 1 }); });
  ok(await waitFor(page, () => G.audio.tongso.source === 'synth'), '없는 퉁소 파일 → 합성 퉁소음');
  await page.evaluate(() => G.audio.tongso.stop(true));
  await page.waitForTimeout(300);
  const e3 = allowOnly(take(errs), /missing_tongso|Failed to load resource: the server responded with a status of 404/);
  ok(e3.length === 0, '없는 파일: 그 404 말고 오류 없음' + (e3.length ? ' — ' + e3.join(' / ') : ''));

  // 새 효과음
  const sfxErr = await page.evaluate(() => { try { ['page', 'wave', 'wind', 'fire', 'gaugeUp', 'gaugeDown'].forEach((k) => G.audio[k]()); return null; } catch (e) { return e.message; } });
  ok(sfxErr === null && (await page.evaluate(() => ['wave', 'wind', 'fire', 'gaugeUp', 'gaugeDown'].every((k) => typeof G.audio[k] === 'function'))), '효과음 wave·wind·fire·gaugeUp·gaugeDown');

  // 소리 끔 → 아무 일도 없음
  await page.evaluate(() => { G.audio.tongso._reset(); BGM.tongso = null; });
  const off = await page.evaluate(() => {
    try {
      G.save.state.sound = false;
      const r = G.audio.tongso.play({ clarity: 0.8, pan: 1 });
      G.audio.tongso.set({ clarity: 0.2 });
      const lv = G.audio.tongso.level();
      G.audio.tongso.stop();
      G.audio.wave(); G.audio.tap();
      return { r, playing: G.audio.tongso.playing, lv, c: G.audio.tongso.clarity, p: G.audio.tongso.pan };
    } catch (e) { return { err: e.message }; }
  });
  ok(!off.err && off.r === false && off.playing === false && off.lv === 0 && off.c === 0.2 && off.p === 1, '소리를 끄면 tongso는 울리지 않고 값만 기억(clarity·pan) ' + JSON.stringify(off));
  // 울리는 중에 소리를 끄면 멎는다
  const mid = await page.evaluate(async () => {
    G.save.state.sound = true; G.audio.tongso.play({ clarity: 1 });
    await new Promise((r) => setTimeout(r, 300));
    const a = G.audio.tongso.playing;
    G.save.state.sound = false;
    await new Promise((r) => setTimeout(r, 600));
    return { a, b: G.audio.tongso.playing };
  });
  ok(mid.a === true && mid.b === false, '울리는 중에 소리를 끄면 퉁소가 멎음');
  // 배경음 끔
  await page.evaluate(() => { G.save.state.music = false; G.audio.music(false); G.audio.play('sea'); });
  await page.waitForTimeout(400);
  ok(await page.evaluate(() => G.audio.now() === null), '배경음을 끄면 곡이 흐르지 않음');
  const e4 = take(errs);
  ok(e4.length === 0, '소리 끔: 오류 없음' + (e4.length ? ' — ' + e4.join(' / ') : ''));
  await ctx.close();
}

// ───────── 3) AudioContext가 없는 브라우저 ─────────
{
  console.log('AudioContext 없음');
  const { ctx, page, errs } = await open(BASEURL, () => { delete window.AudioContext; delete window.webkitAudioContext; });
  const r = await page.evaluate(() => {
    try {
      const a = G.audio.tongso.play({ clarity: 1 });
      G.audio.tongso.set({ clarity: 0 }); G.audio.tongso.stop();
      G.audio.play('sea'); G.audio.wave(); G.audio.fire(); G.audio.tongso.preload();
      return { a, lv: G.audio.tongso.level(), playing: G.audio.tongso.playing };
    } catch (e) { return { err: e.message }; }
  });
  ok(!r.err && r.a === false && r.lv === 0 && r.playing === false, 'Web Audio가 없어도 오류 없이 지나감 ' + JSON.stringify(r));
  const e = take(errs);
  ok(e.length === 0, '오류 없음' + (e.length ? ' — ' + e.join(' / ') : ''));
  await ctx.close();
}

// ───────── 4) 파일로 열기(file://) ─────────
{
  console.log('파일로 열기(file://)');
  const { ctx, page, errs } = await open(FILE_URL);
  ok(await page.locator('.title-screen h1').isVisible(), 'file://에서 타이틀이 뜸');
  await page.evaluate(() => G.audio.play('sea'));
  ok(await waitFor(page, () => { const f = G.audio.nowFile(); return f && f.src.endsWith('assets/bgm/sea.mp3') && !f.paused && f.t > 0.2; }), 'file://에서 배경음 파일(sea)이 흐름');
  await page.evaluate(() => { G.audio.tongso._reset(); BGM.tongso = null; G.audio.tongso.play({ clarity: 0.5 }); });
  ok(await waitFor(page, () => G.audio.tongso.source === 'synth'), 'file://에서 합성 퉁소음');
  await clarityCheck(page, 'file:// 합성 퉁소');
  await page.evaluate((spec) => { G.audio.tongso._reset(); BGM.tongso = spec; G.audio.tongso.play({ clarity: 0.5 }); }, FIXSPEC);
  ok(await waitFor(page, () => G.audio.tongso.source === 'file'), 'file://에서 퉁소 파일을 base64 js로 풀어 튼다');
  await clarityCheck(page, 'file:// 파일 퉁소');
  await page.evaluate(() => G.audio.tongso.stop());
  const e = take(errs);
  ok(e.length === 0, 'file://: 오류 없음' + (e.length ? ' — ' + e.join(' / ') : ''));
  await ctx.close();
}

await browser.close();
console.log(`\n점검 ${checks}개, 문제 ${problems.length}개`);
if (problems.length) { console.log(problems.map((p) => ' - ' + p).join('\n')); process.exit(1); }
