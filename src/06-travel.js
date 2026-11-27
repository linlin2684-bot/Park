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

// 找地點：先找台灣，台灣找不到才找國外（11/27：「巴哈迪」被找到國外去）
async function placeSearch(q, twOnly = false) {
  const go = async (extra) => {
    const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&accept-language=zh-TW${extra}&q=${encodeURIComponent(q)}`);
    const j = await r.json();
    return j && j[0] ? { lat: +j[0].lat, lng: +j[0].lon } : null;
  };
  return (await go('&countrycodes=tw')) || (twOnly ? null : await go(''));
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
      const j = await placeSearch(q);
      if (!j) return toast('找不到，直接在地圖上點吧');
      const lat = j.lat, lng = j.lng;
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
// 每個人各寫一段心得；舊資料只有建立的人寫的 note
function tripSays(t) { const o = { ...(t.notes || {}) }; if (t.note && !o[t.by]) o[t.by] = t.note; return o; }
function tripSaysHTML(t) {
  const o = tripSays(t);
  return (S.couple.members || []).filter((u) => o[u]).map((u) => `<div class="letter trip-say"><small>${esc(nick(u))}的心得</small>${esc(o[u])}</div>`).join('');
}
function tripPhotos(t) {
  const a = t.date, b = t.dateEnd || t.date;
  return list('photos').filter((x) => x.tripId === t.id || (!x.tripId && a && x.date >= a && x.date <= b)).sort((x, y) => (x.date || '').localeCompare(y.date || ''));
}
ACT.openTrip = (el) => {
  const t = list('trips').find((x) => x.id === el.dataset.id); if (!t) return;
  const m = openModal(`${mhead('<i data-ic="pin"></i> ' + esc(t.name))}
    ${t.cover ? `<img src="${t.cover}" style="width:100%;border-radius:16px;display:block">` : ''}
    <p class="small muted">${esc(t.date || '')} · ${esc(nick(t.by))} 記錄</p>
    ${tripSaysHTML(t)}
    <button class="btn sm ghost" id="tp-say" style="margin:0 0 10px">${tripSays(t)[me()] ? '改我的心得' : '寫我的心得'}</button>
    ${(() => { const ps = tripPhotos(t); return ps.length ? `<div class="trip-ph"><div class="small muted">這趟的照片（${ps.length}）</div><div class="trip-ph-g">${ps.map((x) => `<img src="${x.img}" alt="">`).join('')}</div></div>` : ''; })()}
    <div class="btn-row">${t.lat != null && S.map ? '<button class="btn ghost" id="tp-go">在地圖上看</button>' : ''}<button class="btn ghost" id="tp-ed"><i data-ic="pin"></i> 改地點／日期</button>${t.by === me() ? '<button class="btn ghost" id="tp-del">刪除</button>' : ''}</div>`);
  $('#tp-ed', m).onclick = () => { closeModal(m); setTimeout(() => ACT.editTrip(el), 200); };
  $('#tp-say', m).onclick = async () => {
    const cur = tripSays(t)[me()] || '';
    const m2 = openModal(`${mhead('我的心得')}<p class="small muted">${esc(t.name)}・寫下這趟最想記住的事</p>
      <textarea id="ts-t" maxlength="300" placeholder="這趟最難忘的是…">${esc(cur)}</textarea><button class="btn block mt" id="ts-ok">存起來</button>`, { center: true });
    $('#ts-ok', m2).onclick = async () => {
      const v = $('#ts-t', m2).value.trim();
      const said = { ...(t.notes || {}) }; if (v) said[me()] = v; else delete said[me()];
      const up = { notes: said };
      if (t.by === me() && t.note) up.note = v;   // 舊的心得欄位是建立的人寫的，跟著改
      await col('trips').update(t.id, up);
      closeModal(m2); closeModal(m); toast('心得存好了'); ACT.openTrip(el);
    };
  };
  $('#tp-go', m) && ($('#tp-go', m).onclick = () => { closeModal(m); S.map.setView([t.lat, t.lng], 12); window.scrollTo({ top: 0, behavior: 'smooth' }); });
  $('#tp-del', m) && ($('#tp-del', m).onclick = async () => { if (await confirmBox('刪除這個足跡？')) { await col('trips').remove(t.id); closeModal(m); } });
};

// 足跡可以自己改：名字、日期、地圖上的位置（點地圖重新標、搜尋、或拿掉位置）、封面（11/27）
ACT.editTrip = (el) => {
  const t0 = list('trips').find((x) => x.id === el.dataset.id); if (!t0) return;
  const t = { lat: t0.lat ?? null, lng: t0.lng ?? null, cover: t0.cover || '' };
  const m = openModal(`${mhead('<i data-ic="pin"></i> 改足跡')}
    <label>地點名稱</label>
    <div class="row"><input id="te-n" maxlength="30" value="${esc(t0.name || '')}" class="grow"><button class="btn sm ghost" id="te-s"><i data-ic="search"></i> 找</button></div>
    <label>在地圖上點一下，就把位置移到那裡</label>
    <div class="mini-map" id="te-map"></div>
    <div class="row" style="justify-content:space-between;align-items:center"><span class="small muted" id="te-where">${t.lat != null ? (inTaiwan(t.lat, t.lng) ? '目前標在台灣' : '目前標在國外') : '目前沒有標位置'}</span><button class="btn sm ghost" id="te-clr">拿掉位置</button></div>
    <div class="row"><div class="grow"><label>日期</label><input id="te-d" type="date" value="${esc(t0.date || '')}"></div><div class="grow"><label>到哪天（可不填）</label><input id="te-d2" type="date" value="${esc(t0.dateEnd || '')}"></div></div>
    <label>封面照片</label>
    <label class="photo-pick" id="te-pp" style="margin:0;${t.cover ? `background-image:url(${t.cover})` : ''}">${t.cover ? '' : '點這裡選照片'}<input type="file" accept="image/*" id="te-f" class="hidden"></label>
    <button class="btn block mt" id="te-ok">存起來</button>`);
  let mk = null, mm = null;
  const where = () => { $('#te-where', m).textContent = t.lat != null ? (inTaiwan(t.lat, t.lng) ? '目前標在台灣' : '目前標在國外') : '目前沒有標位置'; };
  const setPt = (lat, lng) => {
    t.lat = lat; t.lng = lng; where();
    if (!mm) return;
    if (lat == null) { if (mk) { mm.removeLayer(mk); mk = null; } return; }
    if (mk) mk.setLatLng([lat, lng]); else mk = L.marker([lat, lng], { icon: L.divIcon({ html: `<div class="map-pin">${ic('pin')}</div>`, className: '', iconSize: [20, 20] }) }).addTo(mm);
  };
  setTimeout(() => {
    if (!window.L) { $('#te-map', m).outerHTML = '<p class="small muted">地圖載入失敗，等一下再試</p>'; return; }
    mm = L.map($('#te-map', m), { zoomControl: false }).setView(t.lat != null ? [t.lat, t.lng] : [23.7, 121], t.lat != null ? 12 : 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '© OSM' }).addTo(mm);
    mm.on('click', (e) => setPt(e.latlng.lat, e.latlng.lng));
    if (t.lat != null) setPt(t.lat, t.lng);
  }, 350);
  $('#te-s', m).onclick = async () => {
    const q = $('#te-n', m).value.trim(); if (!q) return toast('先輸入地點名稱');
    try {
      const j = await placeSearch(q);
      if (!j) return toast('找不到，直接在地圖上點吧');
      setPt(j.lat, j.lng); mm && mm.setView([j.lat, j.lng], 13);
    } catch (e) { toast('搜尋失敗，直接在地圖上點吧'); }
  };
  $('#te-clr', m).onclick = () => setPt(null, null);
  $('#te-f', m).onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try { t.cover = await compressImage(f); $('#te-pp', m).style.backgroundImage = `url(${t.cover})`; $('#te-pp', m).firstChild.textContent = ''; }
    catch (err) { toast('照片讀取失敗'); }
  };
  $('#te-ok', m).onclick = async () => {
    const name = $('#te-n', m).value.trim(); if (!name) return toast('地點要有名字');
    const date = $('#te-d', m).value, d2 = $('#te-d2', m).value;
    await col('trips').update(t0.id, { name, date, dateEnd: d2 && date && d2 > date ? d2 : S.store.DEL(), lat: t.lat, lng: t.lng, cover: t.cover });
    closeModal(m); toast('足跡改好了 📍');
    setTimeout(() => ACT.openTrip(el), 250);
  };
};
