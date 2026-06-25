use std::sync::Arc;

use axum::{
    extract::{Query, State},
    response::Json,
};
use serde::{Deserialize, Serialize};

use crate::state::AppState;

#[derive(Serialize)]
pub struct FileNode {
    name: String,
    path: String,
    is_dir: bool,
    children: Vec<FileNode>,
}

#[derive(Deserialize)]
pub struct ListFilesQuery {
    #[serde(default)]
    path: String,
    #[serde(default)]
    recursive: bool,
}

#[derive(Deserialize)]
pub struct CreateFileRequest {
    path: String,
    #[serde(default)]
    is_dir: bool,
}

#[derive(Deserialize)]
pub struct RenameFileRequest {
    old_path: String,
    new_path: String,
}

#[derive(Deserialize)]
pub struct DeleteFileRequest {
    path: String,
}

pub async fn list_files(
    State(state): State<Arc<AppState>>,
    Query(q): Query<ListFilesQuery>,
) -> Result<Json<Vec<FileNode>>, String> {
    let wiki = state.wiki_dir().ok_or("No workspace open")?;
    let base = wiki.join(&q.path);
    let base = normalize_path(&base);
    if !base.starts_with(&wiki) {
        return Err("Invalid path".to_string());
    }

    if q.recursive {
        let mut nodes = Vec::new();
        collect_recursive(&base, &wiki, &mut nodes)?;
        Ok(Json(nodes))
    } else {
        let mut entries: Vec<_> = std::fs::read_dir(&base)
            .map_err(|e| format!("Failed to read directory: {e}"))?
            .filter_map(|e| e.ok())
            .collect();
        entries.sort_by_key(|e| e.file_name());

        let nodes = entries
            .into_iter()
            .map(|e| file_node_from_entry(&e, &wiki))
            .collect();
        Ok(Json(nodes))
    }
}

fn collect_recursive(dir: &std::path::Path, wiki: &std::path::Path, out: &mut Vec<FileNode>) -> Result<(), String> {
    let mut entries: Vec<_> = std::fs::read_dir(dir)
        .map_err(|e| format!("Failed to read directory: {e}"))?
        .filter_map(|e| e.ok())
        .collect();
    entries.sort_by_key(|e| (e.file_type().map(|t| !t.is_dir()).unwrap_or(true), e.file_name()));

    for entry in entries {
        let node = file_node_from_entry(&entry, wiki);
        let is_dir = node.is_dir;
        out.push(node);
        if is_dir {
            collect_recursive(&entry.path(), wiki, out)?;
        }
    }
    Ok(())
}

fn file_node_from_entry(entry: &std::fs::DirEntry, wiki: &std::path::Path) -> FileNode {
    let path = entry.path();
    let rel = path.strip_prefix(wiki).unwrap_or(&path).to_string_lossy().to_string();
    let name = entry.file_name().to_string_lossy().to_string();
    let is_dir = entry.file_type().map(|t| t.is_dir()).unwrap_or(false);
    FileNode {
        name,
        path: rel,
        is_dir,
        children: Vec::new(),
    }
}

pub async fn create_file(
    State(state): State<Arc<AppState>>,
    Json(req): Json<CreateFileRequest>,
) -> Result<Json<FileNode>, String> {
    let target = state.resolve_wiki_path(&req.path).ok_or("Invalid path")?;
    if req.is_dir {
        std::fs::create_dir_all(&target).map_err(|e| format!("Failed to create directory: {e}"))?;
    } else {
        if let Some(parent) = target.parent() {
            std::fs::create_dir_all(parent).map_err(|e| format!("Failed to create parent: {e}"))?;
        }
        let default = default_ad_content(&target);
        std::fs::write(&target, default).map_err(|e| format!("Failed to create file: {e}"))?;
    }
    crate::links::rebuild_index(state.clone())
        .await
        .ok();
    Ok(Json(FileNode {
        name: target.file_name().unwrap_or_default().to_string_lossy().to_string(),
        path: req.path,
        is_dir: req.is_dir,
        children: Vec::new(),
    }))
}

fn default_ad_content(path: &std::path::Path) -> String {
    let title = path
        .file_stem()
        .unwrap_or_default()
        .to_string_lossy()
        .replace('_', " ");
    let now = chrono::Local::now().format("%Y-%m-%d").to_string();
    format!(
        "---\ntitle: \"{title}\"\ncreated_at: \"{now}\"\nupdated_at: \"{now}\"\n---\n\n# {title}\n\n",
    )
}

pub async fn rename_file(
    State(state): State<Arc<AppState>>,
    Json(req): Json<RenameFileRequest>,
) -> Result<Json<()>, String> {
    let old = state.resolve_wiki_path(&req.old_path).ok_or("Invalid old path")?;
    let new = state.resolve_wiki_path(&req.new_path).ok_or("Invalid new path")?;
    std::fs::rename(&old, &new).map_err(|e| format!("Failed to rename: {e}"))?;
    crate::links::rebuild_index(state.clone())
        .await
        .ok();
    Ok(Json(()))
}

pub async fn delete_file(
    State(state): State<Arc<AppState>>,
    Json(req): Json<DeleteFileRequest>,
) -> Result<Json<()>, String> {
    let target = state.resolve_wiki_path(&req.path).ok_or("Invalid path")?;
    if target.is_dir() {
        std::fs::remove_dir_all(&target).map_err(|e| format!("Failed to delete directory: {e}"))?;
    } else {
        std::fs::remove_file(&target).map_err(|e| format!("Failed to delete file: {e}"))?;
    }
    crate::links::rebuild_index(state.clone())
        .await
        .ok();
    Ok(Json(()))
}

pub async fn watch_wiki(state: Arc<AppState>) -> Result<(), String> {
    use notify::{Config, Event, RecommendedWatcher, RecursiveMode, Watcher};
    use std::sync::mpsc::channel;
    use std::time::Duration;

    let (tx, rx) = channel();
    let mut watcher = RecommendedWatcher::new(
        move |res: Result<Event, notify::Error>| {
            if let Ok(_evt) = res {
                let _ = tx.send(());
            }
        },
        Config::default().with_poll_interval(Duration::from_secs(1)),
    )
    .map_err(|e| format!("Failed to create watcher: {e}"))?;

    // Watch the current wiki dir if set; rewatch when it changes is not implemented here.
    if let Some(wiki) = state.wiki_dir() {
        watcher
            .watch(&wiki, RecursiveMode::Recursive)
            .map_err(|e| format!("Failed to watch wiki: {e}"))?;
    }

    loop {
        if rx.recv().is_ok() {
            tokio::time::sleep(Duration::from_millis(300)).await;
            // Drain remaining events.
            while rx.try_recv().is_ok() {}
            if let Err(e) = crate::links::rebuild_index(state.clone()).await {
                tracing::warn!("Failed to rebuild index: {e}");
            }
        }
    }
}

fn normalize_path(path: &std::path::Path) -> std::path::PathBuf {
    let mut components = Vec::new();
    for comp in path.components() {
        match comp {
            std::path::Component::Prefix(_) | std::path::Component::RootDir => {
                components.push(comp.as_os_str().to_owned())
            }
            std::path::Component::CurDir => {}
            std::path::Component::ParentDir => {
                components.pop();
            }
            std::path::Component::Normal(c) => components.push(c.to_owned()),
        }
    }
    components.into_iter().collect()
}
