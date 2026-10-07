'use strict';
// 이어 하기 글자(spec §7-2): 1막 끝 상태를 6글자에 담는다. 서버 없이 글자 안에 모두 담는다.
//  글자판 32자: 헷갈리는 0·O·1·I·l을 뺀 대문자와 숫자. 대소문자는 가리지 않고 띄어쓰기·붙임표는 무시한다.
//
//  담는 것(1막의 '고른 것과 센 것'만, 21비트):
//   방식(2) × 남원 피란 딜레마(2) × 낭고야 소식 딜레마(3) × 장삿배 딜레마(2) × 지식 6개(64)
//   × 더듬어 찾기(0~10, 11) × 고친 횟수(0~8, 9: 8은 '8 이상') × 함정 A·B·C(8) = 1,216,512 < 2^21
//  나머지 9비트는 오타 검사(합 검사 5비트 + 섞음 검사 4비트): 어느 한 글자를 바꿔도 반드시 거절된다.
//  연·생·조각·신표·장육불 횟수·거점별 기록·수첩 카드는 담지 않고, 거점 자료(PLACES)의 1막 단계를 차례로
//  같은 규칙(G.rules.stepOn)으로 되풀이해 다시 계산한다(쓰러짐·고정 사건 포함). 브라우저와 Node 모두에서 돈다.
//  더듬어 찾기는 생을 쓰므로 정확히(최대 10: 생이 10을 넘지 않아 그 이상은 생이 같다) 담고, 횟수는 8 이상이면 '7+'로 보인다.
(function (root) {
  const G = (root.G = root.G || {});
  const C = (G.code = {});
  const RU = () => (root.TEXTS && root.TEXTS.RULES) || {};
  const MSG = () => Object.assign({ bad: '글자를 다시 확인해 주세요', length: '이어 하기 글자는 6자예요', char: '쓰지 않는 글자가 섞여 있어요(0, O, 1, I는 쓰지 않아요)' }, (root.TEXTS && root.TEXTS.CODE) || {});

  const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  C.ALPHA = ALPHA;
  C.LENGTH = 6;
  // 담는 칸(차례가 곧 자릿값). 딜레마 선택지는 거점 파일에 적힌 차례(0, 1, 2)로 담는다
  const LAYOUT = {
    dilemmas: [['d-namwon-flee', 2], ['d-nanggoya-news', 3], ['d-nanggoya-ship', 2]],
    know: ['h-namwon-war', 'h-namwon-ming', 'h-nanggoya-captives', 'h-nanggoya-donwoo', 'h-annam-trade', 'k-japanese'],
    traps: ['A', 'B', 'C'],
    groped: 11, // 0~10
    fixes: 9,   // 0~8(8 = 8 이상)
  };
  C.LAYOUT = LAYOUT;
  const RADIX = [2].concat(LAYOUT.dilemmas.map((d) => d[1]), [1 << LAYOUT.know.length, LAYOUT.groped, LAYOUT.fixes, 1 << LAYOUT.traps.length]);
  const SPACE = RADIX.reduce((a, b) => a * b, 1); // 1,216,512
  const MASK = 0x15a3c7; // 비슷한 상태가 비슷한 글자로 보이지 않게 섞는 값(21비트)

  // GF(32) 곱(x^5 + x^2 + 1)
  function gmul(a, b) {
    let r = 0;
    for (let i = 0; i < 5; i++) {
      if (b & 1) r ^= a;
      b >>= 1;
      a <<= 1;
      if (a & 32) a ^= 0x25;
    }
    return r & 31;
  }
  function checks(d, b) {
    const c0 = (d[0] + d[1] + d[2] + d[3] + 7 * b + 13) & 31;
    const x = gmul(d[0], 3) ^ gmul(d[1], 5) ^ gmul(d[2], 7) ^ gmul(d[3], 11) ^ (b ? 19 : 0);
    const c1 = ((x & 15) ^ (x >> 4) ^ 9) & 15;
    return [c0, c1];
  }

  // 1막 딜레마 단계 찾기
  function findDilemma(id, places) {
    for (const pid of RU().act1 || []) {
      const p = places[pid];
      const s = p && (p.steps || []).find((x) => x && x.dilemma === id);
      if (s) return { place: pid, step: s };
    }
    return null;
  }

  // 상태 → 글자 6자
  C.encode = function (st) {
    st = st || G.save.state;
    const places = root.PLACES || {};
    const digits = [st.mode === 'deep' ? 1 : 0];
    for (const [id, n] of LAYOUT.dilemmas) {
      const f = findDilemma(id, places);
      let i = f ? f.step.options.findIndex((o) => o.id === (st.choices || {})[id]) : 0;
      if (i < 0 || i >= n) i = 0;
      digits.push(i);
    }
    digits.push(LAYOUT.know.reduce((a, k, i) => a | ((st.know || {})[k] ? 1 << i : 0), 0));
    const pz = st.puzzle || {};
    digits.push(Math.min(LAYOUT.groped - 1, Math.max(0, pz.groped | 0)));
    digits.push(Math.min(LAYOUT.fixes - 1, Math.max(0, pz.fixes | 0)));
    digits.push(LAYOUT.traps.reduce((a, t, i) => a | ((pz.traps || []).includes(t) ? 1 << i : 0), 0));
    let v = 0;
    digits.forEach((d, i) => { v = v * RADIX[i] + d; });
    const w = (v ^ MASK) >>> 0;
    const d = [w & 31, (w >> 5) & 31, (w >> 10) & 31, (w >> 15) & 31];
    const b = (w >> 20) & 1;
    const [c0, c1] = checks(d, b);
    return [d[0], d[1], d[2], d[3], (b << 4) | c1, c0].map((x) => ALPHA[x]).join('');
  };
  // 보기 좋게: 'ABC-DEF'
  C.pretty = (code) => String(code || '').slice(0, 3) + '-' + String(code || '').slice(3);
  C.normalize = (s) => String(s || '').toUpperCase().replace(/[\s\-–—_.·]/g, '');

  // 글자 → { mode, choices, know, puzzle }(고른 것과 센 것) 또는 { error }
  C.parse = function (str) {
    const s = C.normalize(str);
    if (s.length !== C.LENGTH) return { error: MSG().length };
    const x = [];
    for (const ch of s) { const i = ALPHA.indexOf(ch); if (i < 0) return { error: MSG().char }; x.push(i); }
    const d = x.slice(0, 4), b = x[4] >> 4, c1 = x[4] & 15, c0 = x[5];
    const [e0, e1] = checks(d, b);
    if (e0 !== c0 || e1 !== c1) return { error: MSG().bad };
    const v = ((d[0] | (d[1] << 5) | (d[2] << 10) | (d[3] << 15) | (b << 20)) ^ MASK) >>> 0;
    if (v >= SPACE) return { error: MSG().bad };
    const digits = [];
    let r = v;
    for (let i = RADIX.length - 1; i >= 0; i--) { digits[i] = r % RADIX[i]; r = Math.floor(r / RADIX[i]); }
    const places = root.PLACES || {};
    const sel = { mode: digits[0] ? 'deep' : 'basic', choices: {}, know: {}, puzzle: {} };
    LAYOUT.dilemmas.forEach(([id], i) => {
      const f = findDilemma(id, places);
      const o = f && f.step.options[digits[1 + i]];
      if (o) sel.choices[id] = o.id;
    });
    const k = digits[1 + LAYOUT.dilemmas.length];
    LAYOUT.know.forEach((id, i) => { if (k & (1 << i)) sel.know[id] = true; });
    const n = 2 + LAYOUT.dilemmas.length;
    const t = digits[n + 2];
    sel.puzzle = { groped: digits[n], fixes: digits[n + 1], traps: LAYOUT.traps.filter((_, i) => t & (1 << i)) };
    sel.code = s;
    return sel;
  };

  // 되풀이(순수): 고른 것과 센 것 → 1막 끝 상태(막간에서 이어 가게)
  //  거점 자료의 1막 거점(RULES.act1)을 차례로, 각 거점의 steps 배열 차례대로 같은 규칙으로 실행한다.
  //   dilemma: 글자에 담긴 선택 / card·know: 그 지식을 얻었을 때만 / poem: 더듬어 찾기·함정·고친 횟수
  //   그 밖(frag·gauge·dream·say의 fx …): 누구나 거치는 것으로 보고 실행한다(`when`이 맞을 때)
  C.replay = function (sel, places) {
    places = places || root.PLACES || {};
    const R = G.rules;
    const R0 = RU();
    const st = R.blank(sel.mode || 'basic');
    st.trail = [];
    const know = sel.know || {};
    for (const pid of R0.act1 || []) {
      R.enterPlaceOn(st, pid);
      for (const step of ((places[pid] || {}).steps) || []) {
        if (!step || (step.when && !R.ok(step.when, st))) continue;
        const o = { force: true, places };
        if (step.type === 'dilemma') {
          const c = (sel.choices || {})[step.dilemma];
          if (c) R.stepOn(st, step, pid, c, o);
        } else if (step.type === 'card' || step.type === 'know') {
          const ids = [].concat(step.history || [], step.know || []);
          if (ids.every((id) => know[id])) R.stepOn(st, step, pid, null, o);
        } else if (step.type === 'poem') {
          R.stepOn(st, step, pid, sel.puzzle || {}, o);
        } else {
          R.stepOn(st, step, pid, null, o);
        }
      }
      R.leavePlaceOn(st, pid);
    }
    st.act1Done = true;
    st.done = {};
    for (const pid of R0.act1 || []) st.done[G.app && G.app.key ? G.app.key.place(pid) : 'p:' + pid] = true;
    st.place = (R0.interlude || {}).place || 'interlude';
    return st;
  };

  // 글자 → 1막 끝 상태 전체(막간에서 이어 가게) 또는 { error }
  C.decode = function (str) {
    const sel = C.parse(str);
    if (sel.error) return sel;
    const st = C.replay(sel);
    st.code = sel.code;
    return st;
  };

  // 글자를 이 브라우저 저장에 넣는다(설정과 적어 둔 이름은 남긴다) → { ok:true, state } 또는 { error }
  C.restore = function (str) {
    const d = C.decode(str);
    if (d.error) return d;
    const name = G.save.state.name;
    const st = G.save.reset();
    const keep = {};
    for (const k of G.save.SETTINGS || []) if (k !== 'mode') keep[k] = st[k];
    Object.assign(st, JSON.parse(JSON.stringify(d)), keep);
    delete st.code;
    st.name = name || '';
    st.startedAt = Date.now();
    G.save.write();
    return { ok: true, state: st };
  };
})(typeof window !== 'undefined' ? window : globalThis);
