'use strict';
// 낭고야(1막 둘째 거점) — 돈우의 집 · 포구
//  원작(¶11·¶13·¶19): 옥영은 늙은 왜인 돈우에게 붙잡혀 낭고야로 끌려간다. 여러 번 삶을 놓으려 했지만
//  꿈에 만복사 장육불이 "부디 죽지 마라, 뒤에 반드시 기쁜 일이 있으리라" 하고, 옥영은 '만에 하나'를 붙들고 버틴다.
//  옥영은 몸 약한 사내라고 둘러대고, 돈우는 그를 '사간'이라 부르며 장삿배의 화장(火長)으로 둔다. 돈우는 끝내 여자인 줄 몰랐다.
//  - 고정 사건: 장육불 꿈(연 +1, 원작 궤적에도 반영). 자결 시도는 선택지가 아니라 서술로만, 장육불의 말을 가운데에.
//  - 딜레마 둘: "조선 소식을 물을 것인가"(게임 창작, 지혜의 길 = 돈우 카드) → "돈우의 장삿배에 오를 것인가"(원작: 오른다)
//  - 역사 카드 둘(h-nanggoya-captives, h-nanggoya-donwoo)과 일본말(k-japanese)은 탐색으로 얻는다(읽을지 말지는 학생이 고른다).
//  - 단계 목록은 노는 차례 그대로다(이어 하기 글자 되살리기). 어느 쪽을 골라도 다음은 안남이다.
window.PLACES = window.PLACES || {};

(function () {
  const mk = (window.G && G.world && G.world.mk) || null;
  if (!mk) return;

  // ── 맵: 돈우의 집 ──
  const house = {
    name: '돈우의 집', theme: 'port', music: 'nanggoya',
    spawn: [8, 9, 'right'],
    grid: mk(26, 15, '.', [
      ['frame', 1, 1, 24, 13, '#'],
      ['rect', 2, 7, 22, 5, 'q'],
      ['rect', 2, 2, 22, 5, '.'],
      ['rect', 11, 7, 3, 6, '='],
      ['rect', 3, 7, 7, 1, '='],
      ['rect', 18, 7, 6, 1, '='],
      ['rect', 15, 9, 3, 2, '~'],
      ['rect', 2, 12, 22, 1, '.'],
      ['rect', 12, 13, 2, 1, '='],
      ['dots', ',', [[2, 2], [3, 2], [23, 11], [22, 12], [9, 12], [2, 11]]],
      ['rect', 0, 14, 26, 1, 'h'], ['rect', 0, 0, 26, 1, 'h'], ['rect', 0, 0, 1, 15, 'h'], ['rect', 25, 0, 1, 15, 'h'],
    ]),
    props: [
      ['pr_jphouse', 3, 6], ['pr_jphouse', 12, 5],
      ['pr_buddha', 20, 6], ['pr_lantern_stone', 19, 7], ['pr_lantern_stone', 22, 7],
      ['pr_pine', 21, 13], ['pr_pine', 2, 4], ['pr_bamboo', 23, 4], ['pr_bamboo', 9, 4],
      ['pr_bush', 18, 11], ['pr_bush', 3, 12], ['pr_rocks', 14, 11],
      ['pr_barrels', 9, 7], ['pr_sacks', 8, 11], ['pr_crates', 17, 4],
    ],
    spots: {
      altar: { x: 20, y: 5, w: 2, h: 2, name: '작은 불당', look: ['작은 불상 앞에 향이 타고 있다. 돈우는 아침저녁으로 이 앞에서 염불을 왼다.', '불상의 얼굴이 어쩐지 남원 만복사의 장육불을 닮았다.'] },
      kitchen: { x: 5, y: 7, w: 2, h: 1, name: '부엌', look: ['사간의 일터다. 날마다 이 부엌에서 밥을 짓고, 밤에는 바느질을 한다.', '돈우의 늙은 아내와 어린 딸이 사간을 부를 때는 일본말로 부른다. 아직 반도 알아듣지 못한다.'] },
      gate: { x: 11, y: 12, w: 3, h: 2, name: '대문' },
    },
  };

  // ── 맵: 낭고야 포구 ──
  const pier = {
    name: '낭고야 포구', theme: 'port', music: 'nanggoya',
    spawn: [3, 8, 'right'],
    grid: mk(32, 17, 'w', [
      ['rect', 0, 0, 17, 17, '.'],
      ['rect', 0, 0, 17, 2, 'm'],
      ['rect', 0, 7, 15, 3, '='],
      ['rect', 0, 11, 15, 6, 'e'],
      ['rect', 2, 12, 9, 3, ':'],
      ['rect', 15, 0, 3, 17, 'n'],
      ['rect', 18, 0, 3, 17, '~'],
      ['rect', 18, 7, 10, 2, '_'],
      ['rect', 18, 13, 4, 1, '_'],
      ['rect', 0, 16, 15, 1, 's'],
    ]),
    props: [
      ['pr_jphouse', 0, 6], ['pr_jphouse', 7, 6],
      ['pr_jpship', 20, 6], ['pr_fishboat', 21, 16], ['pr_boat', 24, 12],
      ['pr_crates', 13, 11], ['pr_crates', 16, 3], ['pr_barrels', 11, 12], ['pr_barrels', 16, 14],
      ['pr_nets', 3, 13, { flat: true }], ['pr_netrack', 6, 15], ['pr_anchor', 15, 12],
      ['pr_post', 17, 6], ['pr_post', 17, 9], ['pr_post', 17, 12],
      ['pr_pine', 12, 2], ['pr_sacks', 1, 11], ['pr_sacks', 9, 15], ['pr_lantern', 14, 6],
    ],
    spots: {
      market: { x: 3, y: 8, w: 4, h: 1, name: '흥정하는 장꾼들', act: '귀 기울이기', look: ['생선 장수와 손님이 큰 소리로 흥정한다.', { learnStep: 'g-japanese' }] },
      pierEnd: { x: 26, y: 7, w: 2, h: 2, name: '부두 끝', look: ['바다 저편은 안개에 묻혀 있다. 저 너머 어딘가에 조선이 있다.'] },
    },
    npcs: {
      jp1: { sp: 'sp_merchant_jp', name: '생선 장수', x: 4, y: 10, dir: 'right', talk: [['(일본말로 무어라 외친다. "싸다, 싸!"쯤 되는 말 같다.)']] },
      jp2: { sp: 'sp_merchant_jp', name: '손님', x: 7, y: 10, dir: 'left', talk: [['(손을 내저으며 값을 깎는다.)']] },
      sailor: { sp: 'sp_sailor_sea', name: '뱃사람', x: 24, y: 8, dir: 'left', wander: 1, talk: [['돈우 영감 배가 곧 남쪽으로 뜬다더군. 복건이며 절강이며, 멀리도 다니지.']] },
      porter2: { sp: 'sp_captive', name: '짐꾼', x: 10, y: 14, dir: 'up', wander: 1, talk: [['…(말없이 짐을 나른다. 조선 사람인 듯하지만 눈을 마주치지 않는다.)']] },
    },
  };

  PLACES.nanggoya = {
    name: '낭고야',
    year: '1597~1600',
    act: 1,
    node: 'nanggoya',
    map: 'house',
    spawn: [8, 9, 'right'],
    music: 'nanggoya',
    avatar: 'sp_okyoung_m',
    cover: 'sc_nanggoya_arrive',
    intro: '바다 건너 낯선 포구 마을. 옥영은 이제 사내 옷을 입은 포로다.',
    maps: { house, pier },
    cast: {
      house: {
        donwoo: {
          who: 'donwoo', x: 20.5, y: 8, dir: 'up',
          talk: [
            ['(염불을 멈추고 돌아본다) 사간이냐. 나는 장사꾼이지 칼잡이가 아니다.', '내가 왜 산 목숨을 해치지 않는지 궁금하거든, 언제 또 와서 묻거라.'],
            ['(돈우가 불상 쪽을 바라보며 천천히 말한다)', { learnStep: 'g-donwoo' }],
            ['나무아미타불… 나무아미타불…'],
          ],
        },
      },
      pier: {
        porter: { sp: 'sp_captive', name: '조선 말을 쓰는 짐꾼', x: 12, y: 13, dir: 'left' },
        elder: {
          sp: 'sp_captive', name: '나이 든 포로', x: 4, y: 14, dir: 'right',
          talk: [
            ['여기 끌려온 조선 사람이 우리뿐인 줄 아시오?', '…더 듣고 싶거든, 짐을 다 나른 뒤에 다시 오시오.'],
            ['들어 보시오. 이 바다 건너 끌려온 사람이 얼마나 되는지.', { learnStep: 'g-captives' }],
            ['고향 땅을 다시 밟을 날이 올까.'],
          ],
        },
        donwoo: {
          who: 'donwoo', x: 19, y: 8, dir: 'up',
          talk: [
            ['배 밑창을 손봐야겠구나. 사간, 너는 바다가 무섭지 않으냐?', '…내가 왜 칼을 들지 않는지 궁금하거든, 다시 와서 묻거라.'],
            ['(돈우가 손을 모으고 말한다)', { learnStep: 'g-donwoo' }],
            ['나무아미타불.'],
          ],
        },
      },
    },
    beats: [
      { id: 'gb-arrive', map: 'house', auto: true, steps: ['g-arrive', 'g-dream', 'g-wake', 'g-news-ming'] },
      { id: 'gb-sagan', goal: '불당 앞의 돈우에게 가 보자', talk: 'donwoo', steps: ['g-sagan'] },
      { id: 'gb-out', goal: '대문을 나서 포구로 가 보자', go: 'gate' },
      {
        id: 'gb-news', map: 'pier', spawn: [3, 8, 'right'], goal: '조선 말소리가 들리는 쪽으로 가 보자', talk: 'porter',
        say: ['포구 어딘가에서 귀에 익은 말소리가 들렸다. 조선말이었다.'],
        steps: ['g-news'],
      },
      { id: 'gb-ship', goal: '배를 손보는 돈우에게 가 보자', talk: 'donwoo', steps: ['g-ship', 'g-news-songwoo', 'g-sail'] },
    ],
    steps: [
      {
        id: 'g-arrive', type: 'say', scene: 'sc_nanggoya_arrive',
        lines: [
          '섬진강에서 배에 실린 지 여러 날. 배는 바다를 건너 일본 땅에 닿았다.',
          '옥영을 데려간 사람은 늙은 왜인 돈우였다. 돈우의 집은 낭고야라는 포구 마을에 있었다.',
          { when: { mode: 'deep' }, t: '(낭고야: 원문 필사본에 浪○射로 적힌 지명이다. 오늘날 일본 규슈 사가현의 나고야(名護屋)로 보는 견해가 많다. 임진·정유 전쟁 때 일본군이 드나든 항구다.)' },
        ],
      },
      {
        id: 'g-dream', type: 'dream', fixed: true, gauge: { yeon: 1 }, scene: 'sc_nanggoya_dream', music: 'dream',
        lines: [
          '끌려온 뒤 옥영은 여러 번 삶을 놓으려 했다. 그때마다 누군가에게 들켜 붙들렸다.',
          '어느 밤, 꿈속에 금빛이 번졌다. 만복사의 장육불이었다.',
        ],
        quote: { 원문: '我萬福佛也. 愼無死, 後必有喜.', 풀이: '나는 만복사 부처다. 부디 죽지 마라. 뒤에 반드시 기쁜 일이 있으리라.' },
      },
      {
        id: 'g-wake', type: 'say', scene: 'sc_nanggoya_arrive',
        lines: [
          '옥영은 깨어나 그 꿈을 곱씹었다. 만에 하나라도 바랄 것이 있지 않을까.',
          '그날부터 옥영은 억지로라도 밥을 떠 넣었다. 살아 있어야 다시 만날 수 있다.',
          { when: { mode: 'deep' }, card: { kind: 'orig', title: '만에 하나', han: '玉英覺而諗其夢, 不能無萬一之冀, 遂强食不死.', ko: '옥영은 깨어나 그 꿈을 곱씹으며, 만에 하나라도 바랄 것이 있지 않을까 하는 마음을 버릴 수 없었다. 그래서 억지로 밥을 먹으며 죽지 않고 버텼다.' } },
        ],
      },
      // 옥영이 모르는 소식 ③: 최척은 명나라 장수를 따라 중국으로(원작 ¶09). 지식을 주지 않는 카드 단계
      {
        id: 'g-news-ming', type: 'card',
        lines: ['그 무렵, 바다 건너 조선에서 일어난 일이다.'],
        card: {
          id: 'q-news-ming', kind: 'letter', kindLabel: '옥영이 모르는 소식 ③', title: '금교의 명나라 장수',
          body: '식구를 모두 잃었다고 여긴 최척은 무너진 남원 옛집 가까운 금교 다리 곁에 며칠을 굶은 채 쓰러져 있었다. 그때 말을 씻기러 온 명나라 장수 여유문을 만났다.\n의병 시절 명나라 군사들과 어울리며 익힌 중국말로 사정을 털어놓자, 여유문은 최척을 자기 진으로 데려갔다. 명나라 군대가 돌아갈 때 최척도 함께 건너가 중국 절강 땅에서 살게 되었다.\n옥영은 이 일을 모른다.',
          quote: { 원문: '吾是吳總兵之千總余有文也. 家在浙江姚興府 … 遂以一馬載歸于陣.', 풀이: '"나는 오 총병 아래의 천총 여유문이오. 집은 절강 요흥부에 있소." … 마침내 말 한 필에 태워 진으로 데려갔다.' },
          src: '「최척전」 ¶09',
        },
      },
      {
        id: 'g-sagan', type: 'say', scene: 'sc_nanggoya_sagan',
        lines: [
          { who: 'donwoo', t: '(염불을 멈추고 돌아본다) 너는 무슨 일을 할 줄 아느냐.' },
          '옥영은 거짓으로 둘러댔다.',
          { who: 'okyoung', t: '저는 본래 몸집이 작은 사내로, 뼈가 약하고 병이 많습니다. 고향에서도 장정 일은 못 하고 바느질과 밥 짓기로 살았을 뿐입니다.' },
          { who: 'donwoo', t: '…가엾구나. 앞으로 너를 사간이라 부르마. 집안일을 거들거라.' },
          '그날부터 옥영은 \'사간\'이 되었다. 돈우는 영리한 사간이 달아날까 걱정하면서도, 좋은 옷과 좋은 음식을 주어 마음을 달래 주었다.',
          '돈우는 끝내 사간이 여자인 줄 몰랐다.',
        ],
      },

      // ── 탐색으로 얻는 것(말을 한 번 더 걸거나 귀 기울이면) ──
      {
        id: 'g-donwoo', type: 'card', history: 'h-nanggoya-donwoo',
        card: {
          title: '돈우와 불교 — 살생을 꺼린 늙은 왜인',
          body: '원작은 옥영을 붙잡은 늙은 일본인 돈우를 "본래 생명을 죽이지 않고 자비로이 염불하는 사람"으로 그린다.\n안남 포구에서 옥영이 탄 일본 배에서도 염불 소리가 흘러나온다. 돈우는 옥영을 은으로 사겠다는 제안을 물리치고 오히려 노자를 주어 떠나보낸다.\n적국 사람이라도 전쟁을 일으킨 장수와 장사로 먹고사는 늙은 뱃사람은 같지 않다는 것을 원작은 놓치지 않는다.',
          quote: { 원문: '頓于老倭本不殺生, 慈悲念佛, 以商販爲業.', 풀이: '늙은 일본인 돈우는 본래 생명을 죽이지 않았고, 자비로운 마음으로 염불을 했으며, 장사로 먹고사는 사람이었다.' },
          src: '「최척전」 ¶11 · ¶13',
        },
      },
      {
        id: 'g-captives', type: 'card', history: 'h-nanggoya-captives',
        card: {
          title: '일본으로 끌려간 조선인 포로',
          body: '임진왜란과 정유재란 때 일본군은 많은 조선 사람을 붙잡아 일본으로 데려갔다. 이들을 피로인(被擄人)이라 부른다.\n그 수는 수만 명에서 10만 명 안팎으로 짐작되지만 정확히 알 수 없다. 끌려간 사람들은 농사나 잡일에 부려지거나 팔려 갔고, 도공처럼 기술 때문에 끌려간 사람도 있었다.\n조선은 1607년부터 일본에 사신을 보내 포로를 데려왔지만, 돌아온 사람은 일부였다. 같은 때 포로로 끌려갔던 강항은 『간양록』에 그 경험을 직접 적었다.',
          src: '피로인·쇄환사 관련 자료',
        },
      },
      {
        id: 'g-news', type: 'dilemma', dilemma: 'd-nanggoya-news', scene: 'sc_nanggoya_news',
        prompt: [
          '짐꾼들 틈에서 남원 쪽 사투리가 들렸다. 조선에서 끌려온 사람이다.',
          { who: 'okyoung', t: '(남원 사람일까? 우리 식구 소식을 알지도 몰라.)' },
          '하지만 조선말로 말을 걸었다가 목소리나 몸짓에서 여자인 게 드러나면, 사간으로 지켜 온 모든 것이 무너진다.',
        ],
        q: '조선 소식을 물어볼까?',
        options: [
          {
            id: 'ask', type: 'yeon', label: '직접 조선말로 묻는다', desc: '식구들 소식을 들을지 모른다. 대신 정체가 드러날 위험이 있다.',
            fx: { frag: 3 },
            reply: [
              { who: 'captive', t: '남원 사람이오? 연곡 골짜기에서 끌려온 사람이 여럿 있소. 다 죽은 건 아니라더이다.' },
              { who: 'captive', t: '…그런데 당신, 목소리가 좀 이상하구려. 정말 사내 맞소?' },
              '옥영은 황급히 고개를 숙이고 돌아섰다. 가슴이 오래도록 뛰었다.',
              '그래도 \'다 죽은 건 아니라\'는 말. 그 말을 붙들자 그 봄밤 시의 셋째 구절이 떠올랐다. "우리 꼭 푸른 난새 함께 타고 떠나리니."',
            ],
          },
          {
            id: 'silent', type: 'saeng', label: '입을 다물고 지나친다', desc: '사간으로 지낸 날들을 지킨다. 대신 소식은 듣지 못한다.',
            reply: ['옥영은 고개를 숙이고 짐을 날랐다. 등 뒤에서 남원 사투리가 멀어졌다.', '아무도 사간을 의심하지 않았다. 그 밤, 옥영은 오래 잠들지 못했다.'],
          },
          {
            id: 'wisdom', type: 'wisdom', label: '돈우를 통해 에둘러 묻는다', desc: '살생을 꺼리는 돈우라면, 포로들의 사정을 대신 물어 줄지도 모른다.',
            need: 'h-nanggoya-donwoo', lockHint: '돈우가 무엇을 믿고 어떻게 사는 사람인지 알면 열려요',
            fx: { frag: 3 },
            reply: [
              '옥영은 돈우에게 말했다. "저 짐꾼들이 어디서 왔는지, 다친 데는 없는지 마음이 쓰입니다."',
              { who: 'donwoo', t: '(고개를 끄덕이며) 산 목숨은 다 귀한 법이지. 내가 물어봐 주마.' },
              '저녁에 돈우가 일러 주었다. 남원 연곡에서 끌려온 사람들인데, 산에 숨어 살아남은 이도 많다고.',
              '옥영은 아무것도 드러내지 않고 소식을 얻었다. 그 밤, 시의 셋째 구절이 또렷이 떠올랐다. "우리 꼭 푸른 난새 함께 타고 떠나리니."',
            ],
          },
        ],
        orig: null,
        card: {
          title: '조선 소식을 물을 것인가',
          summary: '원작의 옥영은 포로살이 네 해 동안 사내인 척을 지켰고, 돈우조차 끝까지 여자인 줄 몰랐어요. 조선 소식을 묻는 장면은 원작에 없지만, 옥영은 \'만에 하나\'의 희망을 놓지 않았습니다. 정체를 지킨 것은 **침묵**에, 희망을 붙든 것은 **연**에 가깝지요.',
          quote: { 원문: '不能無萬一之冀, 遂强食不死.', 풀이: '만에 하나라도 바랄 것이 있지 않을까 하는 마음을 버릴 수 없어, 억지로 밥을 먹으며 죽지 않고 버텼다.' },
          quoteLong: { 원문: '玉英覺而諗其夢, 不能無萬一之冀, 遂强食不死. … (¶13 돈우의 말) 我得此人, 四年于玆, 愛其端懿, 視同己出, 寢食未嘗小離, 而終不知其是婦人也.', 풀이: '옥영은 깨어나 그 꿈을 곱씹으며, 만에 하나라도 바랄 것이 있지 않을까 하는 마음을 버릴 수 없었다. 그래서 억지로 밥을 먹으며 죽지 않고 버텼다. … (네 해 뒤 돈우의 말) "이 사람과 함께한 지 벌써 네 해요. 몸가짐이 바르고 착해서 내 자식처럼 여겼고, 자고 먹을 때도 곁을 떠난 적이 없었소. 그런데도 끝내 여인인 줄은 몰랐구려."' },
          extraGloss: '萬一(만일)은 \'만에 하나\'예요. 아주 작은 가능성이라도 놓지 않는 마음이지요. 强食(강식)은 억지로 먹는다는 뜻이에요.',
          src: '「최척전」 ¶11 · ¶13',
        },
      },
      {
        id: 'g-japanese', type: 'know', know: 'k-japanese',
        lines: ['처음엔 소음 같던 말이, 며칠 귀를 기울이자 낱말로 갈라져 들렸다. 값, 생선, 배, 바람….', '옥영은 일본말을 조금씩 익혀 갔다. 언젠가 쓸모가 있을지도 모른다.'],
      },
      {
        id: 'g-ship', type: 'dilemma', dilemma: 'd-nanggoya-ship', scene: 'sc_nanggoya_ship',
        prompt: [
          { who: 'donwoo', t: '사간아. 이번 바람에 민·절 바다로 장사를 떠난다. 배에서 밥 짓고 일할 사람이 모자라구나.' },
          { who: 'donwoo', t: '너도 함께 가겠느냐? 싫으면 집에 남아 있어도 좋다.' },
        ],
        q: '돈우의 장삿배에 오를까?',
        options: [
          {
            id: 'board', type: 'yeon', label: '배에 오른다', desc: '넓은 바다로 나가면, 소식을 들을 길도 넓어진다. 뱃길 고생은 각오해야 한다.',
            reply: ['옥영은 돈우의 장삿배에 올랐다. 배 안에서 밥을 짓고 물을 길었다. 뱃사람들은 옥영을 \'화장 사간\'이라 불렀다.'],
          },
          {
            id: 'stay', type: 'saeng', label: '집에 남는다', desc: '뭍에 남아 몸을 추스른다. 대신 바다 너머 소식은 더 멀어진다.',
            reply: [
              '옥영은 돈우의 집에 남았다. 몸은 조금 편해졌지만, 바다 너머 소식은 더 멀어졌다.',
              '몇 달 뒤, 돈우가 다시 찾아왔다.',
              { who: 'donwoo', t: '일손이 모자라 어쩔 수 없구나. 이번에는 너도 배에 타야겠다.' },
              '옥영은 결국 돈우의 배에 올랐다.',
            ],
          },
        ],
        orig: 'board',
        card: {
          title: '사간, 장삿배의 화장이 되다',
          summary: '원작의 옥영은 배에 올랐어요. 다만 옥영이 고른 일이 아니라 **돈우가 정한 일**이었지요. 돈우는 옥영을 \'사간\'이라 부르며 장삿배의 화장(火長)으로 두었고, 옥영은 그 배로 복건·절강 바다를 오갔습니다. 그 배가 안남 포구에 닿았고, 거기서 최척의 퉁소 소리를 듣게 됩니다. 이때 몸에 익힌 뱃길 경험은 뒷날 옥영이 직접 키를 잡는 밑천이 돼요.',
          quote: { 원문: '頓于尤憐之, 名之曰‘沙干’, 每乘舟行販, 以火長置舟中.', 풀이: '돈우는 옥영을 더욱 가엾게 여겨 \'사간\'이라는 이름을 지어 주었다. 그리고 배를 타고 장사하러 나갈 때마다 옥영을 화장(火長)으로 배에 두었다.' },
          quoteLong: { 원문: '玉英謬曰: "我本貌少男子, 弱骨多病. 在本國不能服役丁壯之事, 只以裁縫炊飯爲業, 餘事固不能也." 頓于尤憐之, 名之曰‘沙干’, 每乘舟行販, 以火長置舟中, 往來于閩浙之間. … (¶19) 昔在日本, 以舟爲家, 春商閩廣, 秋販琉球, 出沒於驚波駭浪之中, 占星候潮, 涉歷已慣.', 풀이: '옥영이 거짓으로 말했다. "저는 본래 몸집이 작은 사내로, 뼈가 약하고 병이 많습니다. 고향에서도 장정 일은 하지 못하고 바느질과 밥 짓기로 살았을 뿐, 다른 일은 정말 할 줄 모릅니다." 돈우는 더욱 가엾게 여겨 \'사간\'이라 이름 붙이고, 배를 타고 장사하러 갈 때마다 화장으로 배에 두어 민(閩, 복건)과 절(浙, 절강) 사이를 오갔다. … (뒷날 옥영의 회고) "예전에 일본에 있을 때 나는 배를 집으로 삼아, 봄이면 복건과 광동으로 장사하러 가고 가을이면 유구로 물건을 팔러 다녔다. 놀란 물결, 사나운 파도 속을 드나들며 별을 보고 물때를 살피는 일에 이미 익숙하다." (火長: 조선에서는 흔히 배나 군대에서 밥 짓는 사람을 가리키지만, 명나라 뱃사람 말로는 나침반과 뱃길을 맡은 항해사를 뜻하기도 한다.)' },
          extraGloss: '화장(火長)은 배에서 밥을 짓고 잔일을 하는 뱃사람이에요. 閩(민)은 지금 중국의 복건, 浙(절)은 절강 지방이에요.',
          variant: '沙干(사간)은 이본에 따라 沙于(사우)로도 적혀요.',
          src: '「최척전」 ¶11 · ¶19',
        },
      },
      // 옥영이 모르는 소식 ④: 중국을 떠돌던 최척과 송우(원작 ¶12)
      {
        id: 'g-news-songwoo', type: 'card',
        card: {
          id: 'q-news-songwoo', kind: 'letter', kindLabel: '옥영이 모르는 소식 ④', title: '강남을 떠돌던 최척과 송우',
          body: '중국에서 여유문은 최척과 의형제를 맺고 누이와 혼인시키려 했다. 최척은 "늙은 아버지와 아내가 살았는지 죽었는지도 모른다"며 끝내 사양했다.\n여유문이 병으로 죽자 기댈 곳을 잃은 최척은 강남의 이름난 곳을 떠돌다, 신선술을 배우러 깊은 촉 땅으로 들어갈 생각까지 했다. 그때 항주의 선비 **송우**가 찾아와 말렸다. "나와 함께 배를 타고 오·월 땅을 오가며 비단과 차를 팔며 삽시다."\n최척은 송우를 따라 장삿배에 올랐다. 옥영은 이 일을 모른다.',
          quote: { 원문: '我以全家陷賊, 老父弱妻至今未知生死, 縱不得發喪服衰, 豈晏然婚娶, 以爲自逸之計乎?', 풀이: '"온 집안이 적에게 빠져 늙은 아버지와 약한 아내가 지금까지 살았는지 죽었는지도 모르오. 상복은 입지 못할망정, 어찌 태연히 장가들어 제 한 몸 편할 궁리를 하겠소?"' },
          src: '「최척전」 ¶12',
        },
      },
      {
        id: 'g-sail', type: 'say', scene: 'sc_nanggoya_sail',
        lines: [
          '그 뒤 네 해. 옥영은 배를 집 삼아 봄이면 복건과 광동으로, 가을이면 유구로 바다를 오갔다.',
          '별을 보고 물때를 살피는 법이 몸에 배었다. 돈우는 끝내 사간이 여자인 줄 몰랐다.',
          '그리고 경자년(1600) 봄, 돈우의 배는 남쪽 먼 안남 포구로 향했다.',
        ],
      },
    ],
    scenes: {
      sc_nanggoya_arrive: { caption: '낭고야, 돈우의 집', prompt_hint: 'A quiet Japanese harbor village in the early 1600s seen from a hill, tiled-roof wooden houses, a small garden with a stone buddha and stone lanterns, an old bald Japanese merchant leading a young captive in plain Korean men\'s clothes; cool morning light, picture-book gouache' },
      sc_nanggoya_dream: { caption: '꿈에 나타난 만복사 장육불', prompt_hint: 'Dream scene: a giant golden standing buddha statue glowing softly in darkness, looking down kindly at a small sleeping figure curled on a straw mat; warm gold light against deep indigo; gentle, hopeful, no depiction of self-harm' },
      sc_nanggoya_sagan: { caption: '돈우가 옥영을 \'사간\'이라 부르다', prompt_hint: 'An old kind Japanese merchant with a shaved head and prayer beads, standing before a small buddha shrine, turning toward a slender young person in plain men\'s clothes bowing modestly; incense smoke, soft daylight' },
      sc_nanggoya_news: { caption: '포구의 짐꾼들 틈에서 들린 조선말', prompt_hint: 'Busy Japanese harbor quay with stacked crates and barrels, Korean captive porters in worn white clothes carrying sacks, a disguised young woman in men\'s clothes pausing and listening, gulls overhead, cool sea light' },
      sc_nanggoya_ship: { caption: '돈우의 장삿배', prompt_hint: 'A Japanese trading ship with a large square sail moored at a wooden pier, the old merchant pointing at it while a young deckhand in men\'s clothing looks at the open sea; morning breeze, gulls' },
      sc_nanggoya_sail: { caption: '남쪽 바다로 떠나는 배', prompt_hint: 'A Japanese trading ship sailing on a wide southern sea at sunset, stars appearing, a small figure at the stern watching the horizon; vast, lonely but hopeful, indigo and lantern orange' },
    },
  };
})();
