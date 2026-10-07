'use strict';
// 공용 도구: DOM 만들기, 글 속 자리 채우기, 조사 맞추기, 섞기, 그림 파일 목록 등
//  (「영웅의 길」 엔진에서 가져와 이 게임에 맞게 줄였다)
window.G = window.G || {};
(function () {
  const U = (G.util = {});

  // h('div.cls#id', {attrs}, children...) — 간단한 요소 생성기
  U.h = function (sel, attrs, ...kids) {
    const m = sel.match(/^([a-z0-9]+)?((?:[.#][\w-]+)*)$/i);
    const el = document.createElement((m && m[1]) || 'div');
    if (m && m[2]) for (const part of m[2].match(/[.#][\w-]+/g)) {
      if (part[0] === '.') el.classList.add(part.slice(1)); else el.id = part.slice(1);
    }
    if (attrs && (typeof attrs !== 'object' || attrs instanceof Node || Array.isArray(attrs))) { kids.unshift(attrs); attrs = null; }
    for (const k in attrs || {}) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'on') for (const ev in v) el.addEventListener(ev, v[ev]);
      else if (k === 'html') el.innerHTML = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k === 'dataset') Object.assign(el.dataset, v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    U.append(el, kids);
    return el;
  };
  U.append = function (el, kids) {
    for (const k of kids.flat(Infinity)) {
      if (k == null || k === false) continue;
      el.appendChild(k instanceof Node ? k : document.createTextNode(String(k)));
    }
    return el;
  };
  U.$ = (s, r = document) => r.querySelector(s);
  U.$$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  U.esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  U.shuffle = function (a, seed) {
    a = a.slice();
    let s = seed == null ? Math.random() * 1e9 : seed;
    const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };
  U.wait = (ms) => new Promise((r) => setTimeout(r, ms));
  U.clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // **굵게** → <b>, 줄바꿈 → <br>
  U.bold = (s) => U.esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  U.boldNodes = function (s) {
    const span = document.createElement('span');
    span.innerHTML = U.bold(U.T(s)).replace(/\n/g, '<br>');
    return span;
  };

  // 받침이 있는가(한글이 아니면 null)
  U.jong = function (word) {
    const c = String(word).charCodeAt(String(word).length - 1);
    if (!(c >= 0xac00 && c <= 0xd7a3)) return null;
    return (c - 0xac00) % 28;
  };
  // 낱말 뒤 조사를 받침에 맞춘다: josa('옥영', '가 말했다') → '이 말했다'
  //  이/가, 은/는, 을/를, 과/와, 으로/로(ㄹ 받침은 '로'), 아/야, 이여/여, 이라/라만 바꾼다
  U.josa = function (word, rest) {
    rest = rest || '';
    const j = U.jong(word);
    if (j == null) return rest;
    const has = j > 0;
    const m2 = /^(이여|여|이라|라|아|야)(?![가-힣])/.exec(rest);
    if (m2) {
      const pair = { 이여: ['이여', '여'], 여: ['이여', '여'], 이라: ['이라', '라'], 라: ['이라', '라'], 아: ['아', '야'], 야: ['아', '야'] }[m2[1]];
      return pair[has ? 0 : 1] + rest.slice(m2[1].length);
    }
    const m = /^(으로|로|이|가|은|는|을|를|과|와)(?=[\s,.!?…'"」』)]|$)/.exec(rest);
    if (!m) return rest;
    const pairs = { 이: ['이', '가'], 가: ['이', '가'], 은: ['은', '는'], 는: ['은', '는'], 을: ['을', '를'], 를: ['을', '를'], 과: ['과', '와'], 와: ['과', '와'], 으로: ['으로', '로'], 로: ['으로', '로'] };
    const useFirst = m[1] === '으로' || m[1] === '로' ? has && j !== 8 : has;
    return pairs[m[1]][useFirst ? 0 : 1] + rest.slice(m[1].length);
  };

  // 글 속 자리 채우기: {학생} 같은 자리를 값으로 바꾼다. {학생:이}처럼 쓰면 받침에 맞춰 조사를 붙인다.
  //  자리 이름과 값은 G.util.vars에 더 넣을 수 있다: G.util.vars.이름 = () => '…'
  U.vars = {
    학생: () => (G.save && G.save.state.name) || '',
  };
  U.T = function (s) {
    if (s == null) return '';
    s = String(s);
    if (s.indexOf('{') < 0) return s;
    return s.replace(/\{([가-힣A-Za-z_]+)(?::([^}]+))?\}/g, (all, k, j) => {
      const f = U.vars[k];
      if (!f) return all;
      const v = String(typeof f === 'function' ? f() : f);
      return v + (j ? U.josa(v, j) : '');
    });
  };

  // ───────── 그림 파일 목록 ─────────
  // 없는 파일을 부르면 콘솔에 404가 찍히므로, 실제로 있는 그림만 목록(window.ART)에 적어 두고 그것만 부른다.
  //  ART.pt.pt_okyoung = 'assets/pt/pt_okyoung.webp' · ART.sc.sc_annam = 'assets/sc/sc_annam.webp'
  //  거점 파일의 scenes: { sc_x: { img:'assets/sc/sc_x.webp' } }에 적은 그림도 있는 것으로 본다.
  window.ART = window.ART || {};
  U.art = function (kind, id) {
    if (!id) return null;
    const A = window.ART || {};
    if (A[kind] && A[kind][id]) return A[kind][id];
    if (kind === 'sc') {
      const P = window.PLACES || {};
      for (const k in P) { const p = P[k]; if (p && p.scenes && p.scenes[id] && p.scenes[id].img) return p.scenes[id].img; }
    }
    return null;
  };

  // 인물: PEOPLE[id] → 이름·초상
  U.person = (id) => (window.PEOPLE || {})[id] || null;
  U.pt = function (id) {
    const p = U.person(id);
    return p ? U.art('pt', p.pt || 'pt_' + id) : null;
  };
  U.who = function (id) {
    const p = U.person(id);
    return p ? U.T(p.name) : '';
  };
  // 이름에서 색 하나를 고른다(그림이 없을 때 대신 그리는 사람 모양·얼굴 동그라미 색)
  U.colorOf = function (id) {
    const p = U.person(id);
    if (p && p.color) return p.color;
    let n = 0;
    for (const ch of String(id || '')) n = (n * 31 + ch.charCodeAt(0)) | 0;
    const hue = Math.abs(n) % 360;
    return `hsl(${hue}, 32%, 42%)`;
  };
})();
