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

pub async fn search(
    State(state): State<Arc<AppState>>,
    Query(q): Query<SearchQuery>,
) -> Result<Json<SearchResponse>, crate::error::ApiError> {
    let results = state
        .with_index(|idx| idx.search(&q.q, q.limit.max(1).min(100)).unwrap_or_default())
        .ok_or("Index not available")?;

    let dtos: Vec<SearchResultDto> = results
        .into_iter()
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

    Ok(Json(SearchResponse {
        query: q.q,
        results: dtos,
    }))
}

pub async fn search_pages(
    State(state): State<Arc<AppState>>,
    Query(q): Query<SearchQuery>,
) -> Result<Json<SearchResponse>, crate::error::ApiError> {
    let all = state
        .with_index(|idx| idx.search(&q.q, q.limit.max(1).min(100)).unwrap_or_default())
        .ok_or("Index not available")?;
    let pages: Vec<SearchResultDto> = all
        .into_iter()
        .filter_map(|r| match r {
            crate::index::SearchResult::Page { path, title, snippet } => {
                Some(SearchResultDto::Page { path, title, snippet })
            }
            _ => None,
        })
        .collect();
    Ok(Json(SearchResponse {
        query: q.q,
        results: pages,
    }))
}

pub async fn search_blocks(
    State(state): State<Arc<AppState>>,
    Query(q): Query<SearchQuery>,
) -> Result<Json<SearchResponse>, crate::error::ApiError> {
    let all = state
        .with_index(|idx| idx.search(&q.q, q.limit.max(1).min(100)).unwrap_or_default())
        .ok_or("Index not available")?;
    let blocks: Vec<SearchResultDto> = all
        .into_iter()
        .filter_map(|r| match r {
            crate::index::SearchResult::Block {
                uuid,
                page_path,
                block_id,
                content,
                snippet,
            } => Some(SearchResultDto::Block {
                uuid,
                page_path,
                block_id,
                content,
                snippet,
            }),
            _ => None,
        })
        .collect();
    Ok(Json(SearchResponse {
        query: q.q,
        results: blocks,
    }))
}
