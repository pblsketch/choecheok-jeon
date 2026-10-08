# js/core — 엔진 바닥

## 맡는 것
- `util.js`: 요소 생성기 `h('div.cls', attrs, …)`, `**굵게**`·줄바꿈 변환, 받침에 맞춘 조사(`josa`), 글 속 자리 `{학생}`(`G.util.vars`에 더함), 그림 목록 조회 `G.util.art(kind, id)`, 인물 조회, 인물 초상 `G.util.pt(id, sp)`(모습이 여러 벌인 인물은 `PEOPLE[id].looks`에서 지금 모습 — `sp` 또는 게임이 채우는 `G.util.lookNow(id)` — 의 초상).
- `save.js`: 저장 칸 하나(`localStorage['choecheok-jeon-v1']`)의 불러오기·쓰기·초기화. `G.save.extend`로 칸 더하기, `snapKeys`(단계 도중 새로고침 때 되돌릴 칸), `SETTINGS`(초기화에도 남는 설정).
- `audio.js`: 배경음(파일 우선 → 못 읽으면 합성 곡), 효과음(모두 합성), 퉁소 층 `G.audio.tongso`(또렷함·방향, 파일 → base64 → 합성 차례로 대체).
- `ui.js`: 토스트, 판(`sheet`), 아래 트레이 채우기(`fillTray`), 카드(표시 체계), 인물 얼굴(`G.ui.face(id, sp)`, 옥영은 지금 옷차림의 초상).
- `hud.js`: 구석 HUD(초상·게이지·미션·아이콘), 사건 모드의 게이지 띠, 얻은 것 알림, 선생님용 숫자. 왼쪽 위 초상은 `G.hud.syncFace()`가 지금 모습의 초상으로 바꾼다(`hud.refresh`와 맵의 옷차림이 바뀔 때 부름). 오른쪽 위 아이콘(수첩·지도·전체 화면·설정)은 `js/game/app.js`가 `hud.tools`로 채운다.
- `oldmap.js`: 그림 고지도 위 거점·뱃길·배(옮겨 가기, 뱃길 고르기, 겹쳐 보기).

## 맡지 않는 것
- 게임 규칙(게이지 변동·쓰러짐·결말)은 `js/game/rules.js`, 단계 실행은 `js/game/steps.js`, 화면 흐름은 `js/game/app.js`다. 여기서 연·생 숫자를 계산하지 않는다.
- 이야기 글·카드 문안·거점 id를 넣지 않는다. 고지도 좌표·뱃길은 `js/data/flow.js`의 `OLDMAP`, 곡 목록은 `js/data/bgm.js`, 그림 목록은 `js/data/people.js`의 생성 구역이 가진다.
- `js/game/`, `js/data/`, `css/`의 공통 모양을 여기서 바꾸지 않는다.

## 지켜야 할 것
- `localStorage`를 읽고 쓰는 곳은 `save.js` 하나다. 저장할 수 없는 환경에서도 예외를 던지지 않는다(`try`로 삼킴).
- `G.save.reset()`은 진행과 `name`을 지우고 `SETTINGS`(`mode`·`font`·`sound`·`music`·`teacher`)만 남긴다. 칸 이름 `choecheok-jeon-v1`을 바꾸지 않는다(기존 학생 진행이 사라져 보인다).
- `G.util.art`는 `window.ART` 목록(또는 거점 `scenes`의 `img`)에 있는 그림만 경로를 돌려준다. 목록에 없으면 `null` → 부르는 쪽이 빈 종이 판을 그린다. 없는 파일을 요청해 404를 내지 않는다.
- 소리는 실패해도 오류 없이 지나간다: 파일이 없거나 못 읽으면 합성음, `AudioContext`가 없으면 아무 일도 하지 않음, 소리를 끄면 `tongso.play`가 `false`. 소리가 꺼져 있어도 게임이 끝까지 가야 한다.
- 웹 주소(`http(s)`)에서 배경음 파일은 Web Audio 길로 잇고, `file://`에서는 audio 요소 음량으로 조절한다. 퉁소 파일은 웹에서 `fetch`, `file://`에서는 `BGM.tongso.js`(base64 스크립트)로 푼다.
- `fillTray`는 '다음' 단추 하나(`.actions`)일 때 `.solo`를 켜고, 트레이가 잠깐 비어도 끄지 않으며, 바꾼 뒤 마지막 줄이 보이게 다시 맞춘다. 화면마다 따로 우회 코드를 두지 않는다.
- 외부 주소로 요청하지 않는다. SVG 이름공간 문자열(`http://www.w3.org/2000/svg`)만 예외다.
- 지금 모습(어느 옷차림인가)은 엔진 바닥이 정하지 않는다. `G.util.lookNow`는 기본값이 `null`이고 `js/game/app.js`가 `G.app.avatar`로 채운다. 초상 파일이 없으면 기본 초상 → HUD 초상(`G.hud.FACE`) 차례로 물러선다.

## 이 폴더의 방식
- 각 파일은 즉시 실행 함수 하나로 `G.<이름>`을 만든다. 스크립트 차례: util → save → audio → ui → hud → oldmap. 뒤 파일은 앞 파일만 쓴다.
- 확장은 덧붙이기로 한다: 새 효과음 `G.audio.addSfx(name, fn)`, 새 합성 곡 `G.audio.TRACKS.이름`, 새 글 속 자리 `G.util.vars.이름`, 카드 종류 `G.ui.KIND.이름`.
- 모양은 `css/style.css`의 변수(`--night`, `--hanji`, `--lantern`, `--serif`, `--brush` …)를 쓴다. 강조색은 등불 주황 하나다.
- 점검용 손잡이: `G.audio.synthOnly`, `G.audio.tongsoSynthOnly`, `G.audio.nowFile()`, `G.audio.nowSynth()`, `G.oldmap.fast`(연출 줄이기).

## 점검
- `tests/smoke.mjs`(HUD 겹침·고지도·사건 화면·세로 안내·파일로 열기), `tests/audio.mjs`(곡 바뀜, 파일 없을 때 합성, 퉁소 또렷함, AudioContext 없음, `file://`), `tests/resume.mjs`(되돌리기 칸).
- 저장 칸·`snapKeys`를 바꾸면 `node rules.mjs && node resume.mjs`. 소리를 바꾸면 `node audio.mjs && node file.mjs`. 점검은 하나씩 차례로 돌린다.
