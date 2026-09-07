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

/// PLAN-058 T14：信封 body 字符串字段读取。
fn body_str(body: &serde_json::Value, key: &str) -> Result<String, ApiError> {
    body.get(key)
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
        .ok_or_else(|| ApiError::bad_request(format!("missing field `{key}`")))
}

/// PLAN-058 T14：信封 body base64 字段解码。
fn body_b64(body: &serde_json::Value, key: &str) -> Result<Vec<u8>, ApiError> {
    let s = body_str(body, key)?;
    b64_decode(&s).map_err(|e| ApiError::bad_request(format!("invalid base64 `{key}`: {e}")))
}

fn b64_encode(data: &[u8]) -> String {
    use base64::Engine;
    base64::engine::general_purpose::STANDARD.encode(data)
}

fn b64_decode(s: &str) -> Result<Vec<u8>, String> {
    use base64::Engine;
    base64::engine::general_purpose::STANDARD
        .decode(s.trim())
        .map_err(|e| e.to_string())
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

        // PLAN-058 T14（转介⑥）：三路由 base64-in-JSON 信封收口（022
        // Phase 3 D4 豁免就此销）——二进制以 data_b64 字段过 JSON 信封
        // （默认路线，058 待澄清①）：上传 {name, data_b64}、导入
        // {data_b64}、导出回 {format, encoding, data}。
        ("POST", ["api", "assets", "upload"]) => {
            let name = body_str(body, "name")?;
            let bytes = body_b64(body, "data_b64")?;
            let path = crate::assets::upload_asset_core(state, &name, &bytes)?;
            Ok(json!({ "path": path }))
        }


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

        // PLAN-058 T14（转介⑥）：导出 zip 经 base64 过信封（同一
        // export_markdown_core，axum 壳的 binary 响应语义不动）。
        ("GET", ["api", "export", "markdown"]) => {
            let zip = crate::import_export::export_markdown_core(state)?;
            let data = b64_encode(&zip);
            Ok(json!({
                "format": "zip",
                "encoding": "base64",
                "data": data,
            }))
        }
        ("POST", ["api", "import", "markdown"]) => {
            let bytes = body_b64(body, "data_b64")?;
            let imported = crate::import_export::import_markdown_core(state, &bytes)
                .map_err(ApiError::bad_request)?;
            crate::links::rebuild_index_sync(state.clone())
                .map_err(ApiError::bad_request)?;
            Ok(json!({ "imported": imported }))
        }

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

#[cfg(test)]
mod plan058_tests {
    use super::*;
    use crate::state::AppState;
    use std::sync::Arc;

    fn make_workspace() -> (tempfile::TempDir, Arc<AppState>) {
        let tmp = tempfile::tempdir().unwrap();
        let wiki = tmp.path().join("wiki");
        std::fs::create_dir(&wiki).unwrap();
        let state = Arc::new(AppState::with_workspace_root(tmp.path().to_path_buf()));
        (tmp, state)
    }

    fn envelope(method: &str, path: &str, body: serde_json::Value) -> String {
        json!({
            "method": method,
            "path": path,
            "query": {},
            "body": body,
        })
        .to_string()
    }

    /// PLAN-058 T14（转介⑥）：base64 信封三路由往返——导出 zip → 删源
    /// → 导入回灌 → 文件与索引恢复（桌面形态通道的端到端判据）。
    #[test]
    fn vm_envelope_export_import_roundtrip() {
        let (tmp, state) = make_workspace();
        let wiki = state.wiki_dir().unwrap();
        std::fs::write(
            wiki.join("note.ad"),
            "---
title: Note
---

Link to [[Other]].
".replace("\n", "
"),
        )
        .unwrap();
        std::fs::write(wiki.join("other.ad"), "# Other
").unwrap();
        crate::links::rebuild_index_sync(state.clone()).unwrap();

        // Export over the VM envelope.
        let resp = dispatch(&state, &envelope("GET", "/api/export/markdown", serde_json::Value::Null))
            .unwrap();
        let v: serde_json::Value = serde_json::from_str(&resp).unwrap();
        assert_eq!(v["status"], 200, "export dispatch: {resp}");
        assert_eq!(v["body"]["format"], "zip");
        assert_eq!(v["body"]["encoding"], "base64");
        let b64 = v["body"]["data"].as_str().unwrap();
        assert!(!b64.is_empty());

        // Drop the source file, then import the archive back.
        std::fs::remove_file(wiki.join("note.ad")).unwrap();
        let resp2 = dispatch(
            &state,
            &envelope(
                "POST",
                "/api/import/markdown",
                json!({ "data_b64": b64 }),
            ),
        )
        .unwrap();
        let v2: serde_json::Value = serde_json::from_str(&resp2).unwrap();
        assert_eq!(v2["status"], 200, "import dispatch: {resp2}");
        assert_eq!(v2["body"]["imported"], 2, "both .md restored");
        let restored = std::fs::read_to_string(wiki.join("note.ad")).unwrap();
        assert!(restored.contains("Link to [[Other]]"), "content restored");

        // Index follows the rebuild (backlinks reachable through the same state).
        let resp3 = dispatch(
            &state,
            &envelope("GET", "/api/backlinks/Other", serde_json::Value::Null),
        )
        .unwrap();
        assert!(resp3.contains("note.ad"), "index rebuilt after import: {resp3}");
        drop(tmp);
    }

    /// PLAN-058 T14：资产上传 base64 信封。
    #[test]
    fn vm_envelope_asset_upload() {
        let (tmp, state) = make_workspace();
        let payload = b"png-bytes-PLAN058".to_vec();
        let b64 = {
            use base64::Engine;
            base64::engine::general_purpose::STANDARD.encode(&payload)
        };
        let resp = dispatch(
            &state,
            &envelope(
                "POST",
                "/api/assets/upload",
                json!({ "name": "shot img.png", "data_b64": b64 }),
            ),
        )
        .unwrap();
        let v: serde_json::Value = serde_json::from_str(&resp).unwrap();
        assert_eq!(v["status"], 200, "upload dispatch: {resp}");
        let path = v["body"]["path"].as_str().unwrap();
        assert!(path.starts_with("assets/"), "relative path: {path}");
        let disk = state.wiki_dir().unwrap().join(path);
        assert_eq!(std::fs::read(&disk).unwrap(), payload, "bytes on disk");
        drop(tmp);
    }
}
