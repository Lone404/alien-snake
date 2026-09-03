import { CONFIG } from './config.ts';

export type EffectKind = 'fire' | 'ice';

export interface ActiveEffect {
  kind: EffectKind;
  remainingMs: number;
  totalMs: number;
}

/** Fogo e gelo são exclusivos, então isto devolve a lista inteira. */
export function applyEffect(kind: EffectKind): ActiveEffect[] {
  return [
    {
      kind,
      remainingMs: CONFIG.effectDurationMs,
      totalMs: CONFIG.effectDurationMs,
    },
  ];
}

export function tickEffects(effects: ActiveEffect[], dtMs: number): ActiveEffect[] {
  const next: ActiveEffect[] = [];
  for (const effect of effects) {
    const remainingMs = effect.remainingMs - dtMs;
    if (remainingMs > 0) next.push({ ...effect, remainingMs });
  }
  return next;
}

export function hasEffect(effects: readonly ActiveEffect[], kind: EffectKind): boolean {
  return effects.some((effect) => effect.kind === kind);
}

export function speedMultiplier(effects: readonly ActiveEffect[]): number {
  if (hasEffect(effects, 'fire')) return CONFIG.fireSpeedMultiplier;
  if (hasEffect(effects, 'ice')) return CONFIG.iceSpeedMultiplier;
  return 1;
}

export function scoreMultiplier(effects: readonly ActiveEffect[]): number {
  return hasEffect(effects, 'fire') ? CONFIG.fireScoreMultiplier : 1;
}

/** Com gelo ativo as pedras congelam: atravessáveis, mas não derretem. */
export function rocksAreFrozen(effects: readonly ActiveEffect[]): boolean {
  return hasEffect(effects, 'ice');
}
