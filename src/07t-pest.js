
// ============================================================
//  火辣區的搗蛋鬼：晽晽貓貓、還好、阿扁有時候會跑來湊熱鬧
//  一天最多來一次（進火辣區有一半機會）；點 3～6 下才趕得走，阿扁 2 下
// ============================================================
const PEST_ODDS = .5;   // 每次進火辣區，有一半的機會會來搗亂
const PESTS = {
  // 台詞：說話的部分一律自稱「我」；「晽晽貓貓…」開頭沒有冒號的是旁白
  orange: {
    hi: ['晽晽貓貓：我也要玩！', '晽晽貓貓：你們在玩什麼？可以吃嗎？', '晽晽貓貓：我聽到有聲音，跑來看看～', '晽晽貓貓叼著雞腿擠進來：我也要！',
      '晽晽貓貓：這裡有沒有零食？', '晽晽貓貓從被子底下鑽出來：嗨～', '晽晽貓貓：你們關門，我就更想進來', '晽晽貓貓：我聞到宵夜的味道',
      '晽晽貓貓一屁股坐在你們中間', '晽晽貓貓：你們在玩摔角嗎？我也會！', '晽晽貓貓：床上可以吃東西嗎？', '晽晽貓貓：今天晚上我要睡這裡'],
    push: ['晽晽貓貓：不要推我啦～', '晽晽貓貓：我只是想看一下嘛', '晽晽貓貓：可是這裡好溫暖…', '晽晽貓貓肚子太圓，滾不太動', '晽晽貓貓：再一下下就好～', '晽晽貓貓假裝睡著了',
      '晽晽貓貓翻過來露出肚子：摸這裡我就走', '晽晽貓貓：給我一個罐罐就走', '晽晽貓貓把雞腿藏到枕頭底下', '晽晽貓貓：喵？（裝聽不懂）',
      '晽晽貓貓整隻攤平，變成一塊橘色地毯', '晽晽貓貓：你推我，我就推你', '晽晽貓貓：這是我的位子', '晽晽貓貓偷偷舔了一下你的手',
      '晽晽貓貓：嗝～（剛偷吃完）', '晽晽貓貓抱住你的手臂不放', '晽晽貓貓：好啦好啦…才怪', '晽晽貓貓開始呼嚕呼嚕，賴著不走'],
    bye: ['晽晽貓貓：好啦好啦，我去吃宵夜了', '晽晽貓貓：哼，我要叼走一包零食當補償', '晽晽貓貓滾走了～', '晽晽貓貓：你們慢慢玩，我去冰箱巡邏',
      '晽晽貓貓叼著雞腿，頭也不回地走了', '晽晽貓貓：我明天還要來！', '晽晽貓貓：下次要準備我的份喔', '晽晽貓貓滾到門外，順便把門推上了', '晽晽貓貓：無聊，我去睡了'],
    idle: '晽晽貓貓看你們不理牠，自己去找吃的了',
  },
  haohao: {
    hi: ['還好：嗷你們在幹嘛～', '還好：嗷～我也要玩～', '還好：我是女生，可以一起玩嗎？', '還好：嗷？（歪頭）',
      '還好用頭把門頂開：嗷～', '還好：把拔～你們在玩什麼？', '還好叼著球衝進來：玩這個！', '還好：嗷！我聽到聲音了！',
      '還好跳上床，尾巴打到你們的臉', '還好：嗷～為什麼不揪我？', '還好：你們在打架嗎？我來保護你們！', '還好：哈哈～好熱鬧喔～'],
    push: ['還好：嗷？', '還好：嗷～不要嘛～', '還好翻肚子：摸我～', '還好：把拔～你們在幹嘛？', '還好以為你在跟牠玩，尾巴搖更快了', '還好：嗷嗷！',
      '還好：我是女生，要溫柔一點', '還好把頭塞進你們中間', '還好：嗷～把拔貓咪呢？', '還好舔了你一大口',
      '還好：再推一次就是在玩了喔', '還好整隻躺平：我不走～', '還好追著自己的尾巴轉圈圈', '還好：哈哈～好好玩～',
      '還好：嗷（不知道在嗷什麼）', '還好把枕頭叼走了', '還好：我也要抱抱～', '還好歪頭：你們為什麼臉紅紅的？'],
    bye: ['還好：嗷…好啦，我去找把拔貓咪了', '還好叼著球跑走了：嗷～', '還好：哈哈～掰掰～', '還好：我去找蝴蝶了～',
      '還好叼走你的一隻襪子當紀念', '還好：嗷～明天再來玩！', '還好：我是女生，我懂，我走了', '還好跑出去，順便撞到門：嗷！', '還好：把拔～晚安～'],
    idle: '還好追著自己的尾巴，轉著轉著就走掉了',
  },
  // 阿扁比較乖，點兩下就走；以為你們在等地震
  abian: {
    need: 2,
    hi: ['阿扁：等等是不是要地震了？', '阿扁在思考……那根是ㄐㄐ地震棒嗎？', '阿扁：我感覺到床在搖，是地震嗎？', '阿扁：ㄐㄐ地震棒在動了！要地震了！',
      '阿扁摀住鼻子跑進來：要地震了快躲好！', '阿扁：我來幫忙監測地震', '阿扁：氣象局說等等會有地震嗎？', '阿扁在思考……為什麼地震都晚上來？',
      '阿扁：搖得好厲害，我要躲桌子底下', '阿扁：ㄐㄐ地震棒的數值好高喔', '阿扁：地震來了要先保護頭', '阿扁：我數到三，地震就來'],
    push: ['阿扁：好，我乖乖的', '阿扁：可是地震怎麼辦？', '阿扁：我不吵，我只是擔心', '阿扁拍拍手：諧音梗：「震」的好喜歡你們',
      '阿扁：那我去門外監測', '阿扁：ㄐㄐ地震棒交給你們保管喔', '阿扁在思考……', '阿扁：不要捏我的鼻子！'],
    bye: ['阿扁：好，我去躲桌子底下了', '阿扁：如果真的地震要叫我喔', '阿扁乖乖走出去，順手關燈', '阿扁：我去通知狗狗要地震了',
      '阿扁：監測完畢，今天是規模 5 級', '阿扁：地震結束要記得報平安喔', '阿扁：我去寫地震報告了', '阿扁拍拍手：「震」好，我走了', '阿扁：晚安，小心餘震'],
    idle: '阿扁在思考……地震好像沒有來，就回去睡覺了',
  },
};
const PEST_KEYS = Object.keys(PESTS);
let pestTimer = 0, pestDone = false;

// 進火辣區（輸完密碼）的時候決定這次會不會來
const _hotEnter = ACT.hot;
ACT.hot = async () => {
  const wasOpen = now() < hotUntil;
  await _hotEnter();
  // 好寶加入前的測試期間：每次進來約 10 秒就來，趕走後 10 秒又來，不限次數
  if (trialOpen() && now() < hotUntil) { pestDone = false; clearTimeout(pestTimer); pestTimer = setTimeout(pestTry, 8000 + Math.random() * 4000); return; }
  if (wasOpen || now() >= hotUntil) return;
  pestDone = false; clearTimeout(pestTimer);
  if (!(S.couple.drops || {})[`pest-${dkey()}`] && Math.random() < PEST_ODDS) pestTimer = setTimeout(pestTry, 20000 + Math.random() * 70000);
};
function pestTry() {
  if (pestDone) return;
  const hotOpen = document.querySelector('.modal-back.hot-zone');
  if (!hotOpen || document.visibilityState === 'hidden' || now() >= hotUntil) return;
  // 正在輸密碼、正在倒數計時的時候不吵，晚一點再來
  if (document.querySelector('.pin-wrap, .pest')) { pestTimer = setTimeout(pestTry, 15000); return; }
  if (trialOpen()) return showPest();
  // 兩個人一天最多被搗亂一次
  S.store.coupleTx(S.cid, (c) => ((c.drops || {})[`pest-${dkey()}`] ? null : { [`drops.pest-${dkey()}`]: true }))
    .then((ok) => { if (ok && document.querySelector('.modal-back.hot-zone')) showPest(); }).catch(() => {});
}
function showPest(k = pick(PEST_KEYS)) {
  pestDone = true;
  const P = PESTS[k], need = P.need || 3 + Math.floor(Math.random() * 4);
  let hits = 0, gone = false;
  const el = document.createElement('div');
  el.className = `pest pest-${k} ${Math.random() < .5 ? 'from-l' : 'from-r'}`;
  const hi = pick(P.hi); pestHeard(k, hi);
  el.innerHTML = `<div class="pest-say">${esc(hi)}</div>
    <button class="pest-body" aria-label="${esc(FRIENDS[k].name)}" style="width:${Math.round(Math.max(FRIENDS[k].w * 1.25, 110))}px"><span class="pest-art">${typeof withHat === 'function' ? withHat(k, friendArt(k)) : friendArt(k)}</span></button>`;
  document.body.appendChild(el);
  sfx('pop'); vibrate(15);
  const say = (t) => { pestHeard(k, t); const s = $('.pest-say', el); s.textContent = t; s.classList.remove('pop'); void s.offsetWidth; s.classList.add('pop'); };
  const leave = (t, chased) => {
    if (gone) return; gone = true; clearTimeout(idle);
    say(t); el.classList.add(chased ? 'chased' : 'wander');
    if (chased) { const r = $('.pest-body', el).getBoundingClientRect(); floaty(r.left + r.width / 2, r.top, k === 'orange' ? ['#c9773a', '#ffd45c'] : ['#ff9fb4', '#ffd45c', '#e2b56a']); sfx('chime'); }
    setTimeout(() => {
      el.remove();
      // 測試期間：走了 10 秒左右再來一隻
      if (trialOpen() && document.querySelector('.modal-back.hot-zone')) { pestDone = false; clearTimeout(pestTimer); pestTimer = setTimeout(pestTry, 8000 + Math.random() * 4000); }
    }, 1900);
  };
  // 11/24：不會自己走掉，一定要點到牠跑掉（關掉火辣區才會跟著消失）
  const idle = 0;
  let lastPush = -1;
  $('.pest-body', el).onclick = () => {
    if (gone) return;
    hits++; vibrate(20);
    if (hits >= need) return leave(pick(P.bye), true);
    sfx('flip');
    let i; do { i = Math.floor(Math.random() * P.push.length); } while (i === lastPush && P.push.length > 1); lastPush = i;
    say(P.push[i]);
    el.style.setProperty('--push', hits);   // 每點一下被推遠一點
    el.classList.remove('nudge'); void el.offsetWidth; el.classList.add('nudge');
  };
  // 火辣區關掉、切到背景就跟著消失
  const watch = setInterval(() => {
    if (!document.body.contains(el)) return clearInterval(watch);
    if (!document.querySelector('.modal-back.hot-zone') || document.visibilityState === 'hidden') { clearInterval(watch); clearTimeout(idle); el.remove(); }
  }, 500);
}
window.__pest = (k) => showPest(k);

// 搗蛋台詞也收進圖鑑（只有兩人都開火辣時才看得到這一段）
const pestAll = (k) => { const P = PESTS[k]; return P ? [...P.hi, ...P.push, ...P.bye, P.idle] : []; };
function pestHeard(k, t) { const i = pestAll(k).indexOf(t); if (i >= 0 && typeof dexNote === 'function') dexNote(k, 'p' + i); }
function pestDexHTML(k, got) {
  if (!PESTS[k] || typeof hotOn !== 'function' || !hotOn()) return '';
  const all = pestAll(k), n = all.filter((_, i) => got['p' + i]).length;
  return `<h3 class="da-h">火辣區搗蛋 <span>${n} 句</span></h3>
    ${all.map((t, i) => `<div class="dex-line sp hot ${got['p' + i] ? '' : 'locked'}"><span class="sp-tag">火辣</span>${got['p' + i] ? esc(t) : '？？？'}</div>`).join('')}`;
}
