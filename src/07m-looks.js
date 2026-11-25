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
function lookArt(id) {
  if (id === 'pajama') return `<path d="M36 70 Q50 64 64 70 L66 86 L34 86 Z" fill="#9fb8e8" opacity=".95"/><path d="M38 74 H62 M37 79 H63" stroke="#fff" stroke-width="1.6" opacity=".7"/><circle cx="50" cy="76" r="1.3" fill="#fff"/>
    <g transform="translate(0 4)"><path d="M34 22 Q44 6 62 12 Q72 16 74 30 Q66 24 56 22 Z" fill="#9fb8e8"/><path d="M34 22 Q50 18 60 23" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round"/><circle cx="75" cy="31" r="3.2" fill="#fff"/></g>`;
  if (id === 'angel') return `<path d="M34 62 Q18 52 16 64 Q20 66 22 70 Q18 72 22 76 Q30 74 36 70 Z M66 62 Q82 52 84 64 Q80 66 78 70 Q82 72 78 76 Q70 74 64 70 Z" fill="#fffaf0" stroke="#e8dcc6" stroke-width=".8"/>
    <ellipse cx="50" cy="10" rx="11" ry="3.2" fill="none" stroke="#f5c843" stroke-width="2.2"/>`;
  if (id === 'ghost') return `<path d="M30 88 L30 52 Q30 28 50 26 Q70 28 70 52 L70 88 L64 83 L58 88 L52 83 L46 88 L40 83 L34 88 Z" fill="#f6f2f8" opacity=".93" stroke="#d9cfe0" stroke-width=".8" transform="translate(0 -6)"/>
    <ellipse cx="44" cy="38" rx="3" ry="4" fill="#2b2633"/><ellipse cx="56" cy="38" rx="3" ry="4" fill="#2b2633"/><ellipse cx="50" cy="48" rx="2.4" ry="2" fill="#2b2633"/>`;
  if (id === 'chef') return `<path d="M42 70 L50 76 L58 70 L58 86 L42 86 Z" fill="#fffaf0"/><path d="M42 70 L50 76 L58 70" stroke="#d9cfbe" stroke-width=".8" fill="none"/><circle cx="50" cy="80" r="1.2" fill="#d9cfbe"/>
    <g transform="translate(0 4)"><rect x="40" y="12" width="20" height="9" rx="2" fill="#fffaf0" stroke="#e1d6c4" stroke-width=".8"/><circle cx="43" cy="8" r="6" fill="#fffaf0"/><circle cx="50" cy="5" r="7" fill="#fffaf0"/><circle cx="57" cy="8" r="6" fill="#fffaf0"/></g>`;
  if (id === 'spring') return `<g transform="translate(0 4)">${[[38, 18, '#f7b6c8'], [44, 14, '#fff3c4'], [50, 13, '#f7b6c8'], [56, 14, '#c9e8d8'], [62, 18, '#f7b6c8']].map(([x, y, c]) => `<g transform="translate(${x} ${y})">${[0, 72, 144, 216, 288].map((a) => `<ellipse cx="0" cy="-2.4" rx="1.7" ry="2.6" fill="${c}" transform="rotate(${a})"/>`).join('')}<circle r="1.2" fill="#f5c843"/></g>`).join('')}</g>
    <path d="M14 30 q2 -2 4 0 M84 44 q2 -2 4 0" stroke="#f7b6c8" stroke-width="2" stroke-linecap="round" fill="none"/>`;
  if (id === 'summer') return `<g transform="translate(78 78) rotate(-12)"><path d="M-12 0 A12 12 0 0 0 12 0 Z" fill="#5fae6f"/><path d="M-10 0 A10 10 0 0 0 10 0 Z" fill="#f2f2e8"/><path d="M-9 0 A9 9 0 0 0 9 0 Z" fill="#ef5f6c"/><circle cx="-3" cy="3" r=".9" fill="#2b2633"/><circle cx="2" cy="5" r=".9" fill="#2b2633"/><circle cx="5" cy="2" r=".9" fill="#2b2633"/></g>
    <g transform="translate(0 4)"><path d="M30 24 Q50 10 70 24 L66 26 Q50 16 34 26 Z" fill="#f2d48a"/><path d="M34 24 Q50 15 66 24" stroke="#e98a6a" stroke-width="2.2" fill="none"/></g>`;
  if (id === 'autumn') return `${[[18, 70, '#e98a3a', -20], [80, 60, '#c9532f', 30], [24, 84, '#e8b04b', 50], [84, 84, '#e98a3a', -40]].map(([x, y, c, r]) => `<path transform="translate(${x} ${y}) rotate(${r})" d="M0 -6 L1.6 -2 L5 -3 L3 1 L5 3 L1 3 L0 6 L-1 3 L-5 3 L-3 1 L-5 -3 L-1.6 -2 Z" fill="${c}"/>`).join('')}
    <path transform="translate(60 18) rotate(20)" d="M0 -5 L1.4 -1.6 L4.4 -2.6 L2.6 1 L4.4 2.6 L.8 2.6 L0 5 L-.8 2.6 L-4.4 2.6 L-2.6 1 L-4.4 -2.6 L-1.4 -1.6 Z" fill="#e98a3a"/>`;
  if (id === 'winter') return `<path d="M35 52 Q50 60 65 52 L66 58 Q50 66 34 58 Z" fill="#d9434f"/><path d="M56 58 L60 74 L55 74 L52 60 Z" fill="#d9434f"/><path d="M37 55 H63 M55 66 H59" stroke="#fbf7f0" stroke-width="1.4" stroke-dasharray="2 2"/>
    <g transform="translate(0 4)"><circle cx="31" cy="33" r="5" fill="#fbf7f0" stroke="#e6dccb" stroke-width=".8"/><circle cx="69" cy="33" r="5" fill="#fbf7f0" stroke="#e6dccb" stroke-width=".8"/><path d="M31 28 Q50 6 69 28" stroke="#d9434f" stroke-width="2" fill="none"/></g>`;
  if (id === 'sailor') return `<path d="M34 62 Q50 56 66 62 L68 87 L32 87 Z" fill="#f7f7fb"/><path d="M36 58 Q50 64 64 58 L61 67 L50 74 L39 67 Z" fill="#2f4a8a"/><path d="M38 61 L50 70 L62 61" fill="none" stroke="#fff" stroke-width="1.1"/>
    <path d="M50 72 L46 80 L50 78 L54 80 Z" fill="#d9434f"/><path d="M33 84 H67" stroke="#2f4a8a" stroke-width="2"/>
    <g transform="translate(0 4)"><path d="M36 20 Q36 10 50 9 Q64 10 64 20 Z" fill="#f7f7fb" stroke="#dcdce8" stroke-width=".8"/><rect x="35" y="18" width="30" height="4.5" rx="2" fill="#2f4a8a"/><path d="M64 20 l6 4 M64 21 l4 6" stroke="#2f4a8a" stroke-width="1.6" stroke-linecap="round"/></g>`;
  if (id === 'raincoat') return `<path d="M32 60 Q50 53 68 60 L72 89 L28 89 Z" fill="#f5c843"/><path d="M50 58 V88" stroke="#d9a22c" stroke-width="1.2"/><circle cx="54" cy="66" r="1.4" fill="#fff"/><circle cx="54" cy="74" r="1.4" fill="#fff"/><circle cx="54" cy="82" r="1.4" fill="#fff"/>
    <g transform="translate(0 4)"><path d="M30 44 Q27 14 50 12 Q73 14 70 44" fill="none" stroke="#f5c843" stroke-width="6" stroke-linecap="round"/><path d="M33 22 Q50 8 67 22" fill="none" stroke="#d9a22c" stroke-width="1"/></g>
    ${[[16, 30], [86, 24], [12, 56], [88, 50]].map(([x, y]) => `<path d="M${x} ${y} q-2 4 0 5 q2 -1 0 -5 Z" fill="#9fd0ff"/>`).join('')}`;
  if (id === 'hoodie') return `<path d="M32 60 Q50 54 68 60 L70 88 L30 88 Z" fill="#b9a7e6"/><rect x="40" y="74" width="20" height="9" rx="3" fill="#a592d8"/><path d="M45 58 L44 68 M55 58 L56 68" stroke="#fff" stroke-width="1.2" stroke-linecap="round"/><circle cx="44" cy="69" r="1.2" fill="#fff"/><circle cx="56" cy="69" r="1.2" fill="#fff"/>
    <path d="M31 58 Q50 50 69 58" fill="none" stroke="#a592d8" stroke-width="5" stroke-linecap="round"/>`;
  if (id === 'suit') return `<path d="M33 61 Q50 55 67 61 L68 87 L32 87 Z" fill="#4a4f63"/><path d="M42 58 L50 76 L58 58 Z" fill="#fbf7f0"/><path d="M41 58 L48 74 L44 76 L38 62 Z M59 58 L52 74 L56 76 L62 62 Z" fill="#3a3e50"/>
    <path d="M50 60 L46 57.5 L46 62.5 Z M50 60 L54 57.5 L54 62.5 Z" fill="#d9434f"/><circle cx="50" cy="60" r="1.2" fill="#a8303b"/><circle cx="50" cy="80" r="1.1" fill="#c9c4b8"/><path d="M60 66 h4" stroke="#fbf7f0" stroke-width="1.2"/>`;
  if (id === 'detective') return `<path d="M30 60 Q50 52 70 60 L73 88 L27 88 Z" fill="#b08a5a"/><path d="M30 60 Q50 70 70 60 L66 70 Q50 76 34 70 Z" fill="#9a764a"/><circle cx="46" cy="74" r="1.2" fill="#6b4f30"/><circle cx="54" cy="74" r="1.2" fill="#6b4f30"/>
    <g transform="translate(0 4)"><path d="M33 22 Q35 8 50 8 Q65 8 67 22 Z" fill="#b08a5a"/><path d="M33 22 Q50 18 67 22 L68 25 Q50 21 32 25 Z" fill="#9a764a"/><path d="M33 23 L27 27 M67 23 L73 27" stroke="#9a764a" stroke-width="3" stroke-linecap="round"/><path d="M42 11 Q50 14 58 11" stroke="#8a6a40" stroke-width=".8" fill="none"/></g>
    <g transform="translate(80 74) rotate(30)"><circle r="6" fill="#dff1ff" fill-opacity=".6" stroke="#6b4f30" stroke-width="2"/><path d="M0 6 V15" stroke="#6b4f30" stroke-width="2.6" stroke-linecap="round"/></g>`;
  if (id === 'party') return `<path d="M36 60 L40 56 L44 60 L48 56 L52 60 L56 56 L60 60 L64 56 L64 61 Q50 66 36 61 Z" fill="#fff3c4" stroke="#e8b04b" stroke-width=".8"/>
    <g transform="translate(0 4) rotate(-10 52 16)"><path d="M43 20 L52 -2 L61 20 Z" fill="#ff8fab"/><path d="M45.5 14 L58.5 14 M48 8 L56 8" stroke="#fff" stroke-width="2"/><circle cx="52" cy="-3" r="2.6" fill="#ffd45c"/></g>
    ${[[18, 28, '#ff8fab'], [84, 30, '#9fd0ff'], [14, 60, '#ffd45c'], [86, 62, '#b9a7e6'], [24, 46, '#7cc7a8']].map(([x, y, c], i) => `<rect x="${x}" y="${y}" width="3.4" height="1.8" rx=".6" fill="${c}" transform="rotate(${i * 37} ${x} ${y})"/>`).join('')}`;
  if (id === 'xmas') return `<path d="M32 60 Q50 54 68 60 L70 88 L30 88 Z" fill="#c8303f"/><path d="M31 63 Q50 57 69 63" fill="none" stroke="#2f7a4f" stroke-width="3"/><path d="M30 85 H70" stroke="#2f7a4f" stroke-width="3"/>
    <path d="M34 72 H66" stroke="#fbf7f0" stroke-width="1.4" stroke-dasharray="1.6 3"/>${[40, 50, 60].map((x) => `<g transform="translate(${x} 79)"><path d="M0 -3.4 V3.4 M-3 -1.7 L3 1.7 M-3 1.7 L3 -1.7" stroke="#fbf7f0" stroke-width=".9" stroke-linecap="round"/></g>`).join('')}`;
  if (id === 'valentine') return `<path d="M32 60 Q50 54 68 60 L70 88 L30 88 Z" fill="#f7b6c8"/><path d="M31 63 Q50 57 69 63" fill="none" stroke="#e98aa6" stroke-width="3"/><path d="M30 85 H70" stroke="#e98aa6" stroke-width="3"/>
    <path d="M50 82 C44 77 40 74 42 70 C43.5 67.5 47 67.5 50 71 C53 67.5 56.5 67.5 58 70 C60 74 56 77 50 82 Z" fill="#e2445f"/><path d="M36 76 l1 -1 1 1 M62 76 l1 -1 1 1" stroke="#fff" stroke-width=".9" fill="none"/>`;
  return '';
}
