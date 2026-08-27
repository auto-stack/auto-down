export class PBlock {
    kind: string;
    content: string;
    blockId: string;
    lineStart: number;
    lineEnd: number;

    constructor(kind: string, content: string, blockId: string, lineStart: number, lineEnd: number) {
        this.kind = kind;
        this.content = content;
        this.blockId = blockId;
        this.lineStart = lineStart;
        this.lineEnd = lineEnd;
    }
}

export function startsWithStr(s: string, prefix: string): boolean {
    if (Number(s.length) < Number(prefix.length)) {
        return false;
    }
    return s.slice(0, Number(prefix.length)) == prefix;
}

export function endsWithStr(s: string, suffix: string): boolean {
    if (Number(s.length) < Number(suffix.length)) {
        return false;
    }
    return s.slice(Number(s.length) - Number(suffix.length), Number(s.length)) == suffix;
}

export function isWhitespaceCode(c: number): boolean {
    if (c == 32) {
        return true;
    }
    if (c == 9) {
        return true;
    }
    if (c == 10) {
        return true;
    }
    if (c == 13) {
        return true;
    }
    if (c == 11) {
        return true;
    }
    if (c == 12) {
        return true;
    }
    return false;
}

export function trimStartStr(s: string): string {
    let p: number = 0;
    while (p < Number(s.length)) {
        if (!isWhitespaceCode(s.charCodeAt(p))) {
            break;
        }
        p += 1;
    }
    if (p == 0) {
        return s;
    }
    return s.slice(p);
}

export function trimEndStr(s: string): string {
    let end: number = Number(s.length);
    while (end > 0) {
        if (!isWhitespaceCode(s.charCodeAt(end - 1))) {
            break;
        }
        end -= 1;
    }
    if (end == Number(s.length)) {
        return s;
    }
    return s.slice(0, end);
}

export function trimStr(s: string): string {
    return trimStartStr(trimEndStr(s));
}

export function findStr(s: string, needle: string): number {
    const nLen: number = Number(needle.length);
    const sLen: number = Number(s.length);
    if (nLen == 0) {
        return 0;
    }
    if (sLen < nLen) {
        return -1;
    }
    let i: number = 0;
    while (i + nLen <= sLen) {
        if (s.slice(i, i + nLen) == needle) {
            return i;
        }
        i += 1;
    }
    return -1;
}

export function joinLines(lines: string[], start: number, end: number): string {
    let out: string = "";
    let i: number = start;
    while (i < end) {
        if (i > start) {
            out = out + "\n";
        }
        out = out + lines[i];
        i += 1;
    }
    return out;
}

export class AnchorSplit {
    content: string;
    id: string;

    constructor(content: string, id: string) {
        this.content = content;
        this.id = id;
    }
}

export function isAnchorIdChar(c: number): boolean {
    if (c >= 48 && c <= 57) {
        return true;
    }
    if (c >= 65 && c <= 90) {
        return true;
    }
    if (c >= 97 && c <= 122) {
        return true;
    }
    if (c == 45) {
        return true;
    }
    if (c == 95) {
        return true;
    }
    return false;
}

export function isAnchorId(id: string): boolean {
    const n: number = Number(id.length);
    if (n == 0) {
        return false;
    }
    let i: number = 0;
    while (i < n) {
        if (!isAnchorIdChar(id.charCodeAt(i))) {
            return false;
        }
        i += 1;
    }
    return true;
}

export function extractAnchor(content: string): AnchorSplit {
    const t = trimEndStr(content);
    const n: number = Number(t.length);
    let s: number = n;
    while (s > 0) {
        const c = t.charCodeAt(s - 1);
        if (c == 32 || c == 9) {
            break;
        }
        s -= 1;
    }
    if (s <= 0) {
        return new AnchorSplit(t, "");
    }
    if (t.charCodeAt(s) != 94) {
        return new AnchorSplit(t, "");
    }
    const id = t.slice(s + 1, n);
    if (!isAnchorId(id)) {
        return new AnchorSplit(t, "");
    }
    const stripped = trimEndStr(t.slice(0, s - 1));
    return new AnchorSplit(stripped, id);
}

export function isHrLine(line: string): boolean {
    const t = trimStr(line);
    if (t == "---") {
        return true;
    }
    if (t == "***") {
        return true;
    }
    if (t == "___") {
        return true;
    }
    return false;
}

export function headingLevelOf(trimmed: string): number {
    let level: number = 0;
    while (level < Number(trimmed.length)) {
        if (trimmed.charCodeAt(level) == 35) {
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
    if (level == Number(trimmed.length)) {
        return 0;
    }
    if (trimmed.charCodeAt(level) != 32) {
        return 0;
    }
    return level;
}

export function orderedPrefixLen(trimmed: string): number {
    





    let d: number = 0;
    while (d < Number(trimmed.length)) {
        const c = trimmed.charCodeAt(d);
        if (c >= 48 && c <= 57) {
            d += 1;
        } else {
            break;
        }
    }
    if (d == 0) {
        return -1;
    }
    if (startsWithStr(trimmed.slice(d), ". ")) {
        return d + 2;
    }
    return -1;
}

export function parseHeadingLine(line: string, idx: number): PBlock {
    const trimmed = trimStartStr(line);
    const level = headingLevelOf(trimmed);
    const content = trimStr(trimmed.slice(level + 1));
    const split = extractAnchor(content);
    return new PBlock("heading", split.content, split.id, idx, idx + 1);
}

export function parseListItemLine(line: string, idx: number): PBlock {
    const trimmed = trimStartStr(line);
    let kind: string = "";
    let prefixLen: number = 0;
    if (startsWithStr(trimmed, "- [ ] ") || startsWithStr(trimmed, "- [x] ") || startsWithStr(trimmed, "- [X] ")) {
        kind = "task";
        prefixLen = 6;
    } else {
        if (startsWithStr(trimmed, "- ")) {
            kind = "bullet";
            prefixLen = 2;
        } else {
            const oLen = orderedPrefixLen(trimmed);
            if (oLen > 0) {
                kind = "ordered";
                prefixLen = findStr(trimmed, ". ") + 2;
            }
        }
    }
    const content = trimStr(trimmed.slice(prefixLen));
    const split = extractAnchor(content);
    return new PBlock(kind, split.content, split.id, idx, idx + 1);
}

export function isBlockStartLine(line: string): boolean {
    const t = trimStartStr(line);
    if (startsWithStr(t, "#")) {
        return true;
    }
    if (startsWithStr(t, "- ")) {
        return true;
    }
    if (startsWithStr(t, "- [")) {
        return true;
    }
    if (startsWithStr(t, ">")) {
        return true;
    }
    if (startsWithStr(t, "```")) {
        return true;
    }
    if (startsWithStr(t, ":::")) {
        return true;
    }
    if (startsWithStr(t, "---")) {
        return true;
    }
    if (startsWithStr(t, "***")) {
        return true;
    }
    if (startsWithStr(t, "___")) {
        return true;
    }
    return orderedPrefixLen(t) > 0;
}

export function parseBody(body: string): PBlock[] {
    const lines = body.split("\n");
    let blocks: PBlock[] = [];
    let i: number = 0;
    


    let count: number = Number(lines.length);
    if (count > 0) {
        if (lines[count - 1] == "") {
            count -= 1;
        }
    }
    while (i < count) {
        const line = lines[i];
        if (startsWithStr(line, "```")) {
            const end = scanFenceEnd(lines, count, i, "```");
            blocks.push(new PBlock("code", joinLines(lines, i, end), "", i, end));
            i = end;
        } else {
            if (startsWithStr(line, ":::")) {
                let kind: string = "callout";
                if (startsWithStr(line, ":::details") || startsWithStr(line, "::: details")) {
                    kind = "details";
                }
                const end2 = scanFenceEnd(lines, count, i, ":::");
                blocks.push(new PBlock(kind, joinLines(lines, i, end2), "", i, end2));
                i = end2;
            } else {
                if (isHrLine(line)) {
                    blocks.push(new PBlock("hr", line, "", i, i + 1));
                    i += 1;
                } else {
                    if (headingLevelOf(trimStartStr(line)) > 0) {
                        blocks.push(parseHeadingLine(line, i));
                        i += 1;
                    } else {
                        if (isListItemLine(line)) {
                            blocks.push(parseListItemLine(line, i));
                            i += 1;
                        } else {
                            if (startsWithStr(line, ">")) {
                                const end3 = scanQuoteEnd(lines, count, i);
                                blocks.push(new PBlock("blockquote", quoteContent(lines, i, end3), "", i, end3));
                                i = end3;
                            } else {
                                if (trimStr(line) == "") {
                                    i += 1;
                                } else {
                                    const end4 = scanParagraphEnd(lines, count, i);
                                    const split = extractAnchor(joinLines(lines, i, end4));
                                    blocks.push(new PBlock("paragraph", split.content, split.id, i, end4));
                                    i = end4;
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    return blocks;
}

export function isListItemLine(line: string): boolean {
    const t = trimStartStr(line);
    if (startsWithStr(t, "- [ ] ")) {
        return true;
    }
    if (startsWithStr(t, "- [x] ")) {
        return true;
    }
    if (startsWithStr(t, "- [X] ")) {
        return true;
    }
    if (startsWithStr(t, "- ")) {
        return true;
    }
    if (orderedPrefixLen(t) > 0) {
        return true;
    }
    return false;
}

export function scanFenceEnd(lines: string[], count: number, start: number, fence: string): number {
    let end: number = start + 1;
    while (end < count) {
        if (startsWithStr(trimStartStr(lines[end]), fence)) {
            end += 1;
            return end;
        }
        end += 1;
    }
    return end;
}

export function scanQuoteEnd(lines: string[], count: number, start: number): number {
    let end: number = start;
    while (end < count) {
        if (startsWithStr(lines[end], ">")) {
            end += 1;
        } else {
            break;
        }
    }
    return end;
}

export function quoteContent(lines: string[], start: number, end: number): string {
    let out: string = "";
    let i: number = start;
    while (i < end) {
        if (i > start) {
            out = out + "\n";
        }
        if (startsWithStr(lines[i], "> ")) {
            out = out + lines[i].slice(2);
        } else {
            out = out + lines[i].slice(1);
        }
        i += 1;
    }
    return out;
}

export function scanParagraphEnd(lines: string[], count: number, start: number): number {
    let end: number = start;
    while (end < count) {
        if (trimStr(lines[end]) == "") {
            break;
        }
        if (isBlockStartLine(lines[end])) {
            break;
        }
        end += 1;
    }
    return end;
}

export class FrontSplit {
    yaml: string;
    body: string;
    hasMarker: boolean;

    constructor(yaml: string, body: string, hasMarker: boolean) {
        this.yaml = yaml;
        this.body = body;
        this.hasMarker = hasMarker;
    }
}

export function splitFrontmatterScan(text: string): FrontSplit {
    const trimmed = trimStartStr(text);
    if (!startsWithStr(trimmed, "---")) {
        return new FrontSplit("", text, false);
    }
    const rest = trimmed.slice(3);
    const end = findStr(rest, "\n---");
    if (end < 0) {
        return new FrontSplit("", text, false);
    }
    return new FrontSplit(rest.slice(0, end), trimStartStr(rest.slice(end + 4)), true);
}

export class PropPair {
    key: string;
    value: string;

    constructor(key: string, value: string) {
        this.key = key;
        this.value = value;
    }
}

export function findIdPropertyLine(line: string): string {
    const t = trimStartStr(line);
    if (!startsWithStr(t, "id::")) {
        return "";
    }
    const v = trimEndStr(trimStartStr(t.slice(4)));
    if (!isUuid36(v)) {
        return "";
    }
    return v;
}

export function isHexChar(c: number): boolean {
    if (c >= 48 && c <= 57) {
        return true;
    }
    if (c >= 65 && c <= 70) {
        return true;
    }
    if (c >= 97 && c <= 102) {
        return true;
    }
    return false;
}

export function isUuid36(s: string): boolean {
    if (Number(s.length) != 36) {
        return false;
    }
    let i: number = 0;
    while (i < 36) {
        const c = s.charCodeAt(i);
        if (i == 8 || i == 13 || i == 18 || i == 23) {
            if (c != 45) {
                return false;
            }
        } else {
            if (!isHexChar(c)) {
                return false;
            }
        }
        i += 1;
    }
    return true;
}

export function isKeyStartChar(c: number): boolean {
    if (c >= 65 && c <= 90) {
        return true;
    }
    if (c >= 97 && c <= 122) {
        return true;
    }
    if (c == 95) {
        return true;
    }
    return false;
}

export function isKeyChar(c: number): boolean {
    if (isKeyStartChar(c)) {
        return true;
    }
    if (c >= 48 && c <= 57) {
        return true;
    }
    if (c == 45) {
        return true;
    }
    return false;
}

export function parsePropertyLine(line: string): PropPair {
    const t = trimStartStr(line);
    const n: number = Number(t.length);
    if (n < 3) {
        return new PropPair("", "");
    }
    if (!isKeyStartChar(t.charCodeAt(0))) {
        return new PropPair("", "");
    }
    let e: number = 1;
    while (e < n) {
        const c = t.charCodeAt(e);
        if (isKeyChar(c)) {
            e += 1;
        } else {
            break;
        }
    }
    if (!startsWithStr(t.slice(e), "::")) {
        return new PropPair("", "");
    }
    const key = t.slice(0, e);
    const value = trimStartStr(t.slice(e + 2));
    return new PropPair(key, value);
}

export function parseBlockPropertiesLines(lines: string[]): PropPair[] {
    let out: PropPair[] = [];
    let i: number = 0;
    while (i < Number(lines.length)) {
        const pair = parsePropertyLine(lines[i]);
        if (pair.key != "") {
            out.push(pair);
        }
        i += 1;
    }
    return out;
}