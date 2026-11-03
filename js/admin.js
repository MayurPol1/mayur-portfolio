/**
 * Edit Mode — a browser-local content editor.
 *
 * IMPORTANT: this is a convenience tool, not an admin panel. There is no
 * authentication because the site is static; anyone can switch Edit Mode on,
 * but changes only ever affect *their own* browser's localStorage. Visitors
 * always see data/portfolio.json. To publish, export the JSON, replace
 * data/portfolio.json and redeploy.
 *
 * Turn on: add ?edit to the URL or press Alt+Shift+E. Turn off: Exit button.
 */

import * as store from './data.js';
import { ICON_CHOICES, icon } from './icons.js';
import { closeButton, confirmDialog, getDialog, openDialog, toast } from './modal.js';
import { PROJECT_CATEGORIES } from './projects.js';
import { StorageFullError, storage } from './storage.js';
import {
  $, $$, asArray, compressImage, dataUrlBytes, deepClone, downloadFile, equivalentElement, esc, formatBytes,
  getPath, isDataUrl, isPdf, isValidHttpUrl, linesToArray, paragraphsToArray, readFileAsDataURL, readFileAsText,
  safeUrl, setPath, tagsToArray, uid,
} from './utils.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_PDF_BYTES = 1.5 * 1024 * 1024;
const WIDE_TYPES = new Set(['textarea', 'list', 'paragraphs', 'stats', 'skills', 'image', 'images', 'file']);

let editMode = false;
let rerender = () => {};

export function isEditMode() {
  return editMode;
}

/* ==========================================================================
   Schemas — one per collection. Forms are generated from these.
   ========================================================================== */

const visibleField = { key: 'visible', label: 'Visible to visitors', type: 'checkbox' };

const SCHEMAS = {
  experience: {
    singular: 'work experience',
    defaults: () => ({
      company: '', designation: '', employmentType: '', location: '', start: '', end: '', current: false,
      project: '', summary: '', responsibilities: [], contributions: [], technologies: [], visible: true,
    }),
    fields: [
      { key: 'company', label: 'Company', type: 'text', required: true },
      { key: 'designation', label: 'Job title', type: 'text', required: true, placeholder: 'Software Developer' },
      { key: 'employmentType', label: 'Employment type', type: 'select', options: ['', 'Full-time', 'Part-time', 'Contract', 'Internship', 'Freelance', 'Apprenticeship'] },
      { key: 'location', label: 'Location', type: 'text', placeholder: 'Pune, India · Hybrid' },
      { key: 'start', label: 'Start month', type: 'month', required: true },
      { key: 'end', label: 'End month', type: 'month', hint: 'Leave empty if this is your current role.' },
      { key: 'current', label: 'I currently work here', type: 'checkbox' },
      visibleField,
      { key: 'project', label: 'Project / product', type: 'text', wide: true },
      { key: 'summary', label: 'Short summary (optional)', type: 'textarea', rows: 2 },
      { key: 'responsibilities', label: 'Responsibilities', type: 'list' },
      { key: 'contributions', label: 'Key contributions', type: 'list' },
      { key: 'technologies', label: 'Technologies used', type: 'tags', wide: true },
    ],
    validate(values) {
      const errors = [];
      if (!values.current && !values.end) errors.push(['end', 'Add an end month, or tick "I currently work here".']);
      if (!values.current && values.end && values.start && values.end < values.start) errors.push(['end', 'The end month must be after the start month.']);
      return errors;
    },
    finalize(values) {
      if (values.current) values.end = '';
    },
  },

  projects: {
    singular: 'project',
    defaults: () => ({
      name: '', category: 'personal', organization: '', duration: '', summary: '', overview: '', problem: '', solution: '',
      responsibilities: [], features: [], technologies: [], images: [], githubUrl: '', liveUrl: '',
      featured: false, confidential: false, status: 'published',
    }),
    fields: [
      { type: 'heading', label: 'Basics' },
      { key: 'name', label: 'Project name', type: 'text', required: true },
      { key: 'category', label: 'Category', type: 'select', required: true, options: Object.entries(PROJECT_CATEGORIES).map(([value, label]) => ({ value, label })) },
      { key: 'organization', label: 'Company / context', type: 'text', placeholder: 'e.g. Nebel Infotech, or Personal' },
      { key: 'duration', label: 'Duration', type: 'text', placeholder: 'Jan 2025 – Mar 2025' },
      { key: 'status', label: 'Status', type: 'select', options: [{ value: 'published', label: 'Published' }, { value: 'draft', label: 'Draft (hidden from visitors)' }] },
      { key: 'featured', label: 'Featured project', type: 'checkbox' },
      { key: 'summary', label: 'Short description (shown on the card)', type: 'textarea', rows: 2, required: true, maxlength: 280 },
      { type: 'heading', label: 'Case study' },
      { key: 'overview', label: 'Detailed overview', type: 'textarea', rows: 3 },
      { key: 'problem', label: 'Problem statement', type: 'textarea', rows: 3 },
      { key: 'solution', label: 'Solution', type: 'textarea', rows: 3 },
      { key: 'responsibilities', label: 'My responsibilities', type: 'list' },
      { key: 'features', label: 'Key features', type: 'list' },
      { key: 'technologies', label: 'Technologies used', type: 'tags', wide: true },
      { type: 'heading', label: 'Media & links' },
      { key: 'images', label: 'Screenshots', type: 'images', maxSize: 1600, hint: 'The first image is the card cover. Uploads are resized and stored in this browser; for the live site, prefer adding images to assets/images/projects/ and referencing them by path.' },
      { key: 'githubUrl', label: 'GitHub URL', type: 'url', placeholder: 'https://github.com/…' },
      { key: 'liveUrl', label: 'Live demo URL', type: 'url', placeholder: 'https://…' },
      { key: 'confidential', label: 'Proprietary / client project — source code is not public', type: 'checkbox', wide: true },
    ],
  },

  skills: {
    singular: 'skill category',
    defaults: () => ({ category: '', icon: 'code', description: '', items: [], visible: true }),
    fields: [
      { key: 'category', label: 'Category name', type: 'text', required: true },
      { key: 'icon', label: 'Icon', type: 'icon' },
      { key: 'description', label: 'Description (optional)', type: 'text', wide: true },
      { key: 'items', label: 'Skills', type: 'skills', rows: 8, hint: 'One skill per line. End a line with * to highlight it as primary stack, e.g. "C# *".' },
      visibleField,
    ],
  },

  education: {
    singular: 'education record',
    defaults: () => ({ degree: '', specialization: '', college: '', university: '', startYear: '', endYear: '', score: '', description: '', visible: true }),
    fields: [
      { key: 'degree', label: 'Degree / qualification', type: 'text', required: true, wide: true },
      { key: 'specialization', label: 'Specialization', type: 'text' },
      { key: 'score', label: 'Percentage / CGPA', type: 'text', placeholder: 'e.g. 8.2 CGPA' },
      { key: 'college', label: 'College / institute', type: 'text' },
      { key: 'university', label: 'University / board', type: 'text' },
      { key: 'startYear', label: 'Start year', type: 'text', placeholder: '2017' },
      { key: 'endYear', label: 'Passing year', type: 'text', placeholder: '2021' },
      { key: 'description', label: 'Notes (optional)', type: 'textarea', rows: 2 },
      visibleField,
    ],
  },

  certifications: {
    singular: 'certification',
    defaults: () => ({ name: '', issuer: '', date: '', credentialId: '', file: '', fileType: '', verifyUrl: '', visible: true }),
    fields: [
      { key: 'name', label: 'Certification name', type: 'text', required: true, wide: true },
      { key: 'issuer', label: 'Issuing organization', type: 'text', required: true },
      { key: 'date', label: 'Completion date', type: 'month' },
      { key: 'credentialId', label: 'Credential ID', type: 'text' },
      { key: 'verifyUrl', label: 'Verification URL', type: 'url', placeholder: 'https://…' },
      { key: 'file', label: 'Certificate image or PDF', type: 'file', accept: 'image/*,application/pdf', maxSize: 1600, hint: 'Upload (stored in this browser) or reference a file in assets/certificates/.' },
      visibleField,
    ],
    finalize(values) {
      values.fileType = values.file ? (isPdf(values.file) ? 'application/pdf' : 'image') : '';
    },
  },

  achievements: {
    singular: 'achievement',
    defaults: () => ({ title: '', description: '', context: '', icon: 'award', visible: true }),
    fields: [
      { key: 'title', label: 'Title', type: 'text', required: true, wide: true },
      { key: 'description', label: 'Description', type: 'textarea', rows: 3, required: true },
      { key: 'context', label: 'Context', type: 'text', placeholder: 'Company · Project · Year' },
      { key: 'icon', label: 'Icon', type: 'icon' },
      visibleField,
    ],
  },
};

const PROFILE_FIELDS = [
  { type: 'heading', label: 'Identity' },
  { key: 'name', label: 'Display name', type: 'text', required: true },
  { key: 'fullName', label: 'Full name', type: 'text' },
  { key: 'title', label: 'Professional title', type: 'text', required: true, placeholder: '.NET Developer' },
  { key: 'availability', label: 'Availability badge', type: 'text', hint: 'Leave empty to hide the badge.' },
  { key: 'tagline', label: 'Designation line', type: 'text', wide: true, hint: 'Separate parts with |' },
  { key: 'headline', label: 'Headline', type: 'textarea', rows: 2 },
  { key: 'intro', label: 'Short introduction', type: 'textarea', rows: 3, hint: '{years} is replaced with your calculated experience.' },
  { key: 'heroSkills', label: 'Main technical skills (hero)', type: 'tags', wide: true },
  { key: 'photo', label: 'Profile photo', type: 'image', maxSize: 1000, hint: 'Portrait or square photo, at least 600px wide. Uploads are resized to 1000px.' },
  { key: 'photoAlt', label: 'Photo description (alt text)', type: 'text', wide: true },
  { type: 'heading', label: 'Contact' },
  { key: 'email', label: 'Email', type: 'email', required: true },
  { key: 'phone', label: 'Phone', type: 'tel' },
  { key: 'location', label: 'Location', type: 'text' },
  { key: 'linkedin', label: 'LinkedIn URL', type: 'url' },
  { key: 'github', label: 'GitHub URL', type: 'url', hint: 'GitHub links appear across the site once this is set.' },
  { key: 'contactIntro', label: 'Contact section intro', type: 'textarea', rows: 2 },
  { type: 'heading', label: 'Experience & stats' },
  { key: 'careerStart', label: 'Career start month', type: 'month', hint: 'Used to calculate {years}. Empty = earliest work experience.' },
  { key: 'experienceOverride', label: 'Experience override', type: 'text', placeholder: 'e.g. 3+', hint: 'Optional fixed value instead of the automatic calculation.' },
  { key: 'stats', label: 'Hero stats', type: 'stats', rows: 4, hint: 'One per line as "value | label". Tokens: {years}, {companies}, {projects}.' },
  { type: 'heading', label: 'About section' },
  { key: 'about.summary', label: 'Professional summary', type: 'paragraphs', rows: 8, hint: 'Separate paragraphs with a blank line. {years} is supported.' },
  { key: 'about.expertise', label: 'Areas of expertise', type: 'list' },
  { key: 'about.interests', label: 'Career interests', type: 'list' },
];

const ADD_OPTIONS = [
  { collection: 'projects', label: 'Project', icon: 'folder' },
  { collection: 'experience', label: 'Work experience', icon: 'briefcase' },
  { collection: 'skills', label: 'Skill category', icon: 'code' },
  { collection: 'education', label: 'Education', icon: 'graduation' },
  { collection: 'certifications', label: 'Certification', icon: 'award' },
  { collection: 'achievements', label: 'Achievement', icon: 'trophy' },
];

/* ==========================================================================
   Form engine
   ========================================================================== */

function fieldId(key) {
  return `af-${key.replace(/[^a-z0-9]/gi, '-')}`;
}

function optionList(options) {
  return options.map((opt) => (typeof opt === 'string' ? { value: opt, label: opt || '— Not specified —' } : opt));
}

function textValue(field, value) {
  switch (field.type) {
    case 'list': return asArray(value).join('\n');
    case 'paragraphs': return asArray(value).join('\n\n');
    case 'tags': return asArray(value).join(', ');
    case 'stats': return asArray(value).map((s) => `${s.value} | ${s.label}`).join('\n');
    case 'skills': return asArray(value).map((s) => `${s.name}${s.core ? ' *' : ''}`).join('\n');
    default: return value ?? '';
  }
}

function mediaPreview(value, kind) {
  if (!value) return `<span class="file-pill">${icon(kind === 'image' ? 'image' : 'file')}No file selected</span>`;
  const label = isDataUrl(value) ? `Uploaded ${isPdf(value) ? 'PDF' : 'image'} · ${formatBytes(dataUrlBytes(value))}` : value;
  if (isPdf(value)) return `<span class="file-pill">${icon('file')}${esc(label)}</span>`;
  return `<img src="${esc(safeUrl(value))}" alt=""><span class="file-pill">${esc(label)}</span>`;
}

function mediaItems(items) {
  if (!items.length) return '<p class="field-hint">No screenshots yet.</p>';
  return items.map((img, i) => `
    <div class="media-item">
      <img src="${esc(safeUrl(img.src))}" alt="">
      <input type="text" value="${esc(img.alt || '')}" placeholder="Describe the screenshot (alt text)" data-media-alt="${i}" aria-label="Alt text for screenshot ${i + 1}">
      <div class="media-item-actions">
        <button type="button" data-media-move="-1" data-media-index="${i}" aria-label="Move screenshot ${i + 1} up">${icon('chevron-up')}</button>
        <button type="button" data-media-move="1" data-media-index="${i}" aria-label="Move screenshot ${i + 1} down">${icon('chevron-down')}</button>
        <button type="button" class="danger" data-media-remove="${i}" aria-label="Remove screenshot ${i + 1}">${icon('trash')}</button>
      </div>
    </div>`).join('');
}

function renderField(field, value) {
  if (field.type === 'heading') return `<h3 class="form-section-title">${esc(field.label)}</h3>`;
  const id = fieldId(field.key);
  const wide = field.wide || WIDE_TYPES.has(field.type) ? 'span-2' : '';
  const req = field.required ? ' <span class="req" aria-hidden="true">*</span>' : '';
  const hintId = field.hint ? `${id}-hint` : '';
  const describedBy = `aria-describedby="${[hintId, `${id}-error`].filter(Boolean).join(' ')}"`;
  const hint = field.hint ? `<p class="field-hint" id="${hintId}">${esc(field.hint)}</p>` : '';
  const error = `<p class="field-error" id="${id}-error"></p>`;
  const common = `id="${id}" name="${esc(field.key)}" ${describedBy}${field.required ? ' required' : ''}${field.placeholder ? ` placeholder="${esc(field.placeholder)}"` : ''}${field.maxlength ? ` maxlength="${field.maxlength}"` : ''}`;
  let control;

  switch (field.type) {
    case 'checkbox':
      return `<div class="field ${wide}" data-field="${esc(field.key)}"><label class="check-field"><input type="checkbox" id="${id}" name="${esc(field.key)}" ${value ? 'checked' : ''}> ${esc(field.label)}</label>${hint}</div>`;
    case 'textarea':
    case 'list':
    case 'paragraphs':
    case 'stats':
    case 'skills': {
      const rows = field.rows || (field.type === 'textarea' ? 3 : 5);
      const defaultHints = { list: 'One item per line.' };
      control = `<textarea ${common} rows="${rows}">${esc(textValue(field, value))}</textarea>`;
      if (!field.hint && defaultHints[field.type]) {
        return `<div class="field ${wide}" data-field="${esc(field.key)}"><label for="${id}">${esc(field.label)}${req}</label>${control}<p class="field-hint">${defaultHints[field.type]}</p>${error}</div>`;
      }
      break;
    }
    case 'tags':
      control = `<input type="text" ${common} value="${esc(textValue(field, value))}">`;
      return `<div class="field ${wide}" data-field="${esc(field.key)}"><label for="${id}">${esc(field.label)}${req}</label>${control}${hint || '<p class="field-hint">Comma-separated.</p>'}${error}</div>`;
    case 'select':
    case 'icon': {
      const options = field.type === 'icon'
        ? ICON_CHOICES.map((name) => ({ value: name, label: name }))
        : optionList(field.options);
      control = `<select ${common}>${options.map((opt) => `<option value="${esc(opt.value)}" ${String(value ?? '') === opt.value ? 'selected' : ''}>${esc(opt.label)}</option>`).join('')}</select>`;
      break;
    }
    case 'image':
    case 'file': {
      const kind = field.type === 'image' ? 'image' : 'file';
      const accept = field.accept || 'image/*';
      return `
        <div class="field media-field ${wide}" data-field="${esc(field.key)}" data-media-field="${esc(field.key)}">
          <label for="${id}">${esc(field.label)}${req}</label>
          <div class="media-preview" data-media-preview>${mediaPreview(value, kind)}</div>
          <div class="media-actions">
            <label class="btn btn-outline btn-sm upload-btn">${icon('upload')}<span>Upload</span><input type="file" accept="${esc(accept)}" data-media-upload aria-label="Upload ${esc(field.label)}"></label>
            <input type="text" class="path-input" id="${id}" ${describedBy} value="${isDataUrl(value) ? '' : esc(value || '')}" placeholder="…or a path / URL, e.g. assets/images/photo.jpg" data-media-path>
            <button type="button" class="btn btn-ghost btn-sm" data-media-clear>Remove</button>
          </div>
          ${hint}${error}
        </div>`;
    }
    case 'images':
      return `
        <div class="field media-field ${wide}" data-field="${esc(field.key)}" data-media-list="${esc(field.key)}">
          <label for="${id}">${esc(field.label)}</label>
          <div class="media-list" data-media-items>${mediaItems(asArray(value))}</div>
          <div class="media-actions">
            <label class="btn btn-outline btn-sm upload-btn">${icon('upload')}<span>Upload images</span><input type="file" accept="image/*" multiple data-media-list-upload aria-label="Upload screenshots"></label>
            <input type="text" class="path-input" id="${id}" placeholder="…or add by path / URL" data-media-list-path ${describedBy}>
            <button type="button" class="btn btn-ghost btn-sm" data-media-list-add>Add</button>
          </div>
          ${hint}${error}
        </div>`;
    default: {
      const type = ['email', 'url', 'tel', 'month'].includes(field.type) ? field.type : 'text';
      control = `<input type="${type}" ${common} value="${esc(value ?? '')}">`;
    }
  }
  return `<div class="field ${wide}" data-field="${esc(field.key)}"><label for="${id}">${esc(field.label)}${req}</label>${control}${hint}${error}</div>`;
}

function setFieldError(wrapper, message) {
  if (!wrapper) return;
  wrapper.classList.toggle('is-invalid', Boolean(message));
  const error = wrapper.querySelector('.field-error');
  if (error) error.textContent = message || '';
  const control = wrapper.querySelector('input:not([type="file"]):not([type="checkbox"]), textarea, select');
  if (control) {
    if (message) control.setAttribute('aria-invalid', 'true');
    else control.removeAttribute('aria-invalid');
  }
}

function readField(form, field, media, lists) {
  const control = form.querySelector(`#${fieldId(field.key)}`);
  switch (field.type) {
    case 'checkbox': return Boolean(control?.checked);
    case 'list': return linesToArray(control.value);
    case 'paragraphs': return paragraphsToArray(control.value);
    case 'tags': return tagsToArray(control.value);
    case 'stats':
      return linesToArray(control.value)
        .map((line) => {
          const [value, ...rest] = line.split('|');
          return { value: value.trim(), label: rest.join('|').trim() };
        })
        .filter((stat) => stat.value && stat.label);
    case 'skills':
      return linesToArray(control.value)
        .map((line) => ({ name: line.replace(/\s*\*\s*$/, '').trim(), core: /\*\s*$/.test(line) }))
        .filter((skill) => skill.name);
    case 'image':
    case 'file': return media[field.key] || '';
    case 'images': return lists[field.key].map((img) => ({ src: img.src, alt: (img.alt || '').trim() }));
    default: return control ? control.value.trim() : '';
  }
}

function validateField(field, value) {
  const empty = value === '' || (Array.isArray(value) && value.length === 0);
  if (field.required && empty) return `${field.label} is required.`;
  if (empty) return '';
  if (field.type === 'url' && !isValidHttpUrl(value)) return 'Enter a full URL starting with https://';
  if (field.type === 'email' && !EMAIL_RE.test(value)) return 'Enter a valid email address.';
  if (field.type === 'month' && !/^\d{4}-\d{2}$/.test(value)) return 'Use the format YYYY-MM, e.g. 2024-05.';
  if ((field.type === 'image' || field.type === 'file') && !safeUrl(value)) return 'This path or URL is not allowed.';
  return '';
}

/** Wires upload / path / remove behaviour for media fields. State lives in `media` and `lists`. */
function wireMedia(form, fields, media, lists) {
  const fieldByKey = Object.fromEntries(fields.filter((f) => f.key).map((f) => [f.key, f]));

  const refreshSingle = (wrapper) => {
    const key = wrapper.dataset.mediaField;
    wrapper.querySelector('[data-media-preview]').innerHTML = mediaPreview(media[key], fieldByKey[key].type === 'image' ? 'image' : 'file');
  };
  const refreshList = (wrapper) => {
    wrapper.querySelector('[data-media-items]').innerHTML = mediaItems(lists[wrapper.dataset.mediaList]);
  };

  async function fileToDataUrl(file, field, { pdfAllowed }) {
    if (file.type === 'application/pdf') {
      if (!pdfAllowed) throw new Error('Please choose an image file.');
      if (file.size > MAX_PDF_BYTES) {
        throw new Error(`That PDF is ${formatBytes(file.size)} — too large for browser storage (max ${formatBytes(MAX_PDF_BYTES)}). Put it in the assets/ folder and enter its path instead.`);
      }
      return readFileAsDataURL(file);
    }
    if (!file.type.startsWith('image/')) throw new Error(`"${file.name}" is not a supported image${pdfAllowed ? ' or PDF' : ''}.`);
    return compressImage(file, { maxSize: field.maxSize || 1600 });
  }

  form.addEventListener('change', async (event) => {
    const input = event.target;
    if (input.matches('[data-media-upload]')) {
      const wrapper = input.closest('[data-media-field]');
      const field = fieldByKey[wrapper.dataset.mediaField];
      const [file] = input.files;
      input.value = '';
      if (!file) return;
      try {
        const accept = field.accept || 'image/*';
        const pdfAllowed = /pdf/.test(accept);
        if (/pdf/.test(accept) && !/image/.test(accept) && file.type !== 'application/pdf') throw new Error('Please choose a PDF file.');
        media[field.key] = await fileToDataUrl(file, field, { pdfAllowed });
        wrapper.querySelector('[data-media-path]').value = '';
        setFieldError(wrapper, '');
        refreshSingle(wrapper);
      } catch (err) {
        setFieldError(wrapper, err.message);
      }
    }
    if (input.matches('[data-media-list-upload]')) {
      const wrapper = input.closest('[data-media-list]');
      const field = fieldByKey[wrapper.dataset.mediaList];
      const files = Array.from(input.files);
      input.value = '';
      try {
        for (const file of files) {
          const src = await fileToDataUrl(file, field, { pdfAllowed: false });
          lists[field.key].push({ src, alt: file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ') });
        }
        setFieldError(wrapper, '');
      } catch (err) {
        setFieldError(wrapper, err.message);
      }
      refreshList(wrapper);
    }
  });

  form.addEventListener('input', (event) => {
    const input = event.target;
    if (input.matches('[data-media-path]')) {
      const wrapper = input.closest('[data-media-field]');
      media[wrapper.dataset.mediaField] = input.value.trim();
      refreshSingle(wrapper);
    }
    if (input.matches('[data-media-alt]')) {
      const wrapper = input.closest('[data-media-list]');
      lists[wrapper.dataset.mediaList][Number(input.dataset.mediaAlt)].alt = input.value;
    }
  });

  form.addEventListener('click', (event) => {
    const target = event.target.closest('button');
    if (!target) return;
    if (target.matches('[data-media-clear]')) {
      const wrapper = target.closest('[data-media-field]');
      media[wrapper.dataset.mediaField] = '';
      wrapper.querySelector('[data-media-path]').value = '';
      refreshSingle(wrapper);
      return;
    }
    const listWrapper = target.closest('[data-media-list]');
    if (!listWrapper) return;
    const items = lists[listWrapper.dataset.mediaList];
    if (target.matches('[data-media-list-add]')) {
      const pathInput = listWrapper.querySelector('[data-media-list-path]');
      const src = pathInput.value.trim();
      if (!src) return;
      if (!safeUrl(src)) {
        setFieldError(listWrapper, 'This path or URL is not allowed.');
        return;
      }
      items.push({ src, alt: '' });
      pathInput.value = '';
      setFieldError(listWrapper, '');
    } else if (target.matches('[data-media-remove]')) {
      items.splice(Number(target.dataset.mediaRemove), 1);
    } else if (target.matches('[data-media-move]')) {
      const from = Number(target.dataset.mediaIndex);
      const to = from + Number(target.dataset.mediaMove);
      if (to < 0 || to >= items.length) return;
      [items[from], items[to]] = [items[to], items[from]];
    } else {
      return;
    }
    refreshList(listWrapper);
  });

  form.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && event.target.matches('[data-media-list-path]')) {
      event.preventDefault();
      event.target.closest('[data-media-list]').querySelector('[data-media-list-add]').click();
    }
  });
}

/**
 * Opens a generated form in the shared admin dialog.
 * `onSubmit(values)` receives a flat map keyed by field key (dot paths for nested profile fields).
 */
function openForm({ title, fields, value, submitLabel = 'Save', validate, finalize, onSubmit }) {
  const dialog = getDialog('admin-dialog', 'modal-lg');
  const media = {};
  const lists = {};
  fields.forEach((field) => {
    if (field.type === 'image' || field.type === 'file') media[field.key] = getPath(value, field.key) || '';
    if (field.type === 'images') lists[field.key] = deepClone(asArray(getPath(value, field.key)));
  });

  openDialog(dialog, `
    <form class="modal-panel admin-form" novalidate>
      <header class="modal-header">
        <h2 class="modal-title" id="admin-form-title">${esc(title)}</h2>
        ${closeButton()}
      </header>
      <div class="modal-body"><div class="form-grid">${fields.map((field) => renderField(field, field.key ? getPath(value, field.key) : null)).join('')}</div></div>
      <footer class="modal-footer">
        <span class="spacer field-hint">Saved in this browser only — export to publish.</span>
        <button type="button" class="btn btn-ghost btn-sm" data-close>Cancel</button>
        <button type="submit" class="btn btn-primary btn-sm">${icon('check')}<span>${esc(submitLabel)}</span></button>
      </footer>
    </form>`, { labelledBy: 'admin-form-title' });

  const form = dialog.querySelector('form');
  wireMedia(form, fields, media, lists);
  form.querySelector('input:not([type="file"]):not([type="checkbox"]), textarea, select')?.focus();

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const values = {};
    const errors = new Map();
    fields.filter((field) => field.key).forEach((field) => {
      values[field.key] = readField(form, field, media, lists);
      const message = validateField(field, values[field.key]);
      if (message) errors.set(field.key, message);
    });
    if (validate) validate(values).forEach(([key, message]) => { if (!errors.has(key)) errors.set(key, message); });

    let firstInvalid = null;
    $$('[data-field]', form).forEach((wrapper) => {
      const message = errors.get(wrapper.dataset.field) || '';
      setFieldError(wrapper, message);
      if (message && !firstInvalid) firstInvalid = wrapper.querySelector('input:not([type="file"]), textarea, select');
    });
    if (firstInvalid) {
      firstInvalid.focus();
      return;
    }
    if (finalize) finalize(values);
    try {
      onSubmit(values);
      dialog.close();
    } catch (err) {
      handleError(err);
    }
  });
}

/* ==========================================================================
   Actions
   ========================================================================== */

function handleError(err) {
  const message = err instanceof StorageFullError ? err.message : `Something went wrong: ${err.message}`;
  toast(message, 'error');
}

function openItemForm(collection, id) {
  const schema = SCHEMAS[collection];
  if (!schema) return;
  const existing = id ? store.findItem(collection, id) : null;
  const item = existing ? deepClone(existing) : { id: uid(collection.slice(0, 4)), ...schema.defaults() };
  openForm({
    title: `${existing ? 'Edit' : 'Add'} ${schema.singular}`,
    fields: schema.fields,
    value: item,
    submitLabel: existing ? 'Save changes' : `Add ${schema.singular}`,
    validate: schema.validate,
    finalize: schema.finalize,
    onSubmit(values) {
      store.upsertItem(collection, { ...item, ...values });
      toast(existing ? 'Changes saved.' : `${schema.singular[0].toUpperCase()}${schema.singular.slice(1)} added.`, 'success');
    },
  });
}

function openProfileForm() {
  openForm({
    title: 'Edit profile',
    fields: PROFILE_FIELDS,
    value: deepClone(store.getState().profile),
    submitLabel: 'Save profile',
    onSubmit(values) {
      store.update((s) => {
        Object.entries(values).forEach(([key, value]) => setPath(s.profile, key, value));
      });
      toast('Profile updated.', 'success');
    },
  });
}

function openResumeForm() {
  const profile = store.getState().profile;
  openForm({
    title: 'Replace resume',
    fields: [
      { key: 'resume', label: 'Resume PDF', type: 'file', accept: 'application/pdf', required: true, hint: `Upload a PDF (max ${formatBytes(MAX_PDF_BYTES)}, stored in this browser) or enter a path. To publish, replace assets/resume/Mayur-Pol-Resume.pdf and redeploy.` },
      { key: 'resumeFileName', label: 'Download file name', type: 'text', placeholder: 'Mayur-Pol-Resume.pdf', wide: true },
    ],
    value: { resume: profile.resume, resumeFileName: profile.resumeFileName },
    submitLabel: 'Save resume',
    validate(values) {
      return values.resume && !isPdf(values.resume) ? [['resume', 'The resume must be a PDF file.']] : [];
    },
    onSubmit(values) {
      store.update((s) => {
        s.profile.resume = values.resume;
        const name = values.resumeFileName || 'Resume.pdf';
        s.profile.resumeFileName = /\.pdf$/i.test(name) ? name : `${name}.pdf`;
      });
      toast('Resume updated.', 'success');
    },
  });
}

function openSectionsForm() {
  const dialog = getDialog('admin-dialog', 'modal-lg');
  const sections = deepClone(store.getState().sections);

  const rowsHtml = () => sections.map((section, i) => `
    <div class="section-row" data-section-row="${i}">
      <div class="section-row-order">
        <button type="button" data-section-move="-1" data-section-index="${i}" aria-label="Move ${esc(section.label)} up" ${i === 0 ? 'disabled' : ''}>${icon('chevron-up')}</button>
        <button type="button" data-section-move="1" data-section-index="${i}" aria-label="Move ${esc(section.label)} down" ${i === sections.length - 1 ? 'disabled' : ''}>${icon('chevron-down')}</button>
      </div>
      <div class="section-row-fields">
        <span class="section-row-id">#${esc(section.id)}</span>
        <div class="field"><label for="sec-${section.id}-label">Menu label</label><input id="sec-${section.id}-label" type="text" data-sec="label" value="${esc(section.label)}" required></div>
        <div class="field"><label for="sec-${section.id}-title">Heading</label><input id="sec-${section.id}-title" type="text" data-sec="title" value="${esc(section.title)}" required></div>
        <div class="field span-2"><label for="sec-${section.id}-subtitle">Subtitle</label><input id="sec-${section.id}-subtitle" type="text" data-sec="subtitle" value="${esc(section.subtitle || '')}"></div>
      </div>
      <label class="check-field"><input type="checkbox" data-sec="visible" ${section.visible ? 'checked' : ''}> Visible</label>
    </div>`).join('');

  openDialog(dialog, `
    <form class="modal-panel admin-form" novalidate>
      <header class="modal-header">
        <div>
          <h2 class="modal-title" id="sections-title">Sections</h2>
          <p class="modal-sub">Reorder sections, rename them, or hide them from visitors. Empty sections are hidden automatically.</p>
        </div>
        ${closeButton()}
      </header>
      <div class="modal-body"><div class="sections-list" data-sections>${rowsHtml()}</div></div>
      <footer class="modal-footer">
        <button type="button" class="btn btn-ghost btn-sm" data-close>Cancel</button>
        <button type="submit" class="btn btn-primary btn-sm">${icon('check')}<span>Save sections</span></button>
      </footer>
    </form>`, { labelledBy: 'sections-title' });

  const form = dialog.querySelector('form');
  const list = form.querySelector('[data-sections]');
  const syncFromInputs = () => {
    $$('[data-section-row]', list).forEach((row) => {
      const section = sections[Number(row.dataset.sectionRow)];
      section.label = row.querySelector('[data-sec="label"]').value.trim() || section.label;
      section.title = row.querySelector('[data-sec="title"]').value.trim() || section.title;
      section.subtitle = row.querySelector('[data-sec="subtitle"]').value.trim();
      section.visible = row.querySelector('[data-sec="visible"]').checked;
    });
  };

  list.addEventListener('click', (event) => {
    const button = event.target.closest('[data-section-move]');
    if (!button) return;
    syncFromInputs();
    const from = Number(button.dataset.sectionIndex);
    const delta = Number(button.dataset.sectionMove);
    const to = from + delta;
    if (to < 0 || to >= sections.length) return;
    [sections[from], sections[to]] = [sections[to], sections[from]];
    list.innerHTML = rowsHtml();
    list.querySelector(`[data-section-index="${to}"][data-section-move="${delta}"]:not([disabled])`)?.focus()
      || list.querySelector(`[data-section-index="${to}"]:not([disabled])`)?.focus();
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    syncFromInputs();
    try {
      store.update((s) => { s.sections = sections; });
      dialog.close();
      toast('Sections updated.', 'success');
    } catch (err) {
      handleError(err);
    }
  });
}

function openAddMenu() {
  const dialog = getDialog('admin-dialog', 'modal-lg');
  openDialog(dialog, `
    <div class="modal-panel">
      <header class="modal-header"><h2 class="modal-title" id="add-menu-title">Add new…</h2>${closeButton()}</header>
      <div class="modal-body">
        <div class="add-menu-grid">
          ${ADD_OPTIONS.map((opt) => `
            <button type="button" class="add-option" data-admin="add" data-collection="${opt.collection}">
              <span class="skill-icon" aria-hidden="true">${icon(opt.icon)}</span>${esc(opt.label)}
            </button>`).join('')}
        </div>
      </div>
    </div>`, { labelledBy: 'add-menu-title' });
}

function openHelp() {
  const dialog = getDialog('admin-dialog', 'modal-lg');
  const used = storage.usageBytes();
  openDialog(dialog, `
    <div class="modal-panel">
      <header class="modal-header"><h2 class="modal-title" id="help-title">How Edit Mode works</h2>${closeButton()}</header>
      <div class="modal-body help-content">
        <p class="help-callout"><strong>Your edits are saved in this browser only</strong> (localStorage). Visitors never see them, they don't sync to other browsers or devices, and clearing site data deletes them. Edit Mode is a convenience tool, not a secure admin area — anyone can switch it on, but only for their own browser.</p>
        <div>
          <h3>Publish your changes for everyone</h3>
          <ol>
            <li>Click <strong>Export</strong> to download <code>portfolio.json</code>.</li>
            <li>Replace <code>data/portfolio.json</code> in the project with the exported file.</li>
            <li>Redeploy: push to GitHub (automatic Netlify deploy) or drag the folder into Netlify.</li>
            <li>Click <strong>Restore</strong> here to clear local edits and confirm the live data.</li>
          </ol>
        </div>
        <div>
          <h3>Editing</h3>
          <ul>
            <li>Use the controls on each card to edit, reorder, hide or delete it.</li>
            <li>Use <strong>Add</strong> or the “Add …” buttons in each section to create new entries.</li>
            <li><strong>Sections</strong> changes section order, names and visibility.</li>
            <li><strong>Profile</strong> updates your hero, photo, contact details and About text. <code>{years}</code> is calculated automatically.</li>
          </ul>
        </div>
        <div>
          <h3>Images and files</h3>
          <p>Uploads are resized and embedded in the data, which keeps everything in one file but makes it larger. For the live site, prefer copying files into <code>assets/</code> and entering their path (e.g. <code>assets/images/projects/app-1.webp</code>).</p>
          <p class="storage-meter">Browser storage used: ${formatBytes(used)} of roughly 5 MB.</p>
        </div>
        <div>
          <h3>Switching Edit Mode on and off</h3>
          <p>Open the site with <code>?edit</code> at the end of the URL, or press <kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>E</kbd>. Use <strong>Exit</strong> to switch it off.</p>
        </div>
      </div>
      <footer class="modal-footer"><button type="button" class="btn btn-primary btn-sm" data-close>Got it</button></footer>
    </div>`, { labelledBy: 'help-title' });
}

function moveItem(button) {
  const { collection, id } = button.dataset;
  const delta = Number(button.dataset.delta);
  const itemEl = button.closest('.item-controls')?.parentElement.closest('[data-collection][data-id]');
  const peers = itemEl
    ? Array.from(itemEl.parentElement.children).filter((el) => el.dataset.collection === collection).map((el) => el.dataset.id)
    : null;
  if (!store.moveItem(collection, id, delta, peers)) {
    toast(`Already at the ${delta < 0 ? 'top' : 'bottom'}.`, 'info', 2000);
    return;
  }
  equivalentElement(button)?.focus();
}

function toggleItem(button) {
  const { collection, id } = button.dataset;
  let nowHidden = false;
  store.update((s) => {
    const item = s[collection].find((entry) => entry.id === id);
    if (!item) return;
    if (collection === 'projects') {
      item.status = item.status === 'draft' ? 'published' : 'draft';
      nowHidden = item.status === 'draft';
    } else {
      item.visible = item.visible === false;
      nowHidden = !item.visible;
    }
  });
  toast(nowHidden ? 'Hidden from visitors.' : 'Visible to visitors.', 'success', 2200);
  equivalentElement(button)?.focus();
}

async function deleteItem(collection, id) {
  const item = store.findItem(collection, id);
  if (!item) return;
  const name = item.name || item.title || item.designation || item.degree || item.category || 'this item';
  const ok = await confirmDialog({
    title: `Delete ${SCHEMAS[collection]?.singular || 'item'}?`,
    message: `“${name}” will be removed from this browser's copy of the portfolio. You can undo this with Restore (which discards all local edits) or by re-importing an export.`,
    confirmLabel: 'Delete',
    danger: true,
  });
  if (!ok) return;
  store.removeItem(collection, id);
  toast('Deleted.', 'success', 2200);
}

function removeSkill(categoryId, index) {
  store.update((s) => {
    const category = s.skills.find((cat) => cat.id === categoryId);
    if (category) category.items.splice(index, 1);
  });
  $(`[data-skill-add="${CSS.escape(categoryId)}"] input`)?.focus();
}

function onSkillAdd(event) {
  const form = event.target.closest('[data-skill-add]');
  if (!form || !editMode) return;
  event.preventDefault();
  const categoryId = form.dataset.skillAdd;
  const name = form.elements.skill.value.trim();
  if (!name) return;
  const category = store.findItem('skills', categoryId);
  if (category?.items.some((skill) => skill.name.toLowerCase() === name.toLowerCase())) {
    toast(`“${name}” is already listed.`, 'info', 2200);
    return;
  }
  try {
    store.update((s) => {
      s.skills.find((cat) => cat.id === categoryId)?.items.push({ name, core: false });
    });
  } catch (err) {
    handleError(err);
  }
  $(`[data-skill-add="${CSS.escape(categoryId)}"] input`)?.focus();
}

function exportData() {
  const json = store.exportJSON();
  downloadFile('portfolio.json', json);
  toast(`Exported portfolio.json (${formatBytes(json.length)}). Replace data/portfolio.json with it and redeploy to publish.`, 'success', 7000);
}

async function onImportFile(event) {
  const input = event.target;
  const [file] = input.files;
  input.value = '';
  if (!file) return;
  try {
    let data;
    try {
      data = JSON.parse(await readFileAsText(file));
    } catch {
      toast('That file is not valid JSON.', 'error');
      return;
    }
    const problems = store.validatePortfolio(data);
    if (problems.length) {
      toast(`Import failed: ${problems.join(' ')}`, 'error');
      return;
    }
    const ok = await confirmDialog({
      title: 'Import portfolio data?',
      message: `This replaces everything shown in this browser with the contents of “${file.name}”.`,
      confirmLabel: 'Import',
    });
    if (!ok) return;
    store.replaceAll(data);
    toast('Portfolio data imported.', 'success');
  } catch (err) {
    handleError(err);
  }
}

async function resetData() {
  const ok = await confirmDialog({
    title: 'Restore original data?',
    message: 'This discards every change saved in this browser and shows the published data from data/portfolio.json again. Export first if you want to keep your edits.',
    confirmLabel: 'Restore',
    danger: true,
  });
  if (!ok) return;
  store.resetToDefaults();
  toast('Original data restored.', 'success');
}

function setEditMode(enabled) {
  editMode = enabled;
  storage.setEditMode(enabled);
}

async function onClick(event) {
  const el = event.target.closest('[data-admin]');
  if (!el || !editMode) return;
  const { admin: action, collection, id } = el.dataset;
  try {
    switch (action) {
      case 'add': openItemForm(collection); break;
      case 'edit': openItemForm(collection, id); break;
      case 'move': moveItem(el); break;
      case 'toggle': toggleItem(el); break;
      case 'delete': await deleteItem(collection, id); break;
      case 'skill-remove': removeSkill(id, Number(el.dataset.index)); break;
      case 'add-menu': openAddMenu(); break;
      case 'profile': openProfileForm(); break;
      case 'sections': openSectionsForm(); break;
      case 'resume': openResumeForm(); break;
      case 'export': exportData(); break;
      case 'import': $('#import-input').click(); break;
      case 'reset': await resetData(); break;
      case 'help': openHelp(); break;
      case 'exit':
        setEditMode(false);
        rerender();
        toast('Edit mode off. Add ?edit to the URL or press Alt+Shift+E to return.', 'info', 5000);
        break;
      default: break;
    }
  } catch (err) {
    handleError(err);
  }
}

/* ==========================================================================
   Toolbar & init
   ========================================================================== */

function toolbarButton(action, iconName, label, className = '') {
  return `<button type="button" class="admin-btn ${className}" data-admin="${action}" title="${esc(label)}">${icon(iconName)}<span>${esc(label)}</span></button>`;
}

export function renderAdminBar() {
  let bar = $('#admin-bar');
  if (!editMode) {
    bar?.remove();
    return;
  }
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'admin-bar';
    bar.className = 'admin-bar';
    bar.setAttribute('role', 'toolbar');
    bar.setAttribute('aria-label', 'Edit mode');
    document.body.appendChild(bar);
  }
  const local = store.hasLocalChanges();
  const newer = local && store.isSourceNewer();
  const note = newer
    ? 'Published data changed since your local edits — export or restore'
    : local ? 'Unpublished changes saved in this browser' : 'No local changes — showing published data';
  bar.innerHTML = `
    <div class="admin-bar-status">
      <strong><span class="admin-dot" aria-hidden="true"></span>Edit mode</strong>
      <span class="admin-bar-note ${newer ? 'is-warning' : ''}">${esc(note)}</span>
    </div>
    <div class="admin-bar-actions">
      ${toolbarButton('add-menu', 'plus', 'Add', 'is-primary')}
      ${toolbarButton('profile', 'user', 'Profile')}
      ${toolbarButton('sections', 'sliders', 'Sections')}
      ${toolbarButton('resume', 'file', 'Resume')}
      <span class="admin-sep" aria-hidden="true"></span>
      ${toolbarButton('export', 'download', 'Export')}
      ${toolbarButton('import', 'upload', 'Import')}
      ${toolbarButton('reset', 'refresh', 'Restore', 'is-danger')}
      <span class="admin-sep" aria-hidden="true"></span>
      ${toolbarButton('help', 'help', 'Help')}
      ${toolbarButton('exit', 'log-out', 'Exit')}
    </div>`;
}

export function initAdmin({ onToggle }) {
  rerender = onToggle;

  const params = new URLSearchParams(window.location.search);
  if (params.has('edit')) {
    setEditMode(!['0', 'off', 'false'].includes(params.get('edit')));
    params.delete('edit');
    const query = params.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`);
  } else {
    editMode = storage.getEditMode();
  }

  document.addEventListener('keydown', (event) => {
    if (event.altKey && event.shiftKey && event.code === 'KeyE') {
      event.preventDefault();
      setEditMode(!editMode);
      rerender();
      toast(editMode ? 'Edit mode on. Changes are saved in this browser only.' : 'Edit mode off.', 'info');
    }
  });
  document.addEventListener('click', onClick);
  document.addEventListener('submit', onSkillAdd);
  $('#import-input')?.addEventListener('change', onImportFile);

  if (editMode && !storage.isAvailable()) {
    toast('Browser storage is unavailable (private mode or blocked), so edits cannot be saved.', 'error', 8000);
  }
}
