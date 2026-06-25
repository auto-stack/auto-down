use std::sync::Arc;

use axum::{
    extract::{Path, State},
    response::Json,
};
use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::state::AppState;

#[derive(Serialize, Deserialize)]
pub struct WikiDoc {
    pub frontmatter: Value,
    pub body: String,
}

pub async fn read_wiki(
    State(state): State<Arc<AppState>>,
    Path(path): Path<String>,
) -> Result<Json<WikiDoc>, String> {
    let target = state.resolve_wiki_path(&path).ok_or("Invalid path")?;
    if !target.exists() {
        return Err(format!("File not found: {path}"));
    }
    let text = std::fs::read_to_string(&target).map_err(|e| format!("Failed to read file: {e}"))?;
    let (frontmatter, body) = split_ad(&text)?;
    Ok(Json(WikiDoc { frontmatter, body }))
}

pub async fn write_wiki(
    State(state): State<Arc<AppState>>,
    Path(path): Path<String>,
    Json(doc): Json<WikiDoc>,
) -> Result<Json<WikiDoc>, String> {
    let target = state.resolve_wiki_path(&path).ok_or("Invalid path")?;
    if let Some(parent) = target.parent() {
        std::fs::create_dir_all(parent).map_err(|e| format!("Failed to create parent: {e}"))?;
    }

    let mut frontmatter = doc.frontmatter;
    if let Some(obj) = frontmatter.as_object_mut() {
        let now = chrono::Local::now().format("%Y-%m-%dT%H:%M:%S").to_string();
        obj.insert("updated_at".to_string(), Value::String(now));
    }

    let text = join_ad(&frontmatter, &doc.body)?;
    std::fs::write(&target, text).map_err(|e| format!("Failed to write file: {e}"))?;

    crate::links::rebuild_index(state.clone())
        .await
        .ok();

    Ok(Json(WikiDoc { frontmatter, body: doc.body }))
}

/// Split an `.ad` file into YAML frontmatter and Markdown body.
fn split_ad(text: &str) -> Result<(Value, String), String> {
    let trimmed = text.trim_start();
    if !trimmed.starts_with("---") {
        return Ok((Value::Object(serde_json::Map::new()), text.to_string()));
    }
    let rest = &trimmed[3..];
    let Some(end) = rest.find("\n---") else {
        return Ok((Value::Object(serde_json::Map::new()), text.to_string()));
    };
    let yaml_text = &rest[..end];
    let body = &rest[end + 4..];
    let frontmatter: Value = serde_yaml::from_str(yaml_text)
        .map_err(|e| format!("Failed to parse YAML frontmatter: {e}"))?;
    Ok((frontmatter, body.trim_start().to_string()))
}

/// Join frontmatter and body back into `.ad` text.
fn join_ad(frontmatter: &Value, body: &str) -> Result<String, String> {
    let yaml_text = serde_yaml::to_string(frontmatter)
        .map_err(|e| format!("Failed to serialize frontmatter: {e}"))?;
    Ok(format!("---\n{}---\n\n{}", yaml_text, body.trim_start()))
}
