'use strict';
// 공통 글과 규칙 조정값(선생님이 고쳐도 되는 파일)
//  - RULES: 게이지 규칙의 숫자. 실제로 해 본 뒤 고칠 수 있다. 단 두 원칙은 지킨다(spec §4-2·§4-6).
//      ① 지혜의 길 폭(연 +1·생 +1)은 다른 두 길(±2)보다 작다
//      ② 원작대로(떠남·준비) 걸으면 항로를 고를 때 생이 6 이상이다: 5(막간) − 2(떠남) + 1(준비) + 2(배와 양식) = 6
//  - 나머지: 장육불 꿈, 꿈을 떠올리는 글, 안남 예외 글, 원작 대조 카드 틀, 잠긴 지혜의 길 실마리, 생 0 안내, 표기 체계 이름·색
window.TEXTS = window.TEXTS || {};

TEXTS.RULES = {
  min: 0, max: 10,                 // 게이지는 0~10 정수
  start: { yeon: 5, saeng: 5 },    // 시작값('출발')
  // 선택지 세 갈래(+ 변동 없음). 딜레마 선택지의 type이 이 표의 이름이다
  choice: {
    yeon: { yeon: 2, saeng: -2 },  // 연을 지키는 길
    saeng: { yeon: -2, saeng: 2 }, // 살아남는 길
    wisdom: { yeon: 1, saeng: 1 }, // 지혜의 길(지식이 있어야 열리고, 거점마다 한 번)
    none: {},                      // 변동 없음(예: 준비 없이 서두르기)
  },
  collapseSaeng: 3,                // 쓰러진 뒤(장육불 꿈) 생
  interlude: { place: 'interlude', saeng: 5 }, // 막간에 들어서면 생을 이 값으로(연은 그대로)
  high: 6,                         // 결말: 이 값 이상이면 '높음'
  gropeCost: 1,                    // 안남 시구 맞추기 '더듬어 찾기' 한 번에 드는 생(poem 단계에 gropeCost를 적으면 그것이 먼저)
  countCap: 7,                     // 화면에 보이는 횟수의 끝: 8 이상은 '7+'로 보인다(이어 하기 글자에는 더듬기 0~10·고친 횟수 0~8을 그대로 담는다)
  act1: ['prologue', 'namwon', 'nanggoya', 'annam'],
  act2: ['interlude', 'hangzhou', 'sea', 'namwon_final'],
  // 거점 기록(결과 그래프): 시작값 '출발' + 이 거점들을 떠날 때의 연·생
  startLabel: '출발',
  trail: [
    { place: 'namwon', label: '남원' },
    { place: 'nanggoya', label: '낭고야' },
    { place: 'annam', label: '안남' },
    { place: 'hangzhou', label: '항주' },
    { place: 'sea', label: '바다' },
    { place: 'namwon_final', label: '남원 재회' },
  ],
  noAct1: '1막 기록 없음',
  // 고르면 저장 칸을 함께 채우는 딜레마(거점 파일이 선택지에 set을 적지 않아도 된다)
  prepDilemma: 'd-hangzhou-prep',  // 지혜의 길을 고르면 prep = true
  routeDilemma: 'd-sea-route',     // 고른 선택지 id(coast|sea)가 route
};

// 선택지 갈래 이름(선택지에 작게 붙는다)
TEXTS.PATH = { yeon: '연의 길', saeng: '살아남는 길', wisdom: '지혜의 길', none: '' };

// 지식 이름(잠긴 지혜의 길 실마리에 쓴다). 역사 카드 파일(history.js)에 같은 id의 title이 있으면 그것이 먼저다
TEXTS.KNOW = {
  'h-namwon-war': '정유재란과 남원성 함락',
  'h-namwon-ming': '명군 장수와 조선',
  'h-nanggoya-captives': '일본으로 끌려간 조선인 포로',
  'h-nanggoya-donwoo': '돈우와 불교',
  'h-annam-trade': '동아시아 바다의 교역선',
  'h-hangzhou-houjin': '후금의 성장과 명·조선의 출병',
  'h-sea-pirates': '해적과 바닷길',
  'k-japanese': '일본말',
};

// 잠긴 지혜의 길 실마리(한 줄). {what}에는 지식 이름이 들어간다. {what:을}처럼 쓰면 받침에 맞춰 조사를 붙인다
TEXTS.LOCK = {
  need: '「{what}」 이야기를 알면 열려요',
  used: '이 거점에서는 지혜의 길을 이미 걸었어요',
  lost: '쓰러진 뒤라 이 거점의 지혜의 길은 닫혔어요',
  when: '지금은 고를 수 없어요',
  mark: '잠김',
};

// 생 0 안내(쓰러지는 순간 한 줄)
TEXTS.SAENG_ZERO = '생(生)이 다했다. 옥영은 그 자리에 쓰러졌다.';

// 장육불 꿈(쓰러짐의 기본 장면). 거점 파일의 dream 단계에 lines를 적으면 그 글이 앞에 붙는다
TEXTS.DREAM = {
  title: '장육불 꿈',
  scene: null, // 꿈 삽화 id(그림이 생기면 'sc_…'를 적는다)
  lines: [
    '어둠 속에서 금빛이 번졌다. 만복사의 장육불이 꿈에 나타나 옥영을 내려다보았다.',
  ],
  quote: { 원문: '愼無死, 後必有喜', 풀이: '부디 죽지 마라. 뒤에 반드시 기쁜 일이 있으리라.' },
  after: '눈을 떴다. 몸은 무거웠지만, 다시 일어설 힘이 조금 돌아왔다.',
};

// 낭고야에서 고정 꿈을 이미 본 뒤 쓰러졌을 때: 꿈을 다시 보여 주지 않고 떠올린다
TEXTS.RECALL = {
  lines: [
    '흐려지는 정신 속에서 옥영은 그 밤의 꿈을 떠올렸다. "부디 죽지 마라. 뒤에 반드시 기쁜 일이 있으리라."',
    '그 말을 붙들고 옥영은 다시 몸을 일으켰다.',
  ],
};

// 안남 시구 맞추기 도중 생이 0이 되었을 때(장육불 꿈 없음, 생은 0으로 남는다)
TEXTS.ANNAM_EXCEPTION = {
  lines: [
    '더는 기억을 더듬을 힘이 없다. 그때, 퉁소가 한 번 더 울렸다.',
    '가락을 따라 남은 빈 행의 정답이 하나씩 떠오른다.',
  ],
};

// 원작 대조 카드
TEXTS.CARD = {
  origKind: '원작 대조',
  fictionKind: '게임 창작',
  historyKind: '역사 카드',
  notInOriginal: '원작에는 없는 장면입니다. 원작의 옥영이라면 어떻게 했을까요?',
  mine: '내 선택',
  original: '원작의 옥영',
  nearest: '원작에 가까운 쪽',
  saved: '이야기 수첩에 넣어 두었어요',
};

// 이어 하기 글자(js/game/code.js)를 거절할 때
TEXTS.CODE = {
  bad: '글자를 다시 확인해 주세요',
  length: '이어 하기 글자는 6자예요. 글자를 다시 확인해 주세요',
  char: '쓰지 않는 글자가 섞여 있어요(0, O, 1, I는 쓰지 않아요). 글자를 다시 확인해 주세요',
};

// 얻은 것 알림(화면 가운데에 크게)과 이야기 수첩의 '모은 것' 글. 시구 조각 알림은 정답 시(poem.js)의 원문과 풀이를 함께 보인다
//  frag.label의 {n}은 몇 행인지, {all}은 조각 칸 수(4)
TEXTS.GOT = {
  token: { label: '신표를 챙겼다', desc: '이야기 수첩에 넣어 두었어요.', head: '챙긴 신표', empty: '아직 챙긴 신표가 없어요' },
  frag: { label: '시구 조각 {n} / {all}', desc: '이야기 수첩에 적어 두었어요.', head: '얻은 시구 조각', empty: '{n}번째 조각 — 아직 없음' },
  know: { label: '알게 되었다', desc: '지혜의 길을 여는 실마리가 될지도 몰라요.' },
};

// 표기 체계 다섯 구분(spec §6-4)의 이름과 색. notes.js가 NOTES.marks로 바꿀 수 있다
TEXTS.MARKS = {
  원문: { name: '원문', color: '#b3342a' },
  풀이: { name: '풀이', color: '#8a5a2b' },
  '게임 설정': { name: '게임 설정', color: '#1f7474' },
  '이본 노트': { name: '이본 노트', color: '#36548f' },
  해석: { name: '해석', color: '#6b3f8c' },
};
