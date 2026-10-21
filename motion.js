'use strict';
/* Motion layer for East of Eden × Super Mario.
   Observes the DOM that game.js already drives (dialog, HUD, overlay) and adds
   motion on top, so the game logic stays untouched. Patterns adapted from
   motionsites.ai examples: hero letter reveals, staggered fade-ups, tilt cards
   with shimmer, typewriter/word reveals, big-type chapter cards, marquee bands,
   scroll-scrubbed text, interactive particle fields and scanline overlays. */
(() => {
  const $ = id => document.getElementById(id);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(pointer: fine)');
  const isRunning = () => typeof running !== 'undefined' && running;
  const restart = (el, cls) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };

  /* ---------- 1. Headline letter reveal ---------- */
  const h1 = document.querySelector('main > h1');
  if (h1) {
    h1.setAttribute('aria-label', h1.textContent.replace(/\s+/g, ' ').trim());
    let i = 0;
    const split = node => {
      [...node.childNodes].forEach(n => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          for (const ch of n.textContent) {
            const s = document.createElement('span');
            if (ch === ' ') s.className = 'sp';
            else { s.className = 'ch'; s.textContent = ch; s.style.setProperty('--i', i++); }
            s.setAttribute('aria-hidden', 'true');
            frag.append(s);
          }
          n.replaceWith(frag);
        } else if (n.nodeType === 1) { n.setAttribute('aria-hidden', 'true'); n.style.setProperty('--i', i++); n.classList.add('ch'); }
      });
    };
    split(h1);
  }

  /* ---------- 2. Staggered entrances on the opening screen ---------- */
  const stagger = (els, base = 0, step = 70) =>
    els.filter(Boolean).forEach((el, n) => { el.style.setProperty('--d', base + n * step + 'ms'); el.classList.add('rise'); });
  stagger([document.querySelector('main > .eyebrow')], 0);
  stagger([document.querySelector('.game')], 380);
  const opening = document.querySelector('#overlay.opening .card');
  if (opening) stagger([...opening.querySelectorAll('.start-brand, h2, :scope > p, .character-card, .start-help, #continue, .start-credit')], 520, 80);

  /* ---------- 3. Character cards: pointer tilt + glare ---------- */
  document.querySelectorAll('.character-card').forEach(card => {
    card.addEventListener('pointermove', e => {
      if (!fine.matches || reduce.matches) return;
      const r = card.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      card.classList.add('tilting');
      card.style.setProperty('--ry', (x - .5) * 16 + 'deg');
      card.style.setProperty('--rx', (.5 - y) * 14 + 'deg');
      card.style.setProperty('--gx', x * 100 + '%');
      card.style.setProperty('--gy', y * 100 + '%');
    });
    card.addEventListener('pointerleave', () => {
      card.classList.remove('tilting');
      card.style.setProperty('--rx', '0deg'); card.style.setProperty('--ry', '0deg');
    });
  });

  /* ---------- 4. Pixel blossoms that drift and scatter from the cursor ---------- */
  const overlay = $('overlay');
  const petalCanvas = document.createElement('canvas');
  petalCanvas.className = 'petals'; petalCanvas.setAttribute('aria-hidden', 'true');
  overlay.prepend(petalCanvas);
  const pg = petalCanvas.getContext('2d');
  const palette = ['#ffd6e4', '#ffb3c9', '#fff4d6', '#e34c35', '#7cc36b', '#ffd33c'];
  let petals = [], pointer = { x: -999, y: -999 }, petalRAF = 0, lastT = 0, PX = 3;
  const sizePetals = () => {
    const r = petalCanvas.getBoundingClientRect();
    petalCanvas.width = Math.max(1, Math.round(r.width / PX));
    petalCanvas.height = Math.max(1, Math.round(r.height / PX));
    if (!petals.length) petals = Array.from({ length: Math.round(petalCanvas.width * petalCanvas.height / 900) + 18 }, () => seed(true));
  };
  const seed = (anywhere = false) => ({
    x: Math.random() * petalCanvas.width, y: anywhere ? Math.random() * petalCanvas.height : -4,
    vx: 0, vy: 6 + Math.random() * 10, ph: Math.random() * 6.28, s: Math.random() < .25 ? 2 : 1,
    c: palette[(Math.random() * palette.length) | 0]
  });
  const petalLoop = t => {
    const dt = Math.min(.05, (t - lastT) / 1000 || 0); lastT = t;
    pg.clearRect(0, 0, petalCanvas.width, petalCanvas.height);
    const px = pointer.x / PX, py = pointer.y / PX;
    for (const p of petals) {
      const dx = p.x - px, dy = p.y - py, d2 = dx * dx + dy * dy;
      if (d2 < 900) { const f = (900 - d2) / 900 * 140; const d = Math.sqrt(d2) || 1; p.vx += dx / d * f * dt; p.vy += dy / d * f * dt; }
      p.vx *= .96; p.vy += (8 + p.s * 4 - p.vy) * .02;
      p.ph += dt * 2;
      p.x += (p.vx + Math.sin(p.ph) * 6) * dt; p.y += p.vy * dt;
      if (p.y > petalCanvas.height + 3 || p.x < -6 || p.x > petalCanvas.width + 6) Object.assign(p, seed());
      pg.fillStyle = p.c; pg.globalAlpha = p.c === '#fff4d6' ? .8 : .9;
      pg.fillRect(p.x | 0, p.y | 0, p.s + (Math.sin(p.ph * 2) > 0 ? 1 : 0), p.s);
    }
    pg.globalAlpha = 1;
    petalRAF = requestAnimationFrame(petalLoop);
  };
  const syncPetals = () => {
    const show = !overlay.hidden && overlay.classList.contains('opening') && !reduce.matches;
    if (show && !petalRAF) { sizePetals(); lastT = performance.now(); petalRAF = requestAnimationFrame(petalLoop); }
    if (!show && petalRAF) { cancelAnimationFrame(petalRAF); petalRAF = 0; }
  };
  overlay.addEventListener('pointermove', e => { const r = petalCanvas.getBoundingClientRect(); pointer = { x: e.clientX - r.left, y: e.clientY - r.top }; });
  overlay.addEventListener('pointerleave', () => { pointer = { x: -999, y: -999 }; });
  addEventListener('resize', () => { if (petalRAF) { petals = []; sizePetals(); } });

  /* ---------- 5. Chapter title card ---------- */
  const game = document.querySelector('.game');
  const cc = document.createElement('div');
  cc.className = 'chapter-card'; cc.setAttribute('aria-hidden', 'true');
  cc.innerHTML = '<div class="wipe"></div><div class="inner"><span class="num"></span><span class="title"></span><span class="who"></span></div>';
  game.append(cc);
  let ccUntil = 0, lastChapter = $('chapter').textContent;
  const playChapter = text => {
    const m = text.match(/^(\d+)\s*\/\s*(.*?)(?:\s*·\s*(.+))?$/);
    if (!m || reduce.matches) return;
    cc.querySelector('.num').textContent = m[1];
    cc.querySelector('.title').textContent = m[2];
    cc.querySelector('.who').textContent = m[3] ? 'YOU ARE ' + m[3] : '';
    restart(cc, 'play');
    ccUntil = performance.now() + 1450;
    if (typeof tone === 'function') { try { tone(330); setTimeout(() => tone(495), 140); } catch {} }
  };
  let lastPlayed = 0;
  const showChapter = t => { if (performance.now() - lastPlayed < 400) return; lastPlayed = performance.now(); playChapter(t); };
  new MutationObserver(() => {
    const t = $('chapter').textContent;
    if (t !== lastChapter) { if (isRunning()) showChapter(t); else restart($('chapter'), 'bump'); lastChapter = t; }
  }).observe($('chapter'), { childList: true, characterData: true, subtree: true });

  /* ---------- 6. Dialog: panel entrance, line-up title, word reveal, numbered choices ---------- */
  const dialog = $('dialog');
  let reveal = null; // { words, i, timer, done() }
  const finishReveal = () => { if (reveal) reveal.complete(); };
  const runDialog = () => {
    if (dialog.hidden) { if (reveal) { clearTimeout(reveal.timer); reveal = null; } return; }
    const p = dialog.querySelector(':scope > p');
    if (!p || p.dataset.mo) return;
    p.dataset.mo = '1';
    if (reveal) clearTimeout(reveal.timer);
    restart(dialog, 'enter');

    const h3 = dialog.querySelector(':scope > h3');
    if (h3 && !reduce.matches) {
      h3.setAttribute('aria-label', h3.textContent);
      h3.innerHTML = h3.textContent.split(' ').map((w, i) => `<span class="ln" aria-hidden="true"><span style="--i:${i}">${w.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</span></span>`).join(' ');
    }

    const buttons = [...dialog.querySelectorAll(':scope > button')];
    buttons.forEach((b, n) => { if (buttons.length > 1) b.dataset.n = n + 1; });
    if (reduce.matches) return;

    // Full text stays in the DOM (screen readers get it immediately); words fade in visually.
    const words = p.textContent.split(/(\s+)/);
    p.textContent = '';
    p.classList.add('story-text');
    const spans = [];
    words.forEach(w => {
      if (/^\s+$/.test(w)) { p.append(w); return; }
      const s = document.createElement('span'); s.className = 'w'; s.textContent = w; p.append(s); spans.push(s);
    });
    const caret = document.createElement('span'); caret.className = 'caret'; caret.setAttribute('aria-hidden', 'true');
    const hint = document.createElement('small'); hint.className = 'skip-hint';
    hint.textContent = fine.matches ? 'CLICK OR PRESS ENTER TO SKIP' : 'TAP TO SKIP';
    p.after(hint);
    buttons.forEach(b => b.classList.add('await'));

    const state = { i: 0, timer: 0 };
    const showButtons = () => {
      caret.remove(); hint.classList.add('gone');
      buttons.forEach((b, n) => { b.classList.remove('await'); b.style.setProperty('--d', n * 90 + 'ms'); restart(b, 'reveal'); });
      if (fine.matches) setTimeout(() => { if (!dialog.hidden && buttons[0]?.isConnected) buttons[0].focus({ preventScroll: true }); }, 60);
    };
    state.complete = () => {
      clearTimeout(state.timer);
      spans.forEach(s => s.classList.add('on'));
      reveal = null; showButtons();
    };
    const step = () => {
      const s = spans[state.i++];
      if (!s) return state.complete();
      s.classList.add('on'); s.after(caret);
      const pause = /[.?!:]["”’)]?$/.test(s.textContent) ? 260 : /[,;—]$/.test(s.textContent) ? 120 : 0;
      state.timer = setTimeout(step, 34 + pause);
    };
    reveal = state;
    // Defer a tick so a chapter card triggered by the same change can register first.
    state.timer = setTimeout(() => { state.timer = setTimeout(step, Math.max(0, ccUntil - performance.now()) + 260); }, 0);
  };
  new MutationObserver(runDialog).observe(dialog, { childList: true, attributes: true, attributeFilter: ['hidden'] });
  dialog.addEventListener('pointerdown', e => { if (reveal && !e.target.closest('button')) { e.preventDefault(); finishReveal(); } });
  addEventListener('keydown', e => {
    if (dialog.hidden || e.repeat) return;
    if (reveal && ['Enter', ' ', 'e', 'E', 'Escape'].includes(e.key)) { e.preventDefault(); e.stopImmediatePropagation(); finishReveal(); return; }
    if (!reveal && /^[1-9]$/.test(e.key)) {
      const b = dialog.querySelector(`:scope > button[data-n="${e.key}"]`);
      if (b) { e.preventDefault(); b.click(); }
    }
  }, true);

  /* ---------- 7. HUD + evolution note feedback ---------- */
  const apples = $('apples');
  let lastApples = '';
  new MutationObserver(() => {
    const t = apples.textContent;
    if (t !== lastApples) { if (lastApples && isRunning() && !reduce.matches) restart(apples, 'bump'); lastApples = t; }
  }).observe(apples, { childList: true, characterData: true, subtree: true });

  const evo = $('evolution');
  new MutationObserver(() => { if (isRunning() && !reduce.matches) restart(evo, 'changed'); })
    .observe(evo, { childList: true, characterData: true, subtree: true });

  /* ---------- 8. Pause veil ---------- */
  const veil = document.createElement('div');
  veil.className = 'pause-veil';
  veil.innerHTML = '<div><span>PAUSED</span><small>CLICK OR PRESS P TO RESUME</small></div>';
  veil.addEventListener('click', () => { if (typeof togglePause === 'function') togglePause(); });
  game.append(veil);
  new MutationObserver(() => game.classList.toggle('is-paused', $('pause').textContent.trim() === 'RESUME'))
    .observe($('pause'), { childList: true, characterData: true, subtree: true });

  /* ---------- 9. Overlay: petals on the opening screen, staggered ending ---------- */
  let wasOpening = overlay.classList.contains('opening') && !overlay.hidden;
  new MutationObserver(() => {
    syncPetals();
    // Leaving the character select starts (or resumes) a story: open with its chapter card.
    if (wasOpening && overlay.hidden && isRunning()) showChapter($('chapter').textContent);
    wasOpening = overlay.classList.contains('opening') && !overlay.hidden;
    if (!overlay.hidden && !overlay.classList.contains('opening')) {
      [...overlay.querySelectorAll('.card > *')].forEach((el, i) => el.style.setProperty('--i', i));
    }
  }).observe(overlay, { attributes: true, attributeFilter: ['hidden', 'class'] });
  syncPetals();

  /* ---------- 10. Theme marquee ---------- */
  const themes = ['FAVOURITISM', 'INHERITED WRONGDOING', 'HALO EFFECT', 'PROJECTION', 'MORAL PURITY', 'TRUTH AS A WEAPON', 'TIMSHEL'];
  const band = document.createElement('div');
  band.className = 'marquee'; band.setAttribute('aria-hidden', 'true');
  const run = themes.map(t => `<span>${t}</span><b>✦</b>`).join('');
  band.innerHTML = `<div class="track">${run}${run}${run}${run}</div>`;
  document.querySelector('main > footer')?.after(band);

  /* ---------- 11. Scroll-driven reveals ---------- */
  const section = document.querySelector('main > section');
  const line = section?.querySelector('p:not(.sources)');
  let scrubWords = [];
  if (line) {
    line.classList.add('scrub');
    const words = line.textContent.split(' ');
    line.setAttribute('aria-label', line.textContent);
    line.innerHTML = words.map(w => `<span class="w" aria-hidden="true">${w}</span>`).join(' ');
    scrubWords = [...line.querySelectorAll('.w')];
  }
  const scrub = () => {
    if (!line) return;
    if (reduce.matches) { scrubWords.forEach(w => w.classList.add('on')); return; }
    const r = line.getBoundingClientRect(), vh = innerHeight;
    const atEnd = innerHeight + scrollY >= document.documentElement.scrollHeight - 4;
    const prog = atEnd ? 1 : Math.min(1, Math.max(0, (vh * .95 - r.top) / (vh * .3)));
    const n = Math.round(prog * scrubWords.length);
    scrubWords.forEach((w, i) => w.classList.toggle('on', i < n));
  };
  addEventListener('scroll', scrub, { passive: true }); addEventListener('resize', scrub); scrub();

  const later = [section?.querySelector('.eyebrow'), section?.querySelector('small'), section?.querySelector('.sources'), band].filter(Boolean);
  later.forEach(el => el.classList.add('reveal-on-scroll'));
  const io = new IntersectionObserver(entries => entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }), { threshold: .15 });
  later.forEach(el => io.observe(el));
})();
