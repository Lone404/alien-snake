import type { Rect } from '../world/world.ts';

/**
 * Projeção do mundo para a tela: `ox`/`oy` são onde a célula 0,0 cai em
 * pixels, `cell` é o lado dela depois do zoom e `rect` é o pedaço que a
 * câmera alcança. Todo desenho passa por estes quatro números.
 */
export interface View {
  ox: number;
  oy: number;
  cell: number;
  rect: Rect;
}
