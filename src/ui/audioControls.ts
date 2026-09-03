import type { AudioPlayer } from '../audio/player.ts';
import type { BusId } from '../audio/settings.ts';
import type { IconName } from './uiIcons.ts';
import { buildUiIcon } from './uiIcons.ts';

interface BusButton {
  bus: BusId;
  on: IconName;
  off: IconName;
  label: string;
}

const BUSES: BusButton[] = [
  { bus: 'sfx', on: 'volume-on', off: 'volume-off', label: 'Efeitos sonoros' },
  { bus: 'music', on: 'music-on', off: 'music-off', label: 'Trilha' },
];

interface Gate {
  icon: IconName;
  label: string;
  onClick: () => void;
}

/**
 * Pílula fixa no canto inferior direito: liga/desliga de efeitos e de trilha,
 * mais os atalhos para as configurações de áudio e para os créditos.
 */
export function createAudioControls(
  root: HTMLElement,
  audio: AudioPlayer,
  gates: { settings: () => void; credits: () => void },
): void {
  const buttons = new Map<BusId, HTMLButtonElement>();

  for (const item of BUSES) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ryse-btn ryse-btn-ghost pill-btn';
    button.addEventListener('click', () => {
      const on = audio.toggle(item.bus);
      // Religar a trilha já se ouve sozinho; os efeitos precisam de um som
      // para confirmar que voltaram.
      if (on && item.bus === 'sfx') audio.play('resume');
      button.blur();
    });
    buttons.set(item.bus, button);
    root.appendChild(button);
  }

  const divider = document.createElement('span');
  divider.className = 'pill-divider';
  root.appendChild(divider);

  const GATES: Gate[] = [
    { icon: 'settings', label: 'Configurações de áudio', onClick: gates.settings },
    { icon: 'credits', label: 'Créditos', onClick: gates.credits },
  ];

  for (const gate of GATES) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ryse-btn ryse-btn-ghost pill-btn';
    button.title = gate.label;
    button.setAttribute('aria-label', gate.label);
    button.appendChild(buildUiIcon(gate.icon, 15));
    button.addEventListener('click', () => {
      gate.onClick();
      button.blur();
    });
    root.appendChild(button);
  }

  const sync = (): void => {
    for (const item of BUSES) {
      const button = buttons.get(item.bus);
      if (!button) continue;

      const state = audio.get(item.bus);
      const active = state.on && state.volume > 0;
      button.replaceChildren(buildUiIcon(active ? item.on : item.off, 15));
      button.classList.toggle('is-off', !active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
      button.title = `${item.label}: ${active ? `${Math.round(state.volume * 100)}%` : 'desligado'}`;
      button.setAttribute('aria-label', button.title);
    }
  };

  audio.subscribe(sync);
  sync();
}
