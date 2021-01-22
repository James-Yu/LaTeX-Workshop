import * as vscode from 'vscode'
import {bibtexParser} from 'latex-utensils'
import {performance} from 'perf_hooks'

import * as bibtexUtils from '../utils/bibtexutils'
import type {Extension} from '../main'

export class BibtexFormatter {

    private readonly extension: Extension
    readonly duplicatesDiagnostics: vscode.DiagnosticCollection
    diags: vscode.Diagnostic[]

    constructor(extension: Extension) {
        this.extension = extension
        this.duplicatesDiagnostics = vscode.languages.createDiagnosticCollection('BibTeX')
        this.diags = []
    }

    async bibtexFormat(sort: boolean, align: boolean) {
        if (!vscode.window.activeTextEditor) {
            this.extension.logger.addLogMessage('Exit formatting. The active textEditor is undefined.')
            return
        }
        if (vscode.window.activeTextEditor.document.languageId !== 'bibtex') {
            this.extension.logger.addLogMessage('Exit formatting. The active textEditor is not of bibtex type.')
            return
        }
        const doc = vscode.window.activeTextEditor.document
        const t0 = performance.now() // Measure performance
        this.duplicatesDiagnostics.clear()
        this.extension.logger.addLogMessage('Start bibtex formatting on user request.')
        const edits = await this.formatDocument(doc, sort, align)
        if (edits.length === 0) {
            return
        }
        const edit = new vscode.WorkspaceEdit()
        edits.forEach(e => {
            edit.replace(doc.uri, e.range, e.newText)
        })

        vscode.workspace.applyEdit(edit).then(success => {
            if (success) {
                this.duplicatesDiagnostics.set(doc.uri, this.diags)
                const t1 = performance.now()
                this.extension.logger.addLogMessage(`BibTeX action successful. Took ${t1 - t0} ms.`)
            } else {
                this.extension.logger.showErrorMessage('Something went wrong while processing the bibliography.')
            }
        })

    }

    public async formatDocument(document: vscode.TextDocument, sort: boolean, align: boolean, range?: vscode.Range): Promise<vscode.TextEdit[]> {
        // Get configuration
        const config = vscode.workspace.getConfiguration('latex-workshop')
        const handleDuplicates = config.get('bibtex-format.handleDuplicates') as 'Ignore Duplicates' | 'Highlight Duplicates' | 'Comment Duplicates'
        const leftright = config.get('bibtex-format.surround') === 'Curly braces' ? [ '{', '}' ] : [ '"', '"']
        let tabs: string | undefined = bibtexUtils.getBibtexFormatTab(config)
        if (tabs === undefined) {
            this.extension.logger.addLogMessage(`Wrong value for bibtex-format.tab: ${config.get('bibtex-format.tab')}`)
            this.extension.logger.addLogMessage('Setting bibtex-format.tab to \'2 spaces\'')
            tabs = '  '
        }
        const configuration: bibtexUtils.BibtexFormatConfig = {
            tab: tabs,
            case: config.get('bibtex-format.case') as ('UPPERCASE' | 'lowercase'),
            left: leftright[0],
            right: leftright[1],
            trailingComma: config.get('bibtex-format.trailingComma') as boolean,
            sort: config.get('bibtex-format.sortby') as string[],
            alignOnEqual: config.get('bibtex-format.align-equal.enabled') as boolean
        }
        const lineOffset = range ? range.start.line : 0
        const columnOffset = range ? range.start.character : 0

        const ast = await this.extension.pegParser.parseBibtex(document.getText(range)).catch((error) => {
            if (error instanceof(Error)) {
                this.extension.logger.addLogMessage('Bibtex parser failed.')
                this.extension.logger.addLogMessage(error.message)
                this.extension.logger.showErrorMessage('Bibtex parser failed with error: ' + error.message)
            }
            return undefined
        })
        if (! ast) {
            return []
        }
        // Create an array of entries and of their starting locations
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

        // Get the sorted locations
        let sortedEntryLocations: vscode.Range[] = []
        const duplicates = new Set<bibtexParser.Entry>()
        if (sort) {
            entries.sort(bibtexUtils.bibtexSort(configuration.sort, duplicates)).forEach(entry => {
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
        this.duplicatesDiagnostics.clear()
        const edits: vscode.TextEdit[] = []
        this.diags = []
        let lineDelta = 0
        let text: string
        let isDuplicate: boolean
        for (let i = 0; i < entries.length; i++) {
            if (align) {
                text = bibtexUtils.bibtexFormat(entries[i], configuration)
            } else {
                text = document.getText(sortedEntryLocations[i])
            }

            isDuplicate = duplicates.has(entries[i])
            if (isDuplicate && handleDuplicates !== 'Ignore Duplicates') {
                if (handleDuplicates === 'Highlight Duplicates') {
                    const highlightRange: vscode.Range = new vscode.Range(
                        entryLocations[i].start.line + lineDelta + lineOffset,
                        entryLocations[i].start.character + columnOffset,
                        entryLocations[i].start.line + lineDelta + (sortedEntryLocations[i].end.line - sortedEntryLocations[i].start.line) + lineOffset,
                        entryLocations[i].end.character
                    )
                    this.diags.push(new vscode.Diagnostic(
                        highlightRange,
                        `Duplicate entry "${entries[i].internalKey}".`,
                        vscode.DiagnosticSeverity.Warning
                    ))
                } else { // 'Comment Duplicates'
                    // Log duplicate entry since we aren't highlighting it
                    this.extension.logger.addLogMessage(
                        `BibTeX-format: Duplicate entry "${entries[i].internalKey}" at line ${entryLocations[i].start.line + lineDelta + 1 + lineOffset}.`)
                    text = text.replace(/@/,'')
                }
            }

            // Put text from entry[i] into (sorted)location[i]
            edits.push(new vscode.TextEdit(new vscode.Range(entryLocations[i].start.translate(range?.start.line, range?.start.character), entryLocations[i].end.translate(range?.start.line)), text))

            // We need to figure out the line changes in order to highlight properly
            lineDelta += (sortedEntryLocations[i].end.line - sortedEntryLocations[i].start.line) - (entryLocations[i].end.line - entryLocations[i].start.line)
        }
        this.extension.logger.addLogMessage('Formatted ' + document.fileName)
        return edits
    }
}

export class BibtexFormatterProvider implements vscode.DocumentFormattingEditProvider, vscode.DocumentRangeFormattingEditProvider {
    private readonly formatter: BibtexFormatter
    extension: Extension

    constructor(extension: Extension) {
        this.extension = extension
        this.formatter = new BibtexFormatter(extension)
    }

    public provideDocumentFormattingEdits(document: vscode.TextDocument, _options: vscode.FormattingOptions, _token: vscode.CancellationToken): vscode.ProviderResult<vscode.TextEdit[]> {
        const sort = vscode.workspace.getConfiguration('latex-workshop').get('bibtex-format.sort.enabled') as boolean
        this.extension.logger.addLogMessage('Start bibtex formatting on behalf of VSCode\'s formatter.')
        return this.formatter.formatDocument(document, sort, true)
    }

    public provideDocumentRangeFormattingEdits(document: vscode.TextDocument, range: vscode.Range, _options: vscode.FormattingOptions, _token: vscode.CancellationToken): vscode.ProviderResult<vscode.TextEdit[]> {
        const sort = vscode.workspace.getConfiguration('latex-workshop').get('bibtex-format.sort.enabled') as boolean
        this.extension.logger.addLogMessage('Start bibtex selection formatting on behalf of VSCode\'s formatter.')
        return this.formatter.formatDocument(document, sort, true, range)
    }

}
