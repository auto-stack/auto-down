<!-- App.vue — gallery vue 臂壳（PLAN-072 T-01）。
     单元路由 = ?unit= 查询参数（gate 深链接口径）；真件 SFC 每单元一页。 -->
<script setup lang="ts">
import { ref } from 'vue'
import StatusBarPage from './pages/StatusBarPage.vue'
import OutlinePage from './pages/OutlinePage.vue'
import TabStripPage from './pages/TabStripPage.vue'
import BacklinksPage from './pages/BacklinksPage.vue'
import OutgoingLinksPage from './pages/OutgoingLinksPage.vue'
import UnlinkedReferencesPage from './pages/UnlinkedReferencesPage.vue'
import MenubarPage from './pages/MenubarPage.vue'
import FiletreePage from './pages/FiletreePage.vue'
import QuickSwitcherPage from './pages/QuickSwitcherPage.vue'
import SearchPanelPage from './pages/SearchPanelPage.vue'
import CommandPalettePage from './pages/CommandPalettePage.vue'
import CreatePagePromptPage from './pages/CreatePagePromptPage.vue'
import ThemePopoverPage from './pages/ThemePopoverPage.vue'
import RecentFilesPage from './pages/RecentFilesPage.vue'
import AgendaPage from './pages/AgendaPage.vue'
import FlashcardPage from './pages/FlashcardPage.vue'
import WorkspaceOpenerPage from './pages/WorkspaceOpenerPage.vue'
import PropertiesPanelPage from './pages/PropertiesPanelPage.vue'
import GraphSidebarPage from './pages/GraphSidebarPage.vue'
import GraphControlsPage from './pages/GraphControlsPage.vue'
import GraphViewPage from './pages/GraphViewPage.vue'

const unit = ref(new URLSearchParams(location.search).get('unit') ?? 'status_bar')

function select(u: string) {
  unit.value = u
  history.replaceState(null, '', `?unit=${u}`)
}
</script>

<template>
  <div class="flex h-screen flex-col bg-background text-foreground">
    <header class="flex h-9 shrink-0 items-center gap-2 border-b px-3">
      <span class="text-xs font-semibold text-zinc-700">component-gallery · vue 臂（真件 SFC）</span>
      <button
        data-unit-tab="status_bar"
        class="rounded px-1.5 text-[11px] hover:bg-accent"
        :class="unit === 'status_bar' ? 'text-foreground' : 'text-zinc-400'"
        @click="select('status_bar')"
      >
        status_bar
      </button>
      <button
        data-unit-tab="outline"
        class="rounded px-1.5 text-[11px] hover:bg-accent"
        :class="unit === 'outline' ? 'text-foreground' : 'text-zinc-400'"
        @click="select('outline')"
      >
        outline
      </button>
      <button
        data-unit-tab="tab_strip"
        class="rounded px-1.5 text-[11px] hover:bg-accent"
        :class="unit === 'tab_strip' ? 'text-foreground' : 'text-zinc-400'"
        @click="select('tab_strip')"
      >
        tab_strip
      </button>
      <button
        data-unit-tab="backlinks"
        class="rounded px-1.5 text-[11px] hover:bg-accent"
        :class="unit === 'backlinks' ? 'text-foreground' : 'text-zinc-400'"
        @click="select('backlinks')"
      >
        backlinks
      </button>
      <button
        data-unit-tab="outgoing_links"
        class="rounded px-1.5 text-[11px] hover:bg-accent"
        :class="unit === 'outgoing_links' ? 'text-foreground' : 'text-zinc-400'"
        @click="select('outgoing_links')"
      >
        outgoing_links
      </button>
      <button
        data-unit-tab="unlinked_references"
        class="rounded px-1.5 text-[11px] hover:bg-accent"
        :class="unit === 'unlinked_references' ? 'text-foreground' : 'text-zinc-400'"
        @click="select('unlinked_references')"
      >
        unlinked_references
      </button>
      <!-- PLAN-076 T-01 注：此处 menubar 按钮缺 `<button` 开标签（073/074
           merge 胶水残留——gate 深链不走 tab 条故未红）；本批顺手修复。 -->
      <button
        data-unit-tab="menubar"
        class="rounded px-1.5 text-[11px] hover:bg-accent"
        :class="unit === 'menubar' ? 'text-foreground' : 'text-zinc-400'"
        @click="select('menubar')"
      >
        menubar
      </button>
      <button
        data-unit-tab="filetree"
        class="rounded px-1.5 text-[11px] hover:bg-accent"
        :class="unit === 'filetree' ? 'text-foreground' : 'text-zinc-400'"
        @click="select('filetree')"
      >
        filetree
      </button>
      <button
        data-unit-tab="quick_switcher"
        class="rounded px-1.5 text-[11px] hover:bg-accent"
        :class="unit === 'quick_switcher' ? 'text-foreground' : 'text-zinc-400'"
        @click="select('quick_switcher')"
      >
        quick_switcher
      </button>
      <button
        data-unit-tab="search_panel"
        class="rounded px-1.5 text-[11px] hover:bg-accent"
        :class="unit === 'search_panel' ? 'text-foreground' : 'text-zinc-400'"
        @click="select('search_panel')"
      >
        search_panel
      </button>
      <button
        data-unit-tab="command_palette"
        class="rounded px-1.5 text-[11px] hover:bg-accent"
        :class="unit === 'command_palette' ? 'text-foreground' : 'text-zinc-400'"
        @click="select('command_palette')"
      >
        command_palette
      </button>
      <button
        data-unit-tab="create_page_prompt"
        class="rounded px-1.5 text-[11px] hover:bg-accent"
        :class="unit === 'create_page_prompt' ? 'text-foreground' : 'text-zinc-400'"
        @click="select('create_page_prompt')"
      >
        create_page_prompt
      </button>
      <button
        data-unit-tab="theme_popover"
        class="rounded px-1.5 text-[11px] hover:bg-accent"
        :class="unit === 'theme_popover' ? 'text-foreground' : 'text-zinc-400'"
        @click="select('theme_popover')"
      >
        theme_popover
      </button>
      <button
        data-unit-tab="recent_files"
        class="rounded px-1.5 text-[11px] hover:bg-accent"
        :class="unit === 'recent_files' ? 'text-foreground' : 'text-zinc-400'"
        @click="select('recent_files')"
      >
        recent_files
      </button>
      <button
        data-unit-tab="agenda"
        class="rounded px-1.5 text-[11px] hover:bg-accent"
        :class="unit === 'agenda' ? 'text-foreground' : 'text-zinc-400'"
        @click="select('agenda')"
      >
        agenda
      </button>
      <button
        data-unit-tab="flashcard_modal"
        class="rounded px-1.5 text-[11px] hover:bg-accent"
        :class="unit === 'flashcard_modal' ? 'text-foreground' : 'text-zinc-400'"
        @click="select('flashcard_modal')"
      >
        flashcard_modal
      </button>
      <button
        data-unit-tab="workspace_opener"
        class="rounded px-1.5 text-[11px] hover:bg-accent"
        :class="unit === 'workspace_opener' ? 'text-foreground' : 'text-zinc-400'"
        @click="select('workspace_opener')"
      >
        workspace_opener
      </button>
      <button
        data-unit-tab="properties_panel"
        class="rounded px-1.5 text-[11px] hover:bg-accent"
        :class="unit === 'properties_panel' ? 'text-foreground' : 'text-zinc-400'"
        @click="select('properties_panel')"
      >
        properties_panel
      </button>
      <button
        data-unit-tab="graph_sidebar"
        class="rounded px-1.5 text-[11px] hover:bg-accent"
        :class="unit === 'graph_sidebar' ? 'text-foreground' : 'text-zinc-400'"
        @click="select('graph_sidebar')"
      >
        graph_sidebar
      </button>
      <button
        data-unit-tab="graph_controls"
        class="rounded px-1.5 text-[11px] hover:bg-accent"
        :class="unit === 'graph_controls' ? 'text-foreground' : 'text-zinc-400'"
        @click="select('graph_controls')"
      >
        graph_controls
      </button>
      <span class="ml-auto text-[11px] text-zinc-400" data-current-unit>{{ unit }}</span>
    </header>
    <StatusBarPage v-if="unit === 'status_bar'" />
    <OutlinePage v-else-if="unit === 'outline'" />
    <TabStripPage v-else-if="unit === 'tab_strip'" />
    <BacklinksPage v-else-if="unit === 'backlinks'" />
    <OutgoingLinksPage v-else-if="unit === 'outgoing_links'" />
    <UnlinkedReferencesPage v-else-if="unit === 'unlinked_references'" />
    <MenubarPage v-else-if="unit === 'menubar'" />
    <FiletreePage v-else-if="unit === 'filetree'" />
    <QuickSwitcherPage v-else-if="unit === 'quick_switcher'" />
    <SearchPanelPage v-else-if="unit === 'search_panel'" />
    <CommandPalettePage v-else-if="unit === 'command_palette'" />
    <CreatePagePromptPage v-else-if="unit === 'create_page_prompt'" />
    <ThemePopoverPage v-else-if="unit === 'theme_popover'" />
    <RecentFilesPage v-else-if="unit === 'recent_files'" />
    <AgendaPage v-else-if="unit === 'agenda'" />
    <FlashcardPage v-else-if="unit === 'flashcard_modal'" />
    <WorkspaceOpenerPage v-else-if="unit === 'workspace_opener'" />
    <PropertiesPanelPage v-else-if="unit === 'properties_panel'" />
    <GraphSidebarPage v-else-if="unit === 'graph_sidebar'" />
    <GraphControlsPage v-else-if="unit === 'graph_controls'" />
    <GraphViewPage v-else-if="unit === 'graph_view'" />
  </div>
</template>
