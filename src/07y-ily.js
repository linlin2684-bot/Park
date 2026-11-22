// ============================================================
//  午夜我愛你（11/22 晽晽要求）
//  每天 00:00 起，首頁想你愛心變成「火漆封印」；那天第一次按＝說我愛你，
//  兩人比誰先按（看手機按下的時間），先按的 +1 點。
//  紀錄：couple.ily['YYYY-MM-DD'][uid] = 按下時間
//  每月 1 號結算上個月：贏比較多的拿「午夜冠軍券」（自己寫內容、對方兌現）＋頭像戴一個月王冠；平手兩人都拿。
//  couple.ilyCrown = { m: 'YYYY-MM'（戴王冠的月份）, who: [uid], wins: {uid: n} }
// ============================================================
const ilyDay = () => dkey();
const ilyMonthKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
function ilyToday() { return ((S.couple && S.couple.ily) || {})[ilyDay()] || {}; }
function ilyPending() { return !!(S.couple && partner() && !ilyToday()[me()]); }
function ilyCrowned(uid) {
  const c = S.couple && S.couple.ilyCrown;
  return !!(c && c.m === ilyMonthKey() && (c.who || []).includes(uid));
}
const ILY_SEAL = `<svg class="ily-seal" viewBox="-30 -30 60 60" aria-hidden="true">
  <path d="M0-27 C8-27 10-22 16-21 C22-19 27-15 26-6 C25 2 28 6 24 14 C20 22 12 22 6 26 C0 29 -6 26 -12 24 C-20 21 -26 16 -26 6 C-27-2 -27-10 -22-17 C-17-24 -8-27 0-27Z" fill="#9e1b32"/>
  <circle r="19" fill="none" stroke="#6e0f22" stroke-width="1.4"/>
  <path d="M0 12.6 C-4.7 7.9 -12.6 4.2 -12.6 -2.6 C-12.6 -6.8 -9.5 -9.5 -6.3 -9.5 C-3.6 -9.5 -1.5 -7.9 0 -5.6 C1.5 -7.9 3.6 -9.5 6.3 -9.5 C9.5 -9.5 12.6 -6.8 12.6 -2.6 C12.6 4.2 4.7 7.9 0 12.6Z" fill="#6e0f22"/>
  <path d="M-.6 12 C-5.3 7.3 -13.2 3.6 -13.2 -3.2 C-13.2 -7.4 -10.1 -10.1 -6.9 -10.1 C-4.2 -10.1 -2.1 -8.5 -.6 -6.2 C.9 -8.5 3 -10.1 5.7 -10.1 C8.9 -10.1 12 -7.4 12 -3.2 C12 3.6 4.1 7.3 -.6 12Z" fill="#c8283c"/></svg>`;
const ILY_CROWN = `<svg class="ily-crown" viewBox="0 0 40 18" aria-hidden="true"><path d="M5 17 L3 3 L12 10 L20 0 L28 10 L37 3 L35 17Z" fill="#e9c77b" stroke="#8a5a1c" stroke-width=".8" stroke-linejoin="round"/></svg>`;

// 兩個時間差，講成人話
function ilyGap(ms) {
  const s = Math.max(1, Math.round(ms / 1000));
  if (s < 60) return `${s} 秒`;
  const m = Math.floor(s / 60), r = s % 60;
  if (m < 60) return r ? `${m} 分 ${r} 秒` : `${m} 分鐘`;
  const h = Math.floor(m / 60), rm = m % 60;
  return rm ? `${h} 小時 ${rm} 分` : `${h} 小時`;
}

let ilyBusy = false;
async function ilyPress(el) {
  if (ilyBusy) return;
  ilyBusy = true;
  const at = now(), day = ilyDay(), u = me(), p = partner();
  try {
    let other = null;
    const ok = await S.store.coupleTx(S.cid, (x) => {
      const d = ((x && x.ily) || {})[day] || {};
      if (d[u]) return null;
      other = d[p] || null;
      return { [`ily.${day}.${u}`]: at };
    });
    if (!ok) return;
    const won = !other || at <= other;
    // 這一下也算一次想你
    const r = el.getBoundingClientRect();
    floaty(r.left + r.width / 2, r.top); sfx('heart'); vibrate([30, 40, 30, 40, 60]);
    await col('misses').add({ by: u, at, ily: true });
    petXP(1);
    if (won) {
      await addPoints(u, 1, '午夜我愛你：先說了', 'ily');
      await notify(p, 'ily', `${nick(u)} 搶先說了我愛你 ❤️`);
    } else {
      await notify(p, 'ily', `${nick(u)} 也說了我愛你 ❤️`);
    }
    ilyShow(won, won ? '' : ilyGap(at - other));
  } catch (e) { console.warn('午夜我愛你', e); toast('沒有存到，等一下再試'); }
  finally { ilyBusy = false; }
}
function ilyShow(won, gap) {
  const p = partner();
  const el = document.createElement('div');
  el.className = `ily-fx ${won ? 'win' : 'lose'}`;
  let rays = '';
  for (let i = 0; i < 16; i++) rays += `<i style="--a:${i * 22.5}deg"></i>`;
  el.innerHTML = `<div class="ily-burst">${rays}</div>
    <div class="ily-big">${ILY_SEAL}</div>
    <b>${won ? '你先說了我愛你！' : `${esc(nick(p))} 比你早 ${gap} 說了`}</b>
    <span>${won ? `今天你比 ${esc(nick(p))} 快，+1 點` : '你也說到了 ❤️'}</span>`;
  document.body.appendChild(el);
  if (!won) heartRain();
  const off = () => { el.classList.add('out'); setTimeout(() => el.remove(), 400); render(); };
  el.onclick = off;
  setTimeout(() => el.isConnected && off(), 3600);
}

// 想你愛心：午夜版時改成說我愛你
const _ilyMiss0 = ACT.miss;
ACT.miss = async (el, e) => (ilyPending() ? ilyPress(el) : _ilyMiss0(el, e));

// 00:00 一到，首頁開著也會自動換成火漆封印（反過來也是）
setInterval(() => {
  if (S.tab !== 'home' || document.visibilityState === 'hidden' || $('.modal-back') || $('.ily-fx')) return;
  const a = document.activeElement;
  if (a && /INPUT|TEXTAREA|SELECT/.test(a.tagName)) return;
  const btn = $('#missbtn');
  if (btn && btn.classList.contains('ily') !== ilyPending()) render();
}, 15000);

// ---------- 每月結算 ----------
function ilyWins(monthKey) {
  const all = (S.couple && S.couple.ily) || {};
  const ms = S.couple.members || [];
  const w = Object.fromEntries(ms.map((u) => [u, 0]));
  for (const [day, d] of Object.entries(all)) {
    if (!day.startsWith(monthKey)) continue;
    const pressed = ms.filter((u) => d[u]);
    if (!pressed.length) continue;
    const best = Math.min(...pressed.map((u) => d[u]));
    pressed.filter((u) => d[u] === best).forEach((u) => { w[u] += 1; });
  }
  return w;
}
let ilyMonthBusy = false;
async function ilyMonthly() {
  const c = S.couple;
  if (ilyMonthBusy || !c || !S.cid || (c.members || []).length < 2 || !S.d.cards) return;
  const d = new Date(), prev = new Date(d.getFullYear(), d.getMonth() - 1, 1);
  const pk = ilyMonthKey(prev), cur = ilyMonthKey(d), dropKey = `ily-${pk}`;
  if ((c.drops || {})[dropKey]) return;
  ilyMonthBusy = true;
  try {
    const wins = ilyWins(pk);
    const top = Math.max(0, ...Object.values(wins));
    const who = top > 0 ? Object.keys(wins).filter((u) => wins[u] === top) : [];
    const ok = await S.store.coupleTx(S.cid, (x) => ((x.drops || {})[dropKey] ? null : {
      [`drops.${dropKey}`]: true,
      ...(who.length ? { ilyCrown: { m: cur, who, wins, of: pk } } : {}),
    }));
    if (!ok || !who.length) return;
    const ms = c.members, MN = prev.getMonth() + 1;
    for (const u of who) {
      const other = ms.find((x) => x !== u);
      await giveCard(u, { title: '午夜冠軍券', rarity: 'SSR', desc: '', mark: '冠' }, { from: other, scratched: true, ilyChamp: true, ilyOf: pk });
      await notify(u, 'ily', `${MN} 月你比較常先說我愛你，拿到午夜冠軍券和一個月的王冠 👑`);
    }
  } catch (e) { console.warn('午夜冠軍', e); }
  finally { ilyMonthBusy = false; }
}
setInterval(() => { if (document.visibilityState !== 'hidden') ilyMonthly(); }, 5000);

// 冠軍券：自己寫內容
const ILY_IDEAS = ['輸的人要幫我按摩 15 分鐘', '輸的人請我吃一次早餐', '一整天去哪裡都聽我的', '一個我說停才能放開的擁抱', '輸的人要說 10 次我愛你'];
const _ilyTodos0 = homeTodos;
homeTodos = () => {
  const t = _ilyTodos0();
  for (const c of list('cards').filter((c) => c.ilyChamp && !c.desc && c.owner === me())) {
    t.unshift({ icon: '<i data-ic="trophy"></i>', text: '你拿到午夜冠軍券，寫下要兌換什麼', act: 'ilyWrite', id: c.id, btn: '去寫' });
  }
  return t;
};
ACT.ilyWrite = (el) => {
  const c = list('cards').find((x) => x.id === el.dataset.id);
  if (!c) return;
  const m = openModal(`${mhead('午夜冠軍券')}
    <p class="small muted">你這個月比較常先說我愛你，寫下要 ${esc(nick(c.from))} 幫你兌現什麼。</p>
    <textarea id="ily-in" maxlength="60" placeholder="想要兌換什麼？">${esc(c.desc || '')}</textarea>
    <div class="ms-ideas">${ILY_IDEAS.map((s) => `<button class="chip" data-idea="${esc(s)}">${esc(s)}</button>`).join('')}</div>
    <button class="btn block mt" id="ily-ok">寫好了</button>`);
  m.querySelectorAll('[data-idea]').forEach((b) => b.onclick = () => { $('#ily-in', m).value = b.dataset.idea; });
  $('#ily-ok', m).onclick = async () => {
    const v = $('#ily-in', m).value.trim();
    if (!v) return toast('先寫下要兌換什麼');
    await col('cards').update(c.id, { desc: v });
    closeModal(m); toast('寫好了，冠軍券放在你的票夾'); render();
  };
};

// ---------- 每月回顧卡加一行 ----------
const _ilyReview0 = monthReviewHTML;
monthReviewHTML = () => {
  const h = _ilyReview0();
  if (!h || !S.couple || (S.couple.members || []).length < 2) return h;
  const d = new Date(), prev = new Date(d.getFullYear(), d.getMonth() - 1, 1);
  const w = ilyWins(ilyMonthKey(prev));
  if (!Object.values(w).some((n) => n)) return h;
  const line = `<div class="mrev-ily">${ILY_CROWN}<span>${prev.getMonth() + 1} 月誰先說愛你：${(S.couple.members || []).map((u) => `${esc(nick(u))} ${w[u] || 0} 次`).join('、')}</span></div>`;
  return h.replace(/<\/div>\s*$/, `${line}</div>`);
};
EV_CAT.ily = 'us';
EV_ICON.ily = '<i data-ic="heart"></i>';
// 上個月只有午夜我愛你的紀錄時，回顧卡也要出現
const _ilyMR0 = monthReview;
monthReview = () => {
  const R = _ilyMR0();
  if (R && !R.any && S.couple && (S.couple.members || []).length >= 2 && Object.values(ilyWins(`${R.y}-${pad(R.mo + 1)}`)).some((n) => n)) R.any = true;
  return R;
};
