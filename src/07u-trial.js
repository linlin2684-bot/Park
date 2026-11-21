
// ============================================================
//  好寶加入前的測試期間（只有一個人的時候）
//  - 小動物每 10 秒路過一次、新台詞／新小劇場不限次數
//  - 點數補到 9999、扭蛋券補到 99，玩不完
//  好寶加入那一刻 joinFreshStart 會清掉所有點數、扭蛋券，自動變回正常
// ============================================================
function trialOpen() { return !!S.couple && (S.couple.members || []).length === 1; }
const TRIAL_PTS = 9999, TRIAL_TICKETS = 99;
let trialBusy = false;
async function trialTopUp() {
  if (trialBusy || !trialOpen() || !S.d.points) return;
  trialBusy = true;
  try {
    const bal = balance(me());
    if (bal < 2000) await addPoints(me(), TRIAL_PTS - bal, '測試期間：點數補滿');
    const tk = (S.couple.tickets || {})[me()] || 0;
    if (tk < 20) await S.store.updateCouple(S.cid, { [`tickets.${me()}`]: TRIAL_TICKETS });
  } catch (e) { console.warn('測試點數', e); }
  trialBusy = false;
}
setInterval(() => {
  if (!trialOpen() || document.visibilityState === 'hidden') return;
  trialTopUp();
  catStroll();
}, 10000);


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
