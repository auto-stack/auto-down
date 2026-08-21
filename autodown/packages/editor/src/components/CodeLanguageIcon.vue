<!-- CodeLanguageIcon component - Auto-generated from Auto language -->
<script setup lang="ts">
import { computed } from 'vue'
import { getLanguageIconUrl } from '../auto/src/front/utils/code_language_icon_ext'


const url = computed<any>(() => getLanguageIconUrl(props.language))

const props = defineProps<{
  language: string
}>()


</script>

<template>
    <img class="code-language-icon" :alt="language" :src="url" :width="16" :height="16" />

</template>

<style>
/* Component styles */

</style>
