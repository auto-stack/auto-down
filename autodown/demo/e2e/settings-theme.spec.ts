import { test, expect, type Locator } from '@playwright/test'
import { resolve } from 'node:path'
import { THEME_SPEC } from '../auto/theme-spec-values.mjs'

// PLAN-051 T6: settings 弹层双轨主题回路冒烟（vue 轨）——⚙ 钮开弹层、
// 🌙/☀ 切深浅、五色 swatch 切 accent；断言引擎两侧根的 .is-dark /
// data-accent 落点（StreamingRenderer/EngineEditor 的 darkMode/accent
// props 消费面），并机械采集证据 PNG（判读在 Phase 2，见计划两阶段协议）。
// 截图落 demo/auto/（与 vm-*.png 证据同目录）。
//
// PLAN-053 T3 (D2): L1 规约对表层——同一页面浅档先断言 §7 投影值
// （THEME_SPEC.light），切深后再断言 THEME_SPEC.dark。expected 全部
// import 自单源模块（theme-spec-values.mjs，溯源 auto-lang Design 22 §7），
// 禁止「另一臂读回当 expected」。断言旁注 §7 行号（规约文档行）。

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

/** `#rrggbb` → computed-style `rgb(r, g, b)`（toHaveCSS 比对口径）。 */
function rgb(hex: string): string {
  const n = parseInt(hex.slice(1), 16)
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`
}

/** L1 规约对表：一个 pane 上断言 §7 双档特征值（expected=THEME_SPEC）。 */
async function expectSpecFace(pane: Locator, spec: (typeof THEME_SPEC)['light']): Promise<void> {
  // §7.4:232 fence 容器：浅 bg #f9fafb·border #e5e7eb / 深 bg zinc-950·border zinc-700
  const fence = pane.locator('[data-block-id="block-5"] .code-block-container')
  await expect(fence).toHaveCSS('background-color', rgb(spec.fenceBg))
  await expect(fence).toHaveCSS('border-top-color', rgb(spec.fenceBorder))
  // §7.3:222 标题色=accent-strong；§7.2:208 indigo strong 浅 #4338ca / 深 #818cf8
  for (const tag of ['h1', 'h2', 'h3']) {
    await expect(pane.locator(tag).first()).toHaveCSS('color', rgb(spec.headingStrong))
  }
  // §7.1:193 正文 fg：浅 #111827 (gray-900) / 深 #fafafa (zinc-50)
  await expect(pane.locator('[data-block-id="block-1"] p, p[data-block-id]').first()).toHaveCSS('color', rgb(spec.bodyFg))
  // §7.4:237 blockquote 左边：浅 #e5e7eb / 深 zinc-700
  await expect(pane.locator('[data-block-id="block-4"] blockquote')).toHaveCSS('border-left-color', rgb(spec.border))
}

test('document face L1: theme spec values hold on both panes, light + dark', async ({ page }) => {
  await page.goto('/')
  await page.waitForSelector('.left .autodown-editor', { timeout: 5000 })
  await page.waitForSelector('.right .streaming-document', { timeout: 10000 })
  await page.waitForSelector('.left .code-block-container', { timeout: 10000 })
  await page.evaluate(() => document.fonts.ready)

  const edit = page.locator('.left .autodown-editor')
  const view = page.locator('.right .streaming-document')

  // 浅档段（L1 双档之 light）：expected=THEME_SPEC.light（§7 浅色列）。
  await expectSpecFace(edit, THEME_SPEC.light)
  await expectSpecFace(view, THEME_SPEC.light)

  // 切深色（051 点击序列），两引擎根 .is-dark 后断言深档段。
  await page.click('.settings-trigger')
  await expect(page.getByText('Settings')).toBeVisible()
  await page.getByRole('button', { name: '🌙 Dark' }).click()
  await expect(edit).toHaveClass(/is-dark/)
  await expect(view).toHaveClass(/is-dark/)
  await page.getByRole('button', { name: '✕' }).click()
  await expect(page.getByText('Settings')).toBeHidden()

  // 深档段（L1 双档之 dark）：expected=THEME_SPEC.dark（§7 深色列）。
  await expectSpecFace(edit, THEME_SPEC.dark)
  await expectSpecFace(view, THEME_SPEC.dark)

  // 回浅色收尾（后续 spec 起点干净）——重开弹层再切回。
  await page.click('.settings-trigger')
  await page.getByRole('button', { name: '☀ Light' }).click()
  await expect(page.locator('.app-dark')).toHaveCount(0)
})
