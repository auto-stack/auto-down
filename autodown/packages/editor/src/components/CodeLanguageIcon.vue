<template>
  <img class="code-language-icon" :src="url" :alt="language" width="16" height="16" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { getLanguageIconUrl } from '../utils/codeBlockLanguage'

const props = defineProps<{
  language: string
}>()

const url = computed(() => getLanguageIconUrl(props.language))
</script>
