'use strict';
// 인물(선생님이 고쳐도 되는 파일)
//  - id: 거점 파일의 대사 { who:'okyoung', t:'…' }와 사람 배치 { who:'donwoo', … }에 쓰는 이름
//  - name: 화면에 보이는 이름 · pt: 초상 그림 id(그림 파일이 생기면 window.ART.pt에 경로를 적는다)
//  - sp: 맵에서 쓰는 도트 인물 그림 id(js/data/sprites.js에 없으면 단색 사람 모양으로 대신 그린다)
//  - color: 말풍선 이름 색·대신 그리는 사람 모양 색 · role: 누구인가(수첩·교사용 설명)
//  옥영의 모습은 여러 벌이다: sp_okyoung_m(남복) · sp_okyoung_f(여복) · sp_okyoung_joseon(조선 옷) · sp_okyoung_ming(명나라 옷)
window.PEOPLE = Object.assign(window.PEOPLE || {}, {
  okyoung: { name: '옥영', pt: 'pt_okyoung', sp: 'sp_okyoung_m', color: '#b3342a', role: '주인공. 최척의 아내. 전란 속에서 가족을 찾아 바다를 두 번 건넌다' },
  choecheok: { name: '최척', pt: 'pt_choecheok', sp: 'sp_choecheok', color: '#36548f', role: '옥영의 남편. 퉁소를 잘 분다' },
  donwoo: { name: '돈우', pt: 'pt_donwoo', sp: 'sp_donwoo', color: '#6d5a2a', role: '옥영을 데려간 일본 상인. 살생을 꺼리는 불자' },
  mongseon: { name: '몽선', pt: 'pt_mongseon', sp: 'sp_mongseon', color: '#2f6b45', role: '옥영과 최척의 둘째 아들. 항주에서 태어났다' },
  hongdo: { name: '홍도', pt: 'pt_hongdo', sp: 'sp_hongdo', color: '#c0607a', role: '몽선의 아내. 진위경의 딸' },
  mongseok: { name: '몽석', pt: 'pt_mongseok', sp: 'sp_mongseok', color: '#4a6a6a', role: '옥영과 최척의 맏아들. 남원에서 헤어졌다' },
  jinwigyeong: { name: '진위경', pt: 'pt_jinwigyeong', sp: 'sp_jinwigyeong', color: '#7a5a1f', role: '홍도의 아버지. 명나라 군사로 조선에 왔다가 돌아가지 못했다' },
  simssi: { name: '심씨', pt: 'pt_simssi', sp: 'sp_simssi', color: '#6d8a5a', role: '옥영의 어머니, 최척의 장모' },
  choesuk: { name: '최숙', pt: 'pt_choesuk', sp: 'sp_choesuk', color: '#5a4a3a', role: '최척의 아버지' },
  jangyukbul: { name: '장육불', pt: 'pt_jangyukbul', sp: null, color: '#b8892e', role: '만복사의 장육금불. 꿈에 나타나 옥영에게 죽지 말라고 이른다' },
  songwoo: { name: '송우', pt: 'pt_songwoo', sp: null, color: '#1f7474', role: '학천 송우. 최척의 벗. 최척을 안남으로 가는 배에 태운다' },
  // 여러 곳에 나오는 사람들(이름 없는 역할)
  merchant: { name: '상인', pt: 'pt_merchant', sp: 'sp_merchant_ming', color: '#8a6a2a', role: '포구의 상인' },
  merchant_ming: { name: '명나라 상인', pt: 'pt_merchant_ming', sp: 'sp_merchant_ming', color: '#8a6a2a', role: '명나라 상인' },
  merchant_jp: { name: '왜 상인', pt: 'pt_merchant_jp', sp: 'sp_merchant_jp', color: '#6d5a2a', role: '일본 상인' },
  sailor: { name: '뱃사람', pt: 'pt_sailor', sp: 'sp_sailor_sea', color: '#36548f', role: '배를 부리는 사람' },
  sailor_west: { name: '먼 나라 뱃사람', pt: 'pt_sailor_west', sp: 'sp_sailor_west', color: '#4a5a7a', role: '먼 바다에서 온 뱃사람' },
  captive: { name: '조선인 포로', pt: 'pt_captive', sp: 'sp_captive', color: '#7c7163', role: '전쟁 중에 끌려온 조선 사람' },
  pirate: { name: '해적', pt: 'pt_pirate', sp: 'sp_pirate', color: '#4a3b30', role: '바다에서 배를 빼앗는 무리' },
  ming_soldier: { name: '명나라 군사', pt: 'pt_ming_soldier', sp: 'sp_ming_soldier', color: '#9e2b25', role: '명나라 군사' },
  joseon_sailor: { name: '조선 뱃사람', pt: 'pt_joseon_sailor', sp: 'sp_joseon_sailor', color: '#2f6b45', role: '조선 배의 뱃사람' },
});

// 그림 파일 목록: 실제로 있는 그림만 적는다(없는 파일을 부르지 않아 콘솔이 깨끗하다).
//  예) ART.pt.pt_okyoung = 'assets/pt/pt_okyoung.webp' · ART.sc.sc_annam_port = 'assets/sc/sc_annam_port.webp'
window.ART = window.ART || {};
window.ART.pt = window.ART.pt || {};
window.ART.sc = window.ART.sc || {};
