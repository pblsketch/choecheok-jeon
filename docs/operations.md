# 운영: 준비·실행·점검·소재 만들기·올리기

## 준비물

| 무엇 | 언제 필요한가 |
|---|---|
| 브라우저(크롬·엣지·사파리·파이어폭스) | 게임 실행. 설치할 것 없음 |
| Git | 저장소 받기·커밋 |
| Node.js 18 이상 | 점검(`tests/`), 장면 프롬프트 만들기(`tools/make_prompts.py`가 node로 거점 자료를 읽음) |
| Google Chrome(설치본) | 점검. Playwright가 내려받은 크로미움이 아니라 `channel: 'chrome'`으로 **설치된 크롬**을 쓴다 |
| `../영웅소설` 폴더(같은 시리즈의 「영웅의 길」) | `tests/content.mjs`의 소재 해시 대조. 다른 자리에 있으면 `HERO_ASSETS` 환경 변수로 그 `assets` 폴더를 가리킨다 |
| Python 3 + `fonttools`·`brotli` | 글꼴 다시 만들기(`tools/build_fonts.py`, woff2에 brotli 필요) |
| Python `Pillow` | 삽화·초상 줄이기(`process_assets.py`), 도트 아틀라스(`process_sprites.py`), 참조 그림 만들기(`make_prompts.py`) |
| Python `numpy`·`scipy` | 도트 아틀라스, 배경음·퉁소 만들기 |
| ffmpeg(PATH 또는 `~/ffmpeg/bin`, `C:\ffmpeg\bin`) | 배경음·퉁소 만들기(`make_bgm.py`, `make_tongso.py`) |
| Windows PowerShell + Codex CLI(로그인됨, `~/.codex/auth.json`) | 그림 생성(`tools/gen*.ps1`) |

한 번에 갖추기(파이썬 쪽):

```bash
python -m pip install fonttools brotli Pillow numpy scipy
```

## 받고 실행하기

```bash
git clone <저장소 주소> choecheok-jeon      # 시리즈 폴더(영웅소설과 나란히)에 둔다
cd choecheok-jeon
python -m http.server 8765                  # 저장소 뿌리에서
# 브라우저로 http://127.0.0.1:8765/ 를 연다(휴대폰은 같은 와이파이에서 http://<PC의 IP>:8765/)
```

- 서버 없이: `index.html`을 더블클릭해도 시작·저장·소리가 된다. 브라우저에 따라 글꼴 파일을 막아 기기 글꼴로 보일 수 있다.
- 주소 옵션: `?teacher=1`(선생님용 켜기), `?act=2`(막간부터, 진행과 이름을 지우고 시작), `?place=<거점 id>`(그 거점을 지금 저장 그대로 바로 펼침 — 만들면서 확인할 때). 거점 id: `prologue`, `namwon`, `nanggoya`, `annam`, `interlude`, `hangzhou`, `sea`, `namwon_final`.
- 저장을 비우고 처음부터 보려면 타이틀 '처음부터'를 누르거나, 개발자 도구에서 `localStorage.removeItem('choecheok-jeon-v1')` 후 새로고침.
- 맵 테마 견본 보기(개발자 도구): `G.world.test.enter('demo_port')`(`demo_village`·`demo_harbor_night`·`demo_garden`·`demo_island`).

## 점검

```bash
cd tests
npm install            # playwright 하나(브라우저는 내려받지 않고 설치된 크롬을 쓴다)
npm run verify         # 17개 스크립트를 차례로, 45~60분. 끝에 '문제 0개'·종료 코드 0이면 통과
```

- 반드시 하나씩 돌린다. 점검을 겹쳐 돌리면 소리 장치·시간 초과로 거짓 실패가 난다.
- 빠른 점검(글·숫자만 고쳤을 때, 2분 안팎): `node content.mjs && node smoke.mjs && node endgame.mjs && node art.mjs`
- 하나만: `node <이름>.mjs`. 자동 완주 한 갈래만: `node e2e.mjs basic phone coast`(방식 `basic|deep`, 화면 `phone|desktop`, 뱃길 `coast|sea`). 어려운 길 하나만: `node hard.mjs 2`.
- 화면 디자인 사진(눈으로 보는 점검, `verify`에 없음): `node ui_shots.mjs`.
- 환경 변수: `BASE`(점검이 스스로 띄우는 서버 대신 이 주소를 씀, 예 `BASE=http://127.0.0.1:8765/index.html`), `HERO_ASSETS`(「영웅의 길」 `assets` 폴더 자리).
- 화면 사진은 `tests/shots/<점검 이름>/`에 남는다(저장소에 올리지 않음). 각 스크립트는 끝에 `점검 N개 · 문제 M개`를 찍고, 문제가 있으면 종료 코드 1이다.

## 글을 고친 뒤

```bash
python tools/build_fonts.py                 # 바탕·한자·붓 부분 글꼴 다시 만들기(원본은 tools/fonts_src/)
cd tests && node content.mjs                # 자료·납품 조건 점검
git add assets/fonts js/data/<고친 파일>     # 글꼴은 글과 같은 커밋에
```

- `tools/fonts_src/`에 원본이 없으면 `build_fonts.py`가 google/fonts 저장소에서 내려받는다(인터넷 필요).
- 숫자(`js/data/texts.js`의 `RULES`, `js/data/places/sea.js`의 `TUNE`)를 바꿨으면 `node content.mjs && node original.mjs`까지 돈다.

## 소재 만들기

### 장면 삽화·대화 초상

```powershell
python tools/make_prompts.py                                   # 거점이 부르는 sc_* · pt_* id를 모아 tools/prompts/*.txt와 tools/manifest.tsv를 씀
$env:HERO_CODEX_MODEL = 'gpt-6-astra'                          # 기본 모델은 이 계정에서 생성이 안 된다
powershell -ExecutionPolicy Bypass -File tools\genqueue.ps1 -Manifest tools\manifest.tsv -Parallel 3 -SkipExisting   # assets/raw/<이름>.png
powershell -ExecutionPolicy Bypass -File tools\genretry.ps1    # 한도 등으로 빠진 것만 기다렸다 다시(선택)
python tools/process_assets.py [이름 …]                         # assets/sc(1280px, ≤250KB)·assets/pt(512px, ≤80KB) webp + people.js의 ART 목록 + credits/art.tsv 줄
cd tests && node art.mjs && node content.mjs
```

- 한 장만: `powershell -File tools\gen.ps1 -Name sc_x -PromptFile tools\prompts\sc_x.txt -Out assets\raw\sc_x.png [-Image 참조.png -RefMode style]`.
- 프롬프트는 영어 ASCII만, 그림 안에 글자 없음. 다시 그린 까닭은 `design/ui/삽화_검수.md`에 적는다.
- `assets/raw/`는 저장소에 올리지 않는다. 장면·초상 수가 바뀌면 `CREDITS.md`와 `js/data/credits.js`의 수도 고친다.

### 도트 인물·소품

```powershell
python tools/make_sprites.py                                   # tools/prompts/sp_*.txt · props_*.txt + tools/manifest_sprites.tsv
$env:HERO_CODEX_MODEL = 'gpt-6-astra'
powershell -ExecutionPolicy Bypass -File tools\genqueue.ps1 -Manifest tools\manifest_sprites.tsv -SkipExisting
python tools/process_sprites.py [이름 …] [--preview]           # assets/sprites/*.png + js/data/sprites.js(일부만 다시 만들어도 나머지 정보는 지킴)
cd tests && node sprites.mjs && node content.mjs
```

- `credits/sprites.tsv`에 새 파일 줄을 손으로 더한다(이 도구는 크레딧을 쓰지 않는다).

### 배경음

```bash
# 원음: 디지털 이음 '악구 다운로드'에서 받은 wav를 assets/raw_audio/<폴더>/에(폴더·악구 코드는 tools/make_bgm.py의 TRACKS)
python tools/make_bgm.py [장면 이름 …]
python tools/make_bgm.py --raw "../영웅소설/assets/raw_audio"   # 「영웅의 길」이 받아 둔 같은 원음을 읽기만 할 때
cd tests && node audio.mjs && node content.mjs
```

- 장면마다 -17 LUFS, 안남 밤 포구만 -22 LUFS, 모노 64kbps mp3. 곡을 바꾸면 `credits/audio.tsv`·`CREDITS.md`·`js/data/bgm.js`의 `from`을 함께 고친다.

### 퉁소 실제 연주(아직 하지 않은 일)

1. https://www.gugak.go.kr/digitaleum/front/monotone/list.do → 관악기 → 퉁소 → 연주 '애원성'(`Tungso_8.wav`)을 내려받는다. 내려받기 창의 사용목적은 **상업용**(납품하므로), 용도·기관명은 만든이가 적는다. 이 창 때문에 자동으로 받을 수 없다.
2. 파일을 `assets/raw_audio/tongso/`에 넣는다.
3. `python tools/make_tongso.py` → `assets/sfx/tongso.mp3`·`assets/sfx/tongso_data.js`가 생기고 `js/data/bgm.js`의 `tongso:` 줄이 바뀐다.
4. `credits/audio.tsv`에 두 줄(`design/research/음원_이용조건.md` §3에 그대로 있음)을 넣고 `CREDITS.md`의 퉁소 단락을 고친다.
5. `cd tests && node audio.mjs && node content.mjs`, 이어서 전체 점검.

- 퉁소를 받을 수 없으면 같은 조건(공공누리 제1유형)의 단소 → 소금 → 대금 실연으로: `python tools/make_tongso.py --src <파일> --instrument 단소 --from "<출처>"`. 수첩·출처 화면에 "퉁소 대신 단소 연주"가 저절로 나온다.

## 올리기

- 아직 어디에도 올리지 않았다. 올릴 곳(지학사 사이트 탑재 또는 공개 웹 주소)은 정해지지 않았다.
- 올리는 방법은 어디든 같다: 저장소 폴더의 정적 파일을 그대로 올린다. 경로가 모두 상대 경로라 도메인 뿌리·하위 폴더·`file://` 어디서든 돈다. 서버 설정·빌드가 필요 없다.
- 올릴 때 빼도 되는 것: `tests/`, `tools/`, `design/`, `credits/`(내용은 `CREDITS.md`와 게임 안 출처 화면에 있음). 꼭 함께 올릴 것: `index.html`, `manifest.webmanifest`, `css/`, `js/`, `assets/`(특히 `assets/fonts/OFL.txt`), `CREDITS.md`.
- 정적 서버가 `.webp`·`.woff2`·`.mp3`·`.webmanifest`를 올바른 형식으로 보내는지 확인한다(이미지·글꼴이 안 보이면 MIME 설정부터 본다).
- 같은 출처에 시리즈의 다른 게임을 함께 올리면 localStorage를 같은 출처 안에서 나눠 쓴다(칸 이름이 달라 섞이지는 않는다).
- 올린 뒤 확인: 휴대폰 가로·PC에서 타이틀 그림·글꼴이 뜨는가 → 이야기 시작 → 남원 한 목표 → 새로고침 → '이어 하기'로 같은 자리에서 잇는가 → 배경음이 나오는가.
