// workspace_store_ext.ts — hand-written TS extension for workspace_store.at.
//
// The store codegen emits every external function as an import from
// '@/lib/api'; the Regenerate flow sed-rewrites that import to THIS module
// when copying the composable into front/src/stores/auto/.
//
// Only what the DSL genuinely cannot express lives here: try/catch around
// the workspace api. The wrappers never reject; they return
// { root, wiki_dir, error } where error == "" means success, mirroring the
// original catch branches. (The original open() re-threw after setting
// error — the facade replicates that by throwing when error is non-empty.)
import { getWorkspace, openWorkspace } from '../../../../src/lib/api'

export interface WorkspaceOpResult {
  root: string | null
  wiki_dir: string | null
  error: string
}

export async function getWorkspaceResult(): Promise<WorkspaceOpResult> {
  try {
    const info = await getWorkspace()
    return { root: info.root, wiki_dir: info.wiki_dir, error: '' }
  } catch (e: any) {
    return { root: null, wiki_dir: null, error: e.message || String(e) }
  }
}

export async function openWorkspaceResult(path: string): Promise<WorkspaceOpResult> {
  try {
    const info = await openWorkspace(path)
    return { root: info.root, wiki_dir: info.wiki_dir, error: '' }
  } catch (e: any) {
    return { root: null, wiki_dir: null, error: e.message || String(e) }
  }
}
