// ============================================================
//  值日小劇場：值日生和小小黑你一句我一句；沒人來的日子小小黑自己值日
//  a = 值日生，b = 小小黑，far = 遠遠的還好；（）裡是動作，只演不顯示
// ============================================================
const DUTY_SKITS = {
  orange: [
    [['a', '今天我負責試吃罐罐'], ['b', '我的罐罐呢？'], ['a', '試吃完了，沒問題']],
    [['a', '我來幫你看門'], ['b', '那是冰箱門'], ['a', '對啊']],
    [['a', '地上的餅乾屑我掃乾淨了'], ['b', '掃去哪裡？'], ['a', '嗝～']],
    [['a', '雞腿分你一口'], ['b', '喵～'], ['a', '一口太多了，算了']],
    [['b', '你的碗怎麼那麼亮？'], ['a', '不是我'], ['b', '那是我的碗']],
    [['a', '這個也可以吃嗎？'], ['b', '那是我的尾巴'], ['a', '喔']],
    [['b', '你在幹嘛？'], ['a', '值日生要先吃飽，才有力氣值日'], ['b', '你已經吃三餐了']],
    [['a', '交接，罐罐 0 個，雞腿 0 隻，一切正常'], ['b', '一點都不正常']],
  ],
  white: [
    [['a', '今天我來陪你值日'], ['b', '喵～'], ['a', '先說好，我只陪你一下下喔']],
    [['a', '你的毛今天好亮'], ['b', '真的嗎？'], ['a', '當然，因為坐在我旁邊']],
    [['a', '給你摸肚子'], ['b', '不會又是陷阱吧？'], ['a', '算了喵']],
    [['a', '我帶了罐罐來，我們一人一半'], ['b', '喵！'], ['a', '你的那一半小一點喔']],
    [['a', '紙箱借我坐一下'], ['b', '一起坐吧'], ['a', '……好吧，擠一點也可以']],
    [['a', '准你摸我一下'], ['b', '喵～'], ['a', '……再一下也可以']],
    [['b', '你皇冠歪了'], ['a', '哪裡？幫我扶好'], ['b', '好了'], ['a', '謝謝你']],
    [['a', '皇冠借你戴'], ['b', '好漂亮'], ['a', '今天你也是公主']],
  ],
  calico: [
    [['a', '我帶了小魚乾，一條給你'], ['b', '喵～謝謝'], ['a', '另一條是我的喔']],
    [['a', '可以抱抱嗎？'], ['b', '你是值日生耶'], ['a', '值日生也要抱抱']],
    [['far', '嗷！'], ['a', '小小黑救我！'], ['b', '啊！好煩！']],
    [['a', '分你一半'], ['b', '好～'], ['a', '……還是我吃好了']],
    [['a', '摸摸我的頭'], ['b', '我也要被摸'], ['a', '那我們一起找人類']],
    [['a', '這個紙箱擠得下兩個嗎？'], ['b', '擠不下吧'], ['a', '擠擠看嘛']],
    [['b', '今天有罐罐嗎？'], ['a', '沒有，可是有小魚乾'], ['b', '喵！']],
    [['a', '我明天還可以來嗎？'], ['b', '要排班'], ['a', '喵……']],
  ],
  tuxedo: [
    [['a', '喵！喵喵！喵！'], ['b', '什麼？'], ['a', '這朵花給你！']],
    [['a', '你家我都插滿花了'], ['b', '哈啾！'], ['a', '不用謝！']],
    [['a', '我來掃地！'], ['b', '那是花'], ['a', '花也可以掃']],
    [['a', '我要唱值日之歌！'], ['b', '好'], ['a', '喵～喵～喵～'], ['b', '貓！好吵']],
    [['a', '花送完了，送你一片葉子！'], ['b', '這是我家盆栽的葉子'], ['a', '喵！（跑走）']],
    [['b', '你剛剛跌倒了'], ['a', '我是故意的！'], ['b', '喔']],
    [['a', '我跳舞給你看！'], ['b', '不用了'], ['a', '已經開始了！']],
    [['a', '最後一朵給你！'], ['b', '這是從哪裡摘的？'], ['a', '喵喵喵！']],
  ],
  haohao: [
    [['a', '嗷～把拔貓咪！今天我值日！'], ['b', '還好，好煩']],
    [['a', '我是女生～女生值日都很認真～'], ['b', '那你為什麼躺著？'], ['a', '摸我～']],
    [['a', '嗷！我帶球球來了！'], ['b', '那是橘子'], ['a', '……嗷？']],
    [['a', '把拔貓咪你好可愛喔～'], ['b', '喵'], ['a', '真的好可愛喔～'], ['b', '還好，好煩']],
    [['a', '我剛剛要做什麼？'], ['b', '值日'], ['a', '喔對！那值日要做什麼？']],
    [['a', '嗷～我也要罐罐～'], ['b', '這是我的'], ['a', '一口就好～']],
    [['a', '我可以睡你旁邊嗎？'], ['b', '你太大了'], ['a', '我是女生～']],
    [['a', '今天是很好的一天耶～'], ['b', '喵～'], ['a', '明天我也要來！'], ['b', '……']],
  ],
  doggy: [
    [['a', '汪，去洗澡'], ['b', '我今天洗過了'], ['a', '汪，再洗一次']],
    [['b', '剛剛是誰拍我尾巴？'], ['a', '不知道'], ['b', '只有你在這裡']],
    [['a', '值日生要檢查誰最香'], ['b', '喵？'], ['a', '我最香，檢查完畢']],
    [['b', '那是我的墊子'], ['a', '汪，值日生要坐最好的位子'], ['b', '哪有這種規定']],
    [['b', '抱抱～'], ['a', '……汪'], ['b', '貓貓貓貓（抱）']],
    [['b', '我的玩具少一個'], ['a', '汪，我幫你排好了'], ['b', '那少的那個呢？'], ['a', '汪？']],
    [['b', '你說要去洗澡的'], ['a', '汪，我很香'], ['b', '你剛剛自己說要洗的']],
    [['a', '汪啊啊啊啊'], ['b', '貓？！狗狗我幫你按摩'], ['a', '嘿嘿']],
  ],
  abian: [
    [['a', '值日生的「值」是什麼意思？'], ['b', '喵？'], ['a', '讓我想一下……']],
    [['a', 'Who are you？'], ['b', '貓？！'], ['a', '嚇你的']],
    [['b', '你的鼻子……'], ['a', '不要捏我的鼻子！'], ['b', '我只是要說上面有東西']],
    [['a', '你為什麼叫小小黑？'], ['b', '因為我黑黑的'], ['a', '那為什麼是小小，不是小？']],
    [['a', '我把今天要做的事列好了'], ['b', '要做什麼？'], ['a', '……忘記了']],
    [['a', '你是黑貓，晚上是不是會隱形？'], ['b', '喵～'], ['a', '我就知道']],
    [['a', '你知道小小黑喝什麼嗎？'], ['b', '什麼？'], ['a', '「黑」咖啡！'], ['b', '……']],
    [['a', '今天的值日我想完了'], ['b', '你有做嗎？'], ['a', '想完就是做完了']],
  ],
  gungun: [
    [['a', '棍～'], ['b', '喵～'], ['a', '棍～'], ['b', '喵～']],
    [['a', '……果'], ['b', '蘋果嗎？'], ['a', '蘋果～']],
    [['a', '狗狗？'], ['b', '狗狗今天不在'], ['a', '貓～']],
    [['a', '葡萄～'], ['b', '要分我一半嗎？'], ['a', '（自己吃掉）']],
    [['b', '你要踩我嗎？'], ['a', '棍？'], ['b', '那你腳抬著幹嘛？']],
    [['a', '……班'], ['b', '值班？'], ['a', '班～']],
    [['b', '你想睡覺了嗎？'], ['a', '……覺'], ['b', '睡吧，我幫你看蘋果']],
    [['a', '……見'], ['b', '明天見？'], ['a', '棍～（跑走）']],
  ],
  shark: [
    [['a', '人類～我今天是值日生喔～'], ['b', '我是貓'], ['a', '哈囉～貓咪～']],
    [['a', '我在巡邏～'], ['b', '巡哪裡？'], ['a', '……忘記了']],
    [['b', '你鼻子上有東西'], ['a', '……（關機）'], ['b', '喵？'], ['a', '河！']],
    [['a', '小小黑～哈囉～'], ['b', '喵'], ['a', '好～']],
    [['a', '河！河！'], ['b', '你撞到紙箱了'], ['a', '紙箱～對不起～']],
    [['a', '河～'], ['b', '你在打呵欠嗎？'], ['a', '值日好累喔～']],
    [['a', '我的尾巴在哪裡？'], ['b', '在你後面'], ['a', '謝謝貓咪～']],
    [['a', '貓咪～我今天很乖喔～'], ['b', '那你不要再碰鼻子了'], ['a', '好～（碰）（關機）']],
  ],
  // 沒人來的日子：小小黑自己值日，自言自語
  black: [
    [['b', '今天我自己值日'], ['b', '值日完要給罐罐']],
    [['b', '家裡我巡過了'], ['b', '紙箱很安全']],
    [['b', '今天沒有朋友來'], ['b', '那你陪我']],
    [['b', '狗狗今天沒來拍我尾巴'], ['b', '……有一點點想牠']],
    [['b', '值日生要被摸摸'], ['b', '這是我剛剛定的']],
    [['b', '我把襪子收好了'], ['b', '收在我的紙箱裡']],
    [['b', '還好今天沒來'], ['b', '……有點太安靜了'], ['b', '太好了，好開心']],
    [['b', '今天值日結束'], ['b', '明天也是我，要罐罐']],
  ],
};
const dutyGot = (k) => ((((S.couple || {}).dex || {})[k] || {}).d) || {};
const dutyKey = () => `park-duty2-${dkey()}-${me()}`;
// 小小黑自己值日：沒有值日生的日子才有
function dutySoloOn() { return !!S.couple && ((S.couple.members || []).length >= 2 || trialOpen()) && !dutyToday(); }
function dutySolo() {
  if (!dutySoloOn()) return '';
  const said = localStorage.getItem(dutyKey());
  return `<button class="duty-solo ${said ? 'said' : ''}" data-act="dutyHi" data-k="black" aria-label="小小黑值日">值日生</button>`;
}
// 點小小黑也會演：有值日生就演值日生那段，沒有就小小黑自己說
function dutyCatAttr() {
  const k = dutyToday() || (dutySoloOn() ? 'black' : '');
  return k ? ` data-act="dutyHi" data-k="${k}"` : '';
}
// 每點一次換一段：沒看過的優先，不會連續演同一段
const dutyLast = {};
// 道別、收尾的那段只在晚上 11:30～12:00 出現（這段時間第一次點就先演它）
const DUTY_END = { orange: 7, calico: 7, tuxedo: 7, haohao: 7, abian: 7, gungun: 7, black: 7 };
const dutyEndTime = () => { const d = new Date(); return d.getHours() === 23 && d.getMinutes() >= 30; };
function dutyPick(k) {
  const n = DUTY_SKITS[k].length, got = dutyGot(k), end = DUTY_END[k], late = dutyEndTime();
  if (late && end != null && dutyLast[k] !== end && !dutyLast[k + ':end']) { dutyLast[k + ':end'] = 1; return (dutyLast[k] = end); }
  const all = [...Array(n).keys()].filter((i) => i !== dutyLast[k] && (late || i !== end));
  const fresh = all.filter((i) => !got[i]);
  const pool = fresh.length ? fresh : all;
  return (dutyLast[k] = pool[Math.floor(Math.random() * pool.length)]);
}
const dutyClean = (t) => t.replace(/（[^）]*）/g, '').trim() || '……';
const dutyActs = (t) => [...t.matchAll(/（([^）]*)）/g)].map((m) => m[1]);
let dutyCancel = null; // 正在演的那一段，點別的地方再開一段時先收掉
ACT.dutyHi = async (el, e) => {
  e && e.stopPropagation();
  const k = el.dataset.k, skit = DUTY_SKITS[k];
  if (!skit) return;
  const idx = dutyPick(k), first = !localStorage.getItem(dutyKey());
  const room = el.closest('.pet-room');
  const catEl = (room && room.querySelector('.pet-stage, .pet-big')) || el;
  const vis = k === 'black' ? null : (el.classList.contains('pet-visitor') ? el : room && room.querySelector('.pet-visitor'));
  const inModal = !!el.closest('.modal-back');
  if (dutyCancel) dutyCancel();
  let cancelled = false;
  sfx('heart');
  if (first) { const r = el.getBoundingClientRect(); floaty(r.left + r.width / 2, r.top, ['#ff9fb4', '#ffd45c']); }
  if (el.classList.contains('duty-solo') || el.classList.contains('pet-visitor')) el.classList.add('said');
  room && room.querySelector('.duty-solo')?.classList.add('said');
  document.querySelector('.pet-card .pet-say')?.remove();
  try {
    for (const [i, [who, t]] of skit[idx].entries()) {
      const tgt = who === 'a' ? vis : catEl;
      const acts = dutyActs(t);
      if (who === 'a' && vis) vis.classList.remove('off');
      let x, top;
      if (who === 'far') { const r = room.getBoundingClientRect(); x = r.right - 20; top = r.top + 10; }
      else {
        // 對話框放在頭上：找房間裡最大的那張圖（避開奶瓶、配件）
        const svgs = tgt ? [...tgt.querySelectorAll('svg')] : [];
        const big = svgs.map((v) => v.getBoundingClientRect()).sort((p, q) => q.width * q.height - p.width * p.height)[0];
        const r = big && big.width ? big : (tgt || el).getBoundingClientRect();
        x = r.left + r.width / 2; top = r.top + (big && big.width ? r.height * .18 : 6);
      }
      const b = bubble(dutyClean(t), x, top, `duty ${inModal ? 'over' : ''} ${who === 'far' ? 'far' : ''}`);
      b.insertAdjacentHTML('beforeend', `<span class="fr-next">${i < skit[idx].length - 1 ? '點一下繼續' : '點一下結束'}</span>`);
      if (tgt) { tgt.classList.add('duty-talk'); }
      acts.forEach((a) => {
        const who2 = tgt || el;
        if (/關機/.test(a)) who2.classList.add('off');
        else if (/跑/.test(a)) { who2.classList.add('run'); setTimeout(() => who2.classList.remove('run'), 2600); }
        else { who2.classList.add('hop'); setTimeout(() => who2.classList.remove('hop'), 700);
          if (/抱/.test(a)) { const r = who2.getBoundingClientRect(); floaty(r.left + r.width / 2, r.top, ['#ff9fb4', '#ffd45c']); } }
      });
      await sleep(350);
      b.classList.add('tappable');
      const tapped = await new Promise((res) => {
        const els = [b, el, catEl].filter(Boolean);
        const done = (v) => { clearTimeout(tm); els.forEach((x) => x.removeEventListener('click', on, true)); if (dutyCancel === stop) dutyCancel = null; res(v); };
        const stop = () => { cancelled = true; done(false); };
        dutyCancel = stop;
        const tm = setTimeout(() => done(false), 12000);
        function on(ev) { ev.stopPropagation(); ev.preventDefault(); done(true); }
        els.forEach((x) => x.addEventListener('click', on, true));
      });
      b.classList.add('out'); setTimeout(() => b.remove(), cancelled ? 0 : 300);
      if (tgt) tgt.classList.remove('duty-talk');
      if (!tapped) break;
      sfx('pop');
    }
  } finally {
    setTimeout(() => vis && vis.classList.remove('off'), 1500);
  }
  if (cancelled) return;
  localStorage.setItem(dutyKey(), `${k}:${idx}`);
  const name = k === 'black' ? petState().name : FRIENDS[k].name;
  document.querySelectorAll('.duty-say').forEach((x) => { x.textContent = `今天 ${name} 陪${petState().name}值日，點牠再聊聊`; });
  if (k === 'black') document.querySelectorAll('.duty-solo').forEach((x) => x.classList.add('said'));
  if (S.couple && !dutyGot(k)[idx]) {
    const up = { [`dex.${k}.d.${idx}`]: true };
    if (!((S.couple.dex || {})[k] || {}).met) { up[`dex.${k}.met`] = now(); up[`dex.${k}.by`] = me(); }
    await S.store.updateCouple(S.cid, up);
    toast('值日小劇場收進圖鑑了');
  }
};

// 圖鑑每一頁加「值日的時候」
function dutyDexHTML(k) {
  const L = DUTY_SKITS[k]; if (!L) return '';
  const got = dutyGot(k), cnt = L.filter((_, i) => got[i]).length;
  const nm = (w) => w === 'b' ? (k === 'black' ? '' : esc(petState().name)) : w === 'far' ? esc(FRIENDS.haohao.name) : esc(FRIENDS[k].name);
  return `<h3 class="da-h">值日的時候 <span>${cnt} 段</span></h3>
    ${L.map((sk, i) => got[i]
      ? `<div class="dex-line duty">${sk.map(([w, t]) => `<div>${nm(w) ? `<b>${nm(w)}：</b>` : ''}${esc(t)}</div>`).join('')}</div>`
      : `<div class="dex-line locked">？？？</div>`).join('')}`;
}
