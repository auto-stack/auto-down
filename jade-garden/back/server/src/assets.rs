use std::sync::Arc;

use axum::{
    extract::{Multipart, State},
    response::Json,
};
use serde::Serialize;

use crate::state::AppState;

#[derive(Serialize)]
pub struct UploadAssetResponse {
    path: String,
}

pub async fn upload_asset(
    State(state): State<Arc<AppState>>,
    mut multipart: Multipart,
) -> Result<Json<UploadAssetResponse>, crate::error::ApiError> {
    let wiki = state.wiki_dir().ok_or("No workspace open")?;
    let assets_dir = wiki.join("assets");
    std::fs::create_dir_all(&assets_dir).map_err(|e| format!("Failed to create assets dir: {e}"))?;

    while let Ok(Some(field)) = multipart.next_field().await {
        let file_name = field.file_name().unwrap_or("asset").to_string();
        let data = field.bytes().await.map_err(|e| format!("Failed to read upload: {e}"))?;
        if data.is_empty() {
            continue;
        }

        let ext = std::path::Path::new(&file_name)
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("bin");
        let safe_name = sanitize_filename(&file_name);
        let timestamp = chrono::Local::now().format("%Y%m%d_%H%M%S");
        let dest_name = format!("{timestamp}_{safe_name}.{ext}")
            .replace(' ', "_")
            .replace("..", ".");
        let dest = assets_dir.join(&dest_name);
        std::fs::write(&dest, data).map_err(|e| format!("Failed to write asset: {e}"))?;

        let rel = format!("assets/{dest_name}");
        return Ok(Json(UploadAssetResponse { path: rel }));
    }

    Err(crate::error::ApiError::bad_request("No file uploaded"))
}

fn sanitize_filename(name: &str) -> String {
    let stem = std::path::Path::new(name)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("asset");
    stem.chars()
        .filter(|c| c.is_alphanumeric() || *c == '-' || *c == '_')
        .collect::<String>()
}
