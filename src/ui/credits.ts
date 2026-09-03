import { createModal } from './modal.ts';
import type { Modal } from './modal.ts';

/**
 * Créditos e o resumo da revisão: quem construiu, quem revisou, o que mudou
 * e de onde vieram os recursos de terceiros. O registro completo está em
 * CHANGELOG.md.
 */

interface Person {
  name: string;
  note?: string;
}

interface Team {
  role: string;
  people: Person[];
}

const TEAMS: Team[] = [
  {
    role: 'Projeto original',
    people: [
      { name: 'Caio Daniel' },
      { name: 'Camily Ferreira' },
      { name: 'Elton' },
      { name: 'José Carlos' },
      { name: 'Samuel Rocha' },
    ],
  },
  {
    role: 'Revisão',
    people: [{ name: 'Lone', note: 'Fundador da Ryse' }],
  },
];

type Tag = '+' | '*' | '!';

interface Change {
  tag: Tag;
  title: string;
  text: string;
}

const TAG_LABEL: Record<Tag, string> = {
  '+': 'Adicionado',
  '*': 'Alterado',
  '!': 'Corrigido',
};

const CHANGES: Change[] = [
  {
    tag: '!',
    title: 'Morte involuntária ao virar duas vezes',
    text: 'Apertar duas direções dentro do mesmo passo invertia a cobra no próprio pescoço. Agora vira uma curva de duas etapas.',
  },
  {
    tag: '!',
    title: 'Cauda contava como colisão',
    text: 'Entrar na célula que a cauda está desocupando matava o jogador em curvas fechadas perfeitamente legais.',
  },
  {
    tag: '!',
    title: 'Bônus da fruta de fogo',
    text: 'O multiplicador de pontos nunca era aplicado. Era código morto desde o primeiro commit.',
  },
  {
    tag: '!',
    title: 'Pedras nasciam em cima do jogador',
    text: 'Sem validação de célula livre, dava para uma pedra aparecer colada no nariz da cobra.',
  },
  {
    tag: '*',
    title: 'O tabuleiro virou mundo aberto',
    text: 'A parede saiu e o mapa deixou de ter borda: o terreno nasce enquanto você anda, e ruínas permanentes ocupam o lugar dela.',
  },
  {
    tag: '*',
    title: 'Cada elemento ganhou um papel',
    text: 'Fogo é risco, gelo é alívio, terra é aposta e essência é urgência. Antes o gelo era só prejuízo.',
  },
  {
    tag: '*',
    title: 'Itens espalhados pelo mapa',
    text: 'Cada região nasce com quatro comidas e dois elementos, e a região decide qual elemento é mais provável. Antes era um item por vez, com power-up saindo mais que comida.',
  },
  {
    tag: '*',
    title: 'A cobra ganhou pele',
    text: 'Tubo contínuo com degradê no comprimento e cauda que afina, no lugar de um quadrado por célula, e cor que muda com o efeito ativo.',
  },
  {
    tag: '+',
    title: 'Névoa de guerra',
    text: 'O que você ainda não visitou é escuridão fechada, e o que já viu fica no mapa, apagado. Pisar numa região inédita vale pontos.',
  },
  {
    tag: '+',
    title: 'Bússola e localizador',
    text: 'Setas na borda da tela apontam o que vale buscar, com a distância. A comida você fareja no escuro; o resto precisa ter sido avistado uma vez.',
  },
  {
    tag: '+',
    title: 'Câmera que acompanha',
    text: 'Enquadramento colado na cobra, com zoom que abre conforme a velocidade e movimento contínuo entre os passos.',
  },
  {
    tag: '+',
    title: 'Interface no design system da Ryse',
    text: 'Menu principal, HUD, avisos de efeito, telas de pausa e fim de jogo, tudo sobre os tokens da casa.',
  },
  {
    tag: '+',
    title: 'Arte e som',
    text: 'Ilustrações vetoriais no lugar dos quadrados coloridos, 15 efeitos sonoros e trilha em loop.',
  },
];


interface Asset {
  what: string;
  from: string;
  license: string;
}

const ASSETS: Asset[] = [
  {
    what: 'Efeitos sonoros',
    from: 'Interface Sounds, de Kenney',
    license: 'CC0',
  },
  {
    what: 'Trilha de fundo',
    from: 'Recorte com emenda costurada, a partir do acervo da Ryse',
    license: 'uso interno',
  },
  {
    what: 'Ícones de interface',
    from: 'Lucide',
    license: 'ISC',
  },
  {
    what: 'Tipografia',
    from: 'Poppins, Chakra Petch e JetBrains Mono',
    license: 'SIL Open Font License',
  },
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

function section(title: string): HTMLElement {
  const node = el('h3', 'cred-title', title);
  return node;
}

function buildTeams(): HTMLElement[] {
  const out: HTMLElement[] = [];

  for (const team of TEAMS) {
    out.push(section(team.role));

    const list = el('ul', 'cred-people');
    for (const person of team.people) {
      const row = el('li', 'cred-person');
      row.appendChild(el('span', 'cred-name', person.name));
      if (person.note) row.appendChild(el('span', 'cred-note', person.note));
      list.appendChild(row);
    }
    out.push(list);
  }
  return out;
}

function buildChanges(): HTMLElement[] {
  const list = el('ul', 'cred-changes');

  for (const change of CHANGES) {
    const row = el('li', 'cred-change');
    row.dataset.tag = change.tag;

    const tag = el('span', 'cred-tag', change.tag);
    tag.title = TAG_LABEL[change.tag];
    tag.setAttribute('aria-label', TAG_LABEL[change.tag]);

    const text = el('span', 'cred-change-text');
    text.append(
      el('span', 'cred-change-title', change.title),
      el('span', 'cred-change-body', change.text),
    );

    row.append(tag, text);
    list.appendChild(row);
  }

  return [section('O que mudou na revisão'), list];
}

function buildAssets(): HTMLElement[] {
  const list = el('ul', 'cred-assets');

  for (const asset of ASSETS) {
    const row = el('li', 'cred-asset');
    row.append(
      el('span', 'cred-asset-what', asset.what),
      el('span', 'cred-asset-from', asset.from),
      el('span', 'cred-asset-license', asset.license),
    );
    list.appendChild(row);
  }

  return [section('Recursos de terceiros'), list];
}

/** Modal em tela cheia: pessoas e recursos lado a lado, mudanças abaixo. */
export function createCredits(root: HTMLElement): Modal {
  const modal = createModal(root, {
    title: 'Créditos',
    variant: 'fullscreen',
    eyebrow: 'Alien Snake',
    lead: 'Minigame construído como projeto de faculdade e revisado pela Ryse.',
  });

  const top = el('div', 'cred-top');

  const people = el('section', 'cred-col');
  people.append(...buildTeams());

  const assets = el('section', 'cred-col');
  assets.append(...buildAssets());

  top.append(people, assets);

  const changes = el('section', 'cred-changes-section');
  changes.append(...buildChanges());

  const foot = el(
    'p',
    'cred-foot',
    'O registro completo da revisão está no CHANGELOG.md do repositório.',
  );

  modal.body.append(top, changes, foot);
  return modal;
}
