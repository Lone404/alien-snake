import { CONFIG } from '../game/config.ts';
import type { GameState } from '../game/state.ts';
import type { ItemDef } from '../items/catalog.ts';
import { ITEMS } from '../items/catalog.ts';
import { drawSprite } from '../items/sprites.ts';
import type { Point } from '../world/vision.ts';
import { visibility } from '../world/vision.ts';
import type { Rect, WorldItem } from '../world/world.ts';
import type { Surface } from './canvas.ts';
import { THEME } from './theme.ts';

export interface Marker {
  item: WorldItem;
  def: ItemDef;
  distance: number;
}

/**
 * O que a bússola aponta. Duas fontes, e a diferença entre elas é regra de
 * jogo: a comida mais próxima é farejada mesmo no escuro, todo o resto
 * precisa ter sido avistado. Item sob a luz agora não ganha seta.
 */
export function collectMarkers(state: GameState, rect: Rect, center: Point): Marker[] {
  const head = state.snake[0];
  const candidates: WorldItem[] = [];

  const food = state.world.nearestFood(head.x, head.y);
  if (food) candidates.push(food);
  for (const item of state.tracked) candidates.push(item);

  const markers: Marker[] = [];
  for (const item of candidates) {
    const onScreen =
      item.x >= rect.minX && item.x <= rect.maxX && item.y >= rect.minY && item.y <= rect.maxY;
    if (onScreen && visibility(center, item.x + 0.5, item.y + 0.5) > 0.5) continue;

    const distance = Math.hypot(item.x - head.x, item.y - head.y);
    if (distance > CONFIG.scentRadius) continue;
    markers.push({ item, def: ITEMS[item.id], distance });
  }

  markers.sort((a, b) => a.distance - b.distance);
  return markers.slice(0, CONFIG.maxMarkers);
}

/**
 * Setas presas na borda da tela. Substituem o minimapa, que num mundo sem
 * borda não teria o que emoldurar.
 */
export function drawMarkers(
  ctx: CanvasRenderingContext2D,
  surface: Surface,
  markers: readonly Marker[],
  originX: number,
  originY: number,
  cell: number,
  elapsedMs: number,
  fade: number,
): void {
  if (fade <= 0.01) return;

  const cx = surface.width / 2;
  const cy = surface.height / 2;
  const boundX = Math.max(24, cx - CONFIG.markerMargin);
  const boundY = Math.max(24, cy - CONFIG.markerMargin);

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (const marker of markers) {
    const dx = originX + (marker.item.x + 0.5) * cell - cx;
    const dy = originY + (marker.item.y + 0.5) * cell - cy;
    const length = Math.hypot(dx, dy);
    if (length < 1) continue;

    // Empurra o alvo até a moldura interna: o menor dos dois fatores decide
    // se a seta encosta na lateral ou no topo.
    const scale = Math.min(boundX / Math.abs(dx || 0.0001), boundY / Math.abs(dy || 0.0001));
    const px = cx + dx * scale;
    const py = cy + dy * scale;
    const nx = dx / length;
    const ny = dy / length;

    // Longe pesa menos; o que está prestes a sumir pulsa.
    const proximity = 1 - Math.min(1, marker.distance / CONFIG.scentRadius);
    const expiring =
      marker.item.remainingMs !== null && marker.item.remainingMs < 2200
        ? 0.55 + 0.45 * Math.abs(Math.sin(elapsedMs / 130))
        : 1;
    const alpha = fade * (0.42 + 0.58 * proximity) * expiring;

    ctx.globalAlpha = alpha;

    ctx.fillStyle = THEME.markerWell;
    ctx.beginPath();
    ctx.arc(px, py, 15, 0, Math.PI * 2);
    ctx.fill();

    drawSprite(ctx, marker.def.sprite, px, py, 19);

    // Anel de tempo restante, igual ao do item no chão.
    if (marker.item.remainingMs !== null && marker.item.totalMs) {
      const ratio = Math.max(0, marker.item.remainingMs / marker.item.totalMs);
      ctx.strokeStyle = marker.def.color;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(px, py, 18.5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio);
      ctx.stroke();
    }

    // A ponta diz a direção; o poço diz o que é.
    ctx.fillStyle = marker.def.color;
    ctx.beginPath();
    ctx.moveTo(px + nx * 27, py + ny * 27);
    ctx.lineTo(px + nx * 17 - ny * 7, py + ny * 17 + nx * 7);
    ctx.lineTo(px + nx * 17 + ny * 7, py + ny * 17 - nx * 7);
    ctx.closePath();
    ctx.fill();

    // O rótulo cai para dentro da tela, nunca para fora dela.
    const label = Math.round(marker.distance) + 'm';
    ctx.font = '600 11px "JetBrains Mono", ui-monospace, monospace';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = THEME.markerWell;
    ctx.strokeText(label, px - nx * 26, py - ny * 26);
    ctx.fillStyle = THEME.markerLabel;
    ctx.fillText(label, px - nx * 26, py - ny * 26);
  }

  ctx.restore();
}

/**
 * Migalhas: um fio de partículas saindo da cabeça na direção da comida. Só
 * aparecem com a comida mais próxima fora da tela; ligadas o tempo todo, o
 * jogador para de olhar o mundo e passa a seguir a linha.
 */
export function drawBreadcrumbs(
  ctx: CanvasRenderingContext2D,
  from: Point,
  to: Point,
  originX: number,
  originY: number,
  cell: number,
  elapsedMs: number,
  color: string,
  fade: number,
): void {
  const dx = to.x + 0.5 - from.x;
  const dy = to.y + 0.5 - from.y;
  const length = Math.hypot(dx, dy);
  if (length < 0.5 || fade <= 0.01) return;

  const nx = dx / length;
  const ny = dy / length;

  ctx.save();
  ctx.fillStyle = color;

  for (let i = 0; i < CONFIG.breadcrumbCount; i++) {
    // Cada migalha corre o mesmo trecho, defasada da anterior.
    const travel = ((elapsedMs / 900 + i / CONFIG.breadcrumbCount) % 1 + 1) % 1;
    const reach = 1.4 + travel * 3.4;

    ctx.globalAlpha = Math.sin(travel * Math.PI) * 0.42 * fade;
    ctx.beginPath();
    ctx.arc(
      originX + (from.x + nx * reach) * cell,
      originY + (from.y + ny * reach) * cell,
      cell * 0.075,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }

  ctx.restore();
}
