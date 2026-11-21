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

    ${todos.length ? `<div class="card soft-todo">${todos.slice(0, S.todoAll ? 99 : 3).map((t) => `<div class="todo-item"><span class="ti">${t.icon}</span><span class="grow">${esc(t.text)}</span>
      <button class="btn sm" data-act="${t.act}" ${t.id ? `data-id="${t.id}"` : ''} ${t.tab ? `data-tab="${t.tab}"` : ''}>${t.btn}</button></div>`).join('')}${todos.length > 3 ? `<button class="link center todo-more" data-act="todoMore">${S.todoAll ? '收起來' : `還有 ${todos.length - 3} 件`}</button>` : ''}</div>` : ''}

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
