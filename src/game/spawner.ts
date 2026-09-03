import type { Rng } from '../core/rng.ts';
import type { Vec2 } from '../core/vec.ts';
import { cellKey } from '../core/vec.ts';
import type { World } from '../world/world.ts';
import type { Rock } from './state.ts';
import { CONFIG } from './config.ts';

/** Células logo à frente da cabeça, onde uma pedra tornaria a morte inevitável. */
function dangerZone(head: Vec2, direction: Vec2): Vec2[] {
  const zone: Vec2[] = [head];
  for (let i = 1; i <= CONFIG.rockSafetyRadius; i++) {
    zone.push({ x: head.x + direction.x * i, y: head.y + direction.y * i });
  }
  return zone;
}

function blockedCells(cells: readonly (readonly Vec2[])[]): Set<string> {
  const blocked = new Set<string>();
  for (const group of cells) {
    for (const cell of group) blocked.add(cellKey(cell));
  }
  return blocked;
}

/**
 * Uma célula livre no anel ao redor da cabeça. Num mundo infinito não existe
 * a lista de células vagas, e pedra que cai longe do jogador não é aposta.
 */
function ringCell(rng: Rng, world: World, center: Vec2, blocked: Set<string>): Vec2 | null {
  const span = CONFIG.rockSpawnMaxRadius - CONFIG.rockSpawnMinRadius;

  for (let attempt = 0; attempt < 48; attempt++) {
    const angle = rng.next() * Math.PI * 2;
    const radius = CONFIG.rockSpawnMinRadius + rng.next() * span;
    const cell = {
      x: center.x + Math.round(Math.cos(angle) * radius),
      y: center.y + Math.round(Math.sin(angle) * radius),
    };

    const key = cellKey(cell);
    if (blocked.has(key)) continue;
    if (world.isRuin(cell.x, cell.y)) continue;
    // Pedra em cima de item enterraria a recompensa até a pedra derreter.
    if (world.itemAt(cell.x, cell.y)) continue;
    return cell;
  }
  return null;
}

export function spawnRocks(
  rng: Rng,
  world: World,
  snake: readonly Vec2[],
  head: Vec2,
  direction: Vec2,
  existing: readonly Rock[],
): Rock[] {
  const blocked = blockedCells([snake, existing, dangerZone(head, direction)]);
  const rocks: Rock[] = [];

  for (let i = 0; i < CONFIG.earthRockCount; i++) {
    const cell = ringCell(rng, world, head, blocked);
    if (!cell) continue;
    blocked.add(cellKey(cell));
    rocks.push({
      x: cell.x,
      y: cell.y,
      remainingMs: CONFIG.earthRockLifetimeMs,
      totalMs: CONFIG.earthRockLifetimeMs,
      reward: CONFIG.earthRockReward,
    });
  }
  return rocks;
}
