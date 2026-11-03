/** Shared render helpers used by the section modules. */

import { icon } from './icons.js';
import { esc } from './utils.js';

export function chips(items, { className = '', limit = 0 } = {}) {
  const list = (items || []).filter(Boolean);
  if (!list.length) return '';
  const shown = limit ? list.slice(0, limit) : list;
  const extra = limit && list.length > limit ? `<li class="chip ${className} chip-more">+${list.length - limit}</li>` : '';
  return `<ul class="chip-list" role="list">${shown.map((item) => `<li class="chip ${className}">${esc(item)}</li>`).join('')}${extra}</ul>`;
}

export function bulletList(items, className = 'bullet-list') {
  const list = (items || []).filter(Boolean);
  if (!list.length) return '';
  return `<ul class="${className}">${list.map((item) => `<li>${esc(item)}</li>`).join('')}</ul>`;
}

export function emptyState(message, ctx, collection, addLabel) {
  const add = ctx.editMode && collection
    ? `<button type="button" class="admin-add" data-admin="add" data-collection="${collection}">${icon('plus')}${esc(addLabel || 'Add')}</button>`
    : '';
  return `<div class="empty-state">${icon('folder')}<p>${esc(message)}</p>${add}</div>`;
}

/** True when an item is hidden from visitors (projects use draft status, others a visible flag). */
export function isHiddenItem(collection, item) {
  return collection === 'projects' ? item.status === 'draft' : item.visible === false;
}

/** Per-item edit / reorder / hide / delete controls, rendered only in Edit Mode. */
export function itemControls(collection, item, ctx, { canHide = true, name = 'item' } = {}) {
  if (!ctx.editMode) return '';
  const hidden = isHiddenItem(collection, item);
  const attrs = `data-collection="${collection}" data-id="${esc(item.id)}"`;
  const hideLabel = collection === 'projects'
    ? (hidden ? 'Publish' : 'Move to drafts')
    : (hidden ? 'Show to visitors' : 'Hide from visitors');
  return `
    <div class="item-controls" role="group" aria-label="Edit ${esc(name)}">
      <button type="button" data-admin="edit" ${attrs} title="Edit" aria-label="Edit ${esc(name)}">${icon('edit')}</button>
      <button type="button" data-admin="move" data-delta="-1" ${attrs} title="Move up" aria-label="Move ${esc(name)} up">${icon('chevron-up')}</button>
      <button type="button" data-admin="move" data-delta="1" ${attrs} title="Move down" aria-label="Move ${esc(name)} down">${icon('chevron-down')}</button>
      ${canHide ? `<button type="button" data-admin="toggle" ${attrs} title="${hideLabel}" aria-label="${hideLabel}: ${esc(name)}">${icon(hidden ? 'eye-off' : 'eye')}</button>` : ''}
      <button type="button" class="danger" data-admin="delete" ${attrs} title="Delete" aria-label="Delete ${esc(name)}">${icon('trash')}</button>
    </div>`;
}

export function hiddenRibbon(collection, item, ctx) {
  if (!ctx.editMode || !isHiddenItem(collection, item)) return '';
  return `<span class="badge badge-draft hidden-ribbon">${icon('eye-off')}${collection === 'projects' ? 'Draft' : 'Hidden'}</span>`;
}

export function externalLink(href, label, iconName = 'external', className = 'btn btn-outline btn-sm') {
  if (!href) return '';
  return `<a class="${className}" href="${esc(href)}" target="_blank" rel="noopener noreferrer">${icon(iconName)}<span>${esc(label)}</span></a>`;
}
