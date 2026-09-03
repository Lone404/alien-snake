import type { GameState } from '../game/state.ts';
import { currentStepsPerSecond } from '../game/tick.ts';
import { createCounter } from './counter.ts';

export interface Hud {
  update(state: GameState): void;
}

function required(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error('Elemento #' + id + ' não encontrado no HTML.');
  return el;
}

export function createHud(): Hud {
  const score = createCounter(required('stat-score'));
  const best = createCounter(required('stat-best'));
  const length = createCounter(required('stat-length'));
  const regions = createCounter(required('stat-regions'));
  const speed = required('stat-speed');
  const biome = required('locator-biome');
  const coords = required('locator-coords');

  let lastSpeed = '';
  let lastBiome = '';
  let lastCoords = '';

  return {
    update(state: GameState): void {
      score.set(state.score);
      best.set(Math.max(state.best, state.score));
      length.set(state.snake.length);
      regions.set(state.regions.size);

      // Sem count-up: é uma leitura contínua, não um ganho.
      const value = currentStepsPerSecond(state).toFixed(1);
      if (value !== lastSpeed) {
        speed.textContent = value;
        lastSpeed = value;
      }

      // Localizador: nome da região e coordenada da cabeça.
      const head = state.snake[0];
      const name = state.world.biomeAt(head.x, head.y).name;
      if (name !== lastBiome) {
        biome.textContent = name;
        lastBiome = name;
      }

      const position = head.x + ', ' + head.y;
      if (position !== lastCoords) {
        coords.textContent = position;
        lastCoords = position;
      }
    },
  };
}
