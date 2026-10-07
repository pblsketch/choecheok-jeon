'use strict';
// 소리: 배경음은 파일 목록(js/data/bgm.js의 BGM.tracks)에 있으면 그 파일을 먼저 틀고,
//  파일이 없거나 읽지 못하면 브라우저 합성음(BGM.tracks.이름.synth)으로 튼다. 효과음은 모두 합성한다.
// 퉁소 층(G.audio.tongso): 안남 장면의 퉁소 소리. 또렷함(clarity)에 따라 크기·저역 필터·메아리가 바뀐다.
//  실제 연주 파일(BGM.tongso)이 없거나 못 읽으면 합성 퉁소음을 같은 방법으로 튼다(아래 '퉁소 층' 참고).
// 합성 엔진(가야금 Karplus-Strong·대금·해금·장구·징·잔향)은 같은 만든이의 「영웅의 길」에서 그대로 가져왔다.
//  - 곡(TRACKS)은 영웅의 길에서 이 게임의 분위기에 맞는 몇 곡만 남기고 이름을 바꿨다(소리 작업에서 더 짓는다).
//  - 새 곡 더하기: G.audio.TRACKS.이름 = { mode, tonic, unit, bar, lead:{inst, mel}, … } (아래 표기 참고)
//  - 새 효과음 더하기: G.audio.addSfx('이름', (ctx, k) => { … }) — k는 합성 도구 묶음
// 배경음·효과음은 설정에서 따로 끈다.
(function () {
  const MUSIC_VOL = 0.5, SFX_VOL = 0.8;
  let ctx = null, comp, musicBus, sfxBus, revIn;
  let ksCache = {}, noiseBuf = null;
  const A = (G.audio = { track: null });
  const S = () => G.save.state;
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

  // 소리 길(버스) 만들기: 실제 재생과 미리 듣기(오프라인 렌더)에 함께 쓴다
  function buildGraph(c) {
    const cp = c.createDynamicsCompressor();
    cp.threshold.value = -14; cp.knee.value = 12; cp.ratio.value = 3; cp.attack.value = 0.01; cp.release.value = 0.25;
    const master = c.createGain(); master.gain.value = 1;
    cp.connect(master); master.connect(c.destination);
    const mb = c.createGain(); mb.gain.value = MUSIC_VOL; mb.connect(cp);
    const sb = c.createGain(); sb.gain.value = SFX_VOL; sb.connect(cp);
    const rev = c.createConvolver();
    const len = Math.floor(c.sampleRate * 2.6), ir = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) { const k = i / len; d[i] = (Math.random() * 2 - 1) * Math.pow(1 - k, 2.4) * (i < 400 ? i / 400 : 1); }
    }
    rev.buffer = ir;
    const ri = c.createGain(); ri.gain.value = 1;
    const ro = c.createGain(); ro.gain.value = 0.3;
    const rl = c.createBiquadFilter(); rl.type = 'lowpass'; rl.frequency.value = 5000;
    ri.connect(rev); rev.connect(rl); rl.connect(ro); ro.connect(cp);
    return { comp: cp, musicBus: mb, sfxBus: sb, revIn: ri };
  }

  function init() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try { ctx = new AC(); } catch (e) { return null; }
    ({ comp, musicBus, sfxBus, revIn } = buildGraph(ctx));
    musicBus.gain.value = S().music ? MUSIC_VOL : 0;
    // 다른 탭으로 가면 소리를 멈춘다(교실에서 여러 기기가 동시에 울리지 않게)
    document.addEventListener('visibilitychange', () => {
      if (!ctx) return;
      if (document.hidden) ctx.suspend(); else ctx.resume();
      if (cur && cur.d) { if (document.hidden) cur.d.el.pause(); else cur.d.el.play().catch(() => {}); }
    });
    A.ctx = ctx;
    return ctx;
  }

  function noise() {
    if (!noiseBuf) {
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; return s;
  }
  function gainNode(v) { const g = ctx.createGain(); g.gain.value = v; return g; }
  function filt(type, f, q) { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; if (q !== undefined) b.Q.value = q; return b; }
  function send(node, out, wet) { node.connect(out); if (wet > 0) { const s = gainNode(wet); node.connect(s); s.connect(revIn); } }

  // ───────── 가야금 (Karplus-Strong)
  function ksBuffer(midi) {
    if (ksCache[midi]) return ksCache[midi];
    const sr = ctx.sampleRate, f = mtof(midi);
    const N = Math.max(2, Math.round(sr / f));
    const len = Math.floor(sr * (midi < 60 ? 3.2 : 2.4));
    const buf = ctx.createBuffer(1, len, sr), d = buf.getChannelData(0);
    const ring = new Float32Array(N);
    for (let i = 0; i < N; i++) ring[i] = Math.random() * 2 - 1;
    for (let pass = 0; pass < 2; pass++) for (let i = 1; i < N; i++) ring[i] = (ring[i] + ring[i - 1]) * 0.5; // 명주실처럼 부드러운 소리
    const decay = 0.9955 + 0.003 * Math.min(1, Math.max(0, (midi - 45) / 40));
    let idx = 0;
    for (let i = 0; i < len; i++) {
      const a = ring[idx], b = ring[(idx + 1) % N];
      ring[idx] = (a + b) * 0.5 * decay;
      d[i] = a;
      idx = (idx + 1) % N;
    }
    return (ksCache[midi] = buf);
  }
  function gayageum(t, midi, dur, vel, orn, out, wet = 0.28) {
    const src = ctx.createBufferSource();
    src.buffer = ksBuffer(Math.round(midi));
    const r = src.playbackRate;
    r.setValueAtTime(orn.includes('<') ? 0.945 : 1, t);
    if (orn.includes('<')) r.linearRampToValueAtTime(1, t + 0.09);
    if (orn.includes('~') && dur > 0.35) { // 농현: 줄을 눌렀다 놓았다
      for (let k = 0, tt = t + 0.18; tt < t + dur; k++, tt += 0.11) r.linearRampToValueAtTime(k % 2 ? 1 : 1.022, tt);
      r.linearRampToValueAtTime(1, t + dur);
    }
    if (orn.includes('>')) { r.setValueAtTime(1, t + Math.max(0.05, dur - 0.18)); r.linearRampToValueAtTime(0.95, t + dur); }
    const lp = filt('lowpass', 3800), body = filt('peaking', 900, 1); body.gain.value = 3;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vel * 0.55, t);
    g.gain.setTargetAtTime(0.0001, t + dur + 0.05, 0.35);
    src.connect(body); body.connect(lp); lp.connect(g); send(g, out, wet);
    src.start(t); src.stop(t + dur + 2.2);
  }

  // ───────── 대금
  function daegeum(t, midi, dur, vel, orn, out, prev, wet = 0.36) {
    const f = mtof(midi);
    const o1 = ctx.createOscillator(); o1.type = 'sine';
    const o2 = ctx.createOscillator(); o2.type = 'triangle';
    const o3 = ctx.createOscillator(); o3.type = 'sine';
    const set = (fq, at) => { o1.frequency.setValueAtTime(fq, at); o2.frequency.setValueAtTime(fq, at); o3.frequency.setValueAtTime(fq * 2, at); };
    const ramp = (fq, at) => { o1.frequency.linearRampToValueAtTime(fq, at); o2.frequency.linearRampToValueAtTime(fq, at); o3.frequency.linearRampToValueAtTime(fq * 2, at); };
    if (prev) { set(mtof(prev), t); ramp(f, t + 0.07); }
    else if (orn.includes('<')) { set(f * 0.94, t); ramp(f, t + 0.1); }
    else set(f, t);
    if (orn.includes('>')) { const s = t + Math.max(0.1, dur - 0.2); set(f, s); ramp(f * 0.955, t + dur); }
    const lfo = ctx.createOscillator(); lfo.frequency.value = 5.3;
    const lg = ctx.createGain(); lg.gain.setValueAtTime(0, t);
    const vs = t + Math.min(0.45, dur * 0.4), depth = f * (orn.includes('~') ? 0.016 : 0.006);
    lg.gain.linearRampToValueAtTime(0, vs); lg.gain.linearRampToValueAtTime(depth, Math.min(t + dur, vs + 0.4));
    lfo.connect(lg); lg.connect(o1.frequency); lg.connect(o2.frequency);
    const mix = ctx.createGain(); mix.gain.value = 1;
    const g2 = gainNode(0.14), g3 = gainNode(0.05);
    o1.connect(mix); o2.connect(g2); g2.connect(mix); o3.connect(g3); g3.connect(mix);
    const n = noise(), bp = filt('bandpass', f * 1.6, 0.9), ng = gainNode(0.035 * vel); // 숨소리
    n.connect(bp); bp.connect(ng); ng.connect(mix);
    const ch = noise(), hp = filt('highpass', 2500), cg = ctx.createGain(); // 첫소리의 바람 잡음
    cg.gain.setValueAtTime(0.0001, t); cg.gain.exponentialRampToValueAtTime(0.06 * vel, t + 0.01); cg.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    ch.connect(hp); hp.connect(cg); cg.connect(mix);
    const env = ctx.createGain(), peak = 0.2 * vel;
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(peak, t + (prev ? 0.03 : 0.08));
    env.gain.setValueAtTime(peak, t + Math.max(0.09, dur - 0.06));
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.16);
    const lp = filt('lowpass', 4200);
    mix.connect(lp); lp.connect(env); send(env, out, wet);
    const end = t + dur + 0.3;
    [o1, o2, o3, lfo, n, ch].forEach((s) => { s.start(t); s.stop(end); });
  }

  // ───────── 해금
  function haegeum(t, midi, dur, vel, orn, out, prev, wet = 0.3) {
    const f = mtof(midi);
    const o1 = ctx.createOscillator(); o1.type = 'sawtooth';
    const o2 = ctx.createOscillator(); o2.type = 'sawtooth'; o2.detune.value = 7;
    const setF = (fq, at) => { o1.frequency.setValueAtTime(fq, at); o2.frequency.setValueAtTime(fq, at); };
    const rampF = (fq, at) => { o1.frequency.linearRampToValueAtTime(fq, at); o2.frequency.linearRampToValueAtTime(fq, at); };
    if (prev) { setF(mtof(prev), t); rampF(f, t + 0.06); }
    else if (orn.includes('<')) { setF(f * 0.9, t); rampF(f, t + 0.12); }
    else setF(f, t);
    if (orn.includes('>')) { const s = t + Math.max(0.08, dur - 0.18); setF(f, s); rampF(f * 0.95, t + dur); }
    const lfo = ctx.createOscillator(); lfo.frequency.value = 6.2;
    const lg = ctx.createGain(); lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * (orn.includes('~') ? 0.02 : 0.009), t + Math.min(dur, 0.35));
    lfo.connect(lg); lg.connect(o1.frequency); lg.connect(o2.frequency);
    const bp = filt('bandpass', 1100, 0.8), pk = filt('peaking', 2500, 1.4); pk.gain.value = 6;
    const lp = filt('lowpass', 3600);
    const env = ctx.createGain(), peak = 0.11 * vel;
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(peak, t + (prev ? 0.04 : 0.1));
    env.gain.setValueAtTime(peak, t + Math.max(0.1, dur - 0.05));
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.14);
    o1.connect(bp); o2.connect(bp); bp.connect(pk); pk.connect(lp); lp.connect(env); send(env, out, wet);
    const end = t + dur + 0.25;
    [o1, o2, lfo].forEach((s) => { s.start(t); s.stop(end); });
  }

  // ───────── 지속음·배경음
  function drone(t, midi, dur, vel, out) {
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(midi);
    const o2 = ctx.createOscillator(); o2.type = 'sawtooth'; o2.frequency.value = mtof(midi) * 1.5; o2.detune.value = -4;
    const lp = filt('lowpass', 480, 0.7);
    const g = ctx.createGain(), g2 = gainNode(0.3);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.04 * vel, t + 0.9);
    g.gain.setValueAtTime(0.04 * vel, t + Math.max(1, dur - 0.9)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(lp); o2.connect(g2); g2.connect(lp); lp.connect(g); send(g, out, 0.2);
    o.start(t); o2.start(t); o.stop(t + dur + 0.1); o2.stop(t + dur + 0.1);
  }
  function pad(t, midi, dur, vel, out) {
    const lp = filt('lowpass', 1800);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05 * vel, t + 1.2);
    g.gain.setValueAtTime(0.05 * vel, t + Math.max(1.3, dur - 1)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 1.2);
    for (const dt of [-7, 0, 7]) {
      const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = mtof(midi); o.detune.value = dt;
      o.connect(lp); o.start(t); o.stop(t + dur + 1.3);
    }
    lp.connect(g); send(g, out, 0.5);
  }

  // ───────── 타악: 장구·북·징
  function hit(t, kind, vel, out) {
    const kung = (tt, v) => {
      const o = ctx.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(96, tt); o.frequency.exponentialRampToValueAtTime(56, tt + 0.2);
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, tt); g.gain.exponentialRampToValueAtTime(0.6 * v, tt + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, tt + 0.38);
      o.connect(g); send(g, out, 0.12); o.start(tt); o.stop(tt + 0.42);
      const n = noise(), lp = filt('lowpass', 380), ng = ctx.createGain();
      ng.gain.setValueAtTime(0.2 * v, tt); ng.gain.exponentialRampToValueAtTime(0.0001, tt + 0.06);
      n.connect(lp); lp.connect(ng); ng.connect(out); n.start(tt); n.stop(tt + 0.08);
    };
    const deok = (tt, v) => {
      const n = noise(), bp = filt('bandpass', 2700, 2.5), g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, tt); g.gain.exponentialRampToValueAtTime(0.42 * v, tt + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, tt + 0.07);
      n.connect(bp); bp.connect(g); send(g, out, 0.15); n.start(tt); n.stop(tt + 0.09);
      const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.setValueAtTime(820, tt); o.frequency.exponentialRampToValueAtTime(560, tt + 0.04);
      const og = ctx.createGain(); og.gain.setValueAtTime(0.12 * v, tt); og.gain.exponentialRampToValueAtTime(0.0001, tt + 0.05);
      o.connect(og); og.connect(out); o.start(tt); o.stop(tt + 0.06);
    };
    if (kind === 'kung') kung(t, vel);
    else if (kind === 'deok') deok(t, vel);
    else if (kind === 'deong') { kung(t, vel); deok(t, vel * 0.9); }
    else if (kind === 'gideok') { deok(t - 0.07, vel * 0.45); deok(t, vel); }
    else if (kind === 'buk') {
      const o = ctx.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(74, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.45);
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.75 * vel, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
      o.connect(g); send(g, out, 0.2); o.start(t); o.stop(t + 0.65);
      const n = noise(), lp = filt('lowpass', 260), ng = ctx.createGain();
      ng.gain.setValueAtTime(0.3 * vel, t); ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
      n.connect(lp); lp.connect(ng); ng.connect(out); n.start(t); n.stop(t + 0.12);
    } else if (kind === 'jing') {
      const f0 = 108;
      [[1, 1], [2.02, 0.55], [2.74, 0.4], [3.46, 0.28], [4.22, 0.18], [5.4, 0.1]].forEach(([m, a], i) => {
        const o = ctx.createOscillator(); o.type = 'sine';
        o.frequency.setValueAtTime(f0 * m * 1.012, t); o.frequency.exponentialRampToValueAtTime(f0 * m, t + 1.2);
        const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.16 * a * vel, t + 0.03 + i * 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 4.2 - i * 0.4);
        o.connect(g); send(g, out, 0.45); o.start(t); o.stop(t + 4.3);
      });
    }
  }

  // ───────── 악보 읽기
  // 표기: 음(1~5, 0=쉼) + 옥타브(^ 위, v 아래) : 길이(단위 수) + 꾸밈(~ 떨기, < 밀어 올리기, > 꺾어 내리기)
  // 예) "1:4 2:2 3:2 | 4:6~ 1^:2" — | 는 마디 구분(보기 편하게)
  // 선법: 평조(밝고 너그러움) = 솔라도레미 꼴, 계면조(슬프고 애절함) = 라도레미솔 꼴
  const MODES = { pyeong: [0, 2, 5, 7, 9], gyemyeon: [0, 3, 5, 7, 10] };
  function parse(str, mode, tonic) {
    const out = [];
    let pos = 0;
    for (const tok of str.split(/\s+/)) {
      if (!tok || tok === '|') continue;
      const m = tok.match(/^([0-5])([\^v]*):(\d+(?:\.\d+)?)([~<>]*)$/);
      if (!m) { console.warn('악보 오류', tok); continue; }
      const deg = +m[1], dur = +m[3];
      if (deg > 0) {
        let oct = 0; for (const c of m[2]) oct += c === '^' ? 1 : -1;
        out.push({ pos, dur, midi: tonic + MODES[mode][deg - 1] + 12 * oct, orn: m[4] || '' });
      }
      pos += dur;
    }
    return { notes: out, len: pos };
  }
  const snap = (midi, mode, tonic) => { // 선법 밖의 음을 가장 가까운 선법 음으로
    const pcs = MODES[mode].map((x) => (x + tonic) % 12);
    for (let d = 0; d < 6; d++) for (const s of [0, -1, 1]) { const m = midi + d * s; if (pcs.includes(((m % 12) + 12) % 12)) return m; }
    return midi;
  };

  // 장단(마디 안의 위치, 소리, 세기)
  const JANGDAN = {
    jungmori8: [[0, 'deong', 0.55], [4, 'kung', 0.4], [6, 'deok', 0.25]],
    gutgeori12: [[0, 'deong', 0.9], [3, 'gideok', 0.6], [5, 'deok', 0.4], [6, 'kung', 0.8], [8, 'deok', 0.5], [9, 'kung', 0.7], [11, 'deok', 0.4]],
    jungjung12: [[0, 'deong', 0.6], [3, 'deok', 0.3], [6, 'kung', 0.55], [9, 'deok', 0.35], [10, 'deok', 0.22]],
    semachi9: [[0, 'deong', 0.9], [3, 'deok', 0.5], [5, 'deok', 0.35], [6, 'kung', 0.8], [7, 'deok', 0.4]],
    jajin12: [[0, 'deong', 1], [0, 'buk', 0.9], [2, 'deok', 0.55], [3, 'kung', 0.8], [5, 'deok', 0.55], [6, 'kung', 0.9], [6, 'buk', 0.7], [8, 'deok', 0.55], [9, 'kung', 0.8], [11, 'gideok', 0.65]],
    // 휘모리: 가장 빠른 장단(네 박). 결전 장면에 쓴다
    hwimori8: [[0, 'deong', 1], [0, 'buk', 0.9], [2, 'deok', 0.55], [4, 'kung', 0.9], [4, 'buk', 0.7], [6, 'deok', 0.55], [7, 'deok', 0.35]],
    sneak12: [[0, 'kung', 0.5], [3, 'deok', 0.22], [6, 'kung', 0.35], [9, 'deok', 0.22], [11, 'deok', 0.14]],   // 게임용 창작(살금살금)
    night12: [[0, 'kung', 0.45], [9, 'deok', 0.2]],                                                          // 게임용 창작(밤·슬픔)
  };

  // ───────── 곡 (「영웅의 길」에서 가져온 곡 가운데 몇 곡. 이름만 이 게임에 맞게 바꿨다)
  //  gain = 곡끼리 음량 맞춤, drum = 장단 세기 배율(글을 읽는 장면은 작게)
  //  title(타이틀·굿거리) · journey(길 떠남·중중모리) · sorrow(이별·계면조 대금) · tension(숨죽임) · dream(꿈·장단 없음) · reunion(재회·중모리 평조)
  const TRACKS = {
    // 타이틀: 굿거리에 가야금이 흥겹게, 대금이 길게 받친다
    title: {
      mode: 'pyeong', tonic: 67, gain: 1.35, unit: 60 / 172, bar: 12, jangdan: 'gutgeori12', drum: 0.5, drone: 43,
      lead: { inst: 'gayageum', vel: 0.85, mel: '5v:3 1:3 2:3 3:3 | 2:6~ 1:3 5v:3 | 1:3 2:3 3:3 5:3 | 3:12~ | 5:3 3:3 5:3 1^:3 | 2^:6~ 1^:3 5:3 | 3:3 5:3 3:3 2:3 | 1:12~ | 3:3 5:3 1^:3 2^:3 | 3^:6~ 2^:3 1^:3 | 5:3 1^:3 5:3 3:3 | 2:12~ | 3:3 2:3 1:3 2:3 | 3:6 5:3 3:3 | 2:3 1:3 5v:3 2:3 | 1:12~' },
      second: { inst: 'daegeum', style: 'long', min: 6, oct: 0, vel: 0.42 },
      acc: { inst: 'gayageum', style: 'bass', beat: 6, oct: -12, vel: 0.45 },
    },
    // 이별·흩어짐: 계면조 대금 독주, 떠는 소리와 꺾는 소리로 서러움을
    sorrow: {
      mode: 'gyemyeon', tonic: 69, gain: 0.65, unit: 60 / 84, bar: 12, jangdan: 'night12', drum: 0.8, drone: 45,
      lead: { inst: 'daegeum', vel: 0.9, mel: '1:6 5v:3 1:3 | 2:9~ 1:3> | 5v:6 4v:3 5v:3 | 1:12~ | 3:6 2:3 3:3 | 4:9~ 3:3> | 2:3 1:3 2:3 3:3 | 2:12~ | 4:6 5:3 1^:3 | 5:9~ 4:3> | 3:3 2:3 1:3 2:3 | 3:12> | 2:6 1:3 5v:3 | 1:6~ 2:3> 1:3 | 5v:3 4v:3 5v:3 2:3 | 1:12~' },
      acc: { inst: 'gayageum', style: 'beats', beat: 6, oct: -12, vel: 0.4 },
    },
    // 숨죽임: 쉼표가 많은 가야금이 조심조심 걷는다
    tension: {
      mode: 'gyemyeon', tonic: 69, gain: 2.45, unit: 60 / 132, bar: 12, jangdan: 'sneak12', drum: 0.7, drone: 45,
      lead: { inst: 'gayageum', vel: 0.8, mel: '1:3 0:3 1:3 2:3 | 3:6~ 0:3 2:3 | 1:3 5v:3 1:3 0:3 | 2:12~ | 3:3 0:3 3:3 4:3 | 5:6~ 4:3 3:3 | 2:3 0:3 1:3 5v:3 | 1:12~' },
      second: { inst: 'haegeum', style: 'long', min: 6, oct: -12, vel: 0.45 },
    },
    // 꿈·신이한 일: 장단 없이 높은 가야금과 은은한 배경음
    dream: {
      mode: 'pyeong', tonic: 76, gain: 1.4, unit: 60 / 80, bar: 8, jangdan: null, drone: null,
      lead: { inst: 'gayageum', vel: 0.72, mel: '5:4 1^:4 | 2^:6~ 3^:2 | 2^:2 1^:2 5:4 | 3:8~ | 1^:4 2^:2 3^:2 | 5^:6~ 3^:2 | 2^:2 3^:2 2^:2 1^:2 | 1^:8~' },
      acc: { inst: 'pad', style: 'chord', oct: -12, vel: 0.85 },
    },
    // 길 떠남: 평조 중중모리, 바람 같은 대금
    journey: {
      mode: 'pyeong', tonic: 69, gain: 0.66, unit: 60 / 150, bar: 12, jangdan: 'jungjung12', drum: 0.6, drone: 45,
      lead: { inst: 'daegeum', vel: 0.9, mel: '5v:3 1:3 2:3 3:3 | 5:6~ 3:3 2:3 | 3:3 5:3 1^:3 2^:3 | 1^:12~ | 2^:3 1^:3 5:3 3:3 | 5:6~ 1^:3 5:3 | 3:3 2:3 1:3 2:3 | 3:12~ | 5:3 3:3 5:3 1^:3 | 2^:6~ 3^:3 2^:3 | 1^:3 5:3 3:3 2:3 | 1:12~' },
      acc: { inst: 'gayageum', style: 'bass', beat: 6, oct: -12, vel: 0.45 },
    },
    // 재회·결과: 평조 중모리, 따뜻하게 정리한다
    reunion: {
      mode: 'pyeong', tonic: 67, gain: 0.66, unit: 60 / 124, bar: 8, jangdan: 'jungmori8', drum: 0.6, jing: [0], drone: 43,
      lead: { inst: 'daegeum', vel: 0.9, mel: '1:4 3:2 5:2 | 1^:6~ 5:2 | 3:2 5:2 3:2 2:2 | 1:8~ | 2:4 3:2 5:2 | 3:6~ 2:2 | 1:2 2:2 3:2 5:2 | 5:8~ | 1^:4 2^:2 1^:2 | 5:6~ 3:2 | 5:2 1^:2 2^:2 3^:2 | 2^:8~ | 1^:4 5:2 3:2 | 5:4 3:2 2:2 | 1:3 2:1 3:2 2:2 | 1:8~' },
      acc: { inst: 'gayageum', style: 'beats', beat: 4, oct: -12, vel: 0.45 },
    },
  };

  function buildTrack(def) {
    const u = def.unit, ev = [];
    const L = parse(def.lead.mel, def.mode, def.tonic);
    const total = L.len;
    let prevEnd = -1, prevMidi = null;
    for (const n of L.notes) {
      const legato = def.lead.inst !== 'gayageum' && Math.abs(n.pos - prevEnd) < 0.01;
      ev.push({ t: n.pos * u, inst: def.lead.inst, midi: n.midi, dur: n.dur * u * (def.lead.inst === 'gayageum' ? 1 : 0.97), vel: def.lead.vel, orn: n.orn, prev: legato ? prevMidi : null });
      prevEnd = n.pos + n.dur; prevMidi = n.midi;
    }
    // 둘째 소리(헤테로포니: 같은 선율을 길게 따라 부른다)
    const S2 = def.second;
    if (S2) for (const n of L.notes) if (n.dur >= S2.min) ev.push({ t: n.pos * u, inst: S2.inst, midi: n.midi + S2.oct, dur: n.dur * u * 0.95, vel: S2.vel, orn: n.orn.replace('<', '') });
    // 반주
    const C = def.acc;
    if (C) {
      if (C.style === 'beats' || C.style === 'bass') {
        for (const n of L.notes) {
          if (n.pos % C.beat !== 0) continue;
          const m = C.style === 'bass' ? snap(n.midi + C.oct - (n.midi - def.tonic >= 12 ? 12 : 0), def.mode, def.tonic) : n.midi + C.oct;
          ev.push({ t: n.pos * u, inst: C.inst, midi: m, dur: Math.min(n.dur, C.beat * 2) * u, vel: C.vel, orn: n.dur >= C.beat * 2 ? '~' : '' });
        }
      } else if (C.style === 'arp') {
        for (let b = 0; b * def.bar < total; b++) {
          const first = L.notes.find((n) => n.pos >= b * def.bar) || L.notes[0];
          const root = first.midi + C.oct - 12 * Math.max(0, Math.floor((first.midi - def.tonic) / 12));
          const tones = [root, snap(root + 7, def.mode, def.tonic), root + 12, snap(root + 7, def.mode, def.tonic)];
          for (let k = 0; k * C.beat < def.bar; k++) ev.push({ t: (b * def.bar + k * C.beat) * u, inst: C.inst, midi: tones[k % 4], dur: C.beat * u * 1.5, vel: C.vel * (k === 0 ? 1.15 : 0.85), orn: '' });
        }
      } else if (C.style === 'ostinato') {
        const O = parse(C.mel, def.mode, def.tonic);
        for (let b = 0; b * def.bar < total; b++) for (const n of O.notes) ev.push({ t: (b * def.bar + n.pos) * u, inst: C.inst, midi: n.midi, dur: n.dur * u, vel: C.vel, orn: '' });
      } else if (C.style === 'chord') {
        for (let b = 0; b * def.bar < total; b++) {
          const first = L.notes.find((n) => n.pos >= b * def.bar) || L.notes[0];
          const root = def.tonic + C.oct + ((first.midi - def.tonic) % 12 + 12) % 12;
          for (const m of [root - 12, snap(root - 5, def.mode, def.tonic), root]) ev.push({ t: b * def.bar * u, inst: 'pad', midi: m, dur: def.bar * u, vel: C.vel, orn: '' });
        }
      }
    }
    // 장단·징·지속음
    const bars = Math.round(total / def.bar), dv = def.drum == null ? 1 : def.drum;
    for (let b = 0; b < bars; b++) {
      if (def.jangdan) for (const [p, k, v] of JANGDAN[def.jangdan]) ev.push({ t: (b * def.bar + p) * u, drum: k, vel: v * dv });
      if (def.jing && def.jing.includes(b)) ev.push({ t: b * def.bar * u + 0.01, drum: 'jing', vel: 0.8 });
      if (def.drone && b % 2 === 0) ev.push({ t: b * def.bar * u, inst: 'drone', midi: def.drone, dur: def.bar * 2 * u, vel: 1 });
    }
    ev.sort((a, b) => a.t - b.t);
    return { notes: ev, length: total * u };
  }

  function playEvent(n, t, out) {
    if (n.drum) return hit(t, n.drum, n.vel, out);
    if (n.inst === 'gayageum') gayageum(t, n.midi, n.dur, n.vel, n.orn, out);
    else if (n.inst === 'daegeum') daegeum(t, n.midi, n.dur, n.vel, n.orn, out, n.prev);
    else if (n.inst === 'haegeum') haegeum(t, n.midi, n.dur, n.vel, n.orn, out, n.prev);
    else if (n.inst === 'drone') drone(t, n.midi, n.dur, n.vel, out);
    else if (n.inst === 'pad') pad(t, n.midi, n.dur, n.vel, out);
  }

  // ───────── 재생(앞질러 예약하기: 0.3초 앞의 음까지 미리 예약)
  const built = {};
  const trackOf = (name) => built[name] || (built[name] = buildTrack(TRACKS[name]));
  let sched = null, cur = null;
  // 파일 배경음: audio 요소 두 개를 번갈아 쓴다(곡을 바꿀 때 겹쳐 흐르고, iOS에서도 한 번 손댄 요소는 계속 틀 수 있게).
  //  웹(http/https)에서는 WebAudio 길(musicBus)로 이어 음량·끄기가 합성음과 같게, file://에서는 요소 음량으로 조절한다.
  const viaGraph = /^https?:$/.test(location.protocol);
  const SILENT = 'data:audio/wav;base64,UklGRrQBAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YZABAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA';
  const decks = [], failed = {};
  // 배경음 파일: BGM.tracks.이름 = { src:'assets/bgm/….mp3', gain } (없으면 합성음)
  const bgmFile = (name) => (window.BGM && window.BGM.tracks && name && window.BGM.tracks[name]) || null;
  const hasBgmFiles = () => !!(window.BGM && window.BGM.tracks && Object.keys(window.BGM.tracks).length);
  function makeDecks() {
    if (decks.length) return;
    for (let i = 0; i < 2; i++) {
      const el = new Audio();
      el.loop = true; el.preload = 'auto';
      const d = { el, busy: false, primed: false, bus: null };
      if (viaGraph) {
        el.crossOrigin = 'anonymous';
        try { d.bus = ctx.createGain(); d.bus.gain.value = 0.0001; ctx.createMediaElementSource(el).connect(d.bus); d.bus.connect(musicBus); } catch (e) { d.bus = null; }
      }
      if (!d.bus) el.volume = 0;
      decks.push(d);
    }
  }
  // 첫 손댐 때 빈 소리를 한 번 틀어 두 요소 모두 '사용자가 허락한' 상태로 만든다
  function prime() {
    makeDecks();
    for (const d of decks) {
      if (d.primed || d.busy) continue;
      d.primed = true;
      d.el.src = SILENT;
      const pr = d.el.play();
      if (pr && pr.then) pr.then(() => { if (!d.busy) d.el.pause(); }, () => { d.primed = false; });
    }
  }
  // 음량을 to(곡 음량 배율)로 secs초 동안 옮긴다
  function fade(d, to, secs, done) {
    clearInterval(d.fade); clearTimeout(d.off); d.fade = d.off = null;
    if (d.bus) {
      const g = d.bus.gain, now = ctx.currentTime;
      g.cancelScheduledValues(now);
      g.setValueAtTime(Math.max(0.0001, g.value), now);
      g.exponentialRampToValueAtTime(Math.max(0.0001, to), now + Math.max(0.02, secs));
      if (done) d.off = setTimeout(done, secs * 1000 + 100);
      return;
    }
    const from = d.el.volume, goal = Math.min(1, MUSIC_VOL * to), t0 = Date.now();
    const tick = () => {
      const k = secs > 0 ? Math.min(1, (Date.now() - t0) / (secs * 1000)) : 1;
      try { d.el.volume = from + (goal - from) * k; } catch (e) { /* 음량을 못 바꾸는 기기 */ }
      if (k >= 1) { clearInterval(d.fade); d.fade = null; if (done) done(); }
    };
    d.fade = setInterval(tick, 50);
    tick();
  }
  function startFile(name) {
    makeDecks();
    const t = bgmFile(name);
    const d = decks.find((x) => !x.busy) || decks[0];
    const me = { name, file: true, d };
    cur = me;
    d.busy = true;
    fade(d, 0, 0);
    d.el.onerror = () => fallback();
    d.el.src = t.src;
    fade(d, t.gain || 1, 1.2);
    function fallback() { if (cur !== me) return; failed[name] = true; stopTrack(true); startTrack(name); } // 파일을 못 읽으면 합성음으로
    const pr = d.el.play();
    if (pr && pr.catch) pr.catch((e) => { if (e && (e.name === 'NotAllowedError' || e.name === 'AbortError')) return; fallback(); }); // 허락 전이면 다음 손댐 때 다시
  }
  function releaseFile(c, fast) {
    const d = c.d;
    d.el.onerror = null;
    fade(d, 0, fast ? 0.8 : 1.5, () => {
      if (cur && cur.d === d) return; // 그새 다시 쓰이면 그대로
      try { d.el.pause(); d.el.removeAttribute('src'); d.el.load(); } catch (e) { /* 무시 */ }
      d.busy = false;
    });
  }
  // 장면 id → 합성 곡 이름(파일이 없거나 못 읽을 때 대신 틀 곡). 같은 이름의 합성 곡이 있으면 그것, 아니면 BGM.tracks.이름.synth
  const synthOf = (name) => (TRACKS[name] ? name : (bgmFile(name) && TRACKS[bgmFile(name).synth] ? bgmFile(name).synth : null));
  function startTrack(name) {
    stopTrack(true);
    if (bgmFile(name) && !failed[name] && !A.synthOnly) return startFile(name);
    const sn = synthOf(name);
    if (!sn) return;
    const tr = trackOf(sn);
    const bus = ctx.createGain(); bus.gain.value = 0.0001; bus.connect(musicBus);
    bus.gain.exponentialRampToValueAtTime(TRACKS[sn].gain || 1, ctx.currentTime + 1.2);
    cur = { name, bus, notes: tr.notes, length: tr.length, idx: 0, loopStart: ctx.currentTime + 0.15 };
    const me = cur;
    const tick = () => {
      if (cur !== me) return;
      const ahead = ctx.currentTime + 0.3;
      for (let guard = 0; guard < 400; guard++) {
        const n = me.notes[me.idx];
        const t = me.loopStart + n.t;
        if (t > ahead) break;
        if (t >= ctx.currentTime - 0.05) { try { playEvent(n, t, me.bus); } catch (e) { /* 무시 */ } }
        me.idx++;
        if (me.idx >= me.notes.length) { me.idx = 0; me.loopStart += me.length + 0.6; } // 한 바퀴 뒤 잠깐 숨
      }
    };
    tick();
    sched = setInterval(tick, 80);
  }
  function stopTrack(fast) {
    if (sched) { clearInterval(sched); sched = null; }
    if (cur && cur.file) { releaseFile(cur, fast); cur = null; return; }
    if (cur && ctx) {
      const b = cur.bus, now = ctx.currentTime;
      b.gain.cancelScheduledValues(now);
      b.gain.setValueAtTime(Math.max(0.0001, b.gain.value), now);
      b.gain.exponentialRampToValueAtTime(0.0001, now + (fast ? 0.8 : 1.5));
      setTimeout(() => b.disconnect(), 3000);
    }
    cur = null;
  }
  // 지금 들려야 할 곡을 맞춘다(배경음을 끄면 예약도 멈춘다)
  function sync() {
    if (!ctx) return;
    const want = S().music && A.track && (synthOf(A.track) || (bgmFile(A.track) && !failed[A.track])) ? A.track : null;
    if (!want) { if (cur) stopTrack(false); return; }
    if (!cur || cur.name !== want) startTrack(want);
  }

  A.unlock = function () {
    if (!init()) return;
    if (ctx.state === 'suspended' && !document.hidden) ctx.resume();
    if (hasBgmFiles() && !A.synthOnly) prime();
    if (cur && cur.d && cur.d.el.paused && !document.hidden) cur.d.el.play().catch(() => {});
    sync();
  };
  // 장면의 곡 정하기(같은 곡이면 그대로 이어서)
  A.play = function (name) {
    A.track = name || null;
    sync();
  };
  // 배경음 켜기/끄기(설정)
  A.music = function (want) {
    if (!init()) return;
    const now = ctx.currentTime;
    musicBus.gain.cancelScheduledValues(now);
    musicBus.gain.setValueAtTime(musicBus.gain.value, now);
    musicBus.gain.linearRampToValueAtTime(want ? MUSIC_VOL : 0, now + 0.8);
    if (want && ctx.state === 'suspended') ctx.resume();
    sync();
  };
  // 점검용: 지금 파일 배경음을 틀면 그 상태, 합성음이거나 멈췄으면 null
  A.nowFile = () => (cur && cur.d ? { name: cur.name, src: cur.d.el.currentSrc, paused: cur.d.el.paused, t: cur.d.el.currentTime, graph: !!cur.d.bus } : null);
  // 점검용: 지금 합성 곡을 틀면 { name: 장면 id, synth: 합성 곡 이름 }
  A.nowSynth = () => (cur && !cur.file ? { name: cur.name, synth: synthOf(cur.name) } : null);
  A.synthOnly = false; // 점검용: true면 파일 없이 합성음만

  // ───────── 효과음(가야금·장구·종이 소리)
  const sfxOn = () => S().sound && init() && ctx.state !== 'closed';
  function tone(type, f0, f1, dur, vol, t0 = 0) {
    const t = ctx.currentTime + t0;
    const o = ctx.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(sfxBus); o.start(t); o.stop(t + dur + 0.05);
  }
  function hiss(dur, vol, f0, f1, type = 'bandpass', t0 = 0, q = 1) {
    const t = ctx.currentTime + t0;
    const n = noise(), f = ctx.createBiquadFilter(); f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    n.connect(f); f.connect(g); g.connect(sfxBus); n.start(t, Math.random() * 1.5); n.stop(t + dur + 0.05);
  }
  const pl = (m, dt = 0, v = 0.8, dur = 0.5, orn = '') => gayageum(ctx.currentTime + dt, m, dur, v, orn, sfxBus, 0.25);
  const SFX = {
    tap: () => hiss(0.03, 0.1, 2600, 1800, 'bandpass', 0, 3),                                           // 누르기: 얇은 나무 소리
    pick: () => pl(81, 0, 0.4, 0.25),                                                                   // 낱말 카드 고르기·놓기
    pencil: () => { hiss(0.18, 0.07, 1600, 4200, 'bandpass', 0, 0.9); pl(86, 0.04, 0.22, 0.15); },    // 붓으로 호칭 표시
    page: () => { hiss(0.24, 0.1, 700, 2800, 'bandpass', 0, 0.7); hiss(0.12, 0.05, 3000, 6500, 'highpass', 0.06); }, // 종이 넘기기
    stamp: () => { hit(ctx.currentTime, 'kung', 0.8, sfxBus); hiss(0.09, 0.16, 800, 200, 'lowpass'); }, // 도장
    ok: () => { [74, 79, 81, 86].forEach((m, i) => pl(m, i * 0.07, 0.8, 0.7)); hit(ctx.currentTime + 0.02, 'deok', 0.45, sfxBus); }, // 맞음
    no: () => { pl(64, 0, 0.6, 0.45, '>'); pl(62, 0.16, 0.55, 0.6, '>'); },                          // 틀림: 가야금을 꺾어 내린다
    hint: () => daegeum(ctx.currentTime, 81, 0.7, 0.6, '~', sfxBus, null, 0.4),                       // 여백의 메모
    inspect: () => { hit(ctx.currentTime, 'deok', 0.35, sfxBus); pl(88, 0.03, 0.35, 0.3); },           // 그림 속 조사 지점
    clue: () => { pl(79, 0, 0.55, 0.35); pl(84, 0.07, 0.55, 0.5); },                                   // 새 낱말을 얻음
    chapter: () => { hit(ctx.currentTime, 'jing', 0.55, sfxBus); hit(ctx.currentTime, 'buk', 0.6, sfxBus); }, // 장 펼치기
    fanfare: () => { [67, 69, 72, 74, 76, 79, 81].forEach((m, i) => pl(m, i * 0.08, 0.75, 0.9)); hit(ctx.currentTime + 0.6, 'jing', 0.8, sfxBus); hit(ctx.currentTime + 0.6, 'buk', 0.7, sfxBus); }, // 장 복원 끝
    grow: () => { [72, 76, 79, 84].forEach((m, i) => pl(m, i * 0.06, 0.6, 0.5)); },                                                  // 게이지가 오름
    drop: () => { pl(64, 0, 0.5, 0.4, '>'); pl(60, 0.14, 0.45, 0.6, '>'); },                                                      // 게이지가 내림
    dream: () => { hit(ctx.currentTime, 'jing', 0.6, sfxBus); [79, 84, 88, 91, 96].forEach((m, i) => pl(m, 0.15 + i * 0.09, 0.5, 0.9, '~')); }, // 꿈·신이한 일
    wave: () => swell(2.6, 0.16, [320, 1100, 260], 'lowpass', 0.8),                                    // 물결: 밀려왔다 빠지는 파도
    wind: () => swell(3.2, 0.09, [500, 1500, 700], 'bandpass', 2.2),                                   // 바람: 휘익 지나가는 바닷바람
    fire: () => { swell(1.8, 0.07, [260, 200, 160], 'lowpass', 0.7); for (let i = 0; i < 9; i++) hiss(0.015 + Math.random() * 0.03, 0.05 + Math.random() * 0.1, 2400 + Math.random() * 2400, 1200, 'bandpass', Math.random() * 1.6, 2); }, // 모닥불: 낮게 타는 소리와 탁탁 튀는 소리
  };
  SFX.gaugeUp = SFX.grow; SFX.gaugeDown = SFX.drop; // 게이지 오름·내림(같은 소리의 다른 이름)
  // 천천히 커졌다 작아지는 걸러진 잡음(f = [시작, 가운데, 끝] 주파수) — 물결·바람·불
  function swell(dur, vol, f, type, q) {
    const t = ctx.currentTime;
    const n = noise(), b = filt(type, f[0], q), g = ctx.createGain();
    n.loop = true;
    b.frequency.setValueAtTime(f[0], t); b.frequency.exponentialRampToValueAtTime(f[1], t + dur * 0.45); b.frequency.exponentialRampToValueAtTime(f[2], t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + dur * 0.4); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    n.connect(b); b.connect(g); send(g, sfxBus, 0.2); n.start(t, Math.random() * 1.5); n.stop(t + dur + 0.05);
  }
  for (const k of Object.keys(SFX)) A[k] = () => { if (!sfxOn()) return; try { SFX[k](); } catch (e) { /* 무시 */ } };
  // 다른 파일이 효과음을 더한다: fn(ctx, kit) — kit = { tone, hiss, pl, hit, gayageum, daegeum, haegeum, sfxBus }
  A.addSfx = function (name, fn) {
    A[name] = () => { if (!sfxOn()) return; try { fn(ctx, { tone, hiss, pl, hit: (t, k, v) => hit(t, k, v, sfxBus), gayageum, daegeum, haegeum, sfxBus }); } catch (e) { /* 무시 */ } };
  };

  // ───────── 퉁소 층(안남 밤 포구)
  //  G.audio.tongso.play({ clarity: 0~1, pan: -1~1 })  울리기(이미 울리면 set과 같다). 소리를 껐으면 아무 일도 없이 false
  //  G.audio.tongso.set({ clarity, pan })               또렷함·방향을 부드럽게 바꾼다(약 0.25초 시간 상수)
  //  G.audio.tongso.stop()                              서서히 멎는다
  //  .playing(지금 울리는가) · .level()(지금 소리 크기 0~1, 물결 굵기용) · .clarity · .pan(마지막으로 받은 값, 소리를 꺼도 남는다)
  //  .source('file'|'synth'|null) · .instrument(파일 악기 이름 '퉁소'·'단소'…, 합성음이면 null)
  //  또렷함 c: 크기 0.05+0.95·c^1.6, 저역 필터 500Hz·24^c(500Hz~12kHz), 메아리·잔향은 멀수록(c가 작을수록) 크다.
  //  파일: 웹(http/https)에서는 mp3를 fetch로 받아 풀고, file://에서는 같은 소리를 base64로 담은 js(BGM.tongso.js)를 불러 푼다.
  //  둘 다 안 되면(파일이 없거나 못 읽음) 합성 퉁소음(계면조 가락, 숨소리·청 울림)을 같은 길로 튼다.
  const TONGSO_VOL = 0.9;
  const TG = { clarity: 0.5, pan: 0, source: null };
  let tg = null;                                        // 지금 울리는 퉁소 길(노드 묶음)
  let tgBuf = null, tgLoad = null, tgBad = false, tgLv = 0, tgArr = null;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const soundOn = () => { try { return !!S().sound; } catch (e) { return false; } };
  const tgSpec = () => (window.BGM && window.BGM.tongso && !A.tongsoSynthOnly ? window.BGM.tongso : null);
  function b64ToArray(b64) { const s = atob(b64), u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u.buffer; }
  function tgLoadBuffer() {
    if (tgBuf) return Promise.resolve(tgBuf);
    const spec = tgSpec();
    if (tgBad || !spec || !ctx) return Promise.resolve(null);
    if (tgLoad) return tgLoad;
    const viaScript = () => new Promise((res, rej) => {
      const got = () => (window.TONGSO_DATA && window.TONGSO_DATA.b64 ? res(b64ToArray(window.TONGSO_DATA.b64)) : rej(new Error('퉁소 자료가 비었음')));
      if (window.TONGSO_DATA && window.TONGSO_DATA.b64) return got();
      if (!spec.js) return rej(new Error('퉁소 js 없음'));
      const el = document.createElement('script');
      el.src = spec.js; el.onload = got; el.onerror = () => rej(new Error('퉁소 js를 못 읽음'));
      document.head.appendChild(el);
    });
    const viaFetch = () => fetch(spec.src).then((r) => { if (!r.ok) throw new Error('http ' + r.status); return r.arrayBuffer(); });
    const decode = (ab) => new Promise((res, rej) => { const p = ctx.decodeAudioData(ab, res, rej); if (p && p.then) p.then(res, rej); });
    const get = viaGraph && spec.src ? viaFetch().catch(viaScript) : viaScript();
    tgLoad = get.then(decode).then((b) => { tgLoad = null; return (tgBuf = b); }, () => { tgLoad = null; tgBad = true; return null; });
    return tgLoad;
  }
  function tgChain() {
    const input = ctx.createGain();
    const lp = filt('lowpass', 2000, 0.7);
    const vol = ctx.createGain(); vol.gain.value = 0.3;     // 또렷함에 따른 크기
    const amp = ctx.createGain(); amp.gain.value = 0.0001;  // 들어오고 나가는 크기
    const an = ctx.createAnalyser(); an.fftSize = 1024;
    const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    const out = gainNode(TONGSO_VOL); out.connect(comp);
    const dest = pan || out; if (pan) pan.connect(out);
    input.connect(lp); lp.connect(vol); vol.connect(amp); amp.connect(an); amp.connect(dest);
    // 멀리서 울리는 메아리(물 위로 되돌아오는 소리)
    const echo = gainNode(0), dl = ctx.createDelay(1), fb = gainNode(0.32), elp = filt('lowpass', 2200);
    dl.delayTime.value = 0.34;
    amp.connect(echo); echo.connect(dl); dl.connect(elp); elp.connect(fb); fb.connect(dl); elp.connect(dest);
    const rev = gainNode(0); amp.connect(rev); rev.connect(revIn);
    return { input, lp, vol, amp, an, pan, out, echo, rev, src: null, sched: null, timer: null, watch: null };
  }
  function tgApply(t, fast) {
    const c = TG.clarity, now = ctx.currentTime, tc = fast ? 0.01 : 0.25;
    const ramp = (p, v) => { p.cancelScheduledValues(now); p.setValueAtTime(p.value, now); p.setTargetAtTime(v, now, tc); };
    ramp(t.vol.gain, 0.05 + 0.95 * Math.pow(c, 1.6));
    ramp(t.lp.frequency, 500 * Math.pow(24, c));
    ramp(t.echo.gain, 0.42 * (1 - c));
    ramp(t.rev.gain, 0.12 + 0.5 * (1 - c));
    if (t.pan) ramp(t.pan.pan, TG.pan);
  }
  // 합성 퉁소음: 대금 소리에 낮은 숨소리와 청(얇은 막)이 떠는 소리를 더한다
  function tongsoVoice(t, midi, dur, vel, orn, out, prev) {
    daegeum(t, midi, dur, vel, orn, out, prev, 0);
    const f = mtof(midi);
    const n = noise(), bp = filt('bandpass', f * 2.2, 1.2), ng = ctx.createGain(); // 굵은 숨소리
    ng.gain.setValueAtTime(0.0001, t); ng.gain.exponentialRampToValueAtTime(0.05 * vel, t + 0.12);
    ng.gain.setValueAtTime(0.05 * vel, t + Math.max(0.13, dur - 0.05)); ng.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.15);
    n.connect(bp); bp.connect(ng); ng.connect(out); n.start(t, Math.random() * 1.5); n.stop(t + dur + 0.2);
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(prev ? mtof(prev) : f, t); o.frequency.linearRampToValueAtTime(f, t + 0.07);
    const cb = filt('bandpass', 2600, 2.5), cg = ctx.createGain(); // 청 울림
    cg.gain.setValueAtTime(0.0001, t); cg.gain.exponentialRampToValueAtTime(0.018 * vel, t + 0.1);
    cg.gain.setValueAtTime(0.018 * vel, t + Math.max(0.11, dur - 0.05)); cg.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.12);
    o.connect(cb); cb.connect(cg); cg.connect(out); o.start(t); o.stop(t + dur + 0.15);
  }
  // 합성 퉁소 가락(계면조, 느린 진양조 느낌의 자유 가락). 한 바퀴 뒤 2초 쉰다
  const TONGSO_SYN = { mode: 'gyemyeon', tonic: 64, unit: 60 / 70,
    mel: '1:6 5v:3 1:3 | 2:9~ 1:3> | 3:6 2:3 1:3 | 5v:12~ | 1:3 2:3 3:3 4:3 | 5:9~ 4:3> | 3:3 2:3 1:3 2:3 | 1:12~' };
  function tgSynth(t) {
    TG.source = 'synth';
    const P = parse(TONGSO_SYN.mel, TONGSO_SYN.mode, TONGSO_SYN.tonic), u = TONGSO_SYN.unit;
    let pe = -1, pm = null;
    const notes = P.notes.map((n) => { const r = { ...n, prev: Math.abs(n.pos - pe) < 0.01 ? pm : null }; pe = n.pos + n.dur; pm = n.midi; return r; });
    const len = P.len * u + 2;
    let idx = 0, start = ctx.currentTime + 0.1;
    const tick = () => {
      if (tg !== t) return;
      const ahead = ctx.currentTime + 0.3;
      for (let guard = 0; guard < 100; guard++) {
        const n = notes[idx], at = start + n.pos * u;
        if (at > ahead) break;
        if (at >= ctx.currentTime - 0.05) { try { tongsoVoice(at, n.midi, n.dur * u * 0.97, 0.9, n.orn, t.input, n.prev); } catch (e) { /* 무시 */ } }
        idx++;
        if (idx >= notes.length) { idx = 0; start += len; }
      }
    };
    tick();
    t.sched = setInterval(tick, 80);
  }
  // 파일 퉁소: 한 가락을 끝까지 불고 1.4초 쉬었다가 다시 분다
  function tgFile(t, buf) {
    TG.source = 'file';
    const once = () => {
      if (tg !== t) return;
      const s = ctx.createBufferSource(); s.buffer = buf; s.connect(t.input);
      s.onended = () => { if (tg === t) t.timer = setTimeout(once, 1400); };
      s.start(); t.src = s;
    };
    once();
  }
  function tgStart() {
    const t = tgChain(), now = ctx.currentTime;
    tg = t; TG.source = null;
    tgApply(t, true);
    t.amp.gain.setValueAtTime(0.0001, now); t.amp.gain.exponentialRampToValueAtTime(1, now + 0.6);
    t.watch = setInterval(() => { if (tg === t && !soundOn()) tgStop(true); }, 250); // 그사이 소리를 끄면 멎는다
    const go = (buf) => { if (tg !== t) return; if (buf) tgFile(t, buf); else tgSynth(t); };
    if (tgBuf) go(tgBuf); else if (tgSpec() && !tgBad) tgLoadBuffer().then(go); else go(null);
  }
  function tgStop(fast) {
    const t = tg;
    if (!t) return;
    tg = null; TG.source = null; tgLv = 0;
    clearInterval(t.sched); clearTimeout(t.timer); clearInterval(t.watch);
    const now = ctx.currentTime, g = t.amp.gain;
    g.cancelScheduledValues(now); g.setValueAtTime(Math.max(0.0001, g.value), now); g.exponentialRampToValueAtTime(0.0001, now + (fast ? 0.3 : 1.2));
    setTimeout(() => { try { if (t.src) { t.src.onended = null; t.src.stop(); } } catch (e) { /* 이미 멎음 */ } try { t.out.disconnect(); t.rev.disconnect(); } catch (e) { /* 무시 */ } }, (fast ? 0.3 : 1.2) * 1000 + 3000);
  }
  function take(o) {
    if (!o) return;
    if (Number.isFinite(+o.clarity) && o.clarity !== null) TG.clarity = clamp(+o.clarity, 0, 1);
    if (Number.isFinite(+o.pan) && o.pan !== null) TG.pan = clamp(+o.pan, -1, 1);
  }
  A.tongso = {
    play(o) {
      take(o);
      if (!soundOn() || !init() || ctx.state === 'closed') return false;
      try { if (tg) tgApply(tg); else tgStart(); } catch (e) { return false; }
      return true;
    },
    set(o) { take(o); if (tg && ctx) { try { tgApply(tg); } catch (e) { /* 무시 */ } } },
    stop(fast) { if (tg && ctx) { try { tgStop(!!fast); } catch (e) { tg = null; } } },
    get playing() { return !!tg; },
    get clarity() { return TG.clarity; },
    get pan() { return TG.pan; },
    get source() { return tg ? TG.source : null; },
    get instrument() { const s = tgSpec(); return s && !tgBad ? s.instrument || '퉁소' : null; },
    // 지금 소리 크기 0~1(물결 굵기·자막용). 올라갈 때는 바로, 내려갈 때는 천천히 따라간다. 소리가 안 나면 0
    level() {
      if (!tg || !ctx || ctx.state !== 'running') return (tgLv = 0);
      const an = tg.an;
      if (!tgArr || tgArr.length !== an.fftSize) tgArr = new Float32Array(an.fftSize);
      an.getFloatTimeDomainData(tgArr);
      let s = 0; for (let i = 0; i < tgArr.length; i++) s += tgArr[i] * tgArr[i];
      const v = Math.min(1, Math.sqrt(s / tgArr.length) * 4);
      tgLv = v > tgLv ? v : tgLv * 0.85 + v * 0.15;
      return tgLv;
    },
    // 미리 풀어 두기(안남에 들어갈 때 불러 두면 첫 소리가 늦지 않다). 소리를 껐으면 하지 않는다
    preload() { if (soundOn() && init()) tgLoadBuffer(); },
    // 점검용: 파일 캐시를 비운다(BGM.tongso를 바꾼 뒤)
    _reset() { if (tg) tgStop(true); tgBuf = null; tgLoad = null; tgBad = false; try { delete window.TONGSO_DATA; } catch (e) { window.TONGSO_DATA = undefined; } },
  };
  A.tongsoSynthOnly = false; // 점검용: true면 파일 없이 합성 퉁소음만

  // ───────── 미리 듣기·점검용: 곡을 오프라인으로 렌더해 AudioBuffer로 돌려준다
  A.render = async function (name, seconds = 20, rate = 44100) {
    const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    const off = new OAC(2, Math.ceil(seconds * rate), rate);
    const saved = [ctx, comp, musicBus, sfxBus, revIn, ksCache, noiseBuf];
    try {
      ctx = off; ksCache = {}; noiseBuf = null;
      ({ comp, musicBus, sfxBus, revIn } = buildGraph(off));
      const tr = buildTrack(TRACKS[name]);
      const tb = off.createGain(); tb.gain.value = TRACKS[name].gain || 1; tb.connect(musicBus);
      for (let loop = 0; loop * tr.length < seconds; loop++) {
        for (const n of tr.notes) { const t = loop * (tr.length + 0.6) + n.t + 0.05; if (t < seconds) playEvent(n, t, tb); }
      }
    } finally {
      [ctx, comp, musicBus, sfxBus, revIn, ksCache, noiseBuf] = saved;
    }
    return off.startRendering();
  };
  A.now = () => (cur ? cur.name : null); // 지금 실제로 흐르는 곡(점검용)
  A.TRACKS = TRACKS;
  A._parse = parse;
})();
