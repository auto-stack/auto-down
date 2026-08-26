// Parse-blocks cross-target parity (plan 019 Phase 1): the same directed
// fixture corpus (kept in lockstep with the TS generator — the golden itself
// enforces it) is parsed by the a2r emission of markdown_parser.at and
// projected exactly like engine src/parser/__tests__/rust-parse-parity-gen.test.ts
// does on the TS side. The golden is rewritten by the TS test on every
// engine `pnpm test`; a mismatch here means the two emissions of the same
// .at source have drifted (or a fixture was edited on one side only).

use autodown_core::block_model::{BlockNode, Value};
use autodown_core::markdown_parser::parse_blocks;

const FIXTURES: &[(&str, &str)] = &[
    ("heading-para", "# Hello\n\nworld **bold** and *em* text.\n"),
    ("setext", "标题 setext\n===\n\n第一段\n第二段\n"),
    ("fence-closed", "```rust\nfn main() {\n    println!(\"hi\");\n}\n```\n"),
    ("fence-tilde-open", "~~~py\nx = 1\n"),
    ("blockquote", "> 引用一行\n> 引用二行\n\n普通段落\n"),
    ("blockquote-lazy", "> 引用\n懒惰续行\n"),
    ("ul-nested", "- 甲\n  - 甲子\n  - 甲丑\n- 乙\n"),
    ("ul-empty-item", "-\n- 有内容\n"),
    ("ol-start", "3. 第三\n4. 第四\n"),
    (
        "table-ial",
        "| a | b |\n| :-- | --: |\n| 1 | 2 |\n{cols:[120,\"auto\"]}\n",
    ),
    ("thematic", "---\n\n***\n\n尾段\n"),
    (
        "inline-zoo",
        concat!(
            "链接 [文本](https://example.com \"标题\") 图 ![alt](img.png) 删除 ~~删~~ 码 `x = y` ",
            "硬断行  \n转义 \\*字面\\* 智能 \"引号\" 与 撇号 'don\'t' 以及中英混排 “已经弯的”。\n"
        ),
    ),
    ("anchor", "带锚点块 ^my-anchor\n"),
    ("streaming-heading", "## 编辑中的标题\n\n- 列表项\n- "),
    ("streaming-link", "半截链接 [文本](https://example.\n"),
    ("streaming-pretable", "| a | b |\n| --- |\n"),
    ("streaming-partial-paren", "流式前缀构造:截断的标题（\n"),
    ("empty", ""),
];

fn esc(s: &str) -> String {
    s.replace('\\', "\\\\")
        .replace('"', "\\\"")
        .replace('\n', "\\n")
        .replace('\r', "\\r")
}

fn proj_value(v: &Value) -> String {
    match v {
        Value::Null => "Null".to_string(),
        Value::Str(s) => format!("Str({})", esc(s)),
        Value::Int(i) => format!("Int({})", i),
        Value::Bool(b) => format!("Bool({})", b),
        Value::ListV(l) => format!(
            "List({})",
            l.iter().map(proj_value).collect::<Vec<_>>().join(",")
        ),
        Value::AttrsV(a) => format!(
            "Attrs({})",
            a.iter()
                .map(|x| format!("{}={}", x.key, proj_value(&x.value)))
                .collect::<Vec<_>>()
                .join(",")
        ),
    }
}

fn proj_block(b: &BlockNode, out: &mut Vec<String>, depth: usize) {
    let ind = "  ".repeat(depth);
    out.push(format!("{}block {} {:?}", ind, b.id, b.kind));
    for a in &b.attrs {
        out.push(format!("{}  attr {} {}", ind, a.key, proj_value(&a.value)));
    }
    for s in &b.inlines {
        let marks = s
            .marks
            .iter()
            .map(|m| format!("{:?}", m))
            .collect::<Vec<_>>()
            .join(",");
        let mut line = format!("{}  span {} [{}]", ind, esc(&s.text), marks);
        if !s.attrs.is_empty() {
            let attrs = s
                .attrs
                .iter()
                .map(|a| format!("{}={}", a.key, proj_value(&a.value)))
                .collect::<Vec<_>>()
                .join(",");
            line.push_str(&format!(" {{{}}}", attrs));
        }
        out.push(line);
    }
    for c in &b.children {
        proj_block(c, out, depth + 1);
    }
}

#[test]
fn parse_blocks_matches_ts_golden() {
    let golden = include_str!("golden/parse-blocks.golden.txt");
    let mut lines: Vec<String> = vec![
        "# parse-blocks cross-target parity golden (plan 019 Phase 1).".to_string(),
        "# Rewritten by engine src/parser/__tests__/rust-parse-parity-gen.test.ts on".to_string(),
        "# every `pnpm test`; asserted by rust tests/parse_parity.rs. Do not edit.".to_string(),
        String::new(),
    ];
    for (name, md) in FIXTURES {
        for fin in [false, true] {
            lines.push(format!("=== {} final={} ===", name, fin));
            let root = parse_blocks(md, fin);
            for b in &root.children {
                proj_block(b, &mut lines, 0);
            }
        }
    }
    assert_eq!(lines.join("\n") + "\n", golden);
}
