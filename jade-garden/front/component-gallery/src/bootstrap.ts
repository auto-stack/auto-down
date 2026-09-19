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
    // PLAN-074 T-03：两行覆盖 exists 双态（+block_id 后缀）。
    re: /^\/api\/outlinks\/(.+)$/,
    reply: (m) => ({
      title: decodeURIComponent(m[1]),
      links: [
        { target_title: '方法', target_path: 'wiki/方法.ad', exists: true, block_id: 'abc1234' },
        { target_title: '缺失页', target_path: null, exists: false, block_id: null },
      ],
    }),
  },
  {
    // PLAN-074 T-03：未链引用一行（html 由下沉 watch 经 ext
    // highlight_context 预计算）。
    re: /^\/api\/unlinked\/(.+)$/,
    reply: (m) => ({
      title: decodeURIComponent(m[1]),
      refs: [
        {
          page_path: 'wiki/另页.ad',
          block_uuid: null,
          context: '这一段提到 引言 的概念但从未写成链接',
          matched_text: '引言',
        },
      ],
    }),
  },
  {
    // PLAN-076 T-02：检索面板两行——Page 行带 \u0001/\u0002 snippet 标记
    // （snippet_html 经 ext regex 桥逐行预计算），Block 行无 snippet
    // （is_block/title_text=page_path + has_snippet=false 分支面）。
    re: /^\/api\/search$/,
    reply: (m, url) => ({
      q: url.searchParams.get('q') ?? '',
      results: [
        {
          type: 'Page',
          path: 'wiki/引言.ad',
          title: '引言',
          uuid: null,
          page_path: null,
          block_id: null,
          content: null,
          snippet: '正文提到 \u0001引言\u0002 的概念，见首章',
        },
        {
          type: 'Block',
          path: null,
          title: null,
          uuid: 'blk-42',
          page_path: 'wiki/方法.ad',
          block_id: 'abc1234',
          content: '方法段落正文',
          snippet: null,
        },
      ],
    }),
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
