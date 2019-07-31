import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import * as csv from 'csv-parser'

import { Extension } from '../main'

export class Paster {
    extension: Extension

    constructor(extension: Extension) {
        this.extension = extension
    }

    public async pasteFormatted() {
        this.extension.logger.addLogMessage('Performing formatted paste')

        // get current edit file path
        const editor = vscode.window.activeTextEditor
        if (!editor) {
            return
        }

        const fileUri = editor.document.uri
        if (!fileUri) {
            return
        }

        const clipboardContents = await vscode.env.clipboard.readText()

        // if empty try pasting an image from clipboard
        if (clipboardContents === '') {
            if (this.extension.utilities) {
                this.extension.utilities.exports.pasteImage()
            } else {
                vscode.window.showInformationMessage('Install LaTeX Utilities to paste images')
            }
        }

        if (clipboardContents.split('\n').length === 1) {
            let filePath: string
            let basePath: string
            if (fileUri.scheme === 'untitled') {
                filePath = clipboardContents
                basePath = ''
            } else {
                filePath = path.resolve(fileUri.fsPath, clipboardContents)
                basePath = fileUri.fsPath
            }

            if (fs.existsSync(filePath)) {
                this.pasteFile(editor, basePath, clipboardContents)

                return
            }
        }
        // if not pasting file
        try {
            this.pasteTable(editor, clipboardContents)
        } catch (error) {
            this.pasteNormal(editor, this.reformatText(clipboardContents))
        }
    }

    public pasteNormal(editor: vscode.TextEditor, content: string) {
        editor.edit(edit => {
            const current = editor.selection

            if (current.isEmpty) {
                edit.insert(current.start, content)
            } else {
                edit.replace(current, content)
            }
        })
    }

    public pasteFile(editor: vscode.TextEditor, baseFile: string, file: string) {
        const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.eps', '.pdf']
        const TABLE_FORMATS = ['.csv']
        const extension = path.extname(file)

        if (IMAGE_EXTENSIONS.indexOf(extension) !== -1) {
            if (this.extension.utilities) {
                this.extension.utilities.exports.pasteImage(file)
            } else {
                vscode.window.showInformationMessage('Install LaTeX Utilities to paste images')
            }
        } else if (TABLE_FORMATS.indexOf(extension) !== -1) {
            if (extension === '.csv') {
                const rows: string[] = []

                fs.createReadStream(path.resolve(baseFile, file))
                    .pipe(csv())
                    .on('data', data => rows.push(Object.values(data).join('\t')))
                    .on('end', () => {
                        const body = rows.join('\n')
                        this.pasteTable(editor, body)
                    })
            }
        }
    }

    public pasteTable(editor: vscode.TextEditor, content: string) {
        this.extension.logger.addLogMessage('Pasting: Table')
        const trimUnwantedWhitespace = (s: string) =>
            s.replace(/^[^\S\t]+|[^\S\t]+$/gm, '').replace(/^[\uFEFF\xA0]+|[\uFEFF\xA0]+$/gm, '')
        content = trimUnwantedWhitespace(content)
        content = this.reformatText(content, false)
        const lines = content.split('\n')
        const cells = lines.map(l => l.split('\t'))

        // determine if all rows have same number of cells
        const isConsistent = cells.reduce((accumulator, current, _index, array) => {
            if (current.length === array[0].length) {
                return accumulator
            } else {
                return false
            }
        }, true)
        if (!isConsistent) {
            throw new Error('Table is not consistent')
        } else if (cells.length === 1 && cells[0].length === 1) {
            this.pasteNormal(editor, content)

            return
        }

        const configuration = vscode.workspace.getConfiguration('latex-workshop.formattedPaste')

        const columnType: string = configuration.tableColumnType
        const booktabs: boolean = configuration.tableBooktabsStyle
        const headerRows: number = configuration.tableHeaderRows

        const tabularRows = cells.map(row => '\t' + row.join(' & '))

        if (headerRows && tabularRows.length > headerRows) {
            const eol = editor.document.eol === vscode.EndOfLine.LF ? '\n' : '\r\n'
            const headSep = '\t' + (booktabs ? '\\midrule' : '\\hline') + eol
            tabularRows[headerRows] = headSep + tabularRows[headerRows]
        }
        let tabularContents = tabularRows.join(' \\\\\n')
        if (booktabs) {
            tabularContents = '\t\\toprule\n' + tabularContents + ' \\\\\n\t\\bottomrule'
        }
        const tabular = `\\begin{tabular}{${columnType.repeat(cells[0].length)}}\n${tabularContents}\n\\end{tabular}`

        editor.edit(edit => {
            const current = editor.selection

            if (current.isEmpty) {
                edit.insert(current.start, tabular)
            } else {
                edit.replace(current, tabular)
            }
        })
    }

    public reformatText(text: string, removeBonusWhitespace = true) {
        function doRemoveBonusWhitespace(str: string) {
            str = str.replace(/\u200B/g, '') // get rid of zero-width spaces
            str = str.replace(/\n{2,}/g, '\uE000') // 'save' multi-newlines to private use character
            str = str.replace(/\s+/g, ' ') // replace all whitespace with normal space
            str = str.replace(/\uE000/g, '\n\n')

            return str
        }

        if (removeBonusWhitespace) {
            text = doRemoveBonusWhitespace(text)
        }

        const textReplacements = {
            // escape latex special characters
            '\\\\': '\\textbackslash',
            '&/': '\\&',
            '%/': '\\%',
            '$/': '\\$',
            '#/': '\\#',
            '_/': '\\_',
            '^/': '\\textasciicircum',
            '{/': '\\{',
            '}/': '\\}',
            '~/': '\\textasciitilde',
            // dumb quotes
            '"([^"]+)"': "``$1''",
            "'([^']+)'": "`$1'",
            // 'smart' quotes
            '“': '``',
            '”': "''",
            '‘': '`',
            '’': "'",
            // unicode symbols
            '—': '---', // em dash
            '–': '--', // en dash
            '−': '-', // minus sign
            '…': '\\ldots', // elipses
            '‐': '-', // hyphen
            '™': '\\texttrademark', // trade mark
            '®': '\\textregistered', // registered trade mark
            '©': '\\textcopyright', // copyright
            '¢': '\\cent', // copyright
            '£': '\\pound', // copyright
            // unicode math
            '×': '\\(\\times \\)',
            '÷': '\\(\\div \\)',
            '±': '\\(\\pm \\)',
            '→': '\\(\\to \\)',
            '°': '\\(^\\circ \\)',
            '≤': '\\(\\leq \\)',
            '≥': '\\(\\geq \\)',
            // typographic approximations
            '\\.\\.\\.': '\\ldots',
            '-{20,}': '\\hline',
            '-{2,3}>': '\\(\\longrightarrow \\)',
            '->': '\\(\\to \\)',
            '<-{2,3}': '\\(\\longleftarrow \\)',
            '<-': '\\(\\leftarrow \\)'
        }

        for (const pattern in textReplacements) {
            text = text.replace(new RegExp(pattern, 'g'), textReplacements[pattern])
        }

        return text
    }
}
