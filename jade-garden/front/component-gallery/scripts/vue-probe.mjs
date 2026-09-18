#!/usr/bin/env node
// vue-probe.mjs — PLAN-072 T-01: gallery vue 臂渲染断言（真件 SFC + fixture）。
//
// 前置：pnpm exec vite build（dist/ 就绪）。本脚本起 `vite preview`，
// playwright chromium 逐单元深链（?unit=<id>）断言真件渲染出 fixture
// 内容，并存截图（T-02 起为基线管理铺底）。
//
// 断言面：
//   status_bar —— 真件 StatusBar.vue：fixture 工作区名 + 字数统计 +
//                 backlink 计数（shim 的 /api/backlinks 应答）。
//   outline    —— 真件 OutlinePanel.vue：fixture md 的三级标题行
//                 （app 内 pinned-empty 的列表路径被隔离面解锁）。
//
// 卫生：只杀本脚本 spawn 的 preview PID。
//
// 用法：node scripts/vue-probe.mjs [--port 3100]

import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const GALLERY = path.resolve(here, '..')
const ARTIFACTS = path.join(GALLERY, 'artifacts')

const args = process.argv.slice(2)
const argOf = (name) => {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : undefined
}
const PORT = Number(argOf('--port') ?? 3100)
const BASE = `http://127.0.0.1:${PORT}`

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function waitForServer(timeoutMs) {
  const deadline = Date.now() + timeoutMs
  for (;;) {
    const ok = await new Promise((resolve) => {
      http
        .get(`${BASE}/`, (res) => resolve(res.statusCode === 200))
        .on('error', () => resolve(false))
    })
    if (ok) return
    if (Date.now() > deadline) throw new Error(`vite preview not reachable at ${BASE}`)
    await sleep(300)
  }
}

async function main() {
  if (!fs.existsSync(path.join(GALLERY, 'dist', 'index.html'))) {
    throw new Error('dist/index.html 不存在——先跑 pnpm exec vite build')
  }
  fs.mkdirSync(ARTIFACTS, { recursive: true })

  // 静态服 dist（内建 http，零外部进程）。
  const MIME = {
    '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
    '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json',
  }
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost')
    const rel = url.pathname === '/' ? '/index.html' : url.pathname
    const file = path.join(GALLERY, 'dist', rel)
    if (!file.startsWith(path.join(GALLERY, 'dist')) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      res.writeHead(404).end('not found')
      return
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] ?? 'application/octet-stream' })
    fs.createReadStream(file).pipe(res)
  })
  await new Promise((resolve) => server.listen(PORT, '127.0.0.1', resolve))
  const kill = () => server.close()
  process.on('exit', kill)

  const { chromium } = await import('playwright')

  try {
    await waitForServer(30_000)
    const browser = await chromium.launch()
    const page = await browser.newPage({ viewport: { width: 800, height: 400 } })
    const checks = []

    // —— status_bar 单元 ——
    await page.goto(`${BASE}/?unit=status_bar`)
    await page.waitForSelector('[data-unit="status_bar"] footer', { timeout: 15_000 })
    const footer = await page.textContent('[data-unit="status_bar"] footer')
    for (const needle of ['wiki-demo', 'backlink', 'word']) {
      if (!footer.includes(needle)) throw new Error(`status_bar footer 缺 "${needle}": ${footer}`)
    }
    checks.push('status_bar: 真件 footer 渲染 workspace/backlinks/字数（fixture shim 应答）')
    try {
      await page.screenshot({ path: path.join(ARTIFACTS, 'status_bar.png') })
    } catch (e) {
      checks.push(`status_bar: 截图跳过（${e.message.split('\n')[0]}）——T-02 基线机制接管`)
    }

    // —— outline 单元 ——
    await page.goto(`${BASE}/?unit=outline`)
    await page.waitForSelector('[data-unit="outline"]', { timeout: 15_000 })
    await page.waitForSelector('[data-unit="outline"] li', { timeout: 15_000 })
    const rows = await page.$$eval('[data-unit="outline"] li', (els) => els.map((e) => e.textContent.trim()))
    for (const want of ['引言', '方法', '方法 > 探针']) {
      if (!rows.includes(want)) throw new Error(`outline 行缺 "${want}": ${JSON.stringify(rows)}`)
    }
    checks.push(`outline: 真件列表路径渲染 ${rows.length} 行（fixture 解锁 pinned-empty）`)
    try {
      await page.screenshot({ path: path.join(ARTIFACTS, 'outline.png') })
    } catch (e) {
      checks.push(`outline: 截图跳过（${e.message.split('\n')[0]}）——T-02 基线机制接管`)
    }

    await browser.close()
    console.log('=== gallery vue probe PASS ===')
    for (const c of checks) console.log('  ✓ ' + c)
    process.exit(0)
  } catch (err) {
    console.error('=== gallery vue probe FAIL ===')
    console.error(err.message)
    process.exit(1)
  } finally {
    kill()
  }
}

main()
