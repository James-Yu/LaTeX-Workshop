import * as vscode from 'vscode'
import { bibtexParser } from 'latex-utensils'
import { performance } from 'perf_hooks'
import { lw } from '../lw'
import { bibtexFormat, bibtexSort, getBibtexFormatConfig } from './bibtex-formatter/utils'
import type { BibtexEntry } from './bibtex-formatter/utils'

const logger = lw.log('Format', 'Bib')

export {
    format,
    formattingProvider as formatter
}

const duplicatesDiagnostics: vscode.DiagnosticCollection = vscode.languages.createDiagnosticCollection('BibTeX')
const diags: vscode.Diagnostic[] = []

async function format(sort: boolean, align: boolean) {
    if (!vscode.window.activeTextEditor) {
        logger.log('Exit formatting. The active textEditor is undefined.')
        return
    }
    if (vscode.window.activeTextEditor.document.languageId !== 'bibtex') {
        logger.log('Exit formatting. The active textEditor is not of bibtex type.')
        return
    }
    const doc = vscode.window.activeTextEditor.document
    const t0 = performance.now() // Measure performance
    duplicatesDiagnostics.clear()
    logger.log('Start bibtex formatting on user request.')
    const edits = await formatDocument(doc, sort, align)
    if (edits.length === 0) {
        return
    }
    const edit = new vscode.WorkspaceEdit()
    edits.forEach(e => {
        edit.replace(doc.uri, e.range, e.newText)
    })

    void vscode.workspace.applyEdit(edit).then(success => {
        if (success) {
            duplicatesDiagnostics.set(doc.uri, diags)
            const t1 = performance.now()
            logger.log(`BibTeX action successful. Took ${t1 - t0} ms.`)
        } else {
            void logger.showErrorMessage('Something went wrong while processing the bibliography.')
        }
    })

}

async function formatDocument(document: vscode.TextDocument, sort: boolean, align: boolean, range?: vscode.Range): Promise<vscode.TextEdit[]> {
    // Get configuration
    const formatConfig = getBibtexFormatConfig(document.uri)
    const config = vscode.workspace.getConfiguration('latex-workshop', document)
    const handleDuplicates = config.get('bibtex-format.handleDuplicates') as 'Ignore Duplicates' | 'Highlight Duplicates' | 'Comment Duplicates'
    const lineOffset = range ? range.start.line : 0
    const columnOffset = range ? range.start.character : 0

    logger.log('Parse active BibTeX document for AST.')
    const ast = await lw.parser.parse.bib(document.getText(range))
    if (ast === undefined) {
        return []
    }
    logger.log(`Parsed ${ast.content.length} AST items.`)
    // Create an array of entries and of their starting locations
    const entries: BibtexEntry[] = []
    const entryLocations: vscode.Range[] = []
    ast.content.forEach(item => {
        if (bibtexParser.isEntry(item) || bibtexParser.isStringEntry(item)) {
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
        entries.sort(bibtexSort(duplicates, formatConfig)).forEach(entry => {
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
    duplicatesDiagnostics.clear()
    const edits: vscode.TextEdit[] = []
    diags.length = 0
    let lineDelta = 0
    let text: string
    let isDuplicate: boolean
    for (let i = 0; i < entries.length; i++) {
        if (align && bibtexParser.isEntry(entries[i])) {
            const entry: bibtexParser.Entry = entries[i] as bibtexParser.Entry
            text = bibtexFormat(entry, formatConfig)
        } else {
            text = document.getText(sortedEntryLocations[i])
        }

        if (bibtexParser.isEntry(entries[i])) {
            const entry = entries[i] as bibtexParser.Entry
            isDuplicate = duplicates.has(entry)
            if (isDuplicate && handleDuplicates !== 'Ignore Duplicates') {
                if (handleDuplicates === 'Highlight Duplicates') {
                    const highlightRange: vscode.Range = new vscode.Range(
                        entryLocations[i].start.line + lineDelta + lineOffset,
                        entryLocations[i].start.character + columnOffset,
                        entryLocations[i].start.line + lineDelta + (sortedEntryLocations[i].end.line - sortedEntryLocations[i].start.line) + lineOffset,
                        entryLocations[i].end.character
                    )
                    diags.push(new vscode.Diagnostic(
                        highlightRange,
                        `Duplicate entry "${entry.internalKey}".`,
                        vscode.DiagnosticSeverity.Warning
                    ))
                } else { // 'Comment Duplicates'
                    // Log duplicate entry since we aren't highlighting it
                    logger.log(
                        `BibTeX-format: Duplicate entry "${entry.internalKey}" at line ${entryLocations[i].start.line + lineDelta + 1 + lineOffset}.`)
                    text = text.replace(/@/,'')
                }
            }
        }

        // Put text from entry[i] into (sorted)location[i]
        edits.push(new vscode.TextEdit(new vscode.Range(entryLocations[i].start.translate(range?.start.line, range?.start.character), entryLocations[i].end.translate(range?.start.line)), text))

        // We need to figure out the line changes in order to highlight properly
        lineDelta += (sortedEntryLocations[i].end.line - sortedEntryLocations[i].start.line) - (entryLocations[i].end.line - entryLocations[i].start.line)
    }
    logger.log('Formatted ' + document.fileName)
    return edits
}

class FormattingProvider implements vscode.DocumentFormattingEditProvider, vscode.DocumentRangeFormattingEditProvider {
    public provideDocumentFormattingEdits(document: vscode.TextDocument, _options: vscode.FormattingOptions, _token: vscode.CancellationToken): vscode.ProviderResult<vscode.TextEdit[]> {
        const sort = vscode.workspace.getConfiguration('latex-workshop', document).get('bibtex-format.sort.enabled') as boolean
        logger.log('Start bibtex formatting on behalf of VSCode\'s formatter.')
        return formatDocument(document, sort, true)
    }

    public provideDocumentRangeFormattingEdits(document: vscode.TextDocument, range: vscode.Range, _options: vscode.FormattingOptions, _token: vscode.CancellationToken): vscode.ProviderResult<vscode.TextEdit[]> {
        const sort = vscode.workspace.getConfiguration('latex-workshop', document).get('bibtex-format.sort.enabled') as boolean
        logger.log('Start bibtex selection formatting on behalf of VSCode\'s formatter.')
        return formatDocument(document, sort, true, range)
    }
}

const formattingProvider = new FormattingProvider()
