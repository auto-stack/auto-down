// GENERATED FILE — do not edit by hand.
// Source: packages/engine/auto/render/palette_map.at (Auto language, plan 017
// Phase 2 — panel vocabulary single source, see PANEL-ALIGNMENT.md there).
// Regenerate with: pnpm gen:render (auto/render/gen.mjs —
// `auto trans --path palette_map.at rust` + RP1 pub-struct post-fix).
// Cross-target parity: tests/palette_parity.rs asserts the TS emission's
// golden projection (tests/golden/palette-map.golden.txt, rewritten by the
// engine's rust-palette-parity-gen.test.ts on every `pnpm test`).

#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord)]
pub struct PanelSpec {
    pub kind: String,
    pub tag: String,
    pub class_token: String,
    pub registry: String,
    pub extension: bool,
}

pub fn panelHeading(level: i64) -> PanelSpec {
    let mut l: i64 = level;
    if l < 1 {
        l = 1;
    }
    if l > 6 {
        l = 6;
    }
    return PanelSpec { kind: format!("{}{}", "H", format!("{:?}", l)).to_string(), tag: format!("{}{}", "h", format!("{:?}", l)).to_string(), class_token: "heading-node".to_string(), registry: "Heading".to_string(), extension: false };
}

pub fn panelOfBlock(blockType: &str) -> PanelSpec {
    if blockType == "paragraph" {
        return PanelSpec { kind: "Text".to_string(), tag: "p".to_string(), class_token: "paragraph-node".to_string(), registry: "Text".to_string(), extension: false };
    }
    if blockType == "text" {
        return PanelSpec { kind: "Text".to_string(), tag: "span".to_string(), class_token: "text-node".to_string(), registry: "Text".to_string(), extension: false };
    }
    if blockType == "heading" {
        return panelHeading(1);
    }
    if blockType == "thematic_break" {
        return PanelSpec { kind: "Separator".to_string(), tag: "hr".to_string(), class_token: "hr-node".to_string(), registry: "Separator".to_string(), extension: false };
    }
    if blockType == "code_block" {
        return PanelSpec { kind: "Codeblock".to_string(), tag: "div".to_string(), class_token: "code-block-container".to_string(), registry: "Codeblock".to_string(), extension: false };
    }
    if blockType == "blockquote" {
        return PanelSpec { kind: "Quote".to_string(), tag: "blockquote".to_string(), class_token: "blockquote".to_string(), registry: "Quote".to_string(), extension: false };
    }
    if blockType == "list" {
        return PanelSpec { kind: "List".to_string(), tag: "ul".to_string(), class_token: "list-node".to_string(), registry: "List".to_string(), extension: false };
    }
    if blockType == "table" {
        return PanelSpec { kind: "Table".to_string(), tag: "table".to_string(), class_token: "table-node".to_string(), registry: "Table".to_string(), extension: false };
    }

    if blockType == "callout" {
        return PanelSpec { kind: "Callout".to_string(), tag: "div".to_string(), class_token: "callout-node".to_string(), registry: "Callout".to_string(), extension: true };
    }
    if blockType == "details" {
        return PanelSpec { kind: "Details".to_string(), tag: "div".to_string(), class_token: "details-node".to_string(), registry: "Details".to_string(), extension: true };
    }
    if blockType == "math_block" {
        return PanelSpec { kind: "MathBlock".to_string(), tag: "div".to_string(), class_token: "math-block".to_string(), registry: "MathBlock".to_string(), extension: true };
    }
    if blockType == "mermaid" {
        return PanelSpec { kind: "Mermaid".to_string(), tag: "div".to_string(), class_token: "mermaid-block-container".to_string(), registry: "Mermaid".to_string(), extension: true };
    }
    if blockType == "query" {
        return PanelSpec { kind: "Query".to_string(), tag: "div".to_string(), class_token: "query-block".to_string(), registry: "Query".to_string(), extension: true };
    }
    if blockType == "embed" {
        return PanelSpec { kind: "Embed".to_string(), tag: "div".to_string(), class_token: "embed-block".to_string(), registry: "Embed".to_string(), extension: true };
    }
    return PanelSpec { kind: "Unknown".to_string(), tag: "div".to_string(), class_token: "unknown-node".to_string(), registry: "".to_string(), extension: false };
}

pub fn isExtensionPanel(kind: &str) -> bool {
    if kind == "Callout" {
        return true;
    }
    if kind == "Details" {
        return true;
    }
    if kind == "MathBlock" {
        return true;
    }
    if kind == "Mermaid" {
        return true;
    }
    if kind == "Query" {
        return true;
    }
    if kind == "Embed" {
        return true;
    }
    return false;
}

pub fn builtinPanelKinds() -> Vec<String> {
    return vec!["Text".to_string(), "H1".to_string(), "H2".to_string(), "H3".to_string(), "H4".to_string(), "H5".to_string(), "H6".to_string(), "Separator".to_string(), "Codeblock".to_string(), "Quote".to_string(), "List".to_string(), "Table".to_string()];
}

pub fn extensionPanelKinds() -> Vec<String> {
    return vec!["Callout".to_string(), "Details".to_string(), "MathBlock".to_string(), "Mermaid".to_string(), "Query".to_string(), "Embed".to_string()];
}
