'use strict';
// 만든 사람·출처(게임 안 '만든 사람·출처' 화면, js/game/notebook.js의 NB.credits가 읽는다)
//  파일 하나하나의 출처·이용 조건·고친 내용은 credits/*.tsv에 있고, 그것을 사람이 읽기 좋게 모은 것이 CREDITS.md다.
//  이 파일은 그 요약이다. 소재를 더하거나 바꾸면 credits/*.tsv → CREDITS.md → 이 파일 차례로 고친다.
//  꼴: { sections: [{ title, items: [{ title, by, license, note, src }] }] }
//  만든이 줄과 '원문과 풀이' 세 줄은 js/data/notes.js의 NOTES.credits에 있다(이 파일이 비어 있어도 늘 보인다).
(function () {
  const OFL = 'SIL Open Font License 1.1';
  const KOGL = '공공누리 제1유형(출처표시)';
  const OWN = '자체 생성물';
  const EUM = 'https://www.gugak.go.kr/digitaleum/';

  // 퉁소: js/data/bgm.js의 tongso가 비어 있으면(실제 연주 파일을 아직 넣지 않았으면) 합성음이라고 밝힌다.
  //  tools/make_tongso.py가 파일을 만들면 bgm.js의 tongso 줄이 바뀌고, 이 줄도 저절로 실제 연주로 바뀐다.
  //  화면을 열 때마다 bgm.js를 다시 읽도록 값을 그때그때 꺼낸다(get).
  const tg = () => (window.BGM && window.BGM.tongso) || null;
  const inst = () => (tg() ? tg().instrument || '퉁소' : '');
  const tongso = {
    get title() { return !tg() || inst() === '퉁소' ? '퉁소 가락(안남 포구)' : `퉁소 대신 ${inst()} 연주(안남 포구)`; },
    get by() { return tg() ? tg().from || '국립국악원 「디지털 이음」' : '지금은 브라우저가 만든 합성음'; },
    get license() { return tg() ? KOGL : '자체 제작'; },
    get note() {
      return tg()
        ? '앞뒤를 줄이고 소리 크기를 맞춤. 연주자는 사이트에 적혀 있지 않음(국립국악원 제작 음원).'
        : '국립국악원 「디지털 이음」의 실제 퉁소 연주 「애원성」(Tungso_8.wav, 공공누리 제1유형)을 받아 넣으면 그 연주로 바뀌어요.';
    },
    get src() { return tg() ? EUM : ''; },
  };

  window.CREDITS = {
    sections: [
      {
        title: '그림',
        items: [
          { title: '장면 삽화 54장 · 대화 초상 20장', by: 'Codex CLI 이미지 생성(만든이가 직접 생성), 현대 그림책풍', license: OWN, note: '크기를 줄여 webp로 바꿈. 그림 안에 글자를 넣지 않았어요.' },
          { title: '도트 인물 20벌 · 소품 34가지', by: 'Codex CLI 이미지 생성(만든이가 직접 생성)', license: OWN, note: '배경을 빼고 프레임을 잘라 땅 한 칸 32px에 맞게 줄이고 색 수를 줄임.' },
          { title: '타이틀 그림 · 고지도 · 옥영 초상(HUD) · 한지 무늬', by: 'Codex CLI 이미지 생성(만든이가 직접 생성)', license: OWN, note: '고지도에는 글자가 없고, 지명과 뱃길은 화면 글자로 얹었어요. 앱 아이콘과 링크 미리 보기 그림은 타이틀 그림에서 잘라 만들었어요.' },
          { title: '땅 무늬 · 빛 · 물결', by: '코드로 그림', license: '자체 제작' },
        ],
      },
      {
        title: '소리',
        items: [
          {
            title: '배경음 9곡',
            by: '국립국악원 「디지털 이음」 악구 다운로드',
            license: KOGL,
            note: '대금·거문고·아쟁·해금·가야금 산조, 소금 수제천, 가야금 경기민요의 악구를 차례대로 이어 붙임. 연주자는 사이트에 적혀 있지 않음(국립국악원 제작 음원).',
            src: EUM,
          },
          tongso,
          { title: '효과음(종이 넘김·물결·바람·모닥불·게이지)', by: '브라우저가 만든 합성음', license: '자체 제작' },
        ],
      },
      {
        title: '글꼴',
        items: [
          { title: '고운바탕(Gowun Batang)', by: 'The Gowun Batang Project Authors', license: OFL, note: '본문 글꼴. 게임에 쓰인 글자만 남김.' },
          { title: 'Noto Serif KR', by: 'Google', license: OFL, note: '한자 글꼴. 게임에 쓰인 글자만 남김.' },
          { title: '나눔손글씨 붓(Nanum Brush Script)', by: 'NHN Corporation', license: OFL, note: '제목·거점 이름 글꼴. 게임에 쓰인 글자만 남기고 이름을 바꿈.' },
        ],
      },
      {
        title: '글',
        items: [
          { title: '원문 풀이 · 함정 구절 · 대사 · 카드 글', by: '만든이가 직접 씀', license: '자체 제작', note: '교과서 번역문은 쓰지 않았어요. 시구 맞추기의 함정 구절도 새로 지었어요(최척의 화답시 구절만 원문).' },
          { title: '역사 카드 7장', by: '만든이가 직접 씀', license: '자체 제작', note: '백과사전·논문·기사를 참고했고, 카드마다 참고 자료를 적었어요.' },
          { title: '「김영철전」 원문', by: '홍세태 『유하집』 권9(1730년 간행, 공유 저작물)', license: '공유 저작물(저작권 보호 기간 만료)', note: '글자는 간행본을 따랐고, 구두점은 이 게임이 새로 찍었어요. 한국고전번역원 표점본의 구두점은 쓰지 않았어요.' },
        ],
      },
      {
        title: '만든 도구',
        items: [
          { title: '게임 엔진', by: '같은 만든이의 「영웅의 길」에서 가져와 고침', note: '탑다운 맵, 대화, 저장, 합성 소리' },
          { title: '그림 생성', by: 'Codex CLI(image_gen)' },
          { title: '그림·소리·글꼴 손질', by: 'Python(Pillow·SciPy·fontTools), ffmpeg' },
        ],
      },
    ],
  };
})();
