'use strict';
// 끝부분 화면(spec §4-8·§6-5·§7-1·§7-2·§8)
//  단계 종류: act1End(1차시 끝 + 이어 하기 글자) · origEnding(내 결말과 원작 결말 나란히) · kimyc(「김영철전」 함께 읽기, 채점 없음)
//            · result(결과 화면으로)
//  걸이: G.app.hooks.codeEntry(이어 하기 글자 넣기) · G.app.hooks.finish(이야기의 끝: 원작 결말 → 김영철전 → 결과 화면)
//  - 거점 파일이 이 단계들을 적지 않아도 흐름이 끊기지 않게 한다:
//      1막 마지막 거점(안남)을 떠날 때 1막 끝 표시가 없으면 1차시 끝 화면을 띄우고,
//      마지막 거점을 마치면(이야기의 끝) 아직 보지 않은 원작 결말·김영철전을 차례로 펼친 뒤 결과 화면을 연다.
//  - 결과 화면은 한 장의 한지 종이. 그래프는 같은 그리기 함수로 화면(SVG)과 저장 그림(캔버스)에 똑같이 그린다(그림 파일을 쓰지 않아 file://에서도 저장된다).
//  글: js/data/notes.js(NOTES.result·act1End·codeEntry·endings·dilemmas·traps·debrief) · original.js(ORIGINAL) · kimyc.js(KIMYC)
(function () {
  const { h, T, boldNodes } = G.util;
  const ui = G.ui;
  const app = G.app;
  const S = () => G.save.state;
  const N = () => window.NOTES || {};
  const RU = () => ((window.TEXTS || {}).RULES) || {};
  const OR = () => window.ORIGINAL || {};
  const KY = () => window.KIMYC || {};
  const E = (G.endgame = {});
  const save = () => G.save.write();
  // 저장 칸: 1차시 끝 글자(수첩에서 다시 본다), 김영철전에서 고른 것
  G.save.extend({ resumeCode: '', kimyc: [] });

  const COLORS = { yeon: '#d4633a', saeng: '#0f8f7e', orig: '#7a4a9c', ink: '#2b2433', ink2: '#574c5e', ink3: '#8a7e86', seal: '#b3342a', hanji: '#f4ead3', line: '#2f2840', ochre: '#b98a45', warn: '#a4611b' };
  const GAUGE = {
    yeon: { han: '緣', ko: '연', tip: '인연을 붙드는 힘', color: COLORS.yeon },
    saeng: { han: '生', ko: '생', tip: '살아갈 여력', color: COLORS.saeng },
  };

  // ───────── 공통 ─────────
  // 삽화 자리: 그림이 없으면 빈 종이 판에 그림 설명(거점 파일 밖에서 정한 그림 id도)
  function scene(ctx, id, scenes) {
    if (!ctx || !ctx.setScene) return;
    ctx.setScene(id || null);
    const art = ctx.el && ctx.el.querySelector('.ev-art');
    const bp = art && art.querySelector('.blank-paper');
    const cap = id && scenes && scenes[id] && scenes[id].caption;
    if (bp && cap && !bp.querySelector('.cap')) bp.appendChild(h('span.cap', cap));
  }
  const markStepDone = (placeId, stepId) => {
    const st = S();
    if (!placeId || !stepId) return;
    const k = app.key.step(placeId, stepId);
    st.done[k] = true;
    delete st.snap[k];
  };
  // 결말 이름과 한 줄(거점 파일 namwon_final의 endings가 먼저)
  E.endingInfo = function (id) {
    const P = (window.PLACES || {}).namwon_final;
    const pe = (P && P.endings && P.endings[id]) || {};
    const ne = (N().endings || {})[id] || {};
    return { id, name: T(pe.name || pe.title || ne.name || id || ''), line: T(pe.line || pe.summary || ne.line || '') };
  };
  function gaugeMini(st) {
    return h('div.oe-gauges', ['yeon', 'saeng'].map((k) => {
      const v = G.util.clamp(Number(st[k]) || 0, 0, 10);
      return h('div.oe-g.' + k, h('span.oe-seal', GAUGE[k].han), h('span.oe-bar', h('i', { style: { width: v * 10 + '%' } })), st.teacher ? h('span.oe-num', String(v)) : null);
    }));
  }
  const chip = (k) => G.steps.mark(k);
  function quoteBox(q) { return G.steps.quote(q); }

  // ═════════ 1차시 끝 ═════════
  //  { id, type:'act1End', scene? } — 안남의 마지막 단계. 1막 기록을 남기고 이어 하기 글자를 크게 보여 준다
  E.act1EndView = async function (ctx, o = {}) {
    const st = S();
    const R0 = RU();
    const act1 = R0.act1 || [];
    const placeId = o.placeId || (act1.includes(st.place) ? st.place : act1[act1.length - 1]);
    G.rules.finishAct1(placeId);
    const code = G.code.encode(st);
    st.resumeCode = code;
    // 타이틀로 나갔다가 '이어 하기'를 누르면 막간부터
    for (const p of act1) st.done[app.key.place(p)] = true;
    markStepDone(o.placeId, o.stepId);
    save();
    const A = N().act1End || {};
    if (ctx.el) ctx.el.classList.add('cardmode', 'endcard', 'a1mode');
    scene(ctx, o.scene || 'sc_act1_end', { sc_act1_end: { caption: '새벽 안남 포구, 나란히 선 두 척의 배' } });
    ctx.main.innerHTML = '';
    const pretty = G.code.pretty(code);
    ctx.main.appendChild(h('div.act1end', { 'data-code': code },
      h('div.pc-act', A.kicker || ''),
      h('h2.a1-title', A.title || '1차시는 여기까지'),
      h('div.a1-lines', (A.lines || []).map((l) => h('p', boldNodes(l)))),
      h('div.a1-code',
        h('div.a1-k', A.codeLabel || '이어 하기 글자'),
        h('div.a1-chars', { 'aria-label': (A.codeLabel || '') + ' ' + pretty },
          [...pretty].map((c) => (c === '-' ? h('span.a1-dash', { 'aria-hidden': 'true' }) : h('span.a1-ch', c)))),
        h('div.a1-write', h('i', { 'aria-hidden': 'true' }, '✎'), A.write || '받아 적어 두세요')),
      h('p.a1-how', boldNodes(A.how || ''))));
    G.audio.page();
    const go = await new Promise((res) => {
      ctx.tray(h('div.actions',
        G.steps.actionBtn(A.toTitle || '타이틀로', 'dark', () => res('title')),
        G.steps.actionBtn(A.go || '막간으로 이어 가기 ▶', 'primary', () => res('go'))));
    });
    ctx.tray(null);
    if (ctx.el) ctx.el.classList.remove('endcard', 'a1mode');
    return go;
  };
  G.steps.register('act1End', async function (step, ctx) {
    const go = await E.act1EndView(ctx, { placeId: ctx.placeId, stepId: step.id, scene: step.scene });
    if (go === 'title') { app.title(); return new Promise(() => {}); } // 거점 진행은 여기서 멈춘다
  });
  // 안남에 1차시 끝 단계가 없을 때: 안남을 떠나는 순간 1차시 끝 화면을 띄운다
  const next0 = app.next;
  app.next = async function (placeId) {
    const st = S();
    const act1 = RU().act1 || [];
    if (placeId && placeId === act1[act1.length - 1] && !st.act1Done && !st.act2Only) {
      const token = app._playToken;
      const ctx = app.openEvent({});
      const go = await E.act1EndView(ctx, { placeId });
      ctx.close();
      if (app._playToken !== token) return;
      if (go === 'title') return app.title();
    }
    return next0.apply(this, arguments);
  };

  // ═════════ 이어 하기 글자 넣기 ═════════
  E.codeEntry = function () {
    const C = N().codeEntry || {};
    return new Promise((resolve) => {
      const input = h('input.code-input', { type: 'text', inputmode: 'text', autocomplete: 'off', autocapitalize: 'characters', autocorrect: 'off', spellcheck: 'false', maxlength: 14, placeholder: C.placeholder || '', 'aria-label': C.title || '이어 하기 글자' });
      const field = h('div.code-field', input);
      const err = h('p.code-err', { role: 'alert', 'aria-live': 'assertive' });
      const back = h('div.sheet-back');
      const goBtn = h('button.btn.primary', { type: 'button' }, C.go || '이어 가기');
      const noBtn = h('button.btn', { type: 'button' }, C.cancel || '그만두기');
      const box = h('div.sheet.code-sheet', { role: 'dialog', 'aria-modal': 'true', 'aria-label': C.title || '' },
        h('h3', C.title || '이어 하기 글자 넣기'),
        h('p.code-lead', boldNodes(C.lead || '')),
        field, err,
        h('div.actions', noBtn, goBtn));
      back.appendChild(box);
      document.body.appendChild(back);
      setTimeout(() => input.focus({ preventScroll: true }), 60);
      const onKey = (e) => {
        if (!back.isConnected) return;
        if (e.key === 'Escape') { e.preventDefault(); close(); resolve(false); }
        else if (e.key === 'Enter') { e.preventDefault(); submit(); }
      };
      document.addEventListener('keydown', onKey);
      function close() { document.removeEventListener('keydown', onKey); back.remove(); }
      input.addEventListener('input', () => {
        const p = input.selectionStart;
        input.value = input.value.toUpperCase();
        try { input.setSelectionRange(p, p); } catch (e) { /* 무시 */ }
        err.textContent = ''; field.classList.remove('bad');
      });
      back.addEventListener('click', (e) => { if (e.target === back) { close(); resolve(false); } });
      noBtn.addEventListener('click', () => { G.audio.tap(); close(); resolve(false); });
      goBtn.addEventListener('click', () => { G.audio.tap(); submit(); });
      async function submit() {
        const s = input.value;
        const p = G.code.parse(s);
        const d = p.error ? p : G.code.decode(s);
        if (d.error) {
          err.textContent = d.error;
          field.classList.add('bad'); ui.shake(field);
          if (G.audio.no) G.audio.no();
          input.focus();
          return;
        }
        close();
        if (G.save.started()) {
          const ok = await ui.sheet([h('h3', C.overwriteTitle || ''), h('p', C.overwrite || '')],
            [{ label: C.cancel || '그만두기', value: false }, { label: C.overwriteGo || '글자로 이어 가기', value: true, cls: 'primary' }], { cls: 'overwrite-sheet' });
          if (!ok) { resolve(false); return; }
        }
        const r = G.code.restore(s);
        if (!r || r.error) { ui.toast((r && r.error) || '글자를 다시 확인해 주세요'); resolve(false); return; }
        S().resumeCode = G.code.normalize(s);
        save();
        ui.toast(C.done || '1막 끝에서 이어 가요');
        resolve(true);
        app.continue();
      }
    });
  };
  app.hooks.codeEntry = () => E.codeEntry();

  // ═════════ 원작의 결말 ═════════
  //  { id, type:'origEnding' } — 내 결말과 원작 결말을 나란히
  E.origEndingView = async function (ctx) {
    const st = S();
    if (!st.ending) G.rules.decideEnding();
    const O = OR();
    const deep = st.mode === 'deep';
    const me = E.endingInfo(st.ending);
    scene(ctx, O.scene, O.scenes);
    if (ctx.el) ctx.el.classList.add('cardmode', 'rcardmode', 'endcard', 'oemode');
    ctx.main.innerHTML = '';
    ctx.main.appendChild(h('div.orig-end',
      h('div.oe-head', h('span.pc-act', O.kicker || ''), h('h2', '나의 결말과 원작의 결말')),
      h('div.oe-pair',
        h('div.card.rcard.note.oe-mine',
          h('span.kind', '나의 결말'),
          h('h3.oe-name', me.name),
          me.line ? h('p', boldNodes(me.line)) : null,
          h('p.oe-k', '남원에 닿았을 때'),
          gaugeMini(st),
          h('p.oe-foot', chip('게임 설정'), '재회는 어느 길에서나 일어나요. 두 게이지가 그 빛깔만 바꿔요.')),
        h('div.card.rcard.orig.oe-orig',
          h('span.seal-mark.corner', '原作'),
          h('span.kind', O.title || '원작의 결말'),
          h('p.rc-sum', boldNodes(O.summary || '')),
          quoteBox((deep && O.quoteLong) || O.quote),
          !deep && O.extraGloss ? h('div.rc-note', chip('풀이'), h('p', boldNodes(O.extraGloss))) : null,
          O.variant ? h('div.rc-note', chip('이본 노트'), h('p', boldNodes(O.variant))) : null,
          deep && O.afterword ? h('div.rc-note', chip('원문'), h('p', h('span.han', O.afterword.원문), h('br'), boldNodes(O.afterword.풀이 + ' ' + (O.afterword.note || '')))) : null,
          O.who ? h('p.small.muted', boldNodes(O.who)) : null,
          O.src ? h('p.src', O.src) : null))));
    if (ctx.main.parentNode) ctx.main.parentNode.scrollTop = 0;
    G.audio.page();
    st.flags.seenOrigEnding = true;
    save();
    await G.steps.nextButton(ctx, '다음 ▶');
    if (ctx.el) ctx.el.classList.remove('rcardmode', 'endcard', 'oemode');
  };
  G.steps.register('origEnding', async (step, ctx) => E.origEndingView(ctx));

  // ═════════ 「김영철전」 함께 읽기 ═════════
  //  { id, type:'kimyc' } — 대목 읽기 → "게임에서 본 무엇이 여기에도 있는가"(채점 없음) → (깊이 읽기) 물음 하나 더
  E.kimycView = async function (ctx) {
    const st = S();
    const K = KY();
    const deep = st.mode === 'deep';
    scene(ctx, K.scene, K.scenes);
    const page = async (el, label) => {
      if (ctx.el) ctx.el.classList.add('cardmode', 'rcardmode', 'endcard', 'kymode');
      ctx.main.innerHTML = '';
      ctx.main.appendChild(el);
      if (ctx.main.parentNode) ctx.main.parentNode.scrollTop = 0;
      G.audio.page();
      await G.steps.nextButton(ctx, label || '다음 ▶');
    };
    // 1) 대목
    await page(h('div.card.rcard.kimyc.ky-read', { 'data-page': 'read' },
      h('span.kind', K.title || '「김영철전」 함께 읽기'),
      h('h3', T(K.work || ''), h('span.ky-pt', ' — ' + (K.passageTitle || ''))),
      h('div.ky-intro', (K.intro || []).map((l) => h('p', boldNodes(l)))),
      K.context ? h('p.ky-ctx', boldNodes(K.context)) : null,
      quoteBox(K.passage),
      (K.words || []).length ? h('p.ky-words', K.words.map((w) => h('span', h('b', w.w), ' ' + w.d))) : null,
      K.src ? h('p.src', K.src) : null));
    // 2) 찾기(채점 없음)
    const A = K.activity || {};
    const picked = new Set(st.kimyc || []);
    const grid = h('div.ky-items');
    for (const it of A.items || []) {
      const b = h('button.ky-item' + (picked.has(it.id) ? '.on' : ''), { type: 'button', 'aria-pressed': picked.has(it.id) ? 'true' : 'false', 'data-id': it.id },
        h('span.ky-check', { 'aria-hidden': 'true' }),
        h('span.ky-t', T(it.title)),
        h('span.ky-more', h('span.ky-here', h('b', '여기에서 '), T(it.here)), h('span.ky-game', h('b', '게임에서 '), T(it.game))));
      b.addEventListener('click', () => {
        G.audio.pick();
        if (picked.has(it.id)) picked.delete(it.id); else picked.add(it.id);
        b.classList.toggle('on', picked.has(it.id));
        b.setAttribute('aria-pressed', picked.has(it.id) ? 'true' : 'false');
        st.kimyc = [...picked]; save();
      });
      grid.appendChild(b);
    }
    await page(h('div.card.rcard.kimyc.ky-find', { 'data-page': 'find' },
      h('span.kind', h('span', K.title || ''), ' ', chip('해석')),
      h('h3', T(A.q || '')),
      h('p.ky-hint', boldNodes(A.hint || '')),
      grid,
      A.talk ? h('p.ky-talk', h('b', '짝과 나누기 '), boldNodes(A.talk)) : null), deep ? '다음 ▶' : '결과 보기 ▶');
    st.kimyc = [...picked];
    // 3) 깊이 읽기: 물음 하나 더
    if (deep && K.deep) {
      const D = K.deep;
      await page(h('div.card.rcard.kimyc.ky-deep', { 'data-page': 'deep' },
        h('span.kind', h('span', D.title || '하나 더 생각해 보기'), ' ', h('span.ky-tag', '깊이 읽기')),
        h('p', boldNodes(D.lead || '')),
        quoteBox(D.quote),
        h('div.rc-note', chip('해석'), h('p.ky-ask', boldNodes(D.ask || ''))),
        D.src ? h('p.src', D.src) : null), '결과 보기 ▶');
    }
    st.flags.seenKimyc = true;
    save();
    if (ctx.el) ctx.el.classList.remove('rcardmode', 'endcard', 'kymode');
  };
  G.steps.register('kimyc', async (step, ctx) => E.kimycView(ctx));

  // ═════════ 이야기의 끝 → 결과 화면 ═════════
  // 마지막 기록: 남원 재회 구간을 남기고 결말을 정한다
  E.finalize = function (placeId) {
    const st = S();
    const order = app.order();
    const last = order[order.length - 1];
    if ((placeId || st.place) === last && (RU().trail || []).some((t) => t.place === last)) G.rules.leavePlace(last);
    if (!st.ending) G.rules.decideEnding();
    if (!st.finishedAt) st.finishedAt = Date.now();
    save();
  };
  G.steps.register('result', async function (step, ctx) {
    const st = S();
    E.finalize(ctx.placeId);
    markStepDone(ctx.placeId, step.id);
    if (ctx.placeId) st.done[app.key.place(ctx.placeId)] = true;
    save();
    E.showResult();
    return new Promise(() => {}); // 결과 화면이 화면을 맡는다(거점 진행은 여기서 멈춘다)
  });
  // 끝 걸이: 아직 안 본 원작 결말·김영철전을 차례로 펼친 뒤 결과 화면
  app.hooks.finish = async function () {
    const st = S();
    E.finalize();
    const token = app._playToken;
    for (const [flag, fn] of [['seenOrigEnding', E.origEndingView], ['seenKimyc', E.kimycView]]) {
      if (st.flags[flag]) continue;
      const ctx = app.openEvent({});
      await fn(ctx);
      ctx.close();
      if (app._playToken !== token) return;
    }
    E.showResult();
  };

  // ═════════ 결과 화면 자료 ═════════
  const stepByDilemma = (id) => {
    const P = window.PLACES || {};
    for (const k in P) { const p = P[k]; const s = p && (p.steps || []).find((x) => x && x.type === 'dilemma' && x.dilemma === id); if (s) return s; }
    return null;
  };
  E.data = function (st) {
    st = st || S();
    const R0 = RU();
    const NR = N().result || {};
    const act1 = R0.act1 || [];
    // 그래프: 출발 + 거점들(떠날 때)
    const pts = [{ place: 'start', label: R0.startLabel || '출발' }].concat((R0.trail || []).map((t) => ({ place: t.place, label: t.label })));
    const mineAt = (p) => (st.trail || []).find((t) => t.place === p) || null;
    let origRun = null;
    try { origRun = G.rules.originalRun(); } catch (e) { origRun = { trail: [] }; }
    const origAt = (p) => (origRun.trail || []).find((t) => t.place === p) || null;
    const noAct1 = !!st.act2Only || (st.trail || []).some((t) => t.none);
    const ser = (fn, k) => pts.map((p) => { const t = fn(p.place); return t && !t.none && t[k] != null ? Number(t[k]) : null; });
    const graph = {
      labels: pts.map((p) => p.label),
      places: pts.map((p) => p.place),
      mine: { yeon: ser(mineAt, 'yeon'), saeng: ser(mineAt, 'saeng') },
      orig: { yeon: ser(origAt, 'yeon'), saeng: ser(origAt, 'saeng') },
      invented: pts.map((p) => { const t = origAt(p.place); return !!(t && t.invented); }),
      noAct1, noAct1Label: NR.noAct1 || R0.noAct1 || '1막 기록 없음',
      act1Span: pts.reduce((a, p, i) => (p.place === 'start' || act1.includes(p.place) ? i : a), 0),
    };
    // 선택 비교표
    const rows = (N().dilemmas || []).map((d) => {
      const step = stepByDilemma(d.id);
      const label = (id) => { if (!id) return ''; const o = step && (step.options || []).find((x) => x.id === id); return T((o && (o.label || o.t)) || (d.opts || {})[id] || id); };
      const myId = (st.choices || {})[d.id] || null;
      const orig = step ? (step.orig ?? null) : d.orig ?? null;
      const nearest = step ? step.origNearest || null : d.nearest || null;
      let mine = myId ? label(myId) : (noAct1 && d.act === 1 ? graph.noAct1Label : '—');
      const origText = orig != null ? label(orig) : nearest ? (d.origNote || (N().notInOriginal || '원작에 없는 장면') + ' — 원작에 가까운 쪽: ' + label(nearest)) : (N().notInOriginal || '원작에 없는 장면');
      return { id: d.id, place: d.place, placeName: app.placeInfo(d.place).name, name: d.name, mine, mineId: myId, orig: origText, origId: orig, invented: orig == null, same: orig != null && myId === orig, differ: orig != null && !!myId && myId !== orig };
    });
    const pz = st.puzzle || {};
    const traps = ['A', 'B', 'C'].filter((k) => k !== 'C' || st.mode === 'deep' || (pz.traps || []).includes('C'))
      .map((k) => ({ id: k, name: ((N().traps || {})[k] || {}).name || k, desc: ((N().traps || {})[k] || {}).desc || '', placed: (pz.traps || []).includes(k) }));
    const M = (window.FLOW || {}).modes || {};
    return {
      name: st.name || '',
      mode: st.mode, modeName: (M[st.mode] || {}).name || '', modeWho: (M[st.mode] || {}).who || '',
      date: new Date(st.finishedAt || Date.now()).toLocaleDateString('ko-KR'),
      ending: E.endingInfo(st.ending || G.rules.ending(st)),
      origLine: OR().line || '',
      jangyuk: G.rules.countLabel(Number(st.jangyuk) || 0),
      graph, rows,
      puzzle: { none: noAct1, traps, fixes: G.rules.countLabel('fixes', st), groped: G.rules.countLabel('groped', st) },
    };
  };

  // ═════════ 그래프: 그리기 함수 하나로 SVG와 캔버스에 ═════════
  //  pen: { line(pts, o), rect(x,y,w,h,o), circle(x,y,r,o), diamond(x,y,r,o), text(x,y,s,o) } — 좌표는 차트 안쪽 기준
  const CW = 560, CH = 250;
  function plot(pen, D, key) {
    const gm = GAUGE[key];
    const n = D.labels.length;
    const L = 30, Rt = 84, Tp = 44, B = 34;
    const pw = CW - L - Rt, ph = CH - Tp - B;
    const X = (i) => L + (pw * i) / Math.max(1, n - 1);
    const Y = (v) => Tp + ph * (1 - v / 10);
    // 제목: 낙관 + 이름
    pen.circle(14, 16, 13, { fill: gm.color, stroke: COLORS.line, width: 1.5 });
    pen.text(14, 17, gm.han, { size: 14, color: '#fff8ea', align: 'center', weight: 700 });
    pen.text(34, 17, gm.ko + '(' + gm.han + ') — ' + gm.tip, { size: 15, color: COLORS.ink, weight: 700 });
    // 1막 기록 없음
    if (D.noAct1) {
      const x0 = X(0) - 10, x1 = X(D.act1Span) + 10;
      pen.rect(x0, Tp - 6, x1 - x0, ph + 12, { fill: 'rgba(47,40,64,.07)', stroke: 'rgba(47,40,64,.22)', width: 1, dash: [4, 4], rx: 8 });
      pen.rect((x0 + x1) / 2 - 52, Tp + ph - 30, 104, 22, { fill: 'rgba(251,246,234,.92)', rx: 11 });
      pen.text((x0 + x1) / 2, Tp + ph - 19, D.noAct1Label, { size: 12, color: COLORS.ink2, align: 'center', weight: 700 });
    }
    // 눈금(0·5·10)과 결말 기준선
    for (const v of [0, 5, 10]) {
      pen.line([[L, Y(v)], [L + pw, Y(v)]], { color: 'rgba(47,40,64,.16)', width: 1 });
      pen.text(L - 8, Y(v), String(v), { size: 11, color: COLORS.ink3, align: 'right' });
    }
    const high = RU().high ?? 6;
    pen.line([[L, Y(high)], [L + pw, Y(high)]], { color: 'rgba(201,120,31,.6)', width: 1.2, dash: [2, 4] });
    pen.text(L + pw, Y(high) - 8, '결말 기준 ' + high, { size: 10, color: COLORS.warn, align: 'right' });
    // 거점 이름
    D.labels.forEach((t, i) => pen.text(X(i), CH - B + 20, t, { size: 12, color: COLORS.ink2, align: 'center' }));
    // 원작 궤적(보라, 원작에 없는 장면 구간은 점선)
    const o = D.orig[key], m = D.mine[key];
    for (let i = 1; i < n; i++) {
      if (o[i - 1] == null || o[i] == null) continue;
      pen.line([[X(i - 1), Y(o[i - 1])], [X(i), Y(o[i])]], { color: COLORS.orig, width: 2, dash: D.invented[i] ? [6, 5] : null });
    }
    // 나의 궤적
    for (let i = 1; i < n; i++) {
      if (m[i - 1] == null || m[i] == null) continue;
      pen.line([[X(i - 1), Y(m[i - 1])], [X(i), Y(m[i])]], { color: gm.color, width: 3.2 });
    }
    o.forEach((v, i) => { if (v != null) pen.diamond(X(i), Y(v), 5, { fill: '#fbf6ea', stroke: COLORS.orig, width: 2, tip: D.labels[i] + ' — 원작의 옥영 ' + gm.ko + ' ' + v }); });
    m.forEach((v, i) => { if (v != null) pen.circle(X(i), Y(v), 5, { fill: gm.color, stroke: '#fbf6ea', width: 2, tip: D.labels[i] + ' — 나 ' + gm.ko + ' ' + v }); });
    // 끝 이름표(나 / 원작 + 해석)
    const lastOf = (arr) => { for (let i = arr.length - 1; i >= 0; i--) if (arr[i] != null) return i; return -1; };
    const lm = lastOf(m), lo = lastOf(o);
    let ym = lm >= 0 ? Y(m[lm]) : null, yo = lo >= 0 ? Y(o[lo]) : null;
    if (ym != null && yo != null && Math.abs(ym - yo) < 18) {
      const mid = (ym + yo) / 2, up = m[lm] >= o[lo];
      ym = mid + (up ? -10 : 10); yo = mid + (up ? 10 : -10);
    }
    const lx = L + pw + 12;
    if (ym != null) pen.text(lx, ym, '나', { size: 13, color: COLORS.ink, weight: 700 });
    if (yo != null) {
      pen.text(lx, yo, '원작', { size: 12, color: COLORS.ink2, weight: 700 });
      pen.rect(lx + 30, yo - 9, 32, 18, { fill: COLORS.orig, rx: 4 });
      pen.text(lx + 46, yo + 0.5, '해석', { size: 11, color: '#fff8ec', align: 'center', weight: 700 });
    }
  }
  // SVG 펜
  function svgPen() {
    const out = [];
    const esc = G.util.esc;
    const st = (o) => (o.stroke || o.color ? ` stroke="${o.stroke || o.color}" stroke-width="${o.width || 1}"` : '') + (o.dash ? ` stroke-dasharray="${o.dash.join(' ')}"` : '');
    const wrap = (o, el) => (o.tip ? `<g class="pt"><title>${esc(o.tip)}</title>${el}</g>` : el);
    return {
      out,
      line(p, o) { out.push(`<polyline points="${p.map((q) => q.map((v) => +v.toFixed(1)).join(',')).join(' ')}" fill="none"${st(o)} stroke-linecap="round" stroke-linejoin="round"/>`); },
      rect(x, y, w, hh, o) { out.push(`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${hh.toFixed(1)}" rx="${o.rx || 0}" fill="${o.fill || 'none'}"${o.stroke ? st(o) : ''}/>`); },
      circle(x, y, r, o) { out.push(wrap(o, `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="${o.fill || 'none'}"${st(o)}/>`)); },
      diamond(x, y, r, o) { out.push(wrap(o, `<polygon points="${x},${y - r} ${x + r},${y} ${x},${y + r} ${x - r},${y}" fill="${o.fill || 'none'}"${st(o)}/>`)); },
      text(x, y, s, o) { out.push(`<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-size="${o.size || 12}" fill="${o.color || COLORS.ink}" text-anchor="${o.align === 'center' ? 'middle' : o.align === 'right' ? 'end' : 'start'}" dominant-baseline="central"${o.weight ? ` font-weight="${o.weight}"` : ''}>${esc(s)}</text>`); },
    };
  }
  E.chartSVG = function (D, key) {
    const p = svgPen();
    plot(p, D, key);
    const gm = GAUGE[key];
    return `<svg class="rs-chart ${key}" viewBox="0 0 ${CW} ${CH}" role="img" aria-label="${gm.ko}(${gm.han}) 궤적: 나와 원작의 옥영">${p.out.join('')}</svg>`;
  };
  // 캔버스 펜(같은 좌표, 바깥에서 옮기고 키운다)
  function canvasPen(g, font) {
    const stroke = (o) => { g.strokeStyle = o.stroke || o.color; g.lineWidth = o.width || 1; g.setLineDash(o.dash || []); g.stroke(); g.setLineDash([]); };
    return {
      line(p, o) { g.beginPath(); p.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.lineCap = 'round'; g.lineJoin = 'round'; stroke(o); },
      rect(x, y, w, hh, o) { g.beginPath(); rr(g, x, y, w, hh, o.rx || 0); if (o.fill) { g.fillStyle = o.fill; g.fill(); } if (o.stroke) stroke(o); },
      circle(x, y, r, o) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); if (o.fill) { g.fillStyle = o.fill; g.fill(); } if (o.stroke || o.color) stroke(o); },
      diamond(x, y, r, o) { g.beginPath(); g.moveTo(x, y - r); g.lineTo(x + r, y); g.lineTo(x, y + r); g.lineTo(x - r, y); g.closePath(); if (o.fill) { g.fillStyle = o.fill; g.fill(); } if (o.stroke || o.color) stroke(o); },
      text(x, y, s, o) { g.font = `${o.weight || 400} ${o.size || 12}px ${font}`; g.fillStyle = o.color || COLORS.ink; g.textAlign = o.align === 'center' ? 'center' : o.align === 'right' ? 'right' : 'left'; g.textBaseline = 'middle'; g.fillText(s, x, y); },
    };
  }
  function rr(g, x, y, w, hh, r) {
    r = Math.min(r, w / 2, hh / 2);
    g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + hh, r); g.arcTo(x + w, y + hh, x, y + hh, r); g.arcTo(x, y + hh, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }

  // ═════════ 결과 화면 ═════════
  E.showResult = function () {
    ui.unpop();
    app._playToken = null;
    if (G.world) G.world.busy = 0;
    document.querySelectorAll('.sheet-back').forEach((x) => x.remove());
    const st = S();
    const D = E.data(st);
    const NR = N().result || {};
    G.audio.play('result');
    const r = document.getElementById('app');
    r.innerHTML = '';
    r.className = 'scr-result';
    const sec = (n, cls, title, ...kids) => h('section.rs-sec.' + cls, { 'data-item': String(n) }, title ? h('h4.rs-h', h('i.rs-orn', { 'aria-hidden': 'true' }), title) : null, ...kids);
    const nameIn = h('input.rs-name-in', { type: 'text', value: st.name || '', maxlength: 30, placeholder: NR.namePlaceholder || '', 'aria-label': NR.nameLabel || '이름' });
    nameIn.addEventListener('input', () => { st.name = nameIn.value; save(); });
    const legend = h('div.rs-legend',
      h('span.lg.mine', h('i.lg-line'), h('i.lg-dot'), '나의 궤적'),
      h('span.lg.orig', h('i.lg-line'), h('i.lg-dia'), '원작 옥영의 궤적', chip('해석')),
      h('span.lg.dash', h('i.lg-line'), '원작에 없는 장면을 지나는 구간'));
    const charts = h('div.rs-charts', { html: E.chartSVG(D.graph, 'yeon') + E.chartSVG(D.graph, 'saeng') });
    const table = h('table.rs-table',
      h('thead', h('tr', h('th', '장면'), h('th', '내 선택'), h('th', '원작의 옥영'))),
      h('tbody', D.rows.map((row) => h('tr' + (row.invented ? '.inv' : '') + (row.same ? '.same' : '') + (row.differ ? '.differ' : ''), { 'data-dilemma': row.id },
        h('td.sc', h('small', row.placeName), h('b', row.name)),
        h('td.my', row.mine),
        h('td.og', row.invented ? h('span.inv-tag', row.orig) : row.orig, row.same ? h('span.same-tag', '같음') : row.differ ? h('span.diff-tag', '다름') : null)))));
    const P = D.puzzle;
    const puzzle = P.none ? h('p.rs-none', D.graph.noAct1Label) : h('div.rs-puzzle',
      h('div.rs-traps', P.traps.map((t) => h('div.rs-trap' + (t.placed ? '.placed' : ''), { 'data-trap': t.id },
        h('span.tk', t.id), h('span.tn', h('b', t.name), h('small', t.placed ? '놓았던 함정' : '놓지 않음'))))),
      h('div.rs-counts',
        h('div.rs-count', { 'data-count': 'fixes' }, h('b', P.fixes), h('span', '고친 횟수')),
        h('div.rs-count', { 'data-count': 'groped' }, h('b', P.groped), h('span', '더듬어 찾기'))));
    const saveBtn = h('button.btn.primary.big.rs-save-btn', { type: 'button', on: { click: () => { G.audio.tap(); E.saveImage(); } } }, NR.save || '이미지로 저장');
    const sheet = h('article.rs-sheet', { 'aria-label': '결과 — ' + (NR.title || '') },
      h('header.rs-top',
        h('div.rs-title', h('div.rs-kicker', NR.kicker || ''), h('h1.rs-h1', NR.title || '두 개의 항로'), h('div.rs-sub', NR.sub || '')),
        h('label.rs-name', h('span', NR.nameLabel || '반·번호·이름'), nameIn,
          h('small', (D.modeName ? D.modeName + (D.modeWho ? ' · ' + D.modeWho : '') : '') + ' · ' + D.date))),
      h('div.rs-grid',
        sec(1, 'graph', NR.graph || '', legend, charts, h('p.rs-note', NR.graphNote || '')),
        sec(2, 'ending', NR.ending || '나의 결말',
          h('div.rs-end', h('b.rs-end-name', D.ending.name), h('p', D.ending.line)),
          h('div.rs-orig', h('span.seal-mark', '原作'), h('div', h('small', NR.origEnding || '원작의 결말'), h('p', D.origLine)))),
        sec(3, 'dream', NR.dream || '장육불 꿈', h('div.rs-dream', h('b', D.jangyuk), h('span', '번')), h('p.rs-note', NR.dreamNote || '')),
        sec(4, 'choices', NR.choices || '선택 비교표', table),
        sec(5, 'puzzle', NR.puzzle || '시구 맞추기 기록', puzzle),
        sec(6, 'save', '',
          h('div.rs-save', saveBtn,
            h('div.rs-cap', h('p', NR.capture || ''), h('ul.rs-keys', (NR.shortcuts || []).map(([d, k]) => h('li', h('span', d), h('kbd', k)))))))),
      h('footer.rs-foot', '두 개의 항로 — 조위한 「최척전」 학습 게임 · 만든이 박준일'));
    const debrief = h('section.rs-debrief.card.interp',
      h('span.kind', h('span', NR.debriefTitle || '생각 나누기'), ' ', chip('해석')),
      h('p.small.muted', NR.debriefLead || ''),
      h('ol', (N().debrief || []).filter((q) => G.steps.ok(q.when)).map((q) => h('li', { 'data-q': String(q.n) },
        T(q.q), q.std ? h('span.std', ' ' + q.std) : null, q.tag ? h('span.tag', q.tag) : null))));
    const nav = h('div.rs-nav',
      h('button.btn.dark', { type: 'button', on: { click: () => { G.audio.tap(); app.openHook('notebook'); } } }, '이야기 수첩'),
      h('button.btn.dark', { type: 'button', on: { click: () => { G.audio.tap(); app.openHook('credits'); } } }, '만든 사람·출처'),
      h('button.btn.dark', { type: 'button', on: { click: () => { G.audio.tap(); app.title(); } } }, '타이틀로'));
    r.appendChild(h('div.result-screen', h('div.rs-scroll', sheet, debrief, nav)));
    if (st.flags && !st.flags.resultShown) { st.flags.resultShown = true; save(); setTimeout(() => ui.stamp && ui.stamp('完'), 500); }
  };

  // ═════════ 이미지로 저장(캔버스에 한 장으로 다시 그린다) ═════════
  E.saveImage = async function (o = {}) {
    const st = S();
    const D = E.data(st);
    const NR = N().result || {};
    const css = getComputedStyle(document.documentElement);
    const serif = (css.getPropertyValue('--serif') || 'serif').trim();
    const brush = "'HangroBrush', " + serif;
    try { await Promise.all([document.fonts.load('700 30px HangroBatang', '가'), document.fonts.load('30px HangroBatang', '가'), document.fonts.load('80px HangroBrush', '두 개의 항로')]); } catch (e) { /* 기본 글꼴로 */ }
    const W = 1600, PAD = 70;
    const c = document.createElement('canvas');
    // 높이를 먼저 잰다(표 줄 수에 따라)
    const rowH = 54;
    const tableH = 64 + D.rows.length * rowH;
    const H = 330 + 360 + 40 + 276 + 40 + tableH + 160;
    c.width = W; c.height = H;
    const g = c.getContext('2d');
    // 한지 바탕 + 결
    g.fillStyle = COLORS.hanji; g.fillRect(0, 0, W, H);
    let seed = 7;
    const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    g.lineCap = 'round';
    for (let i = 0; i < 900; i++) {
      const x = rnd() * W, y = rnd() * H, l = 6 + rnd() * 26, a = rnd() * Math.PI;
      g.strokeStyle = rnd() < 0.5 ? 'rgba(160,120,60,.07)' : 'rgba(255,255,255,.25)';
      g.lineWidth = 0.6 + rnd() * 1.2;
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + 3, y + Math.sin(a) * l * 0.5 - 3, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
    }
    // 테두리: 먹빛 바깥선 + 황토 안쪽선
    g.strokeStyle = COLORS.line; g.lineWidth = 5; g.beginPath(); rr(g, 22, 22, W - 44, H - 44, 26); g.stroke();
    g.strokeStyle = 'rgba(185,138,69,.75)'; g.lineWidth = 2.5; g.beginPath(); rr(g, 34, 34, W - 68, H - 68, 18); g.stroke();
    const pen = canvasPen(g, serif);
    const txt = (x, y, s, size, color, weight, align, fnt) => { g.font = `${weight || 400} ${size}px ${fnt || serif}`; g.fillStyle = color || COLORS.ink; g.textAlign = align || 'left'; g.textBaseline = 'alphabetic'; g.fillText(s, x, y); };
    const orn = (x, y) => { g.save(); g.translate(x, y); g.rotate(Math.PI / 4); g.fillStyle = '#f2a541'; g.fillRect(-6, -6, 12, 12); g.restore(); };
    const heading = (x, y, s) => { orn(x + 6, y - 9); txt(x + 22, y, s, 27, COLORS.ink, 700); };
    // 머리
    txt(PAD, 110, NR.kicker || '', 26, '#c9781f', 700);
    txt(PAD, 205, NR.title || '두 개의 항로', 92, COLORS.ink, 400, 'left', brush);
    txt(PAD, 255, NR.sub || '', 24, COLORS.ink2);
    // 이름 칸
    const nx = 980, nw = W - PAD - nx;
    txt(nx, 128, NR.nameLabel || '반·번호·이름', 22, COLORS.ink2, 700);
    g.strokeStyle = COLORS.line; g.lineWidth = 2.5; g.beginPath(); g.moveTo(nx, 196); g.lineTo(nx + nw, 196); g.stroke();
    txt(nx + 8, 184, D.name || '', 38, COLORS.ink, 700);
    txt(nx, 236, (D.modeName ? D.modeName + (D.modeWho ? ' · ' + D.modeWho : '') + ' · ' : '') + D.date, 20, COLORS.ink3);
    g.strokeStyle = 'rgba(185,138,69,.6)'; g.lineWidth = 2; g.beginPath(); g.moveTo(PAD, 290); g.lineTo(W - PAD, 290); g.stroke();
    // 1) 그래프
    let y = 345;
    heading(PAD, y, NR.graph || '');
    // 범례
    let lx = 560;
    const lgY = y - 9;
    g.strokeStyle = COLORS.ink; g.lineWidth = 4; g.beginPath(); g.moveTo(lx, lgY); g.lineTo(lx + 40, lgY); g.stroke(); pen.circle(lx + 20, lgY, 6, { fill: COLORS.ink2, stroke: '#fbf6ea', width: 2 });
    txt(lx + 52, y, '나의 궤적', 20, COLORS.ink2); lx += 170;
    g.strokeStyle = COLORS.orig; g.lineWidth = 2.5; g.beginPath(); g.moveTo(lx, lgY); g.lineTo(lx + 40, lgY); g.stroke(); pen.diamond(lx + 20, lgY, 6, { fill: '#fbf6ea', stroke: COLORS.orig, width: 2 });
    txt(lx + 52, y, '원작 옥영의 궤적', 20, COLORS.ink2);
    pen.rect(lx + 212, lgY - 13, 48, 26, { fill: COLORS.orig, rx: 5 }); txt(lx + 236, y - 1, '해석', 16, '#fff8ec', 700, 'center'); lx += 290;
    g.strokeStyle = COLORS.orig; g.lineWidth = 2.5; g.setLineDash([7, 6]); g.beginPath(); g.moveTo(lx, lgY); g.lineTo(lx + 40, lgY); g.stroke(); g.setLineDash([]);
    txt(lx + 52, y, '원작에 없는 장면 구간', 20, COLORS.ink2);
    const sc = (W - PAD * 2 - 40) / 2 / CW;
    ['yeon', 'saeng'].forEach((k, i) => {
      g.save(); g.translate(PAD + i * (CW * sc + 40), y + 25); g.scale(sc, sc);
      plot(pen, D.graph, k);
      g.restore();
    });
    y += 25 + CH * sc + 30;
    // 2·3·5) 결말 · 장육불 꿈 · 시구 맞추기
    const boxY = y, boxH = 276;
    const box = (x, w, title) => {
      g.fillStyle = 'rgba(255,252,244,.72)'; g.beginPath(); rr(g, x, boxY, w, boxH, 18); g.fill();
      g.strokeStyle = 'rgba(47,40,64,.28)'; g.lineWidth = 2; g.stroke();
      heading(x + 22, boxY + 46, title);
    };
    const w1 = 700, w2 = 260, w3 = W - PAD * 2 - w1 - w2 - 40;
    box(PAD, w1, NR.ending || '나의 결말');
    txt(PAD + 28, boxY + 100, D.ending.name, 40, COLORS.seal, 700);
    g.font = `21px ${serif}`; g.fillStyle = COLORS.ink2; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    app.wrapText(g, D.ending.line, PAD + 28, boxY + 136, w1 - 56, 28, 2);
    g.strokeStyle = 'rgba(47,40,64,.18)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(PAD + 28, boxY + 182); g.lineTo(PAD + w1 - 28, boxY + 182); g.stroke();
    txt(PAD + 28, boxY + 218, (NR.origEnding || '원작의 결말'), 20, COLORS.seal, 700);
    g.font = `21px ${serif}`; g.fillStyle = COLORS.ink; g.textAlign = 'left';
    app.wrapText(g, D.origLine, PAD + 160, boxY + 218, w1 - 190, 28, 2);
    const x2 = PAD + w1 + 20;
    box(x2, w2, NR.dream || '장육불 꿈');
    txt(x2 + w2 / 2 - 6, boxY + 178, D.jangyuk, 84, COLORS.ink, 700, 'right');
    txt(x2 + w2 / 2 + 4, boxY + 178, '번', 30, COLORS.ink2, 700);
    txt(x2 + w2 / 2, boxY + 232, NR.dreamNote || '', 18, COLORS.ink3, 400, 'center');
    const x3 = x2 + w2 + 20;
    box(x3, w3, NR.puzzle || '시구 맞추기 기록');
    if (D.puzzle.none) txt(x3 + w3 / 2, boxY + 150, D.graph.noAct1Label, 24, COLORS.ink3, 700, 'center');
    else {
      D.puzzle.traps.forEach((t, i) => {
        const ty = boxY + 96 + i * 40;
        pen.rect(x3 + 26, ty - 14, 28, 28, { fill: t.placed ? COLORS.seal : 'rgba(47,40,64,.1)', rx: 6 });
        txt(x3 + 40, ty + 7, t.id, 18, t.placed ? '#fff8ec' : COLORS.ink3, 700, 'center');
        txt(x3 + 66, ty + 7, t.name, 19, t.placed ? COLORS.ink : COLORS.ink3, t.placed ? 700 : 400);
        txt(x3 + w3 - 24, ty + 7, t.placed ? '놓았던 함정' : '놓지 않음', 16, t.placed ? COLORS.seal : COLORS.ink3, 700, 'right');
      });
      const cy = boxY + 244;
      txt(x3 + 26, cy, '고친 횟수', 19, COLORS.ink2); txt(x3 + 150, cy, D.puzzle.fixes, 28, COLORS.ink, 700);
      txt(x3 + w3 / 2 + 10, cy, '더듬어 찾기', 19, COLORS.ink2); txt(x3 + w3 / 2 + 140, cy, D.puzzle.groped, 28, COLORS.ink, 700);
    }
    y = boxY + boxH + 70;
    // 4) 선택 비교표
    heading(PAD, y, NR.choices || '선택 비교표');
    y += 26;
    const cols = [PAD, PAD + 470, PAD + 880, W - PAD];
    g.fillStyle = 'rgba(28,38,70,.9)'; g.beginPath(); rr(g, PAD, y, W - PAD * 2, 46, 10); g.fill();
    ['장면', '내 선택', '원작의 옥영'].forEach((t, i) => txt(cols[i] + 22, y + 31, t, 20, '#f4ead3', 700));
    y += 46;
    D.rows.forEach((row, i) => {
      if (i % 2) { g.fillStyle = 'rgba(185,138,69,.1)'; g.fillRect(PAD, y, W - PAD * 2, rowH); }
      txt(cols[0] + 22, y + 34, row.placeName, 16, COLORS.ink3, 700);
      txt(cols[0] + 22 + g.measureText(row.placeName).width + 14, y + 34, row.name, 20, COLORS.ink, 700);
      g.font = `20px ${serif}`; g.fillStyle = COLORS.ink; g.textAlign = 'left';
      app.wrapText(g, row.mine, cols[1] + 22, y + 34, cols[2] - cols[1] - 40, 24, 1);
      g.font = `${row.invented ? 18 : 20}px ${serif}`; g.fillStyle = row.invented ? COLORS.ink3 : COLORS.ink;
      app.wrapText(g, row.orig, cols[2] + 22, y + 34, cols[3] - cols[2] - (row.same || row.differ ? 110 : 40), 24, 1);
      if (row.same || row.differ) {
        pen.rect(cols[3] - 84, y + 13, 66, 30, { fill: row.same ? 'rgba(15,143,126,.16)' : 'rgba(179,52,42,.12)', rx: 15 });
        txt(cols[3] - 51, y + 34, row.same ? '같음' : '다름', 17, row.same ? COLORS.saeng : COLORS.seal, 700, 'center');
      }
      g.strokeStyle = 'rgba(47,40,64,.14)'; g.lineWidth = 1; g.beginPath(); g.moveTo(PAD, y + rowH); g.lineTo(W - PAD, y + rowH); g.stroke();
      y += rowH;
    });
    // 바닥
    txt(PAD, H - 66, '두 개의 항로 — 조위한 「최척전」 학습 게임 · 만든이 박준일(온양여자고등학교 국어 교사)', 18, COLORS.ink3);
    txt(W - PAD, H - 66, D.date, 18, COLORS.ink3, 400, 'right');
    // 붉은 낙관
    g.font = `400 92px ${brush}`;
    const tw = g.measureText(NR.title || '두 개의 항로').width;
    g.save(); g.translate(Math.min(nx - 80, PAD + tw + 70), 160); g.rotate(-0.06);
    g.strokeStyle = COLORS.seal; g.lineWidth = 4; g.beginPath(); rr(g, -46, -46, 92, 92, 8); g.stroke();
    g.fillStyle = COLORS.seal; g.font = `700 34px ${serif}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('航', 0, -14); g.fillText('路', 0, 22);
    g.restore();
    E.lastCanvas = c;
    if (o.download === false) return c;
    const safe = String(D.name || '').replace(/[\\/:*?"<>|\s]+/g, '_').replace(/^_+|_+$/g, '');
    app.downloadCanvas(c, '두개의항로_' + (safe || '결과') + '.png');
    ui.toast('그림 파일로 저장했어요');
    return c;
  };
})();
