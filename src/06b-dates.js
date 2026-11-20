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
