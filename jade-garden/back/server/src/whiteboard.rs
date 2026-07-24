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

pub async fn read_whiteboard(
    State(state): State<Arc<AppState>>,
    AxumPath(path): AxumPath<String>,
) -> Result<Json<WhiteboardDoc>, String> {
    let wiki = state.wiki_dir().ok_or("No workspace open")?;
    let target = wiki.join("whiteboards").join(&path);
    let target = normalize_path(&target);
    if !target.starts_with(&wiki) {
        return Err("Invalid path".to_string());
    }
    if !target.exists() {
        return Ok(Json(WhiteboardDoc::default()));
    }
    let text = std::fs::read_to_string(&target).map_err(|e| e.to_string())?;
    let doc: WhiteboardDoc = serde_json::from_str(&text).unwrap_or_default();
    Ok(Json(doc))
}

#[derive(Deserialize)]
pub struct WriteWhiteboardRequest {
    pub shapes: Vec<WhiteboardShape>,
}

pub async fn write_whiteboard(
    State(state): State<Arc<AppState>>,
    AxumPath(path): AxumPath<String>,
    Json(req): Json<WriteWhiteboardRequest>,
) -> Result<Json<WhiteboardDoc>, String> {
    let wiki = state.wiki_dir().ok_or("No workspace open")?;
    let dir = wiki.join("whiteboards");
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let target = dir.join(&path);
    let target = normalize_path(&target);
    if !target.starts_with(&wiki) {
        return Err("Invalid path".to_string());
    }
    let doc = WhiteboardDoc { shapes: req.shapes };
    let text = serde_json::to_string_pretty(&doc).map_err(|e| e.to_string())?;
    std::fs::write(&target, text).map_err(|e| e.to_string())?;
    Ok(Json(doc))
}
