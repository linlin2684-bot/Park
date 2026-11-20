// ============================================================
//  小紙條：信紙、藏起來（從卡片底下露出一角／小小黑底下／小動物叼著走過）、
//  拆信動畫、紙條盒
// ============================================================
const NOTE_PAPERS = [
  { id: 'lined', name: '橫線' }, { id: 'grid', name: '格子' }, { id: 'sticky', name: '便條紙' }, { id: 'cat', name: '小小黑' },
];
// 墨水顏色：沒選就依信紙配一個
const NOTE_INKS = [
  { id: '', name: '自動' }, { id: '#4a3520', name: '咖啡' }, { id: '#2e2a33', name: '墨黑' }, { id: '#8c2340', name: '酒紅' },
  { id: '#24406b', name: '深藍' }, { id: '#2f5b47', name: '森綠' }, { id: '#5b3d86', name: '紫藤' }, { id: '#b0552a', name: '橘棕' },
];
const PAPER_INK = { lined: '#4a3520', grid: '#24406b', sticky: '#2e2a33', cat: '#8c2340' };
const noteInk = (n) => (n && n.ink) || PAPER_INK[(n && n.paper) || 'lined'] || '#4a3520';
const NOTE_CARRIERS = ['haohao', 'doggy', 'abian', 'calico', 'white', 'tuxedo', 'black'];
const paperCls = (n) => 'paper-' + ((n && n.paper) || 'lined');
const catCorner = '<svg class="paper-catmark" viewBox="0 0 40 30"><path d="M8 28 Q6 16 12 12 L11 3 L17 9 Q20 8 23 9 L29 3 L28 12 Q34 16 32 28 Z" fill="#2b2633"/><ellipse cx="16" cy="17" rx="2" ry="2.4" fill="#ffd970"/><ellipse cx="24" cy="17" rx="2" ry="2.4" fill="#ffd970"/><path d="M19 21 L21 21 L20 22 Z" fill="#ff9fb4"/></svg>';
const paperDeco = (n) => (((n && n.paper) || 'lined') === 'cat' ? catCorner : ((n && n.paper) === 'sticky' ? '<span class="paper-tape"></span>' : ''));
// 摺起來的紙條（藏起來時露出的那一角）
const foldedNoteSVG = (paper = 'lined') => {
  const fill = { lined: '#fffaf0', grid: '#f6f8fb', sticky: '#fff1a6', cat: '#fbf3ea' }[paper] || '#fffaf0';
  return `<svg viewBox="0 0 44 32" class="note-fold"><path d="M2 4 L36 2 L42 8 L40 30 L4 29 Z" fill="${fill}" stroke="#d8c3a4" stroke-width=".8"/><path d="M36 2 L36 9 L42 8 Z" fill="#e9dcc6" stroke="#d8c3a4" stroke-width=".6"/><path d="M8 13 H32 M8 18 H30 M8 23 H24" stroke="#d9c9ae" stroke-width=".9"/><circle cx="33" cy="23" r="4.2" fill="#c8283c"/><path d="M33 21.2 C32.4 20.2 30.8 20.4 30.8 21.8 C30.8 23 32.2 23.9 33 24.6 C33.8 23.9 35.2 23 35.2 21.8 C35.2 20.4 33.6 20.2 33 21.2 Z" fill="#f6c3cc"/></svg>`;
};

// ---------- 寫紙條 ----------
ACT.writeNote = () => {
  if (!partner()) return toast('對方加入後才能藏紙條喔');
  let paper = 'lined', ink = '';
  const m = openModal(`${mhead('寫一張小紙條')}
    <div class="np-pick">${NOTE_PAPERS.map((x) => `<button data-p="${x.id}" class="${x.id === paper ? 'on' : ''}"><span class="np-sw paper-${x.id}"></span>${x.name}</button>`).join('')}</div>
    <div class="np-ink">${NOTE_INKS.map((x) => `<button data-i="${x.id}" class="${x.id === ink ? 'on' : ''}" title="${x.name}"><span style="background:${x.id || 'conic-gradient(#4a3520,#24406b,#8c2340,#2f5b47,#4a3520)'}"></span><small>${x.name}</small></button>`).join('')}</div>
    <div class="letter note-paper ${paperCls({ paper })}" id="nw-paper" style="--ink:${noteInk({ paper, ink })}"><textarea id="nw-t" maxlength="300" placeholder="想對 ${esc(nick(partner()))} 說的話…"></textarea>${paperDeco({ paper })}</div>
    <button class="btn block mt" id="nw-ok"><i data-ic="letter"></i> 折起來，藏好</button>`, { center: true, cls: 'note-write' });
  // 紙條跟著字變大
  const ta = $('#nw-t', m), grow = () => { ta.style.height = 'auto'; ta.style.height = Math.max(58, ta.scrollHeight) + 'px'; };
  ta.addEventListener('input', grow); grow();
  $$('.np-pick button', m).forEach((b) => b.onclick = () => {
    paper = b.dataset.p;
    $$('.np-pick button', m).forEach((x) => x.classList.toggle('on', x === b));
    const pp = $('#nw-paper', m); pp.className = `letter note-paper ${paperCls({ paper })}`;
    pp.querySelectorAll('.paper-catmark,.paper-tape').forEach((x) => x.remove()); pp.insertAdjacentHTML('beforeend', paperDeco({ paper }));
    pp.style.setProperty('--ink', noteInk({ paper, ink }));
  });
  $$('.np-ink button', m).forEach((b) => b.onclick = () => {
    ink = b.dataset.i;
    $$('.np-ink button', m).forEach((x) => x.classList.toggle('on', x === b));
    $('#nw-paper', m).style.setProperty('--ink', noteInk({ paper, ink }));
  });
  $('#nw-ok', m).onclick = async () => {
    const text = $('#nw-t', m).value.trim();
    if (!text) return toast('先寫點什麼');
    $('#nw-ok', m).disabled = true;
    // 藏的地方：卡片底下露出一角／小小黑底下／小動物叼著走過
    const r = Math.random();
    const spot = r < .5 ? { kind: 'peek', tab: pick(TABS).id, idx: Math.floor(Math.random() * 20) }
      : r < .75 ? { kind: 'pet', tab: 'home' } : { kind: 'carry', tab: 'home', who: pick(NOTE_CARRIERS) };
    await col('notes').add({ by: me(), to: partner(), text, paper, ...(ink ? { ink } : {}), found: false, spot, at: now() });
    // 折起來＋封蠟
    const pp = $('#nw-paper', m); pp.classList.add('folding'); sfx('pop');
    setTimeout(() => { pp.innerHTML = `<div class="nw-sealed">${foldedNoteSVG(paper)}</div>`; pp.classList.add('sealed'); sfx('stamp'); }, 650);
    setTimeout(() => { closeModal(m); toast(`藏好了，看 ${nick(partner())} 什麼時候發現`); }, 1600);
  };
};

// ---------- 藏起來的樣子 ----------
function placeHiddenNotes(main) {
  const mine = list('notes').filter((n) => n.to === me() && !n.found && n.spot && n.spot.tab === S.tab);
  for (const n of mine) {
    const sp = n.spot;
    if (sp.kind === 'carry') continue; // 交給路過的小動物
    let host = null;
    if (sp.kind === 'pet') host = main.querySelector('.pet-card');
    if (sp.kind === 'peek' || !host) { const cards = [...main.querySelectorAll('.card')].filter((c) => !c.parentElement.closest('.card') && !c.closest('.modal-back')); if (cards.length) host = cards[(sp.idx || 0) % cards.length]; }
    if (!host || sp.x != null && !sp.kind) {
      const b = document.createElement('button');
      b.className = 'hidden-note'; b.innerHTML = ic('letter'); b.dataset.act = 'findNote'; b.dataset.id = n.id;
      b.style.left = (sp.x || 50) + '%'; b.style.top = (sp.y || 50) + '%';
      main.appendChild(b); continue;
    }
    // 從卡片底下露出一角（掛在卡片本身，排版變動也跟著走）
    host.classList.add('has-peek');
    const b = document.createElement('button');
    b.className = 'note-peek side-' + ((n.id.charCodeAt(0) % 2) ? 'r' : 'l'); b.innerHTML = foldedNoteSVG(n.paper); b.dataset.act = 'findNote'; b.dataset.id = n.id;
    host.appendChild(b);
  }
}
// 小動物叼著紙條走過首頁（找到之前，每兩分鐘最多出現一次）
function carryStroll() {
  const n = list('notes').find((x) => x.to === me() && !x.found && x.spot?.kind === 'carry');
  if (!n || now() - +(localStorage.getItem('park-carry-at') || 0) < 120000) return false;
  localStorage.setItem('park-carry-at', now());
  const el = walker(n.spot.who || 'haohao');
  el.classList.add('carrying');
  el.insertAdjacentHTML('beforeend', `<span class="carry-note">${foldedNoteSVG(n.paper)}</span>`);
  const timer = setTimeout(() => el.remove(), 9500);
  el.onclick = () => { clearTimeout(timer); el.classList.add('caught'); setTimeout(() => el.remove(), 1400); ACT.findNote({ dataset: { id: n.id } }); };
  document.body.appendChild(el);
  return true;
}

// ---------- 拆信 ----------
ACT.findNote = async (el) => {
  const n = list('notes').find((x) => x.id === el.dataset.id);
  if (!n) return;
  document.querySelectorAll(`.note-peek[data-id="${n.id}"]`).forEach((x) => x.remove());
  vibrate(40);
  const m = openModal(`<div class="nt-stage" id="nt-st">
      <div class="nt-title">你找到一張小紙條！</div>
      <div class="nt-env"><div class="nt-back"></div><div class="nt-letter letter note-paper ${paperCls(n)}" style="--ink:${noteInk(n)}"><div class="nt-text"></div>${paperDeco(n)}</div><div class="nt-front"></div><div class="nt-flap"></div><div class="nt-seal"><svg viewBox="-12 -12 24 24"><circle r="11" fill="#c8283c"/><circle r="8.5" fill="none" stroke="#9e1d2e" stroke-width="1"/><path d="M0 -1.6 C-1 -3.6 -4.4 -3.4 -4.4 -.6 C-4.4 1.8 -1.6 3.6 0 5 C1.6 3.6 4.4 1.8 4.4 -.6 C4.4 -3.4 1 -3.6 0 -1.6 Z" fill="#f6c3cc"/></svg></div></div>
      <div class="nt-hint small muted">點一下拆開</div>
    </div>`, { center: true, cls: 'note-open' });
  const st = $('#nt-st', m);
  let opened = false;
  const open = async () => {
    if (opened) return; opened = true;
    st.classList.add('s1'); sfx('pop'); vibrate(20);              // 封蠟彈開
    await sleep(380); st.classList.add('s2');                      // 掀開信封蓋
    await sleep(450); st.classList.add('s3'); sfx('flip');         // 信紙抽出來展開
    await sleep(700); st.classList.add('s4');
    confetti(36, ['#ff6f91', '#ffc2d1', '#fff']);
    // 字一個一個浮出來：先是漸層色，再慢慢定成墨水的顏色
    const box = $('.nt-text', m), chars = Array.from(n.text), step = Math.max(6, Math.min(16, 1800 / chars.length));
    for (let i = 0; i < chars.length; i++) {
      const sp = document.createElement('span'); sp.className = chars[i] === '\n' ? '' : 'ink-ch'; sp.textContent = chars[i];
      sp.style.setProperty('--d', `${(i % 12) * 30}ms`); box.appendChild(sp);
      if (i % 2 === 1) await sleep(step * 2);
    }
    st.classList.add('s5');
  };
  st.onclick = open;
  setTimeout(open, 1400);
  if (!n.found) {
    await col('notes').update(n.id, { found: true, foundAt: now() });
    await notify(n.by, 'note', '你藏的小紙條被找到了 💌');
  }
};

// ---------- 紙條盒 ----------
// 搜尋：關鍵字或日期（2026/11/20、11/20、11月、2026-11、2026 都可以）
function noteKey(n) {
  const ds = [n.at, n.foundAt].filter(Boolean).map((t) => { const d = new Date(t), y = d.getFullYear(), m = d.getMonth() + 1, dd = d.getDate();
    return `${y}/${m}/${dd} ${y}/${pad(m)}/${pad(dd)} ${y}-${pad(m)}-${pad(dd)} ${y}.${pad(m)}.${pad(dd)} ${m}/${dd} ${pad(m)}/${pad(dd)} ${y}年${m}月${dd}日 ${m}月${dd}日 ${y}-${pad(m)} ${y}/${m}`; }).join(' ');
  return (n.text + ' ' + ds).toLowerCase();
}
function noteMatch(n, q) { return q.trim().toLowerCase().split(/\s+/).filter(Boolean).every((w) => noteKey(n).includes(w)); }
ACT.noteBox = (el, _e, tab = 'got') => {
  const got = list('notes').filter((n) => n.to === me() && n.found).sort((a, b) => (b.foundAt || b.at) - (a.foundAt || a.at));
  const hidden = list('notes').filter((n) => n.to === me() && !n.found).length;
  const mine = list('notes').filter((n) => n.by === me()).sort((a, b) => b.at - a.at);
  const tabName = { home: '首頁', wallet: '票夾', play: '遊樂區', travel: '約會', memory: '回憶' };
  const where = (n) => (n.spot?.kind === 'carry' ? `交給${FRIENDS[n.spot.who]?.name || '小動物'}叼著` : n.spot?.kind === 'pet' ? '藏在小小黑底下' : `藏在「${tabName[n.spot?.tab] || '某個'}」分頁`);
  const m = openModal(`${mhead('紙條盒')}
    <div class="nb-search"><i data-ic="search"></i><input id="nb-q" type="text" enterkeyhint="search" placeholder="搜尋紙條裡的字" autocomplete="off"><button id="nb-x" class="hidden" aria-label="清除">✕</button><button id="nb-cal" class="nb-calbtn" aria-label="用日曆找"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10 H20.5 M8 3 V7 M16 3 V7"/><circle cx="12" cy="15" r="1.3" fill="currentColor" stroke="none"/></svg></button></div>
    <div id="nb-calbox" class="nb-calbox hidden"></div>
    <div id="nb-day" class="nb-day hidden"></div>
    <div class="seg" id="nb-seg"><button data-t="got" class="${tab === 'got' ? 'on' : ''}">收到的 ${got.length}</button><button data-t="mine" class="${tab === 'mine' ? 'on' : ''}">我藏的 ${mine.length}</button></div>
    ${tab === 'got' ? `
      ${hidden ? `<p class="small center nb-tease">${esc(nick(partner()))} 還藏了 ${hidden} 張紙條給你，還沒找到</p>` : ''}
      <div class="nb-grid">${got.map((n, i) => `<button class="nb-note letter note-paper ${paperCls(n)}" data-k="${esc(noteKey(n))}" data-id="${n.id}" style="--r:${((i % 5) - 2) * 1.4}deg;--ink:${noteInk(n)}"><span class="nb-txt">${esc(n.text)}</span><span class="nb-meta">${new Date(n.foundAt || n.at).toLocaleDateString('zh-TW')}</span>${paperDeco(n)}</button>`).join('') || '<p class="small muted center" style="grid-column:1/-1">還沒有找到紙條，四處看看吧</p>'}</div>`
    : `<div class="nb-list">${mine.map((n) => `<div class="nb-row" data-k="${esc(noteKey(n))}"><span class="nb-fold">${foldedNoteSVG(n.paper)}</span><span class="grow"><span class="nb-rt">${esc(n.text)}</span><small class="muted">${new Date(n.at).toLocaleDateString('zh-TW')}・${where(n)}</small></span><span class="chip ${n.found ? 'ok' : ''}">${n.found ? `已被找到 ${new Date(n.foundAt).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' })}` : '還藏著'}</span></div>`).join('') || '<p class="small muted center">還沒藏過紙條</p>'}</div>`}`,
  { center: true, cls: 'note-box' });
  $$('#nb-seg button', m).forEach((b) => b.onclick = () => { const q = $('#nb-q', m).value; closeModal(m); ACT.noteBox(null, null, b.dataset.t); const nm = [...document.querySelectorAll('.note-box')].pop(); if (nm && q) { const i = nm.querySelector('#nb-q'); i.value = q; i.dispatchEvent(new Event('input')); } });
  // 日曆：有紙條的日子會有小點，點一下只看那天的
  const pool = tab === 'got' ? got : mine;
  const dayOf = (t) => dkey(new Date(t));
  const days = new Set(pool.flatMap((n) => [n.at, n.foundAt].filter(Boolean).map(dayOf)));
  let pickDay = '', cur = new Date(); cur.setDate(1);
  const drawCal = () => {
    const y = cur.getFullYear(), mo = cur.getMonth(), first = new Date(y, mo, 1).getDay(), dim = new Date(y, mo + 1, 0).getDate();
    let cells = '';
    for (let i = 0; i < first; i++) cells += '<span></span>';
    for (let d = 1; d <= dim; d++) { const k = `${y}-${pad(mo + 1)}-${pad(d)}`; cells += `<button data-d="${k}" class="${days.has(k) ? 'has' : ''} ${k === pickDay ? 'on' : ''} ${k === dkey() ? 'today' : ''}">${d}</button>`; }
    $('#nb-calbox', m).innerHTML = `<div class="nc-head"><button data-mv="-1">‹</button><b>${y} 年 ${mo + 1} 月</b><button data-mv="1">›</button></div>
      <div class="nc-week">${'日一二三四五六'.split('').map((w) => `<span>${w}</span>`).join('')}</div><div class="nc-grid">${cells}</div>`;
    $$('#nb-calbox [data-mv]', m).forEach((b) => b.onclick = () => { cur.setMonth(cur.getMonth() + +b.dataset.mv); drawCal(); });
    $$('#nb-calbox [data-d]', m).forEach((b) => b.onclick = () => { pickDay = pickDay === b.dataset.d ? '' : b.dataset.d; $('#nb-calbox', m).classList.add('hidden'); filter(); });
  };
  $('#nb-cal', m).onclick = () => { const box = $('#nb-calbox', m); box.classList.toggle('hidden'); if (!box.classList.contains('hidden')) drawCal(); };
  const filter = () => {
    const q = $('#nb-q', m).value.trim().toLowerCase(), ws = q.split(/\s+/).filter(Boolean).concat(pickDay ? [pickDay] : []);
    const dd = $('#nb-day', m);
    dd.classList.toggle('hidden', !pickDay); $('#nb-cal', m).classList.toggle('on', !!pickDay);
    if (pickDay) { const [yy, mm, d2] = pickDay.split('-').map(Number); dd.innerHTML = `${yy} 年 ${mm} 月 ${d2} 日的紙條 <button aria-label="取消日期">✕</button>`; dd.querySelector('button').onclick = () => { pickDay = ''; filter(); }; }
    let shown = 0;
    $$('[data-k]', m).forEach((x) => { const ok = ws.every((w) => x.dataset.k.includes(w)); x.style.display = ok ? '' : 'none'; if (ok) shown++; });
    $('#nb-x', m).classList.toggle('hidden', !q);
    let em = $('#nb-empty', m);
    if ((q || pickDay) && !shown) { if (!em) { em = document.createElement('p'); em.id = 'nb-empty'; em.className = 'small muted center'; $('.nb-grid, .nb-list', m).after(em); } em.textContent = q ? `找不到「${q}」的紙條` : '那天沒有紙條'; }
    else if (em) em.remove();
  };
  $('#nb-q', m).addEventListener('input', filter);
  $('#nb-x', m).onclick = () => { $('#nb-q', m).value = ''; filter(); };
  $$('.nb-note', m).forEach((b) => b.onclick = () => {
    const n = list('notes').find((x) => x.id === b.dataset.id);
    openModal(`<div class="letter note-paper ${paperCls(n)} nb-read" style="--ink:${noteInk(n)}">${esc(n.text)}${paperDeco(n)}</div>`, { center: true });
  });
};
