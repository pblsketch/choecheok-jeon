'use strict';
// 배경음·퉁소 파일 목록(선생님이 고쳐도 되는 파일)
//  - tracks의 이름은 장면 id다. 거점 데이터에서 music: 'annam_night'처럼 부르면 G.audio.play('annam_night')가 이 파일을 튼다.
//  - 파일이 없거나 읽지 못하면 synth에 적은 합성 곡(js/core/audio.js의 TRACKS)으로 바꿔 튼다.
//  - 음원: 국립국악원 「디지털 이음」 국악기 악구(https://www.gugak.go.kr/digitaleum/) — 공공누리 제1유형(출처표시).
//    한 연주를 번호 순서대로 잘게 나눈 악구를 순서대로 이어 붙였다(tools/make_bgm.py). 파일마다 출처는 credits/audio.tsv.
//  - gain: 곡마다 소리 크기(1이 기본). 곡은 모두 -17 LUFS로 맞췄고, 안남 밤 포구만 퉁소가 얹히므로 -22 LUFS로 작게 만들었다.
//  - tongso: 퉁소 실제 연주 파일. null이면 합성 퉁소음을 쓴다. tools/make_tongso.py가 이 줄을 파일을 가리키게 바꾼다.
//    { src: mp3(웹에서 씀), js: 같은 소리를 base64로 담은 파일(file://로 열 때 씀), instrument: '퉁소'|'단소'…, from: 출처 }
//    instrument가 '퉁소'가 아니면 이야기 수첩·크레딧에 "퉁소 대신 ○○ 연주"라고 밝힌다(spec §9).
window.BGM = {
  credit: '배경음: 국립국악원 「디지털 이음」 국악기 악구(공공누리 제1유형)를 이어 붙였어요',
  tracks: {
    namwon_memory: { src: 'assets/bgm/namwon_memory.mp3', synth: 'sorrow', from: '대금 산조(이영섭류) — 진양조' },
    flight: { src: 'assets/bgm/flight.mp3', synth: 'tension', from: '한갑득류 거문고 산조 — 엇모리' },
    nanggoya: { src: 'assets/bgm/nanggoya.mp3', synth: 'sorrow', from: '윤윤석류 아쟁 산조 — 진양조' },
    annam_night: { src: 'assets/bgm/annam_night.mp3', synth: 'dream', from: '한갑득류 거문고 산조 — 중모리' },
    hangzhou: { src: 'assets/bgm/hangzhou.mp3', synth: 'journey', from: '성금련류 가야금 산조 — 늦은중중모리' },
    sea: { src: 'assets/bgm/sea.mp3', synth: 'journey', from: '소금 연례악 — 수제천' },
    island: { src: 'assets/bgm/island.mp3', synth: 'dream', from: '지영희류 해금 산조 — 진양조' },
    reunion: { src: 'assets/bgm/reunion.mp3', synth: 'reunion', from: '가야금 경기민요 — 도라지·아리랑' },
    result: { src: 'assets/bgm/result.mp3', synth: 'title', from: '가야금 경기민요 — 천안삼거리·한강수타령·창부타령' },
  },
  tongso: { src: 'assets/sfx/tongso.mp3', js: 'assets/sfx/tongso_data.js', instrument: "퉁소", from: "국립국악원 디지털 이음 「단음 다운로드」 퉁소 — 연주: 애원성(Tungso_8)" },
};
