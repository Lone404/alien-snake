import type { BiomeMix } from '../world/biomes.ts';
import { createBiomeMix, mixChannel, sampleBiome } from '../world/biomes.ts';
import type { Rect } from '../world/world.ts';

export interface TerrainLayer {
  draw(
    ctx: CanvasRenderingContext2D,
    rect: Rect,
    originX: number,
    originY: number,
    cell: number,
  ): void;
}

/**
 * O chão, pintado numa imagem de uma amostra por célula e esticada até a tela,
 * como a névoa. O filtro bilinear do canvas transforma as amostras num
 * degradê, então a cor acompanha a mistura de biomas célula a célula sem
 * custar um preenchimento por célula.
 */
export function createTerrainLayer(seed: number): TerrainLayer {
  const buffer = document.createElement('canvas');
  const bufferCtx = buffer.getContext('2d');
  if (!bufferCtx) throw new Error('Canvas 2D não disponível neste navegador.');

  const mix: BiomeMix = createBiomeMix();
  let image: ImageData | null = null;

  return {
    draw(ctx, rect, originX, originY, cell) {
      const cols = rect.maxX - rect.minX + 1;
      const rows = rect.maxY - rect.minY + 1;

      if (!image || image.width !== cols || image.height !== rows) {
        buffer.width = cols;
        buffer.height = rows;
        image = bufferCtx.createImageData(cols, rows);
      }

      const data = image.data;
      let offset = 0;

      for (let row = 0; row < rows; row++) {
        const wy = rect.minY + row + 0.5;

        for (let col = 0; col < cols; col++) {
          const wx = rect.minX + col + 0.5;

          sampleBiome(seed, wx, wy, mix);
          for (let channel = 0; channel < 3; channel++) {
            data[offset + channel] = mixChannel(mix, 'ground', channel);
          }
          data[offset + 3] = 255;
          offset += 4;
        }
      }

      bufferCtx.putImageData(image, 0, 0);

      // O texel i mede o centro da célula rect.minX + i + 0.5 e aterrissa
      // exatamente nele: o chão fica preso ao mundo, sem desvio.
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
