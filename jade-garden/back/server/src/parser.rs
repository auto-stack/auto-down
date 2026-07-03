use crate::block::{generate_uuid, Block, BlockKind, ParsedPage};
use regex::Regex;
use std::collections::HashMap;

/// Split an `.ad` file into YAML frontmatter and Markdown body.
/// Returns `(frontmatter_json, body)`.
pub fn split_frontmatter(text: &str) -> (serde_json::Value, String) {
    let trimmed = text.trim_start();
    if !trimmed.starts_with("---") {
        return (serde_json::Value::Object(serde_json::Map::new()), text.to_string());
    }
    let rest = &trimmed[3..];
    let Some(end) = rest.find("\n---") else {
        return (serde_json::Value::Object(serde_json::Map::new()), text.to_string());
    };
    let yaml_text = &rest[..end];
    let body = &rest[end + 4..];
    let frontmatter: serde_json::Value = serde_yaml::from_str(yaml_text).unwrap_or_default();
    (frontmatter, body.trim_start().to_string())
}

/// Join frontmatter and body back into `.ad` text.
#[allow(dead_code)]
pub fn join_frontmatter(frontmatter: &serde_json::Value, body: &str) -> String {
    let yaml_text = serde_yaml::to_string(frontmatter).unwrap_or_default();
    format!("---\n{}---\n\n{}", yaml_text, body.trim_start())
}

lazy_static::lazy_static! {
    static ref ANCHOR_SUFFIX_RE: Regex = Regex::new(r"\s+\^([a-zA-Z0-9_-]+)\s*$").unwrap();
    static ref ID_PROPERTY_RE: Regex = Regex::new(r"^\s*id::\s*([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})\s*$").unwrap();
    static ref PROPERTY_RE: Regex = Regex::new(r"^\s*([a-zA-Z_][a-zA-Z0-9_\-]*)::\s*(.*)$").unwrap();
}

/// Parse an `.ad` file into a `ParsedPage`.
pub fn parse_page(text: &str) -> ParsedPage {
    let (frontmatter, body) = split_frontmatter(text);
    let blocks = parse_body(&body);
    ParsedPage { frontmatter, blocks }
}

fn parse_body(body: &str) -> Vec<Block> {
    let lines: Vec<&str> = body.lines().collect();
    let mut blocks: Vec<Block> = Vec::new();
    let mut i = 0;

    while i < lines.len() {
        let line = lines[i];

        // Fence: code blocks / callouts / details
        if line.starts_with("```") {
            let (block, next_i) = parse_fenced_block(&lines, i, BlockKind::Code);
            blocks.push(block);
            i = next_i;
            continue;
        }

        if line.starts_with(":::") {
            let kind = if line.starts_with(":::details") || line.starts_with("::: details") {
                BlockKind::Details
            } else {
                BlockKind::Callout
            };
            let (block, next_i) = parse_fenced_block(&lines, i, kind);
            blocks.push(block);
            i = next_i;
            continue;
        }

        // Horizontal rule
        if line.trim() == "---" || line.trim() == "***" || line.trim() == "___" {
            blocks.push(Block {
                uuid: generate_uuid(),
                block_id: None,
                kind: BlockKind::HorizontalRule,
                content: line.to_string(),
                properties: HashMap::new(),
                line_start: i,
                line_end: i + 1,
            });
            i += 1;
            continue;
        }

        // Heading
        if let Some(heading) = parse_heading(line, i) {
            blocks.push(heading);
            i += 1;
            continue;
        }

        // List item
        if let Some(list) = parse_list_item(line, i) {
            blocks.push(list);
            i += 1;
            continue;
        }

        // Blockquote
        if line.starts_with('>') {
            let (block, next_i) = parse_blockquote(&lines, i);
            blocks.push(block);
            i = next_i;
            continue;
        }

        // Blank line: skip, but do not consume it as a block.
        if line.trim().is_empty() {
            i += 1;
            continue;
        }

        // Paragraph: consume consecutive non-block lines.
        let (block, next_i) = parse_paragraph(&lines, i);
        blocks.push(block);
        i = next_i;
    }

    blocks
}

fn parse_heading(line: &str, line_idx: usize) -> Option<Block> {
    let trimmed = line.trim_start();
    let level = trimmed.chars().take_while(|c| *c == '#').count();
    if level == 0 || level > 6 || !trimmed.chars().nth(level).map(|c| c == ' ').unwrap_or(false) {
        return None;
    }
    let content = trimmed[level + 1..].trim().to_string();
    let (content, block_id) = extract_anchor(&content);
    Some(Block {
        uuid: generate_uuid(),
        block_id,
        kind: BlockKind::Heading,
        content,
        properties: HashMap::new(),
        line_start: line_idx,
        line_end: line_idx + 1,
    })
}

fn parse_list_item(line: &str, line_idx: usize) -> Option<Block> {
    let trimmed = line.trim_start();
    let kind = if trimmed.starts_with("- [ ] ") || trimmed.starts_with("- [x] ") || trimmed.starts_with("- [X] ") {
        BlockKind::Task
    } else if trimmed.starts_with("- ") {
        BlockKind::Bullet
    } else if trimmed.starts_with("1. ") || trimmed.starts_with("0. ") {
        // Naive ordered-list detection; any `N. ` prefix counts.
        BlockKind::Ordered
    } else {
        return None;
    };

    let prefix_len = match kind {
        BlockKind::Task => "- [ ] ".len(),
        BlockKind::Bullet => "- ".len(),
        BlockKind::Ordered => {
            let dot = trimmed.find(". ")?;
            dot + 2
        }
        _ => unreachable!(),
    };

    let content = trimmed[prefix_len..].trim().to_string();
    let (content, block_id) = extract_anchor(&content);

    Some(Block {
        uuid: generate_uuid(),
        block_id,
        kind,
        content,
        properties: HashMap::new(),
        line_start: line_idx,
        line_end: line_idx + 1,
    })
}

fn parse_paragraph(lines: &[&str], start: usize) -> (Block, usize) {
    let mut end = start;
    while end < lines.len()
        && !lines[end].trim().is_empty()
        && !is_block_start(lines[end])
    {
        end += 1;
    }
    let content = lines[start..end].join("\n");
    let (content, block_id) = extract_anchor(&content);
    (
        Block {
            uuid: generate_uuid(),
            block_id,
            kind: BlockKind::Paragraph,
            content,
            properties: HashMap::new(),
            line_start: start,
            line_end: end,
        },
        end,
    )
}

fn parse_blockquote(lines: &[&str], start: usize) -> (Block, usize) {
    let mut end = start;
    while end < lines.len() && lines[end].starts_with('>') {
        end += 1;
    }
    let content: String = lines[start..end]
        .iter()
        .map(|l| l.strip_prefix("> ").unwrap_or(&l[1..]).to_string())
        .collect::<Vec<_>>()
        .join("\n");
    let (content, block_id) = extract_anchor(&content);
    (
        Block {
            uuid: generate_uuid(),
            block_id,
            kind: BlockKind::Blockquote,
            content,
            properties: HashMap::new(),
            line_start: start,
            line_end: end,
        },
        end,
    )
}

fn parse_fenced_block(lines: &[&str], start: usize, kind: BlockKind) -> (Block, usize) {
    let _opener = lines[start];
    let fence = if kind == BlockKind::Code {
        "```".to_string()
    } else {
        ":::".to_string()
    };
    let mut end = start + 1;
    while end < lines.len() && !lines[end].trim_start().starts_with(&fence) {
        end += 1;
    }
    if end < lines.len() {
        end += 1; // include closing fence
    }
    let content = lines[start..end].join("\n");
    (
        Block {
            uuid: generate_uuid(),
            block_id: None,
            kind,
            content,
            properties: HashMap::new(),
            line_start: start,
            line_end: end,
        },
        end,
    )
}

fn is_block_start(line: &str) -> bool {
    let trimmed = line.trim_start();
    trimmed.starts_with('#')
        || trimmed.starts_with("- ")
        || trimmed.starts_with("- [")
        || trimmed.starts_with(">")
        || trimmed.starts_with("```")
        || trimmed.starts_with(":::")
        || trimmed.starts_with("---")
        || trimmed.starts_with("***")
        || trimmed.starts_with("___")
        || ORDERED_RE.is_match(trimmed)
}

lazy_static::lazy_static! {
    static ref ORDERED_RE: Regex = Regex::new(r"^\d+\.\s").unwrap();
}

/// Extract `^id` suffix from the end of a block's text.
fn extract_anchor(content: &str) -> (String, Option<String>) {
    let content = content.trim_end();
    if let Some(cap) = ANCHOR_SUFFIX_RE.captures(content) {
        let id = cap[1].to_string();
        let stripped = content[..content.len() - cap[0].len()].trim_end().to_string();
        (stripped, Some(id))
    } else {
        (content.to_string(), None)
    }
}

/// Find any `id:: <uuid>` line among the first lines of a block and return the UUID.
/// This is for Logseq compatibility; the parser itself only sets `block_id` from `^id`.
#[allow(dead_code)]
pub fn find_id_property(lines: &[&str]) -> Option<String> {
    for line in lines.iter().take(8) {
        if let Some(cap) = ID_PROPERTY_RE.captures(line) {
            return Some(cap[1].to_string());
        }
    }
    None
}

/// Parse `key:: value` properties from a block's content lines.
#[allow(dead_code)]
pub fn parse_block_properties(lines: &[&str]) -> HashMap<String, String> {
    let mut props = HashMap::new();
    for line in lines {
        if let Some(cap) = PROPERTY_RE.captures(line) {
            props.insert(cap[1].to_string(), cap[2].trim().to_string());
        }
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
}
