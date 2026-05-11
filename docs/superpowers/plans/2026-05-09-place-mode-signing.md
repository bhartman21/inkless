# Place Mode Signing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Place" mode to Inkless where users double-tap a document location, sign in a full-screen landscape canvas, and drag/resize the resulting sticker before committing it to the page.

**Architecture:** Four new ES modules (`double-tap.js`, `boundary-detect.js`, `place-modal.js`, `sig-sticker.js`) handle distinct responsibilities; `main.js` is extended to wire them together. HTML gets a toolbar button and modal markup; CSS gets modal and sticker styles. Vitest is added for the pure-logic modules.

**Tech Stack:** Vanilla JS ES modules, Vite 8, Vitest (new), HTML Canvas API, Pointer Events API, pdf-lib, pdfjs-dist

---

## File Map

| File | Status | Responsibility |
|---|---|---|
| `double-tap.js` | Create | Pure tap-detection predicate |
| `boundary-detect.js` | Create | Three-tier pixel analysis |
| `place-modal.js` | Create | Full-screen signing canvas modal |
| `sig-sticker.js` | Create | Draggable/resizable sticker + commit math |
| `__tests__/double-tap.test.js` | Create | Tests for double-tap logic |
| `__tests__/boundary-detect.test.js` | Create | Tests for all three detection tiers |
| `__tests__/sig-sticker.test.js` | Create | Tests for commit coordinate math |
| `index.html` | Modify | Add Place button + modal markup |
| `style.css` | Modify | Add modal + sticker styles |
| `main.js` | Modify | Wire mode, double-tap, guards |
| `package.json` | Modify | Add Vitest dev dependency + test script |
| `vite.config.js` | Modify | Add Vitest config block |

---

## Task 1: Test Infrastructure

**Files:**
- Modify: `package.json`
- Modify: `vite.config.js`
- Create: `__tests__/smoke.test.js`

- [ ] **Step 1.1: Install Vitest**

```bash
npm install --save-dev vitest
```

Expected: `vitest` appears in `node_modules` and `package-lock.json` is updated.

- [ ] **Step 1.2: Add test script to `package.json`**

Replace the `"scripts"` block and add `"vitest"` to `"devDependencies"`:

```json
{
  "name": "inkless",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "vite": "^8.0.10",
    "vitest": "^2.0.0"
  },
  "dependencies": {
    "pdf-lib": "^1.17.1",
    "pdfjs-dist": "^5.7.284"
  }
}
```

- [ ] **Step 1.3: Add Vitest config block to `vite.config.js`**

Replace the entire file:

```javascript
import { defineConfig } from 'vite'

export default defineConfig({
  base: '/inkless/',
  test: {
    environment: 'node',
    include: ['__tests__/**/*.test.js'],
  },
})
```

- [ ] **Step 1.4: Write smoke test**

Create `__tests__/smoke.test.js`:

```javascript
import { describe, it, expect } from 'vitest'

describe('test infrastructure', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2)
  })
})
```

- [ ] **Step 1.5: Run tests**

```bash
npm test
```

Expected output: `1 passed` with no failures.

- [ ] **Step 1.6: Commit**

```bash
git add package.json vite.config.js package-lock.json __tests__/smoke.test.js
git commit -m "chore: add Vitest test infrastructure"
```

---

## Task 2: `double-tap.js` — Pure Detection Logic

**Files:**
- Create: `double-tap.js`
- Create: `__tests__/double-tap.test.js`

- [ ] **Step 2.1: Write failing tests**

Create `__tests__/double-tap.test.js`:

```javascript
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
})
```

- [ ] **Step 2.2: Run to confirm failure**

```bash
npm test
```

Expected: FAIL — `Cannot find module '../double-tap.js'`.

- [ ] **Step 2.3: Implement `double-tap.js`**

Create `double-tap.js`:

```javascript
export function isDoubleTap(first, second) {
  if (!first) return false
  return (
    second.time - first.time < 300 &&
    Math.abs(second.x - first.x) < 20 &&
    Math.abs(second.y - first.y) < 20
  )
}
```

- [ ] **Step 2.4: Run tests to confirm pass**

```bash
npm test
```

Expected: `5 passed`.

- [ ] **Step 2.5: Commit**

```bash
git add double-tap.js __tests__/double-tap.test.js
git commit -m "feat: add double-tap detection with tests"
```

---

## Task 3: `boundary-detect.js` — Three-Tier Pixel Analysis

**Files:**
- Create: `boundary-detect.js`
- Create: `__tests__/boundary-detect.test.js`

- [ ] **Step 3.1: Write failing tests**

Create `__tests__/boundary-detect.test.js`:

```javascript
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
```

- [ ] **Step 3.2: Run to confirm failure**

```bash
npm test
```

Expected: FAIL — `Cannot find module '../boundary-detect.js'`.

- [ ] **Step 3.3: Implement `boundary-detect.js`**

Create `boundary-detect.js`:

```javascript
export function isDark(data, x, y, canvasWidth) {
  const i = (y * canvasWidth + x) * 4
  return data[i] < 80 && data[i + 1] < 80 && data[i + 2] < 80 && data[i + 3] > 20
}

export function detectBox(data, tapX, tapY, canvasWidth, canvasHeight) {
  const BAND = 4, MAX_H = 600, MAX_V = 120, GAP = 10

  function walkH(startX, dx) {
    let gap = 0, x = startX
    while (x >= 0 && x < canvasWidth && Math.abs(x - startX) < MAX_H) {
      let hasDark = false
      for (let dy = -BAND; dy <= BAND; dy++) {
        const y = tapY + dy
        if (y >= 0 && y < canvasHeight && isDark(data, x, y, canvasWidth)) {
          hasDark = true; break
        }
      }
      if (hasDark) { gap = 0 } else { gap++; if (gap >= GAP) return x - dx * GAP }
      x += dx
    }
    return x
  }

  const left = walkH(tapX, -1)
  const right = walkH(tapX, 1)
  const w = right - left
  if (w < 80) return null

  function walkV(startY, dy) {
    let y = startY
    while (y >= 0 && y < canvasHeight && Math.abs(y - startY) < MAX_V) {
      let darkCount = 0
      for (let x = left; x <= right; x++) {
        if (isDark(data, x, y, canvasWidth)) darkCount++
      }
      if (darkCount / w > 0.5) return y
      y += dy
    }
    return startY + dy * MAX_V
  }

  const top = walkV(tapY, -1)
  const bottom = walkV(tapY, 1)
  const h = bottom - top
  if (h < 20) return null
  return { x: left, y: top, w, h }
}

export function detectUnderline(data, tapX, tapY, canvasWidth, canvasHeight) {
  let best = null
  for (const row of [tapY, tapY + 5, tapY + 10]) {
    if (row >= canvasHeight) continue
    let runStart = null
    for (let x = 0; x <= canvasWidth; x++) {
      const dark = x < canvasWidth && isDark(data, x, row, canvasWidth)
      if (dark) {
        if (runStart === null) runStart = x
      } else {
        if (runStart !== null) {
          const runLen = x - runStart
          if (runLen >= 80 && tapX >= runStart && tapX <= x) {
            if (!best || runLen > best.w) best = { x: runStart, y: row, w: runLen }
          }
          runStart = null
        }
      }
    }
  }
  if (!best) return null
  const h = Math.min(Math.round(best.w * 0.5), 80)
  return { x: best.x, y: best.y - h - 4, w: best.w, h }
}

export function detectWhitespace(data, tapX, tapY, canvasWidth, canvasHeight) {
  const THRESHOLD = 0.1, MAX_SCAN = 400

  function scanDir(x0, y0, dx, dy) {
    for (let d = 0; d < MAX_SCAN; d++) {
      const x = x0 + dx * d, y = y0 + dy * d
      if (x < 0 || x >= canvasWidth || y < 0 || y >= canvasHeight) return d
      let dark = 0, total = 0
      if (dx !== 0) {
        for (let sy = Math.max(0, y - 20); sy < Math.min(canvasHeight, y + 20); sy++) {
          if (isDark(data, x, sy, canvasWidth)) dark++; total++
        }
      } else {
        for (let sx = Math.max(0, x - 20); sx < Math.min(canvasWidth, x + 20); sx++) {
          if (isDark(data, sx, y, canvasWidth)) dark++; total++
        }
      }
      if (total > 0 && dark / total >= THRESHOLD) return d
    }
    return MAX_SCAN
  }

  const gL = scanDir(tapX, tapY, -1, 0)
  const gR = scanDir(tapX, tapY, 1, 0)
  const gU = scanDir(tapX, tapY, 0, -1)
  const gD = scanDir(tapX, tapY, 0, 1)

  return {
    x: Math.max(0, tapX - gL),
    y: Math.max(0, tapY - gU),
    w: Math.min(Math.max(80, gL + gR), 500),
    h: Math.min(Math.max(20, gU + gD), 150),
  }
}

export function detectBounds(docCanvas, tapCSSX, tapCSSY, wrapperRect) {
  const scaleX = docCanvas.width / wrapperRect.width
  const scaleY = docCanvas.height / wrapperRect.height
  const tapX = Math.round(tapCSSX * scaleX)
  const tapY = Math.round(tapCSSY * scaleY)

  const { data, width, height } = docCanvas.getContext('2d')
    .getImageData(0, 0, docCanvas.width, docCanvas.height)

  const r =
    detectBox(data, tapX, tapY, width, height) ||
    detectUnderline(data, tapX, tapY, width, height) ||
    detectWhitespace(data, tapX, tapY, width, height)

  return { x: r.x / scaleX, y: r.y / scaleY, w: r.w / scaleX, h: r.h / scaleY }
}
```

- [ ] **Step 3.4: Run tests to confirm pass**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 3.5: Commit**

```bash
git add boundary-detect.js __tests__/boundary-detect.test.js
git commit -m "feat: add three-tier boundary detection with tests"
```

---

## Task 4: HTML Markup and CSS Styles

**Files:**
- Modify: `index.html`
- Modify: `style.css`

- [ ] **Step 4.1: Add Place toolbar button to `index.html`**

In `index.html`, inside the `<div class="mode-toggle">`, add this button immediately after the closing `</button>` of `btn-mode-sign`:

```html
<button id="btn-mode-place" class="btn-mode">
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="15" x2="15" y2="15"></line></svg>
  Place
</button>
```

- [ ] **Step 4.2: Add Place modal markup to `index.html`**

Add this immediately before the closing `</body>` tag (after the BuyMeACoffee `<a>` tag):

```html
<div id="place-modal">
  <div class="place-modal-inner">
    <div class="place-modal-toolbar">
      <button id="place-btn-clear" class="btn btn-outline">Clear</button>
      <span class="place-modal-hint">Draw your signature</span>
      <div class="place-modal-actions">
        <button id="place-btn-cancel" class="btn btn-secondary">Cancel</button>
        <button id="place-btn-apply" class="btn btn-primary">Apply</button>
      </div>
    </div>
    <canvas id="place-canvas"></canvas>
  </div>
</div>
```

- [ ] **Step 4.3: Append Place modal and sticker styles to `style.css`**

Append to the end of `style.css`:

```css
/* ===== Place Modal ===== */
#place-modal {
  display: none;
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.92);
  align-items: center;
  justify-content: center;
}

#place-modal.active {
  display: flex;
}

.place-modal-inner {
  width: 100vw;
  height: 100vh;
  transform: rotate(-90deg);
  display: flex;
  flex-direction: column;
  background: #1a1a2e;
  overflow: hidden;
}

.place-modal-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: #0d0d1a;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
  gap: 12px;
}

.place-modal-hint {
  color: rgba(255, 255, 255, 0.5);
  font-size: 13px;
  flex: 1;
  text-align: center;
}

.place-modal-actions {
  display: flex;
  gap: 8px;
}

#place-canvas {
  flex: 1;
  width: 100%;
  touch-action: none;
  cursor: crosshair;
  background: #0d0d1a;
  display: block;
}

/* ===== Signature Sticker ===== */
.sig-sticker {
  position: absolute;
  cursor: move;
  user-select: none;
  touch-action: none;
  border: 2px dashed rgba(108, 99, 255, 0.8);
  border-radius: 3px;
  background: rgba(108, 99, 255, 0.04);
  box-sizing: border-box;
  z-index: 10;
}

.sig-sticker img {
  width: 100%;
  height: 100%;
  object-fit: fill;
  display: block;
  pointer-events: none;
  user-select: none;
}

.sticker-handle {
  position: absolute;
  width: 14px;
  height: 14px;
  background: #6c63ff;
  border-radius: 50%;
  border: 2px solid #fff;
  z-index: 2;
  touch-action: none;
}

.sticker-handle.top-left     { top: -7px;    left: -7px;    cursor: nw-resize; }
.sticker-handle.top-right    { top: -7px;    right: -7px;   cursor: ne-resize; }
.sticker-handle.bottom-left  { bottom: -7px; left: -7px;    cursor: sw-resize; }
.sticker-handle.bottom-right { bottom: -7px; right: -7px;   cursor: se-resize; }

.sticker-commit {
  position: absolute;
  top: -30px;
  right: 0;
  background: #4ecdc4;
  color: #000;
  border: none;
  border-radius: 4px;
  padding: 3px 10px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  z-index: 3;
}

.sticker-commit:hover {
  background: #3dbdb5;
}
```

- [ ] **Step 4.4: Start dev server and visually verify**

```bash
npm run dev
```

Open the URL shown, load a PDF. Confirm:
- Three buttons visible in the toolbar: `View | Sign | Place`
- Place button does nothing yet (no JS wired) — that's expected

- [ ] **Step 4.5: Commit**

```bash
git add index.html style.css
git commit -m "feat: add Place button, signing modal markup, and sticker CSS"
```

---

## Task 5: `sig-sticker.js` — Sticker Component

**Files:**
- Create: `sig-sticker.js`
- Create: `__tests__/sig-sticker.test.js`

- [ ] **Step 5.1: Write failing tests for commit coordinate math**

Create `__tests__/sig-sticker.test.js`:

```javascript
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
```

- [ ] **Step 5.2: Run to confirm failure**

```bash
npm test
```

Expected: FAIL — `Cannot find module '../sig-sticker.js'`.

- [ ] **Step 5.3: Implement `sig-sticker.js`**

Create `sig-sticker.js`:

```javascript
export function computeCanvasBounds(stickerRect, wrapperRect, canvas) {
  const scaleX = canvas.width / wrapperRect.width
  const scaleY = canvas.height / wrapperRect.height
  return {
    x: (stickerRect.left - wrapperRect.left) * scaleX,
    y: (stickerRect.top  - wrapperRect.top)  * scaleY,
    w: stickerRect.width  * scaleX,
    h: stickerRect.height * scaleY,
  }
}

export class SignatureSticker {
  constructor(wrapper, sigCanvas, dataURL, bounds) {
    this.wrapper   = wrapper
    this.sigCanvas = sigCanvas
    this.el        = this._build(dataURL, bounds)
    wrapper.appendChild(this.el)
    this._setupDrag()
    this._setupResize()
  }

  _build(dataURL, bounds) {
    const el = document.createElement('div')
    el.className      = 'sig-sticker'
    el.style.left     = `${bounds.x}px`
    el.style.top      = `${bounds.y}px`
    el.style.width    = `${bounds.w}px`
    el.style.height   = `${bounds.h}px`

    const img = document.createElement('img')
    img.src       = dataURL
    img.draggable = false
    el.appendChild(img)

    for (const pos of ['top-left', 'top-right', 'bottom-left', 'bottom-right']) {
      const h = document.createElement('div')
      h.className    = `sticker-handle ${pos}`
      h.dataset.handle = pos
      el.appendChild(h)
    }

    const btn = document.createElement('button')
    btn.className   = 'sticker-commit'
    btn.textContent = '✓ Commit'
    btn.addEventListener('click', (e) => { e.stopPropagation(); this.commit() })
    el.appendChild(btn)

    return el
  }

  _setupDrag() {
    this.el.addEventListener('pointerdown', (e) => {
      if (e.target !== this.el && e.target.tagName !== 'IMG') return
      e.stopPropagation()
      const startX    = e.clientX
      const startY    = e.clientY
      const startLeft = parseFloat(this.el.style.left)
      const startTop  = parseFloat(this.el.style.top)
      this.el.setPointerCapture(e.pointerId)

      const onMove = (e) => {
        this.el.style.left = `${startLeft + e.clientX - startX}px`
        this.el.style.top  = `${startTop  + e.clientY - startY}px`
      }
      const onUp = () => {
        this.el.removeEventListener('pointermove', onMove)
        this.el.removeEventListener('pointerup', onUp)
      }
      this.el.addEventListener('pointermove', onMove)
      this.el.addEventListener('pointerup', onUp)
    })
  }

  _setupResize() {
    this.el.querySelectorAll('.sticker-handle').forEach((handle) => {
      handle.addEventListener('pointerdown', (e) => {
        e.stopPropagation()
        const pos      = handle.dataset.handle
        const startX   = e.clientX, startY   = e.clientY
        const startW   = parseFloat(this.el.style.width)
        const startH   = parseFloat(this.el.style.height)
        const startL   = parseFloat(this.el.style.left)
        const startT   = parseFloat(this.el.style.top)
        const MIN_W = 60, MIN_H = 20
        handle.setPointerCapture(e.pointerId)

        const onMove = (e) => {
          const dx = e.clientX - startX, dy = e.clientY - startY
          if (pos.includes('right')) {
            this.el.style.width = `${Math.max(MIN_W, startW + dx)}px`
          } else {
            const nw = Math.max(MIN_W, startW - dx)
            this.el.style.width = `${nw}px`
            this.el.style.left  = `${startL + startW - nw}px`
          }
          if (pos.includes('bottom')) {
            this.el.style.height = `${Math.max(MIN_H, startH + dy)}px`
          } else {
            const nh = Math.max(MIN_H, startH - dy)
            this.el.style.height = `${nh}px`
            this.el.style.top    = `${startT + startH - nh}px`
          }
        }
        const onUp = () => {
          handle.removeEventListener('pointermove', onMove)
          handle.removeEventListener('pointerup', onUp)
        }
        handle.addEventListener('pointermove', onMove)
        handle.addEventListener('pointerup', onUp)
      })
    })
  }

  commit() {
    const wrapperRect = this.wrapper.getBoundingClientRect()
    const stickerRect = this.el.getBoundingClientRect()
    const { x, y, w, h } = computeCanvasBounds(stickerRect, wrapperRect, this.sigCanvas)
    this.sigCanvas.getContext('2d').drawImage(this.el.querySelector('img'), x, y, w, h)
    this.el.remove()
  }

  remove() {
    this.el.remove()
  }
}
```

- [ ] **Step 5.4: Run tests to confirm pass**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 5.5: Commit**

```bash
git add sig-sticker.js __tests__/sig-sticker.test.js
git commit -m "feat: add SignatureSticker with drag, resize, and commit math tests"
```

---

## Task 6: `place-modal.js` — Signing Canvas Modal

**Files:**
- Create: `place-modal.js`

*(Drawing behavior is verified manually in Task 7.10.)*

- [ ] **Step 6.1: Implement `place-modal.js`**

Create `place-modal.js`:

```javascript
export class PlaceModal {
  constructor(colorPickerEl, thicknessSliderEl) {
    this.colorPicker     = colorPickerEl
    this.thicknessSlider = thicknessSliderEl
    this._callback       = null
    this._drawing        = false

    this.modal  = document.getElementById('place-modal')
    this.canvas = document.getElementById('place-canvas')
    this.ctx    = this.canvas.getContext('2d')

    document.getElementById('place-btn-clear').addEventListener('click', () => this._clear())
    document.getElementById('place-btn-cancel').addEventListener('click', () => this.close())
    document.getElementById('place-btn-apply').addEventListener('click', () => this._apply())

    this._setupDrawing()
  }

  open(onApply) {
    this._callback = onApply
    this.modal.classList.add('active')
    requestAnimationFrame(() => {
      this.canvas.width  = this.canvas.offsetWidth  || 800
      this.canvas.height = this.canvas.offsetHeight || 300
      this._initCtx()
      this._clear()
    })
  }

  close() {
    this.modal.classList.remove('active')
    this._callback = null
  }

  _clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
  }

  _apply() {
    const dataURL = this.canvas.toDataURL('image/png')
    const cb = this._callback
    this.close()
    if (cb) cb(dataURL)
  }

  _initCtx() {
    this.ctx.lineCap     = 'round'
    this.ctx.lineJoin    = 'round'
    this.ctx.strokeStyle = this.colorPicker.value
    this.ctx.lineWidth   = parseInt(this.thicknessSlider.value, 10)
  }

  _setupDrawing() {
    const getPos = (e) => {
      const rect = this.canvas.getBoundingClientRect()
      return {
        x: (e.clientX - rect.left) * (this.canvas.width  / rect.width),
        y: (e.clientY - rect.top)  * (this.canvas.height / rect.height),
      }
    }

    this.canvas.addEventListener('pointerdown', (e) => {
      this._drawing        = true
      this.ctx.strokeStyle = this.colorPicker.value
      this.ctx.lineWidth   = parseInt(this.thicknessSlider.value, 10)
      const pos = getPos(e)
      this.ctx.beginPath()
      this.ctx.moveTo(pos.x, pos.y)
      this.ctx.lineTo(pos.x, pos.y)
      this.ctx.stroke()
      this.canvas.setPointerCapture(e.pointerId)
    })

    this.canvas.addEventListener('pointermove', (e) => {
      if (!this._drawing) return
      e.preventDefault()
      const pos = getPos(e)
      this.ctx.lineTo(pos.x, pos.y)
      this.ctx.stroke()
    })

    const stop = (e) => {
      if (this._drawing) {
        this._drawing = false
        this.ctx.closePath()
        this.canvas.releasePointerCapture(e.pointerId)
      }
    }
    this.canvas.addEventListener('pointerup', stop)
    this.canvas.addEventListener('pointercancel', stop)
  }
}
```

- [ ] **Step 6.2: Commit**

```bash
git add place-modal.js
git commit -m "feat: add PlaceModal landscape signing canvas"
```

---

## Task 7: Wire Place Mode into `main.js`

**Files:**
- Modify: `main.js`

- [ ] **Step 7.1: Add imports at the top of `main.js`**

After the existing three import lines (lines 1–3), add:

```javascript
import { detectBounds } from './boundary-detect.js'
import { PlaceModal } from './place-modal.js'
import { SignatureSticker } from './sig-sticker.js'
import { isDoubleTap } from './double-tap.js'
```

- [ ] **Step 7.2: Add new DOM reference after existing declarations**

After `const btnModeSign = document.getElementById('btn-mode-sign')` (around line 26), add:

```javascript
const btnModePlace = document.getElementById('btn-mode-place')
```

- [ ] **Step 7.3: Add state variables after existing state block**

After `let currentVisiblePage = 0` (around line 38), add:

```javascript
let activeStickers = []
let placeModal = null
```

- [ ] **Step 7.4: Replace `setMode` with a version that handles `'place'`**

Replace the existing `setMode` function (around lines 191–202):

```javascript
const setMode = (mode) => {
  currentMode = mode
  btnModeSign.classList.toggle('active', mode === 'sign')
  btnModeView.classList.toggle('active', mode === 'view')
  btnModePlace.classList.toggle('active', mode === 'place')
  pagesContainer.classList.toggle('signing-active', mode === 'sign')
}
```

- [ ] **Step 7.5: Guard drawing against Place mode inside `setupDrawingEvents`**

In `setupDrawingEvents` (around line 242), find the `pointerdown` listener and add one line at the very top of its callback:

```javascript
sigCanvas.addEventListener('pointerdown', (e) => {
  if (currentMode !== 'sign') return   // ← add this line
  isDrawing = true
  // ...rest of existing handler unchanged...
```

- [ ] **Step 7.6: Initialize PlaceModal after existing `drawThicknessPreview()` call**

After `drawThicknessPreview()` (around line 293), add:

```javascript
placeModal = new PlaceModal(colorPicker, thicknessSlider)
```

- [ ] **Step 7.7: Add `setupPlaceEvents` function after `setupDrawingEvents`**

After the closing `}` of `setupDrawingEvents` (around line 274), add:

```javascript
const setupPlaceEvents = (sigCanvas, docCanvas) => {
  const wrapper = sigCanvas.parentElement
  let lastTap = null

  sigCanvas.addEventListener('pointerdown', (e) => {
    if (currentMode !== 'place') return
    const wrapperRect = wrapper.getBoundingClientRect()
    const tap = { time: Date.now(), x: e.clientX - wrapperRect.left, y: e.clientY - wrapperRect.top }

    if (isDoubleTap(lastTap, tap)) {
      lastTap = null
      const bounds = detectBounds(docCanvas, tap.x, tap.y, wrapperRect)
      placeModal.open((dataURL) => {
        const sticker = new SignatureSticker(wrapper, sigCanvas, dataURL, bounds)
        activeStickers.push(sticker)
      })
    } else {
      lastTap = tap
    }
  })
}
```

- [ ] **Step 7.8: Call `setupPlaceEvents` from `createPageCanvasPair`**

In `createPageCanvasPair`, after `setupDrawingEvents(sigCanvas)` (around line 184), add:

```javascript
setupPlaceEvents(sigCanvas, docCanvas)
```

- [ ] **Step 7.9: Wire Place toolbar button after existing mode button listeners**

After `btnModeSign.addEventListener('click', () => setMode('sign'))` (around line 205), add:

```javascript
btnModePlace.addEventListener('click', () => setMode('place'))
```

- [ ] **Step 7.10: Manual smoke test of core flow**

```bash
npm run dev
```

Load a PDF, then verify:
1. Click **Place** — toolbar button becomes active
2. Double-tap on the document — landscape signing modal opens
3. Draw a signature — tap **Apply**
4. A sticker appears on the document with dashed border and corner handles
5. Drag the sticker body — it moves
6. Drag a corner handle — it resizes
7. Click **✓ Commit** — sticker disappears, signature is baked onto the page

- [ ] **Step 7.11: Commit**

```bash
git add main.js
git commit -m "feat: wire Place mode — double-tap, modal, sticker creation"
```

---

## Task 8: Edge Case Guards

**Files:**
- Modify: `main.js`

- [ ] **Step 8.1: Add sticker utilities after `activeStickers` declaration**

After `let activeStickers = []` (added in Task 7.3), add:

```javascript
const hasUncommittedStickers = () =>
  activeStickers.some((s) => document.body.contains(s.el))

const discardAllStickers = () => {
  activeStickers.forEach((s) => s.remove())
  activeStickers = []
}

const guardStickers = (onProceed) => {
  if (!hasUncommittedStickers()) { onProceed(); return }
  if (confirm('You have uncommitted signatures. Discard them and continue?')) {
    discardAllStickers()
    onProceed()
  }
}
```

- [ ] **Step 8.2: Guard View and Sign mode buttons**

Replace the existing View and Sign button listeners (around lines 204–205):

```javascript
btnModeView.addEventListener('click', () => guardStickers(() => setMode('view')))
btnModeSign.addEventListener('click', () => guardStickers(() => setMode('sign')))
```

*(Leave `btnModePlace` unwrapped — entering Place mode doesn't require discarding stickers.)*

- [ ] **Step 8.3: Guard the Close button**

Replace the existing `btnClose` listener (around line 415):

```javascript
btnClose.addEventListener('click', () => {
  guardStickers(() => {
    editorContainer.classList.remove('active')
    dropzone.classList.add('active')
    currentFile = null
    currentFileType = null
    pdfDocBytes = null
    imageBytes = null
    pageCanvases = []
    activeStickers = []
    pagesContainer.innerHTML = ''
    fileInput.value = ''
    setMode('view')
  })
})
```

- [ ] **Step 8.4: Guard the Download button**

Replace the existing `btnDownload` listener (around line 342). Wrap the entire async body inside `guardStickers`:

```javascript
btnDownload.addEventListener('click', () => {
  guardStickers(async () => {
    showLoading()
    try {
      let outputPdf

      if (currentFileType === 'pdf') {
        outputPdf = await PDFDocument.load(pdfDocBytes)
        const pages = outputPdf.getPages()

        for (let i = 0; i < pageCanvases.length; i++) {
          const { sigCanvas } = pageCanvases[i]
          const page = pages[i]
          if (!page) continue
          const sigDataUrl = sigCanvas.toDataURL('image/png')
          const sigBytes   = await fetch(sigDataUrl).then((r) => r.arrayBuffer())
          const sigImage   = await outputPdf.embedPng(sigBytes)
          const { width: pageW, height: pageH } = page.getSize()
          page.drawImage(sigImage, { x: 0, y: 0, width: pageW, height: pageH })
        }
      } else {
        outputPdf = await PDFDocument.create()
        let image
        if (currentFile.type === 'image/png') {
          image = await outputPdf.embedPng(imageBytes)
        } else {
          image = await outputPdf.embedJpg(imageBytes)
        }
        const { width, height } = image.scale(1)
        const page = outputPdf.addPage([width, height])
        page.drawImage(image, { x: 0, y: 0, width, height })

        const { sigCanvas } = pageCanvases[0]
        const sigDataUrl = sigCanvas.toDataURL('image/png')
        const sigBytes   = await fetch(sigDataUrl).then((r) => r.arrayBuffer())
        const sigImage   = await outputPdf.embedPng(sigBytes)
        page.drawImage(sigImage, { x: 0, y: 0, width, height })
      }

      const pdfBytes      = await outputPdf.save()
      const blob          = new Blob([pdfBytes], { type: 'application/pdf' })
      const url           = URL.createObjectURL(blob)
      const originalName  = currentFile.name.replace(/\.[^/.]+$/, '')
      const a             = document.createElement('a')
      a.href = url
      a.download = `${originalName}_SIGNED.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export failed:', error)
      alert('Failed to generate signed PDF.')
    } finally {
      hideLoading()
    }
  })
})
```

- [ ] **Step 8.5: Guard Clear Page to also remove stickers on that page**

Replace the existing `btnClear` listener (around line 296):

```javascript
btnClear.addEventListener('click', () => {
  if (pageCanvases[currentVisiblePage]) {
    const { sigCanvas } = pageCanvases[currentVisiblePage]
    sigCanvas.getContext('2d').clearRect(0, 0, sigCanvas.width, sigCanvas.height)
    const wrapper = sigCanvas.parentElement
    activeStickers = activeStickers.filter((s) => {
      if (s.wrapper === wrapper) { s.remove(); return false }
      return true
    })
  }
})
```

- [ ] **Step 8.6: Guard Clear All to remove all stickers**

Replace the existing `btnClearAll` listener (around line 304):

```javascript
btnClearAll.addEventListener('click', () => {
  pageCanvases.forEach(({ sigCanvas }) => {
    sigCanvas.getContext('2d').clearRect(0, 0, sigCanvas.width, sigCanvas.height)
  })
  discardAllStickers()
})
```

- [ ] **Step 8.7: Run all tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 8.8: Manual verification of every edge case**

Start `npm run dev`, load a multi-page PDF, and verify each row:

| Action | Expected |
|---|---|
| Place mode → switch to View with uncommitted sticker | Prompt appears; Cancel stays in Place mode |
| Place mode → switch to Sign with uncommitted sticker | Prompt appears; Cancel stays in Place mode |
| Place mode → Close with uncommitted sticker | Prompt appears; Cancel keeps editor open |
| Download with uncommitted sticker | Prompt appears; Confirm downloads the PDF |
| Clear Page with sticker on that page | Sticker removed; sigCanvas cleared; sticker on other pages untouched |
| Clear All | All stickers removed; all sigCanvases cleared |
| Double-tap again before committing first sticker | Second sticker created; both have independent Commit buttons |
| Cancel in signing modal | Modal closes; no sticker appears |

- [ ] **Step 8.9: Commit**

```bash
git add main.js
git commit -m "feat: add uncommitted-sticker guards on mode switch, close, download, and clear"
```

---

## Self-Review Checklist

- [x] Three-mode toolbar (`View | Sign | Place`) — Task 7
- [x] Double-tap detection (300ms / 20px) — Tasks 2, 7
- [x] Drawing suppressed in Place mode — Task 7.5
- [x] Full-screen landscape modal (`rotate(-90deg)`) — Tasks 4, 6
- [x] Color and thickness read from pickers on open — Task 6 (`_initCtx`)
- [x] Tier 1 boundary: explicit box — Task 3
- [x] Tier 2 boundary: signature underline — Task 3
- [x] Tier 3 boundary: whitespace scan — Task 3
- [x] Sticker drag to reposition — Task 5
- [x] Sticker corner handles resize (min 60×20) — Task 5
- [x] Commit bakes to `sigCanvas` with correct scaling — Tasks 5, 7
- [x] Multiple stickers coexist — Task 7 (`activeStickers` array)
- [x] Mode switch guard — Task 8.2
- [x] Download guard — Task 8.4
- [x] Close guard — Task 8.3
- [x] Clear Page removes page stickers — Task 8.5
- [x] Clear All removes all stickers — Task 8.6
- [x] Cancel in modal = no sticker — Task 6 (`close()` discards `_callback`)
- [x] Existing Sign mode untouched — Task 7.5 (guard only, no other changes)
