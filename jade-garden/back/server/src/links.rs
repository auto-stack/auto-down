use std::sync::Arc;

use axum::{
    extract::{Path, State},
    response::Json,
};
use serde::Serialize;

use crate::state::AppState;

#[derive(Serialize, Clone, Debug)]
pub struct Outlink {
    pub target_title: String,
    pub target_path: Option<String>,
    pub exists: bool,
    pub block_id: Option<String>,
}

#[derive(Serialize, Clone, Debug)]
pub struct Backlink {
    pub source_title: String,
    pub source_path: String,
    pub context: String,
}

#[derive(Serialize)]
pub struct LinksResponse<T> {
    pub title: String,
    pub links: Vec<T>,
}

#[derive(Serialize, Clone, Debug)]
pub struct GraphNode {
    pub id: String,
    pub label: String,
    pub path: String,
    pub exists: bool,
    pub degree: usize,
}

#[derive(Serialize, Clone, Debug)]
pub struct GraphEdge {
    pub source: String,
    pub target: String,
    pub block_id: Option<String>,
}

#[derive(Serialize, Clone, Debug)]
pub struct GraphData {
    pub nodes: Vec<GraphNode>,
    pub edges: Vec<GraphEdge>,
}

// Plan 022 Phase 3: logic core shared by the axum shell and vm_dispatch.
pub fn outlinks_impl(state: &AppState, title: &str) -> LinksResponse<Outlink> {
    let links = state
        .with_index(|idx| idx.outlinks(title).unwrap_or_default())
        .unwrap_or_default();

    let outlinks: Vec<Outlink> = links
        .into_iter()
        .map(|row| {
            let exists = row.target_page.is_some();
            Outlink {
                target_title: row.target_page.clone().unwrap_or_default(),
                target_path: row.target_page,
                exists,
                block_id: row.target_block_uuid,
            }
        })
        .collect();

    LinksResponse { title: title.to_string(), links: outlinks }
}

pub async fn get_outlinks(
    State(state): State<Arc<AppState>>,
    Path(title): Path<String>,
) -> Json<LinksResponse<Outlink>> {
    Json(outlinks_impl(&state, &title))
}

// Plan 022 Phase 3: logic core shared by the axum shell and vm_dispatch.
pub fn backlinks_impl(state: &AppState, title: &str) -> LinksResponse<Backlink> {
    let links = state
        .with_index(|idx| idx.backlinks(title).unwrap_or_default())
        .unwrap_or_default();

    let backlinks: Vec<Backlink> = links
        .into_iter()
        .map(|row| Backlink {
            source_title: row.source_page.clone(),
            source_path: row.source_page,
            context: row.context,
        })
        .collect();

    LinksResponse { title: title.to_string(), links: backlinks }
}

pub async fn get_backlinks(
    State(state): State<Arc<AppState>>,
    Path(title): Path<String>,
) -> Json<LinksResponse<Backlink>> {
    Json(backlinks_impl(&state, &title))
}

// Plan 022 Phase 3: logic core shared by the axum shell and vm_dispatch.
pub fn graph_impl(state: &AppState) -> Result<GraphData, crate::error::ApiError> {
    // plan-022 Phase 5: node/edge assembly, degree counts and ordering all
    // live in linkgraph.at (linkgraph_gen) — the shell only maps rows to
    // the wire shape. (block_id stays None: target_block_uuid would be a
    // uuid, not a user-visible block id.)
    let data = state
        .with_index(|idx| idx.graph_data().unwrap_or_else(|_| crate::index::GraphData {
            nodes: Vec::new(),
            edges: Vec::new(),
        }))
        .ok_or("No workspace open")?;

    let nodes: Vec<GraphNode> = data
        .nodes
        .into_iter()
        .map(|n| GraphNode {
            id: n.path.clone(),
            label: n.title,
            path: n.path,
            exists: true,
            degree: n.degree as usize,
        })
        .collect();

    let edges: Vec<GraphEdge> = data
        .edges
        .into_iter()
        .map(|e| GraphEdge {
            source: e.source,
            target: e.target,
            block_id: None,
        })
        .collect();

    Ok(GraphData { nodes, edges })
}

#[cfg(test)]
mod linkgraph_gen_parity {
    // Cross-language parity with the TS twin (../../auto/tests/linkgraph-parity.mjs).
    // Both sides drive linkgraph_gen over the same fixture file; the
    // shell-level row mapping stays covered by index.rs tests.

    fn fixtures() -> serde_json::Value {
        serde_json::from_str(include_str!("../../auto/tests/linkgraph-fixtures.json")).unwrap()
    }

    fn rows(c: &serde_json::Value) -> (Vec<crate::linkgraph_gen::LgPage>, Vec<crate::linkgraph_gen::LgAlias>, Vec<crate::linkgraph_gen::LgLink>) {
        let pages = c["pages"]
            .as_array()
            .unwrap()
            .iter()
            .map(|p| crate::linkgraph_gen::LgPage {
                path: p["path"].as_str().unwrap().to_string(),
                title: p["title"].as_str().unwrap().to_string(),
            })
            .collect();
        let aliases = c["aliases"]
            .as_array()
            .unwrap()
            .iter()
            .map(|a| crate::linkgraph_gen::LgAlias {
                tagName: a["tagName"].as_str().unwrap().to_string(),
                pagePath: a["pagePath"].as_str().unwrap().to_string(),
            })
            .collect();
        let links = c["links"]
            .as_array()
            .unwrap()
            .iter()
            .map(|l| crate::linkgraph_gen::LgLink {
                sourcePage: l["sourcePage"].as_str().unwrap().to_string(),
                targetPage: l["targetPage"].as_str().unwrap().to_string(),
                context: l["context"].as_str().unwrap().to_string(),
                sourceBlockUuid: l["sourceBlockUuid"].as_str().unwrap().to_string(),
                targetBlockUuid: l["targetBlockUuid"].as_str().unwrap().to_string(),
                linkType: l["linkType"].as_str().unwrap().to_string(),
            })
            .collect();
        (pages, aliases, links)
    }

    #[test]
    fn linkgraph_parity_fixtures() {
        let fx = fixtures();
        for c in fx["cases"].as_array().unwrap() {
            let name = c["name"].as_str().unwrap();
            let kind = c["kind"].as_str().unwrap();
            let (pages, aliases, links) = rows(c);
            match kind {
                "backlinks" => {
                    let hits = crate::linkgraph_gen::backlinksOf(pages, aliases, links, c["title"].as_str().unwrap());
                    let expected = c["expected"].as_array().unwrap();
                    assert_eq!(hits.len(), expected.len(), "case `{name}`: count");
                    for (i, (h, e)) in hits.iter().zip(expected.iter()).enumerate() {
                        assert_eq!(h.sourcePage, e["sourcePage"].as_str().unwrap(), "case `{name}` #{i}");
                        assert_eq!(h.context, e["context"].as_str().unwrap(), "case `{name}` #{i}");
                    }
                }
                "outlinks" => {
                    let hits = crate::linkgraph_gen::outlinksOf(pages, aliases, links, c["title"].as_str().unwrap());
                    let expected = c["expected"].as_array().unwrap();
                    assert_eq!(hits.len(), expected.len(), "case `{name}`: count");
                    for (i, (h, e)) in hits.iter().zip(expected.iter()).enumerate() {
                        assert_eq!(h.targetPage, e["targetPage"].as_str().unwrap(), "case `{name}` #{i}");
                        assert_eq!(h.linkType, e["linkType"].as_str().unwrap(), "case `{name}` #{i}");
                    }
                }
                "graph" => {
                    let g = crate::linkgraph_gen::graphData(pages, aliases, links);
                    let expected = &c["expected"];
                    assert_eq!(g.nodes.len(), expected["nodes"].as_array().unwrap().len(), "case `{name}`: nodes");
                    for (i, (n, e)) in g.nodes.iter().zip(expected["nodes"].as_array().unwrap().iter()).enumerate() {
                        assert_eq!(n.id, e["id"].as_str().unwrap(), "case `{name}` node #{i}");
                        assert_eq!(n.degree, e["degree"].as_i64().unwrap(), "case `{name}` node #{i}");
                    }
                    assert_eq!(g.edges.len(), expected["edges"].as_array().unwrap().len(), "case `{name}`: edges");
                    for (i, (e, ex)) in g.edges.iter().zip(expected["edges"].as_array().unwrap().iter()).enumerate() {
                        assert_eq!(e.source, ex["source"].as_str().unwrap(), "case `{name}` edge #{i}");
                        assert_eq!(e.target, ex["target"].as_str().unwrap(), "case `{name}` edge #{i}");
                    }
                }
                "resolve" => {
                    let path = crate::linkgraph_gen::resolvePagePath(pages, aliases, c["title"].as_str().unwrap());
                    assert_eq!(path, c["expected"].as_str().unwrap(), "case `{name}`");
                }
                other => panic!("unknown kind {other}"),
            }
        }
    }
}

pub async fn get_graph(
    State(state): State<Arc<AppState>>,
) -> Result<Json<GraphData>, crate::error::ApiError> {
    Ok(Json(graph_impl(&state)?))
}

/// Rebuild the entire index from the current workspace.
pub async fn rebuild_index(state: Arc<AppState>) -> Result<(), String> {
    tokio::task::spawn_blocking(move || rebuild_index_sync(state))
        .await
        .map_err(|e| format!("Rebuild task failed: {e}"))?
}

pub(crate) fn rebuild_index_sync(state: Arc<AppState>) -> Result<(), String> {
    let wiki = state.wiki_dir().ok_or("No workspace open")?;
    if !wiki.exists() {
        return Ok(());
    }

    let index_path = state.index_path().ok_or("No workspace open")?;
    // Open (loading any prior JSON cache) and re-index every .ad file.
    // Rows of files deleted since the last run linger in memory until the
    // flush rewrites the cache — same as the SQLite flow this replaces.
    let mut index = crate::index::Index::open(&index_path)
        .map_err(|e| format!("Failed to open index: {e}"))?;

    for entry in walkdir::WalkDir::new(&wiki)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_file() && e.path().extension().map(|e| e == "ad").unwrap_or(false))
    {
        let path = entry.path();
        let title = path
            .file_stem()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();
        let text = std::fs::read_to_string(path).unwrap_or_default();
        index
            .index_file(&wiki, path, &text, &title)
            .map_err(|e| format!("Failed to index {}: {e}", path.display()))?;
    }
    index.flush()?;

    // Replace the in-memory index reference.
    state.set_index(index);
    Ok(())
}

/// Incrementally index a single file. Used after save/rename/create.
pub fn index_file(
    state: &AppState,
    path: &std::path::Path,
) -> Result<(), String> {
    let wiki = state.wiki_dir().ok_or("No workspace open")?;
    let title = path
        .file_stem()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();
    let text = std::fs::read_to_string(path).map_err(|e| e.to_string())?;

    state
        .with_index_mut(|idx| idx.index_file(&wiki, path, &text, &title).and_then(|_| idx.flush()))
        .ok_or("Index not available")?
}

/// Remove a file from the index.
pub fn remove_file(
    state: &AppState,
    path: &std::path::Path,
) -> Result<(), String> {
    let wiki = state.wiki_dir().ok_or("No workspace open")?;
    state
        .with_index_mut(|idx| idx.remove_file(&wiki, path).and_then(|_| idx.flush()))
        .ok_or("Index not available")?
}

/// Rename a file in the index.
pub fn rename_file(
    state: &AppState,
    old_path: &std::path::Path,
    new_path: &std::path::Path,
) -> Result<(), String> {
    let wiki = state.wiki_dir().ok_or("No workspace open")?;
    let new_title = new_path
        .file_stem()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();
    state
        .with_index_mut(|idx| {
            idx.rename_file(&wiki, old_path, new_path, &new_title)
                .and_then(|_| idx.flush())
        })
        .ok_or("Index not available")?
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::state::AppState;
    use std::io::Write;

    fn make_workspace() -> (tempfile::TempDir, Arc<AppState>) {
        let tmp = tempfile::tempdir().unwrap();
        let wiki = tmp.path().join("wiki");
        std::fs::create_dir(&wiki).unwrap();
        let state = Arc::new(AppState::with_workspace_root(tmp.path().to_path_buf()));
        (tmp, state)
    }

    #[tokio::test]
    async fn index_backlinks_and_outlinks() {
        let (_tmp, state) = make_workspace();
        let wiki = state.wiki_dir().unwrap();
        let mut a = std::fs::File::create(wiki.join("A.ad")).unwrap();
        a.write_all(b"---\ntitle: A\n---\n\nLink to [[B]] and [[C]].\n")
            .unwrap();
        let mut b = std::fs::File::create(wiki.join("B.ad")).unwrap();
        b.write_all(b"---\ntitle: B\n---\n\n# B\n").unwrap();

        rebuild_index(state.clone()).await.unwrap();

        let outlinks = state
            .with_index(|idx| idx.outlinks("A").unwrap_or_default())
            .unwrap();
        assert_eq!(outlinks.len(), 2);
        assert!(outlinks.iter().any(|l| l.target_page.as_deref() == Some("B")));

        let backlinks = state
            .with_index(|idx| idx.backlinks("B").unwrap_or_default())
            .unwrap();
        assert_eq!(backlinks.len(), 1);
        assert_eq!(backlinks[0].source_page, "A.ad");
    }

    #[tokio::test]
    async fn block_link_parses_block_id() {
        let (_tmp, state) = make_workspace();
        let wiki = state.wiki_dir().unwrap();
        let mut a = std::fs::File::create(wiki.join("A.ad")).unwrap();
        a.write_all(b"---\ntitle: A\n---\n\nSee [[B#block-3]].\n")
            .unwrap();
        std::fs::File::create(wiki.join("B.ad")).unwrap();

        rebuild_index(state.clone()).await.unwrap();

        let outlinks = state
            .with_index(|idx| idx.outlinks("A").unwrap_or_default())
            .unwrap();
        assert_eq!(outlinks.len(), 1);
        assert_eq!(outlinks[0].target_page.as_deref(), Some("B"));
        assert_eq!(outlinks[0].target_block_uuid.as_deref(), Some("block-3"));
    }
}

#[cfg(test)]
mod links_gen_parity {
    // Cross-language parity with the TS twin (../../auto/tests/links-parity.mjs).
    use super::*;

    #[test]
    fn links_gen_parity_fixtures() {
        let fixtures: serde_json::Value = serde_json::from_str(
            include_str!("../../auto/tests/links-fixtures.json"),
        )
        .unwrap();
        for case in fixtures["lines"].as_array().unwrap() {
            let line = case["line"].as_str().unwrap();
            let wiki: Vec<(String, String)> = crate::links_gen::scanWikiLinksLine(line)
                .into_iter()
                .map(|h| (h.title, h.blockId))
                .collect();
            let expected: Vec<(String, String)> = case["wiki"]
                .as_array()
                .unwrap()
                .iter()
                .map(|w| {
                    (
                        w["title"].as_str().unwrap().to_string(),
                        w["blockId"].as_str().unwrap().to_string(),
                    )
                })
                .collect();
            assert_eq!(wiki, expected, "wiki scan: {line}");

            let refs: Vec<String> = crate::links_gen::scanBlockRefsLine(line);
            let expected_refs: Vec<String> = case["refs"]
                .as_array()
                .unwrap()
                .iter()
                .map(|v| v.as_str().unwrap().to_string())
                .collect();
            assert_eq!(refs, expected_refs, "block refs: {line}");

            let tags: Vec<String> = crate::links_gen::scanTagsLine(line);
            let expected_tags: Vec<String> = case["tags"]
                .as_array()
                .unwrap()
                .iter()
                .map(|v| v.as_str().unwrap().to_string())
                .collect();
            assert_eq!(tags, expected_tags, "tags scan: {line}");
        }
    }
}
