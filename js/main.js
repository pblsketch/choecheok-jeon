'use strict';
// 시작: 저장 불러오기 → 주소 바로가기 → 타이틀
//  ?teacher=1        선생님용 켜기(게이지 숫자, 장면·목표 건너뛰기)
//  ?place=거점 id     그 거점부터 바로 펼치기(만들면서 확인할 때)
//  새 바로가기는 G.boot.routes에 더한다: G.boot.routes.push((q, st) => { if (q.get('act') === '2') { …; return true; } })
//   (true를 돌려주면 그 바로가기가 화면을 맡고 타이틀은 띄우지 않는다)
(function () {
  const boot = (G.boot = { routes: [] });
  G.save.load();
  const q = new URLSearchParams(location.search);
  if (q.get('teacher') === '1') { G.save.state.teacher = true; G.save.write(); }
  G.app.applySettings();
  G.app.watchOrientation();
  // 손댈 때마다 소리를 풀어 준다(막혔던 배경음 파일도 이때 다시 튼다)
  document.addEventListener('pointerdown', () => G.audio.unlock(), { passive: true });
  document.addEventListener('keydown', () => G.audio.unlock());
  boot.routes.push((qq) => {
    const p = qq.get('place');
    if (p && (window.FLOW || {}).order && FLOW.order.includes(p)) { G.app.play(p); return true; }
    return false;
  });
  // 다른 파일이 바로가기를 더할 틈을 준 뒤(같은 순서로 실린 스크립트가 모두 끝난 다음) 시작한다
  const go = () => {
    for (const r of boot.routes) { try { if (r(q, G.save.state)) return; } catch (e) { console.error(e); } }
    G.app.title();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go, { once: true });
  else go();
})();
