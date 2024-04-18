import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import * as cs from 'cross-spawn'
import { lw } from '../lw'
import type { SyncTeXRecordToPDF, SyncTeXRecordToPDFAll, SyncTeXRecordToTeX } from '../types'
import { syncTeXToPDF, syncTeXToTeX } from './synctex/worker'
import { replaceArgumentPlaceholders } from '../utils/utils'
import { isSameRealPath } from '../utils/pathnormalize'
import type { ClientRequest } from '../../types/latex-workshop-protocol-types'

const logger = lw.log('Locator')

export const synctex = {
    toPDF,
    toPDFFromRef,
    toTeX
}

/**
 * Parse the result of SyncTeX forward to PDF.
 *
 * This function takes the result of SyncTeX forward to PDF as a string and
 * parses it to extract page number, x-coordinate, y-coordinate, and whether the
 * red indicator should be shown in the viewer.
 *
 * @param result - The result string of SyncTeX forward to PDF.
 * @returns A SyncTeXRecordToPDF object containing page number, x-coordinate,
 * y-coordinate, and an indicator.
 * @throws Error if there is a parsing error.
 */
function parseToPDF(result: string): SyncTeXRecordToPDF {
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

/**
 * Parse the result of SyncTeX forward to PDF with a list.
 *
 * This function takes the result of SyncTeX forward to PDF as a string and
 * parses it to extract page number, x-coordinate, y-coordinate, box-based
 * coordinates (h, v, H, W), and whether the red indicator should be shown in
 * the viewer.
 *
 * @param result - The result string of SyncTeX forward to PDF.
 * @returns A SyncTeXRecordToPDFAllList object containing a list of records,
 * with each record containing page number, x-coordinate, y-coordinate,
 * h-coordinate, v-coordinate, H-coordinate, W-coordinate, and an indicator.
 * @throws Error if there is a parsing error.
 */
function parseToPDFList(result: string): SyncTeXRecordToPDFAll[] {
    const records: SyncTeXRecordToPDFAll[] = []
    let started = false
    let recordIndex = -1

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

        const key = line.substring(0, pos)
        const value = line.substring(pos + 1).trim()

        if (key === 'Output') {
            recordIndex += 1
            const record: SyncTeXRecordToPDFAll = { page: 0, x: 0, y: 0, h: 0, v: 0, W: 0, H: 0, indicator: true }
            records[recordIndex] = record
        }

        if (key === 'Page' || key === 'h' || key === 'v' || key === 'W' || key === 'H' || key === 'x' || key === 'y') {
            const record = records[recordIndex]
            if (record) {
                if (key === 'Page') {
                    record['page'] = Number(value)
                } else {
                    record[key] = Number(value)
                }
            }
        }
    }

    if (recordIndex !== -1) {
        return records
    } else {
        throw(new Error('parse error when parsing the result of synctex forward.'))
    }
}

/**
 * Parse the result of SyncTeX backward to TeX.
 *
 * This function takes the result of SyncTeX backward to TeX as a string and
 * parses it to extract input file, line number, and column number.
 *
 * @param result - The result string of SyncTeX backward to TeX.
 * @returns A SyncTeXRecordToTeX object containing input file, line number, and
 * column number.
 * @throws Error if there is a parsing error.
 */
// function parseToTeX(result: string): SyncTeXRecordToTeX {
//     const record = Object.create(null) as { input?: string, line?: number, column?: number }
//     let started = false
//     for (const line of result.split('\n')) {
//         if (line.includes('SyncTeX result begin')) {
//             started = true
//             continue
//         }
//         if (line.includes('SyncTeX result end')) {
//             break
//         }
//         if (!started) {
//             continue
//         }
//         const pos = line.indexOf(':')
//         if (pos < 0) {
//             continue
//         }
//         const key = line.substring(0, pos).toLowerCase()
//         if (key !== 'input' && key !== 'line' && key !== 'column' ) {
//             continue
//         }
//         const value = line.substring(pos + 1)
//         if (key === 'line' || key === 'column') {
//             record[key] = Number(value)
//             continue
//         }
//         record[key] = value
//     }
//     if (record.input !== undefined && record.line !== undefined && record.column !== undefined) {
//         return { input: record.input, line: record.line, column: record.column }
//     } else {
//         throw(new Error('parse error when parsing the result of synctex backward.'))
//     }
// }

/**
 * Execute forward SyncTeX with respect to the provided arguments.
 *
 * This function performs a forward SyncTeX operation based on the provided
 * arguments. If arguments are not provided, it uses the active text editor's
 * document and cursor position. The forward SyncTeX can be executed with a
 * specific PDF viewer, and the PDF file can be specified.
 *
 * @param args - The arguments of forward SyncTeX. If undefined, the document
 * and cursor position of activeTextEditor are used.
 * @param forcedViewer - Indicates a PDF viewer with which SyncTeX is executed
 * ('auto', 'tabOrBrowser', or 'external').
 * @param pdfFile - The path of a PDF File compiled from the filePath of args.
 * If undefined, it is automatically detected.
 */
function toPDF(args?: {line: number, filePath: string}, forcedViewer: 'auto' | 'tabOrBrowser' | 'external' = 'auto', pdfFile?: string) {
    let line: number
    let filePath: string
    let character = 0
    if (!vscode.window.activeTextEditor) {
        logger.log('No active editor found.')
        return
    }

    if (args === undefined) {
        filePath = vscode.window.activeTextEditor.document.uri.fsPath
        if (!lw.file.hasTeXLangId(vscode.window.activeTextEditor.document.languageId)) {
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
    const rootFile = lw.root.file.path
    if (rootFile === undefined) {
        logger.log('No root file found.')
        return
    }
    const targetPdfFile = pdfFile ?? lw.file.getPdfPath(rootFile)
    if (vscode.window.activeTextEditor.document.lineCount === line &&
        vscode.window.activeTextEditor.document.lineAt(line - 1).text === '') {
            line -= 1
    }
    if (forcedViewer === 'external' || (forcedViewer === 'auto' && configuration.get('view.pdf.viewer') === 'external') ) {
        syncTeXExternal(line, targetPdfFile, rootFile)
        return
    }

    callSyncTeXToPDF(line, character, filePath, targetPdfFile, configuration.get('synctex.indicator') as 'none' | 'circle' | 'rectangle').then((record) => {
        void lw.viewer.locate(targetPdfFile, record)
    }).catch(() => {
        try {
            logger.log(`Forward with synctex.js from ${filePath} to ${pdfFile} on line ${line}.`)
            const record = syncTeXToPDF(line, filePath, targetPdfFile)
            if (!record) {
                return
            }
            void lw.viewer.locate(targetPdfFile, record)
        } catch (e) {
            logger.logError('Forward SyncTeX failed.', e)
        }
    })
}

/**
 * Call SyncTeX to PDF for a specific line and character position. If SyncTeX
 * call failed, raise an exception.
 *
 * This function calls the SyncTeX binary to retrieve PDF information for a
 * given line and character position in a TeX file. It returns a promise
 * resolving to a SyncTeXRecordToPDF object.
 *
 * @param line - The line number in the TeX file.
 * @param col - The character position (column) in the line.
 * @param filePath - The path of the TeX file.
 * @param pdfFile - The path of the PDF file.
 * @param indicator - The type of the SyncTex indicator.
 * @returns A promise resolving to a SyncTeXRecordToPDF object or a
 * SyncTeXRecordToPDF[] object.
 */
function callSyncTeXToPDF(line: number, col: number, filePath: string, pdfFile: string, indicator: 'none' | 'circle' | 'rectangle'): Promise<SyncTeXRecordToPDF>
function callSyncTeXToPDF(line: number, col: number, filePath: string, pdfFile: string, indicator: 'none' | 'circle' | 'rectangle'): Promise<SyncTeXRecordToPDFAll[]>
function callSyncTeXToPDF(line: number, col: number, filePath: string, pdfFile: string, indicator: 'none' | 'circle' | 'rectangle'): Promise<SyncTeXRecordToPDF> | Promise<SyncTeXRecordToPDFAll[]> {
    const configuration = vscode.workspace.getConfiguration('latex-workshop')
    const docker = configuration.get('docker.enabled')

    const args = ['view', '-i'].concat([
        `${line}${indicator === 'rectangle' ? ':0' : `:${col + 1}`}:${docker ? path.basename(filePath) : filePath}`,
        '-o',
        docker ? path.basename(pdfFile) : pdfFile
    ])

    let command = configuration.get('synctex.path') as string
    if (docker) {
        if (process.platform === 'win32') {
            command = path.resolve(lw.extensionRoot, './scripts/synctex.bat')
        } else {
            command = path.resolve(lw.extensionRoot, './scripts/synctex')
            fs.chmodSync(command, 0o755)
        }
    }
    const logTag = docker ? 'Docker' : 'SyncTeX'
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

    return new Promise<SyncTeXRecordToPDF | SyncTeXRecordToPDFAll[]>( (resolve, reject) => {
        proc.on('error', err => {
            logger.logError(`(${logTag}) Forward SyncTeX failed, fallback to synctex.js.`, err, stderr)
            reject()
        })

        proc.on('exit', exitCode => {
            if (exitCode !== 0) {
                logger.logError(`(${logTag}) Forward SyncTeX failed, fallback to synctex.js.`, exitCode, stderr)
                reject()
            } else {
                const record = indicator === 'rectangle' ? parseToPDFList(stdout) : parseToPDF(stdout)
                if (!Array.isArray(record)) {
                    record.indicator = indicator !== 'none'
                }
                resolve(record)
            }
        })
    }) as Promise<SyncTeXRecordToPDF> | Promise<SyncTeXRecordToPDFAll[]>
}

/**
 * Execute forward SyncTeX based on the provided arguments and viewer
 * preference.
 *
 * This function is a wrapper for `toPDF`, specifically designed to be called
 * from reference commands. It adjusts the line number and invokes `toPDF` with
 * the specified viewer preference.
 *
 * @param args - The arguments of forward SyncTeX, including line number and
 * file path.
 */
function toPDFFromRef(args: {line: number, filePath: string}) {
    const configuration = vscode.workspace.getConfiguration('latex-workshop')
    const viewer = configuration.get('view.pdf.ref.viewer') as 'auto' | 'tabOrBrowser' | 'external'
    args.line += 1
    if (viewer) {
        toPDF(args, viewer)
    } else {
        toPDF(args)
    }
}

/**
 * Call SyncTeX to TeX for a specific page and coordinates.
 *
 * This function calls the SyncTeX binary to retrieve TeX information for a
 * given page and coordinates in a PDF. It returns a promise resolving to a
 * SyncTeXRecordToTeX object.
 *
 * @param page - The page number in the PDF.
 * @param x - The x-coordinate on the page.
 * @param y - The y-coordinate on the page.
 * @param pdfPath - The path of the PDF file.
 * @returns A promise resolving to a SyncTeXRecordToTeX object.
 */
// function callSyncTeXToTeX(page: number, x: number, y: number, pdfPath: string): Thenable<SyncTeXRecordToTeX> {
//     const configuration = vscode.workspace.getConfiguration('latex-workshop')

//     const docker = configuration.get('docker.enabled')
//     const args = ['edit', '-o', `${page}:${x}:${y}:${docker ? path.basename(pdfPath): pdfPath}`]

//     let command = configuration.get('synctex.path') as string
//     if (docker) {
//         logger.log('Use Docker to invoke the command.')
//         if (process.platform === 'win32') {
//             command = path.resolve(lw.extensionRoot, './scripts/synctex.bat')
//         } else {
//             command = path.resolve(lw.extensionRoot, './scripts/synctex')
//             fs.chmodSync(command, 0o755)
//         }
//     }

//     const logTag = docker ? 'Docker' : 'Legacy'
//     logger.log(`Backward from ${pdfPath} at x=${x}, y=${y} on page ${page}.`)

//     const proc = cs.spawn(command, args, {cwd: path.dirname(pdfPath)})
//     proc.stdout.setEncoding('utf8')
//     proc.stderr.setEncoding('utf8')

//     let stdout = ''
//     proc.stdout.on('data', newStdout => {
//         stdout += newStdout
//     })

//     let stderr = ''
//     proc.stderr.on('data', newStderr => {
//         stderr += newStderr
//     })


//     return new Promise( (resolve, reject) => {
//         proc.on('error', err => {
//             logger.logError(`(${logTag}) Backward SyncTeX failed.`, err, stderr)
//             reject()
//         })
//         proc.on('exit', exitCode => {
//             if (exitCode !== 0) {
//                 logger.logError(`(${logTag}) Backward SyncTeX failed.`, exitCode, stderr)
//                 reject()
//             } else {
//                 const record = parseToTeX(stdout)
//                 resolve(record)
//             }
//         })
//     })
// }

/**
 * Execute backward SyncTeX to locate TeX source.
 *
 * This function performs a backward SyncTeX operation to locate the TeX source
 * corresponding to a position in a PDF file. It opens the TeX source file and
 * scrolls to the specified position.
 *
 * @param data - ClientRequest data containing the type ('reverse_synctex') and
 * position information.
 * @param pdfPath - The path of the PDF file.
 */
async function toTeX(data: Extract<ClientRequest, {type: 'reverse_synctex'}>, pdfPath: string) {
    let record: SyncTeXRecordToTeX

    // We only use synctex.js for backward sync as the binary cannot handle CJK encodings #4239.
    //
    // const configuration = vscode.workspace.getConfiguration('latex-workshop')
    // const docker = configuration.get('docker.enabled')
    // try {
    //     record = await callSyncTeXToTeX(data.page, data.pos[0], data.pos[1], pdfPath)
    //     if (docker && process.platform === 'win32') {
    //         record.input = path.join(path.dirname(pdfPath), record.input.replace('/data/', ''))
    //     }
    // } catch {
    // }
    try {
        logger.log(`Backward from ${pdfPath} at x=${data.pos[0]}, y=${data.pos[1]} on page ${data.page}.`)
        const temp = syncTeXToTeX(data.page, data.pos[0], data.pos[1], pdfPath)
        if (!temp) {
            return
        }
        record = temp
    } catch (e) {
        logger.logError('Backward SyncTeX failed.', e)
        return
    }
    record.input = record.input.replace(/(\r\n|\n|\r)/gm, '')

    // kpathsea/SyncTeX follow symlinks.
    // see http://tex.stackexchange.com/questions/25578/why-is-synctex-in-tl-2011-so-fussy-about-filenames.
    // We compare the return of symlink with the files list in the texFileTree and try to pickup the correct one.
    for (const ed of lw.cache.paths()) {
        try {
            if (isSameRealPath(record.input, ed)) {
                record.input = ed
                break
            }
        } catch(e) {
            logger.logError(`Backward SyncTeX failed on isSameRealPath() with ${record.input} and ${ed} .`, e)
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
            [row, col] = getRowAndColumn(doc, row, data.textBeforeSelection, data.textAfterSelection)
        }
        const pos = new vscode.Position(row, col)

        const tab = findTab(doc)
        const viewColumn = tab?.group.viewColumn ?? getViewColumnOfVisibleTextEditor() ?? vscode.ViewColumn.Beside
        const editor = await vscode.window.showTextDocument(doc, viewColumn)
        editor.selection = new vscode.Selection(pos, pos)
        await vscode.commands.executeCommand('revealLine', {lineNumber: row, at: 'center'})
        animateToNotify(editor, pos)
    } catch(e: unknown) {
        logger.logError('Backward SyncTeX failed.', e)
    }
}

/**
 * Find the first tab containing the specified document.
 *
 * This function searches for the first tab containing the specified document
 * URI. If the document is not found in active tabs, it returns undefined.
 *
 * @param doc - The TextDocument for which to find the tab.
 * @returns The first tab containing the document or undefined if not found.
 */
function findTab(doc: vscode.TextDocument): vscode.Tab | undefined {
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

/**
 * Get the view column of the first visible text editor.
 *
 * This function returns the view column of the first visible text editor if
 * any. If no visible text editors are found, it returns undefined.
 *
 * @returns The view column of the first visible text editor or undefined.
 */
function getViewColumnOfVisibleTextEditor(): vscode.ViewColumn | undefined {
    const viewColumnArray = vscode.window.visibleTextEditors
                            .map((editor) => editor.viewColumn)
                            .filter((column): column is vscode.ViewColumn => column !== undefined)
                            .sort()
    return viewColumnArray[0]
}

/**
 * Get the row and column based on surrounding text.
 *
 * This function calculates the row and column based on the surrounding text in
 * the specified document, considering the text before and after the selection.
 *
 * @param doc - The TextDocument in which to search for the position.
 * @param row - The initial row for the search.
 * @param textBeforeSelectionFull - The full text before the selection.
 * @param textAfterSelectionFull - The full text after the selection.
 * @returns An array containing the row and column.
 */
function getRowAndColumn(doc: vscode.TextDocument, row: number, textBeforeSelectionFull: string, textAfterSelectionFull: string) {
    let tempCol = getColumnBySurroundingText(doc.lineAt(row).text, textBeforeSelectionFull, textAfterSelectionFull)
    if (tempCol !== null) {
        return [row, tempCol]
    }

    if (row - 1 >= 0) {
        tempCol = getColumnBySurroundingText(doc.lineAt(row - 1).text, textBeforeSelectionFull, textAfterSelectionFull)
        if (tempCol !== null) {
            return [row - 1, tempCol]
        }
    }

    if (row + 1 < doc.lineCount) {
        tempCol = getColumnBySurroundingText(doc.lineAt(row + 1).text, textBeforeSelectionFull, textAfterSelectionFull)
        if (tempCol !== null) {
            return [row + 1, tempCol]
        }
    }

    return [row, 0]
}

/**
 * Get the column based on surrounding text.
 *
 * This function calculates the column based on the surrounding text in the
 * specified line, considering the text before and after the selection.
 *
 * @param line - The line of text in which to search for the column.
 * @param textBeforeSelectionFull - The full text before the selection.
 * @param textAfterSelectionFull - The full text after the selection.
 * @returns The calculated column.
 */
function getColumnBySurroundingText(line: string, textBeforeSelectionFull: string, textAfterSelectionFull: string) {
    let previousColumnMatches = Object.create(null) as { [k: string]: number }

    for (let length = 5; length <= Math.max(textBeforeSelectionFull.length, textAfterSelectionFull.length); length++) {
        const columns: number[] = []
        const textBeforeSelection = textBeforeSelectionFull.substring(textBeforeSelectionFull.length - length, textBeforeSelectionFull.length)
        const textAfterSelection = textAfterSelectionFull.substring(0, length)

        // Get all indexes for the before and after text
        if (textBeforeSelection !== '') {
            columns.push(...indexes(line, textBeforeSelection).map(index => index + textBeforeSelection.length))
        }
        if (textAfterSelection !== '') {
            columns.push(...indexes(line, textAfterSelection))
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

/**
 * Find all indexes of a substring in a source string.
 *
 * This function returns an array containing all indexes of the specified
 * substring in the source string.
 *
 * @param source - The source string in which to find the indexes.
 * @param find - The substring to search for.
 * @returns An array of indexes.
 */
function indexes(source: string, find: string) {
    const result: number[] = []
    for (let i = 0; i < source.length; ++i) {
        if (source.substring(i, i + find.length) === find) {
            result.push(i)
        }
    }
    return result
}

/**
 * Animate to notify the user about a specific position.
 *
 * This function animates to notify the user about a specific position by
 * highlighting the line. It creates a temporary decoration with a border around
 * the line and disposes it after 500 milliseconds.
 *
 * @param editor - The TextEditor in which to animate.
 * @param position - The Position to animate.
 */
function animateToNotify(editor: vscode.TextEditor, position: vscode.Position) {
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

/**
 * Execute external SyncTeX with a specified PDF viewer.
 *
 * This function executes an external SyncTeX operation using a specified PDF
 * viewer. It constructs the command and arguments based on user configuration.
 *
 * @param line - The line number in the PDF.
 * @param pdfFile - The path of the PDF file.
 * @param rootFile - The path of the root TeX file.
 */
function syncTeXExternal(line: number, pdfFile: string, rootFile: string) {
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
            return replaceArgumentPlaceholders(rootFile, lw.file.tmpDirPath)(arg)
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
