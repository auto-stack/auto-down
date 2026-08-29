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
    pub path: String,
    is_dir: bool,
    children: Vec<FileNode>,
}

#[derive(Deserialize)]
pub struct ListFilesQuery {
    #[serde(default)]
    pub path: String,
    #[serde(default)]
    recursive: bool,
}

#[derive(Deserialize)]
pub struct CreateFileRequest {
    pub path: String,
    #[serde(default)]
    pub is_dir: bool,
}

#[derive(Deserialize)]
pub struct RenameFileRequest {
    pub old_path: String,
    pub new_path: String,
}

#[derive(Deserialize)]
pub struct DeleteFileRequest {
    pub path: String,
}

// Plan 022 Phase 3: logic core shared by the axum shell and vm_dispatch.
pub fn list_files_impl(
    state: &AppState,
    path: &str,
    recursive: bool,
) -> Result<Vec<FileNode>, crate::error::ApiError> {
    let q = ListFilesQuery { path: path.to_string(), recursive };
    let wiki = state.wiki_dir().ok_or("No workspace open")?;
    let base = wiki.join(&q.path);
    let base = normalize_path(&base);
    if !base.starts_with(&wiki) {
        return Err(crate::error::ApiError::bad_request("Invalid path"));
    }

    if q.recursive {
        let nodes = collect_recursive_nested(&base, &wiki).map_err(|e| format!("Failed to read directory: {e}"))?;
        Ok(nodes)
    } else {
        let mut entries: Vec<_> = std::fs::read_dir(&base)
            .map_err(|e| format!("Failed to read directory: {e}"))?
            .filter_map(|e| e.ok())
            .collect();
        entries.sort_by_key(|e| (e.file_type().map(|t| !t.is_dir()).unwrap_or(true), e.file_name()));

        let nodes = entries
            .into_iter()
            .map(|e| file_node_from_entry(&e, &wiki))
            .collect();
        Ok(nodes)
    }
}

pub async fn list_files(
    State(state): State<Arc<AppState>>,
    Query(q): Query<ListFilesQuery>,
) -> Result<Json<Vec<FileNode>>, crate::error::ApiError> {
    Ok(Json(list_files_impl(&state, &q.path, q.recursive)?))
}

fn collect_recursive_nested(dir: &std::path::Path, wiki: &std::path::Path) -> Result<Vec<FileNode>, std::io::Error> {
    let mut entries: Vec<_> = std::fs::read_dir(dir)?.filter_map(|e| e.ok()).collect();
    entries.sort_by_key(|e| (e.file_type().map(|t| !t.is_dir()).unwrap_or(true), e.file_name()));

    let mut nodes = Vec::new();
    for entry in entries {
        let mut node = file_node_from_entry(&entry, wiki);
        if node.is_dir {
            node.children = collect_recursive_nested(&entry.path(), wiki)?;
        }
        nodes.push(node);
    }
    Ok(nodes)
}

#[allow(dead_code)]
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

// Plan 022 Phase 3: logic core shared by the axum shell and vm_dispatch.
pub fn create_file_impl(
    state: &AppState,
    path: &str,
    is_dir: bool,
) -> Result<FileNode, crate::error::ApiError> {
    let req = CreateFileRequest { path: path.to_string(), is_dir };
    let target = state.resolve_wiki_path(&req.path).ok_or("Invalid path")?;
    if req.is_dir {
        std::fs::create_dir_all(&target).map_err(|e| format!("Failed to create directory: {e}"))?;
    } else {
        if let Some(parent) = target.parent() {
            std::fs::create_dir_all(parent).map_err(|e| format!("Failed to create parent: {e}"))?;
        }
        let default = default_ad_content(&target);
        std::fs::write(&target, default).map_err(|e| format!("Failed to create file: {e}"))?;
        crate::links::index_file(&state, &target).ok();
    }
    Ok(FileNode {
        name: target.file_name().unwrap_or_default().to_string_lossy().to_string(),
        path: req.path,
        is_dir: req.is_dir,
        children: Vec::new(),
    })
}

pub async fn create_file(
    State(state): State<Arc<AppState>>,
    Json(req): Json<CreateFileRequest>,
) -> Result<Json<FileNode>, crate::error::ApiError> {
    Ok(Json(create_file_impl(&state, &req.path, req.is_dir)?))
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

// Plan 022 Phase 3: logic core shared by the axum shell and vm_dispatch.
pub fn rename_file_impl(
    state: &AppState,
    old_path: &str,
    new_path: &str,
) -> Result<(), crate::error::ApiError> {
    let old = state.resolve_wiki_path(old_path).ok_or("Invalid old path")?;
    let new = state.resolve_wiki_path(new_path).ok_or("Invalid new path")?;
    std::fs::rename(&old, &new).map_err(|e| format!("Failed to rename: {e}"))?;
    crate::links::rename_file(state, &old, &new).ok();
    Ok(())
}

pub async fn rename_file(
    State(state): State<Arc<AppState>>,
    Json(req): Json<RenameFileRequest>,
) -> Result<Json<()>, crate::error::ApiError> {
    Ok(Json(rename_file_impl(&state, &req.old_path, &req.new_path)?))
}

// Plan 022 Phase 3: logic core shared by the axum shell and vm_dispatch.
pub fn delete_file_impl(state: &AppState, path: &str) -> Result<(), crate::error::ApiError> {
    let target = state.resolve_wiki_path(path).ok_or("Invalid path")?;
    if target.is_dir() {
        std::fs::remove_dir_all(&target).map_err(|e| format!("Failed to delete directory: {e}"))?;
    } else {
        std::fs::remove_file(&target).map_err(|e| format!("Failed to delete file: {e}"))?;
    }
    crate::links::remove_file(state, &target).ok();
    Ok(())
}

pub async fn delete_file(
    State(state): State<Arc<AppState>>,
    Json(req): Json<DeleteFileRequest>,
) -> Result<Json<()>, crate::error::ApiError> {
    Ok(Json(delete_file_impl(&state, &req.path)?))
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
