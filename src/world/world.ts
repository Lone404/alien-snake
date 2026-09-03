import { createRng } from '../core/rng.ts';
import type { Vec2 } from '../core/vec.ts';
import { CONFIG } from '../game/config.ts';
import type { ItemDef, ItemId } from '../items/catalog.ts';
import { ITEM_LIST } from '../items/catalog.ts';
import type { Biome, BiomeMix } from './biomes.ts';
import { createBiomeMix, dominantBiome, mixColor, sampleBiome } from './biomes.ts';
import { hashCoords } from './hash.ts';

/** Retângulo em células do mundo, inclusivo nos dois cantos. */
export interface Rect {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface WorldItem extends Vec2 {
  id: ItemId;
  /** Null até o item ser avistado: o relógio só corre depois disso. */
  remainingMs: number | null;
  totalMs: number | null;
  discovered: boolean;
  /** Fase própria da flutuação, para os itens não pulsarem em uníssono. */
  phase: number;
}

/** Ruína, com as duas faces já resolvidas na posição dela. */
export interface Ruin extends Vec2 {
  color: string;
  faceColor: string;
}

export interface Chunk {
  cx: number;
  cy: number;
  biome: Biome;
  ruins: Ruin[];
  /** Índice de `ruins` para a colisão não varrer a lista a cada passo. */
  ruinKeys: Set<string>;
  items: WorldItem[];
  /** Máscara de exploração, um byte por célula. */
  seen: Uint8Array;
}

export interface World {
  readonly seed: number;
  /** Bioma dominante no ponto exato, não no chunk: o campo é contínuo. */
  biomeAt(x: number, y: number): Biome;
  isRuin(x: number, y: number): boolean;
  itemAt(x: number, y: number): WorldItem | null;
  removeItem(item: WorldItem): void;
  chunksInRect(rect: Rect): Chunk[];
  itemsInRect(rect: Rect): WorldItem[];
  itemsWithin(x: number, y: number, radius: number): WorldItem[];
  /** Comida mais próxima, mesmo no escuro. */
  nearestFood(x: number, y: number): WorldItem | null;
  isSeen(x: number, y: number): boolean;
  markSeen(x: number, y: number): void;
  /** Descarta os chunks fora do raio de guarda. */
  prune(x: number, y: number): void;
}

const SIZE = CONFIG.chunkSize;

/** Módulo que também funciona com coordenada negativa. */
function wrapCell(value: number): number {
  return ((value % SIZE) + SIZE) % SIZE;
}

export function chunkOf(value: number): number {
  return Math.floor(value / SIZE);
}

function inSpawnClearing(x: number, y: number): boolean {
  return Math.hypot(x, y) < CONFIG.spawnClearRadius;
}

const POWER_UPS: ItemDef[] = ITEM_LIST.filter((item) => item.id !== 'food');

/** Sorteio ponderado de power-up, com peso extra para o elemento da região. */
function pickPowerUp(roll: number, biome: Biome): ItemDef {
  const weight = (item: ItemDef): number =>
    item.weight * (item.id === biome.favors ? 2.5 : 1);

  const total = POWER_UPS.reduce((sum, item) => sum + weight(item), 0);
  let acc = roll * total;
  for (const item of POWER_UPS) {
    acc -= weight(item);
    if (acc <= 0) return item;
  }
  return POWER_UPS[POWER_UPS.length - 1];
}

function generate(seed: number, cx: number, cy: number, mix: BiomeMix): Chunk {
  const rng = createRng(hashCoords(seed, cx, cy));
  const originX = cx * SIZE;
  const originY = cy * SIZE;

  // Só enviesa o sorteio de power-up. O desenho não usa isto: ele amostra o
  // campo de biomas na posição de cada peça.
  const biome = dominantBiome(
    sampleBiome(seed, originX + SIZE / 2, originY + SIZE / 2, mix),
  );

  const taken = new Set<string>();
  const ruins: Ruin[] = [];
  const ruinKeys = new Set<string>();

  // A caminhada não pode vazar para o chunk vizinho: a colisão consulta
  // sempre o chunk da célula, então a ruína existiria no desenho e não na
  // regra.
  const clusters = rng.int(CONFIG.ruinClusters + 1);
  for (let c = 0; c < clusters; c++) {
    let x = originX + rng.int(SIZE);
    let y = originY + rng.int(SIZE);

    const length = 2 + rng.int(CONFIG.ruinClusterSize);
    for (let i = 0; i < length; i++) {
      const key = x + ',' + y;
      if (!inSpawnClearing(x, y) && !ruinKeys.has(key)) {
        ruinKeys.add(key);
        taken.add(key);
        sampleBiome(seed, x + 0.5, y + 0.5, mix);
        ruins.push({
          x,
          y,
          color: mixColor(mix, 'ruin'),
          faceColor: mixColor(mix, 'ruinFace'),
        });
      }
      const horizontal = rng.next() < 0.5;
      const stride = rng.next() < 0.5 ? -1 : 1;
      x = Math.min(originX + SIZE - 1, Math.max(originX, x + (horizontal ? stride : 0)));
      y = Math.min(originY + SIZE - 1, Math.max(originY, y + (horizontal ? 0 : stride)));
    }
  }

  const items: WorldItem[] = [];
  const place = (def: ItemDef): void => {
    for (let attempt = 0; attempt < 24; attempt++) {
      const x = originX + rng.int(SIZE);
      const y = originY + rng.int(SIZE);
      const key = x + ',' + y;
      if (taken.has(key) || inSpawnClearing(x, y)) continue;
      taken.add(key);
      items.push({
        x,
        y,
        id: def.id,
        remainingMs: null,
        totalMs: def.lifetimeMs,
        discovered: false,
        phase: rng.next() * Math.PI * 2,
      });
      return;
    }
  };

  for (let i = 0; i < CONFIG.foodPerChunk; i++) place(ITEM_LIST[0]);
  for (let i = 0; i < CONFIG.powerUpsPerChunk; i++) place(pickPowerUp(rng.next(), biome));

  return { cx, cy, biome, ruins, ruinKeys, items, seen: new Uint8Array(SIZE * SIZE) };
}

/**
 * Mapa de chunks gerados sob demanda. O que sai do raio de guarda é
 * descartado; voltar lá regenera o mesmo terreno, já que tudo sai da semente
 * e das coordenadas. Só os itens renascem.
 */
export function createWorld(seed: number): World {
  const chunks = new Map<string, Chunk>();
  // Reaproveitada: nenhuma amostra sobrevive à linha seguinte.
  const scratch = createBiomeMix();

  const chunkAt = (cx: number, cy: number): Chunk => {
    const key = cx + ',' + cy;
    let chunk = chunks.get(key);
    if (!chunk) {
      chunk = generate(seed, cx, cy, scratch);
      chunks.set(key, chunk);
    }
    return chunk;
  };

  const chunkForCell = (x: number, y: number): Chunk => chunkAt(chunkOf(x), chunkOf(y));

  const chunksInRect = (rect: Rect): Chunk[] => {
    const list: Chunk[] = [];
    for (let cy = chunkOf(rect.minY); cy <= chunkOf(rect.maxY); cy++) {
      for (let cx = chunkOf(rect.minX); cx <= chunkOf(rect.maxX); cx++) {
        list.push(chunkAt(cx, cy));
      }
    }
    return list;
  };

  const ringItems = (cx: number, cy: number, ring: number): WorldItem[] => {
    const found: WorldItem[] = [];
    for (let y = cy - ring; y <= cy + ring; y++) {
      for (let x = cx - ring; x <= cx + ring; x++) {
        // Só a casca do anel: o miolo já foi visitado na volta anterior.
        if (ring > 0 && Math.abs(x - cx) !== ring && Math.abs(y - cy) !== ring) continue;
        for (const item of chunkAt(x, y).items) found.push(item);
      }
    }
    return found;
  };

  return {
    seed,
    chunksInRect,

    biomeAt: (x, y) => dominantBiome(sampleBiome(seed, x + 0.5, y + 0.5, scratch)),

    isRuin: (x, y) => chunkForCell(x, y).ruinKeys.has(x + ',' + y),

    itemAt(x, y) {
      for (const item of chunkForCell(x, y).items) {
        if (item.x === x && item.y === y) return item;
      }
      return null;
    },

    removeItem(item) {
      const chunk = chunkForCell(item.x, item.y);
      const index = chunk.items.indexOf(item);
      if (index >= 0) chunk.items.splice(index, 1);
    },

    itemsInRect(rect) {
      const found: WorldItem[] = [];
      for (const chunk of chunksInRect(rect)) {
        for (const item of chunk.items) {
          const inside =
            item.x >= rect.minX &&
            item.x <= rect.maxX &&
            item.y >= rect.minY &&
            item.y <= rect.maxY;
          if (inside) found.push(item);
        }
      }
      return found;
    },

    itemsWithin(x, y, radius) {
      const rect: Rect = {
        minX: Math.floor(x - radius),
        minY: Math.floor(y - radius),
        maxX: Math.ceil(x + radius),
        maxY: Math.ceil(y + radius),
      };
      const found: WorldItem[] = [];
      for (const chunk of chunksInRect(rect)) {
        for (const item of chunk.items) {
          if (Math.hypot(item.x + 0.5 - x, item.y + 0.5 - y) <= radius) found.push(item);
        }
      }
      return found;
    },

    // Em anéis de chunk, não no raio de faro inteiro: varrer 60 células de
    // raio geraria 25 chunks só para responder uma seta da bússola.
    nearestFood(x, y) {
      const cx = chunkOf(x);
      const cy = chunkOf(y);

      for (let ring = 0; ring <= 2; ring++) {
        let best: WorldItem | null = null;
        let bestDistance = Infinity;

        for (const item of ringItems(cx, cy, ring)) {
          if (item.id !== 'food') continue;
          const distance = Math.hypot(item.x - x, item.y - y);
          if (distance < bestDistance) {
            bestDistance = distance;
            best = item;
          }
        }
        if (best) return best;
      }
      return null;
    },

    isSeen: (x, y) => chunkForCell(x, y).seen[wrapCell(y) * SIZE + wrapCell(x)] !== 0,

    markSeen(x, y) {
      chunkForCell(x, y).seen[wrapCell(y) * SIZE + wrapCell(x)] = 1;
    },

    prune(x, y) {
      const cx = chunkOf(x);
      const cy = chunkOf(y);
      const radius = CONFIG.chunkKeepRadius;

      for (const [key, chunk] of chunks) {
        if (Math.abs(chunk.cx - cx) > radius || Math.abs(chunk.cy - cy) > radius) {
          chunks.delete(key);
        }
      }
    },
  };
}
