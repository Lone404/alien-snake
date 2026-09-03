import type { Vec2 } from '../core/vec.ts';
import { equals, isOpposite } from '../core/vec.ts';
import { CONFIG } from './config.ts';

export const DIRECTIONS = {
  up: { x: 0, y: -1 } as Vec2,
  down: { x: 0, y: 1 } as Vec2,
  left: { x: -1, y: 0 } as Vec2,
  right: { x: 1, y: 0 } as Vec2,
};

/** Aceita setas e WASD, com ou sem Caps Lock. */
export function directionFromKey(key: string): Vec2 | null {
  switch (key.toLowerCase()) {
    case 'arrowup':
    case 'w':
      return DIRECTIONS.up;
    case 'arrowdown':
    case 's':
      return DIRECTIONS.down;
    case 'arrowleft':
    case 'a':
      return DIRECTIONS.left;
    case 'arrowright':
    case 'd':
      return DIRECTIONS.right;
    default:
      return null;
  }
}

export interface InputQueue {
  /** Enfileira uma direção. Devolve false se ela foi recusada. */
  push(dir: Vec2): boolean;
  /** Consome a próxima direção da fila e a torna a direção aplicada. */
  next(): Vec2;
}

/**
 * Cada tecla é validada contra a última direção já enfileirada, e não contra
 * a que está aplicada: assim ↑ e ← no mesmo passo viram uma curva de duas
 * etapas em vez de uma reversão em cima do próprio pescoço.
 */
export function createInputQueue(initial: Vec2): InputQueue {
  const queue: Vec2[] = [];
  let applied = initial;

  const reference = (): Vec2 => (queue.length > 0 ? queue[queue.length - 1] : applied);

  return {
    push(dir: Vec2): boolean {
      if (queue.length >= CONFIG.inputBufferSize) return false;
      const from = reference();
      if (equals(dir, from)) return false;
      if (isOpposite(dir, from)) return false;
      queue.push(dir);
      return true;
    },
    next(): Vec2 {
      const dir = queue.shift();
      if (dir) applied = dir;
      return applied;
    },
  };
}
