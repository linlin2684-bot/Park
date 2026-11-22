// ============================================================
//  小動物：雙人小劇場、值日生、節日／心情限定、圖鑑書
// ============================================================

// ---------- 雙人小劇場（兩隻一起路過，點牠們就會演一段） ----------
// who：a / b 是兩位演員，n 是旁白
const SCENES = [
  { id: 'tail', a: 'doggy', b: 'black', lead: 'black', title: '尾巴事件',
    lines: [['n', '狗狗偷偷拍了一下小小黑的尾巴'], ['b', '喵？'], ['n', '小小黑轉身抱住狗狗'], ['a', '（愣住）……汪']] },
  { id: 'chase', a: 'haohao', b: 'black', lead: 'black', title: '把拔貓咪',
    lines: [['a', '嗷～把拔貓咪好可愛喔～'], ['b', '還好，好煩'], ['a', '把拔貓咪等等我～你好可愛喔～']] },
  { id: 'step', a: 'gungun', b: 'doggy', lead: 'doggy', title: '踩踩',
    lines: [['a', '狗狗～❤️（踩）'], ['b', '……'], ['a', '狗狗～❤️（踩）'], ['n', '狗狗默默走開了'], ['a', '……狗（跟上去）']] },
  { id: 'bath', a: 'doggy', b: 'abian', lead: 'abian', title: '那你呢',
    lines: [['a', '汪，去洗澡'], ['b', '（思考）……那你呢？'], ['a', '（假裝沒聽到）'], ['b', '（拍拍手）']] },
  { id: 'waltz', a: 'abian', b: 'haohao', lead: 'abian', title: '諧音梗',
    lines: [['a', '還好，你知道什麼狗最會跳舞嗎？'], ['b', '嗷？'], ['a', '「汪」爾滋！'], ['a', '（自己笑到拍拍手）']] },
  { id: 'flower', a: 'tuxedo', b: 'white', lead: 'white', title: '一朵花',
    lines: [['n', '吵吵貓送陷阱貓一朵花'], ['b', '哼，我就收下吧'], ['n', '吵吵貓開心到跌倒了']] },
  { id: 'mine', a: 'orange', b: 'calico', lead: 'calico', title: '這是我的！',
    lines: [['n', '晽晽貓貓看到小魚乾走過來'], ['n', '晽晽貓貓直接把小魚乾撞飛'], ['a', '（抱緊自己的小魚乾）這是我的！'], ['b', '……喵？']] },
  { id: 'eatshark', a: 'orange', b: 'shark', lead: 'shark', title: '被吃掉了',
    lines: [['n', '晽晽貓貓一口把鯊魚吃掉了'], ['a', '嗝～'], ['b', '長長長 長長長 長長長長 長完了～'], ['b', '人類～我被吃掉了喔？']] },
  { id: 'nose', a: 'abian', b: 'shark', lead: 'shark', title: '鼻子',
    lines: [['b', '人類～……啊不對，你是阿扁'], ['a', '（摀住鼻子）你不要碰我的鼻子，我也不碰你的'], ['b', '好～'], ['n', '鯊魚碰了一下自己的鼻子，關機了'], ['a', '（拍拍手）']] },
  { id: 'hello', a: 'gungun', b: 'shark', lead: 'shark', title: '哈囉',
    lines: [['a', '棍～'], ['b', '人類～哈囉～'], ['a', '……魚'], ['b', '我是鯊魚～'], ['n', '小棍棍踩了鯊魚一下，鯊魚開心地游走了']] },
  { id: 'bask', a: 'black', b: 'white', lead: 'black', title: '曬太陽',
    lines: [['n', '小小黑走到陷阱貓旁邊'], ['b', '這裡很溫暖，你也一起來曬吧'], ['a', '喵～'], ['n', '兩隻貓並排趴著，一起曬太陽']] },
  { id: 'aflower', a: 'tuxedo', b: 'abian', lead: 'tuxedo', title: '阿扁花',
    lines: [['a', '（叼來一朵花）給你'], ['b', '這是什麼花？'], ['a', '不知道'], ['b', '那我叫它「阿扁花」'], ['n', '阿扁拍拍手']] },
  { id: 'trap', a: 'white', b: 'shark', lead: 'shark', title: '陷阱',
    lines: [['n', '陷阱貓躲在紙箱後面'], ['b', '人類～……箱子～哈囉～'], ['a', '……我是陷阱'], ['b', '陷阱～哈囉～'], ['n', '陷阱貓放棄了']] },
  { id: 'sunspot', a: 'orange', b: 'calico', lead: 'calico', title: '搶位子',
    lines: [['n', '小魚乾在窗邊曬太陽'], ['a', '讓開，這是我的位子'], ['b', '喵！（我先來的）'], ['n', '晽晽貓貓直接坐上去，把小魚乾擠下去了']] },
  { id: 'snack', a: 'orange', b: 'calico', lead: 'calico', title: '偷吃',
    lines: [['n', '小魚乾在吃罐罐'], ['a', '（湊過來）你在吃什麼？'], ['b', '嘶——'], ['n', '晽晽貓貓一屁股把小魚乾撞開，把罐罐吃光了']] },
  { id: 'scare', a: 'haohao', b: 'calico', lead: 'calico', title: '嚇一跳',
    lines: [['a', '嗷！'], ['n', '小魚乾嚇到整隻跳起來'], ['b', '（躲到你後面撒嬌）'], ['a', '哈囉貓咪～']] },
  { id: 'smell', a: 'haohao', b: 'doggy', lead: 'doggy', title: '香香',
    lines: [['b', '汪，去洗澡'], ['a', '我是女生～女生都香香的～'], ['b', '（聞一聞）……汪，去洗澡']] },
  { id: 'apple', a: 'gungun', b: 'haohao', lead: 'gungun', title: '球球',
    lines: [['a', '蘋果～'], ['b', '嗷！球球！（把蘋果叼走了）'], ['a', '……果']] },
  { id: 'can', a: 'white', b: 'tuxedo', lead: 'white', title: '公主的罐罐',
    lines: [['a', '我的罐罐呢？'], ['n', '吵吵貓把自己的罐罐推過去'], ['a', '……哼，算你懂事'], ['b', '喵！喵喵！（其實已經偷吃一半了）']] },
  { id: 'off', a: 'abian', b: 'shark', lead: 'abian', title: '關機',
    lines: [['n', '阿扁好奇碰了一下鯊魚的鼻子'], ['n', '鯊魚關機了'], ['a', '（思考）……我是不是把牠弄壞了？'], ['n', '阿扁再碰一下'], ['b', '河！'], ['n', '阿扁嚇到摀住自己的鼻子']] },
  { id: 'drum', a: 'haohao', b: 'orange', lead: 'orange', title: '雞腿',
    lines: [['a', '嗷！球球！'], ['b', '這是雞腿'], ['a', '……嗷？'], ['n', '晽晽貓貓抱緊雞腿滾走了']] },
  { id: 'flower2', a: 'tuxedo', b: 'doggy', lead: 'doggy', title: '送狗狗一朵花',
    lines: [['n', '吵吵貓送狗狗一朵花'], ['b', '（聞了聞）汪，香香的'], ['n', '吵吵貓開心到原地轉圈'], ['n', '狗狗把花戴在自己頭上']] },
  { id: 'half', a: 'gungun', b: 'black', lead: 'black', title: '分你一半',
    lines: [['a', '蘋……果～'], ['n', '小棍棍咬一口，把剩下的推給小小黑'], ['b', '（聞一聞）……喵？'], ['a', '……果（自己吃掉了）']] },
  { id: 'smell2', a: 'doggy', b: 'white', lead: 'white', title: '誰比較香',
    lines: [['a', '（聞了聞陷阱貓）汪，還算香'], ['b', '我當然香'], ['a', '（再聞一下）汪，去洗澡'], ['n', '陷阱貓炸毛了']] },
  { id: 'step2', a: 'gungun', b: 'haohao', lead: 'haohao', title: '也是狗狗',
    lines: [['a', '狗狗～❤️（踩）'], ['b', '嗷～小棍棍好可愛喔～']] },
];
const sceneSeen = () => S.couple?.scenes || {};

function pickScene(k) {
  // 小劇場：每人每天最多看到 1 齣新的，其他時候重演看過的
  const cand = SCENES.filter((s) => s.a === k || s.b === k);
  if (!cand.length || Math.random() > .3) return null;
  const fresh = cand.filter((s) => !sceneSeen()[s.id]), old = cand.filter((s) => sceneSeen()[s.id]);
  const q = dexQuota('scene');
  if (fresh.length && (q.used < 1 || trialOpen()) && Math.random() < (old.length ? .35 : .6)) { q.use(); return fresh[Math.floor(Math.random() * fresh.length)]; }
  return old.length ? old[Math.floor(Math.random() * old.length)] : null;
}

function bubble(text, x, top, cls = '') {
  const b = document.createElement('div');
  b.className = `fr-bubble ${cls}`;
  b.textContent = text;
  document.body.appendChild(b);
  const w = b.offsetWidth, vw = innerWidth;
  b.style.left = Math.max(8, Math.min(vw - w - 8, x - w / 2)) + 'px';
  b.style.top = Math.max(8, top - b.offsetHeight - 8) + 'px';
  b.style.setProperty('--tail', Math.max(14, Math.min(w - 14, x - parseFloat(b.style.left))) + 'px');
  return b;
}

function duoStroll(sc) {
  if (!sc || document.querySelector('.modal-back')) return;
  document.querySelectorAll('.cat-stroll').forEach((x) => x.remove());
  const other = sc.lead === sc.a ? sc.b : sc.a;
  const dur = 12, lead = walker(sc.lead, 'duo'), back = walker(other, 'duo');
  const gap = (FRIENDS[other].w + 12) / (innerWidth + 180) * dur;
  [lead, back].forEach((e) => { e.style.animationDuration = dur + 's'; });
  lead.style.animationDelay = `-${gap.toFixed(2)}s`;
  const byKey = { [sc.lead]: lead, [other]: back };
  let timer = setTimeout(() => { lead.remove(); back.remove(); }, dur * 1000 + 500);
  let played = false;
  const play = async () => {
    if (played) return; played = true;
    clearTimeout(timer);
    [lead, back].forEach((e) => e.classList.add('paused'));
    sfx('heart');
    const ra = byKey[sc.a].getBoundingClientRect(), rb = byKey[sc.b].getBoundingClientRect();
    // 點一下才講下一句（12 秒都沒點就自己結束）
    let quit = false;
    for (const [i, [who, t]] of sc.lines.entries()) {
      let b;
      if (who === 'n') b = bubble(t, (ra.left + ra.right + rb.left + rb.right) / 4, Math.min(ra.top, rb.top) - 34, 'narr');
      else { const r = who === 'a' ? ra : rb; b = bubble(t, r.left + r.width * .55, r.top + 6); byKey[sc[who]].classList.add('talk'); }
      b.insertAdjacentHTML('beforeend', `<span class="fr-next">${i < sc.lines.length - 1 ? '點一下繼續' : '點一下結束'}</span>`);
      await sleep(350);   // 避免同一下點擊直接跳過
      // 只有點對話框或牠們才會繼續，點畫面其他地方照常（不會被吃掉）
      b.classList.add('tappable');
      const tapped = await new Promise((res) => {
        const els = [b, lead, back];
        const done = (v) => { clearTimeout(tm); els.forEach((x) => x.removeEventListener('click', on, true)); res(v); };
        const tm = setTimeout(() => done(false), 12000);
        function on(e) { e.stopPropagation(); e.preventDefault(); done(true); }
        els.forEach((x) => x.addEventListener('click', on, true));
      });
      b.classList.add('out'); setTimeout(() => b.remove(), 300);
      [lead, back].forEach((e) => e.classList.remove('talk'));
      if (!tapped) { quit = true; break; }
      sfx('pop');
    }
    [lead, back].forEach((e) => e.classList.remove('paused'));
    timer = setTimeout(() => { lead.remove(); back.remove(); }, dur * 1000);
    if (sc.a === 'black' || sc.b === 'black') blackPatXP();
    dexNote(sc.a, null); dexNote(sc.b, null);
    if (S.couple && !sceneSeen()[sc.id]) {
      await S.store.updateCouple(S.cid, { [`scenes.${sc.id}`]: { at: now(), by: me() } });
      toast(`小劇場收進圖鑑：〈${sc.title}〉`);
    }
  };
  lead.onclick = play; back.onclick = play;
  document.body.appendChild(back); document.body.appendChild(lead);
}
window.__scene = (id) => duoStroll(SCENES.find((s) => s.id === id) || SCENES[0]);

function blackPatXP() {
  const dk = `park-stroll-pat-${dkey()}-${me()}`;
  if (!localStorage.getItem(dk) && typeof petXP === 'function') { localStorage.setItem(dk, '1'); petXP(1); }
}

// ---------- 節日／心情 ----------
const FEST_NAMES = { morning: '早上', eaten: '被吃掉', eaten2: '被吃掉', anniv: '週年', bday: '生日', xmas: '聖誕', newyear: '新年', valentine: '情人節', halloween: '萬聖節', rain: '下雨心情' };
function festNow() {
  const pv = localStorage.getItem('park-fest-preview');
  if (pv) return pv;
  if (!S.couple) return '';
  if (typeof annivInfo === 'function' && annivInfo().is) return 'anniv';
  const t = new Date(); t.setHours(0, 0, 0, 0);
  const md = (t.getMonth() + 1) * 100 + t.getDate();
  const bday = (S.couple.members || []).some((u) => {
    const [m, d] = String(S.couple.profiles?.[u]?.bday || '').split('-').map(Number);
    if (!m || !d) return false;
    return Math.abs(Math.round((t - new Date(t.getFullYear(), m - 1, d)) / 86400000)) <= 1;
  });
  if (bday) return 'bday';
  if (md >= 1220 && md <= 1226) return 'xmas';
  if (md === 1231 || md <= 102) return 'newyear';
  if (md >= 213 && md <= 215) return 'valentine';
  if ((md >= 1029 && md <= 1031) || md === 1101) return 'halloween';
  return '';
}
function myMoodRain() {
  const m = (S.couple?.moods || {})[me()];
  return !!m && (m.icon === '🌧️' || m.icon === '⛈️') && now() - (m.at || 0) < 24 * 3600000;
}

// 限定台詞：只有在那個節日／心情才聽得到
const SPECIAL_LINES = {
  black: [{ w: 'xmas', t: '小小黑戴著聖誕帽，一直想用腳把它撥掉' }, { w: 'anniv', t: '小小黑：喵（週年快樂的意思）' }, { w: 'rain', t: '小小黑跳到你腿上，把自己捲成一團暖暖的' }],
  orange: [{ w: 'newyear', t: '晽晽貓貓：年夜飯！年夜飯在哪裡！' }, { w: 'bday', t: '晽晽貓貓盯著生日蛋糕，口水滴下來了' }],
  white: [{ w: 'bday', t: '陷阱貓：今天壽星最大，陷阱貓讓你一天' }, { w: 'valentine', t: '陷阱貓：陷阱貓今天心情好，給你摸一下' }],
  calico: [{ w: 'bday', t: '小魚乾把最珍貴的一條小魚乾送給壽星' }, { w: 'rain', t: '小魚乾蹭過來撒嬌：不要難過～' }],
  tuxedo: [{ w: 'valentine', t: '吵吵貓今天送了一整束花，結果被花絆倒' }, { w: 'bday', t: '吵吵貓叼著一朵花來說生日快樂' }],
  haohao: [{ w: 'xmas', t: '還好：嗷！聖誕老公公是女生～' }, { w: 'anniv', t: '還好：嗷！週年快樂～我是女生～' }, { w: 'halloween', t: '還好扮成貓咪：嗷把拔，我也是貓咪～' }],
  doggy: [{ w: 'rain', t: '狗狗走過來，把頭靠在你腳邊' }, { w: 'rain', t: '狗狗：汪（今天先不用洗澡，抱抱）' }, { w: 'rain', t: '狗狗香香的，借你聞一下' }, { w: 'xmas', t: '狗狗：汪，聖誕節也要去洗澡' }],
  abian: [{ w: 'newyear', t: '阿扁在思考……新的一年要想什麼' }, { w: 'anniv', t: '阿扁：五週年，「無」週年？（自己拍拍手）' }],
  gungun: [{ w: 'xmas', t: '小棍棍：誕' }, { w: 'valentine', t: '小棍棍：狗狗❤️❤️❤️' }],
  shark: [{ w: 'newyear', t: '鯊魚：河！（新年快樂）' }, { w: 'halloween', t: '鯊魚戴著巫婆帽關機了，看起來很像在裝死' },
    { w: 'morning', t: '鯊魚：人類～早安～' }, { w: 'morning', t: '鯊魚：人類～早安～我今天也很乖～' }, { w: 'morning', t: '鯊魚：人類～早安～（還沒完全開機）' },
    { w: 'eaten', t: '鯊魚：長長長 長長長 長長長長 長完了～' }, { w: 'eaten', t: '鯊魚：人類～我被吃掉了喔？' },
    { w: 'eaten2', t: '鯊魚：長…長…長…' }, { w: 'eaten2', t: '鯊魚：長長長長長長長 呼～長完了' }],
};
function specialNow(k) {
  const f = festNow(), rain = myMoodRain();
  const h = new Date().getHours(), morning = h >= 5 && h < 11;   // 早安只在早上 5～11 點
  return (SPECIAL_LINES[k] || []).map((x, i) => [i, x]).filter(([, x]) => x.w === f || (x.w === 'rain' && rain) || (x.w === 'morning' && morning));
}

// 節日小帽子：畫在每隻動物頭上（座標是各自的 viewBox）
const HAT_AT = {
  black: [30, 39], orange: [30, 37], white: [30, 34], calico: [30, 39], tuxedo: [30, 39],
  doggy: [30, 33], abian: [30, 33], haohao: [32, 11, 1.15], gungun: [28, 23, 1.2], shark: [33, 19, 1.15],
};
function hatSVG(kind) {
  if (kind === 'xmas') return `<path d="M-11 0 Q-9 -15 1 -19 Q10 -22 14 -11 Q9 -14 6 -11 Q9 -5 11 0 Z" fill="#d6434f"/><path d="M-3 -16 Q1 -18 5 -17" stroke="#fff" stroke-opacity=".35" stroke-width="1.4" fill="none" stroke-linecap="round"/><rect x="-12.5" y="-3" width="25" height="6" rx="3" fill="#fbf7f0"/><circle cx="14" cy="-10.5" r="3.3" fill="#fbf7f0"/>`;
  if (kind === 'bday' || kind === 'newyear') {
    const [a, b] = kind === 'bday' ? ['#f59ab4', '#fff3c4'] : ['#d84a3a', '#f5c451'];
    return `<path d="M-8 1 L0 -19 L8 1 Z" fill="${a}"/><path d="M-5.2 -6 L5.2 -6 M-2.8 -12 L2.8 -12" stroke="${b}" stroke-width="2.2"/><circle cx="0" cy="-19.5" r="2.8" fill="${b}"/><ellipse cx="0" cy="1" rx="9" ry="2" fill="${b}"/>`;
  }
  if (kind === 'halloween') return `<ellipse cx="0" cy="0" rx="14" ry="3.2" fill="#3d2b52"/><path d="M-7 -1 Q-4 -12 1 -18 Q6 -22 10 -19 Q5 -17 5 -10 L7 -1 Z" fill="#3d2b52"/><path d="M-6.4 -3.6 L6.6 -3.6" stroke="#f2a33a" stroke-width="2.4"/>`;
  if (kind === 'anniv' || kind === 'valentine') return `<g class="fest-heart"><path d="M0 -4 C-2 -8 -9 -8 -9 -2.5 C-9 2 -3 5.5 0 8 C3 5.5 9 2 9 -2.5 C9 -8 2 -8 0 -4 Z" transform="translate(0 -14) scale(.8)" fill="${kind === 'anniv' ? '#c8283c' : '#ef6f8c'}"/></g>`;
  return '';
}
function withHat(k, svg, kind = festNow()) {
  const at = HAT_AT[k];
  if (!kind || kind === 'rain' || !at) return svg;
  const [x, y, s = 1] = at;
  return svg.replace(/<\/svg>\s*$/, `<g class="fest-hat" transform="translate(${x} ${y}) rotate(-12) scale(${s})">${hatSVG(kind)}</g></svg>`);
}

// ---------- 自己加的台詞 ----------
function customLines(k) {
  const cu = ((S.couple?.dex || {})[k] || {}).cu || {};
  return Object.entries(cu).filter(([, v]) => v && v.t).map(([id, v]) => ({ id, ...v })).sort((a, b) => a.at - b.at);
}
function withName(k, t) { const n = FRIENDS[k].name; return t.includes(n) ? t : `${n}：${t}`; }

// ---------- 值日生（偶爾才有） ----------
function dutyToday() {
  if (!S.couple || (S.couple.members || []).length < 2) return null;
  const pv = localStorage.getItem('park-duty-preview');
  // 只有遇過的小動物才會來當值日生
  const d = S.couple.dex || {};
  // 只算昨天以前遇過的，避免今天新遇到一隻，值日生就中途換人
  const t0 = parseD(dkey()).getTime();
  const pool = DEX_ORDER.filter((k) => k !== 'black' && (d[k] || {}).met && d[k].met < t0);
  if (pv) return pool.includes(pv) ? pv : pool[0] || null;
  if (!pool.length) return null;
  const h = hash('duty' + dkey() + (S.cid || ''));
  if (h % 100 >= 35) return null;   // 每天 35% 機率
  return pool[(h >>> 8) % pool.length];
}
// 值日生住進小小黑的房間：坐在小小黑旁邊，點牠打招呼
function dutyVisitor() {
  const k = dutyToday();
  if (!k) return '';
  const met = !!((S.couple.dex || {})[k] || {}).met;
  const said = localStorage.getItem(`park-duty2-${dkey()}-${me()}`);
  return `<button class="pet-visitor fr-v-${k} ${met ? '' : 'locked'} ${said ? 'said' : ''}" data-act="dutyHi" data-k="${k}" aria-label="今日值日生">
    <span class="pv-tag">值日生</span>${withHat(k, friendArt(k))}</button>`;
}
function dutyText() {
  const k = dutyToday();
  if (!k) return '';
  const met = !!((S.couple.dex || {})[k] || {}).met;
  const said = localStorage.getItem(`park-duty2-${dkey()}-${me()}`);
  if (said) return `今天 ${FRIENDS[k].name} 陪${esc(petState().name)}值日，點牠再聊聊`;
  return (met ? `今天 ${FRIENDS[k].name} 來陪${esc(petState().name)}值日，點牠打招呼` : '有位沒見過的朋友來值日，點牠看看');
}
// 值日小劇場的程式在 07h2-duty.js

// ---------- 圖鑑書 ----------
function dexFullCount() {
  const d = S.couple?.dex || {};
  return DEX_ORDER.filter((k) => { const n = Object.keys((d[k] || {}).l || {}).filter((x) => /^\d+$/.test(x)).length; return n >= friendLines(k).length; }).length;
}
function dexStats() {
  const d = S.couple?.dex || {};
  let heard = 0, total = 0;
  DEX_ORDER.forEach((k) => {
    const got = (d[k] || {}).l || {};
    total += friendLines(k).length + (SPECIAL_LINES[k] || []).length;
    heard += Object.keys(got).filter((x) => got[x]).length;
  });
  return { met: dexCount(), heard, total, scenes: Object.keys(sceneSeen()).filter((id) => SCENES.some((s) => s.id === id)).length,
    custom: DEX_ORDER.reduce((n, k) => n + customLines(k).length, 0) };
}

// 封面大合照：後排大的、前排五隻貓，沒遇過是剪影
const COVER_POS = {
  shark: [33, 70, 34], haohao: [-1, 33, 35], doggy: [27, 35, 22], abian: [47, 35, 22], gungun: [66, 34, 34],
  orange: [-1, 3, 22], white: [19, 3, 21], black: [39.5, 3, 21], calico: [59, 3, 21], tuxedo: [79, 3, 21],
};
function coverHTML() {
  const d = S.couple.dex || {}, st = dexStats();
  const got = typeof computeAch === 'function' ? computeAch() : new Set();
  const achs = D.ACHIEVEMENTS.filter((a) => a.cat === 'dex');
  const lineup = DEX_ORDER.map((k, i) => {
    const [l, b, w] = COVER_POS[k], met = !!(d[k] || {}).met;
    const face = l + w / 2 < 50 ? 'r' : 'l';
    return `<button class="dc-ani ${met ? '' : 'locked'} face-${face}" data-go="${i + 1}" style="left:${l}%;bottom:${b}%;width:${w}%;z-index:${b < 20 ? 3 : b > 60 ? 1 : 2}" aria-label="${met ? esc(FRIENDS[k].name) : '還沒遇過'}">${friendArt(k)}</button>`;
  }).join('');
  return `<section class="db-page db-cover">
    <div class="dc-eyebrow">PARK FRIENDS・兩人遊樂園</div>
    <h2 class="dc-title">小動物圖鑑</h2>
    <div class="dc-sub">遇到 <b>${st.met}</b> 位・聽過 <b>${st.heard}</b> 句・小劇場 <b>${st.scenes}</b> 齣</div>
    <div class="dc-frame"><div class="dc-photo">${lineup}<div class="dc-ground"></div></div></div>
    <div class="dc-stamps">${achs.map((a) => `<button class="dc-stamp t-${a.tier} ${got.has(a.id) ? 'on' : ''}" data-desc="${esc(a.name)}：${esc(a.desc)}${a.tier === 'g' ? '（解鎖會掉限定券）' : ''}"><span>${a.mark}</span><small>${esc(a.name)}</small></button>`).join('')}</div>
    <div class="dc-hint">點牠們或往左滑翻頁 <i data-ic="chevron"></i></div>
  </section>`;
}
function animalPage(k, i) {
  const f = FRIENDS[k], e = (S.couple.dex || {})[k] || {}, met = !!e.met;
  const L = friendLines(k), got = e.l || {}, sp = SPECIAL_LINES[k] || [], cu = customLines(k);
  const no = `No.${String(i + 1).padStart(2, '0')}`;
  const heard = L.filter((_, j) => got[j]).length;
  if (!met) return `<section class="db-page db-ani">
    <div class="da-top"><span class="da-no">${no}</span><span class="chip">？？？</span></div>
    <div class="da-stage locked">${friendArt(k)}</div>
    <h2 class="da-name muted">？？？</h2>
    <p class="small muted center">還沒遇過。牠偶爾會路過首頁，或是哪天來當值日生。</p>
    <div class="da-locked-hint">牠有好多話想跟你們說</div>
  </section>`;
  return `<section class="db-page db-ani">
    <div class="da-top"><span class="da-no">${no}</span><span class="chip">${f.kind}</span></div>
    <div class="da-stage">${friendArt(k)}</div>
    <h2 class="da-name">${esc(f.name)}</h2>
    <div class="da-met">${new Date(e.met).toLocaleDateString('zh-TW')} 第一次遇到${e.by ? `・${esc(nick(e.by))}` : ''}</div>
    <p class="da-intro">${esc(f.intro.replace('男朋友', nick((S.couple.members || []).find((u) => prof(u).role === 'him')) || '男朋友'))}</p>
    <h3 class="da-h">說過的話 <span>${heard} 句</span></h3>
    ${L.map((t, j) => `<div class="dex-line ${got[j] ? '' : 'locked'}">${got[j] ? esc(t) : '？？？'}</div>`).join('')}
    ${sp.length ? `<h3 class="da-h">限定台詞 <span>${sp.filter((_, j) => got['s' + j]).length} 句</span></h3>
      ${sp.map((x, j) => `<div class="dex-line sp ${got['s' + j] ? '' : 'locked'}"><span class="sp-tag">${FEST_NAMES[x.w]}</span>${got['s' + j] ? esc(x.t) : '？？？'}</div>`).join('')}` : ''}
    ${typeof dutyDexHTML === 'function' ? dutyDexHTML(k) : ''}
    ${typeof pestDexHTML === 'function' ? pestDexHTML(k, got) : ''}
    <h3 class="da-h">我們幫牠加的 <span>${cu.length}</span></h3>
    ${cu.map((c) => `<div class="dex-line cu">${esc(c.t)}<span class="cu-by">— ${esc(nick(c.by))}</span>${c.by === me() ? `<button class="cu-del" data-del="${c.id}" aria-label="刪除">✕</button>` : ''}</div>`).join('') || '<p class="small muted" style="margin:4px 0 0">你們最懂牠，幫牠多說幾句吧，路過時牠就會說出來。</p>'}
    <button class="btn ghost sm da-add" data-add="${k}"><i data-ic="plus"></i> 幫牠加一句</button>
  </section>`;
}
function scenesPage() {
  const seen = sceneSeen(), d = S.couple.dex || {};
  const mini = (k, on) => `<span class="ds-mini ${on ? '' : 'locked'}">${friendArt(k)}</span>`;
  return `<section class="db-page db-scenes">
    <div class="da-top"><span class="da-no">小劇場</span><span class="chip">${Object.keys(seen).length} 齣</span></div>
    <p class="small muted" style="margin:2px 0 10px">有時候會兩隻一起路過，點牠們就會演一段。</p>
    ${SCENES.map((s) => {
      const on = !!seen[s.id];
      const who = (w) => w === 'n' ? '' : `<b>${esc(FRIENDS[s[w]].name)}</b>`;
      return `<div class="ds-card ${on ? '' : 'locked'}">
        <div class="ds-cast">${mini(s.a, on || (d[s.a] || {}).met)}${mini(s.b, on || (d[s.b] || {}).met)}</div>
        <div class="grow"><div class="ds-title">${on ? `〈${esc(s.title)}〉` : '〈？？？〉'}</div>
        ${on ? s.lines.map(([w, t]) => `<div class="ds-line ${w === 'n' ? 'n' : ''}">${who(w)}${esc(t)}</div>`).join('')
          : `<div class="small muted">${(d[s.a] || {}).met && (d[s.b] || {}).met ? `等 ${esc(FRIENDS[s.a].name)} 和 ${esc(FRIENDS[s.b].name)} 一起路過` : '兩位演員都遇過之後才會有線索'}</div>`}</div>
      </div>`;
    }).join('')}
  </section>`;
}
function bookHTML() {
  const pages = [coverHTML(), ...DEX_ORDER.map((k, i) => animalPage(k, i)), scenesPage()];
  return `<button class="m-close db-close" data-act="close">✕</button>
    <div class="db-track">${pages.join('')}</div>
    <div class="db-nav"><button class="db-prev" aria-label="上一頁"><i data-ic="chevron"></i></button>
      <div class="db-dots">${pages.map((_, i) => `<i data-p="${i}"></i>`).join('')}</div>
      <button class="db-next" aria-label="下一頁"><i data-ic="chevron"></i></button></div>`;
}
function wireBook(m, page = 0) {
  const tr = $('.db-track', m), n = DEX_ORDER.length + 2;
  const go = (p, smooth = true) => tr.scrollTo({ left: Math.max(0, Math.min(n - 1, p)) * tr.clientWidth, behavior: smooth ? 'smooth' : 'auto' });
  const cur = () => Math.round(tr.scrollLeft / tr.clientWidth);
  const dots = () => { const c = cur(); $$('.db-dots i', m).forEach((d, i) => d.classList.toggle('on', i === c)); $('.db-prev', m).disabled = c === 0; $('.db-next', m).disabled = c === n - 1; };
  tr.addEventListener('scroll', () => { clearTimeout(tr._t); tr._t = setTimeout(dots, 60); }, { passive: true });
  $('.db-prev', m).onclick = () => { sfx('flip'); go(cur() - 1); };
  $('.db-next', m).onclick = () => { sfx('flip'); go(cur() + 1); };
  $$('.db-dots i', m).forEach((d) => d.onclick = () => go(+d.dataset.p));
  $$('[data-go]', m).forEach((b) => b.onclick = () => { sfx('flip'); go(+b.dataset.go); });
  $$('.dc-stamp', m).forEach((b) => b.onclick = () => toast(b.dataset.desc));
  $$('[data-add]', m).forEach((b) => b.onclick = async () => {
    const k = b.dataset.add;
    const t = await promptBox(`幫${FRIENDS[k].name}加一句`, { placeholder: `例如：${FRIENDS[k].name}：……` });
    if (!t) return;
    await S.store.updateCouple(S.cid, { [`dex.${k}.cu.${uid8()}`]: { t: t.slice(0, 60), by: me(), at: now() } });
    toast('記下來了，下次路過牠可能會說'); refreshBook(m);
  });
  $$('[data-del]', m).forEach((b) => b.onclick = async () => {
    const k = DEX_ORDER[cur() - 1];
    if (!k) return;
    await S.store.updateCouple(S.cid, { [`dex.${k}.cu.${b.dataset.del}`]: null });
    refreshBook(m);
  });
  requestAnimationFrame(() => { go(page, false); dots(); });
}
function refreshBook(m) {
  const tr = $('.db-track', m), p = Math.round(tr.scrollLeft / tr.clientWidth), y = $$('.db-page', m)[p]?.scrollTop || 0;
  setTimeout(() => {
    $('.modal', m).innerHTML = bookHTML(); wireBook(m, p);
    requestAnimationFrame(() => { const pg = $$('.db-page', m)[p]; if (pg) pg.scrollTop = y; });
  }, 120);
}
// 每台手機各自清一次「記得的」成就、紙條、提醒（加入後 7 天內第一次打開時）
function localFreshStart(ts, force) {
  const fk = `park-fresh-${S.cid}`;
  if (!force && (localStorage.getItem(fk) === String(ts) || now() - ts > 7 * 86400000)) return;
  Object.keys(localStorage).filter((k) => /^park-(ach|miss-seen|redeem-pop|duty|stroll-pat|carry|dexreset|dexnew|petxp|fundpet|mreview|poke|hot)/.test(k)).forEach((k) => localStorage.removeItem(k));
  localStorage.setItem(fk, String(ts));
}
const uid8 = () => Math.random().toString(36).slice(2, 10);
ACT.dex = () => { const m = openModal(bookHTML(), { center: true, cls: 'dex-book' }); wireBook(m, 0); };

// 一次性：圖鑑歸零（值日生可以一直刷台詞的時候收集得太快了）
let dexResetBusy = false;
async function dexResetOnce() {
  if (!S.couple || !S.cid) return;
  // 歸零後，這台手機記得的圖鑑成就也清掉，重新解鎖時才會再跳通知
  const fk = `park-dexreset-ach-${S.cid}-${me()}`, ak = 'park-ach-' + S.cid + '-' + me();
  if (S.couple.dexReset >= 1 && !localStorage.getItem(fk)) {
    try { const seen = JSON.parse(localStorage.getItem(ak) || 'null'); if (seen) localStorage.setItem(ak, JSON.stringify(seen.filter((x) => !String(x).startsWith('dex_')))); } catch {}
    localStorage.setItem(fk, '1');
  }
  // 對方加入的那一刻：小小黑經驗、圖鑑、小劇場全部歸零，從兩個人一起開始
  if ((S.couple.members || []).length >= 2 && !S.couple.togetherStart && !dexResetBusy && COLS.every((c) => S.d[c])) {
    dexResetBusy = true;
    try { await joinFreshStart(); } finally { dexResetBusy = false; }
    return;
  }
  // 加入那一刻是在對方手機上清的：這台手機也要把自己記得的成就、提醒清掉（只做一次）
  if (S.couple.togetherStart && S.couple.dexReset >= 2 && !dexResetBusy) localFreshStart(S.couple.togetherStart);
  if (S.couple.dexReset >= 1 || dexResetBusy) return;
  dexResetBusy = true;
  await S.store.coupleTx(S.cid, (x) => (x.dexReset >= 1 ? null : { dex: {}, scenes: {}, dexReset: 1 }));
  dexResetBusy = false;
}

// 對方加入的那一刻：先備份，再把測試期間的東西全部清掉，兩個人從零開始
// 保留：暱稱、頭像、生日、紀念日、卡池、旅行基金的名稱和目標、對方的生日卡組
async function joinFreshStart() {
  const ts = now();
  const ok = await S.store.coupleTx(S.cid, (x) => (x.togetherStart ? null : { togetherStart: ts }));
  if (!ok) return;
  try { await saveCloudBackup('join'); } catch (e) { console.warn('加入前備份失敗', e); }
  const c = S.couple, bSeries = D.BIRTHDAY_SERIES;
  for (const name of COLS) {
    if (name === 'pool') continue;
    for (const d of list(name)) {
      if (name === 'cards' && d.series === bSeries) continue;   // 生日系列都留著（11/22 晽晽說她票夾裡的也要留）
      await col(name).remove(d.id);
    }
  }
  await S.store.updateCouple(S.cid, {
    dex: {}, scenes: {}, dexReset: 2, pet: { name: (c.pet && c.pet.name) || '小小黑' }, drops: {}, tickets: {}, cans: {}, canDay: {},
    moods: {}, moodHist: {}, spins: {}, annivLetters: {}, opened: {}, taskOverride: {}, taskSwapReq: null, battleSwaps: {},
    'fund.rewarded': false, fundsDone: 0, sched: {}, cardMemo: {},
  });
  // 測試期間補的點數可能剛好晚一步寫進來，再掃一次
  for (const d of list('points')) await col('points').remove(d.id);
  // 新手禮：兩個人各 40 點（可以扭兩次）
  for (const u of c.members || []) await addPoints(u, 40, '新手禮：歡迎來到遊樂園');
  // 這台手機記得的成就、紙條、提醒也清掉
  localFreshStart(ts, true);
  toast('歡迎加入！遊樂園從今天開始重新記錄，兩個人各送 40 點新手禮');
  setTimeout(() => { if (typeof holidayDrops === 'function') holidayDrops(); }, 2500);
}

// 鯊魚被晽晽貓貓吃掉，再長出來
async function sharkEaten(el) {
  const r = el.getBoundingClientRect();
  const cat = walker('orange', 'eater');
  cat.style.animation = 'none'; cat.style.left = '-100px'; cat.style.bottom = el.style.bottom || getComputedStyle(el).bottom;
  document.body.appendChild(cat);
  await sleep(30);
  cat.style.transition = 'left .55s ease-in'; cat.style.left = (r.left + r.width / 2 - 40) + 'px';
  await sleep(560);
  sfx('pop'); vibrate(30);
  el.classList.add('eaten');
  document.querySelectorAll('.fr-bubble.solo').forEach((b) => b.remove());   // 先收掉「關機了」那句，不要疊在一起
  const b1 = bubble('晽晽貓貓一口把鯊魚吃掉了', r.left + r.width / 2, r.top, 'solo narr');
  await sleep(1300);
  b1.remove();
  cat.style.transition = 'left .8s ease-in'; cat.style.left = (innerWidth + 120) + 'px';
  setTimeout(() => cat.remove(), 900);
  await sleep(700);
  // 長出來：先慢慢長一半「長…長…長…」，再點一下才一口氣長完；沒點的話自己慢慢長完
  el.classList.remove('eaten', 'off'); el.innerHTML = withHat('shark', sharkArt());
  const L = SPECIAL_LINES.shark, ix = (t) => L.findIndex((x) => x.t === t);
  const say = (t, ms) => { const rr = el.getBoundingClientRect(); const b = bubble(t, rr.left + rr.width / 2, rr.top, 'solo'); dexNote('shark', 's' + ix(t)); if (ms) setTimeout(() => b.remove(), ms); return b; };
  const grow = async (steps) => { for (const sc of steps) { el.style.setProperty('--grow', sc); el.classList.add('regrow'); sfx('pop'); await sleep(520); } };
  await grow([.2, .35, .5]);
  const slow = say('鯊魚：長…長…長…');
  const tapped = await new Promise((res) => { const t = setTimeout(() => res(false), 12000); el.onclick = () => { clearTimeout(t); res(true); }; });
  el.onclick = null; slow.remove();
  if (tapped) { const b = say('鯊魚：長長長長長長長 呼～長完了'); await grow([1]); await sleep(1400); b.remove(); }
  else { const b = say('鯊魚：長長長 長長長 長長長長 長完了～'); await grow([.7, .85, 1]); await sleep(900); b.remove(); }
  if (Math.random() < .5) { const b = say('鯊魚：人類～我被吃掉了喔？'); await sleep(2200); b.remove(); }
  el.classList.remove('regrow'); el.classList.add('wake');
  setTimeout(() => el.remove(), 2200);
}
window.__eat = () => { catStroll('shark'); setTimeout(() => { const e = document.querySelector('.fr-shark'); if (e) { e.click(); setTimeout(() => sharkEaten(e), 1500); } }, 2500); };
