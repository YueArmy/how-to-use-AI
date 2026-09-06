import { createDemoClock } from './demo-timeline.mjs';

const startButton = document.getElementById('demo-start');
const demo = document.getElementById('creation-demo');
const invitation = document.getElementById('demo-invitation');
const heading = document.getElementById('demo-title');
const pauseButton = document.getElementById('demo-pause');
const finishButton = document.getElementById('demo-finish');
const replayButton = document.getElementById('demo-replay');
const endActions = document.getElementById('demo-end-actions');
const messages = [...demo.querySelectorAll('[data-message]')];
const steps = [...demo.querySelectorAll('.demo-steps li')];
const feed = document.getElementById('demo-messages');
const stageStatus = document.getElementById('demo-stage-status');
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
const clock = createDemoClock();
const phases = [
  { status: '目的を伝える' },
  { status: 'AIがやり方を提案する' },
  { status: '人が構成を選ぶ' },
  { status: '工程を分けて、AIに任せる' },
  { status: '人が目的に照らして確認' }
];
let frame = 0;
let previousTime = null;
let inView = true;
let lastPhase = -1;
let lastStatus = '';
let lastComplete = false;

function render() {
  const { phase, running, complete } = clock.snapshot;
  demo.dataset.paused = String(!running && !complete);
  if (phase !== lastPhase || complete !== lastComplete) {
    lastComplete = complete;
    lastPhase = phase;
    messages.forEach((message, index) => { message.hidden = index > phase && !(complete && index === 5); });
    steps.forEach((step, index) => {
      step.classList.toggle('is-complete', index < phase || complete);
      if (index === phase) step.setAttribute('aria-current', 'step');
      else step.removeAttribute('aria-current');
    });
    // Align the new bubble and its attachment together within the phone.
    const latest = messages[complete ? 5 : phase];
    const top = latest.getBoundingClientRect().top - feed.getBoundingClientRect().top + feed.scrollTop - 16;
    feed.scrollTo({ top: Math.max(0, top), behavior: reduced.matches || phase === 0 ? 'instant' : 'smooth' });
  }
  const text = complete ? 'できあがり / 目的に照らして確認' : phases[phase].status + (running ? '' : ' / 停止中');
  if (text !== lastStatus) { stageStatus.textContent = text; lastStatus = text; }
  pauseButton.textContent = running ? '一時停止' : '再生';
  pauseButton.hidden = complete;
  finishButton.hidden = complete;
  endActions.hidden = !complete;
}

function canAdvance() {
  return clock.snapshot.running && !demo.hidden && !document.hidden && inView;
}
function tick(now) {
  frame = 0;
  if (!canAdvance()) { previousTime = null; return; }
  if (previousTime !== null) clock.advance(now - previousTime);
  previousTime = now;
  render();
  if (canAdvance()) frame = requestAnimationFrame(tick);
  else previousTime = null;
}
function syncPlayback() {
  if (frame) cancelAnimationFrame(frame);
  frame = 0;
  previousTime = null;
  if (canAdvance()) frame = requestAnimationFrame(tick);
}

function begin() {
  invitation.hidden = true;
  demo.hidden = false;
  startButton.setAttribute('aria-expanded', 'true');
  clock.start();
  if (reduced.matches) clock.pause();
  lastPhase = -1;
  inView = true;
  render();
  // Replay resets the complete conversation, including all attached artifacts.
  feed.scrollTo({ top: 0, behavior: 'instant' });
  heading.focus({ preventScroll: true });
  demo.scrollIntoView({ behavior: reduced.matches ? 'instant' : 'smooth', block: 'start' });
  syncPlayback();
}

startButton.addEventListener('click', begin);
replayButton.addEventListener('click', begin);
pauseButton.addEventListener('click', () => {
  if (clock.snapshot.running) clock.pause();
  else clock.resume();
  render(); syncPlayback();
});
finishButton.addEventListener('click', () => {
  clock.finish(); render(); syncPlayback();
  replayButton.focus({ preventScroll: true });
});
// A deliberate gesture to browse history stops playback from pulling it away.
function pauseForReading() {
  if (!clock.snapshot.running) return;
  clock.pause();
  render();
  syncPlayback();
}
feed.addEventListener('wheel', pauseForReading, { passive: true });
feed.addEventListener('touchstart', pauseForReading, { passive: true });
feed.addEventListener('keydown', event => {
  if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) pauseForReading();
});
document.addEventListener('visibilitychange', syncPlayback);
window.addEventListener('pagehide', () => {
  if (frame) cancelAnimationFrame(frame);
  frame = 0; previousTime = null;
});
window.addEventListener('pageshow', syncPlayback);
reduced.addEventListener('change', () => {
  if (reduced.matches) clock.pause();
  if (!demo.hidden) render();
  syncPlayback();
});
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    inView = entries[0].isIntersecting && entries[0].intersectionRatio > .08;
    syncPlayback();
  }, { threshold: [0, .08, .15] });
  observer.observe(demo);
}
