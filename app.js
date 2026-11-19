// ============================================================
//  兩人遊樂園 — 主程式
//  （這個檔案是由 src/ 資料夾裡的分段檔合併而成）
// ============================================================
import { firebaseConfig } from './config.js';
import * as D from './data.js';
import { createStore } from './store.js';

const S = {
  store: null, me: null, cid: null, couple: null, d: {},
  tab: localStorage.getItem('park-tab') || 'home',
  sub: { wallet: 'mine', travel: 'fund', memory: 'goals' },
  unsubs: [], started: Date.now(), seenEvents: new Set(), deferRender: false,
};
const COLS = ['cards', 'events', 'points', 'pool', 'wishes', 'taskDone', 'battles', 'quiz', 'daily',
  'deposits', 'trips', 'goals', 'capsules', 'notes', 'misses', 'gacha', 'memories'];

// ---------- 小工具 ----------
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = (n) => String(n).padStart(2, '0');
const now = () => Date.now();
const dkey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseD = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
function weekKey(d = new Date()) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return `${t.getUTCFullYear()}-W${pad(Math.ceil(((t - y0) / 86400000 + 1) / 7))}`;
}
const fmtDate = (ts) => { const d = new Date(ts); return `${d.getMonth() + 1}/${d.getDate()}`; };
const fmtFull = (ts) => { const d = new Date(ts); return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`; };
function ago(ts) {
  const s = (now() - ts) / 1000;
  if (s < 60) return '剛剛';
  if (s < 3600) return `${Math.floor(s / 60)} 分鐘前`;
  if (s < 86400) return `${Math.floor(s / 3600)} 小時前`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)} 天前`;
  return fmtDate(ts);
}
function hash(str) { let h = 2166136261; for (const c of str) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function shuffled(arr, seed) { const r = rng(seed), a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const sum = (arr, f) => arr.reduce((a, x) => a + (f(x) || 0), 0);
const money = (n) => Number(n || 0).toLocaleString('zh-TW');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const makeCode = () => { const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < 6; i++) s += A[Math.floor(Math.random() * A.length)]; return s; };

// ---------- 情侶空間 ----------
const me = () => S.me.uid;
const partner = () => S.couple?.members?.find((u) => u !== S.me.uid) || null;
const prof = (uid) => S.couple?.profiles?.[uid] || {};
const nick = (uid) => uid === 'sys' ? '遊樂園' : (prof(uid).nick || (uid === me() ? '我' : '對方'));
const avatar = (uid) => uid === 'sys' ? '🎡' : (prof(uid).emoji || (prof(uid).role === 'him' ? '👦' : '👧'));
const spiceLevel = () => {
  const ms = S.couple?.members || [];
  if (!ms.length) return 1;
  return Math.min(...ms.map((u) => prof(u).spice || 1));
};
const balance = (uid) => sum((S.d.points || []).filter((p) => p.uid === uid), (p) => p.amt);
const tickets = (uid) => S.couple?.tickets?.[uid] || 0;
const col = (name) => S.store.col(S.cid, name);
const list = (name) => S.d[name] || [];

async function addPoints(uid, amt, reason, tag = '') {
  if (!uid) return;
  await col('points').add({ uid, amt, reason, tag, by: me(), at: now() });
}
async function notify(to, type, text, detail = '') {
  if (!to) return;
  await col('events').add({ to, by: me(), type, text, detail, at: now(), read: false });
}
async function addTicket(uid, n = 1) {
  await S.store.coupleTx(S.cid, (c) => ({ [`tickets.${uid}`]: Math.max(0, ((c.tickets || {})[uid] || 0) + n) }));
}

function cardDoc(tpl, owner, from, extra = {}) {
  const used = tpl.used || 0;
  return {
    title: tpl.title, desc: tpl.desc || '', rarity: tpl.rarity || 'N',
    owner, from, qty: tpl.qty || 1, used,
    series: tpl.series || '', kind: tpl.kind || 'card',
    mystery: !!tpl.mystery, secret: tpl.secret || '', spice: tpl.spice || 1, mark: tpl.mark || '', fest: tpl.fest || '',
    expiresAt: tpl.expiresAt || 0, weekendOnly: !!tpl.weekendOnly,
    scratched: false, at: now(),
    log: Array.from({ length: used }, () => ({ at: now(), how: 'birthday' })),
    ...extra,
  };
}
async function giveCard(owner, tpl, extra = {}) {
  const from = extra.from || me();
  const id = await col('cards').add(cardDoc(tpl, owner, from, extra));
  if (owner !== me()) await notify(owner, 'card', '你收到一張新票券 🎟️', tpl.title);
  return id;
}
const remaining = (c) => Math.max(0, (c.qty || 1) - (c.used || 0));
const isExpired = (c) => c.expiresAt && c.expiresAt < now() && remaining(c) > 0;
const isWeekend = () => [0, 6].includes(new Date().getDay());

// ---------- 介面小工具 ----------
function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast'; t.textContent = msg;
  $('#toasts').appendChild(t);
  setTimeout(() => t.remove(), 3100);
}
function confetti(n = 70, colors) {
  colors ||= ['#ff6f91', '#ffc75f', '#845ec2', '#4fd1c5', '#f9f871', '#ff9671'];
  for (let i = 0; i < n; i++) {
    const c = document.createElement('div');
    c.className = 'confetti';
    c.style.left = Math.random() * 100 + 'vw';
    c.style.background = pick(colors);
    c.style.setProperty('--dx', (Math.random() * 200 - 100) + 'px');
    c.style.setProperty('--rot', (Math.random() * 1080) + 'deg');
    c.style.animationDuration = (1.8 + Math.random() * 1.6) + 's';
    c.style.animationDelay = (Math.random() * .4) + 's';
    c.style.borderRadius = Math.random() > .5 ? '50%' : '2px';
    document.body.appendChild(c);
    setTimeout(() => c.remove(), 4200);
  }
}
function floaty(x, y, chars = ['💗', '💕', '💖', '❤️', '💘']) {
  for (let i = 0; i < 6; i++) {
    const f = document.createElement('div');
    f.className = 'floaty'; f.textContent = pick(chars);
    f.style.left = (x - 14 + Math.random() * 20) + 'px'; f.style.top = (y - 20) + 'px';
    f.style.setProperty('--dx', (Math.random() * 120 - 60) + 'px');
    f.style.animationDelay = (i * 0.06) + 's';
    document.body.appendChild(f);
    setTimeout(() => f.remove(), 1600);
  }
}
const vibrate = (p) => { try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} };

function openModal(html, { center = false, cls = '', onClose } = {}) {
  const back = document.createElement('div');
  back.className = `modal-back ${center ? 'center' : ''} ${cls}`;
  back.innerHTML = `<div class="modal">${html}</div>`;
  back.addEventListener('click', (e) => { if (e.target === back) closeModal(back); });
  back._onClose = onClose;
  document.body.appendChild(back);
  return back;
}
function closeModal(back) {
  back ||= $$('.modal-back').pop();
  if (!back) return;
  const fn = back._onClose; back._onClose = null;
  back.remove();
  fn && fn();
}
const closeAll = () => $$('.modal-back').forEach((b) => closeModal(b));
const mhead = (title) => `<div class="m-head"><h2>${title}</h2><button class="m-close" data-act="close">✕</button></div>`;
function confirmBox(msg, okText = '確定') {
  return new Promise((res) => {
    const m = openModal(`<div class="center" style="padding:6px 0"><div style="font-size:16px;font-weight:600;white-space:pre-wrap">${esc(msg)}</div>
      <div class="btn-row"><button class="btn ghost" data-r="0">取消</button><button class="btn" data-r="1">${esc(okText)}</button></div></div>`,
      { center: true, onClose: () => res(false) });
    m.querySelectorAll('[data-r]').forEach((b) => b.onclick = () => { m._onClose = null; m.remove(); res(b.dataset.r === '1'); });
  });
}
function promptBox(title, { placeholder = '', value = '', multiline = false, ok = '確定' } = {}) {
  return new Promise((res) => {
    const inp = multiline ? `<textarea id="pb-in" placeholder="${esc(placeholder)}">${esc(value)}</textarea>` : `<input id="pb-in" placeholder="${esc(placeholder)}" value="${esc(value)}">`;
    const m = openModal(`${mhead(esc(title))}${inp}<div class="btn-row"><button class="btn" id="pb-ok">${esc(ok)}</button></div>`, { center: true, onClose: () => res(null) });
    const i = $('#pb-in', m); setTimeout(() => i.focus(), 50);
    $('#pb-ok', m).onclick = () => { const v = i.value.trim(); m._onClose = null; m.remove(); res(v || null); };
  });
}

// ---------- 事件委派 ----------
const ACT = {};
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const name = el.dataset.act;
  if (name === 'close') { closeModal(el.closest('.modal-back')); return; }
  const fn = ACT[name];
  if (fn) { e.preventDefault(); Promise.resolve(fn(el, e)).catch((err) => { console.error(err); toast('出了點問題：' + (err.message || err)); }); }
});

// ---------- 主題（日夜模式） ----------
function themeMode() { return localStorage.getItem('park-theme') || 'auto'; }
function applyTheme() {
  const mode = themeMode();
  const h = new Date().getHours();
  const t = mode === 'auto' ? (h >= 6 && h < 18 ? 'day' : 'night') : mode;
  document.documentElement.dataset.theme = t;
  const mc = document.querySelector('meta[name=theme-color]');
  if (mc) mc.content = t === 'day' ? '#fff6f1' : '#150a0f';
  return t;
}
ACT.theme = () => {
  const order = ['auto', 'day', 'night'];
  const next = order[(order.indexOf(themeMode()) + 1) % 3];
  localStorage.setItem('park-theme', next);
  applyTheme();
  toast({ auto: '🕯️ 自動模式：白天甜蜜、晚上燭光', day: '☀️ 白天模式', night: '🌙 夜晚模式' }[next]);
  renderTop();
};
applyTheme();
setInterval(applyTheme, 60000);

// 主畫面圖示（加到主畫面時用）
(function touchIcon() {
  try {
    const c = document.createElement('canvas'); c.width = c.height = 180;
    const g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 180, 180); gr.addColorStop(0, '#ff9ab3'); gr.addColorStop(1, '#c42e52');
    g.fillStyle = gr; g.fillRect(0, 0, 180, 180);
    g.font = '110px serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('🎡', 90, 98);
    const l = document.createElement('link'); l.rel = 'apple-touch-icon'; l.href = c.toDataURL('image/png');
    document.head.appendChild(l);
  } catch (e) {}
})();
// ============================================================
//  啟動、登入、配對、外框
// ============================================================

async function boot() {
  try {
    S.store = await createStore(firebaseConfig);
  } catch (e) {
    console.error(e);
    $('#app').innerHTML = `<div class="auth-wrap"><div class="auth-logo"><span class="lg">🎡</span><h1>連不上 Firebase</h1><p>請檢查 config.js 的設定，或網路是否正常。<br><small>${esc(e.message || e)}</small></p></div></div>`;
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
  await S.store.createCouple(cid, newCoupleData(A, { nick: '寶貝', role: 'her', emoji: '👧', bday: D.DEFAULT_DATES.herBirthday, spice: 3 }, true));
  await S.store.updateCouple(cid, { members: [A, B], [`profiles.${B}`]: { nick: '好寶', role: 'him', emoji: '👦', bday: D.DEFAULT_DATES.hisBirthday, spice: 3 } });
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
    if (r.md !== md || !r.to.length) continue;
    const k = `${y}-${r.key}`;
    const ok = await S.store.coupleTx(S.cid, (x) => (x.drops && x.drops[k] ? null : { [`drops.${k}`]: true }));
    if (!ok) continue;
    for (const u of r.to) {
      await col('cards').add(cardDoc(D.HOLIDAY_CARDS[r.key], u, 'sys'));
      await col('events').add({ to: u, by: 'sys', type: 'card', text: '今天有一張節日限定券送給你 🎁', detail: D.HOLIDAY_CARDS[r.key].title, at: now(), read: false });
    }
  }
}

// ---------- 進入空間 ----------
function enterCouple(cid) {
  S.cid = cid;
  renderShell();
  let first = true;
  S.unsubs.push(S.store.watchCouple(cid, (c) => {
    if (!c) { toast('找不到這個空間'); return; }
    S.couple = c;
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
  if (!S.backupChecked && S.couple && COLS.every((c) => S.d[c])) { S.backupChecked = true; setTimeout(maybeAutoBackup, 3000); }
  scheduleAchievements();
}

// ---------- 登入畫面 ----------
function renderLogin() {
  let signup = false;
  const draw = () => {
    $('#app').innerHTML = `<div class="auth-wrap">
      <div class="auth-logo"><span class="lg">🎡</span><h1>兩人遊樂園</h1><p>只屬於我們兩個的遊樂園</p></div>
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
function renderOnboard() {
  const p = { nick: '', role: 'her', emoji: '👧', bday: D.DEFAULT_DATES.herBirthday, spice: 1 };
  const draw = () => {
    $('#app').innerHTML = `<div class="auth-wrap">
      <div class="auth-logo"><span class="lg">🎡</span><h1>歡迎光臨</h1><p>先介紹一下你自己</p></div>
      <div class="card">
        <label>你的暱稱</label><input id="nk" maxlength="12" placeholder="對方在 app 裡看到的名字" value="${esc(p.nick)}">
        <label>你是</label>
        <div class="role-pick">
          <button data-role="her" class="${p.role === 'her' ? 'on' : ''}"><span>👧</span>女生</button>
          <button data-role="him" class="${p.role === 'him' ? 'on' : ''}"><span>👦</span>男生</button>
        </div>
        <label>你的生日（月-日）</label><input id="bd" placeholder="03-16" value="${esc(p.bday)}" inputmode="numeric">
      </div>
      <div class="card">
        <h3>🏰 建立我們的遊樂園</h3>
        <p class="small muted" style="margin:0 0 8px">建立後會拿到一組邀請碼，傳給對方輸入就配對好了。</p>
        <div class="toggle"><label class="switch"><input type="checkbox" id="sb" checked><span></span></label><span class="small">把「生日系列」卡組送給對方（對方加入時會收到）</span></div>
        <button class="btn block mt" id="mk">建立空間</button>
      </div>
      <div class="card">
        <h3>🔑 我有邀請碼</h3>
        <input id="cd" placeholder="輸入 6 碼邀請碼" maxlength="6" style="text-transform:uppercase;letter-spacing:.2em;font-weight:800">
        <button class="btn ghost block mt" id="jn">加入</button>
      </div>
      <button class="link center" id="so" style="margin-top:4px">登出</button>
    </div>`;
    $$('[data-role]').forEach((b) => b.onclick = () => {
      p.nick = $('#nk').value; p.role = b.dataset.role;
      p.emoji = p.role === 'him' ? '👦' : '👧';
      p.bday = p.role === 'him' ? D.DEFAULT_DATES.hisBirthday : D.DEFAULT_DATES.herBirthday;
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
          await S.store.updateCouple(code, { members: [...c.members, me()], [`profiles.${me()}`]: { ...p } });
          await welcomeGift(code, me());
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
  { id: 'home', icon: '🏠', name: '首頁' },
  { id: 'wallet', icon: '🎟️', name: '票夾' },
  { id: 'play', icon: '🎰', name: '遊樂區' },
  { id: 'travel', icon: '🗺️', name: '旅行' },
  { id: 'memory', icon: '📖', name: '回憶' },
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
  renderTop(); renderNav(); renderMain();
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
    <div class="brand">🎡 兩人遊樂園</div>
    <button class="pill" data-act="pointsLog">🪙 ${balance(me())}${tk ? ` · 🎫${tk}` : ''}</button>
    <button class="icon-btn" data-act="theme" title="日夜模式">${mode === 'auto' ? '🕯️' : t === 'day' ? '☀️' : '🌙'}</button>
    <button class="icon-btn" data-act="inbox">🔔${n ? `<span class="badge-dot">${n > 9 ? '9+' : n}</span>` : ''}</button>
    <button class="icon-btn" data-act="settings">⚙️</button>`;
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
  if (S.tab === t) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
  S.tab = t; localStorage.setItem('park-tab', t);
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
const EV_ICON = { card: '🎟️', redeem: '✂️', stamp: '📮', miss: '💗', mood: '🌦️', wish: '🌠', battle: '⚔️', note: '💌', capsule: '⏳', fund: '💰', trip: '🗺️', goal: '🎯', daily: '💬', quiz: '🧠', mystery: '🎁' };
ACT.inbox = async () => {
  const evs = list('events').filter((e) => e.to === me()).sort((a, b) => b.at - a.at).slice(0, 60);
  openModal(`${mhead('通知')}
    ${evs.length ? evs.map((e) => `<div class="list-row ${e.read ? '' : 'unread'}"><span class="lr-i">${EV_ICON[e.type] || '✨'}</span>
      <div class="grow">${esc(e.text)}${e.detail ? `<div class="small muted">${esc(e.detail)}</div>` : ''}</div><span class="when">${ago(e.at)}</span></div>`).join('')
      : '<div class="empty"><span class="big">🔕</span>還沒有通知</div>'}`);
  for (const e of evs) if (!e.read) col('events').update(e.id, { read: true });
};

ACT.pointsLog = () => {
  const ps = list('points').filter((p) => p.uid === me()).sort((a, b) => b.at - a.at).slice(0, 80);
  openModal(`${mhead('🪙 我的點數')}
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
  const m = openModal(`${mhead('⚙️ 設定')}
    <div class="card">
      <h3>我的資料</h3>
      <div class="row"><div style="width:70px"><label>頭像</label><input id="s-em" maxlength="2" value="${esc(p.emoji || '')}" style="text-align:center;font-size:22px"></div>
      <div class="grow"><label>暱稱</label><input id="s-nk" maxlength="12" value="${esc(p.nick || '')}"></div></div>
      <label>我的生日（月-日）</label><input id="s-bd" value="${esc(p.bday || '')}" placeholder="03-16">
    </div>
    <div class="card">
      <h3>我們</h3>
      <label>在一起的日子</label><input id="s-an" type="date" value="${esc(c.dates?.anniversary || '')}">
      <label>尺度上限（兩人都打開才會出現更高的等級）</label>
      <div class="seg" id="s-sp">${[1, 2, 3].map((l) => `<button data-l="${l}" class="${(p.spice || 1) === l ? 'on' : ''}">${D.SPICE[l].icon} ${D.SPICE[l].label}</button>`).join('')}</div>
      <p class="small muted" style="margin:0" id="s-lv">目前兩人共同等級：${D.SPICE[spiceLevel()].icon} ${D.SPICE[spiceLevel()].label}</p>
    </div>
    <button class="btn block" id="s-save">儲存</button>
    <div class="card mt">
      <h3>更多</h3>
      <div class="list-row" data-act="poolManager"><span class="lr-i">🎰</span><span class="grow">管理扭蛋卡池</span>›</div>
      <div class="list-row" data-act="backup"><span class="lr-i">☁️</span><span class="grow">備份與還原<div class="small muted">每週自動備份，也可以存一份到手機</div></span>›</div>
      <div class="list-row" data-act="invite"><span class="lr-i">🔑</span><span class="grow">邀請碼 ${esc(S.cid)}</span>›</div>
      <div class="list-row" id="s-noti"><span class="lr-i">🔔</span><span class="grow">開啟瀏覽器通知<div class="small muted">開著 app 的時候才收得到，內容一律低調</div></span>›</div>
      <div class="list-row" data-act="theme"><span class="lr-i">🕯️</span><span class="grow">切換日夜模式（自動／白天／夜晚）</span>›</div>
      ${S.store.mode === 'demo'
        ? `<div class="list-row" data-act="demoSwitch"><span class="lr-i">🔁</span><span class="grow">切換成對方身份</span>›</div>
           <div class="list-row" id="s-reset"><span class="lr-i">🧹</span><span class="grow">清空試玩資料</span>›</div>`
        : `<div class="list-row" id="s-out"><span class="lr-i">🚪</span><span class="grow">登出</span>›</div>`}
    </div>
    <p class="center small muted">兩人遊樂園 · 做給我們兩個 💗</p>`);
  let sp = p.spice || 1;
  $$('#s-sp button', m).forEach((b) => b.onclick = () => { sp = +b.dataset.l; $$('#s-sp button', m).forEach((x) => x.classList.toggle('on', x === b)); });
  $('#s-save', m).onclick = async () => {
    const bd = $('#s-bd', m).value.trim();
    if (bd && !/^\d{2}-\d{2}$/.test(bd)) return toast('生日格式是 月-日，例如 03-16');
    await S.store.updateCouple(S.cid, {
      [`profiles.${me()}`]: { ...p, nick: $('#s-nk', m).value.trim() || p.nick, emoji: $('#s-em', m).value.trim() || p.emoji, bday: bd || p.bday, spice: sp },
      'dates.anniversary': $('#s-an', m).value || c.dates?.anniversary,
    });
    // 儲存後留在設定頁，按鈕短暫顯示「已儲存」
    const btn = $('#s-save', m);
    btn.textContent = '已儲存 ✓'; btn.disabled = true;
    setTimeout(() => { btn.textContent = '儲存'; btn.disabled = false; const lv = $('#s-lv', m); if (lv) lv.textContent = `目前兩人共同等級：${D.SPICE[spiceLevel()].icon} ${D.SPICE[spiceLevel()].label}`; }, 1200);
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
    const pool = list('pool').sort((a, b) => D.RARITY_ORDER.indexOf(a.rarity) - D.RARITY_ORDER.indexOf(b.rarity) || (a.at || 0) - (b.at || 0));
    const html = `${mhead('扭蛋卡池')}
      <p class="small muted" style="margin-top:0">扭蛋時會從這裡隨機抽一張，抽到的卡由對方負責兌現。點一張卡就能編輯，你們兩個都可以新增。</p>
      <button class="btn block" id="pm-add">＋ 新增一張到卡池</button>
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
function cardEditor({ title, pool = false, give = false, preset = {}, onDelete = null }, onSave) {
  const t = { title: '', desc: '', rarity: 'N', spice: 1, qty: 1, mystery: false, secret: '', limit: 'none', mark: '', ...preset };
  const m = openModal(`${mhead(esc(title))}
    <label>卡片名稱</label><input id="ce-t" maxlength="24" value="${esc(t.title)}" placeholder="例如：按摩 15 分鐘">
    <label>說明（可以不寫）</label><input id="ce-d" maxlength="60" value="${esc(t.desc)}" placeholder="一句話補充">
    <div class="row" style="align-items:flex-end">
      <div class="grow"><label>代表字（可不填，不填會自動挑）</label><input id="ce-k" maxlength="4" value="${esc(t.mark)}" placeholder="一個字，例如：擁" style="font-family:var(--serif);font-size:18px;font-weight:800"></div>
      <div class="emb-${t.rarity}" id="ce-pv" style="width:60px;height:60px;flex:none">${emblemMini(t)}</div>
    </div>
    <label>稀有度</label>
    <div class="rarity-pick" id="ce-r">${D.RARITY_ORDER.map((r) => `<button data-r="${r}" style="--rc:var(--r-${r.toLowerCase()})" class="${t.rarity === r ? 'on' : ''}">${r}</button>`).join('')}</div>
    <label>尺度</label>
    <div class="seg" id="ce-s">${[1, 2, 3].map((l) => `<button data-l="${l}" class="${t.spice === l ? 'on' : ''}">${D.SPICE[l].icon} ${D.SPICE[l].label}</button>`).join('')}</div>
    ${pool ? `<label>誰來兌現</label><select id="ce-g"><option value="">兩個人都可以</option><option value="him">只有男生能兌現（只有女生扭得到）</option><option value="her">只有女生能兌現（只有男生扭得到）</option></select>` : ''}
    ${give ? `<div class="row"><div class="grow"><label>張數</label><input id="ce-q" type="number" min="1" max="20" value="${t.qty}"></div>
      <div class="grow"><label>限時</label><select id="ce-l"><option value="none">不限時</option><option value="7d">7 天內有效</option><option value="weekend">週末限定</option><option value="today">今天限定</option></select></div></div>` : ''}
    <div class="toggle mt"><label class="switch"><input type="checkbox" id="ce-m" ${t.mystery ? 'checked' : ''}><span></span></label><span class="small">🎁 神秘盲盒（內容先藏起來，兌換時才揭曉）</span></div>
    <div id="ce-sw" class="${t.mystery && give ? '' : 'hidden'}"><label>盲盒裡的真正內容</label><input id="ce-sec" maxlength="60" placeholder="兌換時才會顯示" value="${esc(t.secret)}"></div>
    <button class="btn block mt" id="ce-ok">${give ? '送出 💌' : '儲存'}</button>
    ${onDelete ? '<button class="btn ghost block mt" id="ce-del" style="color:#d4405f">從卡池刪除</button>' : ''}`);
  if (onDelete) $('#ce-del', m).onclick = async () => { if (await confirmBox('確定要從卡池刪掉這張？')) { closeModal(m); await onDelete(); } };
  const preview = () => {
    const pv = $('#ce-pv', m); if (!pv) return;
    pv.className = 'emb-' + t.rarity;
    pv.innerHTML = emblemMini({ title: $('#ce-t', m).value.trim() || '新卡', rarity: t.rarity, mark: $('#ce-k', m).value.trim() });
  };
  $('#ce-t', m).addEventListener('input', preview);
  $('#ce-k', m).addEventListener('input', preview);
  $$('#ce-r button', m).forEach((b) => b.onclick = () => { t.rarity = b.dataset.r; $$('#ce-r button', m).forEach((x) => x.classList.toggle('on', x === b)); preview(); });
  $$('#ce-s button', m).forEach((b) => b.onclick = () => { t.spice = +b.dataset.l; $$('#ce-s button', m).forEach((x) => x.classList.toggle('on', x === b)); });
  $('#ce-m', m).onchange = (e) => { if (give) $('#ce-sw', m).classList.toggle('hidden', !e.target.checked); };
  if (give && preset.limit) $('#ce-l', m).value = preset.limit;
  if (pool && $('#ce-g', m)) $('#ce-g', m).value = preset.giver || '';
  $('#ce-ok', m).onclick = async () => {
    t.title = $('#ce-t', m).value.trim(); t.desc = $('#ce-d', m).value.trim(); t.mystery = $('#ce-m', m).checked; t.mark = Array.from($('#ce-k', m).value.trim())[0] || '';
    if (!t.title) return toast('卡片要有名稱');
    if (pool && $('#ce-g', m)) t.giver = $('#ce-g', m).value;
    if (give) {
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
// ============================================================
//  🏠 首頁：在一起天數、紀念日、心情、想你、每日一問、小紙條
// ============================================================

function daysTogether() {
  const ann = parseD(S.couple?.dates?.anniversary || D.DEFAULT_DATES.anniversary);
  const t = new Date(); t.setHours(0, 0, 0, 0);
  return Math.floor((t - ann) / 86400000) + 1;
}
function nextOf(md) {
  const [m, d] = md.split('-').map(Number);
  const t = new Date(); t.setHours(0, 0, 0, 0);
  let x = new Date(t.getFullYear(), m - 1, d);
  if (x < t) x = new Date(t.getFullYear() + 1, m - 1, d);
  return { date: x, days: Math.round((x - t) / 86400000) };
}
function countdowns() {
  const c = S.couple;
  const annStr = c.dates?.anniversary || D.DEFAULT_DATES.anniversary;
  const annY = +annStr.slice(0, 4);
  const items = [];
  const a = nextOf(annStr.slice(5));
  items.push({ name: `${a.date.getFullYear() - annY} 週年`, ...a, icon: '💞' });
  for (const u of c.members) {
    const p = prof(u); if (!p.bday) continue;
    items.push({ name: `${p.nick || ''}生日`, ...nextOf(p.bday), icon: '🎂' });
  }
  items.push({ name: '情人節', ...nextOf('02-14'), icon: '🌹' });
  items.push({ name: '聖誕節', ...nextOf('12-25'), icon: '🎄' });
  const dt = daysTogether(), next100 = Math.ceil((dt + 1) / 100) * 100;
  items.push({ name: `第 ${next100} 天`, days: next100 - dt, icon: '💯' });
  return items.sort((x, y) => x.days - y.days);
}

function homeTodos() {
  if (!S.couple) return [];
  const t = [];
  const p = partner();
  if (!p) t.push({ icon: '🔑', text: '對方還沒加入，把邀請碼傳給對方', act: 'invite', btn: '邀請' });
  const ns = list('cards').filter((c) => c.owner === me() && !c.scratched).length;
  if (ns) t.push({ icon: '🎟️', text: `有 ${ns} 張新票券等你刮開`, act: 'goScratch', btn: '去刮' });
  const wl = list('wishes').filter((w) => w.status === 'pending' && w.by !== me()).length;
  if (wl) t.push({ icon: '🌠', text: `${nick(p)} 在許願池許了 ${wl} 個願`, act: 'wishes', btn: '看看' });
  for (const c of list('cards').filter((c) => c.mystery && !c.secret && c.from === me() && c.owner !== me())) {
    t.push({ icon: '🎁', text: `${nick(c.owner)} 扭到了神秘盲盒，換你偷偷寫內容`, act: 'writeSecret', id: c.id, btn: '去寫' });
  }
  for (const b of list('battles')) {
    if (b.status === 'claimed' && b.claimer !== me()) t.push({ icon: '⚔️', text: `${nick(b.claimer)} 說自己完成挑戰「${b.task}」了`, act: 'battleJudge', id: b.id, btn: '確認' });
    if (b.status === 'done' && b.loser === me() && !b.paid) t.push({ icon: '🏳️', text: `挑戰輸了，要發一張卡給 ${nick(b.winner)}`, act: 'battlePay', id: b.id, btn: '發卡' });
  }
  for (const c of list('cards').filter((c) => c.owner === p && c.swapReq)) {
    t.push({ icon: '🔄', text: `${nick(p)} 想把「${c.title}」換一張`, act: 'swapJudge', id: c.id, btn: '看看' });
  }
  const tr = S.couple.taskSwapReq;
  if (tr && tr.by !== me() && tr.wk === weekKey()) t.push({ icon: '🔄', text: `${nick(tr.by)} 想換掉每週任務「${weekTasks()[tr.i] || ''}」`, act: 'tab', tab: 'play', btn: '去看' });
  if (needDownloadReminder()) t.push({ icon: '☁️', text: '這個月還沒把備份存到手機', act: 'downloadBackup', btn: '下載' });
  const caps = list('capsules').filter((c) => c.openAt <= now() && !(c.opened || {})[me()]).length;
  if (caps) t.push({ icon: '⏳', text: `有 ${caps} 封時光膠囊可以打開了`, act: 'goCapsule', btn: '打開' });
  return t;
}
ACT.goScratch = () => { S.tab = 'wallet'; S.sub.wallet = 'mine'; render(); window.scrollTo(0, 0); };
ACT.goCapsule = () => { S.tab = 'memory'; S.sub.memory = 'capsule'; render(); window.scrollTo(0, 0); };

PAGES.home = {
  html() {
    const c = S.couple, p = partner();
    const cds = countdowns();
    const todos = homeTodos();
    const moods = c.moods || {};
    const mm = moods[me()], pm = p ? moods[p] : null;
    const today = dkey();
    const misses = list('misses');
    const isToday = (x) => dkey(new Date(x.at)) === today;
    const myToday = misses.filter((x) => x.by === me() && isToday(x)).length;
    const theirToday = misses.filter((x) => x.by === p && isToday(x)).length;
    const total = misses.length;
    return `
    <div class="card hero">
      <div class="small muted">我們在一起</div>
      <div class="days">第 ${money(daysTogether())} <small>天</small></div>
      <div class="couple"><span>${avatar(me())} ${esc(nick(me()))}</span><span class="heart">💗</span><span>${p ? `${avatar(p)} ${esc(nick(p))}` : '<span class="muted">等待對方加入…</span>'}</span></div>
      <div class="countdowns">${cds.map((x) => `<div class="cd ${x.days === 0 ? 'today' : ''}">${x.icon} ${esc(x.name)}<b>${x.days === 0 ? '就是今天！' : x.days + ' 天'}</b></div>`).join('')}</div>
    </div>

    ${todos.length ? `<div class="card"><h3>📌 待辦</h3>${todos.map((t) => `<div class="todo-item"><span class="ti">${t.icon}</span><span class="grow">${esc(t.text)}</span>
      <button class="btn sm" data-act="${t.act}" ${t.id ? `data-id="${t.id}"` : ''} ${t.tab ? `data-tab="${t.tab}"` : ''}>${t.btn}</button></div>`).join('')}</div>` : ''}

    <div class="card">
      <h3>🌦️ 心情天氣 <span class="sub">點自己的換心情</span></h3>
      <div class="mood-row">
        <button class="mood-box" data-act="mood"><div class="mi">${mm ? mm.icon : '❔'}</div><b>${mm ? esc(mm.label) : '還沒設定'}</b><div class="who">${esc(nick(me()))}${mm ? ' · ' + ago(mm.at) : ''}</div></button>
        <div class="mood-box"><div class="mi">${pm ? pm.icon : '❔'}</div><b>${pm ? esc(pm.label) : '還沒設定'}</b><div class="who">${p ? esc(nick(p)) : '對方'}${pm ? ' · ' + ago(pm.at) : ''}</div>
          ${pm && (pm.icon === '🌧️' || pm.icon === '⛈️') ? '<div class="small" style="color:var(--accent);font-weight:700">需要哄哄！</div>' : ''}</div>
      </div>
    </div>

    <div class="card">
      <h3>💗 想你按鈕</h3>
      <div class="miss-wrap">
        <button class="miss-btn" data-act="miss" id="missbtn">💗</button>
        <div class="grow small">
          <div>今天我想了 ${esc(nick(p))} <b style="font-size:18px;color:var(--accent)">${myToday}</b> 次</div>
          <div>今天 ${esc(nick(p))} 想了我 <b style="font-size:18px;color:var(--accent)">${theirToday}</b> 次</div>
          <div class="muted">累計 ${money(total)} 次 · 連續 ${missStreak(me())} 天</div>
        </div>
      </div>
    </div>

    ${dailyCardHTML()}

    <div class="card">
      <h3>💌 情話小紙條</h3>
      <p class="small muted" style="margin:0 0 10px">寫一張小紙條，它會偷偷藏在 app 的某個角落，等 ${esc(nick(p))} 自己發現。</p>
      <div class="row"><button class="btn" data-act="writeNote">藏一張小紙條</button>
        <span class="small muted">${list('notes').filter((n) => n.by === me() && !n.found).length} 張還沒被找到</span></div>
    </div>`;
  },
};

// ---------- 心情 ----------
ACT.mood = () => {
  const cur = (S.couple.moods || {})[me()];
  const m = openModal(`${mhead('今天的心情天氣')}
    <div class="mood-pick">${D.MOODS.map((x, i) => `<button data-i="${i}" class="${cur && cur.icon === x.icon ? 'on' : ''}"><span>${x.icon}</span>${x.label}<small class="muted">${x.hint}</small></button>`).join('')}</div>`, { center: true });
  $$('[data-i]', m).forEach((b) => b.onclick = async () => {
    const x = D.MOODS[+b.dataset.i];
    await S.store.updateCouple(S.cid, { [`moods.${me()}`]: { icon: x.icon, label: x.label, at: now() } });
    await notify(partner(), 'mood', `${nick(me())} 更新了心情 ${x.icon}`);
    closeModal(m); toast(`心情：${x.icon} ${x.label}`);
  });
};

// ---------- 想你 ----------
function missStreak(uid) {
  const days = new Set(list('misses').filter((x) => x.by === uid).map((x) => dkey(new Date(x.at))));
  let n = 0; const d = new Date();
  if (!days.has(dkey(d))) d.setDate(d.getDate() - 1);
  while (days.has(dkey(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
ACT.miss = async (el, e) => {
  const r = el.getBoundingClientRect();
  floaty(r.left + r.width / 2, r.top);
  el.classList.remove('pulse'); void el.offsetWidth; el.classList.add('pulse');
  vibrate([30, 40, 30]);
  await col('misses').add({ by: me(), at: now() });
  const p = partner();
  const recent = list('events').some((x) => x.type === 'miss' && x.by === me() && x.to === p && !x.read && now() - x.at < 30 * 60000);
  if (p && !recent) await notify(p, 'miss', '有人在想你 💗');
};

// ---------- 每日一問 ----------
const dayIndex = () => Math.floor(parseD(dkey()).getTime() / 86400000);
function todayDaily() { return list('daily').find((x) => x.id === dkey()); }
function dailyCardHTML() {
  const q = D.DAILY_QUESTIONS[dayIndex() % D.DAILY_QUESTIONS.length];
  const doc = todayDaily();
  const ans = doc?.answers || {};
  const p = partner();
  const mine = ans[me()], theirs = p ? ans[p] : null;
  return `<div class="card">
    <h3>💬 每日一問 <span class="sub"><button class="link" data-act="dailyHistory">看以前的</button></span></h3>
    <div style="font-family:var(--serif);font-size:17px;font-weight:700;margin-bottom:10px">${esc(q)}</div>
    ${mine ? `<div class="todo-item" style="display:block"><div class="small muted">${esc(nick(me()))}</div>${esc(mine)}</div>
      <div class="todo-item" style="display:block"><div class="small muted">${esc(nick(p))}</div>${theirs ? esc(theirs) : '<span class="muted">🔒 等對方回答後就看得到</span>'}</div>`
      : `<textarea id="daily-in" placeholder="寫下你的答案…（兩人都回答才看得到對方的）"></textarea>
         <div class="row mt"><button class="btn" data-act="dailyAnswer">送出 +${D.POINTS.daily} 點</button>
         <span class="small muted">${theirs ? `${esc(nick(p))} 已經回答了，快來看` : ''}</span></div>`}
  </div>`;
}
ACT.dailyAnswer = async () => {
  const v = $('#daily-in').value.trim();
  if (!v) return toast('先寫下答案');
  $('#daily-in').blur();
  const id = dkey(), doc = todayDaily();
  if (doc) await col('daily').update(id, { [`answers.${me()}`]: v });
  else await col('daily').set(id, { qi: dayIndex() % D.DAILY_QUESTIONS.length, answers: { [me()]: v }, at: now() });
  await addPoints(me(), D.POINTS.daily, '每日一問');
  await notify(partner(), 'daily', `${nick(me())} 回答了今天的每日一問 💬`);
  toast('送出了 💬');
};
ACT.dailyHistory = () => {
  const p = partner();
  const ds = list('daily').filter((d) => d.answers && d.answers[me()] && p && d.answers[p]).sort((a, b) => b.id.localeCompare(a.id));
  openModal(`${mhead('💬 以前的每日一問')}
    ${ds.map((d) => `<div class="card"><div class="small muted">${d.id}</div><b style="font-family:var(--serif)">${esc(D.DAILY_QUESTIONS[d.qi] || '')}</b>
      <div class="small mt"><b>${esc(nick(me()))}：</b>${esc(d.answers[me()])}</div><div class="small"><b>${esc(nick(p))}：</b>${esc(d.answers[p])}</div></div>`).join('')
      || '<div class="empty"><span class="big">💬</span>兩人都回答過的題目會出現在這裡</div>'}`);
};

// ---------- 情話小紙條 ----------
ACT.writeNote = async () => {
  if (!partner()) return toast('對方加入後才能藏紙條喔');
  const text = await promptBox('💌 寫一張小紙條', { placeholder: `想對 ${nick(partner())} 說的話…`, multiline: true, ok: '藏起來' });
  if (!text) return;
  const tab = pick(TABS).id;
  await col('notes').add({ by: me(), to: partner(), text, found: false, spot: { tab, x: 6 + Math.random() * 80, y: 8 + Math.random() * 84 }, at: now() });
  toast(`藏好了，看 ${nick(partner())} 什麼時候發現 🤫`);
};
function placeHiddenNotes(main) {
  for (const n of list('notes')) {
    if (n.to !== me() || n.found || !n.spot || n.spot.tab !== S.tab) continue;
    const b = document.createElement('button');
    b.className = 'hidden-note'; b.textContent = '💌';
    b.dataset.act = 'findNote'; b.dataset.id = n.id;
    b.style.left = n.spot.x + '%'; b.style.top = n.spot.y + '%';
    main.appendChild(b);
  }
}
ACT.findNote = async (el) => {
  const n = list('notes').find((x) => x.id === el.dataset.id);
  if (!n) return;
  vibrate(40); confetti(40, ['#ff6f91', '#ffc2d1', '#fff']);
  openModal(`${mhead('💌 你找到一張小紙條！')}
    <div class="letter">${esc(n.text)}</div>
    <p class="small muted center">—— ${esc(nick(n.by))} · ${fmtFull(n.at)}</p>`, { center: true });
  await col('notes').update(n.id, { found: true, foundAt: now() });
  await notify(n.by, 'note', '你藏的小紙條被找到了 💌');
};
// ============================================================
//  圖騰系統：依卡名產生和風幾何底紋＋中央徽章＋卡框（不用 emoji）
// ============================================================

let embSeq = 0;
const EMB_KINDS = ['seigaiha', 'asanoha', 'shippo', 'lattice', 'dots'];
const EMB_NAMES = { seigaiha: '青海波', asanoha: '麻葉', shippo: '七寶', lattice: '菱格', dots: '星點' };

// 每張卡的代表字（徽章中間那個字）
const EMB_MARKS = {
  打鼻子: '鼻', 吹頭髮服務: '髮', 做家事券: '家', 洗碗券: '洗', 背我走10步: '背', 抱我轉10圈: '旋',
  一日司機: '駕', 換我煮一道菜: '廚', 挑禮物: '禮', 吃蛋糕: '糕',
  睡前加碼: '夜', 角色扮演: '演', 今天我主動: '主', 免死金牌: '赦', 你教我拉一個音: '音',
  拉生日快樂給自己: '琴', 唱生日快樂給你聽: '歌', '拍一張25歲的你和我的合照': '照',
  '25歲生日感言': '言', '中獎了！': '獎', 以後每個生日: '伴', 謝謝你: '謝',
  早餐送到床邊: '餐', 按摩15分鐘: '揉', 今天不滑手機陪你: '陪', 晚餐你指定: '膳', 撒嬌無限一小時: '嬌',
  電影你選: '影', 宵夜外送員: '宵', 約會全包: '約', 說好日: '允',
  親親20下: '吻', 今晚你決定: '決', 指定穿搭: '衣', 一起泡澡: '浴', 慢慢來的夜晚: '緩', 耳邊悄悄話: '耳',
  一個你想試的新玩法: '新', 全聽你的: '聽', 主導權轉移: '權',
  壽星女王券: '后', 壽星國王券: '王', 週年紀念券: '年', 情人節限定券: '情', 聖誕交換券: '聖', 新年第一張券: '春', 旅行出發券: '旅',
};
const EMB_SKIP = new Set(Array.from('一二三四五六七八九十的我你他她給換拍唱拉今幫陪讓再來去把被和跟'));
function embChar(title) {
  if (EMB_MARKS[title]) return EMB_MARKS[title];
  const cs = Array.from(title).filter((x) => /[\u4e00-\u9fff]/.test(x));
  return cs.find((x) => !EMB_SKIP.has(x)) || cs[0] || Array.from(title.replace(/\s/g, ''))[0] || '?';
}

function embPalette(c) { const fk = festKey(c); return fk ? 'F-' + fk : c.kind === 'collect' ? 'C' : (c.rarity || 'N'); }
function embSeed(c, hide) {
  const title = hide ? '神秘盲盒' : (c.title || '?');
  const h = hash(title);
  const ch = hide ? '?' : (c.mark || embChar(title));
  return { h, ch, kind: hide ? 'lattice' : EMB_KINDS[h % EMB_KINDS.length], shape: (h >>> 4) % 4, no: (h % 89) + 10 };
}

// 底紋（stroke 用強調色）
function embPattern(kind, id, s = 1) {
  const u = (n) => n * s;
  const P = (w, h, body) => `<pattern id="${id}" width="${u(w)}" height="${u(h)}" patternUnits="userSpaceOnUse">${body}</pattern>`;
  if (kind === 'seigaiha') {
    const wave = (cx, cy) => [10, 7, 4].map((r) => `<circle cx="${u(cx)}" cy="${u(cy)}" r="${u(r)}" class="e-bg e-acc-s" stroke-width="${0.8 * s}"/>`).join('');
    return P(20, 10, wave(0, 5) + wave(20, 5) + wave(10, 10) + wave(0, 15) + wave(20, 15));
  }
  if (kind === 'asanoha') {
    const c = u(12), e = u(24);
    const pts = [[0, 0], [12, 0], [24, 0], [24, 12], [24, 24], [12, 24], [0, 24], [0, 12]];
    return P(24, 24, pts.map(([x, y]) => `<line x1="${c}" y1="${c}" x2="${u(x)}" y2="${u(y)}" class="e-acc-s" stroke-width="${0.6 * s}"/>`).join('')
      + `<path d="M${c} 0 L${e} ${c} L${c} ${e} L0 ${c} Z" class="e-acc-s" stroke-width="${0.6 * s}"/>`);
  }
  if (kind === 'shippo') {
    return P(20, 20, [[0, 0], [20, 0], [0, 20], [20, 20], [10, 10]].map(([x, y]) => `<circle cx="${u(x)}" cy="${u(y)}" r="${u(10)}" class="e-acc-s" stroke-width="${0.7 * s}"/>`).join('')
      + `<circle cx="${u(10)}" cy="${u(0)}" r="${u(1)}" class="e-acc-f"/><circle cx="${u(0)}" cy="${u(10)}" r="${u(1)}" class="e-acc-f"/>`);
  }
  if (kind === 'lattice') {
    return P(16, 16, `<path d="M0 ${u(8)} L${u(8)} 0 L${u(16)} ${u(8)} L${u(8)} ${u(16)} Z" class="e-acc-s" stroke-width="${0.7 * s}"/><circle cx="${u(8)}" cy="${u(8)}" r="${u(1.1)}" class="e-acc-f"/>`);
  }
  return P(10, 10, `<circle cx="${u(5)}" cy="${u(5)}" r="${u(0.9)}" class="e-acc-f"/><circle cx="0" cy="0" r="${u(0.5)}" class="e-acc-f"/>`);
}

// 中央徽章
function embMedallion(cx, cy, seed, r = 50) {
  const k = r / 50;
  const pt = (a, rr) => [cx + rr * Math.sin(a), cy - rr * Math.cos(a)];
  let s = '';
  if (seed.shape === 0) {
    for (let i = 0; i < 32; i++) { const a = i / 32 * Math.PI * 2, [x1, y1] = pt(a, 53 * k), [x2, y2] = pt(a, (i % 4 ? 56 : 59) * k); s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="e-ink-s" stroke-width="${0.9 * k}"/>`; }
    s += `<circle cx="${cx}" cy="${cy}" r="${50 * k}" class="e-bg e-ink-s" stroke-width="${1.4 * k}"/><circle cx="${cx}" cy="${cy}" r="${44 * k}" class="e-acc-s" stroke-width="${1 * k}"/>`;
    for (let i = 0; i < 4; i++) { const [x, y] = pt(Math.PI / 4 + i * Math.PI / 2, 50 * k); s += `<rect x="${x - 3 * k}" y="${y - 3 * k}" width="${6 * k}" height="${6 * k}" transform="rotate(45 ${x} ${y})" class="e-ink-f"/>`; }
  } else if (seed.shape === 1) {
    const oct = (rr) => Array.from({ length: 8 }, (_, i) => pt(Math.PI / 8 + i * Math.PI / 4, rr).join(',')).join(' ');
    s += `<polygon points="${oct(56 * k)}" class="e-bg e-ink-s" stroke-width="${1.4 * k}"/><polygon points="${oct(51 * k)}" class="e-acc-s" stroke-width="${0.8 * k}"/>`;
    s += `<circle cx="${cx}" cy="${cy}" r="${42 * k}" class="e-ink-s" stroke-width="${0.8 * k}"/>`;
    for (let i = 0; i < 8; i++) { const [x, y] = pt(i * Math.PI / 4, 62 * k); s += `<circle cx="${x}" cy="${y}" r="${1.6 * k}" class="e-ink-f"/>`; }
  } else if (seed.shape === 2) {
    for (let i = 0; i < 16; i++) { const [x, y] = pt(i / 16 * Math.PI * 2, 48 * k); s += `<circle cx="${x}" cy="${y}" r="${9 * k}" class="e-bg e-ink-s" stroke-width="${1.1 * k}"/>`; }
    s += `<circle cx="${cx}" cy="${cy}" r="${46 * k}" class="e-bg"/><circle cx="${cx}" cy="${cy}" r="${43 * k}" class="e-acc-s" stroke-width="${1 * k}"/><circle cx="${cx}" cy="${cy}" r="${39 * k}" class="e-ink-s" stroke-width="${0.6 * k}"/>`;
  } else {
    const sq = (rot) => { const p = [0, 1, 2, 3].map((i) => pt(rot + i * Math.PI / 2, 58 * k).join(',')).join(' '); return `<polygon points="${p}" class="e-bg e-ink-s" stroke-width="${1.2 * k}"/>`; };
    s += sq(0) + sq(Math.PI / 4);
    s += `<circle cx="${cx}" cy="${cy}" r="${40 * k}" class="e-bg e-acc-s" stroke-width="${1.2 * k}"/><circle cx="${cx}" cy="${cy}" r="${35 * k}" class="e-ink-s" stroke-width="${0.6 * k}" stroke-dasharray="${1.5 * k} ${2.5 * k}"/>`;
  }
  const fs = (seed.ch === '?' ? 40 : 42) * k;
  s += `<text x="${cx}" y="${cy + fs * 0.36}" text-anchor="middle" font-size="${fs}" class="e-ink-f e-char">${esc(seed.ch)}</text>`;
  return s;
}

// 完整卡面（翻牌大卡正面上半部）
function emblemSVG(c, hide = false) {
  const seed = embSeed(c, hide);
  const id = 'ep' + (++embSeq);
  const title = hide ? '神秘盲盒' : (c.title || '');
  const tl = Array.from(title).length;
  const tfs = Math.min(17, Math.floor(150 / Math.max(tl, 1)));
  const R = D.RARITY[c.rarity] || D.RARITY.N;
  const fk = hide ? '' : festKey(c), F = FESTS[fk];
  const corner = (x, y, sx, sy) => `<path d="M${x} ${y + sy * 14} A14 14 0 0 ${sx * sy > 0 ? 1 : 0} ${x + sx * 14} ${y}" class="e-ink-s" stroke-width=".8"/><circle cx="${x + sx * 4}" cy="${y + sy * 4}" r="1.6" class="e-ink-f"/>`;
  return `<svg viewBox="0 0 200 240" class="emb-svg" xmlns="http://www.w3.org/2000/svg">
    <defs>${F ? festPattern(F.pat, id) : embPattern(seed.kind, id)}</defs>
    <rect width="200" height="240" class="e-bg"/>
    <rect width="200" height="240" fill="url(#${id})" opacity="${F ? '.75' : '.55'}"/>
    <rect x="8" y="8" width="184" height="224" rx="10" class="e-ink-s" stroke-width=".9"/>
    <rect x="12.5" y="12.5" width="175" height="215" rx="7" class="e-acc-s" stroke-width=".6"/>
    ${corner(12.5, 12.5, 1, 1)}${corner(187.5, 12.5, -1, 1)}${corner(12.5, 227.5, 1, -1)}${corner(187.5, 227.5, -1, -1)}
    <rect x="62" y="20" width="76" height="14" rx="7" class="e-bg"/>
    <text x="100" y="30" text-anchor="middle" font-size="7" letter-spacing="2.5" class="e-ink-f e-small">${F ? F.label : '兩人遊樂園'}</text>
    <circle cx="100" cy="106" r="68" class="e-bg" opacity=".9"/>
    ${F ? festMedallion(100, 106, fk, c) : embMedallion(100, 106, seed)}
    <rect x="22" y="182" width="156" height="34" class="e-bg"/>
    <line x1="30" y1="182" x2="170" y2="182" class="e-ink-s" stroke-width=".7"/><line x1="30" y1="216" x2="170" y2="216" class="e-ink-s" stroke-width=".7"/>
    <circle cx="26" cy="182" r="1.5" class="e-ink-f"/><circle cx="174" cy="182" r="1.5" class="e-ink-f"/><circle cx="26" cy="216" r="1.5" class="e-ink-f"/><circle cx="174" cy="216" r="1.5" class="e-ink-f"/>
    <text x="100" y="${199 + tfs * 0.36}" text-anchor="middle" font-size="${tfs}" class="e-ink-f e-title">${esc(title)}</text>
    <text x="100" y="226" text-anchor="middle" font-size="6.5" letter-spacing="1.8" class="e-ink-f e-small">${F ? `${F.foot} · ${R.name} · ${new Date(c.at || now()).getFullYear()}` : `${c.kind === 'collect' ? '珍藏' : R.name + ' · ' + R.label} · ${EMB_NAMES[seed.kind]} · No.${seed.no}`}</text>
  </svg>`;
}

// 小徽章（票夾列表用）
function emblemMini(c, hide = false) {
  const seed = embSeed(c, hide);
  const fk = hide ? '' : festKey(c);
  const id = 'ep' + (++embSeq);
  return `<svg viewBox="0 0 130 130" class="emb-mini" xmlns="http://www.w3.org/2000/svg">
    <defs>${fk ? festPattern(FESTS[fk].pat, id, 0.7) : embPattern(seed.kind, id, 0.7)}<clipPath id="${id}c"><circle cx="65" cy="65" r="64"/></clipPath></defs>
    <circle cx="65" cy="65" r="64" class="e-bg"/>
    <rect width="130" height="130" fill="url(#${id})" opacity=".5" clip-path="url(#${id}c)"/>
    ${fk ? festMedallion(65, 65, fk, c, 46) : embMedallion(65, 65, seed, 46)}
  </svg>`;
}

// 背面整片底紋
function emblemBackSVG(c, hide = false) {
  const seed = embSeed(c, hide);
  const id = 'ep' + (++embSeq);
  const fk = hide ? '' : festKey(c);
  return `<svg viewBox="0 0 200 300" preserveAspectRatio="xMidYMid slice" class="emb-back" xmlns="http://www.w3.org/2000/svg">
    <defs>${fk ? festPattern(FESTS[fk].pat, id) : embPattern(seed.kind, id)}</defs>
    <rect width="200" height="300" class="e-bg"/><rect width="200" height="300" fill="url(#${id})" opacity=".7"/>
    <rect x="8" y="8" width="184" height="284" rx="10" class="e-ink-s" stroke-width=".9"/>
    <rect x="12.5" y="12.5" width="175" height="275" rx="7" class="e-acc-s" stroke-width=".6"/>
  </svg>`;
}

// ---------- 翻牌大卡 ----------
function bigCardHTML(c, { hide = false } = {}) {
  const R = D.RARITY[c.rarity] || D.RARITY.N;
  const meta = [];
  if (c.from) meta.push(c.from === 'sys' ? '遊樂園送的' : c.from === me() ? '我送的' : '來自 ' + nick(c.from));
  if (c.series) meta.push(c.series);
  if (c.weekendOnly) meta.push('週末限定');
  if (c.expiresAt && remaining(c) > 0) meta.push(`${fmtDate(c.expiresAt)} 前有效`);
  if ((c.spice || 1) > 1) meta.push(D.SPICE[c.spice].label);
  const log = (c.log || []).filter((l) => l.how !== 'craft').slice(-8).reverse();
  const howTxt = { birthday: '生日當天', redeem: '兌換' };
  return `<div class="fc-wrap emb-${embPalette(c)}" id="fcw">
    <div class="fc-tilt" id="fct"><div class="fc ${c.kind === 'collect' ? 'C' : c.rarity}" id="fc">
      <div class="fc-face fc-front">
        ${emblemSVG(c, hide)}
        <div class="fc-desc">${hide ? '兌換時才揭曉內容' : esc(c.desc || '')}</div>
        <div class="fc-meta">${meta.map((x) => `<span>${esc(x)}</span>`).join('<i>◆</i>')}</div>
        <div class="holo"></div><div class="glare"></div>
        <div class="big-stamp" id="bs">已兌換</div>
      </div>
      <div class="fc-face fc-back">
        ${emblemBackSVG(c, hide)}
        <div class="fc-back-panel">
          <div class="fbp-title">票券紀錄</div>
          <div class="fbp-row"><span>來自</span><b>${esc(c.from === 'sys' ? '遊樂園' : nick(c.from))}</b></div>
          <div class="fbp-row"><span>持有</span><b>${esc(nick(c.owner))}</b></div>
          <div class="fbp-row"><span>收到</span><b>${fmtFull(c.at)}</b></div>
          ${c.kind === 'collect' ? '<div class="fbp-row"><span>類型</span><b>珍藏卡</b></div>' : `<div class="fbp-row"><span>剩餘</span><b>${remaining(c)} / ${c.qty || 1}</b></div>`}
          ${log.length ? `<div class="fbp-sub">使用紀錄</div>${log.map((l) => `<div class="fbp-row"><span>${howTxt[l.how] || '兌換'}</span><b>${fmtFull(l.at)}</b></div>`).join('')}` : (c.kind === 'collect' ? '' : '<div class="fbp-empty">還沒有使用過</div>')}
        </div>
      </div>
    </div></div>
  </div>
  <p class="center small muted" style="margin:-4px 0 10px">點卡片翻面${c.rarity === 'SR' || c.rarity === 'SSR' ? '，傾斜手機看光澤' : ''}</p>`;
}

// 翻面＋傾斜光澤
let orientAsked = false;
function attachCardFX(m) {
  const wrap = $('#fcw', m), tilt = $('#fct', m), fc = $('#fc', m);
  if (!wrap) return () => {};
  let lastInput = 0, raf = 0, alive = true;
  const set = (x, y) => {
    tilt.style.setProperty('--ry', ((x - 0.5) * 18).toFixed(2) + 'deg');
    tilt.style.setProperty('--rx', ((0.5 - y) * 14).toFixed(2) + 'deg');
    fc.style.setProperty('--hx', (x * 100).toFixed(1) + '%');
    fc.style.setProperty('--hy', (y * 100).toFixed(1) + '%');
    fc.style.setProperty('--gx', (x * 100).toFixed(1) + '%');
    fc.style.setProperty('--gy', (y * 100).toFixed(1) + '%');
  };
  const onMove = (e) => { const r = wrap.getBoundingClientRect(); lastInput = performance.now(); set(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))); };
  const onOrient = (e) => { if (e.gamma == null) return; lastInput = performance.now(); set(Math.min(1, Math.max(0, (e.gamma + 25) / 50)), Math.min(1, Math.max(0, (e.beta - 20) / 50))); };
  wrap.addEventListener('pointermove', onMove);
  wrap.addEventListener('pointerleave', () => { lastInput = 0; });
  window.addEventListener('deviceorientation', onOrient);
  const idle = (t) => {
    if (!alive) return;
    if (performance.now() - lastInput > 1500) set(0.5 + Math.sin(t / 1400) * 0.35, 0.5 + Math.cos(t / 1900) * 0.25);
    raf = requestAnimationFrame(idle);
  };
  raf = requestAnimationFrame(idle);
  fc.addEventListener('click', () => {
    if (fc.dataset.lock) return;
    fc.classList.toggle('flipped'); vibrate(10);
    if (!orientAsked && window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === 'function') {
      orientAsked = true; DeviceOrientationEvent.requestPermission().catch(() => {});
    }
  });
  return () => { alive = false; cancelAnimationFrame(raf); window.removeEventListener('deviceorientation', onOrient); };
}
// ============================================================
//  節日／紀念限定圖騰：線描意象、收斂配色
// ============================================================

const FEST_BY_TITLE = {
  壽星女王券: 'queen', 壽星國王券: 'king', 週年紀念券: 'anniv', 情人節限定券: 'valentine',
  聖誕交換券: 'xmas', 新年第一張券: 'newyear', 旅行出發券: 'travel',
};
const FESTS = {
  queen:     { label: '壽 星 限 定', foot: '生日限定', pat: 'sparkle' },
  king:      { label: '壽 星 限 定', foot: '生日限定', pat: 'sparkle' },
  anniv:     { label: '週 年 限 定', foot: '週年紀念', pat: 'rings' },
  valentine: { label: '情 人 節 限 定', foot: '情人節限定', pat: 'hearts' },
  xmas:      { label: '聖 誕 限 定', foot: '聖誕限定', pat: 'snow' },
  newyear:   { label: '新 年 限 定', foot: '新年限定', pat: 'plum' },
  travel:    { label: '旅 行 限 定', foot: '旅行系列', pat: 'grid' },
};
function festKey(c) { return c && (c.fest || FEST_BY_TITLE[c.title]) || ''; }

// 節日底紋（淡淡的，不搶主角）
function festPattern(kind, id, s = 1) {
  const u = (n) => +(n * s).toFixed(2);
  const P = (w, h, body) => `<pattern id="${id}" width="${u(w)}" height="${u(h)}" patternUnits="userSpaceOnUse">${body}</pattern>`;
  const star = (x, y, r) => `<path d="M${u(x)} ${u(y - r)} L${u(x + r * .28)} ${u(y - r * .28)} L${u(x + r)} ${u(y)} L${u(x + r * .28)} ${u(y + r * .28)} L${u(x)} ${u(y + r)} L${u(x - r * .28)} ${u(y + r * .28)} L${u(x - r)} ${u(y)} L${u(x - r * .28)} ${u(y - r * .28)} Z" class="e-acc-f"/>`;
  if (kind === 'sparkle') return P(28, 28, star(7, 7, 3.2) + `<circle cx="${u(21)}" cy="${u(20)}" r="${u(.9)}" class="e-acc-f"/>`);
  if (kind === 'rings') return P(26, 26, `<circle cx="${u(9)}" cy="${u(9)}" r="${u(3.6)}" class="e-acc-s" stroke-width="${.6 * s}"/><circle cx="${u(13)}" cy="${u(9)}" r="${u(3.6)}" class="e-acc-s" stroke-width="${.6 * s}"/><circle cx="${u(21)}" cy="${u(21)}" r="${u(.8)}" class="e-acc-f"/>`);
  if (kind === 'hearts') {
    const h = (x, y, k) => `<path transform="translate(${u(x)} ${u(y)}) scale(${(k * s).toFixed(2)})" d="M0 4 C-4 1 -6 -1 -6 -3 C-6 -5 -4 -6 -2.5 -6 C-1.2 -6 -.4 -5 0 -4 C.4 -5 1.2 -6 2.5 -6 C4 -6 6 -5 6 -3 C6 -1 4 1 0 4 Z" class="e-acc-s" stroke-width="${(.7 / k).toFixed(2)}"/>`;
    return P(30, 28, h(9, 9, .75) + `<circle cx="${u(23)}" cy="${u(21)}" r="${u(.8)}" class="e-acc-f"/>`);
  }
  if (kind === 'snow') return P(22, 22, `<circle cx="${u(5)}" cy="${u(5)}" r="${u(1.1)}" class="e-acc-f"/><circle cx="${u(16)}" cy="${u(11)}" r="${u(.7)}" class="e-acc-f"/><circle cx="${u(9)}" cy="${u(18)}" r="${u(.9)}" class="e-acc-f"/>`);
  if (kind === 'plum') {
    const fl = (x, y) => Array.from({ length: 5 }, (_, i) => { const a = i * 72 * Math.PI / 180; return `<circle cx="${u(x + Math.sin(a) * 2.4)}" cy="${u(y - Math.cos(a) * 2.4)}" r="${u(1.5)}" class="e-acc-f"/>`; }).join('');
    return P(30, 30, fl(8, 8) + `<circle cx="${u(23)}" cy="${u(22)}" r="${u(.8)}" class="e-acc-f"/>`);
  }
  return P(22, 22, `<line x1="0" y1="${u(11)}" x2="${u(22)}" y2="${u(11)}" class="e-acc-s" stroke-width="${.45 * s}"/><line x1="${u(11)}" y1="0" x2="${u(11)}" y2="${u(22)}" class="e-acc-s" stroke-width="${.45 * s}" stroke-dasharray="${u(1.5)} ${u(2)}"/>`);
}

// 中央意象（以 0,0 為中心，半徑約 38）
function festMotif(key, c) {
  const ink = (d, w = 1.4, extra = '') => `<path d="${d}" class="e-ink-s" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;
  const pt = (deg, r) => [Math.sin(deg * Math.PI / 180) * r, -Math.cos(deg * Math.PI / 180) * r];
  if (key === 'queen' || key === 'king') {
    let s = '';
    // 月桂枝
    for (const side of [-1, 1]) {
      const arc = [];
      for (let i = 0; i <= 6; i++) {
        const deg = side < 0 ? 205 + i * 16 : 155 - i * 16;
        const [x, y] = pt(deg, 37);
        arc.push([x, y]);
        const rot = deg + (side < 0 ? 60 : -60);
        s += `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="5.2" ry="2.1" transform="rotate(${rot - 90} ${x.toFixed(1)} ${y.toFixed(1)})" class="e-acc-f e-ink-s" stroke-width=".6"/>`;
      }
      s += ink('M' + arc.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L'), .8);
    }
    // 皇冠
    s += `<path d="M-24 12 L24 12 L28 -8 L13 2 L0 -20 L-13 2 L-28 -8 Z" class="e-bg e-ink-s" stroke-width="1.6" stroke-linejoin="round"/>`;
    s += ink('M-22 18 L22 18', 1.6);
    s += `<circle cx="-28" cy="-11" r="2.6" class="e-acc-f e-ink-s" stroke-width="1"/><circle cx="28" cy="-11" r="2.6" class="e-acc-f e-ink-s" stroke-width="1"/>`;
    if (key === 'king') s += ink('M0 -33 L0 -21 M-4.5 -28 L4.5 -28', 1.5);
    else s += `<circle cx="0" cy="-23" r="2.8" class="e-acc-f e-ink-s" stroke-width="1"/>`;
    if (key === 'queen') s += `<path transform="translate(0 6) scale(.62)" d="M0 4 C-4 1 -6 -1 -6 -3 C-6 -5 -4 -6 -2.5 -6 C-1.2 -6 -.4 -5 0 -4 C.4 -5 1.2 -6 2.5 -6 C4 -6 6 -5 6 -3 C6 -1 4 1 0 4 Z" class="e-ink-f"/><circle cx="-12" cy="6" r="1.6" class="e-ink-f"/><circle cx="12" cy="6" r="1.6" class="e-ink-f"/>`;
    else s += `<circle cx="-12" cy="6" r="1.8" class="e-ink-f"/><circle cx="0" cy="6" r="2.2" class="e-acc-f e-ink-s" stroke-width=".8"/><circle cx="12" cy="6" r="1.8" class="e-ink-f"/>`;
    return s;
  }
  if (key === 'anniv') {
    const start = +((S.couple?.dates?.anniversary || D.DEFAULT_DATES.anniversary).slice(0, 4));
    const yr = new Date(c.at || now()).getFullYear() - start;
    return `<circle cx="-9" cy="0" r="15" class="e-ink-s" stroke-width="2"/>
      <circle cx="9" cy="0" r="15" class="e-acc-s" stroke-width="2"/>
      <path d="M-9 -15 A15 15 0 0 1 3.2 -8.7" class="e-ink-s" stroke-width="2" fill="none"/>
      <path d="M0 -34 L1.8 -27.8 L8 -26 L1.8 -24.2 L0 -18 L-1.8 -24.2 L-8 -26 L-1.8 -27.8 Z" class="e-ink-f"/>
      <circle cx="-14" cy="-26" r="1" class="e-ink-f"/><circle cx="14" cy="-26" r="1" class="e-ink-f"/>
      <text x="0" y="30" text-anchor="middle" font-size="9" letter-spacing="2" class="e-ink-f e-small">${yr > 0 ? `第 ${yr} 年` : '紀念日'}</text>`;
  }
  if (key === 'valentine') {
    return `<path d="M0 6 C0 14 -1.5 22 0 34" class="e-ink-s" stroke-width="1.4" stroke-linecap="round"/>
      <path d="M0 19 C5 13 12 12 16 14 C12 20 6 21 0 19 Z" class="e-acc-f e-ink-s" stroke-width=".8"/>
      <path d="M0 26 C-5 20 -12 19 -16 21 C-12 27 -6 28 0 26 Z" class="e-acc-f e-ink-s" stroke-width=".8"/>
      <path d="M-15 -9 C-16 -19 -8 -27 0 -25 C8 -27 16 -19 15 -9 C14 0 7 6 0 6 C-7 6 -14 0 -15 -9 Z" class="e-bg e-ink-s" stroke-width="1.5" stroke-linejoin="round"/>
      <path d="M-15 -9 C-10 -4 -4 -5 0 -10 C4 -5 10 -4 15 -9" class="e-ink-s" stroke-width="1.2" fill="none" stroke-linecap="round"/>
      <path d="M-10 -11 C-10 -18 -4 -21 0 -19 C4 -21 10 -18 10 -11" class="e-acc-s" stroke-width="1.1" fill="none" stroke-linecap="round"/>
      <path d="M-4.5 -13 C-4 -17 3 -17.5 4.5 -14 C5.5 -11 2 -9 -0.5 -10.5 C-2.5 -12 -0.5 -14.5 1.5 -13.5" class="e-ink-s" stroke-width="1.2" fill="none" stroke-linecap="round"/>
      <path d="M-8 -1 C-4 2 4 2 8 -1" class="e-acc-s" stroke-width="1" fill="none" stroke-linecap="round"/>`;
  }
  if (key === 'xmas') {
    let s = '';
    for (let i = 0; i < 6; i++) {
      s += `<g transform="rotate(${i * 60})">${ink('M0 -6 L0 -32 M0 -14 L-7 -21 M0 -14 L7 -21 M0 -23 L-5 -28 M0 -23 L5 -28', 1.4)}<circle cx="0" cy="-35" r="1.7" class="e-acc-f"/></g>`;
    }
    s += `<polygon points="${Array.from({ length: 6 }, (_, i) => pt(i * 60, 6).map((v) => v.toFixed(2)).join(',')).join(' ')}" class="e-bg e-ink-s" stroke-width="1.3"/><circle cx="0" cy="0" r="1.6" class="e-acc-f"/>`;
    return s;
  }
  if (key === 'newyear') {
    let s = '';
    for (let i = 0; i < 24; i++) { const [x1, y1] = pt(i * 15, 27), [x2, y2] = pt(i * 15, i % 2 ? 31 : 36); s += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" class="e-acc-s" stroke-width="1.1" stroke-linecap="round"/>`; }
    for (let i = 0; i < 5; i++) { const [x, y] = pt(i * 72, 11); s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="9.5" class="e-bg e-ink-s" stroke-width="1.3"/>`; }
    for (let i = 0; i < 5; i++) { const [x, y] = pt(i * 72 + 36, 8.5); s += `<line x1="0" y1="0" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" class="e-ink-s" stroke-width=".8"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="1.3" class="e-ink-f"/>`; }
    s += `<circle cx="0" cy="0" r="3.4" class="e-acc-f e-ink-s" stroke-width=".8"/>`;
    return s;
  }
  // travel：羅盤
  const pts = (r1, r2, off) => Array.from({ length: 8 }, (_, i) => pt(off + i * 45, i % 2 ? r2 : r1).map((v) => v.toFixed(2)).join(',')).join(' ');
  return `<circle cx="0" cy="0" r="26" class="e-acc-s" stroke-width="1" stroke-dasharray="2 3"/>
    <polygon points="${pts(22, 5, 45)}" class="e-bg e-acc-s" stroke-width="1"/>
    <polygon points="${pts(34, 5.5, 0)}" class="e-bg e-ink-s" stroke-width="1.3" stroke-linejoin="round"/>
    ${[0, 90, 180, 270].map((d) => { const [x1, y1] = pt(d, 34), [x2, y2] = pt(d + 45, 5.5); return `<polygon points="${x1.toFixed(2)},${y1.toFixed(2)} ${x2.toFixed(2)},${y2.toFixed(2)} 0,0" class="e-ink-f"/>`; }).join('')}
    <circle cx="0" cy="0" r="2.4" class="e-bg e-ink-s" stroke-width="1"/>
    <text x="0" y="-38" text-anchor="middle" font-size="7" class="e-ink-f e-small">N</text>`;
}

// 節日徽章外圈
function festMedallion(cx, cy, key, c, r = 50) {
  const k = r / 50;
  let s = `<circle cx="${cx}" cy="${cy}" r="${50 * k}" class="e-bg e-ink-s" stroke-width="${1.4 * k}"/><circle cx="${cx}" cy="${cy}" r="${45.5 * k}" class="e-acc-s" stroke-width="${.8 * k}"/>`;
  for (let i = 0; i < 12; i++) { const a = i * 30 * Math.PI / 180; s += `<circle cx="${(cx + Math.sin(a) * 55 * k).toFixed(1)}" cy="${(cy - Math.cos(a) * 55 * k).toFixed(1)}" r="${(i % 3 ? .9 : 1.6) * k}" class="e-ink-f"/>`; }
  s += `<g transform="translate(${cx} ${cy}) scale(${(k * 1.05).toFixed(3)})">${festMotif(key, c)}</g>`;
  return s;
}
// ============================================================
//  🎟️ 票夾：我的卡、刮刮卡、兌換儀式、發卡、許願池、合成、收藏冊
// ============================================================

function ticketHTML(c, { act = 'openCard', showFrom = true, showOwner = false } = {}) {
  const rem = remaining(c);
  const collect = c.kind === 'collect';
  const used = !collect && rem === 0;
  const exp = isExpired(c);
  const hideMystery = c.mystery && rem > 0;
  const R = D.RARITY[c.rarity] || D.RARITY.N;
  const meta = [];
  if (showFrom && c.from) meta.push(`<span class="chip">${c.from === me() ? '我送的' : '來自 ' + esc(nick(c.from))}</span>`);
  if (showOwner) meta.push(`<span class="chip">給 ${esc(nick(c.owner))}</span>`);
  if (c.series) meta.push(`<span class="chip">${esc(c.series)}</span>`);
  if (c.weekendOnly) meta.push('<span class="chip">週末限定</span>');
  if (c.expiresAt && !exp && rem > 0) meta.push(`<span class="chip">⏰ ${fmtDate(c.expiresAt)} 前</span>`);
  if ((c.spice || 1) > 1) meta.push(`<span class="chip">${D.SPICE[c.spice].icon}</span>`);
  if (c.mystery && !c.secret) meta.push('<span class="chip">等待對方寫內容</span>');
  return `<div class="ticket ${c.rarity} emb-${embPalette(c)} ${used ? 'used' : ''} ${exp ? 'expired used' : ''} ${hideMystery ? 'mystery' : ''} ${collect ? 'collect' : ''}" ${act ? `data-act="${act}" data-id="${c.id}"` : ''}>
    <div class="stub"><span class="rk">${collect ? '珍' : R.name}</span><span class="rl">${collect ? '珍藏' : R.label}</span></div>
    <div class="perf"></div>
    <div class="body">
      <div class="t-title">${hideMystery ? '神秘盲盒' : esc(c.title)}</div>
      <div class="t-desc">${hideMystery ? '兌換時才揭曉內容' : esc(c.desc || '')}</div>
      ${meta.length ? `<div class="t-meta">${meta.join('')}</div>` : ''}
    </div>
    <div class="t-emb">${emblemMini(c, hideMystery)}${!collect && (c.qty || 1) > 1 ? `<div class="q">×${rem}<small>/${c.qty}</small></div>` : ''}</div>
    ${used && !exp ? '<div class="stamp-used">已兌換</div>' : ''}${exp ? '<div class="stamp-used">已過期</div>' : ''}
  </div>`;
}
const rarityRank = (r) => D.RARITY_ORDER.indexOf(r);

PAGES.wallet = {
  html() {
    const sub = S.sub.wallet;
    const tabs = [['mine', '我的票夾'], ['sent', '我送出的'], ['wish', '許願池'], ['craft', '合成'], ['book', '收藏冊']];
    const wishN = list('wishes').filter((w) => w.status === 'pending' && w.by !== me()).length;
    return `<div class="page-title"><h2>🎟️ 票夾</h2><span>${list('cards').filter((c) => c.owner === me() && c.kind !== 'collect' && remaining(c) > 0 && !isExpired(c)).length} 種可以用</span></div>
      <div class="seg">${tabs.map(([k, n]) => `<button class="${sub === k ? 'on' : ''}" data-act="sub" data-page="wallet" data-sub="${k}">${n}${k === 'wish' && wishN ? ` (${wishN})` : ''}</button>`).join('')}</div>
      ${({ mine: walletMine, sent: walletSent, wish: walletWish, craft: walletCraft, book: walletBook }[sub] || walletMine)()}`;
  },
};

function walletMine() {
  const mine = list('cards').filter((c) => c.owner === me());
  const fresh = mine.filter((c) => !c.scratched);
  const filter = S.walletFilter || 'ok';
  let cards = mine.filter((c) => c.scratched && c.kind !== 'collect');
  if (filter === 'ok') cards = cards.filter((c) => remaining(c) > 0 && !isExpired(c));
  if (filter === 'used') cards = cards.filter((c) => remaining(c) === 0 || isExpired(c));
  cards.sort((a, b) => (filter === 'ok' ? rarityRank(b.rarity) - rarityRank(a.rarity) : 0) || b.at - a.at);
  return `
    ${fresh.length ? `<div class="card"><h3>✨ 新票券 <span class="sub">刮開看看是什麼</span></h3>
      <div class="new-tickets">${fresh.map((c) => `<button class="scratch-thumb" data-act="scratch" data-id="${c.id}"><span class="q">?</span>刮刮卡<span class="small">${c.from === 'sys' ? '遊樂園送的' : '來自 ' + esc(nick(c.from))}</span></button>`).join('')}</div></div>` : ''}
    <button class="btn block" data-act="giveCard" style="margin-bottom:14px">💌 發一張卡給 ${esc(nick(partner()))}</button>
    <div class="seg">${[['ok', '可以用'], ['used', '用過的'], ['all', '全部']].map(([k, n]) => `<button class="${filter === k ? 'on' : ''}" data-act="walletFilter" data-f="${k}">${n}</button>`).join('')}</div>
    ${cards.length ? cards.map((c) => ticketHTML(c)).join('') : `<div class="empty"><span class="big">🎟️</span>${filter === 'ok' ? '目前沒有可以用的票券<br>去遊樂區扭蛋，或許個願吧' : '這裡空空的'}</div>`}`;
}
ACT.walletFilter = (el) => { S.walletFilter = el.dataset.f; render(); };

function walletSent() {
  const sent = list('cards').filter((c) => c.from === me() && c.owner !== me() && c.kind !== 'collect').sort((a, b) => b.at - a.at);
  return `<p class="small muted" style="margin:0 0 10px">你送給 ${esc(nick(partner()))} 的票券。對方兌換的時候，你會收到通知，記得兌現喔 😉</p>
    ${sent.length ? sent.map((c) => ticketHTML({ ...c, mystery: false }, { showFrom: false, act: 'openSent' })).join('') : '<div class="empty"><span class="big">💌</span>還沒送出任何票券</div>'}`;
}
ACT.openSent = (el) => {
  const c = list('cards').find((x) => x.id === el.dataset.id); if (!c) return;
  let stop = () => {};
  const m = openModal(`${mhead('送出的票券')}
    ${bigCardHTML(c)}
    ${c.mystery ? `<p class="small center">盲盒內容：${c.secret ? esc(c.secret) : '<span class="muted">還沒寫</span>'}</p>` : ''}
    <p class="small muted center" style="margin:0 0 10px">${c.scratched ? '對方已經刮開' : '對方還沒刮開'}</p>
    <div class="btn-row"><button class="btn ghost" data-act="editCard" data-id="${c.id}">編輯卡名和說明</button>
    ${c.mystery && remaining(c) > 0 ? `<button class="btn ghost" data-act="writeSecret" data-id="${c.id}">改寫盲盒內容</button>` : ''}</div>`,
    { center: true, onClose: () => stop() });
  stop = attachCardFX(m);
};

// 送卡的人可以修改卡名和說明
ACT.editCard = (el) => {
  const c = list('cards').find((x) => x.id === el.dataset.id); if (!c) return;
  if (c.from !== me()) return toast('只有送卡的人可以修改');
  closeAll();
  const m = openModal(`${mhead('編輯票券')}
    <label>卡片名稱</label><input id="ec-t" maxlength="24" value="${esc(c.title)}">
    <label>說明</label><textarea id="ec-d" maxlength="80" style="min-height:70px">${esc(c.desc || '')}</textarea>
    <label>代表字（可不填，不填會自動挑）</label><input id="ec-k" maxlength="4" value="${esc(c.mark || '')}" placeholder="一個字" style="font-family:var(--serif);font-size:18px;font-weight:800">
    <p class="small muted">改了之後，對方的票夾也會一起更新</p>
    <button class="btn block" id="ec-ok">儲存</button>`, { center: true });
  $('#ec-ok', m).onclick = async () => {
    const t = $('#ec-t', m).value.trim(); if (!t) return toast('卡片要有名稱');
    await col('cards').update(c.id, { title: t, desc: $('#ec-d', m).value.trim(), mark: Array.from($('#ec-k', m).value.trim())[0] || '' });
    closeModal(m); toast('改好了');
  };
};

// ---------- 送卡動畫：裝信封 → 封蠟 → 飛走 ----------
async function sendAnimation(t, to) {
  const R = D.RARITY[t.rarity] || D.RARITY.N;
  const el = document.createElement('div');
  el.className = 'send-anim';
  el.innerHTML = `<div class="sa-stage" id="sa-st">
      <div class="sa-flap" id="sa-fl"></div>
      <div class="sa-env-back"></div>
      <div class="sa-card" id="sa-cd" style="--rc:${R.color}"><div class="sa-stub" style="${t.rarity === 'SSR' ? 'background:var(--ssr-grad);color:#4a2508' : ''}">${R.name}</div>
        <div class="sa-body">${t.mystery ? '🎁 神秘盲盒' : esc(t.title)}</div></div>
      <div class="sa-env-front"></div>
      <div class="sa-seal" id="sa-sl">💗</div>
    </div>
    <div class="sa-text" id="sa-tx">送給 ${esc(nick(to))} 了 💌<small>等對方刮開吧</small></div>`;
  document.body.appendChild(el);
  let skip = false;
  el.onclick = () => { skip = true; };
  const wait = (ms) => (skip ? Promise.resolve() : sleep(ms));
  await wait(250);
  $('#sa-cd', el).classList.add('in'); vibrate(15);
  await wait(650);
  $('#sa-fl', el).classList.add('closed');
  await wait(450);
  $('#sa-sl', el).classList.add('on'); vibrate(40);
  await wait(500);
  $('#sa-st', el).classList.add('wiggle');
  await wait(700);
  const r = $('#sa-st', el).getBoundingClientRect();
  $('#sa-st', el).classList.remove('wiggle');
  $('#sa-st', el).classList.add('fly'); vibrate([20, 30, 60]);
  for (let i = 0; i < 4; i++) setTimeout(() => floaty(r.left + r.width / 2 + i * 40, r.top - i * 90), i * 160);
  await wait(800);
  $('#sa-tx', el).classList.add('on');
  await wait(1300);
  el.style.transition = 'opacity .3s'; el.style.opacity = 0;
  await sleep(300);
  el.remove();
}

// ---------- 發卡 ----------
ACT.giveCard = (el) => {
  if (!partner()) return toast('對方加入後才能發卡');
  const battleId = el?.dataset?.battle;
  cardEditor({ title: `💌 發卡給 ${nick(partner())}`, give: true }, async (t) => {
    await giveCard(partner(), t);
    if (battleId) await col('battles').update(battleId, { paid: true });
    sendAnimation(t, partner());
  });
};

// ---------- 刮刮卡 ----------
ACT.scratch = (el) => {
  const c = list('cards').find((x) => x.id === el.dataset.id); if (!c) return;
  const R = D.RARITY[c.rarity];
  const m = openModal(`${mhead('刮刮卡')}
    <p class="center small muted" style="margin:0">${c.from === 'sys' ? '遊樂園送你的' : esc(nick(c.from)) + ' 送你的'}，用手指刮開 👆</p>
    <div class="scratch-area" id="sa">
      <div class="under" style="--rc:${R.color}">
        <div class="rk" style="color:${R.color}">${c.kind === 'collect' ? '💝 珍藏' : R.name + ' · ' + R.label}</div>
        <div class="tt">${c.mystery ? '🎁 神秘盲盒' : esc(c.title)}</div>
        <div class="small muted">${c.mystery ? '兌換時才揭曉' : esc(c.desc || '')}</div>
      </div>
      <canvas id="sc"></canvas>
    </div>
    <div class="center"><button class="link" id="sk">刮不動？直接打開</button></div>`, { center: true });
  const cv = $('#sc', m), area = $('#sa', m);
  const W = area.clientWidth, H = area.clientHeight, dpr = window.devicePixelRatio || 1;
  cv.width = W * dpr; cv.height = H * dpr;
  const g = cv.getContext('2d'); g.scale(dpr, dpr);
  const night = document.documentElement.dataset.theme === 'night';
  const grd = g.createLinearGradient(0, 0, W, H);
  grd.addColorStop(0, night ? '#8a7140' : '#cfc8d6'); grd.addColorStop(.5, night ? '#c9a55c' : '#e9e4ee'); grd.addColorStop(1, night ? '#7a6136' : '#bcb4c6');
  g.fillStyle = grd; g.fillRect(0, 0, W, H);
  g.fillStyle = night ? 'rgba(60,40,10,.55)' : 'rgba(90,80,100,.5)';
  g.font = 'bold 22px sans-serif'; g.textAlign = 'center';
  for (let y = 30; y < H; y += 46) for (let x = (y / 46 % 2) * 40 + 20; x < W; x += 80) g.fillText('?', x, y);
  g.font = 'bold 20px sans-serif'; g.fillStyle = night ? '#2a1a05' : '#5b5262';
  g.fillText('刮開看看 ✨', W / 2, H / 2 + 7);
  g.globalCompositeOperation = 'destination-out';
  let done = false, moves = 0, last = null;
  const reveal = async () => {
    if (done) return; done = true;
    cv.style.transition = 'opacity .5s'; cv.style.opacity = 0;
    vibrate([20, 30, 60]);
    if (c.rarity === 'SSR') { confetti(120, ['#f6d365', '#fda085', '#f093fb', '#8fd3f4']); } else confetti(50);
    await col('cards').update(c.id, { scratched: true });
    setTimeout(() => { const b = document.createElement('div'); b.className = 'btn-row'; b.innerHTML = '<button class="btn block" data-act="close">收進票夾</button>'; m.querySelector('.modal').appendChild(b); }, 400);
  };
  const scratchAt = (x, y) => {
    g.lineWidth = 38; g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath();
    if (last) g.moveTo(last.x, last.y); else g.moveTo(x - .1, y);
    g.lineTo(x, y); g.stroke(); last = { x, y };
    if (++moves % 8 === 0) {
      const data = g.getImageData(0, 0, cv.width, cv.height).data;
      let clear = 0, total = 0;
      for (let i = 3; i < data.length; i += 4 * 40) { total++; if (data[i] === 0) clear++; }
      if (clear / total > 0.45) reveal();
    }
  };
  const pos = (e) => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  let down = false;
  cv.addEventListener('pointerdown', (e) => { down = true; last = null; cv.setPointerCapture(e.pointerId); const p = pos(e); scratchAt(p.x, p.y); });
  cv.addEventListener('pointermove', (e) => { if (!down) return; const p = pos(e); scratchAt(p.x, p.y); });
  cv.addEventListener('pointerup', () => { down = false; last = null; });
  $('#sk', m).onclick = reveal;
};

// ---------- 打開卡片 / 兌換儀式 ----------
ACT.openCard = (el) => {
  const c = list('cards').find((x) => x.id === el.dataset.id); if (!c) return;
  const rem = remaining(c), exp = isExpired(c);
  let why = '';
  if (c.kind === 'collect') why = 'collect';
  else if (c.owner !== me()) why = `這是 ${nick(c.owner)} 的票券`;
  else if (rem === 0) why = '這張已經用完了';
  else if (exp) why = '這張已經過期了';
  else if (c.weekendOnly && !isWeekend()) why = '這張是週末限定，週六日才能用';
  else if (c.mystery && !c.secret) why = `${nick(c.from)} 還沒寫好盲盒內容`;
  const hide = c.mystery && rem > 0;
  let stop = () => {};
  const m = openModal(`${mhead(c.kind === 'collect' ? '珍藏卡' : '票券')}
    <div class="ritual">
      ${bigCardHTML(c, { hide })}
      <div id="secret"></div>
      ${why === 'collect' ? `<p class="muted center small">這是一張珍藏卡，收在收藏冊的「${esc(c.series)}」裡</p>`
        : why ? `<p class="muted center">${esc(why)}</p>`
        : `<button class="btn block hold-btn" id="hold"><span class="fill" id="hf"></span>長按兌換這張票券</button>
           <p class="small muted center">${c.from === 'sys' ? '' : esc(nick(c.from)) + ' 會收到通知，'}記得當面兌現喔</p>`}
      ${canSwap(c) ? (c.swapReq ? `<p class="small center" style="color:var(--accent)">已經申請換卡，等 ${esc(nick(partner()))} 同意…</p><button class="btn ghost block" data-act="swapCancel" data-id="${c.id}">取消申請</button>`
        : `<button class="btn ghost block mt" data-act="swapReq" data-id="${c.id}">不想要這張？申請換一張</button>`) : ''}
      ${c.from === me() && c.from !== 'sys' ? `<button class="btn ghost block mt" data-act="editCard" data-id="${c.id}">編輯卡名和說明</button>` : ''}
    </div>`, { center: true, onClose: () => stop() });
  stop = attachCardFX(m);
  const fc = $('#fc', m);
  if (c.kind !== 'collect' && rem === 0) fc.classList.add('used-done');
  const hold = $('#hold', m); if (!hold) return;
  let t0 = 0, raf = 0, fired = false;
  const DUR = 900;
  const step = () => {
    const p = Math.min(1, (performance.now() - t0) / DUR);
    $('#hf', m).style.width = p * 100 + '%';
    if (p >= 1) { fire(); return; }
    raf = requestAnimationFrame(step);
  };
  const start = (e) => { e.preventDefault(); if (fired) return; t0 = performance.now(); vibrate(15); raf = requestAnimationFrame(step); };
  const stopHold = () => { if (fired) return; cancelAnimationFrame(raf); $('#hf', m).style.width = 0; };
  hold.addEventListener('pointerdown', start);
  hold.addEventListener('pointerup', stopHold); hold.addEventListener('pointerleave', stopHold); hold.addEventListener('pointercancel', stopHold);
  hold.addEventListener('contextmenu', (e) => e.preventDefault());
  const fire = async () => {
    fired = true; hold.disabled = true; fc.dataset.lock = '1';
    vibrate([40, 60, 120]);
    if (fc.classList.contains('flipped')) { fc.classList.remove('flipped'); await sleep(650); }
    fc.classList.add('punch');
    await sleep(200);
    $('#bs', m).classList.add('go');
    await sleep(350);
    vibrate(80);
    if (c.rarity === 'SSR' || c.rarity === 'SR') confetti(110); else confetti(50);
    if (c.mystery) $('#secret', m).innerHTML = `<div class="secret-reveal">盲盒揭曉：${esc(c.secret)}</div>`;
    hold.outerHTML = '<p class="center" style="font-weight:700">兌換成功！好好享受</p><button class="btn block" data-act="close">完成</button>';
    await col('cards').update(c.id, { used: (c.used || 0) + 1, log: [...(c.log || []), { at: now(), how: 'redeem' }] });
    if (c.from !== me() && c.from !== 'sys') await notify(c.from, 'redeem', `${nick(me())} 使用了一張票券 ✂️`, c.mystery ? `神秘盲盒：${c.secret}` : c.title);
  };
};

// ---------- 換卡（要對方同意） ----------
// 可以換：自己的、一次都還沒用過、不是系列卡／收藏卡／盲盒
function canSwap(c) {
  return c.owner === me() && partner() && c.kind !== 'collect' && !c.series && !c.mystery && (c.used || 0) === 0 && !isExpired(c);
}
ACT.swapReq = async (el) => {
  const c = list('cards').find((x) => x.id === el.dataset.id); if (!c) return;
  if (!(await confirmBox(`想把「${c.title}」換成另一張 ${c.rarity} 卡嗎？\n要 ${nick(partner())} 同意才會換`, '送出申請'))) return;
  await col('cards').update(c.id, { swapReq: { at: now() } });
  await notify(partner(), 'card', `${nick(me())} 想換一張票券`, c.title);
  closeAll(); toast('申請送出了，等對方同意');
};
ACT.swapCancel = async (el) => { await col('cards').update(el.dataset.id, { swapReq: null }); closeAll(); toast('取消了'); };
ACT.swapJudge = (el) => {
  const c = list('cards').find((x) => x.id === el.dataset.id); if (!c || !c.swapReq) return;
  const m = openModal(`${mhead('換卡申請')}
    <p class="small muted" style="margin-top:0">${esc(nick(c.owner))} 不太想要這張，想換成另一張隨機的 ${c.rarity} 卡：</p>
    ${ticketHTML(c, { act: '', showFrom: false })}
    <div class="btn-row"><button class="btn ghost" id="sj-no">想留著</button><button class="btn" id="sj-ok">同意換</button></div>`, { center: true });
  $('#sj-ok', m).onclick = async () => {
    $('#sj-ok', m).disabled = true;
    const tpl = drawFromPool(c.rarity, true, c.title);
    await giveCard(c.owner, { ...tpl, qty: c.qty || 1 }, { from: me() });
    await col('cards').remove(c.id);
    await notify(c.owner, 'card', '換卡成功，去刮開新的票券吧 🎟️');
    closeModal(m); toast('換好了');
  };
  $('#sj-no', m).onclick = async () => {
    await col('cards').update(c.id, { swapReq: null });
    await notify(c.owner, 'card', '對方想讓你留著這張 😏', c.title);
    closeModal(m);
  };
};

// 對方扭到盲盒時，由送卡的人寫內容
ACT.writeSecret = async (el) => {
  const c = list('cards').find((x) => x.id === el.dataset.id); if (!c) return;
  closeAll();
  const v = await promptBox('🎁 偷偷寫下盲盒內容', { placeholder: '對方兌換時才會看到…', value: c.secret || '', ok: '封存' });
  if (!v) return;
  await col('cards').update(c.id, { secret: v });
  if (!c.secret) await notify(c.owner, 'mystery', '你的神秘盲盒準備好了 🎁');
  toast('封存好了 🤫');
};

// ---------- 許願池 ----------
function walletWish() {
  const ws = list('wishes').sort((a, b) => (a.status === 'pending' ? -1 : 0) - (b.status === 'pending' ? -1 : 0) || b.at - a.at);
  const theirs = ws.filter((w) => w.by !== me() && w.status === 'pending');
  const rest = ws.filter((w) => !(w.by !== me() && w.status === 'pending'));
  const st = { pending: '⏳ 等待中', ok: '✨ 實現了', no: '💤 下次吧' };
  return `<div class="card center" style="background:linear-gradient(160deg,color-mix(in srgb,var(--r-sr) 22%,var(--card)),var(--card))">
      <div style="font-size:46px">🌠</div><h3 style="justify-content:center">許願池</h3>
      <p class="small muted" style="margin:0 0 10px">想要什麼票券，就對流星許願吧。${esc(nick(partner()))} 點頭，票券就會飛進你的票夾。</p>
      <button class="btn" data-act="makeWish">許一個願</button></div>
    ${theirs.length ? `<h3 style="margin:4px 2px 8px">${esc(nick(partner()))} 的願望</h3>${theirs.map((w) => `<div class="card"><div class="row"><span class="chip" style="color:var(--r-${w.rarity.toLowerCase()})">${w.rarity}</span><b class="grow" style="font-family:var(--serif)">${esc(w.title)}</b></div>
      ${w.note ? `<p class="small muted" style="margin:6px 0 0">${esc(w.note)}</p>` : ''}
      <div class="btn-row"><button class="btn ghost sm" data-act="wishNo" data-id="${w.id}">下次吧</button><button class="btn sm" data-act="wishOk" data-id="${w.id}">✨ 實現願望</button></div></div>`).join('')}` : ''}
    ${rest.length ? `<h3 style="margin:10px 2px 8px">願望紀錄</h3>${rest.map((w) => `<div class="list-row"><span class="lr-i">${w.by === me() ? '🙋' : '💁'}</span><span class="grow">${esc(w.title)}<div class="small muted">${esc(nick(w.by))} · ${fmtDate(w.at)}</div></span><span class="small">${st[w.status]}</span></div>`).join('')}` : ''}`;
}
ACT.makeWish = () => {
  if (!partner()) return toast('對方加入後才能許願');
  cardEditor({ title: '🌠 許一個願' }, async (t) => {
    await col('wishes').add({ by: me(), title: t.title, desc: t.desc, rarity: t.rarity, spice: t.spice, mark: t.mark || '', status: 'pending', at: now() });
    await notify(partner(), 'wish', '有人在許願池許了願 🌠');
    toast('願望送出了 🌠');
  });
};
ACT.wishOk = async (el) => {
  const w = list('wishes').find((x) => x.id === el.dataset.id); if (!w) return;
  await giveCard(w.by, { title: w.title, desc: w.desc, rarity: w.rarity, spice: w.spice, mark: w.mark || '' });
  await col('wishes').update(w.id, { status: 'ok', doneAt: now() });
  await notify(w.by, 'wish', '你的願望實現了 ✨');
  sendAnimation(w, w.by);
};
ACT.wishNo = async (el) => {
  if (!(await confirmBox('這次先不要？'))) return;
  await col('wishes').update(el.dataset.id, { status: 'no' });
  await notify(list('wishes').find((x) => x.id === el.dataset.id)?.by, 'wish', '你的一個願望要等下次了 💤');
};

// ---------- 合成 ----------
function craftable() {
  return list('cards').filter((c) => c.owner === me() && c.scratched && c.kind !== 'collect' && !c.series && !c.mystery && remaining(c) > 0 && !isExpired(c));
}
// 自選合成：選 3 張同稀有度的卡（同一張有多張時可以選幾張）
S.craftSel = S.craftSel || {};
const craftTotal = () => sum(Object.values(S.craftSel), (n) => n);
function craftRarity() {
  const id = Object.keys(S.craftSel).find((k) => S.craftSel[k] > 0);
  const c = id && list('cards').find((x) => x.id === id);
  return c ? c.rarity : '';
}
function walletCraft() {
  const n = D.CRAFT_COST;
  const cs = craftable().filter((c) => c.rarity !== 'SSR');
  // 清掉已經不能用的選擇
  for (const id of Object.keys(S.craftSel)) { const c = cs.find((x) => x.id === id); if (!c || S.craftSel[id] <= 0) delete S.craftSel[id]; else S.craftSel[id] = Math.min(S.craftSel[id], remaining(c)); }
  const total = craftTotal(), r = craftRarity();
  const to = r ? D.RARITY_ORDER[rarityRank(r) + 1] : '';
  const groups = ['N', 'R', 'SR'].map((rr) => [rr, cs.filter((c) => c.rarity === rr).sort((a, b) => a.title.localeCompare(b.title))]).filter(([, a]) => a.length);
  return `<div class="card center"><div style="font-size:40px">⚗️</div><h3 style="justify-content:center">合成工坊</h3>
      <p class="small muted" style="margin:0">挑 ${n} 張<b>同稀有度</b>、不想要的票券，合成 1 張高一級的隨機卡（從卡池抽，由 ${esc(nick(partner()))} 兌現）</p></div>
    <div class="craft-bar card">
      <div class="row"><div class="grow"><b style="font-family:var(--serif);font-size:17px">已選 ${total} / ${n}</b>${r ? ` <span class="chip" style="color:var(--r-${r.toLowerCase()})">${r}</span>` : ''}
        <div class="small muted">${r ? `合成後得到 1 張 ${to} 刮刮卡` : '先點一張卡開始選'}</div></div>
        ${total ? '<button class="small muted" data-act="craftClear">清除</button>' : ''}</div>
      <button class="btn block mt" data-act="craft" ${total === n && partner() ? '' : 'disabled'}>${total === n ? `合成 1 張 ${to}` : `還要選 ${n - total} 張`}</button>
    </div>
    ${groups.length ? groups.map(([rr, arr]) => `<h3 class="craft-h" style="color:var(--r-${rr.toLowerCase()})">${rr} · ${D.RARITY[rr].label}</h3>
      ${arr.map((c) => {
        const sel = S.craftSel[c.id] || 0, rem = remaining(c);
        const off = (r && r !== c.rarity) || (!sel && total >= n);
        return `<div class="craft-row emb-${embPalette(c)} ${sel ? 'on' : ''} ${off ? 'off' : ''}" ${off ? '' : `data-act="craftAdd" data-id="${c.id}"`}>
          <div style="width:46px;height:46px;flex:none">${emblemMini(c)}</div>
          <div class="grow"><b>${esc(c.title)}</b><div class="small muted">剩 ${rem} 張${c.from && c.from !== 'sys' ? ' · 來自 ' + esc(nick(c.from)) : ''}</div></div>
          ${sel ? `<button class="craft-minus" data-act="craftSub" data-id="${c.id}">−</button><span class="craft-n">${sel}</span>` : ''}
          ${!off && sel < rem && total < n ? `<button class="craft-plus" data-act="craftAdd" data-id="${c.id}">＋</button>` : ''}
        </div>`;
      }).join('')}`).join('')
      : '<div class="empty"><span class="big">⚗️</span>目前沒有可以合成的票券</div>'}
    <p class="small muted center" style="margin-top:12px">SSR、生日／節日／旅行等系列卡、收藏卡和神秘盲盒不能合成</p>`;
}
ACT.craftAdd = (el, e) => {
  e && e.stopPropagation();
  const c = list('cards').find((x) => x.id === el.dataset.id); if (!c) return;
  const r = craftRarity();
  if (r && r !== c.rarity) return toast('要選同一個稀有度的卡');
  if (craftTotal() >= D.CRAFT_COST) return toast(`最多選 ${D.CRAFT_COST} 張`);
  const cur = S.craftSel[c.id] || 0;
  if (cur >= remaining(c)) return toast('這張已經全部選了');
  S.craftSel[c.id] = cur + 1; vibrate(10); render();
};
ACT.craftSub = (el, e) => {
  e && e.stopPropagation();
  const id = el.dataset.id;
  S.craftSel[id] = Math.max(0, (S.craftSel[id] || 0) - 1);
  if (!S.craftSel[id]) delete S.craftSel[id];
  render();
};
ACT.craftClear = () => { S.craftSel = {}; render(); };
ACT.craft = async () => {
  const r = craftRarity(), to = D.RARITY_ORDER[rarityRank(r) + 1];
  const picks = Object.entries(S.craftSel).map(([id, k]) => [list('cards').find((x) => x.id === id), k]).filter(([c, k]) => c && k > 0);
  if (sum(picks, ([, k]) => k) !== D.CRAFT_COST || !to || picks.some(([c]) => c.rarity !== r)) return toast(`要選 ${D.CRAFT_COST} 張同稀有度的卡`);
  const names = picks.map(([c, k]) => `${c.title}${k > 1 ? ' ×' + k : ''}`).join('、');
  if (!(await confirmBox(`要用掉這 ${D.CRAFT_COST} 張 ${r} 票券嗎？\n${names}`, '合成！'))) return;
  for (const [c, k] of picks) {
    await col('cards').update(c.id, { used: (c.used || 0) + k, log: [...(c.log || []), ...Array.from({ length: k }, () => ({ at: now(), how: 'craft' }))] });
  }
  S.craftSel = {};
  const tpl = drawFromPool(to, true);
  const m = openModal(`<div class="center" style="padding:20px 0"><div style="font-size:70px;animation:spin 1s linear infinite">⚗️</div><h2>合成中…</h2></div>`, { center: true });
  await sleep(1300);
  closeModal(m);
  const id = await giveCard(me(), tpl, { from: tpl.by && tpl.by !== 'sys' && tpl.by !== me() ? tpl.by : (partner() || 'sys') });
  await col('gacha').add({ uid: me(), rarity: tpl.rarity, title: tpl.title, how: 'craft', at: now() });
  if (tpl.mystery) await notify(partner(), 'mystery', '有一張神秘盲盒等你寫內容 🎁');
  toast(`合成成功！得到一張 ${to} 刮刮卡`);
  setTimeout(() => ACT.scratch({ dataset: { id } }), 500);
};

// ---------- 收藏冊 ----------
function seriesCollected(c) { return c.kind === 'collect' || (c.log || []).some((l) => l.how !== 'craft'); }
function walletBook() {
  const all = list('cards').filter((c) => c.series);
  const series = {};
  all.forEach((c) => (series[c.series] ||= []).push(c));
  const order = [D.BIRTHDAY_SERIES, '節日系列', '旅行系列', ...Object.keys(series)].filter((v, i, a) => a.indexOf(v) === i && series[v]);
  if (!order.length) return '<div class="empty"><span class="big">📖</span>收藏冊還是空的<br>生日卡、節日限定卡、旅行限定卡都會收在這裡</div>';
  return order.map((name) => {
    const cs = series[name].sort((a, b) => (a.kind === 'collect' ? 1 : 0) - (b.kind === 'collect' ? 1 : 0) || rarityRank(a.rarity) - rarityRank(b.rarity));
    const got = cs.filter(seriesCollected).length;
    const isB = name === D.BIRTHDAY_SERIES;
    const full = got === cs.length;
    return `<div class="book-cover ${isB && !full ? 'locked' : ''}">
        <div class="small" style="opacity:.8">${isB ? '25 歲生日限定' : '限定收藏'}</div>
        <h2>${esc(name)}</h2>
        ${isB ? `<div class="slogan">${full ? '「' + D.BIRTHDAY_SLOGAN + '」' : '「把每張卡都用過一次，就會解鎖」'}</div>` : ''}
        <div class="prog">收集進度 ${got} / ${cs.length}${isB && !full ? ' · 每張卡至少兌換一次就算收集到' : ''}</div>
      </div>
      ${cs.map((c) => `<div style="${seriesCollected(c) ? '' : 'filter:grayscale(.85);opacity:.55'}">${ticketHTML(c, { showFrom: false, showOwner: c.owner !== me() })}</div>`).join('')}`;
  }).join('<div style="height:14px"></div>');
}
// ============================================================
//  🎰 遊樂區：扭蛋、命運轉盤、吃什麼、真心話大冒險、默契問答、對戰、集點章、每週任務
// ============================================================

function rollRarity() {
  const tot = sum(D.RARITY_ORDER, (r) => D.RARITY[r].weight);
  let x = Math.random() * tot;
  for (const r of D.RARITY_ORDER) { x -= D.RARITY[r].weight; if (x <= 0) return r; }
  return 'N';
}
// 保底：依照自己扭蛋紀錄，算出連續幾抽沒出某個稀有度以上
function pitySince(minRarity) {
  const min = rarityRank(minRarity);
  const mine = list('gacha').filter((g) => g.uid === me() && g.how === 'gacha').sort((a, b) => b.at - a.at);
  let n = 0;
  for (const g of mine) { if (rarityRank(g.rarity) >= min) break; n++; }
  return n;
}
function rollWithPity() {
  let r = rollRarity();
  const pickFrom = (rs) => { const tot = sum(rs, (x) => D.RARITY[x].weight); let v = Math.random() * tot; for (const x of rs) { v -= D.RARITY[x].weight; if (v <= 0) return x; } return rs[0]; };
  if (pitySince('SSR') + 1 >= D.PITY.SSR) return 'SSR';
  if (pitySince('SR') + 1 >= D.PITY.SR && rarityRank(r) < rarityRank('SR')) return pickFrom(['SR', 'SSR']);
  if (pitySince('R') + 1 >= D.PITY.R && r === 'N') return pickFrom(['R', 'SR', 'SSR']);
  return r;
}

// 卡池裡標記「只能由誰兌現」的卡（舊空間的卡沒有欄位，就用卡名對照）
const GIVER_BY_TITLE = Object.fromEntries(D.POOL.filter((p) => p.giver).map((p) => [p.title, p.giver]));
const poolGiver = (p) => (p.giver !== undefined ? p.giver : GIVER_BY_TITLE[p.title] || '');
function drawFromPool(rarity, exact = false, exclude = '') {
  const lv = spiceLevel();
  const ful = partner();
  const role = ful ? prof(ful).role : '';
  const pool = list('pool').filter((p) => (p.spice || 1) <= lv && p.title !== exclude && (!poolGiver(p) || !role || poolGiver(p) === role));
  let r = rarityRank(rarity);
  while (r >= 0) {
    const cand = pool.filter((p) => p.rarity === D.RARITY_ORDER[r]);
    if (cand.length) { const p = pick(cand); return { title: p.title, desc: p.desc || '', rarity: exact ? rarity : p.rarity, spice: p.spice || 1, mystery: !!p.mystery, mark: p.mark || '', by: p.by }; }
    r--;
  }
  return { title: '抱抱一次', desc: '卡池空空的，先抱一下', rarity, spice: 1, by: 'sys' };
}

PAGES.play = {
  html() {
    const p = partner();
    const q = todayQuiz();
    const quizNew = q ? !(q.answers || {})[me()] : true;
    const fateUsed = (S.couple.spins || {})[me()] === weekKey();
    const bt = activeBattle();
    return `<div class="page-title"><h2>🎰 遊樂區</h2><span>🪙 ${balance(me())} 點${tickets(me()) ? ` · 🎫 ${tickets(me())}` : ''}</span></div>
    <div class="game-tiles">
      <button class="game-tile wide" data-act="gacha" style="background:linear-gradient(135deg,color-mix(in srgb,var(--accent) 22%,var(--card)),var(--card))">
        <span class="gi" style="font-size:44px">🎰</span><div class="grow"><b>扭蛋機</b><br><span>${D.POINTS.gachaCost} 點扭一次 · SSR 機率 ${D.RARITY.SSR.weight}%</span></div><span style="font-size:22px">›</span></button>
      <button class="game-tile" data-act="fate"><span class="gi">🎡</span><b>命運轉盤</b><span>${fateUsed ? '這週轉過了' : '每週免費一次！'}</span>${fateUsed ? '' : '<span class="badge-dot">1</span>'}</button>
      <button class="game-tile" data-act="food"><span class="gi">🍽️</span><b>今天吃什麼</b><span>選擇障礙救星</span></button>
      <button class="game-tile" data-act="tod"><span class="gi">🎲</span><b>真心話大冒險</b><span>${D.SPICE[spiceLevel()].icon} 目前：${D.SPICE[spiceLevel()].label}</span></button>
      <button class="game-tile" data-act="quiz"><span class="gi">🧠</span><b>默契問答</b><span>${quizNew ? '今天的題目來了' : (q && p && q.answers[p] ? '看結果' : '等對方作答')}</span>${quizNew ? '<span class="badge-dot">!</span>' : ''}</button>
      <button class="game-tile wide" data-act="battle"><span class="gi">⚔️</span><div class="grow"><b>對戰挑戰</b><br><span>${bt ? `進行中：${esc(bt.task)}` : '一週內誰先完成？輸的人發卡'}</span></div><span style="font-size:22px">›</span></button>
    </div>
    ${stampCardHTML()}
    ${weeklyHTML()}`;
  },
};

// ---------- 扭蛋機 ----------
ACT.gacha = () => {
  const balls = Array.from({ length: 14 }, (_, i) => {
    const c = pick(['#ff6f91', '#ffc75f', '#845ec2', '#4fd1c5', '#5a9bf0', '#f9a8d4', '#a3e635']);
    return `<div class="gm-ball" style="--c:${c};left:${8 + (i % 5) * 36 + (Math.floor(i / 5) % 2) * 16}px;top:${110 - Math.floor(i / 5) * 34 + Math.random() * 6}px;transform:rotate(${Math.random() * 360}deg)"></div>`;
  }).join('');
  const m = openModal(`${mhead('🎰 扭蛋機')}
    <div class="gacha-machine" id="gm"><div class="gm-dome">${balls}</div><div class="gm-base"><div class="gm-knob" id="kn"></div><div class="gm-slot"></div><div class="gm-out" id="go"></div></div></div>
    <div id="gres"></div>
    <div id="gbtns">
      <div class="btn-row"><button class="btn" id="g-pt">扭一次（${D.POINTS.gachaCost} 點）</button>${tickets(me()) ? `<button class="btn gold" id="g-tk">用扭蛋券 🎫${tickets(me())}</button>` : ''}</div>
      <p class="center small muted">我的點數：🪙 ${balance(me())} · 機率 N ${D.RARITY.N.weight}% / R ${D.RARITY.R.weight}% / SR ${D.RARITY.SR.weight}% / SSR ${D.RARITY.SSR.weight}%</p>
    </div>`, { center: true });
  const go = async (useTicket) => {
    if (useTicket) { if (tickets(me()) < 1) return toast('沒有扭蛋券'); }
    else if (balance(me()) < D.POINTS.gachaCost) return toast(`點數不夠，還差 ${D.POINTS.gachaCost - balance(me())} 點`);
    $('#gbtns', m).innerHTML = '';
    if (useTicket) await addTicket(me(), -1); else await addPoints(me(), -D.POINTS.gachaCost, '扭蛋');
    const rarity = rollWithPity();
    const tpl = drawFromPool(rarity, true);
    const R = D.RARITY[rarity];
    $('#kn', m).style.transform = 'rotate(540deg)';
    vibrate(30);
    await sleep(700);
    $('#gm', m).classList.add('shake');
    vibrate([20, 30, 20, 30, 20]);
    await sleep(750);
    const out = $('#go', m);
    out.style.setProperty('--c', { N: '#5fbf9a', R: '#5a9bf0', SR: '#a66bf0', SSR: '#f6d365' }[rarity]);
    out.classList.add('drop');
    await sleep(800);
    const from = tpl.by && tpl.by !== 'sys' && tpl.by !== me() ? tpl.by : (partner() || 'sys');
    const id = await giveCard(me(), tpl, { from, scratched: true });
    await col('gacha').add({ uid: me(), rarity, title: tpl.title, how: 'gacha', at: now() });
    if (tpl.mystery && partner()) await notify(partner(), 'mystery', '有一張神秘盲盒等你寫內容 🎁');
    let rays = null;
    if (rarity === 'SSR') { rays = document.createElement('div'); rays.className = 'ssr-rays'; document.body.appendChild(rays); confetti(150, ['#f6d365', '#fda085', '#f093fb', '#8fd3f4', '#fff']); vibrate([60, 40, 60, 40, 200]); }
    else if (rarity === 'SR') confetti(80, ['#a66bf0', '#d6b4ff', '#fff']);
    const card = { id, ...cardDoc(tpl, me(), from), scratched: true };
    $('#gres', m).innerHTML = `<div class="center" style="font-family:var(--serif);font-weight:900;font-size:${rarity === 'SSR' ? 30 : 22}px;color:${R.color}">${rarity === 'SSR' ? '✨ SSR 傳說降臨 ✨' : rarity === 'SR' ? '稀有！SR' : rarity + ' · ' + R.label}</div>
      <div class="reveal-card rarity-burst" style="--bc:${R.color};margin:10px 0">${ticketHTML(card, { act: '' })}</div>
      ${tpl.mystery ? `<p class="small muted center">${esc(nick(partner()))} 會偷偷幫你寫盲盒內容 🎁</p>` : ''}
      <div class="btn-row"><button class="btn ghost" id="g-again">再扭一次</button><button class="btn" data-act="close">收下</button></div>`;
    $('#g-again', m).onclick = () => { rays && rays.remove(); closeModal(m); ACT.gacha(); };
    m._onClose = () => rays && rays.remove();
  };
  $('#g-pt', m).onclick = () => go(false);
  $('#g-tk', m) && ($('#g-tk', m).onclick = () => go(true));
};

// ---------- 轉盤元件 ----------
const WHEEL_COLORS = ['#ff8fab', '#ffc75f', '#9b8cf5', '#5fd3bc', '#ff9671', '#7ab8ff', '#f9a8d4', '#b7e36b', '#ffb4a2', '#c4a1ff', '#80deea', '#ffd54f'];
function wheelSVG(labels) {
  const n = labels.length, seg = 360 / n, R = 150, cx = 150, cy = 150;
  const pt = (a, r) => [cx + r * Math.sin(a * Math.PI / 180), cy - r * Math.cos(a * Math.PI / 180)];
  const base = n > 10 ? 11 : n > 7 ? 13 : 15;
  let s = `<svg viewBox="0 0 300 300" id="wh"><circle cx="150" cy="150" r="149" fill="#fff"/>`;
  labels.forEach((l, i) => {
    const a0 = i * seg, a1 = (i + 1) * seg;
    const [x0, y0] = pt(a0, R - 4), [x1, y1] = pt(a1, R - 4);
    s += `<path d="M150 150 L${x0} ${y0} A${R - 4} ${R - 4} 0 ${seg > 180 ? 1 : 0} 1 ${x1} ${y1} Z" fill="${WHEEL_COLORS[i % WHEEL_COLORS.length]}" stroke="#fff" stroke-width="2"/>`;
    const mid = a0 + seg / 2, [tx, ty] = pt(mid, R * 0.6);
    // 字太長就縮小字體，超過 9 個字才截斷
    const txt = l.length > 9 ? l.slice(0, 8) + '…' : l;
    const fs = txt.length > 5 ? Math.max(9, Math.round(base * 5 / txt.length)) : base;
    s += `<text x="${tx}" y="${ty}" transform="rotate(${mid - 90} ${tx} ${ty})" text-anchor="middle" dominant-baseline="middle" font-size="${fs}" font-weight="800" fill="#3b2330" font-family="sans-serif">${esc(txt)}</text>`;
  });
  return s + '</svg>';
}
function spinTo(svg, n, idx) {
  const seg = 360 / n;
  const prev = +(svg.dataset.rot || 0);
  const jitter = (Math.random() - 0.5) * seg * 0.7;
  let target = 360 - (idx + 0.5) * seg + jitter;
  const base = Math.ceil(prev / 360) * 360 + 360 * 6;
  const rot = base + ((target % 360) + 360) % 360;
  svg.dataset.rot = rot;
  svg.style.transform = `rotate(${rot}deg)`;
  return sleep(4300);
}
function weightedIndex(ws) { let x = Math.random() * sum(ws, (w) => w); for (let i = 0; i < ws.length; i++) { x -= ws[i]; if (x <= 0) return i; } return 0; }

// ---------- 命運轉盤 ----------
ACT.fate = () => {
  const used = (S.couple.spins || {})[me()] === weekKey();
  const W = D.FATE_WHEEL;
  const m = openModal(`${mhead('🎡 命運轉盤')}
    <p class="center small muted" style="margin:0">每週免費轉一次，看看這週的運氣</p>
    <div class="wheel-wrap"><div class="wheel-pointer"></div>${wheelSVG(W.map((x) => x.label))}<div class="wheel-hub">🎡</div></div>
    <div id="fres"></div>
    <button class="btn block" id="fgo" ${used ? 'disabled' : ''}>${used ? '這週已經轉過了，下週一再來' : '轉！'}</button>`, { center: true });
  $('#fgo', m).onclick = async () => {
    $('#fgo', m).disabled = true;
    const ok = await S.store.coupleTx(S.cid, (c) => ((c.spins || {})[me()] === weekKey() ? null : { [`spins.${me()}`]: weekKey() }));
    if (!ok) return toast('這週已經轉過了');
    const idx = weightedIndex([20, 10, 12, 18, 20, 10, 8, 4]);
    vibrate(20);
    await spinTo($('#wh', m), W.length, idx);
    const r = W[idx];
    let msg = '';
    if (r.type === 'points') { await addPoints(me(), r.value, '命運轉盤'); msg = `獲得 ${r.value} 點 🪙`; }
    if (r.type === 'ticket') { await addTicket(me(), 1); msg = '獲得一張扭蛋券 🎫'; }
    if (r.type === 'hug') { msg = `去抱 ${nick(partner())} 10 秒 🤗`; await notify(partner(), 'card', `${nick(me())} 轉到了抱抱，準備被抱 🤗`); }
    if (r.type === 'card') {
      const tpl = drawFromPool(r.value, true);
      const from = partner() || 'sys';
      await giveCard(me(), tpl, { from, scratched: true });
      if (tpl.mystery) await notify(partner(), 'mystery', '有一張神秘盲盒等你寫內容 🎁');
      msg = `獲得 ${r.value} 卡「${tpl.mystery ? '神秘盲盒' : tpl.title}」🎟️`;
    }
    confetti(60);
    $('#fres', m).innerHTML = `<div class="prompt-card">${esc(msg)}</div>`;
    $('#fgo', m).textContent = '下週再來轉 👋';
  };
};

// ---------- 今天吃什麼 ----------
ACT.food = () => {
  const foods = S.couple.food && S.couple.food.length ? S.couple.food : D.DEFAULT_FOOD;
  const m = openModal(`${mhead('🍽️ 今天吃什麼')}
    <div class="wheel-wrap"><div class="wheel-pointer"></div>${wheelSVG(foods)}<div class="wheel-hub">🍽️</div></div>
    <div id="fdres"></div>
    <div class="btn-row"><button class="btn ghost" id="fed">編輯選項</button><button class="btn" id="fsp">轉！</button></div>`, { center: true });
  $('#fsp', m).onclick = async () => {
    $('#fsp', m).disabled = true;
    const idx = Math.floor(Math.random() * foods.length);
    await spinTo($('#wh', m), foods.length, idx);
    $('#fdres', m).innerHTML = `<div class="prompt-card">今天就吃「${esc(foods[idx])}」！</div>
      ${partner() ? '<button class="btn ghost block mt" id="ftell">告訴對方</button>' : ''}`;
    $('#fsp', m).disabled = false; $('#fsp', m).textContent = '不滿意，再轉一次';
    $('#ftell', m) && ($('#ftell', m).onclick = async () => { await notify(partner(), 'card', `今天吃什麼？轉盤說：${foods[idx]} 🍽️`); toast('傳過去了'); });
  };
  $('#fed', m).onclick = async () => {
    const v = await promptBox('一行一個選項', { multiline: true, value: foods.join('\n'), ok: '儲存' });
    if (!v) return;
    const arr = v.split('\n').map((x) => x.trim()).filter(Boolean).slice(0, 16);
    if (arr.length < 2) return toast('至少要兩個選項');
    await S.store.updateCouple(S.cid, { food: arr });
    closeModal(m); setTimeout(ACT.food, 200);
  };
};

// ---------- 真心話大冒險 ----------
// 把題目裡的「我／對方」換成真正的暱稱，開頭加上回答的人
//   「我」= 出題的人（另一個人），「我們」不換，引號「」裡的字不換
function personalize(text, asker, answerer) {
  const out = text.split(/(「[^」]*」)/).map((seg) => (seg.startsWith('「') ? seg
    : seg.replace(/對方/g, asker).replace(/我(?!們)/g, asker))).join('');
  return `${answerer}，${out}`;
}
ACT.tod = () => {
  const max = spiceLevel();
  const ms = (S.couple.members || []).slice();
  let turn = ms.includes(localStorage.getItem('park-tod-turn')) ? localStorage.getItem('park-tod-turn') : me();
  const other = (u) => ms.find((x) => x !== u) || u;
  let lv = Math.min(+(localStorage.getItem('park-tod-lv') || 1), max);
  const m = openModal(`${mhead('🎲 真心話大冒險')}
    <div class="seg" id="tlv">${[1, 2, 3].map((l) => `<button data-l="${l}" class="${l === lv ? 'on' : ''}" ${l > max ? 'disabled style="opacity:.4"' : ''}>${D.SPICE[l].icon} ${D.SPICE[l].label}${l > max ? ' 🔒' : ''}</button>`).join('')}</div>
    ${max < 3 ? `<p class="small muted" style="margin:0">想解鎖更高等級？兩人都要到設定裡打開</p>` : ''}
    ${ms.length > 1 ? `<div class="row" style="justify-content:center;gap:8px;margin-top:10px"><span class="small muted">輪到</span>
      <div class="seg" id="tturn" style="padding:0">${ms.map((u) => `<button data-u="${u}" class="${u === turn ? 'on' : ''}">${avatar(u)} ${esc(nick(u))}</button>`).join('')}</div></div>` : ''}
    <div class="dice" id="dc">🎲</div>
    <div id="tres"></div>
    <div class="btn-row"><button class="btn ghost" data-k="truth">真心話</button><button class="btn" data-k="rand">讓骰子決定</button><button class="btn ghost" data-k="dare">大冒險</button></div>`, { center: true });
  $$('#tlv button', m).forEach((b) => b.onclick = () => { if (+b.dataset.l > max) return; lv = +b.dataset.l; localStorage.setItem('park-tod-lv', lv); $$('#tlv button', m).forEach((x) => x.classList.toggle('on', x === b)); });
  const setTurn = (u) => { turn = u; localStorage.setItem('park-tod-turn', u); $$('#tturn button', m).forEach((x) => x.classList.toggle('on', x.dataset.u === u)); };
  $$('#tturn button', m).forEach((b) => b.onclick = () => setTurn(b.dataset.u));
  $$('[data-k]', m).forEach((b) => b.onclick = async () => {
    let k = b.dataset.k;
    if (k === 'rand') k = Math.random() < .5 ? 'truth' : 'dare';
    const dc = $('#dc', m);
    dc.classList.remove('roll'); void dc.offsetWidth; dc.classList.add('roll');
    vibrate([15, 30, 15, 30, 15]);
    $('#tres', m).innerHTML = '';
    await sleep(900);
    const pool = [];
    for (let l = 1; l <= lv; l++) pool.push(...(k === 'truth' ? D.TRUTH : D.DARE)[l].map((t) => ({ t, l })));
    const pref = pool.filter((x) => x.l === lv);
    const x = Math.random() < .65 && pref.length ? pick(pref) : pick(pool);
    dc.textContent = k === 'truth' ? '💬' : '🔥';
    const answerer = turn, asker = other(turn);
    const show = (x) => {
      const txt = ms.length > 1 ? personalize(x.t, nick(asker), nick(answerer)) : x.t;
      $('#tres', m).innerHTML = `<div class="prompt-card"><div class="small muted" style="font-family:var(--sans)">${k === 'truth' ? '真心話' : '大冒險'} · ${D.SPICE[x.l].icon} · ${esc(nick(answerer))} ${k === 'truth' ? '回答' : '挑戰'}</div>${esc(txt)}</div>
        <div class="center"><button class="link" id="t-swap" style="margin-top:8px">換一題（兩個人都同意才換）</button></div>`;
      $('#t-swap', m).onclick = async () => {
        if (!(await confirmBox('兩個人都同意換一題嗎？', '都同意，換！'))) return;
        const rest = pool.filter((y) => y.t !== x.t);
        const p2 = rest.filter((y) => y.l === lv);
        show(Math.random() < .65 && p2.length ? pick(p2) : pick(rest));
      };
    };
    show(x);
    if (ms.length > 1) setTurn(asker); // 下一輪換另一個人
  });
};

// ---------- 默契問答 ----------
function todayQuiz() { return list('quiz').find((x) => x.id === dkey()); }
const quizIndex = () => hash(dkey() + (S.cid || '')) % D.QUIZ.length;
ACT.quiz = () => {
  const draw = (m) => {
    const doc = todayQuiz();
    const qi = doc ? doc.qi : quizIndex();
    const Q = D.QUIZ[qi];
    const a = doc?.answers || {};
    const p = partner();
    const mine = a[me()], theirs = p ? a[p] : undefined;
    const both = mine !== undefined && theirs !== undefined;
    const done = list('quiz').filter((x) => x.match !== undefined);
    const rate = done.length ? Math.round(done.filter((x) => x.match).length / done.length * 100) : 0;
    const html = `${mhead('🧠 默契問答')}
      <p class="small muted" style="margin:0 0 8px">兩人各自作答，答案一樣兩人都拿 ${D.POINTS.quizMatch} 點。目前默契度 ${rate}%（${done.length} 題）</p>
      <div style="font-family:var(--serif);font-size:20px;font-weight:800">${esc(Q.q)}</div>
      ${Q.opts.map((o, i) => `<button class="quiz-opt ${both && mine === i ? 'mine' : ''} ${both && theirs === i ? 'theirs' : ''} ${!both && mine === i ? 'mine' : ''}" data-i="${i}" ${mine !== undefined ? 'disabled' : ''}>
        ${esc(o)}<span class="tags">${both ? `${mine === i ? avatar(me()) : ''}${theirs === i ? avatar(p) : ''}` : mine === i ? '✓' : ''}</span></button>`).join('')}
      <div class="mt center">${both ? (mine === theirs ? `<div class="prompt-card">💞 心有靈犀！兩人各 +${D.POINTS.quizMatch} 點</div>` : `<div class="prompt-card">😆 不一樣！聊聊為什麼吧（各 +${D.POINTS.quizMiss} 點）</div>`)
        : mine !== undefined ? `<p class="muted">已作答，等 ${esc(nick(p))} 回答後揭曉 🔒</p>` : theirs !== undefined ? `<p class="muted">${esc(nick(p))} 已經答好了，換你！</p>` : ''}</div>`;
    if (!m) m = openModal(html, { center: true }); else m.querySelector('.modal').innerHTML = html;
    $$('[data-i]', m).forEach((b) => b.onclick = async () => {
      const i = +b.dataset.i;
      const id = dkey();
      const cur = todayQuiz();
      if (cur) await col('quiz').update(id, { [`answers.${me()}`]: i });
      else await col('quiz').set(id, { qi, answers: { [me()]: i }, at: now() });
      const th = p ? (cur?.answers || {})[p] : undefined;
      if (th !== undefined) {
        const match = th === i;
        await col('quiz').update(id, { match });
        const pts = match ? D.POINTS.quizMatch : D.POINTS.quizMiss;
        await addPoints(me(), pts, '默契問答'); await addPoints(p, pts, '默契問答');
        await notify(p, 'quiz', match ? '默契問答：心有靈犀 💞' : '默契問答結果出爐了 🧠');
        if (match) confetti(70);
      } else await notify(p, 'quiz', `${nick(me())} 答完今天的默契問答了，換你 🧠`);
      setTimeout(() => draw(m), 250);
    });
    return m;
  };
  draw();
};

// ---------- 對戰挑戰 ----------
function activeBattle() { return list('battles').find((b) => b.status === 'active' || b.status === 'claimed'); }
ACT.battle = () => {
  const b = activeBattle();
  const p = partner();
  const hist = list('battles').filter((x) => x.status === 'done' || x.status === 'draw').sort((a, b) => b.at - a.at);
  const wins = (u) => hist.filter((x) => x.winner === u).length;
  let body = '';
  if (b) {
    const left = b.deadline - now();
    const over = left < 0;
    body = `<div class="card center" style="background:linear-gradient(135deg,color-mix(in srgb,var(--accent) 18%,var(--card)),var(--card))">
      <div style="font-size:44px">⚔️</div><h3 style="justify-content:center">${esc(b.task)}</h3>
      <p class="small muted" style="margin:0">${esc(nick(b.by))} 發起 · ${over ? '時間到了！' : `剩 ${Math.ceil(left / 86400000)} 天`}</p>
      <p class="small" style="margin:6px 0 0">輸的人要發一張卡給贏的人</p></div>
      ${b.status === 'claimed'
        ? (b.claimer === me() ? `<p class="center muted">等 ${esc(nick(p))} 確認中…</p>` : `<p class="center"><b>${esc(nick(b.claimer))}</b> 說自己完成了！</p><div class="btn-row"><button class="btn ghost" data-act="battleReject" data-id="${b.id}">還沒啦</button><button class="btn" data-act="battleJudge" data-id="${b.id}">確認對方贏了</button></div>`)
        : over ? `<button class="btn ghost block" data-act="battleDraw" data-id="${b.id}">都沒完成，平手收場</button>`
        : `<button class="btn block" data-act="battleClaim" data-id="${b.id}">🏁 我完成了！</button>`}`;
  } else {
    body = `<p class="small muted" style="margin-top:0">選一個挑戰，7 天內誰先完成誰贏，輸的人要發一張卡給贏的人。</p>
      ${D.BATTLE_TASKS.map((t) => `<button class="quiz-opt" data-act="battleNew" data-t="${esc(t)}">${esc(t)}</button>`).join('')}
      <button class="quiz-opt" data-act="battleNew" data-t="">✏️ 自己出題…</button>`;
  }
  closeAll();
  openModal(`${mhead('⚔️ 對戰挑戰')}
    <div class="row" style="justify-content:center;gap:18px;margin-bottom:12px;font-weight:800"><span>${avatar(me())} ${esc(nick(me()))} ${wins(me())} 勝</span><span class="muted">VS</span><span>${wins(p)} 勝 ${esc(nick(p))} ${avatar(p)}</span></div>
    ${body}
    ${hist.length ? `<h3 style="font-size:15px;margin-top:14px">對戰紀錄</h3>${hist.slice(0, 10).map((x) => `<div class="list-row"><span class="grow">${esc(x.task)}</span><span class="small">${x.status === 'draw' ? '🤝 平手' : '🏆 ' + esc(nick(x.winner))}</span><span class="when">${fmtDate(x.at)}</span></div>`).join('')}` : ''}`);
};
ACT.battleNew = async (el) => {
  if (!partner()) return toast('對方加入後才能對戰');
  let t = el.dataset.t;
  if (!t) t = await promptBox('自己出題', { placeholder: '例如：先存到 5000 元' });
  if (!t) return;
  await col('battles').add({ task: t, by: me(), at: now(), deadline: now() + 7 * 86400000, status: 'active' });
  await notify(partner(), 'battle', `${nick(me())} 向你發起挑戰 ⚔️`, t);
  toast('挑戰開始！'); setTimeout(ACT.battle, 300);
};
ACT.battleClaim = async (el) => {
  if (!(await confirmBox('確定完成了嗎？要對方確認才算贏喔'))) return;
  await col('battles').update(el.dataset.id, { status: 'claimed', claimer: me(), claimedAt: now() });
  await notify(partner(), 'battle', `${nick(me())} 說自己完成挑戰了，快去確認 ⚔️`);
  setTimeout(ACT.battle, 300);
};
ACT.battleJudge = async (el) => {
  const b = list('battles').find((x) => x.id === el.dataset.id); if (!b) return;
  if (b.status !== 'claimed') return ACT.battle();
  if (!(await confirmBox(`確認 ${nick(b.claimer)} 贏了？你要發一張卡給對方`, '願賭服輸'))) return;
  await col('battles').update(b.id, { status: 'done', winner: b.claimer, loser: me(), paid: false, doneAt: now() });
  await addPoints(b.claimer, 10, '對戰勝利');
  await notify(b.claimer, 'battle', '你贏了挑戰！🏆 對方要發卡給你');
  closeAll(); ACT.giveCard({ dataset: { battle: b.id } });
};
ACT.battleReject = async (el) => {
  await col('battles').update(el.dataset.id, { status: 'active', claimer: null });
  await notify(list('battles').find((x) => x.id === el.dataset.id)?.claimer, 'battle', '對方說你還沒完成挑戰 😏');
  setTimeout(ACT.battle, 300);
};
ACT.battleDraw = async (el) => { await col('battles').update(el.dataset.id, { status: 'draw', doneAt: now() }); setTimeout(ACT.battle, 300); };
ACT.battlePay = (el) => { closeAll(); ACT.giveCard({ dataset: { battle: el.dataset.id } }); };

// ---------- 集點章 ----------
const stampCount = (uid) => list('points').filter((p) => p.uid === uid && p.tag === 'stamp').length;
function stampCardHTML() {
  const n = stampCount(me());
  const per = D.POINTS.stampsPerSheet;
  const filled = n % per;
  const recent = list('points').filter((p) => p.uid === me() && p.tag === 'stamp').sort((a, b) => b.at - a.at)[0];
  return `<div class="card">
    <h3>📮 集點章 <span class="sub">已集滿 ${Math.floor(n / per)} 張</span></h3>
    <div class="stamp-sheet">${Array.from({ length: per }, (_, i) => `<div class="stamp-slot ${i < filled ? 'on' : ''}">${i < filled ? '💮' : i + 1}</div>`).join('')}</div>
    <p class="small muted" style="margin:8px 0">集滿 ${per} 個章送一張扭蛋券 🎫${recent ? ` · 最近：${esc(recent.reason.replace('蓋章：', ''))}` : ''}</p>
    <button class="btn block" data-act="giveStamp">幫 ${esc(nick(partner()))} 蓋一個章</button>
  </div>`;
}
ACT.giveStamp = () => {
  const p = partner(); if (!p) return toast('對方加入後才能蓋章');
  const reasons = ['做家事 🧹', '好貼心 🥹', '哄我開心 🥰', '準時不遲到 ⏰', '煮飯給我吃 🍳', '今天好可愛 💕', '有乖乖 😇', '幫我很多忙 🙏'];
  const m = openModal(`${mhead(`幫 ${esc(nick(p))} 蓋章`)}
    <p class="small muted" style="margin-top:0">為什麼要蓋這個章？</p>
    ${reasons.map((r) => `<button class="quiz-opt" data-r="${esc(r)}">${esc(r)}</button>`).join('')}
    <button class="quiz-opt" data-r="">✏️ 自己寫…</button>`, { center: true });
  $$('[data-r]', m).forEach((b) => b.onclick = async () => {
    let r = b.dataset.r;
    if (!r) { closeModal(m); r = await promptBox('蓋章的原因', { placeholder: '例如：幫我按摩' }); if (!r) return; }
    else closeModal(m);
    const before = stampCount(p);
    await addPoints(p, D.POINTS.stamp, '蓋章：' + r, 'stamp');
    await notify(p, 'stamp', `${nick(me())} 幫你蓋了一個章 📮`, r);
    if ((before + 1) % D.POINTS.stampsPerSheet === 0) {
      await addTicket(p, 1);
      await notify(p, 'stamp', '集滿一張章卡！送你一張扭蛋券 🎫');
    }
    vibrate(50); toast('蓋好了 💮');
  });
};

// ---------- 每週任務 ----------
function weekTaskIdx() {
  const wk = weekKey();
  const base = shuffled(D.WEEKLY_TASKS.map((_, i) => i), hash(wk + (S.cid || ''))).slice(0, 3);
  const ov = (S.couple?.taskOverride || {})[wk] || {};
  return base.map((v, i) => (ov[i] != null ? ov[i] : v));
}
function weekTasks() { return weekTaskIdx().map((i) => D.WEEKLY_TASKS[i] || ''); }
function weeklyHTML() {
  const wk = weekKey(), p = partner();
  const done = (i, u) => list('taskDone').some((x) => x.id === `${wk}_${i}_${u}`);
  return `<div class="card"><h3>📋 每週任務 <span class="sub">完成一項 +${D.POINTS.weeklyTask} 點</span></h3>
    ${weekTasks().map((t, i) => {
      const req = S.couple.taskSwapReq;
      const pending = req && req.wk === wk && req.i === i;
      const anyDone = done(i, me()) || (p && done(i, p));
      return `<div class="task ${done(i, me()) ? 'done' : ''}">
      <button class="ck" data-act="taskDo" data-i="${i}" ${done(i, me()) ? 'disabled' : ''}>${done(i, me()) ? '✓' : ''}</button>
      <span class="tt">${esc(t)}${pending ? `<div class="small" style="color:var(--accent)">${req.by === me() ? '等對方同意換這項…' : esc(nick(req.by)) + ' 想換掉這項'}</div>` : ''}</span>
      <span class="small muted">${p && done(i, p) ? avatar(p) + '✓' : ''}</span>
      ${pending && req.by !== me() ? `<button class="btn sm ghost" data-act="taskSwapNo">不要</button><button class="btn sm" data-act="taskSwapOk">同意</button>`
        : pending ? `<button class="small muted" data-act="taskSwapNo">取消</button>`
        : !anyDone && p && !req ? `<button class="small muted" data-act="taskSwapReq" data-i="${i}">換</button>` : ''}</div>`;
    }).join('')}
    <p class="small muted" style="margin:6px 0 0">每週一換新任務，誠實打勾喔 😇</p></div>`;
}
ACT.taskSwapReq = async (el) => {
  const i = +el.dataset.i;
  if (!(await confirmBox(`想把「${weekTasks()[i]}」換掉嗎？\n要 ${nick(partner())} 同意才會換`, '送出申請'))) return;
  await S.store.updateCouple(S.cid, { taskSwapReq: { wk: weekKey(), i, by: me(), at: now() } });
  await notify(partner(), 'battle', `${nick(me())} 想換掉一項每週任務`, weekTasks()[i]);
  toast('申請送出了');
};
ACT.taskSwapOk = async () => {
  const req = S.couple.taskSwapReq; if (!req) return;
  const wk = weekKey();
  if (req.wk !== wk) { await S.store.updateCouple(S.cid, { taskSwapReq: null }); return; }
  const cur = new Set(weekTaskIdx());
  const used = new Set(Object.values((S.couple.taskOverride || {})[wk] || {}));
  const cand = D.WEEKLY_TASKS.map((_, i) => i).filter((i) => !cur.has(i) && !used.has(i));
  const ni = pick(cand.length ? cand : D.WEEKLY_TASKS.map((_, i) => i).filter((i) => !cur.has(i)));
  await S.store.updateCouple(S.cid, { [`taskOverride.${wk}.${req.i}`]: ni, taskSwapReq: null });
  await notify(req.by, 'battle', '對方同意了，每週任務換好了', D.WEEKLY_TASKS[ni]);
  toast('換好了：' + D.WEEKLY_TASKS[ni]);
};
ACT.taskSwapNo = async () => {
  const req = S.couple.taskSwapReq; if (!req) return;
  await S.store.updateCouple(S.cid, { taskSwapReq: null });
  if (req.by !== me()) await notify(req.by, 'battle', '對方想留著這項任務 😏');
};

ACT.taskDo = async (el) => {
  const i = +el.dataset.i, wk = weekKey();
  const t = weekTasks()[i];
  if (!(await confirmBox(`完成「${t}」了嗎？`, '完成！'))) return;
  await col('taskDone').set(`${wk}_${i}_${me()}`, { uid: me(), week: wk, i, task: t, at: now() });
  await addPoints(me(), D.POINTS.weeklyTask, '每週任務：' + t);
  confetti(30); toast(`+${D.POINTS.weeklyTask} 點`);
};
// ============================================================
//  🗺️ 旅行：旅行基金、足跡地圖
// ============================================================

PAGES.travel = {
  html() {
    const sub = S.sub.travel;
    return `<div class="page-title"><h2>🗺️ 旅行</h2><span>去過 ${list('trips').length} 個地方</span></div>
      <div class="seg">${[['fund', '💰 旅行基金'], ['map', '📍 足跡地圖']].map(([k, n]) => `<button class="${sub === k ? 'on' : ''}" data-act="sub" data-page="travel" data-sub="${k}">${n}</button>`).join('')}</div>
      ${sub === 'map' ? travelMap() : travelFund()}`;
  },
  after(main) { if (S.sub.travel === 'map') mountMap(main); },
};

// ---------- 旅行基金 ----------
const fundInfo = () => {
  const f = S.couple.fund || { name: '旅行基金', goal: 30000, round: 1 };
  const deps = list('deposits').filter((d) => (d.round || 1) === (f.round || 1));
  return { f, deps, total: sum(deps, (d) => d.amt) };
};
function travelFund() {
  const { f, deps, total } = fundInfo();
  const pct = Math.min(100, Math.round(total / (f.goal || 1) * 100));
  const ms = S.couple.members;
  const past = {};
  list('deposits').filter((d) => (d.round || 1) < (f.round || 1)).forEach((d) => (past[d.round || 1] ||= { total: 0, name: d.fundName || `第 ${d.round || 1} 期` }, past[d.round || 1].total += d.amt));
  return `<div class="card center">
      <span class="piggy" id="pig">🐷</span>
      <h3 style="justify-content:center">${esc(f.name)} <button class="small muted" data-act="fundEdit">✏️</button></h3>
      <div class="fund-num">$${money(total)} <span class="small muted">/ $${money(f.goal)}</span></div>
      <div class="fund-bar"><div style="width:${pct}%"></div></div>
      <div class="small muted">${pct >= 100 ? '🎉 存滿了！旅行限定券已經發到兩人的票夾' : `還差 $${money(Math.max(0, f.goal - total))} · 存滿會掉一張旅行限定卡 ✈️`}</div>
      <div class="row mt" style="justify-content:center;gap:20px">${ms.map((u) => `<div><div style="font-size:22px">${avatar(u)}</div><b>$${money(sum(deps.filter((d) => d.uid === u), (d) => d.amt))}</b><div class="small muted">${esc(nick(u))}</div></div>`).join('')}</div>
      <div class="btn-row">${f.rewarded ? '<button class="btn ghost" data-act="fundNew">開始新的基金</button>' : ''}<button class="btn" data-act="deposit">💰 存一筆</button></div>
    </div>
    <div class="card"><h3>存錢紀錄</h3>
      ${deps.length ? deps.sort((a, b) => b.at - a.at).slice(0, 30).map((d) => `<div class="list-row"><span class="lr-i">${avatar(d.uid)}</span><span class="grow">${esc(d.note || '存進基金')}<div class="small muted">${esc(nick(d.uid))}</div></span><b style="color:${d.amt >= 0 ? 'var(--accent)' : 'var(--muted)'}">${d.amt >= 0 ? '+' : ''}$${money(d.amt)}</b><span class="when">${fmtDate(d.at)}</span></div>`).join('')
        : '<div class="empty"><span class="big">🪙</span>存下第一筆，旅行就開始了</div>'}
    </div>
    ${Object.keys(past).length ? `<div class="card"><h3>以前的基金</h3>${Object.entries(past).map(([r, x]) => `<div class="list-row"><span class="grow">${esc(x.name)}</span><b>$${money(x.total)}</b></div>`).join('')}</div>` : ''}`;
}
ACT.deposit = () => {
  const m = openModal(`${mhead('💰 存一筆')}
    <label>金額</label><input id="dp-a" type="number" inputmode="numeric" placeholder="例如 500">
    <div class="row wrap mt">${[100, 500, 1000, 2000].map((v) => `<button class="chip" data-v="${v}">$${v}</button>`).join('')}</div>
    <label>備註（可以不寫）</label><input id="dp-n" maxlength="30" placeholder="例如：這個月的零用錢">
    <div class="toggle mt"><label class="switch"><input type="checkbox" id="dp-w"><span></span></label><span class="small">這是提領（從基金拿出來）</span></div>
    <button class="btn block mt" id="dp-ok">存進去</button>`, { center: true });
  $$('[data-v]', m).forEach((b) => b.onclick = () => { $('#dp-a', m).value = b.dataset.v; });
  $('#dp-ok', m).onclick = async () => {
    let a = Math.round(+$('#dp-a', m).value);
    if (!a || a <= 0) return toast('輸入金額');
    if ($('#dp-w', m).checked) a = -a;
    const { f } = fundInfo();
    await col('deposits').add({ uid: me(), amt: a, note: $('#dp-n', m).value.trim(), round: f.round || 1, fundName: f.name, at: now() });
    await notify(partner(), 'fund', a > 0 ? `${nick(me())} 存了 $${money(a)} 進旅行基金 🐷` : `${nick(me())} 從旅行基金領了 $${money(-a)}`);
    closeModal(m);
    const pig = $('#pig'); if (pig) { pig.classList.remove('bounce'); void pig.offsetWidth; pig.classList.add('bounce'); }
    if (a > 0) { vibrate(30); confetti(24, ['#ffc75f', '#ffd36b', '#fff1a8']); }
  };
};
ACT.fundEdit = async () => {
  const { f } = fundInfo();
  const m = openModal(`${mhead('編輯旅行基金')}
    <label>基金名稱</label><input id="fe-n" value="${esc(f.name)}" maxlength="20">
    <label>目標金額</label><input id="fe-g" type="number" value="${f.goal}">
    <button class="btn block mt" id="fe-ok">儲存</button>`, { center: true });
  $('#fe-ok', m).onclick = async () => {
    const g = Math.round(+$('#fe-g', m).value);
    if (!g || g <= 0) return toast('目標金額要大於 0');
    await S.store.updateCouple(S.cid, { 'fund.name': $('#fe-n', m).value.trim() || f.name, 'fund.goal': g });
    closeModal(m); setTimeout(checkFund, 300);
  };
};
ACT.fundNew = async () => {
  const name = await promptBox('新基金的名字', { placeholder: '例如：日本賞櫻基金', ok: '下一步' }); if (!name) return;
  const g = Math.round(+(await promptBox('目標金額', { placeholder: '例如 50000' })) || 0);
  if (!g) return;
  const { f } = fundInfo();
  await S.store.updateCouple(S.cid, { fund: { name, goal: g, round: (f.round || 1) + 1, rewarded: false } });
  toast('新的基金開始囉 🐷');
};
async function checkFund() {
  if (!S.couple || (S.couple.members || []).length < 2) return;
  const { f, total } = fundInfo();
  if (f.rewarded || total < f.goal) return;
  const ok = await S.store.coupleTx(S.cid, (c) => (c.fund && !c.fund.rewarded ? { 'fund.rewarded': true, fundsDone: (c.fundsDone || 0) + 1 } : null));
  if (!ok) return;
  for (const u of S.couple.members) {
    await col('cards').add(cardDoc({ ...D.TRAVEL_CARD, desc: `「${f.name}」存滿了，出發吧` }, u, 'sys'));
    await col('events').add({ to: u, by: 'sys', type: 'fund', text: '旅行基金存滿了！掉落一張旅行限定券 ✈️', at: now(), read: false });
  }
  confetti(140);
}

// ---------- 足跡地圖 ----------
function travelMap() {
  const ts = list('trips').sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  return `<div class="card" style="padding:8px"><div id="map-slot"></div></div>
    <button class="btn block" data-act="addTrip" style="margin-bottom:14px">📍 新增一個足跡</button>
    ${ts.length ? ts.map((t) => `<div class="trip-item" data-act="openTrip" data-id="${t.id}">
      <div class="cover" style="${t.cover ? `background-image:url(${t.cover})` : ''}">${t.cover ? '' : '📍'}</div>
      <div class="grow"><b>${esc(t.name)}</b><div class="small muted">${esc(t.date || '')}</div><div class="small" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(t.note || '')}</div></div></div>`).join('')
      : '<div class="empty"><span class="big">🧳</span>還沒有足跡，記下你們一起去過的地方吧</div>'}`;
}
function mountMap(main) {
  const slot = $('#map-slot', main); if (!slot) return;
  if (!window.L) { slot.outerHTML = '<div class="empty">地圖載入中…（如果一直沒出現，可能是網路問題）</div>'; setTimeout(() => window.L && render(), 1500); return; }
  const fresh = !S.map;
  if (fresh) {
    S.mapEl = document.createElement('div'); S.mapEl.id = 'map';
    slot.replaceWith(S.mapEl);
    S.map = L.map(S.mapEl, { zoomControl: false, attributionControl: true }).setView([23.7, 121], 7);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '© OpenStreetMap' }).addTo(S.map);
    S.mapLayer = L.layerGroup().addTo(S.map);
  } else slot.replaceWith(S.mapEl);
  setTimeout(() => S.map && S.map.invalidateSize(), 60);
  S.mapLayer.clearLayers();
  const pts = [];
  for (const t of list('trips')) {
    if (t.lat == null) continue;
    const icon = L.divIcon({ html: '<div style="font-size:28px;line-height:1;transform:translate(-4px,-22px)">📍</div>', className: '', iconSize: [20, 20] });
    L.marker([t.lat, t.lng], { icon }).addTo(S.mapLayer)
      .bindPopup(`${t.cover ? `<img src="${t.cover}">` : ''}<b>${esc(t.name)}</b><br><small>${esc(t.date || '')}</small>`);
    pts.push([t.lat, t.lng]);
  }
  if (fresh && pts.length) S.map.fitBounds(pts, { padding: [30, 30], maxZoom: 11 });
}

function compressImage(file, max = 480) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => {
      const s = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      let q = 0.75, url = c.toDataURL('image/jpeg', q);
      while (url.length > 250000 && q > 0.3) { q -= 0.1; url = c.toDataURL('image/jpeg', q); }
      URL.revokeObjectURL(img.src);
      res(url);
    };
    img.onerror = rej;
    img.src = URL.createObjectURL(file);
  });
}

ACT.addTrip = () => {
  const t = { name: '', date: dkey(), note: '', cover: '', lat: null, lng: null };
  const m = openModal(`${mhead('📍 新增足跡')}
    <label>地點名稱</label>
    <div class="row"><input id="tr-n" maxlength="30" placeholder="例如：京都・嵐山" class="grow"><button class="btn sm ghost" id="tr-s">🔍 找</button></div>
    <label>在地圖上點一下標出位置（可以不標）</label>
    <div class="mini-map" id="tr-map"></div>
    <label>日期</label><input id="tr-d" type="date" value="${t.date}">
    <label>封面照片（一張，會自動壓縮）</label>
    <label class="photo-pick" id="tr-pp" style="margin:0">點這裡選照片<input type="file" accept="image/*" id="tr-f" class="hidden"></label>
    <label>心得</label><textarea id="tr-t" maxlength="300" placeholder="這趟最難忘的是…"></textarea>
    <button class="btn block mt" id="tr-ok">記下來 +${D.POINTS.trip} 點</button>`);
  let mk = null, mm = null;
  const setPt = (lat, lng) => {
    t.lat = lat; t.lng = lng;
    if (!mm) return;
    if (mk) mk.setLatLng([lat, lng]); else mk = L.marker([lat, lng], { icon: L.divIcon({ html: '<div style="font-size:28px;transform:translate(-4px,-22px)">📍</div>', className: '', iconSize: [20, 20] }) }).addTo(mm);
  };
  setTimeout(() => {
    if (!window.L) { $('#tr-map', m).outerHTML = '<p class="small muted">地圖載入失敗，先不標位置也可以</p>'; return; }
    mm = L.map($('#tr-map', m), { zoomControl: false }).setView([23.7, 121], 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '© OSM' }).addTo(mm);
    mm.on('click', (e) => setPt(e.latlng.lat, e.latlng.lng));
  }, 350);
  $('#tr-s', m).onclick = async () => {
    const q = $('#tr-n', m).value.trim(); if (!q) return toast('先輸入地點名稱');
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&accept-language=zh-TW&q=${encodeURIComponent(q)}`);
      const j = await r.json();
      if (!j.length) return toast('找不到，直接在地圖上點吧');
      const lat = +j[0].lat, lng = +j[0].lon;
      setPt(lat, lng); mm && mm.setView([lat, lng], 11);
    } catch (e) { toast('搜尋失敗，直接在地圖上點吧'); }
  };
  $('#tr-f', m).onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try { t.cover = await compressImage(f); $('#tr-pp', m).style.backgroundImage = `url(${t.cover})`; $('#tr-pp', m).firstChild.textContent = ''; }
    catch (err) { toast('照片讀取失敗'); }
  };
  $('#tr-ok', m).onclick = async () => {
    t.name = $('#tr-n', m).value.trim(); t.date = $('#tr-d', m).value; t.note = $('#tr-t', m).value.trim();
    if (!t.name) return toast('地點要有名字');
    $('#tr-ok', m).disabled = true;
    await col('trips').add({ ...t, by: me(), at: now() });
    for (const u of S.couple.members) await addPoints(u, D.POINTS.trip, '旅行足跡：' + t.name);
    await notify(partner(), 'trip', `${nick(me())} 新增了一個旅行足跡 🗺️`, t.name);
    confetti(50); closeModal(m); toast('記下來了 📍');
  };
};
ACT.openTrip = (el) => {
  const t = list('trips').find((x) => x.id === el.dataset.id); if (!t) return;
  const m = openModal(`${mhead('📍 ' + esc(t.name))}
    ${t.cover ? `<img src="${t.cover}" style="width:100%;border-radius:16px;display:block">` : ''}
    <p class="small muted">${esc(t.date || '')} · ${esc(nick(t.by))} 記錄</p>
    ${t.note ? `<div class="letter">${esc(t.note)}</div>` : ''}
    <div class="btn-row">${t.lat != null && S.map ? '<button class="btn ghost" id="tp-go">在地圖上看</button>' : ''}${t.by === me() ? '<button class="btn ghost" id="tp-del">刪除</button>' : ''}</div>`);
  $('#tp-go', m) && ($('#tp-go', m).onclick = () => { closeModal(m); S.map.setView([t.lat, t.lng], 12); window.scrollTo({ top: 0, behavior: 'smooth' }); });
  $('#tp-del', m) && ($('#tp-del', m).onclick = async () => { if (await confirmBox('刪除這個足跡？')) { await col('trips').remove(t.id); closeModal(m); } });
};
// ============================================================
//  📖 回憶：年度清單、時間軸、時光膠囊、成就徽章、年度回顧
// ============================================================

PAGES.memory = {
  html() {
    const sub = S.sub.memory;
    const tabs = [['goals', '🎯 年度清單'], ['timeline', '🕰️ 時間軸'], ['capsule', '⏳ 時光膠囊'], ['ach', '🏆 成就']];
    return `<div class="page-title"><h2>📖 回憶</h2><span>第 ${money(daysTogether())} 天</span></div>
      <button class="card" data-act="review" style="width:100%;text-align:left;display:flex;align-items:center;gap:12px;background:linear-gradient(135deg,#ff6f91,#845ec2);color:#fff">
        <span style="font-size:36px">🎞️</span><span class="grow"><b style="font-family:var(--serif);font-size:17px">${new Date().getFullYear()} 年度回顧</b><br><span class="small" style="opacity:.9">看看我們這一年一起做了什麼</span></span><span style="font-size:22px">›</span></button>
      <div class="seg">${tabs.map(([k, n]) => `<button class="${sub === k ? 'on' : ''}" data-act="sub" data-page="memory" data-sub="${k}">${n}</button>`).join('')}</div>
      ${({ goals: memGoals, timeline: memTimeline, capsule: memCapsule, ach: memAch }[sub] || memGoals)()}`;
  },
};

// ---------- 年度清單 ----------
function memGoals() {
  const y = S.goalYear || new Date().getFullYear();
  const gs = list('goals').filter((g) => g.year === y).sort((a, b) => (a.done ? 1 : 0) - (b.done ? 1 : 0) || a.at - b.at);
  const done = gs.filter((g) => g.done).length;
  const years = [...new Set([new Date().getFullYear(), new Date().getFullYear() + 1, ...list('goals').map((g) => g.year)])].sort();
  return `<div class="card">
    <h3>🎯 ${y} 年想一起做的事 <span class="sub">${done} / ${gs.length}</span></h3>
    <div class="fund-bar" style="height:10px;margin-top:0"><div style="width:${gs.length ? done / gs.length * 100 : 0}%"></div></div>
    <div class="row mt"><input id="goal-in" class="grow" maxlength="40" placeholder="例如：一起去看極光"><button class="btn sm" data-act="goalAdd">新增</button></div>
    <div class="mt">${gs.map((g) => `<div class="goal ${g.done ? 'done' : ''}"><button class="ck" data-act="goalToggle" data-id="${g.id}">${g.done ? '✓' : ''}</button>
      <span class="tt">${esc(g.title)}${g.done ? `<div class="small muted">${fmtFull(g.doneAt)} 完成</div>` : ''}</span>
      ${g.by === me() && !g.done ? `<button class="small muted" data-act="goalDel" data-id="${g.id}">✕</button>` : ''}</div>`).join('') || '<div class="empty">寫下今年想一起完成的事吧<br><span class="small">完成一項兩人各 +' + D.POINTS.goal + ' 點</span></div>'}</div>
    <div class="seg mt">${years.map((x) => `<button class="${x === y ? 'on' : ''}" data-act="goalYear" data-y="${x}">${x}</button>`).join('')}</div>
  </div>`;
}
ACT.goalYear = (el) => { S.goalYear = +el.dataset.y; render(); };
ACT.goalAdd = async () => {
  const i = $('#goal-in'); const v = i.value.trim(); if (!v) return toast('寫下一個目標');
  i.value = ''; i.blur();
  await col('goals').add({ year: S.goalYear || new Date().getFullYear(), title: v, done: false, by: me(), at: now() });
  await notify(partner(), 'goal', `${nick(me())} 在年度清單加了一個目標 🎯`, v);
};
ACT.goalToggle = async (el) => {
  const g = list('goals').find((x) => x.id === el.dataset.id); if (!g) return;
  if (g.done) { if (await confirmBox('要取消「完成」嗎？')) await col('goals').update(g.id, { done: false, doneAt: 0 }); return; }
  if (!(await confirmBox(`完成「${g.title}」了嗎？🎉`, '完成！'))) return;
  await col('goals').update(g.id, { done: true, doneAt: now(), doneBy: me() });
  if (!g.rewarded) {
    for (const u of S.couple.members) await addPoints(u, D.POINTS.goal, '年度目標：' + g.title);
    await col('goals').update(g.id, { rewarded: true });
  }
  await notify(partner(), 'goal', `年度目標完成：${g.title} 🎉`);
  confetti(90);
};
ACT.goalDel = async (el) => { if (await confirmBox('刪掉這個目標？')) await col('goals').remove(el.dataset.id); };

// ---------- 時間軸 ----------
function timelineItems() {
  const it = [];
  const ann = S.couple.dates?.anniversary || D.DEFAULT_DATES.anniversary;
  it.push({ at: parseD(ann).getTime(), icon: '💞', text: '我們在一起了' });
  for (const t of list('trips')) it.push({ at: t.date ? parseD(t.date).getTime() : t.at, icon: '🗺️', text: `一起去了 ${t.name}`, sub: t.note });
  for (const c of list('cards')) for (const l of c.log || []) {
    if (l.how === 'craft') continue;
    it.push({ at: l.at, icon: l.how === 'birthday' ? '🎂' : '✂️', text: `${nick(c.owner)} 用了「${c.mystery ? '神秘盲盒：' + c.secret : c.title}」` });
  }
  for (const g of list('goals')) if (g.done) it.push({ at: g.doneAt, icon: '🎯', text: `完成目標「${g.title}」` });
  for (const b of list('battles')) if (b.status === 'done') it.push({ at: b.doneAt || b.at, icon: '⚔️', text: `${nick(b.winner)} 贏了挑戰「${b.task}」` });
  for (const g of list('gacha')) if (g.rarity === 'SSR') it.push({ at: g.at, icon: '🌟', text: `${nick(g.uid)} ${g.how === 'craft' ? '合成' : '扭'}到 SSR「${g.title}」` });
  for (const w of list('wishes')) if (w.status === 'ok') it.push({ at: w.doneAt || w.at, icon: '🌠', text: `${nick(w.by)} 的願望「${w.title}」實現了` });
  for (const c of list('capsules')) if (c.firstOpenAt) it.push({ at: c.firstOpenAt, icon: '⏳', text: `打開了時光膠囊「${c.title}」` });
  for (const n of list('notes')) if (n.found) it.push({ at: n.foundAt, icon: '💌', text: `${nick(n.to)} 找到了一張小紙條` });
  for (const mm of list('memories')) it.push({ at: mm.date ? parseD(mm.date).getTime() : mm.at, icon: (MEM_KINDS.find((k) => k.id === mm.kind) || MEM_KINDS[MEM_KINDS.length - 1]).icon, text: mm.title, sub: mm.note, cover: mm.cover, mid: mm.id });
  return it.filter((x) => x.at).sort((a, b) => b.at - a.at);
}
const MEM_KINDS = [
  { id: 'anniv', icon: '💞', label: '紀念日' }, { id: 'first', icon: '✨', label: '第一次' }, { id: 'date', icon: '🍽️', label: '約會' },
  { id: 'trip', icon: '✈️', label: '旅行' }, { id: 'life', icon: '🏠', label: '生活' }, { id: 'gift', icon: '🎁', label: '驚喜' },
  { id: 'music', icon: '🎻', label: '音樂' }, { id: 'other', icon: '📸', label: '其他' },
];
const MEM_SUGGEST = [
  ['第一次見面', 'first'], ['第一次約會', 'first'], ['告白', 'anniv'], ['第一次牽手', 'first'], ['第一次出國', 'trip'],
  ['搬到一起住', 'life'], ['見家長', 'life'], ['第一次的小提琴演奏', 'music'], ['第一次吵架又和好', 'life'], ['最難忘的驚喜', 'gift'],
];
function memTimeline() {
  const it = timelineItems().slice(0, 400);
  let lastM = '', out = '';
  for (const x of it) {
    const d = new Date(x.at), mk = `${d.getFullYear()} 年 ${d.getMonth() + 1} 月`;
    if (mk !== lastM) { out += `<div class="tl-month">${mk}</div>`; lastM = mk; }
    out += `<div class="tl-item ${x.mid ? 'tl-mine' : ''}" ${x.mid ? `data-act="editMemory" data-id="${x.mid}"` : ''}>
      ${x.cover ? `<div class="tl-cover" style="background-image:url(${x.cover})"></div>` : ''}
      <div class="d">${d.getMonth() + 1}/${d.getDate()}${x.mid ? ' · 點一下可以編輯' : ''}</div>${x.icon} ${esc(x.text)}${x.sub ? `<div class="small muted" style="white-space:pre-wrap">${esc(x.sub)}</div>` : ''}</div>`;
  }
  return `<button class="btn block" data-act="editMemory" style="margin-bottom:10px">＋ 新增一段回憶</button>
    <p class="small muted center" style="margin:0 0 6px">旅行、兌換、目標這些會自動記錄；以前的重要時刻可以自己補上</p>
    <div class="timeline">${out}</div>`;
}
ACT.editMemory = (el) => {
  const mm = el?.dataset?.id ? list('memories').find((x) => x.id === el.dataset.id) : null;
  const t = mm ? { ...mm } : { title: '', date: dkey(), kind: 'other', note: '', cover: '' };
  const m = openModal(`${mhead(mm ? '編輯回憶' : '新增一段回憶')}
    ${mm ? '' : `<div class="row wrap" style="gap:6px">${MEM_SUGGEST.map(([n, k]) => `<button class="chip" data-sg="${esc(n)}" data-k="${k}">${esc(n)}</button>`).join('')}</div>`}
    <label>標題</label><input id="mm-t" maxlength="30" value="${esc(t.title)}" placeholder="例如：第一次約會">
    <label>日期</label><input id="mm-d" type="date" value="${esc(t.date || dkey())}">
    <label>類型</label>
    <div class="seg" id="mm-k" style="flex-wrap:wrap">${MEM_KINDS.map((k) => `<button data-k="${k.id}" class="${t.kind === k.id ? 'on' : ''}">${k.icon} ${k.label}</button>`).join('')}</div>
    <label>想記下來的話（可以不寫）</label><textarea id="mm-n" maxlength="500" placeholder="那天發生了什麼…">${esc(t.note || '')}</textarea>
    <label>照片（一張，會自動壓縮）</label>
    <label class="photo-pick" id="mm-pp" style="margin:0;${t.cover ? `background-image:url(${t.cover})` : ''}">${t.cover ? '' : '點這裡選照片'}<input type="file" accept="image/*" id="mm-f" class="hidden"></label>
    ${t.cover ? '<button class="link small" id="mm-rm" style="margin-top:6px">移除照片</button>' : ''}
    <button class="btn block mt" id="mm-ok">${mm ? '儲存' : '記下來'}</button>
    ${mm ? '<button class="btn ghost block mt" id="mm-del" style="color:#d4405f">刪除這段回憶</button>' : ''}`);
  const setKind = (k) => { t.kind = k; $$('#mm-k button', m).forEach((b) => b.classList.toggle('on', b.dataset.k === k)); };
  $$('#mm-k button', m).forEach((b) => b.onclick = () => setKind(b.dataset.k));
  $$('[data-sg]', m).forEach((b) => b.onclick = () => { $('#mm-t', m).value = b.dataset.sg; setKind(b.dataset.k); });
  $('#mm-f', m).onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try { t.cover = await compressImage(f); const pp = $('#mm-pp', m); pp.style.backgroundImage = `url(${t.cover})`; pp.firstChild.textContent = ''; }
    catch (err) { toast('照片讀取失敗'); }
  };
  $('#mm-rm', m) && ($('#mm-rm', m).onclick = () => { t.cover = ''; const pp = $('#mm-pp', m); pp.style.backgroundImage = ''; pp.firstChild.textContent = '點這裡選照片'; $('#mm-rm', m).remove(); });
  $('#mm-ok', m).onclick = async () => {
    const title = $('#mm-t', m).value.trim(); if (!title) return toast('寫一個標題');
    const data = { title, date: $('#mm-d', m).value || dkey(), kind: t.kind || 'other', note: $('#mm-n', m).value.trim(), cover: t.cover || '' };
    $('#mm-ok', m).disabled = true;
    if (mm) await col('memories').update(mm.id, data);
    else { await col('memories').add({ ...data, by: me(), at: now() }); await notify(partner(), 'trip', `${nick(me())} 在時間軸寫下一段回憶 🕰️`, title); }
    closeModal(m); toast(mm ? '改好了' : '記下來了 🕰️');
  };
  $('#mm-del', m) && ($('#mm-del', m).onclick = async () => { if (await confirmBox('刪掉這段回憶？')) { await col('memories').remove(mm.id); closeModal(m); } });
};

// ---------- 時光膠囊 ----------
function memCapsule() {
  const cs = list('capsules').sort((a, b) => a.openAt - b.openAt);
  return `<div class="card center"><div style="font-size:44px">⏳</div><h3 style="justify-content:center">時光膠囊</h3>
      <p class="small muted" style="margin:0 0 10px">現在寫一封信，指定日期才打得開。寫的人自己也要等到那天才看得到喔。</p>
      <button class="btn" data-act="capsuleNew">寫一封時光膠囊</button></div>
    ${cs.map((c) => {
      const open = c.openAt <= now();
      const days = Math.ceil((c.openAt - now()) / 86400000);
      const opened = (c.opened || {})[me()];
      return `<div class="capsule ${open ? '' : 'locked'}" ${open ? `data-act="capsuleOpen" data-id="${c.id}"` : ''}>
        <span class="ci">${open ? (opened ? '📖' : '💌') : '🔒'}</span>
        <div class="grow"><b style="font-family:var(--serif)">${esc(c.title)}</b>
          <div class="small muted">${esc(nick(c.by))} 寫給${c.to === 'both' ? '我們' : esc(nick(c.to))} · ${fmtFull(c.at)} 封存</div>
          <div class="small" style="color:var(--accent);font-weight:700">${open ? (opened ? '已打開' : '可以打開了！') : `${fmtFull(c.openAt)} 開啟 · 還有 ${days} 天`}</div></div></div>`;
    }).join('') || '<div class="empty">還沒有時光膠囊</div>'}`;
}
ACT.capsuleNew = () => {
  const d = new Date(); d.setFullYear(d.getFullYear() + 1);
  const m = openModal(`${mhead('⏳ 寫一封時光膠囊')}
    <label>標題</label><input id="cp-t" maxlength="24" placeholder="例如：給一年後的我們">
    <label>寫給</label><select id="cp-to"><option value="both">我們兩個</option><option value="partner">${esc(nick(partner()))}</option></select>
    <label>什麼時候才能打開</label><input id="cp-d" type="date" value="${dkey(d)}" min="${dkey(new Date(now() + 86400000))}">
    <div class="row wrap mt">${[['1 個月', 1], ['半年', 6], ['1 年', 12], ['下個週年', 0]].map(([n, v]) => `<button class="chip" data-m="${v}">${n}</button>`).join('')}</div>
    <label>內容</label><textarea id="cp-b" style="min-height:160px" placeholder="想對未來說的話…"></textarea>
    <button class="btn block mt" id="cp-ok">封存 🔒</button>`);
  $$('[data-m]', m).forEach((b) => b.onclick = () => {
    const v = +b.dataset.m; let x = new Date();
    if (v) x.setMonth(x.getMonth() + v); else x = nextOf((S.couple.dates?.anniversary || D.DEFAULT_DATES.anniversary).slice(5)).date;
    if (x <= new Date()) x.setFullYear(x.getFullYear() + 1);
    $('#cp-d', m).value = dkey(x);
  });
  $('#cp-ok', m).onclick = async () => {
    const title = $('#cp-t', m).value.trim(), body = $('#cp-b', m).value.trim(), date = $('#cp-d', m).value;
    if (!title || !body || !date) return toast('標題、內容、日期都要填');
    const openAt = parseD(date).getTime();
    if (openAt <= now()) return toast('開啟日期要在未來');
    const to = $('#cp-to', m).value === 'both' ? 'both' : partner();
    await col('capsules').add({ by: me(), to, title, body, openAt, opened: {}, at: now() });
    await notify(partner(), 'capsule', `${nick(me())} 封存了一封時光膠囊 ⏳`, `${fmtFull(openAt)} 才能打開`);
    closeModal(m); toast('封存好了，到時候見 ⏳');
  };
};
ACT.capsuleOpen = async (el) => {
  const c = list('capsules').find((x) => x.id === el.dataset.id); if (!c || c.openAt > now()) return;
  if (c.to !== 'both' && c.to !== me() && c.by !== me()) return;
  const m = openModal(`<div class="center" id="cpo"><div class="envelope">💌</div><p class="muted">點一下打開</p></div>`, { center: true });
  $('#cpo', m).onclick = async () => {
    confetti(60);
    m.querySelector('.modal').innerHTML = `${mhead(esc(c.title))}<div class="letter" style="animation:pop .5s">${esc(c.body)}</div>
      <p class="small muted center">—— ${esc(nick(c.by))}，寫於 ${fmtFull(c.at)}</p>`;
    const patch = { [`opened.${me()}`]: true };
    if (!c.firstOpenAt) patch.firstOpenAt = now();
    await col('capsules').update(c.id, patch);
    if (c.by !== me() && !(c.opened || {})[me()]) await notify(c.by, 'capsule', '你的時光膠囊被打開了 ⏳');
  };
};

// ---------- 成就 ----------
function achMetrics() {
  const ms = S.couple.members || [];
  const cards = list('cards');
  const g = list('gacha');
  const bday = cards.filter((c) => c.series === D.BIRTHDAY_SERIES);
  return {
    redeem: cards.reduce((n, c) => n + (c.log || []).filter((l) => l.how === 'redeem').length, 0),
    given: cards.filter((c) => ms.includes(c.from) && c.from !== c.owner && !c.series).length,
    gacha: g.filter((x) => x.how === 'gacha').length,
    ssr: g.filter((x) => x.rarity === 'SSR').length,
    craft: g.filter((x) => x.how === 'craft').length,
    wish: list('wishes').filter((w) => w.status === 'ok').length,
    sheets: Math.max(0, ...ms.map((u) => Math.floor(stampCount(u) / D.POINTS.stampsPerSheet))),
    weekly: list('taskDone').length,
    battles: list('battles').filter((b) => b.status === 'done').length,
    quiz: list('quiz').filter((x) => x.match).length,
    daily: ms.length === 2 ? list('daily').filter((d) => d.answers && ms.every((u) => d.answers[u])).length : 0,
    miss: list('misses').length,
    missStreak: Math.max(0, ...ms.map((u) => missStreak(u))),
    notesFound: list('notes').filter((n) => n.found).length,
    notesWritten: list('notes').length,
    capOpened: list('capsules').filter((c) => c.firstOpenAt).length,
    capWritten: list('capsules').length,
    trips: list('trips').length,
    funds: S.couple.fundsDone || 0,
    goals: list('goals').filter((x) => x.done).length,
    memories: list('memories').length,
    days: daysTogether(),
    holidays: new Set(cards.filter((c) => c.series === '節日系列').map((c) => festKey(c)).filter((k) => k && k !== 'travel')).size,
    birthdayBook: bday.length && bday.every(seriesCollected) ? 1 : 0,
  };
}
function computeAch() {
  const m = achMetrics();
  return new Set(D.ACHIEVEMENTS.filter((a) => (m[a.m] || 0) >= a.goal).map((a) => a.id));
}
let achTimer = null;
function scheduleAchievements() {
  clearTimeout(achTimer);
  achTimer = setTimeout(() => {
    if (!S.couple || COLS.some((c) => !S.d[c])) return;
    const got = computeAch();
    const key = 'park-ach-' + S.cid + '-' + me();
    const raw = localStorage.getItem(key);
    if (raw == null) { localStorage.setItem(key, JSON.stringify([...got])); return; }
    const seen = new Set(JSON.parse(raw));
    const fresh = [...got].filter((x) => !seen.has(x));
    if (!fresh.length) return;
    fresh.forEach((id, i) => setTimeout(() => { const a = D.ACHIEVEMENTS.find((x) => x.id === id); if (a) { toast(`🏆 解鎖成就：${a.name}（${{ b: '銅', s: '銀', g: '金' }[a.tier]}）`); confetti(60, ['#f6d365', '#ffc75f', '#fff']); } }, i * 1200));
    localStorage.setItem(key, JSON.stringify([...got]));
  }, 1500);
}
// 成就徽章：銅／銀／金，用和卡片一樣的徽章外框
function achBadge(a, unlocked) {
  const shape = { b: 0, s: 1, g: 2 }[a.tier];
  const id = 'ab' + (++embSeq);
  return `<svg viewBox="0 0 130 130" class="ach-badge" xmlns="http://www.w3.org/2000/svg">
    <defs>${embPattern(['dots', 'lattice', 'seigaiha'][shape], id, 0.6)}<clipPath id="${id}c"><circle cx="65" cy="65" r="64"/></clipPath></defs>
    <circle cx="65" cy="65" r="64" class="e-bg"/>
    <rect width="130" height="130" fill="url(#${id})" opacity=".45" clip-path="url(#${id}c)"/>
    ${embMedallion(65, 65, { shape, ch: a.mark }, 44)}
    ${a.tier === 'g' && unlocked ? '<path d="M65 2 L67.5 8 L74 9 L69 13 L70.5 19.5 L65 16 L59.5 19.5 L61 13 L56 9 L62.5 8 Z" class="e-ink-f"/>' : ''}
  </svg>`;
}
function memAch() {
  const m = achMetrics();
  const got = computeAch();
  const tiers = { b: '銅', s: '銀', g: '金' };
  const cnt = (t) => D.ACHIEVEMENTS.filter((a) => a.tier === t && got.has(a.id)).length;
  const tot = (t) => D.ACHIEVEMENTS.filter((a) => a.tier === t).length;
  const sorted = [...D.ACHIEVEMENTS].sort((a, b) => (got.has(b.id) ? 1 : 0) - (got.has(a.id) ? 1 : 0));
  return `<div class="card center"><div class="fund-num">${got.size} / ${D.ACHIEVEMENTS.length}</div><div class="small muted">我們一起解鎖的成就</div>
      <div class="row" style="justify-content:center;gap:16px;margin-top:8px">${['g', 's', 'b'].map((t) => `<span class="ach-tier t-${t}">${tiers[t]} ${cnt(t)}/${tot(t)}</span>`).join('')}</div></div>
    <div class="ach-grid">${sorted.map((a) => {
      const ok = got.has(a.id), v = Math.min(m[a.m] || 0, a.goal);
      return `<div class="ach ach-${a.tier} ${ok ? '' : 'locked'}">${achBadge(a, ok)}<b>${esc(a.name)}</b><span>${esc(a.desc)}</span>
        ${ok ? `<span class="ach-tier t-${a.tier}">${tiers[a.tier]}</span>` : a.goal > 1 ? `<div class="ach-prog"><div style="width:${v / a.goal * 100}%"></div></div><span>${money(v)} / ${money(a.goal)}</span>` : ''}</div>`;
    }).join('')}</div>`;
}

// ---------- 年度回顧 ----------
ACT.review = () => {
  const Y = new Date().getFullYear();
  const inY = (ts) => ts && new Date(ts).getFullYear() === Y;
  const ms = S.couple.members, p = partner();
  const redeems = list('cards').flatMap((c) => (c.log || []).filter((l) => l.how === 'redeem' && inY(l.at)).map(() => c));
  const cnt = {}; redeems.forEach((c) => cnt[c.title] = (cnt[c.title] || 0) + 1);
  const top = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0];
  const gacha = list('gacha').filter((g) => inY(g.at));
  const trips = list('trips').filter((t) => (t.date || '').startsWith(String(Y)));
  const goals = list('goals').filter((g) => g.year === Y);
  const misses = list('misses').filter((x) => inY(x.at));
  const quiz = list('quiz').filter((q) => q.id.startsWith(String(Y)) && q.match !== undefined);
  const qrate = quiz.length ? Math.round(quiz.filter((q) => q.match).length / quiz.length * 100) : 0;
  const daily = list('daily').filter((d) => d.id.startsWith(String(Y)) && d.answers && ms.every((u) => d.answers[u]));
  const stamps = list('points').filter((x) => x.tag === 'stamp' && inY(x.at));
  const yEnd = Math.min(now(), new Date(Y, 11, 31).getTime());
  const annT = parseD(S.couple.dates?.anniversary || D.DEFAULT_DATES.anniversary).getTime();
  const daysAtEnd = Math.floor((yEnd - annT) / 86400000) + 1;
  const slides = [
    { bg: 'linear-gradient(160deg,#ff6f91,#845ec2)', i: '🎡', n: Y, t: '這一年的我們', s: `${nick(me())} & ${nick(p)}<br>往右點，一起回顧 →` },
    { bg: 'linear-gradient(160deg,#ff9671,#ff6f91)', i: '🎟️', n: redeems.length, t: '張票券被兌換', s: top ? `最常用的是「${esc(top[0])}」<br>一共用了 ${top[1]} 次` : '明年多用一點吧 😉' },
    { bg: 'linear-gradient(160deg,#845ec2,#2c73d2)', i: '🎰', n: gacha.length, t: '次扭蛋和合成', s: `扭出 ${gacha.filter((g) => g.rarity === 'SSR').length} 張 SSR、${gacha.filter((g) => g.rarity === 'SR').length} 張 SR` },
    { bg: 'linear-gradient(160deg,#00c9a7,#2c73d2)', i: '🗺️', n: trips.length, t: '個一起去過的地方', s: trips.length ? trips.slice(0, 8).map((t) => esc(t.name)).join('・') : '明年一起去更多地方吧 ✈️' },
    { bg: 'linear-gradient(160deg,#ffc75f,#ff9671)', i: '🎯', n: `${goals.filter((g) => g.done).length}/${goals.length}`, t: '個年度目標完成', s: goals.filter((g) => g.done).slice(0, 6).map((g) => '✓ ' + esc(g.title)).join('<br>') || '寫下明年的目標吧' },
    { bg: 'linear-gradient(160deg,#ff6f91,#ffc2d1)', i: '💗', n: money(misses.length), t: '次「想你」', s: ms.map((u) => `${esc(nick(u))} 想了 ${misses.filter((x) => x.by === u).length} 次`).join('<br>') },
    { bg: 'linear-gradient(160deg,#4b4453,#845ec2)', i: '🧠', n: qrate + '%', t: '默契度', s: `一起答了 ${quiz.length} 題默契問答<br>${daily.length} 題每日一問<br>互相蓋了 ${stamps.length} 個章` },
    { bg: 'linear-gradient(160deg,#c42e52,#3a0f1d)', i: '🏠', n: `第 ${money(daysAtEnd)} 天`, t: D.BIRTHDAY_SLOGAN, s: `${Y + 1} 年也請多多指教 💞` },
  ];
  let k = 0;
  const el = document.createElement('div');
  el.className = 'story';
  const draw = () => {
    const s = slides[k];
    el.style.background = s.bg;
    el.innerHTML = `<div class="bars">${slides.map((_, i) => `<div class="${i <= k ? 'on' : ''}"></div>`).join('')}</div>
      <button class="story-close">✕</button>
      <div class="slide"><div class="si">${s.i}</div><div class="sn">${s.n}</div><div class="st">${esc(s.t)}</div><div class="ss">${s.s}</div></div>
      <div class="tapzones"><div data-d="-1"></div><div data-d="1"></div></div>`;
    $('.story-close', el).onclick = () => el.remove();
    $$('[data-d]', el).forEach((z) => z.onclick = () => {
      k += +z.dataset.d;
      if (k >= slides.length) { el.remove(); return; }
      k = Math.max(0, k); draw();
      if (k === slides.length - 1) confetti(100);
    });
  };
  draw();
  document.body.appendChild(el);
};
// ============================================================
//  備份與還原
//  1. 雲端自動快照：每 7 天一次，保留最近 4 份（存在 Firebase 的 backups／backupParts）
//  2. 下載備份檔：存成 JSON 到手機（每月提醒一次）
//  3. 還原：從快照或檔案，把資料換回備份時的樣子
// ============================================================

const BACKUP_EVERY = 7 * 86400000;
const BACKUP_KEEP = 4;
const BACKUP_CHUNK = 600000; // 每段最多約 600KB，避開 Firestore 單筆 1MB 上限
const COUPLE_SKIP = ['members', 'creator', 'code', 'lastBackupAt'];

function buildBackup() {
  const couple = {};
  for (const [k, v] of Object.entries(S.couple || {})) if (!COUPLE_SKIP.includes(k)) couple[k] = v;
  const cols = {};
  for (const name of COLS) cols[name] = list(name).map((d) => ({ ...d }));
  return { app: 'two-park', ver: 1, cid: S.cid, at: now(), couple, cols };
}
const backupCounts = (b) => Object.fromEntries(Object.entries(b.cols).map(([k, v]) => [k, v.length]));

// 存一份雲端快照
async function saveCloudBackup(by = 'auto') {
  const b = buildBackup();
  const json = JSON.stringify(b);
  const parts = [];
  for (let i = 0; i < json.length; i += BACKUP_CHUNK) parts.push(json.slice(i, i + BACKUP_CHUNK));
  const id = 'b' + b.at;
  for (let i = 0; i < parts.length; i++) await S.store.col(S.cid, 'backupParts').set(`${id}_${i}`, { bid: id, i, data: parts[i] }, false);
  await S.store.col(S.cid, 'backups').set(id, { at: b.at, by: by === 'auto' ? 'auto' : me(), parts: parts.length, counts: backupCounts(b), size: json.length }, false);
  await S.store.updateCouple(S.cid, { lastBackupAt: b.at });
  await pruneBackups();
  return id;
}
async function listCloudBackups() {
  return new Promise((res) => {
    const off = S.store.col(S.cid, 'backups').watch((arr) => { setTimeout(() => off && off(), 0); res(arr.sort((a, b) => b.at - a.at)); });
  });
}
async function pruneBackups() {
  const all = await listCloudBackups();
  for (const b of all.slice(BACKUP_KEEP)) {
    for (let i = 0; i < (b.parts || 1); i++) await S.store.col(S.cid, 'backupParts').remove(`${b.id}_${i}`);
    await S.store.col(S.cid, 'backups').remove(b.id);
  }
}
async function loadCloudBackup(b) {
  const parts = await new Promise((res) => {
    const off = S.store.col(S.cid, 'backupParts').watch((arr) => { setTimeout(() => off && off(), 0); res(arr.filter((p) => p.bid === b.id).sort((x, y) => x.i - y.i)); });
  });
  if (parts.length !== (b.parts || 1)) throw new Error('備份檔不完整');
  return JSON.parse(parts.map((p) => p.data).join(''));
}

// 打開 app 時檢查：超過 7 天就自動備份（兩人只會有一個人做）
async function maybeAutoBackup() {
  if (!S.couple || COLS.some((c) => !S.d[c])) return;
  if (now() - (S.couple.lastBackupAt || 0) < BACKUP_EVERY) return;
  const ok = await S.store.coupleTx(S.cid, (c) => (now() - (c.lastBackupAt || 0) < BACKUP_EVERY ? null : { lastBackupAt: now() }));
  if (!ok) return;
  try { await saveCloudBackup('auto'); } catch (e) { console.warn('自動備份失敗', e); }
}

// 還原：把每個集合換回備份時的樣子
async function restoreBackup(b) {
  if (!b || b.app !== 'two-park' || !b.cols) throw new Error('這不是兩人遊樂園的備份檔');
  const patch = {};
  for (const [k, v] of Object.entries(b.couple || {})) if (!COUPLE_SKIP.includes(k)) patch[k] = v;
  if (Object.keys(patch).length) await S.store.updateCouple(S.cid, patch);
  for (const name of COLS) {
    const want = b.cols[name] || [];
    const keep = new Set(want.map((d) => d.id));
    for (const d of list(name)) if (!keep.has(d.id)) await col(name).remove(d.id);
    for (const d of want) { const { id, ...data } = d; await col(name).set(id, data, false); }
  }
}

// 下載成檔案（iPhone 會跳出分享選單，選「儲存到檔案」）
async function downloadBackup() {
  const b = buildBackup();
  const name = `two-park-backup-${dkey()}.json`;
  const blob = new Blob([JSON.stringify(b, null, 1)], { type: 'application/json' });
  const file = new File([blob], name, { type: 'application/json' });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: name }); }
    else { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000); }
    localStorage.setItem('park-dl-' + S.cid, String(now()));
    toast('備份檔存好了');
    render();
  } catch (e) { if (e.name !== 'AbortError') toast('下載失敗：' + e.message); }
}
function needDownloadReminder() {
  if (!S.cid) return false;
  const first = 'park-dl-first-' + S.cid;
  if (!localStorage.getItem(first)) localStorage.setItem(first, String(now())); // 第一次用先不提醒，一個月後才提醒
  const last = +(localStorage.getItem('park-dl-' + S.cid) || 0) || +localStorage.getItem(first);
  return now() - last > 30 * 86400000;
}
ACT.downloadBackup = () => downloadBackup();

ACT.backup = async () => {
  const draw = async (m) => {
    const bs = await listCloudBackups();
    const lastDl = +(localStorage.getItem('park-dl-' + S.cid) || 0);
    const html = `${mhead('備份與還原')}
      <div class="card">
        <h3>雲端自動備份</h3>
        <p class="small muted" style="margin:0 0 8px">每 7 天打開 app 時自動備份一次，保留最近 ${BACKUP_KEEP} 份。資料被誤刪時可以一鍵還原。</p>
        ${bs.length ? bs.map((b) => `<div class="list-row"><span class="lr-i">☁️</span><div class="grow">${fmtFull(b.at)} ${new Date(b.at).toTimeString().slice(0, 5)}
          <div class="small muted">${b.by === 'auto' ? '自動' : nick(b.by) + ' 手動'} · ${b.counts?.cards || 0} 張票券 · ${b.counts?.trips || 0} 個足跡 · ${Math.ceil((b.size || 0) / 1024)} KB</div></div>
          <button class="btn sm ghost" data-restore="${b.id}">還原</button></div>`).join('') : '<div class="empty">還沒有雲端備份</div>'}
        <button class="btn block mt" id="bk-now">現在備份一次</button>
      </div>
      <div class="card">
        <h3>存到手機</h3>
        <p class="small muted" style="margin:0 0 8px">下載一份備份檔，在 iPhone 選「儲存到檔案」，有開 iCloud 雲碟就會自動同步。就算帳號出問題，資料也還在。${lastDl ? `<br>上次下載：${fmtFull(lastDl)}` : ''}</p>
        <button class="btn block" id="bk-dl">下載備份檔</button>
        <label class="btn ghost block mt" style="margin-top:10px">從備份檔還原<input type="file" accept="application/json,.json" id="bk-file" class="hidden"></label>
      </div>`;
    if (!m) m = openModal(html); else m.querySelector('.modal').innerHTML = html;
    $('#bk-now', m).onclick = async () => { $('#bk-now', m).disabled = true; $('#bk-now', m).textContent = '備份中…'; try { await saveCloudBackup('manual'); toast('雲端備份好了 ☁️'); } catch (e) { toast('備份失敗：' + e.message); } draw(m); };
    $('#bk-dl', m).onclick = () => downloadBackup();
    $$('[data-restore]', m).forEach((btn) => btn.onclick = async () => {
      const b = bs.find((x) => x.id === btn.dataset.restore);
      if (!(await confirmBox(`要還原到 ${fmtFull(b.at)} 的備份嗎？\n現在的資料會換成那時候的樣子（兩人都會一起變），還原前會先自動備份一份現在的資料。`, '還原'))) return;
      try { await saveCloudBackup('manual'); await restoreBackup(await loadCloudBackup(b)); toast('還原好了'); closeAll(); } catch (e) { toast('還原失敗：' + e.message); }
    });
    $('#bk-file', m).onchange = async (e) => {
      const f = e.target.files[0]; if (!f) return;
      try {
        const b = JSON.parse(await f.text());
        if (b.app !== 'two-park') throw new Error('這不是兩人遊樂園的備份檔');
        if (!(await confirmBox(`要從這個檔案還原嗎？\n備份時間：${fmtFull(b.at)}\n現在的資料會換成檔案裡的樣子，還原前會先自動備份一份現在的資料。`, '還原'))) return;
        await saveCloudBackup('manual'); await restoreBackup(b); toast('還原好了'); closeAll();
      } catch (err) { toast('還原失敗：' + err.message); }
    };
    return m;
  };
  draw();
};
// ============================================================
//  啟動
// ============================================================
boot();
