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
    id: 'menubar',
    title: '菜单栏+工具栏（桶①-3/①-4·命令面，PLAN-073 T-02）',
    // toolbar 落点（T-00 复核）：menu_bar.at 第二 view 块 → MenuBar.vue 内
    // 渲染，无独立 SFC——本单元 = 双面结构锁（菜单面 web 子集 + 工具栏 3
    // 按钮）；命令面交互行为归 app 层 24-menubar e2e（070 T-06），gallery
    // 无点击断言。
    vue: {
      url: '/?unit=menubar',
      ready: '[data-unit="menubar"] button[title="保存"]',
      needles: ['文件', '查看'],
    },
    vm: {
      actions: [{ button: 'menubar' }],
      state: { unit: 'menubar', mb_menus: '2', mb_actions: '5', mb_toolbar: '3' },
      snapshot: ['unit=menubar menus:2 actions:5 toolbar:3', '文件', '查看', '重载文件列表'],
    },
  },
  {
    id: 'filetree',
    title: '文件树行家族（桶①-5·列表交互，PLAN-073 T-03）',
    // 行解剖 twin：guides/chevron/icon/label 镜像 desktop ft_rows；展开交互
    // 走 label 钮（web 行点击同款语义，desktop mouse-area 的 gate 可驱动
    // 等价），子行条件分支渲染（desktop `if r.open` 双分支同款）。
    vue: {
      url: '/?unit=filetree',
      ready: '[data-unit="filetree"] span.truncate',
      needles: ['引言.ad', '方法', '另页.ad'],
      needleSelector: '[data-unit="filetree"]',
      click: {
        selector: '[data-unit="filetree"] span.truncate:has-text("方法")',
        ready: '[data-unit="filetree"] span.truncate:has-text("探针.ad")',
        needles: ['探针.ad'],
      },
    },
    vm: {
      actions: [{ button: 'filetree' }, { button: '方法' }],
      state: { unit: 'filetree', ft_count: '4', ft_open_dir: 'wiki/方法' },
      snapshot: ['unit=filetree rows:4', '方法', '探针.ad'],
    },
  },
  {
    id: 'quick_switcher',
    title: '快速切换器（桶②·RC-D 批次2·PLAN-076 下沉）',
    // vue 臂：fileTree facade 播种嵌套树 → 'jade-open-quick-switcher'
    // window 通道开面板（热键等价）→ 空查询全量行（collect_files 递归 walk
    // + filter_files + cap 12）。VM 臂 twin：执行下沉同形模块 fn（derived
    // 副本）对 CJK 查询 "引" 过滤（P-7 域）+ qs_next 按钮序列驱动
    // selected_index 模运算环绕（0→1→0，补 06-palette 无 ArrowUp/Down e2e
    // 的选中移动面）。热键/焦点 = window 级 DOM 必留 ext，twin 不镜像（F-1）。
    vue: {
      url: '/?unit=quick_switcher',
      ready: '[data-unit="quick_switcher"] li',
      needles: ['引言.ad', '探针.ad', '另页.ad'],
      needleSelector: '[data-unit="quick_switcher"] li',
    },
    vm: {
      actions: [{ button: 'quick_switcher' }, { button: 'qs_next' }, { button: 'qs_next' }],
      state: { unit: 'quick_switcher', qs_count: '2', qs_selected: '0' },
      snapshot: ['unit=quick_switcher rows:2', '引言.ad', '引子.ad'],
    },
  },
  {
    id: 'search_panel',
    title: '检索面板（桶②·RC-D 批次2·PLAN-076 下沉）',
    // vue 臂：fill 门（T-02 扩展）键入 CJK 查询"引言" → 真件自身
    // .Init debounce 闭包（250ms）→ 下沉闭包体 try/catch/finally 经
    // search_pages 契约别名 → shim 两行（Page 带 \u0001/\u0002 标记经
    // snippet_html ext 桥，Block 行 page_path 题 + 无 snippet）。
    // VM 臂 twin：Init 播种行投影（074 Q-2 口径）。
    vue: {
      url: '/?unit=search_panel',
      ready: 'input[placeholder="Search pages and blocks..."]',
      fill: [{ selector: 'input[placeholder="Search pages and blocks..."]', value: '引言' }],
      afterReady: '[data-unit="search_panel"] li',
      afterNeedles: ['引言', 'wiki/方法.ad'],
      afterNeedleSelector: '[data-unit="search_panel"] li',
    },
    vm: {
      actions: [{ button: 'search_panel' }],
      state: { unit: 'search_panel', sp_count: '2' },
      snapshot: ['unit=search_panel rows:2', '引言', 'wiki/方法.ad'],
    },
  },
  {
    id: 'command_palette',
    title: '命令面板（桶②·RC-D 批次2·PLAN-076 下沉+转正）',
    // 转正（076 T-03）：missing:true 退场——负例样本由 editor_tab 占位
    // 续任（README F-6 注记）。vue 臂：workspace/recentFiles facade 播种
    // （root 守卫 + CJK 两行）→ 合成 Ctrl+P 开面板 → fill 门键入"引言"
    // → 下沉 filter_palette 过滤 command×9+recent×2 → recent 行命中。
    // VM 臂 twin：cp_filter 同形模块 fn 真跑 CJK 查询"引"（command 英文
    // 全落、recent 引言/引子 两中）+ cp_next×2 环绕。热键/焦点 = window
    // 级 DOM 必留 ext，twin 不镜像（F-1）。
    vue: {
      url: '/?unit=command_palette',
      ready: 'input[placeholder="Type a command or recent file..."]',
      needles: ['Open global graph', '引言'],
      needleSelector: '[data-unit="command_palette"] li',
      fill: [{ selector: 'input[placeholder="Type a command or recent file..."]', value: '引言' }],
      afterReady: '[data-unit="command_palette"] li',
      afterNeedles: ['引言', 'wiki/引言.ad'],
      afterNeedleSelector: '[data-unit="command_palette"] li',
    },
    vm: {
      actions: [{ button: 'command_palette' }, { button: 'cp_next' }, { button: 'cp_next' }],
      state: { unit: 'command_palette', cp_count: '2', cp_selected: '0' },
      snapshot: ['unit=command_palette rows:2', '引言', '引子'],
    },
  },
  {
    id: 'editor_tab',
    title: '编辑器引擎对拍（RC-E·状态占位）',
    missing: true,
    missingReason:
      'RC-E：对拍 gate 常驻在库（auto-lang plan-651 t651 套件：cargo nextest run -p auto-lang --lib --features autodown,code-editor t651；三态矩阵 = auto-lang docs/plans/attachments/651-matrix.md）——PLAN-072 Q-2 裁定 gallery 挂状态占位不设 gate；真件装配随 jade L3（A\' 解冻条件由矩阵度量）',
  },
]
