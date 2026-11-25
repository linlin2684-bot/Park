// ============================================================
//  啟動、登入、配對、外框
// ============================================================

async function boot() {
  try {
    S.store = await createStore(firebaseConfig);
  } catch (e) {
    console.error(e);
    $('#app').innerHTML = `<div class="auth-wrap"><div class="auth-logo"><span class="lg"><img src="logo.svg" alt=""></span><h1>連不上 Firebase</h1><p>請檢查 config.js 的設定，或網路是否正常。<br><small>${esc(e.message || e)}</small></p></div></div>`;
    return;
  }
  S.store.auth.onChange(async (u) => {
    cleanup();
    if (!u) return renderLogin();
    S.me = u;
    if (S.store.mode === 'demo') await ensureDemo();
    const ud = await S.store.getUser(u.uid);
    if (!ud || !ud.coupleId) return renderOnboard();
    enterCouple(ud.coupleId);
  });
}
function cleanup() {
  S.unsubs.forEach((f) => { try { f(); } catch (e) {} });
  S.unsubs = []; S.couple = null; S.cid = null; S.d = {}; S.backupChecked = false;
  if (S.map) { try { S.map.remove(); } catch (e) {} S.map = null; S.mapEl = null; }
}

// ---------- 試玩模式 ----------
async function ensureDemo() {
  const cid = 'DEMO01';
  if (await S.store.getCouple(cid)) return;
  const A = 'demo-her', B = 'demo-him';
  await S.store.createCouple(cid, newCoupleData(A, { nick: '寶貝', role: 'her', av: 'bunny', emoji: '👧', bday: D.DEFAULT_DATES.herBirthday, spice: 3 }, true));
  await S.store.updateCouple(cid, { members: [A, B], [`profiles.${B}`]: { nick: '好寶', role: 'him', av: 'violin', emoji: '👦', bday: D.DEFAULT_DATES.hisBirthday, spice: 3 } });
  await S.store.setUser(A, { coupleId: cid });
  await S.store.setUser(B, { coupleId: cid });
  await seedPool(cid);
  await welcomeGift(cid, A); await welcomeGift(cid, B);
}
// 入園禮：每人 20 點
async function welcomeGift(cid, uid) {
  await S.store.col(cid, 'points').add({ uid, amt: 20, reason: '入園禮 🎁', tag: '', by: 'sys', at: now() });
}

function newCoupleData(uid, profile, seedBirthday) {
  return {
    members: [uid], creator: uid, profiles: { [uid]: profile },
    dates: { anniversary: D.DEFAULT_DATES.anniversary },
    seedPending: !!seedBirthday, poolVer: D.POOL_VERSION, tickets: {}, spins: {}, moods: {}, drops: {},
    food: D.DEFAULT_FOOD, fund: { name: '第一趟旅行基金', goal: 30000, round: 1, rewarded: false },
    createdAt: now(),
  };
}
async function seedPool(cid) {
  const c = S.store.col(cid, 'pool');
  for (const p of D.POOL) await c.add({ ...p, by: 'sys', at: now() });
}

// 對方加入後，把生日卡組放進對方的票夾（只會執行一次）
async function maybeSeed() {
  const c = S.couple;
  if (!c || !c.seedPending || (c.members || []).length < 2) return;
  const ok = await S.store.coupleTx(S.cid, (x) => (x.seedPending ? { seedPending: false } : null));
  if (!ok) return;
  const owner = c.members.find((u) => u !== c.creator);
  const from = c.creator;
  // 生日當天用掉的卡，兌換日期記在最近一次的生日
  const bd = (c.profiles?.[owner]?.bday || D.DEFAULT_DATES.hisBirthday).split('-').map(Number);
  let bt = new Date(new Date().getFullYear(), bd[0] - 1, bd[1], 20);
  if (bt.getTime() > now()) bt = new Date(bt.getFullYear() - 1, bd[0] - 1, bd[1], 20);
  const bts = bt.getTime();
  for (const t of D.BIRTHDAY_CARDS) {
    const doc = cardDoc({ ...t, series: D.BIRTHDAY_SERIES }, owner, from, { scratched: true, at: bts });
    doc.log = doc.log.map(() => ({ at: bts, how: 'birthday' }));
    await col('cards').add(doc);
  }
  for (const t of D.BIRTHDAY_COLLECTIBLES) {
    await col('cards').add(cardDoc({ ...t, rarity: 'SSR', kind: 'collect', series: D.BIRTHDAY_SERIES }, owner, from, { scratched: true, at: bts }));
  }
  if (owner !== me()) await notify(owner, 'card', '你收到一整套生日票券 🎂');
}

// 節日自動發限定卡
async function holidayDrops() {
  const c = S.couple;
  if (!c || (c.members || []).length < 2) return;
  const d = new Date(), y = d.getFullYear(), md = `${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const her = c.members.find((u) => prof(u).role === 'her');
  const him = c.members.find((u) => prof(u).role === 'him');
  const ann = (c.dates?.anniversary || D.DEFAULT_DATES.anniversary).slice(5);
  const rules = [
    { key: 'herBirthday', md: prof(her).bday || D.DEFAULT_DATES.herBirthday, to: her ? [her] : [] },
    { key: 'hisBirthday', md: prof(him).bday || D.DEFAULT_DATES.hisBirthday, to: him ? [him] : [] },
    { key: 'anniversary', md: ann, to: c.members },
    { key: 'valentine', md: '02-14', to: c.members },
    { key: 'christmas', md: '12-25', to: c.members },
    { key: 'newyear', md: '01-01', to: c.members },
  ];
  for (const r of rules) {
    // 週年卡：兩人都加入後、紀念日起 7 天內都會補發（對方當天才加入也拿得到）
    const okDay = r.key === 'anniversary' ? annivInfo().is && localStorage.getItem('park-anniv-preview') !== '1' : r.md === md;
    if (!okDay || !r.to.length) continue;
    const k = `${y}-${r.key}`;
    const ok = await S.store.coupleTx(S.cid, (x) => (x.drops && x.drops[k] ? null : { [`drops.${k}`]: true }));
    if (!ok) continue;
    for (const u of r.to) {
      const tpl = r.key === 'anniversary' ? { ...D.HOLIDAY_CARDS.anniversary, title: `${annivInfo().cn}週年紀念券`, desc: `謝謝你陪我走過第 ${annivInfo().n} 年，下一年也請多多指教` } : D.HOLIDAY_CARDS[r.key];
      await col('cards').add(cardDoc(tpl, u, 'sys'));
      await col('events').add({ to: u, by: 'sys', type: 'card', text: '今天有一張節日限定券送給你 🎁', detail: D.HOLIDAY_CARDS[r.key].title, at: now(), read: false });
    }
    await ticketOnce(`fest-${k}`, r.to, '節日禮物');
  }
  if (typeof extraHolidayDrops === 'function') await extraHolidayDrops();
}

// ---------- 進入空間 ----------
function enterCouple(cid) {
  S.cid = cid;
  renderShell();
  let first = true;
  S.unsubs.push(S.store.watchCouple(cid, (c) => {
    if (!c) { toast('找不到這個空間'); return; }
    S.couple = c;
    dexPersonal(c);   // 圖鑑各算各的（11/23）
    if (first) { first = false; maybeSeed(); holidayDrops(); }
    else maybeSeed();
    render();
  }));
  for (const name of COLS) {
    S.unsubs.push(col(name).watch((arr) => { S.d[name] = arr; onData(name); if (name === 'pool') cleanPool(arr); render(); }));
  }
}

// 把已經從預設卡池拿掉的卡，從現有空間的卡池刪掉（自己新增的不會動）
async function cleanPool(arr) {
  for (const p of arr) if (p.by === 'sys' && D.POOL_REMOVED.includes(p.title)) await col('pool').remove(p.id);
  await syncPool(arr);
}
// 卡池升級：只補上「比這個空間版本新」的預設卡，被你們刪掉的舊卡不會再跑回來
let poolSyncing = false;
async function syncPool(arr) {
  if (poolSyncing || !S.couple) return;
  const old = S.couple.poolVer || 1;
  if (old >= D.POOL_VERSION) return;
  poolSyncing = true;
  try {
    const ok = await S.store.coupleTx(S.cid, (c) => ((c.poolVer || 1) >= D.POOL_VERSION ? null : { poolVer: D.POOL_VERSION }));
    if (!ok) return;
    const have = new Set(arr.map((p) => p.title));
    const add = D.POOL.filter((p) => (p.v || 1) > old && !have.has(p.title));
    for (const p of add) await col('pool').add({ ...p, by: 'sys', at: now() });
    if (add.length) toast(`扭蛋卡池新增了 ${add.length} 張卡 🎰`);
  } finally { poolSyncing = false; }
}

function onData(name) {
  if (name === 'events') {
    for (const e of S.d.events) {
      if (e.to !== me() || e.read || S.seenEvents.has(e.id)) continue;
      S.seenEvents.add(e.id);
      if (e.at > S.started) {
        toast(e.text);
        if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
          try { new Notification('兩人遊樂園', { body: e.text, tag: e.id }); } catch (err) {}
        }
      }
    }
  }
  if (name === 'deposits') checkFund();
  if (name === 'trips') checkTravelDrops();
  if (!S.backupChecked && S.couple && COLS.every((c) => S.d[c])) { S.backupChecked = true; setTimeout(maybeAutoBackup, 3000); }
  scheduleAchievements();
}

// ---------- 登入畫面 ----------
function renderLogin() {
  let signup = false;
  const draw = () => {
    $('#app').innerHTML = `<div class="auth-wrap">
      <div class="auth-logo"><span class="lg"><img src="logo.svg" alt=""></span><h1>兩人遊樂園</h1><p>只屬於我們兩個的遊樂園</p></div>
      <div class="card">
        <label>Email</label><input id="em" type="email" autocomplete="email" placeholder="you@example.com">
        <label>密碼（至少 6 個字）</label><input id="pw" type="password" autocomplete="${signup ? 'new-password' : 'current-password'}">
        <button class="btn block mt" id="go">${signup ? '註冊' : '登入'}</button>
        <div class="row mt" style="justify-content:space-between">
          <button class="link" id="sw">${signup ? '已經有帳號？登入' : '第一次來？註冊'}</button>
          ${signup ? '' : '<button class="link" id="fg">忘記密碼</button>'}
        </div>
      </div></div>`;
    $('#sw').onclick = () => { signup = !signup; draw(); };
    $('#fg') && ($('#fg').onclick = async () => {
      const e = $('#em').value.trim(); if (!e) return toast('先填 Email');
      try { await S.store.auth.reset(e); toast('重設密碼信寄出了，去信箱看看'); } catch (err) { toast(authErr(err)); }
    });
    $('#go').onclick = async () => {
      const e = $('#em').value.trim(), p = $('#pw').value;
      if (!e || p.length < 6) return toast('Email 和密碼（至少 6 個字）都要填');
      $('#go').disabled = true;
      try { signup ? await S.store.auth.signUp(e, p) : await S.store.auth.signIn(e, p); }
      catch (err) { toast(authErr(err)); $('#go').disabled = false; }
    };
  };
  draw();
}
function authErr(err) {
  const c = err.code || '';
  if (c.includes('invalid-credential') || c.includes('wrong-password') || c.includes('user-not-found')) return 'Email 或密碼不對';
  if (c.includes('email-already-in-use')) return '這個 Email 已經註冊過了，直接登入吧';
  if (c.includes('invalid-email')) return 'Email 格式不對';
  if (c.includes('weak-password')) return '密碼太短了';
  if (c.includes('operation-not-allowed')) return 'Firebase 還沒打開「電子郵件/密碼」登入，請看教學第 3 步';
  return '登入失敗：' + (err.message || c);
}

// ---------- 第一次設定（建立或加入空間） ----------
// 掃 QR code 進來的網址會帶 ?join=邀請碼，加入時自動填好
function joinFromUrl() { const c = (new URLSearchParams(location.search).get('join') || '').trim().toUpperCase(); return /^[A-Z0-9]{6}$/.test(c) ? c : ''; }
function renderOnboard() {
  const p = { nick: '', role: 'her', av: 'girl', emoji: '👧', bday: D.DEFAULT_DATES.herBirthday, spice: 1 };
  const draw = () => {
    $('#app').innerHTML = `<div class="auth-wrap">
      <div class="auth-logo"><span class="lg"><img src="logo.svg" alt=""></span><h1>歡迎光臨</h1><p>先介紹一下你自己</p></div>
      <div class="card">
        <label>你的暱稱</label><input id="nk" maxlength="12" placeholder="對方在 app 裡看到的名字" value="${esc(p.nick)}">
        <label>你是</label>
        <div class="role-pick">
          <button data-role="her" class="${p.role === 'her' ? 'on' : ''}"><span class="av av-lg">${avatarSVG('girl')}</span>女生</button>
          <button data-role="him" class="${p.role === 'him' ? 'on' : ''}"><span class="av av-lg">${avatarSVG('boy')}</span>男生</button>
        </div>
        <label>你的生日（月-日）</label><input id="bd" placeholder="03-16" value="${esc(p.bday)}" inputmode="numeric">
      </div>
      <div class="card">
        <h3><i data-ic="castle"></i> 建立我們的遊樂園</h3>
        <p class="small muted" style="margin:0 0 8px">建立後會拿到一組邀請碼，傳給對方輸入就配對好了。</p>
        <div class="toggle"><label class="switch"><input type="checkbox" id="sb" checked><span></span></label><span class="small">把「生日系列」卡組送給對方（對方加入時會收到）</span></div>
        <button class="btn block mt" id="mk">建立空間</button>
      </div>
      <div class="card">
        <h3><i data-ic="key"></i> 我有邀請碼</h3>
        <input id="cd" placeholder="輸入 6 碼邀請碼" maxlength="6" value="${esc(joinFromUrl())}" style="text-transform:uppercase;letter-spacing:.2em;font-weight:800">${joinFromUrl() ? '<p class="small" style="margin:6px 0 0;color:var(--accent)">已經幫你填好對方的邀請碼了，註冊好按「加入」就可以</p>' : ''}
        <button class="btn ghost block mt" id="jn">加入</button>
      </div>
      <button class="link center" id="so" style="margin-top:4px">登出</button>
    </div>`;
    $$('[data-role]').forEach((b) => b.onclick = () => {
      p.nick = $('#nk').value; p.role = b.dataset.role;
      p.emoji = p.role === 'him' ? '👦' : '👧'; p.av = p.role === 'him' ? 'boy' : 'girl';
      // 生日：自己改過就保留，還是預設值才換成另一個人的預設生日
      const typed = $('#bd').value.trim();
      const defs = [D.DEFAULT_DATES.hisBirthday, D.DEFAULT_DATES.herBirthday, ''];
      p.bday = defs.includes(typed) ? (p.role === 'him' ? D.DEFAULT_DATES.hisBirthday : D.DEFAULT_DATES.herBirthday) : typed;
      draw();
    });
    const collect = () => {
      p.nick = $('#nk').value.trim(); p.bday = $('#bd').value.trim();
      if (!p.nick) { toast('先取一個暱稱'); return false; }
      if (!/^\d{2}-\d{2}$/.test(p.bday)) { toast('生日格式是 月-日，例如 03-16'); return false; }
      return true;
    };
    $('#mk').onclick = async () => {
      if (!collect()) return;
      $('#mk').disabled = true;
      try {
        let cid = makeCode();
        while (await S.store.getCouple(cid)) cid = makeCode();
        await S.store.createCouple(cid, newCoupleData(me(), { ...p }, $('#sb').checked));
        await S.store.setUser(me(), { coupleId: cid });
        await seedPool(cid);
        await welcomeGift(cid, me());
        enterCouple(cid);
        setTimeout(() => ACT.invite(), 400);
      } catch (e) { console.error(e); toast('建立失敗：' + e.message); $('#mk').disabled = false; }
    };
    $('#jn').onclick = async () => {
      if (!collect()) return;
      const code = $('#cd').value.trim().toUpperCase();
      if (code.length !== 6) return toast('邀請碼是 6 碼');
      $('#jn').disabled = true;
      try {
        const c = await S.store.getCouple(code);
        if (!c) { toast('找不到這組邀請碼'); $('#jn').disabled = false; return; }
        if (!c.members.includes(me())) {
          if (c.members.length >= 2) { toast('這個空間已經有兩個人了'); $('#jn').disabled = false; return; }
          // 新手禮 40 點在加入那一刻由 joinFreshStart 統一發（這裡不再發入園禮，免得變成 60 點）
          await S.store.updateCouple(code, { members: [...c.members, me()], [`profiles.${me()}`]: { ...p } });
        }
        await S.store.setUser(me(), { coupleId: code });
        enterCouple(code);
        setTimeout(() => { confetti(); toast('配對成功！歡迎光臨兩人遊樂園 🎡'); }, 500);
      } catch (e) { console.error(e); toast('加入失敗：' + e.message); $('#jn').disabled = false; }
    };
    $('#so').onclick = () => S.store.auth.signOut();
  };
  draw();
}

ACT.invite = () => {
  const code = S.cid;
  const m = openModal(`${mhead('邀請對方')}
    <p class="muted small" style="margin-top:0">請對方打開這個 app、註冊後輸入這組邀請碼：</p>
    <div class="code-box">${esc(code)}</div>
    <div class="btn-row"><button class="btn ghost" id="cp">複製</button><button class="btn" id="sh">傳給對方</button></div>`, { center: true });
  const text = `來跟我一起玩「兩人遊樂園」🎡\n網址：${location.href.split('#')[0]}\n邀請碼：${code}`;
  $('#cp', m).onclick = async () => { try { await navigator.clipboard.writeText(text); toast('複製好了'); } catch (e) { toast('複製失敗，請手動抄下邀請碼'); } };
  $('#sh', m).onclick = async () => { if (navigator.share) { try { await navigator.share({ text }); } catch (e) {} } else $('#cp', m).click(); };
};

// ---------- 外框 ----------
const TABS = [
  { id: 'home', icon: '<i data-ic="home"></i>', name: '首頁' },
  { id: 'wallet', icon: '<i data-ic="ticket"></i>', name: '票夾' },
  { id: 'play', icon: '<i data-ic="gacha"></i>', name: '遊樂區' },
  { id: 'travel', icon: '<i data-ic="map"></i>', name: '約會' },
  { id: 'memory', icon: '<i data-ic="clock"></i>', name: '回憶' },
];
function renderShell() {
  $('#app').innerHTML = `<header class="topbar" id="top"></header><main id="main"></main><nav class="nav" id="nav"></nav>
    ${S.store.mode === 'demo' ? '<div class="demo-bar" id="demobar"></div>' : ''}`;
}
let rq = false;
function render() {
  if (rq) return; rq = true;
  requestAnimationFrame(() => { rq = false; doRender(); });
}
function doRender() {
  if (!S.couple || !$('#main')) return;
  const a = document.activeElement;
  if (a && a.closest && a.closest('#main') && /INPUT|TEXTAREA|SELECT/.test(a.tagName)) { S.deferRender = true; renderTop(); renderNav(); return; }
  setSection(S.tab);
  dexResetOnce();
  if (typeof lookTick === 'function') lookTick();
  const busy = document.querySelector('.anniv-intro, .tour, .story');
  if (!busy && typeof missRain === 'function') missRain();
  if (!busy && typeof redeemPopup === 'function') redeemPopup();
  if (typeof pokeCheck === 'function') pokeCheck();
  if (typeof pruneOld === 'function' && (S.couple?.members || []).length > 1) setTimeout(pruneOld, 5000);
  if (typeof schedDeliver === 'function' && (S.couple?.members || []).length > 1) schedDeliver();
  { const dd = typeof todayDaily === 'function' && todayDaily(), p = partner(); if (dd && dd.answers && p && dd.answers[me()] && dd.answers[p]) { const w = dailyCollide(dd.answers[me()], dd.answers[p]); if (w && !(S.couple.drops || {})[`dmatch-${dkey()}`]) dailyCollideBonus(w); } }
  if (S.tab !== 'home') document.querySelectorAll('.cat-stroll').forEach((x) => x.remove());
  const A = annivInfo(); document.documentElement.dataset.anniv = A.is ? '1' : '';
  renderTop(); renderNav(); renderMain();
  setTimeout(catStroll, 2500 + Math.random() * 4000);
  if (A.is) { annivIntro(); annivRibbon(); }
  // 順序：週年動畫 → 導覽 → 生日卡（前一個還開著就先不跳下一個）
  setTimeout(() => {
    if (document.querySelector('.anniv-intro, .tour, .story')) return;
    if (tourNeeded()) startTour();
    else if (localStorage.getItem(`park-tour-${me()}`)) bdayReveal();
  }, 1200);
}
document.addEventListener('focusout', () => setTimeout(() => {
  const a = document.activeElement;
  if (S.deferRender && !(a && a.closest && a.closest('#main') && /INPUT|TEXTAREA|SELECT/.test(a.tagName))) { S.deferRender = false; render(); }
}, 120));

const unreadEvents = () => list('events').filter((e) => e.to === me() && !e.read);
function renderTop() {
  const top = $('#top'); if (!top) return;
  const t = document.documentElement.dataset.theme;
  const mode = themeMode();
  const n = unreadEvents().length;
  const tk = tickets(me());
  top.innerHTML = `
    <div class="brand"><i data-ic="ferris"></i> 兩人遊樂園</div>
    <button class="pill pill2" data-act="pointsLog"><span><i data-ic="coin"></i>${balance(me())}</span>${tk ? `<span><i data-ic="ticket"></i>${tk}</span>` : ''}</button>
    ${typeof hotMoonHTML === 'function' ? hotMoonHTML() : ''}
    <button class="icon-btn" data-act="theme" title="日夜模式">${mode === 'auto' ? '<i data-ic="candle"></i>' : t === 'day' ? '<i data-ic="sun"></i>' : '<i data-ic="moon"></i>'}</button>
    <button class="icon-btn" data-act="inbox"><i data-ic="bell"></i>${n ? `<span class="badge-dot">${n > 9 ? '9+' : n}</span>` : ''}</button>
    <button class="icon-btn" data-act="settings"><i data-ic="gear"></i></button>`;
  const db = $('#demobar');
  if (db) db.innerHTML = `試玩模式：現在是「${esc(nick(me()))}」 <button data-act="demoSwitch">切換成${esc(nick(partner()))}</button>`;
}
function navBadges() {
  const b = { home: homeTodos().length, wallet: 0, play: 0, travel: 0, memory: 0 };
  b.wallet = list('cards').filter((c) => c.owner === me() && !c.scratched).length + list('wishes').filter((w) => w.status === 'pending' && w.by !== me()).length;
  const q = todayQuiz(); if (q && !(q.answers || {})[me()]) b.play = 1;
  b.memory = list('capsules').filter((c) => c.openAt <= now() && !(c.opened || {})[me()]).length;
  return b;
}
function renderNav() {
  const nav = $('#nav'); if (!nav) return;
  const b = navBadges();
  nav.innerHTML = TABS.map((t) => `<button class="${S.tab === t.id ? 'on' : ''}" data-act="tab" data-tab="${t.id}">
    <span class="ni">${t.icon}</span>${t.name}${b[t.id] ? `<span class="badge-dot">${b[t.id]}</span>` : ''}</button>`).join('');
}
ACT.tab = (el) => {
  const t = el.dataset.tab;
  if (S.tab === t) {
    // 11/24：在收藏館（或其他小分頁）時再點一次下面的分頁，回到這一頁的第一個小分頁
    const first = { wallet: 'mine', travel: 'plan', memory: 'goals' }[t];
    if (first && S.sub[t] !== first) { S.sub[t] = first; window.scrollTo(0, 0); render(); return; }
    window.scrollTo({ top: 0, behavior: 'smooth' }); return;
  }
  S.tab = t;
  // 切到別的分頁再回來，小分頁回到第一個
  Object.assign(S.sub, { wallet: 'mine', travel: 'plan', memory: 'goals' });
  S.walletFilter = 'ok'; S.hallTab = 'ach';
  window.scrollTo(0, 0);
  render();
};
ACT.sub = (el) => { S.sub[el.dataset.page] = el.dataset.sub; render(); };
ACT.demoSwitch = () => S.store.demo.switch();

const PAGES = {};
function renderMain() {
  const main = $('#main');
  const page = PAGES[S.tab] || PAGES.home;
  main.innerHTML = page.html();
  page.after && page.after(main);
  placeHiddenNotes(main);
}

// ---------- 通知中心 ----------
const EV_ICON = { card: '<i data-ic="ticket"></i>', redeem: '<i data-ic="ticket"></i>', stamp: '<i data-ic="stamp"></i>', miss: '<i data-ic="heart"></i>', mood: '<i data-ic="weather"></i>', wish: '<i data-ic="shooting"></i>', battle: '<i data-ic="swords"></i>', note: '<i data-ic="letter"></i>', capsule: '<i data-ic="hourglass"></i>', fund: '<i data-ic="coins"></i>', trip: '<i data-ic="map"></i>', goal: '<i data-ic="target"></i>', daily: '<i data-ic="chat"></i>', quiz: '<i data-ic="minds"></i>', mystery: '<i data-ic="gift"></i>' };
// 通知分類：票券／互動／旅行回憶／其他
const EV_CAT = { card: 'card', redeem: 'card', mystery: 'card', wish: 'card', wishes: 'card', stamp: 'card',
  miss: 'us', mood: 'us', note: 'us', letter: 'us', poke: 'us', quiz: 'us', daily: 'us', deep: 'us', battle: 'us', battles: 'us',
  trip: 'mem', fund: 'mem', goal: 'mem', capsule: 'mem', date: 'mem' };
const EV_TABS = [['all', '全部'], ['card', '票券'], ['us', '互動'], ['mem', '約會回憶'], ['etc', '其他']];
ACT.inbox = async () => {
  const evs = list('events').filter((e) => e.to === me()).sort((a, b) => b.at - a.at).slice(0, 80);
  const unread = new Set(evs.filter((e) => !e.read).map((e) => e.id));
  let tab = 'all';
  const m = openModal('', {});
  const draw = () => {
    const shown = evs.filter((e) => tab === 'all' || (EV_CAT[e.type] || 'etc') === tab);
    const cnt = (k) => evs.filter((e) => unread.has(e.id) && (k === 'all' || (EV_CAT[e.type] || 'etc') === k)).length;
    m.querySelector('.modal').innerHTML = `${mhead('<i data-ic="bell"></i> 通知')}
      <div class="seg inbox-tabs">${EV_TABS.map(([k, n]) => `<button data-t="${k}" class="${tab === k ? 'on' : ''}">${n}${cnt(k) ? `<span class="it-n">${cnt(k)}</span>` : ''}</button>`).join('')}</div>
      ${shown.length ? shown.map((e) => `<div class="list-row ${unread.has(e.id) ? 'unread' : ''}"><span class="lr-i">${EV_ICON[e.type] || '<i data-ic="sparkle"></i>'}</span>
        <div class="grow">${esc(e.text)}${e.detail ? `<div class="small muted">${esc(e.detail)}</div>` : ''}</div><span class="when">${ago(e.at)}</span></div>`).join('')
        : '<div class="empty"><span class="big"><i data-ic="bell"></i></span>這裡還沒有通知</div>'}`;
    $$('.inbox-tabs button', m).forEach((b) => b.onclick = () => { tab = b.dataset.t; draw(); });
  };
  draw();
  // 打開就算看過了（畫面上的未讀標記留到關掉為止）
  for (const e of evs) if (!e.read) col('events').update(e.id, { read: true });
  m._onClose = () => render();
};

ACT.pointsLog = () => {
  const ps = list('points').filter((p) => p.uid === me()).sort((a, b) => b.at - a.at).slice(0, 80);
  openModal(`${mhead('<i data-ic="coin"></i> 我的點數')}
    <div class="row" style="gap:14px;margin-bottom:10px">
      <div class="card grow center" style="margin:0"><div class="fund-num">${balance(me())}</div><div class="small muted">點數</div></div>
      <div class="card grow center" style="margin:0"><div class="fund-num">${tickets(me())}</div><div class="small muted">扭蛋券</div></div>
    </div>
    <p class="small muted">點數可以拿來扭蛋（${D.POINTS.gachaCost} 點一次）。蓋章、每週任務、默契問答、每日一問、年度清單、旅行足跡都能賺點數。</p>
    ${ps.map((p) => `<div class="list-row"><span class="grow">${esc(p.reason)}</span><b style="color:${p.amt >= 0 ? 'var(--accent)' : 'var(--muted)'}">${p.amt >= 0 ? '+' : ''}${p.amt}</b><span class="when">${ago(p.at)}</span></div>`).join('') || '<div class="empty">還沒有紀錄</div>'}`);
};

// ---------- 設定 ----------
ACT.settings = () => {
  const p = prof(me());
  const c = S.couple;
  const m = openModal(`${mhead('<i data-ic="gear"></i> 設定')}
    <details class="card set-sec"><summary><h3>我的資料</h3><span class="set-ch">›</span></summary><div class="set-body">
      <label>頭像</label>
      <div class="av-grid" id="s-av">${avatarPickerHTML(p.av)}</div>
      <div class="av-emoji-row ${p.av && AVATARS[p.av] ? '' : 'on'}" id="s-emr"><span>或是用一個 Emoji 當頭像</span><input id="s-em" maxlength="2" value="${esc(p.emoji || '')}" placeholder="🙂" aria-label="Emoji 頭像"></div>
      <label>暱稱</label><input id="s-nk" maxlength="12" value="${esc(p.nick || '')}">
      <label>我的生日（月-日）</label><input id="s-bd" value="${esc(p.bday || '')}" placeholder="03-16">
      <label>我們的黑貓叫什麼名字</label><input id="s-pn" maxlength="10" value="${esc((c.pet && c.pet.name) || '小小黑')}">
    </div></details>
    <details class="card set-sec"><summary><h3>我們</h3><span class="set-ch">›</span></summary><div class="set-body">
      <label>在一起的日子</label><input id="s-an" type="date" value="${esc(c.dates?.anniversary || '')}">
      <label>尺度上限（兩人都打開才會出現更高的等級）</label>
      <div class="seg" id="s-sp">${[1, 2, 3].map((l) => `<button data-l="${l}" class="${(p.spice || 1) === l ? 'on' : ''}">${spiceIc(l)} ${D.SPICE[l].label}</button>`).join('')}</div>
      <p class="small muted" style="margin:0" id="s-lv">目前兩人共同等級：${spiceIc(spiceLevel())} ${D.SPICE[spiceLevel()].label}</p>
      ${typeof hotOn === 'function' && hotOn() ? `<div class="list-row" data-act="hotPin" style="margin-top:6px"><span class="lr-i"><i data-ic="lock"></i></span><span class="grow">火辣區密碼<div class="small muted">${c.hot?.pin ? '已設定，兩個人共用' : '還沒設定'}</div></span>›</div>` : ''}
    </div></details>
    <details class="card set-sec"><summary><h3><i data-ic="sparkle"></i> 配色主題</h3><span class="set-ch">›</span></summary><div class="set-body">
      <p class="small muted" style="margin:0 0 10px">只會改變你這支手機的樣子，每個分頁會有自己的主色</p>
      <div class="pal-grid" id="s-pal">${Object.entries(PALETTES).map(([k, p]) => `<button data-p="${k}" class="${paletteId() === k ? 'on' : ''}"><span class="pal-sw">${p.sw.map((c) => `<i style="background:${c}"></i>`).join('')}</span><b>${p.name}</b><small>${p.desc}</small></button>`).join('')}</div>
    </div></details>
    <button class="btn block" id="s-save">儲存</button>
    <details class="card set-sec mt"><summary><h3><i data-ic="violin"></i> 聲音</h3><span class="set-ch">›</span></summary><div class="set-body">
      <div class="list-row" id="s-sfx"><span class="lr-i"><i data-ic="bell"></i></span><span class="grow">音效<div class="small muted">翻卡、刮卡、兌換時的小聲音</div></span><label class="switch"><input type="checkbox" id="s-sfx-in" ${sfxOn() ? 'checked' : ''}><span></span></label></div>
      <div class="list-row" id="s-bgm"><span class="lr-i"><i data-ic="violin"></i></span><span class="grow">背景音樂<div class="small muted">白天鋼琴、晚上 Lo-fi</div></span><label class="switch"><input type="checkbox" id="s-bgm-in" ${bgmEnabled() ? 'checked' : ''}><span></span></label></div>
      <div class="bgm-vol ${bgmEnabled() ? '' : 'off'}" id="s-bgm-v"><span class="small muted">音量</span><input type="range" min="5" max="100" step="5" id="s-bgm-vol" value="${Math.round(bgmVol() * 100)}"></div>
    </div></details>
    <details class="card set-sec"><summary><h3>更多</h3><span class="set-ch">›</span></summary><div class="set-body">
      <div class="list-row" data-act="guide"><span class="lr-i"><i data-ic="book"></i></span><span class="grow">功能介紹<div class="small muted">每個地方可以玩什麼、點數和罐罐怎麼拿</div></span>›</div>
      <div class="list-row" data-act="tourReplay"><span class="lr-i"><i data-ic="sparkle"></i></span><span class="grow">重看新手導覽</span>›</div>
      <div class="list-row" data-act="poolManager"><span class="lr-i"><i data-ic="gacha"></i></span><span class="grow">管理扭蛋卡池</span>›</div>
      <div class="list-row" data-act="backup"><span class="lr-i"><i data-ic="cloud"></i></span><span class="grow">備份與還原<div class="small muted">每週自動備份，也可以存一份到手機</div></span>›</div>
${(c.members || []).length < 2 ? `<div class="list-row" data-act="invite"><span class="lr-i"><i data-ic="key"></i></span><span class="grow">邀請碼 ${esc(S.cid)}</span>›</div>` : ''}
      <div class="list-row" id="s-noti"><span class="lr-i"><i data-ic="bell"></i></span><span class="grow">開啟瀏覽器通知<div class="small muted">開著 app 的時候才收得到，內容一律低調</div></span>›</div>
      <div class="list-row" data-act="theme"><span class="lr-i"><i data-ic="candle"></i></span><span class="grow">切換日夜模式（自動／白天／夜晚）</span>›</div>
      ${S.store.mode === 'demo'
        ? `<div class="list-row" data-act="demoSwitch"><span class="lr-i"><i data-ic="swap"></i></span><span class="grow">切換成對方身份</span>›</div>
           <div class="list-row" id="s-reset"><span class="lr-i"><i data-ic="trash"></i></span><span class="grow">清空試玩資料</span>›</div>`
        : `<div class="list-row" id="s-out"><span class="lr-i"><i data-ic="logout"></i></span><span class="grow">登出</span>›</div>`}
    </div></details>
    <p class="center small muted">兩人遊樂園 · 做給我們兩個</p>`);
  let sp = p.spice || 1;
  $('#s-bgm-in', m).onchange = (e) => { localStorage.setItem('park-bgm', e.target.checked ? 'on' : 'off'); $('#s-bgm-v', m).classList.toggle('off', !e.target.checked); e.target.checked ? bgmStart() : bgmStop(); };
  $('#s-bgm-vol', m).oninput = (e) => { localStorage.setItem('park-bgm-vol', e.target.value); bgmSetVol(); };
  $('#s-sfx-in', m).onchange = (e) => { localStorage.setItem('park-sfx', e.target.checked ? 'on' : 'off'); if (e.target.checked) sfx('chime'); };
  $$('#s-pal button', m).forEach((b) => b.onclick = () => {
    localStorage.setItem('park-palette', b.dataset.p); applyTheme();
    $$('#s-pal button', m).forEach((x) => x.classList.toggle('on', x === b));
  });
  let av = p.av && AVATARS[p.av] ? p.av : '';
  const avPick = (k) => { av = k; $$('#s-av button[data-av]', m).forEach((x) => x.classList.toggle('on', x.dataset.av === k)); };
  $$('#s-av button', m).forEach((b) => b.onclick = () => { avPick(b.dataset.av); if (!b.dataset.av) $('#s-em', m).focus(); });
  $('#s-em', m).oninput = () => avPick('');
  $$('#s-sp button', m).forEach((b) => b.onclick = () => { sp = +b.dataset.l; $$('#s-sp button', m).forEach((x) => x.classList.toggle('on', x === b)); });
  $('#s-save', m).onclick = async () => {
    const bd = $('#s-bd', m).value.trim();
    if (bd && !/^\d{2}-\d{2}$/.test(bd)) return toast('生日格式是 月-日，例如 03-16');
    await S.store.updateCouple(S.cid, {
      [`profiles.${me()}`]: { ...p, nick: $('#s-nk', m).value.trim() || p.nick, av, emoji: $('#s-em', m).value.trim() || p.emoji, bday: bd || p.bday, spice: sp },
      'dates.anniversary': $('#s-an', m).value || c.dates?.anniversary,
      'pet.name': ($('#s-pn', m).value.trim() || '小小黑').slice(0, 10),
    });
    // 儲存後留在設定頁，按鈕短暫顯示「已儲存」
    const btn = $('#s-save', m);
    btn.textContent = '已儲存 ✓'; btn.disabled = true;
    setTimeout(() => { btn.textContent = '儲存'; btn.disabled = false; const lv = $('#s-lv', m); if (lv) lv.innerHTML = `目前兩人共同等級：${spiceIc(spiceLevel())} ${D.SPICE[spiceLevel()].label}`; }, 1200);
  };
  $('#s-noti', m).onclick = async () => {
    if (!('Notification' in window)) return toast('這個瀏覽器不支援通知。iPhone 要先「加入主畫面」再從主畫面打開');
    const r = await Notification.requestPermission();
    toast(r === 'granted' ? '通知開好了 🔔' : '沒有開啟通知');
  };
  $('#s-reset', m) && ($('#s-reset', m).onclick = async () => { if (await confirmBox('清空所有試玩資料？')) S.store.demo.reset(); });
  $('#s-out', m) && ($('#s-out', m).onclick = async () => { if (await confirmBox('確定要登出？')) { closeAll(); S.store.auth.signOut(); } });
};

ACT.poolManager = () => {
  const draw = (m) => {
    // 還沒抽到過的卡藏起來（兩個人任一人抽到就公開；自己加的自己看得到）
    const drawn = new Set(list('gacha').filter((g) => g.how === 'gacha').map((g) => g.title));
    const all = list('pool');
    const pool = all.filter((p) => p.by === me() || drawn.has(p.title)).sort((a, b) => D.RARITY_ORDER.indexOf(a.rarity) - D.RARITY_ORDER.indexOf(b.rarity) || (a.at || 0) - (b.at || 0));
    const hidden = all.length - pool.length;
    const html = `${mhead('扭蛋卡池')}
      <p class="small muted" style="margin-top:0">扭蛋時會從這裡隨機抽一張，抽到的卡由對方負責兌現。點一張卡就能編輯，你們兩個都可以新增。</p>
      <button class="btn block" id="pm-add">＋ 新增一張到卡池</button>
      ${hidden ? `<div class="pm-hidden"><span class="pm-q">${avQuestionSVG()}</span><span>還有 <b>${hidden}</b> 張還沒抽到，抽到才會出現在這裡</span></div>` : ''}
      <div class="mt">${pool.map((p) => `<div class="list-row pool-row" data-edit="${p.id}">
        <div class="emb-${p.rarity}" style="width:44px;height:44px;flex:none">${emblemMini(p)}</div>
        <div class="grow"><div><span style="color:var(--r-${p.rarity.toLowerCase()});font-weight:800;font-family:var(--serif)">${p.rarity}</span>　<b>${esc(p.title)}</b></div>
          <div class="small muted">${esc(p.desc || '')}${p.desc ? ' · ' : ''}${D.SPICE[p.spice || 1].label}${p.mystery ? ' · 神秘盲盒' : ''}${poolGiver(p) ? ` · 只限${poolGiver(p) === 'him' ? '男生' : '女生'}兌現` : ''}</div></div>
        <span class="muted" style="font-size:18px">›</span></div>`).join('')}</div>`;
    if (!m) m = openModal(html); else m.querySelector('.modal').innerHTML = html;
    $('#pm-add', m).onclick = () => cardEditor({ title: '新增到卡池', pool: true }, async (t) => { await col('pool').add({ ...t, by: me(), at: now() }); toast('加進卡池了'); setTimeout(() => draw(m), 300); });
    $$('[data-edit]', m).forEach((row) => row.onclick = () => {
      const p = list('pool').find((x) => x.id === row.dataset.edit); if (!p) return;
      cardEditor({ title: '編輯卡池的卡', pool: true, preset: { title: p.title, desc: p.desc || '', rarity: p.rarity, spice: p.spice || 1, mystery: !!p.mystery, mark: p.mark || '', giver: poolGiver(p) }, onDelete: async () => { await col('pool').remove(p.id); toast('從卡池刪掉了'); setTimeout(() => draw(m), 300); } },
        async (t) => { await col('pool').update(p.id, { title: t.title, desc: t.desc, rarity: t.rarity, spice: t.spice, mystery: t.mystery, mark: t.mark || '', giver: t.giver || '' }); toast('改好了'); setTimeout(() => draw(m), 300); });
    });
    return m;
  };
  draw();
};

// 共用：卡片編輯器
// 發卡時可以選的配色
const CARD_PALS = [['', '自動'], ['N', '薄荷'], ['R', '天藍'], ['SR', '紫藤'], ['SSR', '金'], ['C', '櫻粉'], ['F-valentine', '玫瑰'], ['F-confess', '桃紅'], ['F-qixi', '夜空'], ['F-moon', '月光'], ['F-halloween', '南瓜'], ['F-eve', '朱紅'], ['F-xmas', '聖誕'], ['F-pet', '小小黑']];
function cardEditor({ title, pool = false, give = false, preset = {}, onDelete = null }, onSave) {
  const t = { title: '', desc: '', rarity: 'N', spice: 1, qty: 1, mystery: false, secret: '', limit: 'none', mark: '', ...preset };
  const m = openModal(`${mhead(esc(title))}
    <label>卡片名稱</label><input id="ce-t" maxlength="24" value="${esc(t.title)}" placeholder="例如：按摩 15 分鐘">
    <label>說明（可以不寫）</label><input id="ce-d" maxlength="60" value="${esc(t.desc)}" placeholder="一句話補充">
    <div class="row" style="align-items:flex-end">
      <div class="grow"><label>代表字（可不填，不填會自動挑）</label><input id="ce-k" maxlength="4" value="${esc(t.mark)}" placeholder="一個字，例如：擁" style="font-family:var(--serif);font-size:18px;font-weight:800"></div>
      ${give ? '' : `<div class="emb-${t.rarity}" id="ce-pv" style="width:60px;height:60px;flex:none">${emblemMini(t)}</div>`}
    </div>
    <label>稀有度</label>
    <div class="rarity-pick" id="ce-r">${D.RARITY_ORDER.map((r) => `<button data-r="${r}" style="--rc:var(--r-${r.toLowerCase()})" class="${t.rarity === r ? 'on' : ''}">${r}</button>`).join('')}</div>
    <label>尺度</label>
    <div class="seg" id="ce-s">${[1, 2, 3].map((l) => `<button data-l="${l}" class="${t.spice === l ? 'on' : ''}">${spiceIc(l)} ${D.SPICE[l].label}</button>`).join('')}</div>
    ${give ? `<label>卡面</label>
    <div class="ce-face"><div class="ce-face-pv" id="ce-fpv"></div><div class="ce-face-opts">
      <div class="small muted">外框</div><div class="ce-chips" id="ce-fr">${[['', '自動'], [0, '光輪'], [1, '八角'], [2, '花窗'], [3, '雙方']].map(([v, n]) => `<button data-v="${v}" class="${v === '' ? 'on' : ''}">${n}</button>`).join('')}</div>
      <div class="small muted">底紋</div><div class="ce-chips" id="ce-pt">${[['', '自動'], ...EMB_KINDS.map((k) => [k, EMB_NAMES[k]])].map(([v, n]) => `<button data-v="${v}" class="${v === '' ? 'on' : ''}">${n}</button>`).join('')}</div>
      <div class="small muted">配色</div><div class="ce-sw" id="ce-pl">${CARD_PALS.map(([v, n]) => `<button data-v="${v}" class="${v === '' ? 'on' : ''} ${v ? 'emb-' + v : ''}" title="${n}"><span></span><small>${n}</small></button>`).join('')}</div>
    </div></div>` : ''}
    ${pool ? `<label>誰來兌現</label><select id="ce-g"><option value="">兩個人都可以</option><option value="him">只有男生能兌現（只有女生扭得到）</option><option value="her">只有女生能兌現（只有男生扭得到）</option></select>` : ''}
    ${give ? `<div class="row"><div class="grow"><label>張數</label><input id="ce-q" type="number" min="1" max="20" value="${t.qty}"></div>
      <div class="grow"><label>限時</label><select id="ce-l"><option value="none">不限時</option><option value="7d">7 天內有效</option><option value="weekend">週末限定</option><option value="today">今天限定</option></select></div></div>` : ''}
    ${give ? `<label>什麼時候送到</label><div class="ce-chips" id="ce-when"><button data-v="" class="on">現在</button>${schedChips().map(([d, n]) => `<button data-v="${d}">${esc(n)}<small>${+d.slice(5, 7)}/${+d.slice(8)}</small></button>`).join('')}<button data-v="pick">選日期</button></div><input id="ce-wd" type="date" class="hidden" min="${dkey(new Date(Date.now() + 86400000))}">` : ''}
    <div class="toggle mt"><label class="switch"><input type="checkbox" id="ce-m" ${t.mystery ? 'checked' : ''}><span></span></label><span class="small"><i data-ic="gift"></i> 神秘盲盒（內容先藏起來，兌換時才揭曉）</span></div>
    <div id="ce-sw" class="${t.mystery && give ? '' : 'hidden'}"><label>盲盒裡的真正內容</label><input id="ce-sec" maxlength="60" placeholder="兌換時才會顯示" value="${esc(t.secret)}"></div>
    <button class="btn block mt" id="ce-ok">${give ? '<i data-ic="letter"></i> 送出' : '儲存'}</button>
    ${onDelete ? '<button class="btn ghost block mt" id="ce-del" style="color:#d4405f">從卡池刪除</button>' : ''}`);
  if (onDelete) $('#ce-del', m).onclick = async () => { if (await confirmBox('確定要從卡池刪掉這張？')) { closeModal(m); await onDelete(); } };
  const face = { frame: null, pat: '', pal: '' };
  const preview = () => {
    const fp = $('#ce-fpv', m);
    if (fp) { const c = { title: $('#ce-t', m).value.trim() || '新卡', rarity: t.rarity, mark: $('#ce-k', m).value.trim(), spice: t.spice, ...face }; fp.className = 'ce-face-pv emb-' + embPalette(c); fp.innerHTML = emblemSVG(c, false); }
    const pv = $('#ce-pv', m); if (!pv) return;
    pv.className = 'emb-' + t.rarity;
    pv.innerHTML = emblemMini({ title: $('#ce-t', m).value.trim() || '新卡', rarity: t.rarity, mark: $('#ce-k', m).value.trim() });
  };
  $('#ce-t', m).addEventListener('input', preview);
  $('#ce-k', m).addEventListener('input', preview);
  $$('#ce-r button', m).forEach((b) => b.onclick = () => { t.rarity = b.dataset.r; $$('#ce-r button', m).forEach((x) => x.classList.toggle('on', x === b)); preview(); });
  $$('#ce-s button', m).forEach((b) => b.onclick = () => { t.spice = +b.dataset.l; $$('#ce-s button', m).forEach((x) => x.classList.toggle('on', x === b)); });
  const pick = (id, key, conv) => $$(`#${id} button`, m).forEach((b) => b.onclick = () => { face[key] = conv(b.dataset.v); $$(`#${id} button`, m).forEach((x) => x.classList.toggle('on', x === b)); preview(); });
  pick('ce-fr', 'frame', (v) => (v === '' ? null : +v)); pick('ce-pt', 'pat', (v) => v); pick('ce-pl', 'pal', (v) => v);
  preview();
  if (give) $$('#ce-when button', m).forEach((b) => b.onclick = () => {
    $$('#ce-when button', m).forEach((x) => x.classList.toggle('on', x === b));
    $('#ce-wd', m).classList.toggle('hidden', b.dataset.v !== 'pick');
    t.sendDay = b.dataset.v === 'pick' ? '' : b.dataset.v; if (b.dataset.v === 'pick') $('#ce-wd', m).focus();
  });
  if (give) $('#ce-wd', m).onchange = (e) => { t.sendDay = e.target.value; };
  $('#ce-m', m).onchange = (e) => { if (give) $('#ce-sw', m).classList.toggle('hidden', !e.target.checked); };
  if (give && preset.limit) $('#ce-l', m).value = preset.limit;
  if (pool && $('#ce-g', m)) $('#ce-g', m).value = preset.giver || '';
  $('#ce-ok', m).onclick = async () => {
    t.title = $('#ce-t', m).value.trim(); t.desc = $('#ce-d', m).value.trim(); t.mystery = $('#ce-m', m).checked; t.mark = Array.from($('#ce-k', m).value.trim())[0] || '';
    if (!t.title) return toast('卡片要有名稱');
    if (pool && $('#ce-g', m)) t.giver = $('#ce-g', m).value;
    if (give) {
      if (face.frame != null) t.frame = face.frame;
      if (face.pat) t.pat = face.pat;
      if (face.pal) t.pal = face.pal;
      t.qty = Math.max(1, Math.min(20, +$('#ce-q', m).value || 1));
      t.secret = t.mystery ? $('#ce-sec', m).value.trim() : '';
      if (t.mystery && !t.secret) return toast('寫一下盲盒裡的內容');
      const l = $('#ce-l', m).value;
      t.expiresAt = 0; t.weekendOnly = false;
      if (l === '7d') t.expiresAt = now() + 7 * 86400000;
      if (l === 'today') { const d = new Date(); d.setHours(23, 59, 59, 999); t.expiresAt = d.getTime(); }
      if (l === 'weekend') t.weekendOnly = true;
    }
    $('#ce-ok', m).disabled = true;
    try { await onSave(t); closeModal(m); } catch (e) { toast('失敗了：' + e.message); $('#ce-ok', m).disabled = false; }
  };
}
