use std::sync::Arc;

use axum::{
    extract::{Path, State},
    response::Json,
};
use serde::Serialize;

use crate::state::AppState;

#[derive(Serialize, Clone, Debug)]
pub struct BlockDto {
    pub uuid: String,
    pub page_path: String,
    pub block_id: Option<String>,
    pub kind: String,
    pub content: String,
    pub properties: serde_json::Value,
    pub line_start: usize,
    pub line_end: usize,
}

#[derive(Serialize)]
pub struct BlockResponse {
    pub found: bool,
    pub block: Option<BlockDto>,
}

pub async fn get_block(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Result<Json<BlockResponse>, crate::error::ApiError> {
    Ok(Json(get_block_impl(&state, &id)?))
}

// Plan 022 Phase 3: logic core shared by the axum shell and vm_dispatch.
pub fn get_block_impl(state: &AppState, id: &str) -> Result<BlockResponse, crate::error::ApiError> {
    let block = state
        .with_index(|idx| idx.find_block(id).unwrap_or_default())
        .ok_or("Index not available")?;

    Ok(BlockResponse {
        found: block.is_some(),
        block: block.map(block_dto),
    })
}

fn block_dto(b: crate::index::BlockRow) -> BlockDto {
    BlockDto {
        uuid: b.uuid,
        page_path: b.page_path,
        block_id: b.block_id,
        kind: b.kind,
        content: b.content,
        properties: serde_json::from_str(&b.properties).unwrap_or_default(),
        line_start: b.line_start,
        line_end: b.line_end,
    }
}

pub async fn get_block_in_page(
    State(state): State<Arc<AppState>>,
    Path((title, block_id)): Path<(String, String)>,
) -> Result<Json<BlockResponse>, crate::error::ApiError> {
    Ok(Json(get_block_in_page_impl(&state, &title, &block_id)?))
}

// Plan 022 Phase 3: logic core shared by the axum shell and vm_dispatch.
pub fn get_block_in_page_impl(
    state: &AppState,
    title: &str,
    block_id: &str,
) -> Result<BlockResponse, crate::error::ApiError> {
    let block = state
        .with_index(|idx| idx.find_block_in_page(title, block_id).unwrap_or_default())
        .ok_or("Index not available")?;

    Ok(BlockResponse {
        found: block.is_some(),
        block: block.map(block_dto),
    })
}
