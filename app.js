// ============================================================
//  兩人遊樂園 — 主程式
//  （這個檔案是由 src/ 資料夾裡的分段檔合併而成）
// ============================================================
import { firebaseConfig } from './config.js';
import * as D from './data.js?v=11211647';
import { createStore } from './store.js?v=11211647';

const S = {
  store: null, me: null, cid: null, couple: null, d: {},
  tab: 'home',   // 每次打開都從首頁開始
  sub: { wallet: 'mine', travel: 'plan', memory: 'goals' },
  unsubs: [], started: Date.now(), seenEvents: new Set(), deferRender: false,
};
const COLS = ['cards', 'events', 'points', 'pool', 'wishes', 'taskDone', 'battles', 'quiz', 'daily',
  'deposits', 'trips', 'goals', 'capsules', 'notes', 'misses', 'gacha', 'memories', 'photos', 'deep', 'dates', 'ideas', 'watch', 'hot'];

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
const avatarRaw = (p) => (p.av && (AVATARS[p.av] || p.av === 'blackcat')) ? avatarSVG(p.av) : esc(p.emoji || (p.role === 'him' ? '👦' : '👧'));
const avatar = (uid, cls = '') => uid === 'sys' ? '<span class="av"><i data-ic="ferris"></i></span>' : `<span class="av ${cls}">${avatarRaw(prof(uid))}</span>`;
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
    ...(tpl.frame != null ? { frame: tpl.frame } : {}), ...(tpl.pat ? { pat: tpl.pat } : {}), ...(tpl.pal ? { pal: tpl.pal } : {}),
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
  const box = $('#toasts'); box.appendChild(t);
  while (box.children.length > 2) box.firstElementChild.remove();
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
function floaty(x, y, chars = ['#ff6f91', '#ff9db4', '#e2445f', '#ffc2d1', '#d9a53b']) {
  for (let i = 0; i < 6; i++) {
    const f = document.createElement('div');
    f.className = 'floaty'; f.innerHTML = `<svg viewBox="0 0 24 24" width="1em" height="1em"><path d="M12 20.5 C5 15.5 2.5 12 2.5 8.5 C2.5 5.5 4.8 3.5 7.5 3.5 C9.5 3.5 11 4.6 12 6.2 C13 4.6 14.5 3.5 16.5 3.5 C19.2 3.5 21.5 5.5 21.5 8.5 C21.5 12 19 15.5 12 20.5 Z" fill="${pick(chars)}"/></svg>`;
    f.style.left = (x - 14 + Math.random() * 20) + 'px'; f.style.top = (y - 20) + 'px';
    f.style.setProperty('--dx', (Math.random() * 120 - 60) + 'px');
    f.style.animationDelay = (i * 0.06) + 's';
    document.body.appendChild(f);
    setTimeout(() => f.remove(), 1600);
  }
}
const vibrate = (p) => { try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} };
// 小音效（用程式合成，不需要音檔）；設定裡可以關掉
let AC = null;
const sfxOn = () => localStorage.getItem('park-sfx') !== 'off';
function sfx(name) {
  if (!sfxOn()) return;
  if (typeof bgmDuck === 'function') bgmDuck();
  try {
    AC ||= (typeof BGM !== 'undefined' && BGM.ctx) || new (window.AudioContext || window.webkitAudioContext)();
    if (AC.state !== 'running') AC.resume();
    if (AC.state === 'suspended') AC.resume();
    const t0 = AC.currentTime;
    const tone = (f, at, dur, type = 'sine', vol = .12) => {
      const o = AC.createOscillator(), g = AC.createGain();
      o.type = type; o.frequency.setValueAtTime(f, t0 + at);
      g.gain.setValueAtTime(0, t0 + at); g.gain.linearRampToValueAtTime(vol, t0 + at + .015);
      g.gain.exponentialRampToValueAtTime(.0008, t0 + at + dur);
      o.connect(g); g.connect(AC.destination); o.start(t0 + at); o.stop(t0 + at + dur + .05);
    };
    const S = {
      flip: () => { tone(660, 0, .09, 'triangle', .08); tone(990, .05, .12, 'triangle', .06); },
      pop: () => { tone(520, 0, .12, 'sine', .1); tone(780, .06, .16, 'sine', .08); },
      chime: () => [784, 988, 1175, 1568].forEach((f, i) => tone(f, i * .09, .5, 'sine', .09)),
      sparkle: () => [1047, 1319, 1568, 2093, 1568, 2093, 2637].forEach((f, i) => tone(f, i * .07, .45, 'triangle', .06)),
      scratch: () => { tone(880, 0, .25, 'sine', .08); tone(1320, .1, .4, 'sine', .07); },
      heart: () => { tone(440, 0, .1, 'sine', .07); tone(660, .07, .14, 'sine', .06); },
      stamp: () => { tone(180, 0, .12, 'square', .05); tone(360, .02, .1, 'triangle', .07); },
    };
    (S[name] || S.pop)();
  } catch (e) {}
}

function openModal(html, { center = false, cls = '', onClose } = {}) {
  const back = document.createElement('div');
  back.className = `modal-back ${center ? 'center' : ''} ${cls}`;
  back.innerHTML = `<div class="modal">${html}</div>`;
  back.addEventListener('click', (e) => { if (e.target === back && !back.dataset.busy) closeModal(back); });   // busy：動畫進行中不能點外面關掉
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

// ---------- 配色主題（每支手機自己選） ----------
const PALETTES = {
  zone: { name: '分區配色', desc: '每個分頁一個主色', sw: ["#ff6f91", "#8a63d8", "#2a9a96", "#d0912c"], meta: {} },
  morandi: { name: '莫蘭迪', desc: '低飽和、溫柔安靜', sw: ["#b9787f", "#7f9a87", "#7d8fab", "#b0916e"], meta: {"day": "#f4f0ea", "night": "#1c1a19"} },
  carnival: { name: '夜遊樂園', desc: '午夜藍底、燈泡金', sw: ["#f0606f", "#7d5fd8", "#23a19c", "#d0991e"], meta: {"day": "#f3f4fa", "night": "#10162b"} },
  candy: { name: '復古糖果', desc: '櫻桃紅、薄荷、奶油黃', sw: ["#d93a4a", "#36a37c", "#3f84cc", "#d99a12"], meta: {"day": "#fff8ec", "night": "#1e1517"} },
};
function paletteId() { const p = localStorage.getItem('park-palette'); return PALETTES[p] ? p : 'zone'; }
function setSection(sec) { document.documentElement.dataset.sec = sec || 'home'; }
// ---------- 主題（日夜模式） ----------
function themeMode() { return localStorage.getItem('park-theme') || 'auto'; }
function applyTheme() {
  const mode = themeMode();
  const h = new Date().getHours();
  const t = mode === 'auto' ? (h >= 6 && h < 18 ? 'day' : 'night') : mode;
  document.documentElement.dataset.theme = t;
  document.documentElement.dataset.palette = paletteId();
  const mc = document.querySelector('meta[name=theme-color]');
  if (mc) mc.content = (PALETTES[paletteId()].meta || {})[t] || (t === 'day' ? '#fff6f1' : '#150a0f');
  return t;
}
ACT.theme = () => {
  const order = ['auto', 'day', 'night'];
  const next = order[(order.indexOf(themeMode()) + 1) % 3];
  localStorage.setItem('park-theme', next);
  applyTheme();
  toast({ auto: '自動模式：白天亮色、晚上暗色', day: '白天模式', night: '夜晚模式' }[next]);
  renderTop();
};
applyTheme();
setInterval(applyTheme, 60000);

// 主畫面圖示：index.html 的 icon-180.png（黑貓徽章）
// ============================================================
//  介面圖示：一套線條圖示（跟卡片圖騰同樣的筆觸），取代介面上的 emoji
//  ic('home') → 內嵌 SVG，顏色跟著文字走（currentColor）
// ============================================================

const IC = {
  // 分頁
  home: '<path d="M4 11 L12 4 L20 11"/><path d="M6 10 V20 H18 V10"/><path d="M10 20 V14 H14 V20"/>',
  ticket: '<path d="M3 8 V6 H21 V8 A2 2 0 0 0 21 12 A2 2 0 0 0 21 16 V18 H3 V16 A2 2 0 0 0 3 12 A2 2 0 0 0 3 8 Z"/><path d="M9 6 V18" stroke-dasharray="1.5 2"/>',
  ferris: '<circle cx="12" cy="10" r="7"/><circle cx="12" cy="10" r="1.6"/><path d="M12 3 V17 M5 10 H19 M7 5 L17 15 M17 5 L7 15"/><path d="M8.5 21 L12 12 L15.5 21 M7 21 H17"/>',
  map: '<path d="M3 6 L9 4 L15 6 L21 4 V18 L15 20 L9 18 L3 20 Z"/><path d="M9 4 V18 M15 6 V20"/>',
  book: '<path d="M12 6 C9 4 6 4 3 5 V19 C6 18 9 18 12 20 C15 18 18 18 21 19 V5 C18 4 15 4 12 6 Z"/><path d="M12 6 V20"/>',
  // 工具列
  coin: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="5.5" stroke-dasharray="1.5 1.8"/><path d="M12 9 V15 M10 10.5 H13.5"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5 V5 M12 19 V21.5 M2.5 12 H5 M19 12 H21.5 M5.3 5.3 L7 7 M17 17 L18.7 18.7 M5.3 18.7 L7 17 M17 7 L18.7 5.3"/>',
  moon: '<path d="M19 15 A8 8 0 1 1 9 4 A6.5 6.5 0 0 0 19 15 Z"/><path d="M17 4 L17.6 5.4 L19 6 L17.6 6.6 L17 8 L16.4 6.6 L15 6 L16.4 5.4 Z" fill="currentColor" stroke="none"/>',
  candle: '<path d="M9 10 H15 V21 H9 Z"/><path d="M12 10 V8"/><path d="M12 2.5 C14 5 14 7 12 8 C10 7 10 5 12 2.5 Z"/><path d="M6 21 H18"/>',
  bell: '<path d="M6 16 V11 A6 6 0 0 1 18 11 V16 L19.5 18 H4.5 Z"/><path d="M10 20.5 A2 2 0 0 0 14 20.5"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2.8 L13.6 5.2 L16.4 4.4 L16.6 7.4 L19.4 8.6 L18 11.2 L19.8 13.6 L17.2 15 L17.2 18 L14.2 17.6 L12.6 20.2 L10.6 18 L7.8 19 L7.2 16 L4.4 15 L5.8 12.4 L4.2 10 L6.8 8.6 L6.8 5.6 L9.8 6 Z"/>',
  // 區塊
  pin: '<path d="M12 21 C9 16 5.5 13 5.5 9 A6.5 6.5 0 0 1 18.5 9 C18.5 13 15 16 12 21 Z"/><circle cx="12" cy="9" r="2.5"/>',
  pushpin: '<path d="M9 3 H15 L14 9 L17 12 H7 L10 9 Z"/><path d="M12 12 V21"/>',
  weather: '<circle cx="9" cy="9" r="3.2"/><path d="M9 3 V4.2 M3 9 H4.2 M4.8 4.8 L5.6 5.6 M13.2 4.8 L12.4 5.6"/><path d="M8 19 H18 A3.5 3.5 0 0 0 17.6 12 A5 5 0 0 0 8.5 13.4 A3 3 0 0 0 8 19 Z"/>',
  heart: '<path d="M12 20 C6 15.5 3 12.5 3 8.8 C3 6 5.2 4 7.7 4 C9.6 4 11 5.1 12 6.6 C13 5.1 14.4 4 16.3 4 C18.8 4 21 6 21 8.8 C21 12.5 18 15.5 12 20 Z"/>',
  letter: '<path d="M3 6 H21 V18 H3 Z"/><path d="M3 6 L12 13 L21 6"/><path d="M12 15.2 C10.6 14.1 9.8 13.3 9.8 12.4 C9.8 11.7 10.4 11.2 11 11.2 C11.5 11.2 11.8 11.5 12 11.9 C12.2 11.5 12.5 11.2 13 11.2 C13.6 11.2 14.2 11.7 14.2 12.4 C14.2 13.3 13.4 14.1 12 15.2 Z" fill="currentColor" stroke="none"/>',
  chat: '<path d="M4 5 H20 V16 H11 L6 20 V16 H4 Z"/><path d="M8 10.5 H8.01 M12 10.5 H12.01 M16 10.5 H16.01" stroke-width="2.4"/>',
  sparkle: '<path d="M12 3 L13.8 10.2 L21 12 L13.8 13.8 L12 21 L10.2 13.8 L3 12 L10.2 10.2 Z"/><path d="M19 3 V6 M17.5 4.5 H20.5"/>',
  stamp: '<path d="M9 3 H15 V9 C15 10 17 10.5 19 11 V14 H5 V11 C7 10.5 9 10 9 9 Z"/><path d="M5 17 H19 M7 20 H17"/>',
  clipboard: '<path d="M7 4 H17 V21 H7 Z"/><path d="M10 3 H14 V5.5 H10 Z"/><path d="M9.5 10 L11 11.5 L14.5 8.5 M9.5 15.5 L11 17 L14.5 14"/>',
  target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/><path d="M14 10 L20 4 M17 4 H20 V7"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7 V12 L15.5 14"/>',
  hourglass: '<path d="M6 3 H18 M6 21 H18"/><path d="M7.5 3 C7.5 8 12 9.5 12 12 C12 14.5 7.5 16 7.5 21 M16.5 3 C16.5 8 12 9.5 12 12 C12 14.5 16.5 16 16.5 21"/><path d="M9.5 19 C10.5 17.5 13.5 17.5 14.5 19"/>',
  trophy: '<path d="M7 4 H17 V9 A5 5 0 0 1 7 9 Z"/><path d="M7 6 H4 A3 3 0 0 0 7 11 M17 6 H20 A3 3 0 0 1 17 11"/><path d="M12 14 V18 M8 21 H16 M9.5 18 H14.5"/>',
  film: '<path d="M4 4 H20 V20 H4 Z"/><path d="M8 4 V20 M16 4 V20 M4 8 H8 M4 12 H8 M4 16 H8 M16 8 H20 M16 12 H20 M16 16 H20"/>',
  key: '<circle cx="8" cy="12" r="4"/><path d="M12 12 H21 M18 12 V15 M15 12 V14"/>',
  castle: '<path d="M4 21 V9 H6 V7 H8 V9 H10 V7 H14 V9 H16 V7 H18 V9 H20 V21 Z"/><path d="M10 21 V16 A2 2 0 0 1 14 16 V21"/><path d="M12 7 V3 L15 4 L12 5"/>',
  piggy: '<path d="M5 12 C5 8 8.5 6 12.5 6 C16 6 18.5 7.5 19.2 10 H21 V14 H19.2 C18.7 15.5 17.8 16.5 16.5 17.2 V20 H14 V18 H10.5 V20 H8 V17 C6 16 5 14.2 5 12 Z"/><path d="M11 6.2 L10 3.5 L13 5"/><circle cx="16" cy="10.5" r=".6" fill="currentColor"/><path d="M5 12 C3.8 12 3.2 11.2 3.2 10.4"/>',
  coins: '<ellipse cx="9" cy="7" rx="5" ry="2.2"/><path d="M4 7 V11 C4 12.2 6.2 13.2 9 13.2 S14 12.2 14 11 V7"/><ellipse cx="15" cy="14" rx="5" ry="2.2"/><path d="M10 14 V18 C10 19.2 12.2 20.2 15 20.2 S20 19.2 20 18 V14"/>',
  gacha: '<circle cx="12" cy="8.5" r="6"/><path d="M8 7 A1.5 1.5 0 0 1 10.5 5.5 M13.5 10 A1.8 1.8 0 1 0 16 11.5"/><path d="M5.5 13 H18.5 V21 H5.5 Z"/><circle cx="9.5" cy="17" r="1.6"/><path d="M14 16 H16.5 V18.5 H14 Z"/>',
  wheel: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="1.8"/><path d="M12 3.5 V10.2 M12 13.8 V20.5 M3.5 12 H10.2 M13.8 12 H20.5 M6 6 L10.7 10.7 M13.3 13.3 L18 18 M18 6 L13.3 10.7 M10.7 13.3 L6 18"/><path d="M10.5 1.5 H13.5 L12 4 Z" fill="currentColor"/>',
  dining: '<circle cx="12" cy="12" r="5.5"/><path d="M4 3 V9 M2.5 3 V7.5 A1.5 1.5 0 0 0 5.5 7.5 V3 M4 9 V21"/><path d="M20 3 C18.5 4 18 6.5 18 9 H20 V21"/>',
  dice: '<rect x="4" y="4" width="16" height="16" rx="3.5"/><circle cx="8.5" cy="8.5" r="1.1" fill="currentColor"/><circle cx="15.5" cy="15.5" r="1.1" fill="currentColor"/><circle cx="12" cy="12" r="1.1" fill="currentColor"/><circle cx="15.5" cy="8.5" r="1.1" fill="currentColor"/><circle cx="8.5" cy="15.5" r="1.1" fill="currentColor"/>',
  minds: '<circle cx="8.5" cy="12" r="5"/><circle cx="15.5" cy="12" r="5"/><path d="M12 9.6 C11.3 10.4 11.3 13.6 12 14.4"/><path d="M15.5 4 L16 5.5 L17.5 6 L16 6.5 L15.5 8 L15 6.5 L13.5 6 L15 5.5 Z" fill="currentColor" stroke="none"/>',
  swords: '<path d="M4 4 L14 14 M4 4 H7.5 L16 12.5 M4 4 V7.5 L12.5 16"/><path d="M20 4 L10 14 M20 4 H16.5 M20 4 V7.5"/><path d="M13 17 L17 13 M15 15 L19 19 M7 13 L11 17 M9 15 L5 19"/>',
  flask: '<path d="M9 3 H15 M10 3 V9 L4.5 18.5 A1.6 1.6 0 0 0 6 21 H18 A1.6 1.6 0 0 0 19.5 18.5 L14 9 V3"/><path d="M7 15 H17"/><circle cx="10" cy="17.5" r=".7" fill="currentColor"/><circle cx="13.5" cy="18" r=".9" fill="currentColor"/>',
  star: '<path d="M12 3.5 L14.5 9 L20.5 9.6 L16 13.6 L17.3 19.5 L12 16.5 L6.7 19.5 L8 13.6 L3.5 9.6 L9.5 9 Z"/>',
  shooting: '<path d="M15.5 3.5 L17 7 L20.5 7.4 L17.8 9.8 L18.6 13.3 L15.5 11.5 L12.4 13.3 L13.2 9.8 L10.5 7.4 L14 7 Z"/><path d="M10 12 L3 19 M12 15 L7 20 M7.5 10.5 L3.5 14.5" stroke-dasharray="1.5 2.2"/>',
  cake: '<path d="M4 13 H20 V20 H4 Z"/><path d="M4 16 C6 17.5 8 17.5 10 16 C12 17.5 14 17.5 16 16 C18 17.5 19 17 20 16"/><path d="M8 13 V9 M12 13 V9 M16 13 V9"/><path d="M8 5.5 C9 6.5 9 7.5 8 8 C7 7.5 7 6.5 8 5.5 Z M12 5.5 C13 6.5 13 7.5 12 8 C11 7.5 11 6.5 12 5.5 Z M16 5.5 C17 6.5 17 7.5 16 8 C15 7.5 15 6.5 16 5.5 Z"/>',
  rose: '<path d="M12 12 C8 12 6.5 9.5 7 6.5 C9 7.5 10 6 12 4 C14 6 15 7.5 17 6.5 C17.5 9.5 16 12 12 12 Z"/><path d="M12 12 V21 M12 17 C14 15 16.5 15 17.5 15.5 C16.5 17.5 14 18 12 17 M12 15 C10.5 13.8 8.5 13.8 7.5 14.3"/>',
  tree: '<path d="M12 3 L17 9 H14.5 L18.5 14 H15.5 L19.5 19 H4.5 L8.5 14 H5.5 L9.5 9 H7 Z"/><path d="M12 19 V21.5"/>',
  medal: '<circle cx="12" cy="15" r="5.5"/><path d="M8.5 3 L11 9.7 M15.5 3 L13 9.7"/><path d="M12 12.5 L12.8 14.3 L14.7 14.5 L13.3 15.8 L13.7 17.7 L12 16.7 L10.3 17.7 L10.7 15.8 L9.3 14.5 L11.2 14.3 Z"/>',
  cloud: '<path d="M7 18 H17.5 A4 4 0 0 0 17 10 A5.5 5.5 0 0 0 6.6 11.6 A3.3 3.3 0 0 0 7 18 Z"/><path d="M12 11 V16 M10 13.5 L12 11 L14 13.5"/>',
  swap: '<path d="M4 9 A8 8 0 0 1 18.5 6.5 M18.5 3 V6.5 H15"/><path d="M20 15 A8 8 0 0 1 5.5 17.5 M5.5 21 V17.5 H9"/>',
  flag: '<path d="M5 21 V4 M5 4 C8 2.5 10 5.5 13 4 C15 3 17 3.5 19 4.5 V12 C17 11 15 10.5 13 11.5 C10 13 8 10 5 11.5"/>',
  lock: '<path d="M6 11 H18 V20 H6 Z"/><path d="M8.5 11 V8 A3.5 3.5 0 0 1 15.5 8 V11"/><circle cx="12" cy="15.5" r="1.2" fill="currentColor"/>',
  camera: '<path d="M3 8 H7 L9 5.5 H15 L17 8 H21 V19 H3 Z"/><circle cx="12" cy="13" r="3.8"/>',
  violin: '<path d="M14.5 3 L20 8.5 M17 3.5 L19.5 6"/><path d="M15.5 6.5 L11 11"/><path d="M11 11 C9 9.5 6.5 10 5.5 11.8 C4.5 13.4 5.5 14.6 4.5 16 C3.6 17.3 4 19 5.5 20 C7 21 8.6 20.5 9.4 19.4 C10.6 18.3 11.8 19.3 13.2 18.2 C15 16.8 14.6 14 13 13 Z"/><path d="M7.5 15.5 L10 18 M9.5 13.5 L8.5 14.5"/>',
  gift: '<path d="M4 10 H20 V20 H4 Z M3 7 H21 V10 H3 Z"/><path d="M12 7 V20"/><path d="M12 7 C10.5 4 7 3.5 7 5.5 C7 7 10 7 12 7 C14 7 17 7 17 5.5 C17 3.5 13.5 4 12 7 Z"/>',
  house: '<path d="M4 11 L12 4 L20 11 V20 H4 Z"/><path d="M12 11 C10.8 10 9.6 10.4 9.6 11.6 C9.6 12.8 11 13.8 12 14.6 C13 13.8 14.4 12.8 14.4 11.6 C14.4 10.4 13.2 10 12 11 Z"/>',
  plane: '<path d="M3 13 L10 11 L14 4 H16 L14.5 10.5 L20 9 A1.6 1.6 0 0 1 20.5 12 L5.5 16 Z"/><path d="M8 20 H17"/>',
  photo: '<path d="M4 5 H20 V19 H4 Z"/><circle cx="9" cy="10" r="1.8"/><path d="M4 17 L9 13 L13 16 L16 13.5 L20 17"/>',
  users: '<circle cx="9" cy="8" r="3.3"/><path d="M3 20 C3 15.8 5.7 13.5 9 13.5 C12.3 13.5 15 15.8 15 20"/><circle cx="16.5" cy="9" r="2.6"/><path d="M15.5 13.6 C18.6 13.4 21 15.5 21 19"/>',
  hundred: '<path d="M4 7 L6 6 V17 M10.5 6.5 A2.5 5.5 0 1 0 10.6 6.5 Z M17.5 6.5 A2.5 5.5 0 1 0 17.6 6.5 Z"/><path d="M3 20 H21"/>',
  edit: '<path d="M4 20 H8 L19 9 A2.1 2.1 0 0 0 16 6 L5 17 Z"/><path d="M14 8 L17 11"/>',
  plus: '<path d="M12 5 V19 M5 12 H19"/>',
  chevron: '<path d="M9 5 L16 12 L9 19"/>',
  download: '<path d="M12 4 V15 M7.5 10.5 L12 15 L16.5 10.5 M5 19.5 H19"/>',
  candy: '<path d="M8 12 A4 4 0 1 0 16 12 A4 4 0 1 0 8 12 Z"/><path d="M8 12 L4 9 V15 Z M16 12 L20 9 V15 Z"/><path d="M10.5 9.5 L13.5 14.5"/>',
  logout: '<path d="M10 4 H5 V20 H10"/><path d="M14 8 L18 12 L14 16 M18 12 H9"/>',
  trash: '<path d="M4 7 H20 M9 7 V4.5 H15 V7 M6.5 7 L7.5 20 H16.5 L17.5 7"/><path d="M10 11 V16 M14 11 V16"/>',
  search: '<circle cx="11" cy="11" r="6"/><path d="M15.5 15.5 L20 20"/>',
  check: '<path d="M5 12.5 L10 17 L19 7.5"/>',
  // 心情天氣
  w_sun: '<circle cx="12" cy="12" r="4.5"/><path d="M12 2 V4.5 M12 19.5 V22 M2 12 H4.5 M19.5 12 H22 M4.9 4.9 L6.7 6.7 M17.3 17.3 L19.1 19.1 M4.9 19.1 L6.7 17.3 M17.3 6.7 L19.1 4.9"/>',
  w_partly: '<circle cx="9" cy="9" r="3.5"/><path d="M9 2.5 V4 M2.5 9 H4 M4.4 4.4 L5.4 5.4 M13.6 4.4 L12.6 5.4"/><path d="M8.5 19.5 H18 A3.5 3.5 0 0 0 17.6 12.5 A5 5 0 0 0 8.6 13.8 A2.9 2.9 0 0 0 8.5 19.5 Z"/>',
  w_cloud: '<path d="M6.5 18 H17.5 A4 4 0 0 0 17.1 10 A5.6 5.6 0 0 0 6.4 11.4 A3.3 3.3 0 0 0 6.5 18 Z"/>',
  w_rain: '<path d="M6.5 14.5 H17.5 A4 4 0 0 0 17.1 6.5 A5.6 5.6 0 0 0 6.4 7.9 A3.3 3.3 0 0 0 6.5 14.5 Z"/><path d="M8 17.5 L7 20.5 M12 17.5 L11 20.5 M16 17.5 L15 20.5"/>',
  w_storm: '<path d="M6.5 13.5 H17.5 A4 4 0 0 0 17.1 5.5 A5.6 5.6 0 0 0 6.4 6.9 A3.3 3.3 0 0 0 6.5 13.5 Z"/><path d="M12.5 14 L10 18 H13 L11 22"/>',
  w_rainbow: '<path d="M3 18 A9 9 0 0 1 21 18"/><path d="M6 18 A6 6 0 0 1 18 18"/><path d="M9 18 A3 3 0 0 1 15 18"/>',
  w_sleep: '<path d="M17 15.5 A7.5 7.5 0 1 1 8.5 5 A6 6 0 0 0 17 15.5 Z"/><path d="M15 4 H19 L15 8 H19" stroke-width="1.4"/>',
  w_fire: '<path d="M12 21 C8 21 6 18.5 6 15.5 C6 12 9 10.5 9 7 C11.5 8.5 12 10.5 11.8 12.2 C13 11.4 13.6 10 13.6 8.5 C16.5 10.5 18 13 18 15.5 C18 18.5 16 21 12 21 Z"/><path d="M12 21 C10.5 21 9.7 19.8 9.7 18.6 C9.7 17 11 16.3 11.4 15 C13 16 14.3 17.2 14.3 18.6 C14.3 19.8 13.5 21 12 21 Z"/>',
};
const spiceIc = (l) => `<i data-ic="${D.SPICE[l || 1].ic}"></i>`;
// 心情：用存下來的 emoji 找對應的手繪天氣圖示
const moodCls = (emoji) => { const m = D.MOODS.find((x) => x.icon === emoji); return m ? 'mood-' + m.ic : ''; };
const moodIc = (emoji, cls = '') => { const m = D.MOODS.find((x) => x.icon === emoji); return m ? `<i data-ic="${m.ic}" class="${cls}"></i>` : emoji; };
function ic(name, cls = '') {
  const p = IC[name]; if (!p) return '';
  return `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
}
// 徽章框裡的圖示（遊戲卡片、頁面標題用）
function icMedal(name, cls = '') {
  return `<span class="ic-medal ${cls}"><svg viewBox="0 0 48 48" class="ic-ring" aria-hidden="true"><circle cx="24" cy="24" r="22" fill="none" stroke="currentColor" stroke-width="1.2"/><circle cx="24" cy="24" r="19" fill="none" stroke="currentColor" stroke-width=".7" stroke-dasharray="1.2 2.4" opacity=".7"/></svg>${ic(name)}</span>`;
}

// 佔位 <i data-ic="名稱"> 自動換成 SVG（畫面一出現就換）
function hydrateIcons(root) {
  root.querySelectorAll('i[data-ic]').forEach((el) => {
    const n = el.dataset.ic;
    const html = el.hasAttribute('data-medal') ? icMedal(n, el.className) : ic(n, el.className);
    if (html) el.outerHTML = html; else el.removeAttribute('data-ic');
  });
}
new MutationObserver((ms) => {
  for (const m of ms) for (const n of m.addedNodes) {
    if (n.nodeType !== 1) continue;
    if (n.matches('i[data-ic]')) { if (n.parentNode) hydrateIcons(n.parentNode); }
    else if (n.querySelector('i[data-ic]')) hydrateIcons(n);
    if (typeof catifyEmpty === 'function' && (n.matches('.empty') || n.querySelector('.empty'))) catifyEmpty(n.matches('.empty') ? n.parentNode || n : n);
  }
}).observe(document.documentElement, { childList: true, subtree: true });
// ============================================================
//  手繪頭像（10 款）。profile.av = 'cat' 這種 id；沒有 av 就用 emoji
// ============================================================

const AV_INK = '#4a2e2a';
const AVATARS = {
  bunny: { name: '排球兔', bg: '#e7e1ff', art: `
    <ellipse cx="24" cy="17" rx="5.5" ry="13" transform="rotate(-12 24 17)" fill="#fff" stroke="${AV_INK}" stroke-width="1.8"/>
    <ellipse cx="24" cy="18" rx="2.4" ry="8.5" transform="rotate(-12 24 18)" fill="#ffc2d1"/>
    <ellipse cx="40" cy="17" rx="5.5" ry="13" transform="rotate(12 40 17)" fill="#fff" stroke="${AV_INK}" stroke-width="1.8"/>
    <ellipse cx="40" cy="18" rx="2.4" ry="8.5" transform="rotate(12 40 18)" fill="#ffc2d1"/>
    <ellipse cx="32" cy="39" rx="16" ry="14" fill="#fff" stroke="${AV_INK}" stroke-width="1.8"/>
    <circle cx="26" cy="37" r="1.9" fill="${AV_INK}"/><circle cx="38" cy="37" r="1.9" fill="${AV_INK}"/>
    <path d="M29.5 42 Q31 44 32 42 Q33 44 34.5 42" fill="none" stroke="${AV_INK}" stroke-width="1.4" stroke-linecap="round"/>
    <ellipse cx="22.5" cy="42" rx="3" ry="1.8" fill="#ffb3c4"/><ellipse cx="41.5" cy="42" rx="3" ry="1.8" fill="#ffb3c4"/>
    <circle cx="48" cy="50" r="7" fill="#fff" stroke="${AV_INK}" stroke-width="1.5"/>
    <path d="M42 48 Q47 50 49 56 M47 43.5 Q48 49 54 51 M42.5 52.5 Q46 46 52 45" fill="none" stroke="#6c8de0" stroke-width="1.3"/>` },
  cat: { name: '貓咪', bg: '#ffdbe4', art: `
    <path d="M15 31 L17 13 L28 23 Z M49 31 L47 13 L36 23 Z" fill="#fff4e8" stroke="${AV_INK}" stroke-width="1.8" stroke-linejoin="round"/>
    <path d="M18.5 25 L19 17 L24 22 Z M45.5 25 L45 17 L40 22 Z" fill="#ffb8c8"/>
    <ellipse cx="32" cy="37" rx="18" ry="15" fill="#fff4e8" stroke="${AV_INK}" stroke-width="1.8"/>
    <path d="M23 35 Q25.5 32.5 28 35 M36 35 Q38.5 32.5 41 35" fill="none" stroke="${AV_INK}" stroke-width="1.7" stroke-linecap="round"/>
    <path d="M30.5 39.5 L33.5 39.5 L32 41.2 Z" fill="#ff8fa8"/>
    <path d="M32 41.2 Q30 44 28 43 M32 41.2 Q34 44 36 43" fill="none" stroke="${AV_INK}" stroke-width="1.2" stroke-linecap="round"/>
    <path d="M14 38 L22 39 M14 42 L22 41 M50 38 L42 39 M50 42 L42 41" stroke="${AV_INK}" stroke-width="1" stroke-linecap="round"/>
    <ellipse cx="22" cy="44" rx="2.8" ry="1.6" fill="#ffb3c4"/><ellipse cx="42" cy="44" rx="2.8" ry="1.6" fill="#ffb3c4"/>` },
  bear: { name: '小熊', bg: '#ffe9cc', art: `
    <circle cx="18" cy="22" r="7.5" fill="#c99b74" stroke="${AV_INK}" stroke-width="1.8"/><circle cx="18" cy="22" r="3.5" fill="#f2c9a6"/>
    <circle cx="46" cy="22" r="7.5" fill="#c99b74" stroke="${AV_INK}" stroke-width="1.8"/><circle cx="46" cy="22" r="3.5" fill="#f2c9a6"/>
    <circle cx="32" cy="37" r="18" fill="#c99b74" stroke="${AV_INK}" stroke-width="1.8"/>
    <ellipse cx="32" cy="43" rx="9" ry="7" fill="#f6dcc3"/>
    <ellipse cx="32" cy="40.5" rx="3.2" ry="2.3" fill="${AV_INK}"/>
    <path d="M32 43 L32 45 M29.5 46.5 Q32 48.5 34.5 46.5" fill="none" stroke="${AV_INK}" stroke-width="1.3" stroke-linecap="round"/>
    <circle cx="25" cy="34" r="2" fill="${AV_INK}"/><circle cx="39" cy="34" r="2" fill="${AV_INK}"/>` },
  fox: { name: '狐狸', bg: '#ffe2cf', art: `
    <path d="M14 16 L25 26 L20 33 Z M50 16 L39 26 L44 33 Z" fill="#f29a52" stroke="${AV_INK}" stroke-width="1.8" stroke-linejoin="round"/>
    <path d="M16.5 19 L22 25 L19.5 28 Z M47.5 19 L42 25 L44.5 28 Z" fill="${AV_INK}" opacity=".8"/>
    <path d="M14 30 Q14 22 32 22 Q50 22 50 30 Q50 44 32 53 Q14 44 14 30 Z" fill="#f29a52" stroke="${AV_INK}" stroke-width="1.8" stroke-linejoin="round"/>
    <path d="M17 33 Q24 34 32 45 Q40 34 47 33 Q46 44 32 53 Q18 44 17 33 Z" fill="#fff6ec"/>
    <ellipse cx="32" cy="47" rx="2.6" ry="1.9" fill="${AV_INK}"/>
    <path d="M23.5 33 Q26 31 28.5 33 M35.5 33 Q38 31 40.5 33" fill="none" stroke="${AV_INK}" stroke-width="1.7" stroke-linecap="round"/>` },
  dog: { name: '小狗', bg: '#d9f0e4', art: `
    <ellipse cx="32" cy="36" rx="16" ry="16" fill="#fff8ee" stroke="${AV_INK}" stroke-width="1.8"/>
    <path d="M17 24 Q9 26 11 40 Q14 44 18 38 Z M47 24 Q55 26 53 40 Q50 44 46 38 Z" fill="#b98457" stroke="${AV_INK}" stroke-width="1.8" stroke-linejoin="round"/>
    <ellipse cx="38" cy="30" rx="5.5" ry="4.5" fill="#e6c49f"/>
    <circle cx="26" cy="34" r="2" fill="${AV_INK}"/><circle cx="38" cy="34" r="2" fill="${AV_INK}"/>
    <ellipse cx="32" cy="40" rx="3" ry="2.2" fill="${AV_INK}"/>
    <path d="M32 42 L32 44 M28.5 44.5 Q32 47 35.5 44.5" fill="none" stroke="${AV_INK}" stroke-width="1.3" stroke-linecap="round"/>
    <path d="M30.5 45.5 Q32 50 33.5 45.5" fill="#ff8fa8" stroke="${AV_INK}" stroke-width="1"/>` },
  penguin: { name: '企鵝', bg: '#d8e9ff', art: `
    <ellipse cx="32" cy="38" rx="17" ry="17" fill="#2f3b57" stroke="${AV_INK}" stroke-width="1.8"/>
    <path d="M32 27 Q38 22 43 28 Q48 36 42 46 Q37 52 32 52 Q27 52 22 46 Q16 36 21 28 Q26 22 32 27 Z" fill="#fff"/>
    <circle cx="26.5" cy="35" r="2" fill="#2f3b57"/><circle cx="37.5" cy="35" r="2" fill="#2f3b57"/>
    <path d="M29 39 L35 39 L32 43 Z" fill="#f5a142" stroke="${AV_INK}" stroke-width="1" stroke-linejoin="round"/>
    <ellipse cx="23" cy="41" rx="2.6" ry="1.6" fill="#ffb3c4"/><ellipse cx="41" cy="41" rx="2.6" ry="1.6" fill="#ffb3c4"/>` },
  girl: { name: '女孩', bg: '#ffd8e2', art: `
    <path d="M14 36 Q12 14 32 13 Q52 14 50 36 L52 52 Q46 50 44 44 L20 44 Q18 50 12 52 Z" fill="#4b3330"/>
    <circle cx="32" cy="35" r="14" fill="#ffe3d3" stroke="${AV_INK}" stroke-width="1.6"/>
    <path d="M18 33 Q20 19 32 19 Q44 19 46 33 Q40 26 34 27 Q30 22 25 27 Q21 29 18 33 Z" fill="#4b3330"/>
    <circle cx="27" cy="37" r="1.8" fill="${AV_INK}"/><circle cx="37" cy="37" r="1.8" fill="${AV_INK}"/>
    <path d="M29.5 42 Q32 44 34.5 42" fill="none" stroke="${AV_INK}" stroke-width="1.4" stroke-linecap="round"/>
    <ellipse cx="24" cy="41" rx="2.6" ry="1.6" fill="#ffb3c4"/><ellipse cx="40" cy="41" rx="2.6" ry="1.6" fill="#ffb3c4"/>
    <path d="M42 19 L47 15 L47 23 Z M42 19 L37 15 L37 23 Z" fill="#ff7a9a" stroke="${AV_INK}" stroke-width="1"/><circle cx="42" cy="19" r="1.6" fill="#ff7a9a" stroke="${AV_INK}" stroke-width="1"/>` },
  boy: { name: '男孩', bg: '#d6ebff', art: `
    <circle cx="32" cy="36" r="15" fill="#ffe3d3" stroke="${AV_INK}" stroke-width="1.6"/>
    <path d="M16 34 Q14 18 30 16 Q34 12 38 16 Q50 18 48 34 Q45 27 40 26 Q41 23 38 22 Q35 27 28 25 Q22 26 16 34 Z" fill="#3e2c26"/>
    <circle cx="27" cy="38" r="1.8" fill="${AV_INK}"/><circle cx="37" cy="38" r="1.8" fill="${AV_INK}"/>
    <path d="M28.5 43 Q32 46 35.5 43" fill="none" stroke="${AV_INK}" stroke-width="1.4" stroke-linecap="round"/>
    <ellipse cx="23.5" cy="42" rx="2.4" ry="1.4" fill="#ffc0b0"/><ellipse cx="40.5" cy="42" rx="2.4" ry="1.4" fill="#ffc0b0"/>` },
  star: { name: '星星', bg: '#fff2c4', art: `
    <path d="M32 11 L38.5 25 L53.5 26.5 L42 36.5 L45.5 51.5 L32 43.5 L18.5 51.5 L22 36.5 L10.5 26.5 L25.5 25 Z" fill="#ffd45c" stroke="${AV_INK}" stroke-width="1.8" stroke-linejoin="round"/>
    <circle cx="27.5" cy="32" r="1.8" fill="${AV_INK}"/><circle cx="36.5" cy="32" r="1.8" fill="${AV_INK}"/>
    <path d="M29 37 Q32 40 35 37" fill="none" stroke="${AV_INK}" stroke-width="1.4" stroke-linecap="round"/>
    <ellipse cx="24.5" cy="36" rx="2.4" ry="1.4" fill="#ffab8a"/><ellipse cx="39.5" cy="36" rx="2.4" ry="1.4" fill="#ffab8a"/>
    <path d="M51 12 L52 15 L55 16 L52 17 L51 20 L50 17 L47 16 L50 15 Z" fill="#fff" stroke="${AV_INK}" stroke-width=".8"/>` },
  violin: { name: '小提琴', bg: '#f5e6d6', art: `
    <g transform="rotate(30 32 34)">
      <path d="M32 26 C26 26 22 29 23 33 C24 36 26 36 26 38 C26 40 22 41 22 46 C22 52 27 55 32 55 C37 55 42 52 42 46 C42 41 38 40 38 38 C38 36 40 36 41 33 C42 29 38 26 32 26 Z" fill="#c9783e" stroke="${AV_INK}" stroke-width="1.7"/>
      <path d="M29 35 Q28 37 29 39 M35 35 Q36 37 35 39" fill="none" stroke="${AV_INK}" stroke-width="1.2" stroke-linecap="round"/>
      <path d="M30.5 8 L33.5 8 L33.5 46 L30.5 46 Z" fill="#3e2a22"/>
      <path d="M31.3 12 L31.3 50 M32.7 12 L32.7 50" stroke="#f3dfc4" stroke-width=".5"/>
      <path d="M28 49 L36 49" stroke="${AV_INK}" stroke-width="1.6" stroke-linecap="round"/>
      <circle cx="32" cy="8" r="3" fill="#3e2a22"/>
    </g>
    <path d="M12 18 L52 50" stroke="#8a5a32" stroke-width="1.4" stroke-linecap="round"/><path d="M12 18 L14 16" stroke="${AV_INK}" stroke-width="2"/>
    <path d="M48 14 L48 21 A2 2 0 1 1 46 19.5" fill="none" stroke="${AV_INK}" stroke-width="1.3" stroke-linecap="round"/>` },
  golden: { name: '黃金獵犬', bg: '#fff1d6', art: `
    <path d="M18 22 Q8 24 9 40 Q10 47 17 45 Q20 36 21 28 Z M46 22 Q56 24 55 40 Q54 47 47 45 Q44 36 43 28 Z" fill="#d9953e" stroke="${AV_INK}" stroke-width="1.7" stroke-linejoin="round"/>
    <path d="M17 34 Q16 18 32 17 Q48 18 47 34 Q47 50 32 52 Q17 50 17 34 Z" fill="#f1bc6a" stroke="${AV_INK}" stroke-width="1.7"/>
    <path d="M24 42 Q24 36 32 36 Q40 36 40 42 Q40 50 32 50 Q24 50 24 42 Z" fill="#fbe2b4"/>
    <path d="M28 20 Q32 24 36 20" fill="none" stroke="#d9953e" stroke-width="1.6" stroke-linecap="round"/>
    <circle cx="25.5" cy="32" r="2.1" fill="${AV_INK}"/><circle cx="38.5" cy="32" r="2.1" fill="${AV_INK}"/>
    <circle cx="26.2" cy="31.2" r=".7" fill="#fff"/><circle cx="39.2" cy="31.2" r=".7" fill="#fff"/>
    <ellipse cx="32" cy="39.5" rx="3.2" ry="2.3" fill="${AV_INK}"/>
    <path d="M32 41.8 L32 43.5 M28.5 44 Q32 47 35.5 44" fill="none" stroke="${AV_INK}" stroke-width="1.3" stroke-linecap="round"/>
    <path d="M30.3 45.2 Q32 50 33.7 45.2" fill="#ff8fa8" stroke="${AV_INK}" stroke-width="1"/>` },
  lopbunny: { name: '粉紅垂耳兔', bg: '#ffe4ec', art: `
    <path d="M19 26 Q8 28 9 44 Q10 50 16 47 Q19 38 23 31 Z M45 26 Q56 28 55 44 Q54 50 48 47 Q45 38 41 31 Z" fill="#f6a9bf" stroke="${AV_INK}" stroke-width="1.7" stroke-linejoin="round"/>
    <path d="M13 34 Q13 42 15 45 M51 34 Q51 42 49 45" fill="none" stroke="#ffd3df" stroke-width="2.4" stroke-linecap="round"/>
    <ellipse cx="32" cy="38" rx="16" ry="14.5" fill="#f9bccd" stroke="${AV_INK}" stroke-width="1.7"/>
    <circle cx="25.5" cy="37" r="2" fill="${AV_INK}"/><circle cx="38.5" cy="37" r="2" fill="${AV_INK}"/>
    <path d="M30.6 41.5 L33.4 41.5 L32 43 Z" fill="#c9506f"/>
    <path d="M32 43 Q30.5 45 29 44.2 M32 43 Q33.5 45 35 44.2" fill="none" stroke="${AV_INK}" stroke-width="1.2" stroke-linecap="round"/>
    <ellipse cx="22" cy="42" rx="2.6" ry="1.5" fill="#f57c9b" opacity=".6"/><ellipse cx="42" cy="42" rx="2.6" ry="1.5" fill="#f57c9b" opacity=".6"/>
    <g fill="#fff" stroke="${AV_INK}" stroke-width=".9"><circle cx="24" cy="23.5" r="2.6"/><circle cx="28.5" cy="21.5" r="2.6"/><circle cx="21.5" cy="27" r="2.6"/><circle cx="25.5" cy="26" r="2.6"/></g><circle cx="25.3" cy="24.6" r="1.6" fill="#ffd45c"/>` },
  hamster: { name: '倉鼠', bg: '#fff0dc', art: `
    <circle cx="19" cy="21" r="5.5" fill="#e9a964" stroke="${AV_INK}" stroke-width="1.7"/><circle cx="45" cy="21" r="5.5" fill="#e9a964" stroke="${AV_INK}" stroke-width="1.7"/>
    <circle cx="19" cy="21" r="2.5" fill="#ffc2c9"/><circle cx="45" cy="21" r="2.5" fill="#ffc2c9"/>
    <ellipse cx="32" cy="38" rx="19" ry="16" fill="#e9a964" stroke="${AV_INK}" stroke-width="1.7"/>
    <path d="M15 42 Q20 33 32 34 Q44 33 49 42 Q46 53 32 54 Q18 53 15 42 Z" fill="#fff6e8"/>
    <circle cx="25" cy="34" r="2" fill="${AV_INK}"/><circle cx="39" cy="34" r="2" fill="${AV_INK}"/>
    <ellipse cx="32" cy="38.5" rx="1.8" ry="1.3" fill="#e46f8a"/>
    <path d="M32 39.8 Q30 42 28.5 41 M32 39.8 Q34 42 35.5 41" fill="none" stroke="${AV_INK}" stroke-width="1.1" stroke-linecap="round"/>
    <ellipse cx="20.5" cy="41" rx="3.4" ry="2.2" fill="#ffb3c4"/><ellipse cx="43.5" cy="41" rx="3.4" ry="2.2" fill="#ffb3c4"/>
    <path d="M29 48 Q32 45 35 48 Q35 51 32 51 Q29 51 29 48 Z" fill="#a46a3a"/>` },
  panda: { name: '熊貓', bg: '#e3f2e5', art: `
    <circle cx="18" cy="22" r="7" fill="#2d2a2e"/><circle cx="46" cy="22" r="7" fill="#2d2a2e"/>
    <ellipse cx="32" cy="37" rx="18" ry="16" fill="#fff" stroke="${AV_INK}" stroke-width="1.7"/>
    <ellipse cx="24.5" cy="35" rx="4.6" ry="5.6" transform="rotate(25 24.5 35)" fill="#2d2a2e"/><ellipse cx="39.5" cy="35" rx="4.6" ry="5.6" transform="rotate(-25 39.5 35)" fill="#2d2a2e"/>
    <circle cx="25" cy="34.5" r="1.6" fill="#fff"/><circle cx="39" cy="34.5" r="1.6" fill="#fff"/>
    <ellipse cx="32" cy="41.5" rx="2.6" ry="1.8" fill="#2d2a2e"/>
    <path d="M29 45 Q32 47.5 35 45" fill="none" stroke="${AV_INK}" stroke-width="1.3" stroke-linecap="round"/>
    <ellipse cx="20.5" cy="43" rx="2.6" ry="1.5" fill="#ffb3c4"/><ellipse cx="43.5" cy="43" rx="2.6" ry="1.5" fill="#ffb3c4"/>
    <path d="M47 10 Q53 12 50 19 Q46 15 47 10 Z" fill="#7cc488" stroke="${AV_INK}" stroke-width="1"/>` },
  chick: { name: '小雞', bg: '#e1f0ff', art: `
    <path d="M30 18 Q30 12 33 13 Q32 16 34 17 Q36 13 38 15 Q35 17 34 20" fill="#ffd45c" stroke="${AV_INK}" stroke-width="1.4" stroke-linejoin="round"/>
    <ellipse cx="32" cy="38" rx="18" ry="17" fill="#ffe27a" stroke="${AV_INK}" stroke-width="1.7"/>
    <path d="M14 42 Q8 38 10 34 Q14 37 16 37 M50 42 Q56 38 54 34 Q50 37 48 37" fill="#ffd45c" stroke="${AV_INK}" stroke-width="1.4" stroke-linejoin="round"/>
    <circle cx="25.5" cy="35" r="2.1" fill="${AV_INK}"/><circle cx="38.5" cy="35" r="2.1" fill="${AV_INK}"/>
    <circle cx="26.2" cy="34.2" r=".7" fill="#fff"/><circle cx="39.2" cy="34.2" r=".7" fill="#fff"/>
    <path d="M28.5 40 L35.5 40 L32 44.5 Z" fill="#f5a142" stroke="${AV_INK}" stroke-width="1.1" stroke-linejoin="round"/>
    <ellipse cx="21.5" cy="41" rx="2.8" ry="1.6" fill="#ffab8a"/><ellipse cx="42.5" cy="41" rx="2.8" ry="1.6" fill="#ffab8a"/>` },
  frog: { name: '青蛙', bg: '#fff3d1', art: `
    <circle cx="22" cy="24" r="7.5" fill="#8fd18a" stroke="${AV_INK}" stroke-width="1.7"/><circle cx="42" cy="24" r="7.5" fill="#8fd18a" stroke="${AV_INK}" stroke-width="1.7"/>
    <path d="M12 42 Q12 27 32 27 Q52 27 52 42 Q52 54 32 54 Q12 54 12 42 Z" fill="#8fd18a" stroke="${AV_INK}" stroke-width="1.7"/>
    <circle cx="22" cy="24" r="4.2" fill="#fff"/><circle cx="42" cy="24" r="4.2" fill="#fff"/>
    <circle cx="22.8" cy="24.5" r="2.2" fill="${AV_INK}"/><circle cx="42.8" cy="24.5" r="2.2" fill="${AV_INK}"/>
    <path d="M22 41 Q32 49 42 41" fill="none" stroke="${AV_INK}" stroke-width="1.6" stroke-linecap="round"/>
    <ellipse cx="18" cy="40" rx="3.2" ry="2" fill="#ff9fb4" opacity=".8"/><ellipse cx="46" cy="40" rx="3.2" ry="2" fill="#ff9fb4" opacity=".8"/>
    <circle cx="29" cy="33" r=".9" fill="${AV_INK}"/><circle cx="35" cy="33" r=".9" fill="${AV_INK}"/>` },
  koala: { name: '無尾熊', bg: '#dff1f0', art: `
    <circle cx="15" cy="27" r="9" fill="#a8acb8" stroke="${AV_INK}" stroke-width="1.7"/><circle cx="49" cy="27" r="9" fill="#a8acb8" stroke="${AV_INK}" stroke-width="1.7"/>
    <circle cx="15" cy="27" r="5" fill="#f2e6ee"/><circle cx="49" cy="27" r="5" fill="#f2e6ee"/>
    <ellipse cx="32" cy="38" rx="17" ry="15.5" fill="#bfc3cd" stroke="${AV_INK}" stroke-width="1.7"/>
    <circle cx="25" cy="35" r="2" fill="${AV_INK}"/><circle cx="39" cy="35" r="2" fill="${AV_INK}"/>
    <path d="M28 38 Q28 35 32 35 Q36 35 36 38 L36 42 Q36 46 32 46 Q28 46 28 42 Z" fill="#3b3640"/>
    <path d="M29.5 48.5 Q32 50.5 34.5 48.5" fill="none" stroke="${AV_INK}" stroke-width="1.3" stroke-linecap="round"/>
    <ellipse cx="21" cy="42" rx="2.6" ry="1.5" fill="#ffb3c4"/><ellipse cx="43" cy="42" rx="2.6" ry="1.5" fill="#ffb3c4"/>` },
};
// 我們的貓（和首頁路過的貓同一套）
const CAT_AV = [['mx_black', 'black', '小小黑', '#efe6f6'], ['mx_white', 'white', '陷阱貓', '#e2f1fb'], ['mx_orange', 'orange', '晽晽貓貓', '#fff0d9'], ['mx_calico', 'calico', '小魚乾', '#fde8ee'], ['mx_tuxedo', 'tuxedo', '吵吵貓', '#e6f3e4']];
CAT_AV.forEach(([id, coat, name, bg]) => { AVATARS[id] = { name, bg, cat: coat }; });
// 圖騰頭像（和卡片徽章同一套圖騰）
const EMB_AV = [
  ['em_rose', '玫瑰', 'F-valentine', () => festMotif('valentine', {})],
  ['em_anniv', '週年', 'F-anniv', () => festMotif('anniv', {})],
  ['em_xmas', '聖誕', 'F-xmas', () => festMotif('xmas', {})],
  ['em_newyear', '新年', 'F-newyear', () => festMotif('newyear', {})],
  ['em_candle', '燭光', 'C', () => bookMotif('candle')],
  ['em_stars', '星空', 'SSR', () => bookMotif('stars')],
  ['em_wish', '願望', 'W', () => bookMotif('wish')],
  ['em_compass', '羅盤', 'F-travel', () => bookMotif('compass')],
  ['em_suitcase', '旅行', 'R', () => travelMotif('suitcase')],
  ['em_camera', '相機', 'SR', () => travelMotif('camera')],
  ['em_mountain', '山', 'N', () => travelMotif('mountain')],
  ['em_globe', '地球', 'F-queen', () => travelMotif('globe')],
];
EMB_AV.forEach(([id, name, pal, motif]) => { AVATARS[id] = { name, emb: pal, motif }; });

function avatarSVG(id) {
  if (id === 'blackcat') id = 'mx_black'; // 舊的黑貓頭像併入小小黑
  const a = AVATARS[id]; if (!a) return '';
  if (a.cat) {
    const c = COATS[a.cat], tr = (COAT_TRAITS || {})[a.cat];
    return `<svg viewBox="0 0 64 64" class="av-svg" xmlns="http://www.w3.org/2000/svg"><circle cx="32" cy="32" r="31" fill="${a.bg}"/><g transform="translate(32 37) scale(1.12)">${coatHead(c)}${tr && tr.prop === 'tiara' ? COAT_PROPS.tiara : ''}</g><circle cx="32" cy="32" r="30.5" fill="none" stroke="rgba(74,46,42,.18)" stroke-width="1"/></svg>`;
  }
  if (a.emb) {
    let dots = '';
    for (let i = 0; i < 16; i++) { const t = i * 22.5 * Math.PI / 180; dots += `<circle cx="${(32 + Math.sin(t) * 27).toFixed(1)}" cy="${(32 - Math.cos(t) * 27).toFixed(1)}" r="${i % 4 ? .55 : 1}" class="e-ink-f"/>`; }
    let m = ''; try { m = a.motif(); } catch (e) {}
    return `<svg viewBox="0 0 64 64" class="av-svg emb-${a.emb}" xmlns="http://www.w3.org/2000/svg"><circle cx="32" cy="32" r="31" class="e-bg"/><circle cx="32" cy="32" r="30" class="e-ink-s" stroke-width="1.2"/><circle cx="32" cy="32" r="24" class="e-acc-s" stroke-width=".7"/>${dots}<g transform="translate(32 32) scale(.64)">${m}</g></svg>`;
  }
  return `<svg viewBox="0 0 64 64" class="av-svg" xmlns="http://www.w3.org/2000/svg"><circle cx="32" cy="32" r="31" fill="${a.bg}"/><g>${a.art}</g><circle cx="32" cy="32" r="30.5" fill="none" stroke="rgba(74,46,42,.18)" stroke-width="1"/></svg>`;
}


// 旅行基金：徽章風存錢筒（外圈是存錢進度）
function piggyEmblem(pct) {
  const r = 44, C = 2 * Math.PI * r, p = Math.max(0, Math.min(100, pct || 0));
  let dots = '';
  for (let i = 0; i < 24; i++) { const a = i * 15 * Math.PI / 180; dots += `<circle cx="${(60 + Math.sin(a) * 54).toFixed(1)}" cy="${(60 - Math.cos(a) * 54).toFixed(1)}" r="${i % 6 ? .9 : 1.8}" class="e-ink-f"/>`; }
  const S1 = (d, w = 1.5, cls = 'e-ink-s') => `<path d="${d}" class="${cls}" stroke-width="${w}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  return `<svg viewBox="0 0 120 120" class="piggy-emb emb-F-travel" xmlns="http://www.w3.org/2000/svg">
    ${dots}
    <circle cx="60" cy="60" r="50" class="e-bg e-ink-s" stroke-width="1.4"/>
    <circle cx="60" cy="60" r="${r}" class="e-acc-s" stroke-width="3" opacity=".35"/>
    <circle cx="60" cy="60" r="${r}" class="e-ink-s" stroke-width="3" stroke-linecap="round" stroke-dasharray="${(C * p / 100).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 60 60)"/>
    <circle cx="60" cy="60" r="38.5" class="e-acc-s" stroke-width=".8"/>
    <g transform="translate(60 64)">
      <g class="pig-coin"><circle cx="0" cy="-30" r="5" class="e-acc-f e-ink-s" stroke-width="1.2"/>${S1('M0 -33 V-27', 1)}</g>
      <ellipse cx="0" cy="22" rx="18" ry="2.6" class="e-acc-f" opacity=".5"/>
      ${S1('M-13 12 V19 M-6 14 V20 M7 14 V20 M14 12 V19', 2.2)}
      <path d="M-24 2 C-24 -12 -12 -18 0 -18 C13 -18 22 -12 23 -3 L27 -3 C29 -3 29 6 27 6 L23 6 C21 12 14 16 0 16 C-14 16 -24 12 -24 2 Z" class="e-bg e-ink-s" stroke-width="1.6"/>
      <path d="M8 -16 L12 -25 L16 -14" class="e-acc-f e-ink-s" stroke-width="1.3" stroke-linejoin="round"/>
      ${S1('M-6 -18.5 H6', 2.4)}
      <circle cx="13" cy="-5" r="1.5" class="e-ink-f"/>
      ${S1('M25 -0.5 V2.5', 1)}
      ${S1('M-24 0 C-29 0 -31 -4 -28 -6 C-26 -7 -26 -3 -29 -2', 1.2)}
      ${S1('M-16 -8 Q-10 -13 -2 -13', 1.2, 'e-acc-s')}
      <path d="M-6 4 L-3.5 6.5 L-1 4 L1.5 6.5 L4 4" class="e-acc-s" stroke-width="1" fill="none"/>
    </g>
  </svg>`;
}
// ============================================================
//  黑貓吉祥物（和 App 圖示同一隻）：多種動作，扁平畫風
// ============================================================
const CAT_INK = '#2b2633';
const CW = '#efe6f2';          // 鬍鬚、嘴巴
const CP = '#ff9fb4';          // 鼻子、腮紅
const CE = '#c98aa0';          // 耳朵內側

// 貓頭：以 (0,0) 為臉中心，寬約 36
function catHead(eyes = 'open') {
  const e = {
    open: `<ellipse cx="-7" cy="-1.5" rx="3.6" ry="4.2" fill="#ffd970"/><ellipse cx="7" cy="-1.5" rx="3.6" ry="4.2" fill="#ffd970"/>
           <ellipse cx="-7" cy="-1" rx="1.2" ry="3" fill="${CAT_INK}"/><ellipse cx="7" cy="-1" rx="1.2" ry="3" fill="${CAT_INK}"/>
           <circle cx="-6" cy="-3" r=".9" fill="#fff"/><circle cx="8" cy="-3" r=".9" fill="#fff"/>`,
    closed: `<path d="M-10 0 Q-7 3 -4 0 M4 0 Q7 3 10 0" fill="none" stroke="${CW}" stroke-width="1.6" stroke-linecap="round"/>`,
    happy: `<path d="M-10.5 -1 Q-7 -5 -3.5 -1 M3.5 -1 Q7 -5 10.5 -1" fill="none" stroke="#ffd970" stroke-width="2.2" stroke-linecap="round"/>`,
    wide: `<circle cx="-7" cy="-1.5" r="4.4" fill="#ffd970"/><circle cx="7" cy="-1.5" r="4.4" fill="#ffd970"/>
           <circle cx="-7" cy="-1" r="2.6" fill="${CAT_INK}"/><circle cx="7" cy="-1" r="2.6" fill="${CAT_INK}"/>
           <circle cx="-6" cy="-2.6" r="1" fill="#fff"/><circle cx="8" cy="-2.6" r="1" fill="#fff"/>`,
  }[eyes];
  return `<path d="M-17 -5 L-15 -22 L-5 -12 Z M17 -5 L15 -22 L5 -12 Z" fill="${CAT_INK}" stroke="${CAT_INK}" stroke-width="2" stroke-linejoin="round"/>
    <path d="M-13.5 -11 L-13 -18.5 L-8 -13.5 Z M13.5 -11 L13 -18.5 L8 -13.5 Z" fill="${CE}"/>
    <ellipse cx="0" cy="0" rx="18" ry="15" fill="${CAT_INK}"/>
    ${e}
    <path d="M-1.5 4.5 L1.5 4.5 L0 6 Z" fill="${CP}"/>
    <path d="M0 6 Q-2 8.5 -3.5 7.5 M0 6 Q2 8.5 3.5 7.5" fill="none" stroke="${CW}" stroke-width="1" stroke-linecap="round"/>
    <path d="M-19 2 L-11 3 M-19 6 L-11 5 M19 2 L11 3 M19 6 L11 5" stroke="${CW}" stroke-width=".8" stroke-linecap="round"/>
    <ellipse cx="-10.5" cy="6" rx="2.4" ry="1.3" fill="${CP}" opacity=".55"/><ellipse cx="10.5" cy="6" rx="2.4" ry="1.3" fill="${CP}" opacity=".55"/>`;
}
// 正在畫的姿勢要戴的配件（只放頭上、脖子上的；披風和小包只有坐著時才看得到）
let CAT_WEAR = '';
const CAT_BODY_ACC = ['cape', 'heartbag'];
const head = (x, y, s = 1, eyes, rot = 0) => `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})">${catHead(eyes)}${CAT_WEAR && !CAT_BODY_ACC.includes(CAT_WEAR) && typeof petAccArt === 'function' ? `<g transform="translate(-50 -34)">${petAccArt(CAT_WEAR)}</g>` : ''}</g>`;
const shadow = (cx, w) => `<ellipse cx="${cx}" cy="88" rx="${w}" ry="3.5" fill="currentColor" opacity=".09"/>`;

const CAT_POSES = {
  // 坐著
  sit: () => `${shadow(50, 26)}
    <path class="cat-tail" d="M66 80 Q86 80 84 64 Q83 56 76 58" fill="none" stroke="${CAT_INK}" stroke-width="5" stroke-linecap="round"/>
    <path d="M34 86 Q29 62 39 50 Q50 43 61 50 Q71 62 66 86 Z" fill="${CAT_INK}"/>
    <ellipse cx="42" cy="86" rx="6" ry="3" fill="${CAT_INK}"/><ellipse cx="58" cy="86" rx="6" ry="3" fill="${CAT_INK}"/>
    <path d="M44 64 Q50 68 56 64" fill="none" stroke="${CE}" stroke-width="1.2" stroke-linecap="round" opacity=".7"/>
    ${head(50, 37)}`,
  // 舉手打招呼
  wave: () => `${shadow(50, 26)}
    <path class="cat-tail" d="M66 80 Q86 80 84 64 Q83 56 76 58" fill="none" stroke="${CAT_INK}" stroke-width="5" stroke-linecap="round"/>
    <path d="M34 86 Q29 62 39 50 Q50 43 61 50 Q71 62 66 86 Z" fill="${CAT_INK}"/>
    <ellipse cx="42" cy="86" rx="6" ry="3" fill="${CAT_INK}"/>
    <g class="cat-wave"><path d="M59 61 Q66 56 67 50" fill="none" stroke="${CAT_INK}" stroke-width="9" stroke-linecap="round"/><circle cx="67" cy="49" r="5" fill="${CAT_INK}"/><circle cx="67" cy="49" r="1.6" fill="${CP}" opacity=".8"/></g>
    ${head(49, 37, 1, 'happy')}`,
  // 縮成一團睡覺
  sleep: () => `${shadow(52, 34)}
    <path d="M20 82 Q18 64 40 62 Q66 60 78 72 Q86 80 80 88 L24 88 Q18 86 20 82 Z" fill="${CAT_INK}"/>
    <path class="cat-tail-s" d="M78 86 Q92 86 90 76 Q88 70 82 74" fill="none" stroke="${CAT_INK}" stroke-width="5" stroke-linecap="round"/>
    ${head(35, 72, .9, 'closed', -8)}
    <text x="70" y="52" font-size="11" font-weight="800" fill="currentColor" opacity=".5" font-family="sans-serif" class="cat-z">z</text>
    <text x="78" y="42" font-size="8" font-weight="800" fill="currentColor" opacity=".35" font-family="sans-serif" class="cat-z z2">z</text>`,
  // 伸懶腰（屁股翹高）
  stretch: () => `${shadow(52, 34)}
    <path class="cat-tail" d="M76 58 Q82 40 92 38" fill="none" stroke="${CAT_INK}" stroke-width="5" stroke-linecap="round"/>
    <path d="M24 80 Q24 68 40 66 Q56 62 66 54 Q82 48 83 64 L82 86 L71 86 L70 79 Q58 86 42 87 L24 87 Q20 85 24 80 Z" fill="${CAT_INK}"/>
    <path d="M18 86 L34 86" stroke="${CAT_INK}" stroke-width="8.5" stroke-linecap="round"/>
    ${head(30, 68, .88, 'closed', 6)}
    <path d="M44 56 l3 -3 M50 54 l3 -3.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" opacity=".35"/>`,
  // 玩毛線球
  yarn: () => `${shadow(50, 34)}
    <path class="cat-tail" d="M74 80 Q90 76 88 60" fill="none" stroke="${CAT_INK}" stroke-width="5" stroke-linecap="round"/>
    <path d="M30 86 Q26 70 42 66 Q64 62 76 74 Q80 82 74 87 L32 88 Z" fill="${CAT_INK}"/>
    <g class="cat-bat"><path d="M34 76 Q29 73 26 76" fill="none" stroke="${CAT_INK}" stroke-width="8.5" stroke-linecap="round"/></g>
    ${head(40, 56, .9, 'wide', -10)}
    <g transform="translate(5 0)"><g class="cat-yarn"><circle cx="13" cy="80" r="8" fill="#ff8fab"/>
      <path d="M6 77 Q13 74 20 79 M7 83 Q13 80 19 85 M10 73 Q15 80 12 88" fill="none" stroke="#c94f72" stroke-width="1" stroke-linecap="round"/>
      <path d="M21 82 Q30 90 42 88" fill="none" stroke="#ff8fab" stroke-width="1" stroke-linecap="round"/></g></g>`,
  // 從紙箱探頭
  box: () => `${shadow(50, 30)}
    ${head(50, 52, .95, 'wide')}
    <circle cx="40" cy="64" r="4" fill="${CAT_INK}"/><circle cx="60" cy="64" r="4" fill="${CAT_INK}"/>
    <path d="M22 64 L78 64 L74 88 L26 88 Z" fill="#d9a56c"/>
    <path d="M22 64 L12 56 L30 56 L38 64 Z M78 64 L88 56 L70 56 L62 64 Z" fill="#e8bb85"/>
    <path d="M22 64 L78 64" stroke="#b9854f" stroke-width="1.2"/>
    <path d="M44 72 L56 72" stroke="#b9854f" stroke-width="1.4" stroke-linecap="round" opacity=".7"/>`,
  // 趴著（貓麵包）看你
  loaf: () => `${shadow(50, 30)}
    <path class="cat-tail" d="M74 84 Q86 86 86 78" fill="none" stroke="${CAT_INK}" stroke-width="5" stroke-linecap="round"/>
    <path d="M24 86 Q22 66 50 64 Q78 66 76 86 Z" fill="${CAT_INK}"/>
    <ellipse cx="40" cy="87" rx="6" ry="2.6" fill="${CAT_INK}"/><ellipse cx="54" cy="87" rx="6" ry="2.6" fill="${CAT_INK}"/>
    ${head(50, 56)}`,
  // 翻肚（摸摸時）
  belly: () => `${shadow(50, 32)}
    <path class="cat-tail" d="M76 80 Q90 82 90 70" fill="none" stroke="${CAT_INK}" stroke-width="5" stroke-linecap="round"/>
    <ellipse cx="54" cy="76" rx="24" ry="12" fill="${CAT_INK}"/>
    <ellipse cx="56" cy="74" rx="12" ry="6" fill="#3d3646"/>
    <path d="M46 66 L45 60 M55 65 L55 58.5 M64 67 L66.5 61 M70 71 L74.5 66.5" fill="none" stroke="${CAT_INK}" stroke-width="8.5" stroke-linecap="round"/>
    <circle cx="45" cy="59.5" r="1.7" fill="${CP}" opacity=".7"/><circle cx="55" cy="58" r="1.7" fill="${CP}" opacity=".7"/>
    ${head(27, 70, .9, 'happy', -22)}`,
  // 跳起來（開心）
  jump: () => `<ellipse cx="50" cy="88" rx="18" ry="3" fill="currentColor" opacity=".07"/>
    <path class="cat-tail" d="M64 58 Q80 50 82 36" fill="none" stroke="${CAT_INK}" stroke-width="5" stroke-linecap="round"/>
    <path d="M36 66 Q33 48 41 41 Q50 36 59 41 Q67 48 64 66 Q56 70 50 70 Q42 70 36 66 Z" fill="${CAT_INK}"/>
    <path d="M41 66 L38.5 72 M59 66 L61.5 72 M40 48 L34 42.5 M60 48 L66 42.5" stroke="${CAT_INK}" stroke-width="8.5" stroke-linecap="round"/>
    ${head(50, 28, 1, 'happy')}
    <path d="M20 22 l1.5 4 4 1.5 -4 1.5 -1.5 4 -1.5 -4 -4 -1.5 4 -1.5 Z M82 16 l1 3 3 1 -3 1 -1 3 -1 -3 -3 -1 3 -1 Z" fill="#ffd970"/>`,
  // 撐傘（下雨）
  umbrella: () => `${shadow(50, 26)}
    <path class="cat-tail" d="M66 80 Q86 80 84 64 Q83 56 76 58" fill="none" stroke="${CAT_INK}" stroke-width="5" stroke-linecap="round"/>
    <path d="M34 86 Q29 62 39 50 Q50 43 61 50 Q71 62 66 86 Z" fill="${CAT_INK}"/>
    <ellipse cx="42" cy="86" rx="6" ry="3" fill="${CAT_INK}"/><ellipse cx="58" cy="86" rx="6" ry="3" fill="${CAT_INK}"/>
    ${head(48, 37, 1, 'open')}
    <path d="M70 18 L70 62 Q70 67 65.5 67 Q62 67 62 63.5" fill="none" stroke="#b8862f" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M60 63 Q67 61 70 56" stroke="${CAT_INK}" stroke-width="8.5" stroke-linecap="round" fill="none"/>
    <g transform="translate(0 4)"><g class="cat-umb">
      <path d="M42 16 Q44 2 70 1 Q96 2 98 16 Q91 12.5 84 16 Q77 12.5 70 16 Q63 12.5 56 16 Q49 12.5 42 16 Z" fill="#e9a3b6"/>
      <path d="M56 16 Q58 4 70 1 Q63 6 63 15 Z M84 16 Q82 4 70 1 Q77 6 77 15 Z" fill="#d97f9a" opacity=".75"/>
      <path d="M42 16 Q49 12.5 56 16 Q63 12.5 70 16 Q77 12.5 84 16 Q91 12.5 98 16" fill="none" stroke="#c46a86" stroke-width=".9"/>
      <path d="M70 1 V16" stroke="#c46a86" stroke-width=".7" opacity=".7"/>
      <circle cx="70" cy="0.5" r="1.6" fill="#e9c77b"/>
      <circle cx="49" cy="14.5" r=".9" fill="#e9c77b"/><circle cx="63" cy="14.5" r=".9" fill="#e9c77b"/><circle cx="77" cy="14.5" r=".9" fill="#e9c77b"/><circle cx="91" cy="14.5" r=".9" fill="#e9c77b"/>
    </g></g>
    <path d="M26 30 l-1.5 4 M90 32 l-1.5 4 M20 50 l-1.5 4 M94 50 l-1.5 4 M30 64 l-1.5 4" stroke="#9fb7d9" stroke-width="1.2" stroke-linecap="round" class="cat-rain" opacity=".8"/>`,
  // 拉行李箱
  suitcase: () => `${shadow(50, 34)}
    <path class="cat-tail" d="M56 80 Q74 80 72 64" fill="none" stroke="${CAT_INK}" stroke-width="5" stroke-linecap="round"/>
    <path d="M24 86 Q19 62 29 50 Q40 43 51 50 Q61 62 56 86 Z" fill="${CAT_INK}"/>
    <ellipse cx="32" cy="86" rx="6" ry="3" fill="${CAT_INK}"/><ellipse cx="48" cy="86" rx="6" ry="3" fill="${CAT_INK}"/>
    <rect x="59" y="58" width="26" height="28" rx="4" fill="#ff8fab"/><rect x="59" y="58" width="26" height="28" rx="4" fill="none" stroke="#c94f72" stroke-width="1"/>
    <path d="M66 58 V86 M78 58 V86" stroke="#c94f72" stroke-width="1" opacity=".6"/>
    <path d="M65 58 V50 H75 V58" fill="none" stroke="#7a5a3a" stroke-width="1.8"/>
    <path d="M52 60 Q57 55 64 51" fill="none" stroke="${CAT_INK}" stroke-width="8.5" stroke-linecap="round"/>
    <circle cx="63" cy="88" r="2" fill="#555"/><circle cx="81" cy="88" r="2" fill="#555"/>
    <path d="M67 68 l4 -3 4 3 M70 72 h2" stroke="#fff" stroke-width="1" fill="none" opacity=".8"/>
    ${head(40, 37, 1, 'happy')}`,
  // 走路（側面）
  walk: () => `${shadow(52, 28)}
    <g transform="translate(0 5)">
      <path class="cat-tail" d="M76 62 Q88 50 86 36" fill="none" stroke="${CAT_INK}" stroke-width="5" stroke-linecap="round"/>
      <path d="M26 62 Q24 52 34 50 Q42 52 46 56 L70 56 Q80 58 78 70 Q76 76 70 76 L36 76 Q28 76 28 70 Z" fill="${CAT_INK}"/>
    </g>
    <g class="cat-legs-a"><path d="M38 79 L37.5 85 M68 79 L68.5 85" stroke="${CAT_INK}" stroke-width="8.5" stroke-linecap="round"/></g>
    <g class="cat-legs-b"><path d="M46 79 L47 85 M60 79 L59 85" stroke="${CAT_INK}" stroke-width="8.5" stroke-linecap="round"/></g>
    ${head(30, 52, .9, 'open')}`,
};
const CAT_EMPTY_POSES = ['sleep', 'stretch', 'yarn', 'box', 'loaf'];

function catPose(pose = 'sit', wear = '') {
  CAT_WEAR = wear || '';
  const out = `<svg viewBox="0 0 100 92" class="cat-svg cat-${pose}" xmlns="http://www.w3.org/2000/svg">${(CAT_POSES[pose] || CAT_POSES.sit)()}</svg>`;
  CAT_WEAR = '';
  return out;
}
// 舊的介面：catSVG('sit', 泡泡內容) / catSVG('sleep')
function catSVG(pose = 'sit', extra = '') {
  return catPose(pose) + (extra ? `<span class="cat-bubble">${extra}</span>` : '');
}
const pick1 = (a) => a[Math.floor(Math.random() * a.length)];

// 空白頁自動放上黑貓（姿勢隨機）：有圖示的打招呼或坐著拿泡泡；沒有圖示的隨機睡覺、伸懶腰、玩毛線、紙箱、趴著
function catifyEmpty(root) {
  root.querySelectorAll('.empty:not([data-cat])').forEach((el) => {
    el.dataset.cat = '1';
    const big = el.querySelector('.big');
    const wrap = document.createElement('div');
    wrap.className = 'cat-wrap';
    const travel = /pin|coin|map|plane/.test(big ? big.innerHTML : '') || el.closest('[data-page="travel"]');
    if (big) { wrap.innerHTML = catSVG(travel && Math.random() < .6 ? 'suitcase' : pick1(['sit', 'wave', 'loaf']), big.innerHTML); big.remove(); }
    else wrap.innerHTML = catSVG(pick1(CAT_EMPTY_POSES));
    el.prepend(wrap);
  });
}


// ============================================================
//  路過的小貓：不同毛色（純白、橘白胖貓、三花、賓士）
// ============================================================
const COATS = {
  black: { name: '小小黑', base: CAT_INK, line: CAT_INK, eye: '#ffd970', ear: CE, whisker: CW },
  white: { name: '陷阱貓', base: '#f7f4ef', line: '#cfc6bd', eye: '#8fd0f0', ear: '#f4b6c4', whisker: '#c9bfb6' },
  orange: { name: '晽晽貓貓', base: '#f2a65a', line: '#c97a35', eye: '#9ccc65', ear: '#f4b6a4', whisker: '#fff', fat: true,
    patches: (id) => `<g clip-path="url(#${id})"><ellipse cx="52" cy="80" rx="16" ry="8" fill="#fffaf2"/></g>`,
    face: `<ellipse cx="0" cy="6" rx="8.5" ry="6" fill="#fffaf2"/><path d="M-6 -13 Q-3 -9 0 -13 Q3 -9 6 -13 M-8 -9 Q-4 -5 0 -9 Q4 -5 8 -9" fill="none" stroke="#d98a3e" stroke-width="1.4" stroke-linecap="round"/>` },
  calico: { name: '小魚乾', base: '#fbf7f1', line: '#d6c9bc', eye: '#e8b23a', ear: '#f4b6c4', whisker: '#c9bfb6',
    patches: (id) => `<g clip-path="url(#${id})"><ellipse cx="40" cy="60" rx="10" ry="8" fill="#e9984d"/><ellipse cx="66" cy="62" rx="9" ry="7" fill="#3a3238"/><ellipse cx="60" cy="58" rx="5" ry="4" fill="#e9984d"/></g>`,
    face: `<path d="M-18 -4 Q-16 -18 -4 -14 Q-6 -4 -14 2 Z" fill="#e9984d"/><path d="M18 -4 Q16 -18 5 -14 Q6 -5 14 1 Z" fill="#3a3238"/>`, earL: '#e9984d', earR: '#3a3238' },
  tuxedo: { name: '吵吵貓', base: CAT_INK, line: CAT_INK, eye: '#a5d86b', ear: CE, whisker: CW,
    patches: (id) => `<g clip-path="url(#${id})"><path d="M28 64 Q34 72 46 74 L48 80 L28 80 Z" fill="#fbf7f1"/></g>`,
    face: `<path d="M0 -2 Q-6 2 -9 10 Q0 15 9 10 Q6 2 0 -2 Z" fill="#fbf7f1"/>`, socks: '#fbf7f1', mouth: '#8a6e66' },
};
function coatHead(c) {
  const eL = c.earL || c.base, eR = c.earR || c.base;
  return `<path d="M-17 -5 L-15 -22 L-5 -12 Z" fill="${eL}" stroke="${c.line}" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="M17 -5 L15 -22 L5 -12 Z" fill="${eR}" stroke="${c.line}" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="M-13.5 -11 L-13 -18.5 L-8 -13.5 Z M13.5 -11 L13 -18.5 L8 -13.5 Z" fill="${c.ear}"/>
    <ellipse cx="0" cy="0" rx="${c.fat ? 19.5 : 18}" ry="15" fill="${c.base}" stroke="${c.line}" stroke-width="${c.line === c.base ? 0 : 1.2}"/>
    ${c.face || ''}
    <ellipse cx="-7" cy="-1.5" rx="3.6" ry="4.2" fill="${c.eye}"/><ellipse cx="7" cy="-1.5" rx="3.6" ry="4.2" fill="${c.eye}"/>
    <ellipse cx="-7" cy="-1" rx="1.2" ry="3" fill="#2b2633"/><ellipse cx="7" cy="-1" rx="1.2" ry="3" fill="#2b2633"/>
    <circle cx="-6" cy="-3" r=".9" fill="#fff"/><circle cx="8" cy="-3" r=".9" fill="#fff"/>
    <path d="M-1.5 4.5 L1.5 4.5 L0 6 Z" fill="${CP}"/>
    <path d="M0 6 Q-2 8.5 -3.5 7.5 M0 6 Q2 8.5 3.5 7.5" fill="none" stroke="${c.mouth || (c.base === CAT_INK ? CW : '#8a6e66')}" stroke-width="1.1" stroke-linecap="round"/>
    <path d="M-19 2 L-11 3 M-19 6 L-11 5 M19 2 L11 3 M19 6 L11 5" stroke="${c.whisker}" stroke-width=".8" stroke-linecap="round"/>
    <ellipse cx="-10.5" cy="6" rx="2.4" ry="1.3" fill="${CP}" opacity=".55"/><ellipse cx="10.5" cy="6" rx="2.4" ry="1.3" fill="${CP}" opacity=".55"/>`;
}
const COAT_PROPS = {
  drumstick: `<g transform="translate(-10 11) rotate(-20)"><ellipse cx="-6" cy="0" rx="7" ry="5" fill="#c9773a"/><ellipse cx="-7" cy="-1.5" rx="4" ry="2" fill="#e09a5a" opacity=".7"/><path d="M0 0 L7 0" stroke="#f6efe6" stroke-width="2.6" stroke-linecap="round"/><circle cx="8" cy="-1.3" r="1.6" fill="#f6efe6"/><circle cx="8" cy="1.3" r="1.6" fill="#f6efe6"/></g>`,
  flower: `<g transform="translate(-6 9)"><path d="M0 0 Q-6 -4 -12 -12" fill="none" stroke="#5fa86b" stroke-width="1.4" stroke-linecap="round"/><path d="M-6 -5 Q-10 -3 -10 -7 Q-7 -8 -6 -5 Z" fill="#7cc488"/><g transform="translate(-13 -14)">${[0, 72, 144, 216, 288].map((a) => `<ellipse rx="2.6" ry="4" transform="rotate(${a}) translate(0 -3.6)" fill="#ffd1dc" stroke="#e98aa5" stroke-width=".5"/>`).join('')}<circle r="2.3" fill="#ffd45c"/></g></g>`,
  fish: `<g transform="translate(-12 10) rotate(-8)"><path d="M-8 0 Q-2 -4.5 5 0 Q-2 4.5 -8 0 Z" fill="#c9a26a" stroke="#9a7440" stroke-width=".6"/><path d="M5 0 L9 -3.5 L9 3.5 Z" fill="#c9a26a" stroke="#9a7440" stroke-width=".6"/><circle cx="-5" cy="-.6" r=".8" fill="#4a3a2a"/><path d="M-2 -2 L-1 2 M1 -2 L2 2" stroke="#9a7440" stroke-width=".5"/></g>`,
  tiara: `<g transform="translate(0 -15)"><path d="M-8 2 L-6.5 -4 L-3 -.5 L0 -6 L3 -.5 L6.5 -4 L8 2 Z" fill="#ffd45c" stroke="#c9952e" stroke-width=".7" stroke-linejoin="round"/><circle cx="0" cy="-1" r="1.2" fill="#ff8fab"/><circle cx="-5" cy=".2" r=".7" fill="#9fd3ff"/><circle cx="5" cy=".2" r=".7" fill="#9fd3ff"/></g>`,
};
// 每隻貓的個性：道具、點牠會說的話
const COAT_TRAITS = {
  orange: { prop: 'drumstick', lines: ['晽晽貓貓叼著雞腿跑過去，完全不想分你', '晽晽貓貓：嗝～（剛吃飽又在找下一餐）', '晽晽貓貓聞到你身上的零食味，賴著不走了', '晽晽貓貓把你的宵夜當成牠的宵夜', '晽晽貓貓肚子圓滾滾，跳不起來，只好滾過去', '晽晽貓貓聽到罐罐的聲音，三秒就出現了', '晽晽貓貓：這個也可以吃嗎？'] },
  tuxedo: { prop: 'flower', lines: ['吵吵貓送你一朵花，然後大叫三聲就跑了', '吵吵貓送你一朵花……是從隔壁盆栽偷摘的', '吵吵貓想送你花，結果被自己的尾巴絆倒', '吵吵貓把花放下，倒退著走掉了', '吵吵貓：喵！喵喵！喵！（翻譯：這朵給你）', '吵吵貓送完花，對著空氣跳了一段舞', '吵吵貓今天沒有花，送你一片葉子', '吵吵貓唱了一首歌，只有「喵」一個字'] },
  white: { prop: 'tiara', lines: ['陷阱貓：哼，陷阱貓准許你看一眼', '陷阱貓翻肚子給你看……你一摸，牠就生氣炸毛了', '陷阱貓優雅地走過去，連頭都沒回', '陷阱貓：今天的罐罐準備好了嗎？', '陷阱貓假裝要讓你摸，又跳開了，這就是陷阱', '陷阱貓坐在你的手機上：看我就好', '陷阱貓：陷阱貓今天心情好，准你摸一下……一下就好'] },
  calico: { prop: 'fish', lines: ['小魚乾叼著小魚乾蹭了蹭你', '小魚乾：再給一條小魚乾，我就讓你抱', '小魚乾在你腳邊滾了兩圈撒嬌', '小魚乾把小魚乾分你一半……又叼回去了', '小魚乾喵～的一聲，要你摸摸頭', '小魚乾把頭塞進你的手心，賴著不走', '小魚乾看到還好，馬上躲到你後面'] },
};
let coatSeq = 0;
function coatWalk(key) {
  const c = COATS[key] || COATS.black, id = 'cw' + (++coatSeq);
  const body = c.fat ? 'M24 62 Q24 50 40 50 Q44 52 48 54 L70 54 Q84 56 82 70 Q80 79 70 79 L34 79 Q24 79 24 70 Z' : 'M26 62 Q24 52 34 50 Q42 52 46 56 L70 56 Q80 58 78 70 Q76 76 70 76 L36 76 Q28 76 28 70 Z';
  const ly = c.fat ? 82 : 79, sw = c.line === c.base ? 0 : 1.2;
  const leg = (x1, x2) => `<path d="M${x1} ${ly} L${x2} 85" stroke="${c.line}" stroke-width="${8.5 + sw * 2}" stroke-linecap="round"/><path d="M${x1} ${ly} L${x2} 85" stroke="${c.base}" stroke-width="8.5" stroke-linecap="round"/>${c.socks ? `<circle cx="${x2}" cy="85" r="4.2" fill="${c.socks}"/>` : ''}`;
  return `<svg viewBox="0 0 100 92" class="cat-svg cat-walk coat-${key}" xmlns="http://www.w3.org/2000/svg">
    <defs><clipPath id="${id}"><path d="${body}" transform="translate(0 5)"/></clipPath></defs>
    ${shadow(52, c.fat ? 32 : 28)}
    <g class="cat-legs-a">${leg(38, 37.5)}${leg(68, 68.5)}</g>
    <g class="cat-legs-b">${leg(46, 47)}${leg(60, 59)}</g>
    <g transform="translate(0 5)">
      <path class="cat-tail" d="M76 62 Q88 50 86 36" fill="none" stroke="${c.line}" stroke-width="${5 + sw * 2}" stroke-linecap="round"/>
      <path class="cat-tail" d="M76 62 Q88 50 86 36" fill="none" stroke="${key === 'calico' ? '#e9984d' : c.base}" stroke-width="5" stroke-linecap="round"/>
      <path d="${body}" fill="${c.base}" stroke="${c.line}" stroke-width="${sw}"/>
    </g>
    ${c.patches ? c.patches(id) : ''}
    <g transform="translate(30 ${c.fat ? 50 : 52}) scale(.9)">${coatHead(c)}${COAT_TRAITS[key] ? COAT_PROPS[COAT_TRAITS[key].prop] : ''}</g>
  </svg>`;
}

// ============================================================
//  家裡的小動物：會路過首頁，點到會說話，說過的話收進圖鑑
// ============================================================

// ---------- 狗狗一家（同一套畫法：還好、狗狗、阿扁） ----------
const DOGS = {
  haohao: { base: '#e2b56a', line: '#b98a3e', ear: '#c99448', muzzle: '#f3d9a8', belly: '#f3d9a8', dark: '#2b2226', ears: 'flop', eyes: 'open', mouth: 'open' },
  doggy: { base: '#efd9ac', line: '#c7a66a', ear: '#e0bf85', muzzle: '#fbf0d8', belly: '#fbf0d8', dark: '#2b2226', ears: 'flop', eyes: 'sleepy', mouth: 'smile', curls: true },
  abian: { base: '#d9bd8c', line: '#a98a58', ear: '#f0e2c4', muzzle: '#ecdcbc', belly: '#ecdcbc', dark: '#2b2226', ears: 'flop', eyes: 'up', mouth: 'small', bigNose: true, pads: true, vest: true },
};
const PUPS2 = {
  doggy: { base: '#f0d9a6', line: '#c9a868', ear: '#e3c185', muzzle: '#f9ecd0', dark: '#2b2226', eyes: 'sleepy' },
  abian: { base: '#dcc093', line: '#ad8e5a', ear: '#cdae7c', muzzle: '#efe0c2', dark: '#2b2226', eyes: 'dot', vest: true },
};
function pupArt(key) {
  const c = PUPS2[key];
  const leg = (x1, x2) => `<path d="M${x1} 78 L${x2} 85" stroke="${c.line}" stroke-width="10.4" stroke-linecap="round"/><path d="M${x1} 78 L${x2} 85" stroke="${c.base}" stroke-width="8.4" stroke-linecap="round"/><ellipse cx="${x2}" cy="86.3" rx="3.6" ry="1.9" fill="${c.dark}"/>`;
  const eyes = c.eyes === 'sleepy'
    ? `<path d="M-8.5 -3 Q-6 -1 -3.5 -3 M3.5 -3 Q6 -1 8.5 -3" fill="none" stroke="${c.dark}" stroke-width="1.5" stroke-linecap="round"/>`
    : `<circle cx="-6" cy="-3.5" r="2.1" fill="${c.dark}"/><circle cx="6" cy="-3.5" r="2.1" fill="${c.dark}"/><circle cx="-5.4" cy="-4.2" r=".7" fill="#fff"/><circle cx="6.6" cy="-4.2" r=".7" fill="#fff"/>`;
  return `<svg viewBox="0 0 100 92" class="cat-svg pup-walk pup-${key}" xmlns="http://www.w3.org/2000/svg">
    ${shadow(54, 26)}
    <g class="dog-tail"><path d="M76 62 Q88 56 88 44 Q88 40 85 42 Q83 52 74 56 Z" fill="${c.base}" stroke="${c.line}" stroke-width="1" stroke-linejoin="round"/></g>
    <g class="cat-legs-a">${leg(40, 39.5)}${leg(70, 70.5)}</g>
    <g class="cat-legs-b">${leg(48, 49)}${leg(62, 61)}</g>
    <path d="M28 66 Q28 55 42 54 L70 55 Q80 56 79 67 Q78 79 68 79 L38 79 Q28 79 28 71 Z" fill="${c.base}" stroke="${c.line}" stroke-width="1"/>
    ${c.vest ? `<path d="M30 60 Q32 54 42 54 L54 54.5 Q60 66 56 79 L38 79 Q29 79 28.5 71 Z" fill="#f8f4ec" stroke="#d6ccbb" stroke-width=".9"/>
      <path d="M38 79 L56 79" stroke="#2f4a6e" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M39 76.2 l2.5 2.2 2.5 -2.2 2.5 2.2 2.5 -2.2 2.5 2.2 2.5 -2.2 2.5 2.2" fill="none" stroke="#2f4a6e" stroke-width="1.1" stroke-linejoin="round"/>
` : ''}
    <g class="dog-head" transform="translate(30 50)">
      <path d="M-15 -2 Q-16 -18 0 -18.5 Q16 -18 15 -2 Q15 12 0 13 Q-15 12 -15 -2 Z" fill="${c.base}" stroke="${c.line}" stroke-width="1"/>
      <path d="M-11 -14 Q-21 -13 -20 2 Q-19.5 11 -13 10 Q-11 2 -9.5 -8 Z" fill="${c.ear}" stroke="${c.line}" stroke-width="1" stroke-linejoin="round"/>
      <path d="M11 -14 Q21 -13 20 2 Q19.5 11 13 10 Q11 2 9.5 -8 Z" fill="${c.ear}" stroke="${c.line}" stroke-width="1" stroke-linejoin="round"/>
      <ellipse cx="0" cy="5" rx="7.5" ry="5.8" fill="${c.muzzle}"/>
      ${eyes}
      <ellipse cx="0" cy="2.6" rx="3.8" ry="2.9" fill="${c.dark}"/><ellipse cx="-1" cy="1.6" rx="1.2" ry=".7" fill="#fff" opacity=".45"/>
      <path d="M0 5.5 L0 7 M-2.8 7.6 Q0 9.6 2.8 7.6" fill="none" stroke="${c.dark}" stroke-width="1" stroke-linecap="round"/>
      <ellipse cx="-9.5" cy="5" rx="2.2" ry="1.2" fill="#ff9fb4" opacity=".55"/><ellipse cx="9.5" cy="5" rx="2.2" ry="1.2" fill="#ff9fb4" opacity=".55"/>
    </g>
  </svg>`;
}
function dogArt(key, { off = false } = {}) {
  const c = DOGS[key], sw = 1.2, ly = 80;
  const leg = (x1, x2) => `<path d="M${x1} ${ly} L${x2} 87" stroke="${c.line}" stroke-width="${11 + sw * 2}" stroke-linecap="round"/><path d="M${x1} ${ly} L${x2} 87" stroke="${c.base}" stroke-width="11" stroke-linecap="round"/>${key !== 'doggy' ? `<ellipse cx="${x2}" cy="88" rx="5" ry="2.6" fill="${c.dark}"/>` : ''}`;
  const ears = c.ears === 'wide'
    ? `<path d="M-12 -20 Q-30 -30 -31 -14 Q-31 -5 -18 -6 Z" fill="${c.base}" stroke="${c.line}" stroke-width="${sw}" stroke-linejoin="round"/><path d="M-14 -16 Q-27 -23 -27 -13 Q-27 -9 -18 -9 Z" fill="${c.ear}"/>
       <path d="M12 -20 Q30 -30 31 -14 Q31 -5 18 -6 Z" fill="${c.base}" stroke="${c.line}" stroke-width="${sw}" stroke-linejoin="round"/><path d="M14 -16 Q27 -23 27 -13 Q27 -9 18 -9 Z" fill="${c.ear}"/>`
    : `<path d="M-15 -22 Q-28 -20 -26 0 Q-25 10 -18 8 Q-14 -6 -12 -18 Z" fill="${c.ear}" stroke="${c.line}" stroke-width="${sw}" stroke-linejoin="round"/>
       <path d="M15 -22 Q28 -20 26 0 Q25 10 18 8 Q14 -6 12 -18 Z" fill="${c.ear}" stroke="${c.line}" stroke-width="${sw}" stroke-linejoin="round"/>`;
  const eyes = {
    open: `<ellipse cx="-7" cy="-9" rx="2.6" ry="3" fill="${c.dark}"/><ellipse cx="9" cy="-9" rx="2.6" ry="3" fill="${c.dark}"/><circle cx="-6.2" cy="-10" r=".9" fill="#fff"/><circle cx="9.8" cy="-10" r=".9" fill="#fff"/>`,
    sleepy: `<path d="M-10 -9 Q-7 -6.5 -4 -9 M6 -9 Q9 -6.5 12 -9" fill="none" stroke="${c.dark}" stroke-width="1.5" stroke-linecap="round"/>`,
    up: `<ellipse cx="-7" cy="-9" rx="2.5" ry="2.9" fill="${c.dark}"/><ellipse cx="9" cy="-9" rx="2.5" ry="2.9" fill="${c.dark}"/><circle cx="-6.4" cy="-10.6" r="1" fill="#fff"/><circle cx="9.6" cy="-10.6" r="1" fill="#fff"/>`,
  }[c.eyes];
  const brow = c.brow ? `<path d="M-11 -13.5 Q-7 -16 -3.5 -13.5 M5.5 -13.5 Q9 -16 13 -13.5" fill="none" stroke="#fffaf0" stroke-width="2.2" stroke-linecap="round"/>`
    : `<path d="M-10 -14 Q-7 -16 -4 -14 M6 -14 Q9 -16 12 -14" fill="none" stroke="${c.line}" stroke-width=".9" stroke-linecap="round"/>`;
  const mouth = {
    open: `<path d="M-5.5 4 Q1 6.5 7.5 4 Q7 12.5 1 13 Q-5 12.5 -5.5 4 Z" fill="${c.dark}"/><g class="dog-tongue"><path d="M-3 9.5 Q1 6.8 5 9.5 Q4.6 15 1 15.4 Q-2.6 15 -3 9.5 Z" fill="#ff7f86"/><path d="M1 10 L1 13.5" stroke="#d9535d" stroke-width=".6" stroke-linecap="round"/></g>`,
    smile: `<path d="M1 3 L1 5 M-4 5.5 Q1 9 6 5.5" fill="none" stroke="${c.dark}" stroke-width="1.3" stroke-linecap="round"/><path d="M-.5 7.4 Q1 10.5 2.5 7.4 Z" fill="#ff8f96"/>`,
    small: `<path d="M1 4 L1 6 M-2.5 7 Q1 8.8 4.5 7" fill="none" stroke="${c.dark}" stroke-width="1.2" stroke-linecap="round"/>`,
  }[c.mouth];
  const curls = c.curls ? `<path d="M-12 -24 q2 -5 6 -3 q2 -5 7 -3 q3 -4 7 -1 q4 -2 5 3" fill="none" stroke="${c.line}" stroke-width="1" stroke-linecap="round" opacity=".75"/><path d="M-6 -27 q3 -3 5 0 M4 -27 q3 -3 5 0" fill="none" stroke="${c.line}" stroke-width=".8" stroke-linecap="round" opacity=".6"/>` : '';
  const offEyes = `<path d="M-10 -9 L-4 -9 M6 -9 L12 -9" stroke="${c.dark}" stroke-width="1.6" stroke-linecap="round"/>`;
  return `<svg viewBox="0 0 120 96" class="cat-svg dog-walk dog-${key}" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="60" cy="91" rx="38" ry="3.6" fill="currentColor" opacity=".09"/>
    <g class="dog-tail"><path d="M96 58 Q112 50 114 34 Q115 28 110 30 Q106 44 94 52 Z" fill="${c.base}" stroke="${c.line}" stroke-width="${sw}" stroke-linejoin="round"/></g>
    <g class="cat-legs-a">${leg(44, 43)}${leg(86, 87)}</g>
    <g class="cat-legs-b">${leg(54, 55)}${leg(76, 75)}</g>
    <path d="M30 62 Q30 46 50 46 L88 48 Q102 50 100 66 Q98 82 84 82 L44 82 Q30 82 30 70 Z" fill="${c.base}" stroke="${c.line}" stroke-width="${sw}"/>
    <path d="M40 74 Q60 82 82 76" fill="none" stroke="${c.belly}" stroke-width="5" stroke-linecap="round" opacity=".85"/>
    ${c.vest ? `<path d="M33 56 Q33 47 46 47 L66 48 Q74 64 68 81 L46 81.5 Q33 80 33 70 Z" fill="#f8f4ec" stroke="#d9d0c0" stroke-width="1"/>
      <path d="M66 48 Q74 64 68 81" fill="none" stroke="#2f4a6e" stroke-width="2.6" stroke-linecap="round"/>
      <path d="M68.6 53 l-3 2.2 3.6 1.8 -3 2.4 3.8 1.6 -3 2.4 3.6 1.8 -3 2.4 3.2 1.8 -3 2.4 2.6 1.8" fill="none" stroke="#2f4a6e" stroke-width="1.5" stroke-linejoin="round"/>
      <path d="M46 81.5 L68 81" stroke="#2f4a6e" stroke-width="1.8" stroke-linecap="round"/>
      <path d="M38 49 Q42 47 46 47" fill="none" stroke="#2f4a6e" stroke-width="2" stroke-linecap="round"/>` : ''}
    ${c.vest ? '' : c.curls ? `<path d="M46 52 q3 -3 6 0 q3 -3 6 0 q3 -3 6 0 q3 -3 6 0 q3 -3 6 0" fill="none" stroke="${c.line}" stroke-width=".9" stroke-linecap="round" opacity=".55"/>` : `<path d="M48 52 l3 -3 M54 50 l3 -3 M84 54 l3 -3" stroke="${c.line}" stroke-width=".9" stroke-linecap="round" opacity=".7"/>`}
    <g class="dog-head" transform="translate(30 40)">
      ${ears}
      <path d="M-18 -8 Q-20 -30 2 -31 Q22 -30 20 -8 Q20 10 2 12 Q-18 10 -18 -8 Z" fill="${c.base}" stroke="${c.line}" stroke-width="${sw}"/>
      ${curls}
      <ellipse cx="1" cy="2" rx="11" ry="8.5" fill="${c.muzzle}"/>
      ${off ? offEyes : eyes}${brow}
      <ellipse cx="1" cy="${c.bigNose ? 0 : -1}" rx="${c.bigNose ? 6.5 : 5}" ry="${c.bigNose ? 5 : 3.8}" fill="${c.dark}"/><ellipse cx="-.8" cy="${c.bigNose ? -1.8 : -2.2}" rx="1.8" ry="1" fill="#fff" opacity=".45"/>
      ${mouth}
      <ellipse cx="-12" cy="2" rx="2.6" ry="1.4" fill="#ff9fb4" opacity=".55"/><ellipse cx="14" cy="2" rx="2.6" ry="1.4" fill="#ff9fb4" opacity=".55"/>
    </g>
  </svg>`;
}

// ---------- 小棍棍（小熊貓） ----------
function pandaArt() {
  const R = '#c7612a', RL = '#9a4518', W = '#fbf3e6', D = '#2e211e', T = '#e59a5e';
  const leg = (x1, x2) => `<path d="M${x1} 70 L${x2} 85" stroke="${D}" stroke-width="10" stroke-linecap="round"/>`;
  return `<svg viewBox="0 0 140 92" class="cat-svg panda-walk" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="70" cy="88" rx="44" ry="3.6" fill="currentColor" opacity=".09"/>
    <g class="panda-tail">
      <path d="M98 50 Q120 42 132 56 Q140 68 134 82 Q128 88 122 82 Q118 70 108 66 Q102 64 98 66 Z" fill="${R}" stroke="${RL}" stroke-width="1"/>
      <path d="M108 48 Q114 56 110 66 M118 49 Q125 58 120 70 M127 55 Q134 65 128 78" fill="none" stroke="${T}" stroke-width="4.2" stroke-linecap="round"/>
    </g>
    <g class="cat-legs-a">${leg(44, 43)}${leg(92, 93)}</g>
    <g class="cat-legs-b">${leg(54, 55)}${leg(82, 81)}</g>
    <path d="M30 56 Q31 74 44 74 L92 74 Q104 72 105 56 Q96 62 70 60 Q46 60 30 56 Z" fill="${D}"/>
    <path d="M30 60 Q30 44 48 43 L94 44 Q106 46 105 58 Q98 64 70 62 Q46 62 30 60 Z" fill="${R}" stroke="${RL}" stroke-width="1" stroke-linejoin="round"/>
    <path d="M30 58 Q34 70 46 72 Q42 62 40 56 Z" fill="${D}"/>
    <path d="M58 46 q4 -2 8 0 M74 46 q4 -2 8 0" fill="none" stroke="${RL}" stroke-width=".9" stroke-linecap="round" opacity=".6"/>
    <g class="dog-head" transform="translate(28 40)">
      <path d="M-14 -11 L-17 -25 L-4 -19 Z M14 -11 L17 -25 L4 -19 Z" fill="${R}" stroke="${RL}" stroke-width="1" stroke-linejoin="round"/>
      <path d="M-13.2 -13.5 L-15 -22.5 L-7 -18.6 Z M13.2 -13.5 L15 -22.5 L7 -18.6 Z" fill="${W}"/>
      <path d="M-11 -16 L-12 -20.5 L-8.5 -18 Z M11 -16 L12 -20.5 L8.5 -18 Z" fill="${D}"/>
      <ellipse cx="0" cy="-3" rx="19" ry="16" fill="${R}" stroke="${RL}" stroke-width="1"/>
      <path d="M-17.5 -1 Q-17 -7 -13 -7 Q-12 0 -14.5 5 Q-17 4 -17.5 -1 Z M17.5 -1 Q17 -7 13 -7 Q12 0 14.5 5 Q17 4 17.5 -1 Z" fill="${W}"/>
      <ellipse cx="0" cy="4.6" rx="6.4" ry="5.2" fill="${W}"/>
      <ellipse cx="-6.5" cy="-13" rx="3.2" ry="2.2" fill="${W}"/><ellipse cx="6.5" cy="-13" rx="3.2" ry="2.2" fill="${W}"/>
      <circle cx="-7" cy="-4" r="3.4" fill="${D}"/><circle cx="7" cy="-4" r="3.4" fill="${D}"/>
      <circle cx="-5.8" cy="-5.3" r="1.2" fill="#fff"/><circle cx="8.2" cy="-5.3" r="1.2" fill="#fff"/><circle cx="-7.8" cy="-2.6" r=".55" fill="#fff"/><circle cx="6.2" cy="-2.6" r=".55" fill="#fff"/>
      <ellipse cx="0" cy="2.4" rx="2.8" ry="2" fill="${D}"/>
      <path d="M-2.6 5.6 Q-1.3 7.2 0 5.6 Q1.3 7.2 2.6 5.6" fill="none" stroke="${D}" stroke-width="1" stroke-linecap="round"/>
      <ellipse cx="-12" cy="4" rx="2.8" ry="1.6" fill="#ff9fb4" opacity=".7"/><ellipse cx="12" cy="4" rx="2.8" ry="1.6" fill="#ff9fb4" opacity=".7"/>
    </g>
  </svg>`;
}

// ---------- 鯊魚（游過去；碰到鼻子會關機掉到地上） ----------
function sharkArt({ off = false } = {}) {
  const B = '#6f9cbc', BL = '#4f7c9c', W = '#f4efe4';
  return `<svg viewBox="0 0 130 70" class="cat-svg shark-swim ${off ? 'off' : ''}" xmlns="http://www.w3.org/2000/svg">
    <g class="shark-tail"><path d="M104 36 L126 18 Q122 34 128 52 Z" fill="${B}" stroke="${BL}" stroke-width="1.2" stroke-linejoin="round"/></g>
    <path d="M56 18 L70 2 Q72 14 76 20 Z" fill="${B}" stroke="${BL}" stroke-width="1.2" stroke-linejoin="round"/>
    <path d="M10 38 Q24 58 46 58 Q82 56 106 34 Q80 44 48 44 Q22 44 10 38 Z" fill="${W}" stroke="#d6cfc2" stroke-width="1.2"/>
    <path d="M10 38 Q12 18 44 16 Q80 14 106 34 Q80 44 48 44 Q22 44 10 38 Z" fill="${B}" stroke="${BL}" stroke-width="1.2" stroke-linejoin="round"/>
    <path d="M14 42 Q22 50 34 48 Q28 44 26 40 Q20 42 14 42 Z" fill="#f2a3a8"/>
    <path d="M14 42 L17 44.5 L19 42.5 L21.5 45 L23.5 43 L26 45.5 L27 41" fill="none" stroke="#fff" stroke-width="1" stroke-linejoin="round"/>
    ${off ? `<path d="M23 29 L29 29" stroke="#2b2633" stroke-width="1.8" stroke-linecap="round"/><text x="36" y="20" font-size="9" font-weight="800" fill="#9fb7d9" font-family="sans-serif">z</text>`
      : `<ellipse cx="26" cy="29" rx="2.4" ry="2.9" fill="#2b2633"/><circle cx="26.8" cy="28" r=".8" fill="#fff"/>`}
    <ellipse cx="20" cy="36" rx="2.6" ry="1.4" fill="#ff9fb4" opacity=".5"/>
    <path d="M36 28 Q38 34 36 40 M41 27 Q43 33 41 40" fill="none" stroke="${BL}" stroke-width=".9" stroke-linecap="round" opacity=".6"/>
  </svg>`;
}

// ---------- 角色資料 ----------
const FRIENDS = {
  black: { name: '小小黑', kind: '黑貓', intro: '我們一起養的黑貓，黃眼睛、粉紅耳朵，最喜歡被摸摸。', w: 78,
    lines: ['小小黑：喵～', '小小黑被抓到，假裝自己是一團影子', '小小黑：今天有罐罐嗎？', '小小黑被狗狗捉弄了，轉身抱住狗狗', '小小黑把頭塞進你手裡，要你摸摸', '小小黑幫狗狗按摩', '小小黑：還好，好煩', '小小黑躲在紙箱裡，只露出兩隻黃眼睛', '小小黑踩踩你的肚子：喵', '小小黑把你的襪子叼走了'] },
  orange: { name: '晽晽貓貓', kind: '橘白胖貓', intro: '貪吃的橘白胖貓，嘴裡永遠叼著吃的。', w: 80, lines: () => COAT_TRAITS.orange.lines },
  white: { name: '陷阱貓', kind: '白貓', intro: '一隻小公主貓，戴著小皇冠，讓你摸之前要先看牠心情。', w: 78, lines: () => COAT_TRAITS.white.lines },
  calico: { name: '小魚乾', kind: '三花貓', intro: '最愛小魚乾的三花，很會撒嬌。', w: 78, lines: () => COAT_TRAITS.calico.lines },
  tuxedo: { name: '吵吵貓', kind: '賓士貓', intro: '喜歡送別人一朵花，行為常常有點好笑。', w: 78, lines: () => COAT_TRAITS.tuxedo.lines },
  haohao: { name: '還好', kind: '黃金獵犬', intro: '樂天又有點無厘頭的大狗狗，堅持自己是女生。', w: 112,
    lines: ['還好：我是女生～', '還好：嗷把拔貓咪好可愛喔～', '還好追著自己的尾巴轉了三圈，然後忘記自己在幹嘛', '還好：今天也是很好的一天耶～', '還好躺下來翻肚子：我是女生～摸我～', '還好把球叼過來，結果是一顆橘子', '還好：嗷！（不知道在嗷什麼）', '還好跟陷阱貓打招呼，被無視了，但還是很開心', '還好：把拔～把拔貓咪呢？把拔貓咪呢？', '還好：嗷～把拔貓咪～', '還好：我比較喜歡把拔', '還好：哈哈～', '還好：嗷把拔我是還好…', '還好看到蝴蝶，追到忘記回家', '還好：嗷～我也要巧克力～'] },
  doggy: { name: '狗狗', kind: '小狗', intro: '家裡最年長的小動物，大家都喜歡牠。愛捉弄小小黑，喜歡自己香香的。', w: 78,
    lines: ['狗狗偷偷拍了一下小小黑的尾巴，然後裝作什麼都沒發生', '狗狗把阿扁的玩具藏起來了', '狗狗聞了聞你：汪，去洗澡', '狗狗：汪去洗澡！（但說到牠自己洗澡就跑掉了）', '狗狗香香的，因為牠很在意自己香不香', '狗狗趁小小黑睡覺，偷偷趴在牠旁邊', '狗狗被小棍棍踩了一腳，一臉無奈', '你剛洗完澡，狗狗就跑來一直蹭，蹭得自己也香香的，開心得尾巴停不下來', '狗狗把阿扁擠到旁邊，自己躺在最軟的位置'] },
  abian: { name: '阿扁', kind: '小狗', intro: '愛思考的小狗，怕被捏鼻子，聽到諧音梗會拍拍手。和狗狗是好朋友。', w: 78,
    lines: ['阿扁趕快摀住鼻子：不要捏我的鼻子！', '阿扁在思考……為什麼貓咪叫貓咪？', '阿扁在思考……今天的晚餐是什麼', '阿扁聽到一個諧音梗：「狗狗去餐廳點了『汪』子麵」，笑到拍拍手', '阿扁：「你知道小小黑最喜歡什麼運動嗎？『喵』準！」，說完自己拍拍手', '阿扁和狗狗是最好的朋友', '阿扁：讓我想一下……嗯……想完了，忘記剛剛在想什麼', '阿扁：「你知道還好最愛吃什麼嗎？『嗷』利奧！」說完自己拍拍手', '阿扁在思考……為什麼鯊魚會在天上游'] },
  gungun: { name: '小棍棍', kind: '小熊貓', intro: '會「棍～」地叫，講話幾乎只講最後一個字。最愛蘋果，喜歡踩狗狗，但狗狗不喜歡。', w: 104,
    lines: ['小棍棍：棍～', '小棍棍：蛋', '小棍棍：狗狗❤️', '小棍棍：狗狗～（踩）', '小棍棍：蘋果～', '小棍棍被打了一下：一袋～（跑掉）', '小棍棍：……果（想說蘋果）', '小棍棍：……狗（想說狗狗，但狗狗已經跑了）', '小棍棍抱著蘋果睡著了'] },
  shark: { name: '鯊魚', kind: '鯊魚', intro: '男朋友最喜歡的小動物。鼻子被碰到就會關機，再碰一下會倒吸一口氣醒來。', w: 110, swim: true,
    lines: ['鯊魚被碰到鼻子，關機了', '鯊魚：河！（倒吸一口氣，開機了）', '鯊魚：河！河！（嚇一跳游走了）', '鯊魚在空氣裡游泳，看起來很認真', '鯊魚用鼻子碰了一下你……然後自己關機了', '鯊魚：河～（小小聲的，在打呵欠）',
      '鯊魚：人類～哈囉～', '鯊魚：人類～我很乖喔～', '鯊魚呆呆地游過去，撞到空氣，自己嚇一跳', '鯊魚在空氣裡游泳，游著游著忘記要去哪裡',
      '鯊魚：人類～今天也要一起玩嗎～', '鯊魚：人類～（只是想叫你一下）', '鯊魚：人類～我的尾巴在哪裡？'] },
};
const friendLines = (k) => { const L = FRIENDS[k].lines; return typeof L === 'function' ? L() : L; };
function friendArt(k, opts) {
  if (PUPS2[k]) return pupArt(k);
  if (DOGS[k]) return dogArt(k, opts);
  if (k === 'gungun') return pandaArt();
  if (k === 'shark') return sharkArt(opts);
  return coatWalk(k);
}

// ---------- 圖鑑紀錄（兩個人共用） ----------
async function dexNote(k, idx) {
  if (!S.couple || !S.cid || (S.couple.members || []).length < (trialOpen() ? 1 : 2)) return;
  const D0 = (S.couple.dex || {})[k] || {};
  const first = !D0.met, newLine = idx != null && !(D0.l || {})[idx];
  if (!first && !newLine) return;
  const up = {};
  if (newLine) up[`dex.${k}.l.${idx}`] = true;
  if (first) { up[`dex.${k}.met`] = now(); up[`dex.${k}.by`] = me(); }
  await S.store.updateCouple(S.cid, up);
  if (first) setTimeout(() => toast(`圖鑑新增：${FRIENDS[k].name}！也解鎖了牠的頭像`), 1600);
}
// 小動物說話：有指定牠本人（路過時被點到），就在牠頭上冒對話框；不然才用上面的提示
let sayAt = null;
function speak(text) {
  const el = sayAt; sayAt = null;
  if (!el || !document.body.contains(el) || typeof bubble !== 'function') return toast(text);
  document.querySelectorAll('.fr-bubble.solo').forEach((b) => b.remove());
  const r = el.getBoundingClientRect();
  const narr = !/^[^：]{1,8}：/.test(text);   // 「名字：…」是說話，其他是旁白
  const b = bubble(text, r.left + r.width / 2, r.top + 4, `solo ${narr ? 'narr' : ''}`);
  setTimeout(() => { b.classList.add('out'); setTimeout(() => b.remove(), 400); }, 3000);
}
function sayLine(k, idx) {
  const L = friendLines(k);
  if (idx === undefined && typeof maybeAnimalCan === 'function') maybeAnimalCan(k);
  if (idx === undefined) {
    // 節日／心情限定台詞優先；偶爾說你們幫牠加的台詞
    const sp = typeof specialNow === 'function' ? specialNow(k) : [];
    if (sp.length && Math.random() < .55) { const [j, x] = sp[Math.floor(Math.random() * sp.length)]; speak(x.t); dexNote(k, 's' + j); return x.t; }
    const cu = typeof customLines === 'function' ? customLines(k) : [];
    if (cu.length && Math.random() < .3) { const t = withName(k, cu[Math.floor(Math.random() * cu.length)].t); speak(t); dexNote(k, null); return t; }
  }
  const i = idx === undefined ? pickLineIdx(k, L.length) : idx;
  speak(L[i]); dexNote(k, i); return L[i];
}
// 台詞不要解鎖太快：大多時候說已經聽過的；新台詞每人每天最多 3 句，而且要碰運氣
const DEX_NEW_PER_DAY = 3, DEX_NEW_CHANCE = .3;
function dexQuota(kind) { const k = `park-dexnew-${kind}-${dkey()}-${me()}`; return { used: +(localStorage.getItem(k) || 0), use: () => localStorage.setItem(k, +(localStorage.getItem(k) || 0) + 1) }; }
function pickLineIdx(k, n) {
  const seen = (((S.couple || {}).dex || {})[k] || {}).l || {};
  const old = [], fresh = [];
  for (let i = 0; i < n; i++) (seen[i] ? old : fresh).push(i);
  const q = dexQuota('line');
  const goNew = fresh.length && (!old.length || trialOpen() || (q.used < DEX_NEW_PER_DAY && Math.random() < DEX_NEW_CHANCE));
  if (goNew) { if (old.length) q.use(); return fresh[Math.floor(Math.random() * fresh.length)]; }
  return old[Math.floor(Math.random() * old.length)];
}

// ---------- 路過首頁 ----------
const STROLL_ODDS = [['black', .11], ['orange', .10], ['haohao', .09], ['doggy', .09], ['abian', .10], ['gungun', .10], ['shark', .11], ['white', .10], ['calico', .10], ['tuxedo', .10]];   // 十隻差不多，小劇場少的稍微高一點
function pickFriend() {
  // 心情下雨的時候，狗狗比較常來陪你
  if (typeof myMoodRain === 'function' && myMoodRain() && Math.random() < .45) return 'doggy';
  let r = Math.random(); for (const [k, p] of STROLL_ODDS) { if ((r -= p) < 0) return k; } return 'black'; }
function walker(k, cls = '') {
  const el = document.createElement('button');
  el.className = `cat-stroll fr-${k} ${FRIENDS[k].swim ? 'swim' : ''} ${cls}`;
  el.style.width = FRIENDS[k].w + 'px';
  el.setAttribute('aria-label', FRIENDS[k].name);
  el.innerHTML = typeof withHat === 'function' ? withHat(k, friendArt(k)) : friendArt(k);
  return el;
}
function catStroll(force) {
  // 週年動畫、回顧故事、新手導覽進行中不打擾
  if ((S.couple?.members || []).length < (trialOpen() ? 1 : 2) || document.querySelector('.cat-stroll, .anniv-intro, .story, .tour, .modal-back')) return;
  if (!force && typeof carryStroll === 'function' && carryStroll()) return;
  const key = 'park-stroll-at';
  // 好寶加入前的測試期間：每 10 秒就來一隻
  if (!force && (now() - +(localStorage.getItem(key) || 0) < (trialOpen() ? 9000 : 30 * 60000) || (!trialOpen() && Math.random() > .4))) return;
  localStorage.setItem(key, now());
  const k = force || pickFriend();
  // 有時候兩隻一起路過，會演一段小劇場
  if (!force && typeof pickScene === 'function') { const sc = pickScene(k); if (sc) return duoStroll(sc); }
  const el = walker(k);
  if (k === 'tuxedo' && Math.random() < .35) el.classList.add('backwards');
  let timer = setTimeout(() => el.remove(), 9500);
  el.onclick = async () => {
    const r = el.getBoundingClientRect();
    // 鯊鯊：第一次點＝鼻子被碰到，關機掉到地上；再點一次＝倒吸一口氣開機，游走
    if (k === 'shark') {
      if (!el.classList.contains('off')) {
        el.classList.add('off'); el.style.left = r.left + 'px'; el.innerHTML = withHat('shark', sharkArt({ off: true }));
        sfx('flip'); sayAt = el; sayLine('shark', 0);
        clearTimeout(timer); timer = setTimeout(() => el.remove(), 25000);
      } else {
        // 有時候晽晽貓貓衝過來把牠吃掉，牠會再長出來
        if (typeof sharkEaten === 'function' && Math.random() < .3) { clearTimeout(timer); return sharkEaten(el); }
        el.classList.remove('off'); el.classList.add('wake'); el.innerHTML = withHat('shark', sharkArt());
        sfx('heart'); sayAt = el; sayLine('shark', Math.random() < .6 ? 1 : 2);
        clearTimeout(timer); setTimeout(() => el.remove(), 3400);
      }
      return;
    }
    // 一次路過只說一句：已經被點過就不再說（鯊魚另外處理）
    if (el.dataset.said) return; el.dataset.said = '1';
    el.classList.add('caught'); sfx('heart');
    const fx = { orange: ['#c9773a', '#ffd45c'], white: ['#ffd45c', '#9fd3ff', '#ff8fab'], calico: ['#ff9db4', '#ffc2d1'], tuxedo: ['#ffd1dc', '#ffd45c', '#7cc488'], haohao: ['#ff9fb4', '#ffd45c', '#e2b56a'], doggy: ['#ff9fb4', '#efd9ac'], abian: ['#ffd45c', '#9fd3ff', '#ff9fb4'], gungun: ['#e9573f', '#ffd45c'] }[k] || ['#2b2633', '#ff9db4', '#ffd970'];
    floaty(r.left + r.width / 2, r.top, fx);
    if (k === 'tuxedo' && Math.random() < .4) el.classList.add('trip');
    if (k === 'calico') el.classList.add('roll');
    if (k === 'abian') el.classList.add('clap');
    if (k === 'gungun') {
      // 小棍棍：被打會「一袋～」地快速跑掉
      if (Math.random() < .4) { el.classList.remove('caught'); el.classList.add('flee'); sayLine('gungun', 5); clearTimeout(timer); setTimeout(() => el.remove(), 1200); return; }
    }
    if (k === 'black') {
      el.innerHTML = catPose('jump');
      blackPatXP();
    }
    sayAt = el; sayLine(k);
    clearTimeout(timer); setTimeout(() => el.remove(), 3400);
  };
  document.body.appendChild(el);
}
window.__stroll = (c) => catStroll(c || 'haohao');

// ---------- 圖鑑頁 ----------
const DEX_ORDER = ['black', 'orange', 'white', 'calico', 'tuxedo', 'haohao', 'doggy', 'abian', 'gungun', 'shark'];
function dexCount() { const d = S.couple?.dex || {}; return DEX_ORDER.filter((k) => d[k] && d[k].met).length; }
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
  if (S.tab === t) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
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
  items.push({ name: `${a.date.getFullYear() - annY} 週年`, ...a, icon: '<i data-ic="heart"></i>' });
  for (const u of c.members) {
    const p = prof(u); if (!p.bday) continue;
    items.push({ name: `${p.nick || ''}生日`, ...nextOf(p.bday), icon: '<i data-ic="cake"></i>' });
  }
  items.push({ name: '情人節', ...nextOf('02-14'), icon: '<i data-ic="rose"></i>' });
  items.push({ name: '聖誕節', ...nextOf('12-25'), icon: '<i data-ic="tree"></i>' });
  const dt = daysTogether(), next100 = Math.ceil((dt + 1) / 100) * 100;
  items.push({ name: `第 ${next100} 天`, days: next100 - dt, icon: '<i data-ic="hundred"></i>' });
  // 自己加的日子（每年重複，或只有一次；過了的一次性日子就不顯示）
  const t0 = new Date(); t0.setHours(0, 0, 0, 0);
  for (const [, x] of Object.entries(c.cdates || {})) {
    if (!x || !x.date) continue;
    if (x.yearly) items.push({ name: x.name, ...nextOf(x.date.slice(5)), icon: `<i data-ic="${x.icon || 'star'}"></i>` });
    else { const d = new Date(x.date + 'T00:00:00'); const days = Math.round((d - t0) / 86400000); if (days >= 0) items.push({ name: x.name, days, icon: `<i data-ic="${x.icon || 'star'}"></i>` }); }
  }
  return items.sort((x, y) => x.days - y.days);
}

function homeTodos() {
  if (!S.couple) return [];
  const t = [];
  const p = partner();
  if (!p) t.push({ icon: '<i data-ic="key"></i>', text: '對方還沒加入，把邀請碼傳給對方', act: 'invite', btn: '邀請' });
  const ns = list('cards').filter((c) => c.owner === me() && !c.scratched).length;
  if (ns) t.push({ icon: '<i data-ic="ticket"></i>', text: `有 ${ns} 張新票券等你刮開`, act: 'goScratch', btn: '去刮' });
  const wl = list('wishes').filter((w) => w.status === 'pending' && w.by !== me()).length;
  if (wl) t.push({ icon: '<i data-ic="shooting"></i>', text: `${nick(p)} 在許願池許了 ${wl} 個願`, act: 'wishes', btn: '看看' });
  // 測試期間（好寶還沒加入）：自己抽到的盲盒自己寫，才能測完整流程
  if (trialOpen()) for (const c of list('cards').filter((c) => c.mystery && !c.secret && c.owner === me())) t.push({ icon: '<i data-ic="gift"></i>', text: '測試：幫自己抽到的神秘盲盒寫內容', act: 'writeSecret', id: c.id, btn: '去寫' });
  for (const c of list('cards').filter((c) => c.mystery && !c.secret && c.from === me() && c.owner !== me())) {
    t.push({ icon: '<i data-ic="gift"></i>', text: `${nick(c.owner)} 扭到了神秘盲盒，換你偷偷寫內容`, act: 'writeSecret', id: c.id, btn: '去寫' });
  }
  for (const b of list('battles')) {
    if (b.status === 'claimed' && b.claimer !== me()) t.push({ icon: '<i data-ic="swords"></i>', text: `${nick(b.claimer)} 說自己完成挑戰「${b.task}」了`, act: 'battleJudge', id: b.id, btn: '確認' });
    if (b.status === 'done' && b.loser === me() && !b.paid) t.push({ icon: '<i data-ic="flag"></i>', text: `挑戰輸了，要發一張卡給 ${nick(b.winner)}`, act: 'battlePay', id: b.id, btn: '發卡' });
  }
  for (const c of list('cards').filter((c) => c.owner === p && c.swapReq)) {
    t.push({ icon: '<i data-ic="swap"></i>', text: `${nick(p)} 想把「${c.title}」換一張`, act: 'swapJudge', id: c.id, btn: '看看' });
  }
  const tr = S.couple.taskSwapReq;
  if (tr && tr.by !== me() && tr.wk === weekKey()) t.push({ icon: '<i data-ic="swap"></i>', text: `${nick(tr.by)} 想換掉每週任務「${weekTasks()[tr.i] || ''}」`, act: 'tab', tab: 'play', btn: '去看' });
  for (const c of list('cards').filter((c) => c.owner === me() && c.scratched && c.expiresAt && c.expiresAt > now() && c.expiresAt - now() < 86400000 && remaining(c) > 0)) {
    t.push({ icon: '<i data-ic="hourglass"></i>', text: `「${c.title}」${new Date(c.expiresAt).getDate() === new Date().getDate() ? '今天' : '明天'}就過期了`, act: 'goScratch', btn: '去用' });
  }
  if (needDownloadReminder()) t.push({ icon: '<i data-ic="cloud"></i>', text: '這個月還沒把備份存到手機', act: 'downloadBackup', btn: '下載' });
  const caps = list('capsules').filter((c) => c.openAt <= now() && !(c.opened || {})[me()]).length;
  if (p && typeof deepProgress === 'function') {
    const y = new Date().getFullYear(), q = deepQ(), DP = deepProgress(y, q);
    const wait = DP.docs.filter((d) => d && d.answers && d.answers[p] && !d.answers[me()]).length;
    if (wait) t.push({ icon: '<i data-ic="chat"></i>', text: `${nick(p)} 在季問答等你寫 ${wait} 題`, act: 'goDeep', btn: '去寫' });
  }
  if (caps) t.push({ icon: '<i data-ic="hourglass"></i>', text: `有 ${caps} 封時光膠囊可以打開了`, act: 'goCapsule', btn: '打開' });
  return t;
}
ACT.goScratch = () => { S.tab = 'wallet'; S.sub.wallet = 'mine'; render(); window.scrollTo(0, 0); };
ACT.goDeep = () => { S.tab = 'memory'; S.sub.memory = 'deep'; render(); window.scrollTo(0, 0); };
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
    return `${annivHomeCard()}
    ${homeNextDate()}
    <div class="card hero">
      <button class="hero-miss ${missCoolLeft() > 0 ? 'cool' : ''}" data-act="miss" id="missbtn" aria-label="想你"><i data-ic="heart" class="ic-fill"></i></button>
      <div class="small muted">我們在一起</div>
      <div class="days">第 ${money(daysTogether())} <small>天</small></div>
      <div class="couple"><span>${avatar(me())} ${esc(nick(me()))}</span><span class="heart"><i data-ic="heart" class="ic-fill"></i></span><span>${p ? `${avatar(p)} ${esc(nick(p))}${partnerOnline() ? `<button class="online-dot" data-act="poke" aria-label="戳一下"><i></i>在線上・戳一下</button>` : ''}` : '<span class="muted">等待對方加入…</span>'}</span></div>
      <div class="countdowns">${cds.map((x) => `<div class="cd ${x.days === 0 ? 'today' : ''}">${x.icon} ${esc(x.name)}<b>${x.days === 0 ? '就是今天！' : x.days + ' 天'}</b></div>`).join('')}<button class="cd cd-add" data-act="cdEdit" aria-label="設定倒數的日子"><i data-ic="gear"></i></button></div>
    </div>



    <div class="card">
      <h3><i data-ic="weather"></i> 心情天氣 <span class="sub">點自己的換心情</span></h3>
      <div class="mood-row">
        <button class="mood-box ${mm ? moodCls(mm.icon) : ''}" data-act="mood">${mm && /rain|storm/.test(moodCls(mm.icon)) ? `<span class="mood-cat">${catPose('umbrella')}</span>` : ''}<div class="mi">${mm ? moodIc(mm.icon) : '<i data-ic="weather" class="ic-faint"></i>'}</div><b>${mm ? esc(mm.label) : '還沒設定'}</b><div class="who">${esc(nick(me()))}${mm ? ' · ' + ago(mm.at) : ''}</div></button>
        <div class="mood-box ${pm ? moodCls(pm.icon) : ''}">${pm && /rain|storm/.test(moodCls(pm.icon)) ? `<span class="mood-cat">${catPose('umbrella')}</span>` : ''}<div class="mi">${pm ? moodIc(pm.icon) : '<i data-ic="weather" class="ic-faint"></i>'}</div><b>${pm ? esc(pm.label) : '還沒設定'}</b><div class="who">${p ? esc(nick(p)) : '對方'}${pm ? ' · ' + ago(pm.at) : ''}</div>
          ${pm && (pm.icon === '🌧️' || pm.icon === '⛈️') ? '<div class="small" style="color:var(--accent);font-weight:700">需要哄哄！</div>' : ''}</div>
      </div>
      ${typeof careHTML === 'function' ? careHTML() : ''}
    </div>

    ${typeof monthReviewHTML === 'function' ? monthReviewHTML() : ''}
    ${typeof onThisDayHTML === 'function' ? onThisDayHTML() : ''}

    ${petHomeCard()}

    ${dailyCardHTML()}

    ${todos.length ? `<div class="card soft-todo">${todos.slice(0, S.todoAll ? 99 : 3).map((t) => `<div class="todo-item"><span class="ti">${t.icon}</span><span class="grow">${esc(t.text)}</span>
      <button class="btn sm" data-act="${t.act}" ${t.id ? `data-id="${t.id}"` : ''} ${t.tab ? `data-tab="${t.tab}"` : ''}>${t.btn}</button></div>`).join('')}${todos.length > 3 ? `<button class="link center todo-more" data-act="todoMore">${S.todoAll ? '收起來' : `還有 ${todos.length - 3} 件`}</button>` : ''}</div>` : ''}

    <div class="card note-row note-row2"><button class="nr-main" data-act="writeNote"><span class="lr-i"><i data-ic="letter"></i></span><span class="grow"><b>藏一張小紙條</b><div class="small muted">藏在 App 某個角落，等 ${esc(nick(p) || '對方')} 自己發現${list('notes').filter((n) => n.by === me() && !n.found).length ? `・${list('notes').filter((n) => n.by === me() && !n.found).length} 張還沒被找到` : ''}</div></span></button><button class="nr-box" data-act="noteBox"><i data-ic="book"></i><small>紙條盒</small></button></div>`;
  },
};

// ---------- 心情 ----------
ACT.mood = () => {
  const cur = (S.couple.moods || {})[me()];
  const m = openModal(`${mhead('今天的心情天氣')}
    <div class="mood-pick">${D.MOODS.map((x, i) => `<button data-i="${i}" class="${cur && cur.icon === x.icon ? 'on' : ''}"><span><i data-ic="${x.ic}"></i></span>${x.label}<small class="muted">${x.hint}</small></button>`).join('')}</div>`, { center: true });
  $$('[data-i]', m).forEach((b) => b.onclick = async () => {
    const x = D.MOODS[+b.dataset.i];
    await S.store.updateCouple(S.cid, { [`moods.${me()}`]: { icon: x.icon, label: x.label, at: now() }, [`moodHist.${me()}.${dkey()}`]: x.icon });
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
// 想你：每個人 5 分鐘才能按一次
const MISS_COOL = 5 * 60000;
function missCoolLeft() {
  const last = Math.max(0, ...list('misses').filter((m) => m.by === me()).map((m) => m.at || 0));
  return Math.max(0, last + MISS_COOL - now());
}
ACT.miss = async (el, e) => {
  const left = missCoolLeft();
  if (left > 0) {
    el.classList.remove('nope'); void el.offsetWidth; el.classList.add('nope');
    return toast(`剛剛才想過了，${left > 60000 ? Math.ceil(left / 60000) + ' 分鐘' : Math.ceil(left / 1000) + ' 秒'}後可以再想一次`);
  }
  const r = el.getBoundingClientRect();
  floaty(r.left + r.width / 2, r.top); sfx('heart');
  el.classList.remove('pulse'); void el.offsetWidth; el.classList.add('pulse');
  vibrate([30, 40, 30]);
  const pm = (S.couple.moods || {})[partner()];
  const rain = !!pm && (pm.icon === '🌧️' || pm.icon === '⛈️') && now() - (pm.at || 0) < 24 * 3600000;
  await col('misses').add({ by: me(), at: now(), ...(rain ? { rain: true } : {}) });
  petXP(1);
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
    <h3><i data-ic="chat"></i> 每日一問 <span class="sub"><button class="link" data-act="dailyHistory">看以前的</button></span></h3>
    <div style="font-family:var(--serif);font-size:17px;font-weight:700;margin-bottom:10px">${esc(q)}</div>
    ${mine ? `<div class="todo-item" style="display:block"><div class="small muted">${esc(nick(me()))}</div>${esc(mine)}</div>
      <div class="todo-item" style="display:block"><div class="small muted">${esc(nick(p))}</div>${theirs ? esc(theirs) : '<span class="muted"><i data-ic="lock"></i> 等對方回答後就看得到</span>'}</div>
      ${theirs && dailyCollide(mine, theirs) ? `<div class="collide"><i data-ic="sparkle"></i> 撞答案了！你們都寫了「${esc(dailyCollide(mine, theirs))}」</div>` : ''}`
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
  await addPoints(me(), D.POINTS.daily, '每日一問'); petXP(2);
  maybeCan(me(), '回答了每日一問', .35); setTimeout(dailyStreakTicket, 800);
  await notify(partner(), 'daily', `${nick(me())} 回答了今天的每日一問 💬`);
  toast('送出了 💬');
};
ACT.dailyHistory = () => {
  const p = partner();
  const ds = list('daily').filter((d) => d.answers && d.answers[me()] && p && d.answers[p]).sort((a, b) => b.id.localeCompare(a.id));
  openModal(`${mhead('<i data-ic="chat"></i> 以前的每日一問')}
    ${ds.map((d) => `<div class="card"><div class="small muted">${d.id}</div><b style="font-family:var(--serif)">${esc(D.DAILY_QUESTIONS[d.qi] || '')}</b>
      <div class="small mt"><b>${esc(nick(me()))}：</b>${esc(d.answers[me()])}</div><div class="small"><b>${esc(nick(p))}：</b>${esc(d.answers[p])}</div>
      <button class="btn sm ghost mt" data-act="dailyToMem" data-id="${d.id}"><i data-ic="clock"></i> 收進時間軸</button></div>`).join('')
      || '<div class="empty"><span class="big"><i data-ic="chat"></i></span>兩人都回答過的題目會出現在這裡</div>'}`);
};

ACT.dailyToMem = async (el) => {
  const d = list('daily').find((x) => x.id === el.dataset.id); if (!d) return;
  const p = partner();
  await col('memories').add({ title: D.DAILY_QUESTIONS[d.qi] || '每日一問', date: d.id.slice(0, 10), kind: 'other', note: `${nick(me())}：${d.answers[me()]}\n${nick(p)}：${d.answers[p]}`, by: me(), at: now() });
  el.outerHTML = '<span class="small muted">已收進時間軸</span>'; toast('收進時間軸了');
};

// ---------- 情話小紙條 ----------

// ---------- 自己加的倒數日子（兩個人都看得到、都能改） ----------
const CD_ICONS = ['star', 'heart', 'plane', 'cake', 'gift', 'house', 'camera', 'violin', 'dining', 'rose', 'tree', 'flag'];
ACT.cdEdit = () => {
  const m = openModal('', { center: true });
  const draw = () => {
    const ds = Object.entries(S.couple.cdates || {}).filter(([, x]) => x).sort((a, b) => (a[1].date || '').localeCompare(b[1].date || ''));
    m.querySelector('.modal').innerHTML = `${mhead('<i data-ic="gear"></i> 倒數的日子')}
      <p class="small muted" style="margin:0 0 8px">加上你們想倒數的日子，兩個人都看得到、都能改</p>
      ${ds.length ? ds.map(([id, x]) => `<button class="cd-row" data-id="${id}"><span class="cd-ri"><i data-ic="${x.icon || 'star'}"></i></span><span class="grow"><b>${esc(x.name)}</b><br><span class="small muted">${x.yearly ? '每年 ' + x.date.slice(5).replace('-', '/') : x.date.replace(/-/g, '/')}</span></span><span>›</span></button>`).join('') : '<div class="empty">還沒有自己加的日子</div>'}
      <button class="btn block mt" id="cd-new">＋ 加一個日子</button>`;
    $$('.cd-row', m).forEach((b) => b.onclick = () => form(b.dataset.id));
    $('#cd-new', m).onclick = () => form(null);
  };
  const form = (id) => {
    const x = id ? S.couple.cdates[id] : { name: '', date: dkey(), yearly: false, icon: 'star' };
    let icon = x.icon || 'star', yearly = !!x.yearly;
    m.querySelector('.modal').innerHTML = `${mhead(id ? '改這個日子' : '加一個日子')}
      <label>名稱</label><input id="cd-n" maxlength="12" value="${esc(x.name)}" placeholder="例如：去日本">
      <label>日期</label><input id="cd-d" type="date" value="${esc(x.date)}">
      <label>重複</label><div class="seg" id="cd-y"><button data-y="0" class="${yearly ? '' : 'on'}">只有一次</button><button data-y="1" class="${yearly ? 'on' : ''}">每年</button></div>
      <label>圖示</label><div class="cd-icons">${CD_ICONS.map((k) => `<button data-ic2="${k}" class="${k === icon ? 'on' : ''}"><i data-ic="${k}"></i></button>`).join('')}</div>
      <button class="btn block mt" id="cd-ok">${id ? '儲存' : '加上去'}</button>
      ${id ? '<button class="btn ghost block mt" id="cd-del" style="color:#d4405f">刪掉這個日子</button>' : ''}
      <button class="link center" id="cd-back" style="display:block;margin:10px auto 0">‹ 回到列表</button>`;
    $$('#cd-y button', m).forEach((b) => b.onclick = () => { yearly = b.dataset.y === '1'; $$('#cd-y button', m).forEach((z) => z.classList.toggle('on', z === b)); });
    $$('.cd-icons button', m).forEach((b) => b.onclick = () => { icon = b.dataset.ic2; $$('.cd-icons button', m).forEach((z) => z.classList.toggle('on', z === b)); });
    $('#cd-back', m).onclick = draw;
    $('#cd-ok', m).onclick = () => {
      const name = $('#cd-n', m).value.trim(), date = $('#cd-d', m).value;
      if (!name) return toast('幫這個日子取個名字');
      if (!date) return toast('選一個日期');
      const k = id || ('c' + Date.now().toString(36));
      S.store.updateCouple(S.cid, { [`cdates.${k}`]: { name, date, yearly, icon, by: me(), at: now() } });
      sfx('pop'); toast(id ? '改好了' : '加上去了'); setTimeout(draw, 150);
    };
    $('#cd-del', m) && ($('#cd-del', m).onclick = async () => { if (await confirmBox(`刪掉「${x.name}」？`, '刪掉')) { S.store.updateCouple(S.cid, { [`cdates.${id}`]: S.store.DEL() }); setTimeout(draw, 150); } });
  };
  draw();
  m._onClose = () => render();
};

ACT.todoMore = () => { S.todoAll = !S.todoAll; render(); };
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

function embPalette(c) { if (c.pal) return c.pal; const fk = festKey(c); return fk ? 'F-' + fk : c.kind === 'collect' ? 'C' : (c.rarity || 'N'); }
function embSeed(c, hide) {
  const title = hide ? '神秘盲盒' : (c.title || '?');
  const h = hash(title);
  const ch = hide ? '?' : (c.mark || embChar(title));
  // 送卡的人可以自己選外框（shape）和底紋（pat），沒選就依卡名自動挑
  return { h, ch, kind: hide ? 'lattice' : (c.pat && EMB_KINDS.includes(c.pat) ? c.pat : EMB_KINDS[h % EMB_KINDS.length]), shape: c.frame != null && c.frame >= 0 ? c.frame % 4 : (h >>> 4) % 4, no: (h % 89) + 10 };
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
    ${!hide && c.series && c.at ? `<text x="30" y="226" font-size="6.2" letter-spacing="1.4" class="e-ink-f e-small">${F ? F.foot : esc(String(c.series).startsWith('wish:') ? '許願卡' : c.series)} · ${c.kind === 'collect' ? '珍藏' : R.name}</text>
    <text x="170" y="226.2" text-anchor="end" font-size="6.6" letter-spacing="1.1" font-weight="300" font-family="'Helvetica Neue', 'Noto Sans TC', sans-serif" class="e-ink-f e-date">${(() => { const d = new Date(c.at); return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`; })()}</text>`
    : `<text x="100" y="226" text-anchor="middle" font-size="6.5" letter-spacing="1.8" class="e-ink-f e-small">${F ? `${F.foot} · ${R.name} · ${new Date(c.at || now()).getFullYear()}` : `${c.kind === 'collect' ? '珍藏' : R.name + ' · ' + R.label} · ${EMB_NAMES[seed.kind]} · No.${seed.no}`}</text>`}
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
    fc.classList.toggle('flipped'); vibrate(10); sfx('flip');
    if (!orientAsked && window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === 'function') {
      orientAsked = true; DeviceOrientationEvent.requestPermission().catch(() => {});
    }
  });
  return () => { alive = false; cancelAnimationFrame(raf); window.removeEventListener('deviceorientation', onOrient); };
}
// ============================================================
//  節日／紀念限定圖騰：線描意象、收斂配色
// ============================================================

const TRAVEL_TM = { 行李打包券: 'suitcase', 行程決定權: 'map', 專屬攝影師: 'camera', 啟程紀念券: 'pin', 五站護照章: 'stamp', 十站環遊券: 'plane', 護照初章: 'globe', 舊地重遊券: 'mountain', 旅行出發券: 'compass' };
const FEST_BY_TITLE = {
  行李打包券: 'travel', 行程決定權: 'travel', 專屬攝影師: 'travel', 啟程紀念券: 'travel', 五站護照章: 'travel', 十站環遊券: 'travel', 護照初章: 'travel', 舊地重遊券: 'travel',
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
  miss:      { label: '想 你 限 定', foot: '想你系列', pat: 'hearts' },
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
  if (key === 'miss') {
    // 一顆大愛心包著小愛心，下面是心跳線
    return `<path d="M0 20 C-6 14 -25 3 -25 -10 C-25 -19 -18 -25 -10.5 -25 C-5.5 -25 -2 -22 0 -18 C2 -22 5.5 -25 10.5 -25 C18 -25 25 -19 25 -10 C25 3 6 14 0 20 Z" class="e-bg e-ink-s" stroke-width="1.6" stroke-linejoin="round"/>
      <path d="M0 8 C-4 5 -13 -1 -13 -8.5 C-13 -13 -9.5 -16 -6 -16 C-3 -16 -1 -14.2 0 -12 C1 -14.2 3 -16 6 -16 C9.5 -16 13 -13 13 -8.5 C13 -1 4 5 0 8 Z" class="e-acc-f e-ink-s" stroke-width="1"/>
      <path d="M-30 30 L-17 30 L-13 24 L-9 36 L-5 30 L5 30 L9 24 L13 36 L17 30 L30 30" class="e-ink-s" stroke-width="1.3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
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
  // travel：依卡片換不同旅行意象，預設羅盤
  const tm = (c && (c.tm || TRAVEL_TM[c.title])) || 'compass';
  if (tm !== 'compass') return travelMotif(tm);
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

function travelMotif(tm) {
  const S1 = (d, w = 1.4, cls = 'e-ink-s') => `<path d="${d}" class="${cls}" stroke-width="${w}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  if (tm === 'suitcase') return `<rect x="-24" y="-12" width="48" height="34" rx="5" class="e-bg e-ink-s" stroke-width="1.6"/>
    ${S1('M-9 -12 L-9 -20 Q-9 -23 -6 -23 L6 -23 Q9 -23 9 -20 L9 -12', 1.6)}
    <rect x="-14" y="-12" width="5" height="34" class="e-acc-f"/><rect x="9" y="-12" width="5" height="34" class="e-acc-f"/>
    ${S1('M-24 2 L24 2', .9)}<circle cx="-16" cy="26" r="3" class="e-bg e-ink-s" stroke-width="1.2"/><circle cx="16" cy="26" r="3" class="e-bg e-ink-s" stroke-width="1.2"/>`;
  if (tm === 'map') return `<path d="M-28 -18 L-10 -24 L10 -18 L28 -24 L28 20 L10 26 L-10 20 L-28 26 Z" class="e-bg e-ink-s" stroke-width="1.5" stroke-linejoin="round"/>
    ${S1('M-10 -24 L-10 20 M10 -18 L10 26', .9, 'e-acc-s')}
    ${S1('M-20 14 Q-12 0 -2 6 Q8 12 14 -4', 1.4)} <path d="M-20 14 Q-12 0 -2 6 Q8 12 14 -4" class="e-ink-s" stroke-width="0" fill="none"/>
    <path d="M18 -16 C24 -16 25 -9 18 -2 C11 -9 12 -16 18 -16 Z" class="e-acc-f e-ink-s" stroke-width="1.1"/><circle cx="18" cy="-11" r="2" class="e-ink-f"/>
    <circle cx="-20" cy="14" r="2" class="e-ink-f"/>`;
  if (tm === 'camera') return `<rect x="-26" y="-14" width="52" height="34" rx="6" class="e-bg e-ink-s" stroke-width="1.6"/>
    ${S1('M-12 -14 L-8 -21 L8 -21 L12 -14', 1.5)}
    <circle cx="0" cy="3" r="12" class="e-bg e-ink-s" stroke-width="1.6"/><circle cx="0" cy="3" r="7" class="e-acc-f e-ink-s" stroke-width="1"/><circle cx="-2.5" cy="0.5" r="2" class="e-bg"/>
    <rect x="16" y="-9" width="6" height="4" rx="1" class="e-ink-f"/><circle cx="-19" cy="-7" r="1.6" class="e-ink-f"/>`;
  if (tm === 'pin') return `<ellipse cx="0" cy="28" rx="16" ry="4" class="e-acc-s" stroke-width="1.2"/>
    <path d="M0 26 C-4 14 -20 4 -20 -10 C-20 -22 -11 -30 0 -30 C11 -30 20 -22 20 -10 C20 4 4 14 0 26 Z" class="e-bg e-ink-s" stroke-width="1.6"/>
    <circle cx="0" cy="-10" r="8" class="e-acc-f e-ink-s" stroke-width="1.2"/>`;
  if (tm === 'stamp') {
    let s = `<rect x="-24" y="-28" width="48" height="56" class="e-bg e-ink-s" stroke-width="1.4"/>`;
    for (let i = 0; i < 7; i++) { const y = -28 + i * 9.33; s += `<circle cx="-24" cy="${y.toFixed(1)}" r="2.2" class="e-bg"/><circle cx="24" cy="${y.toFixed(1)}" r="2.2" class="e-bg"/>`; }
    for (let i = 0; i < 6; i++) { const x = -24 + i * 9.6; s += `<circle cx="${x.toFixed(1)}" cy="-28" r="2.2" class="e-bg"/><circle cx="${x.toFixed(1)}" cy="28" r="2.2" class="e-bg"/>`; }
    return s + `<rect x="-17" y="-21" width="34" height="42" class="e-acc-s" stroke-width=".9"/>
      ${S1('M-14 12 L-5 -2 L1 6 L7 -6 L14 12 Z', 1.3)}<circle cx="8" cy="-13" r="3.5" class="e-acc-f"/>
      <text x="0" y="19" text-anchor="middle" font-size="7" class="e-ink-f e-small">V</text>`;
  }
  if (tm === 'plane') return `${S1('M-32 22 Q-16 30 2 14', 1.2, 'e-acc-s')}<path d="M-32 22 Q-16 30 2 14" class="e-acc-s" stroke-width="1.2" fill="none" stroke-dasharray="2 3"/>
    <path d="M24 -20 L28 -24 C30 -26 32 -24 30 -22 L26 -18 L28 6 L23 9 L16 -10 L4 2 L5 10 L1 13 L-2 4 L-11 1 L-8 -3 L0 -2 L12 -14 L-7 -21 L-4 -26 Z" class="e-bg e-ink-s" stroke-width="1.4" stroke-linejoin="round"/>
    <circle cx="-26" cy="-20" r="1.5" class="e-ink-f"/><circle cx="20" cy="22" r="1.2" class="e-ink-f"/>`;
  if (tm === 'globe') return `<circle cx="0" cy="0" r="27" class="e-bg e-ink-s" stroke-width="1.6"/>
    <ellipse cx="0" cy="0" rx="12" ry="27" class="e-acc-s" stroke-width="1"/><ellipse cx="0" cy="0" rx="22" ry="27" class="e-acc-s" stroke-width=".7"/>
    ${S1('M-27 0 L27 0 M-24 -12 L24 -12 M-24 12 L24 12 M0 -27 L0 27', .9, 'e-acc-s')}
    ${S1('M-30 -30 Q0 -44 30 -30', 1.1)}<circle cx="30" cy="-30" r="2.4" class="e-ink-f"/>`;
  // mountain：山與海浪
  return `<circle cx="14" cy="-16" r="7" class="e-acc-f"/>
    <path d="M-30 14 L-12 -16 L-2 -2 L8 -14 L28 14 Z" class="e-bg e-ink-s" stroke-width="1.6" stroke-linejoin="round"/>
    ${S1('M-17 -8 L-12 -16 L-7 -9 M4 -9 L8 -14 L12 -9', 1.1, 'e-acc-s')}
    ${S1('M-30 22 Q-24 17 -18 22 T-6 22 T6 22 T18 22 T30 22', 1.4)}${S1('M-24 29 Q-18 25 -12 29 T0 29 T12 29 T24 29', 1, 'e-acc-s')}`;
}
// ============================================================
//  收藏冊封面：每個系列一張圖騰風格的橫式封面
// ============================================================

const WISH_SERIES = '許願系列';
const BOOK_META = {
  [D.BIRTHDAY_SERIES]: { pal: 'C', motif: 'candle', pat: 'sparkle', sub: '25 歲生日限定', how: '他加入時就會收到整套生日卡' },
  '節日系列': { pal: 'F-anniv', motif: 'stars', pat: 'rings', sub: '節日與紀念日限定', how: '生日、週年、情人節、聖誕、新年當天自動掉落' },
  '旅行系列': { pal: 'F-travel', motif: 'compass', pat: 'grid', sub: '旅途中的里程碑', how: '存旅行基金、記錄足跡、第一次出國、舊地重遊都會掉卡' },
  '想你系列': { pal: 'F-miss', motif: 'heart', pat: 'hearts', sub: '按下想你的累積', how: '按想你累計 100、520、1314 次，對方會收到一張' },
  '成就系列': { pal: 'SSR', motif: 'stars', pat: 'rings', sub: '金色成就的紀念', how: '解鎖金色成就時，兩人各掉一張' },
  [WISH_SERIES]: { pal: 'W', motif: 'wish', pat: 'sparkle', sub: '許願池實現的願望', how: '在許願池許願，對方點頭就會收進來' },
};

function bookMotif(kind) {
  const star = (x, y, r, cls = 'e-ink-f') => `<path d="M${x} ${y - r} L${x + r * .26} ${y - r * .26} L${x + r} ${y} L${x + r * .26} ${y + r * .26} L${x} ${y + r} L${x - r * .26} ${y + r * .26} L${x - r} ${y} L${x - r * .26} ${y - r * .26} Z" class="${cls}"/>`;
  if (kind === 'candle') {
    return `<ellipse cx="0" cy="30" rx="20" ry="4.5" class="e-ink-s" stroke-width="1.2"/>
      <rect x="-7" y="-4" width="14" height="34" rx="2.5" class="e-bg e-ink-s" stroke-width="1.5"/>
      <path d="M-7 5 L7 -1 M-7 15 L7 9 M-7 25 L7 19" class="e-acc-s" stroke-width="1.6"/>
      <path d="M0 -4 L0 -10" class="e-ink-s" stroke-width="1.3" stroke-linecap="round"/>
      <path d="M0 -33 C7 -25 7 -16 0 -11 C-7 -16 -7 -25 0 -33 Z" class="e-acc-f e-ink-s" stroke-width="1.2"/>
      <path d="M0 -25 C2.5 -21 2.5 -16 0 -14 C-2.5 -16 -2.5 -21 0 -25 Z" class="e-ink-f"/>
      ${star(-22, -22, 5)}${star(21, -12, 4)}<circle cx="-17" cy="4" r="1.3" class="e-ink-f"/><circle cx="19" cy="10" r="1.1" class="e-ink-f"/>`;
  }
  if (kind === 'stars') {
    return `${star(-2, 0, 22, 'e-bg e-ink-s')}${star(-2, 0, 22, 'e-acc-f')}
      <path d="M-2 -22 L3.7 -5.7 L20 0 L3.7 5.7 L-2 22 L-7.7 5.7 L-24 0 L-7.7 -5.7 Z" class="e-ink-s" stroke-width="1.4" fill="none" stroke-linejoin="round"/>
      ${star(22, -22, 8)}${star(-24, 22, 6)}<circle cx="24" cy="18" r="1.6" class="e-ink-f"/><circle cx="-24" cy="-20" r="1.3" class="e-ink-f"/>`;
  }
  if (kind === 'compass') return festMotif('travel');
  if (kind === 'heart') return festMotif('miss');
  // wish：流星
  const pts = Array.from({ length: 10 }, (_, i) => { const a = (i * 36 - 90) * Math.PI / 180, r = i % 2 ? 6.5 : 15; return `${(10 + Math.cos(a) * r).toFixed(1)},${(-10 + Math.sin(a) * r).toFixed(1)}`; }).join(' ');
  return `<path d="M-34 30 Q-14 22 -2 4" class="e-acc-s" stroke-width="2.2" fill="none" stroke-linecap="round"/>
    <path d="M-36 18 Q-18 14 -5 -1" class="e-acc-s" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-dasharray="1 4"/>
    <path d="M-24 36 Q-8 26 2 9" class="e-acc-s" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-dasharray="1 4"/>
    <polygon points="${pts}" class="e-bg e-ink-s" stroke-width="1.5" stroke-linejoin="round"/>
    <circle cx="10" cy="-10" r="3" class="e-acc-f"/>
    ${star(-22, -24, 4)}${star(28, 18, 5)}<circle cx="26" cy="-26" r="1.3" class="e-ink-f"/>`;
}

// 封面 SVG：state = { title, sub, got, total, slogan, sloganOn, empty }
function bookCoverSVG(meta, st) {
  const id = 'bc' + (++embSeq);
  const pct = st.total ? st.got / st.total : 0;
  const tl = Array.from(st.title).length;
  const tfs = Math.min(24, Math.floor(150 / Math.max(tl, 1)));
  const corner = (x, y, sx, sy) => `<path d="M${x} ${y + sy * 12} A12 12 0 0 ${sx * sy > 0 ? 1 : 0} ${x + sx * 12} ${y}" class="e-ink-s" stroke-width=".8"/><circle cx="${x + sx * 3.5}" cy="${y + sy * 3.5}" r="1.5" class="e-ink-f"/>`;
  let ring = `<circle cx="80" cy="96" r="54" class="e-bg e-ink-s" stroke-width="1.4"/><circle cx="80" cy="96" r="49" class="e-acc-s" stroke-width=".8"/>`;
  for (let i = 0; i < 24; i++) { const a = i * 15 * Math.PI / 180; ring += `<circle cx="${(80 + Math.sin(a) * 59).toFixed(1)}" cy="${(96 - Math.cos(a) * 59).toFixed(1)}" r="${i % 6 ? .8 : 1.6}" class="e-ink-f"/>`; }
  return `<svg viewBox="0 0 330 192" class="book-svg" xmlns="http://www.w3.org/2000/svg">
    <defs>${festPattern(meta.pat, id)}</defs>
    <rect width="330" height="192" class="e-bg"/>
    <rect width="330" height="192" fill="url(#${id})" opacity=".7"/>
    <rect x="7" y="7" width="316" height="178" rx="10" class="e-ink-s" stroke-width=".9"/>
    <rect x="11.5" y="11.5" width="307" height="169" rx="7" class="e-acc-s" stroke-width=".6"/>
    ${corner(11.5, 11.5, 1, 1)}${corner(318.5, 11.5, -1, 1)}${corner(11.5, 180.5, 1, -1)}${corner(318.5, 180.5, -1, -1)}
    ${ring}
    <g transform="translate(80 96) scale(1.15)" ${st.empty ? 'opacity=".45"' : ''}>${bookMotif(meta.motif)}</g>
    <rect x="150" y="36" width="156" height="122" rx="8" class="e-bg" opacity=".82"/>
    <text x="162" y="58" font-size="9" letter-spacing="2.4" class="e-ink-f e-small">${esc(st.sub)}</text>
    <text x="162" y="${86 + tfs * .1}" font-size="${tfs}" class="e-ink-f e-title">${esc(st.title)}</text>
    <line x1="162" y1="98" x2="294" y2="98" class="e-ink-s" stroke-width=".7"/>
    ${st.slogan ? `<text x="162" y="118" font-size="12" class="e-ink-f e-title" ${st.sloganOn ? '' : 'opacity=".35" style="filter:blur(2.5px)"'}>${esc(st.slogan)}</text>` : ''}
    ${st.empty ? `<text x="162" y="142" font-size="10" class="e-ink-f e-small" opacity=".75">尚未收集</text>`
      : `<text x="162" y="148" font-size="10" letter-spacing="1" class="e-ink-f e-small">已收集 ${st.got} 張</text>`}
  </svg>`;
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
  if ((c.spice || 1) > 1) meta.push(`<span class="chip">${spiceIc(c.spice)}</span>`);
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
    return `<div class="page-title"><h2><i data-ic="ticket"></i> 票夾</h2><span>${list('cards').filter((c) => c.owner === me() && c.kind !== 'collect' && remaining(c) > 0 && !isExpired(c)).length} 種可以用</span></div>
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
  // 排序：稀有度（高到低）／拿到的日期新到舊／舊到新，記在這台手機
  const sort = localStorage.getItem('park-wsort') || 'rarity';
  cards.sort((a, b) => sort === 'old' ? a.at - b.at : sort === 'new' ? b.at - a.at : (rarityRank(b.rarity) - rarityRank(a.rarity) || b.at - a.at));
  return `
    ${fresh.length ? `<div class="card"><h3><i data-ic="sparkle"></i> 新票券 <span class="sub">刮開看看是什麼</span></h3>
      <div class="new-tickets">${fresh.map((c) => `<button class="scratch-thumb" data-act="scratch" data-id="${c.id}"><span class="q">?</span>刮刮卡<span class="small">${c.from === 'sys' ? '遊樂園送的' : '來自 ' + esc(nick(c.from))}</span></button>`).join('')}</div></div>` : ''}
    <button class="btn block" data-act="giveCard" style="margin-bottom:14px"><i data-ic="letter"></i> 發一張卡給 ${esc(nick(partner()))}</button>
    ${typeof mySched === 'function' && mySched().length ? `<div class="sched-list"><div class="small muted">預約中的卡（對方還看不到）</div>${mySched().map((x) => `<button class="sched-i" data-act="schedEdit" data-id="${x.id}"><b>${esc(x.t.title)}</b><span>${+x.day.slice(5, 7)}/${+x.day.slice(8)} 送到 · 改／取消 ›</span></button>`).join('')}</div>` : ''}
    <div class="seg">${[['ok', '可以用'], ['used', '用過的'], ['all', '全部']].map(([k, n]) => `<button class="${filter === k ? 'on' : ''}" data-act="walletFilter" data-f="${k}">${n}</button>`).join('')}</div>
    <div class="wsort"><span class="small muted">排序</span>${[['rarity', '稀有度'], ['new', '最新拿到'], ['old', '最早拿到']].map(([k, n]) => `<button class="${sort === k ? 'on' : ''}" data-act="walletSort" data-s="${k}">${n}</button>`).join('')}</div>
    ${cards.length ? cards.map((c) => ticketHTML(c)).join('') : `<div class="empty"><span class="big"><i data-ic="ticket"></i></span>${filter === 'ok' ? '目前沒有可以用的票券<br>去遊樂區扭蛋，或許個願吧' : '這裡空空的'}</div>`}`;
}
ACT.walletFilter = (el) => { S.walletFilter = el.dataset.f; render(); };
ACT.walletSort = (el) => { localStorage.setItem('park-wsort', el.dataset.s); render(); };

function walletSent() {
  const sent = list('cards').filter((c) => c.from === me() && c.owner !== me() && c.kind !== 'collect').sort((a, b) => b.at - a.at);
  return `<p class="small muted" style="margin:0 0 10px">你送給 ${esc(nick(partner()))} 的票券。對方兌換的時候，你會收到通知，記得兌現喔</p>
    ${sent.length ? sent.map((c) => ticketHTML({ ...c, mystery: false }, { showFrom: false, act: 'openSent' })).join('') : '<div class="empty"><span class="big"><i data-ic="letter"></i></span>還沒送出任何票券</div>'}`;
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
  setTimeout(() => sfx('pop'), 500);
  const R = D.RARITY[t.rarity] || D.RARITY.N;
  const el = document.createElement('div');
  el.className = 'send-anim';
  el.innerHTML = `<div class="sa-stage" id="sa-st">
      <div class="sa-flap" id="sa-fl"></div>
      <div class="sa-env-back"></div>
      <div class="sa-card" id="sa-cd" style="--rc:${R.color}"><div class="sa-stub" style="${t.rarity === 'SSR' ? 'background:var(--ssr-grad);color:#4a2508' : ''}">${R.name}</div>
        <div class="sa-body">${t.mystery ? '神秘盲盒' : esc(t.title)}</div></div>
      <div class="sa-env-front"></div>
      <div class="sa-seal" id="sa-sl"><i data-ic="heart" class="ic-fill"></i></div>
    </div>
    <div class="sa-text" id="sa-tx">送給 ${esc(nick(to))} 了<small>等對方刮開吧</small></div>`;
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
  cardEditor({ title: `發卡給 ${nick(partner())}`, give: true }, async (t) => {
    const day = t.sendDay; delete t.sendDay;
    if (day && day > dkey()) {
      const id = Math.random().toString(36).slice(2, 10);
      if (t.expiresAt) { t.expDur = t.expiresAt - now(); t.expiresAt = 0; } // 限時從送到那天開始算
      await S.store.updateCouple(S.cid, { [`sched.${id}`]: { t: JSON.parse(JSON.stringify(t)), to: partner(), from: me(), day, at: now() } });
      sfx('pop'); toast(`預約好了，${+day.slice(5, 7)} 月 ${+day.slice(8)} 日會送到 ${nick(partner())} 的票夾`);
      return;
    }
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
    <p class="center small muted" style="margin:0">${c.from === 'sys' ? '遊樂園送你的' : esc(nick(c.from)) + ' 送你的'}，用手指刮開</p>
    <div class="scratch-area" id="sa">
      <div class="under" style="--rc:${R.color}">
        <div class="rk" style="color:${R.color}">${c.kind === 'collect' ? '珍藏' : R.name + ' · ' + R.label}</div>
        <div class="tt">${c.mystery ? '神秘盲盒' : esc(c.title)}</div>
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
  g.fillText('✦ 刮開看看 ✦', W / 2, H / 2 + 7);
  g.globalCompositeOperation = 'destination-out';
  let done = false, moves = 0, last = null;
  const reveal = async () => {
    if (done) return; done = true;
    cv.style.transition = 'opacity .5s'; cv.style.opacity = 0;
    vibrate([20, 30, 60]);
    if (c.rarity === 'SSR') { confetti(120, ['#f6d365', '#fda085', '#f093fb', '#8fd3f4']); sfx('sparkle'); vibrate([40, 30, 120]); } else { confetti(50); sfx('scratch'); vibrate(30); }
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
    sfx('chime'); vibrate([30, 40, 80]); petXP(3);
    if (c.mystery) $('#secret', m).innerHTML = `<div class="secret-reveal">盲盒揭曉：${esc(c.secret)}</div>`;
    hold.outerHTML = `<div class="ctx-cat jump">${catPose('jump')}</div><p class="center" style="font-weight:700">兌換成功！好好享受</p><button class="btn block" data-act="close">完成</button>`;
    await col('cards').update(c.id, { used: (c.used || 0) + 1, log: [...(c.log || []), { at: now(), how: 'redeem' }] });
    // 兌換時一定通知對方（系統送的卡也是）；對方那邊會跳出大卡片
    const to = c.from !== me() && c.from !== 'sys' ? c.from : partner();
    if (to) await col('events').add({ to, by: me(), type: 'redeem', text: `${nick(me())} 使用了一張票券`, detail: c.mystery ? `神秘盲盒：${c.secret}` : c.title, cardId: c.id, at: now(), read: false });
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
  const v = await promptBox('偷偷寫下盲盒內容', { placeholder: '對方兌換時才會看到…', value: c.secret || '', ok: '封存' });
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
  const st = { pending: '<i data-ic="hourglass"></i> 等待中', ok: '<i data-ic="sparkle"></i> 實現了', no: '<i data-ic="w_sleep"></i> 下次吧' };
  return `<div class="card center" style="background:linear-gradient(160deg,color-mix(in srgb,var(--r-sr) 22%,var(--card)),var(--card))">
      <div style="font-size:46px"><i data-ic="shooting"></i></div><h3 style="justify-content:center">許願池</h3>
      <p class="small muted" style="margin:0 0 10px">想要什麼票券，就對流星許願吧。${esc(nick(partner()))} 點頭，票券就會飛進你的票夾。</p>
      <button class="btn" data-act="makeWish">許一個願</button></div>
    ${theirs.length ? `<h3 style="margin:4px 2px 8px">${esc(nick(partner()))} 的願望</h3>${theirs.map((w) => `<div class="card"><div class="row"><span class="chip" style="color:var(--r-${w.rarity.toLowerCase()})">${w.rarity}</span><b class="grow" style="font-family:var(--serif)">${esc(w.title)}</b></div>
      ${w.note ? `<p class="small muted" style="margin:6px 0 0">${esc(w.note)}</p>` : ''}
      <div class="btn-row"><button class="btn ghost sm" data-act="wishNo" data-id="${w.id}">下次吧</button><button class="btn sm" data-act="wishOk" data-id="${w.id}"><i data-ic="sparkle"></i> 實現願望</button></div></div>`).join('')}` : ''}
    ${rest.length ? `<h3 style="margin:10px 2px 8px">願望紀錄</h3>${rest.map((w) => `<div class="list-row"><span class="lr-i">${w.by === me() ? '<i data-ic="star"></i>' : '<i data-ic="heart"></i>'}</span><span class="grow">${esc(w.title)}<div class="small muted">${esc(nick(w.by))} · ${fmtDate(w.at)}</div></span><span class="small">${st[w.status]}</span></div>`).join('')}` : ''}`;
}
ACT.makeWish = () => {
  if (!partner()) return toast('對方加入後才能許願');
  cardEditor({ title: '許一個願' }, async (t) => {
    await col('wishes').add({ by: me(), title: t.title, desc: t.desc, rarity: t.rarity, spice: t.spice, mark: t.mark || '', status: 'pending', at: now() });
    await notify(partner(), 'wish', '有人在許願池許了願 🌠');
    toast('願望送出了 🌠');
  });
};
ACT.wishOk = async (el) => {
  const w = list('wishes').find((x) => x.id === el.dataset.id); if (!w) return;
  await giveCard(w.by, { title: w.title, desc: w.desc, rarity: w.rarity, spice: w.spice, mark: w.mark || '', series: WISH_SERIES });
  await col('wishes').update(w.id, { status: 'ok', doneAt: now() });
  await notify(w.by, 'wish', '你的願望實現了 ✨');
  await sendAnimation(w, w.by);
  setTimeout(() => wishFollowUp(w), 600);
};
async function wishFollowUp(w) {
  const m = openModal(`${mhead('<i data-ic="sparkle"></i> 願望實現了')}
    <p class="small muted" style="margin-top:0">「${esc(w.title)}」要順便記下來嗎？（都可以不選）</p>
    <label class="check-row"><input type="checkbox" id="wf-mem"> 記進時間軸</label>
    <label class="check-row"><input type="checkbox" id="wf-goal"> 加進 ${new Date().getFullYear()} 年度清單（標成已完成）</label>
    <button class="btn block mt" id="wf-ok">好</button>`, { center: true });
  $('#wf-ok', m).onclick = async () => {
    if ($('#wf-mem', m).checked) await col('memories').add({ title: `願望實現：${w.title}`, date: dkey(), kind: 'gift', note: '', by: me(), at: now() });
    if ($('#wf-goal', m).checked) await col('goals').add({ title: w.title, year: new Date().getFullYear(), done: true, doneAt: now(), by: me(), at: now() });
    closeModal(m);
    if ($('#wf-mem', m).checked || $('#wf-goal', m).checked) toast('記下來了');
  };
}
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
  return `<div class="card center"><div style="font-size:40px"><i data-ic="flask"></i></div><h3 style="justify-content:center">合成工坊</h3>
      <p class="small muted" style="margin:0">挑 ${n} 張<b>同稀有度</b>、不想要的票券，合成 1 張高一級的隨機卡（從卡池抽，由 ${esc(nick(partner()))} 兌現）</p></div>
    <div class="craft-bar card">
      <div class="row"><div class="grow"><b style="font-family:var(--serif);font-size:17px">已選 ${total} / ${n}</b>${r ? ` <span class="chip" style="color:var(--r-${r.toLowerCase()})">${r}</span>` : ''}
        <div class="small muted">${r ? `合成後得到 1 張 ${to} 刮刮卡` : '先點一張卡開始選'}</div></div>
        ${total ? '<button class="small muted" data-act="craftClear">清除</button>' : ''}</div>
      <button class="btn block mt" data-act="craft" ${total === n && (partner() || trialOpen()) ? '' : 'disabled'}>${total === n ? `合成 1 張 ${to}` : `還要選 ${n - total} 張`}</button>
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
      : '<div class="empty"><span class="big"><i data-ic="flask"></i></span>目前沒有可以合成的票券</div>'}
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
  const m = openModal(`<div class="center" style="padding:20px 0"><div style="font-size:70px;animation:spin 1s linear infinite"><i data-ic="flask"></i></div><h2>合成中…</h2></div>`, { center: true });
  await sleep(1300);
  closeModal(m);
  const id = await giveCard(me(), tpl, { from: tpl.by && tpl.by !== 'sys' && tpl.by !== me() ? tpl.by : (partner() || 'sys') });
  await col('gacha').add({ uid: me(), rarity: tpl.rarity, title: tpl.title, how: 'craft', at: now() });
  if (tpl.mystery) await notify(partner(), 'mystery', '有一張神秘盲盒等你寫內容 🎁');
  toast(`合成成功！得到一張 ${to} 刮刮卡`);
  setTimeout(() => ACT.scratch({ dataset: { id } }), 500);
};

// ---------- 收藏冊 ----------
// 生日系列：每張卡兌換過一次才算收集到（集滿解鎖封面標語）；其他限定系列：收到就算收藏
function seriesCollected(c) {
  if (c.series && c.series !== D.BIRTHDAY_SERIES) return true;
  return c.kind === 'collect' || (c.log || []).some((l) => l.how !== 'craft');
}
function walletBook() {
  S.bookShut ||= {}; S.bookData = {};
  const ms = S.couple.members || [me()];
  // 節日、旅行卡兩人各一張，只看自己那份
  const all = list('cards').filter((c) => c.series && !((c.series === '節日系列' || c.series === '旅行系列' || SERIES_SLOTS[c.series]) && c.owner !== me()));
  // 許願系列依「誰許的願」分成兩本
  const keyOf = (c) => (c.series === WISH_SERIES ? `wish:${c.owner}` : c.series);
  const groups = {};
  all.forEach((c) => (groups[keyOf(c)] ||= []).push(c));
  const books = [
    { key: D.BIRTHDAY_SERIES, series: D.BIRTHDAY_SERIES, title: D.BIRTHDAY_SERIES },
    ...ms.map((u) => ({ key: `wish:${u}`, series: WISH_SERIES, title: `${nick(u)}的許願卡`, owner: u })),
    { key: '節日系列', series: '節日系列', title: '節日系列' },
    { key: '旅行系列', series: '旅行系列', title: '旅行系列' },
    { key: '約會系列', series: '約會系列', title: '約會系列' },
    { key: '小小黑系列', series: '小小黑系列', title: '小小黑系列' },
    { key: '想你系列', series: '想你系列', title: '想你系列' },
    { key: '成就系列', series: '成就系列', title: '成就系列' },
    ...Object.keys(groups).filter((k) => !k.startsWith('wish:') && !BOOK_META[k]).map((k) => ({ key: k, series: k, title: k })),
  ];
  const toc = [];
  const html = books.map((b, bi) => {
    const meta = BOOK_META[b.series] || BOOK_META['節日系列'];
    const cs = (groups[b.key] || []).sort((a, c) => (a.kind === 'collect' ? 1 : 0) - (c.kind === 'collect' ? 1 : 0) || rarityRank(a.rarity) - rarityRank(c.rarity) || a.at - c.at);
    const allSlots = SERIES_SLOTS[b.series] ? SERIES_SLOTS[b.series]() : null;
    const slots = allSlots ? allSlots.filter((x) => !cs.some((c) => (x.match ? x.match(c) : c.title === x.title))) : [];
    const got = allSlots ? allSlots.length - slots.length : cs.filter(seriesCollected).length;
    const isB = b.series === D.BIRTHDAY_SERIES;
    const empty = !cs.length;
    const shut = S.bookShut[b.key];
    const svg = bookCoverSVG(meta, {
      title: b.title, sub: meta.sub, got, total: allSlots ? allSlots.length : cs.length, empty: empty && !slots.length,
      slogan: isB ? `「${D.BIRTHDAY_SLOGAN}」` : '', sloganOn: isB && cs.length && got === cs.length,
    });
    // 拿到的照稀有度排前面，沒拿到的空卡套照稀有度排後面
    const rk = (x) => (x.kind === 'collect' ? 99 : rarityRank(x.rarity));
    S.bookData[b.key] = { title: b.title, pal: meta.pal, isB, wish: b.series === WISH_SERIES,
      cards: [...cs].sort((a, c) => rk(a) - rk(c) || a.at - c.at), slots: [...slots].sort((a, c) => rk(a) - rk(c)) };
    const canOpen = !(empty && !slots.length);
    toc.push({ bi, pal: meta.pal, motif: meta.motif, name: b.title.replace('系列', '').replace('的許願卡', ' 許願'), got, total: allSlots ? allSlots.length : cs.length });
    return `<div class="book emb-${meta.pal}" id="bk-${bi}">
      <button class="book-cover2" ${canOpen ? `data-act="bookOpen" data-k="${esc(b.key)}"` : ''}>${svg}</button>
      <div class="book-note">${!canOpen ? esc(meta.how) : isB && got < cs.length ? '每張生日卡至少兌換一次，就會解鎖封面標語・點封面翻開' : `已收集 ${got} 張・點封面翻開`}</div>
    </div>`;
  }).join('');
  // 最上面的目錄：一排小徽章，點了跳到那一本
  const tocHTML = `<div class="book-toc">${toc.map((t) => `<button class="bt-item emb-${t.pal}" data-act="bookJump" data-i="${t.bi}">
      <svg viewBox="-44 -44 88 88" class="bt-medal"><circle r="41" class="e-bg e-ink-s" stroke-width="2"/><circle r="36" class="e-acc-s" stroke-width="1" fill="none"/><g transform="scale(.82)">${bookMotif(t.motif)}</g></svg>
      <b>${esc(t.name)}</b><small>${t.got} 張</small></button>`).join('')}</div>`;
  return tocHTML + html;
}
ACT.bookJump = (el) => {
  const b = document.getElementById('bk-' + el.dataset.i);
  if (b) window.scrollTo({ top: b.getBoundingClientRect().top + window.scrollY - 70, behavior: 'smooth' });
};
// 翻頁的卡冊：每頁 3×3 個卡套
const ALBUM_PER = 9;
ACT.bookOpen = (el) => {
  const B = S.bookData[el.dataset.k];
  if (!B) return;
  const items = [...B.cards.map((c) => ({ c })), ...B.slots.map((x) => ({ x }))];
  const pages = [];
  for (let i = 0; i < items.length; i += ALBUM_PER) pages.push(items.slice(i, i + ALBUM_PER));
  const cell = (it, n) => {
    if (it.x) return `<div class="alb-slot"><span class="alb-no">No.${String(n).padStart(2, '0')}</span><b>？</b><small>${esc(D.RARITY[it.x.rarity]?.label || '')}</small></div>`;
    const c = it.c, dim = false, used = c.kind !== 'collect' && remaining(c) === 0;
    return `<button class="alb-card emb-${embPalette(c)} ${dim ? 'dim' : ''}" data-id="${c.id}">${emblemSVG(c, c.mystery && remaining(c) > 0)}${used ? '<span class="alb-used">已兌換</span>' : ''}</button>`;
  };
  const m = openModal(`<button class="m-close db-close" data-act="close">✕</button>
    <div class="db-track">${pages.map((pg, pi) => `<section class="db-page alb-page">
      <div class="alb-head"><b>${esc(B.title)}</b><span>${pi + 1} / ${pages.length}</span></div>
      <div class="alb-grid">${pg.map((it, i) => cell(it, pi * ALBUM_PER + i + 1)).join('')}${Array.from({ length: ALBUM_PER - pg.length }, () => '<div class="alb-blank"></div>').join('')}</div>
    </section>`).join('')}</div>
    ${pages.length > 1 ? `<div class="db-nav"><button class="db-prev" aria-label="上一頁"><i data-ic="chevron"></i></button><div class="db-dots">${pages.map((_, i) => `<i data-p="${i}"></i>`).join('')}</div><button class="db-next" aria-label="下一頁"><i data-ic="chevron"></i></button></div>` : ''}`,
  { center: true, cls: `dex-book album emb-${B.pal}` });
  const tr = $('.db-track', m), n = pages.length;
  const cur = () => Math.round(tr.scrollLeft / tr.clientWidth);
  const go = (p) => tr.scrollTo({ left: Math.max(0, Math.min(n - 1, p)) * tr.clientWidth, behavior: 'smooth' });
  const dots = () => { if (n < 2) return; const c = cur(); $$('.db-dots i', m).forEach((d, i) => d.classList.toggle('on', i === c)); $('.db-prev', m).disabled = c === 0; $('.db-next', m).disabled = c === n - 1; };
  tr.addEventListener('scroll', () => { clearTimeout(tr._t); tr._t = setTimeout(dots, 60); }, { passive: true });
  if (n > 1) { $('.db-prev', m).onclick = () => { sfx('flip'); go(cur() - 1); }; $('.db-next', m).onclick = () => { sfx('flip'); go(cur() + 1); }; $$('.db-dots i', m).forEach((d) => d.onclick = () => go(+d.dataset.p)); }
  $$('.alb-card', m).forEach((b) => b.onclick = () => ACT.openCard(b));
  dots();
};
ACT.bookToggle = (el) => { const k = el.dataset.k; S.bookShut[k] = !S.bookShut[k]; render(); };
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
// extra：這一輪十連抽裡剛抽到、還沒存進紀錄的（新的在前面）
function pitySince(minRarity, extra = []) {
  const min = rarityRank(minRarity);
  const mine = [...extra.map((rarity) => ({ rarity })), ...list('gacha').filter((g) => g.uid === me() && g.how === 'gacha').sort((a, b) => b.at - a.at)];
  let n = 0;
  for (const g of mine) { if (rarityRank(g.rarity) >= min) break; n++; }
  return n;
}
function rollWithPity(extra = []) {
  const pitySinceX = (m) => pitySince(m, extra);
  let r = rollRarity();
  const pickFrom = (rs) => { const tot = sum(rs, (x) => D.RARITY[x].weight); let v = Math.random() * tot; for (const x of rs) { v -= D.RARITY[x].weight; if (v <= 0) return x; } return rs[0]; };
  if (pitySinceX('SSR') + 1 >= D.PITY.SSR) return 'SSR';
  if (pitySinceX('SR') + 1 >= D.PITY.SR && rarityRank(r) < rarityRank('SR')) return pickFrom(['SR', 'SSR']);
  if (pitySinceX('R') + 1 >= D.PITY.R && r === 'N') return pickFrom(['R', 'SR', 'SSR']);
  return r;
}

// 卡池裡標記「只能由誰兌現」的卡（舊空間的卡沒有欄位，就用卡名對照）
const GIVER_BY_TITLE = Object.fromEntries(D.POOL.filter((p) => p.giver).map((p) => [p.title, p.giver]));
const poolGiver = (p) => (p.giver !== undefined ? p.giver : GIVER_BY_TITLE[p.title] || '');
function drawFromPool(rarity, exact = false, exclude = '') {
  const lv = spiceLevel();
  const ful = partner();
  const role = ful ? prof(ful).role : '';
  // 火辣級的卡一直都抽得到；兩人沒開火辣時，卡面蓋住變「？」
  const pool = list('pool').filter((p) => ((p.spice || 1) <= lv || (p.spice || 1) >= 3) && p.title !== exclude && (!poolGiver(p) || !role || poolGiver(p) === role));
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
    return `<div class="page-title"><h2><i data-ic="gacha"></i> 遊樂區</h2><span><i data-ic="coin"></i> ${balance(me())} 點${tickets(me()) ? ` · <i data-ic="ticket"></i> ${tickets(me())}` : ''}</span></div>
    <div class="game-tiles">
      ${hotTileHTML()}
      <button class="game-tile wide" data-act="gacha" style="background:linear-gradient(135deg,color-mix(in srgb,var(--accent) 22%,var(--card)),var(--card))">
        <span class="gi" style="font-size:44px"><i data-ic="gacha" data-medal></i></span><div class="grow"><b>扭蛋機</b><br><span>${D.POINTS.gachaCost} 點扭一次 · SSR 機率 ${D.RARITY.SSR.weight}%</span></div><span style="font-size:22px">›</span></button>
      <button class="game-tile" data-act="fate"><span class="gi"><i data-ic="ferris" data-medal></i></span><b>命運轉盤</b><span>${fateUsed ? '這週轉過了' : '每週免費一次！'}</span>${fateUsed ? '' : '<span class="badge-dot">1</span>'}</button>
      <button class="game-tile" data-act="food"><span class="gi"><i data-ic="dining" data-medal></i></span><b>今天吃什麼</b><span>選擇障礙救星</span></button>
      <button class="game-tile" data-act="tod"><span class="gi"><i data-ic="dice" data-medal></i></span><b>真心話大冒險</b><span>輪流抽題，誰都逃不掉</span></button>
      <button class="game-tile" data-act="quiz"><span class="gi"><i data-ic="minds" data-medal></i></span><b>默契問答</b><span>${quizNew ? '今天的題目來了' : (q && p && q.answers[p] ? '看結果' : '等對方作答')}</span>${quizNew ? '<span class="badge-dot">!</span>' : ''}</button>
      <button class="game-tile wide" data-act="dex"><span class="gi"><i data-ic="book" data-medal></i></span><div class="grow"><b>小動物圖鑑</b><br><span>已經遇到 ${dexCount()} 位朋友，牠們會偶爾路過首頁</span></div><span style="font-size:22px">›</span></button>
      <button class="game-tile wide" data-act="battle"><span class="gi"><i data-ic="swords" data-medal></i></span><div class="grow"><b>對戰挑戰</b><br><span>${bt ? `進行中：${esc(bt.task)}` : '一週內誰先完成？輸的人發卡'}</span></div><span style="font-size:22px">›</span></button>
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
  const m = openModal(`${mhead('<i data-ic="gacha"></i> 扭蛋機')}
    <div class="gacha-machine" id="gm"><div class="gm-cat">${catPose('wave')}</div><div class="gm-dome">${balls}</div><div class="gm-base"><div class="gm-knob" id="kn"></div><div class="gm-slot"></div><div class="gm-out" id="go"></div></div></div>
    <div id="gres"></div>
    <div id="gbtns">
      <div class="btn-row"><button class="btn" id="g-pt">扭一次（${D.POINTS.gachaCost} 點）</button>${tickets(me()) ? `<button class="btn gold" id="g-tk">用扭蛋券 <i data-ic="ticket"></i>${tickets(me())}</button>` : ''}</div>
      <button class="btn block g10-btn" id="g-10"><b>十連抽</b>（${D.POINTS.gachaCost * 10} 點）<span class="g10-gift">多送 1 抽</span></button>
      ${tickets(me()) >= 10 ? `<button class="btn gold block g10-btn tk" id="g-10t"><b>十連抽</b>（扭蛋券 10 張）<span class="g10-gift">多送 1 抽</span></button>` : ''}
      <p class="center small muted">我的點數：<i data-ic="coin"></i> ${balance(me())} · 機率 N ${D.RARITY.N.weight}% / R ${D.RARITY.R.weight}% / SR ${D.RARITY.SR.weight}% / SSR ${D.RARITY.SSR.weight}%</p>
    </div>`, { center: true });
  const go = async (useTicket) => {
    if (useTicket) { if (tickets(me()) < 1) return toast('沒有扭蛋券'); }
    else if (balance(me()) < D.POINTS.gachaCost) return toast(`點數不夠，還差 ${D.POINTS.gachaCost - balance(me())} 點`);
    $('#gbtns', m).innerHTML = '';
    m.dataset.busy = '1';
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
    col('gacha').add({ uid: me(), rarity, title: tpl.title, how: 'gacha', at: now() });
    if (tpl.mystery && partner()) notify(partner(), 'mystery', '有一張神秘盲盒等你寫內容 🎁');
    delete m.dataset.busy;
    if (!document.body.contains(m)) return toast('抽到的卡放進票夾了');
    let rays = null;
    if (rarity === 'SSR') { rays = document.createElement('div'); rays.className = 'ssr-rays'; document.body.appendChild(rays); confetti(150, ['#f6d365', '#fda085', '#f093fb', '#8fd3f4', '#fff']); vibrate([60, 40, 60, 40, 200]); }
    else if (rarity === 'SR') confetti(80, ['#a66bf0', '#d6b4ff', '#fff']);
    sfx(rarity === 'SSR' ? 'sparkle' : rarity === 'SR' ? 'chime' : 'pop');
    if ((tpl.spice || 1) >= 3 && typeof hotDrawFx === 'function' && hotOn()) hotDrawFx();
    const bonus = await petGachaBonus();
    const card = { id, ...cardDoc(tpl, me(), from), scratched: true };
    $('#gres', m).innerHTML = `<div class="center" style="font-family:var(--serif);font-weight:900;font-size:${rarity === 'SSR' ? 30 : 22}px;color:${R.color}">${rarity === 'SSR' ? '✦ SSR 傳說降臨 ✦' : rarity === 'SR' ? '稀有！SR' : rarity + ' · ' + R.label}</div>
      <div class="reveal-card rarity-burst" style="--bc:${R.color};margin:10px 0">${ticketHTML(card, { act: '' })}</div>
      ${!tpl.mystery && list('cards').some((x) => x.id !== id && x.owner === me() && x.title === tpl.title && remaining(x) > 0) ? `<div class="dup-row"><span class="small">你已經有一張還沒用的「${esc(tpl.title)}」了</span><button class="btn sm ghost" data-act="dupToCan" data-id="${id}">換成一個罐罐</button></div>` : ''}
      ${tpl.mystery ? `<p class="small muted center">${esc(nick(partner()))} 會偷偷幫你寫盲盒內容</p>` : ''}
      ${bonus ? `<div class="bonus-acc"><span class="ba-cat">${petSVG(2, 'happy', bonus.id, { blink: false })}</span><div><b>額外掉落！</b><div class="small">${esc(petState().name)}的限定配件「${bonus.name}」</div></div></div>` : ''}
      <div class="btn-row"><button class="btn ghost" id="g-again">再扭一次</button><button class="btn" data-act="close">收下</button></div>`;
    $('#g-again', m).onclick = () => { rays && rays.remove(); closeModal(m); ACT.gacha(); };
    m._onClose = () => rays && rays.remove();
  };
  $('#g-pt', m).onclick = () => go(false);
  $('#g-10', m).onclick = () => go10(false);
  $('#g-10t', m) && ($('#g-10t', m).onclick = () => go10(true));
  // 十連抽：付 10 抽的點數，抽 11 張
  const go10 = async (useTicket) => {
    const cost = D.POINTS.gachaCost * 10;
    if (useTicket) { if (tickets(me()) < 10) return toast('扭蛋券不到 10 張'); }
    else if (balance(me()) < cost) return toast(`點數不夠，十連抽要 ${cost} 點，還差 ${cost - balance(me())} 點`);
    $('#gbtns', m).innerHTML = '';
    m.dataset.busy = '1';
    if (useTicket) await addTicket(me(), -10); else await addPoints(me(), -cost, '扭蛋：十連抽');
    $('#kn', m).style.transform = 'rotate(1080deg)';
    vibrate(30); await sleep(700);
    $('#gm', m).classList.add('shake'); vibrate([20, 30, 20, 30, 20, 30, 20]); await sleep(900);
    const batch = [], got = [], t0 = now();
    for (let i = 0; i < 11; i++) {
      const rarity = rollWithPity(batch);
      const tpl = drawFromPool(rarity, true);
      const from = tpl.by && tpl.by !== 'sys' && tpl.by !== me() ? tpl.by : (partner() || 'sys');
      const id = await giveCard(me(), tpl, { from, scratched: true });
      col('gacha').add({ uid: me(), rarity, title: tpl.title, how: 'gacha', at: t0 + i });
      if (tpl.mystery && partner()) notify(partner(), 'mystery', '有一張神秘盲盒等你寫內容 🎁');
      batch.unshift(rarity); got.push({ id, tpl, rarity, gift: i === 10 });
    }
    delete m.dataset.busy;
    if (!document.body.contains(m)) return toast('十連抽的卡都放進票夾了');
    const best = got.reduce((b, x) => (rarityRank(x.rarity) > rarityRank(b) ? x.rarity : b), 'N');
    let rays = null;
    if (best === 'SSR') { rays = document.createElement('div'); rays.className = 'ssr-rays'; document.body.appendChild(rays); confetti(150, ['#f6d365', '#fda085', '#f093fb', '#8fd3f4', '#fff']); vibrate([60, 40, 60, 40, 200]); }
    else if (best === 'SR') confetti(80, ['#a66bf0', '#d6b4ff', '#fff']); else confetti(40);
    if (got.some((x) => (x.tpl.spice || 1) >= 3) && typeof hotDrawFx === 'function' && hotOn()) setTimeout(hotDrawFx, 300);
    sfx(best === 'SSR' ? 'sparkle' : best === 'SR' ? 'chime' : 'pop');
    const bonus = await petGachaBonus();
    // 重複：手上已經有一張還沒用的同名卡（這一輪裡第二張以後也算）
    const ids = new Set(got.map((x) => x.id));
    const seen = new Set();
    got.forEach((x) => {
      if (x.tpl.mystery) return;
      const before = list('cards').some((c) => !ids.has(c.id) && c.owner === me() && c.title === x.tpl.title && remaining(c) > 0);
      x.dup = before || seen.has(x.tpl.title); seen.add(x.tpl.title);
    });
    const dups = got.filter((x) => x.dup);
    const R = D.RARITY[best];
    $('#gres', m).innerHTML = `<div class="center" style="font-family:var(--serif);font-weight:900;font-size:22px;color:${R.color}">十連抽 · 最高 ${best}${best === 'SSR' ? ' ✦' : ''}</div>
      <div class="g10-grid">${got.map((x, i) => { const C = D.RARITY[x.rarity]; return `<div class="g10-card r-${x.rarity} ${x.gift ? 'gift' : ''} ${(x.tpl.spice || 1) >= 3 && hotOn() ? 'hot' : ''}" data-i="${i}" style="--rc:${C.color};animation-delay:${i * 70}ms">
        <div class="g10-r">${x.rarity}</div><div class="g10-t">${esc(x.tpl.mystery ? '神秘盲盒' : (x.tpl.spice || 1) >= 3 && !hotOn() ? '？' : x.tpl.title)}</div>
        ${x.gift ? '<span class="g10-tag">送</span>' : x.dup ? '<span class="g10-tag dup">重複</span>' : ''}</div>`; }).join('')}</div>
      ${bonus ? `<div class="bonus-acc"><span class="ba-cat">${petSVG(2, 'happy', bonus.id, { blink: false })}</span><div><b>額外掉落！</b><div class="small">${esc(petState().name)}的限定配件「${bonus.name}」</div></div></div>` : ''}
      ${dups.length ? `<button class="btn ghost block mt" id="g10-can">重複的 ${dups.length} 張全部換成罐罐</button>` : ''}
      <div class="btn-row"><button class="btn ghost" id="g-again">再十連</button><button class="btn" data-act="close">收下</button></div>
      <p class="center small muted">卡都放進票夾了，到票夾刮開看看</p>`;
    // 換罐罐：一張一張換（點卡片看說明，裡面有按鈕），或重複的全部一次換
    const toCan = async (x) => {
      const c = list('cards').find((y) => y.id === x.id); if (!c || c.used || x.canned) return false;
      x.canned = true; x.saved = c;
      await col('cards').remove(c.id); await giveCan(me(), '', true);
      const t = $(`.g10-card[data-i="${got.indexOf(x)}"] .g10-tag`, m); if (t) t.textContent = '換罐罐';
      $(`.g10-card[data-i="${got.indexOf(x)}"]`, m)?.classList.add('canned');
      return true;
    };
    const refreshAll = () => {
      const left = dups.filter((x) => !x.canned).length, b = $('#g10-can', m);
      if (b) { b.textContent = left ? `重複的 ${left} 張全部換成罐罐` : `換好了，${petState().name}的罐罐變多了`; b.disabled = !left; }
    };
    $('#g10-can', m) && ($('#g10-can', m).onclick = async () => {
      let n = 0;
      for (const x of dups) if (await toCan(x)) n++;
      sfx('pop'); toast(`換了 ${n} 個罐罐`); refreshAll();
    });
    $$('.g10-card', m).forEach((el) => el.onclick = () => {
      const x = got[+el.dataset.i]; if (!x) return;
      const card = list('cards').find((y) => y.id === x.id) || { ...cardDoc(x.tpl, me(), 'sys'), id: x.id };
      const v = openModal(`${mhead(esc(x.tpl.mystery ? '神秘盲盒' : x.tpl.title))}
        <div style="margin:4px 0 10px">${ticketHTML({ ...card, scratched: true }, { act: '' })}</div>
        ${x.canned ? '<p class="center small muted">這張已經換成罐罐了</p><button class="btn ghost block" id="g1-undo">按錯了，復原</button>'
          : x.dup ? `<p class="center small muted">你已經有一張還沒用的「${esc(x.tpl.title)}」了</p><button class="btn block" id="g1-can">這張換成罐罐</button>`
          : '<p class="center small muted">已經放進票夾了</p>'}
        <button class="btn ghost block mt" data-act="close">回到十連抽</button>`, { center: true });
      $('#g1-undo', v) && ($('#g1-undo', v).onclick = async () => {
        x.id = await canUndo(x.saved); x.canned = false;
        const el2 = $(`.g10-card[data-i="${got.indexOf(x)}"]`, m); el2?.classList.remove('canned'); const tg = el2?.querySelector('.g10-tag'); if (tg) tg.textContent = '重複';
        sfx('pop'); toast('復原了，卡放回票夾'); refreshAll(); closeModal(v);
      });
      $('#g1-can', v) && ($('#g1-can', v).onclick = async () => { if (await toCan(x)) { sfx('pop'); toast('換成一個罐罐了'); } refreshAll(); closeModal(v); });
    });
    $('#g-again', m).onclick = () => { rays && rays.remove(); closeModal(m); ACT.gacha(); setTimeout(() => { const b = $(useTicket ? '#g-10t' : '#g-10'); b && b.click(); }, 400); };
    m._onClose = () => rays && rays.remove();
  };
  tapRun(m, '#gm', '#g-pt', '#g-again');   // 點扭蛋機也能扭
  $('#g-tk', m) && ($('#g-tk', m).onclick = () => go(true));
};

// 點圖示也能動：點轉盤中間、扭蛋機、骰子，等於按下面的按鈕（按鈕不能按時就不動）
function tapRun(m, sel, ...btns) {
  const el = $(sel, m); if (!el) return;
  el.classList.add('tap-run');
  el.addEventListener('click', () => {
    for (const s of btns) { const b = $(s, m); if (b && !b.disabled && b.offsetParent !== null) { b.click(); return; } }
  });
}

// ---------- 轉盤元件 ----------
// 轉盤：徽章風，顏色跟著主題（兩色交錯＋外圈遊樂園燈泡）
function wheelSVG(labels) {
  const n = labels.length, seg = 360 / n, cx = 150, cy = 150, R = 128;
  const pt = (a, r) => [cx + r * Math.sin(a * Math.PI / 180), cy - r * Math.cos(a * Math.PI / 180)];
  const base = n > 10 ? 11 : n > 7 ? 13 : 15;
  let s = `<svg viewBox="0 0 300 300" id="wh" class="wheel-svg">
    <circle cx="150" cy="150" r="148" class="wr-rim"/>
    <circle cx="150" cy="150" r="141" class="wr-rim2"/>`;
  for (let i = 0; i < 24; i++) { const [x, y] = pt(i * 15, 141); s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.2" class="wr-bulb ${i % 2 ? 'b2' : ''}"/>`; }
  s += `<circle cx="150" cy="150" r="${R + 4}" class="wr-edge"/>`;
  labels.forEach((l, i) => {
    const a0 = i * seg, a1 = (i + 1) * seg;
    const [x0, y0] = pt(a0, R), [x1, y1] = pt(a1, R);
    const cls = n % 2 && i === n - 1 ? 'c' : i % 2 ? 'b' : 'a';
    s += `<path d="M150 150 L${x0.toFixed(1)} ${y0.toFixed(1)} A${R} ${R} 0 ${seg > 180 ? 1 : 0} 1 ${x1.toFixed(1)} ${y1.toFixed(1)} Z" class="wseg ${cls}"/>`;
    const mid = a0 + seg / 2, [tx, ty] = pt(mid, R * 0.62);
    const [dx, dy] = pt(mid, R - 9);
    s += `<circle cx="${dx.toFixed(1)}" cy="${dy.toFixed(1)}" r="1.6" class="wdot"/>`;
    const txt = l.length > 9 ? l.slice(0, 8) + '…' : l;
    const fs = txt.length > 5 ? Math.max(9, Math.round(base * 5 / txt.length)) : base;
    s += `<text x="${tx.toFixed(1)}" y="${ty.toFixed(1)}" transform="rotate(${mid - 90} ${tx.toFixed(1)} ${ty.toFixed(1)})" text-anchor="middle" dominant-baseline="middle" font-size="${fs}" class="wtxt ${cls}">${esc(txt)}</text>`;
  });
  labels.forEach((_, i) => { const [x, y] = pt(i * seg, R); s += `<path d="M150 150 L${x.toFixed(1)} ${y.toFixed(1)}" class="wline"/>`; });
  s += `<circle cx="150" cy="150" r="44" class="wr-inner"/><circle cx="150" cy="150" r="38" class="wr-inner2"/>`;
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
  const m = openModal(`${mhead('<i data-ic="ferris"></i> 命運轉盤')}
    <p class="center small muted" style="margin:0">每週免費轉一次，看看這週的運氣</p>
    <div class="wheel-wrap"><div class="wheel-pointer"></div>${wheelSVG(W.map((x) => x.label))}<div class="wheel-hub"><i data-ic="ferris"></i></div></div>
    <div id="fres"></div>
    <button class="btn block" id="fgo" ${used ? 'disabled' : ''}>${used ? '這週已經轉過了，下週一再來' : '轉！'}</button>`, { center: true });
  tapRun(m, '.wheel-wrap', '#fgo');
  $('#fgo', m).onclick = async () => {
    $('#fgo', m).disabled = true;
    const ok = await S.store.coupleTx(S.cid, (c) => ((c.spins || {})[me()] === weekKey() ? null : { [`spins.${me()}`]: weekKey() }));
    if (!ok) return toast('這週已經轉過了');
    const idx = weightedIndex([20, 10, 12, 18, 20, 10, 8, 4]);
    vibrate(20);
    await spinTo($('#wh', m), W.length, idx);
    const r = W[idx];
    let msg = '';
    if (r.type === 'points') { await addPoints(me(), r.value, '命運轉盤'); msg = `獲得 ${r.value} 點`; }
    if (r.type === 'ticket') { await addTicket(me(), 1); msg = '獲得一張扭蛋券'; }
    if (r.type === 'hug') { msg = `去抱 ${nick(partner())} 10 秒 🤗`; await notify(partner(), 'card', `${nick(me())} 轉到了抱抱，準備被抱 🤗`); }
    if (r.type === 'card') {
      const tpl = drawFromPool(r.value, true);
      const from = partner() || 'sys';
      await giveCard(me(), tpl, { from, scratched: true });
      if (tpl.mystery) await notify(partner(), 'mystery', '有一張神秘盲盒等你寫內容 🎁');
      msg = `獲得 ${r.value} 卡「${tpl.mystery ? '神秘盲盒' : tpl.title}」`;
    }
    confetti(60);
    $('#fres', m).innerHTML = `<div class="prompt-card">${esc(msg)}</div>`;
    $('#fgo', m).textContent = '下週再來轉';
  };
};

// ---------- 今天吃什麼 ----------
ACT.food = () => {
  const foods = S.couple.food && S.couple.food.length ? S.couple.food : D.DEFAULT_FOOD;
  const m = openModal(`${mhead('<i data-ic="dining"></i> 今天吃什麼')}
    <div class="wheel-wrap"><div class="wheel-pointer"></div>${wheelSVG(foods)}<div class="wheel-hub"><i data-ic="dining"></i></div></div>
    <div id="fdres"></div>
    <div class="btn-row"><button class="btn ghost" id="fed">編輯選項</button><button class="btn" id="fsp">轉！</button></div>`, { center: true });
  tapRun(m, '.wheel-wrap', '#fsp');
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
    : seg.replace(/對方/g, asker).replace(/他(?!們)/g, asker).replace(/我(?!們)/g, asker))).join('');
  return `${answerer}，${out}`;
}
// levels：這副牌有哪幾級（遊樂區只有甜蜜；曖昧、火辣在火辣區）
ACT.tod = () => todModal({ levels: [1] });
function todModal({ levels, cls = '', key = 'park-tod-lv' }) {
  const ms = (S.couple.members || []).slice();
  let turn = ms.includes(localStorage.getItem('park-tod-turn')) ? localStorage.getItem('park-tod-turn') : me();
  const other = (u) => ms.find((x) => x !== u) || u;
  let lv = +(localStorage.getItem(key) || levels[levels.length - 1]);
  if (!levels.includes(lv)) lv = levels[0];
  const m = openModal(`${mhead('<i data-ic="dice"></i> 真心話大冒險')}
    ${levels.length > 1 ? `<div class="seg" id="tlv">${levels.map((l) => `<button data-l="${l}" class="${l === lv ? 'on' : ''}">${spiceIc(l)} ${D.SPICE[l].label}</button>`).join('')}</div>` : ''}
    ${ms.length > 1 ? `<div class="row" style="justify-content:center;gap:8px;margin-top:10px"><span class="small muted">輪到</span>
      <div class="seg" id="tturn" style="padding:0">${ms.map((u) => `<button data-u="${u}" class="${u === turn ? 'on' : ''}">${avatar(u)} ${esc(nick(u))}</button>`).join('')}</div></div>` : ''}
    <div class="dice" id="dc"><i data-ic="dice"></i></div>
    <div id="tres"></div>
    <div class="btn-row"><button class="btn ghost" data-k="truth">真心話</button><button class="btn" data-k="rand">讓骰子決定</button><button class="btn ghost" data-k="dare">大冒險</button></div>`, { center: true, cls });
  $$('#tlv button', m).forEach((b) => b.onclick = () => { lv = +b.dataset.l; localStorage.setItem(key, lv); $$('#tlv button', m).forEach((x) => x.classList.toggle('on', x === b)); });
  const setTurn = (u) => { turn = u; localStorage.setItem('park-tod-turn', u); $$('#tturn button', m).forEach((x) => x.classList.toggle('on', x.dataset.u === u)); };
  $$('#tturn button', m).forEach((b) => b.onclick = () => setTurn(b.dataset.u));
  tapRun(m, '#dc', '[data-k="rand"]');   // 點骰子＝讓骰子決定
  $$('[data-k]', m).forEach((b) => b.onclick = async () => {
    let k = b.dataset.k;
    if (k === 'rand') k = Math.random() < .5 ? 'truth' : 'dare';
    const dc = $('#dc', m);
    dc.classList.remove('roll'); void dc.offsetWidth; dc.classList.add('roll');
    vibrate([15, 30, 15, 30, 15]);
    $('#tres', m).innerHTML = '';
    await sleep(900);
    const pool = [];
    for (const l of levels) if (l <= lv) pool.push(...(k === 'truth' ? D.TRUTH : D.DARE)[l].map((t) => ({ t, l })));
    const pref = pool.filter((x) => x.l === lv);
    const x = Math.random() < .65 && pref.length ? pick(pref) : pick(pool);
    dc.innerHTML = ic(k === 'truth' ? 'chat' : 'w_fire');
    const answerer = turn, asker = other(turn);
    const show = (x) => {
      const txt = ms.length > 1 ? personalize(x.t, nick(asker), nick(answerer)) : x.t;
      $('#tres', m).innerHTML = `<div class="prompt-card"><div class="small muted" style="font-family:var(--sans)">${k === 'truth' ? '真心話' : '大冒險'} · ${spiceIc(x.l)} · ${esc(nick(answerer))} ${k === 'truth' ? '回答' : '挑戰'}</div>${esc(txt)}</div>
        ${cls.includes('hot-zone') && typeof hotSecs === 'function' && hotSecs(txt) ? `<button class="btn block ghost hd-timer" id="t-timer"><i data-ic="hourglass"></i> 開始倒數</button>` : ''}
        <div class="center"><button class="link" id="t-swap" style="margin-top:8px">換一題（兩個人都同意才換）</button></div>`;
      $('#t-timer', m) && ($('#t-timer', m).onclick = () => hotTimer(hotSecs(txt), txt, true));
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
  let sel;   // 還沒送出前先選，可以改、可以取消
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
    const html = `${mhead('<i data-ic="minds"></i> 默契問答')}
      <p class="small muted" style="margin:0 0 8px">兩人各自作答，答案一樣兩人都拿 ${D.POINTS.quizMatch} 點。目前默契度 ${rate}%（${done.length} 題）</p>
      <div style="font-family:var(--serif);font-size:20px;font-weight:800">${esc(Q.q)}</div>
      ${Q.opts.map((o, i) => `<button class="quiz-opt ${both && mine === i ? 'mine' : ''} ${both && theirs === i ? 'theirs' : ''} ${!both && (mine === undefined ? sel : mine) === i ? 'mine' : ''}" data-i="${i}" ${mine !== undefined ? 'disabled' : ''}>
        ${esc(o)}<span class="tags">${both ? `${mine === i ? avatar(me()) : ''}${theirs === i ? avatar(p) : ''}` : (mine === undefined ? sel : mine) === i ? '✓' : ''}</span></button>`).join('')}
      <div class="mt center">${both ? (mine === theirs ? `<div class="prompt-card"><i data-ic="heart"></i> 心有靈犀！兩人各 +${D.POINTS.quizMatch} 點</div>` : `<div class="prompt-card">不一樣！聊聊為什麼吧（各 +${D.POINTS.quizMiss} 點）</div>`)
        : mine !== undefined ? `<p class="muted">已作答，等 ${esc(nick(p))} 回答後揭曉 <i data-ic="lock"></i></p><button class="link" id="qz-redo">改答案</button>`
        : `${theirs !== undefined ? `<p class="muted">${esc(nick(p))} 已經答好了，換你！</p>` : ''}<div class="btn-row"><button class="btn ghost" id="qz-clear" ${sel === undefined ? 'disabled' : ''}>取消</button><button class="btn" id="qz-send" ${sel === undefined ? 'disabled' : ''}>送出答案</button></div>`}</div>`;
    if (!m) m = openModal(html, { center: true }); else m.querySelector('.modal').innerHTML = html;
    // 選答案：只改畫面，馬上有反應
    $$('[data-i]', m).forEach((b) => b.onclick = () => { sel = +b.dataset.i; vibrate(10); draw(m); });
    $('#qz-clear', m) && ($('#qz-clear', m).onclick = () => { sel = undefined; draw(m); });
    $('#qz-redo', m) && ($('#qz-redo', m).onclick = async () => {
      const cur = todayQuiz();
      if (p && (cur?.answers || {})[p] !== undefined) return draw(m);   // 對方剛好答完了，已經揭曉
      sel = mine;
      await col('quiz').update(dkey(), { [`answers.${me()}`]: S.store.DEL() });
      draw(m);
    });
    $('#qz-send', m) && ($('#qz-send', m).onclick = async (e) => {
      if (sel === undefined) return;
      e.currentTarget.disabled = true; e.currentTarget.textContent = '送出中…';
      const i = sel, id = dkey();
      const cur = todayQuiz();
      if (cur) await col('quiz').update(id, { [`answers.${me()}`]: i });
      else await col('quiz').set(id, { qi, answers: { [me()]: i }, at: now() });
      const th = p ? (cur?.answers || {})[p] : undefined;
      sfx('pop');
      if (th !== undefined) {
        const match = th === i;
        await col('quiz').update(id, { match });
        const pts = match ? D.POINTS.quizMatch : D.POINTS.quizMiss;
        await addPoints(me(), pts, '默契問答'); await addPoints(p, pts, '默契問答');
        fire(notify(p, 'quiz', match ? '默契問答：心有靈犀 💞' : '默契問答結果出爐了 🧠'));
        if (match) confetti(70);
      } else fire(notify(p, 'quiz', `${nick(me())} 答完今天的默契問答了，換你 🧠`));
      draw(m);
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
      <div style="font-size:44px"><i data-ic="swords"></i></div><h3 style="justify-content:center">${esc(b.task)}</h3>
      <p class="small muted" style="margin:0">${esc(nick(b.by))} 發起 · ${over ? '時間到了！' : `剩 ${Math.ceil(left / 86400000)} 天`}</p>
      <p class="small" style="margin:6px 0 0">輸的人要發一張卡給贏的人</p></div>
      ${b.status === 'claimed'
        ? (b.claimer === me() ? `<p class="center muted">等 ${esc(nick(p))} 確認中…</p>` : `<p class="center"><b>${esc(nick(b.claimer))}</b> 說自己完成了！</p><div class="btn-row"><button class="btn ghost" data-act="battleReject" data-id="${b.id}">還沒啦</button><button class="btn" data-act="battleJudge" data-id="${b.id}">確認對方贏了</button></div>`)
        : over ? `<button class="btn ghost block" data-act="battleDraw" data-id="${b.id}">都沒完成，平手收場</button>`
        : `<button class="btn block" data-act="battleClaim" data-id="${b.id}"><i data-ic="flag"></i> 我完成了！</button>`}`;
  } else {
    body = `<p class="small muted" style="margin-top:0">選一個挑戰，7 天內誰先完成誰贏，輸的人要發一張卡給贏的人。</p>
      ${battlePicks().map((t, i) => `<div class="bt-row"><button class="quiz-opt" data-act="battleNew" data-t="${esc(t)}">${esc(t)}</button>${battleSwapLeft() ? `<button class="bt-swap" data-act="battleSwapOne" data-s="${i}" aria-label="換掉這個"><i data-ic="swap"></i></button>` : ''}</div>`).join('')}
      <p class="small muted center" style="margin:2px 0 8px">${battleSwapLeft() ? '每個人每週可以換掉其中一個' : '這週已經換過了，下週一會有新的'}</p>
      <button class="quiz-opt" data-act="battleNew" data-t=""><i data-ic="edit"></i> 自己出題…</button>`;
  }
  closeAll();
  openModal(`${mhead('<i data-ic="swords"></i> 對戰挑戰')}
    <div class="row" style="justify-content:center;gap:18px;margin-bottom:12px;font-weight:800"><span>${avatar(me())} ${esc(nick(me()))} ${wins(me())} 勝</span><span class="muted">VS</span><span>${wins(p)} 勝 ${esc(nick(p))} ${avatar(p)}</span></div>
    ${body}
    ${hist.length ? `<h3 style="font-size:15px;margin-top:14px">對戰紀錄</h3>${hist.slice(0, 10).map((x) => `<div class="list-row"><span class="grow">${esc(x.task)}</span><span class="small">${x.status === 'draw' ? '平手' : '<i data-ic="trophy"></i> ' + esc(nick(x.winner))}</span><span class="when">${fmtDate(x.at)}</span></div>`).join('')}` : ''}`);
};
// 一次只給 5 個挑戰選，不想要可以換一批
// 一週固定 5 個；每個人每週可以換掉其中 1 個
function battlePickIdx() {
  const wk = weekKey(), base = shuffled(D.BATTLE_TASKS.map((_, i) => i), hash('bt' + wk + (S.cid || ''))).slice(0, 5);
  const ov = ((S.couple?.battleSwaps || {})[wk] || {}).ov || {};
  return base.map((v, i) => (ov[i] != null ? ov[i] : v));
}
function battlePicks() { return battlePickIdx().map((i) => D.BATTLE_TASKS[i]); }
const battleSwapLeft = () => !(((S.couple?.battleSwaps || {})[weekKey()] || {}).by || {})[me()];
ACT.battleSwapOne = async (el, e) => {
  e && e.stopPropagation();
  if (!battleSwapLeft()) return toast('這週已經換過一次了');
  const slot = +el.dataset.s, wk = weekKey(), cur = new Set(battlePickIdx());
  const cand = D.BATTLE_TASKS.map((_, i) => i).filter((i) => !cur.has(i));
  const ni = pick(cand);
  await S.store.updateCouple(S.cid, { [`battleSwaps.${wk}.ov.${slot}`]: ni, [`battleSwaps.${wk}.by.${me()}`]: true });
  toast('換好了，這週不能再換了'); setTimeout(ACT.battle, 300);
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
    <h3><i data-ic="stamp"></i> 集點章 <span class="sub">已集滿 ${Math.floor(n / per)} 張</span></h3>
    ${(() => { const recs = list('points').filter((p) => p.uid === me() && p.tag === 'stamp').sort((a, b) => a.at - b.at).slice(n - filled);
      return `<div class="stamp-sheet emb-C">${Array.from({ length: per }, (_, i) => `<div class="stamp-slot ${i < filled ? 'on' : ''}">${i < filled ? stampHTML(recs[i]) : `<span>${i + 1}</span>`}</div>`).join('')}</div>`; })()}
    <p class="small muted" style="margin:8px 0">集滿 ${per} 個章送一張扭蛋券${recent ? ` · 最近：${esc(recent.reason.replace('蓋章：', ''))}` : ''}</p>
    <button class="btn block" data-act="giveStamp">幫 ${esc(nick(partner()))} 蓋一個章</button>
  </div>`;
}
ACT.giveStamp = () => {
  const p = partner(); if (!p) return toast('對方加入後才能蓋章');
  const reasons = ['做家事', '好貼心', '哄我開心', '準時不遲到', '煮飯給我吃', '今天好可愛', '有乖乖', '幫我很多忙'];
  const m = openModal(`${mhead(`幫 ${esc(nick(p))} 蓋章`)}
    <p class="small muted" style="margin-top:0">為什麼要蓋這個章？</p>
    ${reasons.map((r) => `<button class="quiz-opt" data-r="${esc(r)}">${esc(r)}</button>`).join('')}
    <button class="quiz-opt" data-r=""><i data-ic="edit"></i> 自己寫…</button>`, { center: true });
  $$('[data-r]', m).forEach((b) => b.onclick = async () => {
    let r = b.dataset.r;
    if (!r) { closeModal(m); r = await promptBox('蓋章的原因', { placeholder: '例如：幫我按摩' }); if (!r) return; }
    else closeModal(m);
    await addStamp(p, '蓋章：' + r); petXP(3); sfx('stamp');
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
  return `<div class="card"><h3><i data-ic="clipboard"></i> 每週任務 <span class="sub">完成一項 +${D.POINTS.weeklyTask} 點</span></h3>
    ${weekTasks().map((t, i) => {
      const req = S.couple.taskSwapReq;
      const pending = req && req.wk === wk && req.i === i;
      const anyDone = done(i, me()) || (p && done(i, p));
      return `<div class="task ${done(i, me()) ? 'done' : ''}">
      <button class="ck" data-act="${done(i, me()) ? 'taskUndo' : 'taskDo'}" data-i="${i}">${done(i, me()) ? '✓' : ''}</button>
      <span class="tt">${esc(t)}${pending ? `<div class="small" style="color:var(--accent)">${req.by === me() ? '等對方同意換這項…' : esc(nick(req.by)) + ' 想換掉這項'}</div>` : ''}</span>
      <span class="small muted">${p && done(i, p) ? avatar(p) + '✓' : ''}</span>
      ${pending && req.by !== me() ? `<button class="btn sm ghost" data-act="taskSwapNo">不要</button><button class="btn sm" data-act="taskSwapOk">同意</button>`
        : pending ? `<button class="small muted" data-act="taskSwapNo">取消</button>`
        : !anyDone && p && !req && !Object.keys((S.couple.taskOverride || {})[wk] || {}).length ? `<button class="small muted" data-act="taskSwapReq" data-i="${i}">換</button>` : ''}</div>`;
    }).join('')}
    <p class="small muted" style="margin:6px 0 0">每週一換新任務。打錯可以再點一次取消；每週可以申請換一項，對方同意才換</p></div>`;
}
ACT.taskUndo = async (el) => {
  const i = +el.dataset.i, wk = weekKey(), t = weekTasks()[i];
  if (balance(me()) < D.POINTS.weeklyTask) return toast('這項的點數已經花掉了，沒辦法取消');
  if (!(await confirmBox(`取消「${t}」的打勾？\n加的 ${D.POINTS.weeklyTask} 點會扣回來`, '取消打勾'))) return;
  await col('taskDone').remove(`${wk}_${i}_${me()}`);
  await addPoints(me(), -D.POINTS.weeklyTask, '取消每週任務：' + t);
  toast('取消了');
};
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
  // 取消再打勾不會重複拿小小黑經驗和罐罐
  const first = await S.store.coupleTx(S.cid, (c) => ((c.drops || {})[`task-${wk}-${i}-${me()}`] ? null : { [`drops.task-${wk}-${i}-${me()}`]: true }));
  if (first) { petXP(3); maybeCan(me(), '完成了每週任務', .5); }
  setTimeout(weekTicketCheck, 800);
  confetti(30); toast(`+${D.POINTS.weeklyTask} 點`);
};
// ============================================================
//  🗺️ 旅行：旅行基金、足跡地圖
// ============================================================

PAGES.travel = {
  html() {
    const sub = S.sub.travel;
    const tabs = [['plan', '<i data-ic="clock"></i> 行程'], ['jar', '<i data-ic="gift"></i> 點子罐'], ['list', '<i data-ic="film"></i> 清單'], ['map', '<i data-ic="pin"></i> 足跡'], ['fund', '<i data-ic="coins"></i> 基金']];
    const cur = tabs.some(([k]) => k === sub) ? sub : 'plan';
    return `<div class="page-title"><h2><i data-ic="map"></i> 約會</h2><span>去過 ${list('trips').length} 個地方</span></div>
      <div class="seg seg-fit">${tabs.map(([k, n]) => `<button class="${cur === k ? 'on' : ''}" data-act="sub" data-page="travel" data-sub="${k}">${n}</button>`).join('')}</div>
      ${({ plan: datesPlan, jar: datesJar, list: datesList, map: travelMap, fund: travelFund }[cur])()}`;
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
      <span class="piggy" id="pig">${piggyEmblem(pct)}</span>
      <h3 style="justify-content:center">${esc(f.name)} <button class="small muted" data-act="fundEdit"><i data-ic="edit"></i></button></h3>
      <div class="fund-num">$${money(total)} <span class="small muted">/ $${money(f.goal)}</span></div>
      <div class="fund-bar"><div style="width:${pct}%"></div></div>
      <div class="small muted">${pct >= 100 ? '<i data-ic="sparkle"></i> 存滿了！旅行限定券已經發到兩人的票夾' : `還差 $${money(Math.max(0, f.goal - total))} · 存滿會掉一張旅行限定卡 <i data-ic="plane"></i>`}</div>
      <div class="row mt" style="justify-content:center;gap:20px">${ms.map((u) => `<div><div>${avatar(u, "av-md")}</div><b>$${money(sum(deps.filter((d) => d.uid === u), (d) => d.amt))}</b><div class="small muted">${esc(nick(u))}</div></div>`).join('')}</div>
      <div class="btn-row">${f.rewarded ? '<button class="btn ghost" data-act="fundNew">開始新的基金</button>' : ''}<button class="btn" data-act="deposit"><i data-ic="coins"></i> 存一筆</button></div>
    </div>
    <div class="card"><h3>存錢紀錄</h3>
      ${deps.length ? deps.sort((a, b) => b.at - a.at).slice(0, 30).map((d) => `<div class="list-row"><span class="lr-i">${avatar(d.uid)}</span><span class="grow">${esc(d.note || '存進基金')}<div class="small muted">${esc(nick(d.uid))}</div></span><b style="color:${d.amt >= 0 ? 'var(--accent)' : 'var(--muted)'}">${d.amt >= 0 ? '+' : ''}$${money(d.amt)}</b><span class="when">${fmtDate(d.at)}</span></div>`).join('')
        : '<div class="empty"><span class="big"><i data-ic="coin"></i></span>存下第一筆，旅行就開始了</div>'}
    </div>
    ${Object.keys(past).length ? `<div class="card"><h3>以前的基金</h3>${Object.entries(past).map(([r, x]) => `<div class="list-row"><span class="grow">${esc(x.name)}</span><b>$${money(x.total)}</b></div>`).join('')}</div>` : ''}`;
}
ACT.deposit = () => {
  const m = openModal(`${mhead('<i data-ic="coins"></i> 存一筆')}
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
    if (a > 0) { const k = `park-fundpet-${me()}-${dkey()}`; if (!localStorage.getItem(k)) { localStorage.setItem(k, '1'); petXP(2); setTimeout(() => toast(`${petState().name}叼了一枚硬幣丟進存錢筒`), 1200); } }
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
// 旅行限定卡掉落：key 只會掉一次，兩人各一張
async function travelDrop(key, tpl, text) {
  if (!S.couple || (S.couple.members || []).length < 2) return false;
  const ok = await S.store.coupleTx(S.cid, (c) => (c.drops && c.drops[key] ? null : { [`drops.${key}`]: true }));
  if (!ok) return false;
  for (const u of S.couple.members) {
    await col('cards').add(cardDoc({ ...tpl, fest: 'travel', series: '旅行系列' }, u, 'sys'));
    await col('events').add({ to: u, by: 'sys', type: 'trip', text, detail: tpl.title, at: now(), read: false });
  }
  return true;
}
const inTaiwan = (lat, lng) => lat >= 21.7 && lat <= 26.5 && lng >= 118.0 && lng <= 122.3;
async function checkTravelDrops() {
  if (!S.couple || (S.couple.members || []).length < 2 || !S.d.trips) return;
  const T = D.TRAVEL_DROPS, ts = countedTrips();
  if (ts.length >= 1) await travelDrop('trip1', T.trip1, '第一個足跡！旅行限定卡掉落 📍');
  if (ts.length >= 5) await travelDrop('trip5', T.trip5, '足跡滿 5 個！旅行限定卡掉落 🛂');
  if (ts.length >= 10) await travelDrop('trip10', T.trip10, '足跡滿 10 個！旅行限定卡掉落 ✈️');
  if (ts.some((t) => t.lat != null && !inTaiwan(t.lat, t.lng))) await travelDrop('abroad', T.abroad, '第一次出國的足跡！護照初章掉落 🌏');
  const d = new Date(), md = `${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, y = d.getFullYear();
  for (const t of ts) {
    if (!t.date || t.date.slice(5) !== md || +t.date.slice(0, 4) >= y) continue;
    if (await travelDrop(`revisit-${t.id}-${y}`, { ...T.revisit, desc: `${y - +t.date.slice(0, 4)} 年前的${t.name}，再一起回去一次` }, `${t.name}滿 ${y - +t.date.slice(0, 4)} 年了！舊地重遊券掉落 🏔️`)) break;
  }
  if (typeof travelExtraDrops === 'function') await travelExtraDrops(ts);
}
async function checkFund() {
  if (!S.couple || (S.couple.members || []).length < 2) return;
  const { f, total } = fundInfo();
  const r = f.round || 1, pct = f.goal ? total / f.goal : 0;
  const T = D.TRAVEL_DROPS;
  if (pct >= .25) await travelDrop(`fund${r}-25`, T.fund25, '旅行基金存到 25%！旅行限定卡掉落 🧳');
  if (pct >= .5) await travelDrop(`fund${r}-50`, T.fund50, '旅行基金存到一半了！旅行限定卡掉落 🗺️');
  if (pct >= .75) await travelDrop(`fund${r}-75`, T.fund75, '旅行基金存到 75%！旅行限定卡掉落 📷');
  if (f.rewarded || total < f.goal) return;
  const ok = await S.store.coupleTx(S.cid, (c) => (c.fund && !c.fund.rewarded ? { 'fund.rewarded': true, fundsDone: (c.fundsDone || 0) + 1 } : null));
  if (!ok) return;
  for (const u of S.couple.members) {
    await col('cards').add(cardDoc({ ...D.TRAVEL_CARD, title: (f.name || D.TRAVEL_CARD.title).slice(0, 14), desc: `存滿 $${money(f.goal)} 了，出發吧！` }, u, 'sys', { fundDone: f.name || '旅行基金', fundGoal: f.goal }));
    await col('events').add({ to: u, by: 'sys', type: 'fund', text: `「${f.name}」存滿了！掉落一張出發卡 ✈️`, at: now(), read: false });
  }
  confetti(140);
}

// ---------- 足跡地圖 ----------
function travelMap() {
  const ts = list('trips').sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  return `<div class="card" style="padding:8px"><div id="map-slot"></div></div>
    <button class="btn block" data-act="addTrip" style="margin-bottom:14px"><i data-ic="pin"></i> 新增一個足跡</button>
    ${ts.length ? ts.map((t) => `<div class="trip-item" data-act="openTrip" data-id="${t.id}">
      <div class="cover" style="${t.cover ? `background-image:url(${t.cover})` : ''}">${t.cover ? '' : '<i data-ic="pin"></i>'}</div>
      <div class="grow"><b>${esc(t.name)}</b><div class="small muted">${esc(t.date || '')}${t.dateEnd ? ' – ' + esc(t.dateEnd.slice(5)) : ''}${tripPhotos(t).length ? ` · ${tripPhotos(t).length} 張照片` : ''}</div><div class="small" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(t.note || '')}</div></div></div>`).join('')
      : '<div class="empty"><span class="big"><i data-ic="pin"></i></span>還沒有足跡，記下你們一起去過的地方吧</div>'}`;
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
    const icon = L.divIcon({ html: `<div class="map-pin">${ic('pin')}</div>`, className: '', iconSize: [20, 20] });
    L.marker([t.lat, t.lng], { icon }).addTo(S.mapLayer)
      .bindPopup(`${t.cover ? `<img src="${t.cover}">` : ''}<b>${esc(t.name)}</b><br><small>${esc(t.date || '')}</small>${(() => { const ps = list('photos').filter((p) => p.tripId === t.id); return ps.length ? `<div class="pop-photos">${ps.slice(0, 6).map((p) => `<span style="background-image:url('${p.img}')"></span>`).join('')}</div>` : ''; })()}`, { maxWidth: 240 });
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
  const m = openModal(`${mhead('<i data-ic="pin"></i> 新增足跡')}
    <label>地點名稱</label>
    <div class="row"><input id="tr-n" maxlength="30" placeholder="例如：京都・嵐山" class="grow"><button class="btn sm ghost" id="tr-s"><i data-ic="search"></i> 找</button></div>
    <label>在地圖上點一下標出位置（可以不標）</label>
    <div class="mini-map" id="tr-map"></div>
    <div class="row"><div class="grow"><label>日期</label><input id="tr-d" type="date" value="${t.date}"></div><div class="grow"><label>到哪天（可不填）</label><input id="tr-d2" type="date"></div></div>
    <p class="small muted" style="margin:4px 0 0">這段日子拍的照片，會自動收進這趟旅行</p>
    <label>封面照片（一張，會自動壓縮）</label>
    <label class="photo-pick" id="tr-pp" style="margin:0">點這裡選照片<input type="file" accept="image/*" id="tr-f" class="hidden"></label>
    <label>心得</label><textarea id="tr-t" maxlength="300" placeholder="這趟最難忘的是…"></textarea>
    <button class="btn block mt" id="tr-ok">記下來 +${D.POINTS.trip} 點</button>`);
  let mk = null, mm = null;
  const setPt = (lat, lng) => {
    t.lat = lat; t.lng = lng;
    if (!mm) return;
    if (mk) mk.setLatLng([lat, lng]); else mk = L.marker([lat, lng], { icon: L.divIcon({ html: `<div class="map-pin">${ic('pin')}</div>`, className: '', iconSize: [20, 20] }) }).addTo(mm);
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
    const d2 = $('#tr-d2', m).value; if (d2 && t.date && d2 > t.date) t.dateEnd = d2;
    if (!t.name) return toast('地點要有名字');
    $('#tr-ok', m).disabled = true;
    await col('trips').add({ ...t, by: me(), at: now() });
    for (const u of S.couple.members) await addPoints(u, D.POINTS.trip, '旅行足跡：' + t.name);
    await notify(partner(), 'trip', `${nick(me())} 新增了一個旅行足跡 🗺️`, t.name);
    confetti(50); closeModal(m); toast('記下來了 📍');
  };
};
// 照片自動歸檔：選了這趟旅行的，或日期落在旅行那幾天的
function tripPhotos(t) {
  const a = t.date, b = t.dateEnd || t.date;
  return list('photos').filter((x) => x.tripId === t.id || (!x.tripId && a && x.date >= a && x.date <= b)).sort((x, y) => (x.date || '').localeCompare(y.date || ''));
}
ACT.openTrip = (el) => {
  const t = list('trips').find((x) => x.id === el.dataset.id); if (!t) return;
  const m = openModal(`${mhead('<i data-ic="pin"></i> ' + esc(t.name))}
    ${t.cover ? `<img src="${t.cover}" style="width:100%;border-radius:16px;display:block">` : ''}
    <p class="small muted">${esc(t.date || '')} · ${esc(nick(t.by))} 記錄</p>
    ${t.note ? `<div class="letter">${esc(t.note)}</div>` : ''}
    ${(() => { const ps = tripPhotos(t); return ps.length ? `<div class="trip-ph"><div class="small muted">這趟的照片（${ps.length}）</div><div class="trip-ph-g">${ps.map((x) => `<img src="${x.img}" alt="">`).join('')}</div></div>` : ''; })()}
    <div class="btn-row">${t.lat != null && S.map ? '<button class="btn ghost" id="tp-go">在地圖上看</button>' : ''}${t.by === me() ? '<button class="btn ghost" id="tp-del">刪除</button>' : ''}</div>`);
  $('#tp-go', m) && ($('#tp-go', m).onclick = () => { closeModal(m); S.map.setView([t.lat, t.lng], 12); window.scrollTo({ top: 0, behavior: 'smooth' }); });
  $('#tp-del', m) && ($('#tp-del', m).onclick = async () => { if (await confirmBox('刪除這個足跡？')) { await col('trips').remove(t.id); closeModal(m); } });
};
// ============================================================
//  約會：行程（含加到手機行事曆）、點子罐、一起看／想吃清單
// ============================================================

// ---------- 行程 ----------
const dateDT = (d) => { const [y, m, dd] = (d.date || '').split('-').map(Number); const [h, mi] = (d.time || '00:00').split(':').map(Number); return new Date(y, m - 1, dd, h || 0, mi || 0); };
function upcomingDates() {
  const t0 = new Date(); t0.setHours(0, 0, 0, 0);
  return list('dates').filter((d) => d.date && !d.done && dateDT(d) >= t0).sort((a, b) => dateDT(a) - dateDT(b));
}
const WEEK = ['日', '一', '二', '三', '四', '五', '六'];
function dateWhen(d) {
  const x = dateDT(d), t0 = new Date(); t0.setHours(0, 0, 0, 0);
  const days = Math.round((new Date(x.getFullYear(), x.getMonth(), x.getDate()) - t0) / 86400000);
  const rel = days === 0 ? '今天' : days === 1 ? '明天' : days === 2 ? '後天' : `還有 ${days} 天`;
  return { rel, label: `${x.getMonth() + 1}/${x.getDate()}（${WEEK[x.getDay()]}）${d.time ? ' ' + d.time : ''}`, days };
}

function homeNextDate() {
  const n = upcomingDates()[0];
  if (!n) return '';
  const w = dateWhen(n);
  return `<div class="card next-date" data-act="goDates">
    <div class="nd-cal"><b>${dateDT(n).getDate()}</b><span>${dateDT(n).getMonth() + 1} 月</span></div>
    <div class="grow"><div class="small muted">下一次約會・${w.rel}</div><div class="nd-t">${esc(n.title)}</div><div class="small muted">${w.label}${n.place ? '・' + esc(n.place) : ''}</div></div>
    <span style="font-size:20px;color:var(--muted)">›</span></div>`;
}
ACT.goDates = () => { S.tab = 'travel'; S.sub.travel = 'plan'; render(); window.scrollTo(0, 0); };

function datesPlan() {
  const up = upcomingDates();
  const past = list('dates').filter((d) => !up.includes(d)).sort((a, b) => dateDT(b) - dateDT(a));
  const row = (d) => { const w = dateWhen(d); return `<div class="date-item ${d.done ? 'done' : ''}" data-act="dateEdit" data-id="${d.id}">
      <div class="nd-cal sm"><b>${dateDT(d).getDate()}</b><span>${dateDT(d).getMonth() + 1} 月</span></div>
      <div class="grow"><div class="di-t">${esc(d.title)}</div><div class="small muted">${w.label}${d.place ? '・' + esc(d.place) : ''}</div>${d.note ? `<div class="small" style="margin-top:2px">${esc(d.note)}</div>` : ''}</div>
      ${d.done ? '<span class="chip">去過了</span>' : `<span class="di-rel ${w.days <= 2 ? 'soon' : ''}">${w.rel}</span>`}</div>`; };
  return `<button class="btn block" data-act="dateEdit" style="margin-bottom:10px"><i data-ic="plus"></i> 排一個約會</button>
    <div class="card">${up.length ? up.map(row).join('') : '<div class="empty"><span class="big"><i data-ic="clock"></i></span>還沒有排約會<br><span class="small">沒想法的話，去點子罐搖一個</span></div>'}</div>
    ${past.length ? `<details class="card past-dates"><summary>以前的約會（${past.length}）</summary>${past.slice(0, 40).map(row).join('')}</details>` : ''}`;
}

ACT.dateEdit = (el, e, preset = {}) => {
  const d = el && el.dataset && el.dataset.id ? list('dates').find((x) => x.id === el.dataset.id) : null;
  const t = { title: '', date: dkey(), time: '19:00', place: '', note: '', ...preset, ...(d || {}) };
  const m = openModal(`${mhead(`<i data-ic="clock"></i> ${d ? '約會內容' : '排一個約會'}`)}
    <label>要做什麼</label><input id="dt-t" maxlength="30" value="${esc(t.title)}" placeholder="例如：去吃那家燒肉">
    <div class="row"><div class="grow"><label>日期</label><input id="dt-d" type="date" value="${esc(t.date)}"></div><div style="width:120px"><label>時間</label><input id="dt-h" type="time" value="${esc(t.time)}"></div></div>
    <label>地點（可以不填）</label><input id="dt-p" maxlength="40" value="${esc(t.place)}" placeholder="例如：信義區 XX 餐廳">
    <label>備註（可以不填）</label><input id="dt-n" maxlength="60" value="${esc(t.note)}" placeholder="例如：記得訂位">
    <button class="btn block mt" id="dt-ok">${d ? '儲存' : '排進行程'}</button>
    ${d ? `<div class="btn-row mt"><button class="btn ghost" id="dt-ics"><i data-ic="download"></i> 加到手機行事曆</button>${d.done ? '' : '<button class="btn ghost" id="dt-done"><i data-ic="check"></i> 去過了</button>'}</div>
      <button class="link center" id="dt-del" style="color:#d4405f;margin-top:10px">刪除這個約會</button>` : ''}`);
  const read = () => ({ title: $('#dt-t', m).value.trim(), date: $('#dt-d', m).value, time: $('#dt-h', m).value, place: $('#dt-p', m).value.trim(), note: $('#dt-n', m).value.trim() });
  $('#dt-ok', m).onclick = async () => {
    const v = read(); if (!v.title) return toast('寫一下要做什麼'); if (!v.date) return toast('選一下日期');
    if (d) await col('dates').update(d.id, v);
    else {
      const id = await col('dates').add({ ...v, by: me(), done: false, at: now(), ...(preset.ideaId ? { ideaId: preset.ideaId } : {}) });
      if (preset.ideaId) await col('ideas').update(preset.ideaId, { used: true, usedAt: now() });
      if (partner()) await notify(partner(), 'date', `${nick(me())} 排了一個約會：${v.date.slice(5).replace('-', '/')}`, v.title);
      closeModal(m); toast('排進行程了'); sfx('pop');
      if (await confirmBox('要加到手機行事曆嗎？\n手機會在約會前提醒你們', '加到行事曆')) downloadICS({ ...v, id });
      return;
    }
    closeModal(m); toast('改好了');
  };
  if (!d) return;
  $('#dt-ics', m).onclick = () => downloadICS(d);
  const dn = $('#dt-done', m);
  if (dn) dn.onclick = async () => { await col('dates').update(d.id, { done: true, doneAt: now() }); closeModal(m); toast('又一起去了一個地方'); petXP(3); dateStamps(d); askAddMemory({ title: d.title, date: d.date, kind: 'date', note: d.place || '' }); };
  $('#dt-del', m).onclick = async () => { if (!(await confirmBox('確定刪除這個約會？', '刪除'))) return; await col('dates').remove(d.id); closeModal(m); };
};

// 產生 .ics，iPhone／Android 點開就能加進行事曆（前一天和前 2 小時提醒）
function downloadICS(d) {
  const st = dateDT(d), en = new Date(st.getTime() + 2 * 3600000);
  const f = (x) => `${x.getFullYear()}${pad(x.getMonth() + 1)}${pad(x.getDate())}T${pad(x.getHours())}${pad(x.getMinutes())}00`;
  const e = (s) => String(s || '').replace(/[\\;,]/g, (c) => '\\' + c).replace(/\n/g, '\\n');
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//two-park//date//ZH', 'BEGIN:VEVENT',
    `UID:${d.id || now()}@two-park`, `DTSTAMP:${f(new Date())}`, `DTSTART:${f(st)}`, `DTEND:${f(en)}`,
    `SUMMARY:${e('約會：' + d.title)}`, d.place ? `LOCATION:${e(d.place)}` : '', d.note ? `DESCRIPTION:${e(d.note)}` : '',
    'BEGIN:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY', `DESCRIPTION:${e('明天約會：' + d.title)}`, 'END:VALARM',
    'BEGIN:VALARM', 'TRIGGER:-PT2H', 'ACTION:DISPLAY', `DESCRIPTION:${e('兩小時後：' + d.title)}`, 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR'].filter(Boolean).join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
  a.download = `date-${d.date}.ics`; document.body.appendChild(a); a.click(); a.remove();
  toast('打開下載的檔案就能加進行事曆');
}

// 做完的事情：問要不要記進時間軸（不自動）
async function askAddMemory({ title, date, kind = 'other', note = '' }) {
  if (!(await confirmBox(`要把「${title}」記進時間軸嗎？`, '記進時間軸'))) return;
  await col('memories').add({ title, date: date || dkey(), kind, note, by: me(), at: now() });
  toast('記進時間軸了');
}

// ---------- 點子罐 ----------
function datesJar() {
  const ideas = list('ideas').filter((x) => !x.used);
  const used = list('ideas').filter((x) => x.used).sort((a, b) => (b.usedAt || 0) - (a.usedAt || 0));
  // 圖騰風點子罐：雙線框、底紋、光輪徽章裡一個線條罐子，紙條是摺好的小籤
  const slips = ideas.slice(0, 12).map((x, i) => { const cx = 82 + (i % 4) * 12 + ((i * 7) % 5), cy = 146 - Math.floor(i / 4) * 11 - ((i * 5) % 4), r = ((i * 37) % 31) - 15;
    return `<g transform="translate(${cx} ${cy}) rotate(${r})"><rect x="-6" y="-3.6" width="12" height="7.2" rx="1" class="${i % 3 ? 'e-bg' : 'e-acc-f'} e-ink-s" stroke-width=".7"/><path d="M-3.5 -.6 H3.5 M-3.5 1.4 H1.5" class="e-ink-s" stroke-width=".5"/></g>`; }).join('');
  const ring = Array.from({ length: 36 }, (_, i) => { const a = i / 36 * Math.PI * 2; return `<circle cx="${(120 + Math.sin(a) * 74).toFixed(1)}" cy="${(110 - Math.cos(a) * 74).toFixed(1)}" r="${i % 3 ? .9 : 1.7}" class="e-ink-f"/>`; }).join('');
  return `<div class="card jar-card2 emb-F-date">
      <svg viewBox="0 0 240 236" class="jar-emb" id="jar">
        <defs>${festPattern('hearts', 'jarpat')}</defs>
        <rect width="240" height="236" rx="18" class="e-bg"/><rect width="240" height="236" rx="18" fill="url(#jarpat)" opacity=".55"/>
        <rect x="8" y="8" width="224" height="220" rx="13" class="e-ink-s" stroke-width=".9" fill="none"/><rect x="13" y="13" width="214" height="210" rx="10" class="e-acc-s" stroke-width=".6" fill="none"/>
        <rect x="80" y="18" width="80" height="14" rx="7" class="e-bg"/><text x="120" y="28.5" text-anchor="middle" font-size="7.5" letter-spacing="3" class="e-ink-f e-small">約 會 點 子</text>
        ${ring}<circle cx="120" cy="110" r="66" class="e-bg e-ink-s" stroke-width="1.4"/><circle cx="120" cy="110" r="60" class="e-acc-s" stroke-width=".8" fill="none"/>
        <g class="jar-body">
          <rect x="96" y="58" width="48" height="10" rx="3" class="e-acc-f e-ink-s" stroke-width="1.2"/>
          <path d="M100 68 H140 Q147 72 146 82 L147 150 Q147 160 137 160 H103 Q93 160 93 150 L94 82 Q93 72 100 68 Z" class="e-bg e-ink-s" stroke-width="1.5"/>
          <g>${slips}</g>
          <path d="M100 86 Q98 115 101 146" class="e-acc-s" stroke-width="2" stroke-linecap="round" fill="none" opacity=".7"/>
          <path d="M120 100 C117 95 109 95 109 102 C109 108 116 112 120 115 C124 112 131 108 131 102 C131 95 123 95 120 100 Z" class="e-acc-f e-ink-s" stroke-width="1"/>
        </g>
        <line x1="40" y1="190" x2="200" y2="190" class="e-ink-s" stroke-width=".7"/><circle cx="36" cy="190" r="1.5" class="e-ink-f"/><circle cx="204" cy="190" r="1.5" class="e-ink-f"/>
        <text x="120" y="209" text-anchor="middle" font-size="16" class="e-ink-f e-title">點子罐</text>
        <text x="120" y="222" text-anchor="middle" font-size="7" letter-spacing="1.6" class="e-ink-f e-small">罐子裡有 ${ideas.length} 個點子</text>
      </svg>
      <div class="btn-row" style="justify-content:center"><button class="btn ghost" data-act="ideaAdd"><i data-ic="plus"></i> 丟一個點子</button><button class="btn" data-act="ideaShake" ${ideas.length ? '' : 'disabled'}>搖一搖</button></div>
    </div>
    ${ideas.length ? `<div class="card"><h3 style="font-size:15px">罐子裡的點子</h3><div class="idea-slips">${ideas.map((x, i) => `<div class="idea-chip emb-F-date" style="--r:${((i % 5) - 2) * 1.2}deg"><span class="grow">${esc(x.text)}<small>${esc(nick(x.by))} 丟的</small></span>${x.by === me() ? `<button data-act="ideaDel" data-id="${x.id}" aria-label="刪除">✕</button>` : ''}</div>`).join('')}</div></div>` : ''}
    ${used.length ? `<details class="card"><summary>抽過的點子（${used.length}）</summary>${used.slice(0, 30).map((x) => `<div class="list-row"><span class="grow muted">${esc(x.text)}</span></div>`).join('')}</details>` : ''}`;
}
ACT.ideaAdd = async () => {
  const v = await promptBox('丟一個約會點子', { placeholder: '例如：去海邊看日落、一起做菜、夜市吃到飽' });
  if (!v || !v.trim()) return;
  await col('ideas').add({ text: v.trim(), by: me(), used: false, at: now() });
  toast('丟進罐子了'); sfx('pop');
};
ACT.ideaDel = async (el, e) => { e && e.stopPropagation(); await col('ideas').remove(el.dataset.id); };
ACT.ideaShake = async () => {
  const ideas = list('ideas').filter((x) => !x.used);
  if (!ideas.length) return;
  const jar = $('#jar'); jar && jar.classList.add('shake'); sfx('flip'); vibrate([20, 40, 20, 40, 20]);
  await sleep(900); jar && jar.classList.remove('shake');
  const x = ideas[Math.floor(Math.random() * ideas.length)];
  const m = openModal(`<div class="center"><div class="idea-slip2 emb-F-date"><span class="is-top">抽 到 的 點 子</span><b>${esc(x.text)}</b><span class="is-by">— ${esc(nick(x.by))} 丟進去的</span></div>
    <div class="btn-row" style="justify-content:center"><button class="btn ghost" id="is-again">再搖一次</button><button class="btn" id="is-go">就決定是它</button></div></div>`, { center: true });
  sfx('chime');
  $('#is-again', m).onclick = () => { closeModal(m); ACT.ideaShake(); };
  $('#is-go', m).onclick = () => { closeModal(m); ACT.dateEdit(null, null, { title: x.text, ideaId: x.id }); };
};

// ---------- 一起看／想吃清單 ----------
const WATCH_KINDS = [['movie', '電影'], ['drama', '影集'], ['food', '想吃'], ['place', '想去'], ['other', '其他']];
function datesList() {
  const k = S.watchKind || 'movie';
  const items = list('watch').filter((x) => x.kind === k).sort((a, b) => (a.done ? 1 : 0) - (b.done ? 1 : 0) || b.at - a.at);
  return `<div class="seg" style="margin-bottom:10px">${WATCH_KINDS.map(([id, n]) => `<button class="${k === id ? 'on' : ''}" data-act="watchKind" data-k="${id}">${n}</button>`).join('')}</div>
    <div class="card">
      <div class="row" style="gap:8px"><input id="wl-in" class="grow" maxlength="40" placeholder="${{ movie: '想一起看的電影', drama: '想一起追的劇', food: '想一起吃的店或料理', place: '想一起去的地方', other: '想一起做的事' }[k]}"><button class="btn sm" data-act="watchAdd">新增</button></div>
      <label class="wl-jar"><input type="checkbox" id="wl-jar"> 也丟進點子罐</label>
      <div class="mt">${items.map((x) => `<div class="goal ${x.done ? 'done' : ''}"><button class="ck" data-act="watchToggle" data-id="${x.id}">${x.done ? '✓' : ''}</button>
        <span class="grow">${esc(x.title)}${x.review ? `<div class="small muted">「${esc(x.review)}」</div>` : `<div class="small muted">${esc(nick(x.by))} 加的</div>`}</span>
        ${x.by === me() && !x.done ? `<button class="small muted" data-act="watchDel" data-id="${x.id}">✕</button>` : ''}</div>`).join('') || '<div class="empty">清單還是空的</div>'}</div>
    </div>`;
}
ACT.watchKind = (el) => { S.watchKind = el.dataset.k; render(); };
ACT.watchAdd = async () => {
  const i = $('#wl-in'); const v = i && i.value.trim(); if (!v) return;
  const k = S.watchKind || 'movie';
  await col('watch').add({ title: v, kind: k, by: me(), done: false, at: now() });
  const jar = $('#wl-jar');
  if (jar && jar.checked) {
    await col('ideas').add({ text: { movie: '一起看《' + v + '》', drama: '一起追《' + v + '》', food: '一起去吃 ' + v, place: '一起去 ' + v, other: v }[k], by: me(), used: false, at: now() });
    toast('也丟進點子罐了');
  }
  i.value = ''; sfx('pop');
};
ACT.watchDel = async (el) => { await col('watch').remove(el.dataset.id); };
ACT.watchToggle = async (el) => {
  const x = list('watch').find((w) => w.id === el.dataset.id); if (!x) return;
  if (x.done) return col('watch').update(x.id, { done: false });
  const review = await promptBox(`「${x.title}」一句話心得（可以不寫）`, { placeholder: '好看！／普通／一定要再去', ok: '完成' });
  if (review === null) return;
  await col('watch').update(x.id, { done: true, doneAt: now(), review: (review || '').trim() });
  petXP(2); toast('打勾了');
  askAddMemory({ title: { movie: '一起看了', drama: '一起追完了', food: '一起吃了', place: '一起去了', other: '一起完成了' }[x.kind] + '「' + x.title + '」', date: dkey(), kind: x.kind === 'food' ? 'date' : 'other', note: review || '' });
};
// ============================================================
//  📖 回憶：年度清單、時間軸、時光膠囊、成就徽章、年度回顧
// ============================================================

PAGES.memory = {
  html() {
    const sub = S.sub.memory;
    const tabs = [['goals', '<i data-ic="target"></i> 年度清單'], ['timeline', '<i data-ic="clock"></i> 時間軸'], ['album', '<i data-ic="camera"></i> 相簿'], ['deep', '<i data-ic="chat"></i> 季問答']];
    const tabOf = { capsule: 'timeline', ach: '' };
    const onTab = tabOf[sub] !== undefined ? tabOf[sub] : sub;
    const achN = computeAch().size;
    const back = (to, label) => `<button class="link back-link" data-act="sub" data-page="memory" data-sub="${to}">‹ ${label}</button>`;
    return `<div class="page-title"><h2><i data-ic="book"></i> 回憶</h2><button class="ach-chip ${sub === 'ach' ? 'on' : ''}" data-act="sub" data-page="memory" data-sub="ach"><i data-ic="trophy"></i> 成就</button></div>
      ${reviewYear() ? `      <button class="card review-banner" data-act="review">
        <span class="review-ic"><i data-ic="film"></i></span><span class="grow"><b style="font-family:var(--serif);font-size:17px">${reviewYear()} 年度回顧</b><br><span class="small" style="opacity:.9">看看我們這一年一起做了什麼</span></span><span style="font-size:22px">›</span></button>` : ''}
      <div class="seg seg-fit">${tabs.map(([k, n]) => `<button class="${onTab === k ? 'on' : ''}" data-act="sub" data-page="memory" data-sub="${k}">${n}</button>`).join('')}</div>
      ${sub === 'capsule' ? back('timeline', '回到時間軸') : sub === 'ach' ? back('goals', '回到回憶') : ''}
      ${({ goals: memGoals, timeline: memTimeline, album: memAlbum, deep: memDeep, capsule: memCapsule, ach: memAch }[sub] || memGoals)()}`;
  },
};

// ---------- 年度清單 ----------
function memGoals() {
  const y = S.goalYear || new Date().getFullYear();
  const gs = list('goals').filter((g) => g.year === y).sort((a, b) => (a.done ? 1 : 0) - (b.done ? 1 : 0) || a.at - b.at);
  const done = gs.filter((g) => g.done).length;
  const years = [...new Set([new Date().getFullYear(), new Date().getFullYear() + 1, ...list('goals').map((g) => g.year)])].sort();
  return `<div class="card">
    <h3><i data-ic="target"></i> ${y} 年想一起做的事</h3>
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
  if (!(await confirmBox(`完成「${g.title}」了嗎？`, '完成！'))) return;
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
// 年度回顧只在年底年初出現：12/20～隔年 1/10
// 年度回顧多的幾頁：約會、一起看的、小小黑和小動物、照片、心情、每日一問
function reviewMore(Y, inY) {
  const out = [], ms = S.couple.members || [];
  const dates = list('dates').filter((d) => d.done && (d.date || '').startsWith(String(Y)));
  if (dates.length) out.push({ i: ic('dining'), n: dates.length, t: '次約會', s: dates.slice(-6).map((d) => esc(d.title)).join('・') });
  const watched = list('watch').filter((w) => w.done && inY(w.doneAt || w.at) && (w.kind === 'movie' || w.kind === 'drama'));
  if (watched.length) out.push({ i: ic('film'), n: watched.length, t: '部一起看完的片', s: watched.slice(-6).map((w) => esc(w.title)).join('・') });
  const P = petState(), dex = S.couple.dex || {};
  const met = DEX_ORDER.filter((k) => dex[k]?.met && inY(dex[k].met));
  out.push({ i: ic('heart'), n: PET_STAGES[P.st].name, t: `${esc(P.name)}長到這裡了`, s: `經驗 ${money(P.xp)}${met.length ? `<br>今年遇到 ${met.length} 位小動物朋友<br>${met.map((k) => esc(FRIENDS[k].name)).join('・')}` : ''}` });
  const photos = list('photos').filter((p) => (p.date || '').startsWith(String(Y)) && p.img);
  if (photos.length) {
    const pick = photos[Math.floor(Math.random() * photos.length)];
    out.push({ bg: `linear-gradient(rgba(20,8,14,.25), rgba(20,8,14,.72)), url(${pick.img}) center/cover`, i: ic('camera'), n: photos.length, t: '張今年的合照', s: pick.caption ? `「${esc(pick.caption)}」` : esc(pick.date || '') });
  }
  const hist = S.couple.moodHist || {};
  const fav = ms.map((u) => {
    const c = {}; Object.entries(hist[u] || {}).forEach(([d, icon]) => { if (d.startsWith(String(Y))) c[icon] = (c[icon] || 0) + 1; });
    const top = Object.entries(c).sort((a, b) => b[1] - a[1])[0];
    if (!top) return '';
    const md = D.MOODS.find((x) => x.icon === top[0]);
    return `${esc(nick(u))} 最常是「${md ? md.label : top[0]}」`;
  }).filter(Boolean);
  if (fav.length) out.push({ i: ic('sun'), n: '心情', t: '今年的天氣', s: fav.join('<br>') });
  const daily = list('daily').filter((d) => d.id.startsWith(String(Y)) && d.answers && ms.every((u) => d.answers[u]));
  if (daily.length) {
    const d = daily[Math.floor(Math.random() * daily.length)];
    out.push({ i: ic('chat'), n: '還記得嗎', t: esc(D.DAILY_QUESTIONS[d.qi] || ''), s: ms.map((u) => `${esc(nick(u))}：${esc(String(d.answers[u]).slice(0, 40))}`).join('<br>') });
  }
  return out;
}
function reviewYear(d = new Date()) {
  if (localStorage.getItem('park-review-preview')) return d.getFullYear();
  const m = d.getMonth() + 1, day = d.getDate();
  if (m === 12 && day >= 20) return d.getFullYear();
  if (m === 1 && day <= 10) return d.getFullYear() - 1;
  return 0;
}
function timelineItems() {
  const it = [];
  const ann = S.couple.dates?.anniversary || D.DEFAULT_DATES.anniversary;
  it.push({ at: parseD(ann).getTime(), icon: '<i data-ic="heart"></i>', text: '我們在一起了' });
  for (const t of list('trips')) it.push({ at: t.date ? parseD(t.date).getTime() : t.at, icon: '<i data-ic="map"></i>', text: `一起去了 ${t.name}`, sub: t.note });
  for (const g of list('goals')) if (g.done) it.push({ at: g.doneAt, icon: '<i data-ic="target"></i>', text: `完成目標「${g.title}」` });
  for (const b of list('battles')) if (b.status === 'done') it.push({ at: b.doneAt || b.at, icon: '<i data-ic="swords"></i>', text: `${nick(b.winner)} 贏了挑戰「${b.task}」` });
  for (const w of list('wishes')) if (w.status === 'ok') it.push({ at: w.doneAt || w.at, icon: '<i data-ic="shooting"></i>', text: `${nick(w.by)} 的願望「${w.title}」實現了` });
  for (const c of list('capsules')) if (c.firstOpenAt) it.push({ at: c.firstOpenAt, icon: '<i data-ic="hourglass"></i>', text: `打開了時光膠囊「${c.title}」` });
  for (const n of list('notes')) if (n.found) it.push({ at: n.foundAt, icon: '<i data-ic="letter"></i>', text: `${nick(n.to)} 找到了一張小紙條` });
  for (const mm of list('memories')) it.push({ at: mm.date ? parseD(mm.date).getTime() : mm.at, icon: (MEM_KINDS.find((k) => k.id === mm.kind) || MEM_KINDS[MEM_KINDS.length - 1]).icon, text: mm.title, sub: mm.note, cover: mm.cover, mid: mm.id });
  return it.filter((x) => x.at).sort((a, b) => b.at - a.at);
}
const MEM_KINDS = [
  { id: 'anniv', icon: '<i data-ic="heart"></i>', label: '紀念日' }, { id: 'first', icon: '<i data-ic="sparkle"></i>', label: '第一次' }, { id: 'date', icon: '<i data-ic="dining"></i>', label: '約會' },
  { id: 'trip', icon: '<i data-ic="plane"></i>', label: '旅行' }, { id: 'life', icon: '<i data-ic="home"></i>', label: '生活' }, { id: 'gift', icon: '<i data-ic="gift"></i>', label: '驚喜' },
  { id: 'music', icon: '<i data-ic="violin"></i>', label: '音樂' }, { id: 'other', icon: '<i data-ic="photo"></i>', label: '其他' },
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
  const caps = list('capsules'), canOpen = caps.filter((c) => c.openAt && c.openAt <= now() && !c.firstOpenAt).length;
  return `<button class="btn block" data-act="editMemory" style="margin-bottom:10px">＋ 新增一段回憶</button>
    <button class="card note-row" data-act="sub" data-page="memory" data-sub="capsule" style="margin-bottom:10px"><span class="lr-i"><i data-ic="hourglass"></i></span><span class="grow"><b>時光膠囊</b><div class="small muted">${caps.length ? `${caps.length} 封${canOpen ? `・<b style="color:var(--accent)">${canOpen} 封可以打開了</b>` : '・寫給未來的信'}` : '寫一封信，指定未來某天才能打開'}</div></span><span style="color:var(--muted);font-size:20px">›</span></button>
    <p class="small muted center" style="margin:0 0 6px">旅行、目標、願望實現這些會自動記錄；以前的重要時刻可以自己補上</p>
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
  return `<div class="card center"><div style="font-size:44px"><i data-ic="hourglass"></i></div><h3 style="justify-content:center">時光膠囊</h3>
      <p class="small muted" style="margin:0 0 10px">現在寫一封信，指定日期才打得開。寫的人自己也要等到那天才看得到喔。</p>
      <button class="btn" data-act="capsuleNew">寫一封時光膠囊</button></div>
    ${cs.map((c) => {
      const open = c.openAt <= now();
      const days = Math.ceil((c.openAt - now()) / 86400000);
      const opened = (c.opened || {})[me()];
      return `<div class="capsule ${open ? '' : 'locked'}" ${open ? `data-act="capsuleOpen" data-id="${c.id}"` : ''}>
        <span class="ci">${ic(open ? (opened ? 'book' : 'letter') : 'lock')}</span>
        <div class="grow"><b style="font-family:var(--serif)">${esc(c.title)}</b>
          <div class="small muted">${esc(nick(c.by))} 寫給${c.to === 'both' ? '我們' : esc(nick(c.to))} · ${fmtFull(c.at)} 封存</div>
          <div class="small" style="color:var(--accent);font-weight:700">${open ? (opened ? '已打開' : '可以打開了！') : `${fmtFull(c.openAt)} 開啟 · 還有 ${days} 天`}</div></div></div>`;
    }).join('') || '<div class="empty">還沒有時光膠囊</div>'}`;
}
ACT.capsuleNew = () => {
  const d = new Date(); d.setFullYear(d.getFullYear() + 1);
  const m = openModal(`${mhead('<i data-ic="hourglass"></i> 寫一封時光膠囊')}
    <label>標題</label><input id="cp-t" maxlength="24" placeholder="例如：給一年後的我們">
    <label>寫給</label><select id="cp-to"><option value="both">我們兩個</option><option value="partner">${esc(nick(partner()))}</option></select>
    <label>什麼時候才能打開</label><input id="cp-d" type="date" value="${dkey(d)}" min="${dkey(new Date(now() + 86400000))}">
    <div class="row wrap mt">${[['1 個月', 1], ['半年', 6], ['1 年', 12], ['下個週年', 0]].map(([n, v]) => `<button class="chip" data-m="${v}">${n}</button>`).join('')}</div>
    <label>內容</label><textarea id="cp-b" style="min-height:160px" placeholder="想對未來說的話…"></textarea>
    <button class="btn block mt" id="cp-ok"><i data-ic="lock"></i> 封存</button>`);
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
  const m = openModal(`<div class="center" id="cpo"><div class="envelope">${ic('letter')}</div><p class="muted">點一下打開</p></div>`, { center: true });
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
    petXP: (S.couple.pet || {}).xp || 0,
    petStage: typeof petState === 'function' ? petState().st : 0,
    photos: typeof albumItems === 'function' ? albumItems().length : 0,
    deepBoth: ms.length === 2 ? list('deep').filter((d) => d.answers && ms.every((u) => d.answers[u])).length : 0,
    deepSeasons: Object.keys(S.couple.drops || {}).filter((k) => k.startsWith('deep-')).length,
    deepRepeat: (() => { if (ms.length < 2) return 0; const both = list('deep').filter((d) => d.answers && ms.every((u) => d.answers[u])); const keys = new Set(both.map((d) => `${d.q}-${d.i}`)); let n = 0; keys.forEach((k) => { if (new Set(both.filter((d) => `${d.q}-${d.i}` === k).map((d) => d.y)).size > 1) n++; }); return n; })(),
    ...(typeof dexStats === 'function' ? (() => { const x = dexStats(); return { dexMet: x.met, dexScenes: x.scenes, dexCustom: x.custom, dexFull: dexFullCount() }; })() : {}),
    annivLetters: Object.values(S.couple.annivLetters || {}).filter((L) => ms.length === 2 && ms.every((u) => L[u])).length,
  };
}
function computeAch() {
  const m = achMetrics();
  return new Set(D.ACHIEVEMENTS.filter((a) => (m[a.m] || 0) >= a.goal).map((a) => a.id));
}
// 金色成就：兩人各掉一張成就限定卡（每個成就只發一次）
const ACH_SERIES = '成就系列';
async function achCardDrops(got) {
  const ms = S.couple.members || [];
  if (ms.length < 2) return;
  for (const a of D.ACHIEVEMENTS) {
    if (a.tier !== 'g' || !got.has(a.id) || (S.couple.drops || {})[`ach-${a.id}`]) continue;
    const ok = await S.store.coupleTx(S.cid, (x) => (x.drops && x.drops[`ach-${a.id}`] ? null : { [`drops.ach-${a.id}`]: true }));
    if (!ok) continue;
    for (const u of ms) {
      await col('cards').add(cardDoc({ title: `${a.name}紀念券`, desc: `解鎖金色成就「${a.name}」的獎勵：${a.desc}。內容由兩人一起決定`, rarity: 'SR', mark: a.mark, series: ACH_SERIES }, u, 'sys'));
      await col('events').add({ to: u, by: 'sys', type: 'card', text: `金色成就「${a.name}」掉落一張限定券`, detail: `${a.name}紀念券`, at: now(), read: false });
    }
  }
}
let achTimer = null;
function scheduleAchievements() {
  clearTimeout(achTimer);
  achTimer = setTimeout(() => {
    if (!S.couple || COLS.some((c) => !S.d[c])) return;
    const got = computeAch();
    achCardDrops(got);
    if (typeof missCardDrops === 'function') missCardDrops();
    if (typeof seriesDrops === 'function') seriesDrops();
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
// 新功能成就的小標誌（徽章下緣）
const ACH_CAT_MOTIF = {
  pet: '<g class="e-ink-f"><ellipse cx="0" cy="2.5" rx="3.6" ry="3"/><circle cx="-4.2" cy="-2.2" r="1.6"/><circle cx="-1.4" cy="-4.4" r="1.6"/><circle cx="1.4" cy="-4.4" r="1.6"/><circle cx="4.2" cy="-2.2" r="1.6"/></g>',
  album: '<g class="e-ink-s" stroke-width="1.3" fill="none"><rect x="-6" y="-4" width="12" height="9" rx="1.5"/><circle cx="0" cy=".5" r="2.6"/><path d="M-2.5 -4 L-1.5 -6 L1.5 -6 L2.5 -4"/></g>',
  deep: '<g class="e-ink-s" stroke-width="1.3" fill="none"><path d="M-6 -5 H6 V3 H-1 L-4 6 V3 H-6 Z" stroke-linejoin="round"/></g><circle cx="-2.5" cy="-1" r=".9" class="e-ink-f"/><circle cx="0" cy="-1" r=".9" class="e-ink-f"/><circle cx="2.5" cy="-1" r=".9" class="e-ink-f"/>',
  dex: '<g class="e-ink-s" stroke-width="1.3" fill="none" stroke-linejoin="round"><path d="M0 -3 Q-3 -5.5 -7 -5 V4 Q-3 3.5 0 5.5 Q3 3.5 7 4 V-5 Q3 -5.5 0 -3 Z M0 -3 V5.5"/></g>',
  anniv: '<g class="e-ink-s" stroke-width="1.3" fill="none"><rect x="-6.5" y="-4.5" width="13" height="9" rx="1"/><path d="M-6.5 -4 L0 1 L6.5 -4"/></g>',
};
function achBadge(a, unlocked) {
  const shape = { b: 0, s: 1, g: 2 }[a.tier];
  const id = 'ab' + (++embSeq);
  return `<svg viewBox="0 0 130 130" class="ach-badge" xmlns="http://www.w3.org/2000/svg">
    <defs>${embPattern(['dots', 'lattice', 'seigaiha'][shape], id, 0.6)}<clipPath id="${id}c"><circle cx="65" cy="65" r="64"/></clipPath></defs>
    <circle cx="65" cy="65" r="64" class="e-bg"/>
    <rect width="130" height="130" fill="url(#${id})" opacity=".45" clip-path="url(#${id}c)"/>
    ${embMedallion(65, 65, { shape, ch: a.mark }, 44)}
    ${a.cat ? `<g transform="translate(65 113)"><circle r="11" class="e-bg e-ink-s" stroke-width="1.4"/>${ACH_CAT_MOTIF[a.cat] || ''}</g>` : ''}
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
  return `<div class="card center"><div class="fund-num">${got.size}</div><div class="small muted">我們一起解鎖的成就</div>
      <div class="row" style="justify-content:center;gap:16px;margin-top:8px">${['g', 's', 'b'].map((t) => `<span class="ach-tier t-${t}">${tiers[t]} ${cnt(t)}</span>`).join('')}</div></div>
    <div class="ach-grid">${sorted.map((a) => {
      const ok = got.has(a.id), v = Math.min(m[a.m] || 0, a.goal);
      return `<div class="ach ach-${a.tier} ${ok ? '' : 'locked'}">${achBadge(a, ok)}<b>${esc(a.name)}</b><span>${esc(a.desc)}</span>
        ${ok ? `<span class="ach-tier t-${a.tier}">${tiers[a.tier]}</span>` : ''}</div>`;
    }).join('')}</div>`;
}

// ---------- 年度回顧 ----------
ACT.review = () => {
  const Y = reviewYear() || new Date().getFullYear();
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
    { i: ic('ferris'), n: Y, t: '這一年的我們', s: `${nick(me())} & ${nick(p)}<br>往右點，一起回顧 →` },
    { i: ic('ticket'), n: redeems.length, t: '張票券被兌換', s: top ? `最常用的是「${esc(top[0])}」<br>一共用了 ${top[1]} 次` : '明年多用一點吧' },
    { i: ic('gacha'), n: gacha.length, t: '次扭蛋和合成', s: `扭出 ${gacha.filter((g) => g.rarity === 'SSR').length} 張 SSR、${gacha.filter((g) => g.rarity === 'SR').length} 張 SR` },
    { i: ic('map'), n: trips.length, t: '個一起去過的地方', s: trips.length ? trips.slice(0, 8).map((t) => esc(t.name)).join('・') : '明年一起去更多地方吧' },
    { i: ic('target'), n: `${goals.filter((g) => g.done).length}/${goals.length}`, t: '個年度目標完成', s: goals.filter((g) => g.done).slice(0, 6).map((g) => '✓ ' + esc(g.title)).join('<br>') || '寫下明年的目標吧' },
    { i: ic('heart'), n: money(misses.length), t: '次「想你」', s: ms.map((u) => `${esc(nick(u))} 想了 ${misses.filter((x) => x.by === u).length} 次`).join('<br>') },
    { i: ic('minds'), n: qrate + '%', t: '默契度', s: `一起答了 ${quiz.length} 題默契問答<br>${daily.length} 題每日一問<br>互相蓋了 ${stamps.length} 個章` },
    ...reviewMore(Y, inY),
    { bg: finaleBg(), i: ic('house'), n: `第 ${money(daysAtEnd)} 天`, t: D.BIRTHDAY_SLOGAN, s: `${Y + 1} 年也請多多指教` },
  ];
  // 數字是 0 的頁面就跳過（第一頁和最後一頁一定保留）
  const keep = slides.filter((x, i) => i === 0 || i === slides.length - 1 || !/^0(\/0|%)?$/.test(String(x.n)));
  playStory(keep);
};

// 故事頁共用：slides = [{ bg, i, n, t, s }]，bg 沒給就用目前主題的顏色
function finaleBg() { return `linear-gradient(160deg, ${PALETTES[paletteId()].sw[0]}, #1a0d14)`; }
function storyBgs() {
  const sw = PALETTES[paletteId()].sw;
  const night = document.documentElement.dataset.theme === 'night';
  const dk = (c) => night ? `color-mix(in srgb, ${c} 70%, #10080c)` : c;
  return sw.map((c, i) => `linear-gradient(160deg, ${dk(c)}, ${dk(sw[(i + 1) % sw.length])})`);
}
function playStory(slides, { finale = 100, colors } = {}) {
  const bgs = storyBgs();
  let k = 0;
  const el = document.createElement('div');
  el.className = 'story';
  const draw = () => {
    const s = slides[k];
    el.style.background = s.bg || bgs[k % bgs.length];
    el.innerHTML = `<div class="bars">${slides.map((_, i) => `<div class="${i <= k ? 'on' : ''}"></div>`).join('')}</div>
      <button class="story-close" aria-label="關閉">✕</button>
      <div class="slide"><div class="si">${s.i}</div><div class="sn">${s.n}</div><div class="st">${esc(s.t)}</div><div class="ss">${s.s}</div></div>
      <div class="tapzones"><div data-d="-1"></div><div data-d="1"></div></div>`;
    $('.story-close', el).onclick = () => { el.remove(); if (typeof tourNeeded === 'function' && tourNeeded()) setTimeout(() => startTour(), 500); };
    $$('[data-d]', el).forEach((z) => z.onclick = () => {
      k += +z.dataset.d;
      if (k >= slides.length) { el.remove(); if (typeof tourNeeded === 'function' && tourNeeded()) setTimeout(() => startTour(), 500); return; }
      k = Math.max(0, k); draw();
      if (k === slides.length - 1) confetti(finale, colors);
    });
  };
  draw();
  document.body.appendChild(el);
}

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
        ${bs.length ? bs.map((b) => `<div class="list-row"><span class="lr-i"><i data-ic="cloud"></i></span><div class="grow">${fmtFull(b.at)} ${new Date(b.at).toTimeString().slice(0, 5)}
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
// ============================================================
//  一起養黑貓：兩人的互動會餵牠，牠會長大、換表情、解鎖小配件
// ============================================================

const PET_STAGES = [
  { xp: 0, name: '小奶貓', scale: .72 },
  // 每個階段大約半年（兩個人認真養，一天大概三四十點）
  { xp: 6000, name: '少年貓', scale: .86 },
  { xp: 12000, name: '大貓咪', scale: 1 },
  { xp: 18000, name: '貓老大', scale: 1.06 },
];
const PET_ACC = [
  { id: 'bow', name: '粉紅蝴蝶結', xp: 200 },
  { id: 'bell', name: '鈴鐺項圈', xp: 1000 },
  { id: 'scarf', name: '小圍巾', xp: 2500 },
  { id: 'flower', name: '小花', xp: 4500 },
  { id: 'crown', name: '小皇冠', xp: 6000 },
  { id: 'santa', name: '聖誕帽', xp: 0, month: 12 },
  // 週年紀念日（兩人都加入後）自動送的見面禮，會直接幫牠戴上
  { id: 'ribbon', name: '週年紅緞帶', anniv: true },
  // 只會在扭蛋時額外掉落
  { id: 'cape', name: '小披風', gacha: true },
  { id: 'glasses', name: '圓眼鏡', gacha: true },
  { id: 'bowtie', name: '紳士領結', gacha: true },
  { id: 'beret', name: '貝雷帽', gacha: true },
  { id: 'starclip', name: '星星髮夾', gacha: true },
  { id: 'heartbag', name: '愛心小包', gacha: true },
];
const PET_GACHA_RATE = 0.03;
// 扭卡片時小機率額外掉一個還沒有的配件
async function petGachaBonus() {
  if (Math.random() > PET_GACHA_RATE) return null;
  const owned = (S.couple.pet || {}).owned || [];
  const left = PET_ACC.filter((a) => a.gacha && !owned.includes(a.id));
  if (!left.length) return null;
  const a = left[Math.floor(Math.random() * left.length)];
  await S.store.coupleTx(S.cid, (c) => ({ 'pet.owned': [...new Set([...(((c.pet || {}).owned) || []), a.id])] }));
  return a;
}
const PET_DEFAULT_NAME = '小小黑';

function petState() {
  const pet = S.couple?.pet || {};
  const xp = pet.xp || 0;
  let st = 0; PET_STAGES.forEach((s, i) => { if (xp >= s.xp) st = i; });
  const next = PET_STAGES[st + 1];
  const last = Math.max(0, ...Object.values(pet.last || {}));
  const hrs = last ? (now() - last) / 3600000 : 999;
  const mood = !last ? 'ok' : hrs < 12 ? 'happy' : hrs < 36 ? 'ok' : 'miss';
  const month = new Date().getMonth() + 1;
  const owned = pet.owned || [];
  const unlocked = PET_ACC.filter((a) => (a.gacha || a.anniv) ? owned.includes(a.id) : a.month ? a.month === month : xp >= a.xp);
  // 長大之後可以自由切換成以前的型態
  const show = pet.form != null && pet.form <= st ? pet.form : st;
  const look = pet.look && typeof lookUnlocked === 'function' && lookUnlocked().has(pet.look) ? pet.look : '';
  return { pet, xp, st, show, look, stage: PET_STAGES[st], next, mood, hrs, unlocked, name: pet.name || PET_DEFAULT_NAME, wear: pet.wear || '' };
}

// 互動加經驗（小事都會加一點；每人每天有上限，避免狂刷）
async function petXP(n, why = '') {
  // 等兩個人都加入才開始養
  if (!S.couple || (S.couple.members || []).length < 2) return;
  const k = `park-petxp-${dkey()}-${me()}`;
  const used = +(localStorage.getItem(k) || 0);
  const add = Math.max(0, Math.min(n, 30 - used));
  localStorage.setItem(k, used + add);
  const before = petState().st;
  await S.store.coupleTx(S.cid, (c) => ({ 'pet.xp': ((c.pet || {}).xp || 0) + add, [`pet.last.${me()}`]: now() }));
  const after = petState().st;
  if (after > before) setTimeout(() => { toast(`${petState().name} 長大了！可以變成${PET_STAGES[after].name}了，到牠的房間切換型態`); confetti(80, ['#2b2633', '#ffd970', '#c98aa0', '#fff']); }, 400);
}

function petAccArt(wear) {
  const I = CAT_INK;
  return {
    bow: `<g transform="translate(62 15) rotate(18)"><path d="M0 0 L-7 -5 L-7 5 Z M0 0 L7 -5 L7 5 Z" fill="#ff8fab" stroke="#c94f72" stroke-width=".8" stroke-linejoin="round"/><circle r="2" fill="#ff8fab" stroke="#c94f72" stroke-width=".8"/></g>`,
    bell: `<path d="M39 52 Q50 57 61 52" fill="none" stroke="#e2445f" stroke-width="3" stroke-linecap="round"/><circle cx="50" cy="57" r="3.2" fill="#ffd45c" stroke="#b8862f" stroke-width=".8"/><path d="M48.5 57.5 H51.5" stroke="#b8862f" stroke-width=".7"/>`,
    scarf: `<path d="M37 51 Q50 58 63 51 L63 55 Q50 62 37 55 Z" fill="#7cc7a8" stroke="#3b8a6c" stroke-width=".8"/><path d="M56 56 L59 68 L64 66 L60 55" fill="#7cc7a8" stroke="#3b8a6c" stroke-width=".8" stroke-linejoin="round"/><path d="M40 53 L60 53" stroke="#fff" stroke-width=".8" stroke-dasharray="2 2" opacity=".7"/>`,
    flower: `<g transform="translate(36 17)">${[0, 72, 144, 216, 288].map((a) => `<ellipse rx="2.6" ry="4" transform="rotate(${a}) translate(0 -3.4)" fill="#fff" stroke="#e7b3c4" stroke-width=".6"/>`).join('')}<circle r="2.2" fill="#ffd45c"/></g>`,
    crown: `<path d="M40 16 L42 7 L46 12 L50 5 L54 12 L58 7 L60 16 Z" fill="#ffd45c" stroke="#b8862f" stroke-width="1" stroke-linejoin="round"/><circle cx="50" cy="12.5" r="1.4" fill="#e2445f"/>`,
    ribbon: `<g transform="translate(0 -6)"><path d="M37 51.5 Q50 57 63 51.5" fill="none" stroke="#c8202f" stroke-width="2.4" stroke-linecap="round"/>
      <path d="M47.5 56 L42.5 70 L46 68 L48.5 71 L50 57 Z M52.5 56 L57.5 70 L54 68 L51.5 71 L50 57 Z" fill="#b51a28"/>
      <path d="M50 54.5 C46 49.5 39 49 39 54.5 C39 60 46 59.5 50 54.5 Z M50 54.5 C54 49.5 61 49 61 54.5 C61 60 54 59.5 50 54.5 Z" fill="#d42433"/>
      <rect x="47.6" y="51.6" width="4.8" height="5.8" rx="1.6" fill="#b51a28"/></g>`,
    cape: `<path d="M38 50 Q50 54 62 50 L70 80 Q50 86 30 80 Z" fill="#c42e52" opacity=".95"/><path d="M38 50 Q50 54 62 50" fill="none" stroke="#e9c77b" stroke-width="1.6"/><circle cx="50" cy="52.5" r="1.8" fill="#e9c77b"/>`,
    glasses: `<circle cx="43" cy="32.5" r="5.6" fill="none" stroke="#e9c77b" stroke-width="1.3"/><circle cx="57" cy="32.5" r="5.6" fill="none" stroke="#e9c77b" stroke-width="1.3"/><path d="M48.6 32 Q50 30.8 51.4 32" fill="none" stroke="#e9c77b" stroke-width="1.2"/>`,
    bowtie: `<path d="M50 52 L42 48 L42 56 Z M50 52 L58 48 L58 56 Z" fill="#3b5ba5" stroke="#26407e" stroke-width=".8" stroke-linejoin="round"/><circle cx="50" cy="52" r="2" fill="#26407e"/>`,
    beret: `<path d="M34 21 Q36 10 52 10 Q66 11 66 20 Q58 17 48 18 Q40 19 34 21 Z" fill="#c45a6a"/><path d="M52 10 l1 -3" stroke="#c45a6a" stroke-width="1.6" stroke-linecap="round"/>`,
    starclip: `<path d="M62 18 l1.6 3.4 3.7 .5 -2.7 2.6 .7 3.7 -3.3 -1.8 -3.3 1.8 .7 -3.7 -2.7 -2.6 3.7 -.5 Z" fill="#ffd45c" stroke="#b8862f" stroke-width=".6" stroke-linejoin="round"/>`,
    heartbag: `<path d="M62 54 Q66 62 64 70" fill="none" stroke="#7a5a3a" stroke-width="1"/><path d="M64 72 C60 68 58 66 60 63.5 C61.5 62 63 62.6 64 64 C65 62.6 66.5 62 68 63.5 C70 66 68 68 64 72 Z" fill="#ff8fab" stroke="#c94f72" stroke-width=".7"/>`,
    santa: `<path d="M35 20 Q44 4 60 9 Q66 12 70 24 L36 22 Z" fill="#e2445f" stroke="#9e2a3c" stroke-width=".8" stroke-linejoin="round"/><path d="M34 21 Q50 17 66 22 L66 26 Q50 21 34 25 Z" fill="#fff"/><circle cx="71" cy="25" r="3" fill="#fff"/>`,
  }[wear] || '';
}
// 每個階段身邊的小物：奶瓶 → 毛線球 → 貓抓板 → 王座墊
const PET_PROPS = [
  `<g transform="translate(15 70) rotate(-8)"><rect x="-5" y="-1" width="10" height="18" rx="3.5" fill="#f4f1ee" stroke="#c9bfc6" stroke-width=".8"/><rect x="-5" y="7" width="10" height="10" rx="3" fill="#fff8e6"/><path d="M-4.5 6.5 H4.5" stroke="#e6d9b8" stroke-width=".8"/><rect x="-5.5" y="-4" width="11" height="4" rx="1.5" fill="#9fc6e8"/><path d="M-2.5 -4 Q-2.5 -9.5 0 -10 Q2.5 -9.5 2.5 -4 Z" fill="#f2b6c6"/><path d="M-3 4 H-1 M-3 9 H-1 M-3 13 H-1" stroke="#c9bfc6" stroke-width=".6"/></g>`,
  `<g transform="translate(15 81)"><path d="M6 1 Q14 4 22 2" fill="none" stroke="#e98aa6" stroke-width=".9" stroke-linecap="round"/><circle r="7.5" fill="#e98aa6"/><path d="M-6 -3 Q0 -7 6 -3 M-7 1 Q0 -3 7 1 M-6 5 Q0 1 6 5 M-2 -7 Q-6 0 -2 7" fill="none" stroke="#c9607f" stroke-width=".8"/></g>`,
  `<g><rect x="5" y="86" width="20" height="3" rx="1.2" fill="#b8916a"/><rect x="11" y="50" width="8" height="37" fill="#d9b88f"/><path d="M11 54 L19 57 M11 60 L19 63 M11 66 L19 69 M11 72 L19 75 M11 78 L19 81" stroke="#b08a60" stroke-width="1.1"/><rect x="7" y="46" width="16" height="5" rx="2" fill="#8f6aa0"/><path d="M19 52 Q23 56 22 60" fill="none" stroke="#f5c843" stroke-width=".9"/><circle cx="22" cy="61" r="1.8" fill="#f5c843"/></g>`,
  `<g><path d="M18 86 Q18 78 50 78 Q82 78 82 86 Q82 91 50 91 Q18 91 18 86 Z" fill="#b8344a"/><path d="M22 84 Q50 80 78 84" fill="none" stroke="#e8b04b" stroke-width="1"/><circle cx="19" cy="88" r="1.6" fill="#e8b04b"/><circle cx="81" cy="88" r="1.6" fill="#e8b04b"/><path d="M19 89.5 L18 92 M81 89.5 L82 92" stroke="#e8b04b" stroke-width="1"/></g>`,
];
function petSVG(st, mood, wear, { blink = true, look = '' } = {}) {
  const I = CAT_INK;
  const eyes = mood === 'happy'
    ? `<path d="M39.5 33 Q43 29 46.5 33 M53.5 33 Q57 29 60.5 33" fill="none" stroke="#ffd970" stroke-width="2.2" stroke-linecap="round"/>`
    : `<g class="${blink ? 'pet-eyes' : ''}"><ellipse cx="43" cy="32.5" rx="3.6" ry="4.2" fill="#ffd970"/><ellipse cx="57" cy="32.5" rx="3.6" ry="4.2" fill="#ffd970"/>
       <ellipse cx="43" cy="33" rx="1.2" ry="${mood === 'miss' ? 2 : 3}" fill="${I}"/><ellipse cx="57" cy="33" rx="1.2" ry="${mood === 'miss' ? 2 : 3}" fill="${I}"/>
       <circle cx="44" cy="31" r=".9" fill="#fff"/><circle cx="58" cy="31" r=".9" fill="#fff"/></g>
       ${mood === 'miss' ? `<path d="M38 29 L46 27 M62 29 L54 27" stroke="#efe6f2" stroke-width="1.1" stroke-linecap="round"/><path d="M61 38 Q62 41 61 43" stroke="#9fd0ff" stroke-width="1.6" stroke-linecap="round"/>` : ''}`;
  const mouth = mood === 'miss'
    ? `<path d="M47 42.5 Q50 40.5 53 42.5" fill="none" stroke="#efe6f2" stroke-width="1" stroke-linecap="round"/>`
    : `<path d="M50 40 Q48 42.5 46.5 41.5 M50 40 Q52 42.5 53.5 41.5" fill="none" stroke="#efe6f2" stroke-width="1" stroke-linecap="round"/>${mood === 'happy' ? '<path d="M48.6 41.6 Q50 44.5 51.4 41.6 Z" fill="#ff9fb4"/>' : ''}`;
  const acc = petAccArt(wear);
  const s = PET_STAGES[st].scale;
  return `<svg viewBox="0 0 100 92" class="pet-svg pet-${mood}" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="50" cy="88" rx="${26 * s}" ry="3.5" fill="currentColor" opacity=".1"/>
    ${PET_PROPS[st] || ''}
    <g transform="translate(50 88) scale(${s}) translate(-50 -88)">
      <g class="pet-body">
        <path class="pet-tail" d="M66 80 Q86 80 84 64 Q83 56 76 58" fill="none" stroke="${I}" stroke-width="5" stroke-linecap="round"/>
        <path d="M34 86 Q29 62 39 50 Q50 43 61 50 Q71 62 66 86 Z" fill="${I}"/>
        <ellipse cx="42" cy="86" rx="6" ry="3" fill="${I}"/><ellipse cx="58" cy="86" rx="6" ry="3" fill="${I}"/>
        <g transform="translate(0 4)">
          <path d="M33 29 L35 12 L45 22 Z M67 29 L65 12 L55 22 Z" fill="${I}" stroke="${I}" stroke-width="2" stroke-linejoin="round"/>
          <path d="M36.5 23 L37 15.5 L42 20.5 Z M63.5 23 L63 15.5 L58 20.5 Z" fill="#c98aa0"/>
          <ellipse cx="50" cy="34" rx="18" ry="15" fill="${I}"/>
          ${eyes}
          <path d="M48.5 38.5 L51.5 38.5 L50 40 Z" fill="#ff9fb4"/>${mouth}
          <path d="M31 36 L39 37 M31 40 L39 39 M69 36 L61 37 M69 40 L61 39" stroke="#efe6f2" stroke-width=".8" stroke-linecap="round"/>
          <ellipse cx="39.5" cy="40" rx="2.4" ry="1.3" fill="#ff9fb4" opacity="${mood === 'happy' ? .8 : .45}"/><ellipse cx="60.5" cy="40" rx="2.4" ry="1.3" fill="#ff9fb4" opacity="${mood === 'happy' ? .8 : .45}"/>
          ${look === 'ghost' ? '' : acc}
        </g>
        ${look ? lookArt(look) : ''}
      </g>
    </g>
  </svg>`;
}

// 依時間：晚上 10 點到早上 6 點睡覺、早上 6～9 點伸懶腰，其他時間坐著（可戴配件）
function petTimePose() { const h = new Date().getHours(); return h >= 22 || h < 6 ? 'sleep' : h < 9 ? 'stretch' : ''; }
function petArt(P, big) {
  const tp = P.look ? '' : petTimePose();
  if (tp) return `<div class="pet-pose" data-pose="${tp}">${catPose(tp, P.wear)}</div>`;
  return petSVG(P.show, P.mood, P.wear, { look: P.look });
}
const PET_TIME_TEXT = { sleep: '睡得正香，小聲一點', stretch: '剛睡醒，正在伸懶腰' };
const PET_MOOD_TEXT = { happy: '心情超好，尾巴翹得高高的', ok: '在窩裡等你們來玩', miss: '好久沒人理牠了，有點想你們' };

function petHomeCard() {
  const P = petState();
  const pct = P.next ? Math.round((P.xp - P.stage.xp) / (P.next.xp - P.stage.xp) * 100) : 100;
  const dv = dutyVisitor();
  return `<div class="card pet-card ${dv ? 'has-visitor' : ''}" data-act="petOpen">
    <div class="pet-room"><div class="pet-stage">${petArt(P)}</div>${dv}</div>
    <div class="grow">
      <div class="pet-name">${esc(P.name)} <span class="chip">${PET_STAGES[P.show].name}</span></div>
      <div class="small muted ${dv ? 'duty-say' : ''}">${dv ? dutyText() : PET_TIME_TEXT[petTimePose()] || PET_MOOD_TEXT[P.mood]}</div>
      <div class="small muted">${P.next ? (pct >= 80 ? '好像快要長大了' : '正在慢慢長大') : '已經長成最大隻了'}</div>
    </div>
    <button class="btn sm pet-pet" data-act="petPat">摸摸</button>
  </div>`;
}

ACT.petPat = async (el, e) => {
  e && e.stopPropagation();
  const k = `park-petpat-${dkey()}-${me()}`;
  const card = el.closest('.pet-card, .modal');
  const holder = card && card.querySelector('.pet-stage, .pet-big');
  if (holder) { const old = holder.innerHTML; holder.innerHTML = catPose('belly', petState().wear); holder.classList.add('pet-flip'); setTimeout(() => { holder.innerHTML = old; holder.classList.remove('pet-flip'); }, 1400); }
  const r = el.getBoundingClientRect(); floaty(r.left + r.width / 2, r.top, ['#2b2633', '#ff9db4', '#ffd970']);
  sfx('heart');
  if (localStorage.getItem(k)) return toast(`${petState().name} 呼嚕呼嚕～（今天摸過了，明天再來）`);
  localStorage.setItem(k, '1');
  await petXP(3, 'pat');
  await S.store.coupleTx(S.cid, (c) => ({ 'pet.pats': (((c.pet || {}).pats) || 0) + 1 }));
  lookNightPat();
  toast(`${petState().name} 很開心！經驗 +3`);
};

ACT.petOpen = () => {
  const P = petState();
  const m = openModal(`${mhead(`<i data-ic="heart"></i> ${esc(P.name)}`)}
    <div class="pet-room big ${dutyVisitor() ? 'has-visitor' : ''}"><div class="pet-big">${petArt(P, true)}</div>${dutyVisitor()}</div>
    ${dutyVisitor() ? `<p class="center small duty-say" style="margin:0 0 4px;color:var(--accent)">${dutyText()}</p>` : ''}
    <p class="center muted" style="margin:0 0 4px">${PET_STAGES[P.show].name}・${PET_TIME_TEXT[petTimePose()] || PET_MOOD_TEXT[P.mood]}</p>
    <div class="btn-row" style="justify-content:center;margin-bottom:12px">
      <button class="btn sm" data-act="petPat">摸摸</button>
      <button class="btn sm ghost" id="pt-feed">餵罐罐 <small>${canState().daily ? '今天的' : `剩 ${canState().stock} 個`}</small></button>
    </div>
    <h3 class="pet-h">長大</h3>
    <div class="pet-forms">${PET_STAGES.map((s, i) => `<button data-form="${i}" class="${P.show === i ? 'on' : ''} ${i > P.st ? 'lk' : ''}" ${i > P.st ? 'disabled' : ''}>${i > P.st ? `<span class="q-emb">${avQuestionSVG()}</span>` : `${petSVG(i, 'ok', '', { blink: false })}<span>${s.name}</span>`}</button>`).join('')}</div>
    <h3 class="pet-h">裝扮</h3>
    <div class="pet-forms looks">${(() => { const U = lookUnlocked(); return `<button data-look="" class="${!P.look ? 'on' : ''}"><span class="none">不換</span></button>` + PET_LOOKS.map((l) => U.has(l.id) ? `<button data-look="${l.id}" class="${P.look === l.id ? 'on' : ''}">${petSVG(P.show, 'ok', '', { blink: false, look: l.id })}<span>${l.name}</span></button>` : `<button class="lk" disabled><span class="q-emb">${avQuestionSVG()}</span><small>${esc(l.hint)}</small></button>`).join(''); })()}</div>
    <h3 class="pet-h">配件</h3>
    <div class="pet-acc">
      <button data-w="" class="${!P.wear ? 'on' : ''}"><span>不戴</span></button>
      ${PET_ACC.map((a) => { const ok = P.unlocked.some((x) => x.id === a.id); return ok
        ? `<button data-w="${a.id}" class="${P.wear === a.id ? 'on' : ''}"><span class="pet-thumb">${petSVG(2, 'ok', a.id, { blink: false })}</span>${a.name}</button>`
        : `<button class="locked sil" disabled><span class="pet-thumb">${petSVG(2, 'ok', a.id, { blink: false })}</span>？？？<small>${a.gacha ? '扭蛋時偶爾會掉' : a.anniv ? '某個特別的日子' : a.month ? '某個冬天的節日' : '再長大一點'}</small></button>`; }).join('')}
    </div>`);
  $$('.pet-forms:not(.looks) button[data-form]', m).forEach((b) => b.onclick = async () => {
    await S.store.updateCouple(S.cid, { 'pet.form': +b.dataset.form });
    closeModal(m); ACT.petOpen();
  });
  $$('.pet-forms.looks button[data-look]', m).forEach((b) => b.onclick = async () => {
    await S.store.updateCouple(S.cid, { 'pet.look': b.dataset.look });
    closeModal(m); ACT.petOpen();
  });
  $$('.pet-acc button', m).forEach((b) => b.onclick = async () => {
    await S.store.updateCouple(S.cid, { 'pet.wear': b.dataset.w });
    closeModal(m); ACT.petOpen();
  });
  $('#pt-feed', m).onclick = async () => {
    if (!(await feedCan())) return toast('今天的罐罐吃完了。回答問題、做任務，或等小動物送來');
    await petXP(8, 'feed');
    toast(`${P.name} 吃得好開心！經驗 +8`); closeModal(m); ACT.petOpen();
  };
};
// ============================================================
//  合照相簿牆：時間軸、足跡的照片自動收進來，也可以另外上傳
// ============================================================

function albumItems() {
  const out = [];
  for (const p of list('photos')) out.push({ src: p.img, cap: p.caption || '', date: p.date || dkey(new Date(p.at)), by: p.by, kind: 'photo', id: p.id });
  for (const m of list('memories')) if (m.cover) out.push({ src: m.cover, cap: m.title, date: m.date || dkey(new Date(m.at)), kind: 'memory', id: m.id });
  for (const t of list('trips')) if (t.cover) out.push({ src: t.cover, cap: t.name, date: t.date || dkey(new Date(t.at)), kind: 'trip', id: t.id });
  return out.sort((a, b) => b.date.localeCompare(a.date));
}

function memAlbum() {
  const all = albumItems();
  const years = [...new Set(all.map((x) => x.date.slice(0, 4)))].sort().reverse();
  const y = S.albumYear && years.includes(S.albumYear) ? S.albumYear : 'all';
  const items = y === 'all' ? all : all.filter((x) => x.date.startsWith(y));
  const tilt = (s) => { let h = 0; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) | 0; return ((Math.abs(h) % 7) - 3) * .9; };
  return `<button class="btn block" data-act="albumAdd" style="margin-bottom:10px"><i data-ic="camera"></i> 放一張合照</button>
    ${years.length > 1 ? `<div class="seg" style="margin-bottom:10px">${['all', ...years].map((k) => `<button class="${y === k ? 'on' : ''}" data-act="albumYear" data-y="${k}">${k === 'all' ? '全部' : k}</button>`).join('')}</div>` : ''}
    ${items.length ? `<div class="polaroids">${items.map((x, i) => `<button class="polaroid" style="--t:${tilt(x.id + i)}deg" data-act="albumView" data-i="${all.indexOf(x)}">
        <span class="pp" style="background-image:url('${x.src}')"></span>
        <span class="pc">${esc(x.cap) || '&nbsp;'}</span><span class="pd">${x.date.replace(/-/g, '.')}</span></button>`).join('')}</div>`
    : '<div class="empty"><span class="big"><i data-ic="camera"></i></span>還沒有照片<br><span class="small">時間軸和足跡放的照片也會自動出現在這裡</span></div>'}`;
}

ACT.albumYear = (el) => { S.albumYear = el.dataset.y; render(); };

ACT.albumAdd = () => {
  const t = { img: '', caption: '', date: dkey() };
  const m = openModal(`${mhead('<i data-ic="camera"></i> 放一張合照')}
    <label class="photo-pick" id="al-pp"><span>點這裡選照片</span><input type="file" accept="image/*" id="al-f" hidden></label>
    <label>寫一句話（可以不寫）</label><input id="al-c" maxlength="30" placeholder="例如：第一次一起看海">
    <label>日期</label><input id="al-d" type="date" value="${t.date}">
    ${list('trips').length ? `<label>在哪裡拍的（會出現在足跡地圖上，可以不選）</label><select id="al-t"><option value="">不標地點</option>${list('trips').slice().sort((a, b) => (b.date || '').localeCompare(a.date || '')).map((x) => `<option value="${x.id}">${esc(x.name)}${x.date ? '・' + x.date : ''}</option>`).join('')}</select>` : ''}
    <button class="btn block mt" id="al-ok">放進相簿</button>`);
  $('#al-f', m).onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    t.img = await compressImage(f, 900);
    const pp = $('#al-pp', m); pp.style.backgroundImage = `url('${t.img}')`; pp.classList.add('has'); pp.firstChild.textContent = '換一張';
  };
  $('#al-ok', m).onclick = async () => {
    if (!t.img) return toast('先選一張照片');
    await col('photos').add({ img: t.img, caption: $('#al-c', m).value.trim(), date: $('#al-d', m).value || dkey(), tripId: ($('#al-t', m) || {}).value || '', by: me(), at: now() });
    closeModal(m); toast('放進相簿了'); sfx('pop');
  };
};

ACT.albumView = (el) => {
  const all = albumItems();
  let i = +el.dataset.i;
  const m = openModal(`<div class="album-view" id="av"></div>`, { center: true });
  const draw = () => {
    const x = all[i];
    $('#av', m).innerHTML = `<div class="polaroid big" style="--t:0deg"><span class="pp" style="background-image:url('${x.src}')"></span><span class="pc">${esc(x.cap) || '&nbsp;'}</span><span class="pd">${x.date.replace(/-/g, '.')}${x.kind === 'memory' ? '・時間軸' : x.kind === 'trip' ? '・足跡' : ''}</span></div>
      <div class="btn-row" style="justify-content:space-between;margin-top:12px">
        <button class="btn sm ghost" id="av-p" ${i <= 0 ? 'disabled' : ''}>‹ 上一張</button>
        ${x.kind === 'photo' && x.by === me() ? '<button class="btn sm ghost" id="av-del" style="color:#d4405f">刪除</button>' : ''}
        <button class="btn sm ghost" id="av-n" ${i >= all.length - 1 ? 'disabled' : ''}>下一張 ›</button>
      </div>`;
    $('#av-p', m).onclick = () => { i--; draw(); };
    $('#av-n', m).onclick = () => { i++; draw(); };
    const d = $('#av-del', m);
    if (d) d.onclick = async () => { if (!(await confirmBox('確定刪除這張照片？', '刪除'))) return; await col('photos').remove(x.id); closeModal(m); toast('刪除了'); };
  };
  draw();
};
// ============================================================
//  季任務：深度問答。每季同一組題目，每年重複，看見價值觀的變化
// ============================================================

const DEEP_SEASONS = [
  { name: '春・關係', desc: '我們怎麼相處', qs: [
    '你覺得我們現在最好的地方是什麼？',
    '最近一次覺得被我好好照顧，是什麼時候？',
    '吵架的時候，你最希望我怎麼做？',
    '你覺得「在一起很久」最難的是什麼？',
    '有沒有一件事你一直想跟我說，但還沒說？',
    '如果用三個詞形容現在的我們，會是哪三個？',
  ] },
  { name: '夏・未來', desc: '我們想去哪裡', qs: [
    '五年後的某個週末早上，你希望我們在做什麼？',
    '你理想中的家是什麼樣子？在哪裡、有什麼？',
    '對你來說，結婚代表什麼？',
    '有沒有一個我們一定要一起完成的夢想？',
    '你希望十年後的自己，跟現在最不一樣的地方是？',
    '如果明天可以搬到世界上任何地方住一年，你會選哪裡？',
  ] },
  { name: '秋・價值觀', desc: '什麼對我們重要', qs: [
    '錢對你來說代表什麼？安全感、自由，還是別的？',
    '工作和生活，現在的你比較偏向哪一邊？為什麼？',
    '你覺得家人和伴侶之間，界線應該在哪裡？',
    '什麼事情是你絕對不會妥協的？',
    '你最想從你的家庭帶走的一件事？最想留下不要的一件事？',
    '如果要一起存一筆大錢，你最想花在什麼上？',
  ] },
  { name: '冬・自己', desc: '更認識彼此一點', qs: [
    '這一年你最驕傲的一件事是什麼？',
    '這一年最辛苦的時刻，你是怎麼撐過來的？',
    '最近你最害怕或最擔心的是什麼？',
    '有什麼事情是你希望我更懂你一點的？',
    '你覺得這一年自己最大的改變是什麼？',
    '明年你最想對自己好的方式是什麼？',
  ] },
];

const deepQ = (d = new Date()) => Math.floor(d.getMonth() / 3);
const deepId = (y, q, i) => `${y}-Q${q + 1}-${i}`;

function deepProgress(y = new Date().getFullYear(), q = deepQ()) {
  const ms = S.couple.members;
  const docs = DEEP_SEASONS[q].qs.map((_, i) => list('deep').find((x) => x.id === deepId(y, q, i)));
  const mine = docs.filter((d) => d && d.answers && d.answers[me()]).length;
  const both = docs.filter((d) => d && d.answers && ms.length > 1 && ms.every((u) => d.answers[u])).length;
  return { mine, both, total: docs.length, docs };
}

function memDeep() {
  const y = new Date().getFullYear(), q = deepQ(), Sx = DEEP_SEASONS[q], p = partner();
  const P = deepProgress(y, q);
  const done = P.both === P.total;
  return `<div class="card deep-head">
      <div class="dh-season">${y}・${Sx.name}</div>
      <div class="small muted">${Sx.desc}。兩個人都寫完，答案才會同時打開。同一季的題目每年都會再出現，可以看看自己和對方的想法有沒有變。</div>
      <button class="btn sm ghost dh-yrs" data-act="deepYears" data-q="${q}"><i data-ic="clock"></i> 歷年回答</button>
      <div class="small muted">我寫了 ${P.mine}/${P.total}・一起揭曉 ${P.both}/${P.total}${done ? '・本季完成！' : '・全部完成兩人各 +20 點'}</div>
    </div>
    ${Sx.qs.map((qt, i) => {
      const d = P.docs[i], A = (d && d.answers) || {};
      const mineA = A[me()], theirA = p ? A[p] : null;
      const open = mineA && theirA;
      const past = [];
      for (let yy = y - 1; yy >= y - 5; yy--) { const pd = list('deep').find((x) => x.id === deepId(yy, q, i)); if (pd && pd.answers && pd.answers[me()] && (!p || pd.answers[p])) past.push([yy, pd.answers]); }
      return `<div class="card deep-q ${open ? 'open' : ''}">
        <div class="dq-n">Q${i + 1}</div><div class="dq-t">${esc(qt)}</div>
        ${open ? `<div class="dq-a"><b>${avatar(me())} ${esc(nick(me()))}</b><p>${esc(mineA.text)}</p></div><div class="dq-a"><b>${avatar(p)} ${esc(nick(p))}</b><p>${esc(theirA.text)}</p></div>`
          : `<div class="dq-status small muted">${mineA ? `<i data-ic="lock"></i> 我寫好了，等 ${esc(nick(p) || '對方')}` : theirA ? `${esc(nick(p))} 寫好了，換你` : '兩個人都還沒寫'}</div>
             <button class="btn sm ${mineA ? 'ghost' : ''}" data-act="deepAnswer" data-i="${i}">${mineA ? '修改我的答案' : '寫答案'}</button>`}
        ${past.length ? `<button class="link dq-yrs" data-act="deepYears" data-q="${q}" data-i="${i}"><i data-ic="clock"></i> 看歷年回答（${past.length + (open ? 1 : 0)} 年）</button>` : ''}
      </div>`;
    }).join('')}`;
}

ACT.deepAnswer = async (el) => {
  const y = new Date().getFullYear(), q = deepQ(), i = +el.dataset.i, id = deepId(y, q, i);
  const doc = list('deep').find((x) => x.id === id);
  const cur = doc && doc.answers && doc.answers[me()];
  const v = await promptBox(DEEP_SEASONS[q].qs[i], { multiline: true, value: cur ? cur.text : '', placeholder: '慢慢寫，對方寫完才會看到', ok: '封好' });
  if (!v || !v.trim()) return;
  const ans = { text: v.trim(), at: now() };
  if (doc) await col('deep').update(id, { [`answers.${me()}`]: ans });
  else await col('deep').set(id, { y, q, i, answers: { [me()]: ans }, at: now() });
  const p = partner();
  const theirs = doc && doc.answers && p && doc.answers[p];
  if (!cur) petXP(5);
  if (theirs && !cur) { toast('兩個人都寫好了，答案打開了'); sfx('chime'); if (p) await notify(p, 'deep', `季問答第 ${i + 1} 題，兩個人的答案打開了`); }
  else { toast('封好了，等對方寫完一起打開'); if (p && !cur) await notify(p, 'deep', `${nick(me())} 寫好季問答第 ${i + 1} 題了`); }
  // 本季全部一起揭曉：各 +20 點（只發一次）
  setTimeout(async () => {
    const P = deepProgress(y, q);
    if (P.both === P.total) {
      const k = `deep-${y}-Q${q + 1}`;
      const ok = await S.store.coupleTx(S.cid, (x) => (x.drops && x.drops[k] ? null : { [`drops.${k}`]: true }));
      if (ok) { for (const u of S.couple.members) await addPoints(u, 20, `季問答完成：${DEEP_SEASONS[q].name}`); confetti(90); toast('本季問答全部完成！兩人各 +20 點'); }
    }
  }, 600);
};

// ---------- 歷年回答：同一題，每一年兩個人並排 ----------
function deepYearsOf(q, i) {
  const ms = S.couple.members;
  return list('deep').filter((x) => x.q === q && x.i === i && x.answers && ms.length > 1 && ms.every((u) => x.answers[u])).sort((a, b) => b.y - a.y);
}
ACT.deepYears = (el) => {
  let q = el && el.dataset.q != null ? +el.dataset.q : deepQ();
  const only = el && el.dataset.i != null && el.dataset.i !== '' ? +el.dataset.i : null;
  const p = partner(), ms = [me(), p];
  const m = openModal(`${mhead('<i data-ic="clock"></i> 歷年回答')}<div id="dy"></div>`);
  const draw = () => {
    const Sx = DEEP_SEASONS[q];
    const qs = Sx.qs.map((t, i) => [t, i]).filter(([, i]) => only == null || i === only);
    const any = qs.some(([, i]) => deepYearsOf(q, i).length);
    $('#dy', m).innerHTML = `${only == null ? `<div class="seg dy-seg">${DEEP_SEASONS.map((x, k) => `<button data-q="${k}" class="${k === q ? 'on' : ''}">${x.name.split('・')[0]}</button>`).join('')}</div>` : ''}
      <div class="dy-head emb-${['F-date', 'F-travel', 'F-anniv', 'F-xmas'][q]}"><b>${Sx.name}</b><span>${Sx.desc}</span></div>
      ${any ? qs.map(([t, i]) => { const ys = deepYearsOf(q, i); return ys.length ? `<div class="dy-q">
        <div class="dy-qt"><span>Q${i + 1}</span>${esc(t)}</div>
        <div class="dy-cols"><span>${avatar(me())} ${esc(nick(me()))}</span><span>${avatar(p)} ${esc(nick(p))}</span></div>
        ${ys.map((d) => `<div class="dy-row"><div class="dy-y"><b>${d.y}</b></div><div class="dy-a">${ms.map((u) => `<p>${esc(d.answers[u].text)}</p>`).join('')}</div></div>`).join('')}
      </div>` : ''; }).join('')
      : '<div class="empty">這一季還沒有兩個人都寫完的題目。<br>每年同一季會再問一次同樣的題目，寫過的答案會一年一年排在這裡。</div>'}`;
    $$('.dy-seg button', m).forEach((b) => b.onclick = () => { q = +b.dataset.q; draw(); });
  };
  draw();
};
// ============================================================
//  第一次打開的導覽：小小黑帶路，介紹五個分頁
// ============================================================
const TOUR = [
  { tab: 'home', pose: 'wave', t: '嗨，我是小小黑！', s: '這裡是你們兩個人的遊樂園。首頁有在一起的天數和今天的心情；右上角的愛心按一下，對方就會知道你在想他。我住在首頁，常來摸摸我，我會慢慢長大喔。' },
  { tab: 'wallet', pose: 'box', t: '票夾', s: '收到的票券都放在這裡。新卡要先刮開，想用的時候長按就能兌換，對方會馬上收到。收藏冊裡是你們一張一張集起來的卡。' },
  { tab: 'play', pose: 'yarn', t: '遊樂區', s: '扭蛋機用點數或扭蛋券轉。完成每週任務、對戰挑戰、回答問題都能拿點數；蓋章集滿也會送扭蛋券。' },
  { tab: 'travel', pose: 'suitcase', t: '約會', s: '排好的約會可以加進手機行事曆。沒想法就去點子罐搖一個；想看的、想吃的、想去的都先記進清單。' },
  { tab: 'memory', pose: 'loaf', t: '回憶', s: '時間軸、相簿、紙條盒和季問答都在這裡。很多東西要一起玩才會出現，慢慢發現吧！' },
];
function tourNeeded() {
  return S.couple && (S.couple.members || []).length >= 2 && !localStorage.getItem(`park-tour-${me()}`) && !document.querySelector('.anniv-intro, .tour, .story');
}
function startTour(force) {
  if (!force && !tourNeeded()) return;
  localStorage.setItem(`park-tour-${me()}`, '1');
  let k = 0;
  const el = document.createElement('div');
  el.className = 'tour';
  document.body.appendChild(el);
  const draw = () => {
    const st = TOUR[k];
    S.tab = st.tab; render();
    setTimeout(() => {
      const nb = document.querySelector(`.nav [data-tab="${st.tab}"]`);
      const r = nb ? nb.getBoundingClientRect() : null;
      el.innerHTML = `<div class="tour-dim"></div>
        ${r ? `<div class="tour-spot" style="left:${r.left + r.width / 2 - 34}px;top:${r.top + r.height / 2 - 34}px"></div>` : ''}
        <div class="tour-box">
          <div class="tour-cat">${catPose(st.pose, typeof petState === 'function' ? petState().wear : '')}</div>
          <div class="tour-bubble"><b>${st.t}</b><p>${st.s}</p>
            <div class="tour-foot"><span class="tour-dots">${TOUR.map((_, i) => `<i class="${i === k ? 'on' : ''}"></i>`).join('')}</span>
              <span>${k ? '<button class="link" data-tour="-1">上一步</button>' : '<button class="link" data-tour="skip">略過</button>'}<button class="btn sm" data-tour="1">${k === TOUR.length - 1 ? '開始玩！' : '下一步'}</button></span></div></div>
        </div>`;
      $$('[data-tour]', el).forEach((b) => b.onclick = () => {
        const v = b.dataset.tour;
        if (v === 'skip' || (v === '1' && k === TOUR.length - 1)) { el.remove(); S.tab = 'home'; render(); if (v === '1') { confetti(60); sfx('chime'); } setTimeout(bdayReveal, 900); return; }
        k += +v; draw();
      });
    }, 120);
  };
  draw();
}
ACT.tourReplay = () => { closeAll(); startTour(true); };

// 導覽結束之後，才把生日卡送到他面前（週年動畫 → 導覽 → 生日卡）
function bdayReveal() {
  const key = `park-bday-reveal-${S.cid}-${me()}`;
  if (localStorage.getItem(key) || document.querySelector('.anniv-intro, .tour, .story, .bday-reveal, .modal-back')) return;
  const mine = list('cards').filter((c) => c.owner === me() && c.series === D.BIRTHDAY_SERIES);
  if (!mine.length) return;
  localStorage.setItem(key, '1');
  const m = openModal(`<div class="bday-reveal center">
      <div class="br-emb">${typeof bookMotif === 'function' ? `<svg viewBox="-60 -60 120 120" class="emb-C" width="120" height="120"><circle r="56" class="e-bg e-ink-s" stroke-width="1.4"/><circle r="49" class="e-acc-s" stroke-width=".8" fill="none" stroke-dasharray="2 3"/>${bookMotif('candle')}</svg>` : ''}</div>
      <h3 style="justify-content:center;margin:6px 0 2px">${esc(D.BIRTHDAY_SERIES)}</h3>
      <p class="small muted" style="margin:0 0 12px">${esc(nick(S.couple.creator))} 為你準備了 ${mine.length} 張生日卡，放在你的票夾裡了</p>
      <button class="btn block" id="br-go">去看看</button>
      <button class="link center" id="br-later" style="display:block;margin:8px auto 0">等一下再看</button>
    </div>`, { center: true });
  confetti(80); sfx('chime');
  $('#br-go', m).onclick = () => { closeModal(m); S.tab = 'wallet'; render(); };
  $('#br-later', m).onclick = () => closeModal(m);
}
// ============================================================
//  小動物：雙人小劇場、值日生、節日／心情限定、圖鑑書
// ============================================================

// ---------- 雙人小劇場（兩隻一起路過，點牠們就會演一段） ----------
// who：a / b 是兩位演員，n 是旁白
const SCENES = [
  { id: 'tail', a: 'doggy', b: 'black', lead: 'black', title: '尾巴事件',
    lines: [['n', '狗狗偷偷拍了一下小小黑的尾巴'], ['b', '喵？'], ['n', '小小黑轉身抱住狗狗'], ['a', '（愣住）……汪']] },
  { id: 'chase', a: 'haohao', b: 'black', lead: 'black', title: '把拔貓咪',
    lines: [['a', '嗷～把拔貓咪好可愛喔～'], ['b', '還好，好煩'], ['a', '把拔貓咪等等我～你好可愛喔～']] },
  { id: 'step', a: 'gungun', b: 'doggy', lead: 'doggy', title: '踩踩',
    lines: [['a', '狗狗～❤️（踩）'], ['b', '……'], ['a', '狗狗～❤️（踩）'], ['n', '狗狗默默走開了'], ['a', '……狗（跟上去）']] },
  { id: 'bath', a: 'doggy', b: 'abian', lead: 'abian', title: '那你呢',
    lines: [['a', '汪，去洗澡'], ['b', '（思考）……那你呢？'], ['a', '（假裝沒聽到）'], ['b', '（拍拍手）']] },
  { id: 'waltz', a: 'abian', b: 'haohao', lead: 'abian', title: '諧音梗',
    lines: [['a', '還好，你知道什麼狗最會跳舞嗎？'], ['b', '嗷？'], ['a', '「汪」爾滋！'], ['a', '（自己笑到拍拍手）']] },
  { id: 'flower', a: 'tuxedo', b: 'white', lead: 'white', title: '一朵花',
    lines: [['n', '吵吵貓送陷阱貓一朵花'], ['b', '哼，我就收下吧'], ['n', '吵吵貓開心到跌倒了']] },
  { id: 'mine', a: 'orange', b: 'calico', lead: 'calico', title: '這是我的！',
    lines: [['n', '晽晽貓貓看到小魚乾走過來'], ['n', '晽晽貓貓直接把小魚乾撞飛'], ['a', '（抱緊自己的小魚乾）這是我的！'], ['b', '……喵？']] },
  { id: 'eatshark', a: 'orange', b: 'shark', lead: 'shark', title: '被吃掉了',
    lines: [['n', '晽晽貓貓一口把鯊魚吃掉了'], ['a', '嗝～'], ['b', '長長長 長長長 長長長長 長完了～'], ['b', '人類～我被吃掉了喔？']] },
  { id: 'nose', a: 'abian', b: 'shark', lead: 'shark', title: '鼻子',
    lines: [['b', '人類～……啊不對，你是阿扁'], ['a', '（摀住鼻子）你不要碰我的鼻子，我也不碰你的'], ['b', '好～'], ['n', '鯊魚碰了一下自己的鼻子，關機了'], ['a', '（拍拍手）']] },
  { id: 'hello', a: 'gungun', b: 'shark', lead: 'shark', title: '哈囉',
    lines: [['a', '棍～'], ['b', '人類～哈囉～'], ['a', '……魚'], ['b', '我是鯊魚～'], ['n', '小棍棍踩了鯊魚一下，鯊魚開心地游走了']] },
  { id: 'bask', a: 'black', b: 'white', lead: 'black', title: '曬太陽',
    lines: [['n', '小小黑走到陷阱貓旁邊'], ['b', '這裡很溫暖，你也一起來曬吧'], ['a', '喵～'], ['n', '兩隻貓並排趴著，一起曬太陽']] },
  { id: 'aflower', a: 'tuxedo', b: 'abian', lead: 'tuxedo', title: '阿扁花',
    lines: [['a', '（叼來一朵花）給你'], ['b', '這是什麼花？'], ['a', '不知道'], ['b', '那我叫它「阿扁花」'], ['n', '阿扁拍拍手']] },
  { id: 'trap', a: 'white', b: 'shark', lead: 'shark', title: '陷阱',
    lines: [['n', '陷阱貓躲在紙箱後面'], ['b', '人類～……箱子～哈囉～'], ['a', '……我是陷阱'], ['b', '陷阱～哈囉～'], ['n', '陷阱貓放棄了']] },
  { id: 'sunspot', a: 'orange', b: 'calico', lead: 'calico', title: '搶位子',
    lines: [['n', '小魚乾在窗邊曬太陽'], ['a', '讓開，這是我的位子'], ['b', '喵！（我先來的）'], ['n', '晽晽貓貓直接坐上去，把小魚乾擠下去了']] },
  { id: 'snack', a: 'orange', b: 'calico', lead: 'calico', title: '偷吃',
    lines: [['n', '小魚乾在吃罐罐'], ['a', '（湊過來）你在吃什麼？'], ['b', '嘶——'], ['n', '晽晽貓貓一屁股把小魚乾撞開，把罐罐吃光了']] },
  { id: 'scare', a: 'haohao', b: 'calico', lead: 'calico', title: '嚇一跳',
    lines: [['a', '嗷！'], ['n', '小魚乾嚇到整隻跳起來'], ['b', '（躲到你後面撒嬌）'], ['a', '哈囉貓咪～']] },
  { id: 'smell', a: 'haohao', b: 'doggy', lead: 'doggy', title: '香香',
    lines: [['b', '汪，去洗澡'], ['a', '我是女生～女生都香香的～'], ['b', '（聞一聞）……汪，去洗澡']] },
  { id: 'apple', a: 'gungun', b: 'haohao', lead: 'gungun', title: '球球',
    lines: [['a', '蘋果～'], ['b', '嗷！球球！（把蘋果叼走了）'], ['a', '……果']] },
  { id: 'can', a: 'white', b: 'tuxedo', lead: 'white', title: '公主的罐罐',
    lines: [['a', '我的罐罐呢？'], ['n', '吵吵貓把自己的罐罐推過去'], ['a', '……哼，算你懂事'], ['b', '喵！喵喵！（其實已經偷吃一半了）']] },
  { id: 'off', a: 'abian', b: 'shark', lead: 'abian', title: '關機',
    lines: [['n', '阿扁好奇碰了一下鯊魚的鼻子'], ['n', '鯊魚關機了'], ['a', '（思考）……我是不是把牠弄壞了？'], ['n', '阿扁再碰一下'], ['b', '河！'], ['n', '阿扁嚇到摀住自己的鼻子']] },
  { id: 'drum', a: 'haohao', b: 'orange', lead: 'orange', title: '雞腿',
    lines: [['a', '嗷！球球！'], ['b', '這是雞腿'], ['a', '……嗷？'], ['n', '晽晽貓貓抱緊雞腿滾走了']] },
  { id: 'flower2', a: 'tuxedo', b: 'doggy', lead: 'doggy', title: '送狗狗一朵花',
    lines: [['n', '吵吵貓送狗狗一朵花'], ['b', '（聞了聞）汪，香香的'], ['n', '吵吵貓開心到原地轉圈'], ['n', '狗狗把花戴在自己頭上']] },
  { id: 'half', a: 'gungun', b: 'black', lead: 'black', title: '分你一半',
    lines: [['a', '蘋……果～'], ['n', '小棍棍咬一口，把剩下的推給小小黑'], ['b', '（聞一聞）……喵？'], ['a', '……果（自己吃掉了）']] },
  { id: 'smell2', a: 'doggy', b: 'white', lead: 'white', title: '誰比較香',
    lines: [['a', '（聞了聞陷阱貓）汪，還算香'], ['b', '我當然香'], ['a', '（再聞一下）汪，去洗澡'], ['n', '陷阱貓炸毛了']] },
  { id: 'step2', a: 'gungun', b: 'haohao', lead: 'haohao', title: '也是狗狗',
    lines: [['a', '狗狗～❤️（踩）'], ['b', '嗷～小棍棍好可愛喔～']] },
];
const sceneSeen = () => S.couple?.scenes || {};

function pickScene(k) {
  // 小劇場：每人每天最多看到 1 齣新的，其他時候重演看過的
  const cand = SCENES.filter((s) => s.a === k || s.b === k);
  if (!cand.length || Math.random() > .3) return null;
  const fresh = cand.filter((s) => !sceneSeen()[s.id]), old = cand.filter((s) => sceneSeen()[s.id]);
  const q = dexQuota('scene');
  if (fresh.length && (q.used < 1 || trialOpen()) && Math.random() < (old.length ? .35 : .6)) { q.use(); return fresh[Math.floor(Math.random() * fresh.length)]; }
  return old.length ? old[Math.floor(Math.random() * old.length)] : null;
}

function bubble(text, x, top, cls = '') {
  const b = document.createElement('div');
  b.className = `fr-bubble ${cls}`;
  b.textContent = text;
  document.body.appendChild(b);
  const w = b.offsetWidth, vw = innerWidth;
  b.style.left = Math.max(8, Math.min(vw - w - 8, x - w / 2)) + 'px';
  b.style.top = Math.max(8, top - b.offsetHeight - 8) + 'px';
  b.style.setProperty('--tail', Math.max(14, Math.min(w - 14, x - parseFloat(b.style.left))) + 'px');
  return b;
}

function duoStroll(sc) {
  if (!sc || document.querySelector('.modal-back')) return;
  document.querySelectorAll('.cat-stroll').forEach((x) => x.remove());
  const other = sc.lead === sc.a ? sc.b : sc.a;
  const dur = 12, lead = walker(sc.lead, 'duo'), back = walker(other, 'duo');
  const gap = (FRIENDS[other].w + 12) / (innerWidth + 180) * dur;
  [lead, back].forEach((e) => { e.style.animationDuration = dur + 's'; });
  lead.style.animationDelay = `-${gap.toFixed(2)}s`;
  const byKey = { [sc.lead]: lead, [other]: back };
  let timer = setTimeout(() => { lead.remove(); back.remove(); }, dur * 1000 + 500);
  let played = false;
  const play = async () => {
    if (played) return; played = true;
    clearTimeout(timer);
    [lead, back].forEach((e) => e.classList.add('paused'));
    sfx('heart');
    const ra = byKey[sc.a].getBoundingClientRect(), rb = byKey[sc.b].getBoundingClientRect();
    // 點一下才講下一句（12 秒都沒點就自己結束）
    let quit = false;
    for (const [i, [who, t]] of sc.lines.entries()) {
      let b;
      if (who === 'n') b = bubble(t, (ra.left + ra.right + rb.left + rb.right) / 4, Math.min(ra.top, rb.top) - 34, 'narr');
      else { const r = who === 'a' ? ra : rb; b = bubble(t, r.left + r.width * .55, r.top + 6); byKey[sc[who]].classList.add('talk'); }
      b.insertAdjacentHTML('beforeend', `<span class="fr-next">${i < sc.lines.length - 1 ? '點一下繼續' : '點一下結束'}</span>`);
      await sleep(350);   // 避免同一下點擊直接跳過
      // 只有點對話框或牠們才會繼續，點畫面其他地方照常（不會被吃掉）
      b.classList.add('tappable');
      const tapped = await new Promise((res) => {
        const els = [b, lead, back];
        const done = (v) => { clearTimeout(tm); els.forEach((x) => x.removeEventListener('click', on, true)); res(v); };
        const tm = setTimeout(() => done(false), 12000);
        function on(e) { e.stopPropagation(); e.preventDefault(); done(true); }
        els.forEach((x) => x.addEventListener('click', on, true));
      });
      b.classList.add('out'); setTimeout(() => b.remove(), 300);
      [lead, back].forEach((e) => e.classList.remove('talk'));
      if (!tapped) { quit = true; break; }
      sfx('pop');
    }
    [lead, back].forEach((e) => e.classList.remove('paused'));
    timer = setTimeout(() => { lead.remove(); back.remove(); }, dur * 1000);
    if (sc.a === 'black' || sc.b === 'black') blackPatXP();
    dexNote(sc.a, null); dexNote(sc.b, null);
    if (S.couple && !sceneSeen()[sc.id]) {
      await S.store.updateCouple(S.cid, { [`scenes.${sc.id}`]: { at: now(), by: me() } });
      toast(`小劇場收進圖鑑：〈${sc.title}〉`);
    }
  };
  lead.onclick = play; back.onclick = play;
  document.body.appendChild(back); document.body.appendChild(lead);
}
window.__scene = (id) => duoStroll(SCENES.find((s) => s.id === id) || SCENES[0]);

function blackPatXP() {
  const dk = `park-stroll-pat-${dkey()}-${me()}`;
  if (!localStorage.getItem(dk) && typeof petXP === 'function') { localStorage.setItem(dk, '1'); petXP(1); }
}

// ---------- 節日／心情 ----------
const FEST_NAMES = { morning: '早上', eaten: '被吃掉', eaten2: '被吃掉', anniv: '週年', bday: '生日', xmas: '聖誕', newyear: '新年', valentine: '情人節', halloween: '萬聖節', rain: '下雨心情' };
function festNow() {
  const pv = localStorage.getItem('park-fest-preview');
  if (pv) return pv;
  if (!S.couple) return '';
  if (typeof annivInfo === 'function' && annivInfo().is) return 'anniv';
  const t = new Date(); t.setHours(0, 0, 0, 0);
  const md = (t.getMonth() + 1) * 100 + t.getDate();
  const bday = (S.couple.members || []).some((u) => {
    const [m, d] = String(S.couple.profiles?.[u]?.bday || '').split('-').map(Number);
    if (!m || !d) return false;
    return Math.abs(Math.round((t - new Date(t.getFullYear(), m - 1, d)) / 86400000)) <= 1;
  });
  if (bday) return 'bday';
  if (md >= 1220 && md <= 1226) return 'xmas';
  if (md === 1231 || md <= 102) return 'newyear';
  if (md >= 213 && md <= 215) return 'valentine';
  if ((md >= 1029 && md <= 1031) || md === 1101) return 'halloween';
  return '';
}
function myMoodRain() {
  const m = (S.couple?.moods || {})[me()];
  return !!m && (m.icon === '🌧️' || m.icon === '⛈️') && now() - (m.at || 0) < 24 * 3600000;
}

// 限定台詞：只有在那個節日／心情才聽得到
const SPECIAL_LINES = {
  black: [{ w: 'xmas', t: '小小黑戴著聖誕帽，一直想用腳把它撥掉' }, { w: 'anniv', t: '小小黑：喵（週年快樂的意思）' }, { w: 'rain', t: '小小黑跳到你腿上，把自己捲成一團暖暖的' }],
  orange: [{ w: 'newyear', t: '晽晽貓貓：年夜飯！年夜飯在哪裡！' }, { w: 'bday', t: '晽晽貓貓盯著生日蛋糕，口水滴下來了' }],
  white: [{ w: 'bday', t: '陷阱貓：今天壽星最大，陷阱貓讓你一天' }, { w: 'valentine', t: '陷阱貓：陷阱貓今天心情好，給你摸一下' }],
  calico: [{ w: 'bday', t: '小魚乾把最珍貴的一條小魚乾送給壽星' }, { w: 'rain', t: '小魚乾蹭過來撒嬌：不要難過～' }],
  tuxedo: [{ w: 'valentine', t: '吵吵貓今天送了一整束花，結果被花絆倒' }, { w: 'bday', t: '吵吵貓叼著一朵花來說生日快樂' }],
  haohao: [{ w: 'xmas', t: '還好：嗷！聖誕老公公是女生～' }, { w: 'anniv', t: '還好：嗷！週年快樂～我是女生～' }, { w: 'halloween', t: '還好扮成貓咪：嗷把拔，我也是貓咪～' }],
  doggy: [{ w: 'rain', t: '狗狗走過來，把頭靠在你腳邊' }, { w: 'rain', t: '狗狗：汪（今天先不用洗澡，抱抱）' }, { w: 'rain', t: '狗狗香香的，借你聞一下' }, { w: 'xmas', t: '狗狗：汪，聖誕節也要去洗澡' }],
  abian: [{ w: 'newyear', t: '阿扁在思考……新的一年要想什麼' }, { w: 'anniv', t: '阿扁：五週年，「無」週年？（自己拍拍手）' }],
  gungun: [{ w: 'xmas', t: '小棍棍：誕' }, { w: 'valentine', t: '小棍棍：狗狗❤️❤️❤️' }],
  shark: [{ w: 'newyear', t: '鯊魚：河！（新年快樂）' }, { w: 'halloween', t: '鯊魚戴著巫婆帽關機了，看起來很像在裝死' },
    { w: 'morning', t: '鯊魚：人類～早安～' }, { w: 'morning', t: '鯊魚：人類～早安～我今天也很乖～' }, { w: 'morning', t: '鯊魚：人類～早安～（還沒完全開機）' },
    { w: 'eaten', t: '鯊魚：長長長 長長長 長長長長 長完了～' }, { w: 'eaten', t: '鯊魚：人類～我被吃掉了喔？' },
    { w: 'eaten2', t: '鯊魚：長…長…長…' }, { w: 'eaten2', t: '鯊魚：長長長長長長長 呼～長完了' }],
};
function specialNow(k) {
  const f = festNow(), rain = myMoodRain();
  const h = new Date().getHours(), morning = h >= 5 && h < 11;   // 早安只在早上 5～11 點
  return (SPECIAL_LINES[k] || []).map((x, i) => [i, x]).filter(([, x]) => x.w === f || (x.w === 'rain' && rain) || (x.w === 'morning' && morning));
}

// 節日小帽子：畫在每隻動物頭上（座標是各自的 viewBox）
const HAT_AT = {
  black: [30, 39], orange: [30, 37], white: [30, 34], calico: [30, 39], tuxedo: [30, 39],
  doggy: [30, 33], abian: [30, 33], haohao: [32, 11, 1.15], gungun: [28, 23, 1.2], shark: [33, 19, 1.15],
};
function hatSVG(kind) {
  if (kind === 'xmas') return `<path d="M-11 0 Q-9 -15 1 -19 Q10 -22 14 -11 Q9 -14 6 -11 Q9 -5 11 0 Z" fill="#d6434f"/><path d="M-3 -16 Q1 -18 5 -17" stroke="#fff" stroke-opacity=".35" stroke-width="1.4" fill="none" stroke-linecap="round"/><rect x="-12.5" y="-3" width="25" height="6" rx="3" fill="#fbf7f0"/><circle cx="14" cy="-10.5" r="3.3" fill="#fbf7f0"/>`;
  if (kind === 'bday' || kind === 'newyear') {
    const [a, b] = kind === 'bday' ? ['#f59ab4', '#fff3c4'] : ['#d84a3a', '#f5c451'];
    return `<path d="M-8 1 L0 -19 L8 1 Z" fill="${a}"/><path d="M-5.2 -6 L5.2 -6 M-2.8 -12 L2.8 -12" stroke="${b}" stroke-width="2.2"/><circle cx="0" cy="-19.5" r="2.8" fill="${b}"/><ellipse cx="0" cy="1" rx="9" ry="2" fill="${b}"/>`;
  }
  if (kind === 'halloween') return `<ellipse cx="0" cy="0" rx="14" ry="3.2" fill="#3d2b52"/><path d="M-7 -1 Q-4 -12 1 -18 Q6 -22 10 -19 Q5 -17 5 -10 L7 -1 Z" fill="#3d2b52"/><path d="M-6.4 -3.6 L6.6 -3.6" stroke="#f2a33a" stroke-width="2.4"/>`;
  if (kind === 'anniv' || kind === 'valentine') return `<g class="fest-heart"><path d="M0 -4 C-2 -8 -9 -8 -9 -2.5 C-9 2 -3 5.5 0 8 C3 5.5 9 2 9 -2.5 C9 -8 2 -8 0 -4 Z" transform="translate(0 -14) scale(.8)" fill="${kind === 'anniv' ? '#c8283c' : '#ef6f8c'}"/></g>`;
  return '';
}
function withHat(k, svg, kind = festNow()) {
  const at = HAT_AT[k];
  if (!kind || kind === 'rain' || !at) return svg;
  const [x, y, s = 1] = at;
  return svg.replace(/<\/svg>\s*$/, `<g class="fest-hat" transform="translate(${x} ${y}) rotate(-12) scale(${s})">${hatSVG(kind)}</g></svg>`);
}

// ---------- 自己加的台詞 ----------
function customLines(k) {
  const cu = ((S.couple?.dex || {})[k] || {}).cu || {};
  return Object.entries(cu).filter(([, v]) => v && v.t).map(([id, v]) => ({ id, ...v })).sort((a, b) => a.at - b.at);
}
function withName(k, t) { const n = FRIENDS[k].name; return t.includes(n) ? t : `${n}：${t}`; }

// ---------- 值日生（偶爾才有） ----------
function dutyToday() {
  if (!S.couple || (S.couple.members || []).length < 2) return null;
  const pv = localStorage.getItem('park-duty-preview');
  // 只有遇過的小動物才會來當值日生
  const d = S.couple.dex || {};
  // 只算昨天以前遇過的，避免今天新遇到一隻，值日生就中途換人
  const t0 = parseD(dkey()).getTime();
  const pool = DEX_ORDER.filter((k) => k !== 'black' && (d[k] || {}).met && d[k].met < t0);
  if (pv) return pool.includes(pv) ? pv : pool[0] || null;
  if (!pool.length) return null;
  const h = hash('duty' + dkey() + (S.cid || ''));
  if (h % 100 >= 25) return null;   // 大約四天一次
  return pool[(h >>> 8) % pool.length];
}
// 值日生住進小小黑的房間：坐在小小黑旁邊，點牠打招呼
function dutyVisitor() {
  const k = dutyToday();
  if (!k) return '';
  const met = !!((S.couple.dex || {})[k] || {}).met;
  const said = localStorage.getItem(`park-duty2-${dkey()}-${me()}`);
  return `<button class="pet-visitor fr-v-${k} ${met ? '' : 'locked'} ${said ? 'said' : ''}" data-act="dutyHi" data-k="${k}" aria-label="今日值日生">
    <span class="pv-tag">值日生</span>${withHat(k, friendArt(k))}</button>`;
}
function dutyText() {
  const k = dutyToday();
  if (!k) return '';
  const met = !!((S.couple.dex || {})[k] || {}).met;
  const said = localStorage.getItem(`park-duty2-${dkey()}-${me()}`);
  return said || (met ? `今天 ${FRIENDS[k].name} 來陪${esc(petState().name)}值日，點牠打招呼` : '有位沒見過的朋友來值日，點牠看看');
}
ACT.dutyHi = (el) => {
  // 值日生一天只打一次招呼，台詞要慢慢收集
  if (localStorage.getItem(`park-duty2-${dkey()}-${me()}`)) return toast('今天已經打過招呼了，明天見');
  const k = el.dataset.k, r = el.getBoundingClientRect();
  sfx('heart'); floaty(r.left + r.width / 2, r.top, ['#ff9fb4', '#ffd45c']);
  const t = sayLine(k);
  localStorage.setItem(`park-duty2-${dkey()}-${me()}`, t);
  el.classList.add('said', 'hop'); setTimeout(() => el.classList.remove('hop'), 700);
  document.querySelectorAll('.duty-say').forEach((x) => { x.textContent = t; });
};

// ---------- 圖鑑書 ----------
function dexFullCount() {
  const d = S.couple?.dex || {};
  return DEX_ORDER.filter((k) => { const n = Object.keys((d[k] || {}).l || {}).filter((x) => /^\d+$/.test(x)).length; return n >= friendLines(k).length; }).length;
}
function dexStats() {
  const d = S.couple?.dex || {};
  let heard = 0, total = 0;
  DEX_ORDER.forEach((k) => {
    const got = (d[k] || {}).l || {};
    total += friendLines(k).length + (SPECIAL_LINES[k] || []).length;
    heard += Object.keys(got).filter((x) => got[x]).length;
  });
  return { met: dexCount(), heard, total, scenes: Object.keys(sceneSeen()).filter((id) => SCENES.some((s) => s.id === id)).length,
    custom: DEX_ORDER.reduce((n, k) => n + customLines(k).length, 0) };
}

// 封面大合照：後排大的、前排五隻貓，沒遇過是剪影
const COVER_POS = {
  shark: [33, 70, 34], haohao: [-1, 33, 35], doggy: [27, 35, 22], abian: [47, 35, 22], gungun: [66, 34, 34],
  orange: [-1, 3, 22], white: [19, 3, 21], black: [39.5, 3, 21], calico: [59, 3, 21], tuxedo: [79, 3, 21],
};
function coverHTML() {
  const d = S.couple.dex || {}, st = dexStats();
  const got = typeof computeAch === 'function' ? computeAch() : new Set();
  const achs = D.ACHIEVEMENTS.filter((a) => a.cat === 'dex');
  const lineup = DEX_ORDER.map((k, i) => {
    const [l, b, w] = COVER_POS[k], met = !!(d[k] || {}).met;
    const face = l + w / 2 < 50 ? 'r' : 'l';
    return `<button class="dc-ani ${met ? '' : 'locked'} face-${face}" data-go="${i + 1}" style="left:${l}%;bottom:${b}%;width:${w}%;z-index:${b < 20 ? 3 : b > 60 ? 1 : 2}" aria-label="${met ? esc(FRIENDS[k].name) : '還沒遇過'}">${friendArt(k)}</button>`;
  }).join('');
  return `<section class="db-page db-cover">
    <div class="dc-eyebrow">PARK FRIENDS・兩人遊樂園</div>
    <h2 class="dc-title">小動物圖鑑</h2>
    <div class="dc-sub">遇到 <b>${st.met}</b> 位・聽過 <b>${st.heard}</b> 句・小劇場 <b>${st.scenes}</b> 齣</div>
    <div class="dc-frame"><div class="dc-photo">${lineup}<div class="dc-ground"></div></div></div>
    <div class="dc-stamps">${achs.map((a) => `<button class="dc-stamp t-${a.tier} ${got.has(a.id) ? 'on' : ''}" data-desc="${esc(a.name)}：${esc(a.desc)}${a.tier === 'g' ? '（解鎖會掉限定券）' : ''}"><span>${a.mark}</span><small>${esc(a.name)}</small></button>`).join('')}</div>
    <div class="dc-hint">點牠們或往左滑翻頁 <i data-ic="chevron"></i></div>
  </section>`;
}
function animalPage(k, i) {
  const f = FRIENDS[k], e = (S.couple.dex || {})[k] || {}, met = !!e.met;
  const L = friendLines(k), got = e.l || {}, sp = SPECIAL_LINES[k] || [], cu = customLines(k);
  const no = `No.${String(i + 1).padStart(2, '0')}`;
  const heard = L.filter((_, j) => got[j]).length;
  if (!met) return `<section class="db-page db-ani">
    <div class="da-top"><span class="da-no">${no}</span><span class="chip">？？？</span></div>
    <div class="da-stage locked">${friendArt(k)}</div>
    <h2 class="da-name muted">？？？</h2>
    <p class="small muted center">還沒遇過。牠偶爾會路過首頁，或是哪天來當值日生。</p>
    <div class="da-locked-hint">牠有好多話想跟你們說</div>
  </section>`;
  return `<section class="db-page db-ani">
    <div class="da-top"><span class="da-no">${no}</span><span class="chip">${f.kind}</span></div>
    <div class="da-stage">${friendArt(k)}</div>
    <h2 class="da-name">${esc(f.name)}</h2>
    <div class="da-met">${new Date(e.met).toLocaleDateString('zh-TW')} 第一次遇到${e.by ? `・${esc(nick(e.by))}` : ''}</div>
    <p class="da-intro">${esc(f.intro.replace('男朋友', nick((S.couple.members || []).find((u) => prof(u).role === 'him')) || '男朋友'))}</p>
    <h3 class="da-h">說過的話 <span>${heard} 句</span></h3>
    ${L.map((t, j) => `<div class="dex-line ${got[j] ? '' : 'locked'}">${got[j] ? esc(t) : '？？？'}</div>`).join('')}
    ${sp.length ? `<h3 class="da-h">限定台詞 <span>${sp.filter((_, j) => got['s' + j]).length} 句</span></h3>
      ${sp.map((x, j) => `<div class="dex-line sp ${got['s' + j] ? '' : 'locked'}"><span class="sp-tag">${FEST_NAMES[x.w]}</span>${got['s' + j] ? esc(x.t) : '？？？'}</div>`).join('')}` : ''}
    ${typeof pestDexHTML === 'function' ? pestDexHTML(k, got) : ''}
    <h3 class="da-h">我們幫牠加的 <span>${cu.length}</span></h3>
    ${cu.map((c) => `<div class="dex-line cu">${esc(c.t)}<span class="cu-by">— ${esc(nick(c.by))}</span>${c.by === me() ? `<button class="cu-del" data-del="${c.id}" aria-label="刪除">✕</button>` : ''}</div>`).join('') || '<p class="small muted" style="margin:4px 0 0">你們最懂牠，幫牠多說幾句吧，路過時牠就會說出來。</p>'}
    <button class="btn ghost sm da-add" data-add="${k}"><i data-ic="plus"></i> 幫牠加一句</button>
  </section>`;
}
function scenesPage() {
  const seen = sceneSeen(), d = S.couple.dex || {};
  const mini = (k, on) => `<span class="ds-mini ${on ? '' : 'locked'}">${friendArt(k)}</span>`;
  return `<section class="db-page db-scenes">
    <div class="da-top"><span class="da-no">小劇場</span><span class="chip">${Object.keys(seen).length} 齣</span></div>
    <p class="small muted" style="margin:2px 0 10px">有時候會兩隻一起路過，點牠們就會演一段。</p>
    ${SCENES.map((s) => {
      const on = !!seen[s.id];
      const who = (w) => w === 'n' ? '' : `<b>${esc(FRIENDS[s[w]].name)}</b>`;
      return `<div class="ds-card ${on ? '' : 'locked'}">
        <div class="ds-cast">${mini(s.a, on || (d[s.a] || {}).met)}${mini(s.b, on || (d[s.b] || {}).met)}</div>
        <div class="grow"><div class="ds-title">${on ? `〈${esc(s.title)}〉` : '〈？？？〉'}</div>
        ${on ? s.lines.map(([w, t]) => `<div class="ds-line ${w === 'n' ? 'n' : ''}">${who(w)}${esc(t)}</div>`).join('')
          : `<div class="small muted">${(d[s.a] || {}).met && (d[s.b] || {}).met ? `等 ${esc(FRIENDS[s.a].name)} 和 ${esc(FRIENDS[s.b].name)} 一起路過` : '兩位演員都遇過之後才會有線索'}</div>`}</div>
      </div>`;
    }).join('')}
  </section>`;
}
function bookHTML() {
  const pages = [coverHTML(), ...DEX_ORDER.map((k, i) => animalPage(k, i)), scenesPage()];
  return `<button class="m-close db-close" data-act="close">✕</button>
    <div class="db-track">${pages.join('')}</div>
    <div class="db-nav"><button class="db-prev" aria-label="上一頁"><i data-ic="chevron"></i></button>
      <div class="db-dots">${pages.map((_, i) => `<i data-p="${i}"></i>`).join('')}</div>
      <button class="db-next" aria-label="下一頁"><i data-ic="chevron"></i></button></div>`;
}
function wireBook(m, page = 0) {
  const tr = $('.db-track', m), n = DEX_ORDER.length + 2;
  const go = (p, smooth = true) => tr.scrollTo({ left: Math.max(0, Math.min(n - 1, p)) * tr.clientWidth, behavior: smooth ? 'smooth' : 'auto' });
  const cur = () => Math.round(tr.scrollLeft / tr.clientWidth);
  const dots = () => { const c = cur(); $$('.db-dots i', m).forEach((d, i) => d.classList.toggle('on', i === c)); $('.db-prev', m).disabled = c === 0; $('.db-next', m).disabled = c === n - 1; };
  tr.addEventListener('scroll', () => { clearTimeout(tr._t); tr._t = setTimeout(dots, 60); }, { passive: true });
  $('.db-prev', m).onclick = () => { sfx('flip'); go(cur() - 1); };
  $('.db-next', m).onclick = () => { sfx('flip'); go(cur() + 1); };
  $$('.db-dots i', m).forEach((d) => d.onclick = () => go(+d.dataset.p));
  $$('[data-go]', m).forEach((b) => b.onclick = () => { sfx('flip'); go(+b.dataset.go); });
  $$('.dc-stamp', m).forEach((b) => b.onclick = () => toast(b.dataset.desc));
  $$('[data-add]', m).forEach((b) => b.onclick = async () => {
    const k = b.dataset.add;
    const t = await promptBox(`幫${FRIENDS[k].name}加一句`, { placeholder: `例如：${FRIENDS[k].name}：……` });
    if (!t) return;
    await S.store.updateCouple(S.cid, { [`dex.${k}.cu.${uid8()}`]: { t: t.slice(0, 60), by: me(), at: now() } });
    toast('記下來了，下次路過牠可能會說'); refreshBook(m);
  });
  $$('[data-del]', m).forEach((b) => b.onclick = async () => {
    const k = DEX_ORDER[cur() - 1];
    if (!k) return;
    await S.store.updateCouple(S.cid, { [`dex.${k}.cu.${b.dataset.del}`]: null });
    refreshBook(m);
  });
  requestAnimationFrame(() => { go(page, false); dots(); });
}
function refreshBook(m) {
  const tr = $('.db-track', m), p = Math.round(tr.scrollLeft / tr.clientWidth), y = $$('.db-page', m)[p]?.scrollTop || 0;
  setTimeout(() => {
    $('.modal', m).innerHTML = bookHTML(); wireBook(m, p);
    requestAnimationFrame(() => { const pg = $$('.db-page', m)[p]; if (pg) pg.scrollTop = y; });
  }, 120);
}
// 每台手機各自清一次「記得的」成就、紙條、提醒（加入後 7 天內第一次打開時）
function localFreshStart(ts, force) {
  const fk = `park-fresh-${S.cid}`;
  if (!force && (localStorage.getItem(fk) === String(ts) || now() - ts > 7 * 86400000)) return;
  Object.keys(localStorage).filter((k) => /^park-(ach|miss-seen|redeem-pop|duty|stroll-pat|carry|dexreset|dexnew|petxp|fundpet|mreview|poke|hot)/.test(k)).forEach((k) => localStorage.removeItem(k));
  localStorage.setItem(fk, String(ts));
}
const uid8 = () => Math.random().toString(36).slice(2, 10);
ACT.dex = () => { const m = openModal(bookHTML(), { center: true, cls: 'dex-book' }); wireBook(m, 0); };

// 一次性：圖鑑歸零（值日生可以一直刷台詞的時候收集得太快了）
let dexResetBusy = false;
async function dexResetOnce() {
  if (!S.couple || !S.cid) return;
  // 歸零後，這台手機記得的圖鑑成就也清掉，重新解鎖時才會再跳通知
  const fk = `park-dexreset-ach-${S.cid}-${me()}`, ak = 'park-ach-' + S.cid + '-' + me();
  if (S.couple.dexReset >= 1 && !localStorage.getItem(fk)) {
    try { const seen = JSON.parse(localStorage.getItem(ak) || 'null'); if (seen) localStorage.setItem(ak, JSON.stringify(seen.filter((x) => !String(x).startsWith('dex_')))); } catch {}
    localStorage.setItem(fk, '1');
  }
  // 對方加入的那一刻：小小黑經驗、圖鑑、小劇場全部歸零，從兩個人一起開始
  if ((S.couple.members || []).length >= 2 && !S.couple.togetherStart && !dexResetBusy && COLS.every((c) => S.d[c])) {
    dexResetBusy = true;
    try { await joinFreshStart(); } finally { dexResetBusy = false; }
    return;
  }
  // 加入那一刻是在對方手機上清的：這台手機也要把自己記得的成就、提醒清掉（只做一次）
  if (S.couple.togetherStart && S.couple.dexReset >= 2 && !dexResetBusy) localFreshStart(S.couple.togetherStart);
  if (S.couple.dexReset >= 1 || dexResetBusy) return;
  dexResetBusy = true;
  await S.store.coupleTx(S.cid, (x) => (x.dexReset >= 1 ? null : { dex: {}, scenes: {}, dexReset: 1 }));
  dexResetBusy = false;
}

// 對方加入的那一刻：先備份，再把測試期間的東西全部清掉，兩個人從零開始
// 保留：暱稱、頭像、生日、紀念日、卡池、旅行基金的名稱和目標、對方的生日卡組
async function joinFreshStart() {
  const ts = now();
  const ok = await S.store.coupleTx(S.cid, (x) => (x.togetherStart ? null : { togetherStart: ts }));
  if (!ok) return;
  try { await saveCloudBackup('join'); } catch (e) { console.warn('加入前備份失敗', e); }
  const c = S.couple, bSeries = D.BIRTHDAY_SERIES;
  for (const name of COLS) {
    if (name === 'pool') continue;
    for (const d of list(name)) {
      if (name === 'cards' && d.series === bSeries && d.owner !== c.creator) continue;   // 好寶的生日卡組
      await col(name).remove(d.id);
    }
  }
  await S.store.updateCouple(S.cid, {
    dex: {}, scenes: {}, dexReset: 2, pet: { name: (c.pet && c.pet.name) || '小小黑' }, drops: {}, tickets: {}, cans: {}, canDay: {},
    moods: {}, moodHist: {}, spins: {}, annivLetters: {}, opened: {}, taskOverride: {}, taskSwapReq: null, battleSwaps: {},
    'fund.rewarded': false, fundsDone: 0, sched: {}, cardMemo: {},
  });
  // 測試期間補的點數可能剛好晚一步寫進來，再掃一次
  for (const d of list('points')) await col('points').remove(d.id);
  // 新手禮：兩個人各 40 點（可以扭兩次）
  for (const u of c.members || []) await addPoints(u, 40, '新手禮：歡迎來到遊樂園');
  // 這台手機記得的成就、紙條、提醒也清掉
  localFreshStart(ts, true);
  toast('歡迎加入！遊樂園從今天開始重新記錄，兩個人各送 40 點新手禮');
  setTimeout(() => { if (typeof holidayDrops === 'function') holidayDrops(); }, 2500);
}

// 鯊魚被晽晽貓貓吃掉，再長出來
async function sharkEaten(el) {
  const r = el.getBoundingClientRect();
  const cat = walker('orange', 'eater');
  cat.style.animation = 'none'; cat.style.left = '-100px'; cat.style.bottom = el.style.bottom || getComputedStyle(el).bottom;
  document.body.appendChild(cat);
  await sleep(30);
  cat.style.transition = 'left .55s ease-in'; cat.style.left = (r.left + r.width / 2 - 40) + 'px';
  await sleep(560);
  sfx('pop'); vibrate(30);
  el.classList.add('eaten');
  const b1 = bubble('晽晽貓貓一口把鯊魚吃掉了', r.left + r.width / 2, r.top, 'solo narr');
  await sleep(1300);
  b1.remove();
  cat.style.transition = 'left .8s ease-in'; cat.style.left = (innerWidth + 120) + 'px';
  setTimeout(() => cat.remove(), 900);
  await sleep(700);
  // 長出來：先慢慢長一半「長…長…長…」，再點一下才一口氣長完；沒點的話自己慢慢長完
  el.classList.remove('eaten', 'off'); el.innerHTML = withHat('shark', sharkArt());
  const L = SPECIAL_LINES.shark, ix = (t) => L.findIndex((x) => x.t === t);
  const say = (t, ms) => { const rr = el.getBoundingClientRect(); const b = bubble(t, rr.left + rr.width / 2, rr.top, 'solo'); dexNote('shark', 's' + ix(t)); if (ms) setTimeout(() => b.remove(), ms); return b; };
  const grow = async (steps) => { for (const sc of steps) { el.style.setProperty('--grow', sc); el.classList.add('regrow'); sfx('pop'); await sleep(520); } };
  await grow([.2, .35, .5]);
  const slow = say('鯊魚：長…長…長…');
  const tapped = await new Promise((res) => { const t = setTimeout(() => res(false), 12000); el.onclick = () => { clearTimeout(t); res(true); }; });
  el.onclick = null; slow.remove();
  if (tapped) { const b = say('鯊魚：長長長長長長長 呼～長完了'); await grow([1]); await sleep(1400); b.remove(); }
  else { const b = say('鯊魚：長長長 長長長 長長長長 長完了～'); await grow([.7, .85, 1]); await sleep(900); b.remove(); }
  if (Math.random() < .5) { const b = say('鯊魚：人類～我被吃掉了喔？'); await sleep(2200); b.remove(); }
  el.classList.remove('regrow'); el.classList.add('wake');
  setTimeout(() => el.remove(), 2200);
}
window.__eat = () => { catStroll('shark'); setTimeout(() => { const e = document.querySelector('.fr-shark'); if (e) { e.click(); setTimeout(() => sharkEaten(e), 700); } }, 2500); };
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
// ============================================================
//  罐罐（不扣點）：每天配給一個＋做事偶爾掉＋小動物送來
//  扭蛋券新拿法：每週任務全完成、連續 7 天每日一問、節日當天
// ============================================================
function canState(u = me()) {
  const c = S.couple || {};
  return { daily: ((c.canDay || {})[u] || '') !== dkey(), stock: (c.cans || {})[u] || 0 };
}
async function giveCan(u, why, quiet = false) {
  if (!S.couple || (S.couple.members || []).length < (trialOpen() ? 1 : 2)) return;
  await S.store.coupleTx(S.cid, (c) => ({ [`cans.${u}`]: ((c.cans || {})[u] || 0) + 1 }));
  if (!quiet && u === me()) setTimeout(() => toast(`${why}，掉了一個罐罐`), 900);
}
// 換罐罐按錯了：把卡拿回來、罐罐收回一個
async function canUndo(card) {
  const { id, ...data } = card;
  const nid = await col('cards').add(data);
  await S.store.coupleTx(S.cid, (c) => ({ [`cans.${me()}`]: Math.max(0, ((c.cans || {})[me()] || 0) - 1) }));
  return nid;
}
// 回答每日一問、做每週任務、被蓋章時偶爾掉一個
const maybeCan = (u, why, p) => { if (Math.random() < p) giveCan(u, why, u !== me()); };
// 路過的小動物偶爾叼一個罐罐來（晽晽貓貓會自己吃掉）
function maybeAnimalCan(k) {
  if (Math.random() > .1 || !S.couple || (S.couple.members || []).length < 2) return;
  const n = FRIENDS[k]?.name || '小動物';
  if (k === 'orange') return setTimeout(() => toast('晽晽貓貓叼著一個罐罐路過……然後自己吃掉了'), 1400);
  giveCan(me(), '', true);
  setTimeout(() => toast(`${n}叼了一個罐罐送給小小黑`), 1400);
}
async function feedCan() {
  const st = canState();
  if (!st.daily && st.stock < 1) return false;
  await S.store.coupleTx(S.cid, (c) => {
    const daily = ((c.canDay || {})[me()] || '') !== dkey(), stock = (c.cans || {})[me()] || 0;
    if (daily) return { [`canDay.${me()}`]: dkey(), 'pet.feeds': ((c.pet || {}).feeds || 0) + 1 };
    if (stock > 0) return { [`cans.${me()}`]: stock - 1, 'pet.feeds': ((c.pet || {}).feeds || 0) + 1 };
    return null;
  });
  return true;
}

// ---------- 扭蛋券 ----------
async function ticketOnce(key, users, text) {
  const k = `tk-${key}`;
  const ok = await S.store.coupleTx(S.cid, (x) => (x.drops && x.drops[k] ? null : { [`drops.${k}`]: true }));
  if (!ok) return;
  for (const u of users) { await addTicket(u, 1); await col('events').add({ to: u, by: 'sys', type: 'card', text, detail: '扭蛋券 +1', at: now(), read: false }); }
  if (users.includes(me())) setTimeout(() => toast(`${text}：扭蛋券 +1`), 600);
}
// 每週任務 3 項都做完
async function weekTicketCheck() {
  const wk = weekKey();
  const n = list('taskDone').filter((d) => d.uid === me() && d.week === wk).length;
  if (n >= weekTasks().length) await ticketOnce(`week-${wk}-${me()}`, [me()], '這週的任務全部完成');
}
// 連續 7 天回答每日一問（7、14、21…天各一張）
async function dailyStreakTicket() {
  let n = 0; const d = new Date();
  for (; n < 400; n++) {
    const doc = list('daily').find((x) => x.id === dkey(d));
    if (!doc || !(doc.answers || {})[me()]) break;
    d.setDate(d.getDate() - 1);
  }
  if (n > 0 && n % 7 === 0) await ticketOnce(`daily7-${me()}-${dkey()}`, [me()], `連續 ${n} 天回答每日一問`);
}
// ============================================================
//  小紙條：信紙、藏起來（從卡片底下露出一角／小小黑底下／小動物叼著走過）、
//  拆信動畫、紙條盒
// ============================================================
const NOTE_PAPERS = [
  { id: 'lined', name: '橫線' }, { id: 'grid', name: '格子' }, { id: 'sticky', name: '便條紙' }, { id: 'cat', name: '小小黑' },
];
// 墨水顏色：沒選就依信紙配一個
const NOTE_INKS = [
  { id: '', name: '自動' }, { id: '#4a3520', name: '咖啡' }, { id: '#2e2a33', name: '墨黑' }, { id: '#8c2340', name: '酒紅' },
  { id: '#24406b', name: '深藍' }, { id: '#2f5b47', name: '森綠' }, { id: '#5b3d86', name: '紫藤' }, { id: '#b0552a', name: '橘棕' },
];
const PAPER_INK = { lined: '#4a3520', grid: '#24406b', sticky: '#2e2a33', cat: '#8c2340' };
const noteInk = (n) => (n && n.ink) || PAPER_INK[(n && n.paper) || 'lined'] || '#4a3520';
const NOTE_CARRIERS = ['haohao', 'doggy', 'abian', 'calico', 'white', 'tuxedo', 'black'];
const paperCls = (n) => 'paper-' + ((n && n.paper) || 'lined');
const catCorner = '<svg class="paper-catmark" viewBox="0 0 40 30"><path d="M8 28 Q6 16 12 12 L11 3 L17 9 Q20 8 23 9 L29 3 L28 12 Q34 16 32 28 Z" fill="#2b2633"/><ellipse cx="16" cy="17" rx="2" ry="2.4" fill="#ffd970"/><ellipse cx="24" cy="17" rx="2" ry="2.4" fill="#ffd970"/><path d="M19 21 L21 21 L20 22 Z" fill="#ff9fb4"/></svg>';
const paperDeco = (n) => (((n && n.paper) || 'lined') === 'cat' ? catCorner : ((n && n.paper) === 'sticky' ? '<span class="paper-tape"></span>' : ''));
// 摺起來的紙條（藏起來時露出的那一角）
const foldedNoteSVG = (paper = 'lined') => {
  const fill = { lined: '#fffaf0', grid: '#f6f8fb', sticky: '#fff1a6', cat: '#fbf3ea' }[paper] || '#fffaf0';
  return `<svg viewBox="0 0 44 32" class="note-fold"><path d="M2 4 L36 2 L42 8 L40 30 L4 29 Z" fill="${fill}" stroke="#d8c3a4" stroke-width=".8"/><path d="M36 2 L36 9 L42 8 Z" fill="#e9dcc6" stroke="#d8c3a4" stroke-width=".6"/><path d="M8 13 H32 M8 18 H30 M8 23 H24" stroke="#d9c9ae" stroke-width=".9"/><circle cx="33" cy="23" r="4.2" fill="#c8283c"/><path d="M33 21.2 C32.4 20.2 30.8 20.4 30.8 21.8 C30.8 23 32.2 23.9 33 24.6 C33.8 23.9 35.2 23 35.2 21.8 C35.2 20.4 33.6 20.2 33 21.2 Z" fill="#f6c3cc"/></svg>`;
};

// ---------- 寫紙條 ----------
ACT.writeNote = () => {
  if (!partner()) return toast('對方加入後才能藏紙條喔');
  let paper = 'lined', ink = '';
  const m = openModal(`${mhead('寫一張小紙條')}
    <div class="np-pick">${NOTE_PAPERS.map((x) => `<button data-p="${x.id}" class="${x.id === paper ? 'on' : ''}"><span class="np-sw paper-${x.id}"></span>${x.name}</button>`).join('')}</div>
    <div class="np-ink">${NOTE_INKS.map((x) => `<button data-i="${x.id}" class="${x.id === ink ? 'on' : ''}" title="${x.name}"><span style="background:${x.id || 'conic-gradient(#4a3520,#24406b,#8c2340,#2f5b47,#4a3520)'}"></span><small>${x.name}</small></button>`).join('')}</div>
    <div class="letter note-paper ${paperCls({ paper })}" id="nw-paper" style="--ink:${noteInk({ paper, ink })}"><textarea id="nw-t" maxlength="300" placeholder="想對 ${esc(nick(partner()))} 說的話…"></textarea>${paperDeco({ paper })}</div>
    <button class="btn block mt" id="nw-ok"><i data-ic="letter"></i> 折起來，藏好</button>`, { center: true, cls: 'note-write' });
  // 紙條跟著字變大
  const ta = $('#nw-t', m), grow = () => { ta.style.height = 'auto'; ta.style.height = Math.max(58, ta.scrollHeight) + 'px'; };
  ta.addEventListener('input', grow); grow();
  $$('.np-pick button', m).forEach((b) => b.onclick = () => {
    paper = b.dataset.p;
    $$('.np-pick button', m).forEach((x) => x.classList.toggle('on', x === b));
    const pp = $('#nw-paper', m); pp.className = `letter note-paper ${paperCls({ paper })}`;
    pp.querySelectorAll('.paper-catmark,.paper-tape').forEach((x) => x.remove()); pp.insertAdjacentHTML('beforeend', paperDeco({ paper }));
    pp.style.setProperty('--ink', noteInk({ paper, ink }));
  });
  $$('.np-ink button', m).forEach((b) => b.onclick = () => {
    ink = b.dataset.i;
    $$('.np-ink button', m).forEach((x) => x.classList.toggle('on', x === b));
    $('#nw-paper', m).style.setProperty('--ink', noteInk({ paper, ink }));
  });
  $('#nw-ok', m).onclick = async () => {
    const text = $('#nw-t', m).value.trim();
    if (!text) return toast('先寫點什麼');
    $('#nw-ok', m).disabled = true;
    // 藏的地方：卡片底下露出一角／小小黑底下／小動物叼著走過
    const r = Math.random();
    const spot = r < .5 ? { kind: 'peek', tab: pick(TABS).id, idx: Math.floor(Math.random() * 20) }
      : r < .75 ? { kind: 'pet', tab: 'home' } : { kind: 'carry', tab: 'home', who: pick(NOTE_CARRIERS) };
    await col('notes').add({ by: me(), to: partner(), text, paper, ...(ink ? { ink } : {}), found: false, spot, at: now() });
    // 折起來＋封蠟
    const pp = $('#nw-paper', m); pp.classList.add('folding'); sfx('pop');
    setTimeout(() => { pp.innerHTML = `<div class="nw-sealed">${foldedNoteSVG(paper)}</div>`; pp.classList.add('sealed'); sfx('stamp'); }, 650);
    setTimeout(() => { closeModal(m); toast(`藏好了，看 ${nick(partner())} 什麼時候發現`); }, 1600);
  };
};

// ---------- 藏起來的樣子 ----------
function placeHiddenNotes(main) {
  const mine = list('notes').filter((n) => n.to === me() && !n.found && n.spot && n.spot.tab === S.tab);
  for (const n of mine) {
    const sp = n.spot;
    if (sp.kind === 'carry') continue; // 交給路過的小動物
    let host = null;
    if (sp.kind === 'pet') host = main.querySelector('.pet-card');
    if (sp.kind === 'peek' || !host) { const cards = [...main.querySelectorAll('.card')].filter((c) => !c.parentElement.closest('.card') && !c.closest('.modal-back')); if (cards.length) host = cards[(sp.idx || 0) % cards.length]; }
    if (!host || sp.x != null && !sp.kind) {
      const b = document.createElement('button');
      b.className = 'hidden-note'; b.innerHTML = ic('letter'); b.dataset.act = 'findNote'; b.dataset.id = n.id;
      b.style.left = (sp.x || 50) + '%'; b.style.top = (sp.y || 50) + '%';
      main.appendChild(b); continue;
    }
    // 從卡片底下露出一角（掛在卡片本身，排版變動也跟著走）
    host.classList.add('has-peek');
    const b = document.createElement('button');
    b.className = 'note-peek side-' + ((n.id.charCodeAt(0) % 2) ? 'r' : 'l'); b.innerHTML = foldedNoteSVG(n.paper); b.dataset.act = 'findNote'; b.dataset.id = n.id;
    host.appendChild(b);
  }
}
// 小動物叼著紙條走過首頁（找到之前，每兩分鐘最多出現一次）
function carryStroll() {
  const n = list('notes').find((x) => x.to === me() && !x.found && x.spot?.kind === 'carry');
  if (!n || now() - +(localStorage.getItem('park-carry-at') || 0) < 120000) return false;
  localStorage.setItem('park-carry-at', now());
  const el = walker(n.spot.who || 'haohao');
  el.classList.add('carrying');
  el.insertAdjacentHTML('beforeend', `<span class="carry-note">${foldedNoteSVG(n.paper)}</span>`);
  const timer = setTimeout(() => el.remove(), 9500);
  el.onclick = () => { clearTimeout(timer); el.classList.add('caught'); setTimeout(() => el.remove(), 1400); ACT.findNote({ dataset: { id: n.id } }); };
  document.body.appendChild(el);
  return true;
}

// ---------- 拆信 ----------
ACT.findNote = async (el) => {
  const n = list('notes').find((x) => x.id === el.dataset.id);
  if (!n) return;
  document.querySelectorAll(`.note-peek[data-id="${n.id}"]`).forEach((x) => x.remove());
  vibrate(40);
  const m = openModal(`<div class="nt-stage" id="nt-st">
      <div class="nt-title">你找到一張小紙條！</div>
      <div class="nt-env"><div class="nt-back"></div><div class="nt-letter letter note-paper ${paperCls(n)}" style="--ink:${noteInk(n)}"><div class="nt-text"></div>${paperDeco(n)}</div><div class="nt-front"></div><div class="nt-flap"></div><div class="nt-seal"><svg viewBox="-12 -12 24 24"><circle r="11" fill="#c8283c"/><circle r="8.5" fill="none" stroke="#9e1d2e" stroke-width="1"/><path d="M0 -1.6 C-1 -3.6 -4.4 -3.4 -4.4 -.6 C-4.4 1.8 -1.6 3.6 0 5 C1.6 3.6 4.4 1.8 4.4 -.6 C4.4 -3.4 1 -3.6 0 -1.6 Z" fill="#f6c3cc"/></svg></div></div>
      <div class="nt-hint small muted">點一下拆開</div>
    </div>`, { center: true, cls: 'note-open' });
  const st = $('#nt-st', m);
  let opened = false;
  const open = async () => {
    if (opened) return; opened = true;
    st.classList.add('s1'); sfx('pop'); vibrate(20);              // 封蠟彈開
    await sleep(380); st.classList.add('s2');                      // 掀開信封蓋
    await sleep(450); st.classList.add('s3'); sfx('flip');         // 信紙抽出來展開
    await sleep(700); st.classList.add('s4');
    confetti(36, ['#ff6f91', '#ffc2d1', '#fff']);
    // 字一個一個浮出來：先是漸層色，再慢慢定成墨水的顏色
    const box = $('.nt-text', m), chars = Array.from(n.text), step = Math.max(6, Math.min(16, 1800 / chars.length));
    for (let i = 0; i < chars.length; i++) {
      const sp = document.createElement('span'); sp.className = chars[i] === '\n' ? '' : 'ink-ch'; sp.textContent = chars[i];
      sp.style.setProperty('--d', `${(i % 12) * 30}ms`); box.appendChild(sp);
      if (i % 2 === 1) await sleep(step * 2);
    }
    st.classList.add('s5');
  };
  st.onclick = open;
  setTimeout(open, 1400);
  if (!n.found) {
    await col('notes').update(n.id, { found: true, foundAt: now() });
    await notify(n.by, 'note', '你藏的小紙條被找到了 💌');
  }
};

// ---------- 紙條盒 ----------
// 搜尋：關鍵字或日期（2026/11/20、11/20、11月、2026-11、2026 都可以）
function noteKey(n) {
  const ds = [n.at, n.foundAt].filter(Boolean).map((t) => { const d = new Date(t), y = d.getFullYear(), m = d.getMonth() + 1, dd = d.getDate();
    return `${y}/${m}/${dd} ${y}/${pad(m)}/${pad(dd)} ${y}-${pad(m)}-${pad(dd)} ${y}.${pad(m)}.${pad(dd)} ${m}/${dd} ${pad(m)}/${pad(dd)} ${y}年${m}月${dd}日 ${m}月${dd}日 ${y}-${pad(m)} ${y}/${m}`; }).join(' ');
  return (n.text + ' ' + ds).toLowerCase();
}
function noteMatch(n, q) { return q.trim().toLowerCase().split(/\s+/).filter(Boolean).every((w) => noteKey(n).includes(w)); }
ACT.noteBox = (el, _e, tab = 'got') => {
  const got = list('notes').filter((n) => n.to === me() && n.found).sort((a, b) => (b.foundAt || b.at) - (a.foundAt || a.at));
  const hidden = list('notes').filter((n) => n.to === me() && !n.found).length;
  const mine = list('notes').filter((n) => n.by === me()).sort((a, b) => b.at - a.at);
  const tabName = { home: '首頁', wallet: '票夾', play: '遊樂區', travel: '約會', memory: '回憶' };
  const where = (n) => (n.spot?.kind === 'carry' ? `交給${FRIENDS[n.spot.who]?.name || '小動物'}叼著` : n.spot?.kind === 'pet' ? '藏在小小黑底下' : `藏在「${tabName[n.spot?.tab] || '某個'}」分頁`);
  const m = openModal(`${mhead('紙條盒')}
    <div class="nb-search"><i data-ic="search"></i><input id="nb-q" type="text" enterkeyhint="search" placeholder="搜尋紙條裡的字" autocomplete="off"><button id="nb-x" class="hidden" aria-label="清除">✕</button><button id="nb-cal" class="nb-calbtn" aria-label="用日曆找"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10 H20.5 M8 3 V7 M16 3 V7"/><circle cx="12" cy="15" r="1.3" fill="currentColor" stroke="none"/></svg></button></div>
    <div id="nb-calbox" class="nb-calbox hidden"></div>
    <div id="nb-day" class="nb-day hidden"></div>
    <div class="seg" id="nb-seg"><button data-t="got" class="${tab === 'got' ? 'on' : ''}">收到的 ${got.length}</button><button data-t="mine" class="${tab === 'mine' ? 'on' : ''}">我藏的 ${mine.length}</button></div>
    ${tab === 'got' ? `
      ${hidden ? `<p class="small center nb-tease">${esc(nick(partner()))} 還藏了 ${hidden} 張紙條給你，還沒找到</p>` : ''}
      <div class="nb-grid">${got.map((n, i) => `<button class="nb-note letter note-paper ${paperCls(n)}" data-k="${esc(noteKey(n))}" data-id="${n.id}" style="--r:${((i % 5) - 2) * 1.4}deg;--ink:${noteInk(n)}"><span class="nb-txt">${esc(n.text)}</span><span class="nb-meta">${new Date(n.foundAt || n.at).toLocaleDateString('zh-TW')}</span>${paperDeco(n)}</button>`).join('') || '<p class="small muted center" style="grid-column:1/-1">還沒有找到紙條，四處看看吧</p>'}</div>`
    : `<div class="nb-list">${mine.map((n) => `<div class="nb-row" data-k="${esc(noteKey(n))}"><span class="nb-fold">${foldedNoteSVG(n.paper)}</span><span class="grow"><span class="nb-rt">${esc(n.text)}</span><small class="muted">${new Date(n.at).toLocaleDateString('zh-TW')}・${where(n)}</small></span><span class="chip ${n.found ? 'ok' : ''}">${n.found ? `已被找到 ${new Date(n.foundAt).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' })}` : '還藏著'}</span></div>`).join('') || '<p class="small muted center">還沒藏過紙條</p>'}</div>`}`,
  { center: true, cls: 'note-box' });
  $$('#nb-seg button', m).forEach((b) => b.onclick = () => { const q = $('#nb-q', m).value; closeModal(m); ACT.noteBox(null, null, b.dataset.t); const nm = [...document.querySelectorAll('.note-box')].pop(); if (nm && q) { const i = nm.querySelector('#nb-q'); i.value = q; i.dispatchEvent(new Event('input')); } });
  // 日曆：有紙條的日子會有小點，點一下只看那天的
  const pool = tab === 'got' ? got : mine;
  const dayOf = (t) => dkey(new Date(t));
  const days = new Set(pool.flatMap((n) => [n.at, n.foundAt].filter(Boolean).map(dayOf)));
  let pickDay = '', cur = new Date(); cur.setDate(1);
  const drawCal = () => {
    const y = cur.getFullYear(), mo = cur.getMonth(), first = new Date(y, mo, 1).getDay(), dim = new Date(y, mo + 1, 0).getDate();
    let cells = '';
    for (let i = 0; i < first; i++) cells += '<span></span>';
    for (let d = 1; d <= dim; d++) { const k = `${y}-${pad(mo + 1)}-${pad(d)}`; cells += `<button data-d="${k}" class="${days.has(k) ? 'has' : ''} ${k === pickDay ? 'on' : ''} ${k === dkey() ? 'today' : ''}">${d}</button>`; }
    $('#nb-calbox', m).innerHTML = `<div class="nc-head"><button data-mv="-1">‹</button><b>${y} 年 ${mo + 1} 月</b><button data-mv="1">›</button></div>
      <div class="nc-week">${'日一二三四五六'.split('').map((w) => `<span>${w}</span>`).join('')}</div><div class="nc-grid">${cells}</div>`;
    $$('#nb-calbox [data-mv]', m).forEach((b) => b.onclick = () => { cur.setMonth(cur.getMonth() + +b.dataset.mv); drawCal(); });
    $$('#nb-calbox [data-d]', m).forEach((b) => b.onclick = () => { pickDay = pickDay === b.dataset.d ? '' : b.dataset.d; $('#nb-calbox', m).classList.add('hidden'); filter(); });
  };
  $('#nb-cal', m).onclick = () => { const box = $('#nb-calbox', m); box.classList.toggle('hidden'); if (!box.classList.contains('hidden')) drawCal(); };
  const filter = () => {
    const q = $('#nb-q', m).value.trim().toLowerCase(), ws = q.split(/\s+/).filter(Boolean).concat(pickDay ? [pickDay] : []);
    const dd = $('#nb-day', m);
    dd.classList.toggle('hidden', !pickDay); $('#nb-cal', m).classList.toggle('on', !!pickDay);
    if (pickDay) { const [yy, mm, d2] = pickDay.split('-').map(Number); dd.innerHTML = `${yy} 年 ${mm} 月 ${d2} 日的紙條 <button aria-label="取消日期">✕</button>`; dd.querySelector('button').onclick = () => { pickDay = ''; filter(); }; }
    let shown = 0;
    $$('[data-k]', m).forEach((x) => { const ok = ws.every((w) => x.dataset.k.includes(w)); x.style.display = ok ? '' : 'none'; if (ok) shown++; });
    $('#nb-x', m).classList.toggle('hidden', !q);
    let em = $('#nb-empty', m);
    if ((q || pickDay) && !shown) { if (!em) { em = document.createElement('p'); em.id = 'nb-empty'; em.className = 'small muted center'; $('.nb-grid, .nb-list', m).after(em); } em.textContent = q ? `找不到「${q}」的紙條` : '那天沒有紙條'; }
    else if (em) em.remove();
  };
  $('#nb-q', m).addEventListener('input', filter);
  $('#nb-x', m).onclick = () => { $('#nb-q', m).value = ''; filter(); };
  $$('.nb-note', m).forEach((b) => b.onclick = () => {
    const n = list('notes').find((x) => x.id === b.dataset.id);
    openModal(`<div class="letter note-paper ${paperCls(n)} nb-read" style="--ink:${noteInk(n)}">${esc(n.text)}${paperDeco(n)}</div>`, { center: true });
  });
};
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
  return got;
}
// 打開 App 時：記下今天的季節、萬聖節；新解鎖的跳通知
async function lookTick() {
  if (!S.couple || (S.couple.members || []).length < 2 || !S.d.points || !S.d.watch) return;
  const pet = S.couple.pet || {}, looks = pet.looks || {}, up = {};
  const sn = seasonNow(); if (!looks[sn]) up[`pet.looks.${sn}`] = true;
  const md = dkey().slice(5); if (md === '10-31' && !looks.ghost) up['pet.looks.ghost'] = true;
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
  return '';
}
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
// ============================================================
//  背景音樂（程式合成，不需要音檔）
//  白天：柔和鋼琴　晚上：Lo-fi　——跟著日夜模式自動換
//  每首都是 A–B–A'–C 四段、32 小節（大約兩分鐘）才重複，每一輪還會有一點點不一樣
// ============================================================
const N_ = null;
const BGM_SONGS = {
  piano: {
    tempo: 70,
    sections: [
      { ch: [[48, 52, 55, 59], [45, 48, 52, 55], [41, 45, 48, 52], [43, 47, 50, 53], [48, 52, 55, 59], [45, 48, 52, 55], [41, 45, 48, 52], [43, 47, 50, 55]],
        mel: [[76, N_, 79, N_, 76, 74, 72, N_], [72, N_, 76, N_, 74, 72, 69, N_], [69, N_, 72, N_, 77, N_, 76, 74], [74, N_, N_, 71, 74, N_, 79, N_],
          [76, N_, 79, N_, 84, N_, 83, 81], [79, N_, 76, N_, 72, N_, 74, 76], [77, N_, 76, N_, 74, N_, 72, 74], [71, N_, 72, N_, 74, N_, N_, N_]] },
      { ch: [[45, 48, 52, 55], [40, 47, 52, 55], [41, 45, 48, 52], [43, 48, 52, 55], [38, 45, 50, 53], [43, 47, 50, 53], [40, 47, 52, 55], [43, 47, 50, 55]],
        mel: [[72, N_, 71, 72, 76, N_, N_, N_], [74, N_, 72, 71, 67, N_, N_, N_], [69, N_, 72, N_, 77, 76, 74, 72], [72, N_, N_, N_, 67, N_, 72, 74],
          [77, N_, 76, 74, 74, N_, 72, N_], [71, N_, 74, N_, 79, N_, 77, N_], [76, N_, 74, 72, 71, N_, 72, 74], [74, N_, N_, N_, N_, N_, 71, N_]] },
      { ch: [[48, 52, 55, 59], [45, 48, 52, 55], [41, 45, 48, 52], [43, 47, 50, 53], [48, 52, 55, 59], [45, 48, 52, 55], [41, 45, 48, 52], [43, 47, 50, 55]],
        mel: [[72, N_, 76, N_, 79, N_, 76, N_], [72, N_, 76, N_, 74, 72, 69, N_], [69, N_, 72, N_, 77, N_, 76, 74], [74, N_, N_, 71, 74, N_, 79, N_],
          [76, N_, 79, N_, 84, N_, 83, 81], [79, N_, 76, N_, 72, N_, 74, 76], [77, N_, 76, N_, 74, N_, 72, N_], [71, N_, 74, N_, 79, N_, N_, N_]] },
      { ch: [[41, 45, 48, 52], [43, 47, 50, 55], [40, 47, 52, 55], [45, 48, 52, 55], [38, 45, 50, 53], [43, 47, 50, 53], [48, 52, 55, 59], [48, 52, 55, 60]],
        mel: [[81, N_, N_, N_, 79, N_, 77, N_], [79, N_, N_, N_, 74, N_, N_, N_], [76, N_, N_, N_, 79, N_, 76, N_], [72, N_, N_, N_, N_, N_, N_, N_],
          [74, N_, 77, N_, 81, N_, 79, 77], [76, N_, 74, N_, 71, N_, 74, N_], [72, N_, N_, N_, N_, N_, N_, N_], [N_, N_, N_, N_, N_, N_, 67, N_]] },
    ],
  },
  lofi: {
    tempo: 68,
    sections: [
      { ch: [[41, 45, 48, 52], [40, 43, 47, 50], [38, 45, 48, 53], [36, 43, 47, 52], [41, 45, 48, 52], [40, 43, 47, 50], [38, 45, 48, 53], [36, 43, 47, 52]],
        mel: [[76, N_, N_, 72, N_, N_, 69, N_], [67, N_, N_, N_, 71, N_, 74, N_], [72, N_, N_, 69, N_, N_, 65, N_], [67, N_, N_, N_, N_, N_, N_, N_],
          [76, N_, 77, 76, N_, 72, N_, 69], [71, N_, N_, 74, N_, N_, 79, N_], [77, N_, 76, N_, 74, N_, 72, N_], [71, N_, N_, N_, 72, N_, N_, N_]] },
      { ch: [[34, 38, 41, 45], [33, 36, 40, 43], [31, 34, 38, 41], [36, 40, 43, 46], [34, 38, 41, 45], [33, 36, 40, 43], [31, 34, 38, 41], [36, 40, 43, 46]],
        mel: [[74, N_, N_, N_, 77, N_, 74, N_], [72, N_, N_, N_, 67, N_, 69, N_], [70, N_, N_, 74, N_, N_, 77, N_], [76, N_, N_, N_, N_, N_, 70, N_],
          [69, N_, 70, N_, 74, N_, 77, N_], [76, N_, N_, 72, N_, N_, 69, N_], [67, N_, 70, N_, 74, N_, 72, N_], [72, N_, N_, N_, N_, N_, N_, N_]] },
      { ch: [[41, 45, 48, 52], [40, 43, 47, 50], [38, 45, 48, 53], [36, 43, 47, 52], [41, 45, 48, 52], [40, 43, 47, 50], [38, 45, 48, 53], [36, 43, 47, 52]],
        mel: [[N_, N_, 76, N_, 72, N_, 69, N_], [67, N_, N_, N_, 71, N_, 74, N_], [72, N_, N_, 69, N_, N_, 65, N_], [67, N_, N_, N_, N_, N_, N_, N_],
          [76, N_, 77, 76, N_, 72, N_, 69], [71, N_, N_, 74, N_, N_, 79, N_], [77, N_, 76, N_, 74, N_, 72, N_], [72, N_, N_, N_, N_, N_, N_, N_]] },
      { ch: [[38, 41, 45, 48], [33, 36, 40, 43], [34, 38, 41, 45], [36, 40, 43, 46], [38, 41, 45, 48], [33, 36, 40, 43], [34, 38, 41, 45], [36, 40, 43, 46]],
        mel: [[N_, N_, N_, N_, 81, N_, 79, N_], [77, N_, N_, N_, N_, N_, N_, N_], [N_, N_, N_, N_, 74, N_, 77, N_], [76, N_, N_, N_, N_, N_, N_, N_],
          [N_, N_, N_, N_, 81, N_, 79, 77], [76, N_, N_, N_, 72, N_, N_, N_], [74, N_, N_, N_, N_, N_, 70, N_], [72, N_, N_, N_, N_, N_, N_, N_]], quiet: true },
    ],
  },
};
const mtof = (n) => 440 * Math.pow(2, (n - 69) / 12);
function bgmReverb(ctx, secs = 2.4, decay = 3) {
  const len = Math.floor(ctx.sampleRate * secs), buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) { const d = buf.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay); }
  const cv = ctx.createConvolver(); cv.buffer = buf; return cv;
}
// 排一整首（32 小節），pass 是第幾輪（每輪伴奏、鼓會換一點），回傳長度（秒）
function bgmSchedule(ctx, out, style, t0, pass = 0) {
  const song = BGM_SONGS[style];
  const beat = 60 / song.tempo, step = beat / 2, bar = beat * 4;
  const rnd = () => Math.random();
  const trim = ctx.createGain(); trim.gain.value = { piano: 1.05, lofi: .36 }[style]; trim.connect(out);
  const dry = ctx.createGain(), wet = ctx.createGain(), rv = bgmReverb(ctx);
  wet.gain.value = { piano: .32, lofi: .18 }[style];
  dry.connect(trim); dry.connect(rv); rv.connect(wet); wet.connect(trim);
  const env = (g, t, a, peak, d) => { g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(.0001, t + d); return t + d + .05; };
  const osc = (type, f, t, stopAt, dest, detune = 0) => { const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = detune; o.connect(dest); o.start(t); o.stop(stopAt); return o; };
  const pluck = (n, t, vol, decay, parts, dest = dry) => {
    const g = ctx.createGain(); g.connect(dest);
    const stop = env(g, t, .006, vol * (.85 + rnd() * .3), decay);
    parts.forEach(([mul, amp, type]) => { const pg = ctx.createGain(); pg.gain.value = amp; pg.connect(g); osc(type || 'sine', mtof(n) * mul, t, stop, pg); });
  };
  const noise = (() => { const b = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = rnd() * 2 - 1; return b; })();
  const hit = (t, vol, dur, type, freq, q = 1) => {
    const s = ctx.createBufferSource(); s.buffer = noise; const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(); s.connect(f); f.connect(g); g.connect(dry); env(g, t, .003, vol, dur); s.start(t, rnd() * .5); s.stop(t + dur + .05);
  };
  const hum = () => (rnd() - .5) * .016; // 一點點人味，不會每次都完全對拍
  const lofiLP = ctx.createBiquadFilter(); lofiLP.type = 'lowpass'; lofiLP.frequency.value = 950; lofiLP.connect(dry);
  const total = bar * song.sections.reduce((a, x) => a + x.mel.length, 0);
  if (style === 'lofi') { // 黑膠的沙沙聲
    const v = ctx.createBufferSource(); v.buffer = noise; v.loop = true; const vf = ctx.createBiquadFilter(); vf.type = 'bandpass'; vf.frequency.value = 1200; vf.Q.value = .4;
    const vg = ctx.createGain(); vg.gain.value = .006; v.connect(vf); vf.connect(vg); vg.connect(dry); v.start(t0); v.stop(t0 + total);
  }
  let bi = 0;
  song.sections.forEach((sec, si) => {
    sec.mel.forEach((b, bj) => {
      const t = t0 + (bi + bj) * bar, c = sec.ch[bj];
      // 旋律：每個音延長到下一個音
      b.forEach((n, k) => {
        if (n == null) return;
        let len = 1; while (k + len < 8 && b[k + len] == null) len++;
        const swing = style === 'lofi' && k % 2 ? step * .16 : 0;
        if (style === 'piano') pluck(n, t + k * step + hum(), .085, Math.max(1.8, len * step * 2), [[1, 1], [2, .32], [3, .12], [4.01, .05]]);
        else pluck(n, t + k * step + swing + hum(), sec.quiet ? .04 : .055, 1.4, [[1, 1], [2, .2, 'triangle']], lofiLP);
      });
      if (style === 'piano') {
        const parts = [[1, 1], [2, .32], [3, .12], [4.01, .05]];
        const pat = (pass + si) % 2
          ? [c[0] - 12, c[2], c[3], c[2], c[0], c[2], c[3], c[2]]
          : [c[0] - 12, c[1], c[2], c[3], c[2], c[1], c[0], c[2]];
        if (si === 3 && bj >= 6) pluck(c[0] - 12, t, .05, 3.5, parts);                // 最後兩小節只留低音，喘一口氣
        else pat.forEach((n, k) => pluck(n, t + k * step + hum(), k ? .026 : .045, 2.2, parts));
      } else {
        const g = ctx.createGain(); g.connect(lofiLP); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.05, t + .25); g.gain.setValueAtTime(.05, t + bar - .3); g.gain.linearRampToValueAtTime(0, t + bar + .05);
        c.forEach((n) => { osc('triangle', mtof(n + 12), t, t + bar + .1, g, -6); osc('sine', mtof(n + 12), t, t + bar + .1, g, 7); });
        const root = ((c[0] - 36) % 12 + 12) % 12 + 36;
        pluck(root, t, .09, bar * .9, [[1, 1], [2, .15]], lofiLP);
        const drums = !(bj < 2 && si === 0) && !sec.quiet;                            // 每首開頭兩小節、最後一段先不打鼓
        if (drums) {
          const kicks = (pass % 2) ? [0, 3, 4] : [0, 2.5, 4];
          kicks.forEach((k) => { if (k !== 0 && k !== 4 && bj % 2) return; const kt = t + k * step; const o = ctx.createOscillator(), kg = ctx.createGain(); o.frequency.setValueAtTime(110, kt); o.frequency.exponentialRampToValueAtTime(42, kt + .18); o.connect(kg); kg.connect(dry); env(kg, kt, .004, .16, .3); o.start(kt); o.stop(kt + .4); });
          [2, 6].forEach((k) => hit(t + k * step, .03, .18, 'bandpass', 1800, .7));
          for (let k = 0; k < 8; k++) if (rnd() > .08) hit(t + k * step + (k % 2 ? step * .16 : 0), k % 2 ? .008 : .013, .05, 'highpass', 7000);
        } else if (sec.quiet) for (let k = 0; k < 8; k += 2) hit(t + k * step, .006, .05, 'highpass', 7000);
        for (let k = 0; k < 6; k++) hit(t + rnd() * bar, .006 + rnd() * .01, .012, 'highpass', 3000);
      }
    });
    bi += sec.mel.length;
  });
  return bar * bi;
}
// ---------- 播放器 ----------
const BGM = { ctx: null, gain: null, timer: null, on: false, style: '' };
const bgmVol = () => +(localStorage.getItem('park-bgm-vol') || 35) / 100;
const bgmEnabled = () => localStorage.getItem('park-bgm') !== 'off'; // 預設開著
const bgmStyleNow = () => (document.documentElement.dataset.theme === 'day' ? 'piano' : 'lofi');
function bgmStart() {
  if (BGM.on || !bgmEnabled()) return;
  try {
    BGM.ctx ||= new (window.AudioContext || window.webkitAudioContext)();
    if (BGM.ctx.state !== 'running') BGM.ctx.resume();
    const out = BGM.gain = BGM.ctx.createGain(); out.gain.value = 0; out.connect(BGM.ctx.destination);
    out.gain.linearRampToValueAtTime(bgmVol() * 5, BGM.ctx.currentTime + 3);
    BGM.on = true; BGM.style = bgmStyleNow();
    let t = BGM.ctx.currentTime + .2, pass = 0;
    const loop = () => { if (!BGM.on || BGM.gain !== out) return; t += bgmSchedule(BGM.ctx, out, BGM.style, t, pass++); BGM.timer = setTimeout(loop, Math.max(1, t - BGM.ctx.currentTime - 4) * 1000); };
    loop();
  } catch (e) {}
}
function bgmStop(fade = .8) {
  if (!BGM.on) return; BGM.on = false; clearTimeout(BGM.timer);
  const g = BGM.gain, c = BGM.ctx; BGM.gain = null; if (!g) return;
  try { g.gain.cancelScheduledValues(c.currentTime); g.gain.setValueAtTime(g.gain.value, c.currentTime); g.gain.linearRampToValueAtTime(0, c.currentTime + fade); } catch (e) {}
  setTimeout(() => { try { g.disconnect(); } catch (e) {} }, fade * 1000 + 200);
}
const bgmSetVol = () => { if (BGM.on && BGM.gain) BGM.gain.gain.setTargetAtTime(bgmVol() * 5, BGM.ctx.currentTime, .2); };
// 音效響的時候，背景音樂先讓一下（不會蓋過刮刮樂、翻卡的聲音）
function bgmDuck() {
  if (!BGM.on || !BGM.gain) return;
  const g = BGM.gain.gain, t = BGM.ctx.currentTime;
  try { g.cancelScheduledValues(t); g.setTargetAtTime(bgmVol() * 5 * .35, t, .05); g.setTargetAtTime(bgmVol() * 5, t + .9, .4); } catch (e) {}
}
// 日夜切換時，音樂淡出再換另一首
function bgmThemeCheck() { if (BGM.on && BGM.style !== bgmStyleNow()) { bgmStop(2); setTimeout(bgmStart, 2300); } }
// iPhone：一定要在「點畫面」的當下解鎖聲音。聲音類型設成 ambient：跟著靜音開關，開靜音就不出聲
function audioUnlock() {
  try { if (navigator.audioSession && navigator.audioSession.type !== 'ambient') navigator.audioSession.type = 'ambient'; } catch (e) {}
  try {
    BGM.ctx ||= (typeof AC !== 'undefined' && AC) || new (window.AudioContext || window.webkitAudioContext)();
    if (typeof AC !== 'undefined' && !AC) AC = BGM.ctx; // 音效和音樂共用同一個
    if (BGM.ctx.state !== 'running') BGM.ctx.resume();
    const b = BGM.ctx.createBuffer(1, 1, 22050), src = BGM.ctx.createBufferSource(); src.buffer = b; src.connect(BGM.ctx.destination); src.start(0);
  } catch (e) {}
  bgmStart();
}
['touchend', 'click', 'pointerdown', 'keydown'].forEach((ev) => document.addEventListener(ev, audioUnlock, { passive: true, capture: true }));
document.addEventListener('visibilitychange', () => { if (document.hidden) bgmStop(.3); });
setInterval(bgmThemeCheck, 60000);
// ============================================================
//  設定 → 功能介紹（不暴雷：只講怎麼玩，不講還沒遇到的東西）
// ============================================================
const GUIDE = [
  ['home', '首頁', [
    '最上面是在一起的天數，旁邊是接下來的紀念日倒數。',
    '右上角的愛心按一下就是「想你」，對方會收到；按完要等 5 分鐘才能再按。',
    '每天選一個心情，對方看得到；每日一問兩個人都回答了，才看得到彼此的答案。',
  ]],
  ['heart', '小小黑', [
    '小小黑住在首頁，點牠就能進牠的房間。',
    '每天摸摸 +3・餵罐罐 +8・按想你 +1・回答每日一問 +2・幫對方蓋章 +3・完成每週任務 +3・兌換票券 +3・季問答 +5。',
    '一個人一天最多 +30，兩個人一起養長得最快。長大以後可以隨時切換回以前的樣子。',
    '罐罐每人每天配給一個；回答問題、做任務、被蓋章偶爾也會掉，路過的小動物有時候會叼來。',
    '超過一天半沒人理牠，牠會開始想你們。裝扮和配件要在特別的時候才拿得到。',
    '首頁偶爾會有小動物路過，點牠們會說話，遇過的會記進圖鑑。',
  ]],
  ['ticket', '票夾', [
    '收到的新卡要先刮開；想用的時候長按就能兌換，對方會馬上收到。',
    '按「發一張卡」可以自己寫一張送給對方，還能挑卡面和配色。',
    '收藏冊裡是你們集起來的卡，三張同一級的可以合成一張更高級的。',
  ]],
  ['gacha', '遊樂區', [
    `扭蛋一次 ${D.POINTS.gachaCost} 點，也可以用扭蛋券。`,
    `點數這樣拿：被蓋一個章 +${D.POINTS.stamp}・每週任務 +${D.POINTS.weeklyTask}・默契問答答對 +${D.POINTS.quizMatch}・每日一問 +${D.POINTS.daily}。`,
    `扭蛋券：蓋章集滿 ${D.POINTS.stampsPerSheet} 個送一張，節日和一些特別的時刻也會送。`,
    '每週任務每週一換新；打錯勾可以再點一次取消，點數會扣回來。每週可以申請換一項，要對方同意。',
    '對戰挑戰：7 天內先完成的人贏，輸的人發一張卡給贏的人。每個人每週可以換掉一個題目。',
  ]],
  ['map', '約會', [
    '排好的約會可以加進手機行事曆，完成後按「完成」記下來。',
    '沒想法就去點子罐搖一個；想看的、想吃的、想去的先記進清單，也可以順便丟進點子罐。',
    '旅行基金：一起存一趟旅行的錢，存滿了會有驚喜。',
  ]],
  ['clock', '回憶', [
    '時間軸、相簿、紙條盒都在這裡；紙條盒可以用日曆或關鍵字找以前的紙條。',
    '季問答和深度問答，每一季、每一年回答一次，以後可以回頭看。',
    '右上角是你們的成就。有些東西要等特別的日子才會出現。',
  ]],
  ['gear', '聲音和外觀', [
    '背景音樂白天是鋼琴、晚上是 Lo-fi，設定裡可以關掉或調音量。',
    '配色主題和日夜模式只會改變你自己這支手機。',
    '資料每週會自動備份，設定裡也可以自己存一份。',
  ]],
];
ACT.guide = () => {
  openModal(`${mhead('<i data-ic="book"></i> 功能介紹')}
    <div class="guide">${GUIDE.map(([ic, t, ps], i) => `<details class="g-sec emb-${['F-anniv', 'F-pet', 'C', 'SR', 'F-date', 'SSR', 'N'][i]}">
      <summary><span class="g-ic"><i data-ic="${ic}"></i></span><b>${t}</b><span class="g-ch">›</span></summary>
      <ul>${ps.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></details>`).join('')}</div>`);
};
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
    const ok = await S.store.coupleTx(S.cid, (c) => ((c.sched || {})[id] ? { [`sched.${id}`]: S.store.DEL ? S.store.DEL() : null } : null));
    if (!ok) continue;
    const t = { ...x.t };
    if (t.expDur) { if (t.expDur <= 86400000) { const d = new Date(); d.setHours(23, 59, 59, 999); t.expiresAt = d.getTime(); } else t.expiresAt = now() + t.expDur; delete t.expDur; }
    await col('cards').add(cardDoc(t, x.to, x.from));
    await notify(x.to, 'card', `${nick(x.from)} 預約的卡今天送到了 🎟️`, x.t.title);
  }
}
const mySched = () => Object.entries(S.couple?.sched || {}).filter(([, x]) => x && x.from === me()).map(([id, x]) => ({ ...x, id })).sort((a, b) => a.day.localeCompare(b.day));
// 預約中的卡：可以改內容、改日期、取消
ACT.schedEdit = (el) => {
  const id = el.dataset.id, x = (S.couple.sched || {})[id]; if (!x) return toast('這張已經送出了');
  const m = openModal(`${mhead('預約中的卡')}
    <label>卡名</label><input id="se-t" maxlength="20" value="${esc(x.t.title)}">
    <label>說明</label><input id="se-d" maxlength="40" value="${esc(x.t.desc || '')}">
    <label>哪一天送到</label><input id="se-day" type="date" value="${esc(x.day)}" min="${dkey(new Date(Date.now() + 86400000))}">
    <button class="btn block mt" id="se-ok">儲存</button>
    <button class="btn ghost block mt" id="se-del" style="color:#d4405f">取消這次預約</button>`, { center: true });
  $('#se-ok', m).onclick = () => {
    const title = $('#se-t', m).value.trim(), day = $('#se-day', m).value;
    if (!title) return toast('卡名不能空白');
    if (!day || day <= dkey()) return toast('要選明天以後的日子');
    const cur = (S.couple.sched || {})[id]; if (!cur) { closeModal(m); return toast('這張已經送出了'); }
    S.store.updateCouple(S.cid, { [`sched.${id}.t.title`]: title, [`sched.${id}.t.desc`]: $('#se-d', m).value.trim(), [`sched.${id}.day`]: day });
    toast('改好了'); closeModal(m); setTimeout(render, 150);
  };
  $('#se-del', m).onclick = async () => {
    if (!(await confirmBox(`取消預約「${x.t.title}」？卡不會送出`, '取消預約'))) return;
    S.store.updateCouple(S.cid, { [`sched.${id}`]: S.store.DEL() });
    toast('預約取消了'); closeModal(m); setTimeout(render, 150);
  };
};

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
  const c = list('cards').find((x) => x.id === el.dataset.id); if (!c || c.owner !== me() || c.used || el.disabled) return;
  el.disabled = true;   // 連點兩下不會換到兩個罐罐
  await col('cards').remove(c.id);
  await giveCan(me(), '', true);
  const row = el.closest('.dup-row');
  if (row) {
    row.innerHTML = `<span class="small">換好了，${esc(petState().name)}多了一個罐罐</span><button class="btn sm ghost">按錯了，復原</button>`;
    row.querySelector('button').onclick = async (e) => { e.currentTarget.disabled = true; await canUndo(c); row.innerHTML = '<span class="small">復原了，卡放回票夾</span>'; sfx('pop'); };
  }
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
    if (/^(dmatch|care|pest)-/.test(key) && d && d < cut) up[`drops.${key}`] = X;
    if (w && w < cutWk) up[`drops.${key}`] = X;
    if (S.couple.drops[key] === null) up[`drops.${key}`] = X;
  }
  for (const [id, x] of Object.entries(S.couple.sched || {})) if (x === null) up[`sched.${id}`] = X;
  for (const f of ['taskOverride', 'battleSwaps']) for (const w of Object.keys(S.couple[f] || {})) if (w < cutWk) up[`${f}.${w}`] = X;
  if (Object.keys(up).length) { try { await S.store.updateCouple(S.cid, up); } catch (e) {} }
}
// ============================================================
//  集點章（徽章風印章）＋約會打卡章＋每月回顧卡
// ============================================================
const stampRot = (s) => ((hash(String(s)) % 25) - 14);
function sealDots(n, r, cx = 50, cy = 50, big = 4) {
  let o = ''; for (let i = 0; i < n; i++) { const a = i * 2 * Math.PI / n; o += `<circle cx="${(cx + Math.sin(a) * r).toFixed(1)}" cy="${(cy - Math.cos(a) * r).toFixed(1)}" r="${i % big ? .9 : 1.7}" class="e-ink-f"/>`; } return o;
}
// 一般的章：圓形印章，中間是理由的代表字
function sealSVG(rec) {
  const why = (rec.reason || '').replace(/^蓋章：/, '');
  const PRE = { 做家事: '家', 好貼心: '暖', 哄我開心: '哄', 準時不遲到: '準', 煮飯給我吃: '煮', 今天好可愛: '萌', 有乖乖: '乖', 幫我很多忙: '幫' };
  const ch = PRE[why] || embChar(why.replace(/今天|好|很|有|超|真/g, '') || why) || '讚';
  return `<svg viewBox="0 0 100 100" class="seal emb-C" style="transform:rotate(${stampRot(rec.at)}deg)">
    <circle cx="50" cy="50" r="46" class="e-ink-s" stroke-width="3.2" fill="none"/>
    <circle cx="50" cy="50" r="39" class="e-ink-s" stroke-width="1" fill="none"/>
    ${sealDots(24, 42.5, 50, 50, 6)}
    <circle cx="50" cy="50" r="29" class="e-acc-s" stroke-width="1" fill="none" stroke-dasharray="2.5 3"/>
    <path d="M50 14 l1.6 3.6 l3.6 1.6 l-3.6 1.6 l-1.6 3.6 l-1.6 -3.6 l-3.6 -1.6 l3.6 -1.6 z" class="e-ink-f"/>
    <text x="50" y="62" text-anchor="middle" class="e-ink-f seal-ch">${esc(ch)}</text>
  </svg>`;
}
// 約會章：郵戳形狀，愛心＋日期
function dateSealSVG(rec) {
  const d = new Date(rec.at), md = `${d.getMonth() + 1}.${String(d.getDate()).padStart(2, '0')}`;
  let teeth = ''; for (let i = 0; i < 10; i++) teeth += `<circle cx="${(13 + i * 8.25).toFixed(1)}" cy="10" r="2.6" class="e-bg"/><circle cx="${(13 + i * 8.25).toFixed(1)}" cy="90" r="2.6" class="e-bg"/>`;
  for (let i = 0; i < 10; i++) teeth += `<circle cx="10" cy="${(13 + i * 8.25).toFixed(1)}" r="2.6" class="e-bg"/><circle cx="90" cy="${(13 + i * 8.25).toFixed(1)}" r="2.6" class="e-bg"/>`;
  return `<svg viewBox="0 0 100 100" class="seal emb-F-date" style="transform:rotate(${stampRot(rec.at)}deg)">
    <rect x="10" y="10" width="80" height="80" rx="4" class="e-ink-f"/>${teeth}
    <rect x="17" y="17" width="66" height="66" rx="3" class="e-bg"/>
    <rect x="21" y="21" width="58" height="58" rx="2" class="e-ink-s" stroke-width="1.2" fill="none"/>
    <path d="M50 46 C42 40 34 34 38 28 C41 24 47 25 50 30 C53 25 59 24 62 28 C66 34 58 40 50 46 Z" class="e-acc-f e-ink-s" stroke-width="1.4" stroke-linejoin="round"/>
    <text x="50" y="62" text-anchor="middle" class="e-ink-f seal-t">約 會</text>
    <text x="50" y="74" text-anchor="middle" class="e-ink-f seal-d">${md}</text>
  </svg>`;
}
const stampHTML = (rec) => (/^約會：/.test(rec.reason || '') ? dateSealSVG(rec) : sealSVG(rec));
// 蓋章共用：加點、通知、集滿送扭蛋券
async function addStamp(p, reason, { notifyText } = {}) {
  const before = stampCount(p);
  await addPoints(p, D.POINTS.stamp, reason, 'stamp');
  maybeCan(p, '被蓋了章', .3);
  await notify(p, 'stamp', notifyText || `${nick(me())} 幫你蓋了一個章 📮`, reason.replace(/^(蓋章|約會)：/, ''));
  if ((before + 1) % D.POINTS.stampsPerSheet === 0) { await addTicket(p, 1); await notify(p, 'stamp', '集滿一張章卡！送你一張扭蛋券 🎫'); }
}
// 約會完成：兩個人互相蓋一個約會章（每個約會只蓋一次）
async function dateStamps(d) {
  const ok = await S.store.coupleTx(S.cid, (c) => ((c.drops || {})[`dstamp-${d.id}`] ? null : { [`drops.dstamp-${d.id}`]: true }));
  if (!ok) return;
  for (const u of S.couple.members) await addStamp(u, '約會：' + (d.title || '一起出門'), { notifyText: `約會完成，${u === me() ? '你們' : nick(me()) + '和你'}都拿到一個約會章 💌` });
  setTimeout(() => toast('兩個人都拿到一個約會章'), 1400);
}

// ---------- 每月回顧（每月 1～7 號出現在首頁） ----------
function monthReview() {
  const d = new Date(); if (d.getDate() > 7) return null;
  const pm = new Date(d.getFullYear(), d.getMonth() - 1, 1), y = pm.getFullYear(), mo = pm.getMonth();
  const inM = (t) => { const x = new Date(t); return x.getFullYear() === y && x.getMonth() === mo; };
  const inMk = (k) => k && +k.slice(0, 4) === y && +k.slice(5, 7) === mo + 1;
  const ms = (S.couple.members || []);
  const moodTop = (u) => { const h = ((S.couple.moodHist || {})[u]) || {}; const cnt = {}; Object.entries(h).forEach(([k, v]) => { if (inMk(k)) cnt[v] = (cnt[v] || 0) + 1; }); const top = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0]; return top ? top[0] : ''; };
  const st = {
    dates: list('dates').filter((x) => x.done && x.doneAt && inM(x.doneAt)).length,
    daily: list('daily').filter((x) => inMk(x.id) && x.answers && ms.every((u) => x.answers[u])).length,
    stamps: list('points').filter((p) => p.tag === 'stamp' && inM(p.at)).length,
    redeem: list('events').filter((e) => e.type === 'redeem' && inM(e.at) && e.to !== 'sys').length,
    photos: list('photos').filter((x) => inMk(x.date)).length + list('memories').filter((x) => inMk(x.date)).length,
    notes: list('notes').filter((n) => inM(n.at)).length,
  };
  const any = Object.values(st).some((v) => v);
  return { y, mo, st, any, moods: ms.map((u) => [u, moodTop(u)]) };
}
function monthReviewHTML() {
  const R = monthReview(); if (!R || !R.any) return '';
  const key = `park-mreview-${R.y}-${R.mo}`; if (localStorage.getItem(key)) return '';
  const MN = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'][R.mo];
  const items = [['map', '一起約會', R.st.dates, '次'], ['chat', '每日一問', R.st.daily, '天'], ['stamp', '蓋了章', R.st.stamps, '個'], ['ticket', '兌換票券', R.st.redeem, '張'], ['photo', '照片和回憶', R.st.photos, '個'], ['letter', '小紙條', R.st.notes, '張']].filter((x) => x[2]);
  let rays = ''; for (let i = 0; i < 24; i++) { const a = i * 15 * Math.PI / 180; rays += `<line x1="${(60 + Math.sin(a) * 47).toFixed(1)}" y1="${(60 - Math.cos(a) * 47).toFixed(1)}" x2="${(60 + Math.sin(a) * (i % 2 ? 51 : 54)).toFixed(1)}" y2="${(60 - Math.cos(a) * (i % 2 ? 51 : 54)).toFixed(1)}" class="e-ink-s" stroke-width="${i % 2 ? .8 : 1.4}"/>`; }
  return `<div class="card mrev emb-SSR">
    <button class="mrev-x" data-act="mrevHide" data-k="${key}" aria-label="收起來">✕</button>
    <div class="mrev-top">
      <svg viewBox="0 0 120 120" class="mrev-medal">${rays}<circle cx="60" cy="60" r="44" class="e-bg e-ink-s" stroke-width="1.6"/><circle cx="60" cy="60" r="38" class="e-acc-s" stroke-width=".9" fill="none" stroke-dasharray="2 3"/>
        <text x="60" y="62" text-anchor="middle" class="e-ink-f mrev-n" style="font-size:${MN.length > 1 ? 22 : 30}px">${MN}</text><text x="60" y="80" text-anchor="middle" class="e-ink-f mrev-s">月</text></svg>
      <div><div class="mrev-eye">${R.y} · MONTHLY</div><b class="mrev-h">${MN}月的我們</b><div class="small muted">上個月一起留下的小事</div></div>
    </div>
    <div class="mrev-g" style="grid-template-columns:repeat(${items.length === 4 ? 2 : Math.min(3, items.length)},1fr)">${items.map(([ic, n, v, u]) => `<div class="mrev-i"><i data-ic="${ic}"></i><b>${v}<small>${u}</small></b><span>${n}</span></div>`).join('')}</div>
    ${R.moods.some(([, m]) => m) ? `<div class="mrev-mood">${R.moods.map(([u, m]) => m ? `<span>${avatar(u)} ${esc(nick(u))} 最常是 ${moodIc(m)} ${esc((D.MOODS.find((x) => x.icon === m) || {}).label || '')}</span>` : '').join('')}</div>` : ''}
  </div>`;
}
ACT.mrevHide = (el) => { localStorage.setItem(el.dataset.k, '1'); render(); };

// ============================================================
//  🔥 火辣區：兩個人的尺度上限都調到「火辣」才會出現在遊樂區
//  進去要輸入 4 位數密碼（兩人共用，只存雜湊值）；app 切到背景就自動鎖上
//  資料放在 hot 集合（type: want / item / done / dice），會備份、好寶加入時會清空
//  密碼放在空間的 hot.pin，加入時不會被清掉
// ============================================================
// 好寶加入前（空間只有一個人）：自己是火辣就看得到，方便先測試；加入後自動變回兩個人都要火辣
const hotOn = () => { const ms = S.couple?.members || []; return ms.length >= 1 && ms.every((u) => (prof(u).spice || 1) >= 3); };
const HOT_UNLOCK_MS = 10 * 60000;   // 解鎖後 10 分鐘內再進來不用重打
let hotUntil = 0, hotIntroShown = false;
const hotSeenKey = () => `park-hot-seen-${S.cid}-${me()}`;
const hotMatchSeenKey = () => `park-hot-mseen-${S.cid}-${me()}`;
const hotLv = () => (+localStorage.getItem('park-hot-lv') === 3 ? 3 : 2);

// ---------- 徽章 ----------
function hotEmblem(cls = '') {
  let dots = '';
  for (let i = 0; i < 16; i++) {
    const a = i * Math.PI / 8, r = 45;
    dots += i % 2 ? `<circle cx="${(Math.sin(a) * r).toFixed(1)}" cy="${(-Math.cos(a) * r).toFixed(1)}" r="1.3" class="he-g"/>`
      : `<path d="M${(Math.sin(a) * r).toFixed(1)} ${(-Math.cos(a) * r - 2.6).toFixed(1)} l1.6 2.6 l-1.6 2.6 l-1.6 -2.6 z" class="he-gf"/>`;
  }
  return `<svg class="hot-em ${cls}" viewBox="-60 -60 120 120" aria-hidden="true">
    <circle r="57" class="he-bg"/><circle r="57" class="he-ring" stroke-width="1.8"/><circle r="51" class="he-ring" stroke-width=".8" stroke-dasharray="1.4 2.6"/>
    ${dots}
    <circle r="37" class="he-in"/><circle r="37" class="he-ring" stroke-width="1.2"/>
    <g transform="translate(-26.4 -30) scale(2.2)"><path d="M12 21 C8 21 6 18.5 6 15.5 C6 12 9 10.5 9 7 C11.5 8.5 12 10.5 11.8 12.2 C13 11.4 13.6 10 13.6 8.5 C16.5 10.5 18 13 18 15.5 C18 18.5 16 21 12 21 Z" class="he-fl" stroke-width=".8" stroke-linejoin="round"/>
      <path d="M12 21 C10.5 21 9.7 19.8 9.7 18.6 C9.7 17 11 16.3 11.4 15 C13 16 14.3 17.2 14.3 18.6 C14.3 19.8 13.5 21 12 21 Z" class="he-fl2"/></g>
    <path d="M19 -25 A7 7 0 1 0 26 -14 A5.4 5.4 0 0 1 19 -25 Z" class="he-gf"/>
    <path d="M-24 -18 l1 2.2 l2.2 1 l-2.2 1 l-1 2.2 l-1 -2.2 l-2.2 -1 l2.2 -1 z" class="he-gf"/>
    <path d="M-40 32 L-34 24 L34 24 L40 32 L34 40 L-34 40 Z" class="he-rb" stroke-width="1.2" stroke-linejoin="round"/>
    <text x="0" y="36.6" text-anchor="middle" class="he-tx">火 辣 區</text>
  </svg>`;
}
const hotLockSVG = () => `<svg class="hot-lock" viewBox="0 0 40 48" aria-hidden="true"><g class="hl-sh"><path d="M11 22 V14 A9 9 0 0 1 29 14 V22" fill="none" stroke-width="3.4" stroke-linecap="round"/></g>
  <rect x="5" y="21" width="30" height="23" rx="5"/><circle cx="20" cy="31" r="3" class="hl-k"/><path d="M20 33 V38" class="hl-k" stroke-width="2.4" stroke-linecap="round"/></svg>`;

// ---------- 資料 ----------
const hotDocs = (type) => list('hot').filter((d) => d.type === type);
function hotItems() {
  const custom = hotDocs('item').map((d) => ({ k: d.k, t: d.t, lv: d.lv || 3, custom: true, id: d.id, by: d.by }));
  return [...D.HOT_LIST, ...custom];
}
const hotWants = (uid) => new Set(hotDocs('want').filter((d) => d.uid === uid).map((d) => d.k));
function hotMatches() {
  const p = partner(); if (!p) return [];
  const mine = hotWants(me()), theirs = hotWants(p);
  const at = (k) => Math.max(...hotDocs('want').filter((d) => d.k === k).map((d) => d.at || 0));
  return hotItems().filter((x) => mine.has(x.k) && theirs.has(x.k)).map((x) => ({ ...x, at: at(x.k) }));
}
const hotNewMatch = () => { const seen = +(localStorage.getItem(hotMatchSeenKey()) || 0); return hotMatches().some((x) => x.at > seen); };
function hotFaces(lv, kind) {
  const d = hotDocs('dice').find((x) => x.lv === lv && x.kind === kind);
  return d && d.faces && d.faces.length >= 2 ? d.faces : D.HOT_DICE[lv][kind];
}

// ---------- 遊樂區的入口 ----------
function hotTileHTML() {
  if (!hotOn()) return '';
  if (!hotIntroShown && !localStorage.getItem(hotSeenKey())) { hotIntroShown = true; setTimeout(hotIntro, 600); }
  return `<button class="game-tile wide hot-tile" data-act="hot"><span class="ht-em">${hotEmblem()}</span>
    <div class="grow"><b>火辣區</b><br><span>只屬於我們兩個的夜晚</span></div><span class="ht-lock">${hotLockSVG()}</span>${hotNewMatch() ? '<span class="badge-dot">!</span>' : ''}</button>`;
}

// ---------- 第一次出現：解鎖動畫（每個人各看一次） ----------
function hotIntro() {
  if (!hotOn() || S.tab !== 'play' || $('.hot-intro')) return;
  localStorage.setItem(hotSeenKey(), String(now()));
  const ov = document.createElement('div');
  ov.className = 'hot-intro';
  ov.innerHTML = `<div class="hi-glow"></div><div class="hi-sparks">${Array.from({ length: 14 }, (_, i) => `<i style="--a:${i * 360 / 14}deg;--d:${(i % 3) * .12}s"></i>`).join('')}</div>
    <div class="hi-em">${hotEmblem()}<div class="hi-lk">${hotLockSVG()}</div></div>
    <div class="hi-t1">新的區域解鎖了</div>
    <div class="hi-t2">火辣區</div>
    <div class="hi-t3">${esc(nick(partner()))}和你都打開了⋯⋯<br>接下來的，只屬於你們兩個</div>
    <div class="hi-btns"><button class="btn ghost" id="hi-later">晚點再說</button><button class="btn hot-btn" id="hi-go">進去看看</button></div>`;
  document.body.appendChild(ov);
  sfx('chime'); vibrate([20, 60, 20]);
  setTimeout(() => { sfx('sparkle'); vibrate([40, 30, 80]); }, 1500);
  $('#hi-later', ov).onclick = () => ov.remove();
  $('#hi-go', ov).onclick = () => { ov.remove(); ACT.hot(); };
}

// ---------- 密碼 ----------
async function hotHash(pin) {
  const txt = `two-park-hot:${S.cid}:${pin}`;
  try {
    const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(txt));
    return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
  } catch (e) { return 'h' + hash(txt) + hash(txt + '#'); }
}
// check(pin) 回傳 true 代表通過；回傳字串就是錯誤訊息（數字會清掉、抖一下）
function pinPad({ title, sub = '', check }) {
  return new Promise((res) => {
    let v = '';
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];
    const m = openModal(`<div class="m-head"><h2></h2><button class="m-close" data-act="close">✕</button></div>
      <div class="pin-wrap"><div class="pin-em">${hotEmblem()}</div>
      <div class="pin-title">${esc(title)}</div><div class="pin-sub small" id="pn-sub">${esc(sub)}</div>
      <div class="pin-dots" id="pn-d">${[0, 1, 2, 3].map(() => '<i></i>').join('')}</div>
      <div class="pin-keys">${keys.map((k) => k === '' ? '<span></span>' : `<button data-k="${k}" class="${k === 'del' ? 'pk-del' : ''}">${k === 'del' ? '⌫' : k}</button>`).join('')}</div></div>`,
      { center: true, cls: 'hot-zone pin-modal', onClose: () => res(null) });
    const dots = () => $$('#pn-d i', m).forEach((d, i) => d.classList.toggle('on', i < v.length));
    let busy = false;
    $$('[data-k]', m).forEach((b) => b.onclick = async () => {
      if (busy) return;
      const k = b.dataset.k;
      if (k === 'del') { v = v.slice(0, -1); dots(); return; }
      if (v.length >= 4) return;
      v += k; dots(); vibrate(8);
      if (v.length < 4) return;
      busy = true;
      const r = check ? await check(v) : true;
      if (r === true) { await sleep(160); m._onClose = null; closeModal(m); res(v); return; }
      $('#pn-sub', m).textContent = r; $('#pn-d', m).classList.add('shake'); vibrate([30, 40, 30]);
      await sleep(450); $('#pn-d', m).classList.remove('shake'); v = ''; dots(); busy = false;
    });
  });
}
async function hotSetPin() {
  const a = await pinPad({ title: '設定火辣區密碼', sub: '4 位數，兩個人共用這一組' });
  if (!a) return false;
  const b = await pinPad({ title: '再輸入一次', sub: '確認一下', check: async (x) => x === a || '兩次不一樣，再試一次' });
  if (!b) return false;
  await S.store.updateCouple(S.cid, { 'hot.pin': await hotHash(a), 'hot.pinAt': now() });
  toast('密碼設好了，兩個人共用這一組');
  return true;
}
const hotCheck = async (x) => (await hotHash(x)) === S.couple.hot.pin || '密碼不對';
ACT.hot = async () => {
  if (!hotOn()) return;
  if (now() < hotUntil) return hotHub();
  if (!S.couple.hot?.pin) { if (!(await hotSetPin())) return; }
  else if (!(await pinPad({ title: '輸入密碼', sub: '只有我們兩個知道', check: hotCheck }))) return;
  hotUntil = now() + HOT_UNLOCK_MS;
  hotHub();
};
// 設定裡改密碼（尺度上限是火辣的人才看得到這一行）
ACT.hotPin = async () => {
  if (S.couple.hot?.pin && !(await pinPad({ title: '先輸入目前的密碼', check: hotCheck }))) return;
  await hotSetPin();
};
// 切到背景就鎖上，火辣區的畫面也一起關掉
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'hidden') return;
  hotUntil = 0;
  $$('.modal-back.hot-zone').forEach((b) => closeModal(b));
});

// ---------- 火辣區大廳 ----------
function hotHub() {
  const draw = () => {
    const tz = hotTeaseBadge(), sig = hotMoonLit();
    const sm = (act, icn, name, sub, dot) => `<button class="hz-t" data-act="${act}"><span class="hz-ti"><i data-ic="${icn}"></i></span><b>${name}</b>${sub ? `<small>${sub}</small>` : ''}${dot ? '<span class="badge-dot">!</span>' : ''}</button>`;
    return `${mhead('火辣區')}
    <div class="hz-top"><span class="hz-top-em">${hotEmblem()}</span><div class="grow"><div class="small">今晚的熱度</div>
      <div class="seg hz-lv" id="hz-lv">${[2, 3].map((l) => `<button data-l="${l}" class="${hotLv() === l ? 'on' : ''}">${spiceIc(l)} ${D.SPICE[l].label}</button>`).join('')}</div></div></div>
    <div class="hz-sec">白天</div>
    <div class="hz-g2">${sm('hotTease', 'letter', '撩撥任務', '早上互派，晚上驗收', tz)}${sm('hotSignal', 'moon', '今晚的暗號', '偷偷約今晚', sig)}</div>
    <div class="hz-sec">今晚</div>
    <div class="hz-g2">${sm('hotScript', 'film', '今晚的劇本', '角色扮演')}${sm('hotPlay', 'dice', '前戲遊戲', '真心話・大冒險・骰子')}</div>
    <button class="hz-main" data-act="hotPose"><span class="hz-ti big"><i data-ic="star"></i></span><div class="grow"><b>今天的姿勢</b><small>${hotPoseToday() ? '今天的 5 張已經抽好了' : '每天 5 張，照順序來'}</small></div><span class="hz-arr">›</span></button>
    <div class="hz-sec">收藏</div>
    <div class="hz-g3">${sm('hotList', 'heart', '想試清單', '', hotNewMatch())}${sm('hotWallet', 'stamp', '火辣票夾', `印章 ${hotStamps(me()).length}`)}${sm('hotPoseBook', 'book', '姿勢圖鑑', '')}</div>
    <div class="center hz-links"><button class="link" data-act="hotTimer"><i data-ic="hourglass"></i> 計時器</button><button class="link" id="hz-lock"><i data-ic="lock"></i> 鎖上離開</button></div>`;
  };
  const m = openModal(draw(), { center: true, cls: 'hot-zone hz-hub' });
  const wire = () => {
    $$('#hz-lv button', m).forEach((b) => b.onclick = () => { localStorage.setItem('park-hot-lv', b.dataset.l); $$('#hz-lv button', m).forEach((x) => x.classList.toggle('on', x === b)); });
    $('#hz-lock', m).onclick = () => { hotUntil = 0; closeModal(m); toast('火辣區鎖上了'); };
  };
  wire();
  m._redraw = () => { m.querySelector('.modal').innerHTML = draw(); wire(); };
}
const hotRedrawHub = () => $$('.hz-hub').forEach((b) => b._redraw && b._redraw());

ACT.hotTod = () => ACT.hotPlay();
ACT.hotDice = () => ACT.hotPlay();

// ---------- 前戲遊戲：真心話＋大冒險＋骰子，同一個畫面輪流玩 ----------
function hotLight(reroll) {
  const k = 'park-hot-light';
  let v = null; try { v = JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) {}
  if (reroll || !v || v.day !== dkey()) { v = { day: dkey(), t: pick(D.HOT_LIGHTS) }; localStorage.setItem(k, JSON.stringify(v)); }
  return v.t;
}
// 用嘴服務：位置換成對得上的私密部位（她分上下，他是下面）
function mouthPart(target) {
  const role = prof(target).role === 'him' ? 'him' : 'her';
  return pick(D.HOT_MOUTH[role]);
}
ACT.hotPlay = () => {
  const ms = (S.couple.members || []).slice();
  let turn = ms.includes(localStorage.getItem('park-hot-turn')) ? localStorage.getItem('park-hot-turn') : me();
  const other = (u) => ms.find((x) => x !== u) || u;
  const kinds = ['act', 'part', 'time'];
  const m = openModal(`${mhead('<i data-ic="dice"></i> 前戲遊戲')}
    <div class="seg hz-lv" id="hd-lv">${[2, 3].map((l) => `<button data-l="${l}" class="${hotLv() === l ? 'on' : ''}">${spiceIc(l)} ${D.SPICE[l].label}</button>`).join('')}</div>
    <div class="row" style="justify-content:center;gap:8px;margin-top:2px"><span class="small muted">輪到</span>
      <div class="seg" id="hd-turn" style="padding:0">${ms.map((u) => `<button data-u="${u}" class="${u === turn ? 'on' : ''}">${avatar(u)} ${esc(nick(u))}</button>`).join('')}</div></div>
    <button class="hp-light" id="hp-light"><i data-ic="candle"></i> 今晚燈光：<b id="hp-lt">${esc(hotLight())}</b><span class="small">點一下重抽</span></button>
    <div class="hdice-row" id="hp-dice">${kinds.map((k) => `<div class="hdie" data-k="${k}"><svg viewBox="0 0 80 80" class="hd-ring" aria-hidden="true"><circle cx="40" cy="40" r="37"/><circle cx="40" cy="40" r="32" stroke-dasharray="1.4 2.8"/></svg><small>${D.HOT_DICE_NAMES[k]}</small><b>?</b></div>`).join('')}</div>
    <div id="hd-res"></div>
    <div class="hp-btns"><button class="btn ghost" data-k="truth">真心話</button><button class="btn hot-btn" data-k="dice">擲骰子</button><button class="btn ghost" data-k="dare">大冒險</button></div>
    <div class="center hz-links"><button class="link" data-k="rand">讓命運決定</button><button class="link" id="hd-edit">改骰子上的字</button><button class="link" data-act="hotTimer">自訂計時</button></div>`, { center: true, cls: 'hot-zone hz-play' });
  $$('#hd-lv button', m).forEach((b) => b.onclick = () => { localStorage.setItem('park-hot-lv', b.dataset.l); $$('#hd-lv button', m).forEach((x) => x.classList.toggle('on', x === b)); });
  const setTurn = (u) => { turn = u; localStorage.setItem('park-hot-turn', u); $$('#hd-turn button', m).forEach((x) => x.classList.toggle('on', x.dataset.u === u)); };
  $$('#hd-turn button', m).forEach((b) => b.onclick = () => setTurn(b.dataset.u));
  $('#hp-light', m).onclick = async () => { const el = $('#hp-lt', m); for (let i = 0; i < 6; i++) { el.textContent = pick(D.HOT_LIGHTS); await sleep(70); } el.textContent = hotLight(true); sfx('pop'); };
  $('#hd-edit', m).onclick = () => hotDiceEditor(hotLv());
  tapRun(m, '#hp-dice', '[data-k="dice"]');   // 點骰子＝擲骰子
  const timerBtn = (t, label) => hotSecs(t) ? `<button class="btn block ghost hd-timer" id="hd-t"><i data-ic="hourglass"></i> 開始倒數 ${esc(fmtSecs(hotSecs(t)))}</button>` : '';
  const wireTimer = (t, label) => { $('#hd-t', m) && ($('#hd-t', m).onclick = () => hotTimer(hotSecs(t), label, true)); };
  let busy = false;

  const rollDice = async () => {
    const lv = hotLv(), doer = turn, target = other(turn);
    const who = (t) => t.replace(/【做的人】/g, nick(doer)).replace(/【被做的人】/g, nick(target));
    $('#hp-dice', m).classList.remove('hide'); $('#hd-res', m).innerHTML = '';
    vibrate([15, 30, 15, 30, 15]); sfx('pop');
    const raw = {}, out = {};
    raw.act = pick(hotFaces(lv, 'act'));
    const mouth = raw.act === '用嘴服務';
    raw.part = mouth ? mouthPart(target) : pick(hotFaces(lv, 'part'));
    raw.time = pick(hotFaces(lv, 'time'));
    await Promise.all(kinds.map(async (k, i) => {
      const el = $(`.hdie[data-k="${k}"]`, m), faces = hotFaces(lv, k), b = $('b', el);
      el.classList.remove('spin'); void el.offsetWidth; el.classList.add('spin');
      const stop = now() + 700 + i * 260;
      while (now() < stop) { b.textContent = who(pick(faces)); b.classList.toggle('long', b.textContent.length > 4); b.classList.toggle('xlong', b.textContent.length > 8); await sleep(70); }
      out[k] = who(raw[k]); b.textContent = out[k]; b.classList.toggle('long', out[k].length > 4); b.classList.toggle('xlong', out[k].length > 8);
      el.classList.remove('spin'); el.classList.add('land'); setTimeout(() => el.classList.remove('land'), 400);
    }));
    sfx('chime');
    const partTxt = /【/.test(raw.part) ? out.part : nick(target) + (mouth ? '' : '的') + out.part;
    $('#hd-res', m).innerHTML = `<div class="prompt-card hd-card"><div class="small muted" style="font-family:var(--sans)">骰子 · ${spiceIc(lv)} ${esc(nick(doer))} 對 ${esc(nick(target))}</div>
      ${esc(out.act)}<span class="hd-sep">·</span>${esc(partTxt)}<span class="hd-sep">·</span>${esc(out.time)}</div>${timerBtn(out.time)}`;
    wireTimer(out.time, `${out.act} · ${out.time}`);
    if (ms.length > 1) setTurn(target);
  };
  const tod = async (k) => {
    const lv = hotLv(), answerer = turn, asker = other(turn);
    $('#hp-dice', m).classList.add('hide');
    vibrate([15, 30, 15]);
    $('#hd-res', m).innerHTML = `<div class="hp-flip">${ic(k === 'truth' ? 'chat' : 'w_fire')}</div>`;
    await sleep(700);
    const pool = [];
    for (const l of [2, 3]) if (l <= lv) pool.push(...(k === 'truth' ? D.TRUTH : D.DARE)[l].map((t) => ({ t, l })));
    const show = (x) => {
      const txt = ms.length > 1 ? personalize(x.t, nick(asker), nick(answerer)) : x.t;
      $('#hd-res', m).innerHTML = `<div class="prompt-card"><div class="small muted" style="font-family:var(--sans)">${k === 'truth' ? '真心話' : '大冒險'} · ${spiceIc(x.l)} · ${esc(nick(answerer))} ${k === 'truth' ? '回答' : '挑戰'}</div>${esc(txt)}</div>
        ${timerBtn(txt)}<div class="center"><button class="link" id="t-swap" style="margin-top:8px">換一題（兩個人都同意才換）</button></div>`;
      wireTimer(txt, txt);
      $('#t-swap', m).onclick = async () => {
        if (!(await confirmBox('兩個人都同意換一題嗎？', '都同意，換！'))) return;
        const rest = pool.filter((y) => y.t !== x.t), p2 = rest.filter((y) => y.l === lv);
        show(Math.random() < .65 && p2.length ? pick(p2) : pick(rest));
      };
    };
    const pref = pool.filter((x) => x.l === lv);
    show(Math.random() < .65 && pref.length ? pick(pref) : pick(pool));
    sfx('chime');
    if (ms.length > 1) setTurn(asker);
  };
  $$('[data-k="truth"],[data-k="dare"],[data-k="dice"],[data-k="rand"]', m).forEach((b) => b.onclick = async () => {
    if (busy) return; busy = true;
    try {
      let k = b.dataset.k;
      if (k === 'rand') k = pick(['truth', 'dice', 'dare']);
      if (k === 'dice') await rollDice(); else await tod(k);
    } finally { busy = false; }
  });
};
function hotDiceEditor(lv) {
  const kinds = ['act', 'part', 'time'];
  const m = openModal(`${mhead(`改骰子 · ${D.SPICE[lv].label}`)}
    <p class="small muted" style="margin:0 0 8px">一行一面，2～16 面。改了兩個人都會一起換。寫【做的人】【被做的人】，擲出來會換成名字</p>
    ${kinds.map((k) => `<label>${D.HOT_DICE_NAMES[k]}</label><textarea id="de-${k}" rows="6">${esc(hotFaces(lv, k).join('\n'))}</textarea>`).join('')}
    <div class="btn-row"><button class="btn ghost" id="de-reset">換回預設</button><button class="btn hot-btn" id="de-save">儲存</button></div>`, { center: true, cls: 'hot-zone' });
  const save = async (reset) => {
    for (const k of kinds) {
      const faces = reset ? [] : $(`#de-${k}`, m).value.split('\n').map((x) => x.trim()).filter(Boolean).slice(0, 16);
      if (!reset && faces.length < 2) return toast(`「${D.HOT_DICE_NAMES[k]}」至少要 2 面`);
      const old = hotDocs('dice').find((x) => x.lv === lv && x.kind === k);
      if (reset) { if (old) await col('hot').remove(old.id); continue; }
      if (old) await col('hot').update(old.id, { faces, at: now() });
      else await col('hot').add({ type: 'dice', lv, kind: k, faces, at: now() });
    }
    closeModal(m); toast(reset ? '換回預設了' : '骰子改好了');
  };
  $('#de-save', m).onclick = () => save(false);
  $('#de-reset', m).onclick = async () => { if (await confirmBox('三顆骰子都換回預設的字？', '換回預設')) save(true); };
}


// 重畫時保留捲動位置（不要跳回第一張／最上面）
function keepScroll(m, fn) {
  const md = m.querySelector('.modal');
  const top = md ? md.scrollTop : 0;
  const rows = $$('.pz-row', m).map((r) => r.scrollLeft);
  const lists = $$('.hl-body, .pb-grid', m).map((r) => r.scrollTop);
  fn();
  const md2 = m.querySelector('.modal'); if (md2) md2.scrollTop = top;
  $$('.pz-row', m).forEach((r, i) => { if (rows[i] != null) r.scrollLeft = rows[i]; });
  $$('.hl-body, .pb-grid', m).forEach((r, i) => { if (lists[i] != null) r.scrollTop = lists[i]; });
}
// 寫入雲端不用等回應（Firestore 本機會先更新），畫面先反應
const fire = (pr) => { Promise.resolve(pr).catch((e) => { console.error(e); toast('沒有存到，等一下再試'); }); };

// ---------- 想試清單 ----------
ACT.hotList = () => {
  let tab = hotNewMatch() ? 'match' : 'mine';
  const m = openModal('', { center: true, cls: 'hot-zone hz-list' });
  const draw = () => {
    const mine = hotWants(me()), matches = hotMatches();
    const done = new Map(hotDocs('done').map((d) => [d.k, d]));
    const seen = +(localStorage.getItem(hotMatchSeenKey()) || 0);
    if (tab === 'match') localStorage.setItem(hotMatchSeenKey(), String(now()));
    const group = (lv, rows) => rows.length ? `<div class="hl-grp">${spiceIc(lv)} ${D.SPICE[lv].label}</div>${rows.join('')}` : '';
    let body;
    if (tab === 'mine') {
      const items = hotItems();
      const row = (x) => `<button class="hl-row ${mine.has(x.k) ? 'on' : ''}" data-k="${esc(x.k)}"><span class="hl-chk">${mine.has(x.k) ? ic('check') : ''}</span><span class="grow">${esc(x.t)}</span>${x.custom && x.by === me() ? `<span class="hl-del" data-del="${x.id}">${ic('trash')}</span>` : ''}</button>`;
      body = `<p class="small muted" style="margin:0 0 6px">偷偷勾你想試的。${esc(nick(partner()))}看不到你勾了什麼，兩個人都勾的才會出現在「我們都想」。</p>
        ${group(2, items.filter((x) => x.lv === 2).map(row))}${group(3, items.filter((x) => x.lv === 3).map(row))}
        <button class="btn ghost block mt" id="hl-add"><i data-ic="plus"></i> 加一個自己想的</button>`;
    } else {
      const row = (x) => { const d = done.get(x.k); return `<div class="hl-row match ${d ? 'done' : ''}"><span class="hl-chk">${ic('heart')}</span><span class="grow">${esc(x.t)}${x.at > seen ? ' <span class="hl-new">新配對</span>' : ''}</span>
        ${d ? `<button class="hl-stamp" data-undone="${d.id}"><b>已解鎖</b><small>${fmtDate(d.at)}</small></button>` : `<button class="btn sm ghost" data-done="${esc(x.k)}">試過了</button>`}</div>`; };
      body = matches.length ? `<p class="small muted" style="margin:0 0 6px">你們兩個都想試的。試過了就蓋一個章。</p>
        ${group(2, matches.filter((x) => x.lv === 2).map(row))}${group(3, matches.filter((x) => x.lv === 3).map(row))}`
        : `<div class="hl-empty">${hotEmblem()}<p>還沒有配對<br><span class="small muted">兩個人都去勾勾看，說不定很有默契</span></p></div>`;
    }
    m.querySelector('.modal').innerHTML = `${mhead('<i data-ic="heart"></i> 想試清單')}
      <div class="seg" id="hl-tab"><button data-t="mine" class="${tab === 'mine' ? 'on' : ''}">我想試</button><button data-t="match" class="${tab === 'match' ? 'on' : ''}">我們都想${tab !== 'match' && hotNewMatch() ? ' ●' : ''}</button></div>
      <div class="hl-body">${body}</div>`;
    $$('#hl-tab button', m).forEach((b) => b.onclick = () => { tab = b.dataset.t; draw(); });
    $$('.hl-row[data-k]', m).forEach((b) => b.onclick = async (e) => {
      const del = e.target.closest('[data-del]');
      if (del) {
        if (!(await confirmBox('刪掉這一項？', '刪掉'))) return;
        const it = hotDocs('item').find((x) => x.id === del.dataset.del);
        if (it) { for (const w of hotDocs('want').filter((w) => w.k === it.k)) fire(col('hot').remove(w.id)); fire(col('hot').remove(it.id)); }
        return setTimeout(() => keepScroll(m, draw), 150);
      }
      b.classList.toggle('on'); $('.hl-chk', b).innerHTML = b.classList.contains('on') ? ic('check') : '';
      hotToggle(b.dataset.k);
      setTimeout(() => keepScroll(m, draw), 150);
    });
    $('#hl-add', m) && ($('#hl-add', m).onclick = async () => { await hotAddItem(); keepScroll(m, draw); });
    $$('[data-done]', m).forEach((b) => b.onclick = () => { b.disabled = true; fire(col('hot').add({ type: 'done', k: b.dataset.done, by: me(), at: now() })); sfx('stamp'); vibrate(30); setTimeout(() => keepScroll(m, draw), 150); });
    $$('[data-undone]', m).forEach((b) => b.onclick = async () => { if (await confirmBox('把「已解鎖」的章拿掉？', '拿掉')) { fire(col('hot').remove(b.dataset.undone)); setTimeout(() => keepScroll(m, draw), 150); } });
  };
  draw();
  m._onClose = hotRedrawHub;
};
function hotToggle(k) {
  const mineDoc = hotDocs('want').find((d) => d.uid === me() && d.k === k);
  if (mineDoc) { fire(col('hot').remove(mineDoc.id)); return; }
  fire(col('hot').add({ type: 'want', uid: me(), k, at: now() }));
  vibrate(10);
  const p = partner();
  if (p && hotDocs('want').some((d) => d.uid === p && d.k === k)) {
    const it = hotItems().find((x) => x.k === k);
    sfx('sparkle'); confetti(60, ['#d9485f', '#e9c27a', '#f7e3d0', '#8a2b4a']);
    toast(`配對成功！你們都想試「${it ? it.t : ''}」`);
  }
}
function hotAddItem() {
  return new Promise((res) => {
    let lv = hotLv();
    const m = openModal(`${mhead('加一個想試的')}
      <input id="ha-t" maxlength="30" placeholder="例如：一起看一部大膽的電影">
      <div class="seg" id="ha-lv" style="margin-top:10px">${[2, 3].map((l) => `<button data-l="${l}" class="${lv === l ? 'on' : ''}">${spiceIc(l)} ${D.SPICE[l].label}</button>`).join('')}</div>
      <p class="small muted" style="margin:0">兩個人都看得到這一項，但不會顯示是誰加的。你加的會自動幫你勾好</p>
      <div class="btn-row"><button class="btn hot-btn" id="ha-ok">加進清單</button></div>`, { center: true, cls: 'hot-zone', onClose: () => res(false) });
    $$('#ha-lv button', m).forEach((b) => b.onclick = () => { lv = +b.dataset.l; $$('#ha-lv button', m).forEach((x) => x.classList.toggle('on', x === b)); });
    setTimeout(() => $('#ha-t', m).focus(), 50);
    $('#ha-ok', m).onclick = async () => {
      const t = $('#ha-t', m).value.trim(); if (!t) return toast('寫一下想試什麼');
      const k = 'c-' + uid8();
      await col('hot').add({ type: 'item', k, t, lv, by: me(), at: now() });
      await col('hot').add({ type: 'want', uid: me(), k, at: now() });
      m._onClose = null; closeModal(m); res(true);
    };
  });
}


// ---------- 計時器（骰子、真心話大冒險、自己設定） ----------
function hotSecs(t) {
  t = String(t || '');
  let m = t.match(/(\d+)\s*分半/); if (m) return +m[1] * 60 + 30;
  m = t.match(/(\d+)\s*分鐘/); if (m) return +m[1] * 60;
  m = t.match(/(\d+)\s*秒/); if (m) return +m[1];
  return 0;
}
const fmtSecs = (n) => `${Math.floor(n / 60)}:${pad(n % 60)}`;
ACT.hotTimer = () => hotTimer(60, '', false);
function hotTimer(secs, label, autostart) {
  let total = secs, left = secs, end = 0, tick = null, lock = null;
  const presets = [30, 60, 90, 120, 180, 240, 300];
  const C = 2 * Math.PI * 88;
  const m = openModal(`${mhead('<i data-ic="hourglass"></i> 計時器')}
    ${label ? `<div class="ht-label">${esc(label)}</div>` : ''}
    <div class="ht-ring"><svg viewBox="0 0 200 200"><circle cx="100" cy="100" r="96" class="ht-o"/><circle cx="100" cy="100" r="88" class="ht-bg"/><circle cx="100" cy="100" r="88" class="ht-fg" id="ht-fg" style="stroke-dasharray:${C};stroke-dashoffset:0"/><circle cx="100" cy="100" r="78" class="ht-o" stroke-dasharray="1.4 3"/></svg>
      <div class="ht-num" id="ht-n">${fmtSecs(left)}</div></div>
    <div class="seg ht-pre" id="ht-pre">${presets.map((x) => `<button data-s="${x}" class="${x === total ? 'on' : ''}">${x < 60 ? x + ' 秒' : x % 60 ? Math.floor(x / 60) + ' 分半' : x / 60 + ' 分'}</button>`).join('')}</div>
    <div class="ht-adj"><button class="btn sm ghost" data-d="-30">− 30 秒</button><button class="btn sm ghost" data-d="30">＋ 30 秒</button></div>
    <div class="btn-row"><button class="btn ghost" id="ht-reset">重設</button><button class="btn hot-btn" id="ht-go">開始</button></div>`, { center: true, cls: 'hot-zone ht-modal' });
  const show = () => {
    $('#ht-n', m).textContent = fmtSecs(Math.max(0, Math.ceil(left)));
    $('#ht-fg', m).style.strokeDashoffset = String(C * (1 - Math.max(0, left) / (total || 1)));
  };
  const relLock = () => { try { lock && lock.release(); } catch (e) {} lock = null; };
  const stop = () => { clearInterval(tick); tick = null; relLock(); $('#ht-go', m).textContent = '開始'; };
  const done = () => {
    stop(); left = 0; show();
    m.querySelector('.modal').classList.add('ht-done');
    $('#ht-n', m).textContent = '時間到';
    sfx('chime'); setTimeout(() => sfx('chime'), 450); vibrate([200, 100, 200]);
  };
  const start = async () => {
    if (left <= 0) left = total;
    m.querySelector('.modal').classList.remove('ht-done');
    end = now() + left * 1000;
    tick = setInterval(() => { left = (end - now()) / 1000; if (left <= 0) done(); else show(); }, 200);
    $('#ht-go', m).textContent = '暫停';
    try { if (navigator.wakeLock) lock = await navigator.wakeLock.request('screen'); } catch (e) {}   // 倒數時螢幕不要暗掉
  };
  const setTotal = (x) => { stop(); total = Math.max(10, Math.min(3600, x)); left = total; m.querySelector('.modal').classList.remove('ht-done'); $$('#ht-pre button', m).forEach((b) => b.classList.toggle('on', +b.dataset.s === total)); show(); };
  $$('#ht-pre button', m).forEach((b) => b.onclick = () => setTotal(+b.dataset.s));
  $$('[data-d]', m).forEach((b) => b.onclick = () => setTotal(total + +b.dataset.d));
  $('#ht-go', m).onclick = () => (tick ? stop() : start());
  $('#ht-reset', m).onclick = () => setTotal(total);
  m._onClose = () => { clearInterval(tick); relLock(); };
  if (autostart) start();
}

// ---------- 今天的姿勢 ----------
const poseKey = (p) => p.no ? 'n' + p.no : p.k;
function hotPoses() {
  const custom = hotDocs('pose-item').map((d) => ({ k: d.k, lv: d.lv || 3, name: d.name, how: d.how || '', tip: d.tip || '', scene: !!d.scene, custom: true, id: d.id, by: d.by }));
  return [...D.HOT_POSES, ...custom];
}
const poseByKey = (k) => hotPoses().find((p) => poseKey(p) === k);
const hotPoseToday = () => hotDocs('pose-day').filter((d) => d.day === dkey()).sort((a, b) => a.at - b.at)[0];
const poseDone = () => new Set(hotDocs('pose-done').map((d) => d.key));
const poseLikes = (key) => hotDocs('pose-like').filter((d) => d.key === key);
// 抽牌機率：每張基本 1；還沒試過 ×1.5；喜歡一個人 +0.8、兩個人都喜歡 +1.6；Round 2 是稀有卡 0.2
// 一次抽到的牌裡，「有人喜歡的」最多佔一半（無條件進位），讓新卡一定有位置
function drawPoses(n, lv, exclude = new Set(), noRare = false) {
  const done = poseDone();
  let pool = hotPoses().filter((p) => (p.lv || 3) <= lv && !exclude.has(poseKey(p)) && !(noRare && p.rare));
  const weight = (p) => {
    if (p.rare) return 0.2;
    let w = 1;
    if (!done.has(poseKey(p))) w *= 1.5;
    return w + 0.8 * poseLikes(poseKey(p)).length;
  };
  const maxLiked = Math.ceil(n / 2);
  const out = [];
  let liked = 0;
  while (out.length < n && pool.length) {
    const cand = liked >= maxLiked ? pool.filter((p) => !poseLikes(poseKey(p)).length) : pool;
    const use = cand.length ? cand : pool;
    const tot = use.reduce((a, p) => a + weight(p), 0);
    let x = Math.random() * tot, chosen = use[use.length - 1];
    for (const p of use) { x -= weight(p); if (x <= 0) { chosen = p; break; } }
    if (poseLikes(poseKey(chosen)).length) liked++;
    out.push(chosen);
    pool = pool.filter((p) => p !== chosen);
  }
  return out;
}
const poseEntry = (p, round = 1) => {
  const e = { key: poseKey(p), r: /【隨機】/.test(p.how) ? pick(['她', '他']) : '', round };
  if (p.script) e.s = { i: Math.floor(Math.random() * D.HOT_SCRIPTS.length), rule: pick(D.HOT_SCRIPT_RULES) };
  return e;
};
function scriptHTML(sc) {
  if (!sc) return '';
  const x = D.HOT_SCRIPTS[sc.i % D.HOT_SCRIPTS.length];
  return `<div class="pc-script"><div><span>情境</span>${esc(x.t)}</div><div><span>她是</span>${esc(x.her)}</div><div><span>他是</span>${esc(x.him)}</div><div><span>規則</span>${esc(sc.rule)}</div></div>`;
}
const poseFill = (t, r) => String(t || '').replace(/【隨機】/g, r || '她或他');
const POSE_MOTIFS = [
  '<path d="M6 -16 A16 16 0 1 0 6 16 A12.5 12.5 0 1 1 6 -16 Z" class="pe-f"/>',
  '<circle cx="-6" cy="0" r="11" class="pe-s"/><circle cx="6" cy="0" r="11" class="pe-s"/>',
  '<path d="M-17 -6 Q-11 -12 -5 -6 T7 -6 T19 -6 M-17 2 Q-11 -4 -5 2 T7 2 T19 2 M-17 10 Q-11 4 -5 10 T7 10 T19 10" class="pe-s"/>',
  '<path d="M0 -18 L4 -4 L18 0 L4 4 L0 18 L-4 4 L-18 0 L-4 -4 Z" class="pe-f"/>',
  '<path d="M0 17 C-8 17 -12 12 -12 6 C-12 -1 -5 -4 -5 -12 C0 -9 1 -5 1 -2 C3 -4 4 -7 4 -10 C10 -6 12 0 12 6 C12 12 8 17 0 17 Z" class="pe-f"/>',
  '<path d="M0 15 C-14 5 -17 -3 -14 -9 C-11 -15 -3 -14 0 -7 C3 -14 11 -15 14 -9 C17 -3 14 5 0 15 Z" class="pe-s"/>',
  '<path d="M0 0 C0 -3 4 -3 4 0 C4 5 -4 6 -6 0 C-8 -8 4 -11 9 -4 C14 4 4 13 -4 11 C-14 8 -15 -6 -6 -13" class="pe-s"/>',
  '<path d="M0 0 C-5 -8 -16 -8 -16 0 C-16 8 -5 8 0 0 C5 -8 16 -8 16 0 C16 8 5 8 0 0 Z" class="pe-s"/>',
  '<path d="M0 0 C-4 -6 -4 -14 0 -18 C4 -14 4 -6 0 0 C6 -4 14 -4 18 0 C14 4 6 4 0 0 C4 6 4 14 0 18 C-4 14 -4 6 0 0 C-6 4 -14 4 -18 0 C-14 -4 -6 -4 0 0 Z" class="pe-f"/>',
  '<path d="M-3 -15 A15 15 0 0 0 -3 15 A11 11 0 0 1 -3 -15 Z M3 -15 A15 15 0 0 1 3 15 A11 11 0 0 0 3 -15 Z" class="pe-f"/>',
  '<circle cx="0" cy="-8" r="7" class="pe-s"/><path d="M0 -1 V17 M0 9 H6 M0 14 H5" class="pe-s"/>',
  '<circle r="7" class="pe-f"/><path d="M0 -17 V-11 M0 11 V17 M-17 0 H-11 M11 0 H17 M-12 -12 L-8 -8 M8 8 L12 12 M12 -12 L8 -8 M-8 8 L-12 12" class="pe-s"/>',
];
function poseEmblem(p) {
  const n = p.no || (hash(p.k || p.name) % 97);
  const lv3 = (p.lv || 3) >= 3;
  let dots = ''; const cnt = lv3 ? 12 : 8;
  for (let i = 0; i < cnt; i++) { const a = i * 2 * Math.PI / cnt; dots += `<circle cx="${(Math.sin(a) * 33).toFixed(1)}" cy="${(-Math.cos(a) * 33).toFixed(1)}" r="${i % 2 ? 1 : 1.6}" class="pe-d"/>`; }
  return `<svg class="pose-em ${lv3 ? 'lv3' : 'lv2'}" viewBox="-40 -40 80 80" aria-hidden="true"><circle r="38" class="pe-bg"/><circle r="38" class="pe-r" stroke-width="1.4"/><circle r="29" class="pe-r" stroke-width=".7" stroke-dasharray="1.2 2.4"/>${dots}
    <g transform="scale(.95)">${POSE_MOTIFS[n % POSE_MOTIFS.length]}</g></svg>`;
}
const flames = (lv) => (lv >= 3 ? spiceIc(3) + spiceIc(3) : spiceIc(2));
function poseCardHTML(p, { order = 0, r = '', done = false, small = false, sc = null } = {}) {
  const liked = poseLikes(poseKey(p)).some((d) => d.uid === me());
  const no = p.no ? `No.${pad(p.no)}` : '自訂';
  return `<div class="pcard ${small ? 'sm' : ''}" data-key="${esc(poseKey(p))}"><div class="pc-in">
    <div class="pc-face pc-front">${order ? `<div class="pc-order">第 ${order} 張</div>` : ''}<div class="pc-no">${no}</div>
      <button class="pc-like ${liked ? 'on' : ''}" data-like="${esc(poseKey(p))}" aria-label="喜歡">${ic('heart')}</button>${p.rare ? '<div class="pc-rare">稀有</div>' : ''}
      <div class="pc-em">${poseEmblem(p)}</div><div class="pc-name">${esc(p.name)}</div>
      <div class="pc-lv">${flames(p.lv || 3)}${p.scene ? '<span class="pc-scene">場景</span>' : ''}</div>
      ${done ? '<div class="pc-stamp"><b>已解鎖</b></div>' : ''}<div class="pc-hint">點一下看說明</div></div>
    <div class="pc-face pc-back"><div class="pc-no">${no} · ${esc(p.name)}</div>
      <div class="pc-how">${esc(poseFill(p.how, r))}</div>
      ${scriptHTML(sc)}
      ${p.tip && !sc ? `<div class="pc-tip"><span>小訣竅</span>${esc(poseFill(p.tip, r))}</div>` : ''}
      ${r && /【隨機】/.test(p.how) ? `<div class="pc-r">這次抽到：<b>${esc(r)}</b></div>` : ''}<div class="pc-hint">點一下翻回去</div></div>
  </div></div>`;
}
function wireFlip(root, redraw) {
  $$('.pcard', root).forEach((c) => c.onclick = (e) => { if (e.target.closest('button')) return; c.classList.toggle('flipped'); sfx('pop'); });
  $$('[data-like]', root).forEach((b) => b.onclick = async () => {
    const mine = poseLikes(b.dataset.like).find((d) => d.uid === me());
    if (mine) fire(col('hot').remove(mine.id));
    else { fire(col('hot').add({ type: 'pose-like', key: b.dataset.like, uid: me(), at: now() })); sfx('heart'); vibrate(10); toast('喜歡！之後比較容易抽到'); }
    b.classList.toggle('on', !mine);
  });
}

ACT.hotPose = () => {
  const m = openModal('', { center: true, cls: 'hot-zone hz-pose' });
  let deal = false;
  const draw = () => {
    const day = hotPoseToday(), done = poseDone();
    let body;
    if (!day) {
      body = `<div class="pz-intro">${hotEmblem()}<p>今天還沒抽<br><span class="small muted">每天 5 張，照順序來，試過的就按「試過了」。抽到的牌兩個人看到的都一樣，今天不能重抽</span></p>
        <div class="seg hz-lv" id="pz-lv">${[2, 3].map((l) => `<button data-l="${l}" class="${hotLv() === l ? 'on' : ''}">${spiceIc(l)} ${D.SPICE[l].label}</button>`).join('')}</div>
        <p class="small muted" style="margin:0">曖昧只抽曖昧的牌；火辣兩種都會抽到</p>
        <button class="btn block hot-btn" id="pz-go">抽今天的姿勢</button></div>`;
    } else {
      const all = day.cards.map((c, i) => ({ c, i, p: poseByKey(c.key) })).filter((x) => x.p);
      const has2 = all.some((x) => (x.c.round || 1) === 2);
      const rare = all.find((x) => x.p.rare && (x.c.round || 1) === 1);
      const row = (round) => {
        const cards = all.filter((x) => (x.c.round || 1) === round);
        return `<div class="pz-count">${round === 2 ? '<span class="pz-r2">Round 2</span> · ' : ''}照順序來，試過的就按「試過了」</div>
        <div class="pz-row ${deal === round ? 'deal' : ''}">${cards.map(({ c, i, p }, j) => `<div class="pz-slot" style="--i:${j}">${poseCardHTML(p, { order: j + 1, r: c.r, sc: c.s, done: (day.doneKeys || []).includes(poseKey(p)) })}
          <div class="pz-btns">${p.scene ? `<button class="btn sm ghost" data-swap="${i}">換一張</button>` : ''}${p.rare && round === 1 && !has2 ? `<button class="btn sm gold" id="pz-r2">開始 Round 2</button>` : ''}${c.s ? `<button class="btn sm gold" data-script="${i}">看完整劇本</button>` : ''}${p.pick ? `<button class="btn sm gold" data-pick="${i}">${esc(p.no === 64 ? '她' : p.no === 66 ? '他' : (c.r || ''))}從圖鑑挑一張</button>` : ''}${p.rare || p.pick || (day.doneKeys || []).includes(poseKey(p)) ? '' : `<button class="btn sm hot-btn" data-done="${i}">試過了</button>`}</div></div>`).join('')}</div>`;
      };
      body = row(1) + (has2 ? row(2) : '') + (all.length > 1 ? '<p class="small muted center" style="margin:6px 0 0">左右滑動看每一張</p>' : '');
    }
    m.querySelector('.modal').innerHTML = `${mhead('<i data-ic="star"></i> 今天的姿勢')}${body}
      <div class="center hz-links"><button class="link" data-act="hotPoseBook"><i data-ic="book"></i> 姿勢圖鑑</button><button class="link" id="pz-add"><i data-ic="plus"></i> 自己加一張</button></div>`;
    deal = false;
    wireFlip(m);
    $$('[data-script]', m).forEach((b) => b.onclick = () => { const c = hotPoseToday().cards[+b.dataset.script]; scriptModal(c.s, null); });
    $$('[data-pick]', m).forEach((b) => b.onclick = () => hotPosePicker(+b.dataset.pick, () => keepScroll(m, draw)));
    $('#pz-r2', m) && ($('#pz-r2', m).onclick = async () => {
      const day = hotPoseToday();
      if (day.cards.some((c) => (c.round || 1) === 2)) return draw();
      const n = 5;
      const add = drawPoses(n, day.lv || 3, new Set(day.cards.map((c) => c.key)), true).map((p) => poseEntry(p, 2));
      await col('hot').update(day.id, { cards: [...day.cards, ...add] });
      sfx('sparkle'); confetti(70, ['#e9c27a', '#d9485f', '#fff4e6']); deal = 2; draw();
    });
    $$('#pz-lv button', m).forEach((b) => b.onclick = () => { localStorage.setItem('park-hot-lv', b.dataset.l); $$('#pz-lv button', m).forEach((x) => x.classList.toggle('on', x === b)); });
    $('#pz-go', m) && ($('#pz-go', m).onclick = async () => {
      if (hotPoseToday()) return draw();
      const lv = hotLv(), n = 5;
      const cards = drawPoses(n, lv).map((p) => poseEntry(p, 1));
      $('#pz-go', m).disabled = true; vibrate([20, 40, 20]); sfx('sparkle');
      await col('hot').add({ type: 'pose-day', day: dkey(), lv, cards, doneKeys: [], by: me(), at: now() });
      deal = 1; draw();
    });
    $$('[data-swap]', m).forEach((b) => b.onclick = async () => {
      const day = hotPoseToday(), i = +b.dataset.swap;
      const used = new Set(day.cards.map((c) => c.key));
      const cand = hotPoses().filter((p) => !p.scene && !p.rare && (p.lv || 3) <= (day.lv || 3) && !used.has(poseKey(p)));
      if (!cand.length) return toast('沒有可以換的牌了');
      const p = pick(cand);
      const cards = day.cards.map((c, j) => (j === i ? poseEntry(p, c.round || 1) : c));
      fire(col('hot').update(day.id, { cards })); sfx('pop'); toast(`換成「${p.name}」`); setTimeout(() => keepScroll(m, draw), 150);
    });
    $$('[data-done]', m).forEach((b) => b.onclick = () => {
      const day = hotPoseToday(), c = day.cards[+b.dataset.done];
      const front = b.closest('.pz-slot').querySelector('.pc-front');
      if (front && !front.querySelector('.pc-stamp')) front.insertAdjacentHTML('beforeend', '<div class="pc-stamp"><b>已解鎖</b></div>');
      b.remove();
      fire(col('hot').update(day.id, { doneKeys: [...new Set([...(day.doneKeys || []), c.key])] }));
      if (!poseDone().has(c.key)) fire(col('hot').add({ type: 'pose-done', key: c.key, at: now() }));
      sfx('stamp'); vibrate(30);
    });
    $('#pz-add', m).onclick = () => hotPoseEditor();
  };
  draw();
  m._redraw = draw;
};

// 姿勢圖鑑：試過的才會亮，沒試過的是問號徽章（不顯示總數）
ACT.hotPoseBook = () => {
  const done = poseDone();
  const all = hotPoses();
  const cell = (p) => done.has(poseKey(p))
    ? `<button class="pb-cell on" data-key="${esc(poseKey(p))}"><span class="pb-em">${poseEmblem(p)}</span><small>${p.no ? 'No.' + pad(p.no) : '自訂'}</small><b>${esc(p.name)}</b></button>`
    : `<div class="pb-cell"><span class="pb-em pb-q"><svg viewBox="-40 -40 80 80"><circle r="38" class="pe-bg"/><circle r="38" class="pe-r" stroke-width="1.2" stroke-dasharray="2 3"/><text y="10" text-anchor="middle">?</text></svg></span><small>${p.no ? 'No.' + pad(p.no) : '自訂'}</small><b>？？？</b></div>`;
  const m = openModal(`${mhead('<i data-ic="book"></i> 姿勢圖鑑')}
    <p class="small muted" style="margin:0 0 8px">抽到並按「試過了」的姿勢，會在這裡亮起來</p>
    <div class="pb-grid">${all.filter((p) => !p.custom).map(cell).join('')}</div>
    ${all.some((p) => p.custom) ? `<div class="hl-grp">我們加的</div><div class="pb-grid">${all.filter((p) => p.custom).map((p) => `<button class="pb-cell on" data-key="${esc(poseKey(p))}"><span class="pb-em">${poseEmblem(p)}</span><small>自訂</small><b>${esc(p.name)}</b></button>`).join('')}</div>` : ''}`,
    { center: true, cls: 'hot-zone hz-book' });
  $$('.pb-cell.on', m).forEach((b) => b.onclick = () => {
    const p = poseByKey(b.dataset.key);
    const v = openModal(`${mhead(esc(p.name))}<div class="pz-one">${poseCardHTML(p, { done: done.has(poseKey(p)) })}</div>
      ${p.custom && p.by === me() ? '<div class="center"><button class="link" id="pv-del">刪掉這張</button></div>' : ''}`, { center: true, cls: 'hot-zone' });
    wireFlip(v);
    $('#pv-del', v) && ($('#pv-del', v).onclick = async () => { if (await confirmBox('刪掉這張自己加的卡？', '刪掉')) { await col('hot').remove(p.id); closeModal(v); closeModal(m); } });
  });
};
function hotPoseEditor() {
  let lv = hotLv(), scene = false;
  const m = openModal(`${mhead('自己加一張')}
    <label>名稱</label><input id="pe-n" maxlength="12" placeholder="例如：窗邊">
    <div class="seg" id="pe-lv" style="margin-top:10px">${[2, 3].map((l) => `<button data-l="${l}" class="${lv === l ? 'on' : ''}">${spiceIc(l)} ${D.SPICE[l].label}</button>`).join('')}</div>
    <label>怎麼做（寫清楚她和他各自的位置）</label><textarea id="pe-h" rows="3" maxlength="80"></textarea>
    <label>小訣竅（可以不寫）</label><input id="pe-t" maxlength="40">
    <div class="toggle" style="margin-top:10px"><label class="switch"><input type="checkbox" id="pe-s"><span></span></label><span class="small">場景限定（抽到可以換一張）</span></div>
    <div class="btn-row"><button class="btn hot-btn" id="pe-ok">加進牌組</button></div>`, { center: true, cls: 'hot-zone' });
  $$('#pe-lv button', m).forEach((b) => b.onclick = () => { lv = +b.dataset.l; $$('#pe-lv button', m).forEach((x) => x.classList.toggle('on', x === b)); });
  $('#pe-s', m).onchange = (e) => { scene = e.target.checked; };
  $('#pe-ok', m).onclick = async () => {
    const name = $('#pe-n', m).value.trim(), how = $('#pe-h', m).value.trim();
    if (!name || !how) return toast('名稱和怎麼做都要寫');
    await col('hot').add({ type: 'pose-item', k: 'p-' + uid8(), name, lv, how, tip: $('#pe-t', m).value.trim(), scene, by: me(), at: now() });
    closeModal(m); toast('加進牌組了，之後抽得到');
  };
}

// 主導權、她的指定、他的指定：從整副牌挑一張，換掉這張
function hotPosePicker(idx, done) {
  const day = hotPoseToday(); if (!day) return;
  const used = new Set(day.cards.map((c) => c.key));
  const list2 = hotPoses().filter((p) => !p.rare && !p.pick && !used.has(poseKey(p)) && (p.lv || 3) <= (day.lv || 3));
  const m = openModal(`${mhead('<i data-ic="book"></i> 挑一張')}
    <p class="small muted" style="margin:0 0 8px">點一張看說明，確定了就換上去</p>
    <div class="pb-grid">${list2.map((p) => `<button class="pb-cell on" data-key="${esc(poseKey(p))}"><span class="pb-em">${poseEmblem(p)}</span><small>${p.no ? 'No.' + pad(p.no) : '自訂'}</small><b>${esc(p.name)}</b></button>`).join('')}</div>`,
    { center: true, cls: 'hot-zone hz-book' });
  $$('.pb-cell', m).forEach((b) => b.onclick = () => {
    const p = poseByKey(b.dataset.key);
    const v = openModal(`${mhead(esc(p.name))}<div class="pz-one">${poseCardHTML(p, {})}</div>
      <div class="btn-row"><button class="btn ghost" data-act="close">再看看</button><button class="btn hot-btn" id="pk-ok">就這張</button></div>`, { center: true, cls: 'hot-zone' });
    v.querySelector('.pcard').classList.add('flipped');
    wireFlip(v);
    $('#pk-ok', v).onclick = async () => {
      const d = hotPoseToday();
      const cards = d.cards.map((c, j) => (j === idx ? poseEntry(p, c.round || 1) : c));
      fire(col('hot').update(d.id, { cards }));
      closeModal(v); closeModal(m); sfx('chime'); toast(`換成「${p.name}」`); setTimeout(() => done && done(), 150);
    };
  });
}


// ============================================================
//  今晚的暗號：首頁右上角的小月亮（兩人都火辣才出現），有暗號時會亮
// ============================================================
const sigToday = () => hotDocs('signal').filter((d) => d.day === dkey());
const sigIn = () => sigToday().filter((d) => d.to === me()).sort((a, b) => b.at - a.at)[0];
const sigOut = () => sigToday().filter((d) => d.from === me()).sort((a, b) => b.at - a.at)[0];
function hotMoonLit() {
  const i = sigIn(), o = sigOut();
  return (i && i.status === 'pending') || (o && o.status !== 'pending' && !o.seen);
}
function hotMoonHTML() {
  if (!hotOn() || S.tab !== 'home' || (S.couple.members || []).length < (trialOpen() ? 1 : 2)) return '';   // 測試期間一個人也看得到
  return `<button class="icon-btn hot-moon ${hotMoonLit() || hotTeaseNew() ? 'lit' : ''}" data-act="hotMoon" aria-label="月亮"><svg viewBox="0 0 24 24" class="ic"><path d="M15 3.5 A8.5 8.5 0 1 0 20.5 15 A6.8 6.8 0 0 1 15 3.5 Z" fill="currentColor" stroke="none"/><path d="M19 4 l.6 1.4 l1.4 .6 l-1.4 .6 l-.6 1.4 l-.6 -1.4 l-1.4 -.6 l1.4 -.6 z" fill="currentColor"/></svg></button>`;
}
// 撩撥任務有新的（對方派給你、或對方說做了等你驗收）也讓小月亮亮
function hotTeaseNew() { const f = teaseForMe(), b = teaseBy(); return !!((f && f.status === 'sent') || (b && b.status === 'done')); }
// 首頁的月亮：撩撥有新的、暗號沒有，就直接開撩撥任務；其他時候開暗號
ACT.hotMoon = async () => {
  if (hotTeaseNew() && !hotMoonLit()) {
    if (!hotOn()) return;
    if (now() >= hotUntil) {
      if (!S.couple.hot?.pin) { if (!(await hotSetPin())) return; }
      else if (!(await pinPad({ title: '輸入密碼', sub: '只有我們兩個知道', check: hotCheck }))) return;
      hotUntil = now() + HOT_UNLOCK_MS;
    }
    return ACT.hotTease();
  }
  return ACT.hotSignal();
};
// 從首頁按月亮也要先解鎖
ACT.hotSignal = async () => {
  if (!hotOn()) return;
  if (now() >= hotUntil) {
    if (!S.couple.hot?.pin) { if (!(await hotSetPin())) return; }
    else if (!(await pinPad({ title: '輸入密碼', sub: '只有我們兩個知道', check: hotCheck }))) return;
    hotUntil = now() + HOT_UNLOCK_MS;
  }
  hotSignalModal();
};
function hotSignalModal() {
  const m = openModal('', { center: true, cls: 'hot-zone hz-sig' });
  const p = partner() || (trialOpen() ? me() : null);   // 測試期間：自己派給自己、自己回自己
  const draw = () => {
    const i = sigIn(), o = sigOut();
    let body = '';
    if (i) {
      body += `<div class="sig-card in"><div class="sig-h">${esc(nick(i.from))} 傳來的暗號</div>
        <div class="sig-big">今晚？</div>
        <div class="sig-meta">${i.time ? `<span>${esc(i.time)}</span>` : ''}${i.lv ? `<span>${spiceIc(i.lv)} ${D.SPICE[i.lv].label}</span>` : ''}</div>
        ${i.msg ? `<div class="sig-msg">「${esc(i.msg)}」</div>` : ''}
        ${i.status === 'pending' ? `<input id="sg-r" maxlength="40" placeholder="回一句話（可以不寫）">
          <div class="btn-row"><button class="btn ghost" data-ans="no">改天</button><button class="btn hot-btn" data-ans="yes">好</button></div>`
        : `<div class="sig-ans ${i.status}">你回了：${i.status === 'yes' ? '好' : '改天'}${i.reply ? `「${esc(i.reply)}」` : ''}</div>`}</div>`;
    }
    if (o) {
      if (o.status !== 'pending' && !o.seen) fire(col('hot').update(o.id, { seen: true }));
      body += `<div class="sig-card out"><div class="sig-h">你傳給 ${esc(nick(o.to))} 的暗號</div>
        <div class="sig-meta">${o.time ? `<span>${esc(o.time)}</span>` : ''}${o.lv ? `<span>${spiceIc(o.lv)} ${D.SPICE[o.lv].label}</span>` : ''}</div>
        ${o.msg ? `<div class="sig-msg">「${esc(o.msg)}」</div>` : ''}
        <div class="sig-ans ${o.status}">${o.status === 'pending' ? '還沒回⋯⋯' : `${esc(nick(o.to))}：${o.status === 'yes' ? '好' : '改天'}${o.reply ? `「${esc(o.reply)}」` : ''}`}</div></div>`;
    }
    if (!o) {
      let lv = hotLv();
      body += `<div class="sig-card new"><div class="sig-h">傳一個暗號給 ${esc(nick(p))}</div>
        <div class="sig-big">今晚？</div>
        <label>幾點</label><div class="seg" id="sg-t">${['不說', '9 點', '10 點', '11 點', '12 點'].map((t, k) => `<button data-t="${k ? t : ''}" class="${k === 0 ? 'on' : ''}">${t}</button>`).join('')}</div>
        <label>熱度</label><div class="seg" id="sg-lv">${[2, 3].map((l) => `<button data-l="${l}" class="${lv === l ? 'on' : ''}">${spiceIc(l)} ${D.SPICE[l].label}</button>`).join('')}</div>
        <label>一句悄悄話（可以不寫）</label><input id="sg-m" maxlength="40" placeholder="例如：今天想你一整天">
        <button class="btn block hot-btn mt" id="sg-go">送出暗號</button>
        <p class="small muted center" style="margin:8px 0 0">對方首頁的小月亮會亮起來，別人看不懂</p></div>`;
    }
    m.querySelector('.modal').innerHTML = `${mhead('<i data-ic="moon"></i> 今晚的暗號')}${body}`;
    let time = '', lvv = hotLv();
    $$('#sg-t button', m).forEach((b) => b.onclick = () => { time = b.dataset.t; $$('#sg-t button', m).forEach((x) => x.classList.toggle('on', x === b)); });
    $$('#sg-lv button', m).forEach((b) => b.onclick = () => { lvv = +b.dataset.l; $$('#sg-lv button', m).forEach((x) => x.classList.toggle('on', x === b)); });
    $('#sg-go', m) && ($('#sg-go', m).onclick = () => {
      fire(col('hot').add({ type: 'signal', day: dkey(), from: me(), to: p, time, lv: lvv, msg: $('#sg-m', m).value.trim(), status: 'pending', at: now() }));
      sfx('chime'); vibrate([20, 40, 20]); toast('暗號送出去了'); setTimeout(draw, 150);
    });
    $$('[data-ans]', m).forEach((b) => b.onclick = () => {
      const i = sigIn();
      fire(col('hot').update(i.id, { status: b.dataset.ans, reply: ($('#sg-r', m)?.value || '').trim(), repliedAt: now() }));
      sfx(b.dataset.ans === 'yes' ? 'sparkle' : 'pop'); if (b.dataset.ans === 'yes') confetti(50, ['#e9c27a', '#d9485f', '#fff4e6']);
      setTimeout(draw, 150);
    });
  };
  draw();
  m._onClose = () => { render(); hotRedrawHub(); };   // 關掉後大廳的「!」也要跟著更新
}

// ============================================================
//  白天撩撥任務＋火辣印章＋火辣票夾
// ============================================================
const teaseToday = () => hotDocs('tease').filter((d) => d.day === dkey());
const teaseForMe = () => teaseToday().find((d) => d.to === me());
const teaseBy = () => teaseToday().find((d) => d.from === me());
const hotStamps = (uid) => hotDocs('stamp').filter((d) => d.uid === uid && !d.used);
function hotTeaseBadge() { const f = teaseForMe(), b = teaseBy(); return (f && f.status === 'sent') || (b && b.status === 'done') || !b; }
ACT.hotTease = () => {
  const m = openModal('', { center: true, cls: 'hot-zone hz-tease' });
  const p = partner() || (trialOpen() ? me() : null);   // 測試期間：自己派給自己、自己回自己
  let pickT = pick(D.HOT_TEASE), rerolls = 2;
  const draw = () => {
    const f = teaseForMe(), b = teaseBy();
    const mine = f ? `<div class="tz-card"><div class="sig-h">${esc(nick(f.from))} 派給你的</div><div class="tz-t">${esc(f.text)}</div>
        ${f.status === 'sent' ? '<button class="btn block hot-btn" id="tz-did">我做了</button><p class="small muted center" style="margin:6px 0 0">晚上等對方驗收，通過就蓋一個火辣印章</p>'
        : f.status === 'done' ? `<div class="sig-ans pending">等 ${esc(nick(f.from))} 驗收⋯⋯</div>` : `<div class="tz-ok">${hotStampSVG()}<span>驗收通過，蓋章了</span></div>`}</div>`
      : `<div class="tz-card dim"><div class="sig-h">今天 ${esc(nick(p))} 還沒派任務給你</div></div>`;
    const theirs = b ? `<div class="tz-card"><div class="sig-h">你派給 ${esc(nick(p))} 的</div><div class="tz-t">${esc(b.text)}</div>
        ${b.status === 'checked' ? `<div class="tz-ok">${hotStampSVG()}<span>已經驗收</span></div>`
        : `<button class="btn block ${b.status === 'done' ? 'hot-btn' : 'ghost'}" id="tz-check">${b.status === 'done' ? `${esc(nick(p))} 說做了，驗收通過` : '他做到了，驗收通過'}</button>`}</div>`
      : `<div class="tz-card new"><div class="sig-h">派一張給 ${esc(nick(p))}</div><div class="tz-t" id="tz-pick">${esc(pickT)}</div>
        <div class="btn-row"><button class="btn ghost" id="tz-re" ${rerolls ? '' : 'disabled'}>換一張${rerolls ? `（還可以換 ${rerolls} 次）` : ''}</button><button class="btn hot-btn" id="tz-send">就派這張</button></div></div>`;
    keepScroll(m, () => {
      m.querySelector('.modal').innerHTML = `${mhead('<i data-ic="letter"></i> 撩撥任務')}<p class="small muted" style="margin:0 0 8px">早上互相派一張，白天偷偷做，晚上派的人驗收。做到的人蓋一個火辣印章</p>${mine}${theirs}
        <div class="center hz-links"><button class="link" data-act="hotWallet"><i data-ic="stamp"></i> 火辣票夾（印章 ${hotStamps(me()).length} 個）</button></div>`;
    });
    $('#tz-re', m) && ($('#tz-re', m).onclick = () => { if (!rerolls) return; rerolls--; let n = pickT; while (n === pickT) n = pick(D.HOT_TEASE); pickT = n; sfx('pop'); draw(); });
    $('#tz-send', m) && ($('#tz-send', m).onclick = () => { fire(col('hot').add({ type: 'tease', day: dkey(), from: me(), to: p, text: pickT, status: 'sent', at: now() })); sfx('chime'); toast('派出去了'); setTimeout(draw, 150); });
    $('#tz-did', m) && ($('#tz-did', m).onclick = () => { fire(col('hot').update(teaseForMe().id, { status: 'done', doneAt: now() })); sfx('pop'); setTimeout(draw, 150); });
    $('#tz-check', m) && ($('#tz-check', m).onclick = () => {
      const t = teaseBy();
      fire(col('hot').update(t.id, { status: 'checked', checkedAt: now() }));
      fire(col('hot').add({ type: 'stamp', uid: t.to, why: t.text, used: false, at: now() }));
      sfx('stamp'); vibrate(30); toast(`幫 ${nick(t.to)} 蓋了一個火辣印章`); setTimeout(draw, 150);
    });
  };
  draw();
  m._onClose = () => { hotRedrawHub(); render(); };   // 首頁小月亮也要跟著更新
};
const hotStampSVG = () => `<svg class="hstamp" viewBox="-30 -30 60 60" aria-hidden="true"><circle r="27" class="hs-r"/><circle r="22" class="hs-r2" stroke-dasharray="1.2 2.2"/><g transform="translate(-14.5 -16) scale(1.2)"><path d="M12 21 C8 21 6 18.5 6 15.5 C6 12 9 10.5 9 7 C11.5 8.5 12 10.5 11.8 12.2 C13 11.4 13.6 10 13.6 8.5 C16.5 10.5 18 13 18 15.5 C18 18.5 16 21 12 21 Z" class="hs-f"/></g></svg>`;

ACT.hotWallet = () => {
  const m = openModal('', { center: true, cls: 'hot-zone hz-wallet' });
  const draw = () => {
    const st = hotStamps(me());
    const tix = hotDocs('hticket').filter((d) => d.uid === me() && !d.used);
    const vouchers = hotDocs('voucher').filter((d) => d.uid === me() && d.status !== 'redeemed').sort((a, b) => b.at - a.at);
    const toMe = hotDocs('voucher').filter((d) => d.uid !== me() && d.status === 'asked');
    const used = hotDocs('voucher').filter((d) => d.status === 'redeemed').sort((a, b) => b.at - a.at).slice(0, 6);
    const filled = Math.min(st.length, D.HOT_STAMP.lottery);
    const slots = Array.from({ length: D.HOT_STAMP.lottery }, (_, i) => `<span class="hw-slot ${i < filled ? 'on' : ''}">${i < filled ? hotStampSVG() : ''}</span>`).join('');
    const tName = (k) => (k === 'wish' ? '許願券' : '抽獎券');
    keepScroll(m, () => { m.querySelector('.modal').innerHTML = `${mhead('<i data-ic="stamp"></i> 火辣票夾')}
      <div class="hw-sec"><div class="hl-grp">火辣印章 · ${st.length} 個</div><div class="hw-slots">${slots}</div>
        <div class="btn-row"><button class="btn ${st.length >= D.HOT_STAMP.lottery ? 'hot-btn' : 'ghost'}" id="hw-l" ${st.length >= D.HOT_STAMP.lottery ? '' : 'disabled'}>用 ${D.HOT_STAMP.lottery} 個抽獎</button><button class="btn ${st.length >= D.HOT_STAMP.wish ? 'gold' : 'ghost'}" id="hw-w" ${st.length >= D.HOT_STAMP.wish ? '' : 'disabled'}>用 ${D.HOT_STAMP.wish} 個許願</button></div>
        <p class="small muted" style="margin:4px 0 0">撩撥任務被驗收通過就會拿到印章。集滿 ${D.HOT_STAMP.lottery} 個可以抽火辣獎，${D.HOT_STAMP.wish} 個可以從想試清單許一個願</p></div>
      ${tix.length ? `<div class="hw-sec"><div class="hl-grp">我的券</div>${tix.map((t) => `<div class="hw-row"><span class="hw-tk ${t.kind}">${tName(t.kind)}</span><span class="grow small muted">${t.kind === 'wish' ? '從想試清單挑一項，要對方兌現' : '抽一個火辣小獎'}</span><button class="btn sm hot-btn" data-use="${t.id}">${t.kind === 'wish' ? '挑一項' : '抽獎'}</button></div>`).join('')}</div>` : ''}
      ${toMe.length ? `<div class="hw-sec"><div class="hl-grp">${esc(nick(partner()))} 要兌現的</div>${toMe.map((v) => `<div class="hw-row"><span class="grow"><b>${esc(v.title)}</b><br><span class="small muted">${esc(v.desc || '')}</span></span><button class="btn sm hot-btn" data-ok="${v.id}">兌現了</button></div>`).join('')}</div>` : ''}
      <div class="hw-sec"><div class="hl-grp">我的火辣獎勵</div>${vouchers.length ? vouchers.map((v) => `<div class="hw-row"><span class="hw-tk ${v.kind}">${v.kind === 'wish' ? '許願' : v.rare ? '★ 稀有' : '獎'}</span><span class="grow"><b>${esc(v.title)}</b><br><span class="small muted">${esc(v.desc || '')}</span></span>${v.status === 'asked' ? '<span class="small muted">等對方兌現</span>' : `<button class="btn sm ghost" data-ask="${v.id}">要兌現</button>`}</div>`).join('') : '<p class="small muted" style="margin:4px 0">還沒有，先去做撩撥任務吧</p>'}</div>
      ${used.length ? `<div class="hw-sec"><div class="hl-grp">兌現過的</div>${used.map((v) => `<div class="hw-row done"><span class="grow small">${esc(v.title)} · ${esc(nick(v.uid))}</span><span class="small muted">${fmtDate(v.redeemedAt || v.at)}</span></div>`).join('')}</div>` : ''}`; });
    const spend = (n) => { hotStamps(me()).sort((a, b) => a.at - b.at).slice(0, n).forEach((d) => fire(col('hot').update(d.id, { used: true }))); };
    $('#hw-l', m).onclick = () => { if (hotStamps(me()).length < D.HOT_STAMP.lottery) return; spend(D.HOT_STAMP.lottery); hotLottery(null, () => setTimeout(draw, 150)); };
    $('#hw-w', m).onclick = () => { if (hotStamps(me()).length < D.HOT_STAMP.wish) return; hotWishPick(null, () => setTimeout(draw, 150), () => spend(D.HOT_STAMP.wish)); };
    $$('[data-use]', m).forEach((b) => b.onclick = () => {
      const t = hotDocs('hticket').find((x) => x.id === b.dataset.use); if (!t) return;
      if (t.kind === 'lottery') hotLottery(t, () => setTimeout(draw, 150));
      else hotWishPick(t, () => setTimeout(draw, 150));
    });
    $$('[data-ask]', m).forEach((b) => b.onclick = () => { fire(col('hot').update(b.dataset.ask, { status: 'asked', askedAt: now() })); sfx('pop'); toast('跟對方說要兌現了'); setTimeout(draw, 150); });
    $$('[data-ok]', m).forEach((b) => b.onclick = () => { fire(col('hot').update(b.dataset.ok, { status: 'redeemed', redeemedAt: now() })); sfx('stamp'); setTimeout(draw, 150); });
  };
  draw();
  m._onClose = hotRedrawHub;
};
function hotLottery(t, done) {
  const role = prof(me()).role === 'him' ? 'him' : 'her';
  const pool = D.HOT_REWARDS.filter((r) => r.who === 'both' || r.who === role);
  const tot = pool.reduce((a, r) => a + r.w, 0);
  let x = Math.random() * tot, r = pool[0];
  for (const y of pool) { x -= y.w; if (x <= 0) { r = y; break; } }
  const m = openModal(`${mhead('火辣抽獎')}<div class="lt-box"><div class="lt-em">${hotEmblem()}</div><div class="lt-t" id="lt-t">⋯⋯</div><div class="lt-d small muted" id="lt-d"></div></div>
    <div class="btn-row"><button class="btn hot-btn" data-act="close">收進火辣票夾</button></div>`, { center: true, cls: 'hot-zone' });
  if (t) fire(col('hot').update(t.id, { used: true }));
  fire(col('hot').add({ type: 'voucher', uid: me(), kind: 'lottery', title: r.t, desc: r.d, rare: !!r.rare, status: 'new', at: now() }));
  (async () => { const el = $('#lt-t', m); for (let i = 0; i < 14; i++) { el.textContent = pick(pool).t; await sleep(60 + i * 12); } el.textContent = r.t; $('#lt-d', m).textContent = (r.rare ? '★ 稀有 · ' : '') + r.d; sfx('sparkle'); confetti(70, ['#e9c27a', '#d9485f', '#fff4e6']); vibrate([30, 40, 80]); })();
  m._onClose = done;
}
function hotWishPick(t, done, pay) {
  const items = hotItems();
  const m = openModal(`${mhead('許願券：挑一項')}<p class="small muted" style="margin:0 0 8px">從想試清單挑一項，${esc(nick(partner()))} 要兌現</p>
    <div class="hl-body">${[2, 3].map((lv) => `<div class="hl-grp">${spiceIc(lv)} ${D.SPICE[lv].label}</div>${items.filter((x) => x.lv === lv).map((x) => `<button class="hl-row" data-wk="${esc(x.k)}"><span class="hl-chk">${ic('heart')}</span><span class="grow">${esc(x.t)}</span></button>`).join('')}`).join('')}</div>`, { center: true, cls: 'hot-zone' });
  $$('[data-wk]', m).forEach((b) => b.onclick = async () => {
    const it = items.find((x) => x.k === b.dataset.wk);
    if (!(await confirmBox(`用許願券兌換「${it.t}」？`, '就這個'))) return;
    if (t) fire(col('hot').update(t.id, { used: true }));
    pay && pay();
    fire(col('hot').add({ type: 'voucher', uid: me(), kind: 'wish', title: it.t, desc: '許願券', status: 'asked', askedAt: now(), at: now() }));
    sfx('sparkle'); toast('許願成功，等對方兌現'); closeModal(m); done && done();
  });
}


// ---------- 今晚的劇本（角色扮演） ----------
const scriptToday = () => hotDocs('script-day').filter((d) => d.day === dkey()).sort((a, b) => a.at - b.at)[0];
const newScript = (exceptI) => { let i; do { i = Math.floor(Math.random() * D.HOT_SCRIPTS.length); } while (D.HOT_SCRIPTS.length > 1 && i === exceptI); return { i, rule: pick(D.HOT_SCRIPT_RULES) }; };
const hotSafeWord = () => (S.couple.hot && S.couple.hot.safe) || '鳳梨';
function scriptFullHTML(sc) {
  const x = D.HOT_SCRIPTS[sc.i % D.HOT_SCRIPTS.length];
  const mineHer = prof(me()).role !== 'him';
  const lines = (arr) => arr.map((l) => `<li>「${esc(l)}」</li>`).join('');
  const card = (who, role, p, secret, mine) => `<div class="sc-role ${mine ? 'mine' : ''}"><div class="sc-h">${who}${mine ? '（你）' : ''}</div><b>${esc(role)}</b>
    <p>${esc(p)}</p><div class="sc-secret">${mine ? `<span>秘密目的</span>${esc(secret)}` : '<span>秘密目的</span>只有對方看得到'}</div></div>`;
  const her = card('她', x.her, x.herP, x.herS, mineHer), him = card('他', x.him, x.himP, x.himS, !mineHer);
  return `<div class="sc-card"><div class="sc-em">${hotEmblem()}</div>
    <div class="sc-t">${esc(x.t)}</div>
    <div class="sc-sec"><div class="sc-h">開場</div><p>${esc(x.set)}</p></div>
    <div class="sc-roles2">${mineHer ? her + him : him + her}</div>
    <div class="sc-sec"><div class="sc-h">事前準備</div><p>${esc(x.prep)}</p></div>
    <div class="sc-sec"><div class="sc-h">怎麼進場</div><p>${esc(x.entry)}</p></div>
    <div class="sc-sec"><div class="sc-h">劇情三段</div><ol class="sc-acts">${x.acts.map((a, i) => `<li><span>${['試探', '升溫', '越線'][i]}</span>${esc(a)}</li>`).join('')}</ol></div>
    <div class="sc-sec"><div class="sc-h">她一定要說的台詞</div><ul>${lines(x.herLines)}</ul></div>
    <div class="sc-sec"><div class="sc-h">他一定要說的台詞</div><ul>${lines(x.himLines)}</ul></div>
    <div class="sc-sec rule"><div class="sc-h">今晚的規則</div><p>${esc(sc.rule)}</p></div>
    <div class="sc-sec safe"><div class="sc-h">安全詞</div><p>任何時候說「<b>${esc(hotSafeWord())}</b>」就立刻出戲，不用解釋。<button class="link" id="sc-safe">改安全詞</button></p></div>
    <div class="sc-sec"><div class="sc-h">出戲</div><p>演完抱一下，說說剛剛哪一段最好玩、下次想演什麼。</p></div></div>`;
}
function scriptModal(sc, onReroll) {
  const m = openModal(`${mhead('<i data-ic="film"></i> 今晚的劇本')}<div id="sc-body">${scriptFullHTML(sc)}</div>
    ${onReroll ? '<div class="btn-row"><button class="btn ghost" id="sc-re">換一個劇本</button><button class="btn hot-btn" data-act="close">就演這個</button></div><p class="small muted center" style="margin:6px 0 0">兩個人看到的是同一個劇本</p>' : ''}`, { center: true, cls: 'hot-zone hz-script' });
  const wireSafe = () => $('#sc-safe', m) && ($('#sc-safe', m).onclick = async () => {
    const v = await promptBox('安全詞（兩個人共用）', { value: hotSafeWord(), placeholder: '例如：鳳梨' });
    if (!v) return;
    await S.store.updateCouple(S.cid, { 'hot.safe': v.slice(0, 10) });
    setTimeout(() => keepScroll(m, () => { $('#sc-body', m).innerHTML = scriptFullHTML(cur); wireSafe(); }), 150);
  });
  let cur = sc; wireSafe();
  $('#sc-re', m) && ($('#sc-re', m).onclick = async () => {
    const nsc = await onReroll(); cur = nsc;
    keepScroll(m, () => { $('#sc-body', m).innerHTML = scriptFullHTML(nsc); }); wireSafe();
    m.querySelector('.modal').scrollTop = 0; sfx('pop');
  });
  return m;
}
ACT.hotScript = () => {
  let d = scriptToday(), sc;
  if (d) sc = d.s;
  else { sc = newScript(-1); fire(col('hot').add({ type: 'script-day', day: dkey(), s: sc, by: me(), at: now() })); sfx('sparkle'); }
  scriptModal(sc, async () => {
    const cur = scriptToday();
    const n = newScript(cur ? cur.s.i : -1);
    if (cur) fire(col('hot').update(cur.id, { s: n })); else fire(col('hot').add({ type: 'script-day', day: dkey(), s: n, by: me(), at: now() }));
    return n;
  });
};

// ============================================================
//  火辣區的搗蛋鬼：晽晽貓貓、還好、阿扁有時候會跑來湊熱鬧
//  一天最多來一次（進火辣區有一半機會）；點 3～6 下才趕得走，阿扁 2 下
// ============================================================
const PEST_ODDS = .5;   // 每次進火辣區，有一半的機會會來搗亂
const PESTS = {
  // 台詞：說話的部分一律自稱「我」；「晽晽貓貓…」開頭沒有冒號的是旁白
  orange: {
    hi: ['晽晽貓貓：我也要玩！', '晽晽貓貓：你們在玩什麼？可以吃嗎？', '晽晽貓貓：我聽到有聲音，跑來看看～', '晽晽貓貓叼著雞腿擠進來：我也要！',
      '晽晽貓貓：這裡有沒有零食？', '晽晽貓貓從被子底下鑽出來：嗨～', '晽晽貓貓：你們關門，我就更想進來', '晽晽貓貓：我聞到宵夜的味道',
      '晽晽貓貓一屁股坐在你們中間', '晽晽貓貓：你們在玩摔角嗎？我也會！', '晽晽貓貓：床上可以吃東西嗎？', '晽晽貓貓：今天晚上我要睡這裡'],
    push: ['晽晽貓貓：不要推我啦～', '晽晽貓貓：我只是想看一下嘛', '晽晽貓貓：可是這裡好溫暖…', '晽晽貓貓肚子太圓，滾不太動', '晽晽貓貓：再一下下就好～', '晽晽貓貓假裝睡著了',
      '晽晽貓貓翻過來露出肚子：摸這裡我就走', '晽晽貓貓：給我一個罐罐就走', '晽晽貓貓把雞腿藏到枕頭底下', '晽晽貓貓：喵？（裝聽不懂）',
      '晽晽貓貓整隻攤平，變成一塊橘色地毯', '晽晽貓貓：你推我，我就推你', '晽晽貓貓：這是我的位子', '晽晽貓貓偷偷舔了一下你的手',
      '晽晽貓貓：嗝～（剛偷吃完）', '晽晽貓貓抱住你的手臂不放', '晽晽貓貓：好啦好啦…才怪', '晽晽貓貓開始呼嚕呼嚕，賴著不走'],
    bye: ['晽晽貓貓：好啦好啦，我去吃宵夜了', '晽晽貓貓：哼，我要叼走一包零食當補償', '晽晽貓貓滾走了～', '晽晽貓貓：你們慢慢玩，我去冰箱巡邏',
      '晽晽貓貓叼著雞腿，頭也不回地走了', '晽晽貓貓：我明天還要來！', '晽晽貓貓：下次要準備我的份喔', '晽晽貓貓滾到門外，順便把門推上了', '晽晽貓貓：無聊，我去睡了'],
    idle: '晽晽貓貓看你們不理牠，自己去找吃的了',
  },
  haohao: {
    hi: ['還好：嗷你們在幹嘛～', '還好：嗷～我也要玩～', '還好：我是女生，可以一起玩嗎？', '還好：嗷？（歪頭）',
      '還好用頭把門頂開：嗷～', '還好：把拔～你們在玩什麼？', '還好叼著球衝進來：玩這個！', '還好：嗷！我聽到聲音了！',
      '還好跳上床，尾巴打到你們的臉', '還好：嗷～為什麼不揪我？', '還好：你們在打架嗎？我來保護你們！', '還好：哈哈～好熱鬧喔～'],
    push: ['還好：嗷？', '還好：嗷～不要嘛～', '還好翻肚子：摸我～', '還好：把拔～你們在幹嘛？', '還好以為你在跟牠玩，尾巴搖更快了', '還好：嗷嗷！',
      '還好：我是女生，要溫柔一點', '還好把頭塞進你們中間', '還好：嗷～把拔貓咪呢？', '還好舔了你一大口',
      '還好：再推一次就是在玩了喔', '還好整隻躺平：我不走～', '還好追著自己的尾巴轉圈圈', '還好：哈哈～好好玩～',
      '還好：嗷（不知道在嗷什麼）', '還好把枕頭叼走了', '還好：我也要抱抱～', '還好歪頭：你們為什麼臉紅紅的？'],
    bye: ['還好：嗷…好啦，我去找把拔貓咪了', '還好叼著球跑走了：嗷～', '還好：哈哈～掰掰～', '還好：我去找蝴蝶了～',
      '還好叼走你的一隻襪子當紀念', '還好：嗷～明天再來玩！', '還好：我是女生，我懂，我走了', '還好跑出去，順便撞到門：嗷！', '還好：把拔～晚安～'],
    idle: '還好追著自己的尾巴，轉著轉著就走掉了',
  },
  // 阿扁比較乖，點兩下就走；以為你們在等地震
  abian: {
    need: 2,
    hi: ['阿扁：等等是不是要地震了？', '阿扁在思考……那根是ㄐㄐ地震棒嗎？', '阿扁：我感覺到床在搖，是地震嗎？', '阿扁：ㄐㄐ地震棒在動了！要地震了！',
      '阿扁摀住鼻子跑進來：要地震了快躲好！', '阿扁：我來幫忙監測地震', '阿扁：氣象局說等等會有地震嗎？', '阿扁在思考……為什麼地震都晚上來？',
      '阿扁：搖得好厲害，我要躲桌子底下', '阿扁：ㄐㄐ地震棒的數值好高喔', '阿扁：地震來了要先保護頭', '阿扁：我數到三，地震就來'],
    push: ['阿扁：好，我乖乖的', '阿扁：可是地震怎麼辦？', '阿扁：我不吵，我只是擔心', '阿扁拍拍手：諧音梗：「震」的好喜歡你們',
      '阿扁：那我去門外監測', '阿扁：ㄐㄐ地震棒交給你們保管喔', '阿扁在思考……', '阿扁：不要捏我的鼻子！'],
    bye: ['阿扁：好，我去躲桌子底下了', '阿扁：如果真的地震要叫我喔', '阿扁乖乖走出去，順手關燈', '阿扁：我去通知狗狗要地震了',
      '阿扁：監測完畢，今天是規模 5 級', '阿扁：地震結束要記得報平安喔', '阿扁：我去寫地震報告了', '阿扁拍拍手：「震」好，我走了', '阿扁：晚安，小心餘震'],
    idle: '阿扁在思考……地震好像沒有來，就回去睡覺了',
  },
};
const PEST_KEYS = Object.keys(PESTS);
let pestTimer = 0, pestDone = false;

// 進火辣區（輸完密碼）的時候決定這次會不會來
const _hotEnter = ACT.hot;
ACT.hot = async () => {
  const wasOpen = now() < hotUntil;
  await _hotEnter();
  // 好寶加入前的測試期間：每次進來約 10 秒就來，趕走後 10 秒又來，不限次數
  if (trialOpen() && now() < hotUntil) { pestDone = false; clearTimeout(pestTimer); pestTimer = setTimeout(pestTry, 8000 + Math.random() * 4000); return; }
  if (wasOpen || now() >= hotUntil) return;
  pestDone = false; clearTimeout(pestTimer);
  if (!(S.couple.drops || {})[`pest-${dkey()}`] && Math.random() < PEST_ODDS) pestTimer = setTimeout(pestTry, 20000 + Math.random() * 70000);
};
function pestTry() {
  if (pestDone) return;
  const hotOpen = document.querySelector('.modal-back.hot-zone');
  if (!hotOpen || document.visibilityState === 'hidden' || now() >= hotUntil) return;
  // 正在輸密碼、正在倒數計時的時候不吵，晚一點再來
  if (document.querySelector('.pin-wrap, .pest')) { pestTimer = setTimeout(pestTry, 15000); return; }
  if (trialOpen()) return showPest();
  // 兩個人一天最多被搗亂一次
  S.store.coupleTx(S.cid, (c) => ((c.drops || {})[`pest-${dkey()}`] ? null : { [`drops.pest-${dkey()}`]: true }))
    .then((ok) => { if (ok && document.querySelector('.modal-back.hot-zone')) showPest(); }).catch(() => {});
}
function showPest(k = pick(PEST_KEYS)) {
  pestDone = true;
  const P = PESTS[k], need = P.need || 3 + Math.floor(Math.random() * 4);
  let hits = 0, gone = false;
  const el = document.createElement('div');
  el.className = `pest pest-${k} ${Math.random() < .5 ? 'from-l' : 'from-r'}`;
  const hi = pick(P.hi); pestHeard(k, hi);
  el.innerHTML = `<div class="pest-say">${esc(hi)}</div>
    <button class="pest-body" aria-label="${esc(FRIENDS[k].name)}" style="width:${Math.round(Math.max(FRIENDS[k].w * 1.25, 110))}px"><span class="pest-art">${typeof withHat === 'function' ? withHat(k, friendArt(k)) : friendArt(k)}</span></button>`;
  document.body.appendChild(el);
  sfx('pop'); vibrate(15);
  const say = (t) => { pestHeard(k, t); const s = $('.pest-say', el); s.textContent = t; s.classList.remove('pop'); void s.offsetWidth; s.classList.add('pop'); };
  const leave = (t, chased) => {
    if (gone) return; gone = true; clearTimeout(idle);
    say(t); el.classList.add(chased ? 'chased' : 'wander');
    if (chased) { const r = $('.pest-body', el).getBoundingClientRect(); floaty(r.left + r.width / 2, r.top, k === 'orange' ? ['#c9773a', '#ffd45c'] : ['#ff9fb4', '#ffd45c', '#e2b56a']); sfx('chime'); }
    setTimeout(() => {
      el.remove();
      // 測試期間：走了 10 秒左右再來一隻
      if (trialOpen() && document.querySelector('.modal-back.hot-zone')) { pestDone = false; clearTimeout(pestTimer); pestTimer = setTimeout(pestTry, 8000 + Math.random() * 4000); }
    }, 1900);
  };
  // 不理牠的話，45 秒後自己走掉
  const idle = setTimeout(() => leave(P.idle, false), 45000);
  let lastPush = -1;
  $('.pest-body', el).onclick = () => {
    if (gone) return;
    hits++; vibrate(20);
    if (hits >= need) return leave(pick(P.bye), true);
    sfx('flip');
    let i; do { i = Math.floor(Math.random() * P.push.length); } while (i === lastPush && P.push.length > 1); lastPush = i;
    say(P.push[i]);
    el.style.setProperty('--push', hits);   // 每點一下被推遠一點
    el.classList.remove('nudge'); void el.offsetWidth; el.classList.add('nudge');
  };
  // 火辣區關掉、切到背景就跟著消失
  const watch = setInterval(() => {
    if (!document.body.contains(el)) return clearInterval(watch);
    if (!document.querySelector('.modal-back.hot-zone') || document.visibilityState === 'hidden') { clearInterval(watch); clearTimeout(idle); el.remove(); }
  }, 500);
}
window.__pest = (k) => showPest(k);

// 搗蛋台詞也收進圖鑑（只有兩人都開火辣時才看得到這一段）
const pestAll = (k) => { const P = PESTS[k]; return P ? [...P.hi, ...P.push, ...P.bye, P.idle] : []; };
function pestHeard(k, t) { const i = pestAll(k).indexOf(t); if (i >= 0 && typeof dexNote === 'function') dexNote(k, 'p' + i); }
function pestDexHTML(k, got) {
  if (!PESTS[k] || typeof hotOn !== 'function' || !hotOn()) return '';
  const all = pestAll(k), n = all.filter((_, i) => got['p' + i]).length;
  return `<h3 class="da-h">火辣區搗蛋 <span>${n} 句</span></h3>
    ${all.map((t, i) => `<div class="dex-line sp hot ${got['p' + i] ? '' : 'locked'}"><span class="sp-tag">火辣</span>${got['p' + i] ? esc(t) : '？？？'}</div>`).join('')}`;
}

// ============================================================
//  好寶加入前的測試期間（只有一個人的時候）
//  - 小動物每 10 秒路過一次、新台詞／新小劇場不限次數
//  - 點數補到 9999、扭蛋券補到 99，玩不完
//  好寶加入那一刻 joinFreshStart 會清掉所有點數、扭蛋券，自動變回正常
// ============================================================
function trialOpen() { return !!S.couple && (S.couple.members || []).length === 1; }
const TRIAL_PTS = 9999, TRIAL_TICKETS = 99;
let trialBusy = false;
async function trialTopUp() {
  if (trialBusy || !trialOpen() || !S.d.points) return;
  trialBusy = true;
  try {
    const bal = balance(me());
    if (bal < 2000) await addPoints(me(), TRIAL_PTS - bal, '測試期間：點數補滿');
    const tk = (S.couple.tickets || {})[me()] || 0;
    if (tk < 20) await S.store.updateCouple(S.cid, { [`tickets.${me()}`]: TRIAL_TICKETS });
  } catch (e) { console.warn('測試點數', e); }
  trialBusy = false;
}
setInterval(() => {
  if (!trialOpen() || document.visibilityState === 'hidden') return;
  trialTopUp();
  catStroll();
}, 10000);


// 跳出視窗時，後面的頁面固定不動（iPhone 上 overflow:hidden 不夠，要把 body 釘住）
(() => {
  let lockedY = null;
  const sync = () => {
    const open = !!document.querySelector('.modal-back');
    const b = document.body;
    if (open && lockedY === null) {
      lockedY = window.scrollY;
      Object.assign(b.style, { position: 'fixed', top: `-${lockedY}px`, left: '0', right: '0', width: '100%' });
    } else if (!open && lockedY !== null) {
      const y = lockedY; lockedY = null;
      Object.assign(b.style, { position: '', top: '', left: '', right: '', width: '' });
      window.scrollTo(0, y);
    }
  };
  new MutationObserver(sync).observe(document.body, { childList: true });
})();
window.__toast = toast;

// ============================================================
//  收藏冊：兌換卡（扭蛋卡池裡的卡）
//  抽到就收進來；依稀有度分頁；還沒抽到的是問號徽章（不暴雷）
//  點開看：第一次拿到、誰送的、兌換過幾次，還可以寫一句當天的回憶
// ============================================================
const POOL_BOOK_KEY = '__pool';
const poolMemoKey = (title) => 'm' + hash(title).toString(36);

// 這張卡池卡拿過的所有紀錄（兩個人一起算）
function poolGot() {
  const got = {};
  const add = (title, at) => { if (!title) return; const g = (got[title] ||= { first: at, cards: [] }); if (at && at < g.first) g.first = at; };
  list('gacha').forEach((g) => add(g.title, g.at));
  list('cards').filter((c) => !c.series && c.kind !== 'collect').forEach((c) => { add(c.title, c.at); got[c.title].cards.push(c); });
  return got;
}
function poolBookData() {
  const got = poolGot();
  // 火辣級的卡：兩人都開火辣才看得到（連問號都不顯示）
  const pool = list('pool').filter((p) => p.title);
  const byR = {};
  for (const r of D.RARITY_ORDER) byR[r] = pool.filter((p) => (p.rarity || 'N') === r).sort((a, b) => (got[b.title] ? 1 : 0) - (got[a.title] ? 1 : 0) || (got[a.title]?.first || 0) - (got[b.title]?.first || 0));
  const n = pool.filter((p) => got[p.title] && ((p.spice || 1) < 3 || hotOn())).length;
  return { got, byR, n };
}

// 封面圖騰：一張票
const _bookMotif1 = bookMotif;
bookMotif = (kind) => {
  if (kind !== 'ticket') return _bookMotif1(kind);
  const notch = 'M-30 -16 L30 -16 L30 -6 A6 6 0 0 0 30 6 L30 16 L-30 16 L-30 6 A6 6 0 0 0 -30 -6 Z';
  return `<g transform="rotate(-12)">
    <path d="${notch}" class="e-bg e-ink-s" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="M-14 -16 L-14 16" class="e-acc-s" stroke-width="1.4" stroke-dasharray="2 3"/>
    <circle cx="8" cy="0" r="8.5" class="e-acc-f"/><circle cx="8" cy="0" r="8.5" class="e-ink-s" stroke-width="1.1" fill="none"/>
    <path d="M8 -4.6 L9.4 -1.4 L12.8 -1.2 L10.2 1 L11 4.4 L8 2.6 L5 4.4 L5.8 1 L3.2 -1.2 L6.6 -1.4 Z" class="e-ink-f"/>
    <path d="M-25 -7 L-19 -7 M-25 0 L-19 0 M-25 7 L-19 7" class="e-ink-s" stroke-width="1.2" stroke-linecap="round"/></g>
    <circle cx="-26" cy="-26" r="1.6" class="e-ink-f"/><circle cx="27" cy="24" r="1.3" class="e-ink-f"/>`;
};

// 加進收藏冊：最上面目錄多一個徽章、第一本就是兌換卡
const _walletBook0 = walletBook;
walletBook = () => {
  const html = _walletBook0();
  const { n } = poolBookData();
  const meta = { pal: 'R', motif: 'ticket', pat: 'grid', sub: '扭蛋和轉盤抽到的卡' };
  const svg = bookCoverSVG(meta, { title: '兌換卡', sub: meta.sub, got: n, total: n, empty: !n });
  const toc = `<button class="bt-item emb-R" data-act="bookJump" data-i="pool">
      <svg viewBox="-44 -44 88 88" class="bt-medal"><circle r="41" class="e-bg e-ink-s" stroke-width="2"/><circle r="36" class="e-acc-s" stroke-width="1" fill="none"/><g transform="scale(.82)">${bookMotif('ticket')}</g></svg>
      <b>兌換卡</b><small>${n} 張</small></button>`;
  const book = `<div class="book emb-R" id="bk-pool">
      <button class="book-cover2" data-act="poolBookOpen">${svg}</button>
      <div class="book-note">已收集 ${n} 張・點封面翻開</div></div>`;
  const i = html.indexOf('<div class="book-toc">');
  if (i < 0) return book + html;
  const j = html.indexOf('</div>', i);
  return html.slice(0, i) + '<div class="book-toc">' + toc + html.slice(i + 22, j) + '</div>' + book + html.slice(j + 6);
};

ACT.poolBookOpen = () => {
  const { got, byR } = poolBookData();
  const PER = 9;
  const pages = [];
  for (const r of D.RARITY_ORDER) {
    const arr = byR[r];
    if (!arr.length) continue;
    for (let i = 0; i < arr.length; i += PER) pages.push({ r, items: arr.slice(i, i + PER), part: Math.floor(i / PER) + 1, parts: Math.ceil(arr.length / PER) });
  }
  const cell = (p, no) => {
    // 火辣級：沒開火辣時就算抽到也只顯示「？」
    if (!got[p.title] || ((p.spice || 1) >= 3 && !hotOn())) return `<div class="alb-slot"><span class="alb-no">No.${String(no).padStart(2, '0')}</span><b>？</b><small>${esc(D.RARITY[p.rarity || 'N'].label)}</small></div>`;
    const c = { title: p.title, rarity: p.rarity || 'N', mark: p.mark || '', desc: p.desc || '', spice: p.spice || 1 };
    const used = got[p.title].cards.reduce((s, x) => s + (x.used || 0), 0);
    return `<button class="alb-card emb-${embPalette(c)}" data-pt="${esc(p.title)}">${emblemSVG(c)}${used ? `<span class="alb-used">兌換 ${used} 次</span>` : ''}</button>`;
  };
  const m = openModal(`<button class="m-close db-close" data-act="close">✕</button>
    <div class="db-track">${pages.map((pg) => { const R = D.RARITY[pg.r]; return `<section class="db-page alb-page">
      <div class="alb-head"><b style="color:${R.color}">${pg.r} · ${esc(R.label)}</b><span>${pg.parts > 1 ? `${pg.part} / ${pg.parts}` : ''}</span></div>
      <div class="alb-grid">${pg.items.map((p, i) => cell(p, (pg.part - 1) * PER + i + 1)).join('')}${Array.from({ length: PER - pg.items.length }, () => '<div class="alb-blank"></div>').join('')}</div>
    </section>`; }).join('')}</div>
    ${pages.length > 1 ? `<div class="db-nav"><button class="db-prev" aria-label="上一頁"><i data-ic="chevron"></i></button><div class="db-dots">${pages.map((_, i) => `<i data-p="${i}"></i>`).join('')}</div><button class="db-next" aria-label="下一頁"><i data-ic="chevron"></i></button></div>` : ''}`,
  { center: true, cls: 'dex-book album emb-R' });
  const tr = $('.db-track', m), n = pages.length;
  const cur = () => Math.round(tr.scrollLeft / tr.clientWidth);
  const go = (p) => tr.scrollTo({ left: Math.max(0, Math.min(n - 1, p)) * tr.clientWidth, behavior: 'smooth' });
  const dots = () => { if (n < 2) return; const c = cur(); $$('.db-dots i', m).forEach((d, i) => d.classList.toggle('on', i === c)); $('.db-prev', m).disabled = c === 0; $('.db-next', m).disabled = c === n - 1; };
  tr.addEventListener('scroll', () => { clearTimeout(tr._t); tr._t = setTimeout(dots, 60); }, { passive: true });
  if (n > 1) { $('.db-prev', m).onclick = () => { sfx('flip'); go(cur() - 1); }; $('.db-next', m).onclick = () => { sfx('flip'); go(cur() + 1); }; $$('.db-dots i', m).forEach((d) => d.onclick = () => go(+d.dataset.p)); }
  $$('.alb-card', m).forEach((b) => b.onclick = () => poolCardDetail(b.dataset.pt));
  dots();
};
ACT.bookJump = ((orig) => (el) => {
  if (el.dataset.i !== 'pool') return orig(el);
  const b = document.getElementById('bk-pool');
  if (b) window.scrollTo({ top: b.getBoundingClientRect().top + window.scrollY - 70, behavior: 'smooth' });
})(ACT.bookJump);

// 一張兌換卡的紀念頁
function poolCardDetail(title) {
  const p = list('pool').find((x) => x.title === title) || { title };
  const g = poolGot()[title];
  if (!g) return;
  const c = { title, rarity: p.rarity || 'N', mark: p.mark || '', desc: p.desc || '', spice: p.spice || 1 };
  const draw = () => {
    const cards = poolGot()[title]?.cards || [];
    const used = cards.reduce((s, x) => s + (x.used || 0), 0);
    const redeems = cards.flatMap((x) => (x.log || []).filter((l) => l.how === 'redeem').map((l) => l.at)).sort((a, b) => b - a);
    const froms = [...new Set(cards.map((x) => x.from))].map((f) => (f === 'sys' || !f ? '遊樂園' : nick(f)));
    const memo = (S.couple.cardMemo || {})[poolMemoKey(title)];
    const fmt = (t) => { const d = new Date(t); return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`; };
    return `${mhead(esc(title))}
      <div class="pc-emb emb-${embPalette(c)}">${emblemSVG(c)}</div>
      ${p.desc ? `<p class="center muted" style="margin:4px 0 10px">${esc(p.desc)}</p>` : ''}
      <div class="pc-rows">
        <div><span>第一次拿到</span><b>${g.first ? fmt(g.first) : '—'}</b></div>
        <div><span>誰送的</span><b>${froms.length ? froms.map(esc).join('、') : '—'}</b></div>
        <div><span>兌換過</span><b>${used ? `${used} 次` : '還沒兌換'}</b></div>
        ${redeems.length ? `<div><span>最近一次兌換</span><b>${fmt(redeems[0])}</b></div>` : ''}
      </div>
      <div class="pc-memo">${memo && memo.t ? `<div class="pc-memo-t">「${esc(memo.t)}」</div><div class="small muted">${esc(nick(memo.by))} 寫的 · ${fmt(memo.at)}</div>` : '<div class="small muted">還沒有寫回憶</div>'}
        <button class="btn ghost block mt" id="pc-edit">${memo && memo.t ? '改這句回憶' : '寫一句當天的回憶'}</button></div>`;
  };
  const m = openModal(draw(), { center: true });
  const wire = () => {
    $('#pc-edit', m).onclick = async () => {
      const old = (S.couple.cardMemo || {})[poolMemoKey(title)];
      const v = await promptBox('寫一句那天的回憶（兩個人都看得到）', { value: old?.t || '', ok: '存起來' });
      if (v === null || v === undefined) return;
      const t = String(v).trim().slice(0, 80);
      await S.store.updateCouple(S.cid, { [`cardMemo.${poolMemoKey(title)}`]: t ? { t, by: me(), at: now() } : S.store.DEL() });
      sfx('pop'); toast(t ? '回憶存好了' : '回憶刪掉了');
      m.querySelector('.modal').innerHTML = draw(); wire();
    };
  };
  wire();
}

// ============================================================
//  收藏館：成就／卡冊／圖鑑／火辣（兩人都火辣才出現，進去要密碼）
//  入口在「回憶」最上面；原本票夾的收藏冊、遊樂區的圖鑑、回憶的成就都改成開這裡
// ============================================================
S.hallTab ||= 'ach';
function openHall(t) { if (t) S.hallTab = t; S.tab = 'memory'; S.sub.memory = 'hall'; render(); window.scrollTo(0, 0); }
ACT.hall = (el) => openHall(el?.dataset?.t);

// 票夾的「收藏冊」改成去收藏館
ACT.sub = ((orig) => (el) => {
  if (el.dataset.page === 'wallet' && el.dataset.sub === 'book') return openHall('book');
  if (el.dataset.page === 'memory' && el.dataset.sub === 'ach') return openHall('ach');
  return orig(el);
})(ACT.sub);
if (S.sub && S.sub.wallet === 'book') S.sub.wallet = 'mine';

// ---------- 火辣級的兌換卡：火辣配色 ----------
const isHotCard = (c) => !!c && !c.series && c.kind !== 'collect' && (c.spice || 1) >= 3 && typeof hotOn === 'function' && hotOn();
const _embPalette0 = embPalette;
embPalette = (c) => (!c.pal && isHotCard(c) ? 'HOT' : _embPalette0(c));

// ---------- 收藏館頁面 ----------
function memHall() {
  const hot = typeof hotOn === 'function' && hotOn();
  if (S.hallTab === 'hot' && !hot) S.hallTab = 'ach';
  const tabs = [['ach', '<i data-ic="trophy"></i> 成就'], ['book', '<i data-ic="ticket"></i> 卡冊'], ['dex', '<i data-ic="book"></i> 圖鑑'], ...(hot ? [['hot', '<i data-ic="w_fire"></i> 火辣']] : [])];
  const body = { ach: memAch, book: walletBook, dex: hallDex, hot: hallHot }[S.hallTab] || memAch;
  return `<div class="hall-head"><span class="hall-em">${hallEmblem()}</span><div><b>收藏館</b><div class="small muted">我們一起收集的東西都在這裡</div></div></div>
    <div class="seg seg-fit hall-tabs">${tabs.map(([k, n]) => `<button class="${S.hallTab === k ? 'on' : ''} ${k === 'hot' ? 'hot' : ''}" data-act="hallTab" data-t="${k}">${n}</button>`).join('')}</div>
    <div class="hall-body ${S.hallTab === 'hot' ? 'hz-hall' : ''}">${body()}</div>`;
}
ACT.hallTab = async (el) => {
  const t = el.dataset.t;
  if (t === 'hot' && !(await hotHallUnlock())) return;
  S.hallTab = t; render();
};
async function hotHallUnlock() {
  if (now() < hotUntil) return true;
  if (!S.couple.hot?.pin) { if (!(await hotSetPin())) return false; }
  else if (!(await pinPad({ title: '輸入密碼', sub: '只有我們兩個知道', check: hotCheck }))) return false;
  hotUntil = now() + HOT_UNLOCK_MS;
  return true;
}
function hallEmblem() {
  return `<svg viewBox="-44 -44 88 88"><circle r="41" class="hall-c1"/><circle r="35" class="hall-c2"/>
    <path d="M-20 14 L-20 -6 L0 -20 L20 -6 L20 14 Z" class="hall-c3"/><path d="M-12 14 L-12 0 M0 14 L0 -2 M12 14 L12 0" class="hall-c3"/>
    <path d="M-25 18 L25 18" class="hall-c3"/><circle cx="0" cy="-9" r="3" class="hall-c4"/></svg>`;
}
// 圖鑑分頁：小動物圖鑑（翻書）＋小小黑
function hallDex() {
  const n = dexCount();
  return `<button class="card hall-entry" data-act="dex"><span class="hall-ic"><i data-ic="book" data-medal></i></span>
      <span class="grow"><b>小動物圖鑑</b><br><span class="small muted">已經遇到 ${n} 位朋友，點開翻書</span></span><span style="font-size:22px">›</span></button>`;
}

// 回憶頁：最上面放收藏館入口，原本的「成就」小按鈕改成收藏館
PAGES.memory.html = ((orig) => function () {
  if (S.sub.memory === 'hall') {
    const back = '<button class="link back-link" data-act="sub" data-page="memory" data-sub="goals">‹ 回到回憶</button>';
    return `<div class="page-title"><h2><i data-ic="book"></i> 回憶</h2></div>${back}${memHall()}`;
  }
  const h = orig.call(this).replace(/<button class="ach-chip[^"]*"[^>]*>[\s\S]*?<\/button>/, '');
  const entry = `<button class="card hall-banner" data-act="hall" data-t="ach"><span class="hall-em">${hallEmblem()}</span>
      <span class="grow"><b>收藏館</b><br><span class="small muted">成就、卡冊、小動物圖鑑</span></span><span style="font-size:22px">›</span></button>`;
  const i = h.indexOf('</div>', h.indexOf('page-title'));
  return h.slice(0, i + 6) + entry + h.slice(i + 6);
})(PAGES.memory.html);

// ============================================================
//  火辣分頁：火辣成就＋火辣收藏冊
// ============================================================
const HOT_ACH = [
  { id: 'h_pose10', name: '十種花樣', desc: '試過 10 張姿勢', m: 'pose', goal: 10, tier: 'b', mark: '十' },
  { id: 'h_pose30', name: '解鎖達人', desc: '試過 30 張姿勢', m: 'pose', goal: 30, tier: 's', mark: '解' },
  { id: 'h_pose69', name: '六十九', desc: '69 張姿勢全部試過', m: 'pose', goal: 69, tier: 'g', mark: '69' },
  { id: 'h_tease1', name: '第一次撩', desc: '撩撥任務驗收通過 1 次', m: 'tease', goal: 1, tier: 'b', mark: '撩' },
  { id: 'h_tease10', name: '撩人高手', desc: '撩撥任務驗收通過 10 次', m: 'tease', goal: 10, tier: 's', mark: '撩' },
  { id: 'h_tease50', name: '撩不停', desc: '撩撥任務驗收通過 50 次', m: 'tease', goal: 50, tier: 'g', mark: '撩' },
  { id: 'h_match1', name: '心照不宣', desc: '想試清單第一次配對', m: 'match', goal: 1, tier: 'b', mark: '配' },
  { id: 'h_match10', name: '想法一樣', desc: '想試清單配對 10 項', m: 'match', goal: 10, tier: 's', mark: '配' },
  { id: 'h_done1', name: '第一次解鎖', desc: '想試清單蓋了第一個「已解鎖」章', m: 'done', goal: 1, tier: 'b', mark: '鎖' },
  { id: 'h_done10', name: '清單殺手', desc: '想試清單解鎖 10 項', m: 'done', goal: 10, tier: 's', mark: '鎖' },
  { id: 'h_done30', name: '什麼都試過', desc: '想試清單解鎖 30 項', m: 'done', goal: 30, tier: 'g', mark: '鎖' },
  { id: 'h_sig1', name: '今晚有約', desc: '今晚的暗號被答應 1 次', m: 'sig', goal: 1, tier: 'b', mark: '約' },
  { id: 'h_sig10', name: '暗號達人', desc: '今晚的暗號被答應 10 次', m: 'sig', goal: 10, tier: 's', mark: '約' },
  { id: 'h_stamp5', name: '集章開始', desc: '拿到 5 個火辣印章', m: 'stamp', goal: 5, tier: 'b', mark: '章' },
  { id: 'h_stamp30', name: '印章滿滿', desc: '拿到 30 個火辣印章', m: 'stamp', goal: 30, tier: 's', mark: '章' },
  { id: 'h_lot1', name: '手氣火辣', desc: '第一次火辣抽獎', m: 'lot', goal: 1, tier: 'b', mark: '抽' },
  { id: 'h_rare1', name: '稀有大獎', desc: '火辣抽獎抽到 ★ 稀有獎', m: 'rare', goal: 1, tier: 's', mark: '★' },
];
function hotAchMetrics() {
  const hd = (t) => (typeof hotDocs === 'function' ? hotDocs(t) : []);
  return {
    pose: new Set(hd('pose-done').map((d) => d.key)).size,
    tease: hd('tease').filter((d) => d.status === 'checked').length,
    match: typeof hotMatches === 'function' ? hotMatches().length : 0,
    done: new Set(hd('done').map((d) => d.k)).size,
    sig: hd('signal').filter((d) => d.status === 'yes').length,
    stamp: hd('stamp').length,
    lot: hd('voucher').filter((d) => d.kind === 'lottery').length,
    rare: hd('voucher').filter((d) => d.kind === 'lottery' && d.rare).length,
  };
}
const hotAchGot = () => { const m = hotAchMetrics(); return new Set(HOT_ACH.filter((a) => (m[a.m] || 0) >= a.goal).map((a) => a.id)); };

function hallHot() {
  if (now() >= hotUntil) return `<div class="card center"><p class="muted">火辣分頁要先輸入密碼</p><button class="btn hot-btn" data-act="hallTab" data-t="hot">輸入密碼</button></div>`;
  const got = hotAchGot();
  const tiers = { b: '銅', s: '銀', g: '金' };
  const sorted = [...HOT_ACH].sort((a, b) => (got.has(b.id) ? 1 : 0) - (got.has(a.id) ? 1 : 0));
  const hd = (t) => hotDocs(t);
  const poseN = new Set(hd('pose-done').map((d) => d.key)).size;
  const vN = hd('voucher').length;
  const doneN = new Set(hd('done').map((d) => d.k)).size;
  const cardN = hotPoolCards().filter((p) => p.got).length;
  const cover = (act, ic, t, s) => `<button class="hh-cover" data-act="${act}"><span class="hh-em"><i data-ic="${ic}" data-medal></i></span><b>${t}</b><small>${s}</small></button>`;
  return `<h3 class="hh-title">火辣收藏冊</h3>
    <div class="hh-covers">
      ${cover('hotPoseBook', 'star', '姿勢圖鑑', `試過 ${poseN} 張`)}
      ${cover('hotHallVouchers', 'ticket', '抽到的獎', `${vN} 張`)}
      ${cover('hotHallDone', 'heart', '解鎖的章', `${doneN} 個`)}
      ${cover('hotHallCards', 'w_fire', '火辣兌換卡', `${cardN} 張`)}
    </div>
    <h3 class="hh-title">火辣成就</h3>
    <div class="ach-grid">${sorted.map((a) => { const ok = got.has(a.id); return `<div class="ach ach-${a.tier} ${ok ? '' : 'locked'}">${achBadge(a, ok)}<b>${esc(ok ? a.name : '？？？')}</b><span>${esc(a.desc)}</span>${ok ? `<span class="ach-tier t-${a.tier}">${tiers[a.tier]}</span>` : ''}</div>`; }).join('')}</div>`;
}

// 火辣級兌換卡（卡池裡 spice 3）
function hotPoolCards() {
  const got = poolGot();
  return list('pool').filter((p) => (p.spice || 1) >= 3).map((p) => ({ ...p, got: !!got[p.title] })).sort((a, b) => (b.got ? 1 : 0) - (a.got ? 1 : 0) || rarityRank(b.rarity) - rarityRank(a.rarity));
}
function hotAlbum(title, cells) {
  return openModal(`${mhead(esc(title))}<div class="hh-grid">${cells.join('') || '<div class="empty">還沒有</div>'}</div>`, { center: true, cls: 'hot-zone hz-book' });
}
const hhQ = '<span class="hh-q"><svg viewBox="-40 -40 80 80"><circle r="38" class="pe-bg"/><circle r="38" class="pe-r" stroke-width="1.2" stroke-dasharray="2 3"/><text y="10" text-anchor="middle">?</text></svg></span>';
ACT.hotHallCards = () => {
  const m = hotAlbum('火辣兌換卡', hotPoolCards().map((p) => p.got
    ? `<button class="hh-cell on emb-HOT" data-pt="${esc(p.title)}">${emblemSVG({ title: p.title, rarity: p.rarity, mark: p.mark || '', spice: 3 })}</button>`
    : `<div class="hh-cell">${hhQ}<small>${esc(D.RARITY[p.rarity || 'N'].label)}</small></div>`));
  $$('[data-pt]', m).forEach((b) => b.onclick = () => poolCardDetail(b.dataset.pt));
};
ACT.hotHallVouchers = () => {
  const vs = hotDocs('voucher').sort((a, b) => b.at - a.at);
  hotAlbum('抽到的獎', vs.map((v) => `<div class="hh-row"><b>${v.rare ? '★ ' : ''}${esc(v.title)}</b><span class="small muted">${esc(v.desc || '')}</span>
    <span class="small muted">${esc(nick(v.uid))} · ${fmtFull(v.at)}${v.status === 'redeemed' ? ' · 兌現了' : ''}</span></div>`));
};
ACT.hotHallDone = () => {
  const items = hotItems();
  const ds = hotDocs('done').sort((a, b) => b.at - a.at);
  const seen = new Set();
  hotAlbum('解鎖的章', ds.filter((d) => !seen.has(d.k) && seen.add(d.k)).map((d) => { const it = items.find((x) => x.k === d.k); return `<div class="hh-row hh-stamp"><span class="hh-stamp-ic">已解鎖</span><b>${esc(it ? it.t : '')}</b><span class="small muted">${fmtFull(d.at)}</span></div>`; }));
};

// 金色火辣成就：兩人各掉一張火辣紀念券（放在火辣票夾，跟一般票夾分開）
async function hotAchDrops() {
  const ms = S.couple?.members || [];
  if (ms.length < 2 || typeof hotOn !== 'function' || !hotOn() || !S.d.hot) return;
  const got = hotAchGot();
  for (const a of HOT_ACH) {
    if (a.tier !== 'g' || !got.has(a.id) || (S.couple.drops || {})[`hach-${a.id}`]) continue;
    const ok = await S.store.coupleTx(S.cid, (x) => (x.drops && x.drops[`hach-${a.id}`] ? null : { [`drops.hach-${a.id}`]: true }));
    if (!ok) continue;
    for (const u of ms) await col('hot').add({ type: 'voucher', uid: u, kind: 'ach', title: `${a.name}紀念券`, desc: `解鎖金色火辣成就「${a.name}」：${a.desc}。內容兩人一起決定`, rare: true, status: 'new', at: now() });
  }
}
setInterval(() => { try { hotAchDrops(); } catch (e) { console.warn(e); } }, 20000);

// 切到背景：火辣分頁也一起關上
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && S.hallTab === 'hot') { S.hallTab = 'ach'; if (S.tab === 'memory') render(); }
});
// 扭蛋抽到火辣級的卡：專屬的火辣演出（稀有度不變）
function hotDrawFx() {
  const el = document.createElement('div');
  el.className = 'hot-draw-fx';
  el.innerHTML = `<div class="hdf-ring">${typeof hotEmblem === 'function' ? hotEmblem() : ''}</div><div class="hdf-t">火辣級</div>`;
  document.body.appendChild(el);
  confetti(90, ['#d9485f', '#e9c27a', '#7a1f35', '#fff4e6']);
  vibrate([40, 30, 40, 30, 120]); sfx('sparkle');
  setTimeout(() => el.classList.add('out'), 1500);
  setTimeout(() => el.remove(), 2100);
}

// 生日卡組裡的火辣級卡：兩人都開火辣前是蓋住的「神秘卡」
// 火辣級的卡（生日卡組、扭蛋卡池都算）：兩人都開火辣前是蓋住的「？」
const hotLockedCard = (c) => !!c && (c.spice || 1) >= 3 && c.kind !== 'collect' && !(typeof hotOn === 'function' && hotOn());
const maskHot = (c) => ({ ...c, title: '？', desc: '兩個人都打開火辣後才會揭曉', mark: '？', mystery: false });
const _ticketHTML0 = ticketHTML;
ticketHTML = (c, o) => _ticketHTML0(hotLockedCard(c) ? maskHot(c) : c, o);
const _emblemSVG0 = emblemSVG;
emblemSVG = (c, hide) => _emblemSVG0(hotLockedCard(c) ? maskHot(c) : c, hide);
ACT.openCard = ((orig) => (el) => {
  const c = list('cards').find((x) => x.id === el?.dataset?.id);
  if (hotLockedCard(c)) { toast('這張是「？」卡，兩個人都打開火辣後才會揭曉'); return; }
  return orig(el);
})(ACT.openCard);

// 測試期間：想試清單自己勾的就算配對（好寶加入後恢復成兩個人都勾才算）
const _hotMatches0 = hotMatches;
hotMatches = () => {
  if (!trialOpen()) return _hotMatches0();
  const mine = hotWants(me());
  const at = (k) => Math.max(...hotDocs('want').filter((d) => d.k === k).map((d) => d.at || 0));
  return hotItems().filter((x) => mine.has(x.k)).map((x) => ({ ...x, at: at(x.k) }));
};
// ============================================================
//  啟動
// ============================================================
boot();
