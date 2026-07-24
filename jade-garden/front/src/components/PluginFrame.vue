<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps<{
  src: string
}>()

const frameRef = ref<HTMLIFrameElement | null>(null)
const ready = ref(false)

function onMessage(event: MessageEvent) {
  if (event.source !== frameRef.value?.contentWindow) return
  const data = event.data
  if (data?.type === 'plugin-ready') {
    ready.value = true
    return
  }
  // Minimal RPC: echo back a pong.
  if (data?.type === 'ping') {
    event.source?.postMessage({ type: 'pong', id: data.id }, { targetOrigin: '*' })
  }
}

onMounted(() => {
  window.addEventListener('message', onMessage)
})

onUnmounted(() => {
  window.removeEventListener('message', onMessage)
})
</script>

<template>
  <iframe
    ref="frameRef"
    :src="src"
    sandbox="allow-scripts"
    class="h-full w-full border-0"
  />
</template>
