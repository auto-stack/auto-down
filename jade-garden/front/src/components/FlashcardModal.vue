<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { Brain } from 'lucide-vue-next'
import { getDueCards, reviewCard, type Card } from '@/lib/api'

const open = defineModel<boolean>('open', { default: false })

const cards = ref<Card[]>([])
const loading = ref(false)
const index = ref(0)
const showAnswer = ref(false)
const error = ref<string | null>(null)

const current = computed(() => cards.value[index.value] || null)

async function load() {
  loading.value = true
  error.value = null
  try {
    const res = await getDueCards(50)
    cards.value = res.cards
    index.value = 0
    showAnswer.value = false
  } catch (e: any) {
    error.value = e.message || String(e)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  if (open.value) load()
})

watch(open, (isOpen) => {
  if (isOpen) load()
})

async function rate(grade: number) {
  const card = current.value
  if (!card) return
  try {
    await reviewCard(card.page_path, card.block_id, grade)
    index.value += 1
    showAnswer.value = false
    if (index.value >= cards.value.length) {
      await load()
    }
  } catch (e: any) {
    error.value = e.message || String(e)
  }
}

function reveal() {
  showAnswer.value = true
}

function close() {
  open.value = false
}
</script>

<template>
  <div
    v-if="open"
    class="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4"
    @click.self="close"
  >
    <div class="w-full max-w-lg overflow-hidden rounded-lg border bg-card shadow-xl">
      <div class="flex items-center gap-2 border-b px-4 py-3">
        <Brain class="h-5 w-5 text-primary" />
        <span class="font-semibold">Flashcards</span>
        <span class="ml-auto text-xs text-muted-foreground">{{ index + 1 }} / {{ cards.length }}</span>
      </div>

      <div class="min-h-[200px] p-6">
        <div v-if="loading" class="flex h-40 items-center justify-center text-sm text-muted-foreground">
          Loading cards…
        </div>
        <div v-else-if="error" class="text-sm text-destructive">{{ error }}</div>
        <div v-else-if="!cards.length" class="flex h-40 flex-col items-center justify-center gap-2 text-muted-foreground">
          <Brain class="h-8 w-8 opacity-50" />
          <span>No cards due for review</span>
        </div>
        <template v-else>
          <div class="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Question</div>
          <div class="mb-6 whitespace-pre-wrap text-base leading-relaxed">{{ current?.question || current?.raw }}</div>

          <template v-if="showAnswer">
            <div class="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Answer</div>
            <div class="mb-6 whitespace-pre-wrap text-base leading-relaxed">{{ current?.answer || current?.raw }}</div>
          </template>

          <div v-if="!showAnswer" class="flex justify-center">
            <button
              type="button"
              class="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              @click="reveal"
            >
              Show answer
            </button>
          </div>
          <div v-else class="grid grid-cols-4 gap-2">
            <button
              type="button"
              class="rounded-md bg-destructive/10 px-2 py-2 text-xs font-semibold text-destructive hover:bg-destructive/20"
              @click="rate(1)"
            >
              Again
            </button>
            <button
              type="button"
              class="rounded-md bg-amber-500/10 px-2 py-2 text-xs font-semibold text-amber-600 hover:bg-amber-500/20"
              @click="rate(2)"
            >
              Hard
            </button>
            <button
              type="button"
              class="rounded-md bg-primary/10 px-2 py-2 text-xs font-semibold text-primary hover:bg-primary/20"
              @click="rate(3)"
            >
              Good
            </button>
            <button
              type="button"
              class="rounded-md bg-emerald-500/10 px-2 py-2 text-xs font-semibold text-emerald-600 hover:bg-emerald-500/20"
              @click="rate(4)"
            >
              Easy
            </button>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
