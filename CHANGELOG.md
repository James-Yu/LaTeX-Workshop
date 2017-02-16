# Change Log
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/)
and this project adheres to [Semantic Versioning](http://semver.org/).

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
