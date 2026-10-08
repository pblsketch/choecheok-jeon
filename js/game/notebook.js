'use strict';
// 이야기 수첩(spec §6-3)과 만든 사람·출처 화면
//  - 수첩: 모은 것(신표·시구 조각·이어 하기 글자) · 원작 대조 카드 · 역사 카드 · 게임 설정 카드 · 표기 안내 · (선생님용) 선생님 안내
//    '원작 대조' 탭에는 딜레마 카드와 함께, 이야기 중에 띄운 카드 단계(type:'card', history 없이 card:{ kind:'orig'|'letter'|'variant'… })도
//    플레이 차례(거점 차례 → 거점 안 단계 차례)로 모인다. 원작 카드는 붉은 낙관, 편지·이본 노트는 거점 파일에 적힌 이름(kindLabel)으로.
//    언제든 연다(타이틀·탐색 화면 오른쪽 위·HUD 초상). 선생님용이면 모든 카드가 열리고 역사 카드 아래 ⚠ 검수 거리가 보인다.
//    퉁소 소리를 다른 악기로 대신했으면(G.audio.tongso.instrument가 '퉁소'가 아니면) "퉁소 대신 ○○ 연주"라고 밝힌다.
//  - 만든 사람·출처: js/data/credits.js(CREDITS)를 읽어 보여 준다. 비어 있어도 만든이·원문 출처 줄은 늘 보인다.
//  글은 js/data/notes.js(NOTES.notebook·NOTES.credits), 카드 자료는 거점 파일·history.js
(function () {
  const { h, T, boldNodes } = G.util;
  const ui = G.ui;
  const S = () => G.save.state;
  const NB = (G.notebook = {});
  const N = () => window.NOTES || {};
  const NT = () => N().notebook || {};
  const list = (X) => (Array.isArray(X) ? X : X && typeof X === 'object' ? Object.values(X) : []);
  const histList = () => list(window.HISTORY).filter((x) => x && x.id);
  const order = () => ((window.FLOW || {}).order || []).slice();
  const placeName = (id) => (id && G.app.placeInfo ? G.app.placeInfo(id).name : '') || '';

  // ───────── 카드 목록 ─────────
  // 딜레마 카드 전체(거점 차례대로). 거점 파일에 아직 없는 딜레마는 notes.js의 표로 자리만 잡는다
  NB.dilemmaCards = function () {
    const P = window.PLACES || {};
    const out = [], seen = {};
    for (const pid of order()) {
      const p = P[pid];
      for (const s of (p && p.steps) || []) {
        if (!s || s.type !== 'dilemma' || !s.dilemma || seen[s.dilemma]) continue;
        seen[s.dilemma] = true;
        out.push({ id: s.dilemma, kind: s.orig != null ? 'orig' : 'fiction', place: pid, step: s.id });
      }
    }
    const D = N().dilemmas || [];
    for (const d of D) if (!seen[d.id]) out.push({ id: d.id, kind: d.orig != null ? 'orig' : 'fiction', place: d.place, step: null, stub: true });
    const idx = (id) => { const i = D.findIndex((d) => d.id === id); return i < 0 ? 99 : i; };
    return out.sort((a, b) => idx(a.id) - idx(b.id) || order().indexOf(a.place) - order().indexOf(b.place));
  };
  NB.historyCards = () => histList().map((c) => ({ id: c.id, kind: 'history', place: c.place || null, step: null }));
  // 학생이 모은 카드(수첩 장부)
  const mine = (id) => (S().cards || []).find((c) => c.id === id) || null;
  // 이야기 속 카드(역사 카드가 아닌 카드 단계: 원작 장면·옥영이 모르는 소식·이본 노트 …). 거점 차례 → 단계 차례
  //  같은 카드가 처음 배우기·깊이 읽기로 나뉘어 있으면(card.id가 같다) 한 자리로: 모았으면 실제로 본 쪽, 아니면 지금 방식에 맞는 쪽
  NB.storyCards = function () {
    const P = window.PLACES || {};
    const st = S();
    const out = [], at = {};
    for (const pid of order()) {
      const p = P[pid];
      for (const s of (p && p.steps) || []) {
        if (!s || s.type !== 'card' || s.history || !s.card) continue;
        const id = s.card.id || s.id;
        const e = { id, kind: s.card.kind || 'note', place: pid, step: s.id, label: s.card.kindLabel || '', story: true };
        if (at[id] == null) { at[id] = out.length; out.push(e); continue; }
        if (s.when && G.rules.ok(s.when, st) && !(out[at[id]].fit)) out[at[id]] = Object.assign(e, { fit: true });
      }
    }
    return out.map((e) => { const m = mine(e.id); return m && m.place && m.step ? Object.assign({}, e, { place: m.place, step: m.step }) : e; });
  };
  // '원작 대조' 탭: 딜레마 카드와 이야기 속 카드를 플레이 차례로(거점 자료에 아직 없는 딜레마 자리는 그 거점 끝에)
  NB.origCards = function () {
    const P = window.PLACES || {};
    const pos = (e) => {
      const steps = ((P[e.place] || {}).steps) || [];
      const i = steps.findIndex((s) => s && (s.id === e.step || (e.kind !== 'history' && !e.story && s.dilemma === e.id)));
      return [order().indexOf(e.place), i < 0 ? 9999 : i];
    };
    const all = NB.dilemmaCards().concat(NB.storyCards()).map((e, n) => ({ e, p: pos(e), n }));
    return all.sort((a, b) => a.p[0] - b.p[0] || a.p[1] - b.p[1] || a.n - b.n).map((x) => x.e);
  };
  const dilemmaName = (id) => ((N().dilemmas || []).find((d) => d.id === id) || {}).name || '';

  // 딜레마 단계 찾기
  function stepOf(entry) {
    const P = window.PLACES || {};
    const p = P[entry.place];
    let s = p && (p.steps || []).find((x) => x && (x.id === entry.step || x.dilemma === entry.id));
    if (!s) for (const k in P) { const q = P[k]; s = q && (q.steps || []).find((x) => x && x.dilemma === entry.id); if (s) break; }
    return s || null;
  }
  // 카드 한 장(오른쪽 펼침)
  function cardView(entry) {
    const st = S();
    if (entry.kind === 'history') {
      const data = G.rules.cardOf({ kind: 'history', id: entry.id, place: entry.place, step: entry.step });
      const el = G.steps.infoCard(data, 'history');
      dropSaved(el);
      if (st.teacher && data && data.review && data.review.length) {
        el.appendChild(h('div.nb-review', h('b', NT().review || '⚠ 선생님 검수'), h('ul', data.review.map((r) => h('li', boldNodes(r))))));
      }
      return el;
    }
    if (entry.story) {
      const data = G.rules.cardOf({ kind: entry.kind, id: entry.id, place: entry.place, step: entry.step });
      const el = G.steps.infoCard(data, entry.kind);
      dropSaved(el);
      return el;
    }
    const step = stepOf(entry);
    if (!step) {
      return h('div.card.rcard.' + entry.kind, h('span.kind', entry.kind === 'orig' ? '원작 대조' : '게임 창작'),
        h('h3', dilemmaName(entry.id) || entry.id), h('p.small.muted', '이 장면의 카드는 아직 거점 자료에 없어요.'));
    }
    const el = G.steps.compareCard(step, (st.choices || {})[step.dilemma]);
    dropSaved(el);
    return el;
  }
  function storyTitle(e) {
    const p = (window.PLACES || {})[e.place];
    const s = p && (p.steps || []).find((x) => x && x.id === e.step);
    return (s && s.card && s.card.title) || e.id;
  }
  function dropSaved(el) { const s = el && el.querySelector('.rc-saved'); if (s) s.remove(); }

  // 퉁소 소리 안내: 다른 악기로 대신했으면 밝힌다
  NB.soundNote = function () {
    const tg = G.audio && G.audio.tongso;
    let inst = null;
    try { inst = tg ? tg.instrument : null; } catch (e) { inst = null; }
    if (inst && inst !== '퉁소') return G.rules.fill(NT().soundSub || '퉁소 대신 {inst} 연주', { inst });
    if (!inst) return NT().soundSynth || '';
    return '';
  };

  // ───────── 탭 내용 ─────────
  function pane(lead, ...kids) { return h('div.nb-pane', lead ? h('p.nb-lead', lead) : null, ...kids); }

  // 모은 것: 신표·시구 조각 + 이어 하기 글자 + 카드 수
  function pocketPane() {
    const st = S();
    const D = NB.dilemmaCards().concat(NB.storyCards()), Hs = NB.historyCards();
    const nOrig = D.filter((c) => mine(c.id)).length, nHist = Hs.filter((c) => mine(c.id)).length;
    const sound = NB.soundNote();
    return pane(NT().pocketLead,
      G.hud.pocketView(),
      h('div.nb-tally',
        h('div.nb-stat', h('b', nOrig + ' / ' + D.length), h('span', '원작 대조 카드')),
        h('div.nb-stat', h('b', nHist + ' / ' + Hs.length), h('span', '역사 카드')),
        st.resumeCode ? h('div.nb-stat.code', h('b', G.code.pretty(st.resumeCode)), h('span', NT().code || '이어 하기 글자')) : null),
      sound ? h('p.nb-sound', h('span.nb-sound-k', NT().sound || '퉁소 소리'), sound) : null);
  }

  // 카드 목록 + 펼침(두 쪽 책)
  function cardsPane(lead, entries, lockedText) {
    const st = S();
    const open = (e) => !!st.teacher || !!mine(e.id);
    const items = entries.map((e) => ({ e, open: open(e) }));
    const detail = h('div.nb-detail');
    const listEl = h('div.nb-list', { role: 'list' });
    let cur = null;
    const show = (it, btn) => {
      cur = it;
      listEl.querySelectorAll('.nb-item').forEach((b) => b.classList.toggle('on', b === btn));
      detail.innerHTML = '';
      detail.appendChild(cardView(it.e));
      detail.scrollTop = 0;
    };
    items.forEach((it, i) => {
      const e = it.e;
      const title = e.kind === 'history' ? ((histList().find((x) => x.id === e.id) || {}).title || e.id) : e.story ? storyTitle(e) : (dilemmaName(e.id) || e.id);
      const tag = e.story ? (e.label || (e.kind === 'orig' ? '원작' : (ui.KIND || {})[e.kind] || '')) : e.kind === 'orig' ? '원작' : e.kind === 'fiction' ? '게임 창작' : '';
      const b = h('button.nb-item.' + e.kind + (e.story ? '.story' : '') + (it.open ? '' : '.locked'), { type: 'button', role: 'listitem', 'aria-disabled': it.open ? null : 'true' },
        h('span.nb-no', String(i + 1)),
        h('span.nb-it',
          h('small', placeName(e.place) + (tag ? ' · ' + tag : '')),
          h('b', it.open ? T(title) : lockedText)));
      if (it.open) b.addEventListener('click', () => { G.audio.tap(); show(it, b); });
      listEl.appendChild(b);
    });
    const first = items.findIndex((it) => it.open);
    if (first >= 0) show(items[first], listEl.children[first]);
    else detail.appendChild(h('div.nb-empty', h('p', NT().empty || '')));
    return h('div.nb-pane.cards', lead ? h('p.nb-lead', lead, st.teacher ? h('span.nb-teach', NT().teacherAll || '') : null) : null,
      h('div.nb-spread', listEl, detail));
  }

  function fictionPane() {
    return pane(NT().fictionLead, h('div.nb-fiction', (N().fiction || []).map((c) => h('div.card.rcard.fiction.nb-fic',
      h('span.kind', G.steps.mark('게임 설정')),
      h('h3', T(c.title)), h('p', boldNodes(c.body)),
      c.real ? h('div.nb-real', h('b', '원작에서는'), h('p', boldNodes(c.real))) : null))));
  }

  function marksPane() {
    const M = N().marks || {};
    return pane(NT().marksLead, h('div.nb-marks', Object.keys(M).map((k) => h('div.nb-mark', G.steps.mark(k), h('p', M[k].desc || '')))),
      h('div.nb-kinds',
        h('div.nb-kind.orig', h('span.seal-mark', '原作'), h('p', h('b', '원작 대조 카드'), ' — 원작의 옥영이 실제로 한 일')),
        h('div.nb-kind.fiction', h('i'), h('p', h('b', '게임 창작 카드'), ' — 원작에 없는 장면. "원작의 옥영이라면?"')),
        h('div.nb-kind.history', h('i'), h('p', h('b', '역사 카드'), ' — 작품 바깥의 실제 역사'))));
  }

  // 1막 자리: 이어 하기 글자로 되살렸거나(act1Done) 2막부터 시작했으면(act2Only) 단계 기록이 없어도 연다
  const opened = (e) => { const st = S(); return !!st.teacher || (e.act === 1 && (st.act1Done || st.act2Only)) || G.steps.ok(e.when); };

  // 줄거리: 두 개의 항로(옥영 줄·최척 줄)를 해마다 나란히. notes.js의 NOTES.timeline
  function storyPane() {
    const rows = (N().timeline || []).map((e) => {
      const open = opened(e);
      const cell = (who, text, cls) => h('div.tl-cell.' + cls, h('span.tl-who', who), h('p', boldNodes(text)));
      return h('li.tl-row' + (open ? '' : '.locked'),
        h('div.tl-when', h('b', e.year || ''), h('small', e.place || '')),
        open ? (e.both ? h('div.tl-cells.both', cell(NT().storyBoth || '함께', e.both, 'both'))
          : h('div.tl-cells', cell(NT().storyOk || '옥영', e.ok || '', 'ok'), cell(NT().storyCh || '최척', e.ch || '', 'ch')))
          : h('div.tl-cells', h('p.tl-locked', NT().lockedStory || '')));
    });
    return pane(NT().storyLead, h('ol.tl', rows));
  }

  // 인물: notes.js의 NOTES.people 차례, 이름·초상·소개는 people.js
  function peoplePane() {
    const cards = (N().people || []).map((e) => {
      const p = G.util.person(e.id);
      if (!p) return null;
      const open = opened(e);
      return h('div.pp-card' + (open ? '' : '.locked'), { style: { '--pc': p.color || 'var(--ochre)' } },
        h('div.pp-face', open ? ui.face(e.id) : h('span.face-blank', { 'aria-hidden': 'true' }, '?')),
        h('div.pp-body', h('b', open ? T(p.name) : (NT().lockedPeople || '')), open && p.role ? h('p', T(p.role)) : null));
    }).filter(Boolean);
    return pane(NT().peopleLead, h('div.pp-grid', cards));
  }

  // 선생님 안내: 수업 시점·시간·디브리핑
  NB.teacherPane = function () {
    const TN = N().teacher || {};
    const dl = (rows) => h('dl.nb-dl', rows.map((r) => [h('dt', r.t), h('dd', boldNodes(r.d))]));
    return pane(null,
      h('h4.nb-h', '수업 시점과 시간'), dl(TN.when || []),
      h('h4.nb-h', '디브리핑 질문'),
      h('ol.nb-debrief', (N().debrief || []).map((q) => h('li',
        h('p.q', T(q.q), q.std ? h('span.std', ' ' + q.std) : null, q.tag ? h('span.tag', q.tag) : null),
        (TN.debriefTips || {})[q.n] ? h('p.tip', boldNodes(TN.debriefTips[q.n])) : null))),
      h('h4.nb-h', '주소 옵션과 기기'), dl(TN.options || []),
      TN.safety ? h('p.nb-note', boldNodes(TN.safety)) : null,
      TN.review ? h('p.nb-note', boldNodes(TN.review)) : null);
  };

  // ───────── 수첩 열기 ─────────
  NB.open = function (tab) {
    const st = S();
    const tabs = [['pocket', pocketPane], ['story', storyPane], ['people', peoplePane], ['orig', () => cardsPane(NT().origLead, NB.origCards(), NT().locked || '')],
      ['history', () => cardsPane(NT().historyLead, NB.historyCards(), NT().lockedHistory || '')],
      ['fiction', fictionPane], ['marks', marksPane]];
    if (st.teacher) tabs.push(['teacher', NB.teacherPane]);
    const names = NT().tabs || {};
    const body = h('div.nb-body');
    const bar = h('div.nb-tabs', { role: 'tablist' });
    const go = (k) => {
      const t = tabs.find((x) => x[0] === k) || tabs[0];
      bar.querySelectorAll('.nb-tab').forEach((b) => { const on = b.dataset.tab === t[0]; b.classList.toggle('on', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); });
      body.innerHTML = '';
      body.dataset.tab = t[0];
      body.appendChild(t[1]());
      body.scrollTop = 0;
      // 좁은 화면: 고른 탭이 탭 줄 가운데 오게, 양 끝에 가려진 탭이 있으면 흐리게
      const on = bar.querySelector('.nb-tab.on');
      if (on) bar.scrollLeft = on.offsetLeft - bar.clientWidth / 2 + on.offsetWidth / 2;
      edge();
    };
    const edge = () => {
      bar.classList.toggle('more-l', bar.scrollLeft > 2);
      bar.classList.toggle('more-r', bar.scrollLeft + bar.clientWidth < bar.scrollWidth - 2);
    };
    bar.addEventListener('scroll', edge);
    for (const [k] of tabs) {
      bar.appendChild(h('button.nb-tab', { type: 'button', role: 'tab', 'data-tab': k, on: { click: () => { G.audio.tap(); go(k); } } }, names[k] || k));
    }
    go(tab || 'pocket');
    NB.go = go;
    const p = ui.sheet([h('div.nb-head', h('h3', NT().title || '이야기 수첩'), bar), body], [{ label: '닫기', value: true, cls: 'primary' }], { cls: 'notebook-sheet' });
    return p;
  };

  // ───────── 만든 사람·출처 ─────────
  //  CREDITS가 어떤 꼴이어도 보이게: [{ group|kind, title|name|file, by|author, license, src|url, note }] · ['한 줄'] · { sections:[{ title, items }] } · { 묶음 이름: [...] }
  NB.credits = function () {
    const C = N().credits || {};
    const raw = window.CREDITS;
    const groups = [];
    const lineOf = (it) => {
      if (it == null) return null;
      if (typeof it === 'string') return h('li', boldNodes(it));
      const name = it.title || it.name || it.file || it.what || '';
      const by = it.by || it.author || it.maker || '';
      const lic = it.license || it.licence || '';
      const src = it.src || it.url || it.source || '';
      return h('li', name ? h('b', T(name)) : null, by ? ' — ' + by : null, lic ? h('span.cr-lic', lic) : null,
        it.note ? h('span.cr-note', ' ' + it.note) : null, src ? h('span.cr-src', src) : null);
    };
    const add = (title, items) => { const li = list(items).map(lineOf).filter(Boolean); if (li.length) groups.push(h('div.cr-group', title ? h('h4', title) : null, h('ul', li))); };
    if (Array.isArray(raw)) {
      const by = {};
      const loose = [];
      for (const it of raw) { const g = it && typeof it === 'object' ? it.group || it.kind || it.type : null; if (g) (by[g] = by[g] || []).push(it); else loose.push(it); }
      add('', loose);
      for (const g in by) add(g, by[g]);
    } else if (raw && typeof raw === 'object') {
      if (Array.isArray(raw.sections)) for (const s of raw.sections) add(s.title || s.name || '', s.items || s.list || []);
      else for (const k in raw) add(k, raw[k]);
    }
    return ui.sheet([
      h('h3', C.title || '만든 사람·출처'),
      h('div.credits-body',
        h('div.cr-maker', h('b', C.maker || ''), C.work ? h('p', C.work) : null),
        h('div.cr-group', h('h4', '원문과 풀이'), h('ul', (C.text || []).map((t) => h('li', boldNodes(t))))),
        NB.soundNote() ? h('p.nb-sound', h('span.nb-sound-k', NT().sound || '퉁소 소리'), NB.soundNote()) : null,
        groups.length ? groups : h('p.small.muted', C.empty || '')),
    ], [{ label: '닫기', value: true, cls: 'primary' }], { cls: 'credits-sheet' });
  };

  // ───────── recap: 2막 첫머리 '지난 이야기'(글: NOTES.recap — 줄거리 몇 줄 + 내가 1막에서 고른 길) ─────────
  //  { id, type:'recap', scene?, text?:{ NOTES.recap을 덮어쓸 값 } } · 상태를 바꾸지 않는다
  G.steps.register('recap', async function (step, ctx) {
    const R = Object.assign({}, N().recap || {}, step.text || {});
    const st = S();
    if (step.scene && ctx.setScene) ctx.setScene(step.scene);
    const mine = [];
    for (const d of Object.keys(R.mine || {})) {
      const c = st.choices && st.choices[d];
      const t = c && R.mine[d][c];
      if (t) mine.push(t);
    }
    const el = h('div.card.rcard.note.recap',
      h('span.kind', R.kind || ''),
      R.title ? h('h3', T(R.title)) : null,
      h('ol.rc-recap', (R.lines || []).map((l) => h('li', boldNodes(l)))),
      R.mineTitle ? h('h4.rc-mine-h', R.mineTitle) : null,
      mine.length ? h('ul.rc-mine', mine.map((t) => h('li', boldNodes(t)))) : h('p.rc-none', R.none || ''));
    await G.steps.cardMoment(ctx, el, R.next || '다음 ▶');
  });

  G.app.hooks.notebook = (tab) => NB.open(typeof tab === 'string' ? tab : undefined);
  G.app.hooks.credits = () => NB.credits();
})();
