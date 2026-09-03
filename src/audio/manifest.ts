/**
 * Efeitos sonoros do jogo: samples do pack Interface Sounds, de Kenney (CC0),
 * transpostos e sequenciados. Não há síntese em lugar nenhum.
 *
 * Procedência: `drop_002`, `drop_003` e `drop_004` trazem `ARTIST=Kenney` no
 * metadata Vorbis. Os demais não trazem tag, mas seguem a nomenclatura do
 * mesmo pack e foram codificados pelo mesmo libVorbis.
 */

export type SoundId =
  | 'eat'
  | 'essence'
  | 'fire'
  | 'ice'
  | 'earth'
  | 'reward'
  | 'expire'
  | 'spotted'
  | 'region'
  | 'levelup'
  | 'start'
  | 'pause'
  | 'resume'
  | 'death'
  | 'record';

export interface SoundLayer {
  src: string;
  /** Transposição do sample. 1 = tom original. */
  rate?: number;
  gain?: number;
  /** Atraso em relação ao início do evento, para montar arpejo. */
  delayMs?: number;
}

export interface SoundDef {
  layers: SoundLayer[];
  /** Alternativas para a primeira camada, usadas em rodízio: o mesmo sample
      dezenas de vezes por partida vira metrônomo. */
  variants?: string[];
  /** Variação aleatória de tom, em fração do rate. */
  jitter?: number;
  gain: number;
}

const S = (name: string): string => `/sounds/${name}.ogg`;

const DROP_A = S('drop_002');
const DROP_B = S('drop_003');
const DROP_C = S('drop_004');
const CONFIRM = S('confirmation_001');
const QUESTION = S('question_002');
const UP = S('maximize_006');
const DOWN = S('minimize_006');

export const SOUNDS: Record<SoundId, SoundDef> = {
  /* O som mais repetido da partida: dois samples em rodízio e 5% de jitter. */
  eat: { layers: [{ src: DROP_A }], variants: [DROP_A, DROP_B], jitter: 0.05, gain: 0.5 },

  /* Vale o triplo da comida, então soa mais brilhante. */
  essence: { layers: [{ src: CONFIRM }], jitter: 0.02, gain: 0.45 },

  fire: { layers: [{ src: UP }], gain: 0.45 },
  ice: { layers: [{ src: DOWN }], gain: 0.45 },

  /* O mesmo plop uma oitava e meia abaixo: peso caindo, não fruta colhida. */
  earth: { layers: [{ src: DROP_C, rate: 0.72 }], gain: 0.55 },

  /* Agudo e baixo: pode disparar seis vezes quase juntas. */
  reward: { layers: [{ src: DROP_B, rate: 1.55 }], jitter: 0.04, gain: 0.26 },

  expire: { layers: [{ src: QUESTION, rate: 0.85 }], gain: 0.26 },

  /* Avistar um elemento no escuro: nota de atenção, não de prêmio. */
  spotted: { layers: [{ src: QUESTION, rate: 1.42 }], jitter: 0.03, gain: 0.2 },

  /* Região nova: duas notas subindo, para soar como conquista. */
  region: {
    layers: [
      { src: CONFIRM, rate: 0.88 },
      { src: CONFIRM, rate: 1.32, delayMs: 115 },
    ],
    gain: 0.3,
  },
  levelup: { layers: [{ src: UP, rate: 1.5 }], gain: 0.22 },

  start: { layers: [{ src: CONFIRM, rate: 1.12 }], gain: 0.45 },
  pause: { layers: [{ src: DOWN, rate: 1.35 }], gain: 0.3 },
  resume: { layers: [{ src: UP, rate: 1.35 }], gain: 0.3 },

  /* Fim de jogo: a varredura descendente do gelo, grave e mais longa. */
  death: { layers: [{ src: DOWN, rate: 0.62 }], gain: 0.5 },

  /* Recorde: o mesmo sample três vezes, subindo em terças. */
  record: {
    layers: [
      { src: CONFIRM, rate: 1 },
      { src: CONFIRM, rate: 1.26, delayMs: 130 },
      { src: CONFIRM, rate: 1.5, delayMs: 260 },
    ],
    gain: 0.42,
  },
};

/**
 * Trilha de fundo: loop de 20,4s recortado de `kawaiibgm.mp3`
 * (`lone-ilegalphone`), com crossfade na emenda para a volta não estalar.
 * O volume mora nas configurações do jogador, em audio/settings.ts.
 */
export const MUSIC = {
  src: '/sounds/bgm.ogg',
  /** Quanto a trilha abaixa quando a partida não está rolando. */
  duckedGain: 0.32,
  fadeSeconds: 0.6,
} as const;

/** Arquivos distintos a pré-carregar. */
export const SOUND_FILES: string[] = [
  ...new Set(
    Object.values(SOUNDS).flatMap((def) => [
      ...def.layers.map((layer) => layer.src),
      ...(def.variants ?? []),
    ]),
  ),
];
