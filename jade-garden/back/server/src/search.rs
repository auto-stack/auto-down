use std::sync::Arc;

use axum::{
    extract::{Query, State},
    response::Json,
};
use serde::{Deserialize, Serialize};

use crate::state::AppState;

#[derive(Deserialize)]
pub struct SearchQuery {
    q: String,
    #[serde(default = "default_limit")]
    limit: usize,
}

fn default_limit() -> usize {
    20
}

#[derive(Serialize, Clone, Debug)]
#[serde(tag = "type")]
pub enum SearchResultDto {
    Page {
        path: String,
        title: String,
        snippet: Option<String>,
    },
    Block {
        uuid: String,
        page_path: String,
        block_id: Option<String>,
        content: String,
        snippet: Option<String>,
    },
}

#[derive(Serialize)]
pub struct SearchResponse {
    query: String,
    results: Vec<SearchResultDto>,
}

// Plan 022 Phase 3: logic core shared by the axum shell and vm_dispatch.
#[derive(Clone, Copy, PartialEq)]
pub enum SearchScope {
    All,
    Pages,
    Blocks,
}

pub fn search_impl(
    state: &AppState,
    query: &str,
    limit: usize,
    scope: SearchScope,
) -> Result<SearchResponse, crate::error::ApiError> {
    let all = state
        .with_index(|idx| idx.search(query, limit.max(1).min(100)).unwrap_or_default())
        .ok_or("Index not available")?;
    let dtos: Vec<SearchResultDto> = all
        .into_iter()
        .filter(|r| match (scope, r) {
            (SearchScope::Pages, crate::index::SearchResult::Block { .. }) => false,
            (SearchScope::Blocks, crate::index::SearchResult::Page { .. }) => false,
            _ => true,
        })
        .map(|r| match r {
            crate::index::SearchResult::Page { path, title, snippet } => SearchResultDto::Page {
                path,
                title,
                snippet,
            },
            crate::index::SearchResult::Block {
                uuid,
                page_path,
                block_id,
                content,
                snippet,
            } => SearchResultDto::Block {
                uuid,
                page_path,
                block_id,
                content,
                snippet,
            },
        })
        .collect();
    Ok(SearchResponse {
        query: query.to_string(),
        results: dtos,
    })
}

pub async fn search(
    State(state): State<Arc<AppState>>,
    Query(q): Query<SearchQuery>,
) -> Result<Json<SearchResponse>, crate::error::ApiError> {
    Ok(Json(search_impl(&state, &q.q, q.limit, SearchScope::All)?))
}

pub async fn search_pages(
    State(state): State<Arc<AppState>>,
    Query(q): Query<SearchQuery>,
) -> Result<Json<SearchResponse>, crate::error::ApiError> {
    Ok(Json(search_impl(&state, &q.q, q.limit, SearchScope::Pages)?))
}

pub async fn search_blocks(
    State(state): State<Arc<AppState>>,
    Query(q): Query<SearchQuery>,
) -> Result<Json<SearchResponse>, crate::error::ApiError> {
    Ok(Json(search_impl(&state, &q.q, q.limit, SearchScope::Blocks)?))
}

#[cfg(test)]
mod search_gen_parity {
    // Cross-language parity with the TS twin (../../auto/tests/search-parity.mjs).
    // Both sides drive search_gen::searchAll over the same fixture file; the
    // shell-level Index::search row loading stays covered by index.rs tests.

    fn fixtures() -> serde_json::Value {
        serde_json::from_str(include_str!("../../auto/tests/search-fixtures.json")).unwrap()
    }

    #[test]
    fn search_parity_fixtures() {
        let fx = fixtures();
        let open = fx["marks"]["open"].as_str().unwrap();
        let close = fx["marks"]["close"].as_str().unwrap();
        let ellipsis = fx["marks"]["ellipsis"].as_str().unwrap();
        for c in fx["cases"].as_array().unwrap() {
            let name = c["name"].as_str().unwrap();
            let pages: Vec<crate::search_gen::SrPage> = c["pages"]
                .as_array()
                .unwrap()
                .iter()
                .map(|p| crate::search_gen::SrPage {
                    path: p["path"].as_str().unwrap().to_string(),
                    title: p["title"].as_str().unwrap().to_string(),
                    frontmatter: p["frontmatter"].as_str().unwrap().to_string(),
                })
                .collect();
            let blocks: Vec<crate::search_gen::SrBlock> = c["blocks"]
                .as_array()
                .unwrap()
                .iter()
                .map(|b| crate::search_gen::SrBlock {
                    uuid: b["uuid"].as_str().unwrap().to_string(),
                    pagePath: b["pagePath"].as_str().unwrap().to_string(),
                    blockId: b["blockId"].as_str().unwrap().to_string(),
                    content: b["content"].as_str().unwrap().to_string(),
                })
                .collect();
            let hits = crate::search_gen::searchAll(
                pages,
                blocks,
                c["query"].as_str().unwrap(),
                c["limit"].as_i64().unwrap(),
                open,
                close,
                ellipsis,
            );
            let expected = c["expected"].as_array().unwrap();
            assert_eq!(hits.len(), expected.len(), "{name}: hit count");
            for (i, (h, e)) in hits.iter().zip(expected).enumerate() {
                let label = format!("{name} #{i}");
                assert_eq!(h.isPage, e["isPage"].as_bool().unwrap(), "{label}: isPage");
                assert_eq!(h.path, e["path"].as_str().unwrap(), "{label}: path");
                assert_eq!(h.title, e["title"].as_str().unwrap(), "{label}: title");
                assert_eq!(h.uuid, e["uuid"].as_str().unwrap(), "{label}: uuid");
                assert_eq!(h.blockId, e["blockId"].as_str().unwrap(), "{label}: blockId");
                assert_eq!(h.content, e["content"].as_str().unwrap(), "{label}: content");
                assert_eq!(h.snippet, e["snippet"].as_str().unwrap(), "{label}: snippet");
            }
        }
    }
}
