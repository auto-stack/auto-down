# AutoDown 书籍阅读格式

`autodown-reading/1` 是 AutoDown 的章级只读解析格式。解析时传入作品清单中的章 ID。省略时可从带持久锚的章节标题推断。作品与版本仍由消费方管理。基准书包为 auto-reader-books 的 `pilot-03`，提交 `f972adfad5daccb88a4808da625957e96e2837d1`，格式来源为该提交的 `docs/design/13-autodown-book-format.md`。

## 源稿和投影

- `段落 ^p`、`# 标题 ^c` 声明块锚。`[句群]{^s}` 声明段内锚，可容纳完整的 Markdown 样式或链接。所有持久 ID 只在本章内唯一，语法为 ASCII 字母、数字、`-` 和 `_`。
- `::card id 题目` 收集后续正文块，到下一条卡声明、原书标题或章末结束。横线与普通空行保留在卡片范围内。`::card ^id ^first..^last 题目` 取包含首末锚的连续正文，`::card ^id ^target 题目` 取单锚。卡组与正文用空行分隔，卡按声明顺序排列，允许多张卡选文重叠。
- 解析沿用普通 Markdown 块扫描器。代码围栏、缩进代码、列表、引用、行内代码和转义的示例保持其 Markdown 源文本。整章导出隐藏作者锚、卡声明与声明多出的分隔空行，保留自然段、原书标题及其顺序。
- `parseBookChapter(source, chapterId, isFinal)` 返回有序正文块、段名/句群/标题索引、卡和诊断。`bookChapterTree` 按需生成普通 AutoDown 块树。偏移在 Web 和 Rust 都使用只读 Markdown 投影的 UTF-16 单位，左闭右开。存进度和批注时以作品、版本系列、章 ID 和目标 ID 寻址，另存引文与上下文。
- `projectBookChapter` 的空卡 ID 返回整章。有效卡返回纯文字卡题和 Markdown 选文。未知、歧义及无范围的卡返回空。`locateBookTarget` 拒绝重名目标，`serializeBookChapter` 回写接收的原始源稿，包括原有标记、转义、换行。`parseBookChapter` 可对新修订重建区间，已声明的 ID 原样保留。
- 诊断含代码、章 ID、一基源稿行和目标 ID。诊断覆盖非法卡头、重名、无正文连续卡、倒序、同一卡的两个异名端点重叠、嵌套句群以及被外层链接或样式截断的句群。章输入未结束时，待解析引用保持未决。

## 组件和消费约定

在 AutoUI `autodown` 节点设置 `reading_mode: true`，`content` 接收章源稿。`reading_chapter_id` 可由清单传入，空 `reading_card_id` 展示整章，设置卡 ID 展示卡题和所选正文。`reading_target_id` 滚动到当前投影内包含目标的块。清空后可再次传同一 ID 触发跳转。

`onbookselect` 向单参数消息传一个 JSON 字符串。字段为 `chapterId`、`cardId`、`paragraphId`、`targetId`、`text`、`before`、`after`。句群内的选区优先返回句群 ID，其余段内选区用段 ID，上下文来自完整自然段。整章模式的 `cardId` 为空。阅读组件输出单个自然段内的有锚选区。跨段引文可按起止锚使用解析结果。批注、进度、目录和校订迁移由 Reader 或内容仓消费此接口。

Web 使用 `@autodown/engine` 的 `StreamingRenderer`。原生 VM 的 AutoUI 依赖同版 `autodown-core`，开启 `autodown` feature。`@autodown/engine/parser` 与 Rust 的 `autodown_core::book_reading` 提供解析器和索引 API。

## 重现 pilot-03 验收

在 `autodown/packages/engine` 下准备 Web 模块与 Rust 调试示例，再运行双端字节级对拍。第三步最后一个参数可选填单部作品的目录名，例如 `lunyu`。

```powershell
pnpm exec esbuild src/parser.ts --bundle --platform=node --format=esm --outfile=D:/autostack/plan-artifacts/plan-087/parser.mjs
cargo build --manifest-path rust/Cargo.toml --locked --example book_reading
node scripts/verify-book-reading.mjs D:/autostack/auto-reader/auto-reader-books D:/autostack/plan-artifacts/plan-087/parser.mjs rust/target/debug/examples/book_reading.exe
```

样章交互测试使用同一批固定夹具。也可用 `book_reading.exe <chapter.ad> [card-id]` 直接取整章或指定卡片的 Markdown。
