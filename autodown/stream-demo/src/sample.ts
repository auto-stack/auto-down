// 示例流式文档：覆盖 markdown 常规块、代码块、:::details、以及
// ```json 组件块（streaming table，见 engine auto/streaming.at 的分段规则）。
export const SAMPLE_DOCUMENT = `# AutoDown 流式渲染演示

这是一个**流式输出**的演示：文本像 LLM 生成一样逐字到达，渲染器边收边排版。

## 能力总览

- 渐进式 markdown 解析（对不完整前缀安全）
- 末段打字机效果，历史段落即时定格
- \`json\` 组件块流式构建（表格逐行浮现）

:::details 为什么需要流式分段？
整篇文档一次性重排会导致频繁的布局抖动。引擎把流拆成 markdown 段与组件段，
**只有最后一段**保持动画状态，前面的段落渲染为最终态，滚动位置也随之稳定。
:::

## 数据表格也是流式的

下面这个表格以 \`json\` 组件块的形式逐字符到达，引擎用部分 JSON 解析器
提前识别出组件类型和已完成的行：

\`\`\`json
{
  "type": "table",
  "columns": ["方案", "首屏延迟", "布局抖动", "实现复杂度"],
  "rows": [
    { "方案": "整篇重排", "首屏延迟": "高", "布局抖动": "严重", "实现复杂度": "低" },
    { "方案": "markstream-vue", "首屏延迟": "低", "布局抖动": "中", "实现复杂度": "中" },
    { "方案": "AutoDown engine", "首屏延迟": "低", "布局抖动": "几乎无", "实现复杂度": "低（内置）" }
  ]
}
\`\`\`

## 代码高亮同样支持

\`\`\`ts
import { useStreamingDocument } from '@autodown/engine/render'

const { segments } = useStreamingDocument(rawText)

// rawText 是一个响应式的 Ref<string>：
// 每次流式 chunk 到达时更新它，segments 会自动重新分段
\`\`\`

> 流结束时 \`streaming\` 置为 false，所有段落进入最终渲染，
> 表格的 Loading 行消失，代码块补齐复制按钮。

Enjoy! 🎉
`
