// ============================================================
//  備份與還原
//  1. 雲端自動快照：每 7 天一次，保留最近 4 份（存在 Firebase 的 backups／backupParts）
//  2. 下載備份檔：存成 JSON 到手機（每月提醒一次）
//  3. 還原：從快照或檔案，把資料換回備份時的樣子
// ============================================================

const BACKUP_EVERY = 7 * 86400000;
const BACKUP_KEEP = 4;
const BACKUP_CHUNK = 600000; // 每段最多約 600KB，避開 Firestore 單筆 1MB 上限
const COUPLE_SKIP = ['members', 'creator', 'code', 'lastBackupAt'];

function buildBackup() {
  const couple = {};
  for (const [k, v] of Object.entries(S.couple || {})) if (!COUPLE_SKIP.includes(k)) couple[k] = v;
  // 圖鑑：S.couple.dex／scenes 是「我自己的」畫面用版本，備份要存原本的（01e-friends.js dexPersonal）
  if ('dexAll' in couple) { couple.dex = couple.dexAll; couple.scenes = couple.scenesAll; delete couple.dexAll; delete couple.scenesAll; delete couple.__dexP; }
  const cols = {};
  for (const name of COLS) cols[name] = list(name).map((d) => ({ ...d }));
  return { app: 'two-park', ver: 1, cid: S.cid, at: now(), couple, cols };
}
const backupCounts = (b) => Object.fromEntries(Object.entries(b.cols).map(([k, v]) => [k, v.length]));

// 存一份雲端快照
async function saveCloudBackup(by = 'auto') {
  const b = buildBackup();
  const json = JSON.stringify(b);
  const parts = [];
  for (let i = 0; i < json.length; i += BACKUP_CHUNK) parts.push(json.slice(i, i + BACKUP_CHUNK));
  const id = 'b' + b.at;
  for (let i = 0; i < parts.length; i++) await S.store.col(S.cid, 'backupParts').set(`${id}_${i}`, { bid: id, i, data: parts[i] }, false);
  await S.store.col(S.cid, 'backups').set(id, { at: b.at, by: by === 'auto' ? 'auto' : me(), parts: parts.length, counts: backupCounts(b), size: json.length }, false);
  await S.store.updateCouple(S.cid, { lastBackupAt: b.at });
  await pruneBackups();
  return id;
}
async function listCloudBackups() {
  return new Promise((res) => {
    const off = S.store.col(S.cid, 'backups').watch((arr) => { setTimeout(() => off && off(), 0); res(arr.sort((a, b) => b.at - a.at)); });
  });
}
async function pruneBackups() {
  const all = await listCloudBackups();
  for (const b of all.slice(BACKUP_KEEP)) {
    for (let i = 0; i < (b.parts || 1); i++) await S.store.col(S.cid, 'backupParts').remove(`${b.id}_${i}`);
    await S.store.col(S.cid, 'backups').remove(b.id);
  }
}
async function loadCloudBackup(b) {
  const parts = await new Promise((res) => {
    const off = S.store.col(S.cid, 'backupParts').watch((arr) => { setTimeout(() => off && off(), 0); res(arr.filter((p) => p.bid === b.id).sort((x, y) => x.i - y.i)); });
  });
  if (parts.length !== (b.parts || 1)) throw new Error('備份檔不完整');
  return JSON.parse(parts.map((p) => p.data).join(''));
}

// 打開 app 時檢查：超過 7 天就自動備份（兩人只會有一個人做）
async function maybeAutoBackup() {
  if (!S.couple || COLS.some((c) => !S.d[c])) return;
  if (now() - (S.couple.lastBackupAt || 0) < BACKUP_EVERY) return;
  const ok = await S.store.coupleTx(S.cid, (c) => (now() - (c.lastBackupAt || 0) < BACKUP_EVERY ? null : { lastBackupAt: now() }));
  if (!ok) return;
  try { await saveCloudBackup('auto'); } catch (e) { console.warn('自動備份失敗', e); }
}

// 還原：把每個集合換回備份時的樣子
async function restoreBackup(b) {
  if (!b || b.app !== 'two-park' || !b.cols) throw new Error('這不是兩人遊樂園的備份檔');
  const patch = {};
  for (const [k, v] of Object.entries(b.couple || {})) if (!COUPLE_SKIP.includes(k)) patch[k] = v;
  if (Object.keys(patch).length) await S.store.updateCouple(S.cid, patch);
  for (const name of COLS) {
    const want = b.cols[name] || [];
    const keep = new Set(want.map((d) => d.id));
    for (const d of list(name)) if (!keep.has(d.id)) await col(name).remove(d.id);
    for (const d of want) { const { id, ...data } = d; await col(name).set(id, data, false); }
  }
}

// 下載成檔案（iPhone 會跳出分享選單，選「儲存到檔案」）
async function downloadBackup() {
  const b = buildBackup();
  const name = `two-park-backup-${dkey()}.json`;
  const blob = new Blob([JSON.stringify(b, null, 1)], { type: 'application/json' });
  const file = new File([blob], name, { type: 'application/json' });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: name }); }
    else { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000); }
    localStorage.setItem('park-dl-' + S.cid, String(now()));
    toast('備份檔存好了');
    render();
  } catch (e) { if (e.name !== 'AbortError') toast('下載失敗：' + e.message); }
}
function needDownloadReminder() {
  if (!S.cid) return false;
  const first = 'park-dl-first-' + S.cid;
  if (!localStorage.getItem(first)) localStorage.setItem(first, String(now())); // 第一次用先不提醒，一個月後才提醒
  const last = +(localStorage.getItem('park-dl-' + S.cid) || 0) || +localStorage.getItem(first);
  return now() - last > 30 * 86400000;
}
ACT.downloadBackup = () => downloadBackup();

ACT.backup = async () => {
  const draw = async (m) => {
    const bs = await listCloudBackups();
    const lastDl = +(localStorage.getItem('park-dl-' + S.cid) || 0);
    const html = `${mhead('備份與還原')}
      <div class="card">
        <h3>雲端自動備份</h3>
        <p class="small muted" style="margin:0 0 8px">每 7 天打開 app 時自動備份一次，保留最近 ${BACKUP_KEEP} 份。資料被誤刪時可以一鍵還原。</p>
        ${bs.length ? bs.map((b) => `<div class="list-row"><span class="lr-i"><i data-ic="cloud"></i></span><div class="grow">${fmtFull(b.at)} ${new Date(b.at).toTimeString().slice(0, 5)}
          <div class="small muted">${b.by === 'auto' ? '自動' : nick(b.by) + ' 手動'} · ${b.counts?.cards || 0} 張票券 · ${b.counts?.trips || 0} 個足跡 · ${Math.ceil((b.size || 0) / 1024)} KB</div></div>
          <button class="btn sm ghost" data-restore="${b.id}">還原</button></div>`).join('') : '<div class="empty">還沒有雲端備份</div>'}
        <button class="btn block mt" id="bk-now">現在備份一次</button>
      </div>
      <div class="card">
        <h3>存到手機</h3>
        <p class="small muted" style="margin:0 0 8px">下載一份備份檔，在 iPhone 選「儲存到檔案」，有開 iCloud 雲碟就會自動同步。就算帳號出問題，資料也還在。${lastDl ? `<br>上次下載：${fmtFull(lastDl)}` : ''}</p>
        <button class="btn block" id="bk-dl">下載備份檔</button>
        <label class="btn ghost block mt" style="margin-top:10px">從備份檔還原<input type="file" accept="application/json,.json" id="bk-file" class="hidden"></label>
      </div>`;
    if (!m) m = openModal(html); else m.querySelector('.modal').innerHTML = html;
    $('#bk-now', m).onclick = async () => { $('#bk-now', m).disabled = true; $('#bk-now', m).textContent = '備份中…'; try { await saveCloudBackup('manual'); toast('雲端備份好了 ☁️'); } catch (e) { toast('備份失敗：' + e.message); } draw(m); };
    $('#bk-dl', m).onclick = () => downloadBackup();
    $$('[data-restore]', m).forEach((btn) => btn.onclick = async () => {
      const b = bs.find((x) => x.id === btn.dataset.restore);
      if (!(await confirmBox(`要還原到 ${fmtFull(b.at)} 的備份嗎？\n現在的資料會換成那時候的樣子（兩人都會一起變），還原前會先自動備份一份現在的資料。`, '還原'))) return;
      try { await saveCloudBackup('manual'); await restoreBackup(await loadCloudBackup(b)); toast('還原好了'); closeAll(); } catch (e) { toast('還原失敗：' + e.message); }
    });
    $('#bk-file', m).onchange = async (e) => {
      const f = e.target.files[0]; if (!f) return;
      try {
        const b = JSON.parse(await f.text());
        if (b.app !== 'two-park') throw new Error('這不是兩人遊樂園的備份檔');
        if (!(await confirmBox(`要從這個檔案還原嗎？\n備份時間：${fmtFull(b.at)}\n現在的資料會換成檔案裡的樣子，還原前會先自動備份一份現在的資料。`, '還原'))) return;
        await saveCloudBackup('manual'); await restoreBackup(b); toast('還原好了'); closeAll();
      } catch (err) { toast('還原失敗：' + err.message); }
    };
    return m;
  };
  draw();
};
