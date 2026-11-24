// Rubric engine: craft checks that measure the markers taught in the lessons.
// It does NOT judge quality or originality: the tutor reviews every piece.
const STOP = new Set('the a an and or but of to in on at for with from by as is are was were be been it its i you he she they we me my your his her their our this that these those not no so if then than too very just up out into over down off about there here what which who whom when where why how all any some more most such can could will would should do does did have has had said asked'.split(' '));
const FEELINGS = 'scared afraid nervous angry sad happy excited embarrassed anxious worried upset furious terrified jealous proud lonely shy frightened annoyed mad joyful depressed delighted ashamed guilty bored tired sorry fearful horrified thrilled gloomy miserable cheerful'.split(' ');
const SENSE = {
  sight: 'dark bright shadow shadows glow glowing flicker flickered gleam gleamed glitter pale dim blurry golden silver crimson scarlet shimmer shimmering flash sparkle misty hazy colour color lit candle lantern moonlight sunlight neon'.split(' '),
  sound: 'creak creaked hum hummed whisper whispered echo echoed thud buzz buzzed silence silent rattle rattled click clicked hiss hissed murmur murmured crash bang clatter rumble rumbled ring rang tick ticked drip dripped scrape scraped squeak howl howled'.split(' '),
  smell: 'smell smelled smelt scent stink stank perfume smoke damp musty stale aroma fragrance reek sniff sniffed whiff burnt'.split(' '),
  touch: 'cold warm rough smooth sticky shiver shivered itch itchy sharp cool freezing hot soft slippery prickly goosebumps trembled tingle tingled numb gripped clutched'.split(' '),
  taste: 'taste tasted sour bitter salty sweet spicy bland metallic tangy'.split(' ')
};
const BODY = 'stomach hands hand fingers finger knees throat heart pulse shoulders neck spine skin palms palm jaw lips eyes teeth breath chest face cheeks ears legs feet toes hair forehead fists'.split(' ');
const WEAK = new Set('went got was were is are had did looked walked made put saw took came'.split(' '));
const VAGUE = new Set('thing things stuff nice good bad big really'.split(' '));
const SPEECH = 'said asked replied shouted whispered yelled muttered answered called cried snapped sighed laughed added told exclaimed demanded murmured'.split(' ');
const LY_OK = new Set('only family early lonely ugly really friendly silly lovely holy july italy reply apply supply belly jelly bully rely'.split(' '));
const MYST = 'who why secret locked missing hidden hid strange odd nobody unknown mystery clue vanished disappeared whispered suspicious key torn note footprints'.split(' ');
const CLUE = 'noticed notice strange odd mark footprint key note torn missing hid hidden suspicious clue stain smudge fingerprint receipt'.split(' ');
const RULE = 'always never must only forbidden law rule rules cannot banned allowed forbidden except unless'.split(' ');
const TRANS = 'then after suddenly meanwhile later before until when while finally soon once next first'.split(' ');

const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
function stripQuotes(t) { return t.replace(/[“"][^”"]*[”"]/g, ' '); }
function quotes(t) { const out = []; const re = /[“"]([^”"]{1,300})[”"]/g; let m; while ((m = re.exec(t))) out.push(m[1]); return out; }
function words(t) { return (t.toLowerCase().match(/[a-zà-ỹ']+/gi) || []).map(w => w.replace(/^'+|'+$/g, '')).filter(Boolean); }
function sentences(t) { return t.replace(/\s+/g, ' ').trim().split(/(?<=[.!?…])["”']?\s+/).filter(s => s.trim().length > 0); }
function wc(t) { return words(t).length; }
function distinct(list, text) { const w = new Set(words(text)); return list.filter(x => w.has(x)).length; }
function stem(w) { return w.toLowerCase().replace(/(ing|ed|es|s|ly)$/,''); }

function res(id, label, score, detail, tip) { return { id, label, score: clamp(score), detail, tip }; }

const CHECKS = {
  length(t, p) {
    const n = wc(t); let s;
    if (n >= p.min && n <= p.max) s = 1;
    else if (n < p.min) s = clamp(n / p.min) ** 1.5;
    else s = clamp(1 - (n - p.max) / (p.max * 0.8), 0.5, 1);
    return res('length', `Length (${p.min}–${p.max} words)`, s, `${n} words`, n < p.min ? `Add about ${p.min - n} more words.` : n > p.max ? 'Trim a little: tighter is stronger.' : '');
  },
  vocab(t, p) {
    const w = words(t); const found = p.words.filter(x => w.some(y => stem(y) === stem(x) || y.startsWith(stem(x)) && stem(x).length > 3));
    return res('vocab', `Uses this week's words (${p.need}+)`, found.length / p.need, `${found.length} used`, `Work in ${Math.max(0, p.need - found.length)} more of this week's words.`);
  },
  telling(t, p) {
    const n = stripQuotes(t).toLowerCase(); let c = 0;
    for (const f of FEELINGS) { const re = new RegExp(`\\b(felt|feel|feeling|was|were|is|am|are|seemed|looked|got|became)\\s+(very |so |really |extremely |too )?${f}\\b`, 'g'); c += (n.match(re) || []).length; }
    const max = p.max ?? 1;
    return res('telling', 'Shows feelings instead of naming them', c <= max ? 1 : 1 - (c - max) / 4, `${c} named feeling${c === 1 ? '' : 's'}`, 'Find "she was nervous" type lines. Replace each with what the body does or notices.');
  },
  sensory(t, p) {
    const w = new Set(words(t)); let k = 0; for (const cat in SENSE) if (SENSE[cat].some(x => w.has(x))) k++;
    return res('sensory', `Uses ${p.kinds} kinds of sense detail`, k / p.kinds, `${k} kinds`, 'Add a sound, a smell or a touch detail, not only what is seen.');
  },
  body(t, p) {
    const c = distinct(BODY, stripQuotes(t));
    return res('body', 'Body reactions', c / p.need, `${c} body words`, 'Show feeling through hands, throat, stomach, knees, breath.');
  },
  dialogue(t, p) {
    const c = quotes(t).length;
    return res('dialogue', `Dialogue (${p.need}+ spoken lines)`, c / p.need, `${c} lines`, 'Add spoken lines in quotation marks.');
  },
  beats(t, p) {
    const s = sentences(t); let c = 0;
    s.forEach((x, i) => { const hasQ = /[“"]/.test(x); if (hasQ) return; const near = (s[i - 1] && /[“"]/.test(s[i - 1])) || (s[i + 1] && /[“"]/.test(s[i + 1])); const sp = SPEECH.some(v => new RegExp(`\\b${v}\\b`, 'i').test(x)); if (near && !sp && wc(x) >= 3) c++; });
    return res('beats', `Action beats between lines (${p.need}+)`, c / p.need, `${c} beats`, 'Between spoken lines, add a small action: a gesture, a glance, a hand on something.');
  },
  tagvariety(t) {
    const w = words(t); const tags = w.filter(x => SPEECH.includes(x)); if (tags.length < 3) return res('tagvariety', 'Varied speech tags', 1, 'few tags', '');
    const said = tags.filter(x => x === 'said').length / tags.length;
    return res('tagvariety', 'Varied speech tags', 1 - clamp((said - 0.5) / 0.5), `${Math.round(said * 100)}% "said"`, 'Use a beat or a stronger verb instead of repeating "said".');
  },
  shortlast(t, p) {
    const s = sentences(t); const n = wc(s[s.length - 1] || '');
    return res('shortlast', `Last line under ${p.max} words`, n < p.max ? 1 : n <= p.max + 5 ? 0.5 : 0, `${n} words`, `Cut the last line to ${p.max - 1} words or fewer.`);
  },
  hook(t) {
    const s = sentences(t)[0] || ''; const n = wc(s); let sc = 0;
    if (!/^(hi|hello|my name is|i am going to|today i|this is a story|once upon)/i.test(s.trim())) sc += 0.4;
    if (n > 0 && n <= 22) sc += 0.3;
    if (/[?"“]|\d|^the day|^when|^before|^nobody|^no one|^everyone/i.test(s.trim()) || /\b(never|only|last|first|secret|wrong)\b/i.test(s)) sc += 0.3;
    return res('hook', 'Opening line hooks the reader', sc, `${n} words`, 'Start in the middle of a small moment, or say something a little unexpected.');
  },
  variety(t) {
    const L = sentences(t).map(wc); if (L.length < 3) return res('variety', 'Sentence variety', 0, 'few sentences', 'Mix short and long sentences.');
    const mean = L.reduce((a, b) => a + b, 0) / L.length; const sd = Math.sqrt(L.reduce((a, b) => a + (b - mean) ** 2, 0) / L.length);
    const s = (L.some(x => x <= 6) ? 0.4 : 0) + (L.some(x => x >= 14) ? 0.3 : 0) + clamp(sd / 5) * 0.3;
    return res('variety', 'Sentence variety (short and long)', s, `avg ${mean.toFixed(1)} words`, 'Use at least one very short sentence for effect and one long one.');
  },
  strongverbs(t, p) {
    const w = words(stripQuotes(t)); const n = w.length || 1; const weak = w.filter(x => WEAK.has(x)).length / n;
    const ly = w.filter(x => x.endsWith('ly') && x.length > 4 && !LY_OK.has(x)).length;
    const s = clamp(1 - Math.max(0, weak - 0.16) / 0.12) * 0.6 + clamp(1 - Math.max(0, ly - (p?.maxAdv ?? 2)) / 4) * 0.4;
    return res('strongverbs', 'Strong, specific verbs', s, `${Math.round(weak * 100)}% weak verbs, ${ly} -ly words`, 'Swap "walked slowly" for "trudged"; swap "was" or "got" for an action.');
  },
  specific(t, p) {
    const c = words(stripQuotes(t)).filter(x => VAGUE.has(x)).length; const max = p?.max ?? 3;
    return res('specific', 'Specific words (few vague ones)', c <= max ? 1 : 1 - (c - max) / 5, `${c} vague words`, 'Replace "thing", "stuff", "nice", "big", "really" with exact words.');
  },
  dodge(t, p) {
    const c = quotes(t).filter(q => wc(q) <= 3).length;
    return res('dodge', 'Short dodging answers', c / p.need, `${c} short lines`, 'Let the character answer in one to three words, or change the subject.');
  },
  escalate(t) {
    const q = quotes(t).map(wc); if (q.length < 4) return res('escalate', 'Pressure builds (lines get shorter)', 0.3, 'few lines', 'Write at least six lines of dialogue where the pushes get harder.');
    const h = Math.floor(q.length / 2); const a = q.slice(0, h).reduce((x, y) => x + y, 0) / h; const b = q.slice(h).reduce((x, y) => x + y, 0) / (q.length - h);
    return res('escalate', 'Pressure builds (lines get shorter)', b <= a ? 1 : clamp(1 - (b - a) / a), `${a.toFixed(1)} → ${b.toFixed(1)} words`, 'Make later lines shorter and tighter than early ones.');
  },
  pov(t) {
    const n = stripQuotes(t).toLowerCase(); const first = (n.match(/\b(i|me|my|mine|we|our)\b/g) || []).length; const third = (n.match(/\b(he|she|they|his|her|their|him|them)\b/g) || []).length;
    const tot = first + third; if (tot < 4) return res('pov', 'Consistent point of view', 0.7, 'few pronouns', '');
    const dom = Math.max(first, third) / tot; return res('pov', 'Consistent point of view', clamp((dom - 0.6) / 0.35), `${Math.round(dom * 100)}% one viewpoint`, 'Stay in one head: all "I" or all "he/she".');
  },
  paragraphs(t, p) { const c = t.split(/\n\s*\n|\n/).filter(x => x.trim()).length; return res('paragraphs', `Paragraphs (${p.need}+)`, c / p.need, `${c}`, 'Start a new paragraph when time, place or speaker changes.'); },
  transitions(t, p) { const c = distinct(TRANS, t); return res('transitions', 'Time and link words', c / p.need, `${c}`, 'Add words like then, later, until, suddenly.'); },
  mystery(t, p) { const c = distinct(MYST, t); return res('mystery', 'Mystery words / withheld information', c / p.need, `${c}`, 'Hint at what the reader does not know yet: a locked door, a missing key.'); },
  clues(t, p) { const c = distinct(CLUE, t); return res('clues', 'Clue details planted', c / p.need, `${c}`, 'Plant small, concrete details a reader could notice.'); },
  rules(t, p) { const c = distinct(RULE, t); return res('rules', 'World rules stated or shown', c / p.need, `${c}`, 'Say or show what is always, never, or only allowed in your world.'); },
  cultural(t, p) { const m = t.match(/(?<![.!?]\s)(?<!^)\b[A-ZÀ-Ỹ][a-zà-ỹ]{2,}/g) || []; const c = new Set(m).size; return res('cultural', 'Specific names, foods, places', c / p.need, `${c}`, 'Name a custom, a dish, a greeting, a place.'); },
  cer(t, p) {
    const x = t.toLowerCase(); const cats = { claim: /\b(i believe|we should|should|must|we need|it is time|i argue)\b/, evidence: /\b(for example|for instance|according to|studies|research|percent|%|in 20\d\d)\b|\d/, reasoning: /\b(because|this shows|which means|therefore|so that|as a result|this is why)\b/, counter: /\b(some people|critics|opponents|although|however|on the other hand|while it is true|others say)\b/ };
    const need = p.cats || Object.keys(cats); const hit = need.filter(k => cats[k].test(x)).length;
    return res('cer', `Argument parts: ${need.join(', ')}`, hit / need.length, `${hit}/${need.length}`, 'Check every part: claim, evidence, reasoning, counterargument.');
  },
  plan(t, p, ctx) {
    const fields = p.fields || []; const w = new Set(words(t).map(stem)); let hit = 0, tot = 0;
    for (const f of fields) { const v = ctx.plan?.[f]; if (!v) continue; tot++; const keys = words(v).filter(x => x.length > 3 && !STOP.has(x)).map(stem); if (keys.some(k => w.has(k))) hit++; }
    return res('plan', 'Follows your plan', tot ? hit / tot : 0.6, tot ? `${hit}/${tot} plan items` : 'no plan', 'Bring the items from your planning steps into the piece.');
  },
  payoff(t, p, ctx) {
    const v = ctx.plan?.[p.field]; if (!v) return res('payoff', 'Plant early, pay off late', 0.5, 'no plan', 'Fill in your plan first.');
    const keys = words(v).filter(x => x.length > 3 && !STOP.has(x)).map(stem); const w = words(t).map(stem); const n = w.length;
    const first = w.slice(0, Math.floor(n * 0.45)), last = w.slice(Math.floor(n * 0.55));
    const e = keys.some(k => first.includes(k)), l = keys.some(k => last.includes(k));
    return res('payoff', 'Plant early, pay off late', (e ? 0.5 : 0) + (l ? 0.5 : 0), `${e ? 'planted' : 'not planted'}, ${l ? 'paid off' : 'no payoff'}`, 'Mention your detail in the first half, then bring it back near the end.');
  },
  repetition(t) {
    const w = words(t).filter(x => x.length > 3 && !STOP.has(x)); if (w.length < 20) return res('repetition', 'Fresh word choice', 0.6, 'short', '');
    const f = {}; w.forEach(x => f[x] = (f[x] || 0) + 1); const top = Math.max(...Object.values(f)) / w.length;
    return res('repetition', 'Fresh word choice (little repetition)', 1 - clamp((top - 0.04) / 0.06), `top word ${(top * 100).toFixed(0)}%`, 'One word keeps coming back. Find synonyms.');
  },
  mechanics(t) {
    const s = sentences(t); if (!s.length) return res('mechanics', 'Capitals and punctuation', 0, '', '');
    const cap = s.filter(x => /^["“'‘]?[A-ZÀ-Ỹ0-9]/.test(x.trim())).length / s.length; const end = /[.!?…"”']$/.test(t.trim()) ? 1 : 0; const lowI = (t.match(/(^|\s)i(\s|')/g) || []).length === 0 ? 1 : 0;
    return res('mechanics', 'Capitals and punctuation', cap * 0.6 + end * 0.2 + lowI * 0.2, `${Math.round(cap * 100)}% capitalised`, 'Start every sentence with a capital, write "I" as a capital, and end with punctuation.');
  }
};

// default params for skills carried forward into later modules
const CARRY = {
  telling: { id: 'telling', p: { max: 1 } }, strongverbs: { id: 'strongverbs', p: {} }, hook: { id: 'hook', p: {} }, sensory: { id: 'sensory', p: { kinds: 2 } },
  specific: { id: 'specific', p: { max: 3 } }, variety: { id: 'variety', p: {} }, body: { id: 'body', p: { need: 2 } }, shortlast: { id: 'shortlast', p: { max: 10 } }
};

function run(spec, text, ctx) { return CHECKS[spec.id](text, spec.p || {}, ctx || {}); }

function scorePiece(text, mod, plan) {
  const ctx = { plan }; const fin = mod.final;
  const newRes = fin.rubric.map(s => ({ ...run(s, text, ctx), weight: s.weight || 1 }));
  const wsum = newRes.reduce((a, b) => a + b.weight, 0) || 1; const newScore = newRes.reduce((a, b) => a + b.score * b.weight, 0) / wsum;
  const carryRes = (fin.carry || []).map(id => run(CARRY[id], text, ctx));
  const carryScore = carryRes.length ? carryRes.reduce((a, b) => a + b.score, 0) / carryRes.length : null;
  const genRes = [run({ id: 'length', p: { min: fin.min, max: fin.max } }, text, ctx), run({ id: 'mechanics' }, text, ctx), run({ id: 'repetition' }, text, ctx)];
  const genScore = genRes[0].score * 0.5 + genRes[1].score * 0.3 + genRes[2].score * 0.2;
  const total = carryScore === null ? 0.8 * newScore + 0.2 * genScore : 0.62 * newScore + 0.2 * carryScore + 0.18 * genScore;
  const all = [...newRes, ...carryRes, ...genRes];
  const stars = [...newRes].sort((a, b) => b.score - a.score).filter(r => r.score >= 0.7).slice(0, 2);
  const wish = [...all].sort((a, b) => a.score - b.score).find(r => r.score < 0.7 && r.tip);
  return { score: Math.round(total * 100), parts: { new: Math.round(newScore * 100), carry: carryScore === null ? null : Math.round(carryScore * 100), general: Math.round(genScore * 100) }, checks: all.map(r => ({ id: r.id, label: r.label, pct: Math.round(r.score * 100), detail: r.detail, tip: r.tip })), stars: stars.map(r => r.label + (r.detail ? ' (' + r.detail + ')' : '')), wish: wish ? wish.tip : '' };
}

// Free-write score (no lesson): general craft only
function scoreFree(text, level) {
  const mod = { final: { min: 120, max: 600, rubric: [{ id: 'hook', weight: 1 }, { id: 'sensory', p: { kinds: 2 }, weight: 1 }, { id: 'telling', p: { max: 1 }, weight: 1 }, { id: 'variety', weight: 1 }, { id: 'strongverbs', weight: 1 }, { id: 'specific', weight: 1 }, { id: 'pov', weight: 0.5 }], carry: [] } };
  return scorePiece(text, mod, {});
}

// Integrity from editor telemetry
function integrity(tel, finalLen, prior) {
  const flags = []; if (!tel) return { level: 'Unknown', flags: ['no telemetry'] };
  if (tel.pasteBlocked > 0) flags.push(`${tel.pasteBlocked} paste/drop attempt(s) blocked`);
  if (tel.bigJumps > 0) flags.push(`${tel.bigJumps} large sudden insertion(s)`);
  if (finalLen > 40 && tel.typedChars < finalLen * 0.8) flags.push('final text is much longer than what was typed');
  const mins = (tel.activeMs || 0) / 60000; const w = finalLen / 5.5; if (mins > 0.3 && w / mins > 80) flags.push('typing speed is unusually high');
  if (tel.focusLosses >= 6) flags.push(`left the page ${tel.focusLosses} times (${Math.round((tel.focusMs || 0) / 1000)}s away)`);
  if (finalLen > 400 && mins < 3) flags.push('very little time spent writing');
  if (prior && prior.avgSent) { const cur = fingerprint(tel.text || ''); if (cur.avgSent && Math.abs(cur.avgSent - prior.avgSent) / prior.avgSent > 0.6 && finalLen > 400) flags.push('style differs a lot from earlier pieces'); }
  const level = flags.length === 0 ? 'Clear' : (flags.length >= 3 || tel.pasteBlocked > 2 || tel.bigJumps > 1) ? 'Review' : 'Check';
  return { level, flags };
}
function fingerprint(text) { const s = sentences(text); const w = words(text); return { avgSent: s.length ? w.length / s.length : 0, avgWord: w.length ? w.join('').length / w.length : 0 }; }

const api = { CHECKS, CARRY, scorePiece, scoreFree, integrity, fingerprint, wc, sentences, words, quotes };
if (typeof module !== 'undefined') module.exports = api; else window.Rubric = api;
