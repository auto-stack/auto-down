import { expect, test } from '@playwright/test'
import { appendToEditor, marker, openApp, openFile } from './helpers'

// PLAN-070 T-06：jade web 命令面（MenuBar 组件 + ui_config 单源声明）。
// 桌面 067 动作集的 web 子集，经 T-05 组件级选择性继承合成。

test.describe('menubar — web command surface', () => {
  test('menubar renders 文件/查看 menus from the ui_config action set', async ({ page }) => {
    await openApp(page)

    // Triggers carry the menu titles (shadcn Menubar at the shell top).
    const menubar = page.getByRole('menubar')
    await expect(menubar.getByText('文件', { exact: true })).toBeVisible()
    await expect(menubar.getByText('查看', { exact: true })).toBeVisible()

    // 文件 menu lists the mirrored desktop action set.
    await menubar.getByText('文件', { exact: true }).click()
    await expect(page.getByRole('menuitem', { name: '打开工作区' })).toBeVisible()
    await expect(page.getByRole('menuitem', { name: '保存' })).toBeVisible()
    await expect(page.getByRole('menuitem', { name: '关闭标签' })).toBeVisible()
    await expect(page.getByRole('menuitem', { name: '重载文件列表' })).toBeVisible()

    // 查看菜单：图谱项。
    await menubar.getByText('查看', { exact: true }).click()
    await expect(page.getByRole('menuitem', { name: '打开图谱' })).toBeVisible()
  })

  test('文件 → 保存 persists the active tab via the tabs facade', async ({ page }) => {
    const text = marker('E2E-MENU')
    await openApp(page)
    await openFile(page, 'Hello World.ad', '这是一段示例文本')
    await appendToEditor(page, ` ${text}`)

    // Save through the menubar (not Ctrl+S): the backend wiki write is the
    // observable — the handler delegates to the tabs facade save.
    const saveReq = page.waitForRequest(
      (r) => r.url().includes('/api/wiki/') && ['PUT', 'POST'].includes(r.method()),
    )
    await page.getByRole('menubar').getByText('文件', { exact: true }).click()
    await page.getByRole('menuitem', { name: '保存' }).click()
    await saveReq

    // Disk round-trip: after reload the reopened tab shows the saved marker
    // (03-tabs disk-assert idiom).
    await page.reload()
    await openApp(page)
    await openFile(page, 'Hello World.ad', text)
  })
})
