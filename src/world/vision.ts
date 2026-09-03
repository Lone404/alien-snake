import type { Vec2 } from '../core/vec.ts';
import { CONFIG } from '../game/config.ts';
import type { World, WorldItem } from './world.ts';

/** Ponto no mundo, em células, com casa decimal. */
export interface Point {
  x: number;
  y: number;
}

/**
 * Centro do círculo de visão: adiantado `visionLead` células na direção em
 * que a cobra anda, para sobrar tempo de reação ao que vem pela frente.
 */
export function visionCenter(head: Vec2, direction: Vec2): Point {
  return {
    x: head.x + 0.5 + direction.x * CONFIG.visionLead,
    y: head.y + 0.5 + direction.y * CONFIG.visionLead,
  };
}

const INNER_RADIUS = CONFIG.visionRadius - CONFIG.visionFalloff;
const INNER_SQUARED = INNER_RADIUS * INNER_RADIUS;
const OUTER_SQUARED = CONFIG.visionRadius * CONFIG.visionRadius;

/**
 * 1 = iluminado, 0 = fora da visão, com queda macia na borda.
 *
 * Chamada dezenas de milhares de vezes por quadro: os testes contra a
 * distância ao quadrado cobrem miolo e escuridão sem gastar uma raiz.
 */
export function visibility(center: Point, x: number, y: number): number {
  const dx = x - center.x;
  const dy = y - center.y;
  const squared = dx * dx + dy * dy;
  if (squared <= INNER_SQUARED) return 1;
  if (squared >= OUTER_SQUARED) return 0;

  const t = (Math.sqrt(squared) - INNER_RADIUS) / CONFIG.visionFalloff;
  return 1 - t * t * (3 - 2 * t);
}

/**
 * Opacidade da névoa sobre um ponto: iluminado, lembrado (visto antes, sob o
 * véu de memória) ou nunca visto (escuridão fechada).
 */
export function fogAlpha(world: World, center: Point, x: number, y: number): number {
  const lit = visibility(center, x, y);
  if (lit >= 1) return 0;
  const base = world.isSeen(Math.floor(x), Math.floor(y)) ? CONFIG.memoryVeil : 1;
  return base * (1 - lit);
}

/** Marca como visto tudo que está sob o círculo de luz. */
export function reveal(world: World, center: Point): void {
  const radius = CONFIG.visionRadius;
  const minX = Math.floor(center.x - radius);
  const maxX = Math.ceil(center.x + radius);
  const minY = Math.floor(center.y - radius);
  const maxY = Math.ceil(center.y + radius);

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      if (Math.hypot(x + 0.5 - center.x, y + 0.5 - center.y) <= radius) world.markSeen(x, y);
    }
  }
}

/** Itens sob a luz que ainda não tinham sido avistados. */
export function newlySpotted(world: World, center: Point): WorldItem[] {
  const found: WorldItem[] = [];
  for (const item of world.itemsWithin(center.x, center.y, CONFIG.visionRadius)) {
    if (!item.discovered) found.push(item);
  }
  return found;
}
