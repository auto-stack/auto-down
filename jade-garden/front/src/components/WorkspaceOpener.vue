<!-- WorkspaceOpener component - Auto-generated from Auto language -->
<script setup lang="ts">
import { ref, computed } from 'vue'
import { openWorkspaceFlow, chooseWorkspaceDir, clearWorkspaceError, workspaceErrorText, WorkspaceLogo, FolderOpen, Info } from '../../auto/src/front/utils/workspace_opener_ext'
import { useWorkspaceStore, useFileTreeStore } from '../../auto/src/front/utils/workspace_opener_ext'

const workspaceStore = useWorkspaceStore()
const fileTreeStore = useFileTreeStore()


const path = ref<string>('')
const busy = ref<boolean>(false)

const error_text = computed<any>(() => workspaceErrorText(workspaceStore))

const emit = defineEmits<{
  Open: []
  PathInput: [any]
  ChooseDir: []
}>()

function PathInput(e: any): void {
  path.value = e.target.value;

  emit('PathInput', e)
}

function ChooseDir(): void {
  let set_path = (v: any) => { path.value = v;
   };
  chooseWorkspaceDir(set_path);

  emit('ChooseDir')
}

function Open(): void {
  let p = path.value.trim();
  if (p != '') {busy.value = true;
  clearWorkspaceError(workspaceStore);
  let pr = openWorkspaceFlow(workspaceStore, fileTreeStore, p);
  pr.finally(() => { busy.value = false;
   });
  }

  emit('Open')
}


</script>

<template>
    <div class="flex h-full items-center justify-center bg-background p-6">
      <div class="w-full max-w-md rounded-xl border bg-card p-8 shadow-sm">
        <div class="mb-6 text-center">
          <div class="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <component :is="(WorkspaceLogo) as any" />
          </div>
          <h1 class="text-2xl font-bold tracking-tight text-foreground">
            <span>Jade Garden</span>
          </h1>
          <p class="mt-1 text-sm text-muted-foreground">
            <span>A clean knowledge base editor for AutoDown</span>
          </p>
        </div>
        <div class="flex gap-2">
          <button class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground" :title="'选择文件夹'" :type="'button'" @click="ChooseDir">
            <component :is="(FolderOpen) as any" class="h-5 w-5" />
          </button>
          <input class="flex-1 rounded-lg border bg-background px-3 py-2 text-sm outline-none ring-primary/30 transition-shadow focus:ring-2" v-model="path" :type="'text'" :placeholder="'粘贴完整目录路径，例如 D:\\\\wiki\\\\demo'" @keydown.enter="Open" @input="PathInput($event)" />
          <button class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50" :disabled="busy" @click="Open">
            <span>Open</span>
          </button>
        </div>
        <template v-if="error_text != ''">
          <p class="mt-3 text-center text-xs text-destructive">
            <span>{{ error_text }}</span>
          </p>
        </template>
        <div class="mt-4 flex items-start gap-2 rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
          <component :is="(Info) as any" class="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <div class="leading-relaxed">
            <span>浏览器安全限制下无法直接获取本地文件夹的绝对路径。建议直接在上面的输入框中粘贴完整的工程目录路径；点击文件夹图标可浏览并自动填充目录名，随后请补全完整路径。</span>
          </div>
        </div>
      </div>
    </div>

</template>

<style>
/* Component styles */

</style>
