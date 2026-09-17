#!/usr/bin/env node
// tabs-store-sync.mjs — PLAN-070 T-02：tabs_store 单源部署/防漂移门。
//
// 唯一源：jade-garden/front/auto/src/front/tabs_store.at
// 部署面：jade-garden/front/desktop/src/front/tabs_store.at（字节等价副本）。
//
// 为什么是字节部署而不是跨包 import：store 内 `use back.api:` 按文件位置
// 解析（desktop 副本须留在 desktop/src/front/ 才能命中带 VM 助手 fn 的
// src/back/api.at 契约副本）——位置即绑定，跨包导入会让 read_wiki 等
// 符号在调用期失联（PLAN-070 T-02 实测：status 停在 files-reloaded）。
// 本脚本取代 PLAN-064 时代的手维护孪生 + front/README §9.5 diff 登记册：
// 副本是产物不是资产，改动只落唯一源后重新部署。
//
// 用法：
//   node scripts/tabs-store-sync.mjs          # 部署（覆盖 desktop 副本）
//   node scripts/tabs-store-sync.mjs --check  # 门检：非字节等价即 exit 1
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const desktopDir = join(here, '..', 'src', 'front')
const canonical = join(desktopDir, '..', '..', '..', 'auto', 'src', 'front', 'tabs_store.at')
const deployed = join(desktopDir, 'tabs_store.at')

const src = readFileSync(canonical, 'utf8')
const check = process.argv.includes('--check')
let cur = ''
try {
  cur = readFileSync(deployed, 'utf8')
} catch {
  /* missing deployed copy = drift */
}

if (src === cur) {
  console.log('tabs-store-sync: OK (byte-identical)')
} else if (check) {
  console.error('tabs-store-sync: DRIFT — desktop/src/front/tabs_store.at 与唯一源非字节等价；' +
    '运行 `node scripts/tabs-store-sync.mjs` 重新部署（禁止手改副本）。')
  process.exit(1)
} else {
  writeFileSync(deployed, src, 'utf8')
  console.log('tabs-store-sync: deployed (bytes written)')
}
