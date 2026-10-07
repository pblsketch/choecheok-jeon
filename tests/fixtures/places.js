'use strict';
// 규칙 점검용 거점 자료(tests/rules.mjs가 쓴다). 실제 거점 파일(js/data/places/*)은 내용 작업이 채운다.
//  짜임은 계획된 1막·2막과 같게 둔다: 남원(조각 1 자동, 피란 딜레마, 역사 카드 둘) → 낭고야(고정 장육불 꿈 연+1,
//  역사 카드 둘, 소식 딜레마(지혜: 돈우 카드), 일본말 탐색, 장삿배 딜레마) → 안남(역사 카드, 조각 4, 시구 맞추기)
//  → 막간 → 항주(기다림/떠남, 준비하기/서두르기, 배와 양식 +2) → 바다(항로, 해적, 섬, 조선 배) → 남원 재회
window.PLACES = window.PLACES || {};

PLACES.prologue = {
  name: '서막(점검)', act: 1,
  steps: [{ id: 's-night', type: 'say', lines: ['남원성에 불길이 치솟았다.'] }],
};

PLACES.namwon = {
  name: '남원(점검)', act: 1,
  steps: [
    { id: 's-tongso', type: 'frag', n: 1, text: '王子吹簫月欲低', lines: ['퉁소 소리가 달빛 아래 흘렀다.'] },
    { id: 's-war', type: 'card', history: 'h-namwon-war', card: { title: '정유재란과 남원성 함락', body: '1597년 남원성이 함락되었다.' } },
    { id: 's-ming', type: 'card', history: 'h-namwon-ming', card: { title: '명군 장수와 조선', body: '명나라 군대가 조선에 왔다.' } },
    {
      id: 's-flee', type: 'dilemma', dilemma: 'd-namwon-flee',
      prompt: ['불길이 가까워진다. 무엇을 들고 도망칠까?'],
      options: [
        { id: 'sinpyo', type: 'yeon', label: '신표를 챙긴다', fx: { frag: { 2: '碧天如海露凄凄' }, token: { id: 'sinpyo', name: '신표' } } },
        { id: 'food', type: 'saeng', label: '양식을 챙긴다' },
      ],
      orig: null,
      card: { title: '피란길', summary: '옥영은 남복을 입고 시어머니와 함께 피란했다.', quote: { 원문: '陟令玉英着男服', 풀이: '최척이 옥영에게 남자 옷을 입게 했다.' } },
    },
  ],
};

PLACES.nanggoya = {
  name: '낭고야(점검)', act: 1,
  steps: [
    { id: 's-dream', type: 'dream', fixed: true, gauge: { yeon: 1 }, lines: ['꿈에 장육불이 나타났다.'] },
    { id: 's-captives', type: 'card', history: 'h-nanggoya-captives', card: { title: '끌려간 조선인 포로', body: '많은 조선 사람이 일본으로 끌려갔다.' } },
    { id: 's-donwoo', type: 'card', history: 'h-nanggoya-donwoo', card: { title: '돈우와 불교', body: '돈우는 살생을 꺼렸다.' } },
    {
      id: 's-news', type: 'dilemma', dilemma: 'd-nanggoya-news',
      prompt: ['조선 소식을 물을 것인가?'],
      options: [
        { id: 'ask', type: 'yeon', label: '직접 묻는다', fx: { frag: { 3: '會須共御靑鸞去' } } },
        { id: 'silent', type: 'saeng', label: '입을 다문다' },
        { id: 'wisdom', type: 'wisdom', label: '돈우를 통해 에둘러 묻는다', need: 'h-nanggoya-donwoo', fx: { frag: { 3: '會須共御靑鸞去' } } },
      ],
      orig: null,
      card: { title: '포로살이', summary: '옥영은 남자로 꾸며 돈우의 집에서 지냈다.', quote: { 원문: '頓于憐之', 풀이: '돈우가 그를 가엾게 여겼다.' } },
    },
    { id: 's-japanese', type: 'know', know: 'k-japanese', lines: ['포구 사람들의 말을 귀에 익혔다.'] },
    {
      id: 's-ship', type: 'dilemma', dilemma: 'd-nanggoya-ship',
      prompt: ['돈우의 장삿배에 오를 것인가?'],
      options: [
        { id: 'board', type: 'yeon', label: '배에 오른다' },
        { id: 'stay', type: 'saeng', label: '남는다' },
      ],
      orig: 'board',
      card: { title: '장삿배', summary: '돈우는 옥영을 데리고 장사하러 다녔다.', quote: { 원문: '每與同舟', 풀이: '늘 같은 배를 탔다.' }, quoteLong: { 원문: '頓于每與同舟 往來商販', 풀이: '돈우는 늘 옥영과 한 배를 타고 오가며 장사했다.' }, extraGloss: '장삿배는 물건을 사고팔러 다니는 배예요.' },
    },
  ],
};

PLACES.annam = {
  name: '안남(점검)', act: 1,
  steps: [
    { id: 's-trade', type: 'card', history: 'h-annam-trade', card: { title: '교역선', body: '여러 나라 배가 모였다.' } },
    { id: 's-frag4', type: 'frag', n: 4, text: '蓬島煙霞路不迷' },
    { id: 's-poem', type: 'poem' },
  ],
};

PLACES.interlude = {
  name: '막간(점검)', act: 2,
  steps: [{ id: 's-years', type: 'say', lines: ['항주에서 몇 해가 흘렀다.'] }],
};

PLACES.hangzhou = {
  name: '항주(점검)', act: 2,
  steps: [
    {
      id: 's-wait', type: 'dilemma', dilemma: 'd-hangzhou-wait',
      prompt: ['기다릴 것인가, 떠날 것인가?'],
      options: [{ id: 'wait', type: 'saeng', label: '기다린다' }, { id: 'leave', type: 'yeon', label: '떠난다' }],
      orig: 'leave',
      card: { title: '떠남', summary: '옥영은 조선으로 떠나기로 한다.', quote: { 원문: '吾當歸', 풀이: '나는 돌아가야겠다.' } },
    },
    {
      id: 's-prep', type: 'dilemma', dilemma: 'd-hangzhou-prep',
      prompt: ['두 나라 옷과 말을 준비할까?'],
      options: [{ id: 'prep', type: 'wisdom', label: '준비한다', need: 'k-japanese' }, { id: 'rush', type: 'none', label: '준비 없이 서두른다' }],
      orig: 'prep',
      card: { title: '준비', summary: '옥영은 조선 옷과 일본 옷을 마련했다.', quote: { 원문: '備朝鮮倭國衣服', 풀이: '조선과 왜국의 옷을 갖추었다.' } },
    },
    { id: 's-boat', type: 'gauge', fixed: true, gauge: { saeng: 2 }, lines: ['배를 빌리고 양식을 찧었다.'] },
  ],
};

PLACES.sea = {
  name: '바다(점검)', act: 2,
  steps: [
    {
      id: 's-route', type: 'dilemma', dilemma: 'd-sea-route',
      prompt: ['어느 길로 갈까?'],
      options: [{ id: 'coast', type: 'none', label: '연안길', gauge: { saeng: -1 } }, { id: 'sea', type: 'none', label: '바다길', gauge: { saeng: -2, yeon: 1 }, when: { min: { saeng: 6 } } }],
      orig: null, origNearest: 'sea',
      card: { title: '항로', summary: '원작의 옥영은 곧장 바다를 건넜다.' },
    },
    { id: 's-pirates', type: 'gauge', fixed: true, gauge: { saeng: -2 }, lines: ['해적이 배를 빼앗았다.'] },
    {
      id: 's-island', type: 'dilemma', dilemma: 'd-island-signal',
      prompt: ['남은 것을 어떻게 쓸까?'],
      options: [{ id: 'signal', type: 'yeon', label: '신호불을 피운다' }, { id: 'endure', type: 'saeng', label: '아끼며 버틴다' }],
      orig: null,
      card: { title: '섬', summary: '옥영은 섬에 버려졌다.' },
    },
    { id: 's-korea-prep', type: 'gauge', fixed: true, when: { prep: true }, gauge: { yeon: 1 } },
    { id: 's-korea-late', type: 'gauge', fixed: true, when: { prep: false }, gauge: { saeng: -1 } },
  ],
};

PLACES.namwon_final = {
  name: '남원 재회(점검)', act: 2,
  steps: [{ id: 's-home', type: 'say', lines: ['버드나무 아래 최척이 서 있었다.'] }],
};
