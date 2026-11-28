// ============================================================
//  小劇場動作（11/28 晽晽要求：劇情要配動作，例如花送給狗狗後要戴在狗狗頭上）
//  SCENES 每一句可以多一個第 3 欄 fx：用逗號分開的動作，A／B＝劇本裡的 a／b
//  身體動作：jump hop shake spin fall squash wiggle puff nudge dash approach leave follow fly roll
//  持續狀態：lie（趴下）off（關機倒下）on（開機）vanish（被吃掉）regrow（長回來）turn（轉身）reset
//  頭上的小符號：mark:K:!  hearts:K  sweat:K  bubbles:K  sparkle:K  notes:K  think:K  zzz:K  sun
//  道具：prop:X:K（拿在嘴邊）give:X:A>B（交給對方）take:X:K（搶過來）wear:X:K（戴到頭上）eat:X（吃掉）
//        box:K／unbox:K（紙箱）  X = flower apple can fish drum
// ============================================================
const SFX_PROPS = {
  flower: '<svg viewBox="-10 -10 20 20"><g fill="#f7a8c0">' + [0, 72, 144, 216, 288].map((a) => `<ellipse cx="0" cy="-4.6" rx="3.2" ry="4.6" transform="rotate(${a})"/>`).join('') + '</g><circle r="2.8" fill="#f5c843"/><path d="M0 8 L0 10" stroke="#5fae6f" stroke-width="2"/></svg>',
  apple: '<svg viewBox="-10 -10 20 20"><path d="M0 -4 C-6 -8 -10 -2 -8 3 C-6 9 -2 9 0 7 C2 9 6 9 8 3 C10 -2 6 -8 0 -4 Z" fill="#e2445f"/><path d="M0 -4 Q1 -8 3 -9" stroke="#7a4a2a" stroke-width="1.4" fill="none"/><path d="M2 -7 Q6 -9 7 -6 Q4 -5 2 -7 Z" fill="#5fae6f"/><ellipse cx="-4" cy="-1" rx="1.4" ry="2.2" fill="#fff" opacity=".5"/></svg>',
  applebit: '<svg viewBox="-10 -10 20 20"><path d="M0 -4 C-6 -8 -10 -2 -8 3 C-6 9 -2 9 0 7 C2 9 6 9 8 3 C10 -2 6 -8 0 -4 Z" fill="#e2445f"/><circle cx="7" cy="1" r="3.6" fill="var(--bg, #fff7f3)"/><path d="M0 -4 Q1 -8 3 -9" stroke="#7a4a2a" stroke-width="1.4" fill="none"/></svg>',
  can: '<svg viewBox="-10 -10 20 20"><ellipse cx="0" cy="-5" rx="7" ry="2.4" fill="#d7d2cc"/><path d="M-7 -5 V5 A7 2.4 0 0 0 7 5 V-5" fill="#c9c2ba"/><rect x="-7" y="-2" width="14" height="5" fill="#ff8fab"/><path d="M-3 0.5 q3 -3 6 0 q-3 3 -6 0 Z" fill="#fff"/></svg>',
  fish: '<svg viewBox="-10 -10 20 20"><path d="M-8 0 Q-2 -6 5 0 Q-2 6 -8 0 Z M5 0 L9 -4 L9 4 Z" fill="#e9a35a"/><circle cx="-4.5" cy="-1" r="1" fill="#3a2a2a"/></svg>',
  drum: '<svg viewBox="-10 -10 20 20"><path d="M-1 1 C-8 6 -9 -4 -3 -7 C3 -9 6 -3 2 1 Z" fill="#c9792f"/><path d="M1 0 L7 6" stroke="#fbf3e6" stroke-width="2.6" stroke-linecap="round"/><circle cx="7.6" cy="5" r="1.6" fill="#fbf3e6"/><circle cx="6" cy="7.4" r="1.6" fill="#fbf3e6"/></svg>',
  box: '<svg viewBox="0 0 40 26"><path d="M2 6 H38 V25 H2 Z" fill="#c89a5e"/><path d="M2 6 L8 1 H32 L38 6" fill="#d9ad72"/><path d="M14 6 V12 M26 6 V12" stroke="#a87b45" stroke-width="1.2"/><path d="M14 16 h12" stroke="#a87b45" stroke-width="1"/></svg>',
};
const SFX_MARK = { '!': '!', '?': '?', '…': '…', '♪': '♪' };
function sfxWrap(el) {
  if (el.querySelector('.fx-pos')) return;
  const inner = el.innerHTML;
  el.innerHTML = `<span class="fx-pos"><span class="fx-body"><span class="fx-anim">${inner}</span></span></span>`;
}
function sfxGeo(el, k) {
  const svg = el.querySelector('svg'); const vb = svg && svg.viewBox && svg.viewBox.baseVal;
  const at = HAT_AT[k] || [30, 30];
  const w = vb && vb.width ? vb.width : 100, h = vb && vb.height ? vb.height : 100;
  const hx = 1 - at[0] / w, hy = Math.max(0, at[1] / h);
  return { head: [hx, hy], front: [Math.min(1.02, hx + .12), Math.min(.9, hy + .3)] };
}
function sfxPropEl(name) {
  const s = document.createElement('span');
  s.className = `fx-prop fx-${name}`; s.dataset.prop = name; s.innerHTML = SFX_PROPS[name] || '';
  return s;
}
function sfxPlace(prop, host, k, spot) {
  const g = sfxGeo(host, k), [x, y] = g[spot] || g.front;
  prop.style.left = (x * 100) + '%'; prop.style.top = (y * 100) + '%';
  prop.classList.toggle('worn', spot === 'head');
  host.querySelector('.fx-anim').appendChild(prop);
}
function sfxFind(name, ctx) {
  for (const k of ['A', 'B']) { const p = ctx[k].querySelector(`.fx-prop[data-prop="${name}"]`); if (p) return [p, k]; }
  return [null, null];
}
async function sfxFly(prop, fromEl, toHost, toK, spot) {
  const r0 = prop.getBoundingClientRect();
  const g = sfxGeo(toHost, toK), [x, y] = g[spot] || g.front;
  const hr = toHost.querySelector('.fx-anim').getBoundingClientRect();
  const tx = hr.left + x * hr.width, ty = hr.top + y * hr.height;
  const ghost = prop.cloneNode(true);
  ghost.classList.add('fx-flying');
  ghost.style.left = (r0.left + r0.width / 2) + 'px'; ghost.style.top = (r0.top + r0.height / 2) + 'px';
  document.body.appendChild(ghost); prop.remove();
  await sleep(20);
  ghost.style.transform = `translate(${tx - (r0.left + r0.width / 2)}px, ${ty - (r0.top + r0.height / 2)}px) translate(-50%, -50%) rotate(360deg)`;
  await sleep(650);
  ghost.remove();
  ghost.classList.remove('fx-flying'); ghost.style.transform = '';
  sfxPlace(ghost, toHost, toK, spot);
}
function sfxPop(host, html, cls) {
  const s = document.createElement('span');
  s.className = `fx-pop ${cls}`; s.innerHTML = html;
  host.querySelector('.fx-anim').appendChild(s);
  setTimeout(() => s.remove(), 1800);
}
function sfxOnce(el, cls, ms = 700) {
  const a = el.querySelector('.fx-anim'); if (!a) return;
  a.classList.remove(cls); void a.offsetWidth; a.classList.add(cls);
  setTimeout(() => a.classList.remove(cls), ms);
}
function sfxShift(el, px) {
  const p = el.querySelector('.fx-pos'); if (!p) return;
  const cur = +(p.dataset.x || 0) + px; p.dataset.x = cur;
  p.style.transform = `translateX(${cur}px)`;
}
async function sceneFx(spec, ctx) {
  if (!spec) return;
  const toward = (k) => (ctx.dir[k] || 1);   // 往對方那邊是 +1 或 -1
  for (const raw of spec.split(',')) {
    const [act, a1, a2] = raw.trim().split(':');
    const K = (x) => (x === 'A' || x === 'B' ? x : 'A');
    const el = (x) => ctx[K(x)], k = (x) => ctx.key[K(x)];
    try {
      switch (act) {
        case 'jump': case 'hop': case 'shake': case 'spin': case 'fall': case 'squash': case 'wiggle': case 'puff': case 'fly': case 'roll':
          sfxOnce(el(a1), 'a-' + act, act === 'fly' || act === 'roll' || act === 'fall' ? 1300 : 800); break;
        case 'nudge': { const f = a1.split('>')[0]; sfxShift(el(f), 12 * toward(K(f))); setTimeout(() => sfxShift(el(f), -12 * toward(K(f))), 350); break; }
        case 'dash': { const f = a1.split('>')[0]; sfxShift(el(f), 22 * toward(K(f))); setTimeout(() => sfxShift(el(f), -22 * toward(K(f))), 500); break; }
        case 'approach': { const f = a1.split('>')[0]; sfxShift(el(f), 16 * toward(K(f))); break; }
        case 'leave': sfxShift(el(a1), -28 * toward(K(a1))); break;
        case 'follow': sfxShift(el(a1), 18 * toward(K(a1))); break;
        case 'lie': el(a1).querySelector('.fx-body').classList.add('s-lie'); break;
        case 'off': el(a1).querySelector('.fx-body').classList.add('s-off'); break;
        case 'on': el(a1).querySelector('.fx-body').classList.remove('s-off'); break;
        case 'vanish': el(a1).querySelector('.fx-body').classList.add('s-vanish'); break;
        case 'regrow': el(a1).querySelector('.fx-body').classList.remove('s-vanish'); sfxOnce(el(a1), 'a-grow', 1200); break;
        case 'turn': el(a1).querySelector('.fx-body').classList.toggle('s-turn'); break;
        case 'mark': sfxPop(el(a1), `<b>${SFX_MARK[a2] || a2 || '!'}</b>`, 'p-mark'); break;
        case 'hearts': sfxPop(el(a1), '<i>♥</i><i>♥</i><i>♥</i>', 'p-hearts'); break;
        case 'sweat': sfxPop(el(a1), '<i></i>', 'p-sweat'); break;
        case 'bubbles': sfxPop(el(a1), '<i></i><i></i><i></i><i></i>', 'p-bubbles'); break;
        case 'sparkle': sfxPop(el(a1), '<i>✦</i><i>✧</i><i>✦</i>', 'p-sparkle'); break;
        case 'notes': sfxPop(el(a1), '<i>♪</i><i>♫</i>', 'p-notes'); break;
        case 'think': sfxPop(el(a1), '<i></i><i></i><i></i>', 'p-think'); break;
        case 'zzz': sfxPop(el(a1), '<i>z</i><i>z</i><i>Z</i>', 'p-zzz'); break;
        case 'sun': { const s = document.createElement('div'); s.className = 'fx-sun'; const ra = ctx.A.getBoundingClientRect(), rb = ctx.B.getBoundingClientRect(); s.style.left = ((ra.left + rb.right) / 2) + 'px'; s.style.top = (Math.min(ra.top, rb.top) - 40) + 'px'; document.body.appendChild(s); ctx.extras.push(s); break; }
        case 'prop': sfxPlace(sfxPropEl(a1), el(a2), k(a2), 'front'); break;
        case 'give': case 'take': case 'wear': {
          const name = a1;
          let from, to;
          if (act === 'give') [from, to] = a2.split('>').map(K);
          else to = K(a2);
          let [p, at] = sfxFind(name, ctx);
          if (!p) { from = from || (to === 'A' ? 'B' : 'A'); p = sfxPropEl(name); sfxPlace(p, ctx[from], ctx.key[from], 'front'); await sleep(250); }
          await sfxFly(p, ctx[at || from], ctx[to], ctx.key[to], act === 'wear' ? 'head' : 'front');
          break;
        }
        case 'bite': { const [p] = sfxFind('apple', ctx); if (p) { p.dataset.prop = 'apple'; p.innerHTML = SFX_PROPS.applebit; } break; }
        case 'eat': { const [p] = sfxFind(a1, ctx); if (p) { p.classList.add('gone'); setTimeout(() => p.remove(), 500); } break; }
        case 'box': { const b = sfxPropEl('box'); b.classList.add('fx-boxed'); el(a1).querySelector('.fx-anim').appendChild(b); break; }
        case 'unbox': { const b = el(a1).querySelector('.fx-boxed'); if (b) { b.classList.add('gone'); setTimeout(() => b.remove(), 500); } break; }
        default: break;
      }
    } catch (e) { console.warn('小劇場動作', raw, e); }
  }
}
function sceneFxEnd(ctx) {
  // 劇情演完：姿勢回正、位置回到原本隊形；戴在頭上的東西留著，跟著走出畫面
  for (const kk of ['A', 'B']) {
    const e = ctx[kk]; if (!e) continue;
    const b = e.querySelector('.fx-body'); b && b.classList.remove('s-lie', 's-off', 's-vanish', 's-turn');
    const p = e.querySelector('.fx-pos'); if (p) { p.dataset.x = 0; p.style.transform = ''; }
    e.querySelectorAll('.fx-prop:not(.worn), .fx-boxed').forEach((x) => x.remove());
  }
  ctx.extras.forEach((x) => x.remove());
}

// 各齣小劇場的動作（照台詞順序）
const SCENE_FX = {
  tail: ['nudge:A>B,jump:B', 'mark:B:?', 'turn:B,hearts:B', 'sweat:A'],
  chase: ['hearts:A,hop:A', 'shake:B', 'follow:A,hearts:A'],
  step: ['nudge:A>B,squash:B', 'sweat:B', 'nudge:A>B,squash:B', 'leave:B', 'follow:A,mark:A:…'],
  bath: ['bubbles:B', 'think:B', 'turn:A,notes:A', 'jump:B,sparkle:B'],
  waltz: ['notes:A', 'mark:B:?', 'spin:A,notes:A', 'jump:A,sparkle:A'],
  flower: ['give:flower:A>B', 'wear:flower:B,wiggle:B', 'fall:A,hearts:A'],
  mine: ['mark:A:!', 'dash:A>B,fly:B', 'prop:fish:A,squash:A', 'mark:B:?'],
  eatshark: ['dash:A>B,vanish:B', 'puff:A', 'regrow:B', 'mark:B:?'],
  nose: ['wiggle:B', 'shake:A', 'mark:B:♪', 'off:B', 'jump:A,sparkle:A'],
  hello: ['jump:A', 'wiggle:B,hearts:B', 'mark:A:…', 'wiggle:B', 'nudge:A>B,squash:B,leave:B,hearts:B'],
  bask: ['approach:A>B', 'sun,sparkle:B', 'hearts:A', 'lie:A,lie:B,zzz:A'],
  aflower: ['give:flower:A>B', 'mark:B:?', 'mark:A:…', 'wear:flower:B,sparkle:B', 'jump:B'],
  trap: ['box:A', 'wiggle:B', 'mark:A:…', 'wiggle:B,hearts:B', 'unbox:A,sweat:A'],
  sunspot: ['sun,lie:B', 'mark:A:!', 'puff:B', 'dash:A>B,fly:B,lie:A'],
  snack: ['prop:can:B', 'approach:A>B,mark:A:?', 'puff:B', 'dash:A>B,fly:B,take:can:A,hearts:A'],
  scare: ['jump:A,mark:A:!', 'hop:B,mark:B:!', 'turn:B,hearts:B', 'hearts:A'],
  smell: ['bubbles:A', 'sparkle:A,wiggle:A', 'nudge:B>A,bubbles:A'],
  apple: ['prop:apple:A', 'take:apple:B,hop:B', 'sweat:A'],
  can: ['mark:A:?', 'give:can:B>A', 'wiggle:A', 'notes:B'],
  off: ['nudge:A>B', 'off:B', 'think:A', 'nudge:A>B', 'on:B,hop:B', 'hop:A,mark:A:!'],
  drum: ['mark:A:!', 'prop:drum:B', 'mark:A:?', 'roll:B,leave:B'],
  flower2: ['give:flower:A>B', 'hearts:B', 'spin:A,hearts:A', 'wear:flower:B,wiggle:B'],
  half: ['prop:apple:A', 'bite,give:apple:A>B', 'mark:B:?', 'take:apple:A,eat:apple,wiggle:A'],
  smell2: ['nudge:A>B', 'sparkle:B', 'nudge:A>B,bubbles:B', 'puff:B,shake:B'],
  step2: ['nudge:A>B,squash:B', 'hearts:B,jump:B'],
};
