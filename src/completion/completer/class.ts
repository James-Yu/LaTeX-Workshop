import * as vscode from 'vscode'
import * as fs from 'fs'
import { lw } from '../../lw'
import type { CompletionProvider } from '../../types'

export const provider: CompletionProvider = { from }

const data = {
    suggestions: [] as vscode.CompletionItem[]
}

type ClassItemEntry = {
    command: string,
    detail: string,
    documentation: string
}

function initialize(classes: {[key: string]: ClassItemEntry}) {
    Object.values(classes).forEach(item => {
        const cl = new vscode.CompletionItem(item.command, vscode.CompletionItemKind.Module)
        cl.detail = item.detail
        cl.documentation = new vscode.MarkdownString(`[${item.documentation}](${item.documentation})`)
        data.suggestions.push(cl)
    })
}

function from(): vscode.CompletionItem[] {
    if (data.suggestions.length === 0) {
        const allClasses: {[key: string]: ClassItemEntry} = JSON.parse(fs.readFileSync(`${lw.extensionRoot}/data/classnames.json`).toString()) as typeof import('../../../data/classnames.json')
        initialize(allClasses)
    }
    return data.suggestions
}
