# Change Log

## [10.1.0] - 2024-06-27

### Added
- (#4301) Multi-language support.

### Fixed
- (#4300) Prevent concurrent pdf refresh and queue a refresh if rate-limited.
- (#4303) Support new command macros by `etoolbox`.

## [10.0.0] - 2024-06-24 - Viewer Update

### General
- We revamped the UX experience when working with the built-in PDF viewer.
  - (#4295) Flicker-free PDF refreshing contributed by @quoc-ho
  - (#4292) New page trimming implementation.
  - Upgrade PDF.js to v4.3.136

### Changed
- Now the trimming select UI element is moved to the dropdown menu of viewer.
- Now the config item `latex-workshop.view.pdf.trim` has a new definition and usage.

## [9.21.1] - 2024-06-24

### Fixed
- (#4294) Internal links in pdf viewer do not scroll to position.

## [9.21.0] - 2024-06-23

### Added
- Upgrade pdf.js to v4.2.67.
- Add all package suggestions to repo, let users download.
- Allow more relative paths in `latex.texDirs` and `intellisense.package.dirs`.
- (#4222) Customize docker (or podman) path.
- (#4277) Add a close-env suggestion after `\begin{env}`.

### Changed
- (#4281) Try use `PDFViewerApplication.load` in viewer refresh.
- (#4292) Better viewer trimming.

### Fixed
- Fix a duplicate children parsing bug in caching.
- `\putbib` can also have `\subfix`.
- Avoid included bib circular inclusion.
- When finding root from workspace, we don't care if it is cached or not.

## [9.20.1] - 2024-04-29

### Fixed
- Update grammars.
- (#4215) Add `tkz-euclide` suggestions, update some others
- (#4233) Cache outdir/auxdir per root file.
- (#4239) Use synctex.js for backward sync (CJK-compatible)
- (#4243) Fix WebSocket reconnect mechanism.
- (#4247) Fix racing build-on-save when multiple files are edited.
- (#4252) `intellisense.label.command` should not affect reference parsing.

## [9.20.0] - 2024-04-15

### Added
- (#4194) Add a more accurate rectangle indicator for SyncTeX to PDF.
  - Config `synctex.indicator.enabled` is changed to `synctex.indicator` and now is a string config.

### Changed
- Now calling SyncTeX will prioritize binary over synctex.js.
  - Makes `synctex.synctexjs.enabled` obsolete.

### Fixed
- (#4215) Use `kpsewhich.class.enabled` and `kpsewhich.bibtex.enabled` to control `kpsewhich`.
  - Replaces `kpsewhich.enabled`.
- (#4227) Ignore label defs in `xparse` macros.

## [9.19.2] - 2024-04-04

### Fixed
- Prevent `.aux` and `.out` file changes from triggering auto-build
- (#4207) Cursor tracing in structure works across files with 2+ level differences.
- ($4220) Synctex does not work while using vscode in browser.

## [9.19.1] - 2024-03-12

### Fixed
- `auxdir` is automatically determined from last run recipe.
  - `outdir` also, for testing purpose.
- (#4193) Optional capture pattern for `\subfix` when including `bib` files.
- (#4195) `bib` watcher follows `latex.watch.files.ignore`.
- (#4197) Use BibTeX log parsing rules for its variants.

## [9.19.0] - 2024-03-06

### Added
- (#4173) Add source to warning messages.
- (#4181) Missing reference warnings now located precisely.

### Fixed
- Fix incorrect cursor position in math preview when cursor is at line > 0.
- (#4166) Add deletion polling for non-binary files.
- (#4167) PDF watcher never resets now.
- (#4184) `kpsewhich` caches results.
- (#4184) `kpsewhich.enabled` correctly controls calls to `kpsewhich`.
- (#4188) Cleaning with `latexmk` honors `outdir`.

## [9.18.2] - 2024-02-18

### Fixed
- Hold PDF refresh for 1s after compile.
- Snippet and math preview panels use networked resource.
- (#4156) Store the math tex of references on parsing.
- (#4162) Snippet view can insert on any langID.

## [9.18.1] - 2024-02-14

### Fixed
- (#4134) Add a new config `intellisense.subsuperscript.enabled` to enable/disable sub- and super-script intellisense
  - There is a related feature request in [#4159](https://github.com/James-Yu/LaTeX-Workshop/issues/4159) to be implemented related to this.
- (#4151) Update LaTeX3 completion.
- (#4153) Fix wrong item label in outline for macros and envs in `doctex`.

## [9.18.0] - 2024-01-10

### Added
- (4126) Add intellisense for macros defined by `\NewDocumentCommand`.

### Fixed
- (#4111) Snippet view cannot find proper editor.
- (#4127) Remove macro star when rendering MathJax.
- (#4131) Use `unified-latex-util-to-string` to stringify macro definitions.

## [9.17.0] - 2024-01-02

### Added
- (#4114) Support `\boldsymbol`, `\bm` and other `mathtools` macros in preview.
- (#4118) Sub- and superscript auto-completion.
- (#4119) Enable VIM-like scrolling by shift+J, K, H, L in PDF viewer.

### Fixed
- (#4104) PDF viewer cannot revert to no spread.
- (#4105) Retry MathJax if failed rendering with defined macros.
- (#4116) Use `newcommand` in place of `providecommand` for MathJax.

## [9.16.1] - 2023-12-21

### Fixed
- (#4103) Fix wrong boundary calculation when macros are the last argument in new command definitions.

## [9.16.0] - 2023-12-19

### Added
- Tweak the PDF synctex indicator appearance, less intrusive.
- A new config `view.outline.follow.editor` to control whether scrolling the editor will also reveal corresponding structure items.
- (#4098) SyncTeX after clicking structure item.
  - This behavior is controlled by a new config `view.outline.sync.viewer`.

### Fixed
- (#4045) Use AST to parse new commands for preview.

## [9.15.8] - 2023-12-15

### Fixed
- (#4096) Color options in pdf editor not working since v9.15.1.

## [9.15.7] - 2023-12-13

### Fixed
- (#4093) PDF viewer restores scale value after reload.

## [9.15.6] - 2023-12-13

### Changed
- Update to PDF.js v4.0.269.

### Fixed
- (#4092) PDF reload at file change.

## [9.15.5] - 2023-12-12

### Fixed
- (#4090) Add the missing docker envvar setter.

## [9.15.4] - 2023-12-12

### Fixed
- (#4089) Fix cmap files location in pdfjs-dist.

## [9.15.3] - 2023-12-12

### Changed
- Try esbuild @unified-latex packages to reduce `.vsix` size.

## [9.15.2] - 2023-12-12

### Fixed
- Excessively large `.vsix` package.

## [9.15.1] - 2023-12-12

### Changed
- Engineering changes.
- Hold PDF refresh only when building

### Fixed
- Fix a !LW recipe not found fallback issue.
- (#4063) Parse \item args for env pairs.
- (#4068) Respect `latexmk`+`subfile` when creating output subfolders.
- (#4069) Scan for `label={...}` as the second argument of an environment.
- (#4076) Fail-safe for setting PDF viewer state.
- (#4087) Regain editor focus after view in tab.

## [9.15.0] - 2023-11-16

### Added
- (#3966) Add option to include filename in status bar.

### Fixed
- Update to PDF.js v4.0.189.
- (#4048) Gracefully fail `mkdirSync` during compile.
- (#4052) Viewer refresh checks all steps instead of the last one.
- (#4054) Custom editor follows `tab.editorGroup`.

## [9.14.1] - 2023-10-03

### Fixed
- Updates: cwl, unified, pdfjs.
- (#3962, #4022) Fix frozen hand tool if set in config.
- (#4021) Parse nested @string in bibtex.
- (#4023) Enable keybinds on doctex.

## [9.14.0] - 2023-09-19

### Added
- (#3981) Add a new `synctex.indicator.enabled` config item to control the visibility of the SyncTeX indicator in PDF.
- (#3999) Display missing character warning in the Problems pane.
- (#4017) Show appendix numbering in structure.

### Fixed
- (#3982) Make `\bibliography` accept a multiline argument.
- (#3983) Compute section ranges correctly once nested.
- (#3984) Fix newlines and indentations for BTA and BTB snippets.
- (#4003) Regain focus after creating viewer tab.

## [9.13.4] - 2023-08-06

### Fixed
- (#3978) Correctly parse `\providecommand` commands.
- (#3978) Fix the tab sequence of arguments of new commands.

## [9.13.3] - 2023-07-24

### Fixed
- Use `tab` as the default viewer fallback.

## [9.13.2] - 2023-07-24

### Fixed
- Update to PDF.js v3.8.162.
- Default viewer with `customEditor`.
  - The original mode is renamed to `legacy`.
- (#3973) Tweak structure refresh conditions.


## [9.13.1] - 2023-07-17

### Fixed
- (#3967) `kpsewhich` should be called from the current root or workspace folder.

## [9.13.0] - 2023-07-14

### Added
- (#3961) Add a "custom editor" viewer mode.
- (#3965) Use `kpsewhich` to find package imports defined in `.cls`.

### Changed
- Enable `kpsewhich` by default.

### Fixed
- (#3960) Support `\DeclarePairedDelimiterX(PP)` and `\DeclareRobustCommand`.
- (#3963) Arguments in AST can have labels, envs, and glossaries.

## [9.12.3] - 2023-07-07

### Fixed
- Even faster structuring on projects with a large number of sub-files.
- (#3573) Cache.content can be dirty.
- (#3937) Support globs when updating bib paths.
- (#3943) Hover hint considers package and optional arguments.
- (#3946) Env pair should use dirty content AST.
- (#3947) Macros must have a mandatory argument in order to appear in outline.
- (#3948) Re-implement `mathtools` and `amsopn` new command support.
- (#3950) Child tex wrongly all registered to root.

## [9.12.2] - 2023-06-22

### Fixed
- Very fast cache element parsing.
- Input files do not nest in outline.

## [9.12.1] - 2023-06-21

### Changed
- Update grammar files to https://github.com/jlelong/vscode-latex-basics/releases/tag/v1.5.3

### Fixed
- None blocking cache parsing.
- (#3941) Wrong replace range of browser citation.

## [9.12.0] - 2023-06-19

### Added
- (#3934) Now the content parsing and caching system is based on `unified-latex`.
  - We expect to encounter many issues and bugs. Please feel free to create ones at https://github.com/James-Yu/LaTeX-Workshop/issues after searching.

## [9.11.5] - 2023-06-13

### Fixed
- (#3875,#3914) `onSave` triggers on included bibs and non-TeX children.
- (#3897) Outline and structure won't work if the first section is starred.
- (#3898) When the parameter "latex-workshop.latex.outDir" is defined, the feature from #3890 doesn't work.
- (#3899) When manually close the "View LaTex PDF file", the command "SyncTex from cursor" doesn't open the PDF anymore.
- (#3902) Trimming dropdown menu in PDF viewer sometime overflows.
- (#3905) The structure on the left does not jump on click.
- (#3907) Increase the concurrent LU parser number.
- (#3912) Wrong number of steps in the recipe steps counter.
- (#3922) Trouble with LaTeX parsing related to listings and math mode.

## [9.11.4] - 2023-05-27

### Fixed
- `DOCUMENT_CHANGED` internal event of the extension is not logged.
- (#3890) Open PDF viewer on forward SyncTeX if not already opened.

## [9.11.3] - 2023-05-26

### Added
- (#3895) Revival of #3879 in `v9.11.0`, use `unified-latex` to parse structure.

### Fixed
- Repeatedly refreshing structure view when the view is active.

## [9.11.2] - 2023-05-26

### Fixed
- Repackaged #3892 to make the fix effective.

## [9.11.1] - 2023-05-25

### Fixed
- (#3892) Reverted #3879
  - Unfortunately, vscode does not support ESM, which is how `unified` works.

## [9.11.0] - 2023-05-24

### Added
- (#3879) Use `unified-latex` to parse structure.
  - This is a start of the transition to `unified-latex`-based AST parsing.
- (#3883) Add a `singleton` mode to pdf tab viewing.

### Fixed
- (#3872) Fix `latexlog` parsing.

## [9.10.0] - 2023-05-03

### Added
- (#3838) Properly stringify BibTeX fields containing `#`.
- (#3856) Add a configuration item `latex.rootFile.indicator` to choose the root file indicator.

### Fixed
- (#3867) Use bracket stack to `getLongestBalancedString`.
  - This can help the extension to better parse LaTeX AST.

## [9.9.0] - 2023-04-29

### Added
- (#3855) `latex.clean.fileTypes` support placeholders.

### Fixed
- (#3811) `\include` suggestion does not have file extension.
- (#3812) Fix computation of the section above current position.
- (#3813) Lazy load `usepackage` regex.
- (#3815) Detect more warnings of LaTeX log.
- (#3817) Let `)` may also close `[` when stripping text.
- (#3820) Swap symbols of `epsilon` and `varepsilon`.
- (#3827) Consider `\markdownInput` as input.
- (#3832) Change caption in BTA to top, add a BTB snippet.
- (#3841) `code-server` not loading PDFs from built-in PDF viewer.
- (#3842) Fix environment navigation and content selection for `$...$` and `$$...$$`.
- (#3844) Add port conflict warning to `internal.port` config.

## [9.8.2] - 2023-03-29

### Fixed
- (#3790) Resolving `bib` files according to `rootDir`.
- (#3791) Do not consider `%` in url encoding as comment.
- (#3794) No need to call `findRoot` on did open text document.

## [9.8.1] - 2023-03-24

### Fixed
- (#3787) Root finding fails when optional arguments of `\documentclass` have new lines.

## [9.8.0] - 2023-03-24

### Added
- (#711) Outline for .dtx file.
  - Implements basic .dtx outline with macro and environment document parsing. Guards are not parsed yet.
- (#3722) All viewer configs are now responsive to changes without reloading.
- (#3728) Auto clean can be triggered on success.
- (#3741) Add a `!LW recipe` magic comment to set recipe.
- (#3767) Add a new config `intellisense.package.exclude` to exclude package intellisense.
- (#3786) Add a new config `latex-workshop.latex.jobname` to define jobname.

### Changed
- (#3731) Use backspace and shift+bk to navigate the viewer.
- (#3735) Current root is prioritized on root-finding if there are multiple candidates.
- (#3743) Use `\documentclass[]{}` to detect root.
- (#3770) Refactor EnvPair module and use the `latexParser` to build an AST `CommandPair` of all the pairs in the current file.

### Fixed
- (#3747) Strip `%` comments from bibtex for parsing.
- (#3749) Viewer pages do not overflow.
- (#3751) Fast parse don't include `\s*[{` as args
- (#3778) Associate log warnings with no line number to line 1.

## [9.7.0] - 2023-02-14

### Added
- Update grammar files.
- (#3699) Add a pair of new commands to change hostname of the PDF viewer.
  - `latex-workshop.changeHostName` and `latex-workshop.resetHostName`.

### Changed
- LaTeX Workshop now requires VSCode 1.74.0+.

### Fixed
- Properly provide pair commands from `tex.cwl` and `latex-document.cwl`.
- (#3715) latexindent can format `.cls` and `.sty` files.
- (#3716) Command surrounding may have one more brace if a text placeholder is present.
- (#3718) Remove redundant `left`/`right` commands.
- (#3719) Properly provide `expl3` suggestions.

## [9.6.2] - 2023-02-08

### Fixed
- (#3679) remove `detached: true` when spawning `clean` command.
- (#3694) Add file polling for binaries (e.g. PDF).
  - Resume the use of `latex-workshop.latex.watch.pdf.delay` config to control binary polling.
- (#3700) Support file path suggestion for `\subfileinclude`.
- (#3701) Partial support to `\DeclarePairedDelimiter` environments with `*` in math preview.
- (#3705) Support `multline` environment in math preview.

## [9.6.1] - 2023-02-03

### Fixed
- Remove unnecessary PDF viewer dropdown menu elements.
- Reenabled fast parse on document contents for intellisense and outline.
  - Now fast parse can properly handle `label={eq1}`-like syntax.
- (#3682) Visually activate hand tool in viewer.
- (#3683) Explain on the conflict with extension `vscode-pdf`.

### Internal
- Change to use `vscode.FileSystemWatcher` to watch project files intead of `chokidar`.
  - The current version of `chokidar` possibly fails to emit events on `git pull`.

## [9.6.0] - 2023-01-29

### Added
- Support PDF viewer in code server.

### Fixed
- (#3662) Use `path.resolve` to find pkg json file

### Internal
- Reduce complexity of command finder.
  - `whichPackageProvidesCommand` is simplified by using a universal cmd suggestion array.
  - `commandSignatureDuplicationDetector` check is advanced.
- Expand cacher to cache AST of files, notable reducing the parsing times.
- Update grammar files to `jlelong/vscode-latex-basics@16ac438`.

## [9.5.0] - 2023-01-23

### Added
- (#3641）Support cross-ref from `xr` package.
- (#3650) New config `intellisense.command.user` to add/change/delete default commands.
  - Rename `intellisense.atSuggestionJSON.replace` to `intellisense.atSuggestion.user`.
- (#3658) Add config `intellisense.label.command` to enable label definitions other than `\label{}`.

### Fixed
- No repeat find root calls on active editor change
- (#3654) Don't enforce `-cd` on `latexmk` and `subfiles`.
- (#3657) A condition bug on `newcommand` detection.

## [9.4.5] - 2023-01-13

### Fixed
- New command finder now honors argument and optional one list.
- Entries in `bibtex-entries.first` should also be sorted.
- (#3585) A better description to `latex.watch.files.ignore` config.
- (#3640) Resolve a package conflict with `isort` that may prevent command suggestion.

## [9.4.4] - 2023-01-10

### Fixed
- (#3633) Embedded PDF viewer can copy texts.
- (#3634) `latexindent` cannot be directly called in the first invoke.
- (#3638) Itemize and enumerate completion injects `\\n\\t`.

## [9.4.3] - 2023-01-08

### Fixed
- (#3631) Fix error in SyncTeX with only `.synctex.gz` file.

## [9.4.2] - 2023-01-08

### Fixed
- Environment optional argument intellisense works again.

## [9.4.2] - 2023-01-08

### Fixed
- Environment optional argument intellisense works again.

## [9.4.1] - 2023-01-08

### Fixed
- Allow for parentheses in pkg/doc options for intellisense.

## [9.4.0] - 2023-01-08

### Added
- Base `beamer` and `tikz` intellisense.
- (#3612) Intelli-package dependency obeys package options.
- (#3628) More concise log messages.

### Fixed
- Refresh pdf viewers of only changed pdfs.
- Embedded viewer follows vscode light/dark theme, browser viewer follows OS theme.
- (#3630) Reconnect multiple times to viewer after OS sleep and wake up.

## [9.3.0] - 2023-01-05

### Added
- Class/package options now provide snippet completion.
- (#3617) More structure/outline configurations.
  - Floats can now be nested
  - Add config `view.outline.floats.caption.enabled` to disable float caption.
  - Add `config view.outline.numbers.floats.enabled` to show float number.
- (#3618) Now all extension config items are free from vscode reload
  - Selected ones related to viewer display requires to reopen the pdf viewer.
- (#3619) Command and environment intellisense are now based on packages used and their options if `latex-workshop.intellisense.package.enabled` is `true`.

### Changed
- Deprecated config items are removed.
- Let's use fast parse for structure/outline by default.
- (#3603) Remove unicode chars in recipe names.

### Fixed
- (#3611) Filter package cmds/envs with %, remove arg % part.

## [9.2.2] - 2022-12-31

### Fixed
- (#3607) Try reconnect websocket multiple times after operating system sleep.
- (#3610) Catastrophic backtracking of argument regex that may cause unresponsiveness on intellisense from a long line.

## [9.2.1] - 2022-12-28

### Fixed
- Performance regression due to improper caching of package intellisense data.

## [9.2.0] - 2022-12-23

### Added
- (#3579) Intellisense for optional arguments.

### Changed
- `intellisense.useTabStops.enabled` does not prevents tabbing.
  - It is replace with a new `intellisense.argumentHint.enabled` config.
- (#3594) Hinting data for many packages are updated.

### Fixed
- (#3578) Force no indent after `\begin{document}`.

## [9.1.1] - 2022-12-08

### Fixed
- (#3566, #3569) Make sure command names start with a `\`.
- (#3568, #3570) Use delay to prevent simultaneous auto build by file save or change.
- (#3571) Handle rejected promise on bib parsing.

## [9.1.0] - 2022-12-02

### Added
- (#3539) Add completion for environment starting with a `+`.
- (#3546) Completion in comma separated lists.

### Changed
- (#3540) Use `ctrl+shift+m` instead of `cmd+m` for macos keybindings.
- (#3550) Open http(s) directly from viewer, prompt to open for others.

### Fixed
- Fix wrong count of tools in recipe.
- (#3502) `href` boxes in viewer misplaced on trim.
- (#3549) Use base file name for latexindent temp file.
- (#3556) `check` icon in status on failed builds.

## [9.0.1] - 2022-11-08

### Fixed
- (#3526) The total number of tools in a recipe displays timestamp if there are more than one tools.

## [9.0.0] - 2022-11-07 - Builder Update

### General
- LaTeX Workshop refactored the previous builder logic and adopt a new queue based implementation.
  - Details are recorded in (#3514).
  - If you experience anything unusual, please file an issue and rollback to previous versions temporarily.
- PDF.js is updated to version 3.

### Added
- (#3451) Clean arguments now accepts placeholders.
- (#3468) Parse page number in fullbox logs.
- (#3488) Add `pageBorderColor` config for pdf viewer.

### Changed
- Copy `href` to clipboard instead of directly opening when clicking on embedded internal PDF viewer.
- (#3444) `view.outline` configs are now responsive without vscode reload.

### Fixed
- Enable completion on the first line of a `.bib` file.
- (#3445) Use source file extension to create temp indent file for `latexindent`.
- (#3419) Math preview also shows `flalign`.
- (#3478) Typo in `hyphenrules` newenv.
- (#3520) Select current environment content/name not working.

## [8.29.0] - 2022-08-25

### Added
- (#3400) Add an experimental faster AST-based structure construction.
  - Disabled by default. Can be enabled from `view.outline.fastparse.enabled`.
- (#3421) Provide file completion for `includesvg`.
- (#3423) Support sticky scrolling.

### Fixed
- Fix wrong structure: first section is child of preamble labels.
- (#3404) Fix `\input` arg does not take filenames with underscores.
- (#3408) Ctrl+A (Select All) grays out PDF preview.
- (#3411) Fix linter logs won't clear after all warnings fixed.
- (#3412) Ignore `\newenvironment` content when scanning for duplicate labels.

## [8.28.0] - 2022-07-25

### Added
- (#3342) Add `%` comments to bibtex.
- (#3347) Add "go to definition" support for glossaries and acronyms.
- (#3353) Clean up demanded empty folders after removing auxiliary files.
- (#3355) Add deprecated config alert on activating extension.
- (#3359) Enhance glossary completion.
- (#3360) Add support to `LaCheck`.

### Fixed
- (#3330) Pdf Viewer (Browser) does not refresh on Safari.
- (#3340) Typo in `exam` class intellisense data.
- (#3341) Add intellisense for labels with one optional arg.
- (#3344) Default zoom level of PDF viewer not working on `v8.27.0+`.
- (#3349) Make sure to populate documentation before returning a citation entry.

## [8.27.2] - 2022-06-08

### Fixed
- This time should really fix the `view` button issue.

## [8.27.1] - 2022-06-08

### Fixed
- (#3324) Fix the `view` command.

## [8.27.0] - 2022-06-07

### Added
- (#3316) Support `pageColorsForeground` and `pageColorsBackground` for the internal PDF viewer.

### Changed
- Configurations `chktex.args.active` and `chktex.args.root` are deprecated in favour of `chktex.exec.args`.
- Configuration `chktex.args.path` is deprecated in favour of `chktex.exec.path`.
- Configuration `view.pdf.backgroundColor` is deprecated in favour of `view.pdf.color.light.backgroundColor` and `view.pdf.color.dark.backgroundColor`.

### Fixed
- (#2537) Reveal `.tex` tab if open when using internal `synctex`.
- (#3283) Refactor glossary intellisense data scanning.
  - Stop directly accessing `node.kind`. Instead use the `latexParser.isXXX` methods.
  - Use `stringify` to recompute labels and descriptions. Solves #3280.
- (#3289) Wrong indentation of new items in tabs indented `itemize` environment.
- (#3290) `/` is missing when using `%RELATIVE_DIR%` and `%RELATIVE_DOC%`.
- (#3296) Fix hover and provide definition for commands.
  - Refactor the `tokenizer` used to determine the command under cursor, if any. A LaTeX command name can only contain letters.
  - Fix `provideDefinition` for commands: tokenized commands start with `\`. Solves #3294.
  - Do not show link or `texdoc` command for 'user-defined' package: this is the package used for commands defined directly in the file.

## [8.26.0] - 2022-05-05

### Added
- (#3252) Refactor structure to add caching.
  - (#3260) Use eventbus to manage structure updates.
- (#3275) Add CTAN link to hover on package.
- (#3279) `onEnterKey` supports multi-cursors when all selected lines start with `\item`.

### Changed
- (#3263) Remove a configuration on `markdown.latex.codeblock`.

### Fixed
- (#3250) Add deprecation message to `intellisense.citation.maxfilesizeMB`.
- (#3253) When editing a `markdown_latex_combined` document, command `latex-workshop.onEnterKey` was not found.
- (#3256) Fix typo in `commands.json`.
- (#3258) `isTriggerSuggestNeeded` must match from the beginning of the command name.

## [8.25.0] - 2022-04-13

### Added
- (#3226) Support `\cite<text>{keylist}` commands from `apacite`.

### Fixed
- (#3221) Go to symbol leads to the wrong line.
- (#3227) `cleveref`'s commands loaded by `\usepackage` are not displayed in some cases.
- (#3231) The real time math preview does not work.
- (#3236) Can't display the outline of the paper in the `structure` column, but only the label.
- (#3239) `bibtex-format.sort.enabled` not effective in `settings.json` in multi-root workspace.


## [8.24.1] - 2022-04-01

### Changed

- The setting `latex-workshop.intellisense.citation.maxfilesizeMB` is deprecated in favour of `latex-workshop.bibtex.maxFileSize`.

### Fixed

- (#3219) Set `resource` scope to all `bibtex` settings.

## [8.24.0] - 2022-04-01

### Added

- (#1898) More precise error highlighting.
- (#3043) Handle multi-line `section` command in outline.
- (#3046) Add a configuration variable `texcount.autorun` to enable `texcount` to be automatically called.
- (#3055) Parse and show LaTeX3 warnings.
- (#3065) Add completion detail for snippets.
- (#3122) Use `resource`-scoped properties.
- (#3179) Support `editor.action.smartSelect.expand` and `editor.action.smartSelect.shrink`. The configuration is `latex-workshop.selection.smart.latex.enabled`.
- (#3207) Use `latex-workshop.intellisense.atSuggestionJSON.replace` to replace a default `@`-suggestion or define a new one. See https://github.com/James-Yu/LaTeX-Workshop/wiki/Intellisense#-suggestions
- (#3220) Add Structure view for `BibTeX`.

### Changed

- (#3207) The setting `latex-workshop.intellisense.snippets.trigger.latex` is deprecated in favour of `latex-workshop.intellisense.atSuggestion.trigger.latex`.

### Fixed

- (#2821) Properly remove temporary files from `latexindent`.
- (#3189) Ignore anything before `begin document` in structure.
- (#3192) Refactor completion to better handle duplicates.

## [8.23.0] - 2021-12-28

### Added
- (#3004) Add language configuration for BibTeX style.
- (#3022) Show commands in outline/structure views.
  - We introduce the new setting `latex-workshop.view.outline.commands` with default value ['label']. It replaces `latex-workshop.view.outline.labels.enabled`, which was specific for labels.

### Changed
- (#2963) Migrate to MathJax v3.2.
- (#3009) Drop support for LaTeX Utilities.
- (#3014) Remove `item` snippet.
- (#3027) Disable magic comments by default.

### Fixed
- (#2979) Incorrect structure when using `\verb|\section{...}|`.
- (#2985) Declare `[...)` and `(...]` as bracket pairs.
- (#2986) Disable commands and features on virtual workspaces.
- (#2996) Focus jump in viewer when using landscape pages.

## [8.22.0] - 2021-11-15

### Changed
- (#2881) Refactor `toggleSelectedKeyword`.
- (#2937) Drop the support for VS Code prior to v1.61.2.
- (#2951) Refactor the Input completer.
- (#2959) Remove Snippet Panel.

### Fixed
- (#2929) Highlight `(long|tall)tblr`.
- (#2935) `workspaceFolders` may have length 0.
- (#2950) Provide `@snippets` as completion items using a separate `CompletionItemProvider`.
- (#2952) Do not gobble trailing empty lines when folding.
- (#2967) Fix ranges for `(sub)*section` entries in the structure provider.

## [8.21.1] - 2021-10-22

### Fixed
- (#2917) Treat `latexmk --luatex` properly.
- (#2922,#2926,#2927) The previous package has some mysterious bugs preventing the extension from working properly.
- (#2923) Synctex in file with `\include`d files is not searching for the correct directory.

## [8.21.0] - 2021-10-19

### Added
- (#2841) Add `BibLaTeX` backend for intellisense.
- (#2852) Hightlight the content of the `markdown` environment as `md`.
- (#2870) Add a new configuration variable `latex-workshop.message.bibtexlog.exclude`.
- (#2900) Add three new placeholders.
  - `WORKSPACE_FOLDER`: current workspace path.
  - `RELATIVE_DIR`: file directory relative to the workspace folder.
  - `RELATIVE_DOC`: file path relative to the workspace folder.

### Fixed
- (#2838) Format multiline bibtex fields.
- (#2851) Highlight `tblr` envs as tabular.
- (#2855) Accept dash in cite keys.
- (#2897) Show `Open LaTeX Workshop log` button for some cases.
- (#2908) Highlight `alignedat`.
- (#2909) Replace `\texorpdfstring` by its second arg in outline.

## [8.20.2] - 2021-08-09

### Added
- (#2783) Add support for glossary external file.

### Changed
- (#2756) Use Custom Editor as a hook to start the internal PDF viewer.
- (#2759) Drop support for versions prior to VS Code `1.53.2`.

### Fixed
- A series of engineering improvements.
- (#2766) Declare `flalign` as a math environment.
- (#2770) intellisense for `\mathscr`.
- (#2777) Skip tikpicture content when scanning for labels.
- (#2782) Stop unescaping in surround function.
- (#2786) Skip labels in new command definitions.
- (#2787) Set a scope to `\text` in maths.
- (#2794) Highlights comments inside `\cite`.

### Others
 - 8.20.0 and 8.20.1 are skipped. [#2829](https://github.com/James-Yu/LaTeX-Workshop/issues/2829)

## [8.19.0] - 2021-06-11

### Added
- New log messages for recipes and undefined tools.
- (#2682) Adopt a more lazy approach to read tex content.
- (#2686) Added highlighting support for tabu package envs.

### Changed
- (#2579) Change the default value of `docker.image.latex` to an empty string.

### Fixed
- A series of engineering improvements.

### Fixed

## [8.18.0] - 2021-05-12

### Added
- (#2628) Support `<<child='...'>>=` for `.rnw` file inclusion.
- (#2636) Support SyncTeX buttons on PDF viewers.

### Removed
- (#2653) Remove `BuildInfo`.

### Fixed
- (#2627) Array syntax highlighting.
- (#2628) Refactor input path regexps.
- (#2639) Fix cached packages list update.
- (#2650) Highlight `\Verb` content as verbatim.
- (#2658) Improve find new command regex.
- (#2662) Fix auto build on save with subfiles.
- (#2666) Fix typo, highlight `\iftrue`, not `\ftrue`.
- (#2671) Make sure to remove any verbatim parts before scanning the .tex content.
  - For the moment, it breaks if there are nested verbatim environments.
- (#2671) Make the list of verbatim-like environments configurable by `latex-workshop.latex.verbatimEnvs`.

## [8.17.0] - 2021-04-21

### Added
- (#2566) Add IntelliSense for `\DeclareMathOperator` and any `\newcommand*` & co declarations.
- (#2584) Generate a `cpp` embedded language configuration.

### Fixed
- (#2542) Python code highlighting for all environments of the package `pythontex`.
- (#2561) Fix a regexp which might causes ReDoS.
- (#2562) Fix potential exponential backtracking when removing comments.
- (#2565) Use `spawn` instead of `exec` when looking for `latexindent`.
- (#2575) Make sure to wait for `findRoot` to return before proceeding.
- (#2600) Duplicate labels in the same file not spotted.
- (#2601) Do not filter files using `git`.
- (#2624) The outline view in the sidebar of the internal pdf viewer is too dark to see the content.
- (#2626) Set correct package field in cached element.command.

## [8.16.1] - 2021-03-03

### Fixed
- (#2536) Check for duplicate labels.
- (#2542) Highlight `pythontex` environments.
- (#2543) Make `import` accept a relative path starting from the `rootDir`.
- (#2547) Use `spawnSync` to prevent code injection.
- (#2549) `LintRoot` should lint the whole LaTeX project.
- (#2550) Raise a warning message when viewer cannot find PDF file.

## [8.16.0] - 2021-02-19

### Added
- (#2427) Add a config to show floats or not in outline `view.outline.floats.enabled`.
- (#2432) Make trigger characters for intellisense of LaTeX documents configurable.
- (#2461) Implement a `BibTeX` log parser.
- (#2471) Add a configurable clean command.
  - A fully configurable `clean` command and add three new configuration variables.
  - `latex.clean.method` can be `glob` (default) or `cleanCommand`.
- (#2476) Enable converting ChkTeX outputs' column numbers.
- (#2485) Configure align on equal signs for bibtex formatter `bibtex-format.align-equal.enabled`.
- (#2488) Accept any number of spaces for bibtex indentation given as a string in `bibtex-format.tab`.
- (#2508) Sorting fields can be enabled by `bibtex-fields.sort.enabled`.
- (#2512) Enable autofix on multiline maths.
- (#2529) Users can provide package intellisense data from `intellisense.package.dirs`. 

### Changed
- Use `.fls` file when finding the root file.
- (#2439) Use `vscode.env.asExternalUri` for the internal PDF viewer.

### Fixed
- (#2429) Fix quote escaping for `bst` language.
- (#2430) Stop opening scm view when focusing `tex` file in `diff` mode.
- (#2457) Check if git is available on OSX to prevent dev tools pop up.
- (#2458,#2503) Treat `\left.` `\right)]}` and `\left([{` `\right.` as bracket pairs.
- (#2484) Killing the build process makes vscode crash when `pkill` is provided by `proctools`.
- (#2504) Fix SyncTeX on horizonal scrolling.

## [8.15.0] - 2020-12-06

### Added
- Add Snippet View.
- Add `hover.preview.maxLines` to limit how much we go upward to find the beginning of the math environment.
- (#2380) Add toggle math preview.
- (#2384) Enable math preview on suggest detail widgets for references.
- (#2388) Add `bibtex` support for `markdown`.

### Changed
- Update syntax files for weave, dtx, LaTeX3.
- (#2392) Keep selected text in autocompletion/snippets.
- (#2408) Remove `subfileincludegraphics` in `data/commands.json`.

### Fixed
- Escape `}` properly in the snippet panel.
- (#2394) Refactor fix for double `}}` in completion.
- (#2395) Update `cpp` grammar with bailout.
- (#2397) Autocomplete big parenthesis commands: `left(` -> `\left( ... \right)`.
- (#2415) Add `triggerSuggest` to user-defined commands when needed.
- (#2421) Fix a focus issue when opening PDF files through the explorer.

## [8.14.0] - 2020-11-11

### Added
- (#516,#2298) Glossary completion.
- (#2276) Add tool and recipe definitions for `Tectonic`.
- (#2294) Support real-time math preview panel.
- (#2322) Add option to sort `bib` files by entry type.

### Changed
- (#2279) Update to `PDF.js 2.5.207`.
- (#2291) Tweak the transition of the toolbar of the PDF viewer.

### Fixed
- (#2277) Label completion broken when labels contain spaces.
- (#2290) Extra closing brace when inserting `split` environment.
- (#2292) Fix `\textins` command completion.
- (#2325) Keep trailing comma in last `bibtex` field.
- (#2327) Highlight `&` in `longtable`.
- (#2328) Invoke `toLocaleLowerCase` for the suffix of filenames.
- (#2344) Allow multiple `args` completion with `\cite`.
- (#2339,#2342) Parts of `Compiler Log` are not parsed.
- (#2347) Highlight `optidef` envs.
- (#2356) No leading space allowed before `#begin{document}` when using `subfiles`.
- (#1423,#1820,#2368) Deactivate auto-closing for snippet prefixes.


## [8.13.2] - 2020-09-12

### Fixed
- Extension within WSL uses the wrong un-polyfilled `pdf.js`.

## [8.13.1] - 2020-09-12

### Fixed
- (#2274) Fix spelling error `formater` -> `formatter`.

## [8.13.0] - 2020-09-11

### Added
- (#2261) Declare a formatter provider for `bibtex`.

### Fixed
- (#2270) Extension work again with Remote Development extension.

## [8.12.0] - 2020-09-11

### Added
- (#2198) Add a command to select the full content of the current environment.
- (#2225) Enable `latex-workshop.surround` on the Command Palette.
- (#2249) Improve support for LaTeX fenced code block in Markdown.

### Changed
- Update PDF.js to v2.4.456.
- Drop support for vscode < 1.42.
- (#2158) Add invert PDF in dark mode only.
  - Made invertMode configuration more intuitive.
  - Set default for invertMode.enabled.

### Fixed
- (#2117) Add a build icon.
- (#2126) Improve scope names.
- (#2169) Fix the trim mode of the PDF viewer.
- (#2189) Duplicate cite entries.
- (#2203) Refactor and add above/below to `view.pdf.tab.editorGroup`.
- (#2207) Ignore verbatim content when computing structure.
- (#2211) Add `onSave` option to `latex.autoBuild.run`
  - Reverts `4d3ea8b`
- (#2223) Remove `press a-z and space for greek letter`.
- (#2229) Add TBA snippet for table.
- (#2232) Fix XML & HTML scopes.
- (#2245) Should not treat blob URLs, `blob:...`, as external links.
- (#2265) Use `px` instead of `rem` for padding of SVG images on the snippet panel.

## [8.11.1] - 2020-07-01

### Fixed
- Restoring PDF viewers does not work well with VS Code 1.47.
- (#2172) `"latex.recipe.default": "lastUsed"` doesn't work.
- (#2176) No need to put the closing `}` on its own line in `.bib`.
- (#2177) Use `kpsewhich` to resolve bibliography files.
- (#2182) Also search for `.bib` files in `rootDir`.

## [8.11.0] - 2020-06-24

### Added
- (#2149) Add support for `weave.jl`.
- (#2154) Add section numbers in outline.
  - This feature can be deactivated by setting `view.outline.numbers.enabled: false`.

### Improved
- (#2109) Improve PDF viewer refresh speed.
- (#2157) Improve the invert mode of the PDF viewer with additional filters.

### Fixed
- Activate `onEnterKey` even when suggestion is visible.
  - Always activate `onEnterKey` when `acceptSuggestionOnEnter`.
  - (#2167) Do not activate `onEnterKey` when `suggestWidgetVisible`.
- (#2107) Use `fs.realpathSync` to compare file paths for SyncTeX.
- (#2146) Use `rootFile` to expand placeholders when formatting.

## [8.10.0] - 2020-06-06

### Added
- Enhance LaTeX3 support.
- Activate extension for `latex-expl3` language id.
- (#2018) Support restoring PDF viewers.
- (#2088) Add completion support for `includeonly`/`excludeonly`.
- (#2099) Set default recipe by name.
- (#2115) Add intellisense for optional `bibtex` fields.
- (#2118) Texcount comes back.
- (#2136) Filename completion with already typed path.

### Fixed
- Fix double `}}` in env completion.
- (#1523) Match `\autocite`s syntax highlight.
- (#2049) Add `luahbtex` rule for build info.
- (#2052) Add standard math envs to the default list.
- (#2052) Set `intellisense.package.enabled` to true to populate intellisense based on the used packages.
- (#2054) Declare more cite commands for syntax highlighting.
- (#2055) Stop rebroadcasting keyboard events on Linux.
- (#2056) Remove duplicate `\env` commands.
- (#2120) Show labels in structure/outline.
- (#2131) Fix spaces in suggestions.

## [8.9.0] - 2020-04-24

### Added
- Update `PDF.js` to `v2.3.200`.
- Enhanced `rnw `support.
- Turn `..` into tabstops in snippets.
- The new placeholders `%DOC_W32%`, `%DOC_EXT_W32%`, `%DIR_W32%`, `%OUTDIR_W32%` are normalized so that they use `\\` as the path separator on Windows.
  - Placeholders without the `_W32` suffix always use `/` as the path separator. On Unix platforms, placeholders with and without the `_W32` suffix have the same value.
- (#1534,#2020) Match `\left`...`\right` brackets.
- (#1951) Load `data/packages/class-*.json` files to provide completion items specific to `documentclass`es.
- (#1989) Add syntax highlighting for TypeScript in `minted`.
- (#2029) Refactor environments snippets.
- (#2033) Add a completion provider for `bibtex` files.
- (#2047) Add more default commands in intellisense.

### Changed
- In `%DOC%` and `%DOCFILE%`, we now remove any extension, not only `.tex`.
  - Two new placeholders `%DOC_EXT%` and `%DOCFILE_EXT%` are respectively the root file full path and the root file name with the extension kept.
- Use `cross-spawn` to build and view.

### Fixed
- Fix `updatePkg` when `latexParser` fails.
- (#2002) Make sure to kill all child processes.
- (#2003) Reveal a `WebviewPanel` when executing SyncTeX.
- (#2010) Force `/` in `%OUTDIR%` even on Windows.
- (#2011) Check the length of the args of `\label` command.
- (#2012) Remove `cleveref` intellisense entries.
- (#2016) Disable Ctrl+P Shortcut in `pdf.js` viewer.
- (#2017) Use a dedicated option for pdf watch delay.
- (#2025) Render citation completion and preview as markdown.
- (#2030) Order latexmk rules numerically in compilation live info.

## [8.8.0] - 2020-03-22

### Added
- (#1949) Make the PDF watcher delay configurable via `latex.watch.delay`.
- (#1950) Enable keyboard shortcuts of VS Code on the PDF viewer.
- (#1955) Add embedded language support for minted ruby.
- (#1963) Add `\addplot` grammar support.
- (#1985) Improved intellisense for reference via `intellisense.citation.format`.

### Removed
- (#1986) Remove `formatOnSave:false` in latex configuration.

### Fixed
- (#1947) Normalize `outdir` path.
- (#1953) Fix clean command with relative `outDir`.
- (#1962) Use page numbers to cache SVG files.
- (#1965) Ctrl click to open `documentclass` file.
- (#1972) Use `rootDir` as PWD when parsing `.fls` file.

## [8.7.2] - 2020-02-12

### Fixed
- Fix popup severity.
- (#1811) Wait for write to finish before firing a change event.
- (#1907) Scan `\DeclarePairedDelimiter` for preview.
- (#1925) Add setting for prompting user or not with subfile.
  - The new setting is `latex.rootFile.doNotPrompt`. When set to yes, the file used is decided according to `latex.rootFile.useSubFile`.
- (#1926) Fix `parseLatex`, which should return `undefined` when parsing fails.
- (#1927) Scan for already used environments for intellisense.
- (#1928) Watch external pdf for automatic reload.
- (#1932) Remove the `-cd` option of `latexmk`.
- (#1933) Add an option to disable the progress bar of the compilation of LaTeX `progress.enabled`.
- (#1943) Do not call `document.save()` in formatter.

## [8.7.1] - 2020-01-31

### Fixed
- (#1924) Try magic and active document before current root.

## [8.7.0] - 2020-01-30

### Added
- (#1913) Add recipe for rwn files.
- (#1914) Add option to highlight or comment out duplicate entries in BibTeX.
- (#1918) Declare `\Sexpr` syntax

### Fixed
- Fix scanning of \def for autocompletion.
- (#1876) First try current rootFile on editor change.
- (#1895) Fix subfiles building with `latexmk`.
- (#1895) Accept roofile without extension in subfiles.
- (#1902) Do not change the left panel on active editor change when `view.autoFocus.enabled` is set to `false`.
- (#1904) Always use '/' as path separator.
- (#1905) Fix keybinding regression for `ctrl+alt+[` and `+]`.
- (#1911) `vscode.DocumentSymbol` expects non-empty label.
- (#1915) Accept `@` in command names for intellisense.
- (#1921) Trim current token for hover.

## [8.6.0] - 2020-01-13

### Added
- (#1862) Syntax highlight for BibTeX style language (`.bst`).
- (#1878) Add config to scan `label={...}`.
- (#1891) Support asterisked sections in `shiftSectionLevel`.
- (#1894) Declare `\bibentry` as a citation command.

### Changed
- (#1872) Refactoring communications between the WebSocket server and PDF viewers.
- (#1874) Use typed proxies of workerpool.

### Fixed
- Fix double `/` in `latexindent -c` when using docker.
- (#1871) Override the spread mode specified in PDF documents with the current.
- (#1873) Do not use PWD entry as the cwd for fls files.
- (#1873) Use `cross-spawn` to run `latexindent`.
- (#1877) `\def` commands not passed to mathjax for preview.
- (#1886) Send `type: 'loaded'` to the extension host when PDF files loaded.
- (#1889) Fix outDir when containing `../`.
- (#1890) `latex.watch.files.ignore` not fully honored.
- (#1899) Activate all keybindings for `rsweave` id.

## [8.5.0] - 2019-12-17

### Added
- (#1826) Load (and cache) PDF preview directly from disk for `\includegraphics` completion.
- (#1843) Set the background color of the internal PDF viewer.
- (#1846) Add regex for `biber` to live compilation info.

### Changed
- (#1842) Rename `intellisense.preview.enabled` to `intellisense.includegraphics.preview.enabled`.
- (#1856) Add `*.syntex(busy)` and `*.synctex.gz(busy)` to files to clean.

### Fixed
- (#1841) Quotes break syntax highlighting in `.bib` files.
- (#1848) `close-env` fails at beginning of line.
- (#1851) Preview fails when anything starting with `\par` is inside a `\newcommand`.
- (#1853) Accept white space between dirs in `\graphicspath`.
- (#1860) Accept subdirectories when using subfiles.
- (#1863) Refactor `latexindent` detection.

## [8.4.2] - 2019-11-27

### Added
- (#1819) Add an open on the left mode for the viewer tab, controlled by `view.pdf.tab.editorGroup`.
- (#1817) Replace placeholders in external build arguments.
- (#1777) Declare a new language id for `.rnw` documents.
- (#1833) XeLateX live compilation progress.

### Changed
- (#1818) Do not clean `.ist` files.

### Fixed
- Fine tune some log messages.
- (#1793) Broken pdf viewer with inverted color.
- (#1822) Output window messes with LATEX Snippet Panel.
- (#1823) Drop the star when passing `newcommand`s to mathjax.
- (#1827) `subimport` `path.resolve` issue.

## [8.4.1] - 2019-11-16

### Fixed
- Version 8.4.0 did not show up in the marketplace.

## [8.4.0] - 2019-11-16

### Added
- (#1780) Add commands to sort and align bibtex files.
- (#1808) Add commands of `\bigl` and others.

### Changed
- (#1798) Tweaked promote/demote sectioning feature.
  - Please read the wiki [Sectioning](https://github.com/James-Yu/LaTeX-Workshop/wiki/Snippets#Sectioning) page for details. The actions of `ctrl+[` and `ctrl+]` are exchanged.

### Fixed
- (#1785) Do not reopen all documentations every time.
- (#1788) A lot of tweaks related to extension freezing issue.
- (#1804) Reconnect WebSocket after closed by sleep and wake.
- (#1805) Turn `\providecommand` into `\newcommand` for mathjax preview.

## [8.3.1] - 2019-11-04

### Changed
- (#1669) Activity icon. Sorry! @trevorgunn

## [8.3.0] - 2019-11-03

### Added
- (#1751) Add option to display progress as a notification.
- (#1765) Enable hover on `\includegraphics`.

### Fixed
- (#1589) Change symbol loading method.
- (#1600) Improve TikZ snippet panel.
- (#1676) Add Content Security Policy to WebViews.
- (#1680) Kill all child processes when killing their parents.
- (#1729) Scan for `newcommand`s in the whole project for preview.
- (#1734) Use Mutex for `latexindent`.
- (#1750) Chinese/Japanese characters in formula preview not rendered correctly.

## [8.2.0] - 2019-09-28

### Added
- (#1712) Texdoc completion.

### Fixed
- (#1644) Fix build brogress bar length.
- (#1655) Highlight `mpost` environments as plain tex.
- (#1679) Add `latexmk` recipe for `lualatex`.
- (#1689) Use local cpp grammar with bailout pattern.
- (#1711) Restrict some keybindings to latex files.
- (#1714) Declare `.ctx` files as a LaTeX filetype.
- (#1720) Fix parsing `\usepackage`.

## [8.1.2] - 2019-09-12

### Fixed
- Re-compile the project to include changed should be presented in `8.1.1`.

## [8.1.1] - 2019-09-12

### Changed
- (#1672) Revert #1639: "Check pdf writable status before building."
- Remove the snippet of `\setminus`.

### Fixed
- (#1653) Enables hover on refs with spaces in them.
- (#1661) Allow the same commands with different arguments.

## [8.1.0] - 2019-08-29

### Added
- Add a config `intellisense.update.aggressive.enabled` to disable parsing on text change.
- (#1504) Add a latexmk(rc) recipe.

### Changed
- (#1647) Syntax parsing is now done in a separate thread. Typing lag should be resolved.

### Fixed
- (#1555) Use caption of the main figure for outline.

## [8.0.7] - 2019-08-26

### Changed
- (#1635) Add `.nav` and `.snm` to `latex.clean.fileTypes`.

### Fixed
- (#1637) Find root only when active editor is tex-like.
- (#1639) Check pdf writable status before building.

## [8.0.6] - 2019-08-22

### Fixed
- (#1630) Synctex not working after refreshing pdf viewer.

## [8.0.5] - 2019-08-22

### Fixed
- Use the previous regex-based parsing if the extension cannot build AST properly.
- (#1612) Proper parsing of `tex` input tree.
- (#1621) Fix command completion from used packages.
- (#1621) Check argument list length of `renewcommand`.
- (#1623) Make reverse synctex keybinding configurable.
- (#1626) Refresh viewer after successful build with external command.

## [8.0.4] - 2019-08-20

### Fixed
- Latency before providing auto-completion items.
- (#1599) Fix handling of periods in multiline warnings.
- (#1612) Find root also search for `tex` parents.
- (#1614) Remove word count remnants.
- (#1615) Synctex stops working.
- (#1619) Regression: respect rootDir when dealing with \input

## [8.0.3] - 2019-08-19

### Fixed
- (#1607,#1608,#1609) Compilation cannot find root file within `\input` sub-files.

## [8.0.2] - 2019-08-19

### Fixed
- Extension hangs when `expl3-code.tex` is present in `.fls` file generated by compiler.
- Error debug messages complaining about undefined cached items.

## [8.0.1] - 2019-08-19

### Fixed
- Packaging issue in version 8.0.0 leads to unusable extension.

## [8.0.0] - 2019-08-19 - Engineering Update

### General
- LaTeX Workshop now use abstract syntax tree to analyze LaTeX projects and provide auto-completions.
- LaTeX Workshop now has a sibling extension, LaTeX Utilities, to hold features that are fancy yet not for everyone.

### Added
- Updated `pdfjs` for PDF viewer.
- (#1564) Make `toggleSelectedKeyword` work for multi-selections.

### Fixed
- (#1553) Allow double quotes to delimit values in bibtex.
- (#1581) PDF viewer not refreshing after build after a while.
- (#1585) Fix synctex after build with external viewer.
- (#1595) Mimic the way `\begin` is indented when closing an environment.
- (#1604) Prefer `source.cpp.embedded.latex` in `cpp`-minted env.

### Removed
- Formatted Paste, moved to LaTeX Utilities
- Word Count, moved to LaTeX Utilities
- Tikz Preview, moved to LaTeX Utilities

## [7.3.0] - 2019-07-31

### Added
- Add a config for always loading extra packages in auto-completion.
- (#1511) A snippet panel.

### Fixed
- (#1521) Fixed several bugs on `tikz` preview.
- (#1523) Syntax highlighting for `\autocites`.
- (#1524) Add beamer frames to the outline.
- (#1526) Add intellisense for code input `\lstinputlisting` and `\verbatiminput`.

## [7.2.0] - 2019-07-20

### Added
- (#1500,#1516) Add `tikzpicture` preview.
- (#1496) New `subfiles` package support.

### Changed
- (#1501) Use `base64url` to encode path.
- (#1509) Improve description of `formattedPaste` settings.

### Fixed
- (#1201) Catastrophic backtracking in `getGraphicsPath`.

## [7.1.0] - 2019-07-07

### Added
- (#1452) Paste formatted tables from csv.

### Changed
- (#1446,#1448) Build info panel tweaks.

### Fixed
- (#1415) Parse `label={...}` properly to get references.
- (#1428) Handle optional arguments in `newcommand` for `mathjax`.
- (#1430) Declare `\left`, `\right` as a pair.
- (#1433) Fix `.fls` and `.aux` file discovery with relative `outDir`.
- (#1433) Make structure and manger honor `texDirs`.
- (#1435) Remove a file from `texFileTree` when it is deleted.
- (#1440) Clear build progress on failure to build.
- (#1449) Add option to force recipe usage.
- (#1457) Honor `journaltitle` in citation browser.
- (#1458) Show `stderr` on recipe error.
- ($1463) Pass `DeclareMathOperator` to `mathjax`.

## [7.0.2] - 2019-06-07

### Changed
- (#1417) Change default math preview cursor symbol.

### Fixed
- (#1405) Add eol to `newcommand` file for mathjax.
- (#1412) Fix the width of textLayer on pdf viewer.
- (#1413) Fixed the menu of pdf viewer.

## [7.0.1] - 2019-05-24

### Fixed
- (#1389) Highlight `\verb` in math mode.
- (#1390) Update alternate keyboard selection.
- (#1397) Allow multi-line captions.
- (#1397) Allow one level of `{...}` inside caption.
- (#1399) Declare `displaymath` as a math environment.
- (#1395,#1402) Wait for Web Socket to open.

## [7.0.0] - 2019-05-17 - Work in the Cloud Update

### Added
- (#1326) Show label or given number to ref in hover on the ref.
- (#1345) Support single and double line font warnings.
- (#1357) Enable LaTeX Workshop to work with VSCode Remote Dev.

### Fixed
- (#1343) Make `buildOnFileChange` work regardless of the activeTextEditor.
- (#1354) Add new command defs from an input file to hover preview.
- (#1355) Add default trim mode setting.
- (#1363) Extend font warning second line to other warnings.
- (#1363) Locate matching pair for inline environments.

## [6.5.1] - 2019-04-28

### Fixed
- (#1298,#1333) Fix structure analyzer with inclusion cycle.
- (#1319) Use `PWD` to resolve paths in `.fls` files.
- (#1331) Keep cursor >= 0 when shifting section.
- (#1333) Auto build from imported files work again.
- (#1334) Don't throw error when `synctexjs` fails.
- (#1341) Handle cycle in `clearTeXFileTree`.

## [6.5.0] - 2019-04-25

### Added
- (#1307) Add some details into `commands.json`.
- (#1310) Provide details for `environments.json`.
- (#1321) Make go back and forward buttons on pdf viewer work with SyncTeX.

### Fixed
- (#710) Highlight fenced code block with extra `{ }` argument.
- (#1298) Prevent circular dependencies in manager.
- (#1302) Remove label from `equation` and `align`.
- (#1313) Load `latex-mathsymbols_cmd.json` by default.
- (#1322) Less escapes in wordpattern.

## [6.4.0] - 2019-04-11

### Added
- (#1263) Add accent commands.
- (#1265) Make port of viewer configurable.
- (#1267) Add label field to `AutocompleteEntry`.
- (#1273) Configure the editor group for the tab viewer with `view.pdf.tab.useNewGroup`.

### Changed
- Deprecate the old action dropdown, replace with side view.

### Fixed
- Improve regex for hovering on inline maths.
- Make auto build interval configurable, not 1000ms.
- Skip postprocessing (e.g., refresh viewer) if latexmk is skipped, i.e., no change.
- (#1272) Root file detection with auto build and `subfiles` package.
- (#1278) Support preview for `$$...$$`.
- (#1281) Allow using previous recipe by default, configurable at `latex.recipe.default`.
- (#1288) Use file pooling for `chokidar` watch.
- (#1290) Expand all placeholders.

## [6.3.0] - 2019-04-01

### Added
- Add intellisense for the figure environment.
- Support file completion for import package.
- (#1234) Add `Save without Building`.

### Fixed
- Fix external reverse synctex on Windows.
- (#922) Use scala syntax inside `scalacode` environment.
- (#1235) Declare `[a-zA-Z]*` matrix as array environments.
- (#1249) Intellisense for custom environments.
- (#1250) Support Ctrl+click to open an included file.
- (#1237) Support `graphicspath` for `includegraphics` completion.
- (#1252) Highlight `IEEEeqnarray`.
- (#1254) Look for output files in `outDir` instead of `rootDir`.
- (#1259) Highlight `begin`...`end` inside `macrocode` (doctex).

## [6.2.2] - 2019-03-15

### Fixed
- (#1231) Never watch `/dev/null`.

## [6.2.1] - 2019-03-13

### Fixed
- (#1228) Check if depending files exist before watching them.

## [6.2.0] - 2019-03-12

### Added
- (#1199) Use the last compilation to find and watch all the dependencies.
- (#1218) Syntax highlighting in `doctex`.

### Fixed
- (#1210) Respect output dir when refreshing viewer.
- (#1211) Accept utf8 chars in paths.
- (#1212) Try/catch the call to `pdflatex` at init.
- (#1216) Do not inject commented `def` in mathjax.
- (#1221) Do no parse the command paren inside `newcommand`.
- (#1222) Use `ctrl+l` `ctrl+l` for `expandLineSelection`.
- (#1222) Use `ctrl+l` `ctrl+m` for `editor.action.toggleTabFocusMode`.
- (#1224) Highlight more citation commands.

## [6.1.0] - 2019-03-05

### Added
- Support `\def` in addition to `\newcommand` in mathjax preview.
- (#731) Narrow search of root file with two new settings to include or exclude files from the root file search mechanism
  - `latex.search.rootFiles.include`
  - `latex.search.rootFiles.exclude`
- (#1188) Add support for sage environments.
- (#1191) QoL changes to make log messages better.
- (#1192) Literate haskell.

### Changed
- (#1180) A complete rework of killing LaTeX mechanism.
- (#1155) Use workspace directory as `cwd` in external build command.

### Fixed
- Fix list of suggestions for surrounding text.
- Capture footnote content as `entity.name.footnote.latex`.
- (#1185) Declare `\inlinecode` and code environment as `verbatim`.
- (#1206) Make the width of math preview on hover larger.

## [6.0.0] - 2019-02-19 - QoL Update

### Added
- (#484) Add support for [magic TEX or BIB options](https://github.com/James-Yu/LaTeX-Workshop/wiki/Compile#magic-comments).
- (#1141) Add a `texdoc` interactive command.
- (#1157) LaTeX compilation progress monitor.
- (#1161) Word-based reverse synctex.
- (#1178) Add a new config `latex.texDirs` to search for input TeX in extra directories.

### Changed
- Remove deprecated configs.
- Rename `hoverPreview` configs to `hover.preview`.
- Rename `latex.clean.run` to `latex.autoClean.run`.
- Combine `latex.clean.enabled` and `latex.clean.onFailBuild.enabled`.
- Combine `latex.autoBuild.onSave.enabled` and `latex.autoBuild.onTexChange.enabled` as `latex.autoBuild.run`.
- Add `latex.clean.subfolder.enabled` to determine whether subfolders should be cleared.

### Fixed
- (#1135) Parse `biber` warning.
- (#1137) `%DIR%` in `outDir` works with docker.
- (#1155) Define an [external build command](https://github.com/James-Yu/LaTeX-Workshop/wiki/Compile#external-build-command).
- (#1156) Follow cursor in TeX structure panel.
- (#1162) Include environment variables to building tools.

## [5.21.0] - 2019-01-24

### Added
- (#1131) A new config `chktex.run` to define upon which events `chktex` should execute.

### Changed
- Rename `latex.outputDir` to `latex.outDir` for consistency with LaTeX compiler arguments.
- (#1131) Rename `chktex.interval` to `chktex.delay` for a better summary.

### Fixed
- (#1127) Not throw when a parse error occurs in `synctexjs`.
- (#1132) Do not provide 'Definition' for graphics files.
- (#1134) Use `path.resolve` to replace `path.join` when applicable.
- (#1137) Use `%DIR%` as the default value for `latex.outDir`.

## [5.20.2] - 2019-01-20

### Fixed
- (#1114) No trailing slash in `outpurDir`.

## [5.20.1] - 2019-01-15

### Fixed
- Correctly parse `putbib` bib-files.

## [5.20.0] - 2019-01-15

### Added
- Parse bib files provided by `putbib`.
- (#1063) Allow multiple viewers for the same document.
- (#1079) Improve `outdir` handling. A new placeholder `%OUTDIR%` is included.
- (#1096) A new config to clear Compiler logs before each step of recipe.
- (#1102) A new config to specify additional directories to look for .bib files.

### Changed
- Enable synctexjs by default.
- Make command and reference completion local to the LaTeX project.
- (#1085) Make intellisense local to a root file.

### Fixed
- (#1070) Synctex to the already opened tex file when using symlinks.
- (#1071) New command definitions inserted at incorrect position.
- (#1077) Set the default external PDF viewer based on the OS.
- (#1082) Only latex id at the beginning of a fenced block.
- (#1084) Backward synctex when trim mode.
- (#1089) Improve the accuracy of synctex.
- (#1092) A command must start with `\`.
- (#1095) Remove unnecessary workspace root of file caching.
- (#1095) Call findRoot when active editor changes.
- (#1100) Raise an error when viewing a non existing PDF file.
- (#1109) Clear selection after inserting citation from browser.

## [5.19.0] - 2018-12-21

### Added
- Add arguments to command definition.
- Hover on a command to access the package documentation.
- (#625) Hover on a package name to access his documentation.
- (#1030) Support a builtin `synctex` functionality.
- (#1056) Support math preview on `\ref` with multiple input files.
- (#1058) Add commands of `intcalc` package.

### Fixed
- Avoid duplicates in command intellisense.
- (#609,#669,#801,#837,#857,#883,#1059) Define `wordPattern` of LaTeX.
- (#970,#1059) Tab out of snippets.
- (#1060) Hilghlight `xltabular` as `tabular`.
- (#1061) Scan `newcommand`s for intellisense.
- (#1074) Avoid viewer title duplication.

## [5.18.0] - 2018-12-10

### Added
- Comprehensive `cite` and `ref` intellisense improvements.
- (#1018) Add placeholder `%TMPDIR%` to `latex.outputDir`.
- (#1022) Add documentation for `pdf.js` shortcuts.
- (#1024) Add support for `pyglist` env (`verbments` package).
- (#1028) Add command `view in external viewer` to menu.
- (#1034) Add intellisense for wrapper packages.
- (#1036) Intellisense: Add one entry per command signature.
- (#1051) Add entries from thebibliography to citation intellisense.

### Fixed
- Fix missing argument in citation.browser.
- (#1015) Fix formatter not respecting tab and space settings due to wrong option.
- (#1025) Fold `\part`.
- (#1026) Collapse `\begingroup`...`\endgroup`.
- (#1027) Syntax for `lstinline`.
- (#1031) Fix sorting `completionItems` of commands in dropdown.
- (#1032) Fix citation completion for keys containing : - _ and .
- (#1041) Display current file hierarchy in vs code outline.
- (#1046) Do not capture strings ```...''`.
- (#1048) Fix reverse synctex for odd and even spread mode.
- (#1054) Fix trim mode with annotations.

## [5.17.3] - 2018-11-24

### Fixed
- Hide the sidebar notification green dot of pdf viewer.
- (#995) Add syntax support for `mintinline`.
- (#995) curly braces vs pair of same delimiters.
- (#1006) Focus on active editor after switching to latex view.
- (#1009) By default disable auto showing the side bar view.

## [5.17.2] - 2018-11-21

### Fixed
- Reverse synctex not working due to encoded file path.

## [5.17.1] - 2018-11-21

### Fixed
- A better view switching logic between tex files and git-diffs of them.

## [5.17.0] - 2018-11-21

### Added
- (#992) Provide command intellisense for selected packages.
  - Two new config items are included, namely `intellisense.unimathsymbols.enabled` and `intellisense.package.enabled`, defaulted `false`.
  - For command and environment intellisense of particular contents, enable the corresponding config.
  - Please report if you experienced significant delay when activating the extension.
- (#1002) Add a `view.autoActivateLatex.enabled` config to auto-show latex view when switching back from non-tex files.

### Fixed
- (#987) Fix error loading pdf paths with `#`.
- (#990) Add `documentclass` preamble folding
- (#994) Restore trimming option upon pdf refresh.
- (#997) Hover preview accepts `(re)newcommands*` with the star.

## [5.16.0] - 2018-11-15

### Added
- (#673) Customizable docker image.
- (#813) `message.latexlog.exclude` to exclude compiler messages.
- (#875) Hover preview includes all `(re)newcommands`.
- (#975) Provide `bind.altKeymap.enabled` config to use alternative `ctrl`+`l` `alt`+ keymap.
- (#982) Add `%TMPDIR%` placeholder to tools.

### Fixed
- Better section and LaTeX environment folding.
- Show status bar icon when switching back from non-tex files.
- Consistent viewer trimming selector.
- Wrong bib file definition location.
- (#765) `syncTeX` upon build finished, beside viewer loaded.
- (#976) Only insert `\item` when cursor is at the end of an line or followed by only spaces.

## [5.15.3] - 2018-11-12

### Fixed
- Retain TeX sidebar badge when focusing PDF viewer.

## [5.15.2] - 2018-11-12

### Fixed
- Unified PDF viewer dropdown menu style.
- (#957) Allow `latex.outputDir` to be an absolute path.
- (#972) Add space after `\item` in snippets.

## [5.15.1] - 2018-11-07

### Fixed
- Catch error when parsing theme files.
- (#956) Hang when magic comments form a loop.

## [5.15.0] - 2018-11-05

### Added
- (#944) Add content folding.

### Changed
- (#947) Change the displayed name of this extension to `LaTeX`.

### Fixed
- (#945) De-indent `\documentclass{}`.

## [5.14.2] - 2018-11-03

### Fixed
- (#941) PDFJS library not bundled correctly, again.

## [5.14.1] - 2018-11-03

### Fixed
- (#941) PDFJS library not bundled correctly.

## [5.14.0] - 2018-11-03

### Added
- (#909) Add [View on pdf] link in hover on \ref.
- (#922) Add highlighting support for `VerbatimOut`.
- (#935) Upgrade `pdfjs` to 2.0.943.

### Changed
- (#901) Hover preview not render cursor at the beginning and at the end.
- (#933) Clean output directory recursively.

### Fixed
- (#894) Use '/' as the path separator for file completion.
- (#905) Hover preview stop rendering cursor in label.

## [5.13.0] - 2018-10-18

### Added
- (#890) Offline math hover preview.

### Fixed
- Extension distribution size is reduced.
- (#885) No `--max-print-line` with `xelatex` and `lualatex`.
- (#886) Understand `\InputIfFileExists` as an `\input` command.
- (#889) Item-on-enter issue with Vim extension.

## [5.12.2] - 2018-10-14

### Fixed
- Bundle a minimal MathJax with the extension.
- (#873) Enable scaling of math preview in hover.

## [5.12.1] - 2018-10-14

### Fixed
- Not able to preview maths in LaTeX environments.

## [5.12.0] - 2018-10-14

### Added
- Insert `\item` on enter again.
- Auto-completion for file path.
- (#864) Use webpack for release bundling.
- (#867) Hover on LaTeX for math preview.

## [5.11.1] - 2018-10-05

### Fixed
- (#849) Use WebView API for PDF content persistency.

## [5.11.0] - 2018-10-05

### Added
- More keyboard shortcuts `@tecosaur`.
- (#809) Implement keybindings for snippets.

### Fixed
- More syntax highlight improvements.
- (#816) Ignore outputDir setting when directly viewing PDFs.

## [5.10.2] - 2018-09-25

### Added
- Add more text formatting commands to latex.json.
- Add more math symbols as snippets.
- (#789) Add shortcut ctrl/cmd+alt+x to activate latex badge.
- (#809) Use `@v` + letter for variants of greek letters.

### Fixed
- (#796) Add extra file stack handling for MikTeX.
- (#803) Use dedicated scopes for curly/round brackets.
- (#806) Make commands available for surrounding text.
- (#808) Chmod 755 instead of 777 for potential security flaw.
- (#819) Associate `.ltx` with TeX filetype.
- (#821) Make underscore excluded in `constant.character.math.tex`.

## [5.10.1] - 2018-09-18

### Fixed
- (#796) Prevent build commands from breaking lines in output.
- (#796) Fix wrong handle of non canonical `EOL` in log messages.
- (#797) Fix `undefined` depth error in LaTeX structure.
- (#798) Select line in `gotoSection`.
- (#802) Add contextual menu back, enabled by a new configuration item.

## [5.10.0] - 2018-09-14

### Added
- Add command view to sidebar.
- (#768) Meaningful symbol definitions.
- (#790) Added snippet for Greek letters to detail.
- (#792) Enable activity bar item only on LaTeX projects.
- (#794) Enable snippets usage on selected text.

### Fixed
- (#786) Correct file path parsing in LaTeX log.
- (#788) Make tooltips honor message line breaks.

## [5.9.0] - 2018-09-09

### Added
- Show LaTeX project structure in a new activity bar badge.
- Adapt to new vscode `1.27` platform-specific keybind.
- (#730) Log parsing improvements.
- (#733) Make `outputDir` understand placeholders.
- (#743) Allow any filetype extension to be declared as latex.
- (#744) Automatically trigger intellisense after inserting a snippet and selected commands.
- (#780) Add more `amsmath` environments to snippets.

### Changed
- Remove snippets placeholders default values.
- Show outline of the current file in built-in `outline` view.

### Fixed
- (#752) Fix outline when using \input with a full path.
- (#781) Handle multiline log messages.
- (#783) Re-open all opened PDF upon activation.

## [5.8.2] - 2018-08-16

### Fixed
- Temporarily remove `enter-to-insert-\item` feature.

## [5.8.1] - 2018-08-15

### Fixed
- (#739) Correctly insert linebreak with ENTER outside `itemize` environment.

## [5.8.0] - 2018-08-15

### Added
- Add config to enable file cleaning after a failed building process.
- (#705) Support `\import` as well as `\subimport` for outline and build.
- (#719) Supersed 'Enter' to automatically add `\item` while itemizing.
- (#720) Support nested `subimport`s `@Moberstein`.

### Fixed
- README contents.
- Make sure magic comments start at the beginning of the line.
- (#696) Make outline handle title with nested braces.
- (#723) Finding root file when using nested `subimport`.
- (#728) Do not autocomplete `\end`.
- (#736) Do not build upon file change if building, suppress next build within 1s.

## [5.7.0] - 2018-07-24

### Added
- (#701) Add config to disable badbox information.
- (#710) Add syntax support for latex fenced block in markdown.
- (#717) Auto show PDF on left click in file explorer.

### Fixed
- Make sure to ignore all comments in Outline.
- (#713) Make sure to ignore comments when finding dependencies.

## [5.6.1] - 2018-07-09

### Fixed
- (#693) Correct pdf tab focus logic.
- (#694) Adopt new grid layout.

## [5.6.0] - 2018-07-09

### Added
- Add a new config to ignore too large bib-files.
- (#499) Add chktex auto-fix for `$...$` and `$$...$$`.
- (#658) Add import package support to outline.
- (#666) Add a new pattern for badbox warning.
- (#668) Add `(){}[].,` to macro boundaries.
- (#684) Support multiple root file.
- (#686) Smart `.chktexrc` location detection.

### Fixed
- Fix a problem preventing `latexindent` working on directories with spaces.
- (#556) Do not start build for terminated process
- (#653) Honor insertSpaces in latexformatter.
- (#663) Fixed documentation for `bigvee` and `bigwedge`.
- (#667) Complete `\hyperref[]` with labels.
- (#668) Fix math keyword highlighting followed by `_`.
- (#682) Don't lose focus for pdf tab preview.

## [5.5.1] - 2018-06-06

### Fixed
- (#635) Outline update with `autoBuild.onSave` disabled.
- (#646) Reference completion with multiple files.
- (#648) Wrap `vscode.window.showErrorMessage` to respect the config.
- (#652) Nested maths environment highlighting.

## [5.5.0] - 2018-05-22

### Added
- (#600) Provide a command to view in vscode tab.
- (#613) Add auto synctex after build config.


### Fixed
- Bibtex incorrectly parse entries without delimitors.
- (#628, #629) More fixes on syntax highlighting.
- (#634) Ignore labels defined in comments.
- (#637) Use detached mode when opening external viewer.
- (#640) Prompt title and author in citation hover hint

## [5.4.0] - 2018-05-16

### Added
- (#618) Snippets with no leading `\`.

### Changed
- (#604) Ignore `"` in LaTeX syntax highlighting.

### Fixed
- (#595) Handle nested `{...}` in macro arguments.
- (#606) Declare cases as a math environment.
- (#609) For maths snippets, use `$0` as the placeholder for the body part.
- (#615) Make syntax aware of optional arguments.
- (#624) Syntax highlighting for `&` and `\\`.

## [5.3.3] - 2018-05-06

### Added
- (#565) Format bibtex with formatter.

### Changed
- (#597) Do not highlight strings in .bib files @jlelong.
- (#598) Autocomplete for `\left` command @jcmonteiro.
- (#603) Remove double `"` matching highlight.

### Fixed
- Fix `not using scheme` warning when activating extension.
- (#559) Double encode `&` in url to prevent browser auto-decode.
- (#566) Recognize indented section headers in outline.
- (#567) Remove `frame` in environment hint and add in commands.
- (#586) Ignore sections after `\end{document}` in outline.

## [5.3.2] - 2018-05-03

### Changed
- (#585) Merge latex-memoir into latex @jlelong.

### Fixed
- (#575) Fix unbalanced strings in syntax highlights @jlelong.
- (#576) Remove `set -euo` in linux docker executables.
- (#577) Disable latexindent check when docker enabled.
- (#579) Do not capture `{...}` groups @jlelong.
- (#581) Fix no completion for double backslash @jlelong.
- (#582,#583) Further LaTeX syntax re-organize @jlelong.

## [5.3.1] - 2018-04-25

### Added

- (#552) Add multicursor to current environment name @jlelong.
- (#573) Add environments and package completion @chantisnake.

### Fixed
- (#181) Correct in-tab view option.
- (#568) Prevent completion for `\\`.

## [5.3.0] - 2018-04-16

### Added

- Experimental docker support.

### Fixed
- (#546) More syntax highlighting adjustments @jlelong.

## [5.2.0] - 2018-04-14

### Added
- (#441) Add `%TEX%` placeholder for external synctex.
- (#511) Experimental texify log parsing.
- (#529) Turns the step name into the program name @acristoffers.
- (#532) Add Close / Navigate to environment actions @jlelong.
- (#534) Complete \sqrt as \sqrt{x} using snippets @jlelong.

### Fixed
- (#533) Set working directory when calling LaTeX binaries @Arxisos.
- (#539) Correct magic comment description.

## [5.1.0] - 2018-04-10

### Added
- (#441) Add syncTeX to external experimental support.
- (#512) Show recipe progress in statusbar @oerpli.
- (#513) Add kill process function.

### Fixed
- (#520) View correct PDF with `outputDir` set.
- (#521) No `bib` will be executed without a `%! BIB program` comment @acristoffers.
- (#522) Fix highlighting of {\\{...\\}} blocks @jlelong.
- (#523) Fix key/value highlighting in bib files @jlelong.
- (#526,#527) Dependency updates @thetric.

## [5.0.4] - 2018-04-04

### Added
- (#496) Add options to show/hide messages with different severities.
- (#500) Add open compiler log option to error message.

### Fixed
- (#504) Respect recipe when magic comment is given @acristoffers.
- (#507) Does not show warning after immigration to recipe system.

## [5.0.3] - 2018-03-26

### Fixed
- (#494) Pick viewer in default case where 'viewer' is 'none'.

## [5.0.2] - 2018-03-25

### Fixed
- (#489) Magic comment program with undefined arguments.

## [5.0.1] - 2018-03-25

### Added
- (#482) Show info on how to change default pdf viewer.
- (#483) Auto change toolchain to recipe.

### Changed
- Overhaul `All Actions` quickdrop menu.

### Fixed
- Correct building process fatal error status bar icon.
- (#485) Formatter works for paths with spaces.

## [5.0.0] - 2018-03-24 - Recipe Update

### Added
- (#426) `\usepackage` intellisense.
- (#441) Unofficial external PDF viewer support.
- (#441) Selectable view icon viewer target.
- (#447) Multiple embedded PDF viewer improvements @chatziko.
- (#459) Make arguments for latexindent configurable @project-pp.
- (#467) Intelligently add root magic comment @oerpli.

### Changed
- Use the new notification UI of vscode.
- (#457,#468,#471,#473,#481) Multiple LaTeX syntax highlighting improvements @jlelong.
- (#477) Change the original toolchain system to a new recipe system.
  - Please refer to the updated README on how to migrate.

### Fixed
- (#449) Fix a typo in snippet for 'cline' command @hy950831.

### P.S.
- Why skipping version 4? Four is sometimes considered an unlucky number in Chinese. XD

## [3.14.0] - 2018-02-22

### Added
- (#415) Support document range formatting @zoehneto.
- (#424) Support latex specific formatting settings @zoehneto.
- (#416) Clean auxillary files and retry once on build errors @schrej.

### Changed
- Disable surrounding command by default.

### Fixed
- (#401) Use `127.0.0.1` instead of `localhost`.
- (#417) Improved synctex accuracy @chatziko.
- (#418) Focus the iframe of the pdf viewer to enable keyboard navigation @chatziko.
- (#419) Handle external links in the embedded viewer @chatziko.


## [3.13.0] - 2018-01-30

### Added
- (#332) Ctrl click on file name to navigate.
- (#372) Show dropdown menu on which file to build.
- (#383) Make path for latexindent configurable.

### Fixed
- (#381) Fix current working directory issue when formatting on windows.

## [3.12.3] - 2018-01-10

### Fixed
- (#373) Toolchain does not append `-pdflatex=pdflatex` to `latexmk`.

## [3.12.2] - 2018-01-09

### Fixed
- Normalize path separator to *nix-style `/` on Windows.

## [3.12.1] - 2018-01-09

### Fixed
- (#368) Formatter now respect vscode indent settings @zoehneto.
- (#369) The color of PDF viewer can be controlled.
- (#371) `latexmk` uses magic command to select compiler.

## [3.12.0] - 2018-01-05

### Added
- (#363) Integrate nfode/latex-formatter with fix for indent.log @zoehneto.

### Fixed
- (#359) Fix PDF viewing with ipv6 address @caidao22.
- (#361) Comments may contain latex commands that should not be read @jsinglet.
- (#365) Remove `$` auto-pairing.

## [3.11.0] - 2018-01-02
### Added
- Add conflict extension check.
- (#240) View any PDF file from the context menu.
- (#249) Clean auxiliary file now respect globs.
- (#355) Add region markers support @Ash258.

### Changed
- (#286) Hide print buttons when PDF is viewed in vscode.

## [3.10.1] - 2017-12-26
### Fixed
- (#346) `\input{file.tex}` need not to be at the row start to be included in outline.
- (#353) `\begin{comment}` syntax highlight.

## [3.10.0] - 2017-12-19
### Added
- (#315) Highlight the location of SyncTeX in PDF viewer.

### Fixed
- Tweak SyncTeX accuracy.

## [3.9.1] - 2017-12-13
### Changed
- Tweak toolbar show/hide behavior and threshold.

## [3.9.0] - 2017-12-11
### Added
- (#335) add an option to specify the browser used to view PDF file @Lencerf.

### Changed
- (#343) Move mouse on viewer to show toolbar, revert viewer style.

### Fixed
- (#341) Clarify `latex.outputDir` usage.

## [3.8.0] - 2017-12-01
### Added
- (#321) LaTeX inline math completion @innerlee.
- A new config item to disable new version message.

### Fixed
- (#325) Parse paths with hashtag.
- (#333) PDF viewer with new theme has 2px border overflow.

## [3.7.0] - 2017-11-21
### Added
- (#308) Multi-root support @innerlee.
- (#313) `chkTeX` now supports `.chktexrc` config @innerlee.

### Changed
- (#314) Empty bibliography warning is now omitted @innerlee.
- (#320) All LaTeX Workshop commands also activate the extension despite document type.

### Fixed
- (#312) SyncTeX fails if the current position locates on last line which is empty @innerlee.
- (#323) Irregular LaTeX log lead to trailing whitespace in file stack.

## [3.6.2] - 2017-11-15
### Changed
- (#283, #302) Update README @lippertmarkus.
- (#305) Change PDF viewer theme to be brighter. This theme reduces eye strain when refreshing PDF @innerlee.

## [3.6.1] - 2017-11-06
### Fixed
- (#297) PDF path can contain `#` now.

## [3.6.0] - 2017-11-01
### Added
- (#288) New `intellisense.surroundCommand.enabled` config to control command surrounding feature.

## [3.5.5] - 2017-10-03
### Fixed
- (#284) Fix CMap URL to display CJK languages correctly @maruta.

## [3.5.4] - 2017-09-29
### Changed
- (#275) New icon @bartosz-antosik. Nice!

## [3.5.3] - 2017-09-19
### Changed
- (#272) Consider TeX files as proper project sources.

### Fixed
- (#268) Saving document actually changes outline.

## [3.5.2] - 2017-09-11
### Fixed
- Better expl3 syntax highlight not shipped in `3.5.1`.

## [3.5.1] - 2017-09-11
### Changed
- (#261) Use dedicated output panel to display LaTeX compiler logs.
- (#267) Better expl3 highlight with `@`.

## [3.5.0] - 2017-09-06
### Added
- (#256) `document`, `frame`, `columns` and `column` environments.
- (#259) Expl3 colorizer.

### Fixed
- (#257) Use "editorTextFocus" as key-bind condition.
- Wrong content surrounded by command on long lines.

## [3.4.2] - 2017-09-04
### Fixed
- (#244) `opn` won't open web browsers for PDF viewer. Prompt instead.

## [3.4.1] - 2017-08-31
### Fixed
- (#244) Dev console error when switching to non-editor panes.
- (#254) Use dirty logic to replace vscode-vim-specific command for LaTeX command surrounding.

## [3.4.0] - 2017-08-30
### Added
- (#246) Surround selection with latex command by pressing `\`.

### Fixed
- Intellisense citation browser overridden by word hint.

## [3.3.4] - 2017-08-28
### Fixed
- (#247) Fix pdf viewer default setting won't work issue.

## [3.3.3] - 2017-08-22
### Fixed
- (#235) Add surrounding pairs for opening ` and closing '.
- (#239) Support `label={some-label}` type reference.
- (#242) Correct bibtex parser position offset.
- (#245) Log parser file resolve from root instead of stack.

## [3.3.2] - 2017-08-15
### Fixed
- Reverse synctex opens `tex` file in the wrong view column when bottom panel is visible.

## [3.3.1] - 2017-08-14
### Fixed
- (#220) Continuous non-stop parsing `tex` file.

## [3.3.0] - 2017-08-08
### Changed
- Use `pdfjs-dist` to reduce codebase size.
- Refresh PDF with pdf.js viewer API to reduce flashing time.

### Fixed
- (#221) Open synctex document in non-pdf-viewer column.

## [3.2.2] - 2017-08-07
### Fixed
- (#229) Tab bar view-pdf icon is back.

## [3.2.1] - 2017-08-03
### Fixed
- (#223) Multi-file LaTeX log messages point to wrong file.

## [3.2.0] - 2017-08-02
### Added
- (#219) Show all symbol definitions within a document and the project.
- (#224) Count single file words and floats when not opening the root LaTeX file.

## [3.1.2] - 2017-07-31
### Fixed
- (#216) Wrong status bar display when killing child processes.
- (#217) PDF tab viewer over UNC cannot refresh.

## [3.1.1] - 2017-07-30
### Fixed
- (#214, #215) PDF viewer not properly registered in extension.

## [3.1.0] - 2017-07-29
### Added
- (#142) LaTeX project word counter by TeXCount.
  - Windows users are suggested to upgrade [TeXCount](http://app.uio.no/ifi/texcount/download.html) to version 3.0.1.
- (#212) Add `newcommand` etc definition support.

### Fixed
- (#211) Tab viewer support UNC address

## [3.0.1] - 2017-07-28
### Fixed
- (#208) Extension initialization failed when no root file is found.

## [3.0.0] - 2017-07-27 - Language Update
### Added
- (#184) Add LaTeX language hover and definition providers.
- (#202) Extra biblatex entry types.
- (#204) Basic auto-indent feature provided by VS Code.

### Changed
- (#205) Re-construct latex log parser. Credited to [`@Vogel612`](https://github.com/Vogel612).

### Fixed
- (#203) Multiple optional parameter support to `\cite`.

## [2.10.2] - 2017-07-15
### Fixed
- (#195) `lstlisting` messes up syntax highlight.
- (#196) Citation browser auto-complete replaces all characters in curly brackets.

## [2.10.1] - 2017-07-13
### Changed
- (#190) Now use a standalone file under extension folder to perform version check.

### Fixed
- (#193) Duplicated entries in quick menu if Action is invoked multiple times.
- Click `Close` on new version alert redirects to GitHub repo.

## [2.10.0] - 2017-07-06
### Added
- (#182) Use `|` as delimiters for outline section tags (`view.outline.sections`) in the same level.
- Supporting entries in the dropdown quick menu.
- Version update notice with small candies.

### Fixed
- (#183) Citation browser does not replace the character already input in `\cite{xxx`.

## [2.9.1] - 2017-07-04
### Fixed
- Extension unable to activate due to typo in retrieving outline configuration item.

## [2.9.0] - 2017-07-04
### Added
- (#177) Add a new configuration item to customize LaTeX outline structure.

### Changed
- (#178) LaTeX outline only show on LaTeX documents.
  - This requires an API from Insider channel. Public channel users need to wait for a while.
- Rename `latex-workshop.viewer` configs to `latex-workshop.view`, and move existing configs to `pdf` sub-domain.

## [2.8.1] - 2017-07-02
### Fixed
- (#132, #173) Citation browser won't search if any bibtex item does not have title attribute.
- Extension activate upon vscode start regardless of language setting.

## [2.8.0] - 2017-06-30
### Added
- (#175) Add LaTeX document outline. Credited to [`@jsinglet`](https://github.com/jsinglet).

## [2.7.1] - 2017-06-29
### Changed
- (#176) Use a new bibtex parser to better handle double quoted strings in bib files.

## [2.7.0] - 2017-06-26
### Added
- (#169) Add new configuration entry `latex.additionalBib` to auto-complete globally included `.bib` files.

### Fixed
- Chokidar watches the same file multiple times if multi-included.

## [2.6.0] - 2017-06-19
### Added
- (#168) Add new placeholder `%DIR%` in toolchain.

## [2.5.1] - 2017-06-16
### Fixed
- (#167) Linter shows no linting message if `chktex` returns warnings.

## [2.5.0] - 2017-06-13
### Added
- (#156) Two new config items to control the default parameters for PDF viewer.

## [2.4.1] - 2017-06-12
### Changed
- (#158) Use theme color to colorize status bar messages.

### Fixed
- (#161) Add auto pairing for `$` and `.
- (#155) Remove `lstlisting` specific highlight rules.

## [2.4.0] - 2017-05-30
### Added
- (#154) Support `# !TeX program` magic comment.

### Changed
- (#141) `itemize` and `enumerate` intellisense append an `\item`.

## [2.3.3] - 2017-05-25
### Fixed
- (#144) Typo on multline environment.

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

## [2.0.0] - 2017-04-10 - Configuration Update
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
