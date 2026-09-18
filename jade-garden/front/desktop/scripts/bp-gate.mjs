#!/usr/bin/env node
// bp-gate.mjs — PLAN-070 §4.4 防再漂移门。
//
// 三断言（任一失败 exit 1）：
//   1. 副本归零——filetree 家族（filetree/tree_icon/tree_util 组件副本）
//      不得在消费仓重现（blueprints 包内是唯一真身）；
//   2. bps 导入一致性——消费面的 `use bps.navigation.filetree.<file>:`
//      引用的每个符号必须在该支撑文件中真实存在（幽灵导入=构建期才炸，
//      在这里先红）；
//   3. tabs_store 字节部署等价（tabs-store-sync --check，产物非资产）。
//
// 接入门禁序列：`node scripts/bp-gate.mjs`（desktop 目录内执行）。
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const desktopDir = join(here, '..')
const frontDir = resolve(desktopDir, '..')
const autoLangRoot = resolve(frontDir, '..', '..', '..', 'auto-lang')
const blueprints = join(autoLangRoot, 'blueprints', 'navigation', 'filetree')

const failures = []

// ---- 1. 副本归零 ----
const forbiddenNames = ['filetree.at', 'tree_icon.at', 'tree_util.at']
const scan = (dir) => {
  let out = []
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, name.name)
    if (name.isDirectory()) out = out.concat(scan(p))
    else if (forbiddenNames.includes(name.name)) out.push(p)
  }
  return out
}
const consumerRoots = [join(frontDir, 'auto', 'src'), join(desktopDir, 'src')]
// 041-auto-edit（auto-lang 仓，组 worktree 兄弟）的消费面同规则覆盖
const autoLang41 = join(autoLangRoot, 'examples', 'ui', '041-auto-edit', 'src', 'front')
if (existsSync(autoLang41)) consumerRoots.push(autoLang41)
const dupHits = consumerRoots.flatMap((r) => (existsSync(r) ? scan(r) : []))
// blueprints 包内自己的文件是唯一真身，豁免
const bpReal = new Set([blueprints])
const dups = dupHits.filter((p) => ![...bpReal].some((b) => p.startsWith(b)))
if (dups.length > 0) failures.push(`副本复现: ${dups.join(', ')}`)

// ---- 2. bps 导入一致性 ----
const supportFiles = {
  tree_util: ['flatten_tree', 'toggle_id', 'has_id', 'collect_ids', 'ext_icon', 'filter_tree'],
  tree_icon: ['TreeIcon'],
}
const importRe = /use\s+bps\.navigation\.filetree\.(\w+):\s*([^\n]+)/g
const consumerFiles = []
for (const root of consumerRoots) {
  if (!existsSync(root)) continue
  for (const p of scanAll(root)) consumerFiles.push(p)
}
function* scanAll(dir) {
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, name.name)
    if (name.isDirectory()) yield* scanAll(p)
    else if (name.name.endsWith('.at')) yield p
  }
}
let importSites = 0
for (const file of consumerFiles) {
  const text = readFileSync(file, 'utf8')
  for (const m of text.matchAll(importRe)) {
    importSites++
    const [, support, symbolsPart] = m
    const symbols = symbolsPart.split(',').map((x) => x.trim()).filter(Boolean)
    const supportPath = join(blueprints, `${support}.at`)
    if (!existsSync(supportPath)) {
      failures.push(`幽灵支撑文件: ${file} → bps.navigation.filetree.${support}（${supportPath} 不存在）`)
      continue
    }
    const src = readFileSync(supportPath, 'utf8')
    for (const sym of symbols) {
      if (!src.includes(sym)) {
        failures.push(`幽灵符号: ${file} 导入 ${sym}，但 ${supportPath} 未导出`)
      }
    }
  }
}

// ---- 3. tabs_store 字节部署等价 ----
const { execFileSync } = await import('node:child_process')
try {
  execFileSync('node', [join(here, 'tabs-store-sync.mjs'), '--check'], { stdio: 'pipe' })
} catch (e) {
  failures.push(`tabs_store 漂移: ${e.stdout?.toString() || e.message}`)
}

if (failures.length > 0) {
  console.error(`bp-gate: FAIL\n  - ${failures.join('\n  - ')}`)
  process.exit(1)
}
console.log(`bp-gate: OK（副本归零 / bps 导入一致 ×${importSites} 处 / tabs_store 字节等价）`)
