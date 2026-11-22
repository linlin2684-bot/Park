// ============================================================
//  對戰挑戰（每週 3 題版）
//  從本週 5 個挑 3 個 → 接受前每人可換一題、可返回修改 → 兩人都接受才開始 7 天
//  兩個人各自完成、對方確認 → 時間到比完成數量，多的人挑一個禮盒；一樣多（至少 1 題）兩個人都挑
// ============================================================
const BT_BOX = () => [
  { k: 'pts', ic: 'coin', name: '點數禮盒', d: '+15 點' },
  { k: 'card', ic: 'ticket', name: '卡片禮盒', d: `${nick(partner())} 要送你一張卡，內容對方決定` },
  hotOn() ? { k: 'stamp', ic: 'stamp', name: '火辣印章禮盒', d: '火辣印章 ×2' } : { k: 'can', ic: 'gift', name: '罐罐禮盒', d: '罐罐 ×3，可以換東西' },
];
const btSet = () => list('battles').find((b) => b.kind === 'set' && b.status !== 'done' && b.status !== 'cancel');
let btPick = [];          // 選題時勾的
let btRedo = null;        // 返回修改中的那一場
const btScore = (b, u) => Object.values((b.done || {})[u] || {}).filter((v) => v === 'ok').length;

{
  const _old = ACT.battle;
  ACT.battle = () => {
    const old = list('battles').find((b) => !b.kind && (b.status === 'active' || b.status === 'claimed' || b.status === 'pending'));
    if (old) return _old();   // 舊版單題還沒結束的，照舊顯示
    btRender();
  };
  const _act = activeBattle;
  activeBattle = () => { const b = btSet(); return b ? { ...b, task: b.status === 'pending' ? '這週的 3 個挑戰' : `${btScore(b, me())} : ${btScore(b, partner())}` } : _act(); };
}

function btCheckEnd(b) {
  if (b.status !== 'active') return b;
  const ms = S.couple.members || [];
  const allDone = ms.every((u) => btScore(b, u) === b.tasks.length);
  if (now() < b.deadline && !allDone) return b;
  const sc = Object.fromEntries(ms.map((u) => [u, btScore(b, u)]));
  const top = Math.max(...Object.values(sc));
  const winners = top > 0 ? ms.filter((u) => sc[u] === top) : [];
  const up = { status: winners.length ? 'ended' : 'done', score: sc, winners, endAt: now() };
  fire(col('battles').update(b.id, up));
  return { ...b, ...up };
}

function btRender() {
  let b = btSet(); if (b) b = btCheckEnd(b);
  const p = partner();
  const hist = list('battles').filter((x) => x.status === 'done' || x.status === 'draw').sort((a, c) => (c.endAt || c.at) - (a.endAt || a.at));
  const wins = (u) => hist.filter((x) => (x.winners ? x.winners.length === 1 && x.winners[0] === u : x.winner === u)).length;
  let body = '';
  const taskRow = (t, i, extra = '') => `<div class="bt-task"><span class="bt-no">${i + 1}</span><span class="grow">${esc(t)}</span>${extra}</div>`;

  if (b && b.status === 'pending' && btRedo !== b.id) {
    const acc = b.accepted || {}, sw = b.swapped || {};
    body = `<p class="small muted" style="margin-top:0">${esc(nick(b.by))} 挑的這週 3 個挑戰。接受前每個人可以換掉一題，換了要兩個人重新接受。</p>
      ${b.tasks.map((t, i) => taskRow(t, i, !sw[me()] ? `<button class="bt-swap" data-act="btSwap" data-i="${i}" aria-label="換掉這題"><i data-ic="swap"></i></button>` : '')).join('')}
      <p class="small muted center" style="margin:4px 0 0">${sw[me()] ? '你已經換過一題了' : '點右邊可以換掉一題（只能換一次）'}</p>
      <div class="bt-acc">${[me(), p].map((u) => `<span class="${acc[u] ? 'on' : ''}">${avatar(u)} ${esc(nick(u))} ${acc[u] ? '已接受' : '還沒接受'}</span>`).join('')}</div>
      ${acc[me()] ? `<p class="center muted">等 ${esc(nick(p))} 接受挑戰…</p>` : `<button class="btn block" data-act="btAccept"><i data-ic="swords"></i> 接受挑戰</button>`}
      <div class="btn-row">${b.by === me() ? `<button class="btn ghost" data-act="btRedo"><i data-ic="edit"></i> 返回修改</button><button class="btn ghost" data-act="btCancel">取消</button>` : ''}</div>`;
  } else if (b && b.status === 'active') {
    const left = b.deadline - now(), dn = b.done || {};
    const chip = (u, i) => { const v = (dn[u] || {})[i]; return `<span class="bt-chip ${v || ''}">${esc(nick(u))}${v === 'ok' ? ' <i data-ic="check"></i>' : v === 'claimed' ? ' 待確認' : ''}</span>`; };
    body = `<div class="bt-score"><span>${avatar(me())}<b>${btScore(b, me())}</b></span><em>剩 ${Math.max(1, Math.ceil(left / 86400000))} 天</em><span><b>${btScore(b, p)}</b>${avatar(p)}</span></div>
      ${b.tasks.map((t, i) => {
        const mine = (dn[me()] || {})[i], theirs = (dn[p] || {})[i];
        const btn = theirs === 'claimed'
          ? `<button class="btn sm ghost" data-act="btNo" data-i="${i}">還沒</button><button class="btn sm" data-act="btOk" data-i="${i}">確認 ${esc(nick(p))} 完成</button>`
          : !mine ? `<button class="btn sm" data-act="btClaim" data-i="${i}"><i data-ic="flag"></i> 我完成了</button>` : '';
        return `<div class="bt-task col">${taskRow(t, i)}<div class="bt-st">${chip(me(), i)}${chip(p, i)}<span class="grow"></span>${btn}</div></div>`;
      }).join('')}
      <p class="small muted center">時間到比誰完成得多，多的人挑一個禮盒；一樣多就兩個人都挑</p>`;
  } else if (b && b.status === 'ended') {
    const sc = b.score || {}, picked = b.picks || {}, iWin = (b.winners || []).includes(me());
    body = `<div class="bt-score"><span>${avatar(me())}<b>${sc[me()] || 0}</b></span><em>${(b.winners || []).length > 1 ? '平手！' : iWin ? '你贏了！' : `${esc(nick(b.winners[0]))} 贏了`}</em><span><b>${sc[p] || 0}</b>${avatar(p)}</span></div>
      ${iWin && !picked[me()]
        ? `<h3 class="center" style="justify-content:center">挑一個禮盒</h3><div class="bt-boxes">${(() => { const gs = giftTrio(b.id + me()); return BT_BOX().map((x, i) => `<button class="bt-box" data-act="btBox" data-k="${x.k}" style="--d:${i * .12}s">${giftSVG(gs[i], b.id.slice(0, 4) + i)}<b>${x.name}</b><small>${esc(x.d)}</small></button>`).join(''); })()}</div>`
        : `<p class="center muted">${iWin ? `你挑了${BT_BOX().find((x) => x.k === picked[me()])?.name || '禮盒'}` : ''}${(b.winners || []).filter((u) => u !== me() && !picked[u]).length ? `　等 ${esc(nick(p))} 挑禮盒…` : ''}</p>`}`;
  } else if (btRedo || btPick.length || !b) {
    const picks = battlePicks();
    const custom = btPick.filter((t) => !picks.includes(t));
    body = `${btRedo ? `<button class="btn ghost sm" data-act="btBack" style="margin-bottom:8px">‹ 返回</button>` : ''}
      <p class="small muted" style="margin-top:0">從這週的 5 個裡挑 3 個，兩個人都接受後開始 7 天。時間到比誰完成得多，贏的人挑一個禮盒。</p>
      ${[...picks, ...custom].map((t, i) => `<div class="bt-row"><button class="quiz-opt ${btPick.includes(t) ? 'on' : ''}" data-act="btToggle" data-t="${esc(t)}">${btPick.includes(t) ? '<i data-ic="check"></i> ' : ''}${esc(t)}</button>${i < picks.length && battleSwapLeft() ? `<button class="bt-swap" data-act="battleSwapOne" data-s="${i}" aria-label="換掉這個"><i data-ic="swap"></i></button>` : ''}</div>`).join('')}
      <button class="quiz-opt" data-act="btCustom"><i data-ic="edit"></i> 自己出題…</button>
      <button class="btn block mt" data-act="btStart" ${btPick.length === 3 ? '' : 'disabled'}>${btPick.length === 3 ? (btRedo ? '改好了，請對方重新接受' : '就這 3 個，發起挑戰') : `再挑 ${3 - btPick.length} 個`}</button>`;
  }
  closeAll();
  openModal(`${mhead('<i data-ic="swords"></i> 對戰挑戰')}
    <div class="row" style="justify-content:center;gap:18px;margin-bottom:12px;font-weight:800"><span>${avatar(me())} ${esc(nick(me()))} ${wins(me())} 勝</span><span class="muted">VS</span><span>${wins(p)} 勝 ${esc(nick(p))} ${avatar(p)}</span></div>
    ${body}
    ${hist.length ? `<h3 style="font-size:15px;margin-top:14px">對戰紀錄</h3>${hist.slice(0, 10).map((x) => `<div class="list-row"><span class="grow">${x.kind === 'set' ? `3 題・${(x.score || {})[me()] || 0} : ${(x.score || {})[p] || 0}` : esc(x.task)}</span><span class="small">${x.kind === 'set' ? (!(x.winners || []).length ? '都沒完成' : x.winners.length > 1 ? '平手' : '<i data-ic="trophy"></i> ' + esc(nick(x.winners[0]))) : x.status === 'draw' ? '平手' : '<i data-ic="trophy"></i> ' + esc(nick(x.winner))}</span><span class="when">${fmtDate(x.endAt || x.at)}</span></div>`).join('')}` : ''}`);
}
const btReload = () => setTimeout(btRender, 250);

ACT.btToggle = (el) => {
  const t = el.dataset.t;
  if (btPick.includes(t)) btPick = btPick.filter((x) => x !== t);
  else if (btPick.length < 3) btPick = [...btPick, t];
  else return toast('最多 3 個，先取消一個');
  btRender();
};
ACT.btCustom = async () => {
  if (btPick.length >= 3) return toast('最多 3 個，先取消一個');
  const t = await promptBox('自己出題', { placeholder: '例如：一週早睡五天' });
  if (t) btPick = [...btPick, t.trim()];
  btRender();
};
ACT.btStart = async () => {
  if (!partner()) return toast('對方加入後才能對戰');
  if (btPick.length !== 3) return;
  const cur = btRedo && list('battles').find((x) => x.id === btRedo);
  if (cur) await col('battles').update(cur.id, { tasks: btPick, accepted: { [me()]: true }, at: now() });
  else await col('battles').add({ kind: 'set', tasks: btPick, by: me(), at: now(), status: 'pending', accepted: { [me()]: true }, swapped: {}, done: {} });
  await notify(partner(), 'battle', cur ? `${nick(me())} 改了這週的挑戰，要你重新接受 ⚔️` : `${nick(me())} 挑好這週的 3 個挑戰，接受了才開始 ⚔️`);
  btPick = []; btRedo = null; toast('等對方接受'); btReload();
};
ACT.btRedo = () => { const b = btSet(); if (!b) return; btRedo = b.id; btPick = [...b.tasks]; btRender(); };
ACT.btBack = () => { btRedo = null; btPick = []; btRender(); };
ACT.btCancel = async () => {
  const b = btSet(); if (!b || !(await confirmBox('取消這週的挑戰？'))) return;
  await col('battles').remove(b.id); await notify(partner(), 'battle', `${nick(me())} 取消了這週的挑戰`); btReload();
};
ACT.btSwap = async (el) => {
  const b = btSet(); if (!b || (b.swapped || {})[me()]) return;
  const i = +el.dataset.i;
  const how = await btChoice(`換掉「${b.tasks[i]}」`, [['draw', '抽一個新的'], ['own', '自己出題']]);
  if (!how) return;
  let t = '';
  if (how === 'own') t = (await promptBox('自己出題', { placeholder: '例如：一週早睡五天' }) || '').trim();
  else t = pick(D.BATTLE_TASKS.filter((x) => !b.tasks.includes(x)));
  if (!t) return;
  const tasks = [...b.tasks]; tasks[i] = t;
  await col('battles').update(b.id, { tasks, swapped: { ...(b.swapped || {}), [me()]: true }, accepted: { [me()]: true } });
  await notify(partner(), 'battle', `${nick(me())} 換了一題挑戰：「${t}」，要你重新接受`);
  btReload();
};
ACT.btAccept = async () => {
  const b = btSet(); if (!b || b.status !== 'pending') return btRender();
  const acc = { ...(b.accepted || {}), [me()]: true }, all = (S.couple.members || []).every((u) => acc[u]);
  await col('battles').update(b.id, all ? { accepted: acc, status: 'active', startAt: now(), deadline: now() + 7 * 86400000 } : { accepted: acc });
  await notify(partner(), 'battle', all ? `${nick(me())} 接受了！這週的挑戰開始，7 天倒數 ⚔️` : `${nick(me())} 接受了挑戰`);
  toast(all ? '挑戰開始！' : '接受了，等對方'); btReload();
};
const btSetDone = async (u, i, v) => { const b = btSet(); if (!b) return; const dn = JSON.parse(JSON.stringify(b.done || {})); dn[u] = dn[u] || {}; if (v) dn[u][i] = v; else delete dn[u][i]; await col('battles').update(b.id, { done: dn }); return b; };
ACT.btClaim = async (el) => {
  const b = await btSetDone(me(), +el.dataset.i, 'claimed');
  b && await notify(partner(), 'battle', `${nick(me())} 說自己完成「${b.tasks[+el.dataset.i]}」了，快去確認 ⚔️`);
  btReload();
};
ACT.btOk = async (el) => {
  const b = await btSetDone(partner(), +el.dataset.i, 'ok');
  b && await notify(partner(), 'battle', `${nick(me())} 確認你完成「${b.tasks[+el.dataset.i]}」了 ✓`);
  sfx('stamp'); btReload();
};
ACT.btNo = async (el) => {
  const b = await btSetDone(partner(), +el.dataset.i, null);
  b && await notify(partner(), 'battle', `${nick(me())} 說你「${b.tasks[+el.dataset.i]}」還沒完成 😏`);
  btReload();
};
ACT.btBox = async (el) => {
  const b = btSet(); if (!b || b.status !== 'ended' || !(b.winners || []).includes(me()) || (b.picks || {})[me()]) return;
  const k = el.dataset.k, box = BT_BOX().find((x) => x.k === k);
  if (!(await confirmBox(`挑「${box.name}」？`, '就這個'))) return;
  const picks = { ...(b.picks || {}), [me()]: k };
  const up = { picks };
  if (k === 'pts') await addPoints(me(), 15, '對戰挑戰禮盒');
  if (k === 'stamp') for (let i = 0; i < 2; i++) await col('hot').add({ type: 'stamp', uid: me(), why: '對戰挑戰禮盒', used: false, at: now() });
  if (k === 'can') for (let i = 0; i < 3; i++) await giveCan(me(), '', true);
  if (k === 'card') up.owes = { ...(b.owes || {}), [partner()]: me() };
  if ((b.winners || []).every((u) => picks[u])) up.status = 'done';
  await col('battles').update(b.id, up);
  await notify(partner(), 'battle', k === 'card' ? `${nick(me())} 挑了卡片禮盒，要你送一張卡 🎁` : `${nick(me())} 挑了${box.name} 🎁`);
  confetti(60); toast(`${box.name}：${box.d}`); btReload();
};

// ---------- 禮盒的樣子：15 種，每次隨機挑 3 種不一樣的 ----------
const GIFT_STYLES = [
  { s: 'cube', b: '#ff8fab', l: '#ff6b93', r: '#fff3b0', p: 'dots' },
  { s: 'cube', b: '#9ad0ec', l: '#6fb3db', r: '#ffffff', p: 'stripes' },
  { s: 'cube', b: '#b8e0a8', l: '#8cc97a', r: '#ff8fab', p: 'stars' },
  { s: 'tall', b: '#c9b6f2', l: '#a68be0', r: '#ffd45c', p: 'dots' },
  { s: 'tall', b: '#ffcf8a', l: '#ffb252', r: '#d9485f', p: 'hearts' },
  { s: 'round', b: '#f7c6d9', l: '#ef9fbf', r: '#7a4b94', p: 'stripes' },
  { s: 'round', b: '#a8e6cf', l: '#7fd1b3', r: '#ff8b94', p: 'dots' },
  { s: 'heart', b: '#ff7b9c', l: '#e8557a', r: '#fff0f3', p: 'plain' },
  { s: 'heart', b: '#d9b6ff', l: '#b98cf0', r: '#ffe066', p: 'stars' },
  { s: 'chest', b: '#c98b5a', l: '#a86d40', r: '#ffd45c', p: 'plain' },
  { s: 'chest', b: '#6d8bd8', l: '#4f6fc0', r: '#ffd45c', p: 'stars' },
  { s: 'bag', b: '#ffd6a5', l: '#f4a261', r: '#e76f51', p: 'hearts' },
  { s: 'bag', b: '#bde0fe', l: '#8ecae6', r: '#ff8fab', p: 'dots' },
  { s: 'cube', b: '#2b2d42', l: '#1d1e2c', r: '#ffd45c', p: 'stars' },
  { s: 'tall', b: '#e63946', l: '#b52a35', r: '#f1faee', p: 'stripes' },
];
function giftPattern(p, id, col) {
  const c = 'rgba(255,255,255,.55)';
  const pat = {
    dots: `<pattern id="${id}" width="10" height="10" patternUnits="userSpaceOnUse"><circle cx="5" cy="5" r="1.8" fill="${c}"/></pattern>`,
    stripes: `<pattern id="${id}" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="4" height="10" fill="${c}"/></pattern>`,
    stars: `<pattern id="${id}" width="16" height="16" patternUnits="userSpaceOnUse"><path d="M8 3l1.4 3 3.2.4-2.4 2.2.7 3.2L8 10.3 5.1 11.8l.7-3.2L3.4 6.4l3.2-.4z" fill="${c}"/></pattern>`,
    hearts: `<pattern id="${id}" width="14" height="14" patternUnits="userSpaceOnUse"><path d="M7 11S2.5 8.2 2.5 5.4A2.2 2.2 0 0 1 7 4.3a2.2 2.2 0 0 1 4.5 1.1C11.5 8.2 7 11 7 11z" fill="${c}"/></pattern>`,
  }[p];
  return pat || '';
}
function giftSVG(st, uid) {
  const id = 'gp' + uid, fillP = st.p !== 'plain' ? `<rect class="gp" x="0" y="0" width="100" height="100" fill="url(#${id})"/>` : '';
  const bow = (x, y) => `<g class="g-bow"><path d="M${x} ${y} C${x - 18} ${y - 18} ${x - 22} ${y + 2} ${x} ${y}Z" fill="${st.r}" stroke="rgba(0,0,0,.12)"/><path d="M${x} ${y} C${x + 18} ${y - 18} ${x + 22} ${y + 2} ${x} ${y}Z" fill="${st.r}" stroke="rgba(0,0,0,.12)"/><circle cx="${x}" cy="${y}" r="4" fill="${st.r}" stroke="rgba(0,0,0,.15)"/></g>`;
  let shape = '';
  const clip = (d) => `<clipPath id="${id}c"><path d="${d}"/></clipPath>`;
  if (st.s === 'cube' || st.s === 'tall') {
    const top = st.s === 'tall' ? 30 : 44, h = 92 - top;
    const body = `M20 ${top + 8} H80 V92 H20Z`;
    shape = `${clip(body)}<path d="${body}" fill="${st.b}"/><g clip-path="url(#${id}c)">${fillP}</g>
      <rect x="45" y="${top + 8}" width="10" height="${h - 8}" fill="${st.r}"/>
      <rect x="15" y="${top}" width="70" height="13" rx="3" fill="${st.l}"/><rect x="45" y="${top}" width="10" height="13" fill="${st.r}"/>${bow(50, top)}`;
  } else if (st.s === 'round') {
    const body = 'M18 50 V82 A32 10 0 0 0 82 82 V50Z';
    shape = `${clip(body)}<path d="${body}" fill="${st.b}"/><g clip-path="url(#${id}c)">${fillP}</g>
      <rect x="18" y="62" width="64" height="7" fill="${st.r}" opacity=".9"/>
      <ellipse cx="50" cy="48" rx="35" ry="11" fill="${st.l}"/><ellipse cx="50" cy="46" rx="35" ry="10" fill="${st.l}" stroke="rgba(255,255,255,.4)"/>${bow(50, 42)}`;
  } else if (st.s === 'heart') {
    const body = 'M50 92 C14 68 10 46 24 36 C36 28 46 34 50 42 C54 34 64 28 76 36 C90 46 86 68 50 92Z';
    shape = `${clip(body)}<path d="${body}" fill="${st.b}"/><g clip-path="url(#${id}c)">${fillP}<rect x="46" y="20" width="8" height="80" fill="${st.r}"/></g>
      <path d="${body}" fill="none" stroke="${st.l}" stroke-width="3"/>${bow(50, 40)}`;
  } else if (st.s === 'chest') {
    const body = 'M18 52 H82 V90 H18Z';
    shape = `${clip(body)}<path d="${body}" fill="${st.b}"/><g clip-path="url(#${id}c)">${fillP}</g>
      <path d="M18 52 V44 A32 16 0 0 1 82 44 V52Z" fill="${st.l}"/>
      <rect x="18" y="50" width="64" height="5" fill="${st.r}"/><rect x="28" y="30" width="5" height="60" fill="${st.r}" opacity=".85"/><rect x="67" y="30" width="5" height="60" fill="${st.r}" opacity=".85"/>
      <rect x="44" y="50" width="12" height="14" rx="3" fill="${st.r}" stroke="rgba(0,0,0,.2)"/><circle cx="50" cy="57" r="2" fill="rgba(0,0,0,.35)"/>`;
  } else {
    const body = 'M22 40 H78 L84 92 H16Z';
    shape = `${clip(body)}<path d="${body}" fill="${st.b}"/><g clip-path="url(#${id}c)">${fillP}<rect x="16" y="40" width="70" height="9" fill="${st.l}"/></g>
      <path d="M36 40 C36 22 64 22 64 40" fill="none" stroke="${st.l}" stroke-width="4"/>
      <path d="M58 52 l10 8 l-10 0 z" fill="${st.r}"/>${bow(50, 52)}`;
  }
  return `<svg class="gift-svg" viewBox="0 0 100 100"><defs>${giftPattern(st.p, id)}</defs><ellipse cx="50" cy="94" rx="30" ry="4" fill="rgba(0,0,0,.18)"/>${shape}
    <g class="g-sp"><path d="M14 22l1.5 3 3 1.5-3 1.5-1.5 3-1.5-3-3-1.5 3-1.5z" fill="#ffe27a"/><path d="M88 30l1 2 2 1-2 1-1 2-1-2-2-1 2-1z" fill="#fff"/></g></svg>`;
}
const giftTrio = (seed) => shuffled(GIFT_STYLES.map((_, i) => i), hash('gift' + seed)).slice(0, 3).map((i) => GIFT_STYLES[i]);
// 跟選單一起用的小小選擇框
function btChoice(title, opts) {
  return new Promise((res) => {
    const m = openModal(`${mhead(esc(title))}${opts.map(([k, n]) => `<button class="quiz-opt" data-c="${k}">${esc(n)}</button>`).join('')}`, { center: true, onClose: () => res(null) });
    m.querySelectorAll('[data-c]').forEach((b) => b.onclick = () => { const v = b.dataset.c; res(v); closeModal(m); });
  });
}
