use std::sync::Arc;

use axum::{
    extract::{Query, State},
    response::Json,
};
use serde::{Deserialize, Serialize};

use crate::state::AppState;
use crate::tasks::{scan_wiki_tasks, TaskItem};
use crate::query_gen;

#[derive(Deserialize)]
pub struct QueryRequest {
    pub q: String,
}

#[derive(Serialize)]
pub struct QueryResponse {
    pub results: Vec<TaskItem>,
}

pub async fn query(
    State(state): State<Arc<AppState>>,
    Query(req): Query<QueryRequest>,
) -> Result<Json<QueryResponse>, crate::error::ApiError> {
    let wiki = state.wiki_dir().ok_or("No workspace open")?;
    let tasks = scan_wiki_tasks(&wiki);
    let today_iso = chrono::Local::now().date_naive().to_string();
    let mut results = Vec::new();
    for t in tasks {
        let qt = query_gen::QueryTask {
            title: t.title.clone(),
            content: t.content.clone(),
            marker: t.marker.clone(),
            priority: t.priority.clone().unwrap_or_default(),
            scheduled: t.scheduled.clone().unwrap_or_default(),
            deadline: t.deadline.clone().unwrap_or_default(),
        };
        let out = query_gen::evalQuery(&req.q, qt, &today_iso);
        if !out.ok {
            return Err(crate::error::ApiError::bad_request(format!(
                "Parse error: {}",
                out.err
            )));
        }
        if out.value {
            results.push(t);
        }
    }
    Ok(Json(QueryResponse { results }))
}

#[cfg(test)]
mod query_gen_parity {
    // Cross-language parity with the TS twin (../../auto/tests/query-parity.mjs).
    use serde::Deserialize;

    #[derive(Deserialize)]
    struct FixtureTask {
        title: String,
        content: String,
        marker: String,
        priority: String,
        scheduled: String,
        deadline: String,
    }

    #[derive(Deserialize)]
    struct FixtureCase {
        query: String,
        task: FixtureTask,
        today: String,
        value: bool,
        err: String,
    }

    #[test]
    fn query_gen_parity_fixtures() {
        let fixtures: serde_json::Value = serde_json::from_str(
            include_str!("../../auto/tests/query-fixtures.json"),
        )
        .unwrap();
        for case in fixtures["cases"].as_array().unwrap() {
            let ft = &case["task"];
            let qt = crate::query_gen::QueryTask {
                title: ft["title"].as_str().unwrap().to_string(),
                content: ft["content"].as_str().unwrap().to_string(),
                marker: ft["marker"].as_str().unwrap().to_string(),
                priority: ft["priority"].as_str().unwrap().to_string(),
                scheduled: ft["scheduled"].as_str().unwrap().to_string(),
                deadline: ft["deadline"].as_str().unwrap().to_string(),
            };
            let out = crate::query_gen::evalQuery(
                case["query"].as_str().unwrap(),
                qt,
                case["today"].as_str().unwrap(),
            );
            let name = case["query"].as_str().unwrap();
            let want_err = case["err"].as_str().unwrap();
            assert_eq!(out.ok, want_err.is_empty(), "case `{name}`: ok flag");
            if want_err.is_empty() {
                assert_eq!(out.value, case["value"].as_bool().unwrap(), "case `{name}`: value");
            } else {
                assert!(out.err.contains(want_err), "case `{name}`: err {:?}", out.err);
            }
        }
    }
}
