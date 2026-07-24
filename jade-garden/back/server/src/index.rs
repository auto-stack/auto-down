use crate::block::{generate_uuid, Block, BlockKind};
use crate::parser::{parse_page, split_frontmatter};
use regex::Regex;
use rusqlite::{params, Connection, OptionalExtension};
use std::path::Path;
use std::sync::{Arc, Mutex};

/// The persistent SQLite index for a workspace.
/// Stored in `<workspace-root>/jade-garden-index.sqlite`.
pub struct Index {
    conn: Arc<Mutex<Connection>>,
}

unsafe impl Send for Index {}
unsafe impl Sync for Index {}

impl Index {
    #[allow(dead_code)]
    fn conn(&self) -> std::sync::MutexGuard<'_, Connection> {
        self.conn.lock().unwrap()
    }

    pub fn open(path: &Path) -> Result<Self, rusqlite::Error> {
        let conn = Connection::open(path)?;
        let idx = Self {
            conn: Arc::new(Mutex::new(conn)),
        };
        idx.init()?;
        Ok(idx)
    }

    #[allow(dead_code)]
    pub fn open_in_memory() -> Result<Self, rusqlite::Error> {
        let conn = Connection::open_in_memory()?;
        let idx = Self {
            conn: Arc::new(Mutex::new(conn)),
        };
        idx.init()?;
        Ok(idx)
    }

    fn init(&self) -> Result<(), rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        conn.execute("PRAGMA foreign_keys = ON", ())?;
        conn.execute_batch(
            r#"
            CREATE TABLE IF NOT EXISTS pages (
                path TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                frontmatter TEXT NOT NULL DEFAULT '{}',
                mtime INTEGER
            ) STRICT;

            CREATE TABLE IF NOT EXISTS blocks (
                uuid TEXT PRIMARY KEY,
                page_path TEXT NOT NULL REFERENCES pages(path) ON DELETE CASCADE,
                block_id TEXT,
                kind TEXT NOT NULL,
                content TEXT NOT NULL,
                properties TEXT NOT NULL DEFAULT '{}',
                line_start INTEGER NOT NULL,
                line_end INTEGER NOT NULL,
                UNIQUE(page_path, block_id)
            ) STRICT;
            CREATE INDEX IF NOT EXISTS idx_blocks_page ON blocks(page_path);
            CREATE INDEX IF NOT EXISTS idx_blocks_block_id ON blocks(block_id);

            CREATE TABLE IF NOT EXISTS links (
                source_page TEXT NOT NULL,
                source_block_uuid TEXT,
                target_page TEXT,
                target_block_uuid TEXT,
                link_type TEXT NOT NULL DEFAULT 'page',
                context TEXT
            ) STRICT;
            CREATE INDEX IF NOT EXISTS idx_links_source ON links(source_page);
            CREATE INDEX IF NOT EXISTS idx_links_target ON links(target_page);
            CREATE INDEX IF NOT EXISTS idx_links_target_block ON links(target_block_uuid);

            CREATE TABLE IF NOT EXISTS tags (
                page_path TEXT NOT NULL,
                tag_name TEXT NOT NULL,
                block_uuid TEXT
            ) STRICT;
            CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(tag_name);

            CREATE VIRTUAL TABLE IF NOT EXISTS fts_pages USING fts5(
                title,
                frontmatter,
                content=pages,
                content_rowid=rowid
            );
            CREATE TRIGGER IF NOT EXISTS pages_fts_insert AFTER INSERT ON pages BEGIN
                INSERT INTO fts_pages(rowid, title, frontmatter)
                VALUES (new.rowid, new.title, new.frontmatter);
            END;
            CREATE TRIGGER IF NOT EXISTS pages_fts_update AFTER UPDATE ON pages BEGIN
                INSERT INTO fts_pages(fts_pages, rowid, title, frontmatter)
                VALUES ('delete', old.rowid, old.title, old.frontmatter);
                INSERT INTO fts_pages(rowid, title, frontmatter)
                VALUES (new.rowid, new.title, new.frontmatter);
            END;
            CREATE TRIGGER IF NOT EXISTS pages_fts_delete AFTER DELETE ON pages BEGIN
                INSERT INTO fts_pages(fts_pages, rowid, title, frontmatter)
                VALUES ('delete', old.rowid, old.title, old.frontmatter);
            END;

            CREATE VIRTUAL TABLE IF NOT EXISTS fts_blocks USING fts5(
                content,
                content=blocks,
                content_rowid=rowid
            );
            CREATE TRIGGER IF NOT EXISTS blocks_fts_insert AFTER INSERT ON blocks BEGIN
                INSERT INTO fts_blocks(rowid, content)
                VALUES (new.rowid, new.content);
            END;
            CREATE TRIGGER IF NOT EXISTS blocks_fts_update AFTER UPDATE ON blocks BEGIN
                INSERT INTO fts_blocks(fts_blocks, rowid, content)
                VALUES ('delete', old.rowid, old.content);
                INSERT INTO fts_blocks(rowid, content)
                VALUES (new.rowid, new.content);
            END;
            CREATE TRIGGER IF NOT EXISTS blocks_fts_delete AFTER DELETE ON blocks BEGIN
                INSERT INTO fts_blocks(fts_blocks, rowid, content)
                VALUES ('delete', old.rowid, old.content);
            END;
            "#,
        )
    }

    /// Rebuild FTS tables from scratch. Useful after schema changes or if triggers
    /// drift out of sync.
    #[allow(dead_code)]
    pub fn rebuild_fts(&self) -> Result<(), rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM fts_pages", ())?;
        conn.execute("INSERT INTO fts_pages(rowid, title, frontmatter) SELECT rowid, title, frontmatter FROM pages", ())?;
        conn.execute("DELETE FROM fts_blocks", ())?;
        conn.execute("INSERT INTO fts_blocks(rowid, content) SELECT rowid, content FROM blocks", ())?;
        Ok(())
    }

    /// Index or re-index a single file.
    pub fn index_file(&self,
        wiki: &Path,
        path: &Path,
        text: &str,
        title: &str,
    ) -> Result<(), rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        let rel = rel_path(wiki, path);
        let parsed = parse_page(text);
        let mtime = std::fs::metadata(path)
            .and_then(|m| m.modified())
            .ok()
            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|d| d.as_secs() as i64)
            .unwrap_or(0);

        let tx = conn.unchecked_transaction()?;

        // Remove old data for this page.
        tx.execute("DELETE FROM blocks WHERE page_path = ?1", [&rel,
        ])?;
        tx.execute("DELETE FROM links WHERE source_page = ?1", [&rel,
        ])?;
        tx.execute("DELETE FROM tags WHERE page_path = ?1", [&rel,
        ])?;
        tx.execute("DELETE FROM pages WHERE path = ?1", [&rel,
        ])?;

        // Insert page.
        let frontmatter_json = serde_json::to_string(&parsed.frontmatter).unwrap_or_default();
        tx.execute(
            "INSERT INTO pages (path, title, frontmatter, mtime) VALUES (?1, ?2, ?3, ?4)",
            params![rel, title, frontmatter_json, mtime],
        )?;

        // Insert blocks. Ensure every block has a stable uuid by looking up existing
        // uuid for (page_path, block_id) or generating a new one.
        for block in &parsed.blocks {
            let uuid = if let Some(bid) = &block.block_id {
                tx.query_row(
                    "SELECT uuid FROM blocks WHERE page_path = ?1 AND block_id = ?2",
                    params![rel, bid],
                    |row| row.get::<_, String>(0),
                )
                .optional()?
                .unwrap_or_else(|| generate_uuid())
            } else {
                generate_uuid()
            };

            let props_json = serde_json::to_string(&block.properties).unwrap_or_default();
            tx.execute(
                "INSERT INTO blocks (uuid, page_path, block_id, kind, content, properties, line_start, line_end)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
                params![
                    uuid,
                    rel,
                    block.block_id,
                    kind_str(block.kind),
                    block.content,
                    props_json,
                    block.line_start as i64,
                    block.line_end as i64,
                ],
            )?;
        }

        // Extract links, tags, and aliases from raw text.
        let (_, body) = split_frontmatter(text);
        let links = extract_links(&body, &rel, &parsed.blocks);
        for link in links {
            tx.execute(
                "INSERT INTO links (source_page, source_block_uuid, target_page, target_block_uuid, link_type, context)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                params![
                    link.source_page,
                    link.source_block_uuid,
                    link.target_page,
                    link.target_block_uuid,
                    link.link_type,
                    link.context,
                ],
            )?;
        }

        let aliases = extract_aliases(&parsed.frontmatter);
        for alias in aliases {
            tx.execute(
                "INSERT INTO tags (page_path, tag_name, block_uuid) VALUES (?1, ?2, ?3)",
                params![rel, alias.tag_name, alias.block_uuid],
            )?;
        }
        for tag in extract_tags(&body, &rel, &parsed.blocks) {
            tx.execute(
                "INSERT INTO tags (page_path, tag_name, block_uuid) VALUES (?1, ?2, ?3)",
                params![tag.page_path, tag.tag_name, tag.block_uuid],
            )?;
        }

        tx.commit()
    }

    pub fn remove_file(&self,
        wiki: &Path,
        path: &Path,
    ) -> Result<(), rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        let rel = rel_path(wiki, path);
        conn.execute("DELETE FROM blocks WHERE page_path = ?1", [&rel,
        ])?;
        conn.execute("DELETE FROM links WHERE source_page = ?1", [&rel,
        ])?;
        conn.execute("DELETE FROM tags WHERE page_path = ?1", [&rel,
        ])?;
        conn.execute("DELETE FROM pages WHERE path = ?1", [rel])?;
        Ok(())
    }

    pub fn rename_file(&self,
        wiki: &Path,
        old_path: &Path,
        new_path: &Path,
        new_title: &str,
    ) -> Result<(), rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        let old_rel = rel_path(wiki, old_path);
        let new_rel = rel_path(wiki, new_path);
        conn.execute(
            "UPDATE pages SET path = ?1, title = ?2 WHERE path = ?3",
            params![new_rel, new_title, old_rel],
        )?;
        conn.execute(
            "UPDATE blocks SET page_path = ?1 WHERE page_path = ?2",
            params![new_rel, old_rel],
        )?;
        conn.execute(
            "UPDATE links SET source_page = ?1 WHERE source_page = ?2",
            params![new_rel, old_rel],
        )?;
        conn.execute(
            "UPDATE links SET target_page = ?1 WHERE target_page = ?2",
            params![new_rel, old_rel],
        )?;
        conn.execute(
            "UPDATE tags SET page_path = ?1 WHERE page_path = ?2",
            params![new_rel, old_rel],
        )?;
        Ok(())
    }

    /// Lookup helpers used by the API layer.

    /// Resolve a page title or alias to its path.
    fn resolve_page_path(
        conn: &Connection,
        title: &str,
    ) -> Result<Option<String>, rusqlite::Error> {
        if let Some(path) = conn
            .query_row(
                "SELECT path FROM pages WHERE title = ?1 COLLATE NOCASE",
                [title],
                |row| row.get::<_, String>(0),
            )
            .optional()?
        {
            return Ok(Some(path));
        }
        conn.query_row(
            "SELECT page_path FROM tags WHERE tag_name = ?1 COLLATE NOCASE LIMIT 1",
            [title],
            |row| row.get::<_, String>(0),
        )
        .optional()
    }

    #[allow(dead_code)]
    pub fn page_exists(&self,
        title: &str,
    ) -> Result<Option<String>, rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        Self::resolve_page_path(&conn, title)
    }

    pub fn page_aliases(&self, page_path: &str) -> Result<Vec<String>, rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT tag_name FROM tags WHERE page_path = ?1 AND block_uuid IS NULL",
        )?;
        let rows = stmt.query_map([page_path], |row| row.get::<_, String>(0))?;
        rows.collect()
    }

    pub fn unlinked_references(
        &self,
        names: &[String],
    ) -> Result<Vec<crate::unlinked::UnlinkedRef>, rusqlite::Error> {
        use crate::unlinked::find_unlinked_references;
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT uuid, page_path, content FROM blocks")?;
        let rows = stmt.query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?, row.get::<_, String>(2)?))
        })?;

        let mut refs = Vec::new();
        for row in rows {
            let (uuid, page_path, content) = row?;
            for (matched, context) in find_unlinked_references(&content, names) {
                refs.push(crate::unlinked::UnlinkedRef {
                    page_path: page_path.clone(),
                    block_uuid: Some(uuid.clone()),
                    context,
                    matched_text: matched,
                });
            }
        }
        Ok(refs)
    }

    #[allow(dead_code)]
    pub fn block_by_id(
        &self,
        page_path: &str,
        block_id: &str,
    ) -> Result<Option<BlockRow>, rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        conn.query_row(
            "SELECT uuid, page_path, block_id, kind, content, properties, line_start, line_end
             FROM blocks WHERE page_path = ?1 AND block_id = ?2",
            params![page_path, block_id],
            |row| row_to_block(row),
        )
        .optional()
    }

    #[allow(dead_code)]
    pub fn block_by_uuid(&self,
        uuid: &str,
    ) -> Result<Option<BlockRow>, rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        conn.query_row(
            "SELECT uuid, page_path, block_id, kind, content, properties, line_start, line_end
             FROM blocks WHERE uuid = ?1",
            [uuid],
            |row| row_to_block(row),
        )
        .optional()
    }

    /// Find a block by its UUID or by its (page_path, block_id) pair.
    /// The `id` may be either a UUID or a `^id` string.
    pub fn find_block(
        &self,
        id: &str,
    ) -> Result<Option<BlockRow>, rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        // Try UUID first.
        if let Some(row) = conn
            .query_row(
                "SELECT uuid, page_path, block_id, kind, content, properties, line_start, line_end
                 FROM blocks WHERE uuid = ?1",
                [id],
                |row| row_to_block(row),
            )
            .optional()?
        {
            return Ok(Some(row));
        }
        // Fall back to block_id (Obsidian-style ^id).
        conn.query_row(
            "SELECT uuid, page_path, block_id, kind, content, properties, line_start, line_end
             FROM blocks WHERE block_id = ?1 LIMIT 1",
            [id],
            |row| row_to_block(row),
        )
        .optional()
    }

    /// Find a block by page title and block id/anchor.
    pub fn find_block_in_page(
        &self,
        page_title: &str,
        block_id: &str,
    ) -> Result<Option<BlockRow>, rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        let page_path = match Self::resolve_page_path(&conn, page_title)? {
            Some(p) => p,
            None => return Ok(None),
        };
        conn.query_row(
            "SELECT uuid, page_path, block_id, kind, content, properties, line_start, line_end
             FROM blocks WHERE page_path = ?1 AND block_id = ?2",
            params![page_path, block_id],
            |row| row_to_block(row),
        )
        .optional()
    }

    pub fn backlinks(
        &self,
        title: &str,
    ) -> Result<Vec<BacklinkRow>, rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        let target_path = match Self::resolve_page_path(&conn, title)? {
            Some(p) => p,
            None => return Ok(Vec::new()),
        };
        // Links are stored by target title/alias, not by path, so look up the
        // canonical page title and match case-insensitively.
        let canonical_title: String = conn.query_row(
            "SELECT title FROM pages WHERE path = ?1",
            [&target_path,
            ],
            |row| row.get::<_, String>(0),
        )?;
        let mut stmt = conn.prepare(
            "SELECT source_page, source_block_uuid, context
             FROM links
             WHERE target_page = ?1 COLLATE NOCASE
             ORDER BY source_page",
        )?;
        let rows = stmt.query_map([canonical_title], |row| {
            Ok(BacklinkRow {
                source_page: row.get(0)?,
                source_block_uuid: row.get(1)?,
                context: row.get(2)?,
            })
        })?;
        rows.collect()
    }

    pub fn outlinks(
        &self,
        title: &str,
    ) -> Result<Vec<OutlinkRow>, rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        let source = match Self::resolve_page_path(&conn, title)? {
            Some(p) => p,
            None => return Ok(Vec::new()),
        };
        let mut stmt = conn.prepare(
            "SELECT target_page, target_block_uuid, link_type
             FROM links
             WHERE source_page = ?1
             ORDER BY target_page",
        )?;
        let rows = stmt.query_map([source], |row| {
            Ok(OutlinkRow {
                target_page: row.get(0)?,
                target_block_uuid: row.get(1)?,
                link_type: row.get(2)?,
            })
        })?;
        rows.collect()
    }

    pub fn graph_data(&self,
    ) -> Result<GraphData, rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT path, title FROM pages ORDER BY path",
        )?;
        let nodes: Vec<GraphNodeRow> = stmt
            .query_map([], |row| {
                Ok(GraphNodeRow {
                    path: row.get(0)?,
                    title: row.get(1)?,
                })
            })?
            .collect::<Result<_, _>>()?;

        let mut stmt = conn.prepare(
            "SELECT l.source_page,
                    COALESCE(p.path, a.page_path) AS target_path,
                    l.link_type
             FROM links l
             LEFT JOIN pages p ON p.title = l.target_page COLLATE NOCASE
             LEFT JOIN tags a ON a.tag_name = l.target_page COLLATE NOCASE
             WHERE l.target_page IS NOT NULL
               AND COALESCE(p.path, a.page_path) IS NOT NULL
             ORDER BY l.source_page",
        )?;
        let edges: Vec<GraphEdgeRow> = stmt
            .query_map([], |row| {
                Ok(GraphEdgeRow {
                    source: row.get(0)?,
                    target: row.get(1)?,
                    link_type: row.get(2)?,
                })
            })?
            .collect::<Result<_, _>>()?;

        Ok(GraphData { nodes, edges })
    }

    pub fn search(
        &self,
        query: &str,
        limit: usize,
    ) -> Result<Vec<SearchResult>, rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        let mut results = Vec::new();

        // Normalize the query: trim and escape FTS5 special characters.
        let q = query.trim();
        if q.is_empty() {
            return Ok(results);
        }
        let escaped = escape_fts_query(q);

        // Page title / frontmatter FTS
        let pages: Vec<SearchResult> = {
            let mut stmt = conn.prepare(
                "SELECT p.path, p.title, snippet(fts_pages, 2, '\u{0001}', '\u{0001}', '…', 32) AS snippet
                 FROM fts_pages fp
                 JOIN pages p ON p.rowid = fp.rowid
                 WHERE fts_pages MATCH ?1
                 ORDER BY rank
                 LIMIT ?2",
            )?;
            stmt.query_map(params![escaped, limit], |row| {
                Ok(SearchResult::Page {
                    path: row.get(0)?,
                    title: row.get(1)?,
                    snippet: row.get(2)?,
                })
            })?
            .collect::<Result<_, _>>()?
        };
        results.extend(pages);

        // Block content FTS
        let blocks: Vec<SearchResult> = {
            let mut stmt = conn.prepare(
                "SELECT b.uuid, b.page_path, b.block_id, b.content,
                        snippet(fts_blocks, 0, '\u{0001}', '\u{0001}', '…', 32) AS snippet
                 FROM fts_blocks fb
                 JOIN blocks b ON b.rowid = fb.rowid
                 WHERE fts_blocks MATCH ?1
                 ORDER BY rank
                 LIMIT ?2",
            )?;
            stmt.query_map(params![escaped, limit], |row| {
                Ok(SearchResult::Block {
                    uuid: row.get(0)?,
                    page_path: row.get(1)?,
                    block_id: row.get(2)?,
                    content: row.get(3)?,
                    snippet: row.get(4)?,
                })
            })?
            .collect::<Result<_, _>>()?
        };
        results.extend(blocks);

        results.truncate(limit);
        Ok(results)
    }

    #[allow(dead_code)]
    pub fn all_page_titles(&self,
    ) -> Result<Vec<String>, rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT title FROM pages ORDER BY title")?;
        let rows = stmt.query_map([], |row| row.get::<_, String>(0))?;
        rows.collect()
    }
}

#[allow(dead_code)]
fn row_to_block(row: &rusqlite::Row) -> Result<BlockRow, rusqlite::Error> {
    Ok(BlockRow {
        uuid: row.get(0)?,
        page_path: row.get(1)?,
        block_id: row.get(2)?,
        kind: row.get(3)?,
        content: row.get(4)?,
        properties: row.get(5)?,
        line_start: row.get::<_, i64>(6)? as usize,
        line_end: row.get::<_, i64>(7)? as usize,
    })
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

#[allow(dead_code)]
#[derive(Debug, Clone)]
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

fn escape_fts_query(q: &str) -> String {
    // Wrap the whole query in double quotes so FTS5 treats it as a single phrase
    // and special characters inside are escaped.
    let escaped = q.replace('"', "\"\"");
    format!("\"{}\"", escaped)
}

#[derive(Debug, Clone)]
struct LinkRow {
    source_page: String,
    source_block_uuid: Option<String>,
    target_page: Option<String>,
    target_block_uuid: Option<String>,
    link_type: String,
    context: String,
}

#[derive(Debug, Clone)]
struct TagRow {
    page_path: String,
    tag_name: String,
    block_uuid: Option<String>,
}

fn extract_links(body: &str, source_page: &str, blocks: &[Block]) -> Vec<LinkRow> {
    lazy_static::lazy_static! {
        static ref WIKI_LINK_RE: Regex = Regex::new(r"\[\[([^\]|#\n]+)(?:#([^\]|\n]+))?\]\]").unwrap();
        static ref BLOCK_REF_RE: Regex = Regex::new(r"\(\(([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})\)\)").unwrap();
        static ref TAG_RE: Regex = Regex::new(r"#([a-zA-Z0-9_\-/]+)").unwrap();
    }

    let mut links = Vec::new();
    let lines: Vec<&str> = body.lines().collect();

    // Page/block wiki links.
    for (idx, line) in lines.iter().enumerate() {
        for cap in WIKI_LINK_RE.captures_iter(line) {
            let target_title = cap[1].trim().to_string();
            let target_block_id = cap.get(2).map(|m| m.as_str().to_string());
            let context = extract_context(body, line.find(&cap[0]).unwrap_or(0) + line_char_offset(body, idx));
            let source_block_uuid = find_block_uuid_for_line(blocks, idx);
            links.push(LinkRow {
                source_page: source_page.to_string(),
                source_block_uuid,
                target_page: Some(target_title),
                target_block_uuid: target_block_id,
                link_type: "page".to_string(),
                context,
            });
        }
        for cap in BLOCK_REF_RE.captures_iter(line) {
            let target_uuid = cap[1].to_string();
            let context = extract_context(body, line.find(&cap[0]).unwrap_or(0) + line_char_offset(body, idx));
            let source_block_uuid = find_block_uuid_for_line(blocks, idx);
            links.push(LinkRow {
                source_page: source_page.to_string(),
                source_block_uuid,
                target_page: None,
                target_block_uuid: Some(target_uuid),
                link_type: "block".to_string(),
                context,
            });
        }
    }

    links
}

fn extract_tags(body: &str, page_path: &str, blocks: &[Block]) -> Vec<TagRow> {
    lazy_static::lazy_static! {
        static ref TAG_RE: Regex = Regex::new(r"#([a-zA-Z0-9_\-/]+)").unwrap();
    }
    let mut tags = Vec::new();
    let lines: Vec<&str> = body.lines().collect();
    for (idx, line) in lines.iter().enumerate() {
        for cap in TAG_RE.captures_iter(line) {
            tags.push(TagRow {
                page_path: page_path.to_string(),
                tag_name: cap[1].to_string(),
                block_uuid: find_block_uuid_for_line(blocks, idx),
            });
        }
    }
    tags
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

fn find_block_uuid_for_line(blocks: &[Block], line_idx: usize) -> Option<String> {
    blocks
        .iter()
        .find(|b| b.line_start <= line_idx && line_idx < b.line_end)
        .map(|b| b.uuid.clone())
}

fn line_char_offset(text: &str, line_idx: usize) -> usize {
    text.lines()
        .take(line_idx)
        .map(|l| l.len() + 1)
        .sum()
}

fn extract_context(text: &str, pos: usize) -> String {
    let start = text[..pos].rfind('\n').map(|i| i + 1).unwrap_or(0);
    let end = text[pos..].find('\n').map(|i| pos + i).unwrap_or(text.len());
    text[start..end].trim().to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn index_and_query() {
        let idx = Index::open_in_memory().unwrap();
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
        let idx = Index::open_in_memory().unwrap();
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
}
