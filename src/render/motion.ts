import type { GameState } from '../game/state.ts';
import { stepDurationMs } from '../game/tick.ts';
import type { Point } from '../world/vision.ts';

/**
 * Fração do passo atual já decorrida. A lógica anda em células inteiras; o
 * desenho interpola entre o passo anterior e o atual, ficando um passo atrás
 * dela e nunca mostrando um estado que a regra não autorizou.
 */
export function stepProgress(state: GameState): number {
  if (state.phase !== 'playing') return 1;
  return Math.min(1, state.stepAccumulatorMs / stepDurationMs(state));
}

/**
 * Posição interpolada do segmento `i`, em células do mundo. Quando a cobra
 * cresce, o último segmento não tem antecessor: o clamp o mantém onde a
 * cauda estava.
 */
export function segmentAt(state: GameState, i: number, t: number): Point {
  const current = state.snake[i];
  const previous = state.prevSnake[Math.min(i, state.prevSnake.length - 1)] ?? current;
  return {
    x: previous.x + (current.x - previous.x) * t,
    y: previous.y + (current.y - previous.y) * t,
  };
}

/** Centro da cabeça interpolada, que é o alvo da câmera. */
export function headCenter(state: GameState, t: number): Point {
  const head = segmentAt(state, 0, t);
  return { x: head.x + 0.5, y: head.y + 0.5 };
}

/** Suavização independente de framerate. */
export function damp(from: number, to: number, lambda: number, dtSeconds: number): number {
  return to + (from - to) * Math.exp(-lambda * dtSeconds);
}
