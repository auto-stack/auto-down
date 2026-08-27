use std::sync::Arc;

use axum::{
    extract::{Query, State},
    response::Json,
};
use serde::{Deserialize, Serialize};

use crate::state::AppState;
use std::path::Path;

#[derive(Debug, Clone, Serialize)]
pub struct TaskItem {
    pub page_path: String,
    pub title: String,
    pub line: usize,
    pub raw: String,
    pub marker: String,
    pub priority: Option<String>,
    pub content: String,
    pub scheduled: Option<String>,
    pub deadline: Option<String>,
}

/// Parse a page's task lines via the generated scanner (back/auto/tasks.at).
/// Shell owns: frontmatter split, uuid stamping, Option mapping.
pub fn parse_tasks(page_path: &str, title: &str, text: &str) -> Vec<TaskItem> {
    let body = crate::parser::split_frontmatter(text).1;
    let lines: Vec<&str> = body.lines().collect();
    crate::tasks_gen::parseTasksLines(page_path, title, lines.iter().map(|l| l.to_string()).collect())
        .into_iter()
        .map(|it| TaskItem {
            page_path: it.pagePath,
            title: it.title,
            line: it.line as usize,
            raw: it.raw,
            marker: it.marker,
            priority: opt_string(it.priority),
            content: it.content,
            scheduled: opt_string(it.scheduled),
            deadline: opt_string(it.deadline),
        })
        .collect()
}

fn opt_string(s: String) -> Option<String> {
    (!s.is_empty()).then_some(s)
}

pub fn scan_wiki_tasks(wiki: &Path) -> Vec<TaskItem> {
    let mut tasks = Vec::new();
    let entries = match walkdir::WalkDir::new(wiki).into_iter().collect::<Result<Vec<_>, _>>() {
        Ok(e) => e,
        Err(_) => return tasks,
    };
    for entry in entries {
        let path = entry.path();
        if !path.extension().map(|e| e == "ad").unwrap_or(false) {
            continue;
        }
        let text = match std::fs::read_to_string(path) {
            Ok(t) => t,
            Err(_) => continue,
        };
        let rel = path.strip_prefix(wiki).unwrap_or(path).to_string_lossy().replace('\\', "/");
        let parsed = crate::parser::parse_page(&text);
        let title = parsed.frontmatter.get("title").and_then(|v| v.as_str()).unwrap_or("").to_string();
        tasks.extend(parse_tasks(&rel, &title, &text));
    }
    tasks
}

/// Parse a date token like "2026-07-01 Wed" or "2026-07-01".
pub fn parse_task_date(raw: &str) -> Option<chrono::NaiveDate> {
    let date_part = raw.split_whitespace().next()?;
    chrono::NaiveDate::parse_from_str(date_part, "%Y-%m-%d").ok()
}

#[derive(Serialize)]
pub struct TasksResponse {
    pub tasks: Vec<TaskItem>,
}

pub async fn get_tasks(State(state): State<Arc<AppState>>) -> Result<Json<TasksResponse>, crate::error::ApiError> {
    let wiki = state.wiki_dir().ok_or("No workspace open")?;
    let tasks = scan_wiki_tasks(&wiki);
    Ok(Json(TasksResponse { tasks }))
}

#[derive(Deserialize)]
pub struct AgendaQuery {
    #[serde(default = "default_days")]
    pub days: i64,
}

fn default_days() -> i64 {
    14
}

#[derive(Serialize)]
pub struct AgendaGroup {
    pub date: String,
    pub tasks: Vec<TaskItem>,
}

#[derive(Serialize)]
pub struct AgendaResponse {
    pub groups: Vec<AgendaGroup>,
}

pub async fn get_agenda(
    State(state): State<Arc<AppState>>,
    Query(q): Query<AgendaQuery>,
) -> Result<Json<AgendaResponse>, crate::error::ApiError> {
    let wiki = state.wiki_dir().ok_or("No workspace open")?;
    let tasks = scan_wiki_tasks(&wiki);
    let today = chrono::Local::now().date_naive();
    let end = today + chrono::Duration::days(q.days);

    let mut map: std::collections::BTreeMap<String, Vec<TaskItem>> = std::collections::BTreeMap::new();
    for task in tasks {
        let dates: Vec<String> = [task.scheduled.as_ref(), task.deadline.as_ref()]
            .into_iter()
            .flatten()
            .cloned()
            .collect();
        for raw in dates {
            if let Some(date) = parse_task_date(&raw) {
                if date >= today && date <= end {
                    map.entry(date.to_string()).or_default().push(task.clone());
                }
            }
        }
    }

    let groups = map
        .into_iter()
        .map(|(date, tasks)| AgendaGroup { date, tasks })
        .collect();
    Ok(Json(AgendaResponse { groups }))
}

#[cfg(test)]
mod tasks_gen_parity {
    use super::*;

    // Cross-language parity with the TS twin (../../auto/tests/tasks-parity.mjs).

    #[test]
    fn parse_tasks_parity_fixtures() {
        let fixtures: serde_json::Value = serde_json::from_str(
            include_str!("../../auto/tests/tasks-fixtures.json"),
        )
        .unwrap();
        for page in fixtures["pages"].as_array().unwrap() {
            let page_path = page["pagePath"].as_str().unwrap();
            let title = page["title"].as_str().unwrap();
            let text = page["lines"]
                .as_array()
                .unwrap()
                .iter()
                .map(|v| v.as_str().unwrap())
                .collect::<Vec<_>>()
                .join("\n");
            let items = parse_tasks(page_path, title, &text);
            let expected = page["expected"].as_array().unwrap();
            assert_eq!(items.len(), expected.len(), "page `{page_path}`: task count");
            for (it, e) in items.iter().zip(expected.iter()) {
                assert_eq!(it.marker, e["marker"].as_str().unwrap(), "page `{page_path}` marker");
                assert_eq!(
                    it.priority.as_deref().unwrap_or(""),
                    e["priority"].as_str().unwrap(),
                    "page `{page_path}` priority"
                );
                assert_eq!(it.content, e["content"].as_str().unwrap(), "page `{page_path}` content");
                assert_eq!(
                    it.scheduled.as_deref().unwrap_or(""),
                    e["scheduled"].as_str().unwrap(),
                    "page `{page_path}` scheduled"
                );
                assert_eq!(
                    it.deadline.as_deref().unwrap_or(""),
                    e["deadline"].as_str().unwrap(),
                    "page `{page_path}` deadline"
                );
                assert_eq!(it.line as i64, e["line"].as_i64().unwrap(), "page `{page_path}` line");
            }
        }
    }
}
