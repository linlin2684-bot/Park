// ============================================================
//  小小黑的裝扮：服裝（睡衣、小天使、小幽靈、小廚師）＋季節（春夏秋冬）
//  解鎖後自己選，沒解鎖顯示「？」
// ============================================================
const PET_LOOKS = [
  { id: 'pajama', name: '睡衣', hint: '晚上常常來陪牠' },
  { id: 'angel', name: '小天使', hint: '一起把心裡話說完' },
  { id: 'ghost', name: '小幽靈', hint: '某個不給糖就搗蛋的夜晚' },
  { id: 'chef', name: '小廚師', hint: '一起吃遍想吃的' },
  { id: 'spring', name: '春天', hint: '等春天來' },
  { id: 'summer', name: '夏天', hint: '等夏天來' },
  { id: 'autumn', name: '秋天', hint: '等秋天來' },
  { id: 'winter', name: '冬天', hint: '等冬天來' },
  // 11/24 多設計 8 套
  { id: 'sailor', name: '水手服', hint: '一起去過三個地方' },
  { id: 'raincoat', name: '小雨衣', hint: '下雨天有人陪牠' },
  { id: 'hoodie', name: '帽T', hint: '連續七天都有人想你' },
  { id: 'suit', name: '小西裝', hint: '一起赴約十次' },
  { id: 'detective', name: '小偵探', hint: '找到十張藏起來的紙條' },
  { id: 'party', name: '壽星派對', hint: '某個人的生日' },
  { id: 'xmas', name: '聖誕毛衣', hint: '某個下雪的節日' },
  { id: 'valentine', name: '愛心毛衣', hint: '某個甜甜的節日' },
];
const seasonNow = (d = new Date()) => ['winter', 'winter', 'spring', 'spring', 'spring', 'summer', 'summer', 'summer', 'autumn', 'autumn', 'autumn', 'winter'][d.getMonth()];
function lookUnlocked() {
  const pet = S.couple?.pet || {}, got = new Set(Object.keys(pet.looks || {}));
  // 睡衣：連續 7 天，晚上 9 點後都有人摸牠
  const nights = Object.keys(pet.nights || {}).sort();
  let run = 0, best = 0, prev = null;
  nights.forEach((d) => { run = prev && (parseD(d) - parseD(prev)) / 86400000 === 1 ? run + 1 : 1; best = Math.max(best, run); prev = d; });
  if (best >= 7) got.add('pajama');
  if (list('points').some((x) => /^季問答完成/.test(x.reason || ''))) got.add('angel');
  if (list('watch').filter((w) => w.kind === 'food' && w.done).length >= 10) got.add('chef');
  if (list('trips').length >= 3) got.add('sailor');
  if (list('dates').filter((d) => d.done).length >= 10) got.add('suit');
  if (list('notes').filter((n) => n.found).length >= 10) got.add('detective');
  const md = [...new Set(list('misses').map((x) => dkey(new Date(x.at))))].sort();
  let r2 = 0, b2 = 0, p2 = null;
  md.forEach((d) => { r2 = p2 && (parseD(d) - parseD(p2)) / 86400000 === 1 ? r2 + 1 : 1; b2 = Math.max(b2, r2); p2 = d; });
  if (b2 >= 7) got.add('hoodie');
  return got;
}
// 打開 App 時：記下今天的季節、萬聖節；新解鎖的跳通知
async function lookTick() {
  if (!S.couple || (S.couple.members || []).length < 2 || !S.d.points || !S.d.watch) return;
  const pet = S.couple.pet || {}, looks = pet.looks || {}, up = {};
  const sn = seasonNow(); if (!looks[sn]) up[`pet.looks.${sn}`] = true;
  const md = dkey().slice(5); if (md === '10-31' && !looks.ghost) up['pet.looks.ghost'] = true;
  const fn = typeof festNow === 'function' ? festNow() : '';
  const FL = { bday: 'party', xmas: 'xmas', valentine: 'valentine' }[fn];
  if (FL && !looks[FL] && !localStorage.getItem('park-fest-preview')) up[`pet.looks.${FL}`] = true;
  if (Object.keys(up).length) await S.store.updateCouple(S.cid, up);
  const key = `park-looks-seen-${S.cid}-${me()}`;
  let seen = null; try { seen = JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) {}
  const now1 = [...lookUnlocked()];
  if (!seen) { localStorage.setItem(key, JSON.stringify(now1)); return; }
  const fresh = now1.filter((x) => !seen.includes(x));
  if (fresh.length) {
    localStorage.setItem(key, JSON.stringify(now1));
    const n = PET_LOOKS.find((l) => l.id === fresh[0]);
    setTimeout(() => toast(`${petState().name}解鎖了新裝扮：${n ? n.name : ''}`), 1200);
  }
}
// 晚上摸牠，記一筆
function lookNightPat() {
  if (typeof myMoodRain === 'function' && myMoodRain() && !((S.couple.pet || {}).looks || {}).raincoat) S.store.updateCouple(S.cid, { 'pet.looks.raincoat': true });
  const h = new Date().getHours();
  if (h >= 21 || h < 3) {
    const d = new Date(); if (h < 3) d.setDate(d.getDate() - 1);
    S.store.updateCouple(S.cid, { [`pet.nights.${dkey(d)}`]: true });
  }
}
// 畫在小小黑身上（坐姿 petSVG 的座標）
// 11/25 重畫：衣服分層（背後／身上／脖子／頭上／特效），身上的衣服用身體輪廓裁切，貼合身形；腳掌露在衣服前面
const LOOK_BODY = 'M34 86 Q29 62 39 50 Q50 43 61 50 Q71 62 66 86 Z';
const lkTorso = (top, fill, extra = '') => `<rect x="20" y="${top}" width="60" height="40" fill="${fill}"/>${extra}`;
const lkHood = (fill, rim) => `<path d="M27 40 Q24 12 50 10 Q76 12 73 40 Q72 54 62 56 L38 56 Q28 54 27 40 Z" fill="${fill}"/><path d="M30 40 Q28 16 50 14 Q72 16 70 40" fill="none" stroke="${rim}" stroke-width="1.2"/>`;
function lookParts(id) {
  const P = { back: '', torso: '', neck: '', head: '', fx: '', top: '' };
  if (id === 'pajama') {
    P.torso = lkTorso(55, '#9fb8e8', `${[62, 69, 76, 83].map((y) => `<path d="M20 ${y} H80" stroke="#c8d6f3" stroke-width="2.2"/>`).join('')}<path d="M50 55 V88" stroke="#7f9bd6" stroke-width="1"/>${[63, 71, 79].map((y) => `<circle cx="52.5" cy="${y}" r="1.1" fill="#fff"/>`).join('')}`);
    P.neck = '<path d="M39 53 Q50 60 61 53 L58 58 Q50 62 42 58 Z" fill="#c8d6f3"/>';
    P.head = '<g transform="translate(0 4)"><path d="M33 21 Q42 5 61 10 Q73 15 76 31 Q67 23 57 21 Z" fill="#9fb8e8"/><path d="M33 21 Q49 16 60 22" stroke="#fff" stroke-width="2.6" fill="none" stroke-linecap="round"/><circle cx="77" cy="32" r="3.4" fill="#fff"/></g>';
  } else if (id === 'angel') {
    P.back = '<g fill="#fffaf0" stroke="#e8dcc6" stroke-width=".8"><path d="M38 60 Q20 44 12 56 Q16 58 16 62 Q11 64 15 69 Q20 69 20 73 Q28 74 37 68 Z"/><path d="M62 60 Q80 44 88 56 Q84 58 84 62 Q89 64 85 69 Q80 69 80 73 Q72 74 63 68 Z"/></g><path d="M18 60 Q26 60 34 64 M82 60 Q74 60 66 64" stroke="#e8dcc6" stroke-width=".8" fill="none"/>';
    P.top = '<ellipse cx="50" cy="9" rx="11" ry="3.2" fill="none" stroke="#f5c843" stroke-width="2.4"/><ellipse cx="50" cy="9" rx="11" ry="3.2" fill="none" stroke="#fff3c4" stroke-width=".8"/>';
  } else if (id === 'ghost') {
    P.top = '<path d="M30 82 L30 46 Q30 22 50 20 Q70 22 70 46 L70 82 L64 77 L58 82 L52 77 L46 82 L40 77 L34 82 Z" fill="#f6f2f8" opacity=".95" stroke="#d9cfe0" stroke-width=".8"/><ellipse cx="44" cy="38" rx="3" ry="4" fill="#2b2633"/><ellipse cx="56" cy="38" rx="3" ry="4" fill="#2b2633"/><ellipse cx="50" cy="48" rx="2.4" ry="2" fill="#2b2633"/>';
  } else if (id === 'chef') {
    P.torso = lkTorso(54, '#fffaf0', `<path d="M50 54 V88" stroke="#e1d6c4" stroke-width="1"/>${[62, 70, 78].map((y) => `<circle cx="45" cy="${y}" r="1.2" fill="#c9bda8"/><circle cx="55" cy="${y}" r="1.2" fill="#c9bda8"/>`).join('')}`);
    P.neck = '<path d="M41 53 Q50 58 59 53 L56 60 L50 57 L44 60 Z" fill="#e2445f"/>';
    P.head = '<g transform="translate(0 6)"><rect x="39" y="12" width="22" height="9" rx="2" fill="#fffaf0" stroke="#e1d6c4" stroke-width=".8"/><circle cx="42" cy="8" r="6.4" fill="#fffaf0"/><circle cx="50" cy="4.5" r="7.4" fill="#fffaf0"/><circle cx="58" cy="8" r="6.4" fill="#fffaf0"/><path d="M42 14 V19 M50 14 V19 M58 14 V19" stroke="#ece3d3" stroke-width=".8"/></g>';
  } else if (id === 'spring') {
    P.head = `<g transform="translate(0 4)">${[[38, 18, '#f7b6c8'], [44, 14, '#fff3c4'], [50, 13, '#f7b6c8'], [56, 14, '#c9e8d8'], [62, 18, '#f7b6c8']].map(([x, y, c]) => `<g transform="translate(${x} ${y})">${[0, 72, 144, 216, 288].map((a) => `<ellipse cx="0" cy="-2.4" rx="1.7" ry="2.6" fill="${c}" transform="rotate(${a})"/>`).join('')}<circle r="1.2" fill="#f5c843"/></g>`).join('')}</g>`;
    P.fx = '<path d="M14 30 q2 -2 4 0 M84 44 q2 -2 4 0" stroke="#f7b6c8" stroke-width="2" stroke-linecap="round" fill="none"/>';
  } else if (id === 'summer') {
    P.head = '<g transform="translate(0 4)"><path d="M28 25 Q50 9 72 25 L67 27 Q50 17 33 27 Z" fill="#f2d48a"/><path d="M34 24 Q50 15 66 24" stroke="#e98a6a" stroke-width="2.2" fill="none"/></g>';
    P.fx = '<g transform="translate(80 80) rotate(-12)"><path d="M-12 0 A12 12 0 0 0 12 0 Z" fill="#5fae6f"/><path d="M-10 0 A10 10 0 0 0 10 0 Z" fill="#f2f2e8"/><path d="M-9 0 A9 9 0 0 0 9 0 Z" fill="#ef5f6c"/><circle cx="-3" cy="3" r=".9" fill="#2b2633"/><circle cx="2" cy="5" r=".9" fill="#2b2633"/><circle cx="5" cy="2" r=".9" fill="#2b2633"/></g>';
  } else if (id === 'autumn') {
    P.fx = [[18, 70, '#e98a3a', -20], [82, 58, '#c9532f', 30], [22, 84, '#e8b04b', 50], [86, 84, '#e98a3a', -40]].map(([x, y, c, r]) => `<path transform="translate(${x} ${y}) rotate(${r})" d="M0 -6 L1.6 -2 L5 -3 L3 1 L5 3 L1 3 L0 6 L-1 3 L-5 3 L-3 1 L-5 -3 L-1.6 -2 Z" fill="${c}"/>`).join('');
    P.head = '<path transform="translate(60 18) rotate(20)" d="M0 -5 L1.4 -1.6 L4.4 -2.6 L2.6 1 L4.4 2.6 L.8 2.6 L0 5 L-.8 2.6 L-4.4 2.6 L-2.6 1 L-4.4 -2.6 L-1.4 -1.6 Z" fill="#e98a3a"/>';
  } else if (id === 'winter') {
    P.neck = '<path d="M35 52 Q50 60 65 52 L66 58 Q50 66 34 58 Z" fill="#d9434f"/><path d="M56 58 L60 75 L54.5 75 L52 60 Z" fill="#d9434f"/><path d="M37 55.5 H63 M55 67 H59" stroke="#fbf7f0" stroke-width="1.4" stroke-dasharray="2 2"/><path d="M54.5 75 l1 2.5 M56.5 75 l.5 2.5 M58.5 75 l0 2.5" stroke="#d9434f" stroke-width="1"/>';
    P.head = '<g transform="translate(0 4)"><path d="M31 28 Q50 6 69 28" stroke="#d9434f" stroke-width="2.2" fill="none"/><circle cx="31" cy="31" r="5.4" fill="#fbf7f0" stroke="#e6dccb" stroke-width=".8"/><circle cx="69" cy="31" r="5.4" fill="#fbf7f0" stroke="#e6dccb" stroke-width=".8"/></g>';
  } else if (id === 'sailor') {
    P.torso = lkTorso(54, '#f7f7fb', '<path d="M20 82 H80" stroke="#2f4a8a" stroke-width="2.4"/><path d="M20 85.5 H80" stroke="#2f4a8a" stroke-width="1"/>');
    P.neck = '<path d="M37 52 Q50 58 63 52 L62 63 L50 72 L38 63 Z" fill="#2f4a8a"/><path d="M39.5 54.5 L40 62 L50 69.5 L60 62 L60.5 54.5" fill="none" stroke="#fff" stroke-width="1"/><path d="M50 66 L45.5 75 L50 72.5 L54.5 75 Z" fill="#d9434f"/><circle cx="50" cy="66.5" r="1.6" fill="#b8303b"/>';
    P.head = '<g transform="translate(0 4)"><path d="M37 21 Q37 11 50 10 Q63 11 63 21 Z" fill="#f7f7fb" stroke="#dcdce8" stroke-width=".8"/><rect x="36" y="19" width="28" height="4.4" rx="2" fill="#2f4a8a"/><path d="M63 21 l6 4 M63 22 l4 6" stroke="#2f4a8a" stroke-width="1.6" stroke-linecap="round"/></g>';
  } else if (id === 'raincoat') {
    P.back = `<g transform="translate(0 4)">${lkHood('#f5c843', '#e0aa2c')}</g>`;
    P.torso = lkTorso(53, '#f5c843', '<path d="M50 53 V88" stroke="#d9a22c" stroke-width="1.2"/>' + [62, 70, 78].map((y) => `<rect x="47.6" y="${y - 1}" width="4.8" height="2" rx="1" fill="#d9a22c"/>`).join('') + '<path d="M36 76 h8 M56 76 h8" stroke="#d9a22c" stroke-width="1"/>');
    P.neck = '<path d="M39 52 Q50 59 61 52 L60 57 Q50 62 40 57 Z" fill="#e8b630"/>';
    P.fx = [[16, 30], [86, 22], [12, 56], [88, 48], [20, 76]].map(([x, y]) => `<path d="M${x} ${y} q-2.2 4.4 0 5.4 q2.2 -1 0 -5.4 Z" fill="#9fd0ff"/>`).join('');
  } else if (id === 'hoodie') {
    P.back = '<path d="M32 56 Q50 46 68 56 Q66 62 50 62 Q34 62 32 56 Z" fill="#a592d8"/>';
    P.torso = lkTorso(53, '#b9a7e6', '<path d="M38 73 Q50 70 62 73 L60 83 L40 83 Z" fill="#a592d8"/><path d="M20 85 H80" stroke="#a592d8" stroke-width="3"/>');
    P.neck = '<path d="M45.5 55 L44.5 65 M54.5 55 L55.5 65" stroke="#fff" stroke-width="1.2" stroke-linecap="round"/><circle cx="44.5" cy="66" r="1.3" fill="#fff"/><circle cx="55.5" cy="66" r="1.3" fill="#fff"/>';
  } else if (id === 'suit') {
    P.torso = lkTorso(53, '#4a4f63', '<path d="M42 53 L50 73 L58 53 Z" fill="#fbf7f0"/><path d="M50 60 V73" stroke="#e2ddd2" stroke-width=".8"/><path d="M41 53 L48 71 L44 73 L37 58 Z M59 53 L52 71 L56 73 L63 58 Z" fill="#3a3e50"/><circle cx="50" cy="79" r="1.2" fill="#c9c4b8"/><path d="M59 64 h5" stroke="#fbf7f0" stroke-width="1.3"/><path d="M60.5 64 l1 -2 1 2" fill="#d9434f"/>');
    P.neck = '<path d="M50 56 L45.5 53 L45.5 59 Z M50 56 L54.5 53 L54.5 59 Z" fill="#d9434f"/><circle cx="50" cy="56" r="1.4" fill="#a8303b"/>';
  } else if (id === 'detective') {
    P.torso = lkTorso(53, '#b08a5a', '<path d="M20 74 H80" stroke="#7a5a36" stroke-width="3.4"/><rect x="47" y="72" width="6" height="4" rx="1" fill="none" stroke="#e9c77b" stroke-width="1"/><path d="M50 76 V88" stroke="#9a764a" stroke-width="1"/>' + [80, 85].map((y) => `<circle cx="46" cy="${y}" r="1.1" fill="#6b4f30"/><circle cx="54" cy="${y}" r="1.1" fill="#6b4f30"/>`).join(''));
    P.neck = '<path d="M36 52 Q50 60 64 52 L62 61 L50 66 L38 61 Z" fill="#9a764a"/><path d="M50 58 L50 66" stroke="#7a5a36" stroke-width=".8"/>';
    P.head = '<g transform="translate(0 4)"><path d="M35 21 Q36 8 50 8 Q64 8 65 21 Z" fill="#b08a5a"/><path d="M36 15 Q50 13 64 15" stroke="#7a5a36" stroke-width="2.2" fill="none"/><path d="M30 22 Q50 17 70 22 L69 25 Q50 21 31 25 Z" fill="#9a764a"/></g>';
    P.fx = '<g transform="translate(81 76) rotate(30)"><circle r="6" fill="#dff1ff" fill-opacity=".65" stroke="#6b4f30" stroke-width="2"/><path d="M-2.5 -2.5 Q-1 -4 1 -3.5" stroke="#fff" stroke-width="1" fill="none"/><path d="M0 6 V15" stroke="#6b4f30" stroke-width="2.6" stroke-linecap="round"/></g>';
  } else if (id === 'party') {
    P.neck = '<path d="M35 53 L39 50 L42 55 L46 51 L50 56 L54 51 L58 55 L61 50 L65 53 L63 59 Q50 64 37 59 Z" fill="#fff3c4" stroke="#e8b04b" stroke-width=".8"/>' + [42, 50, 58].map((x) => `<circle cx="${x}" cy="58.5" r="1.1" fill="#ff8fab"/>`).join('');
    P.head = '<g transform="translate(0 6) rotate(-10 52 16)"><path d="M43 20 L52 -2 L61 20 Z" fill="#ff8fab"/><path d="M45.5 14 L58.5 14 M48 8 L56 8" stroke="#fff" stroke-width="2"/><circle cx="52" cy="-3" r="2.8" fill="#ffd45c"/></g>';
    P.fx = [[18, 28, '#ff8fab'], [84, 30, '#9fd0ff'], [14, 60, '#ffd45c'], [86, 62, '#b9a7e6'], [24, 46, '#7cc7a8'], [80, 46, '#ff8fab']].map(([x, y, c], i) => `<rect x="${x}" y="${y}" width="3.4" height="1.8" rx=".6" fill="${c}" transform="rotate(${i * 37} ${x} ${y})"/>`).join('');
  } else if (id === 'xmas') {
    P.torso = lkTorso(53, '#c8303f', '<path d="M20 84.5 H80" stroke="#2f7a4f" stroke-width="3.4"/><path d="M20 69 H80" stroke="#fbf7f0" stroke-width="1.3" stroke-dasharray="1.6 2.6"/>' + [42, 50, 58].map((x) => `<g transform="translate(${x} 76.5)"><path d="M0 -3.2 V3.2 M-2.8 -1.6 L2.8 1.6 M-2.8 1.6 L2.8 -1.6" stroke="#fbf7f0" stroke-width=".9" stroke-linecap="round"/></g>`).join('') + [38, 46, 54, 62].map((x) => `<path d="M${x} 63 l2 -2.4 2 2.4" stroke="#fbf7f0" stroke-width=".9" fill="none"/>`).join(''));
    P.neck = '<path d="M38 53 Q50 60 62 53" fill="none" stroke="#2f7a4f" stroke-width="3.4" stroke-linecap="round"/>';
  } else if (id === 'valentine') {
    P.torso = lkTorso(53, '#f7b6c8', '<path d="M20 84.5 H80" stroke="#e98aa6" stroke-width="3.4"/><path d="M50 79 C44.5 74.5 41 71.5 43 67.8 C44.4 65.4 47.6 65.4 50 68.6 C52.4 65.4 55.6 65.4 57 67.8 C59 71.5 55.5 74.5 50 79 Z" fill="#e2445f"/><path d="M37 62 l1 -1.2 1 1.2 M61 62 l1 -1.2 1 1.2 M38 76 l1 -1.2 1 1.2 M60 76 l1 -1.2 1 1.2" stroke="#fff" stroke-width=".9" fill="none"/>');
    P.neck = '<path d="M38 53 Q50 60 62 53" fill="none" stroke="#e98aa6" stroke-width="3.4" stroke-linecap="round"/>';
  }
  return P;
}
// 舊的呼叫（縮圖等）：全部疊在一起
function lookArt(id) { const P = lookParts(id); return P.back + P.torso + P.neck + P.head + P.top + P.fx; }
