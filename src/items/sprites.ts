/**
 * Arte dos itens: ilustrações vetoriais em espaço 24x24, com direção de luz
 * fixa no canto superior esquerdo. É a divergência declarada em relação ao
 * design system, que manda ícone Lucide de traço único.
 *
 * Guardadas como dado, e não como markup: a legenda monta SVG por DOM e o
 * canvas desenha o mesmo dado com Path2D, então os dois não divergem.
 */

export interface SpritePart {
  d: string;
  /** Preenchimento. Ausente quando a parte é só traço. */
  fill?: string;
  stroke?: string;
  width?: number;
  opacity?: number;
}

export interface Sprite {
  parts: SpritePart[];
  /** Silhueta cheia, usada para tingir a peça inteira (pedra congelada). */
  silhouette: string;
  /** Cor que representa o item no resto da interface. */
  accent: string;
  /** Correção de tamanho por arte: cada ilustração ocupa uma fração
      diferente da caixa de 24, então sem isto a maçã sai menor que a pedra. */
  scale?: number;
}

const APPLE_BODY =
  'M12 8C10.6 6.6 8.2 6.2 6.6 7.4 4.6 8.9 4.4 12.2 5.4 15c.9 2.6 2.6 5 4.2 5 .9 0 1.6-.6 2.4-.6s1.5.6 2.4.6c1.6 0 3.3-2.4 4.2-5 1-2.8.8-6.1-1.2-7.6C15.8 6.2 13.4 6.6 12 8Z';

const ROCK_SILHOUETTE =
  'M3 19.2 6.2 9.4 12.6 5.4 19.4 8.6 21 16.6 18.2 20.4 6.4 20.4Z';

export const SPRITES: Record<string, Sprite> = {
  /* Maçã: corpo, sombra à direita, ponto de luz à esquerda, cabinho e folha. */
  apple: {
    accent: '#e5322f',
    scale: 1.35,
    silhouette: APPLE_BODY,
    parts: [
      { d: APPLE_BODY, fill: '#e0332f' },
      {
        // Crescente na borda, não meia fruta: sombra que divide o corpo ao
        // meio lê como duas cores, não como volume.
        d: 'M14.2 7.15c1.2-.3 2.4-.05 3.2.65 2 1.5 2.2 4.8 1.2 7.6-.9 2.6-2.6 5-4.2 5-.55 0-1.05-.22-1.55-.4 1.85-.95 3.3-3.35 4.05-5.6.95-2.85.5-5.95-1.45-7.15-.35-.22-.75-.38-1.25-.5Z',
        fill: '#7a1512',
        opacity: 0.55,
      },
      {
        d: 'M8.9 10.1c1-1.1 2.2-1.6 2.7-1.1.5.5-.1 1.7-1.1 2.7-1 1.1-2 1.5-2.5 1-.5-.5 0-1.6.9-2.6Z',
        fill: '#ffffff',
        opacity: 0.34,
      },
      { d: 'M12 8.2C12 6 12.2 4.5 13 3.4', stroke: '#6b4327', width: 1.5 },
      {
        d: 'M12.9 5.5c1-1.6 2.9-2.4 4.5-2.2.3 1.7-.7 3.6-2.3 4.2-1.2.5-2.2.1-2.2.1Z',
        fill: '#3f9e45',
      },
      {
        d: 'M12.9 5.5c1-1.6 2.9-2.4 4.5-2.2',
        stroke: '#2c7530',
        width: 0.9,
        opacity: 0.7,
      },
    ],
  },

  /* Gema: seis facetas, três na coroa e três no pavilhão. */
  gem: {
    accent: '#dfe7ef',
    silhouette: 'M6 3h12l4 6-10 13L2 9Z',
    parts: [
      { d: 'M6 3h5L8 9H2Z', fill: '#eef4fa' },
      { d: 'M11 3h2l3 6H8Z', fill: '#ffffff' },
      { d: 'M13 3h5l4 6h-6Z', fill: '#c6d4e2' },
      { d: 'M2 9h6l4 13Z', fill: '#bccbdb' },
      { d: 'M8 9h8l-4 13Z', fill: '#e6eef6' },
      { d: 'M16 9h6L12 22Z', fill: '#9fb2c6' },
      { d: 'M2 9h20', stroke: '#7d93ab', width: 0.7, opacity: 0.5 },
    ],
  },

  /* Chama: três camadas, do laranja externo ao núcleo quase branco. */
  flame: {
    accent: '#f97316',
    silhouette: 'M12 2c4 4 6.5 6.8 6.5 10.4C18.5 17.2 15.6 21 12 21S5.5 17.2 5.5 12.4C5.5 8.8 8 6 12 2Z',
    parts: [
      {
        d: 'M12 2c4 4 6.5 6.8 6.5 10.4C18.5 17.2 15.6 21 12 21S5.5 17.2 5.5 12.4C5.5 8.8 8 6 12 2Z',
        fill: '#f26a11',
      },
      {
        d: 'M12 6.6c2.5 2.7 4 4.6 4 7 0 3.1-1.8 5.5-4 5.5S8 16.7 8 13.6c0-2.4 1.5-4.3 4-7Z',
        fill: '#fbb624',
      },
      {
        d: 'M12 11.8c1.3 1.5 2 2.5 2 3.7 0 1.6-.9 2.8-2 2.8s-2-1.2-2-2.8c0-1.2.7-2.2 2-3.7Z',
        fill: '#fdeeb4',
      },
    ],
  },

  /* Floco: três eixos e seis pares de ramos, a 35 graus do eixo. */
  snowflake: {
    accent: '#7dd3fc',
    silhouette: 'M12 2.5v19M3.77 7.25 20.23 16.75M20.23 7.25 3.77 16.75',
    parts: [
      { d: 'M12 2.5v19', stroke: '#7dd3fc', width: 1.7 },
      { d: 'M3.77 7.25 20.23 16.75', stroke: '#7dd3fc', width: 1.7 },
      { d: 'M20.23 7.25 3.77 16.75', stroke: '#7dd3fc', width: 1.7 },
      { d: 'M10.17 3.58 12 6.2l1.84-2.62', stroke: '#7dd3fc', width: 1.5 },
      { d: 'M10.17 20.42 12 17.8l1.84 2.62', stroke: '#7dd3fc', width: 1.5 },
      { d: 'M18.37 6.2 17.02 9.1l3.19.28', stroke: '#7dd3fc', width: 1.5 },
      { d: 'M5.63 17.8 6.98 14.9l-3.19-.28', stroke: '#7dd3fc', width: 1.5 },
      { d: 'M3.79 9.38 6.98 9.1 5.63 6.2', stroke: '#7dd3fc', width: 1.5 },
      { d: 'M20.21 14.62 17.02 14.9l1.35 2.9', stroke: '#7dd3fc', width: 1.5 },
      { d: 'M12 9.6a2.4 2.4 0 1 0 0 4.8 2.4 2.4 0 1 0 0-4.8Z', fill: '#dff4ff' },
    ],
  },

  /* Pedra: seis facetas em volta de duas quinas internas, sem contorno. */
  rock: {
    accent: '#a8836a',
    silhouette: ROCK_SILHOUETTE,
    parts: [
      { d: 'M6.2 9.4 12.6 5.4 10.5 13.5Z', fill: '#b28a6c' },
      { d: 'M12.6 5.4 19.4 8.6 15.5 12.5 10.5 13.5Z', fill: '#9c7a60' },
      { d: 'M19.4 8.6 21 16.6 15.5 12.5Z', fill: '#6d5240' },
      { d: 'M3 19.2 6.2 9.4 10.5 13.5Z', fill: '#8b6b52' },
      { d: 'M3 19.2 10.5 13.5 15.5 12.5 18.2 20.4 6.4 20.4Z', fill: '#7d5f49' },
      { d: 'M21 16.6 18.2 20.4 15.5 12.5Z', fill: '#5d4636' },
    ],
  },
};

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Monta o SVG por DOM, sem innerHTML. */
export function buildSprite(name: string, size: number): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', size.toString());
  svg.setAttribute('height', size.toString());
  svg.setAttribute('aria-hidden', 'true');

  for (const part of SPRITES[name]?.parts ?? []) {
    const node = document.createElementNS(SVG_NS, 'path');
    node.setAttribute('d', part.d);
    node.setAttribute('fill', part.fill ?? 'none');
    if (part.stroke) {
      node.setAttribute('stroke', part.stroke);
      node.setAttribute('stroke-width', (part.width ?? 1.5).toString());
      node.setAttribute('stroke-linecap', 'round');
      node.setAttribute('stroke-linejoin', 'round');
    }
    if (part.opacity !== undefined) node.setAttribute('opacity', part.opacity.toString());
    svg.appendChild(node);
  }
  return svg;
}

const pathCache = new Map<string, Path2D>();

function path2d(d: string): Path2D {
  const cached = pathCache.get(d);
  if (cached) return cached;
  const path = new Path2D(d);
  pathCache.set(d, path);
  return path;
}

function parseHex(hex: string): [number, number, number] {
  const value = parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

/** Mistura uma cor em direção a outra, preservando a diferença entre as
    facetas: é assim que a pedra congela sem virar uma mancha só. */
function tinted(hex: string, tint: [number, number, number], amount: number): string {
  const [r, g, b] = parseHex(hex);
  return `rgb(${Math.round(r + (tint[0] - r) * amount)}, ${Math.round(
    g + (tint[1] - g) * amount,
  )}, ${Math.round(b + (tint[2] - b) * amount)})`;
}

export interface SpriteTint {
  color: string;
  amount: number;
}

/** Desenha o mesmo dado no canvas, centrado no ponto dado. */
export function drawSprite(
  ctx: CanvasRenderingContext2D,
  name: string,
  cx: number,
  cy: number,
  size: number,
  tint?: SpriteTint,
): void {
  const sprite = SPRITES[name];
  if (!sprite) return;

  const scale = (size * (sprite.scale ?? 1)) / 24;
  const mix = tint ? parseHex(tint.color) : null;
  const paint = (color: string): string =>
    mix && color.startsWith('#') ? tinted(color, mix, tint!.amount) : color;

  const drawn = 24 * scale;
  ctx.save();
  ctx.translate(cx - drawn / 2, cy - drawn / 2);
  ctx.scale(scale, scale);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (const part of sprite.parts) {
    const path = path2d(part.d);
    ctx.globalAlpha = part.opacity ?? 1;

    if (part.fill) {
      ctx.fillStyle = paint(part.fill);
      ctx.fill(path);
    }
    if (part.stroke) {
      ctx.strokeStyle = paint(part.stroke);
      ctx.lineWidth = part.width ?? 1.5;
      ctx.stroke(path);
    }
  }

  ctx.globalAlpha = 1;
  ctx.restore();
}
