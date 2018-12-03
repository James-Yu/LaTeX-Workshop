# Visual Studio Code LaTeX Workshop Extension

[![version](https://vsmarketplacebadge.apphb.com/version/James-Yu.latex-workshop.svg)](https://marketplace.visualstudio.com/items?itemName=James-Yu.latex-workshop)
[![installs](https://vsmarketplacebadge.apphb.com/installs-short/James-Yu.latex-workshop.svg)](https://marketplace.visualstudio.com/items?itemName=James-Yu.latex-workshop)
[![rating](https://vsmarketplacebadge.apphb.com/rating-short/James-Yu.latex-workshop.svg)](https://marketplace.visualstudio.com/items?itemName=James-Yu.latex-workshop)
[![license](https://img.shields.io/badge/license-MIT-brightgreen.svg)](https://raw.githubusercontent.com/James-Yu/LaTeX-Workshop/master/LICENSE.txt)

[![Average time to resolve an issue](https://isitmaintained.com/badge/resolution/James-Yu/LaTeX-Workshop.svg)](https://github.com/James-Yu/LaTeX-Workshop/issues)
[![Percentage of issues still open](https://isitmaintained.com/badge/open/James-Yu/LaTeX-Workshop.svg)](https://github.com/James-Yu/LaTeX-Workshop/issues)


LaTeX Workshop is an extension for [Visual Studio Code](https://code.visualstudio.com/), aiming to provide all-in-one features and utilities for LaTeX typesetting with Visual Studio Code.

One million downloads! This project won't be successful without contributions from the community, especially project maintainers Jerome Lelong [`@jlelong`](https://github.com/jlelong), James Booth [`@jabooth`](https://github.com/jabooth), and all code [contributors](https://github.com/James-Yu/LaTeX-Workshop/graphs/contributors)! Thank you!

## Features

- Build LaTeX (including BibTeX) to PDF automatically on save (see [Build on Save](#build-on-save))

  <img src="https://github.com/James-Yu/LaTeX-Workshop/raw/master/demo_media/build.gif" alt="build process gif" height="20px">

- View PDF on-the-fly (in VS Code or browser).

  <img src="https://github.com/James-Yu/LaTeX-Workshop/raw/master/demo_media/preview.gif" alt="demo of preview feature" height="220px">

- Direct and reverse SyncTeX. Click to jump between location in `.tex` source and PDF and vice versa.

  <img src="https://github.com/James-Yu/LaTeX-Workshop/raw/master/demo_media/synctex.gif" alt="demo of SyncTeX" height="220px">

- Intellisense, including completions for bibliography keys (`\cite{}`) and labels (`\ref{}`).

  <img src="https://github.com/James-Yu/LaTeX-Workshop/raw/master/demo_media/ref.gif" alt="intellisense demo" height="80px">

- Syntax highlighting (colorized code) for `.tex` / `.bib` files and more (`.cls`, `.dtx`, `.ltx`, `.sty`)
- LaTeX log parser, with errors and warnings in LaTeX build automatically reported in VS Code.

  <img src="https://github.com/James-Yu/LaTeX-Workshop/raw/master/demo_media/errors.png" alt="error reporting demo" height="125px">

- Real-time linting of LaTeX with ChkTeX to pick up common LaTeX issues as you type.
  - Code Actions (automatic fixes) are offered for many issues found by ChkTeX.
  - Auto load `.chktexrc` configure in the following order: 1. manually configured `-l` setting in `chktex.args`; 2. `.chktexrc` file (if exists) in the same folder as the main LaTeX file; 3. `.chktexrc` file (if exists) at the project root folder.

  <img src="https://github.com/James-Yu/LaTeX-Workshop/raw/master/demo_media/chktex.gif" alt="auto \item demo" height="90px">
- LaTeX file formatting.
- Acting on environments
  - To auto close LaTeX environments, call _LaTeX Workshop: Close current environment_ from the **Command Palette** (command function `latex-workshop.close-env`).
  - To navigate from `\begin/\end` to the corresponding `\end/\begin`, while on the `begin` or `end` keywords, call _LaTeX Workshop: Navigate to matching begin/end_ from the **Command Palette** (command `latex-workshop.navigate-envpair`).
  - To select the current environment name, call _LaTeX Workshop: Select the current environment name_ from the **Command Palette** (command `latex-workshop.select-envname`). For this command to work, the cursor must be strictly between `\begin{...}` and `\end{...}`. Repeated calls result in selecting the outer environment. **Note**: this function _does not_ work with the [Vim](https://github.com/VSCodeVim/Vim) extension.
  - To add a multi-cursor to the current environment name, call _LaTeX Workshop: Add a multi-cursor to the current environment name_ from the **Command Palette** (command `latex-workshop.multicursor-envname`). For this command to work, the cursor must be strictly between `\begin{...}` and `\end{...}`. Repeated calls result in selecting the outer environments.
  - To surround selected text with an environment, call _LaTeX Workshop: Surround/wrap selection with \\begin{}...\\end{}_ from the **Command Palette** (command `latex-workshop.wrap-env`). A multi-cursor is added inside the braces, to insert the environment name.
- [Snippets](snippets/snippets-doc.md)
  - A lot of LaTeX commands can be typed using snippets starting in `\`, then type part of the command to narrow the search.

    <img src="https://github.com/James-Yu/LaTeX-Workshop/raw/master/demo_media/subparagraph.gif" alt="auto \item demo" height="80px">

  - \[**Deprecated**\] Surround some selected text with a LaTeX command by pressing `\` after selecting some text. A new menu pops up to select the command. This feature is enabled when `latex-workshop.intellisense.surroundCommand.enabled` is set to `true`, default is `false`.
  - Surround some selected text with a LaTeX command using <kbd>ctrl</kbd>+<kbd>l</kbd>, <kbd>ctrl</kbd>+<kbd>w</kbd> (<kbd>⌘</kbd>+<kbd>l</kbd>, <kbd>⌘</kbd>+<kbd>w</kbd> on Mac). A new menu pops up to select the command. This works with multi selections. The former approach using `\` has been deprecated.

    <img src="https://github.com/James-Yu/LaTeX-Workshop/raw/master/demo_media/wrap.gif" alt="wrap demo" height="140px">

  - We also provide a few other snippets mechanisms
    - Greek letters are obtained as `@` + `letter`. Some letters have variants, which are available as `@v` + `letter`. See [here](snippets/snippets-doc.md#greek-letters).

        <img src="https://github.com/James-Yu/LaTeX-Workshop/raw/master/demo_media/greek letter.gif" alt="greek letters demo" height="20px">

    - Common environments can be obtained by `BXY` where `XY` are the first two letters of the environment name, eg. `BEQ` gives the `equation` environment. If you want the star version of the environment, use `BSXX`, eg. `BSEQ` gives the `equation*` environment. See [here](snippets/snippets-doc.md#environments).

        <img src="https://github.com/James-Yu/LaTeX-Workshop/raw/master/demo_media/BSAL snippet.gif" alt="BSAL demo" height="55px">
    - Common font commands can be obtained by `FXY` where `XY` are the last two letters of the font command name, eg. `FIT` gives `\textit{}`. See [here](snippets/snippets-doc.md#font-commands).

        <img src="https://github.com/James-Yu/LaTeX-Workshop/raw/master/demo_media/FBF snippet.gif" alt="FBF demo" height="20px">
    - Many other maths symbols can be obtained with the `@` prefix. See [here](snippets/snippets-doc.md#mathematical-symbols).

      <img src="https://github.com/James-Yu/LaTeX-Workshop/raw/master/demo_media/frac.gif" alt="\frac shortcut demo" height="20px">
      <img src="https://github.com/James-Yu/LaTeX-Workshop/raw/master/demo_media/int.gif" alt="\int shortcut demo" height="20px">
- [Shortcuts](SHORTCUT.md)
  - In addition snippets, there are shortcuts that provided by the extension that allow you to easily format text (and one or two other things).

    <img src="https://github.com/James-Yu/LaTeX-Workshop/raw/master/demo_media/emph.gif" alt="\emph{} demo" height="20px">
- When the current line starts with `\item` or `\item[]`, hitting `Enter` automatically adds a newline starting in the same way. For a better handling of the last item, hitting `Enter` on a line only containing `\item` or `\item[]` actually deletes the content of the line. The `alt+Enter` is bind to the standard newline command. This automatic insertion of `\item` can be deactivated by setting `latex-workshop.bind.enter.key` to `false`.

    <img src="https://github.com/James-Yu/LaTeX-Workshop/raw/master/demo_media/auto item.gif" alt="auto \item demo" height="80px">

- Preview on hover. Hovering over the start tag of a math environment causes a mathjax preview to pop up.

    <img src="https://github.com/James-Yu/LaTeX-Workshop/raw/master/demo_media/hover.gif" alt="auto \item demo" height="120px">

## Requirements

- LaTeX distribution in system PATH. For example, [TeX Live](https://www.tug.org/texlive/).
  - Please note [MikTeX](https://miktex.org/) does not ship with SyncTeX. See [this link](http://tex.stackexchange.com/questions/338078/how-to-get-synctex-for-windows-to-allow-atom-pdf-view-to-synch#comment877274_338117) for a possible solution.
- `latexmk` is required for the default recipe for building LaTeX projects to work. Alternatively, you can [set up your own LaTeX recipe](#recipe).
- _Optional_: Install [ChkTeX](http://www.nongnu.org/chktex) to lint LaTeX projects.
- _Optional_: Install [latexindent.pl](https://github.com/cmhughes/latexindent.pl) for formatting support if it is not provided by your LaTeX distribution.

## Installation

Installing LaTeX Workshop is simple. You can find it in [Visual Studio Code Marketplace](https://marketplace.visualstudio.com/items?itemName=James-Yu.latex-workshop), or simply run `ext install latex-workshop` in VS Code Quick Open (`ctrl`/`cmd` + `P`).

## Usage

- Open a `.tex` file, right click to build, SyncTeX, or show all features.
  - For a complete list, select `LaTeX Workshop Actions` entry.
- For reverse SyncTeX from PDF to LaTeX, `ctrl`/`cmd` + left mouse click in the PDF.
- Alternatively, VS Code commands are provided in VS Code Command Palette (`ctrl`/`cmd` + `shift` + `P`).
  - Type `latex workshop` to show all related commands.
- To view an arbitrary PDF file, just click on the file in the explorer.

## Known Extension Incompatibilities
The following extensions are known to cause issues when active at the same time, namely a significant delay when using the Enter key.

 - [Spell Right](https://marketplace.visualstudio.com/items?itemName=ban.spellright)
 - [Brackets Pair Colorizer 2](https://marketplace.visualstudio.com/items?itemName=CoenraadS.bracket-pair-colorizer-2)
 - [Prettify Symbols Mode](https://marketplace.visualstudio.com/items?itemName=siegebell.prettify-symbols-mode)

## FAQ

### <a name="recipe"></a>LaTeX recipe?

LaTeX recipe refers to a sequence/array of commands which LaTeX Workshop will execute sequentially when building LaTeX projects. It is set in `File`>`Preferences`>`Settings`>`latex-workshop.latex.recipes`. By default, LaTeX Workshop includes two basic recipes: one simply running the `latexmk` command, and an other one running the typical sequence of commands `pdflatex` → `bibtex` → `pdflatex` → `pdflatex`.

You can create multiple recipes with different tools. Each recipe is an object in the configuration list, consisting of a `name` field and a list of `tools` to be invoked in the recipe.

The `tools` in recipes can be defined in `latex-workshop.latex.tools`, in which each command is a `tool`. Each tool is an object consists of a `name`, a `command` to be spawned, and its arguments (`args`). To include a tool in a recipe, the tool's `name` should be included in the recipe's `tools` list.

When building the project, the first recipe is used. You can compile with another recipe by command `latex-workshop.recipes`. By default [`latexmk`](http://personal.psu.edu/jcc8/software/latexmk/) is used. This tool is bundled in most LaTeX distributions, and requires perl to execute. For non-perl users, the following `texify` toolchain from MikTeX may worth a try:
```
"latex-workshop.latex.recipes": [{
  "name": "texify",
  "tools": [
    "texify"
  ]
}],
"latex-workshop.latex.tools": [{
  "name": "texify",
  "command": "texify",
  "args": [
    "--synctex",
    "--pdf",
    "--tex-option=\"-interaction=nonstopmode\"",
    "--tex-option=\"-file-line-error\"",
    "%DOC%.tex"
  ]
}]
```
As you may notice, there is a mystic `%DOC%` in the arguments. Symbols surrounded by `%` are placeholders, which are replaced with its representing string on-the-fly. LaTeX Workshop registers the following placeholders:

| Placeholder | Replaced by                                                                         |
| ----------- | ----------------------------------------------------------------------------------- |
| `%DOC%`     | The LaTeX root file path and name without `.tex` extension                          |
| `%DOCFILE%` | The LaTeX root file name without `.tex` extension                                   |
| `%DIR%`     | The LaTeX root file path                                                            |
| `%TMPDIR%`  | A temporary folder for storing ancillary files, and will be auto-removed when exit. |

Alternatively, you can also set your commands without the placeholder, just like what you may input in a terminal.
As most LaTeX compiler accepts root file name without extension, `%DOC%` and `%DOCFILE%` do not include `.tex` extension. Meanwhile, `texify` requires the extension. So in the above tool `%DOC%` and `.tex` are concatenated for completeness.

### From toolchain to recipe?

If you have a custom toolchain defined in pre-4.0 versions of LaTeX Workshop, you may want to migrate the existing configuration to the new recipe system. This can be easily done with the following steps:
1. Create a tool in `latex-workshop.latex.tools` for each step in the original toolchain.
2. Name the tools with the `name` field.
3. Create a recipe in `latex-workshop.latex.recipes` with its `tools` field set as a list of the defined `names` in Step 2.
4. Name the recipe with the `name` field.
5. Happy typesetting.

### <a name="problem-pane"></a>Problem Panel and `--max-print-lines`

LaTeX compilers usually produce hard wrapped log messages, which makes them really hard to parse. To hopefully deal with complex log messages, we have decided to rely on non hard wrapped log messages. This can be achieved either

- by setting the environment variable `max_print_line`. This is automatically done within the extension and works for the TeXLive distribution.
- by adding the `--max-print-line` option to the compilers. This is automatically done within the extension and works for the MiKTeX distribution. Unfortunately, some compilers such as `lualatex` or `xelatex` do not understand this option and may therefore fail. To disable the automatic addition of this option, set `latex-workshop.latex.option.maxPrintLine.enabled` to `false`.

Note that when log messages are hard wrapped, the _Problems Pane_ may be messed up.

### Root file?

While it is fine to write all contents in one `.tex` file, it is common to split things up for simplicity. For such LaTeX projects, the file with `\begin{document}` is considered as the root file, which serves as the entry point to the project. LaTeX Workshop intelligently finds the root file when a new document is opened, the active editor is changed, or any LaTeX Workshop command is executed.

To find the root file, LaTeX Workshop will follow the steps below, stopping whenever one is found:
1. **Magic comment** `% !TEX root = relative/or/absolute/path/to/root/file.tex`. If such comments exist in the currently active editor, the referred file is set as root.
2. **Self check** If current active editor contains `\begin{document}`, it is set as root.
3. **Root directory check** LaTeX Workshop iterates through all `.tex` files in the root folder of the workspace. The first one with `\begin{document}` is set as root.

If no root file is found, most of the features in LaTeX Workshop will not work.

### Magic comments?

LaTeX Workshop supports both `% !TEX root` and `% !TEX program` magic comments. The former is used to define the root file, while the latter helps select compiler program. However, it is advised to use the recipe system instead of magic program to define the building process, since the latter is only implemented for backward compatibility.

For `% !TEX program` magic comment, its arguments are defined in `latex-workshop.latex.magic.args`:
```
"latex-workshop.latex.magic.args": [
  "-synctex=1",
  "-interaction=nonstopmode",
  "-file-line-error",
  "%DOC%"
]
```
Suppose there is a line `% !TEX program = xelatex` in the root file. Upon building the project, LaTeX Workshop will parse the root file and figure out that `xelatex` should be used. Arguments are included to invoke the compiler.

When using `% !TEX program` with bibliographies, a `bib` compiler must be defined with `% !BIB program` comment, e.g., `% !BIB program = bibtex`. Otherwise the extension will only run one-pass compilation with the specified LaTeX compiler.

### Spell check?

[Code Spellchecker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker) did a great job. Users may also find other extensions better alternatives, e.g., [LanguageTool](https://marketplace.visualstudio.com/items?itemName=adamvoss.vscode-languagetool) credited for its multi-lingual support.

### Build on save?

By default, the extension compiles the project upon saving any tex files. If you want to disable this feature, setting the configuration item `latex-workshop.latex.autoBuild.onSave.enabled` to `false` will do.

Note that the formatting program `latexindent` actually modifies the file on disk. So if you use `editor.formatOnPaste: true`, a build will be triggered each time you paste something. More importantly, if you set `editor.formatOnSave: true` along with `latex-workshop.latex.autoBuild.onSave.enable: true`, you may trigger two builds at a time. All this can lead to messing up your file, hence we advise not to use `latex-workshop.latex.autoBuild.onSave.enable: true` with any other auto formatting options for LaTeX filetypes.

### Synctex after build?

When using the internal PDF viewer, you can make it automatically jump after build to the location pointed out by the tex file. If you want to enable this feature, setting the configuration item `latex-workshop.synctex.afterBuild.enabled` to `true` will do.

### Internal viewer keybindings

The PDF viewer provided with extension internally uses [pdf.js](https://github.com/mozilla/pdf.js). The keybindings support by pdf.js are documented [here](https://github.com/mozilla/pdf.js/wiki/Frequently-Asked-Questions#faq-shortcuts).


### Docker?

From version 5.3.0 there is an experimental implementation on docker support following the idea of [@Arxisos](https://github.com/Arxisos). You can set `latex-workshop.docker.enabled` to `true` to use `tianon/latex`. It is advised that the image is 'pre-'pulled.

[@Arxisos](https://github.com/Arxisos) created [snippets](https://github.com/Arxisos/LaTex-Workshop-Docker) for LaTeX binaries in docker, and [@lippertmarkus](https://github.com/lippertmarkus) had another [short description](https://github.com/James-Yu/LaTeX-Workshop/issues/302) on how to use docker with LaTeX Workshop.

## GitHub

The code for this extension is available on github at: https://github.com/James-Yu/LaTeX-Workshop

## Like this work?

- :smile: Star this project on GitHub and Visual Studio Marketplace
- :blush: Leave a comment
- :relaxed: [Spare me some coffee via Paypal](https://www.paypal.me/JamesJQYu)

## License

[MIT](https://opensource.org/licenses/MIT)
