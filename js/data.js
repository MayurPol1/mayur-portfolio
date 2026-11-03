/**
 * Portfolio data store.
 *
 * Source of truth for visitors: data/portfolio.json (deployed with the site).
 * In Edit Mode, changes are saved to localStorage in *this browser only* and
 * override the JSON file here. Export the data and replace data/portfolio.json
 * to publish changes for everyone.
 */

import { storage } from './storage.js';
import { asArray, deepClone, isObject, uid } from './utils.js';

const SOURCE_URL = 'data/portfolio.json';

export const COLLECTIONS = ['experience', 'projects', 'skills', 'education', 'certifications', 'achievements'];

export const SECTION_DEFAULTS = [
  { id: 'about', label: 'About', title: 'About Me', subtitle: '' },
  { id: 'experience', label: 'Experience', title: 'Work Experience', subtitle: '' },
  { id: 'projects', label: 'Projects', title: 'Projects', subtitle: '' },
  { id: 'skills', label: 'Skills', title: 'Technical Skills', subtitle: '' },
  { id: 'education', label: 'Education', title: 'Education', subtitle: '' },
  { id: 'certifications', label: 'Certifications', title: 'Certifications', subtitle: '' },
  { id: 'achievements', label: 'Highlights', title: 'Achievements', subtitle: '' },
  { id: 'contact', label: 'Contact', title: 'Contact', subtitle: '' },
];

const PROFILE_DEFAULTS = {
  name: '',
  fullName: '',
  title: '',
  tagline: '',
  headline: '',
  intro: '',
  availability: '',
  contactIntro: '',
  location: '',
  email: '',
  phone: '',
  linkedin: '',
  github: '',
  photo: '',
  photoAlt: '',
  resume: '',
  resumeFileName: 'Resume.pdf',
  careerStart: '',
  experienceOverride: '',
  heroSkills: [],
  stats: [],
  about: { summary: [], expertise: [], interests: [] },
};

let defaults = null;
let state = null;
let sourceStamp = '';
const listeners = new Set();

/* ---------- Loading & normalisation ---------- */

function hash(text) {
  let h = 5381;
  for (let i = 0; i < text.length; i += 1) h = ((h << 5) + h + text.charCodeAt(i)) >>> 0;
  return h.toString(16);
}

function normalizeSections(input) {
  const known = new Map(SECTION_DEFAULTS.map((s) => [s.id, s]));
  const seen = new Set();
  const out = [];
  asArray(input).forEach((section) => {
    if (!isObject(section) || !known.has(section.id) || seen.has(section.id)) return;
    seen.add(section.id);
    out.push({ ...known.get(section.id), ...section, visible: section.visible !== false });
  });
  SECTION_DEFAULTS.forEach((section) => {
    if (!seen.has(section.id)) out.push({ ...section, visible: true });
  });
  return out;
}

function normalizeSkills(categories) {
  return categories.map((cat) => ({
    ...cat,
    category: cat.category || 'Skills',
    icon: cat.icon || 'code',
    items: asArray(cat.items)
      .map((item) => (typeof item === 'string' ? { name: item, core: false } : item))
      .filter((item) => isObject(item) && item.name)
      .map((item) => ({ name: String(item.name), core: Boolean(item.core) })),
  }));
}

export function normalize(input) {
  const data = isObject(input) ? input : {};
  const profileIn = isObject(data.profile) ? data.profile : {};
  const out = {
    version: 1,
    profile: {
      ...deepClone(PROFILE_DEFAULTS),
      ...profileIn,
      heroSkills: asArray(profileIn.heroSkills),
      stats: asArray(profileIn.stats).filter(isObject),
      about: { ...deepClone(PROFILE_DEFAULTS.about), ...(isObject(profileIn.about) ? profileIn.about : {}) },
    },
    sections: normalizeSections(data.sections),
  };
  COLLECTIONS.forEach((key) => {
    const prefix = key.slice(0, 4);
    out[key] = asArray(data[key])
      .filter(isObject)
      .map((item) => ({ ...item, id: item.id ? String(item.id) : uid(prefix) }));
  });
  out.skills = normalizeSkills(out.skills);
  return out;
}

/** Validates an imported object; returns a list of human-readable problems. */
export function validatePortfolio(input) {
  const problems = [];
  if (!isObject(input)) return ['The file does not contain a JSON object.'];
  if (!isObject(input.profile)) problems.push('Missing "profile" object.');
  COLLECTIONS.forEach((key) => {
    if (key in input && !Array.isArray(input[key])) problems.push(`"${key}" must be an array.`);
  });
  if ('sections' in input && !Array.isArray(input.sections)) problems.push('"sections" must be an array.');
  return problems;
}

export async function loadPortfolio() {
  const response = await fetch(SOURCE_URL, { cache: 'no-cache' });
  if (!response.ok) throw new Error(`Could not load ${SOURCE_URL} (HTTP ${response.status}).`);
  const text = await response.text();
  defaults = normalize(JSON.parse(text));
  sourceStamp = hash(text);
  const local = storage.loadData();
  state = local ? normalize(local) : deepClone(defaults);
  return state;
}

/* ---------- Reading ---------- */

export function getState() {
  return state;
}

export function hasLocalChanges() {
  return storage.loadData() !== null;
}

/** True when the deployed JSON changed after local edits were made in this browser. */
export function isSourceNewer() {
  const meta = storage.loadMeta();
  return Boolean(meta && meta.sourceStamp && meta.sourceStamp !== sourceStamp);
}

export function findItem(collection, id) {
  return asArray(state[collection]).find((item) => item.id === id) || null;
}

export function exportJSON() {
  return JSON.stringify(state, null, 2);
}

/* ---------- Writing ---------- */

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emit() {
  listeners.forEach((listener) => listener(state));
}

function persist() {
  storage.saveData(state, { sourceStamp, savedAt: new Date().toISOString() });
}

/**
 * Applies a mutation, persists it, and notifies listeners.
 * If saving fails (e.g. storage quota), the change is rolled back and the error rethrown.
 */
export function update(mutator) {
  const snapshot = deepClone(state);
  mutator(state);
  try {
    persist();
  } catch (err) {
    state = snapshot;
    throw err;
  }
  emit();
}

export function upsertItem(collection, item) {
  update((s) => {
    const index = s[collection].findIndex((existing) => existing.id === item.id);
    if (index >= 0) s[collection][index] = item;
    else s[collection].push(item);
  });
}

export function removeItem(collection, id) {
  update((s) => {
    s[collection] = s[collection].filter((item) => item.id !== id);
  });
}

/**
 * Moves an item one step relative to its visible neighbours (`peerIds`), so
 * reordering inside a filtered list behaves as the user expects.
 */
export function moveItem(collection, id, delta, peerIds) {
  const list = state[collection];
  const peers = peerIds && peerIds.length ? peerIds : list.map((item) => item.id);
  const peerIndex = peers.indexOf(id);
  const targetId = peers[peerIndex + delta];
  if (peerIndex < 0 || !targetId) return false;
  update((s) => {
    const items = s[collection];
    const a = items.findIndex((item) => item.id === id);
    const b = items.findIndex((item) => item.id === targetId);
    [items[a], items[b]] = [items[b], items[a]];
  });
  return true;
}

export function replaceAll(data) {
  const previous = state;
  state = normalize(data);
  try {
    persist();
  } catch (err) {
    state = previous;
    throw err;
  }
  emit();
}

export function resetToDefaults() {
  storage.clearData();
  state = deepClone(defaults);
  emit();
}
