// error.rs — shared API error type for route handlers.
//
// Axum turns `Err(String)` handler results into a *200 OK* text/plain
// response (that is String's IntoResponse impl), so every plain-string
// error looked like success to the frontend (`res.ok == true`, body then
// parsed as JSON). This newtype forces real error statuses + a JSON
// `{"error": ...}` body while existing `Err(format!(...))` / `?` call
// sites keep compiling unchanged via From<String>.
use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;

#[derive(Debug)]
pub struct ApiError {
    status: StatusCode,
    message: String,
}

impl ApiError {
    /// Client-input problems (missing dir/file, invalid path) that should
    /// read as 4xx rather than a server fault.
    pub fn bad_request(message: impl Into<String>) -> Self {
        Self {
            status: StatusCode::BAD_REQUEST,
            message: message.into(),
        }
    }
}

impl From<String> for ApiError {
    fn from(message: String) -> Self {
        Self {
            status: StatusCode::INTERNAL_SERVER_ERROR,
            message,
        }
    }
}

impl From<&str> for ApiError {
    fn from(message: &str) -> Self {
        Self::from(message.to_string())
    }
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        (self.status, Json(json!({ "error": self.message }))).into_response()
    }
}

impl ApiError {
    // Plan 022 Phase 3: vm_dispatch serializes the same error face the axum
    // IntoResponse produces ({"error": ...} + status).
    pub fn status_code(&self) -> axum::http::StatusCode {
        self.status
    }

    pub fn message(&self) -> &str {
        &self.message
    }
}
