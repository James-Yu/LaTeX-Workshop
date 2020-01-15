import * as vscode from 'vscode'
import {bibtexParser} from 'latex-utensils'
import {performance} from 'perf_hooks'

import * as bibtexUtils from '../utils/bibtexutils'
import {Extension} from '../main'

export class BibtexFormater {

    extension: Extension

    constructor(extension: Extension) {
        this.extension = extension
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
}
