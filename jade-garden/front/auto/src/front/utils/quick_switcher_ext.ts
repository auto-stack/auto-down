// quick_switcher_ext.ts — hand-written TS extension for quick_switcher.at.
//
// Only what the DSL genuinely cannot express lives here:
// - the store facade re-exports (dual-resolution shims),
// - the lucide icon re-export (rendered via `dyn`),
// - collectFiles (the recursive file-tree walk) and filterFiles (the
//   trim/lowercase includes/slice(0, 12) filter; also carries the per-row
//   idx display field so the view needs no indexed v-for — its auto-:key
//   emits idx?.id on a number loop var),
// - nextIndex / prevIndex (the wrap-around modulo),
// - listenSwitcherHotkeys / unlistenSwitcherHotkeys (the onKeyStroke('o')
//   Ctrl/Cmd+O open — always SETS open=true, no toggle, no alt/shift
//   guard — the onKeyStroke('Escape') close, and the
//   'jade-open-quick-switcher' window event; window-level keydown with the
//   handler identities kept for removal; app_shell precedent),
// - focusSwitcherInput (watch(open)'s await nextTick + inputRef.focus() —
//   no template refs in the DSL; the singleton input is located by its
//   placeholder).
//
// Relative imports: this file is shared verbatim between trees; the paths
// below resolve to front/src/... in the jade-garden front tree.
import { nextTick } from 'vue'
import { Search } from 'lucide-vue-next'
import { useFileTreeStore } from '../../../../src/stores/fileTree'
import { useTabsStore } from '../../../../src/stores/tabs'

export { useFileTreeStore, useTabsStore, Search }

export interface SwitcherFile {
  path: string
  name: string
  idx?: number
}

/** Original collectFiles recursion. */
export function collectFiles(nodes: any[], items: SwitcherFile[] = []): SwitcherFile[] {
  for (const n of nodes ?? []) {
    if (n.is_dir && n.children) {
      collectFiles(n.children, items)
    } else if (!n.is_dir) {
      items.push({ path: n.path, name: n.name })
    }
  }
  return items
}

/** Original: the filtered computed (name-or-path includes, slice(0, 12)),
 *  plus the per-row idx display field (selected-class ternary +
 *  mouseenter). */
export function filterFiles(files: SwitcherFile[], query: string): SwitcherFile[] {
  const q = query.trim().toLowerCase()
  const base = !q
    ? files ?? []
    : (files ?? []).filter(
        (f) => f.name.toLowerCase().includes(q) || f.path.toLowerCase().includes(q),
      )
  return base.slice(0, 12).map((f, idx) => ({ ...f, idx }))
}

/** Original: (selectedIndex + 1) % filtered.length. */
export function nextIndex(i: number, len: number): number {
  return (i + 1) % len
}

/** Original: (selectedIndex - 1 + filtered.length) % filtered.length. */
export function prevIndex(i: number, len: number): number {
  return (i - 1 + len) % len
}

// The original registers the hotkeys via onKeyStroke (lifecycle-scoped) and
// the external event via onMounted/onUnmounted; the switcher is a singleton,
// so module-level handler identities suffice (app_shell precedent).
let switcherKeyHandler: ((e: KeyboardEvent) => void) | null = null
let switcherOpenHandler: (() => void) | null = null

/** Original: onKeyStroke('o', e => { if (e.ctrlKey || e.metaKey) {
 *  e.preventDefault(); open = true } }), onKeyStroke('Escape', () => open =
 *  false), and window.addEventListener('jade-open-quick-switcher',
 *  onExternalOpen). */
export function listenSwitcherHotkeys(onOpen: () => void, onClose: () => void): void {
  switcherKeyHandler = (e: KeyboardEvent) => {
    if (e.key === 'o' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      onOpen()
    }
    if (e.key === 'Escape') {
      onClose()
    }
  }
  switcherOpenHandler = onOpen
  window.addEventListener('keydown', switcherKeyHandler)
  window.addEventListener('jade-open-quick-switcher', switcherOpenHandler)
}

/** Original onUnmounted / the vueuse listener stops. */
export function unlistenSwitcherHotkeys(): void {
  if (switcherKeyHandler) {
    window.removeEventListener('keydown', switcherKeyHandler)
    switcherKeyHandler = null
  }
  if (switcherOpenHandler) {
    window.removeEventListener('jade-open-quick-switcher', switcherOpenHandler)
    switcherOpenHandler = null
  }
}

/** Original watch(open): await nextTick(); inputRef.value?.focus(). The DSL
 *  has no template refs — the switcher is a singleton, so the input is
 *  located by its unique placeholder (the same element). */
export function focusSwitcherInput(): void {
  nextTick(() => {
    const el = document.querySelector<HTMLInputElement>('input[placeholder="Search files..."]')
    el?.focus()
  })
}
