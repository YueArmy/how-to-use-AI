export const DEMO_DURATION = 20000;
export const DEMO_PHASE_STARTS = Object.freeze([0, 3300, 7000, 10300, 16000]);

// Elapsed time is controlled by the visible, unpaused UI, never by queued timers.
export function createDemoClock() {
  let elapsed = 0;
  let running = false;
  return {
    start() { elapsed = 0; running = true; },
    pause() { running = false; },
    resume() { if (elapsed < DEMO_DURATION) running = true; },
    finish() { elapsed = DEMO_DURATION; running = false; },
    advance(delta) {
      if (!running || !Number.isFinite(delta) || delta <= 0) return;
      elapsed = Math.min(DEMO_DURATION, elapsed + delta);
      if (elapsed === DEMO_DURATION) running = false;
    },
    get snapshot() {
      let phase = 0;
      DEMO_PHASE_STARTS.forEach((start, index) => { if (elapsed >= start) phase = index; });
      return { elapsed, running, phase, complete: elapsed === DEMO_DURATION };
    }
  };
}
