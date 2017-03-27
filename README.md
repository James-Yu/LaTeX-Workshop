# Visual Studio Code LaTeX Workshop Extension

LaTeX Workshop is an extension for [Visual Studio Code](https://code.visualstudio.com/), aiming to provide all-in-one features and utilities for latex typesetting with Visual Studio Code. 

## Features

- Build LaTeX with BibTeX to PDF
- View PDF on-the-fly (in VSCode or browser)
- Direct and reverse SyncTex
- Intellisense
- Colorize
- Log parser
- Linter

## Requirements

- LaTeX distribution in system PATH. For example, [TeX Live](https://www.tug.org/texlive/).
  - MikTeX does not ship with SyncTeX. See [this link](http://tex.stackexchange.com/questions/338078/how-to-get-synctex-for-windows-to-allow-atom-pdf-view-to-synch#comment877274_338117) for a possible solution.
- [Set LaTeX toolchain](#toolchain).

## Installation

Installing LaTeX Workshop is simple. You can find it in [Visual Studio Code Marketplace](https://marketplace.visualstudio.com/items?itemName=James-Yu.latex-workshop), or simply run `ext install latex-workshop` in VS Code Quick Open (Ctrl/Cmd+P).

Alternatively, you can check out this repository and copy it to the VS Code local extensions folder:
- Windows `%USERPROFILE%\.vscode\extensions`
- Mac/Linux `$HOME/.vscode/extensions`

## Usage

- Open a `.tex` file, right click and many features have menu entries there.
- For reverse SyncTeX from PDF to LaTeX, `ctrl`/`cmd` + mouse left click.
- Alternatively, VS Code commands are provided as follows:
  - `latex-workshop.build`: Build LaTeX project to PDF using LaTeX toolchain.
  - `latex-workshop.view`: Open a web browser window to view the PDF file.
  - `latex-workshop.tab`: Open a VS Code tab to view the PDF file.
  - `latex-workshop.synctex`: Direct synctex from cursor position.

## FAQ
### <a name="toolchain"></a>LaTeX toolchain?
LaTeX toolchain refers to a sequence/array of commands which LaTeX Workshop will execute sequentially when building LaTeX projects. It is set in `File`>`Preferences`>`Settings`>`latex-workshop.toolchain`. By default [`latexmk`](http://personal.psu.edu/jcc8/software/latexmk/) is used. For non-perl users, the following `texify` toolchain may worth a try:
```
[ "texify --synctex --tex-option=\"-interaction=nonstopmode -file-line-error\" --pdf %DOC%" ]
```

LaTeX toolchain must always be defined as a JSON array, even if there is only one command to execute. For multiple commands, each one is represented by a string in the array.

The placeholder `%DOC%` in all strings will be replaced by the quoted LaTeX root file name on-the-fly. Alternatively, you can also set your commands without the placeholds, just like what you may input in a terminal.

### Root file?
While it is fine to write all contents in one `.tex` file, it is possible to split things up for simplicity. For such LaTeX projects, the file with `\begin{document}` is considered as the root file, which serves as the entry point to the project. LaTeX Workshop intelligently finds the root file when a new document is opened, the active editor is changed, or any LaTeX Workshop command is executed. The extension will follow the below steps to find the root file, terminates whenever one is found:
- Magic comment: `% !TeX root = relative/or/absolute/path/to/root/file.tex`. If such comments exist in the currently active editor, the referred file is set as root.
- Self check. If current active editor contains `\begin{document}`, it is set as root.
- Root directory check. LaTeX Workshop iterate through all `.tex` files in the root folder of the workspace. The first one with `\begin{document}` is set as root.
If no root file is found, most of the features in LaTeX Workshop will not work.

## Contributing

- Fork it.
- Do something.
- Pull request.
- Thank you and have some beer.

## License

[MIT](https://opensource.org/licenses/MIT)
