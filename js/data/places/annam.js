'use strict';
// 안남(1막 절정): 밤의 국제 항구 → 뱃사람들의 단서(역사 카드·시구 조각 4) → 퉁소 알아듣기 → 화답(시구 맞추기) → 재회 → 돈우의 작별 → 1차시 끝
//  - 퉁소 알아듣기(type:'tongso', js/game/poem.js): 안남에 닿을 때의 연으로 정한다. 7 이상 첫 소리 · 4~6 두 번째 · 3 이하 세 번째(js/data/poem.js의 hear).
//    알아듣지 못하면 포구를 한 번 더 걷는다(목표 b-walk2·b-walk3). 3 이하이면 그사이 모래밭에서 잃었던 2행이 되살아난다(recall-sky).
//  - 화답(type:'poem'): 조각 패와 '더듬어 찾기'. 1막 끝(type:'act1End')은 다른 작업이 등록한다.
//  - 이어 하기 글자는 steps를 이 차례대로 되풀이한다: 게이지가 바뀌는 곳은 '더듬어 찾기'뿐이다.
//  원문은 위키문헌 「최척전」 ¶13, 풀이는 자체 번역(design/research/01_원문_사실확인.md §3-6·§3-7·§6).
window.PLACES = window.PLACES || {};
(function () {
  const POEM = () => window.POEM || {};
  // 안남에 닿을 때의 연(퉁소 단계가 처음 울릴 때 적어 둔다. 되풀이처럼 적어 둔 값이 없으면 지금 연)
  const yeonAtArrival = (st) => { const f = (st && st.flags) || {}; return f['annam:yeon0'] != null ? f['annam:yeon0'] : Number(st && st.yeon) || 0; };
  // 몇 번째 소리에 알아듣는가
  const hearAt = (st) => {
    const y = yeonAtArrival(st);
    const rows = POEM().hear || [{ min: 7, sound: 1 }, { min: 4, sound: 2 }, { min: 0, sound: 3 }];
    const r = rows.find((x) => y >= x.min) || rows[rows.length - 1];
    return r.sound;
  };
  const heard = (st) => !!((st && st.flags) || {})['annam:heard'];

  // 맵 격자(엔진의 G.world.mk가 없을 때 — 브라우저 밖에서 자료만 읽을 때 — 같은 방식으로 만든다)
  const mk = (w, hgt, base, ops) => {
    if (window.G && G.world && G.world.mk) return G.world.mk(w, hgt, base, ops);
    const g = Array.from({ length: hgt }, () => Array(w).fill(base));
    for (const [k, x, y, rw, rh, c] of ops) if (k === 'rect') for (let j = y; j < y + rh; j++) for (let i = x; i < x + rw; i++) if (g[j] && g[j][i] != null) g[j][i] = c;
    return g.map((r) => r.join(''));
  };

  // 밤의 안남 포구(48×28 칸): 서쪽은 붉은 벽돌 길의 저잣거리와 모래밭, 가운데 석축 부두, 동쪽은 바다.
  //  북쪽 부두(A)에 옥영이 타고 온 일본 배, 가운데 긴 부두(B) 끝 너머 물 건너에 최척이 탄 중국 배(닿을 수 없다), 남쪽 부두(C)에 고깃배.
  const grid = mk(48, 28, 'w', [
    ['rect', 0, 0, 20, 28, '.'],
    ['rect', 0, 0, 20, 3, 'm'],
    ['rect', 0, 8, 20, 3, '='],          // 큰길(붉은 벽돌)
    ['rect', 2, 11, 16, 5, '='],         // 저잣거리 마당
    ['rect', 4, 12, 9, 3, 'e'],          // 장터 흙바닥
    ['rect', 0, 17, 20, 8, 's'],         // 모래밭
    ['rect', 0, 25, 20, 1, 'v'],
    ['rect', 0, 26, 20, 2, '~'],
    ['rect', 20, 2, 2, 23, 'n'],         // 석축 부두
    ['rect', 22, 0, 2, 28, '~'],         // 얕은 물
    ['rect', 22, 8, 9, 2, '_'],          // 부두 A(일본 배)
    ['rect', 24, 6, 5, 1, 'd'],          // 일본 배 갑판
    ['rect', 25, 7, 3, 1, 'd'],
    ['rect', 22, 15, 12, 2, '_'],        // 부두 B(긴 부두) — 끝에서 중국 배까지는 물
    ['rect', 37, 15, 4, 1, 'd'],         // 중국 배 갑판(물로 둘러싸여 닿을 수 없다)
    ['rect', 22, 21, 8, 2, '_'],         // 부두 C(고깃배)
    ['rect', 20, 25, 2, 3, 'v'],
  ]);

  PLACES.annam = {
    name: '안남', act: 1, node: 'annam', year: '1600',
    // 재회한 뒤에는 미션이 바뀐다(HUD가 조건에 맞는 첫 문장을 보인다)
    missions: [{ when: { done: 's:annam:reunion' }, text: '최척을 다시 만났다. 이제 함께 살 길을 찾아라.' }],
    map: 'annam_port', spawn: [24, 8, 'down'],
    avatar: 'sp_okyoung_m',
    music: 'annam_night',
    cover: 'sc_annam_port',
    intro: '경자년(1600) 봄, 돈우의 장삿배가 안남 포구에 닿았다. 여러 나라의 배가 등불을 달고 모여 있는 밤의 항구다.',
    // 퉁소 알아듣기 공통 글(단계마다 lines·stray를 따로 적는다). pan: 소리가 오는 쪽(-1 왼쪽 ~ 1 오른쪽, 중국 배는 동쪽)
    tongso: {
      pan: 0.55,
      heard: [
        '옥영은 숨을 멈췄다. 이 가락은…. 남원의 봄밤, 달 아래에서 그이가 불던 바로 그 가락이다.',
        { who: 'okyoung', t: '(그이가 저 배에 있는 걸까. 아니, 그럴 리가…. 그래도 만에 하나라면.)' },
      ],
      after: ['옥영은 그 밤의 시로 답해 보기로 했다. 세상에서 두 사람만 아는 시다.'],
      next: '다음 ▶', // 알아들은 뒤 마지막 단추(이어서 원작 대조 카드 q-heard → 화답)
    },
    maps: {
      annam_port: {
        name: '안남 포구', theme: 'harbor_night', grid, spawn: [24, 8, 'down'], music: 'annam_night',
        lights: [[9, 21, 90]], // 모래밭의 달빛
        props: [
          // 일본 배(옥영이 타고 온 돈우의 배)·중국 배(최척)는 바닥처럼 깔고(flat) 그 위 갑판에 사람이 선다
          ['pr_jpship', 23, 7, { flat: true }],
          ['pr_junk', 35, 16, { flat: true }],
          ['pr_junk', 39, 8],
          ['pr_fishboat', 30, 23],
          ['pr_fishboat', 24, 26],
          ['pr_boat', 42, 22],
          ['pr_boat', 33, 4],
          // 저잣거리
          ['pr_minghouse', 1, 7], ['pr_minghouse', 7, 7], ['pr_minghouse', 13, 7],
          ['pr_palm', 3, 2], ['pr_palm', 10, 1], ['pr_fanpalm', 16, 2], ['pr_bush', 0, 3], ['pr_bush', 18, 4],
          ['pr_lantern', 6, 9], ['pr_lantern', 12, 9], ['pr_lantern', 18, 9], ['pr_lantern', 0, 9],
          ['pr_crates', 4, 12], ['pr_sacks', 5, 13], ['pr_crates', 13, 12], ['pr_barrels', 14, 13], ['pr_sacks', 16, 14], ['pr_barrels', 2, 14],
          // 부두
          ['pr_lantern', 21, 7], ['pr_lantern', 30, 8], ['pr_lantern', 21, 14], ['pr_lantern', 26, 15], ['pr_lantern', 33, 15], ['pr_lantern', 29, 21], ['pr_lantern', 21, 20],
          ['pr_post', 30, 10], ['pr_post', 33, 17], ['pr_post', 22, 23], ['pr_anchor', 20, 23], ['pr_crates', 22, 10], ['pr_barrels', 23, 17],
          // 모래밭
          ['pr_palm', 2, 19], ['pr_palm', 15, 22], ['pr_fanpalm', 11, 17], ['pr_fanpalm', 18, 18], ['pr_palm', 7, 24],
          ['pr_nets', 4, 22, { flat: true }], ['pr_netrack', 13, 20], ['pr_rocks', 17, 24], ['pr_boat', 10, 25],
        ],
        spots: {
          quay_view: { x: 20, y: 11, w: 2, h: 3, name: '석축 부두' },
          pier_end: { x: 31, y: 15, w: 2, h: 2, name: '부두 끝' },
          gaze: { x: 33, y: 15, w: 1, h: 2, name: '부두 끝', act: '바라보기', look: ['물 건너 중국 배 한 척이 등불을 달고 떠 있다. 헤엄쳐 건너기에는 너무 멀다.'] },
          beach: { x: 7, y: 19, w: 4, h: 3, name: '모래밭' },
          stalls: { x: 8, y: 11, w: 3, h: 1, name: '장터', look: ['비단, 도자기, 후추, 상아…. 처음 보는 물건들이 등불 아래 쌓여 있다.'] },
        },
      },
    },
    cast: {
      annam_port: {
        ming: { who: 'merchant_ming', x: 9, y: 13, dir: 'down', talk: [['은이 도는 곳에는 배가 모이는 법이지.']] },
        sailor: { who: 'sailor', name: '남쪽 바다 뱃사람', x: 25, y: 21, dir: 'left', talk: [['바람이 자는 밤이오. 이런 밤엔 소리가 멀리 가지.']] },
        west: { who: 'sailor_west', x: 28, y: 16, dir: 'up', talk: [['(알아들을 수 없는 말로 무어라 하며 웃는다.)']] },
        jp: { who: 'merchant_jp', x: 23, y: 9, dir: 'right', wander: 1, talk: [['돈우 어른 배는 내일 짐을 다 부린다더군.']] },
        donwoo: { who: 'donwoo', x: 27, y: 6, dir: 'down', talk: [['나무아미타불…. 사간, 밤바람이 차다.']] },
        cheok: { who: 'choecheok', name: '중국 배의 사내', x: 38, y: 15, dir: 'left' },
        songwoo: { who: 'songwoo', sp: 'sp_merchant_ming', name: '중국 배의 상인', x: 40, y: 15, dir: 'left' },
      },
    },
    beats: [
      { id: 'b-arrive', auto: true, inline: true, steps: ['arrive'] },
      { id: 'b-look', goal: '부두에 서서 포구를 둘러보자', go: 'quay_view', inline: true, steps: ['vast'] },
      { id: 'b-ming', goal: '장터의 명나라 상인에게 말을 걸어 보자', talk: 'ming', steps: ['trade'] },
      { id: 'b-sailor', goal: '남쪽 부두의 뱃사람에게 물어보자', talk: 'sailor', inline: true, steps: ['haze'] },
      { id: 'b-west', goal: '긴 부두의 먼 나라 뱃사람에게 가 보자', talk: 'west', inline: true, steps: ['compass'] },
      { id: 'b-donwoo', goal: '돈우의 배로 돌아가자', talk: 'donwoo', inline: true, steps: ['frag4'] },
      { id: 'b-sound1', auto: true, steps: ['tongso-1'] },
      { id: 'b-walk2', when: (st) => !heard(st), goal: '잠이 오지 않는다. 긴 부두 끝까지 걸어 보자', go: 'pier_end', steps: ['tongso-2'] },
      { id: 'b-walk3', when: (st) => !heard(st), goal: '모래밭으로 내려가 보자', go: 'beach', steps: ['recall-sky', 'tongso-3'] },
      { id: 'b-poem', auto: true, steps: ['q-heard', 'poem', 'cheok-words', 'q-cheok', 'cheok-night'] },
      {
        id: 'b-dawn', spawn: [25, 6, 'down'], hide: ['cheok'], music: 'reunion',
        show: { cheok_dawn: { who: 'choecheok', x: 26, y: 9, dir: 'up' } },
        goal: '부르는 소리를 따라 배에서 내려가자', talk: 'cheok_dawn',
        steps: ['reunion', 'q-reunion', 'reunion-after', 'q-chance', 'farewell', 'q-farewell', 'q-farewell-deep', 'farewell-after', 'act1end'],
      },
    ],
    steps: [
      {
        id: 'arrive', type: 'say', lines: [
          '경자년(1600) 봄, 돈우의 장삿배가 안남 포구에 닻을 내렸다.',
          '중국 배, 일본 배, 이름 모를 먼 나라의 배까지 수십 척이 등불을 달고 떠 있다. 낯선 말들이 뒤섞여 웅성거린다.',
          { who: 'okyoung', t: '(여기가 안남…. 조선에서 얼마나 멀리 온 걸까.)' },
        ],
      },
      {
        id: 'vast', type: 'say', lines: [
          '부두에 서니 포구가 한눈에 들어온다. 배는 셀 수 없이 많고, 사람은 그보다 더 많다.',
          { who: 'okyoung', t: '(이 넓은 바다 어딘가에 그이가 살아 있기는 할까.)' },
          "아무도 '사간'을 눈여겨보지 않는다. 등불만 물 위에서 흔들릴 뿐, 포구는 고요하다.",
        ],
      },
      {
        id: 'trade', type: 'card', history: 'h-annam-trade',
        lines: [
          { who: 'merchant_ming', t: '처음 보는 얼굴이구먼. 왜국 배에서 왔소?' },
          { who: 'merchant_ming', t: '우리 명나라는 왜국과 바로 장사하는 걸 막고 있소. 그러니 이렇게 남쪽 바다 안남까지 내려와서 서로 물건을 바꾸는 거지.' },
          { who: 'merchant_ming', t: '동쪽 바다 끝에 신선이 산다는 **봉래섬**이 있다지? 우리 장사꾼한테는 은이 도는 이 포구가 봉래섬이오. 하하.' },
          { who: 'okyoung', t: '(봉래섬…. 어디서 들어 본 이름이다.)' },
        ],
        card: {
          title: '17세기 동아시아 바다의 교역선',
          body: '16세기 말~17세기 초, 동아시아 바다는 여러 나라 장삿배로 붐볐다. 명나라는 중국 상인이 동남아로 나가는 것은 허락했지만, 일본과 직접 거래하는 것은 막았다. 그래서 중국 배와 일본 배는 안남(지금의 베트남 중부, 호이안 등) 같은 제3의 항구에서 만나 물건을 사고팔았다.\n최척(중국 상선)과 옥영(일본 상선)이 안남에서 만나는 것은 허황한 우연만은 아니다. 당시 바다의 모습을 반영한 것이다. 정유재란 때 붙잡혀 간 조완벽도 일본 상인의 배를 타고 안남을 세 번이나 오갔다.',
          src: '이수광 『지봉유설』(조완벽 이야기), 권혁래(2009)의 안남=호이안 분석 등',
        },
      },
      {
        id: 'haze', type: 'say', lines: [
          { who: 'sailor', t: '해가 지면 이 바다엔 **안개**가 깔리고 **노을**이 붉게 번지지. 그 속에서 길을 잃은 배가 한둘이 아니오.' },
          { who: 'sailor', t: '나도 하마터면 그렇게 될 뻔했지. 고향 쪽 하늘만 보고 버텼소.' },
          { who: 'okyoung', t: '(안개와 노을…. 그 말도 낯설지 않다.)' },
        ],
      },
      {
        id: 'compass', type: 'say', lines: [
          '먼 나라 뱃사람이 알아들을 수 없는 말로 무어라 하더니, 손바닥만 한 상자를 내민다. 상자 속 바늘이 파르르 떨다가 한쪽을 가리킨다.',
          '그가 상자를 이리저리 돌려도 바늘은 늘 같은 쪽으로 돌아온다. 그는 안개 낀 바다를 가리키고, 바늘을 가리키고, 웃으며 고개를 끄덕인다.',
          { who: 'okyoung', t: '(안개 속에서도 **길을 잃지 않는다**는 뜻이구나.)' },
        ],
      },
      {
        id: 'frag4', type: 'frag', n: 4, lines: [
          { who: 'donwoo', t: '사간, 어디 다녀오느냐. 밤바람이 차다. 들어와 쉬어라.' },
          '돈우는 뱃머리에 앉아 낮게 염불을 외기 시작했다. 나무아미타불, 나무아미타불….',
          { who: 'okyoung', t: '(봉래섬, 안개와 노을, 길을 잃지 않는다….)' },
          '흩어져 있던 말들이 한 줄로 이어진다. 남원의 그 봄밤, 옥영이 지은 시의 마지막 구절이다.',
        ],
      },
      {
        id: 'tongso-1', type: 'tongso', sound: 1, scene: 'sc_annam_tongso',
        lines: ['밤이 깊었다. 돈우의 염불 소리도 그쳤다. 바람이 자고 물결도 잔잔하다.', '그때, 물 건너 어디선가 가락 하나가 흘러왔다.'],
        stray: ['바람 소리였을까, 어느 뱃사람의 노래였을까. 가락은 물결에 섞여 금세 흩어졌다.', { who: 'okyoung', t: '(누가 저리 구슬피 부는 걸까….)' }],
      },
      {
        id: 'tongso-2', type: 'tongso', sound: 2, scene: 'sc_annam_tongso',
        lines: ['부두 끝에 서자, 물 건너 중국 배 쪽에서 그 가락이 다시 흘러왔다. 아까보다 가깝다.'],
        stray: ['가락은 귓가를 맴돌다 멀어졌다. 옥영의 귀는 그 소리를 붙잡지 못했다.', { who: 'okyoung', t: '(분명 어디서 들은 가락인데….)' }],
      },
      {
        id: 'recall-sky', type: 'frag', n: 2,
        when: (st) => hearAt(st) >= 3 && !((st && st.frags) || {})[2],
        lines: [
          '모래밭에 서서 하늘을 올려다보았다. 별이 가득한 하늘이 바다처럼 깊고 푸르다. 어깨에 이슬이 차갑게 내려앉는다.',
          { who: 'okyoung', t: '(바다 같은 푸른 하늘, 차가운 이슬…. 그래, 그 밤에도 이랬다.)' },
          '잃어버린 줄 알았던 구절 하나가 되살아났다.',
        ],
      },
      {
        id: 'tongso-3', type: 'tongso', sound: 3, scene: 'sc_annam_tongso',
        lines: ['세 번째로 가락이 물을 건너왔다. 이번에는 옥영의 귀가 그 소리를 붙잡았다.'],
      },
      // 알아들은 뒤의 원작 대조(소리를 '알아듣는' 근거). 지식을 주지 않는 카드 단계라 이어 하기 글자로 되살릴 때도 늘 모인다
      {
        id: 'q-heard', type: 'card', next: '그 밤의 시로 답하기 ▶',
        card: { id: 'q-annam-heard', kind: 'orig', title: '원작에서 — 옥영이 들은 소리', summary: '원작에서도 옥영이 먼저 소리를 알아듣고, 시를 읊어 떠본다.', quote: { 원문: '玉英夜於船中聞其簫聲, 乃是朝鮮之曲調, 而一似疇昔慣聆之調, 竊疑其夫之或來于其船, 試詠其詩而探之.', 풀이: '옥영도 밤에 배 안에서 퉁소 소리를 들었다. 조선 가락인 데다 예전에 늘 듣던 가락과 똑같아서, 혹시 남편이 그 배에 와 있는 것은 아닐까 남몰래 의심했다. 그래서 그 시를 읊어 떠보았다.' }, src: '「최척전」 ¶13' },
      },
      { id: 'poem', type: 'poem', scene: 'sc_annam_poem' },
      {
        id: 'cheok-words', type: 'say', scene: 'sc_annam_cheok', lines: [
          '마지막 구절을 읊고 나자, 물 건너 퉁소 소리가 뚝 멎었다.',
          '그 시각, 중국 배 위. 퉁소를 불던 사내는 퉁소를 떨어뜨린 줄도 모르고 넋 나간 사람처럼 굳어 있었다.',
          { who: 'songwoo', t: '여보게, 왜 그러나?' },
          '두 번을 물어도 대답이 없었다. 세 번째에야 사내는 목멘 소리로 입을 열었다.',
          { who: 'choecheok', t: '이 시는 내 아내가 손수 지은 것이오. 여태 다른 사람은 들어 본 적이 없는 시라오.' },
        ],
      },
      {
        id: 'q-cheok', type: 'card',
        card: { id: 'q-annam-cheok', kind: 'orig', title: '원작에서 — 최척의 말', summary: '시를 듣고 넋을 잃었던 최척이 한참 만에 한 말이다. 이 시는 옥영이 지어 두 사람만 아는 노래였다.', quote: { 원문: '此詩乃吾荊布所自製也, 平日絶無他人聞之者.', 풀이: '"이 시는 내 아내가 손수 지은 것이오. 여태 다른 사람은 들어 본 적이 없는 시라오." (荊布 형포: 가시나무 비녀와 무명 치마, 곧 가난한 아내를 겸손하게 이르는 말)' } },
      },
      {
        id: 'cheok-night', type: 'say', scene: 'sc_annam_cheok', lines: [
          { who: 'choecheok', t: '게다가 목소리마저 아내와 꼭 닮았소. 설마 아내가 저 배에 와 있단 말이오? 그럴 리가 없소.' },
          '송우는 깊은 밤에 남의 배로 건너가면 탈이 날 수 있으니 날이 밝기를 기다리자며 그를 붙들었다. 최척은 앉은 채로 아침을 기다렸다.',
          '일본 배의 옥영도 그 밤 내내 잠들지 못했다.',
        ],
      },
      {
        id: 'reunion', type: 'say', scene: 'sc_annam_reunion', lines: [
          '동쪽 하늘이 희붐하게 밝아 올 무렵, 한 사내가 일본 배 앞에 와서 조선말로 외쳤다.',
          { who: 'choecheok', t: '간밤에 시를 읊은 분은 틀림없이 조선 사람이겠지요. 나도 조선 사람이오. 한 번만이라도 얼굴을 볼 수 있다면 좋겠소!' },
          '그 말을 듣자 옥영은 어쩔 줄 모르고 허둥지둥 배에서 내려갔다.',
          '두 사람은 서로를 알아보았다. 소리쳐 부르며 끌어안고 모래밭에 쓰러져 뒹굴었다. 목이 메어 말이 나오지 않았다.',
        ],
      },
      {
        id: 'q-reunion', type: 'card',
        card: { id: 'q-annam-reunion', kind: 'orig', title: '원작에서 — 안남 포구의 재회', summary: '경자년(1600) 봄, 정유년에 헤어진 지 햇수로 네 해 만이다. 중국 배와 일본 배에 따로 실려 온 두 사람이 남쪽 바다의 포구에서 만났다.', quote: { 원문: '二人相見, 驚呼抱持, 宛轉沙中, 聲絶氣塞, 口不能言.', 풀이: '두 사람은 서로 마주 보자 놀라 소리치며 부둥켜안고 모래밭에 뒹굴었다. 목이 메고 숨이 막혀 말을 하지 못했다.' } },
      },
      {
        id: 'reunion-after', type: 'say', scene: 'sc_annam_reunion', lines: [
          '두 나라 뱃사람들이 담처럼 둘러서서 지켜보았다. 처음에는 친척인지 벗인지 몰랐다가, 한참 뒤에야 부부라는 것을 알았다.',
          { who: 'sailor', t: '기이하다, 기이하다! 하늘이 돕고 신령이 도운 일이오. 예로부터 이런 일은 없었소.' },
          { who: 'choecheok', t: '부모님 소식은 아오?' },
          { who: 'okyoung', t: '산에서 강가까지 끌려갈 때만 해도 두 분 모두 무사하셨어요. 그런데 날이 저물어 배에 오르다가, 경황 중에 서로 놓치고 말았어요.' },
          '두 사람은 마주 보고 목 놓아 울었다. 듣는 사람마다 코끝이 시큰해졌다.',
        ],
      },
      // 해석 카드(두 방식 모두): 기이한 우연인가, 그럴 법한 만남인가 — 전기성과 역사 배경을 함께 생각한다
      {
        id: 'q-chance', type: 'card',
        card: {
          id: 'i-annam-chance', kind: 'interp', kindLabel: '해석', title: '우연일까, 그럴 법한 일일까',
          body: '뱃사람들은 "하늘이 돕고 신령이 도운 일"이라며 놀랐다. 꿈에 나타난 장육불, 퉁소 가락과 시 한 수로 알아본 남편 — 이 재회는 기이한 우연처럼 보인다. 이렇게 우연과 기적이 이야기를 이끄는 성격을 **전기성(傳奇性)**이라 한다.\n그런데 이 무렵 안남 같은 남쪽 항구에는 실제로 중국 배와 일본 배가 함께 드나들었다. 중국 상선을 탄 최척과 일본 상선을 탄 옥영이 같은 포구에 닿는 것은, 당시 바다의 모습으로는 있을 법한 일이기도 하다.\n**나는 이 장면이 우연으로 읽히는가, 그럴 법한 일로 읽히는가? 짝과 근거를 들어 이야기해 보자.**',
          src: '해석 · 근거: 역사 카드 「17세기 동아시아 바다의 교역선」',
        },
      },
      {
        id: 'farewell', type: 'say', scene: 'sc_annam_farewell', lines: [
          '송우가 은 세 덩이를 내놓으며 돈우에게 옥영을 보내 달라고 청했다. 돈우는 얼굴을 붉히며 손을 내저었다.',
          { who: 'donwoo', t: '이 사람과 함께한 지 벌써 네 해요. 내 자식처럼 여겼는데도 끝내 여인인 줄은 몰랐구려. 오늘 이 일을 보니 하늘이 하신 일이오. 내 어찌 이 사람을 팔아 그 돈으로 먹고살겠소?' },
          '돈우는 전대를 뒤져 은 열 냥을 꺼내 옥영의 손에 쥐여 주었다.',
          { who: 'donwoo', t: '네 해를 한집에서 살다 하루아침에 헤어지니 서운하구나. 그래도 죽을 고비의 바다에서 짝을 다시 만났으니 세상에 없던 일이다. 잘 가게, 사간! 몸 성히, 몸 성히!' },
        ],
      },
      {
        id: 'q-farewell', type: 'card', when: { mode: 'basic' },
        card: { id: 'q-annam-farewell', kind: 'orig', title: '원작에서 — 돈우의 작별', summary: '송우가 은 세 덩이로 옥영을 사려 하자 돈우는 화를 내며 거절했다. 오히려 은 열 냥을 노자로 내주며, 네 해 동안 함께 산 사람을 떠나보냈다.', quote: { 원문: '好去沙干! 珍重! 珍重!', 풀이: '"잘 가게, 사간! 몸 성히, 몸 성히!"' } },
      },
      {
        id: 'q-farewell-deep', type: 'card', when: { mode: 'deep' },
        card: { id: 'q-annam-farewell', kind: 'orig', title: '원작에서 — 돈우의 작별', summary: '적국의 늙은 상인이 포로였던 사람을 은 열 냥까지 주어 떠나보낸다. 전쟁을 일으킨 나라와 그 나라의 한 사람은 같지 않다는 것을 원작은 놓치지 않는다.', quote: { 원문: '同居四載, 一朝離別, 悵憫之懷, 雖切於中, 而重逢配耦於萬死之洋, 此人世所無之事. 我若隘之, 天必殛之. 好去沙干! 珍重! 珍重!', 풀이: '"네 해를 한집에서 살다가 하루아침에 헤어지니 서운하고 안타까운 마음이 가슴에 사무치오. 그래도 죽을 고비의 바다에서 짝을 다시 만났으니 세상에 없던 일이오. 내가 이를 가로막는다면 하늘이 반드시 나를 벌하실 것이오. 잘 가게, 사간! 몸 성히, 몸 성히!"' } },
      },
      {
        id: 'farewell-after', type: 'say', scene: 'sc_annam_farewell', lines: [
          { who: 'okyoung', t: '주인 어른 덕분에 죽지 않고 살아 마침내 낭군을 만났습니다. 받은 은혜가 큰데 이런 선물까지 주시니, 무엇으로 갚겠습니까?' },
          '최척은 거듭 고마움을 전하고, 옥영의 손을 잡고 자기 배로 돌아갔다.',
        ],
      },
      { id: 'act1end', type: 'act1End' },
    ],
    // 삽화(그림이 생기면 img에 경로를 적는다). prompt_hint: 그림 그리는 작업에 넘길 한 줄 설명(글자 없음)
    scenes: {
      sc_annam_port: { caption: '밤의 안남 포구. 여러 나라 배가 등불을 달고 모여 있다.', prompt_hint: 'Night harbor of Hoi An around 1600: Chinese junks, a Japanese merchant ship and foreign boats moored with red paper lanterns, brick quay, palm trees, lantern reflections on calm indigo water, picture-book gouache and colored pencil, no text' },
      sc_annam_tongso: { caption: '물 건너 중국 배에서 퉁소 소리가 흘러온다.', prompt_hint: 'A young Korean woman disguised in plain male clothes leans on the rail of a Japanese merchant ship at night, listening; across calm moonlit water a distant Chinese junk with one lantern where a man plays a long bamboo flute (tongso); soft ripples spread across the water, picture-book gouache, no text' },
      sc_annam_poem: { caption: '달은 기울고, 이슬은 차갑다. 그 밤의 시로 답한다.', prompt_hint: 'A low setting moon over a calm night sea, dewy cold air, a distant Chinese junk with a single lantern on the right, faint concentric ripples on the water, lots of empty dark-blue sky for text overlay, picture-book gouache, no text, no people in foreground' },
      sc_annam_cheok: { caption: '중국 배 위, 퉁소를 떨어뜨린 최척.', prompt_hint: 'On the deck of a Chinese junk at night, a Korean man in a dark robe sits frozen and stunned, a bamboo flute fallen at his feet; his Chinese merchant friend beside him reaches out in concern; lantern light, picture-book gouache, no text' },
      sc_annam_reunion: { caption: '새벽 모래밭, 두 사람이 서로를 알아보았다.', prompt_hint: 'Dawn on a sandy shore of a southern harbor, a Korean husband and his wife (still in plain male clothes) embrace and weep on the sand, sailors from Chinese and Japanese ships gather around watching in astonishment, soft pink dawn light, picture-book gouache, no text' },
      sc_annam_farewell: { caption: '돈우가 은 열 냥을 쥐여 주며 작별한다.', prompt_hint: 'Morning at a harbor pier: an old kindly Japanese merchant in simple robes presses a small cloth pouch of silver into the hands of a young Korean woman in male clothes, her husband bowing beside her, Japanese ship behind, warm gentle light, picture-book gouache, no text' },
    },
  };
})();
