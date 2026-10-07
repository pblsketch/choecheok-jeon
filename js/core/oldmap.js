'use strict';
// 고지도: 동아시아를 가로 한 줄(조선 → 일본 → 중국 → 안남)로 펼친 옛 지도. 거점 사이를 옮겨 갈 때 쓴다.
//  그림 파일 없이 캔버스로 그린다(땅 덩어리·물결·마을 점·뱃길·배).
//  G.oldmap.show({ from, to })            → 배가 from에서 to로 건너가고 '도착' 단추를 누르면 끝(true)
//  G.oldmap.show({ from, pick:true, paths:[{ id, from, to, label, desc, via:[[x,y]], locked, lockText }] })
//                                         → 뱃길 단추 가운데 하나를 고르면 그 길로 건너가고 고른 길 id를 돌려준다
//  nodes·paths·regions를 주지 않으면 window.OLDMAP(js/data/flow.js)의 것을 쓴다. 좌표는 지도 너비·높이에 대한 비율(0~1).
(function () {
  const { h } = G.util;
  const OM = (G.oldmap = {});
  OM.fast = false; // 시험용: true면 배가 바로 도착한다
  let cv, g, wrap, ro, raf = 0, view = null;

  const rnd = (seed) => { let s = seed * 9301 + 49297; return () => ((s = (s * 9301 + 49297) % 233280) / 233280); };
  const data = () => window.OLDMAP || { regions: [], nodes: {}, paths: [] };

  function size() {
    if (!cv || !wrap) return;
    const dpr = window.devicePixelRatio || 1;
    const W = Math.max(1, wrap.clientWidth), H = Math.max(1, wrap.clientHeight);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    view = Object.assign(view || {}, { W, H });
    draw();
  }

  // 땅 덩어리: 타원 둘레를 잡음으로 흔든 모양(같은 씨앗이면 늘 같은 모양)
  function blob(cx, cy, rx, ry, seed, rot = 0) {
    const r = rnd(seed), n = 28, pts = [];
    const k = [];
    for (let i = 0; i < n; i++) k.push(0.82 + r() * 0.3);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const s = (k[i] + k[(i + 1) % n] + k[(i + n - 1) % n]) / 3;
      const x = Math.cos(a) * rx * s, y = Math.sin(a) * ry * s;
      pts.push([cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]);
    }
    return pts;
  }
  const P = (x, y) => [x * view.W, y * view.H];
  function curve(path, nodes) {
    const a = nodes[path.from], b = nodes[path.to];
    if (!a || !b) return [];
    const ctrl = [[a.x, a.y], ...(path.via || []), [b.x, b.y]];
    // 꺾이는 점들을 부드럽게 잇는 점 목록(이차 곡선을 이어 붙임)
    const out = [];
    if (ctrl.length === 2) {
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2 - 0.06;
      for (let t = 0; t <= 1.0001; t += 0.02) out.push([(1 - t) * (1 - t) * a.x + 2 * (1 - t) * t * mx + t * t * b.x, (1 - t) * (1 - t) * a.y + 2 * (1 - t) * t * my + t * t * b.y]);
      return out;
    }
    for (let i = 0; i < ctrl.length - 1; i++) {
      const p0 = i === 0 ? ctrl[0] : [(ctrl[i - 1][0] + ctrl[i][0]) / 2, (ctrl[i - 1][1] + ctrl[i][1]) / 2];
      const c = ctrl[i];
      const p1 = i === ctrl.length - 2 ? ctrl[i + 1] : [(ctrl[i][0] + ctrl[i + 1][0]) / 2, (ctrl[i][1] + ctrl[i + 1][1]) / 2];
      const cc = i === 0 ? [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2] : c;
      for (let t = 0; t <= 1.0001; t += 0.04) out.push([(1 - t) * (1 - t) * p0[0] + 2 * (1 - t) * t * cc[0] + t * t * p1[0], (1 - t) * (1 - t) * p0[1] + 2 * (1 - t) * t * cc[1] + t * t * p1[1]]);
    }
    return out;
  }

  function draw() {
    if (!view || !g) return;
    const { W, H } = view;
    const d = view.o;
    const time = performance.now() / 1000;
    // 바다
    const sea = g.createLinearGradient(0, 0, 0, H);
    sea.addColorStop(0, '#d3dccf'); sea.addColorStop(1, '#bccbc4');
    g.fillStyle = sea; g.fillRect(0, 0, W, H);
    // 물결 무늬
    g.strokeStyle = 'rgba(70,100,100,.22)'; g.lineWidth = 1;
    const r = rnd(4);
    for (let i = 0; i < 70; i++) {
      const x = r() * W, y = r() * H, w = 10 + r() * 18, off = Math.sin(time * 0.8 + i) * 2;
      g.beginPath(); g.moveTo(x + off, y); g.quadraticCurveTo(x + w / 2 + off, y - 4, x + w + off, y); g.stroke();
    }
    // 땅
    for (const reg of d.regions) {
      for (const b of reg.blobs || []) {
        const pts = blob(b[0] * W, b[1] * H, b[2] * W, b[3] * H, b[4] || 1, b[5] || 0);
        g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath();
        g.fillStyle = '#ead9ad'; g.fill();
        g.lineWidth = 2; g.strokeStyle = '#5a4a3a'; g.stroke();
        g.lineWidth = 5; g.strokeStyle = 'rgba(90,74,58,.12)'; g.stroke();
        // 산 표시(작은 ʌ)
        const rr = rnd((b[4] || 1) + 50);
        g.strokeStyle = 'rgba(90,74,58,.45)'; g.lineWidth = 1.2;
        for (let i = 0; i < 5; i++) {
          const mx = b[0] * W + (rr() - 0.5) * b[2] * W * 1.1, my = b[1] * H + (rr() - 0.5) * b[3] * H * 1.1, s = 4 + rr() * 4;
          g.beginPath(); g.moveTo(mx - s, my + s * 0.6); g.lineTo(mx, my - s * 0.6); g.lineTo(mx + s, my + s * 0.6); g.stroke();
        }
      }
      // 나라 이름(붓글씨, 옅게)
      if (reg.name) {
        const fs = Math.max(18, Math.min(W * 0.05, H * 0.11));
        g.font = `${fs}px ${getComputedStyle(document.documentElement).getPropertyValue('--brush') || 'serif'}`;
        g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillStyle = 'rgba(42,33,25,.32)';
        g.fillText(reg.name, reg.label[0] * W, reg.label[1] * H);
      }
    }
    // 뱃길
    for (const p of d.paths) {
      const pts = curve(p, d.nodes); if (pts.length < 2) continue;
      const on = view.sel === p.id || (view.walk && view.walk.path === p);
      g.save();
      g.setLineDash(p.locked ? [3, 6] : [8, 6]);
      g.lineWidth = on ? 3.2 : 2;
      g.strokeStyle = p.locked ? 'rgba(90,74,58,.35)' : on ? '#b3342a' : 'rgba(140,60,40,.7)';
      g.beginPath(); pts.forEach(([x, y], i) => { const [X, Y] = P(x, y); if (i) g.lineTo(X, Y); else g.moveTo(X, Y); }); g.stroke();
      g.restore();
      if (p.label && d.pick) {
        const m = pts[Math.floor(pts.length / 2)]; const [X, Y] = P(m[0], m[1]);
        g.font = `700 ${Math.max(11, Math.min(14, W / 60))}px ${getComputedStyle(document.body).fontFamily}`;
        const tw = g.measureText(p.label).width + 10;
        g.fillStyle = p.locked ? 'rgba(239,226,195,.75)' : 'rgba(247,239,220,.95)'; g.fillRect(X - tw / 2, Y - 10, tw, 20);
        g.fillStyle = p.locked ? '#8b7a64' : '#2a2119'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(p.label, X, Y + 1);
      }
    }
    // 마을 점
    for (const id in d.nodes) {
      const n = d.nodes[id]; const [X, Y] = P(n.x, n.y);
      const here = id === view.at;
      g.beginPath(); g.arc(X, Y, here ? 8 : 6, 0, Math.PI * 2);
      g.fillStyle = here ? '#b3342a' : '#7a3a2a'; g.fill();
      g.lineWidth = 2; g.strokeStyle = '#fffaf0'; g.stroke();
      g.font = `700 ${Math.max(12, Math.min(16, W / 52))}px ${getComputedStyle(document.documentElement).getPropertyValue('--serif') || 'serif'}`;
      g.textAlign = 'center'; g.textBaseline = 'top';
      g.lineWidth = 3; g.strokeStyle = 'rgba(247,239,220,.9)'; g.strokeText(n.name, X, Y + 10);
      g.fillStyle = '#2a2119'; g.fillText(n.name, X, Y + 10);
    }
    // 배
    if (view.boat) {
      const [X, Y] = P(view.boat[0], view.boat[1]);
      const bob = Math.sin(time * 4) * 1.5;
      g.save(); g.translate(X, Y - 10 + bob);
      g.fillStyle = '#6e4726'; g.beginPath(); g.moveTo(-12, 0); g.lineTo(12, 0); g.lineTo(8, 6); g.lineTo(-8, 6); g.closePath(); g.fill();
      g.fillStyle = '#fffaf0'; g.strokeStyle = '#2a2119'; g.lineWidth = 1.2;
      g.beginPath(); g.moveTo(-1, -16); g.lineTo(-1, -1); g.lineTo(9, -1); g.closePath(); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(-1, -16); g.lineTo(-1, 0); g.stroke();
      g.restore();
    }
  }

  function loop() {
    if (!cv || !cv.isConnected) { raf = 0; return; }
    const w = view.walk;
    if (w) {
      const k = Math.min(1, (performance.now() - w.t0) / w.dur);
      const i = Math.min(w.pts.length - 1, Math.floor(k * (w.pts.length - 1)));
      view.boat = w.pts[i];
      if (k >= 1) { view.walk = null; view.at = w.path.to; w.done(); }
    }
    draw();
    raf = requestAnimationFrame(loop);
  }
  function sail(path) {
    return new Promise((done) => {
      const pts = curve(path, view.o.nodes);
      if (!pts.length || OM.fast) { view.boat = pts[pts.length - 1] || view.boat; view.at = path.to; done(); return; }
      view.walk = { path, pts, t0: performance.now(), dur: Math.max(1400, Math.min(3200, pts.length * 40)), done };
    });
  }

  OM.show = function (o = {}) {
    const d = data();
    const nodes = Object.assign({}, d.nodes, o.nodes || {});
    let paths = o.paths || d.paths || [];
    if (o.to && !o.pick && !paths.some((p) => p.from === o.from && p.to === o.to)) paths = paths.concat([{ from: o.from, to: o.to }]);
    paths = paths.map((p) => Object.assign({ id: p.from + '>' + p.to }, p));
    const area = G.app.mapArea();
    area.innerHTML = '';
    wrap = h('div.oldmap');
    cv = h('canvas.om-cv');
    g = cv.getContext('2d');
    const head = h('div.om-head', h('strong', o.title || '고지도'), o.note ? h('span', G.util.boldNodes(o.note)) : null);
    const tray = h('div.om-tray');
    wrap.append(cv, head, tray);
    area.appendChild(wrap);
    const n0 = nodes[o.from];
    view = { o: { regions: o.regions || d.regions || [], nodes, paths, pick: !!o.pick }, at: o.from, boat: n0 ? [n0.x, n0.y] : null, sel: null, walk: null };
    size();
    if (ro) ro.disconnect();
    if (window.ResizeObserver) { ro = new ResizeObserver(size); ro.observe(wrap); }
    if (!raf) raf = requestAnimationFrame(loop);
    if (G.hud) G.hud.where('고지도');
    G.audio.page();

    const button = (label, cls, fn, dis) => {
      const b = h('button.btn' + (cls ? '.' + cls : ''), { type: 'button', on: { click: () => { if (b.disabled) return; G.audio.tap(); fn(); } } }, label);
      if (dis) b.disabled = true;
      return b;
    };
    return new Promise((resolve) => {
      if (o.pick) {
        const choices = paths.filter((p) => p.from === o.from);
        const row = h('div.options.n' + Math.min(3, choices.length));
        for (const p of choices) {
          const locked = typeof p.locked === 'function' ? p.locked(G.save.state) : !!p.locked;
          const b = h('button.opt', { type: 'button' }, h('span.ot', p.label || (nodes[p.to] || {}).name || p.to), p.desc ? h('span.od', G.util.boldNodes(p.desc)) : null, locked ? h('span.od.lock', p.lockText || '지금은 갈 수 없어요') : null);
          if (locked) b.disabled = true;
          b.addEventListener('pointerenter', () => { view.sel = p.id; });
          b.addEventListener('focus', () => { view.sel = p.id; });
          b.addEventListener('click', async () => {
            if (b.disabled) return;
            G.audio.pick();
            row.querySelectorAll('.opt').forEach((x) => { x.disabled = true; x.classList.add(x === b ? 'picked' : 'dim'); });
            view.sel = p.id;
            await sail(p);
            resolve(p.id);
          });
          row.appendChild(b);
        }
        tray.appendChild(row);
        return;
      }
      const go = async () => {
        const p = paths.find((x) => x.from === o.from && x.to === o.to);
        if (p) await sail(p);
        tray.innerHTML = '';
        const b = button(o.button || '도착 ▶', 'primary', () => { document.removeEventListener('keydown', key); resolve(true); });
        const key = (e) => { if (!b.isConnected) { document.removeEventListener('keydown', key); return; } if (e.key === 'Enter' && G.steps.enterFree(e, b)) { e.preventDefault(); b.click(); } };
        document.addEventListener('keydown', key);
        tray.appendChild(h('div.actions', b));
        setTimeout(() => b.isConnected && b.focus({ preventScroll: true }), 30);
      };
      if (o.to) go();
      else {
        const b = button(o.button || '닫기', 'primary', () => resolve(true));
        tray.appendChild(h('div.actions', b));
      }
    });
  };
  // 시험용: 지금 그려진 상태
  OM.state = () => (view ? { at: view.at, boat: view.boat, walking: !!view.walk, nodes: Object.keys(view.o.nodes), paths: view.o.paths.map((p) => p.id || p.from + '>' + p.to) } : null);
})();
