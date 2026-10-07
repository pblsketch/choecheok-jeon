# js/game — 게임 엔진

## 맡는 것
- `steps.js`: 단계 실행기(`G.steps.register/run`), 조건(`conds`)·효과(`effects`)·줄 종류(`lineKinds`), 기본 단계 `say`·`choice`와 규칙 단계 `dilemma`·`gauge`·`know`·`frag`·`dream`·`card`, 원작 대조 카드·역사 카드·꿈 화면.
- `rules.js`: 게임 규칙 전부(게이지 자르기, 세 갈래, 지혜의 길 열림, 쓰러짐 세 경우, 막간 회복, 한 번만 반영 장부, 거점 기록, 결말, 원작 궤적, `?act=2` 시작값, 시험 손잡이 `G.rules.test.set`).
- `code.js`: 이어 하기 글자 부호화·검사·되풀이 되살리기.
- `tiles.js`·`world.js`: 코드로 그리는 땅 타일과 테마, 탑다운 맵(카메라·충돌·조이스틱·말 걸기·목표 진행·대화창), 시험 손잡이 `G.world.test`.
- `app.js`: 화면 흐름(타이틀·방식 고르기·거점 차례·사건 화면·고지도 이동·설정·'처음부터'·이미지 내려받기 도구), 걸이 `G.app.hooks`.
- `poem.js`(안남 `tongso`·`poem`), `sea.js`(`route`·`stars`, `wonmun` 줄, `{신표}`), `notebook.js`(이야기 수첩·만든 사람·출처), `result.js`(`act1End`·`origEnding`·`kimyc`·`result`, 글자 넣기 창, 결과 화면과 저장 그림).

## 맡지 않는 것
- 이야기 글·선택지·카드 문안·조정 숫자는 `js/data/`에 있다. 여기에 줄거리 문장, 딜레마 문안, 게이지 숫자를 새로 쓰지 않는다(엔진의 대체 글 — '준비 중', 기본 단추 이름 — 만 예외). 숫자는 `TEXTS.RULES`, `POEM`, 거점 파일의 `TUNE`에서 읽는다.
- 저장소 접근은 `G.save`만 쓴다(`localStorage` 직접 접근 금지). HUD·고지도·소리 내부는 `js/core/`의 공개 함수로만 부른다.
- `index.html`의 스크립트 차례, 공통 CSS(`css/style.css`)는 이 폴더의 일이 아니다. 화면별 CSS는 `css/poem.css`·`sea.css`·`notebook.css`·`result.css`.

## 지켜야 할 것
- **규칙은 순수 함수 한 벌**: 상태를 바꾸는 규칙은 `…On(st, …)` 꼴로 평범한 객체에 대해 짠다. 게임 중 적용(`applyStep`·`gauge`·`spendSaeng`), 글자 되살리기(`code.js`), 원작 궤적(`originalRun`)이 모두 이것을 쓴다. 화면 코드 안에서 게이지를 직접 더하지 않는다.
- **한 번만 반영**: 단계 효과는 `G.rules.applyStep(step, { place, key })`로만 적용한다. 열쇠는 `s:거점:단계`. 같은 열쇠로 두 번 적용되지 않는다. 이미 고른 딜레마를 다시 펼치면 같은 선택이 강제로 다시 골라진다.
- **쓰러짐**: 생을 깎는 변동으로 0 이하가 되면 `collapseOn`. 안남 시구 맞추기에서 생을 쓸 때만 `spendSaeng(n, { inPuzzle: true })`로 예외(꿈 없음, 생 0 유지, 횟수 그대로).
- **이어 하기 글자 호환**: `code.js`의 `LAYOUT`·글자판 `ALPHA`·`MASK`·검사식(`checks`)·`RADIX` 차례를 바꾸지 않는다. 되풀이(`replay`)는 1막 거점의 `steps` 배열만 차례로 보며, 목표(beat)·대사 줄 `fx`·NPC 말은 보지 않는다. 더듬기 횟수는 정확히(0~10), 고친 횟수는 0~8로 담고, 화면 표시는 `countLabel`('7+')로만 줄인다.
- 엔진은 거점·딜레마 id를 하드코딩하지 않는다. 1막·2막 거점, 기록할 거점, 막간, 준비·뱃길 딜레마 id는 `TEXTS.RULES`에서 읽는다(예외: `code.js`의 `LAYOUT`).
- 등록되지 않은 단계 종류·비어 있는 거점·없는 걸이는 오류 없이 '준비 중'으로 넘긴다. 단계 함수가 던지면 `runSteps`가 오류 카드를 보이고 다음으로 넘어간다.
- `app.play`·`app.next`를 감쌀 때는 원래 함수를 반드시 부른다(`result.js`와 `G.rules.attach`가 이미 감싼다).
- 단계 도중 새로고침 대비: `runSteps`가 단계 시작 값을 `snap`에 뜨고, 다시 열면 되돌린다. 단계 안에서 바뀌는 새 저장 칸은 `G.save.snapKeys`에 넣는다.
- 결과 화면 그래프는 같은 그리기 함수로 화면(SVG)과 저장 그림(캔버스)에 그린다. 그림 파일을 쓰지 않아 `file://`에서도 저장된다.
- 대화창을 닫은 뒤 300ms(`W.closedAt`) 동안 E·Enter·Space·Z를 말 걸기로 받지 않는다(같은 대화가 곧바로 다시 열리지 않게).
- 화면은 그림책풍 미술 방향을 따른다: 전체 화면 맵 + 구석 HUD, 사건 화면은 삽화 + 한지 판 + 엄지 자리 트레이. 맵/패널로 나누는 배치나 기본 회색 단추를 만들지 않는다.

## 이 폴더의 방식
- 새 화면이 필요한 단계는 자기 파일에서 `G.steps.register('종류', async (step, ctx) => { … })`로 등록하고 `steps.js`에 넣지 않는다. `ctx`: `main`(글 자리), `tray(el)`(아래 트레이), `setScene(id)`, `placeId`, `mode:'event'|'dlg'`, `preset`.
- 새 조건·효과·줄 종류는 `G.steps.conds/effects/lineKinds.이름 = …`로 더한다(규칙 쪽 조건 `know`·`prep`·`route`·`act1Done`도 이렇게 걸린다).
- 다른 파일이 채우는 화면은 `G.app.hooks.notebook/codeEntry/credits/finish`로 잇는다. 이 걸이들은 화면이 닫힐 때 풀리는 약속을 돌려준다.
- 맵 정의는 `G.world.mk(가로, 세로, 바탕, ops)`·`G.world.blobGrid`로 격자를 만들고, 타일 글자·테마는 `tiles.js` 머리 설명을 따른다. 새 테마는 `G.tiles.THEMES.이름`, 새 타일은 `G.tiles.add`.

## 점검
- 규칙: `node rules.mjs`(브라우저 없이: 자르기·세 갈래·지혜의 길·쓰러짐 셋·막간·한 번만·글자 왕복 200개·한 글자 바꾸면 거절·'7+'·원작 궤적·결말·`?act=2`; 크롬: 딜레마 화면·새로고침). 규칙 점검은 `tests/fixtures/places.js`를 쓰므로 딜레마·선택지·지식 id를 바꾸면 그 자료도 같이 바꾼다.
- 화면 틀: `node smoke.mjs`. 안남: `node annam.mjs`. 2막: `node act2.mjs`. 끝부분·수첩·결과: `node endgame.mjs`. 새로고침: `node resume.mjs`. 글자: `node code.mjs`. 전체: `npm run verify`(하나씩 차례로, 45~60분).
- 반드시 볼 가장자리: 생 0 쓰러짐(낭고야 꿈 전·후, 섬), 안남 예외, 바다길 잠김(생 5)과 열림(생 6), 결말 넷의 경계(연·생 5와 6), 이미 고른 딜레마를 새로고침 뒤 다시 펼침, `?act=2`의 '1막 기록 없음'.
