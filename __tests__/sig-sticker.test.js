import { describe, it, expect } from 'vitest'
import { computeCanvasBounds } from '../sig-sticker.js'

describe('computeCanvasBounds', () => {
  it('scales CSS sticker bounds to canvas pixel bounds', () => {
    const stickerRect  = { left: 50,  top: 25, width: 200, height: 70 }
    const wrapperRect  = { left: 0,   top: 0,  width: 400, height: 500 }
    const canvas       = { width: 1200, height: 1500 }

    expect(computeCanvasBounds(stickerRect, wrapperRect, canvas))
      .toEqual({ x: 150, y: 75, w: 600, h: 210 })
  })

  it('accounts for wrapper offset from the viewport origin', () => {
    const stickerRect  = { left: 110, top: 60, width: 100, height: 40 }
    const wrapperRect  = { left: 10,  top: 10, width: 400, height: 500 }
    const canvas       = { width: 800, height: 1000 }

    const r = computeCanvasBounds(stickerRect, wrapperRect, canvas)
    expect(r.x).toBeCloseTo(200)
    expect(r.y).toBeCloseTo(100)
    expect(r.w).toBeCloseTo(200)
    expect(r.h).toBeCloseTo(80)
  })
})
