// vm_dispatch.rs — host side of the VM server's bridge (Plan 022 Phase 3).
//
// The .at handlers (back/auto/jade_server.at) forward every request
// through one host call carrying the envelope
//   {"method": str, "path": str, "query": object, "body": value}
// and this module routes it onto the SAME per-module logic cores the
// axum shell serves (the *_impl fns), answering
//   {"status": int, "statusText": str, "body": value}
// statusText duplicates the status as a string because the AutoVM-side
// json.get is a text-semantic accessor (plan 446) — the .at callApi
// matches it against escaped literals to set response_status.

use crate::error::ApiError;
use crate::state::AppState;
use serde::de::DeserializeOwned;
use serde_json::json;
use std::sync::Arc;

pub fn dispatch(state: &Arc<AppState>, args: &str) -> Result<String, String> {
    let v: serde_json::Value =
        serde_json::from_str(args).map_err(|e| format!("bad envelope: {e}"))?;
    let method = v["method"].as_str().unwrap_or("").to_string();
    let path = v["path"].as_str().unwrap_or("").to_string();
    let query = v["query"].clone();
    let body = v["body"].clone();

    let result = route_result(state, &method, &path, &query, &body);
    let (status, payload) = match result {
        Ok(payload) => (200, payload),
        Err(e) => (e.status_code().as_u16(), json!({ "error": e.message() })),
    };
    Ok(json!({
        "status": status,
        "statusText": status.to_string(),
        "body": payload,
    })
    .to_string())
}

fn ok_json<T: serde::Serialize>(value: &T) -> serde_json::Value {
    serde_json::to_value(value).unwrap_or(serde_json::Value::Null)
}

fn parse_body<T: DeserializeOwned>(body: &serde_json::Value) -> Result<T, ApiError> {
    serde_json::from_value(body.clone())
        .map_err(|e| ApiError::bad_request(format!("Invalid request body: {e}")))
}

fn q_str<'a>(q: &'a serde_json::Value, key: &str) -> Option<&'a str> {
    q.get(key).and_then(|v| v.as_str())
}

fn q_usize(q: &serde_json::Value, key: &str, default: usize) -> usize {
    q_str(q, key).and_then(|s| s.parse().ok()).unwrap_or(default)
}

fn q_i64(q: &serde_json::Value, key: &str, default: i64) -> i64 {
    q_str(q, key).and_then(|s| s.parse().ok()).unwrap_or(default)
}

fn q_bool(q: &serde_json::Value, key: &str, default: bool) -> bool {
    q_str(q, key).map(|s| s == "true").unwrap_or(default)
}

fn route_result(
    state: &Arc<AppState>,
    method: &str,
    path: &str,
    query: &serde_json::Value,
    body: &serde_json::Value,
) -> Result<serde_json::Value, ApiError> {
    let segs: Vec<&str> = path.split('/').filter(|s| !s.is_empty()).collect();
    let m = method.to_uppercase();

    // Rejoin everything after `n` fixed segments (wildcard routes).
    let rest_after = |n: usize| -> String {
        segs.iter().skip(n).copied().collect::<Vec<_>>().join("/")
    };

    match (m.as_str(), segs.as_slice()) {
        // Workspace
        ("GET", ["api", "workspace"]) => {
            Ok(ok_json(&crate::workspace::get_workspace_impl(state)))
        }
        ("POST", ["api", "workspace", "open"]) => {
            let req: crate::workspace::OpenWorkspaceRequest = parse_body(body)?;
            Ok(ok_json(&crate::workspace::open_workspace_impl(state, &req.root)?))
        }

        // Files
        ("GET", ["api", "files"]) => Ok(ok_json(&crate::files::list_files_impl(
            state,
            q_str(query, "path").unwrap_or(""),
            q_bool(query, "recursive", false),
        )?)),
        ("POST", ["api", "files", "create"]) => {
            let req: crate::files::CreateFileRequest = parse_body(body)?;
            Ok(ok_json(&crate::files::create_file_impl(state, &req.path, req.is_dir)?))
        }
        ("POST", ["api", "files", "rename"]) => {
            let req: crate::files::RenameFileRequest = parse_body(body)?;
            crate::files::rename_file_impl(state, &req.old_path, &req.new_path)?;
            Ok(json!(null))
        }
        ("POST", ["api", "files", "delete"]) => {
            let req: crate::files::DeleteFileRequest = parse_body(body)?;
            crate::files::delete_file_impl(state, &req.path)?;
            Ok(json!(null))
        }

        // Assets (multipart) — binary bodies cannot cross the VM envelope.
        ("POST", ["api", "assets", "upload"]) => Err(ApiError::bad_request(
            "assets upload is not served by the VM backend (multipart unsupported)",
        )),


        ("GET", ["api", "wiki", ..]) => {
            Ok(ok_json(&crate::wiki::read_wiki_impl(state, &rest_after(2))?))
        }
        ("POST", ["api", "wiki", ..]) => {
            let doc: crate::wiki::WikiDoc = parse_body(body)?;
            Ok(ok_json(&crate::wiki::write_wiki_impl(state, &rest_after(2), doc)?))
        }

        // Links
        ("GET", ["api", "backlinks", title]) => {
            Ok(ok_json(&crate::links::backlinks_impl(state, title)))
        }
        ("GET", ["api", "outlinks", title]) => {
            Ok(ok_json(&crate::links::outlinks_impl(state, title)))
        }
        ("GET", ["api", "graph"]) => Ok(ok_json(&crate::links::graph_impl(state)?)),

        // Search
        ("GET", ["api", "search"]) => Ok(ok_json(&crate::search::search_impl(
            state,
            q_str(query, "q").unwrap_or(""),
            q_usize(query, "limit", 20),
            crate::search::SearchScope::All,
        )?)),
        ("GET", ["api", "search", "pages"]) => Ok(ok_json(&crate::search::search_impl(
            state,
            q_str(query, "q").unwrap_or(""),
            q_usize(query, "limit", 20),
            crate::search::SearchScope::Pages,
        )?)),
        ("GET", ["api", "search", "blocks"]) => Ok(ok_json(&crate::search::search_impl(
            state,
            q_str(query, "q").unwrap_or(""),
            q_usize(query, "limit", 20),
            crate::search::SearchScope::Blocks,
        )?)),

        // Tasks / Agenda / Query
        ("GET", ["api", "tasks"]) => Ok(ok_json(&crate::tasks::tasks_impl(state)?)),
        ("GET", ["api", "agenda"]) => Ok(ok_json(&crate::tasks::agenda_impl(
            state,
            q_i64(query, "days", 14),
        )?)),
        ("GET", ["api", "query"]) => Ok(ok_json(&crate::query::query_impl(
            state,
            q_str(query, "q").unwrap_or(""),
        )?)),

        // SRS / Flashcards
        ("GET", ["api", "cards", "due"]) => Ok(ok_json(&crate::srs::due_cards_impl(
            state,
            q_usize(query, "limit", 50),
        )?)),
        ("POST", ["api", "cards", "review"]) => {
            let req: crate::srs::ReviewRequest = parse_body(body)?;
            Ok(ok_json(&crate::srs::review_card_impl(state, req)?))
        }

        // Import / Export — binary zip and multipart cannot cross the VM
        // envelope (e2e does not exercise these; plan-noted limitation).
        ("GET", ["api", "export", "markdown"]) => Err(ApiError::bad_request(
            "export is not served by the VM backend (binary payload unsupported)",
        )),
        ("POST", ["api", "import", "markdown"]) => Err(ApiError::bad_request(
            "import is not served by the VM backend (multipart unsupported)",
        )),

        // Sync
        ("GET", ["api", "sync", "status"]) => Ok(ok_json(&crate::sync::sync_status_impl())),

        // Whiteboards
        ("GET", ["api", "whiteboard", ..]) => {
            Ok(ok_json(&crate::whiteboard::read_whiteboard_impl(state, &rest_after(2))?))
        }
        ("POST", ["api", "whiteboard", ..]) => {
            let req: crate::whiteboard::WriteWhiteboardRequest = parse_body(body)?;
            Ok(ok_json(&crate::whiteboard::write_whiteboard_impl(
                state,
                &rest_after(2),
                req.shapes,
            )?))
        }

        // Blocks (/{id} vs /{title}/{id} disambiguated by segment count,
        // same as the axum router)
        ("GET", ["api", "blocks", id]) => {
            Ok(ok_json(&crate::blocks::get_block_impl(state, id)?))
        }
        ("GET", ["api", "blocks", title, id]) => Ok(ok_json(&crate::blocks::get_block_in_page_impl(
            state, title, id,
        )?)),

        // Unlinked references
        ("GET", ["api", "unlinked", title]) => {
            Ok(ok_json(&crate::unlinked::unlinked_impl(state, title)?))
        }

        _ => Err(ApiError::bad_request(format!(
            "No VM route for {method} {path}"
        ))),
    }
}
