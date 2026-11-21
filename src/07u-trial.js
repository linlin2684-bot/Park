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

// 火辣區密碼的保險：密碼的雜湊值也存一份在自己的帳號資料（users/{uid}.hotPin）
// 萬一空間裡的 hot.pin 不見了，打開 app 時自動補回去，不會被要求重設
const _hotSetPin0 = hotSetPin;
hotSetPin = async () => {
  const ok = await _hotSetPin0();
  if (ok) setTimeout(hotPinMirror, 800);
  return ok;
};
let hotPinChecked = '';
async function hotPinMirror() {
  try {
    if (!S.couple || !S.cid || !me()) return;
    const u = (await S.store.getUser(me())) || {};
    const mine = u.hotPin && u.hotPin.cid === S.cid ? u.hotPin : null;
    const cur = S.couple.hot && S.couple.hot.pin;
    if (cur && (!mine || mine.pin !== cur)) await S.store.setUser(me(), { hotPin: { cid: S.cid, pin: cur, at: S.couple.hot.pinAt || now() } });
    else if (!cur && mine) { S.store.updateCouple(S.cid, { 'hot.pin': mine.pin, 'hot.pinAt': mine.at }); console.warn('火辣區密碼不見了，已從帳號備份補回'); }
  } catch (e) { console.warn('火辣密碼備份', e); }
}
setInterval(() => {
  if (!S.couple || !S.cid || document.visibilityState === 'hidden') return;
  const k = `${S.cid}:${(S.couple.hot && S.couple.hot.pin) || ''}`;
  if (hotPinChecked === k) return;
  hotPinChecked = k; hotPinMirror();
}, 4000);

// 11/22：關測試時把票夾裡的生日系列卡也清掉了 → 從關測試前的雲端備份拿回來（只做一次）
let bdayBackBusy = false;
async function bdayBackOnce() {
  const c = S.couple;
  if (bdayBackBusy || !c || !S.cid || !c.trialOff || c.bdayBack || (c.members || []).length !== 1) return;
  if (!COLS.every((n) => S.d[n])) return;
  bdayBackBusy = true;
  try {
    const all = await listCloudBackups();
    const cand = all.filter((b) => b.at <= c.trialOff + 5 * 60000).sort((a, b) => b.at - a.at);
    const b = cand.find((x) => x.at >= c.trialOff - 10 * 60000) || cand[0];
    if (!b) return;
    const ok = await S.store.coupleTx(S.cid, (x) => (x.bdayBack ? null : { bdayBack: now() }));
    if (!ok) return;
    const data = await loadCloudBackup(b);
    const have = new Set(list('cards').map((d) => d.id));
    const back = ((data.cols && data.cols.cards) || []).filter((d) => d.series === D.BIRTHDAY_SERIES && d.id && !have.has(d.id));
    for (const d of back) { const { id, ...rest } = d; await col('cards').set(id, rest, false); }
    if (back.length) { toast(`找回 ${back.length} 張生日系列的卡`); render(); }
  } catch (e) { console.warn('找回生日卡', e); }
  finally { bdayBackBusy = false; }
}
setInterval(() => { if (document.visibilityState !== 'hidden') bdayBackOnce(); }, 3500);
