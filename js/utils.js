/** Small, dependency-free helpers shared by every module. */

export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Escapes text for safe insertion into HTML and attribute values. */
export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch]);
}

export function uid(prefix = 'id') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function deepClone(value) {
  return typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}

export function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function asArray(value) {
  return Array.isArray(value) ? value : [];
}

export function getPath(obj, path) {
  return path.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

export function setPath(obj, path, value) {
  const keys = path.split('.');
  let target = obj;
  keys.slice(0, -1).forEach((key) => {
    if (!isObject(target[key])) target[key] = {};
    target = target[key];
  });
  target[keys[keys.length - 1]] = value;
}

/* ---------- URLs ---------- */

const SAFE_DATA_URL = /^data:(image\/(png|jpe?g|gif|webp|svg\+xml|avif)|application\/pdf)[;,]/i;

/** Allows http(s), mailto, tel, relative paths, blob: and image/PDF data URLs. Blocks javascript: and friends. */
export function safeUrl(url) {
  const value = String(url ?? '').trim();
  if (!value) return '';
  if (/^(https?:|mailto:|tel:|blob:)/i.test(value)) return value;
  if (SAFE_DATA_URL.test(value)) return value;
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return '';
  return value;
}

export function isValidHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function displayUrl(url) {
  return String(url || '').replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '');
}

export function isDataUrl(value) {
  return /^data:/i.test(String(value || ''));
}

export function isPdf(value, typeHint = '') {
  return /pdf/i.test(typeHint) || /^data:application\/pdf/i.test(value) || /\.pdf($|[?#])/i.test(value);
}

const blobCache = new Map();

/** Converts a data: URL into a cached blob: URL (no fetch, so it works under a strict CSP). */
export function dataUrlToObjectUrl(dataUrl) {
  if (!isDataUrl(dataUrl)) return dataUrl;
  if (blobCache.has(dataUrl)) return blobCache.get(dataUrl);
  const [header, payload] = dataUrl.split(',');
  const mime = (header.match(/^data:([^;,]+)/) || [])[1] || 'application/octet-stream';
  const isBase64 = /;base64/i.test(header);
  const binary = isBase64 ? atob(payload) : decodeURIComponent(payload);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  const objectUrl = URL.createObjectURL(new Blob([bytes], { type: mime }));
  blobCache.set(dataUrl, objectUrl);
  return objectUrl;
}

/* ---------- Dates & durations ---------- */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Parses "YYYY-MM" (or "YYYY") into { year, month } with month 0-11. */
export function parseMonth(value) {
  const match = String(value || '').match(/^(\d{4})(?:-(\d{1,2}))?/);
  if (!match) return null;
  return { year: Number(match[1]), month: match[2] ? Number(match[2]) - 1 : 0 };
}

export function formatMonth(value) {
  const parsed = parseMonth(value);
  if (!parsed) return String(value || '');
  return /^\d{4}-\d{1,2}/.test(value) ? `${MONTHS[parsed.month]} ${parsed.year}` : String(parsed.year);
}

function monthIndex(parsed) {
  return parsed.year * 12 + parsed.month;
}

function nowParsed() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
}

/** Inclusive month count, LinkedIn style: May 2024 – Jun 2025 = 14 months. */
export function monthsInclusive(start, end) {
  const from = parseMonth(start);
  if (!from) return 0;
  const to = parseMonth(end) || nowParsed();
  return Math.max(0, monthIndex(to) - monthIndex(from) + 1);
}

export function formatDuration(months) {
  if (!months) return '';
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const parts = [];
  if (years) parts.push(`${years} yr${years > 1 ? 's' : ''}`);
  if (rest) parts.push(`${rest} mo${rest > 1 ? 's' : ''}`);
  return parts.join(' ');
}

/**
 * Total professional experience as a display string, rounded down to the
 * nearest half year: 30 months -> "2.5+". Uses profile.experienceOverride when set.
 */
export function experienceYears(profile, experience) {
  if (profile.experienceOverride) return String(profile.experienceOverride);
  const starts = asArray(experience)
    .filter((item) => item.visible !== false && parseMonth(item.start))
    .map((item) => item.start)
    .sort();
  const start = parseMonth(profile.careerStart) ? profile.careerStart : starts[0];
  const from = parseMonth(start);
  if (!from) return '';
  const months = Math.max(0, monthIndex(nowParsed()) - monthIndex(from));
  if (months < 12) return `${Math.max(months, 1)} mo`;
  const halfYears = Math.floor(months / 6) / 2;
  return `${Number.isInteger(halfYears) ? halfYears : halfYears.toFixed(1)}+`;
}

/** Replaces {years}, {companies} and {projects} tokens in content strings. */
export function fillTokens(text, tokens) {
  return String(text ?? '').replace(/\{(\w+)\}/g, (match, key) => (key in tokens ? tokens[key] : match));
}

/* ---------- Text helpers ---------- */

export function linesToArray(text) {
  return String(text || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

export function paragraphsToArray(text) {
  return String(text || '').split(/\r?\n\s*\r?\n/).map((p) => p.replace(/\s*\r?\n\s*/g, ' ').trim()).filter(Boolean);
}

export function tagsToArray(text) {
  return String(text || '').split(',').map((tag) => tag.trim()).filter(Boolean);
}

export function initials(name) {
  return String(name || '')
    .split(/[\s/–—-]+/)
    .filter((word) => /^[A-Za-z0-9]/.test(word))
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('');
}

export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/** Approximate decoded size of a data: URL in bytes. */
export function dataUrlBytes(dataUrl) {
  const payload = String(dataUrl).split(',')[1] || '';
  return Math.round((payload.length * 3) / 4);
}

/* ---------- Files ---------- */

export function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error('Could not read file.'));
    reader.readAsDataURL(file);
  });
}

export function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error('Could not read file.'));
    reader.readAsText(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('The selected file is not a readable image.'));
    img.src = src;
  });
}

let webpSupport = null;
function canEncodeWebp() {
  if (webpSupport === null) {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    webpSupport = canvas.toDataURL('image/webp').startsWith('data:image/webp');
  }
  return webpSupport;
}

/**
 * Downscales an uploaded image so it fits comfortably in localStorage.
 * SVG and GIF files are kept as-is (re-encoding would break them).
 */
export async function compressImage(file, { maxSize = 1600, quality = 0.82 } = {}) {
  const original = await readFileAsDataURL(file);
  if (/image\/(svg\+xml|gif)/i.test(file.type)) return original;
  const img = await loadImage(original);
  const scale = Math.min(1, maxSize / Math.max(img.naturalWidth, img.naturalHeight));
  const width = Math.max(1, Math.round(img.naturalWidth * scale));
  const height = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const webp = canEncodeWebp();
  if (!webp) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
  }
  ctx.drawImage(img, 0, 0, width, height);
  const compressed = canvas.toDataURL(webp ? 'image/webp' : 'image/jpeg', quality);
  return compressed.length < original.length ? compressed : original;
}

export function downloadFile(filename, content, mime = 'application/json') {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const IDENTITY_KEYS = ['admin', 'collection', 'id', 'delta', 'index', 'filter', 'projectOpen', 'certView'];

/**
 * Finds the element that replaced `el` after a re-render, matched by its data-* identity
 * attributes. Used to keep keyboard focus stable when lists are redrawn.
 */
export function equivalentElement(el) {
  if (!el || !el.dataset) return null;
  if (document.contains(el)) return el;
  const keys = IDENTITY_KEYS.filter((key) => el.dataset[key] !== undefined);
  if (!keys.length) return null;
  const selector = keys
    .map((key) => `[data-${key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}="${CSS.escape(el.dataset[key])}"]`)
    .join('');
  return document.querySelector(selector);
}

export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
