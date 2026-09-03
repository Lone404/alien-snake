export interface Vec2 {
  x: number;
  y: number;
}

export function equals(a: Vec2, b: Vec2): boolean {
  return a.x === b.x && a.y === b.y;
}

export function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function isZero(v: Vec2): boolean {
  return v.x === 0 && v.y === 0;
}

export function isOpposite(a: Vec2, b: Vec2): boolean {
  if (isZero(a) || isZero(b)) return false;
  return a.x === -b.x && a.y === -b.y;
}

export function cellKey(c: Vec2): string {
  return `${c.x},${c.y}`;
}
