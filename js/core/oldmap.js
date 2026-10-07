'use strict';
// 고지도: 그림책풍으로 그린 동아시아 옛 바다 지도(assets/ui/oldmap.webp, 글자 없는 그림) 위에
//  거점 점·지명·뱃길·배를 화면 글자와 SVG로 얹는다. 땅의 배치는 실제 지리대로(서쪽 안남·중국, 가운데 조선, 동쪽 일본).
//  좌표는 지도 그림의 너비·높이에 대한 비율(0~1)이다. 그림 속 실제 자리에 맞춰 js/data/flow.js의 OLDMAP에 적는다.
//
//  G.oldmap.show({ from, to })            → 배가 from에서 to로 건너가고 '도착' 단추를 누르면 끝(true)
//  G.oldmap.show({ from, pick:true, paths:[{ id, from, to, label, desc, via:[[x,y]], locked, lockText }] })
//                                         → 뱃길 단추 가운데 하나를 고르면 그 길로 건너가고 고른 길 id를 돌려준다
//  G.oldmap.peek({ at, title, note })     → 놀이 화면 위에 지도를 겹쳐 띄운다(닫으면 끝). 오른쪽 위 '지도' 아이콘이 쓴다
//  nodes·paths·regions를 주지 않으면 window.OLDMAP(js/data/flow.js)의 것을 쓴다.
//  카메라: 지금 오가는 거점과 뱃길이 화면에 다 들어오도록 지도를 옮기고 키운다(휴대폰 가로에서도 잘리지 않게).
(function () {
  const { h } = G.util;
  const OM = (G.oldmap = {});
  OM.fast = false; // 시험용: true면 배가 바로 도착한다
  OM.ART = 'assets/ui/oldmap.webp';
  OM.SIZE = [1536, 1024]; // 지도 그림 크기(비율 계산용)
  const SVGNS = 'http://www.w3.org/2000/svg';
  const BOAT = '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M5 25h30l-5 8H10z" fill="#7a4a26" stroke="#2b2433" stroke-width="1.6" stroke-linejoin="round"/><path d="M19 6v19" stroke="#2b2433" stroke-width="1.6"/><path d="M19.5 7c6 3 9 9 9 16h-9z" fill="#f4ead3" stroke="#2b2433" stroke-width="1.6" stroke-linejoin="round"/><path d="M18.5 10c-4 3-6 8-6 13h6z" fill="#e9b26a" stroke="#2b2433" stroke-width="1.6" stroke-linejoin="round"/><path d="M21 13h6M21 18h7" stroke="#b98a45" stroke-width="1"/></svg>';

  const data = () => window.OLDMAP || { regions: [], nodes: {}, paths: [] };
  let cur = null; // 지금 그려진 지도 { wrap, board, svg, nodesEl, boat, view }

  // 꺾이는 점들을 부드럽게 잇는 점 목록(이차 곡선을 이어 붙임). 점은 0~1 비율
  function curve(path, nodes) {
    const a = nodes[path.from], b = nodes[path.to];
    if (!a || !b) return [];
    const ctrl = [[a.x, a.y], ...(path.via || []), [b.x, b.y]];
    const out = [];
    if (ctrl.length === 2) {
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2 - 0.03;
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
  OM.curve = curve;
  const [IW, IH] = OM.SIZE;
  const toD = (pts) => pts.map(([x, y], i) => (i ? 'L' : 'M') + (x * IW).toFixed(1) + ' ' + (y * IH).toFixed(1)).join(' ');

  // ───────── 그리기 ─────────
  function build(host, o) {
    const d = data();
    const nodes = Object.assign({}, d.nodes, o.nodes || {});
    let paths = o.paths || d.paths || [];
    if (o.to && !o.pick && !paths.some((p) => p.from === o.from && p.to === o.to)) paths = paths.concat([{ from: o.from, to: o.to }]);
    paths = paths.map((p) => Object.assign({ id: p.from + '>' + p.to }, p));
    const regions = o.regions || d.regions || [];

    const wrap = h('div.oldmap');
    const board = h('div.om-board');
    const im = h('img.om-img', { src: OM.ART, alt: '', draggable: 'false' });
    const svg = document.createElementNS(SVGNS, 'svg');
    svg.setAttribute('class', 'om-svg'); svg.setAttribute('viewBox', `0 0 ${IW} ${IH}`); svg.setAttribute('preserveAspectRatio', 'none');
    const nodesEl = h('div.om-nodes');
    const boat = h('div.om-boat', { html: BOAT });
    board.append(im, svg, nodesEl, boat);
    const head = h('div.om-head', h('strong', o.title || '고지도'), o.note ? h('span', G.util.boldNodes(o.note)) : null);
    const tray = h('div.om-tray');
    wrap.append(board, head, tray);
    host.appendChild(wrap);

    // 나라 이름(그림 위에 옅은 붓글씨)
    for (const reg of regions) if (reg.name && reg.label) nodesEl.appendChild(h('span.om-region', { style: { left: reg.label[0] * 100 + '%', top: reg.label[1] * 100 + '%' } }, reg.name));
    // 뱃길: 아래 짙은 테두리 + 위 점선
    const routeEls = {};
    for (const p of paths) {
      const pts = curve(p, nodes); if (pts.length < 2) continue;
      const g = document.createElementNS(SVGNS, 'g');
      const locked = typeof p.locked === 'function' ? p.locked(G.save.state) : !!p.locked;
      g.setAttribute('class', 'om-route' + (locked ? ' locked' : '') + (o.pick ? ' pickable' : ''));
      const dd = toD(pts);
      for (const cls of ['under', 'line', 'flow']) { const e = document.createElementNS(SVGNS, 'path'); e.setAttribute('d', dd); e.setAttribute('class', cls); e.setAttribute('vector-effect', 'non-scaling-stroke'); g.appendChild(e); }
      svg.appendChild(g);
      routeEls[p.id] = g;
      if (p.label && o.pick) {
        const m = pts[Math.floor(pts.length * (p.labelAt != null ? p.labelAt : 0.5))];
        nodesEl.appendChild(h('span.om-rlabel' + (locked ? '.locked' : ''), { 'data-route': p.id, style: { left: m[0] * 100 + '%', top: m[1] * 100 + '%' } }, p.label));
      }
    }
    // 거점 점과 지명
    for (const id in nodes) {
      const n = nodes[id];
      nodesEl.appendChild(h('div.om-node.lab-' + (n.label || 'bottom'), { 'data-node': id, style: { left: n.x * 100 + '%', top: n.y * 100 + '%' } }, h('i.dot'), h('span.nm', n.name)));
    }
    const view = { o, nodes, paths, at: o.from || o.at || null, boat: null, sel: null, walk: null, routeEls, W: 1, H: 1 };
    cur = { wrap, board, svg, nodesEl, boat, view, head, tray };
    setAt(view.at);
    const n0 = nodes[view.at];
    if (n0) placeBoat([n0.x, n0.y]); else boat.hidden = true;
    return cur;
  }
  function setAt(id) {
    if (!cur) return;
    cur.view.at = id;
    cur.nodesEl.querySelectorAll('.om-node').forEach((e) => e.classList.toggle('here', e.dataset.node === id));
  }
  function placeBoat(p, flip) {
    if (!cur || !p) return;
    cur.view.boat = p;
    cur.boat.hidden = false;
    cur.boat.style.left = p[0] * 100 + '%'; cur.boat.style.top = p[1] * 100 + '%';
    if (flip != null) cur.boat.classList.toggle('flip', flip);
  }
  function select(id) {
    if (!cur) return;
    cur.view.sel = id;
    for (const k in cur.view.routeEls) cur.view.routeEls[k].classList.toggle('on', k === id);
    cur.nodesEl.querySelectorAll('.om-rlabel').forEach((e) => e.classList.toggle('on', e.dataset.route === id));
  }

  // ───────── 카메라: 보여 줄 점들이 화면 안에 들어오게 ─────────
  function focus(points, instant) {
    if (!cur) return;
    const wrap = cur.wrap;
    const W = Math.max(1, wrap.clientWidth), H = Math.max(1, wrap.clientHeight);
    cur.view.W = W; cur.view.H = H;
    const headB = cur.head.getBoundingClientRect(), wrapB = wrap.getBoundingClientRect();
    const trayH = cur.tray.offsetHeight || 0;
    const top = Math.max(16, headB.bottom - wrapB.top + 12), bottom = Math.max(16, trayH + 16), side = Math.min(64, W * 0.06);
    const availW = Math.max(60, W - side * 2), availH = Math.max(60, H - top - bottom);
    const cover = Math.max(W / IW, H / IH), contain = Math.min(W / IW, H / IH);
    let x0 = 1, y0 = 1, x1 = 0, y1 = 0;
    for (const [x, y] of points) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    if (!points.length) { x0 = 0.1; y0 = 0.1; x1 = 0.9; y1 = 0.9; }
    const pad = 0.06;
    x0 -= pad; x1 += pad; y0 -= pad; y1 += pad;
    const fit = Math.min(availW / ((x1 - x0) * IW), availH / ((y1 - y0) * IH));
    const s = G.util.clamp(fit, contain, cover * 1.7);
    const bw = IW * s, bh = IH * s;
    // 고른 범위의 가운데를 남은 자리의 가운데에
    let tx = side + availW / 2 - ((x0 + x1) / 2) * bw;
    let ty = top + availH / 2 - ((y0 + y1) / 2) * bh;
    // 지도가 화면보다 크면 가장자리가 비지 않게, 작으면 가운데로
    tx = bw >= W ? G.util.clamp(tx, W - bw, 0) : (W - bw) / 2;
    ty = bh >= H ? G.util.clamp(ty, H - bh, 0) : (H - bh) / 2;
    const b = cur.board;
    if (instant) { b.style.transition = 'none'; }
    b.style.width = bw + 'px'; b.style.height = bh + 'px';
    b.style.transform = `translate(${Math.round(tx)}px, ${Math.round(ty)}px)`;
    if (instant) { void b.offsetWidth; b.style.transition = ''; }
    cur.view.focus = points;
  }
  function pointsOf(o, view) {
    const pts = [];
    const add = (id) => { const n = view.nodes[id]; if (n) pts.push([n.x, n.y]); };
    if (o.pick) { add(o.from); for (const p of view.paths.filter((x) => x.from === o.from)) { add(p.to); for (const v of p.via || []) pts.push(v); } }
    else if (o.to) { add(o.from); add(o.to); const p = view.paths.find((x) => x.from === o.from && x.to === o.to); if (p) for (const v of p.via || []) pts.push(v); }
    else { add(view.at); for (const id in view.nodes) add(id); }
    return pts;
  }
  let ro = null;
  function watch() {
    if (ro) ro.disconnect();
    if (!window.ResizeObserver || !cur) return;
    const c = cur;
    ro = new ResizeObserver(() => { if (cur === c && c.view.focus) focus(c.view.focus, true); });
    ro.observe(c.wrap);
  }

  // ───────── 배 띄우기 ─────────
  function sail(path) {
    return new Promise((done) => {
      const view = cur.view;
      const pts = curve(path, view.nodes);
      select(path.id);
      if (!pts.length || OM.fast) { placeBoat(pts[pts.length - 1] || view.boat); setAt(path.to); done(); return; }
      const c = cur;
      const dur = Math.max(1600, Math.min(3400, pts.length * 42));
      const t0 = performance.now();
      cur.wrap.classList.add('sailing');
      const step = (now) => {
        if (cur !== c || !c.wrap.isConnected) { done(); return; }
        const k = Math.min(1, (now - t0) / dur);
        const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; // 천천히 떠나 천천히 닿는다
        const f = e * (pts.length - 1), i = Math.min(pts.length - 2, Math.floor(f)), r = f - i;
        const a = pts[i], b = pts[i + 1] || a;
        placeBoat([a[0] + (b[0] - a[0]) * r, a[1] + (b[1] - a[1]) * r], b[0] < a[0]);
        if (k < 1) requestAnimationFrame(step);
        else { c.wrap.classList.remove('sailing'); setAt(path.to); done(); }
      };
      requestAnimationFrame(step);
    });
  }

  const button = (label, cls, fn) => h('button.btn' + (cls ? '.' + cls : ''), { type: 'button', on: { click: (e) => { if (e.currentTarget.disabled) return; G.audio.tap(); fn(); } } }, label);

  OM.show = function (o = {}) {
    const area = o.into || G.app.mapArea();
    area.innerHTML = '';
    const c = build(area, o);
    const { view, tray } = c;
    if (G.hud) G.hud.where('고지도');
    G.audio.page();
    return new Promise((resolve) => {
      if (o.pick) {
        const choices = view.paths.filter((p) => p.from === o.from);
        const row = h('div.options.n' + Math.min(3, choices.length));
        for (const p of choices) {
          const locked = typeof p.locked === 'function' ? p.locked(G.save.state) : !!p.locked;
          const b = h('button.opt', { type: 'button' }, h('span.ot', p.label || (view.nodes[p.to] || {}).name || p.to), p.desc ? h('span.od', G.util.boldNodes(p.desc)) : null, locked ? h('span.od.lock', p.lockText || '지금은 갈 수 없어요') : null);
          if (locked) b.disabled = true;
          b.addEventListener('pointerenter', () => { if (!view.walk) select(p.id); });
          b.addEventListener('focus', () => { if (!view.walk) select(p.id); });
          b.addEventListener('click', async () => {
            if (b.disabled) return;
            G.audio.pick();
            row.querySelectorAll('.opt').forEach((x) => { x.disabled = true; x.classList.add(x === b ? 'picked' : 'dim'); });
            view.walk = true;
            focus(pointsOf({ from: p.from, to: p.to }, Object.assign({}, view, { paths: [p] })));
            await sail(p);
            view.walk = false;
            resolve(p.id);
          });
          row.appendChild(b);
        }
        tray.appendChild(h('div.om-pick', o.ask ? h('div.om-ask', G.util.boldNodes(o.ask)) : null, row));
        focus(pointsOf(o, view), true);
        watch();
        return;
      }
      focus(pointsOf(o, view), true);
      watch();
      const go = async () => {
        const p = view.paths.find((x) => x.from === o.from && x.to === o.to);
        view.walk = true;
        if (p) await sail(p);
        view.walk = false;
        tray.innerHTML = '';
        const b = button(o.button || '도착 ▶', 'primary.big', () => { document.removeEventListener('keydown', key); resolve(true); });
        const key = (e) => { if (!b.isConnected) { document.removeEventListener('keydown', key); return; } if (e.key === 'Enter' && G.steps.enterFree(e, b)) { e.preventDefault(); b.click(); } };
        document.addEventListener('keydown', key);
        tray.appendChild(h('div.actions', b));
        setTimeout(() => b.isConnected && b.focus({ preventScroll: true }), 30);
      };
      if (o.to) go();
      else tray.appendChild(h('div.actions', button(o.button || '닫기', 'primary', () => resolve(true))));
    });
  };

  // 놀이 화면 위에 겹쳐 보는 지도(탑다운 맵은 멈춘다). 오른쪽 위 ✕·'지도 닫기' 단추·Esc로 닫는다
  OM.peek = function (o = {}) {
    const back = h('div.overlay.om-peek', { role: 'dialog', 'aria-modal': 'true', 'aria-label': o.title || '고지도' });
    document.body.appendChild(back);
    const prev = cur;
    return new Promise((resolve) => {
      const close = () => { document.removeEventListener('keydown', onKey); back.remove(); cur = prev && prev.wrap.isConnected ? prev : null; resolve(true); };
      const onKey = (e) => { if (e.key === 'Escape') { e.preventDefault(); close(); } };
      document.addEventListener('keydown', onKey);
      const c = build(back, { from: o.at, at: o.at, title: o.title || '고지도', note: o.note });
      c.tray.appendChild(h('div.actions', button('지도 닫기', 'primary', close)));
      const x = h('button.icon-btn.om-close', { type: 'button', 'aria-label': '지도 닫기', title: '지도 닫기', html: (G.app.ICON || {}).close || '✕', on: { click: () => { G.audio.tap(); close(); } } });
      back.appendChild(x);
      requestAnimationFrame(() => { focus(pointsOf({}, c.view), true); watch(); });
      G.audio.page();
    });
  };

  // 시험용: 지금 그려진 상태
  OM.state = () => (cur ? { at: cur.view.at, boat: cur.view.boat, walking: !!cur.view.walk, sel: cur.view.sel, nodes: Object.keys(cur.view.nodes), paths: cur.view.paths.map((p) => p.id) } : null);
})();
