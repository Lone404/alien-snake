export interface Surface {
  ctx: CanvasRenderingContext2D;
  /** Viewport em pixels CSS. */
  width: number;
  height: number;
}

/** O retângulo de pixels do palco, redimensionado com a janela. Quem decide
    o que aparece dentro dele é a câmera. */
export function createSurface(canvas: HTMLCanvasElement, stage: HTMLElement): Surface {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D não disponível neste navegador.');

  const surface: Surface = { ctx, width: 0, height: 0 };

  const resize = (): void => {
    const width = stage.clientWidth;
    const height = stage.clientHeight;
    if (width <= 0 || height <= 0) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    surface.width = width;
    surface.height = height;
  };

  const observer = new ResizeObserver(resize);
  observer.observe(stage);
  resize();

  return surface;
}
