/**
 * Thin wrapper around localStorage.
 *
 * Everything saved here lives only in the current browser profile on the
 * current device. It is never sent anywhere and is not visible to visitors.
 */

const PREFIX = 'mp-portfolio:';
const KEYS = {
  data: 'data',
  meta: 'meta',
  edit: 'edit-mode',
  theme: 'theme',
};

export class StorageFullError extends Error {
  constructor() {
    super('Browser storage is full. Use smaller files, or put large files in the assets/ folder and reference them by path.');
    this.name = 'StorageFullError';
  }
}

function isQuotaError(err) {
  return Boolean(err) && (
    err.name === 'QuotaExceededError' ||
    err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    err.code === 22 ||
    err.code === 1014
  );
}

function read(key) {
  try {
    return localStorage.getItem(PREFIX + key);
  } catch {
    return null;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(PREFIX + key, value);
  } catch (err) {
    if (isQuotaError(err)) throw new StorageFullError();
    throw err;
  }
}

function remove(key) {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    /* ignore */
  }
}

function readJSON(key) {
  const raw = read(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export const storage = {
  isAvailable() {
    try {
      const probe = `${PREFIX}probe`;
      localStorage.setItem(probe, '1');
      localStorage.removeItem(probe);
      return true;
    } catch {
      return false;
    }
  },

  loadData() {
    return readJSON(KEYS.data);
  },

  loadMeta() {
    return readJSON(KEYS.meta);
  },

  /** Saves the full portfolio. Throws StorageFullError when the quota is exceeded. */
  saveData(data, meta) {
    write(KEYS.data, JSON.stringify(data));
    write(KEYS.meta, JSON.stringify(meta));
  },

  clearData() {
    remove(KEYS.data);
    remove(KEYS.meta);
  },

  getEditMode() {
    return read(KEYS.edit) === '1';
  },

  setEditMode(enabled) {
    if (enabled) {
      try { write(KEYS.edit, '1'); } catch { /* non-critical */ }
    } else {
      remove(KEYS.edit);
    }
  },

  getTheme() {
    return read(KEYS.theme);
  },

  setTheme(theme) {
    try { write(KEYS.theme, theme); } catch { /* non-critical */ }
  },

  /** Approximate bytes used by this site's keys (UTF-16 => 2 bytes per char). */
  usageBytes() {
    let total = 0;
    try {
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (key && key.startsWith(PREFIX)) {
          total += (key.length + (localStorage.getItem(key) || '').length) * 2;
        }
      }
    } catch {
      return 0;
    }
    return total;
  },
};
