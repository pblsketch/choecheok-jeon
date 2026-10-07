# -*- coding: utf-8 -*-
"""assets/raw/*.png(Codex 생성 원본)를 게임용 webp로 줄이고, 그림 목록(window.ART)을 맞춘다.

    python tools/process_assets.py            # 전부
    python tools/process_assets.py sc_annam_port pt_okyoung   # 고른 것만

- sc_* → assets/sc/<이름>.webp  (가로 1280px, 품질 80에서 시작해 250KB를 넘으면 품질을 낮춤)
- pt_* → assets/pt/<이름>.webp  (정사각 512px, 가운데 기준으로 잘라 냄, 80KB를 넘으면 품질을 낮춤)
- js/data/people.js의 'ART:BEGIN'~'ART:END' 사이를 assets/sc·assets/pt에 실제로 있는 파일 목록으로 다시 쓴다
  (엔진은 목록에 있는 그림만 부른다 — js/core/util.js G.util.art).
- credits/art.tsv에 assets/sc·assets/pt 파일마다 한 줄이 있게 맞춘다(이미 있는 줄은 그대로 둔다).
"""
import glob
import io
import os
import re
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, "assets", "raw")
OUT = {k: os.path.join(ROOT, "assets", k) for k in ("pt", "sc")}
for d in OUT.values():
    os.makedirs(d, exist_ok=True)

SC_W, SC_MAX = 1280, 250 * 1024
PT_W, PT_MAX = 512, 80 * 1024
CREDIT = "Codex CLI 이미지 생성(자체 생성)\t자체 생성물(상업 이용 가능)\twebp 변환·축소"


def fit_width(im, w):
    if im.width <= w:
        return im
    return im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)


def save_webp(im, path, q, limit):
    """품질 q에서 시작해 limit 바이트 이하가 될 때까지 품질을 낮춘다."""
    im = im.convert("RGB")
    while True:
        buf = io.BytesIO()
        im.save(buf, "WEBP", quality=q, method=6)
        if buf.tell() <= limit or q <= 50:
            break
        q -= 5
    with open(path, "wb") as f:
        f.write(buf.getvalue())
    return q, buf.tell()


def portrait(f):
    name = os.path.splitext(os.path.basename(f))[0]
    im = Image.open(f).convert("RGB")
    s = min(im.size)
    x0, y0 = (im.width - s) // 2, (im.height - s) // 2
    im = im.crop((x0, y0, x0 + s, y0 + s)).resize((PT_W, PT_W), Image.LANCZOS)
    q, n = save_webp(im, os.path.join(OUT["pt"], name + ".webp"), 80, PT_MAX)
    print(f"pt {name} q{q} {n // 1024}KB")


def scene(f):
    name = os.path.splitext(os.path.basename(f))[0]
    im = fit_width(Image.open(f).convert("RGB"), SC_W)
    q, n = save_webp(im, os.path.join(OUT["sc"], name + ".webp"), 80, SC_MAX)
    print(f"sc {name} {im.width}x{im.height} q{q} {n // 1024}KB")


def files(kind):
    return sorted(os.path.splitext(os.path.basename(p))[0] for p in glob.glob(os.path.join(OUT[kind], kind + "_*.webp")))


def write_registry():
    path = os.path.join(ROOT, "js", "data", "people.js")
    with open(path, encoding="utf-8") as f:
        src = f.read()
    lines = ["// ART:BEGIN — tools/process_assets.py가 assets/sc·assets/pt에 있는 파일로 채운다(손으로 고치지 않는다)"]
    for kind in ("pt", "sc"):
        for n in files(kind):
            lines.append(f"window.ART.{kind}.{n} = 'assets/{kind}/{n}.webp';")
    lines.append("// ART:END")
    block = "\n".join(lines)
    if "// ART:BEGIN" in src:
        src = re.sub(r"// ART:BEGIN.*?// ART:END", lambda m: block, src, flags=re.S)
    else:
        src = src.rstrip("\n") + "\n" + block + "\n"
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(src)
    print("registry", len(lines) - 2, "entries -> js/data/people.js")


def write_credits():
    path = os.path.join(ROOT, "credits", "art.tsv")
    with open(path, encoding="utf-8") as f:
        rows = [r for r in f.read().splitlines() if r.strip()]
    have = {r.split("\t")[0] for r in rows}
    want = [f"assets/{k}/{n}.webp" for k in ("sc", "pt") for n in files(k)]
    # 지워진 그림의 줄은 뺀다
    rows = [r for r in rows if not re.match(r"assets/(sc|pt)/", r) or r.split("\t")[0] in want]
    for w in want:
        if w not in have:
            rows.append(f"{w}\t{CREDIT}")
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write("\n".join(rows) + "\n")
    print("credits", len(want), "art rows")


if __name__ == "__main__":
    only = set(sys.argv[1:])
    for f in sorted(glob.glob(os.path.join(RAW, "*.png"))):
        name = os.path.splitext(os.path.basename(f))[0]
        if only and name not in only:
            continue
        if name.startswith("pt_"):
            portrait(f)
        elif name.startswith("sc_"):
            scene(f)
    write_registry()
    write_credits()
