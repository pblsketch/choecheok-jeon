# tools — 소재를 만드는 오프라인 도구

## 맡는 것
- 그림 생성(Windows PowerShell + Codex CLI): `gen.ps1`(한 장), `genqueue.ps1`(manifest를 여러 장 동시에), `genretry.ps1`(빠진 것만 기다렸다 다시). 결과는 `assets/raw/<이름>.png`(저장소에 올리지 않음).
- 프롬프트: `make_prompts.py`(장면 `sc_*`·초상 `pt_*` → `prompts/*.txt`, `manifest.tsv`; node로 거점 자료의 장면 id를 읽음), `make_sprites.py`(도트 `sp_*`·소품 `props_*` → `prompts/`, `manifest_sprites.tsv`), `prompts/ui_*.txt`·`style_*.txt`(화면 그림·화풍 시안).
- 다듬기·등록: `process_assets.py`(장면 1280px ≤250KB·초상 512px ≤80KB webp, `js/data/people.js`의 ART 구역 다시 쓰기, `credits/art.tsv` 줄 맞추기), `process_sprites.py`(마젠타 배경 제거·프레임 검출·발밑 피벗·32px 칸 기준 축소·색 줄임 → `assets/sprites/*.png`, `js/data/sprites.js`).
- 소리: `fetch_digitaleum.py`(디지털 이음 악구 원음을 `make_bgm.py`의 `TRACKS`대로 `assets/raw_audio/<폴더>/`에 받기, 내려받기 창 값 기본 상업용·어플리케이션 제작·온양여자고등학교), `make_bgm.py`(디지털 이음 악구 wav → 장면별 mp3, -17 LUFS, 안남 밤 포구 -22 LUFS), `make_tongso.py`(퉁소 실연 wav `assets/raw_audio/tongso/Tungso_8.wav` → `assets/sfx/tongso.mp3`·`tongso_data.js`, `js/data/bgm.js`의 `tongso:` 줄 바꾸기).
- 글꼴: `build_fonts.py`(게임 글자만 남긴 부분 글꼴 HangroBatang·HangroHanja·HangroBrush + `assets/fonts/OFL.txt`), 원본 `fonts_src/`(OFL 원본 글꼴과 라이선스 전문).

## 맡지 않는 것
- 게임 실행 중에는 아무 도구도 돌지 않는다. 게임 코드(`js/game/`, `js/core/`)를 바꾸지 않는다.
- 생성 구역 밖의 `js/data/` 글은 사람이 고친다. `credits/sprites.tsv`·`credits/audio.tsv`·`credits/ui.tsv`·`credits/fonts.tsv`의 줄, `CREDITS.md`, `js/data/credits.js`는 도구가 쓰지 않는다(`art.tsv`만 `process_assets.py`가 맞춘다).
- 형제 저장소(`../영웅소설` 등)는 읽기만 한다(`make_bgm.py --raw "../영웅소설/assets/raw_audio"`처럼).

## 지켜야 할 것
- 이미지 생성 전에 `$env:HERO_CODEX_MODEL = 'gpt-6-astra'`(또는 `-UseModel`). `~/.codex/config.toml`의 기본 모델로는 이 계정에서 생성이 되지 않는다(`NO_IMAGE`).
- 프롬프트는 영어 ASCII만(명령문에 그대로 넣어 넘김). 그림 안에 글자·낙관·서명 금지, 피·주검·자해 금지. 장면·초상·화면 그림은 현대 그림책풍(참조 `design/style-samples/style_picturebook.png`)으로만. 생성이 막히면 다른 도구로 바꾸지 않고 만든이에게 알린다.
- 전쟁 장면에만 '먼 불빛·연기' 문구를 붙이고 나머지에는 '불·연기 없음'을 붙인다(모든 장면에 붙이면 평화로운 장면에 불이 그려진다). 옥영 외 인물 초상은 옥영 초상이 아니라 화풍 그림을 참조로(얼굴이 닮아 버린다). 옥영의 다른 모습 초상은 반대로 남복 초상을 `face` 방식으로 참조해 같은 사람으로 보이게 하고, 새 모습을 더하면 `js/data/people.js`의 `looks`에 도트 id → 초상 id를 적는다.
- 도트 인물·소품에 보라·분홍을 쓰지 않는다. `process_sprites.py`의 번짐 걷기(`defringe`)가 보라를 지우거나 회색으로 돌린다.
- 생성 구역을 다시 쓰는 도구(`process_assets.py`, `process_sprites.py`, `make_tongso.py`)의 결과를 손으로 고치지 않는다. 다시 돌리면 덮어쓴다.
- 새 소재 파일은 반드시 `credits/*.tsv`에 출처·이용 조건(허용 목록: 자체 생성물·공공누리 제1유형·CC0·CC BY·SIL OFL·퍼블릭 도메인)·고친 내용을 적는다. 이용 조건을 확인할 수 없는 원음·글꼴은 넣지 않는다.
- 디지털 이음 내려받기 창(사용목적·용도·기관명)의 값은 만든이가 정한다: 납품용은 사용목적 '상업용'(지금 값: 상업용·어플리케이션 제작·온양여자고등학교, 2026-10-08). `fetch_digitaleum.py`는 이 값을 창 대신 보내 악구만 받는다(퉁소 단음은 사이트에서 받는다). 다른 값으로 받았으면 `credits/audio.tsv`의 출처 칸도 고친다.
- 글꼴: OFL 예약 이름을 부분 글꼴에 쓰지 않도록 이름을 `Hangro…`로 바꾼다. 붓글씨 글자는 `BRUSH_EXTRA` + `flow.js`의 `title|subtitle|name` + 거점 파일의 `name: '…'` 꼴에서만 모은다. 한자 글꼴은 고운바탕 cmap에 없는 글자만 담는다.
- 원본(`assets/raw/`, `assets/raw_audio/`)은 저장소에 올리지 않는다.

## 이 폴더의 방식
- 장면·초상 한 바퀴: `python tools/make_prompts.py` → `powershell -ExecutionPolicy Bypass -File tools\genqueue.ps1 -Manifest tools\manifest.tsv -Parallel 3 -SkipExisting` → (빠지면 `genretry.ps1`) → `python tools/process_assets.py [이름…]`.
- 도트 한 바퀴: `python tools/make_sprites.py` → `genqueue.ps1 -Manifest tools\manifest_sprites.tsv -SkipExisting` → `python tools/process_sprites.py [이름…] [--preview]` → `credits/sprites.tsv`에 줄 더하기.
- manifest 열: `이름 \t 크기 \t 참조 그림 \t 참조 방식(same|face|style|char|scene)`. `face`는 같은 얼굴·화풍에 옷·머리·나이만 프롬프트대로 바꾸는 방식이다(옥영의 다른 모습 초상 `pt_okyoung_f`·`_ming`·`_joseon`이 남복 초상을 참조: `make_prompts.py`가 `assets/pt/pt_okyoung.webp`에서 `assets/raw/ref_pt_okyoung.png`를 만든다). `gen.ps1`은 전역 codex 설정 대신 임시 `CODEX_HOME`(최소 설정 + `auth.json` 복사)을 쓴다.
- 파이썬 의존: `fonttools`·`brotli`(글꼴), `Pillow`(그림), `numpy`·`scipy`(도트·소리), ffmpeg(소리). 프롬프트 도구는 node도 쓴다.

## 점검
- 장면·초상: `cd tests && node art.mjs`(거점이 부르는 장면·초상의 파일·ART 목록·크레딧·크기, 갤러리 그림 `tests/shots/art/gallery.png`).
- 도트: `node sprites.mjs`(정해 둔 id 20벌, 걷기 3방향×4, 모아 찍기 `tests/shots/sprites.png`를 눈으로).
- 소리: `node audio.mjs`(크레딧·이용 조건·10MB 이하·장면별 곡·퉁소 대체).
- 글꼴: 점검이 잡지 못한다. 휴대폰 가로·PC 화면 사진(`node ui_shots.mjs`)에서 제목·한자가 기기 글꼴로 섞이지 않았는지 본다.
- 모든 소재: `node content.mjs`(모든 파일이 크레딧에 있는가, 이용 조건, 「영웅의 길」 소재 해시 대조).
