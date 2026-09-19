<!-- WorkspaceOpenerPage.vue — 单元页 workspace_opener（PLAN-077 T-04：RC-D
     批次 3，Q-1 裁定落地单元）。挂载真件 WorkspaceOpener.vue（零副本）；
     fixture：path 播种 = 合成 input 事件（v-model 写回——playwright fill
     等价，command_palette KeyboardEvent 合成先例）→ click 门 Open 按钮 →
     下沉 .Open 编排链（busy=true → clearWorkspaceError → store facade
     open（open_workspace 契约经 shim 应答）→ then(fileTree.load——/api/files
     shim) → finally busy 复位）→ workspace.root 投影（本页 data-ws-root
     直读 store——面板成功后无自身可见变化，root 为流完成正讯）。
     picker 按钮（showDirectoryPicker = window 级 DOM）不进断言域（Q-1，
     F-1 口径）。VM 臂 twin：wo_busy/wo_error/wo_root 投影（Open handler
     播种编排形状——契约面归 vue 臂 shim，twin 不镜像，F-1）。 -->
<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue'
import WorkspaceOpener from '../../../src/components/WorkspaceOpener.vue'
import { useWorkspaceStore } from '../../../src/stores/workspace'

const ws = useWorkspaceStore()
const seeded = ref(false)

onMounted(async () => {
  await nextTick()
  const input = document.querySelector<HTMLInputElement>(
    'input[placeholder^="粘贴完整目录路径"]',
  )
  if (input) {
    input.value = 'D:/tmp/wiki-demo'
    input.dispatchEvent(new Event('input'))
    seeded.value = true
  }
})
</script>

<template>
  <div class="flex flex-1 flex-col p-3" data-unit="workspace_opener">
    <div data-ws-root class="rounded border border-zinc-200 p-1 text-xs text-zinc-500">
      root: {{ ws.root ?? '(unset)' }}
    </div>
    <WorkspaceOpener />
  </div>
</template>
