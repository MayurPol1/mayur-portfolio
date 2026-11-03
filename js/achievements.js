/** Achievements and key technical contributions. */

import { icon } from './icons.js';
import { emptyState, hiddenRibbon, isHiddenItem, itemControls } from './ui.js';
import { $, esc } from './utils.js';

function card(item, ctx, index) {
  const hidden = isHiddenItem('achievements', item);
  return `
    <article class="ach-card card card-hover reveal ${hidden ? 'is-hidden-item' : ''}" data-collection="achievements" data-id="${esc(item.id)}" style="--reveal-delay:${(index % 3) * 70}ms">
      ${itemControls('achievements', item, ctx, { name: item.title })}
      ${hiddenRibbon('achievements', item, ctx)}
      <span class="ach-icon" aria-hidden="true">${icon(item.icon || 'award')}</span>
      <h3 class="ach-title">${esc(item.title)}</h3>
      ${item.description ? `<p class="ach-desc">${esc(item.description)}</p>` : ''}
      ${item.context ? `<p class="ach-context">${esc(item.context)}</p>` : ''}
    </article>`;
}

export function renderAchievements(state, ctx) {
  const root = $('#achievements-root');
  const items = state.achievements.filter((item) => ctx.editMode || item.visible !== false);
  root.innerHTML = items.length
    ? `<div class="ach-grid">${items.map((item, i) => card(item, ctx, i)).join('')}</div>`
    : emptyState('No achievements added yet.', ctx, 'achievements', 'Add achievement');
}
