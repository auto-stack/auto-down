<script setup lang="ts">
import BacklinksPanel from './BacklinksPanel.vue'
import OutgoingLinksPanel from './OutgoingLinksPanel.vue'
import OutlinePanel from './OutlinePanel.vue'
import PropertiesPanel from './PropertiesPanel.vue'
</script>

<template>
  <aside class="flex w-64 flex-col gap-3 overflow-y-auto border-l bg-card p-3 text-sm">
    <OutlinePanel />
    <BacklinksPanel />
    <OutgoingLinksPanel />
    <PropertiesPanel />
  </aside>
</template>
