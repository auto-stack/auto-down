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
  {
    at: 'agenda.at',
    structs: ['AgTaskRef', 'AgGroup'],
  },
  {
    at: 'srs.at',
    structs: ['PropPair', 'Qa', 'SrsBlock', 'SrsCardRaw', 'SchedOut'],
  },
  {
    at: 'search.at',
    structs: ['SrPage', 'SrBlock', 'SrHit'],
  },
  {
    at: 'unlinked.at',
    structs: ['UnlinkedHit'],
  },
  {
    at: 'api.at',
    structs: [
      'ApiError',
      'WorkspaceInfo', 'WorkspaceOpenRequest', 'FileNode', 'FileCreateRequest',
      'FileRenameRequest', 'FileDeleteRequest', 'UploadAssetResponse', 'WikiDoc',
      'Backlink', 'Outlink', 'GraphNode', 'GraphEdge', 'GraphData',
      'SearchResult', 'SearchResponse', 'TaskItem', 'TasksResponse',
      'AgendaGroup', 'AgendaResponse', 'QueryResponse', 'Card', 'CardsResponse',
      'CardReviewRequest', 'CardReviewResponse', 'ImportResult', 'SyncStatus',
      'WhiteboardShape', 'WhiteboardDoc', 'BlockInfo', 'BlockResponse',
      'UnlinkedRef', 'UnlinkedRefsResponse',
    ],
    // Contract is client-facing only — the backend serde DTOs stay
    // hand-written (runtime authority); no a2r emission.
    tsOnly: true,
    // Deploy a copy next to lib/api.ts so front imports stay in-tree.
    front: true,
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

// J1 (plan 022 Phase 1): the contract's marker type for open JSON objects
// (frontmatter/properties bags) — the DSL has no map type, so api.at
// declares an empty `JsonAny` struct and this rewrite turns it into the
// honest TS type.
const jsonAnyFix = (s) => s.split(': JsonAny').join(': Record<string, any>')

// K1 (plan 022 Phase 4 slice 2): the contract's #[api] fn layer is VM-side
// metadata (Plan 340 call rewrite) — a2ts emits its stub bodies as TS
// functions, which would collide with the hand-written fetch layer that
// owns the TS client face (Phase 1 design). Strip top-level
// `export function` blocks (header through top-level closing brace).
const stripApiFnBlocks = (s) => {
  const out = []
  let depth = null // null = outside fn block; >0 = brace depth inside
  for (const line of s.split('\n')) {
    if (depth === null) {
      if (/^export function /.test(line)) {
        depth = (line.match(/\{/g) ?? []).length - (line.match(/\}/g) ?? []).length
        if (depth <= 0) depth = null // single-line fn (defensive)
      } else {
        out.push(line)
      }
    } else {
      depth += (line.match(/\{/g) ?? []).length - (line.match(/\}/g) ?? []).length
      if (depth <= 0) depth = null
    }
  }
  return out.join('\n')
}

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
  let tsFixed = source.at === 'api.at' ? jsonAnyFix(ts) : ts
  if (source.at === 'api.at') tsFixed = stripApiFnBlocks(tsFixed)
  const outTs = path.join(here, 'gen-ts', `${stem}_gen.ts`)
  fs.mkdirSync(path.dirname(outTs), { recursive: true })
  fs.writeFileSync(outTs, tsFixed)
  fs.writeFileSync(path.join(here, `${stem}.raw.ts`), tsFixed)

  // ---- deployed front copy (contract only) ----
  if (source.front) {
    const frontDir = path.join(here, '..', '..', 'front', 'src', 'lib')
    fs.mkdirSync(frontDir, { recursive: true })
    const header =
      '// GENERATED from back/auto/api.at via back/auto/gen.mjs — do not edit.\n' +
      "// Contract source of truth for the /api/* wire shapes (Plan 022 Phase 1).\n" +
      "// #[api] fn stubs are stripped here (K1) — TS client face stays in api.ts.\n\n"
    fs.writeFileSync(path.join(frontDir, 'api_gen.ts'), header + tsFixed)
  }

  // ---- deployed front save-path copy (plan-022 Phase 5) ----
  // ensureBlockAnchors (tabs_store_ext) consumes parser_gen's PBlock
  // segmentation (kind/content/blockId/lineStart/lineEnd) for save-time
  // lazy anchor injection; deploy the TS twin next to lib/ like api_gen.
  if (source.at === 'parser.at') {
    const frontLib = path.join(here, '..', '..', 'front', 'src', 'lib')
    fs.mkdirSync(frontLib, { recursive: true })
    const header =
      '// GENERATED from back/auto/parser.at via back/auto/gen.mjs — do not edit.\n' +
      '// Save-path segmentation twin (PBlock: kind/content/blockId/line range).\n' +
      '// Single source stays back/auto/parser.at; regenerate with node gen.mjs.\n\n'
    fs.writeFileSync(path.join(frontLib, 'parser_gen.ts'), header + tsFixed)
    console.log(`[gen] parser.at -> ${path.relative(here, path.join(frontLib, 'parser_gen.ts'))} (front save-path copy)`)
  }

  // ---- desktop VM contract copy (plan-022 Phase 4 slice 3) ----
  // The desktop app's `use back.api:` resolves to <project>/src/back/api.at.
  // Deploy the contract .at verbatim (#[api] fns included — they ARE the
  // payload here, unlike the TS copy where K1 strips them).
  if (source.at === 'api.at') {
    const deskDir = path.join(here, '..', '..', 'front', 'desktop', 'src', 'back')
    fs.mkdirSync(deskDir, { recursive: true })
    const header =
      '// GENERATED from back/auto/api.at via back/auto/gen.mjs — do not edit.\n' +
      '// VM 前台契约副本：use back.api 解析 + #[api] 改写元数据（Phase 4 slice 3）。\n' +
      '// 单源仍在 jade-garden/back/auto/api.at；编辑后重跑 node gen.mjs 同步。\n\n'
    fs.writeFileSync(path.join(deskDir, 'api.at'), header + fs.readFileSync(atPath, 'utf8'))
    console.log(`[gen] api.at -> ${path.relative(here, path.join(deskDir, 'api.at'))} (desktop contract copy)`)
  }

  // ---- Rust for the backend shell ----
  let outRs = null
  if (!source.tsOnly) {
    execFileSync(AUTO_EXE, ['trans', '--path', atPath, 'rust'], { stdio: 'ignore' })
    const rawRsPath = path.join(here, `${stem}.a2r.rs`)
    const rawRs = fs.readFileSync(rawRsPath, 'utf8')
    fs.rmSync(rawRsPath, { force: true })
    outRs = path.join(serverSrc, `${stem}_gen.rs`)
    let rs = rawRs
    if (!rs.startsWith('#![')) {
      rs = '#![allow(non_snake_case)]\n#![allow(dead_code)]\n\n' + rs
    }
    fs.writeFileSync(outRs, rs)
    fs.writeFileSync(path.join(here, `${stem}.raw.rs`), rawRs)
  }

  // ---- sanity: no unresolved bare struct ctor left in TS ----
  const bad = ts
    .split('\n')
    .map((l, i) => (ctorRe.test(l) && !l.startsWith('export class') ? `${i + 1}: ${l}` : ''))
    .filter(Boolean)
  if (bad.length) {
    console.error(`[gen] ${source.at}: B1 left bare struct ctors:\n` + bad.join('\n'))
    process.exit(1)
  }

  const targets = source.tsOnly
    ? [path.relative(here, outTs)]
    : [path.relative(here, outTs), path.relative(here, outRs)]
  console.log(`[gen] ${source.at} -> ${targets.join(' + ')}`)
}

for (const source of SOURCES) emit(source)
