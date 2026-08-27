//! Smoke tests for the a2r-emitted autodown-core pilot crate (plan 016
//! Phase 4): construct small block trees by hand, serialize, assert exact
//! `.ad` text. Mirrors a subset of the TS roundtrip suite's directed cases
//! (packages/core/src/__tests__/serializer-roundtrip.test.ts).

use autodown_core::block_model::{
    attrSet, block, leafBlock, markedSpan, rng, span, Attr, BlockNode, BlockType, InlineSpan,
    Mark, Value,
};
use autodown_core::serializer::serialize;

fn doc(children: Vec<BlockNode>) -> BlockNode {
    BlockNode {
        id: "doc".to_string(),
        kind: BlockType::Paragraph,
        attrs: vec![],
        children,
        inlines: vec![],
        source: rng(0, 0),
    }
}

fn para(id: &str, text: &str) -> BlockNode {
    leafBlock(id, BlockType::Paragraph, text)
}

#[test]
fn smoke_heading_paragraph_list() {
    let mut h = block("block-0", BlockType::Heading);
    h.attrs = attrSet(h.attrs, "level", Value::Int(1));
    h.inlines = vec![span("Hello")];

    let p = BlockNode {
        id: "block-1".to_string(),
        kind: BlockType::Paragraph,
        attrs: vec![],
        children: vec![],
        inlines: vec![
            span("a "),
            markedSpan("bold", vec![Mark::Strong]),
            span(" move"),
        ],
        source: rng(0, 0),
    };

    let item = |id: &str, text: &str| BlockNode {
        id: id.to_string(),
        kind: BlockType::ListItem,
        attrs: vec![],
        children: vec![para(&format!("{}-0", id), text)],
        inlines: vec![],
        source: rng(0, 0),
    };
    let mut list = block("block-2", BlockType::ListBlock);
    list.attrs = attrSet(list.attrs, "ordered", Value::Bool(false));
    list.children = vec![item("block-2-0", "one"), item("block-2-1", "two")];

    let out = serialize(doc(vec![h, p, list]), false);
    assert_eq!(out, "# Hello\n\na **bold** move\n\n- one\n- two\n");
}

#[test]
fn smoke_table_with_ial() {
    let cell = |id: &str, header: bool, text: &str| BlockNode {
        id: id.to_string(),
        kind: BlockType::TableCell,
        attrs: attrSet(
            attrSet(vec![], "header", Value::Bool(header)),
            "align",
            Value::Str("".to_string()),
        ),
        children: vec![],
        inlines: vec![span(text)],
        source: rng(0, 0),
    };
    let row = |id: &str, header: bool, text: &str| BlockNode {
        id: id.to_string(),
        kind: BlockType::TableRow,
        attrs: vec![],
        children: vec![cell(&format!("{}-c0", id), header, text)],
        inlines: vec![],
        source: rng(0, 0),
    };
    let ial = Value::AttrsV(vec![
        Attr {
            key: "cols".to_string(),
            value: Value::ListV(vec![Value::Int(120), Value::Null]),
        },
        Attr {
            key: "rows".to_string(),
            value: Value::ListV(vec![Value::Int(40)]),
        },
    ]);
    let mut table = block("block-0", BlockType::Table);
    table.children = vec![row("block-0-h", true, "a"), row("block-0-r0", false, "1")];
    table.attrs = attrSet(table.attrs, "ial", ial);

    let out = serialize(doc(vec![table]), false);
    assert_eq!(
        out,
        "| a |\n| --- |\n| 1 |\n{cols:[120,\"auto\"], rows:[40]}\n"
    );
}

#[test]
fn smoke_emit_ids() {
    let mut h = block("title-1", BlockType::Heading);
    h.attrs = attrSet(h.attrs, "level", Value::Int(2));
    h.inlines = vec![span("Title")];
    h.attrs = attrSet(h.attrs, "anchor", Value::Str("title-1".to_string()));
    let anchored = para("my-anchor", "kept ^my-anchor");

    let out = serialize(doc(vec![h, anchored]), true);
    assert_eq!(out, "## Title ^title-1\n\nkept ^my-anchor\n");
}

#[test]
fn smoke_hardbreak_and_fence() {
    let hb = BlockNode {
        id: "block-0".to_string(),
        kind: BlockType::Paragraph,
        attrs: vec![],
        children: vec![],
        inlines: vec![
            span("line one"),
            InlineSpan {
                text: "\n".to_string(),
                marks: vec![],
                attrs: vec![],
            },
            span("line two"),
        ],
        source: rng(0, 0),
    };
    let mut f = block("block-1", BlockType::Fence);
    f.attrs = attrSet(f.attrs, "language", Value::Str("ts".to_string()));
    f.inlines = vec![span("const x = 1\n")];

    let out = serialize(doc(vec![hb, f]), false);
    assert_eq!(out, "line one  \nline two\n\n```ts\nconst x = 1\n```\n");
}
