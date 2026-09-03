export type BusId = 'sfx' | 'music';

export interface BusSettings {
  on: boolean;
  /** 0 a 1: o valor escolhido pelo jogador, não o ganho final do nó. */
  volume: number;
}

export type AudioSettings = Record<BusId, BusSettings>;

const KEY = 'snake-ryse:audio';
/** Chave da versão anterior, com um único mudo para tudo. */
const LEGACY_MUTE_KEY = 'snake-ryse:muted';

export const DEFAULTS: AudioSettings = {
  sfx: { on: true, volume: 0.6 },
  music: { on: true, volume: 0.15 },
};

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

function readBus(raw: unknown, fallback: BusSettings): BusSettings {
  if (typeof raw !== 'object' || raw === null) return { ...fallback };
  const bus = raw as Partial<BusSettings>;
  return {
    on: typeof bus.on === 'boolean' ? bus.on : fallback.on,
    volume: typeof bus.volume === 'number' ? clamp01(bus.volume) : fallback.volume,
  };
}

export function loadSettings(): AudioSettings {
  try {
    const stored = localStorage.getItem(KEY);
    if (stored) {
      const parsed: unknown = JSON.parse(stored);
      const value = parsed as Partial<AudioSettings>;
      return {
        sfx: readBus(value.sfx, DEFAULTS.sfx),
        music: readBus(value.music, DEFAULTS.music),
      };
    }
    // Migração: quem estava no mudo antigo continua mudo.
    if (localStorage.getItem(LEGACY_MUTE_KEY) === '1') {
      return { sfx: { ...DEFAULTS.sfx, on: false }, music: { ...DEFAULTS.music, on: false } };
    }
  } catch {
    /* modo privado ou JSON corrompido: cai no padrão */
  }
  return { sfx: { ...DEFAULTS.sfx }, music: { ...DEFAULTS.music } };
}

export function saveSettings(settings: AudioSettings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    /* sem persistência, vale só para esta sessão */
  }
}
