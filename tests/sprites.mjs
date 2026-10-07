// 도트 인물·소품 점검(엔진 없이): node sprites.mjs
// 1) 정해 둔 스프라이트 id가 js/data/sprites.js에 모두 있고 걷기 3방향 × 4프레임인지
// 2) 아틀라스·소품 그림 파일이 있고, 프레임이 그림 안에 들어가며 비어 있지 않은지
// 3) 모든 프레임(오른쪽은 왼쪽을 뒤집어)과 소품을 한 장에 늘어놓아 tests/shots/sprites.png로 쓴다
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const IDS = ['sp_okyoung_m', 'sp_okyoung_f', 'sp_okyoung_joseon', 'sp_okyoung_ming', 'sp_choecheok', 'sp_donwoo',
  'sp_mongseon', 'sp_hongdo', 'sp_mongseok', 'sp_jinwigyeong', 'sp_simssi', 'sp_choesuk', 'sp_merchant_ming',
  'sp_merchant_jp', 'sp_sailor_sea', 'sp_sailor_west', 'sp_captive', 'sp_pirate', 'sp_ming_soldier', 'sp_joseon_sailor'];
const DIRS = ['walk_down', 'walk_left', 'walk_up'];

const fails = [];
const fail = (m) => { fails.push(m); console.log('FAIL', m); };

const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, 'js/data/sprites.js'), 'utf8'), sandbox);
const S = sandbox.window.SPRITES || {};

function pngSize(file) {
  const b = fs.readFileSync(file);
  if (b.readUInt32BE(0) !== 0x89504e47) throw new Error('not png');
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}

const chars = [], props = [];
for (const id of IDS) {
  const m = S[id];
  if (!m) { fail(`${id}: missing in sprites.js`); continue; }
  for (const d of DIRS) {
    const a = m.anims && m.anims[d];
    if (!a || a.n !== 4) fail(`${id}.${d}: expected 4 frames, got ${a ? a.n : 'none'}`);
  }
  for (const k of ['fw', 'fh', 'px', 'py', 'cols']) if (!(m[k] > 0)) fail(`${id}: bad ${k}`);
}
for (const [id, m] of Object.entries(S)) {
  const file = path.join(root, m.img || '');
  if (!m.img || !fs.existsSync(file)) { fail(`${id}: image file missing ${m.img}`); continue; }
  const { w, h } = pngSize(file);
  if (m.anims) {
    const last = Math.max(...Object.values(m.anims).map((a) => a.start + a.n));
    if (Math.ceil(last / m.cols) * m.fh > h || m.cols * m.fw > w) fail(`${id}: frames exceed atlas ${w}x${h}`);
    chars.push(id);
  } else {
    if (m.w !== w || m.h !== h) fail(`${id}: size ${m.w}x${m.h} != file ${w}x${h}`);
    if (!Array.isArray(m.foot) || m.foot.length !== 4) fail(`${id}: bad foot`);
    props.push(id);
  }
}
const files = fs.readdirSync(path.join(root, 'assets/sprites')).filter((f) => f.endsWith('.png'));
for (const f of files) if (!Object.values(S).some((m) => m.img === `assets/sprites/${f}`)) fail(`assets/sprites/${f}: not referenced`);

// 브라우저 캔버스로 프레임이 비었는지 보고 확인용 한 장을 만든다
const imgs = {};
for (const id of [...chars, ...props]) imgs[id] = 'data:image/png;base64,' + fs.readFileSync(path.join(root, S[id].img)).toString('base64');
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage();
const res = await page.evaluate(async ({ S, imgs, chars, props, DIRS }) => {
  const load = (src) => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });
  const im = {};
  for (const id of Object.keys(imgs)) im[id] = await load(imgs[id]);
  const Z = 2, LABEL = 150, out = [];
  const charW = LABEL + 16 * 64 * Z, rowH = 64 * Z + 6;
  let propsH = 0, x = 0, rh = 0;
  const ppos = [];
  for (const id of props) {
    const w = S[id].w * Z, h = S[id].h * Z;
    if (x + w > charW) { x = 0; propsH += rh + 20; rh = 0; }
    ppos.push([x, propsH]); x += w + 10; rh = Math.max(rh, h);
  }
  propsH += rh + 20;
  const c = document.createElement('canvas');
  c.width = charW; c.height = chars.length * rowH + propsH + 10;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.fillStyle = '#5f7a5a'; g.fillRect(0, 0, c.width, c.height);
  g.font = '14px sans-serif';
  const probe = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  chars.forEach((id, r) => {
    const m = S[id], y = r * rowH;
    g.fillStyle = '#fff'; g.fillText(id, 4, y + 64);
    let col = 0;
    for (const d of [...DIRS, 'walk_right']) {
      const a = m.anims[d === 'walk_right' ? 'walk_left' : d];
      for (let f = 0; f < 4; f++, col++) {
        if (!a || f >= a.n) continue;
        const i = a.start + f, sx = (i % m.cols) * m.fw, sy = Math.floor(i / m.cols) * m.fh;
        const dx = LABEL + col * 64 * Z;
        g.save();
        if (d === 'walk_right') { g.translate(dx + m.fw * Z, y); g.scale(-1, 1); } else g.translate(dx, y);
        g.drawImage(im[id], sx, sy, m.fw, m.fh, 0, 0, m.fw * Z, m.fh * Z);
        g.restore();
        if (d !== 'walk_right') {
          probe.canvas.width = m.fw; probe.canvas.height = m.fh;
          probe.clearRect(0, 0, m.fw, m.fh);
          probe.drawImage(im[id], sx, sy, m.fw, m.fh, 0, 0, m.fw, m.fh);
          const px = probe.getImageData(0, 0, m.fw, m.fh).data;
          let n = 0, top = m.fh;
          for (let p = 3; p < px.length; p += 4) if (px[p] > 0) { n++; top = Math.min(top, Math.floor((p >> 2) / m.fw)); }
          const hgt = m.py - top;
          if (n < 150) out.push(`${id}.${d}[${f}]: nearly empty (${n} px)`);
          else if (hgt < 30 || hgt > 60) out.push(`${id}.${d}[${f}]: odd height ${hgt}px`);
        }
      }
    }
  });
  const base = chars.length * rowH + 10;
  props.forEach((id, k) => {
    const [px, py] = ppos[k];
    g.drawImage(im[id], px, base + py, S[id].w * Z, S[id].h * Z);
    g.fillStyle = '#fff'; g.fillText(id, px, base + py + S[id].h * Z + 14);
  });
  return { errs: out, png: c.toDataURL('image/png') };
}, { S, imgs, chars, props, DIRS });
await browser.close();
res.errs.forEach(fail);
fs.mkdirSync(path.join(here, 'shots'), { recursive: true });
fs.writeFileSync(path.join(here, 'shots/sprites.png'), Buffer.from(res.png.split(',')[1], 'base64'));
console.log(`characters ${chars.length}, props ${props.length}, files ${files.length} -> tests/shots/sprites.png`);
if (fails.length) { console.log(`${fails.length} failure(s)`); process.exit(1); }
console.log('OK');
