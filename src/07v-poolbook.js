
// ============================================================
//  收藏冊：兌換卡（扭蛋卡池裡的卡）
//  抽到就收進來；依稀有度分頁；還沒抽到的是問號徽章（不暴雷）
//  點開看：第一次拿到、誰送的、兌換過幾次，還可以寫一句當天的回憶
// ============================================================
const POOL_BOOK_KEY = '__pool';
const poolMemoKey = (title) => 'm' + hash(title).toString(36);

// 這張卡池卡拿過的所有紀錄（兩個人一起算）
function poolGot() {
  const got = {};
  const add = (title, at) => { if (!title) return; const g = (got[title] ||= { first: at, cards: [] }); if (at && at < g.first) g.first = at; };
  list('gacha').forEach((g) => add(g.title, g.at));
  list('cards').filter((c) => !c.series && c.kind !== 'collect').forEach((c) => { add(c.title, c.at); got[c.title].cards.push(c); });
  return got;
}
function poolBookData() {
  const got = poolGot();
  // 火辣級的卡：兩人都開火辣才看得到（連問號都不顯示）
  const pool = list('pool').filter((p) => p.title);
  const byR = {};
  for (const r of D.RARITY_ORDER) byR[r] = pool.filter((p) => (p.rarity || 'N') === r).sort((a, b) => (got[b.title] ? 1 : 0) - (got[a.title] ? 1 : 0) || (got[a.title]?.first || 0) - (got[b.title]?.first || 0));
  const n = pool.filter((p) => got[p.title] && ((p.spice || 1) < 3 || hotOn())).length;
  return { got, byR, n };
}

// 封面圖騰：一張票
const _bookMotif1 = bookMotif;
bookMotif = (kind) => {
  if (kind !== 'ticket') return _bookMotif1(kind);
  const notch = 'M-30 -16 L30 -16 L30 -6 A6 6 0 0 0 30 6 L30 16 L-30 16 L-30 6 A6 6 0 0 0 -30 -6 Z';
  return `<g transform="rotate(-12)">
    <path d="${notch}" class="e-bg e-ink-s" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="M-14 -16 L-14 16" class="e-acc-s" stroke-width="1.4" stroke-dasharray="2 3"/>
    <circle cx="8" cy="0" r="8.5" class="e-acc-f"/><circle cx="8" cy="0" r="8.5" class="e-ink-s" stroke-width="1.1" fill="none"/>
    <path d="M8 -4.6 L9.4 -1.4 L12.8 -1.2 L10.2 1 L11 4.4 L8 2.6 L5 4.4 L5.8 1 L3.2 -1.2 L6.6 -1.4 Z" class="e-ink-f"/>
    <path d="M-25 -7 L-19 -7 M-25 0 L-19 0 M-25 7 L-19 7" class="e-ink-s" stroke-width="1.2" stroke-linecap="round"/></g>
    <circle cx="-26" cy="-26" r="1.6" class="e-ink-f"/><circle cx="27" cy="24" r="1.3" class="e-ink-f"/>`;
};

// 加進收藏冊：最上面目錄多一個徽章、第一本就是兌換卡
const _walletBook0 = walletBook;
walletBook = () => {
  const html = _walletBook0();
  const { n } = poolBookData();
  const meta = { pal: 'R', motif: 'ticket', pat: 'grid', sub: '扭蛋和轉盤抽到的卡' };
  const svg = bookCoverSVG(meta, { title: '兌換卡', sub: meta.sub, got: n, total: n, empty: !n });
  const toc = `<button class="bt-item emb-R" data-act="bookJump" data-i="pool">
      <svg viewBox="-44 -44 88 88" class="bt-medal"><circle r="41" class="e-bg e-ink-s" stroke-width="2"/><circle r="36" class="e-acc-s" stroke-width="1" fill="none"/><g transform="scale(.82)">${bookMotif('ticket')}</g></svg>
      <b>兌換卡</b><small>${n} 張</small></button>`;
  const book = `<div class="book emb-R" id="bk-pool">
      <button class="book-cover2" data-act="poolBookOpen">${svg}</button>
      <div class="book-note">已收集 ${n} 張・點封面翻開</div></div>`;
  const i = html.indexOf('<div class="book-toc">');
  if (i < 0) return book + html;
  const j = html.indexOf('</div>', i);
  return html.slice(0, i) + '<div class="book-toc">' + toc + html.slice(i + 22, j) + '</div>' + book + html.slice(j + 6);
};

ACT.poolBookOpen = () => {
  const { got, byR } = poolBookData();
  const PER = 9;
  const pages = [];
  for (const r of D.RARITY_ORDER) {
    const arr = byR[r];
    if (!arr.length) continue;
    for (let i = 0; i < arr.length; i += PER) pages.push({ r, items: arr.slice(i, i + PER), part: Math.floor(i / PER) + 1, parts: Math.ceil(arr.length / PER) });
  }
  const cell = (p, no) => {
    // 火辣級：沒開火辣時就算抽到也只顯示「？」
    if (!got[p.title] || ((p.spice || 1) >= 3 && !hotOn())) return `<div class="alb-slot"><span class="alb-no">No.${String(no).padStart(2, '0')}</span><b>？</b><small>${esc(D.RARITY[p.rarity || 'N'].label)}</small></div>`;
    const c = { title: p.title, rarity: p.rarity || 'N', mark: p.mark || '', desc: p.desc || '', spice: p.spice || 1 };
    const used = got[p.title].cards.reduce((s, x) => s + (x.used || 0), 0);
    return `<button class="alb-card emb-${embPalette(c)}" data-pt="${esc(p.title)}">${emblemSVG(c)}${used ? `<span class="alb-used">兌換 ${used} 次</span>` : ''}</button>`;
  };
  const m = openModal(`<button class="m-close db-close" data-act="close">✕</button>
    <div class="db-track">${pages.map((pg) => { const R = D.RARITY[pg.r]; return `<section class="db-page alb-page">
      <div class="alb-head"><b style="color:${R.color}">${pg.r} · ${esc(R.label)}</b><span>${pg.parts > 1 ? `${pg.part} / ${pg.parts}` : ''}</span></div>
      <div class="alb-grid">${pg.items.map((p, i) => cell(p, (pg.part - 1) * PER + i + 1)).join('')}${Array.from({ length: PER - pg.items.length }, () => '<div class="alb-blank"></div>').join('')}</div>
    </section>`; }).join('')}</div>
    ${pages.length > 1 ? `<div class="db-nav"><button class="db-prev" aria-label="上一頁"><i data-ic="chevron"></i></button><div class="db-dots">${pages.map((_, i) => `<i data-p="${i}"></i>`).join('')}</div><button class="db-next" aria-label="下一頁"><i data-ic="chevron"></i></button></div>` : ''}`,
  { center: true, cls: 'dex-book album emb-R' });
  const tr = $('.db-track', m), n = pages.length;
  const cur = () => Math.round(tr.scrollLeft / tr.clientWidth);
  const go = (p) => tr.scrollTo({ left: Math.max(0, Math.min(n - 1, p)) * tr.clientWidth, behavior: 'smooth' });
  const dots = () => { if (n < 2) return; const c = cur(); $$('.db-dots i', m).forEach((d, i) => d.classList.toggle('on', i === c)); $('.db-prev', m).disabled = c === 0; $('.db-next', m).disabled = c === n - 1; };
  tr.addEventListener('scroll', () => { clearTimeout(tr._t); tr._t = setTimeout(dots, 60); }, { passive: true });
  if (n > 1) { $('.db-prev', m).onclick = () => { sfx('flip'); go(cur() - 1); }; $('.db-next', m).onclick = () => { sfx('flip'); go(cur() + 1); }; $$('.db-dots i', m).forEach((d) => d.onclick = () => go(+d.dataset.p)); }
  $$('.alb-card', m).forEach((b) => b.onclick = () => poolCardDetail(b.dataset.pt));
  dots();
};
ACT.bookJump = ((orig) => (el) => {
  if (el.dataset.i !== 'pool') return orig(el);
  const b = document.getElementById('bk-pool');
  if (b) window.scrollTo({ top: b.getBoundingClientRect().top + window.scrollY - 70, behavior: 'smooth' });
})(ACT.bookJump);

// 一張兌換卡的紀念頁
function poolCardDetail(title) {
  const p = list('pool').find((x) => x.title === title) || { title };
  const g = poolGot()[title];
  if (!g) return;
  const c = { title, rarity: p.rarity || 'N', mark: p.mark || '', desc: p.desc || '', spice: p.spice || 1 };
  const draw = () => {
    const cards = poolGot()[title]?.cards || [];
    const used = cards.reduce((s, x) => s + (x.used || 0), 0);
    const redeems = cards.flatMap((x) => (x.log || []).filter((l) => l.how === 'redeem').map((l) => l.at)).sort((a, b) => b - a);
    const froms = [...new Set(cards.map((x) => x.from))].map((f) => (f === 'sys' || !f ? '遊樂園' : nick(f)));
    const memo = (S.couple.cardMemo || {})[poolMemoKey(title)];
    const fmt = (t) => { const d = new Date(t); return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`; };
    return `${mhead(esc(title))}
      <div class="pc-emb emb-${embPalette(c)}">${emblemSVG(c)}</div>
      ${p.desc ? `<p class="center muted" style="margin:4px 0 10px">${esc(p.desc)}</p>` : ''}
      <div class="pc-rows">
        <div><span>第一次拿到</span><b>${g.first ? fmt(g.first) : '—'}</b></div>
        <div><span>誰送的</span><b>${froms.length ? froms.map(esc).join('、') : '—'}</b></div>
        <div><span>兌換過</span><b>${used ? `${used} 次` : '還沒兌換'}</b></div>
        ${redeems.length ? `<div><span>最近一次兌換</span><b>${fmt(redeems[0])}</b></div>` : ''}
      </div>
      <div class="pc-memo">${memo && memo.t ? `<div class="pc-memo-t">「${esc(memo.t)}」</div><div class="small muted">${esc(nick(memo.by))} 寫的 · ${fmt(memo.at)}</div>` : '<div class="small muted">還沒有寫回憶</div>'}
        <button class="btn ghost block mt" id="pc-edit">${memo && memo.t ? '改這句回憶' : '寫一句當天的回憶'}</button></div>`;
  };
  const m = openModal(draw(), { center: true });
  const wire = () => {
    $('#pc-edit', m).onclick = async () => {
      const old = (S.couple.cardMemo || {})[poolMemoKey(title)];
      const v = await promptBox('寫一句那天的回憶（兩個人都看得到）', { value: old?.t || '', ok: '存起來' });
      if (v === null || v === undefined) return;
      const t = String(v).trim().slice(0, 80);
      await S.store.updateCouple(S.cid, { [`cardMemo.${poolMemoKey(title)}`]: t ? { t, by: me(), at: now() } : S.store.DEL() });
      sfx('pop'); toast(t ? '回憶存好了' : '回憶刪掉了');
      m.querySelector('.modal').innerHTML = draw(); wire();
    };
  };
  wire();
}
