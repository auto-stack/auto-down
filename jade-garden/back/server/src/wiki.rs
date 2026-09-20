use std::sync::Arc;

use axum::{
    extract::{Path, State},
    response::Json,
};
use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::state::AppState;
use crate::links;

#[derive(Serialize, Deserialize)]
pub struct WikiDoc {
    pub frontmatter: Value,
    pub body: String,
    // PLAN-080 T-01 additive read-only pair channel (P-9 bypass: the VM track
    // cannot iterate a JSON map, but consumes key/value pair lists). YAML
    // mapping order — the serde_json Map is alphabetical here (no
    // preserve_order), so read_wiki_impl derives pairs from a second
    // serde_yaml parse, whose Mapping preserves insertion order. The write
    // path never consumes it (serde default) and echoes whatever the client
    // sent; reads remain the ordering authority.
    #[serde(default)]
    pub frontmatter_pairs: Vec<FrontmatterPair>,
}

#[derive(Serialize, Deserialize)]
pub struct FrontmatterPair {
    pub key: String,
    pub value: Value,
}

// Plan 022 Phase 3: logic core shared by the axum shell and vm_dispatch.
pub fn read_wiki_impl(state: &AppState, path: &str) -> Result<WikiDoc, crate::error::ApiError> {
    let target = state.resolve_wiki_path(path).ok_or("Invalid path")?;
    if !target.exists() {
        return Err(format!("File not found: {path}").into());
    }
    let text = std::fs::read_to_string(&target).map_err(|e| format!("Failed to read file: {e}"))?;
    let (frontmatter, body, pairs) = split_ad(&text)?;
    Ok(WikiDoc { frontmatter, body, frontmatter_pairs: pairs })
}

pub async fn read_wiki(
    State(state): State<Arc<AppState>>,
    Path(path): Path<String>,
) -> Result<Json<WikiDoc>, crate::error::ApiError> {
    Ok(Json(read_wiki_impl(&state, &path)?))
}

// Plan 022 Phase 3: logic core shared by the axum shell and vm_dispatch.
pub fn write_wiki_impl(
    state: &AppState,
    path: &str,
    doc: WikiDoc,
) -> Result<WikiDoc, crate::error::ApiError> {
    let target = state.resolve_wiki_path(path).ok_or("Invalid path")?;
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

    // Incrementally update the search/link index for this file.
    links::index_file(state, &target).ok();

    Ok(WikiDoc { frontmatter, body: doc.body, frontmatter_pairs: doc.frontmatter_pairs })
}

pub async fn write_wiki(
    State(state): State<Arc<AppState>>,
    Path(path): Path<String>,
    Json(doc): Json<WikiDoc>,
) -> Result<Json<WikiDoc>, crate::error::ApiError> {
    Ok(Json(write_wiki_impl(&state, &path, doc)?))
}

/// Split an `.ad` file into YAML frontmatter and Markdown body, plus the
/// ordered frontmatter key/value pairs (PLAN-080 T-01). The `frontmatter`
/// Value keeps its historical shape (serde_json Map — alphabetical without
/// the preserve_order feature); pairs carry the YAML mapping order.
fn split_ad(text: &str) -> Result<(Value, String, Vec<FrontmatterPair>), String> {
    let trimmed = text.trim_start();
    if !trimmed.starts_with("---") {
        return Ok((Value::Object(serde_json::Map::new()), text.to_string(), Vec::new()));
    }
    let rest = &trimmed[3..];
    let Some(end) = rest.find("\n---") else {
        return Ok((Value::Object(serde_json::Map::new()), text.to_string(), Vec::new()));
    };
    let yaml_text = &rest[..end];
    let body = &rest[end + 4..];
    let frontmatter: Value = serde_yaml::from_str(yaml_text)
        .map_err(|e| format!("Failed to parse YAML frontmatter: {e}"))?;
    let pairs = ordered_frontmatter_pairs(yaml_text)?;
    Ok((frontmatter, body.trim_start().to_string(), pairs))
}

/// Ordered frontmatter pairs in YAML mapping order (serde_yaml's Mapping
/// preserves insertion order, unlike the serde_json Map). Non-string keys
/// and non-mapping documents degrade to fewer/no pairs — the additive
/// channel never fails a read that `frontmatter` would survive.
fn ordered_frontmatter_pairs(yaml_text: &str) -> Result<Vec<FrontmatterPair>, String> {
    let yaml: serde_yaml::Value = serde_yaml::from_str(yaml_text)
        .map_err(|e| format!("Failed to parse YAML frontmatter: {e}"))?;
    let mut out = Vec::new();
    if let serde_yaml::Value::Mapping(map) = yaml {
        for (k, v) in map {
            if let serde_yaml::Value::String(key) = k {
                let value = serde_json::to_value(&v)
                    .map_err(|e| format!("Failed to convert frontmatter value: {e}"))?;
                out.push(FrontmatterPair { key, value });
            }
        }
    }
    Ok(out)
}

/// Join frontmatter and body back into `.ad` text.
fn join_ad(frontmatter: &Value, body: &str) -> Result<String, String> {
    let yaml_text = serde_yaml::to_string(frontmatter)
        .map_err(|e| format!("Failed to serialize frontmatter: {e}"))?;
    Ok(format!("---\n{}---\n\n{}", yaml_text, body.trim_start()))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn split_ad_with_frontmatter() {
        let text = "---\ntitle: Foo\n---\n\n# Body\n";
        let (fm, body, pairs) = split_ad(text).unwrap();
        assert_eq!(fm["title"], "Foo");
        assert_eq!(body, "# Body\n");
        assert_eq!(pairs.len(), 1);
        assert_eq!(pairs[0].key, "title");
        assert_eq!(pairs[0].value, "Foo");
    }

    #[test]
    fn split_ad_without_frontmatter() {
        let text = "# Body\n\nparagraph\n";
        let (fm, body, pairs) = split_ad(text).unwrap();
        assert!(fm.as_object().unwrap().is_empty());
        assert_eq!(body, text);
        assert!(pairs.is_empty());
    }

    #[test]
    fn join_ad_roundtrip() {
        let mut fm = serde_json::Map::new();
        fm.insert("title".to_string(), Value::String("Foo".to_string()));
        let text = join_ad(&Value::Object(fm), "# Body\n").unwrap();
        assert!(text.starts_with("---\n"));
        assert!(text.contains("title: Foo"));
        assert!(text.ends_with("# Body\n"));
    }

    // PLAN-080 T-01: pairs carry the YAML mapping order — NOT the
    // alphabetical serde_json Map order — and value fidelity covers
    // scalars, bools, and sequences (fixture pages: status/summary/tags/
    // title/updated_at, tags is a list).
    #[test]
    fn frontmatter_pairs_yaml_order() {
        let text = "---\nzebra: 1\nalpha: two\nmike:\n- a\n- b\nkilo: true\n---\n\n# Body\n";
        let (fm, _body, pairs) = split_ad(text).unwrap();
        // the alphabetical Value stays intact for existing consumers
        assert_eq!(fm["alpha"], "two");
        let keys: Vec<&str> = pairs.iter().map(|p| p.key.as_str()).collect();
        assert_eq!(keys, vec!["zebra", "alpha", "mike", "kilo"]);
        assert_eq!(pairs[0].value, serde_json::json!(1));
        assert_eq!(pairs[1].value, serde_json::json!("two"));
        assert_eq!(pairs[2].value, serde_json::json!(["a", "b"]));
        assert_eq!(pairs[3].value, serde_json::json!(true));
    }

    #[test]
    fn frontmatter_pairs_non_mapping_degrades() {
        // a YAML scalar/list frontmatter document keeps the historical
        // `frontmatter` behavior; the pair channel degrades to empty
        let (fm, _body, pairs) = split_ad("---\njust a scalar\n---\n\n# B\n").unwrap();
        assert_eq!(fm, serde_json::json!("just a scalar"));
        assert!(pairs.is_empty());
    }
}
