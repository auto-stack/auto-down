use std::sync::Arc;

use axum::{
    extract::{Query, State},
    response::Json,
};
use serde::{Deserialize, Serialize};

use crate::state::AppState;
use crate::tasks::{parse_task_date, scan_wiki_tasks, TaskItem};

#[derive(Deserialize)]
pub struct QueryRequest {
    pub q: String,
}

#[derive(Serialize)]
pub struct QueryResponse {
    pub results: Vec<TaskItem>,
}

#[derive(Debug, Clone)]
enum Expr {
    PageRef(String),
    Tag(String),
    Task(Vec<String>),
    Priority(Vec<String>),
    Between(i64, i64), // days relative to today
    Property(String, String),
    And(Vec<Expr>),
    Or(Vec<Expr>),
    Not(Box<Expr>),
}

pub async fn query(
    State(state): State<Arc<AppState>>,
    Query(req): Query<QueryRequest>,
) -> Result<Json<QueryResponse>, String> {
    let wiki = state.wiki_dir().ok_or("No workspace open")?;
    let tasks = scan_wiki_tasks(&wiki);
    let expr = parse_expr(&req.q).map_err(|e| format!("Parse error: {e}"))?;
    let today = chrono::Local::now().date_naive();
    let results = tasks.into_iter().filter(|t| eval(&expr, t, today)).collect();
    Ok(Json(QueryResponse { results }))
}

fn parse_expr(input: &str) -> Result<Expr, String> {
    let trimmed = input.trim();
    // Accept either the raw DSL or wrapped in {{query ...}}.
    let trimmed = trimmed
        .strip_prefix("{{")
        .and_then(|s| s.strip_suffix("}}"))
        .unwrap_or(trimmed)
        .trim();
    let trimmed = trimmed.strip_prefix("query").unwrap_or(trimmed).trim();
    let trimmed = trim_outer_braces(trimmed);
    if trimmed.is_empty() {
        return Err("empty query".to_string());
    }

    // (and ...)
    if let Some(rest) = trimmed.strip_prefix("and ") {
        return Ok(Expr::And(parse_list(rest)?));
    }
    if let Some(rest) = trimmed.strip_prefix("or ") {
        return Ok(Expr::Or(parse_list(rest)?));
    }
    if let Some(rest) = trimmed.strip_prefix("not ") {
        return Ok(Expr::Not(Box::new(parse_expr(rest)?)));
    }
    if let Some(rest) = trimmed.strip_prefix("task ") {
        let markers = rest.split_whitespace().map(|s| s.to_uppercase()).collect();
        return Ok(Expr::Task(markers));
    }
    if let Some(rest) = trimmed.strip_prefix("priority ") {
        let priorities: Vec<String> = rest.split_whitespace().map(|s| s.to_uppercase()).collect();
        return Ok(Expr::Priority(priorities));
    }
    if let Some(rest) = trimmed.strip_prefix("between ") {
        let parts: Vec<&str> = rest.split_whitespace().collect();
        if parts.len() != 2 {
            return Err("between expects two offsets".to_string());
        }
        let start = parse_offset(parts[0])?;
        let end = parse_offset(parts[1])?;
        return Ok(Expr::Between(start, end));
    }
    if let Some(rest) = trimmed.strip_prefix("property ") {
        let parts: Vec<&str> = rest.splitn(2, ' ').collect();
        if parts.len() != 2 {
            return Err("property expects key and value".to_string());
        }
        return Ok(Expr::Property(parts[0].to_string(), parts[1].to_string()));
    }
    if let Some(inner) = trimmed.strip_prefix("[[").and_then(|s| s.strip_suffix("]]")) {
        return Ok(Expr::PageRef(inner.to_string()));
    }
    if let Some(inner) = trimmed.strip_prefix("#") {
        return Ok(Expr::Tag(inner.to_string()));
    }
    Err(format!("Unknown query: {trimmed}"))
}

fn trim_outer_braces(s: &str) -> &str {
    let mut s = s.trim();
    while s.starts_with('(') && s.ends_with(')') {
        let inner = &s[1..s.len() - 1].trim();
        s = inner;
    }
    s
}

fn parse_list(input: &str) -> Result<Vec<Expr>, String> {
    let mut exprs = Vec::new();
    let mut depth = 0;
    let mut start = 0;
    let chars: Vec<char> = input.chars().collect();
    for (i, c) in chars.iter().enumerate() {
        match c {
            '(' => depth += 1,
            ')' => depth -= 1,
            ' ' if depth == 0 => {
                if i > start {
                    exprs.push(parse_expr(&input[start..i])?);
                }
                start = i + 1;
            }
            _ => {}
        }
    }
    if start < input.len() {
        exprs.push(parse_expr(&input[start..])?);
    }
    Ok(exprs)
}

fn parse_offset(s: &str) -> Result<i64, String> {
    let s = s.trim();
    if s == "today" {
        return Ok(0);
    }
    let num: String = s.chars().take_while(|c| c.is_ascii_digit() || *c == '-').collect();
    let unit = s.chars().skip_while(|c| c.is_ascii_digit() || *c == '-').collect::<String>();
    let n: i64 = num.parse().map_err(|_| format!("Invalid offset number: {s}"))?;
    match unit.as_str() {
        "d" => Ok(n),
        "w" => Ok(n * 7),
        "m" => Ok(n * 30),
        "y" => Ok(n * 365),
        _ => Err(format!("Invalid offset unit: {s}")),
    }
}

fn eval(expr: &Expr, task: &TaskItem, today: chrono::NaiveDate) -> bool {
    match expr {
        Expr::PageRef(title) => {
            task.title.to_lowercase() == title.to_lowercase()
                || task.content.to_lowercase().contains(&title.to_lowercase())
        }
        Expr::Tag(tag) => {
            task.content.to_lowercase().contains(&format!("#{}", tag.to_lowercase()))
                || task.content.to_lowercase().contains(&format!("[[{}]]", tag))
        }
        Expr::Task(markers) => markers.iter().any(|m| task.marker.eq_ignore_ascii_case(m)),
        Expr::Priority(priorities) => task
            .priority
            .as_ref()
            .map(|p| priorities.iter().any(|x| x.eq_ignore_ascii_case(p)))
            .unwrap_or(false),
        Expr::Between(start, end) => {
            let start_date = today + chrono::Duration::days(*start);
            let end_date = today + chrono::Duration::days(*end);
            [task.scheduled.as_ref(), task.deadline.as_ref()]
                .into_iter()
                .flatten()
                .filter_map(|raw| parse_task_date(raw))
                .any(|d| d >= start_date && d <= end_date)
        }
        Expr::Property(_key, _value) => false, // Not implemented yet.
        Expr::And(exprs) => exprs.iter().all(|e| eval(e, task, today)),
        Expr::Or(exprs) => exprs.iter().any(|e| eval(e, task, today)),
        Expr::Not(e) => !eval(e, task, today),
    }
}
