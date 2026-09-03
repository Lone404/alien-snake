import type { GameState } from '../game/state.ts';
import { CONFIG } from '../game/config.ts';
import { renderLegend } from './legend.ts';
import { buildUiIcon } from './uiIcons.ts';

export interface Menu {
  update(state: GameState): void;
}

/**
 * Regras do jogo. Ficavam num painel lateral permanente, que competia com
 * o tabuleiro durante a partida e ninguém lia. Aqui elas têm a tela toda,
 * antes de começar, que é quando o jogador de fato quer entendê-las.
 */
const RULES: string[] = [
  'O mundo não tem borda: ele nasce enquanto você anda. Bater numa ruína, numa pedra ou no próprio corpo encerra a partida.',
  `A névoa esconde o que você ainda não viu. O que já foi visto continua no mapa, apagado, e pisar numa região inédita vale +${CONFIG.regionBonus}.`,
  'As setas na borda da tela apontam o que vale a pena buscar. Comida você fareja no escuro; o resto precisa ter sido avistado uma vez.',
  'O relógio dos elementos só começa a correr quando você põe os olhos neles.',
  `A velocidade base sobe a cada ${CONFIG.speedRampPerPoints} pontos, até ${CONFIG.maxStepsPerSecond} passos por segundo, e a câmera abre junto.`,
  'Fogo e gelo não se acumulam: o último que você comer substitui o anterior.',
  'Curva em duas etapas é válida. Só a reversão direta é bloqueada.',
];

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function sectionTitle(text: string): HTMLElement {
  return el('h2', 'ryse-section-title', text);
}

function buildItemRows(): HTMLElement {
  const list = el('ul', 'rows');
  renderLegend(list);
  return list;
}

function buildRules(): HTMLElement {
  const list = el('ul', 'rules');
  for (const rule of RULES) list.appendChild(el('li', undefined, rule));
  return list;
}

let disclosureCount = 0;

/**
 * Seção que abre e fecha.
 *
 * As regras cresceram junto com o mundo aberto: sete parágrafos empurravam o
 * botão Jogar para fora da tela, e a primeira coisa que alguém via ao abrir o
 * jogo era uma barra de rolagem. Fechada, a seção vira uma linha: quem quer
 * as regras clica, quem já sabe joga.
 *
 * A altura é animada por `grid-template-rows: 0fr -> 1fr`, que é o único
 * jeito de ir de zero até `auto` sem medir o conteúdo por JS a cada abertura.
 */
function buildDisclosure(title: string, content: HTMLElement, count: number): HTMLElement {
  const id = 'disclosure-' + ++disclosureCount;
  const section = el('section', 'menu-col');

  const heading = el('h2', 'disclosure-heading');
  const button = el('button', 'disclosure-head');
  button.type = 'button';
  button.setAttribute('aria-controls', id);

  const chevron = buildUiIcon('chevron', 14);
  chevron.classList.add('disclosure-chevron');
  button.append(
    el('span', 'ryse-section-title', title),
    // Fechada, um título sozinho não convida a clicar: o número é o que
    // avisa que existe conteúdo guardado ali.
    el('span', 'disclosure-count', String(count)),
    chevron,
  );
  heading.appendChild(button);

  const panel = el('div', 'disclosure-panel');
  panel.id = id;
  const inner = el('div', 'disclosure-inner');
  inner.appendChild(content);
  panel.appendChild(inner);

  let open = false;
  const apply = (): void => {
    button.setAttribute('aria-expanded', String(open));
    panel.dataset.open = String(open);
    // Fechada, ela também sai do caminho do Tab: conteúdo recortado que
    // ainda recebe foco é uma rolagem fantasma esperando para acontecer.
    if (open) inner.removeAttribute('inert');
    else inner.setAttribute('inert', '');
  };

  button.addEventListener('click', () => {
    open = !open;
    apply();
  });
  apply();

  section.append(heading, panel);
  return section;
}

function buildControls(): HTMLElement {
  const list = el('ul', 'rows');
  const rows: [string, string[]][] = [
    ['Mover', ['W', 'A', 'S', 'D']],
    ['Pausar', ['Espaço', 'Esc']],
    ['Recomeçar', ['Enter']],
    ['Voltar ao menu (pausado)', ['Esc']],
    ['Ligar / desligar efeitos', ['M']],
    ['Ligar / desligar trilha', ['N']],
  ];

  for (const [label, keys] of rows) {
    const row = el('li', 'row row-tight');
    const text = el('span', 'row-text');
    text.appendChild(el('span', 'row-name', label));

    const group = el('span', 'row-keys');
    for (const key of keys) group.appendChild(el('kbd', undefined, key));

    row.append(text, group);
    list.appendChild(row);
  }
  return list;
}

/**
 * Menu principal: identidade, regras, itens, controles e recorde. Some
 * inteiro quando a partida começa.
 */
export function createMenu(root: HTMLElement, onPlay: () => void): Menu {
  const shell = el('div', 'menu-shell');

  const head = el('header', 'menu-head');
  head.appendChild(el('p', 'menu-eyebrow', 'Minigame'));

  const brand = el('h1', 'menu-brand');
  brand.append(document.createTextNode('Alien'), el('span', undefined, 'Snake'));
  head.appendChild(brand);
  head.appendChild(
    el(
      'p',
      'menu-lead',
      'Um mundo sem borda, coberto de névoa. Cresça coletando, descubra regiões que ninguém pisou e sobreviva ao que você mesmo largou pelo caminho.',
    ),
  );

  const grid = el('div', 'menu-grid');

  const itemsCol = el('section', 'menu-col');
  itemsCol.append(sectionTitle('Itens'), buildItemRows());

  const asideCol = el('div', 'menu-col-stack');

  const rulesCol = buildDisclosure('Como funciona', buildRules(), RULES.length);

  const controlsCol = el('section', 'menu-col');
  controlsCol.append(sectionTitle('Controles'), buildControls());

  asideCol.append(rulesCol, controlsCol);
  grid.append(itemsCol, asideCol);

  const foot = el('footer', 'menu-foot');

  const best = el('p', 'menu-best');
  best.appendChild(el('span', 'menu-best-label', 'Recorde'));
  const bestValue = el('span', 'menu-best-value', '0');
  best.appendChild(bestValue);

  const play = el('button', 'ryse-btn ryse-btn-primary menu-play');
  play.type = 'button';
  play.addEventListener('click', onPlay);

  const playLabel = el('span', undefined, 'Jogar');
  const playHint = el('span', 'menu-play-hint', 'Enter');
  play.append(playLabel, playHint);

  foot.append(best, play);
  shell.append(head, grid, foot);
  root.appendChild(shell);

  let wasMenu: boolean | null = null;
  let lastBest = -1;

  return {
    update(state: GameState): void {
      const isMenu = state.phase === 'menu';

      if (isMenu !== wasMenu) {
        root.hidden = !isMenu;
        wasMenu = isMenu;
        // Foco no botão para Enter e Espaço funcionarem por teclado, sem
        // depender do handler global.
        if (isMenu) play.focus({ preventScroll: true });
      }
      if (!isMenu) return;

      const bestScore = Math.max(state.best, state.score);
      if (bestScore !== lastBest) {
        bestValue.textContent = bestScore.toString();
        lastBest = bestScore;
      }
      playLabel.textContent = bestScore > 0 ? 'Jogar de novo' : 'Jogar';
    },
  };
}
