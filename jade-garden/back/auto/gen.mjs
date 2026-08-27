// jade-garden back gen (Plan 021 Phase 2) — dual-target emission for the
// backend's .at single sources.
//
//   a2ts -> gen-ts/<name>_gen.ts  (node twin tests in tests/)
//   a2r  -> ../server/src/<name>_gen.rs (included as `mod <name>_gen;`)
//
// Post-fixes (mirrors engine auto/parser/gen.mjs):
//   B1  a2ts omits `new` for struct constructions in return/let positions ->
//       rewrite `<Struct>(` -> `new <Struct>(` for the module's structs.
//   C1  Auto's `char_at` intrinsic -> JS `charCodeAt` (plan 019).
//   Rust output verbatim + `#![allow(non_snake_case, dead_code)]` header
//   (a2r keeps the Auto camelCase identifiers).
//
// Raw transpiler outputs kept as <at-stem>.raw.{ts,rs} for inspection.
//
// Usage: node gen.mjs   (AUTO_EXE overrides the compiler path)

import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const serverSrc = path.join(here, '..', 'server', 'src')

const AUTO_EXE =
  process.env.AUTO_EXE ?? 'D:/autostack/auto-lang/target/debug/auto.exe'

const SOURCES = [
  {
    at: 'parser.at',
    structs: ['PBlock', 'AnchorSplit', 'FrontSplit', 'PropPair'],
  },
  {
    at: 'links.at',
    structs: ['LineBlock', 'WikiLinkHit', 'LinkScan', 'TagScan'],
  },
  {
    at: 'tasks.at',
    structs: ['TaskScanItem'],
  },
  {
    at: 'query.at',
    structs: ['QueryTask', 'QueryEvalOut', 'QueryEvalOut2', 'OffsetDays'],
  },
]

const ctorRegexFor = (structs) =>
  new RegExp(`(?<!new )\\b(${structs.join('|')})\\(`, 'g')

// B1: struct constructions need `new` outside argument position.
const b1 = (ctorRe, src) =>
  src
    .split('\n')
    .map((line) => (line.startsWith('export class ') ? line : line.replace(ctorRe, 'new $1(')))
    .join('\n')

// C1 (plan 019): Auto's snake_case `char_at` is not a JS string method —
// rewrite to charCodeAt (code-unit semantics, engine-parity with chars().nth
// on the rust side for BMP content).
const charAtFix = (s) => s.split('.char_at(').join('.charCodeAt(')

function emit(source) {
  const atPath = path.join(here, source.at)
  const stem = path.basename(source.at, '.at')
  const ctorRe = ctorRegexFor(source.structs)

  // ---- TS twin ----
  execFileSync(AUTO_EXE, ['trans', '--path', atPath, 'ts'], { stdio: 'ignore' })
  const rawTsPath = path.join(here, `${stem}.ts`)
  const rawTs = fs.readFileSync(rawTsPath, 'utf8')
  fs.rmSync(rawTsPath, { force: true })
  const ts = b1(ctorRegexFor(source.structs), charAtFix(rawTs))
  const outTs = path.join(here, 'gen-ts', `${stem}_gen.ts`)
  fs.mkdirSync(path.dirname(outTs), { recursive: true })
  fs.writeFileSync(outTs, ts)
  fs.writeFileSync(path.join(here, `${stem}.raw.ts`), ts)

  // ---- Rust for the backend shell ----
  execFileSync(AUTO_EXE, ['trans', '--path', atPath, 'rust'], { stdio: 'ignore' })
  const rawRsPath = path.join(here, `${stem}.a2r.rs`)
  const rawRs = fs.readFileSync(rawRsPath, 'utf8')
  fs.rmSync(rawRsPath, { force: true })
  const outRs = path.join(serverSrc, `${stem}_gen.rs`)
  let rs = rawRs
  if (!rs.startsWith('#![')) {
    rs = '#![allow(non_snake_case)]\n#![allow(dead_code)]\n\n' + rs
  }
  fs.writeFileSync(outRs, rs)
  fs.writeFileSync(path.join(here, `${stem}.raw.rs`), rawRs)

  // ---- sanity: no unresolved bare struct ctor left in TS ----
  const bad = ts
    .split('\n')
    .map((l, i) => (ctorRe.test(l) && !l.startsWith('export class') ? `${i + 1}: ${l}` : ''))
    .filter(Boolean)
  if (bad.length) {
    console.error(`[gen] ${source.at}: B1 left bare struct ctors:\n` + bad.join('\n'))
    process.exit(1)
  }

  console.log(`[gen] ${source.at} -> ${path.relative(here, outTs)} + ${path.relative(here, outRs)}`)
}

for (const source of SOURCES) emit(source)
