// Module scores, course standing, levels. Works in browser and node.
(function () {
  const R = (typeof require !== 'undefined' && typeof module !== 'undefined') ? require('./rubric.js') : window.Rubric;
  const stem = w => w.toLowerCase().replace(/(ing|ed|es|s|ly)$/, '');

  function vocabScore(mod, sentences) {
    let ok = 0;
    for (const v of mod.vocab) {
      const s = (sentences?.[v[0]] || '').trim(); if (!s) continue;
      const hasWord = R.words(s).some(x => stem(x) === stem(v[0].split(' ')[0]) || x.startsWith(stem(v[0].split(' ')[0])));
      const copied = [v[3], v[4], v[2]].some(e => e && s.toLowerCase().replace(/\W/g, '') === e.toLowerCase().replace(/\W/g, ''));
      if (hasWord && R.wc(s) >= 6 && !copied) ok++;
    }
    return ok / mod.vocab.length;
  }
  function quizScore(mod, answers) { let c = 0; mod.quiz.forEach((q, i) => { if (answers?.[i] === q.a) c++; }); return c / mod.quiz.length; }
  function stepsScore(mod, steps) {
    if (!mod.steps.length) return 1; let t = 0;
    for (const s of mod.steps) { const n = R.wc(steps?.[s.id] || ''); t += Math.min(1, n / s.min); }
    return t / mod.steps.length;
  }
  function moduleTotal(mod, d) {
    d = d || {}; const f = d.final?.score ?? 0; const q = quizScore(mod, d.quiz), v = vocabScore(mod, d.vocab), s = stepsScore(mod, d.steps);
    const parts = { final: f, quiz: Math.round(q * 100), vocab: Math.round(v * 100), steps: Math.round(s * 100) };
    const total = Math.round(f * 0.6 + parts.quiz * 0.15 + parts.vocab * 0.15 + parts.steps * 0.1);
    return { parts, total };
  }
  function effective(mod, d, review) { const t = moduleTotal(mod, d); return review && typeof review.score === 'number' ? { ...t, total: review.score, tutor: true } : t; }

  const LEVELS = [[0, 'Apprentice'], [400, 'Wordsmith'], [1000, 'Storyteller'], [1800, 'Author'], [2600, 'Master Writer']];
  function level(xp) { let cur = LEVELS[0], next = null; for (let i = 0; i < LEVELS.length; i++) { if (xp >= LEVELS[i][0]) { cur = LEVELS[i]; next = LEVELS[i + 1] || null; } } return { name: cur[1], next: next ? { name: next[1], at: next[0] } : null }; }

  // progress: {modId: doc}, reviews: {modId: {score}}, mods: MODULES, currentWeek (tutor setting)
  function standing(mods, progress, reviews, free, currentWeek, totalWeeks) {
    const core = mods.filter(m => !m.bonus); let done = 0, sum = 0, xp = 0; const skill = {}; let flagged = 0;
    for (const m of mods) {
      const d = progress[m.week]; if (!d?.final) continue; const e = effective(m, d, reviews?.[m.week]);
      xp += e.total; if (!m.bonus) { done++; sum += e.total; }
      (d.final.rubric?.checks || []).forEach(c => { (skill[c.id] ||= { label: c.label, n: 0, t: 0 }); skill[c.id].n++; skill[c.id].t += c.pct; });
      if (d.final.integrity?.level === 'Review') flagged++;
    }
    const freePts = (free || []).reduce((a, b) => a + Math.round((b.score || 0) / 5), 0); xp += freePts;
    const avg = done ? Math.round(sum / done) : null;
    const expected = Math.min(currentWeek || 1, totalWeeks); const gap = done - expected;
    const status = done === 0 && expected <= 1 ? 'Just starting' : gap >= 1 ? 'Ahead' : gap >= -1 ? 'On track' : 'Behind';
    const sk = Object.values(skill).map(s => ({ label: s.label, pct: Math.round(s.t / s.n) })).sort((a, b) => b.pct - a.pct);
    return { done, expected, avg, status, xp, level: level(xp), strengths: sk.slice(0, 3), focus: sk.filter(s => s.pct < 70).slice(-3).reverse(), flagged, freePts, total: core.length };
  }
  const api = { vocabScore, quizScore, stepsScore, moduleTotal, effective, standing, level };
  if (typeof module !== 'undefined') module.exports = api; else window.Scoring = api;
})();
