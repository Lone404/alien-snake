import './styles/main.css';

import { createAudioPlayer } from './audio/player.ts';
import { createLoop } from './core/loop.ts';
import { baseStepsPerSecond, CONFIG } from './game/config.ts';
import { createInputQueue, directionFromKey } from './game/input.ts';
import { createInitialState } from './game/state.ts';
import type { GameEvent } from './game/tick.ts';
import { tick } from './game/tick.ts';
import type { ItemId } from './items/catalog.ts';
import { ITEMS } from './items/catalog.ts';
import type { SoundId } from './audio/manifest.ts';
import { createSurface } from './render/canvas.ts';
import { snapCamera } from './render/camera.ts';
import { createFloatingTexts } from './render/floatingText.ts';
import { createRenderer } from './render/renderer.ts';
import { THEME } from './render/theme.ts';
import { createToasts } from './ui/toasts.ts';
import { createHud } from './ui/hud.ts';
import { createMenu } from './ui/menu.ts';
import { createOverlays } from './ui/overlays.ts';
import { createAudioControls } from './ui/audioControls.ts';
import { createCredits } from './ui/credits.ts';
import { createSettingsModal } from './ui/settingsModal.ts';

function required<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error('Elemento #' + id + ' não encontrado no HTML.');
  return el as T;
}

const canvas = required<HTMLCanvasElement>('game');
const stage = required('stage');

const surface = createSurface(canvas, stage);
const renderer = createRenderer();
const floats = createFloatingTexts();
const hud = createHud();
const toasts = createToasts(required('toasts'));
const overlays = createOverlays(required('overlay'));
const audio = createAudioPlayer();
const settings = createSettingsModal(required('settings'), audio);
const credits = createCredits(required('credits'));

/** Uma janela por vez. */
const anyModalOpen = (): boolean => settings.isOpen() || credits.isOpen();
const closeModals = (): void => {
  settings.close();
  credits.close();
};

createAudioControls(required('audio-pill'), audio, {
  settings: () => {
    credits.close();
    settings.open();
  },
  credits: () => {
    settings.close();
    credits.open();
  },
});

function loadBest(): number {
  const raw = localStorage.getItem(CONFIG.bestScoreKey);
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

function saveBest(value: number): void {
  localStorage.setItem(CONFIG.bestScoreKey, value.toString());
}

let state = createInitialState(loadBest());
let input = createInputQueue(state.direction);
snapCamera(renderer.camera, state, surface);

/**
 * Zera a partida, com um mundo novo: a semente do estado é a semente do
 * terreno. A câmera é colada na cobra sem suavizar, senão o primeiro quadro
 * seria uma varredura do mundo antigo até o novo.
 */
function reset(phase: 'menu' | 'playing'): void {
  state = createInitialState(Math.max(state.best, state.score));
  state.phase = phase;
  input = createInputQueue(state.direction);
  floats.clear();
  snapCamera(renderer.camera, state, surface);
}

const menu = createMenu(required('menu'), () => reset('playing'));

const EAT_SOUND: Record<ItemId, SoundId> = {
  food: 'eat',
  essence: 'essence',
  fire: 'fire',
  ice: 'ice',
  earth: 'earth',
};

function handleEvents(events: readonly GameEvent[]): void {
  for (const event of events) {
    switch (event.type) {
      case 'eat': {
        audio.play(EAT_SOUND[event.itemId]);
        // O número sai na cor da peça comida; o "×2" do fogo vira sufixo.
        floats.spawn(event.cell, {
          text: '+' + event.points,
          color: event.multiplied ? THEME.textBonus : ITEMS[event.itemId].color,
          accent: event.multiplied ? '×' + CONFIG.fireScoreMultiplier : undefined,
          tone: event.multiplied ? 'bonus' : 'gain',
        });
        break;
      }

      case 'spotted':
        audio.play('spotted');
        floats.spawn(event.cell, {
          text: ITEMS[event.itemId].name,
          color: ITEMS[event.itemId].color,
          tone: 'warn',
        });
        break;

      case 'region':
        audio.play('region');
        floats.spawn(event.cell, {
          text: event.name,
          accent: '+' + event.points,
          color: THEME.textRegion,
          tone: 'warn',
        });
        break;

      case 'rock-reward':
        audio.play('reward');
        floats.spawn(event.cell, { text: '+' + event.points, color: THEME.textPositive });
        break;

      case 'item-expired':
        audio.play('expire');
        floats.spawn(event.cell, { text: 'sumiu', color: THEME.textWarn, tone: 'warn' });
        break;

      case 'death':
        saveBest(state.best);
        // Recorde e fim de jogo têm sons próprios; tocar os dois vira ruído.
        audio.play(state.score > 0 && state.score >= state.best ? 'record' : 'death');
        break;
    }
  }
}

/**
 * Sons que não vêm de um evento do tick: transição de fase e degrau de
 * velocidade, detectados por comparação com o quadro anterior.
 */
let lastPhase = state.phase;
let lastBaseSpeed = baseStepsPerSecond(state.score);

function watchTransitions(): void {
  if (state.phase !== lastPhase) {
    // A trilha nunca para, só abafa: reiniciar a cada morte picotaria o loop.
    audio.setMusicActive(state.phase === 'playing');
    stage.dataset.phase = state.phase;

    if (lastPhase === 'menu' && state.phase === 'playing') audio.play('start');
    else if (state.phase === 'paused') audio.play('pause');
    else if (lastPhase === 'paused' && state.phase === 'playing') audio.play('resume');
    lastPhase = state.phase;
  }

  const base = baseStepsPerSecond(state.score);
  if (base !== lastBaseSpeed) {
    if (base > lastBaseSpeed && state.phase === 'playing') audio.play('levelup');
    lastBaseSpeed = base;
  }
}

const loop = createLoop((dtMs) => {
  handleEvents(tick(state, dtMs, input));
  floats.update(dtMs);
  watchTransitions();

  renderer.draw(surface, state, floats, dtMs);
  hud.update(state);
  toasts.update(state);
  overlays.update(state);
  menu.update(state);
});

window.addEventListener('keydown', (event) => {
  const direction = directionFromKey(event.key);

  if (direction) {
    if (state.phase !== 'playing' || anyModalOpen()) return;
    event.preventDefault();
    input.push(direction);
    return;
  }

  switch (event.key) {
    case ' ':
    case 'Spacebar':
      event.preventDefault();
      if (anyModalOpen()) break;
      if (state.phase === 'playing') state.phase = 'paused';
      else if (state.phase === 'paused') state.phase = 'playing';
      else if (state.phase === 'menu') reset('playing');
      break;

    case 'Enter':
      event.preventDefault();
      // No menu quem responde é o botão focado, que já dispara `onPlay`.
      if (anyModalOpen()) break;
      if (state.phase === 'paused' || state.phase === 'gameover') reset('playing');
      break;

    case 'm':
    case 'M':
      event.preventDefault();
      audio.toggle('sfx');
      break;

    case 'n':
    case 'N':
      event.preventDefault();
      audio.toggle('music');
      break;

    case 'Escape':
      event.preventDefault();
      // Esc em dois passos: fecha a janela aberta, senão pausa. Só o segundo
      // Esc, já pausado, volta ao menu e encerra a partida.
      if (anyModalOpen()) closeModals();
      else if (state.phase === 'playing') state.phase = 'paused';
      else if (state.phase !== 'menu') {
        saveBest(Math.max(state.best, state.score));
        reset('menu');
      }
      break;
  }
});

// Perder o foco com a cobra andando não pode custar a partida.
window.addEventListener('blur', () => {
  if (state.phase === 'playing') state.phase = 'paused';
});

loop.start();
