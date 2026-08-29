use std::path::Path;
use std::sync::Arc;

use axum::{
    extract::{Path as AxumPath, State},
    response::Json,
};
use serde::{Deserialize, Serialize};

use crate::state::AppState;

#[derive(Serialize, Deserialize, Default, Clone)]
pub struct WhiteboardDoc {
    pub shapes: Vec<WhiteboardShape>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct WhiteboardShape {
    pub id: String,
    pub kind: String,
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
    pub label: String,
    pub target: Option<String>,
}

fn normalize_path(path: &Path) -> std::path::PathBuf {
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

// Plan 022 Phase 3: logic core shared by the axum shell and vm_dispatch.
pub fn read_whiteboard_impl(state: &AppState, path: &str) -> Result<WhiteboardDoc, crate::error::ApiError> {
    let wiki = state.wiki_dir().ok_or("No workspace open")?;
    let target = wiki.join("whiteboards").join(path);
    let target = normalize_path(&target);
    if !target.starts_with(&wiki) {
        return Err(crate::error::ApiError::bad_request("Invalid path"));
    }
    if !target.exists() {
        return Ok(WhiteboardDoc::default());
    }
    let text = std::fs::read_to_string(&target).map_err(|e| e.to_string())?;
    let doc: WhiteboardDoc = serde_json::from_str(&text).unwrap_or_default();
    Ok(doc)
}

pub async fn read_whiteboard(
    State(state): State<Arc<AppState>>,
    AxumPath(path): AxumPath<String>,
) -> Result<Json<WhiteboardDoc>, crate::error::ApiError> {
    Ok(Json(read_whiteboard_impl(&state, &path)?))
}

#[derive(Deserialize)]
pub struct WriteWhiteboardRequest {
    pub shapes: Vec<WhiteboardShape>,
}

// Plan 022 Phase 3: logic core shared by the axum shell and vm_dispatch.
pub fn write_whiteboard_impl(
    state: &AppState,
    path: &str,
    shapes: Vec<WhiteboardShape>,
) -> Result<WhiteboardDoc, crate::error::ApiError> {
    let wiki = state.wiki_dir().ok_or("No workspace open")?;
    let dir = wiki.join("whiteboards");
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let target = dir.join(path);
    let target = normalize_path(&target);
    if !target.starts_with(&wiki) {
        return Err(crate::error::ApiError::bad_request("Invalid path"));
    }
    let doc = WhiteboardDoc { shapes };
    let text = serde_json::to_string_pretty(&doc).map_err(|e| e.to_string())?;
    std::fs::write(&target, text).map_err(|e| e.to_string())?;
    Ok(doc)
}

pub async fn write_whiteboard(
    State(state): State<Arc<AppState>>,
    AxumPath(path): AxumPath<String>,
    Json(req): Json<WriteWhiteboardRequest>,
) -> Result<Json<WhiteboardDoc>, crate::error::ApiError> {
    Ok(Json(write_whiteboard_impl(&state, &path, req.shapes)?))
}
