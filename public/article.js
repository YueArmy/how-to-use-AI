(() => {
  'use strict';
  const article = document.querySelector('#article');
  if (!article) return;
  const sections = Array.from(article.querySelectorAll('section[id]'));
  const links = Array.from(document.querySelectorAll('[data-section]'));
  const menu = document.querySelector('#mobile-toc');
  const toggle = document.querySelector('#toc-toggle');
  const scrim = document.querySelector('#toc-scrim');
  const close = document.querySelector('#toc-close');
  const mq = window.matchMedia('(max-width: 860px)');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const key = 'ai-practice-section-progress-v2';
  const seen = new Set();
  let passed = new Set();
  let frame = 0;
  let navigating = false;
  let navigationTimer;
  let previousFocus;
  try {
    const saved = JSON.parse(localStorage.getItem(key) || '[]');
    if (Array.isArray(saved)) passed = new Set(saved.filter(id => sections.some(s => s.id === id)));
  } catch (_) {}
  const persist = () => { try { localStorage.setItem(key, JSON.stringify([...passed])); } catch (_) {} };
  const status = text => { document.querySelector('#reader-status').textContent = text; };
  function updateMarks() {
    links.forEach(link => {
      link.querySelector('.read-mark').textContent = passed.has(link.dataset.section) ? '✓' : '';
    });
    document.querySelectorAll('[data-read-count]').forEach(label => { label.textContent = `${passed.size} / ${sections.length} セクション通過`; });
    document.querySelector('#reading-complete').hidden = passed.size !== sections.length;
  }
  function setMenu(open, restoreFocus = false) {
    menu.hidden = !open;
    scrim.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    if (open) {
      previousFocus = document.activeElement;
      (menu.querySelector('[aria-current="location"]') || close).focus({preventScroll:true});
    } else if (restoreFocus && previousFocus) previousFocus.focus({preventScroll:true});
  }
  toggle.addEventListener('click', () => setMenu(menu.hidden, !menu.hidden));
  close.addEventListener('click', () => setMenu(false, true));
  scrim.addEventListener('click', () => setMenu(false, true));
  document.addEventListener('keydown', event => {
    if (menu.hidden) return;
    if (event.key === 'Escape') { event.preventDefault(); setMenu(false, true); }
    if (event.key === 'Tab') {
      const focusable = Array.from(menu.querySelectorAll('a, button'));
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
  mq.addEventListener('change', () => setMenu(false));
  function update() {
    frame = 0;
    const y = window.scrollY;
    const articleStart = article.getBoundingClientRect().top + y;
    const ending = document.querySelector('#article-ending');
    const end = (ending || sections.at(-1)).getBoundingClientRect().bottom + y;
    const start = articleStart - (mq.matches ? 72 : 32);
    const finish = Math.max(start + 1, end - window.innerHeight + 40);
    const fraction = Math.min(1, Math.max(0, (y - start) / (finish - start)));
    const percent = `${Math.round(fraction * 100)}%`;
    document.querySelector('#reading-fill').style.transform = `scaleX(${fraction})`;
    document.querySelector('#desktop-position').textContent = percent;
    document.querySelector('#mobile-position').textContent = percent;
    let current = '';
    let changed = false;
    const topLine = mq.matches ? 84 : 55;
    sections.forEach(section => {
      const rect = section.getBoundingClientRect();
      if (rect.top <= topLine) current = section.id;
      if (!navigating && rect.top >= topLine - 200 && rect.top < window.innerHeight * .8) seen.add(section.id);
      if (!navigating && seen.has(section.id) && rect.bottom <= window.innerHeight - 40 && rect.bottom > topLine && !passed.has(section.id)) {
        passed.add(section.id); changed = true;
      }
    });
    links.forEach(link => {
      if (link.dataset.section === current) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    if (changed) { persist(); updateMarks(); }
  }
  const queueUpdate = () => { if (!frame) frame = requestAnimationFrame(update); };
  window.addEventListener('scroll', queueUpdate, {passive:true});
  window.addEventListener('resize', queueUpdate);
  function navigate(target, hash, push = true) {
    navigating = true;
    clearTimeout(navigationTimer);
    setMenu(false);
    if (push && location.hash !== hash) history.pushState(null, '', hash);
    target.setAttribute('tabindex', '-1');
    target.focus({preventScroll:true});
    target.scrollIntoView({behavior:reduced.matches ? 'instant' : 'smooth', block:'start'});
    navigationTimer = setTimeout(() => { navigating = false; queueUpdate(); }, reduced.matches ? 50 : 1200);
  }
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const hash = link.getAttribute('href');
      const target = document.getElementById(hash.slice(1));
      if (!target) return;
      event.preventDefault();
      navigate(target, hash);
    });
  });
  window.addEventListener('hashchange', () => {
    const target = document.getElementById(location.hash.slice(1));
    if (target) navigate(target, location.hash, false);
  });
  document.querySelectorAll('.reset-read').forEach(button => button.addEventListener('click', () => {
    passed.clear(); seen.clear(); persist(); updateMarks(); status('通過記録をリセットしました。');
  }));
  // Use the article's actual length; navigation and decorative labels do not count.
  const chars = Array.from(article.querySelectorAll('p')).map(p => p.textContent).join('').replace(/\s/g, '').length;
  document.querySelector('#reading-minutes').textContent = Math.max(1, Math.ceil(chars / 600));
  updateMarks();
  // Keep direct section links intact when fonts and images finish loading.
  if (location.hash) {
    navigating = true;
    window.addEventListener('load', () => {
      const target = document.getElementById(location.hash.slice(1));
      if (target) { target.scrollIntoView({behavior:'instant'}); target.setAttribute('tabindex','-1'); target.focus({preventScroll:true}); }
      navigating = false; queueUpdate();
    }, {once:true});
  }
  window.addEventListener('load', queueUpdate, {once:true});
  if (document.fonts) document.fonts.ready.then(queueUpdate);
  update();
})();
