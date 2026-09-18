// units.mjs — gallery 单元台账配置（PLAN-072 T-02/T-03：per 单元配置化 gate）。
//
// 每单元双臂断言面：
//   vue —— playwright：?unit= 深链 → ready 选择器 + 文本 needle +
//          可选 click 交互（点击后 needle 复查）+ 截图基线
//          （e2e/baselines/，--update-snapshots 刷新）。
//   vm  —— 单次 boot 内按序执行：actions（按文本按按钮序列）→ state
//          等值断言 → snapshot needle（root 投影/内联行；F-1：子件子树
//          不可见，twin/投影形态）。
//   missing —— 桶② RC-D 单元的缺件红占位：无 VM twin，gate 汇总报
//          RED(expected)；理由必填（缺件即红语义：真件 VM 直挂 = ext
//          全量 no-op stub，数据面静默空——T-03 实验实证，README F-6）。
//
// 新单元流程：app.at 加分支/单元页 → 本表登记 → pnpm exec playwright
// test --update-snapshots 建基线 → node scripts/gate.mjs 全绿。
export const UNITS = [
  {
    id: 'status_bar',
    title: '状态条（桶①-1·纯展示样板）',
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
    title: '大纲行（桶②·列表/展示样板）',
    vue: {
      url: '/?unit=outline',
      ready: '[data-unit="outline"] li',
      needles: ['引言', '方法', '方法 > 探针'],
      needleSelector: '[data-unit="outline"] li',
    },
    vm: {
      actions: [{ button: 'outline' }],
      state: { unit: 'outline', ol_count: '3' },
      snapshot: ['unit=outline rows:3', '引言', '方法'],
    },
  },
  {
    id: 'tab_strip',
    title: '标签条（桶①-2·交互样板）',
    vue: {
      url: '/?unit=tab_strip',
      ready: '[data-unit="tab_strip"] button',
      needles: ['引言', '方法'],
      needleSelector: '[data-unit="tab_strip"] button',
      click: {
        selector: 'button:has-text("引言")',
        ready: '[data-active-path]',
        needles: ['wiki/引言.ad'],
        needleSelector: '[data-active-path]',
      },
    },
    vm: {
      actions: [{ button: 'tab_strip' }, { button: '方法' }],
      state: { ts_active: 'wiki/方法.ad' },
      snapshot: ['unit=tab_strip active:wiki/方法.ad'],
    },
  },
  {
    id: 'backlinks',
    title: '反链行（桶②·数据绑定样板）',
    vue: {
      url: '/?unit=backlinks',
      ready: '[data-unit="backlinks"] li',
      needles: ['另页'],
      needleSelector: '[data-unit="backlinks"] li',
    },
    vm: {
      actions: [{ button: 'backlinks' }],
      state: { bl_count: '1' },
      snapshot: ['unit=backlinks count:1', '另页'],
    },
  },
  {
    id: 'outgoing_links',
    title: '出链行（桶②·RC-D 批次1·PLAN-074 下沉）',
    vue: {
      url: '/?unit=outgoing_links',
      ready: '[data-unit="outgoing_links"] li',
      needles: ['方法', '缺失页', '#abc1234'],
      needleSelector: '[data-unit="outgoing_links"] li',
    },
    vm: {
      actions: [{ button: 'outgoing_links' }],
      state: { olp_count: '2', olp_exists: '1' },
      snapshot: ['unit=outgoing_links rows:2 exists:1', '方法', '缺失页'],
    },
  },
  {
    id: 'unlinked_references',
    title: '未链引用行（桶②·RC-D 批次1·PLAN-074 下沉）',
    vue: {
      url: '/?unit=unlinked_references',
      ready: '[data-unit="unlinked_references"] li',
      needles: ['wiki/另页.ad', '提到'],
      needleSelector: '[data-unit="unlinked_references"] li',
    },
    vm: {
      actions: [{ button: 'unlinked_references' }],
      state: { ul_count: '1' },
      snapshot: ['unit=unlinked_references rows:1', 'wiki/另页.ad', '从未写成链接'],
    },
  },
  {
    id: 'command_palette',
    title: '命令面板（桶②·RC-D 缺件红占位）',
    missing: true,
    missingReason:
      'RC-D：无 VM twin，真件 ext-composable 耦合 → VM 直挂即 ext 全量 no-op stub（T-03 实验：outline_panel 同构实证，README F-6）——VM 臂缺席=红',
  },
]
