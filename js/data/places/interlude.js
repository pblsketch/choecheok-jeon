'use strict';
// 막간 — 항주의 몇 해(2막 첫머리, 플레이 없이 삽화 네 장)
//  항주 정착 → 몽선이 태어남(장육불 꿈 "아이 등에도 점이 있으리라") → 홍도의 사연(아버지 진위경) → 몽선과 홍도의 혼인
//  들어서면 규칙이 생(生)을 5로 되돌린다(연은 그대로, js/game/rules.js의 enterPlace). 원문: 「최척전」 ¶13 끝·¶14
//  ※ 홍도의 아버지 진위경이 조선에 싸우러 갔다가 돌아오지 못한 사연은 2막 남원 재회의 복선이다.
window.PLACES = window.PLACES || {};
(function () {
  PLACES.interlude = {
    name: '막간 — 항주의 몇 해', act: 2, node: 'hangzhou', year: '1600~1618',
    avatar: 'sp_okyoung_ming', // 항주에서 명나라 옷을 입고 산 세월(대사 얼굴·HUD 초상이 따른다)
    music: 'hangzhou',
    cover: 'sc_interlude_hangzhou',
    intro: '안남에서 다시 만난 최척과 옥영은 송우를 따라 중국 항주에 자리를 잡았다. 그 뒤로 스무 해 가까운 세월이 흘렀다.',
    steps: [
      // 지난 이야기: 1차시와 2차시 사이가 며칠 떨어져 있으므로 1막 줄거리와 내가 고른 길을 먼저 되짚는다(글: notes.js의 NOTES.recap)
      { id: 'i-recap', type: 'recap', scene: 'sc_act1_end' },
      {
        id: 'i-settle', type: 'say', scene: 'sc_interlude_hangzhou',
        lines: [
          '송우는 집에 돌아오자 방 한 채를 따로 지어 최척 부부를 머물게 했다.',
          '낯선 나라였지만, 두 사람은 다시 한 지붕 아래에서 아침을 맞았다.',
          '그래도 최척은 남원에 두고 온 늙은 아버지와 어린 몽석을 하루도 잊지 못했다.',
          '전란이 지나간 뒤의 고요한 몇 해. 옥영의 몸과 마음도 조금씩 추슬러졌다. 살아갈 힘(生)이 다시 차올랐다.',
        ],
      },
      {
        id: 'i-mongseon', type: 'say', scene: 'sc_interlude_mongseon',
        lines: [
          '한 해가 지나 옥영은 아들을 또 낳았다. 아이가 태어나기 전날 밤, 만복사의 장육불이 다시 꿈에 나타났다.',
          { wonmun: { 원문: '丈六佛又見于夢曰: “兒生亦有背痣.”', 풀이: '장육불이 또 꿈에 나타나 일렀다. "아이가 태어나면 그 등에도 점이 있으리라."' } },
          '갓난아이의 등에는 정말로 몽석처럼 붉은 점이 있었다. 부부는 몽석이 다시 온 것인가 하여 아이 이름을 몽선이라 지었다.',
          { when: { mode: 'deep' }, wonmun: { 원문: '夫妻或以爲夢釋再來, 遂名之曰‘夢仙’.', 풀이: '부부는 혹시 몽석이 다시 온 것인가 여겨, 마침내 이름을 몽선이라 지었다.' } },
        ],
      },
      {
        id: 'i-hongdo', type: 'say', scene: 'sc_interlude_hongdo',
        lines: [
          '몽선이 자라자 부부는 어진 며느리를 찾았다. 이웃 진씨 집에 홍도라는 딸이 있었다.',
          '홍도가 돌도 되기 전에, 아버지 진위경은 명나라 군대를 따라 조선으로 싸우러 갔다. 그리고 돌아오지 않았다.',
          '어머니마저 일찍 세상을 떠나, 홍도는 이모 집에서 자랐다. 아버지 얼굴조차 모른다는 것이 늘 가슴에 걸렸다.',
          { who: 'hongdo', t: '아버지가 돌아가신 나라에 한 번이라도 가서, 울기라도 하고 오고 싶어요.' },
          { who: 'hongdo', t: '최씨 집 며느리가 되면, 언젠가 동쪽 나라에 가 볼 수 있지 않을까요.' },
          { when: { mode: 'deep' }, wonmun: { 원문: '願得爲崔家婦, 而冀一至於東國也.', 풀이: '최씨 집 며느리가 되어, 언젠가 한 번 동쪽 나라에 가 보기를 바랍니다.' } },
        ],
      },
      {
        id: 'i-wedding', type: 'say', scene: 'sc_interlude_wedding',
        lines: [
          '홍도의 이모가 그 뜻을 전하자 최척과 옥영은 감탄했다.',
          { who: 'okyoung', t: '여자의 몸으로 그런 뜻을 품다니, 참 갸륵하구나.' },
          '그렇게 홍도는 몽선의 아내가 되었다. 조선에서 온 부부, 중국에서 나고 자란 아들, 조선 땅에 아버지를 묻은 며느리. 한 식구였다.',
          '그리고 기미년(1619), 북쪽에서 전쟁 소식이 들려왔다.',
        ],
        next: '항주로 ▶',
      },
    ],
    scenes: {
      // 지난 이야기(i-recap)의 바탕: 1차시 끝 그림을 다시 쓴다(새로 그리지 않음)
      sc_act1_end: { caption: '새벽 안남 포구, 나란히 선 두 척의 배', prompt_hint: 'Dawn at an Annam harbor: a Chinese junk and a Japanese trade ship moored side by side on calm water, soft mist' },
      sc_interlude_hangzhou: { caption: '항주, 송우가 내어 준 집', prompt_hint: 'A modest Ming-era house beside a willow-lined canal in Hangzhou, a Korean couple (Choe Cheok and Okyoung in Ming clothes) greeting the morning together in the courtyard, spring light, gouache picture-book style' },
      sc_interlude_mongseon: { caption: '몽선이 태어나던 밤', prompt_hint: 'Night interior: Okyoung sleeping, a soft golden standing Buddha figure appearing in her dream above her, warm lantern glow, gentle and serene, gouache picture-book style' },
      sc_interlude_hongdo: { caption: '아버지 얼굴을 모르는 홍도', prompt_hint: 'A young Chinese woman (Hongdo) standing at a window looking east over misty water at dusk, holding a small peach, quiet longing, gouache picture-book style' },
      sc_interlude_wedding: { caption: '몽선과 홍도의 혼인', prompt_hint: 'A small, warm Ming-style wedding in a courtyard: young man Mongseon and bride Hongdo bowing, Okyoung and Choe Cheok smiling beside them, red lanterns, gouache picture-book style' },
    },
  };
})();
