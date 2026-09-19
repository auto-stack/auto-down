// workspace_opener_ext.ts — hand-written TS extension for workspace_opener.at.
//
// Only what the DSL genuinely cannot express lives here:
// - the store facade re-exports (dual-resolution shims),
// - the lucide icon re-exports (rendered via `dyn`),
// - WorkspaceLogo: the original's inline SVG brand mark as a functional
//   component (the DSL has no svg element),
// - clearWorkspaceError: the facade write shape (not a DSL lvalue),
// - chooseWorkspaceDir: window.showDirectoryPicker + try/catch + the
//   template-ref focus/select fallback (the DSL has no DOM APIs or template
//   refs; the input is located by its stable placeholder attribute).
//
// PLAN-077 T-04 sink: openWorkspaceFlow (orchestration) moved into the .at
// .Open handler as an explicit promise chain, and workspaceErrorText into
// the workspace_error_text module fn (mode doc §6.4, Q-1 ruling).
//
// Relative imports: this file is shared verbatim between trees; the paths
// below resolve to front/src/... in the jade-garden front tree.
import { h } from 'vue'
import { FolderOpen, Info } from 'lucide-vue-next'
import { useWorkspaceStore } from '../../../../src/stores/workspace'
import { useFileTreeStore } from '../../../../src/stores/fileTree'

export { useWorkspaceStore, useFileTreeStore, FolderOpen, Info }

/** Original: the inline layers-style SVG logo in WorkspaceOpener.vue's
 *  header (verbatim markup via innerHTML — SVG innerHTML parses as SVG in
 *  all supported browsers). */
export const WorkspaceLogo = () =>
  h('svg', {
    xmlns: 'http://www.w3.org/2000/svg',
    width: 28,
    height: 28,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': 2,
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    innerHTML:
      '<path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>',
  })

/** Original: `workspace.error = null` at the top of open(). */
export function clearWorkspaceError(workspace: { error: string | null }): void {
  workspace.error = null
}

/** Original: async function chooseDirectory() — showDirectoryPicker with a
 *  focus+select fallback when the API is missing, and a swallowed catch for
 *  the user-cancelled case. The DSL has no template refs, so the input is
 *  located by its stable placeholder attribute. */
export async function chooseWorkspaceDir(setPath: (name: string) => void): Promise<void> {
  const input = document.querySelector<HTMLInputElement>(
    'input[placeholder^="粘贴完整目录路径"]',
  )
  const showDirectoryPicker = (window as any).showDirectoryPicker as
    | (() => Promise<{ name: string }>)
    | undefined

  if (!showDirectoryPicker) {
    input?.focus()
    input?.select()
    return
  }

  try {
    const handle = await showDirectoryPicker()
    setPath(handle.name)
    input?.focus()
  } catch {
    // User cancelled the picker.
  }
}
