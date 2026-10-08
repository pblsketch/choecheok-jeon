'use strict';
// HUD: 화면 네 구석에 얹는 게임 정보.
//  - 왼쪽 위: 옥영의 작은 초상 + 연(緣)·생(生) 게이지(숫자 없이 막대와 출렁임, 선생님용에서만 숫자) + 지금 있는 곳
//  - 가운데 위: 한 문장 미션과 그 아래 '지금 할 일'(목표)
//  - 오른쪽 위: 이야기 수첩·지도·설정 아이콘(app이 hud.tools로 채운다)
//  - 사건 모드에서는 위쪽 얇은 게이지 띠(.gstrip)만 남는다.
//  신표·시구 조각은 얻는 순간 화면 가운데에 크게 알리고(hud.announce), 평소에는 이야기 수첩에서 본다(hud.pocketView).
//  값은 G.save.state의 yeon·saeng(0~10)·tokens·frags에 있다. 바꿀 때는 G.hud.change({ yeon:+1, saeng:-2 })처럼.
(function () {
  const { h } = G.util;
  const S = () => G.save.state;
  const hud = (G.hud = {});
  hud.MAX = 10;
  hud.FRAG_SLOTS = 4;
  // 게이지 종류(다른 파일이 이름·색을 바꿀 수 있다)
  hud.GAUGES = [
    { key: 'yeon', han: '緣', ko: '연', tip: '인연을 붙드는 힘' },
    { key: 'saeng', han: '生', ko: '생', tip: '살아갈 여력' },
  ];
  // HUD 초상: 옥영의 지금 모습에 맞는 초상 그림(G.util.pt — PEOPLE.okyoung의 looks·pt)이 있으면 그것, 없으면 UI용 작은 초상
  //  모습이 바뀌면(맵의 도트 옷차림·사건 화면의 거점 설정) hud.syncFace가 그림을 바꾼다(hud.refresh도 부른다)
  hud.FACE = 'assets/ui/hud_okyoung.webp';
  let els = null; // { panel, strip, mission, bars:{key:[el…]}, tokens, frags, goal, where, place, tools, stripTools }

  const ICON = {
    token: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M24 4v6"/><circle cx="24" cy="13" r="3"/><path d="M17 22c0-4 3-6 7-6s7 2 7 6-3 8-7 8-7-4-7-8z" fill="currentColor" fill-opacity=".18"/><path d="M24 30v3"/><path d="M19 33h10l-1.5 11h-7z" fill="currentColor" fill-opacity=".18"/><path d="M22 36v6M26 36v6"/></svg>',
    frag: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 6h24l4 5-3 4 3 5-3 5 3 5-3 5 3 4-4 3H10z" fill="currentColor" fill-opacity=".14"/><path d="M17 12v24M24 12v18M31 14v14"/></svg>',
  };
  hud.ICON = ICON;

  function gaugeEl(gd, small) {
    const fillEl = h('i.gfill');
    const num = h('span.gnum');
    const mark = h('span.gmark');
    const el = h('div.gauge.' + gd.key + (small ? '.small' : ''), { title: gd.ko + '(' + gd.han + ') — ' + gd.tip },
      h('span.glabel', h('b', gd.han), h('span', gd.ko)),
      h('span.gbar', fillEl, h('i.gshine')),
      num, mark);
    el._fill = fillEl; el._num = num; el._mark = mark;
    return el;
  }
  function faceSrc() { return G.util.pt('okyoung') || hud.FACE; }
  hud.syncFace = function () {
    const img = els && els.face && els.face.querySelector('img');
    if (!img) return;
    const src = faceSrc();
    if (img.getAttribute('src') !== src) img.setAttribute('src', src);
  };

  // HUD를 새로 만든다(app.explore가 부른다)
  //  els.panel(왼쪽 위 묶음) · els.mission(가운데 위) · els.tools(오른쪽 위) · els.strip(사건 모드 띠)
  hud.build = function () {
    const bars = {};
    const panelGauges = hud.GAUGES.map((gd) => { const e = gaugeEl(gd); (bars[gd.key] = bars[gd.key] || []).push(e); return e; });
    const stripGauges = hud.GAUGES.map((gd) => { const e = gaugeEl(gd, true); bars[gd.key].push(e); return e; });
    const place = h('div.pl-place');
    const where = h('div.pl-where');
    const goal = h('div.pl-goal.hide', h('span.k', '지금 할 일'), h('strong'));
    // 신표·시구 조각: 평소에는 숨겨 두고(이야기 수첩이 쓴다), 얻을 때 hud.announce로 크게 알린다
    const tokens = h('div.tokens');
    const frags = h('div.frags');
    const pocket = h('div.pocket', { hidden: true }, tokens, frags);
    const face = h('button.hud-face', { type: 'button', 'aria-label': '옥영 — 이야기 수첩 열기', title: '이야기 수첩', on: { click: () => { G.audio.tap(); G.app.openHook('notebook'); } } },
      h('img', { src: faceSrc(), alt: '' }));
    const panel = h('aside.panel.hud-tl', { 'aria-label': '옥영의 게이지' },
      face,
      h('div.hud-tl-body', h('div.pl-sec.gauges', panelGauges), h('div.pl-head', place, where)),
      pocket);
    const tools = h('div.pl-tools.hud-tr');
    const missionText = h('strong.mi-text');
    const mission = h('div.mission', { role: 'status' }, h('div.mi-line', h('i.mi-orn', { 'aria-hidden': 'true' }), missionText, h('i.mi-orn', { 'aria-hidden': 'true' })), goal);
    const stripMission = h('div.st-mission');
    const stripTools = h('div.st-tools');
    const strip = h('div.gstrip', h('div.st-gauges', stripGauges), stripMission, stripTools);
    els = { panel, strip, mission, missionText, stripMission, bars, tokens, frags, goal, where, place, tools, stripTools, face };
    hud.refresh(true);
    return els;
  };
  hud.els = () => els;

  // 숫자·막대를 지금 값에 맞춘다
  hud.refresh = function (instant) {
    if (!els) return;
    const st = S();
    const teacher = !!st.teacher;
    for (const gd of hud.GAUGES) {
      const v = G.util.clamp(Number(st[gd.key]) || 0, 0, hud.MAX);
      for (const e of els.bars[gd.key] || []) {
        if (instant) e._fill.style.transition = 'none';
        e._fill.style.width = (v / hud.MAX * 100) + '%';
        if (instant) { void e._fill.offsetWidth; e._fill.style.transition = ''; }
        e._num.textContent = teacher ? String(v) : '';
        e.classList.toggle('low', v <= 2);
        e.setAttribute('aria-label', gd.ko + ' 게이지' + (teacher ? ' ' + v : ''));
      }
    }
    fillPocket(els.tokens, els.frags);
    hud.syncFace();
    hud.mission();
  };
  function fillPocket(tokEl, fragEl) {
    const st = S();
    tokEl.innerHTML = '';
    const toks = st.tokens || [];
    if (!toks.length) tokEl.appendChild(h('span.empty', got('token').empty || ''));
    for (const t of toks) tokEl.appendChild(h('span.token', { title: (t && t.desc) || '' }, h('i', { html: ICON.token, 'aria-hidden': 'true' }), (t && (t.name || t.id)) || String(t)));
    fragEl.innerHTML = '';
    for (let n = 1; n <= hud.FRAG_SLOTS; n++) {
      const f = (st.frags || {})[n];
      if (!f) { fragEl.appendChild(h('span.frag', { title: fillN(got('frag').empty, n) }, h('span.fn', String(n)))); continue; }
      const l = hud.fragLine(n, f);
      fragEl.appendChild(h('span.frag.got', { title: l.원문 + (l.풀이 ? ' — ' + l.풀이 : '') }, h('span.fh', l.원문), l.풀이 ? h('span.fk', l.풀이) : null));
    }
  }
  // 얻은 것 알림 글(js/data/texts.js의 TEXTS.GOT)
  const got = (kind) => (((window.TEXTS || {}).GOT) || {})[kind] || {};
  const fillN = (tpl, n) => String(tpl || '').replace('{n}', String(n)).replace('{all}', String(hud.FRAG_SLOTS));
  hud.gotText = got;
  // 시구 조각 n행의 글: 정답 시(js/data/poem.js의 POEM.lines)의 원문과 풀이. 저장 칸에는 행 번호만 둔다
  //  (예전 저장에 글이 들어 있어도 행 번호로 다시 찾는다. 시 자료가 없을 때만 저장된 글을 그대로 쓴다)
  hud.fragLine = function (n, stored) {
    const l = (((window.POEM || {}).lines) || [])[Number(n) - 1];
    if (l && l.원문) return { n: Number(n), 원문: l.원문, 풀이: l.풀이 || '' };
    return { n: Number(n), 원문: typeof stored === 'string' ? stored : String(n), 풀이: '' };
  };
  // 크게 알리기: 신표 · 시구 조각(원문과 풀이를 함께)
  hud.announceToken = function (t) {
    const g = got('token');
    hud.announce({ kind: 'token', label: g.label || '', name: (t && (t.name || t.id)) || String(t), desc: (t && t.desc) || g.desc || '' });
  };
  hud.announceFrag = function (n, stored) {
    const g = got('frag');
    const l = hud.fragLine(n, stored);
    hud.announce({ kind: 'frag', label: fillN(g.label, l.n), name: l.원문, desc: [l.풀이, g.desc].filter(Boolean).join('\n') });
  };
  // 이야기 수첩 등에서 쓸 '챙긴 신표·얻은 시구 조각' 묶음(새로 만든 요소)
  hud.pocketView = function () {
    const t = h('div.tokens'), f = h('div.frags');
    fillPocket(t, f);
    return h('div.pocket-view', h('div.pv-h', got('token').head || ''), t, h('div.pv-h', got('frag').head || ''), f);
  };

  // 게이지 바꾸기: 값을 고치고 저장한 뒤 막대가 출렁이게 한다. 바뀐 만큼을 돌려준다
  hud.change = function (delta) {
    const st = S();
    const out = {};
    for (const gd of hud.GAUGES) {
      const d = Number(delta && delta[gd.key]) || 0;
      if (!d) continue;
      const before = G.util.clamp(Number(st[gd.key]) || 0, 0, hud.MAX);
      const after = G.util.clamp(before + d, 0, hud.MAX);
      st[gd.key] = after;
      out[gd.key] = after - before;
    }
    G.save.write();
    hud.refresh();
    for (const k in out) hud.wave(k, out[k], delta[k]);
    const sum = Object.values(delta || {}).reduce((a, b) => a + (Number(b) || 0), 0);
    if (sum > 0) G.audio.grow(); else if (sum < 0) G.audio.drop();
    return out;
  };
  // 출렁임: 막대가 흔들리고 ▲/▼ 표시가 잠깐 떴다 사라진다(선생님용이면 +2 같은 숫자)
  hud.wave = function (key, real, asked) {
    if (!els) return;
    const d = asked || real;
    const teacher = S().teacher;
    for (const e of els.bars[key] || []) {
      e.classList.remove('wave', 'up', 'down'); void e.offsetWidth;
      e.classList.add('wave', d > 0 ? 'up' : 'down');
      e._mark.textContent = teacher ? (d > 0 ? '+' : '') + d : (d > 0 ? '▲' : '▼').repeat(Math.min(3, Math.abs(d)));
      clearTimeout(e._t);
      e._t = setTimeout(() => { e.classList.remove('wave', 'up', 'down'); e._mark.textContent = ''; }, 1600);
    }
  };

  // ───────── 얻은 것 알림: 화면 가운데에 크게(차례로, 저절로 사라진다. 누르는 것을 막지 않는다) ─────────
  //  hud.announce({ kind:'token'|'frag', label:'신표를 챙겼다', name:'…', desc:'…' })
  const queue = [];
  let showing = false;
  hud.announce = function (o) {
    queue.push(o);
    if (!showing) next();
  };
  function next() {
    const o = queue.shift();
    if (!o) { showing = false; return; }
    showing = true;
    const el = h('div.gettoast.' + (o.kind || 'token'), { role: 'status', 'aria-live': 'polite' },
      h('div.gt-card',
        h('div.gt-ic', { html: ICON[o.kind] || ICON.token, 'aria-hidden': 'true' }),
        h('div.gt-body',
          h('small', o.label || ''),
          h('strong', G.util.T(o.name || '')),
          o.desc ? h('p', G.util.boldNodes(o.desc)) : null)));
    document.body.appendChild(el);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => { el.remove(); next(); }, 420); }, o.ms || 2600);
  }

  // 신표 챙기기: { id, name, desc } 또는 '이름'
  hud.addToken = function (t) {
    const st = S();
    const tok = typeof t === 'string' ? { id: t, name: t } : t;
    st.tokens = st.tokens || [];
    const had = st.tokens.some((x) => (x.id || x) === tok.id);
    if (!had) st.tokens.push(tok);
    G.save.write(); hud.refresh();
    if (!had) hud.announceToken(tok);
  };
  hud.removeToken = function (id) {
    const st = S();
    st.tokens = (st.tokens || []).filter((x) => (x.id || x) !== id);
    G.save.write(); hud.refresh();
  };
  // 시구 조각 칸 n(1~4) 채우기(on이 null·false면 비우기). 저장 칸에는 행 번호를 둔다: frags = { 1:1, 2:2 }
  hud.setFrag = function (n, on) {
    const st = S();
    st.frags = st.frags || {};
    const had = !!st.frags[n];
    if (on == null || on === false) delete st.frags[n]; else st.frags[n] = Number(n);
    G.save.write(); hud.refresh();
    if (!had && st.frags[n]) hud.announceFrag(n);
  };

  // 지금 할 일(목표)·맵 이름·거점 이름
  hud.goal = function (text) {
    if (!els) return;
    els.goal.querySelector('strong').textContent = text || '';
    els.goal.classList.toggle('hide', !text);
  };
  hud.where = function (name) { if (els) els.where.textContent = name || ''; };
  hud.setPlace = function (info) {
    hud.info = info || {};
    hud._mission = null;
    if (!els) return;
    els.place.innerHTML = '';
    const act = info && info.actName;
    G.util.append(els.place, [act ? h('small', act) : null, h('strong', (info && info.name) || '')]);
    hud.mission();
  };
  // 한 문장 미션(탐색 화면 가운데 위와 사건 화면 띠에 늘 보인다)
  hud.mission = function (text) {
    if (text !== undefined) hud._mission = text;
    if (!els) return;
    const t = hud._mission != null ? hud._mission : (hud.info && hud.info.mission) || '';
    els.missionText.textContent = t;
    els.mission.classList.toggle('hide', !t);
    els.stripMission.textContent = t;
  };
  // 오른쪽 위 아이콘들과 사건 띠의 단추들(app이 채운다)
  hud.tools = function (buttons, stripButtons) {
    if (!els) return;
    els.tools.innerHTML = ''; G.util.append(els.tools, buttons || []);
    els.stripTools.innerHTML = ''; G.util.append(els.stripTools, stripButtons || []);
  };
})();
