// ============================================================
//  圖騰系統：依卡名產生和風幾何底紋＋中央徽章＋卡框（不用 emoji）
// ============================================================

let embSeq = 0;
const EMB_KINDS = ['seigaiha', 'asanoha', 'shippo', 'lattice', 'dots'];
const EMB_NAMES = { seigaiha: '青海波', asanoha: '麻葉', shippo: '七寶', lattice: '菱格', dots: '星點' };

// 每張卡的代表字（徽章中間那個字）
const EMB_MARKS = {
  打鼻子: '鼻', 吹頭髮服務: '髮', 做家事券: '家', 洗碗券: '洗', 背我走10步: '背', 抱我轉10圈: '旋',
  一日司機: '駕', 換我煮一道菜: '廚', 挑禮物: '禮', 吃蛋糕: '糕',
  睡前加碼: '夜', 角色扮演: '演', 今天我主動: '主', 免死金牌: '赦', 你教我拉一個音: '音',
  拉生日快樂給自己: '琴', 唱生日快樂給你聽: '歌', '拍一張25歲的你和我的合照': '照',
  '25歲生日感言': '言', '中獎了！': '獎', 以後每個生日: '伴', 謝謝你: '謝',
  早餐送到床邊: '餐', 按摩15分鐘: '揉', 今天不滑手機陪你: '陪', 晚餐你指定: '膳', 撒嬌無限一小時: '嬌',
  電影你選: '影', 宵夜外送員: '宵', 約會全包: '約', 說好日: '允',
  親親20下: '吻', 今晚你決定: '決', 指定穿搭: '衣', 一起泡澡: '浴', 慢慢來的夜晚: '緩', 耳邊悄悄話: '耳',
  一個你想試的新玩法: '新', 全聽你的: '聽', 主導權轉移: '權',
  壽星女王券: '后', 壽星國王券: '王', 週年紀念券: '年', 情人節限定券: '情', 聖誕交換券: '聖', 新年第一張券: '春', 旅行出發券: '旅',
};
const EMB_SKIP = new Set(Array.from('一二三四五六七八九十的我你他她給換拍唱拉今幫陪讓再來去把被和跟'));
function embChar(title) {
  if (EMB_MARKS[title]) return EMB_MARKS[title];
  const cs = Array.from(title).filter((x) => /[\u4e00-\u9fff]/.test(x));
  return cs.find((x) => !EMB_SKIP.has(x)) || cs[0] || Array.from(title.replace(/\s/g, ''))[0] || '?';
}

function embPalette(c) { if (c.pal) return c.pal; const fk = festKey(c); return fk ? 'F-' + fk : c.kind === 'collect' ? 'C' : (c.rarity || 'N'); }
function embSeed(c, hide) {
  const title = hide ? '神秘盲盒' : (c.title || '?');
  const h = hash(title);
  const ch = hide ? '?' : (c.mark || embChar(title));
  // 送卡的人可以自己選外框（shape）和底紋（pat），沒選就依卡名自動挑
  return { h, ch, kind: hide ? 'lattice' : (c.pat && EMB_KINDS.includes(c.pat) ? c.pat : EMB_KINDS[h % EMB_KINDS.length]), shape: c.frame != null && c.frame >= 0 ? c.frame % 4 : (h >>> 4) % 4, no: (h % 89) + 10 };
}

// 底紋（stroke 用強調色）
function embPattern(kind, id, s = 1) {
  const u = (n) => n * s;
  const P = (w, h, body) => `<pattern id="${id}" width="${u(w)}" height="${u(h)}" patternUnits="userSpaceOnUse">${body}</pattern>`;
  if (kind === 'seigaiha') {
    const wave = (cx, cy) => [10, 7, 4].map((r) => `<circle cx="${u(cx)}" cy="${u(cy)}" r="${u(r)}" class="e-bg e-acc-s" stroke-width="${0.8 * s}"/>`).join('');
    return P(20, 10, wave(0, 5) + wave(20, 5) + wave(10, 10) + wave(0, 15) + wave(20, 15));
  }
  if (kind === 'asanoha') {
    const c = u(12), e = u(24);
    const pts = [[0, 0], [12, 0], [24, 0], [24, 12], [24, 24], [12, 24], [0, 24], [0, 12]];
    return P(24, 24, pts.map(([x, y]) => `<line x1="${c}" y1="${c}" x2="${u(x)}" y2="${u(y)}" class="e-acc-s" stroke-width="${0.6 * s}"/>`).join('')
      + `<path d="M${c} 0 L${e} ${c} L${c} ${e} L0 ${c} Z" class="e-acc-s" stroke-width="${0.6 * s}"/>`);
  }
  if (kind === 'shippo') {
    return P(20, 20, [[0, 0], [20, 0], [0, 20], [20, 20], [10, 10]].map(([x, y]) => `<circle cx="${u(x)}" cy="${u(y)}" r="${u(10)}" class="e-acc-s" stroke-width="${0.7 * s}"/>`).join('')
      + `<circle cx="${u(10)}" cy="${u(0)}" r="${u(1)}" class="e-acc-f"/><circle cx="${u(0)}" cy="${u(10)}" r="${u(1)}" class="e-acc-f"/>`);
  }
  if (kind === 'lattice') {
    return P(16, 16, `<path d="M0 ${u(8)} L${u(8)} 0 L${u(16)} ${u(8)} L${u(8)} ${u(16)} Z" class="e-acc-s" stroke-width="${0.7 * s}"/><circle cx="${u(8)}" cy="${u(8)}" r="${u(1.1)}" class="e-acc-f"/>`);
  }
  return P(10, 10, `<circle cx="${u(5)}" cy="${u(5)}" r="${u(0.9)}" class="e-acc-f"/><circle cx="0" cy="0" r="${u(0.5)}" class="e-acc-f"/>`);
}

// 中央徽章
function embMedallion(cx, cy, seed, r = 50) {
  const k = r / 50;
  const pt = (a, rr) => [cx + rr * Math.sin(a), cy - rr * Math.cos(a)];
  let s = '';
  if (seed.shape === 0) {
    for (let i = 0; i < 32; i++) { const a = i / 32 * Math.PI * 2, [x1, y1] = pt(a, 53 * k), [x2, y2] = pt(a, (i % 4 ? 56 : 59) * k); s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="e-ink-s" stroke-width="${0.9 * k}"/>`; }
    s += `<circle cx="${cx}" cy="${cy}" r="${50 * k}" class="e-bg e-ink-s" stroke-width="${1.4 * k}"/><circle cx="${cx}" cy="${cy}" r="${44 * k}" class="e-acc-s" stroke-width="${1 * k}"/>`;
    for (let i = 0; i < 4; i++) { const [x, y] = pt(Math.PI / 4 + i * Math.PI / 2, 50 * k); s += `<rect x="${x - 3 * k}" y="${y - 3 * k}" width="${6 * k}" height="${6 * k}" transform="rotate(45 ${x} ${y})" class="e-ink-f"/>`; }
  } else if (seed.shape === 1) {
    const oct = (rr) => Array.from({ length: 8 }, (_, i) => pt(Math.PI / 8 + i * Math.PI / 4, rr).join(',')).join(' ');
    s += `<polygon points="${oct(56 * k)}" class="e-bg e-ink-s" stroke-width="${1.4 * k}"/><polygon points="${oct(51 * k)}" class="e-acc-s" stroke-width="${0.8 * k}"/>`;
    s += `<circle cx="${cx}" cy="${cy}" r="${42 * k}" class="e-ink-s" stroke-width="${0.8 * k}"/>`;
    for (let i = 0; i < 8; i++) { const [x, y] = pt(i * Math.PI / 4, 62 * k); s += `<circle cx="${x}" cy="${y}" r="${1.6 * k}" class="e-ink-f"/>`; }
  } else if (seed.shape === 2) {
    for (let i = 0; i < 16; i++) { const [x, y] = pt(i / 16 * Math.PI * 2, 48 * k); s += `<circle cx="${x}" cy="${y}" r="${9 * k}" class="e-bg e-ink-s" stroke-width="${1.1 * k}"/>`; }
    s += `<circle cx="${cx}" cy="${cy}" r="${46 * k}" class="e-bg"/><circle cx="${cx}" cy="${cy}" r="${43 * k}" class="e-acc-s" stroke-width="${1 * k}"/><circle cx="${cx}" cy="${cy}" r="${39 * k}" class="e-ink-s" stroke-width="${0.6 * k}"/>`;
  } else {
    const sq = (rot) => { const p = [0, 1, 2, 3].map((i) => pt(rot + i * Math.PI / 2, 58 * k).join(',')).join(' '); return `<polygon points="${p}" class="e-bg e-ink-s" stroke-width="${1.2 * k}"/>`; };
    s += sq(0) + sq(Math.PI / 4);
    s += `<circle cx="${cx}" cy="${cy}" r="${40 * k}" class="e-bg e-acc-s" stroke-width="${1.2 * k}"/><circle cx="${cx}" cy="${cy}" r="${35 * k}" class="e-ink-s" stroke-width="${0.6 * k}" stroke-dasharray="${1.5 * k} ${2.5 * k}"/>`;
  }
  const fs = (seed.ch === '?' ? 40 : 42) * k;
  s += `<text x="${cx}" y="${cy + fs * 0.36}" text-anchor="middle" font-size="${fs}" class="e-ink-f e-char">${esc(seed.ch)}</text>`;
  return s;
}

// 完整卡面（翻牌大卡正面上半部）
function emblemSVG(c, hide = false) {
  const seed = embSeed(c, hide);
  const id = 'ep' + (++embSeq);
  const title = hide ? '神秘盲盒' : (c.title || '');
  const tl = Array.from(title).length;
  const tfs = Math.min(17, Math.floor(150 / Math.max(tl, 1)));
  const R = D.RARITY[c.rarity] || D.RARITY.N;
  const fk = hide ? '' : festKey(c), F = FESTS[fk];
  const corner = (x, y, sx, sy) => `<path d="M${x} ${y + sy * 14} A14 14 0 0 ${sx * sy > 0 ? 1 : 0} ${x + sx * 14} ${y}" class="e-ink-s" stroke-width=".8"/><circle cx="${x + sx * 4}" cy="${y + sy * 4}" r="1.6" class="e-ink-f"/>`;
  return `<svg viewBox="0 0 200 240" class="emb-svg" xmlns="http://www.w3.org/2000/svg">
    <defs>${F ? festPattern(F.pat, id) : embPattern(seed.kind, id)}</defs>
    <rect width="200" height="240" class="e-bg"/>
    <rect width="200" height="240" fill="url(#${id})" opacity="${F ? '.75' : '.55'}"/>
    <rect x="8" y="8" width="184" height="224" rx="10" class="e-ink-s" stroke-width=".9"/>
    <rect x="12.5" y="12.5" width="175" height="215" rx="7" class="e-acc-s" stroke-width=".6"/>
    ${corner(12.5, 12.5, 1, 1)}${corner(187.5, 12.5, -1, 1)}${corner(12.5, 227.5, 1, -1)}${corner(187.5, 227.5, -1, -1)}
    <rect x="62" y="20" width="76" height="14" rx="7" class="e-bg"/>
    <text x="100" y="30" text-anchor="middle" font-size="7" letter-spacing="2.5" class="e-ink-f e-small">${F ? F.label : '兩人遊樂園'}</text>
    <circle cx="100" cy="106" r="68" class="e-bg" opacity=".9"/>
    ${F ? festMedallion(100, 106, fk, c) : embMedallion(100, 106, seed)}
    <rect x="22" y="182" width="156" height="34" class="e-bg"/>
    <line x1="30" y1="182" x2="170" y2="182" class="e-ink-s" stroke-width=".7"/><line x1="30" y1="216" x2="170" y2="216" class="e-ink-s" stroke-width=".7"/>
    <circle cx="26" cy="182" r="1.5" class="e-ink-f"/><circle cx="174" cy="182" r="1.5" class="e-ink-f"/><circle cx="26" cy="216" r="1.5" class="e-ink-f"/><circle cx="174" cy="216" r="1.5" class="e-ink-f"/>
    <text x="100" y="${199 + tfs * 0.36}" text-anchor="middle" font-size="${tfs}" class="e-ink-f e-title">${esc(title)}</text>
    ${!hide && c.series && c.at ? `<text x="30" y="226" font-size="6.2" letter-spacing="1.4" class="e-ink-f e-small">${F ? F.foot : esc(String(c.series).startsWith('wish:') ? '許願卡' : c.series)} · ${c.kind === 'collect' ? '珍藏' : R.name}</text>
    <text x="170" y="226.2" text-anchor="end" font-size="6.6" letter-spacing="1.1" font-weight="300" font-family="'Helvetica Neue', 'Noto Sans TC', sans-serif" class="e-ink-f e-date">${(() => { const d = new Date(c.at); return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`; })()}</text>`
    : `<text x="100" y="226" text-anchor="middle" font-size="6.5" letter-spacing="1.8" class="e-ink-f e-small">${F ? `${F.foot} · ${R.name} · ${new Date(c.at || now()).getFullYear()}` : `${c.kind === 'collect' ? '珍藏' : R.name + ' · ' + R.label} · ${EMB_NAMES[seed.kind]} · No.${seed.no}`}</text>`}
  </svg>`;
}

// 小徽章（票夾列表用）
function emblemMini(c, hide = false) {
  const seed = embSeed(c, hide);
  const fk = hide ? '' : festKey(c);
  const id = 'ep' + (++embSeq);
  return `<svg viewBox="0 0 130 130" class="emb-mini" xmlns="http://www.w3.org/2000/svg">
    <defs>${fk ? festPattern(FESTS[fk].pat, id, 0.7) : embPattern(seed.kind, id, 0.7)}<clipPath id="${id}c"><circle cx="65" cy="65" r="64"/></clipPath></defs>
    <circle cx="65" cy="65" r="64" class="e-bg"/>
    <rect width="130" height="130" fill="url(#${id})" opacity=".5" clip-path="url(#${id}c)"/>
    ${fk ? festMedallion(65, 65, fk, c, 46) : embMedallion(65, 65, seed, 46)}
  </svg>`;
}

// 背面整片底紋
function emblemBackSVG(c, hide = false) {
  const seed = embSeed(c, hide);
  const id = 'ep' + (++embSeq);
  const fk = hide ? '' : festKey(c);
  return `<svg viewBox="0 0 200 300" preserveAspectRatio="xMidYMid slice" class="emb-back" xmlns="http://www.w3.org/2000/svg">
    <defs>${fk ? festPattern(FESTS[fk].pat, id) : embPattern(seed.kind, id)}</defs>
    <rect width="200" height="300" class="e-bg"/><rect width="200" height="300" fill="url(#${id})" opacity=".7"/>
    <rect x="8" y="8" width="184" height="284" rx="10" class="e-ink-s" stroke-width=".9"/>
    <rect x="12.5" y="12.5" width="175" height="275" rx="7" class="e-acc-s" stroke-width=".6"/>
  </svg>`;
}

// ---------- 翻牌大卡 ----------
function bigCardHTML(c, { hide = false } = {}) {
  const R = D.RARITY[c.rarity] || D.RARITY.N;
  const meta = [];
  if (c.from) meta.push(c.from === 'sys' ? '遊樂園送的' : c.from === me() ? '我送的' : '來自 ' + nick(c.from));
  if (c.series) meta.push(c.series);
  if (c.weekendOnly) meta.push('週末限定');
  if (c.expiresAt && remaining(c) > 0) meta.push(`${fmtDate(c.expiresAt)} 前有效`);
  if ((c.spice || 1) > 1) meta.push(D.SPICE[c.spice].label);
  const log = (c.log || []).filter((l) => l.how !== 'craft').slice(-8).reverse();
  const howTxt = { birthday: '生日當天', redeem: '兌換' };
  return `<div class="fc-wrap emb-${embPalette(c)}" id="fcw">
    <div class="fc-tilt" id="fct"><div class="fc ${c.kind === 'collect' ? 'C' : c.rarity}" id="fc">
      <div class="fc-face fc-front">
        ${emblemSVG(c, hide)}
        <div class="fc-desc">${hide ? '兌換時才揭曉內容' : esc(c.desc || '')}</div>
        <div class="fc-meta">${meta.map((x) => `<span>${esc(x)}</span>`).join('<i>◆</i>')}</div>
        <div class="holo"></div><div class="glare"></div>
        <div class="big-stamp" id="bs">已兌換</div>
      </div>
      <div class="fc-face fc-back">
        ${emblemBackSVG(c, hide)}
        <div class="fc-back-panel">
          <div class="fbp-title">票券紀錄</div>
          <div class="fbp-row"><span>來自</span><b>${esc(c.from === 'sys' ? '遊樂園' : nick(c.from))}</b></div>
          <div class="fbp-row"><span>持有</span><b>${esc(nick(c.owner))}</b></div>
          <div class="fbp-row"><span>收到</span><b>${fmtFull(c.at)}</b></div>
          ${c.kind === 'collect' ? '<div class="fbp-row"><span>類型</span><b>珍藏卡</b></div>' : `<div class="fbp-row"><span>剩餘</span><b>${remaining(c)} / ${c.qty || 1}</b></div>`}
          ${log.length ? `<div class="fbp-sub">使用紀錄</div>${log.map((l) => `<div class="fbp-row"><span>${howTxt[l.how] || '兌換'}</span><b>${fmtFull(l.at)}</b></div>`).join('')}` : (c.kind === 'collect' ? '' : '<div class="fbp-empty">還沒有使用過</div>')}
        </div>
      </div>
    </div></div>
  </div>
  <p class="center small muted" style="margin:-4px 0 10px">點卡片翻面${c.rarity === 'SR' || c.rarity === 'SSR' ? '，傾斜手機看光澤' : ''}</p>`;
}

// 翻面＋傾斜光澤
let orientAsked = false;
function attachCardFX(m) {
  const wrap = $('#fcw', m), tilt = $('#fct', m), fc = $('#fc', m);
  if (!wrap) return () => {};
  let lastInput = 0, raf = 0, alive = true;
  const set = (x, y) => {
    tilt.style.setProperty('--ry', ((x - 0.5) * 18).toFixed(2) + 'deg');
    tilt.style.setProperty('--rx', ((0.5 - y) * 14).toFixed(2) + 'deg');
    fc.style.setProperty('--hx', (x * 100).toFixed(1) + '%');
    fc.style.setProperty('--hy', (y * 100).toFixed(1) + '%');
    fc.style.setProperty('--gx', (x * 100).toFixed(1) + '%');
    fc.style.setProperty('--gy', (y * 100).toFixed(1) + '%');
  };
  const onMove = (e) => { const r = wrap.getBoundingClientRect(); lastInput = performance.now(); set(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))); };
  const onOrient = (e) => { if (e.gamma == null) return; lastInput = performance.now(); set(Math.min(1, Math.max(0, (e.gamma + 25) / 50)), Math.min(1, Math.max(0, (e.beta - 20) / 50))); };
  wrap.addEventListener('pointermove', onMove);
  wrap.addEventListener('pointerleave', () => { lastInput = 0; });
  window.addEventListener('deviceorientation', onOrient);
  const idle = (t) => {
    if (!alive) return;
    if (performance.now() - lastInput > 1500) set(0.5 + Math.sin(t / 1400) * 0.35, 0.5 + Math.cos(t / 1900) * 0.25);
    raf = requestAnimationFrame(idle);
  };
  raf = requestAnimationFrame(idle);
  fc.addEventListener('click', () => {
    if (fc.dataset.lock) return;
    fc.classList.toggle('flipped'); vibrate(10); sfx('flip');
    if (!orientAsked && window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === 'function') {
      orientAsked = true; DeviceOrientationEvent.requestPermission().catch(() => {});
    }
  });
  return () => { alive = false; cancelAnimationFrame(raf); window.removeEventListener('deviceorientation', onOrient); };
}
