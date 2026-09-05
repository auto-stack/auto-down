// theme-spec-values.mjs — PLAN-053 T1：Design 22 §7 双档特征色投影（单源）。
// 真值源：auto-lang docs/design/autoui/base-styles-and-visual-parity.md
// §7.1/§7.4/§7.5；本模块只做投影，分叉时先对表再改锚点实现。
// 消费方：probe-051-view-theme.mjs / vm-smoke.mjs / e2e/*.spec.ts（三方）。
export const THEME_SPEC = {
  light: {
    // §7.4 fence 深浅双档：bg gray-50 / border gray-200
    fenceBg: '#f9fafb', fenceBorder: '#e5e7eb',
    // §7.4 fence header（浅档）：bg gray-200 / fg gray-600
    fenceHeaderBg: '#e5e7eb', fenceHeaderFg: '#374151',
    // §7.1 中性色板浅档：fg gray-900 / muted gray-500 / border gray-200 / surface 白
    bodyFg: '#111827', mutedFg: '#6b7280',
    border: '#e5e7eb', surface: '#ffffff',
    // §7.1 heading strong 浅档 indigo-700（--ad-heading-strong）
    headingStrong: '#4338ca',
    // §7.5 hljs 基础 fg 浅档 #09090b（:264 基础 fg 行）
    hljsBaseFg: '#09090b',
    // §7.5:257 Keyword 组：浅 #d73a49 (github-light) / 深 #ff7b72 (github-dark)
    hljsKeyword: '#d73a49',
  },
  dark: {
    // §7.4 fence 深档：bg zinc-950
    fenceBg: '#09090b',
    // §7.4 fence 深档 border zinc-700
    fenceBorder: '#3f3f46',
    // §7.4 fence header 深档 bg zinc-800（hex 按 §7.1 zinc 系列表值补注）
    fenceHeaderBg: '#27272a',
    // §7.4 fence header 深档 fg zinc-400
    fenceHeaderFg: '#a1a1aa',
    // §7.1 中性色板深档：fg zinc-50 / muted zinc-400 / border zinc-700 / surface zinc-950
    bodyFg: '#fafafa', mutedFg: '#a1a1aa',
    border: '#3f3f46', surface: '#09090b',
    // §7.1 heading strong 深档 indigo-400
    headingStrong: '#818cf8',
    // §7.5 hljs 基础 fg 深档 #fafafa（:264 基础 fg 行）
    hljsBaseFg: '#fafafa',
    // §7.5:257 Keyword 组深档
    hljsKeyword: '#ff7b72',
  },
};

// VM 探针特征色（RGB 三元组，probe 现行口径）：
export const VM_FEATURE_RGB = {
  zinc950: [9, 9, 11],        // dark fence/底色 §7.4:232
  fenceLight: [249, 250, 251], // light fence bg gray-50 §7.4:232
  zinc700: [63, 63, 70],      // dark border 族 §7.4:232
  zinc400: [161, 161, 166],   // dark header fg / muted §7.4:233（VM 锚点表值）
  fgLight: [17, 24, 39],      // light 正文 fg gray-900 §7.1:193
  fgDark: [250, 250, 251],    // dark 正文 fg zinc-50 §7.1:193
  borderLight: [229, 231, 235], // light 边框 gray-200 §7.1:195
  // heading accent-strong 双档采样 §7.2:208（indigo strong 浅 600 系/深 400 系）
  indigoStrongLight: [67, 56, 202],  // #4338ca indigo-700
  indigoStrongDark: [129, 140, 248], // #818cf8 indigo-400
};
