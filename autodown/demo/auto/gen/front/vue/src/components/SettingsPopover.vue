<!-- SettingsPopover component - Auto-generated from Auto language -->
<script setup lang="ts">

const props = withDefaults(defineProps<{
  open?: boolean
  dark_mode?: boolean
  accent_color?: string
}>(), {
  open: false,
  dark_mode: false,
  accent_color: 'indigo',
})

const emit = defineEmits<{
  Close: []
  SetTheme: [string]
  SetAccent: [string]
}>()

function Close(): void {
  emit('Close')
}

function SetAccent(arg0: any): void {
  emit('SetAccent', arg0)
}

function SetTheme(arg0: any): void {
  emit('SetTheme', arg0)
}


</script>

<template>
    <template v-if="open">
      <div :class="(dark_mode ? 'settings-popover flex flex-col gap-3 mt-4 p-3.5 w-64 bg-zinc-900 border border-zinc-700 rounded-xl shadow-lg' : 'settings-popover flex flex-col gap-3 mt-4 p-3.5 w-64 bg-white border border-gray-200 rounded-xl shadow-lg')">
        <div class="flex items-center justify-between">
          <span :class="(dark_mode ? 'text-xs font-semibold text-zinc-400 uppercase tracking-wider' : 'text-xs font-semibold text-gray-500 uppercase tracking-wider')">Settings</span>
          <button :class="(dark_mode ? 'settings-btn flex items-center justify-center w-5 h-5 rounded text-xs text-zinc-400 hover:text-zinc-100 bg-transparent border-none' : 'settings-btn flex items-center justify-center w-5 h-5 rounded text-xs text-gray-500 hover:text-gray-900 bg-transparent border-none')" @click="Close">✕</button>
        </div>
        <div class="flex flex-col gap-1.5">
          <span :class="(dark_mode ? 'text-xs text-zinc-400 font-medium' : 'text-xs text-gray-500 font-medium')">Theme</span>
          <div class="flex gap-2">
            <button :class="(dark_mode ? 'settings-btn flex-1 py-1 px-2 text-xs font-medium rounded-md bg-indigo-600 text-white border-none' : 'settings-btn flex-1 py-1 px-2 text-xs font-medium rounded-md text-gray-500 bg-transparent border border-gray-200')" @click="SetTheme('dark')">🌙 Dark</button>
            <button :class="(dark_mode ? 'settings-btn flex-1 py-1 px-2 text-xs font-medium rounded-md text-zinc-400 bg-transparent border border-zinc-700' : 'settings-btn flex-1 py-1 px-2 text-xs font-medium rounded-md bg-indigo-600 text-white border-none')" @click="SetTheme('light')">☀ Light</button>
          </div>
        </div>
        <div class="flex flex-col gap-1.5">
          <span :class="(dark_mode ? 'text-xs text-zinc-400 font-medium' : 'text-xs text-gray-500 font-medium')">Accent</span>
          <div class="flex items-center gap-3 py-1">
            <button :class="(accent_color == 'indigo' ? 'settings-btn w-6 h-6 p-0 rounded-full bg-indigo-500 border-2 border-gray-700' : 'settings-btn w-6 h-6 p-0 rounded-full bg-indigo-500 opacity-50 border-none')" @click="SetAccent('indigo')"></button>
            <button :class="(accent_color == 'coral' ? 'settings-btn w-6 h-6 p-0 rounded-full bg-rose-500 border-2 border-gray-700' : 'settings-btn w-6 h-6 p-0 rounded-full bg-rose-500 opacity-50 border-none')" @click="SetAccent('coral')"></button>
            <button :class="(accent_color == 'ocean' ? 'settings-btn w-6 h-6 p-0 rounded-full bg-sky-500 border-2 border-gray-700' : 'settings-btn w-6 h-6 p-0 rounded-full bg-sky-500 opacity-50 border-none')" @click="SetAccent('ocean')"></button>
            <button :class="(accent_color == 'sage' ? 'settings-btn w-6 h-6 p-0 rounded-full bg-emerald-500 border-2 border-gray-700' : 'settings-btn w-6 h-6 p-0 rounded-full bg-emerald-500 opacity-50 border-none')" @click="SetAccent('sage')"></button>
            <button :class="(accent_color == 'amber' ? 'settings-btn w-6 h-6 p-0 rounded-full bg-amber-500 border-2 border-gray-700' : 'settings-btn w-6 h-6 p-0 rounded-full bg-amber-500 opacity-50 border-none')" @click="SetAccent('amber')"></button>
          </div>
        </div>
      </div>
    </template>

</template>

<style>
/* Component styles */

</style>

<style scoped>

        /* vue 兜底：demo 无 tailwind 运行时，本件用到的工具类在此 scoped
           定义（VM 轨经 auto-lang tailwind 解析器原生消费同名类，值同源
           Design 22 §7.1）。先 button 基座重置，再布局/色值。 */
        .settings-popover button {
            border: none;
            background: transparent;
            cursor: pointer;
            font-family: inherit;
            line-height: 1;
        }

        .flex {
            display: flex;
        }

        .flex-col {
            flex-direction: column;
        }

        .items-center {
            align-items: center;
        }

        .justify-between {
            justify-content: space-between;
        }

        .flex-1 {
            flex: 1 1 0%;
        }

        .gap-3 {
            gap: 0.75rem;
        }

        .gap-2 {
            gap: 0.5rem;
        }

        .gap-1\.5 {
            gap: 0.375rem;
        }

        .mt-4 {
            margin-top: 1rem;
        }

        .p-3\.5 {
            padding: 0.875rem;
        }

        .py-1 {
            padding-top: 0.25rem;
            padding-bottom: 0.25rem;
        }

        .px-2 {
            padding-left: 0.5rem;
            padding-right: 0.5rem;
        }

        .p-0 {
            padding: 0;
        }

        .w-64 {
            width: 16rem;
        }

        .w-5 {
            width: 1.25rem;
        }

        .w-6 {
            width: 1.5rem;
        }

        .h-5 {
            height: 1.25rem;
        }

        .h-6 {
            height: 1.5rem;
        }

        .rounded {
            border-radius: 0.25rem;
        }

        .rounded-md {
            border-radius: 0.375rem;
        }

        .rounded-full {
            border-radius: 9999px;
        }

        .border {
            border-width: 1px;
            border-style: solid;
        }

        .border-none {
            border: none;
        }

        .rounded-xl {
            border-radius: 0.75rem;
        }

        .shadow-lg {
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1);
        }

        .text-xs {
            font-size: 0.75rem;
        }

        .font-medium {
            font-weight: 500;
        }

        .font-semibold {
            font-weight: 600;
        }

        .uppercase {
            text-transform: uppercase;
        }

        .tracking-wider {
            letter-spacing: 0.05em;
        }

        .bg-white {
            background: #ffffff;
        }

        .bg-zinc-900 {
            background: #18181b;
        }

        .bg-transparent {
            background: transparent;
        }

        .bg-indigo-500 {
            background: #6366f1;
        }

        .bg-indigo-600 {
            background: #4f46e5;
        }

        .bg-rose-500 {
            background: #f43f5e;
        }

        .bg-sky-500 {
            background: #0ea5e9;
        }

        .bg-emerald-500 {
            background: #10b981;
        }

        .bg-amber-500 {
            background: #f59e0b;
        }

        .text-white {
            color: #ffffff;
        }

        .text-gray-500 {
            color: #6b7280;
        }

        .text-gray-900 {
            color: #111827;
        }

        .text-zinc-400 {
            color: #a1a1aa;
        }

        .text-zinc-100 {
            color: #f4f4f5;
        }

        .border-gray-200 {
            border-color: #e5e7eb;
        }

        .border-zinc-700 {
            border-color: #3f3f46;
        }

        .border-2 {
            border-width: 2px;
            border-style: solid;
        }

        .border-gray-700 {
            border-color: #374151;
        }

        .opacity-50 {
            opacity: 0.5;
        }

        .hover\:text-gray-900:hover {
            color: #111827;
        }

        .hover\:text-zinc-100:hover {
            color: #f4f4f5;
        }
    </style>
