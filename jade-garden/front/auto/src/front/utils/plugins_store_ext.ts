// plugins_store_ext.ts — hand-written TS extension for plugins_store.at.
//
// The store codegen emits every external function as an import from
// '@/lib/api'; the Regenerate flow sed-rewrites that import to THIS module
// when copying the composable into front/src/stores/auto/.
//
// Only what the DSL genuinely cannot express lives here: the recursive tree
// walk, regex literals, and try/catch of the original load(). The wrapper
// never rejects; it returns { plugins, error } with error == "" on success,
// mirroring the original catch branch (`error.value = e.message ||
// String(e)`).
import { listFiles } from '../../../../src/lib/api'

export interface PluginManifest {
  id: string
  name: string
  version: string
  entry: string
  permissions?: string[]
}

export interface PluginsLoadResult {
  plugins: PluginManifest[]
  error: string
}

/** The original loadManifest(), verbatim. */
function loadManifest(path: string): PluginManifest {
  // Manifests are loaded on demand by PluginFrame; the store only knows the path.
  return {
    id: path.replace(/\.json$/, '').replace(/^plugins\//, ''),
    name: path.replace(/\.json$/, '').replace(/^plugins\//, ''),
    version: '0.0.0',
    entry: path,
  }
}

/** The original load() body (walk + try/catch/finally), as a result map. */
export async function loadPluginsResult(): Promise<PluginsLoadResult> {
  try {
    const nodes = await listFiles('', true)
    const found: PluginManifest[] = []
    function walk(list: any[]) {
      for (const node of list) {
        if (node.is_dir && node.name.toLowerCase() === 'plugins' && node.children) {
          for (const child of node.children) {
            if (!child.is_dir && child.path.toLowerCase().endsWith('.json')) {
              found.push(loadManifest(child.path))
            }
          }
        }
        if (node.children) walk(node.children)
      }
    }
    walk(nodes)
    return { plugins: found, error: '' }
  } catch (e: any) {
    return { plugins: [], error: e.message || String(e) }
  }
}
