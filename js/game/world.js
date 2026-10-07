'use strict';
// 탑다운 맵 엔진(「영웅의 길」 엔진에서 싸움·기술·적장을 빼고 가져왔다)
//  - 캔버스에 도트 맵(한 칸 32px)을 그리고, 옥영을 움직여 사람에게 말을 걸고 자리를 살핀다.
//  - 거점(PLACES[id]) 하나 = 맵 몇 장 + 사람(cast) + 목표(beats) + 단계(steps).
//    목표를 이루면 그 목표에 묶인 단계가 사건 화면(전체 삽화 + 짧은 글 + 선택지)에서 펼쳐진다(js/game/app.js).
//  - 맵은 왼쪽 2/3 자리(.mapwrap)에 그린다. 오른쪽 1/3은 게이지 패널(js/core/hud.js).
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
      npcs: { tester: { sp: 'sp_merchant_ming', name: '시험 상인', x: 9, y: 6, dir: 'left', talk: [['어서 오시오. 시험 삼아 말을 걸어 보시오.']] } },
    },
  };
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
    const c = document.createElement('canvas'); c.width = 40; c.height = 40; c.className = 'pxface';
    const draw = () => {
      const m = SP()[sp], im = img(sp); if (!m || !im || !m.anims) return false;
      const g2 = c.getContext('2d'); g2.imageSmoothingEnabled = false;
      const a = m.anims.walk_down || Object.values(m.anims)[0]; const i = a.start;
      const sx = (i % m.cols) * m.fw, sy = Math.floor(i / m.cols) * m.fh;
      g2.drawImage(im, sx + m.px - 20, sy + m.py - 50, 40, 40, 0, 0, 40, 40);
      return true;
    };
    if (!draw()) W.preload([sp]).then(draw);
    return c;
  };

  // ───────── 상태 ─────────
  let M = null;              // 지금 맵
  let P = null;              // 옥영
  let cv, g0, buf, g, dark, gd, root, padEl, joyEl, fadeEl, hintEl, talkBtn, labelsOn = true;
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
  function setupJoystick(zone) {
    const base = h('div.joy-base'), knob = h('div.joy-knob');
    joyEl = h('div.joy', base, knob);
    zone.appendChild(joyEl);
    let id = null, ox = 0, oy = 0;
    const R = 44;
    zone.addEventListener('pointerdown', (e) => {
      if (id !== null || W.paused()) return;
      id = e.pointerId; ox = e.clientX; oy = e.clientY;
      try { zone.setPointerCapture(id); } catch (err) { /* 무시 */ }
      joyEl.classList.add('on');
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
    const end = (e) => { if (e.pointerId !== id) return; id = null; inp.jx = inp.jy = 0; joyEl.classList.remove('on'); };
    zone.addEventListener('pointerup', end); zone.addEventListener('pointercancel', end);
  }

  // ───────── 화면 만들기(왼쪽 맵 자리 안에) ─────────
  W.mount = function (container) {
    container.innerHTML = '';
    cv = h('canvas.wcv');
    const zone = h('div.joy-zone');
    talkBtn = h('button.pbtn.talk', { type: 'button', tabindex: -1 }, h('span.pl', '말 걸기'), h('kbd', 'E'));
    talkBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); G.audio.unlock(); inp.talk = true; talkBtn.classList.add('down'); });
    const up = () => talkBtn.classList.remove('down');
    talkBtn.addEventListener('pointerup', up); talkBtn.addEventListener('pointerleave', up); talkBtn.addEventListener('pointercancel', up);
    padEl = h('div.pad', talkBtn);
    hintEl = h('div.keyhint', '이동 ← ↑ → ↓ / WASD · 말 걸기·살피기 E / Enter / Space');
    fadeEl = h('div.wfade');
    root = h('div.world', cv, zone, padEl, hintEl, fadeEl);
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
    if (cv.width === Wd && cv.height === Hd && buf.width === Math.ceil(Wd / scale)) return;
    cv.width = Wd; cv.height = Hd;
    vw = Math.ceil(Wd / scale); vh = Math.ceil(Hd / scale);
    buf.width = vw; buf.height = vh; dark.width = vw; dark.height = vh;
    g.imageSmoothingEnabled = false; g0.imageSmoothingEnabled = false;
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
      ground: G.tiles.render(grid), props: [], boxes: [], chars: [], spots: {}, npcs: {},
      night: !!def.night, fires: [], lights: [],
    };
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
      const lr = o.light || (key === 'pr_bonfire' ? 84 : key === 'pr_lantern' ? 52 : 0);
      if (lr) m.lights.push({ x: x + w / 2, y: y + hh * 0.6, r: lr, fire: key === 'pr_bonfire' });
      m.props.push(e);
    }
    for (const sid in def.spots || {}) {
      const s = def.spots[sid];
      m.spots[sid] = Object.assign({ id: sid, w: 1, h: 1 }, s, { rx: s.x * T, ry: s.y * T, rw: (s.w || 1) * T, rh: (s.h || 1) * T });
    }
    return m;
  }

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
    updateFx(dt);
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
  const camClampX = (x) => (M.w <= vw ? (M.w - vw) / 2 : clamp(x, 0, M.w - vw));
  const camClampY = (y) => (M.h <= vh ? (M.h - vh) / 2 : clamp(y, 0, M.h - vh));
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
      tray(content) { tray.innerHTML = ''; if (content) tray.appendChild(content); tray.classList.toggle('hide', !content); },
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
    g.fillStyle = 'rgba(20,16,10,.28)';
    g.beginPath(); g.ellipse(x, y - 1, 9, 3, 0, 0, Math.PI * 2); g.fill();
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
  function targetPos(id) {
    if (M.npcs[id]) { const e = M.npcs[id]; return [e.x, headY(e), e.name]; }
    const s = M.spots[id]; if (s) return [s.rx + s.rw / 2, s.ry + s.rh / 2 - (s.mh || 20), s.name || ''];
    return null;
  }

  function render() {
    const cx = Math.round(cam.x), cy = Math.round(cam.y);
    g.fillStyle = '#1b1a17'; g.fillRect(0, 0, vw, vh);
    const gx = Math.max(0, cx), gy = Math.max(0, cy);
    const gw = Math.min(M.w - gx, vw - (gx - cx)), gh = Math.min(M.h - gy, vh - (gy - cy));
    if (gw > 0 && gh > 0) g.drawImage(M.ground.canvas, gx, gy, gw, gh, gx - cx, gy - cy, gw, gh);
    // 물결
    const wf = Math.floor(time * 3) % 8;
    const tx0 = Math.floor(cx / T), ty0 = Math.floor(cy / T), tx1 = Math.ceil((cx + vw) / T), ty1 = Math.ceil((cy + vh) / T);
    for (const [wx, wy, wc] of M.ground.water) if (wx >= tx0 && wx <= tx1 && wy >= ty0 && wy <= ty1) G.tiles.draw(g, wc || '~', wx * T - cx, wy * T - cy, wx, wy, wf);
    for (const p of M.props) if (p.flat) drawProp(p, cx, cy);
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
    // 밤
    if (M.night) {
      gd.globalCompositeOperation = 'source-over';
      gd.clearRect(0, 0, vw, vh);
      gd.fillStyle = 'rgba(10,14,40,.72)'; gd.fillRect(0, 0, vw, vh);
      gd.globalCompositeOperation = 'destination-out';
      const light = (x, y, r) => { const gr = gd.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.55, 'rgba(0,0,0,.6)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); gd.fillStyle = gr; gd.fillRect(x - r, y - r, r * 2, r * 2); };
      light(P.x - cx, P.y - cy - 16, 72);
      for (const l of M.lights) light(l.x - cx, l.y - cy, l.r * (l.fire ? 0.92 + Math.random() * 0.1 : 1));
      for (const f of M.fires) light(f[0] - cx, f[1] - cy - 10, 110 + Math.random() * 12);
      g.drawImage(dark, 0, 0);
    }
    drawParts(true);
    // 목표 표시
    const labels = [];
    if (goal && goal.targets && !W.busy) for (const id of goal.targets) {
      const tp = targetPos(id); if (!tp) continue;
      const [x, y, nm] = tp;
      const inView = x - cx > 8 && x - cx < vw - 8 && y - cy > 8 && y - cy < vh - 8;
      if (inView) { marker(x - cx, y - cy, 'goal'); if (goal.labels !== false) labels.push([x - cx, y - cy - 16, goal.labelOf ? goal.labelOf(id) : nm]); }
      else edgeArrow(x - cx, y - cy);
    }
    if (!W.busy) for (const id in M.npcs) {
      const e = M.npcs[id];
      if (!e.talk || (goal && goal.targets && goal.targets.includes(id))) continue;
      if (Math.hypot(e.x - P.x, e.y - P.y) < 70) marker(e.x - cx, headY(e) - cy, 'talk');
    }
    g0.drawImage(buf, 0, 0, vw, vh, 0, 0, vw * scale, vh * scale);
    // 이름표(또렷하게 원래 해상도로)
    if (labels.length && labelsOn) {
      const fs = Math.round(12 * dpr);
      g0.font = `700 ${fs}px ${W.font || (W.font = getComputedStyle(document.body).fontFamily)}`;
      g0.textAlign = 'center'; g0.textBaseline = 'bottom';
      for (const [x, y, s] of labels) {
        if (!s) continue;
        const X = x * scale, Y = y * scale;
        const tw = g0.measureText(s).width + 12 * dpr;
        g0.fillStyle = 'rgba(27,22,18,.82)';
        g0.fillRect(X - tw / 2, Y - fs - 6 * dpr, tw, fs + 8 * dpr);
        g0.fillStyle = '#f7efdc';
        g0.fillText(s, X, Y - 2 * dpr);
      }
    }
  }
  function edgeArrow(x, y) {
    const m = 14;
    const ex = clamp(x, m, vw - m), ey = clamp(y, m, vh - m);
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
    if (talkBtn._lab !== lab) { talkBtn._lab = lab; talkBtn.firstChild.textContent = lab || '말 걸기'; }
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
  W.enterTest = async function (mapId = 'test') {
    const A = ((window.FLOW || {}).acts || {})[1] || {};
    G.app.explore({ name: '시험 맵', actName: '시험', mission: A.mission || '' });
    W.placeId = null; W.place = null; W.avatarOverride = null; goal = null; W.busy = 0; P = null;
    W.mount(G.app.mapArea());
    await loadMap(mapId, null, {});
    if (G.hud) G.hud.refresh();
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
    enter: (mapId) => W.enterTest(mapId),
  };
})();
