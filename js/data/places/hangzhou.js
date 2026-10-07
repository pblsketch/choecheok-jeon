'use strict';
// 항주 — 두 번째 이별과 결단(2막, 정착지의 집 · 정원 테마 맵)
//  흐름(놀이 차례 = 단계 차례):
//   ① 대문 앞 최척 → 고정 사건 '두 번째 이별'(서술만, 게이지 변화 없음, 쓰러짐 아님)
//   ② 옥영이 모르는 소식 세 장(최척 쪽 이야기: 패전과 포로 → 포로수용소에서 몽석 → 진위경과 함께 남원으로) + 역사 카드
//   ③ 몽선에게서 전사 소식 → 장육불 꿈(원작, 쓰러짐 아님) → 딜레마 '기다릴 것인가, 떠날 것인가'(원작: 떠남)
//   ④ 홍도와 채비 → 딜레마 '두 나라 옷과 말'(지혜의 길, 일본말을 알아야 열림 · 원작: 준비)
//   ⑤ 나루터 → 고정 사건 '배와 양식 마련'(생 +2, 원작 궤적에도 반영)
//  원작대로(떠남·준비) 걸으면 항로를 고를 때 생이 6: 5(막간) − 2 + 1 + 2 (js/data/texts.js RULES 설명)
//  원문: 「최척전」 ¶15·¶17·¶18·¶19 (design/research/01_원문_사실확인.md §3-9~3-12, §4, §7)
window.PLACES = window.PLACES || {};
(function () {
  const W = G.world;
  PLACES.hangzhou = {
    name: '항주', act: 2,
    map: 'hz_home', spawn: [6, 7, 'down'],
    avatar: 'sp_okyoung_ming',
    music: 'hangzhou',
    cover: 'sc_hangzhou_home',
    intro: '항주 용금문 안, 이웃과 담을 맞댄 작은 집. 옥영의 식구가 스무 해 가까이 살아 온 곳이다.',
    maps: {
      hz_home: {
        name: '용금문 안의 집', theme: 'garden', spawn: [6, 7, 'down'],
        grid: W.mk(30, 17, '.', [
          ['rect', 1, 5, 9, 4, 'q'],                 // 앞마당(흰 자갈)
          ['rect', 10, 6, 11, 2, '='], ['rect', 20, 3, 2, 3, '='], // 대문으로 가는 디딤돌
          ['rect', 12, 10, 8, 4, '~'], ['rect', 15, 10, 2, 4, 'b'], // 연못과 다리
          ['rect', 13, 8, 2, 2, '='], ['rect', 15, 14, 2, 1, '='],
          ['rect', 25, 8, 4, 8, '~'],                // 집 뒤 물길
          ['rect', 21, 12, 5, 2, '_'],               // 나루
          ['rect', 2, 10, 6, 3, ','], ['rect', 20, 14, 4, 2, ','], ['rect', 11, 14, 3, 2, ','],
          ['rect', 23, 1, 5, 5, 'm'], ['rect', 1, 13, 4, 3, 'm'],
          ['border', 'h'],
        ]),
        props: [
          ['pr_minghouse', 1, 4], ['pr_minghouse', 6, 4],
          ['pr_minggate', 19, 2],
          ['pr_willow', 19, 10], ['pr_willow', 9, 13],
          ['pr_bamboo', 24, 4], ['pr_bamboo', 26, 5], ['pr_bamboo', 27, 3], ['pr_bamboo', 1, 12],
          ['pr_lantern_stone', 10, 5], ['pr_lantern_stone', 18, 5], ['pr_lantern_stone', 12, 9], ['pr_lantern_stone', 21, 10],
          ['pr_bush', 10, 9], ['pr_bush', 5, 15], ['pr_bush', 18, 15],
          ['pr_boat', 25, 11], ['pr_sacks', 21, 11], ['pr_barrels', 20, 13], ['pr_post', 24, 14],
        ],
        spots: {
          pier: { x: 21, y: 12, w: 3, h: 2, name: '나루터' },
          pond: { x: 12, y: 13, w: 3, h: 1, name: '연못', act: '살피기', look: ['연잎 사이로 붉은 잉어가 지나간다. 몽선이 어릴 적 저 잉어를 잡겠다고 뛰어들었다가 흠뻑 젖었지.'] },
        },
      },
    },
    cast: {
      hz_home: {
        cheok: { who: 'choecheok', x: 20, y: 4, dir: 'down', talk: [['(최척은 군장을 꾸린 채 대문 앞에 서 있다)']] },
        mongseon: { who: 'mongseon', x: 14, y: 9, dir: 'left', talk: [['어머니, 바깥이 어수선해요.']] },
        hongdo: { who: 'hongdo', x: 3, y: 7, dir: 'right', talk: [['어머님, 오늘은 제가 밥을 지을게요.']] },
      },
    },
    beats: [
      { id: 'b-gate', goal: '대문 앞에 선 최척에게 가자', talk: 'cheok', steps: ['h-farewell', 'h-farewell-card'], then: { hide: ['cheok'] } },
      { id: 'b-news', auto: true, steps: ['h-letter-war', 'h-letter-camp', 'h-letter-home', 'h-houjin'] },
      { id: 'b-grief', goal: '몽선에게 가 보자', talk: 'mongseon', steps: ['h-grief', 'h-dream', 'h-wait'] },
      { id: 'b-prep', goal: '홍도와 떠날 채비를 의논하자', talk: 'hongdo', steps: ['h-prep'] },
      { id: 'b-pier', goal: '나루터에 가서 배를 알아보자', go: 'pier', steps: ['h-boat'] },
    ],
    steps: [
      // ① 두 번째 이별(고정 사건: 서술과 삽화로만. 게이지·쓰러짐 없음)
      {
        id: 'h-farewell', type: 'say', scene: 'sc_hangzhou_farewell',
        lines: [
          '기미년(1619), 후금의 누르하치가 요동을 쳐들어왔다. 명나라 황제는 천하의 군사를 일으켰다.',
          '명나라 장수 밑의 오세영이 최척의 글재주와 용기를 알아보고, 그를 군대의 서기로 데려가게 되었다.',
          { who: 'okyoung', t: '열 번 죽을 고비에 아홉 번을 겨우 살아 당신을 다시 만났는데, 또 헤어져야 하나요.' },
          '이별을 견딜 수 없었던 옥영은 그 자리에서 삶을 놓아 버리려 했다. 최척이 급히 그 손을 붙잡았다.',
          { who: 'choecheok', t: '싸움터에 다녀오는 건 잠깐 고생하는 일일 뿐이오. 공을 세워 돌아오면 술상을 차려 함께 기뻐합시다.' },
          { who: 'choecheok', t: '몽선이가 씩씩하니 기댈 만하오. 부디 밥 잘 챙겨 먹고, 떠나는 사람 걱정 끼치지 마오.' },
          '최척이 떠난 뒤, 옥영은 오래전 꿈속에서 들은 말을 붙들었다.',
          { wonmun: { 원문: '愼無死, 後必有喜.', 풀이: '부디 죽지 마라. 뒤에 반드시 기쁜 일이 있으리라.' } },
        ],
      },
      {
        id: 'h-farewell-card', type: 'card',
        card: {
          kind: 'orig', title: '두 번째 이별',
          body: '원작에서도 최척은 명나라 군대의 서기로 뽑혀 후금과의 싸움에 나가요. 옥영은 이별을 견디지 못해 목숨을 끊으려 하고, 최척이 이를 말리지요.\n게임에서는 이 장면을 고를 수 없게 두고, 이야기로만 전해요.',
          quote: { 원문: '妾身險釁, 早罹憫凶, 千辛萬苦, 十生九死.', 풀이: '"제 팔자가 험해 일찍부터 험한 일을 당했지요. 천 가지 괴로움, 만 가지 고생 속에서 열 번 죽을 고비에 아홉 번을 겨우 살아났어요."' },
          src: '「최척전」 ¶15',
        },
      },
      // ② 옥영이 모르는 소식(플레이어만 보는 편지·소문)
      {
        id: 'h-letter-war', type: 'card',
        lines: [{ scene: 'sc_letter_war' }, '그 무렵, 옥영이 모르는 곳에서 일어난 일이다.'],
        card: {
          kind: 'letter', kindLabel: '옥영이 모르는 소식 ①', title: '요동 싸움터에서',
          body: '명나라 군대는 요동 싸움터에서 후금군에게 크게 졌다. 명나라 군사는 거의 살아남지 못했다.\n최척은 본래 조선 사람이라, 어지러운 틈에 조선군 대열에 숨어 목숨을 건졌다. 조선군이 항복하자 최척도 함께 포로가 되었다.\n옥영은 이 일을 모른다.',
          src: '「최척전」 ¶16',
        },
      },
      {
        id: 'h-letter-camp', type: 'card', lines: [{ scene: 'sc_letter_camp' }],
        card: {
          kind: 'letter', kindLabel: '옥영이 모르는 소식 ②', title: '포로수용소의 부자',
          body: '포로수용소에서 최척은 젊은 조선 군사와 함께 갇혔다. 잃어버린 아들 이야기를 꺼내자, 젊은이가 웃옷을 벗어 등의 붉은 점을 보였다. 남원에서 헤어진 맏아들 몽석이었다.\n옥영은 이 일을 모른다.',
          quote: { 원문: '背上有赤痣, 如小兒掌. … 袒而示背曰: “兒實大人之遺體也.”', 풀이: '"등에 아이 손바닥만 한 붉은 점이 있었지." … 몽석이 웃옷을 벗어 등을 보이며 말했다. "제가 바로 아버님의 아들입니다."' },
          src: '「최척전」 ¶17',
        },
      },
      {
        id: 'h-letter-home', type: 'card', lines: [{ scene: 'sc_letter_home' }],
        card: {
          kind: 'letter', kindLabel: '옥영이 모르는 소식 ③', title: '진위경과 함께 남원으로',
          body: '조선말을 하는 늙은 오랑캐 병사가 부자를 몰래 풀어 주었다. 두 사람은 스무 해 만에 고국 땅을 밟았다.\n돌아오는 길에 최척이 등창으로 죽을 고비에 놓였을 때, 떠돌던 중국 사람 하나가 침을 놓아 살려 냈다. 명나라 군사로 조선에 왔다가 돌아가지 못한 진위경, 바로 홍도의 아버지였다.\n진위경은 최척 부자를 따라 남원에서 함께 살게 되었다. 옥영은 아직 이 모든 일을 모른다.',
          src: '「최척전」 ¶17·¶18',
        },
      },
      {
        id: 'h-houjin', type: 'card', history: 'h-hangzhou-houjin',
        card: {
          kind: 'history', title: '후금의 성장과 명·조선의 출병(1619)',
          body: '만주의 여진 부족을 통일한 누르하치는 1616년 후금을 세우고 1618년 명나라를 공격했다. 명은 1619년 대군을 일으켜 후금을 치려 했고, 조선에도 군사를 요청했다. 광해군은 강홍립을 도원수로 삼아 1만 3천~1만 5천 명가량(자료마다 다름)을 보냈다.\n명군은 사르후 일대에서 크게 졌고, 조선군도 부차(심하) 들판에서 무너져 김응하 등이 전사하고 강홍립은 항복했다. 「최척전」의 최척은 명군의 서기로, 맏아들 몽석은 조선군으로 이 싸움에 나갔다가 같은 포로수용소에서 만난다.',
          src: '서울신문 「병자호란 다시 읽기」(한명기) 심하전역 연재 · 한국민족문화대백과 「심하전투」',
        },
      },
      // ③ 전사 소식 → 장육불 꿈(원작) → 기다릴 것인가, 떠날 것인가
      {
        id: 'h-grief', type: 'say', scene: 'sc_hangzhou_grief',
        lines: [
          { who: 'mongseon', t: '어머니… 명나라 군사가 오랑캐에게 모두 죽었다는 소식이 왔어요.' },
          '옥영은 최척이 싸움터에서 죽었다고 믿었다. 밤낮으로 울며 물 한 모금도 넘기지 않았다.',
        ],
      },
      {
        id: 'h-dream', type: 'dream', scene: 'sc_hangzhou_dream',
        lines: ['어느 날 밤, 꿈에 장육불이 나타나 옥영의 정수리를 쓰다듬으며 말했다.'],
        quote: { 원문: '忽於一夕, 夢見丈六佛撫頂而言曰: “愼無死, 後必有喜.”', 풀이: '어느 날 밤, 꿈에 장육불이 나타나 옥영의 정수리를 쓰다듬으며 말했다. "부디 죽지 마라. 뒤에 반드시 기쁜 일이 있으리라."' },
      },
      {
        id: 'h-wait', type: 'dilemma', dilemma: 'd-hangzhou-wait', scene: 'sc_hangzhou_decision',
        prompt: [
          { who: 'okyoung', t: '포로로 끌려가던 날에도 장육불께서 같은 말씀을 하셨지. 그 뒤 네 해 만에 안남에서 네 아버지를 만났다. 네 아버지가 살아 계신 걸까?' },
          { who: 'mongseon', t: '오랑캐가 명나라 군사는 죽였어도 조선 사람은 다 풀어 주었대요. 아버지는 조선 사람이니 꼭 살아 계실 거예요. 여기서 기다려요, 어머니.' },
          '살아 있다면 최척은 어디로 갔을까. 옥영은 마음을 정해야 했다.',
        ],
        options: [
          {
            id: 'wait', type: 'saeng', label: '항주에서 기다린다', desc: '몽선의 말대로 몸을 추스르며 소식을 기다린다',
            reply: [
              '한 해, 또 한 해가 지났다. 기다리는 동안 옥영의 몸은 조금씩 추슬러졌다. 그러나 최척은 오지 않았다.',
              { who: 'mongseon', t: '어머니, 이대로 기다리기만 할까요? 아버지는 고국으로 가셨을지도 몰라요.' },
              '이번에는 아들이 먼저 길을 꺼냈다. 옥영은 마침내 떠나기로 했다.',
            ],
          },
          {
            id: 'leave', type: 'yeon', label: '조선으로 떠난다', desc: '살아 있다면 고국으로 갔을 것이다. 내가 찾아간다',
            reply: [
              { who: 'okyoung', t: '오랑캐 땅에서 조선까지는 너덧새 길이다. 네 아버지가 살아 있다면 틀림없이 고국으로 갔을 게다. 내 마음은 이미 정했다.' },
            ],
          },
        ],
        orig: 'leave',
        card: {
          title: '기다릴 것인가, 떠날 것인가',
          summary: '"기다리자"는 몽선의 말이었어요. 원작의 옥영은 남편이 고국으로 갔으리라 보고 떠나기로 했지요.',
          quote: { 원문: '汝父雖生, 其勢必走本國 … 吾計決矣.', 풀이: '네 아버지가 살아 계신다면 틀림없이 고국으로 가셨을 게다. … 내 마음은 이미 정했다.' },
          quoteLong: { 원문: '汝父雖生, 其勢必走本國 … 苟得相見是亦一幸 … 吾計決矣.', 풀이: '네 아버지가 살아 계신다면 틀림없이 고국으로 가셨을 게다. … 만나기만 해도 다행이지. … 내 마음은 이미 정했다.' },
          src: '「최척전」 ¶19',
        },
      },
      // ④ 두 나라 옷과 말(지혜의 길: 낭고야에서 일본말을 익혔으면 열린다)
      {
        id: 'h-prep', type: 'dilemma', dilemma: 'd-hangzhou-prep', scene: 'sc_hangzhou_prep',
        prompt: [
          '바닷길에는 명나라 순찰선도, 일본 배도, 해적도 다닌다. 어느 배를 만나든 그 나라 사람처럼 보일 수 있다면….',
          { who: 'okyoung', t: '조선 배를 만나면 조선 사람으로, 일본 배를 만나면 일본 사람으로 보여야 한다.' },
          { who: 'hongdo', t: '어머님, 떠나기 전에 무엇부터 갖출까요?' },
        ],
        options: [
          {
            id: 'prep', type: 'wisdom', need: 'k-japanese', label: '두 나라 옷을 짓고 말을 가르친다', desc: '조선 옷과 일본 옷을 마련하고, 아들과 며느리에게 두 나라 말을 날마다 가르친다',
            lockHint: '낭고야에서 일본말을 익혔다면 열려요',
            reply: [
              '옥영은 곧 조선 옷과 일본 옷을 지었다. 그리고 날마다 몽선과 홍도에게 조선말과 일본말을 가르쳤다.',
              { who: 'hongdo', t: '"살았다"는 조선말로 어떻게 해요?' },
              { who: 'okyoung', t: '"살았다." 천천히 따라 해 보렴.' },
            ],
          },
          {
            id: 'none', type: 'none', label: '준비 없이 서두른다', desc: '하루라도 빨리 떠나는 것이 먼저다',
            reply: ['옥영은 옷과 말을 갖출 겨를도 없이 떠날 날부터 받았다.'],
          },
        ],
        orig: 'prep',
        card: {
          title: '두 나라 옷과 말',
          summary: '원작의 옥영은 꼼꼼히 준비했어요. 배와 양식, 두 나라(조선·일본) 옷과 말, 그리고 지남철까지.',
          quote: { 원문: '卽裁縫鮮倭兩國服色, 日令子婦敎習兩國語音.', 풀이: '곧 조선·일본 두 나라 옷을 짓고, 날마다 아들과 며느리에게 두 나라 말을 가르쳤다.' },
          src: '「최척전」 ¶19',
        },
      },
      // ⑤ 배와 양식 마련(고정 사건: 생 +2)
      {
        id: 'h-boat', type: 'gauge', fixed: true, gauge: { saeng: 2 }, scene: 'sc_hangzhou_boat',
        lines: [
          { who: 'okyoung', t: '너는 배를 빌리고 양식을 찧어 두어라. 여기서 조선까지 뱃길로 이삼천 리, 순풍을 만나면 한 달이 안 걸린다.' },
          { who: 'mongseon', t: '어머니, 만 리 푸른 바다는 갈댓잎 배로 건널 곳이 아니에요. 해적과 순찰선이 곳곳에서 길을 막을 거예요.' },
          { who: 'hongdo', t: '막지 마세요. 어머님은 지극한 정성으로 이 큰일을 꾀하셨어요. 제 사정이야 따질 겨를이 있겠어요?' },
          { who: 'okyoung', t: '뱃길 고생은 내가 많이 겪어 보았다. 돛대와 노는 단단해야 한다. 그보다 더 없어서는 안 될 것이 지남철이다.' },
          { wonmun: { 원문: '汝其雇船舂糧. … 而尤不可無者, 指南鐵.', 풀이: '너는 배를 빌리고 양식을 찧어 두어라. … 그보다 더 없어서는 안 될 것이 지남철(나침반)이다.' } },
          '배와 양식, 그리고 지남철. 떠날 채비가 갖추어지자 옥영의 몸에도 다시 힘이 붙었다.',
        ],
        next: '바다로 ▶',
      },
    ],
    scenes: {
      sc_hangzhou_home: { caption: '항주 용금문 안의 집', prompt_hint: 'A small Ming-dynasty courtyard house in Hangzhou with a lotus pond, stone lanterns, bamboo and a canal pier behind, spring afternoon, gouache picture-book style' },
      sc_hangzhou_farewell: { caption: '대문 앞, 두 번째 이별', prompt_hint: 'At a red Ming gate, Choe Cheok in a Ming army scribe outfit holds both hands of his wife Okyoung who is weeping; their grown son watches from behind; restrained and tender, no weapons shown, gouache picture-book style' },
      sc_letter_war: { caption: '요동의 패전', prompt_hint: 'Symbolic: a torn Ming banner on a cold northern plain at dusk, distant smoke, a lone Korean man in plain clothes walking among surrendered Joseon soldiers, no violence or blood, muted colors, gouache picture-book style' },
      sc_letter_camp: { caption: '포로수용소에서 만난 아버지와 아들', prompt_hint: 'Inside a bleak prisoner hut, a young Joseon soldier turning his back to show a red birthmark on his shoulder while an older man (Choe Cheok) gasps in recognition, candlelight, emotional, gouache picture-book style' },
      sc_letter_home: { caption: '진위경과 함께 남원으로', prompt_hint: 'Three men (Choe Cheok leaning on a staff, his son Mongseok, and a Chinese man Jin Wigyeong with an acupuncture case) walking a Korean country road toward Namwon, early spring, gouache picture-book style' },
      sc_hangzhou_grief: { caption: '전사 소식', prompt_hint: 'Okyoung sitting alone by a lamp at night in a Hangzhou room, untouched bowl beside her, her son at the doorway, deep grief shown quietly, gouache picture-book style' },
      sc_hangzhou_dream: { caption: '항주에서 다시 꾼 장육불 꿈', prompt_hint: 'Dream scene: a large golden standing Buddha gently touching the head of a sleeping woman, warm golden mist filling a dark room, serene, gouache picture-book style' },
      sc_hangzhou_decision: { caption: '기다릴 것인가, 떠날 것인가', prompt_hint: 'Morning: Okyoung standing on a canal pier in Hangzhou looking east toward the sea, son Mongseon pleading beside her, wind in her sleeves, gouache picture-book style' },
      sc_hangzhou_prep: { caption: '두 나라 옷과 말', prompt_hint: 'Okyoung sewing a Korean hanbok and a Japanese kimono side by side while teaching words to her son and daughter-in-law, cozy lamplight interior, gouache picture-book style' },
      sc_hangzhou_boat: { caption: '배와 양식, 그리고 지남철', prompt_hint: 'A small sailing junk being loaded with rice sacks at a Hangzhou canal pier, Okyoung holding a round compass (south-pointing needle) in her palm, her son and daughter-in-law carrying supplies, gouache picture-book style' },
    },
  };
})();
