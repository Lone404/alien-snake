import type { GameState } from '../game/state.ts';
import { DEATH_MESSAGES } from '../game/state.ts';
import { renderLegendCompact } from './legend.ts';

export interface Overlays {
  update(state: GameState): void;
}

/** Pedaço de texto do overlay. `value` sai em mono tabular. */
type Part = { text: string } | { value: number } | { key: string };

interface OverlayView {
  hidden: boolean;
  tone: string;
  eyebrow: string;
  title: string;
  body: Part[];
  hint: Part[];
  /** A pausa mostra o lembrete de itens; o game over não. */
  tags: boolean;
}

const HIDDEN: OverlayView = {
  hidden: true,
  tone: 'neutral',
  eyebrow: '',
  title: '',
  body: [],
  hint: [],
  tags: false,
};

/** Monta por DOM, sem string de markup. */
function paint(target: HTMLElement, parts: Part[]): void {
  target.replaceChildren();

  for (const part of parts) {
    if ('key' in part) {
      const kbd = document.createElement('kbd');
      kbd.textContent = part.key;
      target.appendChild(kbd);
    } else if ('value' in part) {
      const b = document.createElement('b');
      b.textContent = part.value.toString();
      target.appendChild(b);
    } else {
      target.appendChild(document.createTextNode(part.text));
    }
  }
}

/** Overlays de partida: pausa e fim de jogo. */
export function createOverlays(root: HTMLElement): Overlays {
  const eyebrow = root.querySelector('.overlay-eyebrow') as HTMLElement;
  const title = root.querySelector('.overlay-title') as HTMLElement;
  const body = root.querySelector('.overlay-body') as HTMLElement;
  const hint = root.querySelector('.overlay-hint') as HTMLElement;
  const tags = root.querySelector('.overlay-tags') as HTMLElement;

  renderLegendCompact(tags);

  let lastKey = '';

  return {
    update(state: GameState): void {
      const view = viewFor(state);
      const key = `${view.hidden}|${view.title}|${state.score}|${state.snake.length}`;
      if (key === lastKey) return;
      lastKey = key;

      root.hidden = view.hidden;
      if (view.hidden) return;

      root.dataset.tone = view.tone;
      eyebrow.textContent = view.eyebrow;
      title.textContent = view.title;
      paint(body, view.body);
      paint(hint, view.hint);
      tags.hidden = !view.tags;
    },
  };
}

function viewFor(state: GameState): OverlayView {
  switch (state.phase) {
    case 'paused':
      return {
        hidden: false,
        tone: 'neutral',
        eyebrow: 'Pausado',
        title: 'Respira aí',
        body: [
          { value: state.score },
          { text: ' pontos · ' },
          { value: state.snake.length },
          { text: ' segmentos' },
        ],
        hint: [
          { key: 'Espaço' },
          { text: ' continua · ' },
          { key: 'Enter' },
          { text: ' recomeça · ' },
          { key: 'Esc' },
          { text: ' volta ao menu' },
        ],
        tags: true,
      };

    case 'gameover': {
      const cause = state.deathCause ? DEATH_MESSAGES[state.deathCause] : 'Fim de jogo.';
      const record = state.score > 0 && state.score >= state.best;
      return {
        hidden: false,
        tone: 'danger',
        eyebrow: cause,
        title: record ? 'Novo recorde' : 'Fim de jogo',
        body: [
          { value: state.score },
          { text: ' pontos · ' },
          { value: state.snake.length },
          { text: ' segmentos · recorde ' },
          { value: state.best },
        ],
        hint: [
          { key: 'Enter' },
          { text: ' joga de novo · ' },
          { key: 'Esc' },
          { text: ' volta ao menu' },
        ],
        tags: false,
      };
    }

    default:
      return HIDDEN;
  }
}
