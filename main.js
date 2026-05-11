import './style.css';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument } from 'pdf-lib';
import { detectBounds } from './boundary-detect.js'
import { PlaceModal } from './place-modal.js'
import { SignatureSticker } from './sig-sticker.js'
import { isDoubleTap } from './double-tap.js'

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

// DOM Elements
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const editorContainer = document.getElementById('editor-container');
const pagesContainer = document.getElementById('pages-container');
const btnClose = document.getElementById('btn-close');
const btnClear = document.getElementById('btn-clear');
const btnClearAll = document.getElementById('btn-clear-all');
const btnDownload = document.getElementById('btn-download');
const colorPicker = document.getElementById('colorPicker');
const thicknessSlider = document.getElementById('thicknessSlider');
const loadingOverlay = document.getElementById('loadingOverlay');
const pageIndicator = document.getElementById('page-indicator');
const btnModeView = document.getElementById('btn-mode-view');
const btnModeSign = document.getElementById('btn-mode-sign');
const btnModePlace = document.getElementById('btn-mode-place')
const signingControls = document.getElementById('signing-controls')
const btnClearToggle = document.getElementById('btn-clear-toggle')
const clearMenu = document.getElementById('clear-menu')

// State
let currentMode = 'view'; // 'view' or 'sign'
let isDrawing = false;
let activeSignatureCanvas = null; // The canvas currently being drawn on
let currentFile = null;
let currentFileType = null; // 'image' or 'pdf'
let pdfDocBytes = null; // Original PDF bytes for export
let imageBytes = null; // Original image bytes for export
let pageCanvases = []; // Array of { docCanvas, sigCanvas, width, height } per page
let currentVisiblePage = 0; // Track which page is most visible for "Clear Page"
let activeStickers = []
let placeModal = null

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

// ----- File Handling -----

const handleFile = async (file) => {
  if (!file) return;

  showLoading();
  currentFile = file;
  pageCanvases = [];
  pagesContainer.innerHTML = '';

  try {
    const arrayBuffer = await file.arrayBuffer();

    // Switch UI before rendering so container width is measurable
    dropzone.classList.remove('active');
    editorContainer.classList.add('active');

    if (file.type === 'application/pdf') {
      currentFileType = 'pdf';
      pdfDocBytes = arrayBuffer;
      await renderPDF(arrayBuffer);
    } else if (file.type.startsWith('image/')) {
      currentFileType = 'image';
      imageBytes = arrayBuffer;
      await renderImage(file);
    } else {
      alert('Unsupported file type.');
      hideLoading();
      return;
    }

    updatePageIndicator();

  } catch (error) {
    console.error('Error handling file:', error);
    alert('Failed to load document.');
  } finally {
    hideLoading();
  }
};

// ----- Multi-page PDF Rendering -----

const availableWidth = () => {
  const w = pagesContainer.clientWidth - 32 // subtract 1rem padding on each side
  return Math.max(w || window.innerWidth - 96, 300)
}

const renderPDF = async (data) => {
  const loadingTask = pdfjsLib.getDocument({ data: data.slice(0) });
  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;
  const maxW = availableWidth()

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);

    const unscaledViewport = page.getViewport({ scale: 1 });
    const scale = Math.min(maxW / unscaledViewport.width, 3);
    const viewport = page.getViewport({ scale });

    const { docCanvas, sigCanvas } = createPageCanvasPair(viewport.width, viewport.height, i);

    const docCtx = docCanvas.getContext('2d');
    await page.render({ canvasContext: docCtx, viewport }).promise;

    pageCanvases.push({
      docCanvas,
      sigCanvas,
      width: viewport.width,
      height: viewport.height,
      pageIndex: i - 1
    });
  }
};

// ----- Image Rendering (single page) -----

const renderImage = (file) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const maxWidth = availableWidth()
      let scale = 1;
      if (img.width > maxWidth) {
        scale = maxWidth / img.width;
      }

      const w = img.width * scale;
      const h = img.height * scale;

      const { docCanvas, sigCanvas } = createPageCanvasPair(w, h, 1);
      const docCtx = docCanvas.getContext('2d');
      docCtx.drawImage(img, 0, 0, w, h);

      pageCanvases.push({
        docCanvas,
        sigCanvas,
        width: w,
        height: h,
        pageIndex: 0
      });
      resolve();
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
};

// ----- Canvas Creation -----

const createPageCanvasPair = (width, height, pageNum) => {
  // Wrapper for the page
  const pageWrapper = document.createElement('div');
  pageWrapper.className = 'page-wrapper';
  pageWrapper.dataset.page = pageNum;

  // Page label
  const label = document.createElement('div');
  label.className = 'page-label';
  label.textContent = `Page ${pageNum}`;
  pageWrapper.appendChild(label);

  // Canvas container (relative positioning for layering)
  const canvasContainer = document.createElement('div');
  canvasContainer.className = 'canvas-wrapper';
  canvasContainer.style.width = `${width}px`;
  canvasContainer.style.height = `${height}px`;

  // Document canvas (background)
  const docCanvas = document.createElement('canvas');
  docCanvas.width = width;
  docCanvas.height = height;
  docCanvas.style.width = `${width}px`;
  docCanvas.style.height = `${height}px`;
  docCanvas.className = 'doc-canvas';

  // Signature canvas (foreground)
  const sigCanvas = document.createElement('canvas');
  sigCanvas.width = width;
  sigCanvas.height = height;
  sigCanvas.style.width = `${width}px`;
  sigCanvas.style.height = `${height}px`;
  sigCanvas.className = 'sig-canvas';

  canvasContainer.appendChild(docCanvas);
  canvasContainer.appendChild(sigCanvas);
  pageWrapper.appendChild(canvasContainer);
  pagesContainer.appendChild(pageWrapper);

  // Setup drawing on this signature canvas
  setupDrawingEvents(sigCanvas);
  setupPlaceEvents(sigCanvas, docCanvas);

  return { docCanvas, sigCanvas };
};

// ----- Mode Switching -----

const setMode = (mode) => {
  currentMode = mode
  btnModeSign.classList.toggle('active', mode === 'sign')
  btnModeView.classList.toggle('active', mode === 'view')
  btnModePlace.classList.toggle('active', mode === 'place')
  pagesContainer.classList.toggle('signing-active', mode === 'sign')
  pagesContainer.classList.toggle('placing-active', mode === 'place')
  signingControls.classList.toggle('hidden', mode === 'view')
};

btnModeView.addEventListener('click', () => guardStickers(() => setMode('view')))
btnModeSign.addEventListener('click', () => guardStickers(() => setMode('sign')))
btnModePlace.addEventListener('click', () => setMode('place'))


// ----- Signature Drawing Engine -----

const setupDrawingEvents = (sigCanvas) => {
  const ctx = sigCanvas.getContext('2d');
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = parseInt(thicknessSlider.value, 10);
  ctx.strokeStyle = colorPicker.value;

  const getPos = (e) => {
    const rect = sigCanvas.getBoundingClientRect();
    const scaleX = sigCanvas.width / rect.width;
    const scaleY = sigCanvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  sigCanvas.addEventListener('pointerdown', (e) => {
    if (currentMode !== 'sign') return
    isDrawing = true;
    activeSignatureCanvas = sigCanvas;
    ctx.strokeStyle = colorPicker.value;
    ctx.lineWidth = parseInt(thicknessSlider.value, 10);
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    sigCanvas.setPointerCapture(e.pointerId);
  });

  sigCanvas.addEventListener('pointermove', (e) => {
    if (!isDrawing || activeSignatureCanvas !== sigCanvas) return;
    e.preventDefault();
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  });

  const stop = (e) => {
    if (activeSignatureCanvas === sigCanvas) {
      isDrawing = false;
      ctx.closePath();
      sigCanvas.releasePointerCapture(e.pointerId);
      activeSignatureCanvas = null;
    }
  };

  sigCanvas.addEventListener('pointerup', stop);
  sigCanvas.addEventListener('pointercancel', stop);
};

const setupPlaceEvents = (sigCanvas, docCanvas) => {
  const wrapper = sigCanvas.parentElement
  let lastTap = null

  sigCanvas.addEventListener('pointerdown', (e) => {
    if (currentMode !== 'place') return
    if (placeModal && placeModal.modal.classList.contains('active')) return
    const wrapperRect = wrapper.getBoundingClientRect()
    const tap = { time: Date.now(), x: e.clientX - wrapperRect.left, y: e.clientY - wrapperRect.top }

    if (isDoubleTap(lastTap, tap)) {
      lastTap = null
      const bounds = detectBounds(docCanvas, tap.x, tap.y, wrapperRect)
      // Cap sticker to viewport so it's always fully visible and manipulable
      bounds.w = Math.min(bounds.w, window.innerWidth  * 0.92)
      bounds.h = Math.min(bounds.h, window.innerHeight * 0.92)
      placeModal.open((dataURL) => {
        const sticker = new SignatureSticker(wrapper, sigCanvas, dataURL, bounds)
        activeStickers.push(sticker)
      })
    } else {
      lastTap = tap
    }
  })
}

// Color picker updates future strokes on all canvases
colorPicker.addEventListener('input', (e) => {
  pageCanvases.forEach(({ sigCanvas }) => {
    sigCanvas.getContext('2d').strokeStyle = e.target.value;
  });
});

// Thickness slider updates line width on all canvases
thicknessSlider.addEventListener('input', () => {
  const width = parseInt(thicknessSlider.value, 10);
  pageCanvases.forEach(({ sigCanvas }) => {
    sigCanvas.getContext('2d').lineWidth = width;
  });
});

placeModal = new PlaceModal(colorPicker, thicknessSlider)

// Clear dropdown toggle
btnClearToggle.addEventListener('click', (e) => {
  e.stopPropagation()
  clearMenu.classList.toggle('open')
})
document.addEventListener('click', () => clearMenu.classList.remove('open'))

// Clear signature on the most visible page
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

// Clear all signatures on all pages
btnClearAll.addEventListener('click', () => {
  pageCanvases.forEach(({ sigCanvas }) => {
    sigCanvas.getContext('2d').clearRect(0, 0, sigCanvas.width, sigCanvas.height)
  })
  discardAllStickers()
})

// Track which page is most visible for "Clear Page Signature"
const observePages = () => {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const pageNum = parseInt(entry.target.dataset.page, 10);
          currentVisiblePage = pageNum - 1;
          updatePageIndicator();
        }
      });
    },
    { root: pagesContainer, threshold: 0.5 }
  );

  document.querySelectorAll('.page-wrapper').forEach((el) => observer.observe(el));
};

const updatePageIndicator = () => {
  const total = pageCanvases.length;
  if (total > 1) {
    pageIndicator.textContent = `Page ${currentVisiblePage + 1} of ${total}`;
    pageIndicator.style.display = 'inline';
  } else {
    pageIndicator.style.display = 'none';
  }
};

// ----- Export Functionality -----

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

// ----- UI Flow & Utilities -----

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

// Drag and drop setup
dropzone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropzone.classList.add('dragover');
});

dropzone.addEventListener('dragleave', () => {
  dropzone.classList.remove('dragover');
});

dropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropzone.classList.remove('dragover');
  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
    handleFile(e.dataTransfer.files[0]);
  }
});

dropzone.addEventListener('click', () => {
  fileInput.click();
});

fileInput.addEventListener('change', (e) => {
  if (e.target.files && e.target.files.length > 0) {
    handleFile(e.target.files[0]);
  }
});

// Observe pages after rendering is done (called at end of handleFile)
const originalHandleFile = handleFile;
// We need to observe pages after they are rendered — use MutationObserver
const pagesObserver = new MutationObserver(() => {
  observePages();
});
pagesObserver.observe(pagesContainer, { childList: true });

function showLoading() {
  loadingOverlay.classList.remove('hidden');
}

function hideLoading() {
  loadingOverlay.classList.add('hidden');
}
