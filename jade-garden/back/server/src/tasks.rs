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

/// Normalize a date token like "2026-07-01 Wed" / "2026-7-1" to the strict
/// "YYYY-MM-DD" group-key form (validation + calendar logic in
/// back/auto/agenda.at); "" = invalid.
pub fn parse_task_date(raw: &str) -> Option<String> {
    let d = crate::agenda_gen::normalizeDate(raw);
    (!d.is_empty()).then_some(d)
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
    // Wall clock stays shell-side (chrono); validation/normalization and the
    // window grouping live in back/auto/agenda.at. Normalized keys compare
    // lexically == chronologically.
    let today = chrono::Local::now().date_naive();
    let end = today + chrono::Duration::days(q.days);
    let refs: Vec<crate::agenda_gen::AgTaskRef> = tasks
        .iter()
        .enumerate()
        .map(|(i, t)| crate::agenda_gen::AgTaskRef {
            scheduled: t.scheduled.clone().unwrap_or_default(),
            deadline: t.deadline.clone().unwrap_or_default(),
            index: i as i64,
        })
        .collect();
    let groups = crate::agenda_gen::groupAgenda(refs, &today.to_string(), &end.to_string());

    let groups = groups
        .into_iter()
        .map(|g| AgendaGroup {
            date: g.date,
            tasks: g
                .indexes
                .into_iter()
                .map(|i| tasks[i as usize].clone())
                .collect(),
        })
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

#[cfg(test)]
mod agenda_gen_parity {
    use super::*;

    // Cross-language parity with the TS twin (../../auto/tests/agenda-parity.mjs).

    #[test]
    fn normalize_date_parity_fixtures() {
        let fixtures: serde_json::Value = serde_json::from_str(
            include_str!("../../auto/tests/agenda-fixtures.json"),
        )
        .unwrap();
        for d in fixtures["dates"].as_array().unwrap() {
            assert_eq!(
                crate::agenda_gen::normalizeDate(d["raw"].as_str().unwrap()),
                d["out"].as_str().unwrap(),
                "raw {:?}",
                d["raw"]
            );
        }
    }

    #[test]
    fn group_agenda_parity_fixtures() {
        let fixtures: serde_json::Value = serde_json::from_str(
            include_str!("../../auto/tests/agenda-fixtures.json"),
        )
        .unwrap();
        for g in fixtures["groups"].as_array().unwrap() {
            let entries: Vec<crate::agenda_gen::AgTaskRef> = g["entries"]
                .as_array()
                .unwrap()
                .iter()
                .map(|e| crate::agenda_gen::AgTaskRef {
                    scheduled: e["scheduled"].as_str().unwrap().to_string(),
                    deadline: e["deadline"].as_str().unwrap().to_string(),
                    index: e["index"].as_i64().unwrap(),
                })
                .collect();
            let groups = crate::agenda_gen::groupAgenda(
                entries,
                g["today"].as_str().unwrap(),
                g["end"].as_str().unwrap(),
            );
            let expected = g["expected"].as_array().unwrap();
            assert_eq!(groups.len(), expected.len(), "{}", g["name"].as_str().unwrap());
            for (grp, e) in groups.iter().zip(expected.iter()) {
                assert_eq!(grp.date, e["date"].as_str().unwrap());
                let idx: Vec<i64> = grp.indexes.clone();
                let exp: Vec<i64> = e["indexes"]
                    .as_array()
                    .unwrap()
                    .iter()
                    .map(|v| v.as_i64().unwrap())
                    .collect();
                assert_eq!(idx, exp, "date {}", grp.date);
            }
        }
    }
}
