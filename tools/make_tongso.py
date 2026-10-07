# -*- coding: utf-8 -*-
"""퉁소 실제 연주(디지털 이음 「단음 다운로드」 퉁소)를 안남 장면용 짧은 가락으로 만든다.

    python tools/make_tongso.py [--src 원음.wav] [--instrument 퉁소] [--from "출처 설명"] [--max 20] [--out 폴더] [--no-patch]

- 기본 원음: assets/raw_audio/tongso/Tungso_8.wav (퉁소 '연주 — 애원성', 국립국악원 디지털 이음, 공공누리 제1유형)
  받는 방법은 design/research/음원_이용조건.md의 '선생님께 부탁드릴 것'을 본다.
  내려받기 창(사용목적·기관명)은 사람이 직접 적어야 하므로 이 도구는 내려받지 않는다.
- 퉁소를 못 받아 단소 등으로 바꿀 때: --src 그 파일 --instrument 단소 --from "…" (게임 안 이야기 수첩·크레딧에
  "퉁소 대신 단소 연주"가 나오도록 instrument 값이 js 쪽으로 그대로 넘어간다)
- 하는 일: 앞뒤 무음 줄이기 → 길면 --max초 안에서 가장 조용한 곳(숨 쉬는 틈)에서 자르기 → 처음 30ms·끝 0.6초 서서히
  → -16 LUFS로 맞추기 → 모노 64kbps mp3(assets/sfx/tongso.mp3)
  → file://로 열어도 필터를 걸 수 있게 같은 소리를 base64로 담은 assets/sfx/tongso_data.js도 만든다.
- 끝나면 js/data/bgm.js의 `tongso: null,` 줄을 파일을 가리키게 바꾼다(--no-patch면 그대로 둔다).
"""
import base64
import json
import os
import re
import subprocess
import sys

import numpy as np
from scipy.io import wavfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from make_bgm import FFMPEG, ROOT, SR, load, loudnorm, trim  # noqa: E402

DEFAULT_SRC = os.path.join(ROOT, "assets", "raw_audio", "tongso", "Tungso_8.wav")
DEFAULT_FROM = "국립국악원 디지털 이음 「단음 다운로드」 퉁소 — 연주: 애원성(Tungso_8)"


def cut(x, max_s):
    """max_s초보다 길면 0.6·max_s ~ max_s초 사이에서 가장 조용한 100ms 창의 가운데에서 자른다."""
    if len(x) <= max_s * SR:
        return x
    w = int(0.1 * SR)
    lo, hi = int(0.6 * max_s * SR), int(max_s * SR)
    best, at = None, hi
    for s in range(lo, hi - w, w // 2):
        e = float(np.sqrt(np.mean(x[s:s + w] ** 2)))
        if best is None or e < best:
            best, at = e, s + w // 2
    return x[:at]


def fades(x, fin=0.03, fout=0.6):
    y = x.copy()
    a, b = int(fin * SR), min(len(y) // 2, int(fout * SR))
    y[:a] *= np.linspace(0, 1, a)
    y[-b:] *= np.cos(np.linspace(0, np.pi / 2, b))
    return y


def main(argv):
    try:
        sys.stdout.reconfigure(encoding="utf-8")  # 윈도 콘솔에서 한글이 깨지지 않게
    except Exception:
        pass
    opt = {"src": DEFAULT_SRC, "instrument": "퉁소", "from": DEFAULT_FROM, "max": "20", "out": os.path.join(ROOT, "assets", "sfx")}
    patch = True
    i = 0
    while i < len(argv):
        k = argv[i]
        if k == "--no-patch":
            patch = False; i += 1; continue
        if k.startswith("--") and k[2:] in opt:
            opt[k[2:]] = argv[i + 1]; i += 2; continue
        raise SystemExit("모르는 옵션: " + k)
    if not os.path.exists(opt["src"]):
        raise SystemExit(f"{opt['src']} 파일이 없음 — design/research/음원_이용조건.md의 '선생님께 부탁드릴 것'을 보세요")
    os.makedirs(opt["out"], exist_ok=True)
    x = trim(load(opt["src"]), lead=0.05, tail=0.6)
    x = fades(cut(x, float(opt["max"])))
    x = x / max(1e-6, np.max(np.abs(x))) * 0.9
    tmp = os.path.join(opt["out"], "_tmp.wav")
    wavfile.write(tmp, SR, x.astype(np.float32))
    mp3 = os.path.join(opt["out"], "tongso.mp3")
    li = loudnorm(tmp, mp3, -16.0)
    os.remove(tmp)
    b64 = base64.b64encode(open(mp3, "rb").read()).decode("ascii")
    meta = {"instrument": opt["instrument"], "from": opt["from"], "seconds": round(len(x) / SR, 2)}
    js = os.path.join(opt["out"], "tongso_data.js")
    with open(js, "w", encoding="utf-8", newline="\n") as f:
        f.write("'use strict';\n// tools/make_tongso.py가 만든 파일(손대지 않음). assets/sfx/tongso.mp3와 같은 소리를 base64로 담았다.\n")
        f.write("// file://로 열면 fetch를 못 쓰므로, 소리 엔진이 이 파일을 script로 불러 Web Audio로 풀어 쓴다.\n")
        f.write("window.TONGSO_DATA = " + json.dumps(dict(meta, b64=b64), ensure_ascii=False) + ";\n")
    print(f"{opt['instrument']}: {meta['seconds']}초 (원래 {li:.1f} → -16 LUFS) mp3 {os.path.getsize(mp3) // 1024}KB, js {os.path.getsize(js) // 1024}KB")
    if patch:
        p = os.path.join(ROOT, "js", "data", "bgm.js")
        s = open(p, encoding="utf-8").read()
        entry = ("tongso: { src: 'assets/sfx/tongso.mp3', js: 'assets/sfx/tongso_data.js', instrument: " + json.dumps(opt["instrument"], ensure_ascii=False)
                 + ", from: " + json.dumps(opt["from"], ensure_ascii=False) + " },")
        s2, n = re.subn(r"^(\s*)tongso:.*$", lambda m: m.group(1) + entry, s, count=1, flags=re.M)
        if n:
            open(p, "w", encoding="utf-8", newline="\n").write(s2)
            print("js/data/bgm.js의 tongso 줄을 바꿨어요")
        else:
            print("js/data/bgm.js에서 tongso 줄을 못 찾았어요 — 손으로 넣어 주세요:\n  " + entry)
    print("credits/audio.tsv에 assets/sfx/tongso.mp3·tongso_data.js 두 줄(출처·이용 조건·고친 내용)을 넣어 주세요 — 넣지 않으면 tests/audio.mjs가 실패합니다")


if __name__ == "__main__":
    main(sys.argv[1:])
