// theme_store_ext.ts — hand-written TS extension for theme_store.at.
//
// Only what the DSL genuinely cannot express lives here: localStorage /
// matchMedia initial values and the document.documentElement classList +
// persistence side effects (the original Pinia store's apply() and watch
// body). Imported directly by the facade front/src/stores/theme.ts (the
// generated composable never references this module).

export type ThemeMode = 'light' | 'dark'
export type ThemeAccent = 'indigo' | 'emerald' | 'rose' | 'amber' | 'slate'

const THEME_MODE_KEY = 'jade-garden-theme-mode'
const THEME_ACCENT_KEY = 'jade-garden-theme-accent'

/** The original getInitialMode(), verbatim. */
export function getInitialThemeMode(): ThemeMode {
  if (typeof window === 'undefined') return 'light'
  const stored = localStorage.getItem(THEME_MODE_KEY) as ThemeMode | null
  if (stored === 'dark' || stored === 'light') return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/** The original getInitialAccent(), verbatim. */
export function getInitialThemeAccent(): ThemeAccent {
  if (typeof window === 'undefined') return 'indigo'
  const stored = localStorage.getItem(THEME_ACCENT_KEY) as ThemeAccent | null
  const valid: ThemeAccent[] = ['indigo', 'emerald', 'rose', 'amber', 'slate']
  return valid.includes(stored as ThemeAccent) ? (stored as ThemeAccent) : 'indigo'
}

/** The original apply(), verbatim: classList only, no persistence. */
export function applyThemeClasses(mode: ThemeMode, accent: ThemeAccent): void {
  const root = document.documentElement
  if (mode === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }

  // Remove old accent classes
  root.classList.remove('theme-indigo', 'theme-emerald', 'theme-rose', 'theme-amber', 'theme-slate')
  root.classList.add(`theme-${accent}`)
}

/** The original watch body's localStorage writes, verbatim. */
export function persistTheme(mode: ThemeMode, accent: ThemeAccent): void {
  localStorage.setItem(THEME_MODE_KEY, mode)
  localStorage.setItem(THEME_ACCENT_KEY, accent)
}
