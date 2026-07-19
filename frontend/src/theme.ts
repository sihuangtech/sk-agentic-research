const THEME_STORAGE_KEY = 'agentic-research.theme';
const THEME_PREFERENCES = new Set(['system', 'light', 'dark']);

const systemPrefersDark = () => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;

export function getThemePreference() {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    return THEME_PREFERENCES.has(saved) ? saved : 'system';
  } catch {
    return 'system';
  }
}

export function resolvedTheme(preference = getThemePreference()) {
  return preference === 'system' ? (systemPrefersDark() ? 'dark' : 'light') : preference;
}

export function applyTheme(preference = getThemePreference()) {
  const theme = resolvedTheme(preference);
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  return theme;
}

export function setThemePreference(preference) {
  const next = THEME_PREFERENCES.has(preference) ? preference : 'system';
  try {
    localStorage.setItem(THEME_STORAGE_KEY, next);
  } catch {
    // The choice still applies for the current session when storage is unavailable.
  }
  applyTheme(next);
  return next;
}

export function initializeTheme() {
  applyTheme();
  const media = window.matchMedia?.('(prefers-color-scheme: dark)');
  const updateSystemTheme = () => {
    if (getThemePreference() === 'system') applyTheme('system');
  };
  media?.addEventListener?.('change', updateSystemTheme);
}
