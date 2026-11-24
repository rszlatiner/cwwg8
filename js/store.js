// Storage + sign-in. Local mode (no config) or Firebase (Auth + Firestore).
window.Store = (function () {
  const cfg = window.CW_CONFIG; const live = !!cfg.firebase; let fb = null, auth = null, db = null, me = null;
  const uname = u => u.toLowerCase().replace(/[^a-z0-9._-]/g, '');
  const toEmail = u => u.includes('@') ? u.trim().toLowerCase() : uname(u) + '@students.example.com';
  const uid8 = () => 'u' + Math.random().toString(36).slice(2, 10);

  // ---------- LOCAL MODE ----------
  const KEY = 'cw_local_v1';
  function L() { try { const j = JSON.parse(localStorage.getItem(KEY)); if (j) return j; } catch (e) {} return { users: {}, data: {}, settings: { code: cfg.localClassCode, currentWeek: 1 }, session: null }; }
  function save(j) { try { localStorage.setItem(KEY, JSON.stringify(j)); } catch (e) {} }
  const mem = { j: null };
  const J = () => (mem.j ||= L());
  const persist = () => save(mem.j);
  const D = id => (J().data[id] ||= { progress: {}, free: [], reviews: {}, drafts: {}, profile: null });

  const local = {
    async init() { const j = J(); if (!j.users.tutor) { j.users.tutor = { uid: 'tutor', pass: cfg.localTutorPassword, display: 'Tutor', role: 'tutor' }; persist(); } const s = j.session && Object.values(j.users).find(u => u.uid === j.session); me = s ? { uid: s.uid, display: s.display, role: s.role } : null; return me; },
    async signUp(username, pass, display, code) { const j = J(), u = uname(username); if (!u || pass.length < 4) throw new Error('Choose a username and a password of 4+ characters.'); if (j.users[u]) throw new Error('That username is taken.'); if (code.trim().toUpperCase() !== j.settings.code.toUpperCase()) throw new Error('Wrong class code.'); const id = uid8(); j.users[u] = { uid: id, pass, display: display || username, role: 'student' }; D(id).profile = { username: u, display: display || username, createdAt: Date.now() }; j.session = id; persist(); me = { uid: id, display: display || username, role: 'student' }; return me; },
    async signIn(username, pass) { const j = J(), u = j.users[uname(username)]; if (!u || u.pass !== pass) throw new Error('Wrong username or password.'); j.session = u.uid; persist(); me = { uid: u.uid, display: u.display, role: u.role }; return me; },
    async google() { throw new Error('Google sign-in is available once the site is connected to Firebase.'); },
    async signOut() { J().session = null; persist(); me = null; },
    async progress(uid) { return D(uid).progress; }, async reviews(uid) { return D(uid).reviews; }, async free(uid) { return D(uid).free; }, async drafts(uid) { return D(uid).drafts; },
    async saveProgress(uid, modId, patch) { const p = D(uid).progress; p[modId] = Object.assign(p[modId] || {}, patch, { updatedAt: Date.now() }); persist(); return p[modId]; },
    async saveDraft(uid, modId, draft) { D(uid).drafts[modId] = draft; persist(); },
    async saveFree(uid, e) { D(uid).free.unshift(e); persist(); },
    async settings() { return J().settings; },
    async setSettings(s) { Object.assign(J().settings, s); persist(); },
    async listStudents() { const j = J(); return Object.values(j.users).filter(u => u.role === 'student').map(u => ({ uid: u.uid, display: u.display, username: Object.keys(j.users).find(k => j.users[k] === u), lastActive: Math.max(0, ...Object.values(D(u.uid).progress).map(p => p.updatedAt || 0)) })); },
    async saveReview(uid, modId, r) { D(uid).reviews[modId] = Object.assign({}, r, { at: Date.now() }); persist(); }
  };

  // ---------- FIREBASE MODE ----------
  async function loadFb() {
    if (fb) return;
    const v = '10.12.2', base = `https://www.gstatic.com/firebasejs/${v}/`;
    const [app, a, f] = await Promise.all([import(base + 'firebase-app.js'), import(base + 'firebase-auth.js'), import(base + 'firebase-firestore.js')]);
    const App = app.initializeApp(cfg.firebase); auth = a.getAuth(App); db = f.getFirestore(App); fb = { a, f };
  }
  const isAdmin = async uid => { const { f } = fb; try { const s = await f.getDoc(f.doc(db, 'admins', uid)); return s.exists(); } catch (e) { return false; } };
  async function whoAmI(u) {
    if (!u) return null; const { f } = fb; const role = (await isAdmin(u.uid)) ? 'tutor' : 'student'; let display = u.displayName || (u.email || '').split('@')[0];
    try { const s = await f.getDoc(f.doc(db, 'students', u.uid)); if (s.exists()) display = s.data().display || display; } catch (e) {}
    return { uid: u.uid, display, role, email: u.email };
  }
  const remote = {
    async init() { await loadFb(); const { a } = fb; await new Promise(r => { const un = a.onAuthStateChanged(auth, async u => { un(); me = await whoAmI(u); r(); }); }); return me; },
    async signUp(username, pass, display, code) {
      const { a, f } = fb; const u = uname(username); if (!u || pass.length < 6) throw new Error('Choose a username and a password of 6+ characters.');
      let cred; try { cred = await a.createUserWithEmailAndPassword(auth, toEmail(u), pass); } catch (e) { throw new Error(e.code === 'auth/email-already-in-use' ? 'That username is taken.' : e.message); }
      try { await f.setDoc(f.doc(db, 'students', cred.user.uid), { username: u, display: display || username, classCode: code.trim(), createdAt: Date.now() }); }
      catch (e) { await cred.user.delete(); throw new Error('Wrong class code.'); }
      me = await whoAmI(cred.user); return me;
    },
    async signIn(username, pass) { const { a } = fb; try { const c = await a.signInWithEmailAndPassword(auth, toEmail(username), pass); me = await whoAmI(c.user); return me; } catch (e) { throw new Error('Wrong username or password.'); } },
    async google(code) {
      const { a, f } = fb; const c = await a.signInWithPopup(auth, new a.GoogleAuthProvider()); const s = await f.getDoc(f.doc(db, 'students', c.user.uid));
      if (!s.exists() && !(await isAdmin(c.user.uid))) {
        if (!code) { await a.signOut(auth); throw new Error('First time with Google? Type the class code in the Class code box first, then press Google again.'); }
        try { await f.setDoc(f.doc(db, 'students', c.user.uid), { username: (c.user.email || '').split('@')[0], display: c.user.displayName || 'Student', classCode: code.trim(), createdAt: Date.now() }); } catch (e) { await a.signOut(auth); throw new Error('Wrong class code.'); }
      }
      me = await whoAmI(c.user); return me;
    },
    async signOut() { await fb.a.signOut(auth); me = null; },
    async _col(uid, name) { const { f } = fb; const s = await f.getDocs(f.collection(db, 'students', uid, name)); const o = {}; s.forEach(d => o[d.id] = d.data()); return o; },
    async progress(uid) { return this._col(uid, 'progress'); }, async reviews(uid) { return this._col(uid, 'reviews'); }, async drafts(uid) { return this._col(uid, 'drafts'); },
    async free(uid) { const o = await this._col(uid, 'free'); return Object.values(o).sort((a, b) => b.at - a.at); },
    async saveProgress(uid, modId, patch) { const { f } = fb; const ref = f.doc(db, 'students', uid, 'progress', String(modId)); await f.setDoc(ref, Object.assign({}, patch, { updatedAt: Date.now() }), { merge: true }); return (await f.getDoc(ref)).data(); },
    async saveDraft(uid, modId, draft) { const { f } = fb; await f.setDoc(f.doc(db, 'students', uid, 'drafts', String(modId)), draft); },
    async saveFree(uid, e) { const { f } = fb; await f.setDoc(f.doc(db, 'students', uid, 'free', String(e.at)), e); },
    async settings() { const { f } = fb; const out = { code: '', currentWeek: 1 }; try { const s = await f.getDoc(f.doc(db, 'settings', 'public')); if (s.exists()) out.currentWeek = s.data().currentWeek || 1; } catch (e) {} if (me?.role === 'tutor') { try { const c = await f.getDoc(f.doc(db, 'settings', 'class')); if (c.exists()) out.code = c.data().code; } catch (e) {} } return out; },
    async setSettings(s) { const { f } = fb; if ('currentWeek' in s) await f.setDoc(f.doc(db, 'settings', 'public'), { currentWeek: s.currentWeek }, { merge: true }); if ('code' in s) await f.setDoc(f.doc(db, 'settings', 'class'), { code: s.code }, { merge: true }); },
    async listStudents() { const { f } = fb; const s = await f.getDocs(f.collection(db, 'students')); const out = []; for (const d of s.docs) { const p = await this._col(d.id, 'progress'); out.push({ uid: d.id, display: d.data().display, username: d.data().username, lastActive: Math.max(0, ...Object.values(p).map(x => x.updatedAt || 0)) }); } return out; },
    async saveReview(uid, modId, r) { const { f } = fb; await f.setDoc(f.doc(db, 'students', uid, 'reviews', String(modId)), Object.assign({}, r, { at: Date.now() })); }
  };
  const impl = live ? remote : local;
  const api = { live, user: () => me };
  Object.keys(impl).forEach(k => { api[k] = (...a) => impl[k](...a); });
  return api;
})();
