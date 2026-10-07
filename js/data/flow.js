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

// 고지도(js/core/oldmap.js): 그림책풍 동아시아 옛 지도 그림(assets/ui/oldmap.webp, 1536×1024) 위에 얹는 글자·점·뱃길.
//  좌표는 지도 그림의 너비·높이에 대한 비율(0~1). 그림 속 실제 땅 위치에 맞췄다(서쪽 안남·중국, 가운데 조선, 동쪽 일본).
//  nodes: { 이름, x, y, label:'top'|'bottom'|'left'|'right'(지명 글자 자리) }
//  paths: 거점 차례대로 옮겨 갈 때 배가 지나는 길(via: 꺾이는 점들). regions: 나라 이름을 옅게 얹을 자리
//  routes.act2: 2막 항로 고르기(항주 → 조선). 바다 거점에서 G.oldmap.show({ from:'hangzhou', pick:true, paths: OLDMAP.routes.act2 })처럼 쓴다
window.OLDMAP = {
  regions: [
    { id: 'joseon', name: '조선', label: [0.565, 0.075] },
    { id: 'japan', name: '일본', label: [0.79, 0.12] },
    { id: 'china', name: '중국', label: [0.2, 0.26] },
    { id: 'annam', name: '안남', label: [0.105, 0.9] },
  ],
  nodes: {
    namwon: { name: '남원', x: 0.55, y: 0.171, label: 'top' },
    suncheon: { name: '순천', x: 0.566, y: 0.202, label: 'right' },
    nanggoya: { name: '낭고야', x: 0.609, y: 0.249, label: 'right' },
    hangzhou: { name: '항주', x: 0.384, y: 0.322, label: 'left' },
    sea: { name: '바다', x: 0.485, y: 0.293, label: 'bottom' },
    annam: { name: '안남', x: 0.193, y: 0.781, label: 'left' },
  },
  paths: [
    { from: 'namwon', to: 'nanggoya', via: [[0.561, 0.212], [0.588, 0.236]] },
    { from: 'nanggoya', to: 'annam', via: [[0.586, 0.322], [0.495, 0.459], [0.456, 0.625], [0.339, 0.713], [0.247, 0.771]] },
    { from: 'annam', to: 'hangzhou', via: [[0.247, 0.742], [0.293, 0.64], [0.365, 0.547], [0.381, 0.527], [0.423, 0.41]] },
    { from: 'hangzhou', to: 'sea', via: [[0.436, 0.308]] },
    { from: 'sea', to: 'namwon', via: [[0.534, 0.234]] },
    { from: 'sea', to: 'suncheon', via: [[0.54, 0.24]] },
    { from: 'suncheon', to: 'namwon' },
  ],
  routes: {
    // 연안길: 중국 해안을 따라 북상한 뒤 산둥 끝에서 서해를 건너 조선 서해안으로 / 바다길: 동중국해를 바로 가로질러 조선 남해안으로
    act2: [
      { id: 'coast', from: 'hangzhou', to: 'namwon', label: '연안길', labelAt: 0.45, via: [[0.417, 0.264], [0.43, 0.212], [0.459, 0.176], [0.514, 0.148]], desc: '중국 해안을 따라 북쪽으로 올라가 서해를 건넌다' },
      { id: 'open', from: 'hangzhou', to: 'suncheon', label: '바다길', labelAt: 0.8, via: [[0.456, 0.33], [0.508, 0.29], [0.547, 0.232]], desc: '동중국해를 바로 가로질러 조선 남해안에 닿는다' },
    ],
  },
};
