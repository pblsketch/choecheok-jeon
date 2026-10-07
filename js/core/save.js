'use strict';
// 진행 저장: 이 브라우저(localStorage)에만 저장하고 서버로 보내지 않는다
//  게임 규칙에 쓰는 값(딜레마 결과 등)은 다른 파일에서 G.save.extend({ 이름: 처음 값 })으로 더한다.
(function () {
  const KEY = 'choecheok-jeon-v1';
  const extra = {}; // extend()로 더한 처음 값들
  const base = () => ({
    v: 1,
    // 설정
    mode: 'basic',          // basic: 처음 배우기(고1 공통국어) / deep: 깊이 읽기(고2·3 문학)
    font: 1,                // 글자 크기 배율
    sound: true,            // 효과음
    music: true,            // 배경음
    teacher: false,         // 선생님용(게이지 숫자, 장면 건너뛰기 …)
    // 학생
    name: '',               // 결과 화면에 적는 이름(반·번호 포함)
    // 두 게이지(0~10, 처음 5) — 화면에는 숫자 없이 막대로
    yeon: 5,                // 연(緣): 인연을 붙드는 힘
    saeng: 5,               // 생(生): 살아갈 여력
    tokens: [],             // 챙긴 신표 [{ id, name }]
    frags: {},              // 얻은 시구 조각: { 1:'…', 2:'…' } (칸 1~4)
    // 진행
    place: null,            // 지금(마지막으로) 있던 거점 id
    done: {},               // 끝낸 것: 'p:거점' · 'b:거점:목표' · 's:거점:단계'
    flags: {},              // 고른 것들(자유롭게 쓰는 칸)
    snap: {},               // 단계 하다 말고 껐을 때 되돌릴 값
    startedAt: 0,
    finishedAt: 0,
  });
  const fresh = () => Object.assign(base(), JSON.parse(JSON.stringify(extra)));
  const SETTINGS = ['mode', 'font', 'sound', 'music', 'teacher'];
  let S = fresh();
  G.save = {
    KEY,
    get state() { return S; },
    fresh,
    SETTINGS,
    // 단계를 다시 할 때 처음 값으로 되돌릴 칸(게이지·신표·조각). 다른 파일이 더할 수 있다.
    snapKeys: ['yeon', 'saeng', 'tokens', 'frags'],
    // 새 칸 더하기: 이미 불러온 저장에 그 칸이 없으면 처음 값을 넣는다
    extend(defaults) {
      Object.assign(extra, JSON.parse(JSON.stringify(defaults)));
      for (const k in defaults) if (!(k in S)) S[k] = JSON.parse(JSON.stringify(defaults[k]));
    },
    load() {
      try {
        const raw = localStorage.getItem(KEY);
        if (raw) S = Object.assign(fresh(), JSON.parse(raw));
      } catch (e) { /* 저장소를 못 쓰는 환경: 새로 시작 */ }
      return S;
    },
    write() {
      try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* 무시 */ }
    },
    // 처음부터: 진행과 이름은 지우고 설정(글자 크기·소리·선생님용·방식)은 남긴다
    reset() {
      const keep = {};
      for (const k of SETTINGS) keep[k] = S[k];
      S = Object.assign(fresh(), keep);
      this.write();
      return S;
    },
    started() { return Object.keys(S.done).length > 0 || !!S.place; },
  };
})();
