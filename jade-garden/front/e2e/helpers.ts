import { expect, type Page } from '@playwright/test'

/** Navigate to the app and wait until the file tree has rendered. */
export async function openApp(page: Page) {
  await page.goto('/')
  await expect(treeNode(page, 'index.ad')).toBeVisible()
}

/** A file-tree row by its exact file name (e.g. 'index.ad'). */
export function treeNode(page: Page, name: string) {
  return page.getByText(name, { exact: true }).first()
}

/** Open a file from the tree and wait for its editor content. */
export async function openFile(page: Page, name: string, expectText: string) {
  await treeNode(page, name).click()
  await expect(visibleEditor(page)).toContainText(expectText)
}

/** The currently visible (active tab) AutoDown editor instance. */
export function visibleEditor(page: Page) {
  return page.locator('.autodown-editor:visible').first()
}

/** The right sidebar (contains Outline / Backlinks / ... panels). */
export function rightSidebar(page: Page) {
  return page.locator('aside', { hasText: 'Backlinks' }).first()
}

/** Click a tab in the tab bar by its title and wait for it to be active. */
export async function activateTab(page: Page, title: string) {
  const tab = page.locator('button', { has: page.locator('span.truncate', { hasText: title }) }).first()
  await tab.click()
  await expect(tab).toHaveClass(/bg-primary\/10/)
}

/** Unique per-run marker string for typing tests. */
export function marker(prefix = 'E2E') {
  return `${prefix}-${Date.now()}`
}

/**
 * Append text at the end of the active document and wait until the editor
 * shows it. Types char-by-char with a small delay: fast keystrokes right
 * after focusing can be swallowed while Tiptap re-renders.
 */
export async function appendToEditor(page: Page, text: string) {
  const content = visibleEditor(page).locator('.autodown-editor-content')
  await content.click()
  await page.keyboard.press('Control+End')
  await page.keyboard.type(text, { delay: 25 })
  await expect(visibleEditor(page)).toContainText(text)
}
