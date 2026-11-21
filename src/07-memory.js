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

