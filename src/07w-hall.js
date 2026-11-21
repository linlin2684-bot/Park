
// ============================================================
//  收藏館：成就／卡冊／圖鑑／火辣（兩人都火辣才出現，進去要密碼）
//  入口在「回憶」最上面；原本票夾的收藏冊、遊樂區的圖鑑、回憶的成就都改成開這裡
// ============================================================
S.hallTab ||= 'ach';
function openHall(t) { if (t) S.hallTab = t; S.tab = 'memory'; S.sub.memory = 'hall'; render(); window.scrollTo(0, 0); }
ACT.hall = (el) => openHall(el?.dataset?.t);

// 票夾的「收藏冊」改成去收藏館
ACT.sub = ((orig) => (el) => {
  if (el.dataset.page === 'wallet' && el.dataset.sub === 'book') return openHall('book');
  if (el.dataset.page === 'memory' && el.dataset.sub === 'ach') return openHall('ach');
  return orig(el);
})(ACT.sub);
if (S.sub && S.sub.wallet === 'book') S.sub.wallet = 'mine';

// ---------- 火辣級的兌換卡：火辣配色 ----------
const isHotCard = (c) => !!c && !c.series && c.kind !== 'collect' && (c.spice || 1) >= 3;
const _embPalette0 = embPalette;
embPalette = (c) => (!c.pal && isHotCard(c) ? 'HOT' : _embPalette0(c));

// ---------- 收藏館頁面 ----------
function memHall() {
  const hot = typeof hotOn === 'function' && hotOn();
  if (S.hallTab === 'hot' && !hot) S.hallTab = 'ach';
  const tabs = [['ach', '<i data-ic="trophy"></i> 成就'], ['book', '<i data-ic="ticket"></i> 卡冊'], ['dex', '<i data-ic="book"></i> 圖鑑'], ...(hot ? [['hot', '<i data-ic="w_fire"></i> 火辣']] : [])];
  const body = { ach: memAch, book: walletBook, dex: hallDex, hot: hallHot }[S.hallTab] || memAch;
  return `<div class="hall-head"><span class="hall-em">${hallEmblem()}</span><div><b>收藏館</b><div class="small muted">我們一起收集的東西都在這裡</div></div></div>
    <div class="seg seg-fit hall-tabs">${tabs.map(([k, n]) => `<button class="${S.hallTab === k ? 'on' : ''} ${k === 'hot' ? 'hot' : ''}" data-act="hallTab" data-t="${k}">${n}</button>`).join('')}</div>
    <div class="hall-body ${S.hallTab === 'hot' ? 'hz-hall' : ''}">${body()}</div>`;
}
ACT.hallTab = async (el) => {
  const t = el.dataset.t;
  if (t === 'hot' && !(await hotHallUnlock())) return;
  S.hallTab = t; render();
};
async function hotHallUnlock() {
  if (now() < hotUntil) return true;
  if (!S.couple.hot?.pin) { if (!(await hotSetPin())) return false; }
  else if (!(await pinPad({ title: '輸入密碼', sub: '只有我們兩個知道', check: hotCheck }))) return false;
  hotUntil = now() + HOT_UNLOCK_MS;
  return true;
}
function hallEmblem() {
  return `<svg viewBox="-44 -44 88 88"><circle r="41" class="hall-c1"/><circle r="35" class="hall-c2"/>
    <path d="M-20 14 L-20 -6 L0 -20 L20 -6 L20 14 Z" class="hall-c3"/><path d="M-12 14 L-12 0 M0 14 L0 -2 M12 14 L12 0" class="hall-c3"/>
    <path d="M-25 18 L25 18" class="hall-c3"/><circle cx="0" cy="-9" r="3" class="hall-c4"/></svg>`;
}
// 圖鑑分頁：小動物圖鑑（翻書）＋小小黑
function hallDex() {
  const n = dexCount();
  return `<button class="card hall-entry" data-act="dex"><span class="hall-ic"><i data-ic="book" data-medal></i></span>
      <span class="grow"><b>小動物圖鑑</b><br><span class="small muted">已經遇到 ${n} 位朋友，點開翻書</span></span><span style="font-size:22px">›</span></button>`;
}

// 回憶頁：最上面放收藏館入口，原本的「成就」小按鈕改成收藏館
PAGES.memory.html = ((orig) => function () {
  if (S.sub.memory === 'hall') {
    const back = '<button class="link back-link" data-act="sub" data-page="memory" data-sub="goals">‹ 回到回憶</button>';
    return `<div class="page-title"><h2><i data-ic="book"></i> 回憶</h2></div>${back}${memHall()}`;
  }
  const h = orig.call(this).replace(/<button class="ach-chip[^"]*"[^>]*>[\s\S]*?<\/button>/, '');
  const entry = `<button class="card hall-banner" data-act="hall" data-t="ach"><span class="hall-em">${hallEmblem()}</span>
      <span class="grow"><b>收藏館</b><br><span class="small muted">成就、卡冊、小動物圖鑑</span></span><span style="font-size:22px">›</span></button>`;
  const i = h.indexOf('</div>', h.indexOf('page-title'));
  return h.slice(0, i + 6) + entry + h.slice(i + 6);
})(PAGES.memory.html);

// ============================================================
//  火辣分頁：火辣成就＋火辣收藏冊
// ============================================================
const HOT_ACH = [
  { id: 'h_pose10', name: '十種花樣', desc: '試過 10 張姿勢', m: 'pose', goal: 10, tier: 'b', mark: '十' },
  { id: 'h_pose30', name: '解鎖達人', desc: '試過 30 張姿勢', m: 'pose', goal: 30, tier: 's', mark: '解' },
  { id: 'h_pose69', name: '六十九', desc: '69 張姿勢全部試過', m: 'pose', goal: 69, tier: 'g', mark: '69' },
  { id: 'h_tease1', name: '第一次撩', desc: '撩撥任務驗收通過 1 次', m: 'tease', goal: 1, tier: 'b', mark: '撩' },
  { id: 'h_tease10', name: '撩人高手', desc: '撩撥任務驗收通過 10 次', m: 'tease', goal: 10, tier: 's', mark: '撩' },
  { id: 'h_tease50', name: '撩不停', desc: '撩撥任務驗收通過 50 次', m: 'tease', goal: 50, tier: 'g', mark: '撩' },
  { id: 'h_match1', name: '心照不宣', desc: '想試清單第一次配對', m: 'match', goal: 1, tier: 'b', mark: '配' },
  { id: 'h_match10', name: '想法一樣', desc: '想試清單配對 10 項', m: 'match', goal: 10, tier: 's', mark: '配' },
  { id: 'h_done1', name: '第一次解鎖', desc: '想試清單蓋了第一個「已解鎖」章', m: 'done', goal: 1, tier: 'b', mark: '鎖' },
  { id: 'h_done10', name: '清單殺手', desc: '想試清單解鎖 10 項', m: 'done', goal: 10, tier: 's', mark: '鎖' },
  { id: 'h_done30', name: '什麼都試過', desc: '想試清單解鎖 30 項', m: 'done', goal: 30, tier: 'g', mark: '鎖' },
  { id: 'h_sig1', name: '今晚有約', desc: '今晚的暗號被答應 1 次', m: 'sig', goal: 1, tier: 'b', mark: '約' },
  { id: 'h_sig10', name: '暗號達人', desc: '今晚的暗號被答應 10 次', m: 'sig', goal: 10, tier: 's', mark: '約' },
  { id: 'h_stamp5', name: '集章開始', desc: '拿到 5 個火辣印章', m: 'stamp', goal: 5, tier: 'b', mark: '章' },
  { id: 'h_stamp30', name: '印章滿滿', desc: '拿到 30 個火辣印章', m: 'stamp', goal: 30, tier: 's', mark: '章' },
  { id: 'h_lot1', name: '手氣火辣', desc: '第一次火辣抽獎', m: 'lot', goal: 1, tier: 'b', mark: '抽' },
  { id: 'h_rare1', name: '稀有大獎', desc: '火辣抽獎抽到 ★ 稀有獎', m: 'rare', goal: 1, tier: 's', mark: '★' },
];
function hotAchMetrics() {
  const hd = (t) => (typeof hotDocs === 'function' ? hotDocs(t) : []);
  return {
    pose: new Set(hd('pose-done').map((d) => d.key)).size,
    tease: hd('tease').filter((d) => d.status === 'checked').length,
    match: typeof hotMatches === 'function' ? hotMatches().length : 0,
    done: new Set(hd('done').map((d) => d.k)).size,
    sig: hd('signal').filter((d) => d.status === 'yes').length,
    stamp: hd('stamp').length,
    lot: hd('voucher').filter((d) => d.kind === 'lottery').length,
    rare: hd('voucher').filter((d) => d.kind === 'lottery' && d.rare).length,
  };
}
const hotAchGot = () => { const m = hotAchMetrics(); return new Set(HOT_ACH.filter((a) => (m[a.m] || 0) >= a.goal).map((a) => a.id)); };

function hallHot() {
  if (now() >= hotUntil) return `<div class="card center"><p class="muted">火辣分頁要先輸入密碼</p><button class="btn hot-btn" data-act="hallTab" data-t="hot">輸入密碼</button></div>`;
  const got = hotAchGot();
  const tiers = { b: '銅', s: '銀', g: '金' };
  const sorted = [...HOT_ACH].sort((a, b) => (got.has(b.id) ? 1 : 0) - (got.has(a.id) ? 1 : 0));
  const hd = (t) => hotDocs(t);
  const poseN = new Set(hd('pose-done').map((d) => d.key)).size;
  const vN = hd('voucher').length;
  const doneN = new Set(hd('done').map((d) => d.k)).size;
  const cardN = hotPoolCards().filter((p) => p.got).length;
  const cover = (act, ic, t, s) => `<button class="hh-cover" data-act="${act}"><span class="hh-em"><i data-ic="${ic}" data-medal></i></span><b>${t}</b><small>${s}</small></button>`;
  return `<h3 class="hh-title">火辣收藏冊</h3>
    <div class="hh-covers">
      ${cover('hotPoseBook', 'star', '姿勢圖鑑', `試過 ${poseN} 張`)}
      ${cover('hotHallVouchers', 'ticket', '抽到的獎', `${vN} 張`)}
      ${cover('hotHallDone', 'heart', '解鎖的章', `${doneN} 個`)}
      ${cover('hotHallCards', 'w_fire', '火辣兌換卡', `${cardN} 張`)}
    </div>
    <h3 class="hh-title">火辣成就</h3>
    <div class="ach-grid">${sorted.map((a) => { const ok = got.has(a.id); return `<div class="ach ach-${a.tier} ${ok ? '' : 'locked'}">${achBadge(a, ok)}<b>${esc(ok ? a.name : '？？？')}</b><span>${esc(a.desc)}</span>${ok ? `<span class="ach-tier t-${a.tier}">${tiers[a.tier]}</span>` : ''}</div>`; }).join('')}</div>`;
}

// 火辣級兌換卡（卡池裡 spice 3）
function hotPoolCards() {
  const got = poolGot();
  return list('pool').filter((p) => (p.spice || 1) >= 3).map((p) => ({ ...p, got: !!got[p.title] })).sort((a, b) => (b.got ? 1 : 0) - (a.got ? 1 : 0) || rarityRank(b.rarity) - rarityRank(a.rarity));
}
function hotAlbum(title, cells) {
  return openModal(`${mhead(esc(title))}<div class="hh-grid">${cells.join('') || '<div class="empty">還沒有</div>'}</div>`, { center: true, cls: 'hot-zone hz-book' });
}
const hhQ = '<span class="hh-q"><svg viewBox="-40 -40 80 80"><circle r="38" class="pe-bg"/><circle r="38" class="pe-r" stroke-width="1.2" stroke-dasharray="2 3"/><text y="10" text-anchor="middle">?</text></svg></span>';
ACT.hotHallCards = () => {
  const m = hotAlbum('火辣兌換卡', hotPoolCards().map((p) => p.got
    ? `<button class="hh-cell on emb-HOT" data-pt="${esc(p.title)}">${emblemSVG({ title: p.title, rarity: p.rarity, mark: p.mark || '', spice: 3 })}</button>`
    : `<div class="hh-cell">${hhQ}<small>${esc(D.RARITY[p.rarity || 'N'].label)}</small></div>`));
  $$('[data-pt]', m).forEach((b) => b.onclick = () => poolCardDetail(b.dataset.pt));
};
ACT.hotHallVouchers = () => {
  const vs = hotDocs('voucher').sort((a, b) => b.at - a.at);
  hotAlbum('抽到的獎', vs.map((v) => `<div class="hh-row"><b>${v.rare ? '★ ' : ''}${esc(v.title)}</b><span class="small muted">${esc(v.desc || '')}</span>
    <span class="small muted">${esc(nick(v.uid))} · ${fmtFull(v.at)}${v.status === 'redeemed' ? ' · 兌現了' : ''}</span></div>`));
};
ACT.hotHallDone = () => {
  const items = hotItems();
  const ds = hotDocs('done').sort((a, b) => b.at - a.at);
  const seen = new Set();
  hotAlbum('解鎖的章', ds.filter((d) => !seen.has(d.k) && seen.add(d.k)).map((d) => { const it = items.find((x) => x.k === d.k); return `<div class="hh-row hh-stamp"><span class="hh-stamp-ic">已解鎖</span><b>${esc(it ? it.t : '')}</b><span class="small muted">${fmtFull(d.at)}</span></div>`; }));
};

// 金色火辣成就：兩人各掉一張火辣紀念券（放在火辣票夾，跟一般票夾分開）
async function hotAchDrops() {
  const ms = S.couple?.members || [];
  if (ms.length < 2 || typeof hotOn !== 'function' || !hotOn() || !S.d.hot) return;
  const got = hotAchGot();
  for (const a of HOT_ACH) {
    if (a.tier !== 'g' || !got.has(a.id) || (S.couple.drops || {})[`hach-${a.id}`]) continue;
    const ok = await S.store.coupleTx(S.cid, (x) => (x.drops && x.drops[`hach-${a.id}`] ? null : { [`drops.hach-${a.id}`]: true }));
    if (!ok) continue;
    for (const u of ms) await col('hot').add({ type: 'voucher', uid: u, kind: 'ach', title: `${a.name}紀念券`, desc: `解鎖金色火辣成就「${a.name}」：${a.desc}。內容兩人一起決定`, rare: true, status: 'new', at: now() });
  }
}
setInterval(() => { try { hotAchDrops(); } catch (e) { console.warn(e); } }, 20000);

// 切到背景：火辣分頁也一起關上
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && S.hallTab === 'hot') { S.hallTab = 'ach'; if (S.tab === 'memory') render(); }
});
// 扭蛋抽到火辣級的卡：專屬的火辣演出（稀有度不變）
function hotDrawFx() {
  const el = document.createElement('div');
  el.className = 'hot-draw-fx';
  el.innerHTML = `<div class="hdf-ring">${typeof hotEmblem === 'function' ? hotEmblem() : ''}</div><div class="hdf-t">火辣級</div>`;
  document.body.appendChild(el);
  confetti(90, ['#d9485f', '#e9c27a', '#7a1f35', '#fff4e6']);
  vibrate([40, 30, 40, 30, 120]); sfx('sparkle');
  setTimeout(() => el.classList.add('out'), 1500);
  setTimeout(() => el.remove(), 2100);
}
