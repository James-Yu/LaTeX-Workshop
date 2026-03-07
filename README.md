# TeX Workspace Secure

Independent VS Code extension fork: <https://github.com/thinksyncs/LaTeX-Secure-Workspace>

TeX Workspace Secure is a security-hardened fork of LaTeX Workshop for [Visual Studio Code](https://code.visualstudio.com/).

## Security-Focused Feature Set for Enterprise Use Cases

Privacy-first, with no telemetry and no profile-enrichment lookups.

Security-first maintenance, including active review, dependency hygiene, and corrective updates.

This fork prioritizes a smaller and more auditable extension surface over broad feature parity.

The target use case is enterprise-oriented TeX authoring and build workflows with an emphasis on local authoring and compilation over preview, real-time collaboration, and convenience integrations.

For a concise summary of the security measures in this fork and the risks they are intended to reduce, see [Security Hardening Summary](./docs/security-hardening.md) or [in Japanese](./docs/security-hardening.ja.md).

Security review is performed with enterprise use cases in mind, but adopters remain responsible for their own validation, deployment decisions, and incident handling.

> [!IMPORTANT]
> This package is an independent fork and is not the official `James-Yu.latex-workshop` marketplace release.
> For compatibility, settings and command IDs still use the existing `latex-workshop.*` prefix.

The project aims to preserve the core features needed for LaTeX typesetting in Visual Studio Code while keeping practical compatibility with existing LaTeX Workshop setups.

This secure build is intentionally narrower than upstream. It focuses on core authoring and compilation workflows and keeps only a minimal local tab-based PDF viewer with one-way refresh. It does not include Live Share integration, the internal PDF preview server, browser viewer workflows, SyncTeX, texdoc, external formatter/linter execution, auto build, external build commands, or custom recipe/tool execution.

This extension supports Restricted Mode on a limited basis. In restricted mode, editing, navigation, log viewing, and the local tab-based PDF viewer remain available, but build, clean, kill, and reveal-output commands stay disabled until the workspace is trusted.

The upstream wiki remains useful for shared concepts such as recipes, root file handling, snippets, and IntelliSense, but parts of it document features that are disabled in this build.

This project won't be successful without contributions from the community, especially from the current and past key contributors:

- Jerome Lelong [`@jlelong`](https://github.com/jlelong)
- Takashi Tamura [`@tamuratak`](https://github.com/tamuratak)
- Tecosaur [`@tecosaur`](https://github.com/tecosaur)
- James Booth [`@jabooth`](https://github.com/jabooth)

Thank you so much!

**Note that the latest version of TeX Workspace Secure requires at least VSCode `1.96.0` (December 2024 or later).**

## Manual

The upstream manual is maintained as a [wiki](https://github.com/James-Yu/LaTeX-Workshop/wiki).

For this secure build, the following upstream pages are the most relevant:

- [Installation and basic settings](https://github.com/James-Yu/LaTeX-Workshop/wiki/Install)
- [Compiling](https://github.com/James-Yu/LaTeX-Workshop/wiki/Compile)
- [Intellisense](https://github.com/James-Yu/LaTeX-Workshop/wiki/Intellisense)
- [Snippets and shortcuts](https://github.com/James-Yu/LaTeX-Workshop/wiki/Snippets)
- [Hovering features](https://github.com/James-Yu/LaTeX-Workshop/wiki/Hover)
- [Environments](https://github.com/James-Yu/LaTeX-Workshop/wiki/Environments)
- [VS Code Remote Development](https://github.com/James-Yu/LaTeX-Workshop/wiki/Remote)
- [FAQ and common issues](https://github.com/James-Yu/LaTeX-Workshop/wiki/FAQ)

The following upstream sections do not describe this build accurately because those features are disabled, reduced, or intentionally not exposed here:

- Viewing beyond the minimal local tab viewer, and all SyncTeX workflows
- Linting commands and external formatter integration
- Texdoc, word count, Live Share, and math preview panel workflows
- Any workflow that depends on the internal PDF preview server or browser viewer

## Supported Editing and Build Features

This secure build keeps a focused subset of the upstream editing and compilation workflow.

- Build LaTeX documents manually with the fixed internal build recipe.
- Resolve the build root with a fixed internal policy and always run manual build and clean against the resolved main root file.
- Write build outputs and auxiliary files into the resolved root file directory, rather than honoring workspace-controlled output-path overrides.
- Open the built PDF in a local VS Code tab using the bundled viewer assets, with one-way refresh from the extension to the viewer.
- IntelliSense for citations, labels, commands, environments, document classes, packages, and input paths.
- Snippets and text-wrapping commands for common LaTeX authoring tasks.
- Automatic `\item` continuation and other core editing conveniences that stay within the editor process.
- LaTeX log parsing and diagnostics shown directly in VS Code.
- Hover-based assistance for supported LaTeX constructs.

## Not Included In This Secure Build

The following upstream features are intentionally disabled or not exposed in this fork.

- Live Share integration.
- Auto build and other file-watcher-triggered build execution.
- Custom recipes, custom tools, and external build commands.
- Workspace-controlled overrides for build root selection and output or auxiliary directory selection in the secure execution path.
- The internal PDF preview server, browser viewer workflow, reverse or bidirectional viewer messaging, and SyncTeX viewer paths.
- Texdoc, word count, and math preview panel workflows.
- External formatter or linter execution paths.
- Other convenience integrations that expand the executable or network-facing surface without being required for core authoring and compilation.

## GitHub

The code for this extension is available on GitHub at: https://github.com/thinksyncs/LaTeX-Secure-Workspace

## Support This Project

- Star this project on GitHub and Visual Studio Marketplace.
- Leave feedback or usage reports.
- Thank the maintainers and community for their work.

## License

This repository is distributed under the MIT License.

It is an independent fork of LaTeX Workshop and retains the upstream MIT notice in `LICENSE.txt`.

For fork attribution and notice information, see `NOTICE`.

Some bundled data files or third-party assets may carry their own upstream notices in their respective directories.

<sub>Disclaimer: This fork applies security hardening intended to reduce risk, but it does not guarantee safety or fitness for any particular environment. It is provided as-is under the MIT License, and maintainers do not assume responsibility for adopter validation, deployment decisions, operational use, or incident response.</sub>
