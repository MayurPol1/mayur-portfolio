/**
 * Contact details and the Netlify Forms contact form.
 *
 * The <form> lives in index.html as static markup so Netlify detects it at
 * deploy time. Submissions are posted with fetch to "/" as URL-encoded data,
 * which is what Netlify Forms expects for AJAX submissions.
 */

import { icon } from './icons.js';
import { resumeHref } from './profile.js';
import { $, displayUrl, esc, safeUrl } from './utils.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const RULES = {
  name: (v) => (v.length < 2 ? 'Please enter your name.' : ''),
  email: (v) => {
    if (!v) return 'Please enter your email address.';
    return EMAIL_RE.test(v) ? '' : 'Please enter a valid email address, e.g. name@company.com.';
  },
  subject: (v) => (v.length < 3 ? 'Please add a subject (at least 3 characters).' : ''),
  message: (v) => (v.length < 10 ? 'Please write a message of at least 10 characters.' : ''),
};

let ownerEmail = '';

export function renderContactInfo(state) {
  const p = state.profile;
  ownerEmail = p.email || '';
  const resume = resumeHref(p);
  const items = [
    p.email && { icon: 'mail', label: 'Email', value: p.email, href: `mailto:${p.email}` },
    p.phone && { icon: 'phone', label: 'Phone', value: p.phone, href: `tel:${p.phone.replace(/[^\d+]/g, '')}` },
    p.linkedin && { icon: 'linkedin', label: 'LinkedIn', value: displayUrl(p.linkedin), href: p.linkedin, external: true },
    p.github && { icon: 'github', label: 'GitHub', value: displayUrl(p.github), href: p.github, external: true },
    p.location && { icon: 'map-pin', label: 'Location', value: p.location },
  ].filter(Boolean);

  $('#contact-info').innerHTML = `
    ${p.contactIntro ? `<p class="contact-intro">${esc(p.contactIntro)}</p>` : ''}
    <ul class="contact-list">
      ${items.map((item) => {
        const inner = `
          <span class="contact-icon" aria-hidden="true">${icon(item.icon)}</span>
          <span><span class="contact-label">${esc(item.label)}</span><span class="contact-value">${esc(item.value)}</span></span>
          ${item.href ? `<span class="contact-arrow" aria-hidden="true">${icon(item.external ? 'external' : 'arrow-right')}</span>` : ''}`;
        return `<li>${item.href
          ? `<a class="contact-item" href="${esc(safeUrl(item.href))}"${item.external ? ' target="_blank" rel="noopener noreferrer"' : ''}>${inner}</a>`
          : `<div class="contact-item">${inner}</div>`}</li>`;
      }).join('')}
    </ul>
    ${resume ? `<a class="btn btn-outline contact-resume" href="${esc(resume)}" download="${esc(p.resumeFileName || 'Resume.pdf')}" data-resume-link>${icon('download')}<span>Download Resume (PDF)</span></a>` : ''}`;
}

function fieldWrapper(input) {
  return input.closest('.field');
}

function validateField(input) {
  const rule = RULES[input.name];
  if (!rule) return true;
  const message = rule(input.value.trim());
  const error = document.getElementById(`${input.id}-error`);
  fieldWrapper(input)?.classList.toggle('is-invalid', Boolean(message));
  if (message) input.setAttribute('aria-invalid', 'true');
  else input.removeAttribute('aria-invalid');
  if (error) error.textContent = message;
  return !message;
}

function showStatus(type, html) {
  const status = $('#cf-status');
  status.className = `form-status is-${type}`;
  status.innerHTML = `${icon(type === 'success' ? 'check-circle' : 'alert')}<div>${html}</div>`;
  status.hidden = false;
}

function setBusy(busy) {
  const button = $('#cf-submit');
  button.disabled = busy;
  button.setAttribute('aria-busy', String(busy));
  button.querySelector('.btn-label').textContent = busy ? 'Sending…' : 'Send message';
}

export function initContactForm() {
  const form = $('#contact-form');
  if (!form) return;
  const fields = Array.from(form.querySelectorAll('input[name], textarea[name]')).filter((el) => RULES[el.name]);
  let attempted = false;

  fields.forEach((input) => {
    input.addEventListener('blur', () => {
      if (attempted || input.value.trim()) validateField(input);
    });
    input.addEventListener('input', () => {
      if (attempted || fieldWrapper(input)?.classList.contains('is-invalid')) validateField(input);
    });
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    attempted = true;
    $('#cf-status').hidden = true;

    const invalid = fields.filter((input) => !validateField(input));
    if (invalid.length) {
      invalid[0].focus();
      return;
    }
    // Honeypot: bots fill hidden fields; silently pretend success.
    if (form.elements['bot-field']?.value) {
      form.reset();
      return;
    }

    const name = form.elements.name.value.trim();
    setBusy(true);
    try {
      const response = await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(new FormData(form)).toString(),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      form.reset();
      attempted = false;
      showStatus('success', `<strong>Thanks, ${esc(name)} — your message has been sent.</strong>I'll get back to you as soon as I can.`);
    } catch {
      const fallback = ownerEmail
        ? ` Please try again in a moment, or email me directly at <a href="mailto:${esc(ownerEmail)}">${esc(ownerEmail)}</a>.`
        : ' Please try again in a moment.';
      showStatus('error', `<strong>Sorry, your message couldn't be sent.</strong>${fallback}`);
    } finally {
      setBusy(false);
    }
  });
}
