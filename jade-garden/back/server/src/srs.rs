use std::collections::HashMap;
use std::path::Path;
use std::sync::Arc;

use axum::{
    extract::{Json as AxumJson, Query, State},
    response::Json,
};
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

fn today_string() -> String {
    chrono::Local::now().date_naive().to_string()
}

fn parse_date(s: &str) -> Option<chrono::NaiveDate> {
    chrono::NaiveDate::parse_from_str(s, "%Y-%m-%d").ok()
}

/// Numeric card fields cross the .at boundary as raw property text; parse
/// them here (a2r cannot lower str<->float for the rust target). "" or an
/// unparsable value falls back to the historical defaults.
fn parse_f64_or(s: &str, dflt: f64) -> f64 {
    s.parse::<f64>().unwrap_or(dflt)
}

pub fn extract_cards(page_path: &str, text: &str, blocks: &[Block]) -> Vec<Card> {
    // Shell owns: frontmatter split, uuid stamping, numeric parsing, Option
    // mapping. Card/QA/property logic lives in back/auto/srs.at.
    let (_, body) = crate::parser::split_frontmatter(text);
    let lines: Vec<String> = body.lines().map(|l| l.to_string()).collect();
    let srs_blocks: Vec<crate::srs_gen::SrsBlock> = blocks
        .iter()
        .map(|b| crate::srs_gen::SrsBlock {
            blockId: b.block_id.clone().unwrap_or_default(),
            uuid: b.uuid.clone(),
            content: b.content.clone(),
            lineStart: b.line_start as i64,
            lineEnd: b.line_end as i64,
        })
        .collect();
    crate::srs_gen::extractCards(page_path, lines, srs_blocks)
        .into_iter()
        .map(|c| Card {
            page_path: c.pagePath,
            block_id: c.blockId,
            uuid: c.uuid,
            raw: c.raw,
            question: c.question,
            answer: c.answer,
            deck: opt_string(c.deck),
            ease_factor: parse_f64_or(&c.easeFactor, 2.5),
            repeats: c.repeats.parse().unwrap_or(0),
            last_interval: parse_f64_or(&c.lastInterval, 0.0),
            next_schedule: opt_string(c.nextSchedule),
            last_score: c.lastScore.parse().ok(),
            last_reviewed: opt_string(c.lastReviewed),
        })
        .collect()
}

fn opt_string(s: String) -> Option<String> {
    (!s.is_empty()).then_some(s)
}

/// Cloze QA construction — thin wrapper over back/auto/srs.at buildQa.
fn build_qa(content: &str) -> (String, String) {
    let qa = crate::srs_gen::buildQa(content);
    (qa.question, qa.answer)
}

/// Block property region scan — thin wrapper over back/auto/srs.at
/// parseBlockProps (frontmatter split stays shell-side).
fn parse_block_properties(text: &str, line_start: usize, line_end: usize) -> HashMap<String, String> {
    let (_, body) = crate::parser::split_frontmatter(text);
    let lines: Vec<String> = body.lines().map(|l| l.to_string()).collect();
    crate::srs_gen::parseBlockProps(lines, line_start as i64, line_end as i64)
        .into_iter()
        .map(|p| (p.key, p.value))
        .collect()
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
        crate::srs_gen::matrixFactor(self.matrix.clone(), repetition as i64, grade as i64)
    }

    pub fn update(&mut self, repetition: usize, grade: u8, requested: f64) {
        self.matrix = crate::srs_gen::matrixUpdate(
            self.matrix.clone(),
            repetition as i64,
            grade as i64,
            requested,
        );
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
    // Scheduling math lives in back/auto/srs.at (scheduleWith); the shell
    // owns wall clock + numeric formatting (a2r boundary).
    let mut props = HashMap::new();
    let grade = grade.clamp(1, 4);
    let out = crate::srs_gen::scheduleWith(
        card.ease_factor,
        card.repeats as i64,
        card.last_interval,
        grade as i64,
        matrix.matrix.clone(),
    );
    matrix.matrix = out.matrix;

    let next_date = chrono::Local::now().date_naive() + chrono::Duration::days(out.lastInterval.max(1.0) as i64);

    props.insert("card-ease-factor".to_string(), format!("{:.2}", out.easeFactor));
    props.insert("card-repeats".to_string(), out.repeats.to_string());
    props.insert("card-last-interval".to_string(), format!("{:.1}", out.lastInterval));
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

// Plan 022 Phase 3: logic core shared by the axum shell and vm_dispatch.
pub fn due_cards_impl(state: &AppState, limit: usize) -> Result<CardsResponse, crate::error::ApiError> {
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
    cards.truncate(limit);
    Ok(CardsResponse { cards })
}

pub async fn get_due_cards(
    State(state): State<Arc<AppState>>,
    Query(q): Query<DueQuery>,
) -> Result<Json<CardsResponse>, crate::error::ApiError> {
    Ok(Json(due_cards_impl(&state, q.limit)?))
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

// Plan 022 Phase 3: logic core shared by the axum shell and vm_dispatch.
pub fn review_card_impl(
    state: &AppState,
    req: ReviewRequest,
) -> Result<ReviewResponse, crate::error::ApiError> {
    let wiki = state.wiki_dir().ok_or("No workspace open")?;
    let path = state.resolve_wiki_path(&req.page_path).ok_or("Invalid path")?;
    let text = std::fs::read_to_string(&path).map_err(|e| format!("Failed to read file: {e}"))?;
    let mut lines: Vec<String> = text.lines().map(|s| s.to_string()).collect();

    // Find the block line by its ^block_id anchor (scan in back/auto/srs.at).
    let anchor = format!("^{}", req.block_id);
    let block_line = crate::srs_gen::findAnchorLine(lines.clone(), &anchor);
    let block_line = if block_line >= 0 {
        block_line as usize
    } else {
        return Err("Block not found".into());
    };
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

    // Line surgery (drop stale property lines + insert the new ones sorted)
    // lives in back/auto/srs.at applyReviewProps.
    let gen_props: Vec<crate::srs_gen::PropPair> = new_props
        .iter()
        .map(|(k, v)| crate::srs_gen::PropPair {
            key: k.clone(),
            value: v.clone(),
        })
        .collect();
    lines = crate::srs_gen::applyReviewProps(lines, block_line as i64, gen_props);

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

    Ok(ReviewResponse {
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
    })
}

pub async fn review_card(
    State(state): State<Arc<AppState>>,
    AxumJson(req): AxumJson<ReviewRequest>,
) -> Result<Json<ReviewResponse>, crate::error::ApiError> {
    Ok(Json(review_card_impl(&state, req)?))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_block_properties_reads_indented_lines_below_single_line_block() {
        // Shape written by `review_card`: single-line list item + deeper-
        // indented property lines. The parser gives the block range [0, 1),
        // so the properties are only found by scanning past line_end.
        let text = "- 法国的首都是哪里？ #card ^c1\n  card-next-schedule:: 2099-01-01\n  card-repeats:: 1\n";
        let props = parse_block_properties(text, 0, 1);
        assert_eq!(props.get("card-next-schedule").map(String::as_str), Some("2099-01-01"));
        assert_eq!(props.get("card-repeats").map(String::as_str), Some("1"));
    }

    #[test]
    fn parse_block_properties_without_property_lines_is_empty() {
        let text = "- plain block ^b1\n- next block ^b2\n";
        let props = parse_block_properties(text, 0, 1);
        assert!(props.is_empty());
    }

    #[test]
    fn parse_block_properties_stops_at_next_block() {
        // The second block's own property line must not leak into the first.
        let text = "- card one ^c1\n  deck:: french\n- card two ^c2\n  deck:: german\n";
        let props = parse_block_properties(text, 0, 1);
        assert_eq!(props.get("deck").map(String::as_str), Some("french"));
        let props2 = parse_block_properties(text, 2, 3);
        assert_eq!(props2.get("deck").map(String::as_str), Some("german"));
    }

    #[test]
    fn parse_block_properties_block_at_end_of_file() {
        // No trailing newline, property region runs to EOF.
        let text = "- card ^c1\n  card-repeats:: 3";
        let props = parse_block_properties(text, 0, 1);
        assert_eq!(props.get("card-repeats").map(String::as_str), Some("3"));
    }

    #[test]
    fn parse_block_properties_stops_at_blank_line() {
        let text = "- card ^c1\n  deck:: french\n\n  orphan:: ignored\n";
        let props = parse_block_properties(text, 0, 1);
        assert_eq!(props.get("deck").map(String::as_str), Some("french"));
        assert!(!props.contains_key("orphan"));
    }

    #[test]
    fn parse_block_properties_crlf_line_endings() {
        let text = "- card ^c1\r\n  deck:: french\r\n";
        let props = parse_block_properties(text, 0, 1);
        assert_eq!(props.get("deck").map(String::as_str), Some("french"));
    }

    #[test]
    fn parse_block_properties_with_frontmatter_offsets() {
        // parse_page strips frontmatter, so line ranges are body-relative;
        // the lookup must skip the frontmatter too.
        let text = "---\ntitle: Cards\n---\n\n- card ^c1\n  card-next-schedule:: 2099-01-01\n";
        let props = parse_block_properties(text, 0, 1);
        assert_eq!(props.get("card-next-schedule").map(String::as_str), Some("2099-01-01"));
    }

    #[test]
    fn extract_cards_reads_back_schedule_written_like_review_card() {
        // End-to-end over a frontmatter document: a card whose schedule was
        // persisted as indented property lines is not due again.
        let text = "---\ntitle: Cards\n---\n\n- Q? {{cloze Paris \\ 城市}} #card ^c1\n  card-next-schedule:: 2099-01-01\n  card-repeats:: 1\n";
        let parsed = crate::parser::parse_page(text);
        let cards = extract_cards("Cards.ad", text, &parsed.blocks);
        assert_eq!(cards.len(), 1);
        assert_eq!(cards[0].next_schedule.as_deref(), Some("2099-01-01"));
        assert_eq!(cards[0].repeats, 1);
    }

    #[test]
    fn extract_cards_unscheduled_card_stays_due() {
        let text = "- Q? #card ^c1\n";
        let parsed = crate::parser::parse_page(text);
        let cards = extract_cards("Cards.ad", text, &parsed.blocks);
        assert_eq!(cards.len(), 1);
        assert_eq!(cards[0].next_schedule, None);
    }
}


#[cfg(test)]
mod srs_gen_parity {
    use super::*;

    // Cross-language parity with the TS twin (../../auto/tests/srs-parity.mjs).

    fn default_matrix() -> Vec<Vec<f64>> {
        vec![vec![2.5; 5]; 5]
    }

    fn close(a: f64, b: f64) -> bool {
        (a - b).abs() < 1e-9
    }

    fn fixtures() -> serde_json::Value {
        serde_json::from_str(include_str!("../../auto/tests/srs-fixtures.json")).unwrap()
    }

    #[test]
    fn qa_parity_fixtures() {
        for c in fixtures()["qa"].as_array().unwrap() {
            let (q, a) = build_qa(c["content"].as_str().unwrap());
            assert_eq!(q, c["q"].as_str().unwrap(), "{}", c["name"].as_str().unwrap());
            assert_eq!(a, c["a"].as_str().unwrap(), "{}", c["name"].as_str().unwrap());
        }
    }

    #[test]
    fn props_parity_fixtures() {
        for c in fixtures()["props"].as_array().unwrap() {
            // join body lines and drive through the shell wrapper (same path
            // as production: frontmatter split happens inside)
            let text = c["lines"].as_array().unwrap().iter().map(|v| v.as_str().unwrap()).collect::<Vec<_>>().join("
");
            let props = parse_block_properties(&text, c["lineStart"].as_u64().unwrap() as usize, c["lineEnd"].as_u64().unwrap() as usize);
            let expected = c["expected"].as_object().unwrap();
            assert_eq!(props.len(), expected.len(), "{}", c["name"].as_str().unwrap());
            for (k, v) in expected {
                assert_eq!(props.get(k.as_str()).map(String::as_str), Some(v.as_str().unwrap()), "{}: {k}", c["name"].as_str().unwrap());
            }
        }
    }

    #[test]
    fn extract_parity_fixtures() {
        for c in fixtures()["extract"].as_array().unwrap() {
            let lines: Vec<String> = c["lines"].as_array().unwrap().iter().map(|v| v.as_str().unwrap().to_string()).collect();
            let blocks: Vec<crate::srs_gen::SrsBlock> = c["blocks"].as_array().unwrap().iter().map(|b| crate::srs_gen::SrsBlock {
                blockId: b["blockId"].as_str().unwrap().to_string(),
                uuid: b["uuid"].as_str().unwrap().to_string(),
                content: b["content"].as_str().unwrap().to_string(),
                lineStart: b["lineStart"].as_i64().unwrap(),
                lineEnd: b["lineEnd"].as_i64().unwrap(),
            }).collect();
            let cards: Vec<Card> = crate::srs_gen::extractCards(c["pagePath"].as_str().unwrap(), lines, blocks).into_iter().map(|c| Card {
                page_path: c.pagePath,
                block_id: c.blockId,
                uuid: c.uuid,
                raw: c.raw,
                question: c.question,
                answer: c.answer,
                deck: (!c.deck.is_empty()).then_some(c.deck),
                ease_factor: c.easeFactor.parse().unwrap_or(2.5),
                repeats: c.repeats.parse().unwrap_or(0),
                last_interval: c.lastInterval.parse().unwrap_or(0.0),
                next_schedule: (!c.nextSchedule.is_empty()).then_some(c.nextSchedule),
                last_score: c.lastScore.parse().ok(),
                last_reviewed: (!c.lastReviewed.is_empty()).then_some(c.lastReviewed),
            }).collect();
            let expected = c["expected"].as_array().unwrap();
            assert_eq!(cards.len(), expected.len(), "{}", c["name"].as_str().unwrap());
            for (card, e) in cards.iter().zip(expected.iter()) {
                assert_eq!(card.block_id, e["blockId"].as_str().unwrap(), "{}", c["name"].as_str().unwrap());
                assert_eq!(card.question, e["question"].as_str().unwrap(), "{} q", c["name"].as_str().unwrap());
                assert_eq!(card.answer, e["answer"].as_str().unwrap(), "{} a", c["name"].as_str().unwrap());
                assert_eq!(card.deck.as_deref().unwrap_or(""), e["deck"].as_str().unwrap(), "{} deck", c["name"].as_str().unwrap());
                assert_eq!(card.ease_factor.to_string(), e["easeFactor"].as_str().unwrap().parse::<f64>().unwrap_or(2.5).to_string(), "{} ease", c["name"].as_str().unwrap());
                assert_eq!(card.repeats as i64, e["repeats"].as_str().unwrap().parse::<i64>().unwrap_or(0), "{} reps", c["name"].as_str().unwrap());
                assert_eq!(card.next_schedule.as_deref().unwrap_or(""), e["nextSchedule"].as_str().unwrap(), "{} next", c["name"].as_str().unwrap());
                assert_eq!(card.last_score.map(|s| s.to_string()).unwrap_or_default(), e["lastScore"].as_str().unwrap(), "{} score", c["name"].as_str().unwrap());
                assert_eq!(card.last_reviewed.as_deref().unwrap_or(""), e["lastReviewed"].as_str().unwrap(), "{} reviewed", c["name"].as_str().unwrap());
            }
        }
    }

    #[test]
    fn matrix_factor_parity_fixtures() {
        for (i, c) in fixtures()["matrixFactor"].as_array().unwrap().iter().enumerate() {
            let matrix: Vec<Vec<f64>> = c["matrix"].as_array().unwrap().iter()
                .map(|r| r.as_array().unwrap().iter().map(|v| v.as_f64().unwrap()).collect())
                .collect();
            let out = crate::srs_gen::matrixFactor(matrix, c["rep"].as_i64().unwrap(), c["grade"].as_i64().unwrap());
            assert!(close(out, c["out"].as_f64().unwrap()), "factor #{i}: {out}");
        }
    }

    #[test]
    fn matrix_update_parity_fixtures() {
        for c in fixtures()["matrixUpdate"].as_array().unwrap() {
            let matrix: Vec<Vec<f64>> = c["matrix"].as_array().unwrap().iter()
                .map(|r| r.as_array().unwrap().iter().map(|v| v.as_f64().unwrap()).collect())
                .collect();
            let out = crate::srs_gen::matrixUpdate(matrix, c["rep"].as_i64().unwrap(), c["grade"].as_i64().unwrap(), c["requested"].as_f64().unwrap());
            assert_eq!(out.len() as i64, c["rows"].as_i64().unwrap(), "{} rows", c["name"].as_str().unwrap());
            if let Some(row0) = c["row0"].as_array() {
                let exp: Vec<f64> = row0.iter().map(|v| v.as_f64().unwrap()).collect();
                assert_eq!(out[0], exp, "{} row0", c["name"].as_str().unwrap());
            }
            let (r, g, v) = (c["row"].as_u64().unwrap() as usize, c["col"].as_u64().unwrap() as usize, c["cell"].as_f64().unwrap());
            assert!(close(out[r][g], v), "{} cell: {}", c["name"].as_str().unwrap(), out[r][g]);
        }
    }

    #[test]
    fn schedule_parity_fixtures() {
        for c in fixtures()["schedule"].as_array().unwrap() {
            let out = crate::srs_gen::scheduleWith(
                c["ease"].as_f64().unwrap(),
                c["repeats"].as_i64().unwrap(),
                c["interval"].as_f64().unwrap(),
                c["grade"].as_i64().unwrap(),
                default_matrix(),
            );
            let e = &c["out"];
            assert!(close(out.easeFactor, e["easeFactor"].as_f64().unwrap()), "{} ease", c["name"].as_str().unwrap());
            assert_eq!(out.repeats, e["repeats"].as_i64().unwrap(), "{} reps", c["name"].as_str().unwrap());
            assert!(close(out.lastInterval, e["lastInterval"].as_f64().unwrap()), "{} iv", c["name"].as_str().unwrap());
            let (r, g, v) = (c["matrixCell"][0].as_u64().unwrap() as usize, c["matrixCell"][1].as_u64().unwrap() as usize, c["matrixCell"][2].as_f64().unwrap());
            assert!(close(out.matrix[r][g], v), "{} cell", c["name"].as_str().unwrap());
        }
    }

    #[test]
    fn review_surgery_parity_fixtures() {
        assert_eq!(crate::srs_gen::findAnchorLine(vec!["x".to_string(), "- card ^c1  ".to_string()], "^c1"), 1);
        assert_eq!(crate::srs_gen::findAnchorLine(vec!["x".to_string()], "^c1"), -1);
        for c in fixtures()["applyReviewProps"].as_array().unwrap() {
            let lines: Vec<String> = c["lines"].as_array().unwrap().iter().map(|v| v.as_str().unwrap().to_string()).collect();
            let props: Vec<crate::srs_gen::PropPair> = c["newProps"].as_array().unwrap().iter().map(|p| crate::srs_gen::PropPair {
                key: p["key"].as_str().unwrap().to_string(),
                value: p["value"].as_str().unwrap().to_string(),
            }).collect();
            let out = crate::srs_gen::applyReviewProps(lines, c["blockLine"].as_i64().unwrap(), props);
            let expected: Vec<&str> = c["expected"].as_array().unwrap().iter().map(|v| v.as_str().unwrap()).collect();
            assert_eq!(out, expected, "{}", c["name"].as_str().unwrap());
        }
    }
}
