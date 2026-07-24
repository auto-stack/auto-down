use std::collections::HashMap;
use std::path::Path;
use std::sync::Arc;

use axum::{
    extract::{Json as AxumJson, Query, State},
    response::Json,
};
use regex::Regex;
use serde::{Deserialize, Serialize};

use crate::block::Block;
use crate::state::AppState;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Card {
    pub page_path: String,
    pub block_id: String,
    pub uuid: String,
    pub raw: String,
    pub question: String,
    pub answer: String,
    pub deck: Option<String>,
    pub ease_factor: f64,
    pub repeats: u32,
    pub last_interval: f64,
    pub next_schedule: Option<String>,
    pub last_score: Option<u8>,
    pub last_reviewed: Option<String>,
}

lazy_static::lazy_static! {
    static ref CARD_TAG_RE: Regex = Regex::new(r"#card\b|\[\[card\]\]").unwrap();
    static ref CLOZE_RE: Regex = Regex::new(r"\{\{cloze\s+(.*?)\s*\\\s*(.*?)\}\}").unwrap();
    static ref PROPERTY_RE: Regex = Regex::new(r"^\s*([a-zA-Z_][a-zA-Z0-9_\-]*)::\s*(.*)$").unwrap();
}

fn today_string() -> String {
    chrono::Local::now().date_naive().to_string()
}

fn parse_date(s: &str) -> Option<chrono::NaiveDate> {
    chrono::NaiveDate::parse_from_str(s, "%Y-%m-%d").ok()
}

pub fn extract_cards(page_path: &str, text: &str, blocks: &[Block]) -> Vec<Card> {
    let mut cards = Vec::new();
    for block in blocks {
        let content = block.content.as_str();
        if !CARD_TAG_RE.is_match(content) && !CLOZE_RE.is_match(content) {
            continue;
        }
        let block_id = match &block.block_id {
            Some(id) => id.clone(),
            None => continue,
        };
        let (question, answer) = build_qa(content);
        let props = parse_block_properties(text, block.line_start, block.line_end);
        let ease_factor = props
            .get("card-ease-factor")
            .and_then(|v| v.parse().ok())
            .unwrap_or(2.5);
        let repeats = props
            .get("card-repeats")
            .and_then(|v| v.parse().ok())
            .unwrap_or(0);
        let last_interval = props
            .get("card-last-interval")
            .and_then(|v| v.parse().ok())
            .unwrap_or(0.0);
        let next_schedule = props.get("card-next-schedule").cloned();
        let last_score = props.get("card-last-score").and_then(|v| v.parse().ok());
        let last_reviewed = props.get("card-last-reviewed").cloned();
        cards.push(Card {
            page_path: page_path.to_string(),
            block_id,
            uuid: block.uuid.clone(),
            raw: content.to_string(),
            question,
            answer,
            deck: props.get("deck").cloned(),
            ease_factor,
            repeats,
            last_interval,
            next_schedule,
            last_score,
            last_reviewed,
        });
    }
    cards
}

fn build_qa(content: &str) -> (String, String) {
    let mut question = content.to_string();
    let mut answer = content.to_string();
    for cap in CLOZE_RE.captures_iter(content) {
        let answer_text = cap[1].trim().to_string();
        let hint = cap[2].trim().to_string();
        let full = cap[0].to_string();
        question = question.replace(&full, &format!("{{{{{}}}}}", hint));
        answer = answer.replace(&full, &format!("**{}**", answer_text));
    }
    question = CARD_TAG_RE.replace_all(&question, "").trim().to_string();
    answer = CARD_TAG_RE.replace_all(&answer, "").trim().to_string();
    (question, answer)
}

fn parse_block_properties(text: &str, line_start: usize, line_end: usize) -> HashMap<String, String> {
    let mut props = HashMap::new();
    let lines: Vec<&str> = text.lines().collect();
    for i in line_start..line_end {
        if i >= lines.len() {
            break;
        }
        let line = lines[i];
        if let Some(cap) = PROPERTY_RE.captures(line) {
            props.insert(cap[1].to_string(), cap[2].trim().to_string());
        }
    }
    props
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OfMatrix {
    pub matrix: Vec<Vec<f64>>,
}

impl OfMatrix {
    pub fn load(path: &Path) -> Self {
        std::fs::read_to_string(path)
            .ok()
            .and_then(|s| parse_edn_matrix(&s))
            .unwrap_or_else(|| Self::default())
    }

    pub fn save(&self, path: &Path) -> std::io::Result<()> {
        let mut out = String::new();
        out.push_str("{:matrix [\n");
        for row in &self.matrix {
            out.push_str("  [");
            for (i, v) in row.iter().enumerate() {
                if i > 0 {
                    out.push(' ');
                }
                out.push_str(&format!("{:.3}", v));
            }
            out.push_str("]\n");
        }
        out.push_str("]}\n");
        std::fs::write(path, out)
    }

    pub fn factor(&self, repetition: usize, grade: u8) -> f64 {
        self.matrix
            .get(repetition.min(4))
            .and_then(|row| row.get((grade.saturating_sub(1) as usize).min(4)))
            .copied()
            .unwrap_or(2.5)
    }

    pub fn update(&mut self, repetition: usize, grade: u8, requested: f64) {
        let rep = repetition.min(4);
        let gr = (grade.saturating_sub(1) as usize).min(4);
        if self.matrix.is_empty() {
            self.matrix = vec![vec![2.5; 5]; 5];
        }
        if self.matrix.len() <= rep {
            self.matrix.resize_with(rep + 1, || vec![2.5; 5]);
        }
        let row = &mut self.matrix[rep];
        if row.len() <= gr {
            row.resize(gr + 1, 2.5);
        }
        let current = row[gr];
        let modifier = match grade {
            1 => -0.30,
            2 => -0.15,
            3 => 0.0,
            4 => 0.10,
            _ => 0.0,
        };
        let change = (requested - current) * 0.1 + modifier;
        row[gr] = (current + change).clamp(1.3, 3.0);
    }
}

fn parse_edn_matrix(text: &str) -> Option<OfMatrix> {
    // Very permissive parser for {:matrix [[a b ...] ...]}.
    let start = text.find("[[")?;
    let end = text.rfind("]]")?;
    let inner = &text[start + 2..end];
    let mut matrix: Vec<Vec<f64>> = Vec::new();
    for line in inner.lines() {
        let trimmed = line.trim().trim_start_matches('[').trim_end_matches(']').trim();
        if trimmed.is_empty() {
            continue;
        }
        let row: Vec<f64> = trimmed
            .split_whitespace()
            .filter_map(|s| s.parse().ok())
            .collect();
        if !row.is_empty() {
            matrix.push(row);
        }
    }
    if matrix.is_empty() {
        None
    } else {
        Some(OfMatrix { matrix })
    }
}

impl Default for OfMatrix {
    fn default() -> Self {
        Self {
            matrix: vec![vec![2.5; 5]; 5],
        }
    }
}

pub fn schedule(card: &Card, grade: u8, matrix: &mut OfMatrix) -> HashMap<String, String> {
    let mut props = HashMap::new();
    let grade = grade.clamp(1, 4);
    let mut repeats = card.repeats;
    let mut interval = card.last_interval;
    let mut ease_factor = card.ease_factor;

    if grade == 1 {
        repeats = 0;
        interval = 0.0;
    } else {
        repeats += 1;
        if repeats == 1 {
            interval = 1.0;
        } else if repeats == 2 {
            interval = 6.0;
        } else {
            let factor = matrix.factor((repeats as usize).min(4), grade);
            interval = (interval * factor).max(ease_factor);
        }
    }

    // Update EF using SM-2 formula as a proxy for item easiness.
    let q = 5.0 - grade as f64;
    ease_factor = (ease_factor + (0.1 - q * (0.08 + q * 0.02))).max(1.3);
    matrix.update((repeats as usize).min(4), grade, interval);

    let next_date = chrono::Local::now().date_naive() + chrono::Duration::days(interval.max(1.0) as i64);

    props.insert("card-ease-factor".to_string(), format!("{:.2}", ease_factor));
    props.insert("card-repeats".to_string(), repeats.to_string());
    props.insert("card-last-interval".to_string(), format!("{:.1}", interval));
    props.insert("card-next-schedule".to_string(), next_date.to_string());

    props.insert("card-last-score".to_string(), grade.to_string());
    props.insert("card-last-reviewed".to_string(), today_string());
    props
}

pub fn scan_wiki_cards(wiki: &Path) -> Vec<Card> {
    let mut cards = Vec::new();
    let entries = match walkdir::WalkDir::new(wiki).into_iter().collect::<Result<Vec<_>, _>>() {
        Ok(e) => e,
        Err(_) => return cards,
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
        cards.extend(extract_cards(&rel, &text, &parsed.blocks));
    }
    cards
}

#[derive(Serialize)]
pub struct CardsResponse {
    pub cards: Vec<Card>,
}

#[derive(Deserialize)]
pub struct DueQuery {
    #[serde(default = "default_limit")]
    pub limit: usize,
}

fn default_limit() -> usize {
    50
}

pub async fn get_due_cards(
    State(state): State<Arc<AppState>>,
    Query(q): Query<DueQuery>,
) -> Result<Json<CardsResponse>, String> {
    let wiki = state.wiki_dir().ok_or("No workspace open")?;
    let today = chrono::Local::now().date_naive();
    let mut cards: Vec<Card> = scan_wiki_cards(&wiki)
        .into_iter()
        .filter(|c| {
            c.next_schedule
                .as_ref()
                .and_then(|s| parse_date(s))
                .map(|d| d <= today)
                .unwrap_or(true)
        })
        .collect();
    cards.truncate(q.limit);
    Ok(Json(CardsResponse { cards }))
}

#[derive(Deserialize)]
pub struct ReviewRequest {
    pub page_path: String,
    pub block_id: String,
    pub grade: u8,
}

#[derive(Serialize)]
pub struct ReviewResponse {
    pub card: Card,
}

pub async fn review_card(
    State(state): State<Arc<AppState>>,
    AxumJson(req): AxumJson<ReviewRequest>,
) -> Result<Json<ReviewResponse>, String> {
    let wiki = state.wiki_dir().ok_or("No workspace open")?;
    let path = state.resolve_wiki_path(&req.page_path).ok_or("Invalid path")?;
    let text = std::fs::read_to_string(&path).map_err(|e| format!("Failed to read file: {e}"))?;
    let mut lines: Vec<String> = text.lines().map(|s| s.to_string()).collect();

    // Find the block line by its ^block_id anchor.
    let anchor = format!("^{}", req.block_id);
    let block_line = lines
        .iter()
        .position(|l| l.trim_end().ends_with(&anchor))
        .ok_or("Block not found")?;
    let block_indent = lines[block_line].len() - lines[block_line].trim_start().len();

    // Load or create the OF matrix.
    let matrix_path = wiki.join("jade-garden-srs-of-matrix.edn");
    let mut matrix = OfMatrix::load(&matrix_path);

    // Build a minimal Card from the block content and existing properties.
    let parsed = crate::parser::parse_page(&text);
    let block = parsed
        .blocks
        .iter()
        .find(|b| b.block_id.as_deref() == Some(&req.block_id))
        .ok_or("Block not found in parser")?;
    let props = parse_block_properties(&text, block.line_start, block.line_end);
    let ease_factor = props.get("card-ease-factor").and_then(|v| v.parse().ok()).unwrap_or(2.5);
    let repeats = props.get("card-repeats").and_then(|v| v.parse().ok()).unwrap_or(0);
    let last_interval = props.get("card-last-interval").and_then(|v| v.parse().ok()).unwrap_or(0.0);
    let next_schedule = props.get("card-next-schedule").cloned();
    let last_score = props.get("card-last-score").and_then(|v| v.parse().ok());
    let last_reviewed = props.get("card-last-reviewed").cloned();

    let card = Card {
        page_path: req.page_path.clone(),
        block_id: req.block_id.clone(),
        uuid: block.uuid.clone(),
        raw: block.content.clone(),
        question: String::new(),
        answer: String::new(),
        deck: props.get("deck").cloned(),
        ease_factor,
        repeats,
        last_interval,
        next_schedule,
        last_score,
        last_reviewed,
    };

    let new_props = schedule(&card, req.grade, &mut matrix);

    // Remove old property lines for the keys we are updating.
    let end_line = (block_line + 1..lines.len())
        .find(|i| {
            let line = &lines[*i];
            let indent = line.len() - line.trim_start().len();
            line.trim().is_empty() || indent <= block_indent
        })
        .unwrap_or(lines.len());
    let mut remove: Vec<usize> = Vec::new();
    for i in block_line + 1..end_line {
        if let Some(cap) = PROPERTY_RE.captures(&lines[i]) {
            if new_props.contains_key(&cap[1]) {
                remove.push(i);
            }
        }
    }
    for i in remove.into_iter().rev() {
        lines.remove(i);
    }

    // Insert updated properties after the block line, indented.
    let indent = " ".repeat(block_indent + 2);
    let mut insert_lines: Vec<String> = new_props
        .iter()
        .map(|(k, v)| format!("{}{}:: {}", indent, k, v))
        .collect();
    insert_lines.sort();
    let insert_pos = block_line + 1;
    for (i, line) in insert_lines.into_iter().enumerate() {
        lines.insert(insert_pos + i, line);
    }

    // Write back preserving original line endings.
    std::fs::write(&path, lines.join("\n")).map_err(|e| format!("Failed to write file: {e}"))?;
    matrix.save(&matrix_path).map_err(|e| format!("Failed to save matrix: {e}"))?;

    // Re-read the updated card.
    let updated_text = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let updated_parsed = crate::parser::parse_page(&updated_text);
    let updated_block = updated_parsed
        .blocks
        .iter()
        .find(|b| b.block_id.as_deref() == Some(&req.block_id))
        .ok_or("Block not found after update")?;
    let (question, answer) = build_qa(&updated_block.content);
    let updated_props = parse_block_properties(&updated_text, updated_block.line_start, updated_block.line_end);

    Ok(Json(ReviewResponse {
        card: Card {
            page_path: req.page_path,
            block_id: req.block_id,
            uuid: updated_block.uuid.clone(),
            raw: updated_block.content.clone(),
            question,
            answer,
            deck: updated_props.get("deck").cloned(),
            ease_factor: updated_props.get("card-ease-factor").and_then(|v| v.parse().ok()).unwrap_or(2.5),
            repeats: updated_props.get("card-repeats").and_then(|v| v.parse().ok()).unwrap_or(0),
            last_interval: updated_props.get("card-last-interval").and_then(|v| v.parse().ok()).unwrap_or(0.0),
            next_schedule: updated_props.get("card-next-schedule").cloned(),
            last_score: updated_props.get("card-last-score").and_then(|v| v.parse().ok()),
            last_reviewed: updated_props.get("card-last-reviewed").cloned(),
        },
    }))
}
