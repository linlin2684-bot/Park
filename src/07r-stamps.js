// ============================================================
//  集點章（徽章風印章）＋約會打卡章＋每月回顧卡
// ============================================================
const stampRot = (s) => ((hash(String(s)) % 25) - 14);
function sealDots(n, r, cx = 50, cy = 50, big = 4) {
  let o = ''; for (let i = 0; i < n; i++) { const a = i * 2 * Math.PI / n; o += `<circle cx="${(cx + Math.sin(a) * r).toFixed(1)}" cy="${(cy - Math.cos(a) * r).toFixed(1)}" r="${i % big ? .9 : 1.7}" class="e-ink-f"/>`; } return o;
}
// 一般的章：圓形印章，中間是理由的代表字
function sealSVG(rec) {
  const why = (rec.reason || '').replace(/^蓋章：/, '');
  const PRE = { 做家事: '家', 好貼心: '暖', 哄我開心: '哄', 準時不遲到: '準', 煮飯給我吃: '煮', 今天好可愛: '萌', 有乖乖: '乖', 幫我很多忙: '幫' };
  const ch = PRE[why] || embChar(why.replace(/今天|好|很|有|超|真/g, '') || why) || '讚';
  return `<svg viewBox="0 0 100 100" class="seal emb-C" style="transform:rotate(${stampRot(rec.at)}deg)">
    <circle cx="50" cy="50" r="46" class="e-ink-s" stroke-width="3.2" fill="none"/>
    <circle cx="50" cy="50" r="39" class="e-ink-s" stroke-width="1" fill="none"/>
    ${sealDots(24, 42.5, 50, 50, 6)}
    <circle cx="50" cy="50" r="29" class="e-acc-s" stroke-width="1" fill="none" stroke-dasharray="2.5 3"/>
    <path d="M50 14 l1.6 3.6 l3.6 1.6 l-3.6 1.6 l-1.6 3.6 l-1.6 -3.6 l-3.6 -1.6 l3.6 -1.6 z" class="e-ink-f"/>
    <text x="50" y="62" text-anchor="middle" class="e-ink-f seal-ch">${esc(ch)}</text>
  </svg>`;
}
// 約會章：郵戳形狀，愛心＋日期
function dateSealSVG(rec) {
  const d = new Date(rec.at), md = `${d.getMonth() + 1}.${String(d.getDate()).padStart(2, '0')}`;
  let teeth = ''; for (let i = 0; i < 10; i++) teeth += `<circle cx="${(13 + i * 8.25).toFixed(1)}" cy="10" r="2.6" class="e-bg"/><circle cx="${(13 + i * 8.25).toFixed(1)}" cy="90" r="2.6" class="e-bg"/>`;
  for (let i = 0; i < 10; i++) teeth += `<circle cx="10" cy="${(13 + i * 8.25).toFixed(1)}" r="2.6" class="e-bg"/><circle cx="90" cy="${(13 + i * 8.25).toFixed(1)}" r="2.6" class="e-bg"/>`;
  return `<svg viewBox="0 0 100 100" class="seal emb-F-date" style="transform:rotate(${stampRot(rec.at)}deg)">
    <rect x="10" y="10" width="80" height="80" rx="4" class="e-ink-f"/>${teeth}
    <rect x="17" y="17" width="66" height="66" rx="3" class="e-bg"/>
    <rect x="21" y="21" width="58" height="58" rx="2" class="e-ink-s" stroke-width="1.2" fill="none"/>
    <path d="M50 46 C42 40 34 34 38 28 C41 24 47 25 50 30 C53 25 59 24 62 28 C66 34 58 40 50 46 Z" class="e-acc-f e-ink-s" stroke-width="1.4" stroke-linejoin="round"/>
    <text x="50" y="62" text-anchor="middle" class="e-ink-f seal-t">約 會</text>
    <text x="50" y="74" text-anchor="middle" class="e-ink-f seal-d">${md}</text>
  </svg>`;
}
const stampHTML = (rec) => (/^約會：/.test(rec.reason || '') ? dateSealSVG(rec) : sealSVG(rec));
// 蓋章共用：加點、通知、集滿送扭蛋券
async function addStamp(p, reason, { notifyText } = {}) {
  const before = stampCount(p);
  await addPoints(p, D.POINTS.stamp, reason, 'stamp');
  maybeCan(p, '被蓋了章', .3);
  await notify(p, 'stamp', notifyText || `${nick(me())} 幫你蓋了一個章 📮`, reason.replace(/^(蓋章|約會)：/, ''));
  if ((before + 1) % D.POINTS.stampsPerSheet === 0) { await addTicket(p, 1); await notify(p, 'stamp', '集滿一張章卡！送你一張扭蛋券 🎫'); }
}
// 約會完成：兩個人互相蓋一個約會章（每個約會只蓋一次）
async function dateStamps(d) {
  const ok = await S.store.coupleTx(S.cid, (c) => ((c.drops || {})[`dstamp-${d.id}`] ? null : { [`drops.dstamp-${d.id}`]: true }));
  if (!ok) return;
  for (const u of S.couple.members) await addStamp(u, '約會：' + (d.title || '一起出門'), { notifyText: `約會完成，${u === me() ? '你們' : nick(me()) + '和你'}都拿到一個約會章 💌` });
  setTimeout(() => toast('兩個人都拿到一個約會章'), 1400);
}

// ---------- 每月回顧（每月 1～7 號出現在首頁） ----------
function monthReview() {
  const d = new Date(); if (d.getDate() > 7) return null;
  const pm = new Date(d.getFullYear(), d.getMonth() - 1, 1), y = pm.getFullYear(), mo = pm.getMonth();
  const inM = (t) => { const x = new Date(t); return x.getFullYear() === y && x.getMonth() === mo; };
  const inMk = (k) => k && +k.slice(0, 4) === y && +k.slice(5, 7) === mo + 1;
  const ms = (S.couple.members || []);
  const moodTop = (u) => { const h = ((S.couple.moodHist || {})[u]) || {}; const cnt = {}; Object.entries(h).forEach(([k, v]) => { if (inMk(k)) cnt[v] = (cnt[v] || 0) + 1; }); const top = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0]; return top ? top[0] : ''; };
  const st = {
    dates: list('dates').filter((x) => x.done && x.doneAt && inM(x.doneAt)).length,
    daily: list('daily').filter((x) => inMk(x.id) && x.answers && ms.every((u) => x.answers[u])).length,
    stamps: list('points').filter((p) => p.tag === 'stamp' && inM(p.at)).length,
    redeem: list('events').filter((e) => e.type === 'redeem' && inM(e.at) && e.to !== 'sys').length,
    photos: list('photos').filter((x) => inMk(x.date)).length + list('memories').filter((x) => inMk(x.date)).length,
    notes: list('notes').filter((n) => inM(n.at)).length,
  };
  const any = Object.values(st).some((v) => v);
  return { y, mo, st, any, moods: ms.map((u) => [u, moodTop(u)]) };
}
function monthReviewHTML() {
  const R = monthReview(); if (!R || !R.any) return '';
  const key = `park-mreview-${R.y}-${R.mo}`; if (localStorage.getItem(key)) return '';
  const MN = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'][R.mo];
  const items = [['map', '一起約會', R.st.dates, '次'], ['chat', '每日一問', R.st.daily, '天'], ['stamp', '蓋了章', R.st.stamps, '個'], ['ticket', '兌換票券', R.st.redeem, '張'], ['photo', '照片和回憶', R.st.photos, '個'], ['letter', '小紙條', R.st.notes, '張']].filter((x) => x[2]);
  let rays = ''; for (let i = 0; i < 24; i++) { const a = i * 15 * Math.PI / 180; rays += `<line x1="${(60 + Math.sin(a) * 47).toFixed(1)}" y1="${(60 - Math.cos(a) * 47).toFixed(1)}" x2="${(60 + Math.sin(a) * (i % 2 ? 51 : 54)).toFixed(1)}" y2="${(60 - Math.cos(a) * (i % 2 ? 51 : 54)).toFixed(1)}" class="e-ink-s" stroke-width="${i % 2 ? .8 : 1.4}"/>`; }
  return `<div class="card mrev emb-SSR">
    <button class="mrev-x" data-act="mrevHide" data-k="${key}" aria-label="收起來">✕</button>
    <div class="mrev-top">
      <svg viewBox="0 0 120 120" class="mrev-medal">${rays}<circle cx="60" cy="60" r="44" class="e-bg e-ink-s" stroke-width="1.6"/><circle cx="60" cy="60" r="38" class="e-acc-s" stroke-width=".9" fill="none" stroke-dasharray="2 3"/>
        <text x="60" y="62" text-anchor="middle" class="e-ink-f mrev-n" style="font-size:${MN.length > 1 ? 22 : 30}px">${MN}</text><text x="60" y="80" text-anchor="middle" class="e-ink-f mrev-s">月</text></svg>
      <div><div class="mrev-eye">${R.y} · MONTHLY</div><b class="mrev-h">${MN}月的我們</b><div class="small muted">上個月一起留下的小事</div></div>
    </div>
    <div class="mrev-g" style="grid-template-columns:repeat(${items.length === 4 ? 2 : Math.min(3, items.length)},1fr)">${items.map(([ic, n, v, u]) => `<div class="mrev-i"><i data-ic="${ic}"></i><b>${v}<small>${u}</small></b><span>${n}</span></div>`).join('')}</div>
    ${R.moods.some(([, m]) => m) ? `<div class="mrev-mood">${R.moods.map(([u, m]) => m ? `<span>${avatar(u)} ${esc(nick(u))} 最常是 ${moodIc(m)} ${esc((D.MOODS.find((x) => x.icon === m) || {}).label || '')}</span>` : '').join('')}</div>` : ''}
  </div>`;
}
ACT.mrevHide = (el) => { localStorage.setItem(el.dataset.k, '1'); render(); };
