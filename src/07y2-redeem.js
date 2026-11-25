// ============================================================
//  兌換券：對方可以「先收起來」，做完打勾 → 兌換的人驗收（11/24 晽晽要求）
//  資料放在兌換時建立的那筆 events（type 'redeem'）上：
//    task: 'doing'（收到了，待完成） → 'done'（做的人打勾了，等驗收） → 'ok'（驗收成功）
//    later: true＝選了「先收起來」；doneAt、okAt 記時間
// ============================================================
const rdTasks = () => list('events').filter((e) => e.type === 'redeem' && e.cardId && e.task && e.task !== 'ok');
const rdCard = (e) => list('cards').find((x) => x.id === e.cardId);
const rdTitle = (e) => { const c = rdCard(e); return (c && c.title) || e.detail || '票券'; };

// 對方跳出大卡片：「馬上來」或「先收起來」，兩種都會進到待完成
redeemPopup = function () {
  if (!S.d.events || !S.d.cards || document.querySelector('.redeem-pop')) return;
  const key = `park-redeem-pop-${S.cid}-${me()}`;
  const evs = list('events').filter((e) => e.to === me() && e.type === 'redeem' && e.cardId);
  let seen = null; try { seen = JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) {}
  if (!seen) { localStorage.setItem(key, JSON.stringify(evs.map((e) => e.id))); return; }
  const e = evs.filter((x) => !seen.includes(x.id) && !x.read).sort((a, b) => a.at - b.at)[0];
  if (!e) return;
  seen.push(e.id); localStorage.setItem(key, JSON.stringify(seen.slice(-300)));
  const c = rdCard(e);
  const m = openModal(`<div class="redeem-pop">
      <div class="rp-head"><span class="rp-who">${esc(nick(e.by))}</span> 要兌換這張！</div>
      ${c ? bigCardHTML(c).replace(/<p class="center small muted"[\s\S]*?<\/p>\s*$/, '') : `<div class="rp-title">${esc(e.detail)}</div>`}
      <button class="btn block" id="rp-ok">收到，馬上來</button>
      <button class="btn ghost block mt" id="rp-later"><i data-ic="hourglass"></i> 先收起來，晚點做</button>
      <p class="center small muted" style="margin:8px 0 0">做完記得打勾，${esc(nick(e.by))} 驗收了才算兌換完成</p>
    </div>`, { center: true, cls: 'redeem-pop-back' });
  if (c && typeof attachCardFX === 'function') attachCardFX(m);
  sfx('chime'); confetti(c && (c.rarity === 'SSR' || c.rarity === 'SR') ? 90 : 45);
  const take = async (later) => {
    closeModal(m);
    await col('events').update(e.id, { read: true, task: 'doing', later, takenAt: now() });
    await notify(e.by, 'redeem', later ? `${nick(me())} 收下「${rdTitle(e)}」了，晚點會做` : `${nick(me())} 說馬上來：${rdTitle(e)}`);
    if (later) toast('收起來了，在「有人在等你」和票夾都看得到');
    setTimeout(redeemPopup, 400);
  };
  $('#rp-ok', m).onclick = () => take(false);
  $('#rp-later', m).onclick = () => take(true);
};

// 一筆兌換的詳細視窗（做的人：打勾；兌換的人：驗收）
ACT.rdOpen = (el) => {
  const e = list('events').find((x) => x.id === el.dataset.id); if (!e) return;
  const c = rdCard(e), doer = e.to, asker = e.by;
  const step = (n, on, t) => `<div class="rd-step ${on ? 'on' : ''}"><span class="rd-dot">${on ? '<i data-ic="check"></i>' : n}</span><span>${t}</span></div>`;
  const body = () => {
    const x = list('events').find((y) => y.id === e.id) || e;
    const iDo = doer === me(), iAsk = asker === me();
    let act = '';
    if (x.task === 'doing' && iDo) act = '<button class="btn block" id="rd-done"><i data-ic="check"></i> 做完了，請對方驗收</button>';
    else if (x.task === 'doing') act = `<p class="center small muted">等 ${esc(nick(doer))} 做完打勾</p>`;
    else if (x.task === 'done' && iAsk) act = '<div class="btn-row"><button class="btn ghost" id="rd-no">還沒有喔</button><button class="btn" id="rd-ok"><i data-ic="sparkle"></i> 驗收成功</button></div>';
    else if (x.task === 'done') act = `<p class="center small muted">等 ${esc(nick(asker))} 驗收</p>`;
    else if (x.task === 'ok') act = `<p class="center small" style="color:var(--accent)">${fmtDate(x.okAt)} 驗收成功</p>`;
    return `${mhead('<i data-ic="ticket"></i> 兌換中')}
      <div class="ritual">${c ? bigCardHTML(c) : `<div class="rp-title">${esc(e.detail)}</div>`}</div>
      <div class="rd-steps">
        ${step(1, true, `${esc(nick(asker))} 兌換`)}
        ${step(2, ['doing', 'done', 'ok'].includes(x.task), x.later ? `${esc(nick(doer))} 先收起來` : `${esc(nick(doer))} 收到`)}
        ${step(3, ['done', 'ok'].includes(x.task), `${esc(nick(doer))} 做完`)}
        ${step(4, x.task === 'ok', `${esc(nick(asker))} 驗收`)}
      </div>${act}`;
  };
  const m = openModal(body(), { center: true });
  const wire = () => {
    const re = () => { m.querySelector('.modal').innerHTML = body(); wire(); render(); };
    $('#rd-done', m) && ($('#rd-done', m).onclick = async () => {
      await col('events').update(e.id, { task: 'done', doneAt: now() });
      await notify(asker, 'redeem', `${nick(me())} 說「${rdTitle(e)}」做完了，去驗收吧`);
      sfx('pop'); toast('打勾了，等對方驗收'); setTimeout(re, 150);
    });
    $('#rd-ok', m) && ($('#rd-ok', m).onclick = async () => {
      await col('events').update(e.id, { task: 'ok', okAt: now() });
      await notify(doer, 'redeem', `「${rdTitle(e)}」驗收成功 ✨`);
      confetti(70); sfx('sparkle'); petXP(2); toast('驗收成功！'); setTimeout(re, 150);
    });
    $('#rd-no', m) && ($('#rd-no', m).onclick = async () => {
      await col('events').update(e.id, { task: 'doing' });
      await notify(doer, 'redeem', `「${rdTitle(e)}」好像還沒做完喔`);
      toast('退回去了'); setTimeout(re, 150);
    });
  };
  wire();
};

// 首頁「有人在等你」
const _rdTodos0 = homeTodos;
homeTodos = () => {
  const t = _rdTodos0();
  for (const e of rdTasks()) {
    if (e.task === 'doing' && e.to === me()) t.push({ icon: '<i data-ic="ticket"></i>', text: `${nick(e.by)} 兌換的「${rdTitle(e)}」，做完記得打勾`, act: 'rdOpen', id: e.id, btn: '打勾' });
    if (e.task === 'done' && e.by === me()) t.unshift({ icon: '<i data-ic="sparkle"></i>', text: `${nick(e.to)} 說「${rdTitle(e)}」做完了`, act: 'rdOpen', id: e.id, btn: '驗收' });
  }
  return t;
};

// 票夾「我的票夾」最上面：兌換中
function rdWalletHTML() {
  const ts = rdTasks().filter((e) => e.to === me() || e.by === me()).sort((a, b) => a.at - b.at);
  if (!ts.length) return '';
  const lab = (e) => (e.task === 'done' ? (e.by === me() ? '等你驗收' : '等對方驗收') : (e.to === me() ? (e.later ? '收起來了，待完成' : '待完成') : `${esc(nick(e.to))} 處理中`));
  return `<div class="rd-wallet"><h3 class="rd-h"><i data-ic="hourglass"></i> 兌換中</h3>
    ${ts.map((e) => `<button class="rd-row ${e.task}" data-act="rdOpen" data-id="${e.id}"><span class="rd-t">${esc(rdTitle(e))}</span><span class="rd-s">${lab(e)}</span></button>`).join('')}</div>`;
}
const _rdWM0 = walletMine;
walletMine = () => rdWalletHTML() + _rdWM0();

// 11/24：還沒結束的舊版（單題）對戰挑戰收起來，改用每週 3 題版（07z2-battle.js）
let btOldBusy = false;
setInterval(async () => {
  if (btOldBusy || !S.d.battles || !S.couple || document.visibilityState === 'hidden') return;
  const old = list('battles').filter((b) => !b.kind && ['pending', 'active', 'claimed'].includes(b.status));
  if (!old.length) return;
  btOldBusy = true;
  try { for (const b of old) await col('battles').update(b.id, { status: 'cancel', cancelWhy: 'v3' }); } finally { btOldBusy = false; }
}, 5000);
