// Shim helper (plan 017): copies the engine style bundle so legacy
// '@autodown/vue/style.css' imports keep resolving without consumer changes.
// Run as part of `pnpm build` AFTER @autodown/engine is built.
import { copyFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const engineCss = join(here, '..', 'engine', 'dist', 'style.css')

mkdirSync(join(here, 'dist'), { recursive: true })
copyFileSync(engineCss, join(here, 'dist', 'style.css'))
console.log('[shim] @autodown/engine style.css -> @autodown/vue dist/style.css')
