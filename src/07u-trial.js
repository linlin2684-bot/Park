// ============================================================
//  好寶加入前的測試期間：已經結束（11/21 晽晽說不測了）
//  trialOpen() 一律回 false，所有測試加成（點數補滿、小動物 10 秒、搗蛋鬼連續出現、
//  一個人也能用的小月亮／合成等）都關掉，變回正常。
//  關掉後清一次：點數、扭蛋券、罐罐、測試抽到的卡（好寶的生日卡組不動）。
//  好寶加入那一刻 joinFreshStart 還會再清一次。
// ============================================================
function trialOpen() { return false; }
let trialOffBusy = false;
async function trialOffOnce() {
  if (trialOffBusy || !S.couple || !S.cid || S.couple.trialOff || (S.couple.members || []).length !== 1) return;
  if (!COLS.every((c) => S.d[c])) return;
  trialOffBusy = true;
  try {
    const ok = await S.store.coupleTx(S.cid, (x) => (x.trialOff ? null : { trialOff: now() }));
    if (!ok) return;
    try { await saveCloudBackup('trial-off'); } catch (e) { console.warn('關測試前備份失敗', e); }
    const c = S.couple, bSeries = D.BIRTHDAY_SERIES;
    for (const d of list('cards')) {
      if (d.series === bSeries && d.owner !== c.creator) continue;   // 好寶的生日卡組留著
      await col('cards').remove(d.id);
    }
    for (const name of ['points', 'gacha']) for (const d of list(name)) await col(name).remove(d.id);
    await S.store.updateCouple(S.cid, { tickets: {}, cans: {}, canDay: {}, cardMemo: {} });
    toast('測試結束，點數、扭蛋券和測試的卡都清掉了');
    render();
  } catch (e) { console.warn('關測試', e); }
  finally { trialOffBusy = false; }
}
setInterval(() => { if (document.visibilityState !== 'hidden') trialOffOnce(); }, 3000);

// 跳出視窗時，後面的頁面固定不動（iPhone 上 overflow:hidden 不夠，要把 body 釘住）
(() => {
  let lockedY = null;
  const sync = () => {
    const open = !!document.querySelector('.modal-back');
    const b = document.body;
    if (open && lockedY === null) {
      lockedY = window.scrollY;
      Object.assign(b.style, { position: 'fixed', top: `-${lockedY}px`, left: '0', right: '0', width: '100%' });
    } else if (!open && lockedY !== null) {
      const y = lockedY; lockedY = null;
      Object.assign(b.style, { position: '', top: '', left: '', right: '', width: '' });
      window.scrollTo(0, y);
    }
  };
  new MutationObserver(sync).observe(document.body, { childList: true });
})();
window.__toast = toast;
