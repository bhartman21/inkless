# Inkless - Project Completion & Next Steps

This document outlines the remaining tasks and potential enhancements to move the current prototype into a fully polished production-ready application.

## 1. Core Feature Polishing
- [ ] **Undo/Redo Functionality**: Implement a stroke history buffer so users can correct mistakes without clearing the entire page.
- [ ] **Variable Pen Thickness**: Add a slider to the toolbar to allow finer or thicker signature lines.
- [ ] **Text Annotations**: Allow users to click and type (e.g., for "Date" or "Printed Name") to be overlaid on the PDF alongside the signature.
- [ ] **Customizable Cursor**: Change the crosshair to a pen or pencil icon when hovering over the document to improve the "signing" feel.

## 2. UI & UX Enhancements
- [ ] **Page Thumbnail Sidebar**: For long documents, add a sidebar with thumbnails for quick jumping between pages.
- [ ] **Smooth Zooming**: Implement Zoom In/Out controls to help users sign small fields accurately.
- [ ] **Mobile Optimization**: Double-check the "palm rejection" and layout on tablets (iPad/Stylus) to ensure the floating toolbar doesn't obstruct the signing area.
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
*Generated on 2026-05-06*
