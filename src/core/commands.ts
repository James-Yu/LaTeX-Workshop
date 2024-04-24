import * as vscode from 'vscode'
import * as path from 'path'
import { lw } from '../lw'
import { getSurroundingMacroRange, stripText } from '../utils/utils'

const logger = lw.log('Commander')

export async function build(skipSelection: boolean = false, rootFile: string | undefined = undefined, languageId: string | undefined = undefined, recipe: string | undefined = undefined) {
    logger.log('BUILD command invoked.')
    await lw.compile.build(skipSelection, rootFile, languageId, recipe)
}

export async function revealOutputDir() {
    let outDir = lw.file.getOutDir()
    if (!path.isAbsolute(outDir)) {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0]
        const rootDir = lw.root.dir.path || workspaceFolder?.uri.fsPath
        if (rootDir === undefined) {
            logger.log(`Cannot reveal ${vscode.Uri.file(outDir)}: no root dir can be identified.`)
            return
        }
        outDir = path.resolve(rootDir, outDir)
    }
    logger.log(`Reveal ${vscode.Uri.file(outDir)}`)
    await vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(outDir))
}

export function recipes(recipe?: string) {
    logger.log('RECIPES command invoked.')
    const configuration = vscode.workspace.getConfiguration('latex-workshop', lw.root.getWorkspace())
    const candidates = configuration.get('latex.recipes') as {name: string}[]
    if (!candidates) {
        return
    }
    if (recipe) {
        return build(false, undefined, undefined, recipe)
    }
    return vscode.window.showQuickPick(candidates.map(candidate => candidate.name), {
        placeHolder: 'Please Select a LaTeX Recipe'
    }).then(selected => {
        if (!selected) {
            return
        }
        return build(false, undefined, undefined, selected)
    })
}

export async function view(mode?: 'tab' | 'browser' | 'external' | vscode.Uri) {
    if (mode) {
        logger.log(`VIEW command invoked with mode: ${mode}.`)
    } else {
        logger.log('VIEW command invoked.')
    }
    if (!vscode.window.activeTextEditor) {
        logger.log('Cannot find active TextEditor.')
        return
    }
    if (!lw.file.hasTeXLangId(vscode.window.activeTextEditor.document.languageId)) {
        logger.log('Active document is not a TeX file.')
        return
    }
    await lw.root.find()
    const rootFile = lw.root.file.path
    if (rootFile === undefined) {
        logger.log('Cannot find LaTeX root PDF to view.')
        return
    }
    let pickedRootFile: string | undefined = rootFile
    if (lw.root.subfiles.path) {
        // We are using the subfile package
        pickedRootFile = await quickPickRootFile(rootFile, lw.root.subfiles.path, 'view')
    }
    if (!pickedRootFile) {
        return
    }
    return lw.viewer.view(lw.file.getPdfPath(pickedRootFile), typeof mode === 'string' ? mode : undefined)
}

export function refresh() {
    logger.log('REFRESH command invoked.')
    lw.viewer.refresh()
}

export function kill() {
    logger.log('KILL command invoked.')
    lw.compile.terminate()
}

export function synctex() {
    logger.log('SYNCTEX command invoked.')
    if (!vscode.window.activeTextEditor || !lw.file.hasTeXLangId(vscode.window.activeTextEditor.document.languageId)) {
        logger.log('Cannot start SyncTeX. The active editor is undefined, or the document is not a TeX document.')
        return
    }
    const configuration = vscode.workspace.getConfiguration('latex-workshop', lw.root.getWorkspace())
    let pdfFile: string | undefined = undefined
    if (lw.root.subfiles.path && configuration.get('latex.rootFile.useSubFile')) {
        pdfFile = lw.file.getPdfPath(lw.root.subfiles.path)
    } else if (lw.root.file.path !== undefined) {
        pdfFile = lw.file.getPdfPath(lw.root.file.path)
    }
    lw.locate.synctex.toPDF(undefined, undefined, pdfFile)
}

export function synctexonref(line: number, filePath: string) {
    logger.log('SYNCTEX command invoked on a reference.')
    if (!vscode.window.activeTextEditor || !lw.file.hasTeXLangId(vscode.window.activeTextEditor.document.languageId)) {
        logger.log('Cannot start SyncTeX. The active editor is undefined, or the document is not a TeX document.')
        return
    }
    lw.locate.synctex.toPDFFromRef({line, filePath})
}

export async function clean(): Promise<void> {
    logger.log('CLEAN command invoked.')
    await lw.root.find()
    const rootFile = lw.root.file.path
    if (rootFile === undefined) {
        logger.log('Cannot find LaTeX root file to clean.')
        return
    }
    let pickedRootFile: string | undefined = rootFile
    if (lw.root.subfiles.path) {
        // We are using the subfile package
        pickedRootFile = await quickPickRootFile(rootFile, lw.root.subfiles.path, 'clean')
        if (! pickedRootFile) {
            return
        }
    }
    return lw.extra.clean(pickedRootFile)
}

export function addTexRoot() {
    logger.log('ADDTEXROOT command invoked.')
    if (!vscode.window.activeTextEditor || !lw.file.hasTeXLangId(vscode.window.activeTextEditor.document.languageId)) {
        return
    }
    lw.extra.texroot()
}

export function citation() {
    logger.log('CITATION command invoked.')
    lw.completion.citation.browser()
}

export function wordcount() {
    logger.log('WORDCOUNT command invoked.')
    if (!vscode.window.activeTextEditor || !lw.file.hasTeXLangId(vscode.window.activeTextEditor.document.languageId) ||
        lw.root.file.path === vscode.window.activeTextEditor.document.fileName) {
        if (lw.root.file.path) {
            lw.extra.count(lw.root.file.path, true, true)
        } else {
            logger.log('WORDCOUNT: No rootFile defined.')
        }
    } else {
        lw.extra.count(vscode.window.activeTextEditor.document.fileName, false, true)
    }
}

export function showLog(compiler?: string) {
    logger.log(`SHOWLOG command invoked: ${compiler || 'default'}`)
    if (compiler) {
        logger.showCompilerLog()
    } else {
        logger.showLog()
    }
}

export async function gotoSection(filePath: string, lineNumber: number) {
    logger.log(`GOTOSECTION command invoked. Target ${filePath}, line ${lineNumber}`)

    const doc = await vscode.workspace.openTextDocument(filePath)
    await vscode.window.showTextDocument(doc)
    // input lineNumber is one-based, while editor position is zero-based.
    await vscode.commands.executeCommand('revealLine', { lineNumber, at: 'center' })
    if (vscode.window.activeTextEditor) {
        vscode.window.activeTextEditor.selection = new vscode.Selection(new vscode.Position(lineNumber, 0), new vscode.Position(lineNumber, 0))
        if (vscode.workspace.getConfiguration('latex-workshop').get('view.outline.sync.viewer') as boolean) {
            lw.locate.synctex.toPDF({ line: lineNumber, filePath: doc.fileName })
        }
    }
}

export function navigateToEnvPair() {
    logger.log('JumpToEnvPair command invoked.')
    if (!vscode.window.activeTextEditor || !lw.file.hasTeXLangId(vscode.window.activeTextEditor.document.languageId)) {
        return
    }
    void lw.locate.pair.goto()
}

export function selectEnvContent(mode: 'content' | 'whole') {
    logger.log('SelectEnv command invoked.')
    if (!vscode.window.activeTextEditor || !lw.file.hasTeXLangId(vscode.window.activeTextEditor.document.languageId)) {
        return
    }
    void lw.locate.pair.select(mode)
}

export function selectEnvName() {
    logger.log('SelectEnvName command invoked.')
    if (!vscode.window.activeTextEditor || !lw.file.hasTeXLangId(vscode.window.activeTextEditor.document.languageId)) {
        return
    }
    void lw.locate.pair.name('selection')
}

export function multiCursorEnvName() {
    logger.log('MutliCursorEnvName command invoked.')
    if (!vscode.window.activeTextEditor || !lw.file.hasTeXLangId(vscode.window.activeTextEditor.document.languageId)) {
        return
    }
    void lw.locate.pair.name('cursor')
}

export function toggleEquationEnv() {
    logger.log('toggleEquationEnv command invoked.')
    if (!vscode.window.activeTextEditor || !lw.file.hasTeXLangId(vscode.window.activeTextEditor.document.languageId)) {
        return
    }
    void lw.locate.pair.name('equationToggle')
}

export function closeEnv() {
    logger.log('CloseEnv command invoked.')
    if (!vscode.window.activeTextEditor || !lw.file.hasTeXLangId(vscode.window.activeTextEditor.document.languageId)) {
        return
    }
    void lw.locate.pair.close()
}

export async function changeHostName() {
    logger.log('CHANGEHOSTNAME command invoked.')
    const proceed = (await vscode.window.showInputBox({
        prompt: 'Changing LaTeX Workshop server hostname can expose your computer to the public and is under severe security risk. CORS is also disabled. Do you want to continue?',
        placeHolder: 'Type CONFIRM then [Enter] to continue. Press [ESC] to keep you safe.'
    }))?.toLowerCase() === 'confirm'
    if (!proceed) {
        return
    }
    const hostname = await vscode.window.showInputBox({
        prompt: 'Please input the new hostname that LaTeX Workshop server will listen to. This change will be reset on closing VSCode.',
        placeHolder: '127.0.0.1'
    })
    if (!hostname) {
        return
    }
    lw.server.initialize(hostname)
}

export function resetHostName() {
    logger.log('RESETHOSTNAME command invoked.')
    lw.server.initialize('127.0.0.1')
    void vscode.window.showInformationMessage('LaTeX Workshop server listening to 127.0.0.1 with CORS. You are safe now.')
}

export async function actions() {
    logger.log('ACTIONS command invoked.')
    return vscode.commands.executeCommand('workbench.view.extension.latex-workshop-activitybar').then(() => vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup'))
}

/**
 * Insert the snippet with name name.
 * @param name  the name of a snippet contained in latex.json
 */
export async function insertSnippet(name: 'wrapEnv' | 'item') {
    const editor = vscode.window.activeTextEditor
    if (!editor) {
        return
    }
    switch (name) {
        case 'wrapEnv':
            await editor.insertSnippet(new vscode.SnippetString('\n\\begin{$1}\n\t${0:${TM_SELECTED_TEXT}}\n\\end{$1}'))
            return
        case 'item':
            await editor.insertSnippet(new vscode.SnippetString('\n\\item '))
            return
        default:
            return
    }
}

/**
 * If the current line starts with \item or \item[], do the same for
 * the new line when hitting enter.
 * Note that hitting enter on a line containing only \item or \item[]
 * actually deletes the content of the line.
 */
export function onEnterKey(modifiers?: string) {
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
export async function toggleSelectedKeyword(keyword: string) {
    const editor = vscode.window.activeTextEditor
    if (editor === undefined) {
        return
    }

    const editActions: {range: vscode.Range, text: string}[] = []
    const snippetActions: vscode.Position[] = []

    for (const selection of editor.selections) {
        // If the selection is empty, determine if a snippet should be inserted or the cursor is inside \keyword{...}
        if (selection.isEmpty) {
            const surroundingCommandRange = getSurroundingMacroRange(keyword, selection.anchor, editor.document)
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
export function shiftSectioningLevel(change: 'promote' | 'demote') {
    lw.extra.section(change)
}

export function selectSection() {
    lw.extra.section('select')
}

export function devParseLog() {
    if (vscode.window.activeTextEditor === undefined) {
        return
    }
    lw.parser.parse.log(vscode.window.activeTextEditor.document.getText())
}

export async function devParseTeX() {
    if (vscode.window.activeTextEditor === undefined) {
        return
    }
    const ast = await lw.parser.parse.tex(vscode.window.activeTextEditor.document.getText())
    return vscode.workspace.openTextDocument({content: JSON.stringify(ast, null, 2), language: 'json'}).then(doc => vscode.window.showTextDocument(doc))
}

export async function devParseBib() {
    if (vscode.window.activeTextEditor === undefined) {
        return
    }
    const ast = await lw.parser.parse.bib(vscode.window.activeTextEditor.document.getText())
    return vscode.workspace.openTextDocument({content: JSON.stringify(ast, null, 2), language: 'json'}).then(doc => vscode.window.showTextDocument(doc))
}

export async function devStripText() {
    if (vscode.window.activeTextEditor === undefined) {
        return
    }
    const content = stripText(vscode.window.activeTextEditor.document.getText())
    return vscode.workspace.openTextDocument({content}).then(doc => vscode.window.showTextDocument(doc))
}

export function texdoc(packageName?: string) {
    lw.extra.texdoc(packageName)
}

export function texdocUsepackages() {
    lw.extra.texdoc(undefined, true)
}

export async function saveActive() {
    lw.compile.lastAutoBuildTime = Date.now()
    await vscode.window.activeTextEditor?.document.save()
}

export function openMathPreviewPanel() {
    lw.preview.mathpreview.toggle('open')
}

export function closeMathPreviewPanel() {
    lw.preview.mathpreview.toggle('close')
}

export function toggleMathPreviewPanel() {
    lw.preview.mathpreview.toggle()
}

async function quickPickRootFile(rootFile: string, localRootFile: string, verb: string): Promise<string | undefined> {
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
        placeHolder: `Subfiles package detected. Which file to ${verb}?`,
        matchOnDescription: true
    }).then( selected => {
        if (!selected) {
            return
        }
        switch (selected.label) {
            case 'Default root file':
                return rootFile
            case 'Subfiles package root file':
                return localRootFile
            default:
                return
        }
    })
    return pickedRootFile
}
