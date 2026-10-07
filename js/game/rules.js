'use strict';
// 게임 규칙(spec §4·§7·§8): 연(緣)·생(生) 게이지, 선택지 세 갈래, 지혜의 길 조건, 쓰러짐(생 0), 막간 회복,
//  한 번만 반영, 거점 기록, 결말, 원작 궤적, ?act=2 시작값.
//  숫자(±2·±1, 쓰러진 뒤 생 3, 막간 생 5, 결말 기준 6 …)는 js/data/texts.js의 TEXTS.RULES 표에 있다.
//
//  상태를 바꾸는 규칙은 모두 '평범한 상태 객체(st)'에 대해 한 벌만 짠다(…On 함수들).
//   - 게임 중: G.save.state에 적용하고 HUD를 출렁이게 한다(applyStep·gauge·spendSaeng …)
//   - 이어 하기 글자 되살리기(code.js)와 원작 궤적: 같은 함수로 거점 자료의 단계를 차례로 되풀이한다
//  그래서 브라우저 없이(Node)도 돌고, 게임과 되풀이가 어긋나지 않는다.
(function (root) {
  const G = (root.G = root.G || {});
  const R = (G.rules = {});
  const S = () => G.save.state;
  const RU = () => (root.TEXTS && root.TEXTS.RULES) || {};
  const TX = () => root.TEXTS || {};
  const PL = () => root.PLACES || {};
  const clone = (o) => (o == null ? o : JSON.parse(JSON.stringify(o)));
  const GAUGES = ['yeon', 'saeng'];
  const hasDOM = () => typeof document !== 'undefined' && !!document.body;

  // ───────── 저장 칸 ─────────
  //  choices{딜레마 id: 선택지 id} · know{지식 id: true} · wisdomUsed{거점: 딜레마 id | 'lost'(쓰러져 닫힘)}
  //  jangyuk(쓰러짐으로 본 장육불 꿈 횟수) · dreamSeen(낭고야 고정 꿈을 봤는가) · puzzle(시구 맞추기 기록)
  //  trail[{ place, label, yeon, saeng, none? }](거점을 떠날 때) · route('coast'|'sea') · prep(두 나라 옷과 말 준비)
  //  ending · act1Done · act2Only(?act=2로 시작) · cards[{ id, kind, place, step }](이야기 수첩에 모인 카드)
  //  applied{단계 열쇠: …}(한 번만 반영 장부) · entered{거점: true}(막간 회복을 한 번만)
  G.save.extend({
    choices: {}, know: {}, wisdomUsed: {}, jangyuk: 0, dreamSeen: false,
    puzzle: { traps: [], fixes: 0, groped: 0 },
    trail: [], route: null, prep: false, ending: null, act1Done: false, act2Only: false,
    cards: [], applied: {}, entered: {},
  });
  // 단계를 하다 말고 껐을 때 그 단계를 시작할 때의 값으로 되돌릴 칸(엔진 runSteps가 쓴다). 장부(applied)도 함께 되돌린다
  for (const k of ['know', 'choices', 'wisdomUsed', 'jangyuk', 'dreamSeen', 'puzzle', 'cards', 'applied', 'prep', 'route', 'flags']) {
    if (!G.save.snapKeys.includes(k)) G.save.snapKeys.push(k);
  }

  // ───────── 기본 ─────────
  R.clamp = (v) => Math.round(Math.max(RU().min ?? 0, Math.min(RU().max ?? 10, Number(v) || 0)));
  R.knowOf = (st, id) => !!((st || S()).know || {})[id];
  // 지식 이름: 역사 카드 자료(history.js)의 title → TEXTS.KNOW → id
  R.knowName = function (id) {
    const H = root.HISTORY;
    const list = Array.isArray(H) ? H : H && typeof H === 'object' ? Object.values(H) : [];
    const c = list.find((x) => x && x.id === id);
    return (c && (c.title || c.name)) || (TX().KNOW || {})[id] || id;
  };
  // 글 틀 채우기: '{what}' / '{what:을}'(받침에 맞춰 조사)
  R.fill = function (tpl, vars) {
    return String(tpl || '').replace(/\{(\w+)(?::([^}]+))?\}/g, (all, k, j) => {
      if (!(k in vars)) return all;
      const v = String(vars[k]);
      return v + (j ? (G.util && G.util.josa ? G.util.josa(v, j) : j) : '');
    });
  };

  // 선택지 하나가 게이지를 얼마나 바꾸는가: 갈래 표(RULES.choice[type]) + 선택지에 적은 gauge(+ fx.gauge)
  R.choiceDelta = function (opt) {
    const base = ((RU().choice || {})[opt && opt.type]) || {};
    const out = {};
    for (const k of GAUGES) out[k] = (Number(base[k]) || 0) + (Number(opt && opt.gauge && opt.gauge[k]) || 0) + (Number(opt && opt.fx && opt.fx.gauge && opt.fx.gauge[k]) || 0);
    return out;
  };

  // ───────── 조건(when) ─────────
  //  엔진 조건(mode·teacher·flag·done·min·max·token·not·any)에 더해: know:'id'|[…] · prep:true|false · route:'sea' · act1Done:true
  const CONDS = {
    mode: (v, st) => st.mode === v,
    teacher: (v, st) => !!st.teacher === !!v,
    flag: (v, st) => Object.keys(v).every((k) => (st.flags || {})[k] === v[k]),
    done: (v, st) => [].concat(v).every((k) => !!(st.done || {})[k]),
    min: (v, st) => Object.keys(v).every((k) => (st[k] || 0) >= v[k]),
    max: (v, st) => Object.keys(v).every((k) => (st[k] || 0) <= v[k]),
    token: (v, st) => [].concat(v).every((id) => (st.tokens || []).some((t) => (t.id || t) === id)),
    know: (v, st) => [].concat(v).every((k) => !!(st.know || {})[k]),
    prep: (v, st) => !!st.prep === !!v,
    route: (v, st) => st.route === v,
    act1Done: (v, st) => !!st.act1Done === !!v,
  };
  R.conds = CONDS;
  R.ok = function (when, st) {
    st = st || S();
    if (!when) return true;
    if (typeof when === 'function') return !!when(st);
    for (const k in when) {
      const v = when[k];
      if (k === 'not') { if (R.ok(v, st)) return false; continue; }
      if (k === 'any') { if (![].concat(v).some((w) => R.ok(w, st))) return false; continue; }
      const f = CONDS[k] || (G.steps && G.steps.conds && G.steps.conds[k]);
      if (f && !f(v, st)) return false;
    }
    return true;
  };

  // ───────── 상태 객체에 대한 규칙(순수) ─────────
  // 거점 자료에서 고정 장육불 꿈 단계(type:'dream', fixed:true)를 찾는다 — 그 거점이 '낭고야 방식' 쓰러짐을 쓴다
  R.fixedDreamOf = function (placeId, places) {
    const p = (places || PL())[placeId];
    return (p && (p.steps || []).find((s) => s && s.type === 'dream' && s.fixed)) || null;
  };

  // 쓰러짐(spec §4-3). 생을 RULES.collapseSaeng으로, 장육불 횟수 +1, 그 거점의 지혜의 길은 (아직 안 썼다면) 닫힌다
  //  kind: 'dream'(기본: 장육불 꿈) · 'fixedDream'(고정 꿈이 쓰러짐을 겸함: 고정 꿈의 연 변동도) · 'recall'(고정 꿈을 본 뒤: 떠올리는 글)
  R.collapseOn = function (st, placeId, places) {
    const fd = R.fixedDreamOf(placeId, places);
    const kind = fd ? (st.dreamSeen ? 'recall' : 'fixedDream') : 'dream';
    if (kind === 'fixedDream') {
      st.dreamSeen = true;
      const g = fd.gauge || {};
      for (const k of GAUGES) if (k !== 'saeng' && g[k]) st[k] = R.clamp(st[k] + Number(g[k]));
    }
    st.saeng = R.clamp(RU().collapseSaeng ?? 3);
    st.jangyuk = (st.jangyuk || 0) + 1;
    st.wisdomUsed = st.wisdomUsed || {};
    if (placeId && !st.wisdomUsed[placeId]) st.wisdomUsed[placeId] = 'lost';
    return { kind, place: placeId || null, step: fd ? fd.id : null, lines: kind === 'fixedDream' ? (fd.lines || null) : null };
  };

  // 게이지 바꾸기(0~10으로 자른다). 생이 줄어 0이 되면 쓰러짐. o.inPuzzle이면 안남 예외(꿈 없음, 생 0 유지, 횟수 그대로)
  R.gaugeOn = function (st, delta, o = {}) {
    const before = {};
    for (const k of GAUGES) before[k] = st[k];
    for (const k of GAUGES) {
      const d = Number(delta && delta[k]) || 0;
      if (d) st[k] = R.clamp((Number(st[k]) || 0) + d);
    }
    const out = {};
    for (const k of GAUGES) out[k] = st[k] - before[k];
    let collapse = null, exception = false;
    if ((Number(delta && delta.saeng) || 0) < 0 && st.saeng <= 0) {
      if (o.inPuzzle) exception = true;
      else collapse = R.collapseOn(st, o.place, o.places);
    }
    return { delta: out, collapse, zero: st.saeng === 0, exception };
  };

  // 효과(set·flags·token·frag·know)를 상태 객체에 적용하고 새로 얻은 것을 got에 모은다(게이지는 따로)
  function fxOn(st, fx, got) {
    if (!fx) return got;
    if (fx.set) Object.assign(st, clone(fx.set));
    if (fx.flags) st.flags = Object.assign(st.flags || {}, clone(fx.flags));
    if (fx.token) {
      st.tokens = st.tokens || [];
      for (const t0 of [].concat(fx.token)) {
        const t = typeof t0 === 'string' ? { id: t0, name: t0 } : clone(t0);
        if (!st.tokens.some((x) => (x.id || x) === t.id)) { st.tokens.push(t); got.tokens.push(t); }
      }
    }
    if (fx.frag) {
      st.frags = st.frags || {};
      for (const n in fx.frag) if (st.frags[n] !== fx.frag[n]) { st.frags[n] = fx.frag[n]; got.frags[n] = fx.frag[n]; }
    }
    if (fx.know) {
      st.know = st.know || {};
      for (const k of [].concat(fx.know)) if (!st.know[k]) { st.know[k] = true; got.know.push(k); }
    }
    return got;
  }
  R.fxOn = (st, fx) => fxOn(st, fx, { frags: {}, tokens: [], know: [] });
  const OPT_FX = (o) => ({ set: o.set, flags: o.flags, token: o.token, frag: o.frag, know: o.know });

  // 이야기 수첩 카드(한 장만)
  R.addCardOn = function (st, entry) {
    st.cards = st.cards || [];
    if (st.cards.some((c) => c.id === entry.id)) return false;
    st.cards.push(entry);
    return true;
  };

  // 선택지가 지금 열려 있는가: { open, why:'when'|'need'|'used'|'lost', hint }
  R.optionState = function (step, opt, st, placeId) {
    st = st || S();
    const L = TX().LOCK || {};
    if (opt.when && !R.ok(opt.when, st)) return { open: false, why: 'when', hint: opt.lockHint || L.when || '' };
    if (opt.type === 'wisdom') {
      const used = (st.wisdomUsed || {})[placeId];
      if (used === 'lost') return { open: false, why: 'lost', hint: L.lost || '' };
      if (used) return { open: false, why: 'used', hint: L.used || '' };
      const need = [].concat(opt.need || []);
      const miss = need.filter((k) => !(st.know || {})[k]);
      if (miss.length) return { open: false, why: 'need', hint: opt.lockHint || R.fill(L.need || '{what}', { what: R.knowName(miss[0]) }) };
    }
    return { open: true, why: null, hint: '' };
  };

  // 단계 하나의 효과(순수). 게임 중(applyStep)과 되풀이(code.js·원작 궤적)가 함께 쓴다
  //  decision: dilemma → 선택지 id / poem → { groped, fixes, traps }(되풀이용)
  //  o.force: 잠긴 선택지도 적용(되풀이) · o.noStepFx: step.fx는 엔진이 따로 적용하므로 건너뜀(게임 중)
  R.stepOn = function (st, step, placeId, decision, o = {}) {
    const res = { delta: { yeon: 0, saeng: 0 }, collapse: null, got: { frags: {}, tokens: [], know: [] }, card: null };
    const addDelta = (r) => {
      for (const k of GAUGES) res.delta[k] += r.delta[k];
      if (r.collapse) res.collapse = r.collapse;
      if (r.exception) res.exception = true;
    };
    const gauge = (d, inPuzzle) => addDelta(R.gaugeOn(st, d, { place: placeId, inPuzzle, places: o.places }));
    const R0 = RU();
    switch (step.type) {
      case 'dilemma': {
        const opt = (step.options || []).find((x) => x.id === (decision && decision.id ? decision.id : decision));
        if (!opt) return { error: 'option', why: '선택지가 없어요' };
        if (!o.force) {
          const os = R.optionState(step, opt, st, placeId);
          if (!os.open) return { error: 'locked', why: os.why, hint: os.hint };
        }
        st.choices = st.choices || {};
        st.choices[step.dilemma] = opt.id;
        res.choice = opt.id;
        if (opt.type === 'wisdom' && placeId) { st.wisdomUsed = st.wisdomUsed || {}; st.wisdomUsed[placeId] = step.dilemma; }
        if (step.dilemma && step.dilemma === R0.prepDilemma) st.prep = opt.type === 'wisdom';
        if (step.dilemma && step.dilemma === R0.routeDilemma) st.route = opt.id;
        fxOn(st, OPT_FX(opt), res.got);
        if (opt.fx) fxOn(st, opt.fx, res.got);
        gauge(R.choiceDelta(opt));
        const entry = { id: step.dilemma || step.id, kind: step.orig != null ? 'orig' : 'fiction', place: placeId || null, step: step.id };
        if (R.addCardOn(st, entry)) res.card = entry;
        break;
      }
      case 'gauge':
        if (step.gauge) gauge(step.gauge);
        break;
      case 'dream':
        if (step.fixed) {
          if (st.dreamSeen) { res.skipped = true; break; }
          st.dreamSeen = true;
        }
        if (step.gauge) gauge(step.gauge);
        break;
      case 'know':
        fxOn(st, { know: step.know }, res.got);
        break;
      case 'frag':
        if (step.n != null) fxOn(st, { frag: { [step.n]: step.text } }, res.got);
        break;
      case 'card': {
        const id = step.history || (step.card && step.card.id) || step.id;
        if (step.history || step.know) fxOn(st, { know: [].concat(step.history || [], step.know || []) }, res.got);
        const entry = { id, kind: step.history ? 'history' : (step.card && step.card.kind) || 'note', place: placeId || null, step: step.id };
        if (R.addCardOn(st, entry)) res.card = entry;
        break;
      }
      case 'poem': { // 되풀이 전용: 더듬어 찾기 횟수만큼 생을 쓰고(안남 예외), 기록을 남긴다
        const d = decision || {};
        const cost = step.gropeCost ?? R0.gropeCost ?? 1;
        for (let i = 0; i < (d.groped || 0); i++) gauge({ saeng: -cost }, true);
        st.puzzle = { traps: (d.traps || []).slice(), fixes: d.fixes || 0, groped: d.groped || 0 };
        break;
      }
      default: break;
    }
    if (!o.noStepFx && step.fx) {
      fxOn(st, step.fx, res.got);
      if (step.fx.gauge) gauge(step.fx.gauge);
    }
    return res;
  };

  // 한 번만: 같은 열쇠(거점·단계)로는 한 번만 적용한다
  R.onceOn = function (st, key, fn) {
    st.applied = st.applied || {};
    if (key && st.applied[key]) return { again: true, skipped: true, prev: st.applied[key] };
    const r = fn();
    if (key && r && !r.error) st.applied[key] = r.choice ? { choice: r.choice } : true;
    return r;
  };

  // 거점 기록(순수): 처음 들어설 때 '출발', 떠날 때 연·생. 막간에 들어서면 생 회복(한 번만)
  const trailDef = (id) => (RU().trail || []).find((t) => t.place === id) || null;
  R.startPointOn = function (st) {
    if ((st.trail || []).length) return;
    const s0 = RU().start || { yeon: 5, saeng: 5 };
    st.trail = [{ place: 'start', label: RU().startLabel || '출발', yeon: s0.yeon, saeng: s0.saeng }];
  };
  R.enterPlaceOn = function (st, id) {
    const R0 = RU();
    if ((R0.act1 || []).includes(id)) R.startPointOn(st);
    const IL = R0.interlude || {};
    let recovered = null;
    st.entered = st.entered || {};
    if (id && id === IL.place && !st.entered[id]) {
      const before = st.saeng;
      st.saeng = R.clamp(IL.saeng ?? 5);
      recovered = { saeng: st.saeng - before };
    }
    if (id) st.entered[id] = true;
    return recovered;
  };
  R.leavePlaceOn = function (st, id) {
    const d = trailDef(id);
    if (!d) return null;
    R.startPointOn(st);
    const pt = { place: id, label: d.label || id, yeon: st.yeon, saeng: st.saeng };
    const i = st.trail.findIndex((t) => t.place === id);
    if (i >= 0) st.trail[i] = pt; else st.trail.push(pt);
    return pt;
  };

  // 새 상태 객체(되풀이용): 저장의 처음 값과 같다
  R.blank = function (mode) {
    const st = G.save && G.save.fresh ? G.save.fresh() : {};
    const s0 = RU().start || { yeon: 5, saeng: 5 };
    st.yeon = s0.yeon; st.saeng = s0.saeng;
    if (mode) st.mode = mode;
    return st;
  };

  // ───────── 게임 중(G.save.state) ─────────
  // 화면에 알리기: 게이지 출렁임, 얻은 조각·신표·지식(브라우저에서만)
  function show(res) {
    if (!res || !hasDOM() || !G.hud) return;
    G.hud.refresh();
    let sum = 0;
    for (const k of GAUGES) { const d = res.delta && res.delta[k]; if (d) { G.hud.wave(k, d); sum += d; } }
    if (G.audio) { if (sum > 0 && G.audio.grow) G.audio.grow(); else if (sum < 0 && G.audio.drop) G.audio.drop(); }
    const got = res.got || {};
    for (const t of got.tokens || []) G.hud.announce({ kind: 'token', label: '신표를 챙겼다', name: t.name || t.id, desc: t.desc || '이야기 수첩에 넣어 두었어요.' });
    for (const n in got.frags || {}) G.hud.announce({ kind: 'frag', label: '시구 조각 ' + n + ' / ' + (G.hud.FRAG_SLOTS || 4), name: String(got.frags[n]), desc: '이야기 수첩에 적어 두었어요.' });
    for (const k of got.know || []) G.hud.announce({ kind: 'know', label: (TX().KNOW_GOT || '알게 되었다'), name: R.knowName(k), desc: '지혜의 길을 여는 실마리가 될지도 몰라요.', ms: 2000 });
  }
  R.show = show;
  const save = () => { if (G.save.write) G.save.write(); };
  const stepKey = (place, id) => (G.app && G.app.key ? G.app.key.step(place, id) : 's:' + place + ':' + id);

  // 단계 효과를 한 번만 적용: R.applyStep(step, { place, key?, decision?, force? }) → 결과(바뀐 만큼, 쓰러짐, 얻은 것, 카드)
  R.applyStep = function (step, o = {}) {
    const st = S();
    const place = o.place || st.place || null;
    const key = o.key || stepKey(place, step.id);
    const r = R.onceOn(st, key, () => R.stepOn(st, step, place, o.decision, { noStepFx: o.withStepFx ? false : true, force: o.force }));
    if (r && !r.error && !r.again) { save(); show(r); }
    return r;
  };

  // 게이지 바꾸기(게임 중). 쓰러지면 결과의 collapse로 알려 준다(단계 화면이 꿈을 펼친다)
  //  o.place: 쓰러짐을 어느 거점 것으로 볼지(기본: 지금 거점) · o.inPuzzle: 안남 예외
  R.gauge = function (delta, o = {}) {
    const st = S();
    const r = R.gaugeOn(st, delta, { place: o.place || st.place, inPuzzle: !!o.inPuzzle });
    save(); show(r);
    if (r.collapse && o.popup !== false && hasDOM() && G.steps && G.steps.collapseSheet) G.steps.collapseSheet(r.collapse);
    return r;
  };
  // 생 쓰기: R.spendSaeng(n, { inPuzzle }) → { saeng, zero, exception, collapse }
  //  inPuzzle(안남 시구 맞추기): 0이 되어도 꿈 없음 — exception이 true면 퉁소가 다시 울리고 남은 정답이 떠오르게 한다(T8)
  R.spendSaeng = function (n, o = {}) {
    const r = R.gauge({ saeng: -Math.abs(Number(n) || 0) }, Object.assign({ popup: !o.inPuzzle }, o));
    return { saeng: S().saeng, zero: r.zero, exception: !!r.exception, collapse: r.collapse, delta: r.delta };
  };
  // 시구 맞추기 기록(안남): 더듬어 찾기(생을 쓰고 횟수 +1) · 놓은 함정 · 고친 횟수
  R.grope = function (cost) {
    const st = S();
    st.puzzle.groped = (st.puzzle.groped || 0) + 1;
    return R.spendSaeng(cost ?? RU().gropeCost ?? 1, { inPuzzle: true });
  };
  R.puzzleTrap = function (t) {
    const st = S();
    if (!st.puzzle.traps.includes(t)) st.puzzle.traps.push(t);
    save();
  };
  R.puzzleFix = function () { S().puzzle.fixes = (S().puzzle.fixes || 0) + 1; save(); };
  // 횟수 보이기: 8 이상은 '7+'
  R.countLabel = function (key, st) {
    const cap = RU().countCap ?? 7;
    const n = typeof key === 'number' ? key : Number(((st || S()).puzzle || {})[key]) || 0;
    return n > cap ? cap + '+' : String(n);
  };
  // 지식 얻기(게임 중)
  R.learn = function (ids) {
    const r = { delta: { yeon: 0, saeng: 0 }, got: { frags: {}, tokens: [], know: [] } };
    fxOn(S(), { know: ids }, r.got);
    save(); show(r);
    return r;
  };
  R.addCard = function (entry) { const a = R.addCardOn(S(), entry); if (a) save(); return a; };
  // 수첩 카드 자료 찾기: 딜레마 카드는 거점 파일의 card, 역사 카드는 history.js(없으면 거점 파일의 card)
  R.cardOf = function (entry) {
    if (!entry) return null;
    const p = PL()[entry.place];
    const step = p && (p.steps || []).find((s) => s.id === entry.step);
    if (entry.kind === 'history') {
      const H = root.HISTORY;
      const list = Array.isArray(H) ? H : H && typeof H === 'object' ? Object.values(H) : [];
      const h = list.find((x) => x && x.id === entry.id);
      return Object.assign({ kind: 'history' }, (step && step.card) || {}, h || {});
    }
    if (!step) return null;
    return Object.assign({ kind: entry.kind, dilemma: step.dilemma, orig: step.orig ?? null, origNearest: step.origNearest || null, options: step.options }, step.card || {});
  };

  // 거점 들어서기·떠나기(게임 중). G.app.play·next에 걸어 둔다(attach)
  R.enterPlace = function (id) {
    const st = S();
    if (id) st.place = id;
    const rec = R.enterPlaceOn(st, id);
    save();
    if (rec && rec.saeng) show({ delta: { yeon: 0, saeng: rec.saeng }, got: {} });
    return rec;
  };
  R.leavePlace = function (id) { const pt = R.leavePlaceOn(S(), id); save(); return pt; };
  // 1막 끝(1차시 끝 화면이 부른다): 안남 기록 + 1막 완료 표시 + 저장
  R.finishAct1 = function (placeId) {
    const st = S();
    const act1 = RU().act1 || [];
    st.act1Done = true;
    R.leavePlaceOn(st, placeId || (act1.includes(st.place) ? st.place : act1[act1.length - 1]));
    save();
    return st;
  };
  // ?act=2: 진행을 지우고(설정은 남김) 막간부터 연 5·생 5, 지식·조각 없이. 1막 구간 기록은 '1막 기록 없음'
  R.startAct2 = function () {
    G.save.reset();
    const st = S();
    const R0 = RU();
    const s0 = R0.start || { yeon: 5, saeng: 5 };
    st.yeon = s0.yeon; st.saeng = s0.saeng;
    st.know = {}; st.frags = {}; st.tokens = [];
    st.act2Only = true;
    const label = R0.noAct1 || '1막 기록 없음';
    const act1 = R0.act1 || [];
    st.trail = [{ place: 'start', label, none: true }].concat((R0.trail || []).filter((t) => act1.includes(t.place)).map((t) => ({ place: t.place, label, none: true })));
    for (const p of act1) st.done[G.app && G.app.key ? G.app.key.place(p) : 'p:' + p] = true;
    st.place = (R0.interlude || {}).place || 'interlude';
    st.startedAt = Date.now();
    save();
    return st;
  };

  // 결말(spec §4-7): whole(연高생高) · weary(연高생低) · strange(연低생高) · barely(연低생低). 기준: RULES.high(6 이상 높음)
  R.ending = function (st, high) {
    st = st || S();
    const h = high ?? RU().high ?? 6;
    const y = (Number(st.yeon) || 0) >= h, s = (Number(st.saeng) || 0) >= h;
    return y && s ? 'whole' : y ? 'weary' : s ? 'strange' : 'barely';
  };
  R.decideEnding = function (high) { const e = R.ending(S(), high); S().ending = e; save(); return e; };

  // ───────── 원작 궤적(spec §8) ─────────
  //  원작 옥영의 선택(딜레마의 orig)을 같은 규칙으로 따라간다. orig가 null인 창작 딜레마는 변화 없음(점선),
  //  단 origNearest가 있으면 그것으로(항로 → 바다길). 고정 사건(fixed:true인 gauge·dream 단계)과 막간 회복은 똑같이 반영.
  //  → { trail:[{ place, label, yeon, saeng, invented, dilemmas:{ orig:[…], invented:[…] } }], before:{ 딜레마: { yeon, saeng } }, choices:{ 딜레마: { orig, nearest } } }
  R.originalRun = function (places, o = {}) {
    places = places || PL();
    const R0 = RU();
    const st = R.blank(o.mode || (G.save && G.save.state && G.save.state.mode) || 'basic');
    st.trail = [];
    R.startPointOn(st);
    const before = {}, choices = {};
    const order = (R0.act1 || []).concat(R0.act2 || []);
    for (const pid of order) {
      R.enterPlaceOn(st, pid);
      const p = places[pid];
      const seg = { orig: [], invented: [] };
      for (const step of (p && p.steps) || []) {
        if (!step || (step.when && !R.ok(step.when, st))) continue;
        if (step.type === 'dilemma') {
          before[step.dilemma] = { yeon: st.yeon, saeng: st.saeng };
          choices[step.dilemma] = { orig: step.orig ?? null, nearest: step.origNearest || null };
          if (step.orig != null) seg.orig.push(step.dilemma); else seg.invented.push(step.dilemma);
          const pick = step.orig != null ? step.orig : step.origNearest;
          if (pick) R.stepOn(st, step, pid, pick, { force: true, noStepFx: true, places });
          continue;
        }
        if (step.fixed && (step.type === 'gauge' || step.type === 'dream')) R.stepOn(st, step, pid, null, { places });
      }
      const pt = R.leavePlaceOn(st, pid);
      if (pt) Object.assign(pt, { invented: seg.invented.length > 0, dilemmas: seg });
    }
    return { trail: st.trail, before, choices };
  };
  R.originalTrail = (places) => R.originalRun(places).trail;

  // ───────── 엔진에 걸기 ─────────
  //  조건(know·prep·route·act1Done)과 효과(gauge → 쓰러짐 처리, know)를 엔진에 더한다
  if (G.steps && G.steps.conds) {
    for (const k of ['know', 'prep', 'route', 'act1Done']) G.steps.conds[k] = CONDS[k];
  }
  if (G.steps && G.steps.effects) {
    G.steps.effects.gauge = (v, ctx) => R.gauge(v, { place: (ctx && ctx.placeId) || undefined });
    G.steps.effects.know = (v) => R.learn(v);
  }
  // 거점을 오갈 때 기록: main.js가 부른다(app.js가 실린 뒤)
  R.attach = function () {
    const app = G.app;
    if (!app || app.__rules) return;
    app.__rules = true;
    const play0 = app.play, next0 = app.next;
    app.play = function (id) { R.enterPlace(id); return play0.apply(this, arguments); };
    app.next = function (id) { R.leavePlace(id); return next0.apply(this, arguments); };
  };

  // ───────── 시험용 손잡이 ─────────
  //  G.rules.test.set({ yeon, saeng, know:['id'…]|{…}, frags:{1:'…'}|['…'…], mode, …그 밖의 저장 칸 })
  R.test = {
    set(o = {}) {
      const st = S();
      for (const k in o) {
        const v = o[k];
        if (k === 'yeon' || k === 'saeng') st[k] = R.clamp(v);
        else if (k === 'know') { st.know = {}; for (const id of Array.isArray(v) ? v : Object.keys(v || {}).filter((x) => v[x])) st.know[id] = true; }
        else if (k === 'frags') { st.frags = {}; if (Array.isArray(v)) v.forEach((t, i) => { if (t != null) st.frags[i + 1] = t; }); else Object.assign(st.frags, v); }
        else st[k] = clone(v);
      }
      save();
      if (hasDOM() && G.hud) G.hud.refresh(true);
      return st;
    },
    state: () => clone(S()),
  };
})(typeof window !== 'undefined' ? window : globalThis);
