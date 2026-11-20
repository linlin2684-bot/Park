// ============================================================
//  想你：愛心雨、想你系列紀念卡
// ============================================================

// 對方想你的時候：打開 App（或 App 開著）就會下一陣愛心雨
function missRain() {
  const p = partner();
  if (!p || !S.d.misses || !S.cid) return;
  const key = `park-miss-seen-${S.cid}-${me()}`;
  const theirs = list('misses').filter((m) => m.by === p);
  const latest = Math.max(0, ...theirs.map((m) => m.at || 0));
  const last = +(localStorage.getItem(key) || 0);
  if (!last) { localStorage.setItem(key, latest || now()); return; }
  const fresh = theirs.filter((m) => m.at > last);
  if (!fresh.length) return;
  localStorage.setItem(key, latest);
  heartRain();
}
function heartRain(n = 34) {
  if (document.querySelector('.heart-rain')) return;
  const C = ['#e2445f', '#ff6f91', '#ff9db4', '#ffc2d1', '#c8283c', '#f7a1b5'];
  const wrap = document.createElement('div');
  wrap.className = 'heart-rain';
  let h = '';
  for (let i = 0; i < n; i++) {
    const s = 14 + Math.random() * 22, x = Math.random() * 100, d = 2.6 + Math.random() * 1.8, dl = Math.random() * 1.4, sw = (Math.random() * 40 - 20).toFixed(0);
    h += `<span style="left:${x.toFixed(1)}%;width:${s.toFixed(0)}px;animation-duration:${d.toFixed(2)}s;animation-delay:${dl.toFixed(2)}s;--sw:${sw}px;--r:${(Math.random() * 50 - 25).toFixed(0)}deg">
      <svg viewBox="0 0 24 22"><path d="M12 21 C9 18 1 13 1 6.5 C1 3 3.7 1 6.6 1 C9 1 10.8 2.4 12 4.4 C13.2 2.4 15 1 17.4 1 C20.3 1 23 3 23 6.5 C23 13 15 18 12 21 Z" fill="${C[i % C.length]}"/></svg></span>`;
  }
  wrap.innerHTML = h;
  document.body.appendChild(wrap);
  sfx('heart');
  setTimeout(() => wrap.remove(), 6500);
}

// 想你系列（14 張）：送給「被想的人」，兩人一起達成的兩人各一張
const MISS_SERIES = '想你系列';
const MISS_DEFS = [
  { id: 'c100', title: '想你一百次', rarity: 'SR', mark: '想', desc: '想了你一百次的證明。兌換一個很久很久、不能先放開的擁抱' },
  { id: 'c520', title: '520 我愛你', rarity: 'SSR', mark: '愛', desc: '按了 520 次想你。兌換一次約會，去哪裡由你決定' },
  { id: 'c1314', title: '一生一世', rarity: 'SSR', mark: '生', desc: '按了 1314 次想你。兌換一個願望，什麼都可以' },
  { id: 'sync', title: '心有靈犀', rarity: 'SSR', mark: '犀', desc: '5 分鐘內我們都按了想你。兌換一題默契考驗：猜中我在想什麼', both: true },
  { id: 's7', title: '一週都想你', rarity: 'R', mark: '週', desc: '連續 7 天我們都想著對方。兌換一杯飲料', both: true },
  { id: 's30', title: '一個月都想你', rarity: 'SR', mark: '月', desc: '連續 30 天我們都想著對方。兌換一頓晚餐', both: true },
  { id: 's100', title: '百日相思', rarity: 'SSR', mark: '百', desc: '連續 100 天我們都想著對方。兌換一趟小旅行', both: true },
  { id: 'first', title: '第一次想你', rarity: 'N', mark: '初', desc: '第一次按下想你的那一下。兌換一個早安吻' },
  { id: 'night', title: '失眠想你', rarity: 'R', mark: '夜', desc: '凌晨還在想你。兌換一通哄睡電話' },
  { id: 'bday', title: '壽星最想的人', rarity: 'SR', mark: '壽', desc: '生日這天也在想你。兌換壽星許一個願', yearly: true },
  { id: 'lots', title: '想來想去', rarity: 'SR', mark: '黏', desc: '同一天我們各想了對方 10 次以上。兌換一整天黏在一起', both: true },
  { id: 'rain', title: '撐傘券', rarity: 'R', mark: '傘', desc: '你心情下雨的時候，我在想你。兌換一次無條件的哄哄' },
  { id: 'morning', title: '早安想你', rarity: 'SR', mark: '早', desc: '30 個早晨第一個想你。兌換一份送到你面前的早餐' },
  { id: 'anniv', title: '週年想你', rarity: 'SSR', mark: '年', desc: '週年那天我們都在想對方。兌換一張合照，每年拍一張', both: true, yearly: true },
];
const MISS_HOW = { c100: '一個人想對方 100 次', c520: '想對方 520 次', c1314: '想對方 1314 次', sync: '5 分鐘內兩個人都按想你', s7: '連續 7 天兩個人都有想對方', s30: '連續 30 天', s100: '連續 100 天',
  first: '對方第一次按想你', night: '對方在凌晨 0–4 點想你', bday: '你生日那天對方想你', lots: '同一天兩個人各想 10 次', rain: '你心情下雨時對方想你', morning: '對方 30 個早晨第一個想你', anniv: '週年那天兩個人都按想你' };
// 收藏冊：還沒拿到的卡用剪影格子顯示
const SERIES_SLOTS = { [MISS_SERIES]: () => MISS_DEFS.map((d) => ({ title: d.title, rarity: d.rarity, how: MISS_HOW[d.id] })) };
const missDay = (at) => dkey(new Date(at));
const missHour = (at) => new Date(at).getHours();
// 找出每張卡「誰達成、要送給誰」：回傳 [{ def, to, from, key }]
function missEarned() {
  const ms = S.couple?.members || [];
  if (ms.length < 2) return [];
  const [A, B] = ms, other = (u) => (u === A ? B : A);
  const t0 = S.couple.togetherStart || Infinity;
  const all = list('misses').filter((m) => m.at && m.at >= t0).sort((x, y) => x.at - y.at);
  const by = (u) => all.filter((m) => m.by === u);
  const out = [], def = (id) => MISS_DEFS.find((d) => d.id === id);
  const give = (id, u, key) => out.push({ def: def(id), to: other(u), from: u, key });      // u 想人 → 對方收到
  const both = (id, key) => { out.push({ def: def(id), to: A, from: B, key: key + '-' + A }); out.push({ def: def(id), to: B, from: A, key: key + '-' + B }); };
  // 每天兩個人的次數
  const days = {};
  all.forEach((m) => { const d = (days[missDay(m.at)] ||= { [A]: 0, [B]: 0 }); if (d[m.by] != null) d[m.by]++; });
  const bothDays = Object.keys(days).filter((d) => days[d][A] && days[d][B]).sort();
  let run = 0, best = 0, prev = null;
  bothDays.forEach((d) => { run = prev && (parseD(d) - parseD(prev)) / 86400000 === 1 ? run + 1 : 1; best = Math.max(best, run); prev = d; });
  for (const u of ms) {
    const mine = by(u);
    [['c100', 100], ['c520', 520], ['c1314', 1314]].forEach(([id, n]) => { if (mine.length >= n) give(id, u, `${id}-${u}`); });
    if (mine.length) give('first', u, `first-${u}`);
    if (mine.some((m) => missHour(m.at) < 4)) give('night', u, `night-${u}`);
    if (mine.some((m) => m.rain)) give('rain', u, `rain-${u}`);
    // 對方生日當天想對方
    const [bm, bd] = String(prof(other(u)).bday || '').split('-').map(Number);
    if (bm && bd) mine.filter((m) => { const t = new Date(m.at); return t.getMonth() + 1 === bm && t.getDate() === bd; })
      .forEach((m) => give('bday', u, `bday-${u}-${new Date(m.at).getFullYear()}`));
  }
  // 早安：當天第一個按的人、而且在 6–9 點；累計 30 天
  const firstOfDay = {};
  all.forEach((m) => { const d = missDay(m.at); if (!firstOfDay[d]) firstOfDay[d] = m; });
  ms.forEach((u) => { if (Object.values(firstOfDay).filter((m) => m.by === u && missHour(m.at) >= 6 && missHour(m.at) < 9).length >= 30) give('morning', u, `morning-${u}`); });
  // 心有靈犀：5 分鐘內兩個人都按
  for (let i = 1; i < all.length; i++) if (all[i].by !== all[i - 1].by && all[i].at - all[i - 1].at <= 5 * 60000) { both('sync', 'sync'); break; }
  [['s7', 7], ['s30', 30], ['s100', 100]].forEach(([id, n]) => { if (best >= n) both(id, id); });
  if (Object.values(days).some((d) => d[A] >= 10 && d[B] >= 10)) both('lots', 'lots');
  // 週年當天兩個人都按
  const ann = (S.couple.dates?.anniversary || D.DEFAULT_DATES.anniversary).slice(5);
  bothDays.filter((d) => d.slice(5) === ann).forEach((d) => both('anniv', `anniv-${d.slice(0, 4)}`));
  return out;
}
let missDropBusy = false;
async function missCardDrops() {
  if (missDropBusy || !S.d.misses || (S.couple?.members || []).length < 2) return;
  missDropBusy = true;
  try {
    for (const e of missEarned()) {
      const k = `miss-${e.key}`;
      if ((S.couple.drops || {})[k]) continue;
      const ok = await S.store.coupleTx(S.cid, (x) => (x.drops && x.drops[k] ? null : { [`drops.${k}`]: true }));
      if (!ok) continue;
      const d = e.def;
      await col('cards').add(cardDoc({ title: d.title, desc: d.desc, rarity: d.rarity, mark: d.mark, series: MISS_SERIES, fest: 'miss' }, e.to, d.both ? 'sys' : e.from));
      await col('events').add({ to: e.to, by: d.both ? 'sys' : e.from, type: 'card', text: '收到一張想你限定券', detail: d.title, at: now(), read: false });
    }
  } finally { missDropBusy = false; }
}
