'use strict';
// 단계 실행기: 단계 하나를 화면에 펼치고, 끝나면 resolve 한다.
//  ctx = { main, tray(content), trayEl(), refresh(), setScene(id), place, placeId, mode:'event'|'dlg', preset }
//   - main: 글·카드가 쌓이는 자리 / tray: 화면 아래 엄지 닿는 곳(단추·선택지) / setScene: 사건 화면 전체 삽화 바꾸기
//  단계 종류는 G.steps.register('종류', async (step, ctx) => { … })로 등록한다. 여기서는 say·choice만 둔다.
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
    box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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
  //  fx: { set:{…}(최상위 값), flags:{…}, gauge:{ yeon:+1, saeng:-2 }, token:{id,name}|[…], frag:{ 1:'시구' } }
  //  다른 파일이 효과를 더할 수 있다: G.steps.effects.이름 = (값, ctx, state) => {}
  steps.effects = {
    set: (v, ctx, st) => Object.assign(st, v),
    flags: (v, ctx, st) => Object.assign(st.flags, v),
    gauge: (v) => G.hud.change(v),
    token: (v) => { for (const t of [].concat(v)) G.hud.addToken(t); },
    frag: (v) => { for (const n in v) G.hud.setFrag(n, v[n]); },
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
    const box = h('div.says');
    ctx.main.appendChild(box);
    const list = (lines || []).filter((l) => typeof l === 'string' || steps.ok(l.when));
    for (let i = 0; i < list.length; i++) {
      const el = steps.line(list[i], ctx);
      if (!el) continue;
      box.appendChild(el);
      G.audio.page();
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      const last = !list.slice(i + 1).some((l) => typeof l === 'string' || !l.fx || l.t != null || l.who || l.card);
      await nextButton(ctx, last ? lastLabel : '▶');
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
    if (step.q) { const el = steps.line(step.who ? { who: step.who, t: step.q } : { t: step.q }, ctx); if (el) { ctx.main.appendChild(el); el.scrollIntoView({ block: 'nearest' }); } }
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
})();
