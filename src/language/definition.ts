import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import { lw } from '../lw'
import { tokenizer } from '../utils/tokenizer'
import * as utils from '../utils/utils'
import { sanitizeInputFilePath } from '../utils/inputfilepath'

export class DefinitionProvider implements vscode.DefinitionProvider {
    private async onAFilename(document: vscode.TextDocument, position: vscode.Position, token: string): Promise<string | undefined> {
        const line = document.lineAt(position.line).text
        const escapedToken = utils.escapeRegExp(token)
        const regexInput = new RegExp(`\\\\(?:include|input|subfile)\\{${escapedToken}\\}`)
        const regexImport = new RegExp(`\\\\(?:sub)?(?:import|includefrom|inputfrom)\\*?\\{([^\\}]*)\\}\\{${escapedToken}\\}`)
        const regexDocumentclass = new RegExp(`\\\\(?:documentclass)(?:\\[[^[]]*\\])?\\{${escapedToken}\\}`)

        if (! vscode.window.activeTextEditor) {
            return
        }

        if (line.match(regexDocumentclass)) {
            return utils.resolveFile([path.dirname(vscode.window.activeTextEditor.document.fileName)], sanitizeInputFilePath(token), '.cls')
        }

        let dirs: string[] = []
        if (line.match(regexInput)) {
            dirs = [path.dirname(vscode.window.activeTextEditor.document.fileName)]
            if (lw.root.dir.path !== undefined) {
                dirs.push(lw.root.dir.path)
            }
        }

        const result = line.match(regexImport)
        if (result) {
            dirs = [path.resolve(path.dirname(vscode.window.activeTextEditor.document.fileName), sanitizeInputFilePath(result[1]))]
        }

        if (dirs.length > 0) {
            return utils.resolveFile(dirs, sanitizeInputFilePath(token), '.tex')
        }
        return
    }

    /**
     * VSCode hook to provide definitions of the symbol at `position`.
     * In LW these can be custom commands, labels, citations, glossary entries, and file names.
     *
     * Also provides the exact range of the found symbol (`originSelectionRange`),
     * as different symbol types support different characters in LaTeX (esp. regarding `[:-]`)
     *
     * @param document The document to be scanned.
     * @param position The position to be scanned at.
     *
     * @returns {DefinitionLink[]} linking `originSelectionRange` to `targetUri`/`targetRange`
     */
    async provideDefinition(document: vscode.TextDocument, position: vscode.Position): Promise<vscode.DefinitionLink[]> {
        if (document.uri.scheme !== 'file') {
            return []
        }
        const tokenRange = tokenizer(document, position)
        if (tokenRange === undefined) {
            return []
        }
        const token = document.getText(tokenRange)

        if (token.startsWith('\\')) {
            const macro = lw.completion.macro.getData().definedCmds.get(token.slice(1))
            if (macro) {
                return [{
                    targetUri: macro.location.uri,
                    targetRange: macro.location.range,
                    originSelectionRange: tokenRange
                }]
            }
            return []
        }
        const ref = lw.completion.reference.getItem(token)
        if (ref) {
            return [{
                targetUri: vscode.Uri.file(ref.file),
                targetRange: new vscode.Range(ref.position, ref.position),
                originSelectionRange: tokenRange
            }]
        }
        const cite = lw.completion.citation.getItem(token)
        if (cite) {
            return [{
                targetUri: vscode.Uri.file(cite.file),
                targetRange: new vscode.Range(cite.position, cite.position),
                originSelectionRange: tokenRange
            }]
        }
        const glossary = lw.completion.glossary.getItem(token)
        if (glossary) {
            return [{
                targetUri: vscode.Uri.file(glossary.filePath),
                targetRange: new vscode.Range(glossary.position, glossary.position),
                originSelectionRange: tokenRange
            }]
        }
        if (vscode.window.activeTextEditor && token.includes('.')) {
            // We skip graphics files
            const graphicsExtensions = ['.pdf', '.eps', '.jpg', '.jpeg', '.JPG', '.JPEG', '.gif', '.png']
            const ext = path.extname(token)
            if (graphicsExtensions.includes(ext)) {
                return []
            }
            const absolutePath = path.resolve(path.dirname(vscode.window.activeTextEditor.document.fileName), token)
            if (fs.existsSync(absolutePath)) {
                return [{
                    targetUri: vscode.Uri.file(absolutePath),
                    targetRange: new vscode.Range(0, 0, 0, 0),
                    originSelectionRange: tokenRange
                }]
            }
        }

        const filename = await this.onAFilename(document, position, token)
        if (filename) {
            return [{
                targetUri: vscode.Uri.file(filename),
                targetRange: new vscode.Range(0, 0, 0, 0),
                originSelectionRange: tokenRange
            }]
        }
        return []
    }

}
