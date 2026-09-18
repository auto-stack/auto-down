<!-- MenuBar component - Auto-generated from Auto language -->
<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { Button } from '@/components/ui/button'
import { Menubar, MenubarContent, MenubarItem, MenubarMenu, MenubarSeparator, MenubarTrigger } from '@/components/ui/menubar'

import { RefreshCw, Save, X } from 'lucide-vue-next'

import { menuOpenWorkspace, menuReloadFiles, menuSave, menuCloseTab, menuOpenGraph } from '../../auto/src/front/utils/menu_bar_ext'


const emit = defineEmits<{
  ActOpenWs: []
  ActReload: []
  ActSave: []
  ActCloseTab: []
  ActGraph: []
}>()

function ActCloseTab(): void {
  menuCloseTab();
}

function ActGraph(): void {
  menuOpenGraph();
}

function ActOpenWs(): void {
  menuOpenWorkspace();
}

function ActReload(): void {
  menuReloadFiles();
}

function ActSave(): void {
  menuSave();
}

const __autoActionsKeymap: Record<string, () => void> = {
  'Ctrl+o': ActOpenWs,
  'F5': ActReload,
  'Ctrl+s': ActSave,
  'Ctrl+w': ActCloseTab,
}
function __autoActionsKeydown(e: KeyboardEvent) {
  const hasModifier = e.ctrlKey || e.altKey || e.metaKey
  if (!hasModifier) {
    const t = e.target as HTMLElement | null
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
  }
  let key = e.key
  if (key.length === 1) key = key.toLowerCase()
  const combo = (e.ctrlKey || e.metaKey ? 'Ctrl+' : '') + (e.altKey ? 'Alt+' : '') + key
  const fn = __autoActionsKeymap[combo]
  if (fn) {
    e.preventDefault()
    fn()
  }
}

onMounted(() => {
  window.addEventListener('keydown', __autoActionsKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', __autoActionsKeydown)
})


</script>

<template>
    <div class="flex flex-col gap-4">
      <Menubar class="items-center border-b">
        <MenubarMenu value="file">
          <MenubarTrigger>文件</MenubarTrigger>
          <MenubarContent>
              <MenubarItem @click="ActOpenWs">
                <span>打开工作区</span>
                <span class="ml-auto text-[11px] text-zinc-500">Ctrl+O</span>
              </MenubarItem>
              <MenubarSeparator />
              <MenubarItem @click="ActSave">
                <span>保存</span>
                <span class="ml-auto text-[11px] text-zinc-500">Ctrl+S</span>
              </MenubarItem>
              <MenubarItem @click="ActCloseTab">
                <span>关闭标签</span>
                <span class="ml-auto text-[11px] text-zinc-500">Ctrl+W</span>
              </MenubarItem>
              <MenubarSeparator />
              <MenubarItem @click="ActReload">
                <span>重载文件列表</span>
                <span class="ml-auto text-[11px] text-zinc-500">F5</span>
              </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu value="view">
          <MenubarTrigger>查看</MenubarTrigger>
          <MenubarContent>
              <MenubarItem @click="ActGraph">
                <span>打开图谱</span>
              </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>
      <div class="flex flex-row items-center px-2 py-1 gap-1 border-b">
        <Button variant="ghost" class="h-7 w-7 px-0 py-0" @click="ActSave" title="保存">
          <Save class="h-4 w-4" />
        </Button>
        <Button variant="ghost" class="h-7 w-7 px-0 py-0" @click="ActCloseTab" title="关闭标签">
          <X class="h-4 w-4" />
        </Button>
        <Button variant="ghost" class="h-7 w-7 px-0 py-0" @click="ActReload" title="重载文件列表">
          <RefreshCw class="h-4 w-4" />
        </Button>
      </div>
    </div>

</template>

<style>
/* Component styles */

</style>
