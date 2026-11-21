// ============================================================
//  家裡的小動物：會路過首頁，點到會說話，說過的話收進圖鑑
// ============================================================

// ---------- 狗狗一家（同一套畫法：還好、狗狗、阿扁） ----------
const DOGS = {
  haohao: { base: '#e2b56a', line: '#b98a3e', ear: '#c99448', muzzle: '#f3d9a8', belly: '#f3d9a8', dark: '#2b2226', ears: 'flop', eyes: 'open', mouth: 'open' },
  doggy: { base: '#efd9ac', line: '#c7a66a', ear: '#e0bf85', muzzle: '#fbf0d8', belly: '#fbf0d8', dark: '#2b2226', ears: 'flop', eyes: 'sleepy', mouth: 'smile', curls: true },
  abian: { base: '#d9bd8c', line: '#a98a58', ear: '#f0e2c4', muzzle: '#ecdcbc', belly: '#ecdcbc', dark: '#2b2226', ears: 'flop', eyes: 'up', mouth: 'small', bigNose: true, pads: true, vest: true },
};
const PUPS2 = {
  doggy: { base: '#f0d9a6', line: '#c9a868', ear: '#e3c185', muzzle: '#f9ecd0', dark: '#2b2226', eyes: 'sleepy' },
  abian: { base: '#dcc093', line: '#ad8e5a', ear: '#cdae7c', muzzle: '#efe0c2', dark: '#2b2226', eyes: 'dot', vest: true },
};
function pupArt(key) {
  const c = PUPS2[key];
  const leg = (x1, x2) => `<path d="M${x1} 78 L${x2} 85" stroke="${c.line}" stroke-width="10.4" stroke-linecap="round"/><path d="M${x1} 78 L${x2} 85" stroke="${c.base}" stroke-width="8.4" stroke-linecap="round"/><ellipse cx="${x2}" cy="86.3" rx="3.6" ry="1.9" fill="${c.dark}"/>`;
  const eyes = c.eyes === 'sleepy'
    ? `<path d="M-8.5 -3 Q-6 -1 -3.5 -3 M3.5 -3 Q6 -1 8.5 -3" fill="none" stroke="${c.dark}" stroke-width="1.5" stroke-linecap="round"/>`
    : `<circle cx="-6" cy="-3.5" r="2.1" fill="${c.dark}"/><circle cx="6" cy="-3.5" r="2.1" fill="${c.dark}"/><circle cx="-5.4" cy="-4.2" r=".7" fill="#fff"/><circle cx="6.6" cy="-4.2" r=".7" fill="#fff"/>`;
  return `<svg viewBox="0 0 100 92" class="cat-svg pup-walk pup-${key}" xmlns="http://www.w3.org/2000/svg">
    ${shadow(54, 26)}
    <g class="dog-tail"><path d="M76 62 Q88 56 88 44 Q88 40 85 42 Q83 52 74 56 Z" fill="${c.base}" stroke="${c.line}" stroke-width="1" stroke-linejoin="round"/></g>
    <g class="cat-legs-a">${leg(40, 39.5)}${leg(70, 70.5)}</g>
    <g class="cat-legs-b">${leg(48, 49)}${leg(62, 61)}</g>
    <path d="M28 66 Q28 55 42 54 L70 55 Q80 56 79 67 Q78 79 68 79 L38 79 Q28 79 28 71 Z" fill="${c.base}" stroke="${c.line}" stroke-width="1"/>
    ${c.vest ? `<path d="M30 60 Q32 54 42 54 L54 54.5 Q60 66 56 79 L38 79 Q29 79 28.5 71 Z" fill="#f8f4ec" stroke="#d6ccbb" stroke-width=".9"/>
      <path d="M38 79 L56 79" stroke="#2f4a6e" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M39 76.2 l2.5 2.2 2.5 -2.2 2.5 2.2 2.5 -2.2 2.5 2.2 2.5 -2.2 2.5 2.2" fill="none" stroke="#2f4a6e" stroke-width="1.1" stroke-linejoin="round"/>
` : ''}
    <g class="dog-head" transform="translate(30 50)">
      <path d="M-15 -2 Q-16 -18 0 -18.5 Q16 -18 15 -2 Q15 12 0 13 Q-15 12 -15 -2 Z" fill="${c.base}" stroke="${c.line}" stroke-width="1"/>
      <path d="M-11 -14 Q-21 -13 -20 2 Q-19.5 11 -13 10 Q-11 2 -9.5 -8 Z" fill="${c.ear}" stroke="${c.line}" stroke-width="1" stroke-linejoin="round"/>
      <path d="M11 -14 Q21 -13 20 2 Q19.5 11 13 10 Q11 2 9.5 -8 Z" fill="${c.ear}" stroke="${c.line}" stroke-width="1" stroke-linejoin="round"/>
      <ellipse cx="0" cy="5" rx="7.5" ry="5.8" fill="${c.muzzle}"/>
      ${eyes}
      <ellipse cx="0" cy="2.6" rx="3.8" ry="2.9" fill="${c.dark}"/><ellipse cx="-1" cy="1.6" rx="1.2" ry=".7" fill="#fff" opacity=".45"/>
      <path d="M0 5.5 L0 7 M-2.8 7.6 Q0 9.6 2.8 7.6" fill="none" stroke="${c.dark}" stroke-width="1" stroke-linecap="round"/>
      <ellipse cx="-9.5" cy="5" rx="2.2" ry="1.2" fill="#ff9fb4" opacity=".55"/><ellipse cx="9.5" cy="5" rx="2.2" ry="1.2" fill="#ff9fb4" opacity=".55"/>
    </g>
  </svg>`;
}
function dogArt(key, { off = false } = {}) {
  const c = DOGS[key], sw = 1.2, ly = 80;
  const leg = (x1, x2) => `<path d="M${x1} ${ly} L${x2} 87" stroke="${c.line}" stroke-width="${11 + sw * 2}" stroke-linecap="round"/><path d="M${x1} ${ly} L${x2} 87" stroke="${c.base}" stroke-width="11" stroke-linecap="round"/>${key !== 'doggy' ? `<ellipse cx="${x2}" cy="88" rx="5" ry="2.6" fill="${c.dark}"/>` : ''}`;
  const ears = c.ears === 'wide'
    ? `<path d="M-12 -20 Q-30 -30 -31 -14 Q-31 -5 -18 -6 Z" fill="${c.base}" stroke="${c.line}" stroke-width="${sw}" stroke-linejoin="round"/><path d="M-14 -16 Q-27 -23 -27 -13 Q-27 -9 -18 -9 Z" fill="${c.ear}"/>
       <path d="M12 -20 Q30 -30 31 -14 Q31 -5 18 -6 Z" fill="${c.base}" stroke="${c.line}" stroke-width="${sw}" stroke-linejoin="round"/><path d="M14 -16 Q27 -23 27 -13 Q27 -9 18 -9 Z" fill="${c.ear}"/>`
    : `<path d="M-15 -22 Q-28 -20 -26 0 Q-25 10 -18 8 Q-14 -6 -12 -18 Z" fill="${c.ear}" stroke="${c.line}" stroke-width="${sw}" stroke-linejoin="round"/>
       <path d="M15 -22 Q28 -20 26 0 Q25 10 18 8 Q14 -6 12 -18 Z" fill="${c.ear}" stroke="${c.line}" stroke-width="${sw}" stroke-linejoin="round"/>`;
  const eyes = {
    open: `<ellipse cx="-7" cy="-9" rx="2.6" ry="3" fill="${c.dark}"/><ellipse cx="9" cy="-9" rx="2.6" ry="3" fill="${c.dark}"/><circle cx="-6.2" cy="-10" r=".9" fill="#fff"/><circle cx="9.8" cy="-10" r=".9" fill="#fff"/>`,
    sleepy: `<path d="M-10 -9 Q-7 -6.5 -4 -9 M6 -9 Q9 -6.5 12 -9" fill="none" stroke="${c.dark}" stroke-width="1.5" stroke-linecap="round"/>`,
    up: `<ellipse cx="-7" cy="-9" rx="2.5" ry="2.9" fill="${c.dark}"/><ellipse cx="9" cy="-9" rx="2.5" ry="2.9" fill="${c.dark}"/><circle cx="-6.4" cy="-10.6" r="1" fill="#fff"/><circle cx="9.6" cy="-10.6" r="1" fill="#fff"/>`,
  }[c.eyes];
  const brow = c.brow ? `<path d="M-11 -13.5 Q-7 -16 -3.5 -13.5 M5.5 -13.5 Q9 -16 13 -13.5" fill="none" stroke="#fffaf0" stroke-width="2.2" stroke-linecap="round"/>`
    : `<path d="M-10 -14 Q-7 -16 -4 -14 M6 -14 Q9 -16 12 -14" fill="none" stroke="${c.line}" stroke-width=".9" stroke-linecap="round"/>`;
  const mouth = {
    open: `<path d="M-5.5 4 Q1 6.5 7.5 4 Q7 12.5 1 13 Q-5 12.5 -5.5 4 Z" fill="${c.dark}"/><g class="dog-tongue"><path d="M-3 9.5 Q1 6.8 5 9.5 Q4.6 15 1 15.4 Q-2.6 15 -3 9.5 Z" fill="#ff7f86"/><path d="M1 10 L1 13.5" stroke="#d9535d" stroke-width=".6" stroke-linecap="round"/></g>`,
    smile: `<path d="M1 3 L1 5 M-4 5.5 Q1 9 6 5.5" fill="none" stroke="${c.dark}" stroke-width="1.3" stroke-linecap="round"/><path d="M-.5 7.4 Q1 10.5 2.5 7.4 Z" fill="#ff8f96"/>`,
    small: `<path d="M1 4 L1 6 M-2.5 7 Q1 8.8 4.5 7" fill="none" stroke="${c.dark}" stroke-width="1.2" stroke-linecap="round"/>`,
  }[c.mouth];
  const curls = c.curls ? `<path d="M-12 -24 q2 -5 6 -3 q2 -5 7 -3 q3 -4 7 -1 q4 -2 5 3" fill="none" stroke="${c.line}" stroke-width="1" stroke-linecap="round" opacity=".75"/><path d="M-6 -27 q3 -3 5 0 M4 -27 q3 -3 5 0" fill="none" stroke="${c.line}" stroke-width=".8" stroke-linecap="round" opacity=".6"/>` : '';
  const offEyes = `<path d="M-10 -9 L-4 -9 M6 -9 L12 -9" stroke="${c.dark}" stroke-width="1.6" stroke-linecap="round"/>`;
  return `<svg viewBox="0 0 120 96" class="cat-svg dog-walk dog-${key}" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="60" cy="91" rx="38" ry="3.6" fill="currentColor" opacity=".09"/>
    <g class="dog-tail"><path d="M96 58 Q112 50 114 34 Q115 28 110 30 Q106 44 94 52 Z" fill="${c.base}" stroke="${c.line}" stroke-width="${sw}" stroke-linejoin="round"/></g>
    <g class="cat-legs-a">${leg(44, 43)}${leg(86, 87)}</g>
    <g class="cat-legs-b">${leg(54, 55)}${leg(76, 75)}</g>
    <path d="M30 62 Q30 46 50 46 L88 48 Q102 50 100 66 Q98 82 84 82 L44 82 Q30 82 30 70 Z" fill="${c.base}" stroke="${c.line}" stroke-width="${sw}"/>
    <path d="M40 74 Q60 82 82 76" fill="none" stroke="${c.belly}" stroke-width="5" stroke-linecap="round" opacity=".85"/>
    ${c.vest ? `<path d="M33 56 Q33 47 46 47 L66 48 Q74 64 68 81 L46 81.5 Q33 80 33 70 Z" fill="#f8f4ec" stroke="#d9d0c0" stroke-width="1"/>
      <path d="M66 48 Q74 64 68 81" fill="none" stroke="#2f4a6e" stroke-width="2.6" stroke-linecap="round"/>
      <path d="M68.6 53 l-3 2.2 3.6 1.8 -3 2.4 3.8 1.6 -3 2.4 3.6 1.8 -3 2.4 3.2 1.8 -3 2.4 2.6 1.8" fill="none" stroke="#2f4a6e" stroke-width="1.5" stroke-linejoin="round"/>
      <path d="M46 81.5 L68 81" stroke="#2f4a6e" stroke-width="1.8" stroke-linecap="round"/>
      <path d="M38 49 Q42 47 46 47" fill="none" stroke="#2f4a6e" stroke-width="2" stroke-linecap="round"/>` : ''}
    ${c.vest ? '' : c.curls ? `<path d="M46 52 q3 -3 6 0 q3 -3 6 0 q3 -3 6 0 q3 -3 6 0 q3 -3 6 0" fill="none" stroke="${c.line}" stroke-width=".9" stroke-linecap="round" opacity=".55"/>` : `<path d="M48 52 l3 -3 M54 50 l3 -3 M84 54 l3 -3" stroke="${c.line}" stroke-width=".9" stroke-linecap="round" opacity=".7"/>`}
    <g class="dog-head" transform="translate(30 40)">
      ${ears}
      <path d="M-18 -8 Q-20 -30 2 -31 Q22 -30 20 -8 Q20 10 2 12 Q-18 10 -18 -8 Z" fill="${c.base}" stroke="${c.line}" stroke-width="${sw}"/>
      ${curls}
      <ellipse cx="1" cy="2" rx="11" ry="8.5" fill="${c.muzzle}"/>
      ${off ? offEyes : eyes}${brow}
      <ellipse cx="1" cy="${c.bigNose ? 0 : -1}" rx="${c.bigNose ? 6.5 : 5}" ry="${c.bigNose ? 5 : 3.8}" fill="${c.dark}"/><ellipse cx="-.8" cy="${c.bigNose ? -1.8 : -2.2}" rx="1.8" ry="1" fill="#fff" opacity=".45"/>
      ${mouth}
      <ellipse cx="-12" cy="2" rx="2.6" ry="1.4" fill="#ff9fb4" opacity=".55"/><ellipse cx="14" cy="2" rx="2.6" ry="1.4" fill="#ff9fb4" opacity=".55"/>
    </g>
  </svg>`;
}

// ---------- 小棍棍（小熊貓） ----------
function pandaArt() {
  const R = '#c7612a', RL = '#9a4518', W = '#fbf3e6', D = '#2e211e', T = '#e59a5e';
  const leg = (x1, x2) => `<path d="M${x1} 70 L${x2} 85" stroke="${D}" stroke-width="10" stroke-linecap="round"/>`;
  return `<svg viewBox="0 0 140 92" class="cat-svg panda-walk" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="70" cy="88" rx="44" ry="3.6" fill="currentColor" opacity=".09"/>
    <g class="panda-tail">
      <path d="M98 50 Q120 42 132 56 Q140 68 134 82 Q128 88 122 82 Q118 70 108 66 Q102 64 98 66 Z" fill="${R}" stroke="${RL}" stroke-width="1"/>
      <path d="M108 48 Q114 56 110 66 M118 49 Q125 58 120 70 M127 55 Q134 65 128 78" fill="none" stroke="${T}" stroke-width="4.2" stroke-linecap="round"/>
    </g>
    <g class="cat-legs-a">${leg(44, 43)}${leg(92, 93)}</g>
    <g class="cat-legs-b">${leg(54, 55)}${leg(82, 81)}</g>
    <path d="M30 56 Q31 74 44 74 L92 74 Q104 72 105 56 Q96 62 70 60 Q46 60 30 56 Z" fill="${D}"/>
    <path d="M30 60 Q30 44 48 43 L94 44 Q106 46 105 58 Q98 64 70 62 Q46 62 30 60 Z" fill="${R}" stroke="${RL}" stroke-width="1" stroke-linejoin="round"/>
    <path d="M30 58 Q34 70 46 72 Q42 62 40 56 Z" fill="${D}"/>
    <path d="M58 46 q4 -2 8 0 M74 46 q4 -2 8 0" fill="none" stroke="${RL}" stroke-width=".9" stroke-linecap="round" opacity=".6"/>
    <g class="dog-head" transform="translate(28 40)">
      <path d="M-14 -11 L-17 -25 L-4 -19 Z M14 -11 L17 -25 L4 -19 Z" fill="${R}" stroke="${RL}" stroke-width="1" stroke-linejoin="round"/>
      <path d="M-13.2 -13.5 L-15 -22.5 L-7 -18.6 Z M13.2 -13.5 L15 -22.5 L7 -18.6 Z" fill="${W}"/>
      <path d="M-11 -16 L-12 -20.5 L-8.5 -18 Z M11 -16 L12 -20.5 L8.5 -18 Z" fill="${D}"/>
      <ellipse cx="0" cy="-3" rx="19" ry="16" fill="${R}" stroke="${RL}" stroke-width="1"/>
      <path d="M-17.5 -1 Q-17 -7 -13 -7 Q-12 0 -14.5 5 Q-17 4 -17.5 -1 Z M17.5 -1 Q17 -7 13 -7 Q12 0 14.5 5 Q17 4 17.5 -1 Z" fill="${W}"/>
      <ellipse cx="0" cy="4.6" rx="6.4" ry="5.2" fill="${W}"/>
      <ellipse cx="-6.5" cy="-13" rx="3.2" ry="2.2" fill="${W}"/><ellipse cx="6.5" cy="-13" rx="3.2" ry="2.2" fill="${W}"/>
      <circle cx="-7" cy="-4" r="3.4" fill="${D}"/><circle cx="7" cy="-4" r="3.4" fill="${D}"/>
      <circle cx="-5.8" cy="-5.3" r="1.2" fill="#fff"/><circle cx="8.2" cy="-5.3" r="1.2" fill="#fff"/><circle cx="-7.8" cy="-2.6" r=".55" fill="#fff"/><circle cx="6.2" cy="-2.6" r=".55" fill="#fff"/>
      <ellipse cx="0" cy="2.4" rx="2.8" ry="2" fill="${D}"/>
      <path d="M-2.6 5.6 Q-1.3 7.2 0 5.6 Q1.3 7.2 2.6 5.6" fill="none" stroke="${D}" stroke-width="1" stroke-linecap="round"/>
      <ellipse cx="-12" cy="4" rx="2.8" ry="1.6" fill="#ff9fb4" opacity=".7"/><ellipse cx="12" cy="4" rx="2.8" ry="1.6" fill="#ff9fb4" opacity=".7"/>
    </g>
  </svg>`;
}

// ---------- 鯊魚（游過去；碰到鼻子會關機掉到地上） ----------
function sharkArt({ off = false } = {}) {
  const B = '#6f9cbc', BL = '#4f7c9c', W = '#f4efe4';
  return `<svg viewBox="0 0 130 70" class="cat-svg shark-swim ${off ? 'off' : ''}" xmlns="http://www.w3.org/2000/svg">
    <g class="shark-tail"><path d="M104 36 L126 18 Q122 34 128 52 Z" fill="${B}" stroke="${BL}" stroke-width="1.2" stroke-linejoin="round"/></g>
    <path d="M56 18 L70 2 Q72 14 76 20 Z" fill="${B}" stroke="${BL}" stroke-width="1.2" stroke-linejoin="round"/>
    <path d="M10 38 Q24 58 46 58 Q82 56 106 34 Q80 44 48 44 Q22 44 10 38 Z" fill="${W}" stroke="#d6cfc2" stroke-width="1.2"/>
    <path d="M10 38 Q12 18 44 16 Q80 14 106 34 Q80 44 48 44 Q22 44 10 38 Z" fill="${B}" stroke="${BL}" stroke-width="1.2" stroke-linejoin="round"/>
    <path d="M14 42 Q22 50 34 48 Q28 44 26 40 Q20 42 14 42 Z" fill="#f2a3a8"/>
    <path d="M14 42 L17 44.5 L19 42.5 L21.5 45 L23.5 43 L26 45.5 L27 41" fill="none" stroke="#fff" stroke-width="1" stroke-linejoin="round"/>
    ${off ? `<path d="M23 29 L29 29" stroke="#2b2633" stroke-width="1.8" stroke-linecap="round"/><text x="36" y="20" font-size="9" font-weight="800" fill="#9fb7d9" font-family="sans-serif">z</text>`
      : `<ellipse cx="26" cy="29" rx="2.4" ry="2.9" fill="#2b2633"/><circle cx="26.8" cy="28" r=".8" fill="#fff"/>`}
    <ellipse cx="20" cy="36" rx="2.6" ry="1.4" fill="#ff9fb4" opacity=".5"/>
    <path d="M36 28 Q38 34 36 40 M41 27 Q43 33 41 40" fill="none" stroke="${BL}" stroke-width=".9" stroke-linecap="round" opacity=".6"/>
  </svg>`;
}

// ---------- 角色資料 ----------
const FRIENDS = {
  black: { name: '小小黑', kind: '黑貓', intro: '我們一起養的黑貓，黃眼睛、粉紅耳朵，最喜歡被摸摸。', w: 78,
    lines: ['小小黑：喵～', '小小黑被抓到，假裝自己是一團影子', '小小黑：今天有罐罐嗎？', '小小黑被狗狗捉弄了，轉身抱住狗狗', '小小黑把頭塞進你手裡，要你摸摸', '小小黑幫狗狗按摩', '小小黑：還好，好煩', '小小黑躲在紙箱裡，只露出兩隻黃眼睛', '小小黑踩踩你的肚子：喵', '小小黑把你的襪子叼走了'] },
  orange: { name: '晽晽貓貓', kind: '橘白胖貓', intro: '貪吃的橘白胖貓，嘴裡永遠叼著吃的。', w: 80, lines: () => COAT_TRAITS.orange.lines },
  white: { name: '陷阱貓', kind: '白貓', intro: '一隻小公主貓，戴著小皇冠，讓你摸之前要先看牠心情。', w: 78, lines: () => COAT_TRAITS.white.lines },
  calico: { name: '小魚乾', kind: '三花貓', intro: '最愛小魚乾的三花，很會撒嬌。', w: 78, lines: () => COAT_TRAITS.calico.lines },
  tuxedo: { name: '吵吵貓', kind: '賓士貓', intro: '喜歡送別人一朵花，行為常常有點好笑。', w: 78, lines: () => COAT_TRAITS.tuxedo.lines },
  haohao: { name: '還好', kind: '黃金獵犬', intro: '樂天又有點無厘頭的大狗狗，堅持自己是女生。', w: 112,
    lines: ['還好：我是女生～', '還好：嗷把拔貓咪好可愛喔～', '還好追著自己的尾巴轉了三圈，然後忘記自己在幹嘛', '還好：今天也是很好的一天耶～', '還好躺下來翻肚子：我是女生～摸我～', '還好把球叼過來，結果是一顆橘子', '還好：嗷！（不知道在嗷什麼）', '還好跟陷阱貓打招呼，被無視了，但還是很開心', '還好：把拔～把拔貓咪呢？把拔貓咪呢？', '還好：嗷～把拔貓咪～', '還好：我比較喜歡把拔', '還好：哈哈～', '還好：嗷把拔我是還好…', '還好看到蝴蝶，追到忘記回家', '還好：嗷～我也要巧克力～'] },
  doggy: { name: '狗狗', kind: '小狗', intro: '家裡最年長的小動物，大家都喜歡牠。愛捉弄小小黑，喜歡自己香香的。', w: 78,
    lines: ['狗狗偷偷拍了一下小小黑的尾巴，然後裝作什麼都沒發生', '狗狗把阿扁的玩具藏起來了', '狗狗聞了聞你：汪，去洗澡', '狗狗：汪去洗澡！（但說到牠自己洗澡就跑掉了）', '狗狗香香的，因為牠很在意自己香不香', '狗狗趁小小黑睡覺，偷偷趴在牠旁邊', '狗狗被小棍棍踩了一腳，一臉無奈', '狗狗洗完澡到處給大家聞：香不香？', '狗狗把阿扁擠到旁邊，自己躺在最軟的位置'] },
  abian: { name: '阿扁', kind: '小狗', intro: '愛思考的小狗，怕被捏鼻子，聽到諧音梗會拍拍手。和狗狗是好朋友。', w: 78,
    lines: ['阿扁趕快摀住鼻子：不要捏我的鼻子！', '阿扁在思考……為什麼貓咪叫貓咪？', '阿扁在思考……今天的晚餐是什麼', '阿扁聽到一個諧音梗：「狗狗去餐廳點了『汪』子麵」，笑到拍拍手', '阿扁：「你知道小小黑最喜歡什麼運動嗎？『喵』準！」，說完自己拍拍手', '阿扁和狗狗是最好的朋友', '阿扁：讓我想一下……嗯……想完了，忘記剛剛在想什麼', '阿扁：「你知道還好最愛吃什麼嗎？『嗷』利奧！」說完自己拍拍手', '阿扁在思考……為什麼鯊魚會在天上游'] },
  gungun: { name: '小棍棍', kind: '小熊貓', intro: '會「棍～」地叫，講話幾乎只講最後一個字。最愛蘋果，喜歡踩狗狗，但狗狗不喜歡。', w: 104,
    lines: ['小棍棍：棍～', '小棍棍：蛋', '小棍棍：狗狗❤️', '小棍棍：狗狗～（踩）', '小棍棍：蘋果～', '小棍棍被打了一下：一袋～（跑掉）', '小棍棍：……果（想說蘋果）', '小棍棍：……狗（想說狗狗，但狗狗已經跑了）', '小棍棍抱著蘋果睡著了'] },
  shark: { name: '鯊魚', kind: '鯊魚', intro: '男朋友最喜歡的小動物。鼻子被碰到就會關機，再碰一下會倒吸一口氣醒來。', w: 110, swim: true,
    lines: ['鯊魚被碰到鼻子，關機了', '鯊魚：河！（倒吸一口氣，開機了）', '鯊魚：河！河！（嚇一跳游走了）', '鯊魚在空氣裡游泳，看起來很認真', '鯊魚用鼻子碰了一下你……然後自己關機了', '鯊魚：河～（小小聲的，在打呵欠）'] },
};
const friendLines = (k) => { const L = FRIENDS[k].lines; return typeof L === 'function' ? L() : L; };
function friendArt(k, opts) {
  if (PUPS2[k]) return pupArt(k);
  if (DOGS[k]) return dogArt(k, opts);
  if (k === 'gungun') return pandaArt();
  if (k === 'shark') return sharkArt(opts);
  return coatWalk(k);
}

// ---------- 圖鑑紀錄（兩個人共用） ----------
async function dexNote(k, idx) {
  if (!S.couple || !S.cid || (S.couple.members || []).length < 2) return;
  const D0 = (S.couple.dex || {})[k] || {};
  const first = !D0.met, newLine = idx != null && !(D0.l || {})[idx];
  if (!first && !newLine) return;
  const up = {};
  if (newLine) up[`dex.${k}.l.${idx}`] = true;
  if (first) { up[`dex.${k}.met`] = now(); up[`dex.${k}.by`] = me(); }
  await S.store.updateCouple(S.cid, up);
  if (first) setTimeout(() => toast(`圖鑑新增：${FRIENDS[k].name}！也解鎖了牠的頭像`), 1600);
}
function sayLine(k, idx) {
  const L = friendLines(k);
  if (idx === undefined && typeof maybeAnimalCan === 'function') maybeAnimalCan(k);
  if (idx === undefined) {
    // 節日／心情限定台詞優先；偶爾說你們幫牠加的台詞
    const sp = typeof specialNow === 'function' ? specialNow(k) : [];
    if (sp.length && Math.random() < .55) { const [j, x] = sp[Math.floor(Math.random() * sp.length)]; toast(x.t); dexNote(k, 's' + j); return x.t; }
    const cu = typeof customLines === 'function' ? customLines(k) : [];
    if (cu.length && Math.random() < .3) { const t = withName(k, cu[Math.floor(Math.random() * cu.length)].t); toast(t); dexNote(k, null); return t; }
  }
  const i = idx === undefined ? pickLineIdx(k, L.length) : idx;
  toast(L[i]); dexNote(k, i); return L[i];
}
// 台詞不要解鎖太快：大多時候說已經聽過的；新台詞每人每天最多 3 句，而且要碰運氣
const DEX_NEW_PER_DAY = 3, DEX_NEW_CHANCE = .3;
function dexQuota(kind) { const k = `park-dexnew-${kind}-${dkey()}-${me()}`; return { used: +(localStorage.getItem(k) || 0), use: () => localStorage.setItem(k, +(localStorage.getItem(k) || 0) + 1) }; }
function pickLineIdx(k, n) {
  const seen = (((S.couple || {}).dex || {})[k] || {}).l || {};
  const old = [], fresh = [];
  for (let i = 0; i < n; i++) (seen[i] ? old : fresh).push(i);
  const q = dexQuota('line');
  const goNew = fresh.length && (!old.length || trialOpen() || (q.used < DEX_NEW_PER_DAY && Math.random() < DEX_NEW_CHANCE));
  if (goNew) { if (old.length) q.use(); return fresh[Math.floor(Math.random() * fresh.length)]; }
  return old[Math.floor(Math.random() * old.length)];
}

// ---------- 路過首頁 ----------
const STROLL_ODDS = [['black', .2], ['orange', .2], ['haohao', .11], ['doggy', .08], ['abian', .08], ['gungun', .09], ['shark', .09], ['white', .05], ['calico', .05], ['tuxedo', .05]];
function pickFriend() {
  // 心情下雨的時候，狗狗比較常來陪你
  if (typeof myMoodRain === 'function' && myMoodRain() && Math.random() < .45) return 'doggy';
  let r = Math.random(); for (const [k, p] of STROLL_ODDS) { if ((r -= p) < 0) return k; } return 'black'; }
function walker(k, cls = '') {
  const el = document.createElement('button');
  el.className = `cat-stroll fr-${k} ${FRIENDS[k].swim ? 'swim' : ''} ${cls}`;
  el.style.width = FRIENDS[k].w + 'px';
  el.setAttribute('aria-label', FRIENDS[k].name);
  el.innerHTML = typeof withHat === 'function' ? withHat(k, friendArt(k)) : friendArt(k);
  return el;
}
function catStroll(force) {
  // 週年動畫、回顧故事、新手導覽進行中不打擾
  if (S.tab !== 'home' || (S.couple?.members || []).length < (trialOpen() ? 1 : 2) || document.querySelector('.cat-stroll, .anniv-intro, .story, .tour, .modal-back')) return;
  if (!force && typeof carryStroll === 'function' && carryStroll()) return;
  const key = 'park-stroll-at';
  // 好寶加入前的測試期間：每 10 秒就來一隻
  if (!force && (now() - +(localStorage.getItem(key) || 0) < (trialOpen() ? 9000 : 30 * 60000) || (!trialOpen() && Math.random() > .4))) return;
  localStorage.setItem(key, now());
  const k = force || pickFriend();
  // 有時候兩隻一起路過，會演一段小劇場
  if (!force && typeof pickScene === 'function') { const sc = pickScene(k); if (sc) return duoStroll(sc); }
  const el = walker(k);
  if (k === 'tuxedo' && Math.random() < .35) el.classList.add('backwards');
  let timer = setTimeout(() => el.remove(), 9500);
  el.onclick = async () => {
    const r = el.getBoundingClientRect();
    // 鯊鯊：第一次點＝鼻子被碰到，關機掉到地上；再點一次＝倒吸一口氣開機，游走
    if (k === 'shark') {
      if (!el.classList.contains('off')) {
        el.classList.add('off'); el.style.left = r.left + 'px'; el.innerHTML = withHat('shark', sharkArt({ off: true }));
        sfx('flip'); sayLine('shark', 0);
        clearTimeout(timer); timer = setTimeout(() => el.remove(), 25000);
      } else {
        el.classList.remove('off'); el.classList.add('wake'); el.innerHTML = withHat('shark', sharkArt());
        sfx('heart'); sayLine('shark', Math.random() < .6 ? 1 : 2);
        clearTimeout(timer); setTimeout(() => el.remove(), 2200);
      }
      return;
    }
    el.classList.add('caught'); sfx('heart');
    const fx = { orange: ['#c9773a', '#ffd45c'], white: ['#ffd45c', '#9fd3ff', '#ff8fab'], calico: ['#ff9db4', '#ffc2d1'], tuxedo: ['#ffd1dc', '#ffd45c', '#7cc488'], haohao: ['#ff9fb4', '#ffd45c', '#e2b56a'], doggy: ['#ff9fb4', '#efd9ac'], abian: ['#ffd45c', '#9fd3ff', '#ff9fb4'], gungun: ['#e9573f', '#ffd45c'] }[k] || ['#2b2633', '#ff9db4', '#ffd970'];
    floaty(r.left + r.width / 2, r.top, fx);
    if (k === 'tuxedo' && Math.random() < .4) el.classList.add('trip');
    if (k === 'calico') el.classList.add('roll');
    if (k === 'abian') el.classList.add('clap');
    if (k === 'gungun') {
      // 小棍棍：被打會「一袋～」地快速跑掉
      if (Math.random() < .4) { el.classList.remove('caught'); el.classList.add('flee'); sayLine('gungun', 5); clearTimeout(timer); setTimeout(() => el.remove(), 1200); return; }
    }
    if (k === 'black') {
      el.innerHTML = catPose('jump');
      blackPatXP();
    }
    sayLine(k);
    clearTimeout(timer); setTimeout(() => el.remove(), 1500);
  };
  document.body.appendChild(el);
}
window.__stroll = (c) => catStroll(c || 'haohao');

// ---------- 圖鑑頁 ----------
const DEX_ORDER = ['black', 'orange', 'white', 'calico', 'tuxedo', 'haohao', 'doggy', 'abian', 'gungun', 'shark'];
function dexCount() { const d = S.couple?.dex || {}; return DEX_ORDER.filter((k) => d[k] && d[k].met).length; }
