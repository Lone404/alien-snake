import type { SoundId } from './manifest.ts';
import { MUSIC, SOUNDS, SOUND_FILES } from './manifest.ts';
import type { AudioSettings, BusId, BusSettings } from './settings.ts';
import { DEFAULTS, loadSettings, saveSettings } from './settings.ts';

export interface AudioPlayer {
  play(id: SoundId): void;
  /** Abafa a trilha sem parar. `true` volta ao volume cheio. */
  setMusicActive(active: boolean): void;

  get(bus: BusId): BusSettings;
  setEnabled(bus: BusId, on: boolean): void;
  setVolume(bus: BusId, volume: number): void;
  /** Liga/desliga e devolve o novo estado. */
  toggle(bus: BusId): boolean;

  /** Notificado sempre que qualquer ajuste muda, venha de onde vier. */
  subscribe(listener: () => void): void;

  /** Resolve quando os samples terminaram de decodificar. */
  readonly ready: Promise<void>;
}

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

/**
 * Tocador de samples com dois barramentos independentes. Web Audio, e não
 * `new Audio()`, por causa das vozes sobrepostas e do `playbackRate`.
 *
 *   efeitos ──> ganho do som ──> sfxBus ──────────────┐
 *   trilha  ──> musicDuck ──> musicBus ──────────────-┴─> limitador ─> saída
 *
 * `sfxBus` e `musicBus` carregam o volume das configurações; `musicDuck`
 * carrega o abafamento automático fora da partida. Separados, um não
 * sobrescreve o outro.
 *
 * Todo caminho de erro é engolido: áudio que falha vira silêncio, nunca
 * exceção no meio do loop.
 */
export function createAudioPlayer(): AudioPlayer {
  const buffers = new Map<string, AudioBuffer>();
  const cursors = new Map<SoundId, number>();
  const listeners: (() => void)[] = [];
  const settings: AudioSettings = loadSettings();

  let ctx: AudioContext | null = null;
  let sfxBus: GainNode | null = null;
  let musicBus: GainNode | null = null;
  let musicDuck: GainNode | null = null;
  let musicSource: AudioBufferSourceNode | null = null;
  let musicActive = true;

  const AudioCtor: typeof AudioContext | undefined =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (AudioCtor) {
    ctx = new AudioCtor();

    // Seis pedras derretendo no mesmo quadro somam acima de 1 e estouram.
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -6;
    limiter.knee.value = 6;
    limiter.ratio.value = 12;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.12;
    limiter.connect(ctx.destination);

    sfxBus = ctx.createGain();
    sfxBus.gain.value = settings.sfx.on ? settings.sfx.volume : 0;
    sfxBus.connect(limiter);

    musicBus = ctx.createGain();
    musicBus.gain.value = settings.music.on ? settings.music.volume : 0;
    musicBus.connect(limiter);

    musicDuck = ctx.createGain();
    musicDuck.gain.value = 0;
    musicDuck.connect(musicBus);
  }

  /** Rampa curta: cortar ganho no meio de um sample produz clique. */
  const ramp = (node: GainNode | null, target: number, seconds = 0.04): void => {
    if (!ctx || !node) return;
    node.gain.cancelScheduledValues(ctx.currentTime);
    node.gain.setTargetAtTime(target, ctx.currentTime, seconds);
  };

  const busNode = (bus: BusId): GainNode | null => (bus === 'sfx' ? sfxBus : musicBus);

  const applyBus = (bus: BusId): void => {
    const value = settings[bus];
    ramp(busNode(bus), value.on ? value.volume : 0);
  };

  const notify = (): void => {
    saveSettings(settings);
    for (const listener of listeners) listener();
  };

  /**
   * Só pode começar depois de um gesto do usuário. O loop é um
   * AudioBufferSourceNode porque a emenda já vem costurada no arquivo;
   * um `<audio loop>` deixaria buraco na volta.
   */
  const startMusic = (): void => {
    if (!ctx || !musicDuck || musicSource) return;
    const buffer = buffers.get(MUSIC.src);
    if (!buffer) return;

    musicSource = ctx.createBufferSource();
    musicSource.buffer = buffer;
    musicSource.loop = true;
    musicSource.connect(musicDuck);
    musicSource.start();
    rampDuck();
  };

  const rampDuck = (): void => {
    ramp(musicDuck, musicActive ? 1 : MUSIC.duckedGain, MUSIC.fadeSeconds / 3);
  };

  const unlock = (): void => {
    void ctx?.resume().catch(() => undefined);
    startMusic();
  };
  for (const event of ['pointerdown', 'keydown'] as const) {
    window.addEventListener(event, unlock, { passive: true });
  }

  const load = async (src: string): Promise<void> => {
    if (!ctx) return;
    try {
      const response = await fetch(src);
      if (!response.ok) return;
      buffers.set(src, await ctx.decodeAudioData(await response.arrayBuffer()));
    } catch {
      /* sem este efeito, o resto do jogo segue */
    }
  };

  const ready = Promise.all([...SOUND_FILES, MUSIC.src].map(load)).then(() => {
    // O unlock pode ter passado antes de os buffers chegarem.
    if (ctx?.state === 'running') startMusic();
  });

  /** Rodízio, e não sorteio: alternar é mais musical que aleatorizar. */
  const pickVariant = (id: SoundId, variants: string[]): string => {
    const next = (cursors.get(id) ?? -1) + 1;
    cursors.set(id, next);
    return variants[next % variants.length];
  };

  return {
    ready,

    play(id: SoundId): void {
      const bus = sfxBus;
      if (!ctx || !bus || !settings.sfx.on || settings.sfx.volume === 0) return;
      if (ctx.state === 'suspended') void ctx.resume().catch(() => undefined);

      const def = SOUNDS[id];
      const now = ctx.currentTime;

      for (const [index, layer] of def.layers.entries()) {
        const src = index === 0 && def.variants ? pickVariant(id, def.variants) : layer.src;
        const buffer = buffers.get(src);
        if (!buffer) continue;

        const jitter = def.jitter ? (Math.random() * 2 - 1) * def.jitter : 0;

        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.playbackRate.value = (layer.rate ?? 1) * (1 + jitter);

        const gain = ctx.createGain();
        gain.gain.value = def.gain * (layer.gain ?? 1);

        source.connect(gain);
        gain.connect(bus);
        source.start(now + (layer.delayMs ?? 0) / 1000);
        source.onended = () => {
          source.disconnect();
          gain.disconnect();
        };
      }
    },

    setMusicActive(active: boolean): void {
      if (active === musicActive) return;
      musicActive = active;
      rampDuck();
    },

    get: (bus: BusId): BusSettings => ({ ...settings[bus] }),

    setEnabled(bus: BusId, on: boolean): void {
      if (settings[bus].on === on) return;
      settings[bus].on = on;
      applyBus(bus);
      notify();
    },

    setVolume(bus: BusId, volume: number): void {
      const next = clamp01(volume);
      if (settings[bus].volume === next) return;
      settings[bus].volume = next;
      // Arrastar o volume religa o barramento, senão o controle não produz som.
      if (next > 0) settings[bus].on = true;
      applyBus(bus);
      notify();
    },

    toggle(bus: BusId): boolean {
      settings[bus].on = !settings[bus].on;
      // Religar com o volume em zero não produziria som nenhum.
      if (settings[bus].on && settings[bus].volume === 0) {
        settings[bus].volume = DEFAULTS[bus].volume;
      }
      applyBus(bus);
      notify();
      return settings[bus].on;
    },

    subscribe(listener: () => void): void {
      listeners.push(listener);
    },
  };
}
