// ============================================================
//  收藏冊擴充：節日（13）、旅行（16）、約會（10）、小小黑（9）
//  ＋ 兌換時對方跳出大卡片
// ============================================================

// ---------- 新的節日／系列外觀 ----------
Object.assign(FESTS, {
  whiteday:  { label: '白 色 情 人 節', foot: '白色情人節限定', pat: 'snow' },
  confess:   { label: '告 白 限 定', foot: '520 限定', pat: 'hearts' },
  qixi:      { label: '七 夕 限 定', foot: '七夕限定', pat: 'sparkle' },
  moon:      { label: '中 秋 限 定', foot: '中秋限定', pat: 'sparkle' },
  halloween: { label: '萬 聖 限 定', foot: '萬聖節限定', pat: 'grid' },
  nye:       { label: '跨 年 限 定', foot: '跨年限定', pat: 'sparkle' },
  eve:       { label: '除 夕 限 定', foot: '除夕限定', pat: 'plum' },
  date:      { label: '約 會 系 列', foot: '約會系列', pat: 'hearts' },
  pet:       { label: '小 小 黑 系 列', foot: '小小黑系列', pat: 'rings' },
});
Object.assign(TRAVEL_TM, { 存錢筒開張: 'suitcase', 四季旅人: 'map', 壽星旅行: 'camera', 跨年在旅途: 'plane', 老地方: 'pin', 旅行攝影集: 'camera', 二十站: 'globe' });
const _festMotif0 = festMotif;
festMotif = function (key, c) {
  const S1 = (d, w = 1.5, cls = 'e-ink-s') => `<path d="${d}" class="${cls}" stroke-width="${w}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  const heart = (s = 1, y = 0, cls = 'e-acc-f e-ink-s') => `<path transform="translate(0 ${y}) scale(${s})" d="M0 10 C-3 7 -12 1 -12 -5 C-12 -9.5 -8.5 -12 -5 -12 C-2.5 -12 -1 -10.5 0 -8.5 C1 -10.5 2.5 -12 5 -12 C8.5 -12 12 -9.5 12 -5 C12 1 3 7 0 10 Z" class="${cls}" stroke-width="${1.2 / s}"/>`;
  if (key === 'whiteday') return `<path d="M-14 -8 L-30 -16 L-30 0 Z M14 -8 L30 -16 L30 0 Z" class="e-acc-f e-ink-s" stroke-width="1.3" stroke-linejoin="round"/>
    <ellipse cx="0" cy="-8" rx="15" ry="12" class="e-bg e-ink-s" stroke-width="1.6"/>${S1('M-9 -15 Q0 -4 9 -15 M-11 -5 Q0 4 11 -5', 1)}
    <rect x="-16" y="10" width="32" height="20" rx="3" class="e-bg e-ink-s" stroke-width="1.5"/><rect x="-3" y="10" width="6" height="20" class="e-acc-f"/>${S1('M-16 18 H16', 1)}`;
  if (key === 'confess') return `${heart(2.4, -4, 'e-bg e-ink-s')}<text x="0" y="0" text-anchor="middle" font-size="13" font-weight="900" class="e-ink-f" font-family="serif">520</text>${heart(.6, 26)}`;
  if (key === 'qixi') return `${S1('M-34 16 Q0 -16 34 16', 1.8)}${S1('M-28 16 Q0 -10 28 16', 1)}
    ${[-24, -12, 0, 12, 24].map((x) => `<path d="M${x} ${x === 0 ? -1 : Math.abs(x) === 12 ? 2 : 9} l-4 -3 l8 0 z" class="e-ink-f"/>`).join('')}
    <path d="M-26 -22 l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2 l5 -2 z M26 -22 l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2 l5 -2 z" class="e-acc-f e-ink-s" stroke-width=".8"/>`;
  if (key === 'moon') return `<circle cx="4" cy="-6" r="22" class="e-acc-f e-ink-s" stroke-width="1.6"/>
    <circle cx="-4" cy="-12" r="3" class="e-bg"/><circle cx="12" cy="0" r="2" class="e-bg"/><circle cx="2" cy="6" r="1.6" class="e-bg"/>
    <path d="M-34 22 Q-28 14 -18 18 Q-12 10 -2 16 Q6 12 10 20 L-34 20 Z" class="e-bg e-ink-s" stroke-width="1.3" stroke-linejoin="round"/>${S1('M12 28 Q20 22 30 26', 1.2)}`;
  if (key === 'halloween') return `<ellipse cx="0" cy="6" rx="26" ry="20" class="e-acc-f e-ink-s" stroke-width="1.6"/>${S1('M-9 -12 Q-14 6 -9 25 M9 -12 Q14 6 9 25 M0 -14 V26', 1)}
    ${S1('M0 -14 Q1 -22 6 -25', 2.2)}<path d="M-14 0 l5 -6 l5 6 z M4 0 l5 -6 l5 6 z" class="e-ink-f"/><path d="M-12 12 l4 4 l4 -4 l4 4 l4 -4 l4 4 l4 -4" class="e-ink-s" stroke-width="1.4" fill="none" stroke-linejoin="round"/>`;
  if (key === 'nye') { let s = ''; for (let i = 0; i < 12; i++) { const a = i * 30 * Math.PI / 180, r1 = 8, r2 = i % 2 ? 22 : 30; s += S1(`M${(Math.sin(a) * r1).toFixed(1)} ${(-6 - Math.cos(a) * r1).toFixed(1)} L${(Math.sin(a) * r2).toFixed(1)} ${(-6 - Math.cos(a) * r2).toFixed(1)}`, 1.4); s += `<circle cx="${(Math.sin(a) * (r2 + 3)).toFixed(1)}" cy="${(-6 - Math.cos(a) * (r2 + 3)).toFixed(1)}" r="1.4" class="e-acc-f"/>`; }
    return s + `<circle cx="0" cy="-6" r="4" class="e-acc-f e-ink-s" stroke-width="1.2"/><text x="0" y="36" text-anchor="middle" font-size="7" class="e-ink-f" font-weight="800">00:00</text>`; }
  if (key === 'eve') return `${S1('M0 -34 V-26', 1.4)}<rect x="-8" y="-27" width="16" height="5" rx="1" class="e-ink-f"/>
    <ellipse cx="0" cy="-2" rx="20" ry="20" class="e-acc-f e-ink-s" stroke-width="1.6"/>${S1('M-10 -19 Q-16 -2 -10 15 M10 -19 Q16 -2 10 15 M0 -22 V18', 1)}
    <rect x="-8" y="17" width="16" height="5" rx="1" class="e-ink-f"/>${S1('M-4 22 V32 M0 22 V34 M4 22 V32', 1.2)}`;
  if (key === 'date') return `<rect x="-26" y="-20" width="52" height="44" rx="5" class="e-bg e-ink-s" stroke-width="1.6"/><rect x="-26" y="-20" width="52" height="11" rx="5" class="e-acc-f"/>${S1('M-26 -9 H26', 1.2)}
    ${S1('M-14 -26 V-15 M14 -26 V-15', 2.2)}${heart(1, 8)}`;
  if (key === 'pet') return `<path d="M-24 4 C-25 -6 -22 -12 -20 -14 L-21 -27 L-8 -18 C-3 -19.5 3 -19.5 8 -18 L21 -27 L20 -14 C22 -12 25 -6 24 4 C23 17 12 25 0 25 C-12 25 -23 17 -24 4 Z" style="fill:#2b2633;stroke:var(--e-ink)" stroke-width="1.2" stroke-linejoin="round"/>
    <path d="M-18 -17 L-19.4 -24 L-11.5 -18.8 Z M18 -17 L19.4 -24 L11.5 -18.8 Z" fill="#e9a3b8" stroke-linejoin="round"/>
    <ellipse cx="-9" cy="2" rx="4.4" ry="5.4" fill="#f5c843"/><ellipse cx="9" cy="2" rx="4.4" ry="5.4" fill="#f5c843"/>
    <ellipse cx="-9" cy="2.5" rx="1.4" ry="4" fill="#2b2633"/><ellipse cx="9" cy="2.5" rx="1.4" ry="4" fill="#2b2633"/>
    <circle cx="-7.8" cy="0" r="1" fill="#fff"/><circle cx="10.2" cy="0" r="1" fill="#fff"/><path d="M-2 11 L2 11 L0 13 Z" fill="#e9a3b8"/>
    <ellipse cx="-16" cy="11" rx="3" ry="1.6" fill="#e9a3b8" opacity=".6"/><ellipse cx="16" cy="11" rx="3" ry="1.6" fill="#e9a3b8" opacity=".6"/>`;
  return _festMotif0(key, c);
};
const _bookMotif0 = bookMotif;
bookMotif = function (kind) {
  if (kind === 'date') return festMotif('date');
  if (kind === 'pet') return festMotif('pet');
  return _bookMotif0(kind);
};
Object.assign(BOOK_META, {
  '約會系列': { pal: 'F-date', motif: 'date', pat: 'hearts', sub: '一起出門的紀錄', how: '在約會分頁把約會按「完成」就會開始收集' },
  '小小黑系列': { pal: 'F-pet', motif: 'pet', pat: 'rings', sub: '和小小黑一起長大', how: '摸摸、餵罐罐、陪牠長大都會掉卡' },
});

// ---------- 共用：系列卡掉落（key 只掉一次） ----------
async function seriesDrop(key, tpl, series, fest, to, text) {
  const ok = await S.store.coupleTx(S.cid, (x) => (x.drops && x.drops[key] ? null : { [`drops.${key}`]: true }));
  if (!ok) return false;
  for (const u of to) {
    await col('cards').add(cardDoc({ ...tpl, series, fest }, u, 'sys'));
    await col('events').add({ to: u, by: 'sys', type: 'card', text, detail: tpl.title, at: now(), read: false });
  }
  return true;
}

// ---------- 節日系列：新增 7 個 ----------
const HOLIDAY_MORE = {
  whiteday:  { title: '白色情人節回禮券', rarity: 'R', desc: '換一份回禮', fest: 'whiteday', how: '3/14 白色情人節' },
  confess:   { title: '520 告白券', rarity: 'SR', desc: '換一段當面說的告白', fest: 'confess', how: '5/20' },
  qixi:      { title: '七夕鵲橋券', rarity: 'SR', desc: '換一次整天不看手機的約會', fest: 'qixi', how: '農曆 7/7 七夕' },
  moon:      { title: '中秋賞月券', rarity: 'R', desc: '一起賞月、一起吃柚子', fest: 'moon', how: '農曆 8/15 中秋' },
  halloween: { title: '不給糖就搗蛋券', rarity: 'R', desc: '換一個無傷大雅的惡作劇', fest: 'halloween', how: '10/31 萬聖節' },
  nye:       { title: '跨年之吻', rarity: 'SR', desc: '倒數歸零的那個吻', fest: 'nye', how: '12/31 跨年夜' },
  eve:       { title: '除夕團圓券', rarity: 'SR', desc: '換一頓一起吃的年夜飯', fest: 'eve', how: '農曆除夕' },
};
function lunarMD(d) {
  try {
    const p = new Intl.DateTimeFormat('zh-TW-u-ca-chinese', { month: 'numeric', day: 'numeric' }).formatToParts(d);
    return [parseInt(p.find((x) => x.type === 'month').value, 10), parseInt(p.find((x) => x.type === 'day').value, 10)];
  } catch (e) { return [0, 0]; }
}
function holidayMoreToday(d = new Date()) {
  const md = `${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const [lm, ld] = lunarMD(d), tm = new Date(d); tm.setDate(tm.getDate() + 1);
  const [tlm, tld] = lunarMD(tm);
  const out = [];
  if (md === '03-14') out.push('whiteday');
  if (md === '05-20') out.push('confess');
  if (lm === 7 && ld === 7) out.push('qixi');
  if (lm === 8 && ld === 15) out.push('moon');
  if (md === '10-31') out.push('halloween');
  if (md === '12-31') out.push('nye');
  if (tlm === 1 && tld === 1) out.push('eve');
  return out;
}
async function extraHolidayDrops() {
  const c = S.couple;
  if (!c || (c.members || []).length < 2) return;
  const y = new Date().getFullYear();
  for (const k of holidayMoreToday()) {
    const t = HOLIDAY_MORE[k];
    if (await seriesDrop(`${y}-${k}`, t, '節日系列', t.fest, c.members, '今天有一張節日限定券送給你')) await ticketOnce(`fest-${y}-${k}`, c.members, '節日禮物');
  }
}

// ---------- 旅行系列：只算 11/20 以後的足跡，新增 7 張 ----------
const TRAVEL_START = '2026-11-20';
const tripDay = (t) => t.date || dkey(new Date(t.at || 0));
function countedTrips() { return list('trips').filter((t) => tripDay(t) >= TRAVEL_START); }
const TRAVEL_MORE = {
  fundFirst: { title: '存錢筒開張', rarity: 'N', desc: '換一杯旅行前的咖啡', how: '第一次存旅行基金' },
  four: { title: '四季旅人', rarity: 'SR', desc: '換一次你挑的住宿', how: '同一年記 4 個足跡' },
  bday: { title: '壽星旅行', rarity: 'SR', desc: '壽星這趟不用出錢', how: '足跡日期剛好是其中一人生日' },
  nye: { title: '跨年在旅途', rarity: 'SSR', desc: '換一張旅途中的跨年合照', how: '足跡日期是 12/31 或 1/1' },
  old: { title: '老地方', rarity: 'SR', desc: '換一次「我們的老位置」約會', how: '同一個地方記錄 3 次' },
  photos: { title: '旅行攝影集', rarity: 'R', desc: '換一本洗出來的小相簿', how: '相簿裡標記到旅行的照片滿 30 張' },
  twenty: { title: '二十站', rarity: 'SSR', desc: '換一趟對方全包的旅行', how: '足跡滿 20 站' },
};
const kmBetween = (a, b) => { const R = 6371, r = Math.PI / 180, dLa = (b.lat - a.lat) * r, dLo = (b.lng - a.lng) * r; const h = Math.sin(dLa / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLo / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };
async function travelExtraDrops(ts) {
  const T = TRAVEL_MORE, ms = S.couple.members;
  const drop = (k, cond, msg) => (cond ? travelDrop(`more-${k}`, T[k], msg) : false);
  await drop('fundFirst', list('deposits').length >= 1, '第一次存旅行基金！旅行限定卡掉落');
  const years = {}; ts.forEach((t) => { const y = tripDay(t).slice(0, 4); years[y] = (years[y] || 0) + 1; });
  await drop('four', Object.values(years).some((n) => n >= 4), '一年四個足跡！旅行限定卡掉落');
  const bdays = ms.map((u) => prof(u).bday).filter(Boolean);
  await drop('bday', ts.some((t) => bdays.includes(tripDay(t).slice(5))), '生日在旅途中！旅行限定卡掉落');
  await drop('nye', ts.some((t) => ['12-31', '01-01'].includes(tripDay(t).slice(5))), '在旅途中跨年！旅行限定卡掉落');
  const same = (a, b) => (a.name || '').trim() === (b.name || '').trim() || (a.lat != null && b.lat != null && kmBetween(a, b) < 1);
  await drop('old', ts.some((a) => ts.filter((b) => same(a, b)).length >= 3), '同一個地方第三次！旅行限定卡掉落');
  const ids = new Set(ts.map((t) => t.id));
  await drop('photos', list('photos').filter((p) => p.tripId && ids.has(p.tripId)).length >= 30, '旅行照片滿 30 張！旅行限定卡掉落');
  await drop('twenty', ts.length >= 20, '足跡滿 20 站！旅行限定卡掉落');
}

// ---------- 約會系列 ----------
const DATE_DEFS = [
  { id: 'd1', title: '初約', rarity: 'N', desc: '換一張約會合照', how: '第 1 次完成約會' },
  { id: 'd10', title: '十次約會', rarity: 'R', desc: '換一次你決定的晚餐', how: '完成 10 次約會' },
  { id: 'd30', title: '三十次約會', rarity: 'SR', desc: '換一整天的約會規劃，對方負責', how: '完成 30 次約會' },
  { id: 'd50', title: '五十次約會', rarity: 'SSR', desc: '換一個你一直想去的地方', how: '完成 50 次約會' },
  { id: 'd100', title: '一百次約會', rarity: 'SSR', desc: '換一份紀念禮物', how: '完成 100 次約會' },
  { id: 'month4', title: '這個月都約滿', rarity: 'SR', desc: '換一次賴床早午餐', how: '同一個月完成 4 次約會' },
  { id: 'idea5', title: '說走就走', rarity: 'R', desc: '換一次臨時起意的出門', how: '點子罐抽中的點子完成 5 個' },
  { id: 'w10', title: '爆米花', rarity: 'R', desc: '換一桶爆米花和你選的片', how: '一起看清單看完 10 部' },
  { id: 'w30', title: '影評人', rarity: 'SR', desc: '換一次電影院約會，對方請', how: '一起看清單看完 30 部' },
  { id: 'drama3', title: '補完計畫', rarity: 'R', desc: '換一個追劇宵夜', how: '影集看完 3 部' },
];
function dateEarned() {
  const done = list('dates').filter((d) => d.done);
  const months = {}; done.forEach((d) => { const m = (d.date || dkey(new Date(d.doneAt || d.at))).slice(0, 7); months[m] = (months[m] || 0) + 1; });
  const watched = list('watch').filter((w) => w.done && (w.kind === 'movie' || w.kind === 'drama'));
  const got = new Set();
  [['d1', 1], ['d10', 10], ['d30', 30], ['d50', 50], ['d100', 100]].forEach(([id, n]) => { if (done.length >= n) got.add(id); });
  if (Object.values(months).some((n) => n >= 4)) got.add('month4');
  if (done.filter((d) => d.ideaId).length >= 5) got.add('idea5');
  if (watched.length >= 10) got.add('w10');
  if (watched.length >= 30) got.add('w30');
  if (watched.filter((w) => w.kind === 'drama').length >= 3) got.add('drama3');
  return got;
}

// ---------- 小小黑系列 ----------
const PET_DEFS = [
  { id: 'pat', title: '初次見面', rarity: 'N', desc: '換一個摸頭', how: '第一次摸摸小小黑' },
  { id: 'feed', title: '第一個罐罐', rarity: 'N', desc: '換一份點心', how: '第一次餵罐罐' },
  { id: 'teen', title: '少年貓', rarity: 'R', desc: '換一次一起逛寵物店', how: '長成少年貓' },
  { id: 'big', title: '大貓咪', rarity: 'SR', desc: '換一次貓咪咖啡廳約會', how: '長成大貓咪' },
  { id: 'boss', title: '貓老大', rarity: 'SSR', desc: '換一個貓咪造型的禮物', how: '長成貓老大' },
  { id: 'feed30', title: '罐罐達人', rarity: 'SR', desc: '換一頓宵夜', how: '餵罐罐累計 30 次' },
  { id: 'gacha', title: '稀有配件', rarity: 'SR', desc: '換一個小驚喜', how: '第一次扭到扭蛋限定配件' },
  { id: 'allacc', title: '全身行頭', rarity: 'SSR', desc: '換一次拍貼', how: '收集全部配件' },
  { id: 'bday', title: '小小黑週年', rarity: 'SR', desc: '換一個蛋糕一起吃', how: '小小黑來家裡滿一年（每年）' },
  // 小動物圖鑑的成就也收進小小黑系列
  { id: 'a-dex_1', ach: 'dex_1', title: '第一位朋友', rarity: 'R', desc: '換一杯手搖飲' },
  { id: 'a-dex_custom', ach: 'dex_custom', title: '幫牠們說話', rarity: 'R', desc: '換對方模仿一隻小動物說一句話' },
  { id: 'a-dex_5', ach: 'dex_5', title: '朋友越來越多', rarity: 'SR', desc: '換一次逛動物園或水族館' },
  { id: 'a-dex_full', ach: 'dex_full', title: '最懂牠的人', rarity: 'SR', desc: '換一個你最想要的小動物周邊' },
  { id: 'a-dex_scene3', ach: 'dex_scene3', title: '小劇場常客', rarity: 'SR', desc: '換一次一起演一段小劇場' },
  { id: 'a-dex_all', ach: 'dex_all', title: '大合照', rarity: 'SSR', desc: '換一張我們和小動物們的大合照' },
];
function petEarned() {
  const P = petState(), pet = P.pet || {}, got = new Set();
  const feeds = (pet.feeds || 0) + list('points').filter((x) => x.amt < 0 && /罐罐/.test(x.reason || '')).length;
  if ((pet.pats || 0) >= 1) got.add('pat');
  if (feeds >= 1) got.add('feed');
  if (feeds >= 30) got.add('feed30');
  if (P.st >= 1) got.add('teen');
  if (P.st >= 2) got.add('big');
  if (P.st >= 3) got.add('boss');
  const owned = pet.owned || [];
  if (PET_ACC.some((a) => a.gacha && owned.includes(a.id))) got.add('gacha');
  const ach = typeof computeAch === 'function' ? computeAch() : new Set();
  PET_DEFS.filter((d) => d.ach && ach.has(d.ach)).forEach((d) => got.add(d.id));
  if (PET_ACC.every((a) => a.month || (a.gacha || a.anniv ? owned.includes(a.id) : P.xp >= a.xp))) got.add('allacc');
  return got;
}
function petBdayKeys() {
  const born = S.couple.createdAt; if (!born) return [];
  const b = new Date(born), t = new Date(); t.setHours(0, 0, 0, 0);
  const out = [];
  for (let y = b.getFullYear() + 1; y <= t.getFullYear(); y++) if (t >= new Date(y, b.getMonth(), b.getDate())) out.push(y);
  return out.slice(-1);
}

let seriesBusy = false;
async function seriesDrops() {
  const ms = S.couple?.members || [];
  if (ms.length < 2 || seriesBusy) return;
  seriesBusy = true;
  try {
    for (const id of dateEarned()) { const t = DATE_DEFS.find((x) => x.id === id); await seriesDrop(`date-${id}`, t, '約會系列', 'date', ms, '約會系列掉了一張卡'); }
    for (const id of petEarned()) { const t = PET_DEFS.find((x) => x.id === id); await seriesDrop(`pet-${id}`, t, '小小黑系列', 'pet', ms, `${petState().name}送你們一張卡`); }
    if (S.d.trips && S.d.deposits && S.d.photos) await travelExtraDrops(countedTrips());
    for (const y of petBdayKeys()) await seriesDrop(`pet-bday-${y}`, PET_DEFS.find((x) => x.id === 'bday'), '小小黑系列', 'pet', ms, `${petState().name}來家裡滿 ${y - new Date(S.couple.createdAt).getFullYear()} 年了`);
  } finally { seriesBusy = false; }
}

// ---------- 收藏冊格子（還沒拿到的顯示拿法） ----------
Object.assign(SERIES_SLOTS, {
  '節日系列': () => {
    const role = prof(me()).role;
    const base = [
      { fest: 'queen', title: '壽星女王券', rarity: 'SSR', how: '生日', only: 'her' },
      { fest: 'king', title: '壽星國王券', rarity: 'SSR', how: '他的生日', only: 'him' },
      { fest: 'anniv', title: '週年紀念券', rarity: 'SSR', how: '交往紀念日' },
      { fest: 'valentine', title: '情人節限定券', rarity: 'SR', how: '2/14 情人節' },
      { fest: 'xmas', title: '聖誕交換券', rarity: 'SR', how: '12/25 聖誕節' },
      { fest: 'newyear', title: '新年第一張券', rarity: 'SR', how: '1/1 新年' },
      ...Object.values(HOLIDAY_MORE),
    ];
    return base.filter((x) => !x.only || x.only === role).map((x) => ({ ...x, match: (c) => festKey(c) === x.fest }));
  },
  '旅行系列': () => [
    ...Object.entries(D.TRAVEL_DROPS).map(([k, t]) => ({ title: t.title, rarity: t.rarity, how: { fund25: '旅行基金存到 25%', fund50: '旅行基金存到 50%', fund75: '旅行基金存到 75%', trip1: '記下第一個足跡', trip5: '足跡滿 5 站', trip10: '足跡滿 10 站', abroad: '第一次一起出國', revisit: '去過的地方滿一年那天' }[k] || '' })),
    { title: D.TRAVEL_CARD.title, rarity: D.TRAVEL_CARD.rarity, how: '旅行基金存滿' },
    ...Object.values(TRAVEL_MORE),
  ].map((x) => (x.title === D.TRAVEL_DROPS.revisit?.title ? { ...x, match: (c) => c.title === x.title || /舊地重遊/.test(c.title) } : x)),
  '約會系列': () => DATE_DEFS,
  '成就系列': () => D.ACHIEVEMENTS.filter((a) => a.tier === 'g').map((a) => ({ title: `${a.name}紀念券`, rarity: 'SR' })),
  '小小黑系列': () => PET_DEFS,
});

// ---------- 兌換時：對方跳出大卡片 ----------
function redeemPopup() {
  if (!S.d.events || !S.d.cards || document.querySelector('.redeem-pop')) return;
  const key = `park-redeem-pop-${S.cid}-${me()}`;
  const evs = list('events').filter((e) => e.to === me() && e.type === 'redeem' && e.cardId);
  let seen = null; try { seen = JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) {}
  if (!seen) { localStorage.setItem(key, JSON.stringify(evs.map((e) => e.id))); return; }
  const e = evs.filter((x) => !seen.includes(x.id) && !x.read).sort((a, b) => a.at - b.at)[0];
  if (!e) return;
  seen.push(e.id); localStorage.setItem(key, JSON.stringify(seen.slice(-300)));
  const c = list('cards').find((x) => x.id === e.cardId);
  const m = openModal(`<div class="redeem-pop">
      <div class="rp-head"><span class="rp-who">${esc(nick(e.by))}</span> 要兌換這張！</div>
      ${c ? bigCardHTML(c).replace(/<p class="center small muted"[\s\S]*?<\/p>\s*$/, '') : `<div class="rp-title">${esc(e.detail)}</div>`}
      <button class="btn block" id="rp-ok">收到，馬上來</button>
    </div>`, { center: true, cls: 'redeem-pop-back' });
  if (c && typeof attachCardFX === 'function') attachCardFX(m);
  sfx('chime'); confetti(c && (c.rarity === 'SSR' || c.rarity === 'SR') ? 90 : 45);
  $('#rp-ok', m).onclick = async () => { closeModal(m); await col('events').update(e.id, { read: true }); setTimeout(redeemPopup, 400); };
}

// ---------- 小小黑系列、想你系列：每張卡自己的圖 ----------
const nestSVG = (svg, x, y, w, h, flip = false) => {
  const inner = svg.replace('<svg ', `<svg x="${flip ? -w / 2 : x}" y="${y}" width="${w}" height="${h}" `);
  return flip ? `<g transform="translate(${x + w / 2} 0) scale(-1 1)">${inner}</g>` : inner;
};
function petCardArt(title) {
  const soft = '<circle r="41" fill="#f6efe9"/><circle r="41" class="e-acc-s" stroke-width="1.2" fill="none" opacity=".6"/>';
  const can = (x, y) => `<g transform="translate(${x} ${y})"><rect x="-7" y="-6" width="14" height="9" rx="1.5" fill="#e8b04b" stroke="#7a5420" stroke-width=".8"/><ellipse cy="-6" rx="7" ry="2" fill="#f3d48a" stroke="#7a5420" stroke-width=".8"/><path d="M-4 -1 H4" stroke="#7a5420" stroke-width=".8"/></g>`;
  const heart = (x, y, s = 1, fill = '#e2445f') => `<path transform="translate(${x} ${y}) scale(${s})" d="M0 5 C-1.5 3.5 -6 .5 -6 -2.5 C-6 -4.8 -4.2 -6 -2.5 -6 C-1.2 -6 -.5 -5.2 0 -4.2 C.5 -5.2 1.2 -6 2.5 -6 C4.2 -6 6 -4.8 6 -2.5 C6 .5 1.5 3.5 0 5 Z" fill="${fill}"/>`;
  const cat = (pose, wear) => nestSVG(catPose(pose, wear), -36, -38, 72, 66);
  const pet = (st, wear) => nestSVG(petSVG(st, 'happy', wear, { blink: false }), -36, -38, 72, 66);
  const fr = (k, x, y, w, h, flip) => nestSVG(friendArt(k), x, y, w, h, flip);
  const M = {
    初次見面: () => cat('wave') + heart(24, -24, 1),
    第一個罐罐: () => cat('sit') + can(24, 22),
    少年貓: () => pet(1, ''),
    大貓咪: () => pet(2, 'scarf'),
    貓老大: () => pet(3, 'crown'),
    罐罐達人: () => cat('belly') + can(-26, 22) + can(26, 22),
    稀有配件: () => cat('sit', 'glasses') + '<path d="M24 -26 l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2 l5 -2 z" fill="#f5c843"/>',
    全身行頭: () => cat('jump', 'cape'),
    小小黑週年: () => cat('sit', 'ribbon') + heart(-26, -22, .9) + heart(26, -22, .9),
    第一位朋友: () => fr('black', -40, -14, 42, 38) + fr('calico', -2, -14, 42, 38, true) + heart(0, -22, .9),
    幫牠們說話: () => fr('haohao', -38, -6, 66, 50) + '<path d="M8 -34 h26 a5 5 0 0 1 5 5 v10 a5 5 0 0 1 -5 5 h-16 l-6 6 v-6 h-4 a5 5 0 0 1 -5 -5 v-10 a5 5 0 0 1 5 -5 z" class="e-bg e-ink-s" stroke-width="1.2"/><circle cx="16" cy="-24" r="1.6" class="e-ink-f"/><circle cx="22" cy="-24" r="1.6" class="e-ink-f"/><circle cx="28" cy="-24" r="1.6" class="e-ink-f"/>',
    朋友越來越多: () => fr('doggy', -40, -12, 42, 40) + fr('abian', -2, -12, 42, 40, true) + fr('orange', -18, -40, 36, 32),
    最懂牠的人: () => fr('haohao', -36, -12, 72, 54) + heart(20, -26, 1.3),
    小劇場常客: () => fr('tuxedo', -40, -14, 42, 38) + fr('white', -2, -14, 42, 38, true) + '<path d="M-38 -36 Q-20 -26 0 -34 Q20 -26 38 -36" class="e-acc-s" stroke-width="2" fill="none"/>',
    大合照: () => fr('haohao', -40, -26, 46, 36) + fr('gungun', 2, -26, 40, 32, true) + fr('black', -36, 4, 26, 24) + fr('orange', -12, 4, 26, 24) + fr('white', 12, 4, 26, 24, true),
    全劇終: () => '<path d="M-38 -36 Q-30 0 -36 30 L-24 30 Q-20 0 -14 -36 Z M38 -36 Q30 0 36 30 L24 30 Q20 0 14 -36 Z" class="e-acc-f e-ink-s" stroke-width="1"/>' + fr('shark', -22, -14, 44, 28) + '<text y="26" text-anchor="middle" font-size="8" font-weight="800" letter-spacing="2" fill="#3a2a3a">FIN</text>',
  };
  return M[title] ? soft + M[title]() : '';
}
function missCardArt(title) {
  const S1 = (d, w = 1.5, cls = 'e-ink-s') => `<path d="${d}" class="${cls}" stroke-width="${w}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  const H = (x, y, s, cls = 'e-acc-f e-ink-s', sw = 1.2) => `<path transform="translate(${x} ${y}) scale(${s})" d="M0 10 C-3 7 -12 1 -12 -5 C-12 -9.5 -8.5 -12 -5 -12 C-2.5 -12 -1 -10.5 0 -8.5 C1 -10.5 2.5 -12 5 -12 C8.5 -12 12 -9.5 12 -5 C12 1 3 7 0 10 Z" class="${cls}" stroke-width="${sw / s}"/>`;
  const T = (t, y, fs = 13) => `<text y="${y}" text-anchor="middle" font-size="${fs}" font-weight="900" font-family="serif" class="e-ink-f">${t}</text>`;
  const cal = (dots) => `<rect x="-26" y="-22" width="52" height="46" rx="5" class="e-bg e-ink-s" stroke-width="1.5"/><rect x="-26" y="-22" width="52" height="11" rx="5" class="e-acc-f"/>${S1('M-16 -28 V-17 M16 -28 V-17', 2.2)}${dots}`;
  const M = {
    想你一百次: () => H(0, -2, 2.6, 'e-bg e-ink-s', 1.8) + T('100', 4, 15),
    '520 我愛你': () => H(0, -2, 2.6, 'e-acc-f e-ink-s', 1.8) + T('520', 4, 15),
    一生一世: () => `<circle cx="-9" cy="-6" r="15" class="e-ink-s" stroke-width="2.4" fill="none"/><circle cx="9" cy="-6" r="15" class="e-acc-s" stroke-width="2.4" fill="none"/>${T('1314', 28, 11)}`,
    心有靈犀: () => H(-10, -4, 1.4) + H(12, 0, 1.4, 'e-bg e-ink-s') + S1('M-28 22 Q0 34 28 22', 1, 'e-acc-s') + '<path d="M0 -30 l2 6 l6 2 l-6 2 l-2 6 l-2 -6 l-6 -2 l6 -2 z" class="e-ink-f"/>',
    一週都想你: () => cal(Array.from({ length: 7 }, (_, i) => H(-18 + i * 6, 6, .32)).join('')),
    一個月都想你: () => cal(Array.from({ length: 30 }, (_, i) => `<circle cx="${-20 + (i % 6) * 8}" cy="${-4 + Math.floor(i / 6) * 6}" r="1.6" class="e-ink-f"/>`).join('') + H(18, 18, .55)),
    百日相思: () => Array.from({ length: 12 }, (_, i) => { const a = i * 30 * Math.PI / 180; return i === 6 ? '' : H(Math.sin(a) * 30, -Math.cos(a) * 30, .38); }).join('') + H(0, -2, 1.5) + T('100', 34, 8),
    第一次想你: () => S1('M0 30 V-4', 2) + H(-9, -10, .9) + `<path d="M0 6 Q12 -2 18 6 Q10 12 0 6 Z" class="e-acc-f e-ink-s" stroke-width="1"/>` + S1('M-16 30 H16', 1.4),
    失眠想你: () => `<path d="M6 -28 A26 26 0 1 0 28 8 A20 20 0 1 1 6 -28 Z" class="e-acc-f e-ink-s" stroke-width="1.5"/>` + H(6, 4, .9, 'e-bg e-ink-s') + '<path d="M-26 -22 l1.5 4 l4 1.5 l-4 1.5 l-1.5 4 l-1.5 -4 l-4 -1.5 l4 -1.5 z M24 -26 l1 3 l3 1 l-3 1 l-1 3 l-1 -3 l-3 -1 l3 -1 z" class="e-ink-f"/>' + `<text x="18" y="-6" font-size="7" font-weight="800" class="e-ink-f">Z z</text>`,
    壽星最想的人: () => `<rect x="-24" y="2" width="48" height="24" rx="4" class="e-bg e-ink-s" stroke-width="1.5"/><rect x="-28" y="24" width="56" height="5" rx="2.5" class="e-ink-f"/>${S1('M-24 12 Q-12 18 0 12 Q12 6 24 12', 1.2, 'e-acc-s')}${S1('M0 2 V-10', 2)}` + H(0, -20, .75),
    想來想去: () => H(0, 0, 1.3) + S1('M-26 -10 A28 28 0 0 1 22 -18', 1.8) + '<path d="M22 -18 l-7 -1 l4 6 z" class="e-ink-f"/>' + S1('M26 10 A28 28 0 0 1 -22 18', 1.8) + '<path d="M-22 18 l7 1 l-4 -6 z" class="e-ink-f"/>',
    撐傘券: () => `<path d="M-30 -6 A30 30 0 0 1 30 -6 Q22 -12 15 -6 Q8 -12 0 -6 Q-8 -12 -15 -6 Q-22 -12 -30 -6 Z" class="e-acc-f e-ink-s" stroke-width="1.5"/>${S1('M0 -6 V20 Q0 25 -5 25', 1.8)}` + H(12, 14, .7) + S1('M-30 6 l-3 6 M-22 14 l-3 6 M30 8 l-3 6', 1.2, 'e-acc-s'),
    早安想你: () => H(0, -4, 1.4) + Array.from({ length: 9 }, (_, i) => { const a = (-80 + i * 20) * Math.PI / 180; return S1(`M${(Math.sin(a) * 22).toFixed(1)} ${(-4 - Math.cos(a) * 22).toFixed(1)} L${(Math.sin(a) * 30).toFixed(1)} ${(-4 - Math.cos(a) * 30).toFixed(1)}`, 1.6); }).join('') + S1('M-34 22 H34', 1.6) + S1('M-24 28 H24', 1, 'e-acc-s'),
    週年想你: () => H(0, -4, 1.5) + Array.from({ length: 7 }, (_, i) => { const a = (200 + i * 22) * Math.PI / 180, b = (-20 - i * 22) * Math.PI / 180; return `<ellipse cx="${(Math.cos(a) * 28).toFixed(1)}" cy="${(-Math.sin(a) * 28).toFixed(1)}" rx="5" ry="2.4" transform="rotate(${(i * 22 - 60).toFixed(0)} ${(Math.cos(a) * 28).toFixed(1)} ${(-Math.sin(a) * 28).toFixed(1)})" class="e-acc-f e-ink-s" stroke-width=".6"/><ellipse cx="${(Math.cos(b) * 28).toFixed(1)}" cy="${(-Math.sin(b) * 28).toFixed(1)}" rx="5" ry="2.4" transform="rotate(${(-i * 22 + 60).toFixed(0)} ${(Math.cos(b) * 28).toFixed(1)} ${(-Math.sin(b) * 28).toFixed(1)})" class="e-acc-f e-ink-s" stroke-width=".6"/>`; }).join(''),
  };
  return M[title] ? M[title]() : '';
}
{
  const _fm = festMotif;
  festMotif = function (key, c) {
    if (key === 'pet' && c && c.title) { const a = petCardArt(c.title); if (a) return a; }
    if (key === 'miss' && c && c.title) { const a = missCardArt(c.title); if (a) return a; }
    if (key === 'travel' && c && c.fundDone) return fundDoneArt();
    return _fm(key, c);
  };
}

// 旅行基金存滿的卡：郵票＋飛行航線＋郵戳
function fundDoneArt() {
  const perf = [];
  for (let x = -22; x <= 22; x += 5.5) { perf.push([x, -30], [x, 12]); }
  for (let y = -24.5; y <= 7; y += 5.5) { perf.push([-24, y], [24, y]); }
  return `<g transform="rotate(-6 0 -9)">
      <rect x="-24" y="-30" width="48" height="42" class="e-bg e-ink-s" stroke-width="1.2"/>
      ${perf.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.7" class="e-bg"/>`).join('')}
      <rect x="-18.5" y="-24.5" width="37" height="31" class="e-ink-s" stroke-width="1" fill="none"/>
      <circle cx="9" cy="-15" r="4.2" class="e-acc-f"/>
      <path d="M-18.5 6.5 L-8 -8 L-2 -1 L5 -11 L18.5 6.5 Z" class="e-acc-f e-ink-s" stroke-width="1" stroke-linejoin="round" opacity=".9"/>
      <path d="M-15 -19 h8 M-15 -16 h5" class="e-ink-s" stroke-width=".9" stroke-linecap="round"/>
    </g>
    <path d="M-2 36 Q26 36 30 12 Q32 -6 30 -24" fill="none" class="e-ink-s" stroke-width="1.3" stroke-dasharray="3 3.2" stroke-linecap="round"/>
    <circle cx="-2" cy="36" r="2.2" class="e-ink-f"/>
    <g transform="translate(30 -31) rotate(-4)"><path d="M0 -7 L1.6 -2 L7 1 L7 3 L1.6 1.6 L1 6 L3 7.6 L3 9 L0 8 L-3 9 L-3 7.6 L-1 6 L-1.6 1.6 L-7 3 L-7 1 L-1.6 -2 Z" class="e-acc-f e-ink-s" stroke-width=".9" stroke-linejoin="round"/></g>
    <g transform="translate(-20 20) rotate(-14)" opacity=".9">
      <circle r="12" class="e-bg e-ink-s" stroke-width="1.2"/><circle r="9" class="e-ink-s" stroke-width=".7" fill="none"/>
      <path d="M-5 -1.5 h10 M-5 1.5 h10" class="e-ink-s" stroke-width=".9"/>
      <path d="M-12 -5 q-5 -3 -10 0 t-10 0 M-12 0 q-5 -3 -10 0 t-10 0 M-12 5 q-5 -3 -10 0 t-10 0" class="e-ink-s" stroke-width=".8" fill="none"/>
    </g>`;
}
