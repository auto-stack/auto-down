// recentFiles_store_ext.ts — hand-written TS extension for
// recentFiles_store.at.
//
// The store codegen emits every external function as an import from
// '@/lib/api'; the Regenerate flow sed-rewrites that import to THIS module
// when copying the composable into front/src/stores/auto/.
//
// Only what the DSL genuinely cannot express lives here: localStorage +
// JSON.parse/stringify (with try/catch) and the filter/unshift/slice list
// surgery. Each mutator persists and returns the NEW array; the store
// handler assigns it to .files.

export interface RecentFile {
  path: string
  title: string
  openedAt: number
}

const STORAGE_KEY = 'jade-garden-recent-files'
const MAX_RECENT = 25

/** The original load(), verbatim. */
export function loadRecentFiles(): RecentFile[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? (JSON.parse(raw) as RecentFile[]) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/** The original save(), verbatim. */
function saveRecentFiles(items: RecentFile[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

/** The original record(): dedupe, unshift, cap at MAX_RECENT, persist. */
export function recordRecentFile(files: RecentFile[], path: string, title: string): RecentFile[] {
  const filtered = files.filter((f) => f.path !== path)
  filtered.unshift({ path, title, openedAt: Date.now() })
  const next = filtered.slice(0, MAX_RECENT)
  saveRecentFiles(next)
  return next
}

/** The original remove(): filter + persist. */
export function removeRecentFile(files: RecentFile[], path: string): RecentFile[] {
  const next = files.filter((f) => f.path !== path)
  saveRecentFiles(next)
  return next
}

/** The original clear(): persist empty. */
export function clearRecentFiles(): RecentFile[] {
  saveRecentFiles([])
  return []
}
