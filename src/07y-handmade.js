
// ============================================================
//  收藏冊「親手做的」：對方親手做、親手送你的卡，按一下收進來（11/22 她要的）
//  收進來的是當下卡面的副本，卡片用完或刪掉了，收藏冊裡還在
//  資料放在空間文件的 keeps.{卡片 id}；兩個人共用一本「親手做的」（11/22 她要合成一本）
// ============================================================
const KEEP_SERIES = '親手做的';
// 可以收的卡：對方送給我的、不是系列卡／珍藏卡、也不是扭蛋卡池裡的卡（那些在「兌換卡」那本）
// 收到的人或做卡的人都可以收；收過一次兩個人就都看得到
function canKeep(c) {
  if (!c || c.from === 'sys' || !c.from || c.from === c.owner || c.series || c.kind === 'collect') return false;
  if (c.owner !== me() && c.from !== me()) return false;
  return !list('pool').some((p) => p.title === c.title);
}
const allKeeps = () => Object.entries(S.couple?.keeps || {}).filter(([, k]) => k).map(([id, k]) => ({ id, ...k })).sort((a, b) => (a.keptAt || 0) - (b.keptAt || 0));
const isKept = (id) => !!(S.couple?.keeps || {})[id];

// 封面圖騰：羽毛筆＋封蠟愛心
const _bookMotifKeep = bookMotif;
bookMotif = (kind) => {
  if (kind !== 'quill') return _bookMotifKeep(kind);
  return `<path d="M22 -34 C6 -26 -8 -8 -14 14 L-10 16 C-2 -4 10 -20 24 -30 Z" class="e-bg e-ink-s" stroke-width="1.5" stroke-linejoin="round"/>
    <path d="M22 -34 C12 -24 2 -8 -12 15" class="e-ink-s" stroke-width="1" fill="none"/>
    <path d="M14 -26 L6 -24 M8 -16 L0 -14 M2 -6 L-5 -4" class="e-acc-s" stroke-width="1.3" stroke-linecap="round"/>
    <path d="M-14 14 L-17 24" class="e-ink-s" stroke-width="1.6" stroke-linecap="round"/>
    <circle cx="10" cy="20" r="13" class="e-acc-f e-ink-s" stroke-width="1.3"/>
    <path d="M-3 20 Q-1 9 10 7 Q21 9 23 20 Q21 31 10 33 Q-1 31 -3 20" class="e-ink-s" stroke-width=".8" fill="none" stroke-dasharray="1.6 2"/>
    <path d="M10 25 C6 22 4.5 20 4.5 17.8 C4.5 15.6 6.4 14.4 8.2 15.2 C9.1 15.6 9.7 16.3 10 17 C10.3 16.3 10.9 15.6 11.8 15.2 C13.6 14.4 15.5 15.6 15.5 17.8 C15.5 20 14 22 10 25 Z" class="e-bg"/>
    <path d="M-30 -20 l1.2 2.6 l2.6 1.2 l-2.6 1.2 l-1.2 2.6 l-1.2 -2.6 l-2.6 -1.2 l2.6 -1.2 z" class="e-ink-f"/>
    <circle cx="-26" cy="26" r="1.4" class="e-ink-f"/><circle cx="30" cy="-6" r="1.2" class="e-ink-f"/>`;
};
BOOK_META[KEEP_SERIES] = { pal: 'SR', motif: 'quill', pat: 'sparkle', sub: '我們親手寫給對方的卡', how: '對方送你的卡，打開後按「收進收藏冊」' };

// 收藏冊目錄和封面：每個人一本
const _walletBookKeep = walletBook;
walletBook = () => {
  let html = _walletBookKeep();
  const ks = allKeeps(), title = KEEP_SERIES, meta = BOOK_META[KEEP_SERIES];
  const svg = bookCoverSVG(meta, { title, sub: meta.sub, got: ks.length, total: ks.length, empty: !ks.length });
  const toc = `<button class="bt-item emb-SR" data-act="bookJump" data-i="keep">
      <svg viewBox="-44 -44 88 88" class="bt-medal"><circle r="41" class="e-bg e-ink-s" stroke-width="2"/><circle r="36" class="e-acc-s" stroke-width="1" fill="none"/><g transform="scale(.82)">${bookMotif('quill')}</g></svg>
      <b>${title}</b><small>${ks.length} 張</small></button>`;
  const books = `<div class="book emb-SR" id="bk-keep">
      <button class="book-cover2" data-act="keepBookOpen">${svg}</button>
      <div class="book-note">${ks.length ? `收了 ${ks.length} 張・點封面翻開` : '互相送的卡，打開後按「收進收藏冊」就會收進來'}</div></div>`;
  const i = html.indexOf('<div class="book-toc">');
  if (i < 0) return books + html;
  const j = html.indexOf('</div>', i);
  // 放在「兌換卡」後面
  const tocInner = html.slice(i + 22, j);
  const k = tocInner.indexOf('</button>');
  const newToc = k < 0 ? toc + tocInner : tocInner.slice(0, k + 9) + toc + tocInner.slice(k + 9);
  const afterToc = html.slice(j + 6);
  const bp = afterToc.indexOf('<div class="book emb-R" id="bk-pool">');
  const bpEnd = bp < 0 ? -1 : afterToc.indexOf('</div></div>', bp);
  const rest = bpEnd < 0 ? books + afterToc : afterToc.slice(0, bpEnd + 12) + books + afterToc.slice(bpEnd + 12);
  return html.slice(0, i) + '<div class="book-toc">' + newToc + '</div>' + rest;
};

// 翻開：一頁 6 張，原本的卡面＋封蠟小章
ACT.keepBookOpen = (el) => {
  const ks = allKeeps();
  if (!ks.length) return toast('打開對方送的卡，按「收進收藏冊」');
  const PER = 6, pages = [];
  for (let i = 0; i < ks.length; i += PER) pages.push(ks.slice(i, i + PER));
  const seal = '<svg viewBox="-12 -12 24 24" class="keep-seal"><circle r="10.5" class="ks-o"/><circle r="8" class="ks-i"/><path d="M0 4.6 C-3.4 2 -4.6 .4 -4.6 -1.4 C-4.6 -3.2 -3 -4.2 -1.6 -3.6 C-.8 -3.2 -.3 -2.6 0 -2 C.3 -2.6 .8 -3.2 1.6 -3.6 C3 -4.2 4.6 -3.2 4.6 -1.4 C4.6 .4 3.4 2 0 4.6 Z" class="ks-h"/></svg>';
  const m = openModal(`<button class="m-close db-close" data-act="close">✕</button>
    <div class="db-track">${pages.map((pg, pi) => `<section class="db-page alb-page keep-page">
      <div class="alb-head"><b>親手做的</b><span>${pages.length > 1 ? `${pi + 1} / ${pages.length}` : ''}</span></div>
      <div class="alb-grid keep-grid">${pg.map((k) => `<button class="alb-card keep-card emb-${embPalette(k)}" data-kid="${k.id}">${emblemSVG(k)}${seal}<span class="keep-date">${esc(nick(k.from))} · ${fmtDate(k.at || k.keptAt)}</span></button>`).join('')}${Array.from({ length: PER - pg.length }, () => '<div class="alb-blank"></div>').join('')}</div>
    </section>`).join('')}</div>`, { center: true, cls: 'db-modal' });
  $$('[data-kid]', m).forEach((b) => b.onclick = () => keepDetail(b.dataset.kid));
};

function keepDetail(id) {
  const k = (S.couple.keeps || {})[id]; if (!k) return;
  const live = list('cards').find((c) => c.id === id);
  const used = live ? (live.used || 0) : (k.used || 0);
  const v = openModal(`${mhead('親手做的')}
    <div class="ritual">${bigCardHTML({ ...k, id }, {})}</div>
    <div class="keep-info">
      <div><span>${esc(nick(k.from))} 做給</span>${esc(nick(k.to || k.owner))}</div>
      <div><span>收到那天</span>${fmtDate(k.at || k.keptAt)}</div>
      <div><span>收進來</span>${fmtDate(k.keptAt)}</div>
      <div><span>兌換過</span>${used ? used + ' 次' : '還沒兌換'}${live ? '' : '（卡片已經用完）'}</div>
    </div>
    <div class="keep-memo">${k.memo ? `「${esc(k.memo)}」` : '<span class="muted">寫一句收到這張卡時的心情</span>'}</div>
    <div class="btn-row"><button class="btn ghost" id="kp-memo">${k.memo ? '改這句話' : '寫一句'}</button><button class="btn ghost" id="kp-del">從收藏冊拿掉</button></div>`, { center: true });
  $('#kp-memo', v).onclick = async () => {
    const t = await promptBox('收到這張卡時的心情', { value: k.memo || '', placeholder: '例如：那天他偷偷塞在我包包裡' });
    if (t == null) return;
    await S.store.updateCouple(S.cid, { [`keeps.${id}.memo`]: t.trim().slice(0, 60) });
    closeModal(v); setTimeout(() => keepDetail(id), 150);
  };
  $('#kp-del', v) && ($('#kp-del', v).onclick = async () => {
    if (!(await confirmBox('從收藏冊拿掉這張？（票夾裡的卡不會受影響）', '拿掉'))) return;
    await S.store.updateCouple(S.cid, { [`keeps.${id}`]: S.store.DEL() });
    closeModal(v); $$('.db-modal').forEach((x) => closeModal(x)); toast('拿掉了'); render();
  });
}

// 票券畫面多一個「收進收藏冊」
const _openCardKeep = ACT.openCard;
ACT.openCard = (el, ...a) => {
  const r = _openCardKeep(el, ...a);
  const c = list('cards').find((x) => x.id === el?.dataset?.id);
  if (!canKeep(c)) return r;
  setTimeout(() => {
    const md = $$('.modal-back').pop(); const rit = md && md.querySelector('.ritual'); if (!rit || rit.querySelector('.keep-btn')) return;
    rit.insertAdjacentHTML('beforeend', isKept(c.id)
      ? '<p class="small center keep-btn" style="color:var(--accent)">已經收在收藏冊「親手做的」</p>'
      : '<button class="btn ghost block mt keep-btn" id="kp-add"><i data-ic="book"></i> 收進收藏冊「親手做的」</button>');
    const b = $('#kp-add', md);
    b && (b.onclick = async () => {
      const snap = JSON.parse(JSON.stringify(c)); delete snap.id; delete snap.log; delete snap.swapReq;
      await S.store.updateCouple(S.cid, { [`keeps.${c.id}`]: { ...snap, to: c.owner, by: me(), keptAt: now() } });
      sfx('stamp'); vibrate(30);
      b.outerHTML = '<p class="small center keep-btn" style="color:var(--accent)">收進「親手做的」了</p>';
    });
  }, 30);
  return r;
};
