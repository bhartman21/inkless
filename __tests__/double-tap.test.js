import { describe, it, expect } from 'vitest'
import { isDoubleTap } from '../double-tap.js'

describe('isDoubleTap', () => {
  it('returns true when two taps are within 300ms and 20px', () => {
    const a = { time: 1000, x: 100, y: 100 }
    const b = { time: 1250, x: 110, y: 108 }
    expect(isDoubleTap(a, b)).toBe(true)
  })

  it('returns false when gap exceeds 300ms', () => {
    const a = { time: 1000, x: 100, y: 100 }
    const b = { time: 1400, x: 102, y: 102 }
    expect(isDoubleTap(a, b)).toBe(false)
  })

  it('returns false when x distance exceeds 20px', () => {
    const a = { time: 1000, x: 100, y: 100 }
    const b = { time: 1100, x: 125, y: 100 }
    expect(isDoubleTap(a, b)).toBe(false)
  })

  it('returns false when y distance exceeds 20px', () => {
    const a = { time: 1000, x: 100, y: 100 }
    const b = { time: 1100, x: 100, y: 125 }
    expect(isDoubleTap(a, b)).toBe(false)
  })

  it('returns false when first tap is null', () => {
    expect(isDoubleTap(null, { time: 1000, x: 0, y: 0 })).toBe(false)
  })

  it('returns true when time gap is exactly 299ms', () => {
    const a = { time: 1000, x: 100, y: 100 }
    const b = { time: 1299, x: 100, y: 100 }
    expect(isDoubleTap(a, b)).toBe(true)
  })

  it('returns false when time gap is exactly 300ms', () => {
    const a = { time: 1000, x: 100, y: 100 }
    const b = { time: 1300, x: 100, y: 100 }
    expect(isDoubleTap(a, b)).toBe(false)
  })

  it('returns true when x distance is exactly 19px', () => {
    const a = { time: 1000, x: 100, y: 100 }
    const b = { time: 1100, x: 119, y: 100 }
    expect(isDoubleTap(a, b)).toBe(true)
  })

  it('returns false when x distance is exactly 20px', () => {
    const a = { time: 1000, x: 100, y: 100 }
    const b = { time: 1100, x: 120, y: 100 }
    expect(isDoubleTap(a, b)).toBe(false)
  })
})
