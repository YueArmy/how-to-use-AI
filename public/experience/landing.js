import { buildConsultation, LENS_LABELS } from './prompt-builder.mjs';

const root = document.documentElement;
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const clamp = value => Math.min(1, Math.max(0, value));
const storage = {
  read(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } },
  write(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Device storage is optional. */ } }
};
const toast = $('#status');
let toastTimer;
function announce(message) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add('visible');
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 4500);
}

// Readable by default, including when motion or scripting is unavailable.
root.classList.add('js');
if ('IntersectionObserver' in window) {
  root.classList.add('motion-ready');
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }
  }, { rootMargin: '0px 0px -20px 0px', threshold: .04 });
  $$('.reveal').forEach(element => observer.observe(element));
}

// One closing CTA reveals the local composer; no dialog or new page is needed.
const consultation = $('#consultation');
const consultationTitle = $('#consultation-title');
function focusConsultation() {
  consultationTitle.focus({ preventScroll: true });
  consultationTitle.scrollIntoView({ behavior: reduced.matches ? 'instant' : 'smooth', block: 'start' });
}
function openConsultation() {
  if (consultation.open) focusConsultation();
  else consultation.open = true;
}
consultation.addEventListener('toggle', () => {
  if (consultation.open) requestAnimationFrame(() => {
    if (consultation.open) focusConsultation();
  });
});
function restoreConsultationHash() {
  if (location.hash === '#consultation') openConsultation();
}
window.addEventListener('hashchange', restoreConsultationHash);

// All conversion links share the same destination and preserve native link behavior.
$$('a[href^="#"]').forEach(link => {
  link.addEventListener('click', event => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
    const hash = link.getAttribute('href');
    const target = document.getElementById(hash.slice(1));
    if (!target) return;
    event.preventDefault();
    if (location.hash !== hash) history.pushState(null, '', hash);
    if (target === consultation) { openConsultation(); return; }
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
    target.scrollIntoView({ behavior: reduced.matches ? 'instant' : 'smooth', block: 'start' });
  });
});

// The existing illustrated transition follows the page scroll; no forced scrolling.
const question = $('#intro');
const questionStage = $('.question-stage');
let frame = 0;
let lastQ = '';
function updateScroll() {
  frame = 0;
  const travel = Math.max(1, question.offsetHeight - questionStage.offsetHeight);
  const raw = clamp(-question.getBoundingClientRect().top / travel);
  const q = (reduced.matches ? 1 : clamp((raw - .07) / .72)).toFixed(4);
  if (q !== lastQ) { question.style.setProperty('--q', q); lastQ = q; }

}
function queueScroll() { if (!frame) frame = requestAnimationFrame(updateScroll); }
window.addEventListener('scroll', queueScroll, { passive: true });
window.addEventListener('resize', queueScroll);
window.addEventListener('load', queueScroll, { once: true });
window.addEventListener('pageshow', queueScroll);
reduced.addEventListener('change', queueScroll);
$$('details').forEach(element => element.addEventListener('toggle', queueScroll));
if ('ResizeObserver' in window) new ResizeObserver(queueScroll).observe(document.body);
updateScroll();

// Build the request locally. No AI request is made and no input is transmitted.
const form = $('#intent-form');
const taskInput = $('#task');
const goalInput = $('#goal');
const output = $('#prompt-output');
const saved = storage.read('intent-draft-v1', null);
if (saved && typeof saved === 'object') {
  if (typeof saved.task === 'string') taskInput.value = saved.task.slice(0, 160);
  if (typeof saved.goal === 'string') goalInput.value = saved.goal.slice(0, 400);
  if (Object.hasOwn(LENS_LABELS, saved.lens)) $(`input[name="lens"][value="${saved.lens}"]`).checked = true;
}
function renderPrompt() {
  const draft = { task: taskInput.value, goal: goalInput.value, lens: form.elements.lens.value };
  const result = buildConsultation(draft);
  output.textContent = result.text;
  $('#prompt-kind').textContent = result.label;
  storage.write('intent-draft-v1', draft);
}
form.addEventListener('submit', event => event.preventDefault());
form.addEventListener('input', renderPrompt);
form.addEventListener('change', renderPrompt);
$('#use-example').addEventListener('click', () => {
  taskInput.value = 'AI活用研修の資料を作る';
  goalInput.value = 'AIを業務に使えていない人が、明日から自分の仕事で一度、試せるようになってほしい';
  renderPrompt();
  announce('資料作成の例を入れました。自分の作業に合わせて書き換えられます。');
});
$('#copy-prompt').addEventListener('click', async () => {
  try {
    if (!navigator.clipboard || !window.isSecureContext) throw new Error('clipboard unavailable');
    await navigator.clipboard.writeText(output.textContent);
    announce('相談文をコピーしました。いつものAIに貼り付けてみてください。');
  } catch {
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(output);
    if (selection) { selection.removeAllRanges(); selection.addRange(range); }
    announce('相談文を選択しました。長押し、またはコピー操作でコピーしてください。');
  }
});
renderPrompt();

// Direct links also reveal the form when landing on this section.
restoreConsultationHash();
