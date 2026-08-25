export class PanelSpec {
    kind: string;
    tag: string;
    class_token: string;
    registry: string;
    extension: boolean;

    constructor(kind: string, tag: string, class_token: string, registry: string, extension: boolean) {
        this.kind = kind;
        this.tag = tag;
        this.class_token = class_token;
        this.registry = registry;
        this.extension = extension;
    }
}

export function panelHeading(level: number): PanelSpec {
    let l: number = level;
    if (l < 1) {
        l = 1;
    }
    if (l > 6) {
        l = 6;
    }
    return PanelSpec("H" + String(l), "h" + String(l), "heading-node", "Heading", false);
}

export function panelOfBlock(blockType: string): PanelSpec {
    if (blockType == "paragraph") {
        return PanelSpec("Text", "p", "paragraph-node", "Text", false);
    }
    if (blockType == "text") {
        return PanelSpec("Text", "span", "text-node", "Text", false);
    }
    if (blockType == "heading") {
        return panelHeading(1);
    }
    if (blockType == "thematic_break") {
        return PanelSpec("Separator", "hr", "hr-node", "Separator", false);
    }
    if (blockType == "code_block") {
        return PanelSpec("Codeblock", "div", "code-block-container", "Codeblock", false);
    }
    if (blockType == "blockquote") {
        return PanelSpec("Quote", "blockquote", "blockquote", "Quote", false);
    }
    if (blockType == "list") {
        return PanelSpec("List", "ul", "list-node", "List", false);
    }
    if (blockType == "table") {
        return PanelSpec("Table", "table", "table-node", "Table", false);
    }
    

    if (blockType == "callout") {
        return PanelSpec("Callout", "div", "callout-node", "Callout", true);
    }
    if (blockType == "details") {
        return PanelSpec("Details", "div", "details-node", "Details", true);
    }
    if (blockType == "math_block") {
        return PanelSpec("MathBlock", "div", "math-block", "MathBlock", true);
    }
    if (blockType == "mermaid") {
        return PanelSpec("Mermaid", "div", "mermaid-block-container", "Mermaid", true);
    }
    if (blockType == "query") {
        return PanelSpec("Query", "div", "query-block", "Query", true);
    }
    if (blockType == "embed") {
        return PanelSpec("Embed", "div", "embed-block", "Embed", true);
    }
    return PanelSpec("Unknown", "div", "unknown-node", "", false);
}

export function isExtensionPanel(kind: string): boolean {
    if (kind == "Callout") {
        return true;
    }
    if (kind == "Details") {
        return true;
    }
    if (kind == "MathBlock") {
        return true;
    }
    if (kind == "Mermaid") {
        return true;
    }
    if (kind == "Query") {
        return true;
    }
    if (kind == "Embed") {
        return true;
    }
    return false;
}

export function builtinPanelKinds(): string[] {
    return ["Text", "H1", "H2", "H3", "H4", "H5", "H6", "Separator", "Codeblock", "Quote", "List", "Table"];
}

export function extensionPanelKinds(): string[] {
    return ["Callout", "Details", "MathBlock", "Mermaid", "Query", "Embed"];
}