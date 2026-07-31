// gen_lib_api.ts — gen-project stub for '@/lib/api'.
//
// Mirrored into gen/front/vue/src/lib/api.ts by the Regenerate flow so the
// generated store composable's `import { ... } from '@/lib/api'` type-checks
// inside the self-contained gen project. NEVER SHIPS: the copied composable
// in front/src/stores/auto/ has its import sed-rewritten to
// auto/src/front/utils/tabs_store_ext.ts (the real implementations).

export async function readWikiSafe(_path: string): Promise<any> {
  return null
}

export async function writeWikiSafe(_path: string, _doc: any): Promise<any> {
  return null
}

export function ensureBlockAnchors(body: string, _originalBody: string): string {
  return body
}

export function recordRecent(_path: string, _title: string): void {}

export function stripExt(path: string, _ext: string): string {
  return path
}

export function confirmClose(_title: string): boolean {
  return true
}
