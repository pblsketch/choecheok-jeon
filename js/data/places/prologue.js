'use strict';
// 서막 — 흩어지는 밤(맵 없음: 사건 화면으로만 펼친다)
//  원작 경과(design/research/01_원문_사실확인.md §2): 정유년 8월 남원 함락 → 지리산 연곡 피란(최척의 당부로 남복)
//  → 양식이 떨어져 최척이 구례로 → 그날 밤 적이 연곡을 휩쓴다. 서막은 그 밤의 문턱에서 멈추고,
//  남원 거점이 바로 그 밤 속으로 들어가 첫 선택("무엇을 들고 도망칠 것인가")을 묻는다.
//  전쟁 폭력은 불빛·그림자·흩어지는 소리로만 보여 준다. 서막에는 선택이 없다.
window.PLACES = window.PLACES || {};

// ───────── 1막 공용(남원·낭고야가 쓴다) ─────────
//  ① 말 속에서 단계 하나 펼치기: NPC 말(talk)이나 자리 살피기(look)에 { learnStep:'단계 id' }를 적으면
//     그 거점의 card·know 단계를 그 자리에서 한 번만 반영하고(지식·수첩 카드), 카드를 대화창에 보여 준다.
//     역사 카드를 '읽을지 말지' 학생이 고르게 하는 장치다(말을 한 번 더 걸어야 들려준다 — 기획안 §10 '유혹').
//     이어 하기 글자는 지식만 담고, 되살릴 때 같은 단계를 거점 자료 차례대로 다시 반영한다(js/game/code.js).
//  ② 퉁소 소리 켜고 끄기: 줄에 { fx:{ tongsoSound:{ clarity:1 } } } / { fx:{ tongsoSound:false } }
(function () {
  if (!window.G || !G.steps) return;
  const { h } = G.util;
  if (!G.steps.lineKinds.learnStep) {
    G.steps.lineKinds.learnStep = function (line, ctx) {
      const st = G.save.state;
      const pid = (ctx && ctx.placeId) || st.place;
      const place = (window.PLACES || {})[pid];
      const step = place && (place.steps || []).find((s) => s.id === line.learnStep);
      if (!step) return null;
      const key = G.app.key.step(pid, step.id);
      G.rules.applyStep(step, { place: pid, key });
      st.done[key] = true;
      G.save.write();
      const box = h('div.learn-step');
      for (const l of step.lines || []) { const el = G.steps.line(l, ctx); if (el) box.appendChild(el); }
      if (step.type === 'card') {
        const data = step.history ? G.rules.cardOf({ kind: 'history', id: step.history, place: pid, step: step.id }) : step.card;
        box.appendChild(G.steps.infoCard(data, step.history ? 'history' : 'note'));
      }
      return box.childNodes.length ? box : null;
    };
  }
  if (!G.steps.effects.tongsoSound) {
    G.steps.effects.tongsoSound = function (v) {
      const T = G.audio && G.audio.tongso;
      if (!T) return;
      try {
        if (v) T.play(Object.assign({ clarity: 1, pan: 0 }, typeof v === 'object' ? v : {}));
        else T.stop();
      } catch (e) { /* 소리가 막혀 있어도 이야기는 이어진다 */ }
    };
  }
})();

PLACES.prologue = {
  name: '서막 — 흩어지는 밤',
  act: 1,
  node: 'namwon',
  mission: '최척을 다시 만나라.',
  music: 'flight',
  cover: 'sc_prologue_fall',
  intro: '정유년(1597) 8월, 남원. 한 집안이 흩어지던 밤.',
  steps: [
    {
      id: 'p-fall', type: 'say', scene: 'sc_prologue_fall',
      lines: [
        '정유년(1597) 8월, 왜적이 남원성을 무너뜨렸다.',
        '성 쪽 하늘이 밤새 붉게 타올랐다. 사람들은 모두 달아나 숨었다.',
      ],
    },
    {
      id: 'p-refuge', type: 'say', scene: 'sc_prologue_refuge',
      lines: [
        '최척의 온 집안은 지리산 연곡으로 피했다.',
        { who: 'choecheok', t: '이 옷을 입으시오. 사람들 틈에서는 사내로 보여야 하오.' },
        '옥영은 남편이 건넨 사내 옷을 입었다. 보는 사람마다 옥영이 여자인 줄 몰랐다.',
      ],
    },
    {
      id: 'p-parting', type: 'say', scene: 'sc_prologue_parting',
      lines: [
        '산에 든 지 여러 날, 양식이 떨어졌다.',
        { who: 'choecheok', t: '구례에 내려가 먹을 것을 구해 오리다. 적이 어디쯤 왔는지도 살피고 오겠소.' },
        { who: 'okyoung', t: '꼭… 돌아오세요.' },
        '최척은 장정 몇과 함께 산을 내려갔다.',
      ],
    },
    {
      id: 'p-night', type: 'say', scene: 'sc_prologue_night', music: 'tension',
      lines: [
        '그날 밤, 골짜기 아래에서 불빛이 올라왔다.',
        '횃불이 하나, 또 하나. 나무 사이로 그림자들이 달렸다.',
        '누군가 이름을 부르는 소리. 아이 울음. 흩어지는 발소리.',
      ],
    },
    {
      id: 'p-brink', type: 'say', scene: 'sc_prologue_brink', music: 'sorrow',
      next: '그 밤 속으로 ▶',
      lines: [
        { who: 'okyoung', t: '남편은 산 아래 어딘가에 있다. 식구들의 손은 아직 내 손 안에 있다. …아직은.' },
        '이 밤, 옥영은 흩어진 사람이 된다.',
        '그래도 하나만은 놓지 않기로 한다.\n**최척을 다시 만나라.**',
      ],
    },
  ],
  scenes: {
    sc_prologue_fall: { caption: '정유년 8월, 불타는 남원성', prompt_hint: 'Night view of a Korean walled town (Namwon fortress) far away, orange glow of fire over the walls and smoke rising into an indigo sky, silhouettes of tiny fleeing figures on a road in the foreground; no violence shown, picture-book gouache' },
    sc_prologue_refuge: { caption: '지리산 연곡 골짜기의 피란민들', prompt_hint: 'Refugees huddled in a misty mountain valley of Jirisan with straw huts and pine trees; a young Korean woman in plain men\'s clothes and a topknot band stands among them while her husband looks on, warm dusk light' },
    sc_prologue_parting: { caption: '구례로 양식을 구하러 떠나는 최척', prompt_hint: 'A Korean scholar husband with a small travel bundle walking down a steep mountain path with two or three men, looking back at his wife in men\'s clothing standing by a hut; autumn mountains, quiet farewell' },
    sc_prologue_night: { caption: '골짜기로 번지는 횃불', prompt_hint: 'Night forest valley seen from above, a line of distant torches climbing between dark pine trees, long shadows, sparks; no people visible up close, tense and symbolic, deep indigo and lantern orange' },
    sc_prologue_brink: { caption: '어둠 속에서 손을 꼭 잡은 옥영', prompt_hint: 'Close-up of hands holding each other in the dark, a woman\'s hand in a man\'s sleeve gripping an elder\'s hand, faint orange torchlight at the edge of the frame; quiet, symbolic, no faces of enemies' },
  },
};
