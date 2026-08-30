//! In-memory workspace index persisted as a JSON file.
//!
//! Plan 022 slice 6 (storage-ruling follow-up): SQLite retired. After
//! slice 5 removed FTS5 the remaining schema was plain rows, and the
//! ruling picked JSON-file storage over a rusqlite FFI binding for the
//! Phase 3 VM (a2r-std has fs+json, no db). The file
//! `<workspace-root>/jade-garden-index.json` is a regenerable cache: the
//! startup rebuild (links::rebuild_index) re-indexes every .ad file and
//! flushes once at the end; incremental mutations flush through the
//! links.rs helpers. A missing or unparsable cache starts empty — the
//! startup rebuild immediately rewrites it.
//!
//! Semantics preserved from the SQLite implementation (scan equivalents
//! of the old SQL): COLLATE NOCASE ≈ ASCII case-insensitive compare;
//! ORDER BY reproduced where a consumer saw ordered rows. Known latent
//! quirk carried over unchanged: index_file removes the page's blocks
//! before the uuid stability lookup runs, so that lookup never hits and
//! block uuids regenerate on every save (pre-existing behavior, logged
//! in the plan — fixing it is a separate semantic decision).

use crate::block::{generate_uuid, Block, BlockKind};
use crate::links_gen;
use crate::parser::{parse_page, split_frontmatter};
use crate::search_gen;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

/// The in-memory index for a workspace, flushed to
/// `<workspace-root>/jade-garden-index.json`.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(default)]
struct IndexData {
    pages: Vec<PageRow>,
    blocks: Vec<BlockRow>,
    links: Vec<LinkRow>,
    tags: Vec<TagRow>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct PageRow {
    path: String,
    title: String,
    frontmatter: String,
    mtime: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct LinkRow {
    source_page: String,
    source_block_uuid: Option<String>,
    target_page: Option<String>,
    target_block_uuid: Option<String>,
    link_type: String,
    context: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct TagRow {
    page_path: String,
    tag_name: String,
    block_uuid: Option<String>,
}

pub struct Index {
    path: Option<PathBuf>,
    data: IndexData,
}

impl Index {
    pub fn open(path: &Path) -> Result<Self, String> {
        // Self-healing cache: an absent or unparsable file starts empty and
        // the startup rebuild rewrites it on the next flush.
        let data = std::fs::read_to_string(path)
            .ok()
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or_default();
        Ok(Self {
            path: Some(path.to_path_buf()),
            data,
        })
    }

    #[allow(dead_code)]
    pub fn open_in_memory() -> Result<Self, String> {
        Ok(Self {
            path: None,
            data: IndexData::default(),
        })
    }

    /// Persist the index to its JSON file. No-op for in-memory indexes.
    pub fn flush(&self) -> Result<(), String> {
        let Some(path) = &self.path else {
            return Ok(());
        };
        let json = serde_json::to_string_pretty(&self.data).map_err(|e| e.to_string())?;
        let tmp = path.with_extension("json.tmp");
        std::fs::write(&tmp, json).map_err(|e| e.to_string())?;
        std::fs::rename(&tmp, path).map_err(|e| e.to_string())?;
        Ok(())
    }

    /// Index or re-index a single file.
    pub fn index_file(&mut self,
        wiki: &Path,
        path: &Path,
        text: &str,
        title: &str,
    ) -> Result<(), String> {
        let rel = rel_path(wiki, path);
        let parsed = parse_page(text);
        let mtime = std::fs::metadata(path)
            .and_then(|m| m.modified())
            .ok()
            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|d| d.as_secs() as i64)
            .unwrap_or(0);

        // Remove old data for this page. NOTE: this runs before the uuid
        // stability lookup below, exactly like the SQL flow — the lookup
        // therefore never hits and uuids regenerate per save (preserved
        // quirk, see module docs).
        self.data.blocks.retain(|b| b.page_path != rel);
        self.data.links.retain(|l| l.source_page != rel);
        self.data.tags.retain(|t| t.page_path != rel);
        self.data.pages.retain(|p| p.path != rel);

        // Insert page.
        let frontmatter_json = serde_json::to_string(&parsed.frontmatter).unwrap_or_default();
        self.data.pages.push(PageRow {
            path: rel.clone(),
            title: title.to_string(),
            frontmatter: frontmatter_json,
            mtime,
        });

        for block in &parsed.blocks {
            // Preserved quirk: always empty (rows were removed above).
            let uuid = if let Some(bid) = &block.block_id {
                self.data
                    .blocks
                    .iter()
                    .find(|b| b.page_path == rel && b.block_id.as_deref() == Some(bid))
                    .map(|b| b.uuid.clone())
                    .unwrap_or_else(generate_uuid)
            } else {
                generate_uuid()
            };

            let props_json = serde_json::to_string(&block.properties).unwrap_or_default();
            self.data.blocks.push(BlockRow {
                uuid,
                page_path: rel.clone(),
                block_id: block.block_id.clone(),
                kind: kind_str(block.kind),
                content: block.content.clone(),
                properties: props_json,
                line_start: block.line_start,
                line_end: block.line_end,
            });
        }

        // Extract links, tags, and aliases from raw text.
        let (_, body) = split_frontmatter(text);
        let links = extract_links(&body, &rel, &parsed.blocks);
        self.data.links.extend(links);

        let aliases = extract_aliases(&parsed.frontmatter);
        for alias in aliases {
            self.data.tags.push(TagRow {
                page_path: rel.clone(),
                tag_name: alias.tag_name,
                block_uuid: alias.block_uuid,
            });
        }
        for tag in extract_tags(&body, &rel, &parsed.blocks) {
            self.data.tags.push(TagRow {
                page_path: tag.page_path,
                tag_name: tag.tag_name,
                block_uuid: tag.block_uuid,
            });
        }

        Ok(())
    }

    pub fn remove_file(&mut self,
        wiki: &Path,
        path: &Path,
    ) -> Result<(), String> {
        let rel = rel_path(wiki, path);
        self.data.blocks.retain(|b| b.page_path != rel);
        self.data.links.retain(|l| l.source_page != rel);
        self.data.tags.retain(|t| t.page_path != rel);
        self.data.pages.retain(|p| p.path != rel);
        Ok(())
    }

    pub fn rename_file(&mut self,
        wiki: &Path,
        old_path: &Path,
        new_path: &Path,
        new_title: &str,
    ) -> Result<(), String> {
        let old_rel = rel_path(wiki, old_path);
        let new_rel = rel_path(wiki, new_path);
        for page in &mut self.data.pages {
            if page.path == old_rel {
                page.path = new_rel.clone();
                page.title = new_title.to_string();
            }
        }
        for block in &mut self.data.blocks {
            if block.page_path == old_rel {
                block.page_path = new_rel.clone();
            }
        }
        for link in &mut self.data.links {
            if link.source_page == old_rel {
                link.source_page = new_rel.clone();
            }
            if link.target_page.as_deref() == Some(&old_rel) {
                link.target_page = Some(new_rel.clone());
            }
        }
        for tag in &mut self.data.tags {
            if tag.page_path == old_rel {
                tag.page_path = new_rel.clone();
            }
        }
        Ok(())
    }

    /// Lookup helpers used by the API layer.

    /// Resolve a page title or alias to its path (ASCII case-insensitive,
    /// like the old COLLATE NOCASE).
    fn resolve_page_path(&self, title: &str) -> Option<String> {
        if let Some(page) = self
            .data
            .pages
            .iter()
            .find(|p| p.title.eq_ignore_ascii_case(title))
        {
            return Some(page.path.clone());
        }
        self.data
            .tags
            .iter()
            .find(|t| t.tag_name.eq_ignore_ascii_case(title))
            .map(|t| t.page_path.clone())
    }

    #[allow(dead_code)]
    pub fn page_exists(&self,
        title: &str,
    ) -> Result<Option<String>, String> {
        Ok(self.resolve_page_path(title))
    }

    pub fn page_aliases(&self, page_path: &str) -> Result<Vec<String>, String> {
        Ok(self
            .data
            .tags
            .iter()
            .filter(|t| t.page_path == page_path && t.block_uuid.is_none())
            .map(|t| t.tag_name.clone())
            .collect())
    }

    pub fn unlinked_references(
        &self,
        names: &[String],
    ) -> Result<Vec<crate::unlinked::UnlinkedRef>, String> {
        let mut refs = Vec::new();
        for block in &self.data.blocks {
            // plan-022 Phase 5: scan retired to unlinked_gen (unlinked.at).
            for hit in crate::unlinked_gen::findUnlinkedRefs(&block.content, names.to_vec()) {
                refs.push(crate::unlinked::UnlinkedRef {
                    page_path: block.page_path.clone(),
                    block_uuid: Some(block.uuid.clone()),
                    context: hit.context,
                    matched_text: hit.matched,
                });
            }
        }
        Ok(refs)
    }

    /// Find a block by its UUID or by its (page_path, block_id) pair.
    /// The `id` may be either a UUID or a `^id` string.
    pub fn find_block(
        &self,
        id: &str,
    ) -> Result<Option<BlockRow>, String> {
        // Try UUID first, then block_id (Obsidian-style ^id).
        Ok(self
            .data
            .blocks
            .iter()
            .find(|b| b.uuid == id)
            .or_else(|| self.data.blocks.iter().find(|b| b.block_id.as_deref() == Some(id)))
            .cloned())
    }

    /// Find a block by page title and block id/anchor.
    pub fn find_block_in_page(
        &self,
        page_title: &str,
        block_id: &str,
    ) -> Result<Option<BlockRow>, String> {
        let page_path = match self.resolve_page_path(page_title) {
            Some(p) => p,
            None => return Ok(None),
        };
        Ok(self
            .data
            .blocks
            .iter()
            .find(|b| b.page_path == page_path && b.block_id.as_deref() == Some(block_id))
            .cloned())
    }

    pub fn backlinks(
        &self,
        title: &str,
    ) -> Result<Vec<BacklinkRow>, String> {
        let target_path = match self.resolve_page_path(title) {
            Some(p) => p,
            None => return Ok(Vec::new()),
        };
        // Links are stored by target title/alias, not by path, so look up the
        // canonical page title and match case-insensitively.
        let canonical_title = self
            .data
            .pages
            .iter()
            .find(|p| p.path == target_path)
            .map(|p| p.title.clone())
            .ok_or("Indexed page row missing")?;
        let mut rows: Vec<BacklinkRow> = self
            .data
            .links
            .iter()
            .filter(|l| {
                l.target_page
                    .as_deref()
                    .map(|t| t.eq_ignore_ascii_case(&canonical_title))
                    .unwrap_or(false)
            })
            .map(|l| BacklinkRow {
                source_page: l.source_page.clone(),
                source_block_uuid: l.source_block_uuid.clone(),
                context: l.context.clone(),
            })
            .collect();
        rows.sort_by(|a, b| a.source_page.cmp(&b.source_page));
        Ok(rows)
    }

    pub fn outlinks(
        &self,
        title: &str,
    ) -> Result<Vec<OutlinkRow>, String> {
        let source = match self.resolve_page_path(title) {
            Some(p) => p,
            None => return Ok(Vec::new()),
        };
        let mut rows: Vec<OutlinkRow> = self
            .data
            .links
            .iter()
            .filter(|l| l.source_page == source)
            .map(|l| OutlinkRow {
                target_page: l.target_page.clone(),
                target_block_uuid: l.target_block_uuid.clone(),
                link_type: l.link_type.clone(),
            })
            .collect();
        rows.sort_by(|a, b| a.target_page.cmp(&b.target_page));
        Ok(rows)
    }

    pub fn graph_data(&self) -> Result<GraphData, String> {
        let mut nodes: Vec<GraphNodeRow> = self
            .data
            .pages
            .iter()
            .map(|p| GraphNodeRow {
                path: p.path.clone(),
                title: p.title.clone(),
            })
            .collect();
        nodes.sort_by(|a, b| a.path.cmp(&b.path));

        let resolve_target = |target: &str| -> Option<String> {
            if let Some(page) = self
                .data
                .pages
                .iter()
                .find(|p| p.title.eq_ignore_ascii_case(target))
            {
                return Some(page.path.clone());
            }
            self.data
                .tags
                .iter()
                .find(|t| t.tag_name.eq_ignore_ascii_case(target))
                .map(|t| t.page_path.clone())
        };

        let mut edges: Vec<GraphEdgeRow> = self
            .data
            .links
            .iter()
            .filter_map(|l| {
                let target = l.target_page.as_deref()?;
                let target_path = resolve_target(target)?;
                Some(GraphEdgeRow {
                    source: l.source_page.clone(),
                    target: target_path,
                    link_type: l.link_type.clone(),
                })
            })
            .collect();
        edges.sort_by(|a, b| a.source.cmp(&b.source));

        Ok(GraphData { nodes, edges })
    }

    pub fn search(
        &self,
        query: &str,
        limit: usize,
    ) -> Result<Vec<SearchResult>, String> {
        let q = query.trim();
        if q.is_empty() {
            return Ok(Vec::new());
        }

        // Plan 022 slice 5: matching/snippet/ranking live in search.at
        // (search_gen, dual-emitted); the shell only hands over rows. The
        // highlight/ellipsis constants are injected here — the Auto
        // emitters do not interpret \u escapes in string literals.
        let open = "\u{0001}";

        let pages: Vec<search_gen::SrPage> = self
            .data
            .pages
            .iter()
            .map(|p| search_gen::SrPage {
                path: p.path.clone(),
                title: p.title.clone(),
                frontmatter: p.frontmatter.clone(),
            })
            .collect();

        let blocks: Vec<search_gen::SrBlock> = self
            .data
            .blocks
            .iter()
            .map(|b| search_gen::SrBlock {
                uuid: b.uuid.clone(),
                pagePath: b.page_path.clone(),
                blockId: b.block_id.clone().unwrap_or_default(),
                content: b.content.clone(),
            })
            .collect();

        let hits = search_gen::searchAll(pages, blocks, q, limit as i64, open, open, "…");

        Ok(hits
            .into_iter()
            .map(|h| {
                let snippet = (!h.snippet.is_empty()).then_some(h.snippet);
                if h.isPage {
                    SearchResult::Page {
                        path: h.path,
                        title: h.title,
                        snippet,
                    }
                } else {
                    SearchResult::Block {
                        uuid: h.uuid,
                        page_path: h.path,
                        block_id: (!h.blockId.is_empty()).then_some(h.blockId),
                        content: h.content,
                        snippet,
                    }
                }
            })
            .collect())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BlockRow {
    pub uuid: String,
    pub page_path: String,
    pub block_id: Option<String>,
    pub kind: String,
    pub content: String,
    pub properties: String,
    pub line_start: usize,
    pub line_end: usize,
}

#[derive(Debug, Clone)]
pub struct BacklinkRow {
    pub source_page: String,
    #[allow(dead_code)]
    pub source_block_uuid: Option<String>,
    pub context: String,
}

#[derive(Debug, Clone)]
pub struct OutlinkRow {
    pub target_page: Option<String>,
    pub target_block_uuid: Option<String>,
    #[allow(dead_code)]
    pub link_type: String,
}

#[derive(Debug, Clone)]
pub struct GraphNodeRow {
    pub path: String,
    pub title: String,
}

#[derive(Debug, Clone)]
pub struct GraphEdgeRow {
    pub source: String,
    pub target: String,
    pub link_type: String,
}

#[derive(Debug, Clone)]
pub struct GraphData {
    pub nodes: Vec<GraphNodeRow>,
    pub edges: Vec<GraphEdgeRow>,
}

#[derive(Debug, Clone)]
pub enum SearchResult {
    Page { path: String, title: String, snippet: Option<String> },
    Block { uuid: String, page_path: String, block_id: Option<String>, content: String, snippet: Option<String> },
}

fn kind_str(kind: BlockKind) -> String {
    match kind {
        BlockKind::Root => "root",
        BlockKind::Heading => "heading",
        BlockKind::Paragraph => "paragraph",
        BlockKind::Bullet => "bullet",
        BlockKind::Ordered => "ordered",
        BlockKind::Task => "task",
        BlockKind::Code => "code",
        BlockKind::Blockquote => "blockquote",
        BlockKind::Callout => "callout",
        BlockKind::Details => "details",
        BlockKind::HorizontalRule => "hr",
    }
    .to_string()
}

fn rel_path(wiki: &Path, path: &Path) -> String {
    path.strip_prefix(wiki)
        .unwrap_or(path)
        .to_string_lossy()
        .replace('\\', "/")
}

fn extract_links(body: &str, source_page: &str, blocks: &[Block]) -> Vec<LinkRow> {
    let line_blocks: Vec<links_gen::LineBlock> = blocks
        .iter()
        .map(|b| links_gen::LineBlock {
            uuid: b.uuid.clone(),
            lineStart: b.line_start as i64,
            lineEnd: b.line_end as i64,
        })
        .collect();
    links_gen::scanLinkRows(body, source_page, line_blocks)
        .into_iter()
        .map(|r| LinkRow {
            source_page: r.sourcePage,
            source_block_uuid: opt_string(r.sourceBlockUuid),
            target_page: opt_string(r.targetPage),
            target_block_uuid: opt_string(r.targetBlockUuid),
            link_type: r.linkType,
            context: r.context,
        })
        .collect()
}

fn opt_string(s: String) -> Option<String> {
    (!s.is_empty()).then_some(s)
}

fn extract_tags(body: &str, page_path: &str, blocks: &[Block]) -> Vec<TagRow> {
    let line_blocks: Vec<links_gen::LineBlock> = blocks
        .iter()
        .map(|b| links_gen::LineBlock {
            uuid: b.uuid.clone(),
            lineStart: b.line_start as i64,
            lineEnd: b.line_end as i64,
        })
        .collect();
    links_gen::scanTagRows(body, page_path, line_blocks)
        .into_iter()
        .map(|t| TagRow {
            page_path: t.pagePath,
            tag_name: t.tag,
            block_uuid: opt_string(t.blockUuid),
        })
        .collect()
}

fn extract_aliases(frontmatter: &serde_json::Value) -> Vec<TagRow> {
    let mut aliases = Vec::new();
    if let Some(arr) = frontmatter.get("aliases").and_then(|v| v.as_array()) {
        for v in arr {
            if let Some(s) = v.as_str() {
                aliases.push(TagRow {
                    page_path: String::new(), // filled later by caller
                    tag_name: s.to_string(),
                    block_uuid: None,
                });
            }
        }
    }
    aliases
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn index_and_query() {
        let mut idx = Index::open_in_memory().unwrap();
        let text = "# A\n\nLink to [[B]].\n";
        idx.index_file(Path::new("/wiki"), Path::new("/wiki/A.ad"), text, "A")
            .unwrap();
        idx.index_file(Path::new("/wiki"), Path::new("/wiki/B.ad"), "# B\n", "B")
            .unwrap();

        let outlinks = idx.outlinks("A").unwrap();
        assert_eq!(outlinks.len(), 1);
        assert_eq!(outlinks[0].target_page.as_deref(), Some("B"));

        let backlinks = idx.backlinks("B").unwrap();
        assert_eq!(backlinks.len(), 1);
        assert_eq!(backlinks[0].source_page, "A.ad");
    }

    #[test]
    fn alias_resolves_for_backlinks() {
        let mut idx = Index::open_in_memory().unwrap();
        let a = "---\ntitle: A\naliases:\n  - Alpha\n---\n\nLink to [[B]].\n";
        let b = "# B\n";
        idx.index_file(Path::new("/wiki"), Path::new("/wiki/A.ad"), a, "A")
            .unwrap();
        idx.index_file(Path::new("/wiki"), Path::new("/wiki/B.ad"), b, "B")
            .unwrap();

        // A can be found by its alias.
        assert!(idx.page_exists("Alpha").unwrap().is_some());
        // A backlink query works when requested by the alias as well.
        let outlinks = idx.outlinks("Alpha").unwrap();
        assert_eq!(outlinks.len(), 1);
        assert_eq!(outlinks[0].target_page.as_deref(), Some("B"));
    }

    #[test]
    fn rename_updates_all_row_kinds() {
        let mut idx = Index::open_in_memory().unwrap();
        let text = "---\ntitle: A\n---\n\nLink to [[B]].\n\n- item ^anchor\n";
        idx.index_file(Path::new("/wiki"), Path::new("/wiki/A.ad"), text, "A")
            .unwrap();
        idx.index_file(Path::new("/wiki"), Path::new("/wiki/B.ad"), "# B\n", "B")
            .unwrap();

        idx.rename_file(
            Path::new("/wiki"),
            Path::new("/wiki/A.ad"),
            Path::new("/wiki/A2.ad"),
            "A2",
        )
        .unwrap();

        assert!(idx.page_exists("A").unwrap().is_none());
        assert!(idx.page_exists("A2").unwrap().as_deref() == Some("A2.ad"));
        let outlinks = idx.outlinks("A2").unwrap();
        assert_eq!(outlinks.len(), 1);
        // blocks moved with the page
        assert!(idx.find_block_in_page("A2", "anchor").unwrap().is_some());
    }

    #[test]
    fn remove_file_drops_all_rows() {
        let mut idx = Index::open_in_memory().unwrap();
        idx.index_file(Path::new("/wiki"), Path::new("/wiki/A.ad"), "# A\n\n[[B]]\n", "A")
            .unwrap();
        idx.remove_file(Path::new("/wiki"), Path::new("/wiki/A.ad"))
            .unwrap();
        assert!(idx.page_exists("A").unwrap().is_none());
        assert!(idx.backlinks("B").unwrap().is_empty());
        assert!(idx.search("A", 10).unwrap().is_empty());
    }

    #[test]
    fn flush_and_reload_roundtrip() {
        let tmp = tempfile::tempdir().unwrap();
        let path = tmp.path().join("index.json");
        let mut idx = Index::open(&path).unwrap();
        idx.index_file(
            Path::new("/wiki"),
            Path::new("/wiki/A.ad"),
            "---\ntitle: A\naliases:\n  - Alpha\n---\n\nLink to [[B]]. #proj\n",
            "A",
        )
        .unwrap();
        idx.index_file(Path::new("/wiki"), Path::new("/wiki/B.ad"), "# B\n", "B")
            .unwrap();
        idx.flush().unwrap();
        assert!(path.exists());

        let reloaded = Index::open(&path).unwrap();
        assert_eq!(reloaded.outlinks("A").unwrap().len(), 1);
        assert!(reloaded.page_exists("Alpha").unwrap().is_some());
        assert_eq!(reloaded.backlinks("B").unwrap().len(), 1);
        assert!(!reloaded.search("link", 10).unwrap().is_empty());
    }
}
