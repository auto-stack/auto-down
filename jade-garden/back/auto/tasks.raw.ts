export class TaskScanItem {
    pagePath: string;
    title: string;
    line: number;
    raw: string;
    marker: string;
    priority: string;
    content: string;
    scheduled: string;
    deadline: string;

    constructor(pagePath: string, title: string, line: number, raw: string, marker: string, priority: string, content: string, scheduled: string, deadline: string) {
        this.pagePath = pagePath;
        this.title = title;
        this.line = line;
        this.raw = raw;
        this.marker = marker;
        this.priority = priority;
        this.content = content;
        this.scheduled = scheduled;
        this.deadline = deadline;
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

export function isMarkerKwAt(s: string): string {
    if (startsWithStr(s, "TODO")) {
        return markerIfBoundary(s, 4);
    }
    if (startsWithStr(s, "DOING")) {
        return markerIfBoundary(s, 5);
    }
    if (startsWithStr(s, "DONE")) {
        return markerIfBoundary(s, 4);
    }
    if (startsWithStr(s, "NOW")) {
        return markerIfBoundary(s, 3);
    }
    if (startsWithStr(s, "LATER")) {
        return markerIfBoundary(s, 5);
    }
    return "";
}

export function markerIfBoundary(s: string, kwLen: number): string {
    const next = s.charCodeAt(kwLen);
    if (isWordChar(next)) {
        return "";
    }
    return s.slice(0, kwLen);
}

export function taskMarkerOf(line: string): string {
    const indent = indentWidth(line);
    const rest = line.slice(indent);
    if (!startsWithStr(rest, "- ")) {
        return "";
    }
    return isMarkerKwAt(rest.slice(2));
}

export function isPriorityTagAt(s: string, at: number): boolean {
    

    if (!startsWithStr(s.slice(at), "[#")) {
        return false;
    }
    const c = s.charCodeAt(at + 2);
    if (c != 65 && c != 66 && c != 67) {
        return false;
    }
    return s.charCodeAt(at + 3) == 93;
}

export function findPriorityTag(rest: string): string {
    const n: number = Number(rest.length);
    let i: number = 0;
    while (i + 3 < n) {
        if (isPriorityTagAt(rest, i)) {
            return rest.slice(i + 2, i + 3);
        }
        i += 1;
    }
    return "";
}

export function stripPriorityTag(content: string): string {
    


    const n: number = Number(content.length);
    let found: number = -1;
    let i: number = 0;
    while (i + 3 < n) {
        if (isPriorityTagAt(content, i)) {
            found = i;
            break;
        }
        i += 1;
    }
    if (found < 0) {
        return trimStr(content);
    }
    let out: string = "";
    let k: number = 0;
    while (k < n) {
        if (k == found || k == found + 1 || k == found + 2 || k == found + 3) {
            

        } else {
            out = out + content.slice(k, k + 1);
        }
        k += 1;
    }
    return trimStr(out);
}

export function scheduleValueOf(line: string): string {
    const p = indentWidth(line);
    const rest = line.slice(p);
    let kwLen: number = 0;
    if (startsWithStr(rest, "SCHEDULED:")) {
        kwLen = 10;
    } else {
        if (startsWithStr(rest, "DEADLINE:")) {
            kwLen = 9;
        } else {
            return "";
        }
    }
    const v = trimStartStr(rest.slice(kwLen));
    if (v.charCodeAt(0) != 60) {
        return "";
    }
    let j: number = 1;
    while (j < Number(v.length)) {
        if (v.charCodeAt(j) == 62) {
            return v.slice(1, j);
        }
        j += 1;
    }
    return "";
}

export function parseTasksLines(pagePath: string, title: string, lines: string[]): TaskScanItem[] {
    let out: TaskScanItem[] = [];
    const count: number = Number(lines.length);
    let i: number = 0;
    while (i < count) {
        const line = lines[i];
        const marker = taskMarkerOf(line);
        if (marker != "") {
            const indent = indentWidth(line);
            const rest = line.slice(indent + 2 + Number(marker.length));
            const priority = findPriorityTag(rest);
            const content = stripPriorityTag(trimStr(rest));
            

            let scheduled: string = "";
            let deadline: string = "";
            let j: number = i + 1;
            while (j < count) {
                const next = lines[j];
                const nextIndent = indentWidth(next);
                if (trimStr(next) == "" || nextIndent <= indent) {
                    break;
                }
                const sv = scheduleValueOf(next);
                if (sv != "") {
                    if (startsWithStr(trimStartStr(next), "SCHEDULED:")) {
                        scheduled = sv;
                    } else {
                        deadline = sv;
                    }
                }
                j += 1;
            }
            out.push(new TaskScanItem(pagePath, title, i, line, marker, priority, content, scheduled, deadline));
        }
        i += 1;
    }
    return out;
}