import { test, expect } from '@playwright/test'
import { resolve } from 'node:path'

// PLAN-051 T8: view≡stream 落定对拍自动门——驱动 App 既有「对比」按钮
// （compare() 内含 waitSettled 落定检测；comparePanes 是浏览器上下文
// 模块，测试侧不直接 import），断言 `.stream-demo__diff-report` 文本以
// 「零差异」开头。三组用例：(light, dark) × indigo + dark × coral——
// 深色/accent 档下两栏渲染路径若有分叉（.is-dark/data-accent 消费不
// 对称）即在此红。
// 截图 stream-051-dark.png 为机械采集（判读在 Phase 2，两阶段协议）。

type Combo = { dark: boolean; accent: string; label: string }

const COMBOS: Combo[] = [
  { dark: false, accent: 'indigo', label: 'light × indigo' },
  { dark: true, accent: 'indigo', label: 'dark × indigo' },
  { dark: true, accent: 'coral', label: 'dark × coral' },
]

for (const combo of COMBOS) {
  test(`view≡stream 对拍零差异（${combo.label}）`, async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.stream-demo__pane .streaming-document', { timeout: 10000 })

    // 主题设定（声明入口=引擎 props；先切再播，避免落定中途换档）。
    if (combo.dark) await page.click('.stream-demo__theme-toggle')
    if (combo.accent !== 'indigo') {
      await page.click(`.stream-demo__swatch[title='${combo.accent}']`)
    }
    const roots = page.locator('.streaming-document')
    await expect(roots).toHaveCount(2)
    await expect(roots.first()).toHaveClass(
      combo.dark ? /is-dark/ : /^((?!is-dark).)*$/,
    )
    await expect(roots.first()).toHaveAttribute('data-accent', combo.accent)

    // 直达终点 → 等落定门（按钮 enable = done）→ 对比。
    await page.getByRole('button', { name: '直达终点' }).click()
    const compareBtn = page.getByRole('button', { name: '对比', exact: true })
    await expect(compareBtn).toBeEnabled({ timeout: 30000 })
    await compareBtn.click()

    const report = page.locator('.stream-demo__diff-report')
    await expect(report).toBeVisible({ timeout: 30000 })
    await expect(report).toContainText('零差异', { timeout: 30000 })

    // 证据采集：深色档（含 popover 无关的工具栏）整页一张。
    if (combo.dark && combo.accent === 'indigo') {
      await page.screenshot({ path: resolve('stream-051-dark.png'), fullPage: true })
    }
  })
}
