# -*- coding: utf-8 -*-
"""국립국악원 디지털 이음 악구(assets/raw_audio/<폴더>/*.wav)를 장면별 배경음(assets/bgm/<장면>.mp3)으로 엮는다.

    python tools/make_bgm.py [--raw 원음폴더] [장면 이름...]

- 같은 만든이의 「영웅의 길」 tools/make_bgm.py를 이 게임의 장면에 맞게 고쳤다(악구 고르기·장면 이름·음량).
- 악구는 한 연주를 번호 순서대로 잘게 나눈 것이라, 순서대로 이으면 실제 곡의 한 대목이 된다.
- 악구마다 앞뒤의 긴 무음만 줄이고(숨 쉬는 틈은 남김) 아주 짧게(40ms) 겹쳐 잇는다(딸깍 소리 없게).
- 끝을 처음과 1.5초 겹쳐 두어, 되풀이할 때 이음매가 들리지 않게 한다.
- 음량은 곡마다 같은 크기(-17 LUFS, 두 번 재어 선형으로)로 맞추고, 모노 64kbps mp3로 줄인다.
  안남 밤 포구(annam_night)는 퉁소 소리가 위에 얹히므로 더 작게(-22 LUFS) 만든다.
- 원음(assets/raw_audio)은 용량이 커서 저장소에 올리지 않는다. 출처: 국립국악원 디지털 이음(공공누리 제1유형).
  영웅의 길 폴더에 같은 원음이 있으면 --raw "../영웅소설/assets/raw_audio"처럼 그 폴더를 읽어도 된다(읽기만 한다).
"""
import json
import os
import re
import shutil
import subprocess
import sys

import numpy as np
from scipy.io import wavfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "assets", "bgm")
SR = 48000
# ffmpeg: PATH에 없으면 흔히 두는 자리에서 찾는다
FFMPEG = shutil.which("ffmpeg") or next((p for p in [os.path.join(os.path.expanduser("~"), "ffmpeg", "bin", "ffmpeg.exe"), os.path.join("C:" + os.sep, "ffmpeg", "bin", "ffmpeg.exe")] if os.path.exists(p)), "ffmpeg")


def ids(prefix, nums):
    return [f"{prefix}{n:03d}" for n in nums]


# 장면 이름(js/data/bgm.js의 BGM.tracks와 같음) → (악구 폴더, 악구 번호 순서, 목표 음량 LUFS)
#  악구 번호는 디지털 이음 「악구 다운로드」의 악구 코드다(credits/audio.tsv에 곡 이름과 함께 적었다).
TRACKS = {
    # 남원 회상·퉁소의 밤: 대금 산조 진양조(계면조) — 바람 소리 같은 관악기로 밤의 정서를
    "namwon_memory": ("daegeum_sanjo", ids("w3-001-", range(1, 7)), -17),
    # 피란: 한갑득류 거문고 산조 엇모리 — 쫓기는 걸음
    "flight": ("geomungo_sanjo", ids("S2-001-", range(29, 34)), -17),
    # 낭고야 포로살이: 윤윤석류 아쟁 산조 진양조 — 가장 깊은 슬픔
    "nanggoya": ("ajaeng_sanjo", ids("S4-001-", range(1, 7)), -17),
    # 안남 밤 포구: 한갑득류 거문고 산조 중모리 — 낮고 성긴 줄 소리(퉁소가 위에 얹힌다)
    "annam_night": ("geomungo_sanjo", ids("S2-001-", range(15, 23)), -22),
    # 항주: 성금련류 가야금 산조 중중모리 — 흐르는 강과 정착한 삶
    "hangzhou": ("gayageum_sanjo", ids("s1-001-", [28, 29, 30, 31, 33, 34, 35, 36, 37, 39]), -17),
    # 바다·항해: 소금 연례악 수제천 — 넓고 느리게 출렁이는 가락
    "sea": ("sogeum_court", ids("w4-440-", [10, 12, 14, 19, 22, 23, 24, 25]), -17),
    # 섬: 지영희류 해금 산조 진양조 — 외딴 곳의 홀로 남은 소리
    "island": ("haegeum_sanjo", ids("S3-001-", range(1, 7)), -17),
    # 재회: 가야금 경기민요 도라지·아리랑(세마치) — 따뜻하게
    "reunion": ("gayageum_minyo", ["s1-913-001", "s1-913-002", "s1-914-001", "s1-914-002", "s1-914-003", "s1-914-004"], -17),
    # 결과: 가야금 경기민요 천안삼거리·한강수타령·창부타령(굿거리) — 밝게 정리
    "result": ("gayageum_minyo", ["s1-915-001", "s1-915-002", "s1-916-001", "s1-916-002", "s1-916-003", "s1-918-001", "s1-918-002", "s1-918-003"], -17),
}


def load(path):
    """어떤 표본율·형식이든 48kHz 모노 float로 읽는다(ffmpeg)."""
    r = subprocess.run([FFMPEG, "-hide_banner", "-v", "error", "-i", path, "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"], capture_output=True, check=True)
    return np.frombuffer(r.stdout, dtype=np.float32).copy()


def trim(x, lead=0.10, tail=0.35, db=-48):
    """앞뒤 무음을 줄인다. 앞은 lead초, 뒤는 tail초까지만 남긴다(울림 꼬리는 남김)."""
    peak = np.max(np.abs(x)) or 1.0
    thr = peak * 10 ** (db / 20)
    w = int(0.01 * SR)
    a = np.abs(x)
    k = len(a) // w
    blocks = a[: k * w].reshape(k, w).max(axis=1) if k else a
    on = np.nonzero(blocks > thr)[0]
    if not len(on):
        return x
    s = max(0, on[0] * w - int(lead * SR))
    e = min(len(x), (on[-1] + 1) * w + int(tail * SR))
    return x[s:e]


def join(parts, xf=0.04):
    n = int(xf * SR)
    out = parts[0].copy()
    for p in parts[1:]:
        if len(out) < n or len(p) < n:
            out = np.concatenate([out, p]); continue
        t = np.linspace(0, np.pi / 2, n)
        mix = out[-n:] * np.cos(t) + p[:n] * np.sin(t)
        out = np.concatenate([out[:-n], mix, p[n:]])
    return out


def loopify(x, f=1.5):
    """끝 f초에 처음 f초를 겹쳐 넣고 처음 f초를 잘라 낸다 → 되풀이해도 이음매가 매끄럽다."""
    n = int(f * SR)
    if len(x) < 3 * n:
        return x
    t = np.linspace(0, np.pi / 2, n)
    y = x[n:].copy()
    y[-n:] = x[-n:] * np.cos(t) + x[:n] * np.sin(t)
    return y


def loudnorm(src, dst, target=-17.0, rate="64k"):
    base = [FFMPEG, "-hide_banner", "-nostats", "-y", "-i", src]
    r = subprocess.run(base + ["-af", f"loudnorm=I={target}:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"], capture_output=True, text=True, encoding="utf-8", errors="replace")
    m = json.loads(re.findall(r"\{[^{}]*\"input_i\"[^{}]*\}", r.stderr)[-1])
    af = (f"loudnorm=I={target}:TP=-1.5:LRA=11:linear=true:measured_I={m['input_i']}:measured_TP={m['input_tp']}:"
          f"measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}")
    subprocess.run(base + ["-af", af, "-ar", "44100", "-ac", "1", "-c:a", "libmp3lame", "-b:a", rate, "-map_metadata", "-1", dst], check=True, capture_output=True)
    return float(m["input_i"])


def main(argv):
    try:
        sys.stdout.reconfigure(encoding="utf-8")  # 윈도 콘솔에서 한글이 깨지지 않게
    except Exception:
        pass
    raw = os.path.join(ROOT, "assets", "raw_audio")
    names = set()
    i = 0
    while i < len(argv):
        if argv[i] == "--raw":
            raw = os.path.abspath(argv[i + 1]); i += 2; continue
        names.add(argv[i]); i += 1
    os.makedirs(OUT, exist_ok=True)
    tmp = os.path.join(OUT, "_tmp.wav")
    total = 0
    for name, (folder, order, lufs) in TRACKS.items():
        if names and name not in names:
            continue
        d = os.path.join(raw, folder)
        if not os.path.isdir(d):
            raise SystemExit(f"{d} 폴더가 없음 — design/research/음원_이용조건.md의 '받을 파일'을 보고 원음을 받아 두세요")
        files = sorted(os.listdir(d))

        def find(code):  # 내려받은 파일 이름은 소문자이고 뒤에 글자가 붙기도 한다(s2-001-015g.wav)
            hit = [f for f in files if f.lower().endswith(".wav") and f.lower().startswith(code.lower())]
            if not hit:
                raise SystemExit(f"{folder}: {code} 파일이 없음")
            return os.path.join(d, hit[0])
        parts = [trim(load(find(c))) for c in order]
        x = loopify(join(parts))
        x = x / max(1e-6, np.max(np.abs(x))) * 0.9
        wavfile.write(tmp, SR, x.astype(np.float32))
        dst = os.path.join(OUT, name + ".mp3")
        li = loudnorm(tmp, dst, lufs)
        size = os.path.getsize(dst)
        total += size
        print(f"{name}: {len(order)}개 악구 → {len(x) / SR:.1f}초 (원래 {li:.1f} → {lufs} LUFS) {size // 1024}KB")
    if os.path.exists(tmp):
        os.remove(tmp)
    print(f"모두 {total / 1024 / 1024:.2f}MB")


if __name__ == "__main__":
    main(sys.argv[1:])
