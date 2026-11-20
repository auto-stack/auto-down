use autodown_core::book_reading::{
    locateBookSelection, locateBookTarget, parseBookChapter, projectBookChapter,
    serializeBookChapter, sliceBookText,
};

#[test]
fn utf16_ranges_protected_code_and_deferred_diagnostics() {
    let source = "# 卷 ^chapter\r\n\r\n前 [**𠮷字**]{^span} 后 ^p\r\n\r\n\
        ::card ^one ^span 学习\r\n::card ^later ^missing 等待\r\n\r\n\
        ~~~\r\n::card literal 示例\r\n[𠮷]{^literal}\r\n~~~\r\n";
    let partial = parseBookChapter(source, "", false);
    assert!(partial.diagnostics.is_empty());
    assert!(projectBookChapter(&partial, "later").is_none());
    let chapter = parseBookChapter(source, "", true);
    assert_eq!(chapter.id, "chapter");
    assert_eq!(serializeBookChapter(&chapter), source);
    assert_eq!(chapter.diagnostics.len(), 1);
    assert_eq!(chapter.diagnostics[0].code, "unknown-target");
    assert_eq!(chapter.diagnostics[0].line, 6);
    assert_eq!(chapter.diagnostics[0].targetId, "missing");
    assert!(chapter.markdown.contains("::card literal 示例\n[𠮷]{^literal}"));
    let span = locateBookTarget(&chapter, "span").unwrap();
    assert_eq!(span.end - span.start, 7);
    assert_eq!(sliceBookText(&chapter.markdown, span.start, span.end), "**𠮷字**");
    let projection = projectBookChapter(&chapter, "one").unwrap();
    let paragraph = chapter.blocks.iter().find(|b| b.id == "p").unwrap();
    let selection = locateBookSelection(&chapter, projection, paragraph.clone(), 0, 2).unwrap();
    assert_eq!(selection.targetId, "span");
    assert_eq!(selection.text, "𠮷");
    assert_eq!(selection.before, "前 ");
    assert_eq!(selection.after, "字 后");
}
