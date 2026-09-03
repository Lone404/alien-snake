import type { Rng } from '../core/rng.ts';
import { createRng } from '../core/rng.ts';
import type { Vec2 } from '../core/vec.ts';
import type { ActiveEffect } from './effects.ts';
import { createSnake } from './snake.ts';
import { DIRECTIONS } from './input.ts';
import { chunkOf, createWorld } from '../world/world.ts';
import type { World, WorldItem } from '../world/world.ts';
import { reveal, visionCenter } from '../world/vision.ts';

export type GamePhase = 'menu' | 'playing' | 'paused' | 'gameover';
export type DeathCause = 'ruin' | 'rock' | 'self';

export interface Rock extends Vec2 {
  remainingMs: number;
  totalMs: number;
  reward: number;
}

export interface GameState {
  phase: GamePhase;
  snake: Vec2[];
  /** Onde cada segmento estava no passo anterior, para o desenho interpolar. */
  prevSnake: Vec2[];
  direction: Vec2;
  world: World;
  rocks: Rock[];
  /** Itens já avistados, com o relógio correndo. */
  tracked: WorldItem[];
  effects: ActiveEffect[];
  score: number;
  best: number;
  deathCause: DeathCause | null;
  /** Regiões já pisadas. Fora do mundo, que descarta chunks: redescobrir uma
      região não pode pagar de novo. */
  regions: Set<string>;
  stepAccumulatorMs: number;
  elapsedMs: number;
  rng: Rng;
}

export function createInitialState(best: number, seed: number = Date.now()): GameState {
  const rng = createRng(seed);
  const world = createWorld(seed >>> 0);
  const snake = createSnake();
  const direction = DIRECTIONS.right;

  // O primeiro círculo de luz é aceso antes do primeiro passo.
  reveal(world, visionCenter(snake[0], direction));

  return {
    phase: 'menu',
    snake,
    prevSnake: snake.slice(),
    direction,
    world,
    rocks: [],
    tracked: [],
    effects: [],
    score: 0,
    best,
    deathCause: null,
    regions: new Set([chunkOf(snake[0].x) + ',' + chunkOf(snake[0].y)]),
    stepAccumulatorMs: 0,
    elapsedMs: 0,
    rng,
  };
}

export const DEATH_MESSAGES: Record<DeathCause, string> = {
  ruin: 'Você bateu numa ruína.',
  rock: 'Você colidiu com uma pedra.',
  self: 'Você mordeu o próprio corpo.',
};
