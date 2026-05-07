import './style.css';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument } from 'pdf-lib';

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
const loadingOverlay = document.getElementById('loadingOverlay');
const pageIndicator = document.getElementById('page-indicator');
const btnModeView = document.getElementById('btn-mode-view');
const btnModeSign = document.getElementById('btn-mode-sign');

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

// ----- File Handling -----

const handleFile = async (file) => {
  if (!file) return;

  showLoading();
  currentFile = file;
  pageCanvases = [];
  pagesContainer.innerHTML = '';

  try {
    const arrayBuffer = await file.arrayBuffer();

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

    // Switch UI
    dropzone.classList.remove('active');
    editorContainer.classList.add('active');
    updatePageIndicator();

  } catch (error) {
    console.error('Error handling file:', error);
    alert('Failed to load document.');
  } finally {
    hideLoading();
  }
};

// ----- Multi-page PDF Rendering -----

const renderPDF = async (data) => {
  const loadingTask = pdfjsLib.getDocument({ data: data.slice(0) });
  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);

    // Calculate scale to fit container (using 1200 as a high-res base)
    const unscaledViewport = page.getViewport({ scale: 1 });
    const scale = Math.min(1200 / unscaledViewport.width, 3);
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
      const maxWidth = 1200;
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

  return { docCanvas, sigCanvas };
};

// ----- Mode Switching -----

const setMode = (mode) => {
  currentMode = mode;
  if (mode === 'sign') {
    btnModeSign.classList.add('active');
    btnModeView.classList.remove('active');
    pagesContainer.classList.add('signing-active');
  } else {
    btnModeSign.classList.remove('active');
    btnModeView.classList.add('active');
    pagesContainer.classList.remove('signing-active');
  }
};

btnModeView.addEventListener('click', () => setMode('view'));
btnModeSign.addEventListener('click', () => setMode('sign'));

// ----- Signature Drawing Engine -----

const setupDrawingEvents = (sigCanvas) => {
  const ctx = sigCanvas.getContext('2d');
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 3;
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
    isDrawing = true;
    activeSignatureCanvas = sigCanvas;
    ctx.strokeStyle = colorPicker.value;
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

// Color picker updates future strokes on all canvases
colorPicker.addEventListener('input', (e) => {
  pageCanvases.forEach(({ sigCanvas }) => {
    sigCanvas.getContext('2d').strokeStyle = e.target.value;
  });
});

// Clear signature on the most visible page
btnClear.addEventListener('click', () => {
  if (pageCanvases[currentVisiblePage]) {
    const { sigCanvas } = pageCanvases[currentVisiblePage];
    const ctx = sigCanvas.getContext('2d');
    ctx.clearRect(0, 0, sigCanvas.width, sigCanvas.height);
  }
});

// Clear all signatures on all pages
btnClearAll.addEventListener('click', () => {
  pageCanvases.forEach(({ sigCanvas }) => {
    const ctx = sigCanvas.getContext('2d');
    ctx.clearRect(0, 0, sigCanvas.width, sigCanvas.height);
  });
});

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

btnDownload.addEventListener('click', async () => {
  showLoading();
  try {
    let outputPdf;

    if (currentFileType === 'pdf') {
      // Load original PDF and overlay signatures on each page
      outputPdf = await PDFDocument.load(pdfDocBytes);
      const pages = outputPdf.getPages();

      for (let i = 0; i < pageCanvases.length; i++) {
        const { sigCanvas } = pageCanvases[i];
        const page = pages[i];
        if (!page) continue;

        const sigDataUrl = sigCanvas.toDataURL('image/png');
        const sigBytes = await fetch(sigDataUrl).then((r) => r.arrayBuffer());
        const sigImage = await outputPdf.embedPng(sigBytes);

        const { width: pageW, height: pageH } = page.getSize();
        page.drawImage(sigImage, {
          x: 0,
          y: 0,
          width: pageW,
          height: pageH,
        });
      }
    } else {
      // Image: create new PDF with single page
      outputPdf = await PDFDocument.create();
      let image;
      if (currentFile.type === 'image/png') {
        image = await outputPdf.embedPng(imageBytes);
      } else {
        image = await outputPdf.embedJpg(imageBytes);
      }
      const { width, height } = image.scale(1);
      const page = outputPdf.addPage([width, height]);
      page.drawImage(image, { x: 0, y: 0, width, height });

      // Overlay signature
      const { sigCanvas } = pageCanvases[0];
      const sigDataUrl = sigCanvas.toDataURL('image/png');
      const sigBytes = await fetch(sigDataUrl).then((r) => r.arrayBuffer());
      const sigImage = await outputPdf.embedPng(sigBytes);
      page.drawImage(sigImage, { x: 0, y: 0, width, height });
    }

    // Save and download
    const pdfBytes = await outputPdf.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);

    // Build filename: originalname_SIGNED.pdf
    const originalName = currentFile.name.replace(/\.[^/.]+$/, '');
    const a = document.createElement('a');
    a.href = url;
    a.download = `${originalName}_SIGNED.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

  } catch (error) {
    console.error('Export failed:', error);
    alert('Failed to generate signed PDF.');
  } finally {
    hideLoading();
  }
});

// ----- UI Flow & Utilities -----

btnClose.addEventListener('click', () => {
  editorContainer.classList.remove('active');
  dropzone.classList.add('active');
  currentFile = null;
  currentFileType = null;
  pdfDocBytes = null;
  imageBytes = null;
  pageCanvases = [];
  pagesContainer.innerHTML = '';
  fileInput.value = '';
  setMode('view'); // Reset to view mode
});

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
