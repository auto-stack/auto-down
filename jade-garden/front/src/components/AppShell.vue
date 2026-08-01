<!-- AppShell component - Auto-generated from Auto language -->
<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { CommandPalette } from '../../auto/src/front/utils/app_shell_ext'
import { FlashcardModal } from '../../auto/src/front/utils/app_shell_ext'
import { LeftSidebar } from '../../auto/src/front/utils/app_shell_ext'
import { MainArea } from '../../auto/src/front/utils/app_shell_ext'
import { QuickSwitcher } from '../../auto/src/front/utils/app_shell_ext'
import { Ribbon } from '../../auto/src/front/utils/app_shell_ext'
import { RightSidebar } from '../../auto/src/front/utils/app_shell_ext'
import { StatusBar } from '../../auto/src/front/utils/app_shell_ext'
import { WorkspaceOpener } from '../../auto/src/front/utils/app_shell_ext'
import { initAppShell, listenOpenFlashcards, unlistenOpenFlashcards, hasWorkspaceRoot, noWorkspaceRoot } from '../../auto/src/front/utils/app_shell_ext'
import { useWorkspaceStore, useFileTreeStore, useThemeStore } from '../../auto/src/front/utils/app_shell_ext'

const workspaceStore = useWorkspaceStore()
const fileTreeStore = useFileTreeStore()
const themeStore = useThemeStore()


const flashcard_open = ref<boolean>(false)

const has_root = computed<any>(() => hasWorkspaceRoot(workspaceStore))
const no_root = computed<any>(() => noWorkspaceRoot(workspaceStore))

const emit = defineEmits<{
  FlashcardOpenChanged: [any]
}>()

function FlashcardOpenChanged(v: any): void {
  flashcard_open.value = v;

  emit('FlashcardOpenChanged', v)
}

onMounted(() => {
  initAppShell(workspaceStore, fileTreeStore, themeStore);
  let cb = () => { flashcard_open.value = true;
   };
  listenOpenFlashcards(cb);
})

onUnmounted(() => {
  unlistenOpenFlashcards();

})


</script>

<template>
    <div class="flex h-full flex-col bg-background text-foreground">
      <div class="flex flex-1 overflow-hidden">
        <Ribbon :key="'Ribbon-1'" />
        <LeftSidebar :key="'LeftSidebar-2'" />
        <div class="flex flex-1 flex-col overflow-hidden">
          <template v-if="no_root">
            <WorkspaceOpener :key="'WorkspaceOpener-3'" />
          </template>
          <template v-if="has_root">
            <MainArea :key="'MainArea-4'" />
          </template>
        </div>
        <RightSidebar :key="'RightSidebar-5'" />
      </div>
      <StatusBar :key="'StatusBar-6'" />
      <QuickSwitcher :key="'QuickSwitcher-7'" />
      <CommandPalette :key="'CommandPalette-8'" />
      <FlashcardModal :open="flashcard_open" :key="'FlashcardModal-9'" @update:open="FlashcardOpenChanged" />
    </div>

</template>

<style>
/* Component styles */

</style>
