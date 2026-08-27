use std::io::{Read, Write};
use std::path::Path;
use std::sync::Arc;

use axum::{
    body::Body,
    extract::{Multipart, State},
    response::{IntoResponse, Response},
};
use serde::Serialize;

use crate::state::AppState;

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

#[derive(Serialize)]
pub struct ExportManifest {
    pub format: String,
    pub exported_at: String,
    pub files: Vec<String>,
}

pub async fn export_markdown(State(state): State<Arc<AppState>>) -> Result<Response, crate::error::ApiError> {
    let wiki = state.wiki_dir().ok_or("No workspace open")?;
    let mut zip_buf = Vec::new();
    {
        let mut zip = zip::ZipWriter::new(std::io::Cursor::new(&mut zip_buf));
        let options = zip::write::SimpleFileOptions::default()
            .compression_method(zip::CompressionMethod::Deflated);

        let entries = walkdir::WalkDir::new(&wiki)
            .into_iter()
            .filter_map(|e| e.ok())
            .filter(|e| {
                e.path()
                    .extension()
                    .map(|ext| ext == "ad")
                    .unwrap_or(false)
            })
            .collect::<Vec<_>>();

        for entry in &entries {
            let path = entry.path();
            let rel = path.strip_prefix(&wiki).unwrap_or(path).to_string_lossy().replace('\\', "/");
            let md_name = rel.replace(".ad", ".md");
            let text = std::fs::read_to_string(path).map_err(|e| format!("Failed to read {rel}: {e}"))?;
            zip.start_file_from_path(&md_name, options).map_err(|e| e.to_string())?;
            zip.write_all(text.as_bytes()).map_err(|e| e.to_string())?;
        }

        let manifest = ExportManifest {
            format: "markdown".to_string(),
            exported_at: chrono::Local::now().to_rfc3339(),
            files: entries.iter().map(|e| {
                let rel = e.path().strip_prefix(&wiki).unwrap_or(e.path()).to_string_lossy().replace('\\', "/");
                rel.replace(".ad", ".md")
            }).collect(),
        };
        let manifest_json = serde_json::to_string_pretty(&manifest).map_err(|e| e.to_string())?;
        zip.start_file_from_path("manifest.json", options).map_err(|e| e.to_string())?;
        zip.write_all(manifest_json.as_bytes()).map_err(|e| e.to_string())?;

        zip.finish().map_err(|e| e.to_string())?;
    }

    Ok(Response::builder()
        .header("Content-Type", "application/zip")
        .header(
            "Content-Disposition",
            "attachment; filename=\"jade-garden-export.zip\"",
        )
        .body(Body::from(zip_buf))
        .map_err(|e| e.to_string())?)
}

pub async fn import_markdown(
    State(state): State<Arc<AppState>>,
    mut multipart: Multipart,
) -> Result<impl IntoResponse, crate::error::ApiError> {
    let wiki = state.wiki_dir().ok_or("No workspace open")?;
    let mut imported = 0;

    while let Ok(Some(field)) = multipart.next_field().await {
        let data = field.bytes().await.map_err(|e| format!("Failed to read upload: {e}"))?;
        if data.is_empty() {
            continue;
        }
        let cursor = std::io::Cursor::new(&data);
        let mut archive = zip::ZipArchive::new(cursor).map_err(|e| format!("Invalid zip: {e}"))?;
        for i in 0..archive.len() {
            let mut file = archive.by_index(i).map_err(|e| e.to_string())?;
            let name = file.name().to_string();
            if !name.ends_with(".md") || name.contains("..") {
                continue;
            }
            let ad_name = name.replace(".md", ".ad");
            let target = wiki.join(&ad_name);
            let target = normalize_path(&target);
            if !target.starts_with(&wiki) {
                continue;
            }
            if let Some(parent) = target.parent() {
                std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
            }
            let mut contents = String::new();
            file.read_to_string(&mut contents).map_err(|e| e.to_string())?;
            std::fs::write(&target, contents).map_err(|e| e.to_string())?;
            imported += 1;
        }
    }

    crate::links::rebuild_index(state.clone())
        .await
        .map_err(|e| format!("Failed to rebuild index: {e}"))?;

    Ok(axum::Json(serde_json::json!({ "imported": imported })))
}
