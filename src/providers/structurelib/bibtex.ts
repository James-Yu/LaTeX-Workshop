import * as vscode from 'vscode'
import { bibtexParser } from 'latex-utensils'
import { Section, SectionKind } from './section'
import { UtensilsParser } from '../../components/parser/syntax'

import { getLogger } from '../../components/logger'

const logger = getLogger('Structure', 'LaTeX')

export class BibTeXStructure {
    static async buildBibTeXModel(document: vscode.TextDocument): Promise<Section[]> {
        const configuration = vscode.workspace.getConfiguration('latex-workshop', vscode.Uri.file(document.fileName))
        if (document.getText().length >= (configuration.get('bibtex.maxFileSize') as number) * 1024 * 1024) {
            logger.log(`Bib file is too large, ignoring it: ${document.fileName}`)
            return []
        }
        const ast = await UtensilsParser.parseBibtex(document.getText()).catch((e) => {
            if (bibtexParser.isSyntaxError(e)) {
                const line = e.location.start.line
                logger.log(`Error parsing BibTeX: line ${line} in ${document.fileName} .`)
            }
            return
        })

        const ds: Section[] = []
        ast?.content.filter(bibtexParser.isEntry)
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
                    const fielditem = new Section(
                        SectionKind.BibField,
                        `${field.name}: ${field.value.content}`,
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
}
