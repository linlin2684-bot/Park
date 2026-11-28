// ============================================================
//  UR 許願券（11/28 晽晽要求）
//  3 張 SSR 合成 1 張 UR「許願券」：持有的人自己寫願望，對方幫忙實現。扭蛋抽不到。
//  卡池裡原本的「許願券」類卡片拿掉（願望清單兌現、標題有「許願」的），只做一次（drops pool-nowish）。
// ============================================================
const UR_IDEAS = ['一趟說走就走的小旅行，你來安排', '一整天的約會，行程全部聽我的', '一份我想了很久的禮物', '一頓你親手做的大餐', '一個沒有手機、只有我們的晚上'];
const UR_TPL = { title: '許願券', rarity: 'UR', mark: '夢', pat: 'shippo', frame: 0, desc: '' };
async function urCraftReveal() {
  const p = partner() || 'sys';
  const id = await giveCard(me(), { ...UR_TPL }, { from: p, scratched: true, urWish: true });
  await col('gacha').add({ uid: me(), rarity: 'UR', title: '許願券', how: 'craft', at: now() });
  // 華麗登場
  const fx = document.createElement('div');
  fx.className = 'ur-fx';
  let rays = '';
  for (let i = 0; i < 24; i++) rays += `<i style="--a:${i * 15}deg;--d:${(i % 3) * 0.08}s"></i>`;
  fx.innerHTML = `<div class="ur-rays">${rays}</div><div class="ur-orb"></div>
    <div class="ur-title"><small>✦ 3 張 SSR 合而為一 ✦</small><b>UR</b><span>許願券</span></div>`;
  document.body.appendChild(fx);
  confetti(180, ['#f6d365', '#fda085', '#f093fb', '#8fd3f4', '#c9a3ff', '#fff']); sfx('sparkle'); vibrate([60, 40, 60, 40, 240]);
  await sleep(2600);
  fx.classList.add('out'); setTimeout(() => fx.remove(), 500);
  urWrite(id, true);
}
function urWrite(id, fresh = false) {
  const c = list('cards').find((x) => x.id === id);
  const m = openModal(`${mhead('<i data-ic="sparkle"></i> UR 許願券')}
    <div class="ur-pv">${ticketHTML(c || { ...UR_TPL, id, owner: me(), from: partner(), qty: 1, used: 0, scratched: true })}</div>
    <p class="small muted">${fresh ? '恭喜！' : ''}寫下一個願望，${esc(nick(partner()))} 會幫你實現。寫好之後放在票夾，想兌現的時候再拿出來。</p>
    <textarea id="ur-in" maxlength="60" placeholder="我的願望是…">${esc((c && c.desc) || '')}</textarea>
    <div class="ms-ideas">${UR_IDEAS.map((s) => `<button class="chip" data-idea="${esc(s)}">${esc(s)}</button>`).join('')}</div>
    <div class="btn-row"><button class="btn ghost" id="ur-later">之後再寫</button><button class="btn" id="ur-ok">許願 ✦</button></div>`, { center: true });
  m.querySelectorAll('[data-idea]').forEach((b) => b.onclick = () => { $('#ur-in', m).value = b.dataset.idea; });
  $('#ur-later', m).onclick = () => closeModal(m);
  $('#ur-ok', m).onclick = async () => {
    const v = $('#ur-in', m).value.trim();
    if (!v) return toast('先寫下你的願望');
    await col('cards').update(id, { desc: v });
    if (partner()) await notify(partner(), 'card', `${nick(me())} 用 3 張 SSR 合成了一張 UR 許願券 ✦`);
    closeModal(m); toast('願望收進票夾了 ✦'); render();
  };
}
ACT.urWrite = (el) => urWrite(el.dataset.id);
const _urTodos0 = homeTodos;
homeTodos = () => {
  const t = _urTodos0();
  for (const c of list('cards').filter((c) => c.urWish && !c.desc && c.owner === me())) {
    t.unshift({ icon: '<i data-ic="sparkle"></i>', text: '你的 UR 許願券還沒寫願望', act: 'urWrite', id: c.id, btn: '去寫' });
  }
  return t;
};
// 卡池拿掉許願券類的卡
const POOL_NOWISH = (p) => p && p.title && (/許願/.test(p.title) || p.title === '願望清單兌現');
let poolNoWishBusy = false;
async function poolNoWishOnce() {
  const c = S.couple;
  if (poolNoWishBusy || !c || !S.cid || (c.drops || {})['pool-nowish'] || !S.d.pool) return;
  poolNoWishBusy = true;
  try {
    const ok = await S.store.coupleTx(S.cid, (x) => ((x.drops || {})['pool-nowish'] ? null : { 'drops.pool-nowish': true }));
    if (!ok) return;
    for (const p of list('pool').filter(POOL_NOWISH)) await col('pool').remove(p.id);
  } catch (e) { console.warn('卡池拿掉許願券', e); }
  finally { poolNoWishBusy = false; }
}
setInterval(() => { if (document.visibilityState !== 'hidden') poolNoWishOnce(); }, 4000);
