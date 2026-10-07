# -*- coding: utf-8 -*-
"""게임에 쓰인 글자만 남긴 부분 글꼴(woff2)을 만든다.

    python tools/build_fonts.py

원본 글꼴(모두 SIL Open Font License 1.1)은 tools/fonts_src/에 둔다.
  - GowunBatang-Regular.ttf·Bold.ttf https://github.com/google/fonts/tree/main/ofl/gowunbatang (본문·단추·HUD: 고운바탕)
  - NotoSerifKR-VF.ttf          https://github.com/google/fonts/tree/main/ofl/notoserifkr (고운바탕에 없는 한자·기호만 채운다)
  - NanumBrushScript-Regular.ttf https://github.com/google/fonts/tree/main/ofl/nanumbrushscript (제목·거점 이름)
없으면 위 주소에서 내려받는다(「영웅의 길」의 같은 도구를 이 게임에 맞게 고친 것).

글이나 데이터를 고쳐 새 글자가 생겼다면 이 스크립트를 다시 돌리세요.
  - 바탕(고운바탕): js/**/*.js, index.html, css/**/*.css에 나오는 모든 글자
  - 한자 채움(Noto Serif KR): 위 글자 가운데 고운바탕에 없는 글자(한자·몇몇 기호)
  - 붓글씨: 제목·거점 이름처럼 붓글씨로 보이는 글자(js/data/flow.js와 거점 파일의 name, 아래 BRUSH_EXTRA)
OFL은 수정본(부분 글꼴 포함)이 원래의 예약 이름을 쓰지 못하게 하므로 글꼴 이름을 HangroBatang·HangroHanja·HangroBrush로 바꾼다
(고운바탕은 예약 이름이 없지만, 기기에 깔린 원본과 섞이지 않게 같은 방식으로 이름을 바꾼다).
Noto Serif KR에 없는 드문 한자는 브라우저가 기기 글꼴로 대신 그린다.
"""
import os, re, glob, urllib.request
from fontTools.ttLib import TTFont
from fontTools import subset
from fontTools.varLib import instancer

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'tools', 'fonts_src')
OUT = os.path.join(ROOT, 'assets', 'fonts')
os.makedirs(SRC, exist_ok=True)
os.makedirs(OUT, exist_ok=True)

URLS = {
    'GowunBatang-Regular.ttf': 'https://github.com/google/fonts/raw/main/ofl/gowunbatang/GowunBatang-Regular.ttf',
    'GowunBatang-Bold.ttf': 'https://github.com/google/fonts/raw/main/ofl/gowunbatang/GowunBatang-Bold.ttf',
    'OFL-GowunBatang.txt': 'https://github.com/google/fonts/raw/main/ofl/gowunbatang/OFL.txt',
    'NotoSerifKR-VF.ttf': 'https://github.com/google/fonts/raw/main/ofl/notoserifkr/NotoSerifKR%5Bwght%5D.ttf',
    'NanumBrushScript-Regular.ttf': 'https://github.com/google/fonts/raw/main/ofl/nanumbrushscript/NanumBrushScript-Regular.ttf',
    # 라이선스 전문(OFL은 글꼴과 함께 라이선스 전문을 배포하도록 요구한다)
    'OFL-NotoSerifKR.txt': 'https://raw.githubusercontent.com/google/fonts/main/ofl/notoserifkr/OFL.txt',
    'OFL-NanumBrushScript.txt': 'https://raw.githubusercontent.com/google/fonts/main/ofl/nanumbrushscript/OFL.txt',
}
for name, url in URLS.items():
    p = os.path.join(SRC, name)
    if not os.path.exists(p):
        print('내려받는 중', name)
        urllib.request.urlretrieve(url, p)

# 붓글씨로 보이는 엔진 글(가로 안내, 준비 중 화면, 끝 화면, 고지도 나라 이름)
#  + 내용 화면의 붓글씨 제목: 장육불 꿈(texts.js DREAM.title) · 퉁소가 떠오르는 순간(poem.js) · 시구 맞추기 제목(poem.js)
#    · 결과 화면 제목(notes.js result.title) · 수첩·1차시 끝·결말·「김영철전」·재회처럼 제목으로 쓰일 글자
BRUSH_EXTRA = ('두 개의 항로최척전가로로 돌려 주세요준비 중이야기의 끝조선일본중국안남시험 맵0123456789—·「」'
               '장육불 꿈남원, 그 봄밤의 가락그 밤의 시로 답하자'
               '나의 수첩1차시는 여기까지원작의 결말김영철전재회')


def read(path):
    with open(path, encoding='utf-8') as fh:
        return fh.read()


def source_files():
    files = glob.glob(os.path.join(ROOT, 'js', '**', '*.js'), recursive=True)
    files += glob.glob(os.path.join(ROOT, 'css', '**', '*.css'), recursive=True)
    files.append(os.path.join(ROOT, 'index.html'))
    return files


def used_chars():
    chars = set(chr(c) for c in range(0x20, 0x7F))
    for f in source_files():
        chars |= set(read(f))
    chars |= set('「」『』〈〉《》·…—–→←↑↓▶▼▲◆▸✎✕“”‘’')
    return ''.join(sorted(c for c in chars if c >= ' '))


def brush_chars():
    text = BRUSH_EXTRA
    flow = os.path.join(ROOT, 'js', 'data', 'flow.js')
    if os.path.exists(flow):
        src = read(flow)
        text += ''.join(re.findall(r"(?:title|subtitle|name): '([^']+)'", src))
    for f in glob.glob(os.path.join(ROOT, 'js', 'data', 'places', '*.js')):
        src = read(f)
        text += ''.join(re.findall(r"^\s*name: '([^']+)'", src, re.M))
        # 한 줄에 다른 칸과 함께 적은 맵 이름(맵 위 지역 띠): { name: '이름 없는 섬', theme: … } · island({ name: '…', night: … })
        text += ''.join(re.findall(r"name: '([^']+)',\s*(?:theme|night|spawn|grid):", src))
    return ''.join(sorted(set(text)))


def rename(font, family):
    # 예약 글꼴 이름(Reserved Font Name, 예: NanumBrush)이 남지 않도록 고유 ID(3)도 바꾼다
    for rec in font['name'].names:
        if rec.nameID in (1, 4, 16, 21):
            rec.string = family
        elif rec.nameID == 6:
            rec.string = family.replace(' ', '')
        elif rec.nameID == 3:
            rec.string = family.replace(' ', '') + ';subset'


def build(src, out, text, family, weight=None):
    font = TTFont(src)
    if 'fvar' in font:
        font = instancer.instantiateVariableFont(font, {'wght': weight or 400})
    opts = subset.Options()
    opts.flavor = 'woff2'
    opts.layout_features = ['*']
    opts.name_IDs = ['*']
    opts.notdef_outline = True
    sub = subset.Subsetter(opts)
    sub.populate(text=text)
    sub.subset(font)
    rename(font, family)
    font.flavor = 'woff2'
    font.save(out)
    print(os.path.basename(out), os.path.getsize(out) // 1024, 'KB')


text = used_chars()
batang_cmap = set(TTFont(os.path.join(SRC, 'GowunBatang-Regular.ttf')).getBestCmap().keys())
# 고운바탕에 없는 글자(주로 한자)만 Noto Serif KR에서 채운다
hanja = ''.join(c for c in text if ord(c) > 0x7F and ord(c) not in batang_cmap) or '緣'
build(os.path.join(SRC, 'GowunBatang-Regular.ttf'), os.path.join(OUT, 'batang.woff2'), text, 'HangroBatang')
build(os.path.join(SRC, 'GowunBatang-Bold.ttf'), os.path.join(OUT, 'batang-bold.woff2'), text, 'HangroBatang Bold')
build(os.path.join(SRC, 'NotoSerifKR-VF.ttf'), os.path.join(OUT, 'hanja.woff2'), hanja, 'HangroHanja', 400)
build(os.path.join(SRC, 'NotoSerifKR-VF.ttf'), os.path.join(OUT, 'hanja-bold.woff2'), hanja, 'HangroHanja Bold', 700)
build(os.path.join(SRC, 'NanumBrushScript-Regular.ttf'), os.path.join(OUT, 'brush.woff2'), brush_chars(), 'HangroBrush')
# 예전 이름의 명조 부분 글꼴은 더 쓰지 않는다
for old in ('myeongjo.woff2', 'myeongjo-bold.woff2'):
    if os.path.exists(os.path.join(OUT, old)):
        os.remove(os.path.join(OUT, old))
with open(os.path.join(OUT, 'OFL.txt'), 'w', encoding='utf-8', newline='\n') as f:
    f.write('assets/fonts의 글꼴은 SIL Open Font License 1.1을 따른다.\n'
            '- batang.woff2, batang-bold.woff2: Gowun Batang (Copyright 2021 The Gowun Batang Project Authors)의 부분 글꼴, 이름을 HangroBatang으로 바꿈\n'
            '- hanja.woff2, hanja-bold.woff2: Noto Serif KR (Copyright 2012 Google Inc.)의 부분 글꼴(고운바탕에 없는 한자·기호만), 이름을 HangroHanja로 바꿈\n'
            '- brush.woff2: Nanum Brush Script (Copyright (c) 2010, NHN Corporation)의 부분 글꼴, 이름을 HangroBrush로 바꿈\n'
            '  (Nanum·NanumBrush 등은 예약 글꼴 이름이라 부분 글꼴에는 쓰지 않았다)\n'
            '다시 만들기: python tools/build_fonts.py\n'
            '라이선스 전문: https://openfontlicense.org/open-font-license-official-text/ — 아래에 원 글꼴의 저작권 표시와 전문을 그대로 붙인다.\n')
    for name, title in [('OFL-GowunBatang.txt', 'Gowun Batang'), ('OFL-NotoSerifKR.txt', 'Noto Serif KR'), ('OFL-NanumBrushScript.txt', 'Nanum Brush Script')]:
        f.write('\n' + '=' * 72 + '\n' + title + '\n' + '=' * 72 + '\n' + read(os.path.join(SRC, name)).replace('\r\n', '\n').rstrip() + '\n')
