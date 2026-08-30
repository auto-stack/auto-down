export class UnlinkedHit {
    matched: string;
    context: string;

    constructor(matched: string, context: string) {
        this.matched = matched;
        this.context = context;
    }
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

export function isWordChar(c: number): boolean {
    if (c >= 97 && c <= 122) {
        return true;
    }
    if (c >= 65 && c <= 90) {
        return true;
    }
    if (c >= 48 && c <= 57) {
        return true;
    }
    if (c == 95) {
        return true;
    }
    

    if (c >= 19968 && c <= 40959) {
        return true;
    }
    return false;
}

export function boundaryOk(text: string, start: number, end: number): boolean {
    if (start > 0) {
        if (isWordChar(text.charCodeAt(start - 1))) {
            return false;
        }
    }
    if (end < Number(text.length)) {
        if (isWordChar(text.charCodeAt(end))) {
            return false;
        }
    }
    return true;
}

export function lineEndAt(text: string, pos: number): number {
    let i: number = pos;
    while (i < Number(text.length)) {
        if (text.charCodeAt(i) == 10) {
            return i;
        }
        i += 1;
    }
    return Number(text.length);
}

export function contextAt(text: string, pos: number): string {
    let start: number = 0;
    let i: number = 0;
    while (i < pos) {
        if (text.charCodeAt(i) == 10) {
            start = i + 1;
        }
        i += 1;
    }
    const end = lineEndAt(text, pos);
    

    let p: number = start;
    let e: number = end;
    while (p < e) {
        const c = text.charCodeAt(p);
        if (c != 32 && c != 9 && c != 10 && c != 13) {
            break;
        }
        p += 1;
    }
    while (e > p) {
        const c = text.charCodeAt(e - 1);
        if (c != 32 && c != 9 && c != 10 && c != 13) {
            break;
        }
        e -= 1;
    }
    return text.slice(p, e);
}

export function inWikiSpan(text: string, start: number, end: number): boolean {
    let i: number = 0;
    while (i < Number(text.length)) {
        if (text.slice(i, i + 2) == "[[") {
            let j: number = i + 2;
            let close: number = -1;
            while (j < Number(text.length)) {
                if (text.charCodeAt(j) == 10) {
                    break;
                }
                if (text.slice(j, j + 2) == "]]") {
                    close = j;
                    break;
                }
                j += 1;
            }
            if (close >= 0) {
                if (start >= i && end <= close + 2) {
                    return true;
                }
                i = close + 2;
            } else {
                i += 2;
            }
        } else {
            i += 1;
        }
    }
    return false;
}

export function scanNames(text: string, names: string[]): UnlinkedHit[] {
    


    let out: UnlinkedHit[] = [];
    let pos: number = 0;
    while (pos < Number(text.length)) {
        let matchedLen: number = 0;
        let k: number = 0;
        while (k < Number(names.length)) {
            const name = asciiLower(names[k]);
            if (Number(name.length) > 0 && pos + Number(name.length) <= Number(text.length)) {
                const slice = asciiLower(text.slice(pos, pos + Number(name.length)));
                if (slice == name && boundaryOk(text, pos, pos + Number(name.length))) {
                    if (!inWikiSpan(text, pos, pos + Number(name.length))) {
                        out.push(new UnlinkedHit(text.slice(pos, pos + Number(name.length)), contextAt(text, pos)));
                    }
                    matchedLen = Number(name.length);
                    break;
                }
            }
            k += 1;
        }
        if (matchedLen > 0) {
            pos += matchedLen;
        } else {
            pos += 1;
        }
    }
    return out;
}

export function findUnlinkedRefs(text: string, names: string[]): UnlinkedHit[] {
    let out: UnlinkedHit[] = [];
    if (Number(names.length) == 0) {
        return out;
    }
    if (Number(text.length) == 0) {
        return out;
    }
    let scanned: UnlinkedHit[] = scanNames(text, names);
    for (const h of scanned) {
        out.push(h);
    }
    return out;
}