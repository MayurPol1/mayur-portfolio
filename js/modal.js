/**
 * Accessible dialogs built on the native <dialog> element (focus trapping,
 * Escape to close and top-layer stacking come for free), plus toasts and a
 * promise-based confirm dialog.
 */

import { icon } from './icons.js';
import { equivalentElement, esc } from './utils.js';

const returnFocus = new WeakMap();

export function getDialog(id, className = '') {
  let dialog = document.getElementById(id);
  if (dialog) return dialog;
  dialog = document.createElement('dialog');
  dialog.id = id;
  dialog.className = `modal ${className}`.trim();
  document.body.appendChild(dialog);

  // Clicking the backdrop (the dialog element itself, outside the panel) closes it.
  // The press must also start on the backdrop, so text selection that drifts outside doesn't close a form.
  let pressedOnBackdrop = false;
  dialog.addEventListener('pointerdown', (event) => {
    pressedOnBackdrop = event.target === dialog;
  });
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog && pressedOnBackdrop) dialog.close();
    else if (event.target.closest('[data-close]')) dialog.close();
  });
  dialog.addEventListener('close', () => {
    if (!document.querySelector('dialog.modal[open]')) {
      document.documentElement.classList.remove('modal-open');
    }
    // The opener may have been re-rendered while the dialog was open; focus its replacement.
    const previous = equivalentElement(returnFocus.get(dialog));
    if (previous) previous.focus({ preventScroll: true });
    dialog.dispatchEvent(new CustomEvent('dialog:closed'));
  });
  return dialog;
}

/** Fills a dialog with HTML and opens it modally. */
export function openDialog(dialog, html, { labelledBy } = {}) {
  dialog.innerHTML = html;
  if (labelledBy) dialog.setAttribute('aria-labelledby', labelledBy);
  else dialog.removeAttribute('aria-labelledby');
  if (!dialog.open) {
    returnFocus.set(dialog, document.activeElement);
    dialog.showModal();
  }
  document.documentElement.classList.add('modal-open');
  const body = dialog.querySelector('.modal-body');
  if (body) body.scrollTop = 0;
  const autofocus = dialog.querySelector('[autofocus]');
  if (autofocus) autofocus.focus();
  return dialog;
}

export function closeButton(label = 'Close') {
  return `<button type="button" class="icon-btn modal-close" data-close aria-label="${esc(label)}">${icon('x')}</button>`;
}

/* ---------- Toasts ---------- */

const TOAST_ICONS = { success: 'check-circle', error: 'alert', info: 'help' };

export function toast(message, type = 'info', timeout = 3800) {
  const region = document.getElementById('toast-region');
  if (!region) return;
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.setAttribute('role', type === 'error' ? 'alert' : 'status');
  el.innerHTML = `${icon(TOAST_ICONS[type] || 'help')}<span>${esc(message)}</span>`;
  region.appendChild(el);
  const dismiss = () => {
    el.classList.add('is-leaving');
    setTimeout(() => el.remove(), 260);
  };
  setTimeout(dismiss, type === 'error' ? timeout + 2500 : timeout);
  el.addEventListener('click', dismiss);
}

/* ---------- Confirm ---------- */

export function confirmDialog({ title, message, confirmLabel = 'Confirm', danger = false }) {
  const dialog = getDialog('confirm-dialog', 'modal-sm');
  return new Promise((resolve) => {
    let settled = false;
    const settle = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    openDialog(dialog, `
      <div class="modal-panel">
        <header class="modal-header">
          <h2 class="modal-title" id="confirm-title">${esc(title)}</h2>
          ${closeButton()}
        </header>
        <div class="modal-body"><p>${esc(message)}</p></div>
        <footer class="modal-footer">
          <button type="button" class="btn btn-ghost btn-sm" data-close>Cancel</button>
          <button type="button" class="btn btn-sm ${danger ? 'btn-danger' : 'btn-primary'}" data-confirm autofocus>${esc(confirmLabel)}</button>
        </footer>
      </div>`, { labelledBy: 'confirm-title' });
    dialog.querySelector('[data-confirm]').addEventListener('click', () => {
      settle(true);
      dialog.close();
    });
    dialog.addEventListener('dialog:closed', () => settle(false), { once: true });
  });
}

/* ---------- Lightbox ---------- */

export function openLightbox(src, alt = '') {
  const dialog = getDialog('lightbox-dialog', 'modal-lg');
  openDialog(dialog, `
    <div class="modal-panel lightbox-panel">
      ${closeButton()}
      <img src="${esc(src)}" alt="${esc(alt)}">
    </div>`);
}
