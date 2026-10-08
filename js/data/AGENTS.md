# js/data — 이야기와 숫자(선생님이 고치는 자료)

## 맡는 것
- `flow.js`: 제목·두 방식 이름·거점 차례(`FLOW.order`)·막 미션, 고지도 위 거점·뱃길·나라 이름 자리(`OLDMAP`, 그림에 대한 0~1 비율).
- `places/*.js`: 거점 여덟(`PLACES[id]`) — 맵 격자·소품·자리·사람·목표(beats)·단계(steps)·삽화 설명(scenes). 차례: `prologue`, `namwon`, `nanggoya`, `annam`, `interlude`, `hangzhou`, `sea`, `namwon_final`.
- `texts.js`: 규칙 숫자 `TEXTS.RULES`(선택지 폭, 쓰러진 뒤 생, 막간 생, 결말 기준, 더듬기 값, 보이는 횟수 끝, 1막·2막 거점, 거점 기록 자리, 준비·뱃길 딜레마 id)와 공통 글(얻은 것 알림 `GOT`·장육불 꿈·떠올리는 글·안남 예외·잠김 실마리·대조 카드 틀·글자 오류 문구·표기 색).
- `poem.js`(정답 시·함정 A·B·C·더듬기 후보·패 함정 수·알아듣는 소리·또렷함), `history.js`(역사 카드 7장, `review`는 교사 검수 거리), `original.js`(원작 결말), `kimyc.js`(「김영철전」 대목·활동·깊이 읽기 물음), `notes.js`(표기 다섯 가지, 결말 이름, 결과 화면 비교표 문안, 1차시 끝·글자 넣기 글, 디브리핑, 게임 설정 카드, 수첩·선생님 안내), `people.js`(인물 이름·초상·도트·색, 옥영의 모습별 초상 `looks`), `bgm.js`(장면별 배경음, 퉁소 파일 자리), `credits.js`(게임 안 출처 화면).
- 생성 파일: `sprites.js` 전체(`tools/process_sprites.py`), `people.js`의 `// ART:BEGIN`~`// ART:END`(`tools/process_assets.py`), `bgm.js`의 `tongso:` 한 줄(`tools/make_tongso.py`). 손으로 고치지 않는다.

## 맡지 않는 것
- 규칙의 동작(게이지 계산, 쓰러짐 처리, 한 번만 반영, 글자 부호화)은 `js/game/`에 있다. 여기서는 숫자와 글만 바꾼다. 예외: `places/prologue.js` 머리가 1막 공용 확장(대사 줄 `learnStep`, 효과 `tongsoSound`)을 엔진에 등록하고, `when`에 작은 함수를 쓰는 곳이 있다: `places/annam.js`(`heard`·`hearAt`), `places/namwon_final.js`(`endIs`·`endNot`·`hasToken`), `places/sea.js`(섬 목표의 선택 조건).
- 그림·소리 파일과 그 크레딧(`assets/`, `credits/*.tsv`)은 도구와 크레딧 표의 일이다. 그림 id를 여기 적어도 파일과 그림 목록이 없으면 빈 종이 판으로 보인다.

## 지켜야 할 것
- **원문**(`원문`, `han`): 공유 저작물 판본의 글자만. 지어 넣지 않는다. 늘 `풀이`(`ko`)와 짝. 교과서·모의평가·번역서의 번역을 옮기지 않는다. 귀국 항해(출항~해적 직전)는 원문이 없으므로 줄거리 요약과 이본 노트로만.
- **표기 구분**은 `원문`·`풀이`·`게임 설정`·`이본 노트`·`해석` 다섯뿐. 창작 딜레마는 `orig: null`(대조 카드가 '원작에는 없는 장면'으로 묻는다), 원작 딜레마는 원작 선택지 id.
- **정서 안전**: 자결 시도는 선택지가 아니라 서술로만, 직접 묘사 없이. 남원 함락·해적은 불빛·그림자·소리로. 원작의 큰 사건(이산·포로·안남 재회·두 번째 이별·해적·조선 배·남원 재회)은 어떤 선택에서도 일어나게 둔다.
- **1막 거점(prologue·namwon·nanggoya·annam)과 이어 하기 글자**:
  - `steps` 배열은 노는 차례 그대로(목표 차례 = 단계 배열 차례). 단계를 더할 때 그 목표의 다른 단계 사이 제자리에 넣는다.
  - 딜레마 셋(`d-namwon-flee` 2개, `d-nanggoya-news` 3개, `d-nanggoya-ship` 2개)의 선택지 수와 차례를 바꾸지 않는다.
  - 게이지·조각·신표는 딜레마 선택지(`type`·`gauge`·`fx`), `gauge`·`dream` 단계, 단계의 `fx`로만 바꾼다. 대사 줄의 `fx`, NPC `talk`, 목표 `say`에서 바꾸지 않는다.
  - 지식은 `card`(`history`)·`know` 단계로만 준다. 말 속에서 주려면 `{ learnStep: '단계 id' }`. 1막 지식은 글자에 담긴 여섯(`h-namwon-war`, `h-namwon-ming`, `h-nanggoya-captives`, `h-nanggoya-donwoo`, `h-annam-trade`, `k-japanese`)뿐이다.
  - 갈림에 따라 달라지는 단계는 단계 자체에 `when`을 단다(목표의 `when`은 되살릴 때 보이지 않는다).
- **id는 바꾸지 않는다**(거점·목표·단계·딜레마·선택지·지식·인물·장면). 진행 중인 저장 열쇠(`s:거점:단계`, `b:거점:목표`), 이어 하기 글자, 그림 목록, 점검용 자료(`tests/fixtures/places.js`)가 id로 묶여 있다. 새 것은 새 id로 더한다.
- **숫자 원칙**: 지혜의 길 폭(+1/+1)은 다른 두 길(±2)보다 작게. 원작대로(떠남·준비) 걸으면 뱃길 앞 생이 바다길 문턱(`sea.js`의 `TUNE.seaMin`) 이상: 5(막간) − 2 + 1 + 2(항주 `h-boat`) = 6.
- 장면 id는 `sc_<거점>_<무엇>`(그 밖에 1차시 끝 `sc_act1_end`, 결말 넷 `sc_ending_<결말>`, 항주 소식 카드 `sc_letter_<무엇>`, 원작 결말 `sc_orig_ending`, 「김영철전」 `sc_kimyc_<무엇>`, 순천 상륙 `sc_suncheon_landing`), 초상은 `pt_<인물 id>`, 도트는 `sp_…`, 소품은 `pr_…`. 거점 `scenes`에 `caption`(그림 설명)과 `prompt_hint`(영어, 그림 안에 글자 없음)를 적어야 그림 도구가 프롬프트를 만든다.
- 붓글씨로 보일 이름은 `name: '…'` 꼴로 적는다(글꼴 도구가 그 꼴만 찾는다).
- **옥영의 모습**(`avatar`): 거점마다 적고(맵 없는 서막·막간도), 목표·단계에도 달 수 있다. 대화 얼굴과 HUD 초상이 `people.js`의 `looks`로 따라 바뀐다: 남원 회상 `sp_okyoung_f` → 피란·낭고야·안남 `sp_okyoung_m` → 막간·항주·바다(뱃길·섬) `sp_okyoung_ming` → 조선 배에서 갈아입는 단계 `s-ship-prep`과 남원 재회 `sp_okyoung_joseon`. 글이 말하는 옷차림과 맞춘다. `avatar`는 상태를 바꾸지 않으므로 1막 거점에 달아도 이어 하기 글자와 상관없다.

## 이 폴더의 방식
- 파일마다 전역 하나를 채운다(`window.PLACES.namwon = {…}`, `window.TEXTS.RULES = {…}`). 거점 파일은 `G.world.mk`가 없으면(엔진 없이 실릴 때) 조용히 빠진다.
- 대사 줄: `'서술'`, `{ who, t }`, `{ card:{ kind, title, han, ko, body, src } }`, `{ wonmun:{ 원문, 풀이 } }`, `{ when, … }`, `{ fx }`, `{ learnStep }`. 깊이 읽기 전용은 `when: { mode: 'deep' }`, 처음 배우기 전용은 `{ mode: 'basic' }`.
- 딜레마 대조 카드: `card: { title, summary, quote:{원문,풀이}, quoteLong(깊이 읽기), extraGloss(처음 배우기), variant?(이본 노트), interp?(해석), src }`. 딜레마마다 `extraGloss`와 `quoteLong`이 있어야 한다(`tests/content.mjs`). 원문이 없는 창작 딜레마만 `quoteLong` 대신 `noQuoteLong: '까닭'`을 적고 더 긴 해석은 `interp`로 둔다. 원문은 `design/research/01_원문_사실확인.md`에서만 가져오고 지어내지 않는다.
- 시구 조각은 행 번호로만 적는다: `frag` 단계는 `n`, 선택지는 `fx: { frag: 2 }`. 글(원문·풀이)은 `poem.js`의 `lines`에서 엔진이 꺼내 알림·수첩·시구 맞추기에 함께 보인다. 조각 글을 따로 적지 않는다.
- 이야기 중 원작 장면 카드를 수첩에 모으려면 `type:'card'` 단계로 둔다(`card.id`, `kind:'orig'`). 지식을 주지 않는 카드 단계는 1막 거점에 더해도 이어 하기 글자 되풀이에서 늘 실행되어 어긋나지 않는다(단계 배열 차례만 지킨다).
- 거점·맵의 `year`는 HUD의 때 딱지다(맵 값이 먼저, 회상 맵은 `year: '회상', memory: true`). 거점의 `missions: [{ when, text }]`는 조건에 따라 미션을 바꾼다.
- 수첩 '줄거리'(`NOTES.timeline`)·'인물'(`NOTES.people`)은 단계 `done` 열쇠로 열린다. 단계 id를 더하거나 거점에 사건을 더하면 연표 한 줄도 함께 맞춘다.
- 확정 못 한 사실은 가장 그럴듯한 쪽을 쓰고 역사 카드면 `review`에, 그 밖은 README 교사 검수 목록과 `design/research/01_원문_사실확인.md` §9에 '⚠ 검수 필요'로 올린다.

## 고친 뒤
- 글을 고쳤으면 `python tools/build_fonts.py` → 바뀐 `assets/fonts/*.woff2`를 같은 커밋에.
- `cd tests && node content.mjs`(단계 묶임·참조·표기·괄호 짝·모든 선택 조합으로 결말까지·원작대로 생 6·납품 조건).
- 1막 거점을 고쳤으면 `node act1.mjs && node rules.mjs && node code.mjs`, 안남은 `node annam.mjs`, 2막은 `node act2.mjs && node original.mjs`, 끝부분 글은 `node endgame.mjs`, 장면 id를 더했으면 `node art.mjs`. 점검은 하나씩 차례로.
