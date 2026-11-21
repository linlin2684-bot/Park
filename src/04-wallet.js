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
// 收藏冊：拿到就算收集到，不用兌換（11/22 晽晽要求；生日系列集滿就解鎖封面標語）
function seriesCollected(c) { return true; }
function walletBook() {
  S.bookShut ||= {}; S.bookData = {};
  const ms = S.couple.members || [me()];
  // 節日、旅行卡兩人各一張，只看自己那份
  const all = list('cards').filter((c) => c.series && !((c.series === '節日系列' || c.series === '旅行系列' || SERIES_SLOTS[c.series]) && c.owner !== me()));
  // 許願系列依「誰許的願」分成兩本
  const keyOf = (c) => (c.series === WISH_SERIES ? `wish:${c.owner}` : c.series === D.BIRTHDAY_SERIES ? `bday:${c.owner}` : c.series);
  const groups = {};
  all.forEach((c) => (groups[keyOf(c)] ||= []).push(c));
  const books = [
    // 生日系列：誰的票夾裡的就分成誰的一本（11/22 晽晽要求）；都還沒有時留一本空的
    ...(() => { const who = ms.filter((u) => groups[`bday:${u}`]); return who.length ? who.map((u) => ({ key: `bday:${u}`, series: D.BIRTHDAY_SERIES, title: `${nick(u)}的生日卡`, owner: u })) : [{ key: 'bday:none', series: D.BIRTHDAY_SERIES, title: D.BIRTHDAY_SERIES }]; })(),
    ...ms.map((u) => ({ key: `wish:${u}`, series: WISH_SERIES, title: `${nick(u)}的許願卡`, owner: u })),
    { key: '節日系列', series: '節日系列', title: '節日系列' },
    { key: '旅行系列', series: '旅行系列', title: '旅行系列' },
    { key: '約會系列', series: '約會系列', title: '約會系列' },
    { key: '小小黑系列', series: '小小黑系列', title: '小小黑系列' },
    { key: '想你系列', series: '想你系列', title: '想你系列' },
    { key: '成就系列', series: '成就系列', title: '成就系列' },
    ...Object.keys(groups).filter((k) => !k.startsWith('wish:') && !k.startsWith('bday:') && !BOOK_META[k]).map((k) => ({ key: k, series: k, title: k })),
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
      slogan: isB ? `「${D.BIRTHDAY_SLOGAN}」` : '', sloganOn: isB && cs.length >= D.BIRTHDAY_CARDS.length + D.BIRTHDAY_COLLECTIBLES.length,   // 整套到齊才亮標語
    });
    // 拿到的照稀有度排前面，沒拿到的空卡套照稀有度排後面
    const rk = (x) => (x.kind === 'collect' ? 99 : rarityRank(x.rarity));
    S.bookData[b.key] = { title: b.title, pal: meta.pal, isB, wish: b.series === WISH_SERIES,
      cards: [...cs].sort((a, c) => rk(a) - rk(c) || a.at - c.at), slots: [...slots].sort((a, c) => rk(a) - rk(c)) };
    const canOpen = !(empty && !slots.length);
    toc.push({ bi, pal: meta.pal, motif: meta.motif, name: b.title.replace('系列', '').replace('的許願卡', ' 許願').replace('的生日卡', ' 生日'), got, total: allSlots ? allSlots.length : cs.length });
    return `<div class="book emb-${meta.pal}" id="bk-${bi}">
      <button class="book-cover2" ${canOpen ? `data-act="bookOpen" data-k="${esc(b.key)}"` : ''}>${svg}</button>
      <div class="book-note">${!canOpen ? esc(meta.how) : `已收集 ${got} 張・點封面翻開`}</div>
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
