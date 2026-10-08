'use strict';
// 안남 절정(spec §5): 퉁소 알아듣기('tongso' 단계)와 화답 — 시구 맞추기('poem' 단계)
//  - tongso: { id, type:'tongso', sound:1|2|3, scene?, lines:[줄…](소리가 나기 전후), stray?:[줄…](스쳐 갈 때), heard?:[줄…] }
//      안남에 닿을 때의 연(처음 울릴 때 flags['annam:yeon0']에 적는다)으로 몇 번째 소리에 알아듣는지 정한다(POEM.hear).
//      알아들으면 flags['annam:heard'] = 소리 번호. 거점의 목표(b-walk2·b-walk3)가 이 값을 보고 포구를 한 번 더 걷게 한다.
//      거점 자료의 tongso: { pan, heard:[줄…], after?:[줄…], next?(마지막 단추) }가 공통 글이다. 수첩에 모을 원작 카드는 이 단계 안이 아니라
//      다음 카드 단계(type:'card')로 둔다(tongso의 card는 화면에만 보이고 수첩에 모이지 않는다).
//  - poem: { id, type:'poem', scene?, gropeCost? } — 화면 전체의 시구 맞추기
//      1~4행 빈자리 + 조각 패(가진 조각 + 함정). 끌어다 놓기와 눌러 고른 뒤 자리 누르기(터치·마우스·키보드 1~4).
//      못 가진 행은 '더듬어 찾기'(생 gropeCost, G.rules.grope): 후보 3개(정답 1 + 함정 2). 생이 0이면 꿈 없이 퉁소가 다시 울리고
//      남은 빈 행의 정답이 하나씩 떠오른다(반드시 완성, 이 누름은 더듬기로 세지 않는다). 감점 없음. 놓은 함정·고친 횟수는 G.rules.puzzleTrap·puzzleFix로.
//  - 소리를 꺼도 끝까지 할 수 있다: 소리의 방향·또렷함을 물결 무늬(굵기 = 또렷함)와 자막 '(퉁소 소리)'로 함께 보인다.
//  자료(시·함정·조정값)는 js/data/poem.js의 POEM, 글은 거점 파일(js/data/places/annam.js)에 있다.
(function () {
  const { h, boldNodes } = G.util;
  const S = () => G.save.state;
  const PZ = () => window.POEM || {};
  const save = () => G.save.write();
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const P = (G.poem = {});
  const NUM = ['', '一', '二', '三', '四'];

  // ───────── 규칙(순수) ─────────
  P.yeon0 = (st) => { const f = (st && st.flags) || {}; return f['annam:yeon0'] != null ? f['annam:yeon0'] : Number(st && st.yeon) || 0; };
  P.hearAt = function (st) {
    const y = P.yeon0(st || S());
    const rows = PZ().hear || [{ min: 7, sound: 1 }, { min: 4, sound: 2 }, { min: 0, sound: 3 }];
    return (rows.find((r) => y >= r.min) || rows[rows.length - 1]).sound;
  };
  P.trapCount = function (yeon) {
    const rows = (PZ().pool || {}).count || [{ min: 7, n: 1 }, { min: 4, n: 2 }, { min: 0, n: 3 }];
    return Math.max(1, (rows.find((r) => yeon >= r.min) || rows[rows.length - 1]).n);
  };
  // 함정 하나: { id, cat:'A'|'B'|'C', t, 원문? }
  P.trap = function (id) {
    const T0 = PZ().traps || {};
    const cat = String(id || '')[0];
    if (cat === 'C') { const c = (T0.C || {})[id]; return c ? Object.assign({ cat: 'C' }, c, { id }) : null; }
    const c = (T0[cat] || []).find((x) => x.id === id);
    return c ? Object.assign({ cat }, c) : null;
  };
  P.lineOf = (n) => (PZ().lines || [])[n - 1] || {};
  // 조각 하나(패의 종이 띠): 정답 행 'L1'~'L4' 또는 함정 id
  P.strip = function (id) {
    if (/^L\d$/.test(id)) { const n = +id[1], l = P.lineOf(n); return { id, kind: 'line', row: n, t: l.풀이 || '', han: l.원문 || '' }; }
    const t = P.trap(id);
    return t ? { id, kind: 'trap', cat: t.cat, t: t.t, han: t.원문 || '' } : null;
  };
  const hash = (s) => { let n = 7; for (const ch of String(s)) n = (n * 31 + ch.charCodeAt(0)) % 233280; return n; };
  // 처음 패: 가진 조각 + 함정(연이 높을수록 적게, 누구나 하나 이상). 깊이 읽기는 C가 먼저
  P.pool = function (st) {
    st = st || S();
    const mode = st.mode === 'deep' ? 'deep' : 'basic';
    const own = [1, 2, 3, 4].filter((n) => (st.frags || {})[n]).map((n) => 'L' + n);
    const y = P.yeon0(st);
    const list = ((PZ().pool || {})[mode] || []).slice(0, P.trapCount(y));
    return G.util.shuffle(own.concat(list), hash(mode + y + own.join('')) + 11);
  };
  // 더듬어 찾기 후보: 정답 1 + 함정 2(행별 배치, 깊이 읽기에서는 deep 줄)
  P.candidates = function (n, mode) {
    const r = (PZ().rows || {})[n] || {};
    const traps = (mode === 'deep' && r.deep) || r.basic || [];
    return G.util.shuffle(['L' + n].concat(traps.slice(0, 2)), hash('row' + n + mode) + 3);
  };
  P.correct = (id, row) => id === 'L' + row;
  // 또렷함(0~1): 맞게 놓은 행마다 또렷해지고 틀리게 놓인 조각마다 멀어진다
  P.clarityOf = function (right, wrong) {
    const c = PZ().clarity || {};
    return clamp((c.base ?? 0.16) + (c.perRight ?? 0.21) * right - (c.perWrong ?? 0.12) * wrong, c.min ?? 0.06, 1);
  };

  // ───────── 물결 무늬(소리의 방향과 또렷함) ─────────
  //  소리가 나는 곳(src: 화면 비율)에서 물결이 번진다. 굵기 = 또렷함(+ 소리가 날 때는 실제 소리 크기로 출렁임).
  //  멀면(또렷함이 낮으면) 끊긴 점선으로 흐릿하게, 가까우면 이어진 금빛 선으로.
  function Ripple(canvas, o = {}) {
    const g = canvas.getContext('2d');
    const rings = [];
    let raf = 0, last = 0, acc = 0, dpr = 1, W = 0, H = 0;
    const self = { clarity: o.clarity ?? 0.2, sounding: false, src: o.src || [0.8, 0.45], boost: 0, warm: 0 };
    function size() {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      const r = canvas.getBoundingClientRect();
      W = Math.max(1, Math.round(r.width * dpr)); H = Math.max(1, Math.round(r.height * dpr));
      if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    }
    function level(t) {
      const a = G.audio && G.audio.tongso;
      const lv = a && a.playing ? a.level() : 0;
      // 소리를 껐거나 아직 안 들릴 때: 숨 쉬듯 출렁이는 가짜 크기(물결은 늘 보인다)
      return lv > 0.02 ? lv : 0.45 + 0.35 * Math.sin(t * 2.1) * Math.sin(t * 0.7 + 1);
    }
    function frame(now) {
      raf = requestAnimationFrame(frame);
      if (!canvas.isConnected) { cancelAnimationFrame(raf); return; }
      const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
      const t = now / 1000;
      size();
      const c = self.clarity;
      const period = 1.5 - 0.55 * c;
      if (self.sounding) { acc += dt; if (acc >= period) { acc = 0; rings.push({ age: 0, c, jit: Math.random() * 6.28 }); } }
      g.clearRect(0, 0, W, H);
      const sx = self.src[0] * W, sy = self.src[1] * H;
      const lv = self.sounding ? level(t) : 0;
      self.boost = Math.max(0, self.boost - dt * 1.2);
      self.warm = Math.max(0, self.warm - dt * 0.25);
      // 소리 나는 곳의 등불빛
      if (self.sounding || rings.length) {
        const rr = (26 + 40 * c + 30 * self.boost) * dpr;
        const gr = g.createRadialGradient(sx, sy, 0, sx, sy, rr);
        gr.addColorStop(0, `rgba(255,224,150,${0.35 + 0.4 * c})`); gr.addColorStop(1, 'rgba(255,190,90,0)');
        g.fillStyle = gr; g.fillRect(sx - rr, sy - rr, rr * 2, rr * 2);
      }
      const maxR = Math.hypot(W, H) * 0.9, speed = (70 + 40 * c) * dpr, life = maxR / speed;
      for (let i = rings.length - 1; i >= 0; i--) {
        const r = rings[i];
        r.age += dt;
        if (r.age > life) { rings.splice(i, 1); continue; }
        const k = r.age / life, rad = r.age * speed + 6 * dpr;
        const cc = Math.max(r.c, c * 0.6);
        const a = (1 - k) * (1 - k) * (0.22 + 0.7 * cc) * (self.sounding ? 1 : 0.7);
        const lw = (0.6 + 3.6 * cc + 1.6 * self.boost) * (0.75 + 0.5 * lv) * dpr;
        g.save();
        g.translate(sx, sy);
        g.lineCap = 'round';
        if (cc < 0.55) { const d = (3 + 22 * cc) * dpr; g.setLineDash([d, d * (1.2 - cc)]); g.lineDashOffset = r.jit * 10; }
        const warm = Math.min(1, cc + self.warm);
        g.strokeStyle = `rgba(${Math.round(190 + 65 * warm)},${Math.round(206 + 14 * warm)},${Math.round(235 - 97 * warm)},${a})`;
        if (cc > 0.5) { g.shadowColor = `rgba(255,200,110,${a})`; g.shadowBlur = 10 * dpr * cc; }
        g.lineWidth = lw;
        g.beginPath();
        // 물 위에 눕힌 타원(조금씩 흔들린다: 멀수록 더)
        const wob = (1 - cc) * 0.06;
        g.ellipse(0, 0, rad, rad * (0.3 + wob * Math.sin(r.jit + t * 2)), 0, 0, Math.PI * 2);
        g.stroke();
        // 또렷할수록 물결 안쪽에 가는 금빛 결이 한 겹 더
        if (cc > 0.4) { g.setLineDash([]); g.shadowBlur = 0; g.lineWidth = Math.max(1, lw * 0.35); g.strokeStyle = `rgba(255,240,200,${a * 0.7})`; g.beginPath(); g.ellipse(0, 0, rad * 0.94, rad * 0.94 * 0.3, 0, 0, Math.PI * 2); g.stroke(); }
        g.restore();
      }
    }
    self.start = () => { if (!raf) { last = 0; raf = requestAnimationFrame(frame); } };
    self.stop = () => { cancelAnimationFrame(raf); raf = 0; };
    self.pulse = (k = 1) => { self.boost = Math.min(1.5, self.boost + k); acc = 99; };
    self.ringNow = () => { rings.push({ age: 0, c: self.clarity, jit: Math.random() * 6.28 }); };
    self.count = () => rings.length;
    return self;
  }
  P.Ripple = Ripple;

  // 퉁소 소리(소리 + 물결 + 자막). 소리를 꺼도 물결과 자막은 그대로
  function Sound(layer, o = {}) {
    const rp = Ripple(layer.canvas, { src: o.src, clarity: o.clarity });
    const self = {
      rp, clarity: o.clarity ?? 0.2, pan: o.pan ?? 0.5,
      play(c) {
        if (c != null) self.clarity = c;
        rp.clarity = self.clarity; rp.sounding = true; rp.start(); rp.ringNow();
        G.audio.tongso.play({ clarity: self.clarity, pan: self.pan });
        layer.caption(true);
        layer.thick(self.clarity);
      },
      set(c, note) {
        self.clarity = clamp(c, 0, 1);
        rp.clarity = self.clarity;
        G.audio.tongso.set({ clarity: self.clarity, pan: self.pan });
        layer.thick(self.clarity);
        if (note) layer.note(note);
      },
      fade() { rp.sounding = false; G.audio.tongso.stop(); layer.caption(false); },
    };
    return self;
  }

  // 물결 층: canvas + 자막 '(퉁소 소리)'(물결 그림의 굵기 = 또렷함) + 악기 안내
  function listenLayer(cls) {
    const canvas = h('canvas.tg-canvas', { 'aria-hidden': 'true' });
    const wave = h('i.tg-wave', { 'aria-hidden': 'true', html: '<svg viewBox="0 0 40 16"><path d="M2 8c4-6 8-6 12 0s8 6 12 0 8-6 12 0" fill="none" stroke="currentColor" stroke-linecap="round"/></svg>' });
    const txt = h('span.tg-text', '(퉁소 소리)');
    const cap = h('div.tg-cap', { role: 'status', 'aria-live': 'polite' }, wave, txt);
    const inst = G.audio.tongso.instrument;
    const note = inst && inst !== '퉁소' ? h('div.tg-inst', '퉁소 대신 ' + inst + ' 연주') : null;
    const root = h('div.tg-layer' + (cls ? '.' + cls : ''), canvas, cap, note);
    let noteT = 0;
    return {
      root, canvas, cap, inst: note,
      caption(on) { cap.classList.toggle('on', !!on); if (on) txt.textContent = '(퉁소 소리)'; },
      thick(c) { root.style.setProperty('--clar', c.toFixed(3)); wave.querySelector('path').setAttribute('stroke-width', (1 + 4.5 * c).toFixed(2)); },
      note(t) {
        txt.textContent = t;
        cap.classList.remove('flash'); void cap.offsetWidth; cap.classList.add('flash');
        clearTimeout(noteT);
        noteT = setTimeout(() => { if (cap.classList.contains('on')) txt.textContent = '(퉁소 소리)'; }, 1900);
      },
    };
  }

  // 물 건너 중국 배(삽화가 없을 때 소리 나는 곳에 그린다)
  const JUNK_SVG = '<svg viewBox="0 0 220 130" aria-hidden="true"><defs><radialGradient id="tgl"><stop offset="0" stop-color="#fff1c4"/><stop offset=".4" stop-color="#ffc66e" stop-opacity=".6"/><stop offset="1" stop-color="#ffb04a" stop-opacity="0"/></radialGradient></defs>'
    + '<g fill="#141b36" opacity=".92"><path d="M18 92 L200 86 L186 110 Q110 118 38 112 Z"/><path d="M60 88 V20 M106 88 V8 M150 88 V26" stroke="#141b36" stroke-width="3"/>'
    + '<path d="M62 24 Q86 22 90 30 L92 82 L62 84 Z" fill="#26325e"/><path d="M108 12 Q136 10 142 20 L144 80 L108 82 Z" fill="#26325e"/><path d="M152 30 Q172 28 176 36 L178 80 L152 82 Z" fill="#26325e"/>'
    + '<path d="M66 40h24M66 56h25M66 70h25M112 30h30M112 48h31M112 64h31M156 46h21M156 62h21" stroke="#3a4a80" stroke-width="1.6"/>'
    + '<path d="M172 80 h18 v-12 h-18z" fill="#1b2446"/><circle cx="96" cy="80" r="3.5" fill="#1b2446"/><path d="M93 84 h7 v8 h-7z"/></g>'
    + '<circle cx="182" cy="62" r="22" fill="url(#tgl)"/><circle cx="182" cy="62" r="3.2" fill="#ffe2a0"/><circle class="src" cx="100" cy="113" r="1" fill="none"/></svg>';

  // 이 단계가 끝나면(다음 단계로 넘어가거나 선생님용 '장면 건너뛰기', 사건 화면이 닫힘) 함께 치운다.
  //  엔진(runSteps)은 단계마다 새 건너뛰기 손잡이(G.app._skip)를 만들므로, 그것이 바뀌면 이 단계는 끝난 것이다
  function onLeave(ctx, fn) {
    const mine = G.app && G.app._skip;
    let done = false;
    const run = () => { if (done) return; done = true; clearInterval(t); fn(); };
    //  (손잡이가 비기만 한 것은 세지 않는다: 멈춰 둔 예전 runSteps가 늦게 끝나며 비울 수 있다. 마지막 단계면 사건 화면이 닫힌다)
    const t = setInterval(() => { const now = G.app && G.app._skip; if ((mine && now && now !== mine) || (ctx.el && !ctx.el.isConnected)) run(); }, 200);
    return run;
  }
  // 소리 나는 곳(화면 비율): 그려 둔 중국 배의 등불, 없으면 그 자리(box)의 오른쪽
  function lampSrc(canvas, box, fb) {
    const b = canvas.getBoundingClientRect();
    const lamp = box && box.querySelector('.tg-junk .src');
    const a = lamp ? lamp.getBoundingClientRect() : box ? box.getBoundingClientRect() : null;
    if (!a || !b.width || !a.width) return fb;
    const x = lamp ? a.left + a.width / 2 : a.left + a.width * 0.8, y = a.top + a.height / 2;
    return [clamp((x - b.left) / b.width, 0, 1), clamp((y - b.top) / b.height, 0, 1)];
  }
  const placeOf = (ctx) => (ctx && ctx.place) || ((window.PLACES || {})[(ctx && ctx.placeId) || S().place]) || {};
  function rememberArrival() {
    const st = S();
    st.flags = st.flags || {};
    if (st.flags['annam:yeon0'] == null) { st.flags['annam:yeon0'] = st.yeon; save(); }
  }

  // 남원 '퉁소의 밤'이 떠오르는 순간(화면이 등불빛으로 물들고 붓글씨 한 줄)
  async function memoryFlash(host) {
    const el = h('div.tg-memory', { 'aria-hidden': 'true' }, h('span', '남원, 그 봄밤의 가락'));
    host.appendChild(el);
    await G.util.wait(2300);
    el.classList.add('out');
    setTimeout(() => el.remove(), 900);
  }

  // ═════════ tongso: 퉁소 알아듣기 ═════════
  G.steps.register('tongso', async function (step, ctx) {
    rememberArrival();
    const st = S();
    const place = placeOf(ctx);
    const cfg = place.tongso || {};
    const sound = step.sound || 1;
    const need = P.hearAt(st);
    const heard = sound >= need;
    G.audio.tongso.preload();
    if (ctx.setScene && step.scene) ctx.setScene(step.scene);
    const art = !!G.util.art('sc', step.scene);
    const layer = listenLayer(art ? 'art' : 'noart');
    if (!art) layer.root.insertBefore(h('div.tg-junk', { html: JUNK_SVG }), layer.canvas);
    const host = ctx.el || ctx.main;
    host.appendChild(layer.root);
    if (ctx.el) ctx.el.classList.add('tongsomode');
    const snd = Sound(layer, { src: [0.84, 0.61], pan: cfg.pan ?? 0.5, clarity: 0.12 });
    const leave = onLeave(ctx, () => {
      layer.root.remove();
      if (ctx.el) ctx.el.classList.remove('tongsomode');
      snd.rp.stop();
      if (!(S().flags || {})['annam:heard']) G.audio.tongso.stop();
    });
    // 소리가 나는 정도: 스쳐 가는 소리는 흐릿하게(두 번째는 조금 덜), 알아듣는 소리는 처음엔 흐릿하다가 또렷해진다
    requestAnimationFrame(() => { snd.rp.src = lampSrc(layer.canvas, layer.root, [0.84, 0.61]); });
    const faint = 0.1 + 0.07 * (sound - 1);
    setTimeout(() => { if (layer.root.isConnected) snd.play(heard ? 0.26 : faint); }, 500);
    try {
      if (step.lines && step.lines.length) await G.steps.lines(step.lines, ctx, '▶');
      if (heard) {
        st.flags = st.flags || {};
        st.flags['annam:heard'] = sound;
        save();
        snd.rp.warm = 1;
        snd.rp.pulse(1.2);
        snd.set(0.72, '(퉁소 소리 — 남원의 그 가락)');
        memoryFlash(host);
        const card = step.card || cfg.card;
        const after = step.after || cfg.after || [];
        const last = step.next || cfg.next || '다음 ▶';
        await G.steps.lines(step.heard || cfg.heard || [], ctx, card || after.length ? '▶' : last);
        if (card) await G.steps.cardMoment(ctx, G.steps.infoCard(card, card.kind || 'orig'), after.length ? '▶' : last);
        if (after.length) { ctx.main.innerHTML = ''; await G.steps.lines(after, ctx, last); }
      } else {
        snd.set(faint * 0.5, '(퉁소 소리가 멀어진다)');
        setTimeout(() => layer.root.isConnected && snd.fade(), 1600);
        await G.steps.lines(step.stray || cfg.stray || [], ctx, '다음 ▶');
      }
    } finally {
      leave();
    }
  });

  // ═════════ poem: 화답 — 시구 맞추기 ═════════
  G.steps.register('poem', async function (step, ctx) {
    rememberArrival();
    const st = S();
    const D = PZ();
    const plc = placeOf(ctx);
    const mode = st.mode === 'deep' ? 'deep' : 'basic';
    const cost = step.gropeCost ?? ((window.TEXTS || {}).RULES || {}).gropeCost ?? 1; // 더듬어 찾기 한 번에 드는 생
    // 퍼즐 상태: 행마다 { owned(가진 조각인가), strip(놓인 조각 id), groped(더듬어 찾았는가) }
    const rows = {};
    for (let n = 1; n <= 4; n++) rows[n] = { n, owned: !!(st.frags || {})[n], strip: null, groped: false };
    const order = P.pool(st);   // 패에 있는(또는 자리에 놓인) 조각 id, 보이는 차례
    const strips = {};
    for (const id of order) strips[id] = P.strip(id);
    let sel = null, finished = false, busy = false;
    const placedTraps = new Set();

    if (ctx.setScene && step.scene) ctx.setScene(step.scene);
    const art = !!G.util.art('sc', step.scene);
    if (ctx.el) ctx.el.classList.add('poemmode');
    const layer = listenLayer(art ? 'art' : 'noart');
    const sky = h('div.pz-sky', art ? null : h('div.tg-junk', { html: JUNK_SVG }));

    // ── 화면
    const kicker = h('div.pz-kicker', '화답');
    const title = h('h2.pz-title', '그 밤의 시로 답하자');
    const help = h('p.pz-help', boldNodes('남원에서 옥영이 지은 칠언절구(일곱 글자씩 네 줄)예요. 조각을 **끌어다 놓거나**, 눌러 고른 뒤 **자리를 누르세요**. 틀려도 괜찮아요.'));
    const rowList = h('ol.pz-rows');
    const scroll = h('section.pz-scroll', { 'aria-label': '옥영의 시 — 1행부터 4행' }, h('header.pz-head', kicker, title, help), rowList);
    const poolList = h('div.pz-strips', { role: 'list' });
    const answerBtn = h('button.btn.small.teacher-only.pz-answer', { type: 'button' }, '정답 보기');
    const pool = h('section.pz-pool', { 'aria-label': '기억의 조각' },
      h('header.pz-pool-head', h('h3', '기억의 조각'), answerBtn),
      h('p.pz-pool-help', '가진 조각과 낯선 조각이 섞여 있어요'),
      poolList);
    const grid = h('div.pz-grid', scroll, sky, pool);
    const root = h('div.pz', { role: 'application', 'aria-label': '화답 — 시구 맞추기' }, layer.root, grid);
    (ctx.el || ctx.main).appendChild(root);
    // 소리는 중국 배(오른쪽 위)에서
    sky.appendChild(layer.cap);
    if (layer.inst) sky.appendChild(layer.inst);
    const srcOf = () => lampSrc(layer.canvas, sky, [0.86, 0.14]);
    const snd = Sound(layer, { src: [0.86, 0.14], pan: (plc.tongso || {}).pan ?? 0.5, clarity: P.clarityOf(0, 0) });
    let ro = null;
    const reSrc = () => { snd.rp.src = srcOf(); };
    if (window.ResizeObserver) { ro = new ResizeObserver(reSrc); ro.observe(root); }
    let resolveDone;
    const doneP = new Promise((r) => { resolveDone = r; });
    const leave = onLeave(ctx, () => {
      root.remove();
      if (ctx.el) ctx.el.classList.remove('poemmode');
      snd.rp.stop(); G.audio.tongso.stop();
      if (ro) ro.disconnect();
      document.removeEventListener('keydown', onKey);
      if (ghost) ghost.remove();
      resolveDone('gone');
    });
    requestAnimationFrame(() => { reSrc(); snd.play(); });

    // ── 그리기
    const placedIn = (id) => { for (let n = 1; n <= 4; n++) if (rows[n].strip === id) return n; return 0; };
    const counts = () => {
      let right = 0, wrong = 0;
      for (let n = 1; n <= 4; n++) { const s = rows[n].strip; if (s) { if (P.correct(s, n)) right++; else wrong++; } }
      return { right, wrong };
    };
    const tilt = (id) => ((hash(id) % 7) - 3) * 0.35;
    function stripEl(id, where) {
      const s = strips[id];
      const b = h('button.pz-strip' + (sel === id ? '.sel' : ''), {
        type: 'button', role: where === 'pool' ? 'listitem' : null, 'data-id': id,
        'aria-pressed': where === 'pool' ? (sel === id ? 'true' : 'false') : null,
        'aria-label': s.t + (where === 'pool' ? (sel === id ? ' — 골랐어요. 놓을 자리를 누르세요' : ' — 눌러 고르기') : ''),
        style: { '--tilt': tilt(id) + 'deg' },
      }, h('span.pz-st', s.t));
      return b;
    }
    function rowEl(n) {
      const r = rows[n];
      const s = r.strip ? strips[r.strip] : null;
      const ok = s && P.correct(r.strip, n);
      const lacking = !r.owned && !r.groped && !ok;
      const saeng0 = (Number(S().saeng) || 0) <= 0;
      const label = n + '행' + (s ? ': ' + s.t : ': 비어 있음') + (sel && !s ? ' — 여기에 놓기' : '');
      const body = s
        ? h('div.pz-filled' + (ok ? '.ok' : ''), { 'data-id': r.strip },
          ok ? h('span.pz-han', strips[r.strip].han) : null,
          h('span.pz-ko', s.t))
        : h('div.pz-empty', h('span.pz-dots', { 'aria-hidden': 'true' }));
      const grope = lacking && !s
        ? h('button.pz-grope' + (saeng0 ? '.zero' : ''), { type: 'button', 'data-row': n, 'aria-label': n + '행 — ' + (saeng0 ? '퉁소 가락에 기대기' : (D.gropeLabel || '기억을 더듬기') + ', 생을 ' + cost + ' 써요') },
          h('span', saeng0 ? '퉁소 가락에 기대기' : (D.gropeLabel || '기억을 더듬기')), saeng0 ? null : h('b', '生 ' + cost))
        : null;
      return h('li.pz-row' + (ok ? '.ok' : s ? '.filled' : '.empty') + (sel && !ok ? '.target' : ''), { 'data-row': n },
        h('span.pz-num', { 'aria-hidden': 'true' }, NUM[n]),
        h('div.pz-slot', { role: 'button', tabindex: '0', 'data-row': n, 'aria-label': label }, body),
        grope);
    }
    function render(flash) {
      rowList.innerHTML = '';
      for (let n = 1; n <= 4; n++) rowList.appendChild(rowEl(n));
      poolList.innerHTML = '';
      const left = order.filter((id) => !placedIn(id));
      for (const id of left) poolList.appendChild(stripEl(id, 'pool'));
      if (!left.length) poolList.appendChild(h('p.pz-none', '패가 비었어요'));
      pool.classList.toggle('many', left.length > 7);
      if (flash) {
        const row = rowList.querySelector(`.pz-row[data-row="${flash.row}"]`);
        if (row) row.classList.add(flash.kind);
      }
      const { right, wrong } = counts();
      root.dataset.right = right; root.dataset.wrong = wrong;
    }

    // ── 놓기·빼기(감점 없음. 함정을 놓으면 기록, 틀린 조각을 빼거나 바꾸면 '고친 횟수')
    function takeOut(n, auto) {
      const id = rows[n].strip;
      if (!id) return;
      rows[n].strip = null;
      if (!auto && !P.correct(id, n)) G.rules.puzzleFix();
    }
    function feedback(n, id) {
      const { right, wrong } = counts();
      const ok = P.correct(id, n);
      snd.set(P.clarityOf(right, wrong), ok ? '(퉁소 소리가 또렷해진다)' : '(퉁소 소리가 멀어진다)');
      if (ok) snd.rp.pulse(0.8); else snd.rp.boost = 0;
      return ok;
    }
    function place(id, n, o = {}) {
      if (finished || !strips[id]) return;
      const from = placedIn(id);
      if (from === n) { sel = null; render(); return; }
      if (from) takeOut(from, o.auto);
      if (rows[n].strip) takeOut(n, o.auto);
      rows[n].strip = id;
      sel = null;
      const s = strips[id];
      if (s.kind === 'trap' && !o.auto) { placedTraps.add(s.cat); G.rules.puzzleTrap(s.cat); }
      G.audio.pick();
      const ok = feedback(n, id);
      render({ row: n, kind: ok ? 'flash-ok' : 'flash-off' });
      check();
    }
    function unplace(n) {
      if (finished || !rows[n].strip) return;
      takeOut(n);
      G.audio.tap();
      const { right, wrong } = counts();
      snd.set(P.clarityOf(right, wrong));
      render();
    }
    function select(id) {
      if (finished) return;
      sel = sel === id ? null : id;
      G.audio.tap();
      render();
      const b = poolList.querySelector(`.pz-strip[data-id="${id}"]`);
      if (b) b.focus({ preventScroll: true });
    }
    function check() {
      for (let n = 1; n <= 4; n++) if (!rows[n].strip || !P.correct(rows[n].strip, n)) return;
      finish();
    }

    // ── 더듬어 찾기(생 1). 생이 0이면 꿈 없이 퉁소가 한 번 더 울리고 남은 빈 행의 정답이 떠오른다
    async function grope(n) {
      if (finished || busy) return;
      const r0 = rows[n];
      if (r0.owned || r0.groped) return;
      busy = true;
      try {
        // 생이 이미 0이면 더듬기로 세지 않고(생을 쓰지 않는다) 곧바로 안남 예외: 퉁소가 다시 울리고 정답이 떠오른다
        if ((Number(S().saeng) || 0) <= 0) { await exception(); busy = false; await floatAnswers(); return; }
        G.rules.grope(cost);
        G.hud.refresh();
        r0.groped = true;
        const cands = P.candidates(n, mode);
        for (const id of cands) if (!strips[id]) { strips[id] = P.strip(id); order.push(id); }
        render();
        const pick = await gropeSheet(n, cands);
        if (pick) place(pick, n);
        else render();
      } finally { busy = false; }
    }
    function gropeSheet(n, cands) {
      return new Promise((res) => {
        const close = (v) => { back.remove(); res(v); };
        const opts = h('div.pz-cands');
        cands.forEach((id, i) => {
          const b = h('button.opt.pz-cand', { type: 'button', 'data-id': id }, h('span.ot', strips[id].t));
          b.addEventListener('click', () => { G.audio.pick(); close(id); });
          opts.appendChild(b);
          if (i === 0) setTimeout(() => b.isConnected && b.focus({ preventScroll: true }), 40);
        });
        const later = h('button.btn.ghost.small', { type: 'button', on: { click: () => { G.audio.tap(); close(null); } } }, '나중에 고르기');
        const card = h('div.pz-sheet', { role: 'dialog', 'aria-modal': 'true', 'aria-label': n + '행 기억 더듬기' },
          h('div.pz-sheet-kicker', h('b', '生 −' + cost), ' 기억을 더듬는다'),
          h('h3', NUM[n] + ' · ' + n + '행에 올 구절은?'),
          h('p.pz-sheet-help', '흐릿한 기억 속에서 구절 셋이 떠올랐다. 하나는 그 밤의 시다.'),
          opts,
          h('div.pz-sheet-foot', h('span', '고르지 않은 구절도 패에 남아요'), later));
        const back = h('div.pz-back', card);
        back.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(null); } });
        root.appendChild(back);
      });
    }
    async function exception() {
      const X = (window.TEXTS || {}).ANNAM_EXCEPTION || {};
      const lines = X.lines || ['그때, 퉁소가 한 번 더 울렸다.'];
      snd.rp.warm = 1; snd.rp.pulse(1.5);
      snd.set(Math.max(snd.clarity, 0.7), '(퉁소 소리)');
      await new Promise((res) => {
        const go = h('button.btn.primary', { type: 'button', on: { click: () => { G.audio.tap(); back.remove(); res(); } } }, '가락을 따라 읊기 ▶');
        const card = h('div.pz-sheet.pz-ex', { role: 'dialog', 'aria-modal': 'true' },
          h('div.pz-sheet-kicker', h('b', '生 0'), ' 퉁소가 다시 울린다'),
          ...lines.map((t) => h('p', boldNodes(t))),
          h('div.pz-sheet-foot', go));
        const back = h('div.pz-back', card);
        root.appendChild(back);
        setTimeout(() => go.isConnected && go.focus({ preventScroll: true }), 40);
      });
    }
    // 남은 빈 행(가진 조각이 아닌 행)의 정답이 하나씩 떠오른다(그동안에도 다른 행은 놓을 수 있다)
    async function floatAnswers() {
      for (let n = 1; n <= 4; n++) if (!rows[n].owned) rows[n].groped = true;
      render();
      for (let n = 1; n <= 4; n++) {
        if (finished || !root.isConnected) return;
        const r = rows[n];
        if (r.owned || (r.strip && P.correct(r.strip, n))) continue;
        const id = 'L' + n;
        if (!strips[id]) { strips[id] = P.strip(id); order.push(id); }
        r.groped = true;
        await G.util.wait(450);
        place(id, n, { auto: true });
        const row = rowList.querySelector(`.pz-row[data-row="${n}"]`);
        if (row) row.classList.add('rise');
        await G.util.wait(500);
      }
    }
    // 선생님용 '정답 보기': 빈자리(와 틀린 자리)를 정답으로
    function answer() {
      if (finished) return;
      G.audio.tap();
      for (let n = 1; n <= 4; n++) {
        if (rows[n].strip && P.correct(rows[n].strip, n)) continue;
        const id = 'L' + n;
        if (!strips[id]) { strips[id] = P.strip(id); order.push(id); }
        const from = placedIn(id);
        if (from) rows[from].strip = null;
        rows[n].strip = id;
      }
      root.classList.add('answered');
      render();
      check();
    }

    // ── 다 맞췄을 때: 시 전체(원문 + 풀이)와 뜻, 놓았던 함정 풀이. 퉁소는 또렷하게 울리다가 멎는다
    let resolveNext;
    const nextP = new Promise((r) => { resolveNext = r; });
    async function finish() {
      if (finished) return;
      finished = true;
      sel = null;
      root.classList.add('done');
      snd.rp.warm = 1; snd.rp.pulse(1.5);
      snd.set(1, '(퉁소 소리 — 시와 가락이 하나가 되었다)');
      kicker.textContent = (D.title || '옥영의 시');
      title.textContent = '王子吹簫';
      help.innerHTML = '';
      help.appendChild(boldNodes('옥영은 조선말로 시를 읊었다. 물 건너 가락이 시를 따라 흐른다.'));
      render();
      const N = D.trapNotes || {};
      const traps = ['A', 'B', 'C'].filter((c) => placedTraps.has(c) || (S().puzzle.traps || []).includes(c));
      const nextBtn = h('button.btn.primary.pz-next', { type: 'button', on: { click: () => { G.audio.tap(); resolveNext(); } } }, '다음 ▶');
      const note = h('section.pz-note', { 'aria-label': '시의 뜻' },
        h('h3', '시의 뜻'),
        h('p.pz-gloss', boldNodes(D.gloss || '')),
        D.point ? h('p.pz-point', boldNodes(D.point)) : null,
        h('dl.pz-words', ...(D.words || []).map((w) => [h('dt', w.w), h('dd', w.d)])),
        traps.length ? h('div.pz-traps', h('h4', '놓았던 함정'), ...traps.map((c) => h('p', h('b.pz-cat', c), boldNodes(N[c] || '')))) : null,
        h('div.pz-note-foot', nextBtn));
      pool.replaceWith(note);
      setTimeout(() => nextBtn.isConnected && nextBtn.focus({ preventScroll: true }), 60);
      // 퉁소가 한동안 또렷하게 울리다가 멎는다
      setTimeout(() => { if (root.isConnected) { snd.fade(); layer.note('(퉁소 소리가 멎었다)'); layer.cap.classList.add('on', 'still'); } }, 3200);
      resolveDone('done');
    }

    // ── 입력: 끌어다 놓기(마우스·터치·펜 모두 pointer) + 누르기(click: 마우스·터치·키보드)
    let drag = null, ghost = null, justDragged = 0;
    const slotAt = (x, y) => { const el = document.elementFromPoint(x, y); return el && el.closest ? el.closest('.pz-row') : null; };
    root.addEventListener('pointerdown', (e) => {
      if (finished || busy || e.button > 0) return;
      const sEl = e.target.closest('.pz-strip, .pz-filled');
      if (!sEl || !root.contains(sEl) || sEl.closest('.pz-back')) return;
      drag = { id: sEl.dataset.id, x: e.clientX, y: e.clientY, el: sEl, pid: e.pointerId, on: false, from: placedIn(sEl.dataset.id) };
    });
    root.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.pid) return;
      if (!drag.on) {
        if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 8) return;
        drag.on = true;
        try { drag.el.setPointerCapture(drag.pid); } catch (err) { /* 무시 */ }
        ghost = h('div.pz-ghost', { 'aria-hidden': 'true' }, h('span', strips[drag.id].t));
        document.body.appendChild(ghost);
        drag.el.classList.add('lifted');
        root.classList.add('dragging');
        sel = null;
      }
      e.preventDefault();
      ghost.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
      const over = slotAt(e.clientX, e.clientY);
      rowList.querySelectorAll('.pz-row.over').forEach((r) => r !== over && r.classList.remove('over'));
      if (over) over.classList.add('over');
    });
    const endDrag = (e, cancel) => {
      if (!drag || (e && e.pointerId !== drag.pid)) return;
      const d = drag; drag = null;
      if (!d.on) return;
      justDragged = performance.now();
      if (ghost) { ghost.remove(); ghost = null; }
      root.classList.remove('dragging');
      d.el.classList.remove('lifted');
      const over = !cancel && e ? slotAt(e.clientX, e.clientY) : null;
      rowList.querySelectorAll('.pz-row.over').forEach((r) => r.classList.remove('over'));
      if (over) place(d.id, +over.dataset.row);
      else if (d.from && !cancel && e && pool.contains(document.elementFromPoint(e.clientX, e.clientY))) unplace(d.from);
      else render();
    };
    root.addEventListener('pointerup', (e) => endDrag(e, false));
    root.addEventListener('pointercancel', (e) => endDrag(e, true));
    root.addEventListener('click', (e) => {
      if (e.detail && performance.now() - justDragged < 350) { /* 끌어 놓은 직후 따라오는 누르기(키보드 누르기는 detail 0) */ e.preventDefault(); e.stopPropagation(); return; }
      if (finished || busy) return;
      if (e.target.closest('.pz-back')) return;
      const gb = e.target.closest('.pz-grope');
      if (gb) { grope(+gb.dataset.row); return; }
      if (e.target.closest('.pz-answer')) { answer(); return; }
      const st0 = e.target.closest('.pz-pool .pz-strip');
      if (st0) { select(st0.dataset.id); return; }
      const slot = e.target.closest('.pz-slot');
      if (slot) {
        const n = +slot.dataset.row, r = rows[n];
        if (sel) { place(sel, n); return; }
        if (r.strip) { unplace(n); return; }
        if (!r.owned && !r.groped) { grope(n); return; }
        layer.note('(패에서 조각을 골라 이 자리에 놓으세요)');
      }
    });
    function onKey(e) {
      if (finished || busy || !root.isConnected || root.querySelector('.pz-back')) return;
      if (e.key === 'Escape' && sel) { sel = null; render(); return; }
      if (/^[1-4]$/.test(e.key) && sel) { e.preventDefault(); place(sel, +e.key); return; }
      if ((e.key === 'Enter' || e.key === ' ') && e.target && e.target.classList && e.target.classList.contains('pz-slot')) { e.preventDefault(); e.target.click(); }
    }
    document.addEventListener('keydown', onKey);

    // 시험용 손잡이
    P.test = {
      state: () => ({ rows: JSON.parse(JSON.stringify(rows)), pool: order.filter((id) => !placedIn(id)), order: order.slice(), sel, finished, clarity: snd.clarity, sounding: snd.rp.sounding, rings: snd.rp.count(), traps: [...placedTraps] }),
      place: (id, n) => place(id, n), grope: (n) => grope(n), answer: () => answer(), strip: (id) => strips[id],
    };

    render();
    setTimeout(() => { const f = poolList.querySelector('.pz-strip'); if (f) f.focus({ preventScroll: true }); }, 80);
    try {
      const r = await doneP;
      if (r === 'gone') return;
      await nextP;
    } finally {
      leave();
    }
  });
})();
