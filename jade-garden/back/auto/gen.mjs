// jade-garden back parser gen (Plan 021 Phase 2 slice 1).
//
// Emits the dual-target parser from the a2r-clean single source parser.at:
//   a2ts -> gen-ts/parser_gen.ts  (parity golden twin, driven by tests/parity.mjs)
//   a2r  -> ../server/src/parser_gen.rs (included as `mod parser_gen;`)
//
// Post-fixes (mirrors engine auto/parser/gen.mjs):
//   B1  a2ts omits `new` for struct constructions in return/let positions ->
//       rewrite `<Struct>(` -> `new <Struct>(` for the structs defined here.
//   C1  Auto's `char_at` intrinsic -> JS `charCodeAt` (plan 019).
//   Rust output is emitted verbatim (pure std, zero deps).
//
// Raw transpiler outputs are kept as parser.raw.ts / parser.raw.rs for
// inspection (engine-pipeline convention).
//
// Usage: node gen.mjs   (AUTO_EXE overrides the compiler path)

import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const atPath = path.join(here, 'parser.at')
const outTs = path.join(here, 'gen-ts', 'parser_gen.ts')
const outRs = path.join(here, '..', 'server', 'src', 'parser_gen.rs')

const AUTO_EXE =
  process.env.AUTO_EXE ?? 'D:/autostack/auto-lang/target/debug/auto.exe'

const structNames = ['PBlock', 'AnchorSplit', 'FrontSplit', 'PropPair']
const ctorRe = new RegExp(`(?<!new )\\b(${structNames.join('|')})\\(`, 'g')

function b1(src) {
  return src
    .split('\n')
    .map((line) => (line.startsWith('export class ') ? line : line.replace(ctorRe, 'new $1(')))
    .join('\n')
}

// C1 (plan 019): Auto's snake_case `char_at` is not a JS string method —
// rewrite to charCodeAt (code-unit semantics, engine-parity with chars().nth
// on the rust side for BMP content).
const charAtFix = (s) => s.split('.char_at(').join('.charCodeAt(')

function trans(target, emittedName, rawName, applyFixes) {
  execFileSync(AUTO_EXE, ['trans', '--path', atPath, target], { stdio: 'ignore' })
  const emitted = path.join(here, emittedName)
  const raw = fs.readFileSync(emitted, 'utf8')
  fs.rmSync(emitted, { force: true })
  fs.writeFileSync(path.join(here, rawName), applyFixes(raw))
  return applyFixes(raw)
}

// ---- TS twin (parity golden) ----
trans('ts', 'parser.ts', 'parser.raw.ts', (raw) => b1(charAtFix(raw)))
fs.mkdirSync(path.dirname(outTs), { recursive: true })
fs.copyFileSync(path.join(here, 'parser.raw.ts'), outTs)

// ---- Rust for the backend shell ----
trans('rust', 'parser.a2r.rs', 'parser.raw.rs', (raw) => raw)
fs.copyFileSync(path.join(here, 'parser.raw.rs'), outRs)
// a2r keeps the Auto camelCase identifiers — silence the naming lints for
// the generated module (hand-written shell stays lint-clean).
const rs = fs.readFileSync(outRs, 'utf8')
if (!rs.startsWith('#![')) {
  fs.writeFileSync(outRs, '#![allow(non_snake_case)]\n#![allow(dead_code)]\n\n' + rs)
}

console.log('[gen] parser_gen.ts / parser_gen.rs written')
