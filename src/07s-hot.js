
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
      <button class="game-tile wide" data-act="hotPose"><span class="gi"><i data-ic="star" data-medal></i></span><div class="grow"><b>今天的姿勢</b><br><span>${hotPoseToday() ? '今天的牌已經抽好了' : '每天一組，抽到幾張就照順序來'}</span></div><span style="font-size:22px">›</span></button>
      <button class="game-tile wide" data-act="hotPlay"><span class="gi"><i data-ic="dice" data-medal></i></span><div class="grow"><b>前戲遊戲</b><br><span>真心話、大冒險、骰子，輪流來</span></div><span style="font-size:22px">›</span></button>
      <button class="game-tile" data-act="hotTease"><span class="gi"><i data-ic="letter" data-medal></i></span><b>撩撥任務</b><span>${hotTeaseBadge() ? '<span class="badge-dot">!</span>' : ''}早上互派，晚上驗收</span></button>
      <button class="game-tile" data-act="hotWallet"><span class="gi"><i data-ic="stamp" data-medal></i></span><b>火辣票夾</b><span>印章 ${hotStamps(me()).length} 個</span></button>
      <button class="game-tile wide" data-act="hotList"><span class="gi"><i data-ic="heart" data-medal></i></span><div class="grow"><b>想試清單</b><br><span>各自偷偷勾，兩個人都想的才會配對</span></div>${hotNewMatch() ? '<span class="badge-dot">!</span>' : ''}<span style="font-size:22px">›</span></button>
    </div>
    <div class="center hz-links"><button class="link" data-act="hotSignal"><i data-ic="moon"></i> 今晚的暗號</button><button class="link" data-act="hotTimer"><i data-ic="hourglass"></i> 計時器</button><button class="link" data-act="hotPoseBook"><i data-ic="book"></i> 姿勢圖鑑</button><button class="link" id="hz-lock"><i data-ic="lock"></i> 鎖上離開</button></div>`;
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
          <div class="pz-btns">${p.scene ? `<button class="btn sm ghost" data-swap="${i}">換一張</button>` : ''}${p.rare && round === 1 && !has2 ? `<button class="btn sm gold" id="pz-r2">開始 Round 2</button>` : ''}${p.pick ? `<button class="btn sm gold" data-pick="${i}">${esc(p.no === 64 ? '她' : p.no === 66 ? '他' : (c.r || ''))}從圖鑑挑一張</button>` : ''}${p.rare || p.pick || (day.doneKeys || []).includes(poseKey(p)) ? '' : `<button class="btn sm hot-btn" data-done="${i}">試過了</button>`}</div></div>`).join('')}</div>`;
      };
      body = row(1) + (has2 ? row(2) : '') + (all.length > 1 ? '<p class="small muted center" style="margin:6px 0 0">左右滑動看每一張</p>' : '');
    }
    m.querySelector('.modal').innerHTML = `${mhead('<i data-ic="star"></i> 今天的姿勢')}${body}
      <div class="center hz-links"><button class="link" data-act="hotPoseBook"><i data-ic="book"></i> 姿勢圖鑑</button><button class="link" id="pz-add"><i data-ic="plus"></i> 自己加一張</button></div>`;
    deal = false;
    wireFlip(m);
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
  return `<button class="icon-btn hot-moon ${hotMoonLit() ? 'lit' : ''}" data-act="hotSignal" aria-label="月亮"><svg viewBox="0 0 24 24" class="ic"><path d="M15 3.5 A8.5 8.5 0 1 0 20.5 15 A6.8 6.8 0 0 1 15 3.5 Z" fill="currentColor" stroke="none"/><path d="M19 4 l.6 1.4 l1.4 .6 l-1.4 .6 l-.6 1.4 l-.6 -1.4 l-1.4 -.6 l1.4 -.6 z" fill="currentColor"/></svg></button>`;
}
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
  m._onClose = () => render();
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
  m._onClose = hotRedrawHub;
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
