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
    this._destroyed = false
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
        if (this._destroyed) return
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
          if (this._destroyed) return
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
    this._destroyed = true
    this.el.remove()
  }
}
