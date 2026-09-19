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
    id: 'create_page_prompt',
    title: '创建页确认弹窗（桶②·RC-D 批次3·PLAN-077 极薄件首验）',
    // vue 臂：title/open 双 prop 播种 → page_path 投影（wikiTitleToPath 经
    // ext regex 桥——wikiLink.ts 单源）+ 双按钮 emit 契约（orphan 组件无
    // 消费者，点击无落点，无 click 断言）。VM 臂 twin：cpp_path/cpp_choice
    // 投影（derived 值播种——regex 桥 TS 域不入 VM，F-1 口径），Create
    // 按钮驱动 cpp_choice（emit 等价面）。
    vue: {
      url: '/?unit=create_page_prompt',
      ready: '[data-unit="create_page_prompt"] button',
      needles: ['Create missing page?', '引言', '引言.ad'],
      needleSelector: '[data-unit="create_page_prompt"]',
    },
    vm: {
      actions: [{ button: 'create_page_prompt' }, { button: 'Create' }],
      state: { unit: 'create_page_prompt', cpp_choice: 'create' },
      snapshot: ['unit=create_page_prompt path:引言.ad', 'Create missing page?', '引言.ad'],
    },
  },
  {
    id: 'theme_popover',
    title: '主题弹层（桶②·RC-D 批次3·PLAN-077 下沉，Q-4 字面量首件）',
    // vue 臂：open prop 播种 + theme facade 初始值 → teleport 弹层
    // （DOM 落 body 层，needle 走 .theme-popover 选择器）→ sunk
    // theme_accents 静态五 accent 列表（Q-4 探针同形）；SetLight/SetDark/
    // SetAccent 交互投影断言归 VM twin（vue needleSelector 不及 class 域）。
    // VM 臂 twin：tp_theme_accents derived 副本（G-3 各持一份）真跑字面量
    // 列表（VM Obj 全键形状锁定域实证）+ SetDark 驱动 tp_mode 投影。
    vue: {
      url: '/?unit=theme_popover',
      ready: '.theme-popover button',
      // accent 色板 = title 属性 + 色块（无文本）——五 accent 结构由截图基线
      // 视觉锁 + VM twin tp_count=5 断言承载。
      needles: ['Appearance', 'Light', 'Dark', 'Accent'],
      needleSelector: '.theme-popover',
    },
    vm: {
      actions: [{ button: 'theme_popover' }, { button: 'SetDark' }],
      state: { unit: 'theme_popover', tp_mode: 'dark', tp_count: '5' },
      snapshot: ['unit=theme_popover accents:5 mode:dark', 'Indigo', 'Slate'],
    },
  },
  {
    id: 'recent_files',
    title: '最近文件行（桶②·RC-D 批次3·PLAN-077 下沉）',
    // vue 臂：recentFiles facade 播种两行（CJK 标题 + openedAt）→ 下沉
    // recent_files_with_time 行构造（time 经 ext formatTime 桥逐行预计算
    // ——Q-3 locale 域不作 needle，title/path 承载断言）→ click 门 ClearAll
    // → 真 store.clear() 通道 → 空态文案正向 needle。
    // VM 臂 twin：rf_remove 驱动计数 2→1（formatTime TS 域不入 VM，
    // twin 以 raw time 播种，F-1 口径）。
    vue: {
      url: '/?unit=recent_files',
      ready: '[data-unit="recent_files"] li',
      needles: ['引言', 'wiki/另页.ad'],
      needleSelector: '[data-unit="recent_files"] li',
      click: {
        selector: 'button[title="Clear recent files"]',
        ready: 'div:has-text("No recent files")',
        needles: ['No recent files'],
      },
    },
    vm: {
      actions: [{ button: 'recent_files' }, { button: 'rf_remove' }],
      state: { unit: 'recent_files', rf_count: '1' },
      snapshot: ['unit=recent_files rows:1', 'wiki/另页.ad'],
    },
  },
  {
    id: 'agenda',
    title: '日程分组行（桶②·RC-D 批次3·PLAN-077 下沉）',
    // vue 臂：面板自身 current_path watch immediate → 下沉 try/catch/finally
    // 经 get_agenda 契约别名拉取 → shim 应答两组三任务（TODO/DONE/DOING
    // marker 三态 + priority [#2] + title 空串回落 page_path 显式守卫面 +
    // title 非空直下面）→ agenda_display 行构造（formatted_date 经 ext
    // formatDate 桥——Q-3 locale 域不作 needle）。
    // VM 臂 twin：ag_display_probe derived 副本真跑行构造（to_upper
    // if-chain——P-7 对称词位 VM 面），日期 raw 投影。
    vue: {
      url: '/?unit=agenda',
      ready: '[data-unit="agenda"] li',
      needles: ['写引言草稿', '小节题', 'wiki/引言.ad', 'TODO', '[#2]'],
      needleSelector: '[data-unit="agenda"] li',
    },
    vm: {
      actions: [{ button: 'agenda' }],
      state: { unit: 'agenda', ag_count: '3' },
      snapshot: ['unit=agenda rows:3', '小节题', 'wiki/引言.ad', 'TODO'],
    },
  },
  {
    id: 'flashcard_modal',
    title: '闪卡复述（桶②·RC-D 批次3·PLAN-077 下沉）',
    // vue 臂：open 播种 → .Init → 下沉 try/catch/finally 经 get_due_cards
    // 契约别名 → shim 两卡（第二卡 question/answer 空串——card_question/
    // card_answer raw 回落面）→ counter_label（f-string 数学内插）+
    // card_question 守卫投影。click 门 Reveal → answer 域 + 评级按钮
    // 出现（.Reveal 直写 + .Rate 按钮面在案）。VM 臂 twin：fm_card_at
    // derived 计数走查 + fm_reveal/fm_rate 驱动 index 前移（契约面归
    // vue 臂——F-1）。
    vue: {
      url: '/?unit=flashcard_modal',
      ready: '[data-unit="flashcard_modal"] button',
      needles: ['Flashcards', '1 / 2', '写引言草稿'],
      needleSelector: '[data-unit="flashcard_modal"]',
      click: {
        selector: 'button:has-text("Show answer")',
        ready: 'button:has-text("Good")',
        needles: ['Answer', '引言已成稿'],
      },
    },
    vm: {
      actions: [{ button: 'flashcard_modal' }, { button: 'fm_reveal' }, { button: 'fm_rate' }],
      // fm_rate 在 fm_reveal 之后（动作序）——下沉 .Rate 的隐藏答案臂
      // 使最终 show_answer=false（index 前移 + counter 2/2 + 第二卡
      // raw 回落投影才是终态断言面）。
      state: { unit: 'flashcard_modal', fm_index: '1', fm_show_answer: 'false', fm_counter: '2 / 2', fm_question: '方法原始文本' },
      snapshot: ['unit=flashcard_modal idx:1', '方法原始文本'],
    },
  },
  {
    id: 'workspace_opener',
    title: '工作区打开（桶②·RC-D 批次3·PLAN-077 下沉，Q-1 裁定单元）',
    // vue 臂：path 播种（合成 input 事件——v-model 写回）→ click 门 Open →
    // 下沉 .Open 编排链（busy 置位 → clearWorkspaceError → store facade
    // open（open_workspace 契约经 shim）→ then(fileTree.load——/api/files
    // shim) → finally busy 复位）→ workspace.root 投影（页内 data-ws-root
    // 直读 store）。picker 按钮（window 级 DOM）不进断言域（Q-1/F-1）。
    // VM 臂 twin：wo_busy/wo_error/wo_root 投影（编排形状播种——契约面
    // 归 vue 臂，twin 不镜像，F-1）。
    vue: {
      url: '/?unit=workspace_opener',
      ready: 'input[placeholder^="粘贴完整目录路径"]',
      needles: ['Jade Garden', 'Open'],
      needleSelector: '[data-unit="workspace_opener"]',
      click: {
        selector: 'button.bg-primary',
        ready: '[data-ws-root]:has-text("D:/tmp/wiki-demo")',
        needles: ['D:/tmp/wiki-demo'],
      },
    },
    vm: {
      actions: [{ button: 'workspace_opener' }, { button: 'Open' }],
      state: { unit: 'workspace_opener', wo_busy: 'false', wo_root: 'D:/tmp/wiki-demo' },
      snapshot: ['unit=workspace_opener busy:false', 'Jade Garden', 'D:/tmp/wiki-demo'],
    },
  },
  {
    id: 'properties_panel',
    title: '属性面板（桶②·RC-D 批次3·PLAN-077 压轴下沉）',
    // vue 臂：generated tabs store 直播种 activeTab（五型 frontmatter——
    // inferType 分派域全覆盖）→ 下沉 sync_entries（P-9 map 迭代 vue 执行面
    // + inferType 逐值桥）+ with_prop_display 就地字段写 → 行渲染。click
    // 门 bool pill → ToggleBool 翻转 → 'false' 标签出现。VM 臂 twin：
    // pp_rows 分派型播种（inferType TS 域不入 VM——F-1）+ pp_toggle/
    // pp_add 翻转/增行投影。
    vue: {
      url: '/?unit=properties_panel',
      ready: '[data-unit="properties_panel"] input',
      // 行 key/value 落 input value 属性（textContent 不可见）——数据面由
      // 截图基线视觉锁 + VM twin 投影 + 11-properties e2e 承载；文本面 =
      // 面板题 + 五行 select 选项串 + bool pill 'true' 标签。
      needles: ['Properties', 'true'],
      needleSelector: '[data-unit="properties_panel"]',
      click: {
        selector: 'button:has-text("true")',
        ready: '[data-unit="properties_panel"] button:has-text("false")',
        needles: ['false'],
      },
    },
    vm: {
      actions: [{ button: 'properties_panel' }, { button: 'pp_toggle' }, { button: 'pp_add' }],
      state: { unit: 'properties_panel', pp_count: '4', pp_bool_label: 'false' },
      snapshot: ['unit=properties_panel rows:4', 'title', 'published'],
    },
  },
  {
    id: 'graph_sidebar',
    title: '图谱边栏（桶②·RC-D 批次4·PLAN-078 下沉）',
    // vue 臂：graph facade 播种四节点三边（CJK 标题 + exists 双态 + degree0
    // 孤儿 + 空 label 节点）→ 真 .Init（nodes 非空守卫跳过 load）→ 下沉
    // graph_stats 四卡（页面/链接/缺失/孤立计数）+ top_degree_nodes 选排
    // cap15 行（display = label||id 显式 if——空 label 行 b 回落 id 面）。
    // 行 click（tabs.open）不进断言（077 backlinks 同款）。
    // VM 臂 twin：gs_graph_stats/gs_top_degree derived 副本真跑（G-3 各持
    // 一份——T-00 探针①⑤同形），四卡计数投影 + gs_open 行按钮驱动
    // gs_opened（OpenNode 形状镜像）。
    vue: {
      url: '/?unit=graph_sidebar',
      ready: '[data-unit="graph_sidebar"] .stat-card',
      needles: ['页面', '链接', '缺失', '孤立', '引言', '缺失页', '孤儿页'],
      needleSelector: '[data-unit="graph_sidebar"]',
    },
    vm: {
      actions: [{ button: 'graph_sidebar' }, { button: 'gs_open_引言' }],
      state: { unit: 'graph_sidebar', gs_total: '4', gs_missing: '1', gs_orphan: '1', gs_edges: '3', gs_count: '4', gs_id_fallback: 'b', gs_opened: 'wiki/引言.ad' },
      snapshot: ['unit=graph_sidebar total:4 missing:1 orphan:1 edges:3 top:4', '引言', '缺失页', '孤儿页'],
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
