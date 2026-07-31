// theme.ts — hand-written facade over the Auto-generated theme store
// composable (auto/src/front/theme_store.at → stores/auto/useThemeStore.ts).
//
// Plan 011 Phase 5.1 (Pinia → Auto store migration): the Pinia defineStore
// was replaced by this facade, which keeps the original store API shape
// so all consumers stay unchanged.
//
// What the DSL cannot express stays here / in the ext module: the initial
// values come from localStorage / prefers-color-scheme (ext), and the
// apply-on-change watch (original Pinia `watch([mode, accent], ...)`) is
// registered below at module level with the same semantics.
import { watch } from 'vue'
import { useThemeStore as useGeneratedThemeStore } from './auto/useThemeStore'
import {
  applyThemeClasses,
  getInitialThemeAccent,
  getInitialThemeMode,
  persistTheme,
  type ThemeAccent,
  type ThemeMode,
} from '../../auto/src/front/utils/theme_store_ext'

export type { ThemeAccent, ThemeMode }

const g = useGeneratedThemeStore()

// Real initial values (the .at model only carries placeholders).
g.mode.value = getInitialThemeMode()
g.accent.value = getInitialThemeAccent()

// Original: watch([mode, accent], () => { apply(); localStorage... }).
watch([g.mode, g.accent], () => {
  applyThemeClasses(g.mode.value, g.accent.value)
  persistTheme(g.mode.value, g.accent.value)
})

export function useThemeStore() {
  return {
    get mode(): ThemeMode {
      return g.mode.value
    },
    set mode(v: ThemeMode) {
      g.mode.value = v
    },
    get accent(): ThemeAccent {
      return g.accent.value
    },
    set accent(v: ThemeAccent) {
      g.accent.value = v
    },
    apply: (): void => applyThemeClasses(g.mode.value, g.accent.value),
    setMode: (next: ThemeMode): void => g.SetMode(next),
    setAccent: (next: ThemeAccent): void => g.SetAccent(next),
    toggleMode: (): void => g.ToggleMode(),
  }
}
