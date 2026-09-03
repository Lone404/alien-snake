import { CONFIG } from '../game/config.ts';
import type { ItemId } from '../items/catalog.ts';
import { hashCoords, smoothstep } from './hash.ts';

export type Rgb = readonly [number, number, number];

/**
 * Região do mundo. As cores ficam em canais numéricos, e não em string,
 * porque são misturadas milhares de vezes por quadro.
 */
export interface Biome {
  id: string;
  name: string;
  ground: Rgb;
  grid: Rgb;
  gridAlpha: number;
  /** Ruína: face de sombra e face de luz (luz vindo do canto superior esquerdo). */
  ruin: Rgb;
  ruinFace: Rgb;
  /** Elemento que a região favorece no sorteio de power-up. */
  favors: ItemId | null;
}

export const BIOMES: Biome[] = [
  {
    id: 'plain',
    name: 'Planície',
    ground: [17, 20, 24],
    grid: [126, 196, 188],
    gridAlpha: 0.05,
    ruin: [40, 44, 52],
    ruinFace: [60, 66, 77],
    favors: null,
  },
  {
    id: 'grove',
    name: 'Bosque',
    ground: [14, 22, 18],
    grid: [120, 200, 152],
    gridAlpha: 0.055,
    ruin: [33, 47, 39],
    ruinFace: [52, 70, 59],
    favors: 'essence',
  },
  {
    id: 'ashes',
    name: 'Cinzas',
    ground: [24, 17, 15],
    grid: [220, 138, 88],
    gridAlpha: 0.05,
    ruin: [51, 38, 33],
    ruinFace: [75, 56, 47],
    favors: 'fire',
  },
  {
    id: 'glacier',
    name: 'Geleira',
    ground: [15, 21, 29],
    grid: [125, 211, 252],
    gridAlpha: 0.06,
    ruin: [36, 47, 60],
    ruinFace: [57, 73, 90],
    favors: 'ice',
  },
  {
    id: 'quarry',
    name: 'Pedreira',
    ground: [21, 20, 19],
    grid: [206, 200, 188],
    gridAlpha: 0.042,
    ruin: [50, 47, 44],
    ruinFace: [74, 70, 65],
    favors: 'earth',
  },
];

export type BiomeChannel = 'ground' | 'grid' | 'ruin' | 'ruinFace';

/**
 * Os quatro biomas vizinhos de um ponto e o peso de cada um. O objeto é
 * reaproveitado pelo chamador: o terreno amostra uma vez por célula visível.
 */
export interface BiomeMix {
  corners: [Biome, Biome, Biome, Biome];
  weights: [number, number, number, number];
}

export function createBiomeMix(): BiomeMix {
  return {
    corners: [BIOMES[0], BIOMES[0], BIOMES[0], BIOMES[0]],
    weights: [1, 0, 0, 0],
  };
}

function latticeBiome(seed: number, gx: number, gy: number): Biome {
  return BIOMES[hashCoords(seed ^ 0x51ed270b, gx, gy) % BIOMES.length];
}

/**
 * Amostra o campo de biomas num ponto: interpolação bilinear entre os quatro
 * vértices da grade de regiões, com os pesos elevados a `biomeContrast` para
 * o bioma dominante prevalecer fora da faixa de transição.
 */
export function sampleBiome(seed: number, x: number, y: number, out: BiomeMix): BiomeMix {
  const gx = x / CONFIG.regionCells;
  const gy = y / CONFIG.regionCells;
  const ix = Math.floor(gx);
  const iy = Math.floor(gy);
  const fx = smoothstep(gx - ix);
  const fy = smoothstep(gy - iy);

  out.corners[0] = latticeBiome(seed, ix, iy);
  out.corners[1] = latticeBiome(seed, ix + 1, iy);
  out.corners[2] = latticeBiome(seed, ix, iy + 1);
  out.corners[3] = latticeBiome(seed, ix + 1, iy + 1);

  const k = CONFIG.biomeContrast;
  const w0 = Math.pow((1 - fx) * (1 - fy), k);
  const w1 = Math.pow(fx * (1 - fy), k);
  const w2 = Math.pow((1 - fx) * fy, k);
  const w3 = Math.pow(fx * fy, k);
  const total = w0 + w1 + w2 + w3 || 1;

  out.weights[0] = w0 / total;
  out.weights[1] = w1 / total;
  out.weights[2] = w2 / total;
  out.weights[3] = w3 / total;
  return out;
}

export function mixChannel(mix: BiomeMix, channel: BiomeChannel, i: number): number {
  return (
    mix.corners[0][channel][i] * mix.weights[0] +
    mix.corners[1][channel][i] * mix.weights[1] +
    mix.corners[2][channel][i] * mix.weights[2] +
    mix.corners[3][channel][i] * mix.weights[3]
  );
}

export function mixAlpha(mix: BiomeMix): number {
  return (
    mix.corners[0].gridAlpha * mix.weights[0] +
    mix.corners[1].gridAlpha * mix.weights[1] +
    mix.corners[2].gridAlpha * mix.weights[2] +
    mix.corners[3].gridAlpha * mix.weights[3]
  );
}

/** A mistura resolvida em CSS. Só para quem desenha dezenas de peças, não milhares. */
export function mixColor(mix: BiomeMix, channel: BiomeChannel, alpha = 1): string {
  const r = Math.round(mixChannel(mix, channel, 0));
  const g = Math.round(mixChannel(mix, channel, 1));
  const b = Math.round(mixChannel(mix, channel, 2));
  return alpha >= 1 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Bioma de maior peso no ponto. */
export function dominantBiome(mix: BiomeMix): Biome {
  let best = 0;
  for (let i = 1; i < 4; i++) {
    if (mix.weights[i] > mix.weights[best]) best = i;
  }
  return mix.corners[best];
}
