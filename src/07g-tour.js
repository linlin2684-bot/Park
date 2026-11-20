// ============================================================
//  第一次打開的導覽：小小黑帶路，介紹五個分頁
// ============================================================
const TOUR = [
  { tab: 'home', pose: 'wave', t: '嗨，我是小小黑！', s: '這裡是你們兩個人的遊樂園。首頁有在一起的天數和今天的心情；右上角的愛心按一下，對方就會知道你在想他。我住在首頁，常來摸摸我，我會慢慢長大喔。' },
  { tab: 'wallet', pose: 'box', t: '票夾', s: '收到的票券都放在這裡。新卡要先刮開，想用的時候長按就能兌換，對方會馬上收到。收藏冊裡是你們一張一張集起來的卡。' },
  { tab: 'play', pose: 'yarn', t: '遊樂區', s: '扭蛋機用點數或扭蛋券轉。完成每週任務、對戰挑戰、回答問題都能拿點數；蓋章集滿也會送扭蛋券。' },
  { tab: 'travel', pose: 'suitcase', t: '約會', s: '排好的約會可以加進手機行事曆。沒想法就去點子罐搖一個；想看的、想吃的、想去的都先記進清單。' },
  { tab: 'memory', pose: 'loaf', t: '回憶', s: '時間軸、相簿、紙條盒和季問答都在這裡。很多東西要一起玩才會出現，慢慢發現吧！' },
];
function tourNeeded() {
  return S.couple && (S.couple.members || []).length >= 2 && !localStorage.getItem(`park-tour-${me()}`) && !document.querySelector('.anniv-intro, .tour, .story');
}
function startTour(force) {
  if (!force && !tourNeeded()) return;
  localStorage.setItem(`park-tour-${me()}`, '1');
  let k = 0;
  const el = document.createElement('div');
  el.className = 'tour';
  document.body.appendChild(el);
  const draw = () => {
    const st = TOUR[k];
    S.tab = st.tab; render();
    setTimeout(() => {
      const nb = document.querySelector(`.nav [data-tab="${st.tab}"]`);
      const r = nb ? nb.getBoundingClientRect() : null;
      el.innerHTML = `<div class="tour-dim"></div>
        ${r ? `<div class="tour-spot" style="left:${r.left + r.width / 2 - 34}px;top:${r.top + r.height / 2 - 34}px"></div>` : ''}
        <div class="tour-box">
          <div class="tour-cat">${catPose(st.pose, typeof petState === 'function' ? petState().wear : '')}</div>
          <div class="tour-bubble"><b>${st.t}</b><p>${st.s}</p>
            <div class="tour-foot"><span class="tour-dots">${TOUR.map((_, i) => `<i class="${i === k ? 'on' : ''}"></i>`).join('')}</span>
              <span>${k ? '<button class="link" data-tour="-1">上一步</button>' : '<button class="link" data-tour="skip">略過</button>'}<button class="btn sm" data-tour="1">${k === TOUR.length - 1 ? '開始玩！' : '下一步'}</button></span></div></div>
        </div>`;
      $$('[data-tour]', el).forEach((b) => b.onclick = () => {
        const v = b.dataset.tour;
        if (v === 'skip' || (v === '1' && k === TOUR.length - 1)) { el.remove(); S.tab = 'home'; render(); if (v === '1') { confetti(60); sfx('chime'); } setTimeout(bdayReveal, 900); return; }
        k += +v; draw();
      });
    }, 120);
  };
  draw();
}
ACT.tourReplay = () => { closeAll(); startTour(true); };

// 導覽結束之後，才把生日卡送到他面前（週年動畫 → 導覽 → 生日卡）
function bdayReveal() {
  const key = `park-bday-reveal-${S.cid}-${me()}`;
  if (localStorage.getItem(key) || document.querySelector('.anniv-intro, .tour, .story, .bday-reveal, .modal-back')) return;
  const mine = list('cards').filter((c) => c.owner === me() && c.series === D.BIRTHDAY_SERIES);
  if (!mine.length) return;
  localStorage.setItem(key, '1');
  const m = openModal(`<div class="bday-reveal center">
      <div class="br-emb">${typeof bookMotif === 'function' ? `<svg viewBox="-60 -60 120 120" class="emb-C" width="120" height="120"><circle r="56" class="e-bg e-ink-s" stroke-width="1.4"/><circle r="49" class="e-acc-s" stroke-width=".8" fill="none" stroke-dasharray="2 3"/>${bookMotif('candle')}</svg>` : ''}</div>
      <h3 style="justify-content:center;margin:6px 0 2px">${esc(D.BIRTHDAY_SERIES)}</h3>
      <p class="small muted" style="margin:0 0 12px">${esc(nick(S.couple.creator))} 為你準備了 ${mine.length} 張生日卡，放在你的票夾裡了</p>
      <button class="btn block" id="br-go">去看看</button>
      <button class="link center" id="br-later" style="display:block;margin:8px auto 0">等一下再看</button>
    </div>`, { center: true });
  confetti(80); sfx('chime');
  $('#br-go', m).onclick = () => { closeModal(m); S.tab = 'wallet'; render(); };
  $('#br-later', m).onclick = () => closeModal(m);
}
