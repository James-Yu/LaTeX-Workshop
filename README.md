# TeX Workspace Secure

Independent VS Code extension fork: <https://github.com/thinksyncs/LaTeX-Workshop>

TeX Workspace Secure is a security-hardened fork of LaTeX Workshop for [Visual Studio Code](https://code.visualstudio.com/).

## Security-Focused Feature Set for Enterprise Use Cases

Privacy-first, with no telemetry and no profile-enrichment lookups.

Security-first maintenance, including active review, dependency hygiene, and corrective updates.

This fork prioritizes a smaller and more auditable extension surface over broad feature parity.

The target use case is enterprise-oriented TeX authoring and build workflows, where predictable execution paths matter more than preview, collaboration, or convenience integrations.

For a concise summary of the security measures in this fork and the risks they are intended to reduce, see [Security Hardening Summary](./docs/security-hardening.md) or [セキュリティ対策サマリー](./docs/security-hardening.ja.md).

Security review is performed with enterprise use cases in mind, but adopters remain responsible for their own validation, deployment decisions, and incident handling.

> [!IMPORTANT]
> This package is an independent fork and is not the official `James-Yu.latex-workshop` marketplace release.
> For compatibility, settings and command IDs still use the existing `latex-workshop.*` prefix.

The project aims to preserve the core features needed for LaTeX typesetting in Visual Studio Code while keeping practical compatibility with existing LaTeX Workshop setups.

This secure build is intentionally narrower than upstream. It focuses on core authoring and compilation workflows and does not include Live Share integration, the internal PDF preview server/viewer, SyncTeX, texdoc, or external formatter/linter execution.

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

The following upstream sections do not describe this build accurately because those features are disabled or intentionally not exposed here:

- Viewing and SyncTeX
- Linting commands and external formatter integration
- Texdoc, word count, Live Share, and math preview panel workflows
- Any workflow that depends on the internal PDF preview server or browser viewer

## Supported Editing and Build Features

This is a representative subset of the editing and compilation capabilities retained in the secure build.

- Build LaTeX (including BibTeX) to PDF automatically on save.

  <img src="https://github.com/James-Yu/LaTeX-Workshop/raw/master/demo_media/build.gif" alt="build process gif" height="20px">

- Intellisense, including completions for bibliography keys (`\cite{}`) and labels (`\ref{}`).

  <img src="https://github.com/James-Yu/LaTeX-Workshop/raw/master/demo_media/ref.gif" alt="intellisense demo" height="80px">

- LaTeX log parser, with errors and warnings in LaTeX build automatically reported in VS Code.

  <img src="https://github.com/James-Yu/LaTeX-Workshop/raw/master/demo_media/errors.png" alt="error reporting demo" height="125px">

- [Snippets](https://github.com/James-Yu/LaTeX-Workshop/wiki/Snippets)
  - A lot of LaTeX commands can be typed using snippets starting in `\`, then type part of the command to narrow the search.

    <img src="https://github.com/James-Yu/LaTeX-Workshop/raw/master/demo_media/subparagraph.gif" alt="auto \item demo" height="80px">

  - Surround some selected text with a LaTeX command using <kbd>ctrl</kbd>+<kbd>l</kbd>, <kbd>ctrl</kbd>+<kbd>w</kbd> (<kbd>⌘</kbd>+<kbd>l</kbd>, <kbd>⌘</kbd>+<kbd>w</kbd> on Mac). A new menu pops up to select the command. This works with multi selections. The former approach using `\` has been deprecated.

    <img src="https://github.com/James-Yu/LaTeX-Workshop/raw/master/demo_media/wrap.gif" alt="wrap demo" height="140px">

  - We also provide a few other suggestion mechanisms
    - Greek letters are obtained as `@` + `letter`. Some letters have variants, which are available as `@v` + `letter`. See [here](https://github.com/James-Yu/LaTeX-Workshop/wiki/Intellisense#inserting-greek-letters).

        <img src="https://github.com/James-Yu/LaTeX-Workshop/raw/master/demo_media/greek letter.gif" alt="greek letters demo" height="20px">

    - Common environments can be obtained by `BXY` where `XY` are the first two letters of the environment name, eg. `BEQ` gives the `equation` environment. If you want the star version of the environment, use `BSXX`, eg. `BSEQ` gives the `equation*` environment. See [here](https://github.com/James-Yu/LaTeX-Workshop/wiki/Intellisense#Handy-mathematical-helpers).

        <img src="https://github.com/James-Yu/LaTeX-Workshop/raw/master/demo_media/BSAL snippet.gif" alt="BSAL demo" height="55px">
    - Common font commands can be obtained by `FXY` where `XY` are the last two letters of the font command name, eg. `FIT` gives `\textit{}`. See [here](https://github.com/James-Yu/LaTeX-Workshop/wiki/Snippets#font-commands-and-snippets).

        <img src="https://github.com/James-Yu/LaTeX-Workshop/raw/master/demo_media/FBF snippet.gif" alt="FBF demo" height="20px">
    - Many other maths symbols can be obtained with the `@` prefix. See [here](https://github.com/James-Yu/LaTeX-Workshop/wiki/Snippets#Handy-mathematical-helpers).

      <img src="https://github.com/James-Yu/LaTeX-Workshop/raw/master/demo_media/frac.gif" alt="\frac shortcut demo" height="20px">
      <img src="https://github.com/James-Yu/LaTeX-Workshop/raw/master/demo_media/int.gif" alt="\int shortcut demo" height="20px">
- [Shortcuts](https://github.com/James-Yu/LaTeX-Workshop/wiki/Snippets#font-commands-and-snippets)
  - In addition to snippets, there are shortcuts provided by the extension that allow you to easily format text (and one or two other things).

    <img src="https://github.com/James-Yu/LaTeX-Workshop/raw/master/demo_media/emph.gif" alt="\emph{} demo" height="20px">
- When the current line starts with `\item` or `\item[]`, hitting `Enter` automatically adds a newline starting in the same way. For a better handling of the last item, hitting `Enter` on a line only containing `\item` or `\item[]` actually deletes the content of the line. The `alt+Enter` is bind to the standard newline command. This automatic insertion of `\item` can be deactivated by setting `latex-workshop.bind.enter.key` to `false`.

    <img src="https://github.com/James-Yu/LaTeX-Workshop/raw/master/demo_media/auto item.gif" alt="auto \item demo" height="80px">

- [Preview on hover](https://github.com/James-Yu/LaTeX-Workshop/wiki/Hover#previewing-equations). Hovering over the start tag of a math environment causes a mathjax preview to pop up.

    <img src="https://github.com/James-Yu/LaTeX-Workshop/raw/master/demo_media/hover.gif" alt="equation hover demo" height="120px">

## GitHub

The code for this extension is available on GitHub at: https://github.com/thinksyncs/LaTeX-Workshop

## Support This Project

- Star this project on GitHub and Visual Studio Marketplace.
- Leave feedback or usage reports.
- Thank the maintainers and community for their work.

## License

[MIT](https://opensource.org/licenses/MIT)
