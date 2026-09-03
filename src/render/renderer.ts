import { CONFIG } from '../game/config.ts';
import { rocksAreFrozen } from '../game/effects.ts';
import type { GameState } from '../game/state.ts';
import { ITEMS } from '../items/catalog.ts';
import { drawSprite } from '../items/sprites.ts';
import type { BiomeMix } from '../world/biomes.ts';
import { createBiomeMix, mixAlpha, mixColor, sampleBiome } from '../world/biomes.ts';
import type { Point } from '../world/vision.ts';
import { visibility, visionCenter } from '../world/vision.ts';
import type { Chunk } from '../world/world.ts';
import type { Camera } from './camera.ts';
import { createCamera, gaze, originX, originY, updateCamera, visibleRect } from './camera.ts';
import type { Surface } from './canvas.ts';
import { collectMarkers, drawBreadcrumbs, drawMarkers } from './compass.ts';
import { createFogLayer } from './fog.ts';
import type { FloatingTexts } from './floatingText.ts';
import { segmentAt, stepProgress } from './motion.ts';
import { createSnakeRenderer } from './snakeSkin.ts';
import type { TerrainLayer } from './terrain.ts';
import { createTerrainLayer } from './terrain.ts';
import { THEME } from './theme.ts';
import type { View } from './view.ts';

export interface Renderer {
  readonly camera: Camera;
  draw(surface: Surface, state: GameState, floats: FloatingTexts, dtMs: number): void;
}

export function createRenderer(): Renderer {
  const camera = createCamera();
  const fog = createFogLayer();
  const snake = createSnakeRenderer();
  const mix: BiomeMix = createBiomeMix();

  // Refeito só quando a semente do mundo muda, não a cada quadro.
  let seed = -1;
  let terrain: TerrainLayer | null = null;

  return {
    camera,

    draw(surface, state, floats, dtMs) {
      const { ctx, width, height } = surface;
      if (width <= 0) return;

      if (!terrain || state.world.seed !== seed) {
        seed = state.world.seed;
        terrain = createTerrainLayer(seed);
      }

      updateCamera(camera, state, surface, dtMs);

      const view: View = {
        ox: originX(camera, surface),
        oy: originY(camera, surface),
        cell: camera.cell,
        rect: visibleRect(camera, surface),
      };

      const t = stepProgress(state);
      const head = segmentAt(state, 0, t);
      // A luz segue a mira amortecida, não a direção crua, senão ela salta
      // três células a cada curva. Quem revela o mapa continua sendo a
      // direção de verdade, no tick.
      const center = visionCenter(head, gaze(camera));

      ctx.fillStyle = THEME.voidBg;
      ctx.fillRect(0, 0, width, height);

      terrain.draw(ctx, view.rect, view.ox, view.oy, view.cell);
      drawGrid(ctx, state, view, camera, mix);
      drawRuins(ctx, state, view, center);
      drawRocks(ctx, state, view);
      drawItems(ctx, state, view, center);

      // A névoa cai sobre o mundo e só sobre ele: o que vem depois é o
      // jogador e a interface.
      fog.draw(ctx, view.rect, view.ox, view.oy, view.cell, state.world, center);

      drawGuidance(ctx, surface, state, view, center, head);
      snake.draw(ctx, state, view, t, center, dtMs);
      drawFloatingTexts(ctx, floats, view);

      if (state.phase === 'gameover') {
        ctx.fillStyle = THEME.deathVeil;
        ctx.fillRect(0, 0, width, height);
      }
    },
  };
}

/**
 * Célula nunca vista e fora da luz. A névoa vai cobri-la de qualquer jeito,
 * e ela é a maior parte da tela: pular esses desenhos corta cerca de dois
 * terços das chamadas por quadro.
 */
function buried(state: GameState, center: Point, x: number, y: number): boolean {
  return (
    visibility(center, x + 0.5, y + 0.5) < 0.02 &&
    !state.world.isSeen(Math.floor(x), Math.floor(y))
  );
}

/**
 * A grelha, numa cor só para a tela inteira, amostrada no centro da câmera:
 * a 5% de opacidade ela não justifica um traçado por região.
 *
 * Em coordenada fracionária, sem encaixar em pixel inteiro. Com o mundo
 * deslizando sob a câmera, o encaixe faz cada linha cruzar o limite do
 * arredondamento num instante diferente, e a tela inteira treme.
 */
function drawGrid(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  view: View,
  camera: Camera,
  mix: BiomeMix,
): void {
  sampleBiome(state.world.seed, camera.x, camera.y, mix);

  const left = view.ox + view.rect.minX * view.cell;
  const right = view.ox + (view.rect.maxX + 1) * view.cell;
  const top = view.oy + view.rect.minY * view.cell;
  const bottom = view.oy + (view.rect.maxY + 1) * view.cell;

  ctx.strokeStyle = mixColor(mix, 'grid', mixAlpha(mix));
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = view.rect.minX; x <= view.rect.maxX + 1; x++) {
    const px = view.ox + x * view.cell;
    ctx.moveTo(px, top);
    ctx.lineTo(px, bottom);
  }
  for (let y = view.rect.minY; y <= view.rect.maxY + 1; y++) {
    const py = view.oy + y * view.cell;
    ctx.moveTo(left, py);
    ctx.lineTo(right, py);
  }
  ctx.stroke();
}

/**
 * Ruínas: bloco com faixa clara em cima, luz vindo do canto superior
 * esquerdo. As duas faces vêm com a cor resolvida na posição de cada bloco,
 * e não na do chunk, para uma massa que atravessa duas regiões mudar de
 * pedra ao longo dela em vez de partir numa reta.
 */
function drawRuins(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  view: View,
  center: Point,
): void {
  const inset = view.cell * 0.03;
  const side = view.cell - inset * 2;
  const radius = Math.max(1, view.cell * 0.1);

  const visible: Chunk['ruins'] = [];
  for (const chunk of state.world.chunksInRect(view.rect)) {
    for (const ruin of chunk.ruins) {
      if (ruin.x < view.rect.minX || ruin.x > view.rect.maxX) continue;
      if (ruin.y < view.rect.minY || ruin.y > view.rect.maxY) continue;
      if (buried(state, center, ruin.x, ruin.y)) continue;
      visible.push(ruin);
    }
  }
  for (const ruin of visible) {
    const x = view.ox + ruin.x * view.cell + inset;
    const y = view.oy + ruin.y * view.cell + inset;

    ctx.fillStyle = ruin.color;
    ctx.beginPath();
    ctx.roundRect(x, y, side, side, radius);
    ctx.fill();

    ctx.fillStyle = ruin.faceColor;
    ctx.beginPath();
    ctx.roundRect(x + inset, y + inset, side - inset * 2, side * 0.32, radius * 0.7);
    ctx.fill();
  }
}

function drawRocks(ctx: CanvasRenderingContext2D, state: GameState, view: View): void {
  const frozen = rocksAreFrozen(state.effects);
  // Congelar tinge cada faceta em direção ao azul: a pedra mantém o volume.
  const tint = frozen ? { color: THEME.rockFrozen, amount: 0.62 } : undefined;

  for (const rock of state.rocks) {
    if (rock.x < view.rect.minX || rock.x > view.rect.maxX) continue;
    if (rock.y < view.rect.minY || rock.y > view.rect.maxY) continue;

    // Perto de derreter a pedra pisca.
    const fading = rock.remainingMs < 1200 && !frozen;
    ctx.globalAlpha = fading ? 0.4 + 0.6 * Math.abs(Math.sin(state.elapsedMs / 90)) : 1;

    drawSprite(
      ctx,
      'rock',
      view.ox + (rock.x + 0.5) * view.cell,
      view.oy + (rock.y + 0.5) * view.cell,
      view.cell * 0.92,
      tint,
    );
    ctx.globalAlpha = 1;
  }
}

/** Os itens dentro do retângulo visível. */
function drawItems(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  view: View,
  center: Point,
): void {
  for (const item of state.world.itemsInRect(view.rect)) {
    if (buried(state, center, item.x, item.y)) continue;

    const def = ITEMS[item.id];
    // Cada um flutua na sua própria fase: em uníssono, seis frutas na tela
    // viram um pisca-pisca.
    const bob = Math.sin(state.elapsedMs / 520 + item.phase) * view.cell * 0.05;
    const cx = view.ox + (item.x + 0.5) * view.cell;
    const cy = view.oy + (item.y + 0.5) * view.cell + bob;

    // Halo na cor da peça, só onde ela está de fato acesa: o brilho sai do
    // elemento, nunca da superfície escura.
    if (visibility(center, item.x + 0.5, item.y + 0.5) > 0.15) {
      ctx.save();
      ctx.globalAlpha = 0.16;
      const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, view.cell * 0.76);
      halo.addColorStop(0, def.color);
      halo.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = halo;
      ctx.fillRect(cx - view.cell, cy - view.cell, view.cell * 2, view.cell * 2);
      ctx.restore();
    }

    drawSprite(ctx, def.sprite, cx, cy, view.cell * 0.92);

    // Anel de tempo restante, que só corre depois de o item ser avistado.
    if (item.remainingMs !== null && item.totalMs !== null) {
      const ratio = Math.max(0, item.remainingMs / item.totalMs);
      ctx.strokeStyle = def.color;
      ctx.globalAlpha = 0.7;
      ctx.lineWidth = Math.max(1.5, view.cell * 0.06);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(cx, cy, view.cell * 0.58, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
}

/** Bússola e migalhas. Fora da partida somem junto com o resto do HUD. */
function drawGuidance(
  ctx: CanvasRenderingContext2D,
  surface: Surface,
  state: GameState,
  view: View,
  center: Point,
  head: Point,
): void {
  const fade = state.phase === 'menu' ? 0 : state.phase === 'gameover' ? 0.35 : 1;
  if (fade <= 0) return;

  const markers = collectMarkers(state, view.rect, center);
  const food = markers.find((marker) => marker.item.id === 'food');

  if (food) {
    drawBreadcrumbs(
      ctx,
      { x: head.x + 0.5, y: head.y + 0.5 },
      food.item,
      view.ox,
      view.oy,
      view.cell,
      state.elapsedMs,
      ITEMS.food.color,
      fade,
    );
  }

  drawMarkers(ctx, surface, markers, view.ox, view.oy, view.cell, state.elapsedMs, fade);
}

/**
 * O número que sobe, em três tempos: estala numa escala com overshoot curto,
 * sobe desacelerando e só então apaga. O contorno na cor do fundo é o que
 * garante a leitura sobre qualquer bioma, sobre a cobra e sobre a névoa.
 */
function drawFloatingTexts(
  ctx: CanvasRenderingContext2D,
  floats: FloatingTexts,
  view: View,
): void {
  const cell = view.cell;

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';

  for (const float of floats.list) {
    const t = Math.min(1, float.ageMs / CONFIG.floatingTextMs);

    // Quase todo o deslocamento acontece no começo, e o texto fica parado
    // no ar antes de apagar.
    const rise = 1 - Math.pow(1 - t, 2.6);
    const x = view.ox + (float.cell.x + 0.5) * cell + float.drift * cell * 0.24 * rise;
    const y = view.oy + (float.cell.y + 0.5) * cell - cell * (0.46 + rise * 0.95);

    // Overshoot curto o bastante para o ponto não explodir na tela.
    const scale = t < 0.14 ? 0.82 + (t / 0.14) * 0.23 : Math.max(1, 1.05 - ((t - 0.14) / 0.16) * 0.05);

    // Opacidade cheia enquanto o jogador lê; a queda fica no último terço.
    const alpha = t < 0.62 ? 1 : Math.pow(1 - (t - 0.62) / 0.38, 1.6);

    const base = float.tone === 'warn' ? 0.26 : float.tone === 'bonus' ? 0.36 : 0.32;
    const size = cell * base * scale;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);

    const main = float.tone === 'warn' ? float.text.toUpperCase() : float.text;
    ctx.font = `${float.tone === 'warn' ? 500 : 700} ${size.toFixed(1)}px "JetBrains Mono", ui-monospace, monospace`;
    if (float.tone === 'warn') ctx.letterSpacing = `${(size * 0.14).toFixed(2)}px`;

    const mainWidth = ctx.measureText(main).width;
    const accentSize = size * 0.74;
    let accentWidth = 0;
    if (float.accent) {
      ctx.font = `700 ${accentSize.toFixed(1)}px "JetBrains Mono", ui-monospace, monospace`;
      accentWidth = ctx.measureText(float.accent).width + size * 0.18;
    }

    // Com o "×2" ao lado, quem fica centrado na célula é o conjunto.
    const left = -(mainWidth + accentWidth) / 2;

    ctx.textAlign = 'left';
    ctx.lineWidth = Math.max(1.5, size * 0.22);
    ctx.strokeStyle = THEME.voidBg;

    ctx.font = `${float.tone === 'warn' ? 500 : 700} ${size.toFixed(1)}px "JetBrains Mono", ui-monospace, monospace`;
    ctx.strokeText(main, left, 0);
    ctx.fillStyle = float.color;
    ctx.fillText(main, left, 0);

    if (float.accent) {
      ctx.font = `700 ${accentSize.toFixed(1)}px "JetBrains Mono", ui-monospace, monospace`;
      const accentX = left + mainWidth + size * 0.18;
      ctx.strokeText(float.accent, accentX, size * 0.04);
      ctx.fillStyle = THEME.textBonus;
      ctx.fillText(float.accent, accentX, size * 0.04);
    }

    ctx.restore();
  }
  ctx.restore();
}
