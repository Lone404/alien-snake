/**
 * Ícones de interface: Lucide (ISC) de traço único, montados por DOM, como
 * manda o design system. A ilustração colorida é da arte de jogo, em
 * items/sprites.ts.
 *
 * `volume-off` é o alto-falante do `volume-x` com o X sobreposto.
 */
export type IconName =
  | 'volume-on'
  | 'volume-off'
  | 'music-on'
  | 'music-off'
  | 'settings'
  | 'credits'
  | 'close'
  | 'chevron';

type Shape = [string, Record<string, string>][];

const SPEAKER =
  'M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z';

const NOTE: Shape = [
  ['path', { d: 'M9 18V5l12-2v13' }],
  ['circle', { cx: '6', cy: '18', r: '3' }],
  ['circle', { cx: '18', cy: '16', r: '3' }],
];

const SLASH: Shape = [['path', { d: 'M3 3l18 18' }]];

const ICONS: Record<IconName, Shape> = {
  'volume-on': [
    ['path', { d: SPEAKER }],
    ['path', { d: 'M16 9a5 5 0 0 1 0 6' }],
    ['path', { d: 'M19.364 18.364a9 9 0 0 0 0-12.728' }],
  ],
  'volume-off': [
    ['path', { d: SPEAKER }],
    ['path', { d: 'M22 9l-6 6' }],
    ['path', { d: 'M16 9l6 6' }],
  ],
  'music-on': NOTE,
  'music-off': [...NOTE, ...SLASH],
  settings: [
    ['line', { x1: '21', x2: '14', y1: '4', y2: '4' }],
    ['line', { x1: '10', x2: '3', y1: '4', y2: '4' }],
    ['line', { x1: '21', x2: '12', y1: '12', y2: '12' }],
    ['line', { x1: '8', x2: '3', y1: '12', y2: '12' }],
    ['line', { x1: '21', x2: '16', y1: '20', y2: '20' }],
    ['line', { x1: '12', x2: '3', y1: '20', y2: '20' }],
    ['line', { x1: '14', x2: '14', y1: '2', y2: '6' }],
    ['line', { x1: '8', x2: '8', y1: '10', y2: '14' }],
    ['line', { x1: '16', x2: '16', y1: '18', y2: '22' }],
  ],
  credits: [
    ['path', { d: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2' }],
    ['circle', { cx: '9', cy: '7', r: '4' }],
    ['path', { d: 'M22 21v-2a4 4 0 0 0-3-3.87' }],
    ['path', { d: 'M16 3.13a4 4 0 0 1 0 7.75' }],
  ],
  close: [
    ['path', { d: 'M18 6 6 18' }],
    ['path', { d: 'm6 6 12 12' }],
  ],
  chevron: [['path', { d: 'm6 9 6 6 6-6' }]],
};

const SVG_NS = 'http://www.w3.org/2000/svg';

export function buildUiIcon(name: IconName, size = 16): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', size.toString());
  svg.setAttribute('height', size.toString());
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');

  for (const [tag, attrs] of ICONS[name]) {
    const node = document.createElementNS(SVG_NS, tag);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
    svg.appendChild(node);
  }
  return svg;
}
