# Security Hardening Summary

This document summarizes the principal security measures applied in TeX Workspace Secure and the categories of risk those measures are intended to reduce.

The secure build intentionally narrows the upstream feature set. The goal is not broad feature parity. The goal is a smaller and more auditable extension surface for enterprise-oriented TeX authoring and build workflows.

The scores below are CVSS-like prioritization estimates for this extension's threat model. They are not official CVSS scores.

These measures are intended to reduce risk, not to guarantee safety. Adopters remain responsible for validation, deployment, operational use, and incident response in their own environments.

## Key Risks And Mitigations

### 1. Removed collaboration and network-facing runtime features

CVSS-like score: 7.4 / 10

Risk:

- Additional network-facing and message-handling surfaces increase the likelihood that parser, webview, or transport defects become security-relevant.
- Internal preview infrastructure expands the trusted computing base beyond core editing and compilation.
- Collaboration and preview features create more opportunities for workspace content to trigger privileged extension behavior.

Mitigation:

The secure build disables Live Share integration, the internal PDF preview server, browser-based preview flows, reverse or bidirectional viewer control paths, and SyncTeX paths that depended on the internal viewer runtime. In place of the old preview stack, it keeps only a local tab-based PDF viewer with one-way refresh from the extension host to the webview.

Restricted Mode remains available on a limited basis. In restricted mode, the local tab viewer and viewer refresh remain available because they stay inside the bundled webview path, while build, clean, kill, and reveal-output commands remain disabled until trust is granted.

### 2. Reduced execution of workspace-controlled external tools

CVSS-like score: 8.6 / 10

Risk:

- A repository can define or influence commands that execute arbitrary local binaries or shell arguments when a user builds a document.
- Team-wide settings sync or copied workspace files can normalize unsafe command execution patterns without sufficient visibility.
- The threat model shifts from opening untrusted content to opening content that causes trusted local processes to run.

Mitigation:

The secure build disables auto build, ignores custom recipes and custom tools, and ignores external build commands. Manual compilation is limited to a fixed internal recipe so workspace content and settings cannot switch the build command path.

It also uses a fixed internal root-resolution policy for secure build and clean commands, always executes against the resolved main root file, and writes both PDF output and auxiliary files to the resolved root file directory instead of honoring workspace-controlled output-path overrides.

### 3. Ignored magic-command comments in the secure build

CVSS-like score: 7.7 / 10

Risk:

- A document can steer the extension toward different executables or build flows than the operator expects.
- Reviewers may inspect settings files but miss executable-selection logic embedded directly in TeX comments.
- Command provenance becomes harder to audit in controlled environments.

Mitigation:

The secure build ignores magic command comments that would otherwise alter root, tool, or recipe selection from inside TeX source files. Secure build and viewer flows no longer change behavior based on `%!TEX root` or build-control magic comments embedded in documents.

### 4. Disabled non-essential command surfaces

CVSS-like score: 5.8 / 10

Risk:

- Each additional command surface adds parsing, process-spawning, or document-processing behavior that must be reviewed and maintained.
- Convenience features often execute in the background or on save, which reduces operator visibility.
- Security review effort is diluted across features that are not required for core authoring and compilation.

Mitigation:

The secure build removes or disables texdoc, word count, math preview panel, auto-lint execution, and other convenience features that invoke additional tooling or UI subsystems. Remaining formatter and linter executable overrides are no longer silently taken from workspace settings; they require an explicit confirmation prompt before execution.

### 5. Removed `vsls`-specific handling and legacy compatibility paths

CVSS-like score: 6.1 / 10

Risk:

- Legacy code paths can remain reachable even after the primary feature appears disabled.
- Cross-feature compatibility logic is harder to reason about and easier to miss during review.

Mitigation:

The secure build removes Live Share URI handling and trims compatibility code that only existed to support disabled collaboration or viewer workflows.

### 6. Tightened development dependency hygiene

CVSS-like score: 4.9 / 10

Risk:

- Known issues in development tooling can affect local packaging, CI pipelines, or maintainer workstations.
- Security posture drifts over time even when production dependencies remain stable.

Mitigation:

Development dependencies were updated and targeted overrides were added where needed so local audit checks pass cleanly and release tooling remains functional.

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
- Treat Restricted Mode as a review state: viewing and editor assistance remain available, but trust is still required before build, clean, kill, or reveal-output operations are enabled.
- Review any future change that reintroduces preview servers, browser viewers, collaboration features, or automatic process execution.