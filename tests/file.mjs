// 파일로 열기 + 소리 끈 채 퉁소 단계(spec §13-7·§13-8): cd tests && node file.mjs
//  index.html을 file://로 바로 연다(서버 없음, PC 1366×860).
//   1) 시작: 타이틀 → 이야기 시작 → 처음 배우기 → 서막 → 남원. 피란 딜레마를 실제로 고르고 대조 카드까지 지난다
//   2) 저장: localStorage에 선택·거점이 들어간다 → 새로고침 → 타이틀에 '이어 하기' → 누르면 남원 다음 목표부터, 고른 길 그대로
//   3) 소리 대체: 놀이 화면의 설정(톱니바퀴)에서 효과음·배경음을 끄고 낭고야 → 안남을 끝까지(퉁소 알아듣기 세 번까지 걸어서,
//      시구 맞추기, 재회) → 1차시 끝. 퉁소는 한 번도 울리지 않고(배경음도 없음) 물결 무늬와 자막 '(퉁소 소리)'로만 알아듣는다.
//      퉁소 음원 파일이 없을 때 합성음으로 바뀌는 것은 audio.mjs가 http·file:// 모두에서 점검한다.
//  콘솔 오류·실패한 요청 0건. 화면 사진: tests/shots/file/
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { VIEWS, ROOT, checker, launch, open, fresh, startGame, play, solvePoem, state, shotsDir } from './lib.mjs';

const C = checker();
const { ok } = C;
const OUT = shotsDir('file');
const FILE_URL = pathToFileURL(path.join(ROOT, 'index.html')).href;
const browser = await launch();
const { ctx, page, errs, shot } = await open(browser, VIEWS.desktop, { shots: OUT, prefix: 'file' });

// ───────── 1) 시작 ─────────
console.log('1) file://로 시작');
await fresh(page, FILE_URL);
ok(page.url().startsWith('file://') && (await page.textContent('.title-screen h1')).includes('두 개의 항로'), 'file://로 열어 타이틀이 뜬다');
ok(await page.evaluate(() => { const im = document.querySelector('.title-art img'); return !!im && im.complete && im.naturalWidth > 0; }), '타이틀 그림이 file://에서도 뜬다');
await startGame(page, 'basic');
// 피란 딜레마를 고르고 원작 대조 카드까지 넘긴 때(딜레마 단계를 끝낸 때)에 멈춘다
const log1 = await play(page, { choices: { 'd-namwon-flee': 'food' }, stop: async (s, page) => page.evaluate(() => !!G.save.state.done['s:namwon:n-flee']) }, { shot });
ok(log1.ok && log1.places.includes('prologue') && log1.places.includes('namwon'), 'file://: 서막을 지나 남원 맵에서 목표를 이루고 피란 딜레마를 실제로 고른다' + (log1.ok ? '' : ' — ' + log1.why));
const s1 = await state(page);
ok(s1.choices['d-namwon-flee'] === 'food' && s1.done['s:namwon:n-flee'] && s1.yeon === 3 && s1.saeng === 7, `고른 길이 반영된다(양식: 연 ${s1.yeon}·생 ${s1.saeng})`);

// ───────── 2) 저장·이어 하기 ─────────
console.log('2) file://에서 저장과 이어 하기');
const raw = await page.evaluate(() => localStorage.getItem(G.save.KEY));
const saved = raw ? JSON.parse(raw) : {};
ok(!!raw && saved.choices['d-namwon-flee'] === 'food' && saved.place === 'namwon' && saved.done['s:namwon:n-flee'], 'file://에서도 localStorage에 선택·거점·끝낸 단계가 저장된다');
await page.reload();
await page.waitForSelector('.title-screen h1');
await page.evaluate(() => { G.oldmap.fast = true; });
ok(await page.locator('button:has-text("이어 하기")').first().isVisible(), '새로고침하면 타이틀에 "이어 하기"');
await shot('title_continue');
await page.click('button:has-text("이어 하기")');
await page.waitForSelector('.place-card');
ok((await page.textContent('.place-card')).includes('남원') && (await page.textContent('.ev-tray .btn.primary')).includes('이어서'), '이어 하기 → 남원 "이어서"');
const s2 = await state(page);
ok(s2.choices['d-namwon-flee'] === 'food' && s2.yeon === s1.yeon && s2.saeng === s1.saeng && eqKeys(s2.done, s1.done), `되살린 진행이 새로고침 전과 같다(연 ${s2.yeon}·생 ${s2.saeng}, 끝낸 것 ${Object.keys(s2.done).length}개)`);
function eqKeys(a, b) { return JSON.stringify(Object.keys(a).sort()) === JSON.stringify(Object.keys(b).sort()); }

// ───────── 3) 소리를 끄고 안남 끝까지 ─────────
console.log('3) 소리를 끄고 낭고야 → 안남 → 1차시 끝');
await page.click('.ev-tray .btn.primary'); // 이어서
await page.waitForFunction(() => G.world.goal() && !document.querySelector('.event.on, .dlg'), null, { timeout: 15000 });
await page.click('.hud-tr [aria-label="설정"]');
await page.click('.sheet .seg:has(.seg-l:has-text("소리(효과음)")) button:has-text("끄기")');
await page.click('.sheet .seg:has(.seg-l:has-text("배경음")) button:has-text("끄기")');
await shot('settings_sound_off');
await page.click('.sheet .actions .btn.primary');
ok(await page.evaluate(() => G.save.state.sound === false && G.save.state.music === false && JSON.parse(localStorage.getItem(G.save.KEY)).sound === false), '설정에서 효과음·배경음을 끈다(저장됨)');
const tg = { seen: 0, playing: 0, caption: 0, rings: 0, heard: null, music: 0 };
const log2 = await play(page, {
  choices: { 'd-nanggoya-news': 'silent', 'd-nanggoya-ship': 'stay' }, act1: 'stop', poem: solvePoem(),
  onButton: async (s, page) => {
    const r = await page.evaluate(() => ({ layer: !!document.querySelector('.tg-layer'), playing: G.audio.tongso.playing, level: G.audio.tongso.level(), cap: !!document.querySelector('.tg-cap.on'), capT: (document.querySelector('.tg-cap') || {}).textContent || '', rings: document.querySelectorAll('.tg-layer canvas').length, now: G.audio.now() }));
    if (r.now) tg.music++;
    if (!r.layer) return;
    tg.seen++;
    if (r.playing || r.level > 0) tg.playing++;
    if (r.cap && /퉁소/.test(r.capT)) tg.caption++;
    if (r.rings) tg.rings++;
    if (tg.seen === 1) await shot('tongso_sound_off');
  },
}, { shot });
ok(log2.ok && log2.places.includes('nanggoya') && log2.places.includes('annam'), '소리를 끈 채 낭고야와 안남을 끝까지 지나 1차시 끝에 닿는다' + (log2.ok ? '' : ' — ' + log2.why));
const s3 = await state(page);
tg.heard = s3.flags['annam:heard'];
ok(s3.sound === false && s3.act1Done && /^[A-Z2-9]{6}$/.test(log2.code || ''), `1차시 끝 글자 ${log2.code}(소리는 끈 그대로)`);
ok(tg.heard >= 2 && ['tongso-1', 'tongso-2'].every((k) => s3.done['s:annam:' + k]), `퉁소 단계를 소리 없이 끝낸다(연 ${s3.flags['annam:yeon0']} → ${tg.heard}번째 소리에 알아들음)`);
ok(tg.seen > 0 && tg.playing === 0, `퉁소 화면 ${tg.seen}번 동안 퉁소는 한 번도 울리지 않는다`);
ok(tg.caption > 0 && tg.rings > 0, `대신 물결 무늬(${tg.rings})와 자막 '(퉁소 소리)'(${tg.caption})로 보여 준다`);
ok(tg.music === 0, '배경음도 흐르지 않는다');
ok(s3.puzzle.groped >= 1 && !!log2.poemAfter && s3.done["s:annam:poem"], `소리 없이 시구 맞추기도 완성(더듬기 ${s3.puzzle.groped})`);
ok(errs.length === 0, 'file://: 콘솔 오류·실패한 요청 0건' + (errs.length ? ': ' + errs.slice(0, 5).join(' | ') : ''));
await ctx.close();
await browser.close();
C.finish('tests/shots/file/');
