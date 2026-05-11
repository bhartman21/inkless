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
    const dataURL = this._cropToInk()
    const cb = this._callback
    this.close()
    if (cb) cb(dataURL)
  }

  // Crop the canvas to the tight bounding box of actual ink pixels,
  // so only the drawn signature (not surrounding whitespace) fills the sticker.
  _cropToInk() {
    const { width, height } = this.canvas
    const { data } = this.ctx.getImageData(0, 0, width, height)

    let minX = width, maxX = -1, minY = height, maxY = -1

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (data[(y * width + x) * 4 + 3] > 10) {
          if (x < minX) minX = x
          if (x > maxX) maxX = x
          if (y < minY) minY = y
          if (y > maxY) maxY = y
        }
      }
    }

    // Nothing drawn — return empty transparent image
    if (maxX < 0) return this.canvas.toDataURL('image/png')

    const PAD = 6
    minX = Math.max(0, minX - PAD)
    minY = Math.max(0, minY - PAD)
    maxX = Math.min(width  - 1, maxX + PAD)
    maxY = Math.min(height - 1, maxY + PAD)

    const cropW = maxX - minX + 1
    const cropH = maxY - minY + 1

    const offscreen = document.createElement('canvas')
    offscreen.width  = cropW
    offscreen.height = cropH
    offscreen.getContext('2d').drawImage(this.canvas, minX, minY, cropW, cropH, 0, 0, cropW, cropH)
    return offscreen.toDataURL('image/png')
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
        this.canvas.releasePointerCapture(e.pointerId)
      }
    }
    this.canvas.addEventListener('pointerup', stop)
    this.canvas.addEventListener('pointercancel', stop)
  }
}
