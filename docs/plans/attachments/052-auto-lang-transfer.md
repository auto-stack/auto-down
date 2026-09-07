# 052-auto-lang-transfer — auto-lang 侧转介单（PLAN-052 W3/W4，2026-09-05）

本单收拢 DEBTS.md 中归宿 auto-lang 侧的开放债，每条 = 症状 / 本仓复现命令 /
嫌疑面（文件级）/ 绕道现状 / 建议验收。修复动作在 auto-lang 仓执行；本仓侧
已备好回归门或复现工具的条目注明门控与摘门条件。

---

## ① 051-候选：VM 浅色档 view 臂 fence 深盘（首帧取档错误 + 存量缓存不随主题失效）

- **症状**：demo VM 轨（`auto run -r vm`）浅色档（dark_mode=false）干净启动，
  renderer 臂（右栏）从首个 fence 起 zinc-950 (9,9,11) 深盘；editor 臂全浅
  （#f9fafb）。dark 档两臂一致。
- **本仓复现（读数探针，PLAN-052 T10 交付）**：
  ```bash
  cd autodown/demo/auto
  AUTOUI_MCP_PORT=9263 <auto.exe> run -r vm        # 另终端
  node probe-051-view-theme.mjs --port 9263 --flip --edit-fence
  ```
  隔离矩阵（auto-lang HEAD exe 实测，2026-09-05 00:27 构建）：
  | 轴 | editor 臂 | renderer 臂 | 判 |
  |---|---|---|---|
  | A1 首帧浅档 | dark 0.8% / fenceLight 51.3% | dark 56.5% / **zinc950 40.4%** / fenceLight 0.0% | FORK |
  | A2a 深档对照 | dark 96.4% / zinc950 51.5% | dark 96.2% / **zinc950 40.4%（与浅档一字不差）** | 同批缓存 statics |
  | A2b 翻回浅 | zinc950 51.5%→**0.0%**（正确翻转） | zinc950 40.2%（不动） | FORK 持续 |
  | A3 编辑新建 fence | 浅 | dark 0.1% / zinc950 **0.0%** / fenceLight 6.9% | **CONSISTENT** |
- **pinpoint（双层）**：
  1. **首帧渲染时 view 臂 fence 族 statics 解析为深档**（dark_mode=false 下）——
     D-GAP 全局主题同步前/预热构建的取档时机（对照：A3 证明内容变更触发的
     构建路径取档正确）；
  2. **内容寻址缓存（StreamCache/Element）不随主题失效**——D-GAP 翻转不重建
     view 臂存量 fence 面板（A2a/A2b），唯新内容（新缓存键）按当前档重建
     （A3）。编辑臂 fence chrome 翻转正确（050 的 fence_palette 同源翻转 +
     D-GAP 标脏在编辑臂生效），缺的是 view 臂等价物。
- **嫌疑面（auto-lang）**：ui/aura_view_builder.rs autodown 臂（首帧 family_of
  取档时机）；ui/iced/renderer.rs dynamic_view D-GAP 标脏臂（翻转重建语义——
  为何不覆盖 view 臂存量 fence 面板）；StreamCache/Element 缓存键（建议并入
  主题档或 theme epoch；对照 050 编辑臂 `retheme_all_fence_buffers` 先例）。
- **绕道现状**：无用户可见绕道（demo 无运行时主题切换器时首帧即浅=正常；051
  settings 面落地后可见）。回归门：本仓 `vm-smoke.mjs` 第七组（首跑读种子
  fence；无门控确定性失败 exit 1，不吃 049 重试；`AUTO_VM_KNOWN_FORK=1`
  门控跳过带读数）——**修复落地后摘门控转硬断言即本条验收**。
- **建议验收**：摘门控后 vm-smoke 第七组绿（renderer zinc950 < 5% 且
  fenceLight 在场）+ probe A2b 翻回浅后 renderer fenceLight 在场。
- **✅ 状态收口（2026-09-05，PLAN-053）**：彼仓未另立项（559 号被他范围
  占用），修复经 auto-down PLAN-053 T12 收回自修落地——theme 主题代数 +
  StreamCache 主题失效（auto-lang master merge 2d3b2d1e0，镜像 DEBTS 行
  补登销号 20e9a63d2）；验收双判据均达成：`--quadrants` 七行全
  CONSISTENT（含 A2b 翻转重建）+ vm-smoke 第七/八组摘门控转硬断言。
  本条目终结。
- **随行已修**：本仓归档迁移致 auto-lang `crates/auto-lang/Cargo.toml`
  autodown-core 路径断裂——auto-down-dev f5c86eeba 已折 auto-lang master
  0b0161b57。

## ② 043 引擎缺口三件：子件 handler 体 computed 不解析 / 引号 emit 计算实参无派发路由 / nanbox 整值 float 丢标签

- **症状**：
  ① `use` 导入子件的 handler 体内引用 computed → 编译后 Nil 传播，数值守卫
  静默假（无日志无错误）；
  ② 子件体内 `."update:x"(v)` 类引号 emit（带计算实参）编译为对子件自身空
  handler 的内联直调，不经派发器（父级 `on<name>` 路由不触发；剥离回放只认
  `on_*` 前缀且只能携带状态字段实参）；
  ③ auto_val nanbox 整值 float（240.0/0.0）编码丢 float 标签——实参绑定读
  到垃圾、write_state 写入读回 0（分数值 float 正常）。
- **本仓复现**：①② 见 `demo/auto/src/front/custom_scrollbar.at` T9/T10 注记
  （绕道=thumb 几何内联 + 父传 `is_vm` prop 双轨分派；行为已对——vm-smoke
  `drag` 组绿即绕道形态的正确性证据）；③ 见 demo 滚动同步级联的 +1e-3 分数
  化绕道（app.at rust 直写快道）。
- **嫌疑面**：auto-lang 改写器（handler 解析只认本件 state_fields）；派发器
  （emit 计算实参路由）；renderer.rs auto_val nanbox 位型（PLAN-043 T6 注记）。
- **建议验收**：①子件体 computed 引用解析出真值；②引号 emit 经派发路由
  （C2① `on<name>` 回送触发）；③nanbox 整值 float 保真——届时本仓退役
  custom_scrollbar.at 双轨分派与 +1e-3 分数化绕道并复跑 vm-smoke 全组。

## ③ 048：真实键盘编辑不更新 .at state.content

- **症状**：合成键/物理键插入在编辑壳生效（文本/光标/CJK/删除全对），但
  on_change publish → 解释器 `.App.Edit` 消费链不回写 state.content（右栏
  预览不重渲）。MCP `type_text` 专用通道（INPUT_TEXT+typed msg）正常——
  046/047 验证均走 type_text 故未暴露。
- **本仓复现**：起 VM 窗口后用**真实键盘**在编辑壳输入，观察右栏不重渲；
  对照 `node vm-smoke.mjs --port N`（组 2 走 type_text 绿——即差异面）。
- **嫌疑面**：auto-lang autodown_editor/widget.rs 的 publish 面 → 解释器
  handler 派发路径（widget publish 消息的解释器消费链断）。
- **绕道现状**：无（真实键盘是用户主路径）。
- **建议验收**：真实键盘输入 N 字符 → `autoui_state content` 反映（可加
  vm-smoke 组：物理键通道 vs type_text 同断言）。
- **✅ 状态收口（2026-09-07，PLAN-057）**：断链根因 = auto-lang renderer.rs
  编辑壳 dynamic 臂 on_change 闭包发布预构造消息（input_value 恒 None）——
  解释器 on_with_input_for 不把文本作 handler 首实参，`.Edit(str)` 收不到
  值、state.content 永不更新（INPUT_TEXT 线程局部在解释器路径零读者，闭包
  里的写入是死代码）。修复 = 闭包改 textarea 先例（wire_textarea_actions）
  发布 `input_value: Some(全文)` 新消息，CodeEditor dynamic 臂同族同修；
  执行期并修连发回声竞态（core sync_external 回声守卫——被后续按键超越的
  旧自回显晚到不再整树 rebuild 清焦点，快速连打丢键同根因收口）。验收按
  本条建议落地 = vm-smoke [group9] 逐键链路组：key_press ×12（经 core
  KeyPressed 真路径 = 物理键同构处理）→ state.content 含 Backspace 修正、
  右栏重渲染、与 type_text 同文档终态逐字节相等（净窗绿；043 T9/T10 D2
  同构代证口径——物理键手验为可选披露臂）。**口径澄清：条目②的
  custom_scrollbar/分数化绕道不涉本条——048（编辑回写链）与 043 行
  （nanbox 整值 float 等）分立，彼绕道随其自身债主计划收口，本条修复
  零触碰。**本条目终结。

## ④ 046 残段：VM 观感类消费缺席（渲染面板内边距 / CustomScrollbar thumb 观感）

- **症状**：`autodown` 组件臂 class 整串不读——渲染面板 `py-4 px-5` 等观感
  类 VM 缺席；CustomScrollbar thumb 观感同族。结构两栏与主题段已收（046
  T1 / 047）。
- **本仓复现**：demo/auto/PARITY.md #4/#8 + 「T1/T2 实测类消费清单」（VM 轨
  view 树逐 token 实测）；肉眼对照 vue 轨截图。
- **嫌疑面**：auto-lang 组件臂 class 消费（ui/autodown_blocks.rs 族）。
- **建议验收**：PARITY 实测清单内边距/thumb 项转 ✅（清单重跑）。

## ⑤ 016：a2ts 发射器缺口 T1-T4 / a2r 发射器残留 R1/R4 + Phase 0 五小修

- **症状（详单以 DEBTS 016 两行为准，tmp/dsl-probes 探针报告已随 tmp 清空）**：
  a2ts：T1 多 payload enum 构造不散装元组；T2 `is` 的 `else ->` 臂断裂；
  T3 可选值上 `is` 恒假比较；T4 return/let 位结构体构造缺 `new` + `const enum`
  与 isolatedModules 不兼容。a2r：R1 点链字段缺 `.as_str()`；R4 循环内
  owned Vec 被 move；五小修（空 map 字面量/map 下标分派/enum derive Hash/
  self 字段 length 丢 cast/保留字 `r#` 之外的 `final` 未转义——见 022 行）。
- **本仓影响**：本侧纪律/后修已消解（packages/engine/auto/*/gen.mjs 断言式
  后修 B1/B2 等）；**R 类是 a2r 试点 crate 深化的硬前置**。
- **建议验收**：逐项后修退役（gen.mjs 后修删除后全绿）；R1/R4 修复后
  `packages/engine/rust` 再生链 cargo check 零错。

## ⑥ 022：VM HTTP 信封不过 multipart/二进制（桌面导入导出无通道）

- **症状**：jade-garden back 的 assets/import/export 三路由在 VM 桌面形态
  dispatch 400——VM HTTP 信封是 JSON 文本协议；web 版走 rust 后端不受影响。
- **本仓复现**：jade-garden 桌面形态（desktop/README §3）导入导出操作。
- **嫌疑面/提案**：auto-lang VM HTTP 信封扩展（base64/分块）或宿主文件能力
  桥——Phase 5 收口时裁定路线（022 计划在案）。
- **建议验收**：桌面形态导入导出往返成功（e2e 或手验留档）。

---

*生成：PLAN-052 T14（2026-09-05）。条目①带读数与回归门（vm-smoke 第七组
known-fork 门控），其余为登记面转介。*
