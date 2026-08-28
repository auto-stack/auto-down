export class ApiError {
    error: string;

    constructor(error: string) {
        this.error = error;
    }
}

export class JsonAny {
}

export class WorkspaceInfo {
    root: string | null;
    wiki_dir: string | null;

    constructor(root: string | null, wiki_dir: string | null) {
        this.root = root;
        this.wiki_dir = wiki_dir;
    }
}

export class WorkspaceOpenRequest {
    root: string;

    constructor(root: string) {
        this.root = root;
    }
}

export class FileNode {
    name: string;
    path: string;
    is_dir: boolean;
    children: FileNode[];

    constructor(name: string, path: string, is_dir: boolean, children: FileNode[]) {
        this.name = name;
        this.path = path;
        this.is_dir = is_dir;
        this.children = children;
    }
}

export class FileCreateRequest {
    path: string;
    is_dir: boolean;

    constructor(path: string, is_dir: boolean) {
        this.path = path;
        this.is_dir = is_dir;
    }
}

export class FileRenameRequest {
    old_path: string;
    new_path: string;

    constructor(old_path: string, new_path: string) {
        this.old_path = old_path;
        this.new_path = new_path;
    }
}

export class FileDeleteRequest {
    path: string;

    constructor(path: string) {
        this.path = path;
    }
}

export class UploadAssetResponse {
    path: string;

    constructor(path: string) {
        this.path = path;
    }
}

export class WikiDoc {
    frontmatter: Record<string, any>;
    body: string;

    constructor(frontmatter: Record<string, any>, body: string) {
        this.frontmatter = frontmatter;
        this.body = body;
    }
}

export class Backlink {
    source_title: string;
    source_path: string;
    context: string;

    constructor(source_title: string, source_path: string, context: string) {
        this.source_title = source_title;
        this.source_path = source_path;
        this.context = context;
    }
}

export class Outlink {
    target_title: string;
    target_path: string | null;
    exists: boolean;
    block_id: string | null;

    constructor(target_title: string, target_path: string | null, exists: boolean, block_id: string | null) {
        this.target_title = target_title;
        this.target_path = target_path;
        this.exists = exists;
        this.block_id = block_id;
    }
}

export class GraphNode {
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

export class GraphEdge {
    source: string;
    target: string;
    block_id: string | null;

    constructor(source: string, target: string, block_id: string | null) {
        this.source = source;
        this.target = target;
        this.block_id = block_id;
    }
}

export class GraphData {
    nodes: GraphNode[];
    edges: GraphEdge[];

    constructor(nodes: GraphNode[], edges: GraphEdge[]) {
        this.nodes = nodes;
        this.edges = edges;
    }
}

export class SearchResult {
    type: string;
    path: string | null;
    title: string | null;
    uuid: string | null;
    page_path: string | null;
    block_id: string | null;
    content: string | null;
    snippet: string | null;

    constructor(type: string, path: string | null, title: string | null, uuid: string | null, page_path: string | null, block_id: string | null, content: string | null, snippet: string | null) {
        this.type = type;
        this.path = path;
        this.title = title;
        this.uuid = uuid;
        this.page_path = page_path;
        this.block_id = block_id;
        this.content = content;
        this.snippet = snippet;
    }
}

export class SearchResponse {
    query: string;
    results: SearchResult[];

    constructor(query: string, results: SearchResult[]) {
        this.query = query;
        this.results = results;
    }
}

export class TaskItem {
    page_path: string;
    title: string;
    line: number;
    raw: string;
    marker: string;
    priority: string | null;
    content: string;
    scheduled: string | null;
    deadline: string | null;

    constructor(page_path: string, title: string, line: number, raw: string, marker: string, priority: string | null, content: string, scheduled: string | null, deadline: string | null) {
        this.page_path = page_path;
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

export class TasksResponse {
    tasks: TaskItem[];

    constructor(tasks: TaskItem[]) {
        this.tasks = tasks;
    }
}

export class AgendaGroup {
    date: string;
    tasks: TaskItem[];

    constructor(date: string, tasks: TaskItem[]) {
        this.date = date;
        this.tasks = tasks;
    }
}

export class AgendaResponse {
    groups: AgendaGroup[];

    constructor(groups: AgendaGroup[]) {
        this.groups = groups;
    }
}

export class QueryResponse {
    results: TaskItem[];

    constructor(results: TaskItem[]) {
        this.results = results;
    }
}

export class Card {
    page_path: string;
    block_id: string;
    uuid: string;
    raw: string;
    question: string;
    answer: string;
    deck: string | null;
    ease_factor: number;
    repeats: number;
    last_interval: number;
    next_schedule: string | null;
    last_score: number | null;
    last_reviewed: string | null;

    constructor(page_path: string, block_id: string, uuid: string, raw: string, question: string, answer: string, deck: string | null, ease_factor: number, repeats: number, last_interval: number, next_schedule: string | null, last_score: number | null, last_reviewed: string | null) {
        this.page_path = page_path;
        this.block_id = block_id;
        this.uuid = uuid;
        this.raw = raw;
        this.question = question;
        this.answer = answer;
        this.deck = deck;
        this.ease_factor = ease_factor;
        this.repeats = repeats;
        this.last_interval = last_interval;
        this.next_schedule = next_schedule;
        this.last_score = last_score;
        this.last_reviewed = last_reviewed;
    }
}

export class CardsResponse {
    cards: Card[];

    constructor(cards: Card[]) {
        this.cards = cards;
    }
}

export class CardReviewRequest {
    page_path: string;
    block_id: string;
    grade: number;

    constructor(page_path: string, block_id: string, grade: number) {
        this.page_path = page_path;
        this.block_id = block_id;
        this.grade = grade;
    }
}

export class CardReviewResponse {
    card: Card;

    constructor(card: Card) {
        this.card = card;
    }
}

export class ImportResult {
    imported: number;

    constructor(imported: number) {
        this.imported = imported;
    }
}

export class SyncStatus {
    status: string;
    message: string;

    constructor(status: string, message: string) {
        this.status = status;
        this.message = message;
    }
}

export class WhiteboardShape {
    id: string;
    kind: string;
    x: number;
    y: number;
    width: number;
    height: number;
    label: string;
    target: string | null;

    constructor(id: string, kind: string, x: number, y: number, width: number, height: number, label: string, target: string | null) {
        this.id = id;
        this.kind = kind;
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.label = label;
        this.target = target;
    }
}

export class WhiteboardDoc {
    shapes: WhiteboardShape[];

    constructor(shapes: WhiteboardShape[]) {
        this.shapes = shapes;
    }
}

export class BlockInfo {
    uuid: string;
    page_path: string;
    block_id: string | null;
    kind: string;
    content: string;
    properties: Record<string, any>;
    line_start: number;
    line_end: number;

    constructor(uuid: string, page_path: string, block_id: string | null, kind: string, content: string, properties: Record<string, any>, line_start: number, line_end: number) {
        this.uuid = uuid;
        this.page_path = page_path;
        this.block_id = block_id;
        this.kind = kind;
        this.content = content;
        this.properties = properties;
        this.line_start = line_start;
        this.line_end = line_end;
    }
}

export class BlockResponse {
    found: boolean;
    block: BlockInfo | null;

    constructor(found: boolean, block: BlockInfo | null) {
        this.found = found;
        this.block = block;
    }
}

export class UnlinkedRef {
    page_path: string;
    block_uuid: string | null;
    context: string;
    matched_text: string;

    constructor(page_path: string, block_uuid: string | null, context: string, matched_text: string) {
        this.page_path = page_path;
        this.block_uuid = block_uuid;
        this.context = context;
        this.matched_text = matched_text;
    }
}

export class UnlinkedRefsResponse {
    title: string;
    refs: UnlinkedRef[];

    constructor(title: string, refs: UnlinkedRef[]) {
        this.title = title;
        this.refs = refs;
    }
}