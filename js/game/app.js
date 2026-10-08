'use strict';
// 화면 흐름: 타이틀 → (방식 고르기) → 거점 차례대로(js/data/flow.js의 order) → 끝.
//  화면 모드 두 가지
//   - 탐색 모드: 맵(탑다운 맵 또는 고지도)이 화면 전체를 채우고 구석에 HUD(js/core/hud.js)
//       왼쪽 위 초상+게이지 · 가운데 위 미션 · 오른쪽 위 수첩·지도·설정 · 왼쪽 아래 조이스틱 · 오른쪽 아래 행동 단추
//   - 사건 모드: 전체 삽화 한 폭 + 짧은 글 + 아래쪽 선택지. HUD는 위쪽 얇은 게이지 띠로 접힌다
//  세로 화면이면 "가로로 돌려 주세요" 안내만 보이고 게임은 멈춘다.
(function () {
  const { h, $$, T, boldNodes } = G.util;
  const ui = G.ui;
  const app = (G.app = {});
  const S = () => G.save.state;
  const root = () => document.getElementById('app');
  const FL = () => window.FLOW || { order: [], acts: {}, places: {}, modes: {} };

  // 다른 작업이 채우는 화면: 등록되어 있으면 부르고, 없으면 '준비 중'
  //  G.app.hooks.notebook() · G.app.hooks.codeEntry() · G.app.hooks.credits() · G.app.hooks.finish()
  app.hooks = { notebook: null, codeEntry: null, credits: null, finish: null };
  const HOOK_NAME = { notebook: '이야기 수첩', codeEntry: '이어 하기 글자 넣기', credits: '만든 사람·출처', finish: '이야기의 끝' };
  app.openHook = function (name, ...args) {
    const f = app.hooks[name];
    if (typeof f === 'function') return f(...args);
    if (name === 'notebook') return pocketNotebook();
    return ui.notReady(HOOK_NAME[name] || name);
  };
  // 수첩이 아직 등록되지 않았을 때: 챙긴 신표·얻은 시구 조각만 보여 주는 얇은 수첩
  function pocketNotebook() {
    return ui.sheet([h('h3', '이야기 수첩'), G.hud.pocketView(), h('p.small.muted', '수첩의 다른 쪽(인물·원문·역사)은 아직 준비 중이에요.')], undefined, { cls: 'notebook-mini' });
  }

  // 저장 열쇠 이름
  app.key = {
    place: (p) => 'p:' + p,
    beat: (p, b) => 'b:' + p + ':' + b,
    step: (p, s) => 's:' + p + ':' + s,
  };
  app.isDone = (p, stepId) => !!S().done[stepId ? app.key.step(p, stepId) : app.key.place(p)];

  // 아이콘: 둥근 끝 선으로 그린 손그림 느낌(색은 글자색을 따른다)
  const SV = (body) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' + body + '</svg>';
  const ICON = {
    gear: SV('<circle cx="12" cy="12" r="3.2"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7"/><circle cx="12" cy="12" r="6.6"/>'),
    book: SV('<path d="M3.5 5.2c2.9-1.2 5.9-1.2 8.5.8 2.6-2 5.6-2 8.5-.8v13.6c-2.9-1.1-5.9-1.1-8.5.9-2.6-2-5.6-2-8.5-.9z"/><path d="M12 6v13.7"/><path d="M6.3 9c1.3-.3 2.6-.2 3.7.3M6.3 12c1.3-.3 2.6-.2 3.7.3M14 9.3c1.1-.5 2.4-.6 3.7-.3"/>'),
    map: SV('<path d="M3 6.2 8.6 4l6.8 2.3L21 4.2v13.6l-5.6 2.2-6.8-2.3L3 19.8z"/><path d="M8.6 4v13.7M15.4 6.3V20"/><path d="M11 11.5c.8-.9 1.6-.9 2.2 0" stroke-dasharray="1 1.6"/>'),
    home: SV('<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-5h4v5"/>'),
    skip: SV('<path d="M5 5l8 7-8 7z"/><path d="M13 5l6 7-6 7"/>'),
    ear: SV('<path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="3" y="14" width="4" height="6" rx="1.5"/><rect x="17" y="14" width="4" height="6" rx="1.5"/>'),
    musicOn: SV('<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>'),
    musicOff: SV('<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/><path d="M3 3l18 18"/>'),
    close: SV('<path d="M6 6l12 12M18 6 6 18"/>'),
  };
  app.ICON = ICON;
  const iconBtn = (name, label, fn, cls = '') => h('button.icon-btn' + cls, { type: 'button', 'aria-label': label, title: label, html: ICON[name], on: { click: (e) => { e.currentTarget.blur(); G.audio.tap(); fn(); } } });
  app.iconBtn = iconBtn;

  // ───────── 설정 적용·세로 화면 ─────────
  app.applySettings = function () {
    const st = S();
    document.documentElement.style.setProperty('--fs', st.font);
    document.documentElement.classList.toggle('teacher', !!st.teacher);
    if (G.hud) G.hud.refresh();
  };
  app.portrait = false;
  app.watchOrientation = function () {
    const mq = window.matchMedia ? window.matchMedia('(orientation: portrait)') : null;
    const upd = () => {
      app.portrait = mq ? mq.matches : window.innerHeight > window.innerWidth;
      document.documentElement.classList.toggle('portrait', app.portrait);
    };
    if (mq) { if (mq.addEventListener) mq.addEventListener('change', upd); else if (mq.addListener) mq.addListener(upd); }
    window.addEventListener('resize', upd);
    upd();
    if (!document.getElementById('rotate')) {
      document.body.appendChild(h('div#rotate', { role: 'alert' },
        h('div.rot-phone', h('i')),
        h('strong', '가로로 돌려 주세요'),
        h('p', '이 게임은 가로 화면에서 해요. 휴대폰을 옆으로 눕혀 주세요.')));
    }
  };

  // ───────── 거점 정보 ─────────
  app.order = () => FL().order.slice();
  // 거점 이름·막·미션·고지도 자리를 한데 모은다(거점 파일 값이 먼저, 없으면 flow.js)
  app.placeInfo = function (id) {
    const base = (FL().places || {})[id] || {};
    const p = (window.PLACES || {})[id] || {};
    const act = p.act || base.act || 1;
    const A = (FL().acts || {})[act] || {};
    return {
      id, name: p.name || base.name || id, act,
      actName: A.name ? A.name + (A.title ? ' 「' + A.title + '」' : '') : '',
      mission: p.mission != null ? p.mission : (base.mission != null ? base.mission : A.mission || ''),
      node: p.node || base.node || null,
      ready: !!(window.PLACES || {})[id],
    };
  };

  // ───────── 타이틀 ─────────
  function leavePlay() {
    app._playToken = null;
    closeEvent();
    if (G.world) G.world.busy = 0;
  }
  app.title = function () {
    ui.unpop();
    leavePlay();
    const st = S(), F = FL();
    const started = G.save.started();
    G.audio.play('title');
    const r = root(); r.innerHTML = '';
    r.className = 'scr-title';
    const btn = (label, cls, fn) => h('button.btn' + (cls ? '.' + cls : ''), { type: 'button', on: { click: () => { G.audio.unlock(); G.audio.tap(); fn(); } } }, label);
    const menu = h('div.menu',
      started ? btn('이어 하기', 'primary.big', () => app.continue()) : btn('이야기 시작', 'primary.big', () => app.newGame()),
      h('div.menu-row',
        btn('이어 하기 글자 넣기', 'dark', () => app.openHook('codeEntry')),
        started ? btn('처음부터', 'dark', () => app.resetAll()) : null),
      h('div.menu-row',
        btn('이야기 수첩', 'dark.small', () => app.openHook('notebook')),
        btn('만든 사람·출처', 'dark.small', () => app.openHook('credits'))));
    r.appendChild(h('div.title-screen',
      h('div.title-art', { 'aria-hidden': 'true' }, h('img', { src: app.TITLE_ART, alt: '', decoding: 'async' })),
      h('div.title-main',
        h('div.logo', h('div.pre', F.pre || ''), h('h1', F.title || ''), h('div.sub', F.subtitle || ''), F.tagline ? h('div.tagline', F.tagline) : null),
        h('div.title-side', menu)),
      h('div.title-foot',
        h('div.hint', h('span.ic', { html: ICON.ear }), F.hint || ''),
        h('div.credits-line',
          st.teacher ? h('div.credit.teacher', '선생님용이 켜져 있어요') : null,
          h('div.credit.maker', ((window.NOTES || {}).credits || {}).maker || ''))),
      h('div.title-tools', musicToggle(), iconBtn('gear', '설정', () => app.settings()))));
  };
  // 타이틀 그림(현대 그림책풍: 밤바다 뱃머리의 옥영). 다른 그림으로 바꾸려면 이 값을 고친다
  app.TITLE_ART = 'assets/ui/title.webp';
  function musicToggle() {
    const b = h('button.icon-btn.music-toggle', { type: 'button' });
    const draw = () => { const on = S().music; b.innerHTML = ICON[on ? 'musicOn' : 'musicOff']; b.setAttribute('aria-label', on ? '배경음 끄기' : '배경음 켜기'); b.title = on ? '배경음 끄기' : '배경음 켜기'; b.classList.toggle('off', !on); };
    b.addEventListener('click', () => { const st = S(); st.music = !st.music; G.save.write(); G.audio.unlock(); G.audio.music(st.music); G.audio.tap(); draw(); });
    draw();
    return b;
  }

  // 이야기 시작: 방식 고르기 → 첫 거점
  app.newGame = async function () {
    const M = FL().modes || {};
    const opt = (k) => M[k] || { name: k, who: '', desc: '' };
    const mode = await ui.sheet([
      h('h3', '어떻게 읽을까요?'),
      h('div.mode-cards',
        ...['basic', 'deep'].map((k) => h('div.mode-card', h('b', opt(k).name), h('small', opt(k).who), h('p', opt(k).desc)))),
      h('p.small.muted', '설정에서 언제든 바꿀 수 있어요.'),
    ], [{ label: opt('deep').name + ' (' + opt('deep').who + ')', value: 'deep' }, { label: opt('basic').name + ' (' + opt('basic').who + ')', value: 'basic', cls: 'primary' }], { cls: 'mode-sheet' });
    if (!mode) return;
    const st = S();
    st.mode = mode;
    if (!st.startedAt) st.startedAt = Date.now();
    G.save.write();
    app.play(app.order()[0]);
  };
  app.continue = function () {
    const st = S();
    const order = app.order();
    const id = st.place && order.includes(st.place) && !st.done[app.key.place(st.place)] ? st.place : order.find((p) => !st.done[app.key.place(p)]);
    if (!id) return app.finish();
    app.play(id);
  };
  // 처음부터: 진행과 이름을 지우고 설정은 남긴다
  app.resetAll = async function () {
    const ok = await ui.sheet([h('h3', '처음부터 다시 할까요?'), h('p', '지금까지의 진행, 모은 신표·시구 조각, 적어 둔 이름이 모두 지워져요. 글자 크기·소리 같은 설정은 그대로예요.')],
      [{ label: '그만두기', value: false }, { label: '처음부터', value: true, cls: 'seal' }]);
    if (!ok) return false;
    leavePlay();
    G.save.reset();
    app.title();
    ui.toast('처음부터 시작할 수 있어요');
    return true;
  };

  // ───────── 놀이 화면 틀(탐색 모드) ─────────
  let playEl = null;
  app.explore = function (info) {
    const r = root();
    if (!playEl || !playEl.isConnected) {
      r.innerHTML = '';
      r.className = 'scr-play';
      const els = G.hud.build();
      const stage = h('div.mapstage');
      playEl = h('div.play', h('div.mapwrap', stage), h('div.hud', els.panel, els.mission, els.tools), els.strip);
      r.appendChild(playEl);
      G.hud.tools(
        [h('button.btn.small.teacher-only.skip-goal', { type: 'button', on: { click: () => { G.audio.tap(); if (!(G.world && G.world.skipGoal())) ui.toast('건너뛸 목표가 없어요'); } } }, h('span.ic', { html: ICON.skip }), '목표 건너뛰기'),
          iconBtn('book', '이야기 수첩', () => app.openHook('notebook')), iconBtn('map', '지도', () => app.openMap()), iconBtn('gear', '설정', () => app.settings())],
        [iconBtn('gear', '설정', () => app.settings()), h('button.btn.small.teacher-only.skip-scene', { type: 'button', on: { click: () => { G.audio.tap(); if (app._skip) app._skip(); } } }, h('span.ic', { html: ICON.skip }), '장면 건너뛰기')]);
    }
    G.hud.setPlace(info || {});
    G.hud.refresh(true);
    return playEl;
  };
  // 오른쪽 위 '지도': 고지도를 겹쳐 띄워 지금 있는 곳을 본다(탑다운 맵은 그대로 멈춰 있다)
  app.openMap = function () {
    const info = G.hud.info || {};
    return G.oldmap.peek({ at: info.node || app.placeInfo(S().place || '').node, title: '고지도', note: info.name ? '지금 있는 곳: **' + info.name + '**' : '' });
  };
  app.mapArea = function () {
    if (!playEl || !playEl.isConnected) app.explore(G.hud.info || {});
    return playEl.querySelector('.mapstage');
  };
  // 맵 자리를 빈 종이로(맵이 없는 거점)
  function blankStage(text) {
    const a = app.mapArea();
    a.innerHTML = '';
    a.appendChild(h('div.stage-blank', text ? h('p', text) : null));
  }

  // ───────── 사건 모드 ─────────
  //  ctx = app.openEvent({ place, scene }) → 단계 실행기가 쓰는 자리. 다 쓰면 ctx.close()
  let evEl = null;
  function closeEvent() {
    if (evEl) { evEl.remove(); evEl = null; }
    if (playEl) playEl.classList.remove('evmode');
    app._skip = null;
  }
  app.openEvent = function (o = {}) {
    closeEvent();
    if (!playEl || !playEl.isConnected) app.explore(G.hud.info || {});
    const art = h('div.ev-art');
    const main = h('div.ev-main.main-inner');
    const tray = h('div.ev-tray.hide');
    const box = h('div.ev-box', h('div.ev-scroll', main), tray);
    evEl = h('div.event.on', { role: 'dialog', 'aria-label': '사건' }, art, box);
    playEl.appendChild(evEl);
    playEl.classList.add('evmode');
    const el = evEl;
    const ctx = {
      main, mode: 'event', place: o.place || null, placeId: o.place ? o.place.id : null, el,
      tray(content) { G.ui.fillTray(tray, content); },
      trayEl: () => tray,
      refresh() { G.hud.refresh(); },
      // 전체 삽화 바꾸기: 그림 파일이 목록에 있으면 그림, 없으면 빈 종이 판(+ 그림 설명)
      setScene(id) {
        art.innerHTML = '';
        art.dataset.scene = id || '';
        if (!id) return;
        const src = G.util.art('sc', id);
        let cap = '';
        const P = window.PLACES || {};
        for (const k in P) { const p = P[k]; if (p && p.scenes && p.scenes[id]) { cap = p.scenes[id].caption || p.scenes[id].alt || ''; break; } }
        art.appendChild(src ? h('img', { src, alt: cap }) : h('div.blank-paper', cap ? h('span.cap', cap) : null));
      },
      close() { if (evEl === el) closeEvent(); else el.remove(); },
    };
    ctx.setScene(o.scene || null);
    return ctx;
  };

  // 단계 여럿을 사건 화면에서 차례로 펼친다(맵 없는 거점·목표에 묶인 단계 모두 이것을 쓴다)
  //  - 끝낸 단계는 건너뛴다(이어 하기). 하다 말고 껐으면 그 단계를 시작할 때의 게이지·신표·조각으로 되돌리고 다시 한다
  //  - 선생님용: 위쪽 띠의 '장면 건너뛰기'로 지금 단계를 넘긴다
  app.runSteps = async function (place, ids, o = {}) {
    const st = S();
    const pid = place.id;
    const all = place.steps || [];
    const list = (ids || all.map((s) => s.id)).map((id) => all.find((s) => s.id === id)).filter(Boolean)
      .filter((s) => !st.done[app.key.step(pid, s.id)]);
    if (!list.some((s) => G.steps.ok(s.when))) return true;
    const token = app._playToken;
    const ctx = o.inline && G.world && G.world.openDlg ? G.world.openDlg() : app.openEvent({ place, scene: o.scene });
    if (G.world && ctx.mode === 'event') G.world.busy++;
    ctx.preset = o.preset || null;
    try {
      for (const step of list) {
        if (!G.steps.ok(step.when)) continue;
        ctx.main.innerHTML = ''; ctx.tray(null);
        if (step.music) G.audio.play(step.music);
        const sk = app.key.step(pid, step.id);
        if (st.snap[sk]) Object.assign(st, JSON.parse(JSON.stringify(st.snap[sk])));
        else { const snap = {}; for (const k of G.save.snapKeys) snap[k] = st[k]; st.snap[sk] = JSON.parse(JSON.stringify(snap)); }
        G.save.write(); G.hud.refresh();
        const skip = new Promise((res) => { app._skip = () => { G.ui.toast('장면을 건너뛰었어요'); res('skip'); }; });
        let r;
        try { r = await Promise.race([G.steps.run(step, ctx), skip]); }
        catch (e) {
          console.error('단계 오류', pid, step.id, e);
          ctx.main.innerHTML = '';
          ctx.main.appendChild(h('div.card.note', h('span.kind', '오류'), h('h3', '이 장면을 펼치다가 문제가 생겼어요'), h('p.small', '다음으로 넘어가요.')));
          await G.steps.nextButton(ctx, '넘어가기 ▶');
        }
        app._skip = null;
        if (app._playToken !== token) return false;
        st.done[sk] = true;
        delete st.snap[sk];
        if (step.fx && r !== 'skip') G.steps.apply(step.fx, ctx);
        G.save.write(); G.hud.refresh();
      }
    } finally {
      if (G.world && ctx.mode === 'event') G.world.busy = Math.max(0, G.world.busy - 1);
      if (ctx.mode === 'event') ctx.close(); else if (G.world) G.world.closeDlg(ctx);
      if (G.world && G.world.music) G.audio.play(G.world.music);
    }
    return true;
  };

  // 거점 첫 화면: 막·거점 이름·소개
  app.titleCard = async function (place, info, resumed) {
    const ctx = app.openEvent({ place, scene: place && place.cover });
    ctx.el.classList.add('cardmode');
    ctx.main.appendChild(h('div.place-card',
      info.actName ? h('div.pc-act', info.actName) : null,
      h('h2.pc-name', info.name),
      info.mission ? h('div.pc-mission', info.mission) : null,
      place && place.intro ? h('p.pc-intro', boldNodes(place.intro)) : null));
    await G.steps.nextButton(ctx, resumed ? '이어서 ▶' : '펼치기 ▶');
    ctx.close();
  };

  // ───────── 거점 진행 ─────────
  app.play = async function (placeId) {
    ui.unpop();
    closeEvent();
    const token = (app._playToken = {});
    const st = S();
    const info = app.placeInfo(placeId);
    st.place = placeId; G.save.write();
    app.explore(info);
    const place = (window.PLACES || {})[placeId];
    if (!place) { await app.notReadyPlace(placeId, info, token); return; }
    place.id = place.id || placeId;
    G.audio.chapter();
    const beats = place.beats || [];
    const resumed = beats.some((b) => st.done[app.key.beat(placeId, b.id)]) || (place.steps || []).some((s) => st.done[app.key.step(placeId, s.id)]);
    let ok;
    if (place.map && G.world && G.world.mapDef(place.map)) {
      blankStage();
      await app.titleCard(place, info, resumed);
      if (app._playToken !== token) return;
      ok = await G.world.play(placeId);
    } else {
      blankStage(info.name);
      if (place.music) G.audio.play(place.music);
      await app.titleCard(place, info, resumed);
      if (app._playToken !== token) return;
      ok = await app.playEvents(place, token);
    }
    if (!ok || app._playToken !== token) return;
    st.done[app.key.place(placeId)] = true; G.save.write();
    app.next(placeId);
  };
  // 맵 없는 거점(막간 등): 목표가 있으면 목표마다, 없으면 단계를 차례로
  app.playEvents = async function (place, token) {
    const st = S();
    const beats = place.beats || [];
    if (!beats.length) return app.runSteps(place, null);
    for (const b of beats) {
      if (!G.steps.ok(b.when) || st.done[app.key.beat(place.id, b.id)]) continue;
      if (b.music) G.audio.play(b.music);
      if (b.say) { const ctx = app.openEvent({ place, scene: b.scene }); await G.steps.lines(b.say, ctx); ctx.close(); }
      if (app._playToken !== token) return false;
      if (b.steps) await app.runSteps(place, b.steps, { scene: b.scene });
      if (app._playToken !== token) return false;
      st.done[app.key.beat(place.id, b.id)] = true; G.save.write();
    }
    return true;
  };
  // 아직 비어 있는 거점: '준비 중' 안내 후 다음 거점으로 넘어갈 수 있다
  app.notReadyPlace = async function (placeId, info, token) {
    blankStage(info.name);
    const ctx = app.openEvent({});
    ctx.el.classList.add('cardmode');
    ctx.main.appendChild(h('div.place-card.notready',
      info.actName ? h('div.pc-act', info.actName) : null,
      h('h2.pc-name', info.name),
      h('div.pc-mission', '준비 중'),
      h('p.pc-intro', '이 거점은 아직 만드는 중이에요. 다음 거점으로 넘어가거나 타이틀로 돌아갈 수 있어요.')));
    const go = await new Promise((res) => {
      ctx.tray(h('div.actions',
        G.steps.actionBtn('타이틀로', '', () => res('title')),
        G.steps.actionBtn('다음 거점 ▶', 'primary', () => res('next'))));
    });
    ctx.close();
    if (app._playToken !== token) return;
    if (go === 'title') return app.title();
    app.next(placeId);
  };
  // 다음 거점: 고지도 위로 옮겨 간 뒤 펼친다
  app.next = async function (placeId) {
    const order = app.order();
    const nextId = order[order.indexOf(placeId) + 1];
    const token = (app._playToken = {});
    if (!nextId) return app.finish();
    S().place = nextId; G.save.write();
    await app.travel(placeId, nextId);
    if (app._playToken !== token) return;
    app.play(nextId);
  };
  // 거점 사이 옮겨 가기(기본: 고지도에서 배가 건너간다). 다른 파일이 바꿀 수 있다: G.app.travel = async (from, to) => {}
  app.travel = async function (fromId, toId) {
    const a = app.placeInfo(fromId), b = app.placeInfo(toId);
    const P = (window.PLACES || {})[toId];
    if (!a.node || !b.node || a.node === b.node || (P && P.travel === false)) return;
    G.hud.setPlace(b);
    await G.oldmap.show({ from: a.node, to: b.node, title: b.name + G.util.josa(b.name, '으로') + ' 가는 길' });
  };
  app.finish = function () {
    const st = S();
    if (!st.finishedAt) { st.finishedAt = Date.now(); G.save.write(); }
    if (typeof app.hooks.finish === 'function') return app.hooks.finish();
    closeEvent();
    const ctx = app.openEvent({});
    ctx.el.classList.add('cardmode');
    ctx.main.appendChild(h('div.place-card', h('h2.pc-name', '이야기의 끝'), h('p.pc-intro', '결과 화면은 아직 만드는 중이에요.')));
    ctx.tray(h('div.actions', G.steps.actionBtn('타이틀로', 'primary', () => app.title())));
  };

  // ───────── 설정 ─────────
  app.settings = async function () {
    const st = S();
    const M = FL().modes || {};
    const seg = (label, key, opts) => h('div.seg', h('div.seg-l', label),
      h('div.seg-opts', { role: 'group', 'aria-label': label }, opts.map(([v, t]) => {
        const b = h('button.btn.small' + (st[key] === v ? '.primary' : ''), { type: 'button', 'aria-pressed': st[key] === v ? 'true' : 'false' }, t);
        b.addEventListener('click', () => {
          G.audio.tap(); st[key] = v; G.save.write(); app.applySettings();
          if (key === 'music') G.audio.music(st.music);
          $$('.btn', b.parentNode).forEach((x) => { x.classList.toggle('primary', x === b); x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        });
        return b;
      })));
    const inGame = !!(playEl && playEl.isConnected);
    const res = await ui.sheet([
      h('h3', '설정'),
      h('div.seg-grid',
        seg('글자 크기', 'font', [[1, '보통'], [1.15, '크게'], [1.3, '아주 크게']]),
        seg('소리(효과음)', 'sound', [[true, '켜기'], [false, '끄기']]),
        seg('배경음', 'music', [[true, '켜기'], [false, '끄기']]),
        seg('방식', 'mode', [['basic', (M.basic || {}).name || '처음 배우기'], ['deep', (M.deep || {}).name || '깊이 읽기']]),
        seg('선생님용', 'teacher', [[false, '끄기'], [true, '켜기']])),
      h('div.set-notes',
        h('p.small.muted', '선생님용을 켜면 게이지에 숫자가 보이고, 장면·목표를 건너뛸 수 있어요. 주소 끝에 ?teacher=1을 붙여도 켜져요.'),
        h('p.small.muted', '진행 상황은 이 브라우저에만 저장돼요(서버로 보내지 않아요).')),
    ], inGame ? [{ label: '타이틀로', value: 'title' }, { label: '닫기', value: true, cls: 'primary' }] : [{ label: '닫기', value: true, cls: 'primary' }], { cls: 'settings-sheet' });
    if (res === 'title') app.title();
    else if (!inGame && root().classList.contains('scr-title')) app.title(); // 선생님용 표시 등을 다시 그린다
  };

  // ───────── 저장 도구: 캔버스를 그림 파일로 내려받기(결과 화면 등에서 쓴다) ─────────
  app.downloadCanvas = function (canvas, filename) {
    canvas.toBlob((blob) => {
      if (!blob) { ui.toast('이 기기에서는 저장이 안 돼요. 화면을 캡처해 주세요.'); return; }
      const a = h('a', { href: URL.createObjectURL(blob), download: filename || '두개의항로.png' });
      document.body.appendChild(a); a.click(); a.remove();
    }, 'image/png');
  };
  // 캔버스 줄바꿈(글자 단위). 다음 줄의 y를 돌려준다. dry면 그리지 않고 재기만 한다
  app.wrapText = function (g, text, x, y, maxW, lh, maxLines, dry) {
    const put = (t, yy) => { if (!dry) g.fillText(t, x, yy); };
    let line = '', n = 0;
    for (const ch of String(text)) {
      if (g.measureText(line + ch).width > maxW) {
        n++;
        if (n >= maxLines) { put(line.slice(0, -1) + '…', y); return y + lh; }
        put(line, y); y += lh; line = ch;
      } else line += ch;
    }
    if (line) put(line, y);
    return y + lh;
  };
})();
