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
  reviewMore = (Y, inY) => {
    const base = _more(Y, inY), extra = reviewMore2(Y, inY);
    // 有「我們的 12 個月」就不用再放單張合照那頁
    const hasWall = extra.some((x) => x.wall);
    return [...base.filter((x) => !(hasWall && /張今年的合照/.test(x.t))), ...extra];
  };
}
const RAINY = ['🌧️', '⛈️'], SUNNY = ['☀️', '🌤️', '🌈'];
const FR_LETTER = {
  orange: (n, c) => `${n}來了 ${c} 次，每次都說要試吃我的罐罐`,
  white: (n, c) => `${n}來了 ${c} 次，還是只准我摸一下下`,
  calico: (n, c) => `${n}來了 ${c} 次，每次都帶小魚乾給我`,
  tuxedo: (n, c) => `${n}來了 ${c} 次，家裡到處都是牠送的花`,
  haohao: (n, c) => `${n}來了 ${c} 次。好煩。……其實有一點點喜歡`,
  doggy: (n, c) => `${n}來了 ${c} 次，每次都偷拍我尾巴`,
  abian: (n, c) => `${n}來了 ${c} 次，講了好多我聽不懂的笑話`,
  gungun: (n, c) => `${n}來了 ${c} 次，蘋果都被牠吃光了`,
  shark: (n, c) => `${n}來了 ${c} 次，碰到鼻子就關機`,
};
function reviewMore2(Y, inY) {
  const out = [], ms = S.couple.members || [];
  const fy = ((S.couple.fy || {})[Y]) || {};
  const sum = (o) => Object.values(o || {}).reduce((a, b) => a + b, 0);
  const pn = esc(petState().name);
  const photos = list('photos').filter((p) => (p.date || '').startsWith(String(Y)) && p.img);
  const daily = list('daily').filter((d) => d.id.startsWith(String(Y)) && d.answers && ms.length > 1 && ms.every((u) => d.answers[u]));
  const notes = list('notes').filter((n) => inY(n.at));
  const misses = list('misses').filter((x) => inY(x.at));
  const lastM = new Date(Math.min(now(), new Date(Y, 11, 31).getTime())).getMonth();

  // 我們的 12 個月：每個月一張照片；沒有照片就放那個月的一句每日一問
  const tiles = [];
  for (let m = 0; m <= lastM; m++) {
    const mm = `${Y}-${String(m + 1).padStart(2, '0')}`;
    const ph = photos.filter((p) => p.date.startsWith(mm));
    const pick = ph.length ? ph[(m * 7) % ph.length] : null;
    const dq = !pick && daily.filter((d) => d.id.startsWith(mm));
    const q = dq && dq.length ? dq[(m * 3) % dq.length] : null;
    tiles.push(pick ? `<div class="rv-tile ph" style="background-image:url('${pick.img}')"><span>${m + 1} 月</span></div>`
      : q ? `<div class="rv-tile qa"><span>${m + 1} 月</span><em>「${esc(cut(q.answers[ms[0]], 12))}」</em></div>`
      : `<div class="rv-tile none"><span>${m + 1} 月</span></div>`);
  }
  const filled = tiles.filter((t) => !/none/.test(t)).length;
  if (filled >= 3) out.push({ wall: true, i: `<div class="rv-wall">${tiles.join('')}</div>`, n: '', t: '我們的 12 個月', s: photos.length ? `今年一起留下 ${photos.length} 張照片` : '每個月都有一點我們' });

  // 今年最熱鬧的一天
  const day = {}; const add = (k, w, what) => { if (!k) return; (day[k] = day[k] || { sc: 0, what: {} }); day[k].sc += w; day[k].what[what] = (day[k].what[what] || 0) + 1; };
  list('dates').filter((d) => d.done && (d.date || '').startsWith(String(Y))).forEach((d) => { add(d.date, 3, 'date'); (day[d.date].title = d.title); });
  photos.forEach((p) => add(p.date, 1, 'photo'));
  misses.forEach((x) => add(dkey(new Date(x.at)), 1, 'miss'));
  notes.forEach((n) => add(dkey(new Date(n.at)), 1, 'note'));
  list('cards').forEach((c) => (c.log || []).filter((l) => l.how === 'redeem' && inY(l.at)).forEach((l) => { const k = dkey(new Date(l.at)); add(k, 2, 'redeem'); day[k].card = c.title; }));
  const best = Object.entries(day).sort((a, b) => b[1].sc - a[1].sc)[0];
  if (best && best[1].sc >= 4) {
    const [k, v] = best, w = v.what, bits = [];
    if (v.title) bits.push(`一起去了「${esc(cut(v.title, 14))}」`);
    if (w.photo) bits.push(`拍了 ${w.photo} 張照片`);
    if (v.card) bits.push(`兌換了「${esc(cut(v.card, 12))}」`);
    if (w.note) bits.push(`藏了 ${w.note} 張小紙條`);
    if (w.miss) bits.push(`想了對方 ${w.miss} 次`);
    const ph = photos.filter((p) => p.date === k);
    out.push({ bg: ph.length ? `linear-gradient(rgba(20,8,14,.3), rgba(20,8,14,.75)), url('${ph[0].img}') center/cover` : '', i: ic('sparkle'), n: md(parseD(k).getTime()), t: '今年最熱鬧的一天',
      s: `那天你們${bits.join('、')}<br>是一年裡最滿的一天` });
  }

  // 我們的旅行：每一趟一頁，照片拼貼＋兩個人當下的心得
  const trips = list('trips').filter((t) => (t.date || '').startsWith(String(Y))).sort((a, b) => (a.date > b.date ? 1 : -1));
  trips.map((t) => ({ t, ps: [t.cover && { img: t.cover }, ...tripPhotos(t)].filter((x) => x && x.img), says: tripSays(t) }))
    .filter((x) => x.ps.length || Object.keys(x.says).length).slice(0, 6).forEach(({ t, ps, says }, i, arr) => {
      const pics = ps.slice(0, 4);
      const cap = ps.find((p) => p.caption);
      out.push({ i: pics.length ? `<div class="rv-trip n${pics.length}">${pics.map((p, j) => `<span style="background-image:url('${p.img}');--r:${[-6, 5, -3, 7][j]}deg"></span>`).join('')}</div>` : ic('pin'),
        n: esc(cut(t.name, 10)), t: `${md(parseD(t.date).getTime())}${t.dateEnd ? ` – ${md(parseD(t.dateEnd).getTime())}` : ''}・我們的第 ${i + 1} 趟旅行`,
        s: [...ms.filter((u) => says[u]).map((u) => `<div class="rv-tsay"><small>${esc(nick(u))}</small>「${esc(cut(says[u], 60))}」</div>`),
          !Object.keys(says).length && cap ? `<div class="rv-tsay">「${esc(cut(cap.caption, 40))}」</div>` : ''].join('') });
    });

  // 雨後的彩虹
  const hist = S.couple.moodHist || {};
  let rain = 0, cleared = 0;
  ms.forEach((u) => {
    const H = hist[u] || {};
    Object.keys(H).filter((d) => d.startsWith(String(Y)) && RAINY.includes(H[d])).forEach((d) => {
      rain++;
      const t0 = parseD(d).getTime();
      for (let i = 1; i <= 3; i++) { const n = dkey(new Date(t0 + i * 86400000)); if (SUNNY.includes(H[n])) { cleared++; break; } }
    });
  });
  const care = list('cards').filter((c) => ['抱抱券', '和好券'].includes(c.title) && inY(c.at)).length;
  if (rain) out.push({ i: `<span class="rv-rainbow">${ic('w_rainbow')}</span>`, n: '雨後的彩虹', t: `今年有 ${rain} 天下雨`,
    s: `${cleared ? (cleared === rain ? '每一次，過不久都放晴了' : `其中 ${cleared} 次，三天內就放晴了`) : '下雨的日子，也是一起過的'}${care ? `<br>${pn}一共叼來 ${care} 張抱抱券和和好券` : ''}` });

  // 最常遇到的小夥伴（配一句牠今年說過的話）
  const fr = Object.entries(fy.fr || {}).filter(([k]) => FRIENDS[k]).sort((a, b) => b[1] - a[1]);
  const duty = Object.entries(fy.duty || {}).filter(([k]) => FRIENDS[k] && k !== 'black').sort((a, b) => b[1] - a[1]);
  if (fr.length) {
    const [k, c] = fr[0];
    const L = friendLines(k), seen = Object.keys(((S.couple.dex || {})[k] || {}).l || {}).filter((x) => /^\d+$/.test(x)).map(Number).filter((i) => L[i]);
    const line = L[seen.length ? seen[c % seen.length] : 0];
    out.push({ i: `<span class="rv-fr">${friendArt(k)}</span>`, n: esc(FRIENDS[k].name), t: '今年最常來找你們的小夥伴',
      s: `${line ? `<span class="rv-say">${esc(line)}</span><br>` : ''}一起聊了 ${c} 次，牠一定很喜歡這個家${duty.length ? `<br>最常來陪${pn}值日的是${esc(FRIENDS[duty[0][0]].name)}` : ''}` });
  }

  // 小紙條：藏最久的那張用原本的信紙呈現
  if (notes.length) {
    const found = notes.filter((n) => n.found && n.foundAt);
    const slow = [...found].sort((a, b) => (b.foundAt - b.at) - (a.foundAt - a.at))[0];
    const days = slow ? Math.floor((slow.foundAt - slow.at) / 86400000) : 0;
    out.push({ i: slow ? `<div class="letter note-paper ${paperCls(slow)} rv-note" style="--ink:${noteInk(slow)}">${esc(cut(slow.text, 60))}${paperDeco(slow)}</div>` : ic('letter'),
      n: '', t: slow ? (days >= 1 ? `這張藏了 ${days} 天才被找到` : '這張當天就被找到了') : `今年藏了 ${notes.length} 張小紙條`,
      s: `${slow ? `${esc(nick(slow.by))} 寫的・${md(slow.at)} 藏起來<br>` : ''}今年一共藏了 ${notes.length} 張，${ms.map((u) => `${esc(nick(u))} ${notes.filter((n) => n.by === u).length} 張`).join('、')}` });
  }

  // 撞答案：兩個對話框，撞到的字發亮
  const hits = daily.map((d) => ({ d, w: dailyCollide(String(d.answers[ms[0]]), String(d.answers[ms[1]])) })).filter((x) => x.w);
  if (hits.length) {
    const h = hits[Math.floor(Math.random() * hits.length)];
    const hl = (t) => esc(cut(t, 26)).split(esc(h.w)).join(`<mark>${esc(h.w)}</mark>`);
    out.push({ i: ic('sparkle'), n: '', t: hits.length > 1 ? `今年撞答案 ${hits.length} 次` : '今年撞答案了',
      s: `<div class="rv-q">${md(parseD(h.d.id).getTime())}・${esc(D.DAILY_QUESTIONS[h.d.qi] || '')}</div>
        <div class="rv-pair">${ms.map((u, i) => `<div class="rv-bub ${i ? 'r' : ''}"><small>${esc(nick(u))}</small>${hl(h.d.answers[u])}</div>`).join('')}</div>
        <div class="rv-q">沒商量，卻寫了一樣的話</div>` });
  }

  // 戳一戳、送給對方的卡（數字換成一句話）
  const pokes = list('events').filter((x) => x.type === 'poke' && inY(x.at));
  if (pokes.length) out.push({ i: ic('heart'), n: pokes.length, t: '次戳一戳',
    s: `看到對方在線上，就忍不住戳一下<br>${ms.map((u) => `${esc(nick(u))} ${pokes.filter((x) => x.by === u).length} 次`).join('・')}` });
  const sent = list('cards').filter((c) => c.from && c.from !== 'sys' && c.from !== c.owner && inY(c.at));
  if (sent.length) {
    const cnt = {}; sent.forEach((c) => cnt[c.title] = (cnt[c.title] || 0) + 1);
    const top = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0];
    out.push({ i: ic('ticket'), n: top && top[1] > 1 ? `「${esc(cut(top[0], 8))}」` : sent.length, t: top && top[1] > 1 ? '今年最常送給對方的卡' : '張送給對方的卡',
      s: `${top && top[1] > 1 ? `送了 ${top[1]} 張，看來今年最需要的就是它<br>` : ''}${ms.map((u) => `${esc(nick(u))} 送了 ${sent.filter((c) => c.from === u).length} 張`).join('・')}` });
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
  const m1 = [...misses].sort((a, b) => a.at - b.at)[0];
  if (m1) firsts.push(`第一次按想你 ${md(m1.at)}<br>是 <b>${esc(nick(m1.by))}</b> 先想的`);
  if (firsts.length >= 2) out.push({ i: ic('sparkle'), n: '第一次', t: `${Y} 年的第一次`, s: `<div class="rv-firsts">${firsts.map((f) => `<div>${f}</div>`).join('')}</div>` });

  // 小小黑的一封信
  const P = petState(), pats = sum(fy.pat), feeds = sum(fy.feed);
  const lines = [];
  if (pats) lines.push(`今年你們摸了我 ${pats} 次${feeds ? `，餵了我 ${feeds} 個罐罐` : ''}。每一次我都有呼嚕`);
  if (fr.length) lines.push((FR_LETTER[fr[0][0]] || ((n, c) => `${n}來了 ${c} 次`))(esc(FRIENDS[fr[0][0]].name), fr[0][1]));
  if (misses.length) lines.push(`你們按了 ${misses.length} 次想你，我都有看到`);
  if (rain) lines.push('下雨的時候，我有叼券過去喔');
  lines.push(P.st > 0 ? `我現在是${PET_STAGES[P.st].name}了` : '我還是小奶貓，要再多摸摸我');
  lines.push('明年也要一直在一起喔');
  out.push({ i: `<div class="letter note-paper paper-cat rv-letter" style="--ink:#8c2340">
      <div class="rv-hi">${ms.map((u) => esc(nick(u))).join('、')}：</div>${lines.map((l) => `<p>${l}</p>`).join('')}
      <div class="rv-sign">—— ${pn}</div>${paperDeco({ paper: 'cat' })}</div>`, n: '', t: `${pn}寫給你們的信`, s: '' });
  return out;
}
