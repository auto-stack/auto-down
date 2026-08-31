// host-face tests (plan 029): the focused edit host's semantic face —
// tag + view-side class, mirroring builtin-panels so the editor CSS hits
// the host exactly like the preview (WYSIWYG parity, pinned by e2e).

import { describe, expect, it } from 'vitest'
import { hostFaceFor } from '../engine/host-face'

describe('hostFaceFor', () => {
  it('maps Heading levels 1/3/6 to h1/h3/h6 with the view-side classes', () => {
    expect(hostFaceFor('Heading', 1)).toEqual({ tag: 'h1', cls: 'heading-node heading-1' })
    expect(hostFaceFor('Heading', 3)).toEqual({ tag: 'h3', cls: 'heading-node heading-3' })
    expect(hostFaceFor('Heading', 6)).toEqual({ tag: 'h6', cls: 'heading-node heading-6' })
  })

  it('clamps out-of-range and missing levels into 1..6', () => {
    expect(hostFaceFor('Heading', 0).tag).toBe('h1')
    expect(hostFaceFor('Heading', -3).tag).toBe('h1')
    expect(hostFaceFor('Heading', 9).tag).toBe('h6')
    expect(hostFaceFor('Heading').tag).toBe('h1')
  })

  it('maps Paragraph to p.paragraph-node', () => {
    expect(hostFaceFor('Paragraph')).toEqual({ tag: 'p', cls: 'paragraph-node' })
    expect(hostFaceFor('Paragraph', 3)).toEqual({ tag: 'p', cls: 'paragraph-node' })
  })

  it('falls back to a bare div for every other editable kind', () => {
    expect(hostFaceFor('CodeBlock')).toEqual({ tag: 'div', cls: '' })
    expect(hostFaceFor('MathBlock')).toEqual({ tag: 'div', cls: '' })
    expect(hostFaceFor('WikilinkBlock')).toEqual({ tag: 'div', cls: '' })
  })
})
