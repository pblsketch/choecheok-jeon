// 자동 완주(spec §13-2): cd tests && node e2e.mjs [basic|deep] [phone|desktop] [coast|sea]
//  인자를 주지 않으면 여덟 갈래(처음 배우기/깊이 읽기 × 휴대폰 가로/PC × 연안길/바다길)를 차례로 모두 돈다.
//  설치된 크롬으로 처음부터 실제 화면을 눌러 간다:
//   타이틀 → 이야기 시작 → 방식 고르기 → 서막 → 남원 → 낭고야 → 안남(퉁소·시구 맞추기·재회) → 1차시 끝(이어 하기 글자)
//   → 타이틀로 → 같은 브라우저를 다시 열고 '이어 하기' → 막간 → 항주 → 바다(뱃길·별/순찰선·해적·섬·조선 배) → 남원 재회
//   → 원작 결말 → 김영철전 → 결과 화면 → 이름 적고 '이미지로 저장'(내려받은 PNG 확인)
//  맵 목표는 시험 손잡이로 이루고(역사 카드·일본말은 사람에게 직접 말을 걸어 얻는다), 딜레마·뱃길·별·시구는 실제 단추를 누른다.
//  갈래마다 고르는 길을 달리해 딜레마 선택지가 모두 한 번 이상 쓰이게 했다. 바다길 갈래는 뱃길 앞에서 생 6 이상이 되게 고른다.
//  콘솔 오류·페이지 오류·실패한 요청 0건. 화면 사진: tests/shots/e2e/<갈래>/
import fs from 'node:fs';
import path from 'node:path';
import { base } from './serve.mjs';
import { VIEWS, MODE_LABEL, checker, launch, open, fresh, startGame, play, solvePoem, learner, saveResult, readResult, state, shotsDir } from './lib.mjs';

const C = checker();
const { ok } = C;
const BASE = await base();
const OUT = shotsDir('e2e');

// 갈래마다 고르는 길(딜레마 선택지 id)과 1막에서 파고드는 것
const PLANS = {
  'basic-phone-coast': { flee: 'sinpyo', news: 'ask', ship: 'board', learn: ['war'], wait: 'leave', prep: 'none', island: 'signal', trap: true },
  'basic-phone-sea': { flee: 'food', news: 'silent', ship: 'stay', learn: [], wait: 'wait', prep: 'none', island: 'endure' },
  'basic-desktop-coast': { flee: 'food', news: 'wisdom', ship: 'board', learn: ['donwoo', 'japanese'], wait: 'leave', prep: 'prep', island: 'endure' },
  'basic-desktop-sea': { flee: 'sinpyo', news: 'ask', ship: 'board', learn: ['japanese', 'captives'], wait: 'leave', prep: 'prep', island: 'signal', trap: true },
  'deep-phone-coast': { flee: 'food', news: 'ask', ship: 'stay', learn: ['ming'], wait: 'wait', prep: 'none', island: 'signal' },
  'deep-phone-sea': { flee: 'sinpyo', news: 'wisdom', ship: 'board', learn: ['donwoo', 'japanese', 'war', 'ming'], wait: 'leave', prep: 'prep', island: 'endure', trap: true },
  'deep-desktop-coast': { flee: 'sinpyo', news: 'silent', ship: 'stay', learn: [], wait: 'leave', prep: 'none', island: 'endure' },
  'deep-desktop-sea': { flee: 'food', news: 'silent', ship: 'board', learn: ['japanese'], wait: 'wait', prep: 'prep', island: 'signal' },
};
const DIL = { flee: 'd-namwon-flee', news: 'd-nanggoya-news', ship: 'd-nanggoya-ship', wait: 'd-hangzhou-wait', prep: 'd-hangzhou-prep', island: 'd-island-signal' };

const args = process.argv.slice(2);
const pick = (set, def) => args.find((a) => set.includes(a)) || def;
const combos = args.length
  ? [`${pick(['basic', 'deep'], 'basic')}-${pick(['phone', 'desktop'], 'phone')}-${pick(['coast', 'sea'], 'coast')}`]
  : Object.keys(PLANS);

const browser = await launch();
for (const name of combos) {
  const [mode, vpName, route] = name.split('-');
  const P = PLANS[name];
  const vp = VIEWS[vpName];
  console.log(`\n${name} — ${MODE_LABEL[mode]} · ${vp.label} · ${route === 'sea' ? '바다길' : '연안길'}`);
  const dir = path.join(OUT, name);
  fs.mkdirSync(dir, { recursive: true });
  const { ctx, page, errs, shot } = await open(browser, vp, { shots: dir, prefix: name });
  const t0 = Date.now();
  await fresh(page, BASE);
  await shot('title');
  await startGame(page, mode);
  const choices = Object.fromEntries(Object.entries(DIL).map(([k, d]) => [d, P[k]]));
  // 퉁소 단계: 퉁소 음원 파일이 없으면(BGM.tongso = null) 합성 퉁소음이 울린다
  const tg = { seen: 0, sounding: 0, src: new Set() };
  const onButton = async () => {
    const r = await page.evaluate(() => (document.querySelector('.tg-layer') ? { p: G.audio.tongso.playing, src: G.audio.tongso.source, file: !!(window.BGM && BGM.tongso) } : null));
    if (!r) return;
    tg.seen++; tg.file = r.file;
    if (r.p) { tg.sounding++; tg.src.add(r.src); }
  };
  const log = await play(page, { choices, route, act1: 'reload', poem: solvePoem({ trap: !!P.trap }), onGoal: learner(P.learn), onButton }, { shot });
  const secs = Math.round((Date.now() - t0) / 1000);
  ok(log.ok, `${name}: 처음부터 결과 화면까지 (${secs}초)` + (log.ok ? '' : ' — ' + log.why));
  const st = await state(page);
  ok(['prologue', 'namwon', 'nanggoya', 'annam', 'interlude', 'hangzhou', 'sea', 'namwon_final'].every((p) => log.places.includes(p)), `${name}: 거점 여덟을 모두 지난다 (${log.places.join(' → ')})`);
  ok(/^[A-Z2-9]{6}$/.test(log.code || '') && log.code === log.codeAttr && log.resumedAct2, `${name}: 1차시 끝 글자 ${log.code}를 보고 → 타이틀 → 다시 열어 '이어 하기'로 막간부터`);
  const want = Object.fromEntries(Object.values(DIL).map((d) => [d, choices[d]]).concat([['d-sea-route', route]]));
  ok(Object.keys(want).every((d) => st.choices[d] === want[d]), `${name}: 고른 길이 그대로 저장된다 — ${Object.keys(want).map((d) => st.choices[d]).join(' ')}`);
  const cardsOk = Object.keys(want).every((d) => log.dil[d] && log.dil[d].card && (/fiction/.test(log.dil[d].card.cls) ? log.dil[d].card.text.includes('원작에는 없는 장면') : /orig/.test(log.dil[d].card.cls) && log.dil[d].card.text.includes('原作')));
  ok(tg.seen > 0 && tg.sounding > 0 && [...tg.src].join() === (tg.file ? 'file' : 'synth'), `${name}: 안남 퉁소가 ${tg.file ? '음원 파일' : '음원 파일 없이 합성음'}으로 울린다(퉁소 화면 ${tg.seen}번 중 ${tg.sounding}번 울림, ${[...tg.src].join()})`);
  ok(cardsOk, `${name}: 딜레마 일곱 모두 뒤에 원작 대조 카드(원작/게임 창작)가 뜬다` + (cardsOk ? '' : ': 빠짐 ' + Object.keys(want).filter((d) => !(log.dil[d] || {}).card).join(' ')));
  if (route === 'sea') ok(log.routeSeen && log.routeSeen.saeng >= 6 && log.routeSeen.route.some((r) => r.t === '바다길' && !r.dis) && st.route === 'sea' && st.done['s:sea:s-stars'], `${name}: 뱃길 앞 생 ${log.routeSeen && log.routeSeen.saeng} → 바다길이 열려 있고, 별과 지남철로 건넌다`);
  else ok(log.routeSeen && log.routeSeen.route.some((r) => r.t === '연안길' && !r.dis) && st.route === 'coast' && st.done['s:sea:s-coast-patrol'], `${name}: 연안길(뱃길 앞 생 ${log.routeSeen && log.routeSeen.saeng}) → 명나라 순찰선 장면`);
  ok(st.done[`s:sea:${st.prep ? 's-ship-prep' : 's-ship-late'}`] && st.prep === (P.prep === 'prep'), `${name}: 조선 배 — ${st.prep ? '준비해서 바로 구조' : '준비 없이 늦게 구조'}`);
  const tr = st.trail.map((t) => t.place);
  ok(['start', 'namwon', 'nanggoya', 'annam', 'hangzhou', 'sea', 'namwon_final'].every((p) => tr.includes(p)) && !st.trail.some((t) => t.none), `${name}: 거점 기록 일곱 자리(${st.trail.map((t) => `${t.label} ${t.yeon}/${t.saeng}`).join(' → ')})`);
  if (log.ok) {
    const rs = await readResult(page);
    const ending = await page.evaluate(() => G.rules.ending(G.save.state));
    const name1 = await page.evaluate((e) => G.endgame.endingInfo(e).name, ending);
    ok(rs.items === '1,2,3,4,5,6' && rs.rows.length === 7 && !rs.none && rs.dots === 7, `${name}: 결과 화면 여섯 항목, 선택 비교표 일곱 줄, 내 궤적 일곱 점`);
    ok(st.ending === ending && rs.ending.includes(name1), `${name}: 결말 ${ending} 「${name1}」 (연 ${st.yeon}·생 ${st.saeng})`);
    ok(rs.debrief === (mode === 'deep' ? 5 : 4) && log.kimyc, `${name}: 김영철전 찾기를 거쳐 디브리핑 질문 ${rs.debrief}개`);
    const dl = await saveResult(page, dir, 'result.png', `2학년 3반 ${name}`);
    ok(dl.png && dl.size > 50000 && /^두개의항로_.*\.png$/.test(dl.name) && dl.w > 600, `${name}: 이미지로 저장 → ${dl.name} (${dl.w}×${dl.h}, ${Math.round(dl.size / 1024)}KB)`);
    await shot('result_saved');
  }
  ok(errs.length === 0, `${name}: 콘솔 오류·실패한 요청 0건` + (errs.length ? ': ' + errs.slice(0, 5).join(' | ') : ''));
  await ctx.close();
}
await browser.close();
C.finish('tests/shots/e2e/');
