import { buildUiIcon } from './uiIcons.ts';

/**
 * `panel` flutua sobre o contexto e fecha no clique fora. `fullscreen` ocupa
 * a tela, esconde o jogo atrás e rola por dentro, então só o botão e o Esc
 * fecham.
 */
export type ModalVariant = 'panel' | 'fullscreen';

export interface ModalOptions {
  title: string;
  variant?: ModalVariant;
  /** Sobretítulo. Só em tela cheia. */
  eyebrow?: string;
  /** Linha de abertura sob o título. Só em tela cheia. */
  lead?: string;
}

export interface Modal {
  /** Onde o conteúdo da janela é montado. */
  readonly body: HTMLElement;
  open(): void;
  close(): void;
  isOpen(): boolean;
  /** Chamado toda vez que a janela abre, para sincronizar o conteúdo. */
  onOpen(listener: () => void): void;
}

/**
 * Casca de janela compartilhada entre Áudio e Créditos: fechar no botão,
 * foco no fechar ao abrir e rolagem de volta ao topo. O que muda entre as
 * variantes é o cabeçalho.
 */
export function createModal(root: HTMLElement, options: ModalOptions): Modal {
  const { title, variant = 'panel', eyebrow, lead } = options;
  const listeners: (() => void)[] = [];
  const fullscreen = variant === 'fullscreen';

  root.classList.add(fullscreen ? 'is-fullscreen' : 'is-panel');

  const panel = document.createElement('div');
  panel.className = 'modal-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-label', title);

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'ryse-btn ryse-btn-ghost modal-close';
  close.title = 'Fechar (Esc)';
  close.setAttribute('aria-label', close.title);
  close.appendChild(buildUiIcon('close', fullscreen ? 17 : 15));

  const head = document.createElement('header');
  head.className = 'modal-head';

  if (fullscreen) {
    if (eyebrow) {
      const over = document.createElement('p');
      over.className = 'modal-eyebrow';
      over.textContent = eyebrow;
      head.appendChild(over);
    }

    const heading = document.createElement('h2');
    heading.className = 'modal-title';
    heading.textContent = title;
    head.appendChild(heading);

    if (lead) {
      const line = document.createElement('p');
      line.className = 'modal-lead';
      line.textContent = lead;
      head.appendChild(line);
    }

    // Ancorado na janela, e não no cabeçalho, para continuar alcançável
    // depois de rolar.
    close.classList.add('is-floating');
    panel.appendChild(close);
  } else {
    const heading = document.createElement('h2');
    heading.className = 'ryse-section-title';
    heading.textContent = title;
    head.append(heading, close);
  }

  const body = document.createElement('div');
  body.className = 'modal-body';

  panel.append(head, body);
  root.append(panel);
  root.hidden = true;

  let open = false;

  const setOpen = (next: boolean): void => {
    if (next === open) return;
    open = next;
    root.hidden = !open;
    if (!open) return;
    for (const listener of listeners) listener();
    close.focus({ preventScroll: true });
    root.scrollTop = 0;
    body.scrollTop = 0;
  };

  close.addEventListener('click', () => setOpen(false));

  if (!fullscreen) {
    // O painel para a propagação para o clique dentro dele não contar como
    // "fora". Em tela cheia não existe fora.
    root.addEventListener('click', () => setOpen(false));
    panel.addEventListener('click', (event) => event.stopPropagation());
  }

  return {
    body,
    open: () => setOpen(true),
    close: () => setOpen(false),
    isOpen: () => open,
    onOpen: (listener) => listeners.push(listener),
  };
}
