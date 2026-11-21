
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
  const draw = () => `${mhead('火辣區')}
    <div class="hz-hero">${hotEmblem()}<div class="small">今晚的熱度</div>
      <div class="seg hz-lv" id="hz-lv">${[2, 3].map((l) => `<button data-l="${l}" class="${hotLv() === l ? 'on' : ''}">${spiceIc(l)} ${D.SPICE[l].label}</button>`).join('')}</div></div>
    <div class="game-tiles hz-tiles">
      <button class="game-tile" data-act="hotDice"><span class="gi"><i data-ic="dice" data-medal></i></span><b>火辣骰子</b><span>動作、位置、多久，骰子說了算</span></button>
      <button class="game-tile" data-act="hotTod"><span class="gi"><i data-ic="w_fire" data-medal></i></span><b>真心話大冒險</b><span>大膽版，輪流來</span></button>
      <button class="game-tile wide" data-act="hotList"><span class="gi"><i data-ic="heart" data-medal></i></span><div class="grow"><b>想試清單</b><br><span>各自偷偷勾，兩個人都想的才會配對</span></div>${hotNewMatch() ? '<span class="badge-dot">!</span>' : ''}<span style="font-size:22px">›</span></button>
    </div>
    <div class="center"><button class="link" id="hz-lock"><i data-ic="lock"></i> 鎖上離開</button></div>`;
  const m = openModal(draw(), { center: true, cls: 'hot-zone hz-hub' });
  const wire = () => {
    $$('#hz-lv button', m).forEach((b) => b.onclick = () => { localStorage.setItem('park-hot-lv', b.dataset.l); $$('#hz-lv button', m).forEach((x) => x.classList.toggle('on', x === b)); });
    $('#hz-lock', m).onclick = () => { hotUntil = 0; closeModal(m); toast('火辣區鎖上了'); };
  };
  wire();
  m._redraw = () => { m.querySelector('.modal').innerHTML = draw(); wire(); };
}
const hotRedrawHub = () => $$('.hz-hub').forEach((b) => b._redraw && b._redraw());

ACT.hotTod = () => todModal({ levels: [2, 3], cls: 'hot-zone', key: 'park-hot-lv' });

// ---------- 火辣骰子 ----------
ACT.hotDice = () => {
  const ms = (S.couple.members || []).slice();
  let turn = ms.includes(localStorage.getItem('park-hot-turn')) ? localStorage.getItem('park-hot-turn') : me();
  const other = (u) => ms.find((x) => x !== u) || u;
  const kinds = ['act', 'part', 'time'];
  const m = openModal(`${mhead('<i data-ic="dice"></i> 火辣骰子')}
    <div class="seg hz-lv" id="hd-lv">${[2, 3].map((l) => `<button data-l="${l}" class="${hotLv() === l ? 'on' : ''}">${spiceIc(l)} ${D.SPICE[l].label}</button>`).join('')}</div>
    <div class="row" style="justify-content:center;gap:8px;margin-top:4px"><span class="small muted">誰來</span>
      <div class="seg" id="hd-turn" style="padding:0">${ms.map((u) => `<button data-u="${u}" class="${u === turn ? 'on' : ''}">${avatar(u)} ${esc(nick(u))}</button>`).join('')}</div></div>
    <div class="hdice-row">${kinds.map((k) => `<div class="hdie" data-k="${k}"><svg viewBox="0 0 80 80" class="hd-ring" aria-hidden="true"><circle cx="40" cy="40" r="37"/><circle cx="40" cy="40" r="32" stroke-dasharray="1.4 2.8"/></svg><small>${D.HOT_DICE_NAMES[k]}</small><b>?</b></div>`).join('')}</div>
    <div id="hd-res"></div>
    <button class="btn block hot-btn" id="hd-go">擲骰子</button>
    <div class="center"><button class="link" id="hd-edit" style="margin-top:10px">改骰子上的字</button></div>`, { center: true, cls: 'hot-zone' });
  $$('#hd-lv button', m).forEach((b) => b.onclick = () => { localStorage.setItem('park-hot-lv', b.dataset.l); $$('#hd-lv button', m).forEach((x) => x.classList.toggle('on', x === b)); });
  const setTurn = (u) => { turn = u; localStorage.setItem('park-hot-turn', u); $$('#hd-turn button', m).forEach((x) => x.classList.toggle('on', x.dataset.u === u)); };
  $$('#hd-turn button', m).forEach((b) => b.onclick = () => setTurn(b.dataset.u));
  let rolling = false;
  $('#hd-go', m).onclick = async () => {
    if (rolling) return; rolling = true;
    const lv = hotLv(), doer = turn, target = other(turn);
    const who = (t) => t.replace(/【做的人】/g, nick(doer)).replace(/【被做的人】/g, nick(target));
    $('#hd-res', m).innerHTML = '';
    vibrate([15, 30, 15, 30, 15]); sfx('pop');
    const out = {}, raw = {};
    await Promise.all(kinds.map(async (k, i) => {
      const el = $(`.hdie[data-k="${k}"]`, m), faces = hotFaces(lv, k), b = $('b', el);
      el.classList.remove('spin'); void el.offsetWidth; el.classList.add('spin');
      const stop = now() + 700 + i * 260;
      while (now() < stop) { b.textContent = who(pick(faces)); await sleep(70); }
      raw[k] = pick(faces); out[k] = who(raw[k]); b.textContent = out[k];
      el.classList.remove('spin'); el.classList.add('land'); setTimeout(() => el.classList.remove('land'), 400);
    }));
    sfx('chime');
    $('#hd-res', m).innerHTML = `<div class="prompt-card hd-card"><div class="small muted" style="font-family:var(--sans)">${spiceIc(lv)} ${esc(nick(doer))} 對 ${esc(nick(target))}</div>
      ${esc(out.act)}<span class="hd-sep">·</span>${/【/.test(raw.part) ? '' : esc(nick(target)) + '的'}${esc(out.part)}<span class="hd-sep">·</span>${esc(out.time)}</div>`;
    if (ms.length > 1) setTurn(target);
    rolling = false;
  };
  $('#hd-edit', m).onclick = () => hotDiceEditor(hotLv());
};
function hotDiceEditor(lv) {
  const kinds = ['act', 'part', 'time'];
  const m = openModal(`${mhead(`改骰子 · ${D.SPICE[lv].label}`)}
    <p class="small muted" style="margin:0 0 8px">一行一面，2～12 面。改了兩個人都會一起換。寫【做的人】【被做的人】，擲出來會換成名字</p>
    ${kinds.map((k) => `<label>${D.HOT_DICE_NAMES[k]}</label><textarea id="de-${k}" rows="6">${esc(hotFaces(lv, k).join('\n'))}</textarea>`).join('')}
    <div class="btn-row"><button class="btn ghost" id="de-reset">換回預設</button><button class="btn hot-btn" id="de-save">儲存</button></div>`, { center: true, cls: 'hot-zone' });
  const save = async (reset) => {
    for (const k of kinds) {
      const faces = reset ? [] : $(`#de-${k}`, m).value.split('\n').map((x) => x.trim()).filter(Boolean).slice(0, 12);
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
        if (it) { for (const w of hotDocs('want').filter((w) => w.k === it.k)) await col('hot').remove(w.id); await col('hot').remove(it.id); }
        return draw();
      }
      await hotToggle(b.dataset.k); draw();
    });
    $('#hl-add', m) && ($('#hl-add', m).onclick = async () => { await hotAddItem(); draw(); });
    $$('[data-done]', m).forEach((b) => b.onclick = async () => { await col('hot').add({ type: 'done', k: b.dataset.done, by: me(), at: now() }); sfx('stamp'); vibrate(30); draw(); });
    $$('[data-undone]', m).forEach((b) => b.onclick = async () => { if (await confirmBox('把「已解鎖」的章拿掉？', '拿掉')) { await col('hot').remove(b.dataset.undone); draw(); } });
  };
  draw();
  m._onClose = hotRedrawHub;
};
async function hotToggle(k) {
  const mineDoc = hotDocs('want').find((d) => d.uid === me() && d.k === k);
  if (mineDoc) { await col('hot').remove(mineDoc.id); return; }
  await col('hot').add({ type: 'want', uid: me(), k, at: now() });
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
