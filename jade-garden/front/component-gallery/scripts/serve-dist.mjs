// serve-dist.mjs — dist 静态服（vue probe 与 e2e spec 共用；内建 http
// 零外部进程）。startDistServer(galleryDir, port) → Promise<server>。
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
}

export function startDistServer(galleryDir, port) {
  const dist = path.join(galleryDir, 'dist')
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost')
    const rel = url.pathname === '/' ? '/index.html' : url.pathname
    const file = path.join(dist, rel)
    if (!file.startsWith(dist) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      res.writeHead(404).end('not found')
      return
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] ?? 'application/octet-stream' })
    fs.createReadStream(file).pipe(res)
  })
  return new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(port, '127.0.0.1', () => resolve(server))
  })
}
