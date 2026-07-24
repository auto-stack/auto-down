use std::sync::Arc;

use axum::{
    extract::{Query, State},
    response::Json,
};
use regex::Regex;
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

lazy_static::lazy_static! {
    static ref TASK_MARKER_RE: Regex = Regex::new(r"^(\s*)- (TODO|DOING|DONE|NOW|LATER)\b(.*)$").unwrap();
    static ref PRIORITY_RE: Regex = Regex::new(r"\[#([ABC])\]").unwrap();
    static ref SCHEDULED_RE: Regex = Regex::new(r"^(\s*)(SCHEDULED|DEADLINE):\s*<([^>]+)>\s*$").unwrap();
}

pub fn parse_tasks(page_path: &str, title: &str, text: &str) -> Vec<TaskItem> {
    let body = crate::parser::split_frontmatter(text).1;
    let lines: Vec<&str> = body.lines().collect();
    let mut tasks = Vec::new();
    let mut i = 0;
    while i < lines.len() {
        let line = lines[i];
        if let Some(cap) = TASK_MARKER_RE.captures(line) {
            let indent = cap[1].len();
            let marker = cap[2].to_string();
            let rest = cap[3].to_string();
            let priority = PRIORITY_RE.captures(&rest).and_then(|c| c.get(1).map(|m| m.as_str().to_string()));
            let content = rest.trim().to_string();
            let mut scheduled: Option<String> = None;
            let mut deadline: Option<String> = None;
            // Look ahead for indented SCHEDULED/DEADLINE lines.
            let mut j = i + 1;
            while j < lines.len() {
                let next = lines[j];
                let next_indent = next.len() - next.trim_start().len();
                if next.trim().is_empty() || next_indent <= indent {
                    break;
                }
                if let Some(s_cap) = SCHEDULED_RE.captures(next) {
                    let keyword = s_cap[2].to_string();
                    let value = s_cap[3].to_string();
                    if keyword == "SCHEDULED" {
                        scheduled = Some(value);
                    } else {
                        deadline = Some(value);
                    }
                }
                j += 1;
            }
            tasks.push(TaskItem {
                page_path: page_path.to_string(),
                title: title.to_string(),
                line: i,
                raw: line.to_string(),
                marker,
                priority,
                content: strip_marker_and_priority(&content),
                scheduled,
                deadline,
            });
        }
        i += 1;
    }
    tasks
}

fn strip_marker_and_priority(content: &str) -> String {
    let s = PRIORITY_RE.replace(content, "").into_owned();
    s.trim().to_string()
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

pub async fn get_tasks(State(state): State<Arc<AppState>>) -> Result<Json<TasksResponse>, String> {
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
) -> Result<Json<AgendaResponse>, String> {
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
