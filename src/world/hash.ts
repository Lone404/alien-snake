/** Hash inteiro determinístico: as mesmas coordenadas devolvem sempre o
    mesmo valor durante toda a partida. */
export function hashCoords(seed: number, x: number, y: number): number {
  let h = (seed ^ 0x9e3779b9) >>> 0;
  h = Math.imul(h ^ (x | 0), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ ((y | 0) + 0x165667b1), 0xc2b2ae35) >>> 0;
  h ^= h >>> 15;
  return h >>> 0;
}

export function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}
