import type { Vec2 } from '../core/vec.ts';
import { add } from '../core/vec.ts';
import type { ItemId } from '../items/catalog.ts';
import { ITEMS } from '../items/catalog.ts';
import { chunkOf } from '../world/world.ts';
import type { WorldItem } from '../world/world.ts';
import { newlySpotted, reveal, visionCenter } from '../world/vision.ts';
import { baseStepsPerSecond, CONFIG } from './config.ts';
import { applyEffect, rocksAreFrozen, scoreMultiplier, speedMultiplier, tickEffects } from './effects.ts';
import type { InputQueue } from './input.ts';
import { advance, willCollide } from './snake.ts';
import { spawnRocks } from './spawner.ts';
import type { DeathCause, GameState } from './state.ts';

export type GameEvent =
  | { type: 'eat'; itemId: ItemId; points: number; cell: Vec2; multiplied: boolean }
  | { type: 'rock-reward'; points: number; cell: Vec2 }
  | { type: 'item-expired'; cell: Vec2 }
  | { type: 'spotted'; itemId: ItemId; cell: Vec2 }
  | { type: 'region'; name: string; points: number; cell: Vec2 }
  | { type: 'death'; cause: DeathCause };

/** Teto de passos por quadro, para um travamento não virar uma enxurrada. */
const MAX_STEPS_PER_FRAME = 4;

export function currentStepsPerSecond(state: GameState): number {
  return baseStepsPerSecond(state.score) * speedMultiplier(state.effects);
}

export function stepDurationMs(state: GameState): number {
  return 1000 / currentStepsPerSecond(state);
}

export function tick(state: GameState, dtMs: number, input: InputQueue): GameEvent[] {
  const events: GameEvent[] = [];
  if (state.phase !== 'playing') return events;

  state.elapsedMs += dtMs;
  state.effects = tickEffects(state.effects, dtMs);
  expireRocks(state, dtMs, events);
  expireTracked(state, dtMs, events);

  const stepMs = stepDurationMs(state);
  state.stepAccumulatorMs += dtMs;

  let steps = 0;
  while (
    state.stepAccumulatorMs >= stepMs &&
    state.phase === 'playing' &&
    steps < MAX_STEPS_PER_FRAME
  ) {
    state.stepAccumulatorMs -= stepMs;
    steps++;
    step(state, input, events);
  }

  if (state.phase !== 'playing') state.stepAccumulatorMs = 0;
  return events;
}

function step(state: GameState, input: InputQueue, events: GameEvent[]): void {
  // Antes de mexer no corpo: é a posição de origem que o desenho interpola.
  state.prevSnake = state.snake.slice();

  state.direction = input.next();
  const head = add(state.snake[0], state.direction);

  if (state.world.isRuin(head.x, head.y)) {
    die(state, 'ruin', events);
    return;
  }

  if (!rocksAreFrozen(state.effects)) {
    const hitRock = state.rocks.some((rock) => rock.x === head.x && rock.y === head.y);
    if (hitRock) {
      die(state, 'rock', events);
      return;
    }
  }

  const item = state.world.itemAt(head.x, head.y);

  if (willCollide(state.snake, head, item !== null)) {
    die(state, 'self', events);
    return;
  }

  advance(state.snake, head, item !== null);
  if (item) consume(state, item, head, events);

  enterRegion(state, head, events);
  look(state, events);
  state.world.prune(head.x, head.y);
}

/**
 * Acende o círculo de luz e marca o que apareceu nele. É aqui que a névoa
 * vira regra: o relógio de um item só começa quando o jogador o enxerga.
 */
function look(state: GameState, events: GameEvent[]): void {
  const center = visionCenter(state.snake[0], state.direction);
  reveal(state.world, center);

  for (const item of newlySpotted(state.world, center)) {
    item.discovered = true;
    if (item.totalMs === null) continue;

    item.remainingMs = item.totalMs;
    state.tracked.push(item);
    events.push({ type: 'spotted', itemId: item.id, cell: { x: item.x, y: item.y } });
  }
}

function enterRegion(state: GameState, head: Vec2, events: GameEvent[]): void {
  const key = chunkOf(head.x) + ',' + chunkOf(head.y);
  if (state.regions.has(key)) return;
  state.regions.add(key);

  state.score += CONFIG.regionBonus;
  events.push({
    type: 'region',
    name: state.world.biomeAt(head.x, head.y).name,
    points: CONFIG.regionBonus,
    cell: { ...head },
  });
}

function consume(state: GameState, item: WorldItem, cell: Vec2, events: GameEvent[]): void {
  const def = ITEMS[item.id];

  // Lido antes de aplicar o efeito novo: a fruta de fogo não multiplica a si mesma.
  const multiplier = scoreMultiplier(state.effects);
  const points = def.points * multiplier;
  state.score += points;

  state.world.removeItem(item);
  untrack(state, item);

  if (def.effect) state.effects = applyEffect(def.effect);
  if (def.spawnsRocks) {
    state.rocks.push(
      ...spawnRocks(state.rng, state.world, state.snake, cell, state.direction, state.rocks),
    );
  }

  events.push({
    type: 'eat',
    itemId: def.id,
    points,
    cell: { ...cell },
    multiplied: multiplier > 1,
  });
}

function untrack(state: GameState, item: WorldItem): void {
  const index = state.tracked.indexOf(item);
  if (index >= 0) state.tracked.splice(index, 1);
}

/** Cada pedra que derrete com o jogador vivo paga a aposta da terra. */
function expireRocks(state: GameState, dtMs: number, events: GameEvent[]): void {
  if (rocksAreFrozen(state.effects) || state.rocks.length === 0) return;

  const survivors: GameState['rocks'] = [];
  for (const rock of state.rocks) {
    const remainingMs = rock.remainingMs - dtMs;
    if (remainingMs > 0) {
      rock.remainingMs = remainingMs;
      survivors.push(rock);
      continue;
    }
    if (rock.reward > 0) {
      state.score += rock.reward;
      events.push({ type: 'rock-reward', points: rock.reward, cell: { x: rock.x, y: rock.y } });
    }
  }
  state.rocks = survivors;
}

/** Só os itens já avistados têm relógio correndo. */
function expireTracked(state: GameState, dtMs: number, events: GameEvent[]): void {
  if (state.tracked.length === 0) return;

  const survivors: WorldItem[] = [];
  for (const item of state.tracked) {
    if (item.remainingMs === null) continue;

    const remainingMs = item.remainingMs - dtMs;
    if (remainingMs > 0) {
      item.remainingMs = remainingMs;
      survivors.push(item);
      continue;
    }

    state.world.removeItem(item);
    events.push({ type: 'item-expired', cell: { x: item.x, y: item.y } });
  }
  state.tracked = survivors;
}

function die(state: GameState, cause: DeathCause, events: GameEvent[]): void {
  state.phase = 'gameover';
  state.deathCause = cause;
  if (state.score > state.best) state.best = state.score;
  events.push({ type: 'death', cause });
}
