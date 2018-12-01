import * as vscode from 'vscode'
import * as fs from 'fs'

import {Extension} from '../../main'

export class Reference {
    extension: Extension
    suggestions: vscode.CompletionItem[]
    referenceData: {[id: string]: {item: {[id: string]: any}, text: string, file: string}} = {}
    refreshTimer: number

    constructor(extension: Extension) {
        this.extension = extension
    }

    provide(args: {document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext}) : vscode.CompletionItem[] {
        if (Date.now() - this.refreshTimer < 1000) {
            return this.suggestions
        }
        this.refreshTimer = Date.now()
        const suggestions = {}
        Object.keys(this.referenceData).forEach(key => {
            suggestions[key] = this.referenceData[key].item
        })
        if (vscode.window.activeTextEditor) {
            const items = this.getReferenceItems(vscode.window.activeTextEditor.document.getText())
            Object.keys(items).map(key => {
                if (!(key in suggestions)) {
                    suggestions[key] = items[key]
                }
            })
        }
        this.suggestions = []
        Object.keys(suggestions).map(key => {
            const item = suggestions[key]
            const command = new vscode.CompletionItem(item.reference, vscode.CompletionItemKind.Reference)
            command.documentation = item.text
            command.range = args.document.getWordRangeAtPosition(args.position, /[-a-zA-Z0-9_:\.]+/)
            this.suggestions.push(command)
        })
        return this.suggestions
    }

    getReferencesTeX(filePath: string) {
        const references = this.getReferenceItems(fs.readFileSync(filePath, 'utf-8'))
        Object.keys(this.referenceData).forEach((key) => {
            if (this.referenceData[key].file === filePath) {
                delete this.referenceData[key]
            }
        })
        Object.keys(references).forEach((key) => {
            this.referenceData[key] = {
                item: references[key],
                text: references[key].text,
                file: filePath
            }
        })
    }

    getReferenceItems(content: string) {
        const itemReg = /^(?:(?!%).*\\label(?:\[[^\[\]\{\}]*\])?|label=){([^}]*)}/gm
        const items = {}
        const noELContent = content.split('\n').filter(para => para !== '').join('\n')
        while (true) {
            const result = itemReg.exec(content)
            if (result === null) {
                break
            }
            if (!(result[1] in items)) {
                const prevContent = noELContent.substring(0, noELContent.substring(0, result.index).lastIndexOf('\n') - 1)
                const followLength = noELContent.substring(result.index, noELContent.length).split('\n', 4).join('\n').length
                const positionContent = content.substring(0, result.index).split('\n')
                items[result[1]] = {
                    reference: result[1],
                    text: `${noELContent.substring(prevContent.lastIndexOf('\n') + 1, result.index + followLength)}\n...`,
                    position: new vscode.Position(positionContent.length - 1, positionContent[positionContent.length - 1].length)
                }
            }
        }
        return items
    }
}
