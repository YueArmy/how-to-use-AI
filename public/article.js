(() => {
  'use strict';
  const article = document.querySelector('#article');
  if (!article) return;
  const copyArticleButton = document.querySelector('[data-copy-article]');
  if (copyArticleButton) {
    const copyStatus = document.querySelector('.article-source-status');
    copyArticleButton.addEventListener('click', async () => {
      copyArticleButton.disabled = true;
      copyStatus.textContent = '本文をコピーしています…';
      try {
        const response = await fetch(copyArticleButton.dataset.copyArticle);
        if (!response.ok) throw new Error('本文を取得できませんでした');
        await navigator.clipboard.writeText(await response.text());
        copyStatus.textContent = '本文をコピーしました。AIの入力欄に貼り付けて使えます。';
        if (typeof window.aiTrack === 'function') window.aiTrack('article_copy');
      } catch (_) {
        copyStatus.textContent = 'コピーできませんでした。Markdownをダウンロードして添付してください。';
      } finally {
        copyArticleButton.disabled = false;
      }
    });
  }
  const sections = Array.from(article.querySelectorAll('section[id]'));
  const links = Array.from(document.querySelectorAll('[data-section]'));
  const menu = document.querySelector('#mobile-toc');
  const toggle = document.querySelector('#toc-toggle');
  const scrim = document.querySelector('#toc-scrim');
  const close = document.querySelector('#toc-close');
  const mq = window.matchMedia('(max-width: 860px)');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const key = article.dataset.progressKey || 'ai-practice-section-progress-v2';
  const seen = new Set();
  let passed = new Set();
  // --- 計測用（画面の✓とは別に、この閲覧の中だけで判定する） ---
  // 画面の✓はブラウザに保存されて次回も残るが、計測は毎回の閲覧ごとに数えたいので分けている。
  const track = (name, params) => { if (typeof window.aiTrack === 'function') window.aiTrack(name, params); };
  const sectionTitle = id => {
    const heading = document.getElementById(id)?.querySelector('h2');
    if (!heading) return '';
    const clone = heading.cloneNode(true);
    clone.querySelectorAll('.chapter-label').forEach(label => label.remove());
    return clone.textContent.trim().slice(0, 100);
  };
  const viewTracked = new Set();
  const passTracked = new Set();
  let completeTracked = false;
  let dwellSection = '';
  let dwellStart = 0;
  let dwellTotal = 0;
  function flushDwell() {
    if (!dwellSection) return;
    if (dwellStart) dwellTotal += Date.now() - dwellStart;
    const seconds = Math.round(dwellTotal / 1000);
    if (seconds >= 1) track('section_dwell', { section_id: dwellSection, section_title: sectionTitle(dwellSection), seconds });
    dwellTotal = 0;
    dwellStart = document.visibilityState === 'visible' ? Date.now() : 0;
  }
  function setDwellSection(id) {
    if (id === dwellSection) return;
    flushDwell();
    dwellSection = id;
    dwellStart = id && document.visibilityState === 'visible' ? Date.now() : 0;
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushDwell();
      dwellStart = 0;
    } else if (dwellSection) {
      dwellStart = Date.now();
    }
  });
  window.addEventListener('pagehide', flushDwell);
  // --- 計測用ここまで ---
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
      const reachedEnd = !navigating && seen.has(section.id) && rect.bottom <= window.innerHeight - 40 && rect.bottom > topLine;
      if (reachedEnd && !passed.has(section.id)) {
        passed.add(section.id); changed = true;
      }
      // 計測：画面の✓と同じ基準で、この閲覧の中で初めて「見えた」「読み終えた」ときに1回だけ記録
      if (seen.has(section.id) && !viewTracked.has(section.id)) {
        viewTracked.add(section.id);
        track('section_view', { section_id: section.id, section_title: sectionTitle(section.id) });
      }
      if (reachedEnd && !passTracked.has(section.id)) {
        passTracked.add(section.id);
        track('section_pass', { section_id: section.id, section_title: sectionTitle(section.id) });
      }
    });
    if (!completeTracked && sections.length && passTracked.size === sections.length) {
      completeTracked = true;
      track('article_complete', { sections: sections.length });
    }
    setDwellSection(current || "intro");
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
    target.scrollIntoView({behavior:reduced.matches ? 'auto' : 'smooth', block:'start'});
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
    passed.clear(); seen.clear(); persist(); updateMarks(); status('進捗をリセットしました。');
  }));
  // Use the article's actual length; navigation and decorative labels do not count.
  const chars = Array.from(article.querySelectorAll('p')).map(p => p.textContent).join('').replace(/\s/g, '').length;
  const readingMinutes = document.querySelector('#reading-minutes');
  readingMinutes.textContent = readingMinutes.dataset.fixedMinutes || Math.max(1, Math.ceil(chars / 600));
  updateMarks();
  // Keep direct section links intact when fonts and images finish loading.
  if (location.hash) {
    navigating = true;
    window.addEventListener('load', () => {
      const target = document.getElementById(location.hash.slice(1));
      if (target) { target.scrollIntoView({behavior:'auto'}); target.setAttribute('tabindex','-1'); target.focus({preventScroll:true}); }
      navigating = false; queueUpdate();
    }, {once:true});
  }
  window.addEventListener('load', queueUpdate, {once:true});
  if (document.fonts) document.fonts.ready.then(queueUpdate);
  update();
})();
