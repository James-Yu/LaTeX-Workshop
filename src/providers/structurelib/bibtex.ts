import * as vscode from 'vscode'
import { bibtexParser } from 'latex-utensils'
import { TeXElement, TeXElementType } from '../structure'
import { parser } from '../../components/parser'

import { getLogger } from '../../components/logger'

const logger = getLogger('Structure', 'BibTeX')

/**
* Convert a bibtexParser.FieldValue to a string
* @param field the bibtexParser.FieldValue to parse
*/
function fieldValueToString(field: bibtexParser.FieldValue): string {
   if (field.kind === 'concat') {
       return field.content.map(value => fieldValueToString(value)).reduce((acc, cur) => {return acc + ' # ' + cur})
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
    const ast = await parser.parseBibTeX(document.getText())
    if (ast === undefined) {
        return []
    }
    logger.log(`Parsed ${ast.content.length} AST items.`)
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
                const content = fieldValueToString(field.value)
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
