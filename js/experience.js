/** Work experience — vertical timeline supporting any number of roles. */

import { icon } from './icons.js';
import { bulletList, chips, emptyState, hiddenRibbon, isHiddenItem, itemControls } from './ui.js';
import { $, asArray, esc, formatDuration, formatMonth, monthsInclusive, parseMonth } from './utils.js';

function dateRange(item) {
  const start = formatMonth(item.start);
  if (item.current) return `${start} — Present`;
  if (parseMonth(item.end)) return `${start} — ${formatMonth(item.end)}`;
  return start;
}

function timelineItem(item, ctx, index) {
  const hidden = isHiddenItem('experience', item);
  const hasRange = parseMonth(item.start) && (item.current || parseMonth(item.end));
  const duration = hasRange ? formatDuration(monthsInclusive(item.start, item.current ? null : item.end)) : '';
  const responsibilities = asArray(item.responsibilities);
  const contributions = asArray(item.contributions);
  const name = `${item.designation || 'Role'} at ${item.company || 'company'}`;

  const columns = responsibilities.length || contributions.length ? `
    <div class="timeline-cols ${responsibilities.length && contributions.length ? '' : 'single'}">
      ${responsibilities.length ? `<div><h4 class="list-title">Responsibilities</h4>${bulletList(responsibilities)}</div>` : ''}
      ${contributions.length ? `<div class="contrib-box"><h4 class="list-title">${icon('star')}Key contributions</h4>${bulletList(contributions)}</div>` : ''}
    </div>` : '';

  return `
    <li class="timeline-item reveal ${item.current ? 'is-current' : ''} ${hidden ? 'is-hidden-item' : ''}" data-collection="experience" data-id="${esc(item.id)}" style="--reveal-delay:${Math.min(index, 3) * 70}ms">
      <div class="timeline-aside">
        <time class="timeline-date" datetime="${esc(item.start || '')}">${esc(dateRange(item))}</time>
        ${duration ? `<span class="timeline-duration">${esc(duration)}</span>` : ''}
      </div>
      <div class="timeline-marker" aria-hidden="true"><span class="timeline-dot"></span></div>
      <article class="timeline-card card">
        ${itemControls('experience', item, ctx, { name })}
        ${hiddenRibbon('experience', item, ctx)}
        <header class="timeline-head">
          <div>
            <h3 class="timeline-role">${esc(item.designation)}</h3>
            <p class="timeline-company">${icon('building')}<span>${esc(item.company)}</span>${item.location ? `<span class="muted">· ${esc(item.location)}</span>` : ''}</p>
          </div>
          <div class="timeline-badges">
            ${item.employmentType ? `<span class="badge">${esc(item.employmentType)}</span>` : ''}
            ${item.current ? '<span class="badge badge-current">Current</span>' : ''}
          </div>
        </header>
        ${item.project ? `<p class="timeline-project"><span class="timeline-project-label">Project</span><span>${esc(item.project)}</span></p>` : ''}
        ${item.summary ? `<p class="timeline-summary">${esc(item.summary)}</p>` : ''}
        ${columns}
        ${asArray(item.technologies).length ? `<div class="tech-row">${chips(item.technologies, { className: 'chip-sm' })}</div>` : ''}
      </article>
    </li>`;
}

export function renderExperience(state, ctx) {
  const root = $('#experience-root');
  const items = state.experience.filter((item) => ctx.editMode || item.visible !== false);
  root.innerHTML = items.length
    ? `<ol class="timeline">${items.map((item, index) => timelineItem(item, ctx, index)).join('')}</ol>`
    : emptyState('No work experience added yet.', ctx, 'experience', 'Add experience');
}
