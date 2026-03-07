# Security Triage: serialize-javascript (dev-only)

## Summary

- Advisory: GHSA-5c6j-r48x-rmvq
- Affected package: `serialize-javascript`
- Current path: `mocha -> serialize-javascript`
- Scope: `devDependencies` only

## Impact assessment

- Runtime extension artifact (VSIX): **not affected** (package is not shipped).
- Extension runtime in user environment: **not affected**.
- Development/CI/local test environments: **affected surface exists**.

## Current constraint

- Dependabot reports `security_update_not_possible`.
- Upstream currently constrains to `serialize-javascript@^6.0.2` via `mocha`.

## Decision

- Accept as **managed residual risk** (non-blocking for runtime release).
- Track in issue and re-evaluate periodically.

## Re-evaluation triggers

1. `mocha` dependency range changes.
2. Quarterly dependency review.
3. Lockfile refresh or test stack refactor.

## Mitigations in place

- CI guardrails for telemetry SDK introduction and shell execution expansion.
- Guardrail to block `pull_request_target` introduction.
- Least-privilege workflow permissions by default.