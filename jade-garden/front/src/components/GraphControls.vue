<script setup lang="ts">
import { Search, SlidersHorizontal, Palette, Magnet } from 'lucide-vue-next'
import { useGraphStore } from '@/stores/graph'

const graph = useGraphStore()

function update() {
  graph.saveSettings()
}

function reset() {
  graph.$patch({
    settings: {
      showOrphans: true,
      showMissing: false,
      nodeSize: 12,
      textOpacity: 0.85,
      edgeWidth: 1,
      showArrows: false,
      gravity: 0.05,
      repulsion: 4500,
      attraction: 0.05,
      linkLength: 120,
    },
  })
  graph.saveSettings()
}
</script>

<template>
  <div class="graph-controls flex flex-col gap-4 p-3 text-sm">
    <div class="section">
      <div class="section-title">
        <Search class="h-3.5 w-3.5" />
        <span>搜索</span>
      </div>
      <input
        v-model="graph.searchQuery"
        type="text"
        placeholder="搜索节点…"
        class="graph-input"
      />
    </div>

    <div class="section">
      <div class="section-title">
        <SlidersHorizontal class="h-3.5 w-3.5" />
        <span>筛选</span>
      </div>
      <label class="control-row">
        <span>显示孤立文件</span>
        <input
          v-model="graph.settings.showOrphans"
          type="checkbox"
          class="toggle"
          @change="update"
        />
      </label>
      <label class="control-row">
        <span>显示缺失页面</span>
        <input
          v-model="graph.settings.showMissing"
          type="checkbox"
          class="toggle"
          @change="update"
        />
      </label>
    </div>

    <div class="section">
      <div class="section-title">
        <Palette class="h-3.5 w-3.5" />
        <span>外观</span>
      </div>
      <label class="slider-row">
        <span>节点大小</span>
        <input
          v-model.number="graph.settings.nodeSize"
          type="range"
          min="4"
          max="40"
          step="1"
          @input="update"
        />
        <span class="value">{{ graph.settings.nodeSize }}</span>
      </label>
      <label class="slider-row">
        <span>文本透明度</span>
        <input
          v-model.number="graph.settings.textOpacity"
          type="range"
          min="0"
          max="1"
          step="0.05"
          @input="update"
        />
        <span class="value">{{ Math.round(graph.settings.textOpacity * 100) }}%</span>
      </label>
      <label class="slider-row">
        <span>连线粗细</span>
        <input
          v-model.number="graph.settings.edgeWidth"
          type="range"
          min="0.5"
          max="5"
          step="0.5"
          @input="update"
        />
        <span class="value">{{ graph.settings.edgeWidth }}</span>
      </label>
      <label class="control-row">
        <span>显示箭头</span>
        <input
          v-model="graph.settings.showArrows"
          type="checkbox"
          class="toggle"
          @change="update"
        />
      </label>
    </div>

    <div class="section">
      <div class="section-title">
        <Magnet class="h-3.5 w-3.5" />
        <span>力度</span>
      </div>
      <label class="slider-row">
        <span>图谱向心力</span>
        <input
          v-model.number="graph.settings.gravity"
          type="range"
          min="0"
          max="0.5"
          step="0.01"
          @input="update"
        />
        <span class="value">{{ graph.settings.gravity }}</span>
      </label>
      <label class="slider-row">
        <span>节点排斥力</span>
        <input
          v-model.number="graph.settings.repulsion"
          type="range"
          min="1000"
          max="20000"
          step="500"
          @input="update"
        />
        <span class="value">{{ graph.settings.repulsion }}</span>
      </label>
      <label class="slider-row">
        <span>相连节点吸引力</span>
        <input
          v-model.number="graph.settings.attraction"
          type="range"
          min="0.001"
          max="0.5"
          step="0.001"
          @input="update"
        />
        <span class="value">{{ graph.settings.attraction }}</span>
      </label>
      <label class="slider-row">
        <span>连线长度</span>
        <input
          v-model.number="graph.settings.linkLength"
          type="range"
          min="30"
          max="300"
          step="10"
          @input="update"
        />
        <span class="value">{{ graph.settings.linkLength }}</span>
      </label>
    </div>

    <button class="graph-btn" @click="reset">重置设置</button>
  </div>
</template>

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
