export interface Loop {
  start(): void;
  stop(): void;
}

/** Teto de delta, para uma aba em segundo plano não voltar com um dt gigante. */
const MAX_FRAME_MS = 100;

export function createLoop(onFrame: (dtMs: number) => void): Loop {
  let rafId = 0;
  let last = 0;
  let running = false;

  const frame = (now: number): void => {
    if (!running) return;
    rafId = requestAnimationFrame(frame);
    const dt = Math.min(now - last, MAX_FRAME_MS);
    last = now;
    onFrame(dt);
  };

  return {
    start(): void {
      if (running) return;
      running = true;
      last = performance.now();
      rafId = requestAnimationFrame(frame);
    },
    stop(): void {
      running = false;
      cancelAnimationFrame(rafId);
    },
  };
}
