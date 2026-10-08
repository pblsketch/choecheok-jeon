# 만든 사람과 출처 — 두 개의 항로(「최척전」)

**만든이**: 박준일(온양여자고등학교 국어 교사)

이 게임에 들어간 그림·소리·글꼴·글의 출처와 이용 조건을 모았습니다. 파일마다 한 줄씩 적은 원본은 `credits/*.tsv`(`sprites`·`art`·`ui`·`audio`·`fonts`)이고, 이 문서는 그것을 묶어 정리한 것입니다. 게임 안 **만든 사람·출처** 화면은 이 문서를 줄인 `js/data/credits.js`를 보여 줍니다.

소재는 모두 **상업 납품이 가능한 것**만 썼습니다. 저작권이 끝난 원문, 직접 쓴 글, 만든이가 직접 생성한 그림, SIL OFL 글꼴, 공공누리 제1유형(출처표시) 음원입니다. 비상업·변경 금지 조건이거나 조건이 분명하지 않은 소재는 넣지 않았습니다. `tests/content.mjs`가 `assets/`의 모든 파일이 `credits/*.tsv`에 있는지, 이용 조건이 이 범위 안인지를 점검합니다.

## 한눈에

| 갈래 | 파일 | 출처 | 이용 조건 |
|---|---|---|---|
| 도트 인물·소품 | `assets/sprites/` 54개 | Codex CLI 이미지 생성(자체 생성) | 자체 생성물 |
| 장면 삽화 | `assets/sc/` 54장 | Codex CLI 이미지 생성(자체 생성) | 자체 생성물 |
| 대화 초상 | `assets/pt/` 20장 | Codex CLI 이미지 생성(자체 생성) | 자체 생성물 |
| 화면 그림 | `assets/ui/` 7장(그림 4장 + 타이틀 그림에서 잘라 만든 앱 아이콘 2장·링크 미리 보기 1장) | Codex CLI 이미지 생성(자체 생성) | 자체 생성물 |
| 배경음 | `assets/bgm/` 9곡 | 국립국악원 「디지털 이음」 악구 | 공공누리 제1유형(출처표시) |
| 퉁소 | (아직 파일 없음, 합성음) | 아래 '소리' 참고 | — |
| 효과음 | 파일 없음 | 브라우저 합성 | 자체 제작 |
| 글꼴 | `assets/fonts/` 5개 + `OFL.txt` | 고운바탕, Noto Serif KR, 나눔손글씨 붓 | SIL Open Font License 1.1 |
| 원문 | `design/research/원문_*.md` | 위키문헌·규장각·한국고전종합DB | 공유 저작물(구두점은 아래 참고) |
| 풀이·대사·카드·함정 구절 | `js/data/` | 만든이가 직접 씀 | 자체 제작 |

## 그림

### 도트 인물·소품 (`credits/sprites.tsv`)

| 파일 | 출처 | 이용 조건 | 고친 내용 |
|---|---|---|---|
| 인물 20벌: `sp_captive`, `sp_choecheok`, `sp_choesuk`, `sp_donwoo`, `sp_hongdo`, `sp_jinwigyeong`, `sp_joseon_sailor`, `sp_merchant_jp`, `sp_merchant_ming`, `sp_ming_soldier`, `sp_mongseok`, `sp_mongseon`, `sp_okyoung_f`, `sp_okyoung_joseon`, `sp_okyoung_m`, `sp_okyoung_ming`, `sp_pirate`, `sp_sailor_sea`, `sp_sailor_west`, `sp_simssi` | Codex CLI 이미지 생성(자체 생성). 프롬프트 `tools/make_sprites.py` → `tools/prompts/sp_*.txt` | 자체 생성물(상업 이용 가능) | 배경 제거·프레임 자르기·발밑 맞추기·축소·색 줄임(`tools/process_sprites.py`) |
| 소품 34가지: `pr_anchor`, `pr_bamboo`, `pr_barrels`, `pr_boat`, `pr_boulder`, `pr_buddha`, `pr_bush`, `pr_cave`, `pr_crates`, `pr_fanpalm`, `pr_fishboat`, `pr_joseonship`, `pr_jphouse`, `pr_jpship`, `pr_junk`, `pr_lantern`, `pr_lantern_stone`, `pr_mast`, `pr_minggate`, `pr_minghouse`, `pr_netrack`, `pr_nets`, `pr_palm`, `pr_pier`, `pr_pine`, `pr_post`, `pr_reeds`, `pr_rocks`, `pr_sacks`, `pr_signal`, `pr_signal_lit`, `pr_thatch`, `pr_tilehouse`, `pr_willow` | Codex CLI 이미지 생성(자체 생성). 프롬프트 `tools/prompts/props_*.txt` | 자체 생성물(상업 이용 가능) | 같음 |

모두 `assets/sprites/<이름>.png`입니다. 땅 무늬(흙길·돌판·모래·물결)와 빛·그림자는 그림 파일이 아니라 코드로 그립니다(`js/game/tiles.js`).

### 장면 삽화·대화 초상 (`credits/art.tsv`)

| 파일 | 출처 | 이용 조건 | 고친 내용 |
|---|---|---|---|
| 장면 54장(`assets/sc/*.webp`): `sc_prologue_*` 5, `sc_namwon_*` 8, `sc_nanggoya_*` 6, `sc_annam_*` 6, `sc_act1_end`, `sc_interlude_*` 4, `sc_hangzhou_*` 7, `sc_letter_*` 3, `sc_sea_*` 5, `sc_island_*` 2, `sc_suncheon_landing`, `sc_ending_*` 4, `sc_orig_ending`, `sc_kimyc_moon` | Codex CLI 이미지 생성(자체 생성), 현대 그림책풍. 프롬프트 `tools/make_prompts.py` → `tools/prompts/sc_*.txt`, 화풍 참조 `design/style-samples/style_picturebook.png` | 자체 생성물(상업 이용 가능) | 1280px 폭으로 줄여 webp로 바꿈(`tools/process_assets.py`) |
| 초상 20장(`assets/pt/*.webp`): `pt_captive`, `pt_choecheok`, `pt_choesuk`, `pt_donwoo`, `pt_hongdo`, `pt_jangyukbul`, `pt_jinwigyeong`, `pt_joseon_sailor`, `pt_merchant`, `pt_merchant_jp`, `pt_merchant_ming`, `pt_ming_soldier`, `pt_mongseok`, `pt_mongseon`, `pt_okyoung`, `pt_pirate`, `pt_sailor`, `pt_sailor_west`, `pt_simssi`, `pt_songwoo` | Codex CLI 이미지 생성(자체 생성). 프롬프트 `tools/prompts/pt_*.txt`, 참조 그림 `assets/ui/hud_okyoung.webp` | 자체 생성물(상업 이용 가능) | 줄여 webp로 바꿈 |
| 화풍 시안 4장(`design/style-samples/style_{woodblock,ink,documentary,picturebook}.png`)과 모음 그림 `style_compare.png` | Codex CLI 이미지 생성(자체 생성). 프롬프트 `tools/prompts/style_*.txt` | 자체 생성물(상업 이용 가능) | 고르는 데만 씀(게임에는 들어가지 않음) |

그림마다 다시 만든 까닭과 남은 흠은 `design/ui/삽화_검수.md`에 적었습니다. 그림 안에는 글자·낙관·서명을 넣지 않았습니다.

### 화면 그림 (`credits/ui.tsv`)

| 파일 | 출처 | 이용 조건 | 고친 내용 |
|---|---|---|---|
| `assets/ui/title.webp` 타이틀 그림 | Codex CLI 이미지 생성(자체 생성). 프롬프트 `tools/prompts/ui_title.txt`, 화풍 참조 `style_picturebook.png` | 자체 생성물(상업 이용 가능) | 1600px로 줄여 webp(품질 80)로 바꿈 |
| `assets/ui/oldmap.webp` 고지도 | Codex CLI 이미지 생성(자체 생성). 프롬프트 `tools/prompts/ui_oldmap.txt` | 자체 생성물(상업 이용 가능) | webp(품질 80)로 바꿈. 지명·뱃길은 그림에 없고 화면 글자로 얹음. 2026-10-07 조선 반도를 크게, 지리를 더 정확히 다시 생성 |
| `assets/ui/hud_okyoung.webp` 옥영 초상(HUD) | Codex CLI 이미지 생성(자체 생성). 프롬프트 `tools/prompts/ui_portrait.txt` | 자체 생성물(상업 이용 가능) | 얼굴 둘레만 잘라 256px webp로 바꿈 |
| `assets/ui/paper.webp` 한지 무늬 | Codex CLI 이미지 생성(자체 생성). 프롬프트 `tools/prompts/ui_paper.txt` | 자체 생성물(상업 이용 가능) | 512px로 줄이고 반 칸 밀어 겹쳐 이음새를 없앤 뒤 webp로 바꿈 |
| `assets/ui/icon-192.png`·`icon-512.png` 앱 아이콘 | 타이틀 그림 `assets/ui/title.webp`(자체 생성물)에서 잘라 만듦 | 자체 생성물(상업 이용 가능) | 옥영의 얼굴과 등불 둘레를 정사각형으로 잘라 192px·512px PNG로(Pillow). 글자 없음 |
| `assets/ui/og-thumb.jpg` 링크 미리 보기 | 타이틀 그림 `assets/ui/title.webp`(자체 생성물)에서 잘라 만듦 | 자체 생성물(상업 이용 가능) | 위아래를 조금 잘라 1200×630 JPG로(Pillow). 글자 없음 |

## 소리 (`credits/audio.tsv`)

### 배경음 9곡

모두 국립국악원 「디지털 이음」 악구 다운로드(https://www.gugak.go.kr/digitaleum/front/phrase/list.do)의 국악기 연주 악구입니다. 이용 조건은 **공공누리 제1유형(출처표시)** 으로, 출처를 밝히면 상업적 이용과 변경이 모두 됩니다. 사이트에 연주자 이름은 없습니다(국립국악원 제작 음원).

한 연주를 번호 차례대로 잘게 나눈 악구를 차례대로 이어 붙였습니다. 악구 앞뒤 무음을 줄이고, 40ms 겹쳐 잇고, 끝과 처음을 1.5초 겹쳐 되풀이 이음매를 없애고, 소리 크기를 -17 LUFS로 맞춰 모노 64kbps mp3로 만들었습니다(`tools/make_bgm.py`). 안남 밤 포구 곡만 퉁소가 위에 얹히므로 -22 LUFS로 작게 만들었습니다.

| 파일 | 쓰는 곳 | 곡(디지털 이음 표기) | 악구 코드 |
|---|---|---|---|
| `assets/bgm/namwon_memory.mp3` | 남원 회상 | 대금 산조(이영섭류) 진양조 01~06 | w3-001-001~006 |
| `assets/bgm/flight.mp3` | 피란길 | 한갑득류 거문고산조 엇모리 01~05 | S2-001-029~033 |
| `assets/bgm/nanggoya.mp3` | 낭고야 | 윤윤석류 아쟁산조 진양조 01~06 | S4-001-001~006 |
| `assets/bgm/annam_night.mp3` | 안남 밤 포구 | 한갑득류 거문고산조 중모리 01~08 | S2-001-015~022 |
| `assets/bgm/hangzhou.mp3` | 항주 | 성금련류 가야금산조 늦은중중모리(악구 032·038 뺌) | s1-001-028~031·033~037·039 |
| `assets/bgm/sea.mp3` | 바다 | 소금 연례악 수제천 | w4-440-010·012·014·019·022~025 |
| `assets/bgm/island.mp3` | 섬 | 지영희류 해금산조 진양조 01~06 | S3-001-001~006 |
| `assets/bgm/reunion.mp3` | 남원 재회 | 가야금 경기민요 도라지·아리랑(세마치) | s1-913-001~002, s1-914-001~004 |
| `assets/bgm/result.mp3` | 결과 화면 | 가야금 경기민요 천안삼거리·한강수타령·창부타령(굿거리) | s1-915-001~002, s1-916-001~003, s1-918-001~003 |

원음은 같은 만든이의 「영웅의 길」이 2026-09-29에 같은 사이트에서 받은 것을 썼습니다. 그래서 `annam_night`를 뺀 여덟 곡은 「영웅의 길」의 곡과 같은 파일입니다(같은 원음·같은 손질). `annam_night`는 「영웅의 길」의 가문 장면 곡과 같은 원음을 더 작게 다시 만든 것입니다. 「영웅의 길」은 내려받을 때 사용목적을 '비상업용'으로 적었습니다. 이용 조건은 공공누리 제1유형이라 상업 이용이 허락되어 있지만, 납품 기록을 깔끔히 하려면 **사용목적 '상업용'으로 다시 받기를 권합니다**(파일은 같으므로 게임은 바뀌지 않습니다). 자세한 내용은 `design/research/음원_이용조건.md`.

### 퉁소(안남 포구의 퉁소 가락)

- **지금은 브라우저가 만든 합성음**입니다(계면조 가락에 대금 소리, 굵은 숨소리, 청 울림을 더함, `js/core/audio.js`). 파일이 없어 이용 조건도 따로 없습니다.
- 디지털 이음에 실제 퉁소 연주가 있습니다. 단음 다운로드 → 관악기 → 퉁소의 **연주 「애원성」(`Tungso_8.wav`, 공공누리 제1유형)** 입니다. 내려받을 때 사용목적·용도·기관명을 직접 적어야 해서 아직 받지 못했습니다.
- 받는 차례(`design/research/음원_이용조건.md` §3): 받은 파일을 `assets/raw_audio/tongso/`에 넣고 `python tools/make_tongso.py`를 실행합니다. `assets/sfx/tongso.mp3`·`tongso_data.js`가 생기고 `js/data/bgm.js`의 `tongso` 줄이 바뀝니다. 그다음 `credits/audio.tsv`에 두 줄(같은 문서 §3에 적어 둠)을 넣고 `cd tests && node audio.mjs`로 점검합니다. 게임 안 출처 화면의 퉁소 줄은 `bgm.js`를 읽어 저절로 바뀝니다.
- 퉁소를 받을 수 없으면 같은 조건의 단소·소금·대금 연주로 대신하고, 이야기 수첩과 출처 화면에 "퉁소 대신 ○○ 연주"라고 밝힙니다(`make_tongso.py --instrument 단소`).

### 효과음과 대체 곡

- 효과음(종이 넘김·물결·바람·모닥불·게이지 오름/내림)은 모두 브라우저에서 합성합니다. 파일이 없습니다.
- 배경음 파일을 읽지 못하면 합성 곡으로 바꿔 틉니다. 합성 엔진(가야금·대금·해금·장구·징·잔향)과 곡은 같은 만든이의 「영웅의 길」에서 가져왔습니다(자체 제작).

## 글꼴 (`credits/fonts.tsv`)

세 글꼴 모두 **SIL Open Font License 1.1**입니다. 상업적 이용·재배포가 되고, 글꼴만 따로 팔 수는 없습니다. 라이선스 전문과 저작권 표시는 `assets/fonts/OFL.txt`에 함께 두었습니다. 게임에 쓰인 글자만 남긴 부분 글꼴이며, 글꼴 이름을 바꾸었습니다(`tools/build_fonts.py`).

| 파일 | 원래 글꼴 | 저작권 | 쓰는 곳 · 고친 내용 |
|---|---|---|---|
| `assets/fonts/batang.woff2`, `batang-bold.woff2` | Gowun Batang(고운바탕) Regular·Bold | Copyright 2021 The Gowun Batang Project Authors | 본문·단추·HUD. 이름 HangroBatang |
| `assets/fonts/hanja.woff2`, `hanja-bold.woff2` | Noto Serif KR(굵기 400·700) | Copyright 2012 Google Inc. | 고운바탕에 없는 한자·기호. 이름 HangroHanja |
| `assets/fonts/brush.woff2` | Nanum Brush Script(나눔손글씨 붓) | Copyright (c) 2010, NHN Corporation | 제목·거점 이름. 예약 글꼴 이름 'Nanum'을 쓸 수 없어 이름을 HangroBrush로 바꿈 |

원본 글꼴(`tools/fonts_src/*.ttf`)과 각 글꼴의 OFL 전문(`tools/fonts_src/OFL-*.txt`)은 Google Fonts 저장소(https://github.com/google/fonts/tree/main/ofl)에서 받아 고치지 않고 두었습니다. 부분 글꼴을 다시 만들 때 씁니다.

## 원문과 글

| 무엇 | 출처 | 조건 · 비고 |
|---|---|---|
| 「최척전」 원문 | 위키문헌 「최척전」(https://ko.wikisource.org/wiki/최척전, 2025-03-09 판) | 공유 저작물(`PD-old-100`). 전체는 `design/research/원문_최척전.md` |
| 「최척전」 판독 대조 | 서울대 규장각한국학연구원 일사문고본 「崔陟傳」(一簑古813.53-J568c) 원문 이미지 | 위키문헌 글자 몇 곳을 이 본의 이미지로 바로잡음(庚子→庚申, 潔齊飯豆→潔齋修享, 浪[姑?]射, 廣原→廣衆). 판독 노트는 `원문_최척전.md`와 `01_원문_사실확인.md` §1-3 |
| 「김영철전」 원문 | 한국고전번역원 한국고전종합DB, 홍세태 『유하집』 권9 「金英哲傳」(한국문집총간 167) | 원문은 공유 저작물. **구두점은 DB의 표점본을 따랐으므로, 납품하기 전에 DB 이용 조건을 확인하거나 구두점을 새로 찍어야 합니다.** 전체는 `design/research/원문_김영철전.md` |
| 원문 풀이(번역) | 만든이가 직접 옮김 | 교과서·모의평가·시중 번역서의 문장을 쓰지 않음 |
| 시구 맞추기 함정 구절 A·B | 만든이가 직접 지음 | 함정 C(최척의 화답시 「瑤臺繚緲」 구절)만 원문 |
| 대사·사건 글·원작 대조 카드·게임 설정 카드 | 만든이가 직접 씀 | — |
| 역사 카드 7장 | 만든이가 직접 씀 | 백과사전·논문·기사를 참고했고 카드마다 참고 자료를 적음(`js/data/history.js`의 `src`, 목록은 `01_원문_사실확인.md` §10) |

## 만든 도구

| 도구 | 쓴 곳 |
|---|---|
| Codex CLI 이미지 생성(image_gen) | 도트 시트, 장면 삽화, 초상, 화면 그림, 화풍 시안. 부르는 스크립트 `tools/gen.ps1`·`genqueue.ps1`·`genretry.ps1` |
| Python(Pillow, SciPy, NumPy) | 도트 손질 `tools/process_sprites.py`, 삽화 줄이기 `tools/process_assets.py`, 배경음·퉁소 `tools/make_bgm.py`·`make_tongso.py` |
| ffmpeg | 배경음·퉁소 mp3 만들기 |
| fontTools | 부분 글꼴 `tools/build_fonts.py` |
| 「영웅의 길」 엔진 | 같은 만든이의 앞선 게임에서 탑다운 맵·대화·단계 실행·저장·소리·화면 부품을 가져와 고침(싸움·기술은 뺌) |
| Node.js + Playwright(설치된 크롬) | 자동 점검(`tests/`) |
