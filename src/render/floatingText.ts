import type { Vec2 } from '../core/vec.ts';
import { CONFIG } from '../game/config.ts';

/** O tom decide peso, tamanho e caixa do texto na tela. */
export type FloatingTone = 'gain' | 'bonus' | 'warn';

export interface FloatingText {
  text: string;
  /** Sufixo em destaque, como o "×2" do fogo: menor e na cor de bônus. */
  accent: string | null;
  tone: FloatingTone;
  cell: Vec2;
  color: string;
  /** −1..1: dois textos seguidos abrem em leque em vez de empilhar. */
  drift: number;
  ageMs: number;
}

export interface FloatSpec {
  text: string;
  color: string;
  accent?: string;
  tone?: FloatingTone;
}

export interface FloatingTexts {
  spawn(cell: Vec2, spec: FloatSpec): void;
  update(dtMs: number): void;
  clear(): void;
  readonly list: readonly FloatingText[];
}

/**
 * Textos que sobem da célula ("+30", "+30 ×2"). Vivem em render/ e não em
 * ui/ porque são desenhados no canvas, em coordenadas de célula.
 */
export function createFloatingTexts(): FloatingTexts {
  let items: FloatingText[] = [];
  let spawned = 0;

  return {
    spawn(cell, spec) {
      // Leque alternado (−1, +1, −0.5, +0.5, …), senão duas frutas comidas
      // quase no mesmo lugar sobrepõem os dois números.
      const side = spawned % 2 === 0 ? -1 : 1;
      const magnitude = 1 - (Math.floor(spawned / 2) % 2) * 0.5;
      spawned++;

      items.push({
        text: spec.text,
        accent: spec.accent ?? null,
        tone: spec.tone ?? 'gain',
        cell: { ...cell },
        color: spec.color,
        drift: side * magnitude,
        ageMs: 0,
      });
    },
    update(dtMs) {
      for (const item of items) item.ageMs += dtMs;
      items = items.filter((item) => item.ageMs < CONFIG.floatingTextMs);
    },
    clear() {
      items = [];
      spawned = 0;
    },
    get list() {
      return items;
    },
  };
}
