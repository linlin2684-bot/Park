// ============================================================
//  罐罐（不扣點）：每天配給一個＋做事偶爾掉＋小動物送來
//  扭蛋券新拿法：每週任務全完成、連續 7 天每日一問、節日當天
// ============================================================
function canState(u = me()) {
  const c = S.couple || {};
  return { daily: ((c.canDay || {})[u] || '') !== dkey(), stock: (c.cans || {})[u] || 0 };
}
async function giveCan(u, why, quiet = false) {
  if (!S.couple || (S.couple.members || []).length < (trialOpen() ? 1 : 2)) return;
  await S.store.coupleTx(S.cid, (c) => ({ [`cans.${u}`]: ((c.cans || {})[u] || 0) + 1 }));
  if (!quiet && u === me()) setTimeout(() => toast(`${why}，掉了一個罐罐`), 900);
}
// 換罐罐按錯了：把卡拿回來、罐罐收回一個
async function canUndo(card) {
  const { id, ...data } = card;
  const nid = await col('cards').add(data);
  await S.store.coupleTx(S.cid, (c) => ({ [`cans.${me()}`]: Math.max(0, ((c.cans || {})[me()] || 0) - 1) }));
  return nid;
}
// 回答每日一問、做每週任務、被蓋章時偶爾掉一個
const maybeCan = (u, why, p) => { if (Math.random() < p) giveCan(u, why, u !== me()); };
// 路過的小動物偶爾叼一個罐罐來（晽晽貓貓會自己吃掉）
function maybeAnimalCan(k) {
  if (Math.random() > .1 || !S.couple || (S.couple.members || []).length < 2) return;
  const n = FRIENDS[k]?.name || '小動物';
  if (k === 'orange') return setTimeout(() => toast('晽晽貓貓叼著一個罐罐路過……然後自己吃掉了'), 1400);
  giveCan(me(), '', true);
  setTimeout(() => toast(`${n}叼了一個罐罐送給小小黑`), 1400);
}
async function feedCan() {
  const st = canState();
  if (!st.daily && st.stock < 1) return false;
  await S.store.coupleTx(S.cid, (c) => {
    const daily = ((c.canDay || {})[me()] || '') !== dkey(), stock = (c.cans || {})[me()] || 0;
    if (daily) return { [`canDay.${me()}`]: dkey(), 'pet.feeds': ((c.pet || {}).feeds || 0) + 1 };
    if (stock > 0) return { [`cans.${me()}`]: stock - 1, 'pet.feeds': ((c.pet || {}).feeds || 0) + 1 };
    return null;
  });
  return true;
}

// ---------- 扭蛋券 ----------
async function ticketOnce(key, users, text) {
  const k = `tk-${key}`;
  const ok = await S.store.coupleTx(S.cid, (x) => (x.drops && x.drops[k] ? null : { [`drops.${k}`]: true }));
  if (!ok) return;
  for (const u of users) { await addTicket(u, 1); await col('events').add({ to: u, by: 'sys', type: 'card', text, detail: '扭蛋券 +1', at: now(), read: false }); }
  if (users.includes(me())) setTimeout(() => toast(`${text}：扭蛋券 +1`), 600);
}
// 每週任務 3 項都做完
async function weekTicketCheck() {
  const wk = weekKey();
  const n = list('taskDone').filter((d) => d.uid === me() && d.week === wk).length;
  if (n >= weekTasks().length) await ticketOnce(`week-${wk}-${me()}`, [me()], '這週的任務全部完成');
}
// 連續 7 天回答每日一問（7、14、21…天各一張）
async function dailyStreakTicket() {
  let n = 0; const d = new Date();
  for (; n < 400; n++) {
    const doc = list('daily').find((x) => x.id === dkey(d));
    if (!doc || !(doc.answers || {})[me()]) break;
    d.setDate(d.getDate() - 1);
  }
  if (n > 0 && n % 7 === 0) await ticketOnce(`daily7-${me()}-${dkey()}`, [me()], `連續 ${n} 天回答每日一問`);
}
