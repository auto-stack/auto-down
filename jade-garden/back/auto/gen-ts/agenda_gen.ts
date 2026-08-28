export class AgTaskRef {
    scheduled: string;
    deadline: string;
    index: number;

    constructor(scheduled: string, deadline: string, index: number) {
        this.scheduled = scheduled;
        this.deadline = deadline;
        this.index = index;
    }
}

export class AgGroup {
    date: string;
    indexes: number[];

    constructor(date: string, indexes: number[]) {
        this.date = date;
        this.indexes = indexes;
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

export function isDigit(c: number): boolean {
    return c >= 48 && c <= 57;
}

export function digitChar(d: number): string {
    return "0123456789".slice(d, d + 1);
}

export function div10(v: number): number {
    let q: number = 0;
    let r: number = v;
    while (r >= 10) {
        r = r - 10;
        q = q + 1;
    }
    return q;
}

export function div100(v: number): number {
    let q: number = 0;
    let r: number = v;
    while (r >= 100) {
        r = r - 100;
        q = q + 1;
    }
    return q;
}

export function pad2(v: number): string {
    if (v < 10) {
        return "0" + digitChar(v);
    }
    const tens = div10(v);
    const ones: number = v - tens * 10;
    return digitChar(tens) + digitChar(ones);
}

export function pad4(v: number): string {
    const hi = div100(v);
    const lo: number = v - hi * 100;
    return pad2(hi) + pad2(lo);
}

export function daysInMonth(year: number, month: number): number {
    

    const lengths: number[] = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (month < 1) {
        return 0;
    }
    if (month > 12) {
        return 0;
    }
    if (month != 2) {
        return lengths[month - 1];
    }
    let leap: boolean = false;
    if (year % 4 == 0) {
        leap = true;
        if (year % 100 == 0) {
            leap = false;
            if (year % 400 == 0) {
                leap = true;
            }
        }
    }
    if (leap) {
        return 29;
    }
    return 28;
}

export function normalizeDate(raw: string): string {
    const n: number = Number(raw.length);
    let s: number = 0;
    while (s < n) {
        if (!isWs(raw.charCodeAt(s))) {
            break;
        }
        s += 1;
    }
    let e: number = s;
    while (e < n) {
        if (isWs(raw.charCodeAt(e))) {
            break;
        }
        e += 1;
    }
    if (e <= s) {
        return "";
    }
    

    let i: number = s;
    let year: number = 0;
    let k: number = 0;
    while (k < 4) {
        if (!isDigit(raw.charCodeAt(i))) {
            return "";
        }
        year = year * 10 + raw.charCodeAt(i) - 48;
        i += 1;
        k += 1;
    }
    if (raw.charCodeAt(i) != 45) {
        return "";
    }
    i += 1;
    

    let month: number = 0;
    let mdigits: number = 0;
    while (i < e) {
        if (!isDigit(raw.charCodeAt(i))) {
            break;
        }
        if (mdigits >= 2) {
            break;
        }
        month = month * 10 + raw.charCodeAt(i) - 48;
        i += 1;
        mdigits += 1;
    }
    if (mdigits == 0) {
        return "";
    }
    if (i >= e) {
        return "";
    }
    if (raw.charCodeAt(i) != 45) {
        return "";
    }
    i += 1;
    

    let day: number = 0;
    let ddigits: number = 0;
    while (i < e) {
        if (!isDigit(raw.charCodeAt(i))) {
            break;
        }
        if (ddigits >= 2) {
            break;
        }
        day = day * 10 + raw.charCodeAt(i) - 48;
        i += 1;
        ddigits += 1;
    }
    if (ddigits == 0) {
        return "";
    }
    if (i != e) {
        return "";
    }
    if (day < 1) {
        return "";
    }
    if (day > daysInMonth(year, month)) {
        return "";
    }
    return pad4(year) + "-" + pad2(month) + "-" + pad2(day);
}

export function strGE(a: string, b: string): boolean {
    return a >= b;
}

export function strLE(a: string, b: string): boolean {
    return a <= b;
}

export function groupAgenda(entries: AgTaskRef[], today: string, end: string): AgGroup[] {
    

    let pairDate: string[] = [];
    let pairIdx: number[] = [];
    const count: number = Number(entries.length);
    let i: number = 0;
    while (i < count) {
        const en = entries[i];
        const ds = normalizeDate(en.scheduled);
        if (ds != "" && strGE(ds, today) && strLE(ds, end)) {
            pairDate.push(ds);
            pairIdx.push(en.index);
        }
        const dd = normalizeDate(en.deadline);
        if (dd != "" && strGE(dd, today) && strLE(dd, end)) {
            pairDate.push(dd);
            pairIdx.push(en.index);
        }
        i += 1;
    }
    

    let unique: string[] = [];
    let j: number = 0;
    while (j < Number(pairDate.length)) {
        const d = pairDate[j];
        let seen: boolean = false;
        let q: number = 0;
        while (q < Number(unique.length)) {
            if (unique[q] == d) {
                seen = true;
            }
            q += 1;
        }
        if (!seen) {
            unique.push(d);
        }
        j += 1;
    }
    


    let dates: string[] = [];
    let last: string = "";
    while (Number(dates.length) < Number(unique.length)) {
        let best: string = "";
        let r: number = 0;
        while (r < Number(unique.length)) {
            const u = unique[r];
            if (last == "" || u > last) {
                if (best == "" || u < best) {
                    best = u;
                }
            }
            r += 1;
        }
        dates.push(best);
        last = best;
    }
    

    let out: AgGroup[] = [];
    let di: number = 0;
    while (di < Number(dates.length)) {
        const d = dates[di];
        let idxs: number[] = [];
        let p: number = 0;
        while (p < Number(pairDate.length)) {
            if (pairDate[p] == d) {
                idxs.push(pairIdx[p]);
            }
            p += 1;
        }
        out.push(new AgGroup(d, idxs));
        di += 1;
    }
    return out;
}