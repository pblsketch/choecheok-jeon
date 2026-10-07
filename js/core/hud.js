'use strict';
// 게이지 패널: 탐색 모드의 오른쪽 1/3(연·생 게이지, 챙긴 신표, 얻은 시구 조각, 지금 할 일)과
//  사건 모드의 위쪽 얇은 게이지 띠. 게이지는 숫자 없이 막대와 출렁임으로만 보이고, 선생님용에서만 숫자가 붙는다.
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
  let els = null; // { panel, strip, mission, bars:{key:[el…]}, tokens, frags, goal, where, place }

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

  // 패널과 띠를 새로 만든다(app.explore가 부른다)
  hud.build = function () {
    const bars = {};
    const panelGauges = hud.GAUGES.map((gd) => { const e = gaugeEl(gd); (bars[gd.key] = bars[gd.key] || []).push(e); return e; });
    const stripGauges = hud.GAUGES.map((gd) => { const e = gaugeEl(gd, true); bars[gd.key].push(e); return e; });
    const place = h('div.pl-place');
    const where = h('div.pl-where');
    const goal = h('div.pl-goal.hide', h('span.k', '지금 할 일'), h('strong'));
    const tokens = h('div.tokens');
    const frags = h('div.frags');
    const tools = h('div.pl-tools');
    const panel = h('aside.panel', { 'aria-label': '게이지와 모은 것' },
      h('div.pl-head', place, where),
      goal,
      h('div.pl-sec.gauges', panelGauges),
      h('div.pl-sec', h('div.pl-h', '챙긴 신표'), tokens),
      h('div.pl-sec', h('div.pl-h', '얻은 시구 조각'), frags),
      tools);
    const stripMission = h('div.st-mission');
    const stripTools = h('div.st-tools');
    const strip = h('div.gstrip', h('div.st-gauges', stripGauges), stripMission, stripTools);
    const mission = h('div.mission');
    els = { panel, strip, mission, stripMission, bars, tokens, frags, goal, where, place, tools, stripTools };
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
    // 챙긴 신표
    els.tokens.innerHTML = '';
    const toks = st.tokens || [];
    if (!toks.length) els.tokens.appendChild(h('span.empty', '아직 없음'));
    for (const t of toks) els.tokens.appendChild(h('span.token', { title: (t && t.desc) || '' }, (t && (t.name || t.id)) || String(t)));
    // 시구 조각 칸 1~4
    els.frags.innerHTML = '';
    for (let n = 1; n <= hud.FRAG_SLOTS; n++) {
      const f = (st.frags || {})[n];
      els.frags.appendChild(h('span.frag' + (f ? '.got' : ''), { title: f ? String(f) : n + '번째 조각 — 아직 없음' }, f ? String(f) : h('span.fn', String(n))));
    }
    hud.mission();
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

  // 신표 챙기기: { id, name, desc } 또는 '이름'
  hud.addToken = function (t) {
    const st = S();
    const tok = typeof t === 'string' ? { id: t, name: t } : t;
    st.tokens = st.tokens || [];
    if (!st.tokens.some((x) => (x.id || x) === tok.id)) st.tokens.push(tok);
    G.save.write(); hud.refresh();
    if (els) { const last = els.tokens.lastChild; if (last) { last.classList.add('new'); } }
  };
  hud.removeToken = function (id) {
    const st = S();
    st.tokens = (st.tokens || []).filter((x) => (x.id || x) !== id);
    G.save.write(); hud.refresh();
  };
  // 시구 조각 칸 n(1~4)에 글 넣기(null이면 비우기)
  hud.setFrag = function (n, text) {
    const st = S();
    st.frags = st.frags || {};
    if (text == null) delete st.frags[n]; else st.frags[n] = text;
    G.save.write(); hud.refresh();
    if (els && text != null) { const el = els.frags.children[n - 1]; if (el) el.classList.add('new'); }
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
  // 한 문장 미션(맵 위와 사건 화면 띠에 늘 보인다)
  hud.mission = function (text) {
    if (text !== undefined) hud._mission = text;
    if (!els) return;
    const t = hud._mission != null ? hud._mission : (hud.info && hud.info.mission) || '';
    els.mission.textContent = t;
    els.mission.classList.toggle('hide', !t);
    els.stripMission.textContent = t;
  };
  // 패널 아래 단추들(app이 채운다)
  hud.tools = function (buttons, stripButtons) {
    if (!els) return;
    els.tools.innerHTML = ''; G.util.append(els.tools, buttons || []);
    els.stripTools.innerHTML = ''; G.util.append(els.stripTools, stripButtons || []);
  };
})();
