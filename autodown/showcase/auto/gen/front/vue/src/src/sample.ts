// sample.ts — the showcase seed document (PLAN-059 T4; demo content.ts
// precedent, plan 040 单源化). The ONE place the document lives: vue track
// reads it through showcase_ext.ts initial_content(); VM track gets a
// GENERATED adapter (showcase_ext.vm.at) derived from this file by
// auto/scripts/gen-vm-content.mjs — both tracks start from the same text
// and cannot drift.
//
// Corpus: representative subset of the 032 tri-state kinds — headings,
// paragraph with the full mark set, nested list + checkbox, blockquote,
// multilingual fences, table, callout, details, wikilink. math/mermaid
// deliberately excluded (PLAN-059 scope cut: first-paint compute + VM
// look debt); typing them into the edit pane still works.

export const SAMPLE_DOCUMENT = `# AutoDown Showcase

Three panes, one document: type in **edit**, watch **view** mirror it live, and hit replay to watch **stream** re-flow the same text.

This paragraph exercises the mark set: **bold**, *italic*, ~~struck~~, \`inline code\`, and a [link](https://example.com).

## Lists

- Bullet item one
- Bullet item two
  - Nested bullet A
  - Nested bullet B

1. Ordered item one
2. Ordered item two

- [x] Task item done
- [ ] Task item pending

> This is a blockquote. It should look the same in every pane.

## Code fences

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

\`\`\`
This is plain text code block
with no language specified
\`\`\`

## Table

| Name | Value | Note |
|------|-------|------|
| Foo  | 1     | Alpha |
| Bar  | 2     | Beta  |
| Baz  | 3     | Gamma |

## Callouts and details

$callout(type: "warning", title: "Warning") {
This is a **warning** callout. It uses a light yellow background and an amber title/icon.
}

$callout(type: "info", title: "Info") {
This is an **info** callout. It uses a light blue background and a sky-blue title/icon.
}

$details(summary: "Click to expand") {
This is a **Details** block. The content is collapsed by default and expanded when the summary is clicked.
}

---

Inline faces: a [[Hello World]] wiki link followed by plain \`code\`.
`
