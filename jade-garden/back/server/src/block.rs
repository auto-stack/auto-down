use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// A block is the smallest addressable unit inside a page.
/// Mirrors Logseq's "block" concept but adapted to jade-garden's `.ad` format.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Block {
    /// Stable internal UUID (v4). Never changes once assigned.
    pub uuid: String,
    /// Human-readable / user-visible anchor, e.g. "summary" or "idea-3a7f".
    /// Obsidian uses `^id`; Logseq uses `id:: uuid`. We expose `^id` in the UI
    /// and keep `id:: uuid` for Logseq compatibility.
    pub block_id: Option<String>,
    /// What kind of block this is.
    pub kind: BlockKind,
    /// The text content of the block (without the anchor suffix).
    pub content: String,
    /// Block-level properties extracted from the text (`key:: value`) or
    /// inherited from the page frontmatter for the root block.
    pub properties: HashMap<String, String>,
    /// 0-based line range inside the `.ad` body.
    pub line_start: usize,
    pub line_end: usize,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum BlockKind {
    /// The implicit root block that holds page-level metadata.
    Root,
    Heading,
    Paragraph,
    Bullet,
    Ordered,
    Task,
    Code,
    Blockquote,
    Callout,
    Details,
    HorizontalRule,
}

impl Block {
    #[allow(dead_code)]
    pub fn is_list_item(&self) -> bool {
        matches!(self.kind, BlockKind::Bullet | BlockKind::Ordered | BlockKind::Task)
    }

    #[allow(dead_code)]
    pub fn marker_text(&self) -> Option<String> {
        if !self.is_list_item() {
            return None;
        }
        // Marker prefix is stripped from content by the parser, so we can't
        // reconstruct it from content alone. Callers that need the raw marker
        // should use `Block::raw_content` or access the source lines.
        None
    }
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct ParsedPage {
    /// The page's YAML frontmatter as a JSON object.
    pub frontmatter: serde_json::Value,
    /// All top-level blocks. Nesting is represented by parent pointers in the index.
    pub blocks: Vec<Block>,
}

impl ParsedPage {
    #[allow(dead_code)]
    pub fn find_block_by_id(&self, id: &str) -> Option<&Block> {
        self.blocks.iter().find(|b| b.block_id.as_deref() == Some(id))
    }

    #[allow(dead_code)]
    pub fn find_block_by_uuid(&self, uuid: &str) -> Option<&Block> {
        self.blocks.iter().find(|b| b.uuid == uuid)
    }
}

/// Generate a short readable block id. We keep it Obsidian-style: lowercase,
/// alphanumeric + hyphen, 8–16 chars. The caller must ensure uniqueness within
/// the page.
pub fn generate_block_id() -> String {
    use rand::Rng;
    let mut rng = rand::rng();
    let suffix: String = (0..4)
        .map(|_| rng.sample(rand::distr::Alphanumeric) as char)
        .map(|c| c.to_ascii_lowercase())
        .collect();
    format!("block-{}", suffix)
}

/// Generate a v4 UUID string.
pub fn generate_uuid() -> String {
    uuid::Uuid::new_v4().to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn block_id_format() {
        let id = generate_block_id();
        assert!(id.starts_with("block-"));
        assert_eq!(id.len(), 10);
    }
}
