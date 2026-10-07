# -*- coding: utf-8 -*-
"""도트(픽셀아트) 스프라이트 시트 프롬프트(tools/prompts/sp_*.txt, props_*.txt)와 manifest_sprites.tsv를 만든다.

    python tools/make_sprites.py

「영웅의 길」 tools/make_sprites.py를 가져와 「최척전」 인물·소품으로 고쳤다.
- 탑뷰(3/4 내려다보기) RPG. PPU = 32(땅 한 칸 32x32 px). 어른 키 약 1.5칸(48px).
- 스프라이트 시트 규칙: 마젠타 단색 배경, 프레임끼리 넓게 띄운 격자, 행마다 발밑 기준선(발밑 피벗) 통일.
  걷기만 3행(아래·왼쪽·위) × 4프레임. 오른쪽 방향은 왼쪽을 뒤집어 쓴다. 공격·도술 행은 없다.
- 초상 참조가 아직 없으므로 글 프롬프트만으로 그린다(manifest의 ref 칸은 비워 둔다).
- 시대: 16세기 말~17세기 초(임진왜란·정유재란 무렵). 조선·일본·명·안남(동남아)·포르투갈 사람이 나온다.
- 프롬프트는 영어(ASCII)만 쓴다(gen.ps1이 명령문에 그대로 넣는다). 그림 안에 글자 금지.
"""
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PDIR = os.path.join(ROOT, "tools", "prompts")
os.makedirs(PDIR, exist_ok=True)

SHEET = (
    "Pixel art sprite sheet for a top-down 2D RPG in the style of 16-bit SNES-era JRPG overworld sprites "
    "(3/4 top-down view), crisp hard-edged pixels, no anti-aliasing, limited palette, dark 1-pixel outlines, "
    "cute chibi proportions about 2 heads tall. Solid flat pure magenta background (#FF00FF) everywhere behind "
    "the sprites, no gradients, no floor, no cast shadows on the background. Frames are laid out in a strict "
    "invisible grid with wide empty magenta gaps so that no frame touches or overlaps another, even sleeves, "
    "hair, hats and carried items stay inside their own cell. Every frame is drawn at exactly the same scale. "
    "Within each row the feet of every frame rest on the same baseline (foot pivot fixed at bottom center), so the "
    "character does not jitter when animated. The same single character in every frame with identical costume "
    "and colors. No text, no letters, no numbers, no grid lines, no labels, no motion trails, no weapons drawn "
    "unless described. Do not use magenta or bright pink anywhere on the character."
)
WALK = (
    "Layout: exactly 3 rows of 4 frames (12 frames in total). Row 1: walking DOWN toward the viewer (front view), "
    "4-frame walk cycle (right foot forward, standing, left foot forward, standing). Row 2: walking LEFT (side view "
    "facing left), 4-frame walk cycle. Row 3: walking UP away from the viewer (back view), 4-frame walk cycle. "
    "No other rows, no extra poses."
)

ERA = "The time is the late 16th to early 17th century (around the Imjin War of the 1590s)."
JOSEON = ERA + " Mid-Joseon Korea: Korean hanbok clothing of that period, not Chinese and not Japanese clothing."
MING = ERA + " Late Ming dynasty China (Hangzhou area): Ming Chinese clothing, not Korean hanbok."
JAPAN = ERA + " Japan in the Azuchi-Momoyama period: Japanese clothing of that time."
SEA = ERA + " A busy East and Southeast Asian sea-trade port such as Hoi An in Annam (Vietnam)."

P, M = {}, []


def sheet(name, desc, setting, size="1536x1024"):
    P[name] = SHEET + "\n\n" + WALK + "\n\nCharacter: " + desc + " " + setting
    M.append((name, size, "", "style"))


# ── 주인공 옥영(네 모습) ──
sheet("sp_okyoung_m",
      "Okyoung, a young Korean woman disguised as a slender young commoner man, about 20, delicate calm face. Plain "
      "pale blue-grey jeogori jacket and baji trousers tied at the ankles, white cloth leggings and straw sandals. "
      "Hair tied up in a man's topknot (sangtu) under a simple dark cloth headband (manggeon), no hat. Carries "
      "nothing in the hands.", JOSEON)
sheet("sp_okyoung_f",
      "Okyoung, a young Korean woman about 18, gentle intelligent face. Short soft pale-yellow jeogori jacket with a "
      "light green collar ribbon, long full pale rose-pink chima skirt reaching the ground. Hair in a neat low bun "
      "at the nape with a simple wooden pin.", JOSEON)
sheet("sp_okyoung_joseon",
      "Okyoung in her 40s, a sturdy determined Korean woman dressed for a long journey. Ochre-brown jeogori jacket, "
      "long dark navy chima skirt tucked up a little for walking, white leggings and straw sandals, a cloth travel "
      "bundle tied across her back, hair in a low bun covered by a plain white head cloth.", JOSEON)
sheet("sp_okyoung_ming",
      "Okyoung in her 40s living in Hangzhou, a calm dignified woman in Ming Chinese women's clothes: long "
      "light teal ao jacket with a high crossed collar over a long pleated off-white mamian skirt, hair in a simple "
      "high Ming-style bun with a silver pin.", MING)

# ── 이야기 속 인물 ──
sheet("sp_choecheok",
      "Choe Cheok, a Korean scholarly young man about 22, kind thoughtful face, thin short moustache. Long light "
      "grey-white dopo scholar robe with a thin dark blue sash, black horsehair gat hat with a wide brim. A long "
      "brown bamboo flute (tungso) is tucked at his belt on the side.", JOSEON)
sheet("sp_donwoo",
      "Donwoo, an old Japanese merchant-sailor about 60, kind wrinkled smiling face, greying hair in a simple "
      "topknot with the front of the head shaved, short grey beard. Simple faded brown kimono-like short work "
      "jacket and loose dark hakama trousers tied at the shins, straw sandals, a string of wooden Buddhist prayer "
      "beads around his wrist.", JAPAN)
sheet("sp_mongseon",
      "Mongseon, a young man about 18 born in Hangzhou, bright honest face. Ming Chinese commoner scholar clothes: "
      "long blue cross-collar robe with a dark sash, hair in a top bun under a black square Ming scholar cap.",
      MING)
sheet("sp_hongdo",
      "Hongdo, a young Ming Chinese woman about 18, lively brave face. Short pale peach Ming jacket with a crossed "
      "collar over a long light green skirt, hair in two neat buns with small red ribbons.", MING)
sheet("sp_mongseok",
      "Mongseok, a Korean young man about 22, a military student and soldier. Dark blue Joseon military coat "
      "(dongdari with red sleeves under a sleeveless blue jeonbok vest), black brimmed military hat (jeollip) with "
      "a small red tassel, a quiver of arrows on his back, black boots.", JOSEON)
sheet("sp_jinwigyeong",
      "Jin Wigyeong, a middle-aged former Ming Chinese soldier about 45 now living in Korea, tired but kind face "
      "with a short black beard. Worn patched faded brown Ming-style cross-collar tunic and trousers, a cloth head "
      "wrap, a small wooden box of acupuncture needles hanging at his belt.", JOSEON + " He is a Chinese man wearing worn Ming clothes.")
sheet("sp_simssi",
      "Lady Sim, an elderly Korean woman about 65, gentle wrinkled face, slightly bent posture, white hair in a low "
      "bun. Plain white jeogori jacket and long light grey chima skirt, walks with a short wooden cane.", JOSEON)
sheet("sp_choesuk",
      "Choe Suk, an elderly Korean gentleman about 65, long white beard, slightly bent posture. Long off-white dopo "
      "robe with a thin grey sash, black horsehair gat hat, walks with a long wooden staff.", JOSEON)

# ── 엑스트라 ──
sheet("sp_merchant_ming",
      "a plump Ming Chinese merchant in his 40s with a thin moustache, long dark red cross-collar robe with a black "
      "sash, small round black cap, holding a wooden abacus.", MING)
sheet("sp_merchant_jp",
      "a Japanese merchant in his 30s, indigo kimono with a grey haori half-coat, hair in a samurai-style chonmage "
      "topknot with the front shaved, straw sandals, a cloth money pouch at the waist.", JAPAN)
sheet("sp_sailor_sea",
      "a Southeast Asian sailor from Annam or Siam, tanned skin, bare feet, red cloth head wrap, loose sleeveless "
      "light brown shirt and rolled-up dark trousers, a coil of rope over one shoulder.", SEA)
sheet("sp_sailor_west",
      "a 17th-century Portuguese sailor, fair skin, short brown beard, red knit cap, loose white linen shirt, brown "
      "leather vest, baggy dark blue knee breeches, stockings and buckled shoes.", SEA)
sheet("sp_captive",
      "a Korean civilian held captive in Japan, a thin young man with a tired sad face, ragged torn dirty white "
      "jeogori and baji clothes, messy hair loosely tied, barefoot, a rope loosely tied around his waist.",
      ERA + " A Korean captive in Japan during the Imjin War, wearing ragged Korean hanbok.")
sheet("sp_pirate",
      "an East Asian sea pirate, rough stern face with stubble, black cloth head wrap, dark grey short jacket with "
      "rolled sleeves, loose trousers tied at the ankles, a sheathed short sword at the belt (not drawn), no blood.",
      ERA + " Pirates of the East China Sea.")
sheet("sp_ming_soldier",
      "a Ming Chinese patrol soldier, red padded cotton armor coat with brass studs, round iron helmet with a small "
      "red tassel, holding an upright spear close to his body.", MING)
sheet("sp_joseon_sailor",
      "a sailor of a Joseon Korean government trading ship, sturdy man about 30, white jeogori and baji with "
      "sleeves rolled up, a blue sleeveless vest, a white cloth headband, straw sandals.", JOSEON)

# ── 소품(배·항구·건물·자연) ──
PROPS = (
    "Pixel art game objects for a top-down 2D RPG in the style of 16-bit SNES-era JRPGs (3/4 top-down view), crisp "
    "hard-edged pixels, no anti-aliasing, limited palette, dark 1-pixel outlines. Everything is drawn at one "
    "consistent pixel scale where one ground tile is 32x32 pixels and a person would be about 48 pixels tall. "
    "Solid flat pure magenta background (#FF00FF) everywhere, no ground, no water, no floor tiles, no cast shadows "
    "on the background. Each object is separate with wide empty magenta gaps so no object touches another, arranged "
    "in neat rows. No text, no letters, no symbols, no labels, no people. Do not use magenta or bright pink in the "
    "objects. " + ERA + " Setting: East Asian seas and ports (Joseon Korea, Japan, Ming China and Annam).\n\nObjects: "
)


def props(name, desc, size="1536x1024"):
    P[name] = PROPS + desc
    M.append((name, size, "", "style"))


props("props_ships",
      "two rows of two large ships, each seen from the 3/4 top-down view floating alone (no water drawn): "
      "1) a large Ming Chinese trading junk with a high stern, brown wooden hull and three tan battened sails (about "
      "7 tiles long), 2) a Japanese red-seal trading ship (shuinsen) with a wooden hull, a white square sail and a "
      "small cabin (about 7 tiles long), 3) a Joseon Korean wooden government trading ship with a flat bottom and two "
      "plain off-white sails (about 6 tiles long), 4) a small wooden fishing boat with one small sail (about 4 tiles "
      "long). Row 2 contains items 3 and 4.")
props("props_harbor",
      "two rows of six: 1) a single tall wooden ship mast with a furled tan sail and ropes, 2) a large black iron "
      "anchor lying on its side, 3) a heaped pile of folded fishing nets drawn as a solid mass of thick tan-brown rope with cork floats "
      "(no see-through holes), 4) a wooden drying rack with a folded fishing net draped over the bar, drawn as a "
      "solid band of thick tan-brown rope with no see-through holes, 5) a stack of wooden cargo crates, 6) a pile of tied burlap grain sacks, "
      "7) a group of wooden barrels, 8) a red paper lantern hanging from a short wooden post, 9) a stone lantern, "
      "10) a straight wooden pier section of planks on posts (about 2 tiles wide and 3 tiles long), 11) a thick "
      "wooden mooring post with a coil of rope, 12) a small wooden rowing boat with two oars.")
props("props_buildings",
      "two rows of three: 1) a Joseon Korean thatched-roof farmhouse with mud walls and a wooden porch (about 5 "
      "tiles wide), 2) a Japanese wooden townhouse shop with a dark tiled roof, latticed front and a plain indigo "
      "cloth curtain with no letters (about 5 tiles wide), 3) a Ming Chinese house with a grey tiled curved roof, "
      "white walls and wooden lattice windows (about 5 tiles wide), 4) a Ming Chinese roofed gateway with red "
      "pillars and a grey tiled roof, with a blank plaque and no writing (about 4 tiles wide), 5) a small wooden "
      "Buddhist shrine cabinet on a stone base with a small golden Buddha statue inside and an incense burner in "
      "front (about 2 tiles wide), 6) a Joseon Korean tiled-roof house with a dark grey tiled roof and wooden "
      "pillars (about 5 tiles wide).")
props("props_nature",
      "two rows of six: 1) a weeping willow tree, 2) a dense bamboo cluster, 3) a tall coconut palm tree, "
      "4) a short fan palm tree, 5) a twisted pine tree, 6) a round green bush, 7) a large grey boulder, 8) a "
      "cluster of small rocks, 9) a dark rocky cave mouth in a rock mound (about 4 tiles wide), 10) a stacked "
      "pile of firewood and brush for a signal fire, unlit, on a stone base, 11) a burning signal fire with flames "
      "on a stone base, 12) a clump of tall shore reeds. Trees are about 2 to 3 tiles wide and 3 to 4 tiles tall.")

for name, text in P.items():
    assert all(ord(ch) < 128 for ch in text), name
    with open(os.path.join(PDIR, name + ".txt"), "w", encoding="utf-8") as f:
        f.write(text)
with open(os.path.join(ROOT, "tools", "manifest_sprites.tsv"), "w", encoding="utf-8") as f:
    f.write("# name\tsize\tref\tmode\n")
    for name, size, ref, mode in M:
        f.write(f"{name}\t{size}\t{ref}\t{mode}\n")
print(len(P), "prompts")
