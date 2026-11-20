/**
 * AutoDown reading profile v1.
 *
 * GENERATED FILE — do not edit by hand.
 * Source: auto/book_reading.at (Auto language). Regenerate with: pnpm gen
 * (see auto/README.md for the pipeline and the applied post-fixes)
 */

import { BlockNode } from "./block-model.js";
import { scanBlockRows, extractAnchorBlock, parse_projection_blocks, plainInlineText } from "./markdown-parser.js";




export class BookTarget {
    id: string;
    kind: string;
    line: number;
    start: number;
    end: number;
    paragraphId: string;

    constructor(id: string, kind: string, line: number, start: number, end: number, paragraphId: string) {
        this.id = id;
        this.kind = kind;
        this.line = line;
        this.start = start;
        this.end = end;
        this.paragraphId = paragraphId;
    }
}

export class BookCard {
    id: string;
    title: string;
    line: number;
    firstId: string;
    lastId: string;
    start: number;
    end: number;

    constructor(id: string, title: string, line: number, firstId: string, lastId: string, start: number, end: number) {
        this.id = id;
        this.title = title;
        this.line = line;
        this.firstId = firstId;
        this.lastId = lastId;
        this.start = start;
        this.end = end;
    }
}

export class BookDiagnostic {
    code: string;
    chapterId: string;
    line: number;
    targetId: string;

    constructor(code: string, chapterId: string, line: number, targetId: string) {
        this.code = code;
        this.chapterId = chapterId;
        this.line = line;
        this.targetId = targetId;
    }
}

export class BookBlock {
    kind: string;
    start: number;
    end: number;
    id: string;

    constructor(kind: string, start: number, end: number, id: string) {
        this.kind = kind;
        this.start = start;
        this.end = end;
        this.id = id;
    }
}

export class BookChapter {
    id: string;
    source: string;
    markdown: string;
    blocks: BookBlock[];
    targets: BookTarget[];
    cards: BookCard[];
    diagnostics: BookDiagnostic[];

    constructor(id: string, source: string, markdown: string, blocks: BookBlock[], targets: BookTarget[], cards: BookCard[], diagnostics: BookDiagnostic[]) {
        this.id = id;
        this.source = source;
        this.markdown = markdown;
        this.blocks = blocks;
        this.targets = targets;
        this.cards = cards;
        this.diagnostics = diagnostics;
    }
}

export class BookProjection {
    cardId: string;
    title: string;
    start: number;
    end: number;
    markdown: string;

    constructor(cardId: string, title: string, start: number, end: number, markdown: string) {
        this.cardId = cardId;
        this.title = title;
        this.start = start;
        this.end = end;
        this.markdown = markdown;
    }
}

export class BookSelection {
    chapterId: string;
    cardId: string;
    paragraphId: string;
    targetId: string;
    text: string;
    before: string;
    after: string;

    constructor(chapterId: string, cardId: string, paragraphId: string, targetId: string, text: string, before: string, after: string) {
        this.chapterId = chapterId;
        this.cardId = cardId;
        this.paragraphId = paragraphId;
        this.targetId = targetId;
        this.text = text;
        this.before = before;
        this.after = after;
    }
}

export class BookSpan {
    id: string;
    opening: number;
    closing: number;
    after: number;

    constructor(id: string, opening: number, closing: number, after: number) {
        this.id = id;
        this.opening = opening;
        this.closing = closing;
        this.after = after;
    }
}

export function bookIdChar(c: number): boolean {
    if (c >= 65 && c <= 90) {
        return true;
    }
    if (c >= 97 && c <= 122) {
        return true;
    }
    if (c >= 48 && c <= 57) {
        return true;
    }
    return c == 45 || c == 95;
}

export function bookId(value: string): boolean {
    if (value == "") {
        return false;
    }
    for (let i = 0; i < Number(value.length); i++) {
        if (!bookIdChar(value.charCodeAt(i))) {
            return false;
        }
    }
    return true;
}

export function bookAdvanceSpace(text: string, start: number): number {
    let i: number = start;
    while (i < Number(text.length)) {
        const ch = text.charCodeAt(i);
        if (ch != 32 && ch != 9) {
            break;
        }
        i += 1;
    }
    return i;
}

export function bookWordEnd(text: string, start: number): number {
    let i: number = start;
    while (i < Number(text.length)) {
        const ch = text.charCodeAt(i);
        if (ch == 32 || ch == 9) {
            break;
        }
        i += 1;
    }
    return i;
}

export function isBookCardLine(line: string): boolean {
    if (line.slice(0, 6) != "::card") {
        return false;
    }
    if (Number(line.length) == 6) {
        return true;
    }
    const next = line.charCodeAt(6);
    return next == 32 || next == 9;
}

export function readBookCard(row: string, line: number): BookCard {
    const start = bookAdvanceSpace(row, 6);
    const end = bookWordEnd(row, start);
    const key = row.slice(start, end);
    let titleStart = bookAdvanceSpace(row, end);
    let id = key;
    let firstId: string = "";
    let lastId: string = "";
    if (key.slice(0, 1) == "^") {
        id = key.slice(1);
        const rangeEnd = bookWordEnd(row, titleStart);
        const range = row.slice(titleStart, rangeEnd);
        const parts = range.split("..");
        if (Number(parts.length) <= 2) {
            const first = parts[0];
            const last = parts[Number(parts.length) - 1];
            if (first.slice(0, 1) == "^" && last.slice(0, 1) == "^") {
                firstId = first.slice(1);
                lastId = last.slice(1);
            }
        }
        if (!bookId(firstId) || !bookId(lastId)) {
            return new BookCard(id, "", line, "", "", -1, -1);
        }
        titleStart = bookAdvanceSpace(row, rangeEnd);
    }
    const title = row.slice(titleStart).trim();
    return new BookCard(id, title, line, firstId, lastId, -1, -1);
}

export function readBookSpan(text: string, opening: number, closing: number): BookSpan {
    if (closing <= opening + 1 || text.slice(closing + 1, closing + 3) != "{^") {
        return new BookSpan("", opening, closing, closing + 1);
    }
    let end: number = closing + 3;
    while (end < Number(text.length)) {
        if (!bookIdChar(text.charCodeAt(end))) {
            break;
        }
        end += 1;
    }
    if (end == closing + 3 || text.slice(end, end + 1) != "}") {
        return new BookSpan("", opening, closing, closing + 1);
    }
    return new BookSpan(text.slice(closing + 3, end), opening, closing, end + 1);
}

export function skipBookCode(text: string, start: number): number {
    let width: number = 1;
    while (text.charCodeAt(start + width) == 96) {
        width += 1;
    }
    let i: number = start + width;
    while (i < Number(text.length)) {
        if (text.charCodeAt(i) != 96) {
            i += 1;
            continue;
        }
        let run: number = 1;
        while (text.charCodeAt(i + run) == 96) {
            run += 1;
        }
        if (run == width) {
            return i + run;
        }
        i += run;
    }
    return start + width;
}

export class BookInline {
    spans: BookSpan[];
    containers: BookSpan[];

    constructor(spans: BookSpan[], containers: BookSpan[]) {
        this.spans = spans;
        this.containers = containers;
    }
}

export function bookCloseLink(text: string, start: number, closing: number): number {
    let i: number = start + 1;
    let depth: number = 1;
    const len: number = Number(text.length);
    while (i < len) {
        const ch = text.charCodeAt(i);
        if (ch == 92) {
            i += 2;
            continue;
        }
        if (ch == closing) {
            depth -= 1;
            if (depth == 0) {
                return i;
            }
        } else {
            if (ch == text.charCodeAt(start)) {
                depth += 1;
            }
        }
        i += 1;
    }
    return -1;
}

export function bookWhite(c: number): boolean {
    return c == 32 || c == 9 || c == 10 || c == 13;
}

export function bookCharCodes(text: string): number[] {
    let codes: number[] = [];
    for (let i = 0; i < Number(text.length); i++) {
        codes.push(text.charCodeAt(i));
    }
    return codes;
}

export function bookSpans(text: string): BookInline {
    let spans: BookSpan[] = [];
    let containers: BookSpan[] = [];
    let brackets: number[] = [];
    if (Number(text.split("[").length) < 2) {
        return new BookInline(spans, containers);
    }
    const codes = bookCharCodes(text);
    let delimiters: BookSpan[] = [];
    let i: number = 0;
    const length: number = Number(codes.length);
    while (i < length) {
        const ch = codes[i];
        if (ch == 92) {
            i += 2;
            continue;
        }
        if (ch == 96) {
            i = skipBookCode(text, i);
            continue;
        }
        if (ch == 42 || ch == 95 || ch == 126) {
            let end: number = i + 1;
            while (end < length && codes[end] == ch) {
                end += 1;
            }
            const token = text.slice(i, end);
            let open = end < length && !bookWhite(codes[end]);
            let close = i > 0 && !bookWhite(codes[i - 1]);
            if (ch == 95 && i > 0 && end < length) {
                if (bookIdChar(codes[i - 1]) && bookIdChar(codes[end])) {
                    open = false;
                    close = false;
                }
            }
            if (ch != 126 || end - i == 2) {
                let paired: boolean = false;
                const n: number = Number(delimiters.length);
                if (close && n > 0) {
                    const previous = delimiters[n - 1];
                    if (previous.id == token) {
                        containers.push(new BookSpan("", previous.opening, i, end));
                        delimiters.pop();
                        paired = true;
                    }
                }
                if (open && !paired) {
                    delimiters.push(new BookSpan(token, i, end, end));
                }
            }
            i = end;
            continue;
        }
        if (ch == 91) {
            brackets.push(i);
        }
        if (ch == 93 && Number(brackets.length) > 0) {
            const start = brackets[Number(brackets.length) - 1];
            brackets.pop();
            const anchored = readBookSpan(text, start, i);
            if (anchored.id != "") {
                spans.push(anchored);
                i = anchored.after;
                continue;
            }
            if (i + 1 < length) {
                const next = codes[i + 1];
                let closing: number = 0;
                if (next == 40) {
                    closing = 41;
                }
                if (next == 91) {
                    closing = 93;
                }
                if (closing != 0) {
                    const end = bookCloseLink(text, i + 1, closing);
                    if (end >= 0) {
                        containers.push(new BookSpan("", start, i, end + 1));
                        i = end + 1;
                        continue;
                    }
                }
            }
        }
        i += 1;
    }
    return new BookInline(spans, containers);
}

export function invalidBookSpan(item: BookSpan, all: BookInline): boolean {
    for (const other of all.spans) {
        if (item.opening != other.opening && item.opening < other.after && other.opening < item.after) {
            return true;
        }
    }
    for (const container of all.containers) {
        if (item.opening < container.after && container.opening < item.after) {
            const enclosed = item.opening < container.opening && container.after <= item.closing;
            if (!enclosed) {
                return true;
            }
        }
    }
    return false;
}

function bookTextUnits(text: string): number { return text.length }
export function sliceBookText(text: string, start: number, end: number): string {
  return text.slice(start, end)
}

export function bookLineOf(text: string, index: number, startLine: number): number {
    return startLine + Number(text.slice(0, index).split("\n").length) - 1;
}

export function findBookTarget(targets: BookTarget[], id: string): BookTarget | null {
    for (const target of targets) {
        if (target.id == id) {
            return target;
        }
    }
    return null;
}

export function locateBookTarget(chapter: BookChapter, id: string): BookTarget | null {
    let match: BookTarget | null = null;
    for (const target of chapter.targets) {
        if (target.id == id) {
            if (match != null) {
                return null;
            }
            match = target;
        }
    }
    if (match == null) {
        return null;
    }
    for (const diagnostic of chapter.diagnostics) {
        if (diagnostic.code == "duplicate-id" && diagnostic.targetId == id) {
            return null;
        }
    }
    return match;
}

export function projectBookChapter(chapter: BookChapter, cardId: string): BookProjection | null {
    if (cardId == "") {
        return new BookProjection("", "", 0, bookTextUnits(chapter.markdown), chapter.markdown);
    }
    for (const card of chapter.cards) {
        if (card.id == cardId && card.start >= 0) {
            const text = sliceBookText(chapter.markdown, card.start, card.end);
            return new BookProjection(card.id, card.title, card.start, card.end, text);
        }
    }
    return null;
}

export function locateBookSelection(chapter: BookChapter, projection: BookProjection, block: BookBlock, start: number, end: number): BookSelection | null {
    if (block.kind != "paragraph" || start < 0 || end <= start) {
        return null;
    }
    let visibleStart: number = projection.start;
    let visibleEnd: number = projection.end;
    if (visibleStart < block.start) {
        visibleStart = block.start;
    }
    if (visibleEnd > block.end) {
        visibleEnd = block.end;
    }
    if (visibleEnd <= visibleStart) {
        return null;
    }
    const visible = sliceBookText(chapter.markdown, visibleStart, visibleEnd);
    const plain = plainInlineText(visible);
    if (end > bookTextUnits(plain)) {
        return null;
    }
    const prefix = sliceBookText(chapter.markdown, block.start, visibleStart);
    const context = plainInlineText(sliceBookText(chapter.markdown, block.start, block.end));
    const base = bookTextUnits(plainInlineText(prefix));
    const absoluteStart: number = base + start;
    const absoluteEnd: number = base + end;
    const contextEnd = bookTextUnits(context);
    if (absoluteEnd > contextEnd) {
        return null;
    }
    let targetId = block.id.slice(0);
    if (locateBookTarget(chapter, targetId) == null) {
        targetId = "";
    }
    for (const target of chapter.targets) {
        if (target.kind == "span" && target.start >= block.start && target.end <= block.end) {
            const beforeSpan = sliceBookText(chapter.markdown, block.start, target.start);
            const throughSpan = sliceBookText(chapter.markdown, block.start, target.end);
            const left = bookTextUnits(plainInlineText(beforeSpan));
            const right = bookTextUnits(plainInlineText(throughSpan));
            if (absoluteStart >= left && absoluteEnd <= right) {
                if (locateBookTarget(chapter, target.id) != null) {
                    targetId = target.id.slice(0);
                }
                break;
            }
        }
    }
    if (targetId == "") {
        return null;
    }
    return new BookSelection(chapter.id, projection.cardId, block.id, targetId, sliceBookText(context, absoluteStart, absoluteEnd), sliceBookText(context, 0, absoluteStart), sliceBookText(context, absoluteEnd, contextEnd));
}

export function bookChapterTree(chapter: BookChapter, isFinal: boolean): BlockNode {
    return parse_projection_blocks(chapter.markdown, isFinal);
}

export function serializeBookChapter(chapter: BookChapter): string {
    return chapter.source;
}

export function parseBookChapter(source: string, chapterId: string, isFinal: boolean): BookChapter {
    const normalized = source.split("\r\n").join("\n").split("\r").join("\n");
    const lines = normalized.split("\n");
    const rows = scanBlockRows(lines);
    let chapter: string = chapterId;
    let markdown: string = "";
    let units: number = 0;
    let cursor: number = 0;
    let afterCard: boolean = false;
    let active: number = -1;
    let blocks: BookBlock[] = [];
    let targets: BookTarget[] = [];
    let cards: BookCard[] = [];
    let diagnostics: BookDiagnostic[] = [];
    let ids: string[] = [];
    for (const block of rows) {
        while (cursor < block.first) {
            const gap = lines[cursor];
            if (!afterCard || gap != "") {
                markdown += gap + "\n";
                units += bookTextUnits(gap) + 1;
            }
            cursor += 1;
        }
        afterCard = false;
        const first = lines[block.first];
        if (block.kind == "paragraph" && isBookCardLine(first)) {
            for (let row = block.first; row < block.end; row++) {
                active = -1;
                const declaration = readBookCard(lines[row], row + 1);
                if (!isBookCardLine(lines[row]) || !bookId(declaration.id) || declaration.title == "") {
                    diagnostics.push(new BookDiagnostic("invalid-card", chapter, row + 1, declaration.id));
                    continue;
                }
                ids.push(declaration.id.slice(0));
                if (declaration.firstId == "") {
                    active = Number(cards.length);
                }
                cards.push(declaration);
            }
            cursor = block.end;
            afterCard = true;
            continue;
        }
        if (block.kind == "heading") {
            active = -1;
        }
        let pieces: string[] = [];
        for (let row = block.first; row < block.end; row++) {
            pieces.push(lines[row]);
        }
        const raw = pieces.join("\n");
        let body = raw.slice(0);
        let id: string = "";
        const indent = bookAdvanceSpace(first, 0);
        const indentText = first.slice(0, indent);
        const literalBlock = indent >= 4 || Number(indentText.split("\t").length) > 1;
        if (!literalBlock && block.kind == "paragraph" || block.kind == "heading") {
            const candidate = extractAnchorBlock(raw);



            if (candidate != "") {
                const tail: string = " ^" + candidate;
                const cut: number = Number(raw.length) - Number(tail.length);
                if (raw.slice(cut) == tail) {
                    id = candidate;
                    body = raw.slice(0, cut);
                }
            }
        }
        if (chapter == "" && block.kind == "heading" && id != "") {
            chapter = id;
        }
        const blockStart: number = units;
        if (block.kind == "paragraph" && !literalBlock) {
            const inline = bookSpans(body);
            let previous: number = 0;
            for (const item of inline.spans) {
                const line = bookLineOf(body, item.opening, block.first + 1);
                if (invalidBookSpan(item, inline)) {
                    diagnostics.push(new BookDiagnostic("invalid-span-nesting", chapter, line, item.id));
                    continue;
                }
                const before = body.slice(previous, item.opening);
                const content = body.slice(item.opening + 1, item.closing);
                markdown += before + content;
                units += bookTextUnits(before);
                const end: number = units + bookTextUnits(content);
                targets.push(new BookTarget(item.id, "span", line, units, end, id));
                ids.push(item.id.slice(0));
                units = end;
                previous = item.after;
            }
            body = body.slice(previous);
        }
        markdown += body + "";
        units += bookTextUnits(body);
        if (id != "") {
            targets.push(new BookTarget(id, block.kind, block.end, blockStart, units, id));
            ids.push(id);
        }
        blocks.push(new BookBlock(block.kind, blockStart, units, id));
        if (active >= 0) {
            let current = cards[active];
            if (current.start < 0) {
                current.start = blockStart;
            }
            current.end = units;
            cards[active] = current;
        }
        if (block.end < Number(lines.length)) {
            markdown += "\n";
            units += 1;
        }
        cursor = block.end;
    }
    while (cursor < Number(lines.length)) {
        const tail = lines[cursor];
        if (!afterCard || tail != "") {
            markdown += tail;
            if (cursor + 1 < Number(lines.length)) {
                markdown += "\n";
            }
        }
        cursor += 1;
    }
    if (afterCard) {
        while (Number(markdown.length) >= 2) {
            const end: number = Number(markdown.length);
            if (markdown.slice(end - 2) != "\n\n") {
                break;
            }
            markdown = markdown.slice(0, end - 1);
        }
    }
    for (let i = 0; i < Number(diagnostics.length); i++) {
        let diagnostic = diagnostics[i];
        diagnostic.chapterId = chapter.slice(0);
        diagnostics[i] = diagnostic;
    }


    let duplicates: string[] = [];
    for (let i = 0; i < Number(ids.length); i++) {
        const key = ids[i];
        for (let j = 0; j < i; j++) {
            if (ids[j] == key) {
                duplicates.push(key);
                break;
            }
        }
    }
    for (const target of targets) {
        for (const key of duplicates) {
            if (target.id == key) {
                diagnostics.push(new BookDiagnostic("duplicate-id", chapter, target.line, key));
                break;
            }
        }
    }
    for (let i = 0; i < Number(cards.length); i++) {
        let card = cards[i];
        let bad: boolean = false;
        for (const key of duplicates) {
            if (key == card.id || key == card.firstId || key == card.lastId) {
                bad = true;
            }
        }
        if (bad) {
            diagnostics.push(new BookDiagnostic("duplicate-id", chapter, card.line, card.id));
            card.start = -1;
        } else {
            if (card.firstId != "") {
                const first = findBookTarget(targets, card.firstId);
                const last = findBookTarget(targets, card.lastId);
                if (first == null || last == null) {
                    if (isFinal) {
                        let missing = card.lastId.slice(0);
                        if (first == null) {
                            missing = card.firstId.slice(0);
                        }
                        diagnostics.push(new BookDiagnostic("unknown-target", chapter, card.line, missing));
                    }
                } else {
                    const a = first ?? new BookTarget("", "", 0, 0, 0, "");
                    const b = last ?? new BookTarget("", "", 0, 0, 0, "");
                    if (a.id != b.id && a.end > b.start) {
                        diagnostics.push(new BookDiagnostic("reversed-or-overlapping-range", chapter, card.line, card.id));
                    } else {
                        card.start = a.start;
                        card.end = b.end;
                    }
                }
            } else {
                if (isFinal && card.start < 0) {
                    diagnostics.push(new BookDiagnostic("empty-card", chapter, card.line, card.id));
                }
            }
        }
        cards[i] = card;
    }
    return new BookChapter(chapter, source, markdown, blocks, targets, cards, diagnostics);
}