// review-time: final evidence shots on the fixed build (light full / stream step / dark)
import { copyFileSync } from 'node:fs'

const base = `http://127.0.0.1:9359/mcp`
let nextId = 1

async function rpc(method, params) {
  const res = await fetch(base, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: nextId++, method, params }),
  })
  const body = await res.json()
  if (body.error) throw new Error(JSON.stringify(body.error))
  return body.result
}

await rpc('initialize', {
  protocolVersion: '2024-11-05',
  capabilities: {},
  clientInfo: { name: 'final-shot', version: '1.0' },
})
await rpc('notifications/initialized', {})
const call = async (name, args) =>
  (await rpc('tools/call', { name, arguments: args })).content.map((c) => c.text ?? '').join('\n')
const press = async (label) => {
  const found = await call('autoui_find', { label, limit: 5 })
  const btns = [...found.matchAll(/button (vnode_\d+)/g)]
  if (!btns.length) return false
  await call('autoui_action', { element_id: btns[btns.length - 1][1], action: 'press' })
  return true
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const shot = async (file) => {
  for (let i = 0; i < 6; i++) {
    try {
      const text = await call('autoui_screenshot', {})
      const m = text.match(/[A-Za-z]:[^\s"']+\.png/)
      if (!m) throw new Error(text.slice(0, 100))
      copyFileSync(m[0].replace(/\//g, '\\'), file)
      console.log('saved', file)
      return true
    } catch (e) {
      console.log(`  .. retry ${i + 1}: ${String(e).slice(40, 120)}`)
      await sleep(3000)
    }
  }
  return false
}

const ok1 = await shot('vm-059-light.png')
await press('↻'); await sleep(300)
await press('⏭'); await sleep(300)
await press('⏭'); await sleep(300)
const ok2 = await shot('vm-059-stream-step.png')
await press('⚙'); await sleep(400)
await press('🌙 Dark'); await sleep(800)
await press('✕'); await sleep(400)
const ok3 = await shot('vm-059-dark.png')
console.log(`FINAL SHOTS: light=${ok1} step=${ok2} dark=${ok3}`)
