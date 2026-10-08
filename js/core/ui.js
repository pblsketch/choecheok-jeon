'use strict';
// 화면 부품: 알림, 풍선 도움말, 판(시트), 도장 효과, 카드(표시 체계), 인물 얼굴
(function () {
  const { h } = G.util;
  const ui = (G.ui = {});

  ui.toast = function (text, ms = 1800) {
    const el = h('div.toast', G.util.T(text));
    document.body.appendChild(el);
    setTimeout(() => el.remove(), ms);
  };

  // 풍선 도움말: 요소 가까이에 뜬다. 아무 곳이나 누르면 닫힌다
  let popEl = null;
  ui.pop = function (anchor, html) {
    ui.unpop();
    popEl = h('div.pop', { html });
    document.body.appendChild(popEl);
    const r = anchor.getBoundingClientRect(), pr = popEl.getBoundingClientRect();
    let x = r.left + r.width / 2 - pr.width / 2, y = r.top - pr.height - 8;
    if (y < 8) y = r.bottom + 8;
    x = G.util.clamp(x, 8, window.innerWidth - pr.width - 8);
    popEl.style.left = x + 'px'; popEl.style.top = y + 'px';
    setTimeout(() => document.addEventListener('pointerdown', ui.unpop, { once: true }), 0);
  };
  ui.unpop = function () { if (popEl) { popEl.remove(); popEl = null; } };

  // 가운데 뜨는 판. 버튼을 누르면 닫히고 그 값을 돌려준다
  //  buttons: [{ label, value, cls:'primary'|'seal' }] · opt.dismiss:false면 바깥을 눌러도 닫히지 않는다
  ui.sheet = function (content, buttons = [{ label: '닫기', value: true, cls: 'primary' }], opt = {}) {
    return new Promise((resolve) => {
      const back = h('div.sheet-back');
      const box = h('div.sheet' + (opt.cls ? '.' + opt.cls : ''), { role: 'dialog', 'aria-modal': 'true' }, content);
      const acts = h('div.actions');
      for (const b of buttons) {
        acts.appendChild(h('button.btn' + (b.cls ? '.' + b.cls : ''), { type: 'button', on: { click: () => { G.audio.tap(); close(b.value); } } }, b.label));
      }
      box.appendChild(acts);
      back.appendChild(box);
      if (opt.dismiss !== false) back.addEventListener('click', (e) => { if (e.target === back) close(null); });
      const onKey = (e) => { if (e.key === 'Escape' && opt.dismiss !== false && back.isConnected) { e.preventDefault(); close(null); } };
      document.addEventListener('keydown', onKey);
      document.body.appendChild(back);
      const first = acts.querySelector('.btn.primary, .btn.seal') || acts.querySelector('.btn');
      if (first) setTimeout(() => first.focus({ preventScroll: true }), 50);
      function close(v) { document.removeEventListener('keydown', onKey); back.remove(); resolve(v); }
    });
  };

  // ───────── 화면 아래 트레이(사건 화면·맵 위 대화창 공통) ─────────
  //  '다음' 단추 하나(.actions)만 뜨면 단추를 글 칸 오른쪽 아래에 겹쳐 두고, 글 칸 오른쪽을 단추 자리만큼 비운다(style.css의 .solo).
  //   - 줄과 줄 사이에 트레이가 잠깐 비어도 .solo는 그대로 둔다: 글 폭이 줄마다 넓어졌다 좁아졌다 하며 다시 줄바꿈되지 않게
  //   - 트레이를 바꾼 뒤 막 나온 줄이 글 칸 밖으로 밀려났으면(글 폭이 좁아져 줄이 늘어난 경우) 다시 맞춘다
  ui.fillTray = function (tray, content) {
    tray.innerHTML = '';
    if (content) tray.appendChild(content);
    tray.classList.toggle('hide', !content);
    const box = tray.parentNode;
    if (!box) return;
    if (content) box.classList.toggle('solo', !!(content.classList && content.classList.contains('actions')));
    const sc = [...box.children].find((x) => x.classList.contains('ev-scroll') || x.classList.contains('dlg-scroll'));
    if (!sc) return;
    requestAnimationFrame(() => requestAnimationFrame(() => ui.keepLast(sc)));
    setTimeout(() => ui.keepLast(sc), 450); // 부드럽게 굴러가던 스크롤(scrollIntoView smooth)이 끝난 뒤 한 번 더
  };
  // 글 칸(sc)의 마지막 줄이 보이게: 줄 묶음(.says)이면 그 마지막 줄, 칸보다 긴 줄이면 그 줄의 머리를 맞춘다
  ui.keepLast = function (sc) {
    if (!sc || !sc.isConnected || sc.closest('.cardmode')) return;
    const main = sc.firstElementChild;
    let last = main && main.lastElementChild;
    if (last && last.classList.contains('says')) last = last.lastElementChild || last;
    if (!last) return;
    const cs = getComputedStyle(sc);
    const padT = parseFloat(cs.paddingTop) || 0, padB = parseFloat(cs.paddingBottom) || 0;
    const a = sc.getBoundingClientRect(), b = last.getBoundingClientRect();
    const room = a.height - padT - padB;
    const delta = b.height > room ? b.top - (a.top + padT) : b.bottom - (a.bottom - padB);
    if (delta > 0.5) sc.scrollTop += Math.ceil(delta);
  };

  // 아직 만들지 않은 화면·기능
  ui.notReady = function (what) {
    return ui.sheet([h('h3', (what ? what + ' — ' : '') + '준비 중'), h('p', '이 부분은 아직 만드는 중이에요.')]);
  };

  ui.stamp = async function (text = '完') {
    G.audio.stamp();
    const el = h('div.stampfx', text);
    document.body.appendChild(el);
    ui.inkBurst(window.innerWidth / 2, window.innerHeight * 0.42);
    await G.util.wait(900);
    el.classList.add('out');
    setTimeout(() => el.remove(), 600);
  };
  ui.inkBurst = function (x, y, n = 12) {
    for (let i = 0; i < n; i++) {
      const d = h('div.ink');
      const a = Math.random() * Math.PI * 2, r = 30 + Math.random() * 60, s = 4 + Math.random() * 9;
      Object.assign(d.style, { left: x + 'px', top: y + 'px', width: s + 'px', height: s + 'px', opacity: .8, transition: 'transform .6s ease-out, opacity .7s' });
      document.body.appendChild(d);
      requestAnimationFrame(() => { d.style.transform = `translate(${Math.cos(a) * r}px, ${Math.sin(a) * r}px)`; d.style.opacity = 0; });
      setTimeout(() => d.remove(), 800);
    }
  };
  ui.shake = function (el) { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); };

  // 표시 체계: 원작 대조(붉은 낙관) · 역사 카드(쪽빛) · 게임 창작(청록) · 해석 · 알아 두기
  //  다른 파일이 종류를 더할 수 있다: G.ui.KIND.이름 = '보이는 이름' (+ css의 .card.이름)
  const KIND = { orig: '원작 대조', history: '역사 카드', fiction: '게임 창작', interp: '해석', note: '알아 두기' };
  ui.KIND = KIND;
  ui.card = function (c) {
    const el = h('div.card.' + (c.kind || 'note'),
      c.kind === 'orig' ? h('span.seal-mark.corner', c.seal || '原作') : null,
      h('span.kind', c.kindLabel || KIND[c.kind] || ''),
      c.title ? h('h3', G.util.T(c.title)) : null,
      // 원문 한문은 늘 풀이와 함께: { han:'원문', ko:'풀이' }
      c.han ? h('p.han', c.han) : null,
      c.han && c.ko ? h('p.ko', G.util.boldNodes(c.ko)) : null,
      ...String(c.body || '').split('\n').filter((x) => x !== '').map((line) => h('p', G.util.boldNodes(line))));
    if (c.real) el.appendChild(h('div.real', h('p', h('strong', '실제로는 → '), G.util.boldNodes(c.real))));
    if (c.src) el.appendChild(h('p.src', c.src));
    return el;
  };
  ui.tag = (kind) => h('span.tagbadge.' + kind, KIND[kind] || kind);

  // 인물 얼굴(말풍선 옆): 초상 그림이 목록에 있으면 그림, 없으면 도트 인물의 머리·어깨, 그것도 없으면 이름 첫 글자 동그라미
  //  모습이 여러 벌인 인물(옥영)은 지금 모습(sp 또는 G.util.lookNow)에 맞는 초상(G.util.pt의 looks)을 쓴다
  //  옥영은 초상 그림이 생기기 전까지 HUD 초상(G.hud.FACE)을 쓴다
  ui.face = function (id, sp) {
    const src = G.util.pt(id, sp) || (id === 'okyoung' && G.hud && G.hud.FACE) || null;
    if (src) return h('img', { src, alt: '' });
    const p = G.util.person(id);
    const spr = sp || (p && p.sp);
    if (spr && window.SPRITES && SPRITES[spr] && G.world && G.world.spriteFace) return G.world.spriteFace(spr);
    const name = (p && G.util.T(p.name)) || '';
    return h('span.face-blank', { style: { background: G.util.colorOf(id) }, 'aria-hidden': 'true' }, name.slice(0, 1));
  };
})();
