# Visual Studio Code LaTeX Workshop Extension

[![version](https://vsmarketplacebadge.apphb.com/version/James-Yu.latex-workshop.svg)](https://marketplace.visualstudio.com/items?itemName=James-Yu.latex-workshop)
[![downloads](https://vsmarketplacebadge.apphb.com/downloads-short/James-Yu.latex-workshop.svg)](https://vsmarketplacebadge.apphb.com/downloads-short/James-Yu.latex-workshop.svg)
[![installs](https://vsmarketplacebadge.apphb.com/installs-short/James-Yu.latex-workshop.svg)](https://marketplace.visualstudio.com/items?itemName=James-Yu.latex-workshop)
[![rating](https://vsmarketplacebadge.apphb.com/rating-short/James-Yu.latex-workshop.svg)](https://marketplace.visualstudio.com/items?itemName=James-Yu.latex-workshop)
[![license](https://img.shields.io/badge/license-MIT-brightgreen.svg)](https://raw.githubusercontent.com/James-Yu/LaTeX-Workshop/master/LICENSE.txt)

[![Average time to resolve an issue](https://isitmaintained.com/badge/resolution/James-Yu/LaTeX-Workshop.svg)](https://github.com/James-Yu/LaTeX-Workshop/issues)
[![Percentage of issues still open](https://isitmaintained.com/badge/open/James-Yu/LaTeX-Workshop.svg)](https://github.com/James-Yu/LaTeX-Workshop/issues)

[![TeX Live on Windows](https://github.com/James-Yu/LaTeX-Workshop/workflows/TeX%20Live%20on%20Windows/badge.svg)](https://github.com/James-Yu/LaTeX-Workshop/actions?query=workflow%3A%22TeX+Live+on+Windows%22)
[![TeX Live on macOS](https://github.com/James-Yu/LaTeX-Workshop/workflows/TeX%20Live%20on%20macOS/badge.svg)](https://github.com/James-Yu/LaTeX-Workshop/actions?query=workflow%3A%22TeX+Live+on+macOS%22)
[![TeX Live on Linux](https://github.com/James-Yu/LaTeX-Workshop/workflows/TeX%20Live%20on%20Linux/badge.svg)](https://github.com/James-Yu/LaTeX-Workshop/actions?query=workflow%3A%22TeX+Live+on+Linux%22)

LaTeX Workshop is an extension for [Visual Studio Code](https://code.visualstudio.com/), aiming to provide core features for LaTeX typesetting with Visual Studio Code.

This project won't be successful without contributions from the community, especially from the current and past key contributors:

- Jerome Lelong [`@jlelong`](https://github.com/jlelong)
- Takashi Tamura [`@tamuratak`](https://github.com/tamuratak)
- Tecosaur [`@tecosaur`](https://github.com/tecosaur)
- James Booth [`@jabooth`](https://github.com/jabooth)

Thank you so much!

**Note that the latest version of LaTeX-Workshop requires at least VSCode `1.53.2`.**

## Manual

The manual of the extension is maintained as a [wiki](https://github.com/James-Yu/LaTeX-Workshop/wiki)

### Table of Contents

- [Home](https://github.com/James-Yu/LaTeX-Workshop/wiki/Home)
- [Installation and basic settings](https://github.com/James-Yu/LaTeX-Workshop/wiki/Install)
  - [Requirements](https://github.com/James-Yu/LaTeX-Workshop/wiki/Install#requirements)
  - [Installation](https://github.com/James-Yu/LaTeX-Workshop/wiki/Install#installation)
  - [Setting PATH environment variable](https://github.com/James-Yu/LaTeX-Workshop/wiki/Install#setting-path-environment-variable)
  - [Settings](https://github.com/James-Yu/LaTeX-Workshop/wiki/Install#settings)
  - [Usage](https://github.com/James-Yu/LaTeX-Workshop/wiki/Install#usage)
    - [Supported languages](https://github.com/James-Yu/LaTeX-Workshop/wiki/Install#supported-languages)
  - [Using Docker](https://github.com/James-Yu/LaTeX-Workshop/wiki/Install#using-docker)
  - [Using WSL](https://github.com/James-Yu/LaTeX-Workshop/wiki/Install#using-wsl)
- [Compiling](https://github.com/James-Yu/LaTeX-Workshop/wiki/Compile)
  - [Multi file projects](https://github.com/James-Yu/LaTeX-Workshop/wiki/Compile#Multi-File-Projects)
  - [Building the document](https://github.com/James-Yu/LaTeX-Workshop/wiki/Compile#building-the-document)
  - [Building a `.jnw` file](https://github.com/James-Yu/LaTeX-Workshop/wiki/Compile#building-a-jnw-file)
  - [Building a `.rnw` file](https://github.com/James-Yu/LaTeX-Workshop/wiki/Compile#building-a-rnw-file)
  - [Terminating the current compilation](https://github.com/James-Yu/LaTeX-Workshop/wiki/Compile#terminating-the-current-compilation)
  - [Auto build LaTeX](https://github.com/James-Yu/LaTeX-Workshop/wiki/Compile#auto-build-latex)
  - [Cleaning generated files](https://github.com/James-Yu/LaTeX-Workshop/wiki/Compile#cleaning-generated-files)
  - [LaTeX recipes](https://github.com/James-Yu/LaTeX-Workshop/wiki/Compile#latex-recipes)
  - [External build command](https://github.com/James-Yu/LaTeX-Workshop/wiki/Compile#external-build-command)
  - [Magic comments](https://github.com/James-Yu/LaTeX-Workshop/wiki/Compile#magic-comments)
  - [Catching errors and warnings](https://github.com/James-Yu/LaTeX-Workshop/wiki/Compile#catching-errors-and-warnings)
- [Linting](https://github.com/James-Yu/LaTeX-Workshop/wiki/Linters)
- [Viewing & SyncTeX](https://github.com/James-Yu/LaTeX-Workshop/wiki/View)
  - [Internal PDF viewer](https://github.com/James-Yu/LaTeX-Workshop/wiki/View#internal-pdf-viewer)
    - [Invert mode](https://github.com/James-Yu/LaTeX-Workshop/wiki/View#invert-mode)
  - [SyncTeX](https://github.com/James-Yu/LaTeX-Workshop/wiki/View#synctex)
  - [External PDF viewer](https://github.com/James-Yu/LaTeX-Workshop/wiki/View#external-pdf-viewer)
    - [Using SyncTeX with an external viewer](https://github.com/James-Yu/LaTeX-Workshop/wiki/View#using-synctex-with-an-external-viewer)
- [Formatting](https://github.com/James-Yu/LaTeX-Workshop/wiki/Format)
  - [LaTeX files](https://github.com/James-Yu/LaTeX-Workshop/wiki/Format#LaTeX-files)
  - [Bibtex files](https://github.com/James-Yu/LaTeX-Workshop/wiki/Format#Bibtex-files)
- [Intellisense](https://github.com/James-Yu/LaTeX-Workshop/wiki/Intellisense)
  - [Citations](https://github.com/James-Yu/LaTeX-Workshop/wiki/Intellisense#Citations)
  - [References](https://github.com/James-Yu/LaTeX-Workshop/wiki/Intellisense#References)
  - [Commands](https://github.com/James-Yu/LaTeX-Workshop/wiki/Intellisense#Commands)
  - [Environments](https://github.com/James-Yu/LaTeX-Workshop/wiki/Intellisense#Environments)
  - [Files](https://github.com/James-Yu/LaTeX-Workshop/wiki/Intellisense#files)
  - [Bibtex Files](https://github.com/James-Yu/LaTeX-Workshop/wiki/Intellisense#bibtex-files)
- [Snippets and shortcuts](https://github.com/James-Yu/LaTeX-Workshop/wiki/Snippets)
  - [Environments](https://github.com/James-Yu/LaTeX-Workshop/wiki/Snippets#Environments)
  - [Sectioning](https://github.com/James-Yu/LaTeX-Workshop/wiki/Snippets#Sectioning)
  - [Inserting Greek letters](https://github.com/James-Yu/LaTeX-Workshop/wiki/Snippets#Inserting-Greek-letters)
  - [Handy mathematical snippets](https://github.com/James-Yu/LaTeX-Workshop/wiki/Snippets#Handy-mathematical-snippets)
  - [Font commands](https://github.com/James-Yu/LaTeX-Workshop/wiki/Snippets#Font-commands)
  - [Mathematical font commands](https://github.com/James-Yu/LaTeX-Workshop/wiki/Snippets#Mathematical-font-commands)
  - [Surrounding text](https://github.com/James-Yu/LaTeX-Workshop/wiki/Snippets#surrounding-text)
  - [Miscellaneous actions](https://github.com/James-Yu/LaTeX-Workshop/wiki/Snippets#Miscellaneous-Actions)
- [Hovering and previewing features](https://github.com/James-Yu/LaTeX-Workshop/wiki/Hover)
  - [Documentation of a package](https://github.com/James-Yu/LaTeX-Workshop/wiki/Hover#documentation-of-a-package)
  - [Previewing equations](https://github.com/James-Yu/LaTeX-Workshop/wiki/Hover#previewing-equations)
  - [Previewing graphics](https://github.com/James-Yu/LaTeX-Workshop/wiki/Hover#previewing-graphics)
  - [Previewing citation details](https://github.com/James-Yu/LaTeX-Workshop/wiki/Hover#previewing-citation-details)
  - [Previewing references](https://github.com/James-Yu/LaTeX-Workshop/wiki/Hover#previewing-references)
  - [Documentation of a command](https://github.com/James-Yu/LaTeX-Workshop/wiki/Hover#documentation-of-a-command)
- [Playing with environments](https://github.com/James-Yu/LaTeX-Workshop/wiki/Environments)
  - [Inserting an environment](https://github.com/James-Yu/LaTeX-Workshop/wiki/Environments#inserting-an-environment)
  - [Itemize like environments](https://github.com/James-Yu/LaTeX-Workshop/wiki/Environments#Itemize-like-environments)
  - [Navigating and selecting](https://github.com/James-Yu/LaTeX-Workshop/wiki/Environments#Navigating-and-selecting)
  - [Changing between `\[...\]` and `\begin{}...\end{}`](https://github.com/James-Yu/LaTeX-Workshop/wiki/Environments#changing-between--and-beginend)
  - [Closing the current environment](https://github.com/James-Yu/LaTeX-Workshop/wiki/Environments#Closing-the-current-environment)
  - [Surrounding selection with an environment](https://github.com/James-Yu/LaTeX-Workshop/wiki/Environments#Surrounding-selection-with-an-environment)
- [Extra features](https://github.com/James-Yu/LaTeX-Workshop/wiki/ExtraFeatures)
  - [Structure of the document](https://github.com/James-Yu/LaTeX-Workshop/wiki/ExtraFeatures#structure-of-the-document)
  - [Code folding](https://github.com/James-Yu/LaTeX-Workshop/wiki/ExtraFeatures#code-folding)
  - [Counting words](https://github.com/James-Yu/LaTeX-Workshop/wiki/ExtraFeatures#counting-words)
  - [Literate programming support using LaTeX](https://github.com/James-Yu/LaTeX-Workshop/wiki/ExtraFeatures#Literate-programming-support-using-LaTeX)
- [VS Code Remote Development](https://github.com/James-Yu/LaTeX-Workshop/wiki/Remote)
- [FAQ and common issues](https://github.com/James-Yu/LaTeX-Workshop/wiki/FAQ)

## Features (Taster)

This is not a complete list but rather a preview of some of the coolest features.

- Build LaTeX (including BibTeX) to PDF automatically on save.

  <img src="https://github.com/James-Yu/LaTeX-Workshop/raw/master/demo_media/build.gif" alt="build process gif" height="20px">

- View PDF on-the-fly (in VS Code or browser).

  <img src="https://github.com/James-Yu/LaTeX-Workshop/raw/master/demo_media/preview.gif" alt="demo of preview feature" height="220px">

- Direct and reverse SyncTeX. Click to jump between location in `.tex` source and PDF and vice versa.

  <img src="https://github.com/James-Yu/LaTeX-Workshop/raw/master/demo_media/synctex.gif" alt="demo of SyncTeX" height="220px">

- Intellisense, including completions for bibliography keys (`\cite{}`) and labels (`\ref{}`).

  <img src="https://github.com/James-Yu/LaTeX-Workshop/raw/master/demo_media/ref.gif" alt="intellisense demo" height="80px">

- LaTeX log parser, with errors and warnings in LaTeX build automatically reported in VS Code.

  <img src="https://github.com/James-Yu/LaTeX-Workshop/raw/master/demo_media/errors.png" alt="error reporting demo" height="125px">

  - Linting

  <img src="https://github.com/James-Yu/LaTeX-Workshop/raw/master/demo_media/chktex.gif" alt="auto \item demo" height="90px">

- [Snippets](https://github.com/James-Yu/LaTeX-Workshop/wiki/Snippets)
  - A lot of LaTeX commands can be typed using snippets starting in `\`, then type part of the command to narrow the search.

    <img src="https://github.com/James-Yu/LaTeX-Workshop/raw/master/demo_media/subparagraph.gif" alt="auto \item demo" height="80px">

  - Surround some selected text with a LaTeX command using <kbd>ctrl</kbd>+<kbd>l</kbd>, <kbd>ctrl</kbd>+<kbd>w</kbd> (<kbd>⌘</kbd>+<kbd>l</kbd>, <kbd>⌘</kbd>+<kbd>w</kbd> on Mac). A new menu pops up to select the command. This works with multi selections. The former approach using `\` has been deprecated.

    <img src="https://github.com/James-Yu/LaTeX-Workshop/raw/master/demo_media/wrap.gif" alt="wrap demo" height="140px">

  - We also provide a few other snippets mechanisms
    - Greek letters are obtained as `@` + `letter`. Some letters have variants, which are available as `@v` + `letter`. See [here](https://github.com/James-Yu/LaTeX-Workshop/wiki/Snippets#Inserting-Greek-letters).

        <img src="https://github.com/James-Yu/LaTeX-Workshop/raw/master/demo_media/greek letter.gif" alt="greek letters demo" height="20px">

    - Common environments can be obtained by `BXY` where `XY` are the first two letters of the environment name, eg. `BEQ` gives the `equation` environment. If you want the star version of the environment, use `BSXX`, eg. `BSEQ` gives the `equation*` environment. See [here](https://github.com/James-Yu/LaTeX-Workshop/wiki/Snippets#Environments).

        <img src="https://github.com/James-Yu/LaTeX-Workshop/raw/master/demo_media/BSAL snippet.gif" alt="BSAL demo" height="55px">
    - Common font commands can be obtained by `FXY` where `XY` are the last two letters of the font command name, eg. `FIT` gives `\textit{}`. See [here](https://github.com/James-Yu/LaTeX-Workshop/wiki/Snippets#Mathematical-font-commands).

        <img src="https://github.com/James-Yu/LaTeX-Workshop/raw/master/demo_media/FBF snippet.gif" alt="FBF demo" height="20px">
    - Many other maths symbols can be obtained with the `@` prefix. See [here](https://github.com/James-Yu/LaTeX-Workshop/wiki/Snippets#Handy-mathematical-snippets).

      <img src="https://github.com/James-Yu/LaTeX-Workshop/raw/master/demo_media/frac.gif" alt="\frac shortcut demo" height="20px">
      <img src="https://github.com/James-Yu/LaTeX-Workshop/raw/master/demo_media/int.gif" alt="\int shortcut demo" height="20px">
- [Shortcuts](https://github.com/James-Yu/LaTeX-Workshop/wiki/Snippets#Font-commands)
  - In addition to snippets, there are shortcuts provided by the extension that allow you to easily format text (and one or two other things).

    <img src="https://github.com/James-Yu/LaTeX-Workshop/raw/master/demo_media/emph.gif" alt="\emph{} demo" height="20px">
- When the current line starts with `\item` or `\item[]`, hitting `Enter` automatically adds a newline starting in the same way. For a better handling of the last item, hitting `Enter` on a line only containing `\item` or `\item[]` actually deletes the content of the line. The `alt+Enter` is bind to the standard newline command. This automatic insertion of `\item` can be deactivated by setting `latex-workshop.bind.enter.key` to `false`.

    <img src="https://github.com/James-Yu/LaTeX-Workshop/raw/master/demo_media/auto item.gif" alt="auto \item demo" height="80px">

- [Preview on hover](https://github.com/James-Yu/LaTeX-Workshop/wiki/Hover#previewing-equations). Hovering over the start tag of a math environment causes a mathjax preview to pop up.

    <img src="https://github.com/James-Yu/LaTeX-Workshop/raw/master/demo_media/hover.gif" alt="equation hover demo" height="120px">

## GitHub

The code for this extension is available on github at: https://github.com/James-Yu/LaTeX-Workshop

## Like this work?

- :smile: Star this project on GitHub and Visual Studio Marketplace
- :blush: Leave a comment
- :relaxed: [Spare me some coffee via Paypal](https://www.paypal.me/JamesJQYu)

## License

[MIT](https://opensource.org/licenses/MIT)
