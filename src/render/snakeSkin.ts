import { createRng } from '../core/rng.ts';
import { CONFIG } from '../game/config.ts';
import { hasEffect } from '../game/effects.ts';
import type { EffectKind } from '../game/effects.ts';
import type { GameState } from '../game/state.ts';
import { ITEMS } from '../items/catalog.ts';
import type { Point } from '../world/vision.ts';
import { fogAlpha } from '../world/vision.ts';
import { segmentAt } from './motion.ts';
import { THEME } from './theme.ts';
import type { View } from './view.ts';

type Rgb = [number, number, number];

function hexToRgb(hex: string): Rgb {
  const value = parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

const HEAD = hexToRgb(THEME.snakeHead);
const MID = hexToRgb(THEME.snakeMid);
const TAIL = hexToRgb(THEME.snakeTail);
const SHEEN = hexToRgb(THEME.snakeSheen);
const FIRE = hexToRgb(ITEMS.fire.color);
const ICE = hexToRgb(ITEMS.ice.color);
/** O preto do fundo, para onde a névoa puxa a cor do corpo. */
const VOID: Rgb = [8, 9, 12];

function blend(from: Rgb, to: Rgb, t: number, out: Rgb): void {
  out[0] = from[0] + (to[0] - from[0]) * t;
  out[1] = from[1] + (to[1] - from[1]) * t;
  out[2] = from[2] + (to[2] - from[2]) * t;
}

function css(color: Rgb, shade = 1): string {
  const r = Math.round(Math.min(255, color[0] * shade));
  const g = Math.round(Math.min(255, color[1] * shade));
  const b = Math.round(Math.min(255, color[2] * shade));
  return `rgb(${r}, ${g}, ${b})`;
}

/** Um segmento resolvido em pixels e em cor. Reaproveitado entre quadros. */
interface Joint {
  x: number;
  y: number;
  width: number;
  rim: string;
  base: string;
  sheen: string;
  onScreen: boolean;
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  ageMs: number;
  spanMs: number;
  color: string;
}

export interface SnakeRenderer {
  draw(
    ctx: CanvasRenderingContext2D,
    state: GameState,
    view: View,
    t: number,
    center: Point,
    dtMs: number,
  ): void;
}

/**
 * A pele da cobra: um tubo contínuo, traçado com ponta redonda entre os
 * centros de cada par de segmentos, em três passadas concêntricas — contorno
 * escuro na largura cheia, corpo em 74% dela e um fio de luz em 26%.
 *
 * Concêntricas, e não deslocadas para um canto: com o realce deslocado numa
 * direção fixa da tela, a primeira curva o joga para fora do corpo.
 *
 * Nenhuma passada usa opacidade, porque as cápsulas se sobrepõem meia célula
 * em cada junta e a transparência deixaria a junta mais densa. A névoa entra
 * na cor, puxando o segmento na direção do preto do fundo até um piso.
 */
export function createSnakeRenderer(): SnakeRenderer {
  const joints: Joint[] = [];
  const sparks: Spark[] = [];
  const rng = createRng(0x5eed);

  const body: Rgb = [0, 0, 0];
  const tinted: Rgb = [0, 0, 0];
  const lit: Rgb = [0, 0, 0];

  let sparkDebt = 0;
  let lastState: GameState | null = null;

  /**
   * Rampa de cor ao longo do corpo: cabeça acesa, meio, cauda funda. Dividida
   * por um número fixo de segmentos, e não pelo comprimento atual, senão uma
   * cobra curta exibe a rampa inteira em poucas faixas.
   */
  const ramp = (i: number, out: Rgb): void => {
    const t = Math.min(1, i / CONFIG.snakeRampSegments);
    if (t < 0.45) blend(HEAD, MID, t / 0.45, out);
    else blend(MID, TAIL, (t - 0.45) / 0.55, out);
  };

  const measure = (state: GameState, view: View, t: number, center: Point): void => {
    const { snake } = state;
    const effect = activeEffect(state);
    const tint = effect === 'fire' ? FIRE : effect === 'ice' ? ICE : null;
    const range = 1 - CONFIG.snakeFogFloor;
    // A cauda também afina numa cobra curta, senão os primeiros segundos de
    // partida são uma cápsula de pontas iguais, sem frente nem trás.
    const taperSpan = Math.max(1, Math.min(CONFIG.snakeTaperSegments, snake.length - 1));

    for (let i = 0; i < snake.length; i++) {
      const pos = segmentAt(state, i, t);
      const joint = joints[i] ?? (joints[i] = blankJoint());

      joint.x = view.ox + (pos.x + 0.5) * view.cell;
      joint.y = view.oy + (pos.y + 0.5) * view.cell;

      // Sem o afinamento o corpo parece cortado com tesoura.
      const fromTail = snake.length - 1 - i;
      const taper =
        fromTail >= taperSpan
          ? 1
          : CONFIG.snakeTailTaper + (1 - CONFIG.snakeTailTaper) * (fromTail / taperSpan);
      const width = i === 0 ? CONFIG.snakeHeadWidth : CONFIG.snakeBodyWidth * taper;
      joint.width = width * view.cell;

      ramp(i, body);
      if (tint) blend(body, tint, CONFIG.snakeEffectTint, tinted);
      else copy(body, tinted);

      const dim = fogAlpha(state.world, center, pos.x + 0.5, pos.y + 0.5) * range;
      blend(tinted, VOID, dim, tinted);

      joint.base = css(tinted);
      // O contorno é a cor do corpo escurecida: descola a cobra do terreno
      // sem precisar de brilho em volta dela.
      joint.rim = css(tinted, 0.5);
      blend(tinted, SHEEN, 0.24 * (1 - dim), lit);
      joint.sheen = css(lit);

      joint.onScreen =
        pos.x >= view.rect.minX - 2 &&
        pos.x <= view.rect.maxX + 2 &&
        pos.y >= view.rect.minY - 2 &&
        pos.y <= view.rect.maxY + 2;
    }
    joints.length = snake.length;
  };

  /**
   * Uma passada pelo corpo inteiro, da cauda para a cabeça. Passada inteira e
   * não três traços por segmento: com as três juntas, o corpo do segmento
   * seguinte cobre metade do realce do anterior e o brilho sai picotado.
   */
  const sweep = (
    ctx: CanvasRenderingContext2D,
    key: 'rim' | 'base' | 'sheen',
    scale: number,
    offX: number,
    offY: number,
  ): void => {
    for (let i = joints.length - 1; i >= 0; i--) {
      const a = joints[i];
      const b = i > 0 ? joints[i - 1] : a;
      if (!a.onScreen && !b.onScreen) continue;

      ctx.strokeStyle = a[key];
      ctx.lineWidth = a.width * scale;
      ctx.beginPath();
      ctx.moveTo(a.x + offX, a.y + offY);
      ctx.lineTo(b.x + offX, b.y + offY);
      ctx.stroke();
    }
  };

  const emitSparks = (state: GameState, dtMs: number): void => {
    const effect = activeEffect(state);
    if (!effect || state.phase !== 'playing') return;

    sparkDebt += (dtMs / 1000) * CONFIG.sparkPerSecond;
    while (sparkDebt >= 1 && sparks.length < CONFIG.sparkMax) {
      sparkDebt -= 1;

      // Em qualquer ponto do corpo, com peso na cabeça.
      const index = Math.floor(Math.pow(rng.next(), 2) * state.snake.length);
      const segment = state.snake[Math.min(index, state.snake.length - 1)];

      const rising = effect === 'fire';
      sparks.push({
        x: segment.x + 0.5 + (rng.next() - 0.5) * 0.7,
        y: segment.y + 0.5 + (rng.next() - 0.5) * 0.7,
        vx: (rng.next() - 0.5) * (rising ? 0.5 : 0.3),
        vy: rising ? -0.7 - rng.next() * 0.7 : 0.28 + rng.next() * 0.3,
        r: (rising ? 0.035 : 0.028) + rng.next() * 0.045,
        ageMs: 0,
        spanMs: CONFIG.sparkLifeMs * (0.6 + rng.next() * 0.8),
        color: rising ? (rng.next() < 0.35 ? THEME.textBonus : ITEMS.fire.color) : ITEMS.ice.color,
      });
    }
  };

  const drawSparks = (
    ctx: CanvasRenderingContext2D,
    view: View,
    dtMs: number,
    frozen: boolean,
  ): void => {
    const dt = frozen ? 0 : dtMs / 1000;

    for (let i = sparks.length - 1; i >= 0; i--) {
      const spark = sparks[i];
      spark.ageMs += frozen ? 0 : dtMs;
      if (spark.ageMs >= spark.spanMs) {
        sparks.splice(i, 1);
        continue;
      }
      spark.x += spark.vx * dt;
      spark.y += spark.vy * dt;

      const life = spark.ageMs / spark.spanMs;
      ctx.globalAlpha = Math.sin(life * Math.PI) * 0.7;
      ctx.fillStyle = spark.color;
      ctx.beginPath();
      ctx.arc(
        view.ox + spark.x * view.cell,
        view.oy + spark.y * view.cell,
        spark.r * view.cell * (1 - life * 0.4),
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  };

  return {
    draw(ctx, state, view, t, center, dtMs) {
      if (state.snake.length === 0) return;

      // Partida nova: as fagulhas da anterior cairiam sobre outro terreno.
      if (state !== lastState) {
        sparks.length = 0;
        sparkDebt = 0;
        lastState = state;
      }

      measure(state, view, t, center);

      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Um caminho só: cápsulas sobrepostas com alfa deixariam cada junta
      // mais escura que o resto.
      ctx.strokeStyle = THEME.snakeShadow;
      ctx.lineWidth = CONFIG.snakeBodyWidth * view.cell;
      ctx.beginPath();
      for (let i = 0; i < joints.length; i++) {
        const joint = joints[i];
        const x = joint.x + view.cell * 0.06;
        const y = joint.y + view.cell * 0.11;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      sweep(ctx, 'rim', 1, 0, 0);
      sweep(ctx, 'base', 0.74, 0, 0);
      sweep(ctx, 'sheen', 0.26, 0, 0);

      drawFace(ctx, state, view, joints[0]);
      ctx.restore();

      emitSparks(state, dtMs);
      drawSparks(ctx, view, dtMs, state.phase === 'paused');
    },
  };
}

function activeEffect(state: GameState): EffectKind | null {
  if (hasEffect(state.effects, 'fire')) return 'fire';
  if (hasEffect(state.effects, 'ice')) return 'ice';
  return null;
}

function copy(from: Rgb, out: Rgb): void {
  out[0] = from[0];
  out[1] = from[1];
  out[2] = from[2];
}

function blankJoint(): Joint {
  return { x: 0, y: 0, width: 0, rim: '#000', base: '#000', sheen: '#000', onScreen: false };
}

/** Cara da cobra: olhos, brilho no olho e a língua. */
function drawFace(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  view: View,
  head: Joint,
): void {
  const cell = view.cell;
  const dir = state.direction;
  const forward = cell * 0.14;
  const side = cell * 0.2;
  const eyeR = Math.max(1.2, cell * 0.086);

  if (state.phase === 'playing') {
    const beat = state.elapsedMs % CONFIG.tonguePeriodMs;
    if (beat < CONFIG.tongueShowMs) {
      // Estica e recolhe dentro da janela, em vez de aparecer e sumir.
      const out = Math.sin((beat / CONFIG.tongueShowMs) * Math.PI);
      const px = -dir.y;
      const py = dir.x;
      const baseX = head.x + dir.x * cell * 0.42;
      const baseY = head.y + dir.y * cell * 0.42;
      const forkX = baseX + dir.x * cell * 0.2 * out;
      const forkY = baseY + dir.y * cell * 0.2 * out;

      ctx.strokeStyle = THEME.snakeTongue;
      ctx.lineWidth = Math.max(1, cell * 0.045);
      ctx.beginPath();
      ctx.moveTo(baseX, baseY);
      ctx.lineTo(forkX, forkY);
      for (const sign of [-1, 1]) {
        ctx.moveTo(forkX, forkY);
        ctx.lineTo(
          forkX + (dir.x * 0.13 + px * 0.1 * sign) * cell * out,
          forkY + (dir.y * 0.13 + py * 0.1 * sign) * cell * out,
        );
      }
      ctx.stroke();
    }
  }

  for (const sign of [-1, 1]) {
    const ex = head.x + dir.x * forward + -dir.y * side * sign;
    const ey = head.y + dir.y * forward + dir.x * side * sign;

    ctx.fillStyle = THEME.snakeEye;
    ctx.beginPath();
    ctx.arc(ex, ey, eyeR, 0, Math.PI * 2);
    ctx.fill();

    // Ponto de luz no olho, no mesmo canto de onde vem a luz do corpo.
    ctx.fillStyle = THEME.snakeGlint;
    ctx.beginPath();
    ctx.arc(ex - eyeR * 0.3, ey - eyeR * 0.32, eyeR * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
}
