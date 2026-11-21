
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
