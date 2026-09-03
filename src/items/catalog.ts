import type { EffectKind } from '../game/effects.ts';

export type ItemId = 'food' | 'essence' | 'fire' | 'ice' | 'earth';

export interface ItemDef {
  id: ItemId;
  name: string;
  /** Nome do sprite em items/sprites.ts. */
  sprite: string;
  /** Cor de acento na interface. Sai da própria ilustração, não da paleta de
      estado do DS, para o chip e a legenda baterem com o que está no chão. */
  color: string;
  colorRgb: string;
  points: number;
  /** Peso relativo no sorteio. */
  weight: number;
  /** Quanto tempo o item dura depois de avistado. null = não expira. */
  lifetimeMs: number | null;
  effect: EffectKind | null;
  spawnsRocks: boolean;
  /** Uma frase, exibida na legenda. */
  description: string;
}

/**
 * Fonte única dos itens: cor, pontos, sorteio, efeito, ícone e legenda saem
 * daqui. Adicionar uma fruta é adicionar uma entrada.
 */
export const ITEMS: Record<ItemId, ItemDef> = {
  food: {
    id: 'food',
    name: 'Comida',
    sprite: 'apple',
    color: '#e5322f',
    colorRgb: '229, 50, 47',
    points: 10,
    weight: 60,
    lifetimeMs: null,
    effect: null,
    spawnsRocks: false,
    description: 'O básico. Cresce um segmento e mantém o jogo andando.',
  },
  essence: {
    id: 'essence',
    name: 'Essência',
    sprite: 'gem',
    color: '#dfe7ef',
    colorRgb: '223, 231, 239',
    points: 30,
    weight: 12,
    lifetimeMs: 6000,
    effect: null,
    spawnsRocks: false,
    description: 'Vale o triplo. O relógio de 6s só começa quando você a avista: vai buscar ou joga seguro?',
  },
  fire: {
    id: 'fire',
    name: 'Fogo',
    sprite: 'flame',
    color: '#f97316',
    colorRgb: '249, 115, 22',
    points: 15,
    weight: 10,
    lifetimeMs: 9000,
    effect: 'fire',
    spawnsRocks: false,
    description: 'Risco: +50% de velocidade e pontos em dobro por 5s.',
  },
  ice: {
    id: 'ice',
    name: 'Gelo',
    sprite: 'snowflake',
    color: '#7dd3fc',
    colorRgb: '125, 211, 252',
    points: 15,
    weight: 10,
    lifetimeMs: 9000,
    effect: 'ice',
    spawnsRocks: false,
    description: 'Alívio: −40% de velocidade e as pedras congelam, dá pra atravessar.',
  },
  earth: {
    id: 'earth',
    name: 'Terra',
    sprite: 'rock',
    color: '#a8836a',
    colorRgb: '168, 131, 106',
    points: 15,
    weight: 8,
    lifetimeMs: 9000,
    effect: null,
    spawnsRocks: true,
    description: 'Aposta: espalha 6 pedras num cerco ao seu redor. Cada uma que derreter com você vivo vale +10.',
  },
};

/** Ordem de exibição na legenda. */
export const ITEM_LIST: ItemDef[] = [
  ITEMS.food,
  ITEMS.essence,
  ITEMS.fire,
  ITEMS.ice,
  ITEMS.earth,
];
