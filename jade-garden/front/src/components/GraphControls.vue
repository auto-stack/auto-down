<!-- GraphControls component - Auto-generated from Auto language -->
<script setup lang="ts">
import { computed } from 'vue'
import { RangeInput } from '../../auto/src/front/utils/graph_controls_ext'
import { centerLabel, opacityLabel, eventNumber, eventValue, eventChecked, setGraphNumber, setGraphFlag, resetGraphSettings, Search, SlidersHorizontal, Palette, Magnet, Focus } from '../../auto/src/front/utils/graph_controls_ext'
import { useGraphStore } from '../../auto/src/front/utils/graph_controls_ext'

const graphStore = useGraphStore()


const center_label = computed<any>(() => centerLabel(graphStore))
const opacity_label = computed<any>(() => opacityLabel(graphStore))

const emit = defineEmits<{
  SearchInput: [any]
  SliderChanged: [any, any]
  DepthChanged: [any]
  FlagChanged: [any, any]
  ShowGlobal: []
  Reset: []
}>()

function SliderChanged(key: any, evt: any): void {
  setGraphNumber(graphStore, key, eventNumber(evt));
  graphStore.saveSettings();

  emit('SliderChanged', key, evt)
}

function ShowGlobal(): void {
  graphStore.showGlobal();

  emit('ShowGlobal')
}

function FlagChanged(key: any, evt: any): void {
  setGraphFlag(graphStore, key, eventChecked(evt));
  graphStore.saveSettings();

  emit('FlagChanged', key, evt)
}

function Reset(): void {
  resetGraphSettings(graphStore);

  emit('Reset')
}

function SearchInput(e: any): void {
  graphStore.searchQuery = eventValue(e);

  emit('SearchInput', e)
}

function DepthChanged(e: any): void {
  graphStore.depth = eventNumber(e);

  emit('DepthChanged', e)
}


</script>

<template>
    <div class="graph-controls flex flex-col gap-4 p-3 text-sm">
      <div class="section">
        <div class="section-title">
          <component :is="(Search) as any" class="h-3.5 w-3.5" />
          <span>
            <span>搜索</span>
          </span>
        </div>
        <input class="graph-input" :value="graphStore.searchQuery" :placeholder="'搜索节点…'" :type="'text'" @input="SearchInput($event)" />
      </div>
      <template v-if="graphStore.centerPath">
        <div class="section">
          <div class="section-title">
            <component :is="(Focus) as any" class="h-3.5 w-3.5" />
            <span>
              <span>局部图谱</span>
            </span>
          </div>
          <div class="text-xs text-muted-foreground truncate">
            <span>中心：{{ center_label }}</span>
          </div>
          <label class="slider-row">
            <span>
              <span>深度</span>
            </span>
            <RangeInput :step="'1'" :max="'3'" :min="'1'" :value="graphStore.depth" :key="'RangeInput-1'" @input="DepthChanged($event)" />
            <span class="value">
              <span>{{ graphStore.depth }}</span>
            </span>
          </label>
          <button class="graph-btn" @click="ShowGlobal">
            <span>返回全局</span>
          </button>
        </div>
      </template>
      <div class="section">
        <div class="section-title">
          <component :is="(SlidersHorizontal) as any" class="h-3.5 w-3.5" />
          <span>
            <span>筛选</span>
          </span>
        </div>
        <label class="control-row">
          <span>
            <span>显示孤立文件</span>
          </span>
          <input class="toggle" :type="'checkbox'" :checked="graphStore.settings.showOrphans" @change="FlagChanged('showOrphans', $event)" />
        </label>
        <label class="control-row">
          <span>
            <span>显示缺失页面</span>
          </span>
          <input class="toggle" :type="'checkbox'" :checked="graphStore.settings.showMissing" @change="FlagChanged('showMissing', $event)" />
        </label>
      </div>
      <div class="section">
        <div class="section-title">
          <component :is="(Palette) as any" class="h-3.5 w-3.5" />
          <span>
            <span>外观</span>
          </span>
        </div>
        <label class="slider-row">
          <span>
            <span>节点大小</span>
          </span>
          <RangeInput :step="'1'" :min="'4'" :value="graphStore.settings.nodeSize" :max="'40'" :key="'RangeInput-2'" @input="SliderChanged('nodeSize', $event)" />
          <span class="value">
            <span>{{ graphStore.settings.nodeSize }}</span>
          </span>
        </label>
        <label class="slider-row">
          <span>
            <span>文本透明度</span>
          </span>
          <RangeInput :max="'1'" :value="graphStore.settings.textOpacity" :min="'0'" :step="'0.05'" :key="'RangeInput-3'" @input="SliderChanged('textOpacity', $event)" />
          <span class="value">
            <span>{{ opacity_label }}</span>
          </span>
        </label>
        <label class="slider-row">
          <span>
            <span>连线粗细</span>
          </span>
          <RangeInput :max="'5'" :step="'0.5'" :min="'0.5'" :value="graphStore.settings.edgeWidth" :key="'RangeInput-4'" @input="SliderChanged('edgeWidth', $event)" />
          <span class="value">
            <span>{{ graphStore.settings.edgeWidth }}</span>
          </span>
        </label>
        <label class="control-row">
          <span>
            <span>显示箭头</span>
          </span>
          <input class="toggle" :checked="graphStore.settings.showArrows" :type="'checkbox'" @change="FlagChanged('showArrows', $event)" />
        </label>
      </div>
      <div class="section">
        <div class="section-title">
          <component :is="(Magnet) as any" class="h-3.5 w-3.5" />
          <span>
            <span>力度</span>
          </span>
        </div>
        <label class="slider-row">
          <span>
            <span>图谱向心力</span>
          </span>
          <RangeInput :min="'0'" :max="'0.5'" :value="graphStore.settings.gravity" :step="'0.01'" :key="'RangeInput-5'" @input="SliderChanged('gravity', $event)" />
          <span class="value">
            <span>{{ graphStore.settings.gravity }}</span>
          </span>
        </label>
        <label class="slider-row">
          <span>
            <span>节点排斥力</span>
          </span>
          <RangeInput :value="graphStore.settings.repulsion" :max="'20000'" :step="'500'" :min="'1000'" :key="'RangeInput-6'" @input="SliderChanged('repulsion', $event)" />
          <span class="value">
            <span>{{ graphStore.settings.repulsion }}</span>
          </span>
        </label>
        <label class="slider-row">
          <span>
            <span>相连节点吸引力</span>
          </span>
          <RangeInput :min="'0.001'" :step="'0.001'" :value="graphStore.settings.attraction" :max="'0.5'" :key="'RangeInput-7'" @input="SliderChanged('attraction', $event)" />
          <span class="value">
            <span>{{ graphStore.settings.attraction }}</span>
          </span>
        </label>
        <label class="slider-row">
          <span>
            <span>连线长度</span>
          </span>
          <RangeInput :min="'30'" :value="graphStore.settings.linkLength" :step="'10'" :max="'300'" :key="'RangeInput-8'" @input="SliderChanged('linkLength', $event)" />
          <span class="value">
            <span>{{ graphStore.settings.linkLength }}</span>
          </span>
        </label>
      </div>
      <button class="graph-btn" @click="Reset">
        <span>重置设置</span>
      </button>
    </div>

</template>

<style>
/* Component styles */

</style>
<style scoped>
.graph-controls {
  width: 260px;
  border-left: 1px solid hsl(var(--border));
  background: hsl(var(--card));
  color: hsl(var(--card-foreground));
  overflow-y: auto;
}
.section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.section-title {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.025em;
  color: hsl(var(--muted-foreground));
  margin-bottom: 0.25rem;
}
.control-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  cursor: pointer;
}
.slider-row {
  display: grid;
  grid-template-columns: 5rem 1fr 2.5rem;
  align-items: center;
  gap: 0.5rem;
}
.slider-row span:first-child {
  font-size: 0.75rem;
}
.value {
  text-align: right;
  font-size: 0.75rem;
  color: hsl(var(--muted-foreground));
  font-variant-numeric: tabular-nums;
}
.graph-input {
  width: 100%;
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  border-radius: 0.375rem;
  border: 1px solid hsl(var(--border));
  background: hsl(var(--background));
  color: hsl(var(--foreground));
  outline: none;
}
.graph-input:focus {
  border-color: hsl(var(--ring));
  box-shadow: 0 0 0 1px hsl(var(--ring) / 0.2);
}
.graph-btn {
  width: 100%;
  padding: 0.375rem 0.75rem;
  font-size: 0.75rem;
  border-radius: 0.375rem;
  border: 1px solid hsl(var(--border));
  background: hsl(var(--accent));
  color: hsl(var(--accent-foreground));
  cursor: pointer;
  transition: background 0.15s ease;
}
.graph-btn:hover {
  background: hsl(var(--accent) / 0.8);
}
input[type='range'] {
  width: 100%;
  accent-color: hsl(var(--primary));
}
.toggle {
  accent-color: hsl(var(--primary));
}
</style>
