'use strict';
// 남원(1막 첫 거점) — 회상 '퉁소의 밤' → 연곡 피란처의 그 밤(남복) → 첫 딜레마 "무엇을 들고 도망칠 것인가"
//  원문·풀이: design/research/01_원문_사실확인.md §2·§3-1·§3-2·§4·§6·§7(자체 번역, 원문을 지어 넣지 않는다)
//  - 회상에서 옥영이 「王子吹簫」를 짓고(시구 조각 1, 퉁소 가락 기억), 최척이 「瑤臺繚緲」로 답한다.
//    안남 시구 맞추기의 함정 C("누가 어느 시를 지었는가")가 여기서 들은 것을 묻는다.
//  - 역사 카드 둘(h-namwon-war, h-namwon-ming)은 피란처 사람들에게 한 번 더 말을 걸어야 들려준다(읽을지 말지는 학생이 고른다).
//  - 단계 목록(steps)은 노는 차례 그대로다. 이어 하기 글자를 되살릴 때 이 차례로 다시 반영한다(js/game/code.js).
window.PLACES = window.PLACES || {};

(function () {
  const mk = (window.G && G.world && G.world.mk) || null;
  if (!mk) return;

  // ── 맵: 남원 옛집 마당(회상, 봄밤) ──
  const home = {
    name: '남원 옛집 · 봄밤', theme: 'village', night: true, music: 'namwon_memory',
    spawn: [8, 7, 'down'],
    grid: mk(26, 16, '.', [
      ['frame', 2, 1, 21, 13, '#'],
      ['rect', 3, 2, 19, 11, 'k'],
      ['rect', 14, 7, 8, 6, ','],
      ['rect', 3, 9, 5, 4, ','],
      ['rect', 17, 10, 3, 2, '~'],
      ['rect', 11, 13, 2, 1, ':'], ['rect', 11, 14, 2, 1, ':'],
      ['dots', ',', [[1, 3], [1, 9], [24, 4], [24, 11], [5, 14], [19, 14]]],
      ['border', 'h'],
    ]),
    props: [
      ['pr_tilehouse', 4, 4], ['pr_thatch', 15, 4],
      ['pr_willow', 19, 9], ['pr_pine', 0, 15], ['pr_pine', 22, 15], ['pr_pine', 23, 6],
      ['pr_lantern_stone', 10, 6], ['pr_lantern_stone', 21, 12], ['pr_lantern_stone', 6, 11],
      ['pr_bush', 3, 12], ['pr_bush', 20, 6], ['pr_bush', 13, 12], ['pr_sacks', 9, 4],
      ['pr_bamboo', 20, 4], ['pr_rocks', 16, 12], ['pr_bush', 9, 12],
    ],
    lights: [[18, 10, 70]],
    spots: {
      moon: { x: 17, y: 10, w: 3, h: 2, name: '달 비친 연못', look: ['연못에 둥근 달이 떠 있다. 바람이 불자 달이 잘게 부서졌다가 다시 모였다.'] },
      house: { x: 5, y: 4, w: 3, h: 1, name: '안채', look: ['안채 창호지에 등잔 불빛이 비친다. 몽석이 잠든 방이다.'] },
    },
  };

  // ── 맵: 지리산 연곡 피란처(그 밤) ──
  const yeongok = {
    name: '지리산 연곡 · 피란처', theme: 'village', night: true, music: 'flight',
    spawn: [11, 12, 'left'],
    grid: mk(32, 18, 'm', [
      ['rect', 0, 0, 32, 2, 'c'],
      ['rect', 2, 4, 19, 11, 'e'],
      ['rect', 1, 2, 3, 2, 'c'], ['rect', 15, 2, 4, 1, 'c'],
      ['rect', 8, 15, 3, 3, ':'],
      ['rect', 20, 9, 3, 2, ':'],
      ['rect', 23, 0, 2, 18, '~'],
      ['rect', 23, 9, 2, 2, 'b'],
      ['rect', 25, 9, 6, 2, ':'],
      ['rect', 3, 5, 3, 2, '.'], ['rect', 17, 12, 3, 2, '.'],
      ['dots', ',', [[4, 12], [5, 13], [18, 5], [27, 4], [28, 14], [12, 16]]],
      ['dots', 'c', [[0, 2], [31, 2], [26, 2], [27, 2]]],
      ['rect', 0, 0, 1, 18, 'h'], ['rect', 31, 0, 1, 18, 'h'], ['rect', 0, 17, 32, 1, 'h'],
      ['rect', 8, 17, 3, 1, ':'],
    ]),
    props: [
      ['pr_thatch', 4, 8], ['pr_thatch', 12, 7],
      ['pr_pine', 1, 4], ['pr_pine', 19, 4], ['pr_pine', 26, 6], ['pr_pine', 28, 16], ['pr_pine', 1, 16], ['pr_pine', 14, 16], ['pr_pine', 20, 16],
      ['pr_bamboo', 9, 5], ['pr_bamboo', 21, 13], ['pr_bamboo', 29, 8],
      ['pr_boulder', 17, 14], ['pr_rocks', 10, 13], ['pr_rocks', 26, 12], ['pr_rocks', 3, 14],
      ['pr_bush', 2, 11], ['pr_bush', 16, 5], ['pr_bush', 27, 14],
      ['pr_reeds', 22, 3, { flat: true }], ['pr_reeds', 22, 14, { flat: true }], ['pr_reeds', 25, 7, { flat: true }],
      ['pr_sacks', 9, 9], ['pr_sacks', 17, 8], ['pr_lantern', 8, 9],
    ],
    spots: {
      hut: { x: 6, y: 9, w: 1, h: 1, name: '우리 움막', act: '들어가기' },
      valley: { x: 26, y: 9, w: 3, h: 2, name: '골짜기 아랫길', look: ['다리 건너 아랫길로 횃불이 줄지어 움직인다. 구례로 내려간 최척도 저 길을 걸었다.'] },
      downpath: { x: 8, y: 15, w: 3, h: 1, name: '아래쪽 산길', look: ['산 아래에서 횃불이 이 길을 타고 올라온다. 이쪽으로는 내려갈 수 없다.', '연곡사 스님들도 짐을 꾸려 산 위로 피했다고 한다.'] },
    },
    npcs: {
      r1: { sp: 'sp_captive', name: '피란민', x: 15, y: 11, dir: 'left', wander: 1, talk: [['적이 구례 쪽에서 올라온대요. 짐은 버리고 몸만 빠져나가야 해요.'], ['우리 아버지는 남원성에 남으셨어요. 아직 소식이 없어요.']] },
      r2: { sp: 'sp_captive', name: '피란민', x: 18, y: 7, dir: 'down', wander: 1, talk: [['쉿, 불을 켜지 마시오. 저 아래서 보일 거요.']] },
      r3: { sp: 'sp_joseon_sailor', name: '젊은 장정', x: 20, y: 10, dir: 'right', talk: [['다리 건너는 내가 지켜볼 테니, 식구들 챙기시오.']] },
    },
  };

  PLACES.namwon = {
    name: '남원',
    act: 1,
    node: 'namwon',
    map: 'home',
    spawn: [8, 7, 'down'],
    music: 'namwon_memory',
    cover: 'sc_namwon_tongso',
    // 회상 동안은 여복, 피란처부터는 남복
    avatar: (st) => (st.done && st.done['b:namwon:nb-tongso'] ? 'sp_okyoung_m' : 'sp_okyoung_f'),
    intro: '도망치려는 그 순간, 옥영의 귀에 한 가락이 스쳤다. 남원의 봄밤, 퉁소 소리.',
    maps: { home, yeongok },
    cast: {
      home: {
        cheok: { who: 'choecheok', x: 15, y: 10, dir: 'left' },
        mom: { who: 'simssi', x: 7, y: 6, dir: 'down', talk: [['밤이 깊었구나. 사위가 또 퉁소를 부는 게지.', '저 가락만 들으면 마음이 놓인다.']] },
      },
      yeongok: {
        mom: { who: 'simssi', x: 8, y: 11, dir: 'right', talk: [['얘야, 몽석이는 춘생이가 업었다. 너는 네 몸부터 챙기거라.'], ['사위는 아직 소식이 없구나. 구례 길이 막혔을까.']] },
        father: {
          who: 'choesuk', x: 14, y: 10, dir: 'left',
          talk: [
            ['척이가 의병으로 나갔을 때 명나라 군사들과 어울렸다더구나. 그 덕에 중국말을 좀 한다지.', '남원성 안에도 명나라 군사가 있었다. 그 사람들은 왜 이 먼 데까지 왔을까… 궁금하거든 다시 물어보거라.'],
            ['내 아는 대로 일러 주마. 잘 들어 두어라.', { learnStep: 'n-ming' }],
            ['어서 짐을 챙기거라. 시간이 없다.'],
          ],
        },
        escapee: {
          sp: 'sp_joseon_sailor', name: '남원성에서 빠져나온 사내', x: 17, y: 11, dir: 'left',
          talk: [
            ['나는 남원성에서 빠져나왔소. 성이 며칠을 못 버티더군.', '그 안에서 무슨 일이 있었는지 알고 싶거든, 다시 말을 거시오.'],
            ['…들어 두시오. 잊으면 안 되는 일이니.', { learnStep: 'n-war' }],
            ['불빛이 점점 가까워지오. 서두르시오.'],
          ],
        },
        chunsaeng: { sp: 'sp_captive', name: '여종 춘생', x: 6, y: 12, dir: 'up', talk: [['아기씨는 제가 업을게요. 마님은 걱정 마세요.']] },
      },
    },
    beats: [
      {
        id: 'nb-tongso', map: 'home', avatar: 'sp_okyoung_f', goal: '퉁소 소리를 따라가 보자', talk: 'cheok',
        say: ['— 남원, 몇 해 전 봄밤.', '달이 밝았다. 마당 끝 버드나무 아래에서 퉁소 소리가 들려왔다.'],
        steps: ['n-tongso', 'n-poem', 'n-poem-basic', 'n-poem-deep', 'n-frag1', 'n-answer', 'n-answer-card', 'n-omen', 'n-memcard-basic', 'n-memcard-deep'],
      },
      {
        id: 'nb-namboc', map: 'yeongok', spawn: [11, 12, 'left'], avatar: 'sp_okyoung_m', auto: true, night: true,
        fire: [[8, 17], [10, 17], [29, 10]],
        steps: ['n-namboc', 'n-namboc-basic', 'n-namboc-deep'],
      },
      {
        id: 'nb-flee', goal: '식구들을 살피고, 움막에서 챙길 것을 고르자', at: 'hut',
        steps: ['n-flee', 'n-scatter'],
      },
    ],
    steps: [
      // ── 회상: 퉁소의 밤(¶07) ──
      {
        id: 'n-tongso', type: 'say', scene: 'sc_namwon_tongso',
        lines: [
          { fx: { tongsoSound: { clarity: 1 } }, t: '최척이 퉁소를 불고 있었다. 달 밝은 저녁이나 꽃 핀 아침이면, 두 사람은 이렇게 마주 앉곤 했다.' },
          '한 곡, 두 곡, 세 곡. 가락이 꽃 그림자 위로 번졌다.',
          '옥영이 한참 낮게 읊조리다가 입을 열었다.',
          { card: { kind: 'orig', title: '옥영의 말', han: '妾素惡婦人之吟詩者, 而到此情境, 不能自已.', ko: '저는 본래 여자가 시를 읊는 것을 탐탁지 않게 여겼어요. 그런데 이런 밤을 만나니 저도 모르게 시가 나오네요.' } },
        ],
      },
      {
        id: 'n-poem', type: 'say', scene: 'sc_namwon_tongso',
        lines: ['그러고는 시 한 수를 읊었다.'],
      },
      {
        id: 'n-poem-basic', type: 'card', when: { mode: 'basic' },
        card: {
          id: 'c-poem-okyoung', kind: 'orig', title: '옥영이 지은 시',
          body: '퉁소 부는 남편을 신선 **왕자진**에 빗댔어요. 달이 기울고 이슬이 차가운 밤이지만 우리는 **꼭 함께** 신선의 섬으로 가자, 안개와 노을이 짙어도 **길을 잃지 않겠다**는 노래예요.',
          quote: { 원문: '王子吹簫月欲低 碧天如海露凄凄 會須共御靑鸞去 蓬島煙霞路不迷', 풀이: '왕자진이 퉁소 부는 밤, 달은 기울어 가고\n바다 같은 푸른 하늘, 이슬은 차갑게 내리네\n우리 꼭 푸른 난새 함께 타고 떠나리니\n봉래섬 안개 노을에도 길 잃지 않으리' },
          src: '「최척전」 ¶07 · 옥영의 칠언절구',
        },
      },
      {
        id: 'n-poem-deep', type: 'card', when: { mode: 'deep' },
        card: {
          id: 'c-poem-okyoung', kind: 'orig', title: '옥영이 지은 시',
          body: '**王子(왕자진)** 생황을 잘 불어 봉황 울음을 냈고 뒤에 신선이 되었다는 주나라 태자. **靑鸞** 신선이 타는 푸른 난새. **蓬島** 동쪽 바다의 신선 섬 봉래산. **會須**는 "반드시 ~하리라"는 다짐이에요.',
          quote: { 원문: '王子吹簫月欲低 碧天如海露凄凄 會須共御靑鸞去 蓬島煙霞路不迷', 풀이: '왕자진이 퉁소 부는 밤, 달은 기울어 가고\n바다 같은 푸른 하늘, 이슬은 차갑게 내리네\n우리 꼭 푸른 난새 함께 타고 떠나리니\n봉래섬 안개 노을에도 길 잃지 않으리' },
          src: '「최척전」 ¶07 · 옥영의 칠언절구',
        },
      },
      {
        id: 'n-frag1', type: 'frag', n: 1, fx: { flags: { tongsoMemory: true } },
        lines: ['퉁소 가락과 함께, 시의 첫 구절이 마음 깊이 새겨졌다. 이 가락만은 어디서 들어도 알아들을 것 같았다.'],
      },
      {
        id: 'n-answer', type: 'say', scene: 'sc_namwon_tongso',
        lines: ['최척은 아내의 글솜씨가 이만한 줄 처음 알았다. 크게 놀라 한 번 읊고 세 번 감탄하더니, 곧바로 시 한 수로 답했다.'],
      },
      {
        id: 'n-answer-card', type: 'card',
        card: {
          id: 'c-poem-choecheok', kind: 'orig', title: '최척이 답한 시',
          body: '아내의 시가 신선과 함께 떠남을 노래하자, 최척은 신선의 누대와 끝나지 않는 퉁소 가락으로 받았어요.',
          quote: { 원문: '瑤臺繚緲曉雲紅 吹澈鸞簫曲未終 餘響滿空山月落 一庭花影動香風', 풀이: '요대는 아득하고 새벽 구름 붉은데\n난새 퉁소 끝까지 불어도 가락은 끝나지 않네\n남은 소리 하늘 가득하고 산 위의 달은 지는데\n뜰 가득 꽃 그림자, 향긋한 바람에 흔들리네' },
          src: '「최척전」 ¶07 · 최척의 화답시',
        },
      },
      {
        id: 'n-omen', type: 'say', scene: 'sc_namwon_tongso',
        lines: [
          '시를 다 읊고 나자, 옥영은 즐거움이 채 가시기도 전에 눈물을 흘렸다.',
          { who: 'okyoung', t: '세상일은 탈이 많고, 좋은 일에는 마가 끼는 법이에요. 한평생 사는 동안 만나고 헤어지는 일을 장담할 수 없지요.' },
          { when: { mode: 'deep' }, card: { kind: 'orig', title: '옥영의 눈물', han: '人間多故, 好事有魔, 百年之內, 離合難常.', ko: '세상일은 탈이 많고 좋은 일에는 마가 끼는 법이에요. 한평생 사는 동안 만나고 헤어지는 일을 장담할 수 없지요.' } },
          { fx: { tongsoSound: false }, t: '퉁소 소리가 멀어졌다.' },
        ],
      },
      {
        id: 'n-memcard-basic', type: 'card', when: { mode: 'basic' },
        card: {
          id: 'c-namwon-tongso', kind: 'orig', title: '퉁소의 밤',
          body: '퉁소를 분 사람은 **최척**, 「왕자진이 퉁소 부는 밤」을 지은 사람은 **옥영**, 「요대는 아득하고」로 답한 사람은 **최척**이에요. 옥영의 시가 뒷날 안남 포구에서 두 사람을 다시 이어 줍니다.\n옥영이 눈물지으며 한 말 "만나고 헤어지는 일을 장담할 수 없다"는 뒤에 올 이별을 미리 비추는 복선이에요.',
          quote: { 원문: '妾素惡婦人之吟詩者, 而到此情境, 不能自已.', 풀이: '저는 본래 여자가 시를 읊는 것을 탐탁지 않게 여겼어요. 그런데 이런 밤을 만나니 저도 모르게 시가 나오네요.' },
          src: '「최척전」 ¶07',
        },
      },
      {
        id: 'n-memcard-deep', type: 'card', when: { mode: 'deep' },
        card: {
          id: 'c-namwon-tongso', kind: 'orig', title: '퉁소의 밤',
          body: '퉁소를 분 사람은 **최척**, 「王子吹簫」를 지은 사람은 **옥영**, 「瑤臺繚緲」로 답한 사람은 **최척**이에요. 마지막 말은 뒤에 올 이산을 미리 비추는 복선입니다.',
          quote: { 원문: '陟善吹簫, 每月夕花朝相對而吹. … 玉英沈吟良久曰: "妾素惡婦人之吟詩者, 而到此情境, 不能自已." … 陟初不知其藻詞之如此, 聞詩大驚, 一唱三歎, 卽以一絶和之.', 풀이: '최척은 퉁소를 잘 불어, 달 밝은 저녁이나 꽃 핀 아침이면 아내와 마주 앉아 불곤 했다. … 옥영이 한참 낮게 읊조리다가 말했다. "저는 본래 여자가 시를 읊는 것을 탐탁지 않게 여겼어요. 그런데 이런 밤을 만나니 저도 모르게 시가 나오네요." … 최척은 아내의 글솜씨가 이만한 줄 처음 알았다. 크게 놀라 한 번 읊고 세 번 감탄하고는 곧바로 절구 한 수로 화답했다.' },
          src: '「최척전」 ¶07',
        },
      },

      // ── 피란처의 그 밤: 남복(¶08) ──
      {
        id: 'n-namboc', type: 'say', scene: 'sc_namwon_namboc',
        lines: [
          { fx: { tongsoSound: false }, t: '— 퉁소 소리가 끊겼다. 지리산 연곡 골짜기, 그 밤이었다.' },
          '옥영은 사내 옷의 옷깃을 여몄다. 산에 들던 날 최척이 건넨 옷이었다.',
          { who: 'choecheok', t: '사람들 틈에서는 사내로 지내시오. 그래야 몸을 지킬 수 있소.' },
          '골짜기 아래 불빛이 조금씩 올라오고 있었다. 식구들을 챙겨 떠나야 한다.',
        ],
      },
      {
        id: 'n-namboc-basic', type: 'card', when: { mode: 'basic' },
        card: {
          id: 'c-namwon-namboc', kind: 'orig', title: '피란길의 남복',
          body: '정유년 8월, 남원이 함락되어 지리산 연곡으로 피란할 때 최척은 옥영에게 사내 옷을 입혔어요. 전쟁터에서 여자는 더 쉽게 붙잡히고 해를 입었지요.\n**남장은 살아남는 방법이자, 아내로서의 몸을 지키는 방법**이었어요. 옥영은 일본에 끌려가서도 이 차림을 지켜 네 해 동안 여자임을 들키지 않아요.',
          quote: { 원문: '陟令玉英着男服 … 人之見之者, 皆不知其爲女子也.', 풀이: '최척은 옥영에게 남자 옷을 입혔다. 보는 사람마다 여자인 줄 몰랐다.' },
          src: '「최척전」 ¶08',
        },
      },
      {
        id: 'n-namboc-deep', type: 'card', when: { mode: 'deep' },
        card: {
          id: 'c-namwon-namboc', kind: 'orig', title: '피란길의 남복',
          body: '**남장은 살아남는 방법이자, 아내로서의 몸을 지키는 방법**이었어요. 옷 한 벌이 생(살아남기)과 연(아내로서의 자리)을 함께 지켰지요. 이 게임이 말하는 \'지혜의 길\'의 첫 본보기입니다.',
          quote: { 원문: '至丁酉八月, 賊陷南原, 人皆逃竄. 陟之一家, 避于智異山燕谷. 陟令玉英着男服, 雜錯於廣衆之中, 人之見之者, 皆不知其爲女子也.', 풀이: '정유년 8월에 이르러 왜적이 남원을 함락하자 사람들이 모두 달아나 숨었다. 최척의 집안은 지리산 연곡으로 피했다. 최척은 옥영에게 남자 옷을 입혀 많은 사람들 틈에 섞여 있게 하니, 보는 사람마다 그가 여자인 줄 알지 못했다.' },
          src: '「최척전」 ¶08 (廣衆: 위키문헌의 \'廣原\'을 규장각 일사문고본으로 바로잡음)',
        },
      },

      // ── 역사 카드(피란처 사람들에게 한 번 더 말을 걸면) ──
      {
        id: 'n-war', type: 'card', history: 'h-namwon-war',
        card: {
          title: '정유재란과 남원성 함락(1597)',
          body: '1597년(정유년), 강화 협상이 깨지자 일본은 다시 조선을 침략했다. 이를 정유재란이라 한다.\n일본군은 곡창 지대인 전라도를 노렸고, 그해 8월 남원성을 에워쌌다. 성 안에서는 명나라 부총병 양원이 이끈 군사 약 3천 명과 전라병사 이복남 등 조선 군민이 맞섰지만, 며칠 만에 성이 무너져 군사와 백성 대부분이 목숨을 잃었다.\n이때 죽은 이들을 함께 묻은 무덤이 남원의 만인의총이다.',
          quote: { 원문: '至丁酉八月, 賊陷南原, 人皆逃竄.', 풀이: '정유년(1597) 8월, 왜적이 남원을 함락하자 사람들이 모두 달아나 숨었다.' },
          src: '「최척전」 ¶08 · 남원성 전투·만인의총 관련 자료',
        },
      },
      {
        id: 'n-ming', type: 'card', history: 'h-namwon-ming',
        card: {
          title: '명군 장수와 조선',
          body: '임진왜란과 정유재란 때 명나라는 조선에 대군을 보냈다. 남원성에서도 명나라 군사가 조선 사람들과 함께 싸웠다.\n전쟁이 끝나자 명군을 따라 중국으로 건너간 조선 사람도 있었고, 반대로 조선에 남은 명나라 군사도 있었다. 「최척전」에도 최척을 중국으로 데려가는 명나라 군관 여유문, 조선에 왔다가 돌아가지 못한 명나라 군사 진위경이 나온다.\n국경을 넘어 온 군대가 사람들의 삶도 국경 너머로 옮겨 놓았다.',
          quote: { 원문: '稍解華語', 풀이: '(최척은 의병 시절 명나라 군사들과 어울려) 중국말을 조금 알게 되었다.' },
          src: '「최척전」 ¶09 · 여유문은 역사 기록에서 확인되지 않는 작품 속 인물',
        },
      },

      // ── 첫 딜레마(게임 창작) ──
      {
        id: 'n-flee', type: 'dilemma', dilemma: 'd-namwon-flee', scene: 'sc_namwon_flee',
        prompt: [
          '움막 안. 바깥에서 누군가 외쳤다. "적이다! 골짜기로 올라온다!"',
          '두 손에 들고 뛸 수 있는 것은 하나뿐이다. 혼인날 최척과 나누어 가진 **쌍가락지 한 짝**, 그리고 마지막 남은 **보리 한 자루**.',
        ],
        q: '무엇을 들고 도망칠까?',
        hint: '고른 길에 따라 왼쪽 위 緣(인연을 붙드는 힘)과 生(살아갈 힘)이 출렁여요.',
        options: [
          {
            id: 'sinpyo', type: 'yeon', label: '신표를 챙긴다', desc: '최척과 나눈 가락지 한 짝. 다시 만날 날의 표지다.',
            fx: { frag: 2, token: { id: 'sinpyo', name: '신표 — 가락지 한 짝', desc: '혼인날 받은 쌍가락지 가운데 한 짝. 다른 한 짝은 최척이 지니고 있다.' } },
            reply: ['가락지를 움켜쥐자, 그 봄밤 시의 둘째 구절이 또렷이 떠올랐다. "바다 같은 푸른 하늘, 이슬은 차갑게 내리네."', '대신 보리 자루는 움막에 두고 나왔다. 빈속으로 긴 밤을 걸어야 한다.'],
          },
          {
            id: 'food', type: 'saeng', label: '양식을 챙긴다', desc: '보리 한 자루. 며칠은 버틸 수 있다.',
            reply: ['옥영은 보리 자루를 짊어졌다. 가락지는 움막 어딘가에 두고 나왔다.', '살아남아야 다시 만날 수도 있다. 그렇게 마음을 다잡았다.'],
          },
        ],
        orig: null,
        card: {
          title: '무엇을 들고 도망칠 것인가',
          summary: '원작에서 이 가족이 흩어진 직접 계기는 **양식이 떨어진 일**이었어요. 최척은 먹을 것을 구하러 구례로 나갔고, 바로 그날 적이 피란처를 휩쓸었습니다. 원작에는 \'신표\'라는 물건이 따로 나오지 않아요. 두 사람을 다시 이어 준 것은 옥영이 지은 **시 한 수**였지요.',
          quote: { 원문: '入山累日, 糧盡將饑, 陟與丁壯數三出山求食且覘賊勢.', 풀이: '산에 든 지 여러 날, 양식이 떨어져 굶게 되자 최척은 장정 두셋과 함께 산을 나섰다. 먹을 것을 구하고 적의 형세도 살필 참이었다.' },
          quoteLong: { 원문: '入山累日, 糧盡將饑, 陟與丁壯數三出山求食且覘賊勢. 行到求禮, 猝遇賊兵, 潛身於巖藪而避之. 是日, 賊入燕谷, 彌山遍谷搶掠無遺, 而陟路梗不得進退.', 풀이: '산에 든 지 여러 날, 양식이 떨어져 굶게 되자 최척은 장정 두셋과 함께 산을 나섰다. 먹을 것을 구하고 적의 형세도 살필 참이었다. 구례에 이르러 갑자기 적병을 만나 바위 덤불 속에 몸을 숨겼다. 바로 그날 적이 연곡에 들어와 온 산과 골짜기를 빠짐없이 노략질했다. 최척은 길이 막혀 오도 가도 못했다.' },
          extraGloss: '양식(糧)은 먹을거리, 적의 형세(賊勢)는 적이 어디서 무엇을 하는지예요. 굶주림이 최척을 산 밖으로 내몰았고, 바로 그 틈에 가족이 흩어졌어요.',
          src: '「최척전」 ¶08',
        },
      },
      {
        id: 'n-scatter', type: 'say', scene: 'sc_namwon_scatter', music: 'sorrow',
        lines: [
          '산길은 불빛과 그림자, 외침과 발소리로 뒤엉켰다.',
          '몽석을 업은 여종 춘생과는 어둠 속에서 갈라졌다.',
          '적은 피란민을 섬진강 가로 몰아갔다. 젊고 힘센 사람만 골라 배에 실었다. 사내 옷을 입은 옥영도 그 틈에 끌려갔다.',
          { card: { kind: 'orig', title: '옥영의 회고', han: '自山驅至江上, 父母固無恙. 日暮上船, 蒼黃相失.', ko: '산에서 강가까지 끌려올 때만 해도 두 어른은 무사하셨어요. 날이 저물어 배에 오를 때 정신없는 틈에 서로 잃어버렸지요.' } },
          '배는 바다로 나아갔다. 남원이, 조선이 멀어졌다.',
        ],
      },
    ],
    scenes: {
      sc_namwon_tongso: { caption: '봄밤, 퉁소를 부는 최척과 시를 읊는 옥영', prompt_hint: 'Spring night in a Korean courtyard under a full moon, blossoming tree and willow by a small pond; a young scholar plays a long bamboo flute (tungso) while his wife in hanbok listens and softly recites a poem; petals drifting, warm lantern light' },
      sc_namwon_namboc: { caption: '사내 옷의 옷깃을 여미는 옥영', prompt_hint: 'Night in a mountain refugee camp, a young Korean woman disguised in plain men\'s clothes tightening her collar, straw huts and pine trees behind, faint orange glow of distant torches down the valley' },
      sc_namwon_flee: { caption: '움막 안, 가락지 한 짝과 보리 한 자루', prompt_hint: 'Inside a dim straw hut at night, a woman\'s hands hovering between a small jade ring on a cloth and a sack of barley, orange light flickering through the doorway; still life, tense' },
      sc_namwon_scatter: { caption: '섬진강 가, 날이 저무는 배', prompt_hint: 'Dusk on a wide river (Seomjin), silhouettes of boats with sails pushing off into hazy water, small figures on the bank seen from far away, sorrowful indigo and dim orange; symbolic, no violence' },
    },
  };
})();
