//! 跨轨高亮 token 映射表（PLAN-041 T4）——**rust 单源**手写模块。
//!
//! VM 侧 syntect 的 scope 名（`keyword.control.rust` 等）映射到与 vue 侧
//! lowlight 输出**同名**的 `.hljs-*` CSS 类：颜色观感对齐不换引擎
//! （tokenize 仍由 syntect 完成，仅类名约定与色板跨轨共享——vue 侧样式
//! 表在 `packages/engine/src/editor/styles/autodown-editor.css`，本模块
//! 的 `hljs_palette` 是其取值的 rust 镜像）。
//!
//! 与 crate 其余 a2r 生成模块不同：本模块**没有 .at 源**，以 rust 为唯
//! 一事实源（regen 不触本文件）。消费方 = auto-lang 的 VM 渲染器
//! （hljs 主题烘焙：scope→类→色板 → syntect Theme）。

/// 一行映射：syntect scope 前缀（原子边界匹配）→ `.hljs-*` 类名。
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct ScopeClassMap {
    /// scope 前缀（如 `keyword.operator`；匹配须落在原子边界）。
    pub scope: &'static str,
    /// hljs 类名（**不含**前导点；如 `title.function_`）。
    pub hljs: &'static str,
}

/// 映射表主体。行序无关——匹配取**最长**原子前缀。
pub const SCOPE_CLASS_TABLE: [ScopeClassMap; 21] = [
    // 注释族
    ScopeClassMap { scope: "comment", hljs: "comment" },
    // 字符串族（含转义字符）
    ScopeClassMap { scope: "string", hljs: "string" },
    ScopeClassMap { scope: "constant.character.escape", hljs: "string" },
    // 常量族
    ScopeClassMap { scope: "constant.numeric", hljs: "number" },
    ScopeClassMap { scope: "constant.language", hljs: "literal" },
    ScopeClassMap { scope: "constant.character", hljs: "string" },
    ScopeClassMap { scope: "constant", hljs: "number" },
    // 关键字族（operator 归 keyword：vue CSS 未单列 operator 色）
    ScopeClassMap { scope: "keyword.operator", hljs: "keyword" },
    ScopeClassMap { scope: "keyword", hljs: "keyword" },
    ScopeClassMap { scope: "storage.type", hljs: "keyword" },
    ScopeClassMap { scope: "storage.modifier", hljs: "keyword" },
    // 名字族
    ScopeClassMap { scope: "entity.name.function", hljs: "title.function_" },
    ScopeClassMap { scope: "entity.name.type", hljs: "title" },
    ScopeClassMap { scope: "entity.name.tag", hljs: "tag" },
    ScopeClassMap { scope: "entity.name.section", hljs: "section" },
    ScopeClassMap { scope: "entity.other.attribute-name", hljs: "attr" },
    // 变量族
    ScopeClassMap { scope: "variable.language", hljs: "literal" },
    ScopeClassMap { scope: "variable", hljs: "variable" },
    // support 族
    ScopeClassMap { scope: "support.function", hljs: "built_in" },
    ScopeClassMap { scope: "support.type", hljs: "type" },
    ScopeClassMap { scope: "support.class", hljs: "type" },
];

/// scope → hljs 类名（**最长原子前缀**匹配；`keyword.operator.assignment`
/// 命中 `keyword.operator` 而非 `keyword`）。未命中返回 None（基础前景）。
pub fn hljs_class_for_scope(scope: &str) -> Option<&'static str> {
    let mut best: Option<(usize, &'static str)> = None;
    for row in SCOPE_CLASS_TABLE.iter() {
        let prefix_at_atom =
            scope == row.scope || (scope.len() > row.scope.len() && scope.starts_with(row.scope) && scope.as_bytes()[row.scope.len()] == b'.');
        if prefix_at_atom {
            let len = row.scope.len();
            if best.map(|(bl, _)| len > bl).unwrap_or(true) {
                best = Some((len, row.hljs));
            }
        }
    }
    best.map(|(_, hljs)| hljs)
}

/// hljs 调色板分组（与 vue `autodown-editor.css` 的选择器分组一一对应）。
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum HljsGroup {
    /// keyword / selector-tag / doctag / section
    Keyword,
    /// title / title.function_
    Title,
    /// string / regexp / addition
    String,
    /// number / literal / variable / template-variable / attr / attribute
    Constant,
    /// comment / quote / deletion
    Comment,
    /// meta / meta-keyword / meta-string
    Meta,
    /// tag / name / built_in / type
    Tag,
}

/// 类名 → 调色板分组。未入表类名（punctuation 等）返回 None = 基础前景。
pub fn hljs_group_for_class(class: &str) -> Option<HljsGroup> {
    Some(match class {
        "keyword" | "selector-tag" | "doctag" | "section" => HljsGroup::Keyword,
        "title" | "title.function_" | "title.class_" => HljsGroup::Title,
        "string" | "regexp" | "addition" => HljsGroup::String,
        "number" | "literal" | "variable" | "template-variable" | "attr" | "attribute" => {
            HljsGroup::Constant
        }
        "comment" | "quote" | "deletion" => HljsGroup::Comment,
        "meta" | "meta-keyword" | "meta-string" => HljsGroup::Meta,
        "tag" | "name" | "built_in" | "type" => HljsGroup::Tag,
        _ => return None,
    })
}

/// 分组 → RGB。light = vue 编辑器 CSS 实值镜像；dark = 同色相族的暗色
/// 变体（GitHub Dark 系）。None = 基础前景（不染色）。
pub fn hljs_group_rgb(group: HljsGroup, dark: bool) -> (u8, u8, u8) {
    match group {
        HljsGroup::Keyword => {
            if dark {
                (255, 123, 114)
            } else {
                (215, 58, 73)
            }
        }
        HljsGroup::Title => {
            if dark {
                (210, 168, 255)
            } else {
                (111, 66, 193)
            }
        }
        HljsGroup::String => {
            if dark {
                (165, 214, 255)
            } else {
                (3, 47, 98)
            }
        }
        HljsGroup::Constant => {
            if dark {
                (121, 192, 255)
            } else {
                (0, 92, 197)
            }
        }
        HljsGroup::Comment => {
            if dark {
                (139, 148, 158)
            } else {
                (106, 115, 125)
            }
        }
        HljsGroup::Meta => {
            if dark {
                (126, 231, 135)
            } else {
                (23, 111, 44)
            }
        }
        HljsGroup::Tag => {
            if dark {
                (126, 231, 135)
            } else {
                (34, 134, 58)
            }
        }
    }
}

/// 便捷组合：scope → 染色 RGB（None = 基础前景）。
pub fn hljs_rgb_for_scope(scope: &str, dark: bool) -> Option<(u8, u8, u8)> {
    hljs_class_for_scope(scope)
        .and_then(hljs_group_for_class)
        .map(|g| hljs_group_rgb(g, dark))
}

#[cfg(test)]
mod tests {
    use super::*;

    /// T4 验收：scope → 类名全断言（逐行 + 具体 syntect 实域样本）。
    #[test]
    fn scope_to_class_full_assertions() {
        // 逐行：表内前缀自身必命中自身类。
        for row in SCOPE_CLASS_TABLE.iter() {
            assert_eq!(hljs_class_for_scope(row.scope), Some(row.hljs), "row {}", row.scope);
        }
        // 实域样本（two-face 常见 scope 形态）。
        let cases: &[(&str, &str)] = &[
            ("keyword.control.rust", "keyword"),
            ("keyword.operator.assignment", "keyword"),
            ("storage.type.rust", "keyword"),
            ("entity.name.function.rust", "title.function_"),
            ("entity.name.type.rust", "title"),
            ("entity.name.tag.html", "tag"),
            ("entity.other.attribute-name.html", "attr"),
            ("string.quoted.double.rust", "string"),
            ("constant.character.escape.rust", "string"),
            ("constant.numeric.rust", "number"),
            ("constant.language.rust", "literal"),
            ("comment.line.double-slash.rust", "comment"),
            ("variable.language.rust", "literal"),
            ("variable.other.rust", "variable"),
            ("support.function.std.rust", "built_in"),
            ("support.type.rust", "type"),
        ];
        for (scope, class) in cases {
            assert_eq!(hljs_class_for_scope(scope), Some(*class), "scope {scope}");
        }
        // 表内无裸 `meta` 行：meta.* 具体域不映射（染色经 CSS 的 meta 类
        // 由具体 scope 行兜底），保持表的保守性。
        assert_eq!(hljs_class_for_scope("meta.function.rust"), None);
        // 未命中：source/纯文本域 → None（基础前景）。
        assert_eq!(hljs_class_for_scope("source.rust"), None);
        assert_eq!(hljs_class_for_scope(""), None);
        assert_eq!(hljs_class_for_scope("keywordx"), None, "原子边界：keywordx ≠ keyword");
        assert_eq!(hljs_class_for_scope("keywordish.control"), None);
    }

    /// 最长原子前缀优先：keyword.operator.* 归 keyword（经 operator 行），
    /// 不被更短行遮蔽语义。
    #[test]
    fn longest_atom_prefix_wins() {
        // constant.character.escape 须命中三段行（而非 constant.character
        // 两段行或 constant 一段行）——三行都存在，验证取最长。
        assert_eq!(hljs_class_for_scope("constant.character.escape.python"), Some("string"));
        assert_eq!(hljs_class_for_scope("constant.character.invalid"), Some("string"));
        assert_eq!(hljs_class_for_scope("constant.numeric.integer.rust"), Some("number"));
        assert_eq!(hljs_class_for_scope("constant.other.rust"), Some("number"));
    }

    /// 色板分组与 vue CSS 选择器分组一一对应（类名全覆盖）。
    #[test]
    fn palette_groups_mirror_engine_css() {
        for (class, group) in [
            ("keyword", HljsGroup::Keyword),
            ("selector-tag", HljsGroup::Keyword),
            ("doctag", HljsGroup::Keyword),
            ("section", HljsGroup::Keyword),
            ("title", HljsGroup::Title),
            ("title.function_", HljsGroup::Title),
            ("string", HljsGroup::String),
            ("regexp", HljsGroup::String),
            ("addition", HljsGroup::String),
            ("number", HljsGroup::Constant),
            ("literal", HljsGroup::Constant),
            ("variable", HljsGroup::Constant),
            ("template-variable", HljsGroup::Constant),
            ("attr", HljsGroup::Constant),
            ("attribute", HljsGroup::Constant),
            ("comment", HljsGroup::Comment),
            ("quote", HljsGroup::Comment),
            ("deletion", HljsGroup::Comment),
            ("meta", HljsGroup::Meta),
            ("meta-keyword", HljsGroup::Meta),
            ("meta-string", HljsGroup::Meta),
            ("tag", HljsGroup::Tag),
            ("name", HljsGroup::Tag),
            ("built_in", HljsGroup::Tag),
            ("type", HljsGroup::Tag),
        ] {
            assert_eq!(hljs_group_for_class(class), Some(group), "class {class}");
        }
        // 未入 CSS 的类 → None（基础前景）。
        assert_eq!(hljs_group_for_class("punctuation"), None);
        assert_eq!(hljs_group_for_class("operator"), None);
        assert_eq!(hljs_group_for_class("no-such-class"), None);
    }

    /// light 色板 = engine CSS 实值（#hex 逐项钉死，防漂移）。
    #[test]
    fn light_palette_matches_engine_css_values() {
        let hex = |c: (u8, u8, u8)| format!("#{:02x}{:02x}{:02x}", c.0, c.1, c.2);
        assert_eq!(hex(hljs_group_rgb(HljsGroup::Keyword, false)), "#d73a49");
        assert_eq!(hex(hljs_group_rgb(HljsGroup::Title, false)), "#6f42c1");
        assert_eq!(hex(hljs_group_rgb(HljsGroup::String, false)), "#032f62");
        assert_eq!(hex(hljs_group_rgb(HljsGroup::Constant, false)), "#005cc5");
        assert_eq!(hex(hljs_group_rgb(HljsGroup::Comment, false)), "#6a737d");
        assert_eq!(hex(hljs_group_rgb(HljsGroup::Meta, false)), "#176f2c");
        assert_eq!(hex(hljs_group_rgb(HljsGroup::Tag, false)), "#22863a");
    }

    /// 组合口：scope → RGB；dark/light 两态都有着色。
    #[test]
    fn combined_scope_to_rgb() {
        assert_eq!(hljs_rgb_for_scope("keyword.control.rust", true), Some((255, 123, 114)));
        assert_eq!(hljs_rgb_for_scope("comment.line.rust", false), Some((106, 115, 125)));
        assert_eq!(hljs_rgb_for_scope("source.rust", true), None);
        for dark in [true, false] {
            assert!(hljs_rgb_for_scope("string.quoted.double.js", dark).is_some());
        }
    }
}
