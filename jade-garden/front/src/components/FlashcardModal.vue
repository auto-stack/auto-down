<!-- FlashcardModal component - Auto-generated from Auto language -->
<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { Brain, getDueCardsSafe, reviewCardSafe, cardAt, cardQuestion, cardAnswer, counterText } from '../../auto/src/front/utils/flashcard_modal_ext'


const cards = ref<any[]>([])
const loading = ref<boolean>(false)
const index = ref<number>(0)
const show_answer = ref<boolean>(false)
const error = ref<string>('')

const is_open = computed<boolean>(() => props.open)
const current = computed<any>(() => cardAt(cards.value, index.value))
const counter_text = computed<any>(() => counterText(index.value, cards.value.length))
const question_text = computed<any>(() => cardQuestion(current.value))
const answer_text = computed<any>(() => cardAnswer(current.value))
const has_error = computed<boolean>(() => error.value !== '')
const show_loading = computed<boolean>(() => loading.value)
const show_error = computed<boolean>(() => !loading.value && has_error.value)
const show_empty = computed<boolean>(() => !loading.value && !has_error.value && cards.value.length === 0)
const show_cards = computed<boolean>(() => !loading.value && !has_error.value && cards.value.length > 0)

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  Reveal: []
  Rate: [any]
  'update:open': [boolean]
}>()

watch(is_open, () => {
  if (is_open.value) {loading.value = true;
  error.value = '';
  let p = getDueCardsSafe();
  p.then((res: any) => { if (res.error == '') {cards.value = res.cards;
  index.value = 0;
  show_answer.value = false;
  }if (res.error != '') {error.value = res.error;
  }loading.value = false;
   });
  }
})

function Rate(grade: any): void {
  let card = current.value;
  if (card != null) {let p = reviewCardSafe(card.page_path, card.block_id, grade);
  p.then((res: any) => { if (res.error != '') {error.value = res.error;
  }if (res.error == '') {index.value = index.value + 1;
  show_answer.value = false;
  if (index.value >= cards.value.length) {loading.value = true;
  error.value = '';
  let p2 = getDueCardsSafe();
  p2.then((res2: any) => { if (res2.error == '') {cards.value = res2.cards;
  index.value = 0;
  show_answer.value = false;
  }if (res2.error != '') {error.value = res2.error;
  }loading.value = false;
   });
  }} });
  }

  emit('Rate', grade)
}

function update_open(v: any): void {
  v = false;

  emit('update:open', v)
}

function Reveal(): void {
  show_answer.value = true;

  emit('Reveal')
}

onMounted(() => {
  if (props.open) {loading.value = true;
  error.value = '';
  let p = getDueCardsSafe();
  p.then((res: any) => { if (res.error == '') {cards.value = res.cards;
  index.value = 0;
  show_answer.value = false;
  }if (res.error != '') {error.value = res.error;
  }loading.value = false;
   });
  }
})


</script>

<template>
    <template v-if="is_open">
      <div class="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4" @click.self="update_open">
        <div class="w-full max-w-lg overflow-hidden rounded-lg border bg-card shadow-xl">
          <div class="flex items-center gap-2 border-b px-4 py-3">
            <component :is="(Brain) as any" class="h-5 w-5 text-primary" />
            <span class="font-semibold">
              <span>Flashcards</span>
            </span>
            <span class="ml-auto text-xs text-muted-foreground">
              <span>{{ counter_text }}</span>
            </span>
          </div>
          <div class="min-h-[200px] p-6">
            <template v-if="show_loading">
              <div class="flex h-40 items-center justify-center text-sm text-muted-foreground">
                <span>Loading cards…</span>
              </div>
            </template>
            <template v-if="show_error">
              <div class="text-sm text-destructive">
                <span>{{ error }}</span>
              </div>
            </template>
            <template v-if="show_empty">
              <div class="flex h-40 flex-col items-center justify-center gap-2 text-muted-foreground">
                <component :is="(Brain) as any" class="h-8 w-8 opacity-50" />
                <span>
                  <span>No cards due for review</span>
                </span>
              </div>
            </template>
            <template v-if="show_cards">
              <div class="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <span>Question</span>
              </div>
              <div class="mb-6 whitespace-pre-wrap text-base leading-relaxed">
                <span>{{ question_text }}</span>
              </div>
              <template v-if="show_answer">
                <div class="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <span>Answer</span>
                </div>
                <div class="mb-6 whitespace-pre-wrap text-base leading-relaxed">
                  <span>{{ answer_text }}</span>
                </div>
              </template>
              <template v-if="! show_answer">
                <div class="flex justify-center">
                  <button class="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90" :type="'button'" @click="Reveal">
                    <span>Show answer</span>
                  </button>
                </div>
              </template>
              <template v-if="show_answer">
                <div class="grid grid-cols-4 gap-2">
                  <button class="rounded-md bg-destructive/10 px-2 py-2 text-xs font-semibold text-destructive hover:bg-destructive/20" :type="'button'" @click="Rate(1)">
                    <span>Again</span>
                  </button>
                  <button class="rounded-md bg-amber-500/10 px-2 py-2 text-xs font-semibold text-amber-600 hover:bg-amber-500/20" :type="'button'" @click="Rate(2)">
                    <span>Hard</span>
                  </button>
                  <button class="rounded-md bg-primary/10 px-2 py-2 text-xs font-semibold text-primary hover:bg-primary/20" :type="'button'" @click="Rate(3)">
                    <span>Good</span>
                  </button>
                  <button class="rounded-md bg-emerald-500/10 px-2 py-2 text-xs font-semibold text-emerald-600 hover:bg-emerald-500/20" :type="'button'" @click="Rate(4)">
                    <span>Easy</span>
                  </button>
                </div>
              </template>
            </template>
          </div>
        </div>
      </div>
    </template>

</template>

<style>
/* Component styles */

</style>
