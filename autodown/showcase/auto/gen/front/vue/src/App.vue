<!-- App component - Auto-generated from Auto language -->
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { StreamingRenderer } from '@autodown/engine'

import { initial_content } from '@/ext/src/front/utils/showcase_ext'
import { log_ready, is_vue } from '@/ext/src/front/utils/showcase_ext'


const content = ref<string>('')

const emit = defineEmits<{
  Init: []
}>()

onMounted(() => {
  content.value = initial_content();
  if (is_vue() != null) {log_ready('init');
  }
})


</script>

<template>
    <div class="app">
      <StreamingRenderer :source="content" :streaming="false" :scroll-sync="true" :dark-mode="false" :key="'StreamingRenderer-1'" />
    </div>

</template>

<style>
/* Component styles */

</style>

<style scoped>

        .app {
            display: flex;
            flex-direction: column;
            height: 100vh;
            font-family: system-ui, -apple-system, sans-serif;
            color: #111827;
        }
    </style>
