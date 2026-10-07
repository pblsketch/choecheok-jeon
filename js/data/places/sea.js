'use strict';
// 바다 — 귀국 항해(2막). 이 게임에서 유일하게 길을 직접 고르는 곳
//  흐름(놀이 차례 = 단계 차례):
//   ① 출항 → 고지도에서 뱃길 고르기(route 단계 → 딜레마 d-sea-route: 연안길 / 바다길[생 6 이상])
//   ② 연안길: 기항지의 명나라 순찰선(중국 옷·중국말) / 바다길: 별과 지남철로 뱃길 잡기(stars 단계, 실패 없음)
//   ③ 이본 노트(귀국 항해 원문은 대표 이본에서 떨어져 나가 줄거리만 전함) → 고정 사건 '해적'(원작, 생 손실) + 역사 카드
//   ④ 섬(걸어 다니는 맵): 바위굴의 밤(새벽의 장육불은 서술만) → 언덕 → 딜레마 '남은 것을 어떻게 쓸까'(신호불 / 버티기)
//      생이 0이 되면 장육불 꿈(규칙이 처리, 생 3)
//   ⑤ 고정 사건 '조선 배'(원작): 두 나라 옷과 말을 준비했으면 바로 구조(생 손실 없음, 연 +1), 아니면 늦게 구조(생 −1).
//      원작의 옥영은 준비했으므로 원작 궤적은 준비한 쪽을 따른다(when:{prep}이 붙은 fixed 단계 — rules.js originalRun).
//      1막에서 지켜 온 신표가 있으면 글에 비친다({신표}).
//  ⚠ 원문 결락: 출항부터 해적을 만나기 직전까지는 원문이 없다(design/research/01_원문_사실확인.md §1-2·§3-13). 원문을 지어 넣지 않는다.
window.PLACES = window.PLACES || {};
(function () {
  // ───────── 조정값(선생님이 고쳐도 된다) ─────────
  const TUNE = {
    coast: { saeng: -1 },          // 연안길: 늘 열림
    sea: { saeng: -2, yeon: 1 },   // 바다길: 빠르지만 힘이 든다
    seaMin: 6,                     // 바다길이 열리는 생(이 값 이상)
    pirates: { saeng: -2 },        // 해적(고정 사건)
    shipPrep: { yeon: 1 },         // 조선 배: 두 나라 옷과 말을 준비했을 때
    shipLate: { saeng: -1 },       // 조선 배: 준비 없이(늦게 구조)
  };

  const W = G.world;
  // 섬: 둥근 물가 + 바위·굴 자리. 세 가지 모습(낮 · 신호불 밤 · 조선 배가 나타난 낮)이 같은 땅을 쓴다
  const cells = (grid, list) => { const g = grid.map((r) => r.split('')); for (const [x, y, c] of list) if (g[y] && g[y][x] != null) g[y][x] = c; return g.map((r) => r.join('')); };
  const GRID = cells(W.blobGrid(36, 20, { seed: 7, center: [14, 10.5], radius: [12.5, 8] }), [
    [12, 6, 'e'], [13, 6, 'e'], [14, 6, 'e'], [15, 6, 'e'], [13, 7, 'e'], [14, 7, 'e'],
    [22, 9, 'e'], [23, 9, 'e'], [23, 10, 'e'], [24, 10, 'e'],
  ]);
  const BASE_PROPS = [
    ['pr_cave', 12, 5], ['pr_boulder', 10, 5], ['pr_boulder', 16, 4], ['pr_rocks', 17, 5],
    ['pr_pine', 7, 7], ['pr_pine', 18, 6], ['pr_pine', 20, 15],
    ['pr_reeds', 5, 9], ['pr_reeds', 22, 13], ['pr_reeds', 9, 16],
    ['pr_boulder', 23, 8], ['pr_rocks', 25, 9], ['pr_rocks', 8, 15], ['pr_rocks', 25, 12], ['pr_bush', 17, 10], ['pr_bush', 11, 9],
    ['pr_sacks', 16, 6],
  ];
  const SPOTS = {
    cave: { x: 12, y: 6, w: 4, h: 2, name: '바위굴' },
    hill: { x: 22, y: 9, w: 3, h: 2, name: '언덕' },
    signal: { x: 6, y: 11, w: 2, h: 2, name: '신호불 자리' },
    sacks: { x: 16, y: 6, w: 1, h: 1, name: '양식 자루', act: '살피기', look: ['자루에 남은 양식은 사흘 치뿐이다.'] },
  };
  const island = (o) => Object.assign({ name: '이름 없는 섬', theme: 'island', grid: GRID, spawn: [14, 16, 'up'], spots: SPOTS }, o);

  PLACES.sea = {
    name: '바다', act: 2,
    map: 'island', spawn: [14, 16, 'up'],
    travel: false, // 항주에서 떠나는 길은 뱃길 고르기 고지도가 보여 준다
    avatar: 'sp_okyoung_ming',
    music: 'sea',
    cover: 'sc_sea_departure',
    intro: '이번에는 누가 태워 주는 배가 아니다. 키는 옥영이 잡는다.',
    maps: {
      island: island({ props: BASE_PROPS.concat([['pr_signal', 6, 11]]) }),
      island_night: island({ name: '신호불을 피운 밤', night: true, spawn: [8, 13, 'up'], props: BASE_PROPS.concat([['pr_signal_lit', 6, 11]]) }),
      island_ship: island({ name: '조선 배가 나타난 아침', spawn: [14, 8, 'down'], props: BASE_PROPS.concat([['pr_signal', 6, 11], ['pr_joseonship', 28, 13]]) }),
    },
    cast: {
      island: {
        mongseon: { who: 'mongseon', x: 12, y: 16, dir: 'up', talk: [['어머니, 이 섬엔 사람이 안 사는 것 같아요.']] },
        hongdo: { who: 'hongdo', x: 16, y: 16, dir: 'up', talk: [['바닷물이 차요. 어머님, 젖은 옷부터 말려요.']] },
      },
      island_night: {
        mongseon: { who: 'mongseon', x: 9, y: 12, dir: 'left', talk: [['불이 꺼지지 않게 가지를 더 넣을게요.']] },
        hongdo: { who: 'hongdo', x: 5, y: 13, dir: 'right', talk: [['어머님, 불빛이 바다 멀리까지 번져요.']] },
      },
      island_ship: {
        mongseon: { who: 'mongseon', x: 23, y: 10, dir: 'right', talk: [['저 배, 이쪽으로 오는 걸까요?']] },
        hongdo: { who: 'hongdo', x: 15, y: 9, dir: 'right' },
      },
    },
    beats: [
      { id: 'b-voyage', auto: true, steps: ['s-depart', 's-route-map', 's-route', 's-coast-patrol', 's-stars', 's-lost', 's-pirates', 's-pirates-card'] },
      {
        id: 'b-ashore', music: 'island', goal: '바위굴을 찾아 밤을 지낼 자리를 마련하자', go: 'cave', steps: ['s-cave'],
        say: [{ who: 'mongseon', t: '어머니, 여기가 어디예요?' }, { who: 'okyoung', t: '모르겠다. 자루에 남은 양식은… 사흘 치뿐이구나.' }],
      },
      { id: 'b-hill', goal: '언덕에 올라 수평선을 살피자', go: 'hill', steps: ['s-horizon'], inline: true },
      { id: 'b-signal', goal: '신호불 피울 자리로 가자', at: 'signal', steps: ['s-island'] },
      { id: 'b-fire', when: (st) => ((st.choices || {})['d-island-signal']) === 'signal', map: 'island_night', spawn: [8, 13, 'up'], goal: '불 곁의 몽선에게 말을 걸자', talk: 'mongseon', steps: ['s-fire-night'], inline: true },
      { id: 'b-endure', when: (st) => ((st.choices || {})['d-island-signal']) !== 'signal', goal: '굴 앞의 홍도에게 가 보자', talk: 'hongdo', show: { hongdo: { who: 'hongdo', x: 15, y: 9, dir: 'left', talk: [['어머님, 오늘 몫은 어머님이 더 드세요.']] } }, steps: ['s-endure-night'], inline: true },
      { id: 'b-ship', map: 'island_ship', spawn: [14, 8, 'down'], goal: '언덕으로 가서 배를 살피자', go: 'hill', steps: ['s-ship', 's-ship-prep', 's-ship-late', 's-ship-token', 's-ship-card'] },
    ],
    steps: [
      // ① 출항과 뱃길 고르기
      {
        id: 's-depart', type: 'say', scene: 'sc_sea_departure',
        lines: [
          '경신년(1620) 봄, 옥영은 몽선과 홍도를 데리고 항주를 떠났다.',
          '뱃머리에 선 옥영의 손에는 지남철이 들려 있었다.',
          { who: 'okyoung', t: '자, 어느 길로 갈지 정하자. 조선까지 가는 길은 둘이다.' },
        ],
        next: '고지도 펼치기 ▶',
      },
      { id: 's-route-map', type: 'route', for: 's-route', from: 'hangzhou', title: '조선으로 돌아가는 뱃길', note: '어느 길로 **조선**에 닿을까?' },
      {
        id: 's-route', type: 'dilemma', dilemma: 'd-sea-route', scene: 'sc_sea_route',
        prompt: ['옥영은 고지도 위의 두 뱃길을 견주어 보았다.'],
        options: [
          {
            id: 'coast', type: 'none', label: '연안길', desc: '중국 해안을 따라 올라가 서해를 건넌다. 느리지만 언제든 갈 수 있다', gauge: TUNE.coast,
            reply: ['배는 육지를 곁에 두고 천천히 북쪽으로 올라갔다.'],
          },
          {
            id: 'sea', type: 'none', label: '바다길', desc: '동중국해를 곧장 가로지른다. 빠르지만 힘이 많이 든다', gauge: TUNE.sea,
            when: { min: { saeng: TUNE.seaMin } }, lockHint: '생(生) 막대가 절반을 넘어야 갈 수 있어요',
            reply: ['배는 뭍을 등지고 먼바다로 나아갔다. 사방에 물뿐이었다.'],
          },
        ],
        orig: null, origNearest: 'sea',
        card: {
          title: '두 뱃길',
          summary: '원작의 옥영은 지남철과 별을 믿고 곧장 건넜다고 보는 쪽이 자연스러워요(⚠).',
          quote: { 원문: '水路僅二三千里 … 不滿旬朔當到彼岸.', 풀이: '뱃길로 겨우 이삼천 리. … 열흘에서 한 달이면 저쪽 기슭에 닿으리라.' },
          quoteLong: { 원문: '此去朝鮮, 水路僅二三千里 … 倘得便風, 不滿旬朔當到彼岸.', 풀이: '여기서 조선까지 뱃길로 겨우 이삼천 리다. … 순풍을 얻으면 열흘에서 한 달이면 저쪽 기슭에 닿을 것이다.' },
        },
      },
      // ② 연안길: 명나라 순찰선 / 바다길: 별과 지남철
      {
        id: 's-coast-patrol', type: 'say', when: { route: 'coast' }, scene: 'sc_sea_patrol',
        lines: [
          '며칠 뒤, 물을 길으러 들른 기항지 앞바다에서 명나라 순찰선이 다가왔다.',
          { who: 'ming_soldier', t: '멈춰라! 어디서 오는 배냐?' },
          '옥영은 중국 옷깃을 여미고 중국말로 대답했다.',
          { who: 'okyoung', t: '항주에서 온 장삿배입니다. 바람을 피해 잠시 들렀을 뿐이에요.' },
          '순찰선은 배를 한 바퀴 둘러보고 물러갔다. 항주에서 스무 해를 산 옥영의 말씨에는 흠잡을 데가 없었다.',
        ],
      },
      {
        id: 's-stars', type: 'stars', when: { route: 'sea' },
        intro: ['뭍이 보이지 않는 밤바다. 기댈 것은 하늘의 별과 손안의 지남철뿐이다.', { who: 'mongseon', t: '어머니, 사방이 다 똑같아 보여요. 어디로 가야 해요?' }],
        dipper: '국자 모양 일곱 별, 북두칠성을 손잡이 끝에서부터 차례로 이어 보세요.',
        pole: '국자 끝 두 별을 이은 선을 다섯 배쯤 늘이면 북극성이 있어요. 북극성을 찾아 눌러 보세요.',
        helm: '지남철 바늘은 남북을 가리켜요. 붉은 끝이 북극성 쪽, 곧 북쪽이에요. 조선은 북동쪽. 뱃머리를 등불 표시에 맞추세요.',
        done: [
          { who: 'okyoung', t: '별을 보고 물때를 살피는 일이라면 익숙하다. 배의 안위는 내가 맡는다.' },
          { wonmun: { 원문: '占星候潮, 涉歷已慣 … 舟楫安危, 我自御之.', 풀이: '별을 보고 물때를 살피는 일에 이미 익숙하다. … 배가 안전하든 위태롭든 내가 몰겠다.' } },
          { who: 'mongseon', t: '어머니가 이렇게 바다를 잘 아시는 줄 몰랐어요.' },
          { who: 'okyoung', t: '일본에 있을 때 배를 집 삼아 살았단다. 봄이면 복건과 광동으로, 가을이면 유구로.' },
        ],
      },
      // ③ 원문이 없는 대목(이본 노트) → 해적
      {
        id: 's-lost', type: 'card',
        lines: ['그 뒤로도 여러 날, 배는 낯선 배들과 거센 풍랑 사이를 지났다.'],
        card: {
          kind: 'variant', kindLabel: '이본 노트', title: '떨어져 나간 대목',
          body: '배를 띄운 뒤부터 해적을 만나기 직전까지의 원문은, 지금 전하는 대표 이본에서 떨어져 나갔어요. 그래서 이 대목은 원문을 싣지 않고 줄거리만 전해요.\n줄거리(연구·해설 자료): 옥영 일행은 경신년(1620) 봄에 배를 띄웠고, 명나라 순찰선을 만나면 중국말로, 일본 배를 만나면 일본말로 둘러대며 고비를 넘겼어요. 큰 풍랑도 만났어요.\n게임 속 뱃길 장면은 이 줄거리를 바탕으로 새로 꾸몄어요.',
          src: '규장각 「고전문학 속 옛 사람들」 최척전 해설 · 한청(2009) · 지연숙(2004) — 고려대본으로 보충할 수 있다고 하나 확인하지 못함(⚠)',
        },
      },
      {
        id: 's-pirates', type: 'gauge', fixed: true, gauge: TUNE.pirates, scene: 'sc_sea_pirates', music: 'tension',
        lines: [
          '어느 날, 섬 그늘에서 배 한 척이 미끄러져 나왔다. 해적이었다.',
          { who: 'pirate', t: '배에 실은 걸 다 내놔라!' },
          '옥영은 중국말로 둘러댔다.',
          { who: 'okyoung', t: '우리는 명나라 사람이에요. 바다에서 고기를 잡다가 여기까지 떠밀려 왔어요. 실은 물건도 없어요.' },
          { wonmun: { 원문: '我以天朝人, 漁採于海, 漂泊於此, 本無貨物.', 풀이: '우리는 명나라 사람인데 바다에서 고기 잡고 해산물을 따다가 여기까지 떠밀려 왔습니다. 본래 실은 물건이 없어요.' } },
          '해적은 사람은 해치지 않았다. 대신 옥영 일행이 타고 온 배를 제 배 꼬리에 매어 끌고 가 버렸다.',
          '세 사람만 이름 모를 섬 기슭에 남았다.',
          { who: 'okyoung', t: '해랑적이로구나. 아들 말을 듣지 않고 억지로 길을 나섰더니… 배를 잃었으니 이제 어찌하랴.' },
        ],
      },
      {
        id: 's-pirates-card', type: 'card', history: 'h-sea-pirates',
        card: {
          kind: 'history', title: '해적과 바닷길',
          body: '조선 시대 서해에는 \'해랑적(海浪賊)\'이라 불린 해적이 15세기 말부터 오랫동안 나타났다. 요동반도 앞바다의 해랑도를 근거지로 삼았다고 해서 붙은 이름이다. 조선 정부는 1500년 해랑도를 수색하고 1609년 백령도에 진을 설치하는 등 대응에 애썼다.\n원작의 옥영도 해적을 보고 "해랑적은 중국과 조선 사이를 드나들며 노략질하지만 사람 죽이기는 좋아하지 않는다고 들었다"고 말한다. 그 무렵 바닷길은 풍랑뿐 아니라 해적과 각국 순찰선 때문에도 위험했다.',
          src: '「서해 북부 해역에서의 해랑적 활동과 조선정부의 대응」, 『탐라문화』 · 기호일보 「백령진의 설치, 해랑적을 잡아라」',
        },
      },
      // ④ 섬
      {
        id: 's-cave', type: 'say', scene: 'sc_island_cave',
        lines: [
          '옥영은 벼랑 끝으로 걸어갔다. 몽선과 홍도가 달려와 어머니를 붙들었다.',
          { who: 'okyoung', t: '사흘 치 양식으로 무엇을 하겠느냐. 기다린들 무슨 소용이냐.' },
          { who: 'mongseon', t: '양식이 다 떨어진 뒤에 죽어도 늦지 않아요. 그 사이에 살길이 생기면 어떡해요. 그때는 후회해도 소용없잖아요.' },
          { wonmun: { 원문: '糧盡而死, 亦未晩也. 其間萬一有可圖之路, 則悔無及矣.', 풀이: '양식이 다 떨어진 뒤에 죽어도 늦지 않아요. 그 사이에 만에 하나 살길이 생기면 그때 가서 후회해도 소용없잖아요.' } },
          '세 사람은 바위굴에 엎드려 밤을 지냈다. 날이 밝아 올 무렵, 옥영이 말했다.',
          { who: 'okyoung', t: '기운이 빠져 정신이 흐릿한 사이에 장육불이 또 보이더구나. 참 이상한 일이다.' },
          { when: { mode: 'deep' }, wonmun: { 원문: '我氣困神疲, 彷彿之間丈六佛又見, 其言云云: 極可異也.', 풀이: '기운이 빠지고 정신이 흐릿한 사이에 장육불이 또 보이더니 그런저런 말씀을 하시는구나. 참 이상한 일이다.' } },
          '세 사람은 마주 앉아 염불하며 빌었다. "부처님, 부처님, 저희를 굽어살펴 주소서."',
        ],
      },
      {
        id: 's-horizon', type: 'say',
        lines: [
          '언덕에 올라 사방을 둘러보았다. 하늘과 바다가 맞닿은 끝까지, 배 한 척 보이지 않았다.',
          { who: 'hongdo', t: '어머님, 마른 나뭇가지가 많아요. 불을 피우면 멀리서도 보이지 않을까요?' },
        ],
      },
      {
        id: 's-island', type: 'dilemma', dilemma: 'd-island-signal', scene: 'sc_island_signal',
        prompt: ['양식은 사흘 치, 마른 가지는 한 아름. 남은 것을 어떻게 쓸까?'],
        options: [
          {
            id: 'signal', type: 'yeon', label: '신호불을 피운다', desc: '땔감과 힘을 다 써서라도, 지나는 배가 우리를 보게 한다',
            reply: ['몽선과 홍도가 가지를 모으고, 옥영이 불씨를 살렸다. 해가 지자 불길이 높이 솟았다.'],
          },
          {
            id: 'endure', type: 'saeng', label: '아끼며 버틴다', desc: '양식을 나누어 먹고, 굴에서 힘을 아끼며 배를 기다린다',
            reply: ['옥영은 양식을 하루 치씩 나누었다. 세 사람은 굴에서 힘을 아끼며 바다를 지켜보았다.'],
          },
        ],
        orig: null,
        card: {
          title: '외딴섬에서',
          summary: '원작의 일행은 불을 피우지 않고 굴에서 버티다가, 배가 보이자 언덕에서 옷을 흔들었어요.',
          quote: { 원문: '櫜中餘糧, 僅支三日', 풀이: '자루에 남은 양식은 겨우 사흘을 버틸 만했다.' },
          quoteLong: { 원문: '櫜中餘糧, 僅支三日 … 使夢仙登岸以衣揮之.', 풀이: '자루에 남은 양식은 겨우 사흘 치였다. … 몽선을 언덕에 올려 보내 옷을 흔들게 했다.' },
          src: '「최척전」 ¶20',
        },
      },
      {
        id: 's-fire-night', type: 'say',
        lines: [
          '밤새 불이 타올랐다. 불빛이 검은 바다 위로 길게 번졌다.',
          { who: 'mongseon', t: '어머니, 누군가 이 불을 보겠지요?' },
          { who: 'okyoung', t: '보고 말고. 우리가 여기 있다고 바다에 알리는 불이다.' },
        ],
      },
      {
        id: 's-endure-night', type: 'say',
        lines: [
          '하루, 또 하루. 세 사람은 양식을 아껴 먹으며 바다를 지켜보았다.',
          { who: 'hongdo', t: '어머님, 오늘 몫은 어머님이 더 드세요.' },
          { who: 'okyoung', t: '아니다. 너희가 먹어야 내가 산다.' },
        ],
      },
      // ⑤ 조선 배(원작): 준비했으면 바로 구조, 아니면 늦게
      {
        id: 's-ship', type: 'say', scene: 'sc_sea_joseon_ship',
        lines: [
          '이틀이 지난 아침, 아득한 바다 저편에서 돛단배 하나가 나타났다.',
          { who: 'mongseon', t: '처음 보는 배예요. 해적이면 어떡해요?' },
          '옥영은 한눈에 알아보았다.',
          { who: 'okyoung', t: '살았다! 저건 조선 배다.' },
          { wonmun: { 원문: '我生矣! 此是朝鮮船也.', 풀이: '살았다! 저건 조선 배다.' } },
        ],
      },
      {
        id: 's-ship-prep', type: 'gauge', fixed: true, when: { prep: true }, gauge: TUNE.shipPrep,
        lines: [
          '옥영은 항주에서 지어 온 조선 옷으로 갈아입었다. 몽선이 언덕에 올라 옷을 흔들었다.',
          { who: 'joseon_sailor', t: '당신들은 누구요? 어째서 이런 외딴섬에 있소?' },
          { who: 'okyoung', t: '저는 서울 양반 집안 사람입니다. 나주로 내려가다 풍랑을 만나 배가 뒤집히고, 우리 셋만 살아 여기까지 떠밀려 왔습니다.' },
          { who: 'mongseon', t: '살려… 주십시오!' },
          '조선 옷에 또렷한 조선말. 몽선의 서툰 조선말까지 보태지자 뱃사람들은 망설이지 않고 닻을 내렸다.',
          { who: 'joseon_sailor', t: '이 배는 통제사의 무역선이오. 공무 일정이 정해져 있어 돌아서 데려다줄 수는 없소. 순천까지는 태워 주리다.' },
        ],
      },
      {
        id: 's-ship-late', type: 'gauge', fixed: true, when: { prep: false }, gauge: TUNE.shipLate,
        lines: [
          '몽선이 언덕에 올라 옷을 흔들었다. 하지만 섬에 선 세 사람은 모두 명나라 옷차림이었다.',
          '뱃사람들은 해적의 꾀일까 의심했는지, 배를 멀찍이 세운 채 다가오지 않았다.',
          { who: 'okyoung', t: '우리는 조선 사람이오! 남원 사람이오!' },
          '한참을 소리친 끝에야 작은 배 한 척이 다가왔다. 바닷바람 속에 기다린 반나절이 세 사람의 남은 힘을 앗아 갔다.',
          { who: 'joseon_sailor', t: '조선말이 또렷하구려. 이 배는 통제사의 무역선이오. 순천까지는 태워 주리다.' },
        ],
      },
      {
        id: 's-ship-token', type: 'say',
        lines: [
          { when: (st) => (st.tokens || []).length > 0, t: '배에 오르며 옥영은 품 안을 더듬었다. {신표}. 남원에서부터 지켜 온 것이 아직 거기 있었다.' },
          { when: (st) => (st.tokens || []).length > 0, t: '배도 양식도 빼앗겼지만, 이것만은 끝내 놓지 않았다.' },
          { when: (st) => !(st.tokens || []).length, t: '배에 오르며 옥영은 빈손을 내려다보았다. 가진 것은 다 잃었지만, 돌아갈 곳만은 또렷했다.' },
        ],
      },
      {
        id: 's-ship-card', type: 'card',
        card: {
          kind: 'orig', title: '조선 배',
          body: '해적 앞에서는 명나라 어부, 조선 배 앞에서는 서울 양반. 원작의 옥영은 만나는 배마다 옷과 말을 바꾸어 고비를 넘겨요. 항주에서 두 나라 옷과 말을 준비한 것이 여기서 빛을 보지요.\n통제사의 무역선은 세 사람을 순천에 내려 주었어요. 경신년(1620) 4월이었어요.',
          quote: { 원문: '乃着朝鮮衣, 使夢仙登岸以衣揮之.', 풀이: '그러고는 조선 옷을 입고, 몽선을 언덕에 올려 보내 옷을 흔들게 했다.' },
          src: '「최척전」 ¶20(순천 상륙 연도는 규장각 일사문고본 이미지로 바로잡음: 庚申)',
        },
        next: '조선 땅으로 ▶',
      },
    ],
    scenes: {
      sc_sea_departure: { caption: '항주를 떠나는 배', prompt_hint: 'A small junk leaving the Hangzhou estuary at dawn, Okyoung at the bow holding a round compass, son and daughter-in-law adjusting the sail, wide sea ahead, gouache picture-book style' },
      sc_sea_route: { caption: '두 뱃길', prompt_hint: 'Okyoung studying an old hand-drawn sea chart spread on the deck, two routes traced with a finger, lantern light, gouache picture-book style' },
      sc_sea_patrol: { caption: '명나라 순찰선', prompt_hint: 'A Ming coast-guard patrol boat with red banners pulling alongside a small junk near a rocky coastal anchorage; Okyoung in Ming clothes calmly answering, calm daylight, gouache picture-book style' },
      sc_sea_pirates: { caption: '해적에게 배를 빼앗기다', prompt_hint: 'Symbolic: a dark pirate ship towing away a small empty junk on choppy grey water while three small figures stand on a rocky shore watching, no weapons or violence, gouache picture-book style' },
      sc_island_cave: { caption: '바위굴의 밤과 새벽', prompt_hint: 'Three people huddled in a rock cave mouth on a small island at first light, a faint warm golden glow in the sky like a distant Buddha silhouette, quiet and hopeful, gouache picture-book style' },
      sc_island_signal: { caption: '남은 것을 어떻게 쓸까', prompt_hint: 'On a small sandy island, a pile of dry branches beside a stone ring and a tiny sack of rice; Okyoung, her son and daughter-in-law deciding, horizon empty, late afternoon, gouache picture-book style' },
      sc_sea_joseon_ship: { caption: '저건 조선 배다', prompt_hint: 'A Joseon trading sailship appearing on the horizon of a bright morning sea; on the island hill a young man waving a white garment while Okyoung points joyfully, gouache picture-book style' },
    },
  };
})();
