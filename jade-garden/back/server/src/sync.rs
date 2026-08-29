use axum::response::Json;
use serde::Serialize;

#[derive(Serialize)]
pub struct SyncStatus {
    pub status: String,
    pub message: String,
}

// Plan 022 Phase 3: logic core shared by the axum shell and vm_dispatch.
pub fn sync_status_impl() -> SyncStatus {
    SyncStatus {
        status: "not_implemented".to_string(),
        message: "File-level sync via git or external drive is planned but not yet implemented."
            .to_string(),
    }
}

pub async fn sync_status() -> Json<SyncStatus> {
    Json(sync_status_impl())
}
