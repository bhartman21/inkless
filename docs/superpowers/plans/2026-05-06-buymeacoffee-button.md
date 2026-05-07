# BuyMeACoffee Floating Button Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a fixed floating BuyMeACoffee button to the bottom-right corner of the page using only HTML and CSS — no external scripts or images.

**Architecture:** A single `<a>` element added to `index.html` before `</body>`, styled via a new `.bmc-button` rule in `style.css`. The button links to `https://www.buymeacoffee.com/bhartman21` and opens in a new tab.

**Tech Stack:** HTML, CSS (plain — no JS required)

---

### Task 1: Create feature branch

**Files:** none

- [ ] **Step 1: Create and switch to a new branch**

  Run:
  ```bash
  git checkout -b feature/buymeacoffee-button
  ```
  Expected: `Switched to a new branch 'feature/buymeacoffee-button'`

---

### Task 2: Add the button element to index.html

**Files:**
- Modify: `index.html` (add `<a>` before `</body>`)

- [ ] **Step 1: Add the BMC anchor tag**

  In `index.html`, add this line immediately before `</body>`:

  ```html
    <a href="https://www.buymeacoffee.com/bhartman21" target="_blank" rel="noopener noreferrer" class="bmc-button">☕ Buy me a coffee</a>
  ```

  The file's closing lines should look like this after the edit:
  ```html
      </div>
      <script type="module" src="/main.js"></script>
      <a href="https://www.buymeacoffee.com/bhartman21" target="_blank" rel="noopener noreferrer" class="bmc-button">☕ Buy me a coffee</a>
    </body>
  </html>
  ```

---

### Task 3: Add floating button styles to style.css

**Files:**
- Modify: `style.css` (append `.bmc-button` rule at end of file, before the closing of the Utilities section)

- [ ] **Step 1: Append the CSS rule**

  Add the following at the very end of `style.css`, after the `.hidden` rule:

  ```css
  .bmc-button {
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 1000;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 20px;
    background: #FFDD00;
    color: #1a1a1a;
    font-family: var(--font-family);
    font-size: 0.95rem;
    font-weight: 700;
    text-decoration: none;
    border-radius: 50px;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }

  .bmc-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.5);
  }
  ```

---

### Task 4: Verify visually in the browser

**Files:** none (read-only verification step)

- [ ] **Step 1: Start the dev server**

  Run:
  ```bash
  npm run dev
  ```
  Expected: dev server starts, URL shown in terminal (e.g. `http://localhost:5173`)

- [ ] **Step 2: Open the app and verify the button**

  Open the URL in a browser and confirm:
  - Yellow pill-shaped button is visible in the bottom-right corner
  - Button reads "☕ Buy me a coffee"
  - Button does not overlap the footer text
  - Hovering lifts the button slightly
  - Clicking opens `https://www.buymeacoffee.com/bhartman21` in a new tab

- [ ] **Step 3: Stop the dev server**

  Press `Ctrl+C` in the terminal.

---

### Task 5: Commit, push, and open a PR

**Files:** `index.html`, `style.css`

- [ ] **Step 1: Stage the changed files**

  Run:
  ```bash
  git add index.html style.css
  ```

- [ ] **Step 2: Commit**

  Run:
  ```bash
  git commit -m "feat: add floating BuyMeACoffee button to bottom-right corner"
  ```

- [ ] **Step 3: Push the branch**

  Run:
  ```bash
  git push -u origin feature/buymeacoffee-button
  ```

- [ ] **Step 4: Open a pull request**

  Run:
  ```bash
  gh pr create --title "Add floating BuyMeACoffee button" --body "$(cat <<'EOF'
  ## Summary
  - Adds a fixed floating button in the bottom-right corner linking to the BuyMeACoffee donation page
  - Pure HTML + CSS — no external scripts or images loaded
  - Opens in a new tab with rel="noopener noreferrer"

  ## Test plan
  - [ ] Button visible in bottom-right corner on page load
  - [ ] Button reads "☕ Buy me a coffee" in BuyMeACoffee yellow
  - [ ] Hover state lifts the button
  - [ ] Click opens https://www.buymeacoffee.com/bhartman21 in a new tab
  - [ ] Button does not obstruct main app content

  🤖 Generated with [Claude Code](https://claude.com/claude-code)
  EOF
  )"
  ```

- [ ] **Step 5: Merge the PR**

  Run:
  ```bash
  gh pr merge --squash --delete-branch
  ```

  Then pull the updated main locally:
  ```bash
  git checkout main && git pull
  ```

  GitHub Actions will automatically deploy to https://bhartman21.github.io/inkless/ on merge.
