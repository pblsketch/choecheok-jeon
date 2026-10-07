# 시스템 구성

정적 파일 묶음 하나다. 서버·빌드·패키지 설치 없이 브라우저가 `index.html`을 열면 `<script>` 태그 차례대로 순수 JavaScript를 싣고, 모든 상태는 그 브라우저의 localStorage 한 칸에 둔다. 게임 밖에는 오프라인 도구(`tools/`, 그림·소리·글꼴을 만들어 저장소에 넣음)와 자동 점검(`tests/`, Node + 설치된 크롬)이 있다.

## 구성 요소와 의존 방향

```
index.html ──(script 차례)──▶ js/core ─▶ js/game ─▶ js/data ─▶ js/data/places ─▶ js/main.js
                                  ▲            ▲           │
                                  └────────────┴── 전역 자료(FLOW·PLACES·TEXTS…)를 실행 중에 읽음
assets/  ◀── 상대 경로로 GET(그림 webp/png, 배경음 mp3, 글꼴 woff2)
localStorage['choecheok-jeon-v1'] ◀──▶ js/core/save.js(유일한 읽기·쓰기 자리)

tools/ ──(사람이 돌림)──▶ assets/*, js/data의 생성 구역, credits/*.tsv
tests/ ──(serve.mjs로 서빙 또는 file://)──▶ index.html을 크롬으로 몰고, Node vm으로 js를 직접 실음
```

| 구성 요소 | 역할 | 기대는 것 |
|---|---|---|
| `js/core/` (util·save·audio·ui·hud·oldmap) | 엔진 바닥: DOM 생성기·조사 맞추기·그림 목록 조회(`G.util`), 저장(`G.save`), 소리(배경음 파일/합성, 퉁소 층, 효과음), 판·토스트·카드·트레이(`G.ui`), 구석 HUD(`G.hud`), 그림 고지도(`G.oldmap`) | 브라우저 API만. 데이터 전역은 그릴 때 읽기만 |
| `js/game/` | 게임 엔진: 단계 실행기(`G.steps`), 게임 규칙(`G.rules`), 이어 하기 글자(`G.code`), 타일·탑다운 맵(`G.tiles`·`G.world`), 화면 흐름(`G.app`), 안남 퉁소·시구(`G.poem`), 뱃길·별(`sea.js`), 수첩·출처(`notebook.js`), 끝부분·결과(`result.js`) | `js/core`, 실행 중에 `js/data`의 전역 |
| `js/data/` | 글·숫자·표(흐름 `FLOW`·고지도 `OLDMAP`, 인물 `PEOPLE`과 그림 목록 `ART`, `SPRITES`, `BGM`, 규칙 숫자와 공통 글 `TEXTS`, `POEM`, `HISTORY`, `ORIGINAL`, `KIMYC`, `NOTES`, `CREDITS`) | 엔진의 등록 함수(맵 격자 `G.world.mk` 등)를 실릴 때 부름 |
| `js/data/places/` | 거점 여덟(`PLACES[id]` = 맵·사람·목표·단계·삽화) | `G.world.mk`·`blobGrid`, `G.steps` 확장점 |
| `js/main.js` | 시작: 저장 불러오기 → `?teacher=1` 반영 → 규칙을 거점 이동에 걸기 → 주소 바로가기(`G.boot.routes`) → 타이틀 | 위 전부 |
| `css/` | 화면 모양(`style.css` 공통 + 시구·바다·수첩·결과 화면) | `assets/fonts`, `assets/ui` |
| `assets/` | 도트 인물·소품(`sprites`), 장면 삽화(`sc`), 대화 초상(`pt`), 화면 그림(`ui`), 배경음(`bgm`), 퉁소 파일 자리(`sfx`), 부분 글꼴(`fonts`) | — |
| `credits/*.tsv` | 소재 파일마다 출처·이용 조건·고친 내용 | 사람이 적거나 도구가 줄을 더함 |
| `tools/` | 프롬프트 생성 → Codex CLI 이미지 생성 → 줄이기·자르기·등록, 배경음·퉁소 만들기, 부분 글꼴 만들기 | Python 3, PowerShell, Codex CLI, ffmpeg, Node(프롬프트용 장면 목록 읽기) |
| `tests/` | 내용 점검·규칙 점검(브라우저 없이), 화면·완주 점검(Playwright + 설치된 크롬) | Node, playwright, `../영웅소설/assets`(소재 해시 대조) |

- 모듈 사이에는 import가 없다. 모두 전역 `window.G`와 데이터 전역을 쓰고, **스크립트 차례가 곧 의존 차례**다: `core`(util → save → audio → ui → hud → oldmap) → `game`(steps → rules → code → tiles → world → app → poem → sea → notebook → result) → `data` → `places`(prologue가 먼저) → `main.js`.
- 확장은 등록으로 한다. 단계 종류 `G.steps.register(type, fn)`, 조건 `G.steps.conds`, 효과 `G.steps.effects`, 줄 종류 `G.steps.lineKinds`, 저장 칸 `G.save.extend`, 화면 걸이 `G.app.hooks.{notebook,codeEntry,credits,finish}`, 주소 바로가기 `G.boot.routes`. 등록되지 않은 단계 종류·비어 있는 거점·없는 걸이는 오류 없이 '준비 중'으로 보인다.
- `G.app.play`·`G.app.next`는 감싸 쓰인다: `result.js`가 실릴 때 `next`를 감싸(1막 끝 화면), `main.js`의 `G.rules.attach()`가 다시 `play`·`next`를 감싼다(거점 기록·막간 회복). 감싼 쪽은 늘 원래 함수를 부른다.

## 규칙 핵심과 되풀이

`js/game/rules.js`의 규칙은 '평범한 상태 객체'에 대한 순수 함수(`gaugeOn`·`stepOn`·`collapseOn`·`enterPlaceOn`·`leavePlaceOn`·`onceOn`)로 한 벌만 있다. 이것을 세 곳이 함께 쓴다.

1. **게임 중**: `G.rules.applyStep(step, { place, key })`가 `G.save.state`에 적용하고, 단계 열쇠(`s:거점:단계`)를 `applied` 장부에 적어 한 번만 반영한 뒤 HUD를 출렁인다.
2. **이어 하기 글자 되살리기**(`code.js`): 글자에서 꺼낸 선택·지식·횟수로 1막 거점 넷의 `steps` 배열을 차례대로 같은 함수에 다시 흘려 1막 끝 상태를 만든다.
3. **원작 궤적**(`G.rules.originalRun`): 원작 선택과 고정 사건으로 여덟 거점을 같은 함수에 흘린다.

같은 함수라서 브라우저 없이 Node(`tests/rules.mjs`, `tests/content.mjs`의 vm 상자)에서도 돌고, 게임·되풀이·원작 궤적이 어긋나지 않는다. 대가로 1막 거점 파일의 단계 배열 차례와 상태를 바꾸는 자리가 이어 하기 글자의 일부가 된다.

## 대표 흐름: 처음부터 1차시 끝까지

1. `index.html` → 스크립트 전부 실림 → `main.js`: `G.save.load()`(localStorage `choecheok-jeon-v1`을 처음 값 위에 덮음) → `?teacher=1`이면 `teacher=true` 저장 → `G.rules.attach()` → 바로가기 없음 → `G.app.title()`.
2. '이야기 시작' → 방식 판(처음 배우기/깊이 읽기) → `mode` 저장 → `G.app.play('prologue')`.
3. `play` 감싼 쪽: `G.rules.enterPlace` → 1막 거점이면 거점 기록에 '출발'. 서막은 맵이 없으므로 거점 첫 장(`titleCard`) → `playEvents` → `runSteps`가 사건 화면(`openEvent`: 전체 삽화 + 한지 판 + 아래 트레이)에서 `say` 단계를 차례로 펼친다. 단계마다 시작 값을 `snap`에 떠 두고, 끝나면 `done['s:prologue:p-…']`를 적는다.
4. `G.app.next('prologue')` → 감싼 쪽 `leavePlace`(서막은 기록 없음) → `app.travel`이 고지도에서 배를 옮긴다(`G.oldmap.show`) → `play('namwon')`.
5. 남원은 맵이 있으므로 `G.world.play`: 캔버스 탑다운 맵, 구석 HUD, 목표(beat)마다 할 일을 HUD에 띄운다. 목표 자리에 닿거나 사람에게 말을 걸면(E·행동 단추) 그 목표의 단계들이 사건 화면이나 맵 위 대화창에서 펼쳐진다. NPC 말 속 `{ learnStep }`은 역사 카드 단계를 그 자리에서 한 번만 반영한다.
6. 딜레마 단계: 선택지 상태(`G.rules.optionState`: 열림/잠김·실마리) → 학생이 고름 → `G.rules.applyStep`(선택·게이지·조각·신표·지혜의 길 기록·수첩 카드, 생 0이면 쓰러짐 결과) → 쓰러짐이면 꿈 장면 → 대답 → 원작 대조 카드.
7. 낭고야 → 안남. 안남의 `tongso` 단계(`poem.js`)가 첫 퉁소 때의 연으로 몇 번째 소리에 알아들을지 정하고, 못 알아들으면 '포구를 더 걷는' 목표가 열린다. `poem` 단계가 화면 전체의 시구 맞추기를 맡는다(더듬어 찾기는 `G.rules.grope` → 안남 예외).
8. 마지막 단계 `act1End`(`result.js`): `G.rules.finishAct1`(1막 완료 + 안남 기록) → `G.code.encode(state)` → 6자를 `ABC-DEF`로 크게 보인다 → '막간으로 이어 가기' 또는 '타이틀로'.

2막은 같은 틀로 막간(맵 없음, 처음 들어설 때 생 5) → 항주 → 바다(`route` 단계가 고지도에서 뱃길을 받아 다음 딜레마에 미리 골라 둔 값으로 넘김, `stars` 단계) → 남원 재회 → `origEnding` → `kimyc` → `result`. `result` 단계가 결과 화면을 맡고, '이미지로 저장'은 같은 그리기 함수로 캔버스에 다시 그려 `toBlob` → `<a download>`로 PNG를 내려받게 한다.

## 경계: 무엇이 기기 밖으로 오가는가

- 들어오는 것: 게임을 올린 곳과 **같은 출처의 정적 파일**뿐이다(상대 경로 GET). 외부 CDN·글꼴 서비스·분석 도구·API 호출은 없다.
- 나가는 것: 없다. 학생이 '이미지로 저장'을 누르면 결과 PNG가 그 기기에 내려받아질 뿐이다.
- `file://`로 열면: 앱 설치 정보(manifest)는 붙이지 않고(브라우저가 읽지 못해 오류), 배경음은 audio 요소 음량으로, 퉁소 실제 연주는 fetch 대신 base64를 담은 스크립트(`assets/sfx/tongso_data.js`)로 푼다. 지금은 퉁소 파일이 없어 합성음이다.
- 그림은 `window.ART` 목록(`js/data/people.js`의 생성 구역)에 있는 것만 요청한다. 목록에 없는 장면·초상은 요청하지 않고 빈 종이 판·도트 얼굴·이름 첫 글자 동그라미로 대신 그린다(404 없음).
- 소리는 파일이 없거나 못 읽거나 소리가 꺼져 있어도 오류 없이 합성음 또는 무음으로 지나가고, 퉁소는 물결 무늬와 자막으로 대신 보인다.

## 화면 구조

- **타이틀**: 전체 그림 + 붓글씨 제목 + 메뉴(이야기 시작/이어 하기, 이어 하기 글자 넣기, 처음부터, 이야기 수첩, 만든 사람·출처) + 배경음·설정.
- **탐색 모드**: 맵이 화면 전체(`.mapwrap`), 구석 HUD — 왼쪽 위 옥영 초상 + 연·생 게이지, 가운데 위 한 문장 미션과 목표, 오른쪽 위 수첩·지도·설정, 왼쪽 아래 가상 조이스틱(터치), 오른쪽 아래 행동 단추. 카메라는 HUD 높이만큼 더 물러설 수 있어 맵 가장자리 사람이 HUD에 가리지 않는다.
- **사건 모드**: 전체 삽화 한 폭 + 한지 판(짧은 글) + 아래 엄지 자리 트레이(선택지·'다음'). HUD는 위쪽 얇은 게이지 띠로 접힌다. 카드·꿈은 화면 가운데 한 장으로 크게(`cardmode`).
- **고지도**: 글자 없는 그림 지도(`assets/ui/oldmap.webp`) 위에 거점 점·지명·뱃길·배를 SVG와 글자로 얹는다. 좌표는 그림 너비·높이에 대한 비율(`OLDMAP`), 땅은 실제 지리대로(서쪽 안남·중국, 가운데 조선, 동쪽 일본).
- **세로 화면**: `#rotate` 안내만 보이고 맵은 멈춘다.

## 외부 의존

- 실행 중: 없음(브라우저만).
- 만들 때: Codex CLI 이미지 생성(그림), 국립국악원 「디지털 이음」(배경음·퉁소 원음, 사람이 내려받음), google/fonts 저장소(글꼴 원본, `tools/fonts_src/`에 이미 있음), ffmpeg(소리), 같은 시리즈의 「영웅의 길」(`../영웅소설`: 엔진의 출처, 배경음 원음, 점검의 소재 해시 대조 — 읽기만).
