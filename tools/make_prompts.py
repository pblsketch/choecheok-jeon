# -*- coding: utf-8 -*-
"""장면 삽화(sc_*)·대화 초상(pt_*) 생성 프롬프트(tools/prompts/*.txt)와 manifest(tools/manifest.tsv)를 만든다.

    python tools/make_prompts.py

- 프롬프트는 영어(ASCII)만 쓴다. gen.ps1이 명령문에 그대로 넣어 넘기기 때문이다.
- manifest 열: 이름, 크기, 참조 이미지, 참조 방식(same|style) — gen.ps1의 -RefMode
  (gen.ps1의 'scene'·'char' 방식은 「영웅의 길」 인물·도트 그림용 문구라 여기서는 쓰지 않는다)
- 화풍: 현대 그림책풍(design/style-samples/style_picturebook.png, tools/prompts/style_picturebook.txt).
  장면은 그 그림을 화풍 참조로, 초상은 HUD 초상(assets/ui/hud_okyoung.webp → assets/raw/ref_okyoung.png)을 참조로 쓴다.
- 장면 id는 js/data/places/*.js·original.js·kimyc.js의 scenes와 result.js의 sc_act1_end에서 모은다(node로 읽음).
  거기 있는 장면인데 아래 DESC에 없으면 prompt_hint를 그대로 쓰고 경고한다.
- 인물 모습은 도트 인물(tools/prompts/sp_*.txt)과 HUD·타이틀 그림에 맞춘 공통 문구(아래 인물 상수)를 되풀이해 맞춘다.
"""
import json
import os
import subprocess
import sys
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PDIR = os.path.join(ROOT, "tools", "prompts")
RAW = os.path.join(ROOT, "assets", "raw")
os.makedirs(PDIR, exist_ok=True)
os.makedirs(RAW, exist_ok=True)

STYLE_REF = "design/style-samples/style_picturebook.png"
FACE_REF = "assets/raw/ref_okyoung.png"   # assets/ui/hud_okyoung.webp를 png로(아래 make_refs)


def make_refs():
    """gen.ps1은 참조 그림을 ref.png로 복사해 넘기므로 webp 참조는 png로 바꿔 둔다."""
    from PIL import Image
    src = os.path.join(ROOT, "assets", "ui", "hud_okyoung.webp")
    dst = os.path.join(ROOT, FACE_REF)
    if not os.path.exists(dst):
        im = Image.open(src).convert("RGB")
        im.resize((im.width * 2, im.height * 2), Image.LANCZOS).save(dst)


# ───────── 공통 문구 ─────────
STYLE = (
    "Art style: a contemporary Korean children's and young-adult picture-book illustration, hand-painted with opaque "
    "gouache and finished with colored pencil: simplified, slightly rounded flat shapes, clearly reduced detail (no "
    "fine clutter, ships and buildings drawn as simple chunky shapes), visible brush marks, soft colored-pencil "
    "hatching and paper grain, a limited traditional Korean palette (deep indigo, muted jade green, persimmon orange, "
    "warm ochre, soft ivory), warm lantern or sun light against cool indigo shadows. People are drawn a little "
    "stylized with simple gentle faces that clearly show emotion. Warm, tender storybook mood suitable for teenagers. "
    "Not photorealistic, not anime, not a detailed digital painting, not 3D. Absolutely no text, no letters, no "
    "characters, no calligraphy, no inscriptions on flags, banners, sails, signboards or paper, no seals, no stamps, "
    "no signatures, no captions, no watermarks, no frames or borders."
)
PERIOD = (
    " Setting: East Asia in the late 16th and early 17th century (the Imjin War era). Koreans wear Joseon hanbok of "
    "that period, Chinese people wear late Ming dynasty clothing, Japanese people wear Momoyama-period clothing; never "
    "mix these up."
)
SAFE = (
    " Keep it gentle: no blood, no wounds, no corpses, no weapons used against anyone. Peaceful places stay peaceful: "
    "no burning buildings, no fires, no smoke columns and no war in the background unless the scene description "
    "above asks for them (warm lamp and lantern lights are fine)."
)
# 전쟁 장면에만 붙인다
WAR = " War and danger are shown only symbolically (distant fire glow, smoke, shadows, scattered belongings)."
WAR_IDS = {"sc_prologue_fall", "sc_prologue_night", "sc_prologue_brink", "sc_namwon_namboc", "sc_namwon_flee",
           "sc_namwon_scatter", "sc_letter_war", "sc_sea_pirates"}
SCENE_HEAD = (
    "Wide illustration of one scene from the Korean classical novel Choe Cheok-jeon (early 17th century), for a story "
    "learning game aimed at teenagers. Wide landscape composition; the main figures are clearly readable (not tiny) "
    "and stay in the central horizontal band of the picture, away from the top and bottom edges, because the picture "
    "may be cropped to a wider strip.\n\nScene: "
)
PT_HEAD = (
    "Bust portrait (head and shoulders) of one single character, for the small round face icon next to dialogue "
    "lines in a story game. The picture will be cropped to a small circle, so the face is large and centered "
    "horizontally, the eyes a little above the center, the shoulders reaching the bottom edge, and the whole head "
    "fits inside the square with a little margin. Three-quarter view, looking slightly toward the viewer. Plain soft "
    "background only: warm deep indigo with a soft warm lantern glow behind the head, nothing else in the "
    "background. Simple readable shapes so it still reads when shown very small. Square image.\n\nCharacter: "
)

# ───────── 인물(초상과 장면에서 같은 말을 되풀이해 모습을 맞춘다) ─────────
OK_M = ("Okyoung, a slender young Korean woman about 20 disguised as a young commoner man: plain undyed white-grey "
        "Joseon jeogori jacket and baji trousers, her black hair tied up in a topknot bun under a plain white cloth "
        "headband whose long tails hang behind, a delicate gentle face with soft rosy cheeks")
OK_F = ("Okyoung, a young Korean woman about 20 with a delicate gentle face and soft rosy cheeks, in a short "
        "pale-yellow jeogori jacket with a light green collar ribbon and a long pale rose-pink chima skirt, her black "
        "hair in a neat low bun at the nape with a simple wooden pin")
OK_MING_Y = ("Okyoung, a young woman about 25 with a delicate gentle face, now in Ming Chinese women's clothes: a "
             "long light teal jacket with a high crossed collar over a long pleated off-white skirt, black hair in a "
             "simple high bun with a silver pin")
OK_MING = ("Okyoung in her early 40s, the same delicate gentle face now mature and calm, in Ming Chinese women's "
           "clothes: a long light teal jacket with a high crossed collar over a long pleated off-white skirt, black "
           "hair in a simple high bun with a silver pin")
OK_JOSEON = ("Okyoung in her mid 40s, a travel-worn but determined Korean woman with a gentle mature face, in an "
             "ochre-brown jeogori jacket and a long dark navy chima skirt, her hair in a low bun covered by a plain "
             "white head cloth")
CH_J = ("Choe Cheok, a Korean scholar about 25 with a kind thoughtful face and a thin short moustache, in a long "
        "light grey-white dopo robe with a thin dark blue sash and a black horsehair gat hat, a long brown bamboo "
        "flute (tungso) at his belt")
CH_MING = ("Choe Cheok, a Korean man in his thirties with a kind thoughtful face and a thin short moustache, in Ming "
           "Chinese clothes: a long dark blue robe and a simple black cloth cap, with a long brown bamboo flute "
           "(tungso)")
CH_MING_L = ("Choe Cheok, a Korean man in his late 40s with a kind face, a thin moustache and a short beard, in Ming "
             "Chinese clothes: a long dark blue robe and a simple black cloth cap")
CH_OLD = ("Choe Cheok, now about 50, with a kind thoughtful face, greying hair, a grey moustache and a short grey "
          "beard, in a long light grey-white Joseon dopo robe with a thin dark blue sash and a black horsehair gat hat")
DONWOO = ("Donwoo, an old kind Japanese merchant about 60 with a wrinkled smiling face and a short grey beard, the "
          "front of his head shaved and his greying hair tied in a small topknot, in a faded brown short kimono "
          "jacket and loose dark hakama trousers, a string of wooden Buddhist prayer beads in his hand")
SONGWOO = ("Song U, Choe Cheok's Ming Chinese merchant friend, a lean cheerful man about 40 with a neat short black "
           "beard, in a long dark red Ming robe with a black sash and a small round black cap")
MONGSEON = ("Mongseon, a young man about 18 born in Hangzhou with a bright honest face, in a long blue Ming "
            "cross-collar robe with a dark sash and a black square Ming scholar cap")
HONGDO = ("Hongdo, a young Ming Chinese woman about 18 with a lively brave face, in a short pale peach Ming jacket "
          "with a crossed collar over a long light green skirt, her hair in two neat buns with small red ribbons")
MONGSEOK = ("Mongseok, a Korean young man about 25, a Joseon soldier with a firm honest face, in a dark blue military "
            "coat with red sleeves under a sleeveless blue vest and a black brimmed military hat with a small red "
            "tassel")
JIN = ("Jin Wigyeong, a middle-aged Ming Chinese man about 45 with a tired but kind face and a short black beard, in a "
       "worn patched faded brown Ming cross-collar tunic and trousers and a cloth head wrap, a small wooden box of "
       "acupuncture needles at his belt")
SIMSSI = ("Lady Sim, Okyoung's mother, an elderly Korean woman about 65 with a gentle wrinkled face and white hair in "
          "a low bun, in a plain white jeogori jacket and a long light grey chima skirt")
CHOESUK = ("Choe Suk, Choe Cheok's father, an elderly Korean gentleman about 70 with a long white beard and a "
           "slightly bent posture, in a long off-white dopo robe and a black horsehair gat hat, with a long wooden "
           "staff")
BUDDHA = ("the golden Jangyuk Buddha of Manboksa temple: a tall gilded standing Buddha statue with a serene kind "
          "face, half-closed eyes and a soft golden halo")

# ───────── 장면(가로 1536x1024 요청) ─────────
DESC = {
    # 프롤로그(1597 남원)
    "sc_prologue_fall": (
        "Night in autumn 1597. Far away across dark fields stands the Korean walled town of Namwon; an orange glow of "
        "fire rises above its stone walls and grey smoke drifts into a deep indigo sky. In the middle distance, a long "
        "country road winding through dark autumn fields with a line of tiny dark silhouettes of fleeing families "
        "carrying bundles, seen from far away and from behind (each figure very small, no faces, no recognizable main "
        "characters, nobody close to the viewer). The foreground is only dark grass, a stone wall and an autumn tree. "
        "No fighting and no soldiers shown, only the glow, the smoke and the long road. Sad, hushed mood."),
    "sc_prologue_refuge": (
        "Refugees huddled in a misty mountain valley of Jirisan at dusk, with small straw huts, pine trees and rocky "
        "slopes, families sitting by small cooking fires. Among them stands " + OK_M + ", looking toward the valley "
        "mouth, while her husband " + CH_J + " looks on with worry beside a hut. Warm dusk light, quiet tension."),
    "sc_prologue_parting": (
        "Autumn mountains. " + CH_J + ", with a small travel bundle on his back, walks down a steep mountain path "
        "with two or three refugee men, turning to look back up at his wife " + OK_M + ", who stands by a straw hut "
        "on the slope above. Red and gold autumn leaves, a quiet, restrained farewell."),
    "sc_prologue_night": (
        "A night forest valley seen from above: a long line of distant torches climbs between dark pine trees, long "
        "shadows and a few sparks in the air. No people visible up close, no faces, no weapons. Tense and symbolic, "
        "deep indigo night and lantern-orange torchlight."),
    "sc_prologue_brink": (
        "Close-up in near darkness: a young woman's hand in a plain white-grey sleeve gripping the wrinkled hand of an "
        "elderly woman in a white sleeve; their hands hold each other tightly. Faint orange torchlight glows at one "
        "edge of the frame, the rest is deep indigo shadow and pine needles. Only hands and sleeves are shown, no "
        "faces, no enemies, no weapons. Quiet and symbolic."),
    # 남원(1막 기억)
    "sc_namwon_tongso": (
        "A spring night in a Korean tile-roofed courtyard house under a full moon, a blossoming apricot tree and a "
        "willow beside a small pond, petals drifting. " + CH_J + " sits on the wooden veranda playing the long bamboo "
        "flute, while his wife " + OK_F + " sits beside him listening and softly reciting a poem. Warm lantern light, "
        "tender happy mood."),
    "sc_namwon_namboc": (
        "Night in a mountain refugee camp: " + OK_M + " tightens the collar of her men's jacket with a serious, "
        "resolved face, standing in front of straw huts and pine trees; far down the valley, a faint orange glow of "
        "distant torches. Cool indigo night, a single warm light on her face."),
    "sc_namwon_flee": (
        "Still life inside a dim straw hut at night: on a worn straw mat lie a single small jade ring on a folded "
        "cloth and a small sack of barley; a young woman's hands in plain white-grey sleeves hover between them, "
        "undecided. Orange light flickers through the doorway. Tense, quiet; only hands are shown."),
    "sc_namwon_scatter": (
        "A wide, distant landscape at dusk on the broad Seomjin river: dark silhouettes of a few small boats with "
        "patched sails pushing off into hazy water, tiny anonymous silhouettes of refugees on the far bank seen from "
        "very far away, scattered bundles and a dropped straw sandal on the empty sand in the foreground. No close-up "
        "people and no recognizable main characters at all. Sorrowful indigo and dim orange sky. Symbolic, no "
        "fighting, no weapons."),
    # 낭고야(일본)
    "sc_nanggoya_arrive": (
        "A quiet Japanese harbor village in the early 1600s seen from a hill: wooden houses with grey tiled roofs, a "
        "small garden with a stone Buddha statue and stone lanterns, the bay below. " + DONWOO + ", leads " + OK_M +
        " up the path; she looks around warily. Cool morning light."),
    "sc_nanggoya_dream": (
        "Dream scene: " + BUDDHA + " glows softly in deep darkness, looking down kindly at a small sleeping young "
        "woman in plain white-grey men's clothes curled up on a straw mat, a white cloth headband in her hair. Warm "
        "gold light against deep indigo; gentle and hopeful. Nothing harmful is shown, no knives, no ropes."),
    "sc_nanggoya_sagan": (
        "Inside a simple Japanese wooden house, " + DONWOO + ", stands before a small Buddhist home shrine with "
        "incense smoke, turning with a warm smile toward " + OK_M + ", who bows modestly. Soft daylight through paper "
        "sliding doors."),
    "sc_nanggoya_news": (
        "A busy Japanese harbor quay with stacked crates, barrels and rice bales; Korean captive porters in worn "
        "white clothes carry sacks on their backs. In the foreground " + OK_M + " pauses with a sack, listening "
        "intently, her eyes wide. Gulls overhead, cool sea light."),
    "sc_nanggoya_ship": (
        "A Japanese trading ship with a large square mat sail and a high stern moored at a wooden pier. " + DONWOO +
        ", points at the ship with a smile, while " + OK_M + ", now a young deckhand, looks past the ship toward the "
        "open sea. Morning breeze, gulls."),
    "sc_nanggoya_sail": (
        "A Japanese trading ship with a square mat sail crossing a wide southern sea at sunset, the first stars "
        "appearing in the indigo sky; a small figure in white-grey men's clothes with a white headband stands at the "
        "stern watching the horizon. Vast, lonely but hopeful; indigo and lantern orange."),
    # 안남
    "sc_annam_port": (
        "Night harbor of Annam (like old Hoi An) around 1600: tall Chinese junks with ribbed batten sails, a large "
        "Japanese trading ship with a square mat sail and small Southeast Asian boats with curved prows, moored with "
        "red paper lanterns; a brick quay, tiled-roof warehouses and palm trees; lantern reflections on calm indigo "
        "water. A few tiny sailors on the quay. No main characters."),
    "sc_annam_tongso": (
        "At night " + OK_M + " leans on the rail of a Japanese merchant ship, one hand pressed to her chest, "
        "listening; across calm moonlit water a distant Chinese junk with one lantern, where a small man in a dark "
        "blue robe plays a long bamboo flute. Faint concentric ripples spread across the water between the two "
        "ships. Longing, hushed mood."),
    "sc_annam_poem": (
        "A low setting moon over a calm night sea, cold dewy air with thin mist, a distant Chinese junk with a single "
        "lantern on the right, faint concentric ripples on the water. Lots of empty dark-blue sky on the left half. "
        "No people in the foreground."),
    "sc_annam_cheok": (
        "On the deck of a Chinese junk at night, " + CH_MING + ", sits frozen and stunned, his bamboo flute fallen at "
        "his feet on the deck boards; beside him his friend " + SONGWOO + ", reaches out a hand in concern. Warm "
        "lantern light against the indigo night."),
    "sc_annam_reunion": (
        "Dawn on a sandy shore of a southern harbor: " + CH_MING + ", and his wife " + OK_M + ", embrace and weep on "
        "the sand; sailors from Chinese and Japanese ships gather around at a little distance, watching in "
        "astonishment. Junks and a Japanese ship in the background, soft pink dawn light."),
    "sc_annam_farewell": (
        "Morning at a harbor pier: " + DONWOO + ", presses a small cloth pouch of silver into both hands of " + OK_M +
        ", who bows her head with tears; her husband " + CH_MING + ", bows deeply beside her. The Japanese ship with "
        "a square mat sail behind them. Warm, gentle light."),
    "sc_act1_end": (
        "Dawn at an Annam harbor: a Chinese junk with ribbed batten sails and a Japanese trade ship with a square mat "
        "sail are moored side by side on calm, glassy water; soft mist, palm trees and tiled roofs on the shore, a "
        "pale pink and gold sky. Peaceful, no people up close."),
    # 막간(항주의 스무 해)
    "sc_interlude_hangzhou": (
        "A modest Ming-era house beside a willow-lined canal in Hangzhou, whitewashed walls and grey tiled roofs, a "
        "stone bridge. In the courtyard a Korean couple greets the morning together: " + CH_MING + ", and " +
        OK_MING_Y + ". Spring light, peaceful new life."),
    "sc_interlude_mongseon": (
        "Night interior of a Ming house: " + OK_MING_Y + ", sleeps peacefully on a bed with a quilt, a hand resting "
        "on her belly; above her, in a soft golden dream glow, appears " + BUDDHA + ". Warm lantern glow, gentle and "
        "serene."),
    "sc_interlude_hongdo": (
        "Dusk: " + HONGDO + ", stands at an open wooden lattice window looking east over misty water, holding a "
        "small peach in her hands; quiet longing for a father she has never met. Soft dusk light."),
    "sc_interlude_wedding": (
        "A small warm Ming-style wedding in a courtyard with red paper lanterns: the young groom " + MONGSEON + ", and "
        "the bride " + HONGDO.replace("in a short pale peach Ming jacket", "in a red Ming bridal jacket") +
        ", bow to each other; " + OK_MING + ", and " + CH_MING_L + ", smile beside them. Festive but modest."),
    # 항주(2막)
    "sc_hangzhou_home": (
        "A small Ming-dynasty courtyard house in Hangzhou: a lotus pond, stone lanterns, a bamboo grove, a red "
        "wooden door and a canal pier with a small boat behind the house. Spring afternoon light. No people."),
    "sc_hangzhou_farewell": (
        "At a red Ming gate, " + CH_MING_L.replace("a long dark blue robe and a simple black cloth cap",
                                                   "a Ming army clerk's outfit: a dark blue robe under a plain red "
                                                   "padded sleeveless coat and a black cloth cap") +
        ", holds both hands of his wife " + OK_MING + ", who is weeping; their son " + MONGSEON + ", watches from "
        "behind. Restrained and tender, no weapons shown."),
    "sc_letter_war": (
        "Symbolic: a torn plain red Ming banner (no writing on it) on a cold northern plain at dusk, distant smoke "
        "on the horizon; a lone greying Korean man in a plain dark blue robe walks among a line of surrendered Joseon "
        "soldiers in dark blue coats, heads bowed. No fighting, no blood, muted cold colors."),
    "sc_letter_camp": (
        "Inside a bleak wooden prisoner hut lit by one candle: a young Joseon soldier (" + MONGSEOK + ") has turned "
        "his back and pulled down the collar of his coat to show a small red birthmark on his shoulder, while an "
        "older man (" + CH_MING_L.replace("in Ming Chinese clothes: a long dark blue robe and a simple black cloth cap",
                                          "in a worn plain dark blue robe, bareheaded") +
        ") gasps in recognition, hand over his mouth. Emotional, candlelight."),
    "sc_letter_home": (
        "Early spring on a Korean country road toward Namwon, low hills and a thatched village far ahead: three men "
        "walk together: " + CH_OLD + ", leaning on a walking staff; his son " + MONGSEOK + "; and " + JIN +
        ". Weary but hopeful."),
    "sc_hangzhou_grief": (
        "Night in a Hangzhou room: " + OK_MING + ", sits alone by an oil lamp, a bowl of food untouched beside her, "
        "her eyes downcast; her son " + MONGSEON + ", stands in the doorway, worried. Deep grief shown quietly."),
    "sc_hangzhou_dream": (
        "Dream scene: " + BUDDHA + " gently touches the head of a sleeping woman in her early 40s with her hair in a "
        "high bun, lying under a quilt; warm golden mist fills the dark room. Serene and hopeful."),
    "sc_hangzhou_decision": (
        "Morning on a canal pier in Hangzhou: " + OK_MING + ", stands looking east toward the sea with wind in her "
        "sleeves; her son " + MONGSEON + ", pleads beside her. Willows and tiled roofs behind."),
    "sc_hangzhou_prep": (
        "Cozy lamplight interior: " + OK_MING + ", sews a white Korean hanbok jacket and a Japanese kimono laid side "
        "by side on a table, while teaching words to her son " + MONGSEON + ", and her daughter-in-law " + HONGDO +
        ", who listen and repeat."),
    "sc_hangzhou_boat": (
        "A small sailing junk being loaded with rice sacks and water jars at a Hangzhou canal pier: " + OK_MING +
        ", holds a round wooden compass with a south-pointing needle in her palm, while her son " + MONGSEON +
        ", and daughter-in-law " + HONGDO + ", carry supplies aboard."),
    # 바다
    "sc_sea_departure": (
        "A small junk with a batten sail leaving the Hangzhou estuary at dawn: " + OK_MING + ", stands at the bow "
        "holding a round compass; her son " + MONGSEON + ", and daughter-in-law " + HONGDO + ", adjust the sail "
        "rope. The wide sea opens ahead, pale gold dawn."),
    "sc_sea_route": (
        "On the deck of a small junk at night, lantern light: " + OK_MING + ", kneels over an old hand-drawn sea "
        "chart spread on the boards (only coastlines and dotted routes, no writing), tracing two routes with her "
        "finger, a round compass beside it; " + MONGSEON + ", holds the lantern."),
    "sc_sea_patrol": (
        "Calm daylight near a rocky coastal anchorage: a Ming coast-guard patrol boat with plain red banners (no "
        "writing) pulls alongside a small junk; a Ming patrol soldier in a red padded coat and round iron helmet "
        "looks over; " + OK_MING + ", answers calmly, while behind her stand her son " + MONGSEON + ", and her "
        "daughter-in-law " + HONGDO + "."),
    "sc_sea_pirates": (
        "Symbolic: on choppy grey water a dark pirate ship with a black patched sail tows away a small empty junk; "
        "on a rocky shore in the foreground three small figures seen from behind (a woman with a high bun in a teal "
        "jacket, a young man in a blue robe, a young woman with two buns) stand watching helplessly. No weapons, no "
        "violence, overcast sky."),
    "sc_island_cave": (
        "First light on a small rocky island: three people huddle together at the mouth of a rock cave, " + OK_MING +
        ", with her son " + MONGSEON + ", and daughter-in-law " + HONGDO + "; far in the dawn sky a faint warm golden "
        "glow like the silhouette of a distant Buddha. Quiet and hopeful."),
    "sc_island_signal": (
        "Late afternoon on a small sandy island: a pile of dry branches beside a ring of stones and a tiny sack of "
        "rice; " + OK_MING + ", her son " + MONGSEON + ", and daughter-in-law " + HONGDO + ", stand around them "
        "thinking and deciding; the horizon is empty."),
    "sc_sea_joseon_ship": (
        "A bright morning sea: a Korean Joseon trading sailship with tall rectangular mat sails appears on the "
        "horizon; on the island hill " + MONGSEON + ", waves a white garment high over his head while " + OK_MING +
        ", points joyfully and " + HONGDO + ", clasps her hands."),
    # 남원(결말)
    "sc_suncheon_landing": (
        "A Korean trading ship moored at a small Korean harbor (Suncheon) in April, spring hills with azaleas behind: "
        + OK_JOSEON + ", steps onto the wooden pier, followed by her son " + MONGSEON + ", and daughter-in-law " +
        HONGDO + "."),
    "sc_namwon_geumgyo": (
        "View from a small stone bridge over a stream toward the Korean walled town of Namwon and a thatched village "
        "in spring: " + OK_JOSEON + ", points ahead with tears in her eyes; her son " + MONGSEON + ", and "
        "daughter-in-law " + HONGDO + ", stand beside her."),
    "sc_namwon_willow": (
        "Outside the gate of an old tile-roofed Korean house in soft spring light: " + CH_OLD + ", sits under a large "
        "willow tree talking with a guest; along the road a travel-worn woman (" + OK_JOSEON + ") approaches."),
    "sc_namwon_family": (
        "A Korean courtyard reunion in warm afternoon light: " + OK_JOSEON + ", embraces her grown son " + MONGSEOK +
        "; " + CHOESUK + ", stands nearby leaning on his staff; " + CH_OLD + ", smiles through tears."),
    "sc_namwon_jin": (
        "In a Korean courtyard: " + JIN + ", meets his grown daughter " + HONGDO + ", for the first time; both are "
        "in tears, holding each other's hands; neighbors watch over a low stone fence."),
    "sc_ending_whole": (
        "Three generations of a family under a blossoming willow in a Korean village in spring: " + CH_OLD +
        ", plays the long bamboo flute (tungso); " + OK_JOSEON + ", " + SIMSSI + ", " + CHOESUK + ", " + MONGSEOK +
        ", " + MONGSEON + ", and " + HONGDO + ", sit together smiling."),
    "sc_ending_weary": (
        "A tired woman (" + OK_JOSEON + ") rests on a floor mat by an open paper window in a Korean room while "
        + HONGDO + ", brings a bowl of porridge and " + MONGSEOK + " (bareheaded, in a plain white jeogori) brings "
        "medicine. Gentle morning light, tender."),
    "sc_ending_strange": (
        "Night in a Korean room lit by an oil lamp: the family sits around a low table telling stories; " + OK_JOSEON +
        ", listens intently to her grown son " + MONGSEOK + " (bareheaded, in a plain white jeogori), while " +
        CH_OLD + ", looks on."),
    "sc_ending_barely": (
        "On the wooden veranda of a humble Korean house: " + SIMSSI + ", holds both hands of her daughter " +
        OK_JOSEON + "; behind them the family stands quietly: " + CH_OLD + ", " + MONGSEOK + ", " + MONGSEON +
        ", and " + HONGDO + ". Only these six adults, no children. Warm and humble light."),
    # 원작 결말·김영철전
    "sc_orig_ending": (
        "A restored Korean thatched house in Namwon in spring: an extended family of three generations gathered "
        "under a willow tree; in the distance a woman in a plain white hanbok offers food at the ruins of a Buddhist "
        "temple where a broken golden Buddha statue stands among stones. Warm lantern light, quiet gratitude."),
    "sc_kimyc_moon": (
        "A cloudless full-moon night on the Manchurian steppe in 1625: a small group of war captives (a Korean man "
        "in worn white Joseon clothes and a Ming Chinese man in a worn brown tunic among them) sit by a wooden horse "
        "pen looking up at a huge moon. All the captives are grown men with beards or stubble; there are no women "
        "and no white headbands; this is a different story, so none of the main characters of Choe Cheok-jeon "
        "appear. Quiet sorrow, indigo night and warm moonlight."),
}

# ───────── 초상(1024x1024 요청 → 512px webp) ─────────
PT = {
    "pt_okyoung": (OK_M + ". Expression: calm and gentle, with quiet longing and resolve. Draw the same person as in "
                   "the reference image (same face, white cloth headband and topknot), but show her head and "
                   "shoulders a little wider, with the white-grey jacket collar visible.", FACE_REF, "same"),
    "pt_choecheok": (CH_MING + "; the top of the flute rests against his shoulder. Expression: gentle, thoughtful.",),
    "pt_donwoo": (DONWOO + " (the beads may be shown around his wrist at the bottom edge). Expression: warm, kind "
                  "smile.",),
    "pt_songwoo": (SONGWOO + ". Expression: friendly and lively.",),
    "pt_mongseon": (MONGSEON + ". Expression: earnest and brave.",),
    "pt_hongdo": (HONGDO + ". Expression: bright and determined.",),
    "pt_mongseok": (MONGSEOK + ". Expression: steady and sincere.",),
    "pt_jinwigyeong": (JIN.replace("a cloth head wrap", "a dark brown cloth head wrap covering all his hair (not a "
                                  "white headband)") + ". A clearly middle-aged man with a weathered face. "
                       "Expression: weary but warm.", STYLE_REF, "style"),
    "pt_simssi": (SIMSSI + ". Expression: loving and a little worried.",),
    "pt_choesuk": (CHOESUK + ". Expression: dignified and kind.",),
    "pt_jangyukbul": ("the face and shoulders of " + BUDDHA + ", gilded and softly glowing, simplified rounded "
                      "shapes. Expression: compassionate, peaceful.",),
    "pt_merchant": ("a Ming Chinese harbor trader in his 50s with a lean weathered face and a thin grey goatee, in a "
                    "plain ochre-brown Ming robe and a black cloth cap. Expression: shrewd but friendly.",),
    "pt_merchant_ming": ("a plump Ming Chinese merchant in his 40s with a round face and a thin moustache, in a long "
                         "dark red cross-collar robe with a black sash and a small round black cap, the top of a "
                         "wooden abacus visible at the bottom edge. Expression: cheerful, businesslike.",),
    "pt_merchant_jp": ("a Japanese merchant in his 30s, hair in a chonmage topknot with the front of the head shaved, "
                       "in an indigo kimono with a grey haori half-coat. Expression: polite and alert.",),
    "pt_sailor": ("a Southeast Asian sailor from Annam, tanned skin, a red cloth head wrap, a loose sleeveless light "
                  "brown shirt, a coil of rope over one shoulder. Expression: easygoing grin.",),
    "pt_sailor_west": ("a 17th-century Portuguese sailor with fair skin and a short brown beard, a red knit cap, a "
                       "loose white linen shirt and a brown leather vest. Expression: curious, friendly.",),
    "pt_captive": ("a Korean civilian man held captive in Japan during the Imjin War, a thin man about 30 with "
                   "hollow cheeks, dark stubble and a tired sad masculine face, in ragged worn white jeogori clothes, "
                   "messy black hair in a loose untidy topknot with stray strands, no headband. Clearly a man, not a "
                   "woman. Expression: weary, homesick. No injuries.", STYLE_REF, "style"),
    "pt_pirate": ("an East Asian sea pirate with a rough stern face and stubble, a black cloth head wrap, a dark grey "
                  "short jacket with rolled sleeves; no weapon visible. Expression: gruff and threatening, not "
                  "gory.",),
    "pt_ming_soldier": ("a Ming Chinese patrol soldier in a red padded cotton armor coat with brass studs and a round "
                        "iron helmet with a small red tassel; only the top of a spear shaft visible beside him. "
                        "Expression: stern and dutiful.",),
    "pt_joseon_sailor": ("a sailor of a Joseon Korean trading ship, a sturdy man about 30 with a sunburnt friendly "
                         "broad masculine face and short stubble, in a white jeogori with a blue sleeveless vest and "
                         "a white cloth headband. Clearly a grown man. Expression: warm, reassuring.", STYLE_REF,
                         "style"),
}


def collect_scene_ids():
    """js 데이터에서 장면 id·caption·prompt_hint를 읽는다(node 필요)."""
    js = r"""
global.window = global;
const fs = require('fs'), path = require('path');
const root = process.argv[2];
const deep = () => new Proxy(function () {}, { get: (t, k) => k === Symbol.toPrimitive ? () => '' : deep(), apply: () => deep() });
global.G = new Proxy({}, { get: () => deep() });
for (const f of ['people.js', 'original.js', 'kimyc.js']) eval(fs.readFileSync(path.join(root, 'js/data', f), 'utf8'));
const dir = path.join(root, 'js/data/places');
for (const f of fs.readdirSync(dir)) { try { eval(fs.readFileSync(path.join(dir, f), 'utf8')); } catch (e) { console.error('WARN', f, e.message); } }
const out = [];
for (const k in PLACES) { const p = PLACES[k]; for (const s in (p.scenes || {})) out.push({ id: s, caption: p.scenes[s].caption, hint: p.scenes[s].prompt_hint }); }
for (const s in (ORIGINAL.scenes || {})) out.push({ id: s, caption: ORIGINAL.scenes[s].caption, hint: ORIGINAL.scenes[s].prompt_hint });
for (const s in (KIMYC.scenes || {})) out.push({ id: s, caption: KIMYC.scenes[s].caption, hint: KIMYC.scenes[s].prompt_hint });
out.push({ id: 'sc_act1_end', caption: '새벽 안남 포구, 나란히 선 두 척의 배', hint: 'dawn at an Annam harbor, a Chinese junk and a Japanese trade ship moored side by side, calm water' });
const pt = Object.values(PEOPLE).map((p) => p.pt).filter(Boolean);
process.stdout.write(JSON.stringify({ scenes: out, pt }));
"""
    with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False, encoding="utf-8") as f:
        f.write(js)
        tmp = f.name
    try:
        r = subprocess.run(["node", tmp, ROOT], capture_output=True, text=True, encoding="utf-8")
    finally:
        os.unlink(tmp)
    if r.returncode != 0:
        sys.exit("node failed: " + r.stderr)
    return json.loads(r.stdout)


def main():
    make_refs()
    data = collect_scene_ids()
    P, M = {}, []
    seen = set()
    for s in data["scenes"]:
        sid = s["id"]
        if sid in seen:
            continue
        seen.add(sid)
        desc = DESC.get(sid)
        if desc is None:
            print("WARN no DESC for", sid, "- using prompt_hint")
            desc = (s.get("hint") or "").encode("ascii", "ignore").decode()
        P[sid] = SCENE_HEAD + desc + "\n\n" + STYLE + PERIOD + (WAR if sid in WAR_IDS else "") + SAFE
        M.append((sid, "1536x1024", STYLE_REF, "style"))
    for sid in DESC:
        if sid not in seen:
            print("WARN DESC not used by the game:", sid)
    for pid in data["pt"]:
        if pid not in PT:
            print("WARN no portrait text for", pid)
    for pid, v in PT.items():
        text, ref, mode = (v + (FACE_REF, "style"))[:3]
        P[pid] = PT_HEAD + text + "\n\n" + STYLE + PERIOD
        M.append((pid, "1024x1024", ref, mode))
    for name, text in P.items():
        bad = [ch for ch in text if ord(ch) >= 128]
        assert not bad, (name, bad[:5])
        with open(os.path.join(PDIR, name + ".txt"), "w", encoding="utf-8", newline="\n") as f:
            f.write(text)
    with open(os.path.join(ROOT, "tools", "manifest.tsv"), "w", encoding="utf-8", newline="\n") as f:
        f.write("# name\tsize\tref\tmode\n")
        for name, size, ref, mode in M:
            f.write(f"{name}\t{size}\t{ref}\t{mode}\n")
    print(len(P), "prompts:", sum(1 for n in P if n.startswith("sc_")), "scenes,",
          sum(1 for n in P if n.startswith("pt_")), "portraits")


if __name__ == "__main__":
    main()
