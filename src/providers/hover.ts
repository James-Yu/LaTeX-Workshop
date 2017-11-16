import * as vscode from 'vscode'

import { Extension } from '../main'
import { tokenizer } from './tokenizer'

export class HoverProvider implements vscode.HoverProvider {
    extension: Extension

    constructor(extension: Extension) {
        this.extension = extension
    }

    public provideHover(document: vscode.TextDocument, position: vscode.Position, _token: vscode.CancellationToken) :
        Thenable<vscode.Hover> {
        return new Promise((resolve, _reject) => {
            const token = tokenizer(document, position)
            if (token === undefined) {
                resolve()
                return
            }
            if (token in this.extension.completer.reference.referenceData) {
                resolve(new vscode.Hover({language: 'latex',
                    value: this.extension.completer.reference.referenceData[token].text
                }))
                return
            }
            if (token in this.extension.completer.citation.citationData) {
                resolve(new vscode.Hover(
                    this.extension.completer.citation.citationData[token].text
                ))
                return
            }
            resolve()
        })
    }
}
