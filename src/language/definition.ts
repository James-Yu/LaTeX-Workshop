import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import { lw } from '../lw'
import { tokenizer } from '../utils/tokenizer'
import * as utils from '../utils/utils'

export class DefinitionProvider implements vscode.DefinitionProvider {
    private onAFilename(document: vscode.TextDocument, position: vscode.Position, token: string): string|undefined {
        const line = document.lineAt(position.line).text
        const escapedToken = utils.escapeRegExp(token)
        const regexInput = new RegExp(`\\\\(?:include|input|subfile)\\{${escapedToken}\\}`)
        const regexImport = new RegExp(`\\\\(?:sub)?(?:import|includefrom|inputfrom)\\*?\\{([^\\}]*)\\}\\{${escapedToken}\\}`)
        const regexDocumentclass = new RegExp(`\\\\(?:documentclass)(?:\\[[^[]]*\\])?\\{${escapedToken}\\}`)

        if (! vscode.window.activeTextEditor) {
            return
        }

        if (line.match(regexDocumentclass)) {
            return utils.resolveFile([path.dirname(vscode.window.activeTextEditor.document.fileName)], token, '.cls')
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
            dirs = [path.resolve(path.dirname(vscode.window.activeTextEditor.document.fileName), result[1])]
        }

        if (dirs.length > 0) {
            return utils.resolveFile(dirs, token, '.tex')
        }
        return
    }

    provideDefinition(document: vscode.TextDocument, position: vscode.Position): vscode.Location | undefined {
        if (document.uri.scheme !== 'file') {
            return
        }
        const token = tokenizer(document, position)
        if (token === undefined) {
            return
        }

        if (token.startsWith('\\')) {
            const macro = lw.completion.macro.getData().definedCmds.get(token.slice(1))
            if (macro) {
                return macro.location
            }
            return
        }
        const ref = lw.completion.reference.getItem(token)
        if (ref) {
            return new vscode.Location(vscode.Uri.file(ref.file), ref.position)
        }
        const cite = lw.completion.citation.getItem(token)
        if (cite) {
            return new vscode.Location(vscode.Uri.file(cite.file), cite.position)
        }
        const glossary = lw.completion.glossary.getItem(token)
        if (glossary) {
            return new vscode.Location(vscode.Uri.file(glossary.filePath), glossary.position)
        }
        if (vscode.window.activeTextEditor && token.includes('.')) {
            // We skip graphics files
            const graphicsExtensions = ['.pdf', '.eps', '.jpg', '.jpeg', '.JPG', '.JPEG', '.gif', '.png']
            const ext = path.extname(token)
            if (graphicsExtensions.includes(ext)) {
                return
            }
            const absolutePath = path.resolve(path.dirname(vscode.window.activeTextEditor.document.fileName), token)
            if (fs.existsSync(absolutePath)) {
                return new vscode.Location( vscode.Uri.file(absolutePath), new vscode.Position(0, 0) )
            }
        }

        const filename = this.onAFilename(document, position, token)
        if (filename) {
            return new vscode.Location( vscode.Uri.file(filename), new vscode.Position(0, 0) )
        }
        return
    }

}
