export class QueryTask {
    title: string;
    content: string;
    marker: string;
    priority: string;
    scheduled: string;
    deadline: string;

    constructor(title: string, content: string, marker: string, priority: string, scheduled: string, deadline: string) {
        this.title = title;
        this.content = content;
        this.marker = marker;
        this.priority = priority;
        this.scheduled = scheduled;
        this.deadline = deadline;
    }
}

export class QueryEvalOut {
    ok: boolean;
    err: string;
    value: boolean;

    constructor(ok: boolean, err: string, value: boolean) {
        this.ok = ok;
        this.err = err;
        this.value = value;
    }
}

export class QueryEvalOut2 {
    ok: boolean;
    err: string;
    days: number;

    constructor(ok: boolean, err: string, days: number) {
        this.ok = ok;
        this.err = err;
        this.days = days;
    }
}

export class OffsetDays {
    ok: boolean;
    err: string;
    days: number;

    constructor(ok: boolean, err: string, days: number) {
        this.ok = ok;
        this.err = err;
        this.days = days;
    }
}

export function evalOut(value: boolean): QueryEvalOut {
    return new QueryEvalOut(true, "", value);
}

export function evalErr(err: string): QueryEvalOut {
    return new QueryEvalOut(false, err, false);
}

export function notBool(b: boolean): boolean {
    if (b) {
        return false;
    }
    return true;
}

export function dblOpenBrace(): string {
    return "{" + "{";
}

export function dblCloseBrace(): string {
    return "}" + "}";
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

export function timesInt(n: number, m: number): number {
    let r: number = 0;
    let i: number = 0;
    while (i < m) {
        r += n;
        i += 1;
    }
    return r;
}

export function lowerAlphabet(): string {
    return "abcdefghijklmnopqrstuvwxyz";
}

export function asciiLower(s: string): string {
    let out: string = "";
    const lower = lowerAlphabet();
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

export function containsIgnoreCase(hay: string, needle: string): boolean {
    return findStr(asciiLower(hay), asciiLower(needle)) >= 0;
}

export function eqAsciiIgnoreCase(a: string, b: string): boolean {
    if (Number(a.length) != Number(b.length)) {
        return false;
    }
    let i: number = 0;
    while (i < Number(a.length)) {
        let ca: number = a.charCodeAt(i);
        let cb: number = b.charCodeAt(i);
        if (ca >= 65 && ca <= 90) {
            ca += 32;
        }
        if (cb >= 65 && cb <= 90) {
            cb += 32;
        }
        if (ca != cb) {
            return false;
        }
        i += 1;
    }
    return true;
}

export function splitWs(s: string): string[] {
    let out: string[] = [];
    let i: number = 0;
    const n: number = Number(s.length);
    while (i < n) {
        if (isWs(s.charCodeAt(i))) {
            i += 1;
        } else {
            let j: number = i;
            while (j < n) {
                if (isWs(s.charCodeAt(j))) {
                    break;
                }
                j += 1;
            }
            out.push(s.slice(i, j));
            i = j;
        }
    }
    return out;
}

export function digitsToI64(s: string): number {
    if (Number(s.length) == 0) {
        return -999999999;
    }
    let i: number = 0;
    let neg: number = 1;
    if (s.charCodeAt(0) == 45) {
        neg = -1;
        i = 1;
        if (Number(s.length) == 1) {
            return -999999999;
        }
    }
    let v: number = 0;
    while (i < Number(s.length)) {
        const c = s.charCodeAt(i);
        if (c < 48 || c > 57) {
            return -999999999;
        }
        v = timesInt(v, 10) + c - 48;
        i += 1;
    }
    if (neg == -1) {
        return 0 - v;
    }
    return v;
}

export function isDigits(s: string): boolean {
    if (Number(s.length) == 0) {
        return false;
    }
    let i: number = 0;
    while (i < Number(s.length)) {
        const c = s.charCodeAt(i);
        if (c < 48 || c > 57) {
            return false;
        }
        i += 1;
    }
    return true;
}

export function pad2(n: number): string {
    if (n < 10) {
        return "0" + String(n);
    }
    return String(n);
}

export function intMod(a: number, m: number): number {
    let r: number = a;
    while (r >= m) {
        r -= m;
    }
    while (r < 0) {
        r += m;
    }
    return r;
}

export function isLeapYear(y: number): boolean {
    if (intMod(y, 4) != 0) {
        return false;
    }
    if (intMod(y, 100) != 0) {
        return true;
    }
    return intMod(y, 400) == 0;
}

export function daysInMonth(y: number, m: number): number {
    if (m == 2) {
        if (isLeapYear(y)) {
            return 29;
        }
        return 28;
    }
    if (m == 4 || m == 6 || m == 9 || m == 11) {
        return 30;
    }
    return 31;
}

export function addDaysIso(iso: string, offset: number): string {
    const parts = iso.split("-");
    if (Number(parts.length) != 3) {
        return iso;
    }
    const y = digitsToI64(parts[0]);
    const m = digitsToI64(parts[1]);
    const d = digitsToI64(parts[2]);
    if (y == -999999999 || m == -999999999 || d == -999999999) {
        return iso;
    }
    let day: number = d + offset;
    let month: number = m;
    let year: number = y;
    while (day > daysInMonth(year, month)) {
        day -= daysInMonth(year, month);
        month += 1;
        if (month > 12) {
            month = 1;
            year += 1;
        }
    }
    while (day < 1) {
        month -= 1;
        if (month < 1) {
            month = 12;
            year -= 1;
        }
        day += daysInMonth(year, month);
    }
    let ys: string = String(year);
    while (Number(ys.length) < 4) {
        ys = "0" + ys;
    }
    return ys + "-" + pad2(month) + "-" + pad2(day);
}

export function taskDateToIso(raw: string): string {
    let i: number = 0;
    while (i < Number(raw.length)) {
        if (isWs(raw.charCodeAt(i))) {
            break;
        }
        i += 1;
    }
    const token = raw.slice(0, i);
    const parts = token.split("-");
    if (Number(parts.length) != 3) {
        return "";
    }
    if (!isDigits(parts[1]) || !isDigits(parts[2])) {
        return "";
    }
    if (Number(parts[1].length) > 2 || Number(parts[2].length) > 2) {
        return "";
    }
    if (!isDigits(parts[0]) || Number(parts[0].length) != 4) {
        return "";
    }
    const mo = digitsToI64(parts[1]);
    const da = digitsToI64(parts[2]);
    if (mo < 1 || mo > 12) {
        return "";
    }
    if (da < 1 || da > 31) {
        return "";
    }
    return parts[0] + "-" + pad2(mo) + "-" + pad2(da);
}

export function isoLe(a: string, b: string): boolean {
    


    const n: number = Number(a.length);
    if (n != Number(b.length)) {
        return n < Number(b.length);
    }
    let i: number = 0;
    while (i < n) {
        const ca = a.charCodeAt(i);
        const cb = b.charCodeAt(i);
        if (ca < cb) {
            return true;
        }
        if (ca > cb) {
            return false;
        }
        i += 1;
    }
    return true;
}

export function parseOffsetDays(s: string): OffsetDays {
    let t: string = trimStr(s);
    if (t == "today") {
        return new OffsetDays(true, "", 0);
    }
    let i: number = 0;
    let digitsEnd: number = -1;
    while (i < Number(t.length)) {
        const c = t.charCodeAt(i);
        if (c >= 48 && c <= 57 || c == 45) {
            digitsEnd = i;
            i += 1;
        } else {
            break;
        }
    }
    if (digitsEnd < 0) {
        return new OffsetDays(false, "Invalid offset number: " + s, 0);
    }
    const numPart = t.slice(0, i);
    const unit = t.slice(i);
    if (numPart == "" || numPart == "-") {
        return new OffsetDays(false, "Invalid offset number: " + s, 0);
    }
    const n = digitsToI64(numPart);
    if (n == -999999999) {
        return new OffsetDays(false, "Invalid offset number: " + s, 0);
    }
    if (unit == "d") {
        return new OffsetDays(true, "", n);
    }
    if (unit == "w") {
        return new OffsetDays(true, "", timesInt(n, 7));
    }
    if (unit == "m") {
        return new OffsetDays(true, "", timesInt(n, 30));
    }
    if (unit == "y") {
        return new OffsetDays(true, "", timesInt(n, 365));
    }
    return new OffsetDays(false, "Invalid offset unit: " + t, 0);
}

export function evalQuery(input: string, qtask: QueryTask, todayIso: string): QueryEvalOut {
    let t: string = trimStr(input);
    if (startsWithStr(t, dblOpenBrace()) && endsWithStr(t, dblCloseBrace())) {
        t = trimStr(t.slice(2, Number(t.length) - 2));
    }
    if (startsWithStr(t, "query")) {
        t = trimStr(t.slice(5));
    }
    t = trimOuterBraces(t);
    if (t == "") {
        return evalErr("empty query");
    }
    return evalAt(t, qtask, todayIso);
}

export function trimOuterBraces(s: string): string {
    let t: string = trimStr(s);
    while (startsWithStr(t, "(") && endsWithStr(t, ")")) {
        t = trimStr(t.slice(1, Number(t.length) - 1));
    }
    return t;
}

export function evalAt(s: string, qtask: QueryTask, todayIso: string): QueryEvalOut {
    const t = trimOuterBraces(s);
    if (t == "") {
        return evalErr("empty query");
    }
    if (startsWithStr(t, "and ")) {
        return evalList(t.slice(4), qtask, todayIso, true);
    }
    if (startsWithStr(t, "or ")) {
        return evalList(t.slice(3), qtask, todayIso, false);
    }
    if (startsWithStr(t, "not ")) {
        const sub = evalAt(t.slice(4), qtask, todayIso);
        if (sub.ok == false) {
            return sub;
        }
        return evalOut(notBool(sub.value));
    }
    if (startsWithStr(t, "task ")) {
        const markers = splitWs(t.slice(5));
        let hit: boolean = false;
        let i: number = 0;
        while (i < Number(markers.length)) {
            if (eqAsciiIgnoreCase(qtask.marker, markers[i])) {
                hit = true;
            }
            i += 1;
        }
        return evalOut(hit);
    }
    if (startsWithStr(t, "priority ")) {
        const prios = splitWs(t.slice(9));
        let hit: boolean = false;
        let i: number = 0;
        while (i < Number(prios.length)) {
            if (qtask.priority != "" && eqAsciiIgnoreCase(qtask.priority, prios[i])) {
                hit = true;
            }
            i += 1;
        }
        return evalOut(hit);
    }
    if (startsWithStr(t, "between ")) {
        const parts = splitWs(t.slice(8));
        if (Number(parts.length) != 2) {
            return evalErr("between expects two offsets");
        }
        const startOff = parseOffsetDays(parts[0]);
        if (startOff.ok == false) {
            return evalErr(startOff.err);
        }
        const endOff = parseOffsetDays(parts[1]);
        if (endOff.ok == false) {
            return evalErr(endOff.err);
        }
        const startIso = addDaysIso(todayIso, startOff.days);
        const endIso = addDaysIso(todayIso, endOff.days);
        let hit: boolean = false;
        const d1 = taskDateToIso(qtask.scheduled);
        if (d1 != "") {
            if (isoLe(startIso, d1) && isoLe(d1, endIso)) {
                hit = true;
            }
        }
        const d2 = taskDateToIso(qtask.deadline);
        if (d2 != "") {
            if (isoLe(startIso, d2) && isoLe(d2, endIso)) {
                hit = true;
            }
        }
        return evalOut(hit);
    }
    if (startsWithStr(t, "property ")) {
        const body = t.slice(9);
        if (findStr(body, " ") < 0) {
            return evalErr("property expects key and value");
        }
        return evalOut(false);
    }
    if (startsWithStr(t, "[[") && endsWithStr(t, "]]")) {
        const inner = t.slice(2, Number(t.length) - 2);
        const hit = eqAsciiIgnoreCase(qtask.title, inner) || containsIgnoreCase(qtask.content, inner);
        return evalOut(hit);
    }
    if (startsWithStr(t, "#")) {
        const tag = t.slice(1);
        const hit = containsIgnoreCase(qtask.content, "#" + tag) || findStr(qtask.content, "[[" + tag + "]]") >= 0;
        return evalOut(hit);
    }
    return evalErr("Unknown query: " + t);
}

export function evalList(rest: string, qtask: QueryTask, todayIso: string, isAnd: boolean): QueryEvalOut {
    

    let anyFalse: boolean = false;
    let anyTrue: boolean = false;
    const n: number = Number(rest.length);
    let depth: number = 0;
    let start: number = 0;
    let i: number = 0;
    while (i <= n) {
        let boundary: boolean = false;
        if (i == n) {
            boundary = true;
        } else {
            const c = rest.charCodeAt(i);
            if (c == 40) {
                depth += 1;
            }
            if (c == 41) {
                depth -= 1;
            }
            if (c == 32 && depth == 0) {
                boundary = true;
            }
        }
        if (boundary) {
            if (i > start) {
                const sub = evalAt(rest.slice(start, i), qtask, todayIso);
                if (sub.ok == false) {
                    return sub;
                }
                if (sub.value) {
                    anyTrue = true;
                } else {
                    anyFalse = true;
                }
            }
            start = i + 1;
        }
        i += 1;
    }
    if (isAnd) {
        return evalOut(notBool(anyFalse));
    }
    return evalOut(anyTrue);
}