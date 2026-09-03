import { CONFIG } from '../game/config.ts';
import type { Point } from '../world/vision.ts';
import { visibility } from '../world/vision.ts';
import type { Rect, World } from '../world/world.ts';

/**
 * Amostras por célula. A névoa é pintada numa imagem pequena e esticada até a
 * tela, e o degradê sai do filtro bilinear do canvas. Com uma amostra por
 * célula o filtro mostra losango no zoom alto; com três, não.
 */
const SAMPLES = 3;

/** A cor da névoa é o mesmo preto do fundo: escuridão, não fumaça cinza. */
const FOG_R = 5;
const FOG_G = 6;
const FOG_B = 8;

export interface FogLayer {
  draw(
    ctx: CanvasRenderingContext2D,
    rect: Rect,
    originX: number,
    originY: number,
    cell: number,
    world: World,
    center: Point,
  ): void;
}

/**
 * Névoa de guerra em três estados: iluminado agora, lembrado (o terreno
 * continua visível, apagado, mas o que se move nele não) e nunca visto.
 */
export function createFogLayer(): FogLayer {
  const buffer = document.createElement('canvas');
  const bufferCtx = buffer.getContext('2d');
  if (!bufferCtx) throw new Error('Canvas 2D não disponível neste navegador.');

  let image: ImageData | null = null;

  return {
    draw(ctx, rect, originX, originY, cell, world, center) {
      const cols = rect.maxX - rect.minX + 1;
      const rows = rect.maxY - rect.minY + 1;
      const width = cols * SAMPLES;
      const height = rows * SAMPLES;

      if (!image || image.width !== width || image.height !== height) {
        buffer.width = width;
        buffer.height = height;
        image = bufferCtx.createImageData(width, height);
      }

      const data = image.data;
      let offset = 0;

      for (let sy = 0; sy < height; sy++) {
        const cellY = rect.minY + Math.floor(sy / SAMPLES);
        const worldY = rect.minY + (sy + 0.5) / SAMPLES;

        for (let sx = 0; sx < width; sx++) {
          const worldX = rect.minX + (sx + 0.5) / SAMPLES;
          const lit = visibility(center, worldX, worldY);

          // A memória é por célula, não por amostra.
          const veil = lit >= 1 ? 0 : world.isSeen(rect.minX + Math.floor(sx / SAMPLES), cellY)
            ? CONFIG.memoryVeil
            : 1;

          data[offset] = FOG_R;
          data[offset + 1] = FOG_G;
          data[offset + 2] = FOG_B;
          data[offset + 3] = Math.round(veil * (1 - lit) * 255);
          offset += 4;
        }
      }

      bufferCtx.putImageData(image, 0, 0);

      // O centro do texel i cai em minX + (i + 0.5) / SAMPLES, exatamente o
      // ponto que ele mediu: a imagem esticada fica alinhada com o mundo.
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(
        buffer,
        originX + rect.minX * cell,
        originY + rect.minY * cell,
        cols * cell,
        rows * cell,
      );
      ctx.restore();
    },
  };
}
