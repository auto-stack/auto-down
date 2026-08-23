/**
 * @autodown/vue — incremental markdown parser (semantic subset).
 *
 * GENERATED FILE — do not edit by hand.
 * Source: auto/markdown_parser.at (Auto language). Regenerate with: pnpm gen
 * (see auto/README.md for the pipeline and the applied post-fixes)
 */

export function normalizeNewlines(src: string): string {
    const s = src.replace(RegExp("\r\n", "g"), "\n");
    return s.replace(RegExp("\r", "g"), "\n");
}

export function stripDanglingTail(src: string, final: boolean): string {
    if (final) {
        return src;
    }
    let s: string = src;
    let changed: boolean = true;
    while (changed) {
        changed = false;
        const stripped = s.replace(RegExp("\n {0,3}([-*+]|\\d{1,9}[.)]) *$", ""), "");
        if (stripped != s) {
            s = stripped;
            changed = true;
        }
        const strippedQuote = s.replace(RegExp("\n {0,3}> *$", ""), "");
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
    while (n < line.length) {
        const ch = line[n];
        if (ch == " ") {
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
    while (i < s.length) {
        const ch = s[i];
        if (ch == " ") {
            n += 1;
        } else {
            if (ch == "\t") {
                n += 4;
            } else {
                break;
            }
        }
        i += 1;
    }
    return n;
}

export function parseDocument(src: string, final: boolean): any[] {
    const normalized = normalizeNewlines(src);
    const safe = stripDanglingTail(normalized, final);
    const lines = safe.split("\n");
    return parseBlocks(lines, final);
}

export function fenceMarker(line: string): string {
    if (indentWidth(line) >= 4) {
        return "";
    }
    const t = line.trim();
    if (t.startsWith("```")) {
        return "`";
    }
    if (t.startsWith("~~~")) {
        return "~";
    }
    return "";
}

export function fenceMarkerRun(line: string): string {
    const t = line.trim();
    let run: string = "";
    let i: number = 0;
    const first = t[0];
    if (first != "`") {
        if (first != "~") {
            return "";
        }
    }
    while (i < t.length) {
        const ch = t[i];
        if (ch == first) {
            run = run + ch;
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
    if (t.length != run.length) {
        return false;
    }
    let i: number = 0;
    while (i < t.length) {
        if (t[i] != marker) {
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
    while (level < t.length) {
        if (t[level] == "#") {
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
    if (level == t.length) {
        return level;
    }
    const after = t[level];
    if (after != " ") {
        return 0;
    }
    return level;
}

export function stripTrailingHashes(t: string): string {
    const trimmed = t.trim();
    const m = trimmed.match(RegExp("^(.*?)( #{1,})#*$"));
    if (m == null) {
        return trimmed;
    }
    const body = m[1];
    return body.trimEnd();
}

export function olMarkerNum(line: string): number {
    if (indentWidth(line) >= 4) {
        return -1;
    }
    const m = line.match(RegExp("^ {0,3}(\\d{1,9})[.)] |^ {0,3}(\\d{1,9})[.)]$"));
    if (m == null) {
        return -1;
    }
    if (m[1] != null) {
        return parseInt(m[1], 10);
    }
    return parseInt(m[2], 10);
}

export function bulletMarker(line: string): string {
    if (indentWidth(line) >= 4) {
        return "";
    }
    const m = line.match(RegExp("^ {0,3}([-*+]) "));
    if (m == null) {
        return "";
    }
    return m[1];
}

export function bulletMarkerBare(line: string): boolean {
    if (indentWidth(line) >= 4) {
        return false;
    }
    const m = line.match(RegExp("^ {0,3}[-*+]$"));
    if (m == null) {
        return false;
    }
    return true;
}

export function isThematicBreak(line: string): boolean {
    if (indentWidth(line) >= 4) {
        return false;
    }
    const t = line.trim();
    if (t.length < 3) {
        return false;
    }
    const first = t[0];
    if (first != "-") {
        if (first != "*") {
            if (first != "_") {
                return false;
            }
        }
    }
    let count: number = 0;
    let i: number = 0;
    while (i < t.length) {
        const ch = t[i];
        if (ch == first) {
            count += 1;
        } else {
            if (ch != " ") {
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
    if (t.length == 0) {
        return 0;
    }
    const first = t[0];
    if (first != "=") {
        if (first != "-") {
            return 0;
        }
    }
    let i: number = 0;
    while (i < t.length) {
        if (t[i] != first) {
            return 0;
        }
        i += 1;
    }
    if (first == "=") {
        return 1;
    }
    return 2;
}

export function startsBlockquote(line: string): boolean {
    if (indentWidth(line) >= 4) {
        return false;
    }
    return line.trimStart().startsWith(">");
}

export function quoteBody(line: string): string {
    const t = line.trimStart();
    const rest = t.slice(1);
    if (rest.startsWith(" ")) {
        return rest.slice(1);
    }
    return rest;
}

export function isTableRow(line: string): boolean {
    if (isBlank(line)) {
        return false;
    }
    return line.includes("|");
}

export function isTableDelimiter(line: string): boolean {
    if (isBlank(line)) {
        return false;
    }
    if (!line.includes("-")) {
        return false;
    }
    


    const cells = splitRowCells(line);
    if (cells.length == 0) {
        return false;
    }
    for (const c of cells) {
        const t = c.trim();
        const m = t.match(RegExp("^:?-+:?$"));
        if (m == null) {
            return false;
        }
    }
    return true;
}

export function splitRowCells(line: string): string[] {
    let t = line.trim();
    if (t.startsWith("|")) {
        t = t.slice(1);
    }
    if (t.endsWith("|")) {
        t = t.slice(0, t.length - 1);
    }
    return t.split("|");
}

export function delimiterAlign(cell: string): string {
    const t = cell.trim();
    const left = t.startsWith(":");
    const right = t.endsWith(":");
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

export function parseBlocks(lines: string[], final: boolean): any[] {
    let nodes: any[] = [];
    let i: number = 0;
    while (i < lines.length) {
        const line = lines[i];
        if (isBlank(line)) {
            i += 1;
            continue;
        }
        


        const mk = fenceMarker(line);
        if (mk != "") {
            const run = fenceMarkerRun(line);
            const info = line.trim().slice(run.length);
            const language = info.trim();
            let body: string[] = [];
            let j: number = i + 1;
            let closed: boolean = false;
            while (j < lines.length) {
                if (isCloseFence(lines[j], mk, run)) {
                    closed = true;
                    break;
                }
                body.push(lines[j]);
                j += 1;
            }
            let code = body.join("\n");
            if (closed) {
                if (body.length > 0) {
                    code = code + "\n";
                } else {
                    code = "";
                }
                nodes.push({ type: "code_block", language: language, code: code, loading: false });
            } else {
                


                while (body.length > 0) {
                    const tailLine = body[body.length - 1].trim();
                    if (tailLine == "") {
                        break;
                    }
                    const fenceTail = tailLine.match(RegExp("^[`~]+$"));
                    if (fenceTail == null) {
                        break;
                    }
                    body.pop();
                }
                let openCode = body.join("\n");
                


                openCode = openCode.replace(RegExp("\n +$"), "\n");
                nodes.push({ type: "code_block", language: language, code: openCode, loading: !final });
            }
            i = j + 1;
            continue;
        }
        


        const hlevel = headingLevel(line);
        if (hlevel > 0) {
            const t = line.trim();
            const content = t.slice(hlevel).trim();
            const clean = stripTrailingHashes(content);
            let children = parseInline(clean, final);
            if (clean == "") {
                children = [];
            }
            nodes.push({ type: "heading", level: hlevel, children: children });
            i += 1;
            continue;
        }
        


        if (isThematicBreak(line)) {
            nodes.push({ type: "thematic_break" });
            i += 1;
            continue;
        }
        


        if (startsBlockquote(line)) {
            let qlines: string[] = [];
            let j: number = i;
            while (j < lines.length) {
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
            const inner = parseBlocks(qlines, final);
            nodes.push({ type: "blockquote", children: inner });
            i = j;
            continue;
        }
        


        if (isTableRow(line)) {
            if (i + 1 < lines.length) {
                if (isTableDelimiter(lines[i + 1])) {
                    



                    const headCount = splitRowCells(line).length;
                    const delimCount = splitRowCells(lines[i + 1]).length;
                    if (headCount == delimCount) {
                        let tableEnd = tableConsume(lines, i, nodes, final);
                        i = tableEnd;
                        continue;
                    }
                }
            }
        }
        


        const bnum = olMarkerNum(line);
        const bmark = bulletMarker(line);
        if (bnum >= 0) {
            let listEnd = parseList(lines, i, true, bnum, nodes, final);
            i = listEnd;
            continue;
        }
        if (bmark != "") {
            let listEnd2 = parseList(lines, i, false, 0, nodes, final);
            i = listEnd2;
            continue;
        }
        if (bulletMarkerBare(line)) {
            

            let bareEnd = parseList(lines, i, false, 0, nodes, final);
            i = bareEnd;
            continue;
        }
        


        let para: string[] = [];
        let j: number = i;
        let setextLevel: number = 0;
        while (j < lines.length) {
            const cur = lines[j];
            if (isBlank(cur)) {
                break;
            }
            if (para.length > 0) {
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
            para.push(cur.replace(RegExp("^ {0,4}"), ""));
            j += 1;
        }
        if (setextLevel > 0) {
            const content = para.join("\n");
            const children = parseInline(content, final);
            nodes.push({ type: "heading", level: setextLevel, children: children });
            i = j;
            continue;
        }
        if (para.length > 0) {
            



            if (!final) {
                let preOk: boolean = false;
                if (para.length >= 2) {
                    preOk = true;
                }
                if (j < lines.length) {
                    preOk = true;
                }
                if (preOk) {
                    const head = para[0];
                    if (isTableRow(head)) {
                        if (head.trim().endsWith("|")) {
                            const preCells = splitRowCells(head);
                            if (preCells.length >= 2) {
                                let allPipes: boolean = true;
                                let pi: number = 0;
                                while (pi < para.length) {
                                    const pl = para[pi].trim();
                                    if (!pl.startsWith("|")) {
                                        allPipes = false;
                                    }
                                    pi += 1;
                                }
                                if (allPipes) {
                                    let preRow: any[] = [];
                                    for (const pc of preCells) {
                                        const pt = pc.trim();
                                        const pChildren = parseInline(pt, final);
                                        preRow.push({ type: "table_cell", header: true, children: pChildren, align: "left" });
                                    }
                                    const preHeader = { type: "table_row", cells: preRow };
                                    nodes.push({ type: "table", header: preHeader, rows: [], loading: true });
                                    i = j;
                                    continue;
                                }
                            }
                        }
                    }
                }
            }
            const content = para.join("\n");
            const children = parseInline(content, final);
            nodes.push({ type: "paragraph", children: children });
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

export function parseList(lines: string[], start: number, ordered: boolean, firstNum: number, nodes: any[], final: boolean): number {
    let items: any[] = [];
    let i: number = start;
    let startAttr: any = null;
    if (ordered) {
        if (firstNum != 1) {
            startAttr = firstNum;
        }
    }
    while (i < lines.length) {
        const line = lines[i];
        if (isBlank(line)) {
            

            let k: number = i + 1;
            while (k < lines.length) {
                if (isBlank(lines[k])) {
                    k += 1;
                } else {
                    break;
                }
            }
            if (k < lines.length) {
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
            const t = line.trimStart();
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
                    const t = line.trimStart();
                    const m = t.match(RegExp("^(\\d{1,9}[.)])( *)"));
                    if (m != null) {
                        const markerWidth = m[1].length;
                        let spaces = m[2].length;
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
        }
        

        if (!isItem) {
            break;
        }
        if (orderedHere != ordered) {
            break;
        }
        if (!ordered) {
            

            const t = line.trimStart();
            const firstChar = t[0];
            const firstItem = lines[start].trimStart();
            const listChar = firstItem[0];
            if (firstChar != listChar) {
                break;
            }
        }
        


        let itemLines: string[] = [];
        let firstText = line.slice(contentStart);
        itemLines.push(firstText);
        i += 1;
        while (i < lines.length) {
            const cur = lines[i];
            if (isBlank(cur)) {
                

                let k: number = i + 1;
                while (k < lines.length) {
                    if (isBlank(lines[k])) {
                        k += 1;
                    } else {
                        break;
                    }
                }
                if (k < lines.length) {
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
        const itemNodes = parseBlocks(itemLines, final);
        items.push({ type: "list_item", children: itemNodes });
    }
    if (ordered) {
        if (startAttr != null) {
            nodes.push({ type: "list", ordered: true, start: startAttr, items: items });
        } else {
            nodes.push({ type: "list", ordered: true, items: items });
        }
    } else {
        nodes.push({ type: "list", ordered: false, items: items });
    }
    return i;
}

export function tableConsume(lines: string[], start: number, nodes: any[], final: boolean): number {
    const headerCells = splitRowCells(lines[start]);
    const aligns: string[] = [];
    const delimCells = splitRowCells(lines[start + 1]);
    for (const c of delimCells) {
        aligns.push(delimiterAlign(c));
    }
    let rows: any[] = [];
    let i: number = start + 2;
    while (i < lines.length) {
        if (!isTableRow(lines[i])) {
            break;
        }
        const cells = splitRowCells(lines[i]);
        let rowCells: any[] = [];
        let ci: number = 0;
        while (ci < headerCells.length) {
            let cellText: string = "";
            if (ci < cells.length) {
                cellText = cells[ci].trim();
            }
            let align: string = "left";
            if (ci < aligns.length) {
                align = aligns[ci];
            }
            let children = parseInline(cellText, final);
            if (cellText == "") {
                children = [];
            }
            rowCells.push({ type: "table_cell", header: false, children: children, align: align });
            ci += 1;
        }
        rows.push({ type: "table_row", cells: rowCells });
        i += 1;
    }
    let headerRowCells: any[] = [];
    let ci: number = 0;
    while (ci < headerCells.length) {
        const cellText = headerCells[ci].trim();
        let align: string = "left";
        if (ci < aligns.length) {
            align = aligns[ci];
        }
        const children = parseInline(cellText, final);
        headerRowCells.push({ type: "table_cell", header: true, children: children, align: align });
        ci += 1;
    }
    const header = { type: "table_row", cells: headerRowCells };
    nodes.push({ type: "table", header: header, rows: rows, loading: false });
    return i;
}

export function parseInline(text: string, final: boolean): any[] {
    if (text == "") {
        return [];
    }
    return parseInlineLine(text, final);
}

export function parseInlineLine(line: string, final: boolean): any[] {
    let nodes: any[] = [];
    let buf: string = "";
    let i: number = 0;
    let seenCode: boolean = false;
    while (i < line.length) {
        const ch = line[i];
        


        if (ch == "\n") {
            let sp: number = 0;
            while (sp < buf.length) {
                const bch = buf[buf.length - 1 - sp];
                if (bch == " ") {
                    sp += 1;
                } else {
                    break;
                }
            }
            if (sp >= 2) {
                const kept = buf.slice(0, buf.length - sp);
                if (kept != "") {
                    nodes.push(textNode(kept));
                }
                nodes.push({ type: "hardbreak" });
                buf = "";
            } else {
                if (sp > 0) {
                    buf = buf.slice(0, buf.length - sp);
                }
                buf = buf + "\n";
            }
            i += 1;
            continue;
        }
        


        if (ch == "*") {
            if (line.startsWith("**", i)) {
                let after = scanDelim(line, i, "**", true, final);
                if (after != null) {
                    if (buf != "") {
                        nodes.push(textNode(buf));
                        buf = "";
                    }
                    nodes.push({ type: "strong", children: parseInlineLine(after[1], final) });
                    i = after[0];
                    continue;
                }
            }
            let afterEm = scanDelim(line, i, "*", false, final);
            if (afterEm != null) {
                if (buf != "") {
                    nodes.push(textNode(buf));
                    buf = "";
                }
                nodes.push({ type: "emphasis", children: parseInlineLine(afterEm[1], final) });
                i = afterEm[0];
                continue;
            }
            buf = buf + ch;
            i += 1;
            continue;
        }
        if (ch == "_") {
            let afterU = scanDelim(line, i, "_", false, final);
            if (afterU != null) {
                if (buf != "") {
                    nodes.push(textNode(buf));
                    buf = "";
                }
                nodes.push({ type: "emphasis", children: parseInlineLine(afterU[1], final) });
                i = afterU[0];
                continue;
            }
            buf = buf + ch;
            i += 1;
            continue;
        }
        if (ch == "~") {
            if (line.startsWith("~~", i)) {
                let afterS = scanDelim(line, i, "~~", false, final);
                if (afterS != null) {
                    if (buf != "") {
                        nodes.push(textNode(buf));
                        buf = "";
                    }
                    nodes.push({ type: "strikethrough", children: parseInlineLine(afterS[1], final) });
                    i = afterS[0];
                    continue;
                }
            }
            buf = buf + ch;
            i += 1;
            continue;
        }
        


        if (ch == "`") {
            let run: number = 0;
            while (line.startsWith("`", i + run)) {
                run += 1;
            }
            let close = findBacktickRun(line, i + run, run);
            if (close != -1) {
                let inner = line.slice(i + run, close);
                const trimmedL = inner.replace(RegExp("^ "), "");
                const trimmedBoth = trimmedL.replace(RegExp(" $"), "");
                if (inner.startsWith(" ")) {
                    if (inner.endsWith(" ")) {
                        if (inner.trim() != "") {
                            inner = trimmedBoth;
                        }
                    }
                }
                if (buf != "") {
                    nodes.push(textNode(buf));
                    buf = "";
                }
                nodes.push({ type: "inline_code", code: inner });
                seenCode = true;
                i = close + run;
                continue;
            }
            


            if (!final) {
                if (run == 1) {
                    const restAll = line.slice(i + run);
                    if (restAll.trim() == "") {
                        if (buf == "") {
                            i = line.length;
                            continue;
                        }
                    }
                }
            }
            if (run == 1) {
                if (!final) {
                    


                    const rest = line.slice(i + 1);
                    if (buf != "") {
                        nodes.push(textNode(buf));
                        buf = "";
                    }
                    nodes.push({ type: "inline_code", code: rest });
                    seenCode = true;
                    i = line.length;
                    continue;
                }
            }
            


            buf = buf + line.slice(i, i + run);
            i = i + run;
            continue;
        }
        


        if (ch == "!") {
            if (line.startsWith("![", i)) {
                let imgAfter = scanLink(line, i + 1, final, seenCode);
                if (imgAfter != null) {
                    if (buf != "") {
                        nodes.push(textNode(buf));
                        buf = "";
                    }
                    nodes.push({ type: "image", src: imgAfter[2], alt: imgAfter[1], title: null, loading: false });
                    i = imgAfter[0];
                    continue;
                }
            }
            buf = buf + ch;
            i += 1;
            continue;
        }
        


        if (ch == "[") {
            let after = scanLink(line, i, final, seenCode);
            if (after != null) {
                if (buf != "") {
                    nodes.push(textNode(buf));
                    buf = "";
                }
                if (after[3]) {
                    

                    nodes.push({ type: "link", href: after[2], title: after[4], text: after[1], children: parseInlineLine(after[1], final), loading: true });
                    if (after[5] != "") {
                        nodes.push(textNode(after[5]));
                    }
                } else {
                    nodes.push({ type: "link", loading: false, href: after[2], title: after[4], text: after[1], children: parseInlineLine(after[1], final) });
                }
                i = after[0];
                continue;
            }
            buf = buf + ch;
            i += 1;
            continue;
        }
        



        if (ch == "\\") {
            if (i + 1 < line.length) {
                const nxt = line[i + 1];
                if (isPunctuation(nxt)) {
                    if (nxt == "\"") {
                        buf = buf + String.fromCharCode(1);
                    } else {
                        if (nxt == "'") {
                            buf = buf + String.fromCharCode(2);
                        } else {
                            buf = buf + nxt;
                        }
                    }
                    i += 2;
                    continue;
                }
            }
        }
        

        buf = buf + ch;
        i += 1;
    }
    if (buf != "") {
        nodes.push(textNode(buf));
    }
    if (!final) {
        trimStreamingTail(nodes);
    }
    return nodes;
}

export function trimStreamingTail(nodes: any[]): void {
    if (nodes.length > 0) {
        const last = nodes[nodes.length - 1];
        if (last["type"] == "text") {
            trimLastTextNode(last, nodes);
        }
    }
}

export function trimLastTextNode(last: any, nodes: any[]): void {
    let c = last["content"];
    let stripped: boolean = false;
    let c2 = c.replace(RegExp(" ?<[/!a-zA-Z][^>]*$"), "");
    if (c2 == c) {
        c2 = c.replace(RegExp("<$"), "");
    }
    if (c2 != c) {
        stripped = true;
    }
    c = c2;
    let c3 = c.replace(RegExp("\\(+\\s*$"), "");
    if (c3 != c) {
        stripped = true;
    }
    c = c3;
    let c4 = c.replace(RegExp("\\* +$"), "");
    if (c4 == c) {
        if (c.endsWith("*")) {
            if (!c.endsWith("**")) {
                c4 = c.slice(0, c.length - 1);
            }
        }
    }
    if (c4 != c) {
        stripped = true;
    }
    c = c4;
    if (!stripped) {
        c = c.replace(RegExp(" +$"), "");
    }
    if (c.trim() == "|") {
        

        c = "";
    }
    if (c == "") {
        nodes.pop();
    } else {
        last["content"] = c;
    }
}

export function textNode(content: string): any {
    let s = smartQuotes(content);
    

    s = s.split(String.fromCharCode(1)).join("\"");
    s = s.split(String.fromCharCode(2)).join("'");
    return { type: "text", content: s };
}

export function isWordChar(ch: string): boolean {
    const re = RegExp("\\w", "u");
    return re.test(ch);
}

export function isClosePunctuation(ch: string): boolean {
    const re = RegExp("[\\)\\]},.;:!?\\u2026\"'\\uff09\\uff0c\\uff0e\\u3002\\uff1b\\uff1a\\uff01\\uff1f\\u300d\\u300f\\u3009\\u300b]");
    return re.test(ch);
}

let CURLY_LDQUO: string = String.fromCharCode(8220);

let CURLY_RDQUO: string = String.fromCharCode(8221);

let CURLY_LSQUO: string = String.fromCharCode(8216);

let CURLY_RSQUO: string = String.fromCharCode(8217);

export function smartQuotes(s: string): string {
    let out: string = "";
    let i: number = 0;
    while (i < s.length) {
        const ch = s[i];
        if (ch == "\"") {
            let prevIsOpenCtx: boolean = false;
            if (out == "") {
                prevIsOpenCtx = true;
            } else {
                const prev = out.charAt(out.length - 1);
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
                out = out + CURLY_LDQUO;
                i += 1;
                continue;
            }
            

            if (i + 1 >= s.length) {
                out = out + CURLY_RDQUO;
                i += 1;
                continue;
            }
            const nxt = s[i + 1];
            if (nxt == " ") {
                out = out + CURLY_RDQUO;
            } else {
                if (nxt == "\n") {
                    out = out + CURLY_RDQUO;
                } else {
                    if (isClosePunctuation(nxt)) {
                        out = out + CURLY_RDQUO;
                    } else {
                        out = out + ch;
                    }
                }
            }
            i += 1;
            continue;
        }
        if (ch == "'") {
            let apostrophe: boolean = false;
            if (i > 0) {
                if (i + 1 < s.length) {
                    const p = s[i - 1];
                    const n = s[i + 1];
                    const pWord = isWordChar(p);
                    const nWord = isWordChar(n);
                    if (pWord) {
                        if (nWord) {
                            apostrophe = true;
                        }
                    }
                }
            }
            if (apostrophe) {
                out = out + CURLY_RSQUO;
            } else {
                let openS: boolean = false;
                if (out == "") {
                    openS = true;
                } else {
                    const prev2 = out.charAt(out.length - 1);
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
                    out = out + CURLY_LSQUO;
                } else {
                    out = out + CURLY_RSQUO;
                }
            }
            i += 1;
            continue;
        }
        out = out + ch;
        i += 1;
    }
    return out;
}

export function isPunctuation(ch: string): boolean {
    



    const re = RegExp("\\p{P}|[-+/=@$^`|~]", "u");
    return re.test(ch);
}

export function scanDelim(line: string, i: number, delim: string, autoCloseWhenFinal: boolean, final: boolean): any {
    


    if (delim == "_") {
        if (i > 0) {
            const prev = line[i - 1];
            if (isWordChar(prev)) {
                return null;
            }
        }
    }
    const afterStart: number = i + delim.length;
    const inner = line.slice(afterStart);
    let close = inner.indexOf(delim);
    let innerText = inner;
    if (close != -1) {
        innerText = inner.slice(0, close);
    }
    if (innerText == "") {
        

        return null;
    }
    const lead = innerText[0];
    if (isPunctuation(lead)) {
        



        return null;
    }
    if (close != -1) {
        let next: number = afterStart + close + delim.length;
        return [next, innerText];
    }
    if (!autoCloseWhenFinal) {
        if (final) {
            return null;
        }
    }
    

    if (inner == "") {
        return null;
    }
    if (inner.startsWith(" ")) {
        return null;
    }
    return [line.length, inner];
}

export function findBacktickRun(line: string, from: number, count: number): number {
    let i: number = from;
    while (i < line.length) {
        if (line[i] != "`") {
            i += 1;
            continue;
        }
        let run: number = 0;
        while (line.startsWith("`", i + run)) {
            run += 1;
        }
        if (run == count) {
            return i;
        }
        i = i + run;
    }
    return -1;
}

export function scanLink(line: string, i: number, final: boolean, seenCode: boolean): any {
    let close = line.indexOf("]", i);
    if (close == -1) {
        return null;
    }
    const text = line.slice(i + 1, close);
    let after: number = close + 1;
    if (!line.startsWith("(", after)) {
        return null;
    }
    let end = line.indexOf(")", after);
    if (end == -1) {
        



        const frag = line.slice(after + 1);
        const urlMatch = frag.match(RegExp("^https?:\\/\\/.+"));
        if (urlMatch != null) {
            let urlHref = frag.replace(RegExp("[.,:;!?)]+$"), "");
            let tailText = frag.slice(urlHref.length);
            let urlTitle: any = "";
            if (seenCode) {
                urlTitle = null;
            }
            return [line.length, text, urlHref, true, urlTitle, tailText];
        }
        const m = frag.match(RegExp("^[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$"));
        if (m != null) {
            return [line.length, text, "http://" + frag, true, null, ""];
        }
        return [line.length, text, "", true, null, ""];
    }
    let inner = line.slice(after + 1, end);
    let href = inner;
    let title: any = null;
    const sp = inner.indexOf(" \"");
    if (sp != -1) {
        href = inner.slice(0, sp);
        const titlePart = inner.slice(sp + 2);
        if (titlePart.endsWith("\"")) {
            title = titlePart.slice(0, titlePart.length - 1);
        }
    } else {
        




        let lineTail: boolean = end + 1 >= line.length;
        if (!lineTail) {
            if (!seenCode) {
                title = "";
            }
        }
    }
    return [end + 1, text, href, false, title, ""];
}