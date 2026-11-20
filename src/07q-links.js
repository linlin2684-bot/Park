// ============================================================
//  功能串聯：一年前的今天、預約送卡、存基金也養貓、心情關心、和好券、
//  對方也在、旅行照片自動歸檔、每日一問撞答案、重複卡換罐罐
// ============================================================

// ---------- 一年前的今天 ----------
function onThisDayItems() {
  const t = dkey(), md = t.slice(5), y = +t.slice(0, 4);
  const out = [];
  const add = (date, kind, text, extra = {}) => { if (date && date.slice(5, 10) === md && +date.slice(0, 4) < y) out.push({ y: +date.slice(0, 4), kind, text, ...extra }); };
  list('memories').forEach((x) => add(x.date, '回憶', x.title));
  list('photos').forEach((x) => add(x.date, '照片', x.caption || '一張照片', { img: x.img }));
  list('notes').filter((n) => n.by === me() || n.found).forEach((n) => add(dkey(new Date(n.at)), '紙條', n.text));
  list('daily').filter((d) => d.answers && Object.keys(d.answers).length > 1).forEach((d) => add(d.id, '每日一問', D.DAILY_QUESTIONS[d.qi] || ''));
  list('trips').forEach((x) => add(x.date, '足跡', x.name));
  return out.sort((a, b) => b.y - a.y);
}
function onThisDayHTML() {
  const it = onThisDayItems(); if (!it.length) return '';
  const ty = new Date().getFullYear();
  const yrs = [...new Set(it.map((x) => x.y))];
  return `<div class="card otd emb-F-anniv">
    <div class="otd-h"><span class="otd-y">${ty - yrs[0]}<small>年前</small></span><div><b>${ty - yrs[0] === 1 ? '一年前的今天' : `${ty - yrs[0]} 年前的今天`}</b><div class="small muted">${yrs[0]} 年的這一天，你們留下了這些</div></div></div>
    ${it.filter((x) => x.y === yrs[0]).slice(0, 3).map((x) => `<div class="otd-i">${x.img ? `<img src="${x.img}" alt="">` : `<span class="otd-k">${x.kind}</span>`}<span>${esc(x.text.length > 60 ? x.text.slice(0, 60) + '…' : x.text)}</span></div>`).join('')}
    <button class="link" data-act="goMemory">去回憶看看 ›</button>
  </div>`;
}
ACT.goMemory = () => { S.tab = 'memory'; render(); window.scrollTo(0, 0); };

// ---------- 預約送卡（生日、紀念日當天才送到） ----------
function nextMD(md) { const d = new Date(); let t = new Date(d.getFullYear(), +md.slice(0, 2) - 1, +md.slice(3, 5)); if (dkey(t) <= dkey(d)) t = new Date(d.getFullYear() + 1, t.getMonth(), t.getDate()); return dkey(t); }
function schedChips() {
  const p = partner(); const ch = [];
  const pb = prof(p).bday || (prof(p).role === 'him' ? D.DEFAULT_DATES.hisBirthday : D.DEFAULT_DATES.herBirthday);
  if (pb) ch.push([nextMD(pb), `${nick(p)}生日`]);
  ch.push([nextMD((S.couple.dates?.anniversary || D.DEFAULT_DATES.anniversary).slice(5)), '紀念日']);
  ch.push([nextMD('02-14'), '情人節'], [nextMD('12-25'), '聖誕節']);
  return ch;
}
async function schedDeliver() {
  const sc = S.couple?.sched || {}, today = dkey();
  for (const [id, x] of Object.entries(sc)) {
    if (!x || x.day > today) continue;
    const ok = await S.store.coupleTx(S.cid, (c) => ((c.sched || {})[id] ? { [`sched.${id}`]: null } : null));
    if (!ok) continue;
    const t = { ...x.t };
    if (t.expDur) { if (t.expDur <= 86400000) { const d = new Date(); d.setHours(23, 59, 59, 999); t.expiresAt = d.getTime(); } else t.expiresAt = now() + t.expDur; delete t.expDur; }
    await col('cards').add(cardDoc(t, x.to, x.from));
    await notify(x.to, 'card', `${nick(x.from)} 預約的卡今天送到了 🎟️`, x.t.title);
  }
}
const mySched = () => Object.values(S.couple?.sched || {}).filter((x) => x && x.from === me()).sort((a, b) => a.day.localeCompare(b.day));

// ---------- 心情關心：抱抱券、和好券 ----------
function careOffer() {
  const p = partner(); if (!p) return null;
  const h = ((S.couple.moodHist || {})[p]) || {}, t = dkey(), y = dkey(new Date(Date.now() - 86400000));
  const pm = (S.couple.moods || {})[p];
  const sentKey = (k) => (S.couple.drops || {})[`care-${k}-${t}-${me()}`];
  if (pm && pm.icon === '⛈️' && dkey(new Date(pm.at)) === t && !sentKey('peace')) return { k: 'peace', t: '和好券', d: '我們和好吧。換一個抱抱，加一句對不起', mark: '和', say: `${nick(p)} 好像在生氣……小小黑叼來一張和好券` };
  const low = (v) => v === '🌧️' || v === '☁️';
  if (low(h[t]) && low(h[y]) && !sentKey('hug')) return { k: 'hug', t: '抱抱券', d: '馬上兌現一個很久很久的抱抱', mark: '抱', say: `${nick(p)} 這兩天心情不太好，小小黑叼來一張抱抱券` };
  return null;
}
function careHTML() {
  const o = careOffer(); if (!o) return '';
  return `<div class="care-row"><span class="care-cat">${catPose('box', typeof petState === 'function' ? petState().wear : '')}</span><div class="grow small">${esc(o.say)}</div><button class="btn sm" data-act="careSend" data-k="${o.k}">送給${esc(nick(partner()))}</button></div>`;
}
ACT.careSend = async () => {
  const o = careOffer(); if (!o) return;
  const ok = await S.store.coupleTx(S.cid, (c) => ((c.drops || {})[`care-${o.k}-${dkey()}-${me()}`] ? null : { [`drops.care-${o.k}-${dkey()}-${me()}`]: true }));
  if (!ok) return;
  await giveCard(partner(), { title: o.t, desc: o.d, rarity: 'SR', mark: o.mark, series: '' });
  sfx('chime'); confetti(50); toast(`${o.t}送出了`);
};

// ---------- 對方也在 ----------
const PRESENCE_MS = 150000;
async function presencePing() {
  if (document.hidden || !S.couple || !S.cid || (S.couple.members || []).length < 2) return;
  const last = ((S.couple.seen || {})[me()]) || 0;
  if (now() - last < 100000) return;
  try { await S.store.updateCouple(S.cid, { [`seen.${me()}`]: now() }); } catch (e) {}
}
setInterval(presencePing, 30000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) setTimeout(presencePing, 500); });
const partnerOnline = () => { const p = partner(); return !!p && now() - (((S.couple || {}).seen || {})[p] || 0) < PRESENCE_MS; };
ACT.poke = async (el, e) => {
  e && e.stopPropagation();
  const k = `park-poke-${me()}`; if (now() - +(localStorage.getItem(k) || 0) < 20000) return toast('戳太快了，等一下下');
  localStorage.setItem(k, String(now()));
  await notify(partner(), 'poke', `${nick(me())} 戳了你一下`);
  sfx('pop'); vibrate(20); toast(`戳了 ${nick(partner())} 一下`);
};
function pokeCheck() {
  const ev = list('events').find((x) => x.to === me() && x.type === 'poke' && !x.read && now() - x.at < 5 * 60000);
  if (!ev || pokeCheck.busy === ev.id) return;
  pokeCheck.busy = ev.id;
  col('events').update(ev.id, { read: true });
  sfx('heart'); vibrate([30, 60, 30]);
  const el = document.createElement('div'); el.className = 'poke-pop'; el.innerHTML = `<span>${avatar(ev.by)}</span><b>${esc(nick(ev.by))} 戳了你一下</b>`;
  document.body.appendChild(el); setTimeout(() => el.classList.add('out'), 2600); setTimeout(() => el.remove(), 3100);
}

// ---------- 每日一問撞答案 ----------
const DAILY_STOP = new Set('我們 你們 他們 一起 什麼 覺得 因為 所以 可以 就是 還是 沒有 自己 一個 這個 那個 如果 時候 然後 但是 不是 真的 應該 現在 已經 比較 其實 感覺 一下 一點 有點 很多 最近 喜歡 希望 想要 知道 可能 一直 每次 這樣 那樣 的話 的時 好像 還有 之前 之後 今天'.split(' '));
function dailyCollide(a, b) {
  if (!a || !b) return '';
  const clean = (s) => s.replace(/[\s，。！？、,.!?~～…「」『』（）()]/g, '|');
  const A = clean(a), B = clean(b);
  for (let L = Math.min(6, A.length); L >= 2; L--) {
    for (let i = 0; i + L <= A.length; i++) {
      const w = A.slice(i, i + L);
      if (w.includes('|') || DAILY_STOP.has(w) || /^[的了是在有也都很和跟就]/.test(w) || /[的了嗎呢吧啊]$/.test(w)) continue;
      if (B.includes(w)) return w;
    }
  }
  return '';
}
async function dailyCollideBonus(w) {
  const k = `dmatch-${dkey()}`;
  const ok = await S.store.coupleTx(S.cid, (c) => ((c.drops || {})[k] ? null : { [`drops.${k}`]: true }));
  if (ok) { petXP(3); confetti(60); sfx('sparkle'); toast(`撞答案了！你們都寫了「${w}」`); }
}

// ---------- 重複卡換罐罐 ----------
ACT.dupToCan = async (el) => {
  const c = list('cards').find((x) => x.id === el.dataset.id); if (!c || c.owner !== me() || c.used) return;
  await col('cards').remove(c.id);
  await giveCan(me(), '', true);
  el.closest('.dup-row') && (el.closest('.dup-row').innerHTML = `<span class="small">換好了，${esc(petState().name)}多了一個罐罐</span>`);
  sfx('pop'); toast('換成一個罐罐了');
};

// ---------- 資料自動整理：清掉兩個月以前的「領過了」小紀錄，避免資料越長越大 ----------
async function pruneOld() {
  const k = `park-prune-${S.cid}`;
  if (!S.couple || localStorage.getItem(k) === dkey()) return;
  localStorage.setItem(k, dkey());
  const cut = dkey(new Date(Date.now() - 60 * 86400000)), cutWk = weekKey(new Date(Date.now() - 60 * 86400000));
  const up = {}, X = S.store.DEL ? S.store.DEL() : null;
  for (const key of Object.keys(S.couple.drops || {})) {
    const d = (key.match(/(\d{4}-\d{2}-\d{2})/) || [])[1], w = (key.match(/^(?:task|tk-week)-(\d{4}-W\d{2})/) || [])[1];
    if (/^(dmatch|care)-/.test(key) && d && d < cut) up[`drops.${key}`] = X;
    if (w && w < cutWk) up[`drops.${key}`] = X;
    if (S.couple.drops[key] === null) up[`drops.${key}`] = X;
  }
  for (const f of ['taskOverride', 'battleSwaps']) for (const w of Object.keys(S.couple[f] || {})) if (w < cutWk) up[`${f}.${w}`] = X;
  if (Object.keys(up).length) { try { await S.store.updateCouple(S.cid, up); } catch (e) {} }
}
