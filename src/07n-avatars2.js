// ============================================================
//  頭像：拿掉男孩、女孩、黃金獵犬；補上所有小動物（遇過才解鎖）
// ============================================================
const AV_HIDDEN = new Set(['girl', 'boy', 'golden']);
const FR_AV = {
  fr_haohao: { name: '還好', bg: '#fff1d6', art: `
    <path d="M18 22 Q8 24 9 40 Q11 47 17 43 Q20 33 21 25 Z M46 22 Q56 24 55 40 Q53 47 47 43 Q44 33 43 25 Z" fill="#c9923f" stroke="${AV_INK}" stroke-width="1.8" stroke-linejoin="round"/>
    <path d="M17 34 Q17 17 32 17 Q47 17 47 34 Q47 50 32 50 Q17 50 17 34 Z" fill="#e3b265" stroke="${AV_INK}" stroke-width="1.8"/>
    <path d="M25 22 Q28 20 30 22 M34 22 Q36 20 39 22" fill="none" stroke="#c9923f" stroke-width="1.2" stroke-linecap="round"/>
    <ellipse cx="32" cy="42" rx="8" ry="6.5" fill="#f3d6a2"/>
    <circle cx="25.5" cy="32" r="2.1" fill="${AV_INK}"/><circle cx="38.5" cy="32" r="2.1" fill="${AV_INK}"/><circle cx="26.2" cy="31.3" r=".7" fill="#fff"/><circle cx="39.2" cy="31.3" r=".7" fill="#fff"/>
    <ellipse cx="32" cy="38.5" rx="3.4" ry="2.5" fill="${AV_INK}"/>
    <path d="M27.5 42.5 Q32 46 36.5 42.5" fill="none" stroke="${AV_INK}" stroke-width="1.3" stroke-linecap="round"/>
    <path d="M29.8 43.6 Q29.8 50 32 50 Q34.2 50 34.2 43.6 Z" fill="#ff8fa8" stroke="${AV_INK}" stroke-width="1"/>
    <ellipse cx="21.5" cy="38" rx="2.8" ry="1.8" fill="#ffb3a7" opacity=".8"/><ellipse cx="42.5" cy="38" rx="2.8" ry="1.8" fill="#ffb3a7" opacity=".8"/>` },
  fr_doggy: { name: '狗狗', bg: '#efe7ff', art: `
    <path d="M19 23 Q9 25 10 39 Q12 45 18 41 Q21 32 22 25 Z M45 23 Q55 25 54 39 Q52 45 46 41 Q43 32 42 25 Z" fill="#e2c48a" stroke="${AV_INK}" stroke-width="1.8" stroke-linejoin="round"/>
    <path d="M18 34 Q18 18 32 18 Q46 18 46 34 Q46 49 32 49 Q18 49 18 34 Z" fill="#f2deb0" stroke="${AV_INK}" stroke-width="1.8"/>
    <ellipse cx="32" cy="41" rx="7.5" ry="6" fill="#fbf0d6"/>
    <path d="M23 32 Q25.5 34.5 28 32 M36 32 Q38.5 34.5 41 32" fill="none" stroke="${AV_INK}" stroke-width="1.6" stroke-linecap="round"/>
    <ellipse cx="32" cy="38.5" rx="3" ry="2.2" fill="${AV_INK}"/>
    <path d="M32 40.5 V42.5 M28.8 42.5 Q32 45.5 35.2 42.5" fill="none" stroke="${AV_INK}" stroke-width="1.3" stroke-linecap="round"/>
    <ellipse cx="22.5" cy="38" rx="2.6" ry="1.7" fill="#ffb3c4"/><ellipse cx="41.5" cy="38" rx="2.6" ry="1.7" fill="#ffb3c4"/>
    <path d="M44 15 l.9 2 l2 .9 l-2 .9 l-.9 2 l-.9 -2 l-2 -.9 l2 -.9 z" fill="#c9a6ff"/>` },
  fr_abian: { name: '阿扁', bg: '#e0eefb', art: `
    <path d="M17 50 Q20 44 32 44 Q44 44 47 50 L47 56 Q32 60 17 56 Z" fill="#fbf8f2" stroke="${AV_INK}" stroke-width="1.6"/>
    <path d="M21 54 l3 -2.4 l3 2.4 l3 -2.4 l3 2.4 l3 -2.4 l3 2.4 l3 -2.4" fill="none" stroke="#2f4a7a" stroke-width="1.4" stroke-linejoin="round"/>
    <path d="M19 21 Q9 23 10 37 Q12 43 18 39 Q21 30 22 23 Z M45 21 Q55 23 54 37 Q52 43 46 39 Q43 30 42 23 Z" fill="#cfa877" stroke="${AV_INK}" stroke-width="1.8" stroke-linejoin="round"/>
    <path d="M18 32 Q18 16 32 16 Q46 16 46 32 Q46 46 32 46 Q18 46 18 32 Z" fill="#e2c398" stroke="${AV_INK}" stroke-width="1.8"/>
    <ellipse cx="32" cy="38.5" rx="7.5" ry="5.8" fill="#f6e6cc"/>
    <circle cx="26" cy="30" r="2" fill="${AV_INK}"/><circle cx="38" cy="30" r="2" fill="${AV_INK}"/><circle cx="26.6" cy="29.4" r=".6" fill="#fff"/><circle cx="38.6" cy="29.4" r=".6" fill="#fff"/>
    <ellipse cx="32" cy="36" rx="3" ry="2.2" fill="${AV_INK}"/>
    <path d="M32 38 V40 M29 40 Q32 42.5 35 40" fill="none" stroke="${AV_INK}" stroke-width="1.3" stroke-linecap="round"/>
    <ellipse cx="22.5" cy="35.5" rx="2.5" ry="1.6" fill="#ffb3c4"/><ellipse cx="41.5" cy="35.5" rx="2.5" ry="1.6" fill="#ffb3c4"/>` },
  fr_gungun: { name: '小棍棍', bg: '#fff0e6', art: `
    <path d="M14 26 L15 11 L27 19 Z M50 26 L49 11 L37 19 Z" fill="#c4612a" stroke="${AV_INK}" stroke-width="1.8" stroke-linejoin="round"/>
    <path d="M17 22 L17.5 15 L23.5 19 Z M47 22 L46.5 15 L40.5 19 Z" fill="#fff6ec"/>
    <ellipse cx="32" cy="34" rx="18" ry="15.5" fill="#c4612a" stroke="${AV_INK}" stroke-width="1.8"/>
    <ellipse cx="23" cy="26.5" rx="3.2" ry="2" fill="#fff6ec"/><ellipse cx="41" cy="26.5" rx="3.2" ry="2" fill="#fff6ec"/>
    <path d="M14.5 36 Q17 30 22.5 32 Q24 38 20 42 Q16 41 14.5 36 Z M49.5 36 Q47 30 41.5 32 Q40 38 44 42 Q48 41 49.5 36 Z" fill="#fff6ec"/>
    <ellipse cx="32" cy="41" rx="7" ry="5.5" fill="#fff6ec"/>
    <circle cx="25.5" cy="33.5" r="2.4" fill="${AV_INK}"/><circle cx="38.5" cy="33.5" r="2.4" fill="${AV_INK}"/><circle cx="26.3" cy="32.7" r=".8" fill="#fff"/><circle cx="39.3" cy="32.7" r=".8" fill="#fff"/>
    <ellipse cx="32" cy="39" rx="2.4" ry="1.7" fill="${AV_INK}"/>
    <path d="M32 40.5 V42 M29.5 42 Q30.8 43.6 32 42 Q33.2 43.6 34.5 42" fill="none" stroke="${AV_INK}" stroke-width="1.2" stroke-linecap="round"/>
    <ellipse cx="19.5" cy="39.5" rx="2.4" ry="1.5" fill="#ff9fae" opacity=".85"/><ellipse cx="44.5" cy="39.5" rx="2.4" ry="1.5" fill="#ff9fae" opacity=".85"/>` },
  fr_shark: { name: '鯊魚', bg: '#ddeefa', art: `
    <path d="M27 18 Q31 7 38 6 Q35 12 37 19 Z" fill="#6b9cc0" stroke="${AV_INK}" stroke-width="1.8" stroke-linejoin="round"/>
    <path d="M12 38 Q12 18 32 18 Q52 18 52 38 Q52 52 32 52 Q12 52 12 38 Z" fill="#6b9cc0" stroke="${AV_INK}" stroke-width="1.8"/>
    <path d="M14.5 42 Q20 37 32 37 Q44 37 49.5 42 Q46 51 32 51 Q18 51 14.5 42 Z" fill="#f4f0e6"/>
    <path d="M45 26 Q46.5 29 45 32 M48 27 Q49.5 30 48 33" fill="none" stroke="#4d7ea3" stroke-width="1.2" stroke-linecap="round"/>
    <circle cx="24" cy="30" r="2.1" fill="${AV_INK}"/><circle cx="40" cy="30" r="2.1" fill="${AV_INK}"/><circle cx="24.6" cy="29.4" r=".7" fill="#fff"/><circle cx="40.6" cy="29.4" r=".7" fill="#fff"/>
    <path d="M22 41 Q32 48 42 41 Q32 45 22 41 Z" fill="#f08a9c" stroke="${AV_INK}" stroke-width="1.3" stroke-linejoin="round"/>
    <path d="M24 41.6 l2 2 l2 -1.4 l2 2 l2 -1.6 l2 1.6 l2 -2 l2 1.4 l2 -2" fill="#fff" stroke="${AV_INK}" stroke-width=".9" stroke-linejoin="round"/>
    <ellipse cx="18.5" cy="36" rx="2.6" ry="1.6" fill="#ffb3c4" opacity=".8"/><ellipse cx="45.5" cy="36" rx="2.6" ry="1.6" fill="#ffb3c4" opacity=".8"/>` },
};
Object.assign(AVATARS, FR_AV);
// 每個小動物頭像對應圖鑑裡的哪一隻
const AV_DEX = { mx_black: 'black', mx_white: 'white', mx_orange: 'orange', mx_calico: 'calico', mx_tuxedo: 'tuxedo', fr_haohao: 'haohao', fr_doggy: 'doggy', fr_abian: 'abian', fr_gungun: 'gungun', fr_shark: 'shark' };
const avLocked = (id) => AV_DEX[id] && !(((S.couple || {}).dex || {})[AV_DEX[id]] || {}).met;
// 還沒解鎖：徽章式的問號
function avQuestionSVG() {
  let dots = '';
  for (let i = 0; i < 16; i++) { const t = i * 22.5 * Math.PI / 180; dots += `<circle cx="${(32 + Math.sin(t) * 27).toFixed(1)}" cy="${(32 - Math.cos(t) * 27).toFixed(1)}" r="${i % 4 ? .55 : 1}" class="e-ink-f"/>`; }
  return `<svg viewBox="0 0 64 64" class="av-svg emb-C av-q" xmlns="http://www.w3.org/2000/svg"><circle cx="32" cy="32" r="31" class="e-bg"/><circle cx="32" cy="32" r="30" class="e-ink-s" stroke-width="1.2" fill="none" opacity=".5"/><circle cx="32" cy="32" r="22" class="e-acc-s" stroke-width=".8" fill="none" stroke-dasharray="2 2.5"/>${dots}
    <path d="M26.5 26 Q26.5 20.5 32 20.5 Q37.5 20.5 37.5 25.5 Q37.5 29 33.5 30.5 Q32 31.2 32 34 V35.5" class="e-ink-s" stroke-width="2.2" fill="none" stroke-linecap="round"/><circle cx="32" cy="41" r="1.6" class="e-ink-f"/>
    <path d="M44 17 l1 2.4 l2.4 1 l-2.4 1 l-1 2.4 l-1 -2.4 l-2.4 -1 l2.4 -1 z" class="e-acc-f"/></svg>`;
}
function avatarPickerHTML(cur) {
  const ks = Object.keys(AVATARS).filter((k) => !AV_HIDDEN.has(k));
  const order = [...ks.filter((k) => AVATARS[k].emb), ...ks.filter((k) => !AVATARS[k].emb && !AV_DEX[k]), ...ks.filter((k) => AV_DEX[k])];
  return order.map((k) => avLocked(k)
    ? `<button class="av-lock" disabled title="還沒遇到"><span class="av">${avQuestionSVG()}</span></button>`
    : `<button data-av="${k}" class="${cur === k ? 'on' : ''}" title="${AVATARS[k].name}"><span class="av">${avatarSVG(k)}</span></button>`).join('');
}
