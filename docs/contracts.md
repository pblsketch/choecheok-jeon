# 바깥과의 약속

이 게임을 쓰는 쪽(학생·선생님·게임을 올리는 곳·글을 고치는 선생님)이 기댈 수 있는 약속이다. 서버 API는 없다. 바깥 접점은 주소 옵션, 이어 하기 글자, 결과 이미지, 브라우저 저장 칸, 그리고 `js/data/` 자료 파일의 꼴이다.

## 공통

- 진입점은 `index.html` 하나다. 어느 주소(도메인 뿌리·하위 폴더)에 올려도, `file://`로 열어도 같다. 모든 내부 경로는 상대 경로다.
- 가로 화면에서만 논다. 세로 화면이면 "가로로 돌려 주세요" 안내만 보이고 게임은 멈춘다(돌리면 이어진다).
- 실패는 화면 안에서 처리한다. 등록되지 않은 단계·비어 있는 거점·없는 걸이는 '준비 중' 판, 없는 그림은 빈 종이 판, 없는 소리는 합성음 또는 무음으로 지나간다. 오류로 멈추는 화면은 약속 위반이다.

## 주소 옵션

`main.js`가 시작할 때 읽는다. 여럿을 함께 줄 수 있다(`?teacher=1&act=2`).

| 옵션 | 입력 | 하는 일 | 끝난 뒤 상태 | 오류·예외 |
|---|---|---|---|---|
| `?teacher=1` | 값이 정확히 `1` | 선생님용을 켠다: 게이지 숫자, 장면·목표 건너뛰기, 시구 '정답 보기', 수첩 카드 모두 열기와 '⚠ 검수' 거리 | 저장의 `teacher: true`로 **남는다**. 끄려면 설정에서 끈다. 주소에서 빼도 꺼지지 않는다 | 다른 값(`0` 등)은 아무 일도 하지 않는다(켜진 것을 끄지도 않음) |
| `?act=2` | 값이 정확히 `2` | 2막(막간)부터: 연 5·생 5, 지식·조각·신표 없이. 1막 기록은 '1막 기록 없음' | 진행과 **이름을 확인 없이 지운다**(설정은 남김). 단, 이 옵션으로 시작한 2막을 하던 중이면(아직 끝나지 않음) 지우지 않고 잇는다 | 이미 1막을 한 학생에게 주면 그 진행이 사라진다. 학생의 2차시는 '이어 하기'나 이어 하기 글자로 한다 |
| `?place=<거점 id>` | `FLOW.order`에 있는 id | 타이틀을 건너뛰고 그 거점을 **지금 저장 그대로** 펼친다(만들면서 확인할 때) | 저장을 지우지 않는다. 그 거점에 들어선 기록이 남는다 | 목록에 없는 id는 무시하고 다음 옵션·타이틀로 |

- 판단 차례: `teacher`를 먼저 반영하고, 바로가기는 `place` → `act` 차례로 본다. `place`가 맞으면 `act`는 보지 않는다.
- 새 바로가기는 `G.boot.routes.push((query, state) => { …; return true; })`로 더한다. `true`를 돌려준 것이 화면을 맡고 타이틀은 뜨지 않는다.

## 이어 하기 글자

1차시 끝 상태를 서버 없이 다른 브라우저로 옮기는 글자다.

- **꼴**: 6자. 글자판 32자 `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`(헷갈리는 0·O·1·I·l 없음). 화면에는 `ABC-DEF`처럼 셋씩 끊어 보인다.
- **입력**: 대소문자를 가리지 않는다. 띄어쓰기와 `-`, `–`, `—`, `_`, `.`, `·`는 무시한다. 입력칸은 14자까지 받는다.
- **받는 곳**: 1막 끝 '1차시는 여기까지' 화면(그리고 받은 뒤에는 이야기 수첩). **넣는 곳**: 타이틀 '이어 하기 글자 넣기'.
- **결과**: 그 학생의 1막 끝 상태가 되살아나고 막간부터 잇는다. 되살아나는 것: 방식, 연·생, 1막 딜레마 셋의 선택, 시구 조각, 신표, 1막 지식(역사 카드 다섯·일본말), 장육불 횟수, 낭고야 꿈 기록, 지혜의 길 기록, 시구 맞추기 기록(놓았던 함정·고친 횟수·더듬어 찾기), 거점 기록(출발·남원·낭고야·안남), 수첩 카드, 1막 완료.
- **되살아나지 않는 것**: 2막 진행(2막 도중의 글자는 없다), 이름(이 브라우저에 적힌 이름이 있으면 그대로 둔다), 방식 외의 설정(이 브라우저의 것).
- **오류**(글자를 받아들이지 않고 입력칸을 흔든다):

| 경우 | 알림 |
|---|---|
| 6자가 아님 | "이어 하기 글자는 6자예요. 글자를 다시 확인해 주세요" |
| 글자판에 없는 글자 | "쓰지 않는 글자가 섞여 있어요(0, O, 1, I는 쓰지 않아요). 글자를 다시 확인해 주세요" |
| 검사가 맞지 않음(오타) | "글자를 다시 확인해 주세요" |

- 어느 한 글자를 바꾼 글자는 반드시 거절된다. 이 브라우저에 이미 진행 기록이 있으면 덮어쓸지 한 번 묻고, '그만두기'면 아무것도 바꾸지 않는다.
- **호환 약속**: 한 번 나누어 준 글자는 게임을 고친 뒤에도 같은 1막 끝 상태로 되살아나야 한다. 1막 딜레마의 선택지 수·차례, 부호표, 1막 단계 차례가 이 약속에 묶여 있다.

## 결과 이미지

- 결과 화면의 '이미지로 저장'을 누르면 그 기기에 PNG 한 장이 내려받아진다. 서버로 보내지 않는다.
- 파일 이름: `두개의항로_<이름>.png`. 이름 속 공백과 `\ / : * ? " < > |`는 `_`로 바뀌고, 이름이 비어 있으면 `두개의항로_결과.png`.
- 크기: 가로 1600px, 세로는 내용에 따라(약 1650px).
- 담기는 것: 제목과 낙관, 이름(반·번호), 날짜, 연·생 그래프(내 기록 + '해석' 표시가 붙은 원작 궤적, 원작에 없는 구간 점선), 내 결말과 원작 결말 한 줄, 장육불 꿈 횟수, 선택 비교표, 시구 맞추기 기록. 8 이상인 횟수는 '7+'.
- 저장이 안 되는 기기: "이 기기에서는 저장이 안 돼요. 화면을 캡처해 주세요." 알림과 함께 화면의 기기별 캡처 단축키 안내를 따른다.
- 그림 파일을 쓰지 않고 그려서 `file://`에서도 저장된다.

## 브라우저 저장 칸

- 열쇠: `localStorage['choecheok-jeon-v1']`, 값은 JSON 하나. 이 브라우저(같은 출처)에만 있다.
- 불러올 때 처음 값 위에 덮으므로, 새 칸이 생겨도 옛 저장은 그대로 열린다. 저장소를 쓸 수 없는 환경(사생활 모드 제한 등)에서는 오류 없이 저장 없이 진행한다.
- 주요 칸: 설정 `mode`(`basic`|`deep`)·`font`(1|1.15|1.3)·`sound`·`music`·`teacher`, 학생 `name`, 게이지 `yeon`·`saeng`, `tokens`·`frags`, 진행 `place`·`done`(`p:거점`·`b:거점:목표`·`s:거점:단계`)·`flags`·`snap`, 규칙 `choices`·`know`·`wisdomUsed`·`jangyuk`·`dreamSeen`·`puzzle{traps,fixes,groped}`·`trail`·`route`(`coast`|`sea`)·`prep`·`ending`·`act1Done`·`act2Only`·`cards`·`applied`·`entered`, 끝부분 `resumeCode`·`kimyc`, 시각 `startedAt`·`finishedAt`.
- 설정(`mode`·`font`·`sound`·`music`·`teacher`)은 '처음부터'에도 남는다.

## 자료 파일을 고치는 선생님을 위한 약속

`js/data/`의 파일은 코드 없이 글을 고치도록 나누어 두었다. 고친 뒤에는 `python tools/build_fonts.py`(새 글자)와 `cd tests && node content.mjs`(꼴·참조·납품 조건)를 돌린다.

### 마음대로 고쳐도 되는 것
- 따옴표 안의 글: 대사 `t`, 서술 줄, `title`·`summary`·`body`·`desc`·`label`·`reply`·`caption`, 카드의 `풀이`·`ko`, 역사 카드 본문, 결말 이름과 후일담, 디브리핑 질문, 안내 글.
- 글 속 자리: `{학생}`(적은 이름), `{신표}`(1막에서 챙긴 신표 이름). `{학생:이}`처럼 쓰면 받침에 맞춰 조사가 붙는다(이/가, 은/는, 을/를, 과/와, 으로/로, 아/야, 이여/여, 이라/라). `**굵게**`, 줄바꿈 `\n`.

### 조심해서 고칠 것
- **원문**(`원문`·`han`): 공유 저작물 판본의 글자 그대로만. 지어 넣지 않는다. 원문은 늘 `풀이`와 짝.
- **숫자**: `js/data/texts.js`의 `TEXTS.RULES`(선택지 폭, 쓰러진 뒤 생 3, 막간 생 5, 결말 기준 6, 더듬기 값 1, 보이는 횟수 끝 7), `js/data/places/sea.js` 맨 위 `TUNE`(연안길·바다길·바다길 문턱·해적·조선 배), `js/data/poem.js`의 `hear`·`pool.count`·`clarity`. 두 원칙(지혜의 길 폭이 가장 작음, 원작대로 걸으면 뱃길 앞 생 6 이상)을 지키고 `node content.mjs && node original.mjs`로 확인한다.
- **id**(거점·목표·단계·딜레마·선택지·지식·장면·인물): 바꾸지 않는다. 진행 중인 저장과 이어 하기 글자, 그림 목록이 id로 묶여 있다.
- **1막 거점 파일의 단계 차례와 1막 딜레마의 선택지 수·차례**: 바꾸지 않는다(이어 하기 글자).
- **고치지 않는 파일·구역**: `js/data/sprites.js` 전체, `js/data/people.js`의 `ART:BEGIN`~`ART:END`(도구가 다시 씀).

### 거점 자료의 꼴(`PLACES[id]`)

```js
PLACES.namwon = {
  name, act: 1|2, node: '고지도 거점', mission?, intro?, cover?: 'sc_…', music?: '곡 이름',
  map?: '첫 맵 id', spawn?: [x, y, 'down'|'left'|'right'|'up'], avatar?: 'sp_…' | (state) => 'sp_…', travel?: false,
  maps: { 맵id: { name, theme: 'village'|'port'|'harbor_night'|'garden'|'island', night?, music?, spawn,
                 grid: G.world.mk(가로, 세로, '바탕 글자', [['rect'|'frame'|'dots'|'border', …]]),
                 props: [['pr_…', x, y, { flat?, w?, h? }]], lights?: [[x, y, 반지름px]],
                 spots: { id: { x, y, w, h, name, act?, look?: [줄…] } }, npcs? } },
  cast: { 맵id: { id: { who: '인물 id' | sp+name, x, y, dir, talk?: [[줄…], [줄…]], wander? } } },
  beats: [ { id, goal: '지금 할 일', talk: '사람 id' | go: '자리 id' | at: '자리 id' | auto: true,
             steps: ['단계 id', …], map?, spawn?, avatar?, inline?, when?, say?: [줄…], show?, hide?, then?, music? } ],
  steps: [ 단계, … ],                       // 노는 차례 그대로
  scenes: { sc_id: { caption, prompt_hint } },  // 삽화 설명(그림 안에 글자 없음)
};
```

- 맵이 없는 거점(서막·막간)은 `beats` 없이 `steps`를 차례로 펼친다.
- 사람의 `talk`는 말을 걸 때마다 다음 묶음으로 넘어가고, 끝까지 가면 첫 묶음으로 돌아간다(몇 번째인지는 저장하지 않으므로 다시 열면 첫 묶음부터). 말 속 `{ learnStep: '단계 id' }`는 그 거점의 `card`·`know` 단계를 그 자리에서 한 번만 반영한다(역사 카드를 '읽을지 말지' 고르게 하는 장치).

### 단계 종류

| 종류 | 꼴 | 하는 일 |
|---|---|---|
| `say` | `{ id, type:'say', scene?, title?, lines:[줄…], next? }` | 줄을 하나씩 넘긴다 |
| `choice` | `{ id, type:'choice', q, options:[{ t, d?, when?, reply?, …fx }] }` | 게이지 규칙 없는 고르기 |
| `dilemma` | `{ id, type:'dilemma', dilemma:'d-…', scene?, prompt:[줄…], q?, hint?, options:[{ id, type:'yeon'|'saeng'|'wisdom'|'none', label, desc?, need?:'지식 id', lockHint?, when?, gauge?, fx?:{ frag, token, know, set }, reply? }], orig:'선택지 id'|null, origNearest?, card:{ title, summary, quote:{원문,풀이}, quoteLong?, extraGloss?, variant?, interp?, src? } }` | 세 갈래 선택, 게이지, 원작 대조 카드 |
| `gauge` | `{ id, type:'gauge', fixed?:true, gauge:{ yeon?, saeng? }, when?, lines? }` | 게이지 변동(`fixed`면 원작 궤적에도) |
| `dream` | `{ id, type:'dream', fixed?, gauge?, lines?, quote? }` | 장육불 꿈 장면(쓰러짐 횟수는 세지 않음) |
| `know` | `{ id, type:'know', know:'id', lines? }` | 지식 얻기 |
| `frag` | `{ id, type:'frag', n:1~4, text:'원문 행', lines? }` | 시구 조각 얻기 |
| `card` | `{ id, type:'card', history?:'h-…', card?:{ id?, kind?, kindLabel?, title, body, quote?, src? }, lines? }` | 카드 띄우기 + 수첩. `history`면 지식이 되고 `history.js`의 같은 id 카드가 먼저 |
| `tongso` | `{ id, type:'tongso', sound:1|2|3, scene?, lines?, stray?, heard? }` | 안남 퉁소 알아듣기 |
| `poem` | `{ id, type:'poem', scene?, gropeCost? }` | 안남 시구 순서 맞추기 |
| `route` | `{ id, type:'route', for:'딜레마 단계 id', from, title, note }` | 고지도에서 뱃길 고르기 → 다음 딜레마에 넘김 |
| `stars` | `{ id, type:'stars', intro?, dipper, pole, helm, done? }` | 별과 지남철로 뱃길 잡기(실패 없음) |
| `act1End` · `origEnding` · `kimyc` · `result` | `{ id, type }` | 1차시 끝 · 원작 결말 · 「김영철전」 · 결과 화면 |

### 줄의 꼴

- `'서술'` · `{ who:'인물 id', t:'말', sp? }` · `{ card:{ kind:'orig'|'history'|'fiction'|'interp'|'note', title, han?, ko?, body?, real?, src? } }` · `{ wonmun:{ 원문, 풀이 } }` · `{ scene:'sc_…' }` · `{ fx:{…} }` · `{ when:{…}, … }` · `{ learnStep:'단계 id' }`.
- 조건 `when`: `mode:'basic'|'deep'`, `teacher`, `flag:{…}`, `done:'열쇠'`, `min:{ yeon|saeng: n }`, `max:{…}`, `token:'id'`, `know:'id'|[…]`, `prep:true|false`, `route:'coast'|'sea'`, `act1Done`, `not:{…}`, `any:[…]`, 또는 `(state) => true|false`.
- 효과 `fx`: `set:{…}`, `flags:{…}`, `gauge:{ yeon, saeng }`, `token:{ id, name, desc }`, `frag:{ n: '원문 행' }`, `know:'id'|[…]`, `tongsoSound:{ clarity, pan }|false`.
- 표기 구분은 `원문`·`풀이`·`게임 설정`·`이본 노트`·`해석` 다섯뿐이다.
