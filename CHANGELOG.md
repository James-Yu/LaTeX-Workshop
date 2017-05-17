# Change Log
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/)
and this project adheres to [Semantic Versioning](http://semver.org/).

## [2.3.2] - 2017-05-17
### Changed
- More debug info when killing previous building process upon saving files.

## [2.3.1] - 2017-05-08
### Fixed
- VS Code 1.12 makes pdf-viewer iframe oversize horizontally.

## [2.3.0] - 2017-05-06
### Added
- (#127) Reference intellisense now provide context in completion item details.

## [2.2.1] - 2017-04-25
### Changed
- (#128) User configurable citation intellisense method (inline or browser).
- (#128) Citation browser search-able by authors and citation keys.

## [2.2.0] - 2017-04-25
### Added
- Default keyboard shortcuts for all LaTeX Workshop commands.

## [2.1.4] - 2017-04-17
### Fixed
- (#116) Fix mis-read outputDir config.

## [2.1.3] - 2017-04-17
### Fixed
- (#115) Fix reading wrong outputDir config when creating paths.

## [2.1.2] - 2017-04-17
### Fixed
- (#114) Clean project also clean files in outputDir.
- (#108) Correctly parse bib entries surrounded by quotes.

## [2.1.1] - 2017-04-13
### Fixed
- (#110) Temporarily solve MikTeX chktex return code 1 problem.
- (#104) Support non-pdflatex toolchain in latexmk.

## [2.1.0] - 2017-04-11
### Added
- (#103) Add an `outputDir` config to define the LaTeX output directory.

### Fixed
- (#105) Building multi-root project would always compile the same file.

## [2.0.0] - 2017-04-10
### Added
- (#90) Citation intellisense display item customizable in configurations.
- (#90) A citation browser accessible from Actions or Quick Menu.
- (#93) SyncTeX path now configurable in configurations.
- (#96) Alerts when obsolete configuration items are found.

### Changed
- (#92) Quick Menu items are prepended with `LaTeX Workshop` for easier access.
- (#96) All configuration items are renamed.
  - This is a backward incompatible change. Users are required to re-set their configurations.
- (#96) All commands use `spawn` instead of `exec` for more stable cross-platform experience.

## [1.4.2] - 2017-04-06
### Changed
- (#88) Raw LaTeX log now displays in a separate new tab.
  - Raw log content will refresh in real-time.

## [1.4.1] - 2017-04-05
### Fixed
- (#86) Forward SyncTeX from LaTeX to PDF now works properly.

## [1.4.0] - 2017-04-04
### Added
- (#79) Environments can be autocompleted with `\`.
  - For example, `\begin{align}\n\n\end{align}` will show after typing `\align` or shorter.
- (#81) A quick menu showing all LaTeX Workshop commands.
  - It can be invoked by clicking the status bar item, right click any `LaTeX` file, or using `latex-workshop.actions` command.
- (#84) Add many uni-math symbols to intellisense.

### Changed
- (#81) Clicking status bar item can show the previous status, as well as the quick menu.
- (#81) Some commands are removed in the right click context menu.

## [1.3.0] - 2017-04-03
### Changed
- (#71) Extension now uses `chokidar` to monitor file changes.
  - This change will significantly reduce disk IO when intellisense is frequently triggered.

### Fixed
- (#74) Fix `.tex` extension name not properly removed when replacing `%DOC%` in toolchains.

## [1.2.2] - 2017-03-31
### Added
- (#68) `ChkTeX` code action for `12: interword space`.

### Fixed
- (#67) `ChkTeX` ignores configuration and lints upon changing active editor.

## [1.2.1] - 2017-03-30
### Fixed
- (#65) Commands with arguments incorrected inserted with `\undefined{args}`.

## [1.2.0] - 2017-03-30
Let's welcome @jabooth who joins the development of LaTeX Workshop!

### Added
- Auto clean LaTeX project after building LaTeX project, or on demand.
- (#60) Many `ChkTeX` diagnostics have code actions. See readme for more.
- (#62) Add back the default LaTeX commands to intellisense.

### Changed
- (#57) Now `ChkTeX` reads from stdin instead of temp files.

## [1.1.2] - 2017-03-29
### Changed
- (#51) Now diagnostics show message sources.
- (#56) Real-time `ChkTeX` on active editor.

### Fixed
- (#54) Web page url different from the one with tab view.

## [1.1.1] - 2017-03-28
### Changed
- (#45) `ChkTeX` diagnostics separated from `LateX` ones.
- (#46) Now save all editors when building.
- A higher-resolution new icon.

### Fixed
- (#44) `.tex` files with dot in the file name cannot get recognized in `\input`.
- (#48) Use `.bib` entry whitelist to avoid issues by unformal entries.

## [1.1.0] - 2017-03-27
### Added
- (#39) LaTeX linting with `ChkTeX`.

### Changed
- Web page title will show `[disconnected]` when the websocket is closed.
  - Such web pages cannot communicate with the extension. Thus will not auto refresh or SyncTeX.
- Temp files created by log parser will be automatically deleted. In most cases.

## [1.0.2] - 2017-03-26
### Fixed
- (#38) Cope with typical language ids.

## [1.0.1] - 2017-03-26
### Fixed
- (#37) Extension failed to activate with language id `latex` (instead of `LaTeX`).

## [1.0.0] - 2017-03-26
- Completely re-write the extension with more extensibility.
  - Original features should be inherited. If not, please submit issues.

## [0.2.20] - 2017-03-19
### Changed
- (#29) Status bar item auto-fold after two seconds.
- (#29) Status bar item does not display on non-tex files.

## [0.2.19] - 2017-03-16
### Fixed
- (#30) Not able to parse multiple bib files in a same command.

### Changed
- (#28) Use icons provided by @bartosz-antosik. Many thanks!

## [0.2.18] - 2017-03-15
### Changed
- (#21) Use icon instead of text in editor title to save space.

## [0.2.17] - 2017-03-14
### Fixed
- (#25) Bibliography file in subfolders now supports autocompletion.

## [0.2.16] - 2017-02-28
### Added
- (#18) Compile from active editor command.

## [0.2.15] - 2017-02-19
### Changed
- (#14) Do not pop log panel with no log messages.

## [0.2.14] - 2017-02-16
### Changed
- (#13) Remove quote autocomplete.

## [0.2.13] - 2017-02-06
### Changed
- (#10) ENTER after backslash new creates a new line.

## [0.2.12] - 2017-02-04
### Changed
- (#9) Disable Mac OS binary check.

## [0.2.11] - 2017-01-29
### Added
- A lovely icon in status bar to toggle compile-on-save feature.
  - The configuration `latex-workshop.compile_on_save` is used to set the initial state.

### Changed
- The compilation logging pattern.

## [0.2.10] - 2017-01-27
### Fixed
- SyncTeX use full path with `\.\` in Windows.

## [0.2.9] - 2017-01-27
### Fixed
- (#8) SyncTeX use full path and the constructed uri is different. Credited to `jccha`.
- (#8) OSX CMD+Click not working for reverse SyncTeX. Credited to `jccha`.

## [0.2.8] - 2017-01-27
### Changed
- Now configurations will take effect without reload except `compiler`.

### Fixed
- (#7) SyncTeX fails when main document is not in root. Credited to `Andersw88`.
- Compile twice if unsaved and click compile from context menu.

## [0.2.7] - 2017-01-26
### Changed
- Way of presenting latex log results.

### Fixed
- Unable to parse `file.tex:123: latex error` type error.

## [0.2.6] - 2017-01-17
### Fixed
- Missing requirejs dependency leading to failed extension initialization.

## [0.2.5] - 2017-01-17
### Added
- LaTeX log parser. Output to LaTeX Workshop output channel.

### Fixed
- Ignoring double curly brackets in parsed bibtex items to avoid spamming.

## [0.2.4] - 2017-01-17
### Changed
- Better bibTeX autocompletion
  - Now provide title, publication, and authors in citation autocomplete.
  - If parser failed, fallback to original implementation.
- Add curly brackets after multiple commands.
  - User can go on typing for inner content autocompletion.

## [0.2.3] - 2017-01-15
### Changed
- Revert back to manual CompletionItem and SnippetString creation for auto-completion.
  - Users should experience a better auto-completion feature.

## [0.2.2] - 2017-01-13
### Fixed
- (#4) Compile throw error on sending websocket message with undefined client.

## [0.2.1] - 2017-01-12
### Changed
- In browser PDF preview URL.
  - User should not experience any feature changes

### Removed
- Several useless PDF viewer buttons: open, download, presentation mode.

## [0.2.0] - 2017-01-11
### Added
- In browser PDF preview.
  - Find it in right-click menu!

### Changed
- Server-client communication model.
- Refractor the context menu.

## [0.1.11] - 2017-01-09
### Fixed
- PDF viewer scroll to (0,0) after clicking compilation but before refreshing.

## [0.1.10] - 2017-01-09
### Changed
- (#2) Use HTML data to store PDF position before compilation.
  - The PDF position can be restored after compilation instead of previous SyncTeX method.

## [0.1.9] - 2017-01-05
### Added
- More colorization with textmate tex grammar.

## [0.1.8] - 2017-01-05
### Fixed
- Command autocomplete not working.

## [0.1.7] - 2017-01-05
### Added
- Colorization using textmate grammar file.

### Changed
- Wildcard reference autocomplete for any commands with `ref`.

## [0.1.6] - 2017-01-04
### Added
- `latex-workshop.main_document` config to explicitly define the main document.
  - If set with some value, the auto-detection is disabled.
  - If set `null`, auto-detection will use the old logic as in 0.1.5.

### Changed
- Snippet for \begin command. Now the \end command will also be appended.

## [0.1.5] - 2017-01-04
### Added
- Right click text editor for compile option.

### Changed
- (#1) Compile and preview will search for main tex document for processing.
  - Main document is determined by "\begin{document}" string.
  - If the current active file has this string, it is set to the main document.
  - Otherwise, all .tex files under the root of the opened folder is checked. The first one with this string is the main document.
  - Tests needed.

## [0.1.4] - 2017-01-04
### Changed
- Now PDF viewer will try to use synctex to scroll to tex editor cursor position upon refresh.

## [0.1.3] - 2017-01-03
### Changed
- Use code snippet for all latex backslash commands.
  - Now autocomplete will show when the first letter is input after the backslash.
  - Now backslash autocomplete can use tab to navigate to proper positions for contents.

### Fixed
- \ref won't develop autocomplete recommends when .aux file is not generated.

## [0.1.2] - 2017-01-03
### Changed
- Synchronously read related files when developing citation and reference autocompletes.
  - The original acynchronous pattern will miss the latest changes.
  - If the autocomplete reaction speed is greatly influenced in large files, this change may be reverted.

## [0.1.1] - 2017-01-01
### Added
- An extension icon.

### Fixed
- In some cases \cite and \ref won't develop autocomplete recommends.

## [0.1.0] - 2017-01-01
### Added
- Compile LaTeX to PDF
- Live Preview
- SyncTex
- Autocomplete on backslash, citation, and reference
- Configuration

## [0.0.1] - [0.0.12]
- Merged into version 0.1.0.
