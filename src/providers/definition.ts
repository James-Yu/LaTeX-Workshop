import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'

import {Extension} from '../main'
import {tokenizer} from './tokenizer'
import * as utils from '../utils'

export class DefinitionProvider implements vscode.DefinitionProvider {
    extension: Extension

    constructor(extension: Extension) {
        this.extension = extension
    }

    private onAFilename(document: vscode.TextDocument, position: vscode.Position, token: string): string|null {
        const line = document.lineAt(position.line).text
        const escapedToken = utils.escapeRegExp(token)
        const regexInput = new RegExp(`\\\\(?:include|input|subfile)\\{${escapedToken}\\}`)
        const regexImport = new RegExp(`\\\\(?:sub)?(?:import|includefrom|inputfrom)\\*?\\{([^\\}]*)\\}\\{${escapedToken}\\}`)

        if (! vscode.window.activeTextEditor) {
            return null
        }

        let dirs: string[] = []
        if (line.match(regexInput)) {
            dirs = [path.dirname(vscode.window.activeTextEditor.document.fileName), this.extension.manager.rootDir]
        }

        const result = line.match(regexImport)
        if (result) {
            dirs = [path.resolve(path.dirname(vscode.window.activeTextEditor.document.fileName), result[1])]
        }

        if (dirs.length > 0) {
            return utils.resolveFile(dirs, token, '.tex')
        }
        return null
    }


    public provideDefinition(document: vscode.TextDocument, position: vscode.Position, _token: vscode.CancellationToken):
        Thenable<vscode.Location> {
        return new Promise((resolve, _reject) => {
            const token = tokenizer(document, position)
            if (token === undefined) {
                resolve()
                return
            }
            if (token in this.extension.completer.reference.referenceData) {
                const ref = this.extension.completer.reference.referenceData[token]
                resolve(new vscode.Location(
                    vscode.Uri.file(ref.file), ref.item.position
                ))
                return
            }
            if (token in this.extension.completer.citation.citationData) {
                const cite = this.extension.completer.citation.citationData[token]
                resolve(new vscode.Location(
                    vscode.Uri.file(cite.file), cite.position
                ))
                return
            }
            if (token in this.extension.completer.citation.theBibliographyData) {
                const cite = this.extension.completer.citation.theBibliographyData[token]
                resolve(new vscode.Location(
                    vscode.Uri.file(cite.file), cite.item.position
                ))
                return
            }
            if (token in this.extension.completer.command.newcommandData) {
                const command = this.extension.completer.command.newcommandData[token]
                resolve(new vscode.Location(
                    vscode.Uri.file(command.file), command.position
                ))
                return
            }
            if (vscode.window.activeTextEditor && token.indexOf('.') > -1) {
                // We skip graphics files
                const graphicsExtensions = ['.pdf', '.eps', '.jpg', '.jpeg', '.JPG', '.JPEG', '.gif', '.png']
                const ext = path.extname(token)
                if (graphicsExtensions.indexOf(ext) > -1) {
                    resolve()
                }
                const absolutePath = path.resolve(path.dirname(vscode.window.activeTextEditor.document.fileName), token)
                if (fs.existsSync(absolutePath)) {
                    resolve(new vscode.Location(
                        vscode.Uri.file(absolutePath), new vscode.Position(0, 0)
                    ))
                    return
                }
            }

            const filename = this.onAFilename(document, position, token)
            if (filename) {
                resolve(new vscode.Location(
                        vscode.Uri.file(filename), new vscode.Position(0, 0)
                    ))
            }
            resolve()
        })
    }
}
