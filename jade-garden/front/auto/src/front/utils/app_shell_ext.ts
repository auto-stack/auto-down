// app_shell_ext.ts — hand-written TS extension for app_shell.at.
//
// Only what the DSL genuinely cannot express lives here:
// - the store facade re-exports (dual-resolution shims),
// - the child component re-exports (MainArea / QuickSwitcher /
//   CommandPalette / FlashcardModal are not yet Auto-translated; Ribbon /
//   LeftSidebar / RightSidebar / StatusBar / WorkspaceOpener are generated
//   SFCs — all imported through this module so the gen project type-checks
//   against its stubs),
// - initAppShell: the original onMounted's async boot sequence (the DSL has
//   no async handlers),
// - listenOpenFlashcards / unlistenOpenFlashcards: the window-level
//   'jade-open-flashcards' listener with the handler identity kept for
//   removal (the DSL's on "evt".window view syntax is element-scoped),
// - hasWorkspaceRoot / noWorkspaceRoot: typed boolean predicates for the
//   v-if computeds (a bare dot-ref / negated Call body would be mis-typed
//   by the computed name heuristic — README gap 28).
//
// Relative imports: this file is shared verbatim between trees; the paths
// below resolve to front/src/... in the jade-garden front tree.
import { useWorkspaceStore } from '../../../../src/stores/workspace'
import { useFileTreeStore } from '../../../../src/stores/fileTree'
import { useThemeStore } from '../../../../src/stores/theme'
import Ribbon from '../../../../src/components/Ribbon.vue'
import LeftSidebar from '../../../../src/components/LeftSidebar.vue'
import MainArea from '../../../../src/components/MainArea.vue'
import RightSidebar from '../../../../src/components/RightSidebar.vue'
import StatusBar from '../../../../src/components/StatusBar.vue'
import QuickSwitcher from '../../../../src/components/QuickSwitcher.vue'
import CommandPalette from '../../../../src/components/CommandPalette.vue'
import FlashcardModal from '../../../../src/components/FlashcardModal.vue'
import WorkspaceOpener from '../../../../src/components/WorkspaceOpener.vue'

export {
  useWorkspaceStore,
  useFileTreeStore,
  useThemeStore,
  Ribbon,
  LeftSidebar,
  MainArea,
  RightSidebar,
  StatusBar,
  QuickSwitcher,
  CommandPalette,
  FlashcardModal,
  WorkspaceOpener,
}

/** Original onMounted boot: theme.apply(); await workspace.load();
 *  if (workspace.root) await fileTree.load(). The caller does not await —
 *  same floating-promise semantics as the original onMounted. */
export async function initAppShell(
  workspace: { load: () => Promise<void>; root: string | null },
  fileTree: { load: () => Promise<void> },
  theme: { apply: () => void },
): Promise<void> {
  theme.apply()
  await workspace.load()
  if (workspace.root) {
    await fileTree.load()
  }
}

// The original keeps one module-level handler (openFlashcards) so
// removeEventListener detaches the same function; AppShell is a singleton.
let flashcardsHandler: (() => void) | null = null

/** Original: window.addEventListener('jade-open-flashcards', openFlashcards). */
export function listenOpenFlashcards(cb: () => void): void {
  flashcardsHandler = cb
  window.addEventListener('jade-open-flashcards', cb)
}

/** Original onUnmounted: window.removeEventListener('jade-open-flashcards',
 *  openFlashcards). */
export function unlistenOpenFlashcards(): void {
  if (flashcardsHandler) {
    window.removeEventListener('jade-open-flashcards', flashcardsHandler)
    flashcardsHandler = null
  }
}

/** Original: v-if="!workspace.root" guard parts. */
export function hasWorkspaceRoot(workspace: { root: string | null }): boolean {
  return !!workspace.root
}

export function noWorkspaceRoot(workspace: { root: string | null }): boolean {
  return !workspace.root
}
