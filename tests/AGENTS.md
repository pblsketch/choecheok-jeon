# tests — 자동 점검

## 맡는 것
- 브라우저 없이(Node `vm`으로 게임 스크립트를 `index.html` 차례대로 실음): `content.mjs`(자료·납품 조건), `rules.mjs` 1부(규칙·이어 하기 글자), `sprites.mjs`·`art.mjs`(파일·목록·크레딧 대조, 모아 찍기는 크롬).
- 크롬으로 실제 화면을 몰기(Playwright, `channel: 'chrome'` = 설치된 크롬): `smoke`, `audio`, `rules` 2부, `act1`, `annam`, `act2`, `endgame`, `maps`, `file`, `code`, `resume`, `original`, `hard`, `e2e`, 그리고 `verify`에 없는 `ui_shots`(눈으로 보는 화면 사진).
- 공용: `serve.mjs`(게임 폴더를 빈 포트에 서빙, `BASE`로 바꿀 수 있음), `lib.mjs`(맥락 열기와 오류 모으기, 타이틀부터 결과 화면까지 실제 단추를 누르며 놀기 `play`, 시구 풀기, 말 걸기 `talkTo`, 결과 저장·읽기), `fixtures/places.js`(규칙·끝부분 점검용 작은 거점 자료).

## 맡지 않는 것
- 게임 코드·자료·소재를 고치지 않는다. 점검이 실패하면 고칠 곳은 대개 `js/`·`assets/`·`credits/`다. 점검을 고쳐 통과시키는 것은 점검 자체가 틀렸을 때만이다.
- 화면 사진(`shots/`)은 저장소에 올리지 않는다. `node_modules/`도.

## 지켜야 할 것
- `npm run verify`는 17개를 `&&`로 차례로 돈다(값싼 것부터: content → sprites → art → rules → smoke → audio → act1 → annam → act2 → endgame → maps → file → code → resume → original → hard → e2e). 45~60분. **한 번에 하나만** 돌린다. 겹쳐 돌리면 소리 장치·시간 초과로 거짓 실패가 난다.
- 통과 기준: 각 스크립트 끝 `점검 N개 · 문제 0개`(또는 `OK`), 종료 코드 0. 콘솔 오류·페이지 오류·실패한 요청·400 이상 응답 0건. 허용 예외는 `/assets/bgm/<이름>.mp3`의 `ERR_ABORTED`(빠른 장면 전환)와 `blob:` 내려받기뿐이다(`lib.mjs`의 `open`). `audio.mjs`만 일부러 없는 파일을 부르는 단계에서 그 주소의 404를 허용한다.
- 맵 목표는 시험 손잡이(`G.world.test.complete`·`teleport`)로 이루되, 딜레마·뱃길·별·시구 맞추기·1차시 끝·원작 결말·「김영철전」·결과 화면은 **실제 화면 단추**를 누른다. 게이지는 어려운 길 하나(`hard.mjs` 2: 안남 예외)처럼 실제 선택으로 닿지 않는 경우에만 `G.rules.test.set`으로 맞춘다.
- `smoke.mjs`는 엔진 틀만 본다. 중간에 여덟 거점을 `null`로 비워 '준비 중' 흐름을 확인한다. 내용은 내용 점검이 본다.
- 전체 화면 점검은 진짜 전체 화면에 들어가지 않도록 `ctx.addInitScript`로 `Element.prototype.requestFullscreen`·`Document.prototype.exitFullscreen`·`fullscreenElement`·`fullscreenEnabled`·`screen.orientation.lock`을 가짜로 바꿔 끼우고 `fullscreenchange`를 직접 쏜다(`smoke.mjs` 5). '지원하지 않는 브라우저'는 같은 방법으로 `requestFullscreen`을 지우고 `fullscreenEnabled`를 `false`로 둔다.
- `rules.mjs`·`endgame.mjs`는 실제 거점이 아니라 `fixtures/places.js`를 쓴다. 딜레마·선택지·지식 id나 1막 짜임을 바꾸면 이 자료를 실제 거점과 같게 바꾼다.
- `content.mjs`의 「영웅의 길」 소재 해시 대조는 `../영웅소설/assets`(위쪽 폴더를 차례로 찾음, 또는 `HERO_ASSETS`)가 있을 때만 돈다. 없으면 건너뜀으로 찍고 통과로 센다. 소재를 바꾼 커밋은 그 폴더가 있는 기기에서 대조 결과를 본다.
- `content.mjs`의 크레딧 점검은 `assets/` 아래 모든 폴더(`raw`·`raw_audio` 빼고)를 훑는다. 새 소재 폴더를 만들어도 크레딧 줄이 있어야 통과한다.
- 점검 하나가 확인해야 하는 약속: 단계 id 중복 없음·모든 단계가 목표에 묶임·목표 차례 = 단계 배열 차례(content), 모든 선택 조합 × 게이지 극값에서 결말까지·원작대로 뱃길 앞 생 6 이상(content·original), 새로고침 일곱 자리 두 번 반영 없음(resume), 이어 하기 글자 화면에서 읽어 새 맥락에 넣기·한 글자 바꾸면 거절(code·rules), 파일로 열기와 소리 끈 채 퉁소 단계(file), 소재 크레딧·이용 조건(content·audio·art), 딜레마 카드마다 처음 배우기 풀이 덧붙임과 깊이 읽기 긴 원문(content), 시구 조각이 원문과 풀이로 보임(smoke·endgame), 거점마다 옥영의 모습(`avatar`)이 정해져 있고 그 모습의 초상이 `looks`·그림 목록에 있음(content·art), 전체 화면 단추가 타이틀·HUD·설정에 있고 누르면 `requestFullscreen`·그림·이름이 바뀌며 지원하지 않으면 숨고 '홈 화면에 추가' 안내, 오른쪽 위 묶음이 휴대폰 가로(선생님용 다섯 단추 포함)·PC에서 미션과 겹치지 않음(smoke).

## 이 폴더의 방식
- 각 스크립트는 `checker()`의 `ok(조건, 설명)`으로 단정하고 끝에 개수를 찍는다. 설명은 한국어로, 무엇을 확인했는지 값과 함께.
- 페이지 준비: `fresh(page, url)`(저장 비우고 타이틀, `G.oldmap.fast = true`로 고지도 연출 줄임) → `startGame(page, 'basic'|'deep')` → `play(page, { choices: { 딜레마 id: 선택지 id }, route })`.
- 화면 크기: 휴대폰 가로 844×390(터치, dpr 2), PC 1366×860, 세로 390×844(안내 화면).
- 끝나지 않는 약속을 돌려주는 걸이(`G.app.openHook('notebook')`, `codeEntry`, `result` 단계)는 `page.evaluate(() => { …; })`처럼 중괄호로 감싸 돌려받지 않는다. 돌려받으면 `evaluate`가 멈춘다.
- 대화창이 닫힌 직후 300ms 동안 E가 먹지 않는다. `talkTo`는 닫은 뒤 380ms 기다리고, 창이 안 뜨면 몇 번 다시 누른다.
- 인자: `node e2e.mjs [basic|deep] [phone|desktop] [coast|sea]`(없으면 여덟 갈래), `node hard.mjs [1|2|3]`. 환경 변수: `BASE`, `HERO_ASSETS`.

## 새 점검을 더할 때
- 값싼 점검이면 `verify`의 앞쪽, 완주형이면 뒤쪽에 넣는다. 공용 동작은 `lib.mjs`에 둔다.
- 새 화면 단계를 더했다면 적어도 하나의 완주 점검이 그 화면의 실제 단추를 누르게 하고, 휴대폰 가로·PC 두 크기에서 찍는다.
- 시간이 오래 걸리는 점검을 더하면 `verify` 전체 시간과, 부르는 쪽의 시간 제한(60분 이상)을 함께 본다.
