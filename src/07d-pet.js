// ============================================================
//  一起養黑貓：兩人的互動會餵牠，牠會長大、換表情、解鎖小配件
// ============================================================

const PET_STAGES = [
  { xp: 0, name: '小奶貓', scale: .72 },
  // 每個階段大約半年（兩個人認真養，一天大概三四十點）
  { xp: 6000, name: '少年貓', scale: .86 },
  { xp: 12000, name: '大貓咪', scale: 1 },
  { xp: 18000, name: '貓老大', scale: 1.06 },
];
const PET_ACC = [
  { id: 'bow', name: '粉紅蝴蝶結', xp: 200 },
  { id: 'bell', name: '鈴鐺項圈', xp: 1000 },
  { id: 'scarf', name: '小圍巾', xp: 2500 },
  { id: 'flower', name: '小花', xp: 4500 },
  { id: 'crown', name: '小皇冠', xp: 6000 },
  { id: 'santa', name: '聖誕帽', xp: 0, month: 12 },
  // 週年紀念日（兩人都加入後）自動送的見面禮，會直接幫牠戴上
  { id: 'ribbon', name: '週年紅緞帶', anniv: true },
  // 只會在扭蛋時額外掉落
  { id: 'cape', name: '小披風', gacha: true },
  { id: 'glasses', name: '圓眼鏡', gacha: true },
  { id: 'bowtie', name: '紳士領結', gacha: true },
  { id: 'beret', name: '貝雷帽', gacha: true },
  { id: 'starclip', name: '星星髮夾', gacha: true },
  { id: 'heartbag', name: '愛心小包', gacha: true },
];
const PET_GACHA_RATE = 0.03;
// 扭卡片時小機率額外掉一個還沒有的配件
async function petGachaBonus() {
  if (Math.random() > PET_GACHA_RATE) return null;
  const owned = (S.couple.pet || {}).owned || [];
  const left = PET_ACC.filter((a) => a.gacha && !owned.includes(a.id));
  if (!left.length) return null;
  const a = left[Math.floor(Math.random() * left.length)];
  await S.store.coupleTx(S.cid, (c) => ({ 'pet.owned': [...new Set([...(((c.pet || {}).owned) || []), a.id])] }));
  return a;
}
const PET_DEFAULT_NAME = '小小黑';

function petState() {
  const pet = S.couple?.pet || {};
  const xp = pet.xp || 0;
  let st = 0; PET_STAGES.forEach((s, i) => { if (xp >= s.xp) st = i; });
  const next = PET_STAGES[st + 1];
  const last = Math.max(0, ...Object.values(pet.last || {}));
  const hrs = last ? (now() - last) / 3600000 : 999;
  const mood = !last ? 'ok' : hrs < 12 ? 'happy' : hrs < 36 ? 'ok' : 'miss';
  const month = new Date().getMonth() + 1;
  const owned = pet.owned || [];
  const unlocked = PET_ACC.filter((a) => (a.gacha || a.anniv) ? owned.includes(a.id) : a.month ? a.month === month : xp >= a.xp);
  // 長大之後可以自由切換成以前的型態
  const show = pet.form != null && pet.form <= st ? pet.form : st;
  const look = pet.look && typeof lookUnlocked === 'function' && lookUnlocked().has(pet.look) ? pet.look : '';
  return { pet, xp, st, show, look, stage: PET_STAGES[st], next, mood, hrs, unlocked, name: pet.name || PET_DEFAULT_NAME, wear: pet.wear || '' };
}

// 互動加經驗（小事都會加一點；每人每天有上限，避免狂刷）
async function petXP(n, why = '') {
  // 等兩個人都加入才開始養
  if (!S.couple || (S.couple.members || []).length < 2) return;
  const k = `park-petxp-${dkey()}-${me()}`;
  const used = +(localStorage.getItem(k) || 0);
  const add = Math.max(0, Math.min(n, 30 - used));
  localStorage.setItem(k, used + add);
  const before = petState().st;
  await S.store.coupleTx(S.cid, (c) => ({ 'pet.xp': ((c.pet || {}).xp || 0) + add, [`pet.last.${me()}`]: now() }));
  const after = petState().st;
  if (after > before) setTimeout(() => { toast(`${petState().name} 長大了！可以變成${PET_STAGES[after].name}了，到牠的房間切換型態`); confetti(80, ['#2b2633', '#ffd970', '#c98aa0', '#fff']); }, 400);
}

function petAccArt(wear) {
  const I = CAT_INK;
  return {
    bow: `<g transform="translate(62 15) rotate(18)"><path d="M0 0 L-7 -5 L-7 5 Z M0 0 L7 -5 L7 5 Z" fill="#ff8fab" stroke="#c94f72" stroke-width=".8" stroke-linejoin="round"/><circle r="2" fill="#ff8fab" stroke="#c94f72" stroke-width=".8"/></g>`,
    bell: `<path d="M39 52 Q50 57 61 52" fill="none" stroke="#e2445f" stroke-width="3" stroke-linecap="round"/><circle cx="50" cy="57" r="3.2" fill="#ffd45c" stroke="#b8862f" stroke-width=".8"/><path d="M48.5 57.5 H51.5" stroke="#b8862f" stroke-width=".7"/>`,
    scarf: `<path d="M37 51 Q50 58 63 51 L63 55 Q50 62 37 55 Z" fill="#7cc7a8" stroke="#3b8a6c" stroke-width=".8"/><path d="M56 56 L59 68 L64 66 L60 55" fill="#7cc7a8" stroke="#3b8a6c" stroke-width=".8" stroke-linejoin="round"/><path d="M40 53 L60 53" stroke="#fff" stroke-width=".8" stroke-dasharray="2 2" opacity=".7"/>`,
    flower: `<g transform="translate(36 17)">${[0, 72, 144, 216, 288].map((a) => `<ellipse rx="2.6" ry="4" transform="rotate(${a}) translate(0 -3.4)" fill="#fff" stroke="#e7b3c4" stroke-width=".6"/>`).join('')}<circle r="2.2" fill="#ffd45c"/></g>`,
    crown: `<path d="M40 16 L42 7 L46 12 L50 5 L54 12 L58 7 L60 16 Z" fill="#ffd45c" stroke="#b8862f" stroke-width="1" stroke-linejoin="round"/><circle cx="50" cy="12.5" r="1.4" fill="#e2445f"/>`,
    ribbon: `<g transform="translate(0 -6)"><path d="M37 51.5 Q50 57 63 51.5" fill="none" stroke="#c8202f" stroke-width="2.4" stroke-linecap="round"/>
      <path d="M47.5 56 L42.5 70 L46 68 L48.5 71 L50 57 Z M52.5 56 L57.5 70 L54 68 L51.5 71 L50 57 Z" fill="#b51a28"/>
      <path d="M50 54.5 C46 49.5 39 49 39 54.5 C39 60 46 59.5 50 54.5 Z M50 54.5 C54 49.5 61 49 61 54.5 C61 60 54 59.5 50 54.5 Z" fill="#d42433"/>
      <rect x="47.6" y="51.6" width="4.8" height="5.8" rx="1.6" fill="#b51a28"/></g>`,
    cape: `<path d="M38 50 Q50 54 62 50 L70 80 Q50 86 30 80 Z" fill="#c42e52" opacity=".95"/><path d="M38 50 Q50 54 62 50" fill="none" stroke="#e9c77b" stroke-width="1.6"/><circle cx="50" cy="52.5" r="1.8" fill="#e9c77b"/>`,
    glasses: `<circle cx="43" cy="32.5" r="5.6" fill="none" stroke="#e9c77b" stroke-width="1.3"/><circle cx="57" cy="32.5" r="5.6" fill="none" stroke="#e9c77b" stroke-width="1.3"/><path d="M48.6 32 Q50 30.8 51.4 32" fill="none" stroke="#e9c77b" stroke-width="1.2"/>`,
    bowtie: `<path d="M50 52 L42 48 L42 56 Z M50 52 L58 48 L58 56 Z" fill="#3b5ba5" stroke="#26407e" stroke-width=".8" stroke-linejoin="round"/><circle cx="50" cy="52" r="2" fill="#26407e"/>`,
    beret: `<path d="M34 21 Q36 10 52 10 Q66 11 66 20 Q58 17 48 18 Q40 19 34 21 Z" fill="#c45a6a"/><path d="M52 10 l1 -3" stroke="#c45a6a" stroke-width="1.6" stroke-linecap="round"/>`,
    starclip: `<path d="M62 18 l1.6 3.4 3.7 .5 -2.7 2.6 .7 3.7 -3.3 -1.8 -3.3 1.8 .7 -3.7 -2.7 -2.6 3.7 -.5 Z" fill="#ffd45c" stroke="#b8862f" stroke-width=".6" stroke-linejoin="round"/>`,
    heartbag: `<path d="M62 54 Q66 62 64 70" fill="none" stroke="#7a5a3a" stroke-width="1"/><path d="M64 72 C60 68 58 66 60 63.5 C61.5 62 63 62.6 64 64 C65 62.6 66.5 62 68 63.5 C70 66 68 68 64 72 Z" fill="#ff8fab" stroke="#c94f72" stroke-width=".7"/>`,
    santa: `<path d="M35 20 Q44 4 60 9 Q66 12 70 24 L36 22 Z" fill="#e2445f" stroke="#9e2a3c" stroke-width=".8" stroke-linejoin="round"/><path d="M34 21 Q50 17 66 22 L66 26 Q50 21 34 25 Z" fill="#fff"/><circle cx="71" cy="25" r="3" fill="#fff"/>`,
  }[wear] || '';
}
// 每個階段身邊的小物：奶瓶 → 毛線球 → 貓抓板 → 王座墊
const PET_PROPS = [
  `<g transform="translate(15 70) rotate(-8)"><rect x="-5" y="-1" width="10" height="18" rx="3.5" fill="#f4f1ee" stroke="#c9bfc6" stroke-width=".8"/><rect x="-5" y="7" width="10" height="10" rx="3" fill="#fff8e6"/><path d="M-4.5 6.5 H4.5" stroke="#e6d9b8" stroke-width=".8"/><rect x="-5.5" y="-4" width="11" height="4" rx="1.5" fill="#9fc6e8"/><path d="M-2.5 -4 Q-2.5 -9.5 0 -10 Q2.5 -9.5 2.5 -4 Z" fill="#f2b6c6"/><path d="M-3 4 H-1 M-3 9 H-1 M-3 13 H-1" stroke="#c9bfc6" stroke-width=".6"/></g>`,
  `<g transform="translate(15 81)"><path d="M6 1 Q14 4 22 2" fill="none" stroke="#e98aa6" stroke-width=".9" stroke-linecap="round"/><circle r="7.5" fill="#e98aa6"/><path d="M-6 -3 Q0 -7 6 -3 M-7 1 Q0 -3 7 1 M-6 5 Q0 1 6 5 M-2 -7 Q-6 0 -2 7" fill="none" stroke="#c9607f" stroke-width=".8"/></g>`,
  `<g><rect x="5" y="86" width="20" height="3" rx="1.2" fill="#b8916a"/><rect x="11" y="50" width="8" height="37" fill="#d9b88f"/><path d="M11 54 L19 57 M11 60 L19 63 M11 66 L19 69 M11 72 L19 75 M11 78 L19 81" stroke="#b08a60" stroke-width="1.1"/><rect x="7" y="46" width="16" height="5" rx="2" fill="#8f6aa0"/><path d="M19 52 Q23 56 22 60" fill="none" stroke="#f5c843" stroke-width=".9"/><circle cx="22" cy="61" r="1.8" fill="#f5c843"/></g>`,
  `<g><path d="M18 86 Q18 78 50 78 Q82 78 82 86 Q82 91 50 91 Q18 91 18 86 Z" fill="#b8344a"/><path d="M22 84 Q50 80 78 84" fill="none" stroke="#e8b04b" stroke-width="1"/><circle cx="19" cy="88" r="1.6" fill="#e8b04b"/><circle cx="81" cy="88" r="1.6" fill="#e8b04b"/><path d="M19 89.5 L18 92 M81 89.5 L82 92" stroke="#e8b04b" stroke-width="1"/></g>`,
];
function petSVG(st, mood, wear, { blink = true, look = '' } = {}) {
  const I = CAT_INK;
  const eyes = mood === 'happy'
    ? `<path d="M39.5 33 Q43 29 46.5 33 M53.5 33 Q57 29 60.5 33" fill="none" stroke="#ffd970" stroke-width="2.2" stroke-linecap="round"/>`
    : `<g class="${blink ? 'pet-eyes' : ''}"><ellipse cx="43" cy="32.5" rx="3.6" ry="4.2" fill="#ffd970"/><ellipse cx="57" cy="32.5" rx="3.6" ry="4.2" fill="#ffd970"/>
       <ellipse cx="43" cy="33" rx="1.2" ry="${mood === 'miss' ? 2 : 3}" fill="${I}"/><ellipse cx="57" cy="33" rx="1.2" ry="${mood === 'miss' ? 2 : 3}" fill="${I}"/>
       <circle cx="44" cy="31" r=".9" fill="#fff"/><circle cx="58" cy="31" r=".9" fill="#fff"/></g>
       ${mood === 'miss' ? `<path d="M38 29 L46 27 M62 29 L54 27" stroke="#efe6f2" stroke-width="1.1" stroke-linecap="round"/><path d="M61 38 Q62 41 61 43" stroke="#9fd0ff" stroke-width="1.6" stroke-linecap="round"/>` : ''}`;
  const mouth = mood === 'miss'
    ? `<path d="M47 42.5 Q50 40.5 53 42.5" fill="none" stroke="#efe6f2" stroke-width="1" stroke-linecap="round"/>`
    : `<path d="M50 40 Q48 42.5 46.5 41.5 M50 40 Q52 42.5 53.5 41.5" fill="none" stroke="#efe6f2" stroke-width="1" stroke-linecap="round"/>${mood === 'happy' ? '<path d="M48.6 41.6 Q50 44.5 51.4 41.6 Z" fill="#ff9fb4"/>' : ''}`;
  const acc = petAccArt(wear);
  const s = PET_STAGES[st].scale;
  return `<svg viewBox="0 0 100 92" class="pet-svg pet-${mood}" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="50" cy="88" rx="${26 * s}" ry="3.5" fill="currentColor" opacity=".1"/>
    ${PET_PROPS[st] || ''}
    <g transform="translate(50 88) scale(${s}) translate(-50 -88)">
      <g class="pet-body">
        <path class="pet-tail" d="M66 80 Q86 80 84 64 Q83 56 76 58" fill="none" stroke="${I}" stroke-width="5" stroke-linecap="round"/>
        <path d="M34 86 Q29 62 39 50 Q50 43 61 50 Q71 62 66 86 Z" fill="${I}"/>
        <ellipse cx="42" cy="86" rx="6" ry="3" fill="${I}"/><ellipse cx="58" cy="86" rx="6" ry="3" fill="${I}"/>
        <g transform="translate(0 4)">
          <path d="M33 29 L35 12 L45 22 Z M67 29 L65 12 L55 22 Z" fill="${I}" stroke="${I}" stroke-width="2" stroke-linejoin="round"/>
          <path d="M36.5 23 L37 15.5 L42 20.5 Z M63.5 23 L63 15.5 L58 20.5 Z" fill="#c98aa0"/>
          <ellipse cx="50" cy="34" rx="18" ry="15" fill="${I}"/>
          ${eyes}
          <path d="M48.5 38.5 L51.5 38.5 L50 40 Z" fill="#ff9fb4"/>${mouth}
          <path d="M31 36 L39 37 M31 40 L39 39 M69 36 L61 37 M69 40 L61 39" stroke="#efe6f2" stroke-width=".8" stroke-linecap="round"/>
          <ellipse cx="39.5" cy="40" rx="2.4" ry="1.3" fill="#ff9fb4" opacity="${mood === 'happy' ? .8 : .45}"/><ellipse cx="60.5" cy="40" rx="2.4" ry="1.3" fill="#ff9fb4" opacity="${mood === 'happy' ? .8 : .45}"/>
          ${look === 'ghost' ? '' : acc}
        </g>
        ${look ? lookArt(look) : ''}
      </g>
    </g>
  </svg>`;
}

// 依時間：晚上 10 點到早上 6 點睡覺、早上 6～9 點伸懶腰，其他時間坐著（可戴配件）
function petTimePose() { const h = new Date().getHours(); return h >= 22 || h < 6 ? 'sleep' : h < 9 ? 'stretch' : ''; }
function petArt(P, big) {
  const tp = P.look ? '' : petTimePose();
  if (tp) return `<div class="pet-pose" data-pose="${tp}">${catPose(tp, P.wear)}</div>`;
  return petSVG(P.show, P.mood, P.wear, { look: P.look });
}
const PET_TIME_TEXT = { sleep: '睡得正香，小聲一點', stretch: '剛睡醒，正在伸懶腰' };
const PET_MOOD_TEXT = { happy: '心情超好，尾巴翹得高高的', ok: '在窩裡等你們來玩', miss: '好久沒人理牠了，有點想你們' };

function petHomeCard() {
  const P = petState();
  const pct = P.next ? Math.round((P.xp - P.stage.xp) / (P.next.xp - P.stage.xp) * 100) : 100;
  const dv = dutyVisitor();
  return `<div class="card pet-card ${dv ? 'has-visitor' : ''}" data-act="petOpen">
    <div class="pet-room"><div class="pet-stage">${petArt(P)}</div>${dv || dutySolo()}</div>
    <div class="grow">
      <div class="pet-name">${esc(P.name)} <span class="chip">${PET_STAGES[P.show].name}</span></div>
      <div class="small muted ${dv ? 'duty-say' : ''}">${dv ? dutyText() : PET_TIME_TEXT[petTimePose()] || PET_MOOD_TEXT[P.mood]}</div>
      <div class="small muted">${P.next ? (pct >= 80 ? '好像快要長大了' : '正在慢慢長大') : '已經長成最大隻了'}</div>
    </div>
    <button class="btn sm pet-pet" data-act="petPat">摸摸</button>
  </div>`;
}

ACT.petPat = async (el, e) => {
  e && e.stopPropagation();
  const k = `park-petpat-${dkey()}-${me()}`;
  const card = el.closest('.pet-card, .modal');
  const holder = card && card.querySelector('.pet-stage, .pet-big');
  if (holder) { const old = holder.innerHTML; holder.innerHTML = catPose('belly', petState().wear); holder.classList.add('pet-flip'); setTimeout(() => { holder.innerHTML = old; holder.classList.remove('pet-flip'); }, 1400); }
  const r = el.getBoundingClientRect(); floaty(r.left + r.width / 2, r.top, ['#2b2633', '#ff9db4', '#ffd970']);
  sfx('heart');
  if (localStorage.getItem(k)) return toast(`${petState().name} 呼嚕呼嚕～（今天摸過了，明天再來）`);
  localStorage.setItem(k, '1');
  await petXP(3, 'pat');
  await S.store.coupleTx(S.cid, (c) => ({ 'pet.pats': (((c.pet || {}).pats) || 0) + 1 }));
  lookNightPat();
  toast(`${petState().name} 很開心！經驗 +3`);
};

ACT.petOpen = () => {
  const P = petState();
  const m = openModal(`${mhead(`<i data-ic="heart"></i> ${esc(P.name)}`)}
    <div class="pet-room big ${dutyVisitor() ? 'has-visitor' : ''}"><div class="pet-big">${petArt(P, true)}</div>${dutyVisitor() || dutySolo()}</div>
    ${dutyVisitor() ? `<p class="center small duty-say" style="margin:0 0 4px;color:var(--accent)">${dutyText()}</p>` : ''}
    <p class="center muted" style="margin:0 0 4px">${PET_STAGES[P.show].name}・${PET_TIME_TEXT[petTimePose()] || PET_MOOD_TEXT[P.mood]}</p>
    <div class="btn-row" style="justify-content:center;margin-bottom:12px">
      <button class="btn sm" data-act="petPat">摸摸</button>
      <button class="btn sm ghost" id="pt-feed">餵罐罐 <small>${canState().daily ? '今天的' : `剩 ${canState().stock} 個`}</small></button>
    </div>
    <h3 class="pet-h">長大</h3>
    <div class="pet-forms">${PET_STAGES.map((s, i) => `<button data-form="${i}" class="${P.show === i ? 'on' : ''} ${i > P.st ? 'lk' : ''}" ${i > P.st ? 'disabled' : ''}>${i > P.st ? `<span class="q-emb">${avQuestionSVG()}</span>` : `${petSVG(i, 'ok', '', { blink: false })}<span>${s.name}</span>`}</button>`).join('')}</div>
    <h3 class="pet-h">裝扮</h3>
    <div class="pet-forms looks">${(() => { const U = lookUnlocked(); return `<button data-look="" class="${!P.look ? 'on' : ''}"><span class="none">不換</span></button>` + PET_LOOKS.map((l) => U.has(l.id) ? `<button data-look="${l.id}" class="${P.look === l.id ? 'on' : ''}">${petSVG(P.show, 'ok', '', { blink: false, look: l.id })}<span>${l.name}</span></button>` : `<button class="lk" disabled><span class="q-emb">${avQuestionSVG()}</span><small>${esc(l.hint)}</small></button>`).join(''); })()}</div>
    <h3 class="pet-h">配件</h3>
    <div class="pet-acc">
      <button data-w="" class="${!P.wear ? 'on' : ''}"><span>不戴</span></button>
      ${PET_ACC.map((a) => { const ok = P.unlocked.some((x) => x.id === a.id); return ok
        ? `<button data-w="${a.id}" class="${P.wear === a.id ? 'on' : ''}"><span class="pet-thumb">${petSVG(2, 'ok', a.id, { blink: false })}</span>${a.name}</button>`
        : `<button class="locked sil" disabled><span class="pet-thumb">${petSVG(2, 'ok', a.id, { blink: false })}</span>？？？<small>${a.gacha ? '扭蛋時偶爾會掉' : a.anniv ? '某個特別的日子' : a.month ? '某個冬天的節日' : '再長大一點'}</small></button>`; }).join('')}
    </div>`);
  $$('.pet-forms:not(.looks) button[data-form]', m).forEach((b) => b.onclick = async () => {
    await S.store.updateCouple(S.cid, { 'pet.form': +b.dataset.form });
    closeModal(m); ACT.petOpen();
  });
  $$('.pet-forms.looks button[data-look]', m).forEach((b) => b.onclick = async () => {
    await S.store.updateCouple(S.cid, { 'pet.look': b.dataset.look });
    closeModal(m); ACT.petOpen();
  });
  $$('.pet-acc button', m).forEach((b) => b.onclick = async () => {
    await S.store.updateCouple(S.cid, { 'pet.wear': b.dataset.w });
    closeModal(m); ACT.petOpen();
  });
  $('#pt-feed', m).onclick = async () => {
    if (!(await feedCan())) return toast('今天的罐罐吃完了。回答問題、做任務，或等小動物送來');
    await petXP(8, 'feed');
    toast(`${P.name} 吃得好開心！經驗 +8`); closeModal(m); ACT.petOpen();
  };
};
