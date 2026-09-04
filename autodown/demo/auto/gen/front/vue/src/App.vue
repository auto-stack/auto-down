<!-- App component - Auto-generated from Auto language -->
<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { AutoDownEditor, StreamingRenderer } from '@autodown/engine'

import { initial_content } from '@/ext/src/front/utils/app_ext'
import { logSave, logCancel, is_vue } from '@/ext/src/front/utils/app_ext'
import { useDemoAppBridge } from '@/ext/src/front/utils/app_ext'

const demoAppBridge = useDemoAppBridge()

import CustomScrollbar from '@/components/CustomScrollbar.vue'
import SettingsPopover from '@/components/SettingsPopover.vue'


const content = ref<string>('')
const hovering_splitter = ref<number>(0)
const ghost_id = ref<string>('')
const ghost_height = ref<number>(0)
const left_top = ref<number>(0)
const left_height = ref<number>(0)
const left_client = ref<number>(0)
const right_top = ref<number>(0)
const right_height = ref<number>(0)
const right_client = ref<number>(0)
const table_widths = ref<any>({})
const dark_mode = ref<boolean>(false)
const accent_color = ref<string>('indigo')
const settings_open = ref<boolean>(false)
// Plan 458: seed theme default from index.html bootstrap.
if ((window as any).__AUTO_UI_THEME__ === 'light' || (window as any).__AUTO_UI_THEME__ === 'dark') dark_mode.value = (window as any).__AUTO_UI_THEME__ === 'dark'
// Plan 458: seed accent default from index.html bootstrap.
if (typeof (window as any).__AUTO_UI_ACCENT__ === 'string') accent_color.value = (window as any).__AUTO_UI_ACCENT__

const workspaceRef = ref<HTMLElement | null>(null)
const editorRef = ref<any>(null)
const rendererRef = ref<any>(null)

const placeholder_id = computed<any>(() => (is_vue() != null ? (demoAppBridge.editingBlock != null ? demoAppBridge.editingBlock.id : null) : (!!(ghost_id.value) ? ghost_id.value : null)))
const placeholder_height = computed<any>(() => (is_vue() != null ? (demoAppBridge.editingBlock != null ? demoAppBridge.editingBlock.height : null) : (!!(ghost_id.value) ? ghost_height.value : null)))
const csb_top = computed<any>(() => (is_vue() != null ? demoAppBridge.scrollTop : left_top.value))
const csb_height = computed<any>(() => (is_vue() != null ? demoAppBridge.scrollHeight : left_height.value))
const csb_client = computed<any>(() => (is_vue() != null ? demoAppBridge.clientHeight : left_client.value))

const emit = defineEmits<{
  Init: []
  handleSave: [string]
  handleCancel: []
  Edit: [string]
  SetScrollTop: [number]
  SplitterHover: [number]
  OnLeftScroll: [number, number, number]
  OnRightScroll: [number, number, number]
  ToggleDetails: [string]
  OpenSettings: []
  CloseSettings: []
  SetTheme: [string]
  SetAccent: [string]
  OnEditorFocus: [number]
  OnColResize: [string, number, number]
}>()

function CloseSettings(): void {
  settings_open.value = false;

  emit('CloseSettings')
}

function Edit(md: any): void {
  content.value = md;

  emit('Edit', md)
}

function OnColResize(tbl: any, col: any, w: any): void {

  emit('OnColResize', tbl, col, w)
}

function OnEditorFocus(blk: any): void {
  if (is_vue() != null) {demoAppBridge.editingBlock = blk;
  }

  emit('OnEditorFocus', blk)
}

function OnLeftScroll(h: any, c: any, sy: any): void {


  left_top.value = sy;
  left_height.value = h;
  left_client.value = c;

  emit('OnLeftScroll', h, c, sy)
}

function OnRightScroll(h: any, c: any, sy: any): void {
  right_top.value = sy;
  right_height.value = h;
  right_client.value = c;

  emit('OnRightScroll', h, c, sy)
}

function OpenSettings(): void {
  settings_open.value = true;

  emit('OpenSettings')
}

function SetAccent(a: any): void {
  accent_color.value = a;

  emit('SetAccent', a); applyAccent(accent_color.value, document.documentElement.classList.contains('dark'))
}

function SetScrollTop(v: any): void {
  if (is_vue() != null) {demoAppBridge.setScrollTop(v);
  } else {

  left_top.value = v;
  }

  emit('SetScrollTop', v)
}

function SetTheme(t: any): void {
  dark_mode.value = t == 'dark';

  emit('SetTheme', t)
}

function SplitterHover(v: any): void {
  hovering_splitter.value = v;

  emit('SplitterHover', v)
}

function ToggleDetails(key: any): void {
  let d = content.value.indexOf('$details(');
  if (d >= 0) {let close = content.value.indexOf(') {');
  if (close >= 0 && close > d) {if (content.value.includes('open:true')) {content.value = content.value.replaceAll(', open:true', '');
  } else {let head = content.value.substring(0, close);
  let tail = content.value.substring(close);
  content.value = head + ', open:true' + tail;
  }}}

  emit('ToggleDetails', key)
}

function handleCancel(): void {
  logCancel();

  emit('handleCancel')
}

function handleSave(md: any): void {
  logSave(md);

  emit('handleSave', md)
}

onMounted(() => {
  content.value = initial_content();
  if (is_vue() != null) {demoAppBridge.workspaceRef = workspaceRef.value!;
  demoAppBridge.editorRef = editorRef.value!;
  demoAppBridge.rendererRef = rendererRef.value!;
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
        <div class="w-full flex items-center justify-between">
          <span>AutoDown v0.1</span>
          <button class="settings-trigger w-7 h-7 flex items-center justify-center rounded text-sm text-gray-500 hover:text-gray-900 bg-transparent border-none cursor-pointer" @click="OpenSettings">⚙</button>
        </div>
      </header>
      <SettingsPopover :accent_color="accent_color" :dark_mode="dark_mode" :open="settings_open" :key="'SettingsPopover-1'" @Close="CloseSettings" @SetAccent="SetAccent($event)" @SetTheme="SetTheme($event)" />
      <main class="workspace" ref="workspaceRef">
        <div class="flex flex-row h-full w-full">
          <div class="flex flex-col flex-1 min-w-0 overflow-hidden border-r left">
            <AutoDownEditor ref="editorRef" :content="content" :placeholder="'Start typing...'" :can-edit="true" :show-actions="true" :dark-mode="dark_mode" :accent="accent_color" class="flex-1 min-h-0 overflow-hidden" @cancel="handleCancel" @focusblock="OnEditorFocus($event)" @update:modelValue="Edit" @save="handleSave($event)" @scroll="OnLeftScroll" :key="'AutoDownEditor-2'" />
          </div>
          <div class="flex flex-col flex-1 min-w-0 overflow-hidden right">
            <StreamingRenderer ref="rendererRef" :source="content" :streaming="false" :placeholder-block-id="placeholder_id" :placeholder-height="placeholder_height" :scroll-sync="true" :dark-mode="dark_mode" :accent="accent_color" class="flex-1 min-h-0 overflow-hidden py-4 px-5" @colresize="OnColResize" @detailsclick="ToggleDetails" @scroll="OnRightScroll" :key="'StreamingRenderer-3'" />
          </div>
        </div>
        <div class="splitter-hover-zone" @mouseenter="SplitterHover(1)" @mouseleave="SplitterHover(0)" />
        <CustomScrollbar :clientHeight="csb_client" :is_vm="is_vue() == null" :scrollHeight="csb_height" :scrollTop="csb_top" :visible="hovering_splitter == 1" :key="'CustomScrollbar-4'" @update:scrollTop="SetScrollTop($event)" />
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

        .workspace {
            position: relative;
            flex: 1;
            min-height: 0;
            overflow: hidden;
        }

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

        .border-r {
            border-right: 1px solid #e5e7eb;
        }

        .py-4 {
            padding-top: 1rem;
            padding-bottom: 1rem;
        }

        .px-5 {
            padding-left: 1.25rem;
            padding-right: 1.25rem;
        }

        :deep(.autodown-editor) {
            border: none;
            border-radius: 0;
        }

        :deep(.autodown-editor-content-wrapper) {
            height: 100%;
            overflow-y: auto;
            scrollbar-width: none;
            -ms-overflow-style: none;
        }

        :deep(.autodown-editor-content-wrapper)::-webkit-scrollbar {
            display: none;
        }

        :deep(.streaming-document) {
            height: 100%;
            overflow-y: auto;
            scrollbar-width: none;
            -ms-overflow-style: none;
            /* Create a block formatting context so child margins do not collapse
               through the top padding of the scrolling container. */
            display: flow-root;
        }

        :deep(.streaming-document)::-webkit-scrollbar {
            display: none;
        }

        .splitter-hover-zone {
            position: absolute;
            top: 0;
            bottom: 0;
            left: 50%;
            width: 16px;
            transform: translateX(-50%);
            z-index: 11;
            cursor: default;
            background: transparent;
            pointer-events: auto;
        }

        .splitter-hover-zone::after {
            content: '';
            position: absolute;
            top: 0;
            bottom: 0;
            left: 50%;
            width: 1px;
            background: rgba(0, 0, 0, 0.12);
            opacity: 0;
            transition: opacity 0.15s ease;
        }

        .splitter-hover-zone:hover::after {
            opacity: 1;
        }

        /* PLAN-051 T5: 深色档 app chrome（.app-dark 由视图树条件类挂上——
           声明式，两轨可见；VM 轨不吃这些规则，其 chrome 走 D-GAP 全局
           主题）。值=Design 22 §7.1 深档（zinc 系，VM 基准）。 */
        .app-dark {
            color: #f4f4f5;
            background: #09090b;
        }

        .app-dark .toolbar {
            border-bottom-color: #27272a;
            background: #18181b;
        }

        .app-dark .border-r {
            border-right-color: #27272a;
        }

        .app-dark .splitter-hover-zone::after {
            background: rgba(255, 255, 255, 0.15);
        }

        /* PLAN-051 T6: ⚙ 钮兜底（demo 无 tailwind 运行时）。 */
        .settings-trigger {
            border: none;
            background: transparent;
            cursor: pointer;
            font-family: inherit;
            line-height: 1;
        }

        .w-7 {
            width: 1.75rem;
        }

        .h-7 {
            height: 1.75rem;
        }

        .text-sm {
            font-size: 0.875rem;
        }

        .cursor-pointer {
            cursor: pointer;
        }

        .hover\:text-gray-900:hover {
            color: #111827;
        }
    </style>
