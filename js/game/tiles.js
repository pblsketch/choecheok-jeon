'use strict';
// 땅 타일: 코드로 그린 도트 타일(PPU 32). 이어 붙여도 이음새가 보이지 않게 칸마다 같은 씨앗의 잡음을 쓴다.
//  (「영웅의 길」에서 가져와 거점마다 다른 '테마' 무늬·빛·물결을 더했다)
//
//  맵 글자 → 타일
//   걸을 수 있음: '.' 풀 ',' 꽃밭 ':' 흙길 '=' 돌길(테마마다 박석·돌판·벽돌·디딤돌) '_' 마루·나무 부두 's' 모래 'm' 짙은 풀
//                'e' 굳은 흙 'p' 밭 'r' 붉은 깔개 'b' 다리 'd' 갑판 'k' 마당(다진 흙) 'q' 자갈 'n' 석축 길(큰 돌) 'v' 젖은 모래
//   막힘:        '#' 담장 'f' 울타리 'c' 바위 절벽 'h' 산울타리 'x' 바깥(검정) '~' 물 'w' 깊은 바다 'o' 논(물 댄 논)
//
//  테마: 맵 정의에 theme을 적으면 같은 글자라도 그 거점에 어울리는 색·무늬·빛으로 그린다(적지 않으면 'village').
//   'village'      남원 마을 — 늦여름 오후. 흙길·초가 마당·논밭, 따뜻한 햇빛
//   'port'         낭고야 포구 — 서늘한 아침. 화강암 돌판·잿빛 나무 부두, 갈매기
//   'harbor_night' 안남 밤 항구 — 붉은 벽돌·부두, 쪽빛 밤과 등불(맵에 night를 안 적어도 밤)
//   'garden'       항주 정원 — 이끼 낀 디딤돌·흰 자갈·연잎 연못, 꽃잎
//   'island'       섬 — 밝은 모래·바위·들풀, 맑은 옥빛 바다
//   예) maps: { pier: { name:'포구', theme:'port', grid:…, … } }
//
//  새 타일 더하기: G.tiles.add('글자', (g, x, y, tx, ty, frame, grid) => { … }, { solid:true, water:true })
//   (water:true로 더한 타일은 예전처럼 매 프레임 다시 그린다)
//  새 테마 더하기: G.tiles.THEMES.이름 = Object.assign({}, G.tiles.THEMES.village, { … 바꿀 색 … })
(function () {
  const T = 32;
  const TL = (G.tiles = { T });
  TL.SOLID = new Set(['#', 'f', 'c', 'h', 'x', '~', 'w', 'o']);
  TL.WATER = new Set(['~', 'w']);       // 물결이 움직이는 칸
  TL.SHINE = new Set(['o']);            // 물은 아니지만 반짝이는 칸(논)
  const CUSTOM = new Set();             // add()로 더한 물 타일(매 프레임 다시 그린다)
  TL.custom = CUSTOM;

  // 결정적 잡음(같은 칸은 늘 같은 무늬)
  const rnd = (x, y, k) => { let n = (x * 374761393 + y * 668265263 + k * 1442695041) | 0; n = (n ^ (n >>> 13)) * 1274126177; return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
  TL.rnd = rnd;
  const px = (g, x, y, c, w = 1, h = 1) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  const ri = (tx, ty, k, n) => Math.floor(rnd(tx, ty, k) * n);

  // ───────── 테마 색 ─────────
  const village = {
    name: '남원 마을',
    grass: { base: '#7a9d4a', dk: '#62853a', lt: '#8fb35a', tuft: '#4c6f2d', tip: '#b2cf72', flowers: ['#f2d667', '#f6f1e2', '#e39aa6'] },
    mgrass: { base: '#57793a', dk: '#466430', lt: '#6b8e46', tuft: '#3a5726', tip: '#82a656' },
    dirt: { base: '#c49b65', dk: '#ab8453', lt: '#d6b27c', peb: '#e8d1a6', pebSh: '#8a6a42' },
    hard: { base: '#a88a5f', dk: '#8f744e', lt: '#b99c6f' },
    yard: { base: '#d3b27f', dk: '#c09e6c', lt: '#e2c595', straw: '#ecd48f' },
    sand: { base: '#dcc795', dk: '#c9b27d', lt: '#ead8aa', shell: '#f7efe2' },
    wet: { base: '#b9a476', dk: '#a38f63', lt: '#cdbb8f' },
    gravel: { base: '#bdb6a5', dk: '#9b9484', lt: '#d6d0c0', raked: false },
    field: { base: '#8f6b40', furrow: '#77582f', sprout: '#7fae4c', tip: '#a9cf6c' },
    paddy: { base: '#6c9688', dk: '#5d8678', lt: '#8db8a8', seed: '#86b84c', tip: '#c2e47e', dike: '#a98352', dikeHi: '#c9a46f' },
    stone: { style: 'joseon', base: '#b1aa99', dk: '#8d8676', lt: '#cbc5b5', mortar: '#7f796c' },
    quay: { base: '#a39d90', dk: '#7d776b', lt: '#c2bcae' },
    wood: { base: '#a87444', dk: '#80552f', lt: '#c08a55', gap: '#5a3a1f', nail: '#4a2f18' },
    deck: { base: '#b78a55', dk: '#8f6638', lt: '#cfa16a', gap: '#6e4a26', nail: '#5a3a1f' },
    water: { base: '#4b87a6', dk: '#3f7898', lt: '#6aa3bd', shallow: 'rgba(170,220,215,.38)', hi: 'rgba(225,245,250,.55)', foam: '#eef6f2', spark: ['#ffffff', '#fff3c4'] },
    deep: { base: '#2c5c84', dk: '#244f75', lt: '#3f729b' },
    wall: { cap: '#3a3d45', capHi: '#545964', capDk: '#24262b', face: '#9a948b', faceLt: '#b0aaa0', faceDk: '#726d66' },
    hedge: { base: '#3d6b31', lt: '#578a41', dk: '#28491f', hi: '#79a756' },
    cliff: { base: '#857a6a', lt: '#a39784', dk: '#5f5649', hi: '#bcb09b' },
    // 화면 빛: 위왼쪽 햇빛·아래오른쪽 그늘·가장자리 어둡게(night면 밤 빛), 떠다니는 것(motes 먼지빛·petals 꽃잎·fireflies 반딧불·gulls 갈매기)
    light: { sun: 'rgba(255,214,150,.22)', shade: 'rgba(70,50,110,.20)', vignette: 0.32, cloud: true },
    ambient: 'motes',
    night: false,
  };
  const mix = (base, over) => { const o = {}; for (const k in base) o[k] = (over[k] && typeof base[k] === 'object' && !Array.isArray(base[k])) ? Object.assign({}, base[k], over[k]) : (k in over ? over[k] : base[k]); for (const k in over) if (!(k in o)) o[k] = over[k]; return o; };
  TL.mix = mix;
  TL.THEMES = {
    village,
    port: mix(village, {
      name: '낭고야 포구',
      grass: { base: '#6f9655', dk: '#5a8046', lt: '#86ab67', tuft: '#46683a', tip: '#a6c784', flowers: ['#f6f1e2', '#c9b6e6'] },
      dirt: { base: '#b7a07e', dk: '#9d8869', lt: '#cbb693', peb: '#dcd2c0', pebSh: '#7d705c' },
      sand: { base: '#d3c4a0', dk: '#bfb08a', lt: '#e2d6b6', shell: '#f4efe6' },
      stone: { style: 'block', base: '#9ba1a2', dk: '#7b8183', lt: '#b8bdbd', mortar: '#666b6d' },
      quay: { base: '#8f9496', dk: '#6c7173', lt: '#aeb3b3' },
      wood: { base: '#8c7862', dk: '#6d5b48', lt: '#a69179', gap: '#43372b', nail: '#2f2721' },
      water: { base: '#3e8794', dk: '#347885', lt: '#5ba0aa', shallow: 'rgba(160,215,205,.40)', hi: 'rgba(230,248,250,.55)', foam: '#f2f7f4', spark: ['#ffffff', '#e8f6ff'] },
      deep: { base: '#285f78', dk: '#21526a', lt: '#3a748c' },
      wall: { cap: '#33363c', capHi: '#4d525a', capDk: '#202226', face: '#e6e0d2', faceLt: '#f3eee2', faceDk: '#bfb7a6' },
      light: { sun: 'rgba(235,245,255,.18)', shade: 'rgba(40,60,100,.20)', vignette: 0.30, cloud: true },
      ambient: 'gulls',
    }),
    harbor_night: mix(village, {
      name: '안남 밤 항구',
      grass: { base: '#5d8b4c', dk: '#4b773f', lt: '#71a05c', tuft: '#3c6233', tip: '#8fbf72', flowers: ['#f2b84a', '#f6f1e2', '#e3708a'] },
      dirt: { base: '#b98a5d', dk: '#9f744b', lt: '#cc9f70', peb: '#e0c39d', pebSh: '#7a5636' },
      stone: { style: 'brick', base: '#a8634a', dk: '#8a4c37', lt: '#bf7a5c', mortar: '#6e3d2d' },
      wood: { base: '#8f5e3a', dk: '#6c4428', lt: '#a8734a', gap: '#3e2615', nail: '#2b1a0e' },
      quay: { base: '#857d72', dk: '#645d55', lt: '#9c9488' },
      water: { base: '#2e5f86', dk: '#264f73', lt: '#3f739b', shallow: 'rgba(120,170,200,.30)', hi: 'rgba(255,214,140,.55)', foam: '#dfe8ef', spark: ['#ffd27a', '#fff0c4', '#bfe2ff'] },
      deep: { base: '#1e4268', dk: '#18375a', lt: '#2b5580' },
      light: { sun: 'rgba(255,200,130,.10)', shade: 'rgba(30,30,80,.20)', vignette: 0.42, cloud: false },
      ambient: 'fireflies',
      night: true,
    }),
    garden: mix(village, {
      name: '항주 정원',
      grass: { base: '#77a853', dk: '#5f9043', lt: '#8fbf66', tuft: '#4a7a35', tip: '#b6dc85', flowers: ['#f4b6c6', '#f6f1e2', '#f7d36e', '#d77a9b'] },
      mgrass: { base: '#4f8a46', dk: '#41763b', lt: '#62a057', tuft: '#356630', tip: '#86c070' },
      stone: { style: 'flag', base: '#aeb0a3', dk: '#8b8e80', lt: '#c9cbbd', mortar: '#6f8f4f' },
      gravel: { base: '#dcd8ca', dk: '#bdb8a8', lt: '#ece9df', raked: true },
      water: { base: '#4f9688', dk: '#43867a', lt: '#6aaa9b', shallow: 'rgba(190,230,200,.35)', hi: 'rgba(240,255,245,.55)', foam: '#eef7ef', spark: ['#ffffff', '#fff6d6'], lotus: true },
      wood: { base: '#9a4f37', dk: '#7a3a27', lt: '#b36447', gap: '#4a2216', nail: '#3a1a10' },
      light: { sun: 'rgba(255,225,215,.20)', shade: 'rgba(80,60,110,.16)', vignette: 0.28, cloud: true },
      ambient: 'petals',
    }),
    island: mix(village, {
      name: '섬',
      grass: { base: '#8ba659', dk: '#748f48', lt: '#a1bb6c', tuft: '#5c7a37', tip: '#c3d98a', flowers: ['#f6f1e2', '#f2d667'] },
      mgrass: { base: '#6a8a45', dk: '#5a783a', lt: '#7d9d53', tuft: '#47652d', tip: '#9cbc68' },
      sand: { base: '#e8d6a4', dk: '#d6c290', lt: '#f3e5bd', shell: '#fbf3ea' },
      wet: { base: '#c7b07e', dk: '#b29b6c', lt: '#dbc699' },
      cliff: { base: '#8c8273', lt: '#aa9f8d', dk: '#665d51', hi: '#c6bba7' },
      water: { base: '#3c9aa5', dk: '#338a95', lt: '#5fb4b9', shallow: 'rgba(190,240,225,.45)', hi: 'rgba(240,255,255,.6)', foam: '#ffffff', spark: ['#ffffff', '#fffbe0'] },
      deep: { base: '#22688a', dk: '#1c5a79', lt: '#317c9e' },
      light: { sun: 'rgba(255,240,200,.20)', shade: 'rgba(30,70,110,.16)', vignette: 0.26, cloud: true },
      ambient: 'gulls',
    }),
  };
  TL.pal = TL.THEMES.village;
  TL.use = function (theme) { TL.pal = TL.THEMES[theme] || TL.THEMES.village; return TL.pal; };

  // ───────── 그리기 도구 ─────────
  function speckle(g, ox, oy, tx, ty, base, dots, n, k) {
    px(g, ox, oy, base, T, T);
    for (let i = 0; i < n; i++) {
      const r1 = rnd(tx, ty, k + i * 3), r2 = rnd(tx, ty, k + i * 3 + 1), r3 = rnd(tx, ty, k + i * 3 + 2);
      px(g, ox + Math.floor(r1 * T), oy + Math.floor(r2 * T), dots[Math.floor(r3 * dots.length)], r3 > 0.8 ? 2 : 1, 1);
    }
  }
  // 풀포기: 가운데가 높은 잎 다섯 가닥 + 밝은 끝
  function tuft(g, a, b, c, t) {
    px(g, a, b, c, 1, 3); px(g, a + 1, b - 1, c, 1, 4); px(g, a + 2, b - 3, c, 1, 6); px(g, a + 3, b - 1, c, 1, 4); px(g, a + 4, b, c, 1, 3);
    px(g, a + 2, b - 3, t, 1, 1); px(g, a, b, t, 1, 1); px(g, a + 4, b, t, 1, 1);
  }
  function flower(g, a, b, c) {
    px(g, a + 1, b, c, 1, 1); px(g, a, b + 1, c, 1, 1); px(g, a + 2, b + 1, c, 1, 1); px(g, a + 1, b + 2, c, 1, 1);
    px(g, a + 1, b + 1, '#f7d76a', 1, 1); px(g, a + 1, b + 3, 'rgba(40,70,30,.6)', 1, 1);
  }
  function pebble(g, a, b, q, w = 2) { px(g, a, b, q.peb, w, 2); px(g, a, b + 2, q.pebSh, w, 1); px(g, a + w, b + 1, q.pebSh, 1, 1); }
  // 돌 하나(밝은 윗변·왼변, 어두운 아랫변·오른변)
  function slab(g, x, y, w, h, q, tone) {
    px(g, x, y, tone || q.base, w, h);
    px(g, x, y, q.lt, w, 1); px(g, x, y, q.lt, 1, h);
    px(g, x, y + h - 1, q.dk, w, 1); px(g, x + w - 1, y, q.dk, 1, h);
  }
  function grass(g, x, y, tx, ty, q, k = 1) {
    speckle(g, x, y, tx, ty, q.base, [q.dk, q.lt, q.dk], 30, k);
    const n = 1 + ri(tx, ty, 9 + k, 3);
    for (let i = 0; i < n; i++) tuft(g, x + 2 + ri(tx, ty, 10 + i * 7 + k, 24), y + 6 + ri(tx, ty, 13 + i * 5 + k, 22), q.tuft, q.tip);
    if (rnd(tx, ty, 17 + k) > 0.55) { const a = x + 3 + ri(tx, ty, 18, 24), b = y + 3 + ri(tx, ty, 19, 24); px(g, a, b, q.lt, 3, 2); px(g, a + 1, b - 1, q.lt, 1, 1); px(g, a + 1, b + 2, q.dk, 2, 1); }
  }

  const STONE = {
    // 박석: 크기가 제각각인 돌판(조선)
    joseon(g, x, y, tx, ty, q) {
      px(g, x, y, q.mortar, T, T);
      const cy = 9 + ri(tx, ty, 51, 14), cx = 6 + ri(tx, ty, 50, 20), cx2 = 6 + ri(tx, ty, 52, 20);
      const tone = (k) => [q.base, q.lt, q.dk][ri(tx, ty, k, 3)] === q.dk ? '#a39c8c' : q.base;
      slab(g, x, y, cx - 1, cy - 1, q, tone(53)); slab(g, x + cx, y, T - cx, cy - 1, q, tone(54));
      slab(g, x, y + cy, cx2 - 1, T - cy, q, tone(55)); slab(g, x + cx2, y + cy, T - cx2, T - cy, q, tone(56));
      for (let i = 0; i < 8; i++) px(g, x + ri(tx, ty, 60 + i, T), y + ri(tx, ty, 70 + i, T), rnd(tx, ty, 80 + i) > 0.5 ? q.dk : q.lt, 1, 1);
    },
    // 화강암 돌판: 반 칸씩 엇갈린 큰 돌(일본 포구)
    block(g, x, y, tx, ty, q) {
      px(g, x, y, q.mortar, T, T);
      for (let r = 0; r < 3; r++) {
        const yy = y + r * 11, hh = r === 2 ? T - 22 : 10;
        const off = ((ty * 3 + r) % 2) * 10;
        for (let c = -1; c < 3; c++) {
          const xx = x + c * 20 + off, x0 = Math.max(x, xx), x1 = Math.min(x + T, xx + 19);
          if (x1 - x0 < 2) continue;
          const t = rnd(tx * 4 + c, ty * 3 + r, 57) > 0.6 ? q.lt : rnd(tx * 4 + c, ty * 3 + r, 58) > 0.75 ? q.dk : q.base;
          px(g, x0, yy, t, x1 - x0, hh); px(g, x0, yy, q.lt, x1 - x0, 1); px(g, x0, yy + hh - 1, q.dk, x1 - x0, 1);
        }
      }
      for (let i = 0; i < 10; i++) px(g, x + ri(tx, ty, 60 + i, T), y + ri(tx, ty, 70 + i, T), rnd(tx, ty, 80 + i) > 0.5 ? q.dk : q.lt, 1, 1);
    },
    // 붉은 벽돌(안남 항구)
    brick(g, x, y, tx, ty, q) {
      px(g, x, y, q.mortar, T, T);
      for (let r = 0; r < 6; r++) {
        const off = (r % 2) * 5;
        for (let c = -1; c < 4; c++) {
          const xx = x + c * 10 + off, x0 = Math.max(x, xx), x1 = Math.min(x + T, xx + 9);
          if (x1 - x0 < 1) continue;
          const v = rnd(tx * 5 + c, ty * 6 + r, 59);
          const t = v > 0.7 ? q.lt : v < 0.2 ? q.dk : q.base;
          px(g, x0, y + r * 5 + 1, t, x1 - x0, 4); px(g, x0, y + r * 5 + 1, 'rgba(255,220,190,.18)', x1 - x0, 1);
        }
      }
    },
    // 디딤돌: 이끼 사이 둥근 돌판(정원)
    flag(g, x, y, tx, ty, q) {
      speckle(g, x, y, tx, ty, q.mortar, ['#5f7f43', '#7fa25a'], 14, 61);
      const parts = [[1, 1, 14, 13], [17, 1, 14, 9], [1, 16, 10, 15], [12, 15, 19, 16], [17, 11, 14, 3]];
      for (let i = 0; i < 4; i++) {
        const [a, b, w, h] = parts[i];
        const jx = ri(tx, ty, 62 + i, 2), jy = ri(tx, ty, 66 + i, 2);
        const X = x + a + jx, Y = y + b + jy, W2 = w - jx, H2 = h - jy;
        const t = rnd(tx, ty, 70 + i) > 0.6 ? q.lt : q.base;
        px(g, X + 1, Y, t, W2 - 2, H2); px(g, X, Y + 1, t, W2, H2 - 2);
        px(g, X + 1, Y, q.lt, W2 - 2, 1); px(g, X + 1, Y + H2 - 1, q.dk, W2 - 2, 1); px(g, X + W2 - 1, Y + 1, q.dk, 1, H2 - 2);
      }
    },
  };
  function planks(g, x, y, tx, ty, q, rows = 4) {
    const ph = T / rows;
    for (let r = 0; r < rows; r++) {
      const yy = y + r * ph;
      const v = rnd(tx, ty * rows + r, 90);
      px(g, x, yy, v > 0.66 ? q.lt : v < 0.25 ? q.dk : q.base, T, ph);
      px(g, x, yy, 'rgba(255,240,210,.16)', T, 1);
      px(g, x, yy + ph - 1, q.gap, T, 1);
      // 나뭇결
      for (let i = 0; i < 2; i++) px(g, x + ri(tx, ty * rows + r, 91 + i, 24), yy + 2 + ri(tx, ty * rows + r, 93 + i, ph - 4), 'rgba(60,35,15,.28)', 4 + ri(tx, ty, 95 + i, 6), 1);
      // 이음매와 못
      const j = (r * 11 + tx * 13) % T;
      px(g, x + j, yy, q.gap, 1, ph - 1);
      px(g, x + (j + 2) % T, yy + 2, q.nail, 1, 1); px(g, x + (j + 2) % T, yy + ph - 3, q.nail, 1, 1);
    }
  }

  const DRAW = {
    '.': (g, x, y, tx, ty) => grass(g, x, y, tx, ty, TL.pal.grass),
    ',': (g, x, y, tx, ty) => {
      const q = TL.pal.grass;
      grass(g, x, y, tx, ty, q);
      for (let i = 0; i < 5; i++) flower(g, x + 2 + ri(tx, ty, 20 + i, 27), y + 2 + ri(tx, ty, 30 + i, 26), q.flowers[ri(tx, ty, 40 + i, q.flowers.length)]);
    },
    'm': (g, x, y, tx, ty) => grass(g, x, y, tx, ty, TL.pal.mgrass, 2),
    ':': (g, x, y, tx, ty) => {
      const q = TL.pal.dirt;
      speckle(g, x, y, tx, ty, q.base, [q.dk, q.lt, q.dk], 26, 3);
      for (let i = 0; i < 2 + ri(tx, ty, 24, 2); i++) pebble(g, x + 2 + ri(tx, ty, 25 + i, 26), y + 2 + ri(tx, ty, 28 + i, 26), q, 1 + ri(tx, ty, 31 + i, 2));
      if (rnd(tx, ty, 33) > 0.5) px(g, x, y + 6 + ri(tx, ty, 34, 20), 'rgba(90,60,30,.12)', T, 1);
    },
    'e': (g, x, y, tx, ty) => {
      const q = TL.pal.hard, gr = TL.pal.grass;
      speckle(g, x, y, tx, ty, q.base, [q.dk, q.lt, gr.dk], 34, 4);
      if (rnd(tx, ty, 35) > 0.6) tuft(g, x + 4 + ri(tx, ty, 36, 22), y + 8 + ri(tx, ty, 37, 18), gr.tuft, gr.tip);
    },
    'k': (g, x, y, tx, ty) => {
      const q = TL.pal.yard;
      speckle(g, x, y, tx, ty, q.base, [q.dk, q.lt], 22, 5);
      // 비질 자국과 짚 부스러기
      for (let i = 0; i < 3; i++) { const a = x + ri(tx, ty, 38 + i, 24), b = y + 4 + ri(tx, ty, 41 + i, 24); for (let j = 0; j < 6; j++) px(g, a + j, b + Math.round(Math.sin(j * 0.6) * 1.5), q.lt, 1, 1); }
      for (let i = 0; i < 3; i++) { const a = x + 2 + ri(tx, ty, 44 + i, 26), b = y + 2 + ri(tx, ty, 47 + i, 26); px(g, a, b, q.straw, 1, 1); px(g, a + 1, b + 1, q.straw, 1, 1); px(g, a + 2, b + 1, q.dk, 1, 1); }
    },
    's': (g, x, y, tx, ty) => {
      const q = TL.pal.sand;
      speckle(g, x, y, tx, ty, q.base, [q.dk, q.lt], 22, 5);
      // 모래 물결
      for (let r = 0; r < 2; r++) { const b = y + 6 + r * 14 + ri(tx, ty, 50 + r, 5); for (let i = 0; i < T; i++) if ((i + ri(tx, ty, 52 + r, 8)) % 9 < 6) px(g, x + i, b + Math.round(Math.sin((i + tx * T) / 5) * 1.2), q.lt, 1, 1); }
      if (rnd(tx, ty, 54) > 0.82) { const a = x + 4 + ri(tx, ty, 55, 22), b = y + 4 + ri(tx, ty, 56, 22); px(g, a, b, q.shell, 2, 1); px(g, a, b + 1, q.shell, 3, 1); px(g, a + 1, b + 2, q.dk, 2, 1); }
    },
    'v': (g, x, y, tx, ty) => {
      const q = TL.pal.wet;
      speckle(g, x, y, tx, ty, q.base, [q.dk, q.lt], 20, 6);
      for (let i = 0; i < 2; i++) px(g, x + ri(tx, ty, 57 + i, 20), y + 4 + ri(tx, ty, 59 + i, 24), 'rgba(255,255,255,.22)', 6 + ri(tx, ty, 61, 6), 1);
    },
    'q': (g, x, y, tx, ty) => {
      const q = TL.pal.gravel;
      px(g, x, y, q.base, T, T);
      for (let i = 0; i < 70; i++) { const a = ri(tx, ty, 100 + i, T), b = ri(tx, ty, 200 + i, T); px(g, x + a, y + b, rnd(tx, ty, 300 + i) > 0.5 ? q.dk : q.lt, 2, 1); }
      if (q.raked) for (let r = 0; r < T; r += 4) px(g, x, y + r, 'rgba(120,115,100,.22)', T, 1);
    },
    'n': (g, x, y, tx, ty) => {
      const q = TL.pal.quay;
      px(g, x, y, q.dk, T, T);
      const off = (ty % 2) * 8;
      for (let r = 0; r < 2; r++) for (let c = -1; c < 2; c++) {
        const xx = x + c * 16 + off + (r ? 8 : 0), x0 = Math.max(x, xx), x1 = Math.min(x + T, xx + 15);
        if (x1 - x0 < 2) continue;
        const t = rnd(tx * 3 + c, ty * 2 + r, 63) > 0.6 ? q.lt : q.base;
        px(g, x0, y + r * 16, t, x1 - x0, 15); px(g, x0, y + r * 16, q.lt, x1 - x0, 1); px(g, x0, y + r * 16 + 14, 'rgba(0,0,0,.25)', x1 - x0, 1);
      }
      for (let i = 0; i < 8; i++) px(g, x + ri(tx, ty, 64 + i, T), y + ri(tx, ty, 74 + i, T), q.dk, 1, 1);
    },
    'p': (g, x, y, tx, ty) => {
      const q = TL.pal.field;
      px(g, x, y, q.base, T, T);
      for (let r = 0; r < 4; r++) {
        px(g, x, y + r * 8 + 5, q.furrow, T, 2); px(g, x, y + r * 8 + 4, 'rgba(255,230,190,.12)', T, 1);
        for (let c = 2; c < T; c += 5) { const s = ri(tx * 9 + c, ty * 4 + r, 64, 2); px(g, x + c, y + r * 8 + 1 + s, q.sprout, 1, 3 - s); px(g, x + c + 1, y + r * 8 + 2, q.sprout, 1, 2); px(g, x + c, y + r * 8 + 1 + s, q.tip, 1, 1); }
      }
    },
    'o': (g, x, y, tx, ty) => {
      const q = TL.pal.paddy;
      speckle(g, x, y, tx, ty, q.base, [q.dk, q.lt], 18, 7);
      for (let r = 3; r < T; r += 7) for (let c = 2 + (r % 2) * 3; c < T; c += 6) { px(g, x + c, y + r, q.seed, 1, 3); px(g, x + c + 1, y + r - 1, q.seed, 1, 3); px(g, x + c + 1, y + r - 1, q.tip, 1, 1); px(g, x + c, y + r + 3, 'rgba(40,60,40,.35)', 2, 1); }
    },
    '=': (g, x, y, tx, ty) => { const q = TL.pal.stone; (STONE[q.style] || STONE.joseon)(g, x, y, tx, ty, q); },
    '_': (g, x, y, tx, ty) => planks(g, x, y, tx, ty, TL.pal.wood, 4),
    'r': (g, x, y) => { px(g, x, y, '#9e2b25', T, T); px(g, x, y, '#c9a13b', T, 2); px(g, x, y + T - 2, '#c9a13b', T, 2); for (let i = 4; i < T; i += 8) { px(g, x + i, y + 12, '#b8453d', 3, 3); px(g, x + i + 1, y + 13, '#d2a24a', 1, 1); } },
    'b': (g, x, y, tx, ty) => { const w = TL.pal.water; px(g, x, y, w.base, T, T); planks(g, x, y + 2, tx, ty, TL.pal.wood, 4); px(g, x, y + 2, '#5c3b20', T, 2); px(g, x, y + T - 4, '#5c3b20', T, 2); px(g, x, y + T - 2, 'rgba(0,0,0,.35)', T, 2); },
    '~': (g, x, y, tx, ty) => {
      const q = TL.pal.water;
      speckle(g, x, y, tx, ty, q.base, [q.dk, q.lt], 16, 8);
      for (let i = 0; i < 3; i++) px(g, x + ri(tx, ty, 80 + i, 22), y + 3 + ri(tx, ty, 90 + i, 26), q.lt, 4 + ri(tx, ty, 95 + i, 5), 1);
      if (q.lotus && rnd(tx, ty, 97) > 0.62) {
        // 연잎(동그란 잎에 갈라진 틈) + 가끔 분홍 연꽃
        const a = x + 6 + ri(tx, ty, 98, 16), b = y + 6 + ri(tx, ty, 99, 16), r = 4 + ri(tx, ty, 100, 3);
        g.fillStyle = '#3f7d3e'; g.beginPath(); g.arc(a, b + 1, r, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#5f9e4a'; g.beginPath(); g.arc(a, b, r, 0, Math.PI * 2); g.fill();
        g.fillStyle = q.base; g.beginPath(); g.moveTo(a, b); g.lineTo(a + r + 1, b - 2); g.lineTo(a + r + 1, b + 1); g.closePath(); g.fill();
        px(g, a - 2, b - 2, '#7fbb62', 2, 1);
        if (rnd(tx, ty, 101) > 0.6) { px(g, a - r, b - r, '#f2a7bf', 3, 3); px(g, a - r + 1, b - r - 1, '#fbd3df', 1, 2); px(g, a - r + 1, b - r + 1, '#f7d76a', 1, 1); }
      }
    },
    'w': (g, x, y, tx, ty) => {
      const q = TL.pal.deep;
      speckle(g, x, y, tx, ty, q.base, [q.dk, q.lt], 14, 9);
      for (let i = 0; i < 2; i++) px(g, x + ri(tx, ty, 180 + i, 22), y + 3 + ri(tx, ty, 190 + i, 26), q.lt, 5 + ri(tx, ty, 195 + i, 5), 1);
    },
    '#': (g, x, y, tx, ty, f, grid) => {
      const q = TL.pal.wall;
      const below = grid && grid[ty + 1] ? grid[ty + 1][tx] : '#';
      if (below === '#') {
        // 담장 윗면(위에서 본 기와 등마루)
        px(g, x, y, q.cap, T, T);
        for (let i = 2; i < T; i += 5) { px(g, x + i, y, q.capHi, 3, T); px(g, x + i + 2, y, q.capDk, 1, T); }
        px(g, x + 13, y, q.capDk, 6, T); px(g, x + 14, y, q.capHi, 2, T);
        return;
      }
      // 담장 앞면: 위는 검은 기와, 아래는 돌 쌓기(포구는 흰 회벽)
      px(g, x, y, q.face, T, T);
      for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) { const bx = x + c * 11 - (r % 2 ? 5 : 0), by = y + 13 + r * 6; px(g, Math.max(x, bx), by, rnd(tx * 4 + c, ty * 3 + r, 110) > 0.5 ? q.faceLt : q.face, Math.min(10, bx + 10 - x), 5); px(g, Math.max(x, bx), by + 5, q.faceDk, Math.min(11, bx + 11 - x), 1); }
      px(g, x, y, q.cap, T, 10);
      for (let i = 0; i < T; i += 4) { px(g, x + i, y + 1, q.capHi, 2, 7); px(g, x + i + 1, y + 8, q.capHi, 1, 2); }
      px(g, x, y + 10, q.capDk, T, 2); px(g, x, y + 12, 'rgba(0,0,0,.25)', T, 2);
    },
    'f': (g, x, y, tx, ty, f, grid) => {
      DRAW['.'](g, x, y, tx, ty);
      const at = (a, b) => (grid && grid[b] ? grid[b][a] : '');
      const v = at(tx, ty - 1) === 'f' || at(tx, ty + 1) === 'f', hz = at(tx - 1, ty) === 'f' || at(tx + 1, ty) === 'f' || !v;
      if (hz) { px(g, x, y + 24, 'rgba(0,0,0,.18)', T, 3); px(g, x, y + 12, '#8a5d33', T, 3); px(g, x, y + 20, '#8a5d33', T, 3); px(g, x, y + 12, '#b07a46', T, 1); px(g, x, y + 20, '#b07a46', T, 1); }
      if (v) { px(g, x + 12, y, '#8a5d33', 3, T); px(g, x + 19, y, '#8a5d33', 3, T); px(g, x + 12, y, '#b07a46', 1, T); }
      px(g, x + 13, y + 28, 'rgba(0,0,0,.22)', 8, 2);
      px(g, x + 13, y + 6, '#6e4726', 6, 22); px(g, x + 13, y + 6, '#a0703f', 1, 22); px(g, x + 13, y + 5, '#b98a55', 6, 1); px(g, x + 13, y + 26, '#4a2f18', 6, 2);
    },
    'h': (g, x, y, tx, ty) => {
      const q = TL.pal.hedge;
      px(g, x, y, q.dk, T, T);
      // 둥근 잎덩이 넷(아래쪽은 그늘)
      const blobs = [[8, 9], [23, 8], [9, 23], [24, 22]];
      for (let i = 0; i < 4; i++) {
        const [a, b] = blobs[i]; const r = 8 + ri(tx, ty, 120 + i, 3);
        g.fillStyle = q.base; g.beginPath(); g.arc(x + a, y + b, r, 0, Math.PI * 2); g.fill();
        g.fillStyle = q.lt; g.beginPath(); g.arc(x + a - 2, y + b - 2, r - 3, 0, Math.PI * 2); g.fill();
        px(g, x + a - 3, y + b - 4, q.hi, 2, 1); px(g, x + a + 1, y + b - 5, q.hi, 1, 1);
      }
      for (let i = 0; i < 10; i++) px(g, x + ri(tx, ty, 130 + i, 30), y + ri(tx, ty, 140 + i, 30), rnd(tx, ty, 150 + i) > 0.5 ? q.hi : q.dk, 1, 1);
    },
    'c': (g, x, y, tx, ty) => {
      const q = TL.pal.cliff;
      px(g, x, y, q.dk, T, T);
      for (let i = 0; i < 5; i++) {
        const a = ri(tx, ty, 150 + i, 22), b = ri(tx, ty, 160 + i, 22), w = 9 + ri(tx, ty, 165 + i, 6), h = 7 + ri(tx, ty, 170 + i, 5);
        px(g, x + a, y + b, q.base, w, h); px(g, x + a + 1, y + b, q.lt, w - 2, 2); px(g, x + a, y + b + 1, q.lt, 1, h - 2);
        px(g, x + a + 2, y + b, q.hi, 2, 1); px(g, x + a, y + b + h - 1, 'rgba(0,0,0,.35)', w, 1);
      }
    },
    'x': (g, x, y) => px(g, x, y, '#14161c', T, T),
    // 갑판: 밝은 널빤지를 가로로 깔고 못 자국을 찍는다
    'd': (g, x, y, tx, ty) => planks(g, x, y, tx, ty, TL.pal.deck, 4),
  };
  TL.add = function (ch, fn, o = {}) {
    DRAW[ch] = fn;
    if (o.solid) TL.SOLID.add(ch); else TL.SOLID.delete(ch);
    if (o.water) { TL.WATER.add(ch); CUSTOM.add(ch); } else { TL.WATER.delete(ch); CUSTOM.delete(ch); }
  };
  TL.draw = function (g, ch, x, y, tx, ty, frame, grid) { (DRAW[ch] || DRAW['.'])(g, x, y, tx, ty, frame, grid); };

  // ───────── 가장자리: 그늘·물가·풀 경계·논두렁 ─────────
  const SHADOWER = new Set(['#', 'c', 'h']);
  const BARE = new Set([':', 'e', 's', 'k', 'q', 'v', '=', 'n']);
  const SOFT = new Set(['.', ',', 'm', 'f']);
  TL.edges = function (g, grid, tx, ty, x, y) {
    const at = (a, b) => (grid[b] && grid[b][a]) || 'x';
    const c = at(tx, ty);
    const P = TL.pal;
    if (TL.WATER.has(c)) {
      // 얕은 물빛·물거품은 polish()가 픽셀 단위로 그린다. 여기서는 담장·절벽 아래 물 그늘만
      if (SHADOWER.has(at(tx, ty - 1))) { g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(x, y, T, 6); }
      return;
    }
    if (c === 'o') {
      // 논두렁: 논이 아닌 쪽 변에 흙둑
      const d = P.paddy;
      const not = (a, b) => at(a, b) !== 'o';
      if (not(tx, ty - 1)) { px(g, x, y, d.dike, T, 3); px(g, x, y, d.dikeHi, T, 1); }
      if (not(tx, ty + 1)) { px(g, x, y + T - 3, d.dike, T, 3); px(g, x, y + T - 1, 'rgba(0,0,0,.2)', T, 1); }
      if (not(tx - 1, ty)) { px(g, x, y, d.dike, 3, T); px(g, x, y, d.dikeHi, 1, T); }
      if (not(tx + 1, ty)) px(g, x + T - 3, y, d.dike, 3, T);
      return;
    }
    if (TL.SOLID.has(c)) return;
    // 담장·바위·산울타리 아래 그늘(부드럽게 옅어진다)
    if (SHADOWER.has(at(tx, ty - 1))) for (let i = 0; i < 7; i++) { g.fillStyle = `rgba(20,16,30,${0.34 * (1 - i / 7)})`; g.fillRect(x, y + i, T, 1); }
    if (SHADOWER.has(at(tx - 1, ty))) for (let i = 0; i < 4; i++) { g.fillStyle = `rgba(20,16,30,${0.18 * (1 - i / 4)})`; g.fillRect(x + i, y, 1, T); }
    // 새로 더한 물 타일(add)에 닿은 뭍: 젖은 띠(기본 물은 polish()가 그린다)
    const cw = (a, b) => CUSTOM.has(at(a, b));
    g.fillStyle = 'rgba(60,50,30,.22)';
    if (cw(tx, ty - 1)) g.fillRect(x, y, T, 3);
    if (cw(tx, ty + 1)) g.fillRect(x, y + T - 3, T, 3);
    if (cw(tx - 1, ty)) g.fillRect(x, y, 3, T);
    if (cw(tx + 1, ty)) g.fillRect(x + T - 3, y, 3, T);
    // 맨땅에 풀이 넘어온 가장자리
    if (BARE.has(c)) {
      const q = P.grass;
      g.fillStyle = q.base;
      const soft = (a, b) => SOFT.has(at(a, b));
      if (soft(tx, ty - 1)) for (let i = 0; i < T; i += 2) g.fillRect(x + i, y, 2, 1 + ((i * 7 + tx * 3) % 4));
      if (soft(tx, ty + 1)) for (let i = 0; i < T; i += 2) { const hh = 1 + ((i * 5 + ty) % 4); g.fillRect(x + i, y + T - hh, 2, hh); }
      if (soft(tx - 1, ty)) for (let i = 0; i < T; i += 2) g.fillRect(x, y + i, 1 + ((i * 3 + ty) % 4), 2);
      if (soft(tx + 1, ty)) for (let i = 0; i < T; i += 2) { const ww = 1 + ((i * 3 + tx) % 4); g.fillRect(x + T - ww, y + i, ww, 2); }
      g.fillStyle = q.tip;
      if (soft(tx, ty - 1)) for (let i = 1; i < T; i += 6) g.fillRect(x + i, y + ((i * 7 + tx * 3) % 4), 1, 1);
    }
  };

  // ───────── 땅 다듬기(한 번만): 모서리 둥글리기 → 경계 흔들기 → 물가 얕은 물빛·젖은 띠 → 넓은 얼룩 ─────────
  //  타일 격자의 계단 모양 경계를 둥글고 구불구불하게 만든다. 담장·마루·돌길 같은 '지은 것'은 건드리지 않는다.
  function vnoise(x, y, s, k) {
    const X = Math.floor(x / s), Y = Math.floor(y / s), fx = x / s - X, fy = y / s - Y;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const a = rnd(X, Y, k), b = rnd(X + 1, Y, k), c = rnd(X, Y + 1, k), d = rnd(X + 1, Y + 1, k);
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  }
  const GRASSY = new Set(['.', ',', 'm']);
  const BAREISH = new Set([':', 'e', 's', 'k', 'v', 'q']);
  const NATURAL = new Set(['.', ',', 'm', ':', 'e', 's', 'k', 'v', 'p', 'o', 'q', 'f']);
  const isWater = (ch) => TL.WATER.has(ch) && !CUSTOM.has(ch);
  const cls = (ch) => (isWater(ch) ? 'W' : GRASSY.has(ch) ? 'G' : BAREISH.has(ch) ? 'B' : null);
  // 흔들어도 되는 칸: 자연 바닥과 물
  const warpable = (ch) => GRASSY.has(ch) || BAREISH.has(ch) || isWater(ch);
  function polish(g, grid, W, H) {
    let id;
    try { id = g.getImageData(0, 0, W, H); } catch (e) { return null; }
    const d = id.data;
    const gw = grid[0].length, gh = grid.length;
    const chAt = (x, y) => { const r = grid[y >> 5]; return r ? r[x >> 5] : undefined; };
    const tAt = (tx, ty) => (grid[ty] && grid[ty][tx]) || 'x';
    // 물 픽셀 표시(둥글리기·흔들기 때 색과 함께 옮겨 실제 물가 모양을 따라간다)
    const isW = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (isWater(chAt(x, y))) isW[y * W + x] = 1;
    // 1) 볼록한 모서리 둥글리기: 양옆 두 이웃이 같은 다른 땅이면 모서리를 이웃 무늬로 깎는다
    const src = new Uint8ClampedArray(d), msrc = new Uint8Array(isW);
    const R = 15;
    for (let ty = 0; ty < gh; ty++) for (let tx = 0; tx < gw; tx++) {
      const c = cls(tAt(tx, ty)); if (!c) continue;
      for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const hc = tAt(tx + sx, ty), vc = tAt(tx, ty + sy);
        // 다른 종류(물·풀·맨땅)이거나, 같은 종류라도 다른 글자(풀↔짙은 풀, 모래↔흙)면 둥글린다
        if (hc !== vc || !cls(hc) || hc === tAt(tx, ty)) continue;
        const ox = tx * T + (sx < 0 ? 0 : T / 2), oy = ty * T + (sy < 0 ? 0 : T / 2);
        const cxl = sx < 0 ? R + 1 : T / 2 - R - 1, cyl = sy < 0 ? R + 1 : T / 2 - R - 1;
        for (let ly = 0; ly < T / 2; ly++) for (let lx = 0; lx < T / 2; lx++) {
          if (Math.hypot(lx + 0.5 - cxl, ly + 0.5 - cyl) <= R) continue;
          const x = ox + lx, y = oy + ly, xs = x + sx * T;
          if (xs < 0 || xs >= W) continue;
          const p = (y * W + x) * 4, q = (y * W + xs) * 4;
          d[p] = src[q]; d[p + 1] = src[q + 1]; d[p + 2] = src[q + 2];
          isW[p >> 2] = msrc[q >> 2];
        }
      }
    }
    // 2) 경계 흔들기: 자연 바닥·물 칸에서 조금 옆의 색을 가져와 경계를 구불구불하게
    const src2 = new Uint8ClampedArray(d), msrc2 = new Uint8Array(isW);
    const A = 6;
    for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) {
      const ch = chAt(x, y); if (!warpable(ch)) continue;
      const dx = Math.round((vnoise(x, y, 26, 31) - 0.5) * 2 * A), dy = Math.round((vnoise(x, y, 26, 37) - 0.5) * 2 * A);
      if (!dx && !dy) continue;
      const sx = Math.max(0, Math.min(W - 2, x + dx)), sy = Math.max(0, Math.min(H - 2, y + dy));
      if (!warpable(chAt(sx, sy))) continue;
      for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) {
        const p = ((y + j) * W + x + i) * 4, q = ((sy + j) * W + sx + i) * 4;
        d[p] = src2[q]; d[p + 1] = src2[q + 1]; d[p + 2] = src2[q + 2];
        isW[p >> 2] = msrc2[q >> 2];
      }
    }
    // 3) 물가: 물 픽셀이 뭍에서 얼마나 떨어졌나(최대 7)를 재서 얕은 물빛·물거품 자리를, 뭍 쪽엔 젖은 띠를
    const wq = TL.pal.water;
    const dist = new Uint8Array(W * H).fill(255);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x; if (!isW[i]) continue;
      if ((x > 0 && !isW[i - 1] && chAt(x - 1, y) !== 'x') || (x < W - 1 && !isW[i + 1] && chAt(x + 1, y) !== 'x') || (y > 0 && !isW[i - W] && chAt(x, y - 1) !== 'x') || (y < H - 1 && !isW[i + W] && chAt(x, y + 1) !== 'x')) dist[i] = 1;
    }
    for (let k = 2; k <= 7; k++) for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const i = y * W + x; if (!isW[i] || dist[i] !== 255) continue;
      if (dist[i - 1] === k - 1 || dist[i + 1] === k - 1 || dist[i - W] === k - 1 || dist[i + W] === k - 1) dist[i] = k;
    }
    const sh = hex(wq.lt);
    const foamA = document.createElement('canvas'), foamB = document.createElement('canvas');
    foamA.width = foamB.width = W; foamA.height = foamB.height = H;
    const fa = foamA.getContext('2d').createImageData(W, H), fb = foamB.getContext('2d').createImageData(W, H);
    const fc = hex(wq.foam);
    let anyFoam = false;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, p = i * 4;
      if (isW[i]) {
        const k = dist[i];
        if (k <= 7) {
          // 얕은 물: 뭍에 가까울수록 밝은 물빛
          const t = (8 - k) / 8 * 0.55;
          d[p] += (sh[0] + 30 - d[p]) * t; d[p + 1] += (sh[1] + 30 - d[p + 1]) * t; d[p + 2] += (sh[2] + 20 - d[p + 2]) * t;
          const wav = vnoise(x, y, 9, 41);
          if (k <= 2 || (k === 3 && wav > 0.55)) { fa.data[p] = fc[0]; fa.data[p + 1] = fc[1]; fa.data[p + 2] = fc[2]; fa.data[p + 3] = 230; anyFoam = true; }
          else if (k >= 4 && k <= 6 && wav > 0.42) { fb.data[p] = fc[0]; fb.data[p + 1] = fc[1]; fb.data[p + 2] = fc[2]; fb.data[p + 3] = 170; }
        }
      } else if (chAt(x, y) !== 'x') {
        // 뭍 쪽 젖은 띠(물에서 2픽셀 안)
        const nearW = (x > 1 && isW[i - 2]) || (x > 0 && isW[i - 1]) || (x < W - 1 && isW[i + 1]) || (x < W - 2 && isW[i + 2]) || (y > 0 && isW[i - W]) || (y < H - 1 && isW[i + W]) || (y > 1 && isW[i - 2 * W]) || (y < H - 2 && isW[i + 2 * W]);
        if (nearW && NATURAL.has(chAt(x, y))) { d[p] *= 0.84; d[p + 1] *= 0.84; d[p + 2] *= 0.86; }
      }
    }
    // 4) 넓은 얼룩(밝고 어두운 자리, 살짝 따뜻하거나 서늘하게)
    for (let y = 0; y < H; y += 2) {
      const row = grid[y >> 5];
      for (let x = 0; x < W; x += 2) {
        const ch = row[x >> 5];
        const nat = NATURAL.has(ch), wat = isWater(ch);
        if (!nat && !wat) continue;
        const n = vnoise(x, y, 96, 7) * 0.65 + vnoise(x, y, 28, 11) * 0.35 - 0.5;
        const k = (wat ? 0.10 : 0.20) * n;
        const warm = nat ? n * 14 : 0;
        for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) {
          const p = ((y + j) * W + (x + i)) * 4;
          d[p] = d[p] * (1 + k) + warm;
          d[p + 1] = d[p + 1] * (1 + k) + warm * 0.5;
          d[p + 2] = d[p + 2] * (1 + k) - warm * 0.4;
        }
      }
    }
    g.putImageData(id, 0, 0);
    if (!anyFoam) return { isW, dist };
    foamA.getContext('2d').putImageData(fa, 0, 0);
    foamB.getContext('2d').putImageData(fb, 0, 0);
    return { foamA, foamB, isW, dist };
  }
  function hex(c) {
    if (!c || c[0] !== '#') return [200, 220, 230];
    const n = parseInt(c.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  // 맵 전체의 땅을 한 장의 캔버스로 미리 그린다(물결·반짝임은 animate가 매 프레임 덧그린다)
  //  theme: 위 THEMES의 이름(없으면 village)
  TL.render = function (grid, theme) {
    TL.use(theme);
    const h = grid.length, w = grid[0].length;
    const c = document.createElement('canvas');
    c.width = w * T; c.height = h * T;
    const g = c.getContext('2d', { willReadFrequently: true });
    // 그리는 동안의 테마 색
    g.imageSmoothingEnabled = false;
    const water = [], shine = [];
    const at = (a, b) => (grid[b] && grid[b][a]) || 'x';
    for (let ty = 0; ty < h; ty++) for (let tx = 0; tx < w; tx++) {
      const ch = grid[ty][tx];
      TL.draw(g, ch, tx * T, ty * T, tx, ty, 0, grid);
      if (TL.WATER.has(ch)) {
        // 뭍에 닿은 변(물거품 자리): 1 위 · 2 아래 · 4 왼쪽 · 8 오른쪽
        const land = (a, b) => { const k = at(a, b); return k !== 'x' && !TL.WATER.has(k); };
        const mask = (land(tx, ty - 1) ? 1 : 0) | (land(tx, ty + 1) ? 2 : 0) | (land(tx - 1, ty) ? 4 : 0) | (land(tx + 1, ty) ? 8 : 0);
        water.push([tx, ty, ch, mask]);
      } else if (TL.SHINE.has(ch)) shine.push([tx, ty, ch, 0]);
    }
    for (let ty = 0; ty < h; ty++) for (let tx = 0; tx < w; tx++) TL.edges(g, grid, tx, ty, tx * T, ty * T);
    const pol = polish(g, grid, c.width, c.height) || {};
    // 반짝임·물결 줄은 사방이 물인 칸에만(물가 칸은 흔들기로 뭍이 섞여 있다)
    for (const wt of water) { const [tx, ty] = wt; let inner = true; for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const k = at(tx + i, ty + j); if (k !== 'x' && !TL.WATER.has(k)) inner = false; } wt[4] = inner; }
    return { canvas: c, water, shine, theme: theme || 'village', foamA: pol.foamA || null, foamB: pol.foamB || null };
  };

  // ───────── 매 프레임: 물결·반짝임·물거품 ─────────
  //  g: 그릴 캔버스(맵 해상도), ground: render()의 결과, cx·cy: 카메라, t: 초
  TL.animate = function (g, ground, cx, cy, vw, vh, t) {
    const P = TL.pal, q = P.water;
    const tx0 = Math.floor(cx / T) - 1, ty0 = Math.floor(cy / T) - 1, tx1 = Math.ceil((cx + vw) / T), ty1 = Math.ceil((cy + vh) / T);
    const frame = Math.floor(t * 3) % 8;
    // 물가 거품: 두 겹이 엇갈려 밀려왔다 물러난다
    if (ground.foamA) {
      const sx = Math.max(0, cx), sy = Math.max(0, cy), w = Math.min(ground.foamA.width - sx, vw - (sx - cx)), hh = Math.min(ground.foamA.height - sy, vh - (sy - cy));
      if (w > 0 && hh > 0) {
        g.globalAlpha = 0.55 + 0.4 * (0.5 + 0.5 * Math.sin(t * 1.3));
        g.drawImage(ground.foamA, sx, sy, w, hh, sx - cx, sy - cy, w, hh);
        g.globalAlpha = 0.5 * (0.5 + 0.5 * Math.sin(t * 1.3 - 1.9));
        g.drawImage(ground.foamB, sx, sy, w, hh, sx - cx, sy - cy, w, hh);
        g.globalAlpha = 1;
      }
    }
    for (const [wx, wy, ch, , inner] of ground.water) {
      if (wx < tx0 || wx > tx1 || wy < ty0 || wy > ty1) continue;
      const X = wx * T - cx, Y = wy * T - cy;
      if (CUSTOM.has(ch)) { TL.draw(g, ch, X, Y, wx, wy, frame); continue; }
      if (!inner) continue;
      // 천천히 흐르는 물결 줄
      for (let i = 0; i < 3; i++) {
        const sp = 4 + rnd(wx, wy, 200 + i) * 6;
        const off = ((t * sp + rnd(wx, wy, 210 + i) * 40) % 40) - 6;
        const b = 3 + Math.floor(rnd(wx, wy, 220 + i) * 26);
        const a = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(t * 1.4 + wx * 0.7 + wy * 1.3 + i));
        g.globalAlpha = a;
        g.fillStyle = q.hi;
        g.fillRect(Math.round(X + off), Math.round(Y + b + Math.sin(t * 2 + i + wx) * 0.8), 5 + i * 2, 1);
      }
      g.globalAlpha = 1;
      // 반짝임(별처럼 잠깐 빛났다 사라진다)
      for (let i = 0; i < 2; i++) {
        const s = Math.sin(t * (2.1 + i * 0.7) + rnd(wx, wy, 230 + i) * 40);
        if (s > 0.9) {
          const sx = Math.round(X + 3 + rnd(wx, wy, 240 + i) * 26), sy = Math.round(Y + 3 + rnd(wx, wy, 250 + i) * 26);
          g.fillStyle = q.spark[Math.floor(rnd(wx, wy, 260 + i) * q.spark.length)];
          g.fillRect(sx, sy, 1, 1);
          if (s > 0.97) { g.fillRect(sx - 1, sy, 3, 1); g.fillRect(sx, sy - 1, 1, 3); }
        }
      }
    }
    // 논물 반짝임
    for (const [wx, wy] of ground.shine || []) {
      if (wx < tx0 || wx > tx1 || wy < ty0 || wy > ty1) continue;
      const s = Math.sin(t * 1.7 + rnd(wx, wy, 270) * 40);
      if (s > 0.92) { g.fillStyle = 'rgba(255,255,240,.85)'; g.fillRect(Math.round(wx * T - cx + 4 + rnd(wx, wy, 271) * 24), Math.round(wy * T - cy + 4 + rnd(wx, wy, 272) * 24), 2, 1); }
    }
  };
})();
