'use strict';
// 단계 실행기: 단계 하나를 화면에 펼치고, 끝나면 resolve 한다.
//  ctx = { main, tray(content), trayEl(), refresh(), setScene(id), place, placeId, mode:'event'|'dlg', preset }
//   - main: 글·카드가 쌓이는 자리 / tray: 화면 아래 엄지 닿는 곳(단추·선택지) / setScene: 사건 화면 전체 삽화 바꾸기
//  단계 종류는 G.steps.register('종류', async (step, ctx) => { … })로 등록한다. 여기서는 say·choice와
//  게임 규칙 단계 dilemma·gauge·know·frag·dream·card(효과는 js/game/rules.js의 G.rules)를 둔다.
//  등록되지 않은 종류는 오류 없이 '준비 중' 판을 보여 주고 넘어간다.
(function () {
  const { h, T, boldNodes } = G.util;
  const ui = G.ui;
  const steps = (G.steps = {});
  const S = () => G.save.state;

  // ───────── 단계 종류 등록 ─────────
  steps.types = {};
  steps.register = function (type, fn) {
    if (typeof fn !== 'function') throw new Error('단계 함수가 아님: ' + type);
    steps.types[type] = fn;
  };
  steps.has = (type) => typeof steps.types[type] === 'function';
  steps.run = async function (step, ctx) {
    const fn = steps.types[step.type];
    if (fn) return fn(step, ctx);
    return steps.notReady(step, ctx);
  };
  steps.notReady = async function (step, ctx) {
    ctx.main.appendChild(h('div.card.note.notready',
      h('span.kind', '준비 중'),
      h('h3', `「${step.type || '이름 없음'}」 단계는 아직 준비 중이에요`),
      h('p.small', '이 장면을 만드는 작업이 끝나면 여기에 나타나요. 지금은 넘어가도 돼요.')));
    await nextButton(ctx, '넘어가기 ▶');
  };

  // ───────── 공통: 아래 트레이의 버튼 ─────────
  function actionBtn(label, cls, onClick) {
    return h('button.btn' + (cls ? '.' + cls : ''), { type: 'button', on: { click: () => { G.audio.tap(); onClick(); } } }, label);
  }
  steps.actionBtn = actionBtn;
  // Enter를 게임 진행에 써도 되는 때: 판이 떠 있지 않고, 다른 버튼·입력 칸에 포커스가 없을 때
  function enterFree(e, own) {
    if (document.querySelector('.sheet-back, .overlay')) return false;
    const t = e.target;
    if (t && t !== own && t !== document.body && t.closest && t.closest('button, a, input, textarea, select, [role="button"], [tabindex]')) return false;
    return true;
  }
  steps.enterFree = enterFree;
  function nextButton(ctx, label = '다음 ▶', extra) {
    return new Promise((res) => {
      // 누르면 트레이를 비운다(다음 화면에 눌러도 아무 일 없는 단추가 남지 않게)
      const b = actionBtn(label, 'primary', () => { cleanup(); if (b.isConnected) ctx.tray(null); res(); });
      const key = (e) => {
        if (!b.isConnected) { cleanup(); return; } // 다른 화면으로 떠났으면 손을 뗀다
        // Enter는 어디서나, Space는 포커스가 아무 데도 없을 때만(단추 위의 Space는 브라우저가 알아서 누른다)
        if (e.key === 'Enter' && enterFree(e, b)) { e.preventDefault(); b.click(); }
        else if (e.key === ' ' && (e.target === document.body || !e.target) && enterFree(e, b)) { e.preventDefault(); b.click(); }
      };
      document.addEventListener('keydown', key);
      function cleanup() { document.removeEventListener('keydown', key); }
      ctx.tray(h('div.actions', extra || null, b));
      setTimeout(() => b.isConnected && b.focus({ preventScroll: true }), 30);
    });
  }
  steps.nextButton = nextButton;
  function feedback(box, kind, text) {
    box.innerHTML = '';
    box.appendChild(h('div.feedback.' + kind, boldNodes(text)));
    G.ui.reveal(box, true);
  }
  steps.feedback = feedback;

  // 글 사이에 끼우는 작은 삽화. 그림 파일이 목록에 없으면 빈 종이 판(요청을 보내지 않는다)
  steps.scene = function (name, cls = '') {
    if (!name) return document.createDocumentFragment();
    const src = G.util.art('sc', name);
    return h('div.scene' + cls, src ? h('img', { src, alt: '' }) : h('div.blank-paper', { 'aria-hidden': 'true' }));
  };

  // ───────── 조건 ─────────
  //  when: { mode:'deep', teacher:true, flag:{k:v}, done:'키', min:{yeon:3}, max:{saeng:2}, token:'신표 id', not:{…}, any:[{…},{…}] }
  //  다른 파일이 조건을 더할 수 있다: G.steps.conds.이름 = (값, state) => true|false
  steps.conds = {
    mode: (v, st) => st.mode === v,
    teacher: (v, st) => !!st.teacher === !!v,
    flag: (v, st) => Object.keys(v).every((k) => st.flags[k] === v[k]),
    done: (v, st) => [].concat(v).every((k) => !!st.done[k]),
    min: (v, st) => Object.keys(v).every((k) => (st[k] || 0) >= v[k]),
    max: (v, st) => Object.keys(v).every((k) => (st[k] || 0) <= v[k]),
    token: (v, st) => [].concat(v).every((id) => (st.tokens || []).some((t) => (t.id || t) === id)),
    not: (v) => !steps.ok(v),
    any: (v) => [].concat(v).some((w) => steps.ok(w)),
  };
  steps.ok = function (when) {
    if (!when) return true;
    if (typeof when === 'function') return !!when(S());
    const st = S();
    for (const k in when) {
      const f = steps.conds[k];
      if (f && !f(when[k], st)) return false;
    }
    return true;
  };

  // ───────── 상태 바꾸기 ─────────
  //  fx: { set:{…}(최상위 값), flags:{…}, gauge:{ yeon:+1, saeng:-2 }, token:{id,name}|[…], frag:2|[2,3](시구 조각 행 번호) }
  //  다른 파일이 효과를 더할 수 있다: G.steps.effects.이름 = (값, ctx, state) => {}
  steps.effects = {
    set: (v, ctx, st) => Object.assign(st, v),
    flags: (v, ctx, st) => Object.assign(st.flags, v),
    gauge: (v) => G.hud.change(v),
    token: (v) => { for (const t of [].concat(v)) G.hud.addToken(t); },
    frag: (v) => { for (const n of G.rules.fragRows(v)) G.hud.setFrag(n, true); },
  };
  steps.apply = function (fx, ctx) {
    if (!fx) return;
    const st = S();
    for (const k in fx) { const f = steps.effects[k]; if (f) f(fx[k], ctx, st); }
    G.save.write();
    if (ctx && ctx.refresh) ctx.refresh();
  };

  // ───────── 한 줄(대사·서술·카드) ─────────
  //  line: '서술' | { who:'인물 id', t:'말' } | { card:{kind,title,body,han,ko,real,src} } | { fx:{…} } | { scene:'sc_x' } | { when:{…}, … }
  //  다른 파일이 줄 종류를 더할 수 있다: G.steps.lineKinds.이름 = (line, ctx) => 요소|null
  steps.lineKinds = {};
  steps.line = function (line, ctx) {
    if (typeof line === 'string') line = { t: line };
    if (line.when && !steps.ok(line.when)) return null;
    if (line.fx) { steps.apply(line.fx, ctx); if (line.t == null && !line.who && !line.card && !line.scene) return null; }
    for (const k in steps.lineKinds) if (line[k] != null) return steps.lineKinds[k](line, ctx);
    if (line.scene) {
      if (ctx && ctx.setScene) { ctx.setScene(line.scene); if (line.t == null && !line.who) return null; }
      else return steps.scene(line.scene, '.short');
    }
    if (line.card) return ui.card(line.card);
    if (!line.who) return h('div.para.narr.show', boldNodes(line.t));
    const p = G.util.person(line.who);
    const me = line.who === 'okyoung';
    return h('div.para.say.show' + (me ? '.me' : ''), { style: { '--pc': (p && p.color) || '#5a4a3a' } },
      h('div.who', ui.face(line.who, line.sp)),
      h('div.bubble', h('span.nm', G.util.who(line.who) || line.name || ''), boldNodes(line.t)));
  };
  // 여러 줄을 한 줄씩 넘기며 보여 준다
  steps.lines = async function (lines, ctx, lastLabel = '다음 ▶') {
    let box = h('div.says');
    ctx.main.appendChild(box);
    const list = (lines || []).filter((l) => typeof l === 'string' || steps.ok(l.when));
    for (let i = 0; i < list.length; i++) {
      const el = steps.line(list[i], ctx);
      if (!el) continue;
      const lastOne = !list.slice(i + 1).some((l) => typeof l === 'string' || !l.fx || l.t != null || l.who || l.card);
      // 이야기 줄 속 원작 카드({ card })는 좁은 글 칸에 끼우지 않고 사건 화면 가운데 한 장으로 크게 보인 뒤, 글 칸을 새로 시작한다
      if (typeof list[i] === 'object' && list[i].card && ctx.mode === 'event' && ctx.el) {
        el.classList.add('linecard');
        await steps.cardMoment(ctx, el, lastOne ? lastLabel : '▶');
        ctx.main.innerHTML = '';
        box = h('div.says');
        ctx.main.appendChild(box);
        continue;
      }
      box.appendChild(el);
      G.audio.page();
      G.ui.reveal(el, true);
      await nextButton(ctx, lastOne ? lastLabel : '▶');
    }
  };

  // ───────── say: 한 줄씩 넘기며 읽기 ─────────
  //  { id, type:'say', scene:'sc_x', title:'…', lines:[…], next:'마지막 단추 글' }
  steps.register('say', async function (step, ctx) {
    if (step.scene) { if (ctx.setScene) ctx.setScene(step.scene); else ctx.main.appendChild(steps.scene(step.scene)); }
    if (step.title) ctx.main.appendChild(h('h2.stitle', T(step.title)));
    await steps.lines(step.lines, ctx, step.next || '다음 ▶');
  });

  // ───────── choice: 고르기(선택지는 화면 아래 엄지 닿는 곳에) ─────────
  //  { id, type:'choice', scene, pre:[줄…], q:'물음', who:'인물', options:[{ t, d, when, fx…, reply:[줄…] }], after:[줄…] }
  //  선택지 자체에 set·flags·gauge·token·frag를 적으면 고른 뒤 적용된다. 고른 번호는 flags['pick:단계 id']에 남는다.
  steps.register('choice', async function (step, ctx) {
    const st = S();
    if (step.scene) { if (ctx.setScene) ctx.setScene(step.scene); else ctx.main.appendChild(steps.scene(step.scene, '.short')); }
    for (const l of step.pre || []) { const el = steps.line(l, ctx); if (el) ctx.main.appendChild(el); }
    if (step.q) { const el = steps.line(step.who ? { who: step.who, t: step.q } : { t: step.q }, ctx); if (el) { ctx.main.appendChild(el); G.ui.reveal(el); } }
    const opts = step.options.filter((o) => steps.ok(o.when));
    const preset = ctx.preset && ctx.preset[step.id] != null ? step.options[ctx.preset[step.id]] : null;
    const list = h('div.options.n' + Math.min(3, opts.length));
    const pick = await new Promise((res) => {
      opts.forEach((o, i) => {
        const b = h('button.opt', { type: 'button' }, h('span.ot', boldNodes(o.t)), o.d ? h('span.od', boldNodes(o.d)) : null);
        b.addEventListener('click', () => { if (b.disabled) return; G.audio.pick(); res(o); });
        if (preset) b.disabled = true;
        list.appendChild(b);
        if (i === 0 && !preset) setTimeout(() => b.isConnected && b.focus({ preventScroll: true }), 30);
      });
      ctx.tray(h('div.choice-tray', step.hint ? h('div.tray-hint', boldNodes(step.hint)) : null, list));
      if (preset && opts.includes(preset)) setTimeout(() => { G.audio.pick(); res(preset); }, 450);
    });
    list.querySelectorAll('.opt').forEach((b, i) => { b.disabled = true; b.classList.add(opts[i] === pick ? 'picked' : 'dim'); });
    // 고른 것을 글 자리에 남긴다
    ctx.main.appendChild(h('div.para.picked-line.show', '▸ ', boldNodes(pick.t)));
    await G.util.wait(260);
    ctx.tray(null);
    steps.apply(pick, ctx);
    if (step.id) st.flags['pick:' + step.id] = step.options.indexOf(pick);
    G.save.write();
    const reply = (pick.reply || []).concat(step.after || []);
    if (reply.length) await steps.lines(reply, ctx);
    else await nextButton(ctx, '다음 ▶');
  });

  // ═════════ 게임 규칙 단계(spec §4·§6): dilemma · gauge · know · frag · dream · card ═════════
  //  효과(게이지·조각·신표·지식·횟수)는 모두 G.rules.applyStep으로 단계 열쇠마다 한 번만 반영한다.
  //  새로고침으로 단계를 다시 하면 엔진이 그 단계를 시작할 때 값(G.save.snapKeys)으로 되돌린 뒤 다시 펼친다.
  //  쓰는 글(장육불 꿈, 떠올리는 글, '원작에는 없는 장면' 틀, 잠긴 실마리, 표기 칩 이름·색)은 js/data/texts.js
  const TX = () => window.TEXTS || {};
  const placeOf = (ctx) => (ctx && ctx.placeId) || S().place || null;
  const keyOf = (ctx, step) => G.app.key.step(placeOf(ctx), step.id);
  const LOCK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
  if (G.hud && G.hud.ICON && !G.hud.ICON.know) {
    G.hud.ICON.know = '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 10c5-2 11-2 16 2 5-4 11-4 16-2v26c-5-2-11-2-16 2-5-4-11-4-16-2z" fill="currentColor" fill-opacity=".14"/><path d="M24 12v26"/><path d="M13 18c2.5-.6 5-.4 7 .6M13 24c2.5-.6 5-.4 7 .6M28 18.6c2-1 4.5-1.2 7-.6"/></svg>';
  }

  // 표기 체계 칩(원문·풀이·게임 설정·이본 노트·해석). 이름·색: TEXTS.MARKS, notes.js의 NOTES.marks가 있으면 그것이 먼저
  steps.mark = function (k) {
    const M = Object.assign({}, TX().MARKS || {}, (window.NOTES && NOTES.marks) || {});
    const m = M[k] || { name: k };
    return h('span.rchip', { style: m.color ? '--mk:' + m.color : null }, m.name || k);
  };
  const mark = steps.mark;
  // 원문 한 구절은 늘 풀이와 함께: { 원문, 풀이 }
  steps.quote = function (q) {
    if (!q || (!q.원문 && !q.풀이)) return null;
    return h('div.rquote',
      q.원문 ? h('div.rq-row', mark('원문'), h('p.han', q.원문)) : null,
      q.풀이 ? h('div.rq-row', mark('풀이'), h('p.ko', boldNodes(q.풀이))) : null);
  };

  // 원작 대조 카드(딜레마를 지난 뒤). 깊이 읽기면 quoteLong(있으면), 처음 배우기면 extraGloss(풀이 덧붙임)
  //  card: { title, summary, quote:{원문,풀이}, quoteLong?, extraGloss?, variant?(이본 노트), interp?(해석), src? }
  steps.compareCard = function (step, choiceId) {
    const st = S();
    const C = TX().CARD || {};
    const c = step.card || {};
    const deep = st.mode === 'deep';
    const orig = step.orig != null;
    const optOf = (id) => (step.options || []).find((o) => o.id === id);
    const mine = optOf(choiceId);
    const theirs = optOf(orig ? step.orig : step.origNearest);
    const q = (deep && c.quoteLong) || c.quote;
    const cmp = h('dl.rc-cmp',
      mine ? [h('dt', C.mine || '내 선택'), h('dd', T(mine.label || mine.t || ''))] : null,
      theirs ? [h('dt', orig ? (C.original || '원작의 옥영') : (C.nearest || '원작에 가까운 쪽')), h('dd', T(theirs.label || theirs.t || ''))] : null);
    return h('div.card.rcard.' + (orig ? 'orig' : 'fiction'),
      orig ? h('span.seal-mark.corner', '原作') : null,
      h('span.kind', orig ? (C.origKind || '원작 대조') : (C.fictionKind || '게임 창작')),
      c.title ? h('h3', T(c.title)) : null,
      orig ? null : h('p.rc-ask', mark('게임 설정'), boldNodes(C.notInOriginal || '')),
      c.summary ? h('p.rc-sum', boldNodes(c.summary)) : null,
      steps.quote(q),
      !deep && c.extraGloss ? h('div.rc-note', mark('풀이'), h('p', boldNodes(c.extraGloss))) : null,
      c.variant ? h('div.rc-note', mark('이본 노트'), h('p', boldNodes(c.variant))) : null,
      c.interp ? h('div.rc-note', mark('해석'), h('p', boldNodes(c.interp))) : null,
      mine || theirs ? cmp : null,
      c.src ? h('p.src', c.src) : null,
      h('p.rc-saved', C.saved || ''));
  };
  // 역사 카드·그 밖의 카드(카드 단계): { kind?, title, body|summary, quote?, src? }
  steps.infoCard = function (c, kind) {
    c = c || {};
    const C = TX().CARD || {};
    const k = c.kind || kind || 'note';
    return h('div.card.rcard.' + k,
      h('span.kind', c.kindLabel || (k === 'history' ? C.historyKind || '역사 카드' : (ui.KIND || {})[k] || '')),
      c.title ? h('h3', T(c.title)) : null,
      ...String(c.body || c.summary || '').split('\n').filter((x) => x !== '').map((line) => h('p', boldNodes(line))),
      steps.quote(c.quote),
      c.src ? h('p.src', c.src) : null,
      h('p.rc-saved', C.saved || ''));
  };

  // 장육불 꿈·떠올리는 글(쓰러짐 c: { kind:'dream'|'fixedDream'|'recall', lines }) — 화면 요소
  steps.dreamView = function (c, o = {}) {
    const X = TX();
    const D = X.DREAM || {};
    const kind = (c && c.kind) || 'dream';
    const lines = kind === 'recall' ? ((X.RECALL || {}).lines || [])
      : [].concat((c && c.lines) || o.lines || [], (c && c.lines) || o.lines ? [] : D.lines || []);
    return h('div.rdream.' + kind,
      o.zero === false ? null : h('p.rd-zero', X.SAENG_ZERO || ''),
      kind === 'recall' ? null : h('h3', D.title || ''),
      ...lines.map((l) => h('p', boldNodes(typeof l === 'string' ? l : l.t || ''))),
      kind === 'recall' ? null : steps.quote(o.quote || D.quote),
      kind === 'recall' || !D.after ? null : h('p.rd-after', boldNodes(D.after)));
  };
  // 단계 화면 안에서 쓰러짐을 펼친다
  steps.collapse = async function (c, ctx) {
    if (!c) return;
    const D = TX().DREAM || {};
    if (c.kind !== 'recall' && D.scene && ctx.setScene) ctx.setScene(D.scene);
    await steps.cardMoment(ctx, steps.dreamView(c), '다시 일어서기 ▶');
  };
  // 단계 밖(말 걸기 효과 등)에서 쓰러졌을 때: 판으로 띄운다
  steps.collapseSheet = (c) => ui.sheet([steps.dreamView(c)], [{ label: '다시 일어서기', value: true, cls: 'primary' }], { cls: 'dream-sheet', dismiss: false });
  // 카드·꿈은 사건 화면 가운데에 한 장으로 크게(거점 첫 장과 같은 .cardmode 모습). 다음을 누르면 원래 모습으로
  steps.cardMoment = async function (ctx, el, label) {
    const on = ctx.mode === 'event' && ctx.el;
    ctx.main.innerHTML = '';
    if (on) ctx.el.classList.add('cardmode', 'rcardmode');
    ctx.main.appendChild(el);
    G.audio.page();
    if (ctx.main.parentNode) ctx.main.parentNode.scrollTop = 0;
    await nextButton(ctx, label || '다음 ▶');
    if (on) ctx.el.classList.remove('cardmode', 'rcardmode');
  };

  // ───────── dilemma: 딜레마(선택지 2~3개, 갈래마다 게이지 변동, 끝나면 원작 대조 카드) ─────────
  //  { id, type:'dilemma', dilemma:'d-…', scene, prompt:[줄…], who?, q?,
  //    options:[{ id, type:'yeon'|'saeng'|'wisdom'|'none', label, desc?, need?:'지식 id', lockHint?, when?, gauge?, fx?:{frag,token,know,set}, reply?:[줄…] }],
  //    orig:'선택지 id'|null, origNearest?:'선택지 id', card:{…}, next? }
  //  지혜의 길은 need 지식이 있고 그 거점에서 아직 안 썼을 때만 열린다. 잠기면 실마리 한 줄과 함께 잠긴 모습으로 보인다.
  steps.register('dilemma', async function (step, ctx) {
    if (!step.options || !step.options.length) return steps.notReady(step, ctx);
    const st = S();
    const place = placeOf(ctx);
    const key = keyOf(ctx, step);
    if (step.scene) { if (ctx.setScene) ctx.setScene(step.scene); else ctx.main.appendChild(steps.scene(step.scene, '.short')); }
    for (const l of step.prompt || step.pre || []) { const el = steps.line(l, ctx); if (el) ctx.main.appendChild(el); }
    if (step.q) { const el = steps.line(step.who ? { who: step.who, t: step.q } : { t: step.q }, ctx); if (el) ctx.main.appendChild(el); }
    const last = ctx.main.lastElementChild;
    if (last) G.ui.reveal(last);
    const prev = (st.applied || {})[key];
    const presetIdx = ctx.preset && ctx.preset[step.id] != null ? ctx.preset[step.id] : null;
    const preset = prev && prev.choice ? step.options.find((o) => o.id === prev.choice) : presetIdx != null ? step.options[presetIdx] : null;
    const states = step.options.map((o) => G.rules.optionState(step, o, st, place));
    const list = h('div.options.n' + Math.min(3, step.options.length));
    const PATH = TX().PATH || {};
    const pick = await new Promise((res) => {
      let first = true;
      step.options.forEach((o, i) => {
        const s = states[i];
        const b = h('button.opt.t-' + (o.type || 'none') + (s.open ? '' : '.locked'), { type: 'button', 'aria-disabled': s.open ? null : 'true' },
          o.type === 'wisdom' && PATH.wisdom ? h('span.opath', PATH.wisdom) : null,
          h('span.ot', boldNodes(o.label || o.t || '')),
          o.desc ? h('span.od', boldNodes(o.desc)) : null,
          s.open ? null : h('span.od.lock', h('i', { html: LOCK_SVG }), (TX().LOCK || {}).mark ? h('b', TX().LOCK.mark + ' · ') : null, s.hint || ''));
        if (!s.open || preset) b.disabled = true;
        b.addEventListener('click', () => { if (b.disabled) return; G.audio.pick(); res(o); });
        list.appendChild(b);
        if (s.open && first && !preset) { first = false; setTimeout(() => b.isConnected && b.focus({ preventScroll: true }), 30); }
      });
      ctx.tray(h('div.choice-tray', step.hint ? h('div.tray-hint', boldNodes(step.hint)) : null, list));
      if (preset) setTimeout(() => { G.audio.pick(); res(preset); }, 450);
    });
    list.querySelectorAll('.opt').forEach((b, i) => { b.disabled = true; b.classList.add(step.options[i] === pick ? 'picked' : 'dim'); });
    ctx.main.appendChild(h('div.para.picked-line.show', '▸ ', boldNodes(pick.label || pick.t || '')));
    await G.util.wait(260);
    ctx.tray(null);
    const r = G.rules.applyStep(step, { place, key, decision: pick.id, force: !!(prev && prev.choice) });
    if (r && r.collapse) await steps.collapse(r.collapse, ctx);
    if (pick.reply && pick.reply.length) await steps.lines(pick.reply, ctx, '▶');
    await steps.cardMoment(ctx, steps.compareCard(step, pick.id), step.next || '다음 ▶');
  });

  // ───────── gauge: 게이지 변동(고정 사건이면 fixed:true — 원작 궤적에도 똑같이 반영) ─────────
  //  { id, type:'gauge', fixed?:true, gauge:{ yeon?, saeng? }, scene?, lines?:[줄…], when? }
  steps.register('gauge', async function (step, ctx) {
    if (step.scene && ctx.setScene) ctx.setScene(step.scene);
    const r = G.rules.applyStep(step, { place: placeOf(ctx), key: keyOf(ctx, step) });
    if (step.lines && step.lines.length) await steps.lines(step.lines, ctx, step.next || '다음 ▶');
    if (r && r.collapse) await steps.collapse(r.collapse, ctx);
  });

  // ───────── know: 지식 얻기(NPC 탐색 등) ─────────
  //  { id, type:'know', know:'k-japanese', lines?:[줄…] } — 지혜의 길을 여는 조건이 된다
  steps.register('know', async function (step, ctx) {
    G.rules.applyStep(step, { place: placeOf(ctx), key: keyOf(ctx, step) });
    if (step.lines && step.lines.length) await steps.lines(step.lines, ctx, step.next || '다음 ▶');
  });

  // ───────── frag: 시구 조각 얻기 ─────────
  //  { id, type:'frag', n:1~4, lines?:[줄…] } — 조각의 글(원문·풀이)은 정답 시(js/data/poem.js의 POEM.lines)의 n행
  steps.register('frag', async function (step, ctx) {
    if (step.scene && ctx.setScene) ctx.setScene(step.scene);
    G.rules.applyStep(step, { place: placeOf(ctx), key: keyOf(ctx, step) });
    if (step.lines && step.lines.length) await steps.lines(step.lines, ctx, step.next || '다음 ▶');
  });

  // ───────── dream: 장육불 꿈 장면 ─────────
  //  { id, type:'dream', fixed?:true, gauge?:{ yeon:1 }, lines?:[줄…], quote?:{원문,풀이}, scene? }
  //  fixed:true(낭고야 고정 꿈): 원작 궤적에도 반영. 고정 꿈이 쓰러짐을 이미 겸했으면 다시 보이지 않는다.
  //  장육불 횟수는 세지 않는다(쓰러짐으로 본 것만 센다).
  steps.register('dream', async function (step, ctx) {
    const r = G.rules.applyStep(step, { place: placeOf(ctx), key: keyOf(ctx, step) });
    if (r && r.skipped && !r.again) return;
    const D = TX().DREAM || {};
    if (ctx.setScene && (step.scene || D.scene)) ctx.setScene(step.scene || D.scene);
    await steps.cardMoment(ctx, steps.dreamView({ kind: 'dream', lines: step.lines || null }, { zero: false, quote: step.quote }), step.next || '다음 ▶');
  });

  // ───────── card: 카드 띄우기(역사 카드면 지식을 얻는다) + 이야기 수첩에 넣기 ─────────
  //  { id, type:'card', history?:'h-…'(역사 카드 id: 지식이 된다), know?:'id', lines?:[줄…], card?:{ kind, title, body, quote, src } }
  //  history가 있으면 js/data/history.js의 같은 id 카드가 먼저이고, 없으면 step.card를 쓴다.
  steps.register('card', async function (step, ctx) {
    const place = placeOf(ctx);
    if (step.lines && step.lines.length) await steps.lines(step.lines, ctx, '▶');
    G.rules.applyStep(step, { place, key: keyOf(ctx, step) });
    const data = step.history ? G.rules.cardOf({ kind: 'history', id: step.history, place, step: step.id }) : step.card;
    await steps.cardMoment(ctx, steps.infoCard(data, step.history ? 'history' : 'note'), step.next || '다음 ▶');
  });
})();
