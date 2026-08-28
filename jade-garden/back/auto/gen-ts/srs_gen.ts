export class PropPair {
    key: string;
    value: string;

    constructor(key: string, value: string) {
        this.key = key;
        this.value = value;
    }
}

export class Qa {
    question: string;
    answer: string;

    constructor(question: string, answer: string) {
        this.question = question;
        this.answer = answer;
    }
}

export class SrsBlock {
    blockId: string;
    uuid: string;
    content: string;
    lineStart: number;
    lineEnd: number;

    constructor(blockId: string, uuid: string, content: string, lineStart: number, lineEnd: number) {
        this.blockId = blockId;
        this.uuid = uuid;
        this.content = content;
        this.lineStart = lineStart;
        this.lineEnd = lineEnd;
    }
}

export class SrsCardRaw {
    pagePath: string;
    blockId: string;
    uuid: string;
    raw: string;
    question: string;
    answer: string;
    deck: string;
    easeFactor: string;
    repeats: string;
    lastInterval: string;
    nextSchedule: string;
    lastScore: string;
    lastReviewed: string;

    constructor(pagePath: string, blockId: string, uuid: string, raw: string, question: string, answer: string, deck: string, easeFactor: string, repeats: string, lastInterval: string, nextSchedule: string, lastScore: string, lastReviewed: string) {
        this.pagePath = pagePath;
        this.blockId = blockId;
        this.uuid = uuid;
        this.raw = raw;
        this.question = question;
        this.answer = answer;
        this.deck = deck;
        this.easeFactor = easeFactor;
        this.repeats = repeats;
        this.lastInterval = lastInterval;
        this.nextSchedule = nextSchedule;
        this.lastScore = lastScore;
        this.lastReviewed = lastReviewed;
    }
}

export class SchedOut {
    easeFactor: number;
    repeats: number;
    lastInterval: number;
    matrix: number[][];

    constructor(easeFactor: number, repeats: number, lastInterval: number, matrix: number[][]) {
        this.easeFactor = easeFactor;
        this.repeats = repeats;
        this.lastInterval = lastInterval;
        this.matrix = matrix;
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

export function indentWidth(line: string): number {
    let p: number = 0;
    while (p < Number(line.length)) {
        if (!isWs(line.charCodeAt(p))) {
            break;
        }
        p += 1;
    }
    return p;
}

export function isWordChar(c: number): boolean {
    if (c >= 65 && c <= 90) {
        return true;
    }
    if (c >= 97 && c <= 122) {
        return true;
    }
    if (c >= 48 && c <= 57) {
        return true;
    }
    if (c == 95) {
        return true;
    }
    return false;
}

export function minInt(a: number, b: number): number {
    if (a < b) {
        return a;
    }
    return b;
}

export function fmax(a: number, b: number): number {
    if (a > b) {
        return a;
    }
    return b;
}

export function fmin(a: number, b: number): number {
    if (a < b) {
        return a;
    }
    return b;
}

export function repeatSpaces(n: number): string {
    let out: string = "";
    let i: number = 0;
    while (i < n) {
        out = out + " ";
        i += 1;
    }
    return out;
}

export function startsWithFrom(s: string, from: number, prefix: string): boolean {
    if (Number(s.length) - from < Number(prefix.length)) {
        return false;
    }
    return s.slice(from, from + Number(prefix.length)) == prefix;
}

export function hasCardTag(content: string): boolean {
    const n: number = Number(content.length);
    let i: number = 0;
    while (i < n) {
        if (startsWithFrom(content, i, "#card")) {
            if (i + 5 >= n) {
                return true;
            }
            if (!isWordChar(content.charCodeAt(i + 5))) {
                return true;
            }
        }
        if (startsWithFrom(content, i, "[[card]]")) {
            return true;
        }
        i += 1;
    }
    return false;
}

export function stripCardTags(s: string): string {
    const n: number = Number(s.length);
    let out: string = "";
    let i: number = 0;
    while (i < n) {
        if (startsWithFrom(s, i, "#card")) {
            if (i + 5 >= n || !isWordChar(s.charCodeAt(i + 5))) {
                i += 5;
            } else {
                out = out + s.slice(i, i + 1);
                i += 1;
            }
        } else {
            if (startsWithFrom(s, i, "[[card]]")) {
                i += 8;
            } else {
                out = out + s.slice(i, i + 1);
                i += 1;
            }
        }
    }
    return trimStr(out);
}

export function findClozeStart(s: string, from: number): number {
    const n: number = Number(s.length);
    let i: number = from;
    while (i < n) {
        if (startsWithFrom(s, i, "{{cloze")) {
            return i;
        }
        i += 1;
    }
    return -1;
}

export function findStrFrom(s: string, needle: string, from: number): number {
    const n: number = Number(s.length);
    let i: number = from;
    while (i < n) {
        if (startsWithFrom(s, i, needle)) {
            return i;
        }
        i += 1;
    }
    return -1;
}

export function nextCloze(s: string, from: number): number[] {
    

    let n: number = Number(s.length);
    let at: number = findClozeStart(s, from);
    while (at >= 0) {
        let i: number = at + 7;
        if (i >= n) {
            return [];
        }
        if (!isWs(s.charCodeAt(i))) {
            at = findClozeStart(s, at + 1);
        } else {
            while (i < n && isWs(s.charCodeAt(i))) {
                i += 1;
            }
            let bs: number = i;
            while (bs < n) {
                if (s.charCodeAt(bs) == 92) {
                    break;
                }
                bs += 1;
            }
            if (bs >= n) {
                return [];
            }
            let j: number = bs + 1;
            while (j < n && isWs(s.charCodeAt(j))) {
                j += 1;
            }
            let close: number = findStrFrom(s, "}}", j);
            if (close < 0) {
                return [];
            }
            let out: number[] = [];
            out.push(at);
            out.push(close + 2);
            out.push(i);
            out.push(bs);
            out.push(j);
            out.push(close);
            return out;
        }
    }
    return [];
}

export function replaceAllStr(s: string, find: string, repl: string): string {
    if (find == "") {
        return s;
    }
    const n: number = Number(s.length);
    let out: string = "";
    let i: number = 0;
    while (i < n) {
        if (startsWithFrom(s, i, find)) {
            out = out + repl;
            i += Number(find.length);
        } else {
            out = out + s.slice(i, i + 1);
            i += 1;
        }
    }
    return out;
}

export function hasCloze(content: string): boolean {
    const hit = nextCloze(content, 0);
    return Number(hit.length) > 0;
}

export function buildQa(content: string): Qa {
    let question: string = content;
    let answer: string = content;
    let from: number = 0;
    let hit: number[] = nextCloze(content, from);
    while (Number(hit.length) > 0) {
        const start = hit[0];
        const end = hit[1];
        const answerText = trimStr(content.slice(hit[2], hit[3]));
        const hint = trimStr(content.slice(hit[4], hit[5]));
        const full = content.slice(start, end);
        question = replaceAllStr(question, full, "{{" + hint + "}}");
        answer = replaceAllStr(answer, full, "**" + answerText + "**");
        from = end;
        hit = nextCloze(content, from);
    }
    return new Qa(stripCardTags(question), stripCardTags(answer));
}

export function matchPropLine(line: string): PropPair {
    const n: number = Number(line.length);
    let i: number = 0;
    while (i < n) {
        if (!isWs(line.charCodeAt(i))) {
            break;
        }
        i += 1;
    }
    const c0 = line.charCodeAt(i);
    let keyOk: boolean = false;
    if (c0 >= 65 && c0 <= 90) {
        keyOk = true;
    }
    if (c0 >= 97 && c0 <= 122) {
        keyOk = true;
    }
    if (c0 == 95) {
        keyOk = true;
    }
    if (!keyOk) {
        return new PropPair("", "");
    }
    let end: number = i + 1;
    while (end < n) {
        const c = line.charCodeAt(end);
        let ok: boolean = false;
        if (c >= 65 && c <= 90) {
            ok = true;
        }
        if (c >= 97 && c <= 122) {
            ok = true;
        }
        if (c >= 48 && c <= 57) {
            ok = true;
        }
        if (c == 95) {
            ok = true;
        }
        if (c == 45) {
            ok = true;
        }
        if (!ok) {
            break;
        }
        end += 1;
    }
    if (!startsWithFrom(line, end, "::")) {
        return new PropPair("", "");
    }
    let v: number = end + 2;
    while (v < n) {
        if (!isWs(line.charCodeAt(v))) {
            break;
        }
        v += 1;
    }
    return new PropPair(line.slice(i, end), trimStr(line.slice(v)));
}

export function parseBlockProps(lines: string[], lineStart: number, lineEnd: number): PropPair[] {
    let out: PropPair[] = [];
    const count: number = Number(lines.length);
    let hardEnd: number = lineEnd;
    if (hardEnd > count) {
        hardEnd = count;
    }
    let i: number = lineStart;
    while (i < hardEnd) {
        const p = matchPropLine(lines[i]);
        if (p.key != "") {
            let replaced: boolean = false;
            let q: number = 0;
            while (q < Number(out.length)) {
                if (out[q].key == p.key) {
                    out[q] = new PropPair(p.key, p.value);
                    replaced = true;
                }
                q += 1;
            }
            if (!replaced) {
                out.push(p);
            }
        }
        i += 1;
    }
    

    if (lineStart < count) {
        const blockIndent = indentWidth(lines[lineStart]);
        let j: number = lineEnd;
        if (j < lineStart + 1) {
            j = lineStart + 1;
        }
        while (j < count) {
            const line = lines[j];
            if (trimStr(line) == "") {
                break;
            }
            if (indentWidth(line) <= blockIndent) {
                break;
            }
            const p = matchPropLine(line);
            if (p.key != "") {
                let replaced: boolean = false;
                let q: number = 0;
                while (q < Number(out.length)) {
                    if (out[q].key == p.key) {
                        out[q] = new PropPair(p.key, p.value);
                        replaced = true;
                    }
                    q += 1;
                }
                if (!replaced) {
                    out.push(p);
                }
            }
            j += 1;
        }
    }
    return out;
}

export function propAt(props: PropPair[], key: string): string {
    let val: string = "";
    let q: number = 0;
    while (q < Number(props.length)) {
        if (props[q].key == key) {
            val = props[q].value;
        }
        q += 1;
    }
    return val;
}

export function extractCards(pagePath: string, lines: string[], blocks: SrsBlock[]): SrsCardRaw[] {
    let out: SrsCardRaw[] = [];
    const count: number = Number(blocks.length);
    let i: number = 0;
    while (i < count) {
        const b = blocks[i];
        if (b.blockId == "") {
            i += 1;
        } else {
            if (hasCardTag(b.content) || hasCloze(b.content)) {
                const qa = buildQa(b.content);
                const props = parseBlockProps(lines, b.lineStart, b.lineEnd);
                out.push(new SrsCardRaw(pagePath, b.blockId, b.uuid, b.content, qa.question, qa.answer, propAt(props, "deck"), propAt(props, "card-ease-factor"), propAt(props, "card-repeats"), propAt(props, "card-last-interval"), propAt(props, "card-next-schedule"), propAt(props, "card-last-score"), propAt(props, "card-last-reviewed")));
            }
            i += 1;
        }
    }
    return out;
}

export function matrixFactor(matrix: number[][], repetition: number, grade: number): number {
    if (Number(matrix.length) == 0) {
        return 2.5;
    }
    const r = minInt(repetition, 4);
    if (r < 0) {
        return 2.5;
    }
    if (r >= Number(matrix.length)) {
        return 2.5;
    }
    const row = matrix[r];
    let g: number = 0;
    if (grade > 1) {
        g = minInt(grade - 1, 4);
    }
    if (g >= Number(row.length)) {
        return 2.5;
    }
    return row[g];
}

export function fiveRow(): number[] {
    let row: number[] = [];
    row.push(2.5);
    row.push(2.5);
    row.push(2.5);
    row.push(2.5);
    row.push(2.5);
    return row;
}

export function copyFloatRow(row: number[]): number[] {
    let out: number[] = [];
    let i: number = 0;
    while (i < Number(row.length)) {
        out.push(row[i]);
        i += 1;
    }
    return out;
}

export function matrixUpdate(matrix: number[][], repetition: number, grade: number, requested: number): number[][] {
    const r = minInt(repetition, 4);
    let g: number = 0;
    if (grade > 1) {
        g = minInt(grade - 1, 4);
    }
    let out: number[][] = [];
    



    let total: number = Number(matrix.length);
    if (total == 0) {
        total = 5;
    }
    if (total <= r) {
        total = r + 1;
    }
    let idx: number = 0;
    while (idx < total) {
        let row: number[] = [];
        if (Number(matrix.length) == 0) {
            row = fiveRow();
        } else {
            if (idx < Number(matrix.length)) {
                row = copyFloatRow(matrix[idx]);
            } else {
                row = fiveRow();
            }
        }
        if (idx == r) {
            while (Number(row.length) <= g) {
                row.push(2.5);
            }
            const current = row[g];
            let modifier: number = 0;
            if (grade == 1) {
                modifier = -0.3;
            }
            if (grade == 2) {
                modifier = -0.15;
            }
            if (grade == 3) {
                modifier = 0;
            }
            if (grade == 4) {
                modifier = 0.1;
            }
            


            const diff: number = requested - current;
            const delta: number = diff * 0.1;
            const change: number = delta + modifier;
            const bumped: number = current + change;
            const lo = fmax(bumped, 1.3);
            row[g] = fmin(lo, 3);
        }
        out.push(row);
        idx += 1;
    }
    return out;
}

export function scheduleWith(easeFactor: number, repeats: number, lastInterval: number, grade: number, matrix: number[][]): SchedOut {
    let g: number = grade;
    if (g < 1) {
        g = 1;
    }
    if (g > 4) {
        g = 4;
    }
    let reps: number = repeats;
    let interval: number = lastInterval;
    let ef: number = easeFactor;
    if (g == 1) {
        reps = 0;
        interval = 0;
    } else {
        reps = reps + 1;
        if (reps == 1) {
            interval = 1;
        } else {
            if (reps == 2) {
                interval = 6;
            } else {
                const factor = matrixFactor(matrix, minInt(reps, 4), g);
                const prod: number = interval * factor;
                interval = fmax(prod, ef);
            }
        }
    }
    const q: number = 5 - Number(g);
    const inner: number = 0.08 + q * 0.02;
    const adjust: number = 0.1 - q * inner;
    const bumped: number = ef + adjust;
    ef = fmax(bumped, 1.3);
    const nextMatrix = matrixUpdate(matrix, minInt(reps, 4), g, interval);
    return new SchedOut(ef, reps, interval, nextMatrix);
}

export function findAnchorLine(lines: string[], anchor: string): number {
    const count: number = Number(lines.length);
    let i: number = 0;
    while (i < count) {
        const line = lines[i];
        const trimmed = trimEndStr(line);
        if (Number(trimmed.length) >= Number(anchor.length)) {
            const tail: number = Number(trimmed.length) - Number(anchor.length);
            if (trimmed.slice(tail) == anchor) {
                return i;
            }
        }
        i += 1;
    }
    return -1;
}

export function applyReviewProps(lines: string[], blockLine: number, newProps: PropPair[]): string[] {
    const count: number = Number(lines.length);
    const blockIndent = indentWidth(lines[blockLine]);
    let endLine: number = count;
    let i: number = blockLine + 1;
    while (i < count) {
        const line = lines[i];
        if (trimStr(line) == "") {
            endLine = i;
        }
        if (indentWidth(line) <= blockIndent) {
            endLine = i;
        }
        if (endLine != count) {
            break;
        }
        i += 1;
    }
    



    let picked: string[] = [];
    let used: number[] = [];
    const indent = repeatSpaces(blockIndent + 2);
    while (Number(used.length) < Number(newProps.length)) {
        let best: string = "";
        let bestIdx: number = -1;
        let j: number = 0;
        while (j < Number(newProps.length)) {
            let alreadyUsed: boolean = false;
            let u: number = 0;
            while (u < Number(used.length)) {
                if (used[u] == j) {
                    alreadyUsed = true;
                }
                u += 1;
            }
            if (!alreadyUsed) {
                const cand: string = indent + newProps[j].key + ":: " + newProps[j].value;
                if (bestIdx < 0 || cand < best) {
                    best = cand;
                    bestIdx = j;
                }
            }
            j += 1;
        }
        used.push(bestIdx);
        picked.push(best);
    }
    

    let out: string[] = [];
    let k: number = 0;
    while (k < count) {
        if (k == blockLine) {
            out.push(lines[k]);
            let p: number = 0;
            while (p < Number(picked.length)) {
                out.push(picked[p]);
                p += 1;
            }
        } else {
            let drop: boolean = false;
            if (k > blockLine && k < endLine) {
                const pr = matchPropLine(lines[k]);
                if (pr.key != "") {
                    let q: number = 0;
                    while (q < Number(newProps.length)) {
                        if (newProps[q].key == pr.key) {
                            drop = true;
                        }
                        q += 1;
                    }
                }
            }
            if (!drop) {
                out.push(lines[k]);
            }
        }
        k += 1;
    }
    return out;
}