import * as vscode from 'vscode'
import { bibtexParser } from 'latex-utensils'
import { lw } from '../../lw'
import { type TeXElement, TeXElementType } from '../../types'

import { bibTools } from '../../completion/completer/citation'

const logger = lw.log('Structure', 'BibTeX')

/**
* Convert a bibtexParser.FieldValue to a string
* @param field the bibtexParser.FieldValue to parse
*/
function fieldValueToString(field: bibtexParser.FieldValue, abbreviations: {[abbr: string]: string}): string {
    if (field.kind === 'concat') {
        return field.content.map(value => fieldValueToString(value, abbreviations)).reduce((acc, cur) => {return acc + ' # ' + cur})
    } else if (field.kind === 'abbreviation') {
        return abbreviations[field.content] ?? `undefined @string "${field.content}"`
    } else {
        return field.content
    }
}

export async function buildBibTeX(document: vscode.TextDocument): Promise<TeXElement[]> {
    const configuration = vscode.workspace.getConfiguration('latex-workshop', vscode.Uri.file(document.fileName))
    if (document.getText().length >= (configuration.get('bibtex.maxFileSize') as number) * 1024 * 1024) {
        logger.log(`Bib file is too large, ignoring it: ${document.fileName}`)
        return []
    }
    logger.log('Parse active BibTeX document for AST.')
    const ast = await lw.parser.parse.bib(document.getText())
    if (ast === undefined) {
        return []
    }
    logger.log(`Parsed ${ast.content.length} AST items.`)
    const abbreviations = bibTools.parseAbbrevations(ast)
    const ds: TeXElement[] = []
    ast.content.filter(bibtexParser.isEntry)
        .forEach(entry => {
            const bibitem: TeXElement = {
                type: TeXElementType.BibItem,
                name: entry.entryType,
                label: `${entry.entryType}: ${entry.internalKey}`,
                lineFr: entry.location.start.line - 1, // ast line numbers start at 1
                lineTo: entry.location.end.line - 1,
                filePath: document.fileName,
                children: []
            }
            entry.content.forEach(field => {
                const content = fieldValueToString(field.value, abbreviations)
                const fielditem: TeXElement = {
                    type: TeXElementType.BibField,
                    name: field.name,
                    label: `${field.name}: ${content}`,
                    lineFr: field.location.start.line - 1,
                    lineTo: field.location.end.line - 1,
                    filePath: document.fileName,
                    children: []
                }
                fielditem.parent = bibitem
                bibitem.children.push(fielditem)
            })
            ds.push(bibitem)
        })
    return ds
}
