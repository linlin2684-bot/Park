// ============================================================
//  收藏冊封面：每個系列一張圖騰風格的橫式封面
// ============================================================

const WISH_SERIES = '許願系列';
const BOOK_META = {
  [D.BIRTHDAY_SERIES]: { pal: 'C', motif: 'candle', pat: 'sparkle', sub: '25 歲生日限定', how: '他加入時就會收到整套生日卡' },
  '節日系列': { pal: 'F-anniv', motif: 'stars', pat: 'rings', sub: '節日與紀念日限定', how: '生日、週年、情人節、聖誕、新年當天自動掉落' },
  '旅行系列': { pal: 'F-travel', motif: 'compass', pat: 'grid', sub: '旅途中的里程碑', how: '存旅行基金、記錄足跡、第一次出國、舊地重遊都會掉卡' },
  '想你系列': { pal: 'F-miss', motif: 'heart', pat: 'hearts', sub: '按下想你的累積', how: '按想你累計 100、520、1314 次，對方會收到一張' },
  '成就系列': { pal: 'SSR', motif: 'stars', pat: 'rings', sub: '金色成就的紀念', how: '解鎖金色成就時，兩人各掉一張' },
  [WISH_SERIES]: { pal: 'W', motif: 'wish', pat: 'sparkle', sub: '許願池實現的願望', how: '在許願池許願，對方點頭就會收進來' },
};

function bookMotif(kind) {
  const star = (x, y, r, cls = 'e-ink-f') => `<path d="M${x} ${y - r} L${x + r * .26} ${y - r * .26} L${x + r} ${y} L${x + r * .26} ${y + r * .26} L${x} ${y + r} L${x - r * .26} ${y + r * .26} L${x - r} ${y} L${x - r * .26} ${y - r * .26} Z" class="${cls}"/>`;
  if (kind === 'candle') {
    return `<ellipse cx="0" cy="30" rx="20" ry="4.5" class="e-ink-s" stroke-width="1.2"/>
      <rect x="-7" y="-4" width="14" height="34" rx="2.5" class="e-bg e-ink-s" stroke-width="1.5"/>
      <path d="M-7 5 L7 -1 M-7 15 L7 9 M-7 25 L7 19" class="e-acc-s" stroke-width="1.6"/>
      <path d="M0 -4 L0 -10" class="e-ink-s" stroke-width="1.3" stroke-linecap="round"/>
      <path d="M0 -33 C7 -25 7 -16 0 -11 C-7 -16 -7 -25 0 -33 Z" class="e-acc-f e-ink-s" stroke-width="1.2"/>
      <path d="M0 -25 C2.5 -21 2.5 -16 0 -14 C-2.5 -16 -2.5 -21 0 -25 Z" class="e-ink-f"/>
      ${star(-22, -22, 5)}${star(21, -12, 4)}<circle cx="-17" cy="4" r="1.3" class="e-ink-f"/><circle cx="19" cy="10" r="1.1" class="e-ink-f"/>`;
  }
  if (kind === 'stars') {
    return `${star(-2, 0, 22, 'e-bg e-ink-s')}${star(-2, 0, 22, 'e-acc-f')}
      <path d="M-2 -22 L3.7 -5.7 L20 0 L3.7 5.7 L-2 22 L-7.7 5.7 L-24 0 L-7.7 -5.7 Z" class="e-ink-s" stroke-width="1.4" fill="none" stroke-linejoin="round"/>
      ${star(22, -22, 8)}${star(-24, 22, 6)}<circle cx="24" cy="18" r="1.6" class="e-ink-f"/><circle cx="-24" cy="-20" r="1.3" class="e-ink-f"/>`;
  }
  if (kind === 'compass') return festMotif('travel');
  if (kind === 'heart') return festMotif('miss');
  // wish：流星
  const pts = Array.from({ length: 10 }, (_, i) => { const a = (i * 36 - 90) * Math.PI / 180, r = i % 2 ? 6.5 : 15; return `${(10 + Math.cos(a) * r).toFixed(1)},${(-10 + Math.sin(a) * r).toFixed(1)}`; }).join(' ');
  return `<path d="M-34 30 Q-14 22 -2 4" class="e-acc-s" stroke-width="2.2" fill="none" stroke-linecap="round"/>
    <path d="M-36 18 Q-18 14 -5 -1" class="e-acc-s" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-dasharray="1 4"/>
    <path d="M-24 36 Q-8 26 2 9" class="e-acc-s" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-dasharray="1 4"/>
    <polygon points="${pts}" class="e-bg e-ink-s" stroke-width="1.5" stroke-linejoin="round"/>
    <circle cx="10" cy="-10" r="3" class="e-acc-f"/>
    ${star(-22, -24, 4)}${star(28, 18, 5)}<circle cx="26" cy="-26" r="1.3" class="e-ink-f"/>`;
}

// 封面 SVG：state = { title, sub, got, total, slogan, sloganOn, empty }
function bookCoverSVG(meta, st) {
  const id = 'bc' + (++embSeq);
  const pct = st.total ? st.got / st.total : 0;
  const tl = Array.from(st.title).length;
  const tfs = Math.min(24, Math.floor(150 / Math.max(tl, 1)));
  const corner = (x, y, sx, sy) => `<path d="M${x} ${y + sy * 12} A12 12 0 0 ${sx * sy > 0 ? 1 : 0} ${x + sx * 12} ${y}" class="e-ink-s" stroke-width=".8"/><circle cx="${x + sx * 3.5}" cy="${y + sy * 3.5}" r="1.5" class="e-ink-f"/>`;
  let ring = `<circle cx="80" cy="96" r="54" class="e-bg e-ink-s" stroke-width="1.4"/><circle cx="80" cy="96" r="49" class="e-acc-s" stroke-width=".8"/>`;
  for (let i = 0; i < 24; i++) { const a = i * 15 * Math.PI / 180; ring += `<circle cx="${(80 + Math.sin(a) * 59).toFixed(1)}" cy="${(96 - Math.cos(a) * 59).toFixed(1)}" r="${i % 6 ? .8 : 1.6}" class="e-ink-f"/>`; }
  return `<svg viewBox="0 0 330 192" class="book-svg" xmlns="http://www.w3.org/2000/svg">
    <defs>${festPattern(meta.pat, id)}</defs>
    <rect width="330" height="192" class="e-bg"/>
    <rect width="330" height="192" fill="url(#${id})" opacity=".7"/>
    <rect x="7" y="7" width="316" height="178" rx="10" class="e-ink-s" stroke-width=".9"/>
    <rect x="11.5" y="11.5" width="307" height="169" rx="7" class="e-acc-s" stroke-width=".6"/>
    ${corner(11.5, 11.5, 1, 1)}${corner(318.5, 11.5, -1, 1)}${corner(11.5, 180.5, 1, -1)}${corner(318.5, 180.5, -1, -1)}
    ${ring}
    <g transform="translate(80 96) scale(1.15)" ${st.empty ? 'opacity=".45"' : ''}>${bookMotif(meta.motif)}</g>
    <rect x="150" y="36" width="156" height="122" rx="8" class="e-bg" opacity=".82"/>
    <text x="162" y="58" font-size="9" letter-spacing="2.4" class="e-ink-f e-small">${esc(st.sub)}</text>
    <text x="162" y="${86 + tfs * .1}" font-size="${tfs}" class="e-ink-f e-title">${esc(st.title)}</text>
    <line x1="162" y1="98" x2="294" y2="98" class="e-ink-s" stroke-width=".7"/>
    ${st.slogan ? `<text x="162" y="118" font-size="12" class="e-ink-f e-title" ${st.sloganOn ? '' : 'opacity=".35" style="filter:blur(2.5px)"'}>${esc(st.slogan)}</text>` : ''}
    ${st.empty ? `<text x="162" y="142" font-size="10" class="e-ink-f e-small" opacity=".75">尚未收集</text>`
      : `<text x="162" y="148" font-size="10" letter-spacing="1" class="e-ink-f e-small">已收集 ${st.got} 張</text>`}
  </svg>`;
}
