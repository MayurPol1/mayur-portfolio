/** Projects — category filters, cards and the detail modal. */

import { icon } from './icons.js';
import { closeButton, getDialog, openDialog } from './modal.js';
import { bulletList, chips, emptyState, externalLink, isHiddenItem, itemControls } from './ui.js';
import { $, $$, asArray, esc, safeUrl } from './utils.js';

export const PROJECT_CATEGORIES = {
  professional: 'Professional',
  personal: 'Personal',
  practice: 'Practice',
  opensource: 'Open Source',
};

const CATEGORY_ICONS = {
  professional: 'briefcase',
  personal: 'user',
  practice: 'terminal',
  opensource: 'git-branch',
};

const FILTERS = [{ id: 'all', label: 'All' }, ...Object.entries(PROJECT_CATEGORIES).map(([id, label]) => ({ id, label }))];

let activeFilter = 'all';
let shownIds = [];
let openProjectId = '';
let stateRef = null;
let ctxRef = { editMode: false };

function categoryBadge(project) {
  const label = PROJECT_CATEGORIES[project.category] || 'Project';
  return `<span class="badge badge-accent">${icon(CATEGORY_ICONS[project.category] || 'folder')}${esc(label)}</span>`;
}

function tagRow(project) {
  return `
    <div class="project-tags">
      ${categoryBadge(project)}
      ${project.featured ? `<span class="badge badge-featured">${icon('star')}Featured</span>` : ''}
      ${project.status === 'draft' ? '<span class="badge badge-draft">Draft</span>' : ''}
    </div>`;
}

function metaLine(project) {
  return [project.organization, project.duration].filter(Boolean).map(esc).join(' · ');
}

function validImages(project) {
  return asArray(project.images).filter((img) => img && safeUrl(img.src));
}

function cover(project) {
  const [first] = validImages(project);
  if (first) {
    return `<img src="${esc(safeUrl(first.src))}" alt="${esc(first.alt || `${project.name} screenshot`)}" loading="lazy" decoding="async">`;
  }
  return `
    <div class="cover-placeholder" aria-hidden="true">
      <span class="cover-icon">${icon(CATEGORY_ICONS[project.category] || 'code')}</span>
      <span class="cover-stack">${esc(asArray(project.technologies).slice(0, 3).join(' · '))}</span>
    </div>`;
}

function card(project, ctx, index) {
  const hidden = isHiddenItem('projects', project);
  const meta = metaLine(project);
  return `
    <article class="project-card card reveal ${project.featured ? 'is-featured' : ''} ${hidden ? 'is-hidden-item' : ''}" data-collection="projects" data-id="${esc(project.id)}" style="--reveal-delay:${(index % 3) * 70}ms">
      ${itemControls('projects', project, ctx, { name: project.name })}
      <div class="project-cover">${cover(project)}</div>
      <div class="project-body">
        ${tagRow(project)}
        <h3 class="project-title"><button type="button" class="project-open" data-project-open="${esc(project.id)}" aria-haspopup="dialog">${esc(project.name)}</button></h3>
        ${meta ? `<p class="project-meta">${meta}</p>` : ''}
        <p class="project-summary">${esc(project.summary)}</p>
        ${chips(project.technologies, { className: 'chip-sm', limit: 5 })}
        <div class="project-footer">
          <span class="project-cta" aria-hidden="true">View details ${icon('arrow-right')}</span>
          ${project.confidential ? `<span class="project-private">${icon('lock')}Private codebase</span>` : ''}
        </div>
      </div>
    </article>`;
}

export function renderProjects(state, ctx) {
  stateRef = state;
  ctxRef = ctx;
  const root = $('#projects-root');
  const all = state.projects.filter((p) => ctx.editMode || p.status !== 'draft');
  const counts = all.reduce((acc, p) => ({ ...acc, [p.category]: (acc[p.category] || 0) + 1 }), {});
  const visible = activeFilter === 'all' ? all : all.filter((p) => p.category === activeFilter);
  shownIds = visible.map((p) => p.id);
  const filterLabel = PROJECT_CATEGORIES[activeFilter];

  root.innerHTML = `
    <div class="project-filters" role="group" aria-label="Filter projects by category">
      ${FILTERS.map((f) => `
        <button type="button" class="filter-btn" data-filter="${f.id}" aria-pressed="${f.id === activeFilter}">
          ${esc(f.label)}<span class="filter-count">${f.id === 'all' ? all.length : counts[f.id] || 0}</span>
        </button>`).join('')}
    </div>
    <p class="visually-hidden" aria-live="polite">${visible.length} project${visible.length === 1 ? '' : 's'} shown</p>
    ${visible.length
      ? `<div class="projects-grid">${visible.map((p, i) => card(p, ctx, i)).join('')}</div>`
      : emptyState(filterLabel ? `No ${filterLabel.toLowerCase()} projects published yet.` : 'No projects published yet.', ctx, 'projects', 'Add project')}`;
}

function gallery(images, project) {
  if (!images.length) return '';
  const [first] = images;
  return `
    <div class="gallery">
      <figure class="gallery-main"><img src="${esc(safeUrl(first.src))}" alt="${esc(first.alt || `${project.name} screenshot 1`)}" data-gallery-main></figure>
      ${images.length > 1 ? `
      <div class="gallery-thumbs" role="group" aria-label="Screenshots">
        ${images.map((img, i) => `
          <button type="button" class="gallery-thumb" data-gallery-index="${i}" aria-label="Show screenshot ${i + 1}" ${i === 0 ? 'aria-current="true"' : ''}>
            <img src="${esc(safeUrl(img.src))}" alt="" loading="lazy" decoding="async">
          </button>`).join('')}
      </div>` : ''}
    </div>`;
}

function detailSection(title, content) {
  return content ? `<section class="detail-section"><h3>${esc(title)}</h3>${content}</section>` : '';
}

export function openProject(id) {
  const project = stateRef?.projects.find((p) => p.id === id);
  if (!project) return;
  openProjectId = id;
  const dialog = getDialog('project-dialog', 'modal-lg');
  const index = shownIds.indexOf(id);
  const prevId = index > 0 ? shownIds[index - 1] : '';
  const nextId = index >= 0 && index < shownIds.length - 1 ? shownIds[index + 1] : '';
  const images = validImages(project);
  const meta = metaLine(project);
  const github = safeUrl(project.githubUrl);
  const live = safeUrl(project.liveUrl);

  openDialog(dialog, `
    <article class="modal-panel">
      <header class="modal-header">
        <div>
          ${tagRow(project)}
          <h2 class="modal-title" id="project-dialog-title">${esc(project.name)}</h2>
          ${meta ? `<p class="modal-sub">${meta}</p>` : ''}
        </div>
        ${closeButton('Close project details')}
      </header>
      <div class="modal-body">
        ${gallery(images, project)}
        <p class="detail-lead">${esc(project.overview || project.summary)}</p>
        ${project.problem || project.solution ? `
        <div class="detail-grid">
          ${project.problem ? `<div class="detail-block"><h3>${icon('target')}The problem</h3><p>${esc(project.problem)}</p></div>` : ''}
          ${project.solution ? `<div class="detail-block"><h3>${icon('check-circle')}The solution</h3><p>${esc(project.solution)}</p></div>` : ''}
        </div>` : ''}
        ${detailSection('My responsibilities', bulletList(project.responsibilities))}
        ${detailSection('Key features', bulletList(project.features))}
        ${detailSection('Technologies', chips(project.technologies, { className: 'chip-accent' }))}
        ${project.confidential ? `<p class="note-private">${icon('lock')}<span>This is proprietary client work, so source code and internal details aren't public. I'm happy to walk through the architecture and my contributions in an interview.</span></p>` : ''}
      </div>
      <footer class="modal-footer">
        ${shownIds.length > 1 ? `
        <div class="spacer">
          <button type="button" class="btn btn-ghost btn-sm" data-project-nav="${esc(prevId)}" ${prevId ? '' : 'disabled'} aria-label="Previous project">${icon('chevron-left')}<span>Prev</span></button>
          <button type="button" class="btn btn-ghost btn-sm" data-project-nav="${esc(nextId)}" ${nextId ? '' : 'disabled'} aria-label="Next project"><span>Next</span>${icon('chevron-right')}</button>
        </div>` : '<span class="spacer"></span>'}
        ${externalLink(github, 'Source code', 'github')}
        ${externalLink(live, 'Live site', 'external', 'btn btn-primary btn-sm')}
        ${!github && !live ? '<button type="button" class="btn btn-outline btn-sm" data-close>Close</button>' : ''}
      </footer>
    </article>`, { labelledBy: 'project-dialog-title' });
}

export function initProjects() {
  const root = $('#projects-root');
  root.addEventListener('click', (event) => {
    const filterButton = event.target.closest('[data-filter]');
    if (filterButton) {
      activeFilter = filterButton.dataset.filter;
      renderProjects(stateRef, ctxRef);
      $$('.reveal', root).forEach((el) => el.classList.add('is-visible'));
      $('.projects-grid', root)?.classList.add('animate-in');
      $(`[data-filter="${activeFilter}"]`, root)?.focus();
      return;
    }
    const openButton = event.target.closest('[data-project-open]');
    if (openButton) openProject(openButton.dataset.projectOpen);
  });

  const dialog = getDialog('project-dialog', 'modal-lg');
  dialog.addEventListener('click', (event) => {
    const nav = event.target.closest('[data-project-nav]');
    if (nav && nav.dataset.projectNav) {
      openProject(nav.dataset.projectNav);
      return;
    }
    const thumb = event.target.closest('[data-gallery-index]');
    if (thumb) {
      const project = stateRef.projects.find((p) => p.id === openProjectId);
      const index = Number(thumb.dataset.galleryIndex);
      const image = project ? validImages(project)[index] : null;
      const main = dialog.querySelector('[data-gallery-main]');
      if (image && main) {
        main.src = safeUrl(image.src);
        main.alt = image.alt || `${project.name} screenshot ${index + 1}`;
      }
      $$('.gallery-thumb', dialog).forEach((btn) => btn.removeAttribute('aria-current'));
      thumb.setAttribute('aria-current', 'true');
    }
  });
}
