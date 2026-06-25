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
    root: String,
}

pub async fn get_workspace(State(state): State<Arc<AppState>>) -> Json<WorkspaceInfo> {
    Json(WorkspaceInfo {
        root: state.workspace_root().map(|p| p.to_string_lossy().to_string()),
        wiki_dir: state.wiki_dir().map(|p| p.to_string_lossy().to_string()),
    })
}

pub async fn open_workspace(
    State(state): State<Arc<AppState>>,
    Json(req): Json<OpenWorkspaceRequest>,
) -> Result<Json<WorkspaceInfo>, String> {
    let root = std::path::PathBuf::from(&req.root);
    if !root.exists() {
        return Err(format!("Directory does not exist: {}", req.root));
    }
    state
        .set_workspace_root(root)
        .map_err(|e| format!("Failed to save workspace config: {e}"))?;

    // Ensure wiki/ subdirectory exists.
    if let Some(wiki) = state.wiki_dir() {
        std::fs::create_dir_all(&wiki).map_err(|e| format!("Failed to create wiki dir: {e}"))?;
    }

    // Rebuild link index for the new workspace.
    crate::links::rebuild_index(state.clone())
        .await
        .map_err(|e| format!("Failed to build link index: {e}"))?;

    Ok(Json(WorkspaceInfo {
        root: state.workspace_root().map(|p| p.to_string_lossy().to_string()),
        wiki_dir: state.wiki_dir().map(|p| p.to_string_lossy().to_string()),
    }))
}
