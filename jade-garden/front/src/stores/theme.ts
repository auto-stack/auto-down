import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export type ThemeMode = 'light' | 'dark'
export type ThemeAccent = 'indigo' | 'emerald' | 'rose' | 'amber' | 'slate'

const THEME_MODE_KEY = 'jade-garden-theme-mode'
const THEME_ACCENT_KEY = 'jade-garden-theme-accent'

function getInitialMode(): ThemeMode {
  if (typeof window === 'undefined') return 'light'
  const stored = localStorage.getItem(THEME_MODE_KEY) as ThemeMode | null
  if (stored === 'dark' || stored === 'light') return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function getInitialAccent(): ThemeAccent {
  if (typeof window === 'undefined') return 'indigo'
  const stored = localStorage.getItem(THEME_ACCENT_KEY) as ThemeAccent | null
  const valid: ThemeAccent[] = ['indigo', 'emerald', 'rose', 'amber', 'slate']
  return valid.includes(stored as ThemeAccent) ? (stored as ThemeAccent) : 'indigo'
}

export const useThemeStore = defineStore('theme', () => {
  const mode = ref<ThemeMode>(getInitialMode())
  const accent = ref<ThemeAccent>(getInitialAccent())

  function apply() {
    const root = document.documentElement
    if (mode.value === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }

    // Remove old accent classes
    root.classList.remove('theme-indigo', 'theme-emerald', 'theme-rose', 'theme-amber', 'theme-slate')
    root.classList.add(`theme-${accent.value}`)
  }

  function setMode(next: ThemeMode) {
    mode.value = next
  }

  function setAccent(next: ThemeAccent) {
    accent.value = next
  }

  function toggleMode() {
    mode.value = mode.value === 'dark' ? 'light' : 'dark'
  }

  watch([mode, accent], () => {
    apply()
    localStorage.setItem(THEME_MODE_KEY, mode.value)
    localStorage.setItem(THEME_ACCENT_KEY, accent.value)
  })

  return { mode, accent, apply, setMode, setAccent, toggleMode }
})
