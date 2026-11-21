// ============================================================
//  資料層：有 Firebase 設定就用 Firebase，沒有就用「試玩模式」
//  （試玩模式的資料只存在這個瀏覽器）
// ============================================================

const FB = 'https://www.gstatic.com/firebasejs/10.12.2/';

export async function createStore(config) {
  if (config && config.apiKey && config.projectId) return firebaseStore(config);
  return localStore();
}

function setPath(obj, path, val) {
  const keys = path.split('.');
  let o = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (typeof o[keys[i]] !== 'object' || o[keys[i]] === null) o[keys[i]] = {};
    o = o[keys[i]];
  }
  if (val === '__DEL__') delete o[keys[keys.length - 1]]; else o[keys[keys.length - 1]] = val;
}

const rid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

// ------------------------------------------------------------
//  Firebase
// ------------------------------------------------------------
// 背景寫入：失敗時提示一下
const bg = (p) => { p.catch((e) => { console.error("寫入失敗", e); window.__toast && window.__toast("沒有存到，等一下再試"); }); };

async function firebaseStore(config) {
  const [{ initializeApp }, A, F] = await Promise.all([
    import(FB + 'firebase-app.js'),
    import(FB + 'firebase-auth.js'),
    import(FB + 'firebase-firestore.js'),
  ]);
  const app = initializeApp(config);
  const auth = A.getAuth(app);
  let db;
  try {
    db = F.initializeFirestore(app, { localCache: F.persistentLocalCache({ tabManager: F.persistentMultipleTabManager() }) });
  } catch (e) { db = F.getFirestore(app); }

  const coupleRef = (cid) => F.doc(db, 'couples', cid);

  return {
    mode: 'firebase',
    auth: {
      onChange: (cb) => A.onAuthStateChanged(auth, (u) => cb(u ? { uid: u.uid, email: u.email } : null)),
      signUp: (e, p) => A.createUserWithEmailAndPassword(auth, e, p),
      signIn: (e, p) => A.signInWithEmailAndPassword(auth, e, p),
      reset: (e) => A.sendPasswordResetEmail(auth, e),
      signOut: () => A.signOut(auth),
    },
    async getUser(uid) {
      const s = await F.getDoc(F.doc(db, 'users', uid));
      return s.exists() ? s.data() : null;
    },
    setUser: (uid, data) => F.setDoc(F.doc(db, 'users', uid), data, { merge: true }),
    async getCouple(cid) {
      const s = await F.getDoc(coupleRef(cid));
      return s.exists() ? s.data() : null;
    },
    createCouple: (cid, data) => F.setDoc(coupleRef(cid), data),
    watchCouple: (cid, cb) => F.onSnapshot(coupleRef(cid), (s) => cb(s.exists() ? s.data() : null)),
    // 不等雲端回覆（本機馬上更新，Firestore 會照順序送出）
    updateCouple: async (cid, patch) => { bg(F.updateDoc(coupleRef(cid), patch)); },
    DEL: () => F.deleteField(),
    // fn(data) 回傳要更新的欄位（物件）或 null；回傳值代表有沒有更新
    async coupleTx(cid, fn) {
      return F.runTransaction(db, async (tx) => {
        const s = await tx.get(coupleRef(cid));
        const patch = fn(s.data());
        if (!patch) return false;
        tx.update(coupleRef(cid), patch);
        return true;
      });
    },
    col(cid, name) {
      const c = F.collection(db, 'couples', cid, name);
      return {
        watch: (cb) => F.onSnapshot(c, (qs) => cb(qs.docs.map((d) => ({ id: d.id, ...d.data() })))),
        // 先在本機產生 id、不等雲端回覆（畫面馬上更新，網路慢也不會卡）
        add: async (data) => { const ref = F.doc(c); bg(F.setDoc(ref, data)); return ref.id; },
        set: async (id, data, merge = true) => { bg(F.setDoc(F.doc(c, id), data, { merge })); },
        update: async (id, patch) => { bg(F.updateDoc(F.doc(c, id), patch)); },
        remove: async (id) => { bg(F.deleteDoc(F.doc(c, id))); },
      };
    },
  };
}

// ------------------------------------------------------------
//  試玩模式（localStorage）
// ------------------------------------------------------------
function localStore() {
  const KEY = 'park-demo-db';
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } };
  let db = load();
  db.users ||= {}; db.couples ||= {}; db.cols ||= {};
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { console.warn('儲存空間不足', e); } };
  const listeners = new Set();
  const emit = () => { save(); listeners.forEach((fn) => fn()); };
  const clone = (x) => (x == null ? x : JSON.parse(JSON.stringify(x)));

  // 試玩模式有兩個身份，可以互相切換
  const DEMO = { A: { uid: 'demo-her', email: '我（試玩）' }, B: { uid: 'demo-him', email: '他（試玩）' } };
  let who = localStorage.getItem('park-demo-who') || 'A';
  let authCb = null;

  return {
    mode: 'demo',
    demo: {
      who: () => who,
      switch() { who = who === 'A' ? 'B' : 'A'; localStorage.setItem('park-demo-who', who); location.reload(); },
      reset() { localStorage.removeItem(KEY); localStorage.removeItem('park-demo-who'); location.reload(); },
      partnerUid: () => (who === 'A' ? DEMO.B.uid : DEMO.A.uid),
    },
    auth: {
      onChange(cb) { authCb = cb; setTimeout(() => cb(DEMO[who]), 0); return () => {}; },
      signUp: async () => {}, signIn: async () => {}, reset: async () => {},
      signOut: async () => { if (authCb) authCb(DEMO[who]); },
    },
    async getUser(uid) { return clone(db.users[uid] || null); },
    async setUser(uid, data) { db.users[uid] = { ...(db.users[uid] || {}), ...data }; emit(); },
    async getCouple(cid) { return clone(db.couples[cid] || null); },
    async createCouple(cid, data) { db.couples[cid] = clone(data); emit(); },
    watchCouple(cid, cb) {
      const fn = () => cb(clone(db.couples[cid] || null));
      listeners.add(fn); setTimeout(fn, 0);
      return () => listeners.delete(fn);
    },
    DEL: () => '__DEL__',
    async updateCouple(cid, patch) {
      const c = db.couples[cid]; if (!c) return;
      Object.entries(patch).forEach(([k, v]) => setPath(c, k, clone(v)));
      emit();
    },
    async coupleTx(cid, fn) {
      const patch = fn(clone(db.couples[cid]));
      if (!patch) return false;
      await this.updateCouple(cid, patch);
      return true;
    },
    col(cid, name) {
      const key = cid + '/' + name;
      const store = () => (db.cols[key] ||= {});
      return {
        watch(cb) {
          const fn = () => cb(Object.entries(store()).map(([id, d]) => ({ id, ...clone(d) })));
          listeners.add(fn); setTimeout(fn, 0);
          return () => listeners.delete(fn);
        },
        async add(data) { const id = rid(); store()[id] = clone(data); emit(); return id; },
        async set(id, data, merge = true) { store()[id] = merge ? { ...(store()[id] || {}), ...clone(data) } : clone(data); emit(); },
        async update(id, patch) {
          const d = store()[id]; if (!d) return;
          Object.entries(patch).forEach(([k, v]) => setPath(d, k, clone(v)));
          emit();
        },
        async remove(id) { delete store()[id]; emit(); },
      };
    },
  };
}
