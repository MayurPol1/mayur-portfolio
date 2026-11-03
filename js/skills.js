/** Technical skills grouped by category. No proficiency percentages — highlighted chips mark the primary stack. */

import { icon } from './icons.js';
import { emptyState, hiddenRibbon, isHiddenItem, itemControls } from './ui.js';
import { $, esc } from './utils.js';

function skillChip(category, skill, index, ctx) {
  return `
    <li class="skill-chip ${skill.core ? 'is-core' : ''}">
      ${skill.core ? '<span class="core-dot" aria-hidden="true"></span>' : ''}${esc(skill.name)}${skill.core ? '<span class="visually-hidden"> (primary stack)</span>' : ''}
      ${ctx.editMode ? `<button type="button" class="chip-remove" data-admin="skill-remove" data-id="${esc(category.id)}" data-index="${index}" aria-label="Remove ${esc(skill.name)}">×</button>` : ''}
    </li>`;
}

function card(category, ctx, index) {
  const hidden = isHiddenItem('skills', category);
  const count = category.items.length;
  return `
    <article class="skill-card card card-hover reveal ${hidden ? 'is-hidden-item' : ''}" data-collection="skills" data-id="${esc(category.id)}" style="--reveal-delay:${(index % 4) * 60}ms">
      ${itemControls('skills', category, ctx, { name: category.category })}
      ${hiddenRibbon('skills', category, ctx)}
      <header class="skill-head">
        <span class="skill-icon" aria-hidden="true">${icon(category.icon)}</span>
        <h3 class="skill-title">${esc(category.category)}<span class="skill-count">${count} skill${count === 1 ? '' : 's'}</span></h3>
      </header>
      ${category.description ? `<p class="skill-desc">${esc(category.description)}</p>` : ''}
      <ul class="skill-list" role="list">${category.items.map((skill, i) => skillChip(category, skill, i, ctx)).join('')}</ul>
      ${ctx.editMode ? `
      <form class="skill-add" data-skill-add="${esc(category.id)}">
        <input name="skill" type="text" placeholder="Add a skill…" aria-label="Add a skill to ${esc(category.category)}" maxlength="60" autocomplete="off">
        <button type="submit" class="btn btn-outline btn-sm">Add</button>
      </form>` : ''}
    </article>`;
}

export function renderSkills(state, ctx) {
  const root = $('#skills-root');
  const categories = state.skills.filter((cat) => ctx.editMode || (cat.visible !== false && cat.items.length));
  if (!categories.length) {
    root.innerHTML = emptyState('No skills added yet.', ctx, 'skills', 'Add skill category');
    return;
  }
  const hasCore = categories.some((cat) => cat.items.some((skill) => skill.core));
  root.innerHTML = `
    <div class="skills-grid">${categories.map((cat, i) => card(cat, ctx, i)).join('')}</div>
    ${hasCore ? '<p class="skills-legend"><span class="core-dot" aria-hidden="true"></span>Highlighted skills are my primary stack</p>' : ''}`;
}
