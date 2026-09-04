import { test, expect } from '@playwright/test'
import { resolve } from 'node:path'

// PLAN-051 T6: settings 弹层双轨主题回路冒烟（vue 轨）——⚙ 钮开弹层、
// 🌙/☀ 切深浅、五色 swatch 切 accent；断言引擎两侧根的 .is-dark /
// data-accent 落点（StreamingRenderer/EngineEditor 的 darkMode/accent
// props 消费面），并机械采集证据 PNG（判读在 Phase 2，见计划两阶段协议）。
// 截图落 demo/auto/（与 vm-*.png 证据同目录）。

test('settings popover flips dark/accent on both panes', async ({ page }) => {
  await page.goto('/')
  await page.waitForSelector('.left .autodown-editor', { timeout: 5000 })

  // 默认浅色 + indigo。
  const editor = page.locator('.left .autodown-editor')
  const renderer = page.locator('.right .streaming-document')
  await expect(editor).not.toHaveClass(/is-dark/)
  await expect(editor).toHaveAttribute('data-accent', 'indigo')
  await expect(renderer).toHaveAttribute('data-accent', 'indigo')
  await page.screenshot({ path: resolve('auto', 'vue-051-light.png') })

  // ⚙ 开弹层 → 切深色。
  await page.click('.settings-trigger')
  await expect(page.getByText('Settings')).toBeVisible()
  await page.getByRole('button', { name: '🌙 Dark' }).click()

  // app 根条件类 + 两侧引擎根 .is-dark。
  await expect(page.locator('.app-dark')).toHaveCount(1)
  await expect(editor).toHaveClass(/is-dark/)
  await expect(renderer).toHaveClass(/is-dark/)
  await expect(editor).toHaveAttribute('data-accent', 'indigo')

  // 关弹层，采深色证据 PNG。
  await page.getByRole('button', { name: '✕' }).click()
  await expect(page.getByText('Settings')).toBeHidden()
  await page.screenshot({ path: resolve('auto', 'vue-051-dark.png') })

  // 重开 → 切 coral accent（深色档下换 accent 一并采证；swatch 以色类
  // 定位——按钮文本为空）。
  await page.click('.settings-trigger')
  await page.click('.settings-popover button.bg-rose-500')
  await expect(editor).toHaveAttribute('data-accent', 'coral')
  await expect(renderer).toHaveAttribute('data-accent', 'coral')
  await page.screenshot({ path: resolve('auto', 'vue-051-accent-coral.png') })

  // 回浅色收尾（后续 spec 起点干净）。
  await page.getByRole('button', { name: '☀ Light' }).click()
  await expect(page.locator('.app-dark')).toHaveCount(0)
})
