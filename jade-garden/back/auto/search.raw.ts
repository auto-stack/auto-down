export class SrPage {
    path: string;
    title: string;
    frontmatter: string;

    constructor(path: string, title: string, frontmatter: string) {
        this.path = path;
        this.title = title;
        this.frontmatter = frontmatter;
    }
}

export class SrBlock {
    uuid: string;
    pagePath: string;
    blockId: string;
    content: string;

    constructor(uuid: string, pagePath: string, blockId: string, content: string) {
        this.uuid = uuid;
        this.pagePath = pagePath;
        this.blockId = blockId;
        this.content = content;
    }
}

export class SrHit {
    isPage: boolean;
    path: string;
    title: string;
    uuid: string;
    blockId: string;
    content: string;
    snippet: string;

    constructor(isPage: boolean, path: string, title: string, uuid: string, blockId: string, content: string, snippet: string) {
        this.isPage = isPage;
        this.path = path;
        this.title = title;
        this.uuid = uuid;
        this.blockId = blockId;
        this.content = content;
        this.snippet = snippet;
    }
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

export function asciiLower(s: string): string {
    let out: string = "";
    const lower: string = "abcdefghijklmnopqrstuvwxyz";
    let i: number = 0;
    while (i < Number(s.length)) {
        const c = s.charCodeAt(i);
        if (c >= 65 && c <= 90) {
            out = out + lower.slice(c - 65, c - 64);
        } else {
            out = out + s.slice(i, i + 1);
        }
        i += 1;
    }
    return out;
}

export function trimWs(s: string): string {
    let p: number = 0;
    while (p < Number(s.length)) {
        if (!isWs(s.charCodeAt(p))) {
            break;
        }
        p += 1;
    }
    let end: number = Number(s.length);
    while (end > p) {
        if (!isWs(s.charCodeAt(end - 1))) {
            break;
        }
        end -= 1;
    }
    return s.slice(p, end);
}

export function findFrom(hay: string, needle: string, from: number): number {
    const nLen: number = Number(needle.length);
    const sLen: number = Number(hay.length);
    if (nLen == 0) {
        return -1;
    }
    let i: number = from;
    while (i + nLen <= sLen) {
        if (hay.slice(i, i + nLen) == needle) {
            return i;
        }
        i += 1;
    }
    return -1;
}

export function countOccurrences(hay: string, needle: string): number {
    let count: number = 0;
    let pos: number = findFrom(hay, needle, 0);
    while (pos >= 0) {
        count += 1;
        pos = findFrom(hay, needle, pos + Number(needle.length));
    }
    return count;
}

export function buildSnippet(text: string, needle: string, openMark: string, closeMark: string, ellipsis: string): string {
    const n: number = Number(text.length);
    const nLen: number = Number(needle.length);
    const lowerText = asciiLower(text);
    const first: number = findFrom(lowerText, needle, 0);
    if (first < 0) {
        return "";
    }
    


    let start: number = first - 60;
    if (start < 0) {
        start = 0;
    }
    if (start > 0) {
        while (start < first) {
            if (isWs(text.charCodeAt(start))) {
                break;
            }
            start += 1;
        }
        while (start < first) {
            if (!isWs(text.charCodeAt(start))) {
                break;
            }
            start += 1;
        }
    }
    


    const matchEnd: number = first + nLen;
    let end: number = matchEnd + 120;
    if (end > n) {
        end = n;
    }
    if (end < n) {
        while (end > matchEnd) {
            if (isWs(text.charCodeAt(end))) {
                break;
            }
            end -= 1;
        }
        while (end > matchEnd) {
            if (!isWs(text.charCodeAt(end - 1))) {
                break;
            }
            end -= 1;
        }
    }
    


    let out: string = "";
    if (start > 0) {
        out = out + ellipsis;
    }
    let i: number = start;
    while (i < end) {
        const m: number = findFrom(lowerText, needle, i);
        if (m < 0) {
            break;
        }
        const mEnd: number = m + nLen;
        if (mEnd > end) {
            break;
        }
        out = out + text.slice(i, m) + openMark + text.slice(m, mEnd) + closeMark;
        i = mEnd;
    }
    out = out + text.slice(i, end);
    if (end < n) {
        out = out + ellipsis;
    }
    return out;
}

export function searchAll(pages: SrPage[], blocks: SrBlock[], rawQuery: string, limit: number, openMark: string, closeMark: string, ellipsis: string): SrHit[] {
    let emptyOut: SrHit[] = [];
    const needle = asciiLower(trimWs(rawQuery));
    if (Number(needle.length) == 0) {
        return emptyOut;
    }
    if (limit <= 0) {
        return emptyOut;
    }
    

    let hits: SrHit[] = [];
    let counts: number[] = [];
    

    let pi: number = 0;
    while (pi < Number(pages.length)) {
        const pg = pages[pi];
        const ct = countOccurrences(asciiLower(pg.title), needle);
        const cf = countOccurrences(asciiLower(pg.frontmatter), needle);
        if (ct + cf > 0) {
            let snip: string = "";
            if (ct > 0) {
                snip = buildSnippet(pg.title, needle, openMark, closeMark, ellipsis);
            } else {
                snip = buildSnippet(pg.frontmatter, needle, openMark, closeMark, ellipsis);
            }
            hits.push(new SrHit(true, pg.path, pg.title, "", "", "", snip));
            counts.push(ct + cf);
        }
        pi += 1;
    }
    

    let bi: number = 0;
    while (bi < Number(blocks.length)) {
        const bl = blocks[bi];
        const cc = countOccurrences(asciiLower(bl.content), needle);
        if (cc > 0) {
            const snip = buildSnippet(bl.content, needle, openMark, closeMark, ellipsis);
            hits.push(new SrHit(false, bl.pagePath, "", bl.uuid, bl.blockId, bl.content, snip));
            counts.push(cc);
        }
        bi += 1;
    }
    




    const total: number = Number(hits.length);
    let out: SrHit[] = [];
    let used: number[] = [];
    while (Number(out.length) < total) {
        let best: number = -1;
        let i: number = 0;
        while (i < total) {
            let taken: boolean = false;
            let u: number = 0;
            while (u < Number(used.length)) {
                if (used[u] == i) {
                    taken = true;
                }
                u += 1;
            }
            if (!taken) {
                let take: boolean = false;
                if (best == -1) {
                    take = true;
                } else {
                    const cand = hits[i];
                    const cur = hits[best];
                    if (cand.isPage != cur.isPage) {
                        if (cand.isPage) {
                            take = true;
                        }
                    }
                    if (cand.isPage == cur.isPage) {
                        if (counts[i] > counts[best]) {
                            take = true;
                        }
                        if (counts[i] == counts[best]) {
                            if (cand.path < cur.path) {
                                take = true;
                            }
                            if (cand.path == cur.path) {
                                if (cand.uuid < cur.uuid) {
                                    take = true;
                                }
                                if (cand.uuid == cur.uuid) {
                                    if (cand.blockId < cur.blockId) {
                                        take = true;
                                    }
                                }
                            }
                        }
                    }
                }
                if (take) {
                    best = i;
                }
            }
            i += 1;
        }
        out.push(hits[best]);
        used.push(best);
    }
    


    let cut: number = limit;
    if (cut > total) {
        cut = total;
    }
    let picked: SrHit[] = [];
    let k: number = 0;
    while (k < cut) {
        picked.push(out[k]);
        k += 1;
    }
    return picked;
}