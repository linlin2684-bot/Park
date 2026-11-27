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
    $('.pp', m).onclick = () => imgViewer(all.map((y) => y.src), i);   // 點照片放大看
    $('#av-p', m).onclick = () => { i--; draw(); };
    $('#av-n', m).onclick = () => { i++; draw(); };
    const d = $('#av-del', m);
    if (d) d.onclick = async () => { if (!(await confirmBox('確定刪除這張照片？', '刪除'))) return; await col('photos').remove(x.id); closeModal(m); toast('刪除了'); };
  };
  draw();
};

// ---------- 看大圖（11/27：時間軸、足跡的照片點了可以放大看） ----------
function imgViewer(srcs, i = 0) {
  srcs = srcs.filter(Boolean); if (!srcs.length) return;
  i = Math.max(0, Math.min(i, srcs.length - 1));
  const v = document.createElement('div');
  v.className = 'img-view';
  v.innerHTML = `<button class="iv-x" aria-label="關閉">✕</button><img alt=""><div class="iv-n"></div>
    ${srcs.length > 1 ? '<button class="iv-a iv-p" aria-label="上一張">‹</button><button class="iv-a iv-nx" aria-label="下一張">›</button>' : ''}`;
  const img = v.querySelector('img');
  const show = () => { img.src = srcs[i]; v.querySelector('.iv-n').textContent = srcs.length > 1 ? `${i + 1} / ${srcs.length}` : ''; };
  const go = (d) => { const n = i + d; if (n < 0 || n >= srcs.length) return; i = n; show(); };
  const close = () => { v.classList.add('out'); setTimeout(() => v.remove(), 220); };
  v.addEventListener('click', (e) => {
    e.stopPropagation();
    if (e.target.closest('.iv-p')) return go(-1);
    if (e.target.closest('.iv-nx')) return go(1);
    close();
  });
  let sx = null;
  v.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; }, { passive: true });
  v.addEventListener('touchend', (e) => { if (sx == null) return; const dx = e.changedTouches[0].clientX - sx; sx = null; if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1); });
  show(); document.body.appendChild(v);
}
ACT.viewImg = (el, e) => {
  e && e.stopPropagation();
  if (el.dataset.mid) { const mm = list('memories').find((x) => x.id === el.dataset.mid); return mm && imgViewer([mm.cover], 0); }
  if (el.dataset.trip) {
    const t = list('trips').find((x) => x.id === el.dataset.trip); if (!t) return;
    return imgViewer([t.cover, ...tripPhotos(t).map((x) => x.img)].filter(Boolean), +el.dataset.i || 0);
  }
  if (el.dataset.src) imgViewer([el.dataset.src], 0);
};
