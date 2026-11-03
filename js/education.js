/** Education records. */

import { icon } from './icons.js';
import { emptyState, hiddenRibbon, isHiddenItem, itemControls } from './ui.js';
import { $, esc } from './utils.js';

function years(item) {
  if (item.startYear && item.endYear) return `${item.startYear} — ${item.endYear}`;
  if (item.endYear) return `Completed ${item.endYear}`;
  if (item.startYear) return `${item.startYear} — Present`;
  return '';
}

function card(item, ctx, index) {
  const hidden = isHiddenItem('education', item);
  const institution = [item.college, item.university].filter(Boolean).map(esc).join(' · ');
  const period = years(item);
  return `
    <article class="edu-card card card-hover reveal ${hidden ? 'is-hidden-item' : ''}" data-collection="education" data-id="${esc(item.id)}" style="--reveal-delay:${(index % 3) * 70}ms">
      ${itemControls('education', item, ctx, { name: item.degree })}
      ${hiddenRibbon('education', item, ctx)}
      <span class="edu-icon" aria-hidden="true">${icon('graduation')}</span>
      <div class="edu-body">
        ${period ? `<p class="edu-years">${esc(period)}</p>` : ''}
        <h3 class="edu-degree">${esc(item.degree)}</h3>
        ${item.specialization ? `<p class="edu-spec">${esc(item.specialization)}</p>` : ''}
        ${institution ? `<p class="edu-inst">${institution}</p>` : ''}
        ${item.score ? `<p class="edu-score"><span class="badge badge-accent">${esc(item.score)}</span></p>` : ''}
        ${item.description ? `<p class="edu-desc">${esc(item.description)}</p>` : ''}
      </div>
    </article>`;
}

export function renderEducation(state, ctx) {
  const root = $('#education-root');
  const items = state.education.filter((item) => ctx.editMode || item.visible !== false);
  root.innerHTML = items.length
    ? `<div class="edu-grid">${items.map((item, i) => card(item, ctx, i)).join('')}</div>`
    : emptyState('No education records added yet.', ctx, 'education', 'Add education');
}
