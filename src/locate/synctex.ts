import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import * as cs from 'cross-spawn'
import * as lw from '../lw'
import * as SyncTeX from './locatorlib/synctex'
import { replaceArgumentPlaceholders } from '../utils/utils'
import { isSameRealPath } from '../utils/pathnormalize'
import type { ClientRequest } from '../../types/latex-workshop-protocol-types'
import { extension } from '../extension'

const logger = extension.log('Locator')

export type SyncTeXRecordForward = {
    page: number,
    x: number,
    y: number,
    indicator: boolean
}

export type SyncTeXRecordBackward = {
    input: string,
    line: number,
    column: number
}

export class Locator {
    private parseSyncTeXForward(result: string): SyncTeXRecordForward {
        const record = Object.create(null) as { page?: number, x?: number, y?: number }
        let started = false
        for (const line of result.split('\n')) {
            if (line.includes('SyncTeX result begin')) {
                started = true
                continue
            }
            if (line.includes('SyncTeX result end')) {
                break
            }
            if (!started) {
                continue
            }
            const pos = line.indexOf(':')
            if (pos < 0) {
                continue
            }
            const key = line.substring(0, pos).toLowerCase()
            if (key !== 'page' && key !== 'x' && key !== 'y' ) {
                continue
            }
            const value = line.substring(pos + 1)
            record[key] = Number(value)
        }
        if (record.page !== undefined && record.x !== undefined && record.y !== undefined) {
            return { page: record.page, x: record.x, y: record.y, indicator: true }
        } else {
            throw(new Error('parse error when parsing the result of synctex forward.'))
        }
    }

    private parseSyncTeXBackward(result: string): SyncTeXRecordBackward {
        const record = Object.create(null) as { input?: string, line?: number, column?: number }
        let started = false
        for (const line of result.split('\n')) {
            if (line.includes('SyncTeX result begin')) {
                started = true
                continue
            }
            if (line.includes('SyncTeX result end')) {
                break
            }
            if (!started) {
                continue
            }
            const pos = line.indexOf(':')
            if (pos < 0) {
                continue
            }
            const key = line.substring(0, pos).toLowerCase()
            if (key !== 'input' && key !== 'line' && key !== 'column' ) {
                continue
            }
            const value = line.substring(pos + 1)
            if (key === 'line' || key === 'column') {
                record[key] = Number(value)
                continue
            }
            record[key] = value
        }
        if (record.input !== undefined && record.line !== undefined && record.column !== undefined) {
            return { input: record.input, line: record.line, column: record.column }
        } else {
            throw(new Error('parse error when parsing the result of synctex backward.'))
        }
    }

    /**
     * Execute forward SyncTeX with respect to `args`.
     *
     * @param args The arguments of forward SyncTeX. If `undefined`, the document and the cursor position of `activeTextEditor` are used.
     * @param forcedViewer Indicates a PDF viewer with which SyncTeX is executed.
     * @param pdfFile The path of a PDF File compiled from the `filePath` of `args`. If `undefined`, it is automatically detected.
     */
    syncTeX(args?: {line: number, filePath: string}, forcedViewer: 'auto' | 'tabOrBrowser' | 'external' = 'auto', pdfFile?: string) {
        let line: number
        let filePath: string
        let character = 0
        if (!vscode.window.activeTextEditor) {
            logger.log('No active editor found.')
            return
        }

        if (args === undefined) {
            filePath = vscode.window.activeTextEditor.document.uri.fsPath
            if (!extension.file.hasTexLangId(vscode.window.activeTextEditor.document.languageId)) {
                logger.log(`${filePath} is not valid LaTeX.`)
                return
            }
            const position = vscode.window.activeTextEditor.selection.active
            if (!position) {
                logger.log(`No cursor position from ${position}`)
                return
            }
            line = position.line + 1
            character = position.character
        } else {
            line = args.line
            filePath = args.filePath
        }
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const rootFile = extension.root.file.path
        if (rootFile === undefined) {
            logger.log('No root file found.')
            return
        }
        if (!pdfFile) {
            pdfFile = extension.file.getPdfPath(rootFile)
        }
        if (vscode.window.activeTextEditor.document.lineCount === line &&
            vscode.window.activeTextEditor.document.lineAt(line - 1).text === '') {
                line -= 1
        }
        if (forcedViewer === 'external' || (forcedViewer === 'auto' && configuration.get('view.pdf.viewer') === 'external') ) {
            this.syncTeXExternal(line, pdfFile, rootFile)
            return
        }

        const useSyncTexJs = configuration.get('synctex.synctexjs.enabled') as boolean

        if (useSyncTexJs) {
            try {
                logger.log(`Forward from ${filePath} to ${pdfFile} on line ${line}.`)
                const record = SyncTeX.syncTexJsForward(line, filePath, pdfFile)
                if (!record) {
                    return
                }
                void lw.viewer.syncTeX(pdfFile, record)
            } catch (e) {
                logger.logError('Forward SyncTeX failed.', e)
            }
        } else {
            void this.invokeSyncTeXCommandForward(line, character, filePath, pdfFile).then( (record) => {
                if (pdfFile) {
                    void lw.viewer.syncTeX(pdfFile, record)
                }
            })
        }
    }

    private invokeSyncTeXCommandForward(line: number, col: number, filePath: string, pdfFile: string): Thenable<SyncTeXRecordForward> {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const docker = configuration.get('docker.enabled')
        const args = ['view', '-i', `${line}:${col + 1}:${docker ? path.basename(filePath): filePath}`, '-o', docker ? path.basename(pdfFile): pdfFile]

        let command = configuration.get('synctex.path') as string
        if (docker) {
            if (process.platform === 'win32') {
                command = path.resolve(lw.extensionRoot, './scripts/synctex.bat')
            } else {
                command = path.resolve(lw.extensionRoot, './scripts/synctex')
                fs.chmodSync(command, 0o755)
            }
        }
        const logTag = docker ? 'Docker' : 'Legacy'
        logger.log(`Forward from ${filePath} to ${pdfFile} on line ${line}.`)
        const proc = cs.spawn(command, args, {cwd: path.dirname(pdfFile)})
        proc.stdout.setEncoding('utf8')
        proc.stderr.setEncoding('utf8')

        let stdout = ''
        proc.stdout.on('data', newStdout => {
            stdout += newStdout
        })

        let stderr = ''
        proc.stderr.on('data', newStderr => {
            stderr += newStderr
        })

        proc.on('error', err => {
            logger.logError(`(${logTag}) Forward SyncTeX failed.`, err, stderr)
        })

        return new Promise( (resolve) => {
            proc.on('exit', exitCode => {
                if (exitCode !== 0) {
                    logger.logError(`(${logTag}) Forward SyncTeX failed.`, exitCode, stderr)
                } else {
                    resolve(this.parseSyncTeXForward(stdout))
                }
            })
        })
    }

    syncTeXOnRef(args: {line: number, filePath: string}) {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const viewer = configuration.get('view.pdf.ref.viewer') as 'auto' | 'tabOrBrowser' | 'external'
        args.line += 1
        if (viewer) {
            this.syncTeX(args, viewer)
        } else {
            this.syncTeX(args)
        }
    }

    private invokeSyncTeXCommandBackward(page: number, x: number, y: number, pdfPath: string): Thenable<SyncTeXRecordBackward> {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')

        const docker = configuration.get('docker.enabled')
        const args = ['edit', '-o', `${page}:${x}:${y}:${docker ? path.basename(pdfPath): pdfPath}`]

        let command = configuration.get('synctex.path') as string
        if (docker) {
            logger.log('Use Docker to invoke the command.')
            if (process.platform === 'win32') {
                command = path.resolve(lw.extensionRoot, './scripts/synctex.bat')
            } else {
                command = path.resolve(lw.extensionRoot, './scripts/synctex')
                fs.chmodSync(command, 0o755)
            }
        }

        const logTag = docker ? 'Docker' : 'Legacy'
        logger.log(`Backward from ${pdfPath} at x=${x}, y=${y} on page ${page}.`)

        const proc = cs.spawn(command, args, {cwd: path.dirname(pdfPath)})
        proc.stdout.setEncoding('utf8')
        proc.stderr.setEncoding('utf8')

        let stdout = ''
        proc.stdout.on('data', newStdout => {
            stdout += newStdout
        })

        let stderr = ''
        proc.stderr.on('data', newStderr => {
            stderr += newStderr
        })

        proc.on('error', err => {
            logger.logError(`(${logTag}) Backward SyncTeX failed.`, err, stderr)
        })

        return new Promise( (resolve) => {
            proc.on('exit', exitCode => {
                if (exitCode !== 0) {
                    logger.logError(`(${logTag}) Backward SyncTeX failed.`, exitCode, stderr)
                } else {
                    const record = this.parseSyncTeXBackward(stdout)
                    resolve(record)
                }
            })
        })
    }

    /**
     * Execute backward SyncTeX.
     *
     * @param data The page number and the position on the page of a PDF file.
     * @param pdfPath The path of a PDF file as the input of backward SyncTeX.
     */
    async locate(data: Extract<ClientRequest, {type: 'reverse_synctex'}>, pdfPath: string) {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const docker = configuration.get('docker.enabled')
        const useSyncTexJs = configuration.get('synctex.synctexjs.enabled') as boolean
        let record: SyncTeXRecordBackward

        if (useSyncTexJs) {
            try {
                logger.log(`Backward from ${pdfPath} at x=${data.pos[0]}, y=${data.pos[1]} on page ${data.page}.`)
                const temp = SyncTeX.syncTexJsBackward(data.page, data.pos[0], data.pos[1], pdfPath)
                if (!temp) {
                    return
                }
                record = temp
            } catch (e) {
                logger.logError('Backward SyncTeX failed.', e)
                return
            }
        } else {
            record = await this.invokeSyncTeXCommandBackward(data.page, data.pos[0], data.pos[1], pdfPath)
            if (docker && process.platform === 'win32') {
                record.input = path.join(path.dirname(pdfPath), record.input.replace('/data/', ''))
            }
        }
        record.input = record.input.replace(/(\r\n|\n|\r)/gm, '')

        // kpathsea/SyncTeX follow symlinks.
        // see http://tex.stackexchange.com/questions/25578/why-is-synctex-in-tl-2011-so-fussy-about-filenames.
        // We compare the return of symlink with the files list in the texFileTree and try to pickup the correct one.
        for (const filePath of extension.cache.paths()) {
            try {
                if (isSameRealPath(record.input, filePath)) {
                    record.input = filePath
                    break
                }
            } catch(e) {
                logger.logError(`Backward SyncTeX failed on isSameRealPath() with ${record.input} and ${filePath} .`, e)
            }
        }

        const filePath = path.resolve(record.input)
        if (!fs.existsSync(filePath)) {
            logger.log(`Backward SyncTeX failed on non-existent ${filePath} .`)
            return
        }
        logger.log(`Backward SyncTeX to ${filePath} .`)
        try {
            const doc = await vscode.workspace.openTextDocument(filePath)
            let row = record.line - 1
            let col = record.column < 0 ? 0 : record.column
            // columns are typically not supplied by SyncTex, this could change in the future for some engines though
            if (col === 0) {
                [row, col] = this.getRowAndColumn(doc, row, data.textBeforeSelection, data.textAfterSelection)
            }
            const pos = new vscode.Position(row, col)

            const tab = this.findTab(doc)
            const viewColumn = tab?.group.viewColumn ?? this.getViewColumnOfVisibleTextEditor() ?? vscode.ViewColumn.Beside
            const editor = await vscode.window.showTextDocument(doc, viewColumn)
            editor.selection = new vscode.Selection(pos, pos)
            await vscode.commands.executeCommand('revealLine', {lineNumber: row, at: 'center'})
            this.animateToNotify(editor, pos)
        } catch(e: unknown) {
            logger.logError('Backward SyncTeX failed.', e)
        }
    }

    private findTab(doc: vscode.TextDocument): vscode.Tab | undefined {
        let notActive: vscode.Tab[] = []
        const docUriString = doc.uri.toString()
        for (const tabGroup of vscode.window.tabGroups.all) {
            for (const tab of tabGroup.tabs) {
                const tabInput = tab.input
                if (tabInput instanceof vscode.TabInputText) {
                    if (docUriString === tabInput.uri.toString()) {
                        if (tab.isActive) {
                            return tab
                        } else {
                            notActive.push(tab)
                        }
                    }
                }
            }
        }
        notActive = notActive.sort((a, b) => Math.max(a.group.viewColumn, 0) - Math.max(b.group.viewColumn, 0) )
        return notActive[0] || undefined
    }

    private getViewColumnOfVisibleTextEditor(): vscode.ViewColumn | undefined {
        const viewColumnArray = vscode.window.visibleTextEditors
                                .map((editor) => editor.viewColumn)
                                .filter((column): column is vscode.ViewColumn => column !== undefined)
                                .sort()
        return viewColumnArray[0]
    }

    private getRowAndColumn(doc: vscode.TextDocument, row: number, textBeforeSelectionFull: string, textAfterSelectionFull: string) {
        let tempCol = this.getColumnBySurroundingText(doc.lineAt(row).text, textBeforeSelectionFull, textAfterSelectionFull)
        if (tempCol !== null) {
            return [row, tempCol]
        }

        if (row - 1 >= 0) {
            tempCol = this.getColumnBySurroundingText(doc.lineAt(row - 1).text, textBeforeSelectionFull, textAfterSelectionFull)
            if (tempCol !== null) {
                return [row - 1, tempCol]
            }
        }

        if (row + 1 < doc.lineCount) {
            tempCol = this.getColumnBySurroundingText(doc.lineAt(row + 1).text, textBeforeSelectionFull, textAfterSelectionFull)
            if (tempCol !== null) {
                return [row + 1, tempCol]
            }
        }

        return [row, 0]
    }

    private getColumnBySurroundingText(line: string, textBeforeSelectionFull: string, textAfterSelectionFull: string) {
        let previousColumnMatches = Object.create(null) as { [k: string]: number }

        for (let length = 5; length <= Math.max(textBeforeSelectionFull.length, textAfterSelectionFull.length); length++) {
            const columns: number[] = []
            const textBeforeSelection = textBeforeSelectionFull.substring(textBeforeSelectionFull.length - length, textBeforeSelectionFull.length)
            const textAfterSelection = textAfterSelectionFull.substring(0, length)

            // Get all indexes for the before and after text
            if (textBeforeSelection !== '') {
                columns.push(...this.indexes(line, textBeforeSelection).map(index => index + textBeforeSelection.length))
            }
            if (textAfterSelection !== '') {
                columns.push(...this.indexes(line, textAfterSelection))
            }

            // Get number or occurrences for each column
            const columnMatches = Object.create(null) as { [k: string]: number }
            columns.forEach(column => columnMatches[column] = (columnMatches[column] || 0) + 1)
            const values = Object.values(columnMatches).sort()

            // At least two matches with equal fit
            if (values.length > 1 && values[0] === values[1]) {
                previousColumnMatches = columnMatches
                continue
            }
            // Only one match or one best match
            if (values.length >= 1) {
                return parseInt(Object.keys(columnMatches).reduce((a, b) => columnMatches[a] > columnMatches[b] ? a : b))
            }
            // No match in current iteration, return first best match from previous run or 0
            if (Object.keys(previousColumnMatches).length > 0) {
                return parseInt(Object.keys(previousColumnMatches).reduce((a, b) => previousColumnMatches[a] > previousColumnMatches[b] ? a : b))
            } else {
                return null
            }
        }
        // Should never be reached
        return null
    }

    private indexes(source: string, find: string) {
        const result: number[] = []
        for (let i = 0; i < source.length; ++i) {
            if (source.substring(i, i + find.length) === find) {
                result.push(i)
            }
        }
        return result
    }

    private animateToNotify(editor: vscode.TextEditor, position: vscode.Position) {
        const decoConfig = {
            borderWidth: '1px',
            borderStyle: 'solid',
            light: {
                borderColor: 'red'
            },
            dark: {
                borderColor: 'white'
            }
        }
        const range = new vscode.Range(position.line, 0, position.line, 65535)
        const deco = vscode.window.createTextEditorDecorationType(decoConfig)
        editor.setDecorations(deco, [range])
        setTimeout(() => { deco.dispose() }, 500)
    }

    private syncTeXExternal(line: number, pdfFile: string, rootFile: string) {
        if (!vscode.window.activeTextEditor) {
            return
        }
        const texFile = vscode.window.activeTextEditor.document.uri.fsPath
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const command = configuration.get('view.pdf.external.synctex.command') as string
        let args = configuration.get('view.pdf.external.synctex.args') as string[]
        if (command === '') {
            logger.log('The external SyncTeX command is empty.')
            return
        }
        if (args) {
            args = args.map(arg => {
                return replaceArgumentPlaceholders(rootFile, extension.file.tmpDirPath)(arg)
                        .replace(/%PDF%/g, pdfFile)
                        .replace(/%LINE%/g, line.toString())
                        .replace(/%TEX%/g, texFile)
            })
        }
        logger.logCommand(`Opening external viewer for SyncTeX from ${pdfFile} .`, command, args)
        const proc = cs.spawn(command, args)
        let stdout = ''
        proc.stdout.on('data', newStdout => {
            stdout += newStdout
        })
        let stderr = ''
        proc.stderr.on('data', newStderr => {
            stderr += newStderr
        })
        const cb = () => {
            void logger.log(`STDOUT: ${stdout}`)
            void logger.log(`STDERR: ${stderr}`)
        }
        proc.on('error', cb)
        proc.on('exit', cb)
    }
}
