import type { EffectKind } from '../game/effects.ts';
import type { GameState } from '../game/state.ts';
import { ITEMS } from '../items/catalog.ts';
import { buildSprite } from '../items/sprites.ts';

interface ToastMeta {
  label: string;
  detail: string;
  sprite: string;
  color: string;
  rgb: string;
}

const META: Record<EffectKind, ToastMeta> = {
  fire: {
    label: 'Fogo',
    detail: 'rápido · pontos ×2',
    sprite: ITEMS.fire.sprite,
    color: ITEMS.fire.color,
    rgb: ITEMS.fire.colorRgb,
  },
  ice: {
    label: 'Gelo',
    detail: 'lento · pedras atravessáveis',
    sprite: ITEMS.ice.sprite,
    color: ITEMS.ice.color,
    rgb: ITEMS.ice.colorRgb,
  },
};

/** Deve bater com a duração da animação de saída no CSS. */
const EXIT_MS = 160;

interface ToastNodes {
  root: HTMLElement;
  fill: HTMLElement;
  time: HTMLElement;
}

export interface Toasts {
  update(state: GameState): void;
}

/** Efeitos ativos como toast flutuante, centrado na base da tela. */
export function createToasts(container: HTMLElement): Toasts {
  const nodes = new Map<EffectKind, ToastNodes>();

  const build = (kind: EffectKind): ToastNodes => {
    const meta = META[kind];

    const root = document.createElement('div');
    root.className = 'toast';
    root.style.setProperty('--item', meta.color);
    root.style.setProperty('--item-rgb', meta.rgb);
    root.setAttribute('role', 'status');

    const well = document.createElement('span');
    well.className = 'toast-well';
    well.appendChild(buildSprite(meta.sprite, 17));

    const body = document.createElement('span');
    body.className = 'toast-body';

    const title = document.createElement('span');
    title.className = 'toast-title';
    title.textContent = meta.label;

    const detail = document.createElement('span');
    detail.className = 'toast-detail';
    detail.textContent = meta.detail;
    title.appendChild(detail);

    const track = document.createElement('span');
    track.className = 'toast-track';
    const fill = document.createElement('span');
    fill.className = 'toast-fill';
    track.appendChild(fill);

    body.append(title, track);

    const time = document.createElement('span');
    time.className = 'toast-time';

    root.append(well, body, time);
    container.appendChild(root);

    const toast = { root, fill, time };
    nodes.set(kind, toast);
    return toast;
  };

  const dismiss = (kind: EffectKind, node: ToastNodes): void => {
    nodes.delete(kind);
    node.root.classList.add('is-leaving');
    // A classe pinta o estado final, então uma animação interrompida não
    // deixa toast fantasma no DOM.
    window.setTimeout(() => node.root.remove(), EXIT_MS);
  };

  return {
    update(state: GameState): void {
      const active = new Set<EffectKind>();

      for (const effect of state.effects) {
        active.add(effect.kind);
        const node = nodes.get(effect.kind) ?? build(effect.kind);
        node.fill.style.width = `${(effect.remainingMs / effect.totalMs) * 100}%`;
        node.time.textContent = `${(effect.remainingMs / 1000).toFixed(1)}s`;
      }

      for (const [kind, node] of nodes) {
        if (!active.has(kind)) dismiss(kind, node);
      }
    },
  };
}
