// Dist freshness guard, writer side (plan 027 D2). Runs last in the build
// chain: hashes src/** + auto/** content and records it in dist/.dist-stamp
// so consumers can detect a stale dist before importing it.
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { computeStamp, pkgRoot } from './dist-stamp-lib.mjs'

const stamp = await computeStamp()
await mkdir(join(pkgRoot, 'dist'), { recursive: true })
await writeFile(join(pkgRoot, 'dist', '.dist-stamp'), stamp + '\n', 'utf8')
console.log(`[write-dist-stamp] ok — ${stamp.slice(0, 16)} (${stamp.length} hex)`)
