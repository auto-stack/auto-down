export class LineBlock {
    uuid: string;
    lineStart: number;
    lineEnd: number;

    constructor(uuid: string, lineStart: number, lineEnd: number) {
        this.uuid = uuid;
        this.lineStart = lineStart;
        this.lineEnd = lineEnd;
    }
}

export class WikiLinkHit {
    title: string;
    blockId: string;

    constructor(title: string, blockId: string) {
        this.title = title;
        this.blockId = blockId;
    }
}

export class LinkScan {
    sourcePage: string;
    sourceBlockUuid: string;
    targetPage: string;
    targetBlockUuid: string;
    linkType: string;
    context: string;

    constructor(sourcePage: string, sourceBlockUuid: string, targetPage: string, targetBlockUuid: string, linkType: string, context: string) {
        this.sourcePage = sourcePage;
        this.sourceBlockUuid = sourceBlockUuid;
        this.targetPage = targetPage;
        this.targetBlockUuid = targetBlockUuid;
        this.linkType = linkType;
        this.context = context;
    }
}

export class TagScan {
    pagePath: string;
    tag: string;
    blockUuid: string;

    constructor(pagePath: string, tag: string, blockUuid: string) {
        this.pagePath = pagePath;
        this.tag = tag;
        this.blockUuid = blockUuid;
    }
}

export function startsWithStr(s: string, prefix: string): boolean {
    if (Number(s.length) < Number(prefix.length)) {
        return false;
    }
    return s.slice(0, Number(prefix.length)) == prefix;
}

export function trimStr(s: string): string {
    return trimStartStr(trimEndStr(s));
}

export function isWs(c: number): boolean {
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
        if (!isWs(s.charCodeAt(p))) {
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
        if (!isWs(s.charCodeAt(end - 1))) {
            break;
        }
        end -= 1;
    }
    if (end == Number(s.length)) {
        return s;
    }
    return s.slice(0, end);
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

export function isLinkBreakChar(c: number): boolean {
    if (c == 93) {
        return true;
    }
    if (c == 124) {
        return true;
    }
    if (c == 35) {
        return true;
    }
    if (c == 10) {
        return true;
    }
    return false;
}

export function scanWikiLinksLine(line: string): WikiLinkHit[] {
    let out: WikiLinkHit[] = [];
    const n: number = Number(line.length);
    let i: number = 0;
    while (i + 1 < n) {
        if (line.charCodeAt(i) == 91 && line.charCodeAt(i + 1) == 91) {
            

            let j: number = i + 2;
            while (j < n) {
                const c = line.charCodeAt(j);
                if (isLinkBreakChar(c)) {
                    break;
                }
                j += 1;
            }
            const titleEnd: number = j;
            let blockStart: number = -1;
            if (line.charCodeAt(j) == 35) {
                blockStart = j;
                j += 1;
                while (j < n) {
                    const c = line.charCodeAt(j);
                    if (c == 93 || c == 124 || c == 10) {
                        break;
                    }
                    j += 1;
                }
            }
            if (j + 1 < n && line.charCodeAt(j) == 93 && line.charCodeAt(j + 1) == 93) {
                const title = trimStr(line.slice(i + 2, titleEnd));
                if (Number(title.length) > 0) {
                    let bid: string = "";
                    if (blockStart >= 0) {
                        bid = line.slice(blockStart + 1, j);
                    }
                    out.push(new WikiLinkHit(title, bid));
                    i = j + 2;
                } else {
                    i += 1;
                }
            } else {
                i += 1;
            }
        } else {
            i += 1;
        }
    }
    return out;
}

export function scanBlockRefsLine(line: string): string[] {
    let out: string[] = [];
    const n: number = Number(line.length);
    let i: number = 0;
    while (i + 1 < n) {
        if (line.charCodeAt(i) == 40 && line.charCodeAt(i + 1) == 40) {
            let j: number = i + 2;
            while (j < n) {
                const c = line.charCodeAt(j);
                if (c == 41) {
                    break;
                }
                j += 1;
            }
            if (j + 1 < n && line.charCodeAt(j) == 41 && line.charCodeAt(j + 1) == 41) {
                const cand = line.slice(i + 2, j);
                if (isUuid36(cand)) {
                    out.push(cand);
                    i = j + 2;
                } else {
                    i += 1;
                }
            } else {
                i += 1;
            }
        } else {
            i += 1;
        }
    }
    return out;
}

export function isTagChar(c: number): boolean {
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
    if (c == 47) {
        return true;
    }
    return false;
}

export function scanTagsLine(line: string): string[] {
    let out: string[] = [];
    const n: number = Number(line.length);
    let i: number = 0;
    while (i < n) {
        if (line.charCodeAt(i) == 35) {
            let j: number = i + 1;
            while (j < n) {
                if (!isTagChar(line.charCodeAt(j))) {
                    break;
                }
                j += 1;
            }
            if (j > i + 1) {
                out.push(line.slice(i + 1, j));
                i = j;
            } else {
                i += 1;
            }
        } else {
            i += 1;
        }
    }
    return out;
}

export function findBlockUuidForLine(blocks: LineBlock[], idx: number): string {
    let i: number = 0;
    while (i < Number(blocks.length)) {
        const b = blocks[i];
        if (b.lineStart <= idx && idx < b.lineEnd) {
            return b.uuid;
        }
        i += 1;
    }
    return "";
}

export function bodyLineCount(lines: string[]): number {
    

    let count: number = Number(lines.length);
    if (count > 0) {
        if (lines[count - 1] == "") {
            count -= 1;
        }
    }
    return count;
}

export function scanLinkRows(body: string, sourcePage: string, blocks: LineBlock[]): LinkScan[] {
    let rows: LinkScan[] = [];
    const lines = body.split("\n");
    const count = bodyLineCount(lines);
    let idx: number = 0;
    while (idx < count) {
        const context = trimStr(lines[idx]);
        const sbu = findBlockUuidForLine(blocks, idx);
        const wikiHits = scanWikiLinksLine(lines[idx]);
        let w: number = 0;
        while (w < Number(wikiHits.length)) {
            rows.push(new LinkScan(sourcePage, sbu, wikiHits[w].title, wikiHits[w].blockId, "page", context));
            w += 1;
        }
        const refHits = scanBlockRefsLine(lines[idx]);
        let r: number = 0;
        while (r < Number(refHits.length)) {
            rows.push(new LinkScan(sourcePage, sbu, "", refHits[r], "block", context));
            r += 1;
        }
        idx += 1;
    }
    return rows;
}

export function scanTagRows(body: string, pagePath: string, blocks: LineBlock[]): TagScan[] {
    let rows: TagScan[] = [];
    const lines = body.split("\n");
    const count = bodyLineCount(lines);
    let idx: number = 0;
    while (idx < count) {
        const bu = findBlockUuidForLine(blocks, idx);
        const hits = scanTagsLine(lines[idx]);
        let t: number = 0;
        while (t < Number(hits.length)) {
            rows.push(new TagScan(pagePath, hits[t], bu));
            t += 1;
        }
        idx += 1;
    }
    return rows;
}