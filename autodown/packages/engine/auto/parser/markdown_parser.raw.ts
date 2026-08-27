import { preprocessMarkdown, startsWithStr, startsWithAt, endsWithStr, trimStartStr, trimEndStr, hasChar, findStr, findStrFrom, rfindChar, scanIntPrefix, TableAttr } from "ial";

import { BlockNode, BlockType, InlineSpan, Mark, Attr, Value, SourceRange, rng, span, attrSet, addMark, spansText, spanWith, blockFull, attrOf } from "block_model";

export class WNode {
    type: string;
    content: string | null;
    level: number | null;
    language: string | null;
    code: string | null;
    loading: boolean | null;
    children: WNode[] | null;
    ordered: boolean | null;
    start: number | null;
    items: WNode[] | null;
    cells: WNode[] | null;
    header: WNode[] | null;
    rows: WNode[] | null;
    isHeader: boolean | null;
    align: string | null;
    href: string | null;
    title: string | null;
    text: string | null;
    src: string | null;
    alt: string | null;

    constructor(type: string, content: string | null, level: number | null, language: string | null, code: string | null, loading: boolean | null, children: WNode[] | null, ordered: boolean | null, start: number | null, items: WNode[] | null, cells: WNode[] | null, header: WNode[] | null, rows: WNode[] | null, isHeader: boolean | null, align: string | null, href: string | null, title: string | null, text: string | null, src: string | null, alt: string | null) {
        this.type = type;
        this.content = content;
        this.level = level;
        this.language = language;
        this.code = code;
        this.loading = loading;
        this.children = children;
        this.ordered = ordered;
        this.start = start;
        this.items = items;
        this.cells = cells;
        this.header = header;
        this.rows = rows;
        this.isHeader = isHeader;
        this.align = align;
        this.href = href;
        this.title = title;
        this.text = text;
        this.src = src;
        this.alt = alt;
    }
}

export function noNodes(): WNode[] {
    let l: WNode[] = [];
    return l;
}

export function codeNode(language: string, code: string, loading: boolean): WNode {
    return WNode("code_block", null, null, language, code, loading, null, null, null, null, null, null, null, null, null, null, null, null, null, null);
}

export function headingNode(level: number, children: WNode[]): WNode {
    return WNode("heading", null, level, null, null, null, children, null, null, null, null, null, null, null, null, null, null, null, null, null);
}

export function thematicNode(): WNode {
    return WNode("thematic_break", null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null);
}

export function quoteNode(children: WNode[]): WNode {
    return WNode("blockquote", null, null, null, null, null, children, null, null, null, null, null, null, null, null, null, null, null, null, null);
}

export function paraNode(children: WNode[]): WNode {
    return WNode("paragraph", null, null, null, null, null, children, null, null, null, null, null, null, null, null, null, null, null, null, null);
}

export function tableNode(header: WNode[], rows: WNode[], loading: boolean): WNode {
    return WNode("table", null, null, null, null, loading, null, null, null, null, null, header, rows, null, null, null, null, null, null, null);
}

export function rowNode(cells: WNode[]): WNode {
    return WNode("table_row", null, null, null, null, null, null, null, null, null, cells, null, null, null, null, null, null, null, null, null);
}

export function cellNode(isHeaderCell: boolean, children: WNode[], align: string): WNode {
    return WNode("table_cell", null, null, null, null, null, children, null, null, null, null, null, null, isHeaderCell, align, null, null, null, null, null);
}

export function listNode(ordered: boolean, startN: number | null, items: WNode[]): WNode {
    return WNode("list", null, null, null, null, null, null, ordered, startN, items, null, null, null, null, null, null, null, null, null, null);
}

export function itemNode(children: WNode[]): WNode {
    return WNode("list_item", null, null, null, null, null, children, null, null, null, null, null, null, null, null, null, null, null, null, null);
}

export function strongNode(children: WNode[]): WNode {
    return WNode("strong", null, null, null, null, null, children, null, null, null, null, null, null, null, null, null, null, null, null, null);
}

export function emNode(children: WNode[]): WNode {
    return WNode("emphasis", null, null, null, null, null, children, null, null, null, null, null, null, null, null, null, null, null, null, null);
}

export function strikeNode(children: WNode[]): WNode {
    return WNode("strikethrough", null, null, null, null, null, children, null, null, null, null, null, null, null, null, null, null, null, null, null);
}

export function codeSpanNode(code: string): WNode {
    return WNode("inline_code", null, null, null, code, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null);
}

export function hardbreakNode(): WNode {
    return WNode("hardbreak", null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null);
}

export function imageNode(src: string, alt: string): WNode {
    return WNode("image", null, null, null, null, false, null, null, null, null, null, null, null, null, null, null, null, null, src, alt);
}

export function linkNode(href: string, title: string | null, textContent: string, children: WNode[], loading: boolean): WNode {
    return WNode("link", null, null, null, null, loading, children, null, null, null, null, null, null, null, null, href, title, textContent, null, null);
}

export function rawTextNode(content: string): WNode {
    return WNode("text", content, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null);
}

export class DelimScan {
    next: number;
    inner: string;

    constructor(next: number, inner: string) {
        this.next = next;
        this.inner = inner;
    }
}

export class LinkScan {
    next: number;
    text: string;
    href: string;
    loading: boolean;
    title: string | null;
    tail: string;

    constructor(next: number, text: string, href: string, loading: boolean, title: string | null, tail: string) {
        this.next = next;
        this.text = text;
        this.href = href;
        this.loading = loading;
        this.title = title;
        this.tail = tail;
    }
}

export function normalizeNewlines(src: string): string {
    



    const a = src.split("\r\n").join("\n");
    return a.split("\r").join("\n");
}

export function stripListMarkerTail(s: string): string {
    const nl = rfindChar(s, 10);
    if (nl == -1) {
        return s;
    }
    let p: number = nl + 1;
    let sp: number = 0;
    while (p < Number(s.length)) {
        if (s.char_at(p) == 32) {
            sp += 1;
            p += 1;
        } else {
            break;
        }
    }
    if (sp > 3) {
        return s;
    }
    if (p >= Number(s.length)) {
        return s;
    }
    let c = s.char_at(p);
    let after: number = -1;
    if (c == 45) {
        after = p + 1;
    } else {
        if (c == 42) {
            after = p + 1;
        } else {
            if (c == 43) {
                after = p + 1;
            }
        }
    }
    if (after == -1) {
        let q: number = p;
        let digits: number = 0;
        while (q < Number(s.length)) {
            const d = s.char_at(q);
            if (d >= 48) {
                if (d <= 57) {
                    digits += 1;
                    q += 1;
                } else {
                    break;
                }
            } else {
                break;
            }
        }
        if (digits == 0) {
            return s;
        }
        if (digits > 9) {
            return s;
        }
        if (q >= Number(s.length)) {
            return s;
        }
        const dm = s.char_at(q);
        if (dm == 46) {
            after = q + 1;
        } else {
            if (dm == 41) {
                after = q + 1;
            } else {
                return s;
            }
        }
    }
    let t: number = after;
    while (t < Number(s.length)) {
        if (s.char_at(t) == 32) {
            t += 1;
        } else {
            return s;
        }
    }
    return s.slice(0, nl);
}

export function stripQuoteMarkerTail(s: string): string {
    const nl = rfindChar(s, 10);
    if (nl == -1) {
        return s;
    }
    let p: number = nl + 1;
    let sp: number = 0;
    while (p < Number(s.length)) {
        if (s.char_at(p) == 32) {
            sp += 1;
            p += 1;
        } else {
            break;
        }
    }
    if (sp > 3) {
        return s;
    }
    if (p >= Number(s.length)) {
        return s;
    }
    if (s.char_at(p) != 62) {
        return s;
    }
    let t: number = p + 1;
    while (t < Number(s.length)) {
        if (s.char_at(t) == 32) {
            t += 1;
        } else {
            return s;
        }
    }
    return s.slice(0, nl);
}

export function stripDanglingTail(src: string, isFinal: boolean): string {
    if (isFinal) {
        return src;
    }
    let s: string = src;
    let changed: boolean = true;
    while (changed) {
        changed = false;
        const stripped = stripListMarkerTail(s);
        if (stripped != s) {
            s = stripped;
            changed = true;
        }
        const strippedQuote = stripQuoteMarkerTail(s);
        if (strippedQuote != s) {
            s = strippedQuote;
            changed = true;
        }
    }
    return s;
}

export function isBlank(line: string): boolean {
    return line.trim() == "";
}

export function indentOf(line: string): number {
    let n: number = 0;
    while (n < Number(line.length)) {
        if (line.char_at(n) == 32) {
            n += 1;
        } else {
            break;
        }
    }
    return n;
}

export function indentWidth(s: string): number {
    let n: number = 0;
    let i: number = 0;
    while (i < Number(s.length)) {
        const c = s.char_at(i);
        if (c == 32) {
            n += 1;
        } else {
            if (c == 9) {
                n += 4;
            } else {
                break;
            }
        }
        i += 1;
    }
    return n;
}

export function parseDocument(src: string, isFinal: boolean): WNode[] {
    const normalized = normalizeNewlines(src);
    const safe = stripDanglingTail(normalized, isFinal);
    const lines = safe.split("\n");
    return parseBlocks(lines, isFinal);
}

export function fenceMarker(line: string): string {
    if (indentWidth(line) >= 4) {
        return "";
    }
    const t = line.trim();
    if (startsWithStr(t, "```")) {
        return "`";
    }
    if (startsWithStr(t, "~~~")) {
        return "~";
    }
    return "";
}

export function fenceMarkerRun(line: string): string {
    const t = line.trim();
    let run: string = "";
    let i: number = 0;
    if (Number(t.length) == 0) {
        return "";
    }
    const first = t.char_at(0);
    if (first != 96) {
        if (first != 126) {
            return "";
        }
    }
    while (i < Number(t.length)) {
        if (t.char_at(i) == first) {
            run = run + t.slice(i, i + 1);
            i += 1;
        } else {
            break;
        }
    }
    return run;
}

export function isCloseFence(line: string, marker: string, run: string): boolean {
    if (indentWidth(line) >= 4) {
        return false;
    }
    const t = line.trim();
    if (Number(t.length) != Number(run.length)) {
        return false;
    }
    let i: number = 0;
    let mkCode: number = 96;
    if (marker == "~") {
        mkCode = 126;
    }
    while (i < Number(t.length)) {
        if (t.char_at(i) != mkCode) {
            return false;
        }
        i += 1;
    }
    return true;
}

export function headingLevel(line: string): number {
    if (indentWidth(line) >= 4) {
        return 0;
    }
    const t = line.trim();
    let level: number = 0;
    while (level < Number(t.length)) {
        if (t.char_at(level) == 35) {
            level += 1;
        } else {
            break;
        }
    }
    if (level == 0) {
        return 0;
    }
    if (level > 6) {
        return 0;
    }
    if (level == Number(t.length)) {
        return level;
    }
    if (t.char_at(level) != 32) {
        return 0;
    }
    return level;
}

export function stripTrailingHashes(t: string): string {
    const trimmed = t.trim();
    if (Number(trimmed.length) == 0) {
        return trimmed;
    }
    if (trimmed.char_at(Number(trimmed.length) - 1) != 35) {
        return trimmed;
    }
    let hs: number = Number(trimmed.length) - 1;
    while (hs > 0) {
        if (trimmed.char_at(hs - 1) == 35) {
            hs -= 1;
        } else {
            break;
        }
    }
    let ss: number = hs;
    while (ss > 0) {
        if (trimmed.char_at(ss - 1) == 32) {
            ss -= 1;
        } else {
            break;
        }
    }
    if (ss == hs) {
        return trimmed;
    }
    const body = trimmed.slice(0, ss);
    return trimEndStr(body);
}

export function olMarkerNum(line: string): number {
    if (indentWidth(line) >= 4) {
        return -1;
    }
    let p: number = 0;
    let sp: number = 0;
    while (p < Number(line.length)) {
        if (line.char_at(p) == 32) {
            sp += 1;
            p += 1;
        } else {
            break;
        }
    }
    if (sp > 3) {
        return -1;
    }
    let q: number = p;
    let digits: number = 0;
    while (q < Number(line.length)) {
        const d = line.char_at(q);
        if (d >= 48) {
            if (d <= 57) {
                digits += 1;
                q += 1;
            } else {
                break;
            }
        } else {
            break;
        }
    }
    if (digits == 0) {
        return -1;
    }
    if (digits > 9) {
        return -1;
    }
    if (q >= Number(line.length)) {
        return -1;
    }
    const c = line.char_at(q);
    if (c != 46) {
        if (c != 41) {
            return -1;
        }
    }
    let after: number = q + 1;
    let isMarker: boolean = false;
    if (after == Number(line.length)) {
        isMarker = true;
    } else {
        if (line.char_at(after) == 32) {
            isMarker = true;
        }
    }
    if (!isMarker) {
        return -1;
    }
    const num = scanIntPrefix(line.slice(p, q));
    return num ?? -1;
}

export function bulletMarker(line: string): string {
    if (indentWidth(line) >= 4) {
        return "";
    }
    let p: number = 0;
    let sp: number = 0;
    while (p < Number(line.length)) {
        if (line.char_at(p) == 32) {
            sp += 1;
            p += 1;
        } else {
            break;
        }
    }
    if (sp > 3) {
        return "";
    }
    if (p >= Number(line.length)) {
        return "";
    }
    const c = line.char_at(p);
    let isBullet: boolean = false;
    if (c == 45) {
        isBullet = true;
    } else {
        if (c == 42) {
            isBullet = true;
        } else {
            if (c == 43) {
                isBullet = true;
            }
        }
    }
    if (!isBullet) {
        return "";
    }
    if (p + 1 >= Number(line.length)) {
        return "";
    }
    if (line.char_at(p + 1) != 32) {
        return "";
    }
    return line.slice(p, p + 1);
}

export function bulletMarkerBare(line: string): boolean {
    if (indentWidth(line) >= 4) {
        return false;
    }
    let p: number = 0;
    let sp: number = 0;
    while (p < Number(line.length)) {
        if (line.char_at(p) == 32) {
            sp += 1;
            p += 1;
        } else {
            break;
        }
    }
    if (sp > 3) {
        return false;
    }
    if (p + 1 != Number(line.length)) {
        return false;
    }
    const c = line.char_at(p);
    if (c == 45) {
        return true;
    }
    if (c == 42) {
        return true;
    }
    if (c == 43) {
        return true;
    }
    return false;
}

export function isThematicBreak(line: string): boolean {
    if (indentWidth(line) >= 4) {
        return false;
    }
    const t = line.trim();
    if (Number(t.length) < 3) {
        return false;
    }
    const first = t.char_at(0);
    if (first != 45) {
        if (first != 42) {
            if (first != 95) {
                return false;
            }
        }
    }
    let count: number = 0;
    let i: number = 0;
    while (i < Number(t.length)) {
        const c = t.char_at(i);
        if (c == first) {
            count += 1;
        } else {
            if (c != 32) {
                return false;
            }
        }
        i += 1;
    }
    return count >= 3;
}

export function isSetextUnderline(line: string): number {
    

    if (indentWidth(line) >= 4) {
        return 0;
    }
    const t = line.trim();
    if (Number(t.length) == 0) {
        return 0;
    }
    const first = t.char_at(0);
    if (first != 61) {
        if (first != 45) {
            return 0;
        }
    }
    let i: number = 0;
    while (i < Number(t.length)) {
        if (t.char_at(i) != first) {
            return 0;
        }
        i += 1;
    }
    if (first == 61) {
        return 1;
    }
    return 2;
}

export function startsBlockquote(line: string): boolean {
    if (indentWidth(line) >= 4) {
        return false;
    }
    return startsWithStr(trimStartStr(line), ">");
}

export function quoteBody(line: string): string {
    const t = trimStartStr(line);
    const rest = t.slice(1);
    if (startsWithStr(rest, " ")) {
        return rest.slice(1);
    }
    return rest;
}

export function isTableRow(line: string): boolean {
    if (isBlank(line)) {
        return false;
    }
    return hasChar(line, 124);
}

export function isAlignCell(t: string): boolean {
    if (Number(t.length) == 0) {
        return false;
    }
    let p: number = 0;
    if (t.char_at(0) == 58) {
        p = 1;
    }
    if (p >= Number(t.length)) {
        return false;
    }
    let q: number = p;
    while (q < Number(t.length)) {
        if (t.char_at(q) == 45) {
            q += 1;
        } else {
            break;
        }
    }
    if (q == p) {
        return false;
    }
    if (q == Number(t.length)) {
        return true;
    }
    if (q + 1 == Number(t.length)) {
        if (t.char_at(q) == 58) {
            return true;
        }
    }
    return false;
}

export function isTableDelimiter(line: string): boolean {
    if (isBlank(line)) {
        return false;
    }
    if (!hasChar(line, 45)) {
        return false;
    }
    


    const cells = splitRowCells(line);
    if (Number(cells.length) == 0) {
        return false;
    }
    for (const c of cells) {
        const t = c.trim();
        if (!isAlignCell(t)) {
            return false;
        }
    }
    return true;
}

export function splitRowCells(line: string): string[] {
    let t = line.trim();
    if (startsWithStr(t, "|")) {
        t = t.slice(1);
    }
    if (endsWithStr(t, "|")) {
        t = t.slice(0, Number(t.length) - 1);
    }
    const raw = t.split("|");
    let out: string[] = [];
    let i: number = 0;
    while (i < Number(raw.length)) {
        out.push(raw[i]);
        i += 1;
    }
    return out;
}

export function delimiterAlign(cell: string): string {
    const t = cell.trim();
    const left = startsWithStr(t, ":");
    const right = endsWithStr(t, ":");
    if (left) {
        if (right) {
            return "center";
        }
        return "left";
    }
    if (right) {
        return "right";
    }
    return "left";
}

export function isFenceTailRun(t: string): boolean {
    if (Number(t.length) == 0) {
        return false;
    }
    let i: number = 0;
    while (i < Number(t.length)) {
        const c = t.char_at(i);
        if (c == 96) {
            

        } else {
            if (c == 126) {
                

            } else {
                return false;
            }
        }
        i += 1;
    }
    return true;
}

export function stripTrailingSpaceLine(s: string): string {
    let end: number = Number(s.length);
    while (end > 0) {
        if (s.char_at(end - 1) == 32) {
            end -= 1;
        } else {
            break;
        }
    }
    if (end == Number(s.length)) {
        return s;
    }
    if (end == 0) {
        return s;
    }
    if (s.char_at(end - 1) == 10) {
        return s.slice(0, end);
    }
    return s;
}

export function stripParaIndent(s: string): string {
    let n: number = 0;
    while (n < 4) {
        if (n < Number(s.length)) {
            if (s.char_at(n) == 32) {
                n += 1;
            } else {
                break;
            }
        } else {
            break;
        }
    }
    if (n == 0) {
        return s;
    }
    return s.slice(n);
}

export function parseBlocks(lines: string[], isFinal: boolean): WNode[] {
    let nodes: WNode[] = [];
    let i: number = 0;
    while (i < Number(lines.length)) {
        const line = lines[i];
        if (isBlank(line)) {
            i += 1;
            continue;
        }
        


        const mk = fenceMarker(line);
        if (mk != "") {
            const run = fenceMarkerRun(line);
            const info = line.trim().slice(Number(run.length));
            const language = info.trim();
            let body: string[] = [];
            let j: number = i + 1;
            let closed: boolean = false;
            while (j < Number(lines.length)) {
                if (isCloseFence(lines[j], mk, run)) {
                    closed = true;
                    break;
                }
                body.push(lines[j]);
                j += 1;
            }
            let code = body.join("\n");
            if (closed) {
                if (Number(body.length) > 0) {
                    code = code + "\n";
                } else {
                    code = "";
                }
                nodes.push(codeNode(language, code, false));
            } else {
                


                while (Number(body.length) > 0) {
                    const tailLine = body[Number(body.length) - 1].trim();
                    if (tailLine == "") {
                        break;
                    }
                    if (!isFenceTailRun(tailLine)) {
                        break;
                    }
                    body.pop();
                }
                let openCode = body.join("\n");
                


                openCode = stripTrailingSpaceLine(openCode);
                nodes.push(codeNode(language, openCode, !isFinal));
            }
            i = j + 1;
            continue;
        }
        


        const hlevel = headingLevel(line);
        if (hlevel > 0) {
            const t = line.trim();
            const content = t.slice(hlevel).trim();
            const clean = stripTrailingHashes(content);
            let children = parseInline(clean, isFinal);
            if (clean == "") {
                children = noNodes();
            }
            nodes.push(headingNode(hlevel, children));
            i += 1;
            continue;
        }
        


        if (isThematicBreak(line)) {
            nodes.push(thematicNode());
            i += 1;
            continue;
        }
        


        if (startsBlockquote(line)) {
            let qlines: string[] = [];
            let j: number = i;
            while (j < Number(lines.length)) {
                if (startsBlockquote(lines[j])) {
                    qlines.push(quoteBody(lines[j]));
                    j += 1;
                } else {
                    if (isBlank(lines[j])) {
                        break;
                    }
                    

                    if (isParagraphStart(lines[j])) {
                        qlines.push(lines[j]);
                        j += 1;
                    } else {
                        break;
                    }
                }
            }
            const inner = parseBlocks(qlines, isFinal);
            nodes.push(quoteNode(inner));
            i = j;
            continue;
        }
        


        if (isTableRow(line)) {
            if (i + 1 < Number(lines.length)) {
                if (isTableDelimiter(lines[i + 1])) {
                    



                    const headCount: number = Number(splitRowCells(line).length);
                    const delimCount: number = Number(splitRowCells(lines[i + 1]).length);
                    if (headCount == delimCount) {
                        let tableEnd = tableConsume(lines, i, nodes, isFinal);
                        i = tableEnd;
                        continue;
                    }
                }
            }
        }
        


        const bnum = olMarkerNum(line);
        const bmark = bulletMarker(line);
        if (bnum >= 0) {
            let listEnd = parseList(lines, i, true, bnum, nodes, isFinal);
            i = listEnd;
            continue;
        }
        if (bmark != "") {
            let listEnd2 = parseList(lines, i, false, 0, nodes, isFinal);
            i = listEnd2;
            continue;
        }
        if (bulletMarkerBare(line)) {
            

            let bareEnd = parseList(lines, i, false, 0, nodes, isFinal);
            i = bareEnd;
            continue;
        }
        


        let para: string[] = [];
        let j: number = i;
        let setextLevel: number = 0;
        while (j < Number(lines.length)) {
            const cur = lines[j];
            if (isBlank(cur)) {
                break;
            }
            if (Number(para.length) > 0) {
                const su = isSetextUnderline(cur);
                if (su > 0) {
                    setextLevel = su;
                    j += 1;
                    break;
                }
            }
            if (paraBreaks(cur, lines, j)) {
                break;
            }
            para.push(stripParaIndent(cur));
            j += 1;
        }
        if (setextLevel > 0) {
            const content = para.join("\n");
            const children = parseInline(content, isFinal);
            nodes.push(headingNode(setextLevel, children));
            i = j;
            continue;
        }
        if (Number(para.length) > 0) {
            



            if (!isFinal) {
                let preOk: boolean = false;
                if (Number(para.length) >= 2) {
                    preOk = true;
                }
                if (j < Number(lines.length)) {
                    preOk = true;
                }
                if (preOk) {
                    const head = para[0];
                    if (isTableRow(head)) {
                        if (endsWithStr(head.trim(), "|")) {
                            const preCells = splitRowCells(head);
                            if (Number(preCells.length) >= 2) {
                                let allPipes: boolean = true;
                                let pi: number = 0;
                                while (pi < Number(para.length)) {
                                    const pl = para[pi].trim();
                                    if (!startsWithStr(pl, "|")) {
                                        allPipes = false;
                                    }
                                    pi += 1;
                                }
                                if (allPipes) {
                                    let preRow: WNode[] = [];
                                    for (const pc of preCells) {
                                        const pt = pc.trim();
                                        const pChildren = parseInline(pt, isFinal);
                                        preRow.push(cellNode(true, pChildren, "left"));
                                    }
                                    const preHeader = rowNode(preRow);
                                    nodes.push(tableNode([preHeader], noNodes(), true));
                                    i = j;
                                    continue;
                                }
                            }
                        }
                    }
                }
            }
            const content = para.join("\n");
            const children = parseInline(content, isFinal);
            nodes.push(paraNode(children));
            i = j;
            continue;
        }
        i += 1;
    }
    return nodes;
}

export function paraBreaks(cur: string, lines: string[], idx: number): boolean {
    if (idx == 0) {
        return false;
    }
    if (fenceMarker(cur) != "") {
        return true;
    }
    if (headingLevel(cur) > 0) {
        return true;
    }
    if (isThematicBreak(cur)) {
        return true;
    }
    if (startsBlockquote(cur)) {
        return true;
    }
    if (bulletMarker(cur) != "") {
        return true;
    }
    if (bulletMarkerBare(cur)) {
        return true;
    }
    if (olMarkerNum(cur) >= 0) {
        return true;
    }
    return false;
}

export function isParagraphStart(line: string): boolean {
    if (paraBreaks(line, [], 0)) {
        return false;
    }
    return true;
}

export function parseList(lines: string[], start: number, ordered: boolean, firstNum: number, nodes: WNode[], isFinal: boolean): number {
    let items: WNode[] = [];
    let i: number = start;
    let startN: number | null = null;
    if (ordered) {
        if (firstNum != 1) {
            startN = firstNum;
        }
    }
    while (i < Number(lines.length)) {
        const line = lines[i];
        if (isBlank(line)) {
            

            let k: number = i + 1;
            while (k < Number(lines.length)) {
                if (isBlank(lines[k])) {
                    k += 1;
                } else {
                    break;
                }
            }
            if (k < Number(lines.length)) {
                if (bulletMarker(lines[k]) != "") {
                    i = k;
                    continue;
                }
                if (bulletMarkerBare(lines[k])) {
                    i = k;
                    continue;
                }
                if (olMarkerNum(lines[k]) >= 0) {
                    i = k;
                    continue;
                }
            }
            break;
        }
        

        let markerIndent: number = 0;
        let contentStart: number = 0;
        let isItem: boolean = false;
        let orderedHere: boolean = false;
        const bm = bulletMarker(line);
        const om = olMarkerNum(line);
        if (bm != "") {
            markerIndent = indentOf(line);
            contentStart = 2 + indentOf(line);
            isItem = true;
            orderedHere = false;
        } else {
            if (bulletMarkerBare(line)) {
                markerIndent = indentOf(line);
                contentStart = 1 + indentOf(line);
                isItem = true;
                orderedHere = false;
            } else {
                if (om >= 0) {
                    markerIndent = indentOf(line);
                    const t = trimStartStr(line);
                    


                    let q: number = 0;
                    while (q < Number(t.length)) {
                        const dc = t.char_at(q);
                        if (dc >= 48) {
                            if (dc <= 57) {
                                q += 1;
                            } else {
                                break;
                            }
                        } else {
                            break;
                        }
                    }
                    let markerWidth: number = q + 1;
                    let spaces: number = 0;
                    let p2: number = q + 1;
                    while (p2 < Number(t.length)) {
                        if (t.char_at(p2) == 32) {
                            spaces += 1;
                            p2 += 1;
                        } else {
                            break;
                        }
                    }
                    if (spaces > 4) {
                        spaces = 1;
                    }
                    if (spaces < 1) {
                        spaces = 1;
                    }
                    contentStart = markerIndent + markerWidth + spaces;
                    isItem = true;
                    orderedHere = true;
                }
            }
        }
        

        if (!isItem) {
            break;
        }
        if (orderedHere != ordered) {
            break;
        }
        if (!ordered) {
            

            const t = trimStartStr(line);
            const firstChar = t.slice(0, 1);
            const firstItem = trimStartStr(lines[start]);
            const listChar = firstItem.slice(0, 1);
            if (firstChar != listChar) {
                break;
            }
        }
        


        let itemLines: string[] = [];
        let firstText = line.slice(contentStart);
        itemLines.push(firstText);
        i += 1;
        while (i < Number(lines.length)) {
            const cur = lines[i];
            if (isBlank(cur)) {
                

                let k: number = i + 1;
                while (k < Number(lines.length)) {
                    if (isBlank(lines[k])) {
                        k += 1;
                    } else {
                        break;
                    }
                }
                if (k < Number(lines.length)) {
                    if (indentWidth(lines[k]) >= contentStart) {
                        if (paraBreaks(lines[k], lines, k)) {
                            

                        } else {
                            

                        }
                        let bi: number = i;
                        while (bi < k) {
                            itemLines.push("");
                            bi += 1;
                        }
                        i = k;
                        continue;
                    }
                }
                break;
            }
            if (indentWidth(cur) >= contentStart) {
                let dedent = cur.slice(contentStart);
                itemLines.push(dedent);
                i += 1;
                continue;
            }
            

            if (!paraBreaks(cur, lines, i)) {
                itemLines.push(cur);
                i += 1;
                continue;
            }
            break;
        }
        const itemNodes = parseBlocks(itemLines, isFinal);
        items.push(itemNode(itemNodes));
    }
    if (ordered) {
        if (startN != null) {
            nodes.push(listNode(true, startN, items));
        } else {
            nodes.push(listNode(true, null, items));
        }
    } else {
        nodes.push(listNode(false, null, items));
    }
    return i;
}

export function tableConsume(lines: string[], start: number, nodes: WNode[], isFinal: boolean): number {
    const headerCells = splitRowCells(lines[start]);
    const aligns: string[] = [];
    const delimCells = splitRowCells(lines[start + 1]);
    for (const c of delimCells) {
        aligns.push(delimiterAlign(c));
    }
    let rows: WNode[] = [];
    let i: number = start + 2;
    while (i < Number(lines.length)) {
        if (!isTableRow(lines[i])) {
            break;
        }
        const cells = splitRowCells(lines[i]);
        let rowCells: WNode[] = [];
        let ci: number = 0;
        while (ci < Number(headerCells.length)) {
            let cellText: string = "";
            if (ci < Number(cells.length)) {
                cellText = cells[ci].trim();
            }
            let align: string = "left";
            if (ci < Number(aligns.length)) {
                align = aligns[ci];
            }
            let children = parseInline(cellText, isFinal);
            if (cellText == "") {
                children = noNodes();
            }
            rowCells.push(cellNode(false, children, align));
            ci += 1;
        }
        rows.push(rowNode(rowCells));
        i += 1;
    }
    let headerRowCells: WNode[] = [];
    let ci: number = 0;
    while (ci < Number(headerCells.length)) {
        const cellText = headerCells[ci].trim();
        let align: string = "left";
        if (ci < Number(aligns.length)) {
            align = aligns[ci];
        }
        const children = parseInline(cellText, isFinal);
        headerRowCells.push(cellNode(true, children, align));
        ci += 1;
    }
    const header = rowNode(headerRowCells);
    nodes.push(tableNode([header], rows, false));
    return i;
}

export function parseInline(text: string, isFinal: boolean): WNode[] {
    if (text == "") {
        return noNodes();
    }
    return parseInlineLine(text, isFinal);
}

export function parseInlineLine(line: string, isFinal: boolean): WNode[] {
    let nodes: WNode[] = [];
    let buf: string = "";
    let i: number = 0;
    let seenCode: boolean = false;
    while (i < Number(line.length)) {
        const cs = line.slice(i, i + 1);
        


        if (cs == "\n") {
            let sp: number = 0;
            while (sp < Number(buf.length)) {
                if (buf.char_at(Number(buf.length) - 1 - sp) == 32) {
                    sp += 1;
                } else {
                    break;
                }
            }
            if (sp >= 2) {
                const kept = buf.slice(0, Number(buf.length) - sp);
                if (kept != "") {
                    nodes.push(textNode(kept));
                }
                nodes.push(hardbreakNode());
                buf = "";
            } else {
                if (sp > 0) {
                    buf = buf.slice(0, Number(buf.length) - sp);
                }
                buf = buf + "\n";
            }
            i += 1;
            continue;
        }
        


        if (cs == "*") {
            if (startsWithAt(line, "**", i)) {
                let after = scanDelim(line, i, "**", true, isFinal);
                if (after != null) {
                    const sc = after ?? DelimScan(0, "");
                    if (buf != "") {
                        nodes.push(textNode(buf));
                        buf = "";
                    }
                    nodes.push(strongNode(parseInlineLine(sc.inner, isFinal)));
                    i = sc.next;
                    continue;
                }
            }
            let afterEm = scanDelim(line, i, "*", false, isFinal);
            if (afterEm != null) {
                const scEm = afterEm ?? DelimScan(0, "");
                if (buf != "") {
                    nodes.push(textNode(buf));
                    buf = "";
                }
                nodes.push(emNode(parseInlineLine(scEm.inner, isFinal)));
                i = scEm.next;
                continue;
            }
            buf = buf + cs;
            i += 1;
            continue;
        }
        if (cs == "_") {
            let afterU = scanDelim(line, i, "_", false, isFinal);
            if (afterU != null) {
                const scU = afterU ?? DelimScan(0, "");
                if (buf != "") {
                    nodes.push(textNode(buf));
                    buf = "";
                }
                nodes.push(emNode(parseInlineLine(scU.inner, isFinal)));
                i = scU.next;
                continue;
            }
            buf = buf + cs;
            i += 1;
            continue;
        }
        if (cs == "~") {
            if (startsWithAt(line, "~~", i)) {
                let afterS = scanDelim(line, i, "~~", false, isFinal);
                if (afterS != null) {
                    const scS = afterS ?? DelimScan(0, "");
                    if (buf != "") {
                        nodes.push(textNode(buf));
                        buf = "";
                    }
                    nodes.push(strikeNode(parseInlineLine(scS.inner, isFinal)));
                    i = scS.next;
                    continue;
                }
            }
            buf = buf + cs;
            i += 1;
            continue;
        }
        


        if (cs == "`") {
            let run: number = 0;
            while (startsWithAt(line, "`", i + run)) {
                run += 1;
            }
            let close = findBacktickRun(line, i + run, run);
            if (close != -1) {
                let inner = line.slice(i + run, close);
                if (startsWithStr(inner, " ")) {
                    if (endsWithStr(inner, " ")) {
                        if (inner.trim() != "") {
                            inner = inner.slice(1, Number(inner.length) - 1);
                        }
                    }
                }
                if (buf != "") {
                    nodes.push(textNode(buf));
                    buf = "";
                }
                nodes.push(codeSpanNode(inner));
                seenCode = true;
                i = close + run;
                continue;
            }
            


            if (!isFinal) {
                if (run == 1) {
                    const restAll = line.slice(i + run);
                    if (restAll.trim() == "") {
                        if (buf == "") {
                            i = Number(line.length);
                            continue;
                        }
                    }
                }
            }
            if (run == 1) {
                if (!isFinal) {
                    


                    const rest = line.slice(i + 1);
                    if (buf != "") {
                        nodes.push(textNode(buf));
                        buf = "";
                    }
                    nodes.push(codeSpanNode(rest));
                    seenCode = true;
                    i = Number(line.length);
                    continue;
                }
            }
            


            buf = buf + line.slice(i, i + run);
            i = i + run;
            continue;
        }
        


        if (cs == "!") {
            if (startsWithAt(line, "![", i)) {
                let imgAfter = scanLink(line, i + 1, isFinal, seenCode);
                if (imgAfter != null) {
                    const img = imgAfter ?? LinkScan(0, "", "", false, null, "");
                    if (buf != "") {
                        nodes.push(textNode(buf));
                        buf = "";
                    }
                    nodes.push(imageNode(img.href, img.text));
                    i = img.next;
                    continue;
                }
            }
            buf = buf + cs;
            i += 1;
            continue;
        }
        


        if (cs == "[") {
            let after = scanLink(line, i, isFinal, seenCode);
            if (after != null) {
                const lk = after ?? LinkScan(0, "", "", false, null, "");
                if (buf != "") {
                    nodes.push(textNode(buf));
                    buf = "";
                }
                if (lk.loading) {
                    

                    nodes.push(linkNode(lk.href, lk.title, lk.text, parseInlineLine(lk.text, isFinal), true));
                    if (lk.tail != "") {
                        nodes.push(textNode(lk.tail));
                    }
                } else {
                    nodes.push(linkNode(lk.href, lk.title, lk.text, parseInlineLine(lk.text, isFinal), false));
                }
                i = lk.next;
                continue;
            }
            buf = buf + cs;
            i += 1;
            continue;
        }
        



        if (cs == "\\") {
            if (i + 1 < Number(line.length)) {
                const nc = line.char_at(i + 1);
                if (isPunctuationCode(nc)) {
                    if (nc == 34) {
                        buf = buf + String.fromCharCode(1);
                    } else {
                        if (nc == 39) {
                            buf = buf + String.fromCharCode(2);
                        } else {
                            buf = buf + line.slice(i + 1, i + 2);
                        }
                    }
                    i += 2;
                    continue;
                }
            }
        }
        

        buf = buf + cs;
        i += 1;
    }
    if (buf != "") {
        nodes.push(textNode(buf));
    }
    if (!isFinal) {
        trimStreamingTail(nodes);
    }
    return nodes;
}

export function trimStreamingTail(nodes: WNode[]): void {
    if (Number(nodes.length) > 0) {
        const last = nodes[Number(nodes.length) - 1];
        if (last.type == "text") {
            trimLastTextNode(last, nodes);
        }
    }
}

export function stripTrailingPartialTag(s: string): string {
    let lastGt: number = -1;
    let i: number = 0;
    while (i < Number(s.length)) {
        if (s.char_at(i) == 62) {
            lastGt = i;
        }
        i += 1;
    }
    let j: number = lastGt + 1;
    while (j < Number(s.length)) {
        if (s.char_at(j) == 60) {
            let p: number = j + 1;
            if (p >= Number(s.length)) {
                return s;
            }
            let c = s.char_at(p);
            if (c == 47) {
                p += 1;
                if (p >= Number(s.length)) {
                    return s;
                }
                c = s.char_at(p);
            }
            let isLetter: boolean = false;
            if (c == 33) {
                isLetter = true;
            } else {
                if (c >= 65) {
                    if (c <= 90) {
                        isLetter = true;
                    }
                }
                if (c >= 97) {
                    if (c <= 122) {
                        isLetter = true;
                    }
                }
            }
            if (!isLetter) {
                return s;
            }
            let q: number = p + 1;
            let clean: boolean = true;
            while (q < Number(s.length)) {
                if (s.char_at(q) == 62) {
                    clean = false;
                    break;
                }
                q += 1;
            }
            if (!clean) {
                return s;
            }
            let cut: number = j;
            if (j > 0) {
                if (s.char_at(j - 1) == 32) {
                    cut = j - 1;
                }
            }
            return s.slice(0, cut);
        }
        j += 1;
    }
    return s;
}

export function stripTrailingOpenParens(s: string): string {
    let end: number = Number(s.length);
    while (end > 0) {
        const c = s.char_at(end - 1);
        if (c == 32) {
            end -= 1;
        } else {
            if (c == 9) {
                end -= 1;
            } else {
                if (c == 10) {
                    end -= 1;
                } else {
                    if (c == 13) {
                        end -= 1;
                    } else {
                        break;
                    }
                }
            }
        }
    }
    let start: number = end;
    while (start > 0) {
        if (s.char_at(start - 1) == 40) {
            start -= 1;
        } else {
            break;
        }
    }
    if (start == end) {
        return s;
    }
    return s.slice(0, start);
}

export function stripTrailingStarSpaces(s: string): string {
    let end: number = Number(s.length);
    while (end > 0) {
        if (s.char_at(end - 1) == 32) {
            end -= 1;
        } else {
            break;
        }
    }
    if (end == Number(s.length)) {
        return s;
    }
    if (end == 0) {
        return s;
    }
    if (s.char_at(end - 1) == 42) {
        return s.slice(0, end - 1);
    }
    return s;
}

export function stripTrailingSpaces(s: string): string {
    let end: number = Number(s.length);
    while (end > 0) {
        if (s.char_at(end - 1) == 32) {
            end -= 1;
        } else {
            break;
        }
    }
    if (end == Number(s.length)) {
        return s;
    }
    return s.slice(0, end);
}

export function trimLastTextNode(last: WNode, nodes: WNode[]): void {
    let c: string | null = last.content ?? "";
    let stripped: boolean = false;
    let c2 = stripTrailingPartialTag(c);
    if (c2 == c) {
        

        if (endsWithStr(c, "<")) {
            c2 = c.slice(0, Number(c.length) - 1);
        }
    }
    if (c2 != c) {
        stripped = true;
    }
    c = c2;
    let c3 = stripTrailingOpenParens(c);
    if (c3 != c) {
        stripped = true;
    }
    c = c3;
    let c4 = stripTrailingStarSpaces(c);
    if (c4 == c) {
        if (endsWithStr(c, "*")) {
            if (!endsWithStr(c, "**")) {
                c4 = c.slice(0, Number(c.length) - 1);
            }
        }
    }
    if (c4 != c) {
        stripped = true;
    }
    c = c4;
    if (!stripped) {
        c = stripTrailingSpaces(c);
    }
    if (c.trim() == "|") {
        

        c = "";
    }
    if (c == "") {
        nodes.pop();
    } else {
        nodes.pop();
        nodes.push(rawTextNode(c));
    }
}

export function textNode(content: string): WNode {
    let s = smartQuotes(content);
    

    s = s.split(String.fromCharCode(1)).join("\"");
    s = s.split(String.fromCharCode(2)).join("'");
    return WNode("text", s, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null);
}

export function isWordCharCode(c: number): boolean {
    if (c >= 48) {
        if (c <= 57) {
            return true;
        }
    }
    if (c >= 65) {
        if (c <= 90) {
            return true;
        }
    }
    if (c >= 97) {
        if (c <= 122) {
            return true;
        }
    }
    if (c == 95) {
        return true;
    }
    return false;
}

export function isClosePunctCode(c: number): boolean {
    if (c == 41) {
        return true;
    }
    if (c == 93) {
        return true;
    }
    if (c == 125) {
        return true;
    }
    if (c == 44) {
        return true;
    }
    if (c == 46) {
        return true;
    }
    if (c == 59) {
        return true;
    }
    if (c == 58) {
        return true;
    }
    if (c == 33) {
        return true;
    }
    if (c == 63) {
        return true;
    }
    if (c == 8230) {
        return true;
    }
    if (c == 34) {
        return true;
    }
    if (c == 39) {
        return true;
    }
    if (c == 65289) {
        return true;
    }
    if (c == 65292) {
        return true;
    }
    if (c == 65294) {
        return true;
    }
    if (c == 12290) {
        return true;
    }
    if (c == 65307) {
        return true;
    }
    if (c == 65306) {
        return true;
    }
    if (c == 65301) {
        return true;
    }
    if (c == 65311) {
        return true;
    }
    if (c == 12301) {
        return true;
    }
    if (c == 12303) {
        return true;
    }
    if (c == 12313) {
        return true;
    }
    if (c == 12311) {
        return true;
    }
    return false;
}

export function isPunctuationCode(c: number): boolean {
    if (c >= 33) {
        if (c <= 47) {
            return true;
        }
    }
    if (c >= 58) {
        if (c <= 64) {
            return true;
        }
    }
    if (c >= 91) {
        if (c <= 96) {
            return true;
        }
    }
    if (c >= 123) {
        if (c <= 126) {
            return true;
        }
    }
    if (c == 161) {
        return true;
    }
    if (c == 167) {
        return true;
    }
    if (c == 171) {
        return true;
    }
    if (c == 182) {
        return true;
    }
    if (c == 183) {
        return true;
    }
    if (c == 191) {
        return true;
    }
    if (c >= 8208) {
        if (c <= 8286) {
            return true;
        }
    }
    if (c >= 12288) {
        if (c <= 12351) {
            return true;
        }
    }
    if (c >= 65281) {
        if (c <= 65380) {
            return true;
        }
    }
    return false;
}

export function CURLY_LDQUO(): string {
    return String.fromCharCode(8220);
}

export function CURLY_RDQUO(): string {
    return String.fromCharCode(8221);
}

export function CURLY_LSQUO(): string {
    return String.fromCharCode(8216);
}

export function CURLY_RSQUO(): string {
    return String.fromCharCode(8217);
}

export function smartQuotes(s: string): string {
    let out: string = "";
    let i: number = 0;
    while (i < Number(s.length)) {
        const cs = s.slice(i, i + 1);
        if (cs == "\"") {
            let prevIsOpenCtx: boolean = false;
            if (out == "") {
                prevIsOpenCtx = true;
            } else {
                const prev = out.slice(Number(out.length) - 1, Number(out.length));
                if (prev == " ") {
                    prevIsOpenCtx = true;
                }
                if (prev == "\n") {
                    prevIsOpenCtx = true;
                }
                if (prev == "(") {
                    prevIsOpenCtx = true;
                }
                if (prev == "[") {
                    prevIsOpenCtx = true;
                }
                if (prev == "{") {
                    prevIsOpenCtx = true;
                }
            }
            if (prevIsOpenCtx) {
                out = out + CURLY_LDQUO();
                i += 1;
                continue;
            }
            

            if (i + 1 >= Number(s.length)) {
                out = out + CURLY_RDQUO();
                i += 1;
                continue;
            }
            const nc = s.char_at(i + 1);
            if (nc == 32) {
                out = out + CURLY_RDQUO();
            } else {
                if (nc == 10) {
                    out = out + CURLY_RDQUO();
                } else {
                    if (isClosePunctCode(nc)) {
                        out = out + CURLY_RDQUO();
                    } else {
                        out = out + cs;
                    }
                }
            }
            i += 1;
            continue;
        }
        if (cs == "'") {
            let apostrophe: boolean = false;
            if (i > 0) {
                if (i + 1 < Number(s.length)) {
                    const pc = s.char_at(i - 1);
                    const ncc = s.char_at(i + 1);
                    const pWord = isWordCharCode(pc);
                    const nWord = isWordCharCode(ncc);
                    if (pWord) {
                        if (nWord) {
                            apostrophe = true;
                        }
                    }
                }
            }
            if (apostrophe) {
                out = out + CURLY_RSQUO();
            } else {
                let openS: boolean = false;
                if (out == "") {
                    openS = true;
                } else {
                    const prev2 = out.slice(Number(out.length) - 1, Number(out.length));
                    if (prev2 == " ") {
                        openS = true;
                    }
                    if (prev2 == "\n") {
                        openS = true;
                    }
                    if (prev2 == "(") {
                        openS = true;
                    }
                    if (prev2 == "[") {
                        openS = true;
                    }
                }
                if (openS) {
                    out = out + CURLY_LSQUO();
                } else {
                    out = out + CURLY_RSQUO();
                }
            }
            i += 1;
            continue;
        }
        out = out + cs;
        i += 1;
    }
    return out;
}

export function scanDelim(line: string, i: number, delim: string, autoCloseWhenFinal: boolean, isFinal: boolean): DelimScan | null {
    


    if (delim == "_") {
        if (i > 0) {
            const pc = line.char_at(i - 1);
            if (isWordCharCode(pc)) {
                return null;
            }
        }
    }
    const afterStart: number = i + Number(delim.length);
    const inner = line.slice(afterStart);
    let close = findStr(inner, delim);
    let innerText = inner;
    if (close != -1) {
        innerText = inner.slice(0, close);
    }
    if (innerText == "") {
        

        return null;
    }
    if (isPunctuationCode(innerText.char_at(0))) {
        



        return null;
    }
    if (close != -1) {
        let next: number = afterStart + close + Number(delim.length);
        return DelimScan(next, innerText);
    }
    if (!autoCloseWhenFinal) {
        if (isFinal) {
            return null;
        }
    }
    

    if (inner == "") {
        return null;
    }
    if (inner.char_at(0) == 32) {
        return null;
    }
    return DelimScan(Number(line.length), inner);
}

export function findBacktickRun(line: string, from: number, count: number): number {
    let i: number = from;
    while (i < Number(line.length)) {
        if (line.char_at(i) != 96) {
            i += 1;
            continue;
        }
        let run: number = 0;
        while (startsWithAt(line, "`", i + run)) {
            run += 1;
        }
        if (run == count) {
            return i;
        }
        i = i + run;
    }
    return -1;
}

export function stripTrailingUrlPunct(s: string): string {
    let end: number = Number(s.length);
    while (end > 0) {
        const c = s.char_at(end - 1);
        if (c == 46) {
            end -= 1;
        } else {
            if (c == 44) {
                end -= 1;
            } else {
                if (c == 58) {
                    end -= 1;
                } else {
                    if (c == 59) {
                        end -= 1;
                    } else {
                        if (c == 33) {
                            end -= 1;
                        } else {
                            if (c == 63) {
                                end -= 1;
                            } else {
                                if (c == 41) {
                                    end -= 1;
                                } else {
                                    break;
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    if (end == Number(s.length)) {
        return s;
    }
    return s.slice(0, end);
}

export function isHttpUrl(s: string): boolean {
    if (startsWithStr(s, "http://")) {
        if (Number(s.length) > 7) {
            return true;
        }
    }
    if (startsWithStr(s, "https://")) {
        if (Number(s.length) > 8) {
            return true;
        }
    }
    return false;
}

export function isBareDomain(s: string): boolean {
    if (Number(s.length) == 0) {
        return false;
    }
    let dot: number = -1;
    let i: number = 0;
    while (i < Number(s.length)) {
        const c = s.char_at(i);
        let ok: boolean = false;
        if (c >= 48) {
            if (c <= 57) {
                ok = true;
            }
        }
        if (c >= 65) {
            if (c <= 90) {
                ok = true;
            }
        }
        if (c >= 97) {
            if (c <= 122) {
                ok = true;
            }
        }
        if (c == 45) {
            ok = true;
        }
        if (c == 46) {
            ok = true;
            dot = i;
        }
        if (!ok) {
            return false;
        }
        i += 1;
    }
    if (dot <= 0) {
        return false;
    }
    let letters: number = 0;
    let j: number = dot + 1;
    while (j < Number(s.length)) {
        const c = s.char_at(j);
        if (c >= 65) {
            if (c <= 90) {
                letters += 1;
            } else {
                return false;
            }
        } else {
            if (c >= 97) {
                if (c <= 122) {
                    letters += 1;
                } else {
                    return false;
                }
            } else {
                return false;
            }
        }
        j += 1;
    }
    if (letters < 2) {
        return false;
    }
    return true;
}

export function scanLink(line: string, i: number, isFinal: boolean, seenCode: boolean): LinkScan | null {
    let close = findStrFrom(line, "]", i);
    if (close == -1) {
        return null;
    }
    const text = line.slice(i + 1, close);
    let after: number = close + 1;
    if (!startsWithAt(line, "(", after)) {
        return null;
    }
    let end = findStrFrom(line, ")", after);
    if (end == -1) {
        



        const frag = line.slice(after + 1);
        if (isHttpUrl(frag)) {
            let urlHref = stripTrailingUrlPunct(frag);
            let tailText = frag.slice(Number(urlHref.length));
            let urlTitle: string | null = "";
            if (seenCode) {
                urlTitle = null;
            }
            return LinkScan(Number(line.length), text, urlHref, true, urlTitle, tailText);
        }
        if (isBareDomain(frag)) {
            return LinkScan(Number(line.length), text, "http://" + frag, true, null, "");
        }
        return LinkScan(Number(line.length), text, "", true, null, "");
    }
    let inner = line.slice(after + 1, end);
    let href = inner;
    let title: string | null = null;
    const sp = findStr(inner, " \"");
    if (sp != -1) {
        href = inner.slice(0, sp);
        const titlePart = inner.slice(sp + 2);
        if (endsWithStr(titlePart, "\"")) {
            title = titlePart.slice(0, Number(titlePart.length) - 1);
        }
    } else {
        




        let lineTail: boolean = end + 1 >= Number(line.length);
        if (!lineTail) {
            if (!seenCode) {
                title = "";
            }
        }
    }
    return LinkScan(end + 1, text, href, false, title, "");
}

export function extractAnchorBlock(text: string): string {
    const t = text.trim();
    const parts = t.split(" ");
    const n: number = Number(parts.length);
    if (n < 2) {
        return "";
    }
    const last = parts[n - 1];
    if (Number(last.length) < 2) {
        return "";
    }
    if (last.slice(0, 1) != "^") {
        return "";
    }
    const body = last.slice(1);
    const alphabet: string = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-";
    for (let i = 0; i < Number(body.length); i++) {
        const ch = body.slice(i, i + 1);
        let ok: boolean = false;
        for (let j = 0; j < Number(alphabet.length); j++) {
            if (alphabet.slice(j, j + 1) == ch) {
                ok = true;
            }
        }
        if (!ok) {
            return "";
        }
    }
    return body;
}

export function convertInlines(wnodes: WNode[], marks: Mark[]): InlineSpan[] {
    let out: InlineSpan[] = [];
    for (const w of wnodes) {
        const t: string = w.type;
        if (t == "text") {
            out.push(spanWith(w.content ?? "", marks, []));
        }
        if (t == "strong") {
            for (const s of convertInlines(w.children ?? noNodes(), addMark(marks, Mark.Strong))) {
                out.push(s);
            }
        }
        if (t == "emphasis") {
            for (const s of convertInlines(w.children ?? noNodes(), addMark(marks, Mark.Em))) {
                out.push(s);
            }
        }
        if (t == "strikethrough") {
            for (const s of convertInlines(w.children ?? noNodes(), addMark(marks, Mark.Del))) {
                out.push(s);
            }
        }
        if (t == "inline_code") {
            out.push(spanWith(w.code ?? "", addMark(marks, Mark.Code), []));
        }
        if (t == "hardbreak") {
            out.push(spanWith("\n", marks, []));
        }
        if (t == "link") {
            let lattrs: Attr[] = [];
            lattrs = attrSet(lattrs, "href", Value.Str(w.href ?? ""));
            const title = w.title;
            if (title != null) {
                lattrs = attrSet(lattrs, "title", Value.Str(title ?? ""));
            }
            for (const s of convertInlines(w.children ?? noNodes(), addMark(marks, Mark.Link))) {
                out.push(spanWith(s.text, s.marks, lattrs));
            }
        }
        if (t == "image") {
            let iattrs: Attr[] = [];
            iattrs = attrSet(iattrs, "src", Value.Str(w.src ?? ""));
            iattrs = attrSet(iattrs, "alt", Value.Str(w.alt ?? ""));
            const ititle = w.title;
            if (ititle != null) {
                iattrs = attrSet(iattrs, "title", Value.Str(ititle ?? ""));
            }
            out.push(spanWith(w.alt ?? "", addMark(marks, Mark.Image), iattrs));
        }
    }
    return out;
}

export function convertTableCell(wnode: WNode, id: string): BlockNode {
    let attrs: Attr[] = [];
    attrs = attrSet(attrs, "header", Value.Bool(wnode.isHeader ?? false));
    attrs = attrSet(attrs, "align", Value.Str(wnode.align ?? "left"));
    return blockFull(id, BlockType.TableCell, attrs, [], convertInlines(wnode.children ?? noNodes(), []), rng(0, 0));
}

export function convertTableRow(wnode: WNode, id: string): BlockNode {
    const cells: WNode[] | null = wnode.cells ?? noNodes();
    let kids: BlockNode[] = [];
    for (let ci = 0; ci < Number(cells.length); ci++) {
        kids.push(convertTableCell(cells[ci], id + "-c" + String(ci)));
    }
    return blockFull(id, BlockType.TableRow, [], kids, [], rng(0, 0));
}

export function convertBlock(wnode: WNode, id: string): BlockNode {
    const t: string = wnode.type;
    if (t == "heading") {
        let attrs: Attr[] = [];
        attrs = attrSet(attrs, "level", Value.Int(wnode.level ?? 0));
        return blockFull(id, BlockType.Heading, attrs, [], convertInlines(wnode.children ?? noNodes(), []), rng(0, 0));
    }
    if (t == "code_block") {
        let attrs2: Attr[] = [];
        attrs2 = attrSet(attrs2, "language", Value.Str(wnode.language ?? ""));
        attrs2 = attrSet(attrs2, "loading", Value.Bool(wnode.loading ?? false));
        return blockFull(id, BlockType.Fence, attrs2, [], [span(wnode.code ?? "")], rng(0, 0));
    }
    if (t == "blockquote") {
        return blockFull(id, BlockType.Blockquote, [], convertChildren(wnode.children ?? noNodes(), id), [], rng(0, 0));
    }
    if (t == "list") {
        let attrs3: Attr[] = [];
        attrs3 = attrSet(attrs3, "ordered", Value.Bool(wnode.ordered ?? false));
        const start: number | null = wnode.start;
        if (start != null) {
            attrs3 = attrSet(attrs3, "start", Value.Int(start ?? 0));
        }
        return blockFull(id, BlockType.ListBlock, attrs3, convertChildren(wnode.items ?? noNodes(), id), [], rng(0, 0));
    }
    if (t == "list_item") {
        return blockFull(id, BlockType.ListItem, [], convertChildren(wnode.children ?? noNodes(), id), [], rng(0, 0));
    }
    if (t == "table") {
        let kids: BlockNode[] = [];
        const hdr: WNode[] | null = wnode.header ?? noNodes();
        if (Number(hdr.length) > 0) {
            kids.push(convertTableRow(hdr[0], id + "-h"));
        }
        const rows: WNode[] | null = wnode.rows ?? noNodes();
        for (let ri = 0; ri < Number(rows.length); ri++) {
            kids.push(convertTableRow(rows[ri], id + "-r" + String(ri)));
        }
        let attrs4: Attr[] = [];
        attrs4 = attrSet(attrs4, "loading", Value.Bool(wnode.loading ?? false));
        return blockFull(id, BlockType.Table, attrs4, kids, [], rng(0, 0));
    }
    if (t == "thematic_break") {
        return blockFull(id, BlockType.ThematicBreak, [], [], [], rng(0, 0));
    }
    

    return blockFull(id, BlockType.Paragraph, [], [], convertInlines(wnode.children ?? noNodes(), []), rng(0, 0));
}

export function convertChildren(wchildren: WNode[], parentId: string): BlockNode[] {
    let out: BlockNode[] = [];
    for (let i = 0; i < Number(wchildren.length); i++) {
        out.push(convertBlock(wchildren[i], parentId + "-" + String(i)));
    }
    return out;
}

export function intListToValue(arr: (number | null)[]): Value {
    let out: Value[] = [];
    let i: number = 0;
    while (i < Number(arr.length)) {
        const v = arr[i];
        if (v == null) {
            out.push(Value.Null());
        } else {
            out.push(Value.Int(v ?? 0));
        }
        i += 1;
    }
    return Value.ListV(out);
}

export function attachIAL(blocks: BlockNode[], ialAttrs: TableAttr[]): BlockNode[] {
    let out: BlockNode[] = [];
    let ti: number = 0;
    for (const b of blocks) {
        if (b.kind == BlockType.Table) {
            if (ti < Number(ialAttrs.length)) {
                const ta = ialAttrs[ti];
                const cols = intListToValue(ta.cols);
                const rows = intListToValue(ta.rows);
                let ialPair: Attr[] = [];
                ialPair.push(attrOf("cols", cols));
                ialPair.push(attrOf("rows", rows));
                out.push(blockFull(b.id, b.kind, attrSet(b.attrs, "ial", Value.AttrsV(ialPair)), b.children, b.inlines, b.source));
                ti += 1;
            } else {
                out.push(b);
            }
        } else {
            out.push(b);
        }
    }
    return out;
}

export function withAnchorId(node: BlockNode, fallbackId: string): BlockNode {
    const anchor = extractAnchorBlock(spansText(node.inlines));
    if (anchor == "") {
        return node;
    }
    return blockFull(anchor, node.kind, node.attrs, node.children, node.inlines, node.source);
}

export function parse_blocks(src: string, isFinal: boolean): BlockNode {
    const pre = preprocessMarkdown(src);
    const preMd = pre.md;
    const weak = parseDocument(preMd, isFinal);
    let kids: BlockNode[] = [];
    for (let i = 0; i < Number(weak.length); i++) {
        const fallback: string = "block-" + String(i);
        kids.push(withAnchorId(convertBlock(weak[i], fallback), fallback));
    }
    const withIal = attachIAL(kids, pre.tableAttrs);
    return blockFull("doc", BlockType.Paragraph, [], withIal, [], rng(0, 0));
}