# Visual Studio Code LaTeX Workshop Extension

LaTeX Workshop is an extension for [Visual Studio Code](https://code.visualstudio.com/), aiming to provide all-in-one features and utilities for latex typesetting with Visual Studio Code. 

## Features

- Compile LaTeX with BibTeX to PDF
- Preview PDF on-the-fly (in VSCode or browser)
- Support direct and reverse SyncTex
- Autocomplete
- Colorize
- Log parser

## Requirements

- LaTeX distribution in system PATH. For example, [TeX Live](https://www.tug.org/texlive/).
  - MikTeX does not ship with SyncTeX. See [this link](http://tex.stackexchange.com/questions/338078/how-to-get-synctex-for-windows-to-allow-atom-pdf-view-to-synch#comment877274_338117) for a possible solution.

## Installation

Installing LaTeX Workshop is simple. You can find it in [Visual Studio Code Marketplace](https://marketplace.visualstudio.com/items?itemName=James-Yu.latex-workshop), or simply run `ext install latex-workshop` in VS Code Quick Open (Ctrl/Cmd+P).

Alternatively, you can check out this repository and copy it to the VS Code local extensions folder:
- Windows `%USERPROFILE%\.vscode\extensions`
- Mac/Linux `$HOME/.vscode/extensions`

## Usage

- Open a `.tex` file, right click and many features have menu entries there.
- For reverse SyncTeX from PDF to LaTeX, `ctrl`/`cmd` + mouse left click.
- Alternatively, VS Code commands are provided as follows

## Commands

- `latex-workshop.build`: Build LaTeX project to PDF using LaTeX toolchain.
- `latex-workshop.view`: Open a web browser window to view the PDF file.
- `latex-workshop.tab`: Open a VS Code tab to view the PDF file.
- `latex-workshop.synctex`: Direct synctex from cursor position.

## Contributing

- Fork it.
- Do something.
- Pull request.
- Thank you and have some beer.

## License

[MIT](https://opensource.org/licenses/MIT)
