'use strict';
// 남원 재회(2막 끝, 마을 테마 맵): 순천 상륙 → 금교 → 남원 옛집, 버드나무 아래 최척
//  흐름(놀이 차례 = 단계 차례):
//   ① 순천에 내려 닷새·엿새를 걸어 남원으로(사건) → ② 금교를 건넌다(걸어서) → ③ 버드나무 아래 최척에게 말을 건다
//   ④ 알아보는 순간 — 결말(G.rules.ending)에 따라 넷 가운데 하나
//      whole(연高생高: 옥영이 먼저 알아봄, 신표가 있으면 꺼냄) · weary(연高생低: 몸은 다 닳았지만 알아보는 눈은 흐려지지 않음)
//      strange(연低생高: 알아보는 데 시간이 걸림, 몽석이 먼저 어머니를 알아봄) · barely(연低생低: 가족이 옥영을 알아보고 맞이함)
//   ⑤ 온 식구: 몽석 · 최척의 아버지 최숙 · 병석의 어머니 심씨(놀라 기절했다 깨어남) · 진위경과 홍도 부녀 상봉
//   ⑥ 후일담(결말마다: 남원의 봄 / 회복의 시간 / 다시 쌓는 기억 / 살아 돌아온 것만으로) — 어느 결말도 나쁜 결말이 아니다
//   ⑦ 원작의 결말(origEnding) → 「김영철전」(kimyc) → 결과(result): T10이 등록하는 단계
//  결말 단계는 처음 펼칠 때의 연·생으로 정하고, 저장 칸 ending에도 적는다(fx.set).
//  원문: 「최척전」 ¶20 끝·¶21 (design/research/01_원문_사실확인.md §3-17)
window.PLACES = window.PLACES || {};
(function () {
  const W = G.world;
  const endIs = (k) => (st) => !!(G.rules && G.rules.ending) && G.rules.ending(st) === k;
  const endNot = (k) => (st) => !endIs(k)(st);
  const hasToken = (st) => (st.tokens || []).length > 0;

  PLACES.namwon_final = {
    name: '남원', act: 2, year: '1620',
    map: 'nw_home', spawn: [2, 13, 'right'],
    avatar: 'sp_okyoung_joseon',
    music: 'namwon_memory',
    cover: 'sc_suncheon_landing',
    intro: '경신년(1620) 4월, 순천 포구. 남원을 떠난 지 스물세 해 만에 옥영은 조선 땅을 밟았다.',
    maps: {
      nw_home: {
        name: '금교 건너 옛집', theme: 'village', spawn: [2, 13, 'right'],
        grid: W.mk(34, 18, '.', [
          ['rect', 1, 13, 32, 2, ':'],               // 큰길
          ['rect', 22, 8, 2, 5, ':'],                // 옛집으로 드는 길
          ['rect', 10, 1, 2, 16, '~'], ['rect', 10, 13, 2, 2, 'b'], // 개울과 금교
          ['rect', 1, 15, 8, 2, 'o'], ['rect', 13, 15, 8, 2, 'o'], ['rect', 25, 15, 8, 2, 'p'],
          ['rect', 2, 2, 6, 4, 'p'],
          ['frame', 16, 1, 15, 8, 'f'], ['rect', 17, 2, 13, 6, 'k'], ['rect', 22, 8, 2, 1, ':'], // 옛집 울타리와 마당
          ['rect', 13, 2, 2, 9, 'm'], ['rect', 31, 10, 2, 3, 'm'],
          ['dots', ',', [[13, 12], [14, 11], [20, 12], [29, 12], [6, 12], [7, 11], [27, 10], [30, 9]]],
          ['border', 'h'],
        ]),
        props: [
          ['pr_tilehouse', 22, 4], ['pr_thatch', 17, 4], ['pr_sacks', 28, 6], ['pr_bush', 18, 7],
          ['pr_willow', 25, 11],
          ['pr_thatch', 2, 10], ['pr_pine', 7, 9], ['pr_pine', 13, 7], ['pr_bush', 31, 12], ['pr_post', 9, 12], ['pr_post', 12, 12],
        ],
        spots: {
          bridge: { x: 10, y: 13, w: 2, h: 2, name: '금교' },
          house: { x: 22, y: 7, w: 2, h: 1, name: '옛집 대문', act: '살피기', look: ['낡은 기와지붕, 손때 묻은 대문. 스물세 해 전 그대로다.'] },
        },
      },
    },
    cast: {
      nw_home: {
        mongseon: { who: 'mongseon', x: 4, y: 14, dir: 'right', talk: [['어머니, 저기 보이는 성이 남원성이에요?']] },
        hongdo: { who: 'hongdo', x: 3, y: 14, dir: 'right', talk: [['아버지가 이 땅 어딘가에 묻히셨겠지요.']] },
        cheok: { who: 'choecheok', x: 25, y: 12, dir: 'right' },
        jin: { who: 'jinwigyeong', name: '손님', x: 27, y: 12, dir: 'left' },
      },
    },
    beats: [
      { id: 'b-landing', auto: true, steps: ['n-landing'] },
      { id: 'b-bridge', goal: '금교를 건너 마을로 들어가자', go: 'bridge', steps: ['n-geumgyo'], then: { show: { mongseon: { who: 'mongseon', x: 14, y: 13, dir: 'right', talk: [['어머니, 저 집이에요?']] }, hongdo: { who: 'hongdo', x: 14, y: 14, dir: 'right' } } } },
      {
        id: 'b-willow', goal: '버드나무 아래 앉은 사람에게 가 보자', talk: 'cheok', music: 'reunion',
        steps: [
          'n-willow', 'n-know-whole', 'n-know-weary', 'n-know-strange', 'n-know-barely',
          'n-family', 'n-mother', 'n-jin',
          'n-end-whole', 'n-end-weary', 'n-end-strange', 'n-end-barely',
          'n-orig-ending', 'n-kimyc', 'n-result',
        ],
      },
    ],
    steps: [
      {
        id: 'n-landing', type: 'say', scene: 'sc_suncheon_landing',
        lines: [
          '배에서 내린 옥영은 몽선과 홍도를 데리고 남원으로 걸었다. 닷새, 엿새가 걸렸다.',
          '식구들은 모두 전란에 죽었을 것이다. 그래도 옛집 터만은 보고 싶었다.',
          { who: 'hongdo', t: '여기가… 아버지가 숨지신 나라군요.' },
        ],
      },
      {
        id: 'n-geumgyo', type: 'say', scene: 'sc_namwon_geumgyo',
        lines: [
          '금교에 이르러 바라보니, 성곽도 그대로였고 마을도 옛 모습이었다.',
          { who: 'okyoung', t: '저기가 네 아버지가 살던 집이다. 지금은 누가 사는지 모르겠구나. 우선 하룻밤 묵게 해 달라고 청해 보자.' },
          { when: { mode: 'deep' }, wonmun: { 원문: '至今橋望見城郭宛然, 村閭依舊.', 풀이: '금교에 이르러 바라보니 성곽도 그대로이고 마을도 옛 모습이었다.' } },
        ],
      },
      {
        id: 'n-willow', type: 'say', scene: 'sc_namwon_willow',
        lines: [
          '대문 밖 버드나무 아래, 한 사내가 손님과 마주 앉아 있었다.',
          '희끗한 머리, 조금 굽은 어깨. 스물세 해의 세월이 그 사람 위에도 내려앉아 있었다.',
        ],
      },
      // ④ 알아보는 순간(결말마다 하나)
      {
        id: 'n-know-whole', type: 'say', when: endIs('whole'), fx: { set: { ending: 'whole' } },
        lines: [
          '옥영은 가까이 다가가 찬찬히 보았다. 단번에 알 수 있었다. 남편이었다.',
          { wonmun: { 원문: '見陟方對客坐於柳樹之下, 近前熟視, 乃是其夫也.', 풀이: '보니 최척이 버드나무 아래에서 손님과 마주 앉아 있었다. 가까이 다가가 찬찬히 보니 바로 남편이었다.' } },
          { when: hasToken, t: '옥영은 품에서 {신표:를} 꺼내 내밀었다. 최척의 손이 떨렸다.' },
          { who: 'choecheok', t: '몽석이 어머니가 왔구나! 이것이 하늘의 일인가, 사람의 일인가, 꿈인가!' },
        ],
      },
      {
        id: 'n-know-weary', type: 'say', when: endIs('weary'), fx: { set: { ending: 'weary' } },
        lines: [
          '긴 뱃길에 몸은 다 닳아, 옥영은 문 앞에서 걸음을 멈추고 기둥을 붙잡았다.',
          '그래도 눈은 흐려지지 않았다. 버드나무 아래 그 얼굴을, 옥영은 한눈에 알아보았다.',
          { who: 'okyoung', t: '…여보.' },
          { when: hasToken, t: '옥영은 떨리는 손으로 {신표:를} 내밀었다.' },
          { who: 'choecheok', t: '몽석이 어머니! 이것이 꿈이오, 생시오!' },
        ],
      },
      {
        id: 'n-know-strange', type: 'say', when: endIs('strange'), fx: { set: { ending: 'strange' } },
        lines: [
          '옥영은 사내를 한참 바라보았다. 낯익은 듯도 하고 낯선 듯도 했다. 스물세 해는 너무 길었다.',
          '그때 집 안에서 젊은이 하나가 맨발로 뛰어나왔다.',
          { who: 'mongseok', t: '어머니…? 어머니 맞으시지요!' },
          '그 목소리에 옥영의 기억이 한꺼번에 돌아왔다. 버드나무 아래 그 사람은 최척이었다.',
          { when: hasToken, t: '옥영은 그제야 {신표:를} 꺼냈다. 최척이 그것을 알아보고 소리 내어 울었다.' },
        ],
      },
      {
        id: 'n-know-barely', type: 'say', when: endIs('barely'), fx: { set: { ending: 'barely' } },
        lines: [
          '옥영은 더 걸을 힘이 없었다. 문 앞에 주저앉아 고개조차 들지 못했다.',
          '버드나무 아래 사내가 다가와 옥영의 얼굴을 들여다보았다. 그러고는 크게 소리쳤다.',
          { who: 'choecheok', t: '몽석이 어머니! 몽석이 어머니가 왔소!' },
          '옥영이 남편을 알아본 것은 그다음이었다. 먼저 알아보지 못해도 괜찮았다. 가족이 옥영을 알아보았다.',
          { when: hasToken, t: '최척은 옥영이 손에 꼭 쥔 {신표:를} 보고 다시 한 번 울었다.' },
        ],
      },
      // ⑤ 온 식구
      {
        id: 'n-family', type: 'say', scene: 'sc_namwon_family',
        lines: [
          { when: endNot('strange'), t: '그 소리에 몽석이 맨발로 뛰어나왔다. 어머니와 아들이 스물세 해 만에 서로를 붙들었다.' },
          { when: endNot('strange'), who: 'mongseok', t: '어머니, 살아 계셨군요.' },
          { when: endIs('strange'), t: '몽석은 어머니를 붙든 채 놓지 않았다. 스물세 해 만이었다.' },
          '최척의 아버지 최숙도 지팡이를 짚고 나와 며느리의 손을 잡았다.',
          { who: 'choesuk', t: '살아서 너를 다시 보는구나.' },
        ],
      },
      {
        id: 'n-mother', type: 'say',
        lines: [
          '방 안에는 옥영의 어머니 심씨가 병석에 누워 있었다.',
          '딸이 왔다는 말을 듣자 심씨는 놀라 그대로 정신을 잃었다. 옥영이 어머니를 끌어안고 한참을 주무르자 겨우 숨이 돌아왔다.',
          { who: 'simssi', t: '옥영아… 정말 너로구나.' },
        ],
      },
      {
        id: 'n-jin', type: 'say', scene: 'sc_namwon_jin',
        lines: [
          '최척이 손님을 불렀다. 버드나무 아래 마주 앉아 있던 그 사람이었다.',
          { who: 'choecheok', t: '진 공, 그 아이도 이제 왔소. 이 아이가 바로 홍도요.' },
          '홍도는 처음 보는 아버지 앞에 섰다. 돌도 되기 전에 헤어진 아버지였다.',
          { who: 'jinwigyeong', t: '네가… 홍도로구나. 네가 태어나던 날 이웃이 복숭아를 보내와서, 이름을 홍도라 지었지.' },
          { who: 'hongdo', t: '돌아가신 줄로만 알았어요. 이 나라에 와서 울기라도 하려고 했는데….' },
          '흩어졌던 두 집 식구가 한 마당에 모였다. 소식을 들은 이웃들이 담장처럼 둘러서서 놀라워했다.',
        ],
      },
      // ⑥ 후일담(결말마다 하나)
      {
        id: 'n-end-whole', type: 'say', when: endIs('whole'), fx: { set: { ending: 'whole' } }, scene: 'sc_ending_whole', title: '남원의 봄',
        lines: [
          '그해 봄, 남원 옛집에 세 대가 함께 살게 되었다.',
          '옥영은 지켜 온 것을 하나하나 꺼내 식구들에게 이야기했다. 안남의 퉁소, 항주의 스무 해, 섬에서 맞은 새벽.',
          '버드나무 아래에서 최척이 다시 퉁소를 불었다. 이번에는 아무도 떠나지 않았다.',
        ],
      },
      {
        id: 'n-end-weary', type: 'say', when: endIs('weary'), fx: { set: { ending: 'weary' } }, scene: 'sc_ending_weary', title: '회복의 시간',
        lines: [
          '옥영은 한동안 자리에서 일어나지 못했다. 바다가 몸에 남긴 것이 많았다.',
          '식구들이 번갈아 약을 달이고 죽을 쑤었다. 몽석은 어머니 곁에서 잠들곤 했다.',
          '몸은 천천히 돌아왔다. 처음부터 흐려지지 않았던 눈으로, 옥영은 식구들의 얼굴을 하나씩 다시 마음에 새겼다.',
        ],
      },
      {
        id: 'n-end-strange', type: 'say', when: endIs('strange'), fx: { set: { ending: 'strange' } }, scene: 'sc_ending_strange', title: '다시 쌓는 기억',
        lines: [
          '스물세 해는 짧지 않았다. 몽석의 목소리도, 시아버지의 걸음걸이도 옥영에게는 처음 같았다.',
          '그래서 식구들은 저녁마다 마주 앉아 이야기를 나누었다. 남원의 피란길, 포로수용소, 항주의 집.',
          '기억은 다시 쌓으면 된다. 옥영에게는 그럴 힘이 넉넉히 남아 있었다.',
        ],
      },
      {
        id: 'n-end-barely', type: 'say', when: endIs('barely'), fx: { set: { ending: 'barely' } }, scene: 'sc_ending_barely', title: '살아 돌아온 것만으로',
        lines: [
          '옥영에게 남은 것은 거의 없었다. 힘도, 챙겨 온 물건도.',
          '그래도 식구들은 아무것도 묻지 않았다. 살아 돌아온 것만으로 넉넉했다.',
          { who: 'simssi', t: '살아 왔으니 됐다. 그거면 됐다.' },
        ],
      },
      // ⑦ 원작의 결말 → 「김영철전」 → 결과(T10이 등록하는 단계 종류)
      { id: 'n-orig-ending', type: 'origEnding' },
      { id: 'n-kimyc', type: 'kimyc' },
      { id: 'n-result', type: 'result' },
    ],
    scenes: {
      sc_suncheon_landing: { caption: '순천 포구에 내리다', prompt_hint: 'A Joseon trading ship moored at a small Korean harbor (Suncheon) in April; Okyoung in a white hanbok stepping onto the pier with her son and daughter-in-law, spring hills behind, gouache picture-book style' },
      sc_namwon_geumgyo: { caption: '금교에서 바라본 남원', prompt_hint: 'View from a small stone bridge over a stream toward a Korean walled town (Namwon) and thatched village, Okyoung pointing with tears, son and daughter-in-law beside her, gouache picture-book style' },
      sc_namwon_willow: { caption: '버드나무 아래', prompt_hint: 'Outside an old tile-roofed Korean house gate, a grey-haired man (Choe Cheok) sitting under a large willow tree facing a guest; a travel-worn woman approaching on the road, soft spring light, gouache picture-book style' },
      sc_namwon_family: { caption: '스물세 해 만의 식구', prompt_hint: 'A Korean courtyard reunion: a mother embracing her grown son, an old father with a cane, the husband smiling through tears, warm afternoon light, gouache picture-book style' },
      sc_namwon_jin: { caption: '진위경과 홍도', prompt_hint: 'A middle-aged Chinese man (Jin Wigyeong) meeting his grown daughter Hongdo for the first time in a Korean courtyard, both in tears, neighbors watching over the fence, gouache picture-book style' },
      sc_ending_whole: { caption: '남원의 봄', prompt_hint: 'Three generations of a family under a blossoming willow in a Korean village in spring, the husband playing a bamboo flute (tongso), everyone smiling, gouache picture-book style' },
      sc_ending_weary: { caption: '회복의 시간', prompt_hint: 'A tired woman resting on a floor mat by an open paper window while family members bring medicine and porridge, gentle morning light, tender, gouache picture-book style' },
      sc_ending_strange: { caption: '다시 쌓는 기억', prompt_hint: 'A family sitting together around a low table at night by lamplight, telling stories, a woman listening intently to her grown son, gouache picture-book style' },
      sc_ending_barely: { caption: '살아 돌아온 것만으로', prompt_hint: 'An elderly mother holding her daughter\'s hands on a Korean veranda, the family gathered quietly around, warm and humble, gouache picture-book style' },
    },
  };
})();
