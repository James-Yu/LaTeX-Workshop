# LaTeX Workshop: build status in editor title bar

## Goal
Show build success/failure ("OK"/"ERROR") next to the existing Build and View PDF
icons in the editor title bar (top-right of the tab area), not just in the status
bar — so it's visible even in Zen Mode (which hides the status bar by default).

## Background / things ruled out
- VS Code Zen Mode hides the status bar by default. Setting `"zenMode.hideStatusBar": false`
  keeps the existing status-bar tick visible in Zen Mode, but doesn't satisfy the
  "next to Build/View in the title bar" ask.
- Extensions cannot add items to the native OS/VS Code **menu bar** (File/Edit/View/...).
  That's fixed chrome, not extensible for arbitrary status content.
- The `editor/title` area only renders **codicon glyphs** on its visible buttons,
  not arbitrary text. So a literal "OK"/"ERROR" label can't appear inline — only
  as a tooltip on hover. The realistic equivalent is `$(check)` / `$(error)` icons,
  same visual language the status bar already uses.

## Current implementation (as of the `master` branch, James-Yu/LaTeX-Workshop)
- `src/utils/logger.ts`:
  - Line 7: `const STATUS_ITEM = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, -10000)`
    — single module-level status bar item.
  - Line 118: `function refreshStatus(icon, color, message, severity, build)` — the one
    function every build path calls to update `STATUS_ITEM.text/.color/.tooltip`.
- `src/compile/build.ts` calls `logger.refreshStatus(...)` at ~6 call sites:
  - `refreshStatus('check', 'statusBar.foreground', 'Build succeeded.')` — success
  - `refreshStatus('sync~spin', 'statusBar.foreground', undefined, undefined, ' ' + step)` — in progress
  - `refreshStatus('x', 'errorForeground', ...)` — error
  All of these funnel through the single `refreshStatus()` function, so the status
  logic doesn't need to be touched in multiple places.
- `package.json` → `contributes.menus["editor/title"]` (existing, verbatim):
  ```json
  "editor/title": [
    {
      "when": "editorLangId =~ /^latex$|^latex-expl3$|^doctex$|^rsweave$|^jlweave$|^pweave$/",
      "command": "latex-workshop.view",
      "group": "navigation@2"
    },
    {
      "when": "editorLangId =~ /^latex$|^latex-expl3$|^doctex$|^rsweave$|^jlweave$|^pweave$/ && !virtualWorkspace",
      "command": "latex-workshop.build",
      "group": "navigation@1"
    }
  ]
  ```
- Precedent for state-driven `when` clauses already exists in this codebase: the
  activity bar views are gated on a `latex-workshop:enabled` context key. Adding
  a `latex-workshop:buildStatus` context key follows the same convention.

## Plan (3 small edits, ~30-35 lines total)

1. **`package.json`**
   - Add two commands:
     ```json
     { "command": "latex-workshop.buildStatusOk", "title": "Build OK", "category": "LaTeX Workshop", "icon": "$(check)" },
     { "command": "latex-workshop.buildStatusError", "title": "Build Error", "category": "LaTeX Workshop", "icon": "$(error)" }
     ```
   - Add two `editor/title` entries (e.g. `navigation@0`, placed before the existing
     `build`/`view` pair), each gated on the same `editorLangId` regex plus a new
     context key:
     ```json
     { "when": "editorLangId =~ /^latex$|.../ && latex-workshop:buildStatus == ok", "command": "latex-workshop.buildStatusOk", "group": "navigation@0" },
     { "when": "editorLangId =~ /^latex$|.../ && latex-workshop:buildStatus == error", "command": "latex-workshop.buildStatusError", "group": "navigation@0" }
     ```

2. **`src/utils/logger.ts`** — inside `refreshStatus()`, add one line alongside the
   existing status bar update:
   ```ts
   void vscode.commands.executeCommand('setContext', 'latex-workshop:buildStatus',
     icon === 'check' ? 'ok' : icon === 'x' ? 'error' : 'progress')
   ```

3. **Register the two new commands** (likely in `src/core/commands.ts`) — wire them
   to something useful on click, e.g. open the LaTeX Workshop output log. ~5-10 lines.

## Build / packaging overhead (the real cost, not the diff)
- Clone repo, `npm install`, `npm run build` (or `npm run compile`).
- Test via Extension Development Host (F5), or package with `vsce package` into a
  `.vsix` and install it locally.
- Installing the patched `.vsix` means uninstalling/disabling the Marketplace
  version, and **reapplying the patch after every upstream update** — this ongoing
  maintenance is the actual complexity, not the code change itself.

## Status
Implemented on branch `claude/implement-plan-uhi7en`:
- `package.json`: added `buildStatusOk`/`buildStatusError` commands + `editor/title`
  entries gated on `latex-workshop:buildStatus`.
- `src/utils/logger.ts`: `refreshStatus()` now also sets the `latex-workshop:buildStatus`
  context (`ok`/`error`/`progress`).
- `src/core/commands.ts` / `src/main.ts`: registered the two new commands (they open
  the compiler log on click).
- `package.nls.json`: added titles for the two new commands.

`npx tsc --noEmit` and `eslint` pass on the changed files.
