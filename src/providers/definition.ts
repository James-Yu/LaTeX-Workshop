import * as vscode from 'vscode'

import { Extension } from '../main'
import { tokenizer } from './tokenizer'

export class DefinitionProvider implements vscode.DefinitionProvider {
    extension: Extension

    constructor(extension: Extension) {
        this.extension = extension
    }

    public provideDefinition(document: vscode.TextDocument, position: vscode.Position, _token: vscode.CancellationToken) :
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
            if (token in this.extension.completer.command.newcommandData) {
                const command = this.extension.completer.command.newcommandData[token]
                resolve(new vscode.Location(
                    vscode.Uri.file(command.file), command.position
                ))
                return
            }
            resolve()
        })
    }
}
