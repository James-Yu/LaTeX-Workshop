# Security Hardening Summary

This document summarizes the principal security measures applied in TeX Workspace Secure and the categories of risk those measures are intended to reduce.

The secure build intentionally narrows the upstream feature set. The goal is not broad feature parity. The goal is a smaller and more auditable extension surface for enterprise-oriented TeX authoring and build workflows.

## What Was Hardened

### 1. Removed collaboration and network-facing runtime features

The secure build disables Live Share integration, the internal PDF preview server, browser-based preview flows, and SyncTeX paths that depended on the internal viewer runtime.

Risk if left enabled:

- Additional network-facing and message-handling surfaces increase the likelihood that parser, webview, or transport defects become security-relevant.
- Internal preview infrastructure expands the trusted computing base beyond core editing and compilation.
- Collaboration and preview features create more opportunities for workspace content to trigger privileged extension behavior.

### 2. Reduced execution of workspace-controlled external tools

The secure build blocks or constrains workspace-scoped overrides for build recipes, tools, and external build commands. It also warns before running workspace-sourced command paths in sensitive execution paths.

Risk if left enabled:

- A repository can define or influence commands that execute arbitrary local binaries or shell arguments when a user builds a document.
- Team-wide settings sync or copied workspace files can normalize unsafe command execution patterns without sufficient visibility.
- The threat model shifts from opening untrusted content to opening content that causes trusted local processes to run.

### 3. Ignored magic-command comments in the secure build

The secure build ignores magic command comments that would otherwise alter tool or recipe selection from inside TeX source files.

Risk if left enabled:

- A document can steer the extension toward different executables or build flows than the operator expects.
- Reviewers may inspect settings files but miss executable-selection logic embedded directly in TeX comments.
- Command provenance becomes harder to audit in controlled environments.

### 4. Disabled non-essential command surfaces

The secure build removes or disables texdoc, word count, math preview panel, external formatter integration, auto-lint execution, and other convenience features that invoke additional tooling or UI subsystems.

Risk if left enabled:

- Each additional command surface adds parsing, process-spawning, or document-processing behavior that must be reviewed and maintained.
- Convenience features often execute in the background or on save, which reduces operator visibility.
- Security review effort is diluted across features that are not required for core authoring and compilation.

### 5. Removed `vsls`-specific handling and legacy compatibility paths

The secure build removes Live Share URI handling and trims compatibility code that only existed to support disabled collaboration or viewer workflows.

Risk if left enabled:

- Legacy code paths can remain reachable even after the primary feature appears disabled.
- Cross-feature compatibility logic is harder to reason about and easier to miss during review.

### 6. Tightened development dependency hygiene

Development dependencies were updated and targeted overrides were added where needed so local audit checks pass cleanly and release tooling remains functional.

Risk if left unmaintained:

- Known issues in development tooling can affect local packaging, CI pipelines, or maintainer workstations.
- Security posture drifts over time even when production dependencies remain stable.

## Security Posture Goals

TeX Workspace Secure is intended to retain the parts of the extension that remain valuable in enterprise TeX authoring:

- editing support
- completion and snippets
- root-file detection
- build orchestration
- log parsing

It intentionally avoids treating feature parity as the default goal when parity would preserve unnecessary attack surface.

## What This Does Not Guarantee

- It does not make arbitrary TeX toolchains safe by itself.
- It does not replace workstation hardening, sandboxing, or enterprise policy controls.
- It does not eliminate the need to validate the LaTeX executables, scripts, and packages installed on the host.
- It does not guarantee that every upstream dependency or future change is risk-free.

## Recommended Deployment Assumptions

- Use approved TeX toolchains and keep them patched.
- Treat workspace files as untrusted until reviewed.
- Prefer centrally managed settings over workspace-provided command customization.
- Review any future change that reintroduces preview servers, browser viewers, collaboration features, or automatic process execution.