export function isDark(data, x, y, canvasWidth) {
  const i = (y * canvasWidth + x) * 4
  return data[i] < 80 && data[i + 1] < 80 && data[i + 2] < 80 && data[i + 3] > 20
}

export function detectBox(data, tapX, tapY, canvasWidth, canvasHeight) {
  const BAND = 10, MAX_H = 400, MAX_V = 200

  // Walk in direction dx looking for the first column that has a dark pixel
  // in a vertical band around tapY. Returns the x of the wall, or null.
  function findWall(startX, dx) {
    let x = startX + dx
    while (x >= 0 && x < canvasWidth && Math.abs(x - startX) < MAX_H) {
      for (let dy = -BAND; dy <= BAND; dy++) {
        const y = tapY + dy
        if (y >= 0 && y < canvasHeight && isDark(data, x, y, canvasWidth)) {
          return x
        }
      }
      x += dx
    }
    return null
  }

  const leftWall = findWall(tapX, -1)
  const rightWall = findWall(tapX, 1)
  if (leftWall === null || rightWall === null) return null
  const w = rightWall - leftWall
  if (w < 80) return null

  // Walk vertically to find top/bottom walls by scanning for a row where
  // a significant portion of the horizontal span is dark
  function findHWall(startY, dy) {
    let y = startY + dy
    while (y >= 0 && y < canvasHeight && Math.abs(y - startY) < MAX_V) {
      let darkCount = 0
      for (let x = leftWall; x <= rightWall; x++) {
        if (isDark(data, x, y, canvasWidth)) darkCount++
      }
      if (darkCount / w > 0.3) return y
      y += dy
    }
    return null
  }

  const top = findHWall(tapY, -1)
  const bottom = findHWall(tapY, 1)
  if (top === null || bottom === null) return null
  const h = bottom - top
  if (h < 20) return null
  return { x: leftWall, y: top, w, h }
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
