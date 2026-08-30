// Dist freshness guard, consumer side (plan 027 D2). Recomputes the src/auto
// content hash and compares it against dist/.dist-stamp written at build time.
// Invoked by consumers from their own cwd, e.g.
//   node ../../autodown/packages/engine/scripts/assert-dist-fresh.mjs
// so every path is anchored to this script's location, never to process.cwd().
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { computeStamp, pkgRoot } from './dist-stamp-lib.mjs'

const REBUILD_HINT = 'engine dist stale — rebuild with: pnpm --filter @autodown/engine build'

let stamped
try {
  stamped = (await readFile(join(pkgRoot, 'dist', '.dist-stamp'), 'utf8')).trim()
} catch {
  console.error(REBUILD_HINT)
  console.error('  (dist/.dist-stamp missing — engine dist was never built in this checkout)')
  process.exit(1)
}

const actual = await computeStamp()
if (actual !== stamped) {
  console.error(REBUILD_HINT)
  console.error(`  stamped ${stamped.slice(0, 16)}… != current ${actual.slice(0, 16)}… — src/auto changed after last build`)
  process.exit(1)
}
console.log('[assert-dist-fresh] ok — dist up to date with src/auto')
