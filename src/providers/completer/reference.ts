import * as fs from 'fs'
import * as path from 'path'
import * as vscode from 'vscode'
import { stripComments } from '../../utils'

import { Extension } from '../../main'

export interface ReferenceEntry {
    item: {
        reference: string;
        text: string;
        position: vscode.Position;
        atLastCompilation?: { refNumber: string; pageNumber: string };
    }
    text: string
    file: string
}

export class Reference {
    extension: Extension
    suggestions: vscode.CompletionItem[]
    referenceData: { [id: string]: ReferenceEntry } = {}
    refreshTimer: number

    constructor (extension: Extension) {
        this.extension = extension
    }

    reset () {
        this.suggestions = []
        this.referenceData = {}
        this.refreshTimer = 0
    }

    provide (args: {
        document: vscode.TextDocument;
        position: vscode.Position;
        token: vscode.CancellationToken;
        context: vscode.CompletionContext;
    }) : vscode.CompletionItem[] {
        if (Date.now() - this.refreshTimer < 1000) {
            return this.suggestions
        }
        this.refreshTimer = Date.now()
        const suggestions: { [key: string]: ReferenceEntry['item'] } = {}
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

    getReferencesTeX (filePath: string) {
        const references = this.getReferenceItems(fs.readFileSync(filePath, 'utf-8'))
        Object.keys(this.referenceData).forEach(key => {
            if (this.referenceData[key].file === filePath) {
                delete this.referenceData[key]
            }
        })
        Object.keys(references).forEach(key => {
            this.referenceData[key] = {
                item: references[key],
                text: references[key].text,
                file: filePath,
            }
        })
    }

    getReferenceItems (content: string) {
        const itemReg = /(?:\\label(?:\[[^\[\]\{\}]*\])?|(?:^|[,\s])label=){([^}]*)}/gm
        const items: { [key: string]: ReferenceEntry['item'] } = {}
        content = stripComments(content, '%')
        const noELContent = content
            .split('\n')
            .filter(para => para !== '')
            .join('\n')
        while (true) {
            const result = itemReg.exec(content)
            if (result === null) {
                break
            }
            if (!(result[1] in items)) {
                const prevContent = noELContent.substring(
                    0,
                    noELContent.substring(0, result.index).lastIndexOf('\n') - 1,
                )
                const followLength = noELContent
                    .substring(result.index, noELContent.length)
                    .split('\n', 4)
                    .join('\n').length
                const positionContent = content.substring(0, result.index).split('\n')
                items[result[1]] = {
                    reference: result[1],
                    text: `${noELContent.substring(
                        prevContent.lastIndexOf('\n') + 1,
                        result.index + followLength,
                    )}\n...`,
                    position: new vscode.Position(
                        positionContent.length - 1,
                        positionContent[positionContent.length - 1].length,
                    ),
                }
            }
        }

        return items
    }

    setNumbersFromAuxFile (rootFile: string) {
        const outDir = this.extension.manager.getOutputDir(rootFile)
        const rootDir = path.dirname(rootFile)
        const auxFile = path.resolve(rootDir, path.join(outDir, path.basename(rootFile, '.tex') + '.aux'))
        const refKeys = Object.keys(this.referenceData)
        for (const key of refKeys) {
            const refData = this.referenceData[key]
            refData.item.atLastCompilation = undefined
        }
        if (!fs.existsSync(auxFile)) {
            return
        }
        const newLabelReg = /^\\newlabel\{(.*?)\}\{\{(.*?)\}\{(.*?)\}/gm
        const auxContent = fs.readFileSync(auxFile, { encoding: 'utf8' })
        while (true) {
            const result = newLabelReg.exec(auxContent)
            if (result === null) {
                break
            }
            if (result[1] in this.referenceData) {
                const refData = this.referenceData[result[1]]
                refData.item.atLastCompilation = { refNumber: result[2], pageNumber: result[3] }
            }
        }
    }
}
