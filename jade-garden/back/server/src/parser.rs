//! `.ad` page parsing shell (Plan 021 Phase 2 slice 1).
//!
//! The pure segmentation/anchor/property logic lives in the single-source
//! `back/auto/parser.at` and arrives generated as [`crate::parser_gen`] —
//! dual-emitted (a2ts twin feeds the node parity test, a2r feeds this crate).
//! This shell only owns the Rust-side concerns: uuid stamping, the
//! serde_yaml frontmatter decode, and the BlockKind enum mapping.

use crate::block::{generate_uuid, Block, BlockKind, ParsedPage};
use crate::parser_gen;
use std::collections::HashMap;

/// Split an `.ad` file into YAML frontmatter and Markdown body.
/// Returns `(frontmatter_json, body)`.
pub fn split_frontmatter(text: &str) -> (serde_json::Value, String) {
    let scan = parser_gen::splitFrontmatterScan(text);
    if !scan.hasMarker {
        return (serde_json::Value::Object(serde_json::Map::new()), scan.body);
    }
    let frontmatter: serde_json::Value = serde_yaml::from_str(&scan.yaml).unwrap_or_default();
    (frontmatter, scan.body)
}

/// Join frontmatter and body back into `.ad` text.
#[allow(dead_code)]
pub fn join_frontmatter(frontmatter: &serde_json::Value, body: &str) -> String {
    let yaml_text = serde_yaml::to_string(frontmatter).unwrap_or_default();
    format!("---\n{}---\n\n{}", yaml_text, body.trim_start())
}

/// Parse an `.ad` file into a `ParsedPage`.
pub fn parse_page(text: &str) -> ParsedPage {
    let (frontmatter, body) = split_frontmatter(text);
    let blocks = parse_body(&body);
    ParsedPage { frontmatter, blocks }
}

fn parse_body(body: &str) -> Vec<Block> {
    parser_gen::parseBody(body)
        .into_iter()
        .map(|b| Block {
            uuid: generate_uuid(),
            block_id: (!b.blockId.is_empty()).then_some(b.blockId),
            kind: kind_from_str(&b.kind),
            content: b.content,
            properties: HashMap::new(),
            line_start: b.lineStart as usize,
            line_end: b.lineEnd as usize,
        })
        .collect()
}

fn kind_from_str(s: &str) -> BlockKind {
    match s {
        "heading" => BlockKind::Heading,
        "task" => BlockKind::Task,
        "bullet" => BlockKind::Bullet,
        "ordered" => BlockKind::Ordered,
        "code" => BlockKind::Code,
        "blockquote" => BlockKind::Blockquote,
        "callout" => BlockKind::Callout,
        "details" => BlockKind::Details,
        "hr" => BlockKind::HorizontalRule,
        _ => BlockKind::Paragraph,
    }
}

/// Find any `id:: <uuid>` line among the first lines of a block and return the UUID.
/// This is for Logseq compatibility; the parser itself only sets `block_id` from `^id`.
#[allow(dead_code)]
pub fn find_id_property(lines: &[&str]) -> Option<String> {
    for line in lines.iter().take(8) {
        let id = parser_gen::findIdPropertyLine(line);
        if !id.is_empty() {
            return Some(id);
        }
    }
    None
}

/// Parse `key:: value` properties from a block's content lines.
#[allow(dead_code)]
pub fn parse_block_properties(lines: &[&str]) -> HashMap<String, String> {
    let mut props = HashMap::new();
    for pair in parser_gen::parseBlockPropertiesLines(lines.iter().map(|l| l.to_string()).collect::<Vec<_>>()) {
        props.insert(pair.key, pair.value);
    }
    props
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_heading_with_anchor() {
        let text = "# Summary ^summary-abc1\n\nSome paragraph.\n";
        let page = parse_page(text);
        assert_eq!(page.blocks.len(), 2);
        assert_eq!(page.blocks[0].kind, BlockKind::Heading);
        assert_eq!(page.blocks[0].content, "Summary");
        assert_eq!(page.blocks[0].block_id.as_deref(), Some("summary-abc1"));
    }

    #[test]
    fn parse_task_and_bullet() {
        let text = "- [ ] TODO item ^task-1\n- Bullet item\n";
        let page = parse_page(text);
        assert_eq!(page.blocks.len(), 2);
        assert_eq!(page.blocks[0].kind, BlockKind::Task);
        assert_eq!(page.blocks[0].content, "TODO item");
        assert_eq!(page.blocks[0].block_id.as_deref(), Some("task-1"));
        assert_eq!(page.blocks[1].kind, BlockKind::Bullet);
    }

    #[test]
    fn parse_frontmatter() {
        let text = "---\ntitle: Foo\n---\n\n# Body\n";
        let page = parse_page(text);
        assert_eq!(page.frontmatter["title"], "Foo");
        assert_eq!(page.blocks[0].kind, BlockKind::Heading);
    }

    // ---- cross-language parity with the TS twin (gen-ts/parser_gen.ts) ----
    // The node twin test (../auto/tests/parity.mjs) runs the same fixtures
    // through the generated TS; both sides must agree field-for-field.

    #[test]
    fn parse_gen_parity_fixtures() {
        let fixtures: serde_json::Value =
            serde_json::from_str(include_str!("../../auto/tests/fixtures.json")).unwrap();
        for case in fixtures["cases"].as_array().unwrap() {
            let page = parse_page(case["text"].as_str().unwrap());
            let expected = case["expected"].as_array().unwrap();
            assert_eq!(
                page.blocks.len(),
                expected.len(),
                "case `{}`: block count",
                case["name"].as_str().unwrap()
            );
            for (b, e) in page.blocks.iter().zip(expected.iter()) {
                assert_eq!(b.kind_str(), e["kind"].as_str().unwrap(), "case `{}`", case["name"]);
                assert_eq!(b.content, e["content"].as_str().unwrap(), "case `{}`", case["name"]);
                assert_eq!(
                    b.block_id.as_deref().unwrap_or(""),
                    e["blockId"].as_str().unwrap(),
                    "case `{}`",
                    case["name"]
                );
                assert_eq!(b.line_start as i64, e["lineStart"].as_i64().unwrap());
                assert_eq!(b.line_end as i64, e["lineEnd"].as_i64().unwrap());
            }
        }
    }
}

