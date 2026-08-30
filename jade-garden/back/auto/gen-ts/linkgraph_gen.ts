export class LgPage {
    path: string;
    title: string;

    constructor(path: string, title: string) {
        this.path = path;
        this.title = title;
    }
}

export class LgAlias {
    tagName: string;
    pagePath: string;

    constructor(tagName: string, pagePath: string) {
        this.tagName = tagName;
        this.pagePath = pagePath;
    }
}

export class LgLink {
    sourcePage: string;
    targetPage: string;
    context: string;
    sourceBlockUuid: string;
    targetBlockUuid: string;
    linkType: string;

    constructor(sourcePage: string, targetPage: string, context: string, sourceBlockUuid: string, targetBlockUuid: string, linkType: string) {
        this.sourcePage = sourcePage;
        this.targetPage = targetPage;
        this.context = context;
        this.sourceBlockUuid = sourceBlockUuid;
        this.targetBlockUuid = targetBlockUuid;
        this.linkType = linkType;
    }
}

export class LgBacklink {
    sourcePage: string;
    sourceBlockUuid: string;
    context: string;

    constructor(sourcePage: string, sourceBlockUuid: string, context: string) {
        this.sourcePage = sourcePage;
        this.sourceBlockUuid = sourceBlockUuid;
        this.context = context;
    }
}

export class LgOutlink {
    targetPage: string;
    targetBlockUuid: string;
    linkType: string;

    constructor(targetPage: string, targetBlockUuid: string, linkType: string) {
        this.targetPage = targetPage;
        this.targetBlockUuid = targetBlockUuid;
        this.linkType = linkType;
    }
}

export class LgNode {
    id: string;
    label: string;
    path: string;
    exists: boolean;
    degree: number;

    constructor(id: string, label: string, path: string, exists: boolean, degree: number) {
        this.id = id;
        this.label = label;
        this.path = path;
        this.exists = exists;
        this.degree = degree;
    }
}

export class LgEdge {
    source: string;
    target: string;

    constructor(source: string, target: string) {
        this.source = source;
        this.target = target;
    }
}

export class LgGraph {
    nodes: LgNode[];
    edges: LgEdge[];

    constructor(nodes: LgNode[], edges: LgEdge[]) {
        this.nodes = nodes;
        this.edges = edges;
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

export function eqIgnoreCase(a: string, b: string): boolean {
    return asciiLower(a) == asciiLower(b);
}

export function strCompare(a: string, b: string): number {
    const n: number = Number(a.length);
    const m: number = Number(b.length);
    let minLen: number = n;
    if (m < n) {
        minLen = m;
    }
    let i: number = 0;
    while (i < minLen) {
        const ca = a.charCodeAt(i);
        const cb = b.charCodeAt(i);
        if (ca < cb) {
            return -1;
        }
        if (ca > cb) {
            return 1;
        }
        i += 1;
    }
    if (n < m) {
        return -1;
    }
    if (n > m) {
        return 1;
    }
    return 0;
}

export function resolvePagePath(pages: LgPage[], aliases: LgAlias[], title: string): string {
    for (const p of pages) {
        if (eqIgnoreCase(p.title, title)) {
            

            return "" + p.path;
        }
    }
    for (const a of aliases) {
        if (eqIgnoreCase(a.tagName, title)) {
            return "" + a.pagePath;
        }
    }
    return "";
}

export function canonicalTitleOf(pages: LgPage[], path: string): string {
    for (const p of pages) {
        if (p.path == path) {
            return "" + p.title;
        }
    }
    return "";
}

export function sortBacklinks(items: LgBacklink[]): LgBacklink[] {
    let out: LgBacklink[] = [];
    for (const it of items) {
        let inserted: boolean = false;
        let res: LgBacklink[] = [];
        for (const e of out) {
            if (!inserted && strCompare(it.sourcePage, e.sourcePage) < 0) {
                res.push(it);
                inserted = true;
            }
            res.push(e);
        }
        if (!inserted) {
            res.push(it);
        }
        out = res;
    }
    return out;
}

export function sortOutlinks(items: LgOutlink[]): LgOutlink[] {
    let out: LgOutlink[] = [];
    for (const it of items) {
        let inserted: boolean = false;
        let res: LgOutlink[] = [];
        for (const e of out) {
            if (!inserted && strCompare(it.targetPage, e.targetPage) < 0) {
                res.push(it);
                inserted = true;
            }
            res.push(e);
        }
        if (!inserted) {
            res.push(it);
        }
        out = res;
    }
    return out;
}

export function backlinksOf(pages: LgPage[], aliases: LgAlias[], links: LgLink[], title: string): LgBacklink[] {
    let out: LgBacklink[] = [];
    const targetPath = resolvePagePath(pages, aliases, title);
    if (targetPath == "") {
        return out;
    }
    const canonical = canonicalTitleOf(pages, targetPath);
    if (canonical == "") {
        return out;
    }
    for (const l of links) {
        if (l.targetPage != "") {
            if (eqIgnoreCase(l.targetPage, canonical)) {
                out.push(new LgBacklink(l.sourcePage, l.sourceBlockUuid, l.context));
            }
        }
    }
    return sortBacklinks(out);
}

export function outlinksOf(pages: LgPage[], aliases: LgAlias[], links: LgLink[], title: string): LgOutlink[] {
    let out: LgOutlink[] = [];
    const source = resolvePagePath(pages, aliases, title);
    if (source == "") {
        return out;
    }
    for (const l of links) {
        if (l.sourcePage == source) {
            out.push(new LgOutlink(l.targetPage, l.targetBlockUuid, l.linkType));
        }
    }
    return sortOutlinks(out);
}

export function nodeKnown(nodes: LgNode[], id: string): boolean {
    for (const n of nodes) {
        if (n.id == id) {
            return true;
        }
    }
    return false;
}

export function sortNodes(items: LgNode[]): LgNode[] {
    let out: LgNode[] = [];
    for (const it of items) {
        let inserted: boolean = false;
        let res: LgNode[] = [];
        for (const e of out) {
            if (!inserted && strCompare(it.id, e.id) < 0) {
                res.push(it);
                inserted = true;
            }
            res.push(e);
        }
        if (!inserted) {
            res.push(it);
        }
        out = res;
    }
    return out;
}

export function graphData(pages: LgPage[], aliases: LgAlias[], links: LgLink[]): LgGraph {
    


    let nodes: LgNode[] = [];
    for (const p of pages) {
        nodes.push(new LgNode(p.path, p.title, p.path, true, 0));
    }
    nodes = sortNodes(nodes);
    

    let edges: LgEdge[] = [];
    for (const l of links) {
        if (l.targetPage != "") {
            const targetPath = resolvePagePath(pages, aliases, l.targetPage);
            if (targetPath != "") {
                const sourceId = l.sourcePage;
                const targetId = targetPath;
                if (nodeKnown(nodes, sourceId) && nodeKnown(nodes, targetId)) {
                    edges.push(new LgEdge(sourceId, targetId));
                }
            }
        }
    }
    



    let out: LgNode[] = [];
    for (const n of nodes) {
        let degree: number = 0;
        for (const e of edges) {
            if (e.source == n.id) {
                degree += 1;
            }
            if (e.target == n.id) {
                degree += 1;
            }
        }
        out.push(new LgNode(n.id, n.label, n.path, n.exists, degree));
    }
    return new LgGraph(out, edges);
}