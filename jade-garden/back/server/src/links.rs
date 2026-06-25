use std::sync::Arc;

use axum::{
    extract::{Path, State},
    response::Json,
};
use regex::Regex;
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

pub async fn get_outlinks(
    State(state): State<Arc<AppState>>,
    Path(title): Path<String>,
) -> Json<LinksResponse<Outlink>> {
    let links = state.read_index(|idx| {
        idx.outlinks
            .get(&title)
            .cloned()
            .unwrap_or_default()
    });
    Json(LinksResponse { title, links })
}

pub async fn get_backlinks(
    State(state): State<Arc<AppState>>,
    Path(title): Path<String>,
) -> Json<LinksResponse<Backlink>> {
    let links = state.read_index(|idx| {
        idx.backlinks
            .get(&title)
            .cloned()
            .unwrap_or_default()
    });
    Json(LinksResponse { title, links })
}

/// Rebuild the entire link index from the current workspace.
pub async fn rebuild_index(state: Arc<AppState>) -> Result<(), String> {
    tokio::task::spawn_blocking(move || rebuild_index_sync(state))
        .await
        .map_err(|e| format!("Rebuild task failed: {e}"))?
}

fn rebuild_index_sync(state: Arc<AppState>) -> Result<(), String> {
    let wiki = state.wiki_dir().ok_or("No workspace open")?;
    if !wiki.exists() {
        state.write_index(|idx| *idx = crate::state::LinkIndex::default());
        return Ok(());
    }

    let mut title_to_path = std::collections::HashMap::new();
    let mut outlinks: std::collections::HashMap<String, Vec<Outlink>> = std::collections::HashMap::new();
    let mut backlinks: std::collections::HashMap<String, Vec<Backlink>> = std::collections::HashMap::new();

    let re = Regex::new(r"\[\[([^\]|#\n]+)(?:#([^\]|\n]+))?\]\]").unwrap();

    for entry in walkdir::WalkDir::new(&wiki)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_file() && e.path().extension().map(|e| e == "ad").unwrap_or(false))
    {
        let path = entry.path();
        let rel = path
            .strip_prefix(&wiki)
            .unwrap_or(path)
            .to_string_lossy()
            .replace('\\', "/");
        let title = path
            .file_stem()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();
        title_to_path.insert(title.clone(), path.to_path_buf());

        let text = std::fs::read_to_string(path).unwrap_or_default();
        let mut file_outlinks = Vec::new();
        for cap in re.captures_iter(&text) {
            let target_title = cap[1].trim().to_string();
            let block_id = cap.get(2).map(|m| m.as_str().to_string());
            file_outlinks.push((target_title.clone(), block_id));

            // Backlink from target's perspective.
            let context = extract_context(&text, cap.get(0).unwrap().start());
            backlinks
                .entry(target_title)
                .or_default()
                .push(Backlink {
                    source_title: title.clone(),
                    source_path: rel.clone(),
                    context,
                });
        }

        // Deduplicate outlinks for this file.
        let mut seen = std::collections::HashSet::new();
        let mut deduped = Vec::new();
        for (target_title, block_id) in file_outlinks {
            if seen.insert((target_title.clone(), block_id.clone())) {
                let exists = title_to_path.contains_key(&target_title);
                let target_path = title_to_path.get(&target_title).map(|p| {
                    p.strip_prefix(&wiki)
                        .unwrap_or(p)
                        .to_string_lossy()
                        .replace('\\', "/")
                });
                deduped.push(Outlink {
                    target_title,
                    target_path,
                    exists,
                    block_id,
                });
            }
        }
        outlinks.insert(title, deduped);
    }

    // Fix existence for outlinks that were seen before their target was indexed.
    for links in outlinks.values_mut() {
        for link in links {
            if !link.exists {
                if let Some(path) = title_to_path.get(&link.target_title) {
                    link.exists = true;
                    link.target_path = Some(
                        path.strip_prefix(&wiki)
                            .unwrap_or(path)
                            .to_string_lossy()
                            .replace('\\', "/"),
                    );
                }
            }
        }
    }

    state.write_index(|idx| {
        idx.title_to_path = title_to_path;
        idx.outlinks = outlinks;
        idx.backlinks = backlinks;
    });

    Ok(())
}

/// Extract a one-line context around a link position.
fn extract_context(text: &str, pos: usize) -> String {
    let start = text[..pos].rfind('\n').map(|i| i + 1).unwrap_or(0);
    let end = text[pos..].find('\n').map(|i| pos + i).unwrap_or(text.len());
    text[start..end].trim().to_string()
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

        let outlinks = state.read_index(|idx| idx.outlinks.get("A").cloned().unwrap_or_default());
        assert_eq!(outlinks.len(), 2);
        assert!(outlinks.iter().any(|l| l.target_title == "B" && l.exists));
        assert!(outlinks.iter().any(|l| l.target_title == "C" && !l.exists));

        let backlinks = state.read_index(|idx| idx.backlinks.get("B").cloned().unwrap_or_default());
        assert_eq!(backlinks.len(), 1);
        assert_eq!(backlinks[0].source_title, "A");
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

        let outlinks = state.read_index(|idx| idx.outlinks.get("A").cloned().unwrap_or_default());
        assert_eq!(outlinks.len(), 1);
        assert_eq!(outlinks[0].target_title, "B");
        assert_eq!(outlinks[0].block_id.as_deref(), Some("block-3"));
    }
}
