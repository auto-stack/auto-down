use std::sync::Arc;

use axum::{
    extract::State,
    response::Json,
};
use serde::{Deserialize, Serialize};

use crate::state::AppState;

#[derive(Serialize)]
pub struct WorkspaceInfo {
    root: Option<String>,
    wiki_dir: Option<String>,
}

#[derive(Deserialize)]
pub struct OpenWorkspaceRequest {
    pub root: String,
}

// Plan 022 Phase 3: logic core shared by the axum shell and vm_dispatch.
pub fn get_workspace_impl(state: &AppState) -> WorkspaceInfo {
    WorkspaceInfo {
        root: state.workspace_root().map(|p| p.to_string_lossy().to_string()),
        wiki_dir: state.wiki_dir().map(|p| p.to_string_lossy().to_string()),
    }
}

pub async fn get_workspace(State(state): State<Arc<AppState>>) -> Json<WorkspaceInfo> {
    Json(get_workspace_impl(&state))
}

// Plan 022 Phase 3: sync logic core (rebuild via rebuild_index_sync — the
// axum wrapper keeps the async spawn_blocking flow through rebuild_index).
pub fn open_workspace_impl(
    state: &Arc<AppState>,
    root_str: &str,
) -> Result<WorkspaceInfo, crate::error::ApiError> {
    let req = OpenWorkspaceRequest { root: root_str.to_string() };
    let root = std::path::PathBuf::from(&req.root);
    if !root.exists() {
        return Err(crate::error::ApiError::bad_request(format!(
            "Directory does not exist: {}",
            req.root
        )));
    }
    state
        .set_workspace_root(root)
        .map_err(|e| format!("Failed to save workspace config: {e}"))?;

    // Ensure wiki/ subdirectory exists.
    if let Some(wiki) = state.wiki_dir() {
        std::fs::create_dir_all(&wiki).map_err(|e| format!("Failed to create wiki dir: {e}"))?;
    }

    // Rebuild link index for the new workspace (sync core; the axum
    // wrapper used to await the spawn_blocking variant).
    crate::links::rebuild_index_sync(state.clone())
        .map_err(|e| format!("Failed to build link index: {e}"))?;

    Ok(WorkspaceInfo {
        root: state.workspace_root().map(|p| p.to_string_lossy().to_string()),
        wiki_dir: state.wiki_dir().map(|p| p.to_string_lossy().to_string()),
    })
}

pub async fn open_workspace(
    State(state): State<Arc<AppState>>,
    Json(req): Json<OpenWorkspaceRequest>,
) -> Result<Json<WorkspaceInfo>, crate::error::ApiError> {
    Ok(Json(open_workspace_impl(&state, &req.root)?))
}
