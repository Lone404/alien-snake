import type { AudioPlayer } from '../audio/player.ts';
import type { BusId } from '../audio/settings.ts';
import { createModal } from './modal.ts';
import type { Modal } from './modal.ts';

interface BusRow {
  sync(): void;
}

const LABELS: Record<BusId, { title: string; hint: string }> = {
  sfx: { title: 'Efeitos', hint: 'Comer, power-ups, colisão e fim de jogo' },
  music: { title: 'Trilha', hint: 'Música de fundo em loop' },
};

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/**
 * Uma linha por barramento: interruptor, controle deslizante e o valor em
 * número. Row-plain do `forms.html`, com divisor de fio entre as linhas.
 */
function buildRow(bus: BusId, audio: AudioPlayer): { root: HTMLElement; row: BusRow } {
  const root = el('div', 'set-row');
  const meta = LABELS[bus];

  const head = el('div', 'set-head');
  const text = el('div', 'set-text');
  text.append(el('span', 'set-title', meta.title), el('span', 'set-hint', meta.hint));

  const toggle = el('button', 'ryse-switch set-switch');
  toggle.type = 'button';
  toggle.setAttribute('role', 'switch');
  toggle.setAttribute('aria-label', `Ligar ou desligar ${meta.title.toLowerCase()}`);
  toggle.addEventListener('click', () => audio.toggle(bus));

  head.append(text, toggle);

  const control = el('div', 'set-control');

  const slider = el('input', 'set-slider');
  slider.type = 'range';
  slider.min = '0';
  slider.max = '100';
  slider.step = '1';
  slider.setAttribute('aria-label', `Volume de ${meta.title.toLowerCase()}`);
  slider.addEventListener('input', () => audio.setVolume(bus, Number(slider.value) / 100));

  const value = el('output', 'set-value');

  control.append(slider, value);
  root.append(head, control);

  const sync = (): void => {
    const state = audio.get(bus);
    const percent = Math.round(state.volume * 100);

    // Reescrever `value` no meio do gesto faz o polegar pular sob o cursor.
    if (document.activeElement !== slider) slider.value = percent.toString();

    slider.style.setProperty('--fill', `${percent}%`);
    slider.disabled = !state.on;
    value.textContent = state.on ? `${percent}%` : 'off';
    root.classList.toggle('is-off', !state.on);
    toggle.classList.toggle('on', state.on);
    toggle.setAttribute('aria-checked', state.on ? 'true' : 'false');
  };

  return { root, row: { sync } };
}

/** Janela de configurações de áudio. */
export function createSettingsModal(root: HTMLElement, audio: AudioPlayer): Modal {
  const modal = createModal(root, { title: 'Áudio' });
  const rows: BusRow[] = [];

  for (const bus of ['sfx', 'music'] as const) {
    const { root: rowRoot, row } = buildRow(bus, audio);
    rows.push(row);
    modal.body.appendChild(rowRoot);
  }

  const foot = el('p', 'modal-foot');
  foot.append(
    document.createTextNode('Atalhos: '),
    el('kbd', undefined, 'M'),
    document.createTextNode(' efeitos · '),
    el('kbd', undefined, 'N'),
    document.createTextNode(' trilha'),
  );
  modal.body.appendChild(foot);

  const sync = (): void => {
    for (const row of rows) row.sync();
  };
  audio.subscribe(sync);
  modal.onOpen(sync);
  sync();

  return modal;
}
