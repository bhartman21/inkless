# Inkless - Project Completion & Next Steps

This document outlines the remaining tasks and potential enhancements to move the current prototype into a fully polished production-ready application.

## Recently Completed
- [x] **Place Mode**: Double-tap a signature field on the document to detect its bounds, draw your signature in a full-screen modal, then drag and resize the resulting sticker before committing it to the page.
- [x] **Responsive Toolbar**: Single-row toolbar with mode-aware signing controls (hidden in View mode), a Clear dropdown, and two CSS breakpoints — tablet (≤768px) hides mode-toggle labels and page indicator; phone (≤540px) hides all button text.
- [x] **Font Awesome Icons**: Replaced all inline SVGs with Font Awesome 6 Free (`fa-eye`, `fa-signature`, `fa-stamp`, `fa-eraser`, `fa-download`, etc.) for consistent cross-platform rendering.
- [x] **PDF/Image Scaling to Fit Screen**: Documents now render to the available container width instead of a hardcoded 1200px, so every page fits the viewport without horizontal scrolling.
- [x] **Signing Modal Sizing**: The Place-mode drawing modal is now 92% of the viewport with rounded corners, floating over a dark backdrop instead of filling the entire screen.
- [x] **Variable Pen Thickness**: Slider in the toolbar to adjust signature line width with live preview.

## 1. Core Feature Polishing
- [ ] **Undo/Redo Functionality**: Implement a stroke history buffer so users can correct mistakes without clearing the entire page.
- [ ] **Text Annotations**: Allow users to click and type (e.g., for "Date" or "Printed Name") to be overlaid on the PDF alongside the signature.
- [ ] **Customizable Cursor**: Change the crosshair to a pen or pencil icon when hovering over the document to improve the "signing" feel.

## 2. UI & UX Enhancements
- [ ] **Page Thumbnail Sidebar**: For long documents, add a sidebar with thumbnails for quick jumping between pages.
- [ ] **Smooth Zooming**: Implement Zoom In/Out controls to help users sign small fields accurately.
- [ ] **Dark Mode Toggle**: While the UI is currently dark, adding a toggle for a light/system theme would improve accessibility.

## 3. Technical Robustness
- [ ] **Memory Management**: For very large PDFs (50+ pages), implement "lazy loading" so only the currently visible pages are rendered to canvas, saving browser memory.
- [ ] **Form Preservation**: Verify that original PDF form fields (if any) are preserved in the output or decide if they should be flattened.
- [ ] **Error Boundaries**: Add more descriptive error messages for corrupted PDFs or unsupported image formats.

## 4. Privacy & Trust
- [ ] **Explicit Privacy Notice**: Add a small "How it works" section or tooltip explaining that no data is ever sent to a server, reinforcing the local-only nature of the app.
- [ ] **Wipe Data / Session Clear**: Add a button to explicitly clear all memory and canvases before closing the tab.

## 5. Deployment
- [ ] **Production Build**: Run `npm run build` to generate the optimized `dist` folder.
- [ ] **Static Hosting**: Deploy the `dist` folder to a service like GitHub Pages, Vercel, or Netlify (since it requires no backend).
- [ ] **PWA Support**: Turn the app into a Progressive Web App (PWA) so users can "install" it on their desktop and use it offline.

---
*Generated on 2026-05-06 · Updated 2026-05-10*
