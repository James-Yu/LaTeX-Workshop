import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'

import type {Extension} from './main'
import {TeXDoc} from './components/texdoc'
import {getSurroundingCommandRange} from './utils/utils'
type SnippetsLatexJsonType = typeof import('../snippets/latex.json')

async function quickPickRootFile(rootFile: string, localRootFile: string): Promise<string | undefined> {
    const configuration = vscode.workspace.getConfiguration('latex-workshop', vscode.Uri.file(rootFile))
    const doNotPrompt = configuration.get('latex.rootFile.doNotPrompt') as boolean
    if (doNotPrompt) {
        if (configuration.get('latex.rootFile.useSubFile')) {
            return localRootFile
        } else {
            return rootFile
        }
    }
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
    private readonly extension: Extension
    private readonly _texdoc: TeXDoc
    private readonly snippets = new Map<string, vscode.SnippetString>()

    constructor(extension: Extension) {
        this.extension = extension
        this._texdoc = new TeXDoc(extension)
        let extensionSnippets: string
        fs.promises.readFile(`${this.extension.extensionRoot}/snippets/latex.json`)
            .then(data => {extensionSnippets = data.toString()})
            .then(() => {
                const snipObj: { [key: string]: { body: string } } = JSON.parse(extensionSnippets) as SnippetsLatexJsonType
                Object.keys(snipObj).forEach(key => {
                    this.snippets.set(key, new vscode.SnippetString(snipObj[key]['body']))
                })
                this.extension.logger.addLogMessage('Snippet data loaded.')
            })
            .catch(err => this.extension.logger.addLogMessage(`Error reading data: ${err}.`))
    }

    async build(skipSelection: boolean = false, rootFile: string | undefined = undefined, languageId: string | undefined = undefined, recipe: string | undefined = undefined) {
        this.extension.logger.addLogMessage('BUILD command invoked.')
        if (!vscode.window.activeTextEditor) {
            this.extension.logger.addLogMessage('Cannot start to build because the active editor is undefined.')
            return
        }
        this.extension.logger.addLogMessage(`The document of the active editor: ${vscode.window.activeTextEditor.document.uri.toString(true)}`)
        this.extension.logger.addLogMessage(`The languageId of the document: ${vscode.window.activeTextEditor.document.languageId}`)
        const workspace = rootFile ? vscode.Uri.file(rootFile) : vscode.window.activeTextEditor.document.uri
        const configuration = vscode.workspace.getConfiguration('latex-workshop', workspace)
        const externalBuildCommand = configuration.get('latex.external.build.command') as string
        const externalBuildArgs = configuration.get('latex.external.build.args') as string[]
        if (rootFile === undefined && this.extension.manager.hasTexId(vscode.window.activeTextEditor.document.languageId)) {
            rootFile = await this.extension.manager.findRoot()
            languageId = this.extension.manager.rootFileLanguageId
        }
        if (externalBuildCommand) {
            const pwd = path.dirname(rootFile ? rootFile : vscode.window.activeTextEditor.document.fileName)
            await this.extension.builder.buildWithExternalCommand(externalBuildCommand, externalBuildArgs, pwd, rootFile)
            return
        }
        if (rootFile === undefined || languageId === undefined) {
            this.extension.logger.addLogMessage('Cannot find LaTeX root file. See https://github.com/James-Yu/LaTeX-Workshop/wiki/Compile#the-root-file')
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
        await this.extension.builder.build(pickedRootFile, languageId, recipe)
    }

    async revealOutputDir() {
        let outDir = this.extension.manager.getOutDir()
        if (!path.isAbsolute(outDir)) {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0]
            const rootDir = this.extension.manager.rootDir || workspaceFolder?.uri.fsPath
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
            return this.build(false, undefined, undefined, recipe)
        }
        return vscode.window.showQuickPick(recipes.map(candidate => candidate.name), {
            placeHolder: 'Please Select a LaTeX Recipe'
        }).then(selected => {
            if (!selected) {
                return
            }
            return this.build(false, undefined, undefined, selected)
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
        const tabEditorGroup = configuration.get('view.pdf.tab.editorGroup') as string
        if (mode === 'browser') {
            return this.extension.viewer.openBrowser(pickedRootFile)
        } else if (mode === 'tab') {
            return this.extension.viewer.openTab(pickedRootFile, true, tabEditorGroup)
        } else if (mode === 'external') {
            this.extension.viewer.openExternal(pickedRootFile)
            return
        } else if (mode === 'set') {
            return this.setViewer()
        }
        const promise = (configuration.get('view.pdf.viewer') as string === 'none') ? this.setViewer(): Promise.resolve()
        void promise.then(() => {
            if (!pickedRootFile) {
                return
            }
            switch (configuration.get('view.pdf.viewer')) {
                case 'browser': {
                    return this.extension.viewer.openBrowser(pickedRootFile)
                }
                case 'tab':
                default: {
                    return this.extension.viewer.openTab(pickedRootFile, true, tabEditorGroup)
                }
                case 'external': {
                    return this.extension.viewer.openExternal(pickedRootFile)
                }
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
        return this.extension.viewer.openPdfInTab(uri, 'current', false)
    }

    synctex() {
        try {
            this.extension.logger.addLogMessage('SYNCTEX command invoked.')
            if (!vscode.window.activeTextEditor || !this.extension.manager.hasTexId(vscode.window.activeTextEditor.document.languageId)) {
                this.extension.logger.addLogMessage('Cannot start SyncTeX. The active editor is undefined, or the document is not a TeX document.')
                return
            }
            const configuration = vscode.workspace.getConfiguration('latex-workshop', this.extension.manager.getWorkspaceFolderRootDir())
            let pdfFile: string | undefined = undefined
            if (this.extension.manager.localRootFile && configuration.get('latex.rootFile.useSubFile')) {
                pdfFile = this.extension.manager.tex2pdf(this.extension.manager.localRootFile)
            } else if (this.extension.manager.rootFile !== undefined) {
                pdfFile = this.extension.manager.tex2pdf(this.extension.manager.rootFile)
            }
            this.extension.locator.syncTeX(undefined, undefined, pdfFile)
        } catch(e) {
            if (e instanceof Error) {
                this.extension.logger.logError(e)
            }
            throw e
        }
    }

    synctexonref(line: number, filePath: string) {
        this.extension.logger.addLogMessage('SYNCTEX command invoked on a reference.')
        if (!vscode.window.activeTextEditor || !this.extension.manager.hasTexId(vscode.window.activeTextEditor.document.languageId)) {
            this.extension.logger.addLogMessage('Cannot start SyncTeX. The active editor is undefined, or the document is not a TeX document.')
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

    wordcount() {
        this.extension.logger.addLogMessage('WORDCOUNT command invoked.')
        if (!vscode.window.activeTextEditor || !this.extension.manager.hasTexId(vscode.window.activeTextEditor.document.languageId) ||
            this.extension.manager.rootFile === vscode.window.activeTextEditor.document.fileName) {
            if (this.extension.manager.rootFile) {
                this.extension.counter.count(this.extension.manager.rootFile)
            } else {
                this.extension.logger.addLogMessage('WORDCOUNT: No rootFile defined.')
            }
        } else {
            this.extension.counter.count(vscode.window.activeTextEditor.document.fileName, false)
        }
    }

    log(compiler?: string) {
        this.extension.logger.addLogMessage(`LOG command invoked: ${compiler || 'default'}`)
        if (compiler) {
            this.extension.logger.showCompilerLog()
            return
        }
        this.extension.logger.showLog()
    }

    gotoSection(filePath: string, lineNumber: number) {
        this.extension.logger.addLogMessage(`GOTOSECTION command invoked. Target ${filePath}, line ${lineNumber}`)
        const activeEditor = vscode.window.activeTextEditor

        void vscode.workspace.openTextDocument(filePath).then((doc) => {
            void vscode.window.showTextDocument(doc).then(() => {
                void vscode.commands.executeCommand('revealLine', {lineNumber, at: 'center'})
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
                    void configuration.update('view.pdf.viewer', 'browser', true)
                    void vscode.window.showInformationMessage('By default, PDF will be viewed with web browser. This setting can be changed at "latex-workshop.view.pdf.viewer".')
                    break
                case 'VSCode tab':
                    void configuration.update('view.pdf.viewer', 'tab', true)
                    void vscode.window.showInformationMessage('By default, PDF will be viewed with VSCode tab. This setting can be changed at "latex-workshop.view.pdf.viewer".')
                    break
                case 'External viewer':
                    void configuration.update('view.pdf.viewer', 'external', true)
                    void vscode.window.showInformationMessage('By default, PDF will be viewed with external viewer. This setting can be changed at "latex-workshop.view.pdf.viewer".')
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

    selectEnvContent() {
        this.extension.logger.addLogMessage('SelectEnv command invoked.')
        if (!vscode.window.activeTextEditor || !this.extension.manager.hasTexId(vscode.window.activeTextEditor.document.languageId)) {
            return
        }
        this.extension.envPair.selectEnv()
    }

    selectEnvName() {
        this.extension.logger.addLogMessage('SelectEnvName command invoked.')
        if (!vscode.window.activeTextEditor || !this.extension.manager.hasTexId(vscode.window.activeTextEditor.document.languageId)) {
            return
        }
        this.extension.envPair.envNameAction('selection')
    }

    multiCursorEnvName() {
        this.extension.logger.addLogMessage('MutliCursorEnvName command invoked.')
        if (!vscode.window.activeTextEditor || !this.extension.manager.hasTexId(vscode.window.activeTextEditor.document.languageId)) {
            return
        }
        this.extension.envPair.envNameAction('cursor')
    }

    toggleEquationEnv() {
        this.extension.logger.addLogMessage('toggleEquationEnv command invoked.')
        if (!vscode.window.activeTextEditor || !this.extension.manager.hasTexId(vscode.window.activeTextEditor.document.languageId)) {
            return
        }
        this.extension.envPair.envNameAction('equationToggle')
    }

    closeEnv() {
        this.extension.logger.addLogMessage('CloseEnv command invoked.')
        if (!vscode.window.activeTextEditor || !this.extension.manager.hasTexId(vscode.window.activeTextEditor.document.languageId)) {
            return
        }
        return this.extension.envPair.closeEnv()
    }

    actions() {
        this.extension.logger.addLogMessage('ACTIONS command invoked.')
        return vscode.commands.executeCommand('workbench.view.extension.latex-workshop-activitybar').then(() => vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup'))
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
        const entry = this.snippets.get(name)
        if (entry) {
            return editor.insertSnippet(entry)
        }
        return
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
            return editor.edit(() =>
                vscode.commands.executeCommand('type', { source: 'keyboard', text: '\n' })
            )
        }
        if (modifiers === 'alt') {
            return vscode.commands.executeCommand('editor.action.insertLineAfter')
        }

        const cursorPos = editor.selection.active
        const line = editor.document.lineAt(cursorPos.line)

        // if the cursor is not followed by only spaces/eol, insert a plain newline
        if (line.text.substring(cursorPos.character).split(' ').length - 1 !== line.range.end.character - cursorPos.character) {
            return editor.edit(() =>
                vscode.commands.executeCommand('type', { source: 'keyboard', text: '\n' })
            )
        }

        // if the line only consists of \item or \item[], delete its content
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
            return editor.edit(editBuilder => { editBuilder.insert(cursorPos, '\n' + itemString) })
                         .then(() => { editor.selection = new vscode.Selection(newCursorPos, newCursorPos) })
                         .then(() => { editor.revealRange(editor.selection) })
        }
        return editor.edit(() =>
            vscode.commands.executeCommand('type', { source: 'keyboard', text: '\n' })
        )
    }

    /**
    * Toggle a keyword. This function works with multi-cursors or multi-selections
    *
    * If the selection is empty, a snippet is added.
    *
    * If the selection is not empty and matches `\keyword{...}`, it is replaced by
    * the argument of `keyword`. If the selection does not start with `\keyword`, it is surrounded by `\keyword{...}`.
    *
    *  @param keyword the keyword to toggle without backslash eg. textbf or underline
    */
    async toggleSelectedKeyword(keyword: string) {
        const editor = vscode.window.activeTextEditor
        if (editor === undefined) {
            return
        }

        const editActions: {range: vscode.Range, text: string}[] = []
        const snippetActions: vscode.Position[] = []

        for (const selection of editor.selections) {
            // If the selection is empty, determine if a snippet should be inserted or the cursor is inside \keyword{...}
            if (selection.isEmpty) {
                const surroundingCommandRange = getSurroundingCommandRange(keyword, selection.anchor, editor.document)
                if (surroundingCommandRange) {
                    editActions.push({range: surroundingCommandRange.range, text: surroundingCommandRange.arg})
                } else {
                    snippetActions.push(selection.anchor)
                }
                continue
            }

            // When the selection is not empty, decide if \keyword must be inserted or removed
            const text = editor.document.getText(selection)
            if (text.startsWith(`\\${keyword}{`) || text.startsWith(`${keyword}{`)) {
                const start = text.indexOf('{') + 1
                const insideText = text.slice(start).slice(0, -1)
                editActions.push({range: selection, text: insideText})
            } else {
                editActions.push({range: selection, text: `\\${keyword}{${text}}`})
            }
        }

        if (editActions.length === 0 && snippetActions.length > 0) {
            const snippet = new vscode.SnippetString(`\\\\${keyword}{$1}`)
            await editor.insertSnippet(snippet, snippetActions)
        } else if (editActions.length > 0 && snippetActions.length === 0) {
            await editor.edit((editBuilder) => {
                editActions.forEach(action => {
                    editBuilder.replace(action.range, action.text)
                })
            })
        } else {
            this.extension.logger.addLogMessage('toggleSelectedKeyword: cannot handle mixed edit and snippet actions')
        }
    }

    /**
     * Shift the level sectioning in the selection by one (up or down)
     * @param change
     */
    shiftSectioningLevel(change: 'promote' | 'demote') {
       this.extension.section.shiftSectioningLevel(change)
    }

    selectSection() {
        this.extension.section.selectSection()
    }

    devParseLog() {
        if (vscode.window.activeTextEditor === undefined) {
            return
        }
        this.extension.compilerLogParser.parse(vscode.window.activeTextEditor.document.getText())
    }

    async devParseTeX() {
        if (vscode.window.activeTextEditor === undefined) {
            return
        }
        const ast = await this.extension.pegParser.parseLatex(vscode.window.activeTextEditor.document.getText())
        return vscode.workspace.openTextDocument({content: JSON.stringify(ast, null, 2), language: 'json'}).then(doc => vscode.window.showTextDocument(doc))
    }

    async devParseBib() {
        if (vscode.window.activeTextEditor === undefined) {
            return
        }
        const ast = await this.extension.pegParser.parseBibtex(vscode.window.activeTextEditor.document.getText())
        return vscode.workspace.openTextDocument({content: JSON.stringify(ast, null, 2), language: 'json'}).then(doc => vscode.window.showTextDocument(doc))
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

    openMathPreviewPanel() {
        return this.extension.mathPreviewPanel.open()
    }

    closeMathPreviewPanel() {
        this.extension.mathPreviewPanel.close()
    }

    toggleMathPreviewPanel() {
        this.extension.mathPreviewPanel.toggle()
    }

}
