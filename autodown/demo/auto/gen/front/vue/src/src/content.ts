// content.ts — the demo document. Extracted from App.vue (plan 014): the Auto
// widget DSL has no multi-line template literals, so the initial markdown lives
// in this hand-written module and reaches the generated App.vue through the
// demo app bridge (demo/auto/src/front/utils/app_ext.ts).
export function initialContent(): string {
  return `# Heading One

This is a paragraph with **bold**, *italic*, \`inline code\`, and a [link](https://example.com).

## Heading Two

### Heading Three

> This is a blockquote. It should look the same on both sides.

\`\`\`javascript
const foo = 'bar'
console.log(foo)
\`\`\`

\`\`\`rust
fn main() {
    println!("Hello, world!");
}
\`\`\`

\`\`\`python
def fibonacci(n):
    a, b = 0, 1
    for _ in range(n):
        a, b = b, a + b
    return a
\`\`\`

\`\`\`typescript
interface User {
  id: number
  name: string
  email: string
}
\`\`\`

\`\`\`bash
echo "Hello from bash!"
curl -s https://api.example.com/data | jq '.results'
\`\`\`

\`\`\`
This is plain text code block
with no language specified
\`\`\`

- Bullet item one
- Bullet item two
  - Nested bullet A
  - Nested bullet B

1. Ordered item one
2. Ordered item two

- [x] Task item done
- [ ] Task item pending

| Name | Value | Note |
|------|-------|------|
| Foo  | 1     | Alpha |
| Bar  | 2     | Beta  |
| Baz  | 3     | Gamma |

$callout(type: "warning", title: "Warning") {
This is a **warning** callout. It uses a light yellow background and an amber title/icon.
}

$callout(type: "info", title: "Info") {
This is an **info** callout. It uses a light blue background and a sky-blue title/icon.
}

$callout(type: "error", title: "Error") {
This is an **error** callout. It uses a light red background and a red title/icon.
}

$details(summary: "Click to expand") {
This is a **Details** block. The content is collapsed by default and expanded when the summary is clicked.
}

%{
E = mc^2
}%

\`\`\`mermaid
graph TD
  A[Start] --> B{Is it?}
  B -->|Yes| C[OK]
  B -->|No| D[End]
\`\`\`

%{
\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}
}%

\`\`\`mermaid
flowchart LR
  Start[Start] --> Input[Source textarea]
  Input --> Preview[Live preview]
  Preview --> Save{Looks good?}
  Save -->|yes| Done[Blur commits]
  Save -->|no| Input
\`\`\`

---

![A placeholder image](https://placehold.co/400x100/f3f4f6/9ca3af?text=Image)

Inline faces (plan 036): a [[Hello World]] wiki link, inline math $a^2+b^2=c^2$, and plain \`code\` after them.

## Query and embed loading (plan 038)

Fixed-result route:

$query(TAG #project)

Empty route:

$query(demo empty route)

Error route:

$query(trigger demo fail)

Block-load route:

$embed(src: "docs/guide.md#^anchor-1")

Not-found route:

$embed(src: "^missing-anchor")

Page-level reference (label face, no load):

$embed(src: "../other.ad")
`
}
