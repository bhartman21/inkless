# Place Mode Signing — Design Spec

**Date:** 2026-05-09
**Branch:** feature/area-select-signing
**Status:** Approved, pending implementation

---

## Overview

Add a "Place" mode to Inkless that lets users double-tap a location on a document, sign in a full-screen landscape canvas, then position and resize the resulting signature as a sticker before committing it to the page. This supplements (does not replace) the existing direct-draw Sign mode, and provides a first-class mobile signing experience.

---

## User Flow

1. User taps **[Place]** in the toolbar → enters Place mode
2. User **double-taps** anywhere on a document page → full-screen landscape signing modal opens
3. User draws their signature in the wide landscape canvas → taps **Apply**
4. Modal closes → signature appears as a draggable/resizable **sticker** centered at the double-tap location
5. User drags the sticker body to reposition, drags corner handles to resize
6. User taps **✓ Commit** → signature is baked into the page's `sigCanvas` at the correct coordinates → sticker is removed

Multiple stickers can coexist on a page before committing.

---

## Architecture

### Mode Extension

`currentMode` gains a third value: `'place'` (alongside existing `'view'` and `'sign'`).

The toolbar gains a third mode button: `[ View ] [ Sign ] [ Place ]`. Mode switching logic follows the same pattern as the existing `setMode()` function.

In Place mode, the `sigCanvas` pointer events used for drawing are suppressed. Instead, double-tap detection runs on the canvas.

### Double-Tap Detection

Per-canvas state tracks the last `pointerdown` timestamp and position. A double-tap is recognized when:
- Two `pointerdown` events occur within **300ms** of each other
- Both touches are within **20px** of each other

On detection, the (x, y) coordinates relative to the `.canvas-wrapper` are recorded, boundary detection runs (see below), and `PlaceModal` is opened.

### Boundary Detection

After a double-tap is confirmed, the app samples the underlying `docCanvas` pixels near the tap point to infer the intended signature area. Detection runs through three tiers in order, stopping at the first success. All pixel work uses `docCtx.getImageData()`. Coordinates are converted between CSS and canvas space using the same scale ratios as the commit math. "Dark pixel" = all RGB channels < 80.

**Tier 1 — Explicit boundary (box or ruled field)**

Walk left, right, up, and down from the tap point looking for explicit enclosing lines:
- Horizontal: walk ±4px around `tapCanvasY`, stop when dark pixel density drops to near-zero for 10+ consecutive columns, or after 600 canvas px.
- Vertical: walk up and down from `tapCanvasY`, stop when a dense horizontal line of dark pixels is found (box edge or underline), or after 120 canvas px.
- Accept the result if detected width ≥ 80 canvas px and height ≥ 20 canvas px.
- Sticker is sized and positioned to match the detected region.

**Tier 2 — Signature underline**

If Tier 1 finds no enclosing box, scan horizontally at `tapCanvasY`, `tapCanvasY + 5`, and `tapCanvasY + 10` for a continuous run of dark pixels spanning ≥ 80 canvas px (a signature underline). Take the longest such run found within 20px below the tap.
- Sticker width matches the underline length; sticker is positioned so its bottom edge sits on the line (with 4px padding), height defaults to 50% of the line width (capped at 80 canvas px) to give a natural signature-height proportion.

**Tier 3 — Surrounding whitespace**

If no line is found, analyze the whitespace around the tap:
- Scan outward in all 4 directions until the first row/column containing ≥ 10% dark pixels (indicating content — text, a rule, a border). Record those distances as `gapLeft`, `gapRight`, `gapUp`, `gapDown`.
- Sticker width = `gapLeft + gapRight` (capped at 500 canvas px); sticker height = `gapUp + gapDown` (capped at 150 canvas px).
- Minimum viable: width ≥ 80 and height ≥ 20 canvas px. If either is too small, expand to minimum before converting to CSS px.
- This handles blank areas, form fields without visible rules, and general whitespace zones.

**Convert to CSS px** before applying to the sticker: `cssW = canvasW * wrapper.width / canvas.width`.

All three tiers produce a sticker that is centered at (or aligned to) the tap point unless a specific anchor was found (e.g., an underline anchors the sticker bottom).

---

## Components

### PlaceModal

A single `<div id="place-modal">` injected into `<body>` at startup (hidden). Reused across all double-taps — reset and reopened each time.

**Structure:**
```
#place-modal (full-screen fixed overlay, rotated)
  .place-modal-inner (rotated container: width=100vh, height=100vw)
    .place-modal-toolbar
      [Clear]  [Cancel]  [Apply]
    #place-canvas (signing canvas)
```

**Rotation approach:** The modal container uses `transform: rotate(-90deg)` with `width: 100vh; height: 100vw` so it fills the screen in landscape orientation without requiring `screen.orientation.lock()` (which requires a manifest and user gesture, and is unsupported in many browsers).

**Behavior:**
- `Clear` — clears the canvas
- `Cancel` — closes modal, no sticker created
- `Apply` — captures canvas as dataURL, closes modal, creates a `SignatureSticker`

### SignatureSticker

A `<div class="sig-sticker">` positioned absolutely over the page's `.canvas-wrapper`.

**Structure:**
```
.sig-sticker (position: absolute, draggable body)
  img (the signature dataURL)
  .sticker-handle.top-left
  .sticker-handle.top-right
  .sticker-handle.bottom-left
  .sticker-handle.bottom-right
  button.sticker-commit  ✓ Commit
```

**Initial placement:** Centered at (or anchored to) the double-tap coordinates recorded before the modal opened. Size is determined by the three-tier boundary detection — explicit box, then signature underline, then surrounding whitespace. All three tiers produce a meaningful size; there is no fixed fallback.

**Drag to reposition:** `pointerdown` on the sticker body (not a handle) → `pointermove` translates the sticker via `left`/`top` CSS.

**Drag corner to resize:** `pointerdown` on a corner handle → `pointermove` adjusts width/height (minimum 60×20px). Opposite corner stays anchored.

**Commit:**
1. Read sticker's `getBoundingClientRect()` and the parent `.canvas-wrapper`'s `getBoundingClientRect()`
2. Compute sticker position and size relative to the canvas-wrapper in CSS pixels
3. Scale to canvas coordinates: `canvasX = cssX * (canvas.width / wrapper.width)`, `canvasY = cssY * (canvas.height / wrapper.height)`
4. Call `sigCtx.drawImage(img, canvasX, canvasY, canvasW, canvasH)`
5. Remove sticker DOM element

---

## Data Flow

```
pointerdown × 2 within 300ms/20px (Place mode)
  → store tapX, tapY (relative to canvas-wrapper)
  → detectBounds(docCanvas, tapX, tapY) → { x, y, w, h } or null
  → PlaceModal.open()

PlaceModal: user draws → Apply
  → dataURL = placeCanvas.toDataURL('image/png')
  → PlaceModal.close()
  → new SignatureSticker(pageIndex, tapX, tapY, dataURL, detectedBounds)

SignatureSticker: user drags/resizes → ✓ Commit
  → compute canvas-space coordinates
  → sigCtx.drawImage(img, x, y, w, h)
  → sticker.remove()
```

---

## Edge Cases

| Situation | Behavior |
|---|---|
| Mode switch with uncommitted stickers | Prompt: "You have uncommitted signatures. Discard?" — Cancel keeps Place mode active |
| Download with uncommitted stickers | Same prompt before export begins |
| No explicit boundary at tap point | Tiers 2 and 3 run automatically — underline match or whitespace fit always produces a size |
| Cancel in modal | Modal closes, no sticker created, tap coordinates discarded |
| Second double-tap before committing first sticker | Creates a second sticker — both coexist, each with its own Commit button |
| Clear Page with uncommitted stickers | Clears `sigCanvas` and removes all stickers on that page |
| Clear All | Clears all pages' `sigCanvas` and removes all stickers across all pages |

---

## What Does Not Change

- Existing **Sign** mode (direct draw) is untouched
- **View** mode is untouched
- PDF export (`btnDownload`) is unchanged — stickers must be committed before downloading (enforced by the uncommitted-stickers prompt)
- Color picker and thickness slider apply to both Sign mode and the Place modal canvas — the modal reads current values when it opens, so the user's chosen color and thickness carry through.
