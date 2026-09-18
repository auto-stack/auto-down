// bootstrap.ts — gallery fixture API shim（PLAN-072 T-01）。
//
// 必须先于任何 store/api 模块导入（main.ts 首行）：隔离面无后端，单元页
// 挂载真件时的 api 调用（read_wiki/backlinks/…）由本 shim 以 fixture 应答。
// 路由表随单元增量扩充；未命中路由 404（缺件即红的 vue 侧对照物）。
// 真实路由面 = back/auto/api.at 的 ROUTE: 注记。

const FIXTURE_WORKSPACE = { root: 'D:/tmp/wiki-demo', wiki_dir: 'wiki' }

const FIXTURE_MD = [
  '# 引言',
  '',
  '正文一段（fixture）。',
  '',
  '## 方法',
  '',
  '方法段落。',
  '',
  '### 方法 > 探针',
  '',
  '探针段落。',
].join('\n')

const stemOf = (p: string) => p.split('/').pop()!.replace(/\.ad$/, '')

type Route = { re: RegExp; reply: (m: RegExpMatchArray, url: URL) => unknown }

const routes: Route[] = [
  { re: /^\/api\/workspace$/, reply: () => FIXTURE_WORKSPACE },
  {
    re: /^\/api\/workspace\/open$/,
    reply: () => FIXTURE_WORKSPACE,
  },
  {
    re: /^\/api\/wiki\/(.+)$/,
    reply: (m) => {
      const p = decodeURIComponent(m[1])
      return { path: p, title: stemOf(p), body: FIXTURE_MD }
    },
  },
  {
    re: /^\/api\/backlinks\/(.+)$/,
    reply: (m) => ({
      title: decodeURIComponent(m[1]),
      links: [
        { source_title: '另页', source_path: 'wiki/另页.ad', context: '链接到 fixture 页' },
      ],
    }),
  },
  {
    re: /^\/api\/outlinks\/(.+)$/,
    reply: (m) => ({ title: decodeURIComponent(m[1]), links: [] }),
  },
]

const origFetch = globalThis.fetch.bind(globalThis)

globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const href =
    typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.href
        : input.url
  const url = new URL(href, 'http://gallery.fixture')
  for (const { re, reply } of routes) {
    const m = url.pathname.match(re)
    if (m) {
      return new Response(JSON.stringify(reply(m, url)), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  }
  return new Response(
    JSON.stringify({ error: `gallery-fixture: no route for ${url.pathname}` }),
    { status: 404, headers: { 'Content-Type': 'application/json' } },
  )
}) as typeof fetch

export {}
