
// ============================================================
//  功能整合（2026/11/21 她選的 11 項）
//  新功能補成就、隱藏成就、火辣成就補齊、成就有獎勵、想試清單→約會點子、
//  壽星特權、罐罐商店、節日限定／旅行限定火辣內容、小小黑會反應、這一年回顧
//  全部放在這個檔案，盡量不動別的檔案
// ============================================================

// ---------- 小工具 ----------
const mdOf = (s) => String(s || '').slice(-5);
const todayMD = () => dkey().slice(5);
const bothIn = () => (S.couple?.members || []).length === 2;
function isBday(u = me()) { return !!u && mdOf(prof(u).bday) === todayMD(); }
function annivMD() { return mdOf(S.couple?.dates?.anniversary || D.DEFAULT_DATES.anniversary); }
// 旅行中：足跡的日期包含今天
function tripNow() {
  const t = dkey();
  return list('trips').find((x) => x.date && x.date <= t && (x.dateEnd || x.date) >= t) || null;
}
// 今天是哪個節日（火辣限定內容用）
function hotFestToday() {
  const md = todayMD();
  if (md === '02-14') return 'val';
  if (md === '12-24' || md === '12-25') return 'xmas';
  if (md === '12-31' || md === '01-01') return 'ny';
  if (md === annivMD()) return 'anniv';
  return '';
}
const HOT_FEST_NAME = { val: '情人節限定', xmas: '聖誕限定', ny: '跨年限定', anniv: '紀念日限定', trip: '旅行限定' };

// ============================================================
//  節日限定、旅行限定的火辣內容（加在牌組和劇本的最後面，編號不變）
// ============================================================
[
  { no: 70, lv: 2, fest: 'val', name: '心跳', how: '面對面的姿勢，她的手放在他胸口、他的手放在她胸口，全程感受彼此的心跳', tip: '心跳越快，動作越慢' },
  { no: 71, lv: 3, fest: 'xmas', name: '拆禮物', how: '她在身上綁一條緞帶當禮物，他要慢慢拆開，拆完才可以開始', tip: '緞帶綁鬆一點，好拆' },
  { no: 72, lv: 2, fest: 'anniv', name: '我們的第一次', how: '用你們第一次的那個姿勢，邊做邊說當時記得的事', tip: '記錯了要被罰親一下' },
  { no: 73, lv: 3, fest: 'ny', name: '跨年倒數', how: '跨年倒數前開始，新年的第一秒一定要接吻', tip: '先把手機的倒數準備好' },
  { no: 74, lv: 3, trip: true, name: '落地窗', how: '飯店的窗簾拉好只留一條縫，她扶著窗邊，他站在她身後', tip: '窗簾一定要拉好' },
  { no: 75, lv: 2, trip: true, name: '飯店浴缸', how: '飯店的浴缸放滿熱水，他坐在後面，她靠在他胸前', tip: '可以加一點泡泡' },
  { no: 76, lv: 3, trip: true, name: '大床', how: '她躺在飯店大床的正中間，他從床尾慢慢爬上來，面對面', tip: '飯店的床，不用怕吵到誰' },
].forEach((p) => { if (!D.HOT_POSES.some((x) => x.no === p.no)) D.HOT_POSES.push(p); });

[
  { fest: 'val', t: '情人節的告白', her: '收到告白的人', him: '準備了很久要告白的人', set: '情人節晚上，他約她出來，說有一件事一定要今天說。',
    herLines: ['你約我出來，是要說什麼？', '我等這句話很久了。'], himLines: ['我喜歡你，很久了。', '今天，讓我證明給你看。'],
    herP: '假裝什麼都不知道的女生', herS: '早就知道他要告白，今晚想讓他緊張到不行', himP: '平常很會說話、今天卻很緊張的男生', himS: '準備了一份禮物，要等她答應才拿出來',
    prep: '一朵花或一張小卡片、一點甜點', entry: '她先坐好，他拿著花敲門進來', acts: ['他支支吾吾，她裝傻', '他終於說出口', '她說「那你證明給我看」'] },
  { fest: 'xmas', t: '聖誕老人的禮物', her: '寫信給聖誕老人的人', him: '半夜來送禮的聖誕老人', set: '聖誕夜，她在信裡寫了一個很大膽的願望，聖誕老人半夜真的來了。',
    herLines: ['你真的看到我的信了？', '我今年很乖⋯⋯應該可以拿禮物吧？'], himLines: ['我是來送你許的願的。', '先說說，你今年有多乖？'],
    herP: '假裝睡著、其實在等的女生', herS: '信裡寫的願望是他', himP: '神秘、會讓願望成真的聖誕老人', himS: '這份禮物只送她一個人',
    prep: '紅色的衣服或帽子、一個小禮物、小燈泡或蠟燭', entry: '她躺在床上假裝睡著，他悄悄走進來', acts: ['他「送禮物」，她偷看', '她問他禮物是什麼', '願望成真'] },
  { fest: 'anniv', t: '我們第一次見面', her: '那天的你', him: '那天的你', set: '重演你們真正第一次見面的那天。照著記憶演，記不清楚的就照你們想要的樣子演。',
    herLines: ['你那天，第一眼看到我在想什麼？', '如果那天我沒有理你呢？'], himLines: ['那天，你穿的是⋯⋯', '我那時候就想，一定要認識你。'],
    herP: '那天的自己', herS: '說出一件那天沒告訴他的事', himP: '那天的自己', himS: '說出一件那天沒告訴她的事',
    prep: '如果還記得，穿上那天類似的衣服', entry: '照你們第一次見面的方式重新開始', acts: ['重演第一次見面', '說出當時的心裡話', '這次，不用再等了'] },
  { fest: 'ny', t: '最後一分鐘', her: '跨年派對上落單的人', him: '也落單的人', set: '跨年派對上，大家都成雙成對，只剩兩個陌生人站在角落等倒數。',
    herLines: ['你也一個人？', '倒數的時候，總要有人可以親吧。'], himLines: ['今年最後一分鐘，跟你一起過。', '新年快樂⋯⋯不想只有這樣。'],
    herP: '被朋友放鴿子的女生', herS: '決定今年要用一個吻結束', himP: '安靜、在角落喝飲料的男生', himS: '從派對開始就在看她',
    prep: '兩杯飲料、手機準備好倒數', entry: '兩個人站在「角落」（房間一角），各自拿著杯子', acts: ['聊今年發生的事', '倒數十秒', '新年的第一個吻'] },
  { trip: true, t: '飯店的第一晚', her: '蜜月旅客', him: '蜜月旅客', set: '你們假裝剛結婚來度蜜月，這是在飯店的第一晚。',
    herLines: ['老公，這間房間好漂亮。', '今晚，你想怎麼過？'], himLines: ['老婆，歡迎來到我們的蜜月。', '這張床，今晚只有我們。'],
    herP: '興奮、對什麼都好奇的新婚妻子', herS: '偷偷帶了一套新的睡衣', himP: '想給她最好回憶的新婚丈夫', himS: '偷偷訂了驚喜（可以是一點甜點）',
    prep: '飯店房間本身就好，把燈調暗', entry: '兩個人一起「第一次」走進房間，他把她抱上床', acts: ['參觀房間、拍照', '她換上新睡衣', '蜜月的第一晚'] },
  { trip: true, t: '異國的陌生人', her: '一個人旅行的旅客', him: '住在隔壁房的旅客', set: '在國外的飯店，走廊上遇到一個也一個人旅行的陌生人。',
    herLines: ['你也是一個人來？', '反正這裡沒有人認識我們。'], himLines: ['要不要一起喝一杯？', '這裡發生的事，就留在這裡。'],
    herP: '想在旅途中放縱一次的女生', herS: '已經決定今晚不要一個人睡', himP: '出差順便旅行、很寂寞的男生', himS: '故意在她門口掉了東西',
    prep: '一點當地的零食或飲料', entry: '他敲她的房門說「不好意思，我的東西好像掉在你門口」', acts: ['用破破的外語聊天', '交換這趟旅行的秘密', '他沒有回自己的房間'] },
].forEach((x) => { if (!D.HOT_SCRIPTS.some((y) => y.t === x.t)) D.HOT_SCRIPTS.push(x); });

// 今天能用的特別內容
const specialOK = (x) => (x.fest ? x.fest === hotFestToday() : x.trip ? !!tripNow() : true);
// 劇本：今天可以抽的編號（節日／旅行限定的只有那天才會出現）
function scriptIdxPool() { return D.HOT_SCRIPTS.map((x, i) => [x, i]).filter(([x]) => specialOK(x)).map(([, i]) => i); }
function scriptSpecialToday() { return D.HOT_SCRIPTS.map((x, i) => [x, i]).filter(([x]) => (x.fest || x.trip) && specialOK(x)).map(([, i]) => i); }

// ============================================================
//  新成就（一般）＋隱藏成就
// ============================================================
const MORE_ACH = [
  { id: 'date1', name: '第一次約會', desc: '約會分頁完成第一個約會', m: 'datesDone', goal: 1, tier: 'b', mark: '約' },
  { id: 'date10', name: '約會十次', desc: '完成 10 個約會', m: 'datesDone', goal: 10, tier: 's', mark: '約' },
  { id: 'date30', name: '約會常客', desc: '完成 30 個約會', m: 'datesDone', goal: 30, tier: 'g', mark: '約' },
  { id: 'look4', name: '換裝達人', desc: '小小黑解鎖 4 套裝扮', m: 'looks', goal: 4, tier: 's', mark: '裝' },
  { id: 'look8', name: '衣櫃滿滿', desc: '小小黑 8 套裝扮全部解鎖', m: 'looks', goal: 8, tier: 'g', mark: '衣' },
  { id: 'feed30', name: '罐罐飼養員', desc: '餵小小黑 30 個罐罐', m: 'feeds', goal: 30, tier: 'b', mark: '罐' },
  { id: 'feed100', name: '罐罐大戶', desc: '餵小小黑 100 個罐罐', m: 'feeds', goal: 100, tier: 's', mark: '罐' },
  { id: 'poke50', name: '戳戳樂', desc: '兩人互戳 50 次', m: 'pokes', goal: 50, tier: 'b', mark: '戳' },
  { id: 'ten1', name: '十連抽', desc: '第一次十連抽', m: 'tens', goal: 1, tier: 'b', mark: '十' },
  { id: 'shop1', name: '精打細算', desc: '在罐罐商店換第一次', m: 'shop', goal: 1, tier: 'b', mark: '換' },
  // 隱藏成就：沒解鎖前名稱和條件都是「？？？」
  { id: 'hid_owl', name: '夜貓子', desc: '凌晨 2～5 點還打開遊樂園', m: 'owl', goal: 1, tier: 's', mark: '夜', hidden: true },
  { id: 'hid_sync', name: '心電感應', desc: '兩個人在同一分鐘按了想你', m: 'syncMiss', goal: 1, tier: 'g', mark: '心', hidden: true },
  { id: 'hid_anniv', name: '一起記得', desc: '紀念日當天兩個人都有打開遊樂園', m: 'annivBoth', goal: 1, tier: 'g', mark: '記', hidden: true },
  { id: 'hid_bday', name: '第一個祝福', desc: '在對方生日當天按了想你', m: 'bdayMiss', goal: 1, tier: 's', mark: '壽', hidden: true },
  { id: 'hid_rain', name: '雨天的抱抱', desc: '下雨天按想你 3 次', m: 'rainMiss', goal: 3, tier: 'b', mark: '雨', hidden: true },
];
MORE_ACH.forEach((a) => { if (!D.ACHIEVEMENTS.some((x) => x.id === a.id)) D.ACHIEVEMENTS.push(a); });
// 隱藏成就沒解鎖時看不到名稱和條件
const achUnlocked = (a) => { try { return (achMetrics()[a.m] || 0) >= a.goal; } catch (e) { return false; } };
D.ACHIEVEMENTS.filter((a) => a.hidden).forEach((a) => {
  const name = a.name, desc = a.desc;
  Object.defineProperty(a, 'name', { get: () => (achUnlocked(a) ? name : '？？？'), configurable: true });
  Object.defineProperty(a, 'desc', { get: () => (achUnlocked(a) ? desc : '隱藏成就，達成了才知道'), configurable: true });
});

// 統計：加上新成就要看的數字
const _achMetrics = achMetrics;
achMetrics = function () {
  const base = _achMetrics();
  const ms = S.couple?.members || [];
  const L = S.couple?.links || {};
  const misses = list('misses');
  const sync = (() => { const a = misses.slice().sort((x, y) => x.at - y.at); for (let i = 1; i < a.length; i++) if (a[i].by !== a[i - 1].by && a[i].at - a[i - 1].at <= 60000) return 1; return 0; })();
  const bdayMiss = misses.some((x) => { const p = ms.find((u) => u !== x.by); return p && mdOf(prof(p).bday) === dkey(new Date(x.at)).slice(5); }) ? 1 : 0;
  return {
    ...base,
    datesDone: list('dates').filter((d) => d.done).length,
    looks: Object.keys((S.couple?.pet || {}).looks || {}).length,
    feeds: (S.couple?.pet || {}).feeds || 0,
    pokes: list('events').filter((e) => e.type === 'poke').length,
    tens: L.tens || 0,
    shop: L.shop || 0,
    owl: Object.keys(L.owl || {}).length ? 1 : 0,
    syncMiss: sync,
    annivBoth: Object.values(L.anniv || {}).some((y) => ms.length === 2 && ms.every((u) => y[u])) ? 1 : 0,
    bdayMiss,
    rainMiss: misses.filter((x) => x.rain).length,
  };
};

// 記錄隱藏成就要的事件（兩個人都加入之後才記，測試期間不算）
function linkFlags() {
  if (!S.couple || !bothIn()) return;
  const L = S.couple.links || {}, up = {};
  const h = new Date().getHours();
  if (h >= 2 && h < 5 && !(L.owl || {})[me()]) up[`links.owl.${me()}`] = true;
  if (todayMD() === annivMD() && !((L.anniv || {})[String(new Date().getFullYear())] || {})[me()]) up[`links.anniv.${new Date().getFullYear()}.${me()}`] = true;
  if (Object.keys(up).length) fire(S.store.updateCouple(S.cid, up));
}
// 十連抽次數
document.addEventListener('click', (e) => {
  if (e.target.closest('#g-10, #g-10t') && S.couple && bothIn()) fire(S.store.coupleTx(S.cid, (c) => ({ 'links.tens': ((c.links || {}).tens || 0) + 1 })));
}, true);

// ============================================================
//  火辣成就補齊
// ============================================================
[
  { id: 'h_script5', name: '五場好戲', desc: '演了 5 個劇本', m: 'script', goal: 5, tier: 'b', mark: '戲' },
  { id: 'h_script20', name: '戲精', desc: '演了 20 個劇本', m: 'script', goal: 20, tier: 's', mark: '戲' },
  { id: 'h_r2', name: '再來一輪', desc: '抽到稀有卡 Round 2 並開始第二輪', m: 'r2', goal: 1, tier: 's', mark: '二' },
  { id: 'h_play10', name: '十個夜晚', desc: '玩了 10 個晚上的前戲遊戲', m: 'play', goal: 10, tier: 'b', mark: '夜' },
  { id: 'h_play50', name: '前戲大師', desc: '玩了 50 個晚上的前戲遊戲', m: 'play', goal: 50, tier: 'g', mark: '戲' },
  { id: 'h_sig3', name: '連續三晚', desc: '暗號連續 3 天被答應', m: 'sig3', goal: 1, tier: 's', mark: '三' },
  { id: 'h_wish1', name: '願望成真', desc: '許願券的願望被兌現', m: 'wishOk', goal: 1, tier: 'b', mark: '願' },
  { id: 'h_fest', name: '節日限定', desc: '試過一張節日限定的姿勢', m: 'festPose', goal: 1, tier: 's', mark: '節' },
  { id: 'h_trip', name: '旅行限定', desc: '試過一張旅行限定的姿勢', m: 'tripPose', goal: 1, tier: 's', mark: '旅' },
].forEach((a) => { if (!HOT_ACH.some((x) => x.id === a.id)) HOT_ACH.push(a); });
const _hotAchMetrics = hotAchMetrics;
hotAchMetrics = function () {
  const base = _hotAchMetrics();
  const hd = (t) => (typeof hotDocs === 'function' ? hotDocs(t) : []);
  const days = [...new Set(hd('signal').filter((d) => d.status === 'yes').map((d) => d.day))].sort();
  let run = 0, best = 0, prev = '';
  for (const d of days) { const p = prev && dkey(new Date(+new Date(d) - 86400000)); run = prev && p === prev ? run + 1 : 1; best = Math.max(best, run); prev = d; }
  const done = new Set(hd('pose-done').map((d) => d.key));
  return {
    ...base,
    script: new Set(hd('script-day').map((d) => d.day)).size,
    r2: hd('pose-day').some((d) => (d.cards || []).some((c) => c.round === 2)) ? 1 : 0,
    play: new Set(hd('play-day').map((d) => d.day)).size,
    sig3: best >= 3 ? 1 : 0,
    wishOk: hd('voucher').filter((d) => d.kind === 'wish' && d.status === 'redeemed').length,
    festPose: D.HOT_POSES.filter((p) => p.fest && done.has('n' + p.no)).length,
    tripPose: D.HOT_POSES.filter((p) => p.trip && done.has('n' + p.no)).length,
  };
};
// 前戲遊戲：每天打開記一次
const _hotPlay = ACT.hotPlay;
ACT.hotPlay = (...a) => {
  if (!hotDocs('play-day').some((d) => d.day === dkey() && d.uid === me())) fire(col('hot').add({ type: 'play-day', day: dkey(), uid: me(), at: now() }));
  return _hotPlay(...a);
};

// ============================================================
//  成就獎勵：解鎖時各自拿獎勵（每個成就每個人一次）
//  一般成就：銅 5 點／銀 10 點＋1 罐罐／金 20 點＋2 罐罐（金色另外還有原本的紀念券）
//  火辣成就：銅 1 個／銀 2 個／金 3 個火辣印章（火辣的東西留在火辣區）
// ============================================================
const ACH_REWARD = { b: { pts: 5, cans: 0 }, s: { pts: 10, cans: 1 }, g: { pts: 20, cans: 2 } };
const HOT_ACH_STAMPS = { b: 1, s: 2, g: 3 };
let achRewardBusy = false;
async function achRewards() {
  if (achRewardBusy || !S.couple || !bothIn() || COLS.some((c) => !S.d[c])) return;
  achRewardBusy = true;
  try {
    const R = S.couple.achR || {}, mine = R[me()] || {};
    const got = computeAch();
    const hotGot = typeof hotAchGot === 'function' && hotOn() ? hotAchGot() : new Set();
    // 第一次跑：之前就解鎖的成就只記下來、不補發（不然一次掉一大堆）
    if (!R[me()]) {
      const init = {}; [...got].forEach((id) => { init[id] = 1; }); [...hotGot].forEach((id) => { init['hot-' + id] = 1; });
      init._init = 1;
      await S.store.updateCouple(S.cid, { [`achR.${me()}`]: init });
      return;
    }
    const msgs = [];
    for (const id of got) {
      if (mine[id]) continue;
      const a = D.ACHIEVEMENTS.find((x) => x.id === id); if (!a) continue;
      const r = ACH_REWARD[a.tier];
      const ok = await S.store.coupleTx(S.cid, (c) => (((c.achR || {})[me()] || {})[id] ? null : { [`achR.${me()}.${id}`]: 1 }));
      if (!ok) continue;
      await addPoints(me(), r.pts, `成就獎勵：${a.name}`);
      for (let i = 0; i < r.cans; i++) await giveCan(me(), '', true);
      msgs.push(`${a.name}：+${r.pts} 點${r.cans ? `、罐罐 +${r.cans}` : ''}`);
    }
    for (const id of hotGot) {
      if (mine['hot-' + id]) continue;
      const a = HOT_ACH.find((x) => x.id === id); if (!a) continue;
      const ok = await S.store.coupleTx(S.cid, (c) => (((c.achR || {})[me()] || {})['hot-' + id] ? null : { [`achR.${me()}.hot-${id}`]: 1 }));
      if (!ok) continue;
      for (let i = 0; i < HOT_ACH_STAMPS[a.tier]; i++) await col('hot').add({ type: 'stamp', uid: me(), why: `火辣成就：${a.name}`, used: false, at: now() });
      if (now() < hotUntil) msgs.push(`火辣成就「${a.name}」：火辣印章 +${HOT_ACH_STAMPS[a.tier]}`);
    }
    if (msgs.length) setTimeout(() => toast(`🎁 成就獎勵　${msgs.slice(0, 2).join('　')}${msgs.length > 2 ? '⋯⋯' : ''}`), 3000);
  } finally { achRewardBusy = false; }
}
const _schedAch = scheduleAchievements;
scheduleAchievements = function () {
  _schedAch();
  clearTimeout(scheduleAchievements._t);
  scheduleAchievements._t = setTimeout(() => { linkFlags(); achRewards(); petReactCheck(); }, 2500);
};

// ============================================================
//  想試清單配對 → 丟進約會點子罐（只有可以出門的項目）
//  點子罐兩個人都看得到、別人看到也不會尷尬，所以用比較含蓄的寫法
// ============================================================
const HOT_OUTING = { hotspring: '去溫泉湯屋', hotelstay: '去飯店住一晚', motel: '去住一間有主題的旅館', lingerie2: '一起去逛內衣', wine: '在家小酌一晚', picnicbed: '在床上野餐看電影' };
function hotOutingBtn(k) {
  if (!HOT_OUTING[k]) return '';
  const done = hotDocs('hdate').some((d) => d.k === k);
  return done ? '<span class="hl-out on">已丟進點子罐</span>' : `<button class="hl-out" data-out="${esc(k)}">丟進約會點子罐</button>`;
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-out]'); if (!b) return;
  e.stopPropagation();
  const k = b.dataset.out;
  if (hotDocs('hdate').some((d) => d.k === k)) return;
  fire(col('ideas').add({ text: HOT_OUTING[k], by: me(), used: false, at: now() }));
  fire(col('hot').add({ type: 'hdate', k, at: now() }));
  b.outerHTML = '<span class="hl-out on">已丟進點子罐</span>';
  sfx('chime'); toast('丟進約會分頁的點子罐了');
}, true);

// ============================================================
//  壽星特權（自己生日當天）
//  ① 一般扭蛋第一抽免費 ② 火辣抽獎免印章一次 ③ 今天的姿勢每一張都可以換成自己指定的
// ============================================================
const _addPoints = addPoints;
addPoints = async function (uid, amt, reason, tag) {
  if (uid === me() && amt < 0 && reason === '扭蛋' && isBday() && bothIn()) {
    const k = `bdayGacha.${new Date().getFullYear()}.${me()}`;
    const ok = await S.store.coupleTx(S.cid, (c) => (((c.bdayGacha || {})[new Date().getFullYear()] || {})[me()] ? null : { [k]: true }));
    if (ok) { setTimeout(() => toast('🎂 壽星特權：這一抽免費'), 600); return; }
  }
  return _addPoints(uid, amt, reason, tag);
};
const bdayLotUsed = () => hotDocs('bday-lot').some((d) => d.uid === me() && d.y === new Date().getFullYear());
function bdayPerkHTML() {
  if (!isBday() || !bothIn()) return '';
  return `<div class="card bday-perk"><b>🎂 今天是你的生日</b><div class="small">壽星特權：一般扭蛋第一抽免費${typeof hotOn === 'function' && hotOn() ? '；火辣區還有壽星限定的特權' : ''}</div></div>`;
}

// ============================================================
//  罐罐商店（小小黑的視窗裡）
// ============================================================
const CAN_SHOP = [
  { id: 'ticket', name: '扭蛋券 1 張', cost: 6, give: async () => { await addTicket(me(), 1); } },
  { id: 'pts', name: '10 點', cost: 3, give: async () => { await _addPoints(me(), 10, '罐罐商店'); } },
  { id: 'acc', name: '隨機一個小小黑配件', cost: 15, ok: () => PET_ACC.some((a) => a.gacha && !(((S.couple.pet || {}).owned) || []).includes(a.id)),
    give: async () => {
      const owned = ((S.couple.pet || {}).owned) || [];
      const left = PET_ACC.filter((a) => a.gacha && !owned.includes(a.id)); const a = pick(left);
      await S.store.coupleTx(S.cid, (c) => ({ 'pet.owned': [...new Set([...(((c.pet || {}).owned) || []), a.id])] }));
      return a.name;
    } },
];
ACT.canShop = () => {
  const m = openModal('', { center: true });
  const draw = () => {
    const stock = canState().stock;
    m.querySelector('.modal').innerHTML = `${mhead('<i data-ic="gift"></i> 罐罐商店')}
      <p class="small muted" style="margin:0 0 8px">用存下來的罐罐換東西。你現在有 <b>${stock}</b> 個罐罐</p>
      ${CAN_SHOP.map((x) => { const can = stock >= x.cost && (!x.ok || x.ok()); return `<div class="list-row"><span class="grow"><b>${x.name}</b><br><span class="small muted">${x.cost} 個罐罐${x.ok && !x.ok() ? '（配件都拿到了）' : ''}</span></span><button class="btn sm ${can ? '' : 'ghost'}" data-buy="${x.id}" ${can ? '' : 'disabled'}>換</button></div>`; }).join('')}`;
    $$('[data-buy]', m).forEach((b) => b.onclick = async () => {
      const x = CAN_SHOP.find((y) => y.id === b.dataset.buy);
      if (!(await confirmBox(`用 ${x.cost} 個罐罐換「${x.name}」？`, '換'))) return;
      const ok = await S.store.coupleTx(S.cid, (c) => { const s = (c.cans || {})[me()] || 0; return s < x.cost ? null : { [`cans.${me()}`]: s - x.cost, 'links.shop': ((c.links || {}).shop || 0) + 1 }; });
      if (!ok) return toast('罐罐不夠');
      const extra = await x.give();
      sfx('chime'); toast(extra ? `換到「${extra}」了` : `換到${x.name}了`);
      setTimeout(draw, 200);
    });
  };
  draw();
};
// 在小小黑的視窗裡加一個入口
const _petOpen = ACT.petOpen;
ACT.petOpen = (...a) => {
  const r = _petOpen(...a);
  setTimeout(() => {
    const md = $$('.modal-back').pop(); if (!md || md.querySelector('.can-shop-btn')) return;
    const body = md.querySelector('.modal');
    body && body.insertAdjacentHTML('beforeend', `<button class="btn ghost block mt can-shop-btn" data-act="canShop"><i data-ic="gift"></i> 罐罐商店（有 ${canState().stock} 個）</button>`);
  }, 50);
  return r;
};

// ============================================================
//  小小黑會反應：對方想你、戳你、約會完成、每週任務完成
// ============================================================
const PET_REACT = {
  miss: (p) => [`${p}在想你喔～`, `${p}剛剛想你了，小小黑都知道`],
  poke: (p) => [`${p}戳了你一下！`, '被戳了～要不要戳回去？'],
  date: () => ['又去約會了！下次帶我去嘛', '約會好玩嗎？小小黑也想去'],
  task: () => ['任務完成～好棒！', '做得好，摸摸頭'],
};
function petReactCheck() {
  if (!S.couple || !bothIn() || S.tab !== 'home') return;
  const k = `park-petreact-${S.cid}-${me()}`;
  let seen = 0; try { seen = +(localStorage.getItem(k) || 0); } catch (e) {}
  const t0 = seen || now();
  const p = partner(), pn = nick(p);
  const ev = [
    ...list('misses').filter((x) => x.by === p && x.at > t0).map((x) => ({ at: x.at, k: 'miss' })),
    ...list('events').filter((x) => x.to === me() && x.type === 'poke' && x.at > t0).map((x) => ({ at: x.at, k: 'poke' })),
    ...list('dates').filter((x) => x.done && (x.doneAt || 0) > t0).map((x) => ({ at: x.doneAt, k: 'date' })),
    ...list('taskDone').filter((x) => (x.at || 0) > t0).map((x) => ({ at: x.at, k: 'task' })),
  ].sort((a, b) => b.at - a.at);
  localStorage.setItem(k, String(now()));
  if (!seen || !ev.length) return;
  petSay(pick(PET_REACT[ev[0].k](pn)), ev[0].k === 'poke' ? 'jump' : ev[0].k === 'miss' ? 'wave' : 'stretch');
}
function petSay(text, pose = 'wave') {
  const card = $('.pet-card'); if (!card) return;
  const stage = card.querySelector('.pet-stage'); if (!stage) return;
  const old = stage.innerHTML;
  stage.innerHTML = catPose(pose, petState().wear);
  card.querySelector('.pet-say')?.remove();
  card.insertAdjacentHTML('beforeend', `<div class="pet-say">${esc(text)}</div>`);
  sfx('pop');
  setTimeout(() => { stage.innerHTML = old; card.querySelector('.pet-say')?.remove(); }, 4200);
}

// ============================================================
//  我們的這一年（紀念日那一週出現在回憶最上面；不含火辣區）
// ============================================================
ACT.yearReview = () => {
  const t1 = now(), t0 = t1 - 365 * 86400000;
  const inY = (x) => (x || 0) >= t0;
  const n = {
    dates: list('dates').filter((d) => d.done && inY(d.doneAt)).length,
    photos: typeof albumItems === 'function' ? albumItems().filter((p) => inY(p.at)).length : 0,
    miss: list('misses').filter((x) => inY(x.at)).length,
    trips: list('trips').filter((x) => inY(x.at)).length,
    redeem: list('cards').reduce((s, c) => s + (c.log || []).filter((l) => l.how === 'redeem' && inY(l.at)).length, 0),
    mem: list('memories').filter((x) => inY(x.at)).length,
    deep: list('deep').filter((x) => inY(x.at)).length,
  };
  const ms = S.couple.members || [];
  const missBy = ms.map((u) => ({ u, c: list('misses').filter((x) => x.by === u && inY(x.at)).length }));
  const topMiss = missBy.sort((a, b) => b.c - a.c)[0];
  const lastMem = list('memories').filter((x) => inY(x.at)).sort((a, b) => b.at - a.at).slice(0, 3);
  const row = (v, t) => (v ? `<div class="yr-stat"><b>${v}</b><span>${t}</span></div>` : '');
  openModal(`${mhead('我們的這一年')}
    <div class="yr-hero">${typeof annivMedal === 'function' ? annivMedal(annivInfo().n) : ''}<p>從去年的今天到現在</p></div>
    <div class="yr-grid">${row(n.dates, '次約會')}${row(n.photos, '張照片')}${row(n.miss, '次想你')}${row(n.trips, '個新足跡')}${row(n.redeem, '張兌換的卡')}${row(n.mem, '則回憶')}${row(n.deep, '題真心話')}</div>
    ${topMiss && topMiss.c ? `<p class="center">這一年比較常想對方的是 <b>${esc(nick(topMiss.u))}</b></p>` : ''}
    ${lastMem.length ? `<div class="hl-grp">這一年的幾個片段</div>${lastMem.map((x) => `<div class="list-row"><span class="grow">${esc(x.title || x.text || '')}</span><span class="small muted">${fmtDate(x.at)}</span></div>`).join('')}` : ''}
    <p class="center small muted mt">下一年，也請多指教。</p>`, { center: true });
};
PAGES.memory.html = ((orig) => function () {
  const h = orig.call(this);
  if (!(typeof annivInfo === 'function' && annivInfo().is) || h.includes('data-act="yearReview"')) return h;
  const card = `<button class="card yr-banner" data-act="yearReview"><span class="grow"><b>我們的這一年</b><br><span class="small muted">這一年的約會、照片、想你和回憶</span></span><span style="font-size:22px">›</span></button>`;
  const i = h.indexOf('</div>', h.indexOf('page-title'));
  return i < 0 ? h : h.slice(0, i + 6) + card + h.slice(i + 6);
})(PAGES.memory.html);

PAGES.home.html = ((orig) => function () {
  const h = orig.call(this);
  const card = bdayPerkHTML();
  if (!card || h.includes('bday-perk')) return h;
  const i = h.indexOf('<div class="card pet-card');
  return i < 0 ? h + card : h.slice(0, i) + card + h.slice(i);
})(PAGES.home.html);
