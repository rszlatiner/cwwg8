// Protected writing box: no paste/drop/spellcheck/autocomplete, and records how the text was produced.
window.Guard = (function () {
  function blank() { return { typedChars: 0, pasteBlocked: 0, bigJumps: 0, focusLosses: 0, focusMs: 0, activeMs: 0, keystrokes: 0, deletions: 0 }; }
  function attach(el, tel, onWarn) {
    tel = Object.assign(blank(), tel || {});
    for (const [k, v] of Object.entries({ spellcheck: 'false', autocomplete: 'off', autocorrect: 'off', autocapitalize: 'sentences', translate: 'no', 'data-gramm': 'false', 'data-gramm_editor': 'false', 'data-enable-grammarly': 'false', 'data-lpignore': 'true', 'data-1p-ignore': 'true' })) el.setAttribute(k, v);
    let last = el.value.length, lastT = 0, composing = false, blurAt = 0;
    const warn = m => { try { onWarn && onWarn(m); } catch (e) {} };
    const stop = (e, label) => { e.preventDefault(); tel.pasteBlocked++; warn(label); };
    const L = [];
    const on = (t, f, tgt) => { (tgt || el).addEventListener(t, f); L.push([tgt || el, t, f]); };
    on('paste', e => stop(e, 'Pasting is turned off. Type your own words.'));
    on('drop', e => stop(e, 'Dropping text is turned off. Type your own words.'));
    on('dragover', e => e.preventDefault());
    on('contextmenu', e => e.preventDefault());
    on('keydown', e => {
      tel.keystrokes++;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v' || (e.shiftKey && e.key === 'Insert')) stop(e, 'Pasting is turned off. Type your own words.');
    });
    on('beforeinput', e => { if (/^insertFrom(Paste|Drop|Yank|PasteAsQuotation)$/.test(e.inputType || '')) stop(e, 'Pasting is turned off. Type your own words.'); });
    on('compositionstart', () => composing = true); on('compositionend', () => composing = false);
    on('input', () => {
      const n = el.value.length, d = n - last, now = Date.now();
      if (d > 0) { if (d > 20 && !composing) { tel.bigJumps++; warn('That looked like a big sudden insertion. Please type your own words.'); } else tel.typedChars += d; }
      else if (d < 0) tel.deletions += -d;
      if (lastT && now - lastT < 5000) tel.activeMs += now - lastT; lastT = now; last = n;
    });
    const hide = () => { if (!blurAt) { blurAt = Date.now(); tel.focusLosses++; } };
    const show = () => { if (blurAt) { tel.focusMs += Date.now() - blurAt; blurAt = 0; } };
    on('visibilitychange', () => document.hidden ? hide() : show(), document);
    on('blur', hide, window); on('focus', show, window);
    return { tel, destroy() { L.forEach(([t, ev, f]) => t.removeEventListener(ev, f)); }, reset(v) { last = (v ?? '').length; } };
  }
  return { attach, blank };
})();
