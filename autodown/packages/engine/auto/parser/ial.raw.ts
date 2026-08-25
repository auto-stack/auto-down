export class TableAttr {
    cols: (number | null)[];
    rows: (number | null)[];

    constructor(cols: (number | null)[], rows: (number | null)[]) {
        this.cols = cols;
        this.rows = rows;
    }
}

export function parseValue(s: string): number | null {
    const trimmed = s.trim().replace(RegExp("^[\"']|[\"']$", "g"), "");
    if (trimmed == "auto") {
        return null;
    }
    const num = parseInt(trimmed, 10);
    if (isNaN(num)) {
        return null;
    }
    return num;
}

export function parseArray(s: string): (number | null)[] {
    return s.split(",").map((v) => parseValue(v));
}

export function parseRows(s: string): (number | null)[] {
    if (s == null || s == "") {
        return [];
    }
    return parseArray(s);
}

export function formatValue(v: number | null): string {
    if (v == null) {
        return "\"auto\"";
    }
    return String(v);
}

export function formatArray(arr: (number | null)[]): string {
    return arr.map((v) => formatValue(v)).join(",");
}

export function hasAnyValue(arr: (number | null)[]): boolean {
    return arr.some((v) => v != null);
}

export function preprocessMarkdown(md: string): any {
    let tableAttrs = [];
    const re = RegExp("(\\|[^\\n]*\\|[ \\t]*\\n\\|[-:\\| \\t]+\\|[ \\t]*\\n(?:\\|[^\\n]*\\|[ \\t]*\\n)+)\\{cols:\\[(.*?)\\](?:,\\s*rows:\\[(.*?)\\])?\\}[ \\t]*(?:\\n|$)", "g");
    const cleaned = md.replace(re, (m, tableBody, colsStr, rowsStr) => {tableAttrs.push({ cols: parseArray(colsStr), rows: parseRows(rowsStr) });return tableBody;});
    return { md: cleaned, tableAttrs: tableAttrs };
}

export function buildIAL(colwidth: (number | null)[], rowheight: (number | null)[]): string | null {
    const hasCols = hasAnyValue(colwidth);
    const hasRows = hasAnyValue(rowheight);
    if (!hasCols && !hasRows) {
        return null;
    }
    let parts = [];
    if (hasCols) {
        parts.push(`cols:[${formatArray(colwidth)}]`);
    }
    if (hasRows) {
        parts.push(`rows:[${formatArray(rowheight)}]`);
    }
    return "{" + parts.join(", ") + "}\n";
}