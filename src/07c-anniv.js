// ============================================================
//  週年慶模式：紀念日當天的開場、金色首頁、限定卡、這幾年的故事、週年信
// ============================================================

const CN_NUM = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
function cnNum(n) {
  if (n <= 10) return CN_NUM[n];
  if (n < 20) return '十' + (n % 10 ? CN_NUM[n % 10] : '');
  return CN_NUM[Math.floor(n / 10)] + '十' + (n % 10 ? CN_NUM[n % 10] : '');
}
// 今天是不是紀念日？回傳第幾週年（試玩可用 localStorage park-anniv-preview=1 預覽）
function annivInfo() {
  const a = parseD(S.couple?.dates?.anniversary || D.DEFAULT_DATES.anniversary);
  const t = new Date(); t.setHours(0, 0, 0, 0);
  const preview = localStorage.getItem('park-anniv-preview') === '1';
  const both = (S.couple?.members || []).length >= 2;
  const thisYear = new Date(t.getFullYear(), a.getMonth(), a.getDate());
  const diff = Math.round((t - thisYear) / 86400000);
  // 紀念日當天起 7 天內、而且兩個人都加入了才會出現（對方晚幾天加入也看得到）
  const is = preview || (both && t.getFullYear() > a.getFullYear() && diff >= 0 && diff <= 6);
  const n = Math.max(1, thisYear.getFullYear() - a.getFullYear());
  return { is, n, y: t.getFullYear(), cn: cnNum(n), today: preview || diff === 0 };
}

// 金色週年徽章（中間是大大的數字）
function annivMedal(n) {
  let dots = '';
  for (let i = 0; i < 36; i++) { const a = i * 10 * Math.PI / 180; dots += `<circle cx="${(100 + Math.sin(a) * 94).toFixed(1)}" cy="${(100 - Math.cos(a) * 94).toFixed(1)}" r="${i % 3 ? 1.1 : 2.2}" fill="#e9c77b"/>`; }
  let rays = '';
  for (let i = 0; i < 24; i++) { const a = i * 15 * Math.PI / 180, r1 = 62, r2 = i % 2 ? 68 : 72; rays += `<path d="M${(100 + Math.sin(a) * r1).toFixed(1)} ${(100 - Math.cos(a) * r1).toFixed(1)} L${(100 + Math.sin(a) * r2).toFixed(1)} ${(100 - Math.cos(a) * r2).toFixed(1)}" stroke="#e9c77b" stroke-width="1.2" stroke-linecap="round"/>`; }
  return `<svg viewBox="0 0 200 200" class="anniv-medal" xmlns="http://www.w3.org/2000/svg">
    <g class="am-dots">${dots}</g>
    <circle cx="100" cy="100" r="86" fill="none" stroke="#e9c77b" stroke-width="2" class="am-ring"/>
    <circle cx="100" cy="100" r="80" fill="none" stroke="#e9c77b" stroke-width=".8" opacity=".6"/>
    <g opacity=".85">${rays}</g>
    <circle cx="100" cy="100" r="56" fill="#2b1420" stroke="#e9c77b" stroke-width="1.6"/>
    <circle cx="100" cy="100" r="50" fill="none" stroke="#e9c77b" stroke-width=".7" stroke-dasharray="2 4"/>
    <text x="100" y="${n > 9 ? 121 : 124}" text-anchor="middle" font-family="Songti TC, Noto Serif TC, serif" font-weight="900" font-size="${n > 9 ? 58 : 70}" fill="url(#amg)">${n}</text>
    <defs><linearGradient id="amg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff1c9"/><stop offset=".55" stop-color="#e9c77b"/><stop offset="1" stop-color="#b8862f"/></linearGradient></defs>
    <path d="M58 158 Q100 176 142 158" fill="none" stroke="#e9c77b" stroke-width="1.4" stroke-linecap="round"/>
    <path d="M100 160 L102 165 L107 167 L102 169 L100 174 L98 169 L93 167 L98 165 Z" fill="#e9c77b"/>
    <path d="M48 52 L49.5 56 L53.5 57.5 L49.5 59 L48 63 L46.5 59 L42.5 57.5 L46.5 56 Z" fill="#fff1c9"/>
    <path d="M154 46 L155 49 L158 50 L155 51 L154 54 L153 51 L150 50 L153 49 Z" fill="#fff1c9"/>
  </svg>`;
}

// 開場（每年每支手機看一次；首頁的週年卡可以重看）
function annivIntro(force) {
  const A = annivInfo();
  if (!A.is || !S.couple) return;
  const key = `park-anniv-intro-${A.y}`;
  if (!force && localStorage.getItem(key)) return;
  localStorage.setItem(key, '1');
  const p = partner();
  const el = document.createElement('div');
  el.className = 'anniv-intro';
  el.innerHTML = `<div class="ai-glow"></div>
    <div class="ai-body">
      ${annivMedal(A.n)}
      <div class="ai-eyebrow">${esc(nick(me()))}${p ? ' & ' + esc(nick(p)) : ''}</div>
      <h1>${A.cn}週年快樂</h1>
      <p>${A.today ? '今天' : '現在'}是我們在一起的第 ${money(daysTogether())} 天</p>
      <button class="btn ai-go" id="ai-story">打開我們的${A.cn}年</button>
      <button class="link ai-skip" id="ai-skip">先看看首頁</button>
    </div>`;
  document.body.appendChild(el);
  setTimeout(() => confetti(120, ['#e9c77b', '#fff1c9', '#c42e52', '#ff9db4', '#b8862f']), 900);
  const close = () => { el.classList.add('out'); setTimeout(() => { el.remove(); if (tourNeeded() && !document.querySelector('.story')) startTour(); }, 450); };
  $('#ai-skip', el).onclick = close;
  $('#ai-story', el).onclick = () => { close(); setTimeout(() => ACT.annivStory(), 300); };
}

// 這幾年的我們：以「時間」和你們寫進時間軸的回憶為主，App 裡的數字有才顯示
function countMD(from, md) {
  const [m, d] = md.split('-').map(Number), t = new Date(); t.setHours(0, 0, 0, 0);
  let n = 0;
  for (let y = from.getFullYear(); y <= t.getFullYear(); y++) { const x = new Date(y, m - 1, d); if (x >= from && x <= t) n++; }
  return n;
}
ACT.annivStory = () => {
  const A = annivInfo();
  const ms = S.couple.members, p = partner();
  const annS = S.couple.dates?.anniversary || D.DEFAULT_DATES.anniversary, ann = parseD(annS);
  const days = daysTogether();
  const her = ms.find((u) => prof(u).role === 'her'), him = ms.find((u) => prof(u).role === 'him');
  const G = ['#e9c77b', '#fff1c9', '#c42e52', '#ff9db4'];
  const gold = 'linear-gradient(160deg, #3a1622, #1a0b11)';
  const slides = [
    { bg: gold, i: annivMedal(A.n), n: `${A.cn}週年`, t: '這幾年的我們', s: `從 ${annS.replace(/-/g, '/')} 開始<br>往右點，一起回顧 →` },
    { i: ic('heart'), n: money(days), t: '天', s: `大約 ${money(Math.round(days / 7))} 個週末<br>${money(days * 24)} 個小時都有彼此` },
  ];
  // 一起過的節日
  const hol = [['聖誕節', countMD(ann, '12-25')], ['情人節', countMD(ann, '02-14')], ['跨年', countMD(ann, '01-01')]].filter((x) => x[1] > 0);
  const bd = [[her, prof(her || '').bday || D.DEFAULT_DATES.herBirthday], [him, prof(him || '').bday || D.DEFAULT_DATES.hisBirthday]]
    .filter(([u]) => u).map(([u, md]) => `${esc(nick(u))}的生日 ${countMD(ann, md)} 次`);
  slides.push({ i: ic('tree'), n: hol.reduce((a, x) => a + x[1], 0), t: '個一起過的節日', s: hol.map(([k, n]) => `${n} 次${k}`).join('・') + (bd.length ? `<br>還有 ${bd.join('、')}` : '') });
  slides.push({ bg: gold, i: ic('house'), n: `第 ${cnNum(A.n + 1)} 年`, t: D.BIRTHDAY_SLOGAN, s: `${esc(nick(me()))}${p ? ' ♡ ' + esc(nick(p)) : ''}<br>也請多多指教` });
  playStory(slides, { finale: 140, colors: G });
};

// 週年信：兩個人都寫好之後才能同時打開
ACT.annivLetter = async () => {
  const A = annivInfo(), p = partner();
  const L = (S.couple.annivLetters || {})[A.y] || {};
  const mine = L[me()], theirs = p ? L[p] : null;
  if (mine && theirs) {
    openModal(`${mhead(`<i data-ic="letter"></i> ${A.cn}週年的信`)}
      ${[[p, theirs], [me(), mine]].map(([u, t]) => `<div class="anniv-letter"><div class="al-from">${avatar(u)} ${esc(nick(u))} 寫給 ${esc(nick(u === me() ? p : me()))}</div><div class="al-body">${esc(t.text)}</div></div>`).join('')}`);
    return;
  }
  const text = await promptBox(mine ? '修改我的週年信（對方寫好後才會一起打開）' : `寫一封${A.cn}週年的信給 ${nick(p) || '對方'}`, { multiline: true, value: mine?.text || '', placeholder: '這一年最想謝謝對方的事、最喜歡的瞬間、想對下一年說的話…', ok: '封好' });
  if (!text || !text.trim()) return;
  await S.store.updateCouple(S.cid, { [`annivLetters.${A.y}.${me()}`]: { text: text.trim(), at: now() } });
  if (p) await notify(p, 'letter', `${nick(me())} 寫好週年信了，換你寫，兩封會一起打開`);
  toast(theirs ? '兩封信都寫好了，可以一起打開了' : '封好了，等對方也寫完就能一起打開');
};

// 首頁最上面的週年卡
function annivHomeCard() {
  const A = annivInfo();
  if (!A.is) return '';
  const p = partner();
  const L = (S.couple.annivLetters || {})[A.y] || {};
  const both = L[me()] && p && L[p];
  return `<div class="card anniv-card">
    <div class="ac-medal">${annivMedal(A.n)}</div>
    <div class="grow">
      <div class="ac-eyebrow">${A.today ? '今天是我們的' : '剛剛過完的'}</div>
      <div class="ac-title">${A.cn}週年紀念日</div>
      <div class="ac-btns">
        <button class="btn sm" data-act="annivStory">我們的${A.cn}年</button>
        <button class="btn sm ghost" data-act="annivLetter">${both ? '打開週年信' : L[me()] ? '信已封好・等對方' : '寫週年信'}</button>
      </div>
    </div>
  </div>`;
}
ACT.annivReplay = () => annivIntro(true);
async function annivRibbon() {
  const A = annivInfo();
  if (!A.is || localStorage.getItem('park-anniv-preview') === '1') return;
  const pet = S.couple.pet || {};
  if ((pet.owned || []).includes('ribbon')) return;
  await S.store.coupleTx(S.cid, (c) => { const p = c.pet || {}; if ((p.owned || []).includes('ribbon')) return null; return { 'pet.owned': [...(p.owned || []), 'ribbon'], 'pet.wear': 'ribbon' }; });
  setTimeout(() => toast(`${petState().name} 戴上了週年紅緞帶`), 2500);
}
