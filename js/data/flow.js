'use strict';
// 이야기 흐름(선생님이 고쳐도 되는 파일)
//  - order: 거점을 밟는 차례. 거점 내용은 js/data/places/*.js(PLACES[id])에 있다.
//  - places: 거점 이름·막·고지도 위 자리. 거점 파일이 아직 비어 있어도(준비 중) 이 이름으로 보인다.
//  - acts: 막마다 늘 보이는 한 문장 미션. 거점 파일에 mission을 적으면 그것이 먼저다.
window.FLOW = {
  title: '두 개의 항로',
  subtitle: '최척전',
  pre: '조위한 「최척전」',
  tagline: '흩어진 가족을 찾아, 바다를 두 번 건너다',
  hint: '이어폰을 끼면 더 잘 들려요',
  modes: {
    basic: { name: '처음 배우기', who: '고1 공통국어', desc: '「최척전」을 처음 만나요. 풀이가 함께 보이고 도움이 넉넉해요.' },
    deep: { name: '깊이 읽기', who: '고2·3 문학', desc: '원문과 역사를 더 깊이 들여다봐요. 생각할 거리가 더 나와요.' },
  },
  order: ['prologue', 'namwon', 'nanggoya', 'annam', 'interlude', 'hangzhou', 'sea', 'namwon_final'],
  acts: {
    1: { name: '1막', title: '안남으로 가는 항로', mission: '최척을 다시 만나라.' },
    2: { name: '2막', title: '조선으로 돌아가는 항로', mission: '가족이 있는 곳으로 돌아가라.' },
  },
  places: {
    prologue: { name: '서막 — 흩어지는 밤', act: 1, node: 'namwon' },
    namwon: { name: '남원', act: 1, node: 'namwon' },
    nanggoya: { name: '낭고야', act: 1, node: 'nanggoya' },
    annam: { name: '안남', act: 1, node: 'annam' },
    interlude: { name: '막간 — 항주의 몇 해', act: 2, node: 'hangzhou' },
    hangzhou: { name: '항주', act: 2, node: 'hangzhou' },
    sea: { name: '바다', act: 2, node: 'sea' },
    namwon_final: { name: '남원', act: 2, node: 'namwon' },
  },
};

// 고지도(js/core/oldmap.js): 동아시아를 가로 한 줄로 펼친다. 좌표는 지도 너비·높이에 대한 비율(0~1).
//  regions.blobs: [가운데 x, 가운데 y, 가로 반지름, 세로 반지름, 모양 씨앗, 기울기]
window.OLDMAP = {
  regions: [
    { id: 'joseon', name: '조선', label: [0.13, 0.13], blobs: [[0.13, 0.24, 0.1, 0.12, 3], [0.14, 0.5, 0.06, 0.22, 7, 0.15]] },
    { id: 'japan', name: '일본', label: [0.38, 0.17], blobs: [[0.35, 0.45, 0.035, 0.14, 11, 0.5], [0.41, 0.62, 0.05, 0.1, 13, -0.3], [0.38, 0.3, 0.025, 0.08, 17]] },
    { id: 'china', name: '중국', label: [0.63, 0.12], blobs: [[0.63, 0.3, 0.14, 0.24, 19], [0.6, 0.6, 0.09, 0.14, 23]] },
    { id: 'annam', name: '안남', label: [0.88, 0.2], blobs: [[0.87, 0.36, 0.07, 0.14, 29], [0.89, 0.62, 0.04, 0.16, 31, 0.2]] },
  ],
  nodes: {
    namwon: { name: '남원', x: 0.15, y: 0.58 },
    nanggoya: { name: '낭고야', x: 0.39, y: 0.66 },
    hangzhou: { name: '항주', x: 0.66, y: 0.5 },
    annam: { name: '안남', x: 0.88, y: 0.62 },
    sea: { name: '바다', x: 0.42, y: 0.86 },
  },
  paths: [
    { from: 'namwon', to: 'nanggoya' },
    { from: 'nanggoya', to: 'annam', via: [[0.55, 0.86], [0.76, 0.84]] },
    { from: 'annam', to: 'hangzhou', via: [[0.78, 0.5]] },
    { from: 'hangzhou', to: 'sea', via: [[0.6, 0.8]] },
    { from: 'sea', to: 'namwon', via: [[0.26, 0.82]] },
  ],
};
