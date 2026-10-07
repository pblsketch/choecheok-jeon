'use strict';
// 2막 바다 거점의 화면 단계(T9): route(고지도에서 뱃길 고르기) · stars(별과 지남철로 뱃길 잡기)
//  + 원문 한 구절 줄(lineKinds.wonmun) + 글 속 자리 {신표}(1막에서 챙긴 신표 이름).
//
//  route: { id, type:'route', for:'딜레마 단계 id', from:'hangzhou', title, note, ask? }
//   - 고지도(G.oldmap.show pick) 위에서 뱃길을 고른다. 뱃길 목록은 OLDMAP.routes.act2(js/data/flow.js),
//     이름·설명·잠김은 for가 가리키는 딜레마(d-sea-route)의 선택지에서 가져온다(잠김 = G.rules.optionState).
//   - 고른 길은 같은 사건 화면의 다음 딜레마 단계에 미리 골라 둔 값(ctx.preset)으로 넘긴다.
//     그래서 게이지·route 저장·원작 대조 카드·원작 궤적은 모두 보통 딜레마 규칙(rules.js) 그대로다.
//   - 딜레마가 없거나 뱃길 자료가 없으면 '준비 중'으로 넘어간다.
//  stars: { id, type:'stars', intro?:[줄…], dipper, pole, helm, done?:[줄…] }
//   - 밤바다에서 북두칠성을 차례로 잇고 → 국자 끝 두 별을 따라 북극성을 찾고 → 지남철로 뱃머리를 북동쪽(조선)에 맞춘다.
//   - 틀려도 잃는 것이 없다(실패 없음). 끝나면 done 줄을 별하늘 위 글 판에 보여 준다.
(function () {
  const { h, boldNodes } = G.util;
  const S = () => G.save.state;
  const noop = () => {};
  const sfx = (n) => ((G.audio && G.audio[n]) || noop).call(G.audio);

  // ───────── 원문 한 구절 줄: { wonmun:{ 원문, 풀이 } } (표기 칩과 함께) ─────────
  G.steps.lineKinds.wonmun = (line) => {
    const q = G.steps.quote(line.wonmun);
    return q ? h('div.para.show.wonmun', q) : null;
  };

  // ───────── 글 속 자리 {신표}: 1막에서 챙긴 첫 신표 이름(없으면 '신표') ─────────
  G.util.vars.신표 = () => {
    const t = ((G.save && G.save.state && G.save.state.tokens) || [])[0];
    return (t && (t.name || t.id)) || '신표';
  };

  // 단계가 끝나기 전에 장면이 넘어가면(선생님용 '장면 건너뛰기') 덧붙인 화면을 거둔다:
  //  다음 단계가 ctx.main을 비우는 순간 표지 요소가 사라지는 것을 보고 정리한다
  function onLeave(ctx, fn) {
    const mark = h('span.sea-mark', { hidden: true });
    ctx.main.appendChild(mark);
    let done = false;
    const run = () => { if (done) return; done = true; mo.disconnect(); fn(); };
    const mo = new MutationObserver(() => { if (!mark.isConnected) run(); });
    mo.observe(ctx.main, { childList: true });
    return run;
  }
  const holderOf = (ctx) => ctx.el || ctx.dlg || G.app.mapArea();

  // ═════════ route: 고지도에서 뱃길 고르기 ═════════
  G.steps.register('route', async function (step, ctx) {
    const P = window.PLACES || {};
    const place = ctx.place || P[ctx.placeId] || null;
    const target = place && step.for ? (place.steps || []).find((s) => s.id === step.for) : null;
    const paths0 = step.paths || (((window.OLDMAP || {}).routes) || {}).act2 || [];
    if (!target || !target.options || !paths0.length || !G.oldmap) return G.steps.notReady(step, ctx);
    const st = S();
    const pid = ctx.placeId || st.place;
    const key = G.app.key.step(pid, target.id);
    const setPreset = (id) => {
      const i = target.options.findIndex((o) => o.id === id);
      if (i >= 0) ctx.preset = Object.assign({}, ctx.preset || {}, { [target.id]: i });
    };
    const prev = (st.applied || {})[key];
    if (prev && prev.choice) { setPreset(prev.choice); return; } // 이미 고른 길(이어 하기)

    const paths = paths0.map((p) => {
      const opt = target.options.find((o) => o.id === p.id);
      if (!opt) return null;
      const os = G.rules.optionState(target, opt, S(), pid);
      return Object.assign({}, p, {
        label: opt.label || p.label,
        desc: opt.desc || p.desc,
        locked: (s) => !G.rules.optionState(target, opt, s || S(), pid).open,
        lockText: os.open ? '' : (os.hint || ''),
      });
    }).filter(Boolean);

    const holder = holderOf(ctx);
    const host = h('div.sea-route');
    const whereEl = document.querySelector('.pl-where');
    const where0 = whereEl ? whereEl.textContent : '';
    const cleanup = onLeave(ctx, () => {
      host.remove();
      if (ctx.el) ctx.el.classList.remove('routemode');
      if (G.hud && G.hud.where) G.hud.where(where0);
    });
    if (ctx.el) ctx.el.classList.add('routemode');
    holder.appendChild(host);
    const pick = await G.oldmap.show({ into: host, from: step.from || 'hangzhou', pick: true, paths, title: step.title || '뱃길 고르기', note: step.note || '', ask: step.ask || '' });
    setPreset(pick);
    cleanup();
  });

  // ═════════ stars: 별과 지남철로 뱃길 잡기 ═════════
  //  북두칠성(손잡이 끝 요광 → … → 국자 끝 천추)과 북극성. 별 이름은 우리 옛 이름(괄호는 서양 이름)
  //  모양 좌표: 천추(Dubhe)를 원점에 두고 국자 끝 두 별(천선→천추)이 위를 가리키게 그린 뒤 돌린다
  //  side: 별 이름을 적을 쪽(l 왼쪽 · r 오른쪽 · b 아래)
  const DIPPER = [
    { id: 'alkaid', name: '요광', x: -195, y: 20, side: 'l' },
    { id: 'mizar', name: '개양', x: -150, y: 2, side: 'l' },
    { id: 'alioth', name: '옥형', x: -110, y: 0, side: 'l' },
    { id: 'megrez', name: '천권', x: -62, y: 8, side: 'r' },
    { id: 'phecda', name: '천기', x: -55, y: 58, side: 'l' },
    { id: 'merak', name: '천선', x: 0, y: 50, side: 'b' },
    { id: 'dubhe', name: '천추', x: 0, y: 0, side: 'r' },
  ];
  // 국자 끝 두 별 사이를 다섯 배쯤 늘인 곳에 북극성
  const POLARIS = { id: 'polaris', name: '북극성', x: 0, y: -250 };
  // 북극성 근처의 다른 별들(헷갈리게 하는 별, 눌러도 잃는 것 없음). 이 좌표는 돌린 뒤의 자리다
  const DECOYS = [{ x: 288, y: -92 }, { x: 150, y: -150 }, { x: 178, y: -28 }, { x: 262, y: -160 }];
  const ROT = (60 * Math.PI) / 180; // 시계 방향으로 돌린 각
  const rot = (p) => ({ x: p.x * Math.cos(ROT) - p.y * Math.sin(ROT), y: p.x * Math.sin(ROT) + p.y * Math.cos(ROT) });
  // 지남철: 뱃머리 방향(도, 북 0 · 동 90). 처음엔 서쪽, 조선은 북동쪽
  const HELM = { start: 270, target: 45, step: 45 };
  const DIR_NAME = { 0: '북', 45: '북동', 90: '동', 135: '남동', 180: '남', 225: '남서', 270: '서', 315: '북서' };

  const SVGNS = 'http://www.w3.org/2000/svg';
  const sv = (tag, attrs) => { const e = document.createElementNS(SVGNS, tag); for (const k in attrs || {}) e.setAttribute(k, attrs[k]); return e; };
  // 결정적 잡음(배경 별자리가 매번 같게)
  const rnd = (i, k) => { let n = (i * 374761393 + k * 668265263) | 0; n = (n ^ (n >>> 13)) * 1274126177; return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };

  function buildSky() {
    const bg = h('div.sky-bg', { 'aria-hidden': 'true' });
    // 배경 별: 위쪽 하늘에 흩뿌리고 반짝이게
    const dots = h('div.sky-dots');
    for (let i = 0; i < 140; i++) {
      const s = 1 + Math.floor(rnd(i, 3) * 3);
      dots.appendChild(h('i', { style: { left: (rnd(i, 1) * 100).toFixed(2) + '%', top: (Math.pow(rnd(i, 2), 1.3) * 74).toFixed(2) + '%', width: s + 'px', height: s + 'px', animationDelay: (rnd(i, 4) * 4).toFixed(2) + 's', opacity: (0.35 + rnd(i, 5) * 0.6).toFixed(2) } }));
    }
    bg.appendChild(h('div.sky-milky'));
    bg.appendChild(dots);
    // 바다와 뱃머리(그림책풍 실루엣)
    bg.appendChild(h('div.sky-moon'));
    bg.appendChild(h('div.sky-sea', { html:
      '<svg viewBox="0 0 1600 520" preserveAspectRatio="xMidYMax slice">' +
      '<defs><linearGradient id="skysea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#22336a"/><stop offset=".35" stop-color="#17244c"/><stop offset="1" stop-color="#0b1230"/></linearGradient>' +
      '<radialGradient id="skyglow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffd27a" stop-opacity=".55"/><stop offset="1" stop-color="#ffd27a" stop-opacity="0"/></radialGradient></defs>' +
      '<path d="M0 330 C200 318 420 340 640 328 C880 316 1100 340 1320 326 C1460 318 1540 326 1600 322 V520 H0Z" fill="url(#skysea)"/>' +
      '<g fill="#ffe3a0" opacity=".45"><rect x="1250" y="350" width="120" height="3" rx="1.5"/><rect x="1225" y="374" width="170" height="3" rx="1.5"/><rect x="1270" y="402" width="90" height="3" rx="1.5" opacity=".7"/><rect x="1235" y="434" width="150" height="3" rx="1.5" opacity=".5"/><rect x="1280" y="468" width="70" height="3" rx="1.5" opacity=".4"/></g>' +
      '<g fill="none" stroke="#5f78b0" stroke-width="3" stroke-linecap="round" opacity=".45"><path d="M620 420 q26 -14 52 0 t52 0"/><path d="M820 480 q26 -14 52 0 t52 0"/><path d="M1000 380 q26 -14 52 0 t52 0"/><path d="M1480 470 q26 -14 52 0 t52 0"/><path d="M520 500 q26 -14 52 0 t52 0"/></g>' +
      // 뱃머리(옥영의 배): 갑판·돛대·돛·등불
      '<g transform="translate(0 520)">' +
      '<path d="M-30 -112 C110 -116 250 -106 370 -80 L424 -56 C320 -30 190 -12 -30 -8Z" fill="#2a1c22"/>' +
      '<path d="M-30 -112 C110 -116 250 -106 370 -80 L424 -56" fill="none" stroke="#6a4a34" stroke-width="5" stroke-linecap="round"/>' +
      '<path d="M200 -108 V-352" stroke="#2a1c22" stroke-width="9" stroke-linecap="round"/>' +
      '<path d="M207 -340 C292 -300 322 -220 318 -126 H207Z" fill="#3b2c33"/><path d="M207 -340 C292 -300 322 -220 318 -126" fill="none" stroke="#6a4a34" stroke-width="3"/>' +
      '<path d="M213 -300 H296 M213 -250 H312 M213 -200 H317 M213 -160 H318" stroke="#54404a" stroke-width="2.5"/>' +
      '<path d="M193 -330 C140 -290 118 -220 120 -130 H193Z" fill="#33262c" opacity=".9"/>' +
      '<circle cx="372" cy="-98" r="60" fill="url(#skyglow)"/><circle cx="372" cy="-98" r="9" fill="#ffd27a"/>' +
      '</g></svg>' }));
    return bg;
  }

  // 별 무대: 북두칠성·북극성·헷갈리는 별을 단추로 놓고, 선은 SVG로 긋는다
  function buildStage() {
    const stage = h('div.sky-stage');
    const svg = sv('svg', { class: 'sky-lines', preserveAspectRatio: 'none' });
    const lines = sv('g', { class: 'sl-done' });
    const guide = sv('line', { class: 'sl-guide' });
    svg.append(lines, guide);
    stage.appendChild(svg);
    const pts = DIPPER.map(rot), pp = rot(POLARIS), dp = DECOYS;
    const all = pts.concat([pp], dp);
    const box = { x0: Math.min(...all.map((p) => p.x)), x1: Math.max(...all.map((p) => p.x)), y0: Math.min(...all.map((p) => p.y)), y1: Math.max(...all.map((p) => p.y)) };
    const stars = DIPPER.map((d, i) => Object.assign({ el: h('button.star.dipper', { type: 'button', 'aria-label': d.name + ' 별', 'data-star': String(i), 'data-side': d.side }, h('i'), h('span.sn', d.name)) }, d, pts[i]));
    const polaris = Object.assign({ el: h('button.star.polaris', { type: 'button', 'aria-label': '밝은 별', 'data-star': 'polaris', 'data-side': 'b' }, h('i'), h('span.sn', '북극성')) }, POLARIS, pp);
    const decoys = dp.map((p, i) => Object.assign({ el: h('button.star.decoy', { type: 'button', 'aria-label': '흐린 별', 'data-star': 'decoy' + i }, h('i')) }, p));
    for (const s of stars.concat([polaris], decoys)) stage.appendChild(s.el);
    // 화면 크기에 맞춰 키운다. 가로 화면이 낮으면 옆으로 조금 늘여(최대 1.5배) 별 사이가 손가락 하나보다 넓게
    function layout() {
      const W = stage.clientWidth || 1, H = stage.clientHeight || 1;
      const padX = Math.min(48, W * 0.06), padY = 22;
      let ky = Math.min(1.9, (H - padY * 2) / (box.y1 - box.y0));
      const kx = Math.min((W - padX * 2) / (box.x1 - box.x0), ky * 1.5, 2.3);
      ky = Math.min(ky, kx * 1.2);
      const ox = (W - (box.x1 - box.x0) * kx) / 2 - box.x0 * kx, oy = (H - (box.y1 - box.y0) * ky) / 2 - box.y0 * ky;
      const put = (s) => { s.px = ox + s.x * kx; s.py = oy + s.y * ky; s.el.style.left = s.px + 'px'; s.el.style.top = s.py + 'px'; };
      stars.forEach(put); put(polaris); decoys.forEach(put);
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      redraw();
    }
    let joined = 0, guideOn = 0;
    function redraw() {
      lines.innerHTML = '';
      for (let i = 1; i < joined; i++) {
        const a = stars[i - 1], b = stars[i];
        lines.appendChild(sv('line', { x1: a.px, y1: a.py, x2: b.px, y2: b.py }));
      }
      if (joined >= 7) { const a = stars[3], b = stars[6]; lines.appendChild(sv('line', { x1: b.px, y1: b.py, x2: a.px, y2: a.py })); } // 국자 입 닫기(천추-천권)
      // 천선 → 천추를 지나 북극성까지 늘인 선(돌리고 늘여도 세 별은 한 줄 위에 있다)
      const m = stars[5];
      if (guideOn > 0) {
        const t = Math.min(1, guideOn);
        guide.setAttribute('x1', m.px); guide.setAttribute('y1', m.py);
        guide.setAttribute('x2', m.px + (polaris.px - m.px) * t); guide.setAttribute('y2', m.py + (polaris.py - m.py) * t);
        guide.style.display = '';
      } else guide.style.display = 'none';
    }
    return {
      stage, stars, polaris, decoys, layout,
      setJoined(n) { joined = n; redraw(); },
      setGuide(t) { guideOn = t; redraw(); },
    };
  }

  // 지남철 판: 바늘은 늘 북쪽, 뱃머리 화살표를 ◀ ▶로 돌린다
  function buildHelm() {
    const dial = h('div.helm-dial', { html:
      '<svg viewBox="-60 -60 120 120" aria-hidden="true">' +
      '<circle r="56" class="hd-rim"/><circle r="49" class="hd-face"/>' +
      [0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<line class="hd-tick${a % 90 ? ' s' : ''}" x1="0" y1="-49" x2="0" y2="${a % 90 ? -43 : -40}" transform="rotate(${a})"/>`).join('') +
      '<text class="hd-n" x="0" y="-27">北</text><text class="hd-l" x="29" y="4">東</text><text class="hd-l" x="0" y="35">南</text><text class="hd-l" x="-29" y="4">西</text>' +
      `<g class="hd-target" transform="rotate(${HELM.target})"><path d="M0 -58 l5 6 -5 6 -5 -6z"/></g>` +
      '<g class="hd-heading"><path d="M0 -44 L7 -30 L2 -30 L2 16 L-2 16 L-2 -30 L-7 -30Z"/></g>' +
      '<g class="hd-needle"><path d="M0 -36 L4 0 L0 4 L-4 0Z" class="nn"/><path d="M0 36 L4 0 L0 -4 L-4 0Z" class="ns"/><circle r="3.4" class="hc"/></g>' +
      '</svg>' });
    const tl = h('span.helm-tag', '조선');
    const left = h('button.btn.helm-btn.helm-l', { type: 'button', 'aria-label': '뱃머리를 왼쪽으로' }, '◀');
    const right = h('button.btn.helm-btn.helm-r', { type: 'button', 'aria-label': '뱃머리를 오른쪽으로' }, '▶');
    const read = h('div.helm-read');
    const wrap = h('div.helm', h('div.helm-name', '지남철'), h('div.helm-body', left, h('div.helm-dialbox', dial, tl), right), read);
    return { wrap, dial, left, right, read, tag: tl };
  }

  G.steps.register('stars', async function (step, ctx) {
    if (!ctx.el) { // 맵 위 작은 창에서 부른 경우: 별하늘 없이 글만
      if (step.done && step.done.length) await G.steps.lines(step.done, ctx);
      return;
    }
    const el = ctx.el;
    const sky = h('div.sea-stars');
    const bg = buildSky();
    const st = buildStage();
    const helm = buildHelm();
    const plaque = h('div.sky-guide', { role: 'status', 'aria-live': 'polite' });
    sky.append(bg, st.stage, helm.wrap, plaque);
    const cleanup = onLeave(ctx, () => { sky.remove(); el.classList.remove('starsmode', 'starsplay'); if (ro) ro.disconnect(); });
    el.classList.add('starsmode', 'starsplay');
    el.insertBefore(sky, el.querySelector('.ev-box'));
    const ro = window.ResizeObserver ? new ResizeObserver(() => st.layout()) : null;
    if (ro) ro.observe(st.stage);
    requestAnimationFrame(() => st.layout());
    const prog = (n) => h('div.sg-prog', [0, 1, 2].map((i) => h('i' + (i < n ? '.on' : i === n ? '.now' : ''))));
    const say = (title, text, n) => {
      plaque.innerHTML = '';
      plaque.append(h('strong', title), h('span', boldNodes(text || '')), prog(n));
    };
    const nudge = (text) => {
      const e = h('em.sg-nudge', text);
      plaque.querySelectorAll('.sg-nudge').forEach((x) => x.remove());
      plaque.appendChild(e);
      setTimeout(() => e.remove(), 1800);
    };

    // 0) 들머리 글(별하늘 위 글 판)
    if (step.intro && step.intro.length) {
      el.classList.remove('starsplay');
      await G.steps.lines(step.intro, ctx, '별을 읽는다 ▶');
      ctx.main.querySelectorAll('.says').forEach((x) => x.remove());
      el.classList.add('starsplay');
    }

    // 1) 북두칠성 잇기: 손잡이 끝(요광)부터 국자 끝(천추)까지 차례로
    say('북두칠성 잇기', step.dipper || '국자 모양 일곱 별을 손잡이 끝에서부터 차례로 이어 보세요.', 0);
    sky.classList.add('ph-dipper');
    await new Promise((res) => {
      let n = 0;
      const mark = () => st.stars.forEach((s, i) => { s.el.classList.toggle('lit', i < n); s.el.classList.toggle('next', i === n); });
      mark();
      st.stars.forEach((s, i) => s.el.addEventListener('click', () => {
        if (n >= 7 || i < n) return;
        if (i !== n) { sfx('tap'); s.el.classList.remove('shimmer'); void s.el.offsetWidth; s.el.classList.add('shimmer'); nudge('반짝이는 별부터 차례로 이어요'); return; }
        n++; sfx('pick'); st.setJoined(n); mark();
        if (n === 7) { sfx('grow'); setTimeout(res, 650); }
      }));
      for (const d of st.decoys.concat([st.polaris])) d.el.addEventListener('click', () => { if (n < 7) { sfx('tap'); nudge('북두칠성은 국자 모양이에요'); } });
      setTimeout(() => { const f = st.stars[0].el; if (f.isConnected) f.focus({ preventScroll: true }); }, 60);
    });

    // 2) 북극성 찾기: 국자 끝 두 별(천선 → 천추)을 이은 선을 늘인다
    sky.classList.remove('ph-dipper'); sky.classList.add('ph-pole');
    say('북극성 찾기', step.pole || '국자 끝 두 별을 이은 선을 다섯 배쯤 늘이면 북극성이 있어요. 북극성을 찾아 눌러 보세요.', 1);
    await new Promise((res) => {
      const t0 = performance.now();
      const grow = (now) => { const t = Math.min(1, (now - t0) / 1600); st.setGuide(t); if (t < 1 && sky.isConnected) requestAnimationFrame(grow); };
      requestAnimationFrame(grow);
      let found = false;
      st.polaris.el.addEventListener('click', () => {
        if (found) return; found = true;
        sfx('grow'); st.polaris.el.classList.add('found'); st.setGuide(1);
        setTimeout(res, 800);
      });
      const miss = () => { if (!found) { sfx('tap'); nudge('선을 따라 더 멀리 가 보세요'); } };
      for (const d of st.decoys) d.el.addEventListener('click', miss);
      st.stars.forEach((s) => s.el.addEventListener('click', miss));
    });

    // 3) 지남철로 뱃머리 맞추기
    sky.classList.remove('ph-pole'); sky.classList.add('ph-helm');
    say('뱃머리 맞추기', step.helm || '지남철 바늘은 남북을 가리켜요. 붉은 끝이 북쪽이에요. 조선은 북동쪽. 뱃머리를 등불 표시에 맞추세요.', 2);
    await new Promise((res) => {
      let hd = HELM.start, done = false;
      const head = helm.dial.querySelector('.hd-heading');
      const show = () => {
        head.setAttribute('transform', `rotate(${hd})`);
        helm.read.textContent = '뱃머리: ' + (DIR_NAME[((hd % 360) + 360) % 360] || '') + '쪽';
        helm.wrap.classList.toggle('aligned', (((hd - HELM.target) % 360) + 360) % 360 === 0);
      };
      const turn = (d) => {
        if (done) return;
        hd += d; sfx('tap'); show();
        if ((((hd - HELM.target) % 360) + 360) % 360 === 0) {
          done = true; sfx('grow');
          helm.read.textContent = '뱃머리가 조선을 향했다';
          setTimeout(res, 900);
        }
      };
      helm.left.addEventListener('click', () => turn(-HELM.step));
      helm.right.addEventListener('click', () => turn(HELM.step));
      show();
      setTimeout(() => helm.right.isConnected && helm.right.focus({ preventScroll: true }), 60);
    });
    sky.classList.remove('ph-helm'); sky.classList.add('ph-done');
    plaque.innerHTML = '';
    plaque.append(h('strong', '뱃길을 잡았다'), h('span', '북극성을 왼쪽 앞에 두고, 배는 북동쪽으로 나아간다.'), prog(3));

    // 끝: 별하늘을 뒤에 두고 글 판에 옥영의 말
    el.classList.remove('starsplay');
    if (step.done && step.done.length) await G.steps.lines(step.done, ctx, step.next || '다음 ▶');
    else await G.steps.nextButton(ctx, step.next || '다음 ▶');
    cleanup();
  });

  // 시험용: 별 단계 상태
  G.sea = {
    HELM, DIPPER,
    test: {
      stars: () => {
        const s = document.querySelector('.sea-stars');
        if (!s) return null;
        return { phase: ['ph-dipper', 'ph-pole', 'ph-helm', 'ph-done'].find((c) => s.classList.contains(c)) || 'intro', lit: s.querySelectorAll('.star.dipper.lit').length };
      },
    },
  };
})();
