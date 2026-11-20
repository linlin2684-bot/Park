// ============================================================
//  節日／紀念限定圖騰：線描意象、收斂配色
// ============================================================

const TRAVEL_TM = { 行李打包券: 'suitcase', 行程決定權: 'map', 專屬攝影師: 'camera', 啟程紀念券: 'pin', 五站護照章: 'stamp', 十站環遊券: 'plane', 護照初章: 'globe', 舊地重遊券: 'mountain', 旅行出發券: 'compass' };
const FEST_BY_TITLE = {
  行李打包券: 'travel', 行程決定權: 'travel', 專屬攝影師: 'travel', 啟程紀念券: 'travel', 五站護照章: 'travel', 十站環遊券: 'travel', 護照初章: 'travel', 舊地重遊券: 'travel',
  壽星女王券: 'queen', 壽星國王券: 'king', 週年紀念券: 'anniv', 情人節限定券: 'valentine',
  聖誕交換券: 'xmas', 新年第一張券: 'newyear', 旅行出發券: 'travel',
};
const FESTS = {
  queen:     { label: '壽 星 限 定', foot: '生日限定', pat: 'sparkle' },
  king:      { label: '壽 星 限 定', foot: '生日限定', pat: 'sparkle' },
  anniv:     { label: '週 年 限 定', foot: '週年紀念', pat: 'rings' },
  valentine: { label: '情 人 節 限 定', foot: '情人節限定', pat: 'hearts' },
  xmas:      { label: '聖 誕 限 定', foot: '聖誕限定', pat: 'snow' },
  newyear:   { label: '新 年 限 定', foot: '新年限定', pat: 'plum' },
  travel:    { label: '旅 行 限 定', foot: '旅行系列', pat: 'grid' },
  miss:      { label: '想 你 限 定', foot: '想你系列', pat: 'hearts' },
};
function festKey(c) { return c && (c.fest || FEST_BY_TITLE[c.title]) || ''; }

// 節日底紋（淡淡的，不搶主角）
function festPattern(kind, id, s = 1) {
  const u = (n) => +(n * s).toFixed(2);
  const P = (w, h, body) => `<pattern id="${id}" width="${u(w)}" height="${u(h)}" patternUnits="userSpaceOnUse">${body}</pattern>`;
  const star = (x, y, r) => `<path d="M${u(x)} ${u(y - r)} L${u(x + r * .28)} ${u(y - r * .28)} L${u(x + r)} ${u(y)} L${u(x + r * .28)} ${u(y + r * .28)} L${u(x)} ${u(y + r)} L${u(x - r * .28)} ${u(y + r * .28)} L${u(x - r)} ${u(y)} L${u(x - r * .28)} ${u(y - r * .28)} Z" class="e-acc-f"/>`;
  if (kind === 'sparkle') return P(28, 28, star(7, 7, 3.2) + `<circle cx="${u(21)}" cy="${u(20)}" r="${u(.9)}" class="e-acc-f"/>`);
  if (kind === 'rings') return P(26, 26, `<circle cx="${u(9)}" cy="${u(9)}" r="${u(3.6)}" class="e-acc-s" stroke-width="${.6 * s}"/><circle cx="${u(13)}" cy="${u(9)}" r="${u(3.6)}" class="e-acc-s" stroke-width="${.6 * s}"/><circle cx="${u(21)}" cy="${u(21)}" r="${u(.8)}" class="e-acc-f"/>`);
  if (kind === 'hearts') {
    const h = (x, y, k) => `<path transform="translate(${u(x)} ${u(y)}) scale(${(k * s).toFixed(2)})" d="M0 4 C-4 1 -6 -1 -6 -3 C-6 -5 -4 -6 -2.5 -6 C-1.2 -6 -.4 -5 0 -4 C.4 -5 1.2 -6 2.5 -6 C4 -6 6 -5 6 -3 C6 -1 4 1 0 4 Z" class="e-acc-s" stroke-width="${(.7 / k).toFixed(2)}"/>`;
    return P(30, 28, h(9, 9, .75) + `<circle cx="${u(23)}" cy="${u(21)}" r="${u(.8)}" class="e-acc-f"/>`);
  }
  if (kind === 'snow') return P(22, 22, `<circle cx="${u(5)}" cy="${u(5)}" r="${u(1.1)}" class="e-acc-f"/><circle cx="${u(16)}" cy="${u(11)}" r="${u(.7)}" class="e-acc-f"/><circle cx="${u(9)}" cy="${u(18)}" r="${u(.9)}" class="e-acc-f"/>`);
  if (kind === 'plum') {
    const fl = (x, y) => Array.from({ length: 5 }, (_, i) => { const a = i * 72 * Math.PI / 180; return `<circle cx="${u(x + Math.sin(a) * 2.4)}" cy="${u(y - Math.cos(a) * 2.4)}" r="${u(1.5)}" class="e-acc-f"/>`; }).join('');
    return P(30, 30, fl(8, 8) + `<circle cx="${u(23)}" cy="${u(22)}" r="${u(.8)}" class="e-acc-f"/>`);
  }
  return P(22, 22, `<line x1="0" y1="${u(11)}" x2="${u(22)}" y2="${u(11)}" class="e-acc-s" stroke-width="${.45 * s}"/><line x1="${u(11)}" y1="0" x2="${u(11)}" y2="${u(22)}" class="e-acc-s" stroke-width="${.45 * s}" stroke-dasharray="${u(1.5)} ${u(2)}"/>`);
}

// 中央意象（以 0,0 為中心，半徑約 38）
function festMotif(key, c) {
  const ink = (d, w = 1.4, extra = '') => `<path d="${d}" class="e-ink-s" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;
  const pt = (deg, r) => [Math.sin(deg * Math.PI / 180) * r, -Math.cos(deg * Math.PI / 180) * r];
  if (key === 'queen' || key === 'king') {
    let s = '';
    // 月桂枝
    for (const side of [-1, 1]) {
      const arc = [];
      for (let i = 0; i <= 6; i++) {
        const deg = side < 0 ? 205 + i * 16 : 155 - i * 16;
        const [x, y] = pt(deg, 37);
        arc.push([x, y]);
        const rot = deg + (side < 0 ? 60 : -60);
        s += `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="5.2" ry="2.1" transform="rotate(${rot - 90} ${x.toFixed(1)} ${y.toFixed(1)})" class="e-acc-f e-ink-s" stroke-width=".6"/>`;
      }
      s += ink('M' + arc.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L'), .8);
    }
    // 皇冠
    s += `<path d="M-24 12 L24 12 L28 -8 L13 2 L0 -20 L-13 2 L-28 -8 Z" class="e-bg e-ink-s" stroke-width="1.6" stroke-linejoin="round"/>`;
    s += ink('M-22 18 L22 18', 1.6);
    s += `<circle cx="-28" cy="-11" r="2.6" class="e-acc-f e-ink-s" stroke-width="1"/><circle cx="28" cy="-11" r="2.6" class="e-acc-f e-ink-s" stroke-width="1"/>`;
    if (key === 'king') s += ink('M0 -33 L0 -21 M-4.5 -28 L4.5 -28', 1.5);
    else s += `<circle cx="0" cy="-23" r="2.8" class="e-acc-f e-ink-s" stroke-width="1"/>`;
    if (key === 'queen') s += `<path transform="translate(0 6) scale(.62)" d="M0 4 C-4 1 -6 -1 -6 -3 C-6 -5 -4 -6 -2.5 -6 C-1.2 -6 -.4 -5 0 -4 C.4 -5 1.2 -6 2.5 -6 C4 -6 6 -5 6 -3 C6 -1 4 1 0 4 Z" class="e-ink-f"/><circle cx="-12" cy="6" r="1.6" class="e-ink-f"/><circle cx="12" cy="6" r="1.6" class="e-ink-f"/>`;
    else s += `<circle cx="-12" cy="6" r="1.8" class="e-ink-f"/><circle cx="0" cy="6" r="2.2" class="e-acc-f e-ink-s" stroke-width=".8"/><circle cx="12" cy="6" r="1.8" class="e-ink-f"/>`;
    return s;
  }
  if (key === 'anniv') {
    const start = +((S.couple?.dates?.anniversary || D.DEFAULT_DATES.anniversary).slice(0, 4));
    const yr = new Date(c.at || now()).getFullYear() - start;
    return `<circle cx="-9" cy="0" r="15" class="e-ink-s" stroke-width="2"/>
      <circle cx="9" cy="0" r="15" class="e-acc-s" stroke-width="2"/>
      <path d="M-9 -15 A15 15 0 0 1 3.2 -8.7" class="e-ink-s" stroke-width="2" fill="none"/>
      <path d="M0 -34 L1.8 -27.8 L8 -26 L1.8 -24.2 L0 -18 L-1.8 -24.2 L-8 -26 L-1.8 -27.8 Z" class="e-ink-f"/>
      <circle cx="-14" cy="-26" r="1" class="e-ink-f"/><circle cx="14" cy="-26" r="1" class="e-ink-f"/>
      <text x="0" y="30" text-anchor="middle" font-size="9" letter-spacing="2" class="e-ink-f e-small">${yr > 0 ? `第 ${yr} 年` : '紀念日'}</text>`;
  }
  if (key === 'miss') {
    // 一顆大愛心包著小愛心，下面是心跳線
    return `<path d="M0 20 C-6 14 -25 3 -25 -10 C-25 -19 -18 -25 -10.5 -25 C-5.5 -25 -2 -22 0 -18 C2 -22 5.5 -25 10.5 -25 C18 -25 25 -19 25 -10 C25 3 6 14 0 20 Z" class="e-bg e-ink-s" stroke-width="1.6" stroke-linejoin="round"/>
      <path d="M0 8 C-4 5 -13 -1 -13 -8.5 C-13 -13 -9.5 -16 -6 -16 C-3 -16 -1 -14.2 0 -12 C1 -14.2 3 -16 6 -16 C9.5 -16 13 -13 13 -8.5 C13 -1 4 5 0 8 Z" class="e-acc-f e-ink-s" stroke-width="1"/>
      <path d="M-30 30 L-17 30 L-13 24 L-9 36 L-5 30 L5 30 L9 24 L13 36 L17 30 L30 30" class="e-ink-s" stroke-width="1.3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  if (key === 'valentine') {
    return `<path d="M0 6 C0 14 -1.5 22 0 34" class="e-ink-s" stroke-width="1.4" stroke-linecap="round"/>
      <path d="M0 19 C5 13 12 12 16 14 C12 20 6 21 0 19 Z" class="e-acc-f e-ink-s" stroke-width=".8"/>
      <path d="M0 26 C-5 20 -12 19 -16 21 C-12 27 -6 28 0 26 Z" class="e-acc-f e-ink-s" stroke-width=".8"/>
      <path d="M-15 -9 C-16 -19 -8 -27 0 -25 C8 -27 16 -19 15 -9 C14 0 7 6 0 6 C-7 6 -14 0 -15 -9 Z" class="e-bg e-ink-s" stroke-width="1.5" stroke-linejoin="round"/>
      <path d="M-15 -9 C-10 -4 -4 -5 0 -10 C4 -5 10 -4 15 -9" class="e-ink-s" stroke-width="1.2" fill="none" stroke-linecap="round"/>
      <path d="M-10 -11 C-10 -18 -4 -21 0 -19 C4 -21 10 -18 10 -11" class="e-acc-s" stroke-width="1.1" fill="none" stroke-linecap="round"/>
      <path d="M-4.5 -13 C-4 -17 3 -17.5 4.5 -14 C5.5 -11 2 -9 -0.5 -10.5 C-2.5 -12 -0.5 -14.5 1.5 -13.5" class="e-ink-s" stroke-width="1.2" fill="none" stroke-linecap="round"/>
      <path d="M-8 -1 C-4 2 4 2 8 -1" class="e-acc-s" stroke-width="1" fill="none" stroke-linecap="round"/>`;
  }
  if (key === 'xmas') {
    let s = '';
    for (let i = 0; i < 6; i++) {
      s += `<g transform="rotate(${i * 60})">${ink('M0 -6 L0 -32 M0 -14 L-7 -21 M0 -14 L7 -21 M0 -23 L-5 -28 M0 -23 L5 -28', 1.4)}<circle cx="0" cy="-35" r="1.7" class="e-acc-f"/></g>`;
    }
    s += `<polygon points="${Array.from({ length: 6 }, (_, i) => pt(i * 60, 6).map((v) => v.toFixed(2)).join(',')).join(' ')}" class="e-bg e-ink-s" stroke-width="1.3"/><circle cx="0" cy="0" r="1.6" class="e-acc-f"/>`;
    return s;
  }
  if (key === 'newyear') {
    let s = '';
    for (let i = 0; i < 24; i++) { const [x1, y1] = pt(i * 15, 27), [x2, y2] = pt(i * 15, i % 2 ? 31 : 36); s += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" class="e-acc-s" stroke-width="1.1" stroke-linecap="round"/>`; }
    for (let i = 0; i < 5; i++) { const [x, y] = pt(i * 72, 11); s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="9.5" class="e-bg e-ink-s" stroke-width="1.3"/>`; }
    for (let i = 0; i < 5; i++) { const [x, y] = pt(i * 72 + 36, 8.5); s += `<line x1="0" y1="0" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" class="e-ink-s" stroke-width=".8"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="1.3" class="e-ink-f"/>`; }
    s += `<circle cx="0" cy="0" r="3.4" class="e-acc-f e-ink-s" stroke-width=".8"/>`;
    return s;
  }
  // travel：依卡片換不同旅行意象，預設羅盤
  const tm = (c && (c.tm || TRAVEL_TM[c.title])) || 'compass';
  if (tm !== 'compass') return travelMotif(tm);
  const pts = (r1, r2, off) => Array.from({ length: 8 }, (_, i) => pt(off + i * 45, i % 2 ? r2 : r1).map((v) => v.toFixed(2)).join(',')).join(' ');
  return `<circle cx="0" cy="0" r="26" class="e-acc-s" stroke-width="1" stroke-dasharray="2 3"/>
    <polygon points="${pts(22, 5, 45)}" class="e-bg e-acc-s" stroke-width="1"/>
    <polygon points="${pts(34, 5.5, 0)}" class="e-bg e-ink-s" stroke-width="1.3" stroke-linejoin="round"/>
    ${[0, 90, 180, 270].map((d) => { const [x1, y1] = pt(d, 34), [x2, y2] = pt(d + 45, 5.5); return `<polygon points="${x1.toFixed(2)},${y1.toFixed(2)} ${x2.toFixed(2)},${y2.toFixed(2)} 0,0" class="e-ink-f"/>`; }).join('')}
    <circle cx="0" cy="0" r="2.4" class="e-bg e-ink-s" stroke-width="1"/>
    <text x="0" y="-38" text-anchor="middle" font-size="7" class="e-ink-f e-small">N</text>`;
}

// 節日徽章外圈
function festMedallion(cx, cy, key, c, r = 50) {
  const k = r / 50;
  let s = `<circle cx="${cx}" cy="${cy}" r="${50 * k}" class="e-bg e-ink-s" stroke-width="${1.4 * k}"/><circle cx="${cx}" cy="${cy}" r="${45.5 * k}" class="e-acc-s" stroke-width="${.8 * k}"/>`;
  for (let i = 0; i < 12; i++) { const a = i * 30 * Math.PI / 180; s += `<circle cx="${(cx + Math.sin(a) * 55 * k).toFixed(1)}" cy="${(cy - Math.cos(a) * 55 * k).toFixed(1)}" r="${(i % 3 ? .9 : 1.6) * k}" class="e-ink-f"/>`; }
  s += `<g transform="translate(${cx} ${cy}) scale(${(k * 1.05).toFixed(3)})">${festMotif(key, c)}</g>`;
  return s;
}

function travelMotif(tm) {
  const S1 = (d, w = 1.4, cls = 'e-ink-s') => `<path d="${d}" class="${cls}" stroke-width="${w}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  if (tm === 'suitcase') return `<rect x="-24" y="-12" width="48" height="34" rx="5" class="e-bg e-ink-s" stroke-width="1.6"/>
    ${S1('M-9 -12 L-9 -20 Q-9 -23 -6 -23 L6 -23 Q9 -23 9 -20 L9 -12', 1.6)}
    <rect x="-14" y="-12" width="5" height="34" class="e-acc-f"/><rect x="9" y="-12" width="5" height="34" class="e-acc-f"/>
    ${S1('M-24 2 L24 2', .9)}<circle cx="-16" cy="26" r="3" class="e-bg e-ink-s" stroke-width="1.2"/><circle cx="16" cy="26" r="3" class="e-bg e-ink-s" stroke-width="1.2"/>`;
  if (tm === 'map') return `<path d="M-28 -18 L-10 -24 L10 -18 L28 -24 L28 20 L10 26 L-10 20 L-28 26 Z" class="e-bg e-ink-s" stroke-width="1.5" stroke-linejoin="round"/>
    ${S1('M-10 -24 L-10 20 M10 -18 L10 26', .9, 'e-acc-s')}
    ${S1('M-20 14 Q-12 0 -2 6 Q8 12 14 -4', 1.4)} <path d="M-20 14 Q-12 0 -2 6 Q8 12 14 -4" class="e-ink-s" stroke-width="0" fill="none"/>
    <path d="M18 -16 C24 -16 25 -9 18 -2 C11 -9 12 -16 18 -16 Z" class="e-acc-f e-ink-s" stroke-width="1.1"/><circle cx="18" cy="-11" r="2" class="e-ink-f"/>
    <circle cx="-20" cy="14" r="2" class="e-ink-f"/>`;
  if (tm === 'camera') return `<rect x="-26" y="-14" width="52" height="34" rx="6" class="e-bg e-ink-s" stroke-width="1.6"/>
    ${S1('M-12 -14 L-8 -21 L8 -21 L12 -14', 1.5)}
    <circle cx="0" cy="3" r="12" class="e-bg e-ink-s" stroke-width="1.6"/><circle cx="0" cy="3" r="7" class="e-acc-f e-ink-s" stroke-width="1"/><circle cx="-2.5" cy="0.5" r="2" class="e-bg"/>
    <rect x="16" y="-9" width="6" height="4" rx="1" class="e-ink-f"/><circle cx="-19" cy="-7" r="1.6" class="e-ink-f"/>`;
  if (tm === 'pin') return `<ellipse cx="0" cy="28" rx="16" ry="4" class="e-acc-s" stroke-width="1.2"/>
    <path d="M0 26 C-4 14 -20 4 -20 -10 C-20 -22 -11 -30 0 -30 C11 -30 20 -22 20 -10 C20 4 4 14 0 26 Z" class="e-bg e-ink-s" stroke-width="1.6"/>
    <circle cx="0" cy="-10" r="8" class="e-acc-f e-ink-s" stroke-width="1.2"/>`;
  if (tm === 'stamp') {
    let s = `<rect x="-24" y="-28" width="48" height="56" class="e-bg e-ink-s" stroke-width="1.4"/>`;
    for (let i = 0; i < 7; i++) { const y = -28 + i * 9.33; s += `<circle cx="-24" cy="${y.toFixed(1)}" r="2.2" class="e-bg"/><circle cx="24" cy="${y.toFixed(1)}" r="2.2" class="e-bg"/>`; }
    for (let i = 0; i < 6; i++) { const x = -24 + i * 9.6; s += `<circle cx="${x.toFixed(1)}" cy="-28" r="2.2" class="e-bg"/><circle cx="${x.toFixed(1)}" cy="28" r="2.2" class="e-bg"/>`; }
    return s + `<rect x="-17" y="-21" width="34" height="42" class="e-acc-s" stroke-width=".9"/>
      ${S1('M-14 12 L-5 -2 L1 6 L7 -6 L14 12 Z', 1.3)}<circle cx="8" cy="-13" r="3.5" class="e-acc-f"/>
      <text x="0" y="19" text-anchor="middle" font-size="7" class="e-ink-f e-small">V</text>`;
  }
  if (tm === 'plane') return `${S1('M-32 22 Q-16 30 2 14', 1.2, 'e-acc-s')}<path d="M-32 22 Q-16 30 2 14" class="e-acc-s" stroke-width="1.2" fill="none" stroke-dasharray="2 3"/>
    <path d="M24 -20 L28 -24 C30 -26 32 -24 30 -22 L26 -18 L28 6 L23 9 L16 -10 L4 2 L5 10 L1 13 L-2 4 L-11 1 L-8 -3 L0 -2 L12 -14 L-7 -21 L-4 -26 Z" class="e-bg e-ink-s" stroke-width="1.4" stroke-linejoin="round"/>
    <circle cx="-26" cy="-20" r="1.5" class="e-ink-f"/><circle cx="20" cy="22" r="1.2" class="e-ink-f"/>`;
  if (tm === 'globe') return `<circle cx="0" cy="0" r="27" class="e-bg e-ink-s" stroke-width="1.6"/>
    <ellipse cx="0" cy="0" rx="12" ry="27" class="e-acc-s" stroke-width="1"/><ellipse cx="0" cy="0" rx="22" ry="27" class="e-acc-s" stroke-width=".7"/>
    ${S1('M-27 0 L27 0 M-24 -12 L24 -12 M-24 12 L24 12 M0 -27 L0 27', .9, 'e-acc-s')}
    ${S1('M-30 -30 Q0 -44 30 -30', 1.1)}<circle cx="30" cy="-30" r="2.4" class="e-ink-f"/>`;
  // mountain：山與海浪
  return `<circle cx="14" cy="-16" r="7" class="e-acc-f"/>
    <path d="M-30 14 L-12 -16 L-2 -2 L8 -14 L28 14 Z" class="e-bg e-ink-s" stroke-width="1.6" stroke-linejoin="round"/>
    ${S1('M-17 -8 L-12 -16 L-7 -9 M4 -9 L8 -14 L12 -9', 1.1, 'e-acc-s')}
    ${S1('M-30 22 Q-24 17 -18 22 T-6 22 T6 22 T18 22 T30 22', 1.4)}${S1('M-24 29 Q-18 25 -12 29 T0 29 T12 29 T24 29', 1, 'e-acc-s')}`;
}
