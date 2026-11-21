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
      <p class="center small muted">我的點數：<i data-ic="coin"></i> ${balance(me())} · 機率 N ${D.RARITY.N.weight}% / R ${D.RARITY.R.weight}% / SR ${D.RARITY.SR.weight}% / SSR ${D.RARITY.SSR.weight}%</p>
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
    sfx(rarity === 'SSR' ? 'sparkle' : rarity === 'SR' ? 'chime' : 'pop');
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
