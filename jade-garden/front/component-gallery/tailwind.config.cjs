// tailwind.config.cjs — harness 主题单源复用 front 配置（shadcn hsl vars），
// content 改指 harness 页面 + front 真件 SFC + ext 内嵌类串
// （gap 26 惯例：ext .ts 内的类串无 .vue 扫描命中）。
const path = require('node:path')

const front = require(path.resolve(__dirname, '../tailwind.config.cjs'))

module.exports = {
  ...front,
  content: [
    './index.html',
    './src/**/*.{ts,vue}',
    '../src/components/*.vue',
    '../auto/src/front/utils/*.ts',
  ],
}
