import { describe, it, expect } from 'vitest'
import { isDark, detectBox, detectUnderline, detectWhitespace } from '../boundary-detect.js'

function makePixels(w, h) {
  return new Uint8ClampedArray(w * h * 4).fill(255)
}

function setDark(data, w, x, y) {
  const i = (y * w + x) * 4
  data[i] = data[i + 1] = data[i + 2] = 0
  data[i + 3] = 255
}

function hLine(data, w, row, x1, x2) {
  for (let x = x1; x <= x2; x++) setDark(data, w, x, row)
}

function vLine(data, w, col, y1, y2) {
  for (let y = y1; y <= y2; y++) setDark(data, w, col, y)
}

describe('isDark', () => {
  it('returns true for a black opaque pixel', () => {
    const data = makePixels(1, 1)
    setDark(data, 1, 0, 0)
    expect(isDark(data, 0, 0, 1)).toBe(true)
  })

  it('returns false for a white pixel', () => {
    const data = makePixels(1, 1)
    expect(isDark(data, 0, 0, 1)).toBe(false)
  })

  it('returns false for a transparent pixel', () => {
    const data = makePixels(1, 1)
    data[3] = 0
    expect(isDark(data, 0, 0, 1)).toBe(false)
  })
})

describe('detectBox', () => {
  it('detects an enclosing rectangle around the tap point', () => {
    const W = 400, H = 200
    const data = makePixels(W, H)
    hLine(data, W, 80, 50, 300)
    hLine(data, W, 120, 50, 300)
    vLine(data, W, 50, 80, 120)
    vLine(data, W, 300, 80, 120)

    const result = detectBox(data, 175, 100, W, H)
    expect(result).not.toBeNull()
    expect(result.w).toBeGreaterThanOrEqual(80)
    expect(result.h).toBeGreaterThanOrEqual(20)
  })

  it('returns null when no enclosing boundary wide enough', () => {
    const W = 400, H = 200
    const data = makePixels(W, H)
    hLine(data, W, 100, 100, 130) // only 30px wide

    const result = detectBox(data, 115, 100, W, H)
    expect(result).toBeNull()
  })
})

describe('detectUnderline', () => {
  it('detects a horizontal line below the tap and sizes the sticker', () => {
    const W = 500, H = 300
    const data = makePixels(W, H)
    hLine(data, W, 155, 50, 350)

    const result = detectUnderline(data, 200, 150, W, H)
    expect(result).not.toBeNull()
    expect(result.w).toBeGreaterThanOrEqual(80)
    expect(result.y).toBeLessThan(155) // sticker sits above the line
  })

  it('returns null when tap does not fall within the line run', () => {
    const W = 500, H = 300
    const data = makePixels(W, H)
    hLine(data, W, 155, 400, 490) // far from tapX=200

    const result = detectUnderline(data, 200, 150, W, H)
    expect(result).toBeNull()
  })
})

describe('detectWhitespace', () => {
  it('returns bounds spanning the open area between content rows', () => {
    const W = 500, H = 400
    const data = makePixels(W, H)
    hLine(data, W, 50, 0, 499)
    hLine(data, W, 200, 0, 499)

    const result = detectWhitespace(data, 250, 125, W, H)
    expect(result).not.toBeNull()
    expect(result.w).toBeGreaterThanOrEqual(80)
    expect(result.h).toBeGreaterThanOrEqual(20)
  })
})
