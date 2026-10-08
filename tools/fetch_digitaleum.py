# -*- coding: utf-8 -*-
"""국립국악원 「디지털 이음」에서 배경음 악구 원음을 내려받아 assets/raw_audio/<폴더>/에 둔다.

    python tools/fetch_digitaleum.py [--purpose 상업용] [--use "어플리케이션 제작"] [--org 기관명]

- 받을 악구는 tools/make_bgm.py의 TRACKS에서 읽는다. 받은 뒤 python tools/make_bgm.py로 배경음을 다시 만든다.
- 디지털 이음은 내려받을 때 사용목적(상업용/비상업용)·사용용도·기관명을 적게 한다. 이 게임은 지학사 납품용이라
  기본값을 상업용·어플리케이션 제작·온양여자고등학교로 둔다(만든이 소속).
- 이용 조건: 공공누리 제1유형(출처표시) — 상업적 이용·변경 가능, 출처 표시 필요.
"""
import os
import sys
import urllib.parse
import urllib.request
import http.cookiejar

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from make_bgm import TRACKS, ROOT  # noqa: E402

BASE = "https://www.gugak.go.kr/digitaleum"


def main(argv):
    opt = {"--purpose": "상업용", "--use": "어플리케이션 제작", "--org": "온양여자고등학교"}
    for i, a in enumerate(argv):
        if a in opt and i + 1 < len(argv):
            opt[a] = argv[i + 1]
    jar = http.cookiejar.CookieJar()
    web = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
    web.open(BASE + "/front/phrase/list.do").read()  # 세션 쿠키
    want = {}
    for folder, codes, _ in TRACKS.values():
        for c in codes:
            want.setdefault(folder, set()).add(c)
    n = 0
    for folder, codes in sorted(want.items()):
        d = os.path.join(ROOT, "assets", "raw_audio", folder)
        os.makedirs(d, exist_ok=True)
        for code in sorted(codes):
            body = urllib.parse.urlencode({"id": code, "arrId": "", "usePurposeGb": opt["--purpose"], "usePurpose": opt["--use"],
                                           "usePurposeDtl": "", "companyName": opt["--org"]}).encode("utf-8")
            r = web.open(urllib.request.Request(BASE + "/cmmn/file/phrase/download.do", data=body, method="POST"))
            cd = r.headers.get("Content-Disposition", "")
            name = urllib.parse.unquote(cd.split("''")[-1]) if "''" in cd else code + ".wav"
            data = r.read()
            if not data.startswith(b"RIFF"):
                raise SystemExit(f"{code}: wav가 아님({r.headers.get('Content-Type')}, {len(data)}바이트)")
            with open(os.path.join(d, name), "wb") as f:
                f.write(data)
            n += 1
            print(f"{folder}/{name} {len(data) // 1024}KB")
    print(f"{n}개 받음 — 사용목적 {opt['--purpose']}, 용도 {opt['--use']}, 기관 {opt['--org']}")


if __name__ == "__main__":
    main(sys.argv[1:])
