#!/usr/bin/env node
// ext-registry-gate.mjs — PLAN-064 T-02: the ext-layer capability-registry
// gate (mirrors the #[api] ROUTE↔fn bidirectional 对拍 discipline).
//
// Tables:
//   A. live export face of front/auto/src/front/utils/*_ext.ts
//   B. desktop/ext-registry.json (the registry; class: sink|bridge|deviation)
//   C. .at references:
//      - widget/store `use { … from "…/<name>_ext.ts" }` (both trees:
//        front/auto and front/desktop)
//      - store `use back.api: n1, n2 …` in front/auto/<stem>_store.at →
//        the sed contract maps '@/lib/api' to utils/<stem>_ext.ts
//
// Red conditions:
//   1. export without a registry entry          (未登记)
//   2. registry entry without a live export     (死账)
//   3. store use-line name missing from its ext export face (sed 契约破)
//   4. .at-referenced ext name missing from the export face (引用悬空)
//   5. registry row with unknown class / missing fields
//
// Usage: node jade-garden/front/desktop/scripts/ext-registry-gate.mjs

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const frontDir = path.resolve(here, '..')
const autoSrc = path.resolve(frontDir, '..', 'auto', 'src', 'front')
const utilsDir = path.join(autoSrc, 'utils')
const desktopSrc = path.join(frontDir, 'src')
const registryPath = path.join(frontDir, 'ext-registry.json')

const CLASS_VALUES = new Set(['sink', 'bridge', 'deviation'])
const errors = []

function scanExports() {
  const face = new Map() // file -> Set(fn)
  for (const f of fs.readdirSync(utilsDir).sort()) {
    if (!f.endsWith('_ext.ts')) continue
    const src = fs.readFileSync(path.join(utilsDir, f), 'utf8')
    const names = new Set()
    for (const m of src.matchAll(/export\s+(?:async\s+)?function\s+(\w+)/g)) names.add(m[1])
    for (const m of src.matchAll(/export\s+const\s+(\w+)/g)) names.add(m[1])
    for (const m of src.matchAll(/export\s*\{([^}]+)\}/g)) {
      for (const part of m[1].split(',')) {
        const name = part.trim().split(/\s+as\s+/).pop().trim()
        if (name) names.add(name)
      }
    }
    face.set(f, names)
  }
  return face
}

// strip `//` line comments so doc-comment mentions don't count as code
function stripComments(src) {
  return src
    .split('\n')
    .map((l) => l.replace(/(^|[^:])\/\/[^"]*$/, '$1'))
    .join('\n')
}

function scanAtFiles(dir) {
  const out = []
  if (!fs.existsSync(dir)) return out
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) out.push(...scanAtFiles(p))
    else if (e.name.endsWith('.at')) out.push(p)
  }
  return out
}

// table C: referenced ext names, keyed by ext file
function scanReferences() {
  const refs = new Map() // extFile -> Map(fn -> [atFile])
  const add = (file, fn, at) => {
    if (!refs.has(file)) refs.set(file, new Map())
    const m = refs.get(file)
    if (!m.has(fn)) m.set(fn, [])
    m.get(fn).push(at)
  }
  for (const dir of [autoSrc, desktopSrc]) {
    for (const at of scanAtFiles(dir)) {
      const src = stripComments(fs.readFileSync(at, 'utf8'))
      // use { kind: names from "path/_ext.ts" } (single- or multi-line)
      for (const m of src.matchAll(/use\s*\{([^}]*)\}/gs)) {
        for (const line of m[1].split('\n')) {
          const lm = line.match(/^\s*\w+\s*:\s*([^"'(]+?)\s+from\s+"([^"]+)"\s*$/)
          if (!lm) continue
          const file = path.basename(lm[2])
          if (!file.endsWith('_ext.ts')) continue
          for (const raw of lm[1].split(',')) {
            const name = raw.trim().split(/\s+as\s+/).pop().trim()
            if (name) add(file, name, at)
          }
        }
      }
      // store `use back.api:` → sed contract to <stem>_ext.ts (web tree only)
      const stem = path.basename(at, '.at')
      if (dir === autoSrc && stem.endsWith('_store')) {
        for (const um of src.matchAll(/^\s*use\s+back\.api\s*:\s*(.+)$/gm)) {
          for (const raw of um[1].split(',')) {
            const name = raw.trim()
            if (/^\w+$/.test(name)) add(`${stem}_ext.ts`, name, at)
          }
        }
      }
    }
  }
  return refs
}

// ---- table A vs B ----
const face = scanExports()
const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'))
if (!Array.isArray(registry.entries)) {
  console.error('ext-registry-gate: registry.entries missing')
  process.exit(1)
}
const regKeys = new Map() // file -> Set(fn)
for (const row of registry.entries) {
  if (!row.file || !row.fn || !CLASS_VALUES.has(row.class) || !row.target || !row.evidence) {
    errors.push(`registry row malformed: ${JSON.stringify(row).slice(0, 120)}`)
    continue
  }
  if (!regKeys.has(row.file)) regKeys.set(row.file, new Set())
  regKeys.get(row.file).add(row.fn)
}

for (const [f, names] of face) {
  const reg = regKeys.get(f) ?? new Set()
  for (const n of names) {
    if (!reg.has(n)) errors.push(`未登记: ${f}::${n} — export face has no registry entry (rule 1)`)
  }
  for (const n of reg) {
    if (!names.has(n)) errors.push(`死账: ${f}::${n} — registry entry has no live export (rule 2)`)
  }
}
for (const [f, reg] of regKeys) {
  if (!face.has(f)) errors.push(`死账: ${f} — registry file no longer exists (rule 2)`)
}

// ---- table C vs A ----
const refs = scanReferences()
for (const [f, names] of refs) {
  const live = face.get(f)
  if (!live) {
    for (const [n, ats] of names) {
      errors.push(`引用悬空: ${f}::${n} referenced from ${ats[0]} but the ext file does not exist (rule 4)`)
    }
    continue
  }
  for (const [n, ats] of names) {
    if (!live.has(n)) {
      errors.push(`引用悬空: ${f}::${n} referenced from ${path.relative(frontDir, ats[0])} but not exported (rule 4)`)
    }
  }
}

if (errors.length) {
  console.error(`ext-registry-gate: RED — ${errors.length} finding(s)`)
  for (const e of errors) console.error(`  ✗ ${e}`)
  process.exit(1)
}
const totalEntries = registry.entries.length
const totalExports = [...face.values()].reduce((a, s) => a + s.size, 0)
const totalRefs = [...refs.values()].reduce((a, m) => a + m.size, 0)
console.log(
  `ext-registry-gate: PASS — exports=${totalExports} registry=${totalEntries} atRefs=${totalRefs} files=${face.size}`,
)
