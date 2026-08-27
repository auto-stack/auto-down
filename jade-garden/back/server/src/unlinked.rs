use std::sync::Arc;

use axum::{
    extract::{Path, State},
    response::Json,
};
use regex::Regex;
use serde::Serialize;

use crate::state::AppState;

#[derive(Serialize, Clone, Debug)]
pub struct UnlinkedRef {
    pub page_path: String,
    pub block_uuid: Option<String>,
    pub context: String,
    pub matched_text: String,
}

#[derive(Serialize)]
pub struct UnlinkedRefsResponse {
    pub title: String,
    pub refs: Vec<UnlinkedRef>,
}

pub async fn get_unlinked_refs(
    State(state): State<Arc<AppState>>,
    Path(title): Path<String>,
) -> Result<Json<UnlinkedRefsResponse>, crate::error::ApiError> {
    let names = state
        .with_index(|idx| {
            let mut names = vec![title.clone()];
            // Also look for aliases stored in the tags table.
            if let Ok(path) = idx.page_exists(&title) {
                if let Some(path) = path {
                    if let Ok(rows) = idx.page_aliases(&path) {
                        names.extend(rows);
                    }
                }
            }
            names
        })
        .ok_or("Index not available")?;

    let refs = state
        .with_index(|idx| idx.unlinked_references(&names).unwrap_or_default())
        .ok_or("Index not available")?;

    Ok(Json(UnlinkedRefsResponse { title, refs }))
}

pub fn find_unlinked_references(text: &str, names: &[String]) -> Vec<(String, String)> {
    if names.is_empty() || text.is_empty() {
        return Vec::new();
    }
    let escaped: Vec<String> = names.iter().map(|n| regex::escape(n)).collect();
    let pattern = format!(r"(?i)\b({})\b", escaped.join("|"));
    let Ok(re) = Regex::new(&pattern) else {
        return Vec::new();
    };
    let wiki_re = Regex::new(r"\[\[.*?\]\]").unwrap();

    let mut results = Vec::new();
    for mat in re.find_iter(text) {
        // Skip matches that fall inside a [[...]] wiki link.
        if wiki_re.find_iter(text).any(|m| m.start() <= mat.start() && mat.end() <= m.end()) {
            continue;
        }
        let context = extract_context(text, mat.start());
        results.push((mat.as_str().to_string(), context));
    }
    results
}

fn extract_context(text: &str, pos: usize) -> String {
    let start = text[..pos].rfind('\n').map(|i| i + 1).unwrap_or(0);
    let end = text[pos..].find('\n').map(|i| pos + i).unwrap_or(text.len());
    text[start..end].trim().to_string()
}
