// Dependency-direction assertion (plan 017 Phase 1, wired in Phase 2):
// the ./parser exit must never import vue / lucide / tiptap — the kernel
// stays dual-target portable (a2r input for plan 019).
//
// Walks the static ESM import graph of dist/parser.js over local chunks and
// asserts no external module id matches the forbidden list.

import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const distDir = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'dist')
const FORBIDDEN = [/^vue(\/|$)/, /^lucide-vue-next(\/|$)/, /^@tiptap\//]

const importRe = /(?:from|import)\s*["']([^"']+)["']/g

const seen = new Set()
const queue = [join(distDir, 'parser.js')]
const violations = []

while (queue.length) {
  const file = queue.pop()
  if (seen.has(file) || !existsSync(file)) continue
  seen.add(file)
  const src = readFileSync(file, 'utf8')
  let m
  while ((m = importRe.exec(src))) {
    const id = m[1]
    if (FORBIDDEN.some((re) => re.test(id))) {
      violations.push(`${file} imports ${id}`)
    }
    if (!id.startsWith('.') && !id.startsWith('/')) continue
    const resolved = id.startsWith('.')
      ? resolve(dirname(file), id.replace(/\.js$/, '') + '.js')
      : resolve(distDir, id.replace(/\.js$/, '') + '.js')
    queue.push(resolved)
  }
}

if (violations.length) {
  console.error('parser purity violated:\n  ' + violations.join('\n  '))
  process.exit(1)
}
console.log(
  `[assert-parser-pure] ok — ${seen.size} module(s) reachable from parser.js, no vue/lucide/tiptap imports`
)
if (readdirSync(distDir).length === 0) process.exit(1)
