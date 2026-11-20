// ============================================================
//  手繪頭像（10 款）。profile.av = 'cat' 這種 id；沒有 av 就用 emoji
// ============================================================

const AV_INK = '#4a2e2a';
const AVATARS = {
  bunny: { name: '排球兔', bg: '#e7e1ff', art: `
    <ellipse cx="24" cy="17" rx="5.5" ry="13" transform="rotate(-12 24 17)" fill="#fff" stroke="${AV_INK}" stroke-width="1.8"/>
    <ellipse cx="24" cy="18" rx="2.4" ry="8.5" transform="rotate(-12 24 18)" fill="#ffc2d1"/>
    <ellipse cx="40" cy="17" rx="5.5" ry="13" transform="rotate(12 40 17)" fill="#fff" stroke="${AV_INK}" stroke-width="1.8"/>
    <ellipse cx="40" cy="18" rx="2.4" ry="8.5" transform="rotate(12 40 18)" fill="#ffc2d1"/>
    <ellipse cx="32" cy="39" rx="16" ry="14" fill="#fff" stroke="${AV_INK}" stroke-width="1.8"/>
    <circle cx="26" cy="37" r="1.9" fill="${AV_INK}"/><circle cx="38" cy="37" r="1.9" fill="${AV_INK}"/>
    <path d="M29.5 42 Q31 44 32 42 Q33 44 34.5 42" fill="none" stroke="${AV_INK}" stroke-width="1.4" stroke-linecap="round"/>
    <ellipse cx="22.5" cy="42" rx="3" ry="1.8" fill="#ffb3c4"/><ellipse cx="41.5" cy="42" rx="3" ry="1.8" fill="#ffb3c4"/>
    <circle cx="48" cy="50" r="7" fill="#fff" stroke="${AV_INK}" stroke-width="1.5"/>
    <path d="M42 48 Q47 50 49 56 M47 43.5 Q48 49 54 51 M42.5 52.5 Q46 46 52 45" fill="none" stroke="#6c8de0" stroke-width="1.3"/>` },
  cat: { name: '貓咪', bg: '#ffdbe4', art: `
    <path d="M15 31 L17 13 L28 23 Z M49 31 L47 13 L36 23 Z" fill="#fff4e8" stroke="${AV_INK}" stroke-width="1.8" stroke-linejoin="round"/>
    <path d="M18.5 25 L19 17 L24 22 Z M45.5 25 L45 17 L40 22 Z" fill="#ffb8c8"/>
    <ellipse cx="32" cy="37" rx="18" ry="15" fill="#fff4e8" stroke="${AV_INK}" stroke-width="1.8"/>
    <path d="M23 35 Q25.5 32.5 28 35 M36 35 Q38.5 32.5 41 35" fill="none" stroke="${AV_INK}" stroke-width="1.7" stroke-linecap="round"/>
    <path d="M30.5 39.5 L33.5 39.5 L32 41.2 Z" fill="#ff8fa8"/>
    <path d="M32 41.2 Q30 44 28 43 M32 41.2 Q34 44 36 43" fill="none" stroke="${AV_INK}" stroke-width="1.2" stroke-linecap="round"/>
    <path d="M14 38 L22 39 M14 42 L22 41 M50 38 L42 39 M50 42 L42 41" stroke="${AV_INK}" stroke-width="1" stroke-linecap="round"/>
    <ellipse cx="22" cy="44" rx="2.8" ry="1.6" fill="#ffb3c4"/><ellipse cx="42" cy="44" rx="2.8" ry="1.6" fill="#ffb3c4"/>` },
  bear: { name: '小熊', bg: '#ffe9cc', art: `
    <circle cx="18" cy="22" r="7.5" fill="#c99b74" stroke="${AV_INK}" stroke-width="1.8"/><circle cx="18" cy="22" r="3.5" fill="#f2c9a6"/>
    <circle cx="46" cy="22" r="7.5" fill="#c99b74" stroke="${AV_INK}" stroke-width="1.8"/><circle cx="46" cy="22" r="3.5" fill="#f2c9a6"/>
    <circle cx="32" cy="37" r="18" fill="#c99b74" stroke="${AV_INK}" stroke-width="1.8"/>
    <ellipse cx="32" cy="43" rx="9" ry="7" fill="#f6dcc3"/>
    <ellipse cx="32" cy="40.5" rx="3.2" ry="2.3" fill="${AV_INK}"/>
    <path d="M32 43 L32 45 M29.5 46.5 Q32 48.5 34.5 46.5" fill="none" stroke="${AV_INK}" stroke-width="1.3" stroke-linecap="round"/>
    <circle cx="25" cy="34" r="2" fill="${AV_INK}"/><circle cx="39" cy="34" r="2" fill="${AV_INK}"/>` },
  fox: { name: '狐狸', bg: '#ffe2cf', art: `
    <path d="M14 16 L25 26 L20 33 Z M50 16 L39 26 L44 33 Z" fill="#f29a52" stroke="${AV_INK}" stroke-width="1.8" stroke-linejoin="round"/>
    <path d="M16.5 19 L22 25 L19.5 28 Z M47.5 19 L42 25 L44.5 28 Z" fill="${AV_INK}" opacity=".8"/>
    <path d="M14 30 Q14 22 32 22 Q50 22 50 30 Q50 44 32 53 Q14 44 14 30 Z" fill="#f29a52" stroke="${AV_INK}" stroke-width="1.8" stroke-linejoin="round"/>
    <path d="M17 33 Q24 34 32 45 Q40 34 47 33 Q46 44 32 53 Q18 44 17 33 Z" fill="#fff6ec"/>
    <ellipse cx="32" cy="47" rx="2.6" ry="1.9" fill="${AV_INK}"/>
    <path d="M23.5 33 Q26 31 28.5 33 M35.5 33 Q38 31 40.5 33" fill="none" stroke="${AV_INK}" stroke-width="1.7" stroke-linecap="round"/>` },
  dog: { name: '小狗', bg: '#d9f0e4', art: `
    <ellipse cx="32" cy="36" rx="16" ry="16" fill="#fff8ee" stroke="${AV_INK}" stroke-width="1.8"/>
    <path d="M17 24 Q9 26 11 40 Q14 44 18 38 Z M47 24 Q55 26 53 40 Q50 44 46 38 Z" fill="#b98457" stroke="${AV_INK}" stroke-width="1.8" stroke-linejoin="round"/>
    <ellipse cx="38" cy="30" rx="5.5" ry="4.5" fill="#e6c49f"/>
    <circle cx="26" cy="34" r="2" fill="${AV_INK}"/><circle cx="38" cy="34" r="2" fill="${AV_INK}"/>
    <ellipse cx="32" cy="40" rx="3" ry="2.2" fill="${AV_INK}"/>
    <path d="M32 42 L32 44 M28.5 44.5 Q32 47 35.5 44.5" fill="none" stroke="${AV_INK}" stroke-width="1.3" stroke-linecap="round"/>
    <path d="M30.5 45.5 Q32 50 33.5 45.5" fill="#ff8fa8" stroke="${AV_INK}" stroke-width="1"/>` },
  penguin: { name: '企鵝', bg: '#d8e9ff', art: `
    <ellipse cx="32" cy="38" rx="17" ry="17" fill="#2f3b57" stroke="${AV_INK}" stroke-width="1.8"/>
    <path d="M32 27 Q38 22 43 28 Q48 36 42 46 Q37 52 32 52 Q27 52 22 46 Q16 36 21 28 Q26 22 32 27 Z" fill="#fff"/>
    <circle cx="26.5" cy="35" r="2" fill="#2f3b57"/><circle cx="37.5" cy="35" r="2" fill="#2f3b57"/>
    <path d="M29 39 L35 39 L32 43 Z" fill="#f5a142" stroke="${AV_INK}" stroke-width="1" stroke-linejoin="round"/>
    <ellipse cx="23" cy="41" rx="2.6" ry="1.6" fill="#ffb3c4"/><ellipse cx="41" cy="41" rx="2.6" ry="1.6" fill="#ffb3c4"/>` },
  girl: { name: '女孩', bg: '#ffd8e2', art: `
    <path d="M14 36 Q12 14 32 13 Q52 14 50 36 L52 52 Q46 50 44 44 L20 44 Q18 50 12 52 Z" fill="#4b3330"/>
    <circle cx="32" cy="35" r="14" fill="#ffe3d3" stroke="${AV_INK}" stroke-width="1.6"/>
    <path d="M18 33 Q20 19 32 19 Q44 19 46 33 Q40 26 34 27 Q30 22 25 27 Q21 29 18 33 Z" fill="#4b3330"/>
    <circle cx="27" cy="37" r="1.8" fill="${AV_INK}"/><circle cx="37" cy="37" r="1.8" fill="${AV_INK}"/>
    <path d="M29.5 42 Q32 44 34.5 42" fill="none" stroke="${AV_INK}" stroke-width="1.4" stroke-linecap="round"/>
    <ellipse cx="24" cy="41" rx="2.6" ry="1.6" fill="#ffb3c4"/><ellipse cx="40" cy="41" rx="2.6" ry="1.6" fill="#ffb3c4"/>
    <path d="M42 19 L47 15 L47 23 Z M42 19 L37 15 L37 23 Z" fill="#ff7a9a" stroke="${AV_INK}" stroke-width="1"/><circle cx="42" cy="19" r="1.6" fill="#ff7a9a" stroke="${AV_INK}" stroke-width="1"/>` },
  boy: { name: '男孩', bg: '#d6ebff', art: `
    <circle cx="32" cy="36" r="15" fill="#ffe3d3" stroke="${AV_INK}" stroke-width="1.6"/>
    <path d="M16 34 Q14 18 30 16 Q34 12 38 16 Q50 18 48 34 Q45 27 40 26 Q41 23 38 22 Q35 27 28 25 Q22 26 16 34 Z" fill="#3e2c26"/>
    <circle cx="27" cy="38" r="1.8" fill="${AV_INK}"/><circle cx="37" cy="38" r="1.8" fill="${AV_INK}"/>
    <path d="M28.5 43 Q32 46 35.5 43" fill="none" stroke="${AV_INK}" stroke-width="1.4" stroke-linecap="round"/>
    <ellipse cx="23.5" cy="42" rx="2.4" ry="1.4" fill="#ffc0b0"/><ellipse cx="40.5" cy="42" rx="2.4" ry="1.4" fill="#ffc0b0"/>` },
  star: { name: '星星', bg: '#fff2c4', art: `
    <path d="M32 11 L38.5 25 L53.5 26.5 L42 36.5 L45.5 51.5 L32 43.5 L18.5 51.5 L22 36.5 L10.5 26.5 L25.5 25 Z" fill="#ffd45c" stroke="${AV_INK}" stroke-width="1.8" stroke-linejoin="round"/>
    <circle cx="27.5" cy="32" r="1.8" fill="${AV_INK}"/><circle cx="36.5" cy="32" r="1.8" fill="${AV_INK}"/>
    <path d="M29 37 Q32 40 35 37" fill="none" stroke="${AV_INK}" stroke-width="1.4" stroke-linecap="round"/>
    <ellipse cx="24.5" cy="36" rx="2.4" ry="1.4" fill="#ffab8a"/><ellipse cx="39.5" cy="36" rx="2.4" ry="1.4" fill="#ffab8a"/>
    <path d="M51 12 L52 15 L55 16 L52 17 L51 20 L50 17 L47 16 L50 15 Z" fill="#fff" stroke="${AV_INK}" stroke-width=".8"/>` },
  violin: { name: '小提琴', bg: '#f5e6d6', art: `
    <g transform="rotate(30 32 34)">
      <path d="M32 26 C26 26 22 29 23 33 C24 36 26 36 26 38 C26 40 22 41 22 46 C22 52 27 55 32 55 C37 55 42 52 42 46 C42 41 38 40 38 38 C38 36 40 36 41 33 C42 29 38 26 32 26 Z" fill="#c9783e" stroke="${AV_INK}" stroke-width="1.7"/>
      <path d="M29 35 Q28 37 29 39 M35 35 Q36 37 35 39" fill="none" stroke="${AV_INK}" stroke-width="1.2" stroke-linecap="round"/>
      <path d="M30.5 8 L33.5 8 L33.5 46 L30.5 46 Z" fill="#3e2a22"/>
      <path d="M31.3 12 L31.3 50 M32.7 12 L32.7 50" stroke="#f3dfc4" stroke-width=".5"/>
      <path d="M28 49 L36 49" stroke="${AV_INK}" stroke-width="1.6" stroke-linecap="round"/>
      <circle cx="32" cy="8" r="3" fill="#3e2a22"/>
    </g>
    <path d="M12 18 L52 50" stroke="#8a5a32" stroke-width="1.4" stroke-linecap="round"/><path d="M12 18 L14 16" stroke="${AV_INK}" stroke-width="2"/>
    <path d="M48 14 L48 21 A2 2 0 1 1 46 19.5" fill="none" stroke="${AV_INK}" stroke-width="1.3" stroke-linecap="round"/>` },
  golden: { name: '黃金獵犬', bg: '#fff1d6', art: `
    <path d="M18 22 Q8 24 9 40 Q10 47 17 45 Q20 36 21 28 Z M46 22 Q56 24 55 40 Q54 47 47 45 Q44 36 43 28 Z" fill="#d9953e" stroke="${AV_INK}" stroke-width="1.7" stroke-linejoin="round"/>
    <path d="M17 34 Q16 18 32 17 Q48 18 47 34 Q47 50 32 52 Q17 50 17 34 Z" fill="#f1bc6a" stroke="${AV_INK}" stroke-width="1.7"/>
    <path d="M24 42 Q24 36 32 36 Q40 36 40 42 Q40 50 32 50 Q24 50 24 42 Z" fill="#fbe2b4"/>
    <path d="M28 20 Q32 24 36 20" fill="none" stroke="#d9953e" stroke-width="1.6" stroke-linecap="round"/>
    <circle cx="25.5" cy="32" r="2.1" fill="${AV_INK}"/><circle cx="38.5" cy="32" r="2.1" fill="${AV_INK}"/>
    <circle cx="26.2" cy="31.2" r=".7" fill="#fff"/><circle cx="39.2" cy="31.2" r=".7" fill="#fff"/>
    <ellipse cx="32" cy="39.5" rx="3.2" ry="2.3" fill="${AV_INK}"/>
    <path d="M32 41.8 L32 43.5 M28.5 44 Q32 47 35.5 44" fill="none" stroke="${AV_INK}" stroke-width="1.3" stroke-linecap="round"/>
    <path d="M30.3 45.2 Q32 50 33.7 45.2" fill="#ff8fa8" stroke="${AV_INK}" stroke-width="1"/>` },
  lopbunny: { name: '粉紅垂耳兔', bg: '#ffe4ec', art: `
    <path d="M19 26 Q8 28 9 44 Q10 50 16 47 Q19 38 23 31 Z M45 26 Q56 28 55 44 Q54 50 48 47 Q45 38 41 31 Z" fill="#f6a9bf" stroke="${AV_INK}" stroke-width="1.7" stroke-linejoin="round"/>
    <path d="M13 34 Q13 42 15 45 M51 34 Q51 42 49 45" fill="none" stroke="#ffd3df" stroke-width="2.4" stroke-linecap="round"/>
    <ellipse cx="32" cy="38" rx="16" ry="14.5" fill="#f9bccd" stroke="${AV_INK}" stroke-width="1.7"/>
    <circle cx="25.5" cy="37" r="2" fill="${AV_INK}"/><circle cx="38.5" cy="37" r="2" fill="${AV_INK}"/>
    <path d="M30.6 41.5 L33.4 41.5 L32 43 Z" fill="#c9506f"/>
    <path d="M32 43 Q30.5 45 29 44.2 M32 43 Q33.5 45 35 44.2" fill="none" stroke="${AV_INK}" stroke-width="1.2" stroke-linecap="round"/>
    <ellipse cx="22" cy="42" rx="2.6" ry="1.5" fill="#f57c9b" opacity=".6"/><ellipse cx="42" cy="42" rx="2.6" ry="1.5" fill="#f57c9b" opacity=".6"/>
    <g fill="#fff" stroke="${AV_INK}" stroke-width=".9"><circle cx="24" cy="23.5" r="2.6"/><circle cx="28.5" cy="21.5" r="2.6"/><circle cx="21.5" cy="27" r="2.6"/><circle cx="25.5" cy="26" r="2.6"/></g><circle cx="25.3" cy="24.6" r="1.6" fill="#ffd45c"/>` },
  hamster: { name: '倉鼠', bg: '#fff0dc', art: `
    <circle cx="19" cy="21" r="5.5" fill="#e9a964" stroke="${AV_INK}" stroke-width="1.7"/><circle cx="45" cy="21" r="5.5" fill="#e9a964" stroke="${AV_INK}" stroke-width="1.7"/>
    <circle cx="19" cy="21" r="2.5" fill="#ffc2c9"/><circle cx="45" cy="21" r="2.5" fill="#ffc2c9"/>
    <ellipse cx="32" cy="38" rx="19" ry="16" fill="#e9a964" stroke="${AV_INK}" stroke-width="1.7"/>
    <path d="M15 42 Q20 33 32 34 Q44 33 49 42 Q46 53 32 54 Q18 53 15 42 Z" fill="#fff6e8"/>
    <circle cx="25" cy="34" r="2" fill="${AV_INK}"/><circle cx="39" cy="34" r="2" fill="${AV_INK}"/>
    <ellipse cx="32" cy="38.5" rx="1.8" ry="1.3" fill="#e46f8a"/>
    <path d="M32 39.8 Q30 42 28.5 41 M32 39.8 Q34 42 35.5 41" fill="none" stroke="${AV_INK}" stroke-width="1.1" stroke-linecap="round"/>
    <ellipse cx="20.5" cy="41" rx="3.4" ry="2.2" fill="#ffb3c4"/><ellipse cx="43.5" cy="41" rx="3.4" ry="2.2" fill="#ffb3c4"/>
    <path d="M29 48 Q32 45 35 48 Q35 51 32 51 Q29 51 29 48 Z" fill="#a46a3a"/>` },
  panda: { name: '熊貓', bg: '#e3f2e5', art: `
    <circle cx="18" cy="22" r="7" fill="#2d2a2e"/><circle cx="46" cy="22" r="7" fill="#2d2a2e"/>
    <ellipse cx="32" cy="37" rx="18" ry="16" fill="#fff" stroke="${AV_INK}" stroke-width="1.7"/>
    <ellipse cx="24.5" cy="35" rx="4.6" ry="5.6" transform="rotate(25 24.5 35)" fill="#2d2a2e"/><ellipse cx="39.5" cy="35" rx="4.6" ry="5.6" transform="rotate(-25 39.5 35)" fill="#2d2a2e"/>
    <circle cx="25" cy="34.5" r="1.6" fill="#fff"/><circle cx="39" cy="34.5" r="1.6" fill="#fff"/>
    <ellipse cx="32" cy="41.5" rx="2.6" ry="1.8" fill="#2d2a2e"/>
    <path d="M29 45 Q32 47.5 35 45" fill="none" stroke="${AV_INK}" stroke-width="1.3" stroke-linecap="round"/>
    <ellipse cx="20.5" cy="43" rx="2.6" ry="1.5" fill="#ffb3c4"/><ellipse cx="43.5" cy="43" rx="2.6" ry="1.5" fill="#ffb3c4"/>
    <path d="M47 10 Q53 12 50 19 Q46 15 47 10 Z" fill="#7cc488" stroke="${AV_INK}" stroke-width="1"/>` },
  chick: { name: '小雞', bg: '#e1f0ff', art: `
    <path d="M30 18 Q30 12 33 13 Q32 16 34 17 Q36 13 38 15 Q35 17 34 20" fill="#ffd45c" stroke="${AV_INK}" stroke-width="1.4" stroke-linejoin="round"/>
    <ellipse cx="32" cy="38" rx="18" ry="17" fill="#ffe27a" stroke="${AV_INK}" stroke-width="1.7"/>
    <path d="M14 42 Q8 38 10 34 Q14 37 16 37 M50 42 Q56 38 54 34 Q50 37 48 37" fill="#ffd45c" stroke="${AV_INK}" stroke-width="1.4" stroke-linejoin="round"/>
    <circle cx="25.5" cy="35" r="2.1" fill="${AV_INK}"/><circle cx="38.5" cy="35" r="2.1" fill="${AV_INK}"/>
    <circle cx="26.2" cy="34.2" r=".7" fill="#fff"/><circle cx="39.2" cy="34.2" r=".7" fill="#fff"/>
    <path d="M28.5 40 L35.5 40 L32 44.5 Z" fill="#f5a142" stroke="${AV_INK}" stroke-width="1.1" stroke-linejoin="round"/>
    <ellipse cx="21.5" cy="41" rx="2.8" ry="1.6" fill="#ffab8a"/><ellipse cx="42.5" cy="41" rx="2.8" ry="1.6" fill="#ffab8a"/>` },
  frog: { name: '青蛙', bg: '#fff3d1', art: `
    <circle cx="22" cy="24" r="7.5" fill="#8fd18a" stroke="${AV_INK}" stroke-width="1.7"/><circle cx="42" cy="24" r="7.5" fill="#8fd18a" stroke="${AV_INK}" stroke-width="1.7"/>
    <path d="M12 42 Q12 27 32 27 Q52 27 52 42 Q52 54 32 54 Q12 54 12 42 Z" fill="#8fd18a" stroke="${AV_INK}" stroke-width="1.7"/>
    <circle cx="22" cy="24" r="4.2" fill="#fff"/><circle cx="42" cy="24" r="4.2" fill="#fff"/>
    <circle cx="22.8" cy="24.5" r="2.2" fill="${AV_INK}"/><circle cx="42.8" cy="24.5" r="2.2" fill="${AV_INK}"/>
    <path d="M22 41 Q32 49 42 41" fill="none" stroke="${AV_INK}" stroke-width="1.6" stroke-linecap="round"/>
    <ellipse cx="18" cy="40" rx="3.2" ry="2" fill="#ff9fb4" opacity=".8"/><ellipse cx="46" cy="40" rx="3.2" ry="2" fill="#ff9fb4" opacity=".8"/>
    <circle cx="29" cy="33" r=".9" fill="${AV_INK}"/><circle cx="35" cy="33" r=".9" fill="${AV_INK}"/>` },
  koala: { name: '無尾熊', bg: '#dff1f0', art: `
    <circle cx="15" cy="27" r="9" fill="#a8acb8" stroke="${AV_INK}" stroke-width="1.7"/><circle cx="49" cy="27" r="9" fill="#a8acb8" stroke="${AV_INK}" stroke-width="1.7"/>
    <circle cx="15" cy="27" r="5" fill="#f2e6ee"/><circle cx="49" cy="27" r="5" fill="#f2e6ee"/>
    <ellipse cx="32" cy="38" rx="17" ry="15.5" fill="#bfc3cd" stroke="${AV_INK}" stroke-width="1.7"/>
    <circle cx="25" cy="35" r="2" fill="${AV_INK}"/><circle cx="39" cy="35" r="2" fill="${AV_INK}"/>
    <path d="M28 38 Q28 35 32 35 Q36 35 36 38 L36 42 Q36 46 32 46 Q28 46 28 42 Z" fill="#3b3640"/>
    <path d="M29.5 48.5 Q32 50.5 34.5 48.5" fill="none" stroke="${AV_INK}" stroke-width="1.3" stroke-linecap="round"/>
    <ellipse cx="21" cy="42" rx="2.6" ry="1.5" fill="#ffb3c4"/><ellipse cx="43" cy="42" rx="2.6" ry="1.5" fill="#ffb3c4"/>` },
};
// 我們的貓（和首頁路過的貓同一套）
const CAT_AV = [['mx_black', 'black', '小小黑', '#efe6f6'], ['mx_white', 'white', '陷阱貓', '#e2f1fb'], ['mx_orange', 'orange', '晽晽貓貓', '#fff0d9'], ['mx_calico', 'calico', '小魚乾', '#fde8ee'], ['mx_tuxedo', 'tuxedo', '吵吵貓', '#e6f3e4']];
CAT_AV.forEach(([id, coat, name, bg]) => { AVATARS[id] = { name, bg, cat: coat }; });
// 圖騰頭像（和卡片徽章同一套圖騰）
const EMB_AV = [
  ['em_rose', '玫瑰', 'F-valentine', () => festMotif('valentine', {})],
  ['em_anniv', '週年', 'F-anniv', () => festMotif('anniv', {})],
  ['em_xmas', '聖誕', 'F-xmas', () => festMotif('xmas', {})],
  ['em_newyear', '新年', 'F-newyear', () => festMotif('newyear', {})],
  ['em_candle', '燭光', 'C', () => bookMotif('candle')],
  ['em_stars', '星空', 'SSR', () => bookMotif('stars')],
  ['em_wish', '願望', 'W', () => bookMotif('wish')],
  ['em_compass', '羅盤', 'F-travel', () => bookMotif('compass')],
  ['em_suitcase', '旅行', 'R', () => travelMotif('suitcase')],
  ['em_camera', '相機', 'SR', () => travelMotif('camera')],
  ['em_mountain', '山', 'N', () => travelMotif('mountain')],
  ['em_globe', '地球', 'F-queen', () => travelMotif('globe')],
];
EMB_AV.forEach(([id, name, pal, motif]) => { AVATARS[id] = { name, emb: pal, motif }; });

function avatarSVG(id) {
  if (id === 'blackcat') id = 'mx_black'; // 舊的黑貓頭像併入小小黑
  const a = AVATARS[id]; if (!a) return '';
  if (a.cat) {
    const c = COATS[a.cat], tr = (COAT_TRAITS || {})[a.cat];
    return `<svg viewBox="0 0 64 64" class="av-svg" xmlns="http://www.w3.org/2000/svg"><circle cx="32" cy="32" r="31" fill="${a.bg}"/><g transform="translate(32 37) scale(1.12)">${coatHead(c)}${tr && tr.prop === 'tiara' ? COAT_PROPS.tiara : ''}</g><circle cx="32" cy="32" r="30.5" fill="none" stroke="rgba(74,46,42,.18)" stroke-width="1"/></svg>`;
  }
  if (a.emb) {
    let dots = '';
    for (let i = 0; i < 16; i++) { const t = i * 22.5 * Math.PI / 180; dots += `<circle cx="${(32 + Math.sin(t) * 27).toFixed(1)}" cy="${(32 - Math.cos(t) * 27).toFixed(1)}" r="${i % 4 ? .55 : 1}" class="e-ink-f"/>`; }
    let m = ''; try { m = a.motif(); } catch (e) {}
    return `<svg viewBox="0 0 64 64" class="av-svg emb-${a.emb}" xmlns="http://www.w3.org/2000/svg"><circle cx="32" cy="32" r="31" class="e-bg"/><circle cx="32" cy="32" r="30" class="e-ink-s" stroke-width="1.2"/><circle cx="32" cy="32" r="24" class="e-acc-s" stroke-width=".7"/>${dots}<g transform="translate(32 32) scale(.64)">${m}</g></svg>`;
  }
  return `<svg viewBox="0 0 64 64" class="av-svg" xmlns="http://www.w3.org/2000/svg"><circle cx="32" cy="32" r="31" fill="${a.bg}"/><g>${a.art}</g><circle cx="32" cy="32" r="30.5" fill="none" stroke="rgba(74,46,42,.18)" stroke-width="1"/></svg>`;
}


// 旅行基金：徽章風存錢筒（外圈是存錢進度）
function piggyEmblem(pct) {
  const r = 44, C = 2 * Math.PI * r, p = Math.max(0, Math.min(100, pct || 0));
  let dots = '';
  for (let i = 0; i < 24; i++) { const a = i * 15 * Math.PI / 180; dots += `<circle cx="${(60 + Math.sin(a) * 54).toFixed(1)}" cy="${(60 - Math.cos(a) * 54).toFixed(1)}" r="${i % 6 ? .9 : 1.8}" class="e-ink-f"/>`; }
  const S1 = (d, w = 1.5, cls = 'e-ink-s') => `<path d="${d}" class="${cls}" stroke-width="${w}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  return `<svg viewBox="0 0 120 120" class="piggy-emb emb-F-travel" xmlns="http://www.w3.org/2000/svg">
    ${dots}
    <circle cx="60" cy="60" r="50" class="e-bg e-ink-s" stroke-width="1.4"/>
    <circle cx="60" cy="60" r="${r}" class="e-acc-s" stroke-width="3" opacity=".35"/>
    <circle cx="60" cy="60" r="${r}" class="e-ink-s" stroke-width="3" stroke-linecap="round" stroke-dasharray="${(C * p / 100).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 60 60)"/>
    <circle cx="60" cy="60" r="38.5" class="e-acc-s" stroke-width=".8"/>
    <g transform="translate(60 64)">
      <g class="pig-coin"><circle cx="0" cy="-30" r="5" class="e-acc-f e-ink-s" stroke-width="1.2"/>${S1('M0 -33 V-27', 1)}</g>
      <ellipse cx="0" cy="22" rx="18" ry="2.6" class="e-acc-f" opacity=".5"/>
      ${S1('M-13 12 V19 M-6 14 V20 M7 14 V20 M14 12 V19', 2.2)}
      <path d="M-24 2 C-24 -12 -12 -18 0 -18 C13 -18 22 -12 23 -3 L27 -3 C29 -3 29 6 27 6 L23 6 C21 12 14 16 0 16 C-14 16 -24 12 -24 2 Z" class="e-bg e-ink-s" stroke-width="1.6"/>
      <path d="M8 -16 L12 -25 L16 -14" class="e-acc-f e-ink-s" stroke-width="1.3" stroke-linejoin="round"/>
      ${S1('M-6 -18.5 H6', 2.4)}
      <circle cx="13" cy="-5" r="1.5" class="e-ink-f"/>
      ${S1('M25 -0.5 V2.5', 1)}
      ${S1('M-24 0 C-29 0 -31 -4 -28 -6 C-26 -7 -26 -3 -29 -2', 1.2)}
      ${S1('M-16 -8 Q-10 -13 -2 -13', 1.2, 'e-acc-s')}
      <path d="M-6 4 L-3.5 6.5 L-1 4 L1.5 6.5 L4 4" class="e-acc-s" stroke-width="1" fill="none"/>
    </g>
  </svg>`;
}
