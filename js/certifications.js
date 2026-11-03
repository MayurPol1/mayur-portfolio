/** Certifications with optional certificate image/PDF and verification link. */

import { icon } from './icons.js';
import { openLightbox } from './modal.js';
import { emptyState, externalLink, hiddenRibbon, isHiddenItem, itemControls } from './ui.js';
import { $, dataUrlToObjectUrl, esc, formatMonth, isDataUrl, isPdf, safeUrl } from './utils.js';

let stateRef = null;

function card(cert, ctx, index) {
  const hidden = isHiddenItem('certifications', cert);
  const file = safeUrl(cert.file);
  const pdf = file && isPdf(file, cert.fileType);
  const thumb = file && !pdf
    ? `<img src="${esc(file)}" alt="${esc(`${cert.name} certificate`)}" loading="lazy" decoding="async">`
    : icon(pdf ? 'file' : 'award');
  return `
    <article class="cert-card card card-hover reveal ${hidden ? 'is-hidden-item' : ''}" data-collection="certifications" data-id="${esc(cert.id)}" style="--reveal-delay:${(index % 3) * 70}ms">
      ${itemControls('certifications', cert, ctx, { name: cert.name })}
      ${hiddenRibbon('certifications', cert, ctx)}
      <div class="cert-thumb">${thumb}</div>
      <div class="cert-body">
        <h3>${esc(cert.name)}</h3>
        ${cert.issuer ? `<p class="cert-issuer">${esc(cert.issuer)}</p>` : ''}
        <div class="cert-meta">
          ${cert.date ? `<span>Issued ${esc(formatMonth(cert.date))}</span>` : ''}
          ${cert.credentialId ? `<span>Credential ID: <code>${esc(cert.credentialId)}</code></span>` : ''}
        </div>
        <div class="cert-actions">
          ${file ? `<button type="button" class="btn btn-outline btn-sm" data-cert-view="${esc(cert.id)}">${icon(pdf ? 'file' : 'image')}<span>View certificate</span></button>` : ''}
          ${externalLink(safeUrl(cert.verifyUrl), 'Verify', 'check-circle', 'btn btn-ghost btn-sm')}
        </div>
      </div>
    </article>`;
}

export function renderCertifications(state, ctx) {
  stateRef = state;
  const root = $('#certifications-root');
  const items = state.certifications.filter((item) => ctx.editMode || item.visible !== false);
  root.innerHTML = items.length
    ? `<div class="cert-grid">${items.map((item, i) => card(item, ctx, i)).join('')}</div>`
    : emptyState('No certifications added yet.', ctx, 'certifications', 'Add certification');
}

export function initCertifications() {
  $('#certifications-root').addEventListener('click', (event) => {
    const button = event.target.closest('[data-cert-view]');
    if (!button) return;
    const cert = stateRef?.certifications.find((item) => item.id === button.dataset.certView);
    const file = cert && safeUrl(cert.file);
    if (!file) return;
    if (isPdf(file, cert.fileType)) {
      window.open(isDataUrl(file) ? dataUrlToObjectUrl(file) : file, '_blank', 'noopener');
    } else {
      openLightbox(file, `${cert.name} certificate`);
    }
  });
}
