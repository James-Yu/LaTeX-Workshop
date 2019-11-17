import * as vscode from 'vscode'
import * as fs from 'fs-extra'
import * as path from 'path'
import {bibtexParser} from 'latex-utensils'

import {Extension} from './main'
import {getLongestBalancedString} from './utils/utils'
import * as bibtexUtils from './utils/bibtexutils'
import {TeXDoc} from './components/texdoc'
import {performance} from 'perf_hooks'

async function quickPickRootFile(rootFile: string, localRootFile: string): Promise<string | undefined> {
    const pickedRootFile = await vscode.window.showQuickPick([{
        label: 'Default root file',
        description: `Path: ${rootFile}`
    }, {
        label: 'Subfiles package root file',
        description: `Path: ${localRootFile}`
    }], {
        placeHolder: 'Subfiles package detected. Which file to build?',
        matchOnDescription: true
    }).then( selected => {
        if (!selected) {
            return undefined
        }
        switch (selected.label) {
            case 'Default root file':
                return rootFile
                break
            case 'Subfiles package root file':
                return localRootFile
                break
            default:
                return undefined
        }
    })
    return pickedRootFile
}


export class Commander {
    extension: Extension
    private _texdoc: TeXDoc
    snippets: {[key: string]: vscode.SnippetString} = {}

    constructor(extension: Extension) {
        this.extension = extension
        this._texdoc = new TeXDoc(extension)
        let extensionSnippets: string
        fs.readFile(`${this.extension.extensionRoot}/snippets/latex.json`)
            .then(data => {extensionSnippets = data.toString()})
            .then(() => {
                const snipObj = JSON.parse(extensionSnippets)
                Object.keys(snipObj).forEach(key => {
                    this.snippets[key] = new vscode.SnippetString(snipObj[key]['body'])
                })
                this.extension.logger.addLogMessage('Snippet data loaded.')
            })
            .catch(err => this.extension.logger.addLogMessage(`Error reading data: ${err}.`))
    }

    async build(skipSelection: boolean = false, rootFile: string | undefined = undefined, recipe: string | undefined = undefined) {
        this.extension.logger.addLogMessage('BUILD command invoked.')
        if (!vscode.window.activeTextEditor) {
            return
        }

        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const externalBuildCommand = configuration.get('latex.external.build.command') as string
        const externalBuildArgs = configuration.get('latex.external.build.args') as string[]
        if (rootFile === undefined && this.extension.manager.hasTexId(vscode.window.activeTextEditor.document.languageId)) {
            rootFile = await this.extension.manager.findRoot()
        }
        if (externalBuildCommand) {
            const pwd = path.dirname(rootFile ? rootFile : vscode.window.activeTextEditor.document.fileName)
            await this.extension.builder.buildWithExternalCommand(externalBuildCommand, externalBuildArgs, pwd, rootFile)
            return
        }
        if (rootFile === undefined) {
            this.extension.logger.addLogMessage('Cannot find LaTeX root file.')
            return
        }
        let pickedRootFile: string | undefined = rootFile
        if (!skipSelection && this.extension.manager.localRootFile) {
            // We are using the subfile package
            pickedRootFile = await quickPickRootFile(rootFile, this.extension.manager.localRootFile)
            if (! pickedRootFile) {
                return
            }
        }
        this.extension.logger.addLogMessage(`Building root file: ${pickedRootFile}`)
        await this.extension.builder.build(pickedRootFile, recipe)
    }

    async revealOutputDir() {
        let outDir = this.extension.manager.getOutDir()
        if (!path.isAbsolute(outDir)) {
            const rootDir = this.extension.manager.rootDir || (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0].uri.fsPath)
            if (rootDir === undefined) {
                this.extension.logger.addLogMessage(`Cannot reveal ${vscode.Uri.file(outDir)}: no root dir can be identified.`)
                return
            }
            outDir = path.resolve(rootDir, outDir)
        }
        this.extension.logger.addLogMessage(`Reveal ${vscode.Uri.file(outDir)}`)
        await vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(outDir))
    }

    recipes(recipe?: string) {
        this.extension.logger.addLogMessage('RECIPES command invoked.')
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const recipes = configuration.get('latex.recipes') as {name: string}[]
        if (!recipes) {
            return
        }
        if (recipe) {
            this.build(false, undefined, recipe)
            return
        }
        vscode.window.showQuickPick(recipes.map(candidate => candidate.name), {
            placeHolder: 'Please Select a LaTeX Recipe'
        }).then(selected => {
            if (!selected) {
                return
            }
            this.build(false, undefined, selected)
        })
    }

    async view(mode?: string) {
        if (mode) {
            this.extension.logger.addLogMessage(`VIEW command invoked with mode: ${mode}.`)
        } else {
            this.extension.logger.addLogMessage('VIEW command invoked.')
        }
        if (!vscode.window.activeTextEditor) {
            this.extension.logger.addLogMessage('Cannot find active TextEditor.')
            return
        }
        if (!this.extension.manager.hasTexId(vscode.window.activeTextEditor.document.languageId)) {
            this.extension.logger.addLogMessage('Active document is not a TeX file.')
            return
        }
        const rootFile = await this.extension.manager.findRoot()
        if (rootFile === undefined) {
            this.extension.logger.addLogMessage('Cannot find LaTeX root PDF to view.')
            return
        }
        let pickedRootFile: string | undefined = rootFile
        if (this.extension.manager.localRootFile) {
            // We are using the subfile package
            pickedRootFile = await quickPickRootFile(rootFile, this.extension.manager.localRootFile)
            if (! pickedRootFile) {
                return
            }
        }
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const useActiveGroup = configuration.get('view.pdf.tab.useNewGroup') as boolean
        if (mode === 'browser') {
            this.extension.viewer.openBrowser(pickedRootFile)
            return
        } else if (mode === 'tab') {
            this.extension.viewer.openTab(pickedRootFile, true, useActiveGroup)
            return
        } else if (mode === 'external') {
            this.extension.viewer.openExternal(pickedRootFile)
            return
        } else if (mode === 'set') {
            this.setViewer()
            return
        }
        const promise = (configuration.get('view.pdf.viewer') as string === 'none') ? this.setViewer(): Promise.resolve()
        promise.then(() => {
            if (!pickedRootFile) {
                return
            }
            switch (configuration.get('view.pdf.viewer')) {
                case 'browser':
                    this.extension.viewer.openBrowser(pickedRootFile)
                    break
                case 'tab':
                default:
                    this.extension.viewer.openTab(pickedRootFile, true, useActiveGroup)
                    break
                case 'external':
                    this.extension.viewer.openExternal(pickedRootFile)
                    break
            }
        })
    }

    refresh() {
        this.extension.logger.addLogMessage('REFRESH command invoked.')
        this.extension.viewer.refreshExistingViewer()
    }

    kill() {
        this.extension.logger.addLogMessage('KILL command invoked.')
        this.extension.builder.kill()
    }

    pdf(uri: vscode.Uri | undefined) {
        this.extension.logger.addLogMessage('PDF command invoked.')
        if (uri === undefined || !uri.fsPath.endsWith('.pdf')) {
            return
        }
        this.extension.viewer.openTab(uri.fsPath, false, false)
    }

    synctex() {
        this.extension.logger.addLogMessage('SYNCTEX command invoked.')
        if (!vscode.window.activeTextEditor || !this.extension.manager.hasTexId(vscode.window.activeTextEditor.document.languageId)) {
            return
        }
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        let pdfFile: string | undefined = undefined
        if (this.extension.manager.localRootFile && configuration.get('latex.rootFile.useSubFile')) {
            pdfFile = this.extension.manager.tex2pdf(this.extension.manager.localRootFile)
        } else if (this.extension.manager.rootFile !== undefined) {
            pdfFile = this.extension.manager.tex2pdf(this.extension.manager.rootFile)
        }
        this.extension.locator.syncTeX(undefined, undefined, pdfFile)
    }

    synctexonref(line: number, filePath: string) {
        this.extension.logger.addLogMessage('SYNCTEX command invoked.')
        if (!vscode.window.activeTextEditor || !this.extension.manager.hasTexId(vscode.window.activeTextEditor.document.languageId)) {
            return
        }
        this.extension.locator.syncTeXOnRef({line, filePath})
    }

    async clean(): Promise<void> {
        this.extension.logger.addLogMessage('CLEAN command invoked.')
        const rootFile = await this.extension.manager.findRoot()
        if (rootFile === undefined) {
            this.extension.logger.addLogMessage('Cannot find LaTeX root file to clean.')
            return
        }
        let pickedRootFile: string | undefined = rootFile
        if (this.extension.manager.localRootFile) {
            // We are using the subfile package
            pickedRootFile = await quickPickRootFile(rootFile, this.extension.manager.localRootFile)
            if (! pickedRootFile) {
                return
            }
        }
        return this.extension.cleaner.clean(pickedRootFile)
    }

    addTexRoot() {
        this.extension.logger.addLogMessage('ADDTEXROOT command invoked.')
        if (!vscode.window.activeTextEditor || !this.extension.manager.hasTexId(vscode.window.activeTextEditor.document.languageId)) {
            return
        }
        this.extension.texMagician.addTexRoot()
    }

    citation() {
        this.extension.logger.addLogMessage('CITATION command invoked.')
        this.extension.completer.citation.browser()
    }

    log(compiler?: string) {
        this.extension.logger.addLogMessage('LOG command invoked.')
        if (compiler) {
            this.extension.logger.showCompilerLog()
            return
        }
        this.extension.logger.showLog()
    }

    gotoSection(filePath: string, lineNumber: number) {
        this.extension.logger.addLogMessage(`GOTOSECTION command invoked. Target ${filePath}, line ${lineNumber}`)
        const activeEditor = vscode.window.activeTextEditor

        vscode.workspace.openTextDocument(filePath).then((doc) => {
            vscode.window.showTextDocument(doc).then(() => {
                vscode.commands.executeCommand('revealLine', {lineNumber, at: 'center'})
                if (activeEditor) {
                    activeEditor.selection = new vscode.Selection(new vscode.Position(lineNumber, 0), new vscode.Position(lineNumber, 0))
                }
            })
        })

    }

    setViewer() {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        return vscode.window.showQuickPick(['VSCode tab', 'Web browser', 'External viewer'], {placeHolder: 'View PDF with'})
        .then(option => {
            switch (option) {
                case 'Web browser':
                    configuration.update('view.pdf.viewer', 'browser', true)
                    vscode.window.showInformationMessage('By default, PDF will be viewed with web browser. This setting can be changed at "latex-workshop.view.pdf.viewer".')
                    break
                case 'VSCode tab':
                    configuration.update('view.pdf.viewer', 'tab', true)
                    vscode.window.showInformationMessage('By default, PDF will be viewed with VSCode tab. This setting can be changed at "latex-workshop.view.pdf.viewer".')
                    break
                case 'External viewer':
                    configuration.update('view.pdf.viewer', 'external', true)
                    vscode.window.showInformationMessage('By default, PDF will be viewed with external viewer. This setting can be changed at "latex-workshop.view.pdf.viewer".')
                    break
                default:
                    break
            }
        })
    }

    navigateToEnvPair() {
        this.extension.logger.addLogMessage('JumpToEnvPair command invoked.')
        if (!vscode.window.activeTextEditor || !this.extension.manager.hasTexId(vscode.window.activeTextEditor.document.languageId)) {
            return
        }
        this.extension.envPair.gotoPair()
    }

    selectEnvName() {
        this.extension.logger.addLogMessage('SelectEnvName command invoked.')
        if (!vscode.window.activeTextEditor || !this.extension.manager.hasTexId(vscode.window.activeTextEditor.document.languageId)) {
            return
        }
        this.extension.envPair.envAction('selection')
    }

    multiCursorEnvName() {
        this.extension.logger.addLogMessage('MutliCursorEnvName command invoked.')
        if (!vscode.window.activeTextEditor || !this.extension.manager.hasTexId(vscode.window.activeTextEditor.document.languageId)) {
            return
        }
        this.extension.envPair.envAction('cursor')
    }

    toggleEquationEnv() {
        this.extension.logger.addLogMessage('toggleEquationEnv command invoked.')
        if (!vscode.window.activeTextEditor || !this.extension.manager.hasTexId(vscode.window.activeTextEditor.document.languageId)) {
            return
        }
        this.extension.envPair.envAction('equationToggle')
    }

    closeEnv() {
        this.extension.logger.addLogMessage('CloseEnv command invoked.')
        if (!vscode.window.activeTextEditor || !this.extension.manager.hasTexId(vscode.window.activeTextEditor.document.languageId)) {
            return
        }
        this.extension.envPair.closeEnv()
    }

    actions() {
        this.extension.logger.addLogMessage('ACTIONS command invoked.')
        vscode.commands.executeCommand('workbench.view.extension.latex').then(() => vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup'))
    }

    /**
     * Insert the snippet with name name.
     * @param name  the name of a snippet contained in latex.json
     */
    insertSnippet(name: string) {
        const editor = vscode.window.activeTextEditor
        if (!editor) {
            return
        }
        if (name in this.snippets) {
            editor.insertSnippet(this.snippets[name])
        }
    }

    /**
     * If the current line starts with \item or \item[], do the same for
     * the new line when hitting enter.
     * Note that hitting enter on a line containing only \item or \item[]
     * actually deletes the content of the line.
     */
    onEnterKey(modifiers?: string) {
        const editor = vscode.window.activeTextEditor
        if (!editor) {
            return
        }
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        if (!configuration.get('bind.enter.key')) {
            return editor.edit(() => {
                vscode.commands.executeCommand('type', { source: 'keyboard', text: '\n' })
            })
        }
        if (modifiers === 'alt') {
            return vscode.commands.executeCommand('editor.action.insertLineAfter')
        }

        const cursorPos = editor.selection.active
        const line = editor.document.lineAt(cursorPos.line)

        // if the cursor is not followed by only spaces/eol, insert a plain newline
        if (line.text.substr(cursorPos.character).split(' ').length - 1 !== line.range.end.character - cursorPos.character) {
            return editor.edit(() => {
                vscode.commands.executeCommand('type', { source: 'keyboard', text: '\n' })
            })
        }

        // if the line only constists of \item or \item[], delete its content
        if (/^\s*\\item(\[\s*\])?\s*$/.exec(line.text)) {
            const rangeToDelete = line.range.with(cursorPos.with(line.lineNumber, line.firstNonWhitespaceCharacterIndex), line.range.end)

            return editor.edit(editBuilder => {
                editBuilder.delete(rangeToDelete)
            })
        }

        const matches = /^(\s*)\\item(\[[^[\]]*\])?\s*(.*)$/.exec(line.text)
        if (matches) {
            let itemString = ''
            let newCursorPos: vscode.Position
            // leading indent
            if (matches[1]) {
                itemString += matches[1]
            }
            // is there an optional paramter to \item
            if (matches[2]) {
                itemString += '\\item[] '
                newCursorPos = cursorPos.with(line.lineNumber + 1, itemString.length - 2)
            } else {
                itemString += '\\item '
                newCursorPos = cursorPos.with(line.lineNumber + 1, itemString.length)
            }
            return editor.edit(editBuilder => {
                editBuilder.insert(cursorPos, '\n' + itemString)
                }).then(() => {
                    editor.selection = new vscode.Selection(newCursorPos, newCursorPos)
                }
            ).then(() => { editor.revealRange(editor.selection) })
        }
        return editor.edit(() => {
            vscode.commands.executeCommand('type', { source: 'keyboard', text: '\n' })
        })
    }

    /**
    * Toggle a keyword, if the cursor is inside a keyword,
    * the keyword will be removed, otherwise a snippet will be added.
    * @param keyword the keyword to toggle without backslash eg. textbf or underline
    * @param outerBraces whether or not the tag should be wrapped with outer braces eg. {\color ...} or \textbf{...}
    */
    async toggleSelectedKeyword(keyword: string, outerBraces?: boolean) {
        function updateOffset(newContent: string, replacedRange: vscode.Range) {
            const splitLines = newContent.split('\n')
            offset.lineOffset += splitLines.length - (replacedRange.end.line - replacedRange.start.line + 1)
            offset.columnOffset +=
                splitLines[splitLines.length - 1].length -
                (replacedRange.isSingleLine
                    ? replacedRange.end.character - replacedRange.start.character
                    : replacedRange.start.character)
        }
        const editor = vscode.window.activeTextEditor
        if (editor === undefined) {
            return
        }

        const document = editor.document
        const selections = editor.selections.sort((a, b) => {
            let diff = a.start.line - b.start.line
            diff = diff !== 0 ? diff : a.start.character - b.start.character
            return diff
        })
        const selectionsText = selections.map(selection => document.getText(selection))

        const offset: {
            currentLine: number,
            lineOffset: number,
            columnOffset: number
        } = {
            currentLine: 0, lineOffset: 0, columnOffset: 0
        }

        const actions: ('added' | 'removed')[] = []

        for (let i = 0; i < selections.length; i++) {
            const selection = selections[i]
            const selectionText = selectionsText[i]
            const line = document.lineAt(selection.anchor)

            if (offset.currentLine !== selection.start.line) {
                offset.currentLine = selection.start.line
                offset.columnOffset = 0
            }
            const translatedSelection = new vscode.Range(
                selection.start.translate(offset.lineOffset, offset.columnOffset),
                selection.end.translate(offset.lineOffset, offset.columnOffset),
            )

            const pattern = new RegExp(`\\\\${keyword}{`, 'g')
            let match = pattern.exec(line.text)
            let keywordRemoved = false
            while (match !== null) {
                const matchStart = line.range.start.translate(0, match.index)
                const matchEnd = matchStart.translate(0, match[0].length)
                const searchString = document.getText(new vscode.Range(matchEnd, line.range.end))
                const insideText = getLongestBalancedString(searchString)
                const matchRange = new vscode.Range(matchStart,matchEnd.translate(0, insideText.length + 1))

                if (matchRange.contains(translatedSelection)) {
                    // Remove keyword
                    await editor.edit(((editBuilder) => {
                        editBuilder.replace(matchRange, insideText)
                    }))
                    updateOffset(insideText, matchRange)
                    actions.push('removed')
                    keywordRemoved = true
                    break
                }
                match = pattern.exec(line.text)
            }
            if (keywordRemoved) {
                continue
            }

            // Add keyword
            if (selectionText.length > 0) {
                await editor.edit(((editBuilder) => {
                    let replacementText: string
                    if (outerBraces === true) {
                        replacementText= `{\\${keyword} ${selectionText}}`
                    } else {
                        replacementText= `\\${keyword}{${selectionText}}`
                    }
                    editBuilder.replace(translatedSelection, replacementText)
                    updateOffset(replacementText, selection)
                }))
            } else {
                let snippet: vscode.SnippetString
                if (outerBraces === true) {
                    snippet = new vscode.SnippetString(`{\\${keyword} $1}`)
                } else {
                    snippet = new vscode.SnippetString(`\\${keyword}{$1}`)
                }
                await editor.insertSnippet(snippet, selection.start.translate(offset.lineOffset, offset.columnOffset))
                updateOffset(snippet.value.replace(/\$\d/g, ''), new vscode.Range(selection.start, selection.start))
            }
            actions.push('added')
        }

        return actions
    }

    /**
     * Shift the level sectioning in the selection by one (up or down)
     * @param change
     */
    shiftSectioningLevel(change: 'promote' | 'demote') {
        if (change !== 'promote' && change !== 'demote') {
            throw TypeError(
            `Invalid value of function parameter 'change' (=${change})`
            )
        }

        const editor = vscode.window.activeTextEditor
        if (editor === undefined) {
            return
        }

        const promotes = {
            part: 'part',
            chapter: 'part',
            section: 'chapter',
            subsection: 'section',
            subsubsection: 'subsection',
            paragraph: 'subsubsection',
            subparagraph: 'paragraph'
        }
        const demotes = {
            part: 'chapter',
            chapter: 'section',
            section: 'subsection',
            subsection: 'subsubsection',
            subsubsection: 'paragraph',
            paragraph: 'subparagraph',
            subparagraph: 'subparagraph'
        }

        function replacer(
            _match: string,
            sectionName: keyof typeof promotes ,
            options: string,
            contents: string
        ) {
            if (change === 'promote') {
                return '\\' + promotes[sectionName] + (options ? options : '') + contents
            } else {
                // if (change === 'demote')
                return '\\' + demotes[sectionName] + (options ? options : '') + contents
            }
        }

        // when supported, negative lookbehind at start would be nice --- (?<!\\)
        const pattern = /\\(part|chapter|section|subsection|subsection|subsubsection|paragraph|subparagraph)(\[.+?\])?(\{.*?\})/g

        function getLastLineLength(someText: string) {
            const lines = someText.split(/\n/)
            return lines.slice(lines.length - 1, lines.length)[0].length
        }

        const document = editor.document
        const selections = editor.selections
        const newSelections: vscode.Selection[] = []

        const edit = new vscode.WorkspaceEdit()

        for (let selection of selections) {
            let mode: 'selection' | 'cursor' = 'selection'
            let oldSelection: any = null
            if (selection.isEmpty) {
                mode = 'cursor'
                oldSelection = selection
                const line = document.lineAt(selection.anchor)
                selection = new vscode.Selection(line.range.start, line.range.end)
            }

            const selectionText = document.getText(selection)
            const newText = selectionText.replace(pattern, replacer)
            edit.replace(document.uri, selection, newText)

            const changeInEndCharacterPosition = getLastLineLength(newText) - getLastLineLength(selectionText)
            if (mode === 'selection') {
                newSelections.push(
                    new vscode.Selection(selection.start,
                        new vscode.Position(selection.end.line,
                            selection.end.character + changeInEndCharacterPosition
                        )
                    )
                )
            } else { // mode === 'cursor'
                const anchorPosition = oldSelection.anchor.character + changeInEndCharacterPosition
                const activePosition = oldSelection.active.character + changeInEndCharacterPosition
                newSelections.push(
                    new vscode.Selection(
                        new vscode.Position(oldSelection.anchor.line, anchorPosition < 0 ? 0 : anchorPosition),
                        new vscode.Position(oldSelection.active.line, activePosition < 0 ? 0 : activePosition)
                    )
                )
            }
        }

        vscode.workspace.applyEdit(edit).then(success => {
            if (success) {
                editor.selections = newSelections
            }
        })
    }

    devParseLog() {
        if (vscode.window.activeTextEditor === undefined) {
            return
        }
        this.extension.logParser.parse(vscode.window.activeTextEditor.document.getText())
    }

    async devParseTeX() {
        if (vscode.window.activeTextEditor === undefined) {
            return
        }
        const ast = await this.extension.pegParser.parseLatex(vscode.window.activeTextEditor.document.getText())
        vscode.workspace.openTextDocument({content: JSON.stringify(ast, null, 2), language: 'json'}).then(doc => vscode.window.showTextDocument(doc))
    }

    async devParseBib() {
        if (vscode.window.activeTextEditor === undefined) {
            return
        }
        const ast = await this.extension.pegParser.parseBibtex(vscode.window.activeTextEditor.document.getText())
        vscode.workspace.openTextDocument({content: JSON.stringify(ast, null, 2), language: 'json'}).then(doc => vscode.window.showTextDocument(doc))
    }

    async bibtexFormat(sort: boolean, align: boolean) {
        if (vscode.window.activeTextEditor === undefined || vscode.window.activeTextEditor.document.languageId !== 'bibtex') {
            return
        }
        const t0 = performance.now() // Measure performance
        const ast = await this.extension.pegParser.parseBibtex(vscode.window.activeTextEditor.document.getText())

        const config = vscode.workspace.getConfiguration('latex-workshop')
        const leftright = config.get('bibtex-format.surround') === 'Curly braces' ? [ '{', '}' ] : [ '"', '"']
        const tabs = { '2 spaces': '  ', '4 spaces': '    ', 'tab': '\t' }
        const configuration: bibtexUtils.BibtexFormatConfig = {
            tab: tabs[config.get('bibtex-format.tab') as ('2 spaces' | '4 spaces' | 'tab')],
            case: config.get('bibtex-format.case') as ('UPPERCASE' | 'lowercase'),
            left: leftright[0],
            right: leftright[1],
            sort: config.get('bibtex-format.sortby') as string[]
        }

        const entries: bibtexParser.Entry[] = []
        const entryLocations: vscode.Range[] = []
        ast.content.forEach(item => {
            if (bibtexParser.isEntry(item)) {
                entries.push(item)
                // latex-utilities uses 1-based locations whereas VSCode uses 0-based
                entryLocations.push(new vscode.Range(
                    item.location.start.line - 1,
                    item.location.start.column - 1,
                    item.location.end.line - 1,
                    item.location.end.column - 1))
            }
        })

        let sortedEntryLocations: vscode.Range[] = []
        if (sort) {
            entries.sort(bibtexUtils.bibtexSort(configuration.sort)).forEach(entry => {
                sortedEntryLocations.push((new vscode.Range(
                    entry.location.start.line - 1,
                    entry.location.start.column - 1,
                    entry.location.end.line - 1,
                    entry.location.end.column - 1)))
            })
        } else {
            sortedEntryLocations = entryLocations
        }

        // Successively replace the text in the current location from the sorted location
        const edit = new vscode.WorkspaceEdit()
        const uri = vscode.window.activeTextEditor.document.uri
        let text: string
        for (let i = 0; i < entries.length; i++) {
            if (align) {
                text = bibtexUtils.bibtexFormat(entries[i], configuration)
            } else {
                text = vscode.window.activeTextEditor.document.getText(sortedEntryLocations[i])
            }
            edit.replace(uri, entryLocations[i], text)
        }

        vscode.workspace.applyEdit(edit).then(success => {
            if (success) {
                const t1 = performance.now()
                this.extension.logger.addLogMessage(`BibTeX action successful. Took ${t1 - t0} ms.`)
            } else {
                this.extension.logger.showErrorMessage('Something went wrong while processing the bibliography.')
            }
        })
    }

    texdoc(pkg?: string) {
        this._texdoc.texdoc(pkg)
    }

    texdocUsepackages() {
        this._texdoc.texdocUsepackages()
    }

    async saveWithoutBuilding() {
        if (vscode.window.activeTextEditor === undefined) {
            return
        }
        this.extension.builder.disableBuildAfterSave = true
        await vscode.window.activeTextEditor.document.save()
        setTimeout(() => this.extension.builder.disableBuildAfterSave = false, 1000)
    }
}
