import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import * as lw from './lw'
import { TeXDoc } from './components/texdoc'
import { getSurroundingCommandRange } from './utils/utils'
import { getLogger } from './components/logger'

const logger = getLogger('Commander')

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
    private readonly _texdoc: TeXDoc
    private readonly snippets = new Map<string, vscode.SnippetString>()

    constructor() {
        this._texdoc = new TeXDoc()
        let extensionSnippets: string
        fs.promises.readFile(`${lw.extensionRoot}/snippets/latex.json`)
            .then(data => {extensionSnippets = data.toString()})
            .then(() => {
                const snipObj: { [key: string]: { body: string } } = JSON.parse(extensionSnippets) as SnippetsLatexJsonType
                Object.keys(snipObj).forEach(key => {
                    this.snippets.set(key, new vscode.SnippetString(snipObj[key]['body']))
                })
                logger.log('Snippet data loaded.')
            })
            .catch(err => {
                logger.logError('Error reading snippet data', err)
            })
    }

    async build(skipSelection: boolean = false, rootFile: string | undefined = undefined, languageId: string | undefined = undefined, recipe: string | undefined = undefined) {
        logger.log('BUILD command invoked.')
        if (!vscode.window.activeTextEditor) {
            logger.log('Cannot start to build because the active editor is undefined.')
            return
        }
        logger.log(`The document of the active editor: ${vscode.window.activeTextEditor.document.uri.toString(true)}`)
        logger.log(`The languageId of the document: ${vscode.window.activeTextEditor.document.languageId}`)
        const workspace = rootFile ? vscode.Uri.file(rootFile) : vscode.window.activeTextEditor.document.uri
        const configuration = vscode.workspace.getConfiguration('latex-workshop', workspace)
        const externalBuildCommand = configuration.get('latex.external.build.command') as string
        const externalBuildArgs = configuration.get('latex.external.build.args') as string[]
        if (rootFile === undefined && lw.manager.hasTexId(vscode.window.activeTextEditor.document.languageId)) {
            rootFile = await lw.manager.findRoot()
            languageId = lw.manager.rootFileLanguageId
        }
        if (externalBuildCommand) {
            const pwd = path.dirname(rootFile ? rootFile : vscode.window.activeTextEditor.document.fileName)
            await lw.builder.buildExternal(externalBuildCommand, externalBuildArgs, pwd, rootFile)
            return
        }
        if (rootFile === undefined || languageId === undefined) {
            logger.log('Cannot find LaTeX root file. See https://github.com/James-Yu/LaTeX-Workshop/wiki/Compile#the-root-file')
            return
        }
        let pickedRootFile: string | undefined = rootFile
        if (!skipSelection && lw.manager.localRootFile) {
            // We are using the subfile package
            pickedRootFile = await quickPickRootFile(rootFile, lw.manager.localRootFile)
            if (! pickedRootFile) {
                return
            }
        }
        logger.log(`Building root file: ${pickedRootFile}`)
        await lw.builder.build(pickedRootFile, languageId, recipe)
    }

    async revealOutputDir() {
        let outDir = lw.manager.getOutDir()
        if (!path.isAbsolute(outDir)) {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0]
            const rootDir = lw.manager.rootDir || workspaceFolder?.uri.fsPath
            if (rootDir === undefined) {
                logger.log(`Cannot reveal ${vscode.Uri.file(outDir)}: no root dir can be identified.`)
                return
            }
            outDir = path.resolve(rootDir, outDir)
        }
        logger.log(`Reveal ${vscode.Uri.file(outDir)}`)
        await vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(outDir))
    }

    recipes(recipe?: string) {
        logger.log('RECIPES command invoked.')
        const configuration = vscode.workspace.getConfiguration('latex-workshop', lw.manager.getWorkspaceFolderRootDir())
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

    async view(mode?: 'tab' | 'browser' | 'external' | vscode.Uri) {
        if (mode) {
            logger.log(`VIEW command invoked with mode: ${mode}.`)
        } else {
            logger.log('VIEW command invoked.')
        }
        if (!vscode.window.activeTextEditor) {
            logger.log('Cannot find active TextEditor.')
            return
        }
        if (!lw.manager.hasTexId(vscode.window.activeTextEditor.document.languageId)) {
            logger.log('Active document is not a TeX file.')
            return
        }
        const rootFile = await lw.manager.findRoot()
        if (rootFile === undefined) {
            logger.log('Cannot find LaTeX root PDF to view.')
            return
        }
        let pickedRootFile: string | undefined = rootFile
        if (lw.manager.localRootFile) {
            // We are using the subfile package
            pickedRootFile = await quickPickRootFile(rootFile, lw.manager.localRootFile)
        }
        if (!pickedRootFile) {
            return
        }
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const tabEditorGroup = configuration.get('view.pdf.tab.editorGroup') as string
        const viewer = typeof mode === 'string' ? mode : configuration.get<'tab' | 'browser' | 'external'>('view.pdf.viewer', 'tab')
        if (viewer === 'browser') {
            return lw.viewer.openBrowser(pickedRootFile)
        } else if (viewer === 'tab') {
            return lw.viewer.openTab(pickedRootFile, true, tabEditorGroup)
        } else if (viewer === 'external') {
            lw.viewer.openExternal(pickedRootFile)
            return
        }
        return
    }

    refresh() {
        logger.log('REFRESH command invoked.')
        lw.viewer.refreshExistingViewer()
    }

    kill() {
        logger.log('KILL command invoked.')
        lw.builder.kill()
    }

    pdf(uri: vscode.Uri | undefined) {
        logger.log('PDF command invoked.')
        if (uri === undefined || !uri.fsPath.endsWith('.pdf')) {
            return
        }
        return lw.viewer.openPdfInTab(uri, 'current', false)
    }

    synctex() {
        logger.log('SYNCTEX command invoked.')
        if (!vscode.window.activeTextEditor || !lw.manager.hasTexId(vscode.window.activeTextEditor.document.languageId)) {
            logger.log('Cannot start SyncTeX. The active editor is undefined, or the document is not a TeX document.')
            return
        }
        const configuration = vscode.workspace.getConfiguration('latex-workshop', lw.manager.getWorkspaceFolderRootDir())
        let pdfFile: string | undefined = undefined
        if (lw.manager.localRootFile && configuration.get('latex.rootFile.useSubFile')) {
            pdfFile = lw.manager.tex2pdf(lw.manager.localRootFile)
        } else if (lw.manager.rootFile !== undefined) {
            pdfFile = lw.manager.tex2pdf(lw.manager.rootFile)
        }
        lw.locator.syncTeX(undefined, undefined, pdfFile)
    }

    synctexonref(line: number, filePath: string) {
        logger.log('SYNCTEX command invoked on a reference.')
        if (!vscode.window.activeTextEditor || !lw.manager.hasTexId(vscode.window.activeTextEditor.document.languageId)) {
            logger.log('Cannot start SyncTeX. The active editor is undefined, or the document is not a TeX document.')
            return
        }
        lw.locator.syncTeXOnRef({line, filePath})
    }

    async clean(): Promise<void> {
        logger.log('CLEAN command invoked.')
        const rootFile = await lw.manager.findRoot()
        if (rootFile === undefined) {
            logger.log('Cannot find LaTeX root file to clean.')
            return
        }
        let pickedRootFile: string | undefined = rootFile
        if (lw.manager.localRootFile) {
            // We are using the subfile package
            pickedRootFile = await quickPickRootFile(rootFile, lw.manager.localRootFile)
            if (! pickedRootFile) {
                return
            }
        }
        return lw.cleaner.clean(pickedRootFile)
    }

    addTexRoot() {
        logger.log('ADDTEXROOT command invoked.')
        if (!vscode.window.activeTextEditor || !lw.manager.hasTexId(vscode.window.activeTextEditor.document.languageId)) {
            return
        }
        lw.texMagician.addTexRoot()
    }

    citation() {
        logger.log('CITATION command invoked.')
        lw.completer.citation.browser()
    }

    wordcount() {
        logger.log('WORDCOUNT command invoked.')
        if (!vscode.window.activeTextEditor || !lw.manager.hasTexId(vscode.window.activeTextEditor.document.languageId) ||
            lw.manager.rootFile === vscode.window.activeTextEditor.document.fileName) {
            if (lw.manager.rootFile) {
                lw.counter.count(lw.manager.rootFile)
            } else {
                logger.log('WORDCOUNT: No rootFile defined.')
            }
        } else {
            lw.counter.count(vscode.window.activeTextEditor.document.fileName, false)
        }
    }

    showLog(compiler?: string) {
        logger.log(`SHOWLOG command invoked: ${compiler || 'default'}`)
        if (compiler) {
            logger.showCompilerLog()
        } else {
            logger.showLog()
        }
    }

    gotoSection(filePath: string, lineNumber: number) {
        logger.log(`GOTOSECTION command invoked. Target ${filePath}, line ${lineNumber}`)
        const activeEditor = vscode.window.activeTextEditor

        void vscode.workspace.openTextDocument(filePath).then((doc) => {
            void vscode.window.showTextDocument(doc).then(() => {
                // input lineNumber is one-based, while editor position is zero-based.
                void vscode.commands.executeCommand('revealLine', {lineNumber, at: 'center'})
                if (activeEditor) {
                    activeEditor.selection = new vscode.Selection(new vscode.Position(lineNumber, 0), new vscode.Position(lineNumber, 0))
                }
            })
        })

    }

    navigateToEnvPair() {
        logger.log('JumpToEnvPair command invoked.')
        if (!vscode.window.activeTextEditor || !lw.manager.hasTexId(vscode.window.activeTextEditor.document.languageId)) {
            return
        }
        lw.envPair.gotoPair()
    }

    selectEnvContent() {
        logger.log('SelectEnv command invoked.')
        if (!vscode.window.activeTextEditor || !lw.manager.hasTexId(vscode.window.activeTextEditor.document.languageId)) {
            return
        }
        lw.envPair.selectEnv()
    }

    selectEnvName() {
        logger.log('SelectEnvName command invoked.')
        if (!vscode.window.activeTextEditor || !lw.manager.hasTexId(vscode.window.activeTextEditor.document.languageId)) {
            return
        }
        lw.envPair.envNameAction('selection')
    }

    multiCursorEnvName() {
        logger.log('MutliCursorEnvName command invoked.')
        if (!vscode.window.activeTextEditor || !lw.manager.hasTexId(vscode.window.activeTextEditor.document.languageId)) {
            return
        }
        lw.envPair.envNameAction('cursor')
    }

    toggleEquationEnv() {
        logger.log('toggleEquationEnv command invoked.')
        if (!vscode.window.activeTextEditor || !lw.manager.hasTexId(vscode.window.activeTextEditor.document.languageId)) {
            return
        }
        lw.envPair.envNameAction('equationToggle')
    }

    closeEnv() {
        logger.log('CloseEnv command invoked.')
        if (!vscode.window.activeTextEditor || !lw.manager.hasTexId(vscode.window.activeTextEditor.document.languageId)) {
            return
        }
        return lw.envPair.closeEnv()
    }

    async actions() {
        logger.log('ACTIONS command invoked.')
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
            return vscode.commands.executeCommand('type', { source: 'keyboard', text: '\n' })
        }
        if (modifiers === 'alt') {
            return vscode.commands.executeCommand('editor.action.insertLineAfter')
        }

        // Test if every cursor is at the end of a line starting with \item
        const allCursorsOnItem = editor.selections.every((selection: vscode.Selection) => {
                const cursorPos = selection.active
                const line = editor.document.lineAt(cursorPos.line)
                return /^\s*\\item/.test(line.text) && (line.text.substring(cursorPos.character).trim().length === 0)
        })
        if (!allCursorsOnItem) {
            return vscode.commands.executeCommand('type', { source: 'keyboard', text: '\n' })
        }

        return editor.edit(editBuilder => {
            // If we arrive here, all the cursors are at the end of a line starting with `\s*\\item`.
            // Yet, we keep the conditions for the sake of maintenance.
            for (const selection of editor.selections) {
                const cursorPos = selection.active
                const line = editor.document.lineAt(cursorPos.line)
                const indentation = line.text.substring(0, line.firstNonWhitespaceCharacterIndex)

                if (/^\s*\\item(\[\s*\])?\s*$/.test(line.text)) {
                    // The line is an empty \item or \item[]
                    const rangeToDelete = line.range.with(cursorPos.with(line.lineNumber, line.firstNonWhitespaceCharacterIndex), line.range.end)
                    editBuilder.delete(rangeToDelete)
                } else if(/^\s*\\item\[[^[\]]*\]/.test(line.text)) {
                    // The line starts with \item[blabla] or \item[] blabla
                    const itemString = `\n${indentation}\\item[] `
                    editBuilder.insert(cursorPos, itemString)
                } else if(/^\s*\\item\s*[^\s]+.*$/.test(line.text)) {
                    // The line starts with \item blabla
                    const itemString = `\n${indentation}\\item `
                    editBuilder.insert(cursorPos, itemString)
                } else {
                    // If we do not know what to do, insert a newline and indent using the current indentation
                    editBuilder.insert(cursorPos, `\n${indentation}`)
                }
            }
        })
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
            logger.log('toggleSelectedKeyword: cannot handle mixed edit and snippet actions')
        }
    }

    /**
     * Shift the level sectioning in the selection by one (up or down)
     * @param change
     */
    shiftSectioningLevel(change: 'promote' | 'demote') {
       lw.section.shiftSectioningLevel(change)
    }

    selectSection() {
        lw.section.selectSection()
    }

    devParseLog() {
        if (vscode.window.activeTextEditor === undefined) {
            return
        }
        lw.compilerLogParser.parse(vscode.window.activeTextEditor.document.getText())
    }

    async devParseTeX() {
        if (vscode.window.activeTextEditor === undefined) {
            return
        }
        const ast = await lw.pegParser.parseLatex(vscode.window.activeTextEditor.document.getText())
        return vscode.workspace.openTextDocument({content: JSON.stringify(ast, null, 2), language: 'json'}).then(doc => vscode.window.showTextDocument(doc))
    }

    async devParseBib() {
        if (vscode.window.activeTextEditor === undefined) {
            return
        }
        const ast = await lw.pegParser.parseBibtex(vscode.window.activeTextEditor.document.getText())
        return vscode.workspace.openTextDocument({content: JSON.stringify(ast, null, 2), language: 'json'}).then(doc => vscode.window.showTextDocument(doc))
    }

    texdoc(pkg?: string) {
        this._texdoc.texdoc(pkg)
    }

    texdocUsepackages() {
        this._texdoc.texdocUsepackages()
    }

    async saveActive() {
        await lw.builder.saveActive()
    }

    openMathPreviewPanel() {
        return lw.mathPreviewPanel.open()
    }

    closeMathPreviewPanel() {
        lw.mathPreviewPanel.close()
    }

    toggleMathPreviewPanel() {
        lw.mathPreviewPanel.toggle()
    }

}
