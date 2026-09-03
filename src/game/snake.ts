import type { Vec2 } from '../core/vec.ts';
import { equals } from '../core/vec.ts';
import { CONFIG } from './config.ts';

/** Cabeça na origem do mundo, corpo esticado para a esquerda. */
export function createSnake(): Vec2[] {
  const body: Vec2[] = [];
  for (let i = 0; i < CONFIG.startLength; i++) body.push({ x: -i, y: 0 });
  return body;
}

/**
 * A cauda libera a célula neste mesmo passo, a menos que a cobra vá crescer.
 * Por isso o limite da varredura depende de `growing`.
 */
export function willCollide(snake: readonly Vec2[], head: Vec2, growing: boolean): boolean {
  const limit = growing ? snake.length : snake.length - 1;
  for (let i = 0; i < limit; i++) {
    if (equals(snake[i], head)) return true;
  }
  return false;
}

export function advance(snake: Vec2[], head: Vec2, grow: boolean): void {
  snake.unshift(head);
  if (!grow) snake.pop();
}
