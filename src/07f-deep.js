// ============================================================
//  季任務：深度問答。每季同一組題目，每年重複，看見價值觀的變化
// ============================================================

const DEEP_SEASONS = [
  { name: '春・關係', desc: '我們怎麼相處', qs: [
    '你覺得我們現在最好的地方是什麼？',
    '最近一次覺得被我好好照顧，是什麼時候？',
    '吵架的時候，你最希望我怎麼做？',
    '你覺得「在一起很久」最難的是什麼？',
    '有沒有一件事你一直想跟我說，但還沒說？',
    '如果用三個詞形容現在的我們，會是哪三個？',
  ] },
  { name: '夏・未來', desc: '我們想去哪裡', qs: [
    '五年後的某個週末早上，你希望我們在做什麼？',
    '你理想中的家是什麼樣子？在哪裡、有什麼？',
    '對你來說，結婚代表什麼？',
    '有沒有一個我們一定要一起完成的夢想？',
    '你希望十年後的自己，跟現在最不一樣的地方是？',
    '如果明天可以搬到世界上任何地方住一年，你會選哪裡？',
  ] },
  { name: '秋・價值觀', desc: '什麼對我們重要', qs: [
    '錢對你來說代表什麼？安全感、自由，還是別的？',
    '工作和生活，現在的你比較偏向哪一邊？為什麼？',
    '你覺得家人和伴侶之間，界線應該在哪裡？',
    '什麼事情是你絕對不會妥協的？',
    '你最想從你的家庭帶走的一件事？最想留下不要的一件事？',
    '如果要一起存一筆大錢，你最想花在什麼上？',
  ] },
  { name: '冬・自己', desc: '更認識彼此一點', qs: [
    '這一年你最驕傲的一件事是什麼？',
    '這一年最辛苦的時刻，你是怎麼撐過來的？',
    '最近你最害怕或最擔心的是什麼？',
    '有什麼事情是你希望我更懂你一點的？',
    '你覺得這一年自己最大的改變是什麼？',
    '明年你最想對自己好的方式是什麼？',
  ] },
];

const deepQ = (d = new Date()) => Math.floor(d.getMonth() / 3);
const deepId = (y, q, i) => `${y}-Q${q + 1}-${i}`;

function deepProgress(y = new Date().getFullYear(), q = deepQ()) {
  const ms = S.couple.members;
  const docs = DEEP_SEASONS[q].qs.map((_, i) => list('deep').find((x) => x.id === deepId(y, q, i)));
  const mine = docs.filter((d) => d && d.answers && d.answers[me()]).length;
  const both = docs.filter((d) => d && d.answers && ms.length > 1 && ms.every((u) => d.answers[u])).length;
  return { mine, both, total: docs.length, docs };
}

function memDeep() {
  const y = new Date().getFullYear(), q = deepQ(), Sx = DEEP_SEASONS[q], p = partner();
  const P = deepProgress(y, q);
  const done = P.both === P.total;
  return `<div class="card deep-head">
      <div class="dh-season">${y}・${Sx.name}</div>
      <div class="small muted">${Sx.desc}。兩個人都寫完，答案才會同時打開。同一季的題目每年都會再出現，可以看看自己和對方的想法有沒有變。</div>
      <button class="btn sm ghost dh-yrs" data-act="deepYears" data-q="${q}"><i data-ic="clock"></i> 歷年回答</button>
      <div class="small muted">我寫了 ${P.mine}/${P.total}・一起揭曉 ${P.both}/${P.total}${done ? '・本季完成！' : '・全部完成兩人各 +20 點'}</div>
    </div>
    ${Sx.qs.map((qt, i) => {
      const d = P.docs[i], A = (d && d.answers) || {};
      const mineA = A[me()], theirA = p ? A[p] : null;
      const open = mineA && theirA;
      const past = [];
      for (let yy = y - 1; yy >= y - 5; yy--) { const pd = list('deep').find((x) => x.id === deepId(yy, q, i)); if (pd && pd.answers && pd.answers[me()] && (!p || pd.answers[p])) past.push([yy, pd.answers]); }
      return `<div class="card deep-q ${open ? 'open' : ''}">
        <div class="dq-n">Q${i + 1}</div><div class="dq-t">${esc(qt)}</div>
        ${open ? `<div class="dq-a"><b>${avatar(me())} ${esc(nick(me()))}</b><p>${esc(mineA.text)}</p></div><div class="dq-a"><b>${avatar(p)} ${esc(nick(p))}</b><p>${esc(theirA.text)}</p></div>`
          : `<div class="dq-status small muted">${mineA ? `<i data-ic="lock"></i> 我寫好了，等 ${esc(nick(p) || '對方')}` : theirA ? `${esc(nick(p))} 寫好了，換你` : '兩個人都還沒寫'}</div>
             <button class="btn sm ${mineA ? 'ghost' : ''}" data-act="deepAnswer" data-i="${i}">${mineA ? '修改我的答案' : '寫答案'}</button>`}
        ${past.length ? `<button class="link dq-yrs" data-act="deepYears" data-q="${q}" data-i="${i}"><i data-ic="clock"></i> 看歷年回答（${past.length + (open ? 1 : 0)} 年）</button>` : ''}
      </div>`;
    }).join('')}`;
}

ACT.deepAnswer = async (el) => {
  const y = new Date().getFullYear(), q = deepQ(), i = +el.dataset.i, id = deepId(y, q, i);
  const doc = list('deep').find((x) => x.id === id);
  const cur = doc && doc.answers && doc.answers[me()];
  const v = await promptBox(DEEP_SEASONS[q].qs[i], { multiline: true, value: cur ? cur.text : '', placeholder: '慢慢寫，對方寫完才會看到', ok: '封好' });
  if (!v || !v.trim()) return;
  const ans = { text: v.trim(), at: now() };
  if (doc) await col('deep').update(id, { [`answers.${me()}`]: ans });
  else await col('deep').set(id, { y, q, i, answers: { [me()]: ans }, at: now() });
  const p = partner();
  const theirs = doc && doc.answers && p && doc.answers[p];
  if (!cur) petXP(5);
  if (theirs && !cur) { toast('兩個人都寫好了，答案打開了'); sfx('chime'); if (p) await notify(p, 'deep', `季問答第 ${i + 1} 題，兩個人的答案打開了`); }
  else { toast('封好了，等對方寫完一起打開'); if (p && !cur) await notify(p, 'deep', `${nick(me())} 寫好季問答第 ${i + 1} 題了`); }
  // 本季全部一起揭曉：各 +20 點（只發一次）
  setTimeout(async () => {
    const P = deepProgress(y, q);
    if (P.both === P.total) {
      const k = `deep-${y}-Q${q + 1}`;
      const ok = await S.store.coupleTx(S.cid, (x) => (x.drops && x.drops[k] ? null : { [`drops.${k}`]: true }));
      if (ok) { for (const u of S.couple.members) await addPoints(u, 20, `季問答完成：${DEEP_SEASONS[q].name}`); confetti(90); toast('本季問答全部完成！兩人各 +20 點'); }
    }
  }, 600);
};

// ---------- 歷年回答：同一題，每一年兩個人並排 ----------
function deepYearsOf(q, i) {
  const ms = S.couple.members;
  return list('deep').filter((x) => x.q === q && x.i === i && x.answers && ms.length > 1 && ms.every((u) => x.answers[u])).sort((a, b) => b.y - a.y);
}
ACT.deepYears = (el) => {
  let q = el && el.dataset.q != null ? +el.dataset.q : deepQ();
  const only = el && el.dataset.i != null && el.dataset.i !== '' ? +el.dataset.i : null;
  const p = partner(), ms = [me(), p];
  const m = openModal(`${mhead('<i data-ic="clock"></i> 歷年回答')}<div id="dy"></div>`);
  const draw = () => {
    const Sx = DEEP_SEASONS[q];
    const qs = Sx.qs.map((t, i) => [t, i]).filter(([, i]) => only == null || i === only);
    const any = qs.some(([, i]) => deepYearsOf(q, i).length);
    $('#dy', m).innerHTML = `${only == null ? `<div class="seg dy-seg">${DEEP_SEASONS.map((x, k) => `<button data-q="${k}" class="${k === q ? 'on' : ''}">${x.name.split('・')[0]}</button>`).join('')}</div>` : ''}
      <div class="dy-head emb-${['F-date', 'F-travel', 'F-anniv', 'F-xmas'][q]}"><b>${Sx.name}</b><span>${Sx.desc}</span></div>
      ${any ? qs.map(([t, i]) => { const ys = deepYearsOf(q, i); return ys.length ? `<div class="dy-q">
        <div class="dy-qt"><span>Q${i + 1}</span>${esc(t)}</div>
        <div class="dy-cols"><span>${avatar(me())} ${esc(nick(me()))}</span><span>${avatar(p)} ${esc(nick(p))}</span></div>
        ${ys.map((d) => `<div class="dy-row"><div class="dy-y"><b>${d.y}</b></div><div class="dy-a">${ms.map((u) => `<p>${esc(d.answers[u].text)}</p>`).join('')}</div></div>`).join('')}
      </div>` : ''; }).join('')
      : '<div class="empty">這一季還沒有兩個人都寫完的題目。<br>每年同一季會再問一次同樣的題目，寫過的答案會一年一年排在這裡。</div>'}`;
    $$('.dy-seg button', m).forEach((b) => b.onclick = () => { q = +b.dataset.q; draw(); });
  };
  draw();
};
