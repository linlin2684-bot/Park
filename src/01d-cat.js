// ============================================================
//  黑貓吉祥物（和 App 圖示同一隻）：多種動作，扁平畫風
// ============================================================
const CAT_INK = '#2b2633';
const CW = '#efe6f2';          // 鬍鬚、嘴巴
const CP = '#ff9fb4';          // 鼻子、腮紅
const CE = '#c98aa0';          // 耳朵內側

// 貓頭：以 (0,0) 為臉中心，寬約 36
function catHead(eyes = 'open') {
  const e = {
    open: `<ellipse cx="-7" cy="-1.5" rx="3.6" ry="4.2" fill="#ffd970"/><ellipse cx="7" cy="-1.5" rx="3.6" ry="4.2" fill="#ffd970"/>
           <ellipse cx="-7" cy="-1" rx="1.2" ry="3" fill="${CAT_INK}"/><ellipse cx="7" cy="-1" rx="1.2" ry="3" fill="${CAT_INK}"/>
           <circle cx="-6" cy="-3" r=".9" fill="#fff"/><circle cx="8" cy="-3" r=".9" fill="#fff"/>`,
    closed: `<path d="M-10 0 Q-7 3 -4 0 M4 0 Q7 3 10 0" fill="none" stroke="${CW}" stroke-width="1.6" stroke-linecap="round"/>`,
    happy: `<path d="M-10.5 -1 Q-7 -5 -3.5 -1 M3.5 -1 Q7 -5 10.5 -1" fill="none" stroke="#ffd970" stroke-width="2.2" stroke-linecap="round"/>`,
    wide: `<circle cx="-7" cy="-1.5" r="4.4" fill="#ffd970"/><circle cx="7" cy="-1.5" r="4.4" fill="#ffd970"/>
           <circle cx="-7" cy="-1" r="2.6" fill="${CAT_INK}"/><circle cx="7" cy="-1" r="2.6" fill="${CAT_INK}"/>
           <circle cx="-6" cy="-2.6" r="1" fill="#fff"/><circle cx="8" cy="-2.6" r="1" fill="#fff"/>`,
  }[eyes];
  return `<path d="M-17 -5 L-15 -22 L-5 -12 Z M17 -5 L15 -22 L5 -12 Z" fill="${CAT_INK}" stroke="${CAT_INK}" stroke-width="2" stroke-linejoin="round"/>
    <path d="M-13.5 -11 L-13 -18.5 L-8 -13.5 Z M13.5 -11 L13 -18.5 L8 -13.5 Z" fill="${CE}"/>
    <ellipse cx="0" cy="0" rx="18" ry="15" fill="${CAT_INK}"/>
    ${e}
    <path d="M-1.5 4.5 L1.5 4.5 L0 6 Z" fill="${CP}"/>
    <path d="M0 6 Q-2 8.5 -3.5 7.5 M0 6 Q2 8.5 3.5 7.5" fill="none" stroke="${CW}" stroke-width="1" stroke-linecap="round"/>
    <path d="M-19 2 L-11 3 M-19 6 L-11 5 M19 2 L11 3 M19 6 L11 5" stroke="${CW}" stroke-width=".8" stroke-linecap="round"/>
    <ellipse cx="-10.5" cy="6" rx="2.4" ry="1.3" fill="${CP}" opacity=".55"/><ellipse cx="10.5" cy="6" rx="2.4" ry="1.3" fill="${CP}" opacity=".55"/>`;
}
// 正在畫的姿勢要戴的配件（只放頭上、脖子上的；披風和小包只有坐著時才看得到）
let CAT_WEAR = '';
const CAT_BODY_ACC = ['cape', 'heartbag'];
const head = (x, y, s = 1, eyes, rot = 0) => `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})">${catHead(eyes)}${CAT_WEAR && !CAT_BODY_ACC.includes(CAT_WEAR) && typeof petAccArt === 'function' ? `<g transform="translate(-50 -34)">${petAccArt(CAT_WEAR)}</g>` : ''}</g>`;
const shadow = (cx, w) => `<ellipse cx="${cx}" cy="88" rx="${w}" ry="3.5" fill="currentColor" opacity=".09"/>`;

const CAT_POSES = {
  // 坐著
  sit: () => `${shadow(50, 26)}
    <path class="cat-tail" d="M66 80 Q86 80 84 64 Q83 56 76 58" fill="none" stroke="${CAT_INK}" stroke-width="5" stroke-linecap="round"/>
    <path d="M34 86 Q29 62 39 50 Q50 43 61 50 Q71 62 66 86 Z" fill="${CAT_INK}"/>
    <ellipse cx="42" cy="86" rx="6" ry="3" fill="${CAT_INK}"/><ellipse cx="58" cy="86" rx="6" ry="3" fill="${CAT_INK}"/>
    <path d="M44 64 Q50 68 56 64" fill="none" stroke="${CE}" stroke-width="1.2" stroke-linecap="round" opacity=".7"/>
    ${head(50, 37)}`,
  // 舉手打招呼
  wave: () => `${shadow(50, 26)}
    <path class="cat-tail" d="M66 80 Q86 80 84 64 Q83 56 76 58" fill="none" stroke="${CAT_INK}" stroke-width="5" stroke-linecap="round"/>
    <path d="M34 86 Q29 62 39 50 Q50 43 61 50 Q71 62 66 86 Z" fill="${CAT_INK}"/>
    <ellipse cx="42" cy="86" rx="6" ry="3" fill="${CAT_INK}"/>
    <g class="cat-wave"><path d="M59 61 Q66 56 67 50" fill="none" stroke="${CAT_INK}" stroke-width="9" stroke-linecap="round"/><circle cx="67" cy="49" r="5" fill="${CAT_INK}"/><circle cx="67" cy="49" r="1.6" fill="${CP}" opacity=".8"/></g>
    ${head(49, 37, 1, 'happy')}`,
  // 縮成一團睡覺
  sleep: () => `${shadow(52, 34)}
    <path d="M20 82 Q18 64 40 62 Q66 60 78 72 Q86 80 80 88 L24 88 Q18 86 20 82 Z" fill="${CAT_INK}"/>
    <path class="cat-tail-s" d="M78 86 Q92 86 90 76 Q88 70 82 74" fill="none" stroke="${CAT_INK}" stroke-width="5" stroke-linecap="round"/>
    ${head(35, 72, .9, 'closed', -8)}
    <text x="70" y="52" font-size="11" font-weight="800" fill="currentColor" opacity=".5" font-family="sans-serif" class="cat-z">z</text>
    <text x="78" y="42" font-size="8" font-weight="800" fill="currentColor" opacity=".35" font-family="sans-serif" class="cat-z z2">z</text>`,
  // 伸懶腰（屁股翹高）
  stretch: () => `${shadow(52, 34)}
    <path class="cat-tail" d="M76 58 Q82 40 92 38" fill="none" stroke="${CAT_INK}" stroke-width="5" stroke-linecap="round"/>
    <path d="M24 80 Q24 68 40 66 Q56 62 66 54 Q82 48 83 64 L82 86 L71 86 L70 79 Q58 86 42 87 L24 87 Q20 85 24 80 Z" fill="${CAT_INK}"/>
    <path d="M18 86 L34 86" stroke="${CAT_INK}" stroke-width="8.5" stroke-linecap="round"/>
    ${head(30, 68, .88, 'closed', 6)}
    <path d="M44 56 l3 -3 M50 54 l3 -3.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" opacity=".35"/>`,
  // 玩毛線球
  yarn: () => `${shadow(50, 34)}
    <path class="cat-tail" d="M74 80 Q90 76 88 60" fill="none" stroke="${CAT_INK}" stroke-width="5" stroke-linecap="round"/>
    <path d="M30 86 Q26 70 42 66 Q64 62 76 74 Q80 82 74 87 L32 88 Z" fill="${CAT_INK}"/>
    <g class="cat-bat"><path d="M34 76 Q29 73 26 76" fill="none" stroke="${CAT_INK}" stroke-width="8.5" stroke-linecap="round"/></g>
    ${head(40, 56, .9, 'wide', -10)}
    <g transform="translate(5 0)"><g class="cat-yarn"><circle cx="13" cy="80" r="8" fill="#ff8fab"/>
      <path d="M6 77 Q13 74 20 79 M7 83 Q13 80 19 85 M10 73 Q15 80 12 88" fill="none" stroke="#c94f72" stroke-width="1" stroke-linecap="round"/>
      <path d="M21 82 Q30 90 42 88" fill="none" stroke="#ff8fab" stroke-width="1" stroke-linecap="round"/></g></g>`,
  // 從紙箱探頭
  box: () => `${shadow(50, 30)}
    ${head(50, 52, .95, 'wide')}
    <circle cx="40" cy="64" r="4" fill="${CAT_INK}"/><circle cx="60" cy="64" r="4" fill="${CAT_INK}"/>
    <path d="M22 64 L78 64 L74 88 L26 88 Z" fill="#d9a56c"/>
    <path d="M22 64 L12 56 L30 56 L38 64 Z M78 64 L88 56 L70 56 L62 64 Z" fill="#e8bb85"/>
    <path d="M22 64 L78 64" stroke="#b9854f" stroke-width="1.2"/>
    <path d="M44 72 L56 72" stroke="#b9854f" stroke-width="1.4" stroke-linecap="round" opacity=".7"/>`,
  // 趴著（貓麵包）看你
  loaf: () => `${shadow(50, 30)}
    <path class="cat-tail" d="M74 84 Q86 86 86 78" fill="none" stroke="${CAT_INK}" stroke-width="5" stroke-linecap="round"/>
    <path d="M24 86 Q22 66 50 64 Q78 66 76 86 Z" fill="${CAT_INK}"/>
    <ellipse cx="40" cy="87" rx="6" ry="2.6" fill="${CAT_INK}"/><ellipse cx="54" cy="87" rx="6" ry="2.6" fill="${CAT_INK}"/>
    ${head(50, 56)}`,
  // 翻肚（摸摸時）
  belly: () => `${shadow(50, 32)}
    <path class="cat-tail" d="M76 80 Q90 82 90 70" fill="none" stroke="${CAT_INK}" stroke-width="5" stroke-linecap="round"/>
    <ellipse cx="54" cy="76" rx="24" ry="12" fill="${CAT_INK}"/>
    <ellipse cx="56" cy="74" rx="12" ry="6" fill="#3d3646"/>
    <path d="M46 66 L45 60 M55 65 L55 58.5 M64 67 L66.5 61 M70 71 L74.5 66.5" fill="none" stroke="${CAT_INK}" stroke-width="8.5" stroke-linecap="round"/>
    <circle cx="45" cy="59.5" r="1.7" fill="${CP}" opacity=".7"/><circle cx="55" cy="58" r="1.7" fill="${CP}" opacity=".7"/>
    ${head(27, 70, .9, 'happy', -22)}`,
  // 跳起來（開心）
  jump: () => `<ellipse cx="50" cy="88" rx="18" ry="3" fill="currentColor" opacity=".07"/>
    <path class="cat-tail" d="M64 58 Q80 50 82 36" fill="none" stroke="${CAT_INK}" stroke-width="5" stroke-linecap="round"/>
    <path d="M36 66 Q33 48 41 41 Q50 36 59 41 Q67 48 64 66 Q56 70 50 70 Q42 70 36 66 Z" fill="${CAT_INK}"/>
    <path d="M41 66 L38.5 72 M59 66 L61.5 72 M40 48 L34 42.5 M60 48 L66 42.5" stroke="${CAT_INK}" stroke-width="8.5" stroke-linecap="round"/>
    ${head(50, 28, 1, 'happy')}
    <path d="M20 22 l1.5 4 4 1.5 -4 1.5 -1.5 4 -1.5 -4 -4 -1.5 4 -1.5 Z M82 16 l1 3 3 1 -3 1 -1 3 -1 -3 -3 -1 3 -1 Z" fill="#ffd970"/>`,
  // 撐傘（下雨）
  umbrella: () => `${shadow(50, 26)}
    <path class="cat-tail" d="M66 80 Q86 80 84 64 Q83 56 76 58" fill="none" stroke="${CAT_INK}" stroke-width="5" stroke-linecap="round"/>
    <path d="M34 86 Q29 62 39 50 Q50 43 61 50 Q71 62 66 86 Z" fill="${CAT_INK}"/>
    <ellipse cx="42" cy="86" rx="6" ry="3" fill="${CAT_INK}"/><ellipse cx="58" cy="86" rx="6" ry="3" fill="${CAT_INK}"/>
    ${head(48, 37, 1, 'open')}
    <path d="M70 18 L70 62 Q70 67 65.5 67 Q62 67 62 63.5" fill="none" stroke="#b8862f" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M60 63 Q67 61 70 56" stroke="${CAT_INK}" stroke-width="8.5" stroke-linecap="round" fill="none"/>
    <g transform="translate(0 4)"><g class="cat-umb">
      <path d="M42 16 Q44 2 70 1 Q96 2 98 16 Q91 12.5 84 16 Q77 12.5 70 16 Q63 12.5 56 16 Q49 12.5 42 16 Z" fill="#e9a3b6"/>
      <path d="M56 16 Q58 4 70 1 Q63 6 63 15 Z M84 16 Q82 4 70 1 Q77 6 77 15 Z" fill="#d97f9a" opacity=".75"/>
      <path d="M42 16 Q49 12.5 56 16 Q63 12.5 70 16 Q77 12.5 84 16 Q91 12.5 98 16" fill="none" stroke="#c46a86" stroke-width=".9"/>
      <path d="M70 1 V16" stroke="#c46a86" stroke-width=".7" opacity=".7"/>
      <circle cx="70" cy="0.5" r="1.6" fill="#e9c77b"/>
      <circle cx="49" cy="14.5" r=".9" fill="#e9c77b"/><circle cx="63" cy="14.5" r=".9" fill="#e9c77b"/><circle cx="77" cy="14.5" r=".9" fill="#e9c77b"/><circle cx="91" cy="14.5" r=".9" fill="#e9c77b"/>
    </g></g>
    <path d="M26 30 l-1.5 4 M90 32 l-1.5 4 M20 50 l-1.5 4 M94 50 l-1.5 4 M30 64 l-1.5 4" stroke="#9fb7d9" stroke-width="1.2" stroke-linecap="round" class="cat-rain" opacity=".8"/>`,
  // 拉行李箱
  suitcase: () => `${shadow(50, 34)}
    <path class="cat-tail" d="M56 80 Q74 80 72 64" fill="none" stroke="${CAT_INK}" stroke-width="5" stroke-linecap="round"/>
    <path d="M24 86 Q19 62 29 50 Q40 43 51 50 Q61 62 56 86 Z" fill="${CAT_INK}"/>
    <ellipse cx="32" cy="86" rx="6" ry="3" fill="${CAT_INK}"/><ellipse cx="48" cy="86" rx="6" ry="3" fill="${CAT_INK}"/>
    <rect x="59" y="58" width="26" height="28" rx="4" fill="#ff8fab"/><rect x="59" y="58" width="26" height="28" rx="4" fill="none" stroke="#c94f72" stroke-width="1"/>
    <path d="M66 58 V86 M78 58 V86" stroke="#c94f72" stroke-width="1" opacity=".6"/>
    <path d="M65 58 V50 H75 V58" fill="none" stroke="#7a5a3a" stroke-width="1.8"/>
    <path d="M52 60 Q57 55 64 51" fill="none" stroke="${CAT_INK}" stroke-width="8.5" stroke-linecap="round"/>
    <circle cx="63" cy="88" r="2" fill="#555"/><circle cx="81" cy="88" r="2" fill="#555"/>
    <path d="M67 68 l4 -3 4 3 M70 72 h2" stroke="#fff" stroke-width="1" fill="none" opacity=".8"/>
    ${head(40, 37, 1, 'happy')}`,
  // 走路（側面）
  walk: () => `${shadow(52, 28)}
    <g transform="translate(0 5)">
      <path class="cat-tail" d="M76 62 Q88 50 86 36" fill="none" stroke="${CAT_INK}" stroke-width="5" stroke-linecap="round"/>
      <path d="M26 62 Q24 52 34 50 Q42 52 46 56 L70 56 Q80 58 78 70 Q76 76 70 76 L36 76 Q28 76 28 70 Z" fill="${CAT_INK}"/>
    </g>
    <g class="cat-legs-a"><path d="M38 79 L37.5 85 M68 79 L68.5 85" stroke="${CAT_INK}" stroke-width="8.5" stroke-linecap="round"/></g>
    <g class="cat-legs-b"><path d="M46 79 L47 85 M60 79 L59 85" stroke="${CAT_INK}" stroke-width="8.5" stroke-linecap="round"/></g>
    ${head(30, 52, .9, 'open')}`,
};
const CAT_EMPTY_POSES = ['sleep', 'stretch', 'yarn', 'box', 'loaf'];

function catPose(pose = 'sit', wear = '') {
  CAT_WEAR = wear || '';
  const out = `<svg viewBox="0 0 100 92" class="cat-svg cat-${pose}" xmlns="http://www.w3.org/2000/svg">${(CAT_POSES[pose] || CAT_POSES.sit)()}</svg>`;
  CAT_WEAR = '';
  return out;
}
// 舊的介面：catSVG('sit', 泡泡內容) / catSVG('sleep')
function catSVG(pose = 'sit', extra = '') {
  return catPose(pose) + (extra ? `<span class="cat-bubble">${extra}</span>` : '');
}
const pick1 = (a) => a[Math.floor(Math.random() * a.length)];

// 空白頁自動放上黑貓（姿勢隨機）：有圖示的打招呼或坐著拿泡泡；沒有圖示的隨機睡覺、伸懶腰、玩毛線、紙箱、趴著
function catifyEmpty(root) {
  root.querySelectorAll('.empty:not([data-cat])').forEach((el) => {
    el.dataset.cat = '1';
    const big = el.querySelector('.big');
    const wrap = document.createElement('div');
    wrap.className = 'cat-wrap';
    const travel = /pin|coin|map|plane/.test(big ? big.innerHTML : '') || el.closest('[data-page="travel"]');
    if (big) { wrap.innerHTML = catSVG(travel && Math.random() < .6 ? 'suitcase' : pick1(['sit', 'wave', 'loaf']), big.innerHTML); big.remove(); }
    else wrap.innerHTML = catSVG(pick1(CAT_EMPTY_POSES));
    el.prepend(wrap);
  });
}


// ============================================================
//  路過的小貓：不同毛色（純白、橘白胖貓、三花、賓士）
// ============================================================
const COATS = {
  black: { name: '小小黑', base: CAT_INK, line: CAT_INK, eye: '#ffd970', ear: CE, whisker: CW },
  white: { name: '陷阱貓', base: '#f7f4ef', line: '#cfc6bd', eye: '#8fd0f0', ear: '#f4b6c4', whisker: '#c9bfb6' },
  orange: { name: '晽晽貓貓', base: '#f2a65a', line: '#c97a35', eye: '#9ccc65', ear: '#f4b6a4', whisker: '#fff', fat: true,
    patches: (id) => `<g clip-path="url(#${id})"><ellipse cx="52" cy="80" rx="16" ry="8" fill="#fffaf2"/></g>`,
    face: `<ellipse cx="0" cy="6" rx="8.5" ry="6" fill="#fffaf2"/><path d="M-6 -13 Q-3 -9 0 -13 Q3 -9 6 -13 M-8 -9 Q-4 -5 0 -9 Q4 -5 8 -9" fill="none" stroke="#d98a3e" stroke-width="1.4" stroke-linecap="round"/>` },
  calico: { name: '小魚乾', base: '#fbf7f1', line: '#d6c9bc', eye: '#e8b23a', ear: '#f4b6c4', whisker: '#c9bfb6',
    patches: (id) => `<g clip-path="url(#${id})"><ellipse cx="40" cy="60" rx="10" ry="8" fill="#e9984d"/><ellipse cx="66" cy="62" rx="9" ry="7" fill="#3a3238"/><ellipse cx="60" cy="58" rx="5" ry="4" fill="#e9984d"/></g>`,
    face: `<path d="M-18 -4 Q-16 -18 -4 -14 Q-6 -4 -14 2 Z" fill="#e9984d"/><path d="M18 -4 Q16 -18 5 -14 Q6 -5 14 1 Z" fill="#3a3238"/>`, earL: '#e9984d', earR: '#3a3238' },
  tuxedo: { name: '吵吵貓', base: CAT_INK, line: CAT_INK, eye: '#a5d86b', ear: CE, whisker: CW,
    patches: (id) => `<g clip-path="url(#${id})"><path d="M28 64 Q34 72 46 74 L48 80 L28 80 Z" fill="#fbf7f1"/></g>`,
    face: `<path d="M0 -2 Q-6 2 -9 10 Q0 15 9 10 Q6 2 0 -2 Z" fill="#fbf7f1"/>`, socks: '#fbf7f1', mouth: '#8a6e66' },
};
function coatHead(c) {
  const eL = c.earL || c.base, eR = c.earR || c.base;
  return `<path d="M-17 -5 L-15 -22 L-5 -12 Z" fill="${eL}" stroke="${c.line}" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="M17 -5 L15 -22 L5 -12 Z" fill="${eR}" stroke="${c.line}" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="M-13.5 -11 L-13 -18.5 L-8 -13.5 Z M13.5 -11 L13 -18.5 L8 -13.5 Z" fill="${c.ear}"/>
    <ellipse cx="0" cy="0" rx="${c.fat ? 19.5 : 18}" ry="15" fill="${c.base}" stroke="${c.line}" stroke-width="${c.line === c.base ? 0 : 1.2}"/>
    ${c.face || ''}
    <ellipse cx="-7" cy="-1.5" rx="3.6" ry="4.2" fill="${c.eye}"/><ellipse cx="7" cy="-1.5" rx="3.6" ry="4.2" fill="${c.eye}"/>
    <ellipse cx="-7" cy="-1" rx="1.2" ry="3" fill="#2b2633"/><ellipse cx="7" cy="-1" rx="1.2" ry="3" fill="#2b2633"/>
    <circle cx="-6" cy="-3" r=".9" fill="#fff"/><circle cx="8" cy="-3" r=".9" fill="#fff"/>
    <path d="M-1.5 4.5 L1.5 4.5 L0 6 Z" fill="${CP}"/>
    <path d="M0 6 Q-2 8.5 -3.5 7.5 M0 6 Q2 8.5 3.5 7.5" fill="none" stroke="${c.mouth || (c.base === CAT_INK ? CW : '#8a6e66')}" stroke-width="1.1" stroke-linecap="round"/>
    <path d="M-19 2 L-11 3 M-19 6 L-11 5 M19 2 L11 3 M19 6 L11 5" stroke="${c.whisker}" stroke-width=".8" stroke-linecap="round"/>
    <ellipse cx="-10.5" cy="6" rx="2.4" ry="1.3" fill="${CP}" opacity=".55"/><ellipse cx="10.5" cy="6" rx="2.4" ry="1.3" fill="${CP}" opacity=".55"/>`;
}
const COAT_PROPS = {
  drumstick: `<g transform="translate(-10 11) rotate(-20)"><ellipse cx="-6" cy="0" rx="7" ry="5" fill="#c9773a"/><ellipse cx="-7" cy="-1.5" rx="4" ry="2" fill="#e09a5a" opacity=".7"/><path d="M0 0 L7 0" stroke="#f6efe6" stroke-width="2.6" stroke-linecap="round"/><circle cx="8" cy="-1.3" r="1.6" fill="#f6efe6"/><circle cx="8" cy="1.3" r="1.6" fill="#f6efe6"/></g>`,
  flower: `<g transform="translate(-6 9)"><path d="M0 0 Q-6 -4 -12 -12" fill="none" stroke="#5fa86b" stroke-width="1.4" stroke-linecap="round"/><path d="M-6 -5 Q-10 -3 -10 -7 Q-7 -8 -6 -5 Z" fill="#7cc488"/><g transform="translate(-13 -14)">${[0, 72, 144, 216, 288].map((a) => `<ellipse rx="2.6" ry="4" transform="rotate(${a}) translate(0 -3.6)" fill="#ffd1dc" stroke="#e98aa5" stroke-width=".5"/>`).join('')}<circle r="2.3" fill="#ffd45c"/></g></g>`,
  fish: `<g transform="translate(-12 10) rotate(-8)"><path d="M-8 0 Q-2 -4.5 5 0 Q-2 4.5 -8 0 Z" fill="#c9a26a" stroke="#9a7440" stroke-width=".6"/><path d="M5 0 L9 -3.5 L9 3.5 Z" fill="#c9a26a" stroke="#9a7440" stroke-width=".6"/><circle cx="-5" cy="-.6" r=".8" fill="#4a3a2a"/><path d="M-2 -2 L-1 2 M1 -2 L2 2" stroke="#9a7440" stroke-width=".5"/></g>`,
  tiara: `<g transform="translate(0 -15)"><path d="M-8 2 L-6.5 -4 L-3 -.5 L0 -6 L3 -.5 L6.5 -4 L8 2 Z" fill="#ffd45c" stroke="#c9952e" stroke-width=".7" stroke-linejoin="round"/><circle cx="0" cy="-1" r="1.2" fill="#ff8fab"/><circle cx="-5" cy=".2" r=".7" fill="#9fd3ff"/><circle cx="5" cy=".2" r=".7" fill="#9fd3ff"/></g>`,
};
// 每隻貓的個性：道具、點牠會說的話
const COAT_TRAITS = {
  orange: { prop: 'drumstick', lines: ['晽晽貓貓叼著雞腿跑過去，完全不想分你', '晽晽貓貓：嗝～（剛吃飽又在找下一餐）', '晽晽貓貓聞到你身上的零食味，賴著不走了', '晽晽貓貓把你的宵夜當成牠的宵夜', '晽晽貓貓肚子圓滾滾，跳不起來，只好滾過去', '晽晽貓貓聽到塑膠袋的聲音，三秒就出現了', '晽晽貓貓：這個也可以吃嗎？'] },
  tuxedo: { prop: 'flower', lines: ['吵吵貓送你一朵花，然後大叫三聲就跑了', '吵吵貓送你一朵花……是從隔壁盆栽偷摘的', '吵吵貓想送你花，結果被自己的尾巴絆倒', '吵吵貓把花放下，倒退著走掉了', '吵吵貓：喵！喵喵！喵！（翻譯：這朵給你）', '吵吵貓送完花，對著空氣跳了一段舞', '吵吵貓今天沒有花，送你一片葉子', '吵吵貓唱了一首歌，只有「喵」一個字'] },
  white: { prop: 'tiara', lines: ['陷阱貓：哼，陷阱貓准許你看一眼', '陷阱貓翻肚子給你看……你一摸，牠就生氣炸毛了', '陷阱貓優雅地走過去，連頭都沒回', '陷阱貓：今天的罐罐準備好了嗎？', '陷阱貓假裝要讓你摸，又跳開了，這就是陷阱', '陷阱貓坐在你的手機上：看我就好', '陷阱貓：陷阱貓今天心情好，准你摸一下……一下就好'] },
  calico: { prop: 'fish', lines: ['小魚乾叼著小魚乾蹭了蹭你', '小魚乾：再給一條小魚乾，我就讓你抱', '小魚乾在你腳邊滾了兩圈撒嬌', '小魚乾把小魚乾分你一半……又叼回去了', '小魚乾喵～的一聲，要你摸摸頭', '小魚乾把頭塞進你的手心，賴著不走', '小魚乾看到還好，馬上躲到你後面'] },
};
let coatSeq = 0;
function coatWalk(key) {
  const c = COATS[key] || COATS.black, id = 'cw' + (++coatSeq);
  const body = c.fat ? 'M24 62 Q24 50 40 50 Q44 52 48 54 L70 54 Q84 56 82 70 Q80 79 70 79 L34 79 Q24 79 24 70 Z' : 'M26 62 Q24 52 34 50 Q42 52 46 56 L70 56 Q80 58 78 70 Q76 76 70 76 L36 76 Q28 76 28 70 Z';
  const ly = c.fat ? 82 : 79, sw = c.line === c.base ? 0 : 1.2;
  const leg = (x1, x2) => `<path d="M${x1} ${ly} L${x2} 85" stroke="${c.line}" stroke-width="${8.5 + sw * 2}" stroke-linecap="round"/><path d="M${x1} ${ly} L${x2} 85" stroke="${c.base}" stroke-width="8.5" stroke-linecap="round"/>${c.socks ? `<circle cx="${x2}" cy="85" r="4.2" fill="${c.socks}"/>` : ''}`;
  return `<svg viewBox="0 0 100 92" class="cat-svg cat-walk coat-${key}" xmlns="http://www.w3.org/2000/svg">
    <defs><clipPath id="${id}"><path d="${body}" transform="translate(0 5)"/></clipPath></defs>
    ${shadow(52, c.fat ? 32 : 28)}
    <g class="cat-legs-a">${leg(38, 37.5)}${leg(68, 68.5)}</g>
    <g class="cat-legs-b">${leg(46, 47)}${leg(60, 59)}</g>
    <g transform="translate(0 5)">
      <path class="cat-tail" d="M76 62 Q88 50 86 36" fill="none" stroke="${c.line}" stroke-width="${5 + sw * 2}" stroke-linecap="round"/>
      <path class="cat-tail" d="M76 62 Q88 50 86 36" fill="none" stroke="${key === 'calico' ? '#e9984d' : c.base}" stroke-width="5" stroke-linecap="round"/>
      <path d="${body}" fill="${c.base}" stroke="${c.line}" stroke-width="${sw}"/>
    </g>
    ${c.patches ? c.patches(id) : ''}
    <g transform="translate(30 ${c.fat ? 50 : 52}) scale(.9)">${coatHead(c)}${COAT_TRAITS[key] ? COAT_PROPS[COAT_TRAITS[key].prop] : ''}</g>
  </svg>`;
}

