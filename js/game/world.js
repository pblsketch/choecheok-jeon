'use strict';
// 탑다운 맵 엔진(「영웅의 길」 엔진에서 싸움·기술·적장을 빼고 가져왔다)
//  - 캔버스에 도트 맵(한 칸 32px)을 그리고, 옥영을 움직여 사람에게 말을 걸고 자리를 살핀다.
//  - 거점(PLACES[id]) 하나 = 맵 몇 장 + 사람(cast) + 목표(beats) + 단계(steps).
//    목표를 이루면 그 목표에 묶인 단계가 사건 화면(전체 삽화 + 짧은 글 + 선택지)에서 펼쳐진다(js/game/app.js).
//  - 맵은 화면 전체(.mapwrap)에 그리고, 게이지·미션·아이콘은 네 구석에 얹는다(js/core/hud.js).
//    왼쪽 아래 가상 조이스틱, 오른쪽 아래 행동 단추(말 걸기·살피기).
//  - 맵의 바닥 무늬·빛은 맵 정의의 theme으로 고른다(js/game/tiles.js 맨 위 설명):
//    'village'(남원 마을) · 'port'(낭고야 포구) · 'harbor_night'(안남 밤 항구) · 'garden'(항주 정원) · 'island'(섬)
//    빛: night:true면 밤(등불 소품 pr_lantern·pr_lantern_stone·pr_signal_lit은 저절로 따뜻한 빛을 낸다),
//        lights:[[칸x, 칸y, 반지름px]]로 빛을 더 놓을 수 있다. 낮에는 소품·사람 그림자와 구름 그늘이 진다.
//  - 테마마다 견본 맵이 있다(demo_village·demo_port·demo_harbor_night·demo_garden·demo_island): G.world.test.enter('demo_port')
(function () {
  const T = 32;
  const { h, boldNodes } = G.util;
  const W = (G.world = {});
  const S = () => G.save.state;
  const SP = () => window.SPRITES || {};
  const fill = (s) => G.util.T(s);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // ───────── 맵 격자 만들기(거점 파일에서 쓴다) ─────────
  //  G.world.mk(가로, 세로, 바탕 글자, [ ['rect',x,y,w,h,'글자'], ['frame',x,y,w,h,'글자'], ['border','글자'], ['dots','글자',[[x,y],…]] ])
  W.mk = function (w, hgt, base, ops) {
    const g = Array.from({ length: hgt }, () => Array(w).fill(base));
    const set = (x, y, c) => { if (y >= 0 && y < hgt && x >= 0 && x < w) g[y][x] = c; };
    for (const op of ops || []) {
      const [k] = op;
      if (k === 'rect') { const [, x, y, rw, rh, c] = op; for (let j = y; j < y + rh; j++) for (let i = x; i < x + rw; i++) set(i, j, c); }
      else if (k === 'frame') { const [, x, y, rw, rh, c] = op; for (let i = x; i < x + rw; i++) { set(i, y, c); set(i, y + rh - 1, c); } for (let j = y; j < y + rh; j++) { set(x, j, c); set(x + rw - 1, j, c); } }
      else if (k === 'border') { const [, c] = op; for (let i = 0; i < w; i++) { set(i, 0, c); set(i, hgt - 1, c); } for (let j = 0; j < hgt; j++) { set(0, j, c); set(w - 1, j, c); } }
      else if (k === 'dots') { const [, c, pts] = op; for (const [x, y] of pts) set(x, y, c); }
    }
    return g.map((r) => r.join(''));
  };

  // ───────── 맵 찾기 ─────────
  //  거점 파일의 maps에 적은 맵을 모두 한 곳에서 찾는다(바다 거점의 섬 맵 'island'처럼).
  //  엔진에 든 시험 맵(test)도 있다.
  W.maps = {
    test: {
      name: '시험 마당', spawn: [6, 6, 'down'],
      grid: W.mk(14, 11, '.', [['rect', 2, 7, 10, 1, ':'], ['rect', 6, 2, 1, 6, ':'], ['rect', 10, 2, 3, 3, '~'], ['dots', ',', [[2, 2], [3, 3], [11, 8]]], ['border', 'h']]),
      props: [['pr_test_box', 3, 4, { w: 1, h: 1 }]],
      spots: { sign: { x: 2, y: 8, w: 1, h: 1, name: '푯말', act: '살피기', look: ['시험 맵이에요. 방향키나 조이스틱으로 걸어 보세요.'] } },
      npcs: { tester: { sp: 'sp_merchant_ming', name: '시험 상인', x: 9, y: 6, dir: 'left', talk: [['어서 오시오. 시험 삼아 말을 걸어 보시오.']] }, nosprite: { sp: 'sp__none', name: '그림 없는 사람', x: 12, y: 8, dir: 'down' } },
    },
  };
  // ───────── 테마 견본 맵(화면 사진·맵 만들 때 참고용) ─────────
  //  바다·섬처럼 둥근 물가가 필요하면 G.world.blobGrid(가로, 세로, { 씨앗, 가운데:[x,y], 반지름:[rx,ry] })를 쓴다
  W.blobGrid = function (w, hgt, o = {}) {
    const R = G.tiles.rnd, seed = o.seed || 3;
    const [cx, cy] = o.center || [w / 2, hgt / 2], [rx, ry] = o.radius || [w * 0.36, hgt * 0.36];
    const rows = [];
    for (let y = 0; y < hgt; y++) {
      let row = '';
      for (let x = 0; x < w; x++) {
        const a = Math.atan2(y - cy, x - cx);
        const wob = 1 + 0.16 * Math.sin(a * 3 + seed) + 0.09 * Math.sin(a * 7 + seed * 2) + (R(x, y, seed) - 0.5) * 0.08;
        const d = Math.hypot((x - cx) / rx, (y - cy) / ry) / wob;
        row += d < 0.5 ? (d < 0.32 ? 'm' : '.') : d < 0.9 ? 's' : d < 1.25 ? '~' : 'w';
      }
      rows.push(row);
    }
    return rows;
  };
  const setCells = (grid, list) => { const g2 = grid.map((r) => r.split('')); for (const [x, y, c] of list) if (g2[y] && g2[y][x] != null) g2[y][x] = c; return g2.map((r) => r.join('')); };
  Object.assign(W.maps, {
    demo_village: {
      name: '마을 앞길', theme: 'village', avatar: 'sp_okyoung_joseon', spawn: [10, 10, 'right'],
      grid: W.mk(28, 16, '.', [
        ['rect', 1, 9, 26, 2, ':'], ['rect', 12, 1, 2, 8, ':'],
        ['frame', 1, 1, 10, 8, 'f'], ['rect', 2, 2, 8, 6, 'k'], ['rect', 5, 8, 2, 1, 'k'],
        ['frame', 15, 1, 12, 8, '#'], ['rect', 16, 2, 10, 6, 'k'], ['rect', 19, 8, 3, 1, ':'],
        ['rect', 1, 12, 9, 3, 'o'], ['rect', 12, 12, 6, 3, 'p'], ['rect', 20, 12, 7, 3, 'o'],
        ['dots', ',', [[11, 11], [18, 11], [19, 11], [10, 3], [14, 5], [14, 6]]],
        ['border', 'h']]),
      props: [['pr_thatch', 3, 6], ['pr_tilehouse', 18, 6], ['pr_willow', 15, 11], ['pr_pine', 8, 11], ['pr_sacks', 8, 7], ['pr_bush', 13, 7], ['pr_bush', 24, 11]],
      npcs: {
        mom: { sp: 'sp_simssi', name: '심씨', x: 6, y: 7, dir: 'down', talk: [['오늘따라 바람이 차구나.']] },
        cheok: { sp: 'sp_choecheok', name: '최척', x: 21, y: 10, dir: 'left', talk: [['남원 고을에 가을이 왔소.']] },
        kid: { sp: 'sp_mongseok', name: '몽석', x: 15, y: 9, dir: 'down', wander: 1 },
      },
    },
    demo_port: {
      name: '낭고야 포구', theme: 'port', avatar: 'sp_okyoung_m', spawn: [11, 10, 'right'],
      grid: W.mk(28, 16, 'w', [
        ['rect', 0, 0, 17, 16, '.'], ['rect', 0, 8, 13, 3, '='], ['rect', 13, 0, 3, 16, 'n'], ['rect', 16, 0, 3, 16, '~'],
        ['rect', 16, 8, 9, 2, '_'], ['rect', 0, 0, 13, 2, 'm'], ['rect', 0, 11, 13, 5, 'e'], ['rect', 2, 12, 9, 3, ':']]),
      props: [['pr_jphouse', 1, 7], ['pr_jphouse', 7, 7], ['pr_jpship', 18, 6], ['pr_fishboat', 20, 14], ['pr_crates', 13, 11], ['pr_barrels', 11, 12],
        ['pr_nets', 3, 13, { flat: true }], ['pr_netrack', 6, 14], ['pr_anchor', 14, 13], ['pr_post', 15, 7], ['pr_post', 15, 10], ['pr_pine', 11, 1], ['pr_sacks', 1, 11]],
      npcs: {
        merchant: { sp: 'sp_merchant_jp', name: '왜 상인', x: 9, y: 10, dir: 'right', talk: [['배가 이제 떠나오.']] },
        sailor: { sp: 'sp_sailor_west', name: '뱃사람', x: 21, y: 9, dir: 'left', wander: 1 },
        captive: { sp: 'sp_captive', name: '포로', x: 5, y: 13, dir: 'up' },
      },
    },
    demo_harbor_night: {
      name: '안남 항구', theme: 'harbor_night', avatar: 'sp_okyoung_m', spawn: [12, 9, 'right'],
      grid: W.mk(28, 16, 'w', [
        ['rect', 0, 0, 15, 16, '.'], ['rect', 0, 7, 13, 3, '='], ['rect', 13, 0, 2, 16, 'n'], ['rect', 15, 0, 2, 16, '~'],
        ['rect', 15, 9, 10, 2, '_'], ['rect', 0, 11, 13, 5, 's'], ['rect', 0, 0, 13, 2, 'm']]),
      props: [['pr_minghouse', 1, 6], ['pr_minghouse', 7, 6], ['pr_junk', 17, 7], ['pr_fishboat', 18, 15],
        ['pr_lantern', 6, 7], ['pr_lantern', 12, 7], ['pr_lantern', 12, 11], ['pr_lantern', 19, 9], ['pr_lantern', 24, 9],
        ['pr_palm', 1, 14], ['pr_fanpalm', 5, 13], ['pr_palm', 9, 15], ['pr_crates', 13, 12], ['pr_sacks', 11, 12], ['pr_barrels', 0, 10]],
      npcs: {
        cheok: { sp: 'sp_choecheok', name: '퉁소 부는 사람', x: 22, y: 10, dir: 'left', talk: [['(퉁소 소리가 물 위로 번진다)']] },
        ming: { sp: 'sp_merchant_ming', name: '명나라 상인', x: 8, y: 9, dir: 'right', talk: [['이 배는 항주로 가오.']] },
        sailor: { sp: 'sp_sailor_sea', name: '뱃사람', x: 4, y: 9, dir: 'down', wander: 1 },
      },
    },
    demo_garden: {
      name: '항주 정원', theme: 'garden', avatar: 'sp_okyoung_ming', spawn: [9, 9, 'down'],
      grid: W.mk(28, 16, '.', [
        ['rect', 2, 5, 14, 3, 'q'], ['rect', 8, 8, 2, 6, '='], ['rect', 10, 10, 6, 2, '='],
        ['rect', 16, 8, 10, 6, '~'], ['rect', 16, 10, 10, 1, 'b'], ['rect', 25, 3, 2, 7, '='],
        ['rect', 2, 10, 5, 4, ','], ['rect', 11, 13, 4, 1, ','], ['rect', 18, 2, 6, 4, 'm'], ['rect', 3, 1, 3, 3, 'm'],
        ['border', 'h']]),
      props: [['pr_minghouse', 6, 4], ['pr_willow', 14, 8], ['pr_bamboo', 21, 4], ['pr_bamboo', 23, 5], ['pr_bamboo', 1, 4],
        ['pr_lantern_stone', 15, 12], ['pr_lantern_stone', 25, 13], ['pr_lantern_stone', 4, 7], ['pr_bush', 12, 7], ['pr_bush', 2, 14], ['pr_pine', 20, 15]],
      npcs: {
        son: { sp: 'sp_mongseon', name: '몽선', x: 12, y: 11, dir: 'left', talk: [['어머니, 연못에 연꽃이 피었어요.']] },
        ming: { sp: 'sp_merchant_ming', name: '진위경', x: 21, y: 11, dir: 'left', wander: 1 },
      },
    },
    demo_island: {
      name: '이름 없는 섬', theme: 'island', avatar: 'sp_okyoung_m', spawn: [12, 9, 'down'],
      grid: setCells(W.blobGrid(30, 18, { seed: 5, center: [14, 8.5], radius: [12, 7.5] }), [[11, 4, 'c'], [12, 4, 'c'], [13, 4, 'c'], [12, 3, 'c'], [17, 4, 'c'], [18, 5, 'c']]),
      props: [['pr_pine', 9, 6], ['pr_pine', 18, 7], ['pr_boulder', 20, 10], ['pr_rocks', 7, 11], ['pr_reeds', 6, 8], ['pr_reeds', 21, 6],
        ['pr_boat', 15, 15], ['pr_cave', 13, 5], ['pr_bush', 16, 9], ['pr_signal', 11, 10]],
      npcs: {
        sailor: { sp: 'sp_joseon_sailor', name: '조선 뱃사람', x: 17, y: 13, dir: 'left', talk: [['바람이 그치면 떠나야 하오.']] },
        sea: { sp: 'sp_sailor_sea', name: '뱃사람', x: 9, y: 12, dir: 'right', wander: 1 },
      },
    },
  });
  W.mapDef = function (id) {
    if (W.maps[id]) return W.maps[id];
    const P = window.PLACES || {};
    for (const k in P) { const p = P[k]; if (p && p.maps && p.maps[id]) return p.maps[id]; }
    return null;
  };

  // ───────── 그림 불러오기 ─────────
  const imgs = {};
  function img(key) {
    let im = imgs[key];
    if (!im) { const m = SP()[key]; if (!m || !m.img) return null; im = imgs[key] = new Image(); im.src = m.img; }
    return im.complete && im.naturalWidth ? im : null;
  }
  W.preload = function (keys) {
    return Promise.all(keys.map((k) => new Promise((res) => {
      const m = SP()[k]; if (!m || !m.img) return res();
      let im = imgs[k];
      if (im && im.complete && im.naturalWidth) return res();
      if (!im) im = imgs[k] = new Image();
      const done = () => res();
      im.addEventListener('load', done, { once: true }); im.addEventListener('error', done, { once: true });
      if (!im.src) im.src = m.img;
      setTimeout(done, 4000);
    })));
  };
  // 대화창 얼굴: 도트 인물의 윗몸을 크게
  W.spriteFace = function (sp) {
    // 머리와 어깨만 26×26으로 잘라 정수배로 키운다(초상 그림이 생기기 전의 대신 얼굴)
    const c = document.createElement('canvas'); c.width = 26; c.height = 26; c.className = 'pxface';
    const draw = () => {
      const m = SP()[sp], im = img(sp); if (!m || !im || !m.anims) return false;
      const g2 = c.getContext('2d'); g2.imageSmoothingEnabled = false;
      const a = m.anims.walk_down || Object.values(m.anims)[0]; const i = a.start;
      const sx = (i % m.cols) * m.fw, sy = Math.floor(i / m.cols) * m.fh;
      g2.drawImage(im, sx + m.px - 13, sy + m.py - 50, 26, 26, 0, 0, 26, 26);
      return true;
    };
    if (!draw()) W.preload([sp]).then(draw);
    return c;
  };

  // ───────── 상태 ─────────
  let M = null;              // 지금 맵
  let P = null;              // 옥영
  let cv, g0, buf, g, dark, gd, root, padEl, joyEl, fadeEl, hintEl, talkBtn, bannerEl, labelsOn = true;
  let scale = 2, vw = 320, vh = 240, dpr = 1;
  const cam = { x: 0, y: 0 };
  let time = 0;
  const parts = [];
  W.busy = 0; W.closedAt = 0;
  let goal = null;           // { text, targets:[id], zones:[id], hit(id) }
  let running = false, last = 0, acc = 0, ro = null;

  // 세상이 멈추는 때: 대화창·사건 화면·판이 떠 있거나 세로 화면일 때
  W.paused = () => W.busy > 0 || !!document.querySelector('.overlay, .sheet-back, .event.on') || !!(G.app && G.app.portrait);

  // ───────── 입력 ─────────
  const keys = new Set();
  const inp = { jx: 0, jy: 0, talk: false };
  const KEYMAP = { ArrowUp: 'u', KeyW: 'u', ArrowDown: 'd', KeyS: 'd', ArrowLeft: 'l', KeyA: 'l', ArrowRight: 'r', KeyD: 'r' };
  function typing(e) { const t = e.target; return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable); }
  function onKeyDown(e) {
    if (!running || typing(e) || !cv || !cv.isConnected) return;
    if (W.paused()) { keys.clear(); return; }
    const k = KEYMAP[e.code];
    if (k) { keys.add(k); e.preventDefault(); return; }
    if (e.repeat) return;
    if (e.code === 'KeyE' || e.code === 'Enter' || e.code === 'Space' || e.code === 'KeyZ') {
      if (performance.now() - W.closedAt > 300) inp.talk = true;
      e.preventDefault();
    }
  }
  function onKeyUp(e) { const k = KEYMAP[e.code]; if (k) keys.delete(k); }
  function onBlur() { keys.clear(); inp.jx = inp.jy = 0; }

  // 떠다니는 가상 조이스틱(맵 왼쪽 아래 어디든 누른 자리에서 시작)
  //  쉬고 있을 때는 왼쪽 아래에 옅은 조이스틱이 놓여 있다(터치 기기만). 누르면 그 자리에서 진한 조이스틱이 뜬다.
  function setupJoystick(zone) {
    const base = h('div.joy-base'), knob = h('div.joy-knob');
    joyEl = h('div.joy', base, knob);
    zone.appendChild(h('div.joy-rest', { 'aria-hidden': 'true' }, h('div.joy-base', h('i.n'), h('i.e'), h('i.s'), h('i.w')), h('div.joy-knob')));
    zone.appendChild(joyEl);
    let id = null, ox = 0, oy = 0;
    const R = 44;
    zone.addEventListener('pointerdown', (e) => {
      if (id !== null || W.paused()) return;
      id = e.pointerId; ox = e.clientX; oy = e.clientY;
      try { zone.setPointerCapture(id); } catch (err) { /* 무시 */ }
      joyEl.classList.add('on'); zone.classList.add('active');
      joyEl.style.left = ox + 'px'; joyEl.style.top = oy + 'px';
      knob.style.transform = 'translate(-50%,-50%)';
      G.audio.unlock();
    });
    zone.addEventListener('pointermove', (e) => {
      if (e.pointerId !== id) return;
      let dx = e.clientX - ox, dy = e.clientY - oy;
      const d = Math.hypot(dx, dy);
      if (d > R) { dx = dx / d * R; dy = dy / d * R; }
      knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
      if (Math.min(1, d / R) < 0.18) { inp.jx = inp.jy = 0; return; }
      inp.jx = dx / R; inp.jy = dy / R;
    });
    const end = (e) => { if (e.pointerId !== id) return; id = null; inp.jx = inp.jy = 0; joyEl.classList.remove('on'); zone.classList.remove('active'); };
    zone.addEventListener('pointerup', end); zone.addEventListener('pointercancel', end);
  }

  const ACT_ICON = {
    talk: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.5h16a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5h-8l-4.5 3.5V16.5H4A1.5 1.5 0 0 1 2.5 15V7A1.5 1.5 0 0 1 4 5.5z"/><path d="M7.5 11h.01M12 11h.01M16.5 11h.01" stroke-width="2.6"/></svg>',
    look: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5.5 5.5"/><path d="M8 8.5a3 3 0 0 1 2.5-1" /></svg>',
  };
  // 맵에 들어서면 위쪽 가운데에 잠깐 뜨는 땅 이름: 거점 이름(붓글씨) + 그 아래 맵 이름
  //  plain:true면 붓글씨 대신 명조로(붓글씨 부분 글꼴에 없는 글자일 때)
  W.banner = function (title, sub, plain) {
    if (!bannerEl) return;
    bannerEl.innerHTML = '';
    if (!title && !sub) return;
    G.util.append(bannerEl, [h('strong' + (plain ? '.plain' : ''), title || ''), sub ? h('small', sub) : null]);
    bannerEl.classList.remove('show'); void bannerEl.offsetWidth; bannerEl.classList.add('show');
    clearTimeout(W._bannerT);
    W._bannerT = setTimeout(() => bannerEl && bannerEl.classList.remove('show'), 2800);
  };

  // ───────── 화면 만들기(화면 전체 맵 자리 안에) ─────────
  W.mount = function (container) {
    container.innerHTML = '';
    cv = h('canvas.wcv');
    const zone = h('div.joy-zone');
    // 행동 단추: 늘 오른쪽 아래에 있고, 가까이에 말 걸 사람·살필 자리가 있으면 등불처럼 밝아진다
    talkBtn = h('button.pbtn.talk', { type: 'button', tabindex: -1, 'aria-label': '말 걸기' }, h('span.pic', { html: ACT_ICON.talk }), h('span.pl', '말 걸기'), h('kbd', 'E'));
    talkBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); G.audio.unlock(); inp.talk = true; talkBtn.classList.add('down'); });
    const up = () => talkBtn.classList.remove('down');
    talkBtn.addEventListener('pointerup', up); talkBtn.addEventListener('pointerleave', up); talkBtn.addEventListener('pointercancel', up);
    padEl = h('div.pad', talkBtn);
    hintEl = h('div.keyhint', '이동 ← ↑ → ↓ / WASD · 말 걸기·살피기 E / Enter / Space');
    fadeEl = h('div.wfade');
    bannerEl = h('div.area-banner', { 'aria-live': 'polite' });
    root = h('div.world', cv, zone, padEl, hintEl, bannerEl, fadeEl);
    container.appendChild(root);
    setupJoystick(zone);
    g0 = cv.getContext('2d');
    buf = document.createElement('canvas'); g = buf.getContext('2d');
    dark = document.createElement('canvas'); gd = dark.getContext('2d');
    resize();
    if (ro) ro.disconnect();
    if (window.ResizeObserver) { ro = new ResizeObserver(() => resize()); ro.observe(root); }
    if (!W._listening) {
      W._listening = true;
      window.addEventListener('resize', () => { if (running) resize(); });
      document.addEventListener('keydown', onKeyDown);
      document.addEventListener('keyup', onKeyUp);
      window.addEventListener('blur', onBlur);
    }
    setTimeout(() => hintEl && hintEl.classList.add('fade'), 9000);
    if (!running) { running = true; last = performance.now(); acc = 0; requestAnimationFrame(loop); }
    return root;
  };

  function resize() {
    if (!cv || !root) return;
    dpr = window.devicePixelRatio || 1;
    const cw = root.clientWidth || 320, ch = root.clientHeight || 240;
    const Wd = Math.max(1, Math.round(cw * dpr)), Hd = Math.max(1, Math.round(ch * dpr));
    // 정수 배율: 세로로 12칸 안팎이 보이게
    scale = Math.max(1, Math.round(Math.min(Wd / 400, Hd / 360)));
    if (cv.width === Wd && cv.height === Hd && buf.width === Math.ceil(Wd / scale)) { measureSafe(); return; }
    cv.width = Wd; cv.height = Hd;
    vw = Math.ceil(Wd / scale); vh = Math.ceil(Hd / scale);
    buf.width = vw; buf.height = vh; dark.width = vw; dark.height = vh;
    g.imageSmoothingEnabled = false; g0.imageSmoothingEnabled = false;
    measureSafe();
    snapCam();
  }

  // ───────── 맵 ─────────
  function tileAt(tx, ty) { const r = M.grid[ty]; return r ? r[tx] : undefined; }
  function feet(tx, ty) { return [(tx + 0.5) * T, (ty + 0.78) * T]; }

  function build(id) {
    const def = W.mapDef(id);
    if (!def) throw new Error('맵 없음: ' + id);
    const grid = def.grid;
    const m = {
      id, def, grid, gw: grid[0].length, gh: grid.length,
      ground: G.tiles.render(grid, def.theme), props: [], boxes: [], chars: [], spots: {}, npcs: {},
      theme: def.theme || 'village', fires: [], lights: [],
    };
    m.pal = G.tiles.THEMES[m.theme] || G.tiles.THEMES.village;
    m.night = def.night != null ? !!def.night : !!m.pal.night;
    m.w = m.gw * T; m.h = m.gh * T;
    for (const p of def.props || []) {
      const [key, tx, ty, o = {}] = p;
      const sm = SP()[key];
      // 그림이 아직 없는 소품: o.w·o.h(칸)만 한 나무 상자로 대신 그린다
      const w = sm ? sm.w : Math.round((o.w || 1) * T), hh = sm ? sm.h : Math.round((o.h || 1) * T);
      const x = Math.round(tx * T), y = Math.round((ty + 1) * T - hh);
      const e = { kind: 'prop', key, x, y, w, h: hh, flat: !!o.flat, missing: !sm };
      const f = sm && sm.foot ? sm.foot : [2, Math.round(hh * 0.4), w - 2, hh - 2];
      e.sortY = y + (f[3] > f[1] ? f[3] : hh);
      if (f[2] > f[0] && !o.walk && !o.flat) { e.box = [x + f[0], y + f[1], x + f[2], y + f[3]]; m.boxes.push(e.box); }
      // 빛을 내는 소품: [반지름, 등불 높이(위에서 비율), 불길인가]
      const LL = LIGHTS[key];
      const lr = o.light || (LL ? LL[0] : 0);
      if (lr) m.lights.push({ x: x + w / 2, y: y + hh * (LL ? LL[1] : 0.6), r: lr, fire: !!(LL && LL[2]), foot: y + hh });
      m.props.push(e);
    }
    for (const l of def.lights || []) m.lights.push({ x: (l[0] + 0.5) * T, y: (l[1] + 0.5) * T, r: l[2] || 64, fire: !!l[3], foot: (l[1] + 1) * T });
    for (const sid in def.spots || {}) {
      const s = def.spots[sid];
      m.spots[sid] = Object.assign({ id: sid, w: 1, h: 1 }, s, { rx: s.x * T, ry: s.y * T, rw: (s.w || 1) * T, rh: (s.h || 1) * T });
    }
    return m;
  }

  const LIGHTS = { pr_lantern: [56, 0.32], pr_lantern_stone: [46, 0.42], pr_signal_lit: [100, 0.6, true], pr_bonfire: [90, 0.6, true] };

  function addNpc(id, d) {
    if (!d || (d.when && !G.steps.ok(d.when))) return;
    const old = M.npcs[id];
    if (old) M.chars.splice(M.chars.indexOf(old), 1);
    const [x, y] = freeSpot(...feet(d.x, d.y), 6);
    const who = d.who || null;
    const e = {
      kind: 'npc', id, sp: d.sp || (who && (G.util.person(who) || {}).sp) || null, x, y, hx: x, hy: y, dir: d.dir || 'down', t: 0, moving: false,
      who, name: d.name || (who ? G.util.who(who) : ''), talk: d.talk || null, ti: 0, solid: true, hw: 6,
      wander: d.wander || 0, wt: Math.random() * 3, color: d.color || G.util.colorOf(who || d.sp || id),
    };
    M.npcs[id] = e; M.chars.push(e);
  }
  function removeNpc(id) { const e = M.npcs[id]; if (!e) return; M.chars.splice(M.chars.indexOf(e), 1); delete M.npcs[id]; }

  // 옥영의 모습(스프라이트 id): 목표·거점·기본값 순. 다른 파일이 G.world.avatarOf를 바꿔 정할 수 있다
  W.avatarOf = (place) => {
    const a = place && place.avatar;
    return (typeof a === 'function' ? a(S()) : a) || 'sp_okyoung_m';
  };
  W.avatar = function () { return W.avatarOverride || W.avatarOf(W.place); };
  function refreshAvatar() {
    if (!P) return;
    P.sp = W.avatar();
    P.speed = 88;
    if (G.hud && G.hud.syncFace) G.hud.syncFace(); // 옷차림이 바뀌면 HUD 초상도 그 모습으로
  }

  function placePlayer(sp) {
    const s = sp || M.def.spawn || [Math.floor(M.gw / 2), Math.floor(M.gh / 2), 'down'];
    const [x, y] = freeSpot(...feet(s[0], s[1]), 6);
    P.x = x; P.y = y; P.dir = s[2] || 'down';
    snapCam();
  }

  async function loadMap(id, spawn, cast) {
    const def = W.mapDef(id);
    if (!def) throw new Error('맵 없음: ' + id);
    const keys = new Set([W.avatar()]);
    for (const p of def.props || []) keys.add(p[0]);
    for (const n of Object.values(def.npcs || {})) keys.add(n.sp);
    for (const n of Object.values(cast || {})) if (n) keys.add(n.sp);
    await W.preload([...keys].filter(Boolean));
    M = build(id);
    if (!P) P = { kind: 'player', x: 0, y: 0, dir: 'down', t: 0, moving: false, hw: 6, dust: 0, color: G.util.colorOf('okyoung') };
    refreshAvatar();
    M.chars.push(P);
    const amb = def.npcs || {};
    for (const nid in amb) if (!amb[nid].places || amb[nid].places.includes(W.placeId)) addNpc(nid, amb[nid]);
    for (const nid in cast || {}) addNpc(nid, cast[nid]);
    placePlayer(spawn);
    W.setMusic(def.music);
    if (G.hud) G.hud.where(def.name || '');
    amb.length = 0;
    const pn = G.hud && G.hud.info && G.hud.info.name;
    if (pn) W.banner(pn, def.name && def.name !== pn ? def.name : '');
    else if (def.name) W.banner(def.name, '', true);
  }
  async function changeMap(id, spawn, cast) {
    if (fadeEl) fadeEl.classList.add('on');
    await G.util.wait(260);
    await loadMap(id, spawn, cast);
    if (fadeEl) fadeEl.classList.remove('on');
  }
  W.setMusic = function (name) { if (name) { W.music = name; G.audio.play(name); } };

  // ───────── 충돌 ─────────
  function blocked(x0, y0, x1, y1, self) {
    const tx0 = Math.floor(x0 / T), tx1 = Math.floor((x1 - 0.01) / T), ty0 = Math.floor(y0 / T), ty1 = Math.floor((y1 - 0.01) / T);
    for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
      const c = tileAt(tx, ty);
      if (c === undefined || G.tiles.SOLID.has(c)) return true;
    }
    for (const b of M.boxes) if (x1 > b[0] && x0 < b[2] && y1 > b[1] && y0 < b[3]) return true;
    if (self === P) for (const e of M.chars) if (e.kind === 'npc' && e.solid) { if (x1 > e.x - 7 && x0 < e.x + 7 && y1 > e.y - 6 && y0 < e.y + 1) return true; }
    return false;
  }
  function move(e, dx, dy) {
    const hw = e.hw || 6, hh = 5;
    let mx = false, my = false;
    if (dx) { const nx = e.x + dx; if (!blocked(nx - hw, e.y - hh, nx + hw, e.y, e)) { e.x = nx; mx = true; } }
    if (dy) { const ny = e.y + dy; if (!blocked(e.x - hw, ny - hh, e.x + hw, ny, e)) { e.y = ny; my = true; } }
    // 모서리에 걸리면 살짝 비켜 준다(옥영만)
    if (e === P && dx && !mx && !dy) {
      for (const o of [3, 6, 9]) for (const s of [-1, 1]) {
        if (!blocked(e.x + dx - hw, e.y + s * o - hh, e.x + dx + hw, e.y + s * o, e)) { e.y += s * Math.min(1.5, o); return; }
      }
    }
    if (e === P && dy && !my && !dx) {
      for (const o of [3, 6, 9]) for (const s of [-1, 1]) {
        if (!blocked(e.x + s * o - hw, e.y + dy - hh, e.x + s * o + hw, e.y + dy, e)) { e.x += s * Math.min(1.5, o); return; }
      }
    }
  }
  function faceTo(e, tx, ty) {
    const dx = tx - e.x, dy = ty - e.y;
    e.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
  }
  // 막힌 자리에 서게 되면 가까운 빈자리를 찾는다
  function freeSpot(x, y, hw) {
    const ok = (a, b) => !blocked(a - hw, b - 5, a + hw, b, null);
    if (ok(x, y)) return [x, y];
    for (let r = 4; r <= 96; r += 4) for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2, nx = x + Math.cos(a) * r, ny = y + Math.sin(a) * r;
      if (ok(nx, ny)) return [nx, ny];
    }
    return [x, y];
  }

  // ───────── 효과(발밑 먼지·불티) ─────────
  function puff(x, y, c = 'rgba(214,196,160,.9)') { parts.push({ x: x + (Math.random() * 6 - 3), y, z: 1, vx: (Math.random() - 0.5) * 20, vy: -4, vz: 14, t: 0, life: 0.35, c, s: 2, grav: 0 }); }

  // ───────── 갱신 ─────────
  function update(dt) {
    time += dt;
    safe.t -= dt;
    if (safe.t <= 0) { safe.t = 0.5; measureSafe(); }
    updateFx(dt);
    updateAmbient(dt);
    if (W.paused()) { keys.clear(); inp.jx = inp.jy = 0; idleNpcs(dt); P.moving = false; return; }
    let ix = inp.jx, iy = inp.jy;
    if (keys.has('l')) ix -= 1; if (keys.has('r')) ix += 1; if (keys.has('u')) iy -= 1; if (keys.has('d')) iy += 1;
    const im = Math.hypot(ix, iy);
    if (im > 1) { ix /= im; iy /= im; }
    P.moving = im > 0.05 && !P.frozen;
    if (P.moving) {
      P.dir = Math.abs(ix) > Math.abs(iy) ? (ix < 0 ? 'left' : 'right') : (iy < 0 ? 'up' : 'down');
      move(P, ix * P.speed * dt, iy * P.speed * dt);
      P.t += dt * Math.min(1, im + 0.2);
      P.dust -= dt;
      if (P.dust <= 0) { P.dust = 0.16; puff(P.x, P.y); }
    }
    idleNpcs(dt);
    const near = nearest();
    W.near = near;
    if (inp.talk) { inp.talk = false; if (near) interact(near); }
    // 저절로 밟는 자리(목표 지점)
    if (goal && goal.zones) for (const sid of goal.zones) {
      const s = M.spots[sid]; if (!s) continue;
      if (P.x > s.rx && P.x < s.rx + s.rw && P.y > s.ry && P.y < s.ry + s.rh) goal.hit(sid);
    }
    padState(near);
  }

  function idleNpcs(dt) {
    for (const e of M.chars) {
      if (e.kind !== 'npc') continue;
      if (!e.wander || W.paused()) { e.moving = false; continue; }
      e.wt -= dt;
      if (e.wt <= 0) {
        e.wt = 1.5 + Math.random() * 3;
        const r = e.wander * T;
        e.goal = Math.random() < 0.4 ? null : [e.hx + (Math.random() * 2 - 1) * r, e.hy + (Math.random() * 2 - 1) * r];
      }
      if (e.goal && Math.hypot(P.x - e.x, P.y - e.y) > 40) {
        const dx = e.goal[0] - e.x, dy = e.goal[1] - e.y, d = Math.hypot(dx, dy);
        if (d < 2) { e.goal = null; e.moving = false; continue; }
        const ox = e.x, oy = e.y;
        move(e, dx / d * 30 * dt, dy / d * 30 * dt);
        if (ox === e.x && oy === e.y) { e.goal = null; e.moving = false; continue; }
        faceTo(e, e.goal[0], e.goal[1]); e.moving = true; e.t += dt;
      } else e.moving = false;
    }
  }

  function updateFx(dt) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i]; p.t += dt;
      if (p.t >= p.life) { parts.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.vz -= p.grav * dt;
      if (p.z < 0) { p.z = 0; p.vz *= -0.35; p.vx *= 0.6; p.vy *= 0.6; }
    }
    // 불길: 불덩이 + 튀는 불티 + 연기(남원 함락처럼 불빛으로만 보여 주는 장면)
    for (const f of M.fires) {
      if (Math.random() < dt * 40) parts.push({ x: f[0] + (Math.random() - 0.5) * 40, y: f[1], z: 10 + Math.random() * 20, vx: (Math.random() - 0.5) * 14, vy: 0, vz: 30 + Math.random() * 40, t: 0, life: 0.5 + Math.random() * 0.4, c: ['#ffd24a', '#ff8a2a', '#e04a1a', '#ffe9a0'][Math.floor(Math.random() * 4)], s: 3 + Math.floor(Math.random() * 3), grav: -30, glow: true });
      if (Math.random() < dt * 14) parts.push({ x: f[0] + (Math.random() - 0.5) * 30, y: f[1], z: 30 + Math.random() * 20, vx: (Math.random() - 0.5) * 30, vy: 0, vz: 70 + Math.random() * 60, t: 0, life: 0.8 + Math.random() * 0.6, c: '#ffe9a0', s: 1, grav: 10, glow: true });
      if (Math.random() < dt * 6) parts.push({ x: f[0] + (Math.random() - 0.5) * 30, y: f[1], z: 50 + Math.random() * 20, vx: 8 + Math.random() * 10, vy: 0, vz: 24, t: 0, life: 1.6, c: 'rgba(60,50,50,.55)', s: 5, grav: 0 });
    }
    const tx = P.x - vw / 2, ty = P.y - 20 - vh / 2;
    const k = Math.min(1, dt * 9);
    cam.x += (camClampX(tx) - cam.x) * k; cam.y += (camClampY(ty) - cam.y) * k;
  }
  // HUD 안전 여백(맵 픽셀): 위쪽 HUD(초상·미션·아이콘)와 아래쪽 조작부(조이스틱·행동 단추)가 차지하는 높이.
  //  카메라는 맵 위·아래 끝에서 이만큼 더 물러설 수 있어서, 맵 가장자리의 사람·자리·이름표가 HUD 밑에 숨지 않는다.
  //  (물러선 자리는 맵 가장자리를 거울처럼 비춰 어둡게 채운다) · 목표 표시도 이 안쪽에서만 그리고, 밖이면 가장자리 화살표.
  const safe = { top: 0, bottom: 0, t: 0 };
  W.safe = safe;
  function measureSafe() {
    if (!root || !root.isConnected) return;
    const rb = root.getBoundingClientRect();
    const k = dpr / scale;
    const shown = (e) => e && e.offsetParent !== null && getComputedStyle(e).visibility !== 'hidden';
    let top = 0, bottom = 0;
    for (const sel of ['.hud-tl', '.mission', '.hud-tr']) {
      const e = document.querySelector('.play ' + sel);
      if (shown(e)) top = Math.max(top, e.getBoundingClientRect().bottom - rb.top);
    }
    for (const e of [padEl && padEl.querySelector('.pbtn'), root.querySelector('.joy-rest')]) {
      if (shown(e)) bottom = Math.max(bottom, rb.bottom - e.getBoundingClientRect().top);
    }
    // 사건 화면·대화창으로 HUD가 잠깐 숨으면 앞의 값을 그대로 둔다(카메라가 들썩이지 않게)
    if (top) safe.top = Math.ceil(top * k) + 4;
    if (bottom) safe.bottom = Math.ceil(bottom * k) + 2;
  }
  const camClampX = (x) => (M.w <= vw ? (M.w - vw) / 2 : clamp(x, 0, M.w - vw));
  const camClampY = (y) => {
    const lo = -safe.top, hi = M.h - vh + safe.bottom;
    return hi <= lo ? (lo + hi) / 2 : clamp(y, lo, hi);
  };
  function snapCam() { if (!P || !M) return; cam.x = camClampX(P.x - vw / 2); cam.y = camClampY(P.y - 20 - vh / 2); }

  // ───────── 말 걸기·살피기 ─────────
  function nearest() {
    let best = null, bd = 1e9;
    const isGoal = (id) => goal && goal.targets && goal.targets.includes(id);
    for (const id in M.npcs) {
      const e = M.npcs[id];
      if (!e.talk && !isGoal(id)) continue;
      const d = Math.hypot(e.x - P.x, (e.y - P.y) * 1.3);
      if (d < 36) { const s = d - (isGoal(id) ? 100 : 0); if (s < bd) { bd = s; best = { type: 'npc', id, e }; } }
    }
    for (const id in M.spots) {
      const s = M.spots[id];
      if (goal && goal.zones && goal.zones.includes(id)) continue;
      if (!s.look && !isGoal(id) && !s.hint) continue;
      const pad = 14;
      if (P.x > s.rx - pad && P.x < s.rx + s.rw + pad && P.y > s.ry - pad && P.y < s.ry + s.rh + pad + 6) {
        const d = Math.hypot(s.rx + s.rw / 2 - P.x, s.ry + s.rh / 2 - P.y) - (isGoal(id) ? 100 : 0) + 20;
        if (d < bd) { bd = d; best = { type: 'spot', id, s }; }
      }
    }
    return best;
  }
  async function interact(n) {
    const id = n.id;
    if (n.type === 'npc') { faceTo(n.e, P.x, P.y); faceTo(P, n.e.x, n.e.y); }
    if (goal && goal.targets && goal.targets.includes(id)) { goal.hit(id); return; }
    if (n.type === 'npc' && n.e.talk) return chat(n.e);
    if (n.type === 'spot') {
      if (n.s.look) return chat({ name: n.s.name || '', lines: [].concat(n.s.look) });
      if (n.s.hint) G.ui.toast(fill(n.s.hint));
    }
  }

  // 대화창: 맵 자리 아래쪽에 뜨는 작은 창(단계 실행기가 그대로 그린다)
  function openDlg(o = {}) {
    const main = h('div.dlg-main.main-inner');
    const tray = h('div.dlg-tray.hide');
    const box = h('div.dlg-box', h('div.dlg-scroll', main), tray);
    const back = h('div.dlg' + (o.small ? '.small' : ''), box);
    root.appendChild(back);
    W.busy++; keys.clear(); inp.jx = inp.jy = 0;
    if (joyEl) joyEl.classList.remove('on');
    root.classList.add('talking');
    return {
      main, dlg: back, mode: 'dlg', place: W.place, placeId: W.placeId,
      tray(content) { G.ui.fillTray(tray, content); },
      trayEl: () => tray,
      refresh() { if (G.hud) G.hud.refresh(); },
      close() { closeDlg(this); },
    };
  }
  function closeDlg(ctx) {
    if (ctx.dlg.isConnected) ctx.dlg.remove();
    W.busy = Math.max(0, W.busy - 1);
    if (!W.busy && root) root.classList.remove('talking');
    W.closedAt = performance.now();
    refreshAvatar();
  }
  W.openDlg = openDlg; W.closeDlg = closeDlg;

  function npcLine(npc, t) {
    if (npc.who) return G.steps.line({ who: npc.who, t, sp: npc.sp }, null);
    return h('div.para.say.show', { style: { '--pc': '#5a4a3a' } },
      h('div.who', npc.sp && SP()[npc.sp] ? W.spriteFace(npc.sp) : h('span.face-blank', { style: { background: npc.color || '#8b7a64' } }, (npc.name || '').slice(0, 1))),
      h('div.bubble', h('span.nm', npc.name), boldNodes(fill(t))));
  }
  // 늘 하는 말: talk:[ [말, 말…], [말…] ] — 말을 걸 때마다 다음 묶음. 말 하나는 문자열 또는 { when, t } 또는 { card } 등
  async function chat(npc) {
    let lines;
    if (npc.lines) lines = npc.lines;
    else {
      const all = npc.talk;
      const pick = all[npc.ti % all.length]; npc.ti++; lines = [].concat(pick);
    }
    lines = lines.filter((l) => typeof l === 'string' || G.steps.ok(l.when));
    const ctx = openDlg({ small: true });
    const box = h('div.says'); ctx.main.appendChild(box);
    G.audio.page();
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      let el;
      if (typeof l === 'string') el = npc.sp || npc.who ? npcLine(npc, l) : h('div.para.narr.show', boldNodes(fill(l)));
      else if (l.t != null && !l.who && (npc.sp || npc.who)) el = npcLine(npc, l.t);
      else el = G.steps.line(l, ctx);
      if (!el) continue;
      box.appendChild(el);
      el.scrollIntoView({ block: 'nearest' });
      await G.steps.nextButton(ctx, i === lines.length - 1 ? '닫기' : '▶');
    }
    closeDlg(ctx);
  }
  W.chat = chat;
  // 맵 위 작은 대화창에 줄 몇 개를 보여 준다(목표의 say)
  async function sayLines(lines, ctx0) {
    const ctx = ctx0 || openDlg({ small: true });
    await G.steps.lines(lines, ctx);
    if (!ctx0) closeDlg(ctx);
  }
  W.sayLines = sayLines;

  // ───────── 그리기 ─────────
  // 스프라이트가 아직 없는 사람: 단색 사람 모양(머리·몸·그림자)으로 대신 그린다
  function drawFallback(e, x, y) {
    const c = e.color || '#5a4a3a';
    const bob = e.moving ? (Math.floor(e.t * 8) % 2) : 0;
    g.fillStyle = c;
    g.beginPath(); g.moveTo(x - 8, y - 2); g.lineTo(x + 8, y - 2); g.lineTo(x + 5, y - 22 - bob); g.lineTo(x - 5, y - 22 - bob); g.closePath(); g.fill();
    g.fillStyle = '#e9d3b0';
    g.beginPath(); g.arc(x, y - 28 - bob, 6, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#2a2119';
    g.fillRect(x - 6, y - 35 - bob, 12, 4); // 머리카락·관
    // 바라보는 쪽 표시(눈)
    const ex = e.dir === 'left' ? -3 : e.dir === 'right' ? 3 : 0;
    if (e.dir !== 'up') { g.fillRect(x - 2 + ex, y - 29 - bob, 1, 2); g.fillRect(x + 2 + ex, y - 29 - bob, 1, 2); }
  }
  function drawChar(e, cx, cy) {
    const m = e.sp ? SP()[e.sp] : null, im = m ? img(e.sp) : null;
    const x = Math.round(e.x - cx), y = Math.round(e.y - cy);
    if (x < -70 || x > vw + 70 || y < -10 || y > vh + 80) return;
    g.fillStyle = 'rgba(26,18,40,.18)';
    g.beginPath(); g.ellipse(x + 1, y - 1, 11, 4, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(26,18,40,.26)';
    g.beginPath(); g.ellipse(x, y - 1, 7, 2.5, 0, 0, Math.PI * 2); g.fill();
    if (!m || !im || !m.anims) { drawFallback(e, x, y); return; }
    let dir = e.dir, flip = 1;
    if (dir === 'right' && !m.anims.walk_right) { dir = 'left'; flip = -1; }
    const a = m.anims['walk_' + dir] || m.anims.walk_down || Object.values(m.anims)[0];
    const f = e.moving ? Math.floor(e.t * (a.fps || 8)) % a.n : 0;
    const i = a.start + f, sx = (i % m.cols) * m.fw, sy = Math.floor(i / m.cols) * m.fh;
    g.save();
    g.translate(x, y);
    g.scale(flip, 1);
    g.drawImage(im, sx, sy, m.fw, m.fh, -m.px, -m.py, m.fw, m.fh);
    g.restore();
  }
  function drawProp(p, cx, cy) {
    const x = Math.round(p.x - cx), y = Math.round(p.y - cy);
    if (x > vw || y > vh || x + p.w < 0 || y + p.h < 0) return;
    if (p.missing) {
      // 그림이 아직 없는 소품: 나무 상자
      g.fillStyle = '#8a5d33'; g.fillRect(x + 2, y + 2, p.w - 4, p.h - 4);
      g.fillStyle = '#6e4726'; g.fillRect(x + 2, y + p.h / 2 - 1, p.w - 4, 2); g.fillRect(x + p.w / 2 - 1, y + 2, 2, p.h - 4);
      g.strokeStyle = '#2a2119'; g.lineWidth = 1; g.strokeRect(x + 2.5, y + 2.5, p.w - 5, p.h - 5);
      return;
    }
    const im = img(p.key); if (!im) return;
    g.drawImage(im, x, y);
  }
  function marker(x, y, kind) {
    const b = Math.round(Math.sin(time * 5) * 2);
    y = Math.round(y + b); x = Math.round(x);
    if (kind === 'goal') {
      g.fillStyle = '#1b1612'; g.fillRect(x - 5, y - 13, 11, 13);
      g.fillStyle = '#f2c94c'; g.fillRect(x - 4, y - 12, 9, 11);
      g.fillStyle = '#1b1612'; g.fillRect(x - 1, y - 11, 3, 6); g.fillRect(x - 1, y - 4, 3, 2);
      g.fillStyle = '#1b1612'; g.fillRect(x - 1, y, 3, 2);
    } else {
      g.fillStyle = '#1b1612'; g.fillRect(x - 6, y - 9, 13, 9);
      g.fillStyle = '#f7efdc'; g.fillRect(x - 5, y - 8, 11, 7);
      g.fillStyle = '#5a4a3a'; g.fillRect(x - 3, y - 5, 1, 1); g.fillRect(x, y - 5, 1, 1); g.fillRect(x + 3, y - 5, 1, 1);
      g.fillStyle = '#1b1612'; g.fillRect(x - 1, y, 3, 2);
    }
  }
  function headY(e) { const m = e.sp ? SP()[e.sp] : null; return e.y - (m ? m.py - 6 : 42) + 4; }
  // 이름표 높이(맵 픽셀). 머리 위 표시·이름표가 위쪽 HUD에 닿으면 발밑으로 내려 그린다
  const labelH = () => (24.5 * dpr) / scale;
  const flipBelow = (headWy, cy, withLabel) => headWy - cy - 16 - (withLabel ? labelH() : 0) <= safe.top;
  function targetPos(id) {
    if (M.npcs[id]) { const e = M.npcs[id]; return [e.x, headY(e), e.name, e.y]; }
    const s = M.spots[id]; if (s) return [s.rx + s.rw / 2, s.ry + s.rh / 2 - (s.mh || 20), s.name || '', s.ry + s.rh];
    return null;
  }

  // ───────── 그림자·빛·떠다니는 것 ─────────
  // 소품 그림자: 그림의 실루엣을 납작하게 눕혀 오른쪽 아래로 드리운다(낮에만). 한 번 만든 실루엣은 다시 쓴다
  const sils = {};
  function silhouette(key) {
    if (sils[key]) return sils[key];
    const im = img(key); if (!im) return null;
    const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight;
    const x = c.getContext('2d'); x.drawImage(im, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#1a1430'; x.fillRect(0, 0, c.width, c.height);
    return (sils[key] = c);
  }
  function propShadow(p, cx, cy) {
    const x = Math.round(p.x - cx), base = Math.round(p.sortY - cy);
    if (x > vw + 120 || base < -20 || x + p.w < -160 || base - p.h > vh + 60) return;
    // 발밑 접지 그림자
    const fw = p.box ? (p.box[2] - p.box[0]) : p.w * 0.6;
    g.fillStyle = 'rgba(26,20,40,.22)';
    g.beginPath(); g.ellipse(x + p.w / 2, base - 1, Math.max(6, fw * 0.55), Math.max(3, Math.min(8, fw * 0.12)), 0, 0, Math.PI * 2); g.fill();
    if (M.night || p.missing || p.noShadow) return;
    const s = silhouette(p.key); if (!s) return;
    const hb = base - (p.y - cy);
    g.save();
    g.globalAlpha = 0.24;
    g.translate(x, base);
    g.transform(1, 0, -0.42, -0.3, 0, 0);
    g.drawImage(s, 0, -hb);
    g.restore();
  }
  // 떠다니는 것: motes(햇빛 먼지) · petals(꽃잎) · fireflies(반딧불) · gulls(갈매기와 그 그림자)
  const amb = [];
  function spawnAmb(kind, anywhere) {
    const r = Math.random;
    const x = cam.x + r() * vw, y = anywhere ? cam.y + r() * vh : cam.y - 8;
    if (kind === 'gulls') return { kind, x: cam.x - 30, y: cam.y + 40 + r() * (vh - 80), z: 70 + r() * 40, vx: 28 + r() * 14, vy: (r() - 0.5) * 6, t: r() * 5, life: 99 };
    return { kind, x, y, z: 0, vx: (r() - 0.5) * 8, vy: kind === 'petals' ? 10 + r() * 8 : (r() - 0.5) * 5, t: r() * 6, life: 5 + r() * 6, ph: r() * 6 };
  }
  function updateAmbient(dt) {
    const kind = M.pal && M.pal.ambient;
    if (!kind) return;
    if (kind === 'gulls') {
      if (amb.length < 3 && Math.random() < dt * 0.25) { const b = spawnAmb('gulls'); amb.push(b); if (Math.random() < 0.6) amb.push(Object.assign({}, b, { x: b.x - 18, y: b.y + 10, t: b.t + 0.4 })); }
    } else {
      const want = kind === 'fireflies' ? 18 : kind === 'petals' ? 16 : 12;
      while (amb.length < want) amb.push(spawnAmb(kind, true));
    }
    for (let i = amb.length - 1; i >= 0; i--) {
      const p = amb[i]; p.t += dt;
      if (p.kind === 'petals') { p.x += (p.vx + Math.sin(p.t * 1.6 + p.ph) * 10) * dt; p.y += p.vy * dt; }
      else if (p.kind === 'gulls') { p.x += p.vx * dt; p.y += p.vy * dt; }
      else { p.x += (p.vx + Math.sin(p.t * 0.9 + p.ph) * 4) * dt; p.y += (p.vy + Math.cos(p.t * 0.7 + p.ph) * 3) * dt; }
      const out = p.x < cam.x - 60 || p.x > cam.x + vw + 60 || p.y < cam.y - 60 || p.y > cam.y + vh + 30;
      if ((p.kind !== 'gulls' && p.t > p.life) || out) { amb.splice(i, 1); if (p.kind !== 'gulls') amb.push(spawnAmb(p.kind, p.kind !== 'petals')); }
    }
  }
  function drawAmbient(cx, cy, glowPass) {
    for (const p of amb) {
      const x = Math.round(p.x - cx), y = Math.round(p.y - cy);
      const fade = p.kind === 'gulls' ? 1 : Math.max(0, Math.min(1, p.t / 1.2, (p.life - p.t) / 1.2));
      if (p.kind === 'fireflies') {
        if (!glowPass) continue;
        const a = fade * (0.55 + 0.45 * Math.sin(p.t * 3 + p.ph));
        g.globalCompositeOperation = 'lighter';
        const gr = g.createRadialGradient(x, y, 0, x, y, 7); gr.addColorStop(0, `rgba(255,214,120,${0.55 * a})`); gr.addColorStop(1, 'rgba(255,180,80,0)');
        g.fillStyle = gr; g.fillRect(x - 7, y - 7, 14, 14);
        g.globalCompositeOperation = 'source-over';
        g.fillStyle = `rgba(255,240,190,${a})`; g.fillRect(x, y, 1, 1);
        continue;
      }
      if (glowPass) continue;
      if (p.kind === 'motes') { g.fillStyle = `rgba(255,244,210,${0.65 * fade * (0.5 + 0.5 * Math.sin(p.t * 2 + p.ph))})`; g.fillRect(x, y, 1, 1); }
      else if (p.kind === 'petals') { g.fillStyle = `rgba(246,178,198,${fade})`; if (Math.sin(p.t * 5 + p.ph) > 0) g.fillRect(x, y, 2, 1); else g.fillRect(x, y, 1, 2); g.fillStyle = `rgba(255,224,232,${fade})`; g.fillRect(x, y, 1, 1); }
      else if (p.kind === 'gulls') {
        const flap = Math.floor(p.t * 6) % 2;
        // 땅에 진 그림자
        g.fillStyle = 'rgba(20,20,40,.16)'; g.fillRect(x - 2, y, 5, 1);
        const by = y - Math.round(p.z);
        g.fillStyle = '#f6f4ee';
        if (flap) { g.fillRect(x - 3, by - 1, 2, 1); g.fillRect(x + 2, by - 1, 2, 1); g.fillRect(x - 1, by, 3, 1); }
        else { g.fillRect(x - 3, by + 1, 2, 1); g.fillRect(x - 1, by, 3, 1); g.fillRect(x + 2, by + 1, 2, 1); }
        g.fillStyle = '#3a3a44'; g.fillRect(x - 4, by + (flap ? -1 : 1), 1, 1); g.fillRect(x + 4, by + (flap ? -1 : 1), 1, 1);
      }
    }
  }
  // 구름 그늘(낮): 땅 위를 천천히 지나간다
  function drawClouds(cx, cy) {
    const L = M.pal.light || {};
    if (M.night || !L.cloud) return;
    for (let i = 0; i < 3; i++) {
      const span = M.w + 700;
      const wx = ((i * 0.37 * span + time * (7 + i * 2)) % span) - 350;
      const wy = (0.2 + 0.3 * i) * M.h + Math.sin(time * 0.05 + i) * 20;
      const x = wx - cx, y = wy - cy;
      if (x < -260 || x > vw + 260 || y < -200 || y > vh + 200) continue;
      g.save(); g.translate(x, y); g.scale(1.8, 1);
      const gr = g.createRadialGradient(0, 0, 10, 0, 0, 110);
      gr.addColorStop(0, 'rgba(30,36,70,.13)'); gr.addColorStop(1, 'rgba(30,36,70,0)');
      g.fillStyle = gr; g.fillRect(-110, -110, 220, 220);
      g.restore();
    }
  }
  // 화면 빛: 낮은 햇빛·그늘·가장자리, 밤은 쪽빛 어둠에 등불 구멍과 따뜻한 빛 번짐
  function drawLight(cx, cy) {
    const L = M.pal.light || {};
    if (M.night) {
      gd.globalCompositeOperation = 'source-over';
      gd.clearRect(0, 0, vw, vh);
      gd.fillStyle = 'rgba(12,16,48,.74)'; gd.fillRect(0, 0, vw, vh);
      gd.globalCompositeOperation = 'destination-out';
      const hole = (x, y, r, k = 1) => { const gr = gd.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(0,0,0,${k})`); gr.addColorStop(0.5, `rgba(0,0,0,${0.62 * k})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); gd.fillStyle = gr; gd.fillRect(x - r, y - r, r * 2, r * 2); };
      hole(P.x - cx, P.y - cy - 16, 66, 0.8);
      M.lights.forEach((l, i) => { l._k = 1 + 0.04 * Math.sin(time * 7 + i * 1.7) + (l.fire ? Math.random() * 0.06 : 0.015 * Math.sin(time * 23 + i)); hole(l.x - cx, l.y - cy, l.r * 1.25 * l._k); });
      for (const f of M.fires) hole(f[0] - cx, f[1] - cy - 10, 120 + Math.random() * 12);
      g.drawImage(dark, 0, 0);
      // 따뜻한 빛 번짐(더하기 섞기)
      g.save();
      g.globalCompositeOperation = 'lighter';
      const glow = (x, y, r, a) => { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(255,176,86,${a})`); gr.addColorStop(0.45, `rgba(255,140,60,${a * 0.4})`); gr.addColorStop(1, 'rgba(255,120,40,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); };
      M.lights.forEach((l) => {
        const x = l.x - cx, y = l.y - cy;
        if (x < -l.r * 2 || x > vw + l.r * 2 || y < -l.r * 2 || y > vh + l.r * 2) return;
        glow(x, y, l.r * (l._k || 1), l.fire ? 0.36 : 0.26);
        // 물에 비친 등불: 아래쪽 물칸에 흔들리는 빛줄기
        for (let k = 1; k <= 4; k++) {
          const ty = Math.floor((l.foot + k * T * 0.8) / T), tx = Math.floor(l.x / T);
          const c = M.grid[ty] && M.grid[ty][tx];
          if (!c || !G.tiles.WATER.has(c)) continue;
          const yy = Math.round(l.foot - cy + k * T * 0.8);
          for (let j = 0; j < 3; j++) {
            const ww = 10 - k * 1.5 + Math.sin(time * 3 + j * 2 + k) * 3;
            g.fillStyle = `rgba(255,190,100,${0.32 - k * 0.05})`;
            g.fillRect(Math.round(x - ww / 2 + Math.sin(time * 2.4 + j + k) * 2), yy + j * 6 - 6, Math.max(2, Math.round(ww)), 1);
          }
        }
      });
      for (const f of M.fires) glow(f[0] - cx, f[1] - cy - 10, 130, 0.3);
      g.restore();
    } else {
      g.save();
      g.globalCompositeOperation = 'soft-light';
      const lg = g.createLinearGradient(0, 0, vw, vh);
      lg.addColorStop(0, L.sun || 'rgba(255,214,150,.2)'); lg.addColorStop(1, L.shade || 'rgba(70,50,110,.2)');
      g.fillStyle = lg; g.fillRect(0, 0, vw, vh);
      g.restore();
    }
    // 가장자리를 살짝 어둡게(그림책 장면처럼 가운데로 눈이 가게)
    const v = L.vignette != null ? L.vignette : 0.3;
    if (v > 0) {
      const r = Math.hypot(vw, vh) / 2;
      const vg = g.createRadialGradient(vw / 2, vh / 2, r * 0.45, vw / 2, vh / 2, r);
      vg.addColorStop(0, 'rgba(20,14,40,0)'); vg.addColorStop(1, `rgba(20,14,40,${v})`);
      g.fillStyle = vg; g.fillRect(0, 0, vw, vh);
    }
  }

  function render() {
    const cx = Math.round(cam.x), cy = Math.round(cam.y);
    G.tiles.use(M.theme);
    g.fillStyle = '#14161c'; g.fillRect(0, 0, vw, vh);
    const gx = Math.max(0, cx), gy = Math.max(0, cy);
    const gw = Math.min(M.w - gx, vw - (gx - cx)), gh = Math.min(M.h - gy, vh - (gy - cy));
    if (gw > 0 && gh > 0) g.drawImage(M.ground.canvas, gx, gy, gw, gh, gx - cx, gy - cy, gw, gh);
    // 맵 위·아래 바깥: 가장자리 땅을 거울처럼 비춰 어둡게(HUD 안전 여백만큼 물러섰을 때)
    if (gw > 0) {
      const edge = (h, srcY, dstY, fromTop) => {
        h = Math.min(h, M.h); if (h <= 0) return;
        g.save(); g.translate(0, dstY + h); g.scale(1, -1);
        g.drawImage(M.ground.canvas, gx, srcY, gw, h, gx - cx, 0, gw, h);
        g.restore();
        const gr = g.createLinearGradient(0, dstY, 0, dstY + h);
        gr.addColorStop(fromTop ? 0 : 1, 'rgba(14,16,34,.82)'); gr.addColorStop(fromTop ? 1 : 0, 'rgba(14,16,34,.45)');
        g.fillStyle = gr; g.fillRect(0, dstY, vw, h);
      };
      if (cy < 0) edge(-cy, 0, 0, true);
      if (cy + vh > M.h) edge(cy + vh - M.h, M.h - Math.min(M.h, cy + vh - M.h), M.h - cy, false);
    }
    // 물결·반짝임·물거품
    G.tiles.animate(g, M.ground, cx, cy, vw, vh, time);
    for (const p of M.props) if (p.flat) drawProp(p, cx, cy);
    for (const p of M.props) if (!p.flat) propShadow(p, cx, cy);
    const list = [];
    for (const p of M.props) if (!p.flat) list.push([p.sortY, p]);
    for (const e of M.chars) list.push([e.y, e]);
    list.sort((a, b) => a[0] - b[0]);
    for (const [, o] of list) (o.kind === 'prop' ? drawProp : drawChar)(o, cx, cy);
    const drawParts = (glow) => {
      for (const p of parts) {
        if (!!p.glow !== glow) continue;
        g.globalAlpha = Math.min(1, (1 - p.t / p.life) * 1.6);
        g.fillStyle = p.c;
        g.fillRect(Math.round(p.x - cx), Math.round(p.y - cy - p.z), p.s, p.s);
      }
      g.globalAlpha = 1;
    };
    drawParts(false);
    drawAmbient(cx, cy, false);
    drawClouds(cx, cy);
    drawLight(cx, cy);
    drawParts(true);
    drawAmbient(cx, cy, true);
    // 목표 표시
    const labels = [];
    if (goal && goal.targets && !W.busy) for (const id of goal.targets) {
      const tp = targetPos(id); if (!tp) continue;
      const [x, y, nm, fy] = tp;
      const inView = x - cx > 8 && x - cx < vw - 8 && fy - cy > safe.top + 4 && y - cy < vh - safe.bottom - 8;
      if (inView) {
        const withLabel = goal.labels !== false, text = goal.labelOf ? goal.labelOf(id) : nm;
        if (!flipBelow(y, cy, withLabel)) { marker(x - cx, y - cy, 'goal'); if (withLabel) labels.push([x - cx, y - cy - 16, text]); }
        else { marker(x - cx, fy - cy + 16, 'goal'); if (withLabel) labels.push([x - cx, fy - cy + 18 + labelH(), text]); }
      } else edgeArrow(x - cx, y - cy);
    }
    if (!W.busy) for (const id in M.npcs) {
      const e = M.npcs[id];
      if (!e.talk || (goal && goal.targets && goal.targets.includes(id))) continue;
      if (Math.hypot(e.x - P.x, e.y - P.y) < 70) marker(e.x - cx, (flipBelow(headY(e), cy, false) ? e.y + 16 : headY(e)) - cy, 'talk');
    }
    g0.drawImage(buf, 0, 0, vw, vh, 0, 0, vw * scale, vh * scale);
    // 이름표(또렷하게 원래 해상도로): 쪽빛 판에 상아색 글, 둘레에 등불빛 실선
    if (labels.length && labelsOn) {
      const fs = Math.round(12.5 * dpr);
      g0.font = `700 ${fs}px ${W.font || (W.font = getComputedStyle(document.documentElement).getPropertyValue('--serif') || 'serif')}`;
      g0.textAlign = 'center'; g0.textBaseline = 'middle';
      for (const [x, y, s] of labels) {
        if (!s) continue;
        const X = x * scale, Y = y * scale;
        const tw = g0.measureText(s).width + 16 * dpr, th = fs + 10 * dpr;
        const bx = X - tw / 2, by = Y - th - 2 * dpr;
        g0.fillStyle = 'rgba(28,36,66,.9)';
        g0.beginPath(); if (g0.roundRect) g0.roundRect(bx, by, tw, th, th / 2); else g0.rect(bx, by, tw, th); g0.fill();
        g0.strokeStyle = 'rgba(255,214,140,.55)'; g0.lineWidth = Math.max(1, dpr); g0.stroke();
        g0.fillStyle = '#f7eedb';
        g0.fillText(s, X, by + th / 2 + 0.5 * dpr);
      }
    }
  }
  function edgeArrow(x, y) {
    const m = 14;
    const ex = clamp(x, m, vw - m), ey = clamp(y, safe.top + m, vh - safe.bottom - m);
    const a = Math.atan2(y - ey, x - ex);
    g.save(); g.translate(Math.round(ex), Math.round(ey)); g.rotate(a);
    const b = Math.sin(time * 6) * 2;
    g.fillStyle = '#1b1612'; g.beginPath(); g.moveTo(9 + b, 0); g.lineTo(-6 + b, -8); g.lineTo(-6 + b, 8); g.closePath(); g.fill();
    g.fillStyle = '#f2c94c'; g.beginPath(); g.moveTo(6 + b, 0); g.lineTo(-4 + b, -5); g.lineTo(-4 + b, 5); g.closePath(); g.fill();
    g.restore();
  }

  function loop(now) {
    if (!running) return;
    if (!cv || !cv.isConnected) { running = false; keys.clear(); return; }
    requestAnimationFrame(loop);
    let dt = (now - last) / 1000; last = now;
    if (!M || !P) return; // 맵을 불러오는 중
    if (dt > 0.25) dt = 0.25;
    acc += dt;
    const step = 1 / 60;
    let n = 0;
    try {
      while (acc >= step && n < 6) { update(step); acc -= step; n++; }
      if (n === 6) acc = 0;
      render();
    } catch (e) {
      if (!W._err) { W._err = true; console.error(e); } // 한 번만 알리고 계속 돈다
    }
  }

  function padState(near) {
    if (!talkBtn) return;
    const lab = near ? (near.type === 'npc' ? '말 걸기' : (near.s.act || '살피기')) : '';
    talkBtn.classList.toggle('on', !!near);
    if (talkBtn._lab !== lab) {
      talkBtn._lab = lab;
      talkBtn.querySelector('.pl').textContent = lab || '말 걸기';
      talkBtn.setAttribute('aria-label', lab || '말 걸기');
      talkBtn.querySelector('.pic').innerHTML = ACT_ICON[near && near.type === 'spot' ? 'look' : 'talk'];
    }
  }

  // ───────── 목표 기다리기 ─────────
  function waitGoal(o) {
    return new Promise((res) => {
      goal = Object.assign({}, o, {
        hit(id) { if (goal !== this) return; goal = null; if (G.hud) G.hud.goal(''); res(id); },
      });
      if (G.hud) G.hud.goal(fill(o.text || ''));
    });
  }
  W.goal = () => goal;
  // 선생님용·시험용: 지금 목표를 이룬 것으로 친다
  W.skipGoal = function () {
    if (!goal || W.busy) return false;
    const t = goal.targets && goal.targets[0];
    if (t) { goal.hit(t); return true; }
    return false;
  };

  // ───────── 거점 진행 ─────────
  //  목표(beat): { id, goal:'화면에 보일 할 일', 할 일 하나, steps:['단계 id'…], 그 밖 }
  //   할 일: talk:'사람 id'(말 걸기) · at:'자리 id'(살피기) · go:'자리 id'(밟기) · pick:{ 자리·사람 id: 선택지 번호 } · auto:true(바로)
  //   그 밖: map·spawn(맵 옮기기) · show:{id:{사람}} · hide:['id'] · night · fire:[[x,y]] · say:[줄…](먼저 할 말) · music · avatar
  //          then:{ show·hide·night·fire }(단계가 끝난 뒤) · when(조건) · inline:true(단계를 맵 위 작은 창에서)
  function castFor(place, mapId) { return (place.cast && place.cast[mapId]) || {}; }
  function applyCast(b) {
    if (b.hide) for (const id of [].concat(b.hide)) removeNpc(id);
    if (b.show) for (const id in b.show) addNpc(id, b.show[id]);
    if (b.fire) M.fires = b.fire.map(([x, y]) => [(x + 0.5) * T, (y + 0.8) * T]);
    if (b.night != null) M.night = b.night;
  }
  async function runBeat(b, place) {
    W.avatarOverride = b.avatar || null;
    if (b.map && b.map !== M.id) await changeMap(b.map, b.spawn, castFor(place, b.map));
    else if (b.spawn && !b.map) placePlayer(b.spawn);
    refreshAvatar();
    applyCast(b);
    if (b.music) W.setMusic(b.music);
    const text = b.goal;
    let preset = null;
    if (b.say) await sayLines(b.say);
    if (b.pick) {
      const id = await waitGoal({ text, targets: Object.keys(b.pick), labelOf: (id) => (M.spots[id] || M.npcs[id] || {}).name });
      if (b.steps && b.steps.length) preset = { [b.steps[0]]: b.pick[id] };
    } else if (b.talk || b.at) {
      await waitGoal({ text, targets: [b.talk || b.at], labels: b.label !== false });
    } else if (b.go) {
      await waitGoal({ text, targets: [b.go], zones: [b.go] });
    }
    if (b.steps && b.steps.length) await G.app.runSteps(place, b.steps, { preset, inline: !!b.inline });
    if (b.then) applyCast(b.then);
  }

  W.play = async function (placeId) {
    const place = (window.PLACES || {})[placeId];
    const st = S();
    const token = G.app._playToken;
    W.placeId = placeId; W.place = place; W.avatarOverride = null;
    goal = null; W.busy = 0;
    parts.length = 0;
    const beats = place.beats || [];
    let start = beats.findIndex((b) => !st.done[G.app.key.beat(placeId, b.id)] && G.steps.ok(b.when));
    if (start < 0) start = beats.length;
    // 이어 하기: 맵은 그 앞 목표들이 옮겨 둔 곳에서
    let mapId = place.map, spawn = place.spawn;
    for (let i = 0; i < start; i++) { const b = beats[i]; if (!G.steps.ok(b.when)) continue; if (b.map && b.map !== mapId) { mapId = b.map; spawn = b.spawn || null; } }
    P = null;
    W.mount(G.app.mapArea());
    await loadMap(mapId, spawn, castFor(place, mapId));
    let here = place.map;
    for (let i = 0; i < start; i++) {
      const b = beats[i]; if (!G.steps.ok(b.when)) continue;
      if (b.map) here = b.map;
      if (here !== mapId) continue;
      applyCast(b);
      if (b.then) applyCast(b.then);
    }
    W.setMusic(place.music || (W.mapDef(mapId) || {}).music);
    if (G.hud) { G.hud.goal(''); G.hud.refresh(); }
    if (G.app._playToken !== token) return false;
    for (let i = start; i < beats.length; i++) {
      const b = beats[i];
      if (!G.steps.ok(b.when)) continue;
      await runBeat(b, place);
      if (G.app._playToken !== token) return false;
      st.done[G.app.key.beat(placeId, b.id)] = true; G.save.write();
    }
    goal = null;
    if (G.hud) G.hud.goal('');
    return true;
  };

  // 시험 맵 들어가기(자동 점검·맵 만들 때 확인용): 목표 없이 걷기만 한다
  //  info를 주면 그 거점 이름·막·미션으로 HUD를 채운다(화면 사진용): { name, actName, mission }
  W.enterTest = async function (mapId = 'test', info) {
    const A = ((window.FLOW || {}).acts || {})[1] || {};
    G.app.explore(info || { name: '시험 맵', actName: '시험', mission: A.mission || '' });
    W.placeId = null; W.place = null; W.avatarOverride = (W.mapDef(mapId) || {}).avatar || null; goal = null; W.busy = 0; P = null;
    W.mount(G.app.mapArea());
    await loadMap(mapId, null, {});
    if (G.hud) { G.hud.goal(''); G.hud.refresh(); }
    return true;
  };

  // ───────── 시험용 손잡이(자동 점검이 목표를 대신 이루거나 상태를 읽는다) ─────────
  W.test = {
    state: () => ({ map: M && M.id, goal: goal && { text: goal.text, targets: goal.targets }, busy: W.busy, paused: W.paused(), x: P && P.x, y: P && P.y, dir: P && P.dir, sp: P && P.sp, scale, vw, vh }),
    complete() {
      if (!goal || W.busy) return false;
      const t = goal.targets && goal.targets[Math.floor(Math.random() * goal.targets.length)];
      if (t) { goal.hit(t); return true; }
      return false;
    },
    targets: () => ((goal && goal.targets) || []).map((id) => {
      const e = M.npcs[id], s = M.spots[id], tp = targetPos(id);
      return { id, kind: e ? 'npc' : 'spot', x: e ? e.x : s ? s.rx + s.rw / 2 : tp && tp[0], y: e ? e.y : s ? s.ry + s.rh / 2 : tp && tp[1] + 40, zone: !!(goal.zones && goal.zones.includes(id)) };
    }),
    blocked: (x0, y0, x1, y1) => blocked(x0, y0, x1, y1, P),
    near: () => (W.near ? { type: W.near.type, id: W.near.id } : null),
    map: () => ({ id: M.id, T, w: M.gw, h: M.gh, grid: M.grid, night: M.night }),
    npcs: () => Object.values(M.npcs).map((e) => ({ id: e.id, name: e.name, x: e.x, y: e.y, talk: !!e.talk, sp: e.sp, spriteMissing: !SP()[e.sp] })),
    teleport(id) { const tp = targetPos(id); if (tp) { P.x = tp[0]; P.y = tp[1] + 30; snapCam(); } },
    labels(on) { labelsOn = on; },
    enter: (mapId, info) => W.enterTest(mapId, info),
    // 화면 사진용: 옥영을 칸 (tx, ty)로 옮기고 카메라를 맞춘다
    // 사람(이름표 포함)의 화면 자리(CSS px, 맵 화면 기준): HUD에 가리는지 점검할 때
    screenOf(id) {
      const e = M.npcs[id]; if (!e || !root) return null;
      const k = scale / dpr, rb = root.getBoundingClientRect();
      // 몸 + 머리 위 표시·이름표(위쪽 HUD에 닿으면 발밑으로 내려 그리는 규칙을 그대로 따른다)
      const hy = headY(e), below = flipBelow(hy, Math.round(cam.y), true);
      const top = below ? hy - 4 : hy - 18 - labelH(), bot = below ? e.y + 18 + labelH() : e.y, x0 = e.x - 20, x1 = e.x + 20;
      return { l: rb.left + (x0 - cam.x) * k, r: rb.left + (x1 - cam.x) * k, t: rb.top + (top - cam.y) * k, b: rb.top + (bot - cam.y) * k };
    },
    safe: () => ({ top: safe.top, bottom: safe.bottom }),
    look(tx, ty, dir) { const [x, y] = freeSpot(...feet(tx, ty), 6); P.x = x; P.y = y; if (dir) P.dir = dir; snapCam(); },
  };
})();
