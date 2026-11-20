// ============================================================
//  背景音樂（程式合成，不需要音檔）
//  白天：柔和鋼琴　晚上：Lo-fi　——跟著日夜模式自動換
//  每首都是 A–B–A'–C 四段、32 小節（大約兩分鐘）才重複，每一輪還會有一點點不一樣
// ============================================================
const N_ = null;
const BGM_SONGS = {
  piano: {
    tempo: 70,
    sections: [
      { ch: [[48, 52, 55, 59], [45, 48, 52, 55], [41, 45, 48, 52], [43, 47, 50, 53], [48, 52, 55, 59], [45, 48, 52, 55], [41, 45, 48, 52], [43, 47, 50, 55]],
        mel: [[76, N_, 79, N_, 76, 74, 72, N_], [72, N_, 76, N_, 74, 72, 69, N_], [69, N_, 72, N_, 77, N_, 76, 74], [74, N_, N_, 71, 74, N_, 79, N_],
          [76, N_, 79, N_, 84, N_, 83, 81], [79, N_, 76, N_, 72, N_, 74, 76], [77, N_, 76, N_, 74, N_, 72, 74], [71, N_, 72, N_, 74, N_, N_, N_]] },
      { ch: [[45, 48, 52, 55], [40, 47, 52, 55], [41, 45, 48, 52], [43, 48, 52, 55], [38, 45, 50, 53], [43, 47, 50, 53], [40, 47, 52, 55], [43, 47, 50, 55]],
        mel: [[72, N_, 71, 72, 76, N_, N_, N_], [74, N_, 72, 71, 67, N_, N_, N_], [69, N_, 72, N_, 77, 76, 74, 72], [72, N_, N_, N_, 67, N_, 72, 74],
          [77, N_, 76, 74, 74, N_, 72, N_], [71, N_, 74, N_, 79, N_, 77, N_], [76, N_, 74, 72, 71, N_, 72, 74], [74, N_, N_, N_, N_, N_, 71, N_]] },
      { ch: [[48, 52, 55, 59], [45, 48, 52, 55], [41, 45, 48, 52], [43, 47, 50, 53], [48, 52, 55, 59], [45, 48, 52, 55], [41, 45, 48, 52], [43, 47, 50, 55]],
        mel: [[72, N_, 76, N_, 79, N_, 76, N_], [72, N_, 76, N_, 74, 72, 69, N_], [69, N_, 72, N_, 77, N_, 76, 74], [74, N_, N_, 71, 74, N_, 79, N_],
          [76, N_, 79, N_, 84, N_, 83, 81], [79, N_, 76, N_, 72, N_, 74, 76], [77, N_, 76, N_, 74, N_, 72, N_], [71, N_, 74, N_, 79, N_, N_, N_]] },
      { ch: [[41, 45, 48, 52], [43, 47, 50, 55], [40, 47, 52, 55], [45, 48, 52, 55], [38, 45, 50, 53], [43, 47, 50, 53], [48, 52, 55, 59], [48, 52, 55, 60]],
        mel: [[81, N_, N_, N_, 79, N_, 77, N_], [79, N_, N_, N_, 74, N_, N_, N_], [76, N_, N_, N_, 79, N_, 76, N_], [72, N_, N_, N_, N_, N_, N_, N_],
          [74, N_, 77, N_, 81, N_, 79, 77], [76, N_, 74, N_, 71, N_, 74, N_], [72, N_, N_, N_, N_, N_, N_, N_], [N_, N_, N_, N_, N_, N_, 67, N_]] },
    ],
  },
  lofi: {
    tempo: 68,
    sections: [
      { ch: [[41, 45, 48, 52], [40, 43, 47, 50], [38, 45, 48, 53], [36, 43, 47, 52], [41, 45, 48, 52], [40, 43, 47, 50], [38, 45, 48, 53], [36, 43, 47, 52]],
        mel: [[76, N_, N_, 72, N_, N_, 69, N_], [67, N_, N_, N_, 71, N_, 74, N_], [72, N_, N_, 69, N_, N_, 65, N_], [67, N_, N_, N_, N_, N_, N_, N_],
          [76, N_, 77, 76, N_, 72, N_, 69], [71, N_, N_, 74, N_, N_, 79, N_], [77, N_, 76, N_, 74, N_, 72, N_], [71, N_, N_, N_, 72, N_, N_, N_]] },
      { ch: [[34, 38, 41, 45], [33, 36, 40, 43], [31, 34, 38, 41], [36, 40, 43, 46], [34, 38, 41, 45], [33, 36, 40, 43], [31, 34, 38, 41], [36, 40, 43, 46]],
        mel: [[74, N_, N_, N_, 77, N_, 74, N_], [72, N_, N_, N_, 67, N_, 69, N_], [70, N_, N_, 74, N_, N_, 77, N_], [76, N_, N_, N_, N_, N_, 70, N_],
          [69, N_, 70, N_, 74, N_, 77, N_], [76, N_, N_, 72, N_, N_, 69, N_], [67, N_, 70, N_, 74, N_, 72, N_], [72, N_, N_, N_, N_, N_, N_, N_]] },
      { ch: [[41, 45, 48, 52], [40, 43, 47, 50], [38, 45, 48, 53], [36, 43, 47, 52], [41, 45, 48, 52], [40, 43, 47, 50], [38, 45, 48, 53], [36, 43, 47, 52]],
        mel: [[N_, N_, 76, N_, 72, N_, 69, N_], [67, N_, N_, N_, 71, N_, 74, N_], [72, N_, N_, 69, N_, N_, 65, N_], [67, N_, N_, N_, N_, N_, N_, N_],
          [76, N_, 77, 76, N_, 72, N_, 69], [71, N_, N_, 74, N_, N_, 79, N_], [77, N_, 76, N_, 74, N_, 72, N_], [72, N_, N_, N_, N_, N_, N_, N_]] },
      { ch: [[38, 41, 45, 48], [33, 36, 40, 43], [34, 38, 41, 45], [36, 40, 43, 46], [38, 41, 45, 48], [33, 36, 40, 43], [34, 38, 41, 45], [36, 40, 43, 46]],
        mel: [[N_, N_, N_, N_, 81, N_, 79, N_], [77, N_, N_, N_, N_, N_, N_, N_], [N_, N_, N_, N_, 74, N_, 77, N_], [76, N_, N_, N_, N_, N_, N_, N_],
          [N_, N_, N_, N_, 81, N_, 79, 77], [76, N_, N_, N_, 72, N_, N_, N_], [74, N_, N_, N_, N_, N_, 70, N_], [72, N_, N_, N_, N_, N_, N_, N_]], quiet: true },
    ],
  },
};
const mtof = (n) => 440 * Math.pow(2, (n - 69) / 12);
function bgmReverb(ctx, secs = 2.4, decay = 3) {
  const len = Math.floor(ctx.sampleRate * secs), buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) { const d = buf.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay); }
  const cv = ctx.createConvolver(); cv.buffer = buf; return cv;
}
// 排一整首（32 小節），pass 是第幾輪（每輪伴奏、鼓會換一點），回傳長度（秒）
function bgmSchedule(ctx, out, style, t0, pass = 0) {
  const song = BGM_SONGS[style];
  const beat = 60 / song.tempo, step = beat / 2, bar = beat * 4;
  const rnd = () => Math.random();
  const trim = ctx.createGain(); trim.gain.value = { piano: 1.05, lofi: .36 }[style]; trim.connect(out);
  const dry = ctx.createGain(), wet = ctx.createGain(), rv = bgmReverb(ctx);
  wet.gain.value = { piano: .32, lofi: .18 }[style];
  dry.connect(trim); dry.connect(rv); rv.connect(wet); wet.connect(trim);
  const env = (g, t, a, peak, d) => { g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(.0001, t + d); return t + d + .05; };
  const osc = (type, f, t, stopAt, dest, detune = 0) => { const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = detune; o.connect(dest); o.start(t); o.stop(stopAt); return o; };
  const pluck = (n, t, vol, decay, parts, dest = dry) => {
    const g = ctx.createGain(); g.connect(dest);
    const stop = env(g, t, .006, vol * (.85 + rnd() * .3), decay);
    parts.forEach(([mul, amp, type]) => { const pg = ctx.createGain(); pg.gain.value = amp; pg.connect(g); osc(type || 'sine', mtof(n) * mul, t, stop, pg); });
  };
  const noise = (() => { const b = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = rnd() * 2 - 1; return b; })();
  const hit = (t, vol, dur, type, freq, q = 1) => {
    const s = ctx.createBufferSource(); s.buffer = noise; const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(); s.connect(f); f.connect(g); g.connect(dry); env(g, t, .003, vol, dur); s.start(t, rnd() * .5); s.stop(t + dur + .05);
  };
  const hum = () => (rnd() - .5) * .016; // 一點點人味，不會每次都完全對拍
  const lofiLP = ctx.createBiquadFilter(); lofiLP.type = 'lowpass'; lofiLP.frequency.value = 950; lofiLP.connect(dry);
  const total = bar * song.sections.reduce((a, x) => a + x.mel.length, 0);
  if (style === 'lofi') { // 黑膠的沙沙聲
    const v = ctx.createBufferSource(); v.buffer = noise; v.loop = true; const vf = ctx.createBiquadFilter(); vf.type = 'bandpass'; vf.frequency.value = 1200; vf.Q.value = .4;
    const vg = ctx.createGain(); vg.gain.value = .006; v.connect(vf); vf.connect(vg); vg.connect(dry); v.start(t0); v.stop(t0 + total);
  }
  let bi = 0;
  song.sections.forEach((sec, si) => {
    sec.mel.forEach((b, bj) => {
      const t = t0 + (bi + bj) * bar, c = sec.ch[bj];
      // 旋律：每個音延長到下一個音
      b.forEach((n, k) => {
        if (n == null) return;
        let len = 1; while (k + len < 8 && b[k + len] == null) len++;
        const swing = style === 'lofi' && k % 2 ? step * .16 : 0;
        if (style === 'piano') pluck(n, t + k * step + hum(), .085, Math.max(1.8, len * step * 2), [[1, 1], [2, .32], [3, .12], [4.01, .05]]);
        else pluck(n, t + k * step + swing + hum(), sec.quiet ? .04 : .055, 1.4, [[1, 1], [2, .2, 'triangle']], lofiLP);
      });
      if (style === 'piano') {
        const parts = [[1, 1], [2, .32], [3, .12], [4.01, .05]];
        const pat = (pass + si) % 2
          ? [c[0] - 12, c[2], c[3], c[2], c[0], c[2], c[3], c[2]]
          : [c[0] - 12, c[1], c[2], c[3], c[2], c[1], c[0], c[2]];
        if (si === 3 && bj >= 6) pluck(c[0] - 12, t, .05, 3.5, parts);                // 最後兩小節只留低音，喘一口氣
        else pat.forEach((n, k) => pluck(n, t + k * step + hum(), k ? .026 : .045, 2.2, parts));
      } else {
        const g = ctx.createGain(); g.connect(lofiLP); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.05, t + .25); g.gain.setValueAtTime(.05, t + bar - .3); g.gain.linearRampToValueAtTime(0, t + bar + .05);
        c.forEach((n) => { osc('triangle', mtof(n + 12), t, t + bar + .1, g, -6); osc('sine', mtof(n + 12), t, t + bar + .1, g, 7); });
        const root = ((c[0] - 36) % 12 + 12) % 12 + 36;
        pluck(root, t, .09, bar * .9, [[1, 1], [2, .15]], lofiLP);
        const drums = !(bj < 2 && si === 0) && !sec.quiet;                            // 每首開頭兩小節、最後一段先不打鼓
        if (drums) {
          const kicks = (pass % 2) ? [0, 3, 4] : [0, 2.5, 4];
          kicks.forEach((k) => { if (k !== 0 && k !== 4 && bj % 2) return; const kt = t + k * step; const o = ctx.createOscillator(), kg = ctx.createGain(); o.frequency.setValueAtTime(110, kt); o.frequency.exponentialRampToValueAtTime(42, kt + .18); o.connect(kg); kg.connect(dry); env(kg, kt, .004, .16, .3); o.start(kt); o.stop(kt + .4); });
          [2, 6].forEach((k) => hit(t + k * step, .03, .18, 'bandpass', 1800, .7));
          for (let k = 0; k < 8; k++) if (rnd() > .08) hit(t + k * step + (k % 2 ? step * .16 : 0), k % 2 ? .008 : .013, .05, 'highpass', 7000);
        } else if (sec.quiet) for (let k = 0; k < 8; k += 2) hit(t + k * step, .006, .05, 'highpass', 7000);
        for (let k = 0; k < 6; k++) hit(t + rnd() * bar, .006 + rnd() * .01, .012, 'highpass', 3000);
      }
    });
    bi += sec.mel.length;
  });
  return bar * bi;
}
// ---------- 播放器 ----------
const BGM = { ctx: null, gain: null, timer: null, on: false, style: '' };
const bgmVol = () => +(localStorage.getItem('park-bgm-vol') || 35) / 100;
const bgmEnabled = () => localStorage.getItem('park-bgm') !== 'off'; // 預設開著
const bgmStyleNow = () => (document.documentElement.dataset.theme === 'day' ? 'piano' : 'lofi');
function bgmStart() {
  if (BGM.on || !bgmEnabled()) return;
  try {
    BGM.ctx ||= new (window.AudioContext || window.webkitAudioContext)();
    if (BGM.ctx.state !== 'running') BGM.ctx.resume();
    const out = BGM.gain = BGM.ctx.createGain(); out.gain.value = 0; out.connect(BGM.ctx.destination);
    out.gain.linearRampToValueAtTime(bgmVol() * 5, BGM.ctx.currentTime + 3);
    BGM.on = true; BGM.style = bgmStyleNow();
    let t = BGM.ctx.currentTime + .2, pass = 0;
    const loop = () => { if (!BGM.on || BGM.gain !== out) return; t += bgmSchedule(BGM.ctx, out, BGM.style, t, pass++); BGM.timer = setTimeout(loop, Math.max(1, t - BGM.ctx.currentTime - 4) * 1000); };
    loop();
  } catch (e) {}
}
function bgmStop(fade = .8) {
  if (!BGM.on) return; BGM.on = false; clearTimeout(BGM.timer);
  const g = BGM.gain, c = BGM.ctx; BGM.gain = null; if (!g) return;
  try { g.gain.cancelScheduledValues(c.currentTime); g.gain.setValueAtTime(g.gain.value, c.currentTime); g.gain.linearRampToValueAtTime(0, c.currentTime + fade); } catch (e) {}
  setTimeout(() => { try { g.disconnect(); } catch (e) {} }, fade * 1000 + 200);
}
const bgmSetVol = () => { if (BGM.on && BGM.gain) BGM.gain.gain.setTargetAtTime(bgmVol() * 5, BGM.ctx.currentTime, .2); };
// 音效響的時候，背景音樂先讓一下（不會蓋過刮刮樂、翻卡的聲音）
function bgmDuck() {
  if (!BGM.on || !BGM.gain) return;
  const g = BGM.gain.gain, t = BGM.ctx.currentTime;
  try { g.cancelScheduledValues(t); g.setTargetAtTime(bgmVol() * 5 * .35, t, .05); g.setTargetAtTime(bgmVol() * 5, t + .9, .4); } catch (e) {}
}
// 日夜切換時，音樂淡出再換另一首
function bgmThemeCheck() { if (BGM.on && BGM.style !== bgmStyleNow()) { bgmStop(2); setTimeout(bgmStart, 2300); } }
// iPhone：一定要在「點畫面」的當下解鎖聲音。聲音類型設成 ambient：跟著靜音開關，開靜音就不出聲
function audioUnlock() {
  try { if (navigator.audioSession && navigator.audioSession.type !== 'ambient') navigator.audioSession.type = 'ambient'; } catch (e) {}
  try {
    BGM.ctx ||= (typeof AC !== 'undefined' && AC) || new (window.AudioContext || window.webkitAudioContext)();
    if (typeof AC !== 'undefined' && !AC) AC = BGM.ctx; // 音效和音樂共用同一個
    if (BGM.ctx.state !== 'running') BGM.ctx.resume();
    const b = BGM.ctx.createBuffer(1, 1, 22050), src = BGM.ctx.createBufferSource(); src.buffer = b; src.connect(BGM.ctx.destination); src.start(0);
  } catch (e) {}
  bgmStart();
}
['touchend', 'click', 'pointerdown', 'keydown'].forEach((ev) => document.addEventListener(ev, audioUnlock, { passive: true, capture: true }));
document.addEventListener('visibilitychange', () => { if (document.hidden) bgmStop(.3); });
setInterval(bgmThemeCheck, 60000);
