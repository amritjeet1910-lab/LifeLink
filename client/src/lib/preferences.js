export const THEME_KEY = "lifelink_theme";
export const PREFS_EVENT = "lifelink:preferences";

export function readStoredTheme() {
  try {
    return localStorage.getItem(THEME_KEY) || "light";
  } catch {
    return "light";
  }
}

export function writeTheme(theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // ignore storage errors
  }
  window.dispatchEvent(new CustomEvent(PREFS_EVENT, { detail: { theme } }));
}

export function applyAccessibilitySettings(settings = {}) {
  const root = document.documentElement;
  root.toggleAttribute("data-reduced-motion", Boolean(settings.reducedMotion));
  root.toggleAttribute("data-high-contrast", Boolean(settings.highContrast));
  root.toggleAttribute("data-large-text", Boolean(settings.largerText));
}
