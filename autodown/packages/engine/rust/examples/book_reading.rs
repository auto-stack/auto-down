use autodown_core::book_reading::{parseBookChapter, projectBookChapter, BookChapter};
use std::io::{self, BufRead, Write};
use std::{env, fs};

fn field(output: &mut impl Write, value: &str) -> io::Result<()> {
    let len = u32::try_from(value.len()).map_err(io::Error::other)?;
    output.write_all(&len.to_le_bytes())?;
    output.write_all(value.as_bytes())
}

fn chapter_result(out: &mut impl Write, chapter: &BookChapter) -> io::Result<()> {
    field(out, &chapter.markdown)?;
    field(out, &chapter.targets.iter().filter(|t| t.kind == "paragraph").count().to_string())?;
    field(out, &chapter.targets.iter().filter(|t| t.kind == "span").count().to_string())?;
    field(out, &chapter.diagnostics.len().to_string())?;
    for diagnostic in &chapter.diagnostics {
        field(out, &format!("{}:{}:{}", diagnostic.line, diagnostic.code, diagnostic.targetId))?;
    }
    field(out, &chapter.cards.len().to_string())?;
    for card in &chapter.cards {
        field(out, &card.id)?;
        field(out, &card.title)?;
        let text = projectBookChapter(chapter, &card.id).map(|p| p.markdown).unwrap_or_default();
        field(out, &text)?;
    }
    Ok(())
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut args = env::args().skip(1);
    match args.next().as_deref() {
        Some("--batch") => {
            // One UTF-8 chapter ID and source path (tab-separated) per row.
            // Each output field is framed so exact prose bytes are observable.
            let mut out = io::BufWriter::new(io::stdout().lock());
            for row in io::stdin().lock().lines() {
                let row = row?;
                let (id, path) = row.split_once('\t').ok_or("expected chapter ID and path")?;
                let source = fs::read_to_string(path)?;
                chapter_result(&mut out, &parseBookChapter(&source, id, true))?;
            }
            out.flush()?;
        }
        Some(path) => {
            let card = args.next().unwrap_or_default();
            let chapter = parseBookChapter(&fs::read_to_string(path)?, "", true);
            if !chapter.diagnostics.is_empty() {
                return Err(format!("{:?}", chapter.diagnostics).into());
            }
            let projection = projectBookChapter(&chapter, &card).ok_or("unknown card ID")?;
            io::stdout().lock().write_all(projection.markdown.as_bytes())?;
        }
        None => return Err("usage: book_reading <chapter.ad> [card-id]".into()),
    }
    Ok(())
}
