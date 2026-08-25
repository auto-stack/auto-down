// Dependencies guard (plan 018 Phase 4 acceptance #1): @tiptap/* must stay
// out of package.json AND out of every emitted bundle.
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const pkgRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const pkg = JSON.parse(readFileSync(join(pkgRoot, 'package.json'), 'utf8'))

const deps = { ...pkg.dependencies, ...pkg.peerDependencies, ...pkg.devDependencies }
const bad = Object.keys(deps).filter((k) => k.startsWith('@tiptap/'))
if (bad.length > 0) {
  console.error('tiptap still in dependencies:', bad.join(', '))
  process.exit(1)
}

const dist = join(pkgRoot, 'dist')
for (const f of readdirSync(dist)) {
  if (!f.endsWith('.js')) continue
  if (readFileSync(join(dist, f), 'utf8').includes('@tiptap/')) {
    console.error(`tiptap import found in dist/${f}`)
    process.exit(1)
  }
}
console.log('[assert-no-tiptap] ok — no @tiptap/* in deps or dist')
