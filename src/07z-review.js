// ============================================================
//  年度回顧多的幾頁：最常遇到的小夥伴、小紙條、小小黑這一年、撞答案、
//  戳一戳、送給對方的卡、今年的第一次
//  有些次數是從 2026/11/22 才開始記（fy.{年}.*），之前的沒有
// ============================================================
function fyInc(path, n = 1) {
  if (!S.couple || !S.cid || (S.couple.members || []).length < 2) return;
  const Y = new Date().getFullYear();
  const key = `fy.${Y}.${path}`;
  fire(S.store.coupleTx(S.cid, (c) => ({ [key]: (key.split('.').reduce((o, p) => (o || {})[p], c) || 0) + n })));
}
// 記次數：點小動物（說話、值日）、摸小小黑、餵罐罐
{
  const _dexNote = dexNote;
  dexNote = async (k, idx) => { if (FRIENDS[k] && k !== 'black') fyInc(`fr.${k}`); return _dexNote(k, idx); };
  const _pat = ACT.petPat;
  ACT.petPat = async (el, e) => { fyInc(`pat.${me()}`); return _pat(el, e); };
  const _xp = petXP;
  petXP = async (n, why = '') => { if (why === 'feed') fyInc(`feed.${me()}`); return _xp(n, why); };
}

const md = (ts) => { const d = new Date(ts); return `${d.getMonth() + 1}/${d.getDate()}`; };
const cut = (t, n = 18) => { t = String(t || '').replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n) + '…' : t; };

{
  const _more = reviewMore;
  reviewMore = (Y, inY) => [..._more(Y, inY), ...reviewMore2(Y, inY)];
}
function reviewMore2(Y, inY) {
  const out = [], ms = S.couple.members || [];
  const fy = ((S.couple.fy || {})[Y]) || {};
  const sum = (o) => Object.values(o || {}).reduce((a, b) => a + b, 0);

  // 最常遇到的小夥伴
  const fr = Object.entries(fy.fr || {}).filter(([k]) => FRIENDS[k]).sort((a, b) => b[1] - a[1]);
  const duty = Object.entries(fy.duty || {}).filter(([k]) => FRIENDS[k] && k !== 'black').sort((a, b) => b[1] - a[1]);
  if (fr.length) {
    const [k, c] = fr[0];
    const rest = fr.slice(1, 3).map(([x, v]) => `${esc(FRIENDS[x].name)}（${v} 次）`).join('、');
    out.push({ i: `<span class="rv-fr">${friendArt(k)}</span>`, n: esc(FRIENDS[k].name), t: '今年最常遇到的小夥伴',
      s: `一起聊了 ${c} 次${rest ? `<br>其次是 ${rest}` : ''}${duty.length ? `<br>最常來陪${esc(petState().name)}值日的是 ${esc(FRIENDS[duty[0][0]].name)}（${duty[0][1]} 次）` : ''}` });
  }

  // 小紙條
  const notes = list('notes').filter((n) => inY(n.at));
  if (notes.length) {
    const found = notes.filter((n) => n.found && n.foundAt);
    const slow = found.sort((a, b) => (b.foundAt - b.at) - (a.foundAt - a.at))[0];
    const days = slow ? Math.floor((slow.foundAt - slow.at) / 86400000) : 0;
    out.push({ i: ic('letter'), n: notes.length, t: '張藏起來的小紙條',
      s: ms.map((u) => `${esc(nick(u))} 藏了 ${notes.filter((n) => n.by === u).length} 張`).join('<br>')
        + (slow ? `<br><br>藏最久的是 ${esc(nick(slow.by))} 寫的「${esc(cut(slow.text))}」<br>${days >= 1 ? `過了 ${days} 天` : '當天'}才被找到` : '') });
  }

  // 小小黑這一年
  const pats = sum(fy.pat), feeds = sum(fy.feed);
  if (pats || feeds) {
    const topPat = Object.entries(fy.pat || {}).sort((a, b) => b[1] - a[1])[0];
    out.push({ i: `<span class="rv-fr">${catPose('wave', petState().wear)}</span>`, n: pats, t: `次摸摸${esc(petState().name)}`,
      s: [feeds ? `吃了 ${feeds} 個罐罐` : '', topPat && ms.length > 1 ? `最常摸牠的是 ${esc(nick(topPat[0]))}（${topPat[1]} 次）` : ''].filter(Boolean).join('<br>') });
  }

  // 撞答案
  const hits = list('daily').filter((d) => d.id.startsWith(String(Y)) && d.answers && ms.length > 1 && ms.every((u) => d.answers[u]))
    .map((d) => ({ d, w: dailyCollide(String(d.answers[ms[0]]), String(d.answers[ms[1]])) })).filter((x) => x.w);
  if (hits.length) {
    const h = hits[Math.floor(Math.random() * hits.length)];
    out.push({ i: ic('sparkle'), n: hits.length, t: '次每日一問撞答案',
      s: `像是 ${md(parseD(h.d.id).getTime())}「${esc(cut(D.DAILY_QUESTIONS[h.d.qi] || '', 22))}」<br>你們都寫了「${esc(h.w)}」` });
  }

  // 戳一戳、送給對方的卡
  const pokes = list('events').filter((x) => x.type === 'poke' && inY(x.at));
  if (pokes.length) {
    out.push({ i: ic('heart'), n: pokes.length, t: '次戳一戳',
      s: ms.map((u) => `${esc(nick(u))} 戳了 ${pokes.filter((x) => x.by === u).length} 次`).join('<br>') });
  }
  const sent = list('cards').filter((c) => c.from && c.from !== 'sys' && c.from !== c.owner && inY(c.at));
  if (sent.length) {
    const cnt = {}; sent.forEach((c) => cnt[c.title] = (cnt[c.title] || 0) + 1);
    const top = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0];
    out.push({ i: ic('ticket'), n: sent.length, t: '張送給對方的卡',
      s: ms.map((u) => `${esc(nick(u))} 送了 ${sent.filter((c) => c.from === u).length} 張`).join('<br>') + (top && top[1] > 1 ? `<br>最常送的是「${esc(top[0])}」（${top[1]} 張）` : '') });
  }

  // 今年的第一次（寫出內容）
  const firsts = [];
  const d1 = list('dates').filter((d) => d.done && (d.date || '').startsWith(String(Y))).sort((a, b) => (a.date > b.date ? 1 : -1))[0];
  if (d1) firsts.push(`第一次約會 ${md(parseD(d1.date).getTime())}<br><b>${esc(cut(d1.title, 16))}</b>`);
  const r1 = list('cards').flatMap((c) => (c.log || []).filter((l) => l.how === 'redeem' && inY(l.at)).map((l) => ({ c, at: l.at }))).sort((a, b) => a.at - b.at)[0];
  if (r1) firsts.push(`第一張兌換的卡 ${md(r1.at)}<br><b>${esc(cut(r1.c.title, 16))}</b>（${esc(nick(r1.c.owner))} 用的）`);
  const n1 = [...notes].sort((a, b) => a.at - b.at)[0];
  if (n1) firsts.push(`第一張小紙條 ${md(n1.at)}<br><b>「${esc(cut(n1.text, 16))}」</b>（${esc(nick(n1.by))} 寫的）`);
  const t1 = list('trips').filter((t) => (t.date || '').startsWith(String(Y))).sort((a, b) => (a.date > b.date ? 1 : -1))[0];
  if (t1) firsts.push(`第一個新足跡 ${md(parseD(t1.date).getTime())}<br><b>${esc(cut(t1.name, 16))}</b>`);
  const m1 = list('misses').filter((x) => inY(x.at)).sort((a, b) => a.at - b.at)[0];
  if (m1) firsts.push(`第一次按想你 ${md(m1.at)}<br>是 <b>${esc(nick(m1.by))}</b> 先想的`);
  if (firsts.length >= 2) out.push({ i: ic('sparkle'), n: '第一次', t: `${Y} 年的第一次`, s: `<div class="rv-firsts">${firsts.map((f) => `<div>${f}</div>`).join('')}</div>` });
  return out;
}
