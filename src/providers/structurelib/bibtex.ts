import * as vscode from 'vscode'
import { bibtexParser } from 'latex-utensils'
import { Section, SectionKind } from './section'
import { parser } from '../../components/parser'

import { getLogger } from '../../components/logger'

const logger = getLogger('Structure', 'BibTeX')

export async function buildBibTeX(document: vscode.TextDocument): Promise<Section[]> {
    const configuration = vscode.workspace.getConfiguration('latex-workshop', vscode.Uri.file(document.fileName))
    if (document.getText().length >= (configuration.get('bibtex.maxFileSize') as number) * 1024 * 1024) {
        logger.log(`Bib file is too large, ignoring it: ${document.fileName}`)
        return []
    }
    logger.log('Parse active BibTeX document for AST.')
    const ast = await parser.parseBibtex(document.getText())
    if (ast === undefined) {
        return []
    }
    logger.log(`Parsed ${ast.content.length} AST items.`)
    const ds: Section[] = []
    ast.content.filter(bibtexParser.isEntry)
        .forEach(entry => {
            const bibitem = new Section(
                SectionKind.BibItem,
                `${entry.entryType}: ${entry.internalKey}`,
                vscode.TreeItemCollapsibleState.Collapsed,
                0,
                entry.location.start.line - 1, // ast line numbers start at 1
                entry.location.end.line - 1,
                document.fileName)
            entry.content.forEach(field => {
                const content = parser.fieldValueToString(field.value)
                const fielditem = new Section(
                    SectionKind.BibField,
                    `${field.name}: ${content}`,
                    vscode.TreeItemCollapsibleState.None,
                    1,
                    field.location.start.line -1,
                    field.location.end.line- 1,
                    document.fileName)
                fielditem.parent = bibitem
                bibitem.children.push(fielditem)
            })
            ds.push(bibitem)
        })
    return ds
}
