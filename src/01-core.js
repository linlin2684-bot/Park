// ============================================================
//  兩人遊樂園 — 主程式
//  （這個檔案是由 src/ 資料夾裡的分段檔合併而成）
// ============================================================
import { firebaseConfig } from './config.js';
import * as D from './data.js?v=11281521';
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
// 午夜冠軍那個月，頭像戴金框＋小王冠（07y-ily.js）
const avatar = (uid, cls = '') => {
  if (uid === 'sys') return '<span class="av"><i data-ic="ferris"></i></span>';
  const k = typeof ilyCrowned === 'function' && ilyCrowned(uid);
  return `<span class="av ${cls}${k ? ' crowned' : ''}">${avatarRaw(prof(uid))}${k ? ILY_CROWN : ''}</span>`;
};
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
