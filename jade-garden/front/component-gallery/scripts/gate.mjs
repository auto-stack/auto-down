#!/usr/bin/env node
// gate.mjs — gallery 双端 gate 编排（PLAN-072 T-02）。
//
//   node scripts/gate.mjs [--arm vue|vm|all] [--update-snapshots]
//
// vue 臂：vite build → playwright test（08-screenshots 基线，
//         e2e/baselines/；--update-snapshots 透传刷新基线）。
// vm 臂：node scripts/vm-probe.mjs（单 boot，units.mjs 配置驱动）。
// 汇总每臂 PASS/FAIL，任一红即 exit 1。

import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const GALLERY = path.resolve(here, '..')

const args = process.argv.slice(2)
const argOf = (name) => {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : undefined
}
const has = (name) => args.includes(name)
const ARM = argOf('--arm') ?? 'all'
const UPDATE = has('--update-snapshots')

const run = (cmd, cmdArgs, label) => {
  console.log(`\n=== gate[${label}]: ${cmd} ${cmdArgs.join(' ')}`)
  const r = spawnSync(cmd, cmdArgs, { cwd: GALLERY, stdio: 'inherit', shell: process.platform === 'win32' })
  return r.status === 0
}

const results = {}

if (ARM === 'all' || ARM === 'vue') {
  const buildOk = run('pnpm', ['exec', 'vite', 'build'], 'vue:build')
  const pwArgs = ['exec', 'playwright', 'test']
  if (UPDATE) pwArgs.push('--update-snapshots')
  results['vue'] = buildOk && run('pnpm', pwArgs, 'vue:playwright')
}
if (ARM === 'all' || ARM === 'vm') {
  results['vm'] = run('node', ['scripts/vm-probe.mjs'], 'vm:mcp')
}

console.log('\n=== gallery gate summary ===')
let failed = false
for (const [arm, ok] of Object.entries(results)) {
  console.log(`  ${ok ? '✓' : '✗'} ${arm}`)
  if (!ok) failed = true
}
process.exit(failed ? 1 : 0)
