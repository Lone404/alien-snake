import { ITEM_LIST } from '../items/catalog.ts';
import { buildSprite } from '../items/sprites.ts';

/**
 * Legenda dos itens, montada a partir de items/catalog.ts. Row-plain do
 * `forms.html`: poço de ícone, título e descrição, divisor de fio entre
 * linhas, sem card por linha.
 */
export function renderLegend(container: HTMLElement): void {
  container.replaceChildren();

  for (const item of ITEM_LIST) {
    const row = document.createElement('li');
    row.className = 'row';
    row.style.setProperty('--item', item.color);
    row.style.setProperty('--item-rgb', item.colorRgb);

    const well = document.createElement('span');
    well.className = 'row-well';
    well.appendChild(buildSprite(item.sprite, 19));

    const text = document.createElement('span');
    text.className = 'row-text';

    const name = document.createElement('span');
    name.className = 'row-name';
    name.textContent = item.name;

    const points = document.createElement('span');
    points.className = 'row-points';
    points.textContent = `+${item.points}`;
    name.appendChild(points);

    const desc = document.createElement('span');
    desc.className = 'row-desc';
    desc.textContent = item.description;

    text.append(name, desc);
    row.append(well, text);
    container.appendChild(row);
  }
}

/** Só ícone, nome e pontos: o lembrete da pausa. */
export function renderLegendCompact(container: HTMLElement): void {
  container.replaceChildren();

  for (const item of ITEM_LIST) {
    const tag = document.createElement('li');
    tag.className = 'tag';
    tag.style.setProperty('--item', item.color);
    tag.style.setProperty('--item-rgb', item.colorRgb);

    const icon = buildSprite(item.sprite, 15);
    const name = document.createElement('span');
    name.className = 'tag-name';
    name.textContent = item.name;

    const points = document.createElement('span');
    points.className = 'tag-points';
    points.textContent = `+${item.points}`;

    tag.append(icon, name, points);
    container.appendChild(tag);
  }
}
