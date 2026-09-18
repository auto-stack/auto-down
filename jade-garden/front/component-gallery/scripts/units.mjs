// units.mjs — gallery 单元台账配置（PLAN-072 T-02：per 单元配置化 gate）。
//
// 每单元双臂断言面：
//   vue —— playwright：?unit= 深链 → ready 选择器 + 文本 needle +
//          截图基线（e2e/baselines/<id>.png，--update-snapshots 刷新）。
//   vm  —— 单次 boot 内按序执行：action（切单元按钮）→ state 等值断言
//          → snapshot needle（root 投影/内联行；F-1：子件子树不可见）。
//
// 新单元流程：app.at 加分支/单元页 → 本表登记 → pnpm exec playwright
// test --update-snapshots 建基线 → node scripts/gate.mjs 全绿。
export const UNITS = [
  {
    id: 'status_bar',
    title: '状态条（桶①-1）',
    vue: {
      url: '/?unit=status_bar',
      ready: '[data-unit="status_bar"] footer',
      needles: ['wiki-demo', 'backlink', 'word'],
    },
    vm: {
      state: { unit: 'status_bar', sb_status: 'ready', sb_bl: '12', sb_ol: '7' },
      snapshot: ['unit=status_bar'],
    },
  },
  {
    id: 'outline',
    title: '大纲行（桶②·纯展示样板）',
    vue: {
      url: '/?unit=outline',
      ready: '[data-unit="outline"] li',
      needles: ['引言', '方法', '方法 > 探针'],
      needleSelector: '[data-unit="outline"] li',
    },
    vm: {
      action: { button: 'outline' },
      state: { unit: 'outline', ol_count: '3' },
      snapshot: ['unit=outline rows:3', '引言', '方法'],
    },
  },
]
