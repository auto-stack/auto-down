// units.spec.ts — gallery vue 臂 gate（PLAN-072 T-02，08-screenshots 模式）。
// 断言面来自 scripts/units.mjs（per 单元配置化）：真件 SFC 渲染 fixture
// 内容 + 截图基线（e2e/baselines/<unit>.png）。
import { expect, test } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { UNITS } from '../scripts/units.mjs'
import { startDistServer } from '../scripts/serve-dist.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const GALLERY = path.resolve(here, '..')
const PORT = 3100
const BASE = `http://127.0.0.1:${PORT}`

let server: any

test.beforeAll(async () => {
  server = await startDistServer(GALLERY, PORT)
})

test.afterAll(async () => {
  await new Promise((r) => server.close(r))
})

for (const u of UNITS) {
  if (u.missing) continue
  test(`vue gate: ${u.id}（${u.title}）`, async ({ page }) => {
    await page.goto(`${BASE}${u.vue.url}`)
    await page.waitForSelector(u.vue.ready, { timeout: 15_000 })
    for (const needle of u.vue.needles ?? []) {
      const sel = u.vue.needleSelector ?? '[data-unit]'
      const text = await page.$$eval(sel, (els) => els.map((e) => e.textContent ?? '').join('\n'))
      if (!text.includes(needle)) {
        throw new Error(`${u.id}: ${sel} 缺 "${needle}"（got: ${text.slice(0, 200)}）`)
      }
    }
    if (u.vue.click) {
      await page.click(u.vue.click.selector)
      await page.waitForSelector(u.vue.click.ready, { timeout: 15_000 })
      for (const needle of u.vue.click.needles ?? []) {
        const sel = u.vue.click.needleSelector ?? '[data-unit]'
        const text = await page.$$eval(sel, (els) => els.map((e) => e.textContent ?? '').join('\n'))
        if (!text.includes(needle)) {
          throw new Error(`${u.id}: click 后 ${sel} 缺 "${needle}"（got: ${text.slice(0, 200)}）`)
        }
      }
    }
    await expect(page).toHaveScreenshot(`${u.id}.png`)
  })
}
