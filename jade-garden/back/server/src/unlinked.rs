use std::sync::Arc;

use axum::{
    extract::{Path, State},
    response::Json,
};
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

// Plan 022 Phase 3: logic core shared by the axum shell and vm_dispatch.
pub fn unlinked_impl(state: &AppState, title: &str) -> Result<UnlinkedRefsResponse, crate::error::ApiError> {
    let names = state
        .with_index(|idx| {
            let mut names = vec![title.to_string()];
            // Also look for aliases stored in the tags table.
            if let Ok(path) = idx.page_exists(title) {
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

    Ok(UnlinkedRefsResponse { title: title.to_string(), refs })
}

pub async fn get_unlinked_refs(
    State(state): State<Arc<AppState>>,
    Path(title): Path<String>,
) -> Result<Json<UnlinkedRefsResponse>, crate::error::ApiError> {
    Ok(Json(unlinked_impl(&state, &title)?))
}

// plan-022 Phase 5: the scan itself retired to the single source
// (back/auto/unlinked.at → unlinked_gen.rs); the regex crate's last
// consumer is gone.

#[cfg(test)]
mod unlinked_gen_parity {
    // Cross-language parity with the TS twin (../../auto/tests/unlinked-parity.mjs).
    // Both sides drive unlinked_gen::findUnlinkedRefs over the same fixture
    // file; the shell-level Index::unlinked_references row mapping stays
    // covered by index.rs tests.

    fn fixtures() -> serde_json::Value {
        serde_json::from_str(include_str!("../../auto/tests/unlinked-fixtures.json")).unwrap()
    }

    #[test]
    fn unlinked_parity_fixtures() {
        let fx = fixtures();
        for c in fx["cases"].as_array().unwrap() {
            let name = c["name"].as_str().unwrap();
            let text = c["text"].as_str().unwrap();
            let names: Vec<String> = c["names"]
                .as_array()
                .unwrap()
                .iter()
                .map(|n| n.as_str().unwrap().to_string())
                .collect();
            let hits = crate::unlinked_gen::findUnlinkedRefs(text, names);
            let expected = c["expected"].as_array().unwrap();
            assert_eq!(hits.len(), expected.len(), "case `{name}`: hit count");
            for (i, (hit, e)) in hits.iter().zip(expected.iter()).enumerate() {
                assert_eq!(hit.matched, e["matched"].as_str().unwrap(), "case `{name}` #{i}: matched");
                assert_eq!(hit.context, e["context"].as_str().unwrap(), "case `{name}` #{i}: context");
            }
        }
    }

    #[test]
    fn empty_inputs_short_circuit() {
        let hits = crate::unlinked_gen::findUnlinkedRefs("anything", vec![]);
        assert!(hits.is_empty());
        let hits = crate::unlinked_gen::findUnlinkedRefs("", vec!["CAP".to_string()]);
        assert!(hits.is_empty());
    }
}
