import * as vscode from 'vscode'
import * as fs from 'fs'
import { lw } from '../../lw'
import type { CompletionProvider } from '../../types'

type DataClassnamesJsonType = typeof import('../../../data/classnames.json')

type ClassItemEntry = {
    command: string,
    detail: string,
    documentation: string
}

export class DocumentClass implements CompletionProvider {
    private readonly suggestions: vscode.CompletionItem[] = []

    initialize(classes: {[key: string]: ClassItemEntry}) {
        Object.values(classes).forEach(item => {
            const cl = new vscode.CompletionItem(item.command, vscode.CompletionItemKind.Module)
            cl.detail = item.detail
            cl.documentation = new vscode.MarkdownString(`[${item.documentation}](${item.documentation})`)
            this.suggestions.push(cl)
        })
    }

    from() {
        return this.provide()
    }

    private provide(): vscode.CompletionItem[] {
        if (this.suggestions.length === 0) {
            const allClasses: {[key: string]: ClassItemEntry} = JSON.parse(fs.readFileSync(`${lw.extensionRoot}/data/classnames.json`).toString()) as DataClassnamesJsonType
            this.initialize(allClasses)
        }
        return this.suggestions
    }
}
