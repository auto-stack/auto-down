<!-- App component - Auto-generated from Auto language -->
<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { AutoDownEditor, StreamingRenderer } from '@autodown/engine'

import { initial_content } from '../auto/src/front/utils/showcase_ext'
import { log_ready, is_vue } from '../auto/src/front/utils/showcase_ext'
import { useShowcaseBridge } from '../auto/src/front/utils/showcase_ext'

const showcaseBridge = useShowcaseBridge()

import SettingsPopover from '@/components/SettingsPopover.vue'


const content = ref<string>('')
const stream_text = ref<string>('')
const show_edit = ref<boolean>(true)
const show_view = ref<boolean>(true)
const show_stream = ref<boolean>(true)
const feed_source = ref<string>('')
const playing = ref<boolean>(false)
const speed = ref<number>(96)
const dark_mode = ref<boolean>(false)
const accent_color = ref<string>('indigo')
const settings_open = ref<boolean>(false)
// Plan 458: seed theme default from index.html bootstrap.
if ((window as any).__AUTO_UI_THEME__ === 'light' || (window as any).__AUTO_UI_THEME__ === 'dark') dark_mode.value = (window as any).__AUTO_UI_THEME__ === 'dark'
// Plan 458: seed accent default from index.html bootstrap.
if (typeof (window as any).__AUTO_UI_ACCENT__ === 'string') accent_color.value = (window as any).__AUTO_UI_ACCENT__

const feed_text = computed<any>(() => (is_vue() != null ? showcaseBridge.streamText : stream_text.value))
const feed_source_text = computed<any>(() => (is_vue() != null ? showcaseBridge.feedSource : feed_source.value))
const feed_playing = computed<any>(() => (is_vue() != null ? showcaseBridge.playing : playing.value))
const stream_len = computed<any>(() => feed_text.value.length)
const source_len = computed<any>(() => feed_source_text.value.length)
const settled = computed<boolean>(() => source_len.value > 0 && feed_text.value === feed_source_text.value)
const stream_pct = computed<any>(() => (source_len.value === 0 ? 100 : stream_len.value * 100 / source_len.value))
const stream_status = computed<any>(() => (settled.value ? '已落定' : (feed_playing.value ? '流式中 ' + stream_pct.value.toString() + '%' : (source_len.value > 0 ? '已暂停' : '未开始'))))

const emit = defineEmits<{
  Init: []
  Edit: [string]
  ToggleEdit: []
  ToggleView: []
  ToggleStream: []
  FeedStep: []
  FeedReset: []
  FeedPlayPause: []
  FeedSetSpeed: [number]
  OpenSettings: []
  CloseSettings: []
  SetTheme: [string]
  SetAccent: [string]
}>()

function CloseSettings(): void {
  settings_open.value = false;

  emit('CloseSettings')
}

function Edit(md: any): void {
  content.value = md;

  emit('Edit', md)
}

function FeedPlayPause(): void {
  if (is_vue() != null) {if (showcaseBridge.feedSource == '' || showcaseBridge.streamText == showcaseBridge.feedSource) {showcaseBridge.reset(content.value);
  }showcaseBridge.playing = !showcaseBridge.playing;
  if (showcaseBridge.playing) {showcaseBridge.play();
  } else {showcaseBridge.stop();
  }} else {if (feed_source.value == '' || stream_text.value == feed_source.value) {feed_source.value = content.value;
  stream_text.value = '';
  }playing.value = !playing.value;
  }

  emit('FeedPlayPause')
}

function FeedReset(): void {
  if (is_vue() != null) {showcaseBridge.reset(content.value);
  } else {feed_source.value = content.value;
  stream_text.value = '';
  playing.value = false;
  }

  emit('FeedReset')
}

function FeedSetSpeed(v: any): void {
  speed.value = v;
  if (is_vue() != null) {showcaseBridge.speed = v;
  }

  emit('FeedSetSpeed', v)
}

function FeedStep(): void {
  if (is_vue() != null) {showcaseBridge.step();
  } else {if (feed_source.value.length > 0 && stream_text.value.length < feed_source.value.length) {stream_text.value = feed_source.value.substring(0, (0) + (Math.min(feed_source.value.length, stream_text.value.length + speed.value)));
  } else {playing.value = false;
  }}

  emit('FeedStep')
}

function OpenSettings(): void {
  settings_open.value = true;

  emit('OpenSettings')
}

function SetAccent(a: any): void {
  accent_color.value = a;

  emit('SetAccent', a); applyAccent(accent_color.value, document.documentElement.classList.contains('dark'))
}

function SetTheme(t: any): void {
  dark_mode.value = t == 'dark';

  emit('SetTheme', t)
}

function ToggleEdit(): void {
  show_edit.value = !show_edit.value;

  emit('ToggleEdit')
}

function ToggleStream(): void {
  show_stream.value = !show_stream.value;

  emit('ToggleStream')
}

function ToggleView(): void {
  show_view.value = !show_view.value;

  emit('ToggleView')
}

onMounted(() => {
  content.value = initial_content();
  if (is_vue() != null) {log_ready('init');
  }
})



// Plan 360: Accent color palette (aligned with auto-forge).
// Each entry maps a name → shadcn --primary HSL triplet (space-separated).
const ACCENT_PALETTES: Record<string, string> = {
  indigo: '239 84% 67%',
  // Plan 503: coral 校准至 stella-os 玫瑰粉 light #c4706a(dark +4 由 applyAccent 处理)。
  coral:  '4 43% 59%',
  ocean:  '217 91% 60%',
  sage:   '160 84% 39%',
  amber:  '38 92% 50%',
}
const ACCENT_NAMES = Object.keys(ACCENT_PALETTES)
const ACCENT_STORAGE_KEY = 'notes-accent-color'

/** Apply the named accent by writing the --primary CSS variable.
 *  Also adjusts lightness up slightly in dark mode for readability.
 *  HSL values are stored as "H S% L%" (shadcn format); the % is preserved
 *  so we use parseFloat to read the numeric part for the lightness tweak.
 *
 *  The variable is written to BOTH <html> AND any element carrying the
 *  `.dark` class. This is necessary because the generated dark-mode CSS
 *  puts `.dark { --primary: ... }` on a root wrapper div, which would
 *  otherwise shadow the value inherited from <html>. We use a microtask
 *  (setTimeout 0) for the .dark pass so Vue has flushed the :class change. */
function applyAccent(name: string, isDark = false): void {
  const hsl = ACCENT_PALETTES[name]
  if (!hsl) return
  let finalHsl = hsl
  // Dark mode: boost lightness ~4% for contrast against dark backgrounds.
  if (isDark) {
    const match = hsl.match(/^(\d+\s+[\d.]+%)\s+([\d.]+)%$/)
    if (match) {
      const boosted = Math.min(85, parseFloat(match[2]) + 4)
      finalHsl = match[1] + ' ' + boosted + '%'
    }
  }
  const root = document.documentElement
  root.style.setProperty('--primary', finalHsl)
  // Also set on any .dark element so it overrides the .dark { --primary }
  // rule defined in index.css (which lives on a different element than <html>).
  // Done synchronously AND on next tick (covers both: dark already applied,
  // and dark just toggled — Vue flushes :class after this call returns).
  // CRITICAL: in light mode (no .dark elements) we must also REMOVE any
  // stale inline --primary left over from a previous dark-mode apply, otherwise
  // the old value shadows the new <html>-level value via CSS inheritance.
  function applyToDark() {
    if (isDark) {
      document.querySelectorAll('.dark').forEach(function (el) {
        ;(el as HTMLElement).style.setProperty('--primary', finalHsl)
      })
    } else {
      // Light mode: clear any stale inline --primary on elements that
      // previously carried .dark (the wrapper still exists, just without .dark).
      // IMPORTANT: skip documentElement (html) — that's where we just set the
      // current value. Only clear child elements with a stale inline override.
      document.querySelectorAll('[style*="--primary"]').forEach(function (el) {
        if (el !== document.documentElement) {
          ;(el as HTMLElement).style.removeProperty('--primary')
        }
      })
    }
  }
  applyToDark()
  setTimeout(applyToDark, 0)
  try { localStorage.setItem(ACCENT_STORAGE_KEY, name) } catch {}
}

/** Read the saved accent from localStorage, or '' when nothing was persisted
 * (callers apply their own fallback — store default 'indigo', or the Plan 458
 * CLI/env-seeded value which must NOT be clobbered). */
function getSavedAccent(): string {
  try {
    const saved = localStorage.getItem(ACCENT_STORAGE_KEY)
    if (saved && ACCENT_PALETTES[saved]) return saved
  } catch {}
  return ''
}

/** List of accent names for UI rendering (swatch buttons). */
function getAccentNames(): string[] {
  return ACCENT_NAMES
}

// Restore saved accent on mount.
onMounted(() => {
  const saved = getSavedAccent()
  if (saved) {
    accent_color.value = saved
    applyAccent(saved, document.documentElement.classList.contains('dark'))
  }
})
// Plan 458: keep the accent and html dark class in sync across theme flips.
watch(dark_mode, (v) => {
  document.documentElement.classList.toggle('dark', v)
  applyAccent(accent_color.value, v)
}, { immediate: true })


</script>

<template>
    <div :class="[{ dark: dark_mode }, (dark_mode ? 'app app-dark' : 'app')]">
      <header class="toolbar">
        <div class="toolbar-inner">
          <span>AutoDown Showcase</span>
          <div class="toggles">
            <button :class="(show_edit ? 'toggle toggle-on toggle-edit' : 'toggle toggle-edit')" @click="ToggleEdit">edit</button>
            <button :class="(show_view ? 'toggle toggle-on toggle-view' : 'toggle toggle-view')" @click="ToggleView">view</button>
            <button :class="(show_stream ? 'toggle toggle-on toggle-stream' : 'toggle toggle-stream')" @click="ToggleStream">stream</button>
          </div>
          <div class="stream-controls">
            <template v-if="is_vue() != null">
              <button :class="(feed_playing ? 'ctrl-btn ctrl-on btn-play' : 'ctrl-btn btn-play')" @click="FeedPlayPause">▶</button>
            </template>
            <button class="ctrl-btn btn-step" @click="FeedStep">⏭</button>
            <button class="ctrl-btn btn-replay" @click="FeedReset">↻</button>
            <div class="speed-select">
              <button :class="(speed == 24 ? 'ctrl-btn speed-btn-on speed-lo' : 'ctrl-btn speed-lo')" @click="FeedSetSpeed(24)">慢</button>
              <button :class="(speed == 96 ? 'ctrl-btn speed-btn-on speed-mid' : 'ctrl-btn speed-mid')" @click="FeedSetSpeed(96)">中</button>
              <button :class="(speed == 384 ? 'ctrl-btn speed-btn-on speed-hi' : 'ctrl-btn speed-hi')" @click="FeedSetSpeed(384)">快</button>
            </div>
          </div>
          <button class="settings-trigger w-7 h-7 flex items-center justify-center rounded text-sm text-gray-500 hover:text-gray-900 bg-transparent border-none cursor-pointer" @click="OpenSettings">⚙</button>
        </div>
      </header>
      <SettingsPopover :accent_color="accent_color" :dark_mode="dark_mode" :open="settings_open" :key="'SettingsPopover-1'" @Close="CloseSettings" @SetAccent="SetAccent($event)" @SetTheme="SetTheme($event)" />
      <main class="workspace">
        <div class="flex flex-row h-full w-full">
          <template v-if="show_edit">
            <div class="flex flex-col flex-1 min-w-0 overflow-hidden col-edit">
              <div class="pane-header">
                <span>edit</span>
              </div>
              <AutoDownEditor :content="content" :placeholder="'Start typing...'" :can-edit="true" :show-actions="true" :dark-mode="dark_mode" :accent="accent_color" class="flex-1 min-h-0 overflow-hidden" @update:modelValue="Edit" :key="'AutoDownEditor-2'" />
            </div>
          </template>
          <template v-if="show_view">
            <div class="flex flex-col flex-1 min-w-0 overflow-hidden col-view">
              <div class="pane-header">
                <span>view</span>
              </div>
              <StreamingRenderer :source="content" :streaming="false" :scroll-sync="true" :dark-mode="dark_mode" :accent="accent_color" class="flex-1 min-h-0 overflow-hidden py-4 px-5" :key="'StreamingRenderer-3'" />
            </div>
          </template>
          <template v-if="show_stream">
            <div class="flex flex-col flex-1 min-w-0 overflow-hidden col-stream">
              <div class="pane-header">
                <span>stream</span>
                <span class="pane-status">
                  <span>{{ stream_status }}</span>
                </span>
              </div>
              <StreamingRenderer :source="feed_text" :streaming="true" :scroll-sync="true" :dark-mode="dark_mode" :accent="accent_color" class="flex-1 min-h-0 overflow-hidden py-4 px-5" :key="'StreamingRenderer-4'" />
            </div>
          </template>
        </div>
      </main>
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

        .toolbar {
            flex-shrink: 0;
            height: 48px;
            display: flex;
            align-items: center;
            padding: 0 1.25rem;
            border-bottom: 1px solid #e5e7eb;
            background: #fff;
            font-weight: 600;
            font-size: 1rem;
        }

        .toolbar-inner {
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .toggles {
            display: flex;
            gap: 8px;
        }

        .toggle {
            padding: 4px 12px;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            background: #fff;
            color: #374151;
            font-size: 13px;
            cursor: pointer;
        }

        .toggle-on {
            background: #6366f1;
            border-color: #6366f1;
            color: #fff;
        }

        .workspace {
            position: relative;
            flex: 1;
            min-height: 0;
            overflow: hidden;
        }

        .stream-controls {
            display: flex;
            gap: 6px;
            align-items: center;
        }

        .ctrl-btn {
            padding: 4px 10px;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            background: #fff;
            color: #374151;
            font-size: 12px;
            cursor: pointer;
        }

        .ctrl-on {
            background: #10b981;
            border-color: #10b981;
            color: #fff;
        }

        .speed-select {
            display: flex;
            gap: 4px;
            margin-left: 4px;
        }

        .speed-btn-on {
            background: #6366f1;
            border-color: #6366f1;
            color: #fff;
        }

        .pane-header {
            flex-shrink: 0;
            height: 32px;
            display: flex;
            align-items: center;
            padding: 0 12px;
            font-size: 12px;
            font-weight: 600;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: #6b7280;
            background: #f3f4f6;
            border-bottom: 1px solid #e5e7eb;
        }

        /* PLAN-059 T7: 深档 chrome（051 demo .app-dark 同款 + showcase
         * 控件组的 zinc 深档覆写，值=Design 22 §7.1 深列）。 */
        .app-dark {
            color: #f4f4f5;
            background: #09090b;
        }

        .app-dark .toolbar {
            border-bottom-color: #27272a;
            background: #18181b;
        }

        .app-dark .pane-header {
            color: #a1a1aa;
            background: #18181b;
            border-bottom-color: #27272a;
        }

        .app-dark .toggle,
        .app-dark .ctrl-btn {
            background: #27272a;
            border-color: #3f3f46;
            color: #d4d4d8;
        }

        .app-dark .toggle-on,
        .app-dark .ctrl-on,
        .app-dark .speed-btn-on {
            background: #6366f1;
            border-color: #6366f1;
            color: #fff;
        }

        .settings-trigger {
            border: none;
            background: transparent;
            cursor: pointer;
        }

        .pane-status {
            margin-left: auto;
            font-weight: 400;
            text-transform: none;
            letter-spacing: 0;
            font-size: 11px;
            color: #6b7280;
        }

        /* Utility classes (vue track: the DSL maps row/col/flex-1 to real
         * CSS via these scoped rules — demo app.at precedent; VM track
         * consumes row/col/flex-1 natively, unknown tokens zero-effect). */
        .flex {
            display: flex;
        }

        .flex-row {
            flex-direction: row;
        }

        .flex-col {
            flex-direction: column;
        }

        .flex-1 {
            flex: 1 1 0%;
        }

        .h-full {
            height: 100%;
        }

        .w-full {
            width: 100%;
        }

        .min-w-0 {
            min-width: 0;
        }

        .min-h-0 {
            min-height: 0;
        }

        .overflow-hidden {
            overflow: hidden;
        }

        .px-5 {
            padding-left: 1.25rem;
            padding-right: 1.25rem;
        }

        .py-4 {
            padding-top: 1rem;
            padding-bottom: 1rem;
        }

        :deep(.autodown-editor) {
            border: none;
            border-radius: 0;
        }

        :deep(.autodown-editor-content-wrapper) {
            height: 100%;
            overflow-y: auto;
        }
    </style>
