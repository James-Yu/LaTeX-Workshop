import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'

import { Extension } from '../main'

export class Paster {
    extension: Extension

    constructor(extension: Extension) {
        this.extension = extension
    }

    public async paste() {
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
        if (fileUri.scheme === 'untitled') {
            vscode.window.showInformationMessage('Before paste image, you need to save current edit file first.')
            return
        }

        const clipboardContents = await vscode.env.clipboard.readText()

        if (clipboardContents === '') {
            return
        }

        if (clipboardContents.split('\n').length === 1) {
            const fpath = path.resolve(fileUri.fsPath, clipboardContents)
            if (fs.existsSync(fpath)) {
                this.pasteFile(editor, fileUri.fsPath, clipboardContents)
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
        const TABLE_FORMATS = ['.csv']
        const extension = path.extname(file)

        if (TABLE_FORMATS.indexOf(extension) !== -1) {
            const contents = fs.readFileSync(path.resolve(baseFile, file), 'utf8')
            if (extension === '.csv') {
                // from: https://stackoverflow.com/a/41563966/3026698
                let p = ''
                let row = ['']
                let i = 0
                let r = 0
                let s = !0
                let l
                const ret = [row]
                for (l of contents) {
                    if ('"' === l) {
                        if (s && l === p) {
                            row[i] += l
                        }
                        s = !s
                    } else if (',' === l && s) {
                        l = row[++i] = ''
                    } else if ('\n' === l && s) {
                        if ('\r' === p) {
                            row[i] = row[i].slice(0, -1)
                        }
                        row = ret[++r] = [(l = '')]
                        i = 0
                    } else {
                        row[i] += l
                    }
                    p = l
                }

                const rows = ret.map(r => r.join('\t'))
                const body = rows.join('\n')
                this.pasteTable(editor, body)
            }
        }
    }

    public pasteTable(editor: vscode.TextEditor, content: string) {
        this.extension.logger.addLogMessage('Pasting: Table')
        // trim surrounding whitespace
        content = content.replace(/^\s*/, '').replace(/\s*$/, '')
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
        if (!isConsistent || (cells.length === 1 && cells[0].length === 1)) {
            throw new Error('Table is not consistent')
        }

        const columnType: string = vscode.workspace.getConfiguration('latex-workshop.formattedPaste')['tableColumnType']
        const booktabs: boolean = vscode.workspace.getConfiguration('latex-workshop.formattedPaste')['tableBooktabsStyle']
        const headerRows: number = vscode.workspace.getConfiguration('latex-workshop.formattedPaste')['tableHeaderRows']
        const tabularRows = cells.map(row => '\t' + row.join(' & '))

        if (headerRows && tabularRows.length > headerRows) {
            const headSep = booktabs ? '\t\\midrule\n' : '\t\\hline\n'
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
            str = str.replace(/\n\n/g, '\uE000')
            str = str.replace(/\s+/g, ' ')
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
