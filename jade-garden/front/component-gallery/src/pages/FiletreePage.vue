<!-- FiletreePage.vue — 单元页 filetree 行家族（PLAN-073 T-03 ①-5）。
     挂载真件 src/components/FileTree.vue（递归 FileTreeNode 随件零副本）；
     fixture：fileTree store 直播种（wiki 树 = 2 文件 + 1 目录含 1 子文件），
     展开/收起走真件 toggle 路径（expanded Set，无 API 依赖）。行形态对照：
     web=margin 缩进 + chevron span + NodeIcon；desktop=guides + mouse-area
     chevron + TreeIcon（041 同款）——对照结论归 README 债表 D-5。 -->
<script setup lang="ts">
import { onMounted } from 'vue'
import FileTree from '../../../src/components/FileTree.vue'
import { useFileTreeStore } from '../../../src/stores/fileTree'
import { FileNode } from '../../../src/lib/api_gen'

onMounted(() => {
  const ft = useFileTreeStore()
  ft.files = [
    new FileNode('引言.ad', 'wiki/引言.ad', false, []),
    new FileNode('方法', 'wiki/方法', true, [
      new FileNode('探针.ad', 'wiki/方法/探针.ad', false, []),
    ]),
    new FileNode('另页.ad', 'wiki/另页.ad', false, []),
  ]
  ft.loading = false
})
</script>

<template>
  <div class="flex flex-1 flex-col" data-unit="filetree">
    <div class="flex flex-1 items-start justify-center pt-6">
      <div class="w-72 border-r">
        <FileTree />
      </div>
    </div>
    <div class="flex flex-1 items-center justify-center text-[13px] text-zinc-400">
      filetree 单元（真件挂载 · 行家族 fixture 树）
    </div>
  </div>
</template>
