# Visual Studio Code LaTeX Workshop Extension

[![version](https://vsmarketplacebadge.apphb.com/version/James-Yu.latex-workshop.svg)](https://marketplace.visualstudio.com/items?itemName=James-Yu.latex-workshop)
[![installs](https://vsmarketplacebadge.apphb.com/installs-short/James-Yu.latex-workshop.svg)](https://marketplace.visualstudio.com/items?itemName=James-Yu.latex-workshop)
[![rating](https://vsmarketplacebadge.apphb.com/rating-short/James-Yu.latex-workshop.svg)](https://marketplace.visualstudio.com/items?itemName=James-Yu.latex-workshop)
[![license](https://img.shields.io/badge/license-MIT-brightgreen.svg)](https://raw.githubusercontent.com/James-Yu/LaTeX-Workshop/master/LICENSE.txt)

[![Average time to resolve an issue](https://isitmaintained.com/badge/resolution/James-Yu/LaTeX-Workshop.svg)](https://github.com/James-Yu/LaTeX-Workshop/issues)
[![Percentage of issues still open](https://isitmaintained.com/badge/open/James-Yu/LaTeX-Workshop.svg)](https://github.com/James-Yu/LaTeX-Workshop/issues)


LaTeX Workshop is an extension for [Visual Studio Code](https://code.visualstudio.com/), aiming to provide all-in-one features and utilities for LaTeX typesetting with Visual Studio Code.

## Features

- Build LaTeX (including BibTeX) to PDF automatically on save.
- View PDF on-the-fly (in VS Code or browser).
- Direct and reverse SyncTeX. Click to jump between location in `.tex` source and PDF and vice versa.
- Intellisense, including completions for bibliography keys (`\cite{}`) and labels (`\ref{}`).
- Syntax highlighting (colorized code) for `.tex` / `.bib` files and more.
- LaTeX log parser, with errors and warnings in LaTeX build automatically reported in VS Code.
- Real-time linting of LaTeX with ChkTeX to pick up common LaTeX issues as you type.
  - Code Actions (automatic fixes) are offered for many issues found by ChkTeX.
- LaTeX file formatting.
- Auto close LaTeX environments: just call _LaTeX Workshop: Close current environment_ from the **Command Palette**. You can easily assign a shortcut to this action through the **Keyboard Shortcuts** menu, search for `latex-workshop.close-env`.
- Navigate from `\begin/\end` to the corresponding `\end/\begin`: while on the `begin` or `end` keyword, call _LaTeX Workshop: Navigate to matching begin/end_ from the **Command Palette**. To define a shortcut, search for `latex-workshop.navigate-envpair` in the **Keyboard Shortcuts** menu.
- Add a multicursor on the current environment name: call _LaTeX Workshop: Multicursor selection of the current environment name_ from the **Command Palette**. For this command to work, the cursor must be strictly between `\begin{...}` and `\end{...}`. To define a shortcut, search for `latex-workshop.select-envname` in the **Keyboard Shortcuts** menu. Repeated calls result in selecting the outer environments.


## Requirements

- LaTeX distribution in system PATH. For example, [TeX Live](https://www.tug.org/texlive/).
  - Please note [MikTeX](https://miktex.org/) does not ship with SyncTeX. See [this link](http://tex.stackexchange.com/questions/338078/how-to-get-synctex-for-windows-to-allow-atom-pdf-view-to-synch#comment877274_338117) for a possible solution.
- _Optional_: [Set your LaTeX recipe](#recipe) (LaTeX Workshop should just work out of the box for users with `latexmk` installed).
- _Optional_: Install [ChkTeX](http://www.nongnu.org/chktex) to lint LaTeX projects.
- _Optional_: Install [latexindent.pl](https://github.com/cmhughes/latexindent.pl) for formatting support if it is not provided by your LaTeX distribution.

## Installation

Installing LaTeX Workshop is simple. You can find it in [Visual Studio Code Marketplace](https://marketplace.visualstudio.com/items?itemName=James-Yu.latex-workshop), or simply run `ext install latex-workshop` in VS Code Quick Open (`ctrl`/`cmd` + `P`).

Alternatively, you can check out this repository and copy it to the VS Code local extensions folder:
- Windows `%USERPROFILE%\.vscode\extensions`
- Mac/Linux `$HOME/.vscode/extensions`

## Usage

- Open a `.tex` file, right click to build, SyncTeX, or show all features.
  - For a complete list, select `LaTeX Workshop Actions` entry.
- For reverse SyncTeX from PDF to LaTeX, `ctrl`/`cmd` + left mouse click in the PDF.
- Alternatively, VS Code commands are provided in VS Code Command Palette (`ctrl`/`cmd` + `shift` + `P`).
  - Type `latex workshop` to show all related commands.
- To view an arbitrary PDF file, right click on the file in the explorer and select `View PDF`.

## FAQ
### <a name="recipe"></a>LaTeX recipe?
LaTeX recipe refers to a sequence/array of commands which LaTeX Workshop will execute sequentially when building LaTeX projects. It is set in `File`>`Preferences`>`Settings`>`latex-workshop.latex.recipes`. You can create multiple recipes with different tools. Each recipe is an object in the configuration list, consists of a `name` field and a list of `tools` to be invoked in the recipe.

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

| Placeholder | Replaced by             |
| ----------- | ----------------------- |
| `%DOC%`     | The LaTeX root file path and name without `.tex` extension |
| `%DOCFILE%` | The LaTeX root file name without `.tex` extension |
| `%DIR%` | The LaTeX root file path |

Alternatively, you can also set your commands without the placeholder, just like what you may input in a terminal.
As most LaTeX compiler accepts root file name without extension, `%DOC%` and `%DOCFILE%` do not include `.tex` extension. Meanwhile, `texify` requires the extension. So in the above tool `%DOC%` and `.tex` are concatenated for completeness.

### From toolchain to recipe?
If you have a custom toolchain defined in pre-4.0 versions of LaTeX Workshop, you may want to migrate the existing configuration to the new recipe system. This can be easily done with the following steps:
1. Create a tool in `latex-workshop.latex.tools` for each step in the original toolchain.
2. Name the tools with the `name` field.
3. Create a recipe in `latex-workshop.latex.recipes` with its `tools` field set as a list of the defined `names` in Step 2.
4. Name the recipe with the `name` field.
5. Happy typesetting.

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
[Code Spellchecker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker) did a great job. Users may also find other extensions better alternatives, e.g., [Spell Right](https://marketplace.visualstudio.com/items?itemName=ban.spellright) and [LanguageTool](https://marketplace.visualstudio.com/items?itemName=adamvoss.vscode-languagetool). Especially the last one is credited for its multi-lingual support.

### Build on save?

By default, the extension compiles the project upon saving any tex files. If you want to disable this feature, setting the configuration item `latex-workshop.latex.autoBuild.onSave.enabled` to `false` will do.

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
