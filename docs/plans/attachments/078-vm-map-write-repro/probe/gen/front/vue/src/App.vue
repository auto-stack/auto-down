<!-- App component - Auto-generated from Auto language -->
<script setup lang="ts">
import { ref, onMounted } from 'vue'

const m = ref<any>({a: 1})
const count = ref<number>(0)
const readback = ref<string>('')

const emit = defineEmits<{
  DoIt: []
}>()

function DoIt(): void {
  m.value['b'] = 2;
  let cur = m.value['b'];
  readback.value = `${cur}`;
  count.value = count.value + 1;

  emit('DoIt')
}

onMounted(() => {
  readback.value = 'init';
})


</script>

<template>
    <div class="flex flex-col gap-2 p-3">
      <button class="px-4 py-2 rounded" :variant="'text'" @click="DoIt">DoIt</button>
      <span class="text-xs">{{ readback }}</span>
    </div>

</template>

<style>
/* Component styles */

</style>
