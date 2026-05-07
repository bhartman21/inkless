# BuyMeACoffee Floating Button

**Date:** 2026-05-06

## Summary

Add a floating BuyMeACoffee donation button to the Inkless app — fixed to the bottom-right corner, always visible, no external scripts or images.

## Design

A single `<a>` element linking to `https://www.buymeacoffee.com/bhartman21`, opened in a new tab. Styled entirely with CSS: BuyMeACoffee yellow (`#FFDD00`), dark text, pill shape, 20px from bottom and right edges, subtle box-shadow lift on hover.

Label: `☕ Buy me a coffee`

## Files Changed

- `index.html` — add the `<a>` tag before `</body>`
- `style.css` — add fixed-position styles for `.bmc-button`

## Out of Scope

- No widget script
- No external image assets
- No JS
