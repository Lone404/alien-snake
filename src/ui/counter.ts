/**
 * Count-up numérico na regra de motion do DS: ease-out-cubic com duração
 * adaptada ao delta. O valor final é escrito pelo próprio contador, para uma
 * animação interrompida não congelar o número num quadro qualquer.
 */
export interface Counter {
  set(value: number): void;
}

const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

export function createCounter(el: HTMLElement, format: (v: number) => string = String): Counter {
  let shown = 0;
  let from = 0;
  let target = 0;
  let startedAt = 0;
  let durationMs = 0;
  let raf = 0;

  const paint = (value: number): void => {
    if (value === shown) return;
    shown = value;
    el.textContent = format(value);
  };

  const frame = (now: number): void => {
    const t = Math.min(1, (now - startedAt) / durationMs);
    paint(Math.round(from + (target - from) * easeOutCubic(t)));
    if (t < 1) raf = requestAnimationFrame(frame);
    else paint(target);
  };

  paint(0);

  return {
    set(value: number): void {
      if (value === target) return;

      const diff = Math.abs(value - shown);
      target = value;

      // Delta maior ganha mais tempo, com teto para não virar espera.
      durationMs = Math.min(720, 260 + Math.log2(diff + 1) * 60);
      if (diff <= 1 || durationMs <= 0) {
        cancelAnimationFrame(raf);
        paint(value);
        return;
      }

      from = shown;
      startedAt = performance.now();
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(frame);
    },
  };
}
