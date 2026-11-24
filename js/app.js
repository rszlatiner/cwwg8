(function () {
  const $ = s => document.querySelector(s), app = $('#app'), nav = $('#nav');
  const cfg = window.CW_CONFIG, MODS = window.MODULES.slice().sort((a, b) => (a.bonus ? 1 : 0) - (b.bonus ? 1 : 0) || a.week - b.week);
  const modId = m => m.bonus ? m.week : m.week; // week key (bonus use 'B1'/'B2' in week)
  const byId = id => MODS.find(m => String(m.week) === String(id));
  const R = window.Rubric, S = window.Scoring, St = window.Store;
  let me = null, st = { progress: {}, reviews: {}, free: [], drafts: {}, settings: { currentWeek: 1 } }, guards = [], timer = null;
  document.getElementById('cname').textContent = cfg.courseName;

  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const md = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>');
  const toast = m => { const t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 3200); };
  const cleanup = () => { guards.forEach(g => g.destroy()); guards = []; clearInterval(timer); };
  const html = h => { cleanup(); app.innerHTML = h; window.scrollTo(0, 0); };
  const pillFor = s => s === 'Ahead' || s === 'On track' ? 'ok' : s === 'Behind' ? 'bad' : '';
  const intPill = l => l === 'Clear' ? 'ok' : l === 'Review' ? 'bad' : l === 'Check' ? 'warn' : '';

  function setNav() {
    nav.innerHTML = me ? `<span class="muted small">${esc(me.display)}${me.role === 'tutor' ? ' (tutor)' : ''}</span> ` +
      (me.role === 'student' ? '<button class="ghost sm" data-go="home">Course</button><button class="ghost sm" data-go="free">Free write</button><button class="ghost sm" data-go="portfolio">Portfolio</button>' : '<button class="ghost sm" data-go="tutor">Students</button>') +
      '<button class="ghost sm" data-go="out">Sign out</button>' : '';
    nav.querySelectorAll('[data-go]').forEach(b => b.onclick = async () => { const g = b.dataset.go; if (g === 'out') { await St.signOut(); me = null; setNav(); login(); } else go(g); });
  }
  function go(g, a) { ({ home, free: freeWrite, portfolio, tutor: tutorHome, mod: moduleView, student: studentView })[g](a); }

  async function load() {
    st.settings = await St.settings();
    if (me.role === 'student') [st.progress, st.reviews, st.free, st.drafts] = await Promise.all([St.progress(me.uid), St.reviews(me.uid), St.free(me.uid), St.drafts(me.uid)]);
  }

  // ---------- LOGIN ----------
  function login(msg) {
    html(`<div class="card" style="max-width:420px;margin:30px auto"><h1>Welcome</h1><p class="muted">Sign in to continue your writing course.</p>
      ${St.live ? '' : '<div class="warn-box">Demo mode: progress is saved only in this browser. Tutor login: <b>tutor</b> / <b>' + esc(cfg.localTutorPassword) + '</b>. Class code: <b>' + esc(cfg.localClassCode) + '</b>.</div>'}
      <div id="msg" class="warn-box" style="display:${msg ? 'block' : 'none'}">${esc(msg || '')}</div>
      <label>Username</label><input id="u" autocomplete="username"><label>Password</label><input id="p" type="password" autocomplete="current-password">
      <div id="reg" style="display:none"><label>Your name (shown to your tutor)</label><input id="d"></div>
      <div id="codeBox" ${cfg.enableGoogle && St.live ? '' : 'style="display:none"'}><label>Class code <span class="muted small">(first time only)</span></label><input id="c"></div>
      <div class="row" style="margin-top:14px"><button id="in">Sign in</button><button class="ghost" id="mk">Create account</button></div>
      ${cfg.enableGoogle ? '<div class="row" style="margin-top:10px"><button class="ghost" id="g">Sign in with Google</button></div>' : ''}</div>`);
    let reg = false; const say = m => { const e = $('#msg'); e.style.display = 'block'; e.textContent = m; };
    const done = async u => { me = u; setNav(); await load(); me.role === 'tutor' ? tutorHome() : home(); };
    $('#in').onclick = async () => { if (reg) { reg = false; $('#reg').style.display = 'none'; $('#codeBox').style.display = cfg.enableGoogle && St.live ? '' : 'none'; $('#mk').textContent = 'Create account'; return; } try { await done(await St.signIn($('#u').value, $('#p').value)); } catch (e) { say(e.message); } };
    $('#mk').onclick = async () => { if (!reg) { reg = true; $('#reg').style.display = ''; $('#codeBox').style.display = ''; $('#mk').textContent = 'Create my account'; $('#in').textContent = 'Back'; return; } try { await done(await St.signUp($('#u').value, $('#p').value, $('#d').value, $('#c').value || '')); } catch (e) { say(e.message); } };
    if ($('#g')) $('#g').onclick = async () => { try { await done(await St.google($('#c').value)); } catch (e) { say(e.message); } };
  }

  // ---------- HOME ----------
  function home() {
    const stn = S.standing(MODS, st.progress, st.reviews, st.free, st.settings.currentWeek, cfg.totalWeeks);
    const lv = stn.level, nextPct = lv.next ? Math.min(100, Math.round(100 * stn.xp / lv.next.at)) : 100;
    let units = {}; MODS.forEach(m => (units[m.bonus ? 'Bonus' : 'Unit ' + m.unit] ||= []).push(m));
    html(`<h1>Hello, ${esc(me.display)}</h1>
    <div class="card"><div class="row"><div class="grow"><div class="muted small">Course standing</div><div class="row"><span class="pill ${pillFor(stn.status)}">${stn.status}</span><span>${stn.done} of ${stn.total} weeks written • class is at week ${st.settings.currentWeek}</span></div>
      <div class="muted small" style="margin-top:8px">${esc(lv.name)} • ${stn.xp} points${lv.next ? ' — next: ' + esc(lv.next.name) + ' at ' + lv.next.at : ''}</div><div class="bar"><i style="width:${nextPct}%"></i></div></div>
      <div style="text-align:center"><div class="score">${stn.avg ?? '–'}</div><div class="muted small">average score</div></div></div>
      ${stn.strengths.length ? '<p class="small"><b>Strong at:</b> ' + stn.strengths.map(s => esc(s.label)).join('; ') + '</p>' : ''}
      ${stn.focus.length ? '<p class="small"><b>Keep practising:</b> ' + stn.focus.map(s => esc(s.label)).join('; ') + '</p>' : ''}</div>
    ${Object.entries(units).map(([u, ms]) => `<h2>${u}${ms[0].unitTitle ? ': ' + esc(ms[0].unitTitle) : ''}</h2><div class="grid">${ms.map(m => {
      const d = st.progress[m.week], locked = !m.bonus && m.week > st.settings.currentWeek, e = d?.final ? S.effective(m, d, st.reviews[m.week]) : null;
      return `<div class="mod ${locked ? 'locked' : ''}" data-m="${m.week}"><div class="wk">${m.bonus ? 'Bonus' : 'Week ' + m.week}</div><div class="t">${esc(m.title)}</div>
        <div style="margin-top:6px">${locked ? '<span class="pill">Locked until week ' + m.week + '</span>' : e ? '<span class="pill ok">Score ' + e.total + (e.tutor ? ' • tutor' : '') + '</span>' : d ? '<span class="pill warn">In progress</span>' : '<span class="pill">Not started</span>'}</div></div>`;
    }).join('')}</div>`).join('')}`);
    app.querySelectorAll('.mod:not(.locked)').forEach(el => el.onclick = () => moduleView(el.dataset.m));
    app.querySelectorAll('.mod.locked').forEach(el => el.onclick = () => toast('Your tutor will open this week soon.'));
  }

  // ---------- MODULE ----------
  function moduleView(id, stage) {
    const m = byId(id), d = st.progress[m.week] || {}; window.__cur = m.week;
    const stages = ['Learn', 'Words', 'Quiz', 'Warm-ups', 'Write', 'Results'];
    stage = stage ?? (d.final ? 5 : 0);
    const tabs = `<div class="steps">${stages.map((s, i) => `<button class="${i === stage ? 'on' : ''}" data-st="${i}">${i + 1}. ${s}</button>`).join('')}</div>`;
    const head = `<button class="ghost sm" id="back">← Course</button><h1>${m.bonus ? 'Bonus' : 'Week ' + m.week}: ${esc(m.title)}</h1><p class="muted">${esc(m.goal)}</p>${tabs}`;
    const stepsDone = m.steps.every(s => R.wc((d.steps || {})[s.id] || '') >= s.min);
    let body = '';
    if (stage === 0) body = `<div class="card">${m.lesson.map(p => `<p>${md(p)}</p>`).join('')}<div class="weak"><b>Weaker:</b><br>${md(m.weak)}</div><div class="strong"><b>Stronger:</b><br>${md(m.strong)}</div></div><button data-next>Next: Words →</button>`;
    if (stage === 1) body = `<p class="muted">Write your own sentence (6+ words) for each word. Don't copy the examples.</p>${m.vocab.map(v => `<div class="card"><b>${esc(v[0])}</b> <i class="muted">(${esc(v[1])})</i> — ${esc(v[2])}<div class="small muted">e.g. ${esc(v[3])}<br>e.g. ${esc(v[4])}</div><input class="gv" data-w="${esc(v[0])}" value="${esc((d.vocab || {})[v[0]] || '')}" placeholder="Your sentence using “${esc(v[0])}”"></div>`).join('')}<button id="sv">Save words</button> <button class="ghost" data-next>Next: Quiz →</button>`;
    if (stage === 2) { const a = d.quiz || {}; body = m.quiz.map((q, i) => `<div class="card"><b>${i + 1}. ${md(q.q)}</b>${q.o.map((o, j) => `<label class="opt ${a[i] === j ? (d.quizDone ? (j === q.a ? 'right' : 'wrong') : 'sel') : (d.quizDone && j === q.a ? 'right' : '')}"><input type="radio" name="q${i}" value="${j}" ${a[i] === j ? 'checked' : ''} ${d.quizDone ? 'disabled' : ''} style="width:auto"> ${esc(o)}</label>`).join('')}${d.quizDone ? `<p class="small muted">${md(q.why)}</p>` : ''}</div>`).join('') + (d.quizDone ? '<button data-next>Next: Warm-ups →</button>' : '<button id="qs">Check answers</button>'); }
    if (stage === 3) body = `<p class="muted">Short writing steps that build your final piece. Type your own words.</p>${m.steps.map(s => `<div class="card"><b>${esc(s.title)}</b><p>${md(s.prompt)}</p><textarea class="gs" data-id="${s.id}">${esc((d.steps || {})[s.id] || '')}</textarea><div class="wc"><span class="swc"></span> / ${s.min}+ words</div></div>`).join('')}<button id="ss">Save</button> <button class="ghost" data-next>${stepsDone ? 'Next: Write →' : 'Next →'}</button>`;
    if (stage === 4) { const f = m.final, dr = st.drafts[m.week]?.text || ''; body = `<div class="card"><h2 style="margin-top:0">${esc(f.title)}</h2><p>${md(f.prompt)}</p><p class="small muted">${f.min}–${f.max} words • about ${f.minutes} minutes. Pasting is turned off, and the editor records how your piece was typed. Write it yourself. ${stepsDone ? '' : '<b>Finish the warm-ups first for the best score.</b>'}</p>
      <div id="gw" class="warn-box" style="display:none"></div><textarea id="fin" class="big">${esc(dr)}</textarea><div class="wc"><span id="fwc">0</span> words • <span id="tm">0:00</span></div>
      <div class="row"><button id="fs">Submit for scoring</button><button class="ghost" id="fd">Save draft</button></div></div>`; }
    if (stage === 5) body = d.final ? results(m, d) : '<div class="card">Nothing submitted yet. Finish step 5 to see your score.</div>';
    html(head + body);
    $('#back').onclick = home; app.querySelectorAll('[data-st]').forEach(b => b.onclick = () => moduleView(id, +b.dataset.st));
    app.querySelectorAll('[data-next]').forEach(b => b.onclick = () => moduleView(id, stage + 1));
    const save = async patch => { st.progress[m.week] = await St.saveProgress(me.uid, m.week, patch); return st.progress[m.week]; };
    if (stage === 1) $('#sv').onclick = async () => { const v = {}; app.querySelectorAll('.gv').forEach(i => v[i.dataset.w] = i.value); await save({ vocab: v }); toast('Saved'); };
    if (stage === 1) app.querySelectorAll('.gv').forEach(i => guards.push(Guard.attach(i, null, toast)));
    if (stage === 2 && !d.quizDone) $('#qs').onclick = async () => { const a = {}; m.quiz.forEach((q, i) => { const c = app.querySelector(`input[name=q${i}]:checked`); if (c) a[i] = +c.value; }); if (Object.keys(a).length < m.quiz.length) return toast('Answer every question first.'); await save({ quiz: a, quizDone: true }); moduleView(id, 2); };
    if (stage === 3) {
      const upd = () => app.querySelectorAll('.gs').forEach(t => t.parentElement.querySelector('.swc').textContent = R.wc(t.value));
      app.querySelectorAll('.gs').forEach(t => { guards.push(Guard.attach(t, null, toast)); t.oninput = upd; }); upd();
      $('#ss').onclick = async () => { const v = {}; app.querySelectorAll('.gs').forEach(t => v[t.dataset.id] = t.value); await save({ steps: v }); toast('Saved'); };
    }
    if (stage === 4) writeStage(m, d, save);
  }

  function writeStage(m, d, save) {
    const ta = $('#fin'), f = m.final, t0 = Date.now(); const g = Guard.attach(ta, st.drafts[m.week]?.tel, msg => { const w = $('#gw'); w.style.display = 'block'; w.textContent = msg; }); guards.push(g); g.reset(ta.value);
    const upd = () => { $('#fwc').textContent = R.wc(ta.value); }; ta.addEventListener('input', upd); upd();
    let base = st.drafts[m.week]?.elapsed || 0; timer = setInterval(() => { const s = Math.round(base + (Date.now() - t0) / 1000); $('#tm').textContent = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }, 1000);
    const draft = async () => { await St.saveDraft(me.uid, m.week, { text: ta.value, tel: g.tel, elapsed: Math.round(base + (Date.now() - t0) / 1000) }); st.drafts[m.week] = { text: ta.value, tel: g.tel }; };
    $('#fd').onclick = async () => { await draft(); toast('Draft saved'); };
    const auto = setInterval(() => { if (document.body.contains(ta) && ta.value) draft().catch(() => {}); else clearInterval(auto); }, 20000);
    $('#fs').onclick = async () => {
      const text = ta.value, n = R.wc(text); if (n < Math.max(30, f.min * 0.6)) return toast(`Write a little more first (at least ${Math.round(f.min * 0.6)} words).`);
      g.tel.text = text; const plan = d.steps || {}; const rub = R.scorePiece(text, m, plan);
      const prior = Object.values(st.progress).filter(p => p.final?.fp).map(p => p.final.fp).pop();
      const integ = R.integrity(Object.assign({}, g.tel, { activeMs: Math.max(g.tel.activeMs, 0) }), text.length, prior);
      const delTel = Object.assign({}, g.tel); delete delTel.text;
      await save({ final: { text, words: n, score: rub.score, rubric: rub, integrity: integ, tel: delTel, fp: R.fingerprint(text), at: Date.now(), attempts: (d.final?.attempts || 0) + 1 } });
      clearInterval(auto); toast('Submitted!'); moduleView(m.week, 5);
    };
  }

  function results(m, d) {
    const rev = st.reviews[m.week], e = S.effective(m, d, rev), f = d.final, r = f.rubric;
    return `<div class="card"><div class="row"><div><div class="score">${e.total}</div><div class="muted small">${e.tutor ? 'tutor score' : 'module score'}</div></div>
      <div class="grow small">Writing ${e.parts.final} • Quiz ${e.parts.quiz}% • Words ${e.parts.vocab}% • Warm-ups ${e.parts.steps}%<br>Your piece: ${f.words} words</div></div>
      ${rev?.comment ? `<div class="strong"><b>Your tutor says:</b><br>${md(rev.comment)}</div>` : '<p class="small muted">Your tutor will read this soon and may add a comment.</p>'}
      ${r.stars?.length ? '<h3>What worked</h3><ul>' + r.stars.map(s => `<li>${esc(s)}</li>`).join('') + '</ul>' : ''}
      ${r.wish ? `<h3>One thing to try next</h3><p>${esc(r.wish)}</p>` : ''}
      <h3>Craft checks</h3><table>${r.checks.map(c => `<tr><td>${esc(c.label)}</td><td style="width:90px"><div class="bar"><i style="width:${c.pct}%"></i></div></td><td class="small muted">${esc(c.detail || '')}</td></tr>`).join('')}</table>
      <p class="small muted">These checks count craft features such as sensory detail and sentence variety. They cannot judge how good or original your ideas are; your tutor does that.</p></div>
      <div class="card"><b>Your piece</b><div class="piece">${esc(f.text)}</div></div>
      <button class="ghost" id="rw">Revise and resubmit</button>
`;
  }
  document.addEventListener('click', e => { if (e.target.id === 'rw') { const cur = window.__cur; if (cur) { st.drafts[cur] = { text: st.progress[cur].final.text }; moduleView(cur, 4); } } });

  // ---------- FREE WRITE ----------
  function freeWrite() {
    html(`<h1>Free write</h1><p class="muted">Write anything you like: a story, poem, diary page, scene. You earn points for craft. Typing only, no pasting.</p>
      <div class="card"><label>Title</label><input id="ft"><label>Your writing</label><textarea id="fb" class="big"></textarea><div class="wc"><span id="fw">0</span> words</div><div id="gw" class="warn-box" style="display:none"></div><div id="fr"></div><button id="fg">Save and score</button></div>
      <h2>Earlier pieces</h2>${st.free.length ? st.free.map(x => `<div class="card"><b>${esc(x.title || 'Untitled')}</b> <span class="pill">Score ${x.score}</span> <span class="muted small">${new Date(x.at).toLocaleDateString()}</span>${x.comment ? `<div class="strong small"><b>Tutor:</b> ${md(x.comment)}</div>` : ''}<details><summary class="small">Read</summary><div class="piece">${esc(x.text)}</div></details></div>`).join('') : '<p class="muted">Nothing yet.</p>'}`);
    const ta = $('#fb'), g = Guard.attach(ta, null, m => { const w = $('#gw'); w.style.display = 'block'; w.textContent = m; }); guards.push(g); ta.oninput = () => $('#fw').textContent = R.wc(ta.value);
    $('#fg').onclick = async () => { const text = ta.value, n = R.wc(text); if (n < 40) return toast('Write at least 40 words first.'); g.tel.text = text; const sc = R.scoreFree(text); const integ = R.integrity(g.tel, text.length, null); const tel = Object.assign({}, g.tel); delete tel.text; const e = { at: Date.now(), title: $('#ft').value, text, words: n, score: sc.score, rubric: sc, integrity: integ, tel }; await St.saveFree(me.uid, e); st.free.unshift(e); toast('Saved. Score ' + sc.score); freeWrite(); };
  }

  // ---------- PORTFOLIO ----------
  function portfolio() {
    const done = MODS.filter(m => st.progress[m.week]?.final);
    html(`<h1>My portfolio</h1>${done.length ? done.map(m => { const f = st.progress[m.week].final, e = S.effective(m, st.progress[m.week], st.reviews[m.week]); return `<div class="card"><b>${m.bonus ? 'Bonus' : 'Week ' + m.week}: ${esc(m.title)}</b> <span class="pill ok">${e.total}</span><details><summary class="small">Read</summary><div class="piece">${esc(f.text)}</div></details></div>`; }).join('') : '<p class="muted">Your finished pieces will collect here.</p>'}
    ${st.free.length ? '<h2>Free writing</h2>' + st.free.map(x => `<div class="card"><b>${esc(x.title || 'Untitled')}</b> <span class="pill">${x.score}</span><details><summary class="small">Read</summary><div class="piece">${esc(x.text)}</div></details></div>`).join('') : ''}
    <button class="ghost" onclick="window.print()">Print</button>`);
  }

  // ---------- TUTOR ----------
  async function tutorHome() {
    html('<p class="muted">Loading students…</p>'); st.settings = await St.settings(); const list = await St.listStudents(); const rows = [];
    for (const s of list) { const [p, r, f] = await Promise.all([St.progress(s.uid), St.reviews(s.uid), St.free(s.uid)]); const stn = S.standing(MODS, p, r, f, st.settings.currentWeek, cfg.totalWeeks); const pend = MODS.filter(m => p[m.week]?.final && !r[m.week]).length; rows.push({ s, stn, pend }); }
    html(`<h1>Tutor dashboard</h1>
    <div class="card"><div class="row"><div><label>Class is at week</label><select id="cw">${Array.from({ length: cfg.totalWeeks }, (_, i) => `<option ${i + 1 === st.settings.currentWeek ? 'selected' : ''}>${i + 1}</option>`).join('')}</select></div>
      <div class="grow"><label>Class code ${St.live ? '(students need this to join)' : ''}</label><input id="cc" value="${esc(st.settings.code || '')}" placeholder="e.g. WRITE2026"></div><div style="align-self:end"><button id="sset">Save</button></div></div>
      <p class="small muted">Weeks up to the current week are open to students. Bonus modules are always open.</p></div>
    <div class="card"><table><tr><th>Student</th><th>Status</th><th>Weeks</th><th>Avg</th><th>Points</th><th>To review</th><th>Flags</th><th></th></tr>
    ${rows.length ? rows.map(({ s, stn, pend }) => `<tr><td>${esc(s.display)}<div class="small muted">${esc(s.username || '')}</div></td><td><span class="pill ${pillFor(stn.status)}">${stn.status}</span></td><td>${stn.done}/${stn.expected}</td><td>${stn.avg ?? '–'}</td><td>${stn.xp}</td><td>${pend || ''}</td><td>${stn.flagged ? '<span class="pill bad">' + stn.flagged + '</span>' : ''}</td><td><button class="sm" data-s="${s.uid}">Open</button></td></tr>`).join('') : '<tr><td colspan="8" class="muted">No students yet. Share the site link and class code.</td></tr>'}</table></div>`);
    $('#sset').onclick = async () => { try { await St.setSettings({ currentWeek: +$('#cw').value, code: $('#cc').value.trim() }); toast('Saved'); } catch (e) { toast('Could not save: ' + e.message); } };
    app.querySelectorAll('[data-s]').forEach(b => b.onclick = () => studentView(rows.find(r => r.s.uid === b.dataset.s).s));
  }

  async function studentView(s) {
    html('<p class="muted">Loading…</p>'); const [p, r, f] = await Promise.all([St.progress(s.uid), St.reviews(s.uid), St.free(s.uid)]); const stn = S.standing(MODS, p, r, f, st.settings.currentWeek, cfg.totalWeeks);
    const subs = MODS.filter(m => p[m.week]?.final);
    html(`<button class="ghost sm" id="bk">← Students</button><h1>${esc(s.display)}</h1>
    <div class="card"><span class="pill ${pillFor(stn.status)}">${stn.status}</span> ${stn.done}/${stn.expected} weeks • avg ${stn.avg ?? '–'} • ${stn.xp} points (${esc(stn.level.name)})
      ${stn.strengths.length ? '<p class="small"><b>Strong:</b> ' + stn.strengths.map(x => esc(x.label) + ' ' + x.pct + '%').join('; ') + '</p>' : ''}${stn.focus.length ? '<p class="small"><b>Needs work:</b> ' + stn.focus.map(x => esc(x.label) + ' ' + x.pct + '%').join('; ') + '</p>' : ''}</div>
    ${subs.length ? subs.map(m => { const d = p[m.week], fi = d.final, rv = r[m.week], e = S.effective(m, d, rv); return `<div class="card"><div class="row"><b class="grow">${m.bonus ? 'Bonus' : 'Week ' + m.week}: ${esc(m.title)}</b><span class="pill">Auto ${S.moduleTotal(m, d).total}</span><span class="pill ${intPill(fi.integrity?.level)}">${fi.integrity?.level || ''}</span>${rv ? '<span class="pill ok">Reviewed ' + e.total + '</span>' : '<span class="pill warn">Needs review</span>'}</div>
      ${fi.integrity?.flags?.length ? '<div class="warn-box small">' + fi.integrity.flags.map(esc).join('<br>') + '</div>' : ''}
      <details><summary class="small">Read piece (${fi.words} words)</summary><div class="piece">${esc(fi.text)}</div><p class="small muted">Typed ${fi.tel?.typedChars || 0} chars • paste attempts ${fi.tel?.pasteBlocked || 0} • left page ${fi.tel?.focusLosses || 0}× • active ${Math.round((fi.tel?.activeMs || 0) / 60000)} min</p></details>
      <div class="row"><div style="width:110px"><label>Score</label><input type="number" min="0" max="100" class="rs" data-m="${m.week}" value="${rv?.score ?? e.total}"></div><div class="grow"><label>Comment to student</label><input class="rc" data-m="${m.week}" value="${esc(rv?.comment || '')}"></div><div style="align-self:end"><button class="sm rb" data-m="${m.week}">Save review</button></div></div></div>`; }).join('') : '<p class="muted">No submitted pieces yet.</p>'}
    ${f.length ? '<h2>Free writing</h2>' + f.map(x => `<div class="card"><b>${esc(x.title || 'Untitled')}</b> <span class="pill">${x.score}</span> <span class="pill ${intPill(x.integrity?.level)}">${x.integrity?.level || ''}</span><details><summary class="small">Read</summary><div class="piece">${esc(x.text)}</div></details></div>`).join('') : ''}`);
    $('#bk').onclick = tutorHome;
    app.querySelectorAll('.rb').forEach(b => b.onclick = async () => { const id = b.dataset.m, sc = +app.querySelector(`.rs[data-m="${id}"]`).value, c = app.querySelector(`.rc[data-m="${id}"]`).value; if (isNaN(sc) || sc < 0 || sc > 100) return toast('Score must be 0 to 100'); await St.saveReview(s.uid, id, { score: sc, comment: c }); toast('Review saved'); studentView(s); });
  }

  // ---------- BOOT ----------
  (async () => {
    try { me = await St.init(); } catch (e) { return html('<div class="card"><h2>Could not start</h2><p>' + esc(e.message) + '</p></div>'); }
    setNav(); if (!me) return login(); await load(); me.role === 'tutor' ? tutorHome() : home();
  })();
})();
