import { CONFIG } from '../game/config.ts';
import type { GameState } from '../game/state.ts';
import { currentStepsPerSecond } from '../game/tick.ts';
import type { Point } from '../world/vision.ts';
import type { Rect } from '../world/world.ts';
import type { Surface } from './canvas.ts';
import { damp, headCenter, stepProgress } from './motion.ts';

export interface Camera {
  /** Centro do enquadramento, em células do mundo. */
  x: number;
  y: number;
  /** Lado da célula em pixels CSS: o zoom já resolvido. */
  cell: number;
  /** Células visíveis no menor eixo: o zoom antes de virar pixel. */
  view: number;
  /**
   * Direção da cobra, amortecida. A direção crua vira de -1 para 1 num único
   * quadro, e o alvo da câmera e o centro da luz saltariam junto com ela.
   */
  gazeX: number;
  gazeY: number;
}

export function createCamera(): Camera {
  return { x: 0, y: 0, cell: 1, view: CONFIG.viewCells, gazeX: 1, gazeY: 0 };
}

/** Para onde a câmera está olhando agora, já suavizado. */
export function gaze(camera: Camera): Point {
  return { x: camera.gazeX, y: camera.gazeY };
}

/**
 * Quantas células mostrar agora. Velocidade e comprimento abrem o plano:
 * correr rápido sem enxergar mais longe é morte por falta de informação.
 */
function targetView(state: GameState): number {
  const speedRatio = currentStepsPerSecond(state) / CONFIG.baseStepsPerSecond;
  const grown = Math.max(0, state.snake.length - CONFIG.startLength);

  let view =
    CONFIG.viewCells +
    (speedRatio - 1) * CONFIG.viewCells * CONFIG.zoomSpeedGain +
    grown * CONFIG.zoomLengthGain;

  view = Math.min(view, CONFIG.maxViewCells);
  if (state.phase === 'gameover') view *= CONFIG.deathViewGain;
  return view;
}

/** Cola a câmera na cobra, sem suavizar. Para recomeços. */
export function snapCamera(camera: Camera, state: GameState, surface: Surface): void {
  const head = headCenter(state, 1);
  camera.gazeX = state.direction.x;
  camera.gazeY = state.direction.y;
  camera.x = head.x + camera.gazeX * CONFIG.cameraLead;
  camera.y = head.y + camera.gazeY * CONFIG.cameraLead;
  camera.view = targetView(state);
  camera.cell = Math.min(surface.width, surface.height) / camera.view;
}

export function updateCamera(
  camera: Camera,
  state: GameState,
  surface: Surface,
  dtMs: number,
): void {
  const dt = dtMs / 1000;
  const head = headCenter(state, stepProgress(state));

  camera.view = damp(camera.view, targetView(state), CONFIG.cameraZoomLambda, dt);
  camera.cell = Math.min(surface.width, surface.height) / camera.view;

  camera.gazeX = damp(camera.gazeX, state.direction.x, CONFIG.cameraGazeLambda, dt);
  camera.gazeY = damp(camera.gazeY, state.direction.y, CONFIG.cameraGazeLambda, dt);

  // A cobra fica atrás do centro da tela, com o espaço livre à frente dela.
  const targetX = head.x + camera.gazeX * CONFIG.cameraLead;
  const targetY = head.y + camera.gazeY * CONFIG.cameraLead;
  camera.x = damp(camera.x, targetX, CONFIG.cameraFollowLambda, dt);
  camera.y = damp(camera.y, targetY, CONFIG.cameraFollowLambda, dt);
}

/** Canto superior esquerdo da tela, em pixels, para a célula 0,0 do mundo. */
export function originX(camera: Camera, surface: Surface): number {
  return surface.width / 2 - camera.x * camera.cell;
}

export function originY(camera: Camera, surface: Surface): number {
  return surface.height / 2 - camera.y * camera.cell;
}

/**
 * Células que a tela alcança, com folga. A folga existe porque névoa e chão
 * são imagens esticadas: sem ela, a interpolação erraria a última fileira de
 * pixels dentro do campo de visão.
 */
export function visibleRect(camera: Camera, surface: Surface, padding = 2): Rect {
  const halfW = surface.width / 2 / camera.cell;
  const halfH = surface.height / 2 / camera.cell;

  return {
    minX: Math.floor(camera.x - halfW) - padding,
    minY: Math.floor(camera.y - halfH) - padding,
    maxX: Math.ceil(camera.x + halfW) + padding,
    maxY: Math.ceil(camera.y + halfH) + padding,
  };
}
