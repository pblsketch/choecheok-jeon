# -*- coding: utf-8 -*-
"""도트 스프라이트 시트·소품 원본(assets/raw/sp_*.png, props_*.png)을 게임용 아틀라스로 만든다.

    python tools/process_sprites.py [이름...] [--preview]

「영웅의 길」 tools/process_sprites.py를 가져와 「최척전」에 맞게 고쳤다(걷기 3방향 × 4프레임만, 공격·도술 행 없음).
--preview: 결과를 한 장에 모은 확인용 그림을 assets/raw/_preview.png(저장소에 올리지 않음)로 쓴다.

영상에서 배운 규칙(「관동별곡」 process_assets.py에서 가져옴):
  1) 배경 제거: 마젠타 단색 배경을 색으로 빼고 가장자리 번짐을 걷어 낸다.
  2) 프레임 자동 검출: 행별 기대 개수에 맞춰 빈 틈으로 자른다(격자가 조금 어긋나도 괜찮다).
  3) 발밑 피벗: 발 부분의 가운데를 기준으로 모든 프레임을 같은 칸에 정렬한다(걸을 때 튀지 않게).
  4) PPU 기준 축소: 땅 한 칸 32px. 어른 키 48px, 아이 36px을 기준으로 같은 배율을 적용한다.
결과: assets/sprites/<이름>.png + js/data/sprites.js(프레임 크기·피벗·동작·소품 발자국, 「영웅의 길」과 같은 형식)
"""
import json
import os
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, "assets", "raw")
OUT = os.path.join(ROOT, "assets", "sprites")
os.makedirs(OUT, exist_ok=True)
JS_PATH = os.path.join(ROOT, "js", "data", "sprites.js")


def load_meta():
    """이미 만든 js/data/sprites.js를 읽어, 일부만 다시 만들 때 나머지를 지킨다."""
    if not os.path.exists(JS_PATH):
        return {}
    txt = open(JS_PATH, encoding="utf-8").read()
    i = txt.find("window.SPRITES = {")
    if i < 0:
        return {}
    return json.loads(txt[i + len("window.SPRITES = "):].strip().rstrip(";"))


META = load_meta()
WARN = []
TILE = 32


def load_rgba(name):
    im = Image.open(os.path.join(RAW, name + ".png")).convert("RGBA")
    a = np.array(im).astype(np.int16)
    rgb, alpha = a[..., :3], a[..., 3]
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    magenta = (r > 170) & (b > 170) & (g < 110) & (np.abs(r - b) < 70)
    alpha = np.where(magenta, 0, alpha)
    spill = (alpha > 0) & (r > g + 40) & (b > g + 40)
    m = np.minimum(r, b)
    rgb[..., 0] = np.where(spill, np.minimum(r, g + (m - g) // 3 + 20), r)
    rgb[..., 2] = np.where(spill, np.minimum(b, g + (m - g) // 3 + 20), b)
    near = ndimage.binary_dilation(alpha == 0, iterations=1) & (alpha > 0)
    weak = near & (r > 150) & (b > 150) & (g < 140)
    alpha = np.where(weak, 0, alpha)
    return np.dstack([rgb, alpha]).clip(0, 255).astype(np.uint8)


def split_1d(proj, n, min_gap=2):
    """1차원 투영에서 내용 구간을 n개로 나눈다. 넓은 빈 틈부터 고르고, 치우치면 균등 분할점 근처의 틈을 쓴다."""
    idx = np.nonzero(proj > 0)[0]
    if len(idx) == 0:
        return []
    lo, hi = idx.min(), idx.max() + 1
    gaps, run = [], None
    for x in range(lo, hi):
        if proj[x] == 0:
            run = x if run is None else run
        elif run is not None:
            if x - run >= min_gap:
                gaps.append((run, x))
            run = None
    if n <= 1:
        return [(lo, hi)]

    def segs(cuts):
        pts = [lo] + list(cuts) + [hi]
        return [(pts[i], pts[i + 1]) for i in range(len(pts) - 1)]

    def ok(sg):
        ws = [b - a for a, b in sg]
        return min(ws) > 0.45 * np.median(ws)

    by_width = sorted(gaps, key=lambda g: -(g[1] - g[0]))[: n - 1]
    cuts = sorted((a + b) // 2 for a, b in by_width)
    if len(cuts) == n - 1 and ok(segs(cuts)):
        return segs(cuts)
    cuts, W = [], hi - lo
    for i in range(1, n):
        target = lo + W * i / n
        cand = [((a + b) // 2) for a, b in gaps if abs((a + b) / 2 - target) < W / n * 0.45]
        if cand:
            cuts.append(min(cand, key=lambda c: abs(c - target)))
        else:
            w0, w1 = int(target - W / n * 0.3), int(target + W / n * 0.3)
            cuts.append(w0 + int(np.argmin(proj[w0:w1])))
    return segs(sorted(cuts))


def clean_mask(arr):
    mask = arr[..., 3] > 40
    lab, n = ndimage.label(mask)
    if n == 0:
        return mask
    sizes = ndimage.sum(mask, lab, range(1, n + 1))
    return np.isin(lab, np.nonzero(sizes >= 30)[0] + 1)


def grid_boxes(arr, counts):
    clean = clean_mask(arr)
    rows = split_1d(clean.sum(axis=1), len(counts), min_gap=3)
    out = []
    for (y0, y1), c in zip(rows, counts):
        cols = split_1d(clean[y0:y1].sum(axis=0), c, min_gap=2)
        out.append([(x0, y0, x1, y1) for x0, x1 in cols])
    return out, clean


def crop(arr, mask, b):
    x0, y0, x1, y1 = b
    sub = arr[y0:y1, x0:x1].copy()
    sub[..., 3] = np.where(mask[y0:y1, x0:x1], sub[..., 3], 0)
    ys, xs = np.nonzero(sub[..., 3] > 40)
    if len(ys):
        sub = sub[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    return sub


def foot_x(sub):
    """아래쪽 12% 줄의 불투명 픽셀 가운데 = 발밑 피벗 x"""
    a = sub[..., 3] > 100
    band = a[int(a.shape[0] * 0.88):]
    xs = np.nonzero(band)[1]
    if len(xs) == 0:
        xs = np.nonzero(a)[1]
    return float(np.median(xs))


def shrink(sub, s, palette=40):
    """알파를 곱한 뒤 BOX로 줄이고 색 수를 줄여 진짜 도트처럼 만든다."""
    im = Image.fromarray(sub, "RGBA")
    w, h = max(1, round(im.width * s)), max(1, round(im.height * s))
    arr = np.array(im).astype(np.float32)
    arr[..., :3] *= arr[..., 3:4] / 255.0
    pm = Image.fromarray(arr.clip(0, 255).astype(np.uint8), "RGBA").resize((w, h), Image.BOX)
    p = np.array(pm).astype(np.float32)
    al = p[..., 3:4]
    p[..., :3] = np.where(al > 0, p[..., :3] * 255.0 / np.maximum(al, 1), 0)
    p[..., 3] = np.where(p[..., 3] > 110, 255, 0)
    out = Image.fromarray(p.clip(0, 255).astype(np.uint8), "RGBA")
    rgb = out.convert("RGB").quantize(colors=palette, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert("RGB")
    return defringe(Image.merge("RGBA", (*rgb.split(), out.getchannel("A"))))


def defringe(im):
    """줄인 뒤에도 남은 마젠타 번짐(보라색 테두리·그물 구멍)을 걷는다.
    가장자리에 붙은 보라 픽셀은 지우고, 안쪽 것은 초록 값에 맞춰 무채색 쪽으로 돌린다(그림에 보라색은 쓰지 않는다)."""
    a = np.array(im).astype(np.int16)
    r, g, b, al = a[..., 0], a[..., 1], a[..., 2], a[..., 3]
    pur = (al > 0) & (r > g + 45) & (b > g + 45)
    edge = ndimage.binary_dilation(al == 0, iterations=1)
    a[..., 3] = np.where(pur & edge, 0, al)
    inner = pur & ~edge
    for c in (0, 2):
        a[..., c] = np.where(inner, np.minimum(a[..., c], g + 25), a[..., c])
    return Image.fromarray(a.clip(0, 255).astype(np.uint8), "RGBA")


# 동작 배치: 걷기 3행(아래·왼쪽·위) × 4. 오른쪽은 왼쪽을 뒤집어 쓴다(엔진).
WALK_ROWS = [[("walk_down", 4)], [("walk_left", 4)], [("walk_up", 4)]]
FPS = {"walk_down": 8, "walk_left": 8, "walk_up": 8}


def character(key, layout, height, cell=(64, 64), raw=None):
    """height: 앞모습 첫 프레임의 목표 키(px). 모든 프레임에 같은 배율을 쓴다."""
    arr = load_rgba(raw or key)
    want = [sum(n for _, n in row) for row in layout]
    rows, clean = grid_boxes(arr, want)
    first = crop(arr, clean, rows[0][0])
    scale = height / first.shape[0]
    fw, fh = cell
    px, py = fw // 2, fh - 2
    anims, frames, hs = {}, [], []
    for ri, row in enumerate(layout):
        items = rows[ri] if ri < len(rows) else []
        k = 0
        for an, n in row:
            fl = []
            for _ in range(n):
                if k >= len(items):
                    break
                sub = crop(arr, clean, items[k]); k += 1
                cx = foot_x(sub)
                im = shrink(sub, scale)
                hs.append(im.height)
                fl.append((im, cx * scale))
            if len(fl) != n:
                WARN.append(f"{key} {an}: {len(fl)}/{n} frames")
            anims[an] = {"start": len(frames), "n": len(fl), "fps": FPS.get(an, 8)}
            frames.extend(fl)
    med = float(np.median(hs)) if hs else 0
    for i, h in enumerate(hs):  # 프레임이 둘로 쪼개지거나 둘이 붙으면 키가 크게 달라진다
        if abs(h - med) > 0.18 * med:
            WARN.append(f"{key} frame {i}: height {h} (median {med:.0f})")
    cols = 4
    atlas = Image.new("RGBA", (cols * fw, ((len(frames) + cols - 1) // cols) * fh), (0, 0, 0, 0))
    for i, (im, cx) in enumerate(frames):
        x, y = round(px - cx), py - im.height
        if x < 0 or y < 0 or x + im.width > fw:
            WARN.append(f"{key} frame {i} {im.size} out of cell")
        atlas.alpha_composite(im, ((i % cols) * fw + max(0, x), (i // cols) * fh + max(0, y)))
    atlas.save(os.path.join(OUT, key + ".png"))
    META[key] = {"img": f"assets/sprites/{key}.png", "fw": fw, "fh": fh, "px": px, "py": py, "cols": cols, "anims": anims}
    print(f"{key}: {len(frames)} frames x{scale:.3f}", {a: v['n'] for a, v in anims.items()})


def props(key, defs, rows_counts):
    """defs: [(이름, 가로 칸 수, 발자국(충돌) 비율 (x0, y0, x1, y1) — 그림 안에서 막히는 부분)] 행 순서대로"""
    arr = load_rgba(key)
    rows, clean = grid_boxes(arr, rows_counts)
    boxes = [b for row in rows for b in row]
    if len(boxes) != len(defs):
        WARN.append(f"{key}: {len(boxes)}/{len(defs)} objects")
    for (name, tiles_w, foot), b in zip(defs, boxes):
        sub = crop(arr, clean, b)
        s = tiles_w * TILE / sub.shape[1]
        im = shrink(sub, s, palette=48)
        im.save(os.path.join(OUT, name + ".png"))
        w, h = im.size
        fx0, fy0, fx1, fy1 = foot
        META[name] = {"img": f"assets/sprites/{name}.png", "w": w, "h": h,
                      "foot": [round(fx0 * w), round(fy0 * h), round(fx1 * w), round(fy1 * h)]}
        print(f"  prop {name}: {w}x{h}")


# 앞모습 첫 프레임의 키(px). 어른 48 기준, 여자·노인은 조금 작게
NPC_H = {"sp_okyoung_f": 46, "sp_okyoung_joseon": 46, "sp_okyoung_ming": 46, "sp_hongdo": 45,
         "sp_simssi": 43, "sp_choesuk": 46, "sp_donwoo": 46, "sp_captive": 46}
DEFAULT_H = 48

BLOCK = (0.05, 0.4, 0.95, 1.0)
TREE = (0.4, 0.8, 0.6, 1.0)
NONE = (0, 0, 0, 0)
SHIPS = [("pr_junk", 7, (0.04, 0.3, 0.96, 0.95)), ("pr_jpship", 7, (0.04, 0.3, 0.96, 0.95)),
         ("pr_joseonship", 6, (0.04, 0.3, 0.96, 0.95)), ("pr_fishboat", 4, (0.05, 0.35, 0.95, 0.95))]
HARBOR = [("pr_mast", 3, (0.4, 0.88, 0.6, 1.0)), ("pr_anchor", 1.5, BLOCK), ("pr_nets", 1.5, NONE),
          ("pr_netrack", 2.5, (0.05, 0.6, 0.95, 1.0)), ("pr_crates", 1.5, BLOCK), ("pr_sacks", 1.5, BLOCK),
          ("pr_barrels", 1.5, BLOCK), ("pr_lantern", 1, (0.25, 0.8, 0.75, 1.0)), ("pr_lantern_stone", 1, (0.15, 0.6, 0.85, 1.0)),
          ("pr_pier", 2, NONE), ("pr_post", 1, (0.15, 0.5, 0.85, 1.0)), ("pr_boat", 3, (0.05, 0.3, 0.95, 0.95))]
BUILDINGS = [("pr_thatch", 5, (0.02, 0.35, 0.98, 0.97)), ("pr_jphouse", 5, (0.02, 0.35, 0.98, 0.97)),
             ("pr_minghouse", 5, (0.02, 0.35, 0.98, 0.97)), ("pr_minggate", 4, (0.0, 0.4, 1.0, 0.97)),
             ("pr_buddha", 2, (0.05, 0.4, 0.95, 0.97)), ("pr_tilehouse", 5, (0.02, 0.35, 0.98, 0.97))]
NATURE = [("pr_willow", 3, TREE), ("pr_bamboo", 2, (0.15, 0.7, 0.85, 1.0)), ("pr_palm", 2.5, TREE),
          ("pr_fanpalm", 2, TREE), ("pr_pine", 3, TREE), ("pr_bush", 1.5, (0.1, 0.4, 0.9, 1.0)),
          ("pr_boulder", 2, (0.05, 0.35, 0.95, 1.0)), ("pr_rocks", 1.5, (0.05, 0.3, 0.95, 1.0)),
          ("pr_cave", 4, (0.02, 0.3, 0.98, 0.95)), ("pr_signal", 1.5, (0.1, 0.45, 0.9, 1.0)),
          ("pr_signal_lit", 1.5, (0.1, 0.45, 0.9, 1.0)), ("pr_reeds", 1.5, NONE)]
PROPS = {"props_ships": (SHIPS, [2, 2]), "props_harbor": (HARBOR, [6, 6]),
         "props_buildings": (BUILDINGS, [3, 3]), "props_nature": (NATURE, [6, 6])}


def preview():
    """모든 결과를 2배로 키워 한 장에 늘어놓는다(눈으로 확인용)."""
    ims = []
    for k in sorted(META):
        p = os.path.join(ROOT, META[k]["img"])
        if os.path.exists(p):
            ims.append(Image.open(p).convert("RGBA"))
    W, x, y, rh = 1600, 4, 4, 0
    pos = []
    for im in ims:
        w, h = im.width * 2, im.height * 2
        if x + w > W:
            x, y, rh = 4, y + rh + 4, 0
        pos.append((x, y)); x += w + 4; rh = max(rh, h)
    sheet = Image.new("RGBA", (W, y + rh + 4), (90, 120, 90, 255))
    for im, (x, y) in zip(ims, pos):
        sheet.alpha_composite(im.resize((im.width * 2, im.height * 2), Image.NEAREST), (x, y))
    sheet.save(os.path.join(RAW, "_preview.png"))


def run(names, want_preview=False):
    for f in sorted(os.listdir(RAW)):
        key = f[:-4]
        if not f.endswith(".png") or key.startswith("_") or (names and key not in names):
            continue
        try:
            if key.startswith("sp_"):
                character(key, WALK_ROWS, NPC_H.get(key, DEFAULT_H))
            elif key in PROPS:
                props(key, *PROPS[key])
        except Exception as e:  # 한 장이 잘못돼도 나머지는 만든다
            WARN.append(f"{key}: {e}")
    # file://로 열어도 읽히게 스크립트로 쓴다(fetch 없이 <script>로 불러옴). 형식은 「영웅의 길」과 같다
    with open(JS_PATH, "w", encoding="utf-8") as f:
        f.write("'use strict';\n// 자동 생성 파일(tools/process_sprites.py) — 고치지 마세요. 스프라이트 크기·발밑 피벗·동작·소품 발자국\nwindow.SPRITES = ")
        json.dump(dict(sorted(META.items())), f, ensure_ascii=False, separators=(",", ":"))
        f.write(";\n")
    if want_preview:
        preview()
    for w in WARN:
        print("  !", w)


if __name__ == "__main__":
    args = sys.argv[1:]
    run({a for a in args if not a.startswith("--")}, "--preview" in args)
